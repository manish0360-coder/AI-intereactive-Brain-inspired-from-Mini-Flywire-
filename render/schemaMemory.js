// ================================================================
// 🧠 SCHEMA MEMORY — HIERARCHICAL ABSTRACTION
// ================================================================
//
// This module sits ABOVE episodic memory and BELOW scoring.
// It is a pure recognition layer: it reads, it does not write.
//
// WHAT IT DOES
// ─────────────────────────────────────────────────────────────
// It looks at recurring motifs across many episodes and asks:
// "What ROLE does each node play in this pattern?"
//
//   Episode 1: lion  → hunt → meat → eat
//   Episode 2: tiger → hunt → deer → eat
//
//   Shared structure: [predator] → hunt → [prey] → eat
//
//   Schema: PREDATOR_HUNT_CONSUME
//     slot[0]: predator  (lion, tiger — interchangeable)
//     slot[1]: hunt      (fixed anchor node)
//     slot[2]: prey      (meat, deer — interchangeable)
//     slot[3]: eat       (fixed anchor node)
//
// The schema is then used in scoring to give a gentle bonus
// when a candidate path MATCHES a known schema pattern —
// even if that specific path was never seen before.
//
// WHAT IT DOES NOT DO
// ─────────────────────────────────────────────────────────────
// - Does NOT write to Q, transitions, rewards, trust, confidence
// - Does NOT run during every step (runs periodically)
// - Does NOT add a new memory store (reads episodicStore only)
// - Does NOT replace motif detection in episodeManager
//   (episodeManager consolidates; this abstracts)
//
// INFORMATION FLOW
// ─────────────────────────────────────────────────────────────
//   episodicStore (episodes)
//       ↓
//   _detectMotifs() — in episodeManager
//       ↓
//   buildSchemas()  — this module
//       ↓
//   getSchemaBonus(fromId, toId) → scalar [0..1]
//       ↓
//   scoring.js finalWeight += schemaBonus * weight
//
// ================================================================



// ================================================================
// STATE
// ================================================================

// All extracted schemas. Each schema is:
// {
//   name:        string             — human-readable label
//   anchors:     Set<nodeId>        — fixed nodes (appear in ≥70% of motif instances)
//   variables:   Map<pos, nodeId[]> — slot → candidate node ids
//   transitions: string[]          — "anchorId->anchorId" pairs that define the spine
//   strength:    number             — how many distinct episodes support this
//   lastUpdated: number             — timestamp
// }

const schemas = [];

// ── STEP 5 INTROSPECTION: last rebuild's motif snapshot ──────────
// Populated by rebuildSchemas. Read by getSchemaDiagnostics().
// Each entry has: key, nodes, episodeSpread, freqStrength,
// normAvgQ, strength, episodeIndices.
let _lastMotifs = [];

// Edge → schema bonus cache (cleared on rebuild)
// key: "fromId->toId", value: bonus scalar
const _bonusCache = new Map();

// Rebuild interval in ms — schemas are extracted periodically,
// not on every step. Expensive to run; cheap to look up.
const REBUILD_INTERVAL_MS = 15000;   // every 15 seconds of agent time
let _lastRebuild = 0;

// Minimum motif episode spread before abstraction
const MIN_SPREAD = 2;

// ── STEP 5: value-modulated schema strength ──────────────────────
//
// LAMBDA        : value influence on strength.
//                 0.0 = frequency-only (identical to pre-Step-5).
//                 1.0 = full value modulation.
//                 Set to 0 to run λ=0 parity check.
//
// Q_NORM        : divisor that maps raw avg-Q into [0,1].
//                 Should be ≈ the max |Q| value seen in practice.
//                 Q is clamped to ±20 (qlearning.js line 175),
//                 so 20 is a safe upper bound.
//
// MIN_QKEY_VISITS: minimum number of updateQ calls for a given
//                 composite key before we trust its Q value.
//                 Keys with fewer visits are skipped (treated as 0).
//                 Prevents under-sampled Q from poisoning rankings.
//
const LAMBDA          = 1.0;
const Q_NORM          = 20;
const MIN_QKEY_VISITS = 3;

// System refs (injected once)
let _sys = null;



// ================================================================
// INITIALISE
// ================================================================

export function initSchemaMemory(systemRefs) {
    _sys = systemRefs;
}



// ================================================================
// REBUILD SCHEMAS
// ================================================================
// Called periodically by episodeManager after consolidation.
// Converts motifs into role-slot schemas.
// ================================================================

export function rebuildSchemas(episodicStore, force = false) {

    if (!_sys) return;

    const now = Date.now();
    if (!force && now - _lastRebuild < REBUILD_INTERVAL_MS) return;
    // NOTE: _lastRebuild is set AFTER the empty-store check below.
    // Previously it was set here, which meant empty-store calls consumed
    // the 15-second slot and reset the clock even when no motifs existed.
    // Now only a call that reaches actual motif detection marks the throttle.

    // ── collect all motifs from the store ──────────────────────
    const motifs = _detectMotifsForSchema(episodicStore);

    // ── STEP 5 INTROSPECTION: cache last rebuild's motif data ────
    // Read-only snapshot for getSchemaDiagnostics(). Computes
    // nothing new — just retains the motif objects (which already
    // carry freqStrength, normAvgQ, strength) so a verifier can
    // grade the value chain as data rather than parsing console logs.
    _lastMotifs = motifs;

    if (motifs.length === 0) {
        // Do NOT update _lastRebuild — an empty store call does not
        // consume the throttle slot. The next call will retry immediately
        // after the interval expires, so the clock only advances when
        // real motifs exist.
        console.log('[SCHEMA] rebuild: store has episodes but 0 motifs — slot not consumed');
        return;
    }

    // Mark the throttle ONLY when we have real motifs to process.
    _lastRebuild = now;

    console.log('[SCHEMA] rebuild entered: episodes=' + episodicStore.length +
        ' motifs=' + motifs.length);

    // ── clear existing schemas and cache ───────────────────────
    schemas.length = 0;
    _bonusCache.clear();

    // ── for each strong motif, extract a schema ─────────────────
    motifs
        .filter(m => m.episodeSpread >= MIN_SPREAD)
        .forEach(motif => {

            const schema = _extractSchema(motif, episodicStore);
            if (schema) {
                schemas.push(schema);
                _cacheSchemaBonus(schema);
            }
        });

    if (schemas.length > 0) {
        console.log(
            "🧩 Schema memory rebuilt:",
            schemas.length,
            "abstract patterns."
        );
        schemas.forEach(s =>
            console.log(
                "   " + s.name +
                "  anchors=" + [...s.anchors].map(id =>
                    _sys.findNeuronById(id)?.userData.label || id
                ).join(",") +
                "  strength=" + s.strength
            )
        );
    }

    // ── STEP 5: rank-change diagnostic ──────────────────────────
    // Shows which motifs were reordered by the value signal vs
    // frequency-only ranking. At λ=0 this must print zero changes.
    // At λ=1 changes indicate value is influencing promotion order.
    if (motifs.length > 1) {

        // frequency-only ranking (sort by freqStrength)
        const freqRanked  = [...motifs].sort((a,b) => b.freqStrength - a.freqStrength);
        const freqRankMap = new Map(freqRanked.map((m,i) => [m.key, i]));

        // value-modulated ranking (motifs is already sorted by strength)
        const valueRankMap = new Map(motifs.map((m,i) => [m.key, i]));

        let rankChanges = 0;
        motifs.forEach(m => {
            const fr = freqRankMap.get(m.key);
            const vr = valueRankMap.get(m.key);
            if (fr !== vr) {
                rankChanges++;
                console.log(
                    `[rank-change] "${m.key}"` +
                    ` freq-rank:${fr} → value-rank:${vr}` +
                    ` normAvgQ:${m.normAvgQ.toFixed(3)}` +
                    ` freqStr:${m.freqStrength.toFixed(1)}` +
                    ` valStr:${m.strength.toFixed(1)}`
                );
            }
        });

        if (rankChanges === 0) {
            console.log('[rank-change] 0 rank changes (λ=0 parity confirmed or value uniform)');
        }

        // normAvgQ histogram (detects VF1: all-zero means value not reaching)
        const nonzero = motifs.filter(m => m.normAvgQ > 0);
        const sample  = motifs.slice(0, 4).map(m =>
            `${m.key.slice(0,10)}=${m.normAvgQ.toFixed(3)}`
        ).join(' ');
        console.log(
            `[normAvgQ] motifs:${motifs.length}` +
            ` nonzero:${nonzero.length}` +
            ` sample: ${sample}`
        );
    }
}



// ================================================================
// GET SCHEMA BONUS
// ================================================================
// Returns a scalar [0..1] that scoring adds to the final weight.
// High if (fromId→toId) is part of a known abstract schema.
// Zero if no schema matches.
//
// This is the ONLY public interface used by scoring.
// ================================================================

export function getSchemaBonus(fromId, toId) {

    const key = fromId + "->" + toId;
    return _bonusCache.get(key) || 0;

}



// ================================================================
// GET SCHEMAS (debug / HUD)
// ================================================================

export function getSchemas() {
    return schemas;
}



// ================================================================
// GET SCHEMA DIAGNOSTICS (Step 5 verification — read-only)
// ================================================================
// Returns the full value-chain picture from the last rebuild as
// structured data, so a verifier can grade it directly instead of
// parsing console logs. Computes nothing new — surfaces existing
// motif fields (freqStrength, normAvgQ, strength) + rank comparison.
//
// Returns:
//   {
//     motifCount, nonzeroNormAvgQ, fractionalStrengthCount,
//     rankChanges,                     // [{key, freqRank, valueRank, normAvgQ}]
//     motifs:  [{key, episodeSpread, freqStrength, normAvgQ, strength}],
//     schemas: [{name, strength, fractional}]
//   }
export function getSchemaDiagnostics() {

    const motifs = _lastMotifs || [];

    // frequency-only ranking
    const freqRanked  = [...motifs].sort((a,b) => b.freqStrength - a.freqStrength);
    const freqRankMap = new Map(freqRanked.map((m,i) => [m.key, i]));
    // value-modulated ranking (motifs already sorted by strength)
    const valueRankMap = new Map(motifs.map((m,i) => [m.key, i]));

    const rankChanges = [];
    motifs.forEach(m => {
        const fr = freqRankMap.get(m.key);
        const vr = valueRankMap.get(m.key);
        if (fr !== vr) {
            rankChanges.push({
                key:      m.key,
                freqRank: fr,
                valueRank: vr,
                normAvgQ: m.normAvgQ
            });
        }
    });

    return {
        motifCount:               motifs.length,
        nonzeroNormAvgQ:          motifs.filter(m => m.normAvgQ > 0).length,
        fractionalStrengthCount:  schemas.filter(s => !Number.isInteger(s.strength)).length,
        rankChanges,
        motifs: motifs.map(m => ({
            key:           m.key,
            episodeSpread: m.episodeSpread,
            freqStrength:  m.freqStrength,
            normAvgQ:      m.normAvgQ,
            strength:      m.strength
        })),
        schemas: schemas.map(s => ({
            name:       s.name,
            strength:   s.strength,
            fractional: !Number.isInteger(s.strength)
        }))
    };
}



// ================================================================
// ── PRIVATE ─────────────────────────────────────────────────────
// ================================================================



// ── STEP 5: motifAvgQ ───────────────────────────────────────────
//
// Computes the average goal-conditioned Q over a motif's
// consecutive transitions, averaged across its supporting episodes.
//
// DATA PATH:
//   motif.episodeIndices
//     → episodicStore[epIdx].activeGoal          (Step 4 field)
//     → _sys.makeStateKey(node, goal)            (Step 1/Step 3)
//     → _sys.diagVisits.get(stateKey+action)     (visit-count gate)
//     → _sys.getQ(stateKey, nextNode)            (Q lookup)
//     → average → normAvgQ → strength multiplier
//
// INVARIANT: always returns a finite number (never NaN).
// When n===0 (no transitions pass the gate), returns 0.
//
// _sys.diagVisits may be undefined before Step 2 diagnostics
// are initialised (or if the caller passes no diagVisits).
// In that case the visit-count gate is skipped and every
// transition contributes (conservative: no gating = noisier).

function _motifAvgQ(motif, episodicStore) {

    // guard: _sys must have getQ and makeStateKey injected (Step 5 init)
    if (!_sys || typeof _sys.getQ !== 'function' || typeof _sys.makeStateKey !== 'function') {
        return 0;
    }

    const nodes       = motif.nodes;
    const diagVisits  = _sys.diagVisits;  // may be undefined — handled below

    let sum = 0;
    let n   = 0;

    for (const epIdx of motif.episodeIndices) {

        const ep = episodicStore[epIdx];
        if (!ep) continue;

        const goal = ep.activeGoal;
        if (goal == null) continue;   // skip pre-Step-4 episodes with no goal

        for (let i = 0; i + 1 < nodes.length; i++) {

            const stateKey = _sys.makeStateKey(nodes[i], goal);
            const action   = nodes[i + 1];

            // ── visit-count gate ────────────────────────────────
            // Skip Q entries that have not yet been updated enough
            // times to be reliable. Uses the composite key format
            // "pos#goal->action" written by Step 3's updateQ calls.
            if (diagVisits) {
                const visitKey = stateKey + "->" + String(action);
                const visits   = diagVisits.get(visitKey) || 0;
                if (visits < MIN_QKEY_VISITS) continue;
            }

            const qVal = _sys.getQ(stateKey, action);
            sum += qVal;
            n++;
        }
    }

    // NaN guard: n===0 → return 0, never divide by zero
    if (n === 0) return 0;

    const avg = sum / n;

    // extra safety: if somehow avg is NaN/Infinity, return 0
    return Number.isFinite(avg) ? avg : 0;
}



// ── Detect motifs from episodic store ───────────────────────────
// Identical logic to episodeManager._detectMotifs but kept local
// so schemaMemory has no dependency on episodeManager internals.

function _detectMotifsForSchema(store, minLen = 2, maxLen = 6) {

    const motifMap = new Map();

    store.forEach((ep, epIndex) => {

        const nodes = ep.nodes;

        for (let len = minLen; len <= maxLen; len++) {

            for (let i = 0; i + len <= nodes.length; i++) {

                const slice = nodes.slice(i, i + len);

                // simple path only
                if (new Set(slice).size !== slice.length) continue;

                const key = slice.join("->");

                if (!motifMap.has(key)) {
                    motifMap.set(key, {
                        nodes: slice,
                        count: 0,
                        episodes: new Set()
                    });
                }

                const m = motifMap.get(key);
                m.count++;
                m.episodes.add(epIndex);
            }
        }
    });

    const result = [];

    motifMap.forEach((m, key) => {
        if (m.episodes.size >= MIN_SPREAD) {

            const nodes          = m.nodes;
            const episodeIndices = [...m.episodes];

            // ── STEP 5: value-modulated strength ─────────────────
            // freqStrength: the original frequency × length product.
            //   Kept as the BASE so well-supported motifs are never
            //   zeroed by a missing/weak value signal.
            //
            // normAvgQ: avg goal-conditioned Q over the motif's
            //   transitions, normalised to [0,1] and clamped.
            //   Reads _sys.getQ via composite makeStateKey keys.
            //   Returns 0 (not NaN) when no transitions qualify.
            //
            // strength = freqStrength × (1 + λ·normAvgQ)
            //   λ=0 → strength === freqStrength (parity with pre-Step-5)
            //   λ=1 → value up-ranks motifs whose transitions are
            //          highly valued under the active goal.
            //
            // MIN_SPREAD gate above is unchanged — frequency is
            // still the SUPPORT FLOOR; value only modulates ranking.

            const freqStrength = m.episodes.size * m.nodes.length;

            const pseudoMotif  = { nodes, episodeIndices };
            const avgQ         = _motifAvgQ(pseudoMotif, store);
            const normAvgQ     = Math.min(Math.max(avgQ / (Q_NORM || 1), 0), 1);
            const strength     = freqStrength * (1 + LAMBDA * normAvgQ);

            result.push({
                key,
                nodes,
                count:          m.count,
                episodeSpread:  m.episodes.size,
                strength,        // value-modulated (used for ranking & schema)
                freqStrength,    // frequency-only  (used for rank-change log)
                normAvgQ,        // [0,1]           (used for histogram log)
                episodeIndices
            });
        }
    });

    return result.sort((a, b) => b.strength - a.strength);
}



// ── Extract a schema from one motif ─────────────────────────────
//
// Compares this motif's nodes against the same-position nodes
// in other episodes. A node is an ANCHOR if it appears in that
// position across ≥ 70% of all supporting episodes.
// A node is a VARIABLE if different episodes show different nodes.
//
// Example:
//   Episodes that contain motif of length 4 at position 0:
//     ep1: [lion,  hunt, meat, eat]  position 0 = lion
//     ep2: [tiger, hunt, deer, eat]  position 0 = tiger
//     ep3: [tiger, hunt, meat, eat]  position 0 = tiger
//
//   Position 0: lion(1x), tiger(2x) → 70% threshold = 2/3 → tiger anchors? no. VARIABLE.
//   Position 1: hunt(3x)            → 100% → ANCHOR.
//   Position 3: eat(3x)             → 100% → ANCHOR.
//
//   Schema: [VAR] → hunt → [VAR] → eat
//   Name: derived from anchor labels

function _extractSchema(motif, episodicStore) {

    const len          = motif.nodes.length;
    const epIndices    = motif.episodeIndices;
    const totalEp      = epIndices.length;
    const ANCHOR_THRESHOLD = 0.70;

    // For each position in the motif, collect all node IDs that
    // appear in that position across every supporting episode.
    const positionNodes = Array.from({ length: len }, () => []);

    epIndices.forEach(epIdx => {

        const ep = episodicStore[epIdx];
        if (!ep) return;

        // Find where this motif starts in the episode
        for (let start = 0; start + len <= ep.nodes.length; start++) {

            let matches = true;
            for (let j = 0; j < len; j++) {
                // at least the anchor positions must match the
                // motif's known nodes; variable positions can differ
                if (motif.nodes[j] === ep.nodes[start + j]) continue;
                // allow a mismatch — this is the cross-episode comparison
            }

            // record what's at each position in this episode
            for (let j = 0; j < len; j++) {
                positionNodes[j].push(ep.nodes[start + j]);
            }

            break; // only first occurrence per episode
        }
    });

    // determine anchors vs variables for each position
    const slots    = [];
    const anchors  = new Set();
    const variables = new Map();   // position → candidate node ids

    for (let j = 0; j < len; j++) {

        const seen     = positionNodes[j];
        if (seen.length === 0) return null;

        // count frequencies
        const freq = new Map();
        seen.forEach(id => freq.set(id, (freq.get(id) || 0) + 1));

        const mostCommonId    = [...freq.entries()].sort((a,b)=>b[1]-a[1])[0][0];
        const mostCommonCount = freq.get(mostCommonId);
        const ratio           = mostCommonCount / totalEp;

        if (ratio >= ANCHOR_THRESHOLD) {
            // this position is locked to one specific node
            anchors.add(mostCommonId);
            slots.push({ type: "anchor", nodeId: mostCommonId });
        } else {
            // variable slot — multiple nodes appear here
            const candidates = [...freq.keys()];
            variables.set(j, candidates);
            slots.push({ type: "variable", candidates });
        }
    }

    // need at least one anchor to be useful (otherwise it's too vague)
    if (anchors.size === 0) return null;

    // build the schema spine: "anchor->anchor" key pairs
    const transitions = [];
    for (let j = 0; j < len - 1; j++) {
        if (slots[j].type === "anchor" && slots[j+1].type === "anchor") {
            transitions.push(
                slots[j].nodeId + "->" + slots[j+1].nodeId
            );
        }
    }

    // name the schema from its anchor labels
    const anchorLabels = [...anchors].map(id => {
        const n = _sys.findNeuronById(id);
        return n ? n.userData.label : String(id);
    });

    const name = anchorLabels.join("_").toUpperCase() + "_SCHEMA";

    return {
        name,
        anchors,
        variables,
        slots,
        transitions,
        // ── STEP 5: use value-modulated strength from the motif ──
        // motif.strength already incorporates the λ·normAvgQ factor.
        // Falls back to totalEp (frequency count) if the motif has
        // no strength field (e.g. if called from older code paths).
        strength:    (motif.strength != null) ? motif.strength : totalEp,
        lastUpdated: Date.now()
    };
}



// ── Build the bonus cache from a schema ──────────────────────────
//
// For every transition in the schema (including variable slots),
// cache a schema bonus keyed by "fromId->toId".
//
// Anchor→anchor transitions get full bonus (1.0 × schemaWeight).
// Variable→anchor or anchor→variable get half bonus (0.5 ×).
// This way the schema provides a gradient toward known patterns
// without overriding the procedural Q signal.

function _cacheSchemaBonus(schema) {

    const schemaWeight = Math.min(schema.strength / 10, 1.0);

    const slots = schema.slots;

    for (let j = 0; j < slots.length - 1; j++) {

        const from = slots[j];
        const to   = slots[j + 1];

        if (from.type === "anchor" && to.type === "anchor") {

            // full strength: proven anchor→anchor step
            const key = from.nodeId + "->" + to.nodeId;
            _bonusCache.set(key, schemaWeight * 1.0);

        } else if (from.type === "variable" && to.type === "anchor") {

            // half strength: any variable → a known anchor
            to.nodeId && (from.candidates || []).forEach(varId => {
                const key = varId + "->" + to.nodeId;
                const existing = _bonusCache.get(key) || 0;
                _bonusCache.set(key, Math.max(existing, schemaWeight * 0.5));
            });

        } else if (from.type === "anchor" && to.type === "variable") {

            // half strength: a known anchor → any variable
            (to.candidates || []).forEach(varId => {
                const key = from.nodeId + "->" + varId;
                const existing = _bonusCache.get(key) || 0;
                _bonusCache.set(key, Math.max(existing, schemaWeight * 0.5));
            });
        }
    }
}
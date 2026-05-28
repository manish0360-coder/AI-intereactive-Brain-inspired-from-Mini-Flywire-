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

// Edge → schema bonus cache (cleared on rebuild)
// key: "fromId->toId", value: bonus scalar
const _bonusCache = new Map();

// Rebuild interval in ms — schemas are extracted periodically,
// not on every step. Expensive to run; cheap to look up.
const REBUILD_INTERVAL_MS = 15000;   // every 15 seconds of agent time
let _lastRebuild = 0;

// Minimum motif episode spread before abstraction
const MIN_SPREAD = 2;

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

export function rebuildSchemas(episodicStore) {

    if (!_sys) return;

    const now = Date.now();
    if (now - _lastRebuild < REBUILD_INTERVAL_MS) return;
    _lastRebuild = now;

    // ── collect all motifs from the store ──────────────────────
    const motifs = _detectMotifsForSchema(episodicStore);

    if (motifs.length === 0) return;

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
// ── PRIVATE ─────────────────────────────────────────────────────
// ================================================================



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
            result.push({
                key,
                nodes:         m.nodes,
                count:         m.count,
                episodeSpread: m.episodes.size,
                strength:      m.episodes.size * m.nodes.length,
                episodeIndices: [...m.episodes]
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
        strength:    totalEp,
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
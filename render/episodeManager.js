// ================================================================
// 🧠 EPISODE MANAGER — UNIFIED EPISODIC MEMORY SUBSTRATE
// ================================================================
//
// SINGLE SOURCE OF TRUTH for all episodic learning.
//
// Every experience — whether taught by a human, discovered by
// the autonomous agent, rehearsed in replay, or imagined in
// simulation — becomes an Episode object before it touches
// any memory system. The pipeline runs exactly once per episode,
// and each memory system updates at its own rate.
//
// FLOW
// ────
//   manual teaching      ─┐
//   autonomous success   ─┤
//   autonomous explore   ─┤──► episodic object
//   replay               ─┤       │
//   imagination          ─┘       │
//                                 ▼
//                         _runPipeline(episode)
//                           ├─ procedural   (Q, transitions, rewards)
//                           ├─ semantic     (embeddings, vitality)
//                           ├─ trust        (Bayesian success rate)
//                           ├─ episodic     (store for replay)
//                           └─ consolidation (motif → long-term memory)
//
// SOURCE AUTHORITY
// ────────────────
// Different sources have different authority over each system.
// The authority table prevents a manual teaching event from
// inflating trust memory, and prevents replay from inflating
// semantic meaning.
//
// | Source             | Procedural | Semantic | Trust | Consolidation |
// |--------------------|------------|----------|-------|---------------|
// | autonomous_success | 1.00       | 0.60     | 1.00  | yes           |
// | autonomous_explore | 0.30       | 0.10     | 0.00  | no            |
// | manual             | 0.90       | 0.15     | 0.00  | yes (motif)   |
// | replay             | 0.40       | 0.00     | 0.00  | no            |
// | imagination        | 0.15       | 0.05     | 0.00  | no            |
//
// ================================================================



// ================================================================
// AUTHORITY TABLE
// ================================================================

const AUTHORITY = {

    autonomous_success: {
        procedural:    1.00,
        semantic:      0.60,
        trust:         1.00,
        consolidation: true,
        label:         "autonomous_success"
    },

    autonomous_explore: {
        procedural:    0.30,
        semantic:      0.10,
        trust:         0.00,
        consolidation: false,
        label:         "autonomous_explore"
    },

    manual: {
        procedural:    0.90,
        semantic:      0.15,
        trust:         0.00,
        consolidation: true,
        label:         "manual"
    },

    replay: {
        procedural:    0.40,
        semantic:      0.00,
        trust:         0.00,
        consolidation: false,
        label:         "replay"
    },

    imagination: {
        procedural:    0.15,
        semantic:      0.05,
        trust:         0.00,
        consolidation: false,
        label:         "imagination"
    }

};



// ================================================================
// VALIDATION REQUIREMENTS PER SOURCE
// ================================================================

const VALIDATION = {

    // Genuine autonomous experience: needs depth and diversity
    autonomous_success: { minLength: 3, minUnique: 3, minDiversity: 0.50 },

    // Exploratory step: looser — captures short causal chains
    autonomous_explore: { minLength: 2, minUnique: 2, minDiversity: 0.40 },

    // Manual teaching: any 2-node sequence is intentional
    manual:             { minLength: 2, minUnique: 2, minDiversity: 0.00 },

    // Replay: must meet the same bar as when originally stored
    replay:             { minLength: 3, minUnique: 3, minDiversity: 0.50 },

    // Imagined: very loose — imagination is speculative
    imagination:        { minLength: 2, minUnique: 2, minDiversity: 0.30 }

};



// ================================================================
// STATE
// ================================================================

// All sealed episodes in memory (replaces episodes[] AND
// episodicTraining.episodicStore — single unified store)
export const episodicStore = [];

const MAX_STORE    = 300;   // oldest evicted when exceeded
const MAX_REPLAYS  = 200;   // how many are eligible for replay

// Active open buffer for manual training (one at a time)
let _activeBuffer = null;

// Injected system references (set once via initEpisodeManager)
let _sys = null;

// Replay cooldown — prevents same episode replaying too soon
const _replayCooldown = new Map();

// Consolidation counter — run consolidation every N episodes
let _episodesSinceConsolidation = 0;
const CONSOLIDATION_INTERVAL = 5;



// ================================================================
// INITIALISATION
// ================================================================
//
// Must be called once all memory systems and utility functions
// are ready. Pass a single systemRefs object so the episode
// manager is decoupled from global scope.
//
// ================================================================

export function initEpisodeManager(systemRefs) {

    _sys = systemRefs;

    console.log("🧠 EpisodeManager initialised");

}



// ================================================================
// MANUAL TRAINING ENTRY POINT
// ================================================================
//
// The ONLY function the click handler needs to call.
//
// Records one manual click. Internally:
//   — opens an episode buffer if none is active
//   — detects revisits (the node already appears in this pass)
//     and seals + starts fresh when found
//   — seals the episode when the goal is clicked
//   — runs the full learning pipeline once per sealed episode
//
// This replaces: startTrainingEpisode / appendTrainingNode /
// endTrainingEpisode / learnTrainingEpisode / commitEpisode.
//
// ================================================================

export function recordManualClick(id, label, isGoalClick) {

    id = Number(id);

    // ── open buffer if none is active ──────────────────────
    if (!_activeBuffer) {
        _activeBuffer = _createBuffer("manual");
    }

    // ── revisit detection ────────────────────────────────────
    // In a teaching pass the human clicks a simple path.
    // If the same node appears again, the pass is complete
    // and a new one begins. (Exception: the goal itself may
    // be the last node of the pass — that's intentional.)
    const revisits =
        !isGoalClick &&
        _activeBuffer.nodes.includes(id);

    if (revisits) {

        // seal current pass
        const sealed = _sealBuffer(_activeBuffer);
        _activeBuffer = null;
        if (sealed) _runPipeline(sealed);

        // begin new pass with this node as the first step
        _activeBuffer = _createBuffer("manual");
    }

    // ── append node (ignore consecutive duplicates) ──────────
    const last = _activeBuffer.nodes.at(-1);
    if (id !== last) {
        _activeBuffer.nodes.push(id);
        _activeBuffer.labels.push(label != null ? String(label) : String(id));
    }

    // ── goal click = terminus ────────────────────────────────
    if (isGoalClick) {

        const sealed = _sealBuffer(_activeBuffer);
        _activeBuffer = null;
        if (sealed) _runPipeline(sealed);

    }

}



// ================================================================
// AUTONOMOUS SUCCESS ENTRY POINT
// ================================================================
//
// Called when the autonomous agent reaches the goal.
// Converts recentMemory (ID array) + the goal node into an
// episode and runs the full pipeline with maximum authority.
//
// meta = { confidenceState, stressState, fatigueState,
//           curiosityState, predictionError }
//
// ================================================================

export function recordAutonomousSuccess(recentMemory, goalId, neuronMap, meta) {

    if (!_sys) return;

    // build label path from recentMemory IDs + goal
    const episodeWords = recentMemory.map(id => {
        const n = neuronMap.get(Number(id));
        return n ? n.userData.label : String(id);
    });

    // add goal label if not already at end
    const goalNeuron = neuronMap.get(Number(goalId));
    const goalLabel  = goalNeuron ? goalNeuron.userData.label : String(goalId);

    if (episodeWords.at(-1) !== goalLabel) {
        episodeWords.push(goalLabel);
    }

    // build corresponding ID array
    const labelToId = new Map();
    neuronMap.forEach((n, id) => labelToId.set(n.userData.label, id));

    const nodeIds = episodeWords.map(label => {
        const id = labelToId.get(label);
        return id != null ? Number(id) : null;
    }).filter(id => id !== null);

    if (nodeIds.length < 2) return;

    // assemble episode
    const ep = _createBuffer("autonomous_success");
    ep.nodes      = nodeIds;
    ep.labels     = episodeWords;
    ep.predictionError = meta?.predictionError ?? 0;
    ep.meta       = { ...meta };

    const sealed = _sealBuffer(ep);
    if (sealed) _runPipeline(sealed);

}



// ================================================================
// AUTONOMOUS EXPLORE ENTRY POINT
// ================================================================
//
// Called for non-goal autonomous steps. Captures exploratory
// transitions for weaker procedural and semantic learning.
// Does NOT require reaching a goal.
//
// from / to are neuron IDs.
//
// ================================================================

export function recordAutonomousStep(fromId, toId, neuronMap) {

    if (!_sys || fromId == null || toId == null) return;
    if (Number(fromId) === Number(toId)) return;   // no self-steps

    const fromN = neuronMap.get(Number(fromId));
    const toN   = neuronMap.get(Number(toId));
    if (!fromN || !toN) return;

    // Only write procedural memory for actual graph neighbors.
    // Prevents shortcuts like hunt->eat or bone->eat from being
    // written autonomously — they have no real graph edge and
    // were never manually taught. Without this, every node
    // accumulates a trained transition to eat, poisoning the
    // isEpisodeTrained candidate guard in runPrediction.
    const isActualGraphNeighbor =
        Array.isArray(fromN.userData.neighbors) &&
        fromN.userData.neighbors.includes(Number(toId));

    if (!isActualGraphNeighbor) return;

    const ep = _createBuffer("autonomous_explore");
    ep.nodes  = [Number(fromId), Number(toId)];
    ep.labels = [fromN.userData.label, toN.userData.label];

    const sealed = _sealBuffer(ep);

    // explore steps: run minimal pipeline (procedural only, no store)
    if (sealed) _runPipelineMinimal(sealed);

}



// ================================================================
// REPLAY ENTRY POINT
// ================================================================
//
// Picks one past episode from the store and re-runs it through
// the pipeline with reduced authority (replay cannot create
// new trust or inflate semantic meaning).
//
// Replaces: replayEpisodes() in replay.js
//
// ================================================================

export function replayOneEpisode() {

    if (!_sys) return;

    // only replay from genuine high-quality simple-path episodes
    const eligible = episodicStore.filter(ep => {
        if (ep.source === "replay" || ep.source === "imagination") return false;
        if (ep.quality < 0.5) return false;
        if (ep.nodes.length < 3) return false;
        // require a simple path — no repeated nodes
        const isSimplePath = new Set(ep.nodes).size === ep.nodes.length;
        if (!isSimplePath) return false;
        // ──────────────────────────────────────────────────────
        // GRAPH VALIDITY CHECK
        // ──────────────────────────────────────────────────────
        // Every consecutive pair in the episode must be connected
        // by either a real graph edge OR a manually-trained
        // transition (strength > 5). This blocks phantom episodes
        // like meat→food→eat (meat and food share no graph edge
        // and were never manually taught together) from being
        // replayed and building huge Q values (Q[6→5]=19.95)
        // on non-existent paths.
        // ──────────────────────────────────────────────────────
        if (!_sys) return true; // can't validate without sys refs
        for (let i = 0; i < ep.nodes.length - 1; i++) {
            const fromId = ep.nodes[i];
            const toId   = ep.nodes[i + 1];
            const fromN  = _sys.findNeuronById(fromId);
            if (!fromN) return false;
            const isGraphEdge =
                Array.isArray(fromN.userData.neighbors) &&
                fromN.userData.neighbors.includes(Number(toId));
            const tMap = _sys.transitions.get(fromId);
            const isManualTrained = tMap && (tMap.get(toId) || 0) > 5;
            if (!isGraphEdge && !isManualTrained) return false;
        }
        return true;
    });

    if (eligible.length === 0) return;

    // pick random eligible episode
    const original = eligible[
        Math.floor(Math.random() * eligible.length)
    ];

    const replayKey = original.labels.join("->");

    // cooldown: same episode can't replay more than once per 4s
    const lastReplay = _replayCooldown.get(replayKey) || 0;
    if (Date.now() - lastReplay < 4000) return;
    _replayCooldown.set(replayKey, Date.now());

    // build replay episode (shallow copy with new source)
    const ep = _createBuffer("replay");
    ep.nodes  = [...original.nodes];
    ep.labels = [...original.labels];

    const sealed = _sealBuffer(ep);

    if (sealed) {
        console.log("🧠 Replaying:", sealed.labels.join(" → "));
        _runPipeline(sealed);
    }

}



// ================================================================
// READ API
// ================================================================

// Returns episodes in the format buildEpisodeMap expects.
// ep.path is a label array — maintained for backward compat.
export function getEpisodesForBuildMap() {

    return episodicStore.map(ep => ({
        path:   ep.labels,       // label array ("lion","hunt","meat","eat")
        score:  ep.quality * 10, // backward-compat field for weak-replay filter
        ...ep
    }));

}

// Returns all raw episodes
export function getAllEpisodes() {
    return episodicStore;
}

// Returns stats for HUD / debugging
export function getEpisodeStats() {
    const bySource = {};
    episodicStore.forEach(ep => {
        bySource[ep.source] = (bySource[ep.source] || 0) + 1;
    });
    return {
        total:      episodicStore.length,
        bySource,
        avgQuality: episodicStore.reduce((s, e) => s + e.quality, 0) /
                    (episodicStore.length || 1)
    };
}

// Wipe all episodic memory (brain-wipe handler)
export function clearAllEpisodes() {
    episodicStore.length = 0;
    _activeBuffer = null;
    _replayCooldown.clear();
    _episodesSinceConsolidation = 0;
}


// ================================================================
// 🧠 EPISODE PERSISTENCE — cross-session memory
// ================================================================
// A cognitive companion must remember its lived experiences
// across sessions. These two functions let main.js save and
// restore the full episodic store via localStorage.
//
// Episodes are plain data objects (nodes, labels, transitions,
// quality, source) so they serialise cleanly to JSON.
// ================================================================

export function exportEpisodes() {
    // Return a JSON-safe copy of the episodic store.
    return episodicStore.map(ep => ({
        id:          ep.id,
        source:      ep.source,
        nodes:       ep.nodes,
        labels:      ep.labels,
        transitions: ep.transitions,
        quality:     ep.quality,
        coherence:   ep.coherence,
        unique:      ep.unique,
        diversity:   ep.diversity,
        timestamp:   ep.timestamp,
        consolidationEligible: ep.consolidationEligible,
    }));
}

export function loadEpisodes(savedEpisodes) {
    if (!Array.isArray(savedEpisodes)) return;

    episodicStore.length = 0;

    savedEpisodes.forEach(ep => {
        // Basic validation — skip corrupt entries
        if (!ep || !Array.isArray(ep.nodes) || ep.nodes.length < 2) return;
        episodicStore.push({
            id:          ep.id || ("loaded_" + Math.random().toString(36).slice(2, 9)),
            source:      ep.source || "autonomous_success",
            nodes:       ep.nodes,
            labels:      ep.labels || ep.nodes.map(String),
            transitions: ep.transitions || [],
            path:        ep.labels || ep.nodes.map(String),
            quality:     typeof ep.quality === "number" ? ep.quality : 0.5,
            coherence:   ep.coherence || 0.5,
            unique:      ep.unique || new Set(ep.nodes).size,
            diversity:   ep.diversity || 0.5,
            timestamp:   ep.timestamp || Date.now(),
            consolidationEligible: ep.consolidationEligible !== false,
        });
    });

    console.log("🧠 Episodic memory restored:", episodicStore.length, "episodes");
}



// ================================================================
// ── PRIVATE INTERNALS ───────────────────────────────────────────
// ================================================================



// ── Create a fresh empty buffer ─────────────────────────────────

function _createBuffer(source) {
    return {
        source,
        nodes:         [],
        labels:        [],
        predictionError: 0,
        meta:          {},
        timestamp:     Date.now()
    };
}



// ── Seal a buffer → Episode object ──────────────────────────────
//
// Extracts transitions, computes coherence and quality,
// validates against per-source minimums.
// Returns the episode object, or null if invalid.

function _sealBuffer(buf) {

    if (!buf || buf.nodes.length < 2) return null;

    const source    = buf.source;
    const req       = VALIDATION[source] || VALIDATION.autonomous_explore;
    const auth      = AUTHORITY[source]  || AUTHORITY.autonomous_explore;

    // ── de-duplicate consecutive nodes ───────────────────────
    // ("eat→eat→meat" → "eat→meat")
    const nodes  = [];
    const labels = [];
    buf.nodes.forEach((id, i) => {
        if (i === 0 || id !== buf.nodes[i - 1]) {
            nodes.push(id);
            labels.push(buf.labels[i] || String(id));
        }
    });

    if (nodes.length < 2) return null;

    // ── validation ───────────────────────────────────────────
    const unique    = new Set(nodes).size;
    const diversity = unique / nodes.length;

    if (nodes.length  < req.minLength)   return null;
    if (unique        < req.minUnique)   return null;
    if (diversity     < req.minDiversity) return null;

    // ── extract transitions ──────────────────────────────────
    const transitions = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        if (nodes[i] !== nodes[i + 1]) {  // extra self-loop guard
            transitions.push({
                from:     nodes[i],
                to:       nodes[i + 1],
                position: i,
                terminal: i === nodes.length - 2
            });
        }
    }

    if (transitions.length === 0) return null;

    // ── quality score ────────────────────────────────────────
    // coherence × (1 − predictionError influence)
    const coherence = diversity;
    const predErr   = Math.min(buf.predictionError || 0, 1);
    const quality   = coherence * (1 - predErr * 0.4);

    return {
        id:          `${source}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        source,
        nodes,
        labels,
        path:        labels,   // backward-compat alias
        transitions,
        coherence,
        quality,
        unique,
        diversity,
        predictionError: predErr,
        meta:        buf.meta,
        timestamp:   buf.timestamp,
        consolidationEligible: auth.consolidation,
    };

}



// ── Run the full learning pipeline ──────────────────────────────
//
// Called for manual, autonomous_success, and replay episodes.
// Each subsystem updates at its own rate and evidence level.

function _runPipeline(episode) {

    if (!_sys) return;

    const auth    = AUTHORITY[episode.source] || AUTHORITY.autonomous_explore;
    const quality = episode.quality;
    const pairs   = episode.transitions;

    // ── A. PROCEDURAL MEMORY ─────────────────────────────────
    //    "I can execute these transitions."
    //    Strong, immediate, survives forgetting well.

    if (auth.procedural > 0) {
        _learnProcedural(episode, auth, quality);
    }

    // ── B. SEMANTIC MEMORY ───────────────────────────────────
    //    "These concepts seem related."
    //    Weak nudge only — abstraction must emerge slowly.

    if (auth.semantic > 0) {
        _learnSemantic(episode, auth, quality);
    }

    // ── C. TRUST MEMORY ──────────────────────────────────────
    //    "This path reliably worked in reality."
    //    Only autonomous verified success writes here.

    if (auth.trust > 0) {
        _updateTrust(episode, auth, quality);
    }

    // ── D. EPISODIC STORAGE ───────────────────────────────────
    //    Store for future replay and motif extraction.
    //    Replay and imagination episodes are not stored
    //    (they replay/imagine what's already there).

    if (episode.source !== "replay" && episode.source !== "imagination") {
        _storeEpisode(episode);
    }

    // ── E. CONSOLIDATION ─────────────────────────────────────
    //    Runs periodically on recurring motifs.
    //    Not triggered per-episode (too expensive).

    if (episode.consolidationEligible) {
        _episodesSinceConsolidation++;
        if (_episodesSinceConsolidation >= CONSOLIDATION_INTERVAL) {
            _maybeConsolidate();
            _episodesSinceConsolidation = 0;
        }
    }

    // console.log removed: _runPipeline fires on every episode commit
    // (manual, autonomous, replay). At multiple times per minute this
    // floods the console. Episode events are tracked via episodicStore.
    // Key events (consolidation, schema rebuild) still log individually.

}



// ── Minimal pipeline for autonomous exploration steps ───────────
//
// Only procedural at explore authority. No store, no consolidation.

function _runPipelineMinimal(episode) {

    if (!_sys) return;

    const auth = AUTHORITY.autonomous_explore;
    if (auth.procedural > 0) {
        _learnProcedural(episode, auth, episode.quality);
    }

}



// ── A. Procedural learning ───────────────────────────────────────
//
// Updates: transitions, Q-values, reward memory, momentum.
// Rate scales with: authority × quality

function _learnProcedural(episode, auth, quality) {

    const sys        = _sys;
    const gain       = auth.procedural * quality;
    const chainLen   = episode.transitions.length;

    // =============================================
    // FIX 1 + FIX 5: CAUSAL CHAIN REINFORCEMENT
    // ─────────────────────────────────────────────
    // Instead of reinforcing each edge independently
    // with the same reward, reinforce the TRAJECTORY
    // as an atomic temporal object.
    //
    // "lion enabled hunt" — lion→hunt gets credit
    // for enabling all downstream steps (3 steps).
    // "hunt enabled meat" — hunt→meat enabled 2 more.
    // "meat enabled eat"  — meat→eat was the final cause.
    //
    // Causal credit formula:
    //   stepsEnabled = chainLen - i - 1
    //   causalBonus  = stepsEnabled × 0.20
    //
    // So for lion→hunt (i=0, enabled 3 steps):
    //   causalBonus = 3 × 0.20 = 0.60 → reward = 8 × (1 + 0.60) = 12.8
    //
    // For meat→eat (i=2, enabled 0 steps):
    //   causalBonus = 0 → reward = 8 (direct, no extra)
    //
    // This means earlier enabling steps get MORE
    // reinforcement, not less — they caused the most.
    //
    // Additionally: Q nextState is the FULL chain
    // terminus (goalId), not just the immediate next
    // state. This connects each step's value to the
    // full episode outcome, not just its neighbor.
    // =============================================

    // Find the terminal node of this episode
    const terminalId = chainLen > 0
        ? episode.transitions[chainLen - 1].to
        : null;

    episode.transitions.forEach((pair, i) => {

        const from = pair.from;
        const to   = pair.to;
        const key  = from + "->" + to;

        const prov = (episode.source === "manual")
            ? sys.PROVENANCE.MANUAL_TRAINING
            : sys.PROVENANCE.DIRECT_EXPERIENCE;

        // ── Causal enabling multiplier ───────────────────────
        // Earlier steps in the chain that ENABLED the goal
        // get proportionally more credit than later steps.
        const stepsEnabled  = chainLen - i - 1;
        const causalBonus   = stepsEnabled * 0.20;
        const causalReward  = 8 * gain * (1 + causalBonus);

        // ── Transition strength ──────────────────────────────
        // Scale with causal position so enabling steps
        // also get stronger procedural memory traces.
        const tMap = sys.transitions.get(from) || new Map();
        tMap.set(to, (tMap.get(to) || 0) + 20 * gain * (1 + causalBonus * 0.5));
        sys.transitions.set(from, tMap);

        // ── Q-value — trajectory-referenced ─────────────────
        // nextState is the immediate successor (standard
        // Bellman). But alpha is scaled DOWN for later steps
        // so that meat→eat doesn't over-dominate purely
        // because it always gets goal reward.
        //
        // Earlier enabling steps get higher alpha because
        // they are the causal bottleneck: if lion→hunt is
        // weak, the whole chain fails.
        const alphaBase  = Math.min(0.35, 0.3 * gain + 0.05);
        const causalAlpha = alphaBase * (1 + causalBonus * 0.3);

        sys.updateQ({
            state:     from,
            action:    to,
            reward:    causalReward,
            nextState: to,
            alpha:     Math.min(causalAlpha, 0.45),
            gamma:     0.9
        });

        // ── Reward memory ────────────────────────────────────
        sys.writeReward(sys.rewards, key, 5 * gain * (1 + causalBonus * 0.3), prov, 10);
        sys.logActivation(key, prov);

        // ── Momentum (3-gram sequence memory) ───────────────
        if (i > 0) {
            const older = episode.transitions[i - 1].from;
            sys.learnMomentum(older, from, to);
        }

    });

}



// ── B. Semantic learning ─────────────────────────────────────────
//
// Nudges embeddings slightly. Abstraction emerges slowly across
// many episodes, not from a single event.

function _learnSemantic(episode, auth, quality) {

    const sys        = _sys;
    const semGain    = auth.semantic * quality;
    const pairs      = episode.transitions;

    // ── per-pair embedding nudge ─────────────────────────────
    // trainEmbedding uses its own small internal lr,
    // so we only call it when semantic authority warrants it
    if (semGain >= 0.05) {
        pairs.forEach(pair => {
            sys.trainEmbedding(pair.from, pair.to);
        });
    }

    // ── semantic vitality for successful episodes ─────────────
    if (episode.source === "autonomous_success" && semGain >= 0.3) {

        // strip consecutive duplicates before calling reinforcement
        const dedupIds = episode.nodes.filter(
            (id, i) => i === 0 || id !== episode.nodes[i - 1]
        );

        if (dedupIds.length >= 2) {
            sys.reinforceEpisodeSemantics(
                dedupIds,
                semGain * 10   // vitality gain (0–6 range)
            );
        }

        // reinforce the terminal step most strongly
        const last = pairs.at(-1);
        if (last && last.from !== last.to) {
            sys.reinforceSemanticStrength(
                last.from + "->" + last.to,
                Math.round(semGain * 12)
            );
        }
    }

}



// ── C. Trust update ─────────────────────────────────────────────
//
// Only autonomous_success (trust authority = 1.0) writes here.
// This is the Bayesian "this path was verified in reality" signal.

function _updateTrust(episode, auth, quality) {

    if (auth.trust <= 0) return;

    const sys = _sys;

    episode.transitions.forEach(pair => {
        const key = pair.from + "->" + pair.to;

        // record this as a verified success
        sys.recordSuccess(key);

        // also strengthen confidence map (per-path trust display)
        const oldConf = sys.confidenceMap.get(key) || 0;
        sys.confidenceMap.set(
            key,
            Math.min(oldConf + 5 * auth.trust * quality, 100)
        );
    });

}



// ── D. Episode storage ───────────────────────────────────────────

function _storeEpisode(episode) {

    episodicStore.push(episode);

    if (episodicStore.length > MAX_STORE) {
        episodicStore.shift();
    }

}



// ── E. Consolidation ─────────────────────────────────────────────
//
// Scans the episodic store for recurring motifs — subsequences
// that appear in >= 2 distinct episodes. Only THESE are promoted
// to long-term consolidated memory via reinforcePath.
//
// This is what makes lion→hunt→meat→eat stable while
// eat→meat oscillations (which never become genuine episodes)
// never accumulate enough motif support to consolidate.

function _maybeConsolidate() {

    const sys    = _sys;
    const motifs = _detectMotifs(episodicStore, 2, 5);

    if (motifs.length === 0) return;

    // only consolidate motifs with at least 2-episode spread
    const toConsolidate = motifs
        .filter(m => m.episodeSpread >= 2)
        .slice(0, 5);

    if (toConsolidate.length === 0) return;

    toConsolidate.forEach(motif => {

        for (let i = 0; i < motif.nodes.length - 1; i++) {

            const from = motif.nodes[i];
            const to   = motif.nodes[i + 1];

            const fromN = sys.findNeuronById(from);
            const toN   = sys.findNeuronById(to);
            if (!fromN || !toN) continue;

            const consolidationStrength = Math.min(motif.episodeSpread, 5);

            sys.reinforcePath(
                from, to,
                fromN.userData.label,
                toN.userData.label,
                consolidationStrength
            );
        }

    });

    console.log(
        "🏛️ Consolidated", toConsolidate.length,
        "motifs. Strongest: " + toConsolidate[0].labels.join("→")
    );

    // ================================================================
    // HIERARCHICAL ABSTRACTION — trigger schema rebuild
    // ================================================================
    // After consolidation, motifs have been strengthened.
    // This is the right moment to rebuild schemas because:
    // 1. The episodic store just had new patterns promoted
    // 2. schemaMemory reads from episodicStore directly
    // 3. Schema extraction is expensive — runs here (every 5 episodes)
    //    not every step.
    //
    // rebuildSchemas is injected via initEpisodeManager so
    // episodeManager has no static import of schemaMemory.js
    // (avoids circular dependency: schemaMemory reads episodes,
    // episodeManager shouldn't import schemaMemory).
    // ================================================================
    if (_sys.rebuildSchemas) {
        _sys.rebuildSchemas(episodicStore);
    }

}



// ── Motif detection ──────────────────────────────────────────────
//
// Finds subsequences that recur across multiple distinct episodes.
// A motif that appears in many episodes is a stable causal pattern.
// A one-off oscillation loop has zero motif support.

function _detectMotifs(store, minLength = 2, maxLength = 5) {

    const motifMap = new Map();

    store.forEach((ep, epIndex) => {

        const nodes = ep.nodes;

        for (let len = minLength; len <= maxLength; len++) {

            for (let i = 0; i + len <= nodes.length; i++) {

                const slice = nodes.slice(i, i + len);

                // motif must be a simple path (no revisits)
                if (new Set(slice).size !== slice.length) continue;

                const key = slice.join("->");

                if (!motifMap.has(key)) {
                    motifMap.set(key, {
                        nodes:    slice,
                        labels:   slice.map(id => {
                            if (!_sys) return String(id);
                            const n = _sys.findNeuronById(id);
                            return n ? n.userData.label : String(id);
                        }),
                        count:    0,
                        episodes: new Set()
                    });
                }

                const m = motifMap.get(key);
                m.count++;
                m.episodes.add(epIndex);
            }
        }
    });

    const motifs = [];

    motifMap.forEach((m, key) => {
        if (m.episodes.size >= 2) {
            motifs.push({
                key,
                nodes:         m.nodes,
                labels:        m.labels,
                count:         m.count,
                episodeSpread: m.episodes.size,
                strength:      m.episodes.size * m.nodes.length
            });
        }
    });

    return motifs.sort((a, b) => b.strength - a.strength);

}
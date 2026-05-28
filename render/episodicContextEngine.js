// ======================================
// 🧠 EPISODIC CONTEXT ENGINE
// ======================================
// Automatically segments experience into
// bounded episodes with context containers.
//
// Solves:
//   - eat→cat corruption between sequences
//   - no manual reset needed
//   - automatic topic shift detection
//   - episode-gated learning
//   - working memory with decay
//   - semantic clustering per episode
//
// Architecture:
//   WorkingMemory   → active nodes right now
//   EpisodeBuffer   → current building episode
//   EpisodeVault    → completed stored episodes
//   ContextDetector → detects topic shifts
//   LearningGate    → blocks cross-episode learning
// ======================================



// ======================================
// WORKING MEMORY
// active concepts in current thought window
// decays naturally — like human short-term memory
// ======================================

const workingMemory = new Map();
// key: neuronId → value: { activation, lastSeen, label }

const WORKING_MEMORY_DECAY  = 0.88;   // per tick
const WORKING_MEMORY_THRESH = 0.05;   // below this → evicted
const WORKING_MEMORY_CAP    = 7;      // Miller's Law — 7±2 items



// ======================================
// EPISODE BUFFER
// current in-progress episode
// ======================================

let currentEpisode = {

    id:          generateEpisodeId(),
    nodes:       [],          // ordered sequence of neuron IDs
    labels:      [],          // human-readable labels
    startTime:   Date.now(),
    contextTag:  null,        // semantic cluster label
    reward:      0,
    sealed:      false        // true = episode complete

};



// ======================================
// BRIDGE TO episodeManager
// Set by main.js after both modules load
// ======================================

let _bridgeToEpisodeManager = null;

export function setEpisodeManagerBridge(fn) {
    _bridgeToEpisodeManager = fn;
}


// ======================================
// EPISODE VAULT
// all completed episodes
// max 500 episodes (circular buffer)
// ======================================

const episodeVault = [];
const VAULT_MAX    = 500;



// ======================================
// CONTEXT SIMILARITY HISTORY
// rolling window of embedding vectors
// for shift detection
// ======================================

const contextWindow   = [];
const CONTEXT_WINDOW  = 4;   // last N node embeddings
let   lastContextShiftTime = 0;
const CONTEXT_SHIFT_COOLDOWN = 800; // ms — prevent rapid re-segmentation



// ======================================
// CROSS-EPISODE LEARNING GATE
// tracks whether current transition
// crosses an episode boundary
// ======================================

let _episodeBoundaryJustCrossed = false;



// ======================================
// GENERATE EPISODE ID
// ======================================

function generateEpisodeId() {

    return "ep_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 6);
}



// ======================================
// ADD NODE TO WORKING MEMORY
// called every time a neuron is visited
// ======================================

export function wmAddNode(neuronId, label, embedding) {

    // full activation on visit
    workingMemory.set(neuronId, {
        activation: 1.0,
        lastSeen:   Date.now(),
        label,
        embedding:  embedding ? [...embedding] : null
    });

    // enforce capacity (evict lowest activation)
    if (workingMemory.size > WORKING_MEMORY_CAP) {

        let lowestKey = null;
        let lowestAct = Infinity;

        workingMemory.forEach((v, k) => {
            if (v.activation < lowestAct) {
                lowestAct = v.activation;
                lowestKey = k;
            }
        });

        if (lowestKey !== null) {
            workingMemory.delete(lowestKey);
        }
    }
}



// ======================================
// DECAY WORKING MEMORY
// call each agent step
// ======================================

export function wmDecay() {

    const dead = [];

    workingMemory.forEach((v, k) => {

        v.activation *= WORKING_MEMORY_DECAY;

        if (v.activation < WORKING_MEMORY_THRESH) {
            dead.push(k);
        }
    });

    dead.forEach(k => workingMemory.delete(k));
}



// ======================================
// GET WORKING MEMORY ACTIVATION
// how strongly is this node active right now?
// ======================================

export function wmGetActivation(neuronId) {

    return workingMemory.get(neuronId)?.activation || 0;
}



// ======================================
// GET WORKING MEMORY SNAPSHOT
// current active concept set
// ======================================

export function wmGetSnapshot() {

    const snapshot = [];

    workingMemory.forEach((v, k) => {
        snapshot.push({
            id:         k,
            label:      v.label,
            activation: v.activation
        });
    });

    return snapshot.sort((a, b) => b.activation - a.activation);
}



// ======================================
// DETECT CONTEXT SHIFT
// compares current embedding to
// rolling context window average
// returns shift score [0, 1]
// ======================================

function detectContextShift(embedding) {

    if (!embedding || contextWindow.length < 2) return 0;

    // compute mean of context window
    const dim = embedding.length;
    const mean = new Array(dim).fill(0);

    contextWindow.forEach(vec => {
        for (let i = 0; i < dim; i++) {
            mean[i] += vec[i] / contextWindow.length;
        }
    });

    // cosine similarity between current and mean
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < dim; i++) {
        dot  += embedding[i] * mean[i];
        magA += embedding[i] * embedding[i];
        magB += mean[i]      * mean[i];
    }

    const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);

    // shift = how DIFFERENT from recent context
    return Math.max(0, (1 - cos) / 2);
}



// ======================================
// UPDATE CONTEXT WINDOW
// ======================================

function updateContextWindow(embedding) {

    if (!embedding) return;

    contextWindow.push([...embedding]);

    if (contextWindow.length > CONTEXT_WINDOW) {
        contextWindow.shift();
    }
}



// ======================================
// RECORD NODE INTO CURRENT EPISODE
// main entry point — call on every visit
//
// Returns true if a context shift was
// detected and a new episode was started
// ======================================

export function episodeRecordNode(neuronId, label, embedding) {

    const now = Date.now();

    // ── Add to working memory ────────────────
    wmAddNode(neuronId, label, embedding);

    // ── Context shift detection ───────────────
    const shiftScore = detectContextShift(embedding);
    updateContextWindow(embedding);

    const cooldownOk =
        now - lastContextShiftTime > CONTEXT_SHIFT_COOLDOWN;

    const shiftDetected =
        shiftScore > 0.35 &&           // meaningful semantic jump
        currentEpisode.nodes.length >= 2 && // at least 2 nodes in episode
        cooldownOk;

    if (shiftDetected) {

        // seal current episode and start new one
        sealCurrentEpisode("context_shift");

        lastContextShiftTime = now;

        // signal that a boundary was crossed
        _episodeBoundaryJustCrossed = true;

        console.log(
            "🔀 Context shift detected (score:",
            shiftScore.toFixed(3) + ")",
            "→ new episode started"
        );

    } else {

        _episodeBoundaryJustCrossed = false;
    }

    // ── Add node to current episode ───────────
    currentEpisode.nodes.push(neuronId);
    currentEpisode.labels.push(label);

    return shiftDetected;
}



// ======================================
// SEAL CURRENT EPISODE
// closes it, stores in vault,
// starts fresh episode
// ======================================

export function sealCurrentEpisode(reason = "manual") {

    if (currentEpisode.nodes.length < 2) {

        // too short — discard and reset
        currentEpisode = {
            id:        generateEpisodeId(),
            nodes:     [],
            labels:    [],
            startTime: Date.now(),
            contextTag: null,
            reward:    0,
            sealed:    false
        };

        return null;
    }

    // finalize
    currentEpisode.sealed    = true;
    currentEpisode.endTime   = Date.now();
    currentEpisode.duration  = currentEpisode.endTime - currentEpisode.startTime;
    currentEpisode.sealReason = reason;
    currentEpisode.contextTag = inferContextTag(currentEpisode.labels);

    const sealed = { ...currentEpisode };

    // store in vault
    episodeVault.push(sealed);

    if (episodeVault.length > VAULT_MAX) {
        episodeVault.shift();
    }

    console.log(
        "📦 Episode sealed [" + reason + "]:",
        sealed.labels.join(" → "),
        "| tag:", sealed.contextTag
    );

    // ──────────────────────────────────────
    // BRIDGE TO episodeManager
    // ──────────────────────────────────────
    // episodeVault is for working-memory
    // context and HUD display. But replay,
    // schema abstraction, and trust all read
    // episodeManager.episodicStore — a
    // separate store that never saw these
    // episodes. Bridge the gap: route every
    // sealed vault episode into episodeManager
    // so the whole system shares one truth.
    //
    // We call the injected bridge function
    // rather than importing episodeManager
    // directly (avoids circular dependency).
    // ──────────────────────────────────────
    if (_bridgeToEpisodeManager) {
        _bridgeToEpisodeManager(sealed);
    }

    // start fresh episode
    currentEpisode = {
        id:        generateEpisodeId(),
        nodes:     [],
        labels:    [],
        startTime: Date.now(),
        contextTag: null,
        reward:    0,
        sealed:    false
    };

    return sealed;
}



// ======================================
// INFER CONTEXT TAG
// assigns a semantic cluster label
// to an episode based on its content
// ======================================

// ======================================
// INJECT conceptRelations FROM main.js
// ──────────────────────────────────────
// Set once after module loads so
// inferContextTag is data-driven, not
// hardcoded to the current 14-node set.
// A companion must work with ANY nodes.
// ======================================

let _conceptRelations = null;

export function setConceptRelations(cr) {
    _conceptRelations = cr;
}


function inferContextTag(labels) {

    // ──────────────────────────────────────
    // Data-driven context tagging
    // ──────────────────────────────────────
    // Build clusters from conceptRelations:
    // each label scores into the cluster of
    // the concept that relates to it most.
    //
    // If conceptRelations is not injected,
    // fall back to the raw label set as the
    // context tag (the unique sorted labels
    // joined — always meaningful, never wrong).
    //
    // This works for ANY neuron vocabulary,
    // not just the current 14-node set.
    // ──────────────────────────────────────

    if (!_conceptRelations) {
        // graceful fallback: use the unique labels sorted
        const unique = [...new Set(labels)].sort();
        return unique.slice(0, 3).join("+") || "unknown";
    }

    // count how many labels appear as VALUES in each key's relation list
    const clusterScores = {};

    Object.entries(_conceptRelations).forEach(([key, related]) => {
        let score = 0;
        labels.forEach(l => {
            if (l === key || related.includes(l)) score++;
        });
        if (score > 0) clusterScores[key] = score;
    });

    if (Object.keys(clusterScores).length === 0) {
        return labels[0] || "unknown";
    }

    // dominant concept = highest-scoring key
    const dominant = Object.entries(clusterScores)
        .sort((a, b) => b[1] - a[1])[0][0];

    return dominant;
}



// ======================================
// CHECK LEARNING GATE
// returns true if learning should proceed
// returns false if this is a cross-episode
// boundary transition that should be blocked
// ======================================

export function isLearningGated() {

    return _episodeBoundaryJustCrossed;
}



// ======================================
// REWARD CURRENT EPISODE
// called when goal is reached
// ======================================

export function rewardCurrentEpisode(amount) {

    currentEpisode.reward += amount;
}



// ======================================
// GET EPISODE PATH FOR REPLAY
// returns array of label strings
// compatible with existing replay system
// ======================================

export function getEpisodeVaultForReplay() {

    return episodeVault
        .filter(ep => ep.reward > 0 || ep.nodes.length >= 3)
        .map(ep => ({
            path:  ep.labels,
            score: ep.reward + ep.nodes.length,
        }));
}



// ======================================
// GET CURRENT EPISODE STATE
// for HUD display
// ======================================

export function getCurrentEpisodeState() {

    return {
        id:         currentEpisode.id,
        nodeCount:  currentEpisode.nodes.length,
        labels:     currentEpisode.labels,
        contextTag: currentEpisode.contextTag,
        reward:     currentEpisode.reward,
        vaultSize:  episodeVault.length,
        wmSnapshot: wmGetSnapshot()
    };
}



// ======================================
// RESET MANUAL SESSION
// call when switching training topics
// seals current episode cleanly
// ======================================

export function resetManualSession(reason = "topic_switch") {

    const sealed = sealCurrentEpisode(reason);

    // clear working memory
    workingMemory.clear();

    // clear context window
    contextWindow.length = 0;

    // reset boundary flag
    _episodeBoundaryJustCrossed = false;

    console.log(
        "🔄 Manual session reset —",
        reason,
        "| vault size:", episodeVault.length
    );

    return sealed;
}



// ======================================
// GET EPISODES BY CONTEXT TAG
// for context-aware replay
// ======================================

export function getEpisodesByTag(tag) {

    return episodeVault.filter(ep => ep.contextTag === tag);
}



// ======================================
// GET VAULT SIZE
// ======================================

export function getVaultSize() {

    return episodeVault.length;
}
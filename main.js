// ======================================
// IMPORT EMBEDDING SYSTEM
// ======================================

import {

    createEmbedding,
    trainEmbedding,
    similarity,
    setEmbeddingNeuronMap

} from "./render/embeddings.js";


import {

    getLocalEmotion,
    updateLocalEmotion

} from "./render/emotionMap.js";


// ======================================
// IMPORT Q LEARNING
// ======================================

import {

    Q,
    getQ,
    setQ,
    updateQ,
    dampQ

} from "./render/qlearning.js";


// ======================================
// IMPORT KNOWLEDGE SYSTEM
// ======================================

import {

    conceptRelations

} from "./render/knowledge.js";

// ======================================
// IMPORT SCENE SYSTEM
// ======================================

import {

  scene,
  camera,
  renderer,
  group

} from "./render/scene.js";

// import reasoning UI
import {

  reasoningBox

} from "./render/ui.js";

// ======================================
// IMPORT HELPERS
// ======================================

import {

    normalize,
    dot

} from "./render/helpers.js";


// ======================================
// IMPORT RENDER SYSTEM
// ======================================

import {

    animate,
    setStars

} from "./render/render.js";


// ======================================
// IMPORT SEARCH HELPERS
// ======================================

import {

    setNeuronMap,
    findNeuronById

} from "./render/search.js";


// ======================================
// IMPORT STAR SYSTEM
// ======================================

import {

    createStars

} from "./render/stars.js";


// ======================================
// IMPORT CONNECTION SYSTEM
// ======================================

import {

    connectPoints,
    setConnectionNeuronMap

} from "./render/connections.js";


// ======================================
// IMPORT MEMORY SYSTEM
// ======================================

import {

    transitions,
    rewards,
    penalties,
    confidenceMap,
    signals,
    thoughtTrail,
    curiosityMap,

} from "./render/memory.js";


// ======================================
// IMPORT FUTURE PLANNING SYSTEM
// ======================================

import {

    lookAheadScore,
    futureScore

} from "./render/planning.js";


// ================================================================
// 🧠 UNIFIED EPISODE MANAGER
// ================================================================
// Single episodic substrate for ALL learning flows.
// Replaces: replay.js (setReplayMemory / replayEpisodes),
//           episodicTraining.js (start/append/end/commit),
//           the inline episodes[] array + setReplayMemory call.
//
// Every experience — manual, autonomous, replay, imagination —
// enters as an episodic object and flows through one pipeline.
// ================================================================

import {

    initEpisodeManager,
    recordManualClick,
    recordAutonomousSuccess,
    recordAutonomousStep,
    replayOneEpisode,
    getEpisodesForBuildMap,
    getAllEpisodes,
    getEpisodeStats,
    clearAllEpisodes,
    exportEpisodes,
    loadEpisodes,

} from "./render/episodeManager.js";



// import decision scoring system
import {

    calculateDecisionScore

} from "./render/scoring.js";



// episodic.js (buildEpisodeMap) import removed:
// buildEpisodeMap() was replaced by the unified episodeManager
// pipeline in an earlier refactor. The import remained as dead code.
// episodic.js is still present but no longer needed by main.js.


// import semantic relationship system
import {

    buildSemanticMap

} from "./render/semantic.js";


// ======================================
// 🧠 LIVE BRAIN HUD
// ======================================

import {

    createHUD,
    updateHUD

} from "./render/hud.js";


// import candidate analysis system
import {

    analyzeCandidate

} from "./render/candidateAnalysis.js";


// ======================================
// IMPORT BEHAVIOR DYNAMICS
// ======================================

import {

    curiosityState,
    confidenceState,
    stressState,
    fatigueState,
    changeFatigue,
    changeStress,
    focusState,
    explorationMode,
    regulateBiology,
    updateBehavior,

    loopStressState,      
    exhaustionState,

    applyPredictionErrorToBehavior

} from "./render/behavior.js";


// momentum sequence memory
import {

    learnMomentum,
    getMomentumBonus,
    momentumMemory

} from "./render/momentumMemory.js";


// ======================================
// 🧠 PREDICTION ERROR SYSTEM
// ──────────────────────────────────────
// Structural predictive-processing layer.
// Generates expectations before action,
// evaluates outcomes after action, and
// exposes prediction error as a first-class
// cognitive signal across all systems.
// ======================================

import {

    generateExpectation,
    evaluatePredictionError,
    resetExpectation,
    getRollingError,
    uncertaintyState as predUncertaintyState,

    // ── NEW: Multi-level prediction cognition ──
    updateTransitionUncertainty,
    getTransitionUncertainty,
    updateSequenceError,
    getSequenceError,
    recordSemanticExpectationOutcome,
    getSemanticExpectationConfidence,
    decayTransitionUncertainties

} from "./render/predictionError.js";


// ======================================
// 🧠 EPISTEMIC UNCERTAINTY LEDGER
// ──────────────────────────────────────
// True confidence/uncertainty/volatility
// tracking for every transition and semantic pair.
// The fundamental anti-overconfidence layer.
// ======================================

import {

    updateProceduralUncertainty,
    getProceduralUncertainty,
    updateSemanticUncertainty,
    propagateUncertainty,
    decayUncertaintyLedger,
    getCombinedUncertainty,
    registerOllamaPair,
    getLedgerSummary

} from "./render/uncertaintyLedger.js";


// ======================================
// 🧠 SEMANTIC REFRACTORY SYSTEM
// ──────────────────────────────────────
// Anti-perseveration dynamics.
// Records actual traversals to inhibit
// dominant attractor loops over time.
// Novel paths maintain full semantic strength.
// ======================================

import {

    recordSemanticActivation,
    decaySemanticActivations

} from "./render/semanticActivation.js";


// ======================================
// 🧠 SEMANTIC PROVENANCE SYSTEM
// ──────────────────────────────────────
// Tags all semantic writes with source.
// Prevents replay/imagination from having
// same authority as direct experience.
// ======================================

import {

    PROVENANCE,
    writeReward,
    writeTransition,
    shouldTrainEmbedding,
    logActivation,
    getActivationDominance

} from "./render/semanticProvenance.js";


// ======================================
// 🧠 EXECUTIVE COGNITION SYSTEM IMPORTS
// ======================================

import {
    updateMotivationalState,
    computeExecutiveWeights,
    recordOutcome,
    getMotivationalSnapshot,
} from "./render/motivationalState.js";

import {
    getSemanticSignal,
    activateSemanticVitality,
    reinforceSemanticStrength,
    reinforceEpisodeSemantics,
    penalizeSemanticPath,
    decaySemanticSystems,
} from "./render/semanticVitality.js";

import {
    getUncertaintyScore,
    updateUncertainty,
    decayUncertainty,
} from "./render/uncertaintyEngine.js";

import {
    explainArbitration,
    arbitrate,
} from "./render/executiveController.js";

import {
    lastArbitrationBreakdown,
} from "./render/scoring.js";


// ======================================
// 🔮 IMPORT FUTURE IMAGINATION VALUE
// ======================================

import {

    liveFutureBonus

} from "./render/scoring.js";


import {
    setActivation,
    boostActivation,
    decayActivations,
    getCompetitionScore,
    getActivation,
    getTopActiveNeurons,
    isContextEligible,
} from "./render/activationCompetition.js";

import {
    recordSemanticEdge,
    getNoiseSuppressedScore,
    getSemanticEdgeStrength,
    isNoiseEdge,
    decaySemanticMemory,
    getSemanticSummary,
} from "./render/semanticMemoryLayer.js";

import {
    reinforcePath,
    weakenPath,
    runConsolidationPass,
    getConsolidationScore,
    isStableMemory,
    decayConsolidation,
    getConsolidationSummary,
} from "./render/longTermConsolidation.js";

import {
    updateAttentionFocus,
    setGoalAttention,
    getAttentionScore,
    applyAttentionAmplification,
    strengthenAttention,
    weakenAttention,
    resetAttentionFocus,
    getAttentionSnapshot,
} from "./render/cognitiveAttention.js";

import {
    episodeRecordNode,
    sealCurrentEpisode,
    isLearningGated,
    rewardCurrentEpisode,
    getEpisodeVaultForReplay,
    getCurrentEpisodeState,
    resetManualSession,
    wmDecay,
    wmGetSnapshot,
    setConceptRelations,
    setEpisodeManagerBridge,
} from "./render/episodicContextEngine.js";


// ======================================
// 🧠 BAYESIAN TRUST MEMORY SYSTEM
// ──────────────────────────────────────
// Separates CAN DO (Q/transitions)
// from SHOULD TRUST (verified success rate)
// Manual teaching does NOT write here.
// Only autonomous validated success writes.
// ======================================

import {

    pathSuccesses,
    pathAttempts,
    recordAttempt,
    recordSuccess,
    getPathTrust,
    getTrustUncertainty,
    decayTrust,
    getTrustSnapshot,

} from "./render/trustMemory.js";


// ================================================================
// 🧩 SCHEMA MEMORY — HIERARCHICAL ABSTRACTION
// ================================================================
// Pure recognition layer. Reads episodicStore, writes nothing.
// Provides schemaBonus to scoring when a candidate matches a
// known abstract pattern (e.g. predator → hunt → prey → eat).
// ================================================================

import {

    initSchemaMemory,
    rebuildSchemas,
    getSchemaBonus,
    getSchemas,

} from "./render/schemaMemory.js";


// create background stars
const stars = createStars();

// give stars to renderer animation
setStars(stars);




// ================== DATA STORAGE ==================

const neuronPositions = [];   // stores positions
const neuronMap = new Map(); // stores neurons by id

// give neuron map to search system
setNeuronMap(neuronMap);

// Embedding system can access all neurons
setEmbeddingNeuronMap(neuronMap);

// give neuron database to connection system
setConnectionNeuronMap(neuronMap);





fetch('neurons.json')
.then(res => res.json())
.then(data => {
  
  data.forEach(n => {
    
    // Create position vector
    const SCALE = 1.0; // or 10 if you want bigger
    
    const pos = new THREE.Vector3(
    n.x * SCALE,
    n.y * SCALE,
    n.z * SCALE
  );
  
  neuronPositions.push(pos);
  
  // Create small sphere (neuron)
  const neuron = new THREE.Mesh(
  new THREE.SphereGeometry(0.10, 13, 13),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);

// Set position
neuron.position.copy(pos);

// Store custom data
neuron.userData = {
  isNeuron: true,
  id: n.id,
  label: n.label,
  type: n.type,
  neighbors: [],   // important for graph brain
  embedding: createEmbedding()
};

// Save in map
neuronMap.set(n.id, neuron);

// Add to scene
group.add(neuron);
});

console.log("✅ Neurons loaded");

// 🧠 INITIAL MEANING TRAINING
neuronMap.forEach((n1) => {
  const label1 = n1.userData.label;
  
  const related = conceptRelations[label1] || [];
  
  neuronMap.forEach((n2) => {
    const label2 = n2.userData.label;
    
    if (related.includes(label2)) {
      trainEmbedding(n1.userData.id, n2.userData.id);
    }
  });
});

// Now load connections
return fetch('connections.json');
})
.then(res => res.json())
.then(data => {
  
  data.forEach(c => {
    
    const n1 = findNeuronById(c.from);
    const n2 = findNeuronById(c.to);
    
    if (!n1 || !n2) return;
    
    // Connect neurons
    connectPoints(n1.position, n2.position, 0x4444ff, c.from, c.to);
  });
  
  console.log("✅ Connections loaded");

  // ── initialise unified episode manager ────────────────────────
  // All memory-system references are now resolved (neuronMap
  // populated, all imports available), so the manager can be
  // safely wired to them.
  _initEpisodeManagerWhenReady();

});




// ================== 🧠 DECISION MEMORY ==================

// this will store last decision (what AI chose and other options)
let lastDecision = null;   // empty at start


// ================== 🧠 SAVE / LOAD BRAIN ==================
//
// A cognitive companion must remember across sessions.
// Previously only 6 maps were saved — and crucially the
// Q-table (the core learned intelligence) and the episodic
// memory were NOT persisted. Every reload wiped the brain's
// actual cognition. Now the full learned state is saved:
//
//   transitions  — procedural pathways
//   rewards      — value memory
//   penalties    — avoidance memory
//   signals      — path importance
//   curiosity    — exploration history
//   Q            — Q-learning table (CORE intelligence)
//   confidence   — per-path trust
//   episodes     — episodic memory (lived experiences)
//
// chainMemory was removed: it is dead (nothing writes to it
// since the episodic unification — chainReward is hardcoded 0).
// ==========================================================

function saveBrain() {
  
  // 🧠 convert nested Maps properly
  function mapToObj(map) {
    const obj = {};
    map.forEach((v, k) => {
      obj[k] = v instanceof Map ? mapToObj(v) : v;
    });
    return obj;
  }
  
  const data = {
    transitions: mapToObj(transitions),
    rewards:     mapToObj(rewards),
    penalties:   mapToObj(penalties),
    signals:     mapToObj(signals),
    curiosity:   mapToObj(curiosityMap),

    // CORE learned intelligence — was missing before
    Q:           mapToObj(Q),
    confidence:  mapToObj(confidenceMap),

    // Episodic memory — the companion's lived experiences
    episodes:    exportEpisodes(),

    // Companion identity: where "home" is, what it's pursuing
    homeNeuronId: window.homeNeuronId ?? null,
    goalNeuronId: goalNeuronId ?? null,
  };
  
  try {
    localStorage.setItem("brain", JSON.stringify(data));
    console.log(
        "🧠 Brain saved —",
        Q.size, "Q-values,",
        getAllEpisodes().length, "episodes"
    );
  } catch (e) {
    // localStorage can throw QuotaExceededError on large brains
    console.warn("🧠 Brain save failed:", e.message);
  }
}


// Load everything back (storage → memory)
function loadBrain() {
  
  const raw = localStorage.getItem("brain");
  
  if (!raw) {
    console.log("🧠 No saved brain — starting fresh");
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.warn("🧠 Saved brain corrupt — starting fresh");
    return;
  }
  
  // Restore a flat string-keyed map (rewards, Q, penalties...)
  // These use keys like "6->9" — they must NOT be Number()'d.
  function restoreStringMap(targetMap, obj) {
    targetMap.clear();
    Object.entries(obj || {}).forEach(([k, v]) => {
      targetMap.set(k, v);
    });
  }

  // Restore a nested numeric-keyed map (transitions only).
  // transitions is Map<numberId, Map<numberId, strength>>.
  function restoreNestedNumericMap(targetMap, obj) {
    targetMap.clear();
    Object.entries(obj || {}).forEach(([k, v]) => {
      const inner = new Map();
      Object.entries(v || {}).forEach(([ik, iv]) => {
        inner.set(Number(ik), iv);
      });
      targetMap.set(Number(k), inner);
    });
  }

  // ── procedural pathways (nested numeric) ──
  restoreNestedNumericMap(transitions, data.transitions);

  // ── value / avoidance / signal / curiosity (string keys) ──
  restoreStringMap(rewards,      data.rewards);
  restoreStringMap(penalties,    data.penalties);
  restoreStringMap(signals,      data.signals);
  restoreStringMap(curiosityMap, data.curiosity);

  // ── CORE intelligence: Q-table (string keys "from->to") ──
  restoreStringMap(Q,            data.Q);

  // ── per-path trust ──
  restoreStringMap(confidenceMap, data.confidence);

  // ── episodic memory (lived experiences) ──
  if (data.episodes) {
    loadEpisodes(data.episodes);
    // adjacency memory is derived from episodes — rebuild it
    rebuildAdjacencyMemory();
  }

  // ── companion identity: home + current goal ──
  if (data.homeNeuronId !== undefined && data.homeNeuronId !== null) {
    window.homeNeuronId = data.homeNeuronId;
  }
  if (data.goalNeuronId !== undefined && data.goalNeuronId !== null) {
    goalNeuronId = data.goalNeuronId;
  }

  console.log(
      "🧠 Brain loaded —",
      Q.size, "Q-values,",
      getAllEpisodes().length, "episodes restored"
  );
}


let currentGoal = null;  // what brain wants right now
// sequence memory (pattern -> next)
const chainMemory = new Map();

// ================================================================
// 🧠 EPISODE MANAGER — INITIALISATION
// ================================================================
// Pass all memory-system references into the unified episode
// manager so it can update each system from a single pipeline.
// This replaces: const episodes=[] and setReplayMemory({...}).
// ================================================================

// Deferred — called after neurons.json and connections.json load,
// because findNeuronById needs the neuronMap to be populated.
function _initEpisodeManagerWhenReady() {

    initEpisodeManager({

        // ── Memory systems ──────────────────────────────────────
        transitions,
        rewards,
        confidenceMap,

        // ── Q-learning ──────────────────────────────────────────
        updateQ,

        // ── Reward provenance ───────────────────────────────────
        PROVENANCE,
        writeReward,
        logActivation,

        // ── Embeddings ──────────────────────────────────────────
        trainEmbedding,

        // ── Semantic vitality ───────────────────────────────────
        reinforceEpisodeSemantics,
        reinforceSemanticStrength,

        // ── Bayesian trust (autonomous-only writes) ─────────────
        recordSuccess,

        // ── Long-term consolidation ──────────────────────────────
        reinforcePath,

        // ── Neuron lookup ───────────────────────────────────────
        findNeuronById,

        // ── Momentum ────────────────────────────────────────────
        learnMomentum,

        // ── Schema abstraction ───────────────────────────────────
        // Injected so episodeManager can trigger schema rebuilds
        // from _maybeConsolidate without a static import of
        // schemaMemory.js (avoids circular dependency).
        rebuildSchemas,

    });

    console.log("🧠 EpisodeManager wired into all memory systems");

    // Schema memory shares the same system refs
    initSchemaMemory({ findNeuronById });
    console.log("🧩 SchemaMemory initialised");

    // ── episodicContextEngine bridges ─────────────────────────────
    // 1. Give context engine the concept relations so inferContextTag
    //    is data-driven instead of hardcoded to the 14-node set.
    setConceptRelations(conceptRelations);

    // 2. Bridge the episodeVault to episodeManager so every sealed
    //    episode from working-memory context detection also enters
    //    the unified episodicStore (read by replay, schema, trust).
    //    Use recordAutonomousSuccess as the bridge — it validates,
    //    pipelines, and stores the episode correctly.
    setEpisodeManagerBridge((sealedEp) => {
        if (!sealedEp || !sealedEp.nodes || sealedEp.nodes.length < 2) return;
        // Convert vault episode format to episodeManager format
        recordAutonomousSuccess(
            sealedEp.nodes.slice(0, -1),   // recentMemory = all but last node
            sealedEp.nodes.at(-1),          // goalId = terminal node
            neuronMap,
            { confidenceState, stressState, fatigueState, curiosityState }
        );
    });

    console.log("🔗 EpisodeManager ↔ EpisodicContextEngine bridged");

};

const attentionMap = new Map();   // create attention memmory ( focus strength)

// ======================================
// 🧠 EPISODIC ADJACENCY MEMORY
// ──────────────────────────────────────
// Counts how many times each A→B appeared
// as consecutive steps in a sealed episode.
// Human analogy: memory of steps that
// actually happened together in experience.
// lion→hunt: high (trained many times)
// dog→eat:   0  (never episodically seen)
// ======================================
const adjacencyMemory = new Map();

function rebuildAdjacencyMemory() {
    adjacencyMemory.clear();
    getAllEpisodes().forEach(ep => {
        for (let i = 0; i < ep.nodes.length - 1; i++) {
            const key = ep.nodes[i] + "->" + ep.nodes[i + 1];
            adjacencyMemory.set(key, (adjacencyMemory.get(key) || 0) + 1);
        }
    });
}

// Returns 0.0 (never episodically seen) to 1.0 (seen in 5+ episodes)
function trajectoryConfidence(fromId, toId) {
    const count = adjacencyMemory.get(fromId + "->" + toId) || 0;
    return Math.min(count / 5, 1.0);
}

// ======================================
// 🧠 TRAJECTORY INTEGRITY
// ──────────────────────────────────────
// Checks how well "nextId" continues the
// current path inside a known episode.
//
// Scans all episodes for ones where the
// current path (recentPath + fromId) is a
// matching prefix. If found, score by how
// long the match is.
//
// score = 0: this next step never followed
//            this context in any episode
// score = 1: this exact sequence context
//            is seen in 5+ episodes
//
// Human analogy: not just "did I see A→B?"
// but "did I see A→B RIGHT AFTER I was
// doing exactly what I'm doing now?"
// ======================================
function computeTrajectoryIntegrity(recentPath, fromId, toId) {

    const allEps = getAllEpisodes();
    if (allEps.length === 0) return 0;

    fromId = Number(fromId);
    toId   = Number(toId);

    // Build the context window: last 2 steps + from
    const context = [
        ...recentPath.slice(-2).map(Number),
        fromId
    ];

    let matchingEpisodes = 0;

    allEps.forEach(ep => {

        const nodes = ep.nodes;

        // Find fromId in this episode
        for (let i = 0; i < nodes.length - 1; i++) {

            if (nodes[i] !== fromId) continue;
            if (nodes[i + 1] !== toId) continue;

            // fromId→toId exists. Now check context match.
            // How many of the context steps match backwards?
            let contextMatch = 1; // the pair itself counts as 1
            for (let c = 1; c < context.length && c <= i; c++) {
                if (nodes[i - c] === context[context.length - 1 - c]) {
                    contextMatch++;
                } else {
                    break;
                }
            }

            // Full context match (3 steps) = strong evidence
            // Pair only (1 step) = weak evidence
            const matchStrength = contextMatch / Math.max(context.length, 1);
            if (matchStrength >= 0.33) {
                matchingEpisodes++;
            }
            break; // one match per episode is enough
        }
    });

    return Math.min(matchingEpisodes / 5, 1.0);
}

// stores last time each path was used
const timeMemory = new Map();
// Target goal (brain wants to reach this)
let goalNeuronId = null;


loadBrain(); // restores saved memory when page starts

// Rebuild adjacency memory immediately from restored episodes.
// Without this, rebuildAdjacencyMemory() only runs in the periodic
// decay block (~10% chance per loop) — meaning tc=0.00 for the first
// minute of training after a page reload. Every goal-reach showed
// tc=0.00 even though episodes were restored from localStorage.
rebuildAdjacencyMemory();

setInterval(saveBrain, 5000);   // save brain every 5 seconds automatically


// 🧠 REACHABILITY CHECK (true reasoning)
// This function checks: "Can this node reach the goal in few steps?"
function canReachGoal(startId, goalId, maxDepth = 4) {
  
  // If no goal → allow everything
  if (!goalId) return true;
  
  const visited = new Set(); // remember visited nodes
  
  // DFS = explore neighbors step by step
  function dfs(currentId, depth) {
    
    // stop if depth finished
    if (depth === 0) return false;
    
    // 🎯 reached goal → success
    if (currentId === goalId) return true;
    
    visited.add(currentId);
    
    const neuron = findNeuronById(currentId);
    if (!neuron) return false;
    
    // check all neighbors
    for (let nextId of neuron.userData.neighbors) {
      
      // skip already visited (avoid loop)
      if (visited.has(nextId)) continue;
      
      // if ANY path reaches goal → true
      if (dfs(nextId, depth - 1)) return true;
    }
    
    return false; // no path found
  }
  
  return dfs(startId, maxDepth);
}



// ======================================
// 🧠 GOAL DISTANCE (BFS SHORTEST PATH)
// ──────────────────────────────────────
// Returns the number of hops from a node
// to the goal along the neuron graph.
//
// This is the GRADIENT the agent climbs.
// Without it, the goal has no pull and the
// agent farms whatever local loop it lands in.
//
//  0  = this node IS the goal
//  1  = one hop away
//  N  = N hops away
// -1  = goal unreachable
//
// Manual-trained transitions also count as
// edges (via trainedNeighbors), so a taught
// path like hunt→meat works even when those
// nodes share no physical graph edge.
// ======================================

function goalDistance(startId, goalId, maxDepth = 8) {

    if (goalId == null) return -1;

    startId = Number(startId);
    goalId  = Number(goalId);

    if (startId === goalId) return 0;

    const visited = new Set([startId]);

    // BFS frontier: [nodeId, depth]
    let frontier = [[startId, 0]];

    while (frontier.length > 0) {

        const next = [];

        for (const [nodeId, depth] of frontier) {

            if (depth >= maxDepth) continue;

            const neuron = findNeuronById(nodeId);
            if (!neuron) continue;

            // physical graph neighbors
            const neighbors = new Set(neuron.userData.neighbors);

            // PLUS manually-trained transitions
            // (taught edges extend the graph)
            const tMap = transitions.get(nodeId);
            if (tMap) {
                tMap.forEach((strength, toId) => {
                    // only count meaningfully-trained edges
                    if (strength > 1) neighbors.add(toId);
                });
            }

            for (const nb of neighbors) {

                const nbId = Number(nb);

                if (nbId === goalId) {
                    return depth + 1;
                }

                if (!visited.has(nbId)) {
                    visited.add(nbId);
                    next.push([nbId, depth + 1]);
                }
            }
        }

        frontier = next;
    }

    return -1; // goal unreachable within maxDepth
}



// ======================================
// 🧠 PRUNE GOAL WRAPAROUND
// ──────────────────────────────────────
// A goal is a TERMINUS. A taught path
// ENDS at the goal. So any learned
// transition OUT of the goal node
// (goal → X) is a wraparound artifact
// from the user repeating their training
// sequence (…→eat, then eat→lion→… again).
//
// Such wraparounds turn the taught PATH
// into a closed LOOP — the agent reaches
// the goal and is immediately pulled back
// out. This deletes them deterministically
// the moment a goal is set.
//
// Runs across ALL three systems so the
// loop is cleared everywhere:
//   - transitions   (procedural)
//   - Q-table       (procedural value)
//   - momentum      (sequence memory)
// ======================================

function pruneGoalWraparound(goalId) {

    if (goalId == null) return;

    goalId = Number(goalId);

    let prunedCount = 0;

    // ── 1. TRANSITIONS OUT OF GOAL ──────
    const goalTransitions = transitions.get(goalId);
    if (goalTransitions && goalTransitions.size > 0) {
        prunedCount += goalTransitions.size;
        // wipe every goal → X transition
        goalTransitions.clear();
        transitions.set(goalId, goalTransitions);
    }

    // ── 2. Q-VALUES OUT OF GOAL ─────────
    // any Q key shaped "goalId->X"
    const goalPrefix = goalId + "->";
    Q.forEach((value, key) => {
        if (key.startsWith(goalPrefix)) {
            // collapse the learned value of leaving the goal
            Q.set(key, 0);
        }
    });

    // ── 3. REWARDS OUT OF GOAL ──────────
    rewards.forEach((value, key) => {
        if (typeof key === "string" && key.startsWith(goalPrefix)) {
            rewards.set(key, 0);
        }
    });

    // ── 4. MOMENTUM CONTAMINATED BY GOAL
    // momentum keys are "a->b->c". Any key
    // where the goal is NOT the final node
    // encodes movement THROUGH/OUT of the
    // goal — i.e. a wraparound sequence.
    const goalStr = String(goalId);
    momentumMemory.forEach((value, key) => {
        const parts = key.split("->");
        // goal appears but is not the terminus
        if (parts.includes(goalStr) &&
            parts[parts.length - 1] !== goalStr) {
            momentumMemory.delete(key);
            prunedCount++;
        }
    });

    // ── 5. LONG-TERM CONSOLIDATION ──────
    neuronMap.forEach((n, id) => {
        const candidateKey = goalId + "->" + id;
        try {
            weakenPath(candidateKey, 1.0);
        } catch (e) { /* edge not present */ }
    });

    // ── 6. PENALISE GRAPH-NEIGHBOR EDGES OUT OF GOAL ──
    // eat has graph neighbors food(5) and meat(6).
    // pruneGoalWraparound cleared trained transitions and Q,
    // but graph-neighbor edges still score via goalGradient
    // and semantic bonus, making eat→meat score 3-4 pts.
    // The agent then takes one hop, lands on food/meat, and
    // immediately reaches eat again in one more hop.
    //
    // Set a strong penalty on all outgoing graph edges from
    // the goal so the scoring system avoids choosing them.
    // The reset places the agent on a non-goal node anyway,
    // so this only matters when the agent STARTS at eat —
    // which shouldn't happen but sometimes does.
    const goalNeuron = findNeuronById(goalId);
    if (goalNeuron && goalNeuron.userData.neighbors) {
        goalNeuron.userData.neighbors.forEach(nbId => {
            const exitKey = goalId + "->" + nbId;
            const existing = penalties.get(exitKey) || 0;
            // strong penalty — blocked for ~50 steps of autonomous decay
            penalties.set(exitKey, Math.min(existing + 8, 15));
        });
    }

    console.log(
        "🧹 Goal-terminus prune: removed",
        prunedCount,
        "wraparound links out of goal node",
        findNeuronById(goalId)?.userData.label || goalId
    );
}



// ============================================================
// 🧠 LEARN TRAINING EPISODE
// ============================================================
// The SINGLE authorized path from a sealed episode into
// long-term memory. Nothing else writes procedural /
// semantic / episodic memory from manual training.
//
// DIFFERENTIATED REINFORCEMENT
// ──────────────────────────────────────────────────────────
// The spec demands that one event must NOT reinforce every
// system equally. Each memory system here updates with its
// OWN rate, OWN evidence requirement, and OWN decay class:
//
//   Procedural (transitions, Q)  — strong, immediate.
//                                   Teaching = "you CAN do this."
//   Episodic   (episodicStore)   — exact sequence stored once.
//   Semantic   (embeddings)      — weak nudge, slow abstraction.
//   Trust      (Bayesian)        — UNTOUCHED. Trust is earned
//                                   only by autonomous success.
//   Consolidation                — NOT done here. Consolidation
//                                   runs later on recurring
//                                   motifs across many episodes.
//
// Because transitions are extracted strictly from inside the
// episode buffer, the wraparound can never enter any system.
// ============================================================

function runPrediction(startKey) {
  
  // Bug 7 fix: always read from window.recentMemory so it's never undefined
  const recentMemory = window.recentMemory || [];

  let currentKey = startKey;

  // permanent semantic safe home mode
  const homeNode = "home"; // change to true to always return home



  // ======================================
  // 🧠 safe memory size
  // if recentMemory exists use it
  // otherwise use thoughtTrail
  // ======================================

  const memorySize =

  typeof recentMemory !== "undefined"

  ? recentMemory.length

  : thoughtTrail.length;

  // ======================================
  // 🧠 stores all imagined future branches
  // ======================================

  const thoughtTree = [];
  
  // ======================================
  // 🧠 ADAPTIVE THINKING DEPTH
  // real brains reduce cognition under load
  // ======================================

  // base thinking depth
  let dynamicDepth = agentRunning ? 4 : 1; // 4 when running, 1 for single step


  // ======================================
  // FATIGUE REDUCES THINKING
  // tired brains simplify decisions
  // ======================================

  if (fatigueState > 40) {

      dynamicDepth -= 1;
  }

  if (fatigueState > 65) {

      dynamicDepth -= 1;
  }

  if (fatigueState > 80) {

      dynamicDepth -= 1;
  }


  // ======================================
  // HIGH CONFIDENCE USES HABITS
  // less future simulation needed
  // ======================================

  if (confidenceState > 60) {

      dynamicDepth -= 1;
  }


  // ======================================
  // UNCERTAINTY INCREASES THINKING
  // confused brains simulate more futures
  // ======================================

  if (

      confidenceState < 20 &&

      curiosityState > 1

  ) {

      dynamicDepth += 2;
  }


  // ======================================
  // SAFE LIMITS
  // ======================================

  const STEPS = Math.max(

      2,

      Math.min(dynamicDepth, 6)

  );
  
  for (let step = 0; step < STEPS; step++) {
    // Define starNeuron
    const startNeuron = findNeuronById(currentKey);
    if (!startNeuron) return;
    
    const memoryMap = transitions.get(currentKey) || new Map();
    // get last 2 clicks pattern
    const recentPattern = thoughtTrail.slice(-2).join("->");
    // get learned next predictions
    const chainMap = chainMemory.get(recentPattern) || new Map();
    
    // NOTE: buildEpisodeMap was removed here.
    // The episodicStore is now read directly via
    // getSchemaBonus() in the candidate scoring loop,
    // eliminating a redundant per-step Map rebuild.

    const structureMap = new Map();
    startNeuron.userData.neighbors.forEach(id => {
      structureMap.set(id, 1);
    });
    
    // ======================================
    // 🧠 BUILD SEMANTIC RELATIONSHIPS
    // ──────────────────────────────────────
    // Only built when no goal is active.
    // When goalNeuronId is set, the forEach
    // block (Fix 2) immediately returns —
    // meaning the full O(N) embedding map
    // was being built then thrown away on
    // every step of the STEPS loop (4× per
    // prediction call).
    //
    // Guard here: if we have a goal, skip
    // the entire build. An empty Map means
    // the forEach loop runs 0 iterations
    // instead of 14, at zero cost.
    //
    // Result: semantic exploration still
    // works when no goal is set. During all
    // goal-directed training: zero wasted
    // similarity computations.
    // ======================================

    const embeddingMap = (goalNeuronId !== null)
        ? new Map()      // goal active → skip semantic build entirely
        : buildSemanticMap({
            neuronMap,
            currentKey,
            startNeuron
        });
  
  
  
  if (!startNeuron) return;
  
  // Get neighbors (graph brain)
  startNeuron.userData.neighbors.forEach(id => {
    structureMap.set(id, 1);
  });


  // ======================================
  // 🧠 COMPUTE EXECUTIVE WEIGHTS
  // motivational state → dynamic weights
  // computed once per prediction step
  // all candidates evaluated with same weights
  // ======================================

  updateMotivationalState({
      confidenceState,
      stressState,
      fatigueState,
      curiosityState,
      loopStressState,
      exhaustionState,
  });

  const executiveWeights = computeExecutiveWeights();

  const motivationalSnapshot = getMotivationalSnapshot();

  
  // ======================================
  // 🧠 UNIFIED CANDIDATE POOL
  // merges trained memory + graph neighbors
  // fixes: agent frozen on untrained nodes
  // ======================================

  const allCandidates = new Map();

  memoryMap.forEach((value, k) => {
      allCandidates.set(k, value);
  });

  startNeuron.userData.neighbors.forEach(id => {
      if (!allCandidates.has(id)) {
          allCandidates.set(id, 0);
      }
  });

  const choices = [];

  allCandidates.forEach((value, k) => {
    
    // Block very bad paths
    if (penalties.get(currentKey + "->" + k) > 10) {
      return;
    }

    // ======================================
    // 🧠 BLOCK DEEPLY NEGATIVE Q PATHS
    // Q < -0.5 means this path has been
    // repeatedly bad — don't consider it
    // ======================================
    const candidateQ = getQ(currentKey, k);
    if (candidateQ < -0.5) {
      return;
    }

    // ======================================
    // 🧠 GRAPH INTEGRITY GUARD
    // ──────────────────────────────────────
    // A candidate is admitted if it is:
    //   1. An actual graph neighbor (wired connection), OR
    //   2. Appears in the trained transitions map with
    //      meaningful strength (the agent has been taught
    //      this path via episode learning), OR
    //   3. Has reward > 4 from manual training
    //
    // FIX: the old threshold of 12 was ABOVE the hard reward
    // cap of 10, so manually-trained non-graph paths like
    // hunt→meat could NEVER qualify — the agent was always
    // stuck on graph-only neighbors (hunt↔lion loop).
    //
    // New: transitions strength > 5 is the primary signal.
    // It is written by episodeManager at +20*gain per pass,
    // so a single manual teaching pass produces strength 18,
    // which immediately qualifies. Shortcut contamination
    // from auto-training (which writes tiny explore steps)
    // is blocked because recordAutonomousStep writes only
    // +20*0.30 = 6 and only for adjacent graph steps.
    // ======================================
    const isGraphNeighbor   = structureMap.has(k);
    const trainedStrength   = (transitions.get(currentKey)?.get(k) || 0);
    const isEpisodeTrained  = trainedStrength > 5;

    // ======================================
    // 🧠 EPISODIC TRAJECTORY GATE — Fix 6+7
    // ──────────────────────────────────────
    // For non-graph shortcuts to the goal,
    // require BOTH reward threshold AND
    // episodic adjacency evidence.
    //
    // reward > 4 alone is not enough — after
    // 2 accidental goal reaches any node
    // accumulates reward=6 and gets admitted
    // forever, creating the shortcut collapse.
    //
    // Now: shortcut candidates (non-graph)
    // also need to have appeared at least ONCE
    // as consecutive steps in a real episode.
    // ======================================
    const rewardStrength    = rewards.get(currentKey + "->" + k) || 0;
    const hasEpisodicWitness = (adjacencyMemory.get(currentKey + "->" + k) || 0) > 0;

    // Non-graph path needs BOTH reward AND episodic evidence
    const isHumanTrained = rewardStrength > 4 && hasEpisodicWitness;

    if (!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained) {
      return; // skip non-graph, non-trained candidates
    }
    
    // Single goal-reachability guard (was duplicated — now unified)
    if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) {
      return;
    }
    
    // ======================================
    // 🧠 ANALYZE CANDIDATE
    // ======================================

    const analysis =

    analyzeCandidate({

        currentKey,

        candidateKey: k,

        startNeuron,

        penalties,
        signals,
        timeMemory,

        goalNeuronId,

        canReachGoal

    });




    // invalid candidate
    if (!analysis) return;




    // unpack analysis
    const {

        targetNeuron,

        label1,
        label2,

        score,

        meaningBoost,

        attention,

        signal,

        timeScore,

        goalBoost

    } = analysis;
  
  
  
  // Goal BOOST (how close to goal)
  //let goalBoost = 0;
  //if (currentGoal && label2 === currentGoal) {
    //goalBoost = 15;                              // direct hit
    //}
  
  
  const focus = attentionMap.get(k) || 0;
  
  const chainBoost = (chainMap.get(k) || 0) * 0.7;     // penalty for wrong chains
  
  
  // get reward value for this path
  const reward = rewards.get(currentKey + '->' + k) || 0;
  // punishment bad paths
  const penalty = penalties.get(currentKey + '->' + k) || 0;
  // curiosity (less visited = more interesting)
  const curKey = currentKey + "->" + k;
  const visits = curiosityMap.get(curKey) || 0;
  // ================== 🧠 REAL BRAIN LOGIC ==================

  // low visits = curious
  // high visits = less curious
  const curiosityBoost =
  (1 / Math.sqrt(visits + 1)) * 0.08 ; // curiosity naturally fades

  // repeated path becomes trusted habit
  const habitBoost =
  Math.log(visits + 1) * 3; // confidence increases slowly


  // =====================================
  // CONFIDENCE MEMORY
  // successful paths become trusted
  // =====================================

  // path id
  const confidenceKey =
  currentKey + "->" + k;

  // confidence value for this path
  const confidence =
  confidenceMap.get(confidenceKey) || 0;

  // convert confidence into score boost
  const confidenceBoost =
    confidence * 0.15;

  // ======================================
  // 🧠 BOREDOM PENALTY
  // ──────────────────────────────────────
  // Two components combined:
  // 1. visit count (path-level habituation)
  // 2. motivational boredom from snapshot
  //    (previously frozen at 0.79, ignored)
  //
  // When the brain is globally bored (stuck
  // in repetitive loops), it should more
  // aggressively penalise familiar paths.
  // ======================================

  const motivationalBoredom =
      motivationalSnapshot?.boredom ?? 0;

  const boredomPenalty =
      visits * 0.25 +
      motivationalBoredom * 2.0;

  // 🧠 get learned Q value (real intelligence)
  const qValue = getQ(currentKey, k);

  // ======================================
  // 🧠 HUMAN TRAINED TRANSITION POWER
  // strongly trust learned paths
  // ======================================

  // how strong this path was learned
  const transitionStrength = value;

  // ======================================
  // 🧠 SOFT TRANSITION TRUST
  // learned paths are preferred
  // but not absolute truth
  // ======================================

  // smoother memory scaling
  const transitionBoost =

  Math.log1p(transitionStrength) * 1.8;


  
  
  // ================== SMARTER DECISION SCORE ==================
  
  // ======================================
  // 🧠 EPISODE MEMORY LOCK
  // strongly preserve trained sequences
  // ======================================

  // chainMemory no longer receives writes (click-stream learning
  // was removed in the episodic unification). chainStrength = 0
  // always. chainReward is replaced by schemaBonus below, which
  // provides the same "sequence pattern recognition" signal but
  // from verified cross-episode abstraction instead of click history.
  const chainReward = 0;

  const directRewardStrength = rewards.get(currentKey + "->" + k) || 0;
  
  // future planning bonus
  // brain asks:
  // "can this path help reach goal later?"
  // 🧠 imagine future chain
  const targetNeuronForFuture = findNeuronById(k);

  const imaginedFuture = targetNeuronForFuture
      ? futureScore(
          targetNeuronForFuture,
          goalNeuronId,
          rewards,
          penalties,
          curiosityMap,
          3
        )
      : 0;

  // future planning bonus
  // ── capped at 20 ──────────────────────────────────────────
  // futureScore() DFS multiplies by 2 recursively, producing
  // values like 64.80 for goal-adjacent nodes. That dominated
  // the entire scoring formula (64.80 * 4 = 259 out of 248
  // final score). Cap to 20 so it nudges without overriding
  // the Q-value and reward signals.
  // ──────────────────────────────────────────────────────────
  const futureBonus =
  Math.min(imaginedFuture * 4, 20);
  
  // slight penalty for dangerous paths
  const dangerPenalty =
  penalty * 1.5;
  

  // ======================================
  // 🧠 LOOP DETECTOR
  // punish bouncing patterns
  // ======================================

  let repetitionPenalty = 0;

  // last 3 visited nodes
  const recentNodes = thoughtTrail.slice(-3);

  // repeated recently?
  if (recentNodes.includes(k)) {

      // ──────────────────────────────────────
      // Was 25 → caused Math.pow(26,2.5)*2.5 = 8620 penalty.
      // Any path scored -8523 even when it was the BEST option.
      // Changed to 2 → Math.pow(3,2.5)*2.5 = 39 penalty.
      // Still strong enough to discourage repetition but
      // does not make scores catastrophically negative.
      // ──────────────────────────────────────
      repetitionPenalty += 2;
  }


  // ======================================
  // 🧠 READ LOCAL EMOTIONS
  // every path has emotional history
  // ======================================

  const localEmotion =

      getLocalEmotion(
          startKey,
          k
      );


  // ======================================
  // 🧠 GOAL GRADIENT — THE MISSING PULL
  // ──────────────────────────────────────
  // candidateAnalysis.js computes a goalBoost
  // but main.js never passed it into scoring,
  // so the agent had ZERO goal awareness and
  // farmed whatever local loop it landed in.
  //
  // This computes a reliable graph-distance
  // gradient: every step that gets CLOSER to
  // the goal scores higher. Reaching the goal
  // exactly gives the strongest pull.
  //
  // Scaled to compete with the qValue*5 term
  // (~100 max) so goal-seeking is a real force,
  // not a decorative HUD label.
  // ======================================

  let goalGradientBoost = 0;

  if (goalNeuronId !== null) {

      if (Number(k) === Number(goalNeuronId)) {

          // candidate IS the goal — the final
          // step. This must dominate even a
          // heavily farmed local loop, so the
          // agent always takes the last step in.
          goalGradientBoost = 100;

      } else {

          const dist = goalDistance(k, goalNeuronId);

          if (dist > 0) {
              goalGradientBoost = 30 / (dist + 0.5) * 0.75 + 5;
          } else if (dist === -1) {
              goalGradientBoost = -8;
          }
      }

      // ======================================
      // 🧠 TRAJECTORY CONFIDENCE GATE
      // ──────────────────────────────────────
      // Human analogy: "Have I seen this step
      // happen right here in a real story?"
      //
      // If the answer is no (count=0), the
      // goal gradient is suppressed to 10%.
      // The brain still knows the goal exists
      // but it cannot take a shortcut it has
      // never experienced as a genuine step.
      //
      // If count=5+ (well-trained path), the
      // full goal gradient applies.
      //
      // This stops forest→eat, dog→eat etc.
      // from scoring high: they have count=0
      // so their goalGradientBoost = 0.10 × X
      // while lion→hunt has count=8, full X.
      //
      // Fix 1: trajectory priority
      // Fix 2: transitive shortcuts blocked
      // Fix 5: causal validity filter
      // ======================================

      if (Number(k) !== Number(goalNeuronId)) {
          const tc = trajectoryConfidence(currentKey, k);
          goalGradientBoost *= (0.10 + 0.90 * tc);
      } else {
          // =============================================
          // FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS
          // ─────────────────────────────────────────────
          // If adjacencyMemory[A→B] === 0, this step was
          // NEVER observed as consecutive in any episode.
          // It gets NO goal gradient at all.
          //
          // The old minimum of 15 meant every node in the
          // graph still had "30 free points" toward eat,
          // which was enough to compete with short trained
          // paths. Zero means: no episodic evidence = no
          // goal-directed pull. Only trained steps attract.
          //
          // tc=0 → boost=0   (never seen)
          // tc=0.5 → boost=50 (seen in ~2-3 episodes)
          // tc=1.0 → boost=100 (seen in 5+ episodes)
          // =============================================
          const tc = trajectoryConfidence(currentKey, k);
          goalGradientBoost = 100 * tc;
      }

  }  // end: if (goalNeuronId !== null)


  // ======================================
  // 🧠 SEMANTIC VITALITY SCORE
  // experience-based semantic signal
  // replaces raw embedding dominance
  // ======================================

  const candidatePathKey =
      currentKey + "->" + k;

  const semanticVitalityScore =
      getSemanticSignal(candidatePathKey);

  
  // ======================================
  // 🧠 NOISE-SUPPRESSED SEMANTIC SCORE
  // edges seen < 3 times = noise → penalized
  // edges seen 8+ times = stable knowledge → boosted
  // ======================================

  const noiseSuppressedScore = getNoiseSuppressedScore(
      currentKey,
      k,
      startNeuron.userData.label,
      targetNeuron?.userData.label || ""
  );

  const consolidationBonus = getConsolidationScore(currentKey, k);

  // ======================================
  // 🧠 ATTENTION AMPLIFICATION
  // aligned with current focus = amplified
  // misaligned = suppressed
  // ======================================

  const rawCandidateScore =
      (reward * 3) + (qValue * 2) + noiseSuppressedScore;

  const attentionAmplifiedScore =
      applyAttentionAmplification(rawCandidateScore, targetNeuron?.userData.embedding);


  // ======================================
  // 🧠 UNCERTAINTY SCORE
  // surprise + inconsistency + novelty
  // ======================================

  const uncertaintyScoreValue =
      getUncertaintyScore(candidatePathKey);   


  // ======================================
  //CALCULATE FINAL INTELLIGENCE SCORE
  // ======================================

  const finalWeight =

  calculateDecisionScore({

      transitionBoost, 

      qValue,

      reward,

      habitBoost,

      curiosityBoost,

      chainReward,

      meaningBoost: meaningBoost * 0.15,
      
      executiveWeights,
      semanticVitalityScore,
      uncertaintyScore: uncertaintyScoreValue,
      dominantDrive: motivationalSnapshot.dominant,

      // new cognitive systems
      noiseSuppressedScore,
      consolidationBonus,
      attentionAmplifiedScore,

      futureBonus,

      boredomPenalty,

      repetitionPenalty,

      dangerPenalty,

      selfLoopPenalty:
          k === currentKey ? 1000 : 0,

      // ======================================
      // 🧠 LOCAL PATH EMOTIONS
      // per-path emotional memory
      // ======================================

      localConfidence: localEmotion.confidence,
      localStress:     localEmotion.stress,
      localFatigue:    localEmotion.fatigue,
      localTrust:      localEmotion.trust,
      localFear:       localEmotion.fear,

      // ======================================
      // 🧠 BEHAVIOR DYNAMICS
      // ======================================

      curiosityState,
      confidenceState,
      stressState,
      fatigueState,
      focusState,

      // ======================================
      // 🧠 PREDICTION UNCERTAINTY
      // live binding from predictionError.js
      // suppresses semantic weight when brain
      // world model is currently unreliable
      // ======================================

      uncertaintyState: predUncertaintyState,

      // ======================================
      // 🧠 PER-TRANSITION UNCERTAINTY
      // specific unreliability of THIS path
      // (fromId → candidateId)
      // scales penalty with qValue to compete
      // against Q=20 highway dominance
      // ======================================

      transitionUncertainty: getTransitionUncertainty(currentKey, k),

      // ======================================
      // 🧠 SEQUENCE-LEVEL ESCAPE PRESSURE
      // high repetition → adds breaking pressure
      // to ALL transitions including loop ones
      // ======================================

      sequenceError: getSequenceError(),

      // ======================================
      // 🧠 EPISTEMIC UNCERTAINTY LEDGER
      // true outcome-reliability history
      // for THIS specific transition
      // ======================================

      ...getProceduralUncertainty(currentKey, k),

      // ======================================
      // 🧠 BAYESIAN PATH TRUST
      // ──────────────────────────────────────
      // Real earned certainty from autonomous
      // verified success. Range [0 → 1].
      // 0.5 = no evidence yet (flat prior)
      // 0.9 = heavily proven by experience
      // Manual clicks do NOT write here.
      // Formula: (successes+1)/(attempts+2)
      // ======================================

      bayesianTrust: getPathTrust(currentKey + "->" + k),

      // ======================================
      // 🧠 GOAL GRADIENT
      // ──────────────────────────────────────
      // Graph-distance pull toward the goal.
      // This is what makes the agent actually
      // seek the goal instead of farming loops.
      // ======================================

      goalGradientBoost,

      // ======================================
      // 🧩 SCHEMA BONUS
      // ──────────────────────────────────────
      // Hierarchical abstraction bonus.
      // High when this transition is part of a
      // known abstract pattern (e.g. hunt→meat
      // matches the predator-hunt-consume schema
      // even if never directly seen with THIS
      // predator before). Zero if no schema
      // matches. Pure recognition — no writes.
      // ======================================

      schemaBonus: getSchemaBonus(currentKey, k),

      // =============================================
      // FIX 4: TRAJECTORY INTEGRITY SCORE
      // ─────────────────────────────────────────────
      // Measures how well this step fits inside a
      // known episode structure given the current
      // path taken so far.
      //
      // Human analogy: "Not only do I remember
      // hunt→meat in isolation, I remember it
      // happening RIGHT AFTER lion→hunt, which
      // is EXACTLY where I am in the sequence now."
      //
      // Built by checking: does any known episode
      // contain [...currentPath, k] as a prefix?
      // The longer the matching prefix, the higher
      // the integrity score.
      //
      // This gives massive preference to paths that
      // exactly continue a known episode vs shortcuts
      // that just happen to end at a related node.
      // =============================================

      trajectoryIntegrity: computeTrajectoryIntegrity(
          recentMemory,
          currentKey,
          k
      ),

  });

  // ======================================
  // 🧠 EXECUTIVE ARBITRATION BLEND
  // ──────────────────────────────────────
  // arbitrate() uses competitive arbitration
  // (winner-takes-MORE) across normalized
  // pressure signals weighted by motivation.
  //
  // Blended 60/40 with calculateDecisionScore
  // to preserve learned Q/reward signals
  // while adding motivational modulation.
  // ======================================

  const candidateArb = lastArbitrationBreakdown;
  let arbitratedScore = finalWeight;

  if (candidateArb && executiveWeights) {
      const competitiveScore = arbitrate({
          rewardScore:      candidateArb.rewardScore,
          semanticScore:    candidateArb.semanticScore,
          confidenceScore:  candidateArb.confidenceScore,
          uncertaintyScore: uncertaintyScoreValue,
          curiosityScore:   candidateArb.curiosityScore,
          costScore:        candidateArb.costScore,
          executiveWeights,
          drift:            0,
          isSelfLoop:       (k === currentKey),
      });
      // blend: 60% learned score + 40% competitive
      arbitratedScore = finalWeight * 0.60 + competitiveScore * 0.40;
  }

  choices.push({
    key: k,
    weight: arbitratedScore
  });

  // NOTE: updateBehavior moved OUTSIDE this loop
  // calling it per-candidate was inflating confidence to 100
});
//  __________________________________________________________________________________________

// pick single best choice (highest weight)
//const best = choices.sort((a,b) => b.weight - a.weight)[0];

//let chosenKey = null;
//if (best) {
  //chosenKey = best.key;       // remember what brain picked
  //}
// reward system (strengthen correct path)
//if (best) {
  //const rewardKey = currentKey + "-" + best.key;
  //rewards.set(rewardKey, (rewards.get(rewardKey) || 0) + 1);
  //}
// punish other wrong choices
//choices.forEach(c => {
  //if (c.key !== chosenKey) {
    //const badKey = currentKey + "_" + c.key;
    //penalties.set(badKey, (penalties.get(badKey) || 0) + 0.5);
    //}
  //});

// Multi prediction (top 3)

// ======================================
// 🧠 ADAPTIVE EPSILON — STRESS + UNCERTAINTY
// ──────────────────────────────────────
// Base rate drops when fatigued (tired brains
// commit to habits). But when stress rises
// above a threshold it signals the brain is
// STUCK in an unrewarding loop — stress is
// accumulating because the goal isn't being
// reached. At that point, boost epsilon to
// force exploration and break the attractor.
//
// stressEscapeBoost:
//   stress < 10  → 0     (normal operation)
//   stress 10-20 → 0-0.2  (mild pressure)
//   stress > 20  → 0.2-0.4 (strong escape drive)
//
// predEpsilonBoost is set by prediction error
// tracking (widens attention after surprises).
// ======================================

const predEpsilonBoost = window._predictionErrorEpsilonBoost || 0;

const STRESS_ESCAPE_THRESHOLD = 10;
const stressEscapeBoost =
    stressState > STRESS_ESCAPE_THRESHOLD
        ? Math.min(
              0.4,
              ((stressState - STRESS_ESCAPE_THRESHOLD) / 20) * 0.4
          )
        : 0;

if (stressEscapeBoost > 0.05) {
    console.log(
        "🌪️ Stress escape: stress=" + stressState.toFixed(1) +
        " boost=+" + stressEscapeBoost.toFixed(2)
    );
}

const epsilon = Math.max(
    0.02,
    Math.min(
        0.7,
        0.2
        - (fatigueState * 0.002)
        + predEpsilonBoost
        + stressEscapeBoost
    )
);


if (Math.random() < epsilon && choices.length > 0) {
  
  const randomChoice =
  choices[Math.floor(Math.random() * choices.length)];
  
  currentKey = randomChoice.key;  // jump randomly
  return; // stop here (skip greedy choice)
}

const sorted = choices.sort((a, b) => b.weight - a.weight);

// ================== 🧠 SAVE DECISION ==================

// best option (highest score)
const bestChoice = sorted[0];

// save decision info for later explanation
lastDecision = {
  current: currentKey,         // where agent is now
  best: bestChoice,            // chosen path
  all: sorted.slice(0, 3)      // top 3 options (for comparison)
};


// Structure weight
structureMap.forEach((value, k) => {
  
  if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) {
    return;
  }
  
  const targetNeuron = findNeuronById(k);
  if (!targetNeuron) return;
  
  const label1 = startNeuron.userData.label;
  const label2 = targetNeuron.userData.label;
  
  // logic filter
  if (conceptRelations[label1]) {
    if (!conceptRelations[label1].includes(label2)) {
      return;
    }
  }
  
  const score =
  similarity(startNeuron.userData.embedding, targetNeuron.userData.embedding);
  
  if (!choices.find(c => c.key === k)) {
    choices.push({
      key: k,
      weight: score
    });
  }
});

embeddingMap.forEach((value, k) => {

  // =============================================
  // FIX 2: SEMANTIC → EXPLORATION ONLY
  // ─────────────────────────────────────────────
  // Semantic neighbors (embedding similarity)
  // are imagination fuel for open exploration.
  // When the brain has a specific goal, they
  // must NOT compete with episodic candidates.
  //
  // Human analogy: "I know lion and hunt are
  // conceptually related, but when I'm trying
  // to reach eat, I follow the path I remember
  // from experience — not semantic association."
  //
  // When goalNeuronId is set: skip ALL semantic
  // candidates unless they already appear in
  // the episodic candidate pool (choices).
  // =============================================
  if (goalNeuronId !== null) {
    return; // episodic planning mode: no semantic candidates
  }

  const targetNeuron = findNeuronById(k);
  if (!targetNeuron) return;
  
  const label1 = startNeuron.userData.label;
  const label2 = targetNeuron.userData.label;
  
  // logic filter (exploration only)
  if (conceptRelations[label1]) {
    if (!conceptRelations[label1].includes(label2)) {
      return;
    }
  }
  
  if (!choices.find(c => c.key === k)) {
    choices.push({
      key: k,
      weight: value
    });
  }
});

if (choices.length === 0) return;

// ===== SOFTMAX (stable — prevents Infinity/NaN) =====

const maxW = Math.max(...choices.map(c => c.weight));

let expSum = 0;

choices.forEach(c => {
  c.exp = Math.exp(c.weight - maxW); // subtract max to prevent overflow
  expSum += c.exp;
});

// Convert to probability
choices.forEach(c => {
  c.prob = c.exp / expSum;
});

// confidence = how strong top choices is
const topProb = choices[0]?.prob || 0;
const confidence = topProb; // 0 -> unsure, 1 -> very sure

// Sort highest first
choices.sort((a, b) => b.prob - a.prob);

// Take top 3
// 🧠 if confident → take 1 path
// 🧠 if unsure → explore more
let topChoices;

if (confidence > 0.7) {
  topChoices = choices.slice(0, 1); // focused
} else if (confidence > 0.4) {
topChoices = choices.slice(0, 2); // medium
} else {
topChoices = choices.slice(0, 3); // explore
}

topChoices.forEach(choice => {

  // find next neuron safely
  const neuron =
  findNeuronById(choice.key);

  // find current neuron safely
  const prevNeuron =
  findNeuronById(currentKey);

  // 🛑 safety system
  // stop crashes immediately
  if (
      !neuron ||
      !prevNeuron ||
      !neuron.position ||
      !prevNeuron.position
  ) {

      console.log(
          "❌ Missing neuron in prediction",
          choice.key,
          currentKey
      );

      return;
  }
  
  // Draw line
  const geometry = new THREE.BufferGeometry().setFromPoints([
  prevNeuron.position,
  neuron.position
  ]);
  
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color().setHSL(
    0.7 - choice.prob * 0.7,
    1,
    0.4 + choice.prob * 0.4
    ),
    transparent: true,
    opacity: 0.2 + choice.prob * confidence   // confident = brighter path, confused = faint paths
  });
  
  const line = new THREE.Line(geometry, material);
  
  group.add(line);
  
  // remove after time
  setTimeout(() => group.remove(line), 1000);
  
  // ===== DOT FLOW =====
  const dot = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0x00ffff })
);

dot.userData = {
  start: prevNeuron.position.clone(),
  end: neuron.position.clone(),
  progress: 0
};

group.add(dot);

const interval = setInterval(() => {
  
  dot.userData.progress += 0.05;
  
  if (dot.userData.progress >= 1) {
    group.remove(dot);
    clearInterval(interval);
    return;
  }
  
  dot.position.lerpVectors(
  dot.userData.start,
  dot.userData.end,
  dot.userData.progress
);

}, 30);
});

// ___________________________________________________________________________________________
//________________________________________________________________________________

// Move forward
let nextKey = topChoices[0].key;

// prevent immediate repeat
if (nextKey === currentKey && topChoices.length > 1) {
  nextKey = topChoices[1].key;
}

// prevent A -> B -> A loops
if (thoughtTrail.length >= 2) {
  
  const prev = thoughtTrail[thoughtTrail.length - 2];
  
  if (nextKey === prev && topChoices.length > 1) {
    nextKey = topChoices[1].key;
  }
}

// ======================================
// 🧠 SAVE ACTUAL NEXT MOVE — STEP 0 ONLY
// ──────────────────────────────────────
// window.lastReasoning tells runAgent
// WHERE TO ACTUALLY MOVE NEXT.
//
// BUG (now fixed): this was written on
// EVERY step of the STEPS loop, so a
// 4-step prediction from lion would end
// with lastReasoning = {eat→food} or
// {meat→eat} — not {lion→hunt}.
//
// runAgent then read .to = food/eat and:
//   a) moved the agent from lion to eat
//   b) wrote Q[lion→eat] = 15.21
//   c) wrote rewards["lion→eat"] += 3
//
// These are all false transitions. Lion
// never actually jumped to eat. The
// imagination chain contaminated reality.
//
// FIX: only set lastReasoning on step=0
// (the genuine first action). Subsequent
// steps are imagination/planning only and
// must NOT alter the agent's real move.
// ======================================
if (step === 0) {
  window.lastReasoning = {
    from: currentKey,
    to: nextKey
  };
}


// ======================================
  // 🧠 UPDATE HUD WITH ACTUAL DECISION
  // Only on step 0 — the real move.
  // Previous bug: HUD updated every step,
  // so showed "meat→eat" or "food→eat"
  // even when agent was at lion choosing hunt.
  // ======================================

  if (step === 0) {

  const decidedNeuron = findNeuronById(nextKey);

  if (startNeuron && decidedNeuron) {

      updateHUD({
          curiosityState,
          confidenceState,
          stressState,
          fatigueState,
          focusState: Math.max(0, confidenceState) *
                      Math.exp(-stressState / 30),
          qValue:       getQ(currentKey, nextKey),
          futureBonus:  liveFutureBonus,
          finalWeight:  bestChoice ? bestChoice.weight : 0,
          currentThought:
              startNeuron.userData.label +
              " -> " +
              decidedNeuron.userData.label,
          // companion-relevant signals
          dominantDrive:  getMotivationalSnapshot().dominant,
          episodeCount:   getAllEpisodes().length,
          stablePaths:    getConsolidationSummary().stablePaths,
          stressEscape:   stressState > 10,
      });

  }

  } // end: if (step === 0) HUD block

// ======================================
// 🧠 save imagined path into tree
// ======================================

thoughtTree.push({

    from: currentKey,

    to: nextKey,

    step: step

});


    currentKey = nextKey;

  } // end: for (let step = 0; step < STEPS; step++)


  // --------------------------------------
  // difficult work nodes cost more energy
  // --------------------------------------

const currentNeuron =
findNeuronById(currentKey);

if (currentNeuron) {

    const label =
    currentNeuron.userData.label.toLowerCase();

    // heavy mental/physical effort
    if (
        label.includes("work") ||
        label.includes("hunt") ||
        label.includes("fight")
    ) {

    }
    
}


// --------------------------------------
// RECENT repetition causes mental fatigue
// hate being stuck in loops
// --------------------------------------

const recentWindow =
thoughtTrail.slice(-10);


// count recent repetitions
const repeatCount =
recentWindow.filter(k => k === currentKey).length;


// ======================================
// detect trapped back-forth loops
// example:
// eat -> meat -> eat -> meat
// ======================================

let loopDepth = 0;

if (thoughtTrail.length >= 4) {

    const a =
    thoughtTrail[thoughtTrail.length - 1];

    const b =
    thoughtTrail[thoughtTrail.length - 2];

    const c =
    thoughtTrail[thoughtTrail.length - 3];

    const d =
    thoughtTrail[thoughtTrail.length - 4];

    // A -> B -> A -> B
    if (a === c && b === d) {

        loopDepth = 4;

    }
}




// --------------------------------------
// HOME RECOVERY
// safety + familiarity reduces stress
// --------------------------------------

if (currentNeuron) {

    const label =
    currentNeuron.userData.label.toLowerCase();

    // home restores energy
    if (
        label.includes("home") ||
        label.includes("bed") ||
        label.includes("rest")
    ){

    } 

}


// ======================================
// 🧠 UPDATE BIOLOGICAL BODY
// ======================================

regulateBiology({

    // movement/thinking effort
    activity: 1,

    // complex thinking load
    mentalLoad: STEPS,

    // repetitive loops
    repetition: repeatCount,

    // loop depth
    loopDepth,

    // dangerous situations
    danger: stressState,

    // safe resting places
    isHome:

        currentNeuron && (

            currentNeuron.userData.label
            .toLowerCase()
            .includes("home")

            ||

            currentNeuron.userData.label
            .toLowerCase()
            .includes("rest")

            ||

            currentNeuron.userData.label
            .toLowerCase()
            .includes("bed")

        )

});



// ======================================
// 🧠 DRAW THOUGHT TREE
// visual future imagination
// ======================================

thoughtTree.forEach(branch => {

    // get neurons
    const fromNeuron =
    findNeuronById(branch.from);

    const toNeuron =
    findNeuronById(branch.to);

    // ======================================
    // PATH CONFIDENCE MEMORY
    // gets learned trust of this path
    // ======================================

    // build path key
    const confidenceKey =
    branch.from + "->" + branch.to;

    // get confidence memory (pathConfidence was removed;
    // confidenceMap is the active per-path confidence store)
    const confidence =
    confidenceMap.get(confidenceKey) || 0;


    // safety check
    if (!fromNeuron || !toNeuron) return;

    // create glowing line
    const geometry =
    new THREE.BufferGeometry().setFromPoints([

        fromNeuron.position,

        toNeuron.position

    ]);


        // confidence normalized 0 → 1
        const confidenceLevel =
        Math.min(confidence / 100, 1);

        // brain color evolution
        const pathColor =
        new THREE.Color().setHSL(

            // weak = blue
            // strong = gold
            0.6 - (confidenceLevel * 0.5),

            1,

            // brighter if trusted
            0.3 + confidenceLevel * 0.4
        );

        const material =
        new THREE.LineBasicMaterial({

            color: pathColor,

            transparent: true,

            // trusted paths glow stronger
            opacity:
            0.15 + confidenceLevel * 0.85
        });

    // create visual line
    const line =
    new THREE.Line(geometry, material);

    // add to scene
    group.add(line);

    // remove later
    setTimeout(() => {

        group.remove(line);

    }, 3000);

});


// ======================================
// 🧠 GENERATE PREDICTION EXPECTATION
// ──────────────────────────────────────
// MOVED from inside loop (step===0) to HERE.
//
// ROOT CAUSE OF THE FIX:
// The old code stored predictedNextId = nextKey
// from step 0 (first look-ahead step).
// But runAgent evaluates actualNextId =
// window.lastReasoning.to = LAST step's nextKey.
// Different nodes → statePredictionError=1.0
// every single step → uncertainty saturated
// at 1.0 permanently.
//
// Fix: generate expectation AFTER the loop
// using window.lastReasoning which holds the
// FINAL predicted step — the same step that
// runAgent will evaluate.
//
// Now:
//   predictedNextId = window.lastReasoning.to
//   actualNextId    = window.lastReasoning.to
//   statePredictionError = 0.0 ✓
//
// Meaningful signal comes from rewardPredictionError:
//   predictedReward = rewards.get(from→to) from memory
//   actualReward    = rewardSignal (sim-based threshold)
// These DO differ → gives real calibration signal.
// ======================================

if (window.lastReasoning) {

    const lastFromNeuron =
        findNeuronById(window.lastReasoning.from);

    const lastToNeuron =
        findNeuronById(window.lastReasoning.to);

    if (lastFromNeuron && lastToNeuron) {

        const predSim = similarity(
            lastFromNeuron.userData.embedding,
            lastToNeuron.userData.embedding
        );

        const predReward =
            rewards.get(
                window.lastReasoning.from + "->" +
                window.lastReasoning.to
            ) || 0;

        generateExpectation({
            predictedNextId:
                window.lastReasoning.to,

            predictedReward:
                predReward,

            predictedSimilarity:
                predSim,

            predictedConfidence:
                confidenceState,

            predictedGoalProgress:
                (goalNeuronId &&
                 window.lastReasoning.to === goalNeuronId)
                ? 3 : 0,

            fromKey: startKey
        });

    }

}

return currentKey;
}



animate();                           // start loop


// ======================================
// 🧠 START LIVE BRAIN HUD
// ======================================

createHUD();


// ================== 🤖 AI AGENT SYSTEM ==================
// ***********************************************************************

// ================== 🤖 AGENT STATE ==================

// is AI currently running automatically?
let agentRunning = false;

// speed of thinking (ms)
let agentSpeed = 500; // little fast

// where agent is currently thinking
let agentCurrent = null;

// remember last position of agent (used for learning)
let agentLast = null;         // this stores where i was before

// stores loop timer
let loopId = null;

// ================== 🤖 AGENT THINK LOOP ==================

function runAgent() {
  // ===============================
  // RECENT MEMORY
  // prevents endless loops
  // ===============================
  
  // stores recently visited neurons
  if (!window.recentMemory) {
    window.recentMemory = [];
  }
  
  if (Math.random() < 0.1) {                // only 10% of time
    // 🧠 slowly forget old curiosity (keeps brain flexible)
    curiosityMap.forEach((value, key) => {
      curiosityMap.set(key, value * 0.995); // slow decay
    });
  }


  // ======================================
  // 🧠 DECAY EXECUTIVE SYSTEMS
  // semantic vitality fades when unused
  // uncertainty stabilizes with experience
  // ======================================

  if (Math.random() < 0.15) {
      decaySemanticSystems();
      decayUncertainty();
  }
  
  
  // 🟢 STEP 5 — DECAY PENALTY (PUT HERE AT TOP)
  penalties.forEach((value, key) => {
    const decayed = value * 0.98;


    // remove tiny dead penalties
    if (decayed < 0.05) {

        penalties.delete(key);

    } else {

        penalties.set(key, decayed);

    }
  });
  
  // ======================================
  // 🧠 VERY SLOW REWARD DECAY
  // good memories survive longer
  // ======================================

  if (Math.random() < 0.02) {

      rewards.forEach((value, key) => {

          rewards.set(

              key,

              value * 0.9995

          );

      });

  }
  
  // 🧠 slowly forget transitions
  transitions.forEach((map, state) => {
    
    map.forEach((v, action) => {
      map.set(action, v * 0.995);
    });
    
  });
  
  // 🧠 Q value decay — slower for manually trained paths
  // ──────────────────────────────────────────────────────
  // The old blanket 0.999 rate decayed a manually trained
  // Q=15 to half in ~700 steps (~70 seconds at 10 steps/s).
  // Paths in the reward map with r>5 (manual training) get
  // a gentler 0.9998 decay — half-life ~3500 steps (~6 min).
  // Untrained/exploratory paths still decay at 0.999.
  Q.forEach((value, key) => {
      const r = rewards.get(key) || 0;
      const rate = r > 5 ? 0.9998 : 0.999;
      Q.set(key, value * rate);
  });
  
  // if turned OFF → stop immediately
  if (!agentRunning) return;
  
  // 🧠 if no current position → pick random neuron
  if (!agentCurrent) {
    
    const allIds = Array.from(neuronMap.keys()); // get all neuron IDs
    
    // pick random start point — exclude goal node so
    // the agent never begins an episode AT the goal
    const _startIds = Array.from(neuronMap.keys())
        .filter(id => Number(id) !== Number(goalNeuronId));
    const _pool = _startIds.length > 0 ? _startIds : Array.from(neuronMap.keys());
    agentCurrent = _pool[Math.floor(Math.random() * _pool.length)];
    
    console.log("🤖 Start from:", agentCurrent);
  }
  
  // 🧠 OPTIONAL: sometimes set a random goal (makes it smart)
  /* if (Math.random() < 0.1) {
    
    const allIds = Array.from(neuronMap.keys());
    
    goalNeuronId = allIds[Math.floor(Math.random() * allIds.length)];
    
    console.log("🎯 New goal:", goalNeuronId);
  }
  */

  // ======================================
  // 🧠 SURVIVAL OVERRIDE
  // exhausted brains seek recovery
  // ======================================

  // extremely exhausted brain
  if (

      fatigueState > 80 &&

      window.homeNeuronId !== undefined

  ) {

      // override random goals
      goalNeuronId = window.homeNeuronId;

      console.log(

          "🏠 Exhausted → seeking home"

      );
  }


  
  // 🧠 THINK → run your prediction system
  // 🧠 RUN BRAIN (decide where to go)
  // ================== SMART AUTONOMOUS TRAINING ==================

  // ======================================
  // 🧠 MOSTLY USE LEARNED PATHS
  // less randomness now
  // ======================================

  if (Math.random() < 0.92) {

    runPrediction(agentCurrent);

  }

  // sometimes replay old successful paths
  // ===============================
  // 🧠 DREAM REPLAY MODE
  // brain trains from old memories
  // ===============================

  else {
      // replay via unified episode manager
      // reads from the single episodicStore shared by
      // manual, autonomous, and exploration episodes
      replayOneEpisode();
  }
  
  // ================== 🧠 FULL DECISION REASONING ==================

  // ======================================
  // 🧠 SINGLE updateBehavior PER STEP
  // called once after choice is made
  // uses lastDecision.best (global) not bestChoice (runPrediction scope)
  // ======================================
  if (lastDecision && lastDecision.best) {
      const chosenKey     = lastDecision.best.key;
      const chosenReward  = rewards.get(lastDecision.current + "->" + chosenKey) || 0;
      const chosenPenalty = penalties.get(lastDecision.current + "->" + chosenKey) || 0;
      const chosenVisits  = curiosityMap.get(lastDecision.current + "->" + chosenKey) || 0;

      // ── Loop detection for stress accumulation ──────────────
      // Count how many of the last 6 steps were the same pair.
      // When stuck in hunt↔lion, all 6 are the same pair.
      // recentMemory holds recent node IDs.
      const recentWindow  = (window.recentMemory || []).slice(-6);
      const currentPair   = lastDecision.current + "->" + chosenKey;
      const pairRepeats   = recentWindow.filter(
          (_, i) => i > 0 &&
          recentWindow[i-1] + "->" + recentWindow[i] === currentPair
      ).length;

      // Stress penalty for being trapped in a loop with no goal progress
      const loopStressPenalty =
          (goalNeuronId !== null && chosenKey !== goalNeuronId)
              ? pairRepeats * 0.3
              : 0;

      updateBehavior({
          reward:     chosenReward - loopStressPenalty,
          penalty:    chosenPenalty + loopStressPenalty,
          success:    chosenReward > chosenPenalty && pairRepeats < 2,
          repeated:   chosenVisits > 5 || pairRepeats >= 2,
          pathLength: 1,
          isHome:     chosenKey === window.homeNeuronId
      });
  }
  
  // ✅ FULL SAFE CHECK (very important)
  if (
  lastDecision &&                 // decision exists
  lastDecision.current != null && // current exists
  lastDecision.best &&            // best exists
  lastDecision.best.key != null &&// best.key exists
  lastDecision.all &&             // all choices exist
  Array.isArray(lastDecision.all) // make sure it's an array
  ) {   // only run if decision exists
    
    // get neurons safely
    // use REAL reasoning path
    const reasoning =
      window.lastReasoning;

    if (!reasoning) return;

    const currentNeuron =
      findNeuronById(reasoning.from);

    const bestNeuron = findNeuronById(lastDecision.best.key);
    
    if (
    !currentNeuron || !currentNeuron.userData ||
    !bestNeuron || !bestNeuron.userData
    ) {
      console.log("Missing neuron, skip reasoning");
      return;
    }
    
    let text = "";   // text that will be shown
    
    // ================== ✅ WHY CHOSEN ==================
    
    text += "✅ Chose: " +
    currentNeuron.userData.label + " → " +
    bestNeuron.userData.label +
    " (score: " + lastDecision.best.weight.toFixed(2) + ")\n";
    
    text += "\n❌ Not chosen:\n";
    
    // ================== ❌ WHY NOT OTHERS ==================
    
    lastDecision.all.forEach(choice => {
      if (!choice || choice.key == null) return;
      
      // skip best (already shown)
      if (choice.key === lastDecision.best.key) return;
      
      const neuron = findNeuronById(choice.key);
      
      //skip if neuron not found
      if (!neuron || !neuron.userData) return;
      
      let reason = "";
      
      // simple rules to explain decision
      if (choice.weight < lastDecision.best.weight * 0.5) {
        reason = "low score";   // much weaker
      }
      else if (penalties.get(lastDecision.current + "->" + choice.key)) {
        reason = "penalty high";  // punished before
      }
      else {
        reason = "less optimal";  // okay but not best
      }
      
      text += "- " +
      currentNeuron.userData.label + " → " +
      neuron.userData.label +
      " (" + reason + ")\n";
    });
    
    // also print in console
    console.log(text);
  }
  
  // ================== 🧠 REASONING VOICE ==================
  
  
  // get last predicted step (from thoughtTrail)
  const reasoning = window.lastReasoning;
  if (!reasoning) return;
  const currentNeuron = findNeuronById(reasoning.from);

  let nextStep = reasoning.to;
  
  // get next neuron object
  const nextNeuron = findNeuronById(nextStep);
  
  // if both exist → explain reasoning
  if (!currentNeuron || !nextNeuron) return;
  
  // 🧠 ================== DEEP REASONING ==================
  
  // 🛑 safety (don't crash)
  if (!currentNeuron || !nextNeuron) return;
  
  // 🧠 1. SIMILARITY (how related ideas are)
  const sim = similarity(
  currentNeuron.userData.embedding,
  nextNeuron.userData.embedding
);

// 🧠 2. REWARD (good past memory)
const key = currentNeuron.userData.id + "->" + nextStep;

// ======================================
// 🚫 STOP SELF-LOOP THINKING
// prevents:
// eat -> eat
// drink -> drink
// food -> food
// ======================================

// current neuron id
const currentId =
currentNeuron.userData.id;

// if brain tries to stay
// on same neuron
if (currentId === nextStep) {

    console.log(
        "🚫 self-loop blocked:",
        currentId
    );

    return;
}

let reward = rewards.get(key) || 0;

// ======================================
// 🧠 BOREDOM SYSTEM
// repeated same path becomes boring
// ======================================

const repeatKey =
agentLast + "->" + nextStep;

// how many times used
const repeatCount =
curiosityMap.get(repeatKey) || 0;

// too repetitive = punish it
if (repeatCount > 5) {

    reward -= repeatCount * 0.5;

    console.log(
      " boring path reduces:",
      repeatKey
    );

}

// 🧠 3. PENALTY (bad past memory)
const penalty = penalties.get(key) || 0;

// 🧠 4. CURIOSITY (new/unexplored path)
const visits = curiosityMap.get(key) || 0;
// curiosity fades naturally
const curiosity =
1 / Math.sqrt(visits + 1);

// repeated paths become confident habits
const habit =
Math.log(visits + 1);

// ==========================================
// 🧠 FULL EPISODE MEMORY BONUS
// example:
// lion->hunt->meat->eat
// brain rewards full successful strategy
// ==========================================

// convert recent memory into one full path
const pathKey = recentMemory.join("->");

// =======================================
// 🧠 LONG CHAIN INTELLIGENCE BONUS
// longer meaningful episodes
// become much stronger
// =======================================

// old learned memory
// episodeRewards was removed (superseded by episodicStore in episodeManager).
// Downstream formula still works: oldEpisodeStrength = 0 means no stale bonus.
const oldEpisodeStrength = 0;

// chain length
const chainLength =
recentMemory.length;

// ======================================
// 🧠 INTELLIGENT EPISODIC BONUS
//
// short path:
// food -> eat
//
// gets small bonus
//
// long smart path:
// lion -> hunt -> meat -> eat
//
// gets HUGE bonus
// ======================================

// square the chain length
// longer stories become exponentially stronger
const lengthBonus =

Math.pow(chainLength, 3);

// final episodic memory bonus
const episodeMemoryBonus =

oldEpisodeStrength *

lengthBonus *

0.5;



// ===============================
// 🧠 ADAPTIVE SEMANTIC WEIGHT
// keep semantic LOW so trained rewards dominate
// ===============================

// low default — semantic is a tiebreaker only
let semanticWeight = 0.3;

// stronger rewards further reduce semantic influence
semanticWeight -= reward * 0.03;

// minimum floor
semanticWeight = Math.max(0.05, semanticWeight);


// ================== 🧠 REAL REASONING SCORE ==================
// ===============================
// 🧠 ADVANCED COGNITIVE SCORE
// ===============================

const score =

    // semantic meaning
    sim * semanticWeight +

    // learned reward
    reward * 3 +

    // trusted habit
    habit * 2 +

    // exploration
    curiosity * 1.2 +

    // episodic memory
    episodeMemoryBonus * 4 +

    // reward long thinking chains
    recentMemory.length * 3 -

    // avoid danger
    penalty * 2;

// 🛡️ LIMIT FINAL SCORE (VERY IMPORTANT FOR STABILITY)

// clamp maximum value (prevents explosion)
const MAX_SCORE = 1000; // you can tune (500–1500 range)

// clamp minimum value (prevents extreme negatives)
const MIN_SCORE = -50;

// apply safe bounds
const safeScore = Math.max(MIN_SCORE, Math.min(score, MAX_SCORE));

// 🎯 goal understanding
let goalInfo = "";
if (goalNeuronId !== null) {
  if (nextStep === goalNeuronId) {
    goalInfo = "🎯 directly reaching goal!";
  } else {
  goalInfo = "➡️ moving toward goal";
}
}

// ===============================
// 🧠 REAL EPISODE INTELLIGENCE
// measures quality of thinking
// ===============================

let episodeScore =

    reward * 10 +

    sim * 5 +

    episodeMemoryBonus * 20 +

    habit * 5 -

    penalty * 10;



// ======================================
// 🧠 EPISODE STABILIZER
// prevents memory explosion
// ======================================

episodeScore = Math.max(
    -10,
    Math.min(10, episodeScore)
);


// 🖥️ PRINT FULL THINKING (console)
console.log(
"🧠 Thinking:",
currentNeuron.userData.label,
"->",
nextNeuron.userData.label,
"\n similarity:", sim.toFixed(2),
"\n reward:", reward.toFixed(2),
"\n penalty:", penalty.toFixed(2),
"\n curiosity:", curiosity.toFixed(2),
"\n 👉 final score:", safeScore.toFixed(2),
"\n episode score:", episodeScore,              // SHOW EPISODE PLANNING POWER
"\n", goalInfo
);

// get learned Q value
const qVal = getQ(currentNeuron.userData.id, nextNeuron.userData.id);

// print Q value
console.log("🧠 Q-value:", qVal.toFixed(2));




// ================== 🧠 SHOW ON SCREEN ==================

const motivSnap  = getMotivationalSnapshot();
const arb        = lastArbitrationBreakdown;
const epState    = getCurrentEpisodeState();
const attnSnap   = getAttentionSnapshot();
const semSum     = getSemanticSummary();
const consolSum  = getConsolidationSummary();

reasoningBox.innerText =
    "🧠 Thinking: " +
    currentNeuron.userData.label +
    " → " +
    nextNeuron.userData.label +

    "\n\n🎯 Dominant drive: " + motivSnap.dominant.toUpperCase() +

    "\n⭐ Reward pressure: " + (arb ? arb.rewardScore.toFixed(2) : "—") +
    "\n🧠 Semantic pressure: " + (arb ? arb.semanticScore.toFixed(2) : "—") +
    "\n💪 Confidence: " + (arb ? arb.confidenceScore.toFixed(2) : "—") +
    "\n🔍 Curiosity: " + (arb ? arb.curiosityScore.toFixed(2) : "—") +
    "\n😴 Cost: " + (arb ? arb.costScore.toFixed(2) : "—") +

    "\n\n🔵 Semantic vitality: " + getSemanticSignal(
        currentNeuron.userData.id + "->" + nextNeuron.userData.id
    ).toFixed(3) +
    "\n❓ Uncertainty: " + getUncertaintyScore(
        currentNeuron.userData.id + "->" + nextNeuron.userData.id
    ).toFixed(3) +

    "\n\n🧠 Q-value: " + qVal.toFixed(2) +
    "\n👉 Final Score: " + safeScore.toFixed(2) +

    "\n\n📦 Episode: [" + (epState.contextTag || "—") + "] " +
    epState.labels.slice(-3).join("→") +
    "\n🎯 Attention: " + (attnSnap.strength * 100).toFixed(0) + "%" +
    (attnSnap.hasGoal ? " [goal-locked]" : "") +
    "\n🏛️ Stable paths: " + consolSum.stablePaths +
    " | Noise edges: " + semSum.noise +
    "\n📚 Episode vault: " + epState.vaultSize +

    "\n\n" + goalInfo;


// 🧠 try to get next step from memory (last prediction)
let next = null;

// if we have any history
if (window.lastReasoning) {
  next = window.lastReasoning.to;
  // 👉 last visited neuron = next step
}


// ================== 🧠 SELF LEARNING ==================

// ======================================
// 🧠 SAFE SELF LEARNING
// prevents corrupt self-loop learning
// ======================================

if (

    agentLast !== null &&

    next !== null &&

    agentLast !== next &&

    agentLast !== goalNeuronId

) {
  
  // ================== 🧠 Q-LEARNING CORE ==================
  
  // learning rate → how fast brain learns
  const alpha = 0.1;
  
  // discount → how much future matters
  const gamma = 0.9;
  
  // reward signal (what happened after action)
  let rewardSignal = 0;

  // ======================================
  // 🧠 movement energy cost
  // only punish useless repetition
  // ======================================

  // repeated same path
  if (agentLast === next) {

      rewardSignal -= 2;

  }


  // repeated replay loop
  const repeatKey =
  agentLast + "->" + next;

  const repeatCount =
  curiosityMap.get(repeatKey) || 0;


  // too repetitive becomes mentally costly
  if (repeatCount > 8) {

      rewardSignal -= 0.3;
    console.log(
      "🧠 Repetition penalty:",
      repeatKey,
      "count:",
      repeatCount
    );
  }



  
  // ======================================
  // 🧠 STABLE LEARNING REWARD
  // ======================================

  // ──────────────────────────────────────
  // 🛡️ ANTI-FARMING GOAL REWARD
  // ──────────────────────────────────────
  // The agent was farming the goal: reach
  // eat → reward → step to meat → step back
  // to eat → reward again. Every touch of
  // the goal paid +12, so it locked into a
  // meat↔eat oscillation forever.
  //
  // The goal reward now requires a REAL
  // journey: the path since the last reset
  // must contain at least 3 DISTINCT nodes.
  // A 1–2 node dash/oscillation earns nothing.
  // ──────────────────────────────────────

  // distinct nodes travelled this episode
  const episodeUnique =
      new Set(recentMemory.map(Number)).size;

  // reached goal
  if (next === goalNeuronId) {

      if (episodeUnique >= 3) {
          // genuine goal-reaching journey
          rewardSignal = 12;
      } else {
          // trivial dash / oscillation onto the
          // goal — no farming reward
          rewardSignal = 0;
          console.log(
              "🚫 Goal touched via trivial path — no farm reward (unique:",
              episodeUnique + ")"
          );
      }

  }

  // meaningful progress
  else if (sim > 0.45) {

      rewardSignal = 2;

  }

  // neutral movement
  else if (sim > 0.15) {

      rewardSignal = 0.3;

  }

  // weak nonsense movement
  else {

      rewardSignal = -0.4;

  } 


// ======================================
// 🧠 LOCAL EMOTION UPDATE
// each path develops emotional memory
// ======================================

updateLocalEmotion({

    fromId: agentLast,
    toId: next,

    // emotional success
    reward: rewardSignal,

    // danger/stress amount
    danger: Math.abs(rewardSignal < 0 ? rewardSignal : 0),

    // repeated path usage
    repeated: repeatCount

});



// ======================================
// 🧠 EVALUATE PREDICTION ERROR
// ──────────────────────────────────────
// Now that we know what ACTUALLY happened
// (rewardSignal, sim, actual destination),
// compare against what the brain PREDICTED
// before it moved (stored in predictionError.js
// via generateExpectation on step 0).
//
// This is the core of predictive cognition:
// the gap between expectation and reality.
// ======================================

const predError = evaluatePredictionError({

    actualNextId:      next,
    actualReward:      rewardSignal,
    actualSimilarity:  sim,
    actualGoalProgress: (next === goalNeuronId) ? 3 : 0

});


// ======================================
// ROUTE PREDICTION ERROR SIGNALS
// ──────────────────────────────────────
// Each downstream system consumes the
// relevant flags from the error object.
// ======================================

if (predError) {

    // ── LEARNING AUTHORITY ────────────────────
    // Larger prediction errors = less trustworthy
    // learning update. Brain was wrong about what
    // would happen, so it trusts this memory less.
    // Prevents Q-table corruption from surprises.
    const effectiveLR = 0.1 * predError.learningAuthority;

    // ── Q-LEARNING UPDATE (AUTHORITY-SCALED) ──
    updateQ({
        state:     agentLast,
        action:    next,
        reward:    rewardSignal,
        nextState: agentCurrent,
        alpha:     effectiveLR,   // modulated by prediction confidence
        gamma:     0.9
    });

    // ── PER-TRANSITION UNCERTAINTY UPDATE ─────
    // Update this specific transition's reliability.
    // High compositeError → this path is unpredictable.
    // Will be read by calculateDecisionScore to
    // apply proportional penalty on future visits.
    updateTransitionUncertainty(
        agentLast,
        next,
        predError.compositeError
    );

    // ── SEQUENCE-LEVEL ERROR UPDATE ───────────
    // Track recent step diversity.
    // High repetition detected by sequence buffer.
    updateSequenceError(agentCurrent);

    // ── SURPRISE-DRIVEN Q DAMPING ─────────────
    // THE CORE FIX FOR PERMANENT Q=20 HIGHWAYS.
    //
    // When compositeError is significant (> 0.20),
    // this path delivered LESS reward than expected.
    // Actively reduce Q for this transition.
    //
    // dampStrength = compositeError × 0.028
    // At compositeError=0.40 (typical loop step):
    //   dampStrength = 0.011/step
    //   Q after 50 steps: 20 × (1-0.011)^50 = 11.0
    //   Q after 100 steps: 20 × 0.330 = 6.6
    //   → Loop breaks as Q drops to competitive range
    //
    // Only fires when error > 0.20 to avoid
    // damping during genuinely accurate predictions.
    if (predError.compositeError > 0.20) {

        dampQ(
            agentLast,
            next,
            predError.compositeError * 0.028
        );

    }

    // ── SEMANTIC EXPECTATION OUTCOME ──────────
    // Record whether the semantic prediction for
    // this traversal was born out by the reward.
    // High error → semantic expectation was wrong.
    // This reduces confidence for that label-pair,
    // further reducing its meaningBoost.
    const fromNeuronSemExp = neuronMap.get(Number(agentLast));
    const toNeuronSemExp   = neuronMap.get(Number(agentCurrent));

    if (fromNeuronSemExp && toNeuronSemExp) {

        const fromLabel = fromNeuronSemExp.userData.label;
        const toLabel   = toNeuronSemExp.userData.label;

        recordSemanticExpectationOutcome(
            fromLabel,
            toLabel,
            predError.compositeError
        );

        // ── SEMANTIC UNCERTAINTY LEDGER UPDATE ──
        const semanticOutcome = 1.0 - predError.compositeError;
        updateSemanticUncertainty(fromLabel, toLabel, semanticOutcome);

        if (predError.compositeError > 0.25) {
            recordSemanticActivation(
                fromLabel,
                toLabel,
                predError.compositeError * 1.5
            );
        }

    }

    // ── PROCEDURAL UNCERTAINTY LEDGER UPDATE ──
    // Normalize rewardSignal (-2..+12) to outcome [0,1]
    const proceduralOutcome = Math.min(
        Math.max((rewardSignal + 2) / 14.0, 0),
        1.0
    );
    updateProceduralUncertainty(agentLast, agentCurrent, proceduralOutcome);

    // ── UNCERTAINTY PROPAGATION ───────────────
    propagateUncertainty(agentLast, agentCurrent, neuronMap);

    // ── TRAJECTORY COMMITMENT BREAK ───────────
    if (predError.shouldBreakTrajectory) {

        // Soft break: increase exploration without destroying trail.
        window._predictionErrorEpsilonBoost = Math.min(
            predError.compositeError * 0.4,
            0.45
        );

        console.log(
            "🟡 Trajectory softbreak | severity:",
            predError.severity,
            "| error:", predError.compositeError.toFixed(3)
        );

    }

    // ── ATTENTION WIDENING (EPSILON BOOST) ────
    if (predError.attentionWidening > 0.45) {

        window._predictionErrorEpsilonBoost =
            predError.attentionWidening * 0.28;

    } else {

        window._predictionErrorEpsilonBoost = 0;

    }

    // ── EMERGENCY RECOVERY ────────────────────
    if (

        predError.shouldTriggerRecovery &&
        window.homeNeuronId !== undefined

    ) {

        goalNeuronId = window.homeNeuronId;

        console.log(
            "🆘 Massive prediction error → emergency recovery | uncertainty:",
            predError.uncertainty.toFixed(3)
        );

    }

    // ── CURIOSITY SIGNAL ──────────────────────
    if (predError.curiositySignal > 0) {

        const curKey = agentLast + "->" + next;
        const existingCuriosity = curiosityMap.get(curKey) || 0;
        curiosityMap.set(
            curKey,
            Math.min(existingCuriosity + predError.curiositySignal, 5)
        );

    }

    // ── BEHAVIOR STATE MODULATION ─────────────
    applyPredictionErrorToBehavior(predError);

    console.log(
        "🔮 Prediction | severity:", predError.severity,
        "| composite:", predError.compositeError.toFixed(3),
        "| uncertainty:", predError.uncertainty.toFixed(3),
        "| learningAuth:", predError.learningAuthority.toFixed(3),
        "| transUnc:", getTransitionUncertainty(agentLast, next).toFixed(3),
        "| seqErr:", getSequenceError().toFixed(3)
    );

} else {

    // ── FALLBACK Q-UPDATE ─────────────────────
    updateQ({
        state:     agentLast,
        action:    next,
        reward:    rewardSignal,
        nextState: agentCurrent,
        alpha:     0.1,
        gamma:     0.9
    });


    // ======================================
    // 🧠 RECORD INTO SEMANTIC MEMORY LAYER
    // builds noise-suppressed semantic knowledge
    // ======================================

    const fromNeuronSem  = findNeuronById(agentLast);
    const toNeuronSem    = findNeuronById(next);

    if (fromNeuronSem && toNeuronSem) {

        recordSemanticEdge(
            agentLast,
            next,
            fromNeuronSem.userData.label,
            toNeuronSem.userData.label,
            rewardSignal
        );

        // consolidation — strengthen if rewarding
        if (rewardSignal > 0) {
            reinforcePath(
                agentLast,
                next,
                fromNeuronSem.userData.label,
                toNeuronSem.userData.label,
                rewardSignal
            );
        } else if (rewardSignal < 0) {
            weakenPath(agentLast, next, Math.abs(rewardSignal) * 0.3);
        }

        // update attention toward rewarding nodes
        if (rewardSignal > 0) {
            updateAttentionFocus(
                toNeuronSem.userData.embedding,
                rewardSignal
            );
            strengthenAttention(0.005);
        } else if (rewardSignal < -0.5) {
            weakenAttention(0.01);
        }

        // boost activation of visited nodes
        boostActivation(next, Math.min(0.3 + rewardSignal * 0.1, 1));
    }


    // ======================================
    // 🧠 UPDATE UNCERTAINTY ENGINE
    // tracks prediction vs actual outcome
    // ======================================

    const stepPathKey =
        agentLast + "->" + next;

    const predictedQ =
        getQ(agentLast, next);

    updateUncertainty(
        stepPathKey,
        predictedQ,
        rewardSignal
    );


    // ======================================
    // 🧠 ACTIVATE SEMANTIC VITALITY
    // traversing a path activates it
    // strength grows if path leads to success
    // ======================================

    activateSemanticVitality(
        stepPathKey,
        rewardSignal > 0 ? 1.2 : 0.4
    );

    if (rewardSignal < 0) {

        penalizeSemanticPath(
            stepPathKey,
            Math.abs(rewardSignal)
        );
    }


    // ======================================
    // 🧠 RECORD OUTCOME FOR MOTIVATIONAL STATE
    // ======================================

    recordOutcome(rewardSignal > 0);

    // still update sequence tracking on epsilon jumps
    updateSequenceError(agentCurrent);

    // clear epsilon boost on random jumps
    window._predictionErrorEpsilonBoost = 0;

}


// ======================================
// 🧠 BAYESIAN TRUST — RECORD ATTEMPT
// ──────────────────────────────────────
// Every autonomous step is one attempt.
// Successes are recorded separately when
// the goal is verified reached.
// trust = successes / attempts (Bayesian)
// ======================================

if (agentLast !== null && next !== null && agentLast !== next) {

    const attemptKey = agentLast + "->" + next;

    recordAttempt(attemptKey);

}


const prev = agentLast; // 👉 where we were before
const current = next;      // 👉 where we moved now

// ======================================
// 🧠 PUSH CURRENT INTO RECENT MEMORY NOW
// ──────────────────────────────────────
// Push current BEFORE the goal-reached check so that
// recordAutonomousSuccess has a non-empty recentMemory
// to build the episode path from. Previously this push
// happened AFTER the check, so unique:0 was always seen
// and 24/25 goal reaches were blocked as "trivial path".
// ======================================
if (current !== null && current !== prev) {
    recentMemory.push(current);
    if (recentMemory.length > 6) {
        recentMemory.shift();
    }
    if (window.recentMemory) {
        window.recentMemory = [...recentMemory];
    }
}

// 🧪 curiosity = "I explored this path"
const key = prev + "->" + current;

// get old curiosity (how many times we explored this path)
const oldCuriosity = curiosityMap.get(key) || 0;        // if not exist -> starts from zero

// ======================================
// 🧠 novelty excitement
// unexplored paths feel exciting
// ======================================

let curiosityGain = 0.03;


// first-time exploration bonus
if (oldCuriosity < 0.2) {

    curiosityGain += 0.12;

}


// semantic discovery bonus
if (rewardSignal > 0) {

    curiosityGain += 0.04;

}


let newCuriosity =
oldCuriosity + curiosityGain;

// set maximum limit
const MAX_CURIOSITY = 5;                                // brain cannot over-focus beyond this

// clamp value safely
newCuriosity = Math.min(newCuriosity, MAX_CURIOSITY);

// Save update curiosity back to memory
curiosityMap.set(
key,
newCuriosity                                        // store controlled value
);

// ===============================
// 🏆 2. REWARD (goal reached)
// ===============================
if (current === goalNeuronId) {

  // =====================================
  // SAVE FULL SUCCESSFUL EPISODE
  // Use recentMemory (actual agent path)
  // NOT thoughtTrail (click history)
  // =====================================

  // Convert neuron IDs into words from actual agent path
  const episodeWords = recentMemory.map(id => {
      const n = neuronMap.get(Number(id));
      return n ? n.userData.label : String(id);
  });

  // add the final goal step too
  const goalN = neuronMap.get(Number(current));
  if (goalN && !episodeWords.includes(goalN.userData.label)) {
      episodeWords.push(goalN.userData.label);
  }

  // ================================================================
  // 🧠 UNIFIED EPISODIC COMMIT — AUTONOMOUS SUCCESS
  // ================================================================
  // All validation, semantic reinforcement, trust, consolidation,
  // and replay-storage now run through episodeManager.
  // The old inline episodes.push + reinforceEpisodeSemantics +
  // episodes.shift was fragmented and duplicated logic.
  // One call handles the full pipeline with correct authority.
  // ================================================================

  recordAutonomousSuccess(recentMemory, current, neuronMap, {
      confidenceState,
      stressState,
      fatigueState,
      curiosityState,
      predictionError: getRollingError ? getRollingError() : 0
  });

  
  // ======================================
  // 🧠 REWARD DECAY LEARNING
  // prevents infinite dopamine addiction
  // ======================================

  const oldReward =

      rewards.get(key) || 0;


  // decay old reward slightly
  const decayedReward =

      oldReward * 0.995;


  // add new reward safely
  const newReward =

      Math.min(

          decayedReward + 1,

          8   // hard cap at 8, not 15 — prevents qValue*14 = 1000+ scores

      );


  rewards.set(

      key,

      newReward

  );


  // ================== REWARD WHOLE RECENT PATH ==================
  // DIRECT_EXPERIENCE provenance (1.00) — real goal-reach
  // This is the highest authority write in the system.

  for (let i = 0; i < recentMemory.length - 1; i++) {

    const from = recentMemory[i];
    const to   = recentMemory[i + 1];
    const pathKey = from + "->" + to;

    // provenance-weighted: full authority (1.00) for goal-reach
    writeReward(rewards, pathKey, 0.5, PROVENANCE.DIRECT_EXPERIENCE, 8);
    logActivation(pathKey, PROVENANCE.DIRECT_EXPERIENCE);

    // ======================================
    // 🧠 AUTONOMOUS SUCCESS → REAL TRUST
    // ──────────────────────────────────────
    // This is the ONLY place where genuine
    // trust should grow significantly.
    // +5 per verified step (was +1 = wrong).
    // Manual click gave +10 with no proof.
    // Now: real proof gives 5x what teaching gave.
    // ======================================
    const oldConfidence = confidenceMap.get(pathKey) || 0;
    confidenceMap.set(pathKey, Math.min(oldConfidence + 5, 100));

    // ======================================
    // 🧠 BAYESIAN TRUST TRACKING
    // ──────────────────────────────────────
    // Records verified success in the
    // success/attempt ratio system.
    // getPathTrust(pathKey) now returns
    // real earned certainty [0→1].
    // ======================================
    recordSuccess(pathKey);
  }
}

// ===============================
// ⚠️ 3. PENALTY — only for genuinely bad moves
// not for every untrained neutral path
// ===============================
else if (rewardSignal < 0) {
  
  const oldPenalty = penalties.get(key) || 0;
  // grow penalty slowly, hard cap at 5
  penalties.set(key, Math.min(oldPenalty + 0.1, 5));

  // bad path loses confidence
  const oldConfidence = confidenceMap.get(key) || 0;
  confidenceMap.set(key, Math.max(oldConfidence - 0.5, 0));
}




// ================== 🧠 MEMORY LEARNING ==================
// Only write transition memory for actual graph neighbors.
// prev→current where eat(9) is not a graph neighbor of milk(7)
// would otherwise build transitions[7][9] > 5, making the
// isEpisodeTrained guard pass and milk→eat enter the candidate pool.

const prevNeuronForMem = findNeuronById(prev);
const isGraphNeighborForMem =
    prevNeuronForMem &&
    Array.isArray(prevNeuronForMem.userData.neighbors) &&
    prevNeuronForMem.userData.neighbors.includes(Number(current));

if (isGraphNeighborForMem) {
    const map = transitions.get(prev) || new Map();
    map.set(current, (map.get(current) || 0) + 1);
    transitions.set(prev, map);
}

// ================== 🎯 REWARD SYSTEM ==================

if (goalNeuronId && current === goalNeuronId) {

    const key = prev + "->" + current;

    // ======================================
    // 🧠 MINIMUM CAUSAL DEPTH — Fix 3+4
    // ──────────────────────────────────────
    // Human analogy: "Did I actually earn
    // this result by doing real work, or
    // did I just stumble onto it by luck?"
    //
    // A path of 1–2 steps to the goal
    // (X→eat, or Y→Z→eat) is almost certainly
    // a shortcut, not the trained sequence.
    //
    // The trained path is 4 steps:
    // lion→hunt→meat→eat
    //
    // Path length ≥ 4: full goal reward
    // Path length = 3: 60% reward
    // Path length = 2: 20% reward (weak)
    // Path length ≤ 1: penalty applied
    //
    // "Full episode reinforced" already has
    // the episodeUnique≥3 guard for replay
    // storage. This guard handles the direct
    // reward signal that Q-learning propagates.
    // ======================================

    const pathDepth = recentMemory.length;

    // trajectory confidence of the final step
    const finalStepTC = trajectoryConfidence(prev, current);

    if (pathDepth <= 1) {

        // 1-hop shortcut: punish and don't reward
        const existingPenalty = penalties.get(key) || 0;
        penalties.set(key, Math.min(existingPenalty + 1.5, 8));
        console.log(
            "⚠️ Shortcut blocked:", 
            findNeuronById(prev)?.userData.label,
            "→",
            findNeuronById(current)?.userData.label,
            "(depth=1)"
        );

    } else {

        // Reward scales with path depth AND trajectory confidence
        // depthFactor: 2-step=0.2, 3-step=0.5, 4-step=0.85, 5+=1.0
        const depthFactor = Math.min((pathDepth - 1) / 3.5, 1.0);

        // tcFactor: if final step was never in an episode, reduce reward
        const tcFactor = 0.3 + 0.7 * finalStepTC;

        const scaledReward = 3 * depthFactor * tcFactor;

        rewards.set(key, Math.min((rewards.get(key) || 0) + scaledReward, 8));

        // ======================================
        // 🧠 GOAL-REACHED STRESS RELIEF
        // ──────────────────────────────────────
        // Stress was frozen at 12.6 because the
        // per-step decay (-0.008) was far too slow
        // to overcome the loop-detection build
        // (+0.3 per repeated pair). Net: +0.8/step.
        //
        // Reaching a goal is a genuine success
        // event — the companion should feel relief.
        // Deep paths earn more relief (real work).
        // Shortcuts earn less (lucky stumble).
        //
        // Human analogy: finally solving a hard
        // problem feels much better than accidentally
        // getting the right answer by luck.
        // ======================================

        const stressRelief = pathDepth >= 4
            ? 3.0   // deep earned path — real relief
            : pathDepth >= 3
                ? 1.5   // medium path — partial relief
                : 0.3;  // shortcut — barely any relief

        changeStress(-stressRelief);  // negative = reduce stress

        console.log("🎉 Goal-reached → reward!", scaledReward.toFixed(2),
            "(depth:", pathDepth, "tc:", finalStepTC.toFixed(2), ")");
    }

    // ======================================
    // 🧠 CRITICAL FIX: RESET AFTER GOAL
    // agent must start fresh after reaching goal
    // prevents eat→eat→eat→tiger garbage loops
    // clears recentMemory so next episode is clean
    // ======================================
    
    // clear recent memory — next episode starts fresh
    recentMemory.length = 0;
    window.recentMemory = [];


    // seal episode into vault
    sealCurrentEpisode("goal_reached");
    rewardCurrentEpisode(10);

    // reset attention for next episode
    resetAttentionFocus();

    // boost activation of goal node strongly
    boostActivation(Number(current), 1.0);

    // ======================================
    // 🧠 RESET PREDICTION EXPECTATION
    // ──────────────────────────────────────
    // Stale expectation from the goal-reaching
    // step must not carry over into the new
    // episode starting from a random neuron.
    // ======================================
    resetExpectation();

    // clear epsilon boost on fresh episode start
    window._predictionErrorEpsilonBoost = 0;

    // ──────────────────────────────────────────────────
    // 🛡️ RESET TO NON-GOAL NODE
    // ──────────────────────────────────────────────────
    // The random reset pool must EXCLUDE the goal node.
    // Previously the reset could land on eat(9) itself,
    // making the agent immediately eligible for another
    // goal reward in one step — creating an instant loop.
    //
    // Also reset lastDecision so the stale "Chose: eat→meat
    // (score: 2038)" display from the previous step
    // doesn't pollute the reasoning box at the start of
    // the new episode.
    // ──────────────────────────────────────────────────
    const allIds = Array.from(neuronMap.keys())
        .filter(id => Number(id) !== Number(goalNeuronId));

    agentCurrent = allIds[Math.floor(Math.random() * allIds.length)];
    agentLast    = agentCurrent;

    // Fix C — clear stale lastDecision display on reset
    lastDecision = null;

    console.log("🔄 Reset after goal → starting from:", agentCurrent);



    // ==========================================
    // 🧠 LONG-TERM EPISODIC MEMORY REINFORCEMENT
    // reward COMPLETE successful chain
    // example:
    // lion -> hunt -> meat -> eat
    // ==========================================

    recentMemory.forEach((step, i) => {

        const old = episodeRewards.get(step) || 0; // old memory strength

        episodeRewards.set(                       // strengthen full successful chain

            step,

            old + ((i + 1) * 2)

            // later steps get stronger reward
            // lion->hunt = +2
            // hunt->meat = +4
            // meat->eat = +6

        );

    });



    console.log("🧠 Full episode reinforced");

}

// ================== ❌ PENALTY SYSTEM ==================

if (safeScore < 0){                              // only punish very bad path
  // 👉 sometimes punish random paths
  
  const badKey = prev + "->" + current;
  
  // 🧠 controlled bad-path punishment

  const oldBadPenalty =

      penalties.get(badKey) || 0;


  const newBadPenalty =

      Math.min(oldBadPenalty + 0.1, 5);


  penalties.set(

      badKey,

      newBadPenalty

  );
}

// ================== ⚡ SIGNAL SYSTEM ==================

const signalKey = prev + "->" + current;

signals.set(signalKey, (signals.get(signalKey) || 0) + 1);       // 👉 stronger signal = more important path


// ================== ⏱ TIME MEMORY ==================

const timeKey = prev + "->" + current;

timeMemory.set(timeKey, Date.now());
// 👉 remember when this path was used

console.log("🧠 Self learned:", prev, "→", current);

// ================================================================
// 🧠 UNIFIED EPISODIC RECORD — AUTONOMOUS EXPLORATION STEP
// ================================================================
// Non-goal steps flow into the episodeManager with
// autonomous_explore authority (procedural only, no trust,
// no store). This replaces the direct transitions/Q writes
// that previously happened in the click handler and ad-hoc.
//
// Goal-reaching steps are already handled by
// recordAutonomousSuccess (called earlier in this block).
// ================================================================

if (Number(current) !== Number(goalNeuronId)) {
    recordAutonomousStep(prev, current, neuronMap);
}

}

// ================== UPDATE MEMORY ==================

agentLast = agentCurrent;                       // 👉 store current as "previous" for next step


// ================== MOVE FORWARD ==================

// ──────────────────────────────────────────────────
// 🛡️ GOAL-RESET GUARD
// ──────────────────────────────────────────────────
// When the goal was reached inside the self-learning
// block above, agentCurrent was set to a FRESH random
// node and agentLast was set to match it.
//
// Without this guard the next line (agentCurrent=next)
// overwrites that reset — because `next` was computed
// BEFORE the goal-reached check — and puts the agent
// back at the goal node. This created the instant
// meat→eat→meat oscillation (observed: "Reset after
// goal → starting from: 9", then immediately "eat→meat").
//
// The guard checks whether `next` is still the goal:
// if it is, the reset already happened and we must NOT
// move forward to `next`. The agent will start fresh
// in the next runAgent call from the random position.
// ──────────────────────────────────────────────────

const _goalResetJustHappened =
    goalNeuronId !== null &&
    Number(next) === Number(goalNeuronId);

if (next !== null && !_goalResetJustHappened) {
  agentCurrent = next;
  // 👉 agent moves to next neuron


  // ======================================
  // 🧠 RECORD SEMANTIC ACTIVATION
  // ──────────────────────────────────────
  // Record that the brain ACTUALLY traversed
  // agentLast → agentCurrent. This increments
  // refractory strength for this concept pair.
  //
  // Recording uses LABELS not IDs so the
  // refractory system operates at concept level,
  // generalizing to all future concepts.
  //
  // Note: called BEFORE energy/fatigue updates
  // because recording is movement-driven,
  // not energy-driven.
  // ======================================

  const fromNeuronSem = neuronMap.get(Number(agentLast));
  const toNeuronSem   = neuronMap.get(Number(agentCurrent));

  if (fromNeuronSem && toNeuronSem) {

      recordSemanticActivation(
          fromNeuronSem.userData.label,
          toNeuronSem.userData.label
      );

  }


  // ======================================
  // 🧠 ENERGY SYSTEM
  // movement costs energy
  // home restores energy
  // ======================================

  // normal movement fatigue
  changeFatigue(0.05);

  // recover at home
  if (

      agentCurrent === window.homeNeuronId

  ) {

      // deep recovery
      changeFatigue(-0.4);

      console.log(

          "😴 Resting at home"

      );
  }


  // ======================================
  // 🧠 VISUAL TRAINING FLOW
  // show brain movement during learning
  // ======================================

  // get neurons
  const fromNeuron =
  findNeuronById(agentLast);

  const toNeuron =
  findNeuronById(next);

  // safety check
  if (fromNeuron && toNeuron) {

      // create line
      const geometry =
      new THREE.BufferGeometry().setFromPoints([

          fromNeuron.position,

          toNeuron.position

      ]);

      // glowing learning color
      const material =
      new THREE.LineBasicMaterial({

          color: 0x00ffff,

          transparent: true,

          opacity: 0.8

      });

      // create visual path
      const line =
      new THREE.Line(geometry, material);

      group.add(line);

      // remove later
      setTimeout(() => {

          group.remove(line);

      }, 1500);

      // ======================================
      // moving thought dot
      // ======================================

      const dot =
      new THREE.Mesh(

          new THREE.SphereGeometry(0.05, 8, 8),

          new THREE.MeshBasicMaterial({

              color: 0xffff00

          })

      );

      dot.userData = {

          start: fromNeuron.position.clone(),

          end: toNeuron.position.clone(),

          progress: 0

      };

      group.add(dot);

      // animate flow
      const interval = setInterval(() => {

          dot.userData.progress += 0.03;

          // reached destination
          if (dot.userData.progress >= 1) {

              group.remove(dot);

              clearInterval(interval);

              return;
          }

          // move dot
          dot.position.lerpVectors(

              dot.userData.start,

              dot.userData.end,

              dot.userData.progress

          );

      }, 30);
  }
  
  // add visited neuron to recent memory
  // recentMemory is now pushed earlier (right after current/prev assignment)
  // so the goal-reached check always has a non-empty episode path.
  // Only thoughtTrail is pushed here for the visual breadcrumb.
  if (!_goalResetJustHappened) {
    thoughtTrail.push(agentCurrent);
    if (thoughtTrail.length > 6) {
      thoughtTrail.shift();
    }
  }
}


// 🧠 move forward (like brain thinking next step)
//agentCurrent = goalNeuronId || agentCurrent;

}

// ================= SAFE LOOP CONTROLLER =================
function runAgentLoop() {
  
  if (!agentRunning) return; // 🛑 stop if turned off

  // ======================================
  // 🧠 SEMANTIC REFRACTORY DECAY
  // ──────────────────────────────────────
  // Called ONCE per loop cycle (≈500ms),
  // NOT inside runAgent (would fire 5× per cycle).
  //
  // Allows gradual recovery of semantic pairs
  // that have been recently traversed.
  // After ~3-5s without traversal, a pair
  // returns to full semantic strength (factor→1.0).
  // ======================================
  decaySemanticActivations();

  // decay per-transition uncertainties once per loop
  // allows transitions that later become stable
  // to recover toward low uncertainty over time
  decayTransitionUncertainties();

  // ── EPISTEMIC LEDGER DECAY ────────────────
  // uncertainty/volatility heal when stable.
  decayUncertaintyLedger();

  // decay new cognitive systems
  decayActivations(0.93);
  wmDecay();

  // semantic memory and consolidation decay (less frequent)
  if (Math.random() < 0.1) {
      decaySemanticMemory();
      decayConsolidation();

      // ======================================
      // 🧠 TRUST DECAY
      // ──────────────────────────────────────
      // Unused paths slowly lose certainty.
      // Prevents old stale trust from
      // dominating over fresh experience.
      // Rate 0.9997 = very slow — ~1000 steps
      // to halve a well-established trust.
      // ======================================
      decayTrust(0.9997);

      // Rebuild abstract schemas from recurring motifs.
      rebuildSchemas(getAllEpisodes());

      // Rebuild episodic adjacency memory so trajectory
      // confidence scores stay current with new episodes.
      rebuildAdjacencyMemory();
  }

  // offline consolidation pass during replay phase
  if (Math.random() < 0.05) {
      runConsolidationPass(rewards, Q, transitions);
  }

  
  for (let i = 0; i < 5; i++) {
    runAgent();                    // 5 thinking steps per frame
  }
  
  loopId = setTimeout(runAgentLoop, agentSpeed); // 🔁 repeat safely
  
}

// ================== 🤖 CONTROL ==================

// press SPACE → start / stop AI
window.addEventListener("keydown", (e) => {


  // ======================================
  // 🧠 EPISODE BOUNDARIES ARE STRUCTURAL
  // ──────────────────────────────────────
  // The old "press N for a new pass" hack is
  // gone. Episode boundaries are now a real
  // architectural concept: a training episode
  // is sealed automatically when the goal is
  // reached or when a node is revisited. No
  // keyboard reset is needed or wanted.
  // ======================================


  // SHIFT+R = emergency brain wipe
  if (e.code === "KeyR" && e.shiftKey) {

      agentRunning = false;
      if (loopId) clearTimeout(loopId);

      localStorage.removeItem("brain");

      transitions.clear();
      rewards.clear();
      penalties.clear();
      signals.clear();
      curiosityMap.clear();
      Q.clear();
      confidenceMap.clear();

      // clear episodic memory too
      clearAllEpisodes();

      agentCurrent = null;
      agentLast    = null;
      goalNeuronId = null;

      reasoningBox.innerText =  "🧠 Brain wiped — press SPACE to restart";

      console.log("🧹 Brain wiped. Press SPACE to restart agent.");
      return;
  }

  // if SPACE key is pressed
  if (e.code === "Space") {
    
    if (!agentRunning) {
      agentRunning = true;
      console.log("🚀 Agent STARTED");
      runAgentLoop(); // start Safe loop
    } else {
    agentRunning = false;
    console.log("⛔ Agent STOPPED");
    clearTimeout(loopId);                      // stop loop completely
  }
}
});


// ================== CLICK ==================
// memory

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let lastClicked = null;

window.addEventListener('click', (event) => {


  // ======================================
  // CONVERT MOUSE TO 3D SPACE
  // ======================================

  mouse.x = (event.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(group.children);

  if (intersects.length === 0) return;

  const obj = intersects.find(i => i.object.userData.isNeuron)?.object;

  if (!obj) return;

  console.log("Neuron clicked:", obj.userData.label);


  // ======================================
  // HIGHLIGHT NEURONS
  // ======================================

  // reset all colors
  neuronMap.forEach(n => {
    n.material.color.set(0xffffff);
  });

  // highlight clicked neuron
  obj.material.color.set(0xff0000);

  // highlight neighbors
  obj.userData.neighbors.forEach(id => {
    const n = findNeuronById(id);
    if (n) n.material.color.set(0x00ff00);
  });


  // ================================================================
  // 🧠 UNIFIED EPISODIC TRAINING — MANUAL CLICK
  // ================================================================
  // One call. The episode manager handles boundary detection,
  // revisit sealing, goal-terminus detection, and the full
  // learning pipeline. No local episode state here.
  // ================================================================

  {
    const clickedId = obj.userData.id;
    const isGoalClick =
        goalNeuronId !== null &&
        Number(clickedId) === Number(goalNeuronId);

    recordManualClick(clickedId, obj.userData.label, isGoalClick);
  }


  // ======================================
  // 🧠 AUTO SEQUENCE RESET
  // check BEFORE updating lastNeuron
  // resets only when goal is reached
  // ======================================

  const reachedGoal =
      goalNeuronId !== null &&
      obj.userData.id === goalNeuronId;

  if (reachedGoal) {

      // goal reached — next click starts fresh
      window.lastNeuron = undefined;

      console.log("🧠 Episode complete — ready for next run");

  } else {

      // normal click — update lastNeuron for learning
      window.lastNeuron = obj.userData.id;

  }


  // ======================================
  // ATTENTION MEMORY
  // ======================================

  const id = obj.userData.id;
  attentionMap.set(id, (attentionMap.get(id) || 0) + 1);

  // decay others
  attentionMap.forEach((value, key) => {
    if (key !== id) {
      attentionMap.set(key, value * 0.95);
    }
  });


  // ======================================
  // HANDLE SPECIAL CLICKS
  // ======================================

  console.log("Prediction running");

  const clickedId = obj.userData.id;

  // SHIFT + CLICK = set goal
  if (event.getModifierState("Shift")) {

      goalNeuronId = clickedId;

      // shift attention toward goal embedding
      const goalN = findNeuronById(clickedId);
      if (goalN) {
          setGoalAttention(goalN.userData.embedding);
      }

      // ======================================
      // 🧠 CLEAN WRAPAROUND LOOPS
      // ──────────────────────────────────────
      // The taught path ENDS at this goal.
      // Remove any learned transitions OUT of
      // the goal — they are wraparound artifacts
      // from repeating the training sequence and
      // would turn the taught path into a loop.
      // ======================================
      pruneGoalWraparound(clickedId);

      // reset manual training session
      window.lastNeuron = undefined;

      console.log("🎯 Goal set:", obj.userData.label);
      return;
  }

  // ALT + CLICK = set home node
  if (event.altKey) {

    window.homeNeuronId = clickedId;

    console.log("🏠 Home neuron learned:", clickedId);

    return;

  }


  // ======================================
  // NORMAL CLICK — RUN PREDICTION
  // ======================================

  currentGoal = obj.userData.label;

  // thoughtTrail is kept ONLY as a short visual
  // breadcrumb for the prediction renderer — it
  // is no longer a learning signal.
  thoughtTrail.push(clickedId);

  if (thoughtTrail.length > 5) {
    thoughtTrail.shift();
  }

  // ======================================
  // 🧠 GOAL-TERMINUS GUARD
  // ──────────────────────────────────────
  // When the clicked node is the goal, the
  // episode was just committed by recordManualClick
  // above. Q[meat->eat] is now updated.
  //
  // We do NOT run runPrediction from eat —
  // eat has no trained outgoing paths and its
  // graph neighbors (food, meat) would show
  // Q=0, misleading the user into thinking
  // training failed.
  //
  // Instead: immediately refresh the HUD with
  // the freshly trained Q value for the final
  // step (e.g. meat→eat), giving clear visual
  // confirmation that training worked.
  // ======================================
  if (goalNeuronId !== null &&
      Number(clickedId) === Number(goalNeuronId)) {

      // Find the node that LED INTO the goal.
      // thoughtTrail holds the last few clicks.
      // The second-to-last entry is the pre-goal node.
      const preGoalId = thoughtTrail.length >= 2
          ? thoughtTrail[thoughtTrail.length - 2]
          : null;

      const freshQ = preGoalId !== null
          ? getQ(preGoalId, clickedId)
          : 0;

      const preGoalNeuron = preGoalId
          ? findNeuronById(preGoalId)
          : null;

      const goalNeuron = findNeuronById(clickedId);

      // Refresh HUD with the just-trained values
      updateHUD({
          curiosityState,
          confidenceState,
          stressState,
          fatigueState,
          focusState,
          qValue:      freshQ,
          futureBonus: 0,
          finalWeight: freshQ * 5,
          currentThought:
              (preGoalNeuron?.userData.label || "?") +
              " → " +
              (goalNeuron?.userData.label  || "?") +
              "  ✅ trained"
      });

      reasoningBox.innerText =
          "🎯 Goal reached: " + obj.userData.label +
          "\n\n✅ Episode sealed & learned." +
          (preGoalNeuron
              ? "\n\nFinal step trained:" +
                "\n  " + preGoalNeuron.userData.label +
                " → " + obj.userData.label +
                "\n  Q-value: " + freshQ.toFixed(2)
              : "") +
          "\n\nPress SPACE to start autonomous training.";

  } else {

      // ======================================
      // 🧠 SKIP PREDICTION FOR UNTRAINED NODES
      // ──────────────────────────────────────
      // If the clicked node has no trained
      // outgoing transitions AND no goal set,
      // running prediction would show Q=0 for
      // all graph neighbors — confusing the user
      // into thinking training didn't work.
      //
      // Example: clicking 'eat' during manual
      // training (no goal) shows eat->food Q=0,
      // eat->meat Q=0 even though meat->eat was
      // just added to the episode buffer.
      //
      // Show the training progress instead.
      // ======================================
      const clickedNeuron = findNeuronById(clickedId);
      const clickedTransitions = transitions.get(clickedId);
      const hasTrainedOutgoing =
          clickedTransitions && clickedTransitions.size > 0;

      if (hasTrainedOutgoing || goalNeuronId !== null) {
          runPrediction(clickedId);
      } else {
          // Node has no trained outgoing paths and no goal set.
          // Show what's been built so far in the training episode.
          const preId = thoughtTrail.length >= 2
              ? thoughtTrail[thoughtTrail.length - 2]
              : null;
          const incomingQ = preId ? getQ(preId, clickedId) : 0;

          const preN  = preId ? findNeuronById(preId) : null;
          const thisN = clickedNeuron;

          reasoningBox.innerText =
              "📖 Training in progress..." +
              (preN && thisN
                  ? "\n\n  " + preN.userData.label +
                    " → " + thisN.userData.label +
                    "\n  Q (pending commit): " + incomingQ.toFixed(2)
                  : "") +
              "\n\nEpisode seals when you click the first node again" +
              "\nor Shift+click a node to set it as the goal.";
      }

  }

  // store time for previous → current
  if (window.lastClicked !== undefined) {

    const timeKey = window.lastClicked + "->" + clickedId;
    timeMemory.set(timeKey, Date.now());

    // homeosensory loop breaker
    if (window.lastClicked === clickedId) {
      changeFatigue(15.0);
    }

  }

  window.lastClicked = clickedId;


});
    


// NOTE: a dead second keydown handler was removed here.
// It referenced `agentActive` (never declared) and
// `agentLoop()` (never defined — the real loop is
// runAgentLoop). Pressing 'a' would throw a ReferenceError.
// Agent control is the SPACE-key handler above.
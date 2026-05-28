// ======================================
// 🧠 SEMANTIC PROVENANCE SYSTEM
// ======================================
// Every semantic write carries a source tag.
// Source determines how much learning authority
// the write receives — preventing hallucinated
// reinforcement, replay pollution, and LLM
// contamination before Ollama integration.
//
// PROVENANCE HIERARCHY (authority weight):
//
//   DIRECT_EXPERIENCE  1.00  agent reaches goal, real reward
//   MANUAL_TRAINING    0.90  human click, deliberate teaching
//   AUTONOMOUS_ACTION  0.75  agent traversal without goal reach
//   REPLAY_MEMORY      0.30  replay consolidation of past episodes
//   SEMANTIC_INFERENCE 0.18  transitivity / compositional inference
//   IMAGINATION        0.10  look-ahead planning, simulated paths
//   LLM_GENERATED      0.04  Ollama output — treat as hypothesis
//
// MATHEMATICAL PROOF OF CURRENT FAILURE:
//
// replay.js line 488:
//   rewardsRef.set(key, (rewardsRef.get(key) || 0) + 0.05)
// main.js agent goal-reach:
//   rewards.set(key, min(old + 0.5, 8))
//
// Both write to the same Map with comparable magnitude.
// Replay fires every ~4s on random episodes.
// Over 100 replay cycles: replay adds 5.0 to a path's reward.
// Real agent validation adds 0.5 per goal-reach.
// Replay can inject MORE authority than real experience.
//
// SOLUTION:
// All write operations pass through provenance-weighted
// multipliers. Replay adds 0.05 × 0.30 = 0.015 per cycle.
// Real experience adds 0.5 × 1.00 = 0.50 per cycle.
// Ratio is now 33× in favor of real experience.
// ======================================


// ======================================
// HELPERS
// ──────────────────────────────────────
// growReward replaces hard Math.min caps.
// Unbounded self-decelerating growth:
// each increment shrinks as value rises.
// Reward keeps growing but slows naturally,
// like a real habit that stops saturating.
// ======================================

import { growReward } from "./helpers.js";


// ======================================
// PROVENANCE TIERS
// ──────────────────────────────────────
// Import these constants wherever semantic
// writes occur. Pass the appropriate tier
// to getProvenanceAuthority().
// ======================================

export const PROVENANCE = {
    DIRECT_EXPERIENCE:  "direct",
    MANUAL_TRAINING:    "manual",
    AUTONOMOUS_ACTION:  "autonomous",
    REPLAY_MEMORY:      "replay",
    SEMANTIC_INFERENCE: "inference",
    IMAGINATION:        "imagination",
    LLM_GENERATED:      "llm"
};


// ======================================
// AUTHORITY WEIGHTS
// ──────────────────────────────────────
// Fractional multipliers applied to all
// semantic writes: rewards, transitions,
// embedding training, uncertainty updates.
// ======================================

const AUTHORITY = {
    direct:     1.00,
    manual:     0.90,
    autonomous: 0.75,
    replay:     0.30,
    inference:  0.18,
    imagination: 0.10,
    llm:        0.04
};


export function getProvenanceAuthority(source) {
    return AUTHORITY[source] || 0.10;
}


// ======================================
// PROVENANCE-WEIGHTED REWARD WRITE
// ──────────────────────────────────────
// Replace direct rewards.set() calls with
// this function to enforce provenance.
//
// amount: the raw reward increment
// source: PROVENANCE tier constant
// cap:    maximum reward value (default 8)
//
// Returns the amount actually written
// (after authority scaling and capping).
// ======================================

export function writeReward(rewardsMap, key, amount, source, cap = 8) {

    const authority = getProvenanceAuthority(source);
    const scaledAmount = amount * authority;

    const current = rewardsMap.get(key) || 0;
    // growReward: diminishing-returns growth replaces hard cap.
    // reward keeps growing but slows — like a real habit.
    // cap param kept for API compat but no longer enforced.
    const newVal   = growReward(current, scaledAmount);

    rewardsMap.set(key, newVal);

    return scaledAmount;

}


// ======================================
// PROVENANCE-WEIGHTED TRANSITION WRITE
// ──────────────────────────────────────
// Replace direct transitions.set() with this.
//
// transitionMap: the inner Map for a neuron
// toId: destination neuron ID
// increment: raw count increment
// source: PROVENANCE tier constant
// ======================================

export function writeTransition(transitionMap, toId, increment, source) {

    const authority = getProvenanceAuthority(source);
    const scaledIncrement = increment * authority;

    const current = transitionMap.get(toId) || 0;
    transitionMap.set(toId, current + scaledIncrement);

}


// ======================================
// PROVENANCE RECORD
// ──────────────────────────────────────
// Lightweight log of recent activations
// and their sources. Used for attention
// routing: real-experience activations
// receive higher salience than imagined ones.
//
// Stored per semantic pair key.
// Last N activations with source tags.
// ======================================

const provenanceLog = new Map();  // key → [{source, ts}]
const LOG_WINDOW    = 5;


export function logActivation(key, source) {

    if (!provenanceLog.has(key)) {
        provenanceLog.set(key, []);
    }

    const log = provenanceLog.get(key);
    log.push({ source, ts: Date.now() });

    if (log.length > LOG_WINDOW) {
        log.shift();
    }

}


// ======================================
// GET ACTIVATION DOMINANCE
// ──────────────────────────────────────
// Returns the average authority of recent
// activations for a semantic pair.
//
// High = pair was recently activated by
//        direct experience (trustworthy)
// Low  = pair was recently activated by
//        replay/imagination (speculative)
//
// Used to modulate attention routing:
// pairs with high dominance get stronger
// attentional pull in scoring.
// ======================================

export function getActivationDominance(key) {

    const log = provenanceLog.get(key);

    if (!log || log.length === 0) return 0.50; // neutral

    const recentMs   = Date.now() - 5000; // last 5 seconds
    const recentLogs = log.filter(l => l.ts > recentMs);

    if (recentLogs.length === 0) return 0.30; // old — decays toward low

    const avgAuth = recentLogs.reduce(
        (sum, l) => sum + getProvenanceAuthority(l.source), 0
    ) / recentLogs.length;

    return avgAuth;

}


// ======================================
// SHOULD TRAIN EMBEDDING?
// ──────────────────────────────────────
// Embedding training is expensive and
// permanent. Gate it by provenance:
//
// Only DIRECT and MANUAL sources should
// train embeddings unconditionally.
// REPLAY trains at reduced probability.
// IMAGINATION and LLM never train.
//
// Returns true if embedding should train.
// ======================================

export function shouldTrainEmbedding(source) {

    switch (source) {
        case PROVENANCE.DIRECT_EXPERIENCE:  return true;
        case PROVENANCE.MANUAL_TRAINING:    return true;
        case PROVENANCE.AUTONOMOUS_ACTION:  return Math.random() < 0.40;
        case PROVENANCE.REPLAY_MEMORY:      return Math.random() < 0.12;
        case PROVENANCE.SEMANTIC_INFERENCE: return false;
        case PROVENANCE.IMAGINATION:        return false;
        case PROVENANCE.LLM_GENERATED:      return false;
        default:                            return false;
    }

}
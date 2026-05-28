// ======================================
// 🧠 LONG-TERM MEMORY CONSOLIDATION
// ======================================
// Biological basis: hippocampal replay
// during sleep consolidates episodic
// memories into stable cortical knowledge.
//
// What this does:
//   - Tracks which paths have been reinforced
//     enough to become "consolidated" facts
//   - Runs a lightweight offline consolidation
//     pass that strengthens high-value memories
//   - Weakens paths that consistently fail
//   - Promotes strong episodic paths to
//     stable semantic memory
//   - Prevents memory explosion via
//     selective forgetting of weak traces
// ======================================

import { recordSemanticEdge } from "./semanticMemoryLayer.js";

// ── Consolidation registry ─────────────────────────────────
// key: "fromId->toId"
// value: { reinforcements, lastConsolidated, isStable }
const consolidationRegistry = new Map();

// ── Stable memory set ─────────────────────────────────────
// paths that have been consolidated into long-term memory
const stableMemory = new Set();

// ── Consolidation threshold ───────────────────────────────
const STABLE_THRESHOLD    = 5;   // reinforcements to become stable
const CONSOLIDATION_DECAY = 0.9999; // stable memories barely fade


// ======================================
// REINFORCE PATH
// call after every successful traversal
// and after every manual training step
// ======================================

export function reinforcePath(fromId, toId, fromLabel, toLabel, strength = 1) {

    const key = fromId + "->" + toId;
    const entry = consolidationRegistry.get(key) || {
        reinforcements:    0,
        lastConsolidated:  0,
        isStable:          false,
        fromLabel,
        toLabel
    };

    entry.reinforcements += strength;
    entry.lastConsolidated = Date.now();

    // promote to stable memory
    if (entry.reinforcements >= STABLE_THRESHOLD && !entry.isStable) {
        entry.isStable = true;
        stableMemory.add(key);
        console.log("🏛️ Consolidated:", fromLabel, "→", toLabel);
    }

    consolidationRegistry.set(key, entry);

    // also record in semantic memory layer
    recordSemanticEdge(fromId, toId, fromLabel, toLabel, strength);
}


// ======================================
// WEAKEN PATH
// call after failed traversal or penalty
// ======================================

export function weakenPath(fromId, toId, amount = 0.5) {

    const key = fromId + "->" + toId;
    const entry = consolidationRegistry.get(key);

    if (!entry) return;

    entry.reinforcements = Math.max(0, entry.reinforcements - amount);

    // demote from stable if weakened enough
    if (entry.reinforcements < STABLE_THRESHOLD * 0.4 && entry.isStable) {
        entry.isStable = false;
        stableMemory.delete(key);
        console.log("📉 Destabilized:", entry.fromLabel, "→", entry.toLabel);
    }

    consolidationRegistry.set(key, entry);
}


// ======================================
// RUN CONSOLIDATION PASS
// call during dream/replay phase
// strengthens important memories offline
// ======================================

export function runConsolidationPass(rewards, Q, transitions) {

    let consolidated = 0;

    consolidationRegistry.forEach((entry, key) => {

        if (!entry.isStable) return;

        // stable paths get tiny offline boost
        const currentReward = rewards.get(key) || 0;
        if (currentReward > 0) {
            rewards.set(key, Math.min(currentReward * 1.0002, 8));
            consolidated++;
        }
    });

    // console.log removed: runConsolidationPass fires at 5% chance
    // per agent step during replay (every ~0.5 seconds at 10 steps/sec).
    // "memories reinforced" is a background maintenance process, not an event.
    // The stablePaths count is visible in the HUD reasoning box.
}


// ======================================
// IS STABLE MEMORY
// ======================================

export function isStableMemory(fromId, toId) {
    return stableMemory.has(fromId + "->" + toId);
}


// ======================================
// GET CONSOLIDATION SCORE
// how consolidated is this path?
// [0, 1] range
// used as bonus in decision scoring
// ======================================

export function getConsolidationScore(fromId, toId) {

    const key  = fromId + "->" + toId;
    const entry = consolidationRegistry.get(key);

    if (!entry) return 0;

    const normalized = Math.min(
        entry.reinforcements / STABLE_THRESHOLD,
        1
    );

    // stable memories get extra boost
    return entry.isStable ? normalized * 1.5 : normalized;
}


// ======================================
// DECAY CONSOLIDATION REGISTRY
// very slow — long-term memories persist
// ======================================

export function decayConsolidation() {

    consolidationRegistry.forEach((entry, key) => {

        const rate = entry.isStable
            ? CONSOLIDATION_DECAY       // stable → barely fades
            : 0.9995;                   // building → fades a bit

        entry.reinforcements *= rate;

        if (entry.reinforcements < 0.01) {
            consolidationRegistry.delete(key);
            stableMemory.delete(key);
        }
    });
}


// ======================================
// GET SUMMARY
// ======================================

export function getConsolidationSummary() {
    return {
        totalPaths:  consolidationRegistry.size,
        stablePaths: stableMemory.size
    };
}
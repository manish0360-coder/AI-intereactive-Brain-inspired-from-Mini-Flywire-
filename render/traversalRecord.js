// ======================================
// 📒 TRAVERSAL EVIDENCE BOUNDARY RECORD
// ======================================
// The production-owned record of ACTUAL traversal outcomes, specified by
// FUTURESCORE_BOUNDARY_RECORD_DESIGN.md and required by the frozen
// FutureScore V2.2 / V2.3 contracts.
//
// It stores one thing per canonical directed edge:
//
//     { a: attempts, s: successes }       a >= s >= 0
//
// WHAT MAY WRITE HERE
// -------------------
// Exactly one call site: the post-outcome decision boundary in main.js, after
// the environment's verdict on the attempted traversal is known and before the
// agent's position changes. Nothing else. In particular NOT
// episodeManager._updateTrust, NOT main.js:4361, NOT main.js:4558, and no
// reward, penalty, curiosity, recency, habit or episode-level writer: those are
// pre-outcome or episode-level signals and are inadmissible as traversal
// evidence (V2.2 D7).
//
// WHAT THIS MODULE DOES NOT TOUCH
// -------------------------------
// No RNG, no clock, no instrumentation, no environment probability, no oracle,
// no curiosity, no Q-values, no decision-state history, and no persistence.
// It reads the graph adjacency only, to reject pairs that are not real edges.
//
// This record is WRITE-ONLY in this milestone: nothing consumes it yet, so the
// agent's behaviour is unchanged. FutureScore may consume it only under a
// separate authorisation.
// ======================================

import { findNeuronById } from "./search.js";


// ======================================
// STORAGE (module-private)
// ======================================

const record = new Map();


// ======================================
// CANONICAL EDGE KEY
// ──────────────────────────────────────
// Directed and numeric: "3->7". Direction
// is kept because FutureScore accumulates
// directed steps. Number() normalisation
// removes the string/number ambiguity that
// other key conventions in this codebase
// carry.
// ======================================

function keyOf(from, to) {

    return `${Number(from)}->${Number(to)}`;

}


// ======================================
// ADJACENCY VALIDATION
// ──────────────────────────────────────
// Only a declared graph edge may be
// recorded. The adjacency is the one built
// from connections.json at load
// (render/connections.js), never the M7
// harness view of the graph.
// ======================================

function isDeclaredEdge(from, to) {

    try {

        const neuron = findNeuronById(from);
        const neighbors = neuron && neuron.userData && neuron.userData.neighbors;

        if (!Array.isArray(neighbors)) return false;

        return neighbors.some(id => Number(id) === Number(to));

    } catch {

        // the neuron map is not wired yet: nothing is a declared edge
        return false;

    }

}


// ======================================
// RECORD ONE POST-OUTCOME TRAVERSAL
// ──────────────────────────────────────
// from, to     the edge actually attempted
// succeeded    the environment's verdict
//
// Returns true when the event was recorded.
// The return value exists for the gates;
// the caller discards it.
// ======================================

export function recordOutcome(from, to, succeeded) {

    const f = Number(from);
    const t = Number(to);

    if (!Number.isFinite(f) || !Number.isFinite(t)) return false;
    if (f === t) return false;                       // a self-pair is not a traversal
    if (!isDeclaredEdge(f, t)) return false;

    const key = keyOf(f, t);
    const entry = record.get(key);

    // s increments only on a literal true, so a truthy non-boolean can never
    // manufacture a success and break s <= a
    const hit = (succeeded === true) ? 1 : 0;

    if (entry) {
        entry.a += 1;
        entry.s += hit;
    } else {
        record.set(key, { a: 1, s: hit });
    }

    return true;

}


// ======================================
// READ ONE EDGE (READ-ONLY)
// ──────────────────────────────────────
// Returns a COPY, so a consumer cannot
// mutate stored evidence. An unobserved
// edge reads { a: 0, s: 0 }.
// ======================================

export function recordFor(from, to) {

    const entry = record.get(keyOf(from, to));

    return entry ? { a: entry.a, s: entry.s } : { a: 0, s: 0 };

}


// ======================================
// CLEAR
// ──────────────────────────────────────
// Used by the brain wipe. A reset is not
// an evidence writer. The record is never
// persisted, so it also starts empty on
// every load.
// ======================================

export function clear() {

    record.clear();

}

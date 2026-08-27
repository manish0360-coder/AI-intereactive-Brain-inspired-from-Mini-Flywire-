// ======================================
// 🧠 ADVANCED Q LEARNING SYSTEM
// ======================================



// ======================================
// Q TABLE MEMORY
// ======================================

// stores learned intelligence
export const Q = new Map();



// ======================================
// STATE KEY COMPOSER
// ──────────────────────────────────────
// Combines position and active goal into
// a single string state key.
//
// DELIMITER RULE: uses "#" to separate
// position from goal. "#" must never
// appear in node ids or goal ids.
// The action delimiter "->" is reserved
// for the outer key "state->action" only.
//
// NULL GOAL: when no goal is active,
// pass GOAL_NONE (0) as the sentinel.
// This produces a valid key "5#0" rather
// than the degenerate "5#null".
//
// INVARIANT: makeStateKey output must
// never contain "->". Verified by the
// unit tests in test_makeStateKey.mjs.
// ======================================

export const GOAL_NONE = 0;   // sentinel for "no active goal"

export function makeStateKey(pos, goal) {

    // coerce both to numbers then string so
    // makeStateKey(5, 16) and makeStateKey("5", 16)
    // produce the same key
    const p = Number(pos);
    const g = (goal != null) ? Number(goal) : GOAL_NONE;

    return p + "#" + g;

}



// ======================================
// GET Q VALUE
// ======================================

export function getQ(state, action) {

    // unique memory key
    const key = state + "->" + action;

    // return learned value
    return Q.get(key) || 0;

}



// ======================================
// 🔎 GOAL-AGNOSTIC Q READ  (Phase 1.0 / Q4)
// ──────────────────────────────────────
// Returns the best Q for (pos, action) across EVERY goal
// context, i.e. the max over all "pos#*->action" keys.
//
// WHY THIS EXISTS
// The D1 repair unified Q on the composite "pos#goal->action"
// namespace. embeddings.js gates its semantic learning rate on
// Q as a measure of PROCEDURAL CERTAINTY — "has this path been
// confirmed?" — a question that is not about any particular
// goal. A bare getQ(id1, id2) would return 0 after D1 and pin
// the embedding learning rate at its floor, silently changing
// semantic dynamics during a phase whose whole purpose is to
// change nothing except what is being repaired.
//
// PURE. Reads Q, writes nothing. Also tolerates legacy bare
// "pos->action" keys so a partially-migrated or restored
// localStorage brain still resolves.
// ======================================

export function getQAny(pos, action) {

    const exact  = String(Number(pos));      // legacy bare state
    const prefix = exact + "#";              // composite state
    const suffix = "->" + String(action);

    let best  = 0;
    let found = false;

    Q.forEach((value, key) => {

        if (!key.endsWith(suffix)) return;

        const state = key.slice(0, key.length - suffix.length);

        if (state === exact || state.startsWith(prefix)) {
            if (!found || value > best) {
                best  = value;
                found = true;
            }
        }

    });

    return found ? best : 0;

}



// ======================================
// DIRECT SETTER
// used for replay memory
// ======================================

export function setQ(state, action, value) {

    // create memory key
    const key = state + "->" + action;

    // save value directly
    Q.set(key, value);

}



// ======================================
// 🧠 REAL Q LEARNING UPDATE
// learns future rewards automatically
// ======================================

export function updateQ({

    state,
    action,

    reward,

    nextState,

    alpha = 0.35,
    gamma = 0.75,

    // ── STEP-2 DIAGNOSTICS (optional) ──────
    // Pass { visits, mqfTotal, mqfNonzero }
    // from main.js to record per-key visit
    // counts and maxFutureQ-nonzero rate.
    // Omitting diag is safe — all counters
    // are inside the (diag &&) guard so they
    // never run in production callers that
    // don't pass this parameter.
    diag = null

}) {

    // ======================================
    // CURRENT KNOWLEDGE
    // ======================================

    const currentQ =

        getQ(state, action);



    // ======================================
    // FIND BEST FUTURE POSSIBILITY
    // ──────────────────────────────────────
    // BUG FIX: futureState from key.split("->")[0]
    // is always a STRING (e.g. "10").
    // nextState passed from main.js is a NUMBER (e.g. 10).
    // "10" === 10 is FALSE in JavaScript strict equality.
    // This caused maxFutureQ to always be 0,
    // making Q converge to reward (8) instead of 20.
    // Fix: compare as String on both sides.
    // ======================================

    let maxFutureQ = 0;



    // search all future actions
    Q.forEach((value, key) => {

        // split:
        // state->action
        const parts = key.split("->");

        const futureState = parts[0];

        // only future of nextState — compare as strings
        if (futureState === String(nextState)) {

            maxFutureQ = Math.max(

                maxFutureQ,
                value

            );

        }

    });

    // ======================================
    // Q LEARNING FORMULA
    // ======================================

    const newQ =

        currentQ +

        alpha * (

            reward +

            gamma * maxFutureQ -

            currentQ

        );


    // ======================================
    // 🧠 SAFE Q LIMIT
    // prevents runaway intelligence
    // ======================================

    const clampedQ = Math.max(

        -20,

        Math.min(newQ, 20)

    );

    // ======================================
    // SAVE NEW INTELLIGENCE
    // ======================================

    setQ(

        state,
        action,
        clampedQ

    );



    // ── STEP-2 DIAGNOSTIC COUNTERS ──────────
    // Runs only when main.js passes diag={}.
    // No side effects on Q values or decisions.
    if (diag) {

        // per-key visit count
        const visitKey = String(state) + "->" + String(action);
        diag.visits.set(visitKey, (diag.visits.get(visitKey) || 0) + 1);

        // maxFutureQ nonzero rate
        diag.mqfTotal++;
        if (maxFutureQ > 0) diag.mqfNonzero++;

    }

    // console.log removed: fires 100+ times/min during autonomous training.
    // Q updates are internal learning signals — not cognitive events.
    // Monitor via the HUD Q-Value display instead.

}



// ======================================
// 🔻 DAMP Q — SURPRISE-DRIVEN DECAY
// ======================================
// Called when prediction error is significant
// for a specific transition (from→to).
//
// MATHEMATICAL JUSTIFICATION:
// Currently Q only grows (Bellman updates)
// or decays negligibly (Q * 0.999 = 0.02/step).
// High prediction error on lion→hunt means
// that path did NOT deliver expected reward,
// but Q stays at 20 forever.
//
// This function provides active Q reduction
// proportional to surprise magnitude.
//
// STABILITY GUARANTEE:
//   Q_new = Q_old × (1 - dampStrength)
//   dampStrength ∈ [0, 0.12] (capped)
//   → multiplicative decay, never makes Q negative
//   → Max single-step decay: 12% of Q value
//   → At Q=20, max drop per step: 2.4 points
//
// AUTONOMOUS DECAY CURVE:
//   compositeError ≈ 0.40 every step (loop):
//   dampStrength = 0.40 × 0.028 = 0.011/step
//   Q after 50 steps: 20 × (1-0.011)^50 = 11.0
//   Q after 100 steps: 20 × 0.330 = 6.6
//   → Loop breaks as Q drops below threshold
//
// Called from: main.js after evaluatePredictionError
// When to call: compositeError > 0.20
// ======================================

export function dampQ(state, action, dampStrength) {

    const key = String(state) + "->" + String(action);

    const currentQ = Q.get(key);

    // only dampen positive Q values
    // negative Q should not be dampened further
    if (!currentQ || currentQ <= 0) return;

    // safety cap: never dampen more than 12% per call
    const clampedDamp = Math.min(dampStrength, 0.12);

    const dampedQ = currentQ * (1.0 - clampedDamp);

    // floor at -20 (same as Q cap)
    Q.set(key, Math.max(-20, dampedQ));

    // console.log removed: dampQ fires on every prediction error > 0.20.
    // Q dampening is a continuous background process, not an event.

}
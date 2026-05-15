// ======================================
// 🧠 BEHAVIOR DYNAMICS SYSTEM
// ======================================

export let curiosityState  = 1;
export let confidenceState = 1;
export let stressState     = 0;
export let fatigueState    = 0;
export let focusState      = 1;
export let explorationMode = true;

// ======================================
// INJECT STRESS FROM OUTSIDE
// (used by "Poke" button and bad paths)
// ======================================
export function injectStress(amount) {
    stressState = clamp(stressState + amount, 0, 5);
}

export function updateBehavior({ reward, penalty, success, repeated }) {

    // ── confidence ──────────────────────────────
    if (success) {
        confidenceState += 0.08;
    }
    if (penalty > 0) {
        confidenceState -= penalty * 0.02;
    }

    // ── STRESS ──────────────────────────────────
    // Stress builds from:
    //   1. explicit penalties (bad paths)
    //   2. low confidence (brain feels lost)
    //   3. repeated bad paths (being stuck)
    //   4. a small baseline every step (life is hard)

    const lostness = 1 / (1 + confidenceState); // 0=confident, 1=totally lost
    stressState += lostness * 0.08;             // uncertainty → stress
    stressState += penalty  * 0.15;             // bad path → stress
    stressState += 0.02;                        // baseline stress every step

    if (repeated && penalty > 0) {
        stressState += 0.3;                     // stuck in a loop → panic
        fatigueState += 0.25;
    }

    // success calms the brain down
    if (success) {
        stressState -= 0.12;
    }

    // ── fatigue ─────────────────────────────────
    fatigueState += 0.04;
    fatigueState -= reward * 0.05;

    if (repeated && success) {
        confidenceState += 0.005;
        fatigueState    += 0.15;
        focusState      += 0.02;
    }

    // ── curiosity ───────────────────────────────
    if (!repeated) {
        curiosityState += 0.003;
    }
    // uncertain brain is more curious
    if (lostness > 0.4) {
        curiosityState += 0.03;
    } else {
        curiosityState -= 0.002;
    }

    // ── focus = confidence minus stress ─────────
    focusState = confidenceState - stressState;

    // ── exploration mode ────────────────────────
    explorationMode = curiosityState > confidenceState * 0.8;

    // ── decay (slow return to baseline) ─────────
    curiosityState  *= 0.999;
    confidenceState *= 0.998;
    stressState     *= 0.990;   // stress fades faster so it oscillates visibly
    fatigueState    *= 0.992;

    // ── clamp ───────────────────────────────────
    curiosityState  = clamp(curiosityState,  0.15, 5);
    confidenceState = clamp(confidenceState, 0,    5);
    stressState     = clamp(stressState,     0,    5);
    fatigueState    = clamp(fatigueState,    0,    5);
    focusState      = clamp(focusState,     -5,    5);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

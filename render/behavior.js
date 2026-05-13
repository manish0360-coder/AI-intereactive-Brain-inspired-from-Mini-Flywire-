// ======================================
// 🧠 BEHAVIOR DYNAMICS SYSTEM
// controls personality-like behavior
// ======================================



// ======================================
// INTERNAL BRAIN STATES
// ======================================

// curiosity level
// high = explores more
export let curiosityState = 1;



// confidence level
// high = trusts learned habits
export let confidenceState = 1;



// stress level
// high = avoids risky paths
export let stressState = 0;



// fatigue level
// high = shorter thinking
export let fatigueState = 0;



// focus level
// high = goal-directed behavior
export let focusState = 1;



// exploration mode
// true = experimental behavior
export let explorationMode = true;



// ======================================
// UPDATE BRAIN STATE
// ======================================

export function updateBehavior({

    reward,
    penalty,
    success,
    repeated

}) {

    // ======================================
    // SUCCESS INCREASES CONFIDENCE
    // ======================================

    if (success) {

        confidenceState += 0.05;

        stressState -= 0.03;

    }



    // ======================================
    // FAILURES INCREASE STRESS
    // ======================================

    if (penalty > 0) {

        stressState += penalty * 0.02;

        confidenceState -= penalty * 0.01;

    }



    // ======================================
    // REPETITION CAUSES FATIGUE
    // ======================================

    if (repeated) {

        fatigueState += 0.03;

        curiosityState -= 0.02;

    }
    else {

        curiosityState += 0.01;

    }



    // ======================================
    // REWARD RESTORES ENERGY
    // ======================================

    fatigueState -= reward * 0.01;



    // ======================================
    // FOCUS MODE
    // ======================================

    focusState =

        confidenceState - stressState;



    // ======================================
    // EXPLORATION MODE
    // ======================================

    explorationMode =

        curiosityState > confidenceState;



    // ======================================
    // SAFE CLAMPING
    // keeps values stable
    // ======================================

    curiosityState =
    clamp(curiosityState, 0, 5);

    confidenceState =
    clamp(confidenceState, 0, 5);

    stressState =
    clamp(stressState, 0, 5);

    fatigueState =
    clamp(fatigueState, 0, 5);

    focusState =
    clamp(focusState, -5, 5);

}



// ======================================
// SAFE LIMIT FUNCTION
// ======================================

function clamp(value, min, max) {

    return Math.max(

        min,

        Math.min(max, value)

    );

}
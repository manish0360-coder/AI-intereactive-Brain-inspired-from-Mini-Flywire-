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
    // 🧠 REPETITION INTELLIGENCE
    // ======================================

    // repeated successful path
    // = learned skill / mastery
    if (repeated && success) {

        // brain becomes more confident
        confidenceState += 0.005;

        // repeated thinking consumes energy
        fatigueState += 0.03;

        // focused behavior becomes stronger
        focusState += 0.02;

    }



    // repeated bad path
    // = trapped loop
    else if (repeated && penalty > 0) {

        // stress from being stuck
        stressState += 0.04;

        // endless loops are mentally exhausting
        fatigueState += 0.08;


    }



    // discovering something new
    else {

        // exploration reward
        curiosityState += 0.003;

        // new experiences reduce boredom
        stressState -= 0.01;

    }



    // ======================================
    // REWARD RESTORES SOME ENERGY
    // but not too much
    // ======================================

    // rewards slightly reduce fatigue
    fatigueState -= reward * 0.002;



    // ======================================
    // FOCUS MODE
    // ======================================

    focusState =

        confidenceState - stressState;


    // ======================================
    // REAL CURIOSITY SYSTEM
    // curiosity reacts to uncertainty
    // ======================================

    // low confidence brain
    // means brain does not understand world well
    const uncertainty =

    1 / (1 + confidenceState);



    // uncertain world increases curiosity
    if (uncertainty > 0.4) {

        curiosityState += 0.03;

    }



    // understood world lowers curiosity slowly
    else {

        curiosityState -= 0.002;

    }


    // ======================================
    // EXPLORATION MODE
    // ======================================

    explorationMode =

        curiosityState > confidenceState * 0.8


    // ======================================
    // 🧠 EMOTIONAL DECAY
    // emotions slowly return to neutral
    // ======================================

    // curiosity slowly cools down
    curiosityState *= 0.999;

    // confidence slowly fades
    confidenceState *= 0.998;

    // stress slowly recovers
    stressState *= 0.995;

    // fatigue slowly recovers
    fatigueState *= 0.9998;
    
    // ======================================
    // SAFE CLAMPING
    // keeps values stable
    // ======================================

    curiosityState =
    clamp(curiosityState, 0, 5);

    // brain is never fully uncurious
    if (curiosityState < 0.15) {

        curiosityState = 0.15;

    }

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
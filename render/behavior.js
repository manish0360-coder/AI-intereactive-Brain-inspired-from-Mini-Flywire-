// ======================================
// 🧠 BEHAVIOR DYNAMICS SYSTEM
// controls personality-like behavior
// ======================================



// ======================================
// INTERNAL BRAIN STATES
// ======================================

// curiosity level
// high = explores more
export let curiosityState = 0.05;



// confidence level
// high = trusts learned habits
export let confidenceState = 0;



// stress level
// high = avoids risky paths
export let stressState = 0;



// fatigue level
// high = shorter thinking
export let fatigueState = 0;

// ======================================
// CHANGE FATIGUE SAFELY
// ======================================

export function changeFatigue(amount) {

    fatigueState += amount;
}

// ======================================
// CHANGE STRESS SAFELY
// ──────────────────────────────────────
// ES module exports are read-only bindings.
// External files cannot assign stressState directly.
// Use this mutator — mirrors changeFatigue.
// Clamp keeps stress in its valid range [0.2, 30].
// ======================================

export function changeStress(amount) {

    stressState = Math.max(0.2, Math.min(stressState + amount, 30));

}



// ======================================
// 🧠 REAL BIOLOGICAL BODY SYSTEM
// ======================================

// short-term usable energy
export let energyState = 100;

// long-term burnout
export let exhaustionState = 0;

// emergency rest instinct
export let restingState = false;

// emergency survival mode
export let survivalState = false;

// ======================================
// SURVIVAL OVERLOAD PRESSURE
// nervous system overload accumulation
// ======================================

export let survivalPressure = 0;


// ======================================
// 🧠 LOOP SUFFERING SYSTEM
// trapped repetitive cognition
// ======================================

// how trapped the brain feels
export let loopStressState = 0;


// focus level
// high = goal-directed behavior
// ── declared here (before regulateBiology) ──
// focusState is mutated inside regulateBiology
// (fatigue reduces it). Declaring after the
// function caused a TDZ risk in ES modules.
export let focusState = 1;

// ======================================
// 🧠 CENTRAL BIOLOGICAL REGULATION
// ======================================

export function regulateBiology({

    activity = 0,

    mentalLoad = 0,

    repetition = 0,

    loopDepth = 0,

    danger = 0,

    isHome = false

}) {

    // ======================================
    // ACTIVE MODE
    // ======================================

    if (!isHome) {

        // physical / mental activity drains energy
        energyState -= activity * 0.4;

        energyState -= mentalLoad * 0.25;

        // repetitive loops cause burnout
        exhaustionState += repetition * 0.05;

        // ======================================
        // trapped loop psychology
        // ======================================

        if (loopDepth > 2) {

            // trapped feeling grows exponentially
            loopStressState +=

                Math.pow(loopDepth - 2, 1.3) * 0.12;

            // mental suffering
            stressState +=
            loopStressState * 0.015;

            // repetitive thinking is exhausting
            exhaustionState +=
            loopStressState * 0.03;

            // confidence drops
            confidenceState *= 0.99995;

            // curiosity collapses
            curiosityState *= 0.997;
        }

        // dangerous situations are stressful
        exhaustionState += danger * 0.08;

    }

    // ======================================
    // HOME / REST MODE
    // ======================================

    else {

        // safe places restore energy
        energyState += 1.2;

        // burnout heals slowly
        exhaustionState *= 0.995;

        // stress calms slowly
        stressState *= 0.992;

    }

    // ======================================
    // TRUE BIOLOGICAL FATIGUE
    // body + emotional exhaustion together
    // ======================================

    // ======================================
    // 🧠 SAFE FATIGUE SYSTEM
    // prevents runaway exhaustion
    // ======================================

    fatigueState =

        (100 - energyState) * 0.18 +

        exhaustionState * 0.35 +

        stressState * 0.25 +

        loopStressState * 0.15;


    // ======================================
    // TIRED BRAIN DYNAMICS
    // exhausted brains become unstable
    // ======================================

    if (fatigueState > 35) {

        // curiosity weakens
        curiosityState *= 0.998;

        // thinking quality drops
        focusState *= 0.996;

        // tired people become emotionally sensitive
        stressState += 0.003;

    }


    // moderate exhaustion
    if (fatigueState > 55) {

        confidenceState *= 0.997;

        stressState += 0.006;

    }


    // severe exhaustion
    if (fatigueState > 75) {

        confidenceState *= 0.994;

        focusState *= 0.992;

        curiosityState *= 0.996;

        stressState += 0.015;

    }

    // ======================================
    // EXTREME EXHAUSTION
    // ======================================

    if (fatigueState > 75) {

        confidenceState *= 0.996;

        focusState *= 0.994;

        stressState += 0.01;

    }

    // ======================================
    // SURVIVAL REST INSTINCT
    // ======================================

    if (

        energyState < 25 ||

        fatigueState > 80

    ) {

        restingState = true;

    }


    // ======================================
    // loop suffering slowly heals
    // ======================================

    loopStressState *= 0.992;


    // enough recovery
    if (

        energyState > 70 &&

        fatigueState < 40

    ) {

        restingState = false;

    }


    // ======================================
    // BIOLOGICAL FEEDBACK LOOPS
    // body and emotions affect each other
    // ======================================

    // stressed brains burn energy faster
    if (stressState > 30) {

        energyState -= 0.08;

    }

    // trapped brains become exhausted
    if (loopStressState > 20) {

        exhaustionState += 0.04;

    }

    // low energy increases emotional instability
    if (energyState < 30) {

        stressState += 0.01;

    }


    // ======================================
    // SAFE LIMITS
    // ======================================

    energyState =
    clamp(energyState, 0, 100);

    exhaustionState =
    clamp(exhaustionState, 0, 100);

    fatigueState =
    clamp(fatigueState, 0, 100);


}



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
    repeated,
    // how many nodes AI travelled
    pathLength,
    // is AI back home resting
    isHome,

    // ── Trust-grounded confidence floor ─────────────────────────
    // Aggregate Bayesian trust from trustMemory.js.
    // Mean (successes+1)/(attempts+2) across all actively-used
    // paths (those with ≥2 attempts). Passed from main.js once
    // per step. null = not yet enough data (first few steps).
    // When non-null, prevents confidenceState from decaying below
    // what verified behavioral reliability supports.
    aggregateTrust = null,

}) {

    // ======================================
    // SUCCESS REASSURES THE BRAIN
    // FIXED: was +0.04/step — hit cap instantly
    // Now +0.008 — grows slowly and meaningfully
    // ======================================

    if (success) {

        // stress drops slowly — was 0.04, drained to 0 immediately
        stressState -= 0.008;

        // confidence grows slowly — was 0.04, hit 20 cap instantly
        confidenceState += 0.008;

        loopStressState *= 0.97;
        exhaustionState *= 0.995;

    }

    // ======================================
    // 🧠 FAILURE STRESS SYSTEM
    // ======================================

    if (penalty > 0) {

        stressState += penalty * 0.02;
        confidenceState -= penalty * 0.02;
        fatigueState += penalty * 0.03;

    }

    // ======================================
    // 🧠 NATURAL UNCERTAINTY STRESS
    // prevents stress from hitting 0
    // brain always has mild anxiety
    // ======================================

    const uncertaintyStress = 1 / (1 + confidenceState);
    stressState += uncertaintyStress * 0.004;

    // ======================================
    // 🧠 REPETITION INTELLIGENCE
    // ======================================

    if (repeated && success) {

        confidenceState += 0.003;
        focusState += 0.01;
        fatigueState += 0.02;
        curiosityState -= 0.002;

    } else if (repeated && penalty > 0) {

        stressState += 0.015;
        fatigueState += 0.06;
        confidenceState -= 0.015;
        curiosityState -= 0.003;

    } else {

        curiosityState += 0.003;
        stressState -= 0.003;  // was 0.01 — too aggressive

    }

    // ======================================
    // FOCUS MODE
    // ======================================

    focusState = confidenceState - stressState;

    // ======================================
    // REAL CURIOSITY SYSTEM
    // ======================================

    const uncertainty = 1 / (1 + confidenceState);

    if (uncertainty > 0.4) {
        curiosityState += 0.0003;
    } else {
        curiosityState -= 0.0001;
    }

    explorationMode =
        curiosityState >
        (confidenceState * 0.15 + 0.2);

    // ======================================
    // 🧠 EMOTIONAL DECAY
    // FIXED: confidence decay was 0.99995 (too weak)
    // stress decay was 0.998 (too slow to drop)
    // Now values breathe up and down properly
    // ======================================

    curiosityState *= 0.999;

    // confidence fades meaningfully per step
    confidenceState *= 0.9990;

    // stress decays but not to zero
    if (stressState < 20) {
        stressState *= 0.994;
    } else {
        stressState *= 0.9985;
    }

    // stress never fully disappears — brain always has some tension
    if (stressState < 0.2) stressState = 0.2;

    // ======================================
    // SURVIVAL PRESSURE SYSTEM
    // ======================================

    survivalPressure += fatigueState * 0.002;
    survivalPressure += stressState * 0.0015;
    survivalPressure += loopStressState * 0.001;

    if (isHome) {
        survivalPressure *= 0.985;
    }

    if (survivalPressure > 90 && fatigueState > 80) {
        survivalState = true;
    } else {
        survivalState = false;
    }

    // ======================================
    // TRUST-GROUNDED CONFIDENCE FLOOR
    // ──────────────────────────────────────
    // Aggregate Bayesian trust (mean verified
    // success-rate across all actively-used
    // paths) sets a minimum floor on
    // confidenceState.
    //
    // This is the architectural fix for the
    // confidence disconnect: episodes, schemas,
    // and stable paths now feed confidence
    // indirectly via pathSuccesses/pathAttempts
    // in trustMemory, which accumulate from
    // autonomous verified goal-reaching.
    //
    // WHY A FLOOR (not a replacement):
    //   All existing dynamics are preserved —
    //   prediction-error penalties can still
    //   spike confidence below the floor
    //   momentarily, but decay cannot grind
    //   it to zero when real competence exists.
    //
    // TRUST_SCALE = 10:
    //   aggregateTrust ∈ [0.5, 1.0] for paths
    //   with evidence. × 10 maps this to [5,10]
    //   on the [0,20] confidenceState scale.
    //   At C=5  → uncertaintyDrive = 0.50 (not pinned)
    //   At C=10 → uncertaintyDrive = 0.00 (fully released)
    //   This is the range that makes getDominantDrive
    //   capable of returning something other than
    //   "uncertainty" for the first time.
    //
    // NULL GUARD:
    //   aggregateTrust is null when no paths have
    //   ≥2 attempts yet (early training). Guard
    //   prevents premature floor from cold-start data.
    // ======================================

    if (aggregateTrust !== null && aggregateTrust > 0) {
        const TRUST_SCALE = 10;
        const trustFloor  = aggregateTrust * TRUST_SCALE;
        if (confidenceState < trustFloor) {
            confidenceState = trustFloor;
        }
    }

    // ======================================
    // SAFE CLAMPING
    // ======================================

    curiosityState =
    clamp(curiosityState, 0.01, 0.3);

    confidenceState =
    clamp(confidenceState, 0, 20);

    // min 0.2 — stress never reaches absolute zero
    stressState =
    clamp(stressState, 0.2, 30);

    fatigueState =
    clamp(fatigueState, 0, 100);

    loopStressState =
    clamp(loopStressState, 0, 100);

    focusState =
    clamp(focusState, 0, 20);

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




// ======================================
// 🧠 APPLY PREDICTION ERROR TO BEHAVIOR
// ======================================
// Translates a prediction error object
// (from predictionError.js) into direct
// behavioral state mutations.
//
// Call AFTER evaluatePredictionError(),
// once per agent step (not per candidate).
//
// This is the bridge between the structural
// prediction-error layer and the biological
// behavior engine. It modulates:
//   - stressState    (surprise = stress)
//   - confidenceState (accurate = confidence)
//   - curiosityState  (surprise = exploration)
//   - loopStressState (massive error = trapped feeling)
//
// Each severity tier maps to biologically
// plausible emotional responses.
// ======================================

export function applyPredictionErrorToBehavior(predError) {

    // no error computed (epsilon jump, no candidates)
    if (!predError) return;

    switch (predError.severity) {

        case "massive":

            // ======================================
            // Brain is shocked.
            // World completely violated expectations.
            // Strong stress spike, confidence collapse,
            // curiosity spike (need to understand),
            // loop stress grows (trapped feeling).
            // ======================================

            stressState     = clamp(stressState     + 1.8,  0.2, 30);
            confidenceState = clamp(confidenceState  - 0.6,  0,   20);
            curiosityState  = clamp(curiosityState   + 0.025, 0.01, 0.3);
            loopStressState = clamp(loopStressState  + 4.0,  0,   100);
            break;


        case "large":

            // ======================================
            // Notable surprise.
            // Prediction was significantly wrong.
            // Moderate stress, small confidence dip,
            // mild curiosity boost.
            // ======================================

            stressState     = clamp(stressState     + 0.60, 0.2, 30);
            confidenceState = clamp(confidenceState  - 0.18,  0,  20);
            curiosityState  = clamp(curiosityState   + 0.012, 0.01, 0.3);
            loopStressState = clamp(loopStressState  + 1.0,  0,   100);
            break;


        case "medium":

            // ======================================
            // Mild uncertainty.
            // World slightly different from prediction.
            // Tiny stress nudge, small curiosity tick.
            // No confidence change (noise level).
            // ======================================

            stressState    = clamp(stressState    + 0.08, 0.2, 30);
            curiosityState = clamp(curiosityState  + 0.003, 0.01, 0.3);
            break;


        case "small":

            // ======================================
            // Prediction was accurate.
            // Brain correctly anticipated the world.
            // Reward: confidence grows slightly,
            // stress eases, loop stress heals.
            // This is the only error tier that
            // REWARDS the brain for being right.
            // ======================================

            confidenceState  = clamp(confidenceState  + 0.018,  0,  20);
            stressState      = clamp(stressState      - 0.006,  0.2, 30);
            loopStressState  = clamp(loopStressState  * 0.98,   0,  100);
            break;


        default:
            break;

    }

}
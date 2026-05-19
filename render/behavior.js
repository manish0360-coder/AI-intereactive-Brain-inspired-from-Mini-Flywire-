
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
            confidenceState *= 0.998;

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

    fatigueState =

        // physical tiredness
        (100 - energyState) * 0.55 +

        // long-term burnout
        exhaustionState * 1.4 +

        // emotional exhaustion
        stressState * 4 +

        // trapped loop suffering
        loopStressState * 2;


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
    repeated,
    // how many nodes AI travelled
    pathLength,
    // is AI back home resting
    isHome

}) {

    // ======================================
    // SUCCESS REASSURES THE BRAIN
    // ======================================

    if (success) {

        // successful actions reduce fear
        stressState -= 0.04;

        // success increases trust
        confidenceState += 0.04;

        // useful progress reduces suffering
        loopStressState *= 0.97;

        // rewarding progress restores mental energy
        exhaustionState *= 0.995;

    }



    // ======================================
    // 🧠 FAILURE STRESS SYSTEM
    // repeated failure creates pressure
    // ======================================

    if (penalty > 0) {

        // stronger penalties create stronger stress
        stressState += penalty * 0.08;

        // failure reduces confidence
        confidenceState -= penalty * 0.015;

        // failure is mentally exhausting
        fatigueState += penalty * 0.03;

    }



    // ======================================
    // 🧠 REPETITION INTELLIGENCE
    // ======================================

    // repeated successful path
    // = learned skill / mastery
    if (repeated && success) {

        // brain becomes more confident
        confidenceState += 0.005;

        // focused behavior becomes stronger
        focusState += 0.02;

        // repeated success becomes mentally tiring
        fatigueState += 0.015;


        // successful repetition reduces curiosity
        curiosityState -= 0.002;

    }



    // repeated bad path
    // trapped mental loop
    else if (repeated && penalty > 0) {

        // trapped brain stress
        stressState += 0.12;

        // looping is exhausting
        fatigueState += 0.06;

        // trapped brains lose confidence
        confidenceState -= 0.01;

        // stressed brains explore less
        curiosityState -= 0.003;

    }





    // discovering something new
    else {

        // exploration reward
        curiosityState += 0.003;

        // new experiences reduce boredom
        stressState -= 0.01;

    }



    // =====================================
    // 🏠 REST RECOVERY SYSTEM
    // =====================================

    // when AI comes home and rests
    //if (isHome) {

        // recover energy gradually
        //fatigueState -= 0.02;

        // resting calms the brain
        //stressState -= 0.005;
    //}




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

    // ======================================
    // EMOTIONAL RECOVERY
    // stress heals VERY slowly
    // ======================================

    // low stress heals faster
    if (stressState < 20) {

        stressState *= 0.998;

    }

    // high stress persists longer
    else {

        stressState *= 0.9995;

    }

    // ======================================
    // SURVIVAL PRESSURE SYSTEM
    // accumulated nervous overload
    // ======================================

    // fatigue increases overload
    survivalPressure += fatigueState * 0.002;

    // stress increases overload
    survivalPressure += stressState * 0.0015;

    // trapped thinking amplifies overload
    survivalPressure += loopStressState * 0.001;

    // safe places calm nervous system
    if (isHome) {

        survivalPressure *= 0.985;
    }

    // ======================================
    // SURVIVAL MODE
    // emergency biological overload
    // ======================================

    // only extreme overload activates survival
    if (

        survivalPressure > 90 &&

        fatigueState > 80

    ) {

        survivalState = true;

    } else {

        survivalState = false;
    }

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
    clamp(confidenceState, 0, 100);

    stressState =
    clamp(stressState, 0, 100);

    fatigueState =
    clamp(fatigueState, 0, 100);

    loopStressState =
    clamp(loopStressState, 0, 100);



    focusState =
    clamp(focusState, 0, 100);

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
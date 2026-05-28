// ======================================
// 🧠 MOTIVATIONAL STATE ENGINE
// ======================================
// Maps internal behavioral states →
// dynamic executive weights per step.
//
// This is the "why" layer of cognition:
//   hungry brain  → reward dominates
//   bored brain   → curiosity dominates
//   stressed brain → confidence/familiar
//   tired brain   → cost awareness rises
//   social state  → semantic dominates
//   uncertain     → exploration rises
// ======================================



// ======================================
// MOTIVATIONAL DIMENSIONS
// each represents a drive pressure
// ======================================

// drives reward-seeking behavior
// rises when recent success is low
export let hungerDrive = 0.5;

// drives novelty and exploration
// rises when overconfident or understimulated
export let boredomDrive = 0.3;

// drives safety and familiar paths
// rises with stress
export let stressDrive = 0.0;

// suppresses all active drives
// rises with fatigue
export let fatigueDrive = 0.0;

// drives semantic familiarity seeking
// rises during loop stress or isolation
export let socialDrive = 0.2;

// drives cautious exploration
// rises when confidence is low
export let uncertaintyDrive = 0.2;

// ======================================
// INTERNAL SUCCESS TRACKER
// rolling window of recent outcomes
// ======================================

const recentOutcomes = [];
const OUTCOME_WINDOW = 20;



// ======================================
// RECORD OUTCOME
// called after each step
// ======================================

export function recordOutcome(wasSuccess) {

    recentOutcomes.push(wasSuccess ? 1 : 0);

    if (recentOutcomes.length > OUTCOME_WINDOW) {
        recentOutcomes.shift();
    }
}



// ======================================
// COMPUTE SUCCESS RATE
// from recent window
// ======================================

function getSuccessRate() {

    if (recentOutcomes.length === 0) return 0.5;

    const sum = recentOutcomes.reduce((a, b) => a + b, 0);

    return sum / recentOutcomes.length;
}



// ======================================
// UPDATE MOTIVATIONAL STATE
// called each agent step
// reads from behavior system outputs
// ======================================

export function updateMotivationalState({

    confidenceState,
    stressState,
    fatigueState,
    curiosityState,
    loopStressState,
    exhaustionState = 0

}) {

    const successRate = getSuccessRate();


    // ======================================
    // HUNGER = reward deficit
    // low success → hunger rises
    // high success → hunger drops
    // ======================================

    const rewardDeficit = Math.max(0, 1 - successRate);

    hungerDrive =
        0.3 + rewardDeficit * 0.6;


    // ======================================
    // BOREDOM = overconfidence + low novelty
    // bored brain seeks new territory
    // ======================================

    const overconfidence =
        Math.min(confidenceState / 20, 1);

    boredomDrive =
        curiosityState * 2.5 +
        overconfidence * 0.3;


    // ======================================
    // STRESS DRIVE = familiar path seeking
    // high stress → trust what is known
    // ======================================

    stressDrive =
        Math.min(stressState / 30, 1);


    // ======================================
    // FATIGUE DRIVE = suppresses all drives
    // exhausted brain takes easiest path
    // ======================================

    fatigueDrive =
        Math.min(fatigueState / 100, 1) * 0.7 +
        Math.min(exhaustionState / 100, 1) * 0.3;


    // ======================================
    // SOCIAL DRIVE = loop escape via familiarity
    // trapped brain seeks meaningful paths
    // ======================================

    socialDrive =
        Math.min(loopStressState / 60, 0.8);


    // ======================================
    // UNCERTAINTY DRIVE = low confidence
    // uncertain brain explores carefully
    // ======================================

    uncertaintyDrive =
        Math.max(0, 1 - Math.min(confidenceState / 10, 1));


    // ======================================
    // CLAMP ALL DRIVES
    // ======================================

    hungerDrive      = clamp(hungerDrive,      0.1, 1.0);
    boredomDrive     = clamp(boredomDrive,      0.0, 1.0);
    stressDrive      = clamp(stressDrive,       0.0, 1.0);
    fatigueDrive     = clamp(fatigueDrive,      0.0, 1.0);
    socialDrive      = clamp(socialDrive,       0.0, 1.0);
    uncertaintyDrive = clamp(uncertaintyDrive,  0.0, 1.0);

    // console.log removed: fires every agent step (1200+ lines/min).
    // Motivational drive values are readable in the HUD (bottom-left panel)
    // via getMotivationalSnapshot(). Logging here buried goal-reached,
    // episode-stored, and schema-rebuilt events in the console.
}



// ======================================
// COMPUTE EXECUTIVE WEIGHTS
// maps motivational drives →
// component decision weights
// called once per candidate evaluation
// ======================================

export function computeExecutiveWeights() {


    // ======================================
    // BASE WEIGHTS
    // starting balance before motivation
    // ======================================

    let wReward      = 0.35;
    let wSemantic    = 0.15;
    let wConfidence  = 0.20;
    let wUncertainty = 0.10;
    let wCuriosity   = 0.10;
    let wCost        = 0.10;


    // ======================================
    // HUNGER → reward dominates
    // hungry brain focuses on future gain
    // ======================================

    wReward      += hungerDrive * 0.35;
    wSemantic    -= hungerDrive * 0.08;
    wCuriosity   -= hungerDrive * 0.04;


    // ======================================
    // BOREDOM → curiosity dominates
    // bored brain seeks unexplored paths
    // ======================================

    wCuriosity   += boredomDrive * 0.30;
    wReward      -= boredomDrive * 0.08;
    wConfidence  -= boredomDrive * 0.04;


    // ======================================
    // STRESS → confidence + familiarity
    // stressed brain avoids unknown risk
    // ======================================

    wConfidence  += stressDrive * 0.25;
    wSemantic    += stressDrive * 0.15;
    wCuriosity   -= stressDrive * 0.08;
    wReward      -= stressDrive * 0.05;


    // ======================================
    // FATIGUE → cost awareness rises
    // tired brain conserves energy
    // ======================================

    wCost        += fatigueDrive * 0.35;
    wReward      *= (1 - fatigueDrive * 0.25);
    wCuriosity   *= (1 - fatigueDrive * 0.45);
    wConfidence  *= (1 - fatigueDrive * 0.15);


    // ======================================
    // SOCIAL → semantic dominates
    // familiar meaningful paths soothe
    // ======================================

    wSemantic    += socialDrive * 0.40;
    wReward      -= socialDrive * 0.08;


    // ======================================
    // UNCERTAINTY → exploration rises
    // doubting brain probes carefully
    // ======================================

    wUncertainty += uncertaintyDrive * 0.25;
    wCuriosity   += uncertaintyDrive * 0.12;
    wConfidence  -= uncertaintyDrive * 0.08;


    // ======================================
    // NORMALIZE
    // weights must sum to 1
    // ======================================

    const total =
        wReward +
        wSemantic +
        wConfidence +
        wUncertainty +
        wCuriosity +
        wCost;

    const norm = total > 0 ? 1 / total : 1;


    return {

        wReward:      clamp(wReward      * norm, 0, 1),
        wSemantic:    clamp(wSemantic    * norm, 0, 1),
        wConfidence:  clamp(wConfidence  * norm, 0, 1),
        wUncertainty: clamp(wUncertainty * norm, 0, 1),
        wCuriosity:   clamp(wCuriosity   * norm, 0, 1),
        wCost:        clamp(wCost        * norm, 0, 1),

    };
}



// ======================================
// GET CURRENT MOTIVATIONAL SNAPSHOT
// for HUD display and debugging
// ======================================

export function getMotivationalSnapshot() {

    return {

        hungerDrive,
        boredomDrive,
        stressDrive,
        fatigueDrive,
        socialDrive,
        uncertaintyDrive,

        // dominant drive label
        dominant: getDominantDrive()

    };
}



// ======================================
// GET DOMINANT DRIVE NAME
// for HUD visualization
// ======================================

function getDominantDrive() {

    const drives = {
        hunger:      hungerDrive,
        boredom:     boredomDrive,
        stress:      stressDrive,
        fatigue:     fatigueDrive,
        social:      socialDrive,
        uncertainty: uncertaintyDrive
    };

    let max = 0;
    let dominant = "balanced";

    for (const [name, value] of Object.entries(drives)) {

        if (value > max) {
            max = value;
            dominant = name;
        }
    }

    return dominant;
}



// ======================================
// SAFE CLAMP UTILITY
// ======================================

function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));

}
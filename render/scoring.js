// ======================================
// DECISION SCORING SYSTEM
// ======================================
// calculates how intelligent each choice is
// higher score = brain prefers this path
// ======================================


// ======================================
// 🔮 FUTURE IMAGINATION MEMORY
// ======================================

// how much brain predicts future reward
export let liveFutureBonus = 0;



// ======================================
// FINAL DECISION SCORE
// ======================================

export function calculateDecisionScore({

    transitionBoost,

    // learned Q intelligence
    qValue,

    // reward memory
    reward,

    // habit confidence
    habitBoost,

    // curiosity exploration
    curiosityBoost,

    // sequence memory
    chainReward,

    // semantic understanding
    meaningBoost,

    // future planning
    futureBonus = 0,

    // boredom suppression
    boredomPenalty,

    // repetition additional penalty
    repetitionPenalty = 0,

    // ======================================
    // 🧠 BEHAVIOR STATES
    // ======================================

    curiosityState,

    confidenceState,

    stressState,

    fatigueState,

    focusState,

    // danger punishment
    dangerPenalty,

    // destroy self-loops
    selfLoopPenalty

}) {


    // store future imagination value
    // for HUD rendering
    liveFutureBonus = futureBonus;


    // ======================================
    // 🧠 ATTENTION ALLOCATION SYSTEM
    // realistic cognitive resource control
    // ======================================


    // reward attracts focus
    // successful paths become mentally important
    const rewardAttention =

        reward * 0.8 +

        chainReward * 1.2 +

        qValue * 0.6;


    // efficient successful behavior
    // shortest successful paths gain trust
    const efficiencyAttention =

        transitionBoost * 0.5 +

        habitBoost * 0.4;


    // fatigue damages attention stability
    const fatigueSuppression =

        fatigueState * 0.9;


    // stress destabilizes concentration
    const stressSuppression =

        stressState * 0.7;


    // ======================================
    // CONFIDENCE STABILITY
    // ======================================

    // stable successful thinking
    const confidenceStability =

        confidenceState * 0.8 +

        focusState * 0.5;


    // ======================================
    // UNCERTAINTY SYSTEM
    // low confidence increases exploration
    // ======================================

    const uncertaintyLevel =

        1 / (1 + confidenceState);


    // uncertain brains seek alternatives
    const explorationDrive =

        uncertaintyLevel * curiosityState * 3;


    // ======================================
    // FINAL DYNAMIC FOCUS
    // ======================================

    // real cognitive attention allocation
    const dynamicFocus =

        rewardAttention +

        efficiencyAttention +

        confidenceStability +

        explorationDrive -

        fatigueSuppression -

        stressSuppression;



    // ======================================
    // 🧠 COGNITIVE DRIFT
    // controlled imagination randomness
    // ======================================

    const drift =

    (Math.random() - 0.5)

    * curiosityState

    * 0.3;


    // ======================================
    // 🧠 ADAPTIVE SEMANTIC WEIGHT
    // successful rewards reduce
    // dependence on semantic guessing
    // ======================================

    // default semantic importance
    let semanticWeight = 2;


    // strong rewards reduce semantic dominance
    semanticWeight -= reward * 0.15;


    // never fully disable semantics
    semanticWeight = Math.max(
        0.4,
        semanticWeight
    );



    // ======================================
    // FINAL BRAIN INTELLIGENCE SCORE
    // ======================================

    const finalWeight =

        // learned human transitions
        transitionBoost * 3 +

        // learned behavior (MOST IMPORTANT)
        qValue * 3 +

        // reward memory
        reward * 4 +

        // trained confidence
        habitBoost * 2 +

        // exploration
        curiosityBoost * 0.5 +

        // learned chain memory
        chainReward * 4 +

        // semantic meaning
        meaningBoost * semanticWeight +

        // future imagination
        futureBonus * 1.2 -

        // repeated boredom
        boredomPenalty * 2 -

        // repetitive obsession suppression
        repetitionPenalty * 2 -

        // ======================================
        // 🧠 BEHAVIOR DYNAMICS
        // ======================================

        // curiosity personality
        curiosityState * 0.8 +

        // confidence personality
        confidenceState * 0.8 -

        // stress suppresses risky behavior
        stressState * 1.5 -

        // ======================================
        // 🧠 SURVIVAL FATIGUE OVERRIDE
        // exhausted brains stop intelligent thinking
        // ======================================

        // normal fatigue damage
        fatigueState * 0.35 -

        // extreme exhaustion punishment
        Math.max(0, fatigueState - 85) * 1.2 -

        // dynamic attention focus
        dynamicFocus * 2 -

        // dangerous bad paths
        dangerPenalty * 2 -

        // destroy endless self loops
        selfLoopPenalty +

        // controlled imagination randomness
        drift;



    // return final score
    return finalWeight;
}
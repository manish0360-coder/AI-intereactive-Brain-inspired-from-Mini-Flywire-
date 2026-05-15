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
    // FINAL BRAIN INTELLIGENCE SCORE
    // ======================================

    const finalWeight =

        // learned human transitions
        transitionBoost * 3 +

        // learned behavior (MOST IMPORTANT)
        qValue * 1.5 +

        // reward memory
        reward * 1.2 +

        // trained confidence
        habitBoost * 0.6 +

        // exploration
        curiosityBoost * 1.5 +

        // learned chain memory
        chainReward * 4 +

        // semantic meaning
        meaningBoost * 2 +

        // future imagination
        futureBonus * 1.2 -

        // repeated boredom
        boredomPenalty * 2 -

        // ======================================
        // 🧠 BEHAVIOR DYNAMICS
        // ======================================

        // curiosity personality
        curiosityState * 0.8 +

        // confidence personality
        confidenceState * 1.2 -

        // stress suppresses risky behavior
        stressState * 1.5 -

        // fatigue weakens thinking
        fatigueState * 1.2 +

        // focus improves decisions
        focusState * 1.5 -

        // dangerous bad paths
        dangerPenalty * 2 -

        // destroy endless self loops
        selfLoopPenalty;



    // return final score
    return finalWeight;
}
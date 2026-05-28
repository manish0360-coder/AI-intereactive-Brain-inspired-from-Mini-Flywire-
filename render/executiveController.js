// ======================================
// 🧠 EXECUTIVE CONTROLLER
// ======================================
// Replaces blind linear summation.
//
// Architecture:
//   Each objective produces a pressure.
//   Pressures compete, not just sum.
//   The dominant pressure leads.
//   Others contribute scaled by distance
//   from the dominant signal.
//
// This means:
//   if reward=90, semantic=60 → reward wins
//   if reward=50, semantic=80 → semantic wins
//   if both equal → true competition emerges
//
// The weights that scale each pressure
// come from the motivational state:
//   hungry brain weights reward higher
//   bored brain weights curiosity higher
// ======================================



// ======================================
// SIGMOID NORMALIZATION
// maps any raw score to [0, 1] range
// sharpness controls transition steepness
// ======================================

function sigmoid(x, sharpness = 0.5) {

    return 1 / (1 + Math.exp(-x * sharpness));
}



// ======================================
// NORMALIZE COMPONENT
// converts raw component score to
// normalized [0, 1] pressure value
//
// center: score value at midpoint (0.5)
// scale:  how wide the range is
// ======================================

function normalizeComponent(

    value,
    center = 0,
    scale  = 5

) {

    return sigmoid((value - center) / scale);
}



// ======================================
// COMPETITIVE ARBITRATION
// winner-takes-MORE (not winner-takes-all)
//
// The highest-pressure signal gets
// disproportionate influence.
// Others contribute proportionally
// scaled by distance from leader.
//
// This prevents any single signal from
// completely dominating while still
// giving the leader real authority.
// ======================================

function competitiveArbitration(pressures) {

    const values = Object.values(pressures);
    const keys   = Object.keys(pressures);

    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];


    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;


    // ======================================
    // FLAT FIELD
    // all pressures nearly equal
    // use average (no clear winner)
    // ======================================

    if (range < 0.02) {

        return values.reduce((a, b) => a + b, 0) / values.length;
    }


    // ======================================
    // COMPETITIVE WEIGHTING
    // dominance score: 0 = weakest, 1 = strongest
    // non-linear scaling → winner amplified
    // ======================================

    let total    = 0;
    let totalW   = 0;

    values.forEach(v => {

        // normalized dominance [0, 1]
        const dominance = (v - min) / range;

        // non-linear amplification
        // pow(1.7) makes winner get more than proportional share
        const competitiveWeight = 0.3 + Math.pow(dominance, 1.7) * 0.7;

        total  += v * competitiveWeight;
        totalW += competitiveWeight;
    });


    return totalW > 0 ? total / totalW : 0;
}



// ======================================
// MAIN ARBITRATION FUNCTION
// called once per candidate evaluation
// returns final decision score
// ======================================

export function arbitrate({

    // ======================================
    // RAW COMPONENT SCORES
    // from runPrediction scoring logic
    // ======================================

    rewardScore,
    semanticScore,
    confidenceScore,
    uncertaintyScore,
    curiosityScore,
    costScore,

    // ======================================
    // EXECUTIVE WEIGHTS
    // from motivational state engine
    // ======================================

    executiveWeights,

    // ======================================
    // COGNITIVE DRIFT
    // small controlled noise
    // ======================================

    drift = 0,

    // ======================================
    // HARD BLOCKS
    // ======================================

    isSelfLoop = false,

}) {


    // ======================================
    // HARD BLOCK — SELF LOOP
    // ======================================

    if (isSelfLoop) return -1000;


    // ======================================
    // STEP 1: NORMALIZE EACH COMPONENT
    // convert raw scores to [0,1] pressure
    //
    // scale values tuned so typical
    // scores map to meaningful [0,1] range
    // ======================================

    const pressureReward =
        normalizeComponent(rewardScore, 0, 10);

    const pressureSemantic =
        normalizeComponent(semanticScore, 0, 4);

    const pressureConfidence =
        normalizeComponent(confidenceScore, 0, 6);

    const pressureUncertainty =
        normalizeComponent(uncertaintyScore, 0, 3);

    const pressureCuriosity =
        normalizeComponent(curiosityScore, 0, 2.5);

    // cost is SUPPRESSIVE — high cost = high suppression
    const pressureCost =
        normalizeComponent(costScore, 0, 6);


    // ======================================
    // STEP 2: APPLY EXECUTIVE WEIGHTS
    // motivation scales each pressure
    // ======================================

    const {
        wReward,
        wSemantic,
        wConfidence,
        wUncertainty,
        wCuriosity,
        wCost
    } = executiveWeights;

    const weightedPressures = {

        reward:      pressureReward      * wReward,
        semantic:    pressureSemantic    * wSemantic,
        confidence:  pressureConfidence  * wConfidence,
        uncertainty: pressureUncertainty * wUncertainty,
        curiosity:   pressureCuriosity   * wCuriosity,

    };


    // ======================================
    // STEP 3: COMPETITIVE ARBITRATION
    // dominant pressure leads
    // others contribute scaled
    // ======================================

    const rawScore =
        competitiveArbitration(weightedPressures);


    // ======================================
    // STEP 4: COST SUPPRESSION
    // fatigue / repetition suppress drives
    // applied after competition
    // ======================================

    const costSuppression =
        pressureCost * wCost * 0.6;


    // ======================================
    // STEP 5: GOAL URGENCY AMPLIFIER
    // (passed as part of rewardScore)
    // already factored in — no separate step
    // ======================================


    // ======================================
    // STEP 6: FINAL SCORE
    // competitive score − cost + drift
    // ======================================

    const finalScore =
        rawScore -
        costSuppression +
        drift;


    // ======================================
    // SCALE TO USABLE RANGE
    // multiply to get scores in
    // same ballpark as old system
    // so downstream logic still works
    // ======================================

    return finalScore * 12;
}



// ======================================
// EXPLAIN DECISION
// returns human-readable breakdown
// for reasoning box display
// ======================================

export function explainArbitration({

    rewardScore,
    semanticScore,
    confidenceScore,
    uncertaintyScore,
    curiosityScore,
    costScore,
    executiveWeights,
    dominantDrive

}) {

    const { wReward, wSemantic, wConfidence, wCuriosity, wCost } =
        executiveWeights;

    const lines = [
        `🎯 Dominant drive: ${dominantDrive}`,
        `⭐ Reward pressure: ${(rewardScore * wReward).toFixed(2)}`,
        `🧠 Semantic pressure: ${(semanticScore * wSemantic).toFixed(2)}`,
        `💪 Confidence pressure: ${(confidenceScore * wConfidence).toFixed(2)}`,
        `🔍 Curiosity pressure: ${(curiosityScore * wCuriosity).toFixed(2)}`,
        `😴 Cost suppression: ${(costScore * wCost).toFixed(2)}`,
    ];

    return lines.join("\n");
}
// ── Q3 (Phase 1.0): seeded RNG routing ───────────────────────────
// Live randomness draws through liveRng() so a run is reproducible
// under an explicit seed. With no seed set liveRng() returns exactly
// Math.random(), so unseeded behaviour is byte-for-byte unchanged.
import { liveRng } from "../instrumentation/rng.js";

// ======================================
// DECISION SCORING SYSTEM
// ======================================
// calculates how intelligent each choice is
// higher score = brain prefers this path
// ======================================
//
// ── D3 REPAIR — Phase 1.0, 2026-08-18 ──────────────────────────────
// The finalWeight expression was a single 90-line chained +/- sum.
// The alternation drifted after `localFear * 2.2 -`, inverting five
// terms. Measured pre-repair (Phase 0 Probe C / research/cognitive-audit):
//
//   boredomPenalty   d(score)/dx = +2.000   (a penalty that rewarded)
//   dangerPenalty                 = +2.000   (a penalty that rewarded)
//   stressState                   = +0.575
//   curiosityState                = -0.800
//   driveRewardBoost (hunger)     = -1.992   (an "amplifier" that suppressed)
//
// Intent was established from evidence internal to this file, not from
// desired behaviour:
//   * lastArbitrationBreakdown.costScore (below) classifies stressState
//     and boredomPenalty as COSTS, while finalWeight was adding them.
//   * lastArbitrationBreakdown.curiosityScore treats curiosityState as
//     a POSITIVE contribution, while finalWeight was subtracting it.
//   * driveRewardBoost is documented as "amplify reward-seeking" and its
//     sibling driveCuriosityBoost was added.
//   * dangerPenalty derives from the same `penalties` map used as a hard
//     candidate-rejection gate; it cannot coherently also promote.
//
// NO COEFFICIENT WAS CHANGED. Only five signs.
//
// The expression is now an explicit signed term array. Each term carries
// its own sign locally, so this defect cannot recur through operator
// drift. The array form was proven arithmetic-identical to the previous
// expression over 200,000 random contexts BEFORE the five signs were
// flipped (parity harness: research/cognitive-audit/probes/).
//
// NOTE — multi-path variables. stressState, fatigueState, reward, qValue,
// transitionBoost, habitBoost and confidenceState also reach finalWeight
// indirectly through `dynamicFocus`, and curiosityState additionally
// through `drift`. Those indirect paths are legitimate and were NOT
// touched. Consequently the post-repair derivative of stressState is
// -0.225 (= -0.400 direct + 0.175 via dynamicFocus), not -0.575.
// ──────────────────────────────────────────────────────────────────


// ======================================
// 🔮 FUTURE IMAGINATION MEMORY
// ======================================

// how much brain predicts future reward
export let liveFutureBonus = 0;


// ======================================
// 🧠 ARBITRATION BREAKDOWN
// ──────────────────────────────────────
// Stores component scores for HUD display.
// ======================================

export let lastArbitrationBreakdown = null;



// ======================================
// FINAL DECISION SCORE
// ======================================

export function calculateDecisionScore({

    transitionBoost,
    qValue,
    reward,
    habitBoost,
    curiosityBoost,
    chainReward,
    meaningBoost,
    futureBonus = 0,
    boredomPenalty,
    repetitionPenalty = 0,

    // ── Local path emotions ──────────────
    localConfidence = 0,
    localStress     = 0,
    localFatigue    = 0,
    localTrust      = 0,
    localFear       = 0,

    // ── Global behavior states ───────────
    curiosityState,
    confidenceState,
    stressState,
    fatigueState,
    focusState,

    // ── Penalties ────────────────────────
    dangerPenalty,
    selfLoopPenalty,

    // ── Bayesian trust ───────────────────
    bayesianTrust = 0.5,

    // ── Goal gradient ────────────────────
    goalGradientBoost = 0,

    // ── Schema abstraction ───────────────
    schemaBonus = 0,

    // ── Trajectory integrity ─────────────
    // How well this step fits inside a known
    // episode given the current path context.
    // 0 = never seen in this context
    // 1 = exact match in 5+ episodes
    // Dominates semantic similarity to prevent
    // shortcut collapse. Fix 4.
    trajectoryIntegrity = 0,

    // ── Semantic vitality ────────────────
    // Experience-based semantic signal.
    // Grows from verified episode learning,
    // not from raw embedding similarity.
    // Previously computed but thrown away.
    semanticVitalityScore = 0,

    // ── Noise suppression ────────────────
    // Edges seen < 3 times = noise (negative).
    // Edges seen 8+ times = stable (positive).
    // Removes spurious shortcut candidates.
    noiseSuppressedScore = 0,

    // ── Long-term consolidation ──────────
    // Bonus for edges that recur across many
    // episodes and are promoted to stable LTM.
    consolidationBonus = 0,

    // ── Attention amplification ──────────
    // Aligned with current focus = amplified.
    // Misaligned = suppressed. Scalar signal.
    attentionAmplifiedScore = 0,

    // ── Prediction uncertainty ───────────
    // High when brain world-model is wrong.
    // Reduces semantic weight, increases
    // exploration. Range [0..1].
    uncertaintyScore = 0,

    // ── Motivational drive ───────────────
    // "hunger" | "boredom" | "stress" | "fatigue"
    // Shifts which signals the brain weights most.
    dominantDrive = null,

    // ── Executive weights ─────────────────
    // Computed by executive controller from
    // motivational state. Object with fields:
    // { explore, exploit, rest, avoid }
    executiveWeights = null,

    // ── Additional params (accepted, unused) ─
    // Prevents "unknown property" warnings when
    // the caller spreads extra context objects.
    uncertaintyState,
    transitionUncertainty,
    sequenceError,
    ...rest

}) {


    // ── store future for HUD ─────────────
    liveFutureBonus = futureBonus;


    // ======================================
    // 🧠 TRUST BONUS
    // ======================================

    const trustBonus =
        Math.max(0, bayesianTrust - 0.5) * 8;


    // ======================================
    // 🧠 SEMANTIC WEIGHT
    // reward-adaptive: high reward → semantic
    // is just a tiebreaker
    // ======================================

    let semanticWeight = 0.35;
    semanticWeight -= reward * 0.02;
    semanticWeight = Math.max(0.08, semanticWeight);


    // ======================================
    // 🧠 REPETITION FATIGUE
    // ======================================

    const repetitionFatigue =
        Math.max(0, qValue - 2) * 1.2;


    // ======================================
    // 🧠 COGNITIVE DRIFT
    // ======================================

    const drift =
        (liveRng() - 0.5) *
        curiosityState *
        0.06;


    // ======================================
    // 🧠 FOCUS (always positive for HUD)
    // ──────────────────────────────────────
    // Old formula: confidenceState - stressState
    // went negative when stress was high,
    // showing Focus: 0.00 always.
    // New: soft-clamp to [0..20] range.
    // ======================================

    // focus = directed capacity.
    // exponential stress decay keeps it positive even under high stress:
    //   conf=2.56, stress=11.08 → focus ≈ 1.77 (visible in HUD)
    //   conf=10,   stress=0     → focus = 10   (fully focused)
    //   conf=5,    stress=30    → focus ≈ 1.70 (stressed but functional)
    const effectiveFocus =
        Math.max(0, confidenceState) *
        Math.exp(-stressState / 30);


    // ======================================
    // 🧠 DYNAMICFOCUS (attention system)
    // ======================================

    const rewardAttention =
        reward * 0.8 +
        chainReward * 1.2 +
        qValue * 0.6;

    const efficiencyAttention =
        transitionBoost * 0.5 +
        habitBoost * 0.4;

    const confidenceStability =
        Math.min(confidenceState, 20) * 0.8 +
        effectiveFocus * 0.5;

    const fatigueSuppression = fatigueState * 0.9;
    const stressSuppression  = stressState  * 0.7;

    const dynamicFocus =
        rewardAttention +
        efficiencyAttention +
        confidenceStability -
        fatigueSuppression -
        stressSuppression;


    // ======================================
    // 🧠 MOTIVATIONAL DRIVE MODIFIER
    // ──────────────────────────────────────
    // The dominant motivational drive shifts
    // which signals the brain amplifies.
    // All modifiers are gentle — they nudge
    // preference without overriding learning.
    //
    // hunger  → amplify reward-seeking
    // boredom → amplify novelty/curiosity
    // stress  → amplify goal gradient (escape)
    // fatigue → reduce all amplification
    // ======================================

    let driveRewardBoost   = 0;
    let driveCuriosityBoost = 0;
    let driveGoalBoost     = 0;

    if (dominantDrive === "hunger") {
        driveRewardBoost = Math.tanh(reward * 0.1) * 3;
    } else if (dominantDrive === "boredom") {
        driveCuriosityBoost = curiosityBoost * 1.5;
    } else if (dominantDrive === "stress") {
        driveGoalBoost = goalGradientBoost > 0 ? 4 : 0;
    }
    // fatigue: no boost, handled by fatigueState suppression


    // ======================================
    // 🧠 EXECUTIVE EXPLOIT/EXPLORE WEIGHT
    // ──────────────────────────────────────
    // executiveWeights.exploit scales how much
    // the brain trusts its trained knowledge.
    // executiveWeights.explore scales novelty.
    // Both default to 1.0 when not provided.
    // ======================================

    const exploitW = executiveWeights?.exploit ?? 1.0;
    const exploreW = executiveWeights?.explore ?? 1.0;


    // ======================================
    // 🧠 UNCERTAINTY MODULATION
    // ──────────────────────────────────────
    // When prediction uncertainty is high,
    // the brain's world-model is unreliable.
    // Reduce how much semantic meaning
    // contributes (it's the least reliable
    // signal when the model is confused).
    // Keep Q and reward — they are ground truth.
    // ======================================

    const uncertaintySemanticDamp =
        1.0 - Math.min(uncertaintyScore * 0.5, 0.4);


    // ======================================
    // FINAL BRAIN INTELLIGENCE SCORE
    // ======================================

    // ======================================
    // FINAL BRAIN INTELLIGENCE SCORE
    // ── explicit signed term array ─────────
    // Every term carries its own sign. No
    // chained +/- alternation. Arithmetic is
    // identical to the previous expression;
    // this form exists so a sign is locally
    // visible and cannot drift again.
    // ======================================

    const TERMS = [
        // ── PROCEDURAL (Q + transitions) ───
        ['transitionBoost',         transitionBoost * 3 * exploitW],
        ['qValue',                  qValue * 5 * exploitW],
        ['reward',                  Math.tanh(reward * 0.1) * 8],
        ['habitBoost',              habitBoost * 2 * exploitW],
        // ── NOVELTY / EXPLORATION ───────────
        ['curiosityBoost',          curiosityBoost * 2 * exploreW],
        // ── CHAIN / EPISODE MEMORY ──────────
        ['chainReward',             chainReward * 4],
        // ── SEMANTIC ───────────────────────
        ['meaningBoost',            meaningBoost * semanticWeight * uncertaintySemanticDamp],
        ['semanticVitalityScore',   semanticVitalityScore * 1.2 * uncertaintySemanticDamp],
        ['noiseSuppressedScore',    noiseSuppressedScore * 1.0],
        ['consolidationBonus',      consolidationBonus * 2.0],
        ['attentionAmplifiedScore', attentionAmplifiedScore * 0.4],
        // ── FUTURE ─────────────────────────
        ['futureBonus',             futureBonus * 1.2],
        // ── GOAL GRADIENT ──────────────────
        ['goalGradientBoost',       goalGradientBoost * 2.0],
        ['driveGoalBoost',          driveGoalBoost],
        // ── SCHEMA / TRAJECTORY ─────────────
        ['schemaBonus',             schemaBonus * 15],
        ['trajectoryIntegrity',     trajectoryIntegrity * 40],
        // ── TRUST ──────────────────────────
        ['trustBonus',              trustBonus * 1.5],
        // ── LOCAL PATH EMOTIONS ─────────────
        ['localConfidence',         localConfidence * 1.5],
        ['localTrust',              localTrust * 1.2],
        ['localStress',            -localStress * 1.4],
        ['localFatigue',           -localFatigue * 1.1],
        ['localFear',              -localFear * 2.2],
        // ── MOTIVATIONAL DRIVE ──────────────
        ['driveRewardBoost',        driveRewardBoost],                    // D3 FIX: was subtracted
        ['driveCuriosityBoost',     driveCuriosityBoost],
        // ── PENALTIES ──────────────────────
        ['boredomPenalty',         -boredomPenalty * 2],                  // D3 FIX: was added
        ['repetitionPenalty',      -(repetitionPenalty > 0
                                        ? Math.pow(repetitionPenalty + 1, 2.5) * 2.5
                                        : 0)],
        // ── BEHAVIOR STATE ──────────────────
        ['curiosityState',          curiosityState * 0.8],                // D3 FIX: was subtracted
        ['confidenceState',         Math.min(confidenceState, 20) * 0.5],
        ['stressState',            -stressState * 0.4],                   // D3 FIX: was added
        ['fatigueState',           -fatigueState * 0.35],
        ['fatigueOverload',        -Math.max(0, fatigueState - 140) * 0.5],
        ['dynamicFocus',           -dynamicFocus * 0.25],
        ['dangerPenalty',          -dangerPenalty * 2],                   // D3 FIX: was added
        ['selfLoopPenalty',        -selfLoopPenalty],
        ['repetitionFatigue',      -repetitionFatigue],
        ['drift',                  -drift],
    ];

    let finalWeight = 0;
    for (let i = 0; i < TERMS.length; i++) finalWeight += TERMS[i][1];


    // ======================================
    // 🧠 POPULATE ARBITRATION BREAKDOWN
    // ======================================

    lastArbitrationBreakdown = {

        rewardScore:
            qValue * 5 +
            (Math.tanh(reward * 0.1) * 8) +
            chainReward * 4 +
            goalGradientBoost * 2.0 +
            driveRewardBoost,

        semanticScore:
            meaningBoost * semanticWeight * uncertaintySemanticDamp +
            semanticVitalityScore * 1.2 +
            futureBonus * 1.2,

        confidenceScore:
            transitionBoost * 3 +
            habitBoost * 2 +
            trustBonus * 1.5 +
            consolidationBonus * 2.0,

        curiosityScore:
            curiosityBoost * 2 +
            curiosityState * 0.8 +
            driveCuriosityBoost,

        costScore:
            fatigueState * 0.35 +
            stressState  * 0.4 +
            boredomPenalty * 2 +
            (repetitionPenalty > 0
                ? Math.pow(repetitionPenalty + 1, 2.5) * 2.5
                : 0),

        // ── SCHEMA REUSE MEASUREMENT ─────────────────────────────
        // Captures the exact schema contribution to finalWeight.
        // Expression is identical to line 326 (schemaBonus * 15)
        // so this field is not an approximation — it IS the schema
        // term that entered finalWeight.
        //
        // schemaBonus = 0  → no schema matched this transition.
        // schemaBonus > 0  → a formed schema covers this edge;
        //                    schemaScore is the points it added.
        //
        // This field enables:
        //   1. Per-decision measurement of schema causal influence.
        //   2. Correct wiring of the HUD's memory bar (replaces
        //      the stablePaths proxy currently used there).
        //   3. Falsifiable logging: log only when > 0.
        schemaScore: schemaBonus * 15,

    };


    // ======================================
    // 🛡️ FINAL SCORE CLAMP
    // ======================================

    return Math.max(-400, Math.min(400, finalWeight));
}
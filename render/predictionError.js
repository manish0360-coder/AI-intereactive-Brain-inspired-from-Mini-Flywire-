// ======================================
// 🧠 PREDICTION ERROR SYSTEM
// ======================================
// Structural predictive-processing layer.
//
// Architecture:
//   BEFORE action → generateExpectation()
//     stores what brain predicts will happen
//
//   AFTER action  → evaluatePredictionError()
//     compares prediction against reality
//     returns structured error object
//
// The error object is a first-class cognitive
// signal consumed by ALL downstream systems:
//   - Q-learning authority
//   - trajectory commitment
//   - chunk execution
//   - attention width (epsilon)
//   - confidence & curiosity
//   - uncertainty accumulation
//   - replay eligibility
//   - semantic trust
// ======================================



// ======================================
// UNCERTAINTY STATE
// ──────────────────────────────────────
// Rises from prediction failures.
// Decays from successful predictions.
// This is REALITY-ANCHORED confidence.
// Unlike confidenceState (which grows from
// visit counts), uncertaintyState is grounded
// in actual prediction accuracy.
// ======================================

export let uncertaintyState = 0.3;




// ======================================
// ROLLING ERROR HISTORY
// ──────────────────────────────────────
// Smoothed signal over recent steps.
// Prevents single-step overreaction.
// Used for replay eligibility of episodes.
// ======================================

const errorHistory   = [];
const ERROR_WINDOW   = 20;




// ======================================
// ACTIVE EXPECTATION
// ──────────────────────────────────────
// Stored BEFORE each action is executed.
// Consumed by evaluatePredictionError().
// null means no expectation was generated
// (epsilon jump or no candidates).
// ======================================

let activeExpectation = null;




// ======================================
// GENERATE EXPECTATION
// ======================================
// Call BEFORE movement (step === 0 of
// runPrediction, after nextKey is chosen).
//
// Brain commits to what it predicts will
// happen when it takes the chosen action.
// ======================================

export function generateExpectation({

    predictedNextId,       // chosen next node ID
    predictedReward,       // reward.get(from->to) at decision time
    predictedSimilarity,   // semantic similarity at decision time
    predictedConfidence,   // confidenceState at decision time
    predictedGoalProgress, // goalBoost at decision time (0 if no goal)
    fromKey                // starting node (for verification)

}) {

    activeExpectation = {

        predictedNextId,
        predictedReward:       predictedReward      || 0,
        predictedSimilarity:   predictedSimilarity  || 0,
        predictedConfidence:   predictedConfidence  || 0,
        predictedGoalProgress: predictedGoalProgress || 0,
        fromKey,
        timestamp: Date.now()

    };

}




// ======================================
// EVALUATE PREDICTION ERROR
// ======================================
// Call AFTER movement, once actual outcome
// is known (rewardSignal + sim are computed).
//
// Returns null if no expectation was stored
// (epsilon jump case — handled gracefully).
// ======================================

export function evaluatePredictionError({

    actualNextId,         // where brain actually went
    actualReward,         // rewardSignal actually received
    actualSimilarity,     // actual embedding similarity
    actualGoalProgress    // 3 if goal reached, 0 otherwise

}) {

    // ======================================
    // NO STORED EXPECTATION
    // This happens on epsilon random jumps.
    // Return null — caller handles gracefully.
    // ======================================

    if (!activeExpectation) return null;

    const exp = activeExpectation;
    activeExpectation = null; // consume: one expectation, one evaluation




    // ======================================
    // STATE PREDICTION ERROR
    // ──────────────────────────────────────
    // Did the brain end up where it predicted?
    // 0.0 = exact match (brain was right)
    // 1.0 = completely wrong destination
    //
    // In normal operation (no epsilon), this
    // is 0 because the agent goes exactly where
    // it chose. Non-zero when trajectory breaks
    // or external redirection occurs.
    // ======================================

    const statePredictionError =
        (String(exp.predictedNextId) === String(actualNextId))
        ? 0.0
        : 1.0;




    // ======================================
    // REWARD PREDICTION ERROR
    // ──────────────────────────────────────
    // Was the outcome as rewarding as expected?
    //
    // Normalization: rewards range roughly
    // -2 to +12. Divide by 6 for 0..1 scale.
    // This is the MOST informative error signal.
    // A path looked rewarding (high memory reward)
    // but delivered low rewardSignal → large error.
    // ======================================

    const rawRewardDiff =
        Math.abs(
            (exp.predictedReward || 0) -
            (actualReward        || 0)
        );

    const rewardPredictionError =
        Math.min(rawRewardDiff / 6.0, 1.0);




    // ======================================
    // SEMANTIC PREDICTION ERROR
    // ──────────────────────────────────────
    // Was the semantic context as expected?
    //
    // Similarity ranges -1 to +1.
    // Maximum difference is 2.0 (opposite poles).
    // Divide by 2 to normalize to 0..1.
    // ======================================

    const semanticPredictionError =
        Math.min(
            Math.abs(
                (exp.predictedSimilarity || 0) -
                (actualSimilarity        || 0)
            ) / 2.0,
            1.0
        );




    // ======================================
    // GOAL PREDICTION ERROR
    // ──────────────────────────────────────
    // Was goal progress as expected?
    //
    // goalBoost ranges 0..~5 (from candidateAnalysis).
    // Divide by 5 to normalize to 0..1.
    // ======================================

    const goalPredictionError =
        Math.min(
            Math.abs(
                (exp.predictedGoalProgress || 0) -
                (actualGoalProgress        || 0)
            ) / 5.0,
            1.0
        );




    // ======================================
    // COMPOSITE PREDICTION ERROR
    // ──────────────────────────────────────
    // Weighted combination of all components.
    //
    // Weights rationale:
    //   reward   (0.40): most informative signal
    //   state    (0.30): structural integrity
    //   semantic (0.20): contextual mismatch
    //   goal     (0.10): goal alignment
    //
    // Clamped to [0, 1].
    // ======================================

    const compositeError = Math.min(
        rewardPredictionError   * 0.40 +
        statePredictionError    * 0.30 +
        semanticPredictionError * 0.20 +
        goalPredictionError     * 0.10,
        1.0
    );




    // ======================================
    // UPDATE ROLLING ERROR HISTORY
    // ======================================

    errorHistory.push(compositeError);

    if (errorHistory.length > ERROR_WINDOW) {
        errorHistory.shift();
    }




    // ======================================
    // UPDATE UNCERTAINTY STATE
    // ──────────────────────────────────────
    // CRITICAL FIX: Added natural decay before
    // threshold checks. Without decay, a burst
    // of large errors (common during exploration)
    // saturates uncertaintyState at 1.0 within
    // ~6 steps and it NEVER recovers, because
    // the only decay path was compositeError < 0.20
    // (which almost never happens during normal nav).
    //
    // Natural decay rate 0.97 per step:
    // - From 1.0 with zero new errors:
    //   reaches 0.5 in ~23 steps, 0.1 in ~74 steps
    // - From 1.0 with medium ongoing errors (~0.35):
    //   stabilizes around 0.4-0.6 (realistic range)
    // - From 0.3 with small errors (<0.2):
    //   slowly approaches floor of 0.05
    // ======================================

    // natural decay: always applied first
    uncertaintyState *= 0.97;

    if (compositeError > 0.50) {

        // significant mismatch: spike proportionally
        uncertaintyState = Math.min(
            uncertaintyState + compositeError * 0.12,
            1.0
        );

    } else if (compositeError < 0.20) {

        // good prediction: uncertainty heals (decay already applied above)
        uncertaintyState = Math.max(
            uncertaintyState,
            0.05   // floor: brain always has some uncertainty
        );

    } else {

        // mild mismatch: tiny perturbation (decay dominates)
        uncertaintyState = Math.min(
            uncertaintyState + compositeError * 0.015,
            1.0
        );
    }




    // ======================================
    // SEVERITY CLASSIFICATION
    // ──────────────────────────────────────
    // Four tiers drive categorical responses.
    //
    // "small"   < 0.20 → mild adaptation only
    // "medium"  < 0.45 → moderate recalibration
    // "large"   < 0.70 → break trajectory lock
    // "massive" ≥ 0.70 → emergency recovery
    // ======================================

    let severity;

    if      (compositeError < 0.20) severity = "small";
    else if (compositeError < 0.45) severity = "medium";
    else if (compositeError < 0.70) severity = "large";
    else                            severity = "massive";




    // ======================================
    // RETURN STRUCTURED ERROR OBJECT
    // ──────────────────────────────────────
    // All downstream systems consume this.
    // Each flag targets one specific system.
    // ======================================

    return {

        // ── Raw Error Components ──────────────────
        statePredictionError,
        rewardPredictionError,
        semanticPredictionError,
        goalPredictionError,
        compositeError,
        severity,

        // ── Trajectory System ─────────────────────
        // Large error means the world diverged from
        // prediction — committed path is no longer valid.
        shouldBreakTrajectory: compositeError > 0.45,

        // ── Chunk System ──────────────────────────
        // Larger error interrupts chunk autoplay.
        // Real brains never blindly execute chunks.
        shouldInterruptChunk:  compositeError > 0.55,

        // ── Emergency Recovery ────────────────────
        // Massive mismatch triggers home-seeking.
        shouldTriggerRecovery: compositeError > 0.75,

        // ── Replay Eligibility ────────────────────
        // Only replay predictively stable episodes.
        // High-error episodes contain corrupted data.
        replayEligible:        compositeError < 0.35,

        // ── Attention Width ───────────────────────
        // 0.0 = narrow focus (prediction was right)
        // 1.0 = wide exploration (brain was wrong)
        // Drives epsilon boost in runPrediction.
        attentionWidening: compositeError,

        // ── Learning Authority ────────────────────
        // Large surprise = less trustworthy update.
        // Prevents corrupted memories from shocking
        // the Q-table with bad signals.
        // Floor raised 0.10 → 0.25:
        // effectiveLR = 0.1 * 0.25 = 0.025 minimum.
        // Old floor (0.10) gave effectiveLR=0.010,
        // too slow to converge Q meaningfully.
        learningAuthority: Math.max(
            0.25,
            1.0 - compositeError * 0.5
        ),

        // ── Semantic Trust ────────────────────────
        // High uncertainty means semantic associations
        // are unreliable. Suppresses meaningBoost weight.
        // Critical for safe Ollama integration.
        semanticTrust: Math.max(
            0.05,
            1.0 - uncertaintyState * 0.5
        ),

        // ── Curiosity Signal ──────────────────────
        // Medium surprise boosts novelty-seeking.
        // Overwhelming surprise suppresses it (freeze).
        // Only fires in the "interesting" range.
        curiositySignal: (compositeError > 0.15 && compositeError < 0.65)
            ? compositeError * 0.40
            : 0,

        // ── Current Uncertainty ───────────────────
        // Snapshot of global uncertainty state
        // at time of this error evaluation.
        uncertainty: uncertaintyState

    };

}




// ======================================
// GET ROLLING AVERAGE ERROR
// ──────────────────────────────────────
// Smoothed prediction quality over recent
// steps. Used for episode storage.
// Episodes store their rolling error at
// the moment of goal-reaching.
// ======================================

export function getRollingError() {

    if (errorHistory.length === 0) return 0;

    const sum = errorHistory.reduce((a, b) => a + b, 0);
    return sum / errorHistory.length;

}




// ======================================
// RESET ACTIVE EXPECTATION
// ──────────────────────────────────────
// Call when trajectory is forcibly reset
// to prevent stale expectation from the
// previous episode contaminating the next.
// ======================================

export function resetExpectation() {

    activeExpectation = null;

}



// ======================================
// ══════════════════════════════════════
// 🧠 PREDICTIVE COGNITION LAYER — v2
// ══════════════════════════════════════
// Extensions beyond global uncertainty:
//
// 1. PER-TRANSITION UNCERTAINTY
//    Each transition "from→to" tracks its own
//    reliability. Q=20 on lion→hunt is meaningless
//    if that transition consistently surprises.
//
// 2. SEQUENCE-LEVEL ERROR
//    Single-step correctness ≠ sequence coherence.
//    A 6-step window of repeated nodes reveals
//    attractor lock even when each step "succeeds".
//
// 3. SEMANTIC EXPECTATION CONFIDENCE
//    Per label-pair tracking of how often the
//    semantic prediction was borne out by reward.
//    Wrong semantic expectations weaken over time.
//
// All three feed into scoring and Q damping
// to create multi-level predictive correction.
// ======================================


// ======================================
// PER-TRANSITION UNCERTAINTY
// ──────────────────────────────────────
// Exponential moving average of surprise
// for each specific transition.
//
// key: "fromId->toId"  (IDs as strings)
// value: uncertainty in [0, 1]
//
// Update rule (stable EMA):
//   u_new = u_old + α × (error - u_old)
//   → converges to average error for this path
//   → guaranteed non-oscillating
// ======================================

const transitionUncertaintyMap = new Map();

const TRANSITION_UNCERTAINTY_LR = 0.12; // EMA learning rate
const TRANSITION_UNCERTAINTY_DECAY = 0.998; // natural slow decay toward 0



export function updateTransitionUncertainty(fromId, toId, errorMagnitude) {

    const key = String(fromId) + "->" + String(toId);

    const old = transitionUncertaintyMap.get(key) || 0;

    // EMA update: pull toward observed error
    const updated =
        old + TRANSITION_UNCERTAINTY_LR * (errorMagnitude - old);

    transitionUncertaintyMap.set(
        key,
        Math.min(Math.max(updated, 0), 1)
    );

}



export function getTransitionUncertainty(fromId, toId) {

    const key = String(fromId) + "->" + String(toId);

    const raw = transitionUncertaintyMap.get(key) || 0;

    // apply slow natural decay on each read
    // prevents uncertainty from being permanent
    // even for transitions that later stabilize
    const decayed = raw * TRANSITION_UNCERTAINTY_DECAY;

    if (decayed < 0.005) {
        transitionUncertaintyMap.delete(key);
        return 0;
    }

    transitionUncertaintyMap.set(key, decayed);

    return decayed;

}



// ======================================
// SEQUENCE-LEVEL ERROR
// ──────────────────────────────────────
// Tracks the last N actual step IDs.
// Computes a repetition ratio:
//   0.0 = all unique nodes (diverse)
//   1.0 = only one node repeated (stuck)
//
// This is sequence-level error: the brain
// may score each individual step correctly
// (sim > 0.45 → rewardSignal=2) but still
// be trapped in a meaningless closed loop.
//
// At ratio > 0.5 → sequence error is high.
// ======================================

const sequenceBuffer  = [];
const SEQUENCE_WINDOW = 8; // track 8 recent steps
let   currentSequenceError = 0;



export function updateSequenceError(actualId) {

    sequenceBuffer.push(String(actualId));

    if (sequenceBuffer.length > SEQUENCE_WINDOW) {
        sequenceBuffer.shift();
    }

    if (sequenceBuffer.length < 3) {
        currentSequenceError = 0;
        return;
    }

    const uniqueNodes = new Set(sequenceBuffer).size;
    const totalSteps  = sequenceBuffer.length;

    // repetition ratio: high = stuck in loop
    currentSequenceError = 1 - (uniqueNodes / totalSteps);

}



export function getSequenceError() {

    return currentSequenceError;

}



// ======================================
// SEMANTIC EXPECTATION CONFIDENCE
// ──────────────────────────────────────
// Tracks how reliably each semantic pair
// (label1 → label2) predicts good outcomes.
//
// key: "lion->hunt" (concept labels)
// value: confidence in [0, 1]
//
// Starts at 0.5 (neutral).
// Rises when semantic expectation is met.
// Falls when semantic expectation is violated.
//
// Used in candidateAnalysis to modulate
// meaningBoost BEYOND refractory inhibition:
// even a fresh pair with no refractory gets
// reduced boost if its past predictions were wrong.
// ======================================

const semanticExpectationConfidence = new Map();

const SEMANTIC_CONFIDENCE_LR    = 0.08;
const SEMANTIC_CONFIDENCE_FLOOR = 0.15; // never fully suppressed
const SEMANTIC_CONFIDENCE_INIT  = 0.60; // start optimistic



export function recordSemanticExpectationOutcome(fromLabel, toLabel, errorMagnitude) {

    const key = fromLabel + "->" + toLabel;

    const old = semanticExpectationConfidence.get(key) || SEMANTIC_CONFIDENCE_INIT;

    // when errorMagnitude is high (semantic prediction wrong):
    //   confidence falls toward floor
    // when errorMagnitude is low (semantic prediction right):
    //   confidence rises toward 1.0
    const target = 1.0 - errorMagnitude; // high error → low target

    const updated = old + SEMANTIC_CONFIDENCE_LR * (target - old);

    semanticExpectationConfidence.set(
        key,
        Math.min(Math.max(updated, SEMANTIC_CONFIDENCE_FLOOR), 1.0)
    );

}



export function getSemanticExpectationConfidence(fromLabel, toLabel) {

    const key = fromLabel + "->" + toLabel;

    return semanticExpectationConfidence.get(key) || SEMANTIC_CONFIDENCE_INIT;

}



// ======================================
// DECAY ALL PER-TRANSITION UNCERTAINTY
// ──────────────────────────────────────
// Call once per runAgentLoop to prevent
// permanent uncertainty accumulation on
// transitions that later become stable.
// ======================================

export function decayTransitionUncertainties() {

    transitionUncertaintyMap.forEach((value, key) => {

        const decayed = value * 0.995;

        if (decayed < 0.005) {
            transitionUncertaintyMap.delete(key);
        } else {
            transitionUncertaintyMap.set(key, decayed);
        }

    });

    semanticExpectationConfidence.forEach((value, key) => {

        // semantic confidence drifts toward init value over time
        // prevents permanent lock-in of any expectation
        const drifted = value + 0.001 * (SEMANTIC_CONFIDENCE_INIT - value);
        semanticExpectationConfidence.set(key, drifted);

    });

}
// ======================================
// M1 (The Spine)
// ======================================
// Non-invasive observation wrapper around the REAL decision path.
// It calls the unmodified scoring/executive functions, then emits a
// schema-valid decision frame. It never alters their outputs, so it
// cannot affect behavior (behavior-neutral by construction).
// ======================================

import { emit } from "../../instrumentation/telemetryBus.js";
import { CHANNELS, TYPES } from "../../instrumentation/traceSchema.js";

// Mirror scoring.js's EXACT executive-weight read so the trace records
// the *effective* multipliers the scorer actually used — this is how a
// silent `?? 1.0` default becomes visible in telemetry.
function effectiveExecW(executiveWeights) {
    return {
        exploit: executiveWeights?.exploit ?? 1.0,
        explore: executiveWeights?.explore ?? 1.0,
        // also surface whether the object even had the fields scoring wants
        hasExploit: executiveWeights ? "exploit" in executiveWeights : false,
        hasExplore: executiveWeights ? "explore" in executiveWeights : false,
    };
}

// Run one candidate through scoring (60% path) and, if a breakdown +
// weights exist, arbitrate (40% path); emit a decision frame.
export function probeDecision({
    tickId,
    candidateKey,
    ctx,                 // inputs to calculateDecisionScore
    executiveWeights,    // the object main.js builds
    calculateDecisionScore,
    arbitrate,
    lastArbitrationBreakdownRef, // () => module.lastArbitrationBreakdown
    uncertaintyScoreValue = 0,
    isSelfLoop = false,
}) {
    const finalWeight = calculateDecisionScore({ ...ctx, executiveWeights });
    const breakdown = lastArbitrationBreakdownRef();

    let competitiveScore = null;
    if (breakdown && executiveWeights && arbitrate) {
        competitiveScore = arbitrate({
            rewardScore: breakdown.rewardScore,
            semanticScore: breakdown.semanticScore,
            confidenceScore: breakdown.confidenceScore,
            uncertaintyScore: uncertaintyScoreValue,
            curiosityScore: breakdown.curiosityScore,
            costScore: breakdown.costScore,
            executiveWeights,
            drift: 0,
            isSelfLoop,
        });
    }

    const blended =
        competitiveScore == null ? finalWeight : finalWeight * 0.6 + competitiveScore * 0.4;

    emit({
        tickId,
        channel: CHANNELS.DECISION,
        type: TYPES.DECISION_FRAME,
        payload: {
            candidateKey,
            finalWeight,                       // 60% path output
            competitiveScore,                  // 40% path output
            blendedScore: blended,             // what main.js pushes as weight
            effectiveExecutiveWeights: effectiveExecW(executiveWeights),
            executiveWeightsSchema: executiveWeights ? Object.keys(executiveWeights) : null,
            breakdown,
        },
    });

    return { finalWeight, competitiveScore, blended };
}
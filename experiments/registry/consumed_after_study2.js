// ==========================================================
// SEED-CONSUMPTION REGISTRY — successor link after FutureScore V2.3 Study 2
// ==========================================================
// ADMINISTRATIVE ONLY. This file records which configuration-seed territory is
// spent. It changes no scientific definition, no estimand, no threshold, no
// production behaviour, and no existing module's behaviour.
//
// WHY A NEW LINK (the M34 convention, unchanged)
//   A consumed range must stop a FUTURE study from drawing new measurements there.
//   It must NOT stop an existing verifier from reproducing an existing result.
//   consumed_after_c1.js is therefore left exactly as committed; this link spreads
//   its list unchanged and in order, and adds the Study-2 block. The typed layer
//   (experiments/registry/typed.js) delegates configuration decisions here.
//
// WHAT IS CLAIMED, AND FROM WHERE
//   Territory: the whole Director-authorized block 890000-892999 is consumed,
//   because it was registered as Study 2's block (experiments/study2/STUDY2_REGISTRATION.json)
//   and a registered block is never re-offered, whether or not every seed in it
//   was requested.
//   Evaluation: exactly the seeds the acceptance walk requested, read from the
//   committed plan (experiments/study2/execution/PLAN.json .requested / .seedCensus):
//   890000-890643, 644 seeds, strictly ascending; 16 accepted configurations; the
//   remaining 890644-892999 were never generated. The Study-2 execution gate
//   (experiments/study2/verify_study2_execution.js) re-reads these numbers.
// ==========================================================
import { CONSUMED_RANGES as C1_LINK_CONSUMED, HELD_OUT_FLOOR as C1_LINK_FLOOR,
         evaluationFor as c1LinkEvaluationFor } from './consumed_after_c1.js';

export const STUDY2_BLOCK = Object.freeze({
    lo: 890000, hi: 892999,
    study: 'FS-V2.3-Study2',
    category: 'registered',
    why: 'FutureScore V2.3 Study 2 (OQ-1a) registered block, executed under the Director authorization of 2026-09-26',
    evaluation: Object.freeze({
        kind: 'sequential-acceptance-walk',
        evaluatedCount: 644,
        evaluatedMin: 890000,
        evaluatedMax: 890643,
        acceptedConfigurations: 16,
        runsExecuted: 16,
        replayRuns: 1,
        source: 'experiments/study2/execution/PLAN.json .requested, .seedCensus and .slots',
    }),
});

// The chain: Study 2's block becomes consumed here. The inherited list is spread unchanged and in order.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: STUDY2_BLOCK.lo, hi: STUDY2_BLOCK.hi, why: STUDY2_BLOCK.why }),
    ...C1_LINK_CONSUMED,
]);

export const HELD_OUT_FLOOR = C1_LINK_FLOOR;
export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);
export const rangeFor = (s) => CONSUMED_RANGES.find(r => s >= r.lo && s <= r.hi) ?? null;

/** What is actually known about evaluation of the range covering `s`. */
export const evaluationFor = (s) => {
    if (s >= STUDY2_BLOCK.lo && s <= STUDY2_BLOCK.hi) return STUDY2_BLOCK.evaluation;
    return c1LinkEvaluationFor(s);                    // every earlier claim, exactly as the predecessor states it
};

export const spentSummary = () => ({
    heldOutFloor: HELD_OUT_FLOOR,
    ranges: CONSUMED_RANGES.map(r => ({ lo: r.lo, hi: r.hi, why: r.why })),
    lowestConsumed: Math.min(...CONSUMED_RANGES.map(r => r.lo)),
});

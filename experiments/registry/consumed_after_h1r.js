// ==========================================================
// SEED-CONSUMPTION REGISTRY — successor link for H1-R (Milestone B)
// ==========================================================
// ADMINISTRATIVE ONLY. This file records which configuration-seed territory is
// spent. It changes no scientific definition, no estimand, no threshold, no
// production behaviour, and no existing module's behaviour.
//
// WHY A NEW LINK (the M34 convention, unchanged)
//   A consumed range must stop a FUTURE study from drawing new measurements there.
//   It must NOT stop an existing verifier from reproducing an existing result.
//   consumed_after_study2.js is therefore left exactly as committed; this link spreads
//   its list unchanged and in order, and adds the H1-R pilot block. The typed layer
//   (experiments/registry/typed.js) delegates configuration decisions here.
//
// WHAT IS RECORDED, AND UNDER WHICH AUTHORITY
//   H1-R v1.0 §7.6 (research/preregistrations/H1R_PREREGISTRATION_v1.0.md, SHA-256
//   c52e7337…a836) requires registry actions before any generation. This link performs
//   the first of them: the H1-R pilot configuration block 886000-889999 (v1.0 §7.1: the
//   ERR-07 accepted stream from 886000 with hard bound 889999; Stage 1 and the single
//   extension both draw from it). The second, the (H1-R, pilot) trajectory records for
//   20260819004-008, is in typed.js. Authorised by the Research Director's Milestone B
//   authorization of 2026-10-05.
//
// WHAT IS NOT RECORDED
//   - Nothing at or above the held-out floor. The confirmatory stream from 900500 and
//     the (H1-R, registered) confirmatory seeds are recorded only before Stage 2
//     (v1.0 §7.6), after the Stage-1 decision fixes S*. HELD_OUT_FLOOR is inherited
//     unchanged.
//   - No evaluation. "Consumed" is territory, not evidence of evaluation: when this
//     link was committed no H1-R configuration had been generated, so the evaluation
//     record says so. It does not anticipate what Stage 1 will evaluate.
//
// H1R_BLOCKS is what the H1-R orchestrator's read-only registry pre-check reads
// (experiments/h1r/orchestrate.mjs productionRegistry): a stage is executable only when
// its configuration block is listed here for H1-R and its trajectory seeds are recorded.
// ==========================================================
import { CONSUMED_RANGES as STUDY2_LINK_CONSUMED, HELD_OUT_FLOOR as STUDY2_LINK_FLOOR,
         evaluationFor as study2LinkEvaluationFor } from './consumed_after_study2.js';

export const H1R_PILOT_BLOCK = Object.freeze({
    lo: 886000, hi: 889999,
    study: 'H1-R',
    category: 'pilot',
    why: 'H1-R pilot configuration block (v1.0 §7.1, §7.6), recorded before any generation under the Director authorization of 2026-10-05',
    evaluation: Object.freeze({
        kind: 'recorded-before-generation',
        evaluatedCount: 0,
        evaluatedMin: null,
        evaluatedMax: null,
        acceptedConfigurations: 0,
        runsExecuted: 0,
        source: 'research/preregistrations/H1R_PREREGISTRATION_v1.0.md §7.1 and §7.6; no H1-R configuration had been generated when this link was committed',
    }),
});

/** The blocks recorded for H1-R, by use. Stage 1 and the extension use the pilot block. */
export const H1R_BLOCKS = Object.freeze([
    Object.freeze({ study: 'H1-R', use: 'pilot', lo: H1R_PILOT_BLOCK.lo, hi: H1R_PILOT_BLOCK.hi }),
]);

// The chain: the H1-R pilot block becomes consumed here. The inherited list is spread unchanged and in order.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: H1R_PILOT_BLOCK.lo, hi: H1R_PILOT_BLOCK.hi, why: H1R_PILOT_BLOCK.why }),
    ...STUDY2_LINK_CONSUMED,
]);

export const HELD_OUT_FLOOR = STUDY2_LINK_FLOOR;
export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);
export const rangeFor = (s) => CONSUMED_RANGES.find(r => s >= r.lo && s <= r.hi) ?? null;

/** What is actually known about evaluation of the range covering `s`. */
export const evaluationFor = (s) => {
    if (s >= H1R_PILOT_BLOCK.lo && s <= H1R_PILOT_BLOCK.hi) return H1R_PILOT_BLOCK.evaluation;
    return study2LinkEvaluationFor(s);                // every earlier claim, exactly as the predecessor states it
};

export const spentSummary = () => ({
    heldOutFloor: HELD_OUT_FLOOR,
    ranges: CONSUMED_RANGES.map(r => ({ lo: r.lo, hi: r.hi, why: r.why })),
    lowestConsumed: Math.min(...CONSUMED_RANGES.map(r => r.lo)),
});

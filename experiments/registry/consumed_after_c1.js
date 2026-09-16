// ==========================================================
// SEED-CONSUMPTION REGISTRY — successor link after C1  (M34)
// ==========================================================
// ADMINISTRATIVE ONLY. This file records which configuration-seed territory is
// spent. It changes no scientific definition, no estimand, no threshold, no
// production behaviour, and no existing module's behaviour.
//
// THE DEFECT THIS LINK REPAIRS
//   experiments/registry/consumed.js was written after UQ-B (c59d457) and BEFORE
//   the C1 census ran. It therefore does not list C1's own block, and
//   isConsumed(895500) is false there. C1 then executed at b23f2c5 and spent the
//   whole block: its committed seedCensus records evaluatedCount 1000 over
//   895000-895999. Since c59d457 nothing has updated the chain, so a future study
//   reading the old link would see 1000 spent seeds as available.
//
// WHY A NEW FILE RATHER THAN AN EDIT TO consumed.js
//   The same reason consumed.js itself gives for not editing uqb/protocol.js, and
//   it is decisive here too: committed verifiers execute the OLD semantics as
//   evidence of the state at their own commit —
//     experiments/m18/verify_registry.js   B1: "the C1 block remains entirely
//                                              unconsumed and available"
//     research/preregistrations/verify_m21.js  executes isConsumed(895500) === false
//     experiments/m15, m16, m17 verifiers  require the C1 range to be collision-free
//     experiments/c1/*                     protocol.assertSeedAllowed must keep
//                                          admitting C1's own block so the committed
//                                          census can be reproduced
//   Marking 895xxx consumed inside consumed.js would make every one of those report
//   a failure, and would rewrite a historical record rather than extend it.
//
//   THE DISTINCTION THAT RESOLVES IT, unchanged from M18: a consumed range must stop
//   a FUTURE study from drawing new measurements there. It must NOT stop an existing
//   verifier from reproducing an existing result. Historical tools keep their
//   historical path; every future study imports from here.
//
// WHAT IS *NOT* CLAIMED
//   "Consumed" is territory, not evidence of evaluation. Each range carries an
//   EVALUATION record saying exactly how much of it was evaluated. For 895xxx that
//   is all 1000 seeds, and the number is read from C1's own committed artifacts. For
//   896xxx it is explicitly a conservative block declaration over a partially
//   evaluated block, and this file does not upgrade that claim.
//
// WIRED INTO THE TYPED LAYER (M34 closure)
//   experiments/registry/typed.js delegates configuration decisions here, so a study
//   reaching governance through the typed layer is refused 895xxx. The M33 and M33-R1
//   verifiers are SOURCE-BOUND to the typed.js of their own commits, so that re-point
//   changes neither of their recorded results.
// ==========================================================
import { CONSUMED_RANGES as UQB_LINK_CONSUMED, HELD_OUT_FLOOR as UQB_LINK_FLOOR,
         DEV_FIXTURE_RANGE } from './consumed.js';

/**
 * C1's registered block, as executed.
 *
 * VERIFIABLE FROM THE COMMITTED RECORD (experiments/m34/verify.js re-reads all of it):
 *   evaluated      experiments/c1/results/c1_results.json .seedCensus:
 *                  { lo: 895000, hi: 895999, evaluatedCount: 1000,
 *                    evaluatedMin: 895000, evaluatedMax: 895999 }
 *                  and experiments/c1/data/candidates.jsonl, whose 4000 candidate
 *                  rows carry exactly the 1000 distinct seeds of the block
 *   accepted       70 configurations (.accounting.dispositions.ACCEPTED)
 *   executed       140 runs = 70 accepted configurations x 2 arms (.accounting.runsExecuted)
 *   authorization  C1_PREREGISTRATION.md v2.0, digest a2168c41… , frozen at f57820b;
 *                  collection executed at b23f2c5 under C1_COLLECTION_AUTHORISED=1
 */
export const C1_BLOCK = Object.freeze({
    lo: 895000, hi: 895999,
    study: 'C1',
    category: 'registered',
    why: 'C1 descriptive census, consumed at b23f2c5',
    evaluation: Object.freeze({
        kind: 'enumerated-in-full',
        evaluatedCount: 1000,
        evaluatedMin: 895000,
        evaluatedMax: 895999,
        acceptedConfigurations: 70,
        runsExecuted: 140,
        source: 'experiments/c1/results/c1_results.json .seedCensus and .accounting',
    }),
});

/**
 * The 896xxx development territory, carried forward with its claim UNCHANGED.
 * consumed.js declared the whole block conservatively while the committed record
 * shows specific fixtures. That remains exactly what is claimed here.
 */
export const DEV_FIXTURE_EVALUATION = Object.freeze({
    kind: 'block-declared-conservatively',
    evaluatedCount: null,
    enumeratedSubrange: Object.freeze({ lo: 896000, hi: 896099,
        why: 'UQ-B instrument generalization stress gate at f400fd3 enumerated 400 candidates' }),
    executedFixtures: Object.freeze([896066, 896084, 896132, 896238, 896329, 896403]),
    source: 'experiments/registry/consumed.js DEV_FIXTURE_RANGE',
});

// The chain: C1's block becomes consumed here, exactly as UQ-B's became consumed in
// consumed.js. The inherited list is spread unchanged and in order.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: C1_BLOCK.lo, hi: C1_BLOCK.hi, why: C1_BLOCK.why }),
    ...UQB_LINK_CONSUMED,
]);

export const HELD_OUT_FLOOR = UQB_LINK_FLOOR;

export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

/** The consumed range covering `s`, or null. Lets a caller cite WHY a seed is spent. */
export const rangeFor = (s) => CONSUMED_RANGES.find(r => s >= r.lo && s <= r.hi) ?? null;

/** What is actually known about evaluation of the range covering `s`. */
export const evaluationFor = (s) => {
    if (s >= C1_BLOCK.lo && s <= C1_BLOCK.hi) return C1_BLOCK.evaluation;
    if (s >= DEV_FIXTURE_RANGE.lo && s <= DEV_FIXTURE_RANGE.hi) return DEV_FIXTURE_EVALUATION;
    return null;
};

/**
 * The four territory states, named rather than implied. `consumed` and `reserved`
 * are the two that refuse a future draw; `evaluated` is evidence about consumed
 * territory, not a state; `proposed` is empty because M34 allocates nothing.
 */
export const TERRITORY = Object.freeze({
    consumed: CONSUMED_RANGES,
    reserved: Object.freeze({ heldOutFloor: HELD_OUT_FLOOR,
        why: 'never generated, inspected or inferred (frozen M7 §5.1 / ERR-07 §2)' }),
    proposed: Object.freeze([]),
    evaluation: Object.freeze({ '895000-895999': C1_BLOCK.evaluation,
                                '896000-896999': DEV_FIXTURE_EVALUATION }),
});

/**
 * The lowest seed a future study may consider, given everything spent.
 * Reported rather than enforced: choosing a block is a Director decision, and this
 * module records territory, it does not allocate it.
 */
export const spentSummary = () => ({
    heldOutFloor: HELD_OUT_FLOOR,
    ranges: CONSUMED_RANGES.map(r => ({ lo: r.lo, hi: r.hi, why: r.why })),
    lowestConsumed: Math.min(...CONSUMED_RANGES.map(r => r.lo)),
});

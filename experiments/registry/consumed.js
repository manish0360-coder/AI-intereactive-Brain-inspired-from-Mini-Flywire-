// ==========================================================
// SEED-CONSUMPTION REGISTRY — successor link after UQ-B
// ==========================================================
// ADMINISTRATIVE ONLY. This file records which seed territory is spent. It
// changes no scientific definition, no estimand, no threshold, no production
// behaviour, and no existing module's behaviour.
//
// THE CONVENTION IT FOLLOWS
//   The registry is a chain, and each link declares what the PREVIOUS
//   experiment consumed, then spreads the inherited list:
//
//     experiments/m8/protocol.js    base: M7 pilot, M7-ERR-09
//     experiments/q1/protocol.js    + M8's block,   ...M8_CONSUMED
//     experiments/uqa/protocol.js   + Q1's block,   ...Q1_CONSUMED
//     experiments/uqb/protocol.js   + UQ-A's block, ...UQA_CONSUMED
//     THIS FILE                     + UQ-B's block and the 896xxx development
//                                     territory,    ...UQB_CONSUMED
//
// WHY THIS IS A NEW FILE RATHER THAN AN EDIT TO uqb/protocol.js
//   Two independent reasons, and the second is decisive.
//
//   1. Governance: UQ-B is closed. Its collection is committed with digests and
//      its protocol module is part of that frozen record.
//
//   2. Function: `uqb/protocol.assertSeedAllowed` THROWS when `isConsumed(seed)`
//      is true. The 896xxx fixtures are still used, through that very function,
//      by committed tooling that reproduces committed results —
//        experiments/uqb/stress.js        (f400fd3)
//        experiments/m9/diagnose.js       (b7820b0)
//        experiments/m11/verify_repair.js (0f47d7b)
//        experiments/m12/audit.js         (d945ce6)
//        experiments/m14/derisk.js        (b825d1a)
//      Marking 896xxx consumed inside uqb/protocol.js would make every one of
//      those refuse to run. The registry would become "correct" at the cost of
//      breaking the evidence it exists to protect.
//
//   THE DISTINCTION THAT RESOLVES IT: a consumed range must stop a FUTURE study
//   from drawing new measurements there. It must NOT stop an existing verifier
//   from reproducing an existing result. Historical tools keep their historical
//   path (uqb/protocol.js, unchanged); every future study imports from here.
//
// PROVENANCE IS RECORDED, NOT INVENTED
//   Each entry's `why` cites the commit that introduced the use. The 896xxx
//   entry is deliberately declared as the WHOLE block while the committed
//   record shows specific fixtures — that is a conservative governance choice,
//   stated as such below, not a claim that all 1000 seeds were evaluated.
// ==========================================================
import { CONSUMED_RANGES as UQB_CONSUMED, HELD_OUT_FLOOR as UQB_FLOOR,
         FROZEN as UQB_FROZEN } from '../uqb/protocol.js';

/**
 * The development / instrument-fixture territory used from the UQ-B stress gate
 * through M17.
 *
 * VERIFIABLE FROM THE COMMITTED RECORD:
 *   896000-896099  enumerated in full (400 candidates) by the UQ-B instrument
 *                  generalization stress gate, f400fd3; accepted 896066/0,
 *                  896066/1, 896084/1 were run
 *   896066         goal-12 control fixture, b7820b0 / 0f47d7b / d945ce6 / b825d1a
 *   896132         accepted goal-8 fixture surfaced during fixture selection
 *   896238         accepted goal-16 fixture, b7820b0 / 0f47d7b / d945ce6 / b825d1a
 *   896329         accepted goal-16 and goal-19 fixture, same milestones
 *   896403         accepted goal-16 fixture, b7820b0
 *
 * WHY THE WHOLE BLOCK AND NOT ONLY THOSE POINTS:
 *   The block's ACCEPTANCE STRUCTURE was inspected during fixture selection in
 *   M9, M13 and M14 — scans over 896000-896999 for accepted configurations at
 *   each goal index, which is what surfaced the seeds above. Declaring only the
 *   run seeds would leave the inspected remainder available to a future study,
 *   which is exactly the accounting gap this repair closes. Declaring the whole
 *   block is the conservative choice and costs nothing: no future study needs
 *   this territory.
 */
export const DEV_FIXTURE_RANGE = Object.freeze({
    lo: 896000, hi: 896999,
    why: 'M9-M17 development and instrument-fixture territory; block enumerated ' +
         'by the UQ-B stress gate at f400fd3 and used for fixtures through b825d1a',
});

// Every block a study after UQ-B must not touch. UQ-B's own range becomes
// consumed here, exactly as UQ-A's became consumed in uqb/protocol.js.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: UQB_FROZEN.seedLo, hi: UQB_FROZEN.seedHi,
                    why: 'UQ-B collection, consumed at 1cc441f' }),
    DEV_FIXTURE_RANGE,
    ...UQB_CONSUMED,
]);

export const HELD_OUT_FLOOR = UQB_FLOOR;

export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

/**
 * The lowest seed a future study may consider, given everything spent.
 * Reported rather than enforced: choosing a block is a Director decision, and
 * this module records territory, it does not allocate it.
 */
export const spentSummary = () => ({
    heldOutFloor: HELD_OUT_FLOOR,
    ranges: CONSUMED_RANGES.map(r => ({ lo: r.lo, hi: r.hi, why: r.why })),
    lowestConsumed: Math.min(...CONSUMED_RANGES.map(r => r.lo)),
});

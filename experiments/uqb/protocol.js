// ==========================================================
// UQ-B PROTOCOL CONSTANTS AND SEED GUARDS
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQB_PREREGISTRATION.md v1.0, frozen at 3b3d195,
//   digest bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e,
//   as amended by UQB-ERR-01 (84c738e) and UQB-ERR-02 (59c2750).
//
// Every value below is quoted from the frozen protocol. Nothing here is
// derived, tuned, or adaptive.
//
// THE SEED BLOCK IS DISARMED BY DEFAULT — read §2 before changing anything.
//   The registered block 897000-897999 is REFUSED unless collection has been
//   explicitly authorised at the call site AND the process was started with the
//   authorisation flag. Development, preflight and every verifier therefore
//   cannot touch a registered seed even by mistake, because the refusal fires
//   before the seed can reach any run path.
//
// REUSE, NOT DUPLICATION
//   Consumed blocks and the held-out floor are imported from
//   experiments/uqa/protocol.js, which imports Q1's, which imports M8's. There
//   is one textual definition of each boundary in the repository.
// ==========================================================
import { CONSUMED_RANGES as UQA_CONSUMED, HELD_OUT_FLOOR as UQA_FLOOR,
         FROZEN as UQA_FROZEN } from '../uqa/protocol.js';

export const FROZEN = Object.freeze({
    // §17 — Director ruling of 2026-09-09
    seedLo: 897000,
    seedHi: 897999,
    // §14 — inherited unchanged from the M7 substrate
    agentSeed: 20260819000,
    m7Arm: 'A1',
    ticks: 3000,
    goalIndices: Object.freeze([0, 1, 2, 3]),
    // §5.1 — the exposure
    arms: Object.freeze(['ARMED', 'ABLATED']),
    ablatedValue: 0,
    // §6 — the permutation
    K: 19,
    arrangements: 20,                 // identity + K
    alpha: 1 / 20,                    // §25, one-sided, C2 only
    // §7 — the population
    decisionStates: 19,
    // §18 — minimum evidence
    minConfigurations: 20,
    // provenance
    preregistration: 'bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e',
    preregistrationCommit: '3b3d195b5b29ea0ada16872b3e1ea08e54d37f20',
    erratum01: '10e0981df5e4eec78e6c77f5bb9c94c852d36525ce61cd66f12165ae3c64b9e1',
    erratum02: '88b9edbe8e7f4cb706c8a61400bd439fe64249e57facfc7446fa1168380786f3',
});

// §17 — every block UQ-B must not touch. UQ-A's own range becomes consumed here.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: UQA_FROZEN.seedLo, hi: UQA_FROZEN.seedHi,
                    why: 'UQ-A collection, consumed at f7cc052' }),
    ...UQA_CONSUMED,
]);

export const HELD_OUT_FLOOR = UQA_FLOOR;

export const inRegisteredBlock = (s) =>
    Number.isInteger(s) && s >= FROZEN.seedLo && s <= FROZEN.seedHi;
export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

// ---------------------------------------------------------------------------
// §2 — THE COLLECTION ARM SWITCH
//
// Two independent conditions must BOTH hold before a registered seed may be
// used: the call site must pass `collection: true`, and the process must have
// been started with UQB_COLLECTION_AUTHORISED=1. One flag alone is not enough.
// A verifier, a preflight or a development script that forgets to disarm is
// therefore still safe, because neither sets the environment variable.
// ---------------------------------------------------------------------------
export const processAuthorisedForCollection = () =>
    process.env.UQB_COLLECTION_AUTHORISED === '1';

/**
 * Throws rather than returning false: a measurement seed is not something to
 * fail soft on.
 *
 * @param {number} seed
 * @param {object} o
 *   collection  true only on the authorised collection path (default false)
 *
 * With `collection` false — development, preflight, every verifier — a seed in
 * the registered block is REFUSED. The refusal happens here, before the seed
 * can be handed to any run path.
 */
export function assertSeedAllowed(seed, { collection = false } = {}) {
    if (!Number.isInteger(seed)) throw new Error(`UQ-B: seed must be an integer, got ${seed}`);
    if (isHeldOut(seed)) {
        throw new Error(`UQ-B: seed ${seed} is at or above the held-out floor ${HELD_OUT_FLOOR}. ` +
            `The held-out block is never generated, inspected, or inferred.`);
    }
    const c = CONSUMED_RANGES.find(r => seed >= r.lo && seed <= r.hi);
    if (c) throw new Error(`UQ-B: seed ${seed} lies in a consumed range ${c.lo}-${c.hi} (${c.why}).`);

    if (!collection) {
        if (inRegisteredBlock(seed)) {
            throw new Error(`UQ-B SEED PROTECTION: seed ${seed} is inside the REGISTERED block ` +
                `${FROZEN.seedLo}-${FROZEN.seedHi} and collection is not authorised on this call. ` +
                `Development, preflight and verification must use a non-registered fixture. ` +
                `Refused before the seed could enter any experiment path.`);
        }
        return seed;
    }

    // collection === true
    if (!processAuthorisedForCollection()) {
        throw new Error(`UQ-B SEED PROTECTION: the call site requested collection mode, but this ` +
            `process was not started with UQB_COLLECTION_AUTHORISED=1. Both conditions are ` +
            `required. Refused before the seed could enter any experiment path.`);
    }
    if (!inRegisteredBlock(seed)) {
        throw new Error(`UQ-B: seed ${seed} is outside the registered range ${FROZEN.seedLo}-` +
            `${FROZEN.seedHi}. §19 forbids extension, so collection may not run it.`);
    }
    return seed;
}

// §17: 1000 seeds x 4 frozen goal indices = 4000 candidate configurations.
// Each candidate is evaluated DIRECTLY at its own seed — the M7-ERR-09 §3.3
// discipline. There is no acceptance walk, so no seed outside the range is
// reached, and the bounds themselves are refused if widened.
export function enumerateCandidates(env, { lo = FROZEN.seedLo, hi = FROZEN.seedHi,
                                           collection = false } = {}) {
    if (lo !== FROZEN.seedLo || hi !== FROZEN.seedHi) {
        throw new Error(`UQ-B: enumeration bounds ${lo}-${hi} are not the frozen §17 range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}. The range is not adaptively extensible (§19).`);
    }
    const accepted = [], rejected = [];
    let candidates = 0;
    for (let seed = lo; seed <= hi; seed++) {
        assertSeedAllowed(seed, { collection });
        for (const idx of FROZEN.goalIndices) {
            candidates++;
            const cfg = env.makeConfig(seed, idx);
            const row = { configSeed: seed, configIndex: idx, goal: cfg.goal };
            if (cfg.accepted) accepted.push(row);
            else rejected.push({ ...row, failed: failedChecks(cfg.checks) });
        }
    }
    return { candidates, accepted, rejected, lo, hi };
}

// The closed set of booleans that determine acceptance, per env.makeConfig.
// Everything else evaluateConstraints returns is a numeric diagnostic.
export const ACCEPTANCE_CHECKS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5', 'G11']);

export function failedChecks(checks) {
    for (const k of ACCEPTANCE_CHECKS) {
        if (!(k in checks)) throw new Error(
            `UQ-B: acceptance check "${k}" is absent from env.evaluateConstraints; the committed ` +
            `predicate changed shape and rejection reasons cannot be recorded.`);
    }
    return ACCEPTANCE_CHECKS.filter(k => checks[k] !== true);
}

// §18/§19 — the disposition, evaluated ONLY after the entire registered range
// has been processed. §19 forbids extension and adaptation, so this is a
// REPORTING threshold, never a collection target.
export function evaluateSufficiency({ configurations }) {
    const met = configurations >= FROZEN.minConfigurations;
    return {
        conditions: [{ id: 'configurations', required: FROZEN.minConfigurations,
                       observed: configurations, met }],
        unmet: met ? [] : ['configurations'],
        status: met ? 'SATISFIED' : 'INCONCLUSIVE — INSUFFICIENT MATERIAL',
    };
}

/** §18 disclosure. Derived from the frozen topology, asserted against the text. */
export const GOAL_DEGREE = Object.freeze({ 8: 5, 12: 5, 16: 3, 19: 3 });

/** The five terminal states a candidate may reach. §19 accounting closure. */
export const DISPOSITIONS = Object.freeze(
    ['ACCEPTED', 'REJECTED', 'PENDING', 'FAILED', 'INVALID']);

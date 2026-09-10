// ==========================================================
// C1 — FROZEN CONSTANTS AND SEED GOVERNANCE
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/C1_PREREGISTRATION.md v2.0 (M17, f57820b),
//   digest a2168c418aaf64b84a3170dba7bd11b4776afd2e0ba8ac1bf42b7c0880f95439.
//   Nothing here may add a threshold, exclusion rule, failure mode, test or
//   correction that the frozen document does not contain.
//
// The consumed-range registry is imported from experiments/registry/consumed.js
// (M18, c59d457), the successor link that records 896xxx and the spent UQ-B
// block. There is one textual definition of each boundary in the repository.
// ==========================================================
import { CONSUMED_RANGES as REG_CONSUMED, HELD_OUT_FLOOR as REG_FLOOR }
    from '../registry/consumed.js';

export const FROZEN = Object.freeze({
    // §14 — the registered block, authorised by the Director ruling of 2026-09-10
    seedLo: 895000,
    seedHi: 895999,
    // §3 / §4 — inherited unchanged from the M7 substrate, as UQ-B did
    agentSeed: 20260819000,
    m7Arm: 'A1',
    ticks: 3000,
    goalIndices: Object.freeze([0, 1, 2, 3]),
    arms: Object.freeze(['ARMED', 'ABLATED']),
    ablatedValue: 0,
    // §2 / §6 — the estimand and its definedness precondition
    decisionStates: 19,
    minPoolForRho: 2,              // ρ = r/(n−1) is defined only when n ≥ 2
    phases: Object.freeze([1, 2]),
    // §13 — the only validity rule, DERIVED from the estimator
    minJointlyDefined: 1,          // Δ = mean over jointly defined u is 0/0 when empty
    // provenance
    preregistration: 'a2168c418aaf64b84a3170dba7bd11b4776afd2e0ba8ac1bf42b7c0880f95439',
    preregistrationCommit: 'f57820b',
    preregistrationVersion: '2.0',
    stressTest: 'M19 PASS 3 (b00fec2) — NO KNOWN FAILURE DETECTED',
});

export const CONSUMED_RANGES = REG_CONSUMED;
export const HELD_OUT_FLOOR = REG_FLOOR;

export const inRegisteredBlock = (s) =>
    Number.isInteger(s) && s >= FROZEN.seedLo && s <= FROZEN.seedHi;
export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

// ---------------------------------------------------------------------------
// THE COLLECTION ARM SWITCH — fail-closed in BOTH directions
//
// Two independent conditions must hold before a registered seed may be used:
// the call site must pass `collection: true`, and the process must have been
// started with C1_COLLECTION_AUTHORISED=1. One alone is not enough, so a
// verifier or a development script that forgets to disarm is still safe.
// This is the UQ-B assertSeedAllowed model, required by §14.
// ---------------------------------------------------------------------------
export const processAuthorisedForCollection = () =>
    process.env.C1_COLLECTION_AUTHORISED === '1';

export function assertSeedAllowed(seed, { collection = false } = {}) {
    if (!Number.isInteger(seed)) throw new Error(`C1: seed must be an integer, got ${seed}`);
    if (isHeldOut(seed)) {
        throw new Error(`C1: seed ${seed} is at or above the held-out floor ${HELD_OUT_FLOOR}. ` +
            `The held-out block is never generated, inspected, or inferred.`);
    }
    const c = CONSUMED_RANGES.find(r => seed >= r.lo && seed <= r.hi);
    if (c) throw new Error(`C1: seed ${seed} lies in a consumed range ${c.lo}-${c.hi} (${c.why}).`);

    if (!collection) {
        if (inRegisteredBlock(seed)) {
            throw new Error(`C1 SEED PROTECTION: seed ${seed} is inside the REGISTERED block ` +
                `${FROZEN.seedLo}-${FROZEN.seedHi} and collection is not authorised on this call. ` +
                `Refused before the seed could enter any experiment path.`);
        }
        return seed;
    }
    if (!processAuthorisedForCollection()) {
        throw new Error(`C1 SEED PROTECTION: the call site requested collection mode, but this ` +
            `process was not started with C1_COLLECTION_AUTHORISED=1. Both conditions are ` +
            `required. Refused before the seed could enter any experiment path.`);
    }
    if (!inRegisteredBlock(seed)) {
        throw new Error(`C1: seed ${seed} is outside the registered range ${FROZEN.seedLo}-` +
            `${FROZEN.seedHi}. §13 forbids extension, so collection may not run it.`);
    }
    return seed;
}

// §13 — acceptance uses the committed env.makeConfig predicate, unchanged.
export const ACCEPTANCE_CHECKS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5', 'G11']);

export function failedChecks(checks) {
    for (const k of ACCEPTANCE_CHECKS) {
        if (!(k in checks)) throw new Error(
            `C1: acceptance check "${k}" is absent from env.evaluateConstraints; the committed ` +
            `predicate changed shape and rejection reasons cannot be recorded.`);
    }
    return ACCEPTANCE_CHECKS.filter(k => checks[k] !== true);
}

/**
 * §13 — the COMPLETE registered range is processed. No early exit, no adaptive
 * extension, no retry. The bounds themselves are refused if widened.
 */
export function enumerateCandidates(env, { lo = FROZEN.seedLo, hi = FROZEN.seedHi,
                                           collection = false } = {}) {
    if (lo !== FROZEN.seedLo || hi !== FROZEN.seedHi) {
        throw new Error(`C1: enumeration bounds ${lo}-${hi} are not the frozen §14 range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}. The range is not adaptively extensible.`);
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

export const DISPOSITIONS = Object.freeze(['ACCEPTED', 'REJECTED', 'INVALID', 'FAILED']);

// ==========================================================
// UQ-A PROTOCOL CONSTANTS AND SEED GUARDS
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQA_PREREGISTRATION.md, frozen at 63247bb,
//   digest 03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//
// Every value below is quoted from the frozen protocol. Nothing here is
// derived, tuned, or adaptive. The guards exist so that a widened range, a
// consumed range, or a held-out seed is a THROWN ERROR rather than a silent
// protocol deviation.
//
// REUSE, NOT DUPLICATION
//   The held-out floor and every consumed block are imported from
//   experiments/q1/protocol.js, which itself imports M8's. There is one
//   textual definition of each boundary in the repository, and no predecessor
//   protocol is modified.
// ==========================================================
import { CONSUMED_RANGES as Q1_CONSUMED, HELD_OUT_FLOOR as Q1_FLOOR,
         FROZEN as Q1_FROZEN } from '../q1/protocol.js';

export const FROZEN = Object.freeze({
    // §17 — Director ruling of 2026-09-03, option S-1000
    seedLo: 898000,
    seedHi: 898999,
    // §14 / §15 — inherited unchanged from the M7 substrate
    agentSeed: 20260819000,
    arm: 'A1',
    ticks: 3000,
    goalIndices: Object.freeze([0, 1, 2, 3]),
    // §18 — Director judgment, NOT mechanically required by source
    minConfigurations: 20,
    // §5 — the frozen exposure
    exposure: 'E-BOTH',
    ablatedValue: 0,
    arms: Object.freeze(['ARMED', 'ABLATED']),
    // §7 — the fixed population
    directedAdjacencies: 78,
    physicalEdges: 39,
    // provenance pins
    preregistration: '03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4',
    preregistrationCommit: '63247bb546d62f15296edbdf3da34206bce3ef87',
    livenessCommit: '5d04469af7adbe4a0d03a6afc889849c32c2cf96',
});

// §17 — every block UQ-A must not touch. Q1's own range becomes consumed here.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: Q1_FROZEN.seedLo, hi: Q1_FROZEN.seedHi,
                    why: 'Q1 collection (D-006 §1 A), consumed at d16d568' }),
    ...Q1_CONSUMED,
]);

export const HELD_OUT_FLOOR = Q1_FLOOR;

export const inFrozenRange = (s) => Number.isInteger(s) && s >= FROZEN.seedLo && s <= FROZEN.seedHi;
export const isHeldOut     = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed    = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

// Throws rather than returning false: a measurement seed is not something to
// fail soft on. `fixture` inverts the test, so a fixture can never masquerade
// as measurement and measurement can never be smuggled in as a fixture.
export function assertSeedAllowed(seed, { fixture = false } = {}) {
    if (!Number.isInteger(seed)) throw new Error(`UQ-A: seed must be an integer, got ${seed}`);
    if (isHeldOut(seed)) {
        throw new Error(`UQ-A: seed ${seed} is at or above the held-out floor ${HELD_OUT_FLOOR}. ` +
            `The held-out block is never generated, inspected, or inferred.`);
    }
    const c = CONSUMED_RANGES.find(r => seed >= r.lo && seed <= r.hi);
    if (c) throw new Error(`UQ-A: seed ${seed} lies in a consumed range ${c.lo}-${c.hi} (${c.why}).`);
    if (fixture) {
        if (inFrozenRange(seed)) {
            throw new Error(`UQ-A: seed ${seed} is a REGISTERED UQ-A configuration seed and may ` +
                `not be used as an implementation fixture.`);
        }
        return seed;
    }
    if (!inFrozenRange(seed)) {
        throw new Error(`UQ-A: seed ${seed} is outside the frozen range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}. The range is not adaptively extensible (§19).`);
    }
    return seed;
}

// §17: 1000 seeds x 4 frozen goal indices = 4000 candidate configurations.
// Each candidate is evaluated DIRECTLY at its own seed — the M7-ERR-09 §3.3
// discipline. There is no acceptance walk, so no seed outside the frozen range
// is ever reached, and the bounds themselves are refused if widened.
export function enumerateCandidates(env, { lo = FROZEN.seedLo, hi = FROZEN.seedHi } = {}) {
    if (!inFrozenRange(lo) || !inFrozenRange(hi) || lo > hi) {
        throw new Error(`UQ-A: enumeration bounds ${lo}-${hi} are not inside the frozen range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}.`);
    }
    const accepted = [], rejected = [];
    let candidates = 0;
    for (let seed = lo; seed <= hi; seed++) {
        assertSeedAllowed(seed);
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
            `UQ-A: acceptance check "${k}" is absent from env.evaluateConstraints; the committed ` +
            `predicate changed shape and rejection reasons cannot be recorded.`);
    }
    return ACCEPTANCE_CHECKS.filter(k => checks[k] !== true);
}

// §19 — the stopping rule, executable exactly as frozen. Evaluated ONLY after
// the entire registered range has been processed; it never governs whether to
// keep collecting, because §19 forbids extension and adaptation. It is a
// REPORTING threshold, not a collection target.
export function evaluateSufficiency({ configurations }) {
    const met = configurations >= FROZEN.minConfigurations;
    return {
        conditions: [{ id: 'configurations', required: FROZEN.minConfigurations,
                       observed: configurations, met }],
        unmet: met ? [] : ['configurations'],
        status: met ? 'SATISFIED' : 'INCONCLUSIVE — INSUFFICIENT MATERIAL',
    };
}

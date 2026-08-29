// ==========================================================
// Q1 PROTOCOL CONSTANTS AND SEED GUARDS
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md §4, §6, §14,
//   frozen at 0ad12fe2f190645d2126c9e55aef4f270f853009.
//   Collection parameters ratified by Director decision D-006
//   (research/09_decisions.md), committed at 612c69c.
//
// Every value below is quoted from D-006. Nothing here is derived, tuned, or
// adaptive. The guards exist so that a widened range, a consumed range, or a
// held-out seed is a THROWN ERROR rather than a silent protocol deviation.
//
// REUSE, NOT DUPLICATION
//   The held-out floor and the M7 consumed blocks are imported from
//   experiments/m8/protocol.js rather than restated, and M8's own frozen
//   range is turned into a Q1 consumed block from M8's own constants. There
//   is therefore one textual definition of each boundary in the repository,
//   and M8's protocol is not modified.
// ==========================================================
import { CONSUMED_RANGES as M8_CONSUMED, HELD_OUT_FLOOR as M8_FLOOR,
         FROZEN as M8_FROZEN } from '../m8/protocol.js';
import { TRANSITION_SITES } from './instrument.js';

export const FROZEN = Object.freeze({
    // D-006 §1 A — configuration-seed range
    seedLo: 899000,
    seedHi: 899499,
    // D-006 §1 B, C, D
    agentSeed: 20260819000,
    arm: 'A1',
    ticks: 3000,
    // frozen §3.7 goal schedule, cycled by configIndex. Q1 does not redefine it.
    goalIndices: Object.freeze([0, 1, 2, 3]),
    // D-006 §1 E — DIRECTOR JUDGMENT, not mechanically required by source.
    // D-006 §4: every Q1 §9 falsification statement is an existence claim
    // refuted by one counterexample, so these numbers govern distributional
    // characterisation only. They are a pre-data design choice.
    minDesyncEvents: 100,
    minConfigurations: 20,
    minPerStratum: 15,
    // Goal-degree stratum. Q1's frozen text does not define one; D-006 §4
    // fixes it by explicit inheritance from M8 §12 / D-003 B.
    strata: Object.freeze({ degree5: Object.freeze([8, 12]), degree3: Object.freeze([16, 19]) }),
    // Provenance pins, so a record can never be mistaken for another study's.
    preregistration: '0ad12fe2f190645d2126c9e55aef4f270f853009',
    decision: 'D-006',
    instrumentation: '50be4b409142dfe67c72263874cbb4473871fbe1',
});

// D-006 §2 — every block Q1 must not touch. M8's frozen range is now consumed
// evidence; the two M7 blocks are carried over from M8's own enumeration.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: M8_FROZEN.seedLo, hi: M8_FROZEN.seedHi,
                    why: 'M8 collection (D-003 H), consumed at f9d97b9' }),
    ...M8_CONSUMED,
]);

// frozen §5.1 / M7-ERR-07 §2 — unbounded forward. Never generated or inspected.
export const HELD_OUT_FLOOR = M8_FLOOR;

// The frozen §6 closed schema. §6 forbids adding a field after any data
// exists, so the runner asserts this exact set on every transition record.
export const TRANSITION_FIELDS = Object.freeze(['seq', 'tickIndex', 'site', 'fromPos', 'toPos']);

// Measurement infrastructure, not §4 taxonomy. Kept separate for exactly that
// reason: the closed taxonomy is never widened by bookkeeping.
export const BOUNDARY_KINDS = Object.freeze(['write', 'read']);

export { TRANSITION_SITES };

// ---- seed guards ---------------------------------------------------------
export const inFrozenRange = (s) => Number.isInteger(s) && s >= FROZEN.seedLo && s <= FROZEN.seedHi;
export const isHeldOut     = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed    = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

// Throws rather than returning false: a measurement seed is not something to
// fail soft on. `fixture` inverts the test — an implementation fixture must lie
// OUTSIDE every registered block, so a fixture can never masquerade as data and
// a measurement seed can never be smuggled in as a fixture.
export function assertSeedAllowed(seed, { fixture = false } = {}) {
    if (!Number.isInteger(seed)) throw new Error(`Q1: seed must be an integer, got ${seed}`);
    if (isHeldOut(seed)) {
        throw new Error(`Q1: seed ${seed} is at or above the held-out floor ${HELD_OUT_FLOOR}. ` +
            `The held-out block is never generated, inspected, or inferred.`);
    }
    const c = CONSUMED_RANGES.find(r => seed >= r.lo && seed <= r.hi);
    if (c) throw new Error(`Q1: seed ${seed} lies in a consumed range ${c.lo}-${c.hi} (${c.why}).`);
    if (fixture) {
        if (inFrozenRange(seed)) {
            throw new Error(`Q1: seed ${seed} is a REGISTERED Q1 configuration seed and may not ` +
                `be used as an implementation fixture.`);
        }
        return seed;
    }
    if (!inFrozenRange(seed)) {
        throw new Error(`Q1: seed ${seed} is outside the frozen range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}. The range is not adaptively extensible (D-006 §5).`);
    }
    return seed;
}

export const stratumOf = (goal) =>
    FROZEN.strata.degree5.includes(goal) ? 'degree5'
        : FROZEN.strata.degree3.includes(goal) ? 'degree3' : null;

// ---- candidate enumeration ----------------------------------------------
// D-006 §1 A / §5: 500 seeds x 4 frozen goals = 2000 candidate configurations.
// Each candidate is evaluated DIRECTLY at its own seed — the M7-ERR-09 §3.3
// discipline. There is no acceptance walk here, so no seed outside the frozen
// range is ever reached by enumeration, and the bounds themselves are refused
// if they fall outside the frozen range.
// The closed set of booleans that determine acceptance, per env.makeConfig:
//   accepted = R1 && R2 && R3 && R4 && R5 === true && G11 === true
// Everything else env.evaluateConstraints returns is a numeric or array
// diagnostic, not a check.
export const ACCEPTANCE_CHECKS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5', 'G11']);

// Fails closed: a missing check means the committed acceptance predicate changed
// shape, and a rejection reason computed against the old shape would be wrong.
export function failedChecks(checks) {
    for (const k of ACCEPTANCE_CHECKS) {
        if (!(k in checks)) throw new Error(
            `Q1: acceptance check "${k}" is absent from env.evaluateConstraints; ` +
            `the committed predicate changed shape and rejection reasons cannot be recorded.`);
    }
    return ACCEPTANCE_CHECKS.filter(k => checks[k] !== true);
}

export function enumerateCandidates(env, { lo = FROZEN.seedLo, hi = FROZEN.seedHi } = {}) {
    if (!inFrozenRange(lo) || !inFrozenRange(hi) || lo > hi) {
        throw new Error(`Q1: enumeration bounds ${lo}-${hi} are not inside the frozen range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}.`);
    }
    const accepted = [], rejected = [];
    let candidates = 0;
    for (let seed = lo; seed <= hi; seed++) {
        assertSeedAllowed(seed);
        for (const idx of FROZEN.goalIndices) {
            candidates++;
            const cfg = env.makeConfig(seed, idx);
            const row = { configSeed: seed, configIndex: idx, goal: cfg.goal,
                          stratum: stratumOf(cfg.goal) };
            if (cfg.accepted) accepted.push(row);
            // The exact failing ACCEPTANCE checks, so a rejection carries its
            // reason rather than a bare verdict. Recorded raw; nothing is
            // interpreted. Only the six booleans that actually determine
            // cfg.accepted are reported — env.evaluateConstraints also returns
            // numeric diagnostics (rho3, rho4, g11Worst, r2Starts, ...) which are
            // never `true` and would otherwise masquerade as failing checks.
            else rejected.push({ ...row, failed: failedChecks(cfg.checks) });
        }
    }
    return { candidates, accepted, rejected, lo, hi };
}

// ---- D-006 §5 stopping / sufficiency rule --------------------------------
// Executable exactly as frozen. The rule is evaluated ONLY after the entire
// registered range has been processed; it never governs whether to keep
// collecting, because D-006 §5 forbids extension and forbids adaptation. It is
// a REPORTING threshold, not a collection target.
//
// The three counts are collection/evaluability measures. They are not a Q1
// scientific result and carry no interpretation: `desyncEvents` is the frozen
// §2 predicate `lastReasoning.from !== agentCurrent` applied to raw recorded
// fields, nothing more.
export function evaluateSufficiency({ desyncEvents, configurations, perStratum }) {
    const conditions = [
        { id: 'desyncEvents',   required: FROZEN.minDesyncEvents,   observed: desyncEvents },
        { id: 'configurations', required: FROZEN.minConfigurations, observed: configurations },
        ...Object.keys(FROZEN.strata).map(s => ({
            id: `stratum:${s}`, required: FROZEN.minPerStratum, observed: perStratum[s] || 0 })),
    ].map(c => ({ ...c, met: c.observed >= c.required }));

    const unmet = conditions.filter(c => !c.met);
    return {
        conditions,
        unmet: unmet.map(c => c.id),
        status: unmet.length === 0 ? 'SATISFIED' : 'INCONCLUSIVE — INSUFFICIENT MATERIAL',
    };
}

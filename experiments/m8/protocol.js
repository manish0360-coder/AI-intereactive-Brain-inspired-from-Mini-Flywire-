// ==========================================================
// M8 PROTOCOL CONSTANTS AND SEED GUARDS
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §12, §13, §14,
//   frozen at 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//   Director decisions C, D, H recorded as D-003.
//
// Every value below is quoted from the frozen document. Nothing here is
// derived, tuned, or adaptive. The guards exist so that a widened range, a
// consumed range, or a held-out seed is a THROWN ERROR rather than a silent
// protocol deviation.
// ==========================================================

export const FROZEN = Object.freeze({
    // §14.1 — Director decision H
    seedLo: 899500,
    seedHi: 899999,
    // §14.2 — Director decisions C and D
    agentSeed: 20260819000,
    arm: 'A1',
    ticks: 3000,
    // §3.7 goal schedule, cycled by configIndex; M8 does not redefine it
    goalIndices: Object.freeze([0, 1, 2, 3]),
    // §12 — Director decision B
    minDesyncEvents: 100,
    minConfigurations: 20,
    minPerStratum: 15,
    // §6 — topology stratifier, from established fact F13
    strata: Object.freeze({ degree5: Object.freeze([8, 12]), degree3: Object.freeze([16, 19]) }),
});

// §14.1 — consumed by M7 and not reusable. Enumerated so a violation is
// detectable rather than merely discouraged.
export const CONSUMED_RANGES = Object.freeze([
    Object.freeze({ lo: 900000, hi: 900029, why: 'M7 pilot block (frozen §5.1)' }),
    Object.freeze({ lo: 900030, hi: 900499, why: 'M7-ERR-09 gate-diagnostic range' }),
]);

// frozen §5.1 / M7-ERR-07 §2 — unbounded forward. Never generated or inspected.
export const HELD_OUT_FLOOR = 900500;

// The frozen §8 observable tuple. Closed: §8 forbids adding a field after any
// data is seen, so the runner asserts this exact set on every record.
export const TUPLE_FIELDS = Object.freeze([
    'from', 'agentCurrent', 'next', 'ticksSinceWrite', 'selectionRanThisTick',
    'ticksSinceTeleport', 'teleportSource', 'goalIdAtSelection', 'goalIdAtEvaluation',
    'agentCurrentChangedSinceLastWrite', 'tickIndex', 'phase', 'configSeed', 'goalNode',
]);

// ---- seed guards ---------------------------------------------------------
export const inFrozenRange = (s) => Number.isInteger(s) && s >= FROZEN.seedLo && s <= FROZEN.seedHi;
export const isHeldOut     = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;
export const isConsumed    = (s) => CONSUMED_RANGES.some(r => s >= r.lo && s <= r.hi);

// Throws rather than returning false: a measurement seed is not something to
// fail soft on. `fixture` inverts the test — an implementation fixture must lie
// OUTSIDE every registered block, so a fixture can never masquerade as data and
// a measurement seed can never be smuggled in as a fixture.
export function assertSeedAllowed(seed, { fixture = false } = {}) {
    if (!Number.isInteger(seed)) throw new Error(`M8: seed must be an integer, got ${seed}`);
    if (isHeldOut(seed)) {
        throw new Error(`M8: seed ${seed} is at or above the held-out floor ${HELD_OUT_FLOOR}. ` +
            `The held-out block is never generated, inspected, or inferred.`);
    }
    const c = CONSUMED_RANGES.find(r => seed >= r.lo && seed <= r.hi);
    if (c) throw new Error(`M8: seed ${seed} lies in a consumed range ${c.lo}-${c.hi} (${c.why}).`);
    if (fixture) {
        if (inFrozenRange(seed)) {
            throw new Error(`M8: seed ${seed} is a REGISTERED M8 configuration seed and may not ` +
                `be used as an implementation fixture.`);
        }
        return seed;
    }
    if (!inFrozenRange(seed)) {
        throw new Error(`M8: seed ${seed} is outside the frozen range ` +
            `${FROZEN.seedLo}-${FROZEN.seedHi}. The range is not adaptively extensible (§13).`);
    }
    return seed;
}

export const stratumOf = (goal) =>
    FROZEN.strata.degree5.includes(goal) ? 'degree5'
        : FROZEN.strata.degree3.includes(goal) ? 'degree3' : null;

// ---- candidate enumeration ----------------------------------------------
// §14.1: 500 seeds x 4 frozen goals = 2000 candidate configurations. Each
// candidate is evaluated DIRECTLY at its own seed — the M7-ERR-09 §3.3
// discipline. There is no acceptance walk, so no seed outside the frozen range
// is ever reached. env.generateAccepted would walk forward on a REJECTED seed
// and could cross 899999 into a consumed range; the runner therefore never
// hands it anything but a seed already proven accepted here.
//
// `makeConfig` is the committed, frozen acceptance predicate (env.js, R1-R5
// under M7-ERR-07). M8 defines no acceptance logic of its own: §14.1 sizes the
// range from M7's documented acceptance yield, which presupposes that predicate.
export function enumerateCandidates(env, { lo = FROZEN.seedLo, hi = FROZEN.seedHi } = {}) {
    if (!inFrozenRange(lo) || !inFrozenRange(hi) || lo > hi) {
        throw new Error(`M8: enumeration bounds ${lo}-${hi} are not inside the frozen range.`);
    }
    const accepted = [];
    let candidates = 0;
    for (let seed = lo; seed <= hi; seed++) {
        assertSeedAllowed(seed);
        for (const idx of FROZEN.goalIndices) {
            candidates++;
            const cfg = env.makeConfig(seed, idx);
            if (cfg.accepted) {
                accepted.push({ configSeed: seed, configIndex: idx, goal: cfg.goal,
                                stratum: stratumOf(cfg.goal) });
            }
        }
    }
    return { candidates, accepted, lo, hi };
}

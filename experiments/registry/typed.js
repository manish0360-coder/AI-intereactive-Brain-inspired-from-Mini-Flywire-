// ==========================================================
// M33 — TYPED-NAMESPACE SEED GOVERNANCE
// ==========================================================
// Implements the M32 invariants (research/preregistrations/
// M32_TRAJECTORY_SEED_GOVERNANCE.md §17) as the governance entry point for every
// study after M33. Specification and audit: research/preregistrations/
// M33_TYPED_NAMESPACE_REGISTRY.md.
//
// WHAT THIS MODULE IS
//   1. A seed identity is (namespace, value). A bare integer is not an identity
//      and every predicate here refuses it (UntypedSeedError).
//   2. Every predicate is PARTIAL over its namespace: handed an identity of a
//      namespace it does not govern, it throws NamespaceRefusal. It never answers
//      true or false for a foreign seed, so a refusal cannot be read as "not held
//      out", "available" or "consumed".
//   3. Configuration-seed decisions DELEGATE to the newest registry chain link,
//      experiments/registry/consumed_after_study2.js, which spreads consumed_after_c1.js
//      unchanged (itself consumed.js plus C1's block, M34) and adds the FutureScore V2.3
//      Study-2 block 890000-892999. Historical configuration semantics are therefore
//      the historical functions themselves, not a re-implementation.
//   4. Trajectory seeds are consumed per (source, study), enumerated, never ranged.
//
// WHAT THIS MODULE IS NOT
//   It does not change consumed.js, any protocol module, any collection, any
//   production file, or the 895000-895999 accounting gap. It consumes no seed.
//
// WHY THE RAW PREDICATES STILL EXIST (M33 §5)
//   consumed.js and the M8 / Q1 / UQ-A / UQ-B / C1 protocol modules keep their
//   untyped predicates, because accepted verifiers execute them as historical
//   record (verify_m30.js and verify_m32.js assert isHeldOut(20260819000) === true)
//   and C1 / UQ-B are frozen. Raw use is restricted to the enumerated historical
//   call sites by experiments/m33/verify.js; new code must import this module.
// ==========================================================
import * as CONFIG_REGISTRY from './consumed_after_study2.js';

export const NAMESPACE = Object.freeze({ CONFIG: 'config', TRAJECTORY: 'trajectory' });
const NAMESPACES = new Set(Object.values(NAMESPACE));

// Categories of use (M32 §11). HELD-OUT is a registry STATE, not a category of use.
export const CATEGORY = Object.freeze({
    DEVELOPMENT: 'development', PILOT: 'pilot', REGISTERED: 'registered',
});
const CATEGORIES = new Set(Object.values(CATEGORY));

const ARMS = new Set(['ARMED', 'ABLATED']);

// ---- refusals ---------------------------------------------------------------
// Distinct classes with distinct codes. None of them is a boolean, so no refusal
// can be mistaken for false, not-held-out, available or consumed.
export class UntypedSeedError extends TypeError {
    constructor(received) {
        super(`UNTYPED_SEED: governance predicates accept only identities built by ` +
              `configSeed() or trajectorySeed(); received ${describe(received)}`);
        this.name = 'UntypedSeedError';
        this.code = 'UNTYPED_SEED';
    }
}
export class NamespaceRefusal extends Error {
    constructor(expected, received) {
        super(`INVALID_NAMESPACE: this predicate governs '${expected}' seeds; ` +
              `refusing a '${received.namespace}' seed (value ${received.value})`);
        this.name = 'NamespaceRefusal';
        this.code = 'INVALID_NAMESPACE';
        this.expected = expected;
        this.received = received.namespace;
    }
}
export class GovernanceRefusal extends Error {
    constructor(reason, detail) {
        super(`${reason}: ${detail}`);
        this.name = 'GovernanceRefusal';
        this.code = reason;
    }
}
export class RegistryIntegrityError extends Error {
    constructor(detail) {
        super(`REGISTRY_INTEGRITY: ${detail}`);
        this.name = 'RegistryIntegrityError';
        this.code = 'REGISTRY_INTEGRITY';
    }
}

function describe(x) {
    if (x === null) return 'null';
    if (typeof x === 'object') {
        try { return `object ${JSON.stringify(x)}`; } catch { return 'object'; }
    }
    return `${typeof x} ${String(x)}`;
}

// ---- identity ---------------------------------------------------------------
// Identities are frozen and branded. A structurally similar object literal is not
// accepted: the brand proves the value passed validation at construction. Numeric
// coercion throws, so an identity handed to a raw numeric predicate that compares
// it (s >= lo) fails loudly instead of silently comparing NaN.
const BRAND = new WeakSet();

// Domain: every safe integer. Negative integers are accepted because the historical
// guards accept them (assertSeedAllowed checks Number.isInteger only), and M33 must
// not change a historical configuration decision. Unsafe integers are refused: they
// are not exactly representable, and every one of them is >= the held-out floor, so
// no historical guard ever allowed one either (M33 §8.2).
function makeIdentity(namespace, value) {
    if (!Number.isSafeInteger(value)) {
        throw new UntypedSeedError(value);
    }
    const id = Object.freeze({
        namespace, value,
        [Symbol.toPrimitive]() {
            throw new TypeError(`a ${namespace} seed identity cannot be coerced to a ` +
                                `primitive; use .value only where a runtime needs the number`);
        },
    });
    BRAND.add(id);
    return id;
}

export const configSeed = (value) => makeIdentity(NAMESPACE.CONFIG, value);
export const trajectorySeed = (value) => makeIdentity(NAMESPACE.TRAJECTORY, value);

export function isSeedIdentity(x) {
    return typeof x === 'object' && x !== null && BRAND.has(x);
}

function requireIdentity(x) {
    if (!isSeedIdentity(x) || !NAMESPACES.has(x.namespace)) throw new UntypedSeedError(x);
    return x;
}

function requireNamespace(x, namespace) {
    requireIdentity(x);
    if (x.namespace !== namespace) throw new NamespaceRefusal(namespace, x);
    return x;
}

export function sameSeed(a, b) {
    requireIdentity(a); requireIdentity(b);
    return a.namespace === b.namespace && a.value === b.value;
}

// ---- configuration namespace -------------------------------------------------
// Decisions are the historical functions applied to the validated value. Nothing
// here restates a floor or a range.
export const config = Object.freeze({
    isHeldOut(id) {
        return CONFIG_REGISTRY.isHeldOut(requireNamespace(id, NAMESPACE.CONFIG).value);
    },
    isConsumed(id) {
        return CONFIG_REGISTRY.isConsumed(requireNamespace(id, NAMESPACE.CONFIG).value);
    },
    // A study's registered block, as a namespace-refusing predicate. Mirrors the
    // protocol convention inRegisteredBlock(s) = lo <= s <= hi.
    registeredBlock(lo, hi) {
        if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || lo > hi) {
            throw new RegistryIntegrityError(`invalid registered block ${lo}-${hi}`);
        }
        return (id) => {
            const v = requireNamespace(id, NAMESPACE.CONFIG).value;
            return v >= lo && v <= hi;
        };
    },
});

// ---- trajectory namespace -----------------------------------------------------
// FIVE DIFFERENT OBJECTS (M33-R1 §3) — never substituted for one another:
//   raw value        the integer passed as agentSeed and written to provenance.
//                    Identity equality is (namespace, raw value).
//   normalized seed  raw >>> 0. Every runtime derivation is a function of it, so raw
//                    values congruent modulo 2^32 are indistinguishable at runtime.
//   derived seed     per stream, ((raw ^ c) >>> 0) || 1 — the initial mulberry32
//                    state (instrumentation/rng.js initRng; experiments/m7/arms.js
//                    sigma). The zero state maps to 1, so four raw keys partially alias.
//   stochastic stream the draw sequence. mulberry32 advances its state by a fixed odd
//                    constant, so EVERY stream is a segment of one 2^32-long cycle.
//   realised trajectory an arm-dependent OUTCOME of (configuration, streams, arm);
//                    fingerprinted after the fact, never a governance identity (M32 §8.2).
//
// GOVERNANCE IDENTITY OF A STOCHASTIC SOURCE = its derived stream seeds (lag 0). Two
// raw values share a source when any derived seed coincides. Overlap of two streams at a
// NON-ZERO lag on the single cycle is NOT detected here: deciding it needs a per-run
// draw budget, which is a scientific parameter this module does not own (M33-R1 Q-LAG).
const STREAM_XOR = Object.freeze({ cognitive: 0, visual: 0x9e3779b9, environment: 0x5EED,
                                   sigma: 0xBEEF });

export function streamSeeds(id) {
    const v = requireNamespace(id, NAMESPACE.TRAJECTORY).value;
    const out = {};
    for (const [name, x] of Object.entries(STREAM_XOR)) out[name] = ((v ^ x) >>> 0) || 1;
    return Object.freeze(out);
}

const sharesStochasticity = (a, b) => {
    const sa = streamSeeds(a), sb = streamSeeds(b);
    return Object.keys(STREAM_XOR).some(k => sa[k] === sb[k]);
};

// Held-out trajectory ranges are reserved over the 32-bit source domain, so a
// reservation cannot be bypassed by value + 2^32. A value is held out when its
// source lies in a range, or when one of its streams degenerates (seed 0 -> 1) onto
// the same stream seed as a source in a range.
const SOURCE_MAX = 0xFFFFFFFF;
function heldOutBySource(value, ranges) {
    const inRange = (k) => ranges.some(h => k >= h.lo && k <= h.hi);
    const k = value >>> 0;
    if (inRange(k)) return true;
    return Object.values(STREAM_XOR).some(x => {
        const d = (k ^ x) >>> 0;
        if (d === 0) return inRange((x ^ 1) >>> 0);
        if (d === 1) return inRange(x >>> 0);
        return false;
    });
}

const RECORD_FIELDS = ['namespace', 'value', 'study', 'status', 'authorization',
                       'executed', 'artifact', 'why'];

function validateRecord(r, i) {
    const keys = Object.keys(r).sort().join(',');
    if (keys !== [...RECORD_FIELDS].sort().join(',')) {
        throw new RegistryIntegrityError(`record ${i} has fields ${keys}`);
    }
    if (r.namespace !== NAMESPACE.TRAJECTORY) {
        throw new RegistryIntegrityError(`record ${i} is not a trajectory record`);
    }
    if (!Number.isSafeInteger(r.value)) {
        throw new RegistryIntegrityError(`record ${i} has invalid value ${r.value}`);
    }
    for (const f of ['study', 'authorization', 'artifact', 'why']) {
        if (typeof r[f] !== 'string' || r[f].trim() === '') {
            throw new RegistryIntegrityError(`record ${i} has empty ${f}`);
        }
    }
    if (!CATEGORIES.has(r.status)) {
        throw new RegistryIntegrityError(`record ${i} has status ${r.status}`);
    }
    if (typeof r.executed !== 'boolean') {
        throw new RegistryIntegrityError(`record ${i} executed must be boolean`);
    }
}

function validateHeldOut(h, i) {
    const keys = Object.keys(h).sort().join(',');
    if (keys !== 'authorization,hi,lo,why') {
        throw new RegistryIntegrityError(`held-out range ${i} has fields ${keys}`);
    }
    if (!Number.isSafeInteger(h.lo) || !Number.isSafeInteger(h.hi) || h.lo < 0 ||
        h.hi > SOURCE_MAX || h.lo > h.hi) {
        throw new RegistryIntegrityError(`held-out range ${i} must lie within the 32-bit ` +
                                         `source domain 0-${SOURCE_MAX}`);
    }
}

// A cross-study reuse authorization (M33-R1 rule R4). It names one exact raw value, the
// study that holds it and the study permitted to reuse it. It never covers an alias.
const AUTH_FIELDS = 'authorization,fromStudy,namespace,toStudy,value,why';

function validateAuthorization(a, i) {
    const keys = Object.keys(a).sort().join(',');
    if (keys !== AUTH_FIELDS) {
        throw new RegistryIntegrityError(`authorization ${i} has fields ${keys}`);
    }
    if (a.namespace !== NAMESPACE.TRAJECTORY || !Number.isSafeInteger(a.value)) {
        throw new RegistryIntegrityError(`authorization ${i} is not a trajectory authorization`);
    }
    for (const f of ['fromStudy', 'toStudy', 'authorization', 'why']) {
        if (typeof a[f] !== 'string' || a[f].trim() === '') {
            throw new RegistryIntegrityError(`authorization ${i} has empty ${f}`);
        }
    }
    if (a.fromStudy === a.toStudy) {
        throw new RegistryIntegrityError(`authorization ${i} names one study twice`);
    }
}

/**
 * Build a trajectory registry from enumerated consumption records, held-out ranges and
 * cross-study reuse authorizations. Construction asserts every invariant that is a
 * property of the data, so an inconsistent registry cannot exist:
 *   - record uniqueness per (value, study);
 *   - HELD-OUT ∩ CONSUMED = ∅;
 *   - no study records two different raw values that share a source (no aliased replicate);
 *   - two studies share a source only through one exact raw value, in one category, under
 *     an authorization for exactly that value and that pair of studies;
 *   - an authorization is issued by a study that holds that exact value.
 */
export function createTrajectoryRegistry({ records, heldOut, authorizations = [] }) {
    if (!Array.isArray(records) || !Array.isArray(heldOut) || !Array.isArray(authorizations)) {
        throw new RegistryIntegrityError('records, heldOut and authorizations must be arrays');
    }
    records.forEach(validateRecord);
    heldOut.forEach(validateHeldOut);
    authorizations.forEach(validateAuthorization);

    const seen = new Set();
    for (const r of records) {
        const k = `${r.value}|${r.study}`;
        if (seen.has(k)) throw new RegistryIntegrityError(`duplicate record for ${k}`);
        seen.add(k);
    }
    const inHeldOut = (v) => heldOutBySource(v, heldOut);
    for (const r of records) {
        if (inHeldOut(r.value)) {
            throw new RegistryIntegrityError(`value ${r.value} is both held-out and consumed`);
        }
    }

    const authSeen = new Set();
    for (const a of authorizations) {
        const k = `${a.value}|${[a.fromStudy, a.toStudy].sort().join('|')}`;
        if (authSeen.has(k)) throw new RegistryIntegrityError(`duplicate authorization ${k}`);
        authSeen.add(k);
        if (!records.some(r => r.value === a.value && r.study === a.fromStudy)) {
            throw new RegistryIntegrityError(`authorization for ${a.value} is issued by ` +
                `${a.fromStudy}, which holds no record of that exact value`);
        }
    }
    // Pair-specific and direction-free for reruns: once H authorized S, both may reproduce.
    const isAuthorized = (value, a, b) => authorizations.some(x => x.value === value &&
        ((x.fromStudy === a && x.toStudy === b) || (x.fromStudy === b && x.toStudy === a)));

    for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
            const ri = records[i], rj = records[j];
            if (!sharesStochasticity(trajectorySeed(ri.value), trajectorySeed(rj.value))) continue;
            if (ri.study === rj.study) {
                throw new RegistryIntegrityError(`${ri.study} records ${ri.value} and ${rj.value}, ` +
                    `which share a stochastic source`);
            }
            if (ri.value !== rj.value || ri.status !== rj.status ||
                !isAuthorized(ri.value, ri.study, rj.study)) {
                throw new RegistryIntegrityError(`${ri.study} (${ri.value}) and ${rj.study} ` +
                    `(${rj.value}) share a stochastic source without an exact, same-category ` +
                    `authorization`);
            }
        }
    }

    const frozenRecords = Object.freeze(records.map(r => Object.freeze({ ...r })));
    const frozenHeldOut = Object.freeze(heldOut.map(h => Object.freeze({ ...h })));
    const frozenAuths = Object.freeze(authorizations.map(a => Object.freeze({ ...a })));

    function isHeldOut(id) {
        const v = requireNamespace(id, NAMESPACE.TRAJECTORY).value;
        return inHeldOut(v);
    }

    // Every record whose source shares any derived stream seed with this identity.
    function consumptionOf(id) {
        requireNamespace(id, NAMESPACE.TRAJECTORY);
        return frozenRecords.filter(r => sharesStochasticity(id, trajectorySeed(r.value)));
    }

    function isConsumedByStudy(id, study) {
        if (typeof study !== 'string' || study.trim() === '') {
            throw new RegistryIntegrityError('study must be a non-empty string');
        }
        return consumptionOf(id).some(r => r.study === study);
    }

    /**
     * May this trajectory seed be used for one run cell of `study`?
     *
     *   use = { study, category, arm?, configSeed? }
     *
     * The consumption identity is (source, study). `arm` and `configSeed` describe the
     * cell and are validated (a configSeed must be a config identity), but they are NOT
     * part of the identity: a C x R study applies one trajectory seed to every
     * configuration and to both arms.
     *
     * Returns, never a boolean:
     *   { decision: 'AVAILABLE' }         no study has used this source
     *   { decision: 'REPRODUCTION' }      this study already used this exact raw value
     *   { decision: 'AUTHORIZED_REUSE' }  first use under a recorded authorization
     * Throws GovernanceRefusal:
     *   HELD_OUT | CONSUMED_BY_OTHER_STUDY | ALIASED_SOURCE | CATEGORY_TRANSITION
     */
    function checkUse(id, use) {
        requireNamespace(id, NAMESPACE.TRAJECTORY);
        if (typeof use !== 'object' || use === null) {
            throw new RegistryIntegrityError('use must be an object');
        }
        const extra = Object.keys(use).filter(k => !['study', 'category', 'arm', 'configSeed']
                                                 .includes(k));
        if (extra.length) throw new RegistryIntegrityError(`unknown use fields ${extra.join(',')}`);
        const { study, category, arm, configSeed: cfg } = use;
        if (typeof study !== 'string' || study.trim() === '') {
            throw new RegistryIntegrityError('use.study must be a non-empty string');
        }
        if (!CATEGORIES.has(category)) {
            throw new RegistryIntegrityError(`use.category ${category} is not a category`);
        }
        if (arm !== undefined && !ARMS.has(arm)) {
            throw new RegistryIntegrityError(`use.arm ${arm} is not an arm`);
        }
        if (cfg !== undefined) requireNamespace(cfg, NAMESPACE.CONFIG);

        if (isHeldOut(id)) {
            throw new GovernanceRefusal('HELD_OUT', `trajectory seed ${id.value} is held out`);
        }
        const prior = consumptionOf(id);
        const mine = prior.filter(r => r.study === study);
        const other = prior.filter(r => r.study !== study);

        const unauthorized = other.filter(r => r.value !== id.value ||
                                               !isAuthorized(id.value, r.study, study));
        if (unauthorized.length) {
            throw new GovernanceRefusal('CONSUMED_BY_OTHER_STUDY',
                `trajectory seed ${id.value} shares a stochastic source with ` +
                unauthorized.map(r => `${r.value} (${r.study})`).join(', ') +
                ' and no authorization covers this exact value and study pair');
        }
        const aliased = mine.filter(r => r.value !== id.value);
        if (aliased.length) {
            throw new GovernanceRefusal('ALIASED_SOURCE',
                `trajectory seed ${id.value} is a different raw value for the source ${study} ` +
                `already recorded as ${aliased.map(r => r.value).join(', ')}; a rerun must use ` +
                `the recorded value, and a new replicate must be a new source`);
        }
        const involved = [...mine, ...other];
        if (involved.some(r => r.status !== category)) {
            throw new GovernanceRefusal('CATEGORY_TRANSITION',
                `trajectory seed ${id.value} is recorded as ` +
                `${[...new Set(involved.map(r => r.status))].join('/')}; requested ${category}`);
        }
        const decision = mine.length ? 'REPRODUCTION' : other.length ? 'AUTHORIZED_REUSE' : 'AVAILABLE';
        return Object.freeze({ decision });
    }

    return Object.freeze({
        records: frozenRecords, heldOut: frozenHeldOut, authorizations: frozenAuths,
        isHeldOut, consumptionOf, isConsumedByStudy, checkUse,
    });
}

// ---- committed trajectory records ---------------------------------------------
// The retrospective typing M32 §13 and §17.11 specify. Nothing new is consumed.
// Values and studies are read from committed source and data, cited per record.
const M31_WHY = 'M31 development trajectory seed; executed values read from ' +
                'experiments/m31/data/m31_observations.json';
export const TRAJECTORY_RECORDS = Object.freeze([
    { namespace: NAMESPACE.TRAJECTORY, value: 20260819000, study: 'M7-substrate',
      status: CATEGORY.REGISTERED, executed: true,
      authorization: 'frozen M7_PREREGISTRATION.md §5.1 (SHA-256 2f12e309…); ' +
                     'FROZEN.agentSeed of M8, Q1, UQ-A, UQ-B and C1',
      artifact: 'experiments/c1/protocol.js FROZEN.agentSeed',
      why: 'the frozen production agentSeed shared by the M7 substrate lineage (M32 §13). ' +
           'M31 also executed it as its anchor; that historical cross-study reuse is ' +
           'recorded in M31-R1 and is not re-recorded as an M31 consumption, because a ' +
           'second record would make this registry refuse reproduction by the owning lineage' },
    ...[20260819001, 20260819002, 20260819003, 20261819003, 20262819003].map(value => ({
        namespace: NAMESPACE.TRAJECTORY, value, study: 'M31',
        status: CATEGORY.DEVELOPMENT, executed: true,
        authorization: 'Director ruling of 2026-09-11, M31 authorized (commit 0453c14)',
        artifact: 'experiments/m31/data/m31_observations.json',
        why: M31_WHY })),
]);

// No held-out trajectory region is reserved: M32 §17.10 — the mechanism exists, no
// current requirement demands a reservation.
export const TRAJECTORY_HELD_OUT = Object.freeze([]);

// No cross-study reuse is authorized (M33-R1). An authorization is a committed record,
// so it exists in the registry before any checkUse that relies on it.
export const TRAJECTORY_AUTHORIZATIONS = Object.freeze([]);

export const trajectory = createTrajectoryRegistry({
    records: TRAJECTORY_RECORDS, heldOut: TRAJECTORY_HELD_OUT,
    authorizations: TRAJECTORY_AUTHORIZATIONS,
});

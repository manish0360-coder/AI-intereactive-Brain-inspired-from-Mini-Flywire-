// ==========================================================
// TYPED TRAJECTORY REGISTRY v2 — indexed lookup and list-bound block records (M-REG-1)
// ==========================================================
// WHAT THIS MODULE IS
//   A layer over experiments/registry/typed.js, which stays byte-identical (it is bound by hash
//   in the H1-R build identity and the historical verifiers). It re-exports everything from
//   typed.js and replaces exactly two names:
//
//     createTrajectoryRegistry   same inputs plus an optional `blocks` array; every decision,
//                                refusal code and message for explicit records is the same as
//                                typed.js, but conflict and lookup work is INDEXED by derived
//                                stream seed instead of a pairwise / linear scan
//     trajectory                 the production registry built from the SAME TRAJECTORY_RECORDS,
//                                TRAJECTORY_HELD_OUT and TRAJECTORY_AUTHORIZATIONS plus the
//                                block data in trajectory_blocks.js
//
// WHY INDEXED
//   typed.js validates all record pairs (O(n^2)) and scans all records on every lookup (O(n)).
//   That is invisible at 11 records and ruinous at a few thousand: roughly 41 s to construct and
//   15 ms per lookup at 3,851 records, paid by every process that imports it.
//
// BLOCK RECORD (schema 'trajectory.block/1')
//   A block represents the raw seeds lo..hi except `excluded`, i.e. a list whose exact content
//   is fixed by listSha256 = SHA-256 of the member values in ascending order, written in decimal
//   and joined by ','. The registry recomputes the member list at construction and refuses unless
//   the hash, the count and every structural rule hold. An interval alone proves nothing.
//   Each member behaves exactly like an explicit per-seed record with the block's study, status,
//   authorization, artifact and rationale (the differential battery in verify_blocks.js checks
//   this against typed.js as the oracle). The block does not claim that the list is the output
//   of any admission algorithm; that binding is made by the consumer (the study harness
//   compares listSha256 with its own admission output and its freeze record).
//
// WHAT THIS MODULE IS NOT
//   It registers nothing, reserves nothing and consumes no seed. trajectory_blocks.js is empty.
//   New code must import the registry from HERE; importing typed.js directly is blocked by
//   verify_import_isolation.js outside the H1-R scope and an exact list of legacy files.
// ==========================================================
import crypto from 'node:crypto';
import * as V1 from './typed.js';
import { TRAJECTORY_BLOCKS } from './trajectory_blocks.js';

export * from './typed.js';
// The committed implementation, under names that say what it is. They exist so that tests can use typed.js as the
// ORACLE without a direct import of it. The legacy registry cannot see blocks: verify_import_isolation.js flags any
// use of these two names outside experiments/registry/.
export { createTrajectoryRegistry as createLegacyTrajectoryRegistry, trajectory as legacyTrajectory } from './typed.js';

const { NAMESPACE, CATEGORY, trajectorySeed, streamSeeds, isSeedIdentity, UntypedSeedError, NamespaceRefusal,
        GovernanceRefusal, RegistryIntegrityError, TRAJECTORY_RECORDS, TRAJECTORY_HELD_OUT, TRAJECTORY_AUTHORIZATIONS } = V1;

export const REGISTRY_LAYER = 'typed/2';
export const BLOCK_SCHEMA = 'trajectory.block/1';
export const SUPPORTED_BLOCK_SCHEMAS = Object.freeze([BLOCK_SCHEMA]);
/** upper bound on a block hull: a malformed hull must be refused, not iterated */
export const MAX_BLOCK_HULL = 1_000_000;
export { TRAJECTORY_BLOCKS };

const CATEGORIES = new Set(Object.values(CATEGORY));
const NAMESPACES = new Set(Object.values(NAMESPACE));
const ARMS = new Set(['ARMED', 'ABLATED']);                        // mirrors typed.js
const STREAM_XOR = Object.freeze({ cognitive: 0, visual: 0x9e3779b9, environment: 0x5EED, sigma: 0xBEEF });   // mirrors typed.js
const STREAMS = Object.freeze(Object.keys(STREAM_XOR));
const RECORD_FIELDS = Object.freeze(['namespace', 'value', 'study', 'status', 'authorization', 'executed', 'artifact', 'why']);
const BLOCK_FIELDS = Object.freeze(['schema', 'namespace', 'study', 'status', 'lo', 'hi', 'excluded', 'count', 'listSha256',
                                    'executed', 'authorization', 'artifact', 'why', 'configuration']);
const AUTH_FIELDS = 'authorization,fromStudy,namespace,toStudy,value,why';
const SOURCE_MAX = 0xFFFFFFFF;
const HEX64 = /^[0-9a-f]{64}$/;
const integrity = (m) => new RegistryIntegrityError(m);

// The mirrored stream constants must agree with typed.js's own derivation; a drift is refused at load.
for (const probe of [0, 1, 2, 0x5EED, 0xFFFFFFFF, 20260819000]) {
    const d = streamSeeds(trajectorySeed(probe));
    for (const n of STREAMS) {
        if (d[n] !== (((probe ^ STREAM_XOR[n]) >>> 0) || 1)) throw integrity(`typed_v2 stream constants disagree with typed.js (${n}, ${probe})`);
    }
}

// ---- identities (mirrors typed.js requireIdentity / requireNamespace) ------------------------
function requireNamespace(x, namespace) {
    if (!isSeedIdentity(x) || !NAMESPACES.has(x.namespace)) throw new UntypedSeedError(x);
    if (x.namespace !== namespace) throw new NamespaceRefusal(namespace, x);
    return x;
}

// ---- held-out reservation (mirrors typed.js heldOutBySource) ---------------------------------
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

// ---- explicit-record validators (mirror typed.js, same messages) -----------------------------
function validateRecord(r, i) {
    const keys = Object.keys(r).sort().join(',');
    if (keys !== [...RECORD_FIELDS].sort().join(',')) throw integrity(`record ${i} has fields ${keys}`);
    if (r.namespace !== NAMESPACE.TRAJECTORY) throw integrity(`record ${i} is not a trajectory record`);
    if (!Number.isSafeInteger(r.value)) throw integrity(`record ${i} has invalid value ${r.value}`);
    for (const f of ['study', 'authorization', 'artifact', 'why']) {
        if (typeof r[f] !== 'string' || r[f].trim() === '') throw integrity(`record ${i} has empty ${f}`);
    }
    if (!CATEGORIES.has(r.status)) throw integrity(`record ${i} has status ${r.status}`);
    if (typeof r.executed !== 'boolean') throw integrity(`record ${i} executed must be boolean`);
}
function validateHeldOut(h, i) {
    const keys = Object.keys(h).sort().join(',');
    if (keys !== 'authorization,hi,lo,why') throw integrity(`held-out range ${i} has fields ${keys}`);
    if (!Number.isSafeInteger(h.lo) || !Number.isSafeInteger(h.hi) || h.lo < 0 || h.hi > SOURCE_MAX || h.lo > h.hi) {
        throw integrity(`held-out range ${i} must lie within the 32-bit source domain 0-${SOURCE_MAX}`);
    }
}
function validateAuthorization(a, i) {
    const keys = Object.keys(a).sort().join(',');
    if (keys !== AUTH_FIELDS) throw integrity(`authorization ${i} has fields ${keys}`);
    if (a.namespace !== NAMESPACE.TRAJECTORY || !Number.isSafeInteger(a.value)) throw integrity(`authorization ${i} is not a trajectory authorization`);
    for (const f of ['fromStudy', 'toStudy', 'authorization', 'why']) {
        if (typeof a[f] !== 'string' || a[f].trim() === '') throw integrity(`authorization ${i} has empty ${f}`);
    }
    if (a.fromStudy === a.toStudy) throw integrity(`authorization ${i} names one study twice`);
}

// ---- block records ---------------------------------------------------------------------------
/** SHA-256 of the member values in ascending order, in decimal, joined by ',' (the admitted-list representation) */
export function listSha256Of(members) { return crypto.createHash('sha256').update(members.join(',')).digest('hex'); }
/** the exact member list a block denotes: lo..hi except `excluded`, ascending (assumes a validated block) */
export function memberListOf(block) {
    const skip = new Set(block.excluded), out = [];
    for (let v = block.lo; v <= block.hi; v++) if (!skip.has(v)) out.push(v);
    return out;
}
function validateBlock(b, i) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw integrity(`block ${i} must be an object`);
    const keys = Object.keys(b).sort().join(',');
    if (keys !== [...BLOCK_FIELDS].sort().join(',')) throw integrity(`block ${i} has fields ${keys}`);
    if (!SUPPORTED_BLOCK_SCHEMAS.includes(b.schema)) throw integrity(`block ${i} has unsupported schema ${b.schema}`);
    if (b.namespace !== NAMESPACE.TRAJECTORY) throw integrity(`block ${i} is not a trajectory block`);
    for (const f of ['study', 'authorization', 'artifact', 'why']) {
        if (typeof b[f] !== 'string' || b[f].trim() === '') throw integrity(`block ${i} has empty ${f}`);
    }
    if (!CATEGORIES.has(b.status)) throw integrity(`block ${i} has status ${b.status}`);
    if (typeof b.executed !== 'boolean') throw integrity(`block ${i} executed must be boolean`);
    if (!Number.isSafeInteger(b.lo) || !Number.isSafeInteger(b.hi) || b.lo < 0 || b.hi > SOURCE_MAX || b.lo > b.hi) {
        throw integrity(`block ${i} range must lie within the 32-bit source domain 0-${SOURCE_MAX}`);
    }
    if (b.hi - b.lo + 1 > MAX_BLOCK_HULL) throw integrity(`block ${i} hull exceeds ${MAX_BLOCK_HULL} seeds`);
    if (!Array.isArray(b.excluded) || b.excluded.some((v, k) => !Number.isSafeInteger(v) || v < b.lo || v > b.hi || (k > 0 && v <= b.excluded[k - 1]))) {
        throw integrity(`block ${i} excluded must be ascending unique raw seeds inside [lo, hi]`);
    }
    const members = memberListOf(b);
    if (!Number.isSafeInteger(b.count) || b.count !== members.length || members.length === 0) throw integrity(`block ${i} count does not match the member list`);
    if (typeof b.listSha256 !== 'string' || !HEX64.test(b.listSha256)) throw integrity(`block ${i} listSha256 is not a lowercase SHA-256 hex digest`);
    if (b.listSha256 !== listSha256Of(members)) throw integrity(`block ${i} listSha256 does not match the reconstructed member list`);
    const c = b.configuration;
    if (!c || typeof c !== 'object' || Object.keys(c).sort().join(',') !== 'acceptedSeed,index,seed'
        || !Number.isSafeInteger(c.seed) || !Number.isSafeInteger(c.index) || !Number.isSafeInteger(c.acceptedSeed)
        || c.seed < 0 || c.index < 0 || c.acceptedSeed < c.seed) {
        throw integrity(`block ${i} configuration identity is invalid`);
    }
    return members;
}

const canonical = (x) => JSON.stringify((function norm(v) {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])]));
    return v;
})(x));

/**
 * Build a trajectory registry from enumerated records, held-out ranges, authorizations and block records.
 * With `blocks = []` every outcome equals typed.js createTrajectoryRegistry (the verifier proves it).
 */
export function createTrajectoryRegistry({ records, heldOut, authorizations = [], blocks = [] }) {
    if (!Array.isArray(records) || !Array.isArray(heldOut) || !Array.isArray(authorizations)) {
        throw integrity('records, heldOut and authorizations must be arrays');      // verbatim typed.js message
    }
    if (!Array.isArray(blocks)) throw integrity('blocks must be an array');
    records.forEach(validateRecord);
    heldOut.forEach(validateHeldOut);
    authorizations.forEach(validateAuthorization);
    const memberLists = blocks.map(validateBlock);

    // the flat view: explicit records first (their order is the registry order), then block members ascending
    const all = records.map(r => ({ ...r }));
    const originBlock = records.map(() => -1);
    blocks.forEach((b, bi) => memberLists[bi].forEach(v => {
        all.push({ namespace: b.namespace, value: v, study: b.study, status: b.status, authorization: b.authorization,
                   executed: b.executed, artifact: b.artifact, why: b.why });
        originBlock.push(bi);
    }));

    const seen = new Set();
    for (const r of all) {
        const k = `${r.value}|${r.study}`;
        if (seen.has(k)) throw integrity(`duplicate record for ${k}`);
        seen.add(k);
    }
    const inHeldOut = (v) => heldOutBySource(v, heldOut);
    for (const r of all) {
        if (inHeldOut(r.value)) throw integrity(`value ${r.value} is both held-out and consumed`);
    }

    const authSeen = new Set();
    for (const a of authorizations) {
        const k = `${a.value}|${[a.fromStudy, a.toStudy].sort().join('|')}`;
        if (authSeen.has(k)) throw integrity(`duplicate authorization ${k}`);
        authSeen.add(k);
        if (!all.some(r => r.value === a.value && r.study === a.fromStudy)) {
            throw integrity(`authorization for ${a.value} is issued by ${a.fromStudy}, which holds no record of that exact value`);
        }
    }
    const isAuthorized = (value, a, b) => authorizations.some(x => x.value === value &&
        ((x.fromStudy === a && x.toStudy === b) || (x.fromStudy === b && x.toStudy === a)));

    // index: `${stream}:${derived seed}` -> positions in `all`; two raw values share a source iff any
    // same-named derived seed coincides, which is exactly an index bucket with two entries
    const index = new Map();
    all.forEach((r, i) => {
        const s = streamSeeds(trajectorySeed(r.value));
        for (const n of STREAMS) {
            const key = `${n}:${s[n]}`;
            const bucket = index.get(key);
            if (bucket) bucket.push(i); else index.set(key, [i]);
        }
    });
    const pairs = new Map();
    for (const bucket of index.values()) {
        for (let x = 0; x < bucket.length; x++) for (let y = x + 1; y < bucket.length; y++) pairs.set(bucket[x] * (all.length + 1) + bucket[y], [bucket[x], bucket[y]]);
    }
    // examine sharing pairs in (i, j) order so the first refusal is the one typed.js would report
    for (const [i, j] of [...pairs.values()].sort((p, q) => p[0] - q[0] || p[1] - q[1])) {
        const ri = all[i], rj = all[j];
        if (ri.study === rj.study) throw integrity(`${ri.study} records ${ri.value} and ${rj.value}, which share a stochastic source`);
        if (ri.value !== rj.value || ri.status !== rj.status || !isAuthorized(ri.value, ri.study, rj.study)) {
            throw integrity(`${ri.study} (${ri.value}) and ${rj.study} (${rj.value}) share a stochastic source without an exact, ` +
                            `same-category authorization`);
        }
    }

    const frozenAll = all.map(r => Object.freeze(r));
    const frozenRecords = Object.freeze(frozenAll.slice(0, records.length));
    const frozenHeldOut = Object.freeze(heldOut.map(h => Object.freeze({ ...h })));
    const frozenAuths = Object.freeze(authorizations.map(a => Object.freeze({ ...a })));
    const frozenBlocks = Object.freeze(blocks.map(b => Object.freeze({ ...b, excluded: Object.freeze([...b.excluded]), configuration: Object.freeze({ ...b.configuration }) })));
    const blockOfRecord = new Map();
    frozenAll.forEach((r, i) => { if (originBlock[i] >= 0) blockOfRecord.set(r, frozenBlocks[originBlock[i]]); });

    function isHeldOut(id) {
        const v = requireNamespace(id, NAMESPACE.TRAJECTORY).value;
        return inHeldOut(v);
    }
    // every record (explicit or block member) whose source shares any derived stream seed with this identity
    function consumptionOf(id) {
        requireNamespace(id, NAMESPACE.TRAJECTORY);
        const s = streamSeeds(id), hit = new Set();
        for (const n of STREAMS) {
            const bucket = index.get(`${n}:${s[n]}`);
            if (bucket) for (const i of bucket) hit.add(i);
        }
        return [...hit].sort((a, b) => a - b).map(i => frozenAll[i]);
    }
    function isConsumedByStudy(id, study) {
        if (typeof study !== 'string' || study.trim() === '') throw integrity('study must be a non-empty string');
        return consumptionOf(id).some(r => r.study === study);
    }
    function checkUse(id, use) {
        requireNamespace(id, NAMESPACE.TRAJECTORY);
        if (typeof use !== 'object' || use === null) throw integrity('use must be an object');
        const extra = Object.keys(use).filter(k => !['study', 'category', 'arm', 'configSeed'].includes(k));
        if (extra.length) throw integrity(`unknown use fields ${extra.join(',')}`);
        const { study, category, arm, configSeed: cfg } = use;
        if (typeof study !== 'string' || study.trim() === '') throw integrity('use.study must be a non-empty string');
        if (!CATEGORIES.has(category)) throw integrity(`use.category ${category} is not a category`);
        if (arm !== undefined && !ARMS.has(arm)) throw integrity(`use.arm ${arm} is not an arm`);
        if (cfg !== undefined) requireNamespace(cfg, NAMESPACE.CONFIG);

        if (isHeldOut(id)) throw new GovernanceRefusal('HELD_OUT', `trajectory seed ${id.value} is held out`);
        const prior = consumptionOf(id);
        const mine = prior.filter(r => r.study === study);
        const other = prior.filter(r => r.study !== study);

        const unauthorized = other.filter(r => r.value !== id.value || !isAuthorized(id.value, r.study, study));
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
    /** the block a member record came from, or null for an explicit record */
    const blockOf = (record) => blockOfRecord.get(record) || null;
    /** canonical SHA-256 of the registry state (records, held-out, authorizations, blocks) for freeze binding */
    const digest = () => crypto.createHash('sha256').update(canonical({ layer: REGISTRY_LAYER, records: frozenRecords, heldOut: frozenHeldOut, authorizations: frozenAuths, blocks: frozenBlocks })).digest('hex');

    return Object.freeze({
        layer: REGISTRY_LAYER, records: frozenRecords, heldOut: frozenHeldOut, authorizations: frozenAuths, blocks: frozenBlocks,
        isHeldOut, consumptionOf, isConsumedByStudy, checkUse, blockOf, digest,
    });
}

/** the production registry: typed.js's committed records plus the block data module */
export const trajectory = createTrajectoryRegistry({
    records: TRAJECTORY_RECORDS, heldOut: TRAJECTORY_HELD_OUT, authorizations: TRAJECTORY_AUTHORIZATIONS, blocks: TRAJECTORY_BLOCKS,
});

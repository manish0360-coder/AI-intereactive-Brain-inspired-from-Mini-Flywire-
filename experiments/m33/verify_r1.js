// ==========================================================
// M33-R1 — INDEPENDENT VERIFICATION OF THE CLOSED GOVERNANCE RULE
// ==========================================================
// Verifies experiments/registry/typed.js as changed by M33-R1:
//   R1  different study + same source            -> refused unless authorized
//   R2  explicit authorization                   -> exact raw value, exact study pair,
//                                                   same category, recorded in the registry
//   R3  same study + different raw value, same source -> ALIASED_SOURCE
//   R4  governance identity of a stochastic source = derived stream seeds (lag 0)
//   L1  lagged overlap on mulberry32's single cycle is NOT governed (pinned limitation)
//
// It re-runs the whole M33 behavioural suite against the R1 module (R1 must not weaken
// any M33 property), adds the R1 suite, and mutation-tests both. Behaviour is proven
// by executing the module and the runtime RNG, never by matching source text.
//
// SOURCE BINDING: the subject is typed.js as committed by M33-R1 (the commit that added
// this file); before that commit, the working tree.
//
// Consumes no seed, boots no agent, writes only to a temp dir.
//   node experiments/m33/verify_r1.js [--json]
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runSuite, buildContext, importerSets, gateVerdict, loadTyped, buildMutant,
         MUTANTS as M33_MUTANTS, EQUIVALENT_CONTROL as M33_CONTROL, BASE, M33_FILES, cleanupTmp } from './verify.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const JSON_MODE = process.argv.includes('--json');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const log = (...a) => { if (!JSON_MODE) console.log(...a); };

export const M33_COMMIT = '3fb28767a4157ba35c4a14d0b81f39cbb063da36';
const TYPED_PATH = 'experiments/registry/typed.js';
const SELF_PATH = 'experiments/m33/verify_r1.js';
export const R1_FILES = [
    'experiments/registry/typed.js',
    'experiments/m33/verify.js',
    'experiments/m33/verify_r1.js',
    'research/preregistrations/M33_R1_GOVERNANCE_RULING.md',
    'research/preregistrations/verify_m33_r1.js',
];

const expectThrow = (fn, Klass, code) => {
    const SENTINEL = Symbol('no-return');
    let returned = SENTINEL, err = null;
    try { returned = fn(); } catch (e) { err = e; }
    return returned === SENTINEL && err instanceof Klass && err.code === code;
};

// mulberry32 cycle position: state = pos * W (mod 2^32).
const M32N = 2n ** 32n, WEYL = 0x6d2b79f5n;
const inverse = (a, m) => {
    let [r0, r1, s0, s1] = [a, m, 1n, 0n];
    while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
    return ((s0 % m) + m) % m;
};
const WEYL_INV = inverse(WEYL, M32N);
const cyclePos = (state) => Number((BigInt(state >>> 0) * WEYL_INV) % M32N);

// ---- the R1 suite ---------------------------------------------------------------
export async function runSuiteR1(T, env) {
    const { rng, m31MaxDraws, m33Records } = env;
    const results = [];
    const check = (id, cond, msg) => {
        let ok;
        try { ok = typeof cond === 'function' ? !!cond() : !!cond; } catch (e) {
            ok = false; msg = `${msg} [threw ${e.code || e.name}]`;
        }
        results.push({ id, ok, msg });
        return ok;
    };
    const trj = (v) => T.trajectorySeed(v), cfg = (v) => T.configSeed(v);
    const REC = (value, study, status = 'registered') => ({ namespace: 'trajectory', value, study, status,
        executed: true, authorization: 'verifier fixture', artifact: 'none', why: 'in-memory only' });
    const AUTH = (value, fromStudy, toStudy) => ({ namespace: 'trajectory', value, fromStudy, toStudy,
        authorization: 'verifier fixture ruling', why: 'in-memory only' });
    const reg = (spec) => { try { return T.createTrajectoryRegistry(spec); } catch { return null; } };
    const decide = (r, v, use) => {
        try {
            const out = r.checkUse(trj(v), use);
            return (typeof out === 'object' && out !== null && typeof out.decision === 'string')
                ? out.decision : `NON_DECISION:${typeof out}`;
        } catch (e) { return e instanceof T.GovernanceRefusal ? e.code : `ERR:${e.code || e.name}`; }
    };
    const U = (study, extra = {}) => ({ study, category: 'registered', ...extra });

    // ---------- K. the five objects are distinct ----------
    check('K1', () => {
        const a = trj(5), b = trj(5 + 2 ** 32);
        return !T.sameSeed(a, b) && ((5 + 2 ** 32) >>> 0) === 5 &&
            JSON.stringify(T.streamSeeds(a)) === JSON.stringify(T.streamSeeds(b));
    }, 'raw value != normalized seed: 5 and 5+2^32 are distinct identities with identical derived seeds');
    check('K2', () => {
        const s0 = T.streamSeeds(trj(0)), s1 = T.streamSeeds(trj(1));
        return s0.cognitive === 1 && s1.cognitive === 1 && s0.environment !== s1.environment &&
            s0.sigma !== s1.sigma;
    }, 'normalized seed != derived seed: raw 0 and 1 share only the cognitive stream (0 -> 1)');
    check('K3', () => {
        const a = (20260819000 >>> 0), k = 1000;
        const b = Number((BigInt(a) + BigInt(k) * WEYL) % M32N);
        const ra = rng.makeRng(a), rb = rng.makeRng(b);
        const A = Array.from({ length: k + 64 }, () => ra());
        const B = Array.from({ length: 64 }, () => rb());
        return a !== b && B.every((x, i) => x === A[k + i]) && cyclePos(b) === (cyclePos(a) + k) % 2 ** 32;
    }, 'derived seed != stochastic stream: RUNTIME makeRng seeded a+1000·W draws a\'s stream shifted by 1000');
    check('K4', () => {
        const r = reg({ records: [REC(20260819000 >>> 0, 'H')], heldOut: [] });
        const b = Number((BigInt(20260819000 >>> 0) + 1000n * WEYL) % M32N);
        return r && decide(r, b, U('X')) === 'AVAILABLE';
    }, 'L1 PINNED LIMITATION: a lag-1000 overlapping stream is NOT refused — governance identity is lag 0 only');
    check('K5', () => {
        const r = reg({ records: [], heldOut: [] });
        return expectThrow(() => r.checkUse(trj(42), U('S', { fingerprint: 'abc' })),
            T.RegistryIntegrityError, 'REGISTRY_INTEGRITY') &&
            expectThrow(() => r.checkUse(trj(42), U('S', { configSeed: trj(7) })), T.NamespaceRefusal,
                'INVALID_NAMESPACE') &&
            decide(r, 42, U('S', { configSeed: cfg(7), arm: 'ARMED' })) === 'AVAILABLE';
    }, 'configuration identity and realised-trajectory fingerprint are not trajectory governance inputs');

    // ---------- H. historical records against lagged overlap ----------
    check('H1', () => {
        const STREAMS = [0, 0x9e3779b9, 0x5EED, 0xBEEF];
        const starts = [];
        for (const r of m33Records) for (const x of STREAMS) starts.push(cyclePos(((r.value ^ x) >>> 0) || 1));
        let min = Infinity;
        for (let i = 0; i < starts.length; i++) for (let j = i + 1; j < starts.length; j++) {
            const d = Math.abs(starts[i] - starts[j]);
            min = Math.min(min, d, 2 ** 32 - d);
        }
        env.historicalMinDistance = min;
        return starts.length === 24 && min > m31MaxDraws;
    }, () => `committed records: minimum cycle distance between any two of 24 stream starts ` +
        `${env.historicalMinDistance} > largest recorded per-run draw count ${m31MaxDraws}`);
    check('H2', () => {
        const N = m31MaxDraws, R = 1000;
        const expected = (R * (R - 1) / 2) * (2 * N) / 2 ** 32;
        let x = 0x2545F491n, overlaps = 0;
        const ps = Array.from({ length: R }, () => {
            x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n);
            return cyclePos(Number(x >> 32n) >>> 0);
        }).sort((p, q) => p - q);
        for (let i = 0; i < R; i++) for (let j = i + 1; j < R && ps[j] - ps[i] < N; j++) overlaps++;
        env.lagExpected = expected; env.lagObserved = overlaps;
        return expected > 1 && overlaps > 0;
    }, () => `at C x R scale the limitation matters: R=1000 uniform trajectory seeds, cognitive streams ` +
        `only, expected overlapping pairs ${env.lagExpected?.toFixed(2)}, one deterministic draw ` +
        `${env.lagObserved}`);

    // Configuration seeds seed mulberry32 too (env.js makeConfig: makeRng(configSeed >>> 0)),
    // so both namespaces share ONE cycle. H3 establishes makeConfig's exact draw count by
    // reconstructing its last embedding from the raw stream; H4 scans every historical
    // configuration block against every committed trajectory stream in both directions.
    check('H3', () => {
        const c = 896066, cfgObj = env.makeConfig(c, 0);
        const g = rng.makeRng(c >>> 0);
        const draws = Array.from({ length: 800 }, () => g());
        const last = [...cfgObj.embedding.values()].pop();
        const nodes = cfgObj.embedding.size, dim = last.length;
        const count = 38 + 2 * 39 + nodes * dim;
        const raw = draws.slice(count - dim, count).map(x => x * 2 - 1);
        const m = Math.sqrt(raw.reduce((a, b) => a + b * b, 0)) || 1;
        env.cfgDraws = count;
        return nodes === 20 && dim === 32 && count === 756 &&
            raw.every((x, i) => x / m === last[i]);
    }, () => `makeConfig consumes exactly ${env.cfgDraws} draws (38 shuffle + 78 uniforms + 20x32 ` +
        `embedding), proven by reconstructing its final embedding from the raw stream`);
    check('H4', () => {
        const N_T = m31MaxDraws, N_C = env.cfgDraws;
        const ahead = (from, to) => ((to - from) % 2 ** 32 + 2 ** 32) % 2 ** 32;
        const blocks = [[895000, 895999], [896000, 896999], [897000, 897999], [898000, 898999],
                        [899000, 899499], [899500, 899999], [900000, 900499]];
        const STREAMS = { cognitive: 0, visual: 0x9e3779b9, environment: 0x5EED, sigma: 0xBEEF };
        const cfgPos = [];
        for (const [lo, hi] of blocks) for (let c = lo; c <= hi; c++) cfgPos.push([c, cyclePos((c >>> 0) || 1)]);
        const hits = [];
        for (const r of m33Records) for (const [sn, x] of Object.entries(STREAMS)) {
            const pt = cyclePos(((r.value ^ x) >>> 0) || 1);
            for (const [c, pc] of cfgPos) {
                if (ahead(pt, pc) < N_T || ahead(pc, pt) < N_C) hits.push(`${r.study}:${r.value}/${sn}~${c}`);
            }
        }
        env.crossHits = hits.sort();
        const production = hits.filter(h => h.startsWith('M7-substrate:'));
        return cfgPos.length === 5500 && production.length === 0 &&
            JSON.stringify(env.crossHits) === JSON.stringify(
                ['M31:20261819003/visual~899774', 'M31:20262819003/cognitive~897104']);
    }, () => `one cycle, two namespaces: the production seed's four streams overlap NONE of 5500 historical ` +
        `configuration streams; the committed M31 development streams overlap exactly ` +
        `${JSON.stringify(env.crossHits)}`);

    // ---------- D. the rule ----------
    const regA = reg({ records: [REC(42, 'S-A')], heldOut: [] });
    check('D1', () => [1, 2, 3].every(() => decide(regA, 42, U('S-A')) === 'REPRODUCTION'),
        'same-study rerun with the recorded raw value is REPRODUCTION, repeatably');
    check('D2', () => ['ARMED', 'ABLATED'].every(arm => decide(regA, 42, U('S-A', { arm })) === 'REPRODUCTION'),
        'paired ARMED/ABLATED use of one source within a study is permitted');
    check('D3', () => {
        let ledger = [];
        const tally = {};
        for (const t of [42, 7000001, 1234567891, 2147483648, 3999999999])
            for (const c of [10001, 10002, 10003]) for (const arm of ['ARMED', 'ABLATED']) {
                const r = reg({ records: ledger, heldOut: [] });
                const d = r ? decide(r, t, U('S-G', { arm, configSeed: cfg(c) })) : 'NO_REGISTRY';
                tally[d] = (tally[d] || 0) + 1;
                if (d === 'AVAILABLE') ledger = [...ledger, REC(t, 'S-G')];
            }
        env.gridTally = tally;
        return tally.AVAILABLE === 5 && tally.REPRODUCTION === 25 && Object.keys(tally).length === 2;
    }, () => `one source across configurations and arms: ${JSON.stringify(env.gridTally)}`);
    check('D4', () => decide(regA, 42, U('S-B')) === 'CONSUMED_BY_OTHER_STUDY',
        'unauthorized cross-study reuse is refused');

    const regH = reg({ records: [REC(42, 'H')], heldOut: [], authorizations: [AUTH(42, 'H', 'S')] });
    const regHS = reg({ records: [REC(42, 'H'), REC(42, 'S')], heldOut: [],
                        authorizations: [AUTH(42, 'H', 'S')] });
    check('D5', () => decide(regH, 42, U('S')) === 'AUTHORIZED_REUSE',
        'explicitly authorized cross-study reuse of the exact raw value: AUTHORIZED_REUSE');
    check('D6', () => decide(regHS, 42, U('S')) === 'REPRODUCTION' && decide(regHS, 42, U('H')) === 'REPRODUCTION',
        'after authorized reuse is recorded, both the holder and the authorized study may reproduce');
    check('D7', () => decide(regH, 42, U('T')) === 'CONSUMED_BY_OTHER_STUDY' &&
        decide(reg({ records: [REC(42, 'H'), REC(42, 'S')], heldOut: [],
            authorizations: [AUTH(42, 'H', 'S'), AUTH(42, 'H', 'T')] }), 42, U('T')) === 'CONSUMED_BY_OTHER_STUDY',
        'an authorization is pair-specific: a third study is refused, even with its own grant from the holder ' +
        'while another study also holds the source');
    check('D8', () => decide(regH, 42 + 2 ** 32, U('S')) === 'CONSUMED_BY_OTHER_STUDY',
        'an authorization never covers an alias of the authorized raw value');
    check('D9', () => decide(regH, 42, { study: 'S', category: 'development' }) === 'CATEGORY_TRANSITION',
        'an authorization cannot bridge categories');
    check('D10', () => decide(regA, 42 + 2 ** 32, U('S-A')) === 'ALIASED_SOURCE' &&
        decide(reg({ records: [REC(1, 'S-A')], heldOut: [] }), 0, U('S-A')) === 'ALIASED_SOURCE',
        'same study, different raw value, same source (full alias and partial 0/1 alias): ALIASED_SOURCE');
    check('D11', () => {
        let ledger = [], refused = 0, available = 0;
        for (const t of [42, 42 + 2 ** 32, 43]) {
            const r = reg({ records: ledger, heldOut: [] });
            const d = decide(r, t, U('S-P'));
            if (d === 'AVAILABLE') { available++; ledger = [...ledger, REC(t, 'S-P')]; }
            else if (d === 'ALIASED_SOURCE') refused++;
        }
        return available === 2 && refused === 1;
    }, 'a replicate list containing an aliased raw value cannot count one source as two replicates');
    check('D12', () => decide(T.trajectory, 3080949816, U('NEW')) === 'CONSUMED_BY_OTHER_STUDY' &&
        decide(T.trajectory, 20260819000, U('M7-substrate')) === 'REPRODUCTION' &&
        decide(T.trajectory, 3080949816, U('M7-substrate')) === 'ALIASED_SOURCE',
        'committed registry: the production seed\'s alias is refused to a new study AND to its own lineage');

    // ---------- I. construction integrity ----------
    const integ = (spec) => expectThrow(() => T.createTrajectoryRegistry(spec), T.RegistryIntegrityError,
                                        'REGISTRY_INTEGRITY');
    check('I1', () => integ({ records: [REC(42, 'H'), REC(42, 'S')], heldOut: [] }),
        'two studies sharing a source without an authorization cannot be recorded');
    check('I2', () => integ({ records: [REC(42, 'S'), REC(42 + 2 ** 32, 'S')], heldOut: [] }) &&
        integ({ records: [REC(0, 'S'), REC(1, 'S')], heldOut: [] }),
        'one study cannot record two raw values that share a source');
    check('I3', () => integ({ records: [REC(42, 'H')], heldOut: [], authorizations: [AUTH(42, 'X', 'S')] }) &&
        integ({ records: [REC(42, 'H')], heldOut: [], authorizations: [AUTH(43, 'H', 'S')] }),
        'an authorization must be issued by a study holding that exact value');
    check('I4', () => integ({ records: [REC(42, 'H')], heldOut: [], authorizations: [AUTH(42, 'H', 'H')] }) &&
        integ({ records: [REC(42, 'H'), REC(42, 'S')], heldOut: [],
            authorizations: [AUTH(42, 'H', 'S'), AUTH(42, 'S', 'H')] }),
        'self-authorization and duplicate (including reversed) authorizations are rejected');
    check('I5', () => integ({ records: [REC(42, 'H'), REC(42 + 2 ** 32, 'S')], heldOut: [],
            authorizations: [AUTH(42, 'H', 'S')] }) &&
        integ({ records: [REC(42, 'H', 'development'), REC(42, 'S')], heldOut: [],
            authorizations: [AUTH(42, 'H', 'S')] }),
        'recorded authorized sharing must use the exact value and one category');
    check('I6', () => integ({ records: [REC(42, 'H')], heldOut: [],
            authorizations: [{ ...AUTH(42, 'H', 'S'), namespace: 'config' }] }) &&
        integ({ records: [REC(42, 'H')], heldOut: [], authorizations: [{ ...AUTH(42, 'H', 'S'), extra: 1 }] }),
        'authorization namespace and shape are validated');
    check('I7', () => reg({ records: [REC(42, 'H'), REC(42, 'S')], heldOut: [],
        authorizations: [AUTH(42, 'H', 'S')] }) !== null,
        'CONTROL: a correctly authorized shared source constructs');

    // ---------- N. namespace confusion and raw misuse ----------
    check('N1', () => expectThrow(() => regA.checkUse(cfg(42), U('S-A')), T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        expectThrow(() => regA.checkUse(42, U('S-A')), T.UntypedSeedError, 'UNTYPED_SEED') &&
        expectThrow(() => regA.checkUse({ namespace: 'trajectory', value: 42 }, U('S-A')), T.UntypedSeedError,
            'UNTYPED_SEED') &&
        expectThrow(() => T.streamSeeds(42), T.UntypedSeedError, 'UNTYPED_SEED'),
        'namespace confusion and raw or forged inputs are refused before any decision');
    check('N2', () => {
        const seen = new Set();
        const r = regHS;
        for (const v of [42, 42 + 2 ** 32, 7, 0]) for (const s of ['H', 'S', 'T']) seen.add(decide(r, v, U(s)));
        const allowed = new Set(['AVAILABLE', 'REPRODUCTION', 'AUTHORIZED_REUSE', 'HELD_OUT',
            'CONSUMED_BY_OTHER_STUDY', 'ALIASED_SOURCE', 'CATEGORY_TRANSITION']);
        return [...seen].every(d => allowed.has(d));
    }, 'fail-closed: every outcome is a named decision or a named refusal — never a boolean or an unnamed error');

    // ---------- R. committed state ----------
    check('R1', () => T.TRAJECTORY_AUTHORIZATIONS.length === 0 && T.trajectory.authorizations.length === 0,
        'no cross-study reuse is authorized in the committed registry');
    check('R2', () => JSON.stringify(T.TRAJECTORY_RECORDS) === JSON.stringify(m33Records) &&
        T.TRAJECTORY_HELD_OUT.length === 0,
        'committed trajectory records are byte-for-byte those of M33; no record added, no seed consumed');

    return results;
}

// ---- mutations applied to the R1 module --------------------------------------------
export const R1_MUTANTS = [
    ['RM1 same-study alias treated as reproduction', 'if (aliased.length) {', 'if (false) {'],
    ['RM2 authorization ignored', '!isAuthorized(id.value, r.study, study));', 'true);'],
    ['RM3 authorization not pair-specific',
     '((x.fromStudy === a && x.toStudy === b) || (x.fromStudy === b && x.toStudy === a)));',
     '(x.fromStudy === a || x.fromStudy === b));'],
    ['RM4 authorization covers aliases', 'const unauthorized = other.filter(r => r.value !== id.value ||',
     'const unauthorized = other.filter(r => false ||'],
    ['RM5 authorization bridges categories', 'const involved = [...mine, ...other];', 'const involved = [...mine];'],
    ['RM6 construction accepts unauthorized sharing', '!isAuthorized(ri.value, ri.study, rj.study)) {', 'false) {'],
    ['RM7 construction accepts aliased records in one study', 'if (ri.study === rj.study) {',
     'if (ri.study === rj.study) { continue;'],
    ['RM8 authorization direction one-way', ' || (x.fromStudy === b && x.toStudy === a)));', '));'],
    ['RM9 authorization issuer need not hold the value',
     'if (!records.some(r => r.value === a.value && r.study === a.fromStudy)) {', 'if (false) {'],
    ['RM10 authorized reuse reported as AVAILABLE', ": other.length ? 'AUTHORIZED_REUSE' : 'AVAILABLE'",
     ": 'AVAILABLE'"],
    ['RM11 category rule removed', 'if (involved.some(r => r.status !== category)) {', 'if (false) {'],
    ['RM12 duplicate authorizations accepted',
     'if (authSeen.has(k)) throw new RegistryIntegrityError(`duplicate authorization ${k}`);', ''],
    ['RM13 self-authorization accepted', 'if (a.fromStudy === a.toStudy) {', 'if (false) {'],
    ['RM14 no-op control (semantics unchanged)', 'const AUTH_FIELDS =', 'const AUTH_FIELDS = /* no-op */'],
    // COMBINED mutants: R1 gave two properties a second, independent guard. Removing one
    // guard is then not a weakening (MU19, RM4 survive); removing BOTH must be caught.
    ['RM15 both duplicate-record guards removed',
     ['if (seen.has(k)) throw new RegistryIntegrityError(`duplicate record for ${k}`);', ''],
     ['if (ri.study === rj.study) {', 'if (ri.study === rj.study) { continue;']],
    ['RM16 both exact-value authorization guards removed',
     ['const unauthorized = other.filter(r => r.value !== id.value ||', 'const unauthorized = other.filter(r => false ||'],
     ['authorizations.some(x => x.value === value &&', 'authorizations.some(x => (x.value >>> 0) === (value >>> 0) &&']],
];
// A single-guard mutant may survive ONLY when its property keeps a second guard, and the
// combined mutant removing both is caught.
const REDUNDANT = {
    'MU19 duplicate (value, study) records accepted': 'RM15 both duplicate-record guards removed',
    'RM4 authorization covers aliases': 'RM16 both exact-value authorization guards removed',
};
const R1_CONTROL = 'RM14 no-op control (semantics unchanged)';

// ---- main --------------------------------------------------------------------------------
async function main() {
    const { ctx } = await buildContext();
    const rng = ctx.rng;
    const envModule = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
    const m31Data = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m31/data/m31_observations.json'), 'utf8'));
    const draws = (JSON.stringify(m31Data).match(/"(cogDraws|visDraws)":\s*\d+/g) || [])
        .map(s => Number(s.split(':')[1]));
    const m31MaxDraws = Math.max(...draws);
    const M33T = await loadTyped(git('show', `${M33_COMMIT}:${TYPED_PATH}`), 'm33-commit');
    const m33Records = JSON.parse(JSON.stringify(M33T.TRAJECTORY_RECORDS));

    const target = git('log', '--diff-filter=A', '--format=%H', '--', SELF_PATH).trim().split(/\r?\n/).pop();
    const typedSrc = target ? git('show', `${target}:${TYPED_PATH}`)
                            : fs.readFileSync(path.join(ROOT, TYPED_PATH), 'utf8');
    const T = await loadTyped(typedSrc, 'r1-subject');

    const report = { m33Commit: M33_COMMIT, target: target || null, sections: {} };
    let fails = 0;
    const emit = (section, rows) => {
        report.sections[section] = rows.map(r => ({ ...r, msg: typeof r.msg === 'function' ? r.msg() : r.msg }));
        log(`\n-- ${section} ${'-'.repeat(Math.max(0, 70 - section.length))}`);
        for (const r of report.sections[section]) {
            if (!r.ok) fails++;
            log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(5)} ${r.msg}`);
        }
    };
    const suites = async (Mod) => {
        const env = { rng, m31MaxDraws, m33Records, makeConfig: envModule.makeConfig };
        const m33 = await runSuite(Mod, ctx);
        const r1 = await runSuiteR1(Mod, env);
        return { m33, r1: r1.map(r => ({ ...r, msg: typeof r.msg === 'function' ? r.msg() : r.msg })) };
    };

    log('='.repeat(78));
    log('  M33-R1 — governance ruling: independent verification');
    log('='.repeat(78));
    log(`  subject: typed.js ${target ? 'at ' + target.slice(0, 7) + ' (source-bound)' : 'working tree'}`);

    const real = await suites(T);
    emit('M33 behavioural suite, re-run on the R1 module', real.m33);
    emit('R1 suite', real.r1);

    // protected paths and gate
    const changedSinceM33 = (target ? git('diff', '--name-only', M33_COMMIT, target)
                                    : git('diff', '--name-only', M33_COMMIT)).split(/\r?\n/).filter(Boolean);
    const untracked = target ? [] : git('ls-files', '-o', '--exclude-standard').split(/\r?\n/)
        .filter(f => R1_FILES.includes(f));
    const changedSinceBase = (target ? git('diff', '--name-only', BASE, target)
                                     : git('diff', '--name-only', BASE)).split(/\r?\n/).filter(Boolean);
    const sameAsBase = (p) => git('rev-parse', `${BASE}:${p}`).trim() ===
        (target ? git('rev-parse', `${target}:${p}`).trim() : git('hash-object', path.join(ROOT, p)).trim());
    const protectedFiles = ['experiments/registry/consumed.js', 'experiments/m8/protocol.js',
        'experiments/q1/protocol.js', 'experiments/uqa/protocol.js', 'experiments/uqb/protocol.js',
        'experiments/c1/protocol.js', 'main.js', 'instrumentation/rng.js', 'experiments/m7/env.js',
        'experiments/m7/run.js', 'experiments/m7/arms.js'];
    const { allowlist, current } = importerSets();
    const offenders = gateVerdict(current, allowlist);
    emit('integrity', [
        { id: 'P1', ok: changedSinceM33.every(f => R1_FILES.includes(f)) && untracked.every(f => R1_FILES.includes(f)),
          msg: `since M33 only R1 files changed: ${JSON.stringify([...changedSinceM33, ...untracked])}` },
        { id: 'P2', ok: changedSinceBase.every(f => M33_FILES.includes(f) || R1_FILES.includes(f)) &&
                        !changedSinceBase.some(f => /^(render|experiments\/(c1|uqb|uqa|q1|m8|m7))\/|^main\.js$/.test(f)),
          msg: 'since base no production, C1, UQ-B, UQ-A, Q1, M8 or M7 file changed' },
        { id: 'P3', ok: protectedFiles.every(sameAsBase),
          msg: 'registry, all five protocols, main.js, rng.js and the M7 runtime are byte-identical to base' },
        { id: 'P4', ok: offenders.length === 0,
          msg: `no new raw governance importer: ${JSON.stringify(offenders)}` },
        { id: 'P5', ok: (() => { let n = 0; for (let v = 895000; v <= 895999; v++)
                                   if (T.config.isConsumed(T.configSeed(v))) n++; return n === 0; })(),
          msg: '895000-895999 still unconsumed in the registry (not repaired)' },
    ]);

    // mutations: every M33 mutant still applicable, the R1 re-expression of any that is not,
    // and the R1 mutants (single or combined) — each run against BOTH suites.
    const GOVERNANCE_ERRORS = new Set(['UNTYPED_SEED', 'INVALID_NAMESPACE', 'REGISTRY_INTEGRITY']);
    const REEXPRESS = { 'MU15 category transitions allowed': 'RM11 category rule removed' };
    const specs = [];
    for (const [name, anchor, repl] of M33_MUTANTS) {
        if (typedSrc.includes(anchor)) specs.push({ name, pairs: [[anchor, repl]], control: name === M33_CONTROL });
        else specs.push({ name, pairs: null, reexpressed: REEXPRESS[name] || null });
    }
    for (const m of R1_MUTANTS) {
        const pairs = Array.isArray(m[1]) ? m.slice(1) : [[m[1], m[2]]];
        specs.push({ name: m[0], pairs, control: m[0] === R1_CONTROL });
    }
    const outcome = {};
    let i = 0;
    for (const sp of specs) {
        i++;
        if (!sp.pairs) continue;
        let text = typedSrc, failed;
        const missing = sp.pairs.filter(([a]) => !text.includes(a));
        if (missing.length) { outcome[sp.name] = { harness: `anchor missing: ${missing[0][0].slice(0, 50)}` }; continue; }
        for (const [a, b] of sp.pairs) text = text.replace(a, b);
        let M;
        try { M = await loadTyped(text, `r1-${i}`); }
        catch (e) {
            // A mutant that refuses to construct its own committed registry is caught by the
            // fail-closed load check M0. Any other load error is a harness defect.
            outcome[sp.name] = GOVERNANCE_ERRORS.has(e.code) ? { failed: ['M0'] }
                                                            : { harness: `load: ${e.name} ${e.message.slice(0, 50)}` };
            continue;
        }
        const r = await suites(M);
        outcome[sp.name] = { failed: [...r.m33, ...r.r1].filter(x => !x.ok).map(x => x.id) };
    }
    const mutRows = [];
    report.mutants = [];
    for (const sp of specs) {
        const id = sp.name.split(' ')[0];
        const label = sp.name.slice(sp.name.indexOf(' ') + 1);
        if (!sp.pairs) {
            const o = sp.reexpressed && outcome[sp.reexpressed];
            const ok = !!(o && o.failed && o.failed.length);
            report.mutants.push({ name: sp.name, reexpressedAs: sp.reexpressed, caught: ok, by: o?.failed || [] });
            mutRows.push({ id, ok, msg: `${label} -> anchor gone in R1; ${sp.reexpressed ? 're-expressed as ' + sp.reexpressed + (ok ? ', caught' : ', NOT CAUGHT') : 'NOT RE-EXPRESSED'}` });
            continue;
        }
        const o = outcome[sp.name];
        if (o.harness) {
            report.mutants.push({ name: sp.name, harness: o.harness });
            mutRows.push({ id, ok: false, msg: `${label} -> HARNESS DEFECT ${o.harness}` });
            continue;
        }
        const caught = o.failed.length > 0;
        let ok, msg;
        if (sp.control) { ok = !caught; msg = caught ? `CONTROL WRONGLY FAILED ${o.failed}` : 'no-op control survived'; }
        else if (caught) { ok = true; msg = `caught by ${o.failed.slice(0, 8).join(',')}`; }
        else if (REDUNDANT[sp.name]) {
            const c = outcome[REDUNDANT[sp.name]];
            ok = !!(c && c.failed && c.failed.length);
            msg = `survives because R1 added an independent second guard; ${REDUNDANT[sp.name]} ` +
                  (ok ? `is caught by ${c.failed.slice(0, 6).join(',')}` : 'is NOT caught');
        } else { ok = false; msg = 'SURVIVED'; }
        report.mutants.push({ name: sp.name, control: !!sp.control, caught, by: o.failed.slice(0, 8),
                              redundantWith: REDUNDANT[sp.name] || null });
        mutRows.push({ id, ok, msg: `${label} -> ${msg}` });
    }
    emit('mutation testing', mutRows);

    report.fails = fails;
    report.total = Object.values(report.sections).flat().length;
    report.verdict = fails === 0 ? 'VERIFIED' : 'NOT VERIFIED';
    report.lag = { maxRecordedDraws: m31MaxDraws };
    cleanupTmp();
    if (JSON_MODE) process.stdout.write(JSON.stringify(report));
    else {
        log('\n' + '='.repeat(78));
        log(`  M33-R1 VERIFY: ${report.total - fails}/${report.total} passed, ${fails} FAILED`);
        log(`  VERDICT: ${report.verdict}`);
        log('='.repeat(78));
    }
    process.exit(fails === 0 ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}

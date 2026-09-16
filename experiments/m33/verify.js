// ==========================================================
// M33 — INDEPENDENT VERIFICATION OF THE TYPED-NAMESPACE REGISTRY
// ==========================================================
// Verifies experiments/registry/typed.js against the M32 invariants and against the
// HISTORICAL configuration-seed semantics as they stood at the M33 base commit.
//
// INDEPENDENCE
//   The compatibility oracle is NOT the working-tree consumed.js that typed.js
//   delegates to. It is consumed.js and its whole import chain materialised from
//   the base commit with `git show`, so a later edit to the live registry cannot
//   make NEW agree with OLD by construction.
//
// ANTI-VACUITY
//   Every behavioural check lives in runSuite(T). The suite is run once against the
//   real module (must pass with zero failures) and once per mutant of typed.js (each
//   must produce at least one failure). A mutant whose anchor text is absent aborts
//   the run instead of counting as caught.
//
// This verifier consumes no seed, boots no agent and writes only to a temp dir.
//   node experiments/m33/verify.js           human-readable report, exit 0 iff all pass
//   node experiments/m33/verify.js --json    machine-readable summary on stdout
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const JSON_MODE = process.argv.includes('--json');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

export const BASE = '976904bd03c3bf63ab5db990a4d0f291a65ffecb';
const TYPED_PATH = 'experiments/registry/typed.js';
export const M33_FILES = [
    'experiments/registry/typed.js',
    'experiments/m33/verify.js',
    'research/preregistrations/M33_TYPED_NAMESPACE_REGISTRY.md',
    'research/preregistrations/verify_m33.js',
];
const GOVERNANCE_MODULES = [
    'experiments/registry/consumed.js',
    'experiments/m8/protocol.js', 'experiments/q1/protocol.js', 'experiments/uqa/protocol.js',
    'experiments/uqb/protocol.js', 'experiments/c1/protocol.js',
];

// The gate protects the historical modules AND every later registry link: a study must reach
// them through typed.js, never by importing one directly. GOVERNANCE_MODULES itself stays the
// historical list, because it is also the set materialised from BASE as the compatibility oracle.
const PROTECTED_REGISTRY_MODULES = () => [...GOVERNANCE_MODULES,
    'experiments/registry/consumed_after_c1.js'];

const log = (...a) => { if (!JSON_MODE) console.log(...a); };
// Created on first use, so importing this module (verify_m33.js, verify_r1.js) leaves
// no temp directory behind.
let TMP_DIR = null;
const tmp = () => (TMP_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), 'm33-')));
export const cleanupTmp = () => { if (TMP_DIR) fs.rmSync(TMP_DIR, { recursive: true, force: true }); TMP_DIR = null; };

// ---- helpers ------------------------------------------------------------------
const importSpecifiers = (src) => {
    const out = [];
    for (const re of [/\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*['"]([^'"]+)['"]/g,
                      /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g]) {
        for (const m of src.matchAll(re)) out.push(m[1]);
    }
    return out;
};
const resolveRel = (fromFile, spec) => spec.startsWith('.')
    ? path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec)) : null;

// Materialise a module and every relative module it statically imports, at a commit.
function materialiseAtCommit(commit, entry, dir) {
    const todo = [entry], done = new Set();
    while (todo.length) {
        const f = todo.pop();
        if (done.has(f)) continue;
        done.add(f);
        const src = git('show', `${commit}:${f}`);
        const dest = path.join(dir, f);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, src);
        for (const s of importSpecifiers(src)) {
            const r = resolveRel(f, s);
            if (r && r.endsWith('.js')) todo.push(r);
        }
    }
    return [...done];
}

const expectThrow = (fn, Klass, code) => {
    const SENTINEL = Symbol('no-return');
    let returned = SENTINEL, err = null;
    try { returned = fn(); } catch (e) { err = e; }
    return returned === SENTINEL && err instanceof Klass && err.code === code;
};

// Deterministic LCG for bounded random sampling of predicate INPUTS (not seeds used
// by any run; nothing is consumed by evaluating a predicate).
function* lcg(n, seed) {
    let x = BigInt(seed);
    const M = 2n ** 53n;
    for (let i = 0; i < n; i++) {
        x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n);
        yield Number(x % M);
    }
}

// ---- the behavioural suite ------------------------------------------------------
// T = a typed.js module namespace. OLD = base-commit consumed.js. HIST = base-commit
// protocol modules. rng = instrumentation/rng.js. arms = experiments/m7/arms.js source.
export async function runSuite(T, ctx) {
    const { OLD, HIST, rng, armsMakeRng, c1Frozen, m31Seeds } = ctx;
    const results = [];
    // A condition may be a thunk. A thunk that throws is a FAILED check, never a crashed
    // suite: a mutant must be caught by a named check, not by an escaping exception.
    const check = (id, cond, msg) => {
        let ok;
        try { ok = typeof cond === 'function' ? !!cond() : !!cond; } catch (e) {
            ok = false; msg = `${msg} [threw ${e.code || e.name}]`;
        }
        results.push({ id, ok, msg });
        return ok;
    };
    const cfg = (v) => T.configSeed(v), trj = (v) => T.trajectorySeed(v);
    // Loops that measure before a check runs are guarded the same way.
    const guard = (fn) => { try { return fn(); } catch { return null; } };

    // ---------- C. historical configuration compatibility ----------
    // NEW decisions over the window are computed once per suite; the OLD and historical
    // protocol decisions are precomputed once per process (ctx.vectors).
    const { WINDOW, oldHeld, oldCons, hist } = ctx.vectors;
    const tv = guard(() => {
        const held = new Uint8Array(WINDOW + 1), cons = new Uint8Array(WINDOW + 1);
        for (let v = 0; v <= WINDOW; v++) {
            const id = cfg(v);
            held[v] = T.config.isHeldOut(id) === true ? 1 : T.config.isHeldOut(id) === false ? 0 : 2;
            cons[v] = T.config.isConsumed(id) === true ? 1 : T.config.isConsumed(id) === false ? 0 : 2;
        }
        return { held, cons };
    });
    const c1 = tv && (() => {
        let mHeld = 0, mCons = 0;
        for (let v = 0; v <= WINDOW; v++) {
            if (tv.held[v] !== oldHeld[v]) mHeld++;
            if (tv.cons[v] !== oldCons[v]) mCons++;
        }
        return { mHeld, mCons };
    })();
    const { mHeld, mCons } = c1 || { mHeld: 'threw', mCons: 'threw' };
    check('C1', mHeld === 0 && mCons === 0,
        `exhaustive 0..${WINDOW}: isHeldOut mismatches ${mHeld}, isConsumed mismatches ${mCons}`);

    const bps = new Set([OLD.HELD_OUT_FLOOR]);
    for (const r of OLD.CONSUMED_RANGES) { bps.add(r.lo); bps.add(r.hi); }
    let bpMis = 0, bpN = 0;
    for (const b of bps) for (const d of [-1, 0, 1]) {
        const v = b + d; bpN++;
        if (guard(() => T.config.isHeldOut(cfg(v)) !== OLD.isHeldOut(v) ||
                        T.config.isConsumed(cfg(v)) !== OLD.isConsumed(v)) !== false) bpMis++;
    }
    check('C2', bpMis === 0 && bpN === bps.size * 3 && bps.size > OLD.CONSUMED_RANGES.length,
        `every range endpoint and the floor, +-1: ${bpN} probes, ${bpMis} mismatches`);

    let farMis = 0, farN = 0;
    const far = [-1, -900500, Number.MIN_SAFE_INTEGER, 2 ** 31, 2 ** 32 - 1, 2 ** 32, 2 ** 32 + 896500,
                 20260819000, Number.MAX_SAFE_INTEGER];
    for (const v of [...far, ...lcg(200_000, 33)].flatMap(v => [v, -v])) {
        if (!Number.isSafeInteger(v)) continue;
        farN++;
        if (guard(() => T.config.isHeldOut(cfg(v)) !== OLD.isHeldOut(v) ||
                        T.config.isConsumed(cfg(v)) !== OLD.isConsumed(v)) !== false) farMis++;
    }
    check('C3', farMis === 0 && farN > 400_000,
        `negatives, >= 2^32 and ${farN} bounded samples over the safe integers: ${farMis} mismatches`);

    // Inputs no historical guard accepts must stay unusable.
    const invalid = [896500.5, NaN, Infinity, '896500', null, undefined, 2 ** 53, 2 ** 60];
    const oldRefuses = (v) => { try { HIST.uqb.assertSeedAllowed(v); return false; }
                                catch { return true; } };
    const newRefuses = (v) => expectThrow(() => cfg(v), T.UntypedSeedError, 'UNTYPED_SEED');
    check('C4', () => invalid.every(v => oldRefuses(v) && newRefuses(v)),
        `${invalid.length} historically invalid inputs are refused by the historical guard and ` +
        `cannot become a typed identity`);

    // Every historical study's view is preserved: nothing it protected becomes available.
    const views = { m8: HIST.m8, q1: HIST.q1, uqa: HIST.uqa, uqb: HIST.uqb, c1: HIST.c1 };
    const lost = {};
    for (const [name, P] of Object.entries(views)) {
        if (!tv) { lost[name] = 'threw'; continue; }
        let n = 0;
        const { held, cons } = hist[name];
        for (let v = 0; v <= WINDOW; v++) {
            if (held[v] && tv.held[v] !== 1) n++;
            if (cons[v] && tv.cons[v] !== 1) n++;
        }
        lost[name] = n;
    }
    check('C5', Object.values(lost).every(n => n === 0),
        `no value held-out or consumed in any historical protocol view is available under typed ` +
        `governance: ${JSON.stringify(lost)}`);

    const blockConsumed = {};
    for (const [name, P] of Object.entries(views)) {
        blockConsumed[name] = guard(() => {
            let n = 0;
            for (let v = P.FROZEN.seedLo; v <= P.FROZEN.seedHi; v++) if (T.config.isConsumed(cfg(v))) n++;
            return n;
        });
    }
    check('C6', blockConsumed.m8 === 500 && blockConsumed.q1 === 500 && blockConsumed.uqa === 1000
        && blockConsumed.uqb === 1000,
        `the M8, Q1, UQ-A and UQ-B registered blocks are fully consumed: ${JSON.stringify(blockConsumed)}`);

    const { c1Held, c1Cons } = guard(() => {
        let c1Held = 0, c1Cons = 0;
        for (let v = 895000; v <= 895999; v++) {
            if (T.config.isConsumed(cfg(v))) c1Cons++;
            if (T.config.isHeldOut(cfg(v))) c1Held++;
        }
        return { c1Held, c1Cons };
    }) || { c1Held: 'threw', c1Cons: 'threw' };
    check('C7', c1Cons === 0 && c1Held === 0 && c1Frozen.seedLo === 895000 && c1Frozen.seedHi === 895999,
        `895000-895999 is exactly as before M33: consumed ${c1Cons}/1000, held-out ${c1Held}/1000 ` +
        `(the accounting gap is NOT repaired here)`);

    const { below, above } = guard(() => {
        let below = 0, above = 0;
        for (let v = 880000; v <= 920000; v++) {
            const h = T.config.isHeldOut(cfg(v));
            if (v < 900500 && h) below++;
            if (v >= 900500 && !h) above++;
        }
        return { below, above };
    }) || { below: 'threw', above: 'threw' };
    check('C8', () => below === 0 && above === 0 && T.config.isHeldOut(cfg(900500)) === true &&
        T.config.isHeldOut(cfg(900499)) === false,
        `the >= 900500 configuration held-out protection is intact (0 leaks either side)`);

    const blk = guard(() => T.config.registeredBlock(897000, 897999));
    check('C9', () => blk(cfg(897000)) && blk(cfg(897999)) && !blk(cfg(896999)) && !blk(cfg(898000)) &&
        expectThrow(() => blk(trj(897500)), T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        expectThrow(() => blk(897500), T.UntypedSeedError, 'UNTYPED_SEED'),
        'a typed registered-block predicate matches the protocol convention and refuses ' +
        'foreign and raw seeds');

    // ---------- N. identity and namespace refusal ----------
    check('N1', () => T.config.isHeldOut(cfg(123)) === false && T.config.isConsumed(cfg(123)) === false,
        'case 1: (config,123) -> config predicates answer with booleans');
    const reg = (spec) => { try { return T.createTrajectoryRegistry(spec); } catch { return null; } };
    const empty = reg({ records: [], heldOut: [] });
    check('N2', () => empty.isHeldOut(trj(123)) === false &&
        empty.checkUse(trj(123), { study: 'N2', category: 'development' }).decision === 'AVAILABLE',
        'case 2: (trajectory,123) -> trajectory predicates answer');
    check('N3', () => expectThrow(() => empty.isHeldOut(cfg(123)), T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        expectThrow(() => empty.checkUse(cfg(123), { study: 'N3', category: 'development' }),
                    T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        expectThrow(() => T.streamSeeds(cfg(123)), T.NamespaceRefusal, 'INVALID_NAMESPACE'),
        'case 3: (config,123) -> trajectory predicates REFUSE, returning nothing');
    check('N4', () => expectThrow(() => T.config.isHeldOut(trj(123)), T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        expectThrow(() => T.config.isConsumed(trj(123)), T.NamespaceRefusal, 'INVALID_NAMESPACE'),
        'case 4: (trajectory,123) -> configuration predicates REFUSE, returning nothing');
    check('N5', () => expectThrow(() => T.config.isConsumed(trj(896500)), T.NamespaceRefusal,
                            'INVALID_NAMESPACE') &&
        expectThrow(() => T.trajectory.isHeldOut(cfg(896500)), T.NamespaceRefusal, 'INVALID_NAMESPACE'),
        'case 10: a CONSUMED configuration value handed to the trajectory API is refused, not answered');
    const recReg = reg({ records: [
        { namespace: 'trajectory', value: 555, study: 'N6', status: 'development', executed: true,
          authorization: 'test', artifact: 'test', why: 'test' }], heldOut: [] });
    check('N6', () => expectThrow(() => T.config.isConsumed(trj(555)), T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        recReg.isConsumedByStudy(trj(555), 'N6') === true,
        'case 11: a CONSUMED trajectory seed handed to the configuration API is refused');
    check('N7', () => expectThrow(() => T.trajectory.checkUse(cfg(900600), { study: 'N7', category: 'registered' }),
                            T.NamespaceRefusal, 'INVALID_NAMESPACE') && T.config.isHeldOut(cfg(900600)),
        'case 12: a HELD-OUT configuration value handed to the trajectory API is refused');
    const hoReg = reg({ records: [],
        heldOut: [{ lo: 4000000000, hi: 4000000099, authorization: 'test', why: 'test' }] });
    check('N8', () => hoReg.isHeldOut(trj(4000000050)) === true &&
        expectThrow(() => T.config.isHeldOut(trj(4000000050)), T.NamespaceRefusal, 'INVALID_NAMESPACE'),
        'case 13: a HELD-OUT trajectory seed handed to the configuration API is refused');
    check('N9', () => !T.sameSeed(cfg(123), trj(123)) && T.sameSeed(cfg(123), cfg(123)) &&
        T.config.isHeldOut(cfg(20260819000)) === true &&
        T.trajectory.isHeldOut(trj(20260819000)) === false,
        'case 14: equal numbers across namespaces are distinct identities with independent states');
    const raws = [123, 896500, 900600, 20260819000, '123', null, undefined, {},
                  { namespace: 'config', value: 123 }, { namespace: 'trajectory', value: 123 }];
    const rawRefused = raws.every(r =>
        expectThrow(() => T.config.isHeldOut(r), T.UntypedSeedError, 'UNTYPED_SEED') &&
        expectThrow(() => T.config.isConsumed(r), T.UntypedSeedError, 'UNTYPED_SEED') &&
        expectThrow(() => T.trajectory.isHeldOut(r), T.UntypedSeedError, 'UNTYPED_SEED') &&
        expectThrow(() => T.trajectory.checkUse(r, { study: 'N10', category: 'development' }),
                    T.UntypedSeedError, 'UNTYPED_SEED'));
    check('N10', () => rawRefused,
        `${raws.length} raw or forged inputs (integers, strings, object literals) are refused by every ` +
        `typed predicate; none silently acquires a namespace`);
    let coerce = false;
    try { void (cfg(900600) >= 900500); } catch (e) { coerce = e instanceof TypeError; }
    check('N11', coerce, 'an identity cannot be coerced to a number');
    let oldLoud = false;
    try { OLD.isConsumed(cfg(896500)); } catch (e) { oldLoud = e instanceof TypeError; }
    check('N12', oldLoud, 'an identity handed to the RAW isConsumed fails loudly instead of comparing NaN');
    check('N13', OLD.isHeldOut(cfg(900600)) === false,
        'RESIDUAL, pinned so it cannot be overstated: the RAW isHeldOut returns false for an identity. ' +
        'Only the import gate (I1) keeps new code away from raw predicates');
    const wrongIsNotBool = (() => {
        let v = 'unset';
        try { v = T.config.isHeldOut(trj(900600)); } catch (e) {
            return !(e instanceof T.GovernanceRefusal) && e.code === 'INVALID_NAMESPACE' && v === 'unset';
        }
        return false;
    })();
    check('N14', () => wrongIsNotBool,
        'a namespace refusal is distinguishable from held-out, available, consumed and false');

    // ---------- T. trajectory consumption ----------
    const REC = (value, study, status = 'registered') => ({ namespace: 'trajectory', value, study, status,
        executed: true, authorization: 'verifier fixture', artifact: 'none', why: 'in-memory only' });
    const R = [42, 7000001, 1234567891, 2147483648, 3999999999];       // sparse, non-contiguous
    const C = guard(() => [cfg(10001), cfg(10002), cfg(10003)]) || [];
    const ARMS = ['ARMED', 'ABLATED'];
    let ledger = [];
    const tally = { AVAILABLE: 0, REPRODUCTION: 0, refused: 0 };
    for (const t of R) for (const c of C) for (const arm of ARMS) {
        try {
            const reg = T.createTrajectoryRegistry({ records: ledger, heldOut: [] });
            const d = reg.checkUse(trj(t), { study: 'S-A', category: 'registered', arm, configSeed: c }).decision;
            tally[d]++;
            if (d === 'AVAILABLE') ledger = [...ledger, REC(t, 'S-A')];
        } catch { tally.refused++; }
    }
    check('T1', tally.AVAILABLE === R.length && tally.REPRODUCTION === R.length * (C.length * 2 - 1) &&
        tally.refused === 0,
        `C x R x arm grid (${R.length} sparse seeds x ${C.length} configs x 2 arms): ` +
        `${JSON.stringify(tally)} — one consumption per (seed, study)`);
    const regA = reg({ records: [REC(42, 'S-A')], heldOut: [] });
    check('T2', () => regA.checkUse(trj(42), { study: 'S-A', category: 'registered', configSeed: cfg(10001) })
            .decision === 'REPRODUCTION' &&
        regA.checkUse(trj(42), { study: 'S-A', category: 'registered', configSeed: cfg(10002) })
            .decision === 'REPRODUCTION',
        'cases A/B/5/6: same seed + same study at C1 and at C2 are both permitted');
    check('T3', () => ['ARMED', 'ABLATED'].every(arm =>
        regA.checkUse(trj(42), { study: 'S-A', category: 'registered', arm }).decision === 'REPRODUCTION'),
        'cases C/7/8: same seed + same study serves ARMED and ABLATED as one paired source');
    check('T4', () => expectThrow(() => regA.checkUse(trj(42), { study: 'S-B', category: 'registered' }),
                            T.GovernanceRefusal, 'CONSUMED_BY_OTHER_STUDY'),
        'cases D/9/17: same seed + a different study is REFUSED (M32 §8.3, §12.2 — see M33 §12 conflict)');
    const regAB = reg({ records: [REC(42, 'S-A'), REC(43, 'S-B')], heldOut: [] });
    check('T5', () => regAB.isConsumedByStudy(trj(42), 'S-A') && !regAB.isConsumedByStudy(trj(42), 'S-B') &&
        regAB.isConsumedByStudy(trj(43), 'S-B') && !regAB.isConsumedByStudy(trj(43), 'S-A'),
        'G: consumption records are per study and independent');
    check('T6', () => regA.checkUse(trj(42), { study: 'S-A', category: 'registered' }).decision === 'REPRODUCTION' &&
        regA.checkUse(trj(42), { study: 'S-A', category: 'registered' }).decision === 'REPRODUCTION',
        'case E/16: an intentional rerun inside the same study is REPRODUCTION, repeatably');
    const regDev = reg({ records: [REC(42, 'S-A', 'development')], heldOut: [] });
    check('T7', () => expectThrow(() => regDev.checkUse(trj(42), { study: 'S-A', category: 'registered' }),
                            T.GovernanceRefusal, 'CATEGORY_TRANSITION') &&
        expectThrow(() => regA.checkUse(trj(42), { study: 'S-A', category: 'development' }),
                    T.GovernanceRefusal, 'CATEGORY_TRANSITION'),
        'development and registered uses of one seed cannot be mixed, in either direction');
    check('T8', () => expectThrow(() => hoReg.checkUse(trj(4000000000), { study: 'S-H', category: 'development' }),
                            T.GovernanceRefusal, 'HELD_OUT') &&
        expectThrow(() => hoReg.checkUse(trj(4000000099 + 2 ** 32), { study: 'S-H', category: 'development' }),
                    T.GovernanceRefusal, 'HELD_OUT'),
        'a held-out trajectory seed is refused, including through its value + 2^32 alias');
    check('T9', () => expectThrow(() => T.createTrajectoryRegistry({ records: [REC(4000000010, 'S-X')],
        heldOut: [{ lo: 4000000000, hi: 4000000099, authorization: 't', why: 't' }] }),
        T.RegistryIntegrityError, 'REGISTRY_INTEGRITY') &&
        expectThrow(() => T.createTrajectoryRegistry({ records: [REC(42, 'S-A'), REC(42, 'S-A')], heldOut: [] }),
                    T.RegistryIntegrityError, 'REGISTRY_INTEGRITY'),
        'HELD-OUT ∩ CONSUMED = ∅ and (value, study) uniqueness are asserted at construction');
    check('T10', () => expectThrow(() => regA.checkUse(trj(42), { study: 'S-A', category: 'registered',
        configSeed: trj(10001) }), T.NamespaceRefusal, 'INVALID_NAMESPACE') &&
        expectThrow(() => regA.checkUse(trj(42), { study: 'S-A', category: 'registered', arm: 'A2' }),
                    T.RegistryIntegrityError, 'REGISTRY_INTEGRITY'),
        'the cell descriptor is validated: configSeed must be config-typed, arm must be an arm');

    // Aliasing: proven against the runtime seeding code, not against typed.js's own table.
    const drawsFor = (v) => {
        rng.initRng(v);
        const d = {};
        for (const s of ['cognitive', 'visual', 'environment']) d[s] = [0, 1, 2].map(() => rng.rng(s));
        const sig = armsMakeRng((v ^ 0xBEEF) >>> 0);
        d.sigma = [sig(), sig(), sig()];
        return JSON.stringify(d);
    };
    const A = 20260819000, Aalias = A - 4 * 2 ** 32;
    check('T11', () => Aalias === 3080949816 && drawsFor(A) === drawsFor(Aalias) && drawsFor(A) !== drawsFor(A + 1),
        `RUNTIME FACT: agentSeed ${A} and ${Aalias} seed identical cognitive, visual, environment and ` +
        `sigma streams`);
    const specimen = [0, 1, 7, A, Aalias, 0x5EED, 0x5EEC, 0xBEEF, 0xBEEE, 0x9e3779b9, 0x9e3779b8,
                      -1, 2 ** 32 - 1, 2 ** 40 + 12345];
    // For each specimen, the runtime's stream draws (initRng) must equal draws from a
    // fresh generator seeded with the table's stream seed. makeRng(seed) is itself
    // `(seed >>> 0) || 1`, so the comparison would pass for a table that omitted the
    // `|| 1` step; T14 and the sigma comparison below pin that step separately.
    const tableMatchesRuntime = guard(() => specimen.every(v => {
        const s = T.streamSeeds(trj(v));
        const same = (tableSeed, stream) => {
            rng.initRng(v);
            const runtime = [0, 1, 2].map(() => rng.rng(stream));
            const probe = rng.makeRng(tableSeed);
            return JSON.stringify(runtime) === JSON.stringify([probe(), probe(), probe()]);
        };
        const sig = armsMakeRng((v ^ 0xBEEF) >>> 0), sig2 = rng.makeRng(s.sigma);
        const nonZero = Object.values(s).every(x => x >= 1 && x <= 0xFFFFFFFF);
        return nonZero && same(s.cognitive, 'cognitive') && same(s.visual, 'visual') &&
            same(s.environment, 'environment') &&
            JSON.stringify([sig(), sig()]) === JSON.stringify([sig2(), sig2()]);
    })) === true;
    check('T12', () => tableMatchesRuntime,
        `streamSeeds() reproduces the runtime's four stream seeds for ${specimen.length} specimen values, ` +
        `including every degenerate (seed 0 -> 1) key`);
    check('T13', () => expectThrow(() => T.trajectory.checkUse(trj(Aalias), { study: 'NEW', category: 'registered' }),
                             T.GovernanceRefusal, 'CONSUMED_BY_OTHER_STUDY') &&
        T.trajectory.checkUse(trj(A), { study: 'M7-substrate', category: 'registered' }).decision ===
            'REPRODUCTION',
        'the committed registry refuses the production seed\'s alias to a new study, and still lets the ' +
        'owning lineage reproduce');
    const r01 = reg({ records: [REC(1, 'S-A')], heldOut: [] });
    check('T14', () => expectThrow(() => r01.checkUse(trj(0), { study: 'S-B', category: 'registered' }),
                             T.GovernanceRefusal, 'CONSUMED_BY_OTHER_STUDY'),
        'a partial alias (seeds 0 and 1 share the cognitive stream) is a conflict');

    // ---------- R. committed records ----------
    const recs = T.TRAJECTORY_RECORDS;
    const m31 = recs.filter(r => r.study === 'M31').map(r => r.value).sort((a, b) => a - b);
    const expectM31 = m31Seeds.filter(v => v !== c1Frozen.agentSeed).sort((a, b) => a - b);
    check('R1', () => recs.length === 6 &&
        recs.filter(r => r.study === 'M7-substrate').length === 1 &&
        recs.find(r => r.study === 'M7-substrate').value === c1Frozen.agentSeed &&
        JSON.stringify(m31) === JSON.stringify(expectM31) &&
        recs.every(r => r.executed === true) && T.TRAJECTORY_HELD_OUT.length === 0,
        `committed records are exactly the M32 §13/§17.11 retrospective typing, read from source and data: ` +
        `M7-substrate ${c1Frozen.agentSeed}; M31 ${m31.join(', ')}; no held-out reservation`);
    check('R2', () => recs.every(r => r.status !== 'registered' || r.study === 'M7-substrate'),
        'no new registered trajectory seed is recorded — the only registered record is the frozen ' +
        'production agentSeed');

    return results;
}

// ---- raw-import gate ----------------------------------------------------------
/** file -> the governance modules it statically imports (only files that import one). */
export function governanceImportMap(files, readFile) {
    const map = new Map();
    for (const f of files) {
        if (!/\.(m?js)$/.test(f)) continue;
        let src;
        try { src = readFile(f); } catch { continue; }
        const hits = importSpecifiers(src).map(s => resolveRel(f, s))
            .filter(r => PROTECTED_REGISTRY_MODULES().includes(r));
        if (hits.length) map.set(f, hits);
    }
    return map;
}

export function governanceImporters(files, readFile) {
    const out = [];
    for (const f of files) {
        if (!/\.(m?js)$/.test(f)) continue;
        let src;
        try { src = readFile(f); } catch { continue; }
        const hits = importSpecifiers(src).map(s => resolveRel(f, s))
            .filter(r => PROTECTED_REGISTRY_MODULES().includes(r));
        if (hits.length) out.push(f);
    }
    return out.sort();
}

// A REGISTRY CHAIN LINK is not a consumer: it IS the registry. The chain convention
// (M18, M34) requires each link to import its predecessor, so the link would otherwise be
// reported as a new raw importer. The category is deliberately narrow:
//   * the file must be a registry chain link by path AND name — experiments/registry/consumed*.js;
//   * when the caller supplies an import map, EVERY governance module it imports must itself
//     live in experiments/registry/, so a link may import its predecessor and nothing else.
// A study file is not exempted by moving into experiments/registry/ under another name, and
// no file outside that directory is exempted at all.
export const isRegistryChainLink = (f, hits = null) =>
    /^experiments\/registry\/consumed[A-Za-z0-9_.-]*\.js$/.test(f) &&
    (hits === null || hits.every(h => h.startsWith('experiments/registry/')));

export function gateVerdict(current, allowlist, importMap = null) {
    const permitted = new Set([...allowlist, TYPED_PATH, 'experiments/m33/verify.js']);
    return current.filter(f => !permitted.has(f) &&
        !isRegistryChainLink(f, importMap ? (importMap.get(f) ?? []) : null));
}

export function protectedVerdict(changed) {
    return changed.filter(f => !M33_FILES.includes(f));
}

// ---- mutation harness -------------------------------------------------------------
export const MUTANTS = [
    ['MU1 remove namespace checking',
     'if (x.namespace !== namespace) throw new NamespaceRefusal(namespace, x);', ''],
    ['MU2 collapse config and trajectory namespaces',
     'export const trajectorySeed = (value) => makeIdentity(NAMESPACE.TRAJECTORY, value);',
     'export const trajectorySeed = (value) => makeIdentity(NAMESPACE.CONFIG, value);'],
    ['MU3 wrong-namespace refusal returns false',
     'if (x.namespace !== namespace) throw new NamespaceRefusal(namespace, x);',
     'if (x.namespace !== namespace) return Object.freeze({ namespace, value: -1 });'],
    ['MU4 per-value trajectory consumption',
     'const other = prior.filter(r => r.study !== study);', 'const other = prior;'],
    ['MU5 study removed from the consumption identity',
     'const other = prior.filter(r => r.study !== study);', 'const other = [];'],
    ['MU6 raw integer silently acquires the caller namespace',
     'function requireNamespace(x, namespace) {',
     'function requireNamespace(x, namespace) {\n    if (Number.isInteger(x)) return { namespace, value: x };'],
    ['MU7 weaken the configuration held-out floor',
     'return CONFIG_REGISTRY.isHeldOut(requireNamespace(id, NAMESPACE.CONFIG).value);',
     'const v = requireNamespace(id, NAMESPACE.CONFIG).value; return v >= 900501;'],
    ['MU8 weaken consumed protection',
     'return CONFIG_REGISTRY.isConsumed(requireNamespace(id, NAMESPACE.CONFIG).value);',
     'const v = requireNamespace(id, NAMESPACE.CONFIG).value; return v >= 897000 && CONFIG_REGISTRY.isConsumed(v);'],
    ['MU9 arm becomes part of the consumption identity',
     'const { study, category, arm, configSeed: cfg } = use;',
     'const { category, arm, configSeed: cfg } = use; const study = use.study + (arm ? "#" + arm : "");'],
    ['MU10 configuration becomes part of the consumption identity',
     'const { study, category, arm, configSeed: cfg } = use;',
     'const { category, arm, configSeed: cfg } = use; const study = use.study + (cfg ? "#" + cfg.value : "");'],
    ['MU11 aliasing ignored (raw-value source identity)',
     'return Object.keys(STREAM_XOR).some(k => sa[k] === sb[k]);', 'return a.value === b.value;'],
    ['MU12 degenerate stream seeds not mapped to 1',
     'out[name] = ((v ^ x) >>> 0) || 1;', 'out[name] = ((v ^ x) >>> 0);'],
    ['MU13 held-out not enforced on use',
     "throw new GovernanceRefusal('HELD_OUT', `trajectory seed ${id.value} is held out`);", ''],
    ['MU14 held-out/consumed exclusivity not asserted',
     'throw new RegistryIntegrityError(`value ${r.value} is both held-out and consumed`);', ''],
    ['MU15 category transitions allowed',
     'if (mine.some(r => r.status !== category)) {', 'if (false) {'],
    ['MU16 forged object literals accepted',
     'if (!isSeedIdentity(x) || !NAMESPACES.has(x.namespace)) throw new UntypedSeedError(x);',
     'if (typeof x !== "object" || x === null || !NAMESPACES.has(x.namespace)) throw new UntypedSeedError(x);'],
    ['MU17 identity coercible to a number',
     'throw new TypeError(`a ${namespace} seed identity cannot be coerced to a ` +',
     'return value; void (`a ${namespace} seed identity cannot be coerced to a ` +'],
    ['MU18 held-out checked on raw value, not source',
     'const k = value >>> 0;', 'const k = value;'],
    ['MU19 duplicate (value, study) records accepted',
     'if (seen.has(k)) throw new RegistryIntegrityError(`duplicate record for ${k}`);', ''],
    ['MU20 committed M31 record set altered',
     '20261819003, 20262819003].map(', '20261819003].map('],
    ['MU22 non-integer values accepted as identities',
     'if (!Number.isSafeInteger(value)) {', 'if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {'],
    ['MU21 no-op control (semantics unchanged)',
     'if (!Number.isSafeInteger(value)) {\n        throw new UntypedSeedError(value);\n    }',
     'if (!Number.isSafeInteger(value)) {\n        throw new UntypedSeedError(value);\n    }\n' +
     '    if (false) {}'],
];
// MU21 is a deliberate NO-OP control: it must SURVIVE. A harness in which every mutant
// is "caught" might be catching import failures rather than semantics.
export const EQUIVALENT_CONTROL = 'MU21 no-op control (semantics unchanged)';

// Load a typed.js source text as a module, resolving './consumed.js' to the live registry.
export async function loadTyped(text, tag) {
    const dir = path.join(tmp(), `typed-${tag}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'consumed.js'),
        `export * from ${JSON.stringify(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed.js')).href)};\n`);
    const f = path.join(dir, 'typed.js');
    fs.writeFileSync(f, text);
    return import(pathToFileURL(f).href);
}

export async function buildMutant(src, anchor, replacement, i) {
    if (!src.includes(anchor)) throw new Error(`mutation anchor not found: ${anchor.slice(0, 60)}`);
    return loadTyped(src.replace(anchor, replacement), `mut${i}`);
}

// ---- shared context (exported for experiments/m33/verify_r1.js) --------------------
export async function buildContext() {
    const baseDir = path.join(tmp(), 'base');
    const chain = materialiseAtCommit(BASE, 'experiments/registry/consumed.js', baseDir);
    for (const p of GOVERNANCE_MODULES) materialiseAtCommit(BASE, p, baseDir);
    const imp = (p, dir = baseDir) => import(pathToFileURL(path.join(dir, p)).href);
    const OLD = await imp('experiments/registry/consumed.js');
    const HIST = {
        m8: await imp('experiments/m8/protocol.js'), q1: await imp('experiments/q1/protocol.js'),
        uqa: await imp('experiments/uqa/protocol.js'), uqb: await imp('experiments/uqb/protocol.js'),
        c1: await imp('experiments/c1/protocol.js'),
    };
    const rng = await import(pathToFileURL(path.join(ROOT, 'instrumentation/rng.js')).href);
    const armsSrc = fs.readFileSync(path.join(ROOT, 'experiments/m7/arms.js'), 'utf8');
    const armsImportsMakeRng = /import\s*\{[^}]*\bmakeRng\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/instrumentation\/rng\.js['"]/
        .test(armsSrc) && /makeRng\(\(agentSeed \^ 0xBEEF\) >>> 0\)/.test(armsSrc);
    const m31Data = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m31/data/m31_observations.json'), 'utf8'));
    const m31Seeds = [...new Set(JSON.stringify(m31Data).match(/"agentSeed":\s*\d+/g)
        .map(s => Number(s.split(':')[1])))];
    const WINDOW = 1_000_000;
    const vec = (P) => {
        const held = new Uint8Array(WINDOW + 1), cons = new Uint8Array(WINDOW + 1);
        for (let v = 0; v <= WINDOW; v++) { held[v] = P.isHeldOut(v) ? 1 : 0; cons[v] = P.isConsumed(v) ? 1 : 0; }
        return { held, cons };
    };
    const o = vec(OLD);
    const vectors = { WINDOW, oldHeld: o.held, oldCons: o.cons,
        hist: Object.fromEntries(Object.entries(HIST).map(([k, P]) => [k, vec(P)])) };
    const ctx = { OLD, HIST, rng, armsMakeRng: rng.makeRng, c1Frozen: HIST.c1.FROZEN, m31Seeds, vectors };
    return { ctx, chain, armsImportsMakeRng };
}

export function importerSets() {
    const baseFiles = git('ls-tree', '-r', '--name-only', BASE).split(/\r?\n/).filter(Boolean);
    // Only files whose base content mentions a governance module name can import one.
    const mention = new Set(git('grep', '-l', '-e', 'protocol', '-e', 'consumed', BASE, '--', '*.js', '*.mjs')
        .split(/\r?\n/).filter(Boolean).map(l => l.slice(BASE.length + 1)));
    const allowlist = governanceImporters(baseFiles.filter(f => mention.has(f)),
        f => git('show', `${BASE}:${f}`));
    const nowFiles = git('ls-files', '-co', '--exclude-standard').split(/\r?\n/).filter(Boolean);
    const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const current = governanceImporters(nowFiles, read);
    const currentMap = governanceImportMap(nowFiles, read);
    return { allowlist, current, currentMap };
}

// ---- main ---------------------------------------------------------------------------
async function main() {
    const { ctx, chain, armsImportsMakeRng } = await buildContext();

    const report = { base: BASE, oracleChain: chain.sort(), sections: {} };
    let fails = 0;
    const emit = (section, rows) => {
        report.sections[section] = rows;
        log(`\n-- ${section} ${'-'.repeat(Math.max(0, 70 - section.length))}`);
        for (const r of rows) {
            if (!r.ok) fails++;
            log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(5)} ${r.msg}`);
        }
    };

    log('='.repeat(78));
    log('  M33 — typed-namespace registry: independent verification');
    log('='.repeat(78));
    log(`  oracle: base ${BASE.slice(0, 7)} — ${chain.length} modules materialised with git show`);

    const target = git('log', '--diff-filter=A', '--format=%H', '--', TYPED_PATH).trim().split(/\r?\n/).pop();
    // SOURCE BINDING. This verifier certifies typed.js AS COMMITTED BY M33 (the commit that
    // added it), not whatever typed.js later becomes. M33-R1 changes typed.js and carries
    // its own verifier (experiments/m33/verify_r1.js). Before M33 is committed, the
    // working tree is the only version and is used.
    const typedSrc = target ? git('show', `${target}:${TYPED_PATH}`)
                            : fs.readFileSync(path.join(ROOT, TYPED_PATH), 'utf8');
    const T = await loadTyped(typedSrc, 'bound');
    log(`  subject: typed.js ${target ? 'at ' + target.slice(0, 7) + ' (source-bound)' : 'working tree'}`);
    emit('behavioural suite (real module)', await runSuite(T, ctx));
    emit('runtime binding', [{ id: 'B1', ok: armsImportsMakeRng,
        msg: 'arms.js derives sigma as makeRng((agentSeed ^ 0xBEEF) >>> 0) from instrumentation/rng.js, ' +
             'so T11/T12 test the runtime derivation itself' }]);

    // raw-import gate
    const { allowlist, current, currentMap } = importerSets();
    const offenders = gateVerdict(current, allowlist, currentMap);
    const gateCatches = gateVerdict([...current, 'experiments/future_study/protocol.js'], allowlist)
        .includes('experiments/future_study/protocol.js');
    const typedImportsOnlyConsumed = governanceImporters([TYPED_PATH],
        f => fs.readFileSync(path.join(ROOT, f), 'utf8')).length === 1;
    emit('raw-import gate', [
        { id: 'I1', ok: offenders.length === 0,
          msg: `every file importing a raw governance module is a historical importer at base ` +
               `(${allowlist.length}), an M33 file, or a registry chain link importing only its ` +
               `predecessor; offenders: ${JSON.stringify(offenders)}` },
        { id: 'I2', ok: gateCatches, msg: 'CONTROL: a new raw importer is flagged' },
        { id: 'I3', ok: typedImportsOnlyConsumed && allowlist.length > 30,
          msg: `typed.js is the only new importer; historical importer set is non-trivial (${allowlist.length})` },
    ]);
    report.allowlist = allowlist;

    // protected paths and seed accounting
    const changed = (target
        ? git('diff', '--name-only', BASE, target)
        : git('diff', '--name-only', BASE)).split(/\r?\n/).filter(Boolean);
    const untrackedNew = target ? [] : git('ls-files', '-o', '--exclude-standard').split(/\r?\n/)
        .filter(f => M33_FILES.includes(f));
    const bad = protectedVerdict(changed);
    const sameBlob = (p) => git('rev-parse', `${BASE}:${p}`).trim() ===
        (target ? git('rev-parse', `${target}:${p}`).trim()
                : git('hash-object', path.join(ROOT, p)).trim());
    const protectedSame = [...GOVERNANCE_MODULES, 'main.js', 'instrumentation/rng.js',
        'experiments/m7/env.js', 'experiments/m7/run.js', 'experiments/m7/arms.js'].every(sameBlob);
    emit('protected paths and seed accounting', [
        { id: 'P1', ok: bad.length === 0,
          msg: `${target ? 'commit ' + target.slice(0, 7) : 'working tree'} vs base: only M33 files differ; ` +
               `others: ${JSON.stringify(bad)}` },
        { id: 'P2', ok: protectedSame,
          msg: 'consumed.js, the M8/Q1/UQ-A/UQ-B/C1 protocols, main.js, rng.js and the M7 runtime are ' +
               'byte-identical to base' },
        { id: 'P3', ok: protectedVerdict(['experiments/registry/consumed.js']).length === 1,
          msg: 'CONTROL: an edit to consumed.js would be flagged' },
        { id: 'P4', ok: [...changed, ...untrackedNew].every(f => M33_FILES.includes(f)) &&
                        !changed.some(f => /^(render|experiments\/(c1|uqb|uqa|q1|m8|m7))\//.test(f)),
          msg: 'no production, C1, UQ-B, UQ-A, Q1, M8 or M7 file changed; registered seeds consumed = 0 ' +
               '(no collection path is touched and no run is executed)' },
    ]);
    report.changed = [...changed, ...untrackedNew];
    report.target = target || null;

    // mutation testing
    const src = typedSrc;
    const mutRows = [];
    report.mutants = [];
    for (let i = 0; i < MUTANTS.length; i++) {
        const [name, anchor, repl] = MUTANTS[i];
        const M = await buildMutant(src, anchor, repl, i);
        let failed = [];
        try {
            failed = (await runSuite(M, ctx)).filter(r => !r.ok).map(r => r.id);
        } catch (e) {
            failed = [`threw: ${e.message.slice(0, 80)}`];
        }
        const isControl = name === EQUIVALENT_CONTROL;
        const ok = isControl ? failed.length === 0 : failed.length > 0;
        report.mutants.push({ name, caught: failed.length > 0, by: failed.slice(0, 6), control: isControl });
        mutRows.push({ id: name.split(' ')[0], ok,
            msg: `${name.slice(name.indexOf(' ') + 1)} -> ` +
                 (isControl ? (failed.length ? `CONTROL WRONGLY FAILED ${failed}` : 'no-op control survived')
                            : (failed.length ? `caught by ${failed.slice(0, 6).join(',')}` : 'SURVIVED')) });
    }
    emit('mutation testing', mutRows);

    report.fails = fails;
    report.total = Object.values(report.sections).flat().length;
    report.verdict = fails === 0 ? 'VERIFIED' : 'NOT VERIFIED';
    if (TMP_DIR) fs.rmSync(TMP_DIR, { recursive: true, force: true });
    if (JSON_MODE) {
        process.stdout.write(JSON.stringify(report));
    } else {
        log('\n' + '='.repeat(78));
        log(`  M33 VERIFY: ${report.total - fails}/${report.total} passed, ${fails} FAILED`);
        log(`  VERDICT: ${report.verdict}`);
        log('='.repeat(78));
    }
    process.exit(fails === 0 ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}

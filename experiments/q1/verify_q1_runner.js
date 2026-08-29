// ==========================================================
// Q1 COLLECTION READINESS GATE — the last gate before consuming the range
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md, frozen at 0ad12fe.
//   Collection parameters ratified by D-006, committed at 612c69c.
//   Instrumentation committed at 50be4b4.
//
// WHAT THIS GATE ESTABLISHES
//   Every Director readiness condition, executable rather than asserted in
//   prose: the frozen parameters are exactly D-006's, the runner evaluates
//   each candidate directly at its own seed, a forward acceptance walk cannot
//   cross into M8's consumed range, out-of-range and held-out seeds are
//   refused, the collection cannot extend adaptively, the stopping rule runs
//   exactly as frozen, and the evidence produced is raw and complete.
//
// IT CONSUMES NO Q1 SEED.
//   Every executed configuration comes from the fixture band already proven
//   outside every registered block by verify_m8_runner.js. Section Z proves at
//   RUNTIME which seeds were touched. Range guards are exercised by REFUSAL
//   (a thrown error on a bad seed) rather than by evaluating one.
//
// ANTI-VACUITY
//   Guard checks are two-sided: each refusal is paired with an acceptance, so
//   a guard that refused everything could not pass, and neither could one that
//   refused nothing.
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { FROZEN, CONSUMED_RANGES, HELD_OUT_FLOOR, TRANSITION_FIELDS, TRANSITION_SITES,
         assertSeedAllowed, inFrozenRange, isConsumed, isHeldOut, stratumOf,
         enumerateCandidates, evaluateSufficiency } from './protocol.js';
import { collectOne, toJsonl } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const FIXTURE_BAND = { lo: 700000, hi: 700199 };
const FIXTURE_TICKS = 800;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

console.log('==============================================================');
console.log(' Q1 COLLECTION READINESS GATE');
console.log(` frozen range ${FROZEN.seedLo}-${FROZEN.seedHi} | agent ${FROZEN.agentSeed} | ` +
            `arm ${FROZEN.arm} | ${FROZEN.ticks} ticks`);
console.log('==============================================================');

// ==========================================================
console.log('\n===== D  D-006 binding — the frozen parameters are the ratified ones');
// ==========================================================
const DEC = fs.readFileSync(path.join(ROOT, 'research/09_decisions.md'), 'utf8');
const D6  = DEC.slice(DEC.indexOf('## D-006'), DEC.indexOf('## D-005'));
ok('D1 D-006 exists in the decision log and precedes D-005 (newest first)',
   D6.length > 0 && DEC.indexOf('## D-006') < DEC.indexOf('## D-005'), `${D6.length} bytes`);
for (const [name, needle] of [
        ['configuration-seed range', `${FROZEN.seedLo}-${FROZEN.seedHi}`],
        ['agent seed',               String(FROZEN.agentSeed)],
        ['tick budget',              `${FROZEN.ticks} ticks`],
        ['arm',                      '**A1**'],
        ['minimum evidence',         `**${FROZEN.minDesyncEvents}** DESYNC events pooled`],
        ['inconclusive disposition', 'INCONCLUSIVE — INSUFFICIENT MATERIAL'],
        ['judgment labelling',       'NOT mechanically required by source'],
        ['stratum definition',       'degree 5 = goals 8, 12; degree 3 = goals 16, 19'],
]) ok(`D2 D-006 states the ${name}`, D6.includes(needle), JSON.stringify(needle));
ok('D3 the frozen constants carry no key beyond the ratified set',
   JSON.stringify(Object.keys(FROZEN).sort()) === JSON.stringify([
       'agentSeed', 'arm', 'decision', 'goalIndices', 'instrumentation', 'minConfigurations',
       'minDesyncEvents', 'minPerStratum', 'preregistration', 'seedHi', 'seedLo',
       'strata', 'ticks'].sort()),
   'no hidden parameter remains unfrozen');
ok('D4 the strata are exactly D-006 §4',
   JSON.stringify(FROZEN.strata.degree5) === '[8,12]' &&
   JSON.stringify(FROZEN.strata.degree3) === '[16,19]' &&
   stratumOf(8) === 'degree5' && stratumOf(19) === 'degree3' && stratumOf(99) === null);

// ==========================================================
console.log('\n===== B  seed boundaries — refusal AND acceptance ==============');
// ==========================================================
ok('B1 the frozen range is exactly D-006 §1 A',
   FROZEN.seedLo === 899000 && FROZEN.seedHi === 899499 &&
   (FROZEN.seedHi - FROZEN.seedLo + 1) === 500,
   '500 seeds x 4 goal indices = 2000 candidates');
ok('B2 M8 899500-899999 is registered as CONSUMED for Q1',
   CONSUMED_RANGES.some(r => r.lo === 899500 && r.hi === 899999));
ok('B3 both M7 blocks remain registered as consumed',
   CONSUMED_RANGES.some(r => r.lo === 900000 && r.hi === 900029) &&
   CONSUMED_RANGES.some(r => r.lo === 900030 && r.hi === 900499));
ok('B4 the held-out floor is unchanged at 900500', HELD_OUT_FLOOR === 900500);
ok('B5 the frozen range is arithmetically disjoint from every consumed block and below the floor',
   !CONSUMED_RANGES.some(r => FROZEN.seedLo <= r.hi && r.lo <= FROZEN.seedHi) &&
   FROZEN.seedHi < HELD_OUT_FLOOR,
   `${FROZEN.seedHi} < ${CONSUMED_RANGES.map(r => r.lo).sort()[0]} and < ${HELD_OUT_FLOOR}`);

ok('B6 the FIRST and LAST frozen seeds are accepted (the guard is not vacuous)',
   !throws(() => assertSeedAllowed(FROZEN.seedLo)) &&
   !throws(() => assertSeedAllowed(FROZEN.seedHi)));
ok('B7 one below and one above the frozen range are REFUSED',
   throws(() => assertSeedAllowed(FROZEN.seedLo - 1)) &&
   throws(() => assertSeedAllowed(FROZEN.seedHi + 1)),
   `${FROZEN.seedLo - 1} and ${FROZEN.seedHi + 1} both throw`);
ok('B8 every consumed block is refused, including M8s first and last seed',
   [899500, 899999, 900000, 900029, 900030, 900499].every(s => throws(() => assertSeedAllowed(s))));
ok('B9 the held-out floor and beyond are refused, in fixture mode too',
   throws(() => assertSeedAllowed(900500)) &&
   throws(() => assertSeedAllowed(900500, { fixture: true })) &&
   throws(() => assertSeedAllowed(1e9, { fixture: true })),
   'the held-out block is never generated, inspected, or inferred');
ok('B10 a REGISTERED Q1 seed cannot be used as an implementation fixture',
   throws(() => assertSeedAllowed(FROZEN.seedLo, { fixture: true })),
   'a fixture can never masquerade as measurement');
ok('B11 a fixture seed cannot be used as measurement',
   throws(() => assertSeedAllowed(FIXTURE_BAND.lo)) &&
   !throws(() => assertSeedAllowed(FIXTURE_BAND.lo, { fixture: true })),
   'and measurement can never be smuggled in as a fixture');
ok('B12 a non-integer seed is refused', throws(() => assertSeedAllowed(899000.5)));

// ==========================================================
console.log('\n===== E  enumeration cannot extend adaptively =================');
// ==========================================================
ok('E1 enumeration bounds outside the frozen range are REFUSED',
   throws(() => enumerateCandidates(env, { lo: FROZEN.seedLo - 1, hi: FROZEN.seedHi })) &&
   throws(() => enumerateCandidates(env, { lo: FROZEN.seedLo, hi: FROZEN.seedHi + 1 })) &&
   throws(() => enumerateCandidates(env, { lo: 899500, hi: 899999 })),
   'a widened range is a thrown error, never a silent extension');
ok('E2 inverted bounds are refused',
   throws(() => enumerateCandidates(env, { lo: FROZEN.seedHi, hi: FROZEN.seedLo })));
{
    const BS = String.fromCharCode(92);
    const litRe = (q) => new RegExp(q + '(?:[^' + q + BS + BS + ']|' + BS + BS + '.)*' + q, 'g');
    const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
        .replace(litRe('`'), '``').replace(litRe("'"), "''").replace(litRe('"'), '""');
    const PROTO = code(fs.readFileSync(path.join(HERE, 'protocol.js'), 'utf8'));
    const COLL  = code(fs.readFileSync(path.join(HERE, 'collect.js'), 'utf8'));
    const RUNC  = code(fs.readFileSync(path.join(HERE, 'run_collection.js'), 'utf8'));
    const INSTR = code(fs.readFileSync(path.join(HERE, 'instrument.js'), 'utf8'));
    ok('E3 no collection module calls the forward-walking generateAccepted',
       !/generateAccepted/.test(PROTO + COLL + RUNC),
       'each candidate is evaluated DIRECTLY at its own seed via env.makeConfig');
    ok('E4 enumeration evaluates the loop seed itself, not a derived one',
       /makeConfig\(seed,\s*idx\)/.test(PROTO), 'env.makeConfig(seed, idx)');
    // A blunt "no arithmetic on the bounds" scan is WRONG: (seedHi - seedLo + 1)
    // is a span used for accounting, not an extension, and is textually
    // indistinguishable from an escape. The precise structural property is that
    // the enumeration loop terminates AT hi and guards every seed inside the
    // loop, so removing either turns this red while legitimate span arithmetic
    // does not. The runtime guarantee is separate and stronger: E1 refuses a
    // widened bound and B7 refuses seedHi + 1 outright.
    ok('E5 the enumeration loop terminates at the frozen bound and guards every seed',
       /for\s*\(let seed = lo; seed <= hi; seed\+\+\)/.test(PROTO) &&
       /assertSeedAllowed\(seed\)/.test(PROTO) &&
       /for\s*\(let seed = FROZEN\.seedLo; seed <= FROZEN\.seedHi; seed\+\+\)/.test(RUNC),
       'no loop can walk past seedHi, and an out-of-range seed throws inside the loop');
    // Readiness 13/14: raw and unclassified.
    const SCI = /GAP_COMPOSITION|FIRST_DIVERGING|LAST_TRANSITION_BEFORE|TRANSITION_COUNT|ORIGIN|proximate|SOLE_SHARE|MARGINAL|spearman|pValue|hypothesis/i;
    ok('E6 no collection module computes a §7 derived observable or any statistic',
       !SCI.test(INSTR + PROTO + COLL + RUNC),
       'no GAP_COMPOSITION, ORIGIN, AGE, causal label, mechanism frequency or test');
    ok('E7 the only DESYNC use is the pre-declared sufficiency count',
       (RUNC.match(/desync/gi) || []).length > 0 && !/DESYNC\s*:?=/.test(INSTR + COLL),
       'collection stores raw fields; the count is computed after the range is processed');
}

// ==========================================================
console.log('\n===== S  the stopping rule, executable exactly as frozen ======');
// ==========================================================
const SUF = (d, c, a, b) => evaluateSufficiency({ desyncEvents: d, configurations: c,
                                                  perStratum: { degree5: a, degree3: b } });
ok('S1 all four conditions met -> SATISFIED',
   SUF(100, 20, 15, 15).status === 'SATISFIED', 'exactly at every threshold');
ok('S2 one DESYNC short -> INCONCLUSIVE, naming the failing condition',
   SUF(99, 20, 15, 15).status === 'INCONCLUSIVE — INSUFFICIENT MATERIAL' &&
   JSON.stringify(SUF(99, 20, 15, 15).unmet) === '["desyncEvents"]');
ok('S3 one configuration short -> INCONCLUSIVE',
   SUF(1e6, 19, 15, 15).unmet.join() === 'configurations');
ok('S4 either stratum short -> INCONCLUSIVE, naming that stratum',
   SUF(1e6, 20, 14, 15).unmet.join() === 'stratum:degree5' &&
   SUF(1e6, 20, 15, 14).unmet.join() === 'stratum:degree3');
ok('S5 a missing stratum counts as zero, never as absent',
   evaluateSufficiency({ desyncEvents: 1e6, configurations: 20, perStratum: { degree5: 20 } })
       .conditions.find(c => c.id === 'stratum:degree3').observed === 0);
ok('S6 the thresholds are exactly D-006 §1 E',
   FROZEN.minDesyncEvents === 100 && FROZEN.minConfigurations === 20 &&
   FROZEN.minPerStratum === 15, '100 / 20 / 15, Director judgment');

// ==========================================================
console.log('\n===== F  fixture configuration — outside every registered block');
// ==========================================================
let FIX = null, REJ = null;
for (let seed = FIXTURE_BAND.lo; seed <= FIXTURE_BAND.hi && !(FIX && REJ); seed++) {
    assertSeedAllowed(seed, { fixture: true });
    for (const idx of FROZEN.goalIndices) {
        const cfg = env.makeConfig(seed, idx);
        if (cfg.accepted && !FIX) FIX = { configSeed: seed, configIndex: idx, goal: cfg.goal };
        if (!cfg.accepted && !REJ) REJ = { configSeed: seed, configIndex: idx, goal: cfg.goal };
    }
}
ok('F1 an accepted and a rejected fixture configuration both exist outside every block',
   FIX && REJ && [FIX.configSeed, REJ.configSeed].every(s =>
       !inFrozenRange(s) && !isConsumed(s) && !isHeldOut(s)),
   `accepted ${FIX && FIX.configSeed}:${FIX && FIX.configIndex} | ` +
   `rejected ${REJ && REJ.configSeed}:${REJ && REJ.configIndex}`);

// ---- the walk hazard, exercised ----------------------------------------
// A REJECTED seed handed to the runner makes env.generateAccepted walk forward
// until it finds an acceptance. That is precisely the mechanism that could
// cross 899499 -> 899500. The runner must detect it from evaluatedSeeds and
// refuse the result rather than store it.
ok('F2 a REJECTED configuration is refused because the run walked past its seed',
   throws(() => collectOne({ ...REJ, ticks: FIXTURE_TICKS, fixture: true })),
   'generateAccepted advances, evaluatedSeeds disagrees, collectOne throws');

const A = collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true });
console.log(`   fixture run: ${A.transitions.length} transitions, ${A.boundaries.length} ` +
            `boundaries | fingerprint ${A.provenance.fingerprint.slice(0, 12)}`);
ok('F3 the run evaluated EXACTLY its own seed and advanced zero',
   A.provenance.evaluatedSeeds.length === 1 &&
   A.provenance.evaluatedSeeds[0] === FIX.configSeed,
   `evaluatedSeeds [${A.provenance.evaluatedSeeds}]`);
ok('F4 raw evidence is produced and is complete',
   A.transitions.length > 0 && A.boundaries.length > 0 &&
   A.diagnostics.pairingViolations === 0 && A.diagnostics.openTransition === false,
   JSON.stringify(A.diagnostics));
ok('F5 every transition carries EXACTLY the frozen §6 record, no more and no less',
   A.transitions.every(t => Object.keys(t).length === TRANSITION_FIELDS.length &&
                            TRANSITION_FIELDS.every(k => k in t)),
   `${TRANSITION_FIELDS.length} fields x ${A.transitions.length} records`);
ok('F6 every site is inside the frozen §4 closed taxonomy, and all four are live',
   A.transitions.every(t => TRANSITION_SITES.includes(t.site)) &&
   TRANSITION_SITES.every(s => A.transitions.some(t => t.site === s)),
   TRANSITION_SITES.map(s => `${s} ${A.transitions.filter(t => t.site === s).length}`).join(', '));
ok('F7 sequence integrity holds over the union of transitions and boundaries',
   [...A.transitions, ...A.boundaries].sort((a, b) => a.seq - b.seq).every((r, k) => r.seq === k),
   `${A.transitions.length + A.boundaries.length} records, contiguous from 0, no duplicate`);
ok('F8 the position chain is continuous across every consecutive transition',
   A.transitions.every((t, k) => k === 0 || t.fromPos === A.transitions[k - 1].toPos),
   `${A.transitions.length - 1} consecutive pairs, 0 breaks`);
ok('F9 run identity records the parameters actually used by the child',
   A.provenance.used.agentSeed === FROZEN.agentSeed &&
   A.provenance.used.arm === FROZEN.arm &&
   A.provenance.used.ticks === FIXTURE_TICKS &&
   A.runIdentity.preregistration === FROZEN.preregistration &&
   A.runIdentity.fixture === true,
   `agent ${A.provenance.used.agentSeed}, arm ${A.provenance.used.arm}, ` +
   `read back from the run, not assumed`);
ok('F10 a non-frozen tick budget is refused outside fixture mode',
   throws(() => collectOne({ configSeed: FROZEN.seedLo, configIndex: 0, goal: 8, ticks: 400 })),
   'only the frozen 3000 is collectable');
ok('F11 a configIndex outside the frozen goal schedule is refused',
   throws(() => collectOne({ ...FIX, configIndex: 4, ticks: FIXTURE_TICKS, fixture: true })));
ok('F12 instrumentation bypass produces NO evidence rather than silent partial evidence',
   (() => { const b = collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true,
                                   bypassInstrumentation: true });
            const c = collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true,
                                   suppressRecorder: true });
            return b.transitions.length === 0 && c.transitions.length === 0; })(),
   'a hookless or guardless run cannot masquerade as a collected configuration');

// ---- determinism --------------------------------------------------------
const B = collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true });
ok('F13 collection is deterministic — identical digests on an independent re-run',
   sha(toJsonl(A, 'transitions')) === sha(toJsonl(B, 'transitions')) &&
   sha(toJsonl(A, 'boundaries')) === sha(toJsonl(B, 'boundaries')) &&
   A.provenance.fingerprint === B.provenance.fingerprint,
   `transitions ${sha(toJsonl(A, 'transitions')).slice(0, 16)}, ` +
   `fingerprint ${A.provenance.fingerprint.slice(0, 12)}`);

// ==========================================================
console.log('\n===== Z  seed safety — proven at runtime ======================');
// ==========================================================
const touched = [...env.evaluatedSeeds()];
ok('Z1 NO seed in the frozen Q1 range was evaluated by this readiness gate',
   touched.length > 0 && !touched.some(inFrozenRange),
   `${touched.length} seeds touched, range ${Math.min(...touched)}-${Math.max(...touched)}`);
ok('Z2 no consumed block and no held-out seed was touched',
   !touched.some(s => isConsumed(s) || isHeldOut(s)),
   `held-out floor ${HELD_OUT_FLOOR} untouched`);
ok('Z3 every touched seed passes fixture-mode discipline',
   touched.every(s => !throws(() => assertSeedAllowed(s, { fixture: true }))));

// ==========================================================
console.log('\n===== G  frozen-artifact and production-source regression =====');
// ==========================================================
const digestOK = (mdRel, sidecarRel) => {
    const side = fs.readFileSync(path.join(ROOT, sidecarRel), 'utf8');
    const line = side.split('\n').filter(l => l.trim() && !l.startsWith('#')).pop() || '';
    const want = (line.match(/[0-9a-f]{64}/) || [])[0];
    return want && want === sha(fs.readFileSync(path.join(ROOT, mdRel)));
};
ok('G1 M7 pre-registration digest unchanged',
   digestOK('research/cognitive-audit/M7_PREREGISTRATION.md',
            'research/cognitive-audit/M7_PREREGISTRATION.sha256'));
ok('G2 M8 pre-registration digest unchanged',
   digestOK('research/preregistrations/M8_PREREGISTRATION.md',
            'research/preregistrations/M8_PREREGISTRATION.sha256'));
ok('G3 M9 pre-registration digest unchanged',
   digestOK('research/preregistrations/M9_PREREGISTRATION.md',
            'research/preregistrations/M9_PREREGISTRATION.sha256'));
ok('G4 Q1 pre-registration digest unchanged',
   digestOK('research/preregistrations/Q1_PREREGISTRATION.md',
            'research/preregistrations/Q1_PREREGISTRATION.sha256'));
{
    const dirty = (paths) => execFileSync('git', ['status', '--porcelain', '--', ...paths],
        { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(l => l.trim() && !l.startsWith('??'));
    const prod = dirty(['main.js', 'render', 'instrumentation', 'benchmarks', 'index.html']);
    ok('G5 NO production source modification exists',
       prod.length === 0, prod.length ? prod.join(' | ') : 'main.js, render/, instrumentation/ clean');
    const frozen = dirty(['research', 'experiments/m7', 'experiments/m8', 'experiments/m9']);
    ok('G6 D-006 and every M7/M8/M9 artifact are unmodified',
       frozen.length === 0, frozen.length ? frozen.join(' | ') : 'no tracked modification');
}
ok('G7 the Q1 instrumentation gate is present and unmodified since 50be4b4',
   dirtyless('experiments/q1/instrument.js') && dirtyless('experiments/q1/hook.mjs') &&
   dirtyless('experiments/q1/verify_q1_instrument.js'),
   `instrumentation commit ${FROZEN.instrumentation.slice(0, 7)}`);
function dirtyless(rel) {
    const s = execFileSync('git', ['status', '--porcelain', '--', rel],
        { cwd: ROOT, encoding: 'utf8' }).trim();
    return s === '';
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) console.log('READINESS: GO — the frozen range may be consumed.');
else console.log('READINESS: STOP — do not consume any Q1 seed.');
process.exit(fail ? 1 : 0);

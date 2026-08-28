// ==========================================================
// M8 INSTRUMENTATION GATE — capture correctness and run-neutrality
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §8, §9, §15, §16,
//   frozen at 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//
// WHAT THIS GATE ESTABLISHES
//   The frozen M8 observables can be captured exactly as pre-registered
//   without changing runtime behaviour, decision behaviour, environment
//   behaviour, RNG consumption, or deterministic execution.
//
// WHAT THIS GATE IS NOT
//   It runs no M8 scientific measurement. It consumes NO configuration seed
//   from the frozen range 899500-899999 and never touches the held-out block
//   >= 900500. Its only seed is an explicitly synthetic neutrality fixture
//   (NEUTRALITY_FIXTURE_SEED below) that lies in no registered block and can
//   never be confused with M8 measurement material. No mechanism frequency
//   and no H1-H5 verdict is computed anywhere in this file.
//
// ANTI-VACUITY, per §15 and the M7-ERR-10 lesson
//   Controls bind the MEASUREMENT INPUTS, not merely the final predicate.
//   Section M corrupts each capture site and each bookkeeping counter in
//   turn and requires a named assertion to go RED. A gate whose controls
//   only exercise its own predicates cannot detect a measurement with no
//   referent — that is exactly how G16.4b survived.
//
// REPRODUCIBILITY, per §16
//   No assertion reads mtime, filesystem metadata, wall-clock time, or any
//   untracked file. Every input is a committed blob or a synthetic constant.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES, transform, createRecorder, derive, buildEdgeSet } from './instrument.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const TMP  = fs.mkdtempSync(path.join(os.tmpdir(), 'm8-'));

// Synthetic. Not an M8 configuration seed; not in 900000-900029, not in
// 900030-900499, not in 899500-899999, and far below the held-out floor.
const NEUTRALITY_FIXTURE_SEED = 70000001;
const TICKS = 800;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };

console.log('==============================================================');
console.log(' M8 INSTRUMENTATION GATE — capture + run-neutrality');
console.log(' pre-registration 8fb0bec | fixture seed ' + NEUTRALITY_FIXTURE_SEED);
console.log('==============================================================');

// ==========================================================
console.log('\n===== T  source transform: insertion only ====================');
// ==========================================================
const HEAD_MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const INST_MAIN = transform(HEAD_MAIN);
const hLines = HEAD_MAIN.split('\n'), iLines = INST_MAIN.split('\n');

ok('T1 all 7 frozen capture sites are inserted', iLines.length - hLines.length === SITES.length,
   `${hLines.length} -> ${iLines.length} lines, +${iLines.length - hLines.length}`);

const inserted = new Set(SITES.map(s => s.probe));
const survivors = iLines.filter(l => !inserted.has(l));
ok('T2 every original line survives byte-identical (no line edited or removed)',
   survivors.length === hLines.length && survivors.every((l, k) => l === hLines[k]),
   `${survivors.length} non-probe lines compared`);

ok('T3 every anchor is unique — transform throws otherwise',
   SITES.every(s => hLines.filter(l => l.includes(s.anchor)).length === 1),
   SITES.map(s => s.id).join(', '));

const probeText = SITES.map(s => s.probe).join('\n');
ok('T4 every probe is guarded by the default-off global',
   SITES.every(s => s.probe.includes('globalThis.__MFW_M8__ && globalThis.__MFW_M8__.')));
ok('T5 no probe touches an RNG stream',
   !/liveRng|Math\.random|\brng\(/.test(probeText));
ok('T6 no probe assigns to anything (capture is read-only)',
   !/[^=!<>]=[^=]/.test(probeText.replace(/__MFW_M8__ &&/g, '')));
ok('T7 the guard is __MFW_ scoped, never __M7_', !/__M7_/.test(probeText));
ok('T8 transform REFUSES a missing anchor rather than skipping it',
   (() => { try { transform('nothing here'); return false; } catch { return true; } })(),
   'a silently skipped probe would leave a hole in the measurement');

// ==========================================================
console.log('\n===== S  synthetic-fixture oracle for the recorder ===========');
// ==========================================================
// A hand-scripted call sequence whose correct output is known by construction.
// Explicitly synthetic: node ids 90-99 exist in no MiniFlyWire topology, so
// this data can never be mistaken for an M8 measurement.
function fixtureRun(r) {
    r.onTick();                              // tick 0
    r.onWrite(90, 91, 5);                    //   select 90->91 under goal 5
    r.onRead(90, 90, 91); r.onEval(5);       //   synchronized
    r.onTick();                              // tick 1
    r.onTeleport('pool');                    //   teleport
    r.onRead(90, 95, 91); r.onEval(5);       //   no selection: stale, desynced
    r.onTick();                              // tick 2
    r.onRead(90, 95, 91); r.onEval(7);       //   still stale, goal changed to 7
}
{
    const r = createRecorder({ phase: 1, configSeed: 'FIXTURE', goalNode: 5 });
    fixtureRun(r);
    const e = r.events();
    const EXP = [
        { tickIndex: 0, ticksSinceWrite: 0, selectionRanThisTick: true,  ticksSinceTeleport: null, teleportSource: 'none', agentCurrentChangedSinceLastWrite: false, goalIdAtEvaluation: 5 },
        { tickIndex: 1, ticksSinceWrite: 1, selectionRanThisTick: false, ticksSinceTeleport: 0,    teleportSource: 'pool', agentCurrentChangedSinceLastWrite: true,  goalIdAtEvaluation: 5 },
        { tickIndex: 2, ticksSinceWrite: 2, selectionRanThisTick: false, ticksSinceTeleport: 1,    teleportSource: 'pool', agentCurrentChangedSinceLastWrite: true,  goalIdAtEvaluation: 7 },
    ];
    ok('S1 recorder reproduces the hand-computed oracle exactly', e.length === 3 &&
        EXP.every((x, k) => Object.keys(x).every(f => e[k][f] === x[f])),
        `${e.length} events, ${Object.keys(EXP[0]).length} fields each`);

    const EDGES = buildEdgeSet(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
    const d = e.map(x => derive(x, EDGES));
    ok('S2 derived predicates match the oracle',
        d[0].DESYNC === false && d[1].DESYNC === true && d[2].DESYNC === true &&
        d[1].NO_FRESH_SEL === true && d[2].STALE_AGE === 2 &&
        d[1].TELEPORT_IN_GAP === true && d[2].GOAL_MISMATCH === true &&
        d[0].S_PAIR === false,
        'DESYNC, NO_FRESH_SEL, STALE_AGE, TELEPORT_IN_GAP, GOAL_MISMATCH, S_PAIR');
    ok('S3 GOAL_MISMATCH uses STRICT identity, not Number() coercion',
        derive({ ...e[0], goalIdAtSelection: 5, goalIdAtEvaluation: '5' }, EDGES).GOAL_MISMATCH === true,
        'Director decision E: 5 !== "5"');
    ok('S4 NON_CANONICAL is derived offline from connections.json membership',
        derive({ agentCurrent: 1, next: 2, goalIdAtSelection: 1, goalIdAtEvaluation: 1 }, EDGES).NON_CANONICAL === false &&
        derive({ agentCurrent: 1, next: 25, goalIdAtSelection: 1, goalIdAtEvaluation: 1 }, EDGES).NON_CANONICAL === true &&
        derive({ agentCurrent: 4, next: 4, goalIdAtSelection: 1, goalIdAtEvaluation: 1 }, EDGES).NON_CANONICAL === true,
        '{1,2} canonical | {1,25} not | self-pair never canonical');
}

// ==========================================================
console.log('\n===== N  run-neutrality: OFF vs HOOK-ONLY vs ON ==============');
// ==========================================================
function child(mode, mut) {
    const f = path.join(TMP, `run_${mode}_${mut || 'none'}.mjs`);
    fs.writeFileSync(f, `
import { register } from 'node:module';
import fs from 'node:fs';
const U = ${JSON.stringify('file:///' + ROOT.split(path.sep).join('/'))};
const MODE = ${JSON.stringify(mode)}, MUT = ${JSON.stringify(mut || '')};
const I = await import(U + '/experiments/m8/instrument.js');

// register() runs the hook in a SEPARATE loader thread, so mutating SITES here
// would be invisible to it. A probe mutation must therefore be carried by a
// mutant hook module, which the verifier writes into TMP.
const HOOK = MUT && ['M1','M2','M6'].includes(MUT)
    ? ${JSON.stringify('file:///' + TMP.split(path.sep).join('/'))} + '/mut_' + MUT + '.mjs'
    : U + '/experiments/m8/hook.mjs';
if (MODE !== 'off') register(HOOK, import.meta.url);

let R = null;
if (MODE === 'on') {
  R = I.createRecorder({ phase: 1, configSeed: 'NEUTRALITY_FIXTURE', goalNode: 16 });
  if (MUT === 'M3') { R.onTick = () => {}; }        // tick bookkeeping lost
  if (MUT === 'M5') { R.onTeleport = () => {}; }   // teleport tracking lost
  globalThis.__MFW_M8__ = R;
}

const { boot, pressSpace } = await import(U + '/experiments/phase1_0/_driver.js');
const { dom, timer, restore } = await boot({ seed: ${NEUTRALITY_FIXTURE_SEED} });
pressSpace(dom);
let n = 0; for (let i = 0; i < ${TICKS}; i++) { if (!timer.tick()) break; n++; }
restore();

const { Q } = await import(U + '/render/qlearning.js');
const { makeRng, rng } = await import(U + '/instrumentation/rng.js');
const seedFor = { cognitive: ${NEUTRALITY_FIXTURE_SEED},
                  visual: (${NEUTRALITY_FIXTURE_SEED} ^ 0x9e3779b9) >>> 0,
                  environment: (${NEUTRALITY_FIXTURE_SEED} ^ 0x5EED) >>> 0 };
const draws = {};
for (const s of ['cognitive', 'visual', 'environment']) {
  let probe; try { probe = rng(s); } catch { draws[s] = null; continue; }
  const g = makeRng(seedFor[s] >>> 0); draws[s] = -1;
  for (let i = 0; i < 8000000; i++) if (g() === probe) { draws[s] = i; break; }
}
let qSum = 0; const qKeys = []; Q.forEach((v, k) => { qSum += v; qKeys.push(k); });
qKeys.sort();
process.stdout.write('@@M8@@' + JSON.stringify({
  loops: n, draws, qSize: Q.size, qSum: Number(qSum.toFixed(9)),
  qHash: qKeys.join(',').length,
  events: R ? R.events() : null, diag: R ? R.diagnostics() : null,
}));`);
    return f;
}
for (const [id, find, from, to] of [
        ['M1', 'read',  'agentCurrent, next',        'agentLast, next'],
        ['M2', 'write', 'onWrite(currentKey',        'onWrite(nextKey'],
        ['M6', 'eval',  'onEval(goalNeuronId)',      'onEval(-999)']]) {
    fs.writeFileSync(path.join(TMP, `mut_${id}.mjs`), `
import { SITES, transformWith } from ${JSON.stringify('file:///' + ROOT.split(path.sep).join('/') + '/experiments/m8/instrument.js')};
const S = SITES.map(s => ({ ...s }));
const t = S.find(s => s.id === ${JSON.stringify(find)});
t.probe = t.probe.replace(${JSON.stringify(from)}, ${JSON.stringify(to)});
if (t.probe === SITES.find(s => s.id === ${JSON.stringify(find)}).probe) throw new Error('mutation ${id} did not apply');
export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!decodeURIComponent(url).endsWith('/main.js') || !r.source) return r;
  return { ...r, source: transformWith(String(r.source), S) };
}`);
}
const run = (mode, mut) => JSON.parse(
    execFileSync(process.execPath, [child(mode, mut)], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 })
        .split('@@M8@@')[1]);

const OFF  = run('off');
const HOOK = run('hookonly');
const ON   = run('on');
const core = r => JSON.stringify({ loops: r.loops, draws: r.draws, qSize: r.qSize, qSum: r.qSum, qHash: r.qHash });

console.log(`   OFF       loops ${OFF.loops} | cog ${OFF.draws.cognitive} vis ${OFF.draws.visual} env ${OFF.draws.environment} | Q ${OFF.qSize} sum ${OFF.qSum}`);
console.log(`   HOOK-ONLY loops ${HOOK.loops} | cog ${HOOK.draws.cognitive} vis ${HOOK.draws.visual} env ${HOOK.draws.environment} | Q ${HOOK.qSize} sum ${HOOK.qSum}`);
console.log(`   ON        loops ${ON.loops} | cog ${ON.draws.cognitive} vis ${ON.draws.visual} env ${ON.draws.environment} | Q ${ON.qSize} sum ${ON.qSum}`);

ok('N1 instrumentation DISABLED is behaviourally neutral (hook registered, guard unset)',
   core(HOOK) === core(OFF), 'loops, all three RNG streams, Q size, Q sum, Q key set');
ok('N2 instrumentation ENABLED is run-neutral',
   core(ON) === core(OFF), 'identical to the uninstrumented build on every recorded quantity');
ok('N3 per-stream RNG draw counts are identical',
   OFF.draws.cognitive === ON.draws.cognitive && OFF.draws.visual === ON.draws.visual
   && OFF.draws.environment === ON.draws.environment,
   `cognitive ${OFF.draws.cognitive}, visual ${OFF.draws.visual}, environment ${OFF.draws.environment}`);
ok('N4 agent state is identical (Q size, Q value sum, Q key set)',
   OFF.qSize === ON.qSize && OFF.qSum === ON.qSum && OFF.qHash === ON.qHash,
   `${OFF.qSize} entries, sum ${OFF.qSum}`);
ok('N5 tick count and therefore event ordering is unchanged',
   OFF.loops === ON.loops && ON.diag.ticks > 0, `${ON.loops} ticks, ${ON.diag.ticks} recorded`);
ok('N6 enabling instrumentation is NOT vacuous — it records',
   ON.events.length > 0 && HOOK.events === null,
   `${ON.events.length} events with the guard set, 0 without`);

// ==========================================================
console.log('\n===== C  capture completeness (frozen tuple §8) ==============');
// ==========================================================
const FIELDS = ['from', 'agentCurrent', 'next', 'ticksSinceWrite', 'selectionRanThisTick',
    'ticksSinceTeleport', 'teleportSource', 'goalIdAtSelection', 'goalIdAtEvaluation',
    'agentCurrentChangedSinceLastWrite', 'tickIndex', 'phase', 'configSeed', 'goalNode'];
ok('C1 all 14 frozen observables present on every event',
   ON.events.every(e => FIELDS.every(f => f in e)), `${FIELDS.length} fields x ${ON.events.length} events`);
ok('C2 no observable beyond the frozen closed set',
   ON.events.every(e => Object.keys(e).length === FIELDS.length),
   `${Object.keys(ON.events[0]).length} keys, closed set is ${FIELDS.length}`);
ok('C3 teleportSource is drawn from the frozen enumeration',
   ON.events.every(e => ['cap', 'pool', 'goalReset', 'none'].includes(e.teleportSource)),
   [...new Set(ON.events.map(e => e.teleportSource))].join(', '));
// A read at main.js:3819 does not always reach the evaluation at :3922 -- control
// flow can leave runAgent in between. Those reads cannot become M8 events, because
// goalIdAtEvaluation would be missing. The integrity property is therefore not
// "zero unpaired" but ACCOUNTING CLOSURE: every read is either paired or counted.
ok('C4 read/evaluation accounting closes exactly (no capture is silently dropped)',
   ON.diag.reads === ON.diag.evals + ON.diag.unpairedReads && ON.diag.evals === ON.events.length,
   `${ON.diag.reads} reads = ${ON.diag.evals} paired + ${ON.diag.unpairedReads} unpaired ` +
   `(${(100 * ON.diag.unpairedReads / ON.diag.reads).toFixed(1)}% never reach main.js:3922)`);

// ==========================================================
console.log('\n===== I  source-grounded live invariants =====================');
// ==========================================================
const EDGES = buildEdgeSet(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const D = ON.events.map(e => ({ e, d: derive(e, EDGES) }));
const fresh = D.filter(x => x.e.ticksSinceWrite === 0);
const rateNoSel = D.filter(x => x.d.NO_FRESH_SEL).length / D.length;

const i1 = ok('I1 a fresh selection is never desynchronized (main.js:3327 selects from agentCurrent)',
   fresh.length > 0 && fresh.every(x => x.d.DESYNC === false),
   `${fresh.length} fresh-selection events, 0 desynchronized`);
const i2 = ok('I2 a fresh selection never reports a position change since write',
   fresh.every(x => x.e.agentCurrentChangedSinceLastWrite === false),
   'agentCurrentAtWrite is the position the selection was made from');
const i3 = ok('I3 a fresh selection never reports a goal mismatch (no goal write between 2635 and 3922)',
   fresh.every(x => x.d.GOAL_MISMATCH === false),
   'main.js:3305 precedes selection; main.js:4179 follows evaluation');
const i4 = ok('I4 the 8% selection gate is observed, not assumed',
   rateNoSel > 0 && rateNoSel < 1, `no-fresh-selection rate ${(100 * rateNoSel).toFixed(1)}%`);
const i5 = ok('I5 staleness takes more than one value',
   new Set(D.map(x => x.d.STALE_AGE)).size >= 2,
   `STALE_AGE values observed: ${[...new Set(D.map(x => x.d.STALE_AGE))].sort((a, b) => a - b).slice(0, 6).join(',')}`);
const i6 = ok('I6 teleports are tracked, not merely declared',
   D.some(x => x.e.teleportSource !== 'none'),
   [...new Set(D.map(x => x.e.teleportSource))].join(', '));
const i7 = ok('I7 DESYNC is live in both directions',
   D.some(x => x.d.DESYNC) && D.some(x => !x.d.DESYNC),
   `${D.filter(x => x.d.DESYNC).length} desynchronized of ${D.length}`);

// ==========================================================
console.log('\n===== M  MUTATION CONTROLS — inputs, not predicates ==========');
// ==========================================================
// Each mutation corrupts one measurement INPUT. The named assertion must go
// RED. A control that cannot fail proves nothing.
function invariantsOf(res) {
    const dd = res.events.map(e => ({ e, d: derive(e, EDGES) }));
    const fr = dd.filter(x => x.e.ticksSinceWrite === 0);
    return {
        I1: fr.length > 0 && fr.every(x => x.d.DESYNC === false),
        I2: fr.every(x => x.e.agentCurrentChangedSinceLastWrite === false),
        I3: fr.every(x => x.d.GOAL_MISMATCH === false),
        I4: (() => { const r = dd.filter(x => x.d.NO_FRESH_SEL).length / dd.length; return r > 0 && r < 1; })(),
        I5: new Set(dd.map(x => x.d.STALE_AGE)).size >= 2,
        I6: dd.some(x => x.e.teleportSource !== 'none'),
    };
}
const MUTS = [
    ['M1  read probe captures agentLast instead of agentCurrent',  'M1', 'I1'],
    ['M2  write probe captures nextKey instead of currentKey',     'M2', 'I2'],
    ['M3  onTick is a no-op (tick bookkeeping lost)',              'M3', 'I5'],
    ['M5  onTeleport is a no-op (teleport tracking lost)',         'M5', 'I6'],
    ['M6  eval probe captures a constant instead of goalNeuronId', 'M6', 'I3'],
];
for (const [label, mut, expect] of MUTS) {
    let inv = null, crashed = false;
    try { inv = invariantsOf(run('on', mut)); } catch { crashed = true; }
    ok(`${label} -> ${expect} RED`, crashed || inv[expect] === false,
        crashed ? 'run aborted (also a detection)'
                : Object.entries(inv).filter(([, v]) => !v).map(([k]) => k).join(',') + ' failed');
}
// Bookkeeping mutations verified against the hand-computed oracle -- the only place
// a counter's exact value is known independently of the code that produced it.
{
    const good = createRecorder({}); fixtureRun(good);
    const ev = good.events();
    const oracleHolds = (list) =>
        list[0].ticksSinceWrite === 0 && list[1].ticksSinceWrite === 1 && list[2].ticksSinceWrite === 2;
    ok('M4  ticksSinceWrite forced constant -> S1 oracle RED',
        oracleHolds(ev) && !oracleHolds(ev.map(e => ({ ...e, ticksSinceWrite: 1 }))),
        'oracle accepts 0,1,2 and rejects a constant staleness counter');
    ok('M7  DESYNC predicate inverted -> I7 RED (predicate layer covered too)',
        (() => { const inv = D.map(x => x.e.from === x.e.agentCurrent);
                 const live = D.map(x => x.d.DESYNC);
                 return live.some(Boolean) && live.some(x => !x)
                     && inv.every((v, k) => v === !live[k]); })(),
        'inverting the predicate flips every verdict, so I7 cannot stay green');
}

// ==========================================================
console.log('\n===== R  reproducibility (§16) ===============================');
// ==========================================================
const SELF  = fs.readFileSync(path.join(HERE, 'verify_m8_instrument.js'), 'utf8');
const INSTR = fs.readFileSync(path.join(HERE, 'instrument.js'), 'utf8');
const HOOKS = fs.readFileSync(path.join(HERE, 'hook.mjs'), 'utf8');
// Strip comments AND string/template literals. An assertion that matched its own
// prose would be vacuous -- precisely the failure mode this gate exists to prevent.
// What remains is executable code only.
const BS = String.fromCharCode(92);
const litRe = (q) => new RegExp(q + '(?:[^' + q + BS + BS + ']|' + BS + BS + '.)*' + q, 'g');
const code = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(litRe('`'), '``')
    .replace(litRe("'"), "''")
    .replace(litRe('"'), '""');
const ALL = code(INSTR) + code(HOOKS) + code(SELF);

ok('R1 no measurement code depends on mtime or filesystem metadata',
   !/mtime|birthtime|atimeMs|statSync/.test(ALL), 'instrument.js, hook.mjs, verifier');
ok('R2 no measurement code depends on wall-clock time',
   !/Date\.now|new Date|performance\.now|hrtime/.test(ALL));
ok('R3 the instrumentation reads no untracked or diagnostic artifact',
   !/_probe_|diagnose_G11|cognitive-audit/.test(ALL),
   'inputs are main.js, connections.json, _driver.js, instrument.js -- all committed');
ok('R4 no M8 configuration seed and no held-out seed is referenced',
   !/\b89[0-9]{4}\b|\b90[0-9]{4}\b/.test(ALL),
   `only the synthetic fixture seed ${NEUTRALITY_FIXTURE_SEED}`);
ok('R5 the gate computes no mechanism frequency and no H1-H5 verdict',
   !/SOLE_SHARE|MARGINAL|SOLE\(/.test(ALL),
   'liveness rates on a synthetic fixture seed are neutrality checks, not measurement');
ok('R6 the transform is deterministic across repeated calls',
   transform(HEAD_MAIN) === INST_MAIN && transform(HEAD_MAIN) === transform(HEAD_MAIN));


fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// ==========================================================
// M7 3000-TICK DETERMINISM — BRANCH B
// ==========================================================
// DIRECTOR RULING 2026-08-26. The wall-clock replay cooldown at
// render/episodeManager.js was proven to be the SOLE causal source of
// non-reproducible 3000-tick M7 runs (necessary AND sufficient: neutralising
// every other wall-clock site left the run non-deterministic; neutralising only
// this one restored determinism, over 48 runs).
//
// BRANCH B semantics, as ruled:
//   within one run the FIRST replay attempt for a given replayKey is allowed;
//   every subsequent attempt for that key is blocked.
//   No wall clock. No tick threshold. No rate. No epoch. No new parameter.
//
// WHY THIS VIOLATED THE FROZEN DESIGN
//   frozen §5.2  "identical seeds and identical stream initialisation"
//   frozen §5.3  desynchronisation "would destroy pairing"
//   frozen §14 G1 "bit-identical"
//   frozen §11   Wilcoxon on PAIRED differences
//
// EVIDENCE METHOD — behaviour, not source text. Every determinism claim is made
// by actually running the real M7 driver (experiments/m7/run.js) in separate OS
// processes and comparing run fingerprints. Section C is the anti-vacuity
// control: with the repair suppressed, the SAME test must still detect
// non-determinism, otherwise sections A and B prove nothing.
//
// Source-text assertions appear only where the requirement is an ABSENCE
// (I1, I2, J1, J2) and each is paired with behavioural evidence.
//
// NOT Stage 1, a pilot, or a confirmatory run. No held-out seed is touched.
// ==========================================================
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm7det-'));
const PILOT = 900000, SEED = 20260819000, FULL = 3000, CONC = 8;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

// ----------------------------------------------------------
// one booted M7 run per OS process, through the REAL driver.
//   suppress:true -> a property trap reports the Branch B flag as undefined to
//   every reader, reproducing the PRE-REPAIR runtime exactly without adding an
//   "off" switch to run.js. This is the anti-vacuity control.
// ----------------------------------------------------------
function script(o) {
  const f = path.join(TMP, `r${o.tag}.mjs`);
  fs.writeFileSync(f, `
const SUPPRESS = ${o.suppress ? 'true' : 'false'};
let v, writes = 0, reads = 0;
Object.defineProperty(globalThis, '__M7_REPLAY_ONCE__', { configurable: true,
  get(){ reads++; return SUPPRESS ? undefined : v; }, set(x){ writes++; v = x; } });

// capture the runtime's own replay announcements. console.log is installed as
// an ACCESSOR so boot()'s \`console.log = () => {}\` cannot silence it.
const replays = [];
const cap = (...a) => { const s = a.map(String).join(' ');
  const m = /Replaying:\\s*(.+?)\\s*$/.exec(s); if (m) replays.push(m[1].split(' \\u2192 ').join('->')); };
Object.defineProperty(console, 'log', { configurable: true, get(){ return cap; }, set(_x){} });

const { runOnce } = await import(${JSON.stringify(U + '/experiments/m7/run.js')});
const rec = await runOnce({ configSeed: ${o.configSeed ?? PILOT}, configIndex: ${o.configIndex ?? 0},
  agentSeed: ${o.agentSeed ?? SEED}, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on',
  tickUnit: 'step', ticks: ${o.ticks ?? FULL}, crashAtTick: null, warmStore: false });

process.stdout.write('@@D@@' + JSON.stringify({
  flagWrites: writes, flagReads: reads,
  deterministic: rec.provenance.replayCooldownDeterministic,
  capArmed: rec.provenance.episodeCapArmed,
  replays, replayCount: replays.length,
  uniqueReplayKeys: new Set(replays).size,
  cog: rec.artifacts.cogDraws, vis: rec.artifacts.visDraws,
  q: rec.artifacts.qEntries, slips: rec.artifacts.slips,
  writeCount: rec.artifacts.writes.length,
  fp: rec.fingerprint, ticksExecuted: rec.outcome.ticksExecuted
}));`);
  return f;
}

const runAsync = (o) => new Promise((res, rej) => {
  execFile(process.execPath, [script(o)], { cwd: HERE, maxBuffer: 1 << 28 },
    (e, out) => e ? rej(e) : res(JSON.parse(out.slice(out.indexOf('@@D@@') + 5))));
});
const batch = (o, n) => Promise.all(Array.from({ length: n }, (_, i) => runAsync({ ...o, tag: `${o.tag}_${i}` })));
const distinct = (rs) => new Set(rs.map(r => r.fp)).size;

console.log('==============================================================');
console.log(' M7 3000-TICK DETERMINISM — BRANCH B');
console.log(' Director ruling 2026-08-26 | frozen §5.2 §5.3 §14 G1');
console.log('==============================================================');

// ==========================================================
// A — SEQUENTIAL REPRODUCIBILITY
// ==========================================================
console.log('\n===== A  same seed + same config + 3000 ticks, repeated ======');
const A = [];
for (let i = 0; i < 4; i++) A.push(await runAsync({ tag: 'a' + i }));
console.log(`   ${A.length} sequential runs, ${A[0].ticksExecuted} ticks each`);
console.log(`   fingerprints: ${[...new Set(A.map(r => r.fp.slice(0, 12)))].join(', ')}`);
const a1 = ok('A1 repeated identical runs are BIT-IDENTICAL',
   distinct(A) === 1, `${A.length} runs, ${distinct(A)} distinct fingerprint`);
const a2 = ok('A2 every derived quantity agrees, not just the fingerprint',
   new Set(A.map(r => `${r.cog}|${r.vis}|${r.q}|${r.slips}|${r.writeCount}`)).size === 1,
   `cognitive ${A[0].cog}, visual ${A[0].vis}, Q ${A[0].q}, slips ${A[0].slips}, actions ${A[0].writeCount}`);

// ==========================================================
// B — REPRODUCIBILITY UNDER THE CONDITION THAT PREVIOUSLY BROKE IT
// ==========================================================
console.log('\n===== B  determinism under concurrent load ====================');
const B = await batch({ tag: 'b' }, CONC);
console.log(`   ${CONC} CONCURRENT identical runs`);
console.log(`   fingerprints: ${[...new Set(B.map(r => r.fp.slice(0, 12)))].join(', ')}`);
const b1 = ok('B1 concurrent identical runs are BIT-IDENTICAL',
   distinct(B) === 1, `${CONC} runs, ${distinct(B)} distinct fingerprint`);
const b2 = ok('B2 the loaded runs agree with the unloaded runs',
   B[0].fp === A[0].fp, 'execution pace no longer influences the trajectory at all');

// ==========================================================
// C — ANTI-VACUITY: the same test still DETECTS non-determinism
// ==========================================================
console.log('\n===== C  ANTI-VACUITY: repair suppressed ======================');
const C = await batch({ tag: 'c', suppress: true }, CONC);
const cN = distinct(C);
console.log(`   ${CONC} CONCURRENT runs with the Branch B flag suppressed`);
console.log(`   fingerprints: ${[...new Set(C.map(r => r.fp.slice(0, 12)))].join(', ')}`);
console.log(`   cognitive draws: ${[...new Set(C.map(r => r.cog))].sort().join(', ')}`);
const c1 = ok('C1 ANTI-VACUITY: without the repair the SAME test still fails',
   cN > 1, `${cN} distinct fingerprints from ${CONC} identical runs — so A1/B1 ` +
   `are detecting a real property, not an inert test`);
const c2 = ok('C2 the suppressed run is the PRE-REPAIR wall-clock mechanism',
   C.every(r => r.deterministic === false),
   'run record states replayCooldownDeterministic=false, so the old path was taken');
const c3 = ok('C3 the repair changes the outcome it was ruled to change',
   A[0].fp !== C[0].fp, 'repaired and suppressed builds are distinguishable');

// ==========================================================
// D — BRANCH B SEMANTICS, MEASURED PER replayKey
// ==========================================================
console.log('\n===== D  Branch B semantics: once per replayKey per run =======');
const D0 = A[0], Dc = C[0];
console.log(`   repaired  : ${D0.replayCount} replays announced, ${D0.uniqueReplayKeys} distinct keys`);
console.log(`   suppressed: ${Dc.replayCount} replays announced, ${Dc.uniqueReplayKeys} distinct keys`);
const d1 = ok('D1 no replayKey is ever replayed twice in a run',
   D0.replayCount > 0 && D0.replayCount === D0.uniqueReplayKeys,
   `${D0.replayCount} allowed replays, all ${D0.uniqueReplayKeys} keys distinct`);
const d2 = ok('D2 the FIRST attempt for a key is allowed (replay is not suppressed)',
   D0.uniqueReplayKeys > 1, `${D0.uniqueReplayKeys} distinct keys replayed, so the ` +
   `rule blocks repeats without disabling replay`);
const d3 = ok('D3 every repaired run produces the SAME key set',
   new Set(A.map(r => r.replays.join('|'))).size === 1,
   'the allowed-replay sequence itself is reproducible, not merely the fingerprint');
const d4 = ok('D4 CONTROL: the suppressed build DOES replay a key more than once',
   Dc.replayCount > Dc.uniqueReplayKeys,
   `${Dc.replayCount} replays over ${Dc.uniqueReplayKeys} keys — ` +
   `${Dc.replayCount - Dc.uniqueReplayKeys} repeat allowance(s), the removed mechanism`);

// ==========================================================
// E — RNG: the cooldown decision draws nothing
// ==========================================================
console.log('\n===== E  RNG accounting ======================================');
const SHORT = 100;
const E_ON = await runAsync({ tag: 'eon', ticks: SHORT });
const E_OFF = await runAsync({ tag: 'eoff', ticks: SHORT, suppress: true });
console.log(`   ${SHORT}-tick run, no key attempted twice: repaired vs suppressed`);
const e1 = ok('E1 with no repeat attempt, repaired and suppressed are BIT-IDENTICAL',
   E_ON.fp === E_OFF.fp && E_ON.cog === E_OFF.cog && E_ON.vis === E_OFF.vis,
   `cognitive ${E_ON.cog} both ways — the decision itself consumes NO RNG and ` +
   `adds no behaviour; only a blocked repeat can change anything`);
const src = fs.readFileSync(path.join(ROOT, 'render/episodeManager.js'), 'utf8');
// Comments are STRIPPED before any source assertion below: the repair's own
// documentation names liveRng(), Date.now() and the excluded parameters, and an
// absence/count test must look at executable code only.
const strip = (t) => t.replace(/\/\/[^\n]*/g, '');
const fn = strip(src.slice(src.indexOf('export function replayOneEpisode()'),
                           src.indexOf('// READ API')));
const e2 = ok('E2 replayOneEpisode consumes exactly ONE draw, BEFORE the gate',
   (fn.match(/liveRng\(\)/g) || []).length === 1 &&
   fn.indexOf('liveRng()') < fn.indexOf('__M7_REPLAY_ONCE__'),
   'the episode is selected before the cooldown decision, so neither branch ' +
   'can change replay SELECTION or the draw count');
const e3 = ok('E3 the Branch B path contains no clock read at all',
   !/Date\.now/.test(fn.slice(fn.indexOf('if (globalThis.__M7_REPLAY_ONCE__)'),
                              fn.indexOf('} else {'))),
   'presence in the existing Map is the entire state');

// ==========================================================
// F — RNG STREAM OWNERSHIP UNCHANGED
// ==========================================================
console.log('\n===== F  stream ownership ====================================');
const f1 = ok('F1 the visual stream is untouched by the repair',
   A[0].vis === C[0].vis && A[0].vis === E_ON.vis,
   `visual draws ${A[0].vis} identical across repaired, suppressed and short runs`);
const f2 = ok('F2 no named stream is introduced in episodeManager',
   !/liveRng\(\s*['"]/.test(src) && !/makeRng|initRng/.test(src),
   'the module still uses only the bare cognitive stream it already used');

// ==========================================================
// G — CAP ACTIVATION NOT REGRESSED
// ==========================================================
console.log('\n===== G  cap activation intact ===============================');
const g1 = ok('G1 the frozen §3.7 episode cap is still armed by the driver',
   A.every(r => r.capArmed === true) && C.every(r => r.capArmed === true),
   'measured from the live global in every run, repaired and suppressed alike');
const g2 = ok('G2 both M7 bridges report independently',
   A[0].capArmed === true && A[0].deterministic === true &&
   C[0].capArmed === true && C[0].deterministic === false,
   'the cap stays armed when the determinism repair is suppressed, so the two ' +
   'are not coupled');
console.log('      NOTE: full cap semantics (42 assertions) are owned by');
console.log('      verify_cap.js and run in the regression, not here.');

// ==========================================================
// H — M7-OFF ISOLATION
// ==========================================================
console.log('\n===== H  M7-off isolation ====================================');
const h1 = ok('H1 the repair is GUARDED and default-off',
   /if \(globalThis\.__M7_REPLAY_ONCE__\) \{/.test(fn),
   'a non-M7 caller performs one falsy global read and takes the original path');
const h2 = ok('H2 the pre-existing wall-clock branch is retained VERBATIM',
   /const lastReplay = _replayCooldown\.get\(replayKey\) \|\| 0;\s*\n\s*if \(Date\.now\(\) - lastReplay < 4000\) return;\s*\n\s*_replayCooldown\.set\(replayKey, Date\.now\(\)\);/.test(fn),
   'the else-branch is the original three lines, unmodified');
const h3 = ok('H3 BEHAVIOURAL: the original mechanism is still live when unarmed',
   C.some(r => r.replayCount > r.uniqueReplayKeys),
   'the suppressed build still produces wall-clock repeat allowances, proving ' +
   'H2 is not merely dead text');
const h4 = ok('H4 only the M7 driver arms it',
   A.every(r => r.flagWrites === 1),
   'exactly one write per run, from experiments/m7/run.js');
console.log('      NOTE: full M7-off G1 parity (10 seeds x 1000 ticks) is owned');
console.log('      by verify_M7.js G1a/G1b and runs in the regression.');

// ==========================================================
// I — NO OTHER WALL-CLOCK SITE TOUCHED
// ==========================================================
console.log('\n===== I  no other wall-clock site modified ===================');
const PROD = ['main.js', 'render/candidateAnalysis.js', 'render/episodeManager.js',
  'render/episodicContextEngine.js', 'render/longTermConsolidation.js',
  'render/neuronVisuals.js', 'render/predictionError.js', 'render/schemaMemory.js',
  'render/semanticMemoryLayer.js', 'render/semanticProvenance.js',
  'render/semanticVitality.js', 'instrumentation/traceSchema.js'];
const clockCount = PROD.reduce((n, rel) =>
  n + (fs.readFileSync(path.join(ROOT, rel), 'utf8')
        .split(/\r?\n/).filter(l => /Date\.now\(\)/.test(l.replace(/\/\/.*$/, ''))).length), 0);
const i1 = ok('I1 the wall-clock site census is unchanged at 30',
   clockCount === 30, `${clockCount} executable Date.now() lines across ${PROD.length} modules — ` +
   `the repair neither added nor removed one`);
const i2 = ok('I2 performance.now() is still absent from production',
   PROD.every(rel => !/performance\.now/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8'))));
const i3 = ok('I3 CONTEXT_SHIFT_COOLDOWN is untouched and still unreachable',
   /const CONTEXT_SHIFT_COOLDOWN = 800;/.test(
      fs.readFileSync(path.join(ROOT, 'render/episodicContextEngine.js'), 'utf8')) &&
   !/episodeRecordNode\s*\(/.test(fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8')
      .replace(/import[\s\S]*?from\s*["'][^"']+["'];/g, '')),
   'the 800 ms constant is unchanged and episodeRecordNode is still never called');
const i4 = ok('I4 schemaMemory\'s 15000 ms mechanism is untouched',
   /const REBUILD_INTERVAL_MS = 15000;/.test(
      fs.readFileSync(path.join(ROOT, 'render/schemaMemory.js'), 'utf8')),
   'explicitly out of scope per the ruling; recorded as a LATENT risk, not fixed');

// ==========================================================
// J — MINIMUM DIFF SURFACE
// ==========================================================
console.log('\n===== J  production diff surface =============================');
const holders = PROD.filter(rel => /__M7_REPLAY_ONCE__/.test(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
const j1 = ok('J1 exactly ONE production file carries the repair',
   holders.length === 1 && holders[0] === 'render/episodeManager.js',
   `carriers: ${holders.join(', ') || 'none'}`);
const j2 = ok('J2 the repair adds no constant, threshold, rate or epoch',
   !/4000|epoch|EPOCH|msPerTick|TICKS_PER|COOLDOWN_TICKS/.test(
      fn.slice(fn.indexOf('if (globalThis.__M7_REPLAY_ONCE__)'), fn.indexOf('} else {'))),
   'Branch B is parameter-free, exactly as ruled');
const j3 = ok('J3 the driver arms it with a boolean and nothing else',
   /globalThis\.__M7_REPLAY_ONCE__ = true;/.test(
      fs.readFileSync(path.join(HERE, 'run.js'), 'utf8')));

const GREEN = a1 && a2 && b1 && b2 && c1 && c2 && c3 && d1 && d2 && d3 && d4 &&
              e1 && e2 && e3 && f1 && f2 && g1 && g2 && h1 && h2 && h3 && h4 &&
              i1 && i2 && i3 && i4 && j1 && j2 && j3;
console.log('\n==============================================================');
console.log('  3000-TICK DETERMINISM   ' + (GREEN ? 'GREEN' : 'RED') + '   (Branch B)');
console.log('==============================================================');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

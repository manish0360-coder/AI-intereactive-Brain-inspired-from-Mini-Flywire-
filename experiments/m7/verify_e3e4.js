// ==========================================================
// M7 — E3 / E4 ARM INTEGRATION VERIFICATION
// ==========================================================
// Proves that arm values actually reach the REAL consumption sites in
// main.js, not merely that arms.js computes them correctly in isolation.
//
//   E3  main.js  "bayesianTrust:"  -> calculateDecisionScore
//   E4  main.js  "aggregateTrust:" -> updateBehavior -> confidence floor
//
// Every run boots the REAL main.js under the headless shim, one OS process
// per run. This is NOT Stage 1, a pilot, or a confirmatory run: the tick
// budget is short and deterministic, no metric is estimated, and nothing is
// persisted as experimental data.
//
// CONSUMPTION IS PROVED TWO WAYS
//   1. delivery — every value crossing the site is recorded and checked
//      against the frozen §4 arm definition;
//   2. consumption — arms that change a value must change the EXECUTED
//      action sequence under an identical seed. A main.js site that ignored
//      the arm layer would produce identical sequences, and is rejected.
// ==========================================================
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from './env.js';
import * as arms from './arms.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

const SEED = 20260819000, TICKS = 80;

function run({ arm = 'OFF', hook = 'on', seed = SEED, ticks = TICKS }) {
  const out = execFileSync(process.execPath, ['_armrun.js'], {
    cwd: HERE, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, ARM: arm, SEED: String(seed), TICKS: String(ticks), HOOK: hook }
  });
  return JSON.parse(out.slice(out.indexOf('@@RESULT@@') + 10));
}

console.log('==============================================================');
console.log(' M7 E3/E4 ARM INTEGRATION VERIFICATION  (not an experiment)');
console.log('==============================================================');
console.log(`      seed ${SEED}, ${TICKS} ticks, one process per run`);

const R = {};
for (const a of ['OFF', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']) R[a] = run({ arm: a });
const OFF_NOHOOK = run({ arm: 'OFF', hook: 'off' });

console.log(String.fromCharCode(10) + "      arm   e3Calls  e3Differ  distinctRaw  distinctDeliv  e4Calls  writes  envDraws");
for (const a of Object.keys(R)) {
  const r = R[a];
  console.log('      ' + a.padEnd(5)
    + String(r.e3Calls).padStart(8) + String(r.e3Differ).padStart(10)
    + String(r.e3DistinctRaw).padStart(13) + String(r.e3DistinctDelivered).padStart(15)
    + String(r.e4Calls).padStart(9) + String(r.writes.length).padStart(8)
    + String(r.envDraws).padStart(10));
}
console.log('      (the e3/e4 arrays are capped 400-call SAMPLES; the Differ and');
console.log('       distinct columns are counted over EVERY call, not the sample.)');

// ---------- I.1 the real sites are reached ----------
console.log('\n-- I.1  both integration sites are actually reached ----------');
ok('I.1a E3 site is reached by the real main.js', R.A1.e3Calls > 0, `${R.A1.e3Calls} calls`);
ok('I.1b E4 site is reached by the real main.js', R.A1.e4Calls > 0, `${R.A1.e4Calls} calls`);
ok('I.1c the E4 aggregate becomes non-null during the run',
   R.A1.e4.some(x => x.raw !== null), 'the confidence-floor route is live, not vacuously null');

// ---------- I.2 per-arm delivery at the real site ----------
console.log('\n-- I.2  delivered values match the frozen §4 definitions -----');
const allBt = (a) => R[a].e3.map(x => x.v);
const allRaw = (a) => R[a].e3.map(x => x.raw);
const allAgg = (a) => R[a].e4.map(x => x.v);
const allAggRaw = (a) => R[a].e4.map(x => x.raw);

// A1 BELIEF — both routes live
ok('I.2-A1 BELIEF: per-edge trust remains live (delivered == raw)',
   R.A1.e3Differ === 0 && R.A1.e3.every(x => x.v === x.raw),
   `${R.A1.e3Calls} calls, 0 differ, ${R.A1.e3DistinctRaw} distinct values preserved`);
ok('I.2-A1b BELIEF: aggregate trust remains live (delivered == raw)',
   R.A1.e4.every(x => x.v === x.raw));

// A2 ABLATION — BOTH routes severed
ok('I.2-A2 ABLATION: bayesianTrust delivered to scoring is exactly 0.5',
   allBt('A2').every(v => v === 0.5) && R.A2.e3DistinctDelivered === 1,
   `${R.A2.e3Calls} calls, ${R.A2.e3DistinctRaw} distinct raw collapsed to ${R.A2.e3DistinctDelivered} delivered value`);
ok('I.2-A2b ABLATION: aggregate trust is exactly null',
   allAgg('A2').every(v => v === null), `${R.A2.e4Calls} calls, all null`);
ok('I.2-A2c ABLATION: the raw aggregate WAS non-null (severing is real, not vacuous)',
   allAggRaw('A2').some(v => v !== null));

// A5 AGGREGATE-ONLY — per-edge severed, aggregate live
ok('I.2-A5 AGGREGATE-ONLY: per-edge route delivers exactly 0.5',
   allBt('A5').every(v => v === 0.5), `${R.A5.e3Calls} calls`);
ok('I.2-A5b AGGREGATE-ONLY: aggregate route remains live (delivered == raw)',
   R.A5.e4.every(x => x.v === x.raw) && allAgg('A5').some(v => v !== null));

// A6 SHUFFLED — trust(sigma(e)), aggregate untouched
const sigma = arms.makeSigma(SEED);
ok('I.2-A6 SHUFFLED: sigma is the verified derangement from agentSeed XOR 0xBEEF',
   new Set(sigma).size === 39 && sigma.every((v, i) => v !== i),
   'bijective, no fixed point');
ok('I.2-A6b SHUFFLED: delivered per-edge trust departs from the raw value',
   R.A6.e3Differ > 0,
   `${R.A6.e3Differ} of ${R.A6.e3Calls} calls differ (${(100 * R.A6.e3Differ / R.A6.e3Calls).toFixed(1)}%), counted over ALL calls`);
ok('I.2-A6d SHUFFLED: the shuffle is substantially active, not incidental',
   R.A6.e3Differ / R.A6.e3Calls > 0.05,
   'guards against a sigma that happens to be near-identity in effect');
ok('I.2-A6c SHUFFLED: aggregate route remains unchanged',
   R.A6.e4.every(x => x.v === x.raw));

// A7 ORACLE — exactly p_e
env.install(env.makeConfig(900000, 0));
let oracleBad = 0, oracleChecked = 0;
for (const x of R.A7.e3) {
  const p = env.trueP(x.from, x.to);
  if (p === null || p === undefined) continue;
  oracleChecked++;
  if (x.v !== p) oracleBad++;
}
ok('I.2-A7 ORACLE: delivered per-edge trust is exactly env.trueP(u,v)',
   oracleBad === 0 && oracleChecked > 0, `${oracleChecked} graph-edge calls, ${oracleBad} mismatches`);
ok('I.2-A7b ORACLE: aggregate route remains live (frozen §4 names no override)',
   R.A7.e4.every(x => x.v === x.raw));
env.disable();

// A3 / A4 must not touch either route
ok('I.2-A3 RANDOM: does not alter E3 or E4',
   R.A3.e3.every(x => x.v === x.raw) && R.A3.e4.every(x => x.v === x.raw));
ok('I.2-A4 FROZEN: does not alter E3 or E4',
   R.A4.e3.every(x => x.v === x.raw) && R.A4.e4.every(x => x.v === x.raw));

// ---------- I.3 consumption: values reach the decision ----------
console.log('\n-- I.3  consumption: delivered values change behaviour -------');
const seq = (a) => JSON.stringify(R[a].writes);
ok('I.3a A2 diverges from A1 (severed trust reaches the decision)',
   seq('A2') !== seq('A1'), 'identical sequences would mean main.js ignored E3/E4');
ok('I.3b A5 diverges from A1 (per-edge severing reaches the decision)',
   seq('A5') !== seq('A1'));
ok('I.3c A6 diverges from A1 (shuffled trust reaches the decision)',
   seq('A6') !== seq('A1'));
ok('I.3d A7 diverges from A1 (oracle trust reaches the decision)',
   seq('A7') !== seq('A1'));
ok('I.3e A2 and A5 diverge from each other (the aggregate route matters)',
   seq('A2') !== seq('A5'), 'isolates E4 from E3');
ok('I.3f A1 is identical to OFF (full belief == pre-M7 trust semantics)',
   seq('A1') === seq('OFF'));

// ---------- I.4 default / OFF equivalence ----------
console.log('\n-- I.4  default and OFF remain the pre-M7 path ---------------');
ok('I.4a OFF with no hook installed reproduces the OFF-with-hook sequence',
   JSON.stringify(OFF_NOHOOK.writes) === JSON.stringify(R.OFF.writes),
   'the guarded expression is inert when nothing is attached');
ok('I.4b no hook installed means the sites are never called',
   OFF_NOHOOK.e3Calls === 0 && OFF_NOHOOK.e4Calls === 0);
ok('I.4c OFF passes both routes through untouched',
   R.OFF.e3.every(x => x.v === x.raw) && R.OFF.e4.every(x => x.v === x.raw));

// the arm layer must not consume environment data merely by existing
const nonOracle = ['OFF', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
ok('I.4d the arm layer consumes NO environment draws',
   nonOracle.every(a => R[a].envDraws === 0) && OFF_NOHOOK.envDraws === 0,
   'E1/E2 are not implemented; only A7 reads p_e, and reading is not drawing');
ok('I.4e even A7 draws nothing (trueP is a read, not a Bernoulli draw)',
   R.A7.envDraws === 0);

// ---------- I.5 ANTI-VACUITY ----------
console.log('\n-- I.5  ANTI-VACUITY: the verifier must reject these ---------');
// The predicates I.2 relies on, restated so mutated evidence can be tested.
const specA2 = (e3, e4) => e3.every(x => x.v === 0.5) && e4.every(x => x.v === null);
const specA5 = (e3, e4) => e3.every(x => x.v === 0.5) && e4.every(x => x.v === x.raw);
const specA6 = (e3) => e3.some(x => x.v !== x.raw);
const specA7 = (e3) => { env.install(env.makeConfig(900000, 0)); const r = e3.every(x => { const p = env.trueP(x.from, x.to); return p === null || p === undefined || x.v === p; }); env.disable(); return r; };

// 1. A2 severing only one route
const a2OnlyEdge = R.A2.e4.map(x => ({ ...x, v: x.raw }));            // aggregate left live
const a2OnlyAgg  = R.A2.e3.map(x => ({ ...x, v: x.raw }));            // per-edge left live
ok('I.5-1 rejects A2 that severs ONLY the per-edge route',
   specA2(R.A2.e3, R.A2.e4) && !specA2(R.A2.e3, a2OnlyEdge), 'frozen §4.1 requires BOTH');
ok('I.5-1b rejects A2 that severs ONLY the aggregate route',
   !specA2(a2OnlyAgg, R.A2.e4));

// 2. A5 leaving live per-edge trust
const a5LiveEdge = R.A5.e3.map(x => ({ ...x, v: x.raw }));
ok('I.5-2 rejects A5 that leaves per-edge trust live',
   specA5(R.A5.e3, R.A5.e4) && !specA5(a5LiveEdge, R.A5.e4));

// 3. A6 preserving edge correspondence
const a6Identity = R.A6.e3.map(x => ({ ...x, v: x.raw }));            // sigma == identity
ok('I.5-3 rejects A6 that preserves edge correspondence',
   specA6(R.A6.e3) && !specA6(a6Identity), 'an identity sigma delivers raw values');

// 4. A7 substituting observed trust instead of p_e
const a7Observed = R.A7.e3.map(x => ({ ...x, v: x.raw }));
ok('I.5-4 rejects A7 that substitutes observed trust instead of p_e',
   specA7(R.A7.e3) && !specA7(a7Observed));

// 5. an arm switch exists but the real main.js site ignores it
const IGNORED = run({ arm: 'A2', hook: 'ignore' });
ok('I.5-5 rejects a main.js site that IGNORES the arm layer',
   !specA2(IGNORED.e3, IGNORED.e4) &&
   JSON.stringify(IGNORED.writes) === JSON.stringify(R.A1.writes),
   'HOOK=ignore: A2 requested, raw delivered, sequence collapses onto A1');
ok('I.5-5b the ignored run is measurably different from the honoured one',
   JSON.stringify(IGNORED.writes) !== JSON.stringify(R.A2.writes),
   'proves I.3a is detecting real consumption');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) console.log('E3/E4 INTEGRATION GREEN.');
process.exit(fail ? 1 : 0);

// ==========================================================
// PHASE 1.0 — MILESTONE 6 (peekTransitionUncertainty) GATE : M6.1 – M6.9
// ==========================================================
// M6 adds a PURE observation path for transition uncertainty so a calibration
// probe cannot change the quantity it is measuring. It changes nothing else.
import * as pe from '../../render/predictionError.js';
import { calculateDecisionScore } from '../../render/scoring.js';
import { initRng, liveRng } from '../../instrumentation/rng.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };
const DECAY = 0.998, FLOOR = 0.005, LR = 0.12;

// seed a reproducible set of edges through the REAL updater
function seedEdges(n = 20, base = 0.40) {
  for (let i = 1; i <= n; i++) pe.updateTransitionUncertainty(i, i + 1, base * (0.2 + 0.8 * i / n));
}
const keyOf = i => [i, i + 1];

// ---------- M6.1 ----------
console.log('── M6.1  peek returns the same value before and after ──');
seedEdges();
const v1 = pe.peekTransitionUncertainty(1, 2);
const v2 = pe.peekTransitionUncertainty(1, 2);
const v3 = pe.peekTransitionUncertainty(1, 2);
ok('M6.1a repeated peeks return an identical value', Object.is(v1, v2) && Object.is(v2, v3), `${v1}`);
// value must equal exactly what the updater wrote (EMA from 0)
const expected = 0 + LR * (0.40 * (0.2 + 0.8 * 1 / 20) - 0);
ok('M6.1b peek returns exactly what updateTransitionUncertainty stored',
   Math.abs(v1 - expected) < 1e-12, `peek ${v1} vs EMA ${expected}`);

// ---------- M6.2 ----------
console.log('\n── M6.2  100,000 peeks change no value and no key ──');
const before2 = Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1)));
for (let n = 0; n < 100000; n++) pe.peekTransitionUncertainty(...keyOf((n % 20) + 1));
const after2 = Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1)));
ok('M6.2a all 20 values unchanged after 100,000 peeks',
   before2.every((v, i) => Object.is(v, after2[i])));
ok('M6.2b no key was created or destroyed', before2.filter(v=>v!==0).length === after2.filter(v=>v!==0).length,
   `${after2.filter(v=>v!==0).length} live keys`);

// ---------- M6.3 ----------
console.log('\n── M6.3  peek consumes no RNG ──');
initRng(4242); const streamA = [...Array(8)].map(() => liveRng());
initRng(4242);
for (let i = 0; i < 1000; i++) pe.peekTransitionUncertainty(1, 2);
const streamB = [...Array(8)].map(() => liveRng());
ok('M6.3  RNG stream position untouched by 1,000 peeks',
   JSON.stringify(streamA) === JSON.stringify(streamB));

// ---------- M6.4 ----------
console.log('\n── M6.4  peek does not alter decision output ──');
const ctx = { transitionBoost:2, qValue:3, reward:4, habitBoost:1, curiosityBoost:2, chainReward:1,
  meaningBoost:1, boredomPenalty:0, curiosityState:3, confidenceState:6, stressState:4, fatigueState:3,
  focusState:2, dangerPenalty:0, selfLoopPenalty:0, bayesianTrust:0.6, dominantDrive:'boredom' };
initRng(7); const scoresClean = [...Array(25)].map(() => calculateDecisionScore(ctx));
initRng(7); const scoresPeeked = [...Array(25)].map(() => {
  for (let i = 1; i <= 20; i++) pe.peekTransitionUncertainty(...keyOf(i));   // full sweep between scores
  return calculateDecisionScore(ctx);
});
ok('M6.4  scores bit-identical with an interleaved full peek sweep',
   JSON.stringify(scoresClean) === JSON.stringify(scoresPeeked));

// ---------- M6.5 ----------
console.log('\n── M6.5  peek alters no counts, posteriors or membership ──');
const snap = k => Array.from({length:20},(_,i)=>`${keyOf(i+1).join('->')}=${pe.peekTransitionUncertainty(...keyOf(i+1))}`).join('|');
const s1 = snap();
for (let i = 0; i < 5000; i++) pe.peekTransitionUncertainty(...keyOf((i % 20) + 1));
const s2 = snap();
ok('M6.5  full key/value snapshot deep-equal across a 5,000-call sweep', s1 === s2);

// ---------- M6.6 ----------
console.log('\n── M6.6  getTransitionUncertainty behaviour UNCHANGED ──');
// (a) source text of the getter is byte-identical to the pre-M6 form
const srcFile = fs.readFileSync(path.join(ROOT, 'render/predictionError.js'), 'utf8');
const getterSrc = srcFile.slice(srcFile.indexOf('export function getTransitionUncertainty'));
const getterBody = getterSrc.slice(0, getterSrc.indexOf('\n}') + 2).replace(/\r/g, '');
const EXPECTED_GETTER = `export function getTransitionUncertainty(fromId, toId) {

    const key = String(fromId) + "->" + String(toId);

    const raw = transitionUncertaintyMap.get(key) || 0;

    // apply slow natural decay on each read
    // prevents uncertainty from being permanent
    // even for transitions that later stabilize
    const decayed = raw * TRANSITION_UNCERTAINTY_DECAY;

    if (decayed < 0.005) {
        transitionUncertaintyMap.delete(key);
        return 0;
    }

    transitionUncertaintyMap.set(key, decayed);

    return decayed;

}`;
ok('M6.6a getter source byte-identical to the pre-M6 form', getterBody.trim() === EXPECTED_GETTER);
// (b) behaviour matches the closed-form prediction raw * DECAY^n, with the floor
const start = pe.peekTransitionUncertainty(5, 6);
const series = [], predicted = [];
for (let n = 1; n <= 6; n++) { series.push(pe.getTransitionUncertainty(5, 6)); predicted.push(start * Math.pow(DECAY, n)); }
ok('M6.6b getter still decays by exactly 0.998 per read',
   series.every((v, i) => Math.abs(v - predicted[i]) < 1e-12), `${series[0].toFixed(6)} … ${series[5].toFixed(6)}`);
// (c) getter still deletes below the floor
pe.updateTransitionUncertainty(90, 91, FLOOR / LR * 1.0002);   // land just above the floor
let reads = 0; while (pe.peekTransitionUncertainty(90, 91) !== 0 && reads < 500) { pe.getTransitionUncertainty(90, 91); reads++; }
ok('M6.6c getter still deletes an entry below the floor', reads > 0 && reads < 500, `destroyed after ${reads} reads`);

// ---------- M6.7 ----------
console.log('\n── M6.7  export surface grew by exactly one name ──');
const exports = Object.keys(pe).sort();
const EXPECTED = ['decayTransitionUncertainties','evaluatePredictionError','generateExpectation',
  'getRollingError','getSemanticExpectationConfidence','getSequenceError','getTransitionUncertainty',
  'peekTransitionUncertainty','recordSemanticExpectationOutcome','resetExpectation',
  'uncertaintyState','updateSequenceError','updateTransitionUncertainty'].sort();
ok('M6.7  predictionError.js exports exactly the pre-M6 set + peekTransitionUncertainty',
   JSON.stringify(exports) === JSON.stringify(EXPECTED), exports.join(','));

// ---------- M6.8 ----------
console.log('\n── M6.8  STATIC GUARD: peek can never enter the decision path ──');
const files = ['main.js', ...fs.readdirSync(path.join(ROOT,'render')).filter(f=>f.endsWith('.js')).map(f=>'render/'+f)];
const offenders = files.filter(rel => {
  if (rel === 'render/predictionError.js') return false;              // its own definition
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').includes('peekTransitionUncertainty');
});
offenders.forEach(o => console.log('      REFERENCED IN: ' + o));
const defCount = (srcFile.match(/peekTransitionUncertainty/g) || []).length;
ok('M6.8a no agent-path file references peek', offenders.length === 0);
ok('M6.8b peek appears in predictionError.js only as its definition (+comment)', defCount <= 3, `${defCount} mentions`);

// ---------- M6.9 ----------
console.log('\n── M6.9  REGRESSION: why the old getter is invalid for calibration ──');
// rebuild a clean 20-edge population
for (let i = 1; i <= 20; i++) { while (pe.peekTransitionUncertainty(i, i+1) !== 0) pe.getTransitionUncertainty(i, i+1); }
seedEdges(20, 0.40);
const liveKeys = () => Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1))).filter(v=>v!==0).length;
const startVals = Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1)));
const keys0 = liveKeys();
// ten calibration sweeps using the GETTER
const sweepsGet = [];
for (let s = 0; s < 10; s++) { for (let i = 1; i <= 20; i++) pe.getTransitionUncertainty(i, i+1);
  sweepsGet.push(pe.peekTransitionUncertainty(1, 2)); }
const afterGet = Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1)));
const keysAfterGet = liveKeys();
const monotoneDown = sweepsGet.every((v, i) => i === 0 || v < sweepsGet[i-1]);
console.log(`      getter sweeps : edge 1->2  ${startVals[0].toFixed(6)} -> ${afterGet[0].toFixed(6)}  (${((1-afterGet[0]/startVals[0])*100).toFixed(2)}% destroyed)`);
console.log(`      live keys     : ${keys0} -> ${keysAfterGet}`);
ok('M6.9a a getter-based sweep monotonically depresses the measured value', monotoneDown);
ok('M6.9b a getter-based sweep changes what it measures', afterGet[0] < startVals[0]);
// ten sweeps using PEEK
seedEdges(20, 0.40);
const beforePeek = Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1)));
const keysB = liveKeys();
for (let s = 0; s < 10; s++) for (let i = 1; i <= 20; i++) pe.peekTransitionUncertainty(i, i+1);
const afterPeek = Array.from({length:20},(_,i)=>pe.peekTransitionUncertainty(...keyOf(i+1)));
ok('M6.9c ten peek sweeps leave all 20 values and the key count identical',
   beforePeek.every((v,i)=>Object.is(v,afterPeek[i])) && keysB === liveKeys());
// M6.9d — demonstrate the DIFFERENTIAL deletion the narrative claims, rather
// than merely asserting it. Seed a spread spanning the floor and sweep with get().
for (let i = 40; i <= 59; i++) { while (pe.peekTransitionUncertainty(i, i+1) !== 0) pe.getTransitionUncertainty(i, i+1); }
const LOW = [], HIGH = [];
for (let i = 0; i < 10; i++) {                       // 10 low-uncertainty (reliable) edges
  pe.updateTransitionUncertainty(40+i, 41+i, 0.045 + i*0.0005); LOW.push([40+i, 41+i]);
}
for (let i = 0; i < 10; i++) {                       // 10 high-uncertainty (unreliable) edges
  pe.updateTransitionUncertainty(50+i, 51+i, 0.80); HIGH.push([50+i, 51+i]);
}
const alive = pairs => pairs.filter(([a,b]) => pe.peekTransitionUncertainty(a,b) !== 0).length;
const lowBefore = alive(LOW), highBefore = alive(HIGH);
for (let s = 0; s < 40; s++) [...LOW, ...HIGH].forEach(([a,b]) => pe.getTransitionUncertainty(a,b));
const lowAfter = alive(LOW), highAfter = alive(HIGH);
console.log(`      differential deletion after 40 getter sweeps:`);
console.log(`        low-uncertainty  (reliable) edges alive: ${lowBefore} -> ${lowAfter}`);
console.log(`        high-uncertainty (unreliable) edges alive: ${highBefore} -> ${highAfter}`);
ok('M6.9d a getter sweep destroys the LOW-uncertainty (reliable) edges and spares the high ones',
   lowAfter < lowBefore && highAfter === highBefore,
   `${lowBefore-lowAfter} reliable edges lost, ${highBefore-highAfter} unreliable lost`);
// and peek must not do this
for (let i = 0; i < 10; i++) pe.updateTransitionUncertainty(40+i, 41+i, 0.045 + i*0.0005);
const lowPeekBefore = alive(LOW);
for (let s = 0; s < 40; s++) [...LOW, ...HIGH].forEach(([a,b]) => pe.peekTransitionUncertainty(a,b));
ok('M6.9e the same 40 sweeps via peek destroy nothing', alive(LOW) === lowPeekBefore,
   `${lowPeekBefore} -> ${alive(LOW)}`);
console.log('      => calibration via get() would truncate exactly one tail of the');
console.log('         distribution under study, in a direction known in advance.');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

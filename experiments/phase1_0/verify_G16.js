// ==========================================================
// M7 PREREQUISITE GATE — G16 : TRUST RECTIFICATION
// ==========================================================
// Verifies the ONE approved source change mandated by the FROZEN
// pre-registration (research/cognitive-audit/M7_PREREGISTRATION.md §13,
// SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9):
//
//     render/scoring.js:184
//       -  Math.max(0, bayesianTrust - 0.5) * 8;
//       +  (bayesianTrust - 0.5) * 8;
//
// Five required properties, per §13.4:
//   G16.1  positive-side magnitude preserved
//   G16.2  negative evidence becomes decision-usable
//   G16.3  no unrelated coefficients change
//   G16.4  modification isolated and auditable
//   G16.5  M1 verify_S1.js and verify_S1b.js remain green
//
// ANTI-VACUITY (§13.6): every assertion that claims to DETECT the repair is
// also run against the pre-change build and MUST FAIL there. A gate that
// passes both before and after the change proves nothing.
//
// The module under test is imported LIVE from ../../render/scoring.js.
// baseline/scoring_prerect.js is a REFERENCE ARM ONLY, never a substitute.
// ==========================================================
import { calculateDecisionScore as ORIG } from './baseline/scoring_prerect.js';
import { calculateDecisionScore as FIX  } from '../../render/scoring.js';
import * as O from './baseline/scoring_prerect.js';
import * as F from '../../render/scoring.js';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const LIVE = path.join(ROOT, 'render', 'scoring.js');
const PRE  = path.join(HERE, 'baseline', 'scoring_prerect.js');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };
const NEAR = (a, b, e = 1e-9) => Math.abs(a - b) < e;

const base = {transitionBoost:0,qValue:0,reward:0,habitBoost:0,curiosityBoost:0,chainReward:0,meaningBoost:0,
 futureBonus:0,boredomPenalty:0,repetitionPenalty:0,localConfidence:0,localStress:0,localFatigue:0,localTrust:0,
 localFear:0,curiosityState:0,confidenceState:0,stressState:0,fatigueState:0,focusState:0,dangerPenalty:0,
 selfLoopPenalty:0,bayesianTrust:0.5,goalGradientBoost:0,schemaBonus:0,trajectoryIntegrity:0,
 semanticVitalityScore:0,noiseSuppressedScore:0,consolidationBonus:0,attentionAmplifiedScore:0,
 uncertaintyScore:0,dominantDrive:null,executiveWeights:null};

const at = (f, t) => f({ ...base, bayesianTrust: t });
const SLOPE = 12;   // 8 (in-term) x 1.5 (term-array weight)

// ============================================================
console.log('── G16.1  positive-side magnitude preserved ──────────────────');
// ============================================================
const posT = [];
for (let t = 0.55; t <= 1.0000001; t += 0.05) posT.push(Number(t.toFixed(2)));

let p1 = true, p1rows = [];
for (const t of posT) {
  const o = at(ORIG, t), f = at(FIX, t);
  if (o !== f) { p1 = false; p1rows.push(`      t=${t.toFixed(2)}  orig ${o}  fix ${f}`); }
}
ok('G16.1a  score bit-identical to pre-change build for every t > 0.5', p1,
   `${posT.length} points, exact float equality`);
p1rows.forEach(r => console.log(r));

// absolute values asserted, not only the derivative (a shifted intercept
// would preserve the slope yet change every argmax)
const b0 = FIX({ ...base });
let p1b = true, p1brows = [];
for (const t of posT) {
  const expect = (t - 0.5) * SLOPE + b0;
  const got = at(FIX, t);
  if (!NEAR(got, expect)) { p1b = false; p1brows.push(`      t=${t.toFixed(2)}  expected ${expect}  got ${got}`); }
}
ok('G16.1b  absolute scores equal baseline + 12*(t-0.5) for t > 0.5', p1b);
p1brows.forEach(r => console.log(r));

const slopePos = (at(FIX, 1.0) - at(FIX, 0.6)) / 0.4;
ok('G16.1c  positive-side slope is exactly +12/unit', NEAR(slopePos, SLOPE),
   `measured ${slopePos.toFixed(9)}`);

// ============================================================
console.log('\n── G16.2  negative evidence becomes decision-usable ──────────');
// ============================================================
const negT = [];
for (let t = 0.0; t <= 0.450001; t += 0.05) negT.push(Number(t.toFixed(2)));

// (a) derivative nonzero and correctly signed below 0.5
let mono = true, monoRows = [];
for (let i = 1; i < negT.length; i++) {
  const lo = at(FIX, negT[i - 1]), hi = at(FIX, negT[i]);
  if (!(hi > lo)) { mono = false; monoRows.push(`      t=${negT[i-1]}→${negT[i]}  ${lo} → ${hi}`); }
}
ok('G16.2a  score strictly INCREASING across t < 0.5 (evidence now used)', mono,
   `${negT.length} points`);
monoRows.forEach(r => console.log(r));

const slopeNeg = (at(FIX, 0.45) - at(FIX, 0.0)) / 0.45;
ok('G16.2a2 negative-side slope is exactly +12/unit (magnitude preserved)',
   NEAR(slopeNeg, SLOPE), `measured ${slopeNeg.toFixed(9)}`);

// ANTI-VACUITY: the same sweep must be FLAT on the pre-change build
const origNegFlat = negT.every(t => at(ORIG, t) === at(ORIG, 0.0));
ok('G16.2a3 ANTI-VACUITY: pre-change build is FLAT below 0.5 (evidence discarded)',
   origNegFlat, 'proves G16.2a detects a real change');

// (b) behavioural: proven-bad edge must LOSE the argmax
const T_BAD = (0 + 1) / (10 + 2);          // s=0, a=10  ->  Beta(1,1) posterior mean
const T_NEU = 0.5;                          // untried
const badFix = at(FIX, T_BAD),  neuFix = at(FIX, T_NEU);
const badOrig = at(ORIG, T_BAD), neuOrig = at(ORIG, T_NEU);
console.log(`      proven-bad  t=${T_BAD.toFixed(4)} (s=0,a=10)   pre ${badOrig.toFixed(6)}   post ${badFix.toFixed(6)}`);
console.log(`      neutral     t=0.5000 (untried)       pre ${neuOrig.toFixed(6)}   post ${neuFix.toFixed(6)}`);
ok('G16.2b  post-change: proven-bad candidate LOSES the argmax', badFix < neuFix,
   `margin ${(neuFix - badFix).toFixed(6)}`);
ok('G16.2b2 ANTI-VACUITY: pre-change it wins or ties (defect reproduced)',
   badOrig >= neuOrig, badOrig === neuOrig ? 'exact tie — the discarded-evidence defect' : '');

// (c) continuity at the hinge
ok('G16.2c  continuity: score at t=0.5 exactly equals the neutral baseline',
   at(FIX, 0.5) === at(ORIG, 0.5) && at(FIX, 0.5) === b0,
   `fix ${at(FIX,0.5)}  orig ${at(ORIG,0.5)}`);

// ============================================================
console.log('\n── G16.3  no unrelated coefficients change ───────────────────');
// ============================================================
const d = (f, k, v = 1) => (f({ ...base, [k]: v }) - f({ ...base })) / v;
const dAvg = (f, k, v = 1, N = 200000) => { let s = 0; for (let i = 0; i < N; i++) s += f({ ...base, [k]: v }) - f({ ...base }); return s / N / v; };

const NEG = ['boredomPenalty','dangerPenalty','stressState','fatigueState','localStress','localFatigue',
             'localFear','selfLoopPenalty','repetitionPenalty'];
const POS = ['transitionBoost','qValue','reward','habitBoost','curiosityBoost','chainReward','meaningBoost',
             'futureBonus','localConfidence','localTrust','confidenceState','goalGradientBoost','schemaBonus',
             'trajectoryIntegrity','semanticVitalityScore','noiseSuppressedScore','consolidationBonus',
             'attentionAmplifiedScore','curiosityState'];   // bayesianTrust deliberately EXCLUDED — it is the term under repair
const ALL = [...new Set([...NEG, ...POS])];

let unchanged = true, uRows = [];
for (const k of ALL) {
  const o = (k === 'curiosityState') ? dAvg(ORIG, k) : d(ORIG, k);
  const f = (k === 'curiosityState') ? dAvg(FIX,  k) : d(FIX,  k);
  const same = (k === 'curiosityState') ? NEAR(o, f, 1e-3) : (o === f);
  if (!same) { unchanged = false; uRows.push(`      ${k}: ${o} -> ${f}`); }
}
ok('G16.3a  every other term derivative bit-unchanged  [frozen G16.3, RETAINED]', unchanged,
   `${ALL.length} terms checked (bayesianTrust excluded by design)`);
uRows.forEach(r => console.log(r));

// ── G16.3′  arbitration-breakdown clause, per ERRATUM M7-ERR-01a ──────────
//
// SUPERSEDES the frozen G16.3 sub-clause "lastArbitrationBreakdown
// bit-identical across >= 20 000 contexts", which is unsatisfiable together
// with frozen §13.1 (see M7_PREREGISTRATION_ERRATUM_01.md §2). The frozen
// document itself is UNMODIFIED; this gate implements the superseding
// criterion. The other two frozen G16.3 sub-clauses — term derivatives
// (G16.3a above) and export surface (G16.3c below) — are RETAINED.
//
// Expected delta, fixed analytically by frozen §13.1's own coefficients:
//     trustBonus_pre  = 8 * max(0, t - 0.5)
//     trustBonus_post = 8 * (t - 0.5)
//     D_expected(t)   = 1.5 * (post - pre) = 12 * min(0, t - 0.5)
const TOL = 1e-12;                                   // erratum §3.4, absolute
const dExpected = (t) => 12 * Math.min(0, t - 0.5);
const R = (a, b) => a + Math.random() * (b - a);
const FIELDS_MUST_MATCH = ['rewardScore','semanticScore','curiosityScore','costScore','schemaScore'];

function breakdowns(c) {
  ORIG(c); const o = { ...O.lastArbitrationBreakdown };
  FIX(c);  const f = { ...F.lastArbitrationBreakdown };
  return [o, f];
}

let v1 = 0, v1first = null;                          // (1) five fields bit-identical
let v3 = 0, v3first = null;                          // (3) t >= 0.5 -> whole breakdown identical
let v4 = 0, v4first = null, worstDev = 0;            // (4) t < 0.5 -> delta == expected, within TOL
const everDiffer = new Set();                        // (5) which fields ever differ
let nLow = 0, nHigh = 0;

for (let i = 0; i < 20000; i++) {
  const t = R(0, 1);
  const c = { ...base, transitionBoost:R(0,6), qValue:R(0,6), reward:R(0,8), habitBoost:R(0,7),
    curiosityBoost:R(0,3), goalGradientBoost:R(0,50), schemaBonus:R(0,1), bayesianTrust:t,
    boredomPenalty:R(0,3), stressState:R(0,20), fatigueState:R(0,60), curiosityState:0,
    confidenceState:R(0,20), dominantDrive:[null,'hunger','boredom','stress'][i % 4],
    semanticVitalityScore:R(0,2), futureBonus:R(0,20), meaningBoost:R(0,0.1),
    consolidationBonus:R(0,2), repetitionPenalty:i % 3 === 0 ? R(0,4) : 0, uncertaintyScore:R(0,1) };

  const [o, f] = breakdowns(c);
  for (const k of Object.keys(o)) if (o[k] !== f[k]) everDiffer.add(k);

  for (const k of FIELDS_MUST_MATCH) {
    if (o[k] !== f[k]) { v1++; v1first = v1first || `      t=${t.toFixed(4)} ${k}: ${o[k]} -> ${f[k]}`; }
  }

  if (t >= 0.5) {
    nHigh++;
    if (JSON.stringify(o) !== JSON.stringify(f)) {
      v3++; v3first = v3first || `      t=${t.toFixed(4)}\n      pre  ${JSON.stringify(o)}\n      post ${JSON.stringify(f)}`;
    }
  } else {
    nLow++;
    const dev = Math.abs((f.confidenceScore - o.confidenceScore) - dExpected(t));
    worstDev = Math.max(worstDev, dev);
    if (!(dev <= TOL)) { v4++; v4first = v4first || `      t=${t.toFixed(6)} deviation ${dev}`; }
  }
}

console.log(`      contexts: ${nLow} with t<0.5, ${nHigh} with t>=0.5`);

ok("G16.3'(1) rewardScore/semanticScore/curiosityScore/costScore/schemaScore bit-identical",
   v1 === 0, v1 === 0 ? '5 fields, all contexts' : `${v1} violations`);
if (v1first) console.log(v1first);

ok("G16.3'(2) confidenceScore differs ONLY by the predicted trust-term delta",
   v4 === 0 && [...everDiffer].every(k => k === 'confidenceScore'),
   `fields that ever differ: ${[...everDiffer].join(', ') || 'none'}`);

ok("G16.3'(3) t >= 0.5: complete breakdown bit-identical", v3 === 0,
   v3 === 0 ? `${nHigh} contexts, all six fields` : `${v3} violations`);
if (v3first) console.log(v3first);

ok("G16.3'(4) t < 0.5: observed delta == 12*(t-0.5) within 1e-12", v4 === 0,
   `${nLow} contexts, worst deviation ${worstDev.toExponential(3)}`);
if (v4first) console.log(v4first);

ok("G16.3'(5) no other field or coefficient changed",
   [...everDiffer].length <= 1 && [...everDiffer].every(k => k === 'confidenceScore'),
   `changed set = {${[...everDiffer].join(', ')}}`);

// ANTI-VACUITY (frozen §13.6 remains in force): assertion (4) must FAIL against a
// build where the rectification was NOT applied. There the delta is identically 0
// while D_expected < 0 for every t < 0.5.
let avDetected = 0;
for (let i = 0; i < 2000; i++) {
  const t = R(0, 0.499);
  const c = { ...base, bayesianTrust: t };
  ORIG(c); const a = O.lastArbitrationBreakdown.confidenceScore;
  ORIG(c); const b = O.lastArbitrationBreakdown.confidenceScore;   // pre vs pre
  if (!(Math.abs((b - a) - dExpected(t)) <= TOL)) avDetected++;
}
ok("G16.3'(AV) ANTI-VACUITY: criterion (4) rejects an un-rectified build",
   avDetected === 2000, `${avDetected}/2000 contexts correctly rejected`);

const oKeys = Object.keys(O).sort().join(','), fKeys = Object.keys(F).sort().join(',');
ok('G16.3c  module export surface unchanged  [frozen G16.3, RETAINED]', oKeys === fKeys, fKeys);

// ============================================================
console.log('\n── G16.4  modification isolated and auditable ────────────────');
// ============================================================
const liveSrc = fs.readFileSync(LIVE, 'utf8').split(/\r?\n/);
const preSrc  = fs.readFileSync(PRE,  'utf8').split(/\r?\n/);

ok('G16.4a1 frozen pre-change reference arm exists', fs.existsSync(PRE), PRE.replace(ROOT + path.sep, ''));
ok('G16.4a2 file length unchanged (pure substitution, no insertion/deletion)',
   liveSrc.length === preSrc.length, `${preSrc.length} lines`);

const diffIdx = [];
for (let i = 0; i < Math.max(liveSrc.length, preSrc.length); i++) {
  if (liveSrc[i] !== preSrc[i]) diffIdx.push(i);
}
ok('G16.4a3 EXACTLY ONE line differs from the pre-change build', diffIdx.length === 1,
   diffIdx.length ? `line ${diffIdx[0] + 1}` : 'no differences — change not applied?');

if (diffIdx.length === 1) {
  const i = diffIdx[0];
  console.log(`      -  ${preSrc[i].trim()}`);
  console.log(`      +  ${liveSrc[i].trim()}`);
  ok('G16.4a4 removed line is exactly the Math.max(0, …) wrapper',
     preSrc[i].includes('Math.max(0, bayesianTrust - 0.5) * 8'));
  ok('G16.4a5 added line is the symmetric form, wrapper gone',
     liveSrc[i].includes('(bayesianTrust - 0.5) * 8') && !liveSrc[i].includes('Math.max'));
  ok('G16.4a6 indentation preserved (no incidental reformatting)',
     preSrc[i].match(/^\s*/)[0] === liveSrc[i].match(/^\s*/)[0]);
} else {
  ok('G16.4a4 removed line is exactly the Math.max(0, …) wrapper', false);
  ok('G16.4a5 added line is the symmetric form, wrapper gone', false);
  ok('G16.4a6 indentation preserved (no incidental reformatting)', false);
}

// ---- G16.4b — RETIRED, NOT REPAIRED ---------------------------------------
// Frozen §13.4 G16.4 clause (b), "No other render/ file modified", is retired
// as an executable runtime assertion by M7-ERR-10 (Director ruling 2026-08-28,
// disposition D5), binding to frozen SHA-256
// 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9.
//
// WHAT USED TO BE HERE, and why it is gone. Clause (b) was implemented as a
// filesystem-mtime comparison: render/*.js whose mtimeMs exceeded that of the
// reference arm. Git stores no mtimes, so that measurement had no stable
// repository referent. It returned three different answers over byte-identical
// content — {episodeManager.js, scoring.js} in the authoring tree, none under a
// git-archive materialisation, all 37 modules in two fresh clones — and in the
// authoring tree it PASSED while seven content-changed render modules
// (embeddings, episodicContextEngine, neuronVisuals, predictionError,
// qlearning, semanticProvenance, stars) lay outside its measurement.
//
// The historical PASS is therefore NOT valid evidence for the claimed isolation
// property. That is not a finding that unauthorised work occurred, nor that the
// property is false: each of those seven modules changed under a separate
// ruling. It is the narrower fact that the measurement did not cover them.
//
// NO REPLACEMENT IS INTRODUCED HERE. ERR-10 §3.2 rejects creating frozen
// references post-hoc, selecting a Git commit range post-hoc, and substituting a
// literal-allowlist assertion — and forbids any replacement gate whose purpose is
// to keep G16 green. The four G16.4c controls exercised the retired predicate and
// nothing else, so they are retired with it rather than left reporting green
// against a subject that no longer exists.
//
// A future isolation gate requires a separate PRE-SPECIFIED authority and a
// mutation control in which modifying an unauthorised render/ module turns the
// gate RED. None is constructed here.
//
// Clauses (a), (c) and (d) of G16.4 are unaffected and still execute below and
// above: G16.4a1-a6 assert the one-line delta against the committed reference arm
// (content-derived, reproducible), G16.4d asserts the live import, and G16.4d2
// asserts the reference arm still carries the original form.
console.log('      G16.4b  RETIRED as an executable assertion by M7-ERR-10 —');
console.log('              unreproducible mtime referent; no replacement measurement.');
console.log('              Its historical PASS is not evidence for the isolation property.');

// live import, not the frozen copy
ok('G16.4d  module under test is the LIVE render/scoring.js',
   fs.readFileSync(LIVE, 'utf8').includes('(bayesianTrust - 0.5) * 8') &&
   !fs.readFileSync(LIVE, 'utf8').includes('Math.max(0, bayesianTrust'),
   'live file carries the symmetric form');
ok('G16.4d2 reference arm still carries the ORIGINAL form (never substituted)',
   fs.readFileSync(PRE, 'utf8').includes('Math.max(0, bayesianTrust - 0.5) * 8'));

// ============================================================
console.log('\n── G16.5  M1 regressions remain valid ────────────────────────');
// ============================================================
function runGate(script) {
  try {
    const out = execFileSync(process.execPath, [script], { cwd: HERE, encoding: 'utf8' });
    return { out, code: 0 };
  } catch (e) {
    return { out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1 };
  }
}
// verify_S1.js — required green in full, unchanged.
{
  const { out, code } = runGate('verify_S1.js');
  const passes = (out.match(/^PASS/gm) || []).length;
  const fails  = (out.match(/^FAIL/gm) || []).length;
  ok('G16.5a  verify_S1.js green against the rectified build',
     fails === 0 && passes === 12 && code === 0, `${passes} passed, ${fails} failed, exit ${code}`);
  if (fails > 0) out.split('\n').filter(l => l.startsWith('FAIL')).forEach(l => console.log('      ' + l));
}

// verify_S1b.js — PRESERVED UNMODIFIED. Under ERRATUM M7-ERR-02 the S1.7
// assertion's APPLICATION to the M7 rectification is superseded by
// verify_S1prime.js. Every OTHER S1b assertion is still required green, and
// S1.7's historical failure is REPORTED EXPLICITLY here, never hidden.
{
  const { out } = runGate('verify_S1b.js');
  const lines = out.split('\n').filter(l => /^(PASS|FAIL)/.test(l));
  const s17 = lines.filter(l => /\bS1\.7\b/.test(l));
  const others = lines.filter(l => !/\bS1\.7\b/.test(l));
  const otherFails = others.filter(l => l.startsWith('FAIL'));

  ok('G16.5b  verify_S1b.js: all assertions OTHER THAN S1.7 green',
     otherFails.length === 0 && others.length === 3,
     `${others.filter(l => l.startsWith('PASS')).length}/${others.length} green (S1.7 delegated)`);
  otherFails.forEach(l => console.log('      ' + l));

  console.log('      ── historical provenance, reported not hidden ──');
  s17.forEach(l => console.log('      ORIGINAL (preserved, unmodified): ' + l.trim()));
  console.log('      reason: unsatisfiable with frozen §13.1 — erratum M7-ERR-01 §2');
  console.log('      superseded by: verify_S1prime.js (erratum M7-ERR-02)');
}

// verify_S1prime.js — the superseding criterion for S1.7.
{
  const { out, code } = runGate('verify_S1prime.js');
  const passes = (out.match(/^PASS/gm) || []).length;
  const fails  = (out.match(/^FAIL/gm) || []).length;
  ok('G16.5c  verify_S1prime.js green (S1.7 superseding criterion)',
     fails === 0 && passes === 7 && code === 0, `${passes} passed, ${fails} failed, exit ${code}`);
  if (fails > 0) out.split('\n').filter(l => l.startsWith('FAIL')).forEach(l => console.log('      ' + l));
}

// ============================================================
console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log('G16 GREEN — trust rectification verified against the frozen pre-registration.');
} else {
  console.log('G16 RED — DO NOT PROCEED. Correct the implementation to match the frozen document.');
}
process.exit(fail ? 1 : 0);

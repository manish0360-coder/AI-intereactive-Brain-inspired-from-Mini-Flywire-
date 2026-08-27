// ==========================================================
// M1 GATE S1.7′ — SUPERSEDING VERIFICATION CRITERION
// ==========================================================
// Issued under ERRATUM M7-ERR-02
//   research/cognitive-audit/M7_PREREGISTRATION_ERRATUM_02.md
//   lineage: M7-ERR-01 (research/cognitive-audit/M7_PREREGISTRATION_ERRATUM_01.md)
//   frozen pre-registration SHA-256:
//     2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//
// RELATIONSHIP TO THE ORIGINAL GATE
// ---------------------------------
// verify_S1b.js is PRESERVED UNMODIFIED as historical provenance. Its gate
// S1.7 still runs, still asserts universal breakdown bit-identity, and still
// reports its historical FAIL. This file does not replace, patch, or silence
// it. It stands alongside as an EXPLICIT SUPERSEDING CRITERION for the
// APPLICATION of S1.7 to the approved M7 symmetric trust rectification.
//
// S1.7's original purpose is PRESERVED, not weakened: it proved the M1/D3
// five-sign repair to finalWeight did not leak into the arbitrate()
// diagnostic path. This gate still proves exactly that — and additionally
// pins the one permitted change to its analytic value.
//
// INDEPENDENT VERIFICATION (deliberate, not duplication)
// ------------------------------------------------------
// verify_G16.js implements the same property against baseline/
// scoring_prerect.js (the PRE-RECTIFICATION arm).
// This gate implements it against baseline/scoring_prefix_D3.js — S1.7's
// OWN arm, which is PRE-D3, pre-term-array and pre-M4, i.e. a different and
// older build reached by a different code path.
//
// Agreement between the two arms is therefore genuine cross-validation:
//   * against the PRE-D3 arm, only confidenceScore differing also re-proves
//     S1.7's original guarantee (D3 never touched the breakdown);
//   * against the PRE-RECTIFICATION arm, the same result isolates the
//     rectification alone.
// Logic is NOT shared between the two gates; each computes the property
// from its own reference arm.
//
// CRITERION (semantically equivalent to G16.3′)
//   (1) five non-trust breakdown fields bit-identical
//   (2) t >= 0.5  -> complete breakdown bit-identical
//   (3) t <  0.5  -> only confidenceScore may differ
//   (4) observed delta == 12 * min(0, t - 0.5)  within 1e-12 absolute
//   (5) no unrelated field, coefficient, export or scoring term changes
//   (6) anti-vacuity against the pre-rectification reference arm
// ==========================================================
import { calculateDecisionScore as PRE_D3 } from './baseline/scoring_prefix_D3.js';
import { calculateDecisionScore as LIVE }   from '../../render/scoring.js';
import { calculateDecisionScore as PRERECT } from './baseline/scoring_prerect.js';
import * as O from './baseline/scoring_prefix_D3.js';
import * as F from '../../render/scoring.js';
import * as P from './baseline/scoring_prerect.js';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

const TOL = 1e-12;                                   // erratum M7-ERR-01a §3.4
const dExpected = (t) => 12 * Math.min(0, t - 0.5);
const FIELDS_MUST_MATCH = ['rewardScore', 'semanticScore', 'curiosityScore', 'costScore', 'schemaScore'];

// context generator copied from verify_S1b.js S1.7 verbatim, so this gate
// exercises the SAME distribution the original assertion did.
const base = {transitionBoost:0,qValue:0,reward:0,habitBoost:0,curiosityBoost:0,chainReward:0,meaningBoost:0,
 futureBonus:0,boredomPenalty:0,repetitionPenalty:0,localConfidence:0,localStress:0,localFatigue:0,localTrust:0,
 localFear:0,curiosityState:0,confidenceState:0,stressState:0,fatigueState:0,focusState:0,dangerPenalty:0,
 selfLoopPenalty:0,bayesianTrust:0.5,goalGradientBoost:0,schemaBonus:0,trajectoryIntegrity:0,
 semanticVitalityScore:0,noiseSuppressedScore:0,consolidationBonus:0,attentionAmplifiedScore:0,
 uncertaintyScore:0,dominantDrive:null,executiveWeights:null};
const R = (a, b) => a + Math.random() * (b - a);
const mkCtx = (i) => ({ ...base, transitionBoost:R(0,6), qValue:R(0,6), reward:R(0,8), habitBoost:R(0,7),
  curiosityBoost:R(0,3), goalGradientBoost:R(0,50), schemaBonus:R(0,1), bayesianTrust:R(0,1),
  boredomPenalty:R(0,3), stressState:R(0,20), fatigueState:R(0,60), curiosityState:R(0,3),
  confidenceState:R(0,20), dominantDrive:[null,'hunger','boredom','stress'][i%4],
  semanticVitalityScore:R(0,2), futureBonus:R(0,20), meaningBoost:R(0,0.1), consolidationBonus:R(0,2),
  repetitionPenalty:i%3===0?R(0,4):0, uncertaintyScore:R(0,1) });

console.log('══════════════════════════════════════════════════════════════');
console.log(" S1.7′  SUPERSEDING CRITERION  (erratum M7-ERR-02)");
console.log(' verify_S1b.js and its S1.7 assertion remain PRESERVED, unmodified.');
console.log(' reference arm: baseline/scoring_prefix_D3.js  (PRE-D3 — S1.7 own arm)');
console.log('══════════════════════════════════════════════════════════════');

const N = 20000;
let v1 = 0, v1first = null;
let v2 = 0, v2first = null;
let v4 = 0, v4first = null, worstDev = 0;
const everDiffer = new Set();
let nLow = 0, nHigh = 0;

for (let i = 0; i < N; i++) {
  const c = mkCtx(i);
  const t = c.bayesianTrust;
  PRE_D3(c); const o = { ...O.lastArbitrationBreakdown };
  LIVE(c);   const f = { ...F.lastArbitrationBreakdown };

  for (const k of Object.keys(o)) if (o[k] !== f[k]) everDiffer.add(k);

  for (const k of FIELDS_MUST_MATCH) {
    if (o[k] !== f[k]) { v1++; v1first = v1first || `      t=${t.toFixed(4)} ${k}: ${o[k]} -> ${f[k]}`; }
  }

  if (t >= 0.5) {
    nHigh++;
    if (JSON.stringify(o) !== JSON.stringify(f)) {
      v2++; v2first = v2first || `      t=${t.toFixed(4)}\n      pre-D3 ${JSON.stringify(o)}\n      live   ${JSON.stringify(f)}`;
    }
  } else {
    nLow++;
    const dev = Math.abs((f.confidenceScore - o.confidenceScore) - dExpected(t));
    worstDev = Math.max(worstDev, dev);
    if (!(dev <= TOL)) { v4++; v4first = v4first || `      t=${t.toFixed(6)} deviation ${dev}`; }
  }
}

console.log(`      contexts: ${nLow} with t<0.5, ${nHigh} with t>=0.5`);

ok("S1.7′(1) five non-trust breakdown fields bit-identical vs PRE-D3 arm",
   v1 === 0, v1 === 0 ? '5 fields, all contexts — re-proves D3 never touched arbitrate()' : `${v1} violations`);
if (v1first) console.log(v1first);

ok("S1.7′(2) t >= 0.5: complete breakdown bit-identical", v2 === 0,
   v2 === 0 ? `${nHigh} contexts, all six fields` : `${v2} violations`);
if (v2first) console.log(v2first);

ok("S1.7′(3) t < 0.5: only confidenceScore differs",
   [...everDiffer].length <= 1 && [...everDiffer].every(k => k === 'confidenceScore'),
   `fields that ever differ: {${[...everDiffer].join(', ') || 'none'}}`);

ok("S1.7′(4) observed delta == 12*min(0,t-0.5) within 1e-12", v4 === 0,
   `${nLow} contexts, worst deviation ${worstDev.toExponential(3)}`);
if (v4first) console.log(v4first);

// (5) no unrelated export or scoring term changed
const oKeys = Object.keys(O).sort().join(','), fKeys = Object.keys(F).sort().join(',');
ok("S1.7′(5a) module export surface unchanged", oKeys === fKeys, fKeys);

// scoring-term isolation: only bayesianTrust's derivative may move
const d = (fn, k, v = 1) => (fn({ ...base, [k]: v }) - fn({ ...base })) / v;
const TERMS = ['transitionBoost','qValue','reward','habitBoost','curiosityBoost','chainReward','meaningBoost',
  'futureBonus','localConfidence','localTrust','confidenceState','goalGradientBoost','schemaBonus',
  'trajectoryIntegrity','semanticVitalityScore','noiseSuppressedScore','consolidationBonus',
  'attentionAmplifiedScore','boredomPenalty','dangerPenalty','stressState','fatigueState','localStress',
  'localFatigue','localFear','selfLoopPenalty','repetitionPenalty'];
let moved = [];
for (const k of TERMS) { if (d(PRERECT, k) !== d(LIVE, k)) moved.push(k); }
ok("S1.7′(5b) no unrelated scoring-term coefficient changed", moved.length === 0,
   moved.length ? `moved: ${moved.join(', ')}` : `${TERMS.length} terms, all bit-identical`);

// ---------- (6) ANTI-VACUITY against the PRE-RECTIFICATION reference arm ----------
// PRE-D3 and PRE-RECT both carry the rectified trust term, so their breakdown
// delta is identically 0. Criterion (4) demands a NEGATIVE delta for t < 0.5,
// so it must REJECT that pairing. If it does not, the criterion is vacuous.
console.log('\n── S1.7′(6)  anti-vacuity vs baseline/scoring_prerect.js ──');
let avRejected = 0, avTotal = 0, avDeltaMax = 0;
for (let i = 0; i < 2000; i++) {
  const c = mkCtx(i); c.bayesianTrust = R(0, 0.499);
  const t = c.bayesianTrust;
  PRE_D3(c);  const a = O.lastArbitrationBreakdown.confidenceScore;
  PRERECT(c); const b = P.lastArbitrationBreakdown.confidenceScore;
  avDeltaMax = Math.max(avDeltaMax, Math.abs(b - a));
  avTotal++;
  if (!(Math.abs((b - a) - dExpected(t)) <= TOL)) avRejected++;
}
console.log(`      max |delta| between the two un-rectified arms: ${avDeltaMax.toExponential(3)}  (expected 0)`);
ok("S1.7′(6) ANTI-VACUITY: criterion (4) rejects an un-rectified pairing",
   avRejected === avTotal, `${avRejected}/${avTotal} contexts correctly rejected`);

// ---------- provenance: what the ORIGINAL S1.7 says ----------
console.log('\n── provenance: original S1.7, for the record ──');
let origWouldPass = true;
for (let i = 0; i < 2000; i++) {
  const c = mkCtx(i);
  PRE_D3(c); const a = JSON.stringify(O.lastArbitrationBreakdown);
  LIVE(c);   const b = JSON.stringify(F.lastArbitrationBreakdown);
  if (a !== b) { origWouldPass = false; break; }
}
console.log(`      original assertion: breakdown bit-identical for ALL contexts`);
console.log(`      original verdict  : ${origWouldPass ? 'would PASS' : 'would FAIL'}  (unsatisfiable with frozen §13.1 — see erratum M7-ERR-01 §2)`);
console.log('      This line is INFORMATIONAL. It is not an assertion of this gate.');
console.log('      verify_S1b.js remains the authoritative record of the original gate.');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

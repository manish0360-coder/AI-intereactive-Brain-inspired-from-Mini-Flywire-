// M15 development-label procedure (PROPOSAL revision 3.1, section 6.1; SPEC.md, "Development procedure").
//   node experiments/m15_uncertainty/admission/admission.mjs > experiments/m15_uncertainty/admission/admission.out
// Writes admission.json next to itself. Every equation, parameter, threshold and the evaluation code are fixed before
// it runs; nothing here changes after its output is seen (a bug would be fixed, disclosed, and this run repeated).
//
// 1. Development run: labels m15unc|dev|0..59, every arm and mechanism, passive replay and closed loop, with the
//    whole window grid w in {2, 3, 4}.
// 2. w*: argmin over w of WINDOW's mean exact expected Brier in passive replay (route stream) over every evaluation
//    point of every condition, conditions weighted equally (pooled within a condition); ties go to the larger w.
// 3. Margin: ceil(H / 4), H = the mean over labels of CONCRETE - ORACLE steps in STABLE evaluation worlds 1-16.
// 4. n: for every part of T, BT, CD and ACT, the smallest n giving 98% power at half the development effect, where the
//    effect is the development estimate's distance from the part's threshold in the passing direction:
//      paired parts    n = ((z.975 + z.98) * sd / (effect / 2))^2, sd = the SD of the per-label values;
//      cluster parts   n = 60 * ((z.975 + z.98) * se60 / (effect / 2))^2, se60 = the SD of the cluster-bootstrap
//                      resamples over the 60 development labels (the standard error scales as sqrt(60 / n)).
//    A part whose development estimate is not on the passing side (effect <= 0) cannot be powered; it sets n to the
//    maximum. n = the largest part's n, rounded up, clamped to [165, 600]. MECH is not powered (PROPOSAL 6.3).
// 5. Admission, from controls and the oracle only (UA's development values serve only step 4):
//      A1  H: 95% lower bound > 0, and H >= 2 x MDE, MDE = (z.975 + z.80) * sd(H) / sqrt(n)
//      A2  (a) FROZEN - ORACLE steps, REVERSED post-switch worlds 1-6: lower bound > 0;
//          (b) NEWEST - FREQ false-alarm rate in NOISY, passive route stream (cluster bootstrap): lower bound > 0
//      A3  identity with AD-13 (first world of every condition), the agents' absorbed observations equal the paths',
//          CONCRETE identical across conditions, V-REV (passive and closed loop), probe isolation, frozen beliefs
//          unchanged: on every label
//      A4  FREQ's closed-loop observations per kind after the warm-up >= 8 (mean over labels; the warm-up is the same
//          in STABLE, NOISY and REVERSED), and per kind per REVERSED post-switch world (worlds 1-6) >= 0.5
//    A1, A2 or A4 failing means NO-GO: the task is redesigned, not run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { pairedBootstrap } from '../../../cognitive/testbed/stats.mjs';
import { M15, LABEL_OF, CONDITIONS, COND_SCOPES, mergeAcc, runLabel, windowName } from '../m15_lib.mjs';
import { criteria, stepsIn, clusterBootstrap, mean, sd, median } from '../m15_analysis.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const Z975 = 1.959964, Z98 = 2.053749, Z80 = 0.841621;
const N_DEV = 60, N_MIN = 165, N_MAX = 600;
function Phi(x) {             // standard normal CDF, Numerical Recipes erfcc fit; as in M13's and M14's power scripts
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - r / 2 : r / 2;
}

const t0 = performance.now();
const labels = Array.from({ length: N_DEV }, (_, i) => LABEL_OF.dev(i));
const all = labels.map((l, i) => { const L = runLabel(l, { windows: [...M15.windowGrid] }); if ((i + 1) % 10 === 0) console.log(`development label ${i + 1} of ${N_DEV}, ${Math.round((performance.now() - t0) / 1000)} s`); return L; });
const excluded = all.filter((L) => L.excluded).map((L) => ({ label: L.label, reason: L.excluded }));
const Ls = all.filter((L) => !L.excluded);
console.log(`development labels run: ${Ls.length} (excluded ${excluded.length})`);

// 2. w*
const objective = Object.fromEntries(M15.windowGrid.map((w) => [w, mean(CONDITIONS.map((c) => { const a = mergeAcc(Ls.flatMap((L) => COND_SCOPES[c].map((s) => L.passive.route[windowName(w)].acc[s]))); return a.brier / a.n; }))]));
let wStar = null;
for (const w of M15.windowGrid) if (wStar === null || objective[w] <= objective[wStar]) wStar = w;   // ascending grid: ties go to the larger w
console.log(`w*: ${wStar} (objective ${M15.windowGrid.map((w) => `w=${w} ${objective[w]}`).join(', ')})`);

// 3. margin
const hDiffs = Ls.map((L) => stepsIn(L, 'CONCRETE', 'STABLE_1_16') - stepsIn(L, 'ORACLE', 'STABLE_1_16'));
const H = pairedBootstrap(hDiffs, 'm15unc|admission|H');
const margin = Math.ceil(H.mean / 4);
console.log(`headroom H = ${H.mean} [${H.lo}, ${H.hi}], sd ${sd(hDiffs)}; margin ceil(H/4) = ${margin}`);

// 4. n
const C = criteria(Ls, { domain: 'dev', wStar, margin });
const parts = C.filter((c) => c.line !== 'MECH').map((c) => {
  const effect = c.dir === 'lo>' ? c.mean - c.threshold : c.threshold - c.mean;
  const spread = c.kind === 'paired' ? c.sd : c.se;
  let nPart;
  if (!(effect > 0)) nPart = Infinity;
  else if (!(spread > 0)) nPart = 0;
  else nPart = c.kind === 'paired' ? ((Z975 + Z98) * spread / (effect / 2)) ** 2 : N_DEV * ((Z975 + Z98) * spread / (effect / 2)) ** 2;
  return { name: c.name, line: c.line, kind: c.kind, dir: c.dir, threshold: c.threshold, devEstimate: c.mean, devLo: c.lo, devHi: c.hi, spread, spreadIs: c.kind === 'paired' ? 'sd of per-label values' : 'se: SD of cluster-bootstrap resamples over the development labels', effect, nPart: Number.isFinite(nPart) ? Math.ceil(nPart) : null, powerable: Number.isFinite(nPart) };
});
const largest = Math.max(...parts.map((p) => (p.powerable ? p.nPart : Infinity)));
const n = Math.min(N_MAX, Math.max(N_MIN, Number.isFinite(largest) ? largest : N_MAX));
for (const p of parts) {
  const se = p.kind === 'paired' ? p.spread / Math.sqrt(n) : p.spread * Math.sqrt(N_DEV / n);
  p.powerAtNHalfEffect = !p.powerable ? null : se > 0 ? Phi(p.effect / 2 / se - Z975) : 1;
}
const powerPerLine = Object.fromEntries(['T', 'BT', 'CD', 'ACT'].map((l) => { const ps = parts.filter((p) => p.line === l); return [l, ps.some((p) => p.powerAtNHalfEffect === null) ? null : ps.reduce((a, p) => a * p.powerAtNHalfEffect, 1)]; }));
console.log(`n = ${n} (largest part ${Number.isFinite(largest) ? largest : 'unpowerable'}; clamp [${N_MIN}, ${N_MAX}])`);
for (const p of parts) console.log(`  ${p.name.padEnd(6)} ${p.kind.padEnd(7)} dev ${p.devEstimate} ${p.dir} ${p.threshold}  effect ${p.effect}  spread ${p.spread}  n ${p.nPart ?? 'unpowerable'}  power@n ${p.powerAtNHalfEffect}`);
console.log(`  power per line (product of parts, at half the development effect): ${JSON.stringify(powerPerLine)}`);

// 5. admission
const mde = (Z975 + Z80) * sd(hDiffs) / Math.sqrt(n);
const a2a = pairedBootstrap(Ls.map((L) => stepsIn(L, 'FROZEN', 'POST_1_6') - stepsIn(L, 'ORACLE', 'POST_1_6')), 'm15unc|admission|A2a');
const faVec = (L, m) => { const a = mergeAcc([L.passive.route[m].acc.NOISY]); return [a.fa, a.uniq]; };
const a2b = clusterBootstrap(Ls.map((L) => Float64Array.of(...faVec(L, 'NEWEST'), ...faVec(L, 'FREQ'))), 'm15unc|admission|A2b', (v) => v[0] / v[1] - v[2] / v[3]);
const checkAll = (k) => Ls.every((L) => L.checks[k] === true);
const a3 = { identityWorld0: checkAll('identityWorld0'), absorbedMatches: checkAll('absorbedMatches'), concretePassive: checkAll('concretePassive'), vrevPassive: checkAll('vrevPassive'), vrevClosed: checkAll('vrevClosed'), probeIsolation: checkAll('probeIsolation'), frozenUnchanged: checkAll('frozenUnchanged') };
const warmObs = mean(Ls.map((L) => L.closed.STABLE.FREQ.filter((w) => w.e === null).reduce((s, w) => s + w.nObs, 0) / 4));
const postObs = mean(Ls.map((L) => mean(L.closed.REVERSED.FREQ.filter((w) => w.post !== null && w.post <= 5).map((w) => w.nObs / 4))));
const checks = {
  A1: H.lo > 0 && H.mean >= 2 * mde,
  A2: a2a.lo > 0 && a2b.lo > 0,
  A3: Object.values(a3).every(Boolean),
  A4: warmObs >= 8 && postObs >= 0.5,
};
const admitted = Object.values(checks).every(Boolean);
console.log(`A1 headroom ${H.mean} lower ${H.lo}; 2 x MDE ${2 * mde} -> ${checks.A1}`);
console.log(`A2 (a) FROZEN - ORACLE post-switch steps ${a2a.mean} [${a2a.lo}, ${a2a.hi}]; (b) NEWEST - FREQ false alarms in NOISY ${a2b.mean} [${a2b.lo}, ${a2b.hi}] -> ${checks.A2}`);
console.log(`A3 ${JSON.stringify(a3)} -> ${checks.A3}`);
console.log(`A4 FREQ observations per kind after the warm-up ${warmObs}; per kind per post-switch world ${postObs} -> ${checks.A4}`);
console.log(admitted ? 'ADMITTED' : 'NOT ADMITTED (NO-GO: the task is redesigned, not run)');

const out = {
  note: 'M15 development-label procedure: labels m15unc|dev|0..59, every arm and mechanism; w*, the margin and n fixed here and hashed into SPEC.sha256 at the freeze. UA development values serve only the spreads that set n.',
  labels: { pattern: 'm15unc|dev|<i>', count: N_DEV, run: Ls.length, excluded },
  parameters: { m15: M15, z975: Z975, z98: Z98, z80: Z80, nMin: N_MIN, nMax: N_MAX },
  wStar, windowObjective: objective,
  headroom: { ...H, sd: sd(hDiffs), median: median(hDiffs), positive: hDiffs.filter((x) => x > 0).length, negative: hDiffs.filter((x) => x < 0).length, zero: hDiffs.filter((x) => x === 0).length },
  margin, n, largestPartN: Number.isFinite(largest) ? largest : null, mde, twiceMde: 2 * mde,
  parts, powerPerLine,
  mechDevelopment: C.filter((c) => c.line === 'MECH').map((c) => ({ name: c.name, devEstimate: c.mean, devLo: c.lo, devHi: c.hi })),
  A2a: { mean: a2a.mean, lo: a2a.lo, hi: a2a.hi }, A2b: { mean: a2b.mean, lo: a2b.lo, hi: a2b.hi }, A3: a3,
  A4: { observationsPerKindAfterWarmup: warmObs, observationsPerKindPerPostSwitchWorld: postObs },
  checks, admitted,
  seconds: Math.round((performance.now() - t0) / 1000),
};
fs.writeFileSync(path.join(HERE, 'admission.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`admission.json written; ${out.seconds} s`);

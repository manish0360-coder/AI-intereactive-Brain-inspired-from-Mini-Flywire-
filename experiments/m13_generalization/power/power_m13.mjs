// ==========================================================
// M13 — the sample-size and power calculation behind SPEC.md (design aid; reads stored rows and the frozen bank)
// ==========================================================
//   node experiments/m13_generalization/power/power_m13.mjs        writes power_m13.out and power_m13.json beside it
// No agent is built or run. It reads:
//   - the stored CF-06 gate6 rows and M11 rows (BELIEF and MBVI3), for the recorded spreads and shapes;
//   - the frozen graph bank, for the exclusions, which planE5 decides from the graph alone.
// Deterministic: every random draw comes from a labelled stream (testbed rng.mjs), and the bootstrap inside each
// simulated study is the study's own pairedBootstrap with 10,000 resamples.
//
// Statistical model (the G1 unit). For label i, d_i = sum over f in {RARE, HALF, OFTEN} of
// steps_MBVI3(i, f) - steps_BELIEF(i, f). The labels are independent draws (each label is its own graph, layout,
// schedule, reliabilities and agent streams); the three families of one label share the graph and layout, so their
// differences may be correlated. G1 passes when the 95% paired percentile bootstrap interval of mean(d) lies above 0.
// With standardized effect delta = mu / sigma, where sigma is the SD of d_i (the sum, so it already contains the
// covariances between the families), the normal approximation gives
//     power(n) = Phi(delta * sqrt(n) - z_0.975)        n_required = ceil(((z_0.975 + z_0.80) / delta)^2).
// The simulation checks that approximation for the percentile bootstrap, with normal and with the recorded skewed
// shapes of d.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeStream } from '../../../cognitive/testbed/rng.mjs';
import { pairedBootstrap } from '../../../cognitive/testbed/stats.mjs';
import { planE5 } from '../../../cognitive/testbed/task_e5.mjs';
import { buildWorld } from '../worlds_modular.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const lines = [], out = {};
const say = (s = '') => { lines.push(s); console.log(s); };
const f4 = (x) => (x === null ? 'null' : x.toFixed(4));

// ---- normal distribution ----
const Z975 = 1.959963984540054, Z80 = 0.8416212335729143;
function Phi(x) {             // standard normal CDF via the Numerical Recipes erfcc Chebyshev fit (fractional error < 1.2e-7)
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - r / 2 : r / 2;
}
const power = (delta, n) => Phi(delta * Math.sqrt(n) - Z975);
const nRequired = (delta, pw = 0.8) => { const z = pw === 0.8 ? Z80 : null; return Math.ceil(((Z975 + z) / delta) ** 2); };

// ---- 0. exclusions, from the frozen bank (planE5 reads only the graph) ----
const bank = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'graph_bank.json'), 'utf8'));
const FAM = ['RARE', 'HALF', 'OFTEN'];
let excludedPairs = 0, excludedLabels = new Set(), skippedEvents = 0;
for (const g of bank.graphs) {
  const w = buildWorld(g.label, g.n, g.edges);
  for (const f of FAM) { const p = planE5(w, g.label, f); if (!p) { excludedPairs++; excludedLabels.add(g.label); } else skippedEvents += p.events.filter((e) => e.skipped).length; }
}
const nAnalysed = bank.count - excludedLabels.size;
out.exclusions = { bankLabels: bank.count, excludedPairs, excludedLabels: excludedLabels.size, analysedLabelsG1: nAnalysed, skippedEvents };
say('== 0. Exclusions, decided from the frozen bank by planE5 (graph only; no agent)');
say(`   ${bank.count} labels x 3 families: ${excludedPairs} (label, family) excluded, ${excludedLabels.size} labels lost to G1; analysed n = ${nAnalysed}; skipped events ${skippedEvents}`);

// ---- 1. analytic ----
const SESOI = 0.22;
say('\n== 1. Analytic (normal approximation to the paired percentile bootstrap)');
say(`   z_0.975 = ${Z975}, z_0.80 = ${Z80}`);
say(`   n_required(delta = ${SESOI}, 80%) = ceil(((${Z975.toFixed(6)} + ${Z80.toFixed(6)}) / ${SESOI})^2) = ceil(${(((Z975 + Z80) / SESOI) ** 2).toFixed(4)}) = ${nRequired(SESOI)}`);
const curve = {};
for (const d of [0.15, 0.2, 0.22, 0.25, 0.3, 0.444, 0.498]) curve[d] = Object.fromEntries([116, 150, 163, 165].map((n) => [n, +power(d, n).toFixed(4)]));
say('   power(delta, n):   n = 116 (the old worst case, 10% excluded) | 150 | 163 | 165');
for (const [d, r] of Object.entries(curve)) say(`      delta ${String(d).padEnd(5)}  ${Object.values(r).map((x) => x.toFixed(4)).join('  ')}`);
out.analytic = { z975: Z975, z80: Z80, sesoi: SESOI, nRequired: nRequired(SESOI), powerCurve: curve };

// ---- 2. recorded inputs ----
const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/cf06/results/gate6_result.json')));
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m11_routes/results/m11_result.json')));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => { const mu = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / (xs.length - 1)); };
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / (a.length - 1) / (sd(a) * sd(b)); };
function vectors(rows, key) {
  const by = (fam, arm) => new Map(rows.filter((r) => r.family === fam && r[key] === arm && !r.excluded).map((r) => [r.world, r]));
  const C = FAM.map((f) => [by(f, 'BELIEF'), by(f, 'MBVI3')]);
  const labels = [...C[0][0].keys()].filter((w) => C.every(([B, M]) => B.has(w) && M.has(w))).sort();
  return labels.map((w) => {
    const fam = C.map(([B, M]) => M.get(w).metric - B.get(w).metric);
    const [B3, M3] = C[2], [B1, M1] = C[0];
    return { G1: fam[0] + fam[1] + fam[2], RARE: fam[0], HALF: fam[1], OFTEN: fam[2], G2: B1.get(w).metric - M1.get(w).metric, G3: M3.get(w).windows.afterReversed - B3.get(w).windows.afterReversed };
  });
}
const sources = { CF06_gate6: vectors(g.rows.e5, 'name'), M11_app_graph: vectors(m.rows, 'arm') };
say('\n== 2. Recorded inputs (stored rows; BELIEF and MBVI3)');
out.recorded = {};
for (const [name, V] of Object.entries(sources)) {
  const col = (k) => V.map((v) => v[k]);
  const sF = FAM.map((f) => sd(col(f))), r = { RH: corr(col('RARE'), col('HALF')), RO: corr(col('RARE'), col('OFTEN')), HO: corr(col('HALF'), col('OFTEN')) };
  const varSumFromParts = sF[0] ** 2 + sF[1] ** 2 + sF[2] ** 2 + 2 * (r.RH * sF[0] * sF[1] + r.RO * sF[0] * sF[2] + r.HO * sF[1] * sF[2]);
  const rec = {
    n: V.length, G1: { mean: mean(col('G1')), sd: sd(col('G1')), standardized: mean(col('G1')) / sd(col('G1')) },
    familySD: Object.fromEntries(FAM.map((f, i) => [f, sF[i]])), familyCorrelation: r,
    sdOfSumFromParts: Math.sqrt(varSumFromParts), sdIfIndependent: Math.sqrt(sF[0] ** 2 + sF[1] ** 2 + sF[2] ** 2),
    G2: { mean: mean(col('G2')), sd: sd(col('G2')) }, G3: { mean: mean(col('G3')), sd: sd(col('G3')), standardized: mean(col('G3')) / sd(col('G3')) },
  };
  out.recorded[name] = rec;
  say(`   ${name}: n = ${rec.n}; G1 mean ${rec.G1.mean.toFixed(2)}, SD ${rec.G1.sd.toFixed(2)}, standardized ${rec.G1.standardized.toFixed(4)}`);
  say(`      family SDs RARE ${sF[0].toFixed(2)}, HALF ${sF[1].toFixed(2)}, OFTEN ${sF[2].toFixed(2)}; correlations RARE-HALF ${r.RH.toFixed(3)}, RARE-OFTEN ${r.RO.toFixed(3)}, HALF-OFTEN ${r.HO.toFixed(3)}`);
  say(`      SD of the sum from the parts ${rec.sdOfSumFromParts.toFixed(2)} (= the G1 SD); it would be ${rec.sdIfIndependent.toFixed(2)} if the families were independent`);
  say(`      G2 (RARE cost) mean ${rec.G2.mean.toFixed(2)}, SD ${rec.G2.sd.toFixed(2)}; G3 (OFTEN after reopenings) mean ${rec.G3.mean.toFixed(2)}, SD ${rec.G3.sd.toFixed(2)}, standardized ${rec.G3.standardized.toFixed(4)}`);
}
const smaller = Math.min(out.recorded.CF06_gate6.G1.standardized, out.recorded.M11_app_graph.G1.standardized);
say(`   smallest effect of interest: half the smaller recorded G1 effect = ${(smaller / 2).toFixed(4)}, used as ${SESOI}`);

// ---- 3. simulation with the study's own bootstrap ----
const R = 2000;
function simulate(shapeName, n, delta) {
  const rnd = makeStream(`m13|power|${shapeName}|${n}|${delta}`);
  let draw;
  if (shapeName === 'normal') draw = () => { const u = Math.max(rnd(), 1e-12), v = rnd(); return delta + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  else {   // the recorded G1 differences, standardized (mean 0, SD 1), shifted to the effect: the recorded shape, skew and tails kept
    const x = sources[shapeName].map((v) => v.G1), mu = mean(x), s = sd(x), z = x.map((v) => (v - mu) / s + delta);
    draw = () => z[Math.floor(rnd() * z.length)];
  }
  let pass = 0;
  for (let k = 0; k < R; k++) {
    const d = Array.from({ length: n }, draw);
    const b = pairedBootstrap(d, `m13|power|boot|${shapeName}|${n}|${delta}|${k}`);
    if (b.mean > 0 && b.lo > 0) pass++;
  }
  const p = pass / R;
  return { shape: shapeName, n, delta, reps: R, bootstrapResamples: 10000, power: p, monteCarloSE: Math.sqrt(p * (1 - p) / R) };
}
say(`\n== 3. Simulation: ${R} simulated studies per cell, each with pairedBootstrap (10,000 resamples), rule "mean > 0 and lower bound > 0"`);
out.simulation = [];
for (const shape of ['normal', 'CF06_gate6', 'M11_app_graph']) for (const n of [163, nAnalysed]) {
  const r = simulate(shape, n, SESOI);
  out.simulation.push(r);
  say(`   ${shape.padEnd(14)} n ${n}  delta ${SESOI}: power ${f4(r.power)} (Monte Carlo SE ${f4(r.monteCarloSE)}); analytic ${f4(power(SESOI, n))}`);
}

// ---- 4. the other criteria ----
say('\n== 4. The other criteria (analytic, normal approximation)');
const g2 = (cost, s, n) => Phi((25 - cost) / (s / Math.sqrt(n)) - Z975);
out.G2 = {};
for (const [name, rec] of Object.entries(out.recorded)) { out.G2[name] = { cost: rec.G2.mean, sd: rec.G2.sd, powerToPass: g2(rec.G2.mean, rec.G2.sd, nAnalysed) }; say(`   G2 (upper bound < 25), true cost and SD as in ${name} (${rec.G2.mean.toFixed(2)}, ${rec.G2.sd.toFixed(2)}): P(pass) at n ${nAnalysed} = ${f4(out.G2[name].powerToPass)}`); }
const sdMax = Math.max(...Object.values(out.recorded).map((r) => r.G2.sd));
const costLimit = 25 - (Z975 + Z80) * sdMax / Math.sqrt(nAnalysed);
out.G2.costPassedWith80pct = { sd: sdMax, cost: costLimit };
say(`   G2: with the larger recorded SD (${sdMax.toFixed(2)}), a true cost up to ${costLimit.toFixed(2)} steps passes with 80% probability`);
out.G3 = { powerAtSesoi: power(SESOI, nAnalysed), powerAtRecorded: Object.fromEntries(Object.entries(out.recorded).map(([k, r]) => [k, power(r.G3.standardized, nAnalysed)])) };
say(`   G3 (secondary): power ${f4(out.G3.powerAtSesoi)} at delta ${SESOI}; at the recorded G3 effects: ${Object.entries(out.G3.powerAtRecorded).map(([k, v]) => `${k} ${f4(v)}`).join(', ')}`);
say('   G4 (secondary): no earlier record measured returns for MBVI3, so no spread is known and no power is claimed; the result reports its minimum detectable effect, 2.80 SD / sqrt(n)');
out.G4 = { note: 'no prior variance; power not claimed; MDE80 = (z_0.975 + z_0.80) SD / sqrt(n) reported with the result' };

fs.writeFileSync(path.join(HERE, 'power_m13.out'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(HERE, 'power_m13.json'), JSON.stringify(out, null, 1) + '\n');

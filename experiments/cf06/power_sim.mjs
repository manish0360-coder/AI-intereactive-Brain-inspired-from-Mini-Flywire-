// ==========================================================
// CF-06 — simulated power of the gate's decision rule for candidate sample sizes (design aid; reads development rows)
// ==========================================================
//   node experiments/cf06/power_sim.mjs <dev result file written by run_gate.mjs --domain dev> [--sims 1000] [--boot 1000]
//
// What it does.  For each development world it forms the vector of per-world differences the criteria use
//   B1_X  sum over RARE + HALF + OFTEN of steps(X) - steps(BELIEF), X in MBVI3, RECALL_003, RECALL_01, RECALL_03
//   B2    RARE  steps(BELIEF) - steps(MBVI3)                       (passes if the upper bound < 25)
//   B3    OFTEN steps(MBVI3) - steps(BELIEF)
//   B4a   OFTEN steps after reversed events, MBVI3 - BELIEF
//   B4b   RARE  futile re-tests, RECALL_01 - BELIEF
// (B5 is exactly zero in every development world and is taken to pass.)  A simulated gate of n worlds draws n world
// vectors with replacement, so the dependence between the criteria within a world is kept, and applies the driver's
// rule: a percentile bootstrap over worlds (the stats.mjs convention: lo = sorted[floor(0.025 B)], hi =
// sorted[ceil(0.975 B) - 1]); "mean > 0 and lower bound > 0" for B1, B3, B4a, B4b; "upper bound < 25" for B2.
// SUPPORTED = all of them.  It also applies gainShape (every B1 part and B3: more worlds in favour than against, a
// positive median, and a positive mean once the most favourable 10% of worlds are removed).
//
// Scenarios.  DEV: the development differences as they are.  HALF: every benefit column shifted down by half its
// development mean (the spread is kept; B2 is not shifted).  HALF_B2: HALF, and B2 shifted so that its mean is +8.2 steps
// (BELIEF's cost against the planner on the development worlds where nothing reversed), a pessimistic case for B2.
//
// Assumptions, stated: the 20 development worlds stand for the population of worlds (their tails are all the tails the
// simulation knows; a heavier tail in fresh worlds lowers power); location shifts model a smaller true effect; the
// bootstrap inside each simulated gate uses fewer resamples than the gate's 10,000 (Monte Carlo noise in the bounds).
// The development worlds chose the primary, so DEV is optimistic; HALF is the planning case.  Deterministic.
// ==========================================================
import fs from 'node:fs';
import { makeStream } from '../../cognitive/testbed/rng.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node experiments/cf06/power_sim.mjs <dev result file> [--sims N] [--boot B]'); process.exit(2); }
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SIMS = arg('--sims', 1000), BOOT = arg('--boot', 1000), MARGIN = 25;
const SIZES = [60, 100, 135, 200];
const R = JSON.parse(fs.readFileSync(file, 'utf8'));
if (R.domain !== 'dev') throw new Error('power_sim reads development results only');

const rows = R.rows.e5.flat().filter((r) => !r.excluded);
const cell = (f, n) => new Map(rows.filter((r) => r.family === f && r.name === n).map((r) => [r.world, r]));
const FAM = ['RARE', 'HALF', 'OFTEN'], FIXED = ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03'];
const worlds = [...cell('RARE', 'BELIEF').keys()].sort();
const mix = (n, w) => FAM.reduce((s, f) => s + cell(f, n).get(w).metric, 0);
const COLS = [...FIXED.map((x) => `B1_${x}`), 'B2', 'B3', 'B4a', 'B4b'];
const LB = new Set([...FIXED.map((x) => `B1_${x}`), 'B3', 'B4a', 'B4b']), SHAPE = [...FIXED.map((x) => `B1_${x}`), 'B3'];
const base = worlds.map((w) => [
  ...FIXED.map((x) => mix(x, w) - mix('BELIEF', w)),
  cell('RARE', 'BELIEF').get(w).metric - cell('RARE', 'MBVI3').get(w).metric,
  cell('OFTEN', 'MBVI3').get(w).metric - cell('OFTEN', 'BELIEF').get(w).metric,
  cell('OFTEN', 'MBVI3').get(w).windows.afterReversed - cell('OFTEN', 'BELIEF').get(w).windows.afterReversed,
  cell('RARE', 'RECALL_01').get(w).diagnostics.futileRetests - cell('RARE', 'BELIEF').get(w).diagnostics.futileRetests,
]);
const K = COLS.length, W = base.length;
const colMean = COLS.map((_, j) => base.reduce((s, v) => s + v[j], 0) / W);
const colSd = COLS.map((_, j) => Math.sqrt(base.reduce((s, v) => s + (v[j] - colMean[j]) ** 2, 0) / (W - 1)));
const scenario = (name) => base.map((v) => v.map((x, j) => {
  if (name === 'DEV') return x;
  if (LB.has(COLS[j])) return x - colMean[j] / 2;
  return name === 'HALF_B2' ? x - colMean[j] + 8.2 : x;
}));

const median = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const consistent = (xs) => {
  const pos = xs.filter((x) => x > 0).length, neg = xs.filter((x) => x < 0).length, s = [...xs].sort((a, b) => b - a), k = Math.ceil(0.1 * xs.length);
  const rest = s.slice(k);
  return pos > neg && median(xs) > 0 && rest.reduce((a, b) => a + b, 0) / rest.length > 0;
};

function simulate(data, n, label) {
  const rnd = makeStream(`cf|power|cf06|${label}|${n}`);
  const pass = Object.fromEntries(COLS.map((c) => [c, 0]));
  let b1 = 0, supported = 0, cons = 0, supportedConsistent = 0;
  const sample = new Array(n), sums = new Float64Array(K), means = COLS.map(() => new Float64Array(BOOT));
  for (let s = 0; s < SIMS; s++) {
    for (let i = 0; i < n; i++) sample[i] = data[Math.floor(rnd() * W)];
    for (let b = 0; b < BOOT; b++) {
      sums.fill(0);
      for (let i = 0; i < n; i++) { const v = sample[Math.floor(rnd() * n)]; for (let j = 0; j < K; j++) sums[j] += v[j]; }
      for (let j = 0; j < K; j++) means[j][b] = sums[j] / n;
    }
    const ok = {};
    COLS.forEach((c, j) => {
      const m = sample.reduce((a, v) => a + v[j], 0) / n, sorted = means[j].sort();
      const lo = sorted[Math.floor(0.025 * BOOT)], hi = sorted[Math.ceil(0.975 * BOOT) - 1];
      ok[c] = c === 'B2' ? hi < MARGIN : m > 0 && lo > 0;
      if (ok[c]) pass[c]++;
    });
    const B1 = FIXED.every((x) => ok[`B1_${x}`]), all = B1 && ok.B2 && ok.B3 && ok.B4a && ok.B4b;
    const shape = SHAPE.every((c) => consistent(sample.map((v) => v[COLS.indexOf(c)])));
    b1 += B1; supported += all; cons += shape; supportedConsistent += all && shape;
  }
  const p = (x) => x / SIMS;
  return { n, ...Object.fromEntries(COLS.map((c) => [c, p(pass[c])])), B1: p(b1), SUPPORTED: p(supported), CONSISTENT: p(cons), SUPPORTED_AND_CONSISTENT: p(supportedConsistent) };
}

// Normal approximation, for comparison: power ~ Phi(|effect| / (SD / sqrt n) - 1.96).
const Phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; };
const analytic = (scale) => Object.fromEntries(SIZES.map((n) => [n, Object.fromEntries(COLS.map((c, j) => {
  const se = colSd[j] / Math.sqrt(n);
  return [c, c === 'B2' ? Phi((MARGIN - (scale === 'HALF_B2' ? 8.2 : colMean[j])) / se - 1.96) : Phi((scale === 'DEV' ? colMean[j] : colMean[j] / 2) / se - 1.96)];
}))]));

const out = {
  design: 'CF-06 simulated power (development rows; not evidence)', source: { file: R.evidence, rowsSha256: R.rowsSha256, worlds: W },
  sims: SIMS, bootstrapResamplesPerSimulatedGate: BOOT, monteCarloSE: Math.sqrt(0.25 / SIMS),
  columns: COLS.map((c, j) => ({ criterion: c, devMean: colMean[j], devSd: colSd[j] })),
  simulated: {}, normalApproximation: {},
};
for (const sc of ['DEV', 'HALF', 'HALF_B2']) {
  const data = scenario(sc);
  out.simulated[sc] = SIZES.map((n) => simulate(data, n, sc));
  out.normalApproximation[sc] = analytic(sc);
}
console.log(JSON.stringify(out, null, 1));

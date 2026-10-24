// development tooling (NOT a study run): independent verification of the LEARN-0 sample-size arithmetic and operating characteristics.
//   node tools/sizing_learn0.mjs [replications=400]      -> evidence/sizing_learn0.json
// 1. recomputes the development SD of E1 from evidence/calib_learn0_rows.json (not from the summary);
// 2. the closed form (sizing.mjs): exact quantiles, the programme rule, the SD interval, the inflation's equivalent confidence level,
//    label probabilities, the effect classified LEARNS with 80 %, n for alternative objectives;
// 3. a percentile-bootstrap interval for the SD itself (no normality assumption);
// 4. Monte Carlo of the label probabilities THROUGH the analysis' own code path (xfer1/stats.mjs pairedSummary with the design's bootstrap
//    settings and config.classifyE1) at n = 360, under (a) normal differences and (b) the development differences' own shape (resampled,
//    centred, rescaled).  Deterministic seeds.  Uses no study world.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as C from '../config.mjs';
import { closedForm } from '../sizing.mjs';
import { pairedSummary, prng, mean, sd } from '../../xfer1/stats.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..');
const R = Number(process.argv[2] || 400);
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'evidence', 'calib_learn0_rows.json'), 'utf8')).rows;
const diffs = Object.keys(rows).sort((a, b) => a - b).map(w => rows[w].cells.N1.legal - rows[w].cells.N0.legal);
const devSd = sd(diffs), devMean = mean(diffs);
const cf = closedForm({ devSd, devN: diffs.length, inflation: C.SIZING.inflation, delta: C.MARGIN.delta, n: C.WORLDS_N });

// SD interval without normality: percentile bootstrap of the SD over the 30 development worlds
const sdBoot = (() => { const r = prng(20261024), B = 10000, out = new Array(B);
  for (let b = 0; b < B; b++) { const s = Array.from({ length: diffs.length }, () => diffs[Math.floor(r() * diffs.length)]); out[b] = sd(s); }
  out.sort((a, b) => a - b); return { lower: out[Math.floor(0.025 * B)], upper: out[Math.floor(0.975 * B)], level: 0.95, replicates: B, seed: 20261024 }; })();
const m3 = mean(diffs.map(d => (d - devMean) ** 3)) / devSd ** 3, m4 = mean(diffs.map(d => (d - devMean) ** 4)) / devSd ** 4 - 3;

// Monte Carlo through the analysis' own bootstrap and decision rule
const sdTarget = devSd * C.SIZING.inflation;
const gauss = (r) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const shape = diffs.map(d => (d - devMean) / devSd);
const models = { normal: (r) => gauss(r), developmentShape: (r) => shape[Math.floor(r() * shape.length)] };
const mus = [-40, -20, 0, 20, 40], mc = {};
for (const [name, draw] of Object.entries(models)) {
  mc[name] = {};
  for (const mu of mus) {
    const r = prng(1000003 * (mus.indexOf(mu) + 1) + (name === 'normal' ? 7 : 11)), tally = { LEARNS_WITHOUT_MAP: 0, EXPERIENCE_HARMS_WITHOUT_MAP: 0, NO_PRACTICAL_EFFECT: 0, INCONCLUSIVE: 0 };
    for (let k = 0; k < R; k++) { const x = Array.from({ length: C.WORLDS_N }, () => mu + sdTarget * draw(r)); tally[C.classifyE1(pairedSummary(x, C.BOOT).ci)]++; }
    mc[name][mu] = Object.fromEntries(Object.entries(tally).map(([l, c]) => [l, c / R]));
  }
}
const cfAt = (mu) => cf.scenarios.inflated.oc[mu];
const maxAbsDev = Math.max(...Object.values(mc).flatMap(m => mus.flatMap(mu => Object.keys(m[mu]).map(l => Math.abs(m[mu][l] - cfAt(mu)[l])))));
const out = { schema: `${C.SCHEMA}.sizing`, status: 'DEVELOPMENT (XFER-1 worlds 0..29; no study world)', devDifferences: { n: diffs.length, mean: devMean, sd: devSd, skewness: m3, excessKurtosis: m4 },
  closedForm: cf, sdBootstrapInterval: sdBoot,
  monteCarlo: { replications: R, n: C.WORLDS_N, sd: sdTarget, bootstrap: C.BOOT, models: Object.keys(models), result: mc, maxAbsDeviationFromClosedForm: maxAbsDev,
    mcStandardErrorAtHalf: Math.sqrt(0.25 / R) } };
fs.writeFileSync(path.join(ROOT, 'evidence', 'sizing_learn0.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ dev: out.devDifferences, sdInterval95: cf.sdInterval95, sdBoot: [sdBoot.lower, sdBoot.upper], inflationLevel: cf.inflationOneSidedUcLevel, nRule: cf.nRule, nForNoEffect80: cf.nForNoEffect80,
  detectable: Object.fromEntries(Object.entries(cf.scenarios).map(([k, s]) => [k, s.detectableAt80])), atMargin: cf.atMarginForAnyN, mcMaxAbsDev: maxAbsDev }, null, 1));
for (const [name, m] of Object.entries(mc)) for (const mu of mus) console.log(name, mu, JSON.stringify(m[mu]), 'closed form', JSON.stringify(cfAt(mu)));

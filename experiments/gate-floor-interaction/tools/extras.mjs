// scratch: extra descriptive numbers for the design report (dev calibration only) - candidate-class counters, move composition,
// per-goal breakdown, and the sample-size table from the paired SDs
import fs from 'node:fs';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const { pairedSummary, mean, sd } = await import(`file:///${REPO}/experiments/xfer1/stats.mjs`);
const X1 = await import(`file:///${REPO}/experiments/xfer1/config.mjs`);
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = Object.keys(D.rows).map(Number);
const f = (x, d = 1) => Number(x).toFixed(d);
const out = {};
// candidate classes reaching the admission test, and executed-move composition (per session means)
out.candidateClasses = {};
for (const c of D.cells) {
  const g = (k) => mean(W.map(w => D.rows[w].cells[c].guard[k]));
  const m = (k) => mean(W.map(w => D.rows[w].cells[c].moveClass[k]));
  out.candidateClasses[c] = { admittedGraph: g('admittedGraph'), nonGraphReachingAdmission: g('nonGraphTrained') + g('nonGraphHuman') + g('nonGraphBoth'), maskedOut: g('maskedOut'), blockedIllegal: g('blockedIllegal'),
    movesLegal: m('legal'), movesNonGraph: m('nonGraph'), movesSelf: m('self'), movesNone: m('none') };
}
// the stored non-graph pathway is large relative to what is executed
const g0 = D.cells.filter(c => c.endsWith('_G0'));
out.guardOffNonGraphAdmissionsPerExecutedNonGraphMove = mean(g0.map(c => (out.candidateClasses[c].nonGraphReachingAdmission) / Math.max(1, out.candidateClasses[c].movesNonGraph)));
// per goal group: guard effect at REAL,F1; interaction at F1; deficit under G0 and G1
const goals = [8, 12, 16, 19];
const cellV = (c, k, w) => D.rows[w].cells[c][k];
out.perGoal = {};
for (const gl of goals) {
  const ws = W.filter(w => D.rows[w].goal === gl);
  const d = (fn) => { const xs = ws.map(fn); return { n: ws.length, mean: mean(xs), sd: ws.length > 1 ? sd(xs) : null }; };
  out.perGoal[gl] = { guardRealF1: d(w => cellV('REAL_F1_G1', 'legal', w) - cellV('REAL_F1_G0', 'legal', w)), guardRealF0: d(w => cellV('REAL_F0_G1', 'legal', w) - cellV('REAL_F0_G0', 'legal', w)),
    floorRealG0: d(w => cellV('REAL_F1_G0', 'legal', w) - cellV('REAL_F0_G0', 'legal', w)), floorRealG1: d(w => cellV('REAL_F1_G1', 'legal', w) - cellV('REAL_F0_G1', 'legal', w)),
    deficitG0: d(w => cellV('REAL_F1_G0', 'legal', w) - cellV('COLD_F1_G0', 'legal', w)), deficitG1: d(w => cellV('REAL_F1_G1', 'legal', w) - cellV('COLD_F1_G1', 'legal', w)) };
}
// sample-size table: n >= ((z_{1-alpha/2} + z_{power}) * SD / delta)^2 for each contrast at the declared margin 20 (80 % power)
const S = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const z = (p) => { // inverse normal CDF (Acklam), enough precision for a design table
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
};
const delta = 20, power = 0.8;
const zA = { unadjusted: z(1 - 0.05 / 2), bonferroni3: z(1 - 0.05 / 6) }, zB = z(power);
out.sampleSize = { delta, power, zAlpha: zA, zPower: zB, rows: {} };
for (const [name, v] of Object.entries(S.contrasts)) {
  const sdv = v.legal.sd;
  out.sampleSize.rows[name] = { sd: sdv, nUnadjusted: Math.ceil(((zA.unadjusted + zB) * sdv / delta) ** 2), nBonferroni3: Math.ceil(((zA.bonferroni3 + zB) * sdv / delta) ** 2),
    nBonferroni3Sd125: Math.ceil(((zA.bonferroni3 + zB) * sdv * 1.25 / delta) ** 2), mdeAt280Bonferroni3: (zA.bonferroni3 + zB) * sdv / Math.sqrt(280) };
}
fs.writeFileSync(process.argv[4], JSON.stringify(out, null, 1));
console.log('candidate classes / moves per session:'); for (const [c, x] of Object.entries(out.candidateClasses)) console.log(' ', c.padEnd(13), `graph-admitted ${f(x.admittedGraph, 0)} | non-graph reaching admission ${f(x.nonGraphReachingAdmission, 0)} | masked ${f(x.maskedOut, 0)} | blocked ${f(x.blockedIllegal)} | moves legal ${f(x.movesLegal, 0)} nonGraph ${f(x.movesNonGraph)} none ${f(x.movesNone)}`);
console.log('guard-OFF non-graph admissions per executed non-graph move:', f(out.guardOffNonGraphAdmissionsPerExecutedNonGraphMove, 1));
console.log('per goal (n=10 each; descriptive):'); for (const [g, x] of Object.entries(out.perGoal)) console.log(`  goal ${g}: guard|REAL,F1 ${f(x.guardRealF1.mean)} | guard|REAL,F0 ${f(x.guardRealF0.mean)} | floor|REAL,G0 ${f(x.floorRealG0.mean)} | floor|REAL,G1 ${f(x.floorRealG1.mean)} | deficit G0 ${f(x.deficitG0.mean)} -> G1 ${f(x.deficitG1.mean)}`);
console.log(`z: alpha ${f(zA.unadjusted, 3)} / bonf3 ${f(zA.bonferroni3, 3)}, power ${f(zB, 3)}`);
console.log('n needed at delta 20 (80% power): contrast | SD | n(95%) | n(Bonf-3) | n(Bonf-3, SD x1.25) | MDE at n=280 (Bonf-3)');
for (const [name, x] of Object.entries(out.sampleSize.rows)) console.log(`  ${name.padEnd(40)} ${f(x.sd)} | ${x.nUnadjusted} | ${x.nBonferroni3} | ${x.nBonferroni3Sd125} | ${f(x.mdeAt280Bonferroni3)}`);

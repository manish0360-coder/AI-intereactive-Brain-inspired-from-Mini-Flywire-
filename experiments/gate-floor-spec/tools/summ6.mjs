// scratch: contrasts, paired SDs, structural facts and the sample-size table of the six-cell development calibration
//   node summ6.mjs <calib6_rows.json> <out.json>
import fs from 'node:fs';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const { pairedSummary, mean, sd } = await import(`file:///${REPO}/experiments/xfer1/stats.mjs`);
const X1 = await import(`file:///${REPO}/experiments/xfer1/config.mjs`);
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = Object.keys(D.rows).map(Number).filter(w => D.cells.every(c => D.rows[w].cells[c]) && D.rows[w].store.U && D.rows[w].store.G);
const v = (c, k) => (w) => D.rows[w].cells[c][k];
const sub = (a, b) => (w) => a(w) - b(w);
const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
const out = { worlds: W.length, cellMeans: {}, contrasts: {}, store: {}, structure: {} };
console.log(`worlds ${W.length}`);
console.log('cell        legal  nonGraph  total  staleResets  decisionNonEdge  moves.nonGraph  masked  blocked');
for (const c of D.cells) { const m = (k) => mean(W.map(v(c, k))); const mk = (k) => mean(W.map(w => D.rows[w].cells[c].kinds[k])); const mv = (k) => mean(W.map(w => D.rows[w].cells[c].moves[k])); const gm = (k) => mean(W.map(w => D.rows[w].cells[c].guard[k]));
  out.cellMeans[c] = { legal: m('legal'), nonEdge: m('nonEdge'), all: m('all'), stale: mk('stale'), decisionNonEdge: mk('decisionNonEdge'), movesNonGraph: mv('nonGraph'), masked: gm('maskedOut'), blocked: gm('blockedIllegal'), admittedNonGraph: gm('admitted') };
  console.log(`${c.padEnd(10)} ${f(m('legal')).padStart(6)} ${f(m('nonEdge')).padStart(8)} ${f(m('all')).padStart(6)} ${f(mk('stale')).padStart(11)} ${f(mk('decisionNonEdge')).padStart(15)} ${f(mv('nonGraph')).padStart(14)} ${f(gm('maskedOut'), 0).padStart(7)} ${f(gm('blockedIllegal')).padStart(8)}`); }
const C = [
  ['retrofit: bundle at test, legacy store (U_both - U_off)  [Block I replicate]', sub(v('U_both', 'legal'), v('U_off', 'legal')), 'U_both', 'U_off'],
  ['PS1 scope: guard-trained vs legacy store, bundle at test (G_both - U_both)', sub(v('G_both', 'legal'), v('U_both', 'legal'))],
  ['PS2 package: guard-trained + bundle vs legacy + floor only (G_both - U_off)', sub(v('G_both', 'legal'), v('U_off', 'legal'))],
  ['mask-only effect (U_mask - U_off)', sub(v('U_mask', 'legal'), v('U_off', 'legal'))],
  ['exec-only effect (U_exec - U_off)', sub(v('U_exec', 'legal'), v('U_off', 'legal'))],
  ['PS3 shortfall of mask-only vs bundle (U_both - U_mask)', sub(v('U_both', 'legal'), v('U_mask', 'legal'))],
  ['PS4 shortfall of exec-only vs bundle (U_both - U_exec)', sub(v('U_both', 'legal'), v('U_exec', 'legal'))],
  ['store-cleanliness without a runtime guard (G_off - U_off)  [mechanistic, not a production scenario]', sub(v('G_off', 'legal'), v('U_off', 'legal'))],
  ['scope x runtime-guard interaction ((G_both - G_off) - (U_both - U_off))', (w) => (v('G_both', 'legal')(w) - v('G_off', 'legal')(w)) - (v('U_both', 'legal')(w) - v('U_off', 'legal')(w))],
];
console.log('\ncontrast (LEGAL reaches)                                                         mean [95% CI] (paired SD) | non-graph mean | total mean');
for (const [name, fn] of C) {
  const L = W.map(fn); const s = pairedSummary(L, X1.BOOTSTRAP);
  const nonFn = (k) => name.startsWith('PS1') ? W.map(sub(v('G_both', k), v('U_both', k))) : name.startsWith('PS2') ? W.map(sub(v('G_both', k), v('U_off', k))) : name.startsWith('PS3') ? W.map(sub(v('U_both', k), v('U_mask', k))) : name.startsWith('PS4') ? W.map(sub(v('U_both', k), v('U_exec', k))) : name.startsWith('mask-only') ? W.map(sub(v('U_mask', k), v('U_off', k))) : name.startsWith('exec-only') ? W.map(sub(v('U_exec', k), v('U_off', k))) : name.startsWith('retrofit') ? W.map(sub(v('U_both', k), v('U_off', k))) : null;
  const nn = nonFn('nonEdge'), aa = nonFn('all');
  out.contrasts[name] = { legal: { mean: s.mean, lower: s.ci.lower, upper: s.ci.upper, sd: sd(L) }, nonEdge: nn ? mean(nn) : null, all: aa ? mean(aa) : null };
  console.log(`${name.slice(0, 82).padEnd(82)} ${f(s.mean).padStart(7)} [${f(s.ci.lower)}, ${f(s.ci.upper)}] (SD ${f(sd(L))}) | ${nn ? f(mean(nn)) : '-'} | ${aa ? f(mean(aa)) : '-'}`);
}
// the two stores
const st = (kind, k) => mean(W.map(w => D.rows[w].store[kind][k]));
for (const kind of ['U', 'G']) out.store[kind] = { episodes: st(kind, 'episodes'), pairs: st(kind, 'pairs'), nonGraphPairs: st(kind, 'nonGraphPairs'), terminalNonGraph: st(kind, 'terminalNonGraph'), trainLegal: st(kind, 'trainLegal'), trainNonGraph: st(kind, 'trainNonGraph'),
  worldsWithAnyNonGraphPair: W.filter(w => D.rows[w].store[kind].nonGraphPairs > 0).length };
console.log('\nstores (mean per world): ', JSON.stringify(out.store));
const epRatio = W.map(w => D.rows[w].store.G.episodes / Math.max(1, D.rows[w].store.U.episodes));
out.store.episodeRatioGoverU = { mean: mean(epRatio), min: Math.min(...epRatio), max: Math.max(...epRatio) };
console.log('episodes G/U ratio', JSON.stringify(out.store.episodeRatioGoverU));
// structure
const cell = (c) => W.map(w => D.rows[w].cells[c]);
const cnt = (c, f2) => cell(c).filter(f2).length;
out.structure = { bundleNonGraphResetsZero: ['U_both', 'G_both'].map(c => cnt(c, x => x.nonEdge === 0)), execOnlyNonGraphResetsZero: cnt('U_exec', x => x.nonEdge === 0), maskOnlyDecisionNonEdgeZero: cnt('U_mask', x => x.kinds.decisionNonEdge === 0),
  maskOnlyMovesNonGraphZero: cnt('U_mask', x => x.moves.nonGraph === 0), guardOffMaskedBlockedZero: ['U_off', 'G_off'].map(c => cnt(c, x => x.guard.maskedOut === 0 && x.guard.blockedIllegal === 0)), integrityOk: D.cells.map(c => cnt(c, x => x.integrityOk)), consistent: D.cells.map(c => cnt(c, x => x.consistent)) };
console.log('structure (counts of', W.length, 'worlds):', JSON.stringify(out.structure));
// sample size: n >= ((z_{1-a/2m} + z_.8) SD / delta)^2, delta 20, family m
const z = (p) => { const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00], b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
  c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00], d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]; const pl = 0.02425; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); };
const zB = z(0.8); const delta = 20; out.sampleSize = {};
console.log('\nsample size at delta 20, power 80%: contrast | SD | n(Bonf-4) | n(Bonf-4, SD x1.25) | MDE at n=280 / 360 (Bonf-4)');
for (const m of [3, 4]) { const zA = z(1 - 0.05 / (2 * m)); out.sampleSize[`family${m}`] = {};
  for (const [name, x] of Object.entries(out.contrasts)) { const sdv = x.legal.sd; const nn = Math.ceil(((zA + zB) * sdv / delta) ** 2), ni = Math.ceil(((zA + zB) * sdv * 1.25 / delta) ** 2);
    out.sampleSize[`family${m}`][name] = { sd: sdv, n: nn, nInflated: ni, mde280: (zA + zB) * sdv / Math.sqrt(280), mde360: (zA + zB) * sdv / Math.sqrt(360) };
    if (m === 4) console.log(`  ${name.slice(0, 70).padEnd(70)} ${f(sdv)} | ${nn} | ${ni} | ${f((zA + zB) * sdv / Math.sqrt(280))} / ${f((zA + zB) * sdv / Math.sqrt(360))}`); } }
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));

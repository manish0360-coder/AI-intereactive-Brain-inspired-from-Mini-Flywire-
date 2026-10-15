// scratch: contrasts, paired SDs and structural checks of the development calibration
import fs from 'node:fs';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url)));   // repository root
const { pairedSummary, mean, sd } = await import(`file:///${REPO}/experiments/xfer1/stats.mjs`);
const X1 = await import(`file:///${REPO}/experiments/xfer1/config.mjs`);
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = Object.keys(D.rows).map(Number).filter(w => D.cells.every(c => D.rows[w].cells[c]));
const v = (c, k) => (w) => D.rows[w].cells[c][k];
const sub = (a, b) => (w) => a(w) - b(w);
const cell = (s, f, g, k) => v(`${s}_F${f}_G${g}`, k);
const C = [];
for (const s of ['COLD', 'REAL']) for (const g of [0, 1]) C.push([`floor | ${s}, G${g}`, (k) => sub(cell(s, 1, g, k), cell(s, 0, g, k))]);
for (const s of ['COLD', 'REAL']) for (const f of [0, 1]) C.push([`guard | ${s}, F${f}`, (k) => sub(cell(s, f, 1, k), cell(s, f, 0, k))]);
for (const f of [0, 1]) for (const g of [0, 1]) C.push([`store(REAL-COLD) | F${f}, G${g}`, (k) => sub(cell('REAL', f, g, k), cell('COLD', f, g, k))]);
for (const f of [0, 1]) C.push([`INTERACTION store x guard | F${f}`, (k) => sub(sub(cell('REAL', f, 1, k), cell('COLD', f, 1, k)), sub(cell('REAL', f, 0, k), cell('COLD', f, 0, k)))]);
for (const s of ['COLD', 'REAL']) C.push([`INTERACTION floor x guard | ${s}`, (k) => sub(sub(cell(s, 1, 1, k), cell(s, 0, 1, k)), sub(cell(s, 1, 0, k), cell(s, 0, 0, k)))]);
for (const g of [0, 1]) C.push([`INTERACTION store x floor | G${g}`, (k) => sub(sub(cell('REAL', 1, g, k), cell('COLD', 1, g, k)), sub(cell('REAL', 0, g, k), cell('COLD', 0, g, k)))]);
C.push(['3-WAY store x floor x guard', (k) => sub(sub(sub(cell('REAL', 1, 1, k), cell('COLD', 1, 1, k)), sub(cell('REAL', 1, 0, k), cell('COLD', 1, 0, k))), sub(sub(cell('REAL', 0, 1, k), cell('COLD', 0, 1, k)), sub(cell('REAL', 0, 0, k), cell('COLD', 0, 0, k))))]);
const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
const out = { worlds: W.length, cellMeans: {}, contrasts: {} };
console.log(`worlds ${W.length}`);
console.log('cell means (legal / non-graph / all / blockedIllegal / maskedOut):');
for (const c of D.cells) { const m = (k) => mean(W.map(v(c, k))); const gm = (key) => mean(W.map(w => (D.rows[w].cells[c].guard ? D.rows[w].cells[c].guard[key] : 0)));
  out.cellMeans[c] = { legal: m('legal'), nonEdge: m('nonEdge'), all: m('all'), blockedIllegal: gm('blockedIllegal'), maskedOut: gm('maskedOut') };
  console.log(`  ${c.padEnd(14)} ${f(m('legal'))} / ${f(m('nonEdge'))} / ${f(m('all'))} / ${f(gm('blockedIllegal'))} / ${f(gm('maskedOut'), 0)}`); }
console.log('\ncontrast                                   LEGAL mean [95% CI] (paired SD)            | non-graph mean | all-resets mean');
for (const [name, fn] of C) {
  const L = W.map(fn('legal')), N = W.map(fn('nonEdge')), A = W.map(fn('all'));
  const s = pairedSummary(L, X1.BOOTSTRAP);
  out.contrasts[name] = { legal: { mean: s.mean, lower: s.ci.lower, upper: s.ci.upper, sd: sd(L) }, nonEdge: { mean: mean(N), sd: sd(N) }, all: { mean: mean(A), sd: sd(A) } };
  console.log(`${name.padEnd(40)} ${f(s.mean).padStart(7)} [${f(s.ci.lower)}, ${f(s.ci.upper)}] (SD ${f(sd(L))})`.padEnd(100) + `| ${f(mean(N)).padStart(7)} | ${f(mean(A)).padStart(7)}`);
}
// structural checks
const gOn = D.cells.filter(c => c.endsWith('_G1'));
console.log('\nguard-ON sessions: non-graph resets > 0 in', W.reduce((s, w) => s + gOn.filter(c => D.rows[w].cells[c].nonEdge > 0).length, 0), 'of', W.length * gOn.length,
  '| executed non-graph moves > 0 in', W.reduce((s, w) => s + gOn.filter(c => D.rows[w].cells[c].moveClass.nonGraph > 0).length, 0),
  '| blockedIllegal mean', f(mean(W.flatMap(w => gOn.map(c => D.rows[w].cells[c].guard.blockedIllegal)))), 'max', Math.max(...W.flatMap(w => gOn.map(c => D.rows[w].cells[c].guard.blockedIllegal))));
console.log('integrity ok in', W.reduce((s, w) => s + D.cells.filter(c => D.rows[w].cells[c].integrityOk).length, 0), 'of', W.length * D.cells.length, '| audit consistent', W.reduce((s, w) => s + D.cells.filter(c => D.rows[w].cells[c].consistent).length, 0));
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));

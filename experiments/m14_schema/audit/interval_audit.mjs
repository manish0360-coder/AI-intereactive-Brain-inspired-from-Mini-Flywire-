// M14 interval audit (owner-requested, 2026-11-18, after the result). Scratch only; changes nothing.
// Imports NOTHING from the repository: the seed (SHA-256 -> first 4 bytes, big-endian), the generator (mulberry32),
// the paired percentile bootstrap, the string ordering of labels and every difference are re-implemented here from
// their specification, then compared EXACTLY (===) with what the run stored.
// Usage: node m14_interval_audit.mjs <repo root>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.argv[2], M = path.join(ROOT, 'experiments/m14_schema');
const fails = [];
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails.push(m); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---- independent primitives ----
function seed32(label) { const h = crypto.createHash('sha256').update(String(label)).digest(); return ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0; }
function mulberry32(label) {
  let st = seed32(label) || 1;
  return () => { st = (st + 0x6d2b79f5) | 0; let t = st; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function bootstrap(d, label, B = 10000) {
  const n = d.length;
  let tot = 0; for (const x of d) tot += x;
  const r = mulberry32(label), m = new Array(B);
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(r() * n)]; m[b] = s / n; }
  m.sort((x, y) => x - y);
  return { n, mean: tot / n, lo: m[Math.floor(B * 25 / 1000)], hi: m[Math.ceil(B * 975 / 1000) - 1] };
}
// string order by UTF-16 code units, written out (what Array.prototype.sort does by default for strings)
const byCodeUnits = (x, y) => { for (let i = 0; i < Math.min(x.length, y.length); i++) { const a = x.charCodeAt(i), b = y.charCodeAt(i); if (a !== b) return a - b; } return x.length - y.length; };

// ---- the stored run ----
const rawResult = fs.readFileSync(path.join(M, 'results/m14_result.json'));
const j = JSON.parse(rawResult);
const C = j.analysis.criteria, S2 = j.analysis.secondary;
const SPEC = {
  P1: ['CONCRETE', 'SCHEMA', 'COMPOSE', 0, C.P1], P2: ['SCHEMA_SHUFFLED', 'SCHEMA', 'COMPOSE', 0, C.P2], S: ['SCHEMA', 'CONCRETE', 'NULL', 0, C.S],
  R1: ['SCHEMA', 'CONCRETE', 'REVERSED', 0, S2.R1_reversedHarm], R2: ['SCHEMA', 'CONCRETE', 'REVERSED', 2, S2.R2_reversedThird], O: ['SCHEMA', 'ORACLE_SCHEMA', 'COMPOSE', 0, S2.O_shortfall],
  H: ['CONCRETE', 'ORACLE_SCHEMA', 'COMPOSE', 0, S2.H_oracle], SH: ['CONCRETE', 'SCHEMA_SHUFFLED', 'COMPOSE', 0, S2.SH_shuffledVsConcrete], E2: ['CONCRETE', 'SCHEMA', 'COMPOSE', 1, S2.E2_compose], E3: ['CONCRETE', 'SCHEMA', 'COMPOSE', 2, S2.E3_compose],
};
const rowsOf = (arm, cond) => { const m = new Map(); for (const r of j.rows) if (r.arm === arm && r.tests[cond]) m.set(r.trial, r); return m; };

// 1. ordering
const all = [...rowsOf('CONCRETE', 'COMPOSE').keys()];
const stringOrder = [...all].sort(byCodeUnits), numericOrder = [...all].sort((x, y) => Number(x.split('|')[2]) - Number(y.split('|')[2]));
ok(JSON.stringify(stringOrder) === JSON.stringify([...all].sort()), `own code-unit order equals the driver's default .sort() (first labels ${stringOrder.slice(0, 4).join(', ')})`);
ok(JSON.stringify(stringOrder) !== JSON.stringify(numericOrder), 'string order differs from numeric order (the pre-run checker\'s order)');

// 2. the ten contrasts, driver order, exact
const mine = {}, numeric = {};
console.log('\ncontrast  stored mean / lo / hi                       own (string order)                       exact');
for (const [k, [X, Y, c, e, st]] of Object.entries(SPEC)) {
  const a = rowsOf(X, c), b = rowsOf(Y, c);
  const labels = [...a.keys()].filter((l) => b.has(l)).sort(byCodeUnits);
  const d = labels.map((l) => a.get(l).tests[c][e].steps - b.get(l).tests[c][e].steps);
  mine[k] = bootstrap(d, `m14schema|stats|m14|${k}`);
  numeric[k] = bootstrap(numericOrder.map((l) => a.get(l).tests[c][e].steps - b.get(l).tests[c][e].steps), `m14schema|stats|m14|${k}`);
  const exact = mine[k].n === st.n && mine[k].mean === st.mean && mine[k].lo === st.lo && mine[k].hi === st.hi;
  console.log(`  ${k.padEnd(3)}    ${st.mean.toFixed(6)} [${st.lo.toFixed(6)}, ${st.hi.toFixed(6)}]   ${mine[k].mean.toFixed(6)} [${mine[k].lo.toFixed(6)}, ${mine[k].hi.toFixed(6)}]   ${exact}`);
  ok(exact, `${k}: n, mean, lower and upper bound reproduced exactly (===) in the driver's order with independent code`);
}

// 3. the pre-run checker's numbers are the same procedure in numeric order (its printed values, 3 decimals)
const vout = fs.readFileSync(path.join(M, 'results/check/verify_m14.out'), 'utf8');
let numericMatches = 0;
for (const k of Object.keys(SPEC)) {
  const m = vout.match(new RegExp(`(?:PASS|FAIL)  ${k}: (-?[\\d.]+) \\[(-?[\\d.]+), (-?[\\d.]+)\\] n=165`));
  if (m && Number(m[1]).toFixed(3) === numeric[k].mean.toFixed(3) && Number(m[2]).toFixed(3) === numeric[k].lo.toFixed(3) && Number(m[3]).toFixed(3) === numeric[k].hi.toFixed(3)) numericMatches++;
}
ok(numericMatches === 10, `the pre-run checker's printed intervals are reproduced by the same procedure in numeric order (${numericMatches} of 10, to its 3 printed decimals)`);
ok(Object.keys(SPEC).every((k) => Math.abs(numeric[k].mean - mine[k].mean) < 1e-12), 'means are the same in either order (order-free up to float summation)');

// 4. lines and summary, from the independent intervals
const pos = (x) => x.n > 0 && x.mean > 0 && x.lo > 0;
const lines = { transfer: pos(mine.P1) && pos(mine.P2) ? 'SHOWN' : pos(mine.P1) ? 'NOT ATTRIBUTABLE TO THE RELATION' : mine.P1.hi < 0 ? 'REVERSED' : 'NOT SHOWN', relationalContent: pos(mine.P2) ? 'SHOWN' : 'NOT SHOWN', safety: mine.S.hi < 9 ? 'SAFE' : 'NOT SHOWN SAFE', reversal: pos(mine.R1) ? 'MISLED WHEN REVERSED' : 'NOT SHOWN' };
const { validity, ...storedLines } = j.reading.lines;
ok(JSON.stringify(lines) === JSON.stringify(storedLines), `lines from the independent intervals equal the stored lines: ${JSON.stringify(lines)}`);
ok(validity === 'VALID' && j.reading.summary === 'LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS, WITHIN THE SAFETY MARGIN', `stored validity ${validity}; stored summary "${j.reading.summary}"`);
ok(lines.transfer === 'SHOWN' && mine.P1.lo > 0 && mine.P2.lo > 0 && mine.S.hi < 9, `P1 lower ${mine.P1.lo.toFixed(4)} > 0; P2 lower ${mine.P2.lo.toFixed(4)} > 0; S upper ${mine.S.hi.toFixed(4)} < 9`);
ok(['P1', 'P2', 'S', 'R1'].every((k) => (numeric[k].lo > 0) === (mine[k].lo > 0) && (numeric[k].hi < 9) === (mine[k].hi < 9)), 'every decision is the same in numeric order (no criterion is near its threshold)');

// 5. RESULTS.md agrees with the stored values (2 decimals, Unicode minus)
const R = fs.readFileSync(path.join(M, 'RESULTS.md'), 'utf8');
const f2 = (x) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(2);
const sgn = (x) => (x < 0 ? '−' : '+') + Math.abs(x).toFixed(2);
const want = Object.fromEntries(Object.entries(mine).filter(([k]) => k !== 'O').map(([k, v]) => [k, `${sgn(v.mean)} [${f2(v.lo)}, ${f2(v.hi)}]`]));
for (const [k, s] of Object.entries(want)) ok(R.includes(s), `RESULTS.md reports ${k} as ${s}`);
ok(R.includes('**0.00**') && mine.O.mean === 0 && mine.O.lo === 0 && mine.O.hi === 0, 'RESULTS.md reports O as 0.00, and it is exactly 0');

// 6. checksums and provenance of the stored artifacts
const sums = fs.readFileSync(path.join(M, 'results/SHA256SUMS'), 'utf8').trim().split(/\r?\n/).map((l) => l.split(/\s+/));
ok(sums.length === 12 && sums.every(([h, f]) => sha(fs.readFileSync(path.join(M, 'results', f))) === h), `results/SHA256SUMS: all ${sums.length} files match`);
const resSha = sha(rawResult);
ok(resSha === 'd292412922c209b7d6ce44ba8357102921f61140c97d1550d9f56a07afbf0d3d' && R.includes(resSha) && sums.some(([h, f]) => f === 'm14_result.json' && h === resSha), `m14_result.json ${resSha.slice(0, 8)}… = SHA256SUMS = RESULTS.md`);
const rowsSha = sha(JSON.stringify(j.rows));
ok(rowsSha === j.determinism.rowsSha256RunA && rowsSha === j.determinism.rowsSha256RunB && R.includes(rowsSha), `stored rows hash ${rowsSha.slice(0, 8)}… = run A = run B = RESULTS.md`);
const frozen = fs.readFileSync(path.join(M, 'SPEC.sha256'), 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
ok(frozen.every(([h, f]) => sha(fs.readFileSync(path.join(M, f))) === h) && j.specSha256 === frozen.find(([, f]) => f === 'SPEC.md')[0], 'SPEC.sha256 still matches SPEC.md, PINS.json and admission.json, and the result names that SPEC.md');
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
ok(git('status', '--porcelain', '--', 'experiments/m14_schema') === '', 'experiments/m14_schema has no change against the committed results (b8fea5b)');
for (const f of ['verify_m14.mjs', 'verify_m14.out', 'reconcile_order.mjs', 'reconcile_order.out']) ok(sha(Buffer.from(git('show', `HEAD:experiments/m14_schema/results/check/${f}`) + '\n')) === sums.find(([, x]) => x === `check/${f}`)[0] || sha(fs.readFileSync(path.join(M, 'results/check', f))) === sums.find(([, x]) => x === `check/${f}`)[0], `check/${f} unchanged since it was lodged`);
console.log(`\n${fails.length ? `${fails.length} FAILURES` : 'all audit checks pass'}`);

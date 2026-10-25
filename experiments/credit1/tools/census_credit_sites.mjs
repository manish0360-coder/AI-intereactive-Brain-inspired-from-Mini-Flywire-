// ==========================================================
// CREDIT-1 — static census of the credit block (READ-ONLY CLI over ../census.mjs)
// ==========================================================
//   node experiments/credit1/tools/census_credit_sites.mjs [--main <main.js>] [--tree] [--out <json>]
// --tree: the input is an experiment-tree main.js (the GATE-FLOOR-B2 probe line is then classified INSTRUMENT).
// Exit 1 on any unclassified occurrence, missing classified line or broken invariant.  Reads one file; writes only --out.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { censusBlock } from '../census.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i === -1 ? null : process.argv[i + 1]; };
const MAIN = arg('--main') || path.join(HERE, '..', '..', '..', 'main.js');
const OUT = arg('--out');
const tree = process.argv.includes('--tree');
const bytes = fs.readFileSync(MAIN);
const r = censusBlock(bytes.toString('utf8'), { tree });
const out = { schema: 'credit1/1.site-census', main: { path: path.relative(process.cwd(), MAIN).split(path.sep).join('/'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') }, tree,
  block: r.block, lines: r.rows.length, summary: r.summary, totals: r.totals, invariants: r.invariants,
  rows: r.rows.map(({ idx, ...x }) => x), plan: { A: r.plan.A.map(({ idx, ...p }) => p), 'A+': r.plan['A+'].map(({ idx, ...p }) => p) }, problems: r.problems };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`main.js sha256 ${out.main.sha256.slice(0, 16)}… | block ${r.block.ifLine}-${r.block.closeLine} | ${r.rows.length} lines: ${JSON.stringify(r.summary)}`);
console.log(`substitutions: A ${JSON.stringify(r.totals.A)} | A+ ${JSON.stringify(r.totals['A+'])}`);
if (r.problems.length) { console.log('FAIL'); for (const p of r.problems) console.log('  ' + p); process.exit(1); }
console.log('PASS: every occurrence classified; invariants I1, I1b, I2, I3, I4, I5 hold');

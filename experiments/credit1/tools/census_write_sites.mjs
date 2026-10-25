// ==========================================================
// CREDIT-1 — census of every keyed write site (READ-ONLY CLI over ../writecensus.mjs; blocker BC-3)
// ==========================================================
//   node experiments/credit1/tools/census_write_sites.mjs [--root <repo root or tree dir>] [--out <json>]
// Exit 1 on any unclassified write site or unmatched classification entry.  Reads files; writes only --out.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { censusRoot, CLASSES, UNRESOLVED } from '../writecensus.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i === -1 ? null : process.argv[i + 1]; };
const ROOT = arg('--root') || path.join(HERE, '..', '..', '..');
const OUT = arg('--out');
const r = censusRoot(ROOT);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ schema: 'credit1/1.write-census', files: r.files, sites: r.sites, byClass: r.byClass, classes: CLASSES, unresolved: UNRESOLVED,
  rows: r.rows.map(({ idx, ...x }) => x), problems: r.problems }, null, 2) + '\n');
console.log(`files scanned ${r.files} | keyed write sites ${r.sites} | ${JSON.stringify(r.byClass)}`);
if (r.problems.length) { console.log('FAIL'); for (const p of r.problems) console.log('  ' + p); process.exit(1); }
console.log('PASS: every keyed write site classified; every classification entry matched');

// Descriptive figures for RESULTS.md, written 2026-11-18 AFTER the result. Not part of the reading.
//   1. schema decisions per test condition, from each schema arm's own counters (all three test episodes);
//   2. the shape of the two learned schemas: mean score of the true link (k -> k+1), of a self link (k -> k), and of
//      the other two links, averaged over labels and kinds;
//   3. steps summed over the three test episodes, per arm and condition, and the paired CONCRETE - SCHEMA total.
// Usage: node describe.mjs <path to m14_result.json>
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SIGMA = [1, 2, 3, 0], CONDS = ['COMPOSE', 'NULL', 'REVERSED'], ARMS = ['CONCRETE', 'SCHEMA', 'SCHEMA_SHUFFLED', 'ORACLE_SCHEMA'];
const sum = (x) => x.reduce((a, b) => a + b, 0), mean = (x) => sum(x) / x.length;
const rows = (arm) => j.rows.filter((r) => r.arm === arm);
console.log('1. schema decisions over the three test episodes (per label: decisions, ties, ties the schema narrowed, of which it decided alone)');
for (const arm of ['SCHEMA', 'SCHEMA_SHUFFLED', 'ORACLE_SCHEMA']) for (const c of CONDS) {
  const s = rows(arm).map((r) => r.stats[c]);
  console.log(`  ${arm.padEnd(16)} ${c.padEnd(8)} decisions ${mean(s.map((x) => x.decisions)).toFixed(1)}, ties ${mean(s.map((x) => x.ties)).toFixed(1)}, narrowed ${mean(s.map((x) => x.schemaNarrowed)).toFixed(1)}, decided alone ${mean(s.map((x) => x.schemaDecided)).toFixed(1)}`);
}
console.log('\n2. learned schema scores (mean over labels and kinds)');
for (const arm of ['SCHEMA', 'SCHEMA_SHUFFLED']) {
  const tru = [], self = [], other = [];
  for (const r of rows(arm)) {
    const s = r.schema.snapshot;
    for (let k = 0; k < 4; k++) for (let x = 0; x < 4; x++) { const v = (s.chosen[k][x] + 1) / (s.avail[k][x] + 2); (x === SIGMA[k] ? tru : x === k ? self : other).push(v); }
  }
  const selfChosen = sum(rows(arm).map((r) => sum([0, 1, 2, 3].map((k) => r.schema.snapshot.chosen[k][k]))));
  console.log(`  ${arm.padEnd(16)} true link ${mean(tru).toFixed(3)}, self link ${mean(self).toFixed(3)}, other links ${mean(other).toFixed(3)}; self links ever chosen in training: ${selfChosen}; learned relation = SIGMA in ${rows(arm).filter((r) => r.schema.relationIsSigma).length} of ${rows(arm).length}`);
}
console.log('\n3. steps summed over the three test episodes (mean per label)');
for (const arm of ARMS) console.log(`  ${arm.padEnd(16)} ${CONDS.map((c) => `${c} ${mean(rows(arm).map((r) => sum(r.tests[c].map((e) => e.steps)))).toFixed(2)}`).join('  ')}`);
const by = (arm) => new Map(rows(arm).map((r) => [r.trial, r]));
const C = by('CONCRETE'), S = by('SCHEMA');
const d = [...C.keys()].map((l) => sum(C.get(l).tests.COMPOSE.map((e) => e.steps)) - sum(S.get(l).tests.COMPOSE.map((e) => e.steps)));
console.log(`  COMPOSE, CONCRETE - SCHEMA over three episodes: mean ${mean(d).toFixed(2)}; labels for/against/tied ${d.filter((x) => x > 0).length}/${d.filter((x) => x < 0).length}/${d.filter((x) => x === 0).length}`);

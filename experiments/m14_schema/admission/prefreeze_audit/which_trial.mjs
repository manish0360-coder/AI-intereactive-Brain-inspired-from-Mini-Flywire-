import path from 'node:path';
import { pathToFileURL } from 'node:url';
const R = process.argv[2];
const L = await import(pathToFileURL(path.join(R, 'experiments/m14_schema/m14_lib.mjs')).href);
for (let i = 0; i < 100; i++) {
  const P = L.planTrial(`m14schema|audit|${i}`);
  const row = L.runArm(P, 'SCHEMA');
  if (row.schema.relationIsSigma) continue;
  const s = row.schema.snapshot;
  console.log(`trial audit|${i}: learned ${JSON.stringify(row.schema.relation)} (SIGMA [1,2,3,0])`);
  for (let k = 0; k < 4; k++) console.log(`  kind ${k}: chosen ${JSON.stringify(s.chosen[k])} avail ${JSON.stringify(s.avail[k])} scores ${JSON.stringify(s.avail[k].map((a, j) => +((s.chosen[k][j] + 1) / (a + 2)).toFixed(3)))}`);
  console.log(`  training phases ${P.train.map((t) => t.phase).join(',')}; route kinds per world ${P.train.map((t) => t.plan.route.map((u) => t.kinds[u]).join('>')).join(' | ')}`);
  console.log(`  test route kinds ${P.test.plan.route.map((u) => P.test.kinds.COMPOSE[u]).join('>')}`);
}

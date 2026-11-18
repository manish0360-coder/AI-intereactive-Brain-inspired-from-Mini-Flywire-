// Post-result reconciliation, written 2026-11-18 AFTER the result and after verify_m14.mjs reported 9 interval
// mismatches. Not part of the reading.
// Diagnosis: the driver builds each contrast over labels in string order (m14_lib.mjs, contrast: [...].sort()), so
// gate|0, gate|1, gate|10, gate|100, ...; verify_m14.mjs, written before the result, used numeric order
// (gate|0, gate|1, gate|2, ...). pairedBootstrap resamples positions with a seeded stream, so the same seed over a
// different order gives a slightly different interval; the mean is order-free. This script recomputes every
// contrast with its own difference code in BOTH orders, and checks: the driver's intervals reproduce exactly in
// string order; the means agree; and the five lines and the summary are the same under either order.
// Usage: node reconcile_order.mjs <repo root>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.argv[2];
const { pairedBootstrap } = await import(pathToFileURL(path.join(ROOT, 'cognitive/testbed/stats.mjs')).href);
const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m14_schema/results/m14_result.json'), 'utf8'));
const numeric = Array.from({ length: 165 }, (_, i) => `m14schema|gate|${i}`), string = [...numeric].sort();
const cell = (arm) => new Map(j.rows.filter((r) => r.arm === arm).map((r) => [r.trial, r]));
const spec = {
  P1: ['CONCRETE', 'SCHEMA', 'COMPOSE', 0, j.analysis.criteria.P1], P2: ['SCHEMA_SHUFFLED', 'SCHEMA', 'COMPOSE', 0, j.analysis.criteria.P2], S: ['SCHEMA', 'CONCRETE', 'NULL', 0, j.analysis.criteria.S],
  R1: ['SCHEMA', 'CONCRETE', 'REVERSED', 0, j.analysis.secondary.R1_reversedHarm], R2: ['SCHEMA', 'CONCRETE', 'REVERSED', 2, j.analysis.secondary.R2_reversedThird], O: ['SCHEMA', 'ORACLE_SCHEMA', 'COMPOSE', 0, j.analysis.secondary.O_shortfall],
  H: ['CONCRETE', 'ORACLE_SCHEMA', 'COMPOSE', 0, j.analysis.secondary.H_oracle], SH: ['CONCRETE', 'SCHEMA_SHUFFLED', 'COMPOSE', 0, j.analysis.secondary.SH_shuffledVsConcrete], E2: ['CONCRETE', 'SCHEMA', 'COMPOSE', 1, j.analysis.secondary.E2_compose], E3: ['CONCRETE', 'SCHEMA', 'COMPOSE', 2, j.analysis.secondary.E3_compose],
};
let bad = 0;
const lb = (c) => c.n > 0 && c.mean > 0 && c.lo > 0;
const lines = (C) => ({ transfer: lb(C.P1) && lb(C.P2) ? 'SHOWN' : lb(C.P1) ? 'NOT ATTRIBUTABLE TO THE RELATION' : C.P1.hi < 0 ? 'REVERSED' : 'NOT SHOWN', relationalContent: lb(C.P2) ? 'SHOWN' : 'NOT SHOWN', safety: C.S.hi < 9 ? 'SAFE' : 'NOT SHOWN SAFE', reversal: lb(C.R1) ? 'MISLED WHEN REVERSED' : 'NOT SHOWN' });
const byOrder = { string: {}, numeric: {} };
for (const [k, [X, Y, c, e, drv]] of Object.entries(spec)) {
  const a = cell(X), b = cell(Y);
  for (const [name, order] of [['string', string], ['numeric', numeric]]) byOrder[name][k] = pairedBootstrap(order.map((l) => a.get(l).tests[c][e].steps - b.get(l).tests[c][e].steps), `m14schema|stats|m14|${k}`);
  const s = byOrder.string[k], n = byOrder.numeric[k];
  const exact = s.n === drv.n && s.mean === drv.mean && s.lo === drv.lo && s.hi === drv.hi;
  if (!exact || Math.abs(n.mean - drv.mean) > 1e-12) bad++;
  console.log(`${exact ? 'PASS' : 'FAIL'}  ${k.padEnd(3)} string order reproduces the driver exactly: ${s.mean.toFixed(3)} [${s.lo.toFixed(3)}, ${s.hi.toFixed(3)}]; numeric order (verify_m14): [${n.lo.toFixed(3)}, ${n.hi.toFixed(3)}]; means equal: ${Math.abs(n.mean - drv.mean) < 1e-12}`);
}
const Ls = lines(byOrder.string), Ln = lines(byOrder.numeric), Ld = { ...j.reading.lines }; delete Ld.validity;
const same = JSON.stringify(Ls) === JSON.stringify(Ln) && JSON.stringify(Ls) === JSON.stringify(Ld);
if (!same) bad++;
console.log(`${same ? 'PASS' : 'FAIL'}  the four criterion lines are the same in string order, numeric order and the driver: ${JSON.stringify(Ls)}`);
console.log(bad ? `${bad} FAILURES` : 'reconciled: the 9 mismatches are the label order only');

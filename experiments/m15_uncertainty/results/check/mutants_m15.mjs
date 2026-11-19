// Mutation test of the independent check, before the run (2026-11-19).
//   node experiments/m15_uncertainty/results/check/mutants_m15.mjs <repo root> <rehearsal result file>
// The unmodified rehearsal result must pass verify_m15.mjs --rehearsal; every corrupted copy must fail it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(process.argv[2]);
const SRC = path.resolve(process.argv[3]);
const VERIFY = path.join(ROOT, 'experiments', 'm15_uncertainty', 'results', 'check', 'verify_m15.mjs');
const base = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const find = (j, name) => j.criteria.find((c) => c.name === name);
const MUTANTS = [
  ['a criterion estimate (T mean + 1)', (j) => { find(j, 'T').mean += 1; }],
  ['a criterion bound (BT1 upper bound set to 0.05)', (j) => { find(j, 'BT1').hi = 0.05; }],
  ['a per-label value (BT2a, label 0, + 0.01)', (j) => { find(j, 'BT2a').perLabel[0] += 0.01; }],
  ['a pass flag (MECH-b flipped)', (j) => { const c = find(j, 'MECH-b'); c.pass = !c.pass; }],
  ['a closed-loop step count (CONCRETE, STABLE world 13, label 0, + 2)', (j) => { j.rows[0].closed.STABLE.CONCRETE.steps[13] += 2; }],
  ['a closed-loop step count before the switch (UA, REVERSED world 0, label 2, + 1)', (j) => { j.rows[2].closed.REVERSED.UA.steps[0] += 1; }],
  ['a switch point (label 1, s + 1)', (j) => { j.rows[1].s += 1; }],
  ['a BT-COND classification (SPARSE set to PASS)', (j) => { j.btCond.conditions.SPARSE.classification = 'PASS'; }],
  ['the BT-COND line (set to SHOWN)', (j) => { j.btCond.line = 'SHOWN'; j.btCond.allPass = true; }],
  ['the statement (the full capability name claimed)', (j) => { j.reading.statement = j.reading.statement.replace(/^[^;]*;/, 'CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN, with a development-selected hazard (h = 0.01);'); }],
  ['a sensitivity-arm outcome (UA_h05 BT1 pass flipped)', (j) => { const c = j.sensitivityBT.UA_h05.find((x) => x.name === 'BT1'); c.pass = !c.pass; }],
  ['determinism (run B digest altered)', (j) => { j.determinism.digestsSha256RunB = '0'.repeat(64); }],
  ['a parameter (w* recorded as 3)', (j) => { j.parameters.wStar = 3; }],
  ['provenance (SPEC.md hash altered)', (j) => { j.specSha256 = '0'.repeat(64); }],
  ['a stored validity part (probeIsolation false)', (j) => { j.validity.probeIsolation = false; }],
  ['a capped episode not recorded as 200 steps', (j) => { const x = j.rows[0].closed.NOISY.UA; x.capped = [...x.capped, 20]; }],
];
const run = (j) => {
  const f = path.join(os.tmpdir(), `m15_mutant_${process.pid}.json`);
  fs.writeFileSync(f, JSON.stringify(j));
  const r = spawnSync(process.execPath, [VERIFY, ROOT, '--result', f, '--rehearsal'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  fs.unlinkSync(f);
  return { status: r.status, fails: (r.stdout.match(/^FAIL .*$/gm) || []) };
};
const clean = run(base);
console.log(`${clean.status === 0 ? 'PASS' : 'FAIL'}  the unmodified rehearsal result passes the verifier (exit ${clean.status}${clean.fails.length ? `; ${clean.fails.join(' | ')}` : ''})`);
let caught = 0;
for (const [name, mutate] of MUTANTS) {
  const j = JSON.parse(JSON.stringify(base));
  mutate(j);
  const r = run(j);
  const ok = r.status === 1;
  if (ok) caught++;
  console.log(`${ok ? 'CAUGHT' : 'MISSED'}  ${name}${ok ? `: ${r.fails[0].replace(/^FAIL\s+/, '').slice(0, 120)}` : ` (exit ${r.status})`}`);
}
console.log(`\n${caught} of ${MUTANTS.length} mutants caught; unmodified result ${clean.status === 0 ? 'passes' : 'FAILS'}`);
process.exit(caught === MUTANTS.length && clean.status === 0 ? 0 : 1);

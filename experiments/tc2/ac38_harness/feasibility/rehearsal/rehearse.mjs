// ==========================================================
// AC38 limited feasibility study — synthetic rehearsal of the harness (never loads the pinned tree)
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/rehearsal/rehearse.mjs <out-dir-outside-the-repo>
// Runs the rehearsal matrix through the study's runner, preload, window and evaluator, then checks
// redaction on fixed strings.  A pass says the harness logic behaves as declared on test-owned
// modules.  It is not pinned-tree evidence, feasibility evidence or an AC38 result.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMatrix, writeSummary } from '../harness/run_study.mjs';
import { makeRedactor, ROOT } from '../harness/runner.mjs';
import { evaluate } from '../harness/evaluate.mjs';
import { runEvaluatorCases } from './evaluator_cases.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const OUT = path.resolve(process.argv[2] ?? '');
const rel = path.relative(ROOT, OUT);
if (!process.argv[2] || (!rel.startsWith('..') && !path.isAbsolute(rel))) { console.error('usage: rehearse.mjs <out-dir-outside-the-repo>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

// ---- redaction on fixed strings (placeholder paths only) ----
const PAIRS = [['C:\\Example User\\repo', '<ROOT>'], ['C:\\Example User\\scratch', '<TMP>']];
const cases = [
  ['C:\\Example User\\repo\\experiments\\x.mjs:12', '<ROOT>\\experiments\\x.mjs:12', false],
  ['file:///C:/Example%20User/repo/experiments/x.mjs:12:5', '<ROOT>/experiments/x.mjs:12:5', false],
  ['c:\\Example User\\scratch\\out', '<TMP>\\out', false],
  ['render/engine.js:12', 'render/engine.js:12', false],
  ['D:\\Other\\place\\file.txt', '<RESIDUAL>', true],
];
const redaction = cases.map(([input, want, residual]) => { const r = makeRedactor(PAIRS); const got = r.str(input); return { input, got, pass: got === want && (r.residual().length > 0) === residual }; });

const tree = path.join(HERE, 'synthetic_tree');
const config = { fixture: path.join(HERE, 'fixture_synthetic.mjs'), preload: path.resolve(HERE, '..', 'harness', 'preload.mjs'), tablePath: path.join(HERE, 'rewrite_table.json'), scopePath: path.join(HERE, 'digest_scope.json'), expectedPath: path.join(HERE, 'expected.json'), brokenFile: 'render/engine.js' };
const { expected, records } = await runMatrix(OUT, tree, config);
const { summary, summarySha256 } = writeSummary(OUT, expected, records);

// ---- evaluator mutation test: perturb one predicate at a time; its row must then fail ----
const perturb = (p) => {
  const q = JSON.parse(JSON.stringify(p));
  if (q.refusal) { q.matches = 'never-matches-ac38'; return q; }
  if ('residual' in q) { q.eq = !q.eq; return q; }
  if ('eqRun' in q) { q.neqRun = q.eqRun; delete q.eqRun; return q; }
  if ('neqRun' in q) { q.eqRun = q.neqRun; delete q.neqRun; return q; }
  if ('includesAll' in q) { q.includesAll = [...q.includesAll, 'never-an-item']; return q; }
  if ('subsetOf' in q) { q.subsetOf = []; return q; }
  q.eq = { perturbed: true };
  return q;
};
let mutations = 0, caught = 0;
const missed = [];
summary.rows.forEach((row, i) => {
  if (!row.pass) return;
  expected.rows[i].predicates.forEach((p, k) => {
    const copy = JSON.parse(JSON.stringify(expected));
    copy.rows[i].predicates[k] = perturb(p);
    mutations++;
    const r = evaluate(copy, records).rows[i];
    if (!r.pass) caught++; else missed.push(`${row.id} predicate ${k}`);
  });
});
const evaluatorCases = runEvaluatorCases();
const result = { redaction: { cases: redaction.length, passed: redaction.filter((c) => c.pass).length }, evaluatorMutations: { total: mutations, caught, missed }, evaluatorCases: { total: evaluatorCases.length, correct: evaluatorCases.filter((c) => c.ok).length }, rows: summary.counts, allRowsPass: summary.allRowsPass, summarySha256, expectedSha256: sha256(fs.readFileSync(config.expectedPath)) };
fs.writeFileSync(path.join(OUT, 'rehearsal_result.json'), `${JSON.stringify({ ...result, redactionCases: redaction }, null, 1)}\n`);
console.log(JSON.stringify(result));
for (const r of summary.rows.filter((x) => !x.pass)) console.log(`FAIL ${r.id}: ${JSON.stringify(r.failures).slice(0, 700)}`);
for (const c of redaction.filter((x) => !x.pass)) console.log(`REDACTION FAIL ${JSON.stringify(c)}`);
for (const c of evaluatorCases.filter((x) => !x.ok)) console.log(`EVALUATOR CASE FAIL ${c.name}`);
process.exit(summary.allRowsPass && redaction.every((c) => c.pass) && caught === mutations && evaluatorCases.every((c) => c.ok) ? 0 : 1);

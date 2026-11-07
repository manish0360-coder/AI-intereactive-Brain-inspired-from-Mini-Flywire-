// ==========================================================
// CF-01 — development gate driver (protocol §4; parameters frozen in experiments/cf01/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf01/run_gate.mjs --domain dev  --out <file outside the repository> [--worlds 20]
//   node experiments/cf01/run_gate.mjs --domain gate [--worlds 20]
// G1 determinism: the whole matrix is computed twice in this process and the two serialisations must be identical.
// G2 isolation and G3 environment correctness: the test suite (cognitive/tests), split by file.
// G4 discriminability per task: D = metric(QL) - metric(DYNAQ) over worlds (E1: EXPLORED arm), mean > 0 and the
//    95% percentile-bootstrap lower bound > 0 -> the task is admitted.
// G5 reference sanity: mean ORACLE metric <= mean metric of every learner, on every task and arm.
// The `gate` domain refuses to run unless every CF-01 file is committed and unmodified, refuses to run twice
// (the result file must not exist), and writes experiments/cf01/results/gate_result.json.
// Evidence category: development gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, mfwWorld } from '../../cognitive/testbed/worlds.mjs';
import { runTask, TASKS, ARMS, TASK_PARAMS } from '../../cognitive/testbed/tasks.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { QL_DEFAULTS } from '../../cognitive/agents/ql.mjs';
import { DYNAQ_DEFAULTS } from '../../cognitive/agents/dynaq.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`run_gate refused: ${m}`); process.exit(2); };

const DOMAIN = arg('--domain');
const N = Number(arg('--worlds', '20'));
if (!['dev', 'gate'].includes(DOMAIN)) die('--domain must be dev or gate');
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate' ? path.join(HERE, 'results', 'gate_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
}
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
if (DOMAIN === 'gate') {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  if (N !== 20) die('the frozen gate uses 20 worlds');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf01');
  if (dirty) die(`CF-01 files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate domain has already been run (results/gate_result.json exists)');
}

const KINDS = ['RANDOM', 'QL', 'DYNAQ', 'ORACLE'];
const LEARNERS = ['RANDOM', 'QL', 'DYNAQ'];

function matrix(domain, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`;
    const world = generateWorld(worldLabel);
    for (const task of TASKS) for (const arm of ARMS[task]) for (const kind of KINDS) rows.push(runTask({ task, world, worldLabel, kind, arm }));
  }
  return rows;
}

function analyse(rows, domain) {
  const get = (task, arm, kind) => rows.filter((r) => r.task === task && r.arm === arm && r.kind === kind && !r.excluded);
  const byWorld = (xs) => new Map(xs.map((r) => [r.world, r]));
  const paired = (task, armA, kindA, armB, kindB, label) => {
    const A = byWorld(get(task, armA, kindA)), B = byWorld(get(task, armB, kindB));
    const diffs = [...A.keys()].filter((w) => B.has(w)).sort().map((w) => A.get(w).metric - B.get(w).metric);
    return { contrast: `${kindA}.${armA} - ${kindB}.${armB}`, ...pairedBootstrap(diffs, label) };
  };
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const out = { primary: {}, reported: {}, means: {}, censoring: {}, secondary: {}, excludedWorlds: {} };
  for (const task of TASKS) {
    const arm = task === 'E1' ? 'EXPLORED' : 'STD';
    out.primary[task] = paired(task, arm, 'QL', arm, 'DYNAQ', `cf|stats|${domain}|${task}`);
    out.excludedWorlds[task] = [...new Set(rows.filter((r) => r.task === task && r.excluded).map((r) => r.world))];
    for (const a of ARMS[task]) for (const k of KINDS) {
      const xs = get(task, a, k);
      out.means[`${task}.${a}.${k}`] = mean(xs.map((r) => r.metric));
      out.censoring[`${task}.${a}.${k}`] = xs.reduce((s, r) => s + r.censored, 0) / Math.max(1, xs.reduce((s, r) => s + r.testSteps.length, 0));
      for (const key of Object.keys(xs[0]?.secondary ?? {})) out.secondary[`${task}.${a}.${k}.${key}`] = mean(xs.map((r) => r.secondary[key]));
    }
  }
  out.reported.E1_QL_negativeControl = paired('E1', 'EXPLORED', 'QL', 'NAIVE', 'QL', `cf|stats|${domain}|E1|qlnull`);
  out.reported.E1_DYNAQ_latentBenefit = paired('E1', 'NAIVE', 'DYNAQ', 'EXPLORED', 'DYNAQ', `cf|stats|${domain}|E1|dynalatent`);
  return out;
}

const tests = await runAllTests();
const G2files = ['test_isolation.mjs', 'test_mutants.mjs'];
const part = (pred) => { const xs = tests.results.filter(pred); return { passed: xs.filter((x) => x.pass).length, total: xs.length, failed: xs.filter((x) => !x.pass).map((x) => `${x.file} :: ${x.name}`) }; };
const G2 = part((r) => G2files.includes(r.file)), G3 = part((r) => !G2files.includes(r.file));

const rowsA = matrix(DOMAIN, N), rowsB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(rowsA)), hashB = sha(JSON.stringify(rowsB));
const analysis = analyse(rowsA, DOMAIN);
const admitted = Object.fromEntries(TASKS.map((t) => { const p = analysis.primary[t]; return [t, p.n > 0 && p.mean > 0 && p.lo > 0]; }));
const g5 = [];
for (const task of TASKS) for (const arm of ARMS[task]) for (const k of LEARNERS) {
  const o = analysis.means[`${task}.${arm}.ORACLE`], m = analysis.means[`${task}.${arm}.${k}`];
  if (!(o <= m)) g5.push(`${task}.${arm}: ORACLE ${o} > ${k} ${m}`);
}
const gates = {
  G1_determinism: { pass: hashA === hashB, hashA, hashB },
  G2_isolation: { pass: G2.failed.length === 0 && G2.total > 0, ...G2 },
  G3_environment: { pass: G3.failed.length === 0 && G3.total > 0, ...G3 },
  G4_discriminability: { admitted, admittedCount: Object.values(admitted).filter(Boolean).length },
  G5_reference: { pass: g5.length === 0, violations: g5 },
};
const infra = gates.G1_determinism.pass && gates.G2_isolation.pass && gates.G3_environment.pass && gates.G5_reference.pass;
const verdict = !infra ? 'CF-01 FAIL' : gates.G4_discriminability.admittedCount >= 2 ? 'CF-01 PASS' : 'CF-01 PARTIAL';

const mfw = mfwWorld(path.join(ROOT, 'connections.json'));
const reference = [];
for (const task of TASKS) for (const arm of ARMS[task]) for (const kind of KINDS) {
  const r = runTask({ task, world: mfw, worldLabel: 'cf|ref|mfw-graph', kind, arm });
  reference.push({ task, arm, kind, metric: r.metric ?? null, excluded: !!r.excluded, layout: r.layout ?? null });
}

const result = {
  evidence: 'CF-01 development gate (not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), cf01FilesClean: DOMAIN === 'gate' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { tasks: TASK_PARAMS, QL: QL_DEFAULTS, DYNAQ: DYNAQ_DEFAULTS, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests: { passed: tests.passed, total: tests.total },
  gates, verdict, analysis, referenceWorld: { world: 'mfw-graph (connections.json; reported only)', rows: reference },
  rowsSha256: hashA, rows: rowsA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, gates: { G1: gates.G1_determinism.pass, G2: `${G2.passed}/${G2.total}`, G3: `${G3.passed}/${G3.total}`, G4: admitted, G5: gates.G5_reference.pass }, primary: analysis.primary, reported: analysis.reported, out: path.relative(ROOT, OUT).startsWith('..') ? '<outside repository>' : path.relative(ROOT, OUT) }, null, 1));
process.exit(infra ? 0 : 1);

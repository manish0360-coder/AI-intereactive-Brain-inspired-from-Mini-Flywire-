// ==========================================================
// CF-03 — MBVI evaluation gate (parameters and acceptance frozen in experiments/cf03/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf03/run_gate.mjs --domain dev  --out <file outside the repository> [--worlds N]
//   node experiments/cf03/run_gate.mjs --domain gate3
// Acceptance (Director-approved design, 2026-11-07; all must hold for CF-03 PASS):
//   A1  E3 reward relocation: D = metric(DYNAQ) - metric(MBVI), mean > 0 and 95% bootstrap lower bound > 0
//   A2  E1 latent learning (EXPLORED): non-inferiority, upper 95% bound of metric(MBVI) - metric(DYNAQ) < 10 steps
//   A3  M1 model quality on E1S: per-world mean log-likelihood of MBVI's predictions minus a uniform-over-exits
//       predictor (1 / (nActions + 1)), mean > 0 and lower bound > 0
//   A4  M2 calibration: ECE of MBVI's modal-outcome predictions on E1S over the 20 dev worlds <= 0.05, as the
//       prediction-count-weighted mean of per-run ECEs
//       (evaluated on dev as approved; the gate-domain ECE is reported alongside)
//   A5  infrastructure: G1 determinism (two in-process runs), all tests pass, G5 ORACLE <= every learner on the
//       deterministic tasks (E1, E3, E2P)
// Verdict: CF-03 PASS (A1-A5) / CF-03 FAIL (A5 holds, some of A1-A4 fail; failures listed) / CF-03 INVALID (A5 fails).
// Reported, not pass/fail: E1 NAIVE, E1S and E2P contrasts against DYNAQ; ablations against MBVI; planning compute;
// steps-to-goal per episode; model resets; the mfw-graph reference world.
// The gate3 domain refuses unless every CF-03 file is committed and clean and the gate has not run before.
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, mfwWorld } from '../../cognitive/testbed/worlds.mjs';
import { runTaskV1, ARMS_V1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV1, MBVI_VARIANTS } from '../../cognitive/testbed/registry_v1.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { TASK_PARAMS } from '../../cognitive/testbed/tasks.mjs';
import { E2P_PARAMS } from '../../cognitive/testbed/task_e2p.mjs';
import { QL_DEFAULTS } from '../../cognitive/agents/ql.mjs';
import { DYNAQ_DEFAULTS } from '../../cognitive/agents/dynaq.mjs';
import { MBVI_DEFAULTS } from '../../cognitive/core/mbvi.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE3_WORLDS = 20;   // fixed before the gate3 run by the pre-declared rule in GATE_SPEC.md

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf03 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate3'].includes(DOMAIN)) die('--domain must be dev or gate3');
const N = DOMAIN === 'gate3' ? GATE3_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate3' ? path.join(HERE, 'results', 'gate3_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf03');
  if (dirty) die(`CF-03 files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate3 domain has already been run');
}

const KINDS = ['RANDOM', 'QL', 'DYNAQ', 'ORACLE', ...Object.keys(MBVI_VARIANTS)];
const LEARNERS = KINDS.filter((k) => k !== 'ORACLE');
const CELLS = [['E1', 'EXPLORED'], ['E1', 'NAIVE'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const DETERMINISTIC = ['E1', 'E3', 'E2P'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs'];

function matrix(domain, n, cells = CELLS, kinds = KINDS) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const [task, arm] of cells) for (const kind of kinds) {
      rows.push(task === 'E2P' ? runE2P({ world, worldLabel, kind, arm, makeAgent: makeAgentForV1 }) : runTaskV1({ task, world, worldLabel, kind, arm }));
    }
  }
  return rows;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
// M2 statistic: the prediction-count-weighted mean of each run's ECE (10 equal-width bins).  Per-run binning is
// noisier than pooling all predictions, so this is conservative relative to a fully pooled ECE.
const pooledEce = (rows) => {
  let w = 0, s = 0;
  for (const r of rows) { const q = r.secondary.quality; if (q && q.ece !== null) { s += q.ece * q.calibrated; w += q.calibrated; } }
  return w ? s / w : null;
};

function analyse(rows, domain) {
  const cell = (task, arm, kind) => new Map(rows.filter((r) => r.task === task && r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  const paired = (task, arm, kA, kB, label, f = (r) => r.metric) => {
    const A = cell(task, arm, kA), B = cell(task, arm, kB);
    const diffs = [...A.keys()].filter((w) => B.has(w)).sort().map((w) => f(A.get(w)) - f(B.get(w)));
    return { contrast: `${kA} - ${kB} (${task}.${arm})`, sd: sd(diffs), ...pairedBootstrap(diffs, label) };
  };
  const out = { acceptance: {}, reported: {}, ablations: {}, means: {}, stepsPerEpisode: {}, censoring: {}, compute: {}, model: {}, secondary: {}, excludedWorlds: [...new Set(rows.filter((r) => r.excluded).map((r) => `${r.task}:${r.world}`))] };
  out.acceptance.A1_E3 = paired('E3', 'STD', 'DYNAQ', 'MBVI', `cf|stats|${domain}|cf03|E3`);
  out.acceptance.A2_E1 = paired('E1', 'EXPLORED', 'MBVI', 'DYNAQ', `cf|stats|${domain}|cf03|E1`);
  const mb = cell('E1S', 'EXPLORED', 'MBVI');
  const llDiffs = [...mb.keys()].sort().map((w) => mb.get(w).secondary.quality.meanLL - mb.get(w).secondary.quality.meanLLUniform);
  out.acceptance.A3_M1 = { contrast: 'mean log-likelihood MBVI - uniform over exits (E1S)', sd: sd(llDiffs), ...pairedBootstrap(llDiffs, `cf|stats|${domain}|cf03|M1`) };
  out.acceptance.M2_ECE_thisDomain = pooledEce([...mb.values()]);
  out.reported.E1_NAIVE = paired('E1', 'NAIVE', 'DYNAQ', 'MBVI', `cf|stats|${domain}|cf03|E1N`);
  out.reported.E1S = paired('E1S', 'EXPLORED', 'DYNAQ', 'MBVI', `cf|stats|${domain}|cf03|E1S`);
  out.reported.E2P = paired('E2P', 'PRE', 'DYNAQ', 'MBVI', `cf|stats|${domain}|cf03|E2P`);
  out.reported.E3_QL_minus_MBVI = paired('E3', 'STD', 'QL', 'MBVI', `cf|stats|${domain}|cf03|E3QL`);
  for (const ab of Object.keys(MBVI_VARIANTS).filter((k) => k !== 'MBVI')) for (const [task, arm] of [['E3', 'STD'], ['E1', 'EXPLORED'], ['E2P', 'PRE']]) {
    out.ablations[`${ab}.${task}`] = paired(task, arm, ab, 'MBVI', `cf|stats|${domain}|cf03|${ab}|${task}`);
  }
  for (const [task, arm] of CELLS) for (const k of KINDS) {
    const xs = [...cell(task, arm, k).values()], key = `${task}.${arm}.${k}`;
    out.means[key] = mean(xs.map((r) => r.metric));
    out.stepsPerEpisode[key] = mean(xs.flatMap((r) => r.testSteps));
    out.censoring[key] = xs.reduce((s, r) => s + r.censored, 0) / Math.max(1, xs.reduce((s, r) => s + r.testSteps.length, 0));
    if (xs[0]?.secondary.compute) out.compute[key] = { backupsPerDecision: mean(xs.map((r) => r.secondary.compute.backupsPerDecision)), sweepsPerDecision: mean(xs.map((r) => r.secondary.compute.sweepsPerDecision)), budgetHitShare: mean(xs.map((r) => r.secondary.compute.budgetHitShare)), decisions: mean(xs.map((r) => r.secondary.compute.decisions)), budget: xs[0].secondary.compute.budget };
    if (xs[0]?.secondary.model) out.model[key] = { transitionResets: mean(xs.map((r) => r.secondary.model.transitionResets)), globalRewardResets: mean(xs.map((r) => r.secondary.model.globalRewardResets)), rewardResets: mean(xs.map((r) => r.secondary.model.rewardResets)) };
    for (const s of ['oldGoalArrivals', 'blockedAttempts']) if (xs.length && xs[0].secondary[s] !== undefined) out.secondary[`${key}.${s}`] = mean(xs.map((r) => r.secondary[s]));
  }
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const rowsA = matrix(DOMAIN, N), rowsB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(rowsA)), hashB = sha(JSON.stringify(rowsB));
const analysis = analyse(rowsA, DOMAIN);
const devE1S = DOMAIN === 'dev' ? rowsA.filter((r) => r.task === 'E1S' && r.kind === 'MBVI') : matrix('dev', 20, [['E1S', 'EXPLORED']], ['MBVI']);
const devEce = pooledEce(devE1S);
const g5 = [];
for (const [task, arm] of CELLS.filter(([t]) => DETERMINISTIC.includes(t))) for (const k of LEARNERS) {
  const o = analysis.means[`${task}.${arm}.ORACLE`], m = analysis.means[`${task}.${arm}.${k}`];
  if (!(o <= m)) g5.push(`${task}.${arm}: ORACLE ${o} > ${k} ${m}`);
}
const A = analysis.acceptance;
const criteria = {
  A1_E3_beats_DYNAQ: A.A1_E3.n > 0 && A.A1_E3.mean > 0 && A.A1_E3.lo > 0,
  A2_E1_noninferior: A.A2_E1.n > 0 && A.A2_E1.hi < 10,
  A3_M1_loglik: A.A3_M1.n > 0 && A.A3_M1.mean > 0 && A.A3_M1.lo > 0,
  A4_M2_ece_dev: devEce !== null && devEce <= 0.05,
};
const infra = { G1_determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0, G5_reference: g5.length === 0 };
const infraOk = Object.values(infra).every(Boolean);
const failed = Object.entries(criteria).filter(([, v]) => !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-03 INVALID' : failed.length ? `CF-03 FAIL (${failed.join(', ')})` : 'CF-03 PASS';
const mfw = mfwWorld(path.join(ROOT, 'connections.json'));
const reference = CELLS.flatMap(([task, arm]) => ['QL', 'DYNAQ', 'MBVI', 'ORACLE'].map((kind) => {
  const r = task === 'E2P' ? runE2P({ world: mfw, worldLabel: 'cf|ref|mfw-graph', kind, arm, makeAgent: makeAgentForV1 }) : runTaskV1({ task, world: mfw, worldLabel: 'cf|ref|mfw-graph', kind, arm });
  return { task, arm, kind, metric: r.metric ?? null };
}));
const result = {
  evidence: 'CF-03 MBVI evaluation gate (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate3' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { tasks: TASK_PARAMS, e2p: E2P_PARAMS, QL: QL_DEFAULTS, DYNAQ: DYNAQ_DEFAULTS, MBVI: MBVI_DEFAULTS, variants: MBVI_VARIANTS, bootstrapResamples: 10000, e1sReliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, g5, criteria, devEce, verdict, analysis, referenceWorld: { world: 'mfw-graph (reported only)', rows: reference }, rowsSha256: hashA, rows: rowsA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, devEce, acceptance: analysis.acceptance, reported: analysis.reported }, null, 1));
process.exit(infraOk ? 0 : 1);

// ==========================================================
// CF-03b — world model v2 calibration gate (parameters and acceptance frozen in experiments/cf03b/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf03b/run_gate.mjs --domain dev    --out <file outside the repository> [--worlds N]
//   node experiments/cf03b/run_gate.mjs --domain gate3b
// Acceptance (all must hold for CF-03b PASS); every criterion is evaluated on the domain being run:
//   B1  calibration: prediction-count-weighted mean of per-run ECE of MBVI2 on E1S <= 0.05 (the CF-03 A4 statistic)
//   B2  improvement: per-world ECE(MBVI) - ECE(MBVI2) on E1S, mean > 0 and 95% bootstrap lower bound > 0
//   B3  E3 reward relocation: metric(DYNAQ) - metric(MBVI2), mean > 0 and lower bound > 0            (CF-03 A1)
//   B4  E1 latent learning: upper bound of metric(MBVI2) - metric(DYNAQ) < 10 steps                   (CF-03 A2)
//   B5  model log-likelihood on E1S minus the uniform-over-exits predictor, mean > 0 and lower bound > 0 (CF-03 A3)
//   B6  no regression: upper bound of metric(MBVI2) - metric(MBVI) < 10 steps on E1 EXPLORED, E3, E1S and E2P PRE
//   B7  infrastructure: determinism (two in-process runs), all tests pass, ORACLE <= every learner on E1, E3, E2P
// Verdict: CF-03b PASS (B1-B7) / CF-03b FAIL (B7 holds, some of B1-B6 fail; listed) / CF-03b INVALID (B7 fails).
// Reported, not pass/fail: ablations against MBVI2 with pre-declared directions; E1 NAIVE; pooled ECE; the ECE a
// perfectly calibrated forecaster would score on the same predictions (noise floor); learned hyper-parameters;
// planning compute; the mfw-graph reference world.
// The gate3b domain refuses unless every CF-03b file is committed and clean and the gate has not run before.
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, mfwWorld } from '../../cognitive/testbed/worlds.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P, E2P_PARAMS } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV2, MBVI2_VARIANTS } from '../../cognitive/testbed/registry_v2.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { makeStream } from '../../cognitive/testbed/rng.mjs';
import { TASK_PARAMS } from '../../cognitive/testbed/tasks.mjs';
import { DYNAQ_DEFAULTS } from '../../cognitive/agents/dynaq.mjs';
import { MBVI_DEFAULTS } from '../../cognitive/core/mbvi.mjs';
import { MBVI2_DEFAULTS } from '../../cognitive/mind/mbvi2.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE3B_WORLDS = 20;   // fixed before the gate3b run by the pre-declared rule in GATE_SPEC.md
export const MARGIN = 10;          // steps; non-inferiority margin (the CF-03 A2 margin)
export const ECE_LIMIT = 0.05;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf03b run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate3b'].includes(DOMAIN)) die('--domain must be dev or gate3b');
const N = DOMAIN === 'gate3b' ? GATE3B_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate3b' ? path.join(HERE, 'results', 'gate3b_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf03b');
  if (dirty) die(`CF-03b files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate3b domain has already been run');
}

const KINDS = ['RANDOM', 'QL', 'DYNAQ', 'ORACLE', 'MBVI', ...Object.keys(MBVI2_VARIANTS)];
const LEARNERS = KINDS.filter((k) => k !== 'ORACLE');
const CELLS = [['E1', 'EXPLORED'], ['E1', 'NAIVE'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const DETERMINISTIC = ['E1', 'E3', 'E2P'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs'];

function matrix(domain, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const [task, arm] of CELLS) for (const kind of KINDS) {
      rows.push(task === 'E2P' ? runE2P({ world, worldLabel, kind, arm, makeAgent: makeAgentForV2 }) : runTaskV1({ task, world, worldLabel, kind, arm, makeAgent: makeAgentForV2 }));
    }
  }
  return rows;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const weightedEce = (rows) => {
  let w = 0, s = 0;
  for (const r of rows) { const q = r.secondary.quality; if (q && q.ece !== null) { s += q.ece * q.calibrated; w += q.calibrated; } }
  return w ? s / w : null;
};
const eceOfBins = (bins) => { const n = bins.reduce((s, b) => s + b.n, 0); return n ? bins.reduce((s, b) => s + (b.n ? Math.abs(b.hit - b.pred) : 0), 0) / n : null; };
/** Pooled ECE (all runs' bins added), and the noise floor: the weighted per-run ECE a forecaster whose bin
 *  probabilities were exactly right would score on the same bin occupancies (2,000 seeded simulations). */
function calibrationDetail(rows, label) {
  const runs = rows.map((r) => r.secondary.quality?.bins).filter(Boolean);
  if (!runs.length) return null;
  const pooled = Array.from({ length: 10 }, (_, i) => ({ n: 0, pred: 0, hit: 0 }));
  for (const bins of runs) bins.forEach((b, i) => { pooled[i].n += b.n; pooled[i].pred += b.pred; pooled[i].hit += b.hit; });
  const rnd = makeStream(label), sims = [];
  for (let k = 0; k < 2000; k++) {
    let s = 0, w = 0;
    for (const bins of runs) {
      const n = bins.reduce((a, b) => a + b.n, 0); if (!n) continue;
      let err = 0;
      for (const b of bins) { if (!b.n) continue; const p = b.pred / b.n; let h = 0; for (let j = 0; j < b.n; j++) if (rnd() < p) h++; err += Math.abs(h - b.pred); }
      s += err; w += n;
    }
    sims.push(s / w);
  }
  sims.sort((a, b) => a - b);
  return { pooledEce: eceOfBins(pooled), noiseFloorMean: mean(sims), noiseFloorP95: sims[Math.floor(0.95 * sims.length)], bins: pooled.map((b) => ({ n: b.n, meanPredicted: b.n ? b.pred / b.n : null, hitRate: b.n ? b.hit / b.n : null })) };
}

function analyse(rows, domain) {
  const cell = (task, arm, kind) => new Map(rows.filter((r) => r.task === task && r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  const paired = (task, arm, kA, kB, label, f = (r) => r.metric) => {
    const A = cell(task, arm, kA), B = cell(task, arm, kB);
    const diffs = [...A.keys()].filter((w) => B.has(w)).sort().map((w) => f(A.get(w)) - f(B.get(w)));
    return { contrast: `${kA} - ${kB} (${task}.${arm})`, sd: sd(diffs), ...pairedBootstrap(diffs, label) };
  };
  const eceOf = (r) => r.secondary.quality.ece;
  const S = (x) => `cf|stats|${domain}|cf03b|${x}`;
  const out = { acceptance: {}, noRegression: {}, reported: {}, ablations: {}, calibration: {}, means: {}, censoring: {}, compute: {}, model: {}, excludedWorlds: [...new Set(rows.filter((r) => r.excluded).map((r) => `${r.task}:${r.world}`))] };
  const e1s = (k) => [...cell('E1S', 'EXPLORED', k).values()];
  out.acceptance.B1_ECE = weightedEce(e1s('MBVI2'));
  out.acceptance.B2_ECE_improvement = paired('E1S', 'EXPLORED', 'MBVI', 'MBVI2', S('ECE'), eceOf);
  out.acceptance.B3_E3 = paired('E3', 'STD', 'DYNAQ', 'MBVI2', S('E3'));
  out.acceptance.B4_E1 = paired('E1', 'EXPLORED', 'MBVI2', 'DYNAQ', S('E1'));
  const llDiffs = e1s('MBVI2').sort((a, b) => (a.world < b.world ? -1 : 1)).map((r) => r.secondary.quality.meanLL - r.secondary.quality.meanLLUniform);
  out.acceptance.B5_loglik = { contrast: 'mean log-likelihood MBVI2 - uniform over exits (E1S)', sd: sd(llDiffs), ...pairedBootstrap(llDiffs, S('LL')) };
  for (const [task, arm] of [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']]) out.noRegression[`${task}.${arm}`] = paired(task, arm, 'MBVI2', 'MBVI', S(`NR|${task}`));
  out.reported.E1_NAIVE_DYNAQ_minus_MBVI2 = paired('E1', 'NAIVE', 'DYNAQ', 'MBVI2', S('E1N'));
  out.reported.E1_NAIVE_MBVI2_minus_MBVI = paired('E1', 'NAIVE', 'MBVI2', 'MBVI', S('E1N2'));
  out.reported.E1S_DYNAQ_minus_MBVI2 = paired('E1S', 'EXPLORED', 'DYNAQ', 'MBVI2', S('E1S'));
  out.reported.E2P_DYNAQ_minus_MBVI2 = paired('E2P', 'PRE', 'DYNAQ', 'MBVI2', S('E2P'));
  out.reported.loglik_MBVI2_minus_MBVI = paired('E1S', 'EXPLORED', 'MBVI2', 'MBVI', S('LL2'), (r) => r.secondary.quality.meanLL);
  for (const ab of Object.keys(MBVI2_VARIANTS).filter((k) => k !== 'MBVI2')) {
    out.ablations[`${ab}.ECE`] = paired('E1S', 'EXPLORED', ab, 'MBVI2', S(`${ab}|ECE`), eceOf);
    for (const [task, arm] of [['E3', 'STD'], ['E1', 'NAIVE'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']]) out.ablations[`${ab}.${task}`] = paired(task, arm, ab, 'MBVI2', S(`${ab}|${task}`));
  }
  for (const k of ['MBVI', ...Object.keys(MBVI2_VARIANTS)]) out.calibration[k] = { weightedPerRunEce: weightedEce(e1s(k)), ...calibrationDetail(e1s(k), S(`floor|${k}`)) };
  for (const [task, arm] of CELLS) for (const k of KINDS) {
    const xs = [...cell(task, arm, k).values()], key = `${task}.${arm}.${k}`;
    out.means[key] = mean(xs.map((r) => r.metric));
    out.censoring[key] = xs.reduce((s, r) => s + r.censored, 0) / Math.max(1, xs.reduce((s, r) => s + r.testSteps.length, 0));
    if (xs[0]?.secondary.compute) out.compute[key] = { backupsPerDecision: mean(xs.map((r) => r.secondary.compute.backupsPerDecision)), sweepsPerDecision: mean(xs.map((r) => r.secondary.compute.sweepsPerDecision)), budgetHitShare: mean(xs.map((r) => r.secondary.compute.budgetHitShare)) };
    if (xs[0]?.secondary.model) { const m = xs.map((r) => r.secondary.model); out.model[key] = { transitionResets: mean(m.map((x) => x.transitionResets)), rewardResets: mean(m.map((x) => x.rewardResets)), globalRewardResets: mean(m.map((x) => x.globalRewardResets)), ...(m[0].mu !== undefined ? { mu: mean(m.map((x) => x.mu)), nu: mean(m.map((x) => x.nu)), strengths: m.map((x) => x.S) } : {}) }; }
  }
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const rowsA = matrix(DOMAIN, N), rowsB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(rowsA)), hashB = sha(JSON.stringify(rowsB));
const analysis = analyse(rowsA, DOMAIN);
const g5 = [];
for (const [task, arm] of CELLS.filter(([t]) => DETERMINISTIC.includes(t))) for (const k of LEARNERS) {
  const o = analysis.means[`${task}.${arm}.ORACLE`], m = analysis.means[`${task}.${arm}.${k}`];
  if (!(o <= m)) g5.push(`${task}.${arm}: ORACLE ${o} > ${k} ${m}`);
}
const A = analysis.acceptance;
const criteria = {
  B1_calibration: A.B1_ECE !== null && A.B1_ECE <= ECE_LIMIT,
  B2_improvement: A.B2_ECE_improvement.n > 0 && A.B2_ECE_improvement.mean > 0 && A.B2_ECE_improvement.lo > 0,
  B3_E3_beats_DYNAQ: A.B3_E3.n > 0 && A.B3_E3.mean > 0 && A.B3_E3.lo > 0,
  B4_E1_noninferior_to_DYNAQ: A.B4_E1.n > 0 && A.B4_E1.hi < MARGIN,
  B5_loglik: A.B5_loglik.n > 0 && A.B5_loglik.mean > 0 && A.B5_loglik.lo > 0,
  B6_no_regression: Object.values(analysis.noRegression).every((c) => c.n > 0 && c.hi < MARGIN),
};
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0, oracleReference: g5.length === 0 };
const infraOk = Object.values(infra).every(Boolean);
const failed = Object.entries(criteria).filter(([, v]) => !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-03b INVALID' : failed.length ? `CF-03b FAIL (${failed.join(', ')})` : 'CF-03b PASS';
const mfw = mfwWorld(path.join(ROOT, 'connections.json'));
const reference = CELLS.flatMap(([task, arm]) => ['QL', 'DYNAQ', 'MBVI', 'MBVI2', 'ORACLE'].map((kind) => {
  const r = task === 'E2P' ? runE2P({ world: mfw, worldLabel: 'cf|ref|mfw-graph', kind, arm, makeAgent: makeAgentForV2 }) : runTaskV1({ task, world: mfw, worldLabel: 'cf|ref|mfw-graph', kind, arm, makeAgent: makeAgentForV2 });
  return { task, arm, kind, metric: r.metric ?? null };
}));
const result = {
  evidence: 'CF-03b world model v2 calibration gate (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate3b' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { tasks: TASK_PARAMS, e2p: E2P_PARAMS, DYNAQ: DYNAQ_DEFAULTS, MBVI: MBVI_DEFAULTS, MBVI2: MBVI2_DEFAULTS, variants: MBVI2_VARIANTS, margin: MARGIN, eceLimit: ECE_LIMIT, bootstrapResamples: 10000, e1sReliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, g5, criteria, verdict, analysis, referenceWorld: { world: 'mfw-graph (reported only)', rows: reference }, rowsSha256: hashA, rows: rowsA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, acceptance: analysis.acceptance, noRegression: analysis.noRegression, calibration: Object.fromEntries(Object.entries(analysis.calibration).map(([k, v]) => [k, { weightedPerRunEce: v.weightedPerRunEce, pooledEce: v.pooledEce, noiseFloorMean: v.noiseFloorMean, noiseFloorP95: v.noiseFloorP95 }])), ablations: analysis.ablations, reported: analysis.reported }, null, 1));
process.exit(infraOk ? 0 : 1);

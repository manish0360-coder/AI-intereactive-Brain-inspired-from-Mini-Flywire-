// ==========================================================
// CF-05 — recovery after a reversed change (criteria in experiments/cf05/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf05/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf05/run_gate.mjs --domain gate5
// Primary mechanism under test: RECALL (MBVI4_RECALL, hazard 0.01).  Criteria, all on task E4 unless stated:
//   R1  benefit:                 return window, CHANGE: steps(MBVI3) - steps(RECALL), mean > 0 and lower bound > 0
//   R2  no cost while blocked:   postAll, CHANGE: steps(RECALL) - steps(MBVI3), upper bound < MARGIN
//   R3  no cost when unchanged:  metric, SHAM: steps(RECALL) - steps(MBVI3), upper bound < MARGIN
//   R4  no regression:           steps(RECALL) - steps(MBVI3) upper bound < MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   R5  beats the textbook baseline: metric, CHANGE: steps(Dyna-Q+) - steps(RECALL), lower bound > 0, for Dyna-Q+
//       at its usual planning budget AND at a budget matched to the planner's
//   R6  infrastructure: determinism (two in-process runs) and all tests pass
// Verdict: INVALID (R6) / RECOVERY NOT SUPPORTED (R1 fails) / RECOVERY SUPPORTED AT A COST (R1 holds; some of
//          R2-R5 fail, listed) / RECOVERY SUPPORTED (R1-R6).
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE4, E4_PARAMS, E4_ARMS } from '../../cognitive/testbed/task_e4.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV5 } from '../../cognitive/testbed/registry_v5.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE5_WORLDS = 60;   // fixed before the gate5 run; see GATE_SPEC.md (the rule gives 30; doubled, at the cap)
export const MARGIN = 10;         // steps
// name -> [registry kind, parameters].  Parameters were fixed on the dev domain by the rule in GATE_SPEC.md.
export const ARMS = Object.freeze({
  ORACLE: ['ORACLE', {}],
  MBVI3: ['MBVI3', {}],
  RECALL: ['MBVI4_RECALL', { hazard: 0.01 }],
  BONUS: ['MBVI4_BONUS', { kappa: 0.001 }],
  DECAY: ['MBVI4_DECAY', { hazard: 0.0003 }],
  DYNAQ: ['DYNAQ', {}],
  DYNAQP: ['DYNAQP', { kappa: 0.001 }],
  DYNAQP_MATCHED: ['DYNAQP_MATCHED', { kappa: 0.001 }],
  RECALL_H003: ['MBVI4_RECALL', { hazard: 0.003 }],            // sensitivity (reported)
  RECALL_H03: ['MBVI4_RECALL', { hazard: 0.03 }],              // sensitivity (reported)
  MBVI3_CH0005: ['MBVI3', { changeHazard: 0.0005 }],           // change-detection constant, 4x lower (reported)
  MBVI3_CH008: ['MBVI3', { changeHazard: 0.008 }],             // change-detection constant, 4x higher (reported)
});
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const BATTERY_ARMS = ['MBVI3', 'RECALL'];
const WINDOWS = ['stable', 'post', 'postAll', 'return', 'returnLast'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf05 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate5'].includes(DOMAIN)) die('--domain must be dev or gate5');
const N = DOMAIN === 'gate5' ? GATE5_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate5' ? path.join(HERE, 'results', 'gate5_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf05');
  if (dirty) die(`CF-05 files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate5 domain has already been run');
}

/** Build the agent for a named arm: the registry kind with that arm's parameters. */
const agentFor = (name) => (kind, env, label) => makeAgentForV5(ARMS[name][0], env, label, ARMS[name][1]);

function matrix(domain, n) {
  const e4 = [], battery = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const arm of E4_ARMS) for (const name of Object.keys(ARMS)) e4.push({ name, ...runE4({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) }) });
    for (const name of BATTERY_ARMS) for (const [task, arm] of BATTERY) {
      const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) });
      battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
    }
  }
  return { e4, battery };
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

function analyse({ e4, battery }, domain) {
  const S = (x) => `cf|stats|${domain}|cf05|${x}`;
  const cell = (arm, name) => new Map(e4.filter((r) => r.arm === arm && r.name === name && !r.excluded).map((r) => [r.world, r]));
  const value = (w) => (r) => (w === 'metric' ? r.metric : r.windows[w]);
  /** A - B, paired by world: mean with bootstrap interval, SD, median, and counts of worlds where A needs fewer / more / equal steps. */
  const paired = (arm, a, b, w) => {
    const A = cell(arm, a), B = cell(arm, b);
    const d = [...A.keys()].filter((x) => B.has(x)).sort().map((x) => value(w)(A.get(x)) - value(w)(B.get(x)));
    return { contrast: `${a} - ${b} (${arm}.${w})`, sd: sd(d), median: median(d), fewer: d.filter((x) => x < 0).length, more: d.filter((x) => x > 0).length, equal: d.filter((x) => x === 0).length, mde80: d.length ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(`${arm}|${a}|${b}|${w}`)) };
  };
  const out = { primary: {}, candidates: {}, baselines: {}, sensitivity: {}, battery: {}, means: {}, excludedWorlds: [...new Set(e4.filter((r) => r.excluded).map((r) => r.world))] };
  out.primary.R1_benefit = paired('CHANGE', 'MBVI3', 'RECALL', 'return');
  out.primary.R2_cost_while_blocked = paired('CHANGE', 'RECALL', 'MBVI3', 'postAll');
  out.primary.R3_cost_when_unchanged = paired('SHAM', 'RECALL', 'MBVI3', 'metric');
  out.primary.R5_DYNAQP_minus_RECALL = paired('CHANGE', 'DYNAQP', 'RECALL', 'metric');
  out.primary.R5_DYNAQP_MATCHED_minus_RECALL = paired('CHANGE', 'DYNAQP_MATCHED', 'RECALL', 'metric');
  out.primary.remaining_gap_RECALL_minus_ORACLE = paired('CHANGE', 'RECALL', 'ORACLE', 'return');
  out.primary.gap_MBVI3_minus_ORACLE = paired('CHANGE', 'MBVI3', 'ORACLE', 'return');
  out.primary.RECALL_minus_MBVI3_metric = paired('CHANGE', 'RECALL', 'MBVI3', 'metric');
  for (const name of ['BONUS', 'DECAY', 'RECALL_H003', 'RECALL_H03', 'MBVI3_CH0005', 'MBVI3_CH008']) {
    const target = name.startsWith('RECALL') || name.startsWith('MBVI3_') ? out.sensitivity : out.candidates;
    target[name] = { return: paired('CHANGE', name, 'MBVI3', 'return'), postAll: paired('CHANGE', name, 'MBVI3', 'postAll'), post: paired('CHANGE', name, 'MBVI3', 'post'), sham: paired('SHAM', name, 'MBVI3', 'metric'), metric: paired('CHANGE', name, 'MBVI3', 'metric') };
  }
  for (const name of ['DYNAQ', 'DYNAQP', 'DYNAQP_MATCHED']) out.baselines[name] = { return: paired('CHANGE', name, 'MBVI3', 'return'), postAll: paired('CHANGE', name, 'MBVI3', 'postAll'), sham: paired('SHAM', name, 'MBVI3', 'metric'), metric: paired('CHANGE', name, 'MBVI3', 'metric') };
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`, A = new Map(battery.filter((r) => r.name === 'RECALL' && r.cell === key && !r.excluded).map((r) => [r.world, r])), B = new Map(battery.filter((r) => r.name === 'MBVI3' && r.cell === key && !r.excluded).map((r) => [r.world, r]));
    const d = [...A.keys()].filter((x) => B.has(x)).sort().map((x) => A.get(x).metric - B.get(x).metric);
    out.battery[key] = { contrast: `RECALL - MBVI3 (${key})`, sd: sd(d), median: median(d), meanRECALL: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B.values()].map((r) => r.metric)), ...pairedBootstrap(d, S(`bat|${key}`)) };
  }
  for (const arm of E4_ARMS) for (const name of Object.keys(ARMS)) {
    const xs = [...cell(arm, name).values()];
    const work = xs.map((r) => r.secondary.compute).filter(Boolean);
    out.means[`${arm}.${name}`] = {
      ...Object.fromEntries(WINDOWS.map((w) => [w, mean(xs.map((r) => r.windows[w]))])), metric: mean(xs.map((r) => r.metric)), medianMetric: median(xs.map((r) => r.metric)),
      cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), worldsWithCappedEpisode: xs.filter((r) => r.censored > 0).length, usedReopened: mean(xs.map((r) => r.secondary.usedReopened)),
      workPerStep: work.length ? mean(work.map((c) => c.backupsPerDecision ?? c.updatesPerStep ?? 0)) : null, workUnit: work.length ? (work[0].backupsPerDecision !== undefined ? 'value-iteration backups per decision' : 'planning updates per step') : null,
    };
  }
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const runA = matrix(DOMAIN, N), runB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);
const P = analysis.primary;
const criteria = {
  R1_benefit: P.R1_benefit.n > 0 && P.R1_benefit.mean > 0 && P.R1_benefit.lo > 0,
  R2_no_cost_while_blocked: P.R2_cost_while_blocked.n > 0 && P.R2_cost_while_blocked.hi < MARGIN,
  R3_no_cost_when_unchanged: P.R3_cost_when_unchanged.n > 0 && P.R3_cost_when_unchanged.hi < MARGIN,
  R4_no_regression: Object.values(analysis.battery).every((c) => c.n > 0 && c.hi < MARGIN),
  R5_beats_dyna_q_plus: P.R5_DYNAQP_minus_RECALL.lo > 0 && P.R5_DYNAQP_MATCHED_minus_RECALL.lo > 0,
};
const cappedInCriteria = ['MBVI3', 'RECALL'].flatMap((n) => E4_ARMS.map((a) => analysis.means[`${a}.${n}`].cappedEpisodes)).reduce((a, b) => a + b, 0);
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const others = Object.entries(criteria).filter(([k, v]) => k !== 'R1_benefit' && !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-05 INVALID' : !criteria.R1_benefit ? 'CF-05 RECOVERY NOT SUPPORTED (R1_benefit)'
  : others.length ? `CF-05 RECOVERY SUPPORTED AT A COST (${others.join(', ')})` : 'CF-05 RECOVERY SUPPORTED';
const result = {
  evidence: 'CF-05 recovery after a reversed change (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate5' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E4_PARAMS, arms: ARMS, margin: MARGIN, bootstrapResamples: 10000, reliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria, cappedEpisodesInCriterionAgents: cappedInCriteria, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, cappedEpisodesInCriterionAgents: cappedInCriteria }, null, 1));
process.exit(infraOk ? 0 : 1);

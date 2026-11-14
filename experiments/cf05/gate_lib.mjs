// ==========================================================
// CF-05 / CF-05b — shared gate driver (each gate's run_gate.mjs supplies a configuration; criteria are in its GATE_SPEC.md)
// ==========================================================
// One mechanism (config.primary) is tested against the existing planner MBVI3 on task E4B, in three arms:
//   CHANGE     an edge on the route is blocked, then reopened      -> benefit (R1) and cost while blocked (R2)
//   SHAM       an edge off the route is blocked, then reopened     -> cost when the route never changes (R3)
//   PERMANENT  the edge on the route is blocked and stays blocked  -> cost when the change is permanent (R4)
// plus the existing battery (R5: no regression) and the Dyna-Q+ baseline at two planning budgets (R6).
//   R1  return window, CHANGE:   steps(MBVI3) - steps(primary), mean > 0 and lower bound > 0
//   R2  postAll, CHANGE:         steps(primary) - steps(MBVI3), upper bound < MARGIN
//   R3  metric, SHAM:            steps(primary) - steps(MBVI3), upper bound < MARGIN
//   R4  metric, PERMANENT:       steps(primary) - steps(MBVI3), upper bound < MARGIN
//   R5  battery:                 steps(primary) - steps(MBVI3) upper bound < MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   R6  metric, CHANGE:          steps(Dyna-Q+) - steps(primary), lower bound > 0 at both planning budgets
//   R7  infrastructure:          two in-process runs identical, all tests pass
// Verdict: INVALID (R7) / NOT SUPPORTED (R1 fails) / SUPPORTED AT A COST (R1 holds; some of R2-R6 fail, listed) /
//          SUPPORTED (R1-R7).
// Reported, never pass/fail: every other arm against MBVI3 on every window and arm; medians and per-world counts;
// capped episodes; work per step; the larger-world repetition; the net effect over the three arms.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE4B, E4B_ARMS } from '../../cognitive/testbed/task_e4b.mjs';
import { E4_PARAMS } from '../../cognitive/testbed/task_e4.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV5 } from '../../cognitive/testbed/registry_v5.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const MARGIN = 10;   // steps
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const WINDOWS = ['stable', 'post', 'postAll', 'return', 'returnLast'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs'];
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/**
 * config: { id, here, gateDomain, gateWorlds, primary, arms: { name: [kind, params, options?] }, r6: [names],
 *           large: { worlds, nodes, edges, exploreSteps, arms: [names] }, cleanPaths: [repo paths] }
 * An arm's options may hold { diagnostic: 'recallOnly' | 'recallExcept' }: such an arm is told the manipulated edge.
 */
export async function runGate(config) {
  const ROOT = path.resolve(config.here, '..', '..');
  const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const die = (m) => { console.error(`${config.id} run_gate refused: ${m}`); process.exit(2); };
  const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
  const DOMAIN = arg('--domain');
  if (!['dev', config.gateDomain].includes(DOMAIN)) die(`--domain must be dev or ${config.gateDomain}`);
  const isGate = DOMAIN === config.gateDomain;
  const N = isGate ? config.gateWorlds : Number(arg('--worlds', '20'));
  const NL = isGate ? config.large.worlds : Number(arg('--large-worlds', '0'));
  const SPEC = path.join(config.here, 'GATE_SPEC.md');
  const OUT = isGate ? path.join(config.here, 'results', `${config.gateDomain}_result.json`) : path.resolve(arg('--out') ?? '');
  if (!isGate) {
    const rel = path.relative(ROOT, OUT);
    if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
  } else {
    if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
    if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
    const dirty = git('status', '--porcelain', '--untracked-files=all', '--', ...config.cleanPaths);
    if (dirty) die(`files are not all committed and clean:\n${dirty}`);
    if (fs.existsSync(OUT)) die(`the ${config.gateDomain} domain has already been run`);
  }
  const ARMS = config.arms;
  const agentFor = (name) => (kind, env, label, params, context) => {
    const [k, p, o] = ARMS[name];
    const extra = o?.diagnostic && context ? { [o.diagnostic]: context.manipulatedPairs } : {};
    return makeAgentForV5(k, env, label, { ...p, ...extra });
  };
  const e4Row = (name, world, worldLabel, arm, exploreSteps) => ({ name, ...runE4B({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name), ...(exploreSteps ? { exploreSteps } : {}) }) });

  function matrix(domain) {
    const e4 = [], battery = [], large = [];
    for (let i = 0; i < N; i++) {
      const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
      for (const arm of E4B_ARMS) for (const name of Object.keys(ARMS)) e4.push(e4Row(name, world, worldLabel, arm));
      for (const name of ['MBVI3', config.primary]) for (const [task, arm] of BATTERY) {
        const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: agentFor(name) });
        battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
      }
    }
    for (let i = 0; i < NL; i++) {
      const worldLabel = `cf|${domain}|large|${i}`, world = generateWorld(worldLabel, { nodes: config.large.nodes, edges: config.large.edges, maxDegree: 4 });
      for (const arm of E4B_ARMS) for (const name of config.large.arms) large.push(e4Row(name, world, worldLabel, arm, config.large.exploreSteps));
    }
    return { e4, battery, large };
  }

  function analyse({ e4, battery, large }, domain) {
    const S = (x) => `cf|stats|${domain}|${config.id}|${x}`;
    const value = (w) => (r) => (w === 'metric' ? r.metric : r.windows[w]);
    const cellOf = (rows) => (arm, name) => new Map(rows.filter((r) => r.arm === arm && r.name === name && !r.excluded).map((r) => [r.world, r]));
    const pairedOf = (rows, tag) => (arm, a, b, w) => {
      const cell = cellOf(rows), A = cell(arm, a), B = cell(arm, b);
      const d = [...A.keys()].filter((x) => B.has(x)).sort().map((x) => value(w)(A.get(x)) - value(w)(B.get(x)));
      return { contrast: `${a} - ${b} (${arm}.${w})`, sd: sd(d), median: median(d), fewer: d.filter((x) => x < 0).length, more: d.filter((x) => x > 0).length, equal: d.filter((x) => x === 0).length, mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(`${tag}|${arm}|${a}|${b}|${w}`)) };
    };
    const paired = pairedOf(e4, 'e4'), cell = cellOf(e4), X = config.primary;
    const out = { primary: {}, others: {}, battery: {}, large: {}, means: {}, excludedWorlds: [...new Set(e4.filter((r) => r.excluded).map((r) => r.world))] };
    out.primary.R1_benefit = paired('CHANGE', 'MBVI3', X, 'return');
    out.primary.R2_cost_while_blocked = paired('CHANGE', X, 'MBVI3', 'postAll');
    out.primary.R3_cost_when_unchanged = paired('SHAM', X, 'MBVI3', 'metric');
    out.primary.R4_cost_when_permanent = paired('PERMANENT', X, 'MBVI3', 'metric');
    for (const b of config.r6) out.primary[`R6_${b}_minus_primary`] = paired('CHANGE', b, X, 'metric');
    out.primary.remaining_gap_primary_minus_ORACLE = paired('CHANGE', X, 'ORACLE', 'return');
    out.primary.gap_MBVI3_minus_ORACLE = paired('CHANGE', 'MBVI3', 'ORACLE', 'return');
    // net effect of the primary over the three arms, equally weighted, paired by world
    {
      const maps = E4B_ARMS.map((arm) => [cell(arm, X), cell(arm, 'MBVI3')]);
      const worlds = [...maps[0][0].keys()].filter((w) => maps.every(([a, b]) => a.has(w) && b.has(w))).sort();
      const d = worlds.map((w) => maps.reduce((s, [a, b]) => s + a.get(w).metric - b.get(w).metric, 0));
      out.primary.net_three_arms_primary_minus_MBVI3 = { contrast: `${X} - MBVI3, sum of metric over CHANGE + SHAM + PERMANENT`, sd: sd(d), median: median(d), fewer: d.filter((x) => x < 0).length, more: d.filter((x) => x > 0).length, equal: d.filter((x) => x === 0).length, ...pairedBootstrap(d, S('net')) };
    }
    for (const name of Object.keys(ARMS).filter((n) => !['ORACLE', 'MBVI3', X].includes(n))) {
      out.others[name] = { return: paired('CHANGE', name, 'MBVI3', 'return'), postAll: paired('CHANGE', name, 'MBVI3', 'postAll'), changeMetric: paired('CHANGE', name, 'MBVI3', 'metric'), sham: paired('SHAM', name, 'MBVI3', 'metric'), permanent: paired('PERMANENT', name, 'MBVI3', 'metric') };
    }
    for (const [task, arm] of BATTERY) {
      const key = `${task}.${arm}`, pick = (n) => new Map(battery.filter((r) => r.name === n && r.cell === key && !r.excluded).map((r) => [r.world, r])), A = pick(X), B = pick('MBVI3');
      const d = [...A.keys()].filter((x) => B.has(x)).sort().map((x) => A.get(x).metric - B.get(x).metric);
      out.battery[key] = { contrast: `${X} - MBVI3 (${key})`, sd: sd(d), median: median(d), meanPrimary: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B.values()].map((r) => r.metric)), ...pairedBootstrap(d, S(`bat|${key}`)) };
    }
    if (large.length) {
      const pl = pairedOf(large, 'large'), cl = cellOf(large);
      out.large = { worlds: NL, nodes: config.large.nodes, edges: config.large.edges, exploreSteps: config.large.exploreSteps, benefit_return: pl('CHANGE', 'MBVI3', X, 'return'), cost_while_blocked: pl('CHANGE', X, 'MBVI3', 'postAll'), cost_when_unchanged: pl('SHAM', X, 'MBVI3', 'metric'), cost_when_permanent: pl('PERMANENT', X, 'MBVI3', 'metric'), gap_MBVI3_minus_ORACLE: pl('CHANGE', 'MBVI3', 'ORACLE', 'return'), cappedEpisodes: Object.fromEntries(config.large.arms.map((n) => [n, E4B_ARMS.reduce((s, arm) => s + [...cl(arm, n).values()].reduce((a, r) => a + r.censored, 0), 0)])), excludedWorlds: [...new Set(large.filter((r) => r.excluded).map((r) => r.world))] };
    }
    for (const arm of E4B_ARMS) for (const name of Object.keys(ARMS)) {
      const xs = [...cell(arm, name).values()], work = xs.map((r) => r.secondary.compute).filter(Boolean), rec = xs.map((r) => r.secondary.recovery).filter(Boolean), model = xs.map((r) => r.secondary.model).filter(Boolean);
      out.means[`${arm}.${name}`] = {
        ...Object.fromEntries(WINDOWS.map((w) => [w, mean(xs.map((r) => r.windows[w]))])), metric: mean(xs.map((r) => r.metric)), medianMetric: median(xs.map((r) => r.metric)),
        cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), worldsWithCappedEpisode: xs.filter((r) => r.censored > 0).length,
        usedReopened: mean(xs.map((r) => r.secondary.usedReopened)), triedManipulated: mean(xs.map((r) => r.secondary.triedManipulated)),
        workPerStep: work.length ? mean(work.map((c) => c.backupsPerDecision ?? c.updatesPerStep ?? 0)) : null, workUnit: work.length ? (work[0].backupsPerDecision !== undefined ? 'value-iteration backups per decision' : 'planning updates per step') : null,
        remembered: rec.length && rec[0].remembered !== undefined ? mean(rec.map((x) => x.remembered)) : null,
        changesDeclaredWorse: model.length && model[0].changesDown !== undefined ? mean(model.map((x) => x.changesDown)) : null,
      };
    }
    return out;
  }

  const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
  const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
  const runA = matrix(DOMAIN), runB = matrix(DOMAIN);
  const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
  const analysis = analyse(runA, DOMAIN);
  const P = analysis.primary;
  const criteria = {
    R1_benefit: P.R1_benefit.n > 0 && P.R1_benefit.mean > 0 && P.R1_benefit.lo > 0,
    R2_no_cost_while_blocked: P.R2_cost_while_blocked.n > 0 && P.R2_cost_while_blocked.hi < MARGIN,
    R3_no_cost_when_unchanged: P.R3_cost_when_unchanged.n > 0 && P.R3_cost_when_unchanged.hi < MARGIN,
    R4_no_cost_when_permanent: P.R4_cost_when_permanent.n > 0 && P.R4_cost_when_permanent.hi < MARGIN,
    R5_no_regression: Object.values(analysis.battery).every((c) => c.n > 0 && c.hi < MARGIN),
    R6_beats_dyna_q_plus: config.r6.every((b) => P[`R6_${b}_minus_primary`].lo > 0),
  };
  const cappedInCriteria = ['MBVI3', config.primary].flatMap((n) => E4B_ARMS.map((a) => analysis.means[`${a}.${n}`].cappedEpisodes)).reduce((a, b) => a + b, 0);
  const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
  const infraOk = Object.values(infra).every(Boolean);
  const others = Object.entries(criteria).filter(([k, v]) => k !== 'R1_benefit' && !v).map(([k]) => k);
  const label = config.id.toUpperCase().replace('CF05', 'CF-05');
  const verdict = !infraOk ? `${label} INVALID` : !criteria.R1_benefit ? `${label} NOT SUPPORTED (R1_benefit)` : others.length ? `${label} SUPPORTED AT A COST (${others.join(', ')})` : `${label} SUPPORTED`;
  const result = {
    evidence: `${label} recovery after a reversed change, primary mechanism ${config.primary} (development, not confirmatory)`, domain: DOMAIN, worlds: N, largeWorlds: NL,
    environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: isGate },
    specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
    parameters: { task: E4_PARAMS, taskArms: E4B_ARMS, primary: config.primary, arms: ARMS, r6: config.r6, large: config.large, margin: MARGIN, bootstrapResamples: 10000, reliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
    tests, infra, criteria, cappedEpisodesInCriterionAgents: cappedInCriteria, verdict, analysis, rowsSha256: hashA, rows: runA,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
  console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, cappedEpisodesInCriterionAgents: cappedInCriteria }, null, 1));
  process.exit(infraOk ? 0 : 1);
}

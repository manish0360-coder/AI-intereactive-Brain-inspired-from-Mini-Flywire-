// ==========================================================
// CF-06 — learning how often changes reverse (criteria in experiments/cf06/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf06/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf06/run_gate.mjs --domain gate6
// Every world is run in all three families (RARE 0.1, HALF 0.5, OFTEN 0.9) of task E5, by every arm.
//   V1  equal mix: for every fixed policy X (never re-test; RECALL 0.003, 0.01, 0.03), per-world sum over the three
//       families of steps(X) - steps(VOL), mean > 0 and lower bound > 0
//   V2  RARE (re-testing hurts): steps(VOL) - steps(MBVI3), upper bound < MARGIN
//   V3  OFTEN (re-testing helps): steps(MBVI3) - steps(VOL), mean > 0 and lower bound > 0
//   V4  the rate is learned: VOL's final rho, OFTEN minus RARE, paired by world, mean > 0 and lower bound > 0
//   V5  no regression: steps(VOL) - steps(MBVI3) upper bound < BATTERY_MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   V6  infrastructure: two in-process runs identical; all tests pass
// Verdict: INVALID (V6) / NOT SUPPORTED (V1 fails) / SUPPORTED WITH EXCEPTIONS (V1 holds; some of V2-V5 fail,
//          listed) / SUPPORTED (V1-V6).
// Reported, never pass/fail: every arm in every family (mean, median, per-world counts, capped episodes); VOL against
// the privileged reference that is told the family's true rate; the HALF family; learned rho and its trajectory;
// work per decision; wall-clock and memory (outside the hashed rows).
// Refusals on the gate domain: missing or unfrozen specification, specification not matching GATE_SPEC.sha256,
// uncommitted or modified files, gate already run.  HEAD is recorded at launch and at the end.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE5, E5_FAMILIES, E5_PARAMS } from '../../cognitive/testbed/task_e5.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV6 } from '../../cognitive/testbed/registry_v6.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { VOL_DEFAULTS } from '../../cognitive/mind/v6/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE6_WORLDS = 60;      // fixed before the gate6 run; see GATE_SPEC.md
export const MARGIN = 25;            // steps over a run of task E5 (about 2% of the planner's total in RARE)
export const BATTERY_MARGIN = 10;    // steps (the earlier gates' margin, on the earlier tasks)
const FAMILIES = Object.keys(E5_FAMILIES);
// name -> [registry kind, params, label].  VOL_RHO_TRUE is told the family's true rate: a privileged reference.
const ARMS = Object.freeze({
  ORACLE: ['ORACLE', {}, 'privileged reference'],
  MBVI3: ['MBVI3', {}, 'fixed: never re-test'],
  RECALL_003: ['MBVI4_RECALL', { hazard: 0.003 }, 'fixed'],
  RECALL_01: ['MBVI4_RECALL', { hazard: 0.01 }, 'fixed'],
  RECALL_03: ['MBVI4_RECALL', { hazard: 0.03 }, 'fixed'],
  VOL: ['VOL', {}, 'learns the rate (primary)'],
  VOL_RHO_TRUE: ['VOL_RHO', null, 'privileged reference: told the family rate'],
});
const FIXED = ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03'];
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs', 'test_vol.mjs'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf06 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

const DOMAIN = arg('--domain');
if (!['dev', 'gate6'].includes(DOMAIN)) die('--domain must be dev or gate6');
const isGate = DOMAIN === 'gate6';
const N = isGate ? GATE6_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = isGate ? path.join(HERE, 'results', 'gate6_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
if (!isGate) {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
  const SHAFILE = path.join(HERE, 'GATE_SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('GATE_SPEC.sha256 (the frozen hash of the specification) is missing');
  const frozen = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\s+/)[0];
  if (sha(fs.readFileSync(SPEC)) !== frozen) die(`GATE_SPEC.md does not match its frozen SHA-256 ${frozen}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf06');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate6 domain has already been run');
}

const agentFor = (name, family) => (kind, env, label) => {
  const [k, p] = ARMS[name];
  return makeAgentForV6(k, env, label, p === null ? { rhoFixed: E5_FAMILIES[family] } : { ...p });
};

function matrix(domain, timing) {
  const e5 = [], battery = [];
  for (let i = 0; i < N; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const family of FAMILIES) for (const name of Object.keys(ARMS)) {
      const t = performance.now();
      const r = runE5({ world, worldLabel, family, kind: ARMS[name][0], makeAgent: agentFor(name, family) });
      timing[name] = (timing[name] ?? 0) + performance.now() - t;
      e5.push({ name, ...r });
    }
    for (const name of ['MBVI3', 'VOL']) for (const [task, arm] of BATTERY) {
      const mk = agentFor(name, 'HALF');
      const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk });
      battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
    }
  }
  return { e5, battery };
}

function analyse({ e5, battery }, domain) {
  const S = (x) => `cf|stats|${domain}|cf06|${x}`;
  const cell = (family, name) => new Map(e5.filter((r) => r.family === family && r.name === name && !r.excluded).map((r) => [r.world, r]));
  const contrast = (d, label, tag) => ({ contrast: label, sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(tag)) });
  const worldsAll = [...cell('RARE', 'VOL').keys()].filter((w) => FAMILIES.every((f) => Object.keys(ARMS).every((n) => cell(f, n).has(w)))).sort();
  const mixOf = (name) => worldsAll.map((w) => FAMILIES.reduce((s, f) => s + cell(f, name).get(w).metric, 0));
  const pairFam = (family, a, b, f = (r) => r.metric) => { const A = cell(family, a), B = cell(family, b); return worldsAll.map((w) => f(A.get(w)) - f(B.get(w))); };
  const out = { criteria: {}, families: {}, mix: {}, battery: {}, learning: {}, excludedWorlds: [...new Set(e5.filter((r) => r.excluded).map((r) => r.world))], worldsAnalysed: worldsAll.length };
  const V = mixOf('VOL');
  for (const x of FIXED) { const X = mixOf(x); out.criteria[`V1_${x}_minus_VOL_mix`] = contrast(X.map((v, i) => v - V[i]), `${x} - VOL, sum over RARE + HALF + OFTEN`, `V1|${x}`); }
  out.criteria.V2_RARE_VOL_minus_MBVI3 = contrast(pairFam('RARE', 'VOL', 'MBVI3'), 'VOL - MBVI3 (RARE)', 'V2');
  out.criteria.V3_OFTEN_MBVI3_minus_VOL = contrast(pairFam('OFTEN', 'MBVI3', 'VOL'), 'MBVI3 - VOL (OFTEN)', 'V3');
  { const R = cell('RARE', 'VOL'), O = cell('OFTEN', 'VOL'); out.criteria.V4_rho_OFTEN_minus_RARE = contrast(worldsAll.map((w) => O.get(w).secondary.volatility.rho - R.get(w).secondary.volatility.rho), 'final rho of VOL, OFTEN - RARE', 'V4'); }
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`, pick = (n) => new Map(battery.filter((r) => r.name === n && r.cell === key && !r.excluded).map((r) => [r.world, r])), A = pick('VOL'), B = pick('MBVI3');
    const d = [...A.keys()].filter((w) => B.has(w)).sort().map((w) => A.get(w).metric - B.get(w).metric);
    out.battery[key] = { ...contrast(d, `VOL - MBVI3 (${key})`, `bat|${key}`), meanVOL: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B.values()].map((r) => r.metric)) };
  }
  for (const name of Object.keys(ARMS)) { const m = mixOf(name); out.mix[name] = { mean: mean(m), median: median(m) }; }
  out.mix.VOL_minus_VOL_RHO_TRUE = contrast(V.map((v, i) => v - mixOf('VOL_RHO_TRUE')[i]), 'VOL - VOL_RHO_TRUE, mix (the cost of learning the rate)', 'mix|ref');
  for (const family of FAMILIES) {
    const F = { p: E5_FAMILIES[family], arms: {}, contrastsVsVOL: {} };
    for (const name of Object.keys(ARMS)) {
      const xs = [...cell(family, name).values()];
      F.arms[name] = {
        total: mean(xs.map((r) => r.metric)), medianTotal: median(xs.map((r) => r.metric)), blocked: mean(xs.map((r) => r.windows.blocked)), afterReversed: mean(xs.map((r) => r.windows.afterReversed)), afterPermanent: mean(xs.map((r) => r.windows.afterPermanent)),
        cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), reversedEvents: mean(xs.map((r) => r.reversedEvents)), permanentEvents: mean(xs.map((r) => r.permanentEvents)), skippedEvents: mean(xs.map((r) => r.skippedEvents)),
        workPerDecision: xs[0]?.secondary.compute ? mean(xs.map((r) => r.secondary.compute.backupsPerDecision)) : null,
        rhoEnd: xs[0]?.secondary.volatility ? mean(xs.map((r) => r.secondary.volatility.rho)) : null, changesArchived: xs[0]?.secondary.volatility ? mean(xs.map((r) => r.secondary.volatility.opened)) : null, reversalsConfirmed: xs[0]?.secondary.volatility ? mean(xs.map((r) => r.secondary.volatility.confirmed)) : null,
      };
    }
    for (const name of Object.keys(ARMS).filter((n) => n !== 'VOL')) F.contrastsVsVOL[name] = contrast(pairFam(family, name, 'VOL'), `${name} - VOL (${family})`, `fam|${family}|${name}`);
    out.families[family] = F;
  }
  out.learning.rhoTraces = Object.fromEntries(FAMILIES.map((f) => [f, [...cell(f, 'VOL').values()].slice(0, 10).map((r) => r.secondary.volatility.rhoTrace)]));
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const timingA = {}, timingB = {};
const runA = matrix(DOMAIN, timingA), runB = matrix(DOMAIN, timingB);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);
const C = analysis.criteria;
const criteria = {
  V1_beats_every_fixed_policy_on_the_mix: FIXED.every((x) => C[`V1_${x}_minus_VOL_mix`].mean > 0 && C[`V1_${x}_minus_VOL_mix`].lo > 0),
  V2_safe_where_retesting_hurts: C.V2_RARE_VOL_minus_MBVI3.hi < MARGIN,
  V3_helps_where_changes_reverse: C.V3_OFTEN_MBVI3_minus_VOL.mean > 0 && C.V3_OFTEN_MBVI3_minus_VOL.lo > 0,
  V4_rate_is_learned: C.V4_rho_OFTEN_minus_RARE.mean > 0 && C.V4_rho_OFTEN_minus_RARE.lo > 0,
  V5_no_regression: Object.values(analysis.battery).every((c) => c.n > 0 && c.hi < BATTERY_MARGIN),
};
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const exceptions = Object.entries(criteria).filter(([k, v]) => k !== 'V1_beats_every_fixed_policy_on_the_mix' && !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-06 INVALID' : !criteria.V1_beats_every_fixed_policy_on_the_mix ? 'CF-06 NOT SUPPORTED (V1)' : exceptions.length ? `CF-06 SUPPORTED WITH EXCEPTIONS (${exceptions.join(', ')})` : 'CF-06 SUPPORTED';
const cappedVOL = analysis.families.RARE.arms.VOL.cappedEpisodes + analysis.families.HALF.arms.VOL.cappedEpisodes + analysis.families.OFTEN.arms.VOL.cappedEpisodes;
const result = {
  evidence: 'CF-06 learning how often changes reverse (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'), filesClean: isGate },
  resources: { note: 'Not part of the hashed rows', wallClockMsRunA: timingA, wallClockMsRunB: timingB, maxRssKB: process.resourceUsage().maxRSS },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E5_PARAMS, families: E5_FAMILIES, arms: ARMS, VOL: VOL_DEFAULTS, margin: MARGIN, batteryMargin: BATTERY_MARGIN, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria, cappedEpisodesVOL: cappedVOL, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria, headAtLaunch, cappedEpisodesVOL: cappedVOL }, null, 1));
process.exit(infraOk ? 0 : 1);

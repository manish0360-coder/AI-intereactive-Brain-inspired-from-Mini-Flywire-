// ==========================================================
// CF-04 — hidden change and reliability arbitration (frozen in experiments/cf04/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf04/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf04/run_gate.mjs --domain gate4
// Stage A — is task E4 a usable instrument?
//   T1  CHANGE arm, post window: steps(MBVI3 without change detection) - steps(MBVI3), mean > 0 and lower bound > 0
//   T2  the same contrast in the SHAM arm has upper bound < MARGIN, and CHANGE contrast - SHAM contrast has lower bound > 0
// Stage B — does arbitration help?  (evaluated only if Stage A holds; `metric` = all steps after the change)
//   A1  benefit:           metric(MBVI3) - metric(ARB) in CHANGE, mean > 0 and lower bound > 0
//   A2  not just switching: metric(RANDSWITCH) - metric(ARB) in CHANGE, lower bound > 0   (RANDSWITCH is given ARB's
//                           own habit share in that world and arm)
//   A3  no cost at rest:   metric(ARB) - metric(MBVI3) in SHAM, upper bound < MARGIN
//   A4  it acts:           ARB lets the habit decide at least once in at least half of the worlds
// Verdict: INVALID (infrastructure) / TASK NOT ADMITTED (T1 or T2 fails) / ARBITRATION SUPPORTED (A1-A4) /
//          ARBITRATION NOT SUPPORTED (task admitted; some of A1-A4 fail, listed; "HARMFUL" is added when
//          metric(ARB) - metric(MBVI3) in CHANGE has lower bound > 0).
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE4, E4_PARAMS, E4_ARMS } from '../../cognitive/testbed/task_e4.mjs';
import { makeAgentForV4 } from '../../cognitive/testbed/registry_v4.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { ARB_DEFAULTS } from '../../cognitive/mind/arb/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE4_WORLDS = 55;   // fixed before the gate4 run by the pre-declared rule in GATE_SPEC.md
export const MARGIN = 10;         // steps

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf04 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate4'].includes(DOMAIN)) die('--domain must be dev or gate4');
const N = DOMAIN === 'gate4' ? GATE4_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate4' ? path.join(HERE, 'results', 'gate4_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf04');
  if (dirty) die(`CF-04 files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate4 domain has already been run');
}

const KINDS = ['ORACLE', 'QL', 'DYNAQ', 'MBVI3', 'MBVI3_NOCHANGE', 'ARB', 'ARB_T10', 'RANDSWITCH'];   // RANDSWITCH after ARB
const WINDOWS = ['stable', 'post', 'postAll', 'return', 'returnLast'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs'];

function matrix(domain, n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const arm of E4_ARMS) {
      let share = 0;
      for (const kind of KINDS) {
        const r = runE4({ world, worldLabel, kind, arm, makeAgent: makeAgentForV4, params: { RANDSWITCH: { mfShare: share } } });
        if (kind === 'ARB' && !r.excluded) share = r.secondary.control.habitShare;
        rows.push(r);
      }
    }
  }
  return rows;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };

function analyse(rows, domain) {
  const S = (x) => `cf|stats|${domain}|cf04|${x}`;
  const cell = (arm, kind) => new Map(rows.filter((r) => r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  const value = (w) => (r) => (w === 'metric' ? r.metric : r.windows[w]);
  const diffs = (arm, kA, kB, w) => { const A = cell(arm, kA), B = cell(arm, kB); return [...A.keys()].filter((x) => B.has(x)).sort().map((x) => value(w)(A.get(x)) - value(w)(B.get(x))); };
  const paired = (arm, kA, kB, w) => { const d = diffs(arm, kA, kB, w); return { contrast: `${kA} - ${kB} (${arm}.${w})`, sd: sd(d), ...pairedBootstrap(d, S(`${arm}|${kA}|${kB}|${w}`)) }; };
  const out = { stageA: {}, stageB: {}, reported: {}, means: {}, control: {}, excludedWorlds: [...new Set(rows.filter((r) => r.excluded).map((r) => r.world))] };
  out.stageA.T1_change = paired('CHANGE', 'MBVI3_NOCHANGE', 'MBVI3', 'post');
  out.stageA.T2_sham = paired('SHAM', 'MBVI3_NOCHANGE', 'MBVI3', 'post');
  const dc = diffs('CHANGE', 'MBVI3_NOCHANGE', 'MBVI3', 'post'), ds = diffs('SHAM', 'MBVI3_NOCHANGE', 'MBVI3', 'post'), dd = dc.map((x, i) => x - ds[i]);
  out.stageA.T2_change_minus_sham = { contrast: 'CHANGE contrast - SHAM contrast (post)', sd: sd(dd), ...pairedBootstrap(dd, S('T2|dd')) };
  out.stageA.headroom_return = paired('CHANGE', 'MBVI3', 'ORACLE', 'return');
  out.stageA.headroom_post = paired('CHANGE', 'MBVI3', 'ORACLE', 'postAll');
  for (const arb of ['ARB', 'ARB_T10']) {
    const B = { A1_benefit: paired('CHANGE', 'MBVI3', arb, 'metric'), A3_cost_at_rest: paired('SHAM', arb, 'MBVI3', 'metric'), harm: paired('CHANGE', arb, 'MBVI3', 'metric') };
    if (arb === 'ARB') B.A2_vs_random_switch = paired('CHANGE', 'RANDSWITCH', 'ARB', 'metric');
    for (const w of ['post', 'postAll', 'return']) B[`${arb}_minus_MBVI3_${w}`] = paired('CHANGE', arb, 'MBVI3', w);
    const ctl = [...cell('CHANGE', arb).values()].map((r) => r.secondary.control), ctlS = [...cell('SHAM', arb).values()].map((r) => r.secondary.control);
    out.control[arb] = { worlds: ctl.length, worldsWithHabitDecision: ctl.filter((c) => c.habitDecisions > 0).length, habitShare: mean(ctl.map((c) => c.habitShare)), switches: mean(ctl.map((c) => c.switches)), disagreementRate: mean(ctl.map((c) => c.disagreements / c.decisions)), decisiveHabit: mean(ctl.map((c) => c.decisiveHabit)), habitShareSham: mean(ctlS.map((c) => c.habitShare)) };
    out.stageB[arb] = B;
  }
  out.reported.QL_minus_MBVI3 = paired('CHANGE', 'QL', 'MBVI3', 'metric');
  out.reported.DYNAQ_minus_MBVI3 = paired('CHANGE', 'DYNAQ', 'MBVI3', 'metric');
  out.reported.QL_minus_ARB = paired('CHANGE', 'QL', 'ARB', 'metric');
  out.reported.RANDSWITCH_minus_MBVI3 = paired('CHANGE', 'RANDSWITCH', 'MBVI3', 'metric');
  for (const arm of E4_ARMS) for (const k of KINDS) {
    const xs = [...cell(arm, k).values()];
    out.means[`${arm}.${k}`] = { ...Object.fromEntries(WINDOWS.map((w) => [w, mean(xs.map((r) => r.windows[w]))])), metric: mean(xs.map((r) => r.metric)), censored: xs.reduce((s, r) => s + r.censored, 0), usedReopened: mean(xs.map((r) => r.secondary.usedReopened)) };
  }
  const L = [...cell('CHANGE', 'ORACLE').values()].map((r) => r.layout);
  out.layout = { distance: mean(L.map((l) => l.distance)), detourDistance: mean(L.map((l) => l.detourDistance)) };
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const rowsA = matrix(DOMAIN, N), rowsB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(rowsA)), hashB = sha(JSON.stringify(rowsB));
const analysis = analyse(rowsA, DOMAIN);
const A = analysis.stageA, B = analysis.stageB.ARB, C = analysis.control.ARB;
const stageA = {
  T1_change_detection_matters: A.T1_change.n > 0 && A.T1_change.mean > 0 && A.T1_change.lo > 0,
  T2_sham_is_null: A.T2_sham.n > 0 && A.T2_sham.hi < MARGIN && A.T2_change_minus_sham.lo > 0,
};
const stageB = {
  A1_benefit: B.A1_benefit.n > 0 && B.A1_benefit.mean > 0 && B.A1_benefit.lo > 0,
  A2_better_than_random_switch: B.A2_vs_random_switch.n > 0 && B.A2_vs_random_switch.lo > 0,
  A3_no_cost_at_rest: B.A3_cost_at_rest.n > 0 && B.A3_cost_at_rest.hi < MARGIN,
  A4_it_acts: C.worldsWithHabitDecision * 2 >= C.worlds,
};
const harmful = B.harm.n > 0 && B.harm.lo > 0;
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const admitted = Object.values(stageA).every(Boolean), failedB = Object.entries(stageB).filter(([, v]) => !v).map(([k]) => k);
const verdict = !infraOk ? 'CF-04 INVALID' : !admitted ? `CF-04 TASK NOT ADMITTED (${Object.entries(stageA).filter(([, v]) => !v).map(([k]) => k).join(', ')})`
  : !failedB.length ? 'CF-04 ARBITRATION SUPPORTED' : `CF-04 ARBITRATION NOT SUPPORTED (${failedB.join(', ')})${harmful ? ' — HARMFUL' : ''}`;
const result = {
  evidence: 'CF-04 hidden change and reliability arbitration (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate4' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E4_PARAMS, ARB: ARB_DEFAULTS, ARB_T10: { theta: 0.1 }, margin: MARGIN, bootstrapResamples: 10000, reliability: 'U[0.5, 1] per edge', world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria: { stageA, stageB, harmful }, verdict, analysis, rowsSha256: hashA, rows: rowsA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria: result.criteria }, null, 1));
process.exit(infraOk ? 0 : 1);

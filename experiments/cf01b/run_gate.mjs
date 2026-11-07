// ==========================================================
// CF-01b — E2′ task-admission gate driver (parameters frozen in experiments/cf01b/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf01b/run_gate.mjs --domain dev  --out <file outside the repository> [--worlds N]
//   node experiments/cf01b/run_gate.mjs --domain gate2
// G1 determinism: the whole matrix twice in-process, identical row hashes.
// G2/G3: the CF-01 test suite (cognitive/tests/run_all.mjs) and the E2′ tests (test_e2p.mjs) all pass.
// G4 admission: D = metric(QL.PRE) - metric(DYNAQ.PRE) over worlds; mean > 0 and 95% bootstrap lower bound > 0.
// G5 reference sanity: mean ORACLE metric <= mean metric of every learner, in every arm.
// Verdict: CF-01b PASS (G1, G2/G3, G5 pass and E2′ admitted) / CF-01b NOT ADMITTED (infrastructure passes, E2′ not
// admitted) / CF-01b FAIL (an infrastructure gate fails).
// The gate2 domain refuses unless every CF-01b file is committed and clean and the gate has not run before.
// Evidence category: development task-admission gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, mfwWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE2P, E2P_PARAMS, E2P_ARMS } from '../../cognitive/testbed/task_e2p.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { QL_DEFAULTS } from '../../cognitive/agents/ql.mjs';
import { DYNAQ_DEFAULTS } from '../../cognitive/agents/dynaq.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE2_WORLDS = 20;   // fixed before the gate2 run by the pre-declared rule in GATE_SPEC.md

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf01b run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate2'].includes(DOMAIN)) die('--domain must be dev or gate2');
const N = DOMAIN === 'gate2' ? GATE2_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate2' ? path.join(HERE, 'results', 'gate2_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf01b');
  if (dirty) die(`CF-01b files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate2 domain has already been run');
}

const KINDS = ['RANDOM', 'QL', 'DYNAQ', 'ORACLE'];
const LEARNERS = ['RANDOM', 'QL', 'DYNAQ'];
const matrix = (domain, n) => {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const arm of E2P_ARMS) for (const kind of KINDS) rows.push(runE2P({ world, worldLabel, kind, arm }));
  }
  return rows;
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function analyse(rows, domain) {
  const get = (arm, kind) => new Map(rows.filter((r) => r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  const paired = (aArm, aKind, bArm, bKind, label) => {
    const A = get(aArm, aKind), B = get(bArm, bKind);
    const diffs = [...A.keys()].filter((w) => B.has(w)).sort().map((w) => A.get(w).metric - B.get(w).metric);
    return { contrast: `${aKind}.${aArm} - ${bKind}.${bArm}`, sd: diffs.length > 1 ? Math.sqrt(diffs.reduce((s, x) => s + (x - mean(diffs)) ** 2, 0) / (diffs.length - 1)) : null, ...pairedBootstrap(diffs, label) };
  };
  const out = { primary: paired('PRE', 'QL', 'PRE', 'DYNAQ', `cf|stats|${domain}|E2P`), reported: {}, means: {}, censoring: {}, secondary: {}, excludedWorlds: [...new Set(rows.filter((r) => r.excluded).map((r) => r.world))] };
  out.reported.DYNAQ_preExposureBenefit = paired('NOPRE', 'DYNAQ', 'PRE', 'DYNAQ', `cf|stats|${domain}|E2P|dyna-pre`);
  out.reported.QL_preExposureNull = paired('NOPRE', 'QL', 'PRE', 'QL', `cf|stats|${domain}|E2P|ql-pre`);
  for (const k of ['QL', 'DYNAQ']) out.reported[`${k}_shamDisruption`] = paired('SHAM', k, 'NOBLOCK', k, `cf|stats|${domain}|E2P|${k}-sham`);
  out.reported.NOPRE_QL_minus_DYNAQ = paired('NOPRE', 'QL', 'NOPRE', 'DYNAQ', `cf|stats|${domain}|E2P|nopre`);
  for (const arm of E2P_ARMS) for (const k of KINDS) {
    const xs = [...get(arm, k).values()];
    out.means[`${arm}.${k}`] = mean(xs.map((r) => r.metric));
    out.censoring[`${arm}.${k}`] = xs.reduce((s, r) => s + r.censored, 0) / Math.max(1, xs.reduce((s, r) => s + r.testSteps.length, 0));
    for (const key of ['coverage', 'blockedAttempts']) if (xs.length && xs[0].secondary[key] !== undefined) out.secondary[`${arm}.${k}.${key}`] = mean(xs.map((r) => r.secondary[key]));
  }
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(['test_e2p.mjs']);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const rowsA = matrix(DOMAIN, N), rowsB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(rowsA)), hashB = sha(JSON.stringify(rowsB));
const analysis = analyse(rowsA, DOMAIN);
const p = analysis.primary;
const admitted = p.n > 0 && p.mean > 0 && p.lo > 0;
const g5 = [];
for (const arm of E2P_ARMS) for (const k of LEARNERS) { const o = analysis.means[`${arm}.ORACLE`], m = analysis.means[`${arm}.${k}`]; if (!(o <= m)) g5.push(`${arm}: ORACLE ${o} > ${k} ${m}`); }
const gates = {
  G1_determinism: { pass: hashA === hashB, hashA, hashB },
  G2G3_tests: { pass: tests.failed.length === 0 && tests.total > 0, ...tests },
  G4_admission: { admitted },
  G5_reference: { pass: g5.length === 0, violations: g5 },
};
const infra = gates.G1_determinism.pass && gates.G2G3_tests.pass && gates.G5_reference.pass;
const verdict = !infra ? 'CF-01b FAIL' : admitted ? 'CF-01b PASS (E2′ admitted)' : 'CF-01b NOT ADMITTED';
const mfw = mfwWorld(path.join(ROOT, 'connections.json'));
const reference = E2P_ARMS.flatMap((arm) => KINDS.map((kind) => { const r = runE2P({ world: mfw, worldLabel: 'cf|ref|mfw-graph', kind, arm }); return { arm, kind, metric: r.metric ?? null, excluded: !!r.excluded }; }));
const result = {
  evidence: 'CF-01b E2′ task-admission gate (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate2' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E2P_PARAMS, arms: E2P_ARMS, QL: QL_DEFAULTS, DYNAQ: DYNAQ_DEFAULTS, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  gates, verdict, analysis, referenceWorld: { world: 'mfw-graph (reported only)', rows: reference }, rowsSha256: hashA, rows: rowsA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, gates: { G1: gates.G1_determinism.pass, tests: `${tests.passed}/${tests.total}`, G4: admitted, G5: gates.G5_reference.pass }, primary: analysis.primary, reported: analysis.reported }, null, 1));
process.exit(infra ? 0 : 1);

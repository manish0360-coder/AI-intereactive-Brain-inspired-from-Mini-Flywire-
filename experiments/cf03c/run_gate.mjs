// ==========================================================
// CF-03c — calibration robustness gate for world model v3 (frozen in experiments/cf03c/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf03c/run_gate.mjs --domain dev    --out <file outside the repository> [--worlds N]
//   node experiments/cf03c/run_gate.mjs --domain gate3c
// The dev domain runs ONLY the development family (U5) and the existing battery; the four unseen families are run
// on the gate3c domain only, once.  Criteria (GATE_SPEC.md):
//   K1  skill over the constant forecaster, per unseen family: Brier(CONST) - Brier(V3)
//         all four families:           lower 95% bound > -NONINF  (not worse)
//         WIDE, BIMODAL, ARCSINE:      lower 95% bound > 0        (strictly better; these families are heterogeneous)
//   K2  calibration, per unseen family: weighted per-run ECE of V3 on the move event over all attempts,
//         upper 95% bound (bootstrap over worlds) <= ECE_LIMIT
//   K3  skill over the per-pair Laplace forecaster, per unseen family: Brier(LAPLACE) - Brier(V3), lower bound > 0
//   K4  the repairs cost nothing on the development family (fresh worlds): Brier(V2) - Brier(V3) lower bound > -NONINF,
//         and metric(MBVI3) - metric(MBVI2) upper bound < MARGIN steps on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   K5  validity: V3 makes no prediction outside [0, 1] in any family
//   K6  infrastructure: determinism (two in-process runs) and all tests pass
// Verdict: PASS (all) / PARTIAL (K4-K6 hold; K1-K3 hold in some families only, listed) / FAIL (K4 or K5 fails) /
//          INVALID (K6 fails).
// Evidence category: development evaluation gate (not confirmatory).
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { makeAgentForV3 } from '../../cognitive/testbed/registry_v3.mjs';
import { runE1F, FORECASTERS, DEV_FAMILY, UNSEEN_FAMILIES } from '../../cognitive/testbed/tasks_v3.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { makeStream } from '../../cognitive/testbed/rng.mjs';
import { MBVI3_DEFAULTS } from '../../cognitive/mind/v3/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE3C_WORLDS = 20;     // fixed before the gate3c run by the pre-declared rule in GATE_SPEC.md
export const ECE_LIMIT = 0.05;
export const NONINF = 0.002;         // Brier non-inferiority margin
export const MARGIN = 10;            // steps
export const STRICT_FAMILIES = Object.freeze(['WIDE', 'BIMODAL', 'ARCSINE']);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf03c run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'gate3c'].includes(DOMAIN)) die('--domain must be dev or gate3c');
const N = DOMAIN === 'gate3c' ? GATE3C_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = DOMAIN === 'gate3c' ? path.join(HERE, 'results', 'gate3c_result.json') : path.resolve(arg('--out') ?? '');
if (DOMAIN === 'dev') {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf03c');
  if (dirty) die(`CF-03c files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate3c domain has already been run');
}

const FAMILY_LIST = DOMAIN === 'gate3c' ? [DEV_FAMILY, ...UNSEEN_FAMILIES] : [DEV_FAMILY];
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const BATTERY_KINDS = ['DYNAQ', 'MBVI2', 'MBVI3', 'MBVI3_NOCHANGE'];
const NAMES = Object.keys(FORECASTERS);
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs'];

function matrix(domain, n) {
  const battery = [], families = [];
  for (let i = 0; i < n; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const [task, arm] of BATTERY) for (const kind of BATTERY_KINDS) {
      battery.push(task === 'E2P' ? runE2P({ world, worldLabel, kind, arm, makeAgent: makeAgentForV3 }) : runTaskV1({ task, world, worldLabel, kind, arm, makeAgent: makeAgentForV3 }));
    }
    for (const family of FAMILY_LIST) families.push(runE1F({ world, worldLabel, family }));
  }
  return { battery, families };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const eceOf = (acc) => (acc.n ? acc.bins.reduce((s, b) => s + Math.abs(b.hit - b.pred), 0) / acc.n : null);
const addBins = (accs) => { const out = Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })); for (const a of accs) a.bins.forEach((b, i) => { out[i].n += b.n; out[i].pred += b.pred; out[i].hit += b.hit; }); return out; };
/** Weighted per-run ECE with a percentile bootstrap over worlds (the unit of resampling is the world). */
function eceWithInterval(accs, label, B = 10000) {
  const runs = accs.filter((a) => a.n > 0).map((a) => ({ err: eceOf(a) * a.n, n: a.n }));
  if (!runs.length) return { n: 0, value: null, lo: null, hi: null };
  const stat = (rs) => rs.reduce((s, r) => s + r.err, 0) / rs.reduce((s, r) => s + r.n, 0);
  const rnd = makeStream(label), sims = new Float64Array(B);
  for (let b = 0; b < B; b++) { let e = 0, w = 0; for (let i = 0; i < runs.length; i++) { const r = runs[Math.floor(rnd() * runs.length)]; e += r.err; w += r.n; } sims[b] = e / w; }
  sims.sort();
  return { n: runs.length, value: stat(runs), lo: sims[Math.floor(0.025 * B)], hi: sims[Math.ceil(0.975 * B) - 1] };
}
/** Noise floor: the weighted per-run ECE of a forecaster whose bin probabilities were exactly right. */
function noiseFloor(accs, label, sims = 2000) {
  const rnd = makeStream(label), out = [];
  for (let k = 0; k < sims; k++) {
    let e = 0, w = 0;
    for (const a of accs) { if (!a.n) continue; for (const b of a.bins) { if (!b.n) continue; const p = b.pred / b.n; let h = 0; for (let j = 0; j < b.n; j++) if (rnd() < p) h++; e += Math.abs(h - b.pred); } w += a.n; }
    out.push(e / w);
  }
  out.sort((x, y) => x - y);
  return { mean: mean(out), p95: out[Math.floor(0.95 * sims)] };
}
/** Murphy decomposition from pooled bins: Brier ~ reliability - resolution + uncertainty. */
function decomposition(accs) {
  const bins = addBins(accs), n = bins.reduce((s, b) => s + b.n, 0);
  if (!n) return null;
  const base = bins.reduce((s, b) => s + b.hit, 0) / n;
  let rel = 0, res = 0;
  for (const b of bins) { if (!b.n) continue; const p = b.pred / b.n, o = b.hit / b.n; rel += b.n * (p - o) ** 2; res += b.n * (o - base) ** 2; }
  return { reliability: rel / n, resolution: res / n, uncertainty: base * (1 - base), baseRate: base, pooledEce: bins.reduce((s, b) => s + Math.abs(b.hit - b.pred), 0) / n, bins: bins.map((b) => ({ n: b.n, meanPredicted: b.n ? b.pred / b.n : null, hitRate: b.n ? b.hit / b.n : null })) };
}

function analyse({ battery, families }, domain) {
  const S = (x) => `cf|stats|${domain}|cf03c|${x}`;
  const out = { families: {}, battery: {}, excludedWorlds: [...new Set([...battery, ...families].filter((r) => r.excluded).map((r) => `${r.task}:${r.family ?? ''}:${r.world}`))] };
  for (const family of FAMILY_LIST) {
    const rows = families.filter((r) => r.family === family && !r.excluded).sort((a, b) => (a.world < b.world ? -1 : 1));
    const brier = (name, scope = 'all') => rows.map((r) => r.forecasts[name][scope].brier / r.forecasts[name][scope].n);
    const logLoss = (name) => rows.map((r) => r.forecasts[name].all.logLoss / r.forecasts[name].all.n);
    const diff = (a, b, f = brier) => { const A = f(a), Bv = f(b), d = A.map((x, i) => x - Bv[i]); return { contrast: `Brier(${a}) - Brier(${b})`, sd: sd(d), ...pairedBootstrap(d, S(`${family}|${a}|${b}`)) }; };
    const F = { worlds: rows.length, steps: mean(rows.map((r) => r.metric)), censored: rows.reduce((s, r) => s + r.censored, 0), forecasters: {}, contrasts: {}, hyper: { mu: mean(rows.map((r) => r.secondary.model.mu)), nu: mean(rows.map((r) => r.secondary.model.nu)), strengths: rows.map((r) => r.secondary.model.S), changesDown: mean(rows.map((r) => r.secondary.model.changesDown)), changesUp: mean(rows.map((r) => r.secondary.model.changesUp)) } };
    for (const name of NAMES) {
      const accs = (scope) => rows.map((r) => r.forecasts[name][scope]);
      F.forecasters[name] = {
        brier: mean(brier(name)), logLoss: mean(logLoss(name)), invalid: rows.reduce((s, r) => s + r.forecasts[name].invalid, 0),
        ece: eceWithInterval(accs('all'), S(`${family}|ece|${name}`)), noiseFloor: noiseFloor(accs('all'), S(`${family}|floor|${name}`)),
        eceUntried: eceWithInterval(accs('untried'), S(`${family}|eceU|${name}`)).value, eceTried: eceWithInterval(accs('tried'), S(`${family}|eceT|${name}`)).value,
        eceExplore: eceWithInterval(accs('explore'), S(`${family}|eceX|${name}`)).value, eceTest: eceWithInterval(accs('test'), S(`${family}|eceE|${name}`)).value,
        eceModal: eceWithInterval(accs('modal'), S(`${family}|eceM|${name}`)).value,
        decomposition: decomposition(accs('all')),
      };
    }
    for (const other of NAMES.filter((x) => x !== 'V3')) F.contrasts[`${other}_minus_V3`] = diff(other, 'V3');
    F.contrasts.logLoss_CONST_minus_V3 = diff('CONST', 'V3', logLoss);
    out.families[family] = F;
  }
  const cell = (task, arm, kind) => new Map(battery.filter((r) => r.task === task && r.arm === arm && r.kind === kind && !r.excluded).map((r) => [r.world, r]));
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`;
    const pair = (kA, kB) => { const A = cell(task, arm, kA), Bm = cell(task, arm, kB); const d = [...A.keys()].filter((w) => Bm.has(w)).sort().map((w) => A.get(w).metric - Bm.get(w).metric); return { contrast: `${kA} - ${kB} (${key})`, sd: sd(d), ...pairedBootstrap(d, S(`${key}|${kA}|${kB}`)) }; };
    out.battery[key] = { means: Object.fromEntries(BATTERY_KINDS.map((k) => [k, mean([...cell(task, arm, k).values()].map((r) => r.metric))])), MBVI3_minus_MBVI2: pair('MBVI3', 'MBVI2'), DYNAQ_minus_MBVI3: pair('DYNAQ', 'MBVI3'), NOCHANGE_minus_MBVI3: pair('MBVI3_NOCHANGE', 'MBVI3') };
  }
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const runA = matrix(DOMAIN, N), runB = matrix(DOMAIN, N);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);

const perFamily = {};
for (const family of FAMILY_LIST.filter((f) => f !== DEV_FAMILY)) {
  const F = analysis.families[family], c = F.contrasts.CONST_minus_V3, l = F.contrasts.LAPLACE_minus_V3;
  perFamily[family] = {
    K1_not_worse_than_constant: c.n > 0 && c.lo > -NONINF,
    K1_better_than_constant: STRICT_FAMILIES.includes(family) ? c.n > 0 && c.lo > 0 : null,
    K2_calibrated: F.forecasters.V3.ece.hi !== null && F.forecasters.V3.ece.hi <= ECE_LIMIT,
    K3_better_than_laplace: l.n > 0 && l.lo > 0,
  };
  perFamily[family].holds = Object.values(perFamily[family]).every((v) => v === null || v === true);
}
const dev = analysis.families[DEV_FAMILY];
const K4 = {
  brier_not_worse_than_v2: dev.contrasts.V2_minus_V3.n > 0 && dev.contrasts.V2_minus_V3.lo > -NONINF,
  steps_no_regression: Object.values(analysis.battery).every((b) => b.MBVI3_minus_MBVI2.n > 0 && b.MBVI3_minus_MBVI2.hi < MARGIN),
};
const K5 = Object.values(analysis.families).every((F) => F.forecasters.V3.invalid === 0);
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean), k4ok = Object.values(K4).every(Boolean);
const passing = Object.entries(perFamily).filter(([, v]) => v.holds).map(([k]) => k), failing = Object.entries(perFamily).filter(([, v]) => !v.holds).map(([k]) => k);
let verdict;
if (!infraOk) verdict = 'CF-03c INVALID';
else if (!k4ok || !K5) verdict = `CF-03c FAIL (${[!k4ok && 'K4', !K5 && 'K5'].filter(Boolean).join(', ')})`;
else if (DOMAIN !== 'gate3c') verdict = 'CF-03c dev run (unseen families not run): K4-K6 hold';
else if (!failing.length) verdict = 'CF-03c PASS';
else verdict = `CF-03c PARTIAL (holds in: ${passing.join(', ') || 'none'}; fails in: ${failing.join(', ')})`;

const result = {
  evidence: 'CF-03c calibration robustness gate (development, not confirmatory)', domain: DOMAIN, worlds: N, families: FAMILY_LIST,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: git('rev-parse', 'HEAD'), filesClean: DOMAIN === 'gate3c' },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { MBVI3: MBVI3_DEFAULTS, eceLimit: ECE_LIMIT, nonInferiority: NONINF, margin: MARGIN, strictFamilies: STRICT_FAMILIES, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria: { perFamily, K4, K5_no_invalid_predictions: K5 }, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, infra, tests: `${tests.passed}/${tests.total}`, criteria: result.criteria }, null, 1));
process.exit(infraOk ? 0 : 1);

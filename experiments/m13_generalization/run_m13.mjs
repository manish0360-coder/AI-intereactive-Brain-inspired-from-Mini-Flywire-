// ==========================================================
// M13 driver — cognitive generalization: the AD-13 belief against MBVI3 on the held-out modular-ring family
// ==========================================================
//   node experiments/m13_generalization/run_m13.mjs --domain m13
//       The one run. It refuses unless:
//         - SPEC.md is marked Frozen and every line of SPEC.sha256 matches (SPEC.md, PINS.json, the bank, the record);
//         - every file the run executes matches PINS.json (pins.mjs);
//         - cognitive/, scripts/, experiments/m13_generalization/ and the recorder are committed and clean;
//         - the graph bank is exactly what the generator gives, its labels are fresh, and the novelty check holds;
//         - the whole test suite passes (node scripts/test.mjs);
//         - no result file exists.
//   node experiments/m13_generalization/run_m13.mjs --domain smoke --labels 1 --out <file outside the repository>
//       A smoke run on development-family worlds (labels m13smoke|dev|*). It never touches the modular family. It
//       prints no measure and no verdict; it exists to show that the driver runs end to end, and how long a run takes.
//
// Run A runs all four arms and records traces for the core arms on TRACE_LABELS. Run B repeats the core arms without
// the recorder. The core rows of the two runs must be identical (G0). The result is written only after both runs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import {
  ROOT, N_LABELS, LABEL_OF, FAMILIES, TRACE_LABELS, MARGIN, ARMS, CORE, E5_FAMILIES, E5_PARAMS,
  assertFreshLabels, worldsOf, runOne, readableTrace, analyse, readingRule,
} from './m13_lib.mjs';
import { ADOPTED_AGENT } from '../../cognitive/testbed/adopted_agent.mjs';
import { checkBank, MODULAR } from './worlds_modular.mjs';
import { detourExcess } from './structure.mjs';
import { pinDifferences } from './pins.mjs';

const HERE = path.join(ROOT, 'experiments', 'm13_generalization');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`m13 run_m13 refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['smoke', 'm13'].includes(DOMAIN)) die('--domain must be smoke or m13');
const isRun = DOMAIN === 'm13';
const SPEC = path.join(HERE, 'SPEC.md');
const OUT = isRun ? path.join(HERE, 'results', 'm13_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
let bank = null, structure = null, tests = null;

if (!isRun) {
  const relOut = path.relative(ROOT, OUT);
  if (!arg('--out') || (!relOut.startsWith('..') && !path.isAbsolute(relOut))) die('smoke runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('SPEC.md is not marked Frozen (it is still a draft)');
  const SHAFILE = path.join(HERE, 'SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('SPEC.sha256 (the frozen hashes) is missing');
  const lines = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
  const need = ['SPEC.md', 'PINS.json', 'graph_bank.json', 'structure.json'];
  for (const f of need) if (!lines.some(([, name]) => name === f)) die(`SPEC.sha256 has no line for ${f}`);
  for (const [h, name] of lines) if (sha(fs.readFileSync(path.join(HERE, name))) !== h) die(`${name} does not match its frozen SHA-256 ${h}`);
  const pins = pinDifferences();
  if (pins.length) die(`files differ from PINS.json:\n${pins.join('\n')}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'scripts', 'experiments/m13_generalization', 'experiments/m11_routes/trace.mjs');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the M13 labels have already been run');
  bank = JSON.parse(fs.readFileSync(path.join(HERE, 'graph_bank.json'), 'utf8'));
  try { checkBank(bank); assertFreshLabels(bank.graphs.map((g) => g.label)); } catch (e) { die(e.message); }
  if (bank.count !== N_LABELS) die(`the bank has ${bank.count} graphs, the specification ${N_LABELS}`);
  structure = JSON.parse(fs.readFileSync(path.join(HERE, 'structure.json'), 'utf8'));
  const check = spawnSync(process.execPath, [path.join(HERE, 'make_bank.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  if (check.status !== 0) die('structure.json or graph_bank.json is not exactly what the generator and the descriptors give');
  if (!structure.novelty.holds) die('the novelty check does not hold: the bank is not structurally outside the development family');
  const t = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'test.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const total = (t.stdout.match(/TOTAL (\d+)\/(\d+)/) ?? []).slice(1).map(Number);
  tests = { exit: t.status, passed: total[0] ?? null, total: total[1] ?? null };
  if (t.status !== 0) die(`the test suite does not pass (${t.stdout.trim().split('\n').pop()})`);
}

const N = isRun ? N_LABELS : Number(arg('--labels', '1'));
if (!(Number.isInteger(N) && N > 0)) die('--labels must be a positive integer');
const worlds = worldsOf(DOMAIN, bank, N);
const excess = new Map(worlds.flatMap(([label, w]) => FAMILIES.map((f) => [`${label}|${f}`, detourExcess(w, label, f)])));
const appFiles = Object.fromEntries(['main.js', 'index.html', 'connections.json', 'neurons.json'].map((f) => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));

const t0 = performance.now();
function runAll(arms, withTraces, timing, tag) {
  const rows = [], traces = [];
  worlds.forEach(([worldLabel, world], i) => {
    for (const family of FAMILIES) for (const arm of arms) {
      const traceThis = withTraces && CORE.includes(arm) && TRACE_LABELS.includes(i);
      const s = performance.now();
      const { row, record } = runOne(world, worldLabel, family, arm, traceThis);
      timing[arm] = (timing[arm] ?? 0) + performance.now() - s;
      rows.push(row);
      if (record) traces.push(readableTrace(world, record, row, worldLabel, family));
    }
    console.log(`${tag}: label ${i + 1} of ${worlds.length} done, ${Math.round((performance.now() - t0) / 1000)} s`);
  });
  return { rows, traces };
}
const timingA = {}, timingB = {};
const A = runAll(Object.keys(ARMS), true, timingA, 'run A');
const B = runAll(CORE, false, timingB, 'run B');
const coreA = A.rows.filter((r) => CORE.includes(r.arm));
const rowsShaA = sha(JSON.stringify(coreA)), rowsShaB = sha(JSON.stringify(B.rows));
const analysis = analyse(A.rows, DOMAIN, excess);
const excludedPairs = A.rows.filter((r) => r.arm === 'BELIEF' && r.excluded).length;
const validity = { identical: rowsShaA === rowsShaB, testsPassed: isRun ? tests.exit === 0 : null, novelty: isRun ? structure.novelty.holds : null, exclusionsOk: excludedPairs <= 0.1 * N * FAMILIES.length };
const reading = readingRule(analysis, validity);
const headAtEnd = git('rev-parse', 'HEAD');

const result = {
  evidence: 'M13 cognitive generalization on a held-out modular-ring family: one run, by the designer, on local commits; development-level, not confirmatory',
  domain: DOMAIN, labels: N, labelPattern: LABEL_OF[DOMAIN]('<i>'),
  worlds: isRun ? { family: bank.family, generator: MODULAR, bankSha256: sha(fs.readFileSync(path.join(HERE, 'graph_bank.json'))) } : { family: 'development generator (smoke)', generator: 'generateWorld defaults' },
  structure: isRun ? structure : null,
  specSha256: isRun ? sha(fs.readFileSync(SPEC)) : null,
  pinsSha256: isRun ? sha(fs.readFileSync(path.join(HERE, 'PINS.json'))) : null,
  headAtLaunch, headAtEnd,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  appFiles, tests,
  parameters: {
    arms: Object.fromEntries(Object.entries(ARMS).map(([k, a]) => [k, { kind: a.kind, role: a.role, params: k === 'MBVI3' ? {} : { ...ADOPTED_AGENT.params } }])),
    adoptedAgent: { kind: ADOPTED_AGENT.kind, params: { ...ADOPTED_AGENT.params }, decision: ADOPTED_AGENT.decision },
    task: E5_PARAMS, families: E5_FAMILIES, traceLabels: TRACE_LABELS, margin: MARGIN,
  },
  determinism: { rowsSha256RunA: rowsShaA, rowsSha256RunB: rowsShaB, identical: rowsShaA === rowsShaB, note: 'core arms: run A (traced on the trace labels) against run B (untraced)' },
  resources: { note: 'not part of the hashed rows', wallClockMsRunA: timingA, wallClockMsRunB: timingB, totalSeconds: Math.round((performance.now() - t0) / 1000), peakRssKb: Math.round(process.resourceUsage().maxRSS) },
  validity, analysis, reading,
  traces: A.traces,
  rows: A.rows,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
if (isRun) console.log(`M13 m13: ${reading.verdict}; core runs identical: ${validity.identical}; ${result.resources.totalSeconds} s; ${OUT}`);
else console.log(`M13 smoke: ${N} development-family labels, ${A.rows.length} + ${B.rows.length} rows; core runs identical: ${validity.identical}; seconds per run: ${Object.entries(timingA).map(([k, v]) => `${k} ${(v / 1000 / (N * FAMILIES.length)).toFixed(2)}`).join(', ')}; ${result.resources.totalSeconds} s; ${OUT} (no measure printed)`);

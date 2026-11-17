// ==========================================================
// M11 driver — controlled route changes on the MiniFlyWire graph: the AD-13 belief against MBVI3
// ==========================================================
//   node experiments/m11/run_demo.mjs --domain m11
//       The one demonstration run. It refuses unless SPEC.md is marked Frozen and matches SPEC.sha256, the files under
//       cognitive/ and experiments/m11 are committed and clean, and no result file exists.
//   node experiments/m11/run_demo.mjs --domain dev --labels 2 --out <file outside the repository>
//       A smoke run on labels mfw|m11dev|*, which the demonstration never uses.
//
// Run A records traces for TRACE_LABELS; run B repeats everything without the recorder. The two row sets must be
// identical: that is the determinism check and the recorder's passivity check in one. The result is written only
// after both runs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import {
  ROOT, GRAPH_LABEL, N_LABELS, LABEL_OF, FAMILIES, TRACE_LABELS, MARGIN, ARMS, E5_FAMILIES, E5_PARAMS,
  appGraph, nodeTable, runOne, readableTrace, analyse, readingRule,
} from './m11_lib.mjs';
import { ADOPTED_AGENT } from '../../cognitive/testbed/adopted_agent.mjs';

const HERE = path.join(ROOT, 'experiments', 'm11');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`m11 run_demo refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['dev', 'm11'].includes(DOMAIN)) die('--domain must be dev or m11');
const isDemo = DOMAIN === 'm11';
const N = isDemo ? N_LABELS : Number(arg('--labels', '2'));
if (!(Number.isInteger(N) && N > 0)) die('--labels must be a positive integer');
const SPEC = path.join(HERE, 'SPEC.md');
const OUT = isDemo ? path.join(HERE, 'results', 'm11_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
if (!isDemo) {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('SPEC.md is not marked Frozen (it is still a draft)');
  const SHAFILE = path.join(HERE, 'SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('SPEC.sha256 (the frozen hash of the specification) is missing');
  const frozen = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\s+/)[0];
  if (sha(fs.readFileSync(SPEC)) !== frozen) die(`SPEC.md does not match its frozen SHA-256 ${frozen}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/m11');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the m11 labels have already been run');
}

const world = appGraph();
const nodes = nodeTable();
const appFiles = Object.fromEntries(['main.js', 'index.html', 'connections.json', 'neurons.json'].map((f) => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));

function runAll(withTraces, timing) {
  const rows = [], traces = [];
  for (let i = 0; i < N; i++) {
    const worldLabel = LABEL_OF[DOMAIN](i);
    for (const family of FAMILIES) for (const arm of Object.keys(ARMS)) {
      const traceThis = withTraces && TRACE_LABELS.includes(i);
      const t0 = performance.now();
      const { row, record } = runOne(world, worldLabel, family, arm, traceThis);
      timing[arm] = (timing[arm] ?? 0) + performance.now() - t0;
      rows.push(row);
      if (record) traces.push(readableTrace(world, nodes, record, row, worldLabel, family));
    }
  }
  return { rows, traces };
}

const t0 = performance.now();
const timingA = {}, timingB = {};
const A = runAll(true, timingA);
const B = runAll(false, timingB);
const rowsShaA = sha(JSON.stringify(A.rows)), rowsShaB = sha(JSON.stringify(B.rows));
const analysis = analyse(A.rows, DOMAIN);
const reading = readingRule(analysis);
const headAtEnd = git('rev-parse', 'HEAD');

const result = {
  evidence: 'M11 demonstration on the MiniFlyWire graph: one run, by the designer, on local commits; development-level, not confirmatory',
  domain: DOMAIN, labels: N, labelPattern: LABEL_OF[DOMAIN]('<i>'),
  graph: { label: GRAPH_LABEL, nodes: world.n, edges: world.edges.length, nodeTable: nodes },
  specSha256: isDemo ? sha(fs.readFileSync(SPEC)) : null,
  headAtLaunch, headAtEnd,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  appFiles,
  parameters: {
    arms: { BELIEF: { kind: ADOPTED_AGENT.kind, params: { ...ADOPTED_AGENT.params }, decision: ADOPTED_AGENT.decision }, MBVI3: { kind: 'MBVI3', params: {} } },
    task: E5_PARAMS, families: E5_FAMILIES, traceLabels: TRACE_LABELS, margin: MARGIN,
  },
  determinism: { rowsSha256RunA: rowsShaA, rowsSha256RunB: rowsShaB, identical: rowsShaA === rowsShaB, note: 'run A traced, run B untraced' },
  resources: { note: 'not part of the hashed rows', wallClockMsRunA: timingA, wallClockMsRunB: timingB, totalSeconds: Math.round((performance.now() - t0) / 1000), peakRssKb: Math.round(process.resourceUsage().maxRSS) },
  analysis, reading,
  traces: A.traces,
  rows: A.rows,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
console.log(`M11 ${DOMAIN}: ${reading.reading}; runs identical: ${rowsShaA === rowsShaB}; ${result.resources.totalSeconds} s; ${OUT}`);

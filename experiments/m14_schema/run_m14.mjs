// ==========================================================
// M14 driver — schema abstraction and transfer: does a relation learned over kinds in six worlds improve the first
// decisions in an unseen world that needs a combination never shown whole?
// ==========================================================
//   node experiments/m14_schema/run_m14.mjs --domain m14
//       The one run. It refuses unless:
//         - SPEC.md is marked Frozen and every line of SPEC.sha256 matches (SPEC.md, PINS.json, the admission record);
//         - every file the run executes matches PINS.json (pins.mjs);
//         - cognitive/, scripts/ and experiments/m14_schema/ are committed and clean;
//         - every gate label is fresh and plannable (the census admits all N_LABELS);
//         - the whole test suite passes (node scripts/test_all.mjs);
//         - no result file exists.
//   node experiments/m14_schema/run_m14.mjs --domain smoke --labels N --out <file outside the repository>
//       Labels m14schema|smoke|*. Prints no measure and no verdict: it shows the driver runs end to end, and its time.
//
// Run A runs all four arms on every label. Run B runs them again. The rows of the two runs must be identical (validity).
// The result is written only after both runs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { ROOT, E6, ARMS, CONDITIONS, LABEL_OF, N_LABELS, MARGIN, ORACLE_TABLE, assertFreshLabels, planTrial, runArm, analyse, readingRule } from './m14_lib.mjs';
import { ADOPTED_AGENT } from '../../cognitive/testbed/adopted_agent.mjs';
import { KINDS, SIGMA } from '../../cognitive/testbed/task_e6.mjs';
import { pinDifferences } from './pins.mjs';

const HERE = path.join(ROOT, 'experiments', 'm14_schema');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`m14 run_m14 refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['smoke', 'm14'].includes(DOMAIN)) die('--domain must be smoke or m14');
const isRun = DOMAIN === 'm14';
const SPEC = path.join(HERE, 'SPEC.md');
const OUT = isRun ? path.join(HERE, 'results', 'm14_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
let tests = null;

const N = isRun ? N_LABELS : Number(arg('--labels', '1'));
if (!(Number.isInteger(N) && N > 0)) die('--labels must be a positive integer');
const labels = Array.from({ length: N }, (_, i) => LABEL_OF[DOMAIN](i));

if (!isRun) {
  const relOut = path.relative(ROOT, OUT);
  if (!arg('--out') || (!relOut.startsWith('..') && !path.isAbsolute(relOut))) die('smoke runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('SPEC.md is not marked Frozen (it is still a draft)');
  const SHAFILE = path.join(HERE, 'SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('SPEC.sha256 (the frozen hashes) is missing');
  const lines = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/));
  for (const f of ['SPEC.md', 'PINS.json', 'admission/admission.json']) if (!lines.some(([, name]) => name === f)) die(`SPEC.sha256 has no line for ${f}`);
  for (const [h, name] of lines) if (sha(fs.readFileSync(path.join(HERE, name))) !== h) die(`${name} does not match its frozen SHA-256 ${h}`);
  const pins = pinDifferences();
  if (pins.length) die(`files differ from PINS.json:\n${pins.join('\n')}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'scripts', 'experiments/m14_schema');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the M14 labels have already been run');
  try { assertFreshLabels(labels); } catch (e) { die(e.message); }
  const t = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'test_all.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const total = (t.stdout.match(/TOTAL (\d+)\/(\d+)/) ?? []).slice(1).map(Number);
  tests = { exit: t.status, passed: total[0] ?? null, total: total[1] ?? null };
  if (t.status !== 0) die(`the test suite does not pass (${t.stdout.trim().split('\n').pop()})`);
}

const t0 = performance.now();
const plans = labels.map((l) => planTrial(l));
const excluded = plans.filter((p) => p.excluded);
if (isRun && excluded.length) die(`labels cannot be planned (the census admitted all): ${excluded.map((p) => p.trial).join(', ')}`);
const usable = plans.filter((p) => !p.excluded);

function runAll(tagName) {
  const rows = [], ms = Object.fromEntries(ARMS.map((a) => [a, 0]));
  usable.forEach((P, i) => {
    for (const arm of ARMS) { const s = performance.now(); rows.push(runArm(P, arm)); ms[arm] += performance.now() - s; }
    if ((i + 1) % 15 === 0 || i + 1 === usable.length) console.log(`run ${tagName}: label ${i + 1} of ${usable.length} done, ${Math.round((performance.now() - t0) / 1000)} s`);
  });
  return { rows, ms };
}

const A = runAll('A');
const B = runAll('B');
const hashA = sha(JSON.stringify(A.rows)), hashB = sha(JSON.stringify(B.rows));

if (!isRun) {
  fs.writeFileSync(OUT, JSON.stringify({ domain: DOMAIN, labels: usable.length, rows: A.rows.length, identical: hashA === hashB, seconds: Math.round((performance.now() - t0) / 1000), msPerArm: A.ms }, null, 1) + '\n');
  console.log(`M14 smoke: ${usable.length} labels, ${A.rows.length} rows, runs identical: ${hashA === hashB}; ${Math.round((performance.now() - t0) / 1000)} s; no measure is printed; ${OUT}`);
  process.exit(0);
}

const concretePassive = A.rows.filter((r) => r.arm === 'CONCRETE').every((r) => JSON.stringify(r.tests.NULL) === JSON.stringify(r.tests.COMPOSE) && JSON.stringify(r.tests.REVERSED) === JSON.stringify(r.tests.COMPOSE));
const oracleFollows = A.rows.filter((r) => r.arm === 'ORACLE_SCHEMA').every((r) => { const P = usable.find((p) => p.trial === r.trial); return JSON.stringify(r.tests.COMPOSE[0].path) === JSON.stringify(P.test.plan.route); });
const validity = { identical: hashA === hashB, testsPassed: !!tests && tests.exit === 0, noExclusions: excluded.length === 0, concretePassive, oracleFollows, excludedLabels: excluded.length };
const analysis = analyse(A.rows, DOMAIN);
const reading = readingRule(analysis, validity);
const appFile = (f) => sha(fs.readFileSync(path.join(ROOT, f)));
const result = {
  evidence: 'M14 schema abstraction and transfer in the cognitive testbed (task E6): one run, by the designer, on local commits; development-level, not confirmatory',
  domain: DOMAIN, labels: usable.length, labelPattern: 'm14schema|gate|<i>',
  specSha256: sha(fs.readFileSync(SPEC)), pinsSha256: sha(fs.readFileSync(path.join(HERE, 'PINS.json'))), admissionSha256: sha(fs.readFileSync(path.join(HERE, 'admission', 'admission.json'))),
  headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'),
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  appFiles: Object.fromEntries(['main.js', 'index.html', 'connections.json', 'neurons.json'].map((f) => [f, appFile(f)])),
  tests,
  parameters: { e6: E6, kinds: KINDS, sigma: SIGMA, arms: ARMS, conditions: CONDITIONS, adoptedAgent: ADOPTED_AGENT, oracleTable: ORACLE_TABLE, margin: MARGIN },
  determinism: { rowsSha256RunA: hashA, rowsSha256RunB: hashB, identical: hashA === hashB },
  resources: { note: 'not part of the hashed rows', msPerArmRunA: A.ms, msPerArmRunB: B.ms, totalSeconds: Math.round((performance.now() - t0) / 1000), peakRssKb: Math.round(process.resourceUsage().maxRSS) },
  validity, analysis, reading,
  rows: A.rows,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result) + '\n');
console.log(`M14 m14: ${reading.summary}; runs identical: ${hashA === hashB}; ${result.resources.totalSeconds} s; ${OUT}`);

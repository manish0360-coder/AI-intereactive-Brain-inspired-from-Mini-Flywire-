// ==========================================================
// M15 driver — Calibrated Adaptive Belief Tracking and Change Detection
// ==========================================================
//   node experiments/m15_uncertainty/run_m15.mjs --domain m15
//       The one run. It refuses unless:
//         - SPEC.md is marked Frozen and every line of SPEC.sha256 matches (SPEC.md, PINS.json, the admission record);
//         - every file the run executes matches PINS.json (pins.mjs);
//         - cognitive/, scripts/ and experiments/m15_uncertainty/ are committed and clean;
//         - the admission record admits the task (A1-A4) and fixes w*, the margin and n;
//         - every label is fresh (m15unc|gate|<i>, i = 0..n-1);
//         - the whole test suite passes (node scripts/test_discover.mjs);
//         - no result file exists.
//   node experiments/m15_uncertainty/run_m15.mjs --domain smoke --labels N --out <file outside the repository>
//       Labels m15unc|smoke|*, with the development window grid. Prints no measure and no verdict: it shows the driver
//       runs end to end, and its time.
//
// Run A runs every arm and mechanism on every label; run B runs them again. Every label's full record (closed loop,
// both streams, every belief point's scores) must hash identically in the two runs (validity: determinism). The
// result is written only after both runs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { ROOT, M15, SENSITIVITY, LABEL_OF, E7, CONDITIONS, KINDS, ADOPTED_AGENT, assertFreshLabels, runLabel, savedRow, mechanisms, closedArms } from './m15_lib.mjs';
import { criteria, sensitivityBT, reported, readingRule, conditionCalibration } from './m15_analysis.mjs';
import { SIGMA, SIGMA_INV } from '../../cognitive/testbed/task_e7.mjs';
import { pinDifferences } from './pins.mjs';

const HERE = path.join(ROOT, 'experiments', 'm15_uncertainty');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`m15 run_m15 refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();

const DOMAIN = arg('--domain');
if (!['smoke', 'm15'].includes(DOMAIN)) die('--domain must be smoke or m15');
const isRun = DOMAIN === 'm15';
const SPEC = path.join(HERE, 'SPEC.md');
const ADMISSION = path.join(HERE, 'admission', 'admission.json');
const OUT = isRun ? path.join(HERE, 'results', 'm15_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
let tests = null, admission = null;

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
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'scripts', 'experiments/m15_uncertainty');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the M15 labels have already been run');
  admission = JSON.parse(fs.readFileSync(ADMISSION, 'utf8'));
  if (admission.admitted !== true) die('the admission record does not admit the task');
  if (!M15.windowGrid.includes(admission.wStar) || !Number.isInteger(admission.margin) || !Number.isInteger(admission.n)) die('the admission record does not fix w*, the margin and n');
}

const N = isRun ? admission.n : Number(arg('--labels', '1'));
if (!(Number.isInteger(N) && N > 0)) die('--labels must be a positive integer');
const labels = Array.from({ length: N }, (_, i) => LABEL_OF[DOMAIN](i));
if (isRun) {
  try { assertFreshLabels(labels); } catch (e) { die(e.message); }
  const t = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'test_discover.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const total = (t.stdout.match(/TOTAL (\d+)\/(\d+)/) ?? []).slice(1).map(Number);
  tests = { exit: t.status, passed: total[0] ?? null, total: total[1] ?? null };
  if (t.status !== 0) die(`the test suite does not pass (${t.stdout.trim().split('\n').pop()})`);
}
const windows = isRun ? [admission.wStar] : [...M15.windowGrid];

const t0 = performance.now();
const flat = (k, v) => (v instanceof Float64Array ? Array.from(v) : v);
const digestOf = (L) => sha(JSON.stringify(L, flat));

function runAll(tagName, keep) {
  const records = [], digests = [];
  labels.forEach((l, i) => {
    const L = runLabel(l, { windows });
    digests.push(digestOf(L));
    if (keep) records.push(L);
    if ((i + 1) % 25 === 0 || i + 1 === labels.length) console.log(`run ${tagName}: label ${i + 1} of ${labels.length} done, ${Math.round((performance.now() - t0) / 1000)} s`);
  });
  return { records, digests };
}

const A = runAll('A', true);
const B = runAll('B', false);
const hashA = sha(JSON.stringify(A.digests)), hashB = sha(JSON.stringify(B.digests));
const excluded = A.records.filter((L) => L.excluded);

if (!isRun) {
  fs.writeFileSync(OUT, JSON.stringify({ domain: DOMAIN, labels: labels.length, excluded: excluded.length, identical: hashA === hashB, seconds: Math.round((performance.now() - t0) / 1000) }, null, 1) + '\n');
  console.log(`M15 smoke: ${labels.length} labels, excluded ${excluded.length}, runs identical: ${hashA === hashB}; ${Math.round((performance.now() - t0) / 1000)} s; no measure is printed; ${OUT}`);
  process.exit(0);
}

const Ls = A.records.filter((L) => !L.excluded);
const all = (k) => Ls.every((L) => L.checks[k] === true);
const validity = {
  determinism: hashA === hashB, suite: !!tests && tests.exit === 0,
  vRev: all('vrevPassive') && all('vrevClosed'), concretePassive: all('concretePassive'), noExclusion: excluded.length === 0,
  frozenUnchanged: all('frozenUnchanged'), probeIsolation: all('probeIsolation'), identity: all('identityWorld0') && all('absorbedMatches'),
  excludedLabels: excluded.map((L) => L.label),
  perCheckFailures: Object.fromEntries(['vrevPassive', 'vrevClosed', 'concretePassive', 'identityWorld0', 'frozenUnchanged', 'probeIsolation', 'absorbedMatches'].map((k) => [k, Ls.filter((L) => L.checks[k] !== true).map((L) => L.label)])),
};
const ctx = { domain: DOMAIN, wStar: admission.wStar, margin: admission.margin };
const C = criteria(Ls, ctx);
const S = sensitivityBT(Ls, ctx);
const R = reported(Ls, ctx);
const btCond = conditionCalibration(Ls, ctx, 'UA');   // BT-COND: added at the pre-freeze review; BT1 is unchanged
const reading = readingRule(C, S, validity, btCond);
const appFile = (f) => sha(fs.readFileSync(path.join(ROOT, f)));
const result = {
  evidence: 'M15 Calibrated Adaptive Belief Tracking and Change Detection in the cognitive testbed (task E7): one run, by the designer, on local commits; development-level, not confirmatory; the hazard h = 0.01 is development-selected',
  domain: DOMAIN, labels: Ls.length, labelPattern: 'm15unc|gate|<i>', labelOrder: 'numeric',
  specSha256: sha(fs.readFileSync(SPEC)), pinsSha256: sha(fs.readFileSync(path.join(HERE, 'PINS.json'))), admissionSha256: sha(fs.readFileSync(ADMISSION)),
  headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'),
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  appFiles: Object.fromEntries(['main.js', 'index.html', 'connections.json', 'neurons.json'].map((f) => [f, appFile(f)])),
  tests,
  parameters: { m15: M15, sensitivity: SENSITIVITY, e7: E7, conditions: CONDITIONS, kinds: KINDS, sigma: SIGMA, sigmaInv: SIGMA_INV, adoptedAgent: ADOPTED_AGENT, wStar: admission.wStar, margin: admission.margin, n: admission.n, mechanisms: mechanisms(windows), closedArms: closedArms(windows) },
  determinism: { digestsSha256RunA: hashA, digestsSha256RunB: hashB, identical: hashA === hashB },
  resources: { note: 'not part of the hashed records', totalSeconds: Math.round((performance.now() - t0) / 1000), peakRssKb: Math.round(process.resourceUsage().maxRSS) },
  validity, criteria: C, btCond, sensitivityBT: S, reported: R, reading,
  digests: A.digests,
  rows: A.records.map(savedRow),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result) + '\n');
console.log(`M15 m15: ${reading.statement}; runs identical: ${hashA === hashB}; ${result.resources.totalSeconds} s; ${OUT}`);

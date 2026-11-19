// Rehearsal of the independent check, before the run (2026-11-19, after the freeze commit 77edfe7).
//   node experiments/m15_uncertainty/results/check/rehearse_m15.mjs <repo root> <N> <out file outside the repository>
// Builds a result shaped exactly like the driver's (run_m15.mjs, lines after "const Ls = ..."), on smoke labels
// m15unc|smoke|0..N-1 (a namespace the run refuses, already exposed during the build), with the frozen configuration
// (w*, margin from admission/admission.json; the stats domain "smoke"). It runs the suite as the driver does, runs
// every label twice for the digests, and never calls the driver. verify_m15.mjs --rehearsal then checks it, and
// mutants_m15.mjs checks that the verifier catches deliberate corruptions of it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.argv[2]);
const N = Number(process.argv[3]);
const OUT = path.resolve(process.argv[4]);
const rel = path.relative(ROOT, OUT);
if (!(Number.isInteger(N) && N > 0) || !process.argv[4] || (!rel.startsWith('..') && !path.isAbsolute(rel))) { console.error('usage: rehearse_m15.mjs <root> <N> <out file outside the repository>'); process.exit(2); }
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { M15, SENSITIVITY, LABEL_OF, E7, CONDITIONS, KINDS, ADOPTED_AGENT, runLabel, savedRow, mechanisms, closedArms } = await imp('experiments/m15_uncertainty/m15_lib.mjs');
const { criteria, sensitivityBT, reported, readingRule, conditionCalibration } = await imp('experiments/m15_uncertainty/m15_analysis.mjs');
const { SIGMA, SIGMA_INV } = await imp('cognitive/testbed/task_e7.mjs');
const HERE = path.join(ROOT, 'experiments', 'm15_uncertainty');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const admission = JSON.parse(fs.readFileSync(path.join(HERE, 'admission', 'admission.json'), 'utf8'));
const headAtLaunch = git('rev-parse', 'HEAD');
const t = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'test_discover.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const total = (t.stdout.match(/TOTAL (\d+)\/(\d+)/) ?? []).slice(1).map(Number);
const tests = { exit: t.status, passed: total[0] ?? null, total: total[1] ?? null };
const labels = Array.from({ length: N }, (_, i) => LABEL_OF.smoke(i));
const windows = [admission.wStar];
const flat = (k, v) => (v instanceof Float64Array ? Array.from(v) : v);
const digestOf = (L) => sha(JSON.stringify(L, flat));
const A = labels.map((l) => runLabel(l, { windows }));
const digestsA = A.map(digestOf), digestsB = labels.map((l) => digestOf(runLabel(l, { windows })));
const hashA = sha(JSON.stringify(digestsA)), hashB = sha(JSON.stringify(digestsB));
const excluded = A.filter((L) => L.excluded);
const Ls = A.filter((L) => !L.excluded);
const allc = (k) => Ls.every((L) => L.checks[k] === true);
const validity = {
  determinism: hashA === hashB, suite: tests.exit === 0,
  vRev: allc('vrevPassive') && allc('vrevClosed'), concretePassive: allc('concretePassive'), noExclusion: excluded.length === 0,
  frozenUnchanged: allc('frozenUnchanged'), probeIsolation: allc('probeIsolation'), identity: allc('identityWorld0') && allc('absorbedMatches'),
  excludedLabels: excluded.map((L) => L.label),
  perCheckFailures: Object.fromEntries(['vrevPassive', 'vrevClosed', 'concretePassive', 'identityWorld0', 'frozenUnchanged', 'probeIsolation', 'absorbedMatches'].map((k) => [k, Ls.filter((L) => L.checks[k] !== true).map((L) => L.label)])),
};
const ctx = { domain: 'smoke', wStar: admission.wStar, margin: admission.margin };
const C = criteria(Ls, ctx);
const S = sensitivityBT(Ls, ctx);
const R = reported(Ls, ctx);
const btCond = conditionCalibration(Ls, ctx, 'UA');
const reading = readingRule(C, S, validity, btCond);
const appFile = (f) => sha(fs.readFileSync(path.join(ROOT, f)));
const result = {
  evidence: 'REHEARSAL of the M15 result format on smoke labels (not a result)',
  domain: 'smoke', labels: Ls.length, labelPattern: 'm15unc|smoke|<i>', labelOrder: 'numeric',
  specSha256: sha(fs.readFileSync(path.join(HERE, 'SPEC.md'))), pinsSha256: sha(fs.readFileSync(path.join(HERE, 'PINS.json'))), admissionSha256: sha(fs.readFileSync(path.join(HERE, 'admission', 'admission.json'))),
  headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'),
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  appFiles: Object.fromEntries(['main.js', 'index.html', 'connections.json', 'neurons.json'].map((f) => [f, appFile(f)])),
  tests,
  parameters: { m15: M15, sensitivity: SENSITIVITY, e7: E7, conditions: CONDITIONS, kinds: KINDS, sigma: SIGMA, sigmaInv: SIGMA_INV, adoptedAgent: ADOPTED_AGENT, wStar: admission.wStar, margin: admission.margin, n: admission.n, mechanisms: mechanisms(windows), closedArms: closedArms(windows) },
  determinism: { digestsSha256RunA: hashA, digestsSha256RunB: hashB, identical: hashA === hashB },
  validity, criteria: C, btCond, sensitivityBT: S, reported: R, reading,
  digests: digestsA,
  rows: A.map(savedRow),
};
fs.writeFileSync(OUT, JSON.stringify(result) + '\n');
console.log(`rehearsal result: ${Ls.length} smoke labels, suite ${tests.passed}/${tests.total}, runs identical ${hashA === hashB}; ${OUT} (sha256 ${sha(fs.readFileSync(OUT))})`);
console.log(`rehearsal statement: ${reading.statement}`);

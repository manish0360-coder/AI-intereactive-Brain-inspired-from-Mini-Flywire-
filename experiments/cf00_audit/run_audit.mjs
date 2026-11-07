// ==========================================================
// CF-00 runtime audit — driver: sessions, ablations, coverage and analysis
// ==========================================================
//   node experiments/cf00_audit/run_audit.mjs <out-dir-outside-the-repository>
// Runs every session below as its own OS process (preload + session.mjs), one V8-coverage session, then the analysis,
// and writes experiments/cf00_audit/results/audit_summary.json.  Raw session records (tens of MB) stay in <out-dir>.
// Evidence category: runtime observation of the unmodified production code under in-memory instrumentation.  The
// knockouts are open-loop and first-order; the ablations are closed-loop but n = 3 seeds per condition, so their
// differences are descriptive only.  Nothing here is a confirmatory test.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as A from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.resolve(process.argv[2] ?? '');
const rel = path.relative(ROOT, OUT);
if (!process.argv[2] || (!rel.startsWith('..') && !path.isAbsolute(rel))) { console.error('usage: run_audit.mjs <out-dir-outside-the-repository>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const SEEDS = [101, 202, 303], GOAL = 16, LOOPS = 600;
const QR = 'qValue,repetitionFatigue,reward,dangerPenalty';
const AFFECT = 'localConfidence,localStress,localFatigue,localTrust,localFear,curiosityState,confidenceState,stressState,fatigueState,fatigueOverload,dynamicFocus,drift,driveRewardBoost,driveCuriosityBoost,driveGoalBoost';
export const CONDITIONS = {
  BASE: {}, NOGG: { CF00_NOGG: '1' }, NOREACH: { CF00_NOREACH: '1' }, NOFUT: { CF00_ZERO: 'futureBonus' },
  NOQ: { CF00_ZERO: 'qValue,repetitionFatigue' }, NOEPI: { CF00_ZERO: 'trajectoryIntegrity' },
  NOSEM: { CF00_ZERO: 'schemaBonus,semanticVitalityScore,consolidationBonus,meaningBoost,noiseSuppressedScore' },
  NOATT: { CF00_ZERO: 'attentionAmplifiedScore' }, NOTRUST: { CF00_ZERO: 'trustBonus' }, NOAFFECT: { CF00_ZERO: AFFECT },
  NOORACLE: { CF00_NOGG: '1', CF00_NOREACH: '1', CF00_ZERO: 'futureBonus' },
  NOLEARNGOAL: { CF00_NOGG: '1', CF00_ZERO: QR },
  NOORACLE_NOQR: { CF00_NOGG: '1', CF00_NOREACH: '1', CF00_ZERO: `futureBonus,${QR}` },
};
const jobs = [];
for (const [cond, env] of Object.entries(CONDITIONS)) for (const seed of SEEDS) jobs.push({ label: `${cond}_g${GOAL}_s${seed}`, cond, env, seed, goal: GOAL });
for (const seed of SEEDS) jobs.push({ label: `NOGOAL_s${seed}`, cond: 'NOGOAL', env: {}, seed, goal: null });
jobs.push({ label: `REPEAT_BASE_g${GOAL}_s101`, cond: 'REPEAT', env: {}, seed: 101, goal: GOAL });
jobs.push({ label: `COVERAGE_g${GOAL}_s404`, cond: 'COVERAGE', env: { NODE_V8_COVERAGE: path.join(OUT, 'coverage') }, seed: 404, goal: GOAL });

const preload = pathToFileURL(path.join(HERE, 'preload.mjs')).href;
const runJob = (j) => new Promise((resolve) => {
  const out = path.join(OUT, `${j.label}.json`);
  const child = spawn(process.execPath, ['--import', preload, path.join(HERE, 'session.mjs'), JSON.stringify({ seed: j.seed, goal: j.goal, loops: LOOPS, out })],
    { cwd: ROOT, env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, ...j.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let so = '', se = '';
  child.stdout.on('data', (d) => { so += d; }); child.stderr.on('data', (d) => { se += d; });
  child.on('close', (code) => resolve({ ...j, code, out, stdout: so.trim(), stderr: se.trim().slice(0, 400) }));
});
const results = [];
const queue = [...jobs];
await Promise.all(Array.from({ length: Math.max(2, Math.min(8, os.cpus().length - 1)) }, async () => { while (queue.length) results.push(await runJob(queue.shift())); }));
const failed = results.filter((r) => r.code !== 0);
if (failed.length) { console.error(JSON.stringify(failed.map((f) => [f.label, f.code, f.stderr]))); process.exit(1); }

const load = (label) => JSON.parse(fs.readFileSync(path.join(OUT, `${label}.json`), 'utf8'));
const recordHash = (label) => sha(JSON.stringify((({ decisions, moves, goalHits }) => ({ decisions, moves, goalHits }))(load(label))));
const edges = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const base = SEEDS.map((s) => load(`BASE_g${GOAL}_s${s}`));
const noGoal = SEEDS.map((s) => load(`NOGOAL_s${s}`));
const covDir = path.join(OUT, 'coverage');
const covFile = fs.readdirSync(covDir).map((f) => path.join(covDir, f)).find((f) => f.endsWith('.json'));
const prodFiles = ['main.js', ...fs.readdirSync(path.join(ROOT, 'render')).filter((f) => f.endsWith('.js')).sort().map((f) => `render/${f}`)];

const summary = {
  what: 'CF-00 runtime audit of the unmodified production agent under in-memory instrumentation (experiments/cf00_audit/README.md)',
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, head: execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(),
    productionDigest: sha(prodFiles.map((f) => `${f}  ${sha(fs.readFileSync(path.join(ROOT, f)))}`).join('\n') + '\n'), productionFiles: prodFiles.length },
  design: { seeds: SEEDS, goal: GOAL, loopsPerSession: LOOPS, runAgentStepsPerSession: LOOPS * 5, conditions: Object.fromEntries(Object.entries(CONDITIONS).map(([k, v]) => [k, v])) },
  sessions: results.map((r) => ({ label: r.label, exit: r.code, recordSha256: recordHash(r.label), stdout: r.stdout })).sort((a, b) => a.label.localeCompare(b.label)),
  determinism: { repeatOf: `BASE_g${GOAL}_s101`, identical: recordHash(`REPEAT_BASE_g${GOAL}_s101`) === recordHash(`BASE_g${GOAL}_s101`) },
  decisionChannels: { goal16: A.decisionChannels(base), noGoal: A.decisionChannels(noGoal) },
  termKnockouts: { goal16: A.termKnockouts(base), noGoal: A.termKnockouts(noGoal) },
  groupKnockouts: { goal16: A.groupKnockouts(base), noGoal: A.groupKnockouts(noGoal) },
  closedLoop: Object.fromEntries(Object.keys(CONDITIONS).map((c) => [c, A.behaviour(SEEDS.map((s) => load(`${c}_g${GOAL}_s${s}`)), edges, GOAL)])),
  randomWalkArrivalsPer3000Steps: A.randomWalkReference(edges, GOAL, LOOPS * 5),
  goalDirection: { BASE: A.goalDirection(base, edges, GOAL), NOORACLE_NOQR: A.goalDirection(SEEDS.map((s) => load(`NOORACLE_NOQR_g${GOAL}_s${s}`)), edges, GOAL) },
  coverage: A.coverageSummary(covFile, ROOT),
};
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'results', 'audit_summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
console.log(JSON.stringify({ determinism: summary.determinism, channels: summary.decisionChannels.goal16, arrivals: Object.fromEntries(Object.entries(summary.closedLoop).map(([k, v]) => [k, v.totalArrivals])), randomWalk: summary.randomWalkArrivalsPer3000Steps }));

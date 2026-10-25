// ==========================================================
// CREDIT-1 — development calibration runner (CALIBRATION_PROTOCOL.md; calibration.mjs holds the plan and the analysis)
// ==========================================================
//   node experiments/credit1/calibrate.mjs --plan-only [--json <file>]
//       prints the exact session list (re-derives the existing XFER-1 development configurations of worlds 0-29; runs no session;
//       needs no lock)
//   node experiments/credit1/calibrate.mjs --out <dir under experiments/credit1/data> [--workers N]
//       refuses unless the session lock holds exactly the calibration-only record, the output directory is inside the git-ignored
//       data directory, and the working tree has no change to experiments/credit1, main.js, render/ or experiments/learn0.  Then
//       C-0 (the gate), D-0, D-1, D-1c, D-2, the cell sessions, D-3, D-4, D-5, C-1, C-2 in that order; it stops at the first failed
//       step or session and reports the evidence.  Nothing is committed; records stay in the data directory.
// The drivers draw no random number and read no clock; this runner reads the clock only for throughput (C-2).
// ==========================================================
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as LOCK from './lock.mjs';
import { PLAN, EXPECTED_COUNTS, planCalibration, withConfigs, validatePlan, driverInput, goalMismatches, sessionProblems, d0Pairs, d0, d1, d1c, d2, d3, d4, d5, c1, c2 } from './calibration.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DATA = path.join(HERE, 'data');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const arg = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const refuse = (m) => { console.error(`CREDIT-1 calibration refused: ${m}`); process.exit(2); };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, ...rel.split('/'))).href);

// ---- run mode: every refusal comes before anything is derived, built or spawned ----
const PLAN_ONLY = flag('--plan-only');
let OUT = null;
if (!PLAN_ONLY) {
  try { LOCK.assertSessionAuthorized(); } catch (e) { refuse(e.message); }
  const lp = LOCK.calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION);
  if (lp.length) refuse(lp.join('; '));
  if (LOCK.A_PLUS_MODULE_AUTHORIZATION !== null) refuse('the A+ module lock is not null; this calibration excludes A+');
  if (!arg('--out')) refuse('--out <dir under experiments/credit1/data> is required');
  OUT = path.resolve(arg('--out'));
  const rel = path.relative(DATA, OUT);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) refuse(`the output directory must be inside ${path.relative(ROOT, DATA)}`);
  if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) refuse('the output directory is not empty');
  const dirty = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'experiments/credit1', 'main.js', 'render', 'experiments/learn0'], { cwd: ROOT });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'experiments/credit1', 'experiments/learn0'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  if (dirty.status !== 0 || untracked) refuse('the working tree is not the committed, verified state (uncommitted change or untracked file in scope)');
}

// ---- the development configurations (existing XFER-1 stream, deterministic) and the plan ----
const { generateAcceptedStream } = await imp('experiments/m7/env.js');
const X1 = await imp('experiments/xfer1/config.mjs');
const N = PLAN.worlds.hi - PLAN.worlds.lo + 1;
const stream = generateAcceptedStream(X1.CONFIG_START, N);
const plan = withConfigs(planCalibration(), stream);
const planProblems = validatePlan(plan);
const mism = goalMismatches(stream);
const l0rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'learn0', 'evidence', 'calib_learn0_rows.json'), 'utf8')).rows;
const sameWorldsAsLearn0 = stream.every((s, w) => l0rows[String(w)] && l0rows[String(w)].goal === s.goal);

if (PLAN_ONLY) {
  const counts = plan.reduce((m, e) => ((m[e.step] = (m[e.step] || 0) + 1), m), {});
  console.log('CREDIT-1 development calibration - plan only (no session is run)');
  console.log(`development configurations: XFER-1 stream from config seed ${X1.CONFIG_START}, worlds ${PLAN.worlds.lo}-${PLAN.worlds.hi} (re-derived; nothing new generated)`);
  console.log(`goals per world equal LEARN-0's committed development-calibration evidence: ${sameWorldsAsLearn0 ? 'yes' : 'NO'}`);
  console.log(`D-5 pre-check (stream goal = GOALS[w mod 4]): ${mism.length ? 'MISMATCH ' + JSON.stringify(mism) : 'all 30 worlds match'}`);
  console.log(`sessions: ${plan.length} (expected ${EXPECTED_COUNTS.total}) | ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' | ')}`);
  console.log(`plan validation: ${planProblems.length ? 'FAILED ' + planProblems.slice(0, 5).join('; ') : 'PASS'}`);
  console.log('\nseq  step   driver   label                 world role  cell/arm  map procedure          store             configSeed agentSeed');
  for (const e of plan) console.log(`${String(e.seq).padStart(3)}  ${e.step.padEnd(6)} ${e.driver.padEnd(8)} ${e.label.padEnd(21)} ${String(e.world).padStart(5)} ${e.role.padEnd(5)} ${(e.cell || e.arm || '-').padEnd(9)} ${e.map.padEnd(3)} ${(e.procedure || '-').padEnd(18)} ${(e.brainFrom || '-').padEnd(17)} ${String(e.configSeed).padStart(10)} ${e.agentSeed}`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ schema: 'credit1/1.calibration-plan', configStart: X1.CONFIG_START, worlds: PLAN.worlds, counts, total: plan.length, goalMismatches: mism, sameWorldsAsLearn0, planProblems, plan }, null, 2) + '\n');
  process.exit(planProblems.length || plan.length !== EXPECTED_COUNTS.total ? 1 : 0);
}

// ================= run mode =================
if (planProblems.length) refuse(`plan validation: ${planProblems[0]}`);
fs.mkdirSync(path.join(OUT, 'sessions'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'brains'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'logs'), { recursive: true });
const WORKERS = Math.max(1, Number(arg('--workers') || Math.min(6, Math.max(1, os.cpus().length - 1))));
const summary = { schema: 'credit1/1.calibration', status: 'RUNNING', head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
  authorization: LOCK.SESSION_AUTHORIZATION, workers: WORKERS, sameWorldsAsLearn0, goalMismatches: mism, steps: [], sessionsRun: 0 };
const save = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const stop = (step, result) => { summary.steps.push(result); summary.status = `STOPPED AT ${step}`; save(); console.log(`\nSTOPPED at ${step}: ${JSON.stringify(result).slice(0, 1500)}`); process.exit(1); };
const pass = (result) => { summary.steps.push(result); save(); console.log(`PASS ${result.step}`); };

// C-0: the gate on the commit to be used
{
  const g = spawnSync(process.execPath, [path.join(HERE, 'verify_credit1.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  fs.writeFileSync(path.join(OUT, 'logs', 'c0_gate.log'), g.stdout + g.stderr);
  const last = g.stdout.trim().split('\n').slice(-2).join(' | ');
  const r = { step: 'C-0', pass: g.status === 0 && /GATE PASSED/.test(g.stdout), gate: last };
  if (!r.pass) stop('C-0', r); else pass(r);
}

// trees (the drivers re-verify every pin)
const { buildCredit1Trees } = await import('./transform.mjs');
const C = await import('./config.mjs');
const built = buildCredit1Trees({ outRoot: path.join(os.tmpdir(), 'mfw-credit1-calib') });
const TREES = { learn0: built.learn0.dir, credit1: built.trees.A.dir };
if (sha256(fs.readFileSync(path.join(TREES.credit1, 'main.js'))) !== C.CREDIT1_TREE.A.mainSha256 || sha256(fs.readFileSync(path.join(TREES.learn0, 'main.js'))) !== C.LEARN0_TREE.mainSha256) refuse('tree pins');
const brain = (label) => path.join(OUT, 'brains', `${label}.json`);
const SESS = { learn0: path.join(ROOT, 'experiments', 'learn0', 'session.mjs'), credit1: path.join(HERE, 'session.mjs') };

const recs = {}, exportSha = {};
let wallMs = 0;
function runOne(e) {
  return new Promise((res) => {
    const input = driverInput(e, { tree: TREES, brain });
    const c = spawn(process.execPath, [SESS[e.driver], JSON.stringify(input)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    c.stdout.on('data', d => { so += d; }); c.stderr.on('data', d => { se += d; });
    c.on('close', (code) => {
      const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; }
      if (se.trim()) fs.writeFileSync(path.join(OUT, 'logs', `${e.label}.err`), se.slice(-20000));
      if (rec) fs.writeFileSync(path.join(OUT, 'sessions', `${e.label}.json`), JSON.stringify(rec));
      if (rec && e.export && fs.existsSync(brain(e.label))) exportSha[e.label] = sha256(fs.readFileSync(brain(e.label)));
      res({ e, code, rec, err: se.slice(-400) });
    });
  });
}
async function runStep(step) {
  const entries = plan.filter(e => e.step === step);
  for (const phase of ['train', 'test']) {
    const todo = entries.filter(e => e.role === phase);
    const t0 = Date.now();
    let k = 0, failed = null;
    await Promise.all(Array.from({ length: WORKERS }, async () => {
      for (;;) {
        if (failed) return;
        const i = k++; if (i >= todo.length) return;
        const r = await runOne(todo[i]);
        summary.sessionsRun++;
        const p = r.code !== 0 || !r.rec ? [`${r.e.label}: exit ${r.code} ${r.err}`] : sessionProblems(r.rec);
        if (p.length && !failed) failed = { step, session: r.e.label, problems: p };
        if (r.rec) recs[r.e.label] = r.rec;
      }
    }));
    wallMs += Date.now() - t0;
    if (failed) stop(step, { step, pass: false, ...failed });
  }
  save();
  console.log(`${step}: ${entries.length} sessions done (${summary.sessionsRun} so far)`);
}

await runStep('D-0');
{ const exp = Object.fromEntries(d0Pairs()[0].map(l => [l, fs.existsSync(brain(l)) ? fs.readFileSync(brain(l), 'utf8') : null]));
  const r = { ...d0(recs, exp), exportSha: Object.fromEntries(d0Pairs()[0].map(l => [l, exportSha[l] || null])) };
  if (!r.pass) stop('D-0', r); else pass(r); }
await runStep('D-1');
{ const r = d1(recs); if (!r.pass) stop('D-1', r); else pass(r); }
{ const r = d1c(recs, { aPlus: false }); if (!r.pass) stop('D-1c', r); else pass(r); }
await runStep('D-2');
{ const r = d2(recs); if (!r.pass) stop('D-2', r); else pass(r); }
await runStep('CELLS');
for (const f of [d3, d4, d5, c1]) { const r = f(recs); if (!r.pass) stop(r.step, r); else pass(r); }
{ const r = c2(recs, { sessionsPerMinute: summary.sessionsRun / (wallMs / 60000) }); if (!r.pass) stop('C-2', r); else pass(r); }
summary.status = 'COMPLETE: every step passed';
save();
console.log(`\nCREDIT-1 development calibration: every step passed; sessions run ${summary.sessionsRun}; n = ${summary.steps.find(s => s.step === 'C-1').n}`);

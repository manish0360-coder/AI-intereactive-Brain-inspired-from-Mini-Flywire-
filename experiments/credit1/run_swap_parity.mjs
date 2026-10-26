// ==========================================================
// CREDIT-1 — swap-parity check runner (development only; Gemini round 3, HIGH; calibration.mjs holds the plan and the verdict)
// ==========================================================
//   node experiments/credit1/run_swap_parity.mjs --plan-only [--json <file>]
//       prints the exact 60-session list (re-derives the existing XFER-1 development configurations of worlds 0-10; runs no
//       session; needs no lock)
//   node experiments/credit1/run_swap_parity.mjs --out <dir under experiments/credit1/data> [--workers N]
//       refuses unless the swap-parity lock holds exactly its record, the calibration lock holds exactly its record (it authorizes
//       the training and swapped sessions), the A+ lock is null, the output directory is inside the git-ignored data directory and
//       empty, and the working tree has no change in scope.  Then: C-0 (the gate), the 20 training sessions, a byte copy of each
//       source export for its own-path partner (sha256 checked), the 40 test sessions, and the verdict.  It stops at the first
//       failure.  Nothing is committed.
// The drivers draw no random number and read no clock.
// ==========================================================
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as LOCK from './lock.mjs';
import { SWAP_PLAN, SWAP_EXPECTED, planSwapParity, validateSwapPlan, withConfigs, driverInput, sessionProblems, swapPairs, swapParity } from './calibration.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DATA = path.join(HERE, 'data');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const arg = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const refuse = (m) => { console.error(`CREDIT-1 swap-parity refused: ${m}`); process.exit(2); };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, ...rel.split('/'))).href);

// ---- run mode: every refusal comes before anything is derived, built or spawned ----
const PLAN_ONLY = flag('--plan-only');
let OUT = null;
if (!PLAN_ONLY) {
  const sp = LOCK.swapParityRecordProblems(LOCK.SWAP_PARITY_AUTHORIZATION);
  if (sp.length) refuse(sp.join('; '));
  const cp = LOCK.calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION);
  if (cp.length) refuse(cp.join('; '));
  if (LOCK.A_PLUS_MODULE_AUTHORIZATION !== null) refuse('the A+ module lock is not null');
  if (!arg('--out')) refuse('--out <dir under experiments/credit1/data> is required');
  OUT = path.resolve(arg('--out'));
  const rel = path.relative(DATA, OUT);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) refuse(`the output directory must be inside ${path.relative(ROOT, DATA)}`);
  if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) refuse('the output directory is not empty');
  const dirty = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'experiments/credit1', 'main.js', 'render', 'experiments/learn0'], { cwd: ROOT });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'experiments/credit1', 'experiments/learn0'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  if (dirty.status !== 0 || untracked) refuse('the working tree is not the committed, verified state (uncommitted change or untracked file in scope)');
}

// ---- the existing XFER-1 development configurations of worlds 0..10 (deterministic) and the plan ----
const { generateAcceptedStream } = await imp('experiments/m7/env.js');
const X1 = await imp('experiments/xfer1/config.mjs');
const stream = generateAcceptedStream(X1.CONFIG_START, LOCK.SWAP_PARITY_SCOPE.worlds.hi + 1);
const plan = withConfigs(planSwapParity(), stream);
const planProblems = validateSwapPlan(plan);

if (PLAN_ONLY) {
  console.log('CREDIT-1 swap-parity check - plan only (no session is run)');
  console.log(`development configurations: XFER-1 stream from config seed ${X1.CONFIG_START}, worlds ${LOCK.SWAP_PARITY_SCOPE.worlds.lo}-${LOCK.SWAP_PARITY_SCOPE.worlds.hi} (re-derived; nothing new generated)`);
  console.log(`sessions: ${plan.length} (expected ${SWAP_EXPECTED.total}: ${SWAP_EXPECTED.train} training, ${SWAP_EXPECTED.swap} swapped, ${SWAP_EXPECTED.own} own-path) | pairs ${swapPairs().length} | test worlds ${SWAP_PLAN.worlds.lo}-${SWAP_PLAN.worlds.hi}`);
  console.log(`plan validation: ${planProblems.length ? 'FAILED ' + planProblems.slice(0, 5).join('; ') : 'PASS'}`);
  console.log('\nseq  label                    world role  cell  procedure            store (source export)  copy                        configSeed agentSeed');
  for (const e of plan) console.log(`${String(e.seq).padStart(3)}  ${e.label.padEnd(24)} ${String(e.world).padStart(5)} ${e.role.padEnd(5)} ${e.cell.padEnd(5)} ${(e.procedure || '-').padEnd(20)} ${(e.brainFrom || '-').padEnd(22)} ${(e.copyAs || '-').padEnd(27)} ${String(e.configSeed).padStart(10)} ${e.agentSeed}`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ schema: 'credit1/1.swap-parity-plan', configStart: X1.CONFIG_START, total: plan.length, pairs: swapPairs(), planProblems, plan }, null, 2) + '\n');
  process.exit(planProblems.length || plan.length !== SWAP_EXPECTED.total ? 1 : 0);
}

// ================= run mode =================
if (planProblems.length) refuse(`plan validation: ${planProblems[0]}`);
for (const d of ['sessions', 'brains', 'logs']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const WORKERS = Math.max(1, Number(arg('--workers') || Math.min(6, Math.max(1, os.cpus().length - 1))));
const summary = { schema: 'credit1/1.swap-parity', status: 'RUNNING', head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
  authorization: LOCK.SWAP_PARITY_AUTHORIZATION, calibrationAuthorization: LOCK.SESSION_AUTHORIZATION, workers: WORKERS, steps: [], sessionsRun: 0, fileSha: {}, expectedDeliveredHash: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const stop = (step, result) => { summary.steps.push(result); summary.status = `STOPPED AT ${step}`; save(); console.log(`\nSTOPPED at ${step}: ${JSON.stringify(result).slice(0, 1500)}`); process.exit(1); };

// C-0: the gate on the commit to be used
{
  const g = spawnSync(process.execPath, [path.join(HERE, 'verify_credit1.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  fs.writeFileSync(path.join(OUT, 'logs', 'c0_gate.log'), g.stdout + g.stderr);
  const r = { step: 'C-0', pass: g.status === 0 && /GATE PASSED/.test(g.stdout), gate: g.stdout.trim().split('\n').slice(-2).join(' | ') };
  if (!r.pass) stop('C-0', r); summary.steps.push(r); save(); console.log('PASS C-0');
}

// the CREDIT-1 tree A (the drivers re-verify every pin)
const { buildCredit1Trees } = await import('./transform.mjs');
const C = await import('./config.mjs');
const { brainHash } = await imp('experiments/xfer1/brain.mjs');
const { maskStore } = await import('./delivery.mjs');
const built = buildCredit1Trees({ outRoot: path.join(os.tmpdir(), 'mfw-credit1-swap') });
const TREES = { learn0: built.learn0.dir, credit1: built.trees.A.dir };
if (sha256(fs.readFileSync(path.join(TREES.credit1, 'main.js'))) !== C.CREDIT1_TREE.A.mainSha256) refuse('tree pin');
const brain = (label) => path.join(OUT, 'brains', `${label}.json`);
const SESS = path.join(HERE, 'session.mjs');
const recs = {};
function runOne(e) {
  return new Promise((res) => {
    const c = spawn(process.execPath, [SESS, JSON.stringify(driverInput(e, { tree: TREES, brain }))], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    c.stdout.on('data', d => { so += d; }); c.stderr.on('data', d => { se += d; });
    c.on('close', (code) => {
      const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; }
      if (se.trim()) fs.writeFileSync(path.join(OUT, 'logs', `${e.label}.err`), se.slice(-20000));
      if (rec) fs.writeFileSync(path.join(OUT, 'sessions', `${e.label}.json`), JSON.stringify(rec));
      res({ e, code, rec, err: se.slice(-400) });
    });
  });
}
async function runPhase(name, todo) {
  let k = 0, failed = null;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    for (;;) {
      if (failed) return;
      const i = k++; if (i >= todo.length) return;
      const r = await runOne(todo[i]);
      summary.sessionsRun++;
      const p = r.code !== 0 || !r.rec ? [`${r.e.label}: exit ${r.code} ${r.err}`] : sessionProblems(r.rec);
      if (p.length && !failed) failed = { step: name, pass: false, session: r.e.label, problems: p };
      if (r.rec) recs[r.e.label] = r.rec;
    }
  }));
  save();
  if (failed) stop(name, failed);
  console.log(`${name}: ${todo.length} sessions done (${summary.sessionsRun} so far)`);
}

await runPhase('TRAIN', plan.filter(e => e.role === 'train'));
// the byte copies for the own-path sessions, and the expected delivered (masked) store of every source export
for (const e of plan.filter(x => x.copyAs)) {
  fs.copyFileSync(brain(e.brainFrom), brain(e.copyAs));
  summary.fileSha[e.brainFrom] = sha256(fs.readFileSync(brain(e.brainFrom)));
  summary.fileSha[e.copyAs] = sha256(fs.readFileSync(brain(e.copyAs)));
  if (summary.fileSha[e.copyAs] !== summary.fileSha[e.brainFrom]) stop('COPY', { step: 'COPY', pass: false, copy: e.copyAs, why: 'the copy is not byte-identical to its source export' });
  summary.expectedDeliveredHash[e.brainFrom] ||= brainHash(maskStore(JSON.parse(fs.readFileSync(brain(e.brainFrom), 'utf8')), 'FULL'));
}
save();
await runPhase('TEST', plan.filter(e => e.role === 'test'));
const verdict = swapParity(recs, { fileSha: summary.fileSha, expectedDeliveredHash: summary.expectedDeliveredHash });
if (!verdict.pass) stop('SWAP-PARITY', verdict);
summary.steps.push(verdict);
summary.status = 'COMPLETE: every pair identical';
save();
console.log(`\nCREDIT-1 swap-parity check: ${verdict.pairs}/${verdict.pairs} pairs identical; sessions run ${summary.sessionsRun}`);

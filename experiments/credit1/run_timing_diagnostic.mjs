// ==========================================================
// CREDIT-1 — timing-diagnostic runner (development only; TIMING_DIAGNOSTIC_PLAN.md; diagnostic.mjs holds the plan, the rules and the verdict)
// ==========================================================
//   node experiments/credit1/run_timing_diagnostic.mjs [--plan-only] [--json <file>]
//       the default: prints the exact preregistered session list (re-derives the existing XFER-1 development configurations of
//       worlds 0-26; runs no session; needs no lock)
//   node experiments/credit1/run_timing_diagnostic.mjs --run --out <dir under experiments/credit1/data>
//       refuses unless the timing-diagnostic lock holds exactly its record, the calibration and swap-parity locks hold exactly their
//       records, the A+ lock is null, the plan document is the preregistered one, the output directory is inside the git-ignored data
//       directory and empty, and the working tree has no change in scope.  Then: C-0 (the gate), the byte copies of the pinned source
//       stores, the phases in plan order (low load: 1 worker; high load: 12 workers and 12 CPU stressors), the escalation only under its
//       rule, the comparisons and the verdict.  It stops at the first invalid session; differences are results, not stops.  Every
//       session runs under node --import clock_preload.mjs.  Nothing is committed.
// The report carries identity verdicts only (no outcome value, cell mean or effect estimate).
// ==========================================================
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as LOCK from './lock.mjs';
import { PRELOAD_FILE } from './clock.mjs';
import { DIAG, DIAG_EXPECTED, SOURCE_STORES, SOURCE_PREFIX, SWAP_LABELS, planTimingDiagnostic, withDiagnosticConfigs, validateDiagnosticPlan, diagnosticInput,
  diagnosticSessionProblems, diagnosticComparisons, escalationNeeded, recordDiff, traceDiff, exportDiff, localization, replayOutcome, diagnosticVerdict, diagnosticReport } from './diagnostic.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DATA = path.join(HERE, 'data');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const arg = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const refuse = (m) => { console.error(`CREDIT-1 timing diagnostic refused: ${m}`); process.exit(2); };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, ...rel.split('/'))).href);
const PLAN_DOC = path.join(HERE, 'TIMING_DIAGNOSTIC_PLAN.md');

// ---- run mode: every refusal comes before anything is derived, built or spawned ----
const RUN = flag('--run');
let OUT = null;
if (RUN) {
  const tp = LOCK.timingDiagnosticRecordProblems(LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION);
  if (tp.length) refuse(tp.join('; '));
  const cp = LOCK.calibrationRecordProblems(LOCK.SESSION_AUTHORIZATION);
  if (cp.length) refuse(cp.join('; '));
  const sp = LOCK.swapParityRecordProblems(LOCK.SWAP_PARITY_AUTHORIZATION);
  if (sp.length) refuse(sp.join('; '));
  if (LOCK.A_PLUS_MODULE_AUTHORIZATION !== null) refuse('the A+ module lock is not null');
  if (sha256(fs.readFileSync(PLAN_DOC)) !== LOCK.TIMING_DIAGNOSTIC_SCOPE.planDocSha256) refuse('TIMING_DIAGNOSTIC_PLAN.md is not the preregistered plan document');
  if (!arg('--out')) refuse('--out <dir under experiments/credit1/data> is required');
  OUT = path.resolve(arg('--out'));
  const rel = path.relative(DATA, OUT);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) refuse(`the output directory must be inside ${path.relative(ROOT, DATA)}`);
  if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) refuse('the output directory is not empty');
  const dirty = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'experiments/credit1', 'main.js', 'render', 'experiments/learn0'], { cwd: ROOT });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'experiments/credit1', 'experiments/learn0'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  if (dirty.status !== 0 || untracked) refuse('the working tree is not the committed, verified state (uncommitted change or untracked file in scope)');
} else {
  const rest = args.filter((a, i) => !(a === '--plan-only' || a === '--json' || args[i - 1] === '--json'));
  if (rest.length) refuse(`unknown arguments: ${rest.join(' ')} (plan-only is the default; a run needs --run --out <dir>)`);
}

// ---- the existing XFER-1 development configurations (deterministic) and the plan ----
const { generateAcceptedStream } = await imp('experiments/m7/env.js');
const X1 = await imp('experiments/xfer1/config.mjs');
const maxWorld = Math.max(...LOCK.TIMING_DIAGNOSTIC_SCOPE.worlds);
const stream = generateAcceptedStream(X1.CONFIG_START, maxWorld + 1);
const plan = withDiagnosticConfigs(planTimingDiagnostic(), stream);
const planProblems = validateDiagnosticPlan(plan);

if (!RUN) {
  console.log('CREDIT-1 timing diagnostic - plan only (the default; no session is run)');
  console.log(`development configurations: XFER-1 stream from config seed ${X1.CONFIG_START}, worlds 0-${maxWorld} (re-derived; nothing new generated)`);
  console.log(`sessions: ${plan.filter(e => !e.conditional).length} + ${plan.filter(e => e.conditional).length} conditional (expected ${DIAG_EXPECTED.base} + ${DIAG_EXPECTED.R_ESC}) | source stores from ${DIAG.sourceRun} (sha256-pinned)`);
  console.log(`plan validation: ${planProblems.length ? 'FAILED ' + planProblems.slice(0, 5).join('; ') : 'PASS'}`);
  console.log('\nseq  file                                   block   load  world role  cell  clock        t0             store      configSeed agentSeed');
  for (const e of plan) console.log(`${String(e.seq).padStart(3)}  ${e.file.padEnd(38)} ${e.block.padEnd(7)} ${e.load.padEnd(5)} ${String(e.world).padStart(5)} ${e.role.padEnd(5)} ${e.cell.padEnd(5)} ${e.clock.mode.padEnd(12)} ${String(e.clock.t0).padEnd(14)} ${(e.brainFrom || '-').padEnd(10)} ${String(e.configSeed).padStart(10)} ${e.agentSeed}${e.conditional ? '  (conditional)' : ''}`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ schema: 'credit1/1.timing-diagnostic-plan', configStart: X1.CONFIG_START, total: plan.length, base: plan.filter(e => !e.conditional).length, planProblems, plan }, null, 2) + '\n');
  process.exit(planProblems.length || plan.length !== DIAG_EXPECTED.total ? 1 : 0);
}

// ================= run mode =================
if (planProblems.length) refuse(`plan validation: ${planProblems[0]}`);
for (const d of ['sessions', 'traces', 'brains', 'logs']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const summary = { schema: 'credit1/1.timing-diagnostic', status: 'RUNNING', head: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
  authorization: LOCK.TIMING_DIAGNOSTIC_AUTHORIZATION, machine: { cpus: os.cpus().length, cpuModel: os.cpus()[0].model, totalMemGB: +(os.totalmem() / 2 ** 30).toFixed(1), platform: process.platform,
    node: process.version, nodeSha256: sha256(fs.readFileSync(process.execPath)) }, steps: [], phases: [], sessionsRun: 0, escalated: null, sessionWallMs: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
let stressors = [];
const stopStress = () => { for (const s of stressors) { try { s.kill(); } catch { /* gone */ } } stressors = []; };
process.on('exit', stopStress);
const stop = (step, result) => { stopStress(); summary.steps.push(result); summary.status = `STOPPED AT ${step}`; save(); console.log(`\nSTOPPED at ${step}: ${JSON.stringify(result).slice(0, 1500)}`); process.exit(1); };

// C-0: the gate on the commit to be used
{
  const g = spawnSync(process.execPath, [path.join(HERE, 'verify_credit1.mjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  fs.writeFileSync(path.join(OUT, 'logs', 'c0_gate.log'), g.stdout + g.stderr);
  const r = { step: 'C-0', pass: g.status === 0 && /GATE PASSED/.test(g.stdout), gate: g.stdout.trim().split('\n').slice(-2).join(' | ') };
  if (!r.pass) stop('C-0', r); summary.steps.push(r); save(); console.log('PASS C-0');
}

// the CREDIT-1 tree A (the driver re-verifies every pin) and the byte copies of the pinned source stores
const { buildCredit1Trees } = await import('./transform.mjs');
const C = await import('./config.mjs');
const built = buildCredit1Trees({ outRoot: path.join(os.tmpdir(), 'mfw-credit1-timing') });
const TREE = built.trees.A.dir;
if (sha256(fs.readFileSync(path.join(TREE, 'main.js'))) !== C.CREDIT1_TREE.A.mainSha256) refuse('tree pin');
const PATHS = { tree: TREE, tracesDir: path.join(OUT, 'traces'), brainsDir: path.join(OUT, 'brains') };
for (const [label, want] of Object.entries(SOURCE_STORES)) {
  const src = path.join(DATA, DIAG.sourceRun, 'brains', `${label}.json`), dst = path.join(OUT, 'brains', `${SOURCE_PREFIX}${label}.json`);
  if (!fs.existsSync(src) || sha256(fs.readFileSync(src)) !== want) stop('SOURCES', { step: 'SOURCES', pass: false, store: label, why: 'the source store is missing or not the pinned file' });
  fs.copyFileSync(src, dst);
  if (sha256(fs.readFileSync(dst)) !== want) stop('SOURCES', { step: 'SOURCES', pass: false, store: label, why: 'the copy is not byte-identical to the pinned source' });
}
summary.steps.push({ step: 'SOURCES', pass: true, stores: Object.keys(SOURCE_STORES).length }); save();

const SESS = path.join(HERE, 'session.mjs');
const PRELOAD_URL = pathToFileURL(path.join(HERE, PRELOAD_FILE)).href;
const childEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_OPTIONS'));
const read = (dir, file) => { const p = path.join(OUT, dir, `${file}.json`); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
function runOne(e) {
  return new Promise((res) => {
    let replay = null;
    if (e.replayFrom) { const p = path.join(OUT, 'traces', `${e.replayFrom}.json`); replay = { path: p, sha256: sha256(fs.readFileSync(p)) }; }
    const t0 = process.hrtime.bigint();
    const c = spawn(process.execPath, ['--import', PRELOAD_URL, SESS, JSON.stringify(diagnosticInput(e, PATHS, replay))], { cwd: ROOT, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    c.stdout.on('data', d => { so += d; }); c.stderr.on('data', d => { se += d; });
    c.on('close', (code) => {
      summary.sessionWallMs[e.file] = Number((process.hrtime.bigint() - t0) / 1000000n);
      const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; }
      if (se.trim()) fs.writeFileSync(path.join(OUT, 'logs', `${e.file}.err`), se.slice(-20000));
      if (rec) fs.writeFileSync(path.join(OUT, 'sessions', `${e.file}.json`), JSON.stringify(rec));
      res({ e, code, rec, stderr: se });
    });
  });
}
async function runPhase(name, todo) {
  const L = DIAG.loads[todo[0].load];
  if (todo.some(e => e.load !== todo[0].load)) stop(name, { step: name, pass: false, why: 'a phase mixes loads' });
  for (let i = 0; i < L.stressors; i++) stressors.push(spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }));
  const ph = { phase: name, load: todo[0].load, workers: L.workers, stressors: stressors.length, sessions: todo.length };
  let k = 0, failed = null;
  await Promise.all(Array.from({ length: L.workers }, async () => {
    for (;;) {
      if (failed) return;
      const i = k++; if (i >= todo.length) return;
      const r = await runOne(todo[i]);
      summary.sessionsRun++;
      const replay = r.e.block === 'P_FULL' || r.e.block === 'P_SITE';
      const p = !r.rec ? [`${r.e.file}: exit ${r.code}, no record`] : (r.code !== 0 && !(replay && r.rec.outcome && r.rec.outcome.crashed)) ? [`${r.e.file}: exit ${r.code}`] : diagnosticSessionProblems(r.rec, r.e, { stderr: r.stderr });
      if (p.length && !failed) failed = { step: name, pass: false, session: r.e.file, problems: p };
    }
  }));
  stopStress();
  summary.phases.push(ph); save();
  if (failed) stop(name, failed);
  console.log(`${name}: ${todo.length} sessions done (${summary.sessionsRun} so far)`);
}
// phases: consecutive plan entries of one block and one load, in plan order
const phasesOf = (entries) => { const out = []; for (const e of entries) { const last = out[out.length - 1]; if (last && last[0].block === e.block && last[0].load === e.load) last.push(e); else out.push([e]); } return out; };
const ran = new Set();
const runEntries = async (entries) => { for (const ph of phasesOf(entries)) { await runPhase(`${ph[0].block}-${ph[0].load}`, ph); for (const e of ph) ran.add(e.file); } };

// R, then the escalation only under its rule, then P, V, V_T0B, TR
const pairOf = (a, b) => { const rd = recordDiff(read('sessions', a), read('sessions', b)), td = traceDiff(read('traces', a), read('traces', b)); return { identical: rd.identical && td.identical, rd, td }; };
const rVariation = () => SWAP_LABELS.map(l => { const files = plan.filter(e => (e.block === 'R' || e.block === 'R_ESC') && e.label === l && ran.has(e.file)).map(e => e.file);
  const pairs = []; for (let i = 0; i < files.length; i++) for (let j = i + 1; j < files.length; j++) pairs.push(pairOf(files[i], files[j]));
  return { label: l, varies: pairs.some(q => !q.identical), sourcesDiffer: !pairOf(`R-LOW-1__${l}`, `R-HIGH-1__${l}`).identical }; });
await runEntries(plan.filter(e => e.block === 'R'));
summary.escalated = escalationNeeded(rVariation());
if (summary.escalated) await runEntries(plan.filter(e => e.block === 'R_ESC'));
await runEntries(plan.filter(e => !['R', 'R_ESC'].includes(e.block)));

// comparisons, verdict, identity-only report
const comparisons = diagnosticComparisons(plan, ran).map(c => {
  const recA = read('sessions', c.a), recB = read('sessions', c.b), trA = read('traces', c.a), trB = read('traces', c.b);
  if (c.kind === 'P_FULL' || c.kind === 'P_SITE') { const o = replayOutcome({ srcRecord: recA, srcTrace: trA, repRecord: recB, repTrace: trB, allowed: c.allowed }); return { ...c, identical: o.outcome === 'REPRODUCED', ...o }; }
  const rd = recordDiff(recA, recB, c.allowed), td = traceDiff(trA, trB), ex = c.exports ? exportDiff(read('brains', c.a), read('brains', c.b)) : { identical: true };
  const identical = rd.identical && td.identical && ex.identical;
  return { ...c, identical, paths: [...rd.paths, ...(ex.identical ? [] : ['(export bytes)'])], ...td, loc: c.kind === 'R' && !identical ? localization(trA, trB) : null };
});
const by = (k) => comparisons.filter(c => c.kind === k);
const rv = rVariation();
const verdict = diagnosticVerdict({
  r: rv.map(s => ({ ...s, pairs: by('R').filter(c => c.label === s.label) })), escalated: summary.escalated,
  p: [...by('P_FULL'), ...by('P_SITE')].map(c => ({ label: c.label, kind: c.kind, outcome: c.outcome })),
  v: by('V'), vb: by('V_T0B'), tr: by('TR') });
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(diagnosticReport({ comparisons, verdict }), null, 2) + '\n');
summary.steps.push({ step: 'VERDICT', category: verdict.category, reasons: verdict.reasons.length });
summary.status = `COMPLETE: ${verdict.category}`;
save();
console.log(`\nCREDIT-1 timing diagnostic: ${verdict.category}; sessions run ${summary.sessionsRun}; report ${path.relative(ROOT, path.join(OUT, 'report.json'))}`);

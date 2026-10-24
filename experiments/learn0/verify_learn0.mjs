// ==========================================================
// LEARN-0 — design verification gate (prints NO confirmatory endpoint; runs only XFER-1 development worlds 0-3)
// ==========================================================
//   node experiments/learn0/verify_learn0.mjs
// Sections
//   S  static     : runtime identity in git, frozen studies untouched, tree pins and the exact four-line change, the executable map-knowledge
//                   call-graph audit, the S5 invariant, the declared design (cells, worlds, accounting, margin, sizing, calibration), digests
//   N  neutrality : bare HEAD == derived == guard tree == LEARN-0 tree (bare) == LEARN-0 instrumented map ON (cold and with a store);
//                   map OFF executes zero oracle calls in every role and arm; map ON executes them; determinism; refusals
//   K  scope      : at the first decision, map OFF vs ON differ ONLY in the oracle-derived terms, and every extra map-OFF candidate is one the
//                   reachability oracle would have filtered (independent BFS)
//   D  measurement: the move-direction counts recompute independently from the raw arrival trace; store delivery per component is exact
//   A  analysis   : labels, sensitivity, refusals (oracle leak, store mismatch, pairing, undeclared cell, map mismatch, training map) on fixtures
//   P  plan/power : the exact 2,160-session plan from index-derived worlds (no stream generated), reserved-block disjointness, fresh seeds,
//                   the sizing rule, the calibration constants
//   O  plumbing   : orchestrator --selftest on development worlds 0-1; its records pass the analysis' own integrity rules
//   M  mutants    : broken tree / driver / audit / analysis / config must be caught
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateAcceptedStream } from '../m7/env.js';
import * as X1 from '../xfer1/config.mjs';
import { prng } from '../xfer1/stats.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';
import { buildHeadTree } from '../gate-floor-prodsem/transform.mjs';
import { buildGuardTree } from '../gate-floor-interaction/transform.mjs';
import { lastReasoningInvariant } from '../gate-floor-interaction/static_checks.mjs';
import * as C from './config.mjs';
import { buildLearn0Tree, transformFile, LINES, ORACLES } from './transform.mjs';
import { auditTree, loadTable, loadSweep } from './static_audit.mjs';
import { planSessions, goalOfIndex, blockIndices, trainLabel, testLabel } from './plan.mjs';
import { evaluateBlock } from './analyze.mjs';
import { closedForm } from './sizing.mjs';
import { provenance, positionSequence, trajectoryPairs } from './provenance.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0; const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + String(detail).slice(0, 400))); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log((ok ? 'CAUGHT ' : 'MISSED ') + id + (ok || !detail ? '' : ' :: ' + detail)); };
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const J = (o) => JSON.stringify(o);
const clone = (o) => JSON.parse(JSON.stringify(o));
const git = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'l0-verify-'));
const WORKERS = Math.max(2, Math.min(8, os.cpus().length - 1));
const RT = [...C.RUNTIME.runtimePaths];

// private tree builds (never the shared default directories)
const bare = buildHeadTree({ derived: false, outRoot: path.join(SCRATCH, 'bare') });
const derived = buildHeadTree({ derived: true, outRoot: path.join(SCRATCH, 'derived') });
const guard = buildGuardTree({ outRoot: path.join(SCRATCH, 'guard') });
const l0 = buildLearn0Tree({ outRoot: path.join(SCRATCH, 'learn0') });
const rd = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const ADJ = new Map(); for (const e of EDGES) for (const [a, b] of [[Number(e.from), Number(e.to)], [Number(e.to), Number(e.from)]]) { if (!ADJ.has(a)) ADJ.set(a, new Set()); ADJ.get(a).add(b); }
const distFrom = (g) => { const d = new Map([[g, 0]]); const q = [g]; while (q.length) { const u = q.shift(); for (const v of ADJ.get(u) || []) if (!d.has(v)) { d.set(v, d.get(u) + 1); q.push(v); } } return d; };

// ============ S: static ============
{
  const d1 = git(['diff', '--name-only', C.RUNTIME.lastRuntimeChange, 'HEAD', '--', ...RT]), d2 = git(['diff', '--name-only', C.HEAD_COMMIT, 'HEAD', '--', ...RT]);
  check('S1.runtime-identical-at-952c9fc-0df804c-and-head', d1.status === 0 && d1.stdout.trim() === '' && d2.status === 0 && d2.stdout.trim() === ''
    && git(['rev-parse', 'HEAD:main.js']).stdout.trim() === C.RUNTIME.mainBlob && git(['rev-parse', 'HEAD:render']).stdout.trim() === C.RUNTIME.renderTree
    && git(['rev-parse', `${C.HEAD_COMMIT}:main.js`]).stdout.trim() === C.RUNTIME.mainBlob && git(['rev-parse', `${C.RUNTIME.lastRuntimeChange}:main.js`]).stdout.trim() === C.RUNTIME.mainBlob
    && git(['merge-base', '--is-ancestor', C.RUNTIME.designedOn, 'HEAD']).status === 0 && git(['merge-base', '--is-ancestor', C.HEAD_COMMIT, C.RUNTIME.designedOn]).status === 0, (d1.stdout + d2.stdout).slice(0, 200));
  const wt = git(['status', '--porcelain', '--untracked-files=no', '--', ...RT, 'experiments/gate-floor-spec', 'experiments/gate-floor-interaction', 'experiments/gate-floor-prodsem']);
  check('S1.production-and-frozen-study-files-untouched', wt.status === 0 && wt.stdout.trim() === '' && sha(fs.readFileSync(path.join(ROOT, 'main.js'))) === C.TREE.headMainSha256
    && git(['diff', '--name-only', '68e553e', 'HEAD', '--', 'experiments/gate-floor-spec']).stdout.trim() === '', wt.stdout.slice(0, 200));
  const m = l0.manifest.learn0;
  check('S2.fresh-build-equals-the-pinned-learn0-tree', m.mainSha256 === C.LEARN0_TREE.mainSha256 && m.planningSha256 === C.LEARN0_TREE.planningSha256 && m.baseGuardMainSha256 === C.LEARN0_TREE.baseGuardMainSha256
    && m.basePlanningSha256 === C.LEARN0_TREE.basePlanningSha256 && ORACLES.every(o => m.lineSha256[o] === C.LEARN0_TREE.lineSha256[o] && sha(LINES[o].line) === C.LEARN0_TREE.lineSha256[o])
    && sha(rd(guard.dir, 'main.js')) === C.GUARD_TREE.guardMainSha256, J(m).slice(0, 200));
  const gm = rd(guard.dir, 'main.js').split('\n'), lm = rd(l0.dir, 'main.js').split('\n'), gp = rd(guard.dir, 'render/planning.js').split('\n'), lp = rd(l0.dir, 'render/planning.js').split('\n');
  const added = (a, b) => b.filter(l => !a.includes(l));
  check('S2.exactly-four-lines-added-and-their-removal-restores-the-base', lm.length === gm.length + 3 && lp.length === gp.length + 1
    && J(added(gm, lm).sort()) === J(['goalDistance', 'canReachGoal', 'graphDiameter'].map(o => LINES[o].line).sort()) && J(added(gp, lp)) === J([LINES.futureScore.line])
    && lm.filter(l => !l.includes('__LEARN0__')).join('\n') === gm.join('\n') && lp.filter(l => !l.includes('__LEARN0__')).join('\n') === gp.join('\n'));
  check('S2.every-other-file-is-identical-to-the-guard-base', Object.entries(guard.manifest.files).every(([p, h]) => ['main.js', 'render/planning.js'].includes(p) || l0.manifest.files[p] === h)
    && Object.keys(l0.manifest.files).length === Object.keys(guard.manifest.files).length);
  const refuses = (f) => { try { f(); return false; } catch { return true; } };
  check('S2.transform-refuses-missing-duplicated-or-pre-tagged-anchors', refuses(() => transformFile('main.js', gm.join('\n').replace(LINES.goalDistance.anchor, 'function goalDistanceX() {')))
    && refuses(() => transformFile('main.js', gm.join('\n').replace(LINES.graphDiameter.anchor, LINES.graphDiameter.anchor + '\n' + LINES.graphDiameter.anchor))) && refuses(() => transformFile('main.js', lm.join('\n'))));
  const au = auditTree(l0.dir), table = loadTable();
  check('S3.map-knowledge-call-graph-audit-equals-the-classified-table', au.ok && au.sites === 46 && table.length === 46 && table.every(r => r.cls !== 'UNCLASSIFIED'), J(au.problems));
  check('S3.broader-graph-name-sweep-equals-its-reviewed-table-and-adds-no-map-route', au.sweepSites === 41 && loadSweep().length === 41 && loadSweep().every(r => !/ORACLE_CALL|UNCLASSIFIED/.test(r.cls)), J(au.sweepCounts));
  check('S3.oracle-classes-are-exactly-the-four-guarded-functions-and-their-call-sites', table.filter(r => r.cls === 'ORACLE_GUARDED').every(r => /canReachGoal|graphDiameter|goalDistance|hopDistancesFrom|futureScore/.test(r.fn))
    && table.filter(r => r.cls === 'ORACLE_CALL_SITE').every(r => /canReachGoal|futureScore|graphDiameter|goalDistance/.test(r.text)));
  check('S4.lastreasoning-invariant-holds-in-the-learn0-source', lastReasoningInvariant(lm.join('\n')).ok === true);
  const cal = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'calib_learn0_summary.json'), 'utf8')), ct = cal.contrasts, near = (a, b) => Math.abs(a - b) < 0.06;
  check('S5.declared-design', J(C.CELL_NAMES) === J(['N0', 'N1', 'N1E', 'N1Q', 'O0']) && C.TRAINING.map === 'off' && C.CELLS.find(c => c.name === 'O0').map === 'on' && C.CELLS.filter(c => c.name !== 'O0').every(c => c.map === 'off')
    && C.WORLD_START === 1672 && C.WORLDS_N === 360 && C.PER_GOAL === 90 && C.SESSIONS_PER_WORLD === 6 && J(C.SESSION_ACCOUNTING) === J({ training: 360, test: 1800, total: 2160 })
    && C.MARGIN.delta === 20 && C.PRIMARY_LEVEL === 0.95 && C.RESERVED.every(r => r.hi < C.WORLD_START) && C.blockOf(1671) === null && C.blockOf(1672) === 'L' && C.blockOf(2031) === 'L' && C.blockOf(2032) === null);
  check('S5.calibration-constants-match-the-recorded-development-evidence', cal.worlds === C.CALIBRATION.worlds && near(ct.E1_N1_minus_N0.mean, C.CALIBRATION.contrasts.E1_N1_minus_N0.mean) && near(ct.E1_N1_minus_N0.sd, C.CALIBRATION.contrasts.E1_N1_minus_N0.sd)
    && near(ct.dev_N1E_minus_N0.mean, C.CALIBRATION.contrasts.N1E_minus_N0.mean) && near(ct.dev_N1Q_minus_N0.mean, C.CALIBRATION.contrasts.N1Q_minus_N0.mean) && near(ct.S5_O0_minus_N0.mean, C.CALIBRATION.contrasts.S5_O0_minus_N0.mean)
    && cal.integrity.allMapAuditsOk && cal.integrity.allConditionOk && cal.integrity.deliveryExact);
  // sample size and operating characteristics: re-derived from the RAW development rows with exact quantiles (sizing.mjs), then compared
  // with config.mjs and with evidence/sizing_learn0.json (closed form identical; Monte Carlo through the analysis' bootstrap within 3 MC SE)
  const rowsDev = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'calib_learn0_rows.json'), 'utf8')).rows;
  const dd = Object.keys(rowsDev).sort((a, b) => a - b).map(w => rowsDev[w].cells.N1.legal - rowsDev[w].cells.N0.legal);
  const devSd = Math.sqrt(dd.reduce((s, x) => s + (x - dd.reduce((a, b) => a + b, 0) / dd.length) ** 2, 0) / (dd.length - 1));
  const cf = closedForm({ devSd, devN: dd.length, inflation: C.SIZING.inflation, delta: C.MARGIN.delta, n: C.WORLDS_N });
  const ev = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'sizing_learn0.json'), 'utf8'));
  const r2 = (x) => Math.round(x * 100) / 100;
  check('S5.sample-size-follows-the-programme-rule-recomputed-from-the-raw-rows', dd.length === 30 && Math.abs(devSd - C.SIZING.sd) < 0.05 && Math.abs(cf.z975 - 1.959964) < 1e-6 && Math.abs(cf.z80 - 0.841621) < 1e-6
    && cf.nRule.inflated === C.SIZING.nRequired && cf.nRule.development === 227 && C.SIZING.nRequired <= C.WORLDS_N && C.SIZING.nChosen === C.WORLDS_N
    && r2(cf.sdInterval95.lower) === C.SIZING.sdInterval95[0] && r2(cf.sdInterval95.upper) === C.SIZING.sdInterval95[1] && Math.round(cf.inflationOneSidedUcLevel * 1000) / 1000 === C.SIZING.inflationOneSidedUcLevel
    && Object.entries(C.SIZING.detectableAt80).every(([k, v]) => r2(cf.scenarios[k].detectableAt80) === v) && cf.nRule.intervalUpper === C.SIZING.alternativesNotAdopted.ruleAtSdIntervalUpper
    && cf.nForNoEffect80.inflated === C.SIZING.alternativesNotAdopted.noEffect80AtInflatedSd, J({ devSd, nRule: cf.nRule, sdI: cf.sdInterval95, uc: cf.inflationOneSidedUcLevel }));
  check('S5.the-rule-targets-effects-beyond-delta-a-true-effect-at-delta-is-inconclusive-for-every-n', Object.values(cf.atMarginForAnyN).every(p => Math.abs(p - 0.025) < 1e-6)
    && Math.abs(cf.scenarios.inflated.oc[40].LEARNS_WITHOUT_MAP - 0.806) < 0.001 && Math.abs(cf.scenarios.inflated.oc[0].NO_PRACTICAL_EFFECT - 0.612) < 0.001 && cf.scenarios.inflated.detectableAt80 > 2 * C.MARGIN.delta - 1);
  check('S5.sizing-evidence-equals-the-recomputation-and-the-monte-carlo-agrees', J(ev.closedForm) === J(cf) && ev.monteCarlo.replications >= 400 && ev.monteCarlo.n === C.WORLDS_N
    && ev.monteCarlo.maxAbsDeviationFromClosedForm <= 3 * ev.monteCarlo.mcStandardErrorAtHalf && r2(ev.sdBootstrapInterval.lower) === C.SIZING.sdBootstrapInterval95[0] && r2(ev.sdBootstrapInterval.upper) === C.SIZING.sdBootstrapInterval95[1],
    J({ mc: ev.monteCarlo.maxAbsDeviationFromClosedForm, boot: ev.sdBootstrapInterval }));
  const lit = (o = {}) => C.hashObject({ schema: C.SCHEMA, head: C.HEAD_COMMIT, runtime: C.RUNTIME, tree: C.TREE, guardTree: C.GUARD_TREE, learn0Tree: C.LEARN0_TREE, maps: C.MAPS, oracles: C.ORACLES,
    arms: C.CONFIRMATORY_ARMS, training: C.TRAINING, cells: C.CELLS, claims: C.CLAIMS, secondary: C.SECONDARY, secondaryPolicy: C.SECONDARY_POLICY, instruments: C.INSTRUMENTS, provenance: C.PROVENANCE,
    rules: C.RULES, margin: C.MARGIN, sizing: C.SIZING, level: C.PRIMARY_LEVEL,
    bootstrap: C.BOOTSTRAP, ticks: C.TICKS, worlds: { start: C.WORLD_START, n: C.WORLDS_N, perGoal: C.PER_GOAL, goals: C.GOALS }, accounting: C.SESSION_ACCOUNTING, calibration: C.CALIBRATION,
    configStart: C.CONFIG_START, hookStates: C.HOOK_STATES, confirmatoryState: C.CONFIRMATORY_STATE, classification: C.CLASSIFICATION, deviations: C.DEVIATIONS, ...o });
  check('S6.decision-digest-binds-the-declared-parameters', lit() === C.decisionDigest() && lit({ margin: { ...C.MARGIN, delta: 10 } }) !== C.decisionDigest() && lit({ worlds: { start: 1392, n: 360, perGoal: 90, goals: C.GOALS } }) !== C.decisionDigest()
    && lit({ cells: C.CELLS.slice(0, 2) }) !== C.decisionDigest() && lit({ learn0Tree: { ...C.LEARN0_TREE, mainSha256: 'x' } }) !== C.decisionDigest() && lit({ level: 0.9 }) !== C.decisionDigest() && /^[0-9a-f]{64}$/.test(C.designDigest()));
  const bad = [];
  for (const f of fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_learn0.mjs')) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Math\.random|performance\.now|Date\.now|new Date\(/.test(t)) bad.push(f + ': randomness or clock');
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(f + ': local absolute path');
    if (/globalThis\.lastReasoning\s*=[^=]|window\.(lastReasoning|recentMemory)\s*=[^=]/.test(t)) bad.push(f + ': writes runtime state');
  }
  check('S7.source-hygiene', bad.length === 0, bad.join('; '));
  const pr = spawnSync(process.execPath, [path.join(HERE, 'export_prereg.mjs'), '--check'], { encoding: 'utf8' });
  const preg = fs.existsSync(path.join(HERE, 'preregistration.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'preregistration.json'), 'utf8')) : null;
  check('S8.machine-readable-preregistration-is-current-and-bound-to-the-decision-digest', pr.status === 0 && !!preg && preg.digests.decision === C.decisionDigest() && preg.status === 'DESIGN_FOR_REVIEW' && preg.authorisation.confirmatoryRun === false, (pr.stdout + pr.stderr).trim());
}

// ============ session runner ============
const W = generateAcceptedStream(X1.CONFIG_START, 4);
const SESS = path.join(HERE, 'session.mjs');
function spawnSession(input, script = SESS, env = {}) {
  return new Promise((resolve) => { const c = spawn(process.execPath, [script, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } }); let so = '', se = '';
    c.stdout.on('data', d => { so += d; }); c.stderr.on('data', d => { se += d; }); c.on('close', (code) => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } resolve({ rec, code, err: se.slice(-400) }); }); });
}
async function runAll(jobs) { const out = new Array(jobs.length); let k = 0; await Promise.all(Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => { for (;;) { const i = k++; if (i >= jobs.length) return; out[i] = await spawnSession(jobs[i].input, jobs[i].script || SESS, jobs[i].env || {}); } })); return out; }
const ok = (x) => x && x.rec && !x.rec.outcome.crashed && x.rec.outcome.completed;
const baseIn = (w) => ({ world: w, configSeed: W[w].acceptedSeed, configIndex: W[w].acceptedConfigIndex, cond: 'P' });
const testIn = (w, extra = {}) => ({ ...baseIn(w), role: 'test', label: 'g', agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', ...extra });
const trainIn = (w, extra = {}) => ({ ...baseIn(w), role: 'train', label: 't', agentSeed: X1.trainSeed(w), ticks: 1500, map: 'off', ...extra });
const storeOf = (w) => path.join(SCRATCH, `T_w${w}.json`);
// phase 1: trainings (their exports feed the store cases)
const TRN = await runAll([1, 2].map(w => ({ input: { ...trainIn(w), tree: l0.dir, instrument: true, exportPath: storeOf(w), traceDiag: true } })));
const store = (w, arm) => ({ arm, brainPath: storeOf(w), brainWorld: w });
const JOBS = {};
const add = (k, input, script) => { JOBS[k] = { input, script }; };
for (const w of [1, 2]) {
  add(`w${w}.bareH`, { ...testIn(w), tree: bare.dir, map: 'on', instrument: false });
  add(`w${w}.bareD`, { ...testIn(w), tree: derived.dir, map: 'on', instrument: false });
  add(`w${w}.bareG`, { ...testIn(w), tree: guard.dir, map: 'on', instrument: false });
  add(`w${w}.bareL`, { ...testIn(w), tree: l0.dir, map: 'on', instrument: false });
  add(`w${w}.O0`, { ...testIn(w), tree: l0.dir, map: 'on', instrument: true, traceDiag: true });
  for (const [c, arm] of [['N0', 'COLD'], ['N1', 'FULL'], ['N1E', 'ONLY_episodes'], ['N1Q', 'ONLY_Q']]) add(`w${w}.${c}`, { ...testIn(w, arm === 'COLD' ? {} : store(w, arm)), tree: l0.dir, map: 'off', instrument: true, traceDiag: true });
}
add('w1.bareFULL', { ...testIn(1, store(1, 'FULL')), tree: bare.dir, map: 'on', instrument: false });
add('w1.onFULL', { ...testIn(1, store(1, 'FULL')), tree: l0.dir, map: 'on', instrument: true });
add('w1.N1again', { ...testIn(1, store(1, 'FULL')), tree: l0.dir, map: 'off', instrument: true, traceDiag: true });
const KEYS = Object.keys(JOBS);
console.log(`running ${KEYS.length + 2} development sessions on ${WORKERS} workers ...`);
const RES = Object.fromEntries((await runAll(KEYS.map(k => JOBS[k]))).map((r, i) => [KEYS[i], r]));
const R = (k) => RES[k] && RES[k].rec;
check('N0.every-development-session-completed', TRN.every(ok) && KEYS.every(k => ok(RES[k])), KEYS.filter(k => !ok(RES[k])).map(k => `${k}: ${RES[k].err.slice(-160)}`).join(' | ') + TRN.map(t => t.err).join(''));

// ============ N ============
{
  const bv = (r) => J([r.fingerprint, r.outcome.ticksExecuted, r.artifacts.cogDraws, r.artifacts.visDraws, r.artifacts.envCounters, r.artifacts.qSum, r.artifacts.qEntries, r.endHash]);
  const iv = (r) => J([r.artifacts.fingerprint, r.outcome.ticksExecuted, r.artifacts.cogDraws, r.artifacts.visDraws, r.artifacts.envCounters, r.artifacts.qSum, r.artifacts.qEntries, r.brain.endHash]);
  const why = [];
  for (const w of [1, 2]) { const ref = bv(R(`w${w}.bareH`)); for (const k of ['bareD', 'bareG', 'bareL']) if (bv(R(`w${w}.${k}`)) !== ref) why.push(`w${w} ${k}`); if (iv(R(`w${w}.O0`)) !== ref) why.push(`w${w} instrumented map-on`); }
  if (bv(R('w1.bareFULL')) !== iv(R('w1.onFULL'))) why.push('w1 store: instrumented map-on differs from bare HEAD');
  check('N1.bare-head-equals-derived-equals-guard-equals-learn0-bare-equals-instrumented-map-on', why.length === 0, why.join('; '));
  const offs = [...TRN.map(t => t.rec), ...[1, 2].flatMap(w => ['N0', 'N1', 'N1E', 'N1Q'].map(c => R(`w${w}.${c}`)))];
  check('N2.map-off-executes-zero-oracle-calls-in-every-role-and-arm', offs.every(r => r.map === 'off' && ORACLES.every(o => r.mapAudit.executed[o] === 0 && r.mapAudit.blocked[o] > 0) && r.mapAudit.ok));
  console.log('INFO N2 map-off minimum blocked count per oracle:', J(Object.fromEntries(ORACLES.map(o => [o, Math.min(...offs.map(r => r.mapAudit.blocked[o]))]))));
  const ons = [R('w1.O0'), R('w2.O0'), R('w1.onFULL')];
  console.log('INFO N2 map-on minimum executed count per oracle:', J(Object.fromEntries(ORACLES.map(o => [o, Math.min(...ons.map(r => r.mapAudit.executed[o]))]))));
  check('N2.map-on-executes-the-oracles-and-blocks-none', ons.every(r => r.map === 'on' && ORACLES.every(o => r.mapAudit.executed[o] > 0 && r.mapAudit.blocked[o] === 0) && r.mapAudit.ok));
  check('N3.map-off-changes-behaviour-and-the-store-changes-behaviour', R('w1.N0').artifacts.fingerprint !== R('w1.O0').artifacts.fingerprint && R('w1.N1').artifacts.fingerprint !== R('w1.N0').artifacts.fingerprint && R('w2.N0').artifacts.fingerprint !== R('w2.O0').artifacts.fingerprint);
  check('N4.deterministic', iv(R('w1.N1')) === iv(R('w1.N1again')) && J(R('w1.N1').moves) === J(R('w1.N1again').moves) && J(R('w1.N1').reaches) === J(R('w1.N1again').reaches));
  check('N4.condition-integrity-in-every-instrumented-session', [...offs, ...ons].every(r => r.conditionIntegrity.ok === true));
  const refuses = (o, env = {}) => { const r = spawnSync(process.execPath, [SESS, JSON.stringify(o)], { encoding: 'utf8', env: { ...process.env, ...env } }); return r.status !== 0 && /LEARN-0 session refused/.test(r.stderr); };
  const b = { ...testIn(1), tree: l0.dir, instrument: true };
  check('N5.refuses-map-on-training-unknown-arms-floor-and-bad-map', refuses({ ...trainIn(1), tree: l0.dir, map: 'on', instrument: true }) && refuses({ ...b, map: 'off', arm: 'SHAM' }) && refuses({ ...b, map: 'off', floor: 'on' })
    && refuses({ ...b, map: 'maybe' }) && refuses({ ...b, map: 'off', instrument: false }));
  check('N5.refuses-a-wrong-tree-a-wrong-seed-a-foreign-store-and-h1r', refuses({ ...b, tree: guard.dir, map: 'off' }) && refuses({ ...b, map: 'off', agentSeed: X1.testSeed(1) + 2 })
    && refuses({ ...b, map: 'off', ...store(1, 'FULL'), brainWorld: 2 }) && refuses({ ...b, map: 'off' }, { H1R: 'on' }) && refuses({ ...b, map: 'off' }, { M7_RUN_WARMSTORE: '1' }));
}

// ============ K: independent oracle-body probes, and candidate-level scope at the first decision ============
// Gate-only copy of the LEARN-0 tree: one probe line right AFTER each LEARN-0 guard (it runs only when the oracle body runs) and two
// recorder lines at the first decision.  The probe counts are independent of the guard's own accounting.
{
  const dir = path.join(SCRATCH, 'tree_trace'); fs.cpSync(l0.dir, dir, { recursive: true });
  const ANC_C = '  choices.push({\n    key: k,\n    weight: arbitratedScore\n  });', ANC_T = '    let finalWeight = 0;';
  let mt = rd(dir, 'main.js'), st = rd(dir, 'render/scoring.js'), pt = rd(dir, 'render/planning.js');
  if (mt.split(ANC_C).length !== 2 || st.split(ANC_T).length !== 2) throw new Error('trace anchors must match exactly once');
  const probe = (text, o) => { const L = LINES[o].line; if (text.split(L).length !== 2) throw new Error('guard line must occur once: ' + o); return text.replace(L, L + `\n    if (globalThis.__L0_BODY__) globalThis.__L0_BODY__('${o}'); // GATE-ONLY`); };
  for (const o of ['goalDistance', 'canReachGoal', 'graphDiameter']) mt = probe(mt, o);
  pt = probe(pt, 'futureScore');
  fs.writeFileSync(path.join(dir, 'main.js'), mt.replace(ANC_C, ANC_C + '\n  if (globalThis.__L0_CAND__) globalThis.__L0_CAND__(step, k, currentKey); // GATE-ONLY'));
  fs.writeFileSync(path.join(dir, 'render', 'planning.js'), pt);
  fs.writeFileSync(path.join(dir, 'render', 'scoring.js'), st.replace(ANC_T, '    if (globalThis.__L0_TERMS__) globalThis.__L0_TERMS__(TERMS); // GATE-ONLY\n' + ANC_T));
  let src = fs.readFileSync(SESS, 'utf8');
  const swap = (a, b2) => { if (src.split(a).length !== 2) throw new Error('trace driver anchor must match once: ' + a.slice(0, 50)); src = src.replace(a, b2); };
  swap("if (mainSha !== expectedMain) refuse(", "if (false) refuse(");
  swap("if (isLearn0 && planningSha !== LEARN0_TREE.planningSha256) refuse(", "if (false) refuse(");
  swap("  // the map switch\n", "  globalThis.__L0_BODYC__ = Object.fromEntries(ORACLES.map(o => [o, 0])); globalThis.__L0_BODY__ = (n) => { globalThis.__L0_BODYC__[n]++; };\n"
    + "  globalThis.__L0_FIRST__ = []; let _pend = null; globalThis.__L0_TERMS__ = (t) => { if (calls === 1) _pend = t.map(x => [x[0], x[1]]); }; globalThis.__L0_CAND__ = (s, k, from) => { if (calls === 1 && s === 0) globalThis.__L0_FIRST__.push({ k: Number(k), from: Number(from), terms: _pend }); _pend = null; };\n  // the map switch\n");
  swap("...(IN.traceDiag ? {", "first: globalThis.__L0_FIRST__, body: globalThis.__L0_BODYC__, ...(IN.traceDiag ? {");
  const ts = path.join(HERE, '.__l0_trace_session.mjs'); fs.writeFileSync(ts, src);
  let on, off, offFull, onFull;
  try {
    [on, off, offFull, onFull] = (await runAll([['on', {}], ['off', {}], ['off', store(1, 'FULL')], ['on', store(1, 'FULL')]].map(([m, s]) => ({ input: { ...testIn(1, s), tree: dir, map: m, instrument: true }, script: ts })))).map(x => x.rec);
  } finally { fs.rmSync(ts, { force: true }); }
  const runs = { on, off, offFull, onFull };
  console.log('INFO K oracle counts (guard executed / guard blocked / independent body):', J(Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, r && ORACLES.map(o => `${o} ${r.mapAudit.executed[o]}/${r.mapAudit.blocked[o]}/${r.body[o]}`)]))));
  check('K0.trace-runs-completed', Object.values(runs).every(r => r && r.outcome.completed && !r.outcome.crashed));
  check('K0.no-oracle-body-runs-with-the-map-off-independent-probe', [off, offFull].every(r => ORACLES.every(o => r.body[o] === 0)));
  check('K0.guard-accounting-equals-the-independent-body-count-with-the-map-on', [on, onFull].every(r => ORACLES.every(o => r.body[o] === r.mapAudit.executed[o]) && r.body.goalDistance > 0 && r.body.canReachGoal > 0));
  check('K0.the-map-off-guards-are-reached-cold-and-with-a-store', [off, offFull].every(r => r.mapAudit.blocked.goalDistance > 0 && r.mapAudit.blocked.canReachGoal > 0 && ORACLES.every(o => r.mapAudit.executed[o] === 0)));
  const goal = Number(W[1].goal), dist = distFrom(goal);
  const ORACLE_TERMS = ['goalGradientBoost', 'driveGoalBoost', 'futureBonus'];
  const byK = (r) => new Map(r.first.map(c => [c.k, c]));
  const A = byK(on), B = byK(off);
  check('K1.first-decision-traced-in-both-settings', on.first.length > 0 && off.first.length > 0 && on.first.every(c => Array.isArray(c.terms)) && off.first.every(c => Array.isArray(c.terms)));
  const extra = [...B.keys()].filter(k => !A.has(k)), missing = [...A.keys()].filter(k => !B.has(k));
  // canReachGoal(k, goal, 4) admits k iff a path of at most 3 edges exists: its depth test precedes its goal test (main.js:1153)
  check('K1.map-off-candidate-set-contains-map-on-and-every-extra-is-one-the-reachability-oracle-filters', missing.length === 0 && extra.every(k => !(dist.get(k) <= 3)) && [...A.keys()].every(k => dist.get(k) <= 3), J({ extra: extra.map(k => [k, dist.get(k)]), missing, on: [...A.keys()].map(k => [k, dist.get(k)]) }));
  const diffs = [];
  for (const [k, c] of A) { const d = B.get(k); if (!d) continue; const t1 = new Map(c.terms), t2 = new Map(d.terms);
    for (const [name, v] of t1) if (!ORACLE_TERMS.includes(name) && name !== 'drift' && Math.abs(v - t2.get(name)) > 1e-12) diffs.push(`${k}:${name} ${v} vs ${t2.get(name)}`); }
  check('K1.common-candidates-differ-only-in-the-oracle-derived-terms-and-drift', diffs.length === 0, diffs.slice(0, 6).join(', '));
  // drift = (liveRng() - 0.5) * curiosityState * 0.06 draws once per scored candidate (render/scoring.js:210): an extra candidate shifts the
  // live random stream, so the map-off drift sequence must START with the map-on sequence and be longer by exactly the extra candidates
  const dOn = on.first.map(c => new Map(c.terms).get('drift')), dOff = off.first.map(c => new Map(c.terms).get('drift'));
  check('K1.drift-differs-only-by-the-random-stream-shift-of-the-extra-candidates', dOff.length === dOn.length + extra.length && dOn.every((x, i) => x === dOff[i]) && dOn.some(x => x !== 0), J({ dOn, dOff }));
  const offTerms = off.first.map(c => [c.k, new Map(c.terms)]);
  check('K1.map-off-oracle-terms-are-neutral', offTerms.every(([k, t]) => t.get('futureBonus') === 0 && (k === goal || (t.get('goalGradientBoost') === 0 && t.get('driveGoalBoost') === 0))), J(offTerms.map(([k, t]) => [k, ORACLE_TERMS.map(n => t.get(n))])));
  check('K1.non-vacuous-the-map-on-oracle-terms-act', on.first.some(c => new Map(c.terms).get('goalGradientBoost') !== 0) && on.first.some(c => new Map(c.terms).get('futureBonus') !== 0), J(on.first.map(c => [c.k, ORACLE_TERMS.map(n => new Map(c.terms).get(n))])));
  console.log(`INFO K1 first decision: map on ${on.first.length} candidates, map off ${off.first.length} (extra ${extra.length}); goal ${goal}, from ${on.first[0].from} at true distance ${dist.get(on.first[0].from)}`);
}

// independent recomputation of the move counts from the raw arrival trace (the gate's own BFS and adjacency; legality from connections.json)
const recomputeMoves = (r) => {
  const goal = Number(r.input.goal), dist = distFrom(goal), out = { far: 0, farDownhill: 0, farUphill: 0, farFlat: 0, farChance: 0, farIllegal: 0, farLegal: 0, farLegalDownhill: 0, farLegalChance: 0, adjacent: 0, adjacentEnter: 0, adjacentChance: 0, unknownDistance: 0 };
  for (const x of r.trace.arrivals) {
    if (x.a === null || x.to === null || x.a === x.to || x.rFrom === x.rTo) continue;
    const da = dist.get(x.a), db = dist.get(x.to); if (da === undefined || db === undefined) { out.unknownDistance++; continue; }
    const nb = [...ADJ.get(x.a)], legal = ADJ.get(x.a).has(x.to);
    if (da >= 2) { const p = nb.filter(v => dist.get(v) < da).length / nb.length; out.far++; if (!legal) out.farIllegal++; if (db < da) out.farDownhill++; else if (db > da) out.farUphill++; else out.farFlat++; out.farChance += p;
      if (legal) { out.farLegal++; if (db < da) out.farLegalDownhill++; out.farLegalChance += p; } }
    else if (da === 1) { out.adjacent++; if (x.to === goal) out.adjacentEnter++; out.adjacentChance += 1 / nb.length; }
  }
  return out;
};
const sameMoves = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 1e-9);

// ============ D: measurement and delivery ============
{
  const traced = KEYS.filter(k => R(k) && R(k).trace).map(k => [k, R(k)]);
  const mis = traced.filter(([, r]) => !sameMoves(recomputeMoves(r), r.moves));
  check('D1.move-direction-counts-recompute-independently-from-the-raw-trace', traced.length >= 10 && mis.length === 0, mis.map(([k]) => k).join());
  check('D1.measurement-is-non-vacuous-and-bounded', traced.every(([, r]) => r.moves.far > 100 && r.moves.farLegal > 50 && r.moves.farLegal + r.moves.farIllegal === r.moves.far && r.moves.adjacent > 10
    && r.moves.farChance <= r.moves.far && r.moves.farLegalChance <= r.moves.farLegal && r.moves.adjacentChance <= r.moves.adjacent && r.moves.unknownDistance === 0));
  const all = [...KEYS.filter(k => R(k) && !R(k).bare).map(k => R(k)), ...TRN.map(t => t.rec)];
  check('D2.reach-accounting-identities', all.every(r => r.audit.reachesEqualLegalPlusNonEdge && r.reaches.legalHalves[0] + r.reaches.legalHalves[1] === r.reaches.legal && r.audit.arrivalsAtMostCalls));
  const exp = JSON.parse(fs.readFileSync(storeOf(1), 'utf8'));
  const { componentHashes } = await import(pathToFileURL(path.join(ROOT, 'experiments', 'xfer1', 'brain.mjs')).href);
  const H = componentHashes(exp), comps = X1.COMPONENTS;
  const N1 = R('w1.N1'), N1E = R('w1.N1E'), N1Q = R('w1.N1Q'), N0 = R('w1.N0');
  check('D3.store-delivery-is-exact-per-component', comps.every(c => N1.brain.start.hashes[c] === H[c]) && N1E.brain.start.hashes.episodes === H.episodes && comps.filter(c => c !== 'episodes').every(c => N1E.brain.start.sizes[c] === 0)
    && N1Q.brain.start.hashes.Q === H.Q && comps.filter(c => c !== 'Q').every(c => N1Q.brain.start.sizes[c] === 0) && comps.every(c => N0.brain.start.sizes[c] === 0) && N0.brain.deliveredHash === 'none');
}

// ============ R: residual map information in the delivered store (I7, provenance.mjs) ============
// Blocking the four oracle bodies does not by itself show that the STORE carries no map knowledge.  Every relational entry of a real T
// export must be a lag-1/lag-2 pair of T's own position sequence; injected pairs the agent never traversed must be flagged.
{
  const res = [1, 2].map((w, i) => { const brain = JSON.parse(fs.readFileSync(storeOf(w), 'utf8')), arrivals = TRN[i].rec.trace.arrivals; return { w, brain, arrivals, p: provenance(brain, arrivals, ADJ, { maxLag: C.PROVENANCE.maxLag }) }; });
  console.log('INFO R provenance:', J(res.map(x => ({ w: x.w, ok: x.p.ok, off: x.p.offCount, coverage: x.p.coverage }))));
  check('R1.every-relational-store-entry-lies-on-the-trainings-own-trajectory', res.every(x => x.p.ok && x.p.offCount === 0 && Object.keys(x.p.byComponent).length === 8), J(res.map(x => x.p.offTrajectory)));
  check('R1.the-rule-is-non-vacuous-it-excludes-ordered-pairs-the-agent-did-not-traverse', res.every(x => x.p.coverage.excludedOrderedPairs >= 50 && x.p.coverage.trajectoryPairs < x.p.coverage.orderedPairs));
  check('R1.lag-two-is-needed-the-runtimes-lagged-credit-is-in-the-real-store', res.every(x => provenance(x.brain, x.arrivals, ADJ, { maxLag: 1 }).ok === false));
  const nodes = [...ADJ.keys()], pick = [];
  for (const x of res) {
    const t = trajectoryPairs(positionSequence(x.arrivals), C.PROVENANCE.maxLag);
    const edge = nodes.flatMap(u => [...ADJ.get(u)].map(v => [u, v])).find(([u, v]) => !t.has(`${u}->${v}`));
    const far = nodes.flatMap(u => nodes.map(v => [u, v])).find(([u, v]) => u !== v && !ADJ.get(u).has(v) && !t.has(`${u}->${v}`));
    if (edge && far) { pick.push({ x, edge, far }); break; }
  }
  check('R2.a-world-with-an-untraversed-edge-and-an-untraversed-far-pair-exists-so-the-injection-mutants-are-non-vacuous', pick.length === 1);
  if (pick.length) {
    const { x, edge: [eu, ev2], far: [fu, fv] } = pick[0], goal = TRN[res.indexOf(x)].rec.input.goal, flagged = (b) => provenance(b, x.arrivals, ADJ, { maxLag: C.PROVENANCE.maxLag }).ok === false;
    const inj = (f) => { const b = clone(x.brain); f(b); return b; };
    mutant('RM1.an-untraversed-graph-edge-injected-into-transitions-is-flagged', flagged(inj(b => { (b.transitions[eu] = b.transitions[eu] || {})[ev2] = 9; })));
    mutant('RM2.an-untraversed-far-pair-injected-into-goal-keyed-Q-is-flagged', flagged(inj(b => { b.Q[`${fu}#${goal}->${fv}`] = 3; })));
    mutant('RM3.a-dump-of-every-graph-edge-into-signals-is-flagged', flagged(inj(b => { for (const u of nodes) for (const v of ADJ.get(u)) b.signals[`${u}->${v}`] = 1; })));
    mutant('RM4.an-injected-episode-crossing-an-untraversed-pair-is-flagged', flagged(inj(b => { b.episodes.push({ id: 'injected', nodes: [fu, fv] }); })));
  }
}

// ============ A: analysis fixtures ============
const WS = C.WORLD_START;
const okIntegrity = () => ({ cond: 'P', hooks: { arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off', passEnv: false }, envDraws: 0, envAttempts: 0, envSlips: 0, drawsLogged: 0, harnessAttempts: 0, harnessSlips: 0,
  creditKeys: 0, creditRejected: 0, peLaCalls: 0, peDampCalls: 0, traversal: { attempts: 900, successes: 900, edgesObserved: 60, edgesWithSlip: 0, maxCostEstimate: 1 }, episodeCapArmed: true, replayDeterministic: true, ok: true });
const COMPS = X1.COMPONENTS;
const baseTable = { N0: 0, N1: 0, N1E: 50, N1Q: -45, O0: 130 };
const mkBlock = ({ table = baseTable, n = 40, sd = 12, seed = 7, tweak = null } = {}) => {
  const r = prng(seed), noise = () => (r() + r() + r() - 1.5) * sd * 1.6;
  const records = new Map(), trainRecords = new Map(), controls = {}, worldsPlan = [], valid = [];
  for (let i = 0; i < n; i++) {
    const world = WS + i, goal = goalOfIndex(world); worldsPlan.push({ world, goal }); valid.push(world);
    const hashes = Object.fromEntries(COMPS.map(c => [c, `${c}-${world}`]));
    controls[world] = { trainLabel: trainLabel(world), storeHashes: hashes, endHash: `end-${world}`, sizes: Object.fromEntries(COMPS.map(c => [c, 10])), trainingMap: 'off', trainingLegal: 200, trainingNonGraph: 50,
      provenance: { ok: true, offCount: 0, maxLag: C.PROVENANCE.maxLag } };
    const oracle = (map) => ({ setting: map, executed: Object.fromEntries(C.ORACLES.map(o => [o, map === 'on' ? 1000 : 0])), blocked: Object.fromEntries(C.ORACLES.map(o => [o, map === 'off' ? 1000 : 0])), ok: true });
    trainRecords.set(trainLabel(world), { role: 'train', map: 'off', outcome: { crashed: false, completed: true }, tree: { learn0: true, mainSha256: C.LEARN0_TREE.mainSha256, planningSha256: C.LEARN0_TREE.planningSha256 },
      input: { agentSeed: C.trainSeed(world), acceptedConfigSeed: 300000 + world }, conditionIntegrity: okIntegrity(), mapAudit: oracle('off'), brain: { endHash: `end-${world}` } });
    const lvl = 250 + noise() * 2;
    for (const cell of C.CELLS) {
      const legal = Math.max(1, Math.round(lvl + table[cell.name] + noise())), nonEdge = cell.arm === 'FULL' ? 230 : 95;
      const keep = X1.ARMS[cell.arm].keep;
      records.set(testLabel(cell.name, world), { role: 'test', bare: false, map: cell.map, outcome: { crashed: false, completed: true }, tree: { learn0: true, mainSha256: C.LEARN0_TREE.mainSha256, planningSha256: C.LEARN0_TREE.planningSha256 },
        input: { agentSeed: C.testSeed(world), acceptedConfigSeed: 300000 + world, arm: cell.arm, goal }, conditionIntegrity: okIntegrity(), mapAudit: oracle(cell.map),
        endpoints: { goalReaches: legal + nonEdge, legalReaches: legal, attemptSuccess: null }, reaches: { goal: legal + nonEdge, legal, nonEdge, legalHalves: [Math.floor(legal / 2), legal - Math.floor(legal / 2)] },
        audit: { goalReaches: legal + nonEdge, legalReaches: legal, nonEdgeReaches: nonEdge, reachesEqualLegalPlusNonEdge: true, arrivalsAtMostCalls: true },
        brain: { deliveredHash: cell.arm === 'COLD' ? 'none' : 'x', deliveredHashes: cell.arm === 'COLD' ? null : Object.fromEntries(COMPS.map(c => [c, keep.includes(c) ? hashes[c] : 'absent'])),
          start: { hashes: Object.fromEntries(COMPS.map(c => [c, keep.includes(c) ? hashes[c] : 'empty'])), sizes: Object.fromEntries(COMPS.map(c => [c, keep.includes(c) ? 10 : 0])) }, goalKeyedQ: 50 },
        moves: { far: 900, farDownhill: 540, farChance: 410, farLegal: 800, farLegalDownhill: 480, farLegalChance: 360, adjacent: 400, adjacentEnter: 270, adjacentChance: 100 }, diag: { illegalExecuted: 150 }, guard: { counters: { admitted: 1700 } } });
    }
  }
  const plan = { block: 'L', worlds: worldsPlan, validWorlds: valid, exclusions: [] };
  if (tweak) tweak({ records, trainRecords, controls, plan });
  return { records, trainRecords, plan, controls };
};
const tb = (p) => ({ ...baseTable, ...p });
const FX = { clean: () => mkBlock(), learns: () => mkBlock({ table: tb({ N1: 45 }) }), harms: () => mkBlock({ table: tb({ N1: -45 }) }), wide: () => mkBlock({ table: tb({ N1: 18 }), sd: 40, n: 24 }) };
{
  const o = evaluateBlock(FX.clean());
  check('A1.clean-block-valid-and-labelled', o.valid && o.labels.E1 === 'NO_PRACTICAL_EFFECT' && Math.abs(o.primary.E1.legal.mean) < 8 && o.level === 0.95 && /SAME world and goal/.test(o.verdict) && /not transfer, recall, planning/.test(o.verdict), J(o.problems).slice(0, 300));
  check('A1.secondary-components-oracle-and-non-graph-are-reported', Math.abs(o.secondary.S6.N1E_minus_N0.mean - 50) < 8 && Math.abs(o.secondary.S6.N1Q_minus_N0.mean + 45) < 8 && Math.abs(o.secondary.S5.O0_minus_N0.mean - 130) < 8
    && Math.abs(o.secondary.S1.nonGraph.mean - 135) < 1e-9 && Object.keys(o.byGoal).length === 4);
  // multiplicity: the secondaries carry no label and no claim, the verdict names no component result, and the declared interval count is the produced one
  const strong = evaluateBlock(mkBlock({ table: tb({ N1E: 90, N1Q: -90 }) }));
  check('A1.secondaries-are-exploratory-no-label-no-claim-and-the-interval-count-is-disclosed', o.secondary.S6.labels === undefined && !/LEARNS|HARMS|NO_PRACTICAL/.test(J(o.secondary)) && !/LEARNS|HARMS|NO_PRACTICAL/.test(J(o.byGoal))
    && o.secondaryPolicy.produced === C.SECONDARY_POLICY.intervals && C.SECONDARY_POLICY.intervals === 28 && /total effect of the whole store/.test(o.verdict) && /exploratory and supports no claim/.test(o.verdict)
    && strong.labels.E1 === o.labels.E1 && !/episod|component.*(raise|lower)/i.test(strong.verdict.replace('components included', '')), J(o.secondaryPolicy));
  const L = (fx) => evaluateBlock(fx()).labels.E1;
  check('A2.primary-labels', L(FX.learns) === 'LEARNS_WITHOUT_MAP' && L(FX.harms) === 'EXPERIENCE_HARMS_WITHOUT_MAP' && L(FX.wide) === 'INCONCLUSIVE');
  const sens = evaluateBlock(mkBlock({ table: tb({ N1: 24 }), sd: 10 }));
  check('A2.sensitivity-at-15-and-30-is-reported-and-not-decisive', sens.primary.E1.sensitivity.delta15 !== undefined && sens.primary.E1.sensitivity.delta30 !== undefined && sens.labels.E1 === C.classifyE1(sens.primary.E1.legal.ci, 20));
  const bad = {
    leak: mkBlock({ tweak: ({ records }) => { records.get(testLabel('N0', WS + 3)).mapAudit.executed.goalDistance = 4; } }),
    trainLeak: mkBlock({ tweak: ({ trainRecords }) => { trainRecords.get(trainLabel(WS + 3)).mapAudit.executed.canReachGoal = 1; } }),
    store: mkBlock({ tweak: ({ records }) => { const r = records.get(testLabel('N1', WS + 2)); r.brain.deliveredHashes.Q = 'other'; } }),
    omitted: mkBlock({ tweak: ({ records }) => { records.get(testLabel('N1E', WS + 2)).brain.start.sizes.Q = 7; } }),
    seed: mkBlock({ tweak: ({ records }) => { records.get(testLabel('O0', WS + 2)).input.agentSeed += 2; } }),
    undeclared: mkBlock({ tweak: ({ records }) => { records.set(`l0-N2-w${WS + 2}`, clone(records.get(testLabel('N1', WS + 2)))); } }),
    mapMismatch: mkBlock({ tweak: ({ records }) => { const r = records.get(testLabel('N0', WS + 2)); r.map = 'on'; r.mapAudit = { ...r.mapAudit, setting: 'on' }; } }),
    cond: mkBlock({ tweak: ({ records }) => { records.get(testLabel('N1', WS + 2)).conditionIntegrity.envDraws = 3; } }),
    tree: mkBlock({ tweak: ({ records }) => { records.get(testLabel('N1Q', WS + 2)).tree.planningSha256 = 'x'; } }),
    excl: mkBlock({ tweak: ({ plan }) => { plan.exclusions = plan.worlds.slice(0, 5).map(w => ({ world: w.world, reason: 'x' })); } }),
    noTrain: mkBlock({ tweak: ({ trainRecords }) => { trainRecords.delete(trainLabel(WS + 4)); } }),
    prov: mkBlock({ tweak: ({ controls }) => { controls[WS + 5].provenance = { ok: false, offCount: 3, maxLag: C.PROVENANCE.maxLag }; } }),
    noProv: mkBlock({ tweak: ({ controls }) => { delete controls[WS + 6].provenance; } }),
  };
  const ev = Object.fromEntries(Object.entries(bad).map(([k, b]) => [k, evaluateBlock(b)]));
  const has = (k, re) => re.test(ev[k].problems.join(' | ')) || (k === 'excl' && !ev[k].valid);
  check('A3.invalid-blocks-are-refused-with-the-reason', Object.values(ev).every(x => !x.valid) && has('leak', /ORACLE LEAK/) && has('trainLeak', /training: ORACLE LEAK/) && has('store', /Q delivered differs/) && has('omitted', /omitted component Q/)
    && has('seed', /test seed/) && has('undeclared', /undeclared cell/) && has('mapMismatch', /declared off/) && has('cond', /envDraws is 3/) && has('tree', /pinned LEARN-0 tree/) && has('excl', /./) && has('noTrain', /no training record/)
    && has('prov', /store provenance failed/) && has('noProv', /store provenance failed or was not checked/),
    Object.entries(ev).map(([k, x]) => `${k}:${x.problems[0]}`).join(' | '));
  check('A4.digests-bound', o.designDigest === C.designDigest() && o.decisionDigest === C.decisionDigest());
}

// ============ P: plan, freshness, power ============
{
  const idx = blockIndices(), worlds = idx.map(i => ({ world: i, configSeed: 900000000 + i, configIndex: i, goal: goalOfIndex(i) }));
  const S = planSessions(worlds);
  check('P1.exact-session-accounting', S.length === 2160 && S.filter(s => s.phase === 'train').length === 360 && S.filter(s => s.phase === 'test').length === 1800 && C.CELL_NAMES.every(c => S.filter(s => s.cell === c).length === 360));
  check('P1.every-world-has-one-map-off-training-and-five-cells-with-its-own-seeds', worlds.every(w => { const m = S.filter(s => s.world === w.world); const t = m.filter(s => s.phase === 'train');
    return m.length === 6 && t.length === 1 && t[0].map === 'off' && t[0].agentSeed === C.trainSeed(w.world) && m.filter(s => s.phase === 'test').every(s => s.agentSeed === C.testSeed(w.world) && s.map === C.CELLS.find(c => c.name === s.cell).map && s.arm === C.CELLS.find(c => c.name === s.cell).arm && (s.arm === 'COLD') === (s.store === null)); })
    && new Set(S.map(s => s.label)).size === S.length);
  check('P2.goals-balanced-ninety-each-by-the-index-rule', C.GOALS.every(g => worlds.filter(w => w.goal === g).length === 90) && idx[0] === 1672 && idx[idx.length - 1] === 2031);
  check('P2.block-disjoint-from-every-reserved-block', idx.every(i => C.RESERVED.every(r => i < r.lo || i > r.hi)) && C.RESERVED.some(r => r.lo === 1392 && r.hi === 1671));
  const seeds = idx.flatMap(i => [C.trainSeed(i), C.testSeed(i)]);
  check('P2.agent-seeds-fresh-and-inside-the-domain', new Set(seeds).size === seeds.length && seeds.every(s => s > C.testSeed(1671) && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi
    && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength) && C.seedOk(s).ok));
  console.log('INFO P: the configuration seeds of block L are generated at the freeze milestone (orchestrate.mjs extends the stream); none is generated here');
}

// ============ O: orchestrator plumbing (development worlds 0-1) ============
{
  const sel = path.join(fs.realpathSync.native(os.tmpdir()), `l0-selftest-${process.pid}`);
  fs.rmSync(sel, { recursive: true, force: true });
  const r = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--selftest', '--out', sel, '--workers', String(WORKERS)], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const man = fs.existsSync(path.join(sel, 'MANIFEST.json')) ? JSON.parse(fs.readFileSync(path.join(sel, 'MANIFEST.json'), 'utf8')) : null;
  check('O1.selftest-ran-two-worlds-x-six-sessions-without-exclusion', r.status === 0 && !!man && Object.keys(man.sessions).length === 12 && man.exclusions === 0 && /planned sessions 12 \(2 training \+ 10 test\)/.test(r.stdout), (r.stderr || r.stdout).slice(-300));
  if (man) {
    const { digest, ...rest } = man;
    const plan = JSON.parse(fs.readFileSync(path.join(sel, 'plan.json'), 'utf8')), ctl = JSON.parse(fs.readFileSync(path.join(sel, 'controls.json'), 'utf8'));
    check('O1.manifest-binds-plan-controls-sessions-tree-and-driver', C.hashObject(rest) === digest && C.hashObject(plan) === man.planSha256 && C.hashObject(ctl.controls) === man.controlsSha256
      && Object.entries(man.sessions).every(([f, h]) => sha(fs.readFileSync(path.join(sel, 'sessions', f))) === h) && man.driverSha256 === sha(fs.readFileSync(SESS)) && man.tree.mainSha256 === C.LEARN0_TREE.mainSha256 && man.selftest === true);
    const { loadBlock } = await import(pathToFileURL(path.join(HERE, 'analyze.mjs')).href);
    let refused = false; try { loadBlock(sel); } catch (e) { refused = /self-test/.test(e.message); }
    check('O1.the-analysis-refuses-a-selftest-block', refused);
    const records = new Map(), trainRecords = new Map();
    for (const f of Object.keys(man.sessions)) { const rec = JSON.parse(fs.readFileSync(path.join(sel, 'sessions', f), 'utf8')); (rec.role === 'train' ? trainRecords : records).set(f.replace(/\.json$/, ''), rec); }
    const o = evaluateBlock({ records, trainRecords, plan, controls: ctl.controls });
    check('O2.real-driver-records-pass-every-integrity-rule-of-the-analysis', o.valid === true && o.problemCount === 0, J(o.problems).slice(0, 300));
    check('O2.the-orchestrator-ran-the-provenance-check-before-the-tests', [0, 1].every(w => ctl.controls[w] && ctl.controls[w].provenance && ctl.controls[w].provenance.ok === true && ctl.controls[w].provenance.offCount === 0
      && ctl.controls[w].provenance.maxLag === C.PROVENANCE.maxLag), J([0, 1].map(w => ctl.controls[w] && ctl.controls[w].provenance)).slice(0, 300));
  }
  fs.rmSync(sel, { recursive: true, force: true });
}

// ============ M: mutants ============
{
  const copyTree = (tag, file, edit) => { const dir = path.join(SCRATCH, `mut_${tag}`); fs.cpSync(l0.dir, dir, { recursive: true }); const p = path.join(dir, file); fs.writeFileSync(p, edit(fs.readFileSync(p, 'utf8'))); return dir; };
  const unpinned = () => { const f = path.join(HERE, '.__l0_mut_session.mjs'); fs.writeFileSync(f, fs.readFileSync(SESS, 'utf8').replace("if (mainSha !== expectedMain) refuse(", "if (false) refuse(").replace("if (isLearn0 && planningSha !== LEARN0_TREE.planningSha256) refuse(", "if (false) refuse(")); return f; };
  const mutDriver = (tag, a, b) => { const s = fs.readFileSync(SESS, 'utf8'); if (!s.includes(a)) throw new Error(`mutant ${tag}: anchor missing`); const f = path.join(HERE, `.__l0_mut_${tag}.mjs`); fs.writeFileSync(f, s.replace(a, b)); return f; };
  const { oracleProblems } = await import(pathToFileURL(path.join(HERE, 'analyze.mjs')).href);
  const ref = R('w1.N0');
  const t1 = copyTree('m1', 'main.js', t => t.replace(LINES.goalDistance.line + '\n', ''));
  const t2 = copyTree('m2', 'main.js', t => t.replace(LINES.canReachGoal.line, LINES.canReachGoal.line.replace('return true;', 'return false;')));
  const t3 = copyTree('m3', 'render/planning.js', t => t.replace(LINES.futureScore.line + '\n', ''));
  const m3Static = auditTree(t3), m3Pin = sha(rd(t3, 'render/planning.js')) !== C.LEARN0_TREE.planningSha256;
  const un = unpinned();
  const d4 = mutDriver('m4', "if (NO_MAP) { oracle.blocked[name]++; return true; }", "if (NO_MAP) { return true; }");
  const d5 = mutDriver('m5', "const NO_MAP = IN.map === 'off';", "const NO_MAP = IN.map === 'on';");
  const d6 = mutDriver('m6', 'const downRate = nb.length ? nb.filter(v => DIST.get(v) < da).length / nb.length : 0;', 'const downRate = nb.length ? nb.filter(v => DIST.get(v) <= da).length / nb.length : 0;');
  let outs;
  try {
    outs = await runAll([
      { input: { ...testIn(1), tree: t1, map: 'off', instrument: true }, script: un }, { input: { ...testIn(1), tree: t2, map: 'off', instrument: true }, script: un }, { input: { ...testIn(1), tree: t3, map: 'off', instrument: true }, script: un },
      { input: { ...testIn(1), tree: l0.dir, map: 'off', instrument: true }, script: d4 }, { input: { ...testIn(1), tree: l0.dir, map: 'off', instrument: true }, script: d5 },
      { input: { ...testIn(1), tree: l0.dir, map: 'off', instrument: true, traceDiag: true }, script: d6 },
    ]);
  } finally { for (const f of fs.readdirSync(HERE)) if (f.startsWith('.__l0_mut')) fs.rmSync(path.join(HERE, f), { force: true }); }
  const [m1, m2, m3, m4, m5, m6] = outs.map(x => x.rec);
  mutant('M1.goaldistance-guard-removed-is-caught-by-the-oracle-audit-guard-never-reached', !!m1 && oracleProblems(m1, 'off').some(p => /never reached/.test(p)));
  mutant('M2.reachability-guard-with-the-wrong-neutral-value-changes-behaviour', !!m2 && m2.artifacts.fingerprint !== ref.artifacts.fingerprint);
  mutant('M3.futurescore-guard-removed-is-caught-by-the-oracle-audit-the-call-graph-audit-and-the-tree-pin', !!m3 && oracleProblems(m3, 'off').length > 0 && m3Static.ok === false && m3Static.problems.some(p => /futureScore/.test(p)) && m3Pin,
    J({ runtime: m3 && oracleProblems(m3, 'off'), static: m3Static.problems }).slice(0, 300));
  mutant('M4.blocking-without-counting-is-caught-by-the-oracle-audit', !!m4 && oracleProblems(m4, 'off').some(p => /never reached/.test(p)));
  mutant('M5.inverted-map-switch-is-caught-by-the-oracle-audit', !!m5 && oracleProblems(m5, 'off').length > 0);
  mutant('M6.wrong-chance-rate-is-caught-by-the-independent-recomputation', !!m6 && !sameMoves(recomputeMoves(m6), m6.moves) && Math.abs(recomputeMoves(m6).farLegalChance - m6.moves.farLegalChance) > 1e-9);
  // static audit mutants
  const a1 = copyTree('a1', 'main.js', t => t.replace('function runPrediction(startKey) {', 'function runPrediction(startKey) {\n  const _peek = (findNeuronById(startKey) || {}).userData && findNeuronById(startKey).userData.neighbors;'));
  mutant('M7.an-unlisted-graph-read-fails-the-call-graph-audit', auditTree(a1).ok === false);
  const a2 = copyTree('a2', 'main.js', t => t.replace(LINES.graphDiameter.line + '\n', ''));
  mutant('M8.a-missing-guard-fails-the-call-graph-audit', auditTree(a2).ok === false && auditTree(a2).problems.some(p => /graphDiameter/.test(p)));
  const a3 = copyTree('a3', 'render/scoring.js', t => t.replace('    let finalWeight = 0;', '    const _edges = (globalThis.connectionData || []).length;\n    let finalWeight = 0;'));
  mutant('M8b.an-unreviewed-graph-name-line-fails-the-broader-sweep', auditTree(a3).ok === false && auditTree(a3).problems.some(p => /unlisted graph-name line render\/scoring\.js/.test(p)), J(auditTree(a3).problems).slice(0, 200));
  // analysis / config mutants
  const loadMut = async (file, edits, tag) => { let t = fs.readFileSync(path.join(HERE, file), 'utf8'); for (const [a, b] of edits) { if (!t.includes(a)) throw new Error(`mutant ${tag}: pattern not found in ${file}`); t = t.replace(a, b); }
    t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`); const f = path.join(SCRATCH, `mut_${tag}_${file}`); fs.writeFileSync(f, t); return import(pathToFileURL(f).href); };
  const clone2 = (b) => ({ records: new Map([...b.records.entries()].map(([k, v]) => [k, clone(v)])), trainRecords: new Map([...b.trainRecords.entries()].map(([k, v]) => [k, clone(v)])), plan: clone(b.plan), controls: clone(b.controls) });
  const am = [
    ['M9.primary-uses-all-resets', 'analyze.mjs', [["const diff = (a, b, k = 'legal') =>", "const diff = (a, b, k = 'all') =>"]], FX.clean],
    ['M10.oracle-leak-check-removed', 'analyze.mjs', [["if (ex !== 0) p.push(`ORACLE LEAK", "if (false) p.push(`ORACLE LEAK"]], () => mkBlock({ tweak: ({ records }) => { records.get(testLabel('N0', WS + 3)).mapAudit.executed.goalDistance = 4; } })],
    ['M11.omitted-component-check-removed', 'analyze.mjs', [["else if (s.sizes[c] !== 0) p.push(`omitted component", "else if (false) p.push(`omitted component"]], () => mkBlock({ tweak: ({ records }) => { records.get(testLabel('N1E', WS + 2)).brain.start.sizes.Q = 7; } })],
    ['M12.undeclared-cell-check-removed', 'analyze.mjs', [["if (!m || !CELL[m[1]]) problems.push(", "if (false) problems.push("]], () => mkBlock({ tweak: ({ records }) => { records.set(`l0-N2-w${WS + 2}`, clone(records.get(testLabel('N1', WS + 2)))); } })],
    ['M13.pairing-check-removed', 'analyze.mjs', [["if (seeds.size !== 1 || [...seeds][0] !== C.testSeed(w)) problems.push(", "if (false) problems.push("]], () => mkBlock({ tweak: ({ records }) => { records.get(testLabel('O0', WS + 2)).input.agentSeed += 2; } })],
    ['M14.neutral-band-widened', 'config.mjs', [["if (ci.lower > -delta && ci.upper < delta) return 'NO_PRACTICAL_EFFECT';", "if (ci.lower > -2 * delta && ci.upper < 2 * delta) return 'NO_PRACTICAL_EFFECT';"]], () => mkBlock({ table: tb({ N1: 19 }), sd: 20 })],
    ['M15.margin-lowered', 'config.mjs', [["export const MARGIN = Object.freeze({ delta: 20,", "export const MARGIN = Object.freeze({ delta: 10,"]], () => mkBlock({ table: tb({ N1: 15 }), sd: 10 })],
    ['M16.store-provenance-check-removed', 'analyze.mjs', [["p.push('store provenance failed or was not checked (I7)');", 'void 0;']], () => mkBlock({ tweak: ({ controls }) => { controls[WS + 5].provenance = { ok: false, offCount: 3, maxLag: C.PROVENANCE.maxLag }; } })],
  ];
  const truth = (o) => (o.valid ? J([o.labels, o.primary.E1.legal.ci, o.secondaryPolicy.produced]) : 'INVALID');
  for (const [id, file, edits, fx] of am) {
    const tag = id.split('.')[0]; const mod = await loadMut(file, edits, tag); let fn = mod.evaluateBlock;
    if (file === 'config.mjs') { let a = fs.readFileSync(path.join(HERE, 'analyze.mjs'), 'utf8').replace("import * as C from './config.mjs';", `import * as C from '${pathToFileURL(path.join(SCRATCH, `mut_${tag}_config.mjs`)).href}';`);
      a = a.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`); const af = path.join(SCRATCH, `mut_${tag}_analyze_cfg.mjs`); fs.writeFileSync(af, a); fn = (await import(pathToFileURL(af).href)).evaluateBlock; }
    const b = fx(); mutant(id, truth(evaluateBlock(clone2(b))) !== truth(fn(clone2(b))), 'claims identical under the mutant');
  }
}

console.log(`\nLEARN-0 design gate: ${passed} checks passed, ${failed} failed; mutants ${caught} caught, ${missed} missed`);
fs.rmSync(SCRATCH, { recursive: true, force: true });
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }

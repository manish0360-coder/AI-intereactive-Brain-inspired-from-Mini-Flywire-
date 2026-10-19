// ==========================================================
// GATE-FLOOR-SCOPE (design C') — verification gate (design, driver, diagnostic and analysis integrity; prints NO confirmatory endpoint)
// ==========================================================
//   node experiments/gate-floor-spec/verify_gatefloorscope.mjs
// Sections
//   S  static     : audited source identity, frozen GATE-FLOOR-INTERACTION files untouched, the C' declarations bound into the digests, the guard
//                   tree pinned (unchanged), the S5 invariant, and the SOURCE FACTS the stale diagnostic relies on (pinned by content)
//   N  neutrality : bare HEAD == derived == guard tree (diag off) == guard tree (diag ON) == floor-armed-off; diag on == diag off for the mask and
//                   bundle settings and for both training regimes; the new driver == the frozen interaction driver (off / bundle / training);
//                   completeness and structure per setting; determinism; refusals
//   K  scope      : the mask setting's first candidate-level effect is a dropped non-graph candidate; the execution component's first effect
//                   is a blocked arrival (mask vs bundle identical before it)
//   D  diagnostic : accounting identities, an INDEPENDENT recomputation from the raw trace, adversarial synthetic cases, ground truths by
//                   construction (mask -> no fresh non-graph reset; bundle -> every block is a stale arrival; G store -> 0 EXECUTED pairs), non-vacuity
//   A  analysis   : labels, voiding, harm flags, stale readings, store flag, refusals and the decision table on exact fixtures
//   P  plan/power : the exact 1,680-session plan from the orchestrator (--plan-only), fresh worlds and seeds, stream seam, n from the calibration
//   O  plumbing   : orchestrator --selftest (XFER-1 dev worlds 0-1) end to end; its records pass the analysis' own integrity rules
//   M  mutants    : deliberately broken tree / driver / diagnostic / analysis / config must be caught (anti-vacuity)
// Every session runs on XFER-1 development worlds 0-3 (outside every study world); none is a confirmatory outcome.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateAcceptedStream } from '../m7/env.js';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import * as X1 from '../xfer1/config.mjs';
import { prng, mean } from '../xfer1/stats.mjs';
import { makeGraph, entryStore } from '../xfer2/controls.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';
import { buildHeadTree, runtimePaths, FLOOR_LINE, PROBE_LINE } from '../gate-floor-prodsem/transform.mjs';
import * as PC from '../gate-floor-prodsem/config.mjs';
import * as GI from '../gate-floor-interaction/config.mjs';
import { buildGuardTree, ADMIT_LINE, EXEC_LINE } from '../gate-floor-interaction/transform.mjs';
import { lastReasoningInvariant } from '../gate-floor-interaction/static_checks.mjs';
import * as C from './config.mjs';
import * as DG from './diag.mjs';
import { evaluateBlock } from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + detail)); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log((ok ? 'CAUGHT ' : 'MISSED ') + id + (ok || !detail ? '' : ' :: ' + detail)); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'gfs-verify-'));
const gitOut = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
const isRuntime = (p) => p === 'main.js' || p === 'connections.json' || p === 'neurons.json' || p === 'index.html' || p.startsWith('render/') || p.startsWith('instrumentation/') || p.startsWith('experiments/m7/');
const WORKERS = Math.max(2, Math.min(8, os.cpus().length - 1));

const bare = buildHeadTree({ derived: false });
const derived = buildHeadTree({ derived: true });
const guard = buildGuardTree();
const mainH = fs.readFileSync(path.join(bare.dir, 'main.js'), 'utf8');
const mainD = fs.readFileSync(path.join(derived.dir, 'main.js'), 'utf8');
const mainG = fs.readFileSync(path.join(guard.dir, 'main.js'), 'utf8');
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const g = makeGraph(EDGES);
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];
const ISEDGE = (a, b) => g.directed.has(`${a}->${b}`);
const GRAPH = DG.adjacency(EDGES);

// ============ S: static ============
const FROZEN_GI = ['config.mjs', 'session.mjs', 'transform.mjs', 'analyze.mjs', 'orchestrate.mjs', 'static_checks.mjs'].map(f => `experiments/gate-floor-interaction/${f}`);
export function designOk(K) {
  return K.CELLS.length === 4 && JSON.stringify(K.CELL_NAMES) === JSON.stringify(['U_off', 'U_mask', 'U_both', 'G_both']) && K.CELLS.every(c => ['U', 'G'].includes(c.store) && Object.prototype.hasOwnProperty.call(K.GUARD_SETTINGS, c.guard))
    && K.EXCLUDED_CELLS.every(x => !K.CELL_NAMES.includes(x)) && !Object.values(K.GUARD_SETTINGS).some(s => s.exec && !s.mask)
    && JSON.stringify(K.TRAININGS.map(t => [t.id, t.guard])) === JSON.stringify([['U', 'off'], ['G', 'both']])
    && K.SESSIONS_PER_WORLD === 6 && K.SESSION_ACCOUNTING.training === 560 && K.SESSION_ACCOUNTING.test === 1120 && K.SESSION_ACCOUNTING.total === 1680
    && K.WORLDS_N === 280 && K.PER_GOAL === 70 && K.WORLD_START === 1392 && K.WORLD_START === GI.BLOCKS.I.hi + 1 && K.MARGIN.delta === 20 && K.FAMILY_SIZE === 3
    && Math.abs(K.BOOT_FAMILY.level - (1 - 0.05 / 3)) < 1e-12 && K.BOOT_95.level === 0.95 && K.blockOf(1391) === null && K.blockOf(1392) === 'S' && K.blockOf(1671) === 'S' && K.blockOf(1672) === null;
}
{
  const hc = gitOut(['cat-file', '-t', C.HEAD_COMMIT]);
  check('S1.the-audited-commit-exists-and-is-an-ancestor-of-the-current-head', hc.status === 0 && hc.stdout.trim() === 'commit' && gitOut(['merge-base', '--is-ancestor', C.HEAD_COMMIT, 'HEAD']).status === 0);
  const rd = gitOut(['diff', '--name-only', C.HEAD_COMMIT, 'HEAD', '--', ...runtimePaths().filter(isRuntime)]);
  check('S1.no-runtime-file-changed-between-the-audited-commit-and-the-current-head', rd.status === 0 && rd.stdout.trim() === '', rd.stdout.trim().slice(0, 200));
  const wt = gitOut(['status', '--porcelain', '--untracked-files=no', '--', 'main.js', 'render', 'instrumentation', 'connections.json', 'neurons.json', 'index.html', 'experiments/m7', 'experiments/xfer1', 'experiments/xfer2',
    'experiments/gate-floor1', 'experiments/gate-floor-b2', 'experiments/gate-floor-head', 'experiments/gate-floor-prodsem', 'experiments/gate-floor-interaction', 'experiments/mcf1', 'experiments/registry']);
  check('S1.production-worktree-is-clean-and-no-earlier-study-file-is-modified', wt.status === 0 && wt.stdout.trim() === '', wt.stdout.trim().slice(0, 200));
  check('S1.working-tree-main-equals-the-audited-blob', sha(fs.readFileSync(path.join(ROOT, 'main.js'))) === C.TREE.headMainSha256 && gitOut(['rev-parse', C.HEAD_COMMIT + ':main.js']).stdout.trim() === C.TREE.headMainBlob);
  const fz = gitOut(['diff', '--name-only', '80f83ad3dcc3bd008c841ee712318280b5a5db66', 'HEAD', '--', ...FROZEN_GI]);
  check('S1.the-frozen-interaction-driver-transform-config-and-analysis-are-unchanged-since-their-freeze', fz.status === 0 && fz.stdout.trim() === '', fz.stdout.trim());
  check('S2.the-guard-tree-is-the-pinned-interaction-tree-unchanged', sha(mainG) === C.GUARD_TREE.guardMainSha256 && C.GUARD_TREE === GI.GUARD_TREE && sha(mainD) === C.TREE.derivedMainSha256 && sha(mainH) === C.TREE.headMainSha256
    && sha(ADMIT_LINE) === C.GUARD_TREE.admitLineSha256 && sha(EXEC_LINE) === C.GUARD_TREE.execLineSha256 && guard.manifest.gatefloorinteraction.mainSha256 === C.GUARD_TREE.guardMainSha256);
  check('S2.no-tree-transform-belongs-to-this-study', !fs.existsSync(path.join(HERE, 'transform.mjs')) && C.HEAD_COMMIT === PC.HEAD_COMMIT && C.TREE === PC.TREE && C.HOOK_STATES === PC.HOOK_STATES && C.CONFIRMATORY_STATE === 'P');
  check('S3.declared-design-is-c-prime', designOk(C), JSON.stringify(C.CELL_NAMES));
  check('S3.mandatory-limits-completeness-and-scope-are-declared', C.CLASSIFICATION === PC.CLASSIFICATION && C.DEVIATIONS === PC.DEVIATIONS && C.CLAIM_LIMITS === PC.CLAIM_LIMITS
    && /owner/.test(C.RULES.completeness) && /no statistical result decides it/.test(C.RULES.completeness) && /WITH the mask present/.test(C.RULES.scope) && /cause of the non-graph pairs/.test(C.RULES.scope)
    && C.CLAIMS.every(cl => cl.cells.every(c => C.CELL_NAMES.includes(c))));
  const lit = (o = {}) => C.hashObject({ schema: C.SCHEMA, head: C.HEAD_COMMIT, tree: C.TREE, guardTree: C.GUARD_TREE, guardSettings: C.GUARD_SETTINGS, trainings: C.TRAININGS, cells: C.CELL_NAMES,
    excludedCells: C.EXCLUDED_CELLS, claims: C.CLAIMS, secondary: C.SECONDARY, instruments: C.INSTRUMENTS, rules: C.RULES, margin: C.MARGIN, familySize: C.FAMILY_SIZE, flags: C.FLAGS, stale: C.STALE, bootstrap: C.BOOTSTRAP,
    outcome: C.OUTCOME, ticks: C.TICKS, tcFloor: C.TC_FLOOR, floorBase: C.FLOOR_BASE_VALUE, worlds: { start: C.WORLD_START, n: C.WORLDS_N, perGoal: C.PER_GOAL, goals: C.GOALS }, accounting: C.SESSION_ACCOUNTING,
    calibration: C.CALIBRATION, configStart: C.CONFIG_START, hookStates: C.HOOK_STATES, confirmatoryState: C.CONFIRMATORY_STATE, classification: C.CLASSIFICATION, deviations: C.DEVIATIONS, claimLimits: C.CLAIM_LIMITS, ...o });
  check('S4.decision-digest-binds-the-declared-parameters', lit() === C.decisionDigest() && lit({ margin: { delta: 25 } }) !== C.decisionDigest() && lit({ familySize: 2 }) !== C.decisionDigest()
    && lit({ cells: [...C.CELL_NAMES, 'U_exec'] }) !== C.decisionDigest() && lit({ stale: { ...C.STALE, supportShare: 0.5 } }) !== C.decisionDigest() && lit({ guardSettings: { ...C.GUARD_SETTINGS, exec: { mask: false, exec: true } } }) !== C.decisionDigest()
    && lit({ worlds: { start: 1000, n: 280, perGoal: 70, goals: C.GOALS } }) !== C.decisionDigest() && lit({ trainings: C.TRAININGS.slice(0, 1) }) !== C.decisionDigest() && lit({ confirmatoryState: 'E' }) !== C.decisionDigest());
  check('S4.design-digest-binds-the-schema', C.designDigest() !== C.decisionDigest() && /^[0-9a-f]{64}$/.test(C.designDigest()));
  const s5 = [['bare HEAD', mainH], ['PRODSEM derived', mainD], ['guard tree', mainG]].map(([n, t]) => [n, lastReasoningInvariant(t)]);
  check('S5.window-lastreasoning-is-never-cleared-in-the-pinned-sources', s5.every(([, r]) => r.ok && r.writes.length === 1 && r.writes[0].kind === 'assign' && r.writes[0].objectLiteral === true), s5.map(([n, r]) => `${n}: ${r.problems.join('; ')}`).join(' | '));
  // the source facts the diagnostic relies on (DESIGN.md section 6.1), pinned by content in the guard-tree main.js
  const L = mainG.split('\n'), cnt = (re) => L.filter(l => re.test(l)).length, idx = (s) => L.findIndex(l => l === s);
  const ie = L.indexOf(EXEC_LINE);
  check('S6.exec-site-reads-the-decision-record-and-is-followed-by-the-target-read', ie > 0 && L[ie + 1] === '  let nextStep = reasoning.to;' && L.slice(ie - 4, ie).includes('  const reasoning = window.lastReasoning;'));
  check('S6.the-move-site-uses-the-same-decision-record-exactly-once', cnt(/^\s*next = window\.lastReasoning\.to;\s*$/) === 1 && cnt(/^\s*agentCurrent = next;\s*$/) === 1 && L.findIndex(l => /^\s*next = window\.lastReasoning\.to;/.test(l)) > ie);
  const ra = idx('function runAgent() {');
  check('S6.call-boundary-hook-is-the-first-statement-of-runagent', ra > 0 && L.slice(ra + 1, ra + 8).find(l => /\S/.test(l) && !/^\s*\/\//.test(l)) === '  if (globalThis.__M7_TEL__) globalThis.__M7_TEL__.step();');
  const ip = L.indexOf(PROBE_LINE);
  check('S6.goal-reset-probe-precedes-the-restart-and-follows-the-buffer-clear', ip > 0 && L[ip + 1] === '    agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];' && L.slice(ip - 60, ip).includes('    window.recentMemory = [];'));
  check('S6.episode-path-buffer-is-the-global-and-has-one-push-and-one-mirror', cnt(/^(let|const|var)\s+recentMemory\b/) === 0 && cnt(/recentMemory\.push\(current\);/) === 1 && cnt(/^\s*window\.recentMemory = \[\.\.\.recentMemory\];\s*$/) === 1
    && cnt(/^\s*if \(recentMemory\.length > 6\) \{\s*$/) === 1 && DG.PATH_WINDOW === 6);
  check('S6.the-decision-record-is-written-only-at-step-zero-of-runprediction', /if \(step === 0\) \{\s*\n\s*window\.lastReasoning = \{\s*\n\s*from: currentKey,\s*\n\s*to: nextKey\s*\n\s*\};/.test(mainG));
  const bad = [];
  for (const f of fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_gatefloorscope.mjs')) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Math\.random|performance\.now/.test(t)) bad.push(f + ': ambient randomness or clock');
    if (/Date\.now|new Date\(/.test(t)) bad.push(f + ': wall clock');
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(f + ': sets a stage authorisation');
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(f + ': local absolute path');
    if (/globalThis\.lastReasoning\s*=[^=]|globalThis\.recentMemory\s*=[^=]|window\.(lastReasoning|recentMemory)\s*=[^=]/.test(t)) bad.push(f + ': writes runtime state the diagnostic must only read');
  }
  check('S7.source-hygiene-and-read-only-diagnostic', bad.length === 0, bad.join('; '));
}

// ============ session runner (parallel pool) ============
const WORLDS = generateAcceptedStream(X1.CONFIG_START, 4);
const SESS = path.join(HERE, 'session.mjs');
const GI_SESS = path.join(ROOT, 'experiments', 'gate-floor-interaction', 'session.mjs');
function spawnSession(input, script = SESS, env = {}) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [script, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
    let so = '', se = '';
    c.stdout.on('data', d => { so += d; }); c.stderr.on('data', d => { se += d; });
    c.on('close', (code) => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } resolve({ rec, code, err: se.slice(-400) }); });
  });
}
async function runAll(jobs) {
  const out = new Array(jobs.length); let k = 0;
  await Promise.all(Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => { for (;;) { const i = k++; if (i >= jobs.length) return; const j = jobs[i]; out[i] = await spawnSession(j.input, j.script || SESS, j.env || {}); } }));
  return out;
}
const ok = (x) => x && x.rec && !x.rec.outcome.crashed && x.rec.outcome.completed;
const testIn = (w, extra = {}) => ({ role: 'test', label: 'g', world: w, configSeed: WORLDS[w].acceptedSeed, configIndex: WORLDS[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', cond: 'P', ...extra });
const trainIn = (w, extra = {}) => ({ role: 'train', label: 't', world: w, configSeed: WORLDS[w].acceptedSeed, configIndex: WORLDS[w].acceptedConfigIndex, agentSeed: X1.trainSeed(w), ticks: 1500, cond: 'P', floor: 'off', ...extra });
const storeFile = path.join(SCRATCH, 'entry_w1.json');
fs.writeFileSync(storeFile, JSON.stringify({ episodes: entryStore(g, labelOf, WORLDS[1].goal) }));
const withStore = { arm: 'ONLY_episodes', brainPath: storeFile, brainWorld: 1 };
const bareView = (r) => ({ fp: r.fingerprint, ticks: r.outcome.ticksExecuted, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, env: r.artifacts.envCounters, qs: r.artifacts.qSum, qe: r.artifacts.qEntries, end: r.endHash });
const instView = (r) => ({ fp: r.artifacts.fingerprint, ticks: r.outcome.ticksExecuted, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, env: r.artifacts.envCounters, qs: r.artifacts.qSum, qe: r.artifacts.qEntries, end: r.brain.endHash });
// the full behavioural record compared for diagnostic neutrality: decisions, RNG draws, Q, end state, every reach, the guard counters and the floor
const behView = (r) => ({ ...instView(r), writes: r.artifacts.writesSha256, reaches: r.reaches, guard: r.guard.counters, floor: r.floor ? r.floor.counters : null, moves: r.moveClass, start: r.brain.start, endHashes: r.brain.endHashes });
const J = (o) => JSON.stringify(o);

// ---- one batch of every development session the N / K / D sections need ----
const JOBS = {};
const add = (key, input, script, env) => { JOBS[key] = { input, script, env }; };
for (const [tag, w, st] of [['w1', 1, {}], ['w2', 2, {}], ['w1s', 1, withStore]]) {
  const b = testIn(w, st);
  add(`${tag}.bareP`, { ...b, tree: bare.dir, floor: 'off', guard: 'off', instrument: false, diag: false });
  add(`${tag}.bareD`, { ...b, tree: derived.dir, floor: 'off', guard: 'off', instrument: false, diag: false });
  add(`${tag}.bareG`, { ...b, tree: guard.dir, floor: 'off', guard: 'off', instrument: false, diag: false });
  add(`${tag}.instD`, { ...b, tree: derived.dir, floor: 'off', guard: 'off', instrument: true, diag: false });
  add(`${tag}.offNoDiag`, { ...b, tree: guard.dir, floor: 'off', guard: 'off', instrument: true, diag: false, traceWrites: true });
  add(`${tag}.offDiag`, { ...b, tree: guard.dir, floor: 'off', guard: 'off', instrument: true, diag: true, traceDiag: true, traceWrites: true });
  add(`${tag}.armed`, { ...b, tree: guard.dir, floor: 'armedOff', guard: 'off', instrument: true, diag: true });
  for (const s of ['mask', 'both']) {
    add(`${tag}.${s}NoDiag`, { ...b, tree: guard.dir, floor: 'on', guard: s, instrument: true, diag: false, traceWrites: true });
    add(`${tag}.${s}Diag`, { ...b, tree: guard.dir, floor: 'on', guard: s, instrument: true, diag: true, traceDiag: true, traceWrites: true });
  }
  add(`${tag}.offFloorDiag`, { ...b, tree: guard.dir, floor: 'on', guard: 'off', instrument: true, diag: true, traceDiag: true, traceWrites: true });
}
add('w1s.bothDiag2', { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'both', instrument: true, diag: true, traceDiag: true, traceWrites: true });
for (const w of [1, 3]) for (const [k, s] of [['U', 'off'], ['G', 'both']]) {
  add(`train${k}${w}.noDiag`, { ...trainIn(w), tree: guard.dir, guard: s, instrument: true, diag: false });
  add(`train${k}${w}.diag`, { ...trainIn(w), tree: guard.dir, guard: s, instrument: true, diag: true, traceDiag: true });
}
// the frozen interaction driver on the same inputs (cross-driver regression)
add('gi.w1s.off', { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'off', instrument: true }, GI_SESS);
add('gi.w1s.on', { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'on', instrument: true }, GI_SESS);
add('gi.train1', { ...trainIn(1), tree: guard.dir, guard: 'off', instrument: true }, GI_SESS);
const KEYS = Object.keys(JOBS);
console.log(`running ${KEYS.length} development sessions on ${WORKERS} workers ...`);
const RES = Object.fromEntries((await runAll(KEYS.map(k => JOBS[k]))).map((r, i) => [KEYS[i], r]));
const R = (k) => RES[k] && RES[k].rec;
check('N0.every-development-session-completed', KEYS.every(k => ok(RES[k])), KEYS.filter(k => !ok(RES[k])).map(k => `${k}: ${RES[k].err.slice(-160)}`).join(' | '));

// ============ N: neutrality, cross-driver regression, structure, refusals ============
{
  let allOk = true; const why = [];
  for (const tag of ['w1', 'w2', 'w1s']) {
    const ref = J(bareView(R(`${tag}.bareP`)));
    if (J(bareView(R(`${tag}.bareD`))) !== ref) { allOk = false; why.push(`${tag}: derived-bare differs`); }
    if (J(bareView(R(`${tag}.bareG`))) !== ref) { allOk = false; why.push(`${tag}: guard-lines-present bare differs`); }
    for (const k of ['instD', 'offNoDiag', 'offDiag', 'armed']) if (J(instView(R(`${tag}.${k}`))) !== ref) { allOk = false; why.push(`${tag}: ${k} differs`); }
    const a = R(`${tag}.armed`); if (a.floor.counters.raised !== 0 || a.guard.counters.maskedOut !== 0 || a.guard.counters.blockedIllegal !== 0) { allOk = false; why.push(`${tag}: armed-off acted`); }
  }
  check('N1.bare-head-equals-derived-equals-guard-tree-off-equals-diagnostic-on-equals-floor-armed-off', allOk, why.join('; '));
  check('N1.the-diagnostic-observed-every-off-session-it-was-on-in', ['w1', 'w2', 'w1s'].every(t => R(`${t}.offDiag`).diag.arrivals.total > 1000 && R(`${t}.offDiag`).diag.accounting.ok === true));
  const pairs = [];
  for (const tag of ['w1', 'w2', 'w1s']) for (const s of ['mask', 'both']) pairs.push([`${tag}.${s}NoDiag`, `${tag}.${s}Diag`]);
  for (const w of [1, 3]) for (const k of ['U', 'G']) pairs.push([`train${k}${w}.noDiag`, `train${k}${w}.diag`]);
  const diffs = pairs.filter(([a, b]) => J(behView(R(a))) !== J(behView(R(b))));
  check('N2.diagnostic-on-equals-diagnostic-off-for-mask-bundle-and-both-training-regimes', diffs.length === 0, diffs.map(p => p.join(' vs ')).join('; '));
  check('N2.compared-record-covers-decisions-rng-draws-q-end-state-reaches-guard-and-floor', Object.keys(behView(R('w1s.bothDiag'))).join() === 'fp,ticks,cog,vis,env,qs,qe,end,writes,reaches,guard,floor,moves,start,endHashes');
  const giView = (r) => J({ ...instView(r), writes: r.artifacts.writesSha256, reaches: r.reaches, guard: r.guard.counters, floor: r.floor ? r.floor.counters : null, moves: r.moveClass });
  check('N3.new-driver-equals-the-frozen-interaction-driver-off-bundle-and-training', giView(R('gi.w1s.off')) === giView(R('w1s.offFloorDiag')) && giView(R('gi.w1s.on')) === giView(R('w1s.bothDiag')) && giView(R('gi.train1')) === giView(R('trainU1.diag'))
    && R('gi.w1s.on').guard.on === true && R('w1s.bothDiag').guard.exec === true);
  const both = ['w1', 'w2', 'w1s'].map(t => R(`${t}.bothDiag`)), mask = ['w1', 'w2', 'w1s'].map(t => R(`${t}.maskDiag`)), off = ['w1', 'w2', 'w1s'].map(t => R(`${t}.offFloorDiag`));
  check('N4.bundle-is-complete-0-non-graph-resets-decisions-admissions-and-illegal-executions', both.every(r => r.guardCompleteness.ok && r.reaches.nonEdge === 0 && r.moveClass.nonGraph === 0 && r.guard.counters.admitted === 0 && r.diag.illegalExecuted === 0 && r.guard.counters.blockedIllegal > 0));
  check('N4.mask-only-has-no-non-graph-decision-and-no-block-but-leaves-illegal-executions', mask.every(r => r.guardCompleteness.ok && r.moveClass.nonGraph === 0 && r.guard.counters.admitted === 0 && r.guard.counters.blockedIllegal === 0 && r.guard.counters.maskedOut > 0)
    && mask.some(r => r.diag.illegalExecuted > 0 && r.reaches.nonEdge > 0), 'the mask-only development sessions left nothing for the execution guard to do');
  check('N4.guard-off-is-inert-and-has-both-channels-to-remove', off.every(r => r.guardCompleteness.ok && r.guard.counters.maskedOut === 0 && r.guard.counters.blockedIllegal === 0) && off.some(r => r.moveClass.nonGraph > 0) && off.some(r => r.reaches.nonEdge > 0));
  const trG = [R('trainG1.diag'), R('trainG3.diag')], trU = [R('trainU1.diag'), R('trainU3.diag')];
  check('N4.guarded-training-is-complete-and-floor-off-legacy-training-unguarded', trG.every(r => r.guardCompleteness.ok && r.guardSetting === 'both' && r.floorMode === 'off' && r.floor === null && r.reaches.nonEdge === 0 && r.diag.illegalExecuted === 0)
    && trU.every(r => r.guardSetting === 'off' && r.guard.counters.maskedOut === 0 && r.guard.counters.blockedIllegal === 0));
  check('N4.bundle-is-deterministic', J(behView(R('w1s.bothDiag'))) === J(behView(R('w1s.bothDiag2'))) && J(R('w1s.bothDiag').diag) === J(R('w1s.bothDiag2').diag));
  // (with the pre-trained entry store the floor has nothing to raise, so raising is required only of the cold sessions: non-vacuity)
  check('N4.floor-audit-and-condition-integrity-hold-in-every-setting', [...both, ...mask, ...off].every(r => r.floor.counters.lowered === 0 && r.floor.counters.maxRaise <= 100 && r.conditionIntegrity.ok === true
    && Object.keys(r.floor.byEdge).every(k => { const [u, v] = k.split('->').map(Number); return v === r.input.goal && ISEDGE(u, v); }))
    && [...both, ...mask, ...off].filter(r => r.input.arm === 'COLD').every(r => r.floor.counters.raised > 0), J([...both, ...mask, ...off].map(r => [r.input.arm, r.floor.counters.raised, r.floor.counters.lowered])));
  // refusals (each fails before the runtime loads)
  const base = { ...testIn(1), tree: guard.dir, floor: 'on', instrument: true, diag: true };
  const refuses = (o, env = {}) => { const r = spawnSync(process.execPath, [SESS, JSON.stringify(o)], { encoding: 'utf8', env: { ...process.env, ...env } }); return r.status !== 0 && /GATE-FLOOR-SCOPE session refused/.test(r.stderr); };
  const { diag: _d, ...noDiag } = base;
  check('N5.refuses-an-execution-guard-only-setting-and-the-old-on-name', refuses({ ...base, guard: 'exec' }) && refuses({ ...base, guard: 'on' }) && refuses({ ...base, guard: 'armedOff' }));
  check('N5.refuses-mask-training-floor-training-and-a-missing-diagnostic-flag', refuses({ ...trainIn(1), tree: guard.dir, guard: 'mask', instrument: true, diag: true }) && refuses({ ...trainIn(1), tree: guard.dir, floor: 'on', guard: 'off', instrument: true, diag: true })
    && refuses({ ...noDiag, guard: 'off' }));
  check('N5.refuses-the-diagnostic-without-instrumentation-or-without-the-guard-tree', refuses({ ...base, guard: 'off', floor: 'off', instrument: false }) && refuses({ ...base, tree: derived.dir, guard: 'off' })
    && refuses({ ...base, guard: 'off', diag: false, traceDiag: true }));
  check('N5.refuses-a-wrong-seed-a-non-confirmatory-state-and-h1r-on', refuses({ ...base, guard: 'off', agentSeed: X1.testSeed(1) + 2 }) && refuses({ ...base, guard: 'off', cond: 'H' }) && refuses({ ...base, guard: 'off' }, { H1R: 'on' }));
}

// ============ K: component scope ============
{
  // execution component: mask vs bundle on the same input; nothing differs before the first blocked arrival
  const m = R('w1s.maskDiag'), b = R('w1s.bothDiag');
  const A = m.trace.arrivals, Bx = b.trace.arrivals;
  const firstBlock = Bx.findIndex(x => x.blocked);
  let firstDiff = -1; for (let i = 0; i < Math.min(A.length, Bx.length); i++) if (J({ ...A[i], blocked: false }) !== J({ ...Bx[i], blocked: false })) { firstDiff = i; break; }
  const wm = m.artifacts.writes, wb = b.artifacts.writes, callOfBlock = firstBlock >= 0 ? Bx[firstBlock].call : -1;
  let firstWriteDiff = -1; for (let i = 0; i < Math.min(wm.length, wb.length); i++) if (wm[i] !== wb[i]) { firstWriteDiff = i; break; }
  check('K1.execution-component-acts-and-its-first-action-is-a-blocked-illegal-arrival', firstBlock >= 0 && Bx[firstBlock].legal === false && !ISEDGE(Bx[firstBlock].a, Bx[firstBlock].to));
  check('K1.mask-and-bundle-arrival-streams-are-identical-up-to-the-first-block', firstBlock >= 0 && firstDiff >= firstBlock && J(A.slice(0, firstBlock)) === J(Bx.slice(0, firstBlock)), JSON.stringify({ firstBlock, firstDiff }));
  // every call up to and including the first blocked one made its decision before any difference; each FRESH arrival is at least one decision
  const freshUpTo = Bx.filter(x => x.call <= callOfBlock && x.fresh).length;
  check('K1.decision-streams-are-identical-up-to-the-call-of-the-first-block', callOfBlock >= 0 && freshUpTo > 0 && (firstWriteDiff === -1 || firstWriteDiff >= freshUpTo), JSON.stringify({ callOfBlock, firstWriteDiff, freshUpTo }));
  // mask component: candidate-level scope of the MASK setting (the admission line), on a gate-only candidate-tracing tree
  const CAND_ANCHOR = '  choices.push({\n    key: k,\n    weight: arbitratedScore\n  });';
  const CAND_LINE = '  if (globalThis.__GFB2_CAND__) globalThis.__GFB2_CAND__(step, k, arbitratedScore, currentKey); // GATE-ONLY observational call';
  const dir = path.join(SCRATCH, 'tree_cand'); fs.cpSync(guard.dir, dir, { recursive: true });
  const mp = path.join(dir, 'main.js'); const txt = fs.readFileSync(mp, 'utf8');
  if (txt.split(CAND_ANCHOR).length !== 2) throw new Error('candidate anchor must match exactly once');
  fs.writeFileSync(mp, txt.replace(CAND_ANCHOR, CAND_ANCHOR + '\n' + CAND_LINE));
  let src = fs.readFileSync(SESS, 'utf8');
  const swap = (a, b2) => { if (!src.includes(a)) throw new Error('candidate driver anchor missing: ' + a.slice(0, 60)); src = src.replace(a, b2); };
  swap("if (mainSha !== (isGuard ? GUARD_TREE.guardMainSha256 : isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(", "if (false) refuse(");
  swap("if (MASK_ON) { counters.maskedOut++; return false; }", "if (MASK_ON) { counters.maskedOut++; (globalThis.__GFS_FIRST__ ||= []).push(['mask', calls - 1]); return false; }");
  swap("globalThis.__GFB2__ = { goalReset(", "globalThis.__GFB2_CANDS__ = []; globalThis.__GFB2_CAND__ = (s, k, w, from) => { globalThis.__GFB2_CANDS__.push([calls - 1, s, Number(k), w, Number(from)]); }; globalThis.__GFB2__ = { goalReset(");
  swap("process.stdout.write('\\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\\n');", "out.candidates = globalThis.__GFB2_CANDS__; out.firstActions = globalThis.__GFS_FIRST__ || []; process.stdout.write('\\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\\n');");
  const cs = path.join(HERE, '.__cand_session_gfs.mjs'); fs.writeFileSync(cs, src);
  let off, mk;
  try { [off, mk] = (await runAll(['off', 'mask'].map(s => ({ input: { ...testIn(1), tree: dir, floor: 'off', guard: s, instrument: true, diag: true }, script: cs })))).map(x => x.rec); } finally { fs.rmSync(cs, { force: true }); }
  const candDiff = (P, Q) => { const n = Math.min(P.length, Q.length); for (let i = 0; i < n; i++) for (let j = 0; j < 5; j++) if (P[i][j] !== Q[i][j]) return i; return P.length === Q.length ? -1 : n; };
  check('K2.candidate-sessions-ran', !!off && !!mk && off.candidates.length > 1000 && mk.candidates.length > 1000);
  const d = off && mk ? candDiff(off.candidates, mk.candidates) : -2;
  const first = mk && mk.firstActions.length ? mk.firstActions[0] : null;
  check('K2.mask-setting-changes-the-candidate-stream-and-acts-first-by-masking', d >= 0 && !!first && first[0] === 'mask' && mk.guard.counters.blockedIllegal === 0);
  if (d >= 0) { const o = off.candidates[d];
    check('K2.no-candidate-differs-before-the-first-mask-and-the-first-difference-is-a-dropped-non-graph-candidate', o[0] >= first[1] && !ISEDGE(o[4], o[2]) && o[4] !== o[2], JSON.stringify({ first, o })); }
  check('K2.mask-setting-admits-only-graph-neighbours', mk.candidates.every(c => ISEDGE(c[4], c[2])));
}

// ============ D: the stale-reasoning diagnostic ============
{
  const diagRecs = KEYS.filter(k => /Diag$|Diag2$|\.diag$|\.armed$/.test(k) && R(k).diag).map(k => [k, R(k)]);
  check('D1.accounting-identities-hold-in-every-diagnostic-session', diagRecs.length >= 20 && diagRecs.every(([, r]) => r.diag.accounting.ok === true && r.diag.recording.inconsistent === 0), diagRecs.filter(([, r]) => !r.diag.accounting.ok).map(([k]) => k).join());
  // INDEPENDENT recomputation from the raw trace (written here without diag.mjs)
  const indep = (r) => {
    const byCall = {}; for (const x of r.trace.arrivals) (byCall[x.call] ||= []).push(x);
    const cls = (x) => { if (x.rTo === null || x.rFrom === null || x.a === null || x.to === null) return 'UNCLASSIFIED'; if (x.rTo !== x.to) return 'UNCLASSIFIED'; if (x.rFrom === x.a) return x.fresh ? 'FRESH' : 'CARRIED'; return x.fresh ? 'UNCLASSIFIED' : 'STALE'; };
    const res = { legal: { FRESH: 0, CARRIED: 0, STALE: 0, UNCLASSIFIED: 0 }, nonGraph: { FRESH: 0, CARRIED: 0, STALE: 0, UNCLASSIFIED: 0 } };
    for (const z of r.trace.resets) { const own = byCall[z.call] || []; const k = own.length === 1 && own[0].a === z.from && own[0].to === z.to ? cls(own[0]) : 'UNCLASSIFIED';
      res[ISEDGE(z.from, z.to) && z.to === z.goal ? 'legal' : 'nonGraph'][k]++; }
    const ill = r.trace.arrivals.filter(x => !(x.a === x.to || ISEDGE(x.a, x.to)) && !x.blocked).length;
    const blk = r.trace.arrivals.filter(x => x.blocked).length;
    const legalOk = r.trace.arrivals.every(x => x.legal === (x.a === x.to || ISEDGE(x.a, x.to)));
    return { res, ill, blk, legalOk };
  };
  const traced = KEYS.filter(k => R(k) && R(k).trace).map(k => [k, R(k)]);
  const mis = traced.filter(([, r]) => { const z = indep(r); return !z.legalOk || J(z.res) !== J(r.diag.resets) || z.ill !== r.diag.illegalExecuted || z.blk !== r.diag.blocked; });
  check('D2.independent-recomputation-from-the-raw-trace-matches-every-recorded-summary', traced.length >= 15 && mis.length === 0, mis.map(([k]) => k).join());
  check('D2.trace-targets-agree-with-the-reasoning-read-at-the-site', traced.every(([, r]) => r.trace.arrivals.every(x => x.rTo === x.to)));
  // adversarial synthetic cases of the pure functions
  const A0 = { call: 5, a: 3, to: 9, rFrom: 3, rTo: 9, fresh: true, legal: false, blocked: false };
  const cases = [
    [DG.classifyArrival(A0), 'FRESH'], [DG.classifyArrival({ ...A0, fresh: false }), 'CARRIED'], [DG.classifyArrival({ ...A0, rFrom: 7, fresh: false }), 'STALE'],
    [DG.classifyArrival({ ...A0, rFrom: 7, fresh: true }), 'UNCLASSIFIED'], [DG.classifyArrival({ ...A0, rTo: 8 }), 'UNCLASSIFIED'], [DG.classifyArrival({ ...A0, rFrom: null }), 'UNCLASSIFIED'],
    [DG.classifyArrival({ ...A0, a: undefined }), 'UNCLASSIFIED'], [DG.classifyArrival({ ...A0, fresh: 'yes' }), 'UNCLASSIFIED'], [DG.classifyArrival({ ...A0, a: '3', rFrom: 3, to: '9' }), 'FRESH'],
    [DG.classifyArrival(null), 'UNCLASSIFIED'], [DG.classifyArrival({ ...A0, a: 9, to: 9, rFrom: 2, rTo: 9, fresh: false }), 'STALE'],
    [DG.classifyReset({ from: 3, to: 9 }, [A0]), 'FRESH'], [DG.classifyReset({ from: 3, to: 9 }, []), 'UNCLASSIFIED'], [DG.classifyReset({ from: 3, to: 9 }, undefined), 'UNCLASSIFIED'],
    [DG.classifyReset({ from: 3, to: 9 }, [A0, A0]), 'UNCLASSIFIED'], [DG.classifyReset({ from: 4, to: 9 }, [A0]), 'UNCLASSIFIED'], [DG.classifyReset({ from: 3, to: 8 }, [A0]), 'UNCLASSIFIED'],
    [DG.classifyReset({ from: 3, to: 9 }, [{ ...A0, rFrom: 6, fresh: false }]), 'STALE'], [DG.classifyReset({ from: null, to: 9 }, [A0]), 'UNCLASSIFIED'],
  ];
  const badCase = cases.map(([got, exp], i) => (got === exp ? null : `${i}:${got}!=${exp}`)).filter(Boolean);
  check('D3.arrival-and-reset-classification-on-adversarial-cases', badCase.length === 0, badCase.join(' '));
  // a synthetic session with a known answer (graph: 1-2, 2-3, 3-9 ; goal 9)
  const sg = DG.adjacency([{ from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 9 }]);
  const arr = [
    { call: 0, a: 1, to: 2, rFrom: 1, rTo: 2, fresh: true, legal: true, blocked: false },
    { call: 1, a: 2, to: 9, rFrom: 2, rTo: 9, fresh: true, legal: false, blocked: false },      // decision-channel non-graph reset
    { call: 2, a: 1, to: 9, rFrom: 2, rTo: 9, fresh: false, legal: false, blocked: false },     // stale non-graph reset (after a restart at 1)
    { call: 3, a: 3, to: 9, rFrom: 2, rTo: 9, fresh: false, legal: true, blocked: false },      // stale but LEGAL reach (restart next to the goal)
    { call: 4, a: 1, to: 9, rFrom: 3, rTo: 9, fresh: false, legal: false, blocked: true },      // blocked stale arrival (no reset)
    { call: 5, a: 2, to: 2, rFrom: 1, rTo: 2, fresh: false, legal: true, blocked: false },      // stale self no-op
    { call: 6, a: 3, to: 9, rFrom: 3, rTo: 9, fresh: false, legal: true, blocked: false },      // carried legal reach
    { call: 7, a: 1, to: 9, rFrom: 1, rTo: 9, fresh: true, legal: false, blocked: false },      // duplicate call (two arrivals) -> unclassified
    { call: 7, a: 1, to: 9, rFrom: 1, rTo: 9, fresh: true, legal: false, blocked: false },
  ];
  const rs = [{ call: 1, from: 2, to: 9, goal: 9 }, { call: 2, from: 1, to: 9, goal: 9 }, { call: 3, from: 3, to: 9, goal: 9 }, { call: 6, from: 3, to: 9, goal: 9 }, { call: 7, from: 1, to: 9, goal: 9 }, { call: 9, from: 1, to: 9, goal: 9 }];
  const sm = DG.summarizeDiag({ arrivals: arr, resets: rs, isEdge: sg.isEdge });
  check('D3.summary-of-a-synthetic-session-with-a-known-answer', J(sm.resets.nonGraph) === J({ FRESH: 1, CARRIED: 0, STALE: 1, UNCLASSIFIED: 2 }) && J(sm.resets.legal) === J({ FRESH: 0, CARRIED: 1, STALE: 1, UNCLASSIFIED: 0 })
    && sm.blocked === 1 && sm.illegalExecuted === 4 && sm.arrivals.duplicateCalls === 1 && sm.arrivals.byClass.UNCLASSIFIED.n === 2 && sm.arrivals.byClass.STALE.n === 4 && sm.channels.unclassified === 2, J(sm));
  const ap = [
    [DG.appendedPair([1, 2], [1, 2], { a: 2, to: 3 }), null], [DG.appendedPair([1, 2], [], { a: 2, to: 3 }), null],
    [DG.appendedPair([1, 2], [1, 2, 3], { a: 2, to: 3 }), { pair: [2, 3], kind: 'EXEC', consistent: true }],
    [DG.appendedPair([1, 2], [1, 2, 4], { a: 3, to: 4 }), { pair: [2, 4], kind: 'SKIP', consistent: true }],
    [DG.appendedPair([1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 7], { a: 6, to: 7 }), { pair: [6, 7], kind: 'EXEC', consistent: true }],
    [DG.appendedPair([], [5], { a: 4, to: 5 }), { pair: null, kind: 'FIRST', consistent: true }],
    [DG.appendedPair([1, 2], [1, 2, 2], { a: 2, to: 2 }), { pair: [2, 2], kind: 'SELF', consistent: true }],
    [DG.appendedPair([1, 2], [7, 8, 9], { a: 2, to: 9 }), { pair: [2, 9], kind: 'EXEC', consistent: false }],
    [DG.appendedPair([1, 2], [1, 2, 3], { a: 2, to: 4 }), { pair: [2, 3], kind: 'EXEC', consistent: false }],
    [DG.appendedPair([1, 2], [1, 2, 3], null), { pair: [2, 3], kind: 'SKIP', consistent: false }],
  ];
  const badAp = ap.map(([got, exp], i) => (J(got) === J(exp) ? null : `${i}:${J(got)}`)).filter(Boolean);
  check('D3.recording-audit-on-adversarial-buffer-changes', badAp.length === 0, badAp.join(' '));
  const pc = new Map([['1->3', { EXEC: 1, SKIP: 2 }], ['2->9', { EXEC: 0, SKIP: 1 }]]);
  const sd = DG.storeDiagnostics([{ source: 'autonomous_success', nodes: [1, 2, 3, 9] }, { source: 'autonomous_success', nodes: [1, 3, 3, 2, 9] }, { source: 'replay', nodes: [2, 1, 9] }], sg, 9, pc);
  check('D3.store-diagnostics-and-attribution-on-a-synthetic-store', sd.episodes === 3 && sd.pairs === 8 && sd.nonGraphPairs === 3 && sd.terminalNonGraph === 2 && sd.twoHopConsistent === 2
    && J(sd.attribution) === J({ EXECUTED: 1, SKIP: 1, UNRECORDED: 1 }) && J(sd.bySource) === J({ autonomous_success: 2, replay: 1 }), J(sd));
  const rc = DG.ratioCi([3, 5, 0, 2], [3, 5, 1, 4], { replicates: 2000, seed: 1, level: 0.95 }), rz = DG.ratioCi([0, 0], [0, 0], { replicates: 100, seed: 1, level: 0.95 });
  check('D3.ratio-interval-of-totals', Math.abs(rc.share - 10 / 13) < 1e-12 && rc.ci.lower <= rc.share && rc.ci.upper >= rc.share && rc.ci.upper <= 1 && rz.share === null && rz.ci === null);
  // ground truths by construction, on the development sessions
  const masks = ['w1', 'w2', 'w1s'].map(t => R(`${t}.maskDiag`)), boths = ['w1', 'w2', 'w1s'].map(t => R(`${t}.bothDiag`)), offs = ['w1', 'w2', 'w1s'].map(t => R(`${t}.offFloorDiag`));
  check('D4.under-the-mask-no-non-graph-reset-is-a-fresh-or-carried-decision', masks.every(r => r.diag.resets.nonGraph.FRESH === 0 && r.diag.resets.nonGraph.CARRIED === 0 && r.diag.arrivals.byClass.FRESH.illegal === 0));
  check('D4.under-the-bundle-every-blocked-execution-is-a-stale-arrival', boths.every(r => r.diag.blocked > 0 && r.diag.arrivals.byClass.STALE.blocked === r.diag.blocked));
  const trG = [R('trainG1.diag'), R('trainG3.diag')], trU = [R('trainU1.diag'), R('trainU3.diag')];
  check('D4.guarded-stores-carry-no-executed-non-graph-pair-and-every-skip-pair-spans-a-two-step-path', trG.every(r => r.store.attribution.EXECUTED === 0 && r.store.attribution.UNRECORDED === 0 && r.store.twoHopConsistent === r.store.nonGraphPairs && r.diag.recording.nonGraph.EXEC === 0)
    && trG.every(r => r.store.nonGraphPairs > 0), J(trG.map(r => r.store)));
  // the store attribution recomputed from the trace: every non-graph pair of the exported store looked up in the session's own pair classes
  const reAttr = (r) => { const m = new Map(r.trace.pairClass); const out = { EXECUTED: 0, SKIP: 0, UNRECORDED: 0 };
    for (const e of r.trace.storeEpisodes) for (let i = 0; i + 1 < e.nodes.length; i++) { const a = Number(e.nodes[i]), b = Number(e.nodes[i + 1]); if (a === b || ISEDGE(a, b)) continue; const c = m.get(`${a}->${b}`); out[c && c.EXEC > 0 ? 'EXECUTED' : c && c.SKIP > 0 ? 'SKIP' : 'UNRECORDED']++; }
    return out; };
  check('D4.store-attribution-recomputes-from-the-trace', [...trG, ...trU].every(r => J(reAttr(r)) === J(r.store.attribution)));
  check('D5.non-vacuity-both-channels-and-both-pair-kinds-are-observed', offs.some(r => r.diag.channels.decision > 0) && offs.every(r => r.diag.channels.stale > 0) && masks.every(r => r.diag.channels.stale > 0)
    && trU.every(r => r.store.attribution.EXECUTED > 0) && trG.every(r => r.store.attribution.SKIP > 0) && [...trG, ...trU].every(r => r.diag.recording.appended.SKIP + r.diag.recording.goalPairs.SKIP > 0));
  check('D5.no-unclassified-arrival-or-reset-on-the-development-sessions', diagRecs.every(([, r]) => r.diag.arrivals.byClass.UNCLASSIFIED.n === 0 && r.diag.resets.nonGraph.UNCLASSIFIED === 0 && r.diag.resets.legal.UNCLASSIFIED === 0));
}

// ============ A: analysis fixtures ============
const WS = C.WORLD_START;
const baseTable = { U_off: 0, U_mask: 48, U_both: 40, G_both: 30 };
const okIntegrity = () => ({ cond: 'P', hooks: { arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off', passEnv: false }, envDraws: 0, envAttempts: 0, envSlips: 0, drawsLogged: 0, harnessAttempts: 0, harnessSlips: 0,
  creditKeys: 0, creditRejected: 0, peLaCalls: 0, peDampCalls: 0, traversal: { attempts: 900, successes: 900, edgesObserved: 60, edgesWithSlip: 0, maxCostEstimate: 1 }, episodeCapArmed: true, replayDeterministic: true, ok: true });
const zc = () => ({ FRESH: 0, CARRIED: 0, STALE: 0, UNCLASSIFIED: 0 });
function mkDiag({ legal, nonEdge, stale, decision, blocked, illegalExec, unclassified = 0, calls = 1500 }) {
  const byClass = { FRESH: { n: 1300, illegal: decision, blocked: 0, illegalExecuted: decision, toGoalReset: 0 }, CARRIED: { n: 5, illegal: 0, blocked: 0, illegalExecuted: 0, toGoalReset: 0 },
    STALE: { n: 120, illegal: stale + blocked, blocked, illegalExecuted: stale, toGoalReset: 0 }, UNCLASSIFIED: { n: unclassified, illegal: 0, blocked: 0, illegalExecuted: 0, toGoalReset: 0 } };
  const nonGraph = { FRESH: decision, CARRIED: 0, STALE: nonEdge - decision - unclassified, UNCLASSIFIED: unclassified };
  return { arrivals: { total: 1425 + unclassified, duplicateCalls: 0, byClass }, resets: { legal: { FRESH: legal - 6, CARRIED: 2, STALE: 4, UNCLASSIFIED: 0 }, nonGraph }, resetTotals: { legal, nonGraph: nonEdge },
    blocked, illegalExecuted: illegalExec, channels: { stale: nonGraph.STALE, decision, decisionCarried: 0, unclassified }, accounting: { ok: true }, recording: { inconsistent: 0 } };
}
const mkBlock = ({ table = baseTable, perGoal = {}, n = 40, sd: sdv = 12, seed = 11, tweak = null, staleShare = 1, unclassified = 0, gShare = 0.03, uShare = 0.14, maskNonEdge = 30 } = {}) => {
  const r = prng(seed), noise = () => (r() + r() + r() - 1.5) * sdv * 1.6;
  const records = new Map(), trainRecords = new Map(), controls = {}, worldsPlan = [], valid = [];
  for (let w = 0; w < n; w++) {
    const goal = C.GOALS[w % 4], world = WS + w;
    worldsPlan.push({ world, goal }); valid.push(world);
    const baseLegal = 400 + noise() * 2;
    controls[world] = {};
    for (const t of C.TRAININGS) {
      const ng = t.id === 'G' ? Math.round(700 * gShare) : Math.round(700 * uShare);
      const att = t.id === 'G' ? { EXECUTED: 0, SKIP: ng, UNRECORDED: 0 } : { EXECUTED: ng - 5, SKIP: 5, UNRECORDED: 0 };
      controls[world][t.id] = { episodes: 230, storeHash: `${t.id}-store-${world}`, diagnostics: { episodes: 230, pairs: 700, nonGraphPairs: ng, nonGraphShare: ng / 700, terminalNonGraph: 5, twoHopConsistent: ng },
        attribution: att, trainingGuard: t.guard, trainingFloor: 'off', trainingSeed: C.trainSeed(world), trainingConfig: 200000 + world, trainingLegal: 380, trainingNonGraph: t.id === 'G' ? 0 : 100, trainingIllegalExecutions: t.id === 'G' ? 0 : 150 };
      const both = t.guard === 'both';
      trainRecords.set(`gfs-train${t.id}-w${world}`, { role: 'train', outcome: { crashed: false, completed: true }, tree: { derived: true, mainSha256: C.GUARD_TREE.guardMainSha256 }, guardSetting: t.guard, floorMode: 'off', floor: null,
        input: { agentSeed: C.trainSeed(world), acceptedConfigSeed: 200000 + world, goal }, conditionIntegrity: okIntegrity(), reaches: { legal: 380, nonEdge: both ? 0 : 100, goal: both ? 380 : 480 }, counters: { calls: 1500 },
        guard: { setting: t.guard, mask: both, exec: both, diag: true, counters: { admittedGraph: 23000, admitted: both ? 0 : 1500, maskedOut: both ? 1500 : 0, blockedIllegal: both ? 30 : 0 } }, moveClass: { legal: 1300, nonGraph: both ? 0 : 120, self: 0, none: 0 },
        diag: mkDiag({ legal: 380, nonEdge: both ? 0 : 100, stale: both ? 0 : 30, decision: both ? 0 : 70, blocked: both ? 30 : 0, illegalExec: both ? 0 : 100 }), store: { episodes: 230, nonGraphPairs: ng, attribution: att } });
    }
    for (const cell of C.CELLS) {
      const eff = table[cell.name] + ((perGoal[cell.name] || {})[goal] || 0);
      const legal = Math.max(1, Math.round(baseLegal + eff + noise()));
      const st = C.GUARD_SETTINGS[cell.guard];
      const nonEdge = cell.guard === 'both' ? 0 : cell.guard === 'mask' ? maskNonEdge : 120;
      const ung = cell.guard === 'mask' ? Math.round(nonEdge * (1 - staleShare)) - unclassified : 0;
      const decision = cell.guard === 'off' ? 90 : Math.max(0, ung);
      const blocked = cell.guard === 'both' ? 30 : 0;
      const dg = mkDiag({ legal, nonEdge, stale: nonEdge - decision, decision, blocked, illegalExec: cell.guard === 'both' ? 0 : nonEdge, unclassified: cell.guard === 'both' ? 0 : unclassified });
      const ev = Array.from({ length: Math.min(legal, 50) }, (_, i) => [i * 3, 9, 1]);
      const sh = controls[world][cell.store].storeHash;
      records.set(`gfs-${cell.name}-w${world}`, {
        role: 'test', bare: false, floorMode: 'on', guardSetting: cell.guard, outcome: { crashed: false, completed: true }, counters: { calls: 1500 },
        tree: { derived: true, mainSha256: C.GUARD_TREE.guardMainSha256 }, input: { agentSeed: C.testSeed(world), acceptedConfigSeed: 200000 + world, goal },
        endpoints: { goalReaches: legal + nonEdge, legalReaches: legal, attemptSuccess: null, slipsPerCall: 0, earlyReaches: 10 }, reaches: { goal: legal + nonEdge, legal, nonEdge, legalCalls: [], goalCalls: [] },
        conditionIntegrity: okIntegrity(),
        guardCompleteness: { guard: cell.guard, nonGraphResets: nonEdge, nonGraphDecisions: cell.guard === 'off' ? 100 : 0, admittedNonGraph: st.mask ? 0 : 1700, maskedOut: st.mask ? 1700 : 0, blockedIllegal: blocked, illegalExecutions: dg.illegalExecuted, ok: true },
        guard: { setting: cell.guard, mask: st.mask, exec: st.exec, diag: true, counters: { admittedGraph: 23400 + (st.mask ? 60 : 0), admitted: st.mask ? 0 : 1700, nonGraphTrained: 100, nonGraphHuman: 600, nonGraphBoth: 1000, maskedOut: st.mask ? 1700 : 0, blockedIllegal: blocked } },
        moveClass: { legal: 1300, nonGraph: cell.guard === 'off' ? 100 : 0, self: 0, none: 0 }, diag: dg,
        brain: { deliveredHash: 'x', deliveredHashes: { episodes: sh }, start: { hashes: { episodes: sh }, sizes: { episodes: 230, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } },
        floor: { on: true, tcFloor: C.TC_FLOOR, counters: { evaluated: 120, legal: 100, notLegal: 20, raised: 40, lowered: 0, maxRaise: 100 }, byEdge: { [`9->${goal}`]: { evaluated: 100, raised: 40 } } },
        audit: { drawsTotal: 0, drawsIntoGoal: 0, drawsNonEdge: 0, goalReaches: legal + nonEdge, legalReaches: legal, nonEdgeReaches: nonEdge, reachesEqualLegalPlusNonEdge: true, drawsMatchEnvCounters: true },
        finalHop: { events: ev, drawsIntoGoal: 0, goalEdges: [{ from: 9, p: 1 }, { from: 11, p: 1 }] }, goalEdgeState: [{ from: 9, p: 1, penalty: 1, reward: 4, transitions: 5 }],
      });
    }
  }
  const plan = { block: 'S', worlds: worldsPlan, validWorlds: valid, exclusions: [] };
  if (tweak) tweak({ records, trainRecords, controls, plan });
  return { records, trainRecords, plan, controls };
};
const tb = (patch) => ({ ...baseTable, ...patch });
const FX = {
  clean: () => mkBlock(), scopeNeutral: () => mkBlock({ table: tb({ G_both: 40 }) }), scopeHarm: () => mkBlock({ table: tb({ G_both: 5 }) }), scopeBenefit: () => mkBlock({ table: tb({ G_both: 75 }) }),
  // (the retrofit instrument I6 must hold in these fixtures, otherwise PS2 is VOID rather than labelled)
  pkgNeutral: () => mkBlock({ table: tb({ G_both: 2 }) }), pkgHarm: () => mkBlock({ table: tb({ G_both: -40 }) }),
  maskSuperior: () => mkBlock({ table: tb({ U_mask: 75 }) }), fallsShort: () => mkBlock({ table: tb({ U_mask: 5 }) }), wide: () => mkBlock({ table: tb({ U_both: 54 }), sd: 30, n: 24 }),
};
{
  const o = evaluateBlock(FX.clean());
  check('A1.clean-block-is-valid-and-labels-every-primary-claim', o.valid && o.labels.PS1 === 'SCOPE_NEUTRAL' && o.labels.PS2 === 'PACKAGE_IMPROVES' && o.labels.PS3 === 'MASK_SUFFICES' && o.labels.STALE === 'SUPPORTED', J(o.labels) + J(o.problems));
  check('A1.decisive-level-is-bonferroni-3-and-estimands-are-the-declared-cell-differences', Math.abs(o.familyLevel - (1 - 0.05 / 3)) < 1e-12 && Math.abs(o.primary.PS2.legal.mean - 30) < 8 && Math.abs(o.primary.PS1.legal.mean + 10) < 8 && Math.abs(o.primary.PS3.legal.mean + 8) < 8
    && o.primary.PS1.estimand.includes('Y_w(G,both) - Y_w(U,both)') && o.primary.PS3.estimand.includes('Y_w(U,both) - Y_w(U,mask)'));
  check('A1.non-graph-and-total-resets-are-reported-separately', Math.abs(o.primary.PS2.nonGraph.mean + 120) < 1e-9 && o.primary.PS2.allResets.mean < o.primary.PS2.legal.mean && o.cellMeans.G_both.nonEdge === 0 && o.cellMeans.U_mask.nonEdge === 30);
  check('A1.specification-and-verdict-state-scope-exec-guard-completeness-and-no-readiness', o.specification.justified === true && /retrofit suffices/.test(o.specification.scope) && /completeness requirement for the owner/.test(o.specification.execGuard)
    && /Completeness is an owner decision, not a statistical one\./.test(o.verdict) && /Production-like transition semantics under M7 bounds\./.test(o.verdict) && /not a production change/.test(o.verdict), o.verdict);
  check('A1.instruments-stores-and-stale-diagnostic-are-reported', ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I9'].every(k => o.instruments[k].status === 'OK') && o.instruments.I8.status === 'OK'
    && Math.abs(o.stores.G.attribution.SKIP.mean - 21) < 1e-9 && o.stores.G.attribution.EXECUTED.mean === 0 && Math.abs(o.stale.X1_maskOnlyStaleShare.share - 1) < 1e-12 && Object.keys(o.secondary).length === 3);
  const L = (fx) => evaluateBlock(fx()).labels;
  check('A2.ps1-labels', L(FX.scopeHarm).PS1 === 'SCOPE_HARM' && L(FX.scopeBenefit).PS1 === 'SCOPE_BENEFIT' && L(FX.scopeNeutral).PS1 === 'SCOPE_NEUTRAL' && L(FX.wide).PS1 !== 'SCOPE_NEUTRAL');
  const ph = evaluateBlock(FX.pkgHarm()), pn = evaluateBlock(FX.pkgNeutral());
  check('A2.ps2-labels-and-a-harming-package-blocks-the-specification', ph.labels.PS2 === 'PACKAGE_HARMS' && ph.specification.justified === false && pn.labels.PS2 === 'PACKAGE_NEUTRAL' && pn.specification.justified === false);
  const ms = evaluateBlock(FX.maskSuperior()), fs2 = evaluateBlock(FX.fallsShort()), wd = evaluateBlock(FX.wide());
  check('A2.ps3-labels', ms.labels.PS3 === 'MASK_SUPERIOR' && fs2.labels.PS3 === 'MASK_FALLS_SHORT' && /keep the execution guard/.test(fs2.specification.execGuard) && wd.labels.PS3 === 'INCONCLUSIVE', J([ms.labels, fs2.labels, wd.labels]));
  const vI3 = evaluateBlock(mkBlock({ tweak: ({ records }) => { const r = records.get(`gfs-U_both-w${WS + 3}`); r.diag.illegalExecuted = 2; r.guardCompleteness.illegalExecutions = 2; r.diag.arrivals.byClass.STALE.illegalExecuted += 2; } }));
  check('A3.bundle-incompleteness-voids-every-primary-claim', vI3.valid && vI3.instruments.I3.status === 'FAILED' && ['PS1', 'PS2', 'PS3'].every(k => vI3.labels[k] === 'VOID') && vI3.specification.justified === false, J(vI3.labels) + J(vI3.problems));
  const vI5 = evaluateBlock(mkBlock({ tweak: ({ trainRecords, controls }) => { trainRecords.get(`gfs-trainG-w${WS + 2}`).store.attribution.EXECUTED = 3; controls[WS + 2].G.attribution.EXECUTED = 3; } }));
  check('A3.an-executed-non-graph-pair-in-a-guarded-store-voids-ps1-and-ps2-only', vI5.valid && vI5.instruments.I5.status === 'FAILED' && vI5.labels.PS1 === 'VOID' && vI5.labels.PS2 === 'VOID' && vI5.labels.PS3 !== 'VOID', J(vI5.labels));
  const vSeed = evaluateBlock(mkBlock({ tweak: ({ trainRecords }) => { trainRecords.get(`gfs-trainG-w${WS + 2}`).input.agentSeed += 2; } }));
  check('A3.training-seed-mismatch-fails-training-fidelity', vSeed.valid && vSeed.instruments.I5.status === 'FAILED' && vSeed.labels.PS1 === 'VOID');
  const vI6 = evaluateBlock(mkBlock({ table: tb({ U_both: -5, U_mask: 3 }) }));
  check('A3.retrofit-not-replicating-voids-ps2', vI6.valid && vI6.instruments.I6.status === 'FAILED' && vI6.labels.PS2 === 'VOID' && vI6.labels.PS1 !== 'VOID', J(vI6.labels));
  const vI2 = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_off-w${WS + 3}`).floor.counters.lowered = 1; } }));
  check('A3.floor-lowering-a-score-voids-every-primary-claim', vI2.valid && vI2.instruments.I2.status === 'FAILED' && ['PS1', 'PS2', 'PS3'].every(k => vI2.labels[k] === 'VOID'));
  const vI9 = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_mask-w${WS + 3}`).diag.blocked = 4; } }));
  check('A3.broken-diagnostic-accounting-voids-only-the-stale-reading', vI9.valid && vI9.instruments.I9.status === 'FAILED' && vI9.labels.STALE === 'VOID' && ['PS1', 'PS2', 'PS3'].every(k => vI9.labels[k] !== 'VOID'), J(vI9.labels));
  const sw = evaluateBlock(mkBlock({ staleShare: 0.6 })), su = evaluateBlock(mkBlock({ unclassified: 4, staleShare: 0.8 })), sm0 = evaluateBlock(mkBlock({ maskNonEdge: 0 }));
  check('A4.stale-readings-weakened-unresolved-and-nothing-to-classify', sw.labels.STALE === 'WEAKENED' && su.labels.STALE === 'UNRESOLVED' && sm0.valid && sm0.labels.STALE === 'UNRESOLVED', J([sw.labels.STALE, su.labels.STALE, sw.stale.X1_maskOnlyStaleShare.share]));
  const fl8 = evaluateBlock(mkBlock({ gShare: 0.2, uShare: 0.1 }));
  check('A4.guarded-store-with-the-larger-non-graph-share-raises-the-i8-flag-without-voiding', fl8.valid && fl8.instruments.I8.status === 'FLAG' && fl8.labels.PS1 !== 'VOID' && /I8 FLAG/.test(fl8.verdict));
  const hg = evaluateBlock(mkBlock({ perGoal: { G_both: { 12: -150 } } }));
  check('A5.a-harmed-goal-group-is-flagged-and-blocks-the-specification', hg.valid && hg.harmFlags.PS2.includes(12) && hg.specification.justified === false && /harm flag/.test(hg.verdict), J(hg.harmFlags));
  const eg = evaluateBlock(mkBlock({ perGoal: { U_mask: { 16: -60 } } }));
  check('A5.goal-level-execution-guard-increment-is-reported-as-a-caveat', eg.execGuardAddsMarginInGoals.includes(16) && /goal group\(s\) 16/.test(eg.specification.execGuardGoalCaveat || ''));
  const sdv = evaluateBlock(mkBlock({ table: tb({ G_both: 14 }), n: 40, sd: 14 }));
  check('A6.unadjusted-classification-is-a-non-decisive-sensitivity', sdv.sensitivityUnadjusted95.decisive === false && typeof sdv.sensitivityUnadjusted95.agrees === 'boolean' && sdv.sensitivityUnadjusted95.intervals.PS1.ci.lower >= sdv.primary.PS1.legal.ci.lower);
  const bad = {
    miss: mkBlock({ tweak: ({ records }) => { records.delete(`gfs-U_mask-w${WS + 5}`); } }),
    storeU: mkBlock({ tweak: ({ records }) => { const r = records.get(`gfs-U_mask-w${WS + 2}`); r.brain.deliveredHashes.episodes = 'other'; r.brain.start.hashes.episodes = 'other'; } }),
    storeG: mkBlock({ tweak: ({ records, controls }) => { const r = records.get(`gfs-G_both-w${WS + 2}`); r.brain.deliveredHashes.episodes = controls[WS + 2].U.storeHash; r.brain.start.hashes.episodes = controls[WS + 2].U.storeHash; } }),
    seed: mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_both-w${WS + 2}`).input.agentSeed += 2; } }),
    attempt: mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_off-w${WS + 2}`).endpoints.attemptSuccess = 0.9; } }),
    cond: mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_off-w${WS + 2}`).conditionIntegrity.envDraws = 12; } }),
    tree: mkBlock({ tweak: ({ records }) => { records.get(`gfs-G_both-w${WS + 2}`).tree.mainSha256 = 'x'; } }),
    setting: mkBlock({ tweak: ({ records }) => { const r = records.get(`gfs-U_mask-w${WS + 2}`); r.guardSetting = 'both'; r.guard.setting = 'both'; r.guard.exec = true; } }),
    nodiag: mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_off-w${WS + 2}`).guard.diag = false; } }),
    uexec: mkBlock({ tweak: ({ records }) => { records.set(`gfs-U_exec-w${WS + 2}`, clone(records.get(`gfs-U_both-w${WS + 2}`))); } }),
    excl: mkBlock({ tweak: ({ plan }) => { plan.exclusions = plan.worlds.slice(0, 5).map(w => ({ world: w.world, reason: 'x' })); } }),
    trainMissing: mkBlock({ tweak: ({ trainRecords }) => { trainRecords.delete(`gfs-trainU-w${WS + 4}`); } }),
  };
  const ev = Object.fromEntries(Object.entries(bad).map(([k, b]) => [k, evaluateBlock(b)]));
  const has = (k, re) => re.test(ev[k].problems.join(' | ')) || (k === 'excl' && ev[k].valid === false);
  check('A7.invalid-blocks-are-refused-with-the-reason', Object.values(ev).every(x => !x.valid) && has('miss', /no record/) && has('storeU', /delivered U store/) && has('storeG', /delivered G store|differ from the expected control/)
    && has('seed', /test seed/) && has('attempt', /per-attempt success/) && has('cond', /envDraws is 12/) && has('tree', /pinned guard tree/) && has('setting', /guard setting/) && has('nodiag', /without the diagnostic/)
    && has('uexec', /undeclared cell/) && has('excl', /./) && has('trainMissing', /training U has no record/), Object.entries(ev).map(([k, x]) => `${k}:${x.problems[0]}`).join(' | '));
  check('A8.digests-are-bound', o.designDigest === C.designDigest() && o.decisionDigest === C.decisionDigest());
}

// ============ P: plan, freshness, power ============
{
  const pj = path.join(SCRATCH, 'plan.json');
  const r = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--plan-only', '--plan-json', pj], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const P = fs.existsSync(pj) ? JSON.parse(fs.readFileSync(pj, 'utf8')) : null;
  check('P1.plan-only-runs-no-session-and-writes-the-plan', r.status === 0 && !!P && /planned sessions 1680 \(560 training \+ 1120 test\)/.test(r.stdout), (r.stderr || '').slice(-300));
  if (P) {
    const S = P.sessions, ws = P.worlds;
    check('P1.exact-session-accounting', S.length === 1680 && P.counts.training === 560 && P.counts.test === 1120 && J(P.counts.byCell) === J({ U_off: 280, U_mask: 280, U_both: 280, G_both: 280 }) && J(P.counts.byRegime) === J({ U: 280, G: 280 }));
    check('P1.no-excluded-cell-is-planned-and-labels-are-unique', !S.some(s => C.EXCLUDED_CELLS.includes(s.cell)) && !S.some(s => s.guard === 'exec') && new Set(S.map(s => s.label)).size === S.length);
    check('P1.every-world-has-two-trainings-and-four-test-cells-with-its-own-seeds', ws.length === 280 && ws.every((w, i) => w.world === C.WORLD_START + i) && ws.every(w => {
      const mine = S.filter(s => s.world === w.world); return mine.length === 6 && mine.filter(s => s.phase === 'train').every(s => s.agentSeed === C.trainSeed(w.world) && s.floor === 'off') && mine.filter(s => s.phase === 'test').every(s => s.agentSeed === C.testSeed(w.world) && s.floor === 'on') && new Set(mine.map(s => s.configSeed)).size === 1; }));
    check('P1.training-regimes-and-cell-stores-as-declared', S.filter(s => s.phase === 'train').every(s => (s.regime === 'U' && s.guard === 'off') || (s.regime === 'G' && s.guard === 'both')) && S.filter(s => s.phase === 'test').every(s => C.CELLS.find(c => c.name === s.cell).store === s.store && C.CELLS.find(c => c.name === s.cell).guard === s.guard));
    check('P2.goals-balanced-seventy-each', C.GOALS.every(gl => ws.filter(w => w.goal === gl).length === 70));
    const giCache = fs.readdirSync(path.join(ROOT, 'experiments', 'gate-floor-interaction', 'data')).find(f => f.startsWith('stream_' + C.CONFIG_START + '_1392_'));
    const prefix = giCache ? JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'gate-floor-interaction', 'data', giCache), 'utf8')) : null;
    const myCache = fs.readdirSync(path.join(HERE, 'data')).find(f => f.startsWith('stream_' + C.CONFIG_START + '_' + C.WORLDS_TOTAL + '_'));
    const Sx = myCache ? JSON.parse(fs.readFileSync(path.join(HERE, 'data', myCache), 'utf8')) : null;
    check('P2.stream-continues-the-interaction-stream-and-has-1672-elements', !!prefix && !!Sx && Sx.length === 1672 && J(Sx.slice(0, 1392)) === J(prefix) && ws.every(w => Sx[w.world].acceptedSeed === w.configSeed && Sx[w.world].goal === w.goal));
    const blk = Sx ? Sx.slice(C.WORLD_START) : [];
    check('P2.accepted-seeds-ascending-below-heldout-unregistered-and-new', blk.length === 280 && blk.every((e, i) => e.acceptedSeed < C.HELDOUT_FLOOR && (i === 0 || e.acceptedSeed > blk[i - 1].acceptedSeed) && !typedConfig.isHeldOut(typedConfigSeed(e.acceptedSeed)) && !typedConfig.isConsumed(typedConfigSeed(e.acceptedSeed)))
      && new Set(Sx.map(e => e.acceptedSeed)).size === Sx.length);
    const seeds = []; for (let w = C.BLOCKS.S.lo; w <= C.BLOCKS.S.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
    check('P2.agent-seeds-fresh-disjoint-from-earlier-studies-and-inside-the-domain', new Set(seeds).size === seeds.length && seeds.every(s => s > C.testSeed(1391) && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi
      && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength) && C.seedOk(s).ok));
  }
  const ev = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence', 'calibration6_summary.json'), 'utf8')), ct = ev.contrasts, cal = C.CALIBRATION.contrasts;
  const near = (a, b) => Math.abs(a - b) < 0.06;
  const k = (re) => Object.keys(ct).find(x => re.test(x));
  check('P3.declared-calibration-constants-match-the-recorded-development-calibration', ev.worlds === C.CALIBRATION.worlds && near(ct[k(/^PS1/)].legal.mean, cal.PS1_scope.mean) && near(ct[k(/^PS1/)].legal.sd, cal.PS1_scope.sd)
    && near(ct[k(/^PS2/)].legal.mean, cal.PS2_package.mean) && near(ct[k(/^PS2/)].legal.sd, cal.PS2_package.sd) && near(ct[k(/^PS3/)].legal.mean, cal.PS3_execIncrement.mean) && near(ct[k(/^PS3/)].legal.sd, cal.PS3_execIncrement.sd)
    && near(ct[k(/^retrofit/)].legal.sd, cal.retrofit.sd) && near(ct[k(/^mask-only effect/)].legal.sd, cal.maskWithoutExec.sd) && near(ct[k(/^exec-only effect/)].legal.mean, C.CALIBRATION.pathologicalComparator.effectVsOff));
  const zA = 2.3940, zB = 0.8416;                                 // z(1 - 0.05/6), z(0.80)
  const need = (s, infl = 1) => Math.ceil(((zA + zB) * s * infl / C.MARGIN.delta) ** 2);
  const prim = [cal.PS1_scope.sd, cal.PS2_package.sd, cal.PS3_execIncrement.sd];
  check('P3.n-covers-every-primary-contrast-at-bonferroni-3-with-a-25-percent-sd-inflation', prim.every(s => need(s, 1.25) <= C.WORLDS_N) && J(prim.map(s => need(s))) === J([86, 147, 22]) && J(prim.map(s => need(s, 1.25))) === J([134, 229, 34]), J(prim.map(s => need(s, 1.25))));
}

// ============ O: orchestrator plumbing (self-test on development worlds 0-1) ============
{
  const sel = path.join(fs.realpathSync.native(os.tmpdir()), `gfs-selftest-${process.pid}`);
  fs.rmSync(sel, { recursive: true, force: true });
  const r = spawnSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), '--selftest', '--out', sel, '--workers', String(WORKERS)], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const man = fs.existsSync(path.join(sel, 'MANIFEST.json')) ? JSON.parse(fs.readFileSync(path.join(sel, 'MANIFEST.json'), 'utf8')) : null;
  check('O1.selftest-ran-two-worlds-x-six-sessions-without-exclusion', r.status === 0 && !!man && Object.keys(man.sessions).length === 12 && man.exclusions === 0 && /planned sessions 12 \(4 training \+ 8 test\)/.test(r.stdout), (r.stderr || r.stdout).slice(-300));
  if (man) {
    const { digest, ...rest } = man;
    const plan = JSON.parse(fs.readFileSync(path.join(sel, 'plan.json'), 'utf8')), ctl = JSON.parse(fs.readFileSync(path.join(sel, 'controls.json'), 'utf8'));
    check('O1.manifest-binds-plan-controls-sessions-tree-driver-and-diagnostic', C.hashObject(rest) === digest && C.hashObject(plan) === man.planSha256 && C.hashObject(ctl.controls) === man.controlsSha256
      && Object.entries(man.sessions).every(([f, h]) => sha(fs.readFileSync(path.join(sel, 'sessions', f))) === h) && man.driverSha256 === sha(fs.readFileSync(SESS)) && man.diagSha256 === sha(fs.readFileSync(path.join(HERE, 'diag.mjs')))
      && man.tree.guardMainSha256 === C.GUARD_TREE.guardMainSha256 && man.selftest === true);
    const { loadBlock } = await import(pathToFileURL(path.join(HERE, 'analyze.mjs')).href);
    let refused = false; try { loadBlock(sel); } catch (e) { refused = /self-test/.test(e.message); }
    check('O1.the-analysis-refuses-a-selftest-block', refused);
    const records = new Map(), trainRecords = new Map();
    for (const f of Object.keys(man.sessions)) { const rec = JSON.parse(fs.readFileSync(path.join(sel, 'sessions', f), 'utf8')); (rec.role === 'train' ? trainRecords : records).set(f.replace(/\.json$/, ''), rec); }
    const o = evaluateBlock({ records, trainRecords, plan, controls: ctl.controls });
    check('O2.real-driver-records-pass-every-integrity-rule-of-the-analysis', o.valid === true && o.problemCount === 0 && ['I2', 'I3', 'I5', 'I9'].every(k2 => o.instruments[k2].status === 'OK'), J(o.problems) + J(o.instruments && Object.fromEntries(Object.entries(o.instruments).map(([a, b]) => [a, b.status]))));
    check('O2.real-records-carry-the-stale-and-store-diagnostics', o.valid && o.stale && Number.isFinite(o.stale.X1_maskOnlyStaleShare.share) && o.stores.G.attribution.EXECUTED.mean === 0 && o.stores.G.attribution.UNRECORDED.mean === 0 && o.stores.U.attribution.EXECUTED.mean > 0);
  }
  fs.rmSync(sel, { recursive: true, force: true });
}

// ============ M: mutants ============
{
  // driver / diagnostic mutants: a patched copy of the driver (or of diag.mjs) runs one development session; the gate's own predicate must reject it
  const mutDriver = (tag, edits, diagEdits = null) => {
    let s = fs.readFileSync(SESS, 'utf8');
    for (const [a, b] of edits) { if (!s.includes(a)) throw new Error(`mutant ${tag}: anchor missing ${a.slice(0, 60)}`); s = s.replace(a, b); }
    if (diagEdits) {
      let d = fs.readFileSync(path.join(HERE, 'diag.mjs'), 'utf8');
      for (const [a, b] of diagEdits) { if (!d.includes(a)) throw new Error(`mutant ${tag}: diag anchor missing ${a.slice(0, 60)}`); d = d.replace(a, b); }
      d = d.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
      fs.writeFileSync(path.join(HERE, `.__mut_diag_${tag}.mjs`), d);
      s = s.replace("from './diag.mjs'", `from './.__mut_diag_${tag}.mjs'`);
    }
    const f = path.join(HERE, `.__mut_session_${tag}.mjs`); fs.writeFileSync(f, s); return f;
  };
  const cleanup = () => { for (const f of fs.readdirSync(HERE)) if (f.startsWith('.__mut_')) fs.rmSync(path.join(HERE, f), { force: true }); };
  const ref = R('w1s.maskDiag'), refOff = R('w1s.offFloorDiag'), refG = R('trainG1.diag');
  const specs = [
    ['M1.legalmove-blocking-with-the-execution-component-off-breaks-diagnostic-neutrality', [["return EXEC_ON ? legal : true; }", "return legal; }"]], null, { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'mask', instrument: true, diag: true, traceDiag: true, traceWrites: true },
      (r) => J(behView(r)) !== J(behView(ref))],
    ['M2.a-diagnostic-that-writes-the-decision-record-breaks-neutrality', [["const r = globalThis.lastReasoning;", "const r = globalThis.lastReasoning; if (r) globalThis.lastReasoning = r;"]], null, { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'mask', instrument: true, diag: true, traceDiag: true, traceWrites: true },
      (r) => !r || J(behView(r)) !== J(behView(ref))],
    ['M3.freshness-always-true-is-caught-by-the-no-unclassified-check', [["fresh: r !== lrAtStart,", "fresh: true,"]], null, { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'mask', instrument: true, diag: true, traceDiag: true },
      (r) => r.diag.arrivals.byClass.UNCLASSIFIED.n > 0 || r.diag.resets.nonGraph.UNCLASSIFIED > 0],
    ['M4.freshness-always-false-is-caught-by-the-off-session-decision-channel-check', [["fresh: r !== lrAtStart,", "fresh: false,"]], null, { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'off', instrument: true, diag: true, traceDiag: true },
      (r) => !(r.diag.channels.decision > 0) || J(r.diag.resets) !== J(refOff.diag.resets)],
    ['M5.alignment-ignored-in-the-classifier-is-caught-by-the-mask-ground-truth', [], [["const aligned = Number(x.rFrom) === Number(x.a);", "const aligned = true;"]], { ...testIn(1, withStore), tree: guard.dir, floor: 'on', guard: 'mask', instrument: true, diag: true, traceDiag: true },
      (r) => !(r.diag.resets.nonGraph.FRESH === 0 && r.diag.resets.nonGraph.CARRIED === 0)],
    ['M6.recording-kind-ignoring-the-executed-origin-is-caught-by-the-guarded-store-truth', [], [["return { pair: [p, x], kind: arrivalPrev && Number(p) === Number(arrivalPrev.a) ? 'EXEC' : 'SKIP', consistent };", "return { pair: [p, x], kind: 'EXEC', consistent };"]],
      { ...trainIn(1), tree: guard.dir, guard: 'both', instrument: true, diag: true, traceDiag: true }, (r) => r.store.attribution.EXECUTED > 0],
    ['M7.goal-pair-kind-swapped-is-caught-by-the-guarded-store-truth', [["const kind = Number(p) === Number(to) ? 'SELF' : Number(p) === Number(from) ? 'EXEC' : 'SKIP';", "const kind = Number(p) === Number(to) ? 'SELF' : Number(p) === Number(from) ? 'SKIP' : 'EXEC';"]], null,
      { ...trainIn(1), tree: guard.dir, guard: 'both', instrument: true, diag: true, traceDiag: true }, (r) => r.store.attribution.EXECUTED > 0 || J(r.store) !== J(refG.store)],
    ['M8.completeness-ignoring-illegal-executions-is-caught-by-the-analysis-i3', [["&& (diag === null || guardCompleteness.illegalExecutions === 0))", ")"]], null, null, null],
  ];
  const runs = specs.filter(s => s[3]).map(s => ({ input: s[3], script: mutDriver(s[0].split('.')[0], s[1], s[2]) }));
  let outs;
  try { outs = await runAll(runs); } finally { cleanup(); }
  let j = 0;
  for (const s of specs) {
    if (!s[3]) continue;
    const res = outs[j++];
    mutant(s[0], !!res.rec ? s[4](res.rec) : true, res.rec ? 'the gate predicate still held' : '');
  }
  // M8 (static): the analysis recomputes completeness from raw counters, so a driver whose own ok flag ignores illegal executions is still caught
  const i3 = evaluateBlock(mkBlock({ tweak: ({ records }) => { const r = records.get(`gfs-U_both-w${WS + 1}`); r.diag.illegalExecuted = 1; r.guardCompleteness.illegalExecutions = 1; r.guardCompleteness.ok = true; } }));
  mutant('M8.completeness-ignoring-illegal-executions-is-caught-by-the-analysis-i3', i3.instruments && i3.instruments.I3.status === 'FAILED');
  // pure diagnostic mutants against the adversarial cases
  const loadMut = async (file, edits, tag) => {
    let t = fs.readFileSync(path.join(HERE, file), 'utf8');
    for (const [a, b] of edits) { if (!t.includes(a)) throw new Error(`mutant ${tag}: pattern not found in ${file}`); t = t.replace(a, b); }
    t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
    const f = path.join(SCRATCH, `mut_${tag}_${file}`); fs.writeFileSync(f, t); return import(pathToFileURL(f).href);
  };
  const A0 = { call: 5, a: 3, to: 9, rFrom: 3, rTo: 9, fresh: true, legal: false, blocked: false };
  const dm = [
    ['M9.reset-classified-from-the-first-of-several-arrivals', [["if (!Array.isArray(arrivalsOfCall) || arrivalsOfCall.length !== 1) return 'UNCLASSIFIED';", "if (!Array.isArray(arrivalsOfCall) || arrivalsOfCall.length === 0) return 'UNCLASSIFIED';"]], (D) => D.classifyReset({ from: 3, to: 9 }, [A0, A0]) !== 'UNCLASSIFIED'],
    ['M10.fresh-but-misaligned-forced-into-stale', [["return x.fresh ? 'UNCLASSIFIED' : 'STALE';", "return 'STALE';"]], (D) => D.classifyArrival({ ...A0, rFrom: 7, fresh: true }) !== 'UNCLASSIFIED'],
    ['M11.target-mismatch-not-checked', [["if (Number(x.rTo) !== Number(x.to)) return 'UNCLASSIFIED';", ""]], (D) => D.classifyArrival({ ...A0, rTo: 8 }) !== 'UNCLASSIFIED'],
    ['M12.blocked-arrivals-counted-as-illegal-executions', [["if (x.blocked) b.blocked++; else { b.illegalExecuted++; illegalExecuted++; }", "b.illegalExecuted++; illegalExecuted++; if (x.blocked) b.blocked++;"]],
      (D) => D.summarizeDiag({ arrivals: [{ call: 0, a: 1, to: 9, rFrom: 2, rTo: 9, fresh: false, legal: false, blocked: true }], resets: [], isEdge: () => false }).illegalExecuted !== 0],
    ['M13.store-attribution-prefers-skip-over-executed', [["attribution[c && c.EXEC > 0 ? 'EXECUTED' : c && c.SKIP > 0 ? 'SKIP' : 'UNRECORDED']++;", "attribution[c && c.SKIP > 0 ? 'SKIP' : c && c.EXEC > 0 ? 'EXECUTED' : 'UNRECORDED']++;"]],
      (D) => D.storeDiagnostics([{ nodes: [1, 3] }], DG.adjacency([{ from: 1, to: 2 }, { from: 2, to: 3 }]), 9, new Map([['1->3', { EXEC: 1, SKIP: 1 }]])).attribution.EXECUTED !== 1],
    ['M14.buffer-window-not-shifted', [["while (exp.length > PATH_WINDOW) exp.shift();", ""]], (D) => J(D.appendedPair([1, 2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 7], { a: 6, to: 7 })) !== J({ pair: [6, 7], kind: 'EXEC', consistent: true })],
  ];
  for (const [id, edits, pred] of dm) { const D = await loadMut('diag.mjs', edits, id.split('.')[0]); mutant(id, pred(D)); }
  // analysis / config mutants (fixtures from section A)
  const clone2 = (b) => ({ records: new Map([...b.records.entries()].map(([k2, v]) => [k2, clone(v)])), trainRecords: new Map([...b.trainRecords.entries()].map(([k2, v]) => [k2, clone(v)])), plan: clone(b.plan), controls: clone(b.controls) });
  const am = [
    ['M15.primary-uses-every-reset-instead-of-legal-reaches', 'analyze.mjs', [["const diff = (a, b, k) => (w) => val(a, k)(w) - val(b, k)(w);", "const diff = (a, b, k) => (w) => val(a, k === 'legal' ? 'all' : k)(w) - val(b, k === 'legal' ? 'all' : k)(w);"]], FX.clean],
    ['M16.family-uses-the-unadjusted-level', 'analyze.mjs', [["const FAM = C.BOOT_FAMILY;", "const FAM = C.BOOT_95;"]], () => mkBlock({ table: tb({ G_both: 14 }), n: 40, sd: 14 })],
    ['M17.bundle-incompleteness-does-not-void', 'analyze.mjs', [["if (inst.I3.status !== 'OK') for (const k of Object.keys(voided)) voided[k].push('I3');", ""]], () => mkBlock({ tweak: ({ records }) => { const r = records.get(`gfs-U_both-w${WS + 3}`); r.diag.illegalExecuted = 2; r.guardCompleteness.illegalExecutions = 2; } })],
    ['M18.training-fidelity-does-not-void', 'analyze.mjs', [["if (inst.I5.status !== 'OK') { voided.PS1.push('I5'); voided.PS2.push('I5'); }", ""]], () => mkBlock({ tweak: ({ trainRecords, controls }) => { trainRecords.get(`gfs-trainG-w${WS + 2}`).store.attribution.EXECUTED = 3; controls[WS + 2].G.attribution.EXECUTED = 3; } })],
    ['M19.retrofit-instrument-ignored', 'analyze.mjs', [["if (inst.I6.status !== 'OK') voided.PS2.push('I6');", ""]], () => mkBlock({ table: tb({ U_both: -5, U_mask: 3 }) })],
    ['M20.harm-rule-uses-the-lower-bound', 'analyze.mjs', [["if (g.PS2.ci.upper < 0) harm.PS2.push(gl);", "if (g.PS2.ci.lower < 0) harm.PS2.push(gl);"]], () => mkBlock({ table: tb({ G_both: 6 }) })],
    ['M21.condition-integrity-ignored', 'analyze.mjs', [["invalid.push(...integrityProblems(rec.conditionIntegrity));\n  if (rec.endpoints", "if (rec.endpoints"]], () => mkBlock({ tweak: ({ records }) => { const r = records.get(`gfs-U_off-w${WS + 3}`); r.conditionIntegrity.envDraws = 12; r.conditionIntegrity.ok = false; } })],
    ['M22.undeclared-cell-records-accepted', 'analyze.mjs', [["if (!m || !CELL[m[1]]) problems.push(", "if (false) problems.push("]], () => mkBlock({ tweak: ({ records }) => { records.set(`gfs-U_exec-w${WS + 2}`, clone(records.get(`gfs-U_both-w${WS + 2}`))); } })],
    // the per-cell delivery check and the per-world identity check are deliberately redundant; removing BOTH for the G store must be caught
    ['M23.g-store-delivery-and-identity-checks-removed', 'analyze.mjs', [["const ctl = c[cell.store];", "const ctl = c.U;"], ["for (const k of ['U', 'G']) if (hashes[k].size !== 1", "for (const k of ['U']) if (hashes[k].size !== 1"]],
      // the fault: G_both was given the U store in EVERY world (an orchestrator store-path bug)
      () => mkBlock({ tweak: ({ records, controls, plan }) => { for (const w of plan.validWorlds) { const r = records.get(`gfs-G_both-w${w}`); r.brain.deliveredHashes.episodes = controls[w].U.storeHash; r.brain.start.hashes.episodes = controls[w].U.storeHash; } } })],
    ['M24.diagnostic-accounting-not-checked', 'analyze.mjs', [["I9.push(...diagProblems(rec));", ""]], () => mkBlock({ tweak: ({ records }) => { records.get(`gfs-U_mask-w${WS + 3}`).diag.blocked = 4; } })],
    ['M25.ps3-superior-read-as-sufficient', 'config.mjs', [["if (ci.upper <= -d()) return 'MASK_SUPERIOR';", ""]], FX.maskSuperior],
    ['M26.ps1-neutral-band-widened', 'config.mjs', [["if (ci.lower > -d() && ci.upper < d()) return 'SCOPE_NEUTRAL';", "if (ci.lower > -2 * d() && ci.upper < 2 * d()) return 'SCOPE_NEUTRAL';"]], () => mkBlock({ table: tb({ G_both: 20 }) })],
    ['M27.specification-ignores-harm', 'config.mjs', [["if (ps2 === 'PACKAGE_HARMS' || harmFlags > 0)", "if (ps2 === 'PACKAGE_HARMS')"]], () => mkBlock({ table: tb({ G_both: 80 }), perGoal: { G_both: { 12: -95 } } })],
    ['M28.stale-support-threshold-lowered', 'config.mjs', [["supportShare: 0.90,", "supportShare: 0.50,"]], () => mkBlock({ staleShare: 0.6 })],
  ];
  const truth = (o) => (o.valid ? J([o.labels, ['PS1', 'PS2', 'PS3'].map(k2 => o.primary[k2].legal.ci), o.instruments.I2.status, o.instruments.I3.status, o.instruments.I5.status, o.instruments.I6.status, o.instruments.I9.status, o.harmFlags, o.specification.justified]) : 'INVALID');
  for (const [id, file, edits, fx] of am) {
    const tag = id.split('.')[0];
    const mod = await loadMut(file, edits, tag);
    let evalFn = mod.evaluateBlock;
    if (file === 'config.mjs') {
      let a = fs.readFileSync(path.join(HERE, 'analyze.mjs'), 'utf8').replace("import * as C from './config.mjs';", `import * as C from '${pathToFileURL(path.join(SCRATCH, `mut_${tag}_config.mjs`)).href}';`);
      a = a.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
      const af = path.join(SCRATCH, `mut_${tag}_analyze_cfg.mjs`); fs.writeFileSync(af, a);
      evalFn = (await import(pathToFileURL(af).href)).evaluateBlock;
    }
    const b = fx();
    mutant(id, truth(evaluateBlock(clone2(b))) !== truth(evalFn(clone2(b))), 'claims identical under the mutant');
  }
  // design mutant: re-adding the pathological execution-guard-only cell must fail the declared-design predicate
  const K = { ...C, CELLS: [...C.CELLS, { name: 'U_exec', store: 'U', guard: 'exec' }], CELL_NAMES: [...C.CELL_NAMES, 'U_exec'], GUARD_SETTINGS: { ...C.GUARD_SETTINGS, exec: { mask: false, exec: true } } };
  mutant('M29.re-adding-the-execution-guard-only-cell-fails-the-declared-design', designOk(C) && !designOk(K));
}

console.log(`\nGATE-FLOOR-SCOPE (design C') gate: ${passed} checks passed, ${failed} failed; mutants ${caught} caught, ${missed} missed`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
fs.rmSync(SCRATCH, { recursive: true, force: true });

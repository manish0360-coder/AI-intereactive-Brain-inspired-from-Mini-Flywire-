// ==========================================================
// GATE-FLOOR-INTERACTION — verification gate (design and instrument integrity; prints NO confirmatory endpoint)
// ==========================================================
//   node experiments/gate-floor-interaction/verify_gatefloorinteraction.mjs
// Sections
//   S  static     : exact HEAD source identity and clean earlier-study tree, declarations bound into the digests, the two guard lines pinned,
//                   and the S5 STATIC INVARIANT (window.lastReasoning is never cleared) on the bare, derived and guard sources
//   T  transform  : the guard tree = the PRODSEM derived tree + exactly two guarded lines; refusals
//   N  neutrality : bare HEAD == derived == guard-lines-present-off == measured OFF == armed-off (decisions, environment, RNG draws, Q/credit,
//                   end state); guard-ON structure and determinism; guard completeness; refusals
//   L  scope      : the first candidate-level difference of guard ON vs OFF is a dropped non-graph candidate
//   A  analysis   : labels, instrument voiding, harm flags, flags, sensitivity and refusals on exact fixtures
//   P  power      : n from the development calibration; fresh worlds and seeds; stream seam
//   E  results    : recorded block consistency (skipped until results exist)
//   M  mutants    : deliberately broken transform / analysis / S5 source must be caught (anti-vacuity)
// Sessions run on XFER-1 development worlds 1-3 (outside every study world); none is a confirmatory outcome.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateAcceptedStream } from '../m7/env.js';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import * as X1 from '../xfer1/config.mjs';
import { prng, pairedSummary } from '../xfer1/stats.mjs';
import { makeGraph, entryStore } from '../xfer2/controls.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';
import { continueStream } from '../gate-floor1/stream.mjs';
import { summarizeEvents } from '../gate-floor1/finalhop.mjs';
import { buildHeadTree, runtimePaths, FLOOR_LINE, PROBE_LINE } from '../gate-floor-prodsem/transform.mjs';
import * as PC from '../gate-floor-prodsem/config.mjs';
import * as C from './config.mjs';
import { transformMain, buildGuardTree, ADMIT_LINE, EXEC_LINE, ADMIT_ANCHOR, EXEC_ANCHOR } from './transform.mjs';
import { evaluateBlock } from './analyze.mjs';
import { lastReasoningInvariant } from './static_checks.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + detail)); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log((ok ? 'CAUGHT ' : 'MISSED ') + id + (ok || !detail ? '' : ' :: ' + detail)); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'gfi-verify-'));
const gitOut = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
const isRuntime = (p) => p === 'main.js' || p === 'connections.json' || p === 'neurons.json' || p === 'index.html' || p.startsWith('render/') || p.startsWith('instrumentation/') || p.startsWith('experiments/m7/');

const bare = buildHeadTree({ derived: false });
const derived = buildHeadTree({ derived: true });
const guard = buildGuardTree();
const mainH = fs.readFileSync(path.join(bare.dir, 'main.js'), 'utf8');
const mainD = fs.readFileSync(path.join(derived.dir, 'main.js'), 'utf8');
const mainG = fs.readFileSync(path.join(guard.dir, 'main.js'), 'utf8');
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];
const ISEDGE = (a, b) => g.directed.has(`${a}->${b}`);

// ============ S: static ============
{
  const hc = gitOut(['cat-file', '-t', C.HEAD_COMMIT]);
  check('S1.the-audited-commit-exists-and-is-an-ancestor-of-the-current-head', hc.status === 0 && hc.stdout.trim() === 'commit' && gitOut(['merge-base', '--is-ancestor', C.HEAD_COMMIT, 'HEAD']).status === 0);
  const rd = gitOut(['diff', '--name-only', C.HEAD_COMMIT, 'HEAD', '--', ...runtimePaths().filter(isRuntime)]);
  check('S1.no-runtime-file-changed-between-the-audited-commit-and-the-current-head', rd.status === 0 && rd.stdout.trim() === '', rd.stdout.trim().slice(0, 200));
  const wt = gitOut(['status', '--porcelain', '--untracked-files=no', '--', 'main.js', 'render', 'instrumentation', 'connections.json', 'neurons.json', 'index.html', 'experiments/m7', 'experiments/h1r', 'experiments/xfer1', 'experiments/xfer2', 'experiments/gate-floor1', 'experiments/gate-floor-b2', 'experiments/gate-floor-head', 'experiments/gate-floor-prodsem', 'experiments/mcf1', 'experiments/registry']);
  check('S1.production-worktree-is-clean-and-no-earlier-study-file-is-modified', wt.status === 0 && wt.stdout.trim() === '', wt.stdout.trim().slice(0, 200));
  check('S1.working-tree-main-equals-the-audited-blob', sha(fs.readFileSync(path.join(ROOT, 'main.js'))) === C.TREE.headMainSha256 && gitOut(['rev-parse', C.HEAD_COMMIT + ':main.js']).stdout.trim() === C.TREE.headMainBlob);
  check('S2.pins-are-the-content-hashes-of-the-built-trees', sha(mainH) === C.TREE.headMainSha256 && sha(mainD) === C.TREE.derivedMainSha256 && sha(mainG) === C.GUARD_TREE.guardMainSha256 && C.GUARD_TREE.baseDerivedMainSha256 === C.TREE.derivedMainSha256);
  check('S2.the-two-guard-lines-are-pinned-by-content', sha(ADMIT_LINE) === C.GUARD_TREE.admitLineSha256 && sha(EXEC_LINE) === C.GUARD_TREE.execLineSha256
    && guard.manifest.gatefloorinteraction.admitLineSha256 === C.GUARD_TREE.admitLineSha256 && guard.manifest.gatefloorinteraction.execLineSha256 === C.GUARD_TREE.execLineSha256);
  check('S2.the-substrate-pins-are-the-prodsem-ones', C.HEAD_COMMIT === PC.HEAD_COMMIT && C.TREE === PC.TREE && C.TC_FLOOR === PC.TC_FLOOR && C.CONFIRMATORY_STATE === 'P' && C.HOOK_STATES === PC.HOOK_STATES);
  check('S3.declared-design', C.CELLS.length === 8 && new Set(C.CELL_NAMES).size === 8 && C.WORLDS_N === 280 && C.PER_GOAL === 70 && C.WORLD_START === 1112 && C.WORLD_START === PC.BLOCKS.P.hi + 1 && C.SESSIONS_PER_WORLD === 9
    && C.MARGIN.delta === 20 && C.MARGIN.coldFloorMinBenefit === PC.MARGIN.minBenefit && C.FAMILY_SIZE === 3 && Math.abs(C.BOOT_FAMILY.level - (1 - 0.05 / 3)) < 1e-12 && C.BOOT_95.level === 0.95
    && C.blockOf(1111) === null && C.blockOf(1112) === 'I' && C.blockOf(1391) === 'I' && C.blockOf(1392) === null);
  check('S3.factors-and-cells-are-the-full-2x2x2', C.CELLS.every(c => ['COLD', 'REAL'].includes(c.store) && [0, 1].includes(c.floor) && [0, 1].includes(c.guard))
    && ['COLD', 'REAL'].every(s => [0, 1].every(f => [0, 1].every(gg => C.CELL_NAMES.includes(C.cellName(s, f, gg))))));
  check('S3.mandatory-limits-and-bundle-scope-are-declared', C.CLASSIFICATION === PC.CLASSIFICATION && C.DEVIATIONS === PC.DEVIATIONS && C.CLAIM_LIMITS === PC.CLAIM_LIMITS && /BUNDLE/.test(C.RULES.scope) && /no effect is attributed to either component/.test(C.RULES.scope));
  const lit = (o = {}) => C.hashObject({ schema: C.SCHEMA, head: C.HEAD_COMMIT, tree: C.TREE, guardTree: C.GUARD_TREE, factors: C.FACTORS, cells: C.CELL_NAMES, claims: C.CLAIMS, instruments: C.INSTRUMENTS, rules: C.RULES,
    margin: C.MARGIN, familySize: C.FAMILY_SIZE, flags: C.FLAGS, bootstrap: C.BOOTSTRAP, outcome: C.OUTCOME, ticks: C.TICKS, tcFloor: C.TC_FLOOR, floorBase: C.FLOOR_BASE_VALUE,
    worlds: { start: C.WORLD_START, n: C.WORLDS_N, perGoal: C.PER_GOAL, goals: C.GOALS }, calibration: C.CALIBRATION, configStart: C.CONFIG_START, hookStates: C.HOOK_STATES,
    confirmatoryState: C.CONFIRMATORY_STATE, classification: C.CLASSIFICATION, deviations: C.DEVIATIONS, claimLimits: C.CLAIM_LIMITS, ...o });
  check('S4.decision-digest-binds-the-declared-parameters', lit() === C.decisionDigest() && lit({ margin: { ...C.MARGIN, delta: 25 } }) !== C.decisionDigest() && lit({ familySize: 2 }) !== C.decisionDigest()
    && lit({ worlds: { start: 1000, n: 280, perGoal: 70, goals: C.GOALS } }) !== C.decisionDigest() && lit({ cells: C.CELL_NAMES.slice(0, 6) }) !== C.decisionDigest()
    && lit({ guardTree: { ...C.GUARD_TREE, execLineSha256: 'x' } }) !== C.decisionDigest() && lit({ flags: { ...C.FLAGS, blockedShareOfCalls: 0.2 } }) !== C.decisionDigest()
    && lit({ confirmatoryState: 'E' }) !== C.decisionDigest() && lit({ head: '0'.repeat(40) }) !== C.decisionDigest());
  check('S4.design-digest-binds-the-schema', C.designDigest() !== C.decisionDigest() && /^[0-9a-f]{64}$/.test(C.designDigest()));
  // S5 (the single required correction of the independent review): window.lastReasoning is never cleared in the pinned sources
  const s5 = [['bare HEAD', mainH], ['PRODSEM derived', mainD], ['guard tree', mainG]].map(([n, t]) => [n, lastReasoningInvariant(t)]);
  check('S5.window-lastreasoning-is-never-cleared-in-the-pinned-sources', s5.every(([, r]) => r.ok && r.writes.length === 1 && r.writes[0].kind === 'assign' && r.writes[0].objectLiteral === true),
    s5.map(([n, r]) => `${n}: ${r.problems.join('; ')}`).join(' | '));
  check('S5.the-single-write-is-the-decision-record-and-the-three-sources-agree', new Set(s5.map(([, r]) => r.writes[0].line)).size >= 1 && s5.every(([, r]) => r.writes[0].text.replace(/\s+/g, '') === 'window.lastReasoning='));
  const bad = [];
  for (const f of fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_gatefloorinteraction.mjs')) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Math\.random|performance\.now/.test(t)) bad.push(f + ': ambient randomness or clock');
    if (/Date\.now|new Date\(/.test(t)) bad.push(f + ': wall clock');
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(f + ': sets a stage authorisation');
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(f + ': local absolute path');
  }
  check('S6.source-hygiene', bad.length === 0, bad.join('; '));
}

// ============ T: transform ============
{
  const a = mainD.split('\n'), b = mainG.split('\n');
  const ia = b.indexOf(ADMIT_LINE), ie = b.indexOf(EXEC_LINE);
  check('T1.exactly-two-lines-added-to-the-derived-source', b.length === a.length + 2 && ia > 0 && ie > ia);
  check('T1.admit-precedes-its-anchor-and-exec-precedes-its-anchor', b[ia + 1] === ADMIT_ANCHOR && b[ie + 1] === EXEC_ANCHOR);
  check('T1.removing-the-two-lines-restores-the-derived-source-byte-for-byte', b.filter((_, k) => k !== ia && k !== ie).join('\n') === mainD);
  check('T2.guards-read-the-undefined-global-first', /^\s*if \(globalThis\.__GFGUARD__ && globalThis\.__GFGUARD__\.admit\(/.test(ADMIT_LINE) && /^\s*if \(globalThis\.__GFGUARD__ && globalThis\.__GFGUARD__\.on && /.test(EXEC_LINE));
  check('T2.every-other-file-is-byte-identical-to-the-derived-tree', Object.entries(derived.manifest.files).every(([p, h]) => p === 'main.js' || guard.manifest.files[p] === h) && Object.keys(guard.manifest.files).length === 147);
  check('T2.the-floor-line-and-the-probe-are-untouched', mainG.includes(FLOOR_LINE) && mainG.includes(PROBE_LINE));
  const refuses = (t) => { try { transformMain(t); return false; } catch { return true; } };
  check('T3.refuses-a-missing-or-duplicated-admit-anchor', refuses(mainD.replace(ADMIT_ANCHOR, '    if (false) {')) && refuses(mainD.replace(ADMIT_ANCHOR, ADMIT_ANCHOR + '\n' + ADMIT_ANCHOR)));
  check('T3.refuses-a-missing-or-duplicated-exec-anchor', refuses(mainD.replace(EXEC_ANCHOR, '  let nextStep = null;')) && refuses(mainD.replace(EXEC_ANCHOR, EXEC_ANCHOR + '\n' + EXEC_ANCHOR)));
  check('T3.refuses-an-already-tagged-source-and-a-missing-null-check', refuses(mainG) && refuses(mainD.replace('  if (!reasoning) return;\n  const currentNeuron', '  const currentNeuron')));
}

// ============ N: whole-session neutrality, guard structure, refusals (XFER-1 development worlds 1-3) ============
const WORLDS = generateAcceptedStream(X1.CONFIG_START, 4);
const SESS = path.join(HERE, 'session.mjs');
function session(input, script = SESS) {
  const r = spawnSync(process.execPath, [script, JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
  return { rec: m ? JSON.parse(m[1]) : null, code: r.status, err: r.stderr.slice(-300) };
}
const inputFor = (w, extra = {}) => ({ role: 'test', label: 'g', world: w, configSeed: WORLDS[w].acceptedSeed, configIndex: WORLDS[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', cond: 'P', ...extra });
const ok = (x) => x && x.rec && !x.rec.outcome.crashed && x.rec.outcome.completed;
const REC = {};
{
  const bareView = (r) => ({ fp: r.fingerprint, ticks: r.outcome.ticksExecuted, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, env: r.artifacts.envCounters, qs: r.artifacts.qSum, qe: r.artifacts.qEntries, end: r.endHash });
  const instView = (r) => ({ fp: r.artifacts.fingerprint, ticks: r.outcome.ticksExecuted, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, env: r.artifacts.envCounters, qs: r.artifacts.qSum, qe: r.artifacts.qEntries, end: r.brain.endHash });
  let allOk = true; const why = [];
  for (const w of [1, 2, 3]) for (const withStore of [false, true]) {
    if (withStore && w !== 1) continue;
    let store = {};
    if (withStore) { const f = path.join(SCRATCH, `entry_w${w}.json`); fs.writeFileSync(f, JSON.stringify({ episodes: entryStore(g, labelOf, WORLDS[w].goal) })); store = { arm: 'ONLY_episodes', brainPath: f, brainWorld: w }; }
    const base = { ...inputFor(w, store) };
    const bareP = session({ ...base, tree: bare.dir, floor: 'off', guard: 'off', instrument: false });
    const bareD = session({ ...base, tree: derived.dir, floor: 'off', guard: 'off', instrument: false });
    const bareG = session({ ...base, tree: guard.dir, floor: 'off', guard: 'off', instrument: false });
    const instD = session({ ...base, tree: derived.dir, floor: 'off', guard: 'off', instrument: true });
    const instOff = session({ ...base, tree: guard.dir, floor: 'off', guard: 'off', instrument: true });
    const armed = session({ ...base, tree: guard.dir, floor: 'armedOff', guard: 'armedOff', instrument: true });
    if (![bareP, bareD, bareG, instD, instOff, armed].every(ok)) { allOk = false; why.push(`w${w}${withStore ? '+store' : ''}: a session did not complete ${[bareP, bareD, bareG, instD, instOff, armed].map(x => x.err).join('|').slice(0, 160)}`); continue; }
    const j = (o) => JSON.stringify(o), tag = `w${w}${withStore ? '+store' : ''}`;
    const ref = j(bareView(bareP.rec));
    if (j(bareView(bareD.rec)) !== ref) { allOk = false; why.push(`${tag}: derived-bare differs`); }
    if (j(bareView(bareG.rec)) !== ref) { allOk = false; why.push(`${tag}: guard-lines-present bare differs`); }
    if (j(instView(instD.rec)) !== ref) { allOk = false; why.push(`${tag}: instrumented derived differs`); }
    if (j(instView(instOff.rec)) !== ref) { allOk = false; why.push(`${tag}: measured OFF (guard tree) differs`); }
    if (j(instView(armed.rec)) !== ref) { allOk = false; why.push(`${tag}: armed-off (floor + guard) differs`); }
    if (armed.rec.floor.counters.raised !== 0 || armed.rec.guard.on !== false || armed.rec.guard.counters.maskedOut !== 0 || armed.rec.guard.counters.blockedIllegal !== 0) { allOk = false; why.push(`${tag}: armed-off acted`); }
    if (withStore && instOff.rec.brain.start.hashes.episodes !== instOff.rec.brain.deliveredHashes.episodes) { allOk = false; why.push('delivery inexact'); }
    REC[tag] = { instOff: instOff.rec, bare: bareP.rec };
  }
  check('N1.bare-head-equals-derived-equals-guard-lines-present-equals-measured-off-equals-armed-off', allOk, why.join('; '));
  check('N1.compared-quantities-include-decisions-environment-draws-and-end-state', Object.keys(bareView(REC.w1.bare)).join() === 'fp,ticks,cog,vis,env,qs,qe,end' && REC.w1.instOff.artifacts.writesSha256 !== undefined);
}
{
  // guard ON: structure, completeness, determinism (with and without the floor)
  const results = {};
  for (const w of [1, 2]) {
    const base = { ...inputFor(w), tree: guard.dir, instrument: true, traceWrites: true };
    const off = session({ ...base, floor: 'off', guard: 'off' }), on1 = session({ ...base, floor: 'off', guard: 'on' }), on2 = session({ ...base, floor: 'off', guard: 'on' });
    const fon1 = session({ ...base, floor: 'on', guard: 'on' }), fon2 = session({ ...base, floor: 'on', guard: 'on' });
    results[w] = { off, on1, on2, fon1, fon2 };
  }
  const R1 = results[1], R2 = results[2];
  check('N2.guard-on-sessions-completed', [R1, R2].every(r => Object.values(r).every(ok)));
  const det = (a, b) => a.rec.artifacts.fingerprint === b.rec.artifacts.fingerprint && JSON.stringify(a.rec.guard) === JSON.stringify(b.rec.guard) && JSON.stringify(a.rec.floor) === JSON.stringify(b.rec.floor) && a.rec.brain.endHash === b.rec.brain.endHash;
  check('N2.guard-on-is-deterministic-with-and-without-the-floor', det(R1.on1, R1.on2) && det(R2.on1, R2.on2) && det(R1.fon1, R1.fon2) && det(R2.fon1, R2.fon2));
  check('N2.guard-on-changes-behaviour', R1.on1.rec.artifacts.fingerprint !== R1.off.rec.artifacts.fingerprint && R2.on1.rec.artifacts.fingerprint !== R2.off.rec.artifacts.fingerprint && R1.on1.rec.guard.counters.maskedOut > 0);
  const complete = (r) => r.rec.guardCompleteness.ok === true && r.rec.reaches.nonEdge === 0 && r.rec.moveClass.nonGraph === 0 && r.rec.guard.counters.admitted === 0 && r.rec.reaches.goal === r.rec.reaches.legal;
  check('N2.guard-completeness-holds-in-every-guard-on-session', [R1.on1, R1.fon1, R2.on1, R2.fon1].every(complete));
  check('N2.guard-off-sessions-show-an-inert-guard-and-something-to-remove', [R1.off, R2.off].every(r => r.rec.guardCompleteness.ok === true && r.rec.guard.counters.maskedOut === 0 && r.rec.guard.counters.blockedIllegal === 0)
    && (R1.off.rec.moveClass.nonGraph > 0 || R2.off.rec.moveClass.nonGraph > 0) && (R1.off.rec.reaches.nonEdge > 0 || R2.off.rec.reaches.nonEdge > 0), 'the guard-off development sessions had no non-graph move to remove');
  check('N2.floor-audit-and-condition-integrity-hold-under-the-guard', [R1.fon1, R2.fon1].every(r => r.rec.floor.counters.lowered === 0 && r.rec.floor.counters.raised > 0 && r.rec.conditionIntegrity.ok === true
    && Object.keys(r.rec.floor.byEdge).every(k => { const [u, v] = k.split('->').map(Number); return v === r.rec.input.goal && ISEDGE(u, v); })));
  check('N2.executed-moves-under-the-guard-are-all-legal-edges', [R1.on1, R2.on1].every(r => r.rec.artifacts.writes.filter(x => typeof x === 'string').every(x => { const m = /^(\d+)->(\d+)$/.exec(x); return !m || m[1] === m[2] || ISEDGE(Number(m[1]), Number(m[2])); })));
  REC.guardOn = { w1: R1.on1.rec, w2: R2.on1.rec, off1: R1.off.rec };
}
{
  const base = { ...inputFor(1), tree: guard.dir };
  const refuses = (o, env = {}) => { const r = spawnSync(process.execPath, [SESS, JSON.stringify(o)], { encoding: 'utf8', env: { ...process.env, ...env } }); return r.status !== 0 && /GATE-FLOOR-INTERACTION session refused/.test(r.stderr); };
  const { cond: _c, ...noCond } = base;
  check('N3.refuses-guard-on-the-bare-run-and-on-a-tree-without-the-guard', refuses({ ...base, floor: 'off', guard: 'on', instrument: false }) && refuses({ ...base, tree: derived.dir, floor: 'off', guard: 'on', instrument: true })
    && refuses({ ...base, tree: bare.dir, floor: 'off', guard: 'armedOff', instrument: true }));
  check('N3.refuses-a-missing-or-unknown-guard-and-a-non-confirmatory-state', refuses({ ...base, floor: 'off', instrument: true }) && refuses({ ...base, floor: 'off', guard: 'maybe', instrument: true })
    && refuses({ ...noCond, floor: 'off', guard: 'off', instrument: true }) && refuses({ ...base, cond: 'H', floor: 'off', guard: 'off', instrument: true }));
  check('N3.refuses-a-guarded-training-session-and-a-floor-on-training-session', refuses({ ...base, role: 'train', arm: undefined, agentSeed: X1.trainSeed(1), ticks: 1500, floor: 'off', guard: 'on', instrument: true })
    && refuses({ ...base, role: 'train', arm: undefined, agentSeed: X1.trainSeed(1), ticks: 1500, floor: 'on', guard: 'off', instrument: true }));
  check('N3.refuses-a-wrong-seed-and-h1r-on', refuses({ ...base, agentSeed: X1.testSeed(1) + 2, floor: 'off', guard: 'off', instrument: true }) && refuses({ ...base, floor: 'off', guard: 'off', instrument: true }, { H1R: 'on' }));
}

// ============ L: candidate-level scope of the guard ============
const CAND_ANCHOR = '  choices.push({\n    key: k,\n    weight: arbitratedScore\n  });';
const CAND_LINE = '  if (globalThis.__GFB2_CAND__) globalThis.__GFB2_CAND__(step, k, arbitratedScore, currentKey); // GATE-ONLY observational call';
const candTreeFrom = (baseDir, tag, edit = (x) => x) => {
  const dir = path.join(SCRATCH, 'tree_' + tag);
  fs.cpSync(baseDir, dir, { recursive: true });
  const p = path.join(dir, 'main.js');
  let txt = fs.readFileSync(p, 'utf8');
  if (txt.split(CAND_ANCHOR).length !== 2) throw new Error('candidate anchor must match exactly once');
  txt = edit(txt).replace(CAND_ANCHOR, CAND_ANCHOR + '\n' + CAND_LINE);
  fs.writeFileSync(p, txt);
  return dir;
};
function candSession(dir, mode, input = {}) {
  let src = fs.readFileSync(SESS, 'utf8');
  const swap = (a, b) => { if (!src.includes(a)) throw new Error('candidate driver anchor missing: ' + a.slice(0, 60)); src = src.replace(a, b); };
  swap("if (mainSha !== (isGuard ? GUARD_TREE.guardMainSha256 : isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(", "if (false) refuse(");
  // the call index of the FIRST guard action (a masked candidate or a blocked move) is recorded so the scope test can assert that nothing
  // differs before the guard first acts
  swap("const counters = { admittedGraph: 0, admitted: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };",
    "const counters = { admittedGraph: 0, admitted: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0 }; let _bl = 0; Object.defineProperty(counters, 'blockedIllegal', { enumerable: true, get() { return _bl; }, set(v) { if (v > _bl) (globalThis.__GFB2_FIRST__ ||= []).push(['blocked', calls - 1]); _bl = v; } });");
  swap("if (GUARD.on) { counters.maskedOut++; return false; }", "if (GUARD.on) { counters.maskedOut++; (globalThis.__GFB2_FIRST__ ||= []).push(['mask', calls - 1]); return false; }");
  swap("globalThis.__GFB2__ = {", "globalThis.__GFB2_CANDS__ = []; globalThis.__GFB2_CAND__ = (s, k, w, from) => { globalThis.__GFB2_CANDS__.push([calls - 1, s, Number(k), w, Number(from)]); }; globalThis.__GFB2__ = {");
  swap("process.stdout.write('\\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\\n');", "out.candidates = globalThis.__GFB2_CANDS__; out.firstActions = globalThis.__GFB2_FIRST__ || []; process.stdout.write('\\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\\n');");
  const f = path.join(HERE, '.__cand_session_' + path.basename(dir) + '_' + mode + '.mjs');
  fs.writeFileSync(f, src);
  try {
    const r = spawnSync(process.execPath, [f, JSON.stringify({ ...inputFor(1), tree: dir, floor: 'off', guard: mode, instrument: true, traceWrites: true, ...input })], { encoding: 'utf8', maxBuffer: 1 << 29 });
    const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
    return m ? JSON.parse(m[1]) : null;
  } finally { fs.rmSync(f, { force: true }); }
}
const candDiff = (A, B) => { const n = Math.min(A.length, B.length); for (let i = 0; i < n; i++) for (let j = 0; j < 5; j++) if (A[i][j] !== B[i][j]) return i; return A.length === B.length ? -1 : n; };
const CAND_TREE = candTreeFrom(guard.dir, 'cand');
const CAND = { off: candSession(CAND_TREE, 'off'), on: candSession(CAND_TREE, 'on'), armed: candSession(CAND_TREE, 'armedOff') };
{
  const { off, on, armed } = CAND;
  check('L1.candidate-sessions-ran', [off, on, armed].every(x => x && !x.outcome.crashed && x.outcome.completed && Array.isArray(x.candidates) && x.candidates.length > 1000));
  const d = candDiff(off.candidates, on.candidates);
  check('L1.guard-on-changes-the-candidate-stream', d >= 0);
  if (d >= 0) {
    const o = off.candidates[d];
    const acts = (on.firstActions || []).slice().sort((a, b) => a[1] - b[1]), first = acts[0];
    check('L1.guard-on-acted-and-its-first-action-is-recorded', !!first && first[1] >= 0, JSON.stringify(acts.slice(0, 3)));
    check('L1.no-candidate-differs-before-the-first-guard-action', !!first && o[0] >= first[1] && candDiff(off.candidates.slice(0, d), on.candidates.slice(0, d)) === -1, JSON.stringify({ firstAction: first, firstDifference: o }));
    check('L1.a-first-action-that-is-a-mask-removes-a-non-graph-candidate', !first || first[0] !== 'mask' || (ISEDGE(o[4], o[2]) === false && o[4] !== o[2]), JSON.stringify({ firstAction: first, firstDifference: o }));
    console.log('INFO first guard action ' + JSON.stringify(first) + '; first candidate-level difference at call ' + o[0] + ' (descriptive)');
  }
  check('L1.armed-but-off-candidate-stream-equals-off', candDiff(off.candidates, armed.candidates) === -1 && off.candidates.length === armed.candidates.length && armed.guard.counters.maskedOut === 0 && armed.guard.counters.blockedIllegal === 0);
  check('L1.guard-on-admits-only-graph-neighbours', on.candidates.every(c => ISEDGE(c[4], c[2])) || on.candidates.filter(c => !ISEDGE(c[4], c[2])).length === 0, 'a non-graph candidate was admitted under the guard');
  check('L1.guard-off-admits-some-non-graph-candidates', off.candidates.some(c => !ISEDGE(c[4], c[2]) && c[4] !== c[2]));
}

// ============ A: analysis fixtures ============
const WS = C.WORLD_START;
const baseTable = { COLD_F0_G0: 0, COLD_F0_G1: 12, COLD_F1_G0: 80, COLD_F1_G1: 74, REAL_F0_G0: 2, REAL_F0_G1: 50, REAL_F1_G0: 40, REAL_F1_G1: 84 };
const okIntegrity = () => ({ cond: 'P', hooks: { arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off', passEnv: false }, envDraws: 0, envAttempts: 0, envSlips: 0, drawsLogged: 0, harnessAttempts: 0, harnessSlips: 0,
  creditKeys: 0, creditRejected: 0, peLaCalls: 0, peDampCalls: 0, traversal: { attempts: 900, successes: 900, edgesObserved: 60, edgesWithSlip: 0, maxCostEstimate: 1 }, episodeCapArmed: true, replayDeterministic: true, ok: true });
const mkBlock = ({ table = baseTable, nonGraphG0 = 80, perGoal = {}, n = 40, sd = 12, seed = 11, tweak = null, blocked = 30 } = {}) => {
  const r = prng(seed), noise = () => (r() + r() + r() - 1.5) * sd * 1.6;
  const records = new Map(), controls = {}, worldsPlan = [], valid = [];
  for (let w = 0; w < n; w++) {
    const goal = C.GOALS[w % 4], world = WS + w;
    worldsPlan.push({ world, goal }); valid.push(world);
    const baseLegal = 380 + noise() * 2, storeHash = `store-${world}`;
    controls[world] = { realEpisodes: 30, realStoreHash: storeHash };
    for (const cell of C.CELLS) {
      const eff = table[cell.name] + ((perGoal[cell.name] || {})[goal] || 0);
      const legal = Math.max(1, Math.round(baseLegal + eff + noise()));
      const nonEdge = cell.guard ? 0 : Math.max(0, Math.round(nonGraphG0 + noise() / 2));
      const ev = Array.from({ length: legal }, (_, i) => [i * 3, 9, 1]);
      const real = cell.store === 'REAL';
      records.set(`gfi-${cell.name}-w${world}`, {
        role: 'test', bare: false, floorMode: cell.floor ? 'on' : 'off',
        outcome: { crashed: false, completed: true }, counters: { calls: 1500 },
        tree: { derived: true, mainSha256: C.GUARD_TREE.guardMainSha256 },
        input: { agentSeed: X1.testSeed(world), acceptedConfigSeed: 200000 + world, goal },
        endpoints: { goalReaches: legal + nonEdge, legalReaches: legal, attemptSuccess: null, slipsPerCall: 0, earlyReaches: 10 },
        reaches: { goal: legal + nonEdge, legal, nonEdge, legalCalls: [], goalCalls: [] },
        conditionIntegrity: okIntegrity(),
        guardCompleteness: { guard: cell.guard ? 'on' : 'off', nonGraphResets: nonEdge, executedNonGraphMoves: cell.guard ? 0 : nonEdge, admittedNonGraph: cell.guard ? 0 : null, maskedOut: cell.guard ? 1700 : 0, blockedIllegal: cell.guard ? blocked : 0, ok: true },
        guard: { on: !!cell.guard, counters: { admittedGraph: 23400 + (cell.guard ? 60 : 0), admitted: cell.guard ? 0 : 1700, nonGraphTrained: 100, nonGraphHuman: 600, nonGraphBoth: 1000, maskedOut: cell.guard ? 1700 : 0, blockedIllegal: cell.guard ? blocked : 0 } },
        moveClass: { legal: 1300, nonGraph: cell.guard ? 0 : nonEdge, self: 0, none: 0 },
        brain: real ? { deliveredHash: 'x', deliveredHashes: { episodes: storeHash }, start: { hashes: { episodes: storeHash }, sizes: { episodes: 30, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } }
          : { deliveredHash: 'none', deliveredHashes: null, start: { hashes: {}, sizes: { episodes: 0, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } },
        floor: cell.floor ? { on: true, tcFloor: C.TC_FLOOR, counters: { evaluated: 120, legal: 100, notLegal: 20, raised: 40, lowered: 0, maxRaise: 100 }, byEdge: { [`9->${goal}`]: { evaluated: 100, raised: 40 } } } : null,
        audit: { drawsTotal: 0, drawsIntoGoal: 0, drawsNonEdge: 0, goalReaches: legal + nonEdge, legalReaches: legal, nonEdgeReaches: nonEdge, reachesEqualLegalPlusNonEdge: true, drawsMatchEnvCounters: true },
        finalHop: { ...summarizeEvents(ev), events: ev, drawsIntoGoal: 0, goalEdges: [{ from: 9, p: 1 }, { from: 11, p: 1 }] },
        goalEdgeState: [{ from: 9, p: 1, penalty: 1, reward: 4, transitions: 5 }],
      });
    }
  }
  const plan = { block: 'I', worlds: worldsPlan, validWorlds: valid, exclusions: [] };
  if (tweak) tweak({ records, controls, plan });
  return { records, plan, controls };
};
{
  const o = evaluateBlock(mkBlock());
  check('A1.clean-block-supports-recovery-improvement-and-persistence', o.valid && o.labels.PC1 === 'RECOVERY_FULL' && o.labels.PC2 === 'IMPROVES' && o.labels.PC3 === 'PERSISTS' && o.specification.justified === true && o.specification.package === 'floor + guard bundle', JSON.stringify(o.labels));
  check('A1.decisive-level-is-bonferroni-3-and-primary-is-legal', Math.abs(o.familyLevel - (1 - 0.05 / 3)) < 1e-12 && o.primary.PC1.estimand.includes('D_1 - D_0') && Math.abs(o.primary.PC2.tauLegal.mean - 45) < 8 && Math.abs(o.primary.PC1.interactionLegal.mean - 50) < 8);
  check('A1.non-graph-and-total-resets-are-reported-separately', Math.abs(o.primary.PC2.tauNonGraph.mean + 80) < 8 && o.primary.PC2.tauAllResets.mean < o.primary.PC2.tauLegal.mean && o.cellMeans.REAL_F1_G1.nonEdge === 0 && o.cellMeans.REAL_F1_G0.nonEdge > 50);
  check('A1.verdict-states-the-bundle-the-classification-and-no-readiness', /combined admission-mask \+ execution-guard bundle/.test(o.verdict) && /no effect is attributed to either component/.test(o.verdict) && /Production-like transition semantics under M7 bounds\./.test(o.verdict)
    && /not a production change/.test(o.verdict) && /separate production-design specification is justified/.test(o.verdict), o.verdict);
  check('A1.secondary-contrasts-carry-their-mde', Object.keys(o.secondary).length === 19 && Object.values(o.secondary).every(s => s.legal.sd > 0 && s.mdeLegal > 0) && o.secondary['3-WAY store x floor x guard'] && o.secondary['INTERACTION store x guard | F1']);
  check('A1.instruments-and-flags-are-reported', ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7'].every(k => o.instruments[k].status === 'OK') && o.candidateSelection.blockedFlag === false && o.candidateSelection.graphPoolFlag === false && o.candidateSelection.flagsRaised.length === 0);
  const t = (patch) => ({ ...baseTable, ...patch });
  const noRec = evaluateBlock(mkBlock({ table: t({ REAL_F1_G1: 42, REAL_F0_G1: 8 }) }));
  check('A2.no-recovery-is-no-recovery-and-a-valid-falsifier', noRec.valid && noRec.labels.PC1 === 'NO_RECOVERY' && /does not recover the margin/.test(noRec.verdict), JSON.stringify(noRec.labels));
  const acc = evaluateBlock(mkBlock({ table: t({ REAL_F0_G1: 2, REAL_F1_G1: 40 }) }));
  check('A3.guard-changing-only-the-accounting-is-accounting-only', acc.valid && acc.labels.PC2 === 'ACCOUNTING_ONLY' && /accounting only/.test(acc.verdict) && acc.specification.package === 'floor alone', JSON.stringify(acc.labels));
  const harm = evaluateBlock(mkBlock({ table: t({ REAL_F1_G1: 0, REAL_F0_G1: -40 }) }));
  check('A4.guard-reducing-legal-reaches-is-harms-and-blocks-the-specification', harm.valid && harm.labels.PC2 === 'HARMS' && harm.specification.justified === false, JSON.stringify(harm.labels));
  const noPersist = evaluateBlock(mkBlock({ table: t({ REAL_F1_G1: 56 }) }));
  check('A5.floor-persisting-only-without-the-guard', noPersist.valid && noPersist.labels.PC3 === 'ONLY_WITHOUT_GUARD' && noPersist.specification.justified === false, JSON.stringify(noPersist.labels));
  const noDef = evaluateBlock(mkBlock({ table: t({ REAL_F1_G0: 80 }) }));
  check('A6.absent-deficit-makes-pc1-not-testable', noDef.valid && noDef.instruments.I5.status === 'FAILED' && noDef.labels.PC1 === 'NOT_TESTABLE' && /NOT_TESTABLE/.test(noDef.verdict), JSON.stringify(noDef.labels));
  const noCold = evaluateBlock(mkBlock({ table: t({ COLD_F1_G0: 10, COLD_F1_G1: 4 }) }));
  check('A7.cold-floor-effect-not-reproducing-voids-pc3', noCold.valid && noCold.instruments.I6.status === 'FAILED' && noCold.labels.PC3 === 'VOID' && noCold.specification.justified === false, JSON.stringify(noCold.labels));
  const i3 = evaluateBlock(mkBlock({ tweak: ({ records }) => { const r = records.get(`gfi-REAL_F1_G1-w${WS + 3}`); r.reaches.nonEdge = 4; r.reaches.goal += 4; r.endpoints.goalReaches += 4; r.audit.nonEdgeReaches = 4; r.audit.goalReaches += 4; r.guardCompleteness.nonGraphResets = 4; } }));
  check('A8.guard-incompleteness-voids-pc1-and-pc2-but-not-the-block', i3.valid && i3.instruments.I3.status === 'FAILED' && i3.labels.PC1 === 'VOID' && i3.labels.PC2 === 'VOID' && i3.labels.PC3 !== 'VOID' && i3.specification.justified === false, JSON.stringify(i3.labels));
  const i2 = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-COLD_F1_G0-w${WS + 3}`).floor.counters.lowered = 1; } }));
  check('A9.floor-lowering-a-score-voids-every-primary-claim', i2.valid && i2.instruments.I2.status === 'FAILED' && Object.values(i2.labels).every(l => l === 'VOID'), JSON.stringify(i2.labels));
  const hg = evaluateBlock(mkBlock({ perGoal: { REAL_F1_G1: { 12: -150 } } }));
  check('A10.a-harmed-goal-group-is-flagged-and-blocks-the-specification', hg.valid && hg.harmFlags.PC2_guardReal_F1.includes(12) && hg.specification.justified === false && /harm flag/.test(hg.verdict), JSON.stringify(hg.harmFlags));
  const fl = evaluateBlock(mkBlock({ blocked: 120 }));
  check('A11.blocked-share-above-five-percent-raises-the-flag', fl.valid && fl.candidateSelection.blockedFlag === true && fl.candidateSelection.flagsRaised.includes('blockedShareOfCalls'));
  const sdv = evaluateBlock(mkBlock({ table: t({ REAL_F1_G1: 64 }), n: 40, sd: 14 }));
  check('A12.unadjusted-classification-is-a-non-decisive-sensitivity-and-disagreement-is-reported', sdv.valid && sdv.sensitivityUnadjusted95.decisive === false && sdv.labels.PC1 === 'INCONCLUSIVE' && sdv.sensitivityUnadjusted95.labels.PC1 === 'RECOVERY_FULL'
    && sdv.sensitivityUnadjusted95.agrees === false && sdv.sensitivityUnadjusted95.intervals.interaction.ci.lower >= sdv.primary.PC1.interactionLegal.ci.lower && /unadjusted 95 %/.test(sdv.verdict), JSON.stringify(sdv.labels));
  const miss = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.delete(`gfi-REAL_F0_G1-w${WS + 5}`); } }));
  const st = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-REAL_F0_G0-w${WS + 2}`).brain.deliveredHashes.episodes = 'other'; records.get(`gfi-REAL_F0_G0-w${WS + 2}`).brain.start.hashes.episodes = 'other'; } }));
  const seed = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-COLD_F1_G1-w${WS + 2}`).input.agentSeed += 2; } }));
  const as = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-COLD_F0_G0-w${WS + 2}`).endpoints.attemptSuccess = 0.9; } }));
  const ci = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-REAL_F1_G0-w${WS + 2}`).conditionIntegrity.envDraws = 12; } }));
  const tr = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-REAL_F1_G0-w${WS + 2}`).tree.mainSha256 = 'x'; } }));
  const gl = evaluateBlock(mkBlock({ tweak: ({ records }) => { records.get(`gfi-COLD_F0_G0-w${WS + 2}`).guard.on = true; } }));
  const ex = evaluateBlock(mkBlock({ tweak: ({ plan }) => { plan.exclusions = plan.worlds.slice(0, 8).map(w => ({ world: w.world, reason: 'x' })); } }));
  check('A13.invalid-blocks-are-refused', [miss, st, seed, as, ci, tr, gl, ex].every(x => !x.valid) && /no record/.test(miss.problems.join()) && /not identical across the four REAL cells/.test(st.problems.join())
    && /do not share the test seed/.test(seed.problems.join()) && /per-attempt success was recorded/.test(as.problems.join()) && /condition envDraws is 12/.test(ci.problems.join()) && /pinned guard tree/.test(tr.problems.join())
    && /ran with the guard on/.test(gl.problems.join()), [miss, st, seed, as, ci, tr, gl].map(x => x.problems[0]).join(' | '));
  check('A14.digests-are-bound', o.designDigest === C.designDigest() && o.decisionDigest === C.decisionDigest());
}

// ============ P: power, freshness, seam ============
{
  const evFile = path.join(HERE, 'evidence', 'calibration_interaction_summary.json');
  if (fs.existsSync(evFile)) {
    const ev = JSON.parse(fs.readFileSync(evFile, 'utf8')), ct = ev.contrasts, cal = C.CALIBRATION.contrasts;
    const near = (a, b) => Math.abs(a - b) < 0.06;
    check('P1.declared-calibration-constants-match-the-recorded-development-calibration', ev.worlds === C.CALIBRATION.worlds
      && near(ct['INTERACTION store x guard | F1'].legal.mean, cal.PC1_storeXguard_F1.mean) && near(ct['INTERACTION store x guard | F1'].legal.sd, cal.PC1_storeXguard_F1.sd)
      && near(ct['guard | REAL, F1'].legal.mean, cal.PC2_guard_REAL_F1.mean) && near(ct['guard | REAL, F1'].legal.sd, cal.PC2_guard_REAL_F1.sd)
      && near(ct['floor | REAL, G0'].legal.mean, cal.PC3_floor_REAL_G0.mean) && near(ct['floor | REAL, G0'].legal.sd, cal.PC3_floor_REAL_G0.sd)
      && near(ct['floor | REAL, G1'].legal.sd, cal.PC3_floor_REAL_G1.sd) && near(ct['3-WAY store x floor x guard'].legal.sd, cal.threeWay.sd));
    const zA = 2.3940, zB = 0.8416;                                 // z(1 - 0.05/6), z(0.80)
    const need = (sdv, infl = 1) => Math.ceil(((zA + zB) * sdv * infl / C.MARGIN.delta) ** 2);
    const prim = [cal.PC1_storeXguard_F1.sd, cal.PC2_guard_REAL_F1.sd, cal.PC3_floor_REAL_G0.sd, cal.PC3_floor_REAL_G1.sd];
    check('P1.n-covers-every-primary-contrast-at-bonferroni-3-with-a-25-percent-sd-inflation', prim.every(s => need(s, 1.25) <= C.WORLDS_N), prim.map(s => need(s, 1.25)).join());
    check('P1.n-covers-the-largest-secondary-at-the-stated-sd', need(Math.max(...Object.values(ct).map(c => c.legal.sd))) <= C.WORLDS_N);
    check('P1.per-goal-groups-have-seventy-worlds', C.PER_GOAL === 70);
  } else check('P1.calibration-evidence-present', false, 'evidence/calibration_interaction_summary.json missing');
  const seeds = [];
  for (let w = C.BLOCKS.I.lo; w <= C.BLOCKS.I.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('P2.seeds-fresh-disjoint-from-earlier-studies-and-inside-the-domain', new Set(seeds).size === seeds.length && seeds.every(s => s > C.testSeed(1111) && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi
    && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength) && C.seedOk(s).ok));
  const prodCache = fs.readdirSync(path.join(ROOT, 'experiments', 'gate-floor-prodsem', 'data')).find(f => f.startsWith('stream_' + C.CONFIG_START + '_1112_'));
  const prefix = prodCache ? JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'gate-floor-prodsem', 'data', prodCache), 'utf8')) : null;
  check('P3.gate-floor-prodsem-prefix-is-the-1112-element-stream', prefix !== null && prefix.length === 1112);
  const ext = prefix ? continueStream(prefix.slice(0, 5), 8) : [];
  check('P3.continuing-the-recurrence-reproduces-known-elements', prefix !== null && JSON.stringify(ext.slice(5)) === JSON.stringify(prefix.slice(5, 8)));
  const cache = fs.existsSync(path.join(HERE, 'data')) ? fs.readdirSync(path.join(HERE, 'data')).find(f => f.startsWith('stream_' + C.CONFIG_START + '_' + C.WORLDS_TOTAL + '_')) : null;
  if (cache && prefix) {
    const S = JSON.parse(fs.readFileSync(path.join(HERE, 'data', cache), 'utf8'));
    const blk = S.slice(C.WORLD_START);
    check('P3.extended-stream-keeps-the-prefix-and-has-1392-elements', S.length === 1392 && JSON.stringify(S.slice(0, 1112)) === JSON.stringify(prefix));
    check('P3.goals-balanced-seventy-each', C.GOALS.every(gl => blk.filter(e => e.goal === gl).length === 70) && blk.length === 280);
    check('P3.accepted-seeds-ascending-below-heldout-and-not-registered', blk.every((e, i) => e.acceptedSeed < C.HELDOUT_FLOOR && (i === 0 || e.acceptedSeed > blk[i - 1].acceptedSeed) && !typedConfig.isHeldOut(typedConfigSeed(e.acceptedSeed)) && !typedConfig.isConsumed(typedConfigSeed(e.acceptedSeed))));
    check('P3.new-worlds-share-no-configuration-with-earlier-studies', new Set(S.map(e => e.acceptedSeed)).size === S.length);
  } else check('P3.stream-cache-present', false, 'run orchestrate.mjs --plan-only once to extend and cache the stream');
}

// ============ E: recorded results (consistency; skipped until results exist) ============
{
  const f = path.join(HERE, 'results', 'summary_blockI.json');
  if (!fs.existsSync(f)) console.log('E: no recorded results in this tree (freeze state); section skipped');
  else {
    const R = path.join(HERE, 'results');
    const rd = (n) => JSON.parse(fs.readFileSync(path.join(R, n), 'utf8'));
    const S = rd('summary_blockI.json'), MF = rd('manifest_blockI.json');
    const { digest, ...rest } = MF;
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    const W = S.worlds, val = (cell, k, w) => S.perWorld[w].cells[cell][k];
    const vec = (fn) => W.map(fn);
    const diffD = (g, k = 'legal') => (w) => val(C.cellName('REAL', 1, g), k, w) - val(C.cellName('COLD', 1, g), k, w);
    check('E1.manifest-recomputes-and-binds-the-design-the-trees-and-the-state', C.hashObject(rest) === digest && S.manifestDigest === digest && MF.designDigest === C.designDigest() && S.designDigest === C.designDigest()
      && MF.decisionDigest === C.decisionDigest() && MF.tree.guardMainSha256 === C.GUARD_TREE.guardMainSha256 && MF.tree.derivedMainSha256 === C.TREE.derivedMainSha256 && MF.tree.headCommit === C.HEAD_COMMIT
      && MF.condition.state === 'P' && JSON.stringify(MF.condition.hooks) === JSON.stringify(C.HOOK_STATES.P) && MF.classification === C.CLASSIFICATION);
    check('E1.summary-valid-and-complete', S.valid === true && S.problemCount === 0 && S.excludedFraction <= C.RULES.maxExcludedFraction && S.state === 'P' && W.length >= C.WORLDS_N * (1 - C.RULES.maxExcludedFraction)
      && W.every((w, i) => w >= C.BLOCKS.I.lo && w <= C.BLOCKS.I.hi && (i === 0 || w > W[i - 1])) && Object.keys(MF.sessions).length >= W.length * C.SESSIONS_PER_WORLD && Object.keys(MF.sessions).length <= C.WORLDS_N * C.SESSIONS_PER_WORLD);
    check('E1.no-world-was-excluded-or-the-exclusions-are-listed', S.excludedFraction === 0 ? W.length === C.WORLDS_N && Object.keys(MF.sessions).length === C.WORLDS_N * C.SESSIONS_PER_WORLD : MF.exclusions > 0);
    const fam = { ...C.BOOT_FAMILY };
    const ig = pairedSummary(vec((w) => diffD(1)(w) - diffD(0)(w)), fam), d1 = pairedSummary(vec(diffD(1)), fam);
    check('E2.pc1-recomputes-from-the-per-world-data', near(ig.mean, S.primary.PC1.interactionLegal.mean) && near(ig.ci.lower, S.primary.PC1.interactionLegal.ci.lower) && near(ig.ci.upper, S.primary.PC1.interactionLegal.ci.upper)
      && near(d1.mean, S.primary.PC1.D1.mean) && near(d1.ci.lower, S.primary.PC1.D1.ci.lower));
    const tau = pairedSummary(vec((w) => val('REAL_F1_G1', 'legal', w) - val('REAL_F1_G0', 'legal', w)), fam);
    check('E2.pc2-recomputes-from-the-per-world-data', near(tau.mean, S.primary.PC2.tauLegal.mean) && near(tau.ci.lower, S.primary.PC2.tauLegal.ci.lower) && near(tau.ci.upper, S.primary.PC2.tauLegal.ci.upper));
    const t0 = pairedSummary(vec((w) => val('REAL_F1_G0', 'legal', w) - val('REAL_F0_G0', 'legal', w)), fam), t1 = pairedSummary(vec((w) => val('REAL_F1_G1', 'legal', w) - val('REAL_F0_G1', 'legal', w)), fam);
    check('E2.pc3-recomputes-from-the-per-world-data', near(t0.mean, S.primary.PC3.tauFloorG0.mean) && near(t1.mean, S.primary.PC3.tauFloorG1.mean) && near(t0.ci.lower, S.primary.PC3.tauFloorG0.ci.lower) && near(t1.ci.lower, S.primary.PC3.tauFloorG1.ci.lower));
    const d0 = pairedSummary(vec(diffD(0)), C.BOOT_95), fc = pairedSummary(vec((w) => val('COLD_F1_G0', 'legal', w) - val('COLD_F0_G0', 'legal', w)), C.BOOT_95);
    const i5 = d0.ci.upper < 0, i6 = fc.ci.lower >= C.MARGIN.coldFloorMinBenefit;
    const l1 = (S.instruments.I2.status === 'OK' ? null : 'VOID');
    const exp = { PC1: C.classifyPC1({ ig: ig.ci, d1: d1.ci, i5 }), PC2: C.classifyPC2({ tau: tau.ci, nonGraphRemoved: -mean(vec((w) => val('REAL_F1_G1', 'nonEdge', w) - val('REAL_F1_G0', 'nonEdge', w))) }), PC3: C.classifyPC3({ g0: t0.ci, g1: t1.ci }) };
    const voidFor = (k) => (S.instruments.I2.status !== 'OK' || (['PC1', 'PC2'].includes(k) && S.instruments.I3.status !== 'OK') || (k === 'PC3' && !i6));
    check('E3.labels-recompute-by-the-declared-rules', ['PC1', 'PC2', 'PC3'].every(k => S.labels[k] === (voidFor(k) ? 'VOID' : exp[k])) && S.instruments.I5.status === (i5 ? 'OK' : 'FAILED') && S.instruments.I6.status === (i6 ? 'OK' : 'FAILED'), JSON.stringify({ exp, got: S.labels }));
    const hf = ['COLD'].length; // (kept explicit: the harm flags recompute below)
    const goals = [...new Set(W.map(w => S.perWorld[w].goal))];
    const harmG = goals.filter(gg => pairedSummary(W.filter(w => S.perWorld[w].goal === gg).map((w) => val('REAL_F1_G1', 'legal', w) - val('REAL_F1_G0', 'legal', w)), C.BOOT_95).ci.upper < 0);
    check('E3.harm-flags-recompute', JSON.stringify(harmG.sort()) === JSON.stringify(S.harmFlags.PC2_guardReal_F1.slice().sort()) && hf === 1);
    check('E4.mandatory-classification-bundle-scope-and-limits-are-in-the-summary', S.classification === C.CLASSIFICATION && JSON.stringify(S.deviations) === JSON.stringify(C.DEVIATIONS) && JSON.stringify(S.claimLimits) === JSON.stringify(C.CLAIM_LIMITS)
      && /bundle/.test(S.scope) && S.verdict.includes('no effect is attributed to either component'));
    check('E5.exploratory-files-are-labelled', !fs.existsSync(path.join(R, 'exploratory_blockI.json')) || rd('exploratory_blockI.json').status === 'EXPLORATORY_POST_HOC');
    const sf = path.join(R, 'sessions_blockI.json');
    if (!fs.existsSync(sf)) check('E6.per-session-evidence-present', false, 'results/sessions_blockI.json missing');
    else {
      const X = rd('sessions_blockI.json');
      check('E6.per-session-evidence-covers-every-session-and-binds-the-manifest-hashes', X.manifestDigest === digest && X.sessions === Object.keys(MF.sessions).length && X.rows.length === X.sessions
        && X.rows.every(r => MF.sessions[r.file] === r.sha256 && r.integrityOk === true && r.guardCompletenessOk === true && r.condition === 'P' && r.attemptSuccess === null)
        && X.totals.envDraws === 0 && X.totals.creditKeys === 0 && X.totals.traversalAttempts === X.totals.traversalSuccesses && X.totals.guardOnNonGraphResets === 0 && X.totals.guardOnExecutedNonGraphMoves === 0);
    }
  }
}

// ============ M: mutants ============
{
  const copyTree = (tag, edit) => {
    const dir = path.join(SCRATCH, `tree_${tag}`);
    fs.cpSync(guard.dir, dir, { recursive: true });
    const p = path.join(dir, 'main.js');
    fs.writeFileSync(p, edit(fs.readFileSync(p, 'utf8')));
    return dir;
  };
  const runMutant = (dir, mode, w = 1) => {
    const src = fs.readFileSync(SESS, 'utf8').replace("if (mainSha !== (isGuard ? GUARD_TREE.guardMainSha256 : isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(", "if (false) refuse(");
    const f = path.join(HERE, `.__mutant_session_${path.basename(dir)}.mjs`);
    fs.writeFileSync(f, src);
    try { const r = spawnSync(process.execPath, [f, JSON.stringify({ ...inputFor(w), tree: dir, floor: 'off', guard: mode, instrument: true, traceWrites: true })], { encoding: 'utf8', maxBuffer: 1 << 28 });
      const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s); return m ? JSON.parse(m[1]) : null; } finally { fs.rmSync(f, { force: true }); }
  };
  const off = REC.guardOn.off1;
  {
    // M1: the admission mask acts whenever the object exists (ignores the on-switch): armed-but-off must NOT equal off -> the neutrality check catches it
    const dir = copyTree('m1', t => t.replace(ADMIT_LINE, "    if (globalThis.__GFGUARD__ && !isGraphNeighbor) return; // MUTANT: mask without the switch"));
    const r = runMutant(dir, 'armedOff');
    mutant('M1.admission-mask-ignoring-the-on-switch-breaks-armed-off-neutrality', r && r.artifacts.fingerprint !== off.artifacts.fingerprint, 'armed-but-off was still equal to off');
  }
  {
    const dir = copyTree('m2', t => t.replace(EXEC_LINE, EXEC_LINE.replace(' && globalThis.__GFGUARD__.on', '')));
    const r = runMutant(dir, 'armedOff');
    mutant('M2.execution-guard-ignoring-the-on-switch-breaks-armed-off-neutrality', r && (r.artifacts.fingerprint !== off.artifacts.fingerprint || r.guard.counters.blockedIllegal > 0), 'armed-but-off was still equal to off');
  }
  {
    // M3: the admission mask COUNTS but does not drop.  The execution guard still blocks illegal moves, so the completeness record alone
    // cannot see this; the guard-ON behaviour must differ from the correct guard-ON behaviour (and the candidate-level scope test L1 sees it)
    const dir = copyTree('m3', t => t.replace(ADMIT_LINE, ADMIT_LINE.replace('=== false) return;', '=== false) { /* MUTANT: counted, not dropped */ }')));
    const r = runMutant(dir, 'on');
    mutant('M3.mask-that-counts-but-does-not-drop-changes-the-guard-on-behaviour', r && r.artifacts.fingerprint !== REC.guardOn.w1.artifacts.fingerprint, 'the guard-on record was identical');
  }
  {
    // M4: the execution guard removed -> blocked moves vanish while stale illegal executions run: blockedIllegal 0 and (non-graph moves or resets) appear under guard ON
    const dir = copyTree('m4', t => t.replace(EXEC_LINE + '\n', ''));
    const r = runMutant(dir, 'on');
    mutant('M4.no-execution-guard-lets-illegal-moves-through-or-changes-the-record', r && (r.guardCompleteness.ok === false || r.guard.counters.blockedIllegal === 0), 'the guard-on record was identical in blocked count');
  }
  // S5 mutants: introducing any clearing operation into the pinned derived source must fail the static invariant
  const ANC = '    agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];';
  const s5 = (label, edit) => { const t = edit(mainG); mutant(label, t !== mainG && lastReasoningInvariant(t).ok === false, t === mainG ? 'anchor missing' : 'the invariant still held'); };
  s5('M5.s5-assignment-of-null-at-the-goal-reset-is-caught', t => t.replace(ANC, ANC + '\n    window.lastReasoning = null;'));
  s5('M6.s5-delete-is-caught', t => t.replace(ANC, ANC + '\n    delete window.lastReasoning;'));
  s5('M7.s5-globalthis-undefined-and-bracket-forms-are-caught', t => t.replace(ANC, ANC + '\n    globalThis.lastReasoning = undefined;\n    window["lastReasoning"] = false;'));
  s5('M8.s5-property-reset-is-caught', t => t.replace(ANC, ANC + '\n    window.lastReasoning.to = null;'));
  mutant('M9.s5-benign-comment-and-read-is-not-flagged', lastReasoningInvariant(mainG.replace(ANC, ANC + '\n    // window.lastReasoning = null;\n    const _r = window.lastReasoning;')).ok === true);
  // analysis / config mutants
  const loadMutated = async (file, edits, tag) => {
    let t = fs.readFileSync(path.join(HERE, file), 'utf8');
    for (const [from, to] of edits) { if (!t.includes(from)) throw new Error(`mutant ${tag}: pattern not found in ${file}`); t = t.replace(from, to); }
    t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
    const f = path.join(SCRATCH, `mut_${tag}_${file}`);
    fs.writeFileSync(f, t);
    return import(pathToFileURL(f).href);
  };
  const clone2 = (b) => ({ records: new Map([...b.records.entries()].map(([k, v]) => [k, clone(v)])), plan: clone(b.plan), controls: clone(b.controls) });
  const tb = (patch) => ({ ...baseTable, ...patch });
  const am = [
    ['M10.primary-uses-every-reset-instead-of-legal-reaches', 'analyze.mjs', [["const val = (cell, k) => (w) => perWorld[w].cells[cell][k];", "const val = (cell, k) => (w) => perWorld[w].cells[cell][k === 'legal' ? 'all' : k];"]], () => mkBlock({ table: tb({ REAL_F0_G1: 2, REAL_F1_G1: 40 }), nonGraphG0: 90 })],
    ['M11.family-uses-the-unadjusted-level', 'analyze.mjs', [["const FAM = C.BOOT_FAMILY;", "const FAM = C.BOOT_95;"]], () => mkBlock({ table: tb({ REAL_F1_G1: 64 }), sd: 14 })],
    ['M12.i5-precondition-ignored', 'analyze.mjs', [["C.classifyPC1({ ig: ig.ci, d1: d1.ci, i5: inst.I5.status === 'OK' })", "C.classifyPC1({ ig: ig.ci, d1: d1.ci, i5: true })"]], () => mkBlock({ table: tb({ REAL_F1_G0: 80 }) })],
    ['M13.guard-incompleteness-does-not-void-claims', 'analyze.mjs', [["if (inst.I3.status !== 'OK') { voided.PC1.push('I3'); voided.PC2.push('I3'); }", ""]], () => mkBlock({ tweak: ({ records }) => { const r = records.get(`gfi-REAL_F1_G1-w${WS + 3}`); r.reaches.nonEdge = 4; r.reaches.goal += 4; r.endpoints.goalReaches += 4; r.audit.nonEdgeReaches = 4; r.audit.goalReaches += 4; r.guardCompleteness.nonGraphResets = 4; } })],
    ['M14.floor-audit-does-not-void-claims', 'analyze.mjs', [["if (inst.I2.status !== 'OK') for (const k of Object.keys(voided)) voided[k].push('I2');", ""]], () => mkBlock({ tweak: ({ records }) => { records.get(`gfi-COLD_F1_G0-w${WS + 3}`).floor.counters.lowered = 1; } })],
    ['M15.cold-floor-instrument-ignored', 'analyze.mjs', [["if (inst.I6.status !== 'OK') voided.PC3.push('I6');", ""]], () => mkBlock({ table: tb({ COLD_F1_G0: 10, COLD_F1_G1: 4 }) })],
    ['M16.harm-rule-uses-the-lower-bound', 'analyze.mjs', [["if (g.guardReal_F1.ci.upper < 0) harm.PC2_guardReal_F1.push(gl);", "if (g.guardReal_F1.ci.lower < 0) harm.PC2_guardReal_F1.push(gl);"]], () => mkBlock({ perGoal: { REAL_F1_G1: { 8: -44 } } })],
    ['M17.condition-integrity-ignored', 'analyze.mjs', [["invalid.push(...integrityProblems(rec.conditionIntegrity));", ""]], () => mkBlock({ tweak: ({ records }) => { const r = records.get(`gfi-REAL_F1_G0-w${WS + 3}`); r.conditionIntegrity.envDraws = 12; r.conditionIntegrity.ok = false; } })],
    ['M18.shared-seed-pairing-check-ignored', 'analyze.mjs', [["if (seeds.size !== 1) problems.push(", "if (false) problems.push("]], () => mkBlock({ tweak: ({ records }) => { records.get(`gfi-COLD_F1_G1-w${WS + 2}`).input.agentSeed += 2; } })],
    ['M19.specification-ignores-pc3', 'config.mjs', [["if (pc3 !== 'PERSISTS') return { justified: false, reason: `PC3 = ${pc3}` };", ""]], () => mkBlock({ table: tb({ REAL_F1_G1: 56 }) })],
    ['M20.no-recovery-misread-as-recovery', 'config.mjs', [["if (ig.upper < MARGIN.delta) return 'NO_RECOVERY';", "if (ig.upper < MARGIN.delta) return 'INCONCLUSIVE';"]], () => mkBlock({ table: tb({ REAL_F1_G1: 42, REAL_F0_G1: 8 }) })],
  ];
  const truth = (o) => (o.valid ? JSON.stringify([o.labels, o.instruments.I2.status, o.instruments.I3.status, o.instruments.I5.status, o.instruments.I6.status, o.harmFlags, o.specification.justified]) : 'INVALID');
  for (const [id, file, edits, fx] of am) {
    const mod = await loadMutated(file === 'config.mjs' ? 'config.mjs' : file, edits, id.split('.')[0]);
    let evalFn;
    if (file === 'config.mjs') {
      // evaluate with the mutated config: re-import analyze against the mutated config module
      let a = fs.readFileSync(path.join(HERE, 'analyze.mjs'), 'utf8').replace("import * as C from './config.mjs';", `import * as C from '${pathToFileURL(path.join(SCRATCH, `mut_${id.split('.')[0]}_config.mjs`)).href}';`);
      a = a.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
      const af = path.join(SCRATCH, `mut_${id.split('.')[0]}_analyze_cfg.mjs`);
      fs.writeFileSync(af, a);
      evalFn = (await import(pathToFileURL(af).href)).evaluateBlock;
    } else evalFn = mod.evaluateBlock;
    const b = fx();
    const real = truth(evaluateBlock(clone2(b))), mut = truth(evalFn(clone2(b)));
    mutant(id, real !== mut, `claims identical under the mutant: ${real}`);
  }
}

console.log(`\nGATE-FLOOR-INTERACTION gate: ${passed} checks passed, ${failed} failed; mutants ${caught} caught, ${missed} missed`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
fs.rmSync(SCRATCH, { recursive: true, force: true });

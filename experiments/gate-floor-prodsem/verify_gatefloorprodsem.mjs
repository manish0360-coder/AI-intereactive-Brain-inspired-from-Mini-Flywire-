// ==========================================================
// GATE-FLOOR-PRODSEM — verification gate (design and instrument integrity; prints NO confirmatory endpoint)
// ==========================================================
//   node experiments/gate-floor-prodsem/verify_gatefloorprodsem.mjs
// Sections
//   S  static     : exact HEAD source identity and clean production tree, declarations, the revised parameters bound into the digests
//   D  hooks      : what each M7 harness switch does at HEAD (the Phase 1 facts, pinned as source assertions) and that state P defines none
//   T  transform  : the derived tree = bare HEAD + exactly the two guarded lines (identical to GATE-FLOOR-HEAD's); refusals
//   U  unit       : the floor runtime's scope (shared with GATE-FLOOR-1 / -B2 / -HEAD)
//   N  neutrality : under state P bare HEAD == derived OFF == measured OFF == armed-but-off (decisions, environment, RNG draws, Q/credit,
//                   end state); P == Ppass; state H of this driver == the committed GATE-FLOOR-HEAD driver; intervention determinism;
//                   condition integrity holds under P and FAILS under H and E (anti-vacuity); refusals
//   L  scope      : first behavioural divergence of ON vs OFF is a legal goal entry (candidate level)
//   A  analysis   : the label set, condition-integrity invalidation, retired attempt-success clause, margin sensitivity, exact fixtures
//   P  power      : n from the state-P calibration at DELTA 20; fresh worlds and seeds; stream seam
//   E  results    : recorded block consistency (skipped until results exist)
//   M  mutants    : deliberately broken transform / analysis must be caught (anti-vacuity)
// Sessions run on XFER-1 worlds 1-3 (outside every GATE-FLOOR-PRODSEM world); none is a confirmatory outcome.  No confirmatory figure
// is printed.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { generateAcceptedStream } from '../m7/env.js';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import * as X1 from '../xfer1/config.mjs';
import { prng, pairedSummary } from '../xfer1/stats.mjs';
import { makeGraph, entryStore } from '../xfer2/controls.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';
import * as G from '../gate-floor1/config.mjs';
import * as B from '../gate-floor-b2/config.mjs';
import { createFloor } from '../gate-floor1/floor_runtime.mjs';
import { summarizeEvents } from '../gate-floor1/finalhop.mjs';
import { continueStream } from '../gate-floor1/stream.mjs';
import * as HC from '../gate-floor-head/config.mjs';
import * as C from './config.mjs';
import { transformMain, buildHeadTree, runtimePaths, FLOOR_ANCHOR, FLOOR_LINE, PROBE_ANCHOR, PROBE_LINE } from './transform.mjs';
import { evaluateBlock, recordProblems, integrityProblems } from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(id + ' ' + detail); } console.log((cond ? 'PASS ' : 'FAIL ') + id + (cond || !detail ? '' : ' :: ' + detail)); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log((ok ? 'CAUGHT ' : 'MISSED ') + id + (ok || !detail ? '' : ' :: ' + detail)); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const clone = (o) => JSON.parse(JSON.stringify(o));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'gfh-verify-'));
const gitOut = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
// the RUNTIME subset of the file set (documentation blobs such as README.md are in the set but are not runtime)
const isRuntime = (p) => p === 'main.js' || p === 'connections.json' || p === 'neurons.json' || p === 'index.html' || p.startsWith('render/') || p.startsWith('instrumentation/') || p.startsWith('experiments/m7/');

const pristine = buildTree({ pristine: true });                 // B2, for the HEAD-vs-B2 diff
const conformed = buildTree();                                  // H1-R conformed, for the refusal test only
const bare = buildHeadTree({ derived: false });                 // audited HEAD blobs
const derived = buildHeadTree({ derived: true });               // + the two guarded lines
const mainB2 = fs.readFileSync(path.join(pristine.dir, 'main.js'), 'utf8');
const mainH = fs.readFileSync(path.join(bare.dir, 'main.js'), 'utf8');
const mainD = fs.readFileSync(path.join(derived.dir, 'main.js'), 'utf8');
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];

// ============ S: static ============
{
  // exact audited source identity and a clean production tree
  const hc = gitOut(['cat-file', '-t', C.HEAD_COMMIT]);
  check('S1.the-audited-commit-exists-and-is-an-ancestor-of-the-current-head', hc.status === 0 && hc.stdout.trim() === 'commit' && gitOut(['merge-base', '--is-ancestor', C.HEAD_COMMIT, 'HEAD']).status === 0);
  const runtimeDiff = gitOut(['diff', '--name-only', C.HEAD_COMMIT, 'HEAD', '--', ...runtimePaths().filter(isRuntime)]);
  check('S1.no-runtime-file-changed-between-the-audited-commit-and-the-current-head', runtimeDiff.status === 0 && runtimeDiff.stdout.trim() === '', runtimeDiff.stdout.trim().slice(0, 200));
  const wt = gitOut(['status', '--porcelain', '--untracked-files=no', '--', 'main.js', 'render', 'instrumentation', 'connections.json', 'neurons.json', 'index.html', 'experiments/m7', 'experiments/h1r', 'experiments/xfer1', 'experiments/xfer2', 'experiments/gate-floor1', 'experiments/gate-floor-b2', 'experiments/gate-floor-head', 'experiments/mcf1', 'experiments/registry']);
  check('S1.production-worktree-is-clean-and-no-earlier-study-file-is-modified', wt.status === 0 && wt.stdout.trim() === '', wt.stdout.trim().slice(0, 200));
  check('S1.working-tree-main-equals-the-audited-blob', sha(fs.readFileSync(path.join(ROOT, 'main.js'))) === C.TREE.headMainSha256 && gitOut(['rev-parse', C.HEAD_COMMIT + ':main.js']).stdout.trim() === C.TREE.headMainBlob);
  check('S2.pins-are-the-content-hashes-of-the-built-trees', sha(mainH) === C.TREE.headMainSha256 && sha(mainD) === C.TREE.derivedMainSha256 && bare.manifest.gatefloorhead.blobs['main.js'] === C.TREE.headMainBlob
    && bare.manifest.gatefloorhead.blobs['render/planning.js'] === C.TREE.planningBlob && bare.manifest.gatefloorhead.blobs['render/traversalRecord.js'] === C.TREE.traversalRecordBlob);
  check('S2.bare-tree-is-the-audited-blob-set-byte-for-byte', Object.keys(bare.manifest.files).length === 147 && runtimePaths().length === 147 && Object.entries(bare.manifest.gatefloorhead.blobs).every(([p, b]) => gitOut(['rev-parse', C.HEAD_COMMIT + ':' + p]).stdout.trim() === b));
  // declarations: the reviewed corrections and what stayed
  check('S3.declared-margins-and-sample', C.MARGIN.delta === 20 && C.MARGIN.minBenefit === 40 && C.MARGIN.maxAttemptDrop === undefined && C.SENSITIVITY_MARGIN.delta === 15 && C.SENSITIVITY_MARGIN.minBenefit === 30
    && C.WORLDS_N === 280 && C.PER_GOAL === 70 && C.WORLD_START === 832 && C.WORLDS_N === 4 * C.PER_GOAL && C.WORLDS_N === HC.WORLDS_N && C.PER_GOAL === HC.PER_GOAL);
  check('S3.unchanged-parts-are-the-b2-ones', JSON.stringify(C.ARM_ORDER) === JSON.stringify(B.ARM_ORDER) && C.ARMS === B.ARMS && C.TC_FLOOR === 1 && C.FLOOR_BASE_VALUE === 100 && C.OUTCOME === B.OUTCOME && C.BOOTSTRAP === B.BOOTSTRAP && C.TICKS === B.TICKS && C.DIAGNOSTICS === B.DIAGNOSTICS);
  check('S3.real-is-descriptive-and-the-gating-claims-are-c1-c3-c4-c5', JSON.stringify(C.GATING_CLAIMS) === '["C1","C3","C4","C5"]' && C.CLAIMS.find(c => c.id === 'C2').gates === false);
  check('S3.block-follows-gate-floor-head', C.WORLD_START === HC.BLOCKS.H.hi + 1 && C.blockOf(831) === null && C.blockOf(832) === 'P' && C.blockOf(1111) === 'P' && C.blockOf(1112) === null);
  check('S3.predictions-bound-to-gating-claims', C.PREDICTIONS.length === 4 && C.PREDICTIONS.every(p => C.GATING_CLAIMS.includes(p.claim)));
  check('S3.the-pinned-tree-and-head-commit-are-the-gate-floor-head-ones', C.HEAD_COMMIT === HC.HEAD_COMMIT && C.TREE === HC.TREE && C.TC_FLOOR === HC.TC_FLOOR);
  check('S3.mandatory-classification-and-the-three-deviations-are-declared', C.CLASSIFICATION === 'Production-like transition semantics under M7 bounds.' && C.DEVIATIONS.length === 3 && /150-tick/.test(C.DEVIATIONS[0]) && /replay cooldown/.test(C.DEVIATIONS[1]) && /agentLast->next/.test(C.DEVIATIONS[2])
    && /identically 1\.0/.test(C.CLAIM_LIMITS[0]) && /graph-distance potential/.test(C.CLAIM_LIMITS[1]));
  // the revised parameters are inside the decision digest (it equals a literal built from them, and moves when each moves)
  const lit = (o = {}) => C.hashObject({ schema: C.SCHEMA, head: C.HEAD_COMMIT, arms: C.ARMS, contrasts: C.CONTRASTS, claims: C.CLAIMS, predictions: C.PREDICTIONS, rules: C.RULES, margin: C.MARGIN, tcFloor: C.TC_FLOOR,
    floorBase: C.FLOOR_BASE_VALUE, tree: C.TREE, entryCount: C.ENTRY_COUNT, nrQuality: C.NR_QUALITY, blocks: C.BLOCKS, ticks: C.TICKS, bootstrap: C.BOOTSTRAP, outcome: C.OUTCOME,
    worlds: { start: C.WORLD_START, n: C.WORLDS_N, perGoal: C.PER_GOAL, goals: C.GOALS }, calibration: C.CALIBRATION, configStart: C.CONFIG_START,
    sensitivityMargin: C.SENSITIVITY_MARGIN, hookStates: C.HOOK_STATES, confirmatoryState: C.CONFIRMATORY_STATE, classification: C.CLASSIFICATION, deviations: C.DEVIATIONS, claimLimits: C.CLAIM_LIMITS, ...o });
  check('S4.decision-digest-binds-the-declared-parameters', lit() === C.decisionDigest() && lit({ margin: { ...C.MARGIN, delta: 25 } }) !== C.decisionDigest() && lit({ margin: { ...C.MARGIN, minBenefit: 50 } }) !== C.decisionDigest()
    && lit({ worlds: { start: 552, n: 280, perGoal: 70, goals: C.GOALS } }) !== C.decisionDigest() && lit({ claims: C.CLAIMS.map(c => ({ ...c, gates: true })) }) !== C.decisionDigest() && lit({ head: '0'.repeat(40) }) !== C.decisionDigest()
    && lit({ hookStates: { ...C.HOOK_STATES, P: { ...C.HOOK_STATES.P, creditMode: 'on' } } }) !== C.decisionDigest() && lit({ confirmatoryState: 'E' }) !== C.decisionDigest()
    && lit({ sensitivityMargin: { delta: 10, minBenefit: 20 } }) !== C.decisionDigest() && lit({ classification: 'Production equivalence.' }) !== C.decisionDigest() && lit({ deviations: C.DEVIATIONS.slice(1) }) !== C.decisionDigest());
  check('S4.design-digest-binds-the-diagnostics', C.designDigest() !== C.decisionDigest() && /^[0-9a-f]{64}$/.test(C.designDigest()) && C.hashObject({ decision: C.decisionDigest(), diagnostics: C.DIAGNOSTICS, degenerate: C.DEGENERATE_UNDER_P }) === C.designDigest());
  check('S5.floor-base-value-is-the-blocks-own-goal-assignment-in-head-main', /if \(Number\(k\) === Number\(goalNeuronId\)\) \{[\s\S]{0,700}goalGradientBoost = 100;/.test(mainH) && (mainH.match(/goalGradientBoost = 100 \* tc;/g) || []).length === 1);
  const bad = [];
  for (const f of fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_gatefloorprodsem.mjs')) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Math\.random|performance\.now/.test(t)) bad.push(f + ': ambient randomness or clock');
    if (/Date\.now|new Date\(/.test(t)) bad.push(f + ': wall clock');
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(f + ': sets a stage authorisation');
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(f + ': local absolute path');
  }
  check('S6.source-hygiene', bad.length === 0, bad.join('; '));
}

// ============ D: hook semantics at HEAD (the Phase 1 facts, pinned) ============
{
  const run = fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'run.js'), 'utf8');
  const armsJs = fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'arms.js'), 'utf8');
  const envJs = fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js'), 'utf8');
  check('D1.run-installs-each-semantic-hook-only-when-its-switch-is-on', /if \(input\.envMode === 'on'\) globalThis\.__M7_ENV__ = \{/.test(run) && /if \(input\.creditMode === 'on'\) globalThis\.__M7_CREDIT__ = \{/.test(run)
    && /if \(arms\.pinsPredictionErrorPathway\(\) && input\.pin === 'on'\) \{\s+globalThis\.__M7_PE__ = \{/.test(run) && /arm: input\.arm === 'OFF' \? arms\.OFF : input\.arm/.test(run));
  check('D2.arm-off-is-an-identity-passthrough-and-pins-nothing', /export function pinsPredictionErrorPathway\(\) \{ return isOn\(\); \}/.test(armsJs) && /export function isOn\(\) \{ return ARM !== OFF; \}/.test(armsJs)
    && /default:\s+\/\/ OFF, A1, A3, A4\s+return rawTrust;/.test(armsJs) && /return \(ARM === 'A2'\) \? null : rawAggregate;/.test(armsJs));
  check('D3.episode-cap-and-replay-once-are-armed-unconditionally-in-every-state', /^\s*globalThis\.__M7_EPISODE_CAP__ = true;/m.test(run) && /^\s*globalThis\.__M7_REPLAY_ONCE__ = true;/m.test(run));
  check('D4.traversal-outcome-is-true-without-an-environment-hook', /const _m7Traversed =\s+\(next !== null && !_goalResetJustHappened && _m7env\)\s+\? _m7env\.attempt\(_m7From, _m7To\)\s+: true;/.test(mainH));
  check('D5.legacy-credit-sites-are-live-only-without-the-credit-hook', /if \(!globalThis\.__M7_CREDIT__ &&\s+agentLast !== null && next !== null && agentLast !== next\) \{\s+const attemptKey = agentLast \+ "->" \+ next;\s+recordAttempt\(attemptKey\);/.test(mainH)
    && /if \(!globalThis\.__M7_CREDIT__\) recordSuccess\(pathKey\);/.test(mainH) && /if \(next !== null && !_goalResetJustHappened && _m7cred\) \{/.test(mainH));
  check('D6.prediction-error-pathway-is-raw-without-the-pe-hook', /globalThis\.__M7_PE__\s+\? globalThis\.__M7_PE__\.learningAuthorityFor\(predError\.learningAuthority\)\s+: predError\.learningAuthority/.test(mainH)
    && /\(globalThis\.__M7_PE__ \? globalThis\.__M7_PE__\.dampQAllowed\(\) : true\)/.test(mainH));
  check('D7.step-ledger-changes-the-reward-and-no-run-defines-it', /const episodeUnique = globalThis\.__MFW_STEP_LEDGER__\s+\? _mfwTrajectorySupport\(\)/.test(mainH) && !/__MFW_STEP_LEDGER__\s*=/.test(run)
    && !fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_gatefloorprodsem.mjs').some(f => /__MFW_STEP_LEDGER__\s*=/.test(fs.readFileSync(path.join(HERE, f), 'utf8'))));
  const rtFiles = runtimePaths().filter(isRuntime).filter(p => p === 'main.js' || p.startsWith('render/') || p.startsWith('instrumentation/'));
  check('D8.the-runtime-never-imports-the-m7-environment-module', rtFiles.length > 30 && !rtFiles.some(p => /from\s+['"][^'"]*experiments\/m7\/(env|arms|run)/.test(fs.readFileSync(path.join(bare.dir, ...p.split('/')), 'utf8'))));
  check('D9.traversal-record-write-is-unguarded-by-m7-and-records-the-outcome', /if \(next !== null && !_goalResetJustHappened\) \{\s+recordTraversalOutcome\(_m7From, _m7To, _m7Traversed\);/.test(mainH));
  check('D10.environment-stream-is-drawn-only-inside-attempt', (envJs.match(/liveRng\('environment'\)/g) || []).length === 1 && /export function attempt\(fromId, toId\) \{\s+if \(!ENABLED \|\| !ACTIVE\) return true;/.test(envJs));
  const hookNames = [...new Set([...mainH.matchAll(/globalThis\.(__[A-Za-z0-9_]+__)/g)].map(m => m[1]))].sort();
  check('D11.the-harness-hook-inventory-of-head-is-the-audited-one', JSON.stringify(hookNames) === JSON.stringify(['__M7_ARMS__', '__M7_CREDIT__', '__M7_ENV__', '__M7_EPISODE_CAP__', '__M7_GOAL__', '__M7_PE__', '__M7_TEL__', '__MFW_STEP_LEDGER__']), hookNames.join());
  check('D12.state-p-defines-no-semantic-hook-and-state-e-is-the-literal-env-off', C.HOOK_STATES.P.arm === 'OFF' && C.HOOK_STATES.P.envMode === 'off' && C.HOOK_STATES.P.creditMode === 'off' && C.HOOK_STATES.P.pin === 'off' && C.HOOK_STATES.P.passEnv === false
    && C.HOOK_STATES.E.envMode === 'off' && C.HOOK_STATES.E.creditMode === 'on' && C.HOOK_STATES.E.pin === 'on' && C.HOOK_STATES.H.envMode === 'on' && C.CONFIRMATORY_STATE === 'P' && Object.keys(C.HOOK_STATES).join() === 'H,E,P,Ppass');
  check('D13.goal-entry-gradient-block-and-fix3-header-are-present', /GOAL GRADIENT — THE MISSING PULL/.test(mainH) && /FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS/.test(mainH));
}

// ============ T: transform ============
{
  const a = mainH.split('\n'), b = mainD.split('\n');
  const fi = b.indexOf(FLOOR_LINE), pi = b.indexOf(PROBE_LINE);
  check('T1.exactly-two-lines-added', b.length === a.length + 2 && fi > 0 && pi > 0);
  check('T1.floor-line-follows-the-anchor-and-probe-line-precedes-the-reset', b[fi - 1] === FLOOR_ANCHOR && b[pi + 1] === PROBE_ANCHOR);
  check('T1.removing-the-two-lines-restores-head-main-byte-for-byte', b.filter((_, k) => k !== fi && k !== pi).join('\n') === mainH);
  check('T2.every-other-file-is-byte-identical-to-the-bare-head-tree', Object.entries(bare.manifest.files).every(([p, h]) => p === 'main.js' || derived.manifest.files[p] === h) && Object.keys(derived.manifest.files).length === 147);
  check('T2.guards-read-undefined-globals-first', /^\s*if \(globalThis\.__GATEFLOORB2__ && globalThis\.__GATEFLOORB2__\.on\)/.test(FLOOR_LINE) && /^\s*if \(globalThis\.__GFB2__\)/.test(PROBE_LINE));
  check('T2.probe-is-call-only', !/[^=!<>]=[^=]/.test(PROBE_LINE.replace(/\/\/.*$/, '').replace(/^\s*if \(globalThis\.__GFB2__\) /, '')));
  const refuses = (t) => { try { transformMain(t); return false; } catch { return true; } };
  check('T3.refuses-a-missing-floor-anchor', refuses(mainH.replace(FLOOR_ANCHOR, '          goalGradientBoost = 99 * tc;')));
  check('T3.refuses-a-duplicated-floor-anchor', refuses(mainH.replace(FLOOR_ANCHOR, FLOOR_ANCHOR + '\n' + FLOOR_ANCHOR)));
  check('T3.refuses-a-missing-probe-anchor', refuses(mainH.replace(PROBE_ANCHOR, '    agentCurrent = allIds[0];')));
  check('T3.refuses-a-duplicated-probe-anchor', refuses(mainH.replace(PROBE_ANCHOR, PROBE_ANCHOR + '\n' + PROBE_ANCHOR)));
  check('T3.refuses-an-already-tagged-source', refuses(mainD));
  check('T3.refuses-a-source-without-the-fix3-header', refuses(mainH.replace('FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS', 'FIX 3: renamed')));
}

// ============ U: floor runtime (shared with GATE-FLOOR-1; scope re-asserted) ============
const GOAL = 12, FROM = 9, ISEDGE = (a, b) => g.directed.has(`${a}->${b}`);
const OTHER = (g.neighbors.get(FROM) || []).find(n => n !== GOAL);
const NONNEIGHBOUR = [...g.neighbors.keys()].find(n => n !== GOAL && !ISEDGE(n, GOAL));
{
  const p = [];
  const F = createFloor({ isEdge: ISEDGE, tcFloor: 1 });
  for (const tc of [0, 0.2, 0.6, 1]) if (F.entry(FROM, GOAL, GOAL, tc, true) !== 100) p.push(`legal entry at tc ${tc}`);
  if (F.entry(FROM, GOAL, GOAL, 0.2, false) !== 20) p.push('applied outside the structure map');
  if (F.entry(NONNEIGHBOUR, GOAL, GOAL, 0.2, true) !== 20) p.push('applied to a non-edge');
  if (F.entry(FROM, OTHER, GOAL, 0.2, true) !== 20) p.push('applied to a non-goal candidate');
  if (F.entry(GOAL, GOAL, GOAL, 0.2, true) !== 20) p.push('applied to a self move');
  const c = F.snapshot().counters;
  if (c.lowered !== 0 || c.raised !== 3 || c.notLegal !== 4) p.push(`counters ${JSON.stringify(c)}`);
  check('U1.floor-raises-only-a-legal-goal-entering-candidate-and-never-lowers', p.length === 0, p.join('; '));
  check('U1.fixture-edges-exist', ISEDGE(FROM, GOAL) && OTHER !== undefined && NONNEIGHBOUR !== undefined && !ISEDGE(NONNEIGHBOUR, GOAL));
}

// ============ N: whole-session neutrality and determinism under state P (XFER-1 worlds 1..3) ============
const WORLDS = generateAcceptedStream(X1.CONFIG_START, 4);
const SESS = path.join(HERE, 'session.mjs');
const HEAD_SESSION = path.join(ROOT, 'experiments', 'gate-floor-head', 'session.mjs');
function session(input) {
  const r = spawnSync(process.execPath, [SESS, JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
  return { rec: m ? JSON.parse(m[1]) : null, code: r.status, err: r.stderr.slice(-300) };
}
const inputFor = (w, extra) => ({ role: 'test', label: 'g', world: w, configSeed: WORLDS[w].acceptedSeed, configIndex: WORLDS[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', cond: 'P', ...extra });
const ON_RECS = {};
{
  const bareView = (r) => ({ fp: r.fingerprint, ticks: r.outcome.ticksExecuted, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, env: r.artifacts.envCounters, qs: r.artifacts.qSum, qe: r.artifacts.qEntries, end: r.endHash });
  const instView = (r) => ({ fp: r.artifacts.fingerprint, ticks: r.outcome.ticksExecuted, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, env: r.artifacts.envCounters, qs: r.artifacts.qSum, qe: r.artifacts.qEntries, end: r.brain.endHash });
  let allOk = true; const why = [];
  for (const w of [1, 2, 3]) for (const withStore of [false, true]) {
    const extra = { };
    let store = {};
    if (withStore) {
      const f = path.join(SCRATCH, `entry_w${w}.json`);
      fs.writeFileSync(f, JSON.stringify({ episodes: entryStore(g, labelOf, WORLDS[w].goal) }));
      store = { arm: 'ONLY_episodes', brainPath: f, brainWorld: w };
    }
    const base = { ...inputFor(w, store), ...extra };
    const bareP = session({ ...base, tree: bare.dir, floor: 'off', instrument: false });
    const bareD = session({ ...base, tree: derived.dir, floor: 'off', instrument: false });
    const instOff = session({ ...base, tree: derived.dir, floor: 'off', instrument: true });
    const armed = session({ ...base, tree: derived.dir, floor: 'armedOff', instrument: true });
    if (![bareP, bareD, instOff, armed].every(x => x.rec && !x.rec.outcome.crashed && x.rec.outcome.completed)) { allOk = false; why.push(`w${w}${withStore ? '+store' : ''}: a session did not complete ${[bareP, bareD, instOff, armed].map(x => x.err).join('|').slice(0, 120)}`); continue; }
    const j = (o) => JSON.stringify(o);
    const ref = j(bareView(bareP.rec));
    if (j(bareView(bareD.rec)) !== ref) { allOk = false; why.push(`w${w}${withStore ? '+store' : ''}: derived-bare differs`); }
    if (j(instView(instOff.rec)) !== ref) { allOk = false; why.push(`w${w}${withStore ? '+store' : ''}: measured-OFF differs`); }
    if (j(instView(armed.rec)) !== ref) { allOk = false; why.push(`w${w}${withStore ? '+store' : ''}: armed-off differs`); }
    if (armed.rec.floor.counters.raised !== 0 || armed.rec.floor.on !== false) { allOk = false; why.push('armed-off raised a score'); }
    if (withStore && (instOff.rec.brain.start.hashes.episodes !== instOff.rec.brain.deliveredHashes.episodes)) { allOk = false; why.push('delivery inexact'); }
    ON_RECS[`${w}${withStore ? 's' : ''}`] = { instOff: instOff.rec, bareP: bareP.rec };
  }
  check('N1.bare-head-equals-bare-derived-equals-measured-off-equals-armed-off', allOk, why.join('; '));
  check('N1.compared-quantities-include-decisions-environment-draws-and-end-state', Object.keys(bareView(session({ ...inputFor(1, {}), tree: bare.dir, floor: 'off', instrument: false }).rec)).join() === 'fp,ticks,cog,vis,env,qs,qe,end');
}
{
  // ON changes behaviour, is deterministic, and the instrumented record is self-consistent
  const base = { ...inputFor(1, {}), tree: derived.dir, instrument: true, traceWrites: true };
  const off = session({ ...base, floor: 'off' }), on1 = session({ ...base, floor: 'on' }), on2 = session({ ...base, floor: 'on' });
  check('N2.on-sessions-completed', [off, on1, on2].every(x => x.rec && !x.rec.outcome.crashed && x.rec.outcome.completed));
  check('N2.on-changes-behaviour-raises-scores-and-is-deterministic', on1.rec.artifacts.fingerprint !== off.rec.artifacts.fingerprint && on1.rec.floor.counters.raised > 0
    && on1.rec.artifacts.fingerprint === on2.rec.artifacts.fingerprint && JSON.stringify(on1.rec.floor) === JSON.stringify(on2.rec.floor));
  for (const [nm, r] of [['off', off.rec], ['on', on1.rec]]) {
    check(`N3.${nm}-record-is-self-consistent`, recordProblems(r).length === 0, recordProblems(r).join('; '));
    check(`N3.${nm}-no-draw-into-the-goal-and-no-final-hop-failure`, r.audit.drawsIntoGoal === 0 && r.finalHop.failures === 0 && r.finalHop.successes === r.reaches.legal);
    check(`N3.${nm}-goal-reset-calls-lie-inside-the-session-and-ascend`, r.reaches.goalCalls.every((c, i) => c >= 0 && c < r.counters.calls && (i === 0 || c >= r.reaches.goalCalls[i - 1])));
  }
  check('N3.every-legal-reach-comes-from-a-neighbour-of-the-goal', off.rec.finalHop.events.every(e => ISEDGE(e[1], WORLDS[1].goal)));
  ON_RECS.trace = { off: off.rec, on: on1.rec };
}
{
  // refusals
  const base = { ...inputFor(1, {}), tree: derived.dir };
  const refuses = (o, env = {}) => { const r = spawnSync(process.execPath, [SESS, JSON.stringify(o)], { encoding: 'utf8', env: { ...process.env, ...env } }); return r.status !== 0 && /GATE-FLOOR-PRODSEM session refused/.test(r.stderr); };
  check('N4.refuses-floor-on-the-bare-run', refuses({ ...base, floor: 'on', instrument: false }));
  check('N4.refuses-floor-on-the-bare-head-tree', refuses({ ...base, tree: bare.dir, floor: 'on', instrument: true }));
  check('N4.refuses-the-instrumented-run-on-the-bare-head-tree', refuses({ ...base, tree: bare.dir, floor: 'off', instrument: true }));
  check('N4.refuses-the-conformed-tree-and-the-pristine-b2-tree', refuses({ ...base, tree: conformed.dir, floor: 'off', instrument: false }) && refuses({ ...base, tree: pristine.dir, floor: 'off', instrument: false }));
  check('N4.refuses-h1r-on', refuses({ ...base, floor: 'off', instrument: true }, { H1R: 'on' }));
  check('N4.refuses-a-wrong-agent-seed', refuses({ ...base, agentSeed: X1.testSeed(1) + 2, floor: 'off', instrument: true }));
}

// ============ N (continued): state equivalences, driver regression, condition integrity ============
{
  const okRun = (x) => x && x.rec && !x.rec.outcome.crashed && x.rec.outcome.completed;
  const view = (r) => JSON.stringify({ fp: r.artifacts.fingerprint, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, end: r.brain.endHash, reaches: r.reaches, writes: r.artifacts.writesSha256 });
  let same = true; const why = [];
  for (const w of [1, 2]) {
    const base = { ...inputFor(w, {}), tree: derived.dir, floor: 'off', instrument: true };
    const p = session({ ...base, cond: 'P' }), pp = session({ ...base, cond: 'Ppass' });
    if (!okRun(p) || !okRun(pp)) { same = false; why.push(`w${w}: a session failed`); continue; }
    if (view(p.rec) !== view(pp.rec)) { same = false; why.push(`w${w}: P differs from Ppass`); }
  }
  check('N5.undefined-environment-equals-an-installed-p1-environment', same, why.join('; '));
  // regression: state H of THIS driver reproduces the committed GATE-FLOOR-HEAD driver bit for bit
  let reg = true; const rwhy = [];
  for (const w of [1, 2]) {
    const { cond: _c, ...noCond } = inputFor(w, {});
    const base = { ...noCond, tree: derived.dir, floor: 'off', instrument: true };
    const mine = session({ ...base, cond: 'H' });
    const r = spawnSync(process.execPath, [HEAD_SESSION, JSON.stringify(base)], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s); const theirs = m ? JSON.parse(m[1]) : null;
    if (!okRun(mine) || !theirs) { reg = false; rwhy.push(`w${w}: a session failed`); continue; }
    if (view(mine.rec) !== view(theirs)) { reg = false; rwhy.push(`w${w}: differs from the GATE-FLOOR-HEAD driver`); }
  }
  check('N5.state-h-of-this-driver-reproduces-the-committed-gatefloorhead-driver', reg, rwhy.join('; '));
  // condition integrity: holds under P (off and on) with evidence, is REJECTED under H and E
  const intP = ON_RECS.trace.off.conditionIntegrity, intPon = ON_RECS.trace.on.conditionIntegrity;
  check('N6.condition-integrity-holds-under-p-with-evidence', integrityProblems(intP).length === 0 && integrityProblems(intPon).length === 0 && intP.ok === true && intP.traversal.attempts > 100
    && intP.traversal.attempts === intP.traversal.successes && intP.envDraws === 0 && intP.creditKeys === 0 && intP.peLaCalls === 0 && intP.peDampCalls === 0 && intP.episodeCapArmed === true && intP.replayDeterministic === true,
    JSON.stringify(integrityProblems(intP)));
  const hRec = session({ ...inputFor(1, {}), tree: derived.dir, floor: 'off', instrument: true, cond: 'H' });
  const eRec = session({ ...inputFor(1, {}), tree: derived.dir, floor: 'off', instrument: true, cond: 'E' });
  check('N6.condition-integrity-is-rejected-under-h-and-e', okRun(hRec) && okRun(eRec) && integrityProblems(hRec.rec.conditionIntegrity).length > 0 && integrityProblems(eRec.rec.conditionIntegrity).length > 0
    && hRec.rec.conditionIntegrity.ok === false && eRec.rec.conditionIntegrity.ok === false && hRec.rec.conditionIntegrity.envDraws > 0 && eRec.rec.conditionIntegrity.envDraws === 0 && eRec.rec.conditionIntegrity.creditKeys > 0);
  check('N6.attempt-success-is-null-under-p-and-defined-under-h', ON_RECS.trace.off.endpoints.attemptSuccess === null && typeof hRec.rec.endpoints.attemptSuccess === 'number' && ON_RECS.trace.off.counters.envDraws === 0);
  check('N6.floor-on-leaves-every-condition-quantity-at-its-p-value', intPon.envDraws === 0 && intPon.creditKeys === 0 && intPon.peLaCalls === 0 && intPon.traversal.attempts === intPon.traversal.successes && intPon.traversal.maxCostEstimate === 1);
  // refusals specific to this driver
  const base0 = { ...inputFor(1, {}), tree: derived.dir };
  const refusesP = (o) => { const r = spawnSync(process.execPath, [SESS, JSON.stringify(o)], { encoding: 'utf8' }); return r.status !== 0 && /GATE-FLOOR-PRODSEM session refused/.test(r.stderr); };
  const { cond: _x, ...noCond0 } = base0;
  check('N7.refuses-a-missing-or-unknown-state', refusesP({ ...noCond0, floor: 'off', instrument: true }) && refusesP({ ...base0, cond: 'Q', floor: 'off', instrument: true }));
  check('N7.refuses-floor-on-outside-the-confirmatory-state', refusesP({ ...base0, cond: 'H', floor: 'on', instrument: true }) && refusesP({ ...base0, cond: 'E', floor: 'armedOff', instrument: true }) && refusesP({ ...base0, cond: 'Ppass', floor: 'on', instrument: true }));
}

// ============ L: scope on the whole runtime, at the CANDIDATE level ============
// The decision-level first divergence can lie later than the first changed score (a raised goal score that is not chosen can
// still change learning / exploration downstream, legitimately), so the scope test is on the candidate scores themselves:
// a gate-only copy of the derived tree gets one more OBSERVATIONAL call after choices.push, recorded by a gate-only driver.
const CAND_ANCHOR = '  choices.push({\n    key: k,\n    weight: arbitratedScore\n  });';
const CAND_LINE = '  if (globalThis.__GFB2_CAND__) globalThis.__GFB2_CAND__(step, k, arbitratedScore); // GATE-ONLY observational call';
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
function candSession(dir, floor, input = {}) {
  let src = fs.readFileSync(SESS, 'utf8');
  const swap = (a, b) => { if (!src.includes(a)) throw new Error('candidate driver anchor missing: ' + a.slice(0, 50)); src = src.replace(a, b); };
  swap("if (mainSha !== (isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(", "if (false) refuse(");
  swap("globalThis.__GFB2__ = {", "globalThis.__GFB2_CANDS__ = []; globalThis.__GFB2_CAND__ = (s, k, w) => { globalThis.__GFB2_CANDS__.push([calls - 1, s, Number(k), w]); }; globalThis.__GFB2__ = {");
  swap("process.stdout.write('\\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\\n');", "out.candidates = globalThis.__GFB2_CANDS__; process.stdout.write('\\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\\n');");
  const f = path.join(HERE, '.__cand_session_' + path.basename(dir) + '_' + floor + '.mjs');
  fs.writeFileSync(f, src);
  try {
    const r = spawnSync(process.execPath, [f, JSON.stringify({ ...inputFor(1, {}), tree: dir, floor, instrument: true, traceWrites: true, ...input })], { encoding: 'utf8', maxBuffer: 1 << 29 });
    const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
    return m ? JSON.parse(m[1]) : null;
  } finally { fs.rmSync(f, { force: true }); }
}
const candDiff = (A, Bc) => { const n = Math.min(A.length, Bc.length); for (let i = 0; i < n; i++) if (A[i][0] !== Bc[i][0] || A[i][1] !== Bc[i][1] || A[i][2] !== Bc[i][2] || A[i][3] !== Bc[i][3]) return i; return A.length === Bc.length ? -1 : n; };
const CAND_TREE = candTreeFrom(derived.dir, 'cand');
const CAND = { off: candSession(CAND_TREE, 'off'), on: candSession(CAND_TREE, 'on'), armed: candSession(CAND_TREE, 'armedOff') };
{
  const { off, on, armed } = CAND;
  check('L1.candidate-sessions-ran', [off, on, armed].every(x => x && !x.outcome.crashed && x.outcome.completed && Array.isArray(x.candidates) && x.candidates.length > 1000));
  const goal = WORLDS[1].goal;
  const d = candDiff(off.candidates, on.candidates);
  check('L1.on-changes-candidate-scores', d >= 0);
  if (d >= 0) {
    const o = off.candidates[d], n = on.candidates[d];
    check('L1.first-changed-candidate-is-the-goal-entering-candidate-of-the-same-call-and-step-and-is-raised', o[0] === n[0] && o[1] === n[1] && o[2] === n[2] && n[2] === goal && n[3] > o[3], JSON.stringify(o) + ' vs ' + JSON.stringify(n));
    check('L1.every-candidate-before-it-is-identical', off.candidates.slice(0, d).every((c, i) => candDiff([c], [on.candidates[i]]) === -1));
  }
  check('L1.armed-but-off-candidate-scores-equal-off', candDiff(off.candidates, armed.candidates) === -1 && off.candidates.length === armed.candidates.length && armed.floor.counters.raised === 0);
  const fl = on.floor;
  check('L2.floor-table-has-only-goal-entering-edges-from-goal-neighbours', Object.keys(fl.byEdge).every(k => { const [u, v] = k.split('->').map(Number); return v === goal && ISEDGE(u, v); }) && fl.counters.lowered === 0 && fl.counters.maxRaise <= 100 + 1e-9);
  check('L2.floor-evaluated-non-graph-goal-candidates-without-raising-them', fl.counters.raised <= fl.counters.legal && fl.counters.legal + fl.counters.notLegal === fl.counters.evaluated);
  // the decision-level view, DESCRIPTIVE: where the executed-decision sequences first differ (an indirect consequence is expected)
  const wo = ON_RECS.trace.off.artifacts.writes.filter(w => typeof w === 'string'), wn = ON_RECS.trace.on.artifacts.writes.filter(w => typeof w === 'string');
  let dd = -1; for (let i = 0; i < Math.min(wo.length, wn.length); i++) if (wo[i] !== wn[i]) { dd = i; break; }
  console.log('INFO first executed-decision divergence at index ' + dd + (dd >= 0 ? ' (' + wo[dd] + ' vs ' + wn[dd] + ')' : '') + ' - descriptive');
}

// ============ A: analysis fixtures ============
const mkEvents = (succ, from = 9) => Array.from({ length: succ }, (_, i) => [i * 3, from, 1]);
const okIntegrity = () => ({ cond: 'P', hooks: { arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off', passEnv: false }, envDraws: 0, envAttempts: 0, envSlips: 0, drawsLogged: 0, harnessAttempts: 0, harnessSlips: 0,
  creditKeys: 0, creditRejected: 0, peLaCalls: 0, peDampCalls: 0, traversal: { attempts: 900, successes: 900, edgesObserved: 60, edgesWithSlip: 0, maxCostEstimate: 1 }, episodeCapArmed: true, replayDeterministic: true, ok: true });
const mkBlock = ({ effect = {}, effectAll = null, perGoalEffect = {}, n = 40, sd = 15, seed = 7, tweak = null }) => {
  const r = prng(seed), noise = () => (r() + r() + r() - 1.5) * sd * 1.6;
  const records = new Map(), controls = {}, worldsPlan = [], valid = [];
  for (let w = 0; w < n; w++) {
    const goal = C.GOALS[w % 4], world = C.WORLD_START + w;
    worldsPlan.push({ world, goal }); valid.push(world);
    const baseLegal = 100 + noise() * 2, baseNon = 60 + noise();
    controls[world] = { realEpisodes: 30, arms: {} };
    for (const arm of C.ARM_ORDER) {
      const a = C.ARMS[arm];
      const eff = (effect[arm] || 0) + ((perGoalEffect[arm] || {})[goal] || 0);
      const effNon = effectAll === null ? 0 : (effectAll[arm] || 0);
      const legal = Math.max(1, Math.round(baseLegal + eff + noise())), nonEdge = Math.max(0, Math.round(baseNon + effNon + noise() / 2));
      const hash = a.store === 'none' ? null : `h-${a.store}-${world}`;
      const nEp = a.store === 'none' ? 0 : (a.store === 'entry-nr' ? 15 : 30);
      controls[world].arms[arm] = { storeHash: hash, episodes: nEp };
      const ev = mkEvents(legal, 9);
      const raised = a.floor ? 40 : 0;
      records.set(`gfp-${arm}-w${world}`, {
        role: 'test', bare: false, floorMode: a.floor ? 'on' : 'off',
        outcome: { crashed: false, completed: true },
        tree: { derived: true, mainSha256: C.TREE.derivedMainSha256 },
        input: { agentSeed: X1.testSeed(world), acceptedConfigSeed: 200000 + world, goal },
        endpoints: { goalReaches: legal + nonEdge, legalReaches: legal, attemptSuccess: null, slipsPerCall: 0, earlyReaches: 10 },
        reaches: { goal: legal + nonEdge, legal, nonEdge, legalCalls: ev.filter(e => e[2] === 1).map(e => e[0]), goalCalls: [] },
        conditionIntegrity: okIntegrity(),
        brain: hash === null ? { deliveredHash: 'none', deliveredHashes: null, start: { hashes: {}, sizes: { episodes: 0, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } }
          : { deliveredHash: 'x', deliveredHashes: { episodes: hash }, start: { hashes: { episodes: hash }, sizes: { episodes: nEp, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } },
        floor: a.floor ? { on: true, tcFloor: C.TC_FLOOR, counters: { evaluated: 120, legal: 100, notLegal: 20, raised, lowered: 0, maxRaise: 100 }, byEdge: { [`9->${goal}`]: { evaluated: 100, raised } } } : null,
        audit: { drawsTotal: 0, drawsIntoGoal: 0, drawsNonEdge: 0, goalReaches: legal + nonEdge, legalReaches: legal, nonEdgeReaches: nonEdge, reachesEqualLegalPlusNonEdge: true, drawsMatchEnvCounters: true },
        finalHop: { ...summarizeEvents(ev), events: ev, drawsIntoGoal: 0, goalEdges: [{ from: 9, p: 1 }, { from: 11, p: 1 }] },
        goalEdgeState: [{ from: 9, p: 1, penalty: ({ COLD: 1, COLD_FLOOR: 3, REAL: 2, ENTRY_NR: 3, REAL_FLOOR: 3 })[arm], reward: 4, transitions: 5 }, { from: 11, p: 1, penalty: 0.5, reward: 1, transitions: 2 }],
      });
    }
  }
  const plan = { block: 'P', worlds: worldsPlan, validWorlds: valid, exclusions: [] };
  if (tweak) tweak({ records, controls, plan });
  return { records, plan, controls };
};
const EFFECT = { COLD_FLOOR: 150, REAL: 70, ENTRY_NR: 140, REAL_FLOOR: 160 };
const WS = C.WORLD_START;
{
  const o = evaluateBlock(mkBlock({ effect: EFFECT }));
  check('A1.clean-block-transfers-with-all-claims', o.valid && o.claims.C1 && o.claims.C3 && o.claims.C4 && o.claims.C5 && o.transfer === 'TRANSFERS' && o.instrument.I2_ENTRY_NR === 'OK' && o.claims.C2_descriptive.gates === false && o.realContrast.gates === false, JSON.stringify(o.claims));
  check('A1.predictions-held-sentence-and-classification', o.predictions.every(p => p.pass) && /improves legal goal reaches over cold/.test(o.verdict) && /Production-like transition semantics under M7 bounds\./.test(o.verdict) && o.classification === C.CLASSIFICATION
    && /separate production-design review/.test(o.verdict), o.verdict);
  check('A1.report-has-the-declared-diagnostics', o.finalHop.comparisons.length === 6 && o.finalHop.byArm.all.COLD_FLOOR.failures === 0 && o.finalHop.drawsIntoGoal.COLD_FLOOR === 0 && o.nonEdgeReaches.vsCOLD.COLD_FLOOR && o.entryEdgeMix.byArm.COLD.distinctGoalEdgesPerSession === 1
    && o.sensitivityAllResets && o.sensitivityBonferroni3.fragile && o.sensitivityBlockHMargins.delta === 15 && o.sensitivityBlockHMargins.minBenefit === 30 && typeof o.floorActivation.nonLegalEvaluatedPerSession === 'number');
  check('A1.degenerate-quantities-are-declared-and-not-averaged', o.attemptSuccess.status === 'DEGENERATE_UNDEFINED_UNDER_STATE_P' && o.attemptSuccess.clauseOfC4 === 'retired' && !('attemptSuccess' in o.armMeans.COLD) && !('slipsPerCall' in o.armMeans.COLD)
    && !('attemptSuccess' in o.perWorld[WS].arms.COLD) && o.degenerate.finalHopFailures === 0 && o.degenerate.finalHopDrawsIntoGoal === 0 && JSON.stringify(o.degenerate.diagnostics) === JSON.stringify(C.DEGENERATE_UNDER_P));
  check('A1.deviations-and-limits-travel-with-the-summary', JSON.stringify(o.deviations) === JSON.stringify(C.DEVIATIONS) && o.deviations.length === 3 && /150-tick/.test(o.deviations[0]) && /replay/.test(o.deviations[1]) && /agentLast->next/.test(o.deviations[2])
    && /identically 1\.0/.test(o.claimLimits[0]) && /graph-distance potential/.test(o.claimLimits[1]));
  const n = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 0 } }));
  check('A2.no-benefit-is-no-meaningful-benefit-and-recommends-against', n.valid && !n.claims.C1 && n.transfer === 'NO_MEANINGFUL_BENEFIT' && /does not improve legal goal reaches over cold/.test(n.verdict) && /production change is not recommended/.test(n.verdict), n.verdict);
  const h = evaluateBlock(mkBlock({ effect: EFFECT, perGoalEffect: { COLD_FLOOR: { 12: -200 } } }));
  check('A3.one-harmed-goal-group-fails-C4', h.valid && !h.claims.C4 && h.claims.harmGroups.length === 1 && h.transfer === 'HARM' && /^HARM/.test(h.verdict), JSON.stringify(h.claims.harmGroups));
  const au = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD_FLOOR-w${WS + 3}`).floor.counters.lowered = 1; } }));
  check('A5.floor-lowering-a-score-fails-C5', au.valid && !au.claims.C5 && au.claims.auditFailureCount === 1 && au.transfer === 'AUDIT_FAILED' && /^AUDIT FAILED/.test(au.verdict));
  const aoff = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD-w${WS + 3}`).audit.reachesEqualLegalPlusNonEdge = false; } }));
  check('A5.audit-failure-in-an-off-session-invalidates', !aoff.valid && /INVALID/.test(aoff.verdict));
  const lo = evaluateBlock(mkBlock({ effect: { ...EFFECT, REAL: 0 } }));
  check('A6.real-gates-nothing-a-real-store-without-benefit-still-transfers', lo.valid && lo.instrument.I1_REAL_descriptive !== 'OK' && lo.claims.C1 && lo.claims.C3 && lo.claims.C4 && lo.claims.C5 && lo.transfer === 'TRANSFERS' && /Descriptive, not gating/.test(lo.verdict) && lo.realContrast.lowerBoundReachesMinBenefit === false, lo.verdict);
  const l2 = evaluateBlock(mkBlock({ effect: { ...EFFECT, ENTRY_NR: 10 } }));
  check('A6.invalid-goal-entry-instrument-voids-c3-and-the-label', l2.valid && l2.instrument.I2_ENTRY_NR !== 'OK' && l2.claims.C1 && !l2.claims.C3 && l2.transfer === 'PARTIAL' && /not interpreted/.test(l2.verdict), l2.verdict);
  const sh = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 70 } }));
  check('A7.floor-short-of-the-ceiling-is-partial', sh.valid && sh.claims.C1 && !sh.claims.C3 && sh.transfer === 'PARTIAL' && sh.classifications.ENTRY_NR_vs_COLD_FLOOR.class === 'FALLS_SHORT');
  const sd = evaluateBlock(mkBlock({ effect: EFFECT, effectAll: { COLD_FLOOR: -120, REAL_FLOOR: -120 } }));
  check('A8.sensitivity-disagreement-is-reported-and-restricts-the-sentence', sd.valid && sd.sensitivityAllResets.agrees === false && /legal reaches only/.test(sd.verdict) && o.sensitivityAllResets.agrees === true, JSON.stringify(sd.sensitivityAllResets));
  const miss = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.delete(`gfp-REAL-w${WS + 5}`); } }));
  const wt = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-REAL-w${WS + 2}`).tree.mainSha256 = 'x'; } }));
  const wm = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD-w${WS + 2}`).floorMode = 'on'; } }));
  const bare = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD-w${WS + 2}`).bare = true; } }));
  const ws = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ controls }) => { controls[WS + 2].arms.ENTRY_NR.storeHash = 'other'; } }));
  const tf = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD-w${WS + 1}`).finalHop.failures += 3; } }));
  const ex = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ plan }) => { plan.exclusions = plan.worlds.slice(0, 8).map(w => ({ world: w.world, reason: 'x' })); } }));
  check('A9.invalid-blocks-are-refused', [miss, wt, wm, bare, ws, tf, ex].every(x => !x.valid) && /no record/.test(miss.problems.join()) && /pinned derived HEAD tree/.test(wt.problems.join()) && /floor mode/.test(wm.problems.join())
    && /uninstrumented/.test(bare.problems.join()) && /delivered episodes differ/.test(ws.problems.join()) && /recomputed from its events/.test(tf.problems.join()));
  check('A10.digests-are-bound', o.designDigest === C.designDigest() && o.decisionDigest === C.decisionDigest() && C.designDigest() !== C.decisionDigest());
  const sepB = evaluateBlock(mkBlock({ effect: EFFECT, effectAll: { COLD_FLOOR: -30, REAL_FLOOR: -30 } }));
  check('A12.primary-and-sensitivity-are-computed-separately', sepB.valid && sepB.benefit.COLD_FLOOR.mean > sepB.benefitAll.COLD_FLOOR.mean + 20 && sepB.instrument.on === 'legal reaches' && sepB.outcome.primary === 'legalReaches' && sepB.outcome.sensitivity === 'goalReaches'
    && sepB.byGoal[8].benefitAll && sepB.byGoal[8].benefit.COLD_FLOOR);
  const ne = o.nonEdgeReaches;
  const goalMean = (g, arm, k) => { const wsl = o.worlds.filter(w => o.perWorld[w].goal === g); return wsl.reduce((s, w) => s + o.perWorld[w].arms[arm][k], 0) / wsl.length; };
  check('A12.non-graph-resets-are-reported-by-arm-and-by-goal-group', ne.byGoal && C.GOALS.every(g => ne.byGoal[g].n === 10 && C.ARM_ORDER.every(a => Math.abs(ne.byGoal[g].byArm[a].mean - goalMean(g, a, 'nonEdge')) < 1e-9
    && Math.abs(ne.byGoal[g].byArm[a].shareOfResets - goalMean(g, a, 'nonEdge') / goalMean(g, a, 'all')) < 1e-9)) && ne.byGoal[8].vsCOLD.COLD_FLOOR.ci && Math.abs(ne.byArm.COLD.mean - o.armMeans.COLD.nonEdge) < 1e-12);
  check('A13.goal-edge-penalty-is-read-per-arm', Math.abs(o.goalEdgeState.byArm.COLD.meanSummedPenalty - 1.5) < 1e-9 && Math.abs(o.goalEdgeState.byArm.COLD_FLOOR.meanSummedPenalty - 3.5) < 1e-9
    && Math.abs(o.goalEdgeState.penaltyVsCOLD.COLD_FLOOR.mean - 2) < 1e-9 && o.goalEdgeState.penaltyVsCOLD.COLD_FLOOR.n === 40);
  check('A11.degenerate-final-hop-has-zero-ratio-and-no-direction', o.finalHop.comparisons.every(c => c.difference === 0 && c.direction === 'NOT_DISTINGUISHABLE') && /DEGENERATE_UNDER_STATE_P/.test(o.finalHop.status));
  // condition integrity: any violation invalidates the whole block (the sessions did not run under state P)
  const viol = (fn) => evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => fn(records.get(`gfp-COLD_FLOOR-w${WS + 4}`)) }));
  const v1 = viol(r => { r.conditionIntegrity.traversal.successes = 899; });
  const v2 = viol(r => { r.conditionIntegrity.cond = 'E'; r.conditionIntegrity.hooks.creditMode = 'on'; });
  const v3 = viol(r => { r.conditionIntegrity.envDraws = 12; });
  const v4 = viol(r => { r.endpoints.attemptSuccess = 0.9; });
  const v5 = viol(r => { r.conditionIntegrity.traversal.attempts = 0; r.conditionIntegrity.traversal.successes = 0; });
  const v6 = viol(r => { r.conditionIntegrity.episodeCapArmed = false; });
  const v7 = viol(r => { r.conditionIntegrity.traversal.maxCostEstimate = 2.5; r.conditionIntegrity.traversal.edgesWithSlip = 3; });
  const v8 = viol(r => { delete r.conditionIntegrity; });
  check('A4.condition-integrity-violations-invalidate-the-block', [v1, v2, v3, v4, v5, v6, v7, v8].every(x => !x.valid && /INVALID/.test(x.verdict))
    && /did not succeed/.test(v1.problems.join()) && /confirmatory state/.test(v2.problems.join()) && /condition envDraws is 12/.test(v3.problems.join()) && /per-attempt success was recorded/.test(v4.problems.join())
    && /evidence is empty/.test(v5.problems.join()) && /episode cap was not armed/.test(v6.problems.join()) && /learned edge cost differs/.test(v7.problems.join()) && /no conditionIntegrity block/.test(v8.problems.join()));
  check('A4.integrity-problems-are-recomputed-not-trusted', integrityProblems({ ...okIntegrity(), traversal: { attempts: 5, successes: 4, edgesWithSlip: 0, maxCostEstimate: 1 }, ok: true }).length > 0 && integrityProblems(okIntegrity()).length === 0);
  // the declared margin sensitivity: a block that clears (15, 30) but not (20, 40) is reported as disagreeing and the sentence says so
  const ms = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 38 } }));
  check('A14.margin-sensitivity-disagreement-is-reported-and-never-decides', ms.valid && ms.claims.C1 === false && ms.sensitivityBlockHMargins.C1_holds === true && ms.sensitivityBlockHMargins.agrees === false && ms.sensitivityBlockHMargins.decisive === false
    && ms.transfer === 'NO_MEANINGFUL_BENEFIT' && /block-H margins/.test(ms.verdict), JSON.stringify(ms.sensitivityBlockHMargins) + ' lower ' + ms.benefit.COLD_FLOOR.ci.lower);
}

// ============ P: power, freshness, seam ============
{
  const calFile = path.join(HERE, 'results', 'calibration_summary.json');
  if (fs.existsSync(calFile)) {
    const cal = JSON.parse(fs.readFileSync(calFile, 'utf8'));
    const legalSd = Object.entries(cal.pairedSd).filter(([k]) => /_legal$/.test(k)).map(([, v]) => v);
    const sdMax = Math.max(...legalSd);
    const need = Math.ceil((2.8 * sdMax / C.MARGIN.delta) ** 2);
    const needGating = Math.ceil((2.8 * cal.pairedSd['ENTRY_NR-COLD_legal'] / C.MARGIN.delta) ** 2);
    check('P1.n-covers-the-largest-legal-calibration-paired-sd-at-the-declared-delta', need <= C.WORLDS_N && needGating <= need && Math.abs(sdMax - C.CALIBRATION.maxLegalPairedSd) < 0.05
      && Math.abs(cal.pairedSd['ENTRY_NR-COLD_legal'] - C.CALIBRATION.gatingLegalPairedSd) < 0.05, 'need ' + need + ' (gating ' + needGating + ') at SD ' + sdMax.toFixed(1) + ', have ' + C.WORLDS_N);
    check('P1.calibration-ran-only-floor-off-arms-on-xfer1-worlds-under-state-p', /^CALIBRATION_NOT_CONFIRMATORY/.test(cal.status) && cal.state === 'P' && Object.keys(cal.arms).sort().join() === 'COLD,ENTRY_NR,REAL' && cal.worlds === C.CALIBRATION.worlds
      && cal.integrity.anyDrawIntoGoal === false && cal.integrity.anySlippedEdge === false && cal.integrity.allConsistent === true);
    check('P1.declared-calibration-constants-match-the-recorded-calibration', Math.abs(cal.benefit.ENTRY_NR_legal.mean - C.CALIBRATION.legalBenefit.ENTRY_NR.mean) < 0.05 && Math.abs(cal.benefit.REAL_legal.mean - C.CALIBRATION.legalBenefit.REAL.mean) < 0.05
      && Math.abs(cal.benefit.ENTRY_NR_legal.ci.lower - C.CALIBRATION.legalBenefit.ENTRY_NR.lower) < 0.05 && Math.abs(cal.benefit.ENTRY_NR_legal.ci.upper - C.CALIBRATION.legalBenefit.ENTRY_NR.upper) < 0.06
      && Math.abs(cal.arms.COLD.legal - C.CALIBRATION.coldLegal) < 0.05);
    check('P1.margins-follow-the-programme-rule-from-the-calibration', Math.abs(C.MARGIN.delta - C.CALIBRATION.legalBenefit.ENTRY_NR.mean / 4) < 1 && C.MARGIN.minBenefit === 2 * C.MARGIN.delta && C.MARGIN.minBenefit < C.CALIBRATION.legalBenefit.ENTRY_NR.lower
      && C.SENSITIVITY_MARGIN.delta === 15 && C.SENSITIVITY_MARGIN.minBenefit === 30);
    check('P1.relative-margins-match-block-h-within-a-point', Math.abs(C.MARGIN.minBenefit / C.CALIBRATION.coldLegal - 30 / 303.8) < 0.01 && Math.abs(C.MARGIN.delta / C.CALIBRATION.coldLegal - 15 / 303.8) < 0.01);
    check('P1.state-decomposition-is-recorded-descriptively', cal.states && cal.states.H && cal.states.E && Math.abs(cal.states.H.benefit.ENTRY_NR_legal.mean - 60.5) < 0.1 && cal.paired['P-E'].COLD_legal.ci.lower < 0 && cal.paired['P-E'].COLD_legal.ci.upper > 0);
  } else check('P1.calibration-summary-present', false, 'results/calibration_summary.json missing');
  const seeds = [];
  for (let w = C.BLOCKS.P.lo; w <= C.BLOCKS.P.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('P2.seeds-fresh-disjoint-from-earlier-studies-and-inside-the-domain', new Set(seeds).size === seeds.length && seeds.every(s => s > C.testSeed(831) && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi
    && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength) && C.seedOk(s).ok));
  const headCache = fs.readdirSync(path.join(ROOT, 'experiments', 'gate-floor-head', 'data')).find(f => f.startsWith('stream_' + C.CONFIG_START + '_832_'));
  const prefix = headCache ? JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'gate-floor-head', 'data', headCache), 'utf8')) : null;
  check('P3.gate-floor-head-prefix-is-the-832-element-stream', prefix !== null && prefix.length === 832);
  const ext = prefix ? continueStream(prefix.slice(0, 5), 8) : [];
  check('P3.continuing-the-recurrence-reproduces-known-elements', prefix !== null && JSON.stringify(ext.slice(5)) === JSON.stringify(prefix.slice(5, 8)));
  const cache = fs.readdirSync(path.join(HERE, 'data')).find(f => f.startsWith('stream_' + C.CONFIG_START + '_' + C.WORLDS_TOTAL + '_'));
  if (cache && prefix) {
    const S = JSON.parse(fs.readFileSync(path.join(HERE, 'data', cache), 'utf8'));
    const blk = S.slice(C.WORLD_START);
    check('P3.extended-stream-keeps-the-prefix-and-has-1112-elements', S.length === 1112 && JSON.stringify(S.slice(0, 832)) === JSON.stringify(prefix));
    check('P3.goals-balanced-seventy-each', C.GOALS.every(gl => blk.filter(e => e.goal === gl).length === 70) && blk.length === 280);
    check('P3.accepted-seeds-ascending-below-heldout-and-not-registered', blk.every((e, i) => e.acceptedSeed < C.HELDOUT_FLOOR && (i === 0 || e.acceptedSeed > blk[i - 1].acceptedSeed) && !typedConfig.isHeldOut(typedConfigSeed(e.acceptedSeed)) && !typedConfig.isConsumed(typedConfigSeed(e.acceptedSeed))));
    check('P3.new-worlds-share-no-configuration-with-earlier-studies', new Set(S.map(e => e.acceptedSeed)).size === S.length);
  } else check('P3.stream-cache-present', false, 'run orchestrate.mjs --plan-only once to extend and cache the stream');
}

// ============ E: recorded results (consistency; skipped until results exist) ============
{
  const f = path.join(HERE, 'results', 'summary_blockP.json');
  if (!fs.existsSync(f)) console.log('E: no recorded results in this tree (freeze state); section skipped');
  else {
    const R = path.join(HERE, 'results');
    const rd = (n) => JSON.parse(fs.readFileSync(path.join(R, n), 'utf8'));
    const S = rd('summary_blockP.json'), MF = rd('manifest_blockP.json');
    const near = (a, b) => Math.abs(a - b) < 1e-9, sameCi = (a, b) => near(a.lower, b.lower) && near(a.upper, b.upper);
    const W = S.worlds, val = (a, k, w) => S.perWorld[w].arms[a][k];
    const diffs = (t, r, k = 'legal', ws = W) => ws.map(w => val(t, k, w) - val(r, k, w));
    const { digest, ...rest } = MF;
    check('E1.manifest-recomputes-and-binds-the-design-the-trees-and-the-state', C.hashObject(rest) === digest && S.manifestDigest === digest && MF.designDigest === C.designDigest() && S.designDigest === C.designDigest()
      && MF.decisionDigest === C.decisionDigest() && MF.tree.derivedMainSha256 === C.TREE.derivedMainSha256 && MF.tree.headMainSha256 === C.TREE.headMainSha256 && MF.tree.headCommit === C.HEAD_COMMIT
      && MF.condition.state === 'P' && JSON.stringify(MF.condition.hooks) === JSON.stringify(C.HOOK_STATES.P) && MF.classification === C.CLASSIFICATION);
    check('E1.summary-valid-and-complete', S.valid === true && S.problems.length === 0 && S.excludedFraction <= C.RULES.maxExcludedFraction && S.state === 'P' && S.classification === C.CLASSIFICATION
      && W.length >= C.WORLDS_N * (1 - C.RULES.maxExcludedFraction) && W.every((w, i) => w >= C.BLOCKS.P.lo && w <= C.BLOCKS.P.hi && (i === 0 || w > W[i - 1]))
      && Object.keys(MF.sessions).length >= W.length * 6 && Object.keys(MF.sessions).length <= C.WORLDS_N * 6);
    check('E1.no-world-was-excluded-or-the-exclusions-are-listed', S.excludedFraction === 0 ? W.length === C.WORLDS_N && Object.keys(MF.sessions).length === C.WORLDS_N * 6 : MF.exclusions > 0);
    const bOk = C.ARM_ORDER.filter(a => a !== 'COLD').every(a => { const b = pairedSummary(diffs(a, 'COLD'), X1.BOOTSTRAP), c = pairedSummary(diffs(a, 'COLD', 'all'), X1.BOOTSTRAP); return near(b.mean, S.benefit[a].mean) && sameCi(b.ci, S.benefit[a].ci) && near(c.mean, S.benefitAll[a].mean) && sameCi(c.ci, S.benefitAll[a].ci); });
    check('E2.benefits-legal-and-all-recompute-from-the-per-world-data', bOk);
    const sf = (ref, x, k = 'legal') => pairedSummary(diffs(ref, x, k), X1.BOOTSTRAP);
    const sR = sf('REAL', 'COLD_FLOOR'), sE = sf('ENTRY_NR', 'COLD_FLOOR');
    check('E2.shortfall-classes-recompute-at-the-declared-delta', C.classifyShortfall(sR.ci) === S.classifications.REAL_vs_COLD_FLOOR.class && C.classifyShortfall(sE.ci) === S.classifications.ENTRY_NR_vs_COLD_FLOOR.class
      && C.classifyShortfall(sf('REAL', 'COLD_FLOOR', 'all').ci) === S.classificationsAll.REAL_vs_COLD_FLOOR.class && C.classifyShortfall(sf('ENTRY_NR', 'COLD_FLOOR', 'all').ci) === S.classificationsAll.ENTRY_NR_vs_COLD_FLOOR.class);
    const okc = (c) => c === 'NON_INFERIOR' || c === 'EXCEEDS';
    const bF = pairedSummary(diffs('COLD_FLOOR', 'COLD'), X1.BOOTSTRAP), bE = pairedSummary(diffs('ENTRY_NR', 'COLD'), X1.BOOTSTRAP);
    const c1 = bF.ci.lower >= C.MARGIN.minBenefit, i2 = bE.ci.lower >= C.MARGIN.minBenefit, c3 = i2 && okc(C.classifyShortfall(sE.ci));
    const harmG = C.GOALS.filter(gg => pairedSummary(diffs('COLD_FLOOR', 'COLD', 'legal', W.filter(w => S.perWorld[w].goal === gg)), X1.BOOTSTRAP).ci.upper < 0);
    const c4 = harmG.length === 0;
    const c5 = W.every(w => ['COLD_FLOOR', 'REAL_FLOOR'].every(a => { const fl = S.perWorld[w].arms[a].floor; return fl && fl.lowered === 0 && fl.maxRaise <= 100 + 1e-9; }));
    check('E3.gating-claims-recompute-by-the-declared-rules', S.claims.C1 === c1 && S.claims.C3 === c3 && S.claims.C4 === c4 && S.claims.C5 === c5 && S.claims.auditFailureCount === 0 && S.instrument.I2_ENTRY_NR === (i2 ? 'OK' : S.instrument.I2_ENTRY_NR), JSON.stringify({ c1, c3, c4, c5 }));
    check('E3.label-follows-the-declared-rules', S.transfer === C.transferLabel({ c1, c3, c4, c5, i2: i2 ? 'OK' : 'x' }) && S.claims.C2_descriptive.gates === false && S.realContrast.gates === false);
    const smC1 = bF.ci.lower >= C.SENSITIVITY_MARGIN.minBenefit, smI2 = bE.ci.lower >= C.SENSITIVITY_MARGIN.minBenefit;
    check('E3.block-h-margin-sensitivity-recomputes-and-is-not-decisive', S.sensitivityBlockHMargins.C1_holds === smC1 && (S.sensitivityBlockHMargins.I2 === 'OK') === smI2 && S.sensitivityBlockHMargins.decisive === false
      && S.sensitivityBlockHMargins.C3_class === C.classifyShortfall(sE.ci, C.SENSITIVITY_MARGIN.delta));
    check('E3.real-is-reported-with-its-own-benefit-and-does-not-gate', near(S.realContrast.benefitLegal.mean, pairedSummary(diffs('REAL', 'COLD'), X1.BOOTSTRAP).mean) && S.instrument.gating.join() === 'I2_ENTRY_NR');
    check('E4.degenerate-diagnostics-are-reported-as-such', S.attemptSuccess.status === 'DEGENERATE_UNDEFINED_UNDER_STATE_P' && C.ARM_ORDER.every(a => S.finalHop.drawsIntoGoal[a] === 0 && S.finalHop.byArm.all[a].failures === 0)
      && C.ARM_ORDER.every(a => !('attemptSuccess' in S.armMeans[a])) && S.degenerate.finalHopDrawsIntoGoal === 0 && /DEGENERATE_UNDER_STATE_P/.test(S.finalHop.status));
    check('E4.mandatory-classification-deviations-and-limits-are-in-the-summary', S.classification === C.CLASSIFICATION && JSON.stringify(S.deviations) === JSON.stringify(C.DEVIATIONS) && JSON.stringify(S.claimLimits) === JSON.stringify(C.CLAIM_LIMITS)
      && S.verdict.endsWith(C.CLASSIFICATION));
    check('E5.exploratory-files-are-labelled', !fs.existsSync(path.join(R, 'exploratory_blockP.json')) || rd('exploratory_blockP.json').status === 'EXPLORATORY_POST_HOC');
    // E6 (added at results time; a verification of the recorded evidence, not part of the frozen design or analysis): the per-session
    // condition-integrity export covers every manifest session, binds each file hash and records no violation
    const ciFile = path.join(R, 'condition_integrity_blockP.json');
    if (!fs.existsSync(ciFile)) check('E6.condition-integrity-evidence-present', false, 'results/condition_integrity_blockP.json missing');
    else {
      const I = rd('condition_integrity_blockP.json');
      check('E6.condition-integrity-evidence-covers-every-session-with-no-violation', I.state === 'P' && I.manifestDigest === digest && I.sessions === Object.keys(MF.sessions).length && I.rows.length === I.sessions && I.violations === 0
        && I.rows.every(r => r.cond === 'P' && r.ok === true && r.recomputedProblems === 0 && r.envDraws === 0 && r.drawsLogged === 0 && r.creditKeys === 0 && r.peLaCalls === 0 && r.peDampCalls === 0
          && r.traversalAttempts > 0 && r.traversalAttempts === r.traversalSuccesses && r.edgesWithSlip === 0 && r.maxCostEstimate === 1 && r.episodeCapArmed === true && r.replayDeterministic === true
          && r.attemptSuccess === null && MF.sessions[r.file] === r.sha256)
        && I.totals.traversalAttempts === I.totals.traversalSuccesses && I.totals.envDraws === 0 && I.totals.creditKeys === 0 && I.totals.peCalls === 0 && I.totals.sessionsWithNonNullAttemptSuccess === 0);
    }
  }
}

// ============ M: mutants ============
{
  const copyTree = (tag, edit) => {
    const dir = path.join(SCRATCH, `tree_${tag}`);
    fs.cpSync(derived.dir, dir, { recursive: true });
    const p = path.join(dir, 'main.js');
    fs.writeFileSync(p, edit(fs.readFileSync(p, 'utf8')));
    return dir;
  };
  // the session refuses a tree whose main.js is not the pinned one, so mutant trees are run through a probe-style run:
  // a tiny driver that skips the pin check by running the session with the pin temporarily satisfied
  const runMutant = (dir, floor) => {
    const src = fs.readFileSync(SESS, 'utf8').replace("if (mainSha !== (isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(", "if (false) refuse(");
    const f = path.join(path.dirname(SESS), `.__mutant_session_${path.basename(dir)}.mjs`);
    fs.writeFileSync(f, src);
    try { const r = spawnSync(process.execPath, [f, JSON.stringify({ ...inputFor(1, {}), tree: dir, floor, instrument: true, traceWrites: true })], { encoding: 'utf8', maxBuffer: 1 << 28 });
      const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s); return m ? JSON.parse(m[1]) : null; } finally { fs.rmSync(f, { force: true }); }
  };
  const ref = ON_RECS.trace;
  const wr = (r) => r.artifacts.writes.filter(w => typeof w === 'string').join('|');
  {
    const dir = copyTree('m1', t => t.replace('if (globalThis.__GATEFLOORB2__ && globalThis.__GATEFLOORB2__.on) goalGradientBoost', 'if (globalThis.__GATEFLOORB2__) goalGradientBoost'));
    const r = runMutant(dir, 'armedOff');
    mutant('M1.guard-without-the-on-switch', r && r.artifacts.fingerprint !== ref.off.artifacts.fingerprint, 'armed-but-off was still equal to off');
  }
  {
    const dir = copyTree('m2', t => { const L = t.split('\n'); const i = L.indexOf(FLOOR_LINE); L.splice(i, 1); L.splice(L.indexOf(FLOOR_ANCHOR), 0, FLOOR_LINE); return L.join('\n'); });
    const r = runMutant(dir, 'on');
    mutant('M2.floor-before-the-anchor-is-inert', r && r.artifacts.fingerprint === ref.off.artifacts.fingerprint, 'ON still diverged');
  }
  {
    // M3: the floor line is also executed in the NON-goal branch, so it can change a non-goal candidate's score
    const dir = candTreeFrom(derived.dir, 'm3', t => t.replace('goalGradientBoost *= (0.10 + 0.90 * tc);', 'goalGradientBoost *= (0.10 + 0.90 * tc); if (globalThis.__GATEFLOORB2__ && globalThis.__GATEFLOORB2__.on) goalGradientBoost = 100 * Math.max(tc, 1);'));
    const r = candSession(dir, 'on');
    const d = r ? candDiff(CAND.off.candidates, r.candidates) : -1;
    const g0 = WORLDS[1].goal;
    const looksLikeAGoalEntry = d >= 0 && r.candidates[d][2] === g0 && r.candidates[d][3] > CAND.off.candidates[d][3];
    mutant('M3.floor-leaking-into-the-non-goal-branch-fails-the-candidate-level-scope-test', r && !looksLikeAGoalEntry, 'the first changed candidate still looked like the raised goal-entering candidate');
  }
  {
    const dir = copyTree('m4', t => t.replace(PROBE_LINE, '    if (globalThis.__GFB2__) globalThis.__GFB2__.goalReset(agentLast, current, goalNeuronId); // moved arg'));
    const r = runMutant(dir, 'off');
    mutant('M4.probe-reporting-the-wrong-position-breaks-the-legal-reach-record', r && JSON.stringify(r.finalHop.events) !== JSON.stringify(ref.off.finalHop.events), 'events identical');
  }
  // analysis mutants
  const loadMutated = async (file, edits, tag) => {
    let t = fs.readFileSync(path.join(HERE, file), 'utf8');
    for (const [from, to] of edits) { if (!t.includes(from)) throw new Error(`mutant ${tag}: pattern not found in ${file}`); t = t.replace(from, to); }
    t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
    const f = path.join(SCRATCH, `mut_${tag}_${file}`);
    fs.writeFileSync(f, t);
    return import(pathToFileURL(f).href);
  };
  const clone2 = (b) => ({ records: new Map([...b.records.entries()].map(([k, v]) => [k, clone(v)])), plan: clone(b.plan), controls: clone(b.controls) });
  const am = [
    ['M5.primary-uses-every-reset-instead-of-legal-reaches', [["out.benefit[a] = pairedSummary(diffs(a, 'COLD', 'legal'), C.BOOTSTRAP);", "out.benefit[a] = pairedSummary(diffs(a, 'COLD', 'all'), C.BOOTSTRAP);"]], () => mkBlock({ effect: { COLD_FLOOR: 0, REAL: 70, ENTRY_NR: 140, REAL_FLOOR: 10 }, effectAll: { COLD_FLOOR: 200, REAL_FLOOR: 200 } })],
    ['M6.harm-rule-uses-lower-bound', [['harm: b.ci.upper < 0,', 'harm: b.ci.lower < 0,']], () => mkBlock({ effect: EFFECT, perGoalEffect: { COLD_FLOOR: { 8: -147 } } })],
    ['M7.floor-lowering-ignored', [["if (c.lowered !== 0) p.push(`floor lowered a score ${c.lowered} time(s)`);", '']], () => mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD_FLOOR-w${C.WORLD_START + 3}`).floor.counters.lowered = 1; } })],
    ['M8.invalid-goal-entry-instrument-ignored-for-c3', [["const c3 = i2 === 'OK' && okClass", 'const c3 = okClass']], () => mkBlock({ effect: { ...EFFECT, ENTRY_NR: 10 } })],
    ['M9.condition-integrity-ignored', [['p.push(...integrityProblems(rec.conditionIntegrity));', '']], () => mkBlock({ effect: EFFECT, tweak: ({ records }) => { const r = records.get(`gfp-COLD_FLOOR-w${C.WORLD_START + 3}`); r.conditionIntegrity.envDraws = 12; r.conditionIntegrity.ok = false; } })],
    ['M10.sensitivity-always-agrees', [['const sensitivityAgrees = (bAllLower', 'const sensitivityAgrees = true || (bAllLower']], () => mkBlock({ effect: EFFECT, effectAll: { COLD_FLOOR: -120, REAL_FLOOR: -120 } })],
    ['M11.margin-sensitivity-always-agrees', [['const marginSensitivityAgrees = smC1 === c1 && smC3 === c3 && smI2 === i2;', 'const marginSensitivityAgrees = true;']], () => mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 38 } })],
    ['M12.empty-integrity-evidence-accepted', [["if (!(tr.attempts > 0)) p.push('condition integrity evidence is empty: no traversal was recorded');", '']], () => mkBlock({ effect: EFFECT, tweak: ({ records }) => { const r = records.get(`gfp-COLD_FLOOR-w${C.WORLD_START + 3}`); r.conditionIntegrity.traversal.attempts = 0; r.conditionIntegrity.traversal.successes = 0; } })],
    ['M13.non-null-attempt-success-accepted', [["if (rec.endpoints.attemptSuccess !== null) p.push('per-attempt success was recorded: an environment draw exists under state P');", '']], () => mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfp-COLD-w${C.WORLD_START + 3}`).endpoints.attemptSuccess = 0.9; } })],
    ['M14.label-ignores-c4', [["out.transfer = C.transferLabel({ c1, c3, c4, c5, i2 });", "out.transfer = C.transferLabel({ c1, c3, c4: true, c5, i2 });"]], () => mkBlock({ effect: EFFECT, perGoalEffect: { COLD_FLOOR: { 12: -200 } } })],
  ];
  const truth = (o) => (o.valid ? JSON.stringify([o.claims.C1, o.claims.C3, o.claims.C4, o.claims.C5, o.sensitivityAllResets.agrees, o.sensitivityBlockHMargins.agrees, o.transfer]) : 'INVALID');
  for (const [id, edits, fx] of am) {
    const mod = await loadMutated('analyze.mjs', edits, id.split('.')[0]);
    const b = fx();
    const real = truth(evaluateBlock(clone2(b))), mut = truth(mod.evaluateBlock(clone2(b)));
    mutant(id, real !== mut, `claims identical under the mutant: ${real}`);
  }
}

console.log(`\nGATE-FLOOR-PRODSEM gate: ${passed} checks passed, ${failed} failed; mutants ${caught} caught, ${missed} missed`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
fs.rmSync(SCRATCH, { recursive: true, force: true });

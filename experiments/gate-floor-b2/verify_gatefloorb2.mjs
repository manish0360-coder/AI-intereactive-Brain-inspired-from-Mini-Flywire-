// ==========================================================
// GATE-FLOOR-B2 — verification gate (design and instrument integrity; prints NO confirmatory endpoint)
// ==========================================================
//   node experiments/gate-floor-b2/verify_gatefloorb2.mjs
// Sections
//   S  static     : declarations, provenance of the floor value, pins, production and earlier studies untouched
//   D  diff       : pristine vs conformed - six files, every conformance edit guarded, the goal-entry block identical
//   T  transform  : the derived tree = pristine + exactly the two guarded lines; refusals
//   U  unit       : the floor runtime's scope (shared with GATE-FLOOR-1)
//   N  neutrality : bare pristine == bare derived == measured OFF == armed-but-off, whole sessions, with/without a store
//   L  scope      : first behavioural divergence of ON vs OFF is a legal goal entry; B2's draw semantics are as documented
//   A  analysis   : claims, statuses, sensitivity and sentences on exact fixtures
//   P  power      : sample size from the calibration; fresh worlds and seeds; stream seam
//   M  mutants    : deliberately broken transform / analysis must be caught (anti-vacuity)
// Sessions run on XFER-1 worlds 1-3 (outside every GATE-FLOOR-B2 world).  No confirmatory figure is printed.
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
import { createFloor } from '../gate-floor1/floor_runtime.mjs';
import { summarizeEvents } from '../gate-floor1/finalhop.mjs';
import { continueStream } from '../gate-floor1/stream.mjs';
import * as C from './config.mjs';
import { transformMain, buildDerivedTree, FLOOR_ANCHOR, FLOOR_LINE, PROBE_ANCHOR, PROBE_LINE } from './transform.mjs';
import { evaluateBlock, recordProblems } from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(`${id} ${detail}`); } console.log(`${cond ? 'PASS' : 'FAIL'} ${id}${cond || !detail ? '' : ' :: ' + detail}`); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'CAUGHT' : 'MISSED'} ${id}${ok || !detail ? '' : ' :: ' + detail}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const clone = (o) => JSON.parse(JSON.stringify(o));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'gfb2-verify-'));

const pristine = buildTree({ pristine: true });
const conformed = buildTree();
const derived = buildDerivedTree();
const mainP = fs.readFileSync(path.join(pristine.dir, 'main.js'), 'utf8');
const mainC = fs.readFileSync(path.join(conformed.dir, 'main.js'), 'utf8');
const mainD = fs.readFileSync(path.join(derived.dir, 'main.js'), 'utf8');
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];

// ============ S: static ============
{
  check('S1.arms-claims-margins-are-the-gate-floor1-ones', JSON.stringify(C.ARM_ORDER) === JSON.stringify(G.ARM_ORDER) && C.CLAIMS === G.CLAIMS && C.MARGIN === G.MARGIN && C.MARGIN.delta === 25 && C.MARGIN.minBenefit === 50 && C.MARGIN.maxAttemptDrop === 0.05);
  check('S1.floor-value-is-the-same', C.TC_FLOOR === 1 && C.FLOOR_BASE_VALUE === 100 && C.TC_FLOOR === G.TC_FLOOR);
  check('S1.block-is-after-gate-floor1', C.WORLD_START === G.BLOCKS.F.hi + 1 && C.WORLD_START === 392 && C.WORLDS_N === 160 && C.blockOf(391) === null && C.blockOf(392) === 'G' && C.blockOf(551) === 'G' && C.blockOf(552) === null);
  check('S1.primary-is-legal-reaches-and-sensitivity-is-every-reset', C.OUTCOME.primary === 'legalReaches' && C.OUTCOME.sensitivity === 'goalReaches');
  check('S1.five-predictions-bound-to-claims', C.PREDICTIONS.length === 5 && C.PREDICTIONS.every(p => C.CLAIMS.some(c => c.id === p.claim)));
  check('S2.pins-are-the-content-hashes-of-the-built-trees', sha(mainP) === C.TREE.pristineMainSha256 && sha(mainD) === C.TREE.derivedMainSha256 && C.B2_COMMIT === pristine.manifest.b2Commit
    && conformed.manifest.transformed['main.js'].sha256Before === C.TREE.pristineMainSha256);
  check('S2.pristine-tree-is-the-untransformed-b2-blob-set', pristine.manifest.transformSha256 === null && Object.keys(pristine.manifest.transformed).length === 0 && pristine.manifest.fileCount === 146);
  check('S2.floor-base-value-is-the-blocks-own-goal-assignment-in-pristine-main',
    /if \(Number\(k\) === Number\(goalNeuronId\)\) \{[\s\S]{0,700}goalGradientBoost = 100;/.test(mainP) && (mainP.match(/goalGradientBoost = 100 \* tc;/g) || []).length === 1);
  check('S2.b2-takes-no-draw-for-a-goal-entering-move-and-no-n1', /Number\(next\) === Number\(goalNeuronId\);/.test(mainP) && /\(next !== null && !_goalResetJustHappened && _m7env\)/.test(mainP) && !/N1-MASK|N1-GUARD/.test(mainP));
  const envSrc = fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js'), 'utf8');
  check('S2.env-attempt-returns-true-without-a-draw-for-a-non-edge', /if \(p === null\) return true;\s+\/\/ unknown edge: unchanged behaviour/.test(envSrc));
  const st = spawnSync('git', ['-C', ROOT, 'status', '--porcelain', '--untracked-files=no', '--', 'main.js', 'render', 'instrumentation', 'experiments/h1r', 'experiments/xfer1', 'experiments/xfer2', 'experiments/gate-floor1', 'experiments/m7', 'experiments/mcf1', 'experiments/registry'], { encoding: 'utf8' });
  check('S3.no-production-or-earlier-study-file-modified', st.status === 0 && st.stdout.trim() === '', st.stdout.trim().slice(0, 200));
  const bad = [];
  for (const f of fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_gatefloorb2.mjs')) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Math\.random|performance\.now/.test(t)) bad.push(`${f}: ambient randomness or clock`);
    if (/Date\.now|new Date\(/.test(t) && f !== 'stream.mjs') bad.push(`${f}: wall clock`);
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(`${f}: sets a stage authorisation`);
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(`${f}: local absolute path`);
  }
  check('S4.source-hygiene', bad.length === 0, bad.join('; '));
}

// ============ D: pristine vs conformed ============
{
  const changed = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(pristine.dir, d), { withFileTypes: true })) { const rel = path.posix.join(d, e.name); if (e.isDirectory()) walk(rel); else if (rel !== 'MANIFEST.json' && !fs.readFileSync(path.join(pristine.dir, rel)).equals(fs.readFileSync(path.join(conformed.dir, rel)))) changed.push(rel); } };
  walk('.');
  check('D1.exactly-the-six-transform-targets-differ', JSON.stringify(changed.map(c => c.replace(/^\.\//, '')).sort()) === JSON.stringify(['instrumentation/rng.js', 'main.js', 'render/behavior.js', 'render/episodeManager.js', 'render/qlearning.js', 'render/scoring.js'].sort()), changed.join(','));
  // every changed/added line of main.js in the conformed tree names a guard
  const a = mainP.split('\n'), b = mainC.split('\n');
  // the one unguarded addition is a pure declaration of four locals (reads two variables, no side effect) used only by guarded lines
  const R1_DECL = /^let _h1rTrav = true, _h1rU = agentCurrent, _h1rV = next, _h1rGoalResets = 0;/;
  const setP = new Set(a), unguarded = b.filter(l => !setP.has(l) && !/__H1R__|__H1R_MEASURE__/.test(l) && !R1_DECL.test(l) && l.trim() !== '');
  check('D2.every-conformed-main-line-not-in-pristine-names-an-h1r-guard', unguarded.length === 0, unguarded.slice(0, 3).join(' | '));
  const region = (t) => { const i = t.indexOf('GOAL GRADIENT — THE MISSING PULL'), j = t.indexOf('end: if (goalNeuronId !== null)'); return t.slice(i, j); };
  check('D3.the-goal-entry-gradient-block-is-identical-in-both-trees', region(mainP).length > 1000 && region(mainP) === region(mainC));
}

// ============ T: transform ============
{
  const a = mainP.split('\n'), b = mainD.split('\n');
  const fi = b.indexOf(FLOOR_LINE), pi = b.indexOf(PROBE_LINE);
  check('T1.exactly-two-lines-added', b.length === a.length + 2 && fi > 0 && pi > 0);
  check('T1.floor-line-follows-the-anchor-and-probe-line-precedes-the-reset', b[fi - 1] === FLOOR_ANCHOR && b[pi + 1] === PROBE_ANCHOR);
  check('T1.removing-the-two-lines-restores-pristine-main-byte-for-byte', b.filter((_, k) => k !== fi && k !== pi).join('\n') === mainP);
  check('T2.every-other-file-is-byte-identical-to-pristine', Object.entries(pristine.manifest.files).every(([p, h]) => p === 'main.js' || derived.manifest.files[p] === h) && Object.keys(derived.manifest.files).length === 146);
  check('T2.guards-read-undefined-globals-first', /^\s*if \(globalThis\.__GATEFLOORB2__ && globalThis\.__GATEFLOORB2__\.on\)/.test(FLOOR_LINE) && /^\s*if \(globalThis\.__GFB2__\)/.test(PROBE_LINE));
  check('T2.probe-is-call-only', !/[^=!<>]=[^=]/.test(PROBE_LINE.replace(/\/\/.*$/, '').replace(/^\s*if \(globalThis\.__GFB2__\) /, '')));
  const refuses = (t) => { try { transformMain(t); return false; } catch { return true; } };
  check('T3.refuses-a-missing-floor-anchor', refuses(mainP.replace(FLOOR_ANCHOR, '          goalGradientBoost = 99 * tc;')));
  check('T3.refuses-a-duplicated-floor-anchor', refuses(mainP.replace(FLOOR_ANCHOR, FLOOR_ANCHOR + '\n' + FLOOR_ANCHOR)));
  check('T3.refuses-a-missing-probe-anchor', refuses(mainP.replace(PROBE_ANCHOR, '    agentCurrent = allIds[0];')));
  check('T3.refuses-a-duplicated-probe-anchor', refuses(mainP.replace(PROBE_ANCHOR, PROBE_ANCHOR + '\n' + PROBE_ANCHOR)));
  check('T3.refuses-an-already-tagged-source', refuses(mainD));
  check('T3.refuses-a-source-without-the-fix3-header', refuses(mainP.replace('FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS', 'FIX 3: renamed')));
  check('T3.refuses-an-altered-reset-context', refuses(mainP.replace('    agentLast    = agentCurrent;\n\n    // Fix C', '    agentLast = agentCurrent;\n\n    // Fix C')));
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

// ============ N: whole-session neutrality (XFER-1 worlds 1..3) ============
const WORLDS = generateAcceptedStream(X1.CONFIG_START, 4);
const SESS = path.join(HERE, 'session.mjs');
function session(input) {
  const r = spawnSync(process.execPath, [SESS, JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
  return { rec: m ? JSON.parse(m[1]) : null, code: r.status, err: r.stderr.slice(-300) };
}
const inputFor = (w, extra) => ({ role: 'test', label: 'g', world: w, configSeed: WORLDS[w].acceptedSeed, configIndex: WORLDS[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', ...extra });
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
    const bareP = session({ ...base, tree: pristine.dir, floor: 'off', instrument: false });
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
  check('N1.bare-pristine-equals-bare-derived-equals-measured-off-equals-armed-off', allOk, why.join('; '));
  check('N1.compared-quantities-include-decisions-environment-draws-and-end-state', Object.keys(bareView(session({ ...inputFor(1, {}), tree: pristine.dir, floor: 'off', instrument: false }).rec)).join() === 'fp,ticks,cog,vis,env,qs,qe,end');
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
  const refuses = (o, env = {}) => { const r = spawnSync(process.execPath, [SESS, JSON.stringify(o)], { encoding: 'utf8', env: { ...process.env, ...env } }); return r.status !== 0 && /GATE-FLOOR-B2 session refused/.test(r.stderr); };
  check('N4.refuses-floor-on-the-bare-run', refuses({ ...base, floor: 'on', instrument: false }));
  check('N4.refuses-floor-on-the-pristine-tree', refuses({ ...base, tree: pristine.dir, floor: 'on', instrument: true }));
  check('N4.refuses-the-instrumented-run-on-the-pristine-tree', refuses({ ...base, tree: pristine.dir, floor: 'off', instrument: true }));
  check('N4.refuses-the-conformed-tree', refuses({ ...base, tree: conformed.dir, floor: 'off', instrument: false }));
  check('N4.refuses-h1r-on', refuses({ ...base, floor: 'off', instrument: true }, { H1R: 'on' }));
  check('N4.refuses-a-wrong-agent-seed', refuses({ ...base, agentSeed: X1.testSeed(1) + 2, floor: 'off', instrument: true }));
}

// ============ L: scope on the whole runtime ============
{
  const { off, on } = ON_RECS.trace;
  const wo = off.artifacts.writes.filter(w => typeof w === 'string'), wn = on.artifacts.writes.filter(w => typeof w === 'string');
  let d = -1; for (let i = 0; i < Math.min(wo.length, wn.length); i++) if (wo[i] !== wn[i]) { d = i; break; }
  check('L1.on-diverges-from-off', d >= 0);
  if (d >= 0) {
    const [fo, to] = wo[d].split('->').map(Number), [fn, tn] = wn[d].split('->').map(Number);
    check('L1.first-divergent-decision-is-the-same-position-and-enters-the-goal-on-a-legal-edge', fo === fn && tn === WORLDS[1].goal && ISEDGE(fn, tn) && to !== WORLDS[1].goal, `${wo[d]} vs ${wn[d]}`);
  }
  const fl = on.floor;
  check('L2.floor-table-has-only-goal-entering-edges-from-goal-neighbours', Object.keys(fl.byEdge).every(k => { const [u, v] = k.split('->').map(Number); return v === WORLDS[1].goal && ISEDGE(u, v); }) && fl.counters.lowered === 0 && fl.counters.maxRaise <= 100 + 1e-9);
  check('L2.floor-evaluated-non-graph-goal-candidates-without-raising-them', fl.counters.notLegal >= 0 && fl.counters.raised <= fl.counters.legal && fl.counters.legal + fl.counters.notLegal === fl.counters.evaluated);
}

// ============ A: analysis fixtures ============
const mkEvents = (succ, from = 9) => Array.from({ length: succ }, (_, i) => [i * 3, from, 1]);
const mkBlock = ({ effect = {}, effectAll = null, perGoalEffect = {}, attemptDelta = {}, n = 40, sd = 15, seed = 7, tweak = null }) => {
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
      records.set(`gfb2-${arm}-w${world}`, {
        role: 'test', bare: false, floorMode: a.floor ? 'on' : 'off',
        outcome: { crashed: false, completed: true },
        tree: { derived: true, mainSha256: C.TREE.derivedMainSha256 },
        input: { agentSeed: X1.testSeed(world), acceptedConfigSeed: 200000 + world, goal },
        endpoints: { goalReaches: legal + nonEdge, legalReaches: legal, attemptSuccess: 0.66 + (attemptDelta[arm] || 0), slipsPerCall: 0.2, earlyReaches: 10 },
        reaches: { goal: legal + nonEdge, legal, nonEdge, legalCalls: ev.filter(e => e[2] === 1).map(e => e[0]), goalCalls: [] },
        brain: hash === null ? { deliveredHash: 'none', deliveredHashes: null, start: { hashes: {}, sizes: { episodes: 0, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } }
          : { deliveredHash: 'x', deliveredHashes: { episodes: hash }, start: { hashes: { episodes: hash }, sizes: { episodes: nEp, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } },
        floor: a.floor ? { on: true, tcFloor: C.TC_FLOOR, counters: { evaluated: 120, legal: 100, notLegal: 20, raised, lowered: 0, maxRaise: 100 }, byEdge: { [`9->${goal}`]: { evaluated: 100, raised } } } : null,
        audit: { drawsTotal: 500, drawsIntoGoal: 0, drawsNonEdge: 20, goalReaches: legal + nonEdge, legalReaches: legal, nonEdgeReaches: nonEdge, reachesEqualLegalPlusNonEdge: true, drawsMatchEnvCounters: true },
        finalHop: { ...summarizeEvents(ev), events: ev, drawsIntoGoal: 0, goalEdges: [{ from: 9, p: 0.9 }, { from: 11, p: 0.7 }] },
        goalEdgeState: [{ from: 9, p: 0.9, penalty: ({ COLD: 1, COLD_FLOOR: 3, REAL: 2, ENTRY_NR: 3, REAL_FLOOR: 3 })[arm], reward: 4, transitions: 5 }, { from: 11, p: 0.7, penalty: 0.5, reward: 1, transitions: 2 }],
      });
    }
  }
  const plan = { block: 'G', worlds: worldsPlan, validWorlds: valid, exclusions: [] };
  if (tweak) tweak({ records, controls, plan });
  return { records, plan, controls };
};
const EFFECT = { COLD_FLOOR: 150, REAL: 70, ENTRY_NR: 140, REAL_FLOOR: 160 };
{
  const o = evaluateBlock(mkBlock({ effect: EFFECT }));
  check('A1.clean-block-is-replicated-with-all-claims', o.valid && o.claims.C1 && o.claims.C2 && o.claims.C3 && o.claims.C4 && o.claims.C5 && o.replication === 'REPLICATED' && o.instrument.I1_REAL === 'OK' && o.instrument.I2_ENTRY_NR === 'OK', JSON.stringify(o.claims));
  check('A1.predictions-held-and-sentence', o.predictions.every(p => p.pass) && /improves legal goal reaches over cold/.test(o.verdict), o.verdict);
  check('A1.report-has-the-declared-diagnostics', o.finalHop.comparisons.length === 6 && o.finalHop.byArm.all.COLD_FLOOR.failures === 0 && o.finalHop.drawsIntoGoal.COLD_FLOOR === 0 && o.nonEdgeReaches.vsCOLD.COLD_FLOOR && o.entryEdgeMix.byArm.COLD.distinctGoalEdgesPerSession === 1
    && o.sensitivityAllResets && o.sensitivityBonferroni3.fragile && typeof o.floorActivation.nonLegalEvaluatedPerSession === 'number');
  const n = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 0 } }));
  check('A2.no-benefit-is-not-replicated', n.valid && !n.claims.C1 && n.replication === 'NOT_REPLICATED' && /does not improve legal goal reaches over cold/.test(n.verdict), n.verdict);
  const h = evaluateBlock(mkBlock({ effect: EFFECT, perGoalEffect: { COLD_FLOOR: { 12: -200 } } }));
  check('A3.one-harmed-goal-group-fails-C4', h.valid && !h.claims.C4 && h.claims.harmGroups.length === 1 && h.replication === 'HARM' && /^HARM/.test(h.verdict), JSON.stringify(h.claims.harmGroups));
  const at = evaluateBlock(mkBlock({ effect: EFFECT, attemptDelta: { COLD_FLOOR: -0.08 } }));
  check('A4.attempt-success-drop-fails-C4', at.valid && at.claims.attemptHarm && !at.claims.C4);
  const au = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-COLD_FLOOR-w${C.WORLD_START + 3}`).floor.counters.lowered = 1; } }));
  check('A5.floor-lowering-a-score-fails-C5', au.valid && !au.claims.C5 && au.claims.auditFailureCount === 1 && au.replication === 'AUDIT_FAILED' && /^AUDIT FAILED/.test(au.verdict));
  const aoff = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-COLD-w${C.WORLD_START + 3}`).audit.reachesEqualLegalPlusNonEdge = false; } }));
  check('A5.audit-failure-in-an-off-session-invalidates', !aoff.valid && /INVALID/.test(aoff.verdict));
  const lo = evaluateBlock(mkBlock({ effect: { ...EFFECT, REAL: 20 } }));
  check('A6.low-baseline-benefit-voids-the-real-claim-only', lo.valid && lo.instrument.I1_REAL !== 'OK' && !lo.claims.C2 && lo.claims.C1 && lo.claims.C3 && lo.replication === 'PARTIAL' && /not interpreted/.test(lo.verdict), lo.verdict);
  const sh = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 70 } }));
  check('A7.floor-short-of-the-ceiling-is-partial', sh.valid && sh.claims.C1 && !sh.claims.C3 && sh.replication === 'PARTIAL' && sh.classifications.ENTRY_NR_vs_COLD_FLOOR.class === 'FALLS_SHORT');
  // the sensitivity: the floor displaces B2's own non-edge resets, so every-reset accounting changes the class against ENTRY_NR
  const sd = evaluateBlock(mkBlock({ effect: EFFECT, effectAll: { COLD_FLOOR: -120, REAL_FLOOR: -120 } }));
  check('A8.sensitivity-disagreement-is-reported-and-restricts-the-sentence', sd.valid && sd.sensitivityAllResets.agrees === false && /legal reaches only/.test(sd.verdict) && o.sensitivityAllResets.agrees === true, JSON.stringify(sd.sensitivityAllResets));
  const miss = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.delete(`gfb2-REAL-w${C.WORLD_START + 5}`); } }));
  const wt = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-REAL-w${C.WORLD_START + 2}`).tree.mainSha256 = 'x'; } }));
  const wm = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-COLD-w${C.WORLD_START + 2}`).floorMode = 'on'; } }));
  const bare = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-COLD-w${C.WORLD_START + 2}`).bare = true; } }));
  const ws = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ controls }) => { controls[C.WORLD_START + 2].arms.ENTRY_NR.storeHash = 'other'; } }));
  const tf = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-COLD-w${C.WORLD_START + 1}`).finalHop.failures += 3; } }));
  const ex = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ plan }) => { plan.exclusions = plan.worlds.slice(0, 8).map(w => ({ world: w.world, reason: 'x' })); } }));
  check('A9.invalid-blocks-are-refused', [miss, wt, wm, bare, ws, tf, ex].every(x => !x.valid) && /no record/.test(miss.problems.join()) && /pinned derived pristine tree/.test(wt.problems.join()) && /floor mode/.test(wm.problems.join())
    && /uninstrumented/.test(bare.problems.join()) && /delivered episodes differ/.test(ws.problems.join()) && /recomputed from its events/.test(tf.problems.join()));
  check('A10.digests-are-bound', o.designDigest === C.designDigest() && o.decisionDigest === C.decisionDigest() && C.designDigest() !== C.decisionDigest());
  // the declared separations: primary (legal) and sensitivity (every reset) are computed separately; non-graph resets by arm AND goal group
  const sepB = evaluateBlock(mkBlock({ effect: EFFECT, effectAll: { COLD_FLOOR: -30, REAL_FLOOR: -30 } }));
  check('A12.primary-and-sensitivity-are-computed-separately', sepB.valid && sepB.benefit.COLD_FLOOR.mean > sepB.benefitAll.COLD_FLOOR.mean + 20 && sepB.instrument.on === 'legal reaches' && sepB.outcome.primary === 'legalReaches' && sepB.outcome.sensitivity === 'goalReaches'
    && sepB.byGoal[8].benefitAll && sepB.byGoal[8].benefit.COLD_FLOOR);
  const ne = o.nonEdgeReaches;
  const goalMean = (g, arm, k) => { const ws = o.worlds.filter(w => o.perWorld[w].goal === g); return ws.reduce((s, w) => s + o.perWorld[w].arms[arm][k], 0) / ws.length; };
  check('A12.non-graph-resets-are-reported-by-arm-and-by-goal-group', ne.byGoal && C.GOALS.every(g => ne.byGoal[g].n === 10 && C.ARM_ORDER.every(a => Math.abs(ne.byGoal[g].byArm[a].mean - goalMean(g, a, 'nonEdge')) < 1e-9
    && Math.abs(ne.byGoal[g].byArm[a].shareOfResets - goalMean(g, a, 'nonEdge') / goalMean(g, a, 'all')) < 1e-9)) && ne.byGoal[8].vsCOLD.COLD_FLOOR.ci && Math.abs(ne.byArm.COLD.mean - o.armMeans.COLD.nonEdge) < 1e-12);
  check('A13.goal-edge-penalty-is-read-per-arm', Math.abs(o.goalEdgeState.byArm.COLD.meanSummedPenalty - 1.5) < 1e-9 && Math.abs(o.goalEdgeState.byArm.COLD_FLOOR.meanSummedPenalty - 3.5) < 1e-9
    && Math.abs(o.goalEdgeState.penaltyVsCOLD.COLD_FLOOR.mean - 2) < 1e-9 && o.goalEdgeState.penaltyVsCOLD.COLD_FLOOR.n === 40);
  check('A11.degenerate-final-hop-has-zero-ratio-and-no-direction', o.finalHop.comparisons.every(c => c.difference === 0 && c.direction === 'NOT_DISTINGUISHABLE'));
}

// ============ P: power, freshness, seam ============
{
  const calFile = path.join(HERE, 'results', 'calibration_summary.json');
  if (fs.existsSync(calFile)) {
    const cal = JSON.parse(fs.readFileSync(calFile, 'utf8'));
    const sdMax = Math.max(...Object.values(cal.pairedSd));
    const need = Math.ceil((2.8 * sdMax / C.MARGIN.delta) ** 2);
    check('P1.n-covers-the-largest-calibration-paired-sd', need <= C.WORLDS_N, `need ${need} at SD ${sdMax.toFixed(1)}`);
    check('P1.calibration-ran-only-floor-off-arms-on-xfer1-worlds', cal.status === 'CALIBRATION_NOT_CONFIRMATORY' && Object.keys(cal.arms).sort().join() === 'COLD,ENTRY_NR,REAL' && cal.worlds === 40);
  } else check('P1.calibration-summary-present', false, 'results/calibration_summary.json missing');
  const seeds = [];
  for (let w = C.BLOCKS.G.lo; w <= C.BLOCKS.G.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('P2.seeds-fresh-disjoint-from-earlier-studies-and-inside-the-domain', new Set(seeds).size === seeds.length && seeds.every(s => s > C.testSeed(391) && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi
    && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength) && C.seedOk(s).ok));
  const gfCache = fs.readdirSync(path.join(ROOT, 'experiments', 'gate-floor1', 'data')).find(f => f.startsWith(`stream_${C.CONFIG_START}_392_`));
  const prefix = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'gate-floor1', 'data', gfCache), 'utf8'));
  check('P3.gate-floor1-prefix-is-the-392-element-stream', prefix.length === 392);
  const ext = continueStream(prefix.slice(0, 5), 8);
  check('P3.continuing-the-recurrence-reproduces-known-elements', JSON.stringify(ext.slice(5)) === JSON.stringify(prefix.slice(5, 8)));
  const cache = fs.readdirSync(path.join(HERE, 'data')).find(f => f.startsWith(`stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_`));
  if (cache) {
    const S = JSON.parse(fs.readFileSync(path.join(HERE, 'data', cache), 'utf8'));
    const blk = S.slice(C.WORLD_START);
    check('P3.extended-stream-keeps-the-prefix-and-has-552-elements', S.length === 552 && JSON.stringify(S.slice(0, 392)) === JSON.stringify(prefix));
    check('P3.goals-balanced-forty-each', C.GOALS.every(gl => blk.filter(e => e.goal === gl).length === 40) && blk.length === 160);
    check('P3.accepted-seeds-ascending-below-heldout-and-not-registered', blk.every((e, i) => e.acceptedSeed < C.HELDOUT_FLOOR && (i === 0 || e.acceptedSeed > blk[i - 1].acceptedSeed) && !typedConfig.isHeldOut(typedConfigSeed(e.acceptedSeed)) && !typedConfig.isConsumed(typedConfigSeed(e.acceptedSeed))));
  } else check('P3.stream-cache-present', false, 'run orchestrate.mjs --plan-only once to extend and cache the stream');
}

// ============ E: recorded results (consistency; skipped until results exist) ============
{
  const f = path.join(HERE, 'results', 'summary_blockG.json');
  if (!fs.existsSync(f)) console.log('E: no recorded results in this tree (freeze state); section skipped');
  else {
    const R = path.join(HERE, 'results');
    const rd = (n) => JSON.parse(fs.readFileSync(path.join(R, n), 'utf8'));
    const S = rd('summary_blockG.json'), MF = rd('manifest_blockG.json');
    const near = (a, b) => Math.abs(a - b) < 1e-9, sameCi = (a, b) => near(a.lower, b.lower) && near(a.upper, b.upper);
    const W = S.worlds, val = (a, k, w) => S.perWorld[w].arms[a][k];
    const diffs = (t, r, k = 'legal', ws = W) => ws.map(w => val(t, k, w) - val(r, k, w));
    const { digest, ...rest } = MF;
    check('E1.manifest-recomputes-and-binds-the-design-and-the-trees', C.hashObject(rest) === digest && S.manifestDigest === digest && MF.designDigest === C.designDigest() && S.designDigest === C.designDigest()
      && MF.decisionDigest === C.decisionDigest() && MF.tree.derivedMainSha256 === C.TREE.derivedMainSha256 && MF.tree.pristineMainSha256 === C.TREE.pristineMainSha256);
    check('E1.summary-valid-160-worlds', S.valid === true && W.length === 160 && S.problems.length === 0 && Object.keys(MF.sessions).length === 160 * 6 && JSON.stringify(W) === JSON.stringify(Array.from({ length: 160 }, (_, i) => 392 + i)) && S.excludedFraction <= C.RULES.maxExcludedFraction);
    const bOk = C.ARM_ORDER.filter(a => a !== 'COLD').every(a => { const b = pairedSummary(diffs(a, 'COLD'), X1.BOOTSTRAP), c = pairedSummary(diffs(a, 'COLD', 'all'), X1.BOOTSTRAP); return near(b.mean, S.benefit[a].mean) && sameCi(b.ci, S.benefit[a].ci) && near(c.mean, S.benefitAll[a].mean) && sameCi(c.ci, S.benefitAll[a].ci); });
    check('E2.benefits-legal-and-all-recompute-from-the-per-world-data', bOk);
    const sf = (ref, x, k = 'legal') => pairedSummary(diffs(ref, x, k), X1.BOOTSTRAP);
    const sR = sf('REAL', 'COLD_FLOOR'), sE = sf('ENTRY_NR', 'COLD_FLOOR');
    check('E2.shortfall-classes-recompute', C.classifyShortfall(sR.ci) === S.classifications.REAL_vs_COLD_FLOOR.class && C.classifyShortfall(sE.ci) === S.classifications.ENTRY_NR_vs_COLD_FLOOR.class
      && C.classifyShortfall(sf('REAL', 'COLD_FLOOR', 'all').ci) === S.classificationsAll.REAL_vs_COLD_FLOOR.class && C.classifyShortfall(sf('ENTRY_NR', 'COLD_FLOOR', 'all').ci) === S.classificationsAll.ENTRY_NR_vs_COLD_FLOOR.class);
    const okc = (c) => c === 'NON_INFERIOR' || c === 'EXCEEDS';
    const bF = pairedSummary(diffs('COLD_FLOOR', 'COLD'), X1.BOOTSTRAP), bR = pairedSummary(diffs('REAL', 'COLD'), X1.BOOTSTRAP), bE = pairedSummary(diffs('ENTRY_NR', 'COLD'), X1.BOOTSTRAP);
    const c1 = bF.ci.lower >= 50, i1 = bR.ci.lower >= 50, i2 = bE.ci.lower >= 50, c2 = i1 && okc(C.classifyShortfall(sR.ci)), c3 = i2 && okc(C.classifyShortfall(sE.ci));
    const harmG = C.GOALS.filter(gg => pairedSummary(diffs('COLD_FLOOR', 'COLD', 'legal', W.filter(w => S.perWorld[w].goal === gg)), X1.BOOTSTRAP).ci.upper < 0);
    const att = pairedSummary(diffs('COLD_FLOOR', 'COLD', 'attemptSuccess'), X1.BOOTSTRAP);
    const c4 = harmG.length === 0 && !(att.ci.lower < -C.MARGIN.maxAttemptDrop);
    const c5 = W.every(w => ['COLD_FLOOR', 'REAL_FLOOR'].every(a => { const fl = S.perWorld[w].arms[a].floor; return fl && fl.lowered === 0 && fl.maxRaise <= 100 + 1e-9; }));
    check('E3.claims-recompute-by-the-declared-rules', S.claims.C1 === c1 && S.claims.C2 === c2 && S.claims.C3 === c3 && S.claims.C4 === c4 && S.claims.C5 === c5 && S.claims.auditFailureCount === 0, JSON.stringify({ c1, c2, c3, c4, c5 }));
    check('E3.replication-label-follows-the-rule', S.replication === C.replication({ c1, c2, c3, c4, c5, i1: i1 ? 'OK' : 'x', i2: i2 ? 'OK' : 'x' }));
    check('E4.final-hop-is-degenerate-as-documented', C.ARM_ORDER.every(a => S.finalHop.drawsIntoGoal[a] === 0 && S.finalHop.byArm.all[a].failures === 0));
    check('E5.exploratory-files-are-labelled', !fs.existsSync(path.join(R, 'exploratory_edgemix_blockG.json')) || rd('exploratory_edgemix_blockG.json').status === 'EXPLORATORY_POST_HOC');
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
    const src = fs.readFileSync(SESS, 'utf8').replace("if (mainSha !== (isDerived ? TREE.derivedMainSha256 : TREE.pristineMainSha256)) refuse(", "if (false) refuse(");
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
    const dir = copyTree('m3', t => t.replace('goalGradientBoost *= (0.10 + 0.90 * tc);', 'goalGradientBoost *= (0.10 + 0.90 * tc); if (globalThis.__GATEFLOORB2__ && globalThis.__GATEFLOORB2__.on) goalGradientBoost = 100 * Math.max(tc, 1);'));
    const r = runMutant(dir, 'on');
    const wm = r ? r.artifacts.writes.filter(w => typeof w === 'string') : [], wo = ref.off.artifacts.writes.filter(w => typeof w === 'string');
    let d = -1; for (let i = 0; i < Math.min(wm.length, wo.length); i++) if (wm[i] !== wo[i]) { d = i; break; }
    const g0 = WORLDS[1].goal;
    const looksLikeAGoalEntry = d >= 0 && Number(wm[d].split('->')[1]) === g0 && Number(wo[d].split('->')[1]) !== g0;
    mutant('M3.floor-leaking-into-the-non-goal-branch-fails-the-first-divergence-test', r && !looksLikeAGoalEntry, 'the first divergence still looked like a legal goal entry');
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
    ['M7.floor-lowering-ignored', [["if (c.lowered !== 0) p.push(`floor lowered a score ${c.lowered} time(s)`);", '']], () => mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gfb2-COLD_FLOOR-w${C.WORLD_START + 3}`).floor.counters.lowered = 1; } })],
    ['M8.low-baseline-ignored-for-the-real-claim', [["const c2 = i1 === 'OK' && okClass", 'const c2 = okClass']], () => mkBlock({ effect: { ...EFFECT, REAL: 20 } })],
    ['M9.attempt-drop-ignored', [['const c4 = harmGroups.length === 0 && !attemptHarm, c5', 'const c4 = harmGroups.length === 0, c5']], () => mkBlock({ effect: EFFECT, attemptDelta: { COLD_FLOOR: -0.08 } })],
    ['M10.sensitivity-always-agrees', [['const sensitivityAgrees = (bAllLower', 'const sensitivityAgrees = true || (bAllLower']], () => mkBlock({ effect: EFFECT, effectAll: { COLD_FLOOR: -120, REAL_FLOOR: -120 } })],
  ];
  const truth = (o) => (o.valid ? JSON.stringify([o.claims.C1, o.claims.C2, o.claims.C3, o.claims.C4, o.claims.C5, o.sensitivityAllResets.agrees, o.replication]) : 'INVALID');
  for (const [id, edits, fx] of am) {
    const mod = await loadMutated('analyze.mjs', edits, id.split('.')[0]);
    const b = fx();
    const real = truth(evaluateBlock(clone2(b))), mut = truth(mod.evaluateBlock(clone2(b)));
    mutant(id, real !== mut, `claims identical under the mutant: ${real}`);
  }
}

console.log(`\nGATE-FLOOR-B2 gate: ${passed} checks passed, ${failed} failed; mutants ${caught} caught, ${missed} missed`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
fs.rmSync(SCRATCH, { recursive: true, force: true });

// ==========================================================
// GATE-FLOOR-1 — verification gate (design and instrument integrity; prints NO study endpoint)
// ==========================================================
//   node experiments/gate-floor1/verify_gatefloor1.mjs
// Sections
//   S  static     : declarations; the floor value's provenance in the runtime's own source; production and the pinned
//                   H1-R transform untouched; source hygiene
//   T  transform  : the derived tree differs from the conformed tree by exactly the one guarded line; the transform
//                   refuses unexpected shapes
//   U  unit       : the floor runtime's scope (only a legal edge into the active goal; never lowers; counters exact)
//   E  equivalence: whole runtime, off == pristine (global absent, armed-but-off, with and without a delivered store),
//                   determinism, and that ON does change behaviour
//   L  legality   : the no-shortcut audit on a floor-ON session, and the first-divergence scope test
//   A  analysis   : claims, statuses and sentences on exact fixtures
//   P  power      : sample size from XFER-2 variability; fresh worlds and seeds; stream seam
//   M  mutants    : deliberately broken floor runtime / transform / analysis must be caught (anti-vacuity)
// Sessions run on XFER-1 world 1 (outside every GATE-FLOOR-1 world).  No goal-reach figure is printed or compared with a
// threshold except OFF-vs-reference equality.
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
import { prng } from '../xfer1/stats.mjs';
import { makeGraph, entryStore } from '../xfer2/controls.mjs';
import { DEVELOPMENT_DOMAIN, DEV_BLOCK, BLOCK } from '../mcf1/config.mjs';
import * as C from './config.mjs';
import { createFloor } from './floor_runtime.mjs';
import { transformMain, buildFloorTree, ANCHOR, INSERTED } from './transform.mjs';
import { evaluateBlock, auditProblems, finalHopProblems } from './analyze.mjs';
import { continueStream } from './stream.mjs';
import { finalHopFromAttempts, summarizeEvents, poolArm, pairedRetryComparison, intervalDirection } from './finalhop.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
let passed = 0, failed = 0, caught = 0, missed = 0;
const fails = [];
const check = (id, cond, detail = '') => { if (cond) passed++; else { failed++; fails.push(`${id} ${detail}`); } console.log(`${cond ? 'PASS' : 'FAIL'} ${id}${cond || !detail ? '' : ' :: ' + detail}`); };
const mutant = (id, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'CAUGHT' : 'MISSED'} ${id}${ok || !detail ? '' : ' :: ' + detail}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const clone = (o) => JSON.parse(JSON.stringify(o));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), 'gf1-verify-'));

const conformed = buildTree();
const floorTree = buildFloorTree();
const mainConformed = fs.readFileSync(path.join(conformed.dir, 'main.js'), 'utf8');
const mainFloor = fs.readFileSync(path.join(floorTree.dir, 'main.js'), 'utf8');
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];

// ============ S: static ============
{
  check('S1.arms-and-contrasts-declared', C.CONTRASTS.every(([n, t, r]) => C.ARMS[t] && C.ARMS[r]));
  check('S1.four-primary-arms-and-one-secondary', JSON.stringify(C.PRIMARY_ARMS) === JSON.stringify(['COLD', 'COLD_FLOOR', 'REAL', 'ENTRY_NR']) && C.ARM_ORDER.length === 5);
  check('S1.floor-flag-only-on-the-two-floor-arms', JSON.stringify(C.ARM_ORDER.filter(a => C.ARMS[a].floor)) === JSON.stringify(['COLD_FLOOR', 'REAL_FLOOR']));
  check('S1.five-claims-and-five-predictions', C.CLAIMS.length === 5 && C.PREDICTIONS.length === 5 && C.PREDICTIONS.every(p => C.CLAIMS.some(c => c.id === p.claim)));
  check('S1.block-is-after-xfer1-and-xfer2', C.WORLD_START === 232 && C.BLOCKS.F.lo === 232 && C.BLOCKS.F.hi === 391 && C.blockOf(231) === null && C.blockOf(232) === 'F' && C.blockOf(391) === 'F' && C.blockOf(392) === null);
  check('S1.margins-are-the-xfer2-margins', C.MARGIN.delta === 25 && C.MARGIN.minBenefit === 50 && C.MARGIN.maxAttemptDrop === 0.05);
  // the floor value's provenance, read from the runtime's own source (not asserted by fiat)
  check('S2.floor-base-value-is-the-blocks-own-goal-assignment',
    /if \(Number\(k\) === Number\(goalNeuronId\)\) \{[\s\S]{0,700}goalGradientBoost = 100;/.test(mainConformed) && C.FLOOR_BASE_VALUE === 100 && C.TC_FLOOR === 1);
  check('S2.tc-is-count-over-five-capped-at-one', /return Math\.min\(count \/ 5, 1\.0\);/.test(mainConformed) && C.ENTRY_COUNT === 5);
  check('S2.fix3-is-the-only-writer-of-the-goal-entering-boost', (mainConformed.match(/goalGradientBoost = 100 \* tc;/g) || []).length === 1 && /FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS/.test(mainConformed));
  check('S2.nongraph-shortcuts-are-masked-by-n1-in-the-conformed-tree', /H1R N1-MASK: graph-neighbour candidates only/.test(mainConformed));
  // production and the pinned transform untouched
  // tracked files only: pre-existing untracked evidence directories are not modifications of this study
  const st = spawnSync('git', ['-C', ROOT, 'status', '--porcelain', '--untracked-files=no', '--', 'main.js', 'render', 'instrumentation', 'experiments/h1r', 'experiments/xfer1', 'experiments/xfer2', 'experiments/m7', 'experiments/mcf1', 'experiments/registry'], { encoding: 'utf8' });
  check('S3.no-production-or-prior-experiment-file-modified', st.status === 0 && st.stdout.trim() === '', st.stdout.trim().slice(0, 200));
  check('S3.h1r-transform-identity-unchanged', conformed.manifest.transformSha256.startsWith('02ccbf382ad7'));
  check('S3.pinned-main-hashes-match-the-trees', sha(mainConformed) === C.TREE.parentMainSha256 && sha(mainFloor) === C.TREE.floorMainSha256);
  const bad = [];
  for (const f of fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'verify_gatefloor1.mjs')) {
    const t = fs.readFileSync(path.join(HERE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/Math\.random|performance\.now/.test(t)) bad.push(`${f}: ambient randomness or clock`);
    if (/Date\.now|new Date\(/.test(t) && f !== 'stream.mjs') bad.push(`${f}: wall clock`);
    if (/H1R_STAGE_AUTHORISED\s*=/.test(t)) bad.push(`${f}: sets a stage authorisation`);
    if (/[A-Za-z]:[\\/]+Users|\/Users\/|\/home\//.test(t)) bad.push(`${f}: local absolute path`);
  }
  check('S4.source-hygiene', bad.length === 0, bad.join('; '));
  check('S4.floor-runtime-draws-no-random-number', !/rng|random|liveRng|cognitive/i.test(fs.readFileSync(path.join(HERE, 'floor_runtime.mjs'), 'utf8').replace(/^\s*\/\/.*$/gm, '')));
}

// ============ T: transform ============
{
  const a = mainConformed.split('\n'), b = mainFloor.split('\n');
  check('T1.exactly-one-line-added', b.length === a.length + 1);
  const i = b.indexOf(INSERTED);
  check('T1.the-added-line-is-the-declared-line-right-after-the-anchor', i > 0 && b[i - 1] === ANCHOR && b.filter(l => l === INSERTED).length === 1);
  check('T1.removing-the-line-restores-the-conformed-main-byte-for-byte', b.filter((_, k) => k !== i).join('\n') === mainConformed);
  check('T2.every-other-file-is-byte-identical', Object.entries(conformed.manifest.files).every(([p, h]) => p === 'main.js' || floorTree.manifest.files[p] === h) && Object.keys(floorTree.manifest.files).length === Object.keys(conformed.manifest.files).length);
  check('T2.guard-reads-an-undefined-global-first', /^\s*if \(globalThis\.__GATEFLOOR1__ && globalThis\.__GATEFLOOR1__\.on\)/.test(INSERTED));
  check('T2.tag-appears-on-one-line-and-only-in-main', mainFloor.split('\n').filter(l => l.includes('GATEFLOOR1')).length === 1 &&!Object.keys(floorTree.manifest.files).some(p => p !== 'main.js' && fs.readFileSync(path.join(floorTree.dir, p), 'utf8').includes('__GATEFLOOR1__')));
  const refuses = (text) => { try { transformMain(text); return false; } catch { return true; } };
  check('T3.refuses-a-missing-anchor', refuses(mainConformed.replace(ANCHOR, '          goalGradientBoost = 99 * tc;')));
  check('T3.refuses-a-duplicated-anchor', refuses(mainConformed.replace(ANCHOR, ANCHOR + '\n' + ANCHOR)));
  check('T3.refuses-an-already-tagged-source', refuses(mainFloor));
  check('T3.refuses-a-source-without-the-fix3-header', refuses(mainConformed.replace('FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS', 'FIX 3: renamed')));
  check('T3.refuses-an-altered-context', refuses(mainConformed.replace('          const tc = trajectoryConfidence(currentKey, k);\n          goalGradientBoost = 100 * tc;', '          const tc = 1;\n          goalGradientBoost = 100 * tc;')));
}

// ============ U: floor runtime unit tests (a function so that mutants can be run through the same checks) ============
const GOAL = 12, FROM = 9, ISEDGE = (a, b) => g.directed.has(`${a}->${b}`);
const OTHER = (g.neighbors.get(FROM) || []).find(n => n !== GOAL);                 // a legal edge out of FROM that is not the goal
const NONNEIGHBOUR = [...g.neighbors.keys()].find(n => n !== GOAL && !ISEDGE(n, GOAL));   // a node with no edge into the goal
function unitProblems(mod) {
  const p = [];
  const mk = (cfg) => mod.createFloor({ isEdge: ISEDGE, tcFloor: 1, ...cfg });
  { // legal goal entry, any tc, floor 1 -> 100
    const F = mk({});
    for (const tc of [0, 0.2, 0.4, 0.6, 0.8, 1]) if (F.entry(FROM, GOAL, GOAL, tc, true) !== 100) p.push(`legal entry at tc ${tc} is not 100`);
  }
  { // not applicable -> the original expression, unchanged
    const F = mk({});
    if (F.entry(FROM, GOAL, GOAL, 0.2, false) !== 20) p.push('applied outside the structure map');
    if (F.entry(NONNEIGHBOUR, GOAL, GOAL, 0.2, true) !== 20) p.push('applied to a non-edge');
    if (F.entry(FROM, OTHER, GOAL, 0.2, true) !== 20) p.push('applied to a non-goal candidate that is a legal edge');
    if (F.entry(GOAL, GOAL, GOAL, 0.2, true) !== 20) p.push('applied to a self move');
  }
  { // never lowers; tcFloor 0 is the identity; partial floor is a floor not a setter
    const F = mk({ tcFloor: 0.5 }), Z = mk({ tcFloor: 0 });
    for (let k = 0; k <= 10; k++) {
      const tc = k / 10;
      if (F.entry(FROM, GOAL, GOAL, tc, true) < 100 * tc) p.push(`lowered at tc ${tc}`);
      if (Math.abs(F.entry(FROM, GOAL, GOAL, tc, true) - 100 * Math.max(tc, 0.5)) > 1e-9) p.push(`not max(tc, floor) at tc ${tc}`);
      if (Z.entry(FROM, GOAL, GOAL, tc, true) !== 100 * tc) p.push(`tcFloor 0 is not the identity at tc ${tc}`);
    }
  }
  { // counters
    const F = mk({});
    F.entry(FROM, GOAL, GOAL, 0, true); F.entry(FROM, GOAL, GOAL, 1, true); F.entry(FROM, 7, GOAL, 0, true); F.entry(FROM, GOAL, GOAL, 0.4, false);
    const c = F.snapshot().counters;
    if (c.evaluated !== 4 || c.legal !== 2 || c.notLegal !== 2 || c.raised !== 1 || c.lowered !== 0) p.push(`counters ${JSON.stringify(c)}`);
    const e = F.snapshot().byEdge[`${FROM}->${GOAL}`];
    if (!e || e.evaluated !== 2 || e.raised !== 1) p.push('per-edge table');
  }
  { // construction refuses
    let r1 = false, r2 = false, r3 = false;
    try { mod.createFloor({ tcFloor: 1 }); } catch { r1 = true; }
    try { mod.createFloor({ isEdge: ISEDGE, tcFloor: 1.5 }); } catch { r2 = true; }
    try { mod.createFloor({ isEdge: ISEDGE, tcFloor: -0.1 }); } catch { r3 = true; }
    if (!(r1 && r2 && r3)) p.push('construction accepted an invalid configuration');
  }
  return p;
}
{
  const p = unitProblems({ createFloor });
  check('U1.floor-runtime-scope-counters-and-construction', p.length === 0, p.join('; '));
  check('U2.the-fixture-edges-exist-in-the-graph', ISEDGE(FROM, GOAL) && !ISEDGE(GOAL, GOAL) && OTHER !== undefined && ISEDGE(FROM, OTHER) && NONNEIGHBOUR !== undefined && !ISEDGE(NONNEIGHBOUR, GOAL));
}

// ============ E: whole-runtime equivalence, determinism (sessions on XFER-1 world 1) ============
const W1 = generateAcceptedStream(X1.CONFIG_START, 2)[1];
const base = { world: 1, configSeed: W1.acceptedSeed, configIndex: W1.acceptedConfigIndex, agentSeed: X1.testSeed(1), ticks: 1500 };
function session(script, input) {
  const r = spawnSync(process.execPath, [script, JSON.stringify(input)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const m = r.stdout.match(/@@RESULT@@(.*)@@END@@/s);
  return m ? JSON.parse(m[1]) : null;
}
const S1 = path.join(ROOT, 'experiments', 'xfer1', 'session.mjs'), SG = path.join(HERE, 'session.mjs');
const entryFile = path.join(SCRATCH, 'entry_w1.json');
fs.writeFileSync(entryFile, JSON.stringify({ episodes: entryStore(g, labelOf, W1.goal) }));
const view = (r) => ({ fingerprint: r.artifacts.fingerprint, endpoints: r.endpoints, goalCalls: r.reaches.goalCalls, endHash: r.brain.endHash, cogDraws: r.artifacts.cogDraws, visDraws: r.artifacts.visDraws,
  env: r.artifacts.envCounters, startHash: r.brain.start && r.brain.start.brainHash });
const same = (a, b) => JSON.stringify(view(a)) === JSON.stringify(view(b));
let ON = null;
{
  const ref = session(S1, { role: 'test', label: 'ref', tree: conformed.dir, arm: 'COLD', ...base });
  const off = session(SG, { role: 'test', label: 'off', tree: floorTree.dir, arm: 'COLD', floor: 'off', ...base });
  const armed = session(SG, { role: 'test', label: 'armed', tree: floorTree.dir, arm: 'COLD', floor: 'armedOff', ...base });
  const offConformed = session(SG, { role: 'test', label: 'offc', tree: conformed.dir, arm: 'COLD', floor: 'off', ...base });
  ON = session(SG, { role: 'test', label: 'on', tree: floorTree.dir, arm: 'COLD', floor: 'on', ...base });
  const on2 = session(SG, { role: 'test', label: 'on2', tree: floorTree.dir, arm: 'COLD', floor: 'on', ...base });
  check('E0.sessions-completed', [ref, off, armed, offConformed, ON, on2].every(r => r && !r.outcome.crashed && r.outcome.completed));
  check('E1.off-on-the-floor-tree-equals-the-xfer1-session-on-the-conformed-tree', same(ref, off));
  check('E1.off-driver-on-the-conformed-tree-equals-the-xfer1-driver', same(ref, offConformed));
  check('E2.armed-but-off-equals-off', same(off, armed) && armed.floor.counters.raised === 0 && armed.floor.on === false);
  check('E3.on-changes-behaviour-and-raises-scores', !same(off, ON) && ON.floor.on === true && ON.floor.counters.raised > 0);
  check('E4.on-is-deterministic', same(ON, on2) && JSON.stringify(ON.floor) === JSON.stringify(on2.floor));
  check('E5.off-record-carries-no-floor', off.floor === null && off.floorMode === 'off' && ON.floorMode === 'on');
  const refE = session(S1, { role: 'test', label: 'refE', tree: conformed.dir, arm: 'ONLY_episodes', brainPath: entryFile, brainWorld: 1, ...base });
  const offE = session(SG, { role: 'test', label: 'offE', tree: floorTree.dir, arm: 'ONLY_episodes', brainPath: entryFile, brainWorld: 1, floor: 'off', ...base });
  const onE = session(SG, { role: 'test', label: 'onE', tree: floorTree.dir, arm: 'ONLY_episodes', brainPath: entryFile, brainWorld: 1, floor: 'on', ...base });
  check('E6.off-with-a-delivered-store-equals-the-xfer1-session', refE && offE && same(refE, offE));
  check('E7.floor-on-top-of-a-store-that-already-saturates-tc-raises-nothing-on-its-edges', onE && onE.floor.counters.evaluated > 0 && Object.values(onE.floor.byEdge).every(e => e.raised === 0 || e.raised <= e.evaluated));
}

// ============ L: legality / scope (audit on the ON session; probe first-divergence) ============
{
  const a = ON.audit;
  check('L1.no-draw-outside-the-graph-and-no-illegal-move', a.nonEdgeAttempts === 0 && a.blockedIllegal === 0 && a.goalFlagMismatch === 0);
  check('L1.every-goal-reach-follows-a-successful-goal-entering-draw', a.goalReachesEqualEnteringSuccesses && a.goalEnteringAttempts >= a.goalEnteringSuccesses);
  check('L1.the-audit-is-clean-by-the-declared-rule', auditProblems(ON).length === 0, auditProblems(ON).join('; '));
  const c = ON.floor.counters;
  check('L2.the-floor-only-ever-saw-legal-goal-entering-candidates', c.notLegal === 0 && c.lowered === 0 && c.legal === c.evaluated && Object.keys(ON.floor.byEdge).every(k => Number(k.split('->')[1]) === W1.goal && ISEDGE(...k.split('->').map(Number))));
  check('L2.raised-by-at-most-100-and-on-the-goal-entering-edges-only', c.maxRaise <= 100 + 1e-9 && c.raised > 0);
  // whole-runtime probe: first candidate record that differs between OFF and ON is the goal-entering candidate, raised
  const probe = (tree, floor, ticks = 300, extra = {}) => {
    const r = spawnSync(process.execPath, [path.join(HERE, 'probe.mjs'), JSON.stringify({ tree, configSeed: W1.acceptedSeed, configIndex: W1.acceptedConfigIndex, agentSeed: X1.testSeed(1), ticks, brainPath: null, floor, ...extra })], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const m = r.stdout.match(/@@PROBE@@(.*)@@END@@/s);
    return m ? JSON.parse(m[1]) : null;
  };
  const P0 = probe(floorTree.dir, null), P1 = probe(floorTree.dir, { on: true, tcFloor: 1 }), PZ = probe(floorTree.dir, { on: true, tcFloor: 0 }), PA = probe(floorTree.dir, { on: false, tcFloor: 1 });
  check('L3.probes-ran', [P0, P1, PZ, PA].every(x => x && !x.crashed));
  const firstDiff = (A, B) => { const n = Math.min(A.candidates.length, B.candidates.length); for (let i = 0; i < n; i++) if (JSON.stringify(A.candidates[i]) !== JSON.stringify(B.candidates[i])) return i; return A.candidates.length === B.candidates.length ? -1 : n; };
  const d = firstDiff(P0, P1);
  check('L3.on-diverges-from-off', d >= 0);
  if (d >= 0) {
    const o = P0.candidates[d], n = P1.candidates[d];
    check('L3.first-divergence-is-the-goal-entering-candidate-of-the-same-decision-step', o[0] === n[0] && o[1] === n[1] && o[2] === n[2] && Number(n[2]) === P0.goal, `${JSON.stringify(o)} vs ${JSON.stringify(n)}`);
    check('L3.first-divergence-raises-the-score', n[3] > o[3] && n[4] > o[4], `${JSON.stringify(o)} vs ${JSON.stringify(n)}`);
  }
  check('L4.tcfloor-zero-is-indistinguishable-from-off', firstDiff(P0, PZ) === -1 && JSON.stringify(P0.writes) === JSON.stringify(PZ.writes) && JSON.stringify(P0.fingerprint) === JSON.stringify(PZ.fingerprint) && PZ.floor.counters.raised === 0);
  check('L4.armed-but-off-is-indistinguishable-from-off', firstDiff(P0, PA) === -1 && JSON.stringify(P0.writes) === JSON.stringify(PA.writes) && JSON.stringify(P0.fingerprint) === JSON.stringify(PA.fingerprint) && PA.floor.counters.evaluated === 0);
  globalThis.__PROBE__ = { probe, P0, P1, firstDiff };
}

// ============ A: analysis fixtures (exact) ============
// final-hop events of a fixture session: `fail` failed attempts (spread before the successes), then `succ` successful traversals
const mkEvents = (succ, fail) => {
  const ev = []; let call = 0;
  if (succ === 0) { for (let k = 0; k < fail; k++) ev.push([call++, 9, 0]); return ev; }
  const per = Math.floor(fail / succ), extra = fail - per * succ;
  for (let i = 0; i < succ; i++) { for (let k = 0; k < per + (i < extra ? 1 : 0); k++) ev.push([call++, 9, 0]); ev.push([call++, 9, 1]); }
  return ev;
};
const mkBlock = ({ effect = {}, perGoalEffect = {}, attemptDelta = {}, retryFactor = {}, zeroSuccess = new Set(), n = 40, sd = 15, seed = 7, tweak = null }) => {
  const r = prng(seed), noise = () => (r() + r() + r() - 1.5) * sd * 1.6;
  const records = new Map(), controls = {}, worldsPlan = [], valid = [];
  for (let w = 0; w < n; w++) {
    const goal = C.GOALS[w % 4];
    const world = C.WORLD_START + w;
    worldsPlan.push({ world, goal }); valid.push(world);
    const baseV = 100 + noise() * 2;
    controls[world] = { realEpisodes: 30, arms: {} };
    for (const arm of C.ARM_ORDER) {
      const a = C.ARMS[arm];
      const eff = (effect[arm] || 0) + ((perGoalEffect[arm] || {})[goal] || 0);
      let goalReaches = Math.max(0, Math.round(baseV + eff + noise()));
      if (zeroSuccess.has(`${arm}|${w}`)) goalReaches = 0;
      const failN = goalReaches === 0 ? 5 : Math.round(goalReaches * (retryFactor[arm] ?? 0.4));
      const events = mkEvents(goalReaches, failN);
      const hash = a.store === 'none' ? null : `h-${a.store}-${world}`;
      const nEp = a.store === 'none' ? 0 : (a.store === 'entry-nr' ? 15 : 30);
      controls[world].arms[arm] = { storeHash: hash, episodes: nEp };
      const raised = a.floor ? 40 : 0;
      records.set(`gf1-${arm}-w${world}`, {
        role: 'test', floorMode: a.floor ? 'on' : 'off',
        outcome: { crashed: false, completed: true }, h1r: { drawFaults: 0, blockedIllegal: 0 },
        tree: { floorTree: true, mainSha256: C.TREE.floorMainSha256 },
        input: { agentSeed: X1.testSeed(world), acceptedConfigSeed: 200000 + world, goal },
        endpoints: { goalReaches, attemptSuccess: 0.72 + (attemptDelta[arm] || 0), slipsPerCall: 0.1, earlyReaches: 10 },
        brain: hash === null ? { deliveredHash: 'none', deliveredHashes: null, start: { hashes: {}, sizes: { episodes: 0, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } }
          : { deliveredHash: 'x', deliveredHashes: { episodes: hash }, start: { hashes: { episodes: hash }, sizes: { episodes: nEp, transitions: 0, rewards: 0, penalties: 0, signals: 0, curiosity: 0, Q: 0, confidence: 0 } } },
        floor: a.floor ? { on: true, tcFloor: C.TC_FLOOR, counters: { evaluated: 100, legal: 100, notLegal: 0, raised, lowered: 0, maxRaise: 100 }, byEdge: { [`9->${goal}`]: { evaluated: 100, raised } } } : null,
        reaches: { goal: goalReaches, goalCalls: events.filter(e => e[2] === 1).map(e => e[0]) },
        finalHop: { ...summarizeEvents(events), events },
        audit: { attempts: 500, nonEdgeAttempts: 0, selfDraws: 0, goalEnteringAttempts: events.length, goalEnteringSuccesses: goalReaches, goalReaches, goalReachesEqualEnteringSuccesses: true, goalFlagMismatch: 0, blockedIllegal: 0 },
      });
    }
  }
  const plan = { block: 'F', worlds: worldsPlan, validWorlds: valid, exclusions: [] };
  if (tweak) tweak({ records, controls, plan });
  return { records, plan, controls };
};
const EFFECT = { COLD_FLOOR: 130, REAL: 88, ENTRY_NR: 130, REAL_FLOOR: 120 };
{
  const o = evaluateBlock(mkBlock({ effect: EFFECT }));
  check('A1.clean-block-valid-all-claims-hold', o.valid && o.claims.C1 && o.claims.C2 && o.claims.C3 && o.claims.C4 && o.claims.C5 && o.instrument.I1_REAL === 'OK' && o.instrument.I2_ENTRY_NR === 'OK', JSON.stringify(o.claims));
  check('A1.floor-above-real-is-classified-exceeds-and-ceiling-non-inferior', o.classifications.REAL_vs_COLD_FLOOR.class === 'EXCEEDS' && o.classifications.ENTRY_NR_vs_COLD_FLOOR.class === 'NON_INFERIOR');
  check('A1.predictions-all-held', o.predictions.every(p => p.pass));
  check('A1.sentence', /improves goal reaches over cold/.test(o.verdict) && /exceeds restoring the real episode store/.test(o.verdict) && /non-inferior to the goal-entry-episodes ceiling/.test(o.verdict), o.verdict);
  check('A1.sensitivity-reports-fragility-flags', o.sensitivityBonferroni3 && typeof o.sensitivityBonferroni3.fragile.C1 === 'boolean');
  const n = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 0 } }));
  check('A2.no-benefit-claim-fails-and-says-scoring-term-is-not-sufficient', n.valid && !n.claims.C1 && /does not improve goal reaches over cold/.test(n.verdict) && /NOT sufficient/.test(n.verdict) && !n.claims.C2 && !n.claims.C3, n.verdict);
  const s = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 30 } }));
  check('A3.small-positive-effect-is-not-called-an-improvement', s.valid && !s.claims.C1 && /not by the declared practical margin/.test(s.verdict), s.verdict);
  const h = evaluateBlock(mkBlock({ effect: EFFECT, perGoalEffect: { COLD_FLOOR: { 12: -200 } } }));
  check('A4.one-harmed-goal-group-fails-C4-even-with-a-large-mean-benefit', h.valid && h.claims.C1 && !h.claims.C4 && h.claims.harmGroups.length === 1 && h.claims.harmGroups[0] === 12 && /^HARM/.test(h.verdict), JSON.stringify(h.claims.harmGroups) + h.verdict);
  const bd = evaluateBlock(mkBlock({ effect: EFFECT, perGoalEffect: { COLD_FLOOR: { 8: -127 } } }));
  check('A4.a-group-whose-interval-straddles-zero-is-not-harm', bd.valid && bd.byGoal[8].benefit.COLD_FLOOR.ci.lower < 0 && bd.byGoal[8].benefit.COLD_FLOOR.ci.upper > 0 && bd.claims.C4, JSON.stringify(bd.byGoal[8].benefit.COLD_FLOOR.ci));
  const at = evaluateBlock(mkBlock({ effect: EFFECT, attemptDelta: { COLD_FLOOR: -0.08 } }));
  check('A5.attempt-success-drop-beyond-the-margin-fails-C4', at.valid && at.claims.attemptHarm && !at.claims.C4 && /^HARM/.test(at.verdict));
  const au = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-COLD_FLOOR-w${C.WORLD_START + 3}`).audit.nonEdgeAttempts = 1; } }));
  check('A6.audit-failure-in-a-floor-session-fails-C5-and-blocks-the-sentence', au.valid && !au.claims.C5 && au.claims.auditFailureCount === 1 && /^AUDIT FAILED/.test(au.verdict));
  const aoff = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-COLD-w${C.WORLD_START + 3}`).audit.nonEdgeAttempts = 2; } }));
  check('A6.audit-failure-in-an-off-session-invalidates-the-block', !aoff.valid && /INVALID/.test(aoff.verdict));
  const lo = evaluateBlock(mkBlock({ effect: { ...EFFECT, REAL: 20 } }));
  check('A7.low-baseline-benefit-voids-the-real-claim-only', lo.valid && lo.instrument.I1_REAL !== 'OK' && !lo.claims.C2 && lo.claims.C1 && lo.claims.C3 && /not interpreted/.test(lo.verdict), lo.verdict);
  const fs3 = evaluateBlock(mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 70 } }));
  check('A8.floor-short-of-the-entry-ceiling-names-the-declared-residual', fs3.valid && fs3.claims.C1 && !fs3.claims.C3 && fs3.classifications.ENTRY_NR_vs_COLD_FLOOR.class === 'FALLS_SHORT' && /trajectory integrity/.test(fs3.verdict), fs3.verdict);
  const miss = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.delete(`gf1-REAL-w${C.WORLD_START + 5}`); } }));
  check('A9.missing-record-invalidates', !miss.valid && /no record/.test(miss.problems.join(';')));
  const wrongTree = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-REAL-w${C.WORLD_START + 2}`).tree.mainSha256 = 'x'; } }));
  check('A9.wrong-tree-invalidates', !wrongTree.valid && /pinned floor tree/.test(wrongTree.problems.join(';')));
  const wrongMode = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-COLD-w${C.WORLD_START + 2}`).floorMode = 'on'; } }));
  check('A9.floor-mode-mismatch-invalidates', !wrongMode.valid && /floor mode/.test(wrongMode.problems.join(';')));
  const wrongStore = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ controls }) => { controls[C.WORLD_START + 2].arms.ENTRY_NR.storeHash = 'other'; } }));
  check('A9.store-that-does-not-hash-to-the-control-invalidates', !wrongStore.valid && /delivered episodes differ/.test(wrongStore.problems.join(';')));
  const excl = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ plan }) => { plan.exclusions = plan.worlds.slice(0, 8).map(w => ({ world: w.world, reason: 'x' })); } }));
  check('A9.excluded-fraction-above-ten-percent-invalidates', !excl.valid && excl.excludedFraction > C.RULES.maxExcludedFraction);
  check('A10.design-digest-is-bound', o.designDigest === C.designDigest() && /^[0-9a-f]{64}$/.test(o.designDigest));
}

// ============ P: power, freshness, stream seam ============
{
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'xfer2', 'results', 'summary_blockD.json'), 'utf8'));
  const arms = Object.keys(D.perWorld[D.worlds[0]].arms);
  const sdOf = (a, b) => { const d = D.worlds.map(w => D.perWorld[w].arms[a][0] - D.perWorld[w].arms[b][0]); const m = d.reduce((s, x) => s + x, 0) / d.length; return Math.sqrt(d.reduce((s, x) => s + (x - m) ** 2, 0) / (d.length - 1)); };
  const sds = [];
  for (const a of arms) for (const b of arms) if (a < b) sds.push(sdOf(a, b));
  const sdMax = Math.max(...sds);
  const need = Math.ceil((2.8 * sdMax / C.MARGIN.delta) ** 2);
  check('P1.block-is-powered-for-the-declared-margin-at-the-largest-prior-paired-sd', need <= C.WORLDS_N, `need ${need} at SD ${sdMax.toFixed(1)}, have ${C.WORLDS_N}`);
  check('P1.goal-groups-are-balanced-and-large-enough-for-a-harm-check', C.WORLDS_N % C.GOALS.length === 0 && C.WORLDS_N / C.GOALS.length >= 32);
  const seeds = [];
  for (let w = C.BLOCKS.F.lo; w <= C.BLOCKS.F.hi; w++) seeds.push(C.trainSeed(w), C.testSeed(w));
  check('P2.seeds-fresh-disjoint-from-xfer1-and-xfer2-and-inside-the-domain', new Set(seeds).size === seeds.length && seeds.every(s => s > C.trainSeed(231) + 1 && s >= DEVELOPMENT_DOMAIN.lo && s <= DEVELOPMENT_DOMAIN.hi && (s < DEV_BLOCK.start || s >= DEV_BLOCK.start + DEV_BLOCK.count) && (s < BLOCK.start || s >= BLOCK.start + BLOCK.scanLength) && C.seedOk(s).ok));
  const cache = fs.readdirSync(path.join(HERE, 'data')).find(f => f.startsWith(`stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_`));
  const cache2 = fs.readdirSync(path.join(ROOT, 'experiments', 'xfer2', 'data')).find(f => f.startsWith(`stream_${C.CONFIG_START}_232_`));
  const prefix = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'xfer2', 'data', cache2), 'utf8'));
  check('P3.xfer2-prefix-is-the-232-element-stream', prefix.length === 232 && prefix[0].startingSeed === C.CONFIG_START);
  const ext = continueStream(prefix.slice(0, 5), 8);
  check('P3.continuing-the-recurrence-reproduces-known-elements', JSON.stringify(ext.slice(5)) === JSON.stringify(prefix.slice(5, 8)));
  if (cache) {
    const S = JSON.parse(fs.readFileSync(path.join(HERE, 'data', cache), 'utf8'));
    check('P3.extended-stream-keeps-the-cached-prefix-and-has-392-elements', S.length === C.WORLDS_TOTAL && JSON.stringify(S.slice(0, 232)) === JSON.stringify(prefix));
    const blk = S.slice(C.WORLD_START);
    check('P3.goals-balanced-forty-each', C.GOALS.every(gl => blk.filter(e => e.goal === gl).length === C.WORLDS_N / 4));
    check('P3.accepted-seeds-ascending-below-heldout-and-not-registered', blk.every((e, i) => e.acceptedSeed < C.HELDOUT_FLOOR && (i === 0 || e.acceptedSeed > blk[i - 1].acceptedSeed) && !typedConfig.isHeldOut(typedConfigSeed(e.acceptedSeed)) && !typedConfig.isConsumed(typedConfigSeed(e.acceptedSeed))));
    check('P3.new-worlds-share-no-configuration-with-earlier-studies', new Set(S.map(e => e.acceptedSeed)).size === S.length);
  } else check('P3.stream-cache-present', false, 'run orchestrate.mjs --plan-only once to extend and cache the stream');
}

// ============ D: final-hop retry diagnostic (descriptive; the metric and its aggregation) ============
// a function over a module so that mutants run through the very same checks
const hopProblems = (mod) => {
  const p = [];
  const AT = (call, from, to, ok) => [call, from, to, ok, to === GOAL ? 1 : 0, 0, 0];       // sink record [call, from, to, ok, goalEntering, a, s]
  // zero-success session with repeated failures
  const z = mod.finalHopFromAttempts([AT(0, FROM, GOAL, 0), AT(1, FROM, GOAL, 0), AT(2, FROM, GOAL, 0)], GOAL, ISEDGE);
  if (!(z.attempts === 3 && z.failures === 3 && z.successes === 0 && z.failuresPerSuccess === null && z.zeroSuccess === true && z.maxFailureRun === 3)) p.push(`zero-success session: ${JSON.stringify(z)}`);
  // failures interleaved with successes: F F F S S F F S
  const r = mod.finalHopFromAttempts([AT(0, FROM, GOAL, 0), AT(1, FROM, GOAL, 0), AT(2, FROM, GOAL, 0), AT(3, FROM, GOAL, 1), AT(4, FROM, GOAL, 1), AT(5, FROM, GOAL, 0), AT(6, FROM, GOAL, 0), AT(7, FROM, GOAL, 1)], GOAL, ISEDGE);
  if (!(r.attempts === 8 && r.failures === 5 && r.successes === 3 && Math.abs(r.failuresPerSuccess - 5 / 3) < 1e-12 && r.maxFailureRun === 3 && r.zeroSuccess === false)) p.push(`repeated failures: ${JSON.stringify(r)}`);
  // not inferred from node visits: repeated draws out of the goal's neighbour that are NOT into the goal, a non-edge into the goal, a self draw
  const x = mod.finalHopFromAttempts([...Array.from({ length: 10 }, (_, i) => AT(i, FROM, OTHER, 0)), AT(10, NONNEIGHBOUR, GOAL, 0), AT(11, GOAL, GOAL, 1), AT(12, FROM, OTHER, 1)], GOAL, ISEDGE);
  if (!(x.attempts === 0 && x.failures === 0 && x.successes === 0 && x.zeroSuccess === true)) p.push(`non-goal / non-edge / self draws were counted: ${JSON.stringify(x)}`);
  // aggregation: zero-success sessions stay in the totals; per-session means are over defined ratios only
  const S = [mod.summarizeEvents(mkEvents(0, 3)), mod.summarizeEvents(mkEvents(1, 1)), mod.summarizeEvents(mkEvents(4, 2))];
  const pool = mod.poolArm(S);
  if (!(pool.sessions === 3 && pool.zeroSuccessSessions === 1 && pool.failures === 6 && pool.successes === 5 && pool.attempts === 11 && Math.abs(pool.failuresPerSuccess - 1.2) < 1e-12
    && Math.abs(pool.meanSessionRatio - 0.75) < 1e-12 && pool.sessionsWithRatio === 2 && pool.maxFailureRun === 3)) p.push(`pooling: ${JSON.stringify(pool)}`);
  // paired comparison: a constant per-world excess of 2 failures with equal successes is a constant 0.4 ratio difference in EVERY resample
  const n = 20, B = Array.from({ length: n }, (_, i) => mod.summarizeEvents(mkEvents(5, i % 4))), A = B.map((b, i) => mod.summarizeEvents(mkEvents(5, (i % 4) + 2)));
  const cmp = mod.pairedRetryComparison(A, B, X1.BOOTSTRAP);
  if (!(Math.abs(cmp.difference - 0.4) < 1e-9 && Math.abs(cmp.ci.lower - 0.4) < 1e-9 && Math.abs(cmp.ci.upper - 0.4) < 1e-9 && cmp.failures.ci.lower === 2 && cmp.failures.ci.upper === 2)) p.push(`pairing not preserved: ${JSON.stringify({ d: cmp.difference, ci: cmp.ci, f: cmp.failures.ci })}`);
  const same = mod.pairedRetryComparison(B, B, X1.BOOTSTRAP);
  if (!(same.difference === 0 && same.ci.lower === 0 && same.ci.upper === 0)) p.push('identical arms do not give a zero difference');
  return p;
};
{
  const real = { finalHopFromAttempts, summarizeEvents, poolArm, pairedRetryComparison };
  const hp = hopProblems(real);
  check('D1.metric-and-aggregation-on-exact-fixtures', hp.length === 0, hp.join('; '));
  // a nondegenerate paired interval contains its point estimate and is ordered
  const mkS = (f, s) => summarizeEvents(mkEvents(s, f));
  const Bv = Array.from({ length: 30 }, (_, i) => mkS(2 + (i % 5), 3 + (i % 4))), Av = Bv.map((b, i) => mkS(b.failures + (i % 3 === 0 ? 3 : 1), b.successes));
  const c = pairedRetryComparison(Av, Bv, X1.BOOTSTRAP);
  check('D2.paired-interval-is-ordered-and-brackets-the-estimate', c.ci.lower <= c.difference && c.difference <= c.ci.upper && c.ci.lower < c.ci.upper && c.replicatesUsed === X1.BOOTSTRAP.replicates && intervalDirection(c.ci) === 'HIGHER');
  check('D2.interval-direction-readings', intervalDirection({ lower: 0.1, upper: 0.5 }) === 'HIGHER' && intervalDirection({ lower: -0.5, upper: -0.1 }) === 'LOWER' && intervalDirection({ lower: -0.1, upper: 0.2 }) === 'NOT_DISTINGUISHABLE' && intervalDirection(null) === 'UNDEFINED');
  // computed from RECORDED events on real sessions (floor ON and floor OFF), against the independent goal-reset record
  const offD = session(SG, { role: 'test', label: 'offD', tree: floorTree.dir, arm: 'COLD', floor: 'off', ...base });
  for (const [nm, rec] of [['on', ON], ['off', offD]]) {
    const hpb = finalHopProblems(rec);
    check(`D3.${nm}-session-diagnostic-is-the-aggregation-of-its-recorded-events`, hpb.length === 0, hpb.join('; '));
    const f = rec.finalHop;
    check(`D3.${nm}-session-successes-are-goal-reaches-and-failures-are-the-remaining-attempts`, f.successes === rec.reaches.goal && f.failures === f.attempts - f.successes && f.attempts === rec.audit.goalEnteringAttempts && f.events.every(e => ISEDGE(e[1], W1.goal)));
    check(`D3.${nm}-session-events-ascend-and-lie-inside-the-session`, f.events.every((e, i) => i === 0 || e[0] >= f.events[i - 1][0]) && f.events.every(e => e[0] >= 0 && e[0] < rec.counters.calls));
  }
  check('D3.off-and-on-are-both-measured-with-the-same-definition', ON.finalHop.attempts > 0 && offD.finalHop.attempts > 0);
  // analysis: the report exists, is paired, keeps zero-success sessions, and the wording guard changes no claim
  const base0 = evaluateBlock(mkBlock({ effect: EFFECT }));
  const fh = base0.finalHop;
  check('D4.report-has-arms-groups-and-six-declared-comparisons', fh && fh.comparisons.length === 6 && Object.keys(fh.byArm).length === 5 && fh.byArm.all.COLD_FLOOR.sessions === 40 && C.GOALS.every(g => fh.byArm[`goal ${g}`].COLD.sessions === 10));
  const sumOf = (res, arm, f) => [...Array(40).keys()].reduce((s, w) => s + res.perWorld[C.WORLD_START + w].arms[arm].finalHop[f], 0);
  check('D4.pooled-totals-equal-the-sum-of-sessions', fh.byArm.all.COLD.failures === sumOf(base0, 'COLD', 'failures') && fh.byArm.all.COLD.successes === sumOf(base0, 'COLD', 'successes')
    && Math.abs(fh.byArm.all.COLD.failuresPerSuccess - sumOf(base0, 'COLD', 'failures') / sumOf(base0, 'COLD', 'successes')) < 1e-12);
  const zs = evaluateBlock(mkBlock({ effect: EFFECT, zeroSuccess: new Set(['COLD|3', 'COLD_FLOOR|3']) }));
  const zc = zs.valid ? zs.finalHop.byArm.all.COLD : null;
  check('D5.zero-success-sessions-are-reported-and-the-world-is-not-excluded', zs.valid && zs.worlds.length === 40 && zc.zeroSuccessSessions === 1 && zs.finalHop.byArm.all.COLD_FLOOR.zeroSuccessSessions === 1
    && JSON.stringify(zs.finalHop.zeroSuccess.all.COLD.worlds) === JSON.stringify([C.WORLD_START + 3]) && zc.failures === sumOf(zs, 'COLD', 'failures') && zc.successes === sumOf(zs, 'COLD', 'successes')
    && zs.perWorld[C.WORLD_START + 3].arms.COLD.finalHop.failures === 5 && zc.sessionsWithRatio === 39, JSON.stringify(zc));
  const hi = evaluateBlock(mkBlock({ effect: EFFECT, retryFactor: { COLD_FLOOR: 1.5 } }));
  check('D6.higher-retry-load-restricts-the-wording-but-changes-no-claim', hi.finalHop.floorRetryLoad.vsCOLD === 'HIGHER' && hi.finalHop.routingCapabilityWordingAllowed === false && JSON.stringify(hi.claims) === JSON.stringify(base0.claims)
    && hi.verdict === base0.verdict && base0.finalHop.routingCapabilityWordingAllowed === true);
  // tampering is caught as an integrity failure (the diagnostic must be computed from the recorded events)
  const t1 = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-COLD-w${C.WORLD_START + 1}`).finalHop.failures += 7; } }));
  const t2 = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-REAL-w${C.WORLD_START + 1}`).finalHop.events.pop(); } }));
  const t3 = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { const e = records.get(`gf1-ENTRY_NR-w${C.WORLD_START + 1}`).finalHop.events; const i = e.findIndex(x => x[2] === 1); e[i][0] += 1000; } }));
  const t4 = evaluateBlock(mkBlock({ effect: EFFECT, tweak: ({ records }) => { delete records.get(`gf1-COLD_FLOOR-w${C.WORLD_START + 1}`).finalHop; } }));
  check('D7.tampered-or-missing-diagnostic-invalidates-the-block', [t1, t2, t3, t4].every(o => !o.valid) && /recomputed from its events/.test(t1.problems.join(';')) && /no finalHop block/.test(t4.problems.join(';')), [t1, t2, t3, t4].map(o => o.problems[0]).join(' | '));
  // the correction moved no decision criterion and introduced no threshold
  check('D8.decision-digest-is-the-one-the-reviewer-saw', C.decisionDigest() === C.REVIEWED_DECISION_DIGEST);
  check('D8.design-digest-binds-the-diagnostic-and-differs-from-the-decision-digest', C.designDigest() !== C.decisionDigest()
    && C.hashObject({ decision: C.decisionDigest(), diagnostics: { finalHop: { ...C.DIAGNOSTICS.finalHop, thresholds: 1 } } }) !== C.designDigest());
  check('D8.no-new-threshold-and-no-declared-criterion-changed', C.DIAGNOSTICS.finalHop.thresholds === null && C.DIAGNOSTICS.finalHop.status === 'DESCRIPTIVE_NOT_CONFIRMATORY'
    && C.MARGIN.delta === 25 && C.MARGIN.minBenefit === 50 && C.MARGIN.maxAttemptDrop === 0.05 && C.WORLDS_N === 160 && C.CLAIMS.length === 5 && C.TC_FLOOR === 1
    && C.WORLD_START === 232 && C.ARM_ORDER.length === 5 && JSON.stringify(C.GOALS) === '[8,12,16,19]');
}

// ============ M: mutants ============
{
  const loadMutated = async (file, edits, tag) => {
    let t = fs.readFileSync(path.join(HERE, file), 'utf8');
    for (const [from, to] of edits) { if (!t.includes(from)) throw new Error(`mutant ${tag}: pattern not found in ${file}`); t = t.replace(from, to); }
    t = t.replace(/from '(\.\.?\/[^']+)'/g, (_, p) => `from '${pathToFileURL(path.resolve(HERE, p)).href}'`);
    const f = path.join(SCRATCH, `mut_${tag}_${file}`);
    fs.writeFileSync(f, t);
    return import(pathToFileURL(f).href);
  };
  const fr = 'floor_runtime.mjs';
  const fm = [
    ['M1.floor-ignores-legality', [["const legal = inStructure === true && Number(to) === Number(goal) && Number(from) !== Number(to) && isEdge(from, to) === true;", 'const legal = Number(to) === Number(goal);']]],
    ['M2.floor-applies-to-any-candidate', [["inStructure === true && Number(to) === Number(goal) && ", 'inStructure === true && ']]],
    ['M3.floor-sets-instead-of-raises', [['const t = Math.max(tc, tcFloor);', 'const t = tcFloor;']]],
    ['M4.floor-lowers', [['const t = Math.max(tc, tcFloor);', 'const t = Math.min(tc, tcFloor);']]],
    ['M5.floor-skips-the-edge-oracle', [[' && isEdge(from, to) === true', '']]],
    ['M6.raised-counter-never-incremented', [['if (t > tc) { counters.raised++; rec.raised++;', 'if (t > tc) { rec.raised++;']]],
  ];
  for (const [id, edits] of fm) {
    const mod = await loadMutated(fr, edits, id.split('.')[0]);
    const p = unitProblems(mod);
    mutant(id, p.length > 0, 'the unit checks did not flag it');
  }
  // transform mutants: build a tree copy with a modified main.js and probe it
  const { probe, P0, P1, firstDiff } = globalThis.__PROBE__;
  const mutantTree = (tag, edit) => {
    const dir = path.join(SCRATCH, `tree_${tag}`);
    fs.cpSync(floorTree.dir, dir, { recursive: true });
    const p = path.join(dir, 'main.js');
    fs.writeFileSync(p, edit(fs.readFileSync(p, 'utf8')));
    return dir;
  };
  {
    // M7: the guard no longer reads `.on` -> an installed-but-off floor changes behaviour
    const dir = mutantTree('m7', t => t.replace('if (globalThis.__GATEFLOOR1__ && globalThis.__GATEFLOOR1__.on) goalGradientBoost', 'if (globalThis.__GATEFLOOR1__) goalGradientBoost'));
    const PA = probe(dir, { on: false, tcFloor: 1 });
    mutant('M7.guard-without-the-on-switch', PA && firstDiff(P0, PA) !== -1, 'armed-but-off was still indistinguishable from off');
  }
  {
    // M8: the inserted line placed BEFORE the original assignment -> the original overwrites it (inert floor)
    const dir = mutantTree('m8', t => { const L = t.split('\n'); const i = L.indexOf(INSERTED); L.splice(i, 1); L.splice(L.indexOf(ANCHOR), 0, INSERTED); return L.join('\n'); });
    const PM = probe(dir, { on: true, tcFloor: 1 });
    mutant('M8.insertion-before-the-anchor-is-inert', PM && firstDiff(P0, PM) === -1, 'ON still diverged');
  }
  {
    // M9: the inserted line also raises the NON-goal gate (applies the floor to the wrong branch)
    const dir = mutantTree('m9', t => t.replace('goalGradientBoost *= (0.10 + 0.90 * tc);', 'goalGradientBoost *= (0.10 + 0.90 * tc); if (globalThis.__GATEFLOOR1__ && globalThis.__GATEFLOOR1__.on) goalGradientBoost *= 3;'));
    const PM = probe(dir, { on: true, tcFloor: 1 });
    const d = PM ? firstDiff(P0, PM) : -1;
    // the first-divergence scope test would see a non-goal candidate differ first
    const caughtIt = PM && d >= 0 && Number(PM.candidates[d][2]) !== P0.goal;
    mutant('M9.floor-leaking-into-a-non-goal-candidate-is-seen-by-first-divergence', caughtIt, 'first divergence was still the goal-entering candidate');
  }
  // analysis mutants
  const am = [
    ['M10.harm-rule-uses-lower-bound', [['harm: b.ci.upper < 0,', 'harm: b.ci.lower < 0,']]],
    ['M11.audit-failures-ignored', [['const c5 = auditFailures.length === 0;', 'const c5 = true;']]],
    ['M12.falls-short-counted-as-ok', [["const okClass = (c) => c === 'NON_INFERIOR' || c === 'EXCEEDS';", "const okClass = (c) => c !== 'INCONCLUSIVE';"]]],
    ['M13.low-baseline-ignored-for-the-real-claim', [["const c2 = i1 === 'OK' && okClass", 'const c2 = okClass']]],
    ['M14.attempt-drop-ignored', [['const c4 = harmGroups.length === 0 && !attemptHarm;', 'const c4 = harmGroups.length === 0;']]],
  ];
  const fixtures = {
    'M10.harm-rule-uses-lower-bound': () => mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 130 }, perGoalEffect: { COLD_FLOOR: { 8: -127 } } }),   // group 8 around +3: interval straddles zero, not harmed
    'M11.audit-failures-ignored': () => mkBlock({ effect: EFFECT, tweak: ({ records }) => { records.get(`gf1-COLD_FLOOR-w${C.WORLD_START + 3}`).audit.nonEdgeAttempts = 1; } }),
    'M12.falls-short-counted-as-ok': () => mkBlock({ effect: { ...EFFECT, COLD_FLOOR: 70 } }),
    'M13.low-baseline-ignored-for-the-real-claim': () => mkBlock({ effect: { ...EFFECT, REAL: 20 } }),
    'M14.attempt-drop-ignored': () => mkBlock({ effect: EFFECT, attemptDelta: { COLD_FLOOR: -0.08 } }),
  };
  const truth = (b) => { const o = evaluateBlock(b); return o.valid ? JSON.stringify([o.claims.C1, o.claims.C2, o.claims.C3, o.claims.C4, o.claims.C5]) : 'INVALID'; };
  const hopMut = [
    ['M15.counts-every-draw-not-only-those-into-the-goal', [['    if (Number(to) !== Number(goal)) continue;                       // not entering the active goal\n', '']]],
    ['M16.counts-draws-on-non-edges', [['if (Number(from) === Number(to) || !isEdge(from, to)) continue;', 'if (Number(from) === Number(to)) continue;']]],
    ['M17.treats-every-attempt-as-a-success', [['ok === 1 ? 1 : 0]);', '1]);']]],
    ['M18.drops-zero-success-sessions-from-the-totals', [['failures = summaries.reduce((s, x) => s + x.failures, 0)', 'failures = summaries.filter(x => !x.zeroSuccess).reduce((s, x) => s + x.failures, 0)']]],
    ['M19.unpaired-bootstrap', [['const x = ratio(A, idx), y = ratio(B, idx);', 'const idx2 = Array.from({ length: n }, () => Math.floor(r() * n)); const x = ratio(A, idx), y = ratio(B, idx2);']]],
    ['M20.max-run-is-total-failures', [['run++; if (run > maxFailureRun) maxFailureRun = run;', 'run++; maxFailureRun = failures;']]],
  ];
  for (const [id, edits] of hopMut) {
    const mod = await loadMutated('finalhop.mjs', edits, id.split('.')[0]);
    const p = hopProblems(mod);
    mutant(id, p.length > 0, 'the metric checks did not flag it');
  }
  for (const [id, edits] of am) {
    const mod = await loadMutated('analyze.mjs', edits, id.split('.')[0]);
    const fx = fixtures[id]();
    const real = truth(clone2(fx)), mut = (() => { const o = mod.evaluateBlock(clone2(fx)); return o.valid ? JSON.stringify([o.claims.C1, o.claims.C2, o.claims.C3, o.claims.C4, o.claims.C5]) : 'INVALID'; })();
    mutant(id, real !== mut, `claims identical under the mutant: ${real}`);
  }
}
function clone2(b) { return { records: new Map([...b.records.entries()].map(([k, v]) => [k, clone(v)])), plan: clone(b.plan), controls: clone(b.controls) }; }

console.log(`\nGATE-FLOOR-1 gate: ${passed} checks passed, ${failed} failed; mutants ${caught} caught, ${missed} missed`);
if (failed || missed) { console.log(fails.join('\n')); process.exit(1); }
fs.rmSync(SCRATCH, { recursive: true, force: true });

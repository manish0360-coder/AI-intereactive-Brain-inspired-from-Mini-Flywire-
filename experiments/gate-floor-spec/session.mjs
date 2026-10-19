// ==========================================================
// GATE-FLOOR-SCOPE (design C') — one-session driver: the exact audited HEAD runtime, hook state P, the floor, and the guard components on the
// UNCHANGED GATE-FLOOR-INTERACTION guard tree (one OS process per session)
// ==========================================================
//   node session.mjs '<json>'
//   json: { role: 'train'|'test', label, tree, world, configSeed, configIndex, agentSeed, ticks, arm?, brainPath?, brainWorld?, exportPath?,
//           floor: 'off'|'on'|'armedOff', guard: 'off'|'mask'|'both', instrument: true|false, diag: true|false, cond: 'P',
//           traceWrites?: boolean, traceDiag?: boolean (gate only) }
//   guard  off : mask off, execution guard off      mask : mask on, execution guard off      both : mask on, execution guard on (Block I's bundle)
//   A training session is cold and floor-off, with guard 'off' (the legacy store U) or 'both' (the guarded store G).  A test session runs any
//   of the three settings.  There is no execution-guard-only setting.
//
// A fork of experiments/gate-floor-interaction/session.mjs (frozen 80f83ad).  The changes: the guard SETTING (a flag pair on the two pinned
// lines instead of one switch), guarded training, the completeness rule per setting, and the OBSERVATIONAL diagnostic below.  With
// diag === false the driver installs exactly the interaction driver's guard object (`on` = the execution component, legalMove called only
// when it is on); the gate proves record equality with the frozen driver for 'off' and 'both'.
//
// THE DIAGNOSTIC (diag === true; DESIGN.md section 6).  It reads, and never writes, runtime state:
//   * step()      (the existing __M7_TEL__ hook at the top of runAgent): the call index and the identity of window.lastReasoning at call start;
//   * EXEC site   the pinned EXEC line reads `__GFGUARD__.on` and, if truthy, calls `__GFGUARD__.legalMove(agentCurrent, reasoning.to)`.  With
//                 diag on, `on` is a getter that returns true, so the line evaluates legalMove at EVERY arrival; legalMove records the arrival
//                 and returns the legality verdict only when the execution component is on, and TRUE otherwise, so with the component off
//                 the line's condition is false exactly as with on === false (no block, no counter change);
//   * goalReset   the derived tree's probe (agentCurrent, current, goal);
//   * window.recentMemory (the episode path buffer; read at each arrival) for the recording audit of the stored episodes.
// Draws no random number; reads no clock.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { ARMS, TICKS, EARLY_WINDOW, HELDOUT_FLOOR, CONFIG_START, seedOk, trainSeed, testSeed, canonicalJson, sha256 } from '../xfer1/config.mjs';
import { serializeBrain, maskBrain, componentHashes, componentSizes, brainHash } from '../xfer1/brain.mjs';
import { createFloor } from '../gate-floor1/floor_runtime.mjs';
import { finalHopFromAttempts } from '../gate-floor1/finalhop.mjs';
import { SCHEMA, TC_FLOOR, TREE, GUARD_TREE, HEAD_COMMIT, HOOK_STATES, CONFIRMATORY_STATE, GUARD_SETTINGS } from './config.mjs';
import { summarizeDiag, appendedPair, adjacency, storeDiagnostics } from './diag.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`GATE-FLOOR-SCOPE session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');
if (process.env.H1R === 'on') refuse('H1R=on: this driver runs the audited HEAD runtime');

// ---- argument guards (before anything is loaded) ----
const KEYS = ['role', 'label', 'tree', 'world', 'configSeed', 'configIndex', 'agentSeed', 'ticks', 'arm', 'brainPath', 'brainWorld', 'exportPath', 'floor', 'instrument', 'traceWrites', 'cond', 'guard', 'diag', 'traceDiag'];
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const unknown = Object.keys(IN).filter(k => !KEYS.includes(k)); if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`); }
if (IN.cond !== CONFIRMATORY_STATE) refuse(`cond must be the confirmatory state ${CONFIRMATORY_STATE}, got ${IN.cond}`);
if (!Object.prototype.hasOwnProperty.call(GUARD_SETTINGS, IN.guard)) refuse(`guard must be one of ${Object.keys(GUARD_SETTINGS).join('|')}, got ${IN.guard}`);
if (typeof IN.instrument !== 'boolean') refuse('instrument must be a boolean');
if (typeof IN.diag !== 'boolean') refuse('diag must be a boolean');
if (IN.diag && !IN.instrument) refuse('the diagnostic needs an instrumented run');
if (IN.guard !== 'off' && !IN.instrument) refuse('a guard setting other than off needs an instrumented run');
if (IN.role === 'train' && !['off', 'both'].includes(IN.guard)) refuse('a training session is trained with the guard off (U) or the bundle (G)');
if (!['off', 'on', 'armedOff'].includes(IN.floor)) refuse(`floor must be 'off', 'on' or 'armedOff', got ${IN.floor}`);
if (IN.traceWrites !== undefined && typeof IN.traceWrites !== 'boolean') refuse('traceWrites must be a boolean');
if (IN.traceDiag !== undefined && (typeof IN.traceDiag !== 'boolean' || (IN.traceDiag && !IN.diag))) refuse('traceDiag must be a boolean and needs diag');
if (!IN.instrument && IN.floor !== 'off') refuse('the bare (uninstrumented) run has no floor');
if (!['train', 'test'].includes(IN.role)) refuse(`unknown role ${IN.role}`);
if (IN.role === 'train' && IN.floor !== 'off') refuse('a training session never runs the floor');
if (!Number.isInteger(IN.world) || IN.world < 0) refuse('world must be a non-negative integer');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
if (IN.agentSeed !== (IN.role === 'train' ? trainSeed(IN.world) : testSeed(IN.world))) refuse(`agent seed is not the ${IN.role} seed of world ${IN.world}`);
if (IN.ticks !== TICKS[IN.role]) refuse(`ticks must be ${TICKS[IN.role]} for role ${IN.role}`);
if (IN.role === 'train') {
  if (IN.arm !== undefined || IN.brainPath !== undefined) refuse('a training session is cold and has no arm or brain');
} else {
  if (IN.arm !== 'COLD' && IN.arm !== 'ONLY_episodes') refuse(`arm ${IN.arm}: this study delivers episodes only (COLD or ONLY_episodes)`);
  const needsBrain = ARMS[IN.arm].source !== 'none';
  if (needsBrain !== (typeof IN.brainPath === 'string')) refuse(`arm ${IN.arm} ${needsBrain ? 'needs' : 'must not have'} a brain file`);
  if (needsBrain) { if (IN.brainWorld !== IN.world) refuse('the delivered store must be this world\'s own (brainWorld === world)'); }
  else if (IN.brainWorld !== undefined) refuse('a cold arm carries no brainWorld');
}
if (IN.configSeed < CONFIG_START || IN.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is outside the territory or is held-out/consumed');
if (typeof IN.tree !== 'string' || !fs.existsSync(path.join(IN.tree, 'MANIFEST.json'))) refuse('tree must be a prepared tree directory');
const treeManifest = JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8'));
const isDerived = !!treeManifest.gatefloorhead && treeManifest.gatefloorhead.bare === false;
const isBare = !!treeManifest.gatefloorhead && treeManifest.gatefloorhead.bare === true;
const isGuard = isDerived && !!treeManifest.gatefloorinteraction;
const mainSha = sha256(fs.readFileSync(path.join(IN.tree, 'main.js')));
if (!isDerived && !isBare) refuse('the tree is not an audited HEAD tree');
if (treeManifest.gatefloorhead.headCommit !== HEAD_COMMIT) refuse('the tree was not built from the audited commit');
if (mainSha !== (isGuard ? GUARD_TREE.guardMainSha256 : isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(`main.js of the tree (${mainSha.slice(0, 12)}) is not the pinned ${isGuard ? 'guard' : isDerived ? 'derived' : 'bare HEAD'} main.js`);
if ((IN.guard !== 'off' || IN.diag) && !isGuard) refuse('a guard setting other than off, and the diagnostic, need the guard tree');
if (IN.floor !== 'off' && !isDerived) refuse('floor on/armedOff needs the derived HEAD tree');
if (IN.instrument && !isDerived) refuse('the instrumented run needs the derived HEAD tree (it carries the goal-reset probe)');

// the world's edge oracle: connections.json of the tree (the same file that defines every neuron's neighbours)
const edges = JSON.parse(fs.readFileSync(path.join(IN.tree, 'connections.json'), 'utf8'));
const ADJ = new Set();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); ADJ.add(a + '|' + b); ADJ.add(b + '|' + a); }
const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && ADJ.has(Number(a) + '|' + Number(b));
const GRAPH = adjacency(edges);

const T = (rel) => import(URLOF(IN.tree, rel));
const envmod = await T('experiments/m7/env.js');
const gen = envmod.generateAccepted(IN.configSeed, IN.configIndex);
if (gen.provenance.acceptedSeed !== IN.configSeed || gen.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) refuse('configSeed is not an accepted seed at this index');
if (typedConfig.isHeldOut(typedConfigSeed(gen.provenance.acceptedSeed)) || typedConfig.isConsumed(typedConfigSeed(gen.provenance.acceptedSeed))) refuse('accepted configuration is held-out or consumed territory');
const goalId = gen.cfg.goal;

// ---- observational scaffolding (all of it absent when instrument === false) ----
const SETTING = GUARD_SETTINGS[IN.guard];
const MASK_ON = SETTING.mask, EXEC_ON = SETTING.exec, DIAG = IN.diag === true;
let calls = 0, startState = null;
const goalResets = [];       // [call, from, legal]
const draws = [];            // [call, from, to, ok]
const replayCalls = [];
let FLOOR = null;
// diagnostic state
const num = (v) => (v === null || v === undefined ? null : Number(v));
let lrAtStart;                                   // window.lastReasoning as it was when this call started
const arrivals = [], resetsDiag = [];
const recording = { appended: { EXEC: 0, SKIP: 0, SELF: 0, FIRST: 0 }, nonGraph: { EXEC: 0, SKIP: 0 }, skipTwoHop: 0, inconsistent: 0, goalPairs: { EXEC: 0, SKIP: 0, SELF: 0, FIRST: 0 } };
const pairClass = new Map();                     // 'p->x' -> { EXEC, SKIP }
let memPrev = [], arrPrev = null;
const notePair = (p, x, kind) => {
  if (kind !== 'EXEC' && kind !== 'SKIP') return;
  const k = `${Number(p)}->${Number(x)}`; const c = pairClass.get(k) || { EXEC: 0, SKIP: 0 }; c[kind]++; pairClass.set(k, c);
  if (!isEdge(p, x)) { recording.nonGraph[kind]++; if (kind === 'SKIP' && GRAPH.commonNeighbour(p, x)) recording.skipTwoHop++; }
};
const observeArrival = (a, b, legal) => {
  const r = globalThis.lastReasoning;
  const x = { call: calls - 1, a: num(a), to: num(b), rFrom: r ? num(r.from) : null, rTo: r ? num(r.to) : null, fresh: r !== lrAtStart, legal, blocked: EXEC_ON && !legal };
  arrivals.push(x);
  const cur = Array.isArray(globalThis.recentMemory) ? globalThis.recentMemory.map(Number) : [];
  const ev = appendedPair(memPrev, cur, arrPrev);
  if (ev) { recording.appended[ev.kind]++; if (!ev.consistent) recording.inconsistent++; if (ev.pair) notePair(ev.pair[0], ev.pair[1], ev.kind); }
  memPrev = cur; arrPrev = x;
};
const modsP = IN.instrument ? Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js')]) : null;
if (IN.instrument) {
  const [qmod, mem, epm] = await modsP;
  globalThis.__stores = () => ({ transitions: mem.transitions, rewards: mem.rewards, penalties: mem.penalties, signals: mem.signals, curiosity: mem.curiosityMap,
    Q: qmod.Q, confidence: mem.confidenceMap, episodes: epm.exportEpisodes() });
  globalThis.__M7_TEL__ = {
    step() { calls++; if (DIAG) lrAtStart = globalThis.lastReasoning; if (calls === 1) { const b = serializeBrain(globalThis.__stores()); startState = { hashes: componentHashes(b), sizes: componentSizes(b), brainHash: brainHash(b) }; } },
    replayBranch() { replayCalls.push(calls - 1); },
  };
  globalThis.__GFB2__ = { goalReset(from, to, goal) {
    goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]);
    if (DIAG) {
      resetsDiag.push({ call: calls - 1, from: num(from), to: num(to), goal: num(goal) });
      // the goal push and the buffer clear happened in this call, after this call's arrival: the episode's final pair is (last recorded node -> goal)
      if (memPrev.length === 0) recording.goalPairs.FIRST++;
      else { const p = memPrev[memPrev.length - 1]; const kind = Number(p) === Number(to) ? 'SELF' : Number(p) === Number(from) ? 'EXEC' : 'SKIP'; recording.goalPairs[kind]++; notePair(p, to, kind); }
    }
  } };
  { const counters = { admittedGraph: 0, admitted: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };
    const legalOf = (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b);
    const GUARD = DIAG
      ? { get on() { return true; }, counters, legalMove(a, b) { const legal = legalOf(a, b); observeArrival(a, b, legal); return EXEC_ON ? legal : true; } }
      : { on: EXEC_ON, counters, legalMove: legalOf };
    GUARD.admit = (from, k, graph, trained, human) => { if (graph) { counters.admittedGraph++; return true; } if (trained && human) counters.nonGraphBoth++; else if (trained) counters.nonGraphTrained++; else if (human) counters.nonGraphHuman++; else return true;
      if (MASK_ON) { counters.maskedOut++; return false; } counters.admitted++; return true; };
    globalThis.__GFGUARD__ = GUARD; globalThis.__GFGUARD_SNAP__ = () => ({ setting: IN.guard, mask: MASK_ON, exec: EXEC_ON, diag: DIAG, counters: { ...counters } }); }
  if (IN.floor !== 'off') { FLOOR = createFloor({ on: IN.floor === 'on', tcFloor: TC_FLOOR, isEdge }); globalThis.__GATEFLOORB2__ = FLOOR; }
  // run.js assigns globalThis.__M7_ENV__ = { attempt }; wrap it at assignment, calling through unchanged
  let _env;
  Object.defineProperty(globalThis, '__M7_ENV__', { configurable: true, enumerable: true, get() { return _env; },
    set(v) { _env = v && typeof v.attempt === 'function' ? { ...v, attempt(from, to) { const ok = v.attempt(from, to); draws.push([calls - 1, Number(from), Number(to), ok ? 1 : 0]); return ok; } } : v; } });
}

// ---- the brain this session starts with ----
let delivered = null, deliveredJson = null;
if (IN.role === 'test' && ARMS[IN.arm].source !== 'none') {
  const full = JSON.parse(fs.readFileSync(IN.brainPath, 'utf8'));
  delivered = maskBrain(full, ARMS[IN.arm].keep);
  deliveredJson = JSON.stringify(delivered);
}
const reads = []; let served = false, current;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, enumerable: true, get() { return current; },
  set(v) { current = { getItem: (k) => { if (k === 'brain' && deliveredJson !== null && !served) { served = true; reads.push('brain: served'); return deliveredJson; } reads.push(`${k}: passthrough`); return v.getItem(k); },
    setItem: (k, x) => v.setItem(k, x), removeItem: (k) => v.removeItem(k), clear: () => v.clear() }; } });

process.chdir(path.join(IN.tree, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(IN.tree, 'experiments/m7/run.js'));
const HK = HOOK_STATES[IN.cond];
if (HK.passEnv) globalThis.__M7_ENV__ = { attempt() { return true; } };     // control state Ppass only (never the confirmatory state)
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: HK.arm, envMode: HK.envMode, creditMode: HK.creditMode, pin: HK.pin, tickUnit: 'step', ticks: IN.ticks, crashAtTick: null, warmStore: false });
const A = rec.artifacts || {};
const ec = A.envCounters || {};
const TR = await T('render/traversalRecord.js');
const traversal = (() => { let a = 0, s = 0, edgesObserved = 0, edgesWithSlip = 0, maxCost = 1; const seen = new Set();
  for (const e of edges) for (const [u, v] of [[Number(e.from), Number(e.to)], [Number(e.to), Number(e.from)]]) { const k = u + '|' + v; if (seen.has(k)) continue; seen.add(k);
    const r = TR.recordFor(u, v); if (r.a > 0) { edgesObserved++; a += r.a; s += r.s; if (r.s < r.a) edgesWithSlip++; maxCost = Math.max(maxCost, (r.a + 1) / (r.s + 1)); } }
  return { attempts: a, successes: s, edgesObserved, edgesWithSlip, maxCostEstimate: maxCost }; })();

if (!IN.instrument) {
  // the bare record: exactly what runOnce produced, plus an end-state brain hash read AFTER the run (it cannot influence it)
  const [bq, bm, be] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js')]);
  const bareEnd = serializeBrain({ transitions: bm.transitions, rewards: bm.rewards, penalties: bm.penalties, signals: bm.signals, curiosity: bm.curiosityMap,
    Q: bq.Q, confidence: bm.confidenceMap, episodes: be.exportEpisodes() });
  process.stdout.write('\n@@RESULT@@' + JSON.stringify({ schema: `${SCHEMA}.session`, bare: true, role: IN.role, label: IN.label,
    outcome: { crashed: rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, loopsExecuted: rec.outcome.loopsExecuted },
    artifacts: A, traversal, cond: IN.cond, fingerprint: rec.fingerprint, endHash: brainHash(bareEnd), endHashes: componentHashes(bareEnd), tree: { name: path.basename(IN.tree), mainSha256: mainSha } }) + '@@END@@\n');
  process.exit(rec.outcome.crashed ? 1 : 0);
}

// ---- outcomes (instrumented) ----
const goalCalls = goalResets.map(r => r[0]);
const legalReaches = goalResets.filter(r => r[2] === 1);
const nonEdgeReaches = goalResets.filter(r => r[2] === 0);
const stores = globalThis.__stores;
const endBrain = serializeBrain(stores());
if (typeof IN.exportPath === 'string') fs.writeFileSync(IN.exportPath, JSON.stringify(endBrain));
const writes = (A.writes || []).filter(w => typeof w === 'string');
// moveClass classifies DECISIONS (the lastReasoning writes recorded by run.js), not executions; executions are classified by the diagnostic
const moveClass = { legal: 0, nonGraph: 0, self: 0, none: (A.writes || []).filter(w => typeof w !== 'string').length };
for (const w of writes) { const m = /^(\d+)->(\d+)$/.exec(w); if (!m) continue; if (m[1] === m[2]) moveClass.self++; else if (isEdge(Number(m[1]), Number(m[2]))) moveClass.legal++; else moveClass.nonGraph++; }
const moveCount = {};
for (const w of writes) moveCount[w] = (moveCount[w] || 0) + 1;
const topMoves = Object.entries(moveCount).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 6);

// final hop: legal reaches are the traversals into the goal; B2 takes NO environment draw for a goal-entering move
const drawsIntoGoal = draws.filter(d => d[2] === Number(goalId));
const events = [
  ...legalReaches.map(r => [r[0], r[1], 1]),
  ...drawsIntoGoal.filter(d => isEdge(d[1], d[2])).map(d => [d[0], d[1], d[3]]),
].sort((a, b) => a[0] - b[0]);
const hop = finalHopFromAttempts(events.map(e => [e[0], e[1], Number(goalId), e[2], 1, 0, 0]), goalId, isEdge);
const goalEdges = (() => { const nb = [...new Set(edges.flatMap(e => (Number(e.from) === Number(goalId) ? [Number(e.to)] : Number(e.to) === Number(goalId) ? [Number(e.from)] : [])))].sort((a, b) => a - b);
  return nb.map(u => ({ from: u, p: envmod.trueP(u, goalId) })); })();
const endStores = stores();
const goalEdgeState = goalEdges.map(e => ({ from: e.from, p: e.p, penalty: Number(endStores.penalties.get(`${e.from}->${goalId}`) || 0), reward: Number(endStores.rewards.get(`${e.from}->${goalId}`) || 0),
  transitions: Number((endStores.transitions.get(e.from) && endStores.transitions.get(e.from).get(goalId)) || 0) }));

const conditionIntegrity = {
  cond: IN.cond, hooks: { arm: HK.arm, envMode: HK.envMode, creditMode: HK.creditMode, pin: HK.pin, passEnv: HK.passEnv },
  envDraws: ec.envDraws, envAttempts: ec.attempts, envSlips: ec.slips, drawsLogged: draws.length, harnessAttempts: A.attempts, harnessSlips: A.slips,
  creditKeys: (A.creditKeys || []).length, creditRejected: A.creditRejected, peLaCalls: A.laSteps, peDampCalls: A.dampInvoked,
  traversal, episodeCapArmed: rec.provenance ? rec.provenance.episodeCapArmed === true : null, replayDeterministic: rec.provenance ? rec.provenance.replayCooldownDeterministic === true : null,
};
conditionIntegrity.ok = IN.cond === 'P' && conditionIntegrity.envDraws === 0 && conditionIntegrity.drawsLogged === 0 && conditionIntegrity.harnessAttempts === 0 && conditionIntegrity.harnessSlips === 0
  && conditionIntegrity.creditKeys === 0 && conditionIntegrity.peLaCalls === 0 && conditionIntegrity.peDampCalls === 0
  && traversal.attempts === traversal.successes && traversal.edgesWithSlip === 0 && traversal.maxCostEstimate === 1
  && conditionIntegrity.episodeCapArmed === true && conditionIntegrity.replayDeterministic === true;

// ---- the diagnostic summary and its accounting identities ----
const guardSnap = globalThis.__GFGUARD_SNAP__ ? globalThis.__GFGUARD_SNAP__() : null;
let diag = null;
if (DIAG) {
  const s = summarizeDiag({ arrivals, resets: resetsDiag, isEdge });
  diag = { ...s,
    accounting: {
      resetsLegal: s.resetTotals.legal === legalReaches.length,
      resetsNonGraph: s.resetTotals.nonGraph === nonEdgeReaches.length,
      blockedEqualsLineCounter: s.blocked === guardSnap.counters.blockedIllegal,
      arrivalsAtMostCalls: s.arrivals.total <= calls,
      noDuplicateCalls: s.arrivals.duplicateCalls === 0,
    },
    recording: { ...recording, distinctPairs: pairClass.size },
  };
  diag.accounting.ok = Object.values(diag.accounting).every(v => v === true);
}
const store = (DIAG && IN.role === 'train') ? storeDiagnostics(endBrain.episodes || [], GRAPH, goalId, pairClass) : null;

// guard completeness per setting
const guardCompleteness = { guard: IN.guard, nonGraphResets: nonEdgeReaches.length, nonGraphDecisions: moveClass.nonGraph, admittedNonGraph: guardSnap.counters.admitted,
  maskedOut: guardSnap.counters.maskedOut, blockedIllegal: guardSnap.counters.blockedIllegal, illegalExecutions: diag ? diag.illegalExecuted : null };
guardCompleteness.ok = IN.guard === 'both'
  ? (guardCompleteness.nonGraphResets === 0 && guardCompleteness.nonGraphDecisions === 0 && guardCompleteness.admittedNonGraph === 0 && (diag === null || guardCompleteness.illegalExecutions === 0))
  : IN.guard === 'mask'
    ? (guardCompleteness.nonGraphDecisions === 0 && guardCompleteness.admittedNonGraph === 0 && guardCompleteness.blockedIllegal === 0)
    : (guardCompleteness.maskedOut === 0 && guardCompleteness.blockedIllegal === 0);

const out = {
  schema: `${SCHEMA}.session`, role: IN.role, label: IN.label, floorMode: IN.floor, guardSetting: IN.guard, bare: false,
  input: { world: IN.world, configSeed: IN.configSeed, configIndex: IN.configIndex, acceptedConfigSeed: gen.provenance.acceptedSeed, goal: goalId, agentSeed: IN.agentSeed, ticks: IN.ticks,
    arm: IN.arm === undefined ? null : IN.arm, keep: IN.role === 'test' ? ARMS[IN.arm].keep : null, brainFile: typeof IN.brainPath === 'string' ? path.basename(IN.brainPath) : null, brainWorld: IN.brainWorld === undefined ? null : IN.brainWorld },
  tree: { name: path.basename(IN.tree), headCommit: treeManifest.gatefloorhead.headCommit, derived: isDerived, mainSha256: mainSha, manifestSha256: sha256(canonicalJson(treeManifest.files)),
    gatefloorheadTransformSha256: treeManifest.gatefloorhead.transformSha256 },
  outcome: { crashed: rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, loopsExecuted: rec.outcome.loopsExecuted,
    error: rec.outcome.error ? { message: String(rec.outcome.error.message).slice(0, 200), tickAtCrash: rec.outcome.error.tickAtCrash } : null },
  counters: { calls, envDraws: ec.envDraws, attempts: ec.attempts, successes: ec.successes, slips: ec.slips },
  reaches: { goal: goalResets.length, legal: legalReaches.length, nonEdge: nonEdgeReaches.length, goalCalls, nonEdgeCalls: nonEdgeReaches.map(r => r[0]), nonEdgeFrom: nonEdgeReaches.map(r => r[1]),
    legalCalls: legalReaches.map(r => r[0]), goalByWindow: (() => { const w = []; for (const c of goalCalls) { const k = Math.floor(c / EARLY_WINDOW); w[k] = (w[k] || 0) + 1; } return Array.from(w, v => v || 0); })() },
  endpoints: {
    goalReaches: goalResets.length, attemptSuccess: ec.attempts > 0 ? ec.successes / ec.attempts : null, slipsPerCall: calls > 0 ? ec.slips / calls : null,
    earlyReaches: goalCalls.filter(c => c < EARLY_WINDOW).length, legalReaches: legalReaches.length,
  },
  brain: {
    deliveredHash: delivered === null ? 'none' : brainHash(delivered), deliveredHashes: delivered === null ? null : componentHashes(delivered), deliveredSizes: delivered === null ? null : componentSizes(delivered),
    start: startState, endHash: brainHash(endBrain), endHashes: componentHashes(endBrain), endSizes: componentSizes(endBrain), localStorageReads: reads,
  },
  conditionIntegrity, guardCompleteness, guard: guardSnap, moveClass, diag, store,
  floor: FLOOR === null ? null : FLOOR.snapshot(),
  audit: {
    drawsTotal: draws.length, drawsIntoGoal: drawsIntoGoal.length, drawsNonEdge: draws.filter(d => !isEdge(d[1], d[2])).length,
    goalReaches: goalResets.length, legalReaches: legalReaches.length, nonEdgeReaches: nonEdgeReaches.length,
    reachesEqualLegalPlusNonEdge: goalResets.length === legalReaches.length + nonEdgeReaches.length,
    drawsOnEdges: draws.filter(d => isEdge(d[1], d[2])).length,
    drawsMatchEnvCounters: draws.filter(d => isEdge(d[1], d[2])).length === ec.envDraws && draws.filter(d => isEdge(d[1], d[2]) && d[3] === 1).length === ec.successes,
  },
  finalHop: { ...hop, drawsIntoGoal: drawsIntoGoal.length, goalEdges },
  goalEdgeState,
  diagnostics: { replayCalls: replayCalls.length, replayCallList: replayCalls, writes: writes.length, distinctMoves: Object.keys(moveCount).length, topMoves },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: ec, qEntries: A.qEntries, qSum: A.qSum, attempts: A.attempts, successes: A.successes, slips: A.slips,
    creditKeys: (A.creditKeys || []).length, fingerprint: rec.fingerprint, writesSha256: sha256(JSON.stringify(A.writes || [])), ...(IN.traceWrites ? { writes: A.writes } : {}) },
  ...(IN.traceDiag ? { trace: { arrivals, resets: resetsDiag, pairClass: [...pairClass.entries()], storeEpisodes: (endBrain.episodes || []).map(e => ({ source: e.source, nodes: e.nodes })) } } : {}),
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

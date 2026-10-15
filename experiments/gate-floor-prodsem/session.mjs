// ==========================================================
// GATE-FLOOR-PRODSEM — one-session driver for the exact audited HEAD runtime under a declared M7 HOOK STATE (one OS process per session)
// ==========================================================
//   node session.mjs '<json>'
//   json: { role: 'train'|'test', label, tree, world, configSeed, configIndex, agentSeed, ticks, arm?, brainPath?, brainWorld?,
//           exportPath?, floor: 'off'|'on'|'armedOff', instrument: true|false, cond: 'P'|'H'|'E'|'Ppass', traceWrites?: boolean (gate only) }
//   cond selects the M7 hook state handed to runOnce (config.mjs HOOK_STATES).  P is the confirmatory state: arm OFF, envMode off,
//   creditMode off, pin off.  H/E/Ppass exist for the gate and the descriptive decomposition only and refuse any floor-on run.
//
// A fork of experiments/gate-floor-head/session.mjs (the only changes: the `cond` input, the condition-integrity block and the
// traversal-record dump).  It forks experiments/gate-floor-b2/session.mjs for the HEAD trees.  No H1-R runtime is installed (`__H1R__` is
// never defined): the runtime executes exactly HEAD (FutureScore V2.3 live).  What this driver adds around it is OBSERVATIONAL only:
//   * `__M7_TEL__` (B2's own telemetry hook, called at the start of every runAgent()): the call index and the replay
//     branch calls;
//   * `__M7_ENV__` setter wrapper: logs every environment draw (call, from, to, outcome) and calls through unchanged;
//   * `__GFB2__` (the derived tree's goal-reset probe): (from, to, goal) at each goal reset;
//   * localStorage one-shot delivery of the arm's episodes (the product's loadBrain() single read).
// `instrument: false` installs NONE of these and no floor: the bare run whose record the measured OFF runtime must equal.
// Draws no random number.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { ARMS, TICKS, EARLY_WINDOW, HELDOUT_FLOOR, CONFIG_START, seedOk, trainSeed, testSeed, canonicalJson, sha256 } from '../xfer1/config.mjs';
import { serializeBrain, maskBrain, componentHashes, componentSizes, brainHash } from '../xfer1/brain.mjs';
import { createFloor } from '../gate-floor1/floor_runtime.mjs';
import { finalHopFromAttempts } from '../gate-floor1/finalhop.mjs';
import { SCHEMA, TC_FLOOR, TREE, HEAD_COMMIT, HOOK_STATES, CONFIRMATORY_STATE } from './config.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`GATE-FLOOR-PRODSEM session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');
if (process.env.H1R === 'on') refuse('H1R=on: this driver runs the audited HEAD runtime');

// ---- argument guards (before anything is loaded) ----
const KEYS = ['role', 'label', 'tree', 'world', 'configSeed', 'configIndex', 'agentSeed', 'ticks', 'arm', 'brainPath', 'brainWorld', 'exportPath', 'floor', 'instrument', 'traceWrites', 'cond'];
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const unknown = Object.keys(IN).filter(k => !KEYS.includes(k)); if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`); }
if (typeof IN.cond !== 'string' || !Object.prototype.hasOwnProperty.call(HOOK_STATES, IN.cond)) refuse(`cond must be one of ${Object.keys(HOOK_STATES).join(', ')}, got ${IN.cond}`);
if (IN.cond !== CONFIRMATORY_STATE && IN.floor !== 'off') refuse(`the floor runs only under the confirmatory state ${CONFIRMATORY_STATE}, not ${IN.cond}`);
if (!['off', 'on', 'armedOff'].includes(IN.floor)) refuse(`floor must be 'off', 'on' or 'armedOff', got ${IN.floor}`);
if (typeof IN.instrument !== 'boolean') refuse('instrument must be a boolean');
if (IN.traceWrites !== undefined && typeof IN.traceWrites !== 'boolean') refuse('traceWrites must be a boolean');
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
  if (IN.arm !== 'COLD' && IN.arm !== 'ONLY_episodes') refuse(`arm ${IN.arm}: GATE-FLOOR-HEAD delivers episodes only (COLD or ONLY_episodes)`);
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
const mainSha = sha256(fs.readFileSync(path.join(IN.tree, 'main.js')));
if (!isDerived && !isBare) refuse('the tree is not an audited HEAD tree');
if (treeManifest.gatefloorhead.headCommit !== HEAD_COMMIT) refuse('the tree was not built from the audited commit');
if (mainSha !== (isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256)) refuse(`main.js of the tree (${mainSha.slice(0, 12)}) is not the pinned ${isDerived ? 'derived' : 'bare HEAD'} main.js`);
if (IN.floor !== 'off' && !isDerived) refuse('floor on/armedOff needs the derived HEAD tree');
if (IN.instrument && !isDerived) refuse('the instrumented run needs the derived HEAD tree (it carries the goal-reset probe)');

// the world's edge oracle: connections.json of the tree (the same file that defines every neuron's neighbours)
const edges = JSON.parse(fs.readFileSync(path.join(IN.tree, 'connections.json'), 'utf8'));
const ADJ = new Set();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); ADJ.add(a + '|' + b); ADJ.add(b + '|' + a); }
const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && ADJ.has(Number(a) + '|' + Number(b));

const T = (rel) => import(URLOF(IN.tree, rel));
const envmod = await T('experiments/m7/env.js');
const gen = envmod.generateAccepted(IN.configSeed, IN.configIndex);
if (gen.provenance.acceptedSeed !== IN.configSeed || gen.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) refuse('configSeed is not an accepted seed at this index');
if (typedConfig.isHeldOut(typedConfigSeed(gen.provenance.acceptedSeed)) || typedConfig.isConsumed(typedConfigSeed(gen.provenance.acceptedSeed))) refuse('accepted configuration is held-out or consumed territory');
const goalId = gen.cfg.goal;

// ---- observational scaffolding (all of it absent when instrument === false) ----
let calls = 0, startState = null;
const goalResets = [];       // [call, from, legal]
const draws = [];            // [call, from, to, ok]
const replayCalls = [];
let FLOOR = null;
const modsP = IN.instrument ? Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js')]) : null;
if (IN.instrument) {
  const [qmod, mem, epm] = await modsP;
  globalThis.__stores = () => ({ transitions: mem.transitions, rewards: mem.rewards, penalties: mem.penalties, signals: mem.signals, curiosity: mem.curiosityMap,
    Q: qmod.Q, confidence: mem.confidenceMap, episodes: epm.exportEpisodes() });
  globalThis.__M7_TEL__ = {
    step() { calls++; if (calls === 1) { const b = serializeBrain(globalThis.__stores()); startState = { hashes: componentHashes(b), sizes: componentSizes(b), brainHash: brainHash(b) }; } },
    replayBranch() { replayCalls.push(calls - 1); },
  };
  globalThis.__GFB2__ = { goalReset(from, to, goal) { goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]); } };
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
if (HK.passEnv) globalThis.__M7_ENV__ = { attempt() { return true; } };     // control state Ppass only: an installed p = 1 environment
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
const moveCount = {};
for (const w of writes) moveCount[w] = (moveCount[w] || 0) + 1;
const topMoves = Object.entries(moveCount).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 6);

// final hop: legal reaches are the traversals into the goal; B2 takes NO environment draw for a goal-entering move, so
// the draw log is searched for any draw into the goal (expected none) and a failed final-hop attempt cannot exist.
const drawsIntoGoal = draws.filter(d => d[2] === Number(goalId));
const events = [
  ...legalReaches.map(r => [r[0], r[1], 1]),
  ...drawsIntoGoal.filter(d => isEdge(d[1], d[2])).map(d => [d[0], d[1], d[3]]),
].sort((a, b) => a[0] - b[0]);
const hop = finalHopFromAttempts(events.map(e => [e[0], e[1], Number(goalId), e[2], 1, 0, 0]), goalId, isEdge);
const goalEdges = (() => { const nb = [...new Set(edges.flatMap(e => (Number(e.from) === Number(goalId) ? [Number(e.to)] : Number(e.to) === Number(goalId) ? [Number(e.from)] : [])))].sort((a, b) => a - b);
  return nb.map(u => ({ from: u, p: envmod.trueP(u, goalId) })); })();

// end-state memory of the goal's edges, read AFTER the run (descriptive: how much shortcut penalty B2's 1-hop block left on each goal edge)
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
const out = {
  schema: `${SCHEMA}.session`, role: IN.role, label: IN.label, floorMode: IN.floor, bare: false,
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
    goalReaches: goalResets.length,                                   // B2's own accounting: every goal reset
    attemptSuccess: ec.attempts > 0 ? ec.successes / ec.attempts : null,   // environment draws only (a goal entry takes none in B2)
    slipsPerCall: calls > 0 ? ec.slips / calls : null,
    earlyReaches: goalCalls.filter(c => c < EARLY_WINDOW).length,
    legalReaches: legalReaches.length,
  },
  brain: {
    deliveredHash: delivered === null ? 'none' : brainHash(delivered), deliveredHashes: delivered === null ? null : componentHashes(delivered), deliveredSizes: delivered === null ? null : componentSizes(delivered),
    start: startState, endHash: brainHash(endBrain), endHashes: componentHashes(endBrain), endSizes: componentSizes(endBrain), localStorageReads: reads,
  },
  conditionIntegrity,
  floor: FLOOR === null ? null : FLOOR.snapshot(),
  audit: {
    drawsTotal: draws.length, drawsIntoGoal: drawsIntoGoal.length, drawsNonEdge: draws.filter(d => !isEdge(d[1], d[2])).length,
    goalReaches: goalResets.length, legalReaches: legalReaches.length, nonEdgeReaches: nonEdgeReaches.length,
    reachesEqualLegalPlusNonEdge: goalResets.length === legalReaches.length + nonEdgeReaches.length,
    // B2's env.attempt returns true WITHOUT a draw (and without counting) for a pair that is not a graph edge
    drawsOnEdges: draws.filter(d => isEdge(d[1], d[2])).length,
    drawsMatchEnvCounters: draws.filter(d => isEdge(d[1], d[2])).length === ec.envDraws && draws.filter(d => isEdge(d[1], d[2]) && d[3] === 1).length === ec.successes,
  },
  finalHop: { ...hop, drawsIntoGoal: drawsIntoGoal.length, goalEdges },
  goalEdgeState,
  diagnostics: { replayCalls: replayCalls.length, replayCallList: replayCalls, writes: writes.length, distinctMoves: Object.keys(moveCount).length, topMoves },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: ec, qEntries: A.qEntries, qSum: A.qSum, attempts: A.attempts, successes: A.successes, slips: A.slips,
    creditKeys: (A.creditKeys || []).length, fingerprint: rec.fingerprint, writesSha256: sha256(JSON.stringify(A.writes || [])), ...(IN.traceWrites ? { writes: A.writes } : {}) },
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

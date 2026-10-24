// ==========================================================
// LEARN-0 — one-session driver: the audited runtime, hook state P, the map oracles on or off (one OS process per session)
// ==========================================================
//   node session.mjs '<json>'
//   json: { role: 'train'|'test', label, tree, world, configSeed, configIndex, agentSeed, ticks, arm?, brainPath?, brainWorld?, exportPath?,
//           map: 'on'|'off', instrument: true|false, cond: 'P', traceDiag?: boolean (gate only) }
//   A training session is cold, floor-off and MAP-OFF (the experience it stores is gathered without the map).  A test session runs
//   COLD or FULL (the world's own training export, all 8 components) with the map on or off.  ONLY_Q / ONLY_episodes exist for the
//   development calibration only.  There is no floor setting: the floor line of the substrate is never armed (no __GATEFLOORB2__).
//
// A fork of experiments/gate-floor-spec/session.mjs (C' driver of record, frozen 68e553e).  Changes: the map switch (`__LEARN0__`), the
// FULL arm, the move-direction measurement, the removal of guard settings (the GFGUARD object is installed in DIAGNOSTIC mode only: mask off,
// execution guard off, legalMove records the arrival and returns true, so no candidate is masked and no move is blocked - the C' gate
// proves this mode is behaviour-neutral) and the oracle-call accounting.  OBSERVATIONAL only, like its parents:
//   * __M7_TEL__.step()   call index; the identity of window.lastReasoning at call start;
//   * EXEC site           every arrival (agentCurrent, reasoning.to) through the pinned EXEC line in diagnostic mode;
//   * __GFB2__            the goal-reset probe;
//   * __LEARN0__.blocks() counts every oracle entry (executed when the map is on, blocked when it is off).
// The TRUE graph distance used to classify moves is computed HERE, from connections.json, after the fact; the agent never sees it.
// Draws no random number; reads no clock.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { ARMS, TICKS, HELDOUT_FLOOR, CONFIG_START, seedOk, trainSeed, testSeed, canonicalJson, sha256 } from '../xfer1/config.mjs';
import { serializeBrain, maskBrain, componentHashes, componentSizes, brainHash } from '../xfer1/brain.mjs';
import { SCHEMA, TREE, GUARD_TREE, LEARN0_TREE, HEAD_COMMIT, HOOK_STATES, CONFIRMATORY_STATE, ORACLES, CONFIRMATORY_ARMS, DEVELOPMENT_ARMS } from './config.mjs';
import { summarizeDiag } from '../gate-floor-spec/diag.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`LEARN-0 session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');
if (process.env.H1R === 'on') refuse('H1R=on: this driver runs the audited HEAD runtime');
if (process.env.M7_RUN_WARMSTORE !== undefined) refuse('M7_RUN_WARMSTORE is set: every LEARN-0 session starts from a cold localStorage (the only store is the delivered one)');

// ---- argument guards (before anything is loaded) ----
const KEYS = ['role', 'label', 'tree', 'world', 'configSeed', 'configIndex', 'agentSeed', 'ticks', 'arm', 'brainPath', 'brainWorld', 'exportPath', 'map', 'instrument', 'cond', 'traceDiag'];
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const unknown = Object.keys(IN).filter(k => !KEYS.includes(k)); if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`); }
if (IN.cond !== CONFIRMATORY_STATE) refuse(`cond must be the confirmatory state ${CONFIRMATORY_STATE}, got ${IN.cond}`);
if (!['on', 'off'].includes(IN.map)) refuse(`map must be 'on' or 'off', got ${IN.map}`);
if (typeof IN.instrument !== 'boolean') refuse('instrument must be a boolean');
if (IN.map === 'off' && !IN.instrument) refuse('the map switch needs an instrumented run');
if (IN.traceDiag !== undefined && typeof IN.traceDiag !== 'boolean') refuse('traceDiag must be a boolean');
if (!['train', 'test'].includes(IN.role)) refuse(`unknown role ${IN.role}`);
if (IN.role === 'train' && IN.map !== 'off') refuse('a training session gathers its experience without the map');
if (!Number.isInteger(IN.world) || IN.world < 0) refuse('world must be a non-negative integer');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
if (IN.agentSeed !== (IN.role === 'train' ? trainSeed(IN.world) : testSeed(IN.world))) refuse(`agent seed is not the ${IN.role} seed of world ${IN.world}`);
if (IN.ticks !== TICKS[IN.role]) refuse(`ticks must be ${TICKS[IN.role]} for role ${IN.role}`);
if (IN.role === 'train') {
  if (IN.arm !== undefined || IN.brainPath !== undefined) refuse('a training session is cold and has no arm or brain');
} else {
  if (![...CONFIRMATORY_ARMS, ...DEVELOPMENT_ARMS].includes(IN.arm)) refuse(`arm ${IN.arm}: LEARN-0 delivers ${[...CONFIRMATORY_ARMS, ...DEVELOPMENT_ARMS].join('|')}`);
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
const isLearn0 = isGuard && !!treeManifest.learn0;
const mainSha = sha256(fs.readFileSync(path.join(IN.tree, 'main.js')));
const planningSha = sha256(fs.readFileSync(path.join(IN.tree, 'render', 'planning.js')));
if (!isDerived && !isBare) refuse('the tree is not an audited HEAD tree');
if (treeManifest.gatefloorhead.headCommit !== HEAD_COMMIT) refuse('the tree was not built from the audited commit');
const expectedMain = isLearn0 ? LEARN0_TREE.mainSha256 : isGuard ? GUARD_TREE.guardMainSha256 : isDerived ? TREE.derivedMainSha256 : TREE.headMainSha256;
if (mainSha !== expectedMain) refuse(`main.js of the tree (${mainSha.slice(0, 12)}) is not the pinned one`);
if (isLearn0 && planningSha !== LEARN0_TREE.planningSha256) refuse(`render/planning.js of the tree (${planningSha.slice(0, 12)}) is not the pinned LEARN-0 one`);
if (IN.instrument && !isLearn0) refuse('an instrumented LEARN-0 session needs the LEARN-0 tree');

// the world's edge oracle for MEASUREMENT ONLY (connections.json of the tree; the agent never reads these structures)
const edges = JSON.parse(fs.readFileSync(path.join(IN.tree, 'connections.json'), 'utf8'));
const ADJ = new Map();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); if (!ADJ.has(a)) ADJ.set(a, new Set()); if (!ADJ.has(b)) ADJ.set(b, new Set()); ADJ.get(a).add(b); ADJ.get(b).add(a); }
const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && !!ADJ.get(Number(a)) && ADJ.get(Number(a)).has(Number(b));

const T = (rel) => import(URLOF(IN.tree, rel));
const envmod = await T('experiments/m7/env.js');
const gen = envmod.generateAccepted(IN.configSeed, IN.configIndex);
if (gen.provenance.acceptedSeed !== IN.configSeed || gen.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) refuse('configSeed is not an accepted seed at this index');
const goalId = gen.cfg.goal;
const DIST = (() => { const d = new Map([[Number(goalId), 0]]); const q = [Number(goalId)]; while (q.length) { const u = q.shift(); for (const v of (ADJ.get(u) || [])) if (!d.has(v)) { d.set(v, d.get(u) + 1); q.push(v); } } return d; })();

// ---- observational scaffolding (absent when instrument === false) ----
let calls = 0, startState = null, lrAtStart;
const goalResets = [], resetsDiag = [], arrivals = [], draws = [], replayCalls = [];
const num = (v) => (v === null || v === undefined ? null : Number(v));
const oracle = { executed: Object.fromEntries(ORACLES.map(o => [o, 0])), blocked: Object.fromEntries(ORACLES.map(o => [o, 0])) };
if (IN.instrument) {
  const [qmod, mem, epm] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js')]);
  globalThis.__stores = () => ({ transitions: mem.transitions, rewards: mem.rewards, penalties: mem.penalties, signals: mem.signals, curiosity: mem.curiosityMap,
    Q: qmod.Q, confidence: mem.confidenceMap, episodes: epm.exportEpisodes() });
  globalThis.__M7_TEL__ = {
    step() { calls++; lrAtStart = globalThis.lastReasoning; if (calls === 1) { const b = serializeBrain(globalThis.__stores()); startState = { hashes: componentHashes(b), sizes: componentSizes(b), brainHash: brainHash(b) }; } },
    replayBranch() { replayCalls.push(calls - 1); },
  };
  globalThis.__GFB2__ = { goalReset(from, to, goal) {
    goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]);
    resetsDiag.push({ call: calls - 1, from: num(from), to: num(to), goal: num(goal) });
  } };
  // the pinned guard lines in DIAGNOSTIC mode only: nothing masked, nothing blocked; legalMove records each arrival
  { const counters = { admittedGraph: 0, admitted: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };
    const legalOf = (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b);
    globalThis.__GFGUARD__ = { get on() { return true; }, counters,
      legalMove(a, b) { const r = globalThis.lastReasoning; arrivals.push({ call: calls - 1, a: num(a), to: num(b), rFrom: r ? num(r.from) : null, rTo: r ? num(r.to) : null, fresh: r !== lrAtStart, legal: legalOf(a, b), blocked: false }); return true; },
      admit(from, k, graph, trained, human) { if (graph) { counters.admittedGraph++; return true; } if (trained && human) counters.nonGraphBoth++; else if (trained) counters.nonGraphTrained++; else if (human) counters.nonGraphHuman++; else return true; counters.admitted++; return true; } };
    globalThis.__GFGUARD_SNAP__ = () => ({ diag: true, mask: false, exec: false, counters: { ...counters } }); }
  // the map switch
  const NO_MAP = IN.map === 'off';
  globalThis.__LEARN0__ = { noMap: NO_MAP, blocks(name) { if (!(name in oracle.executed)) throw new Error(`unknown oracle ${name}`); if (NO_MAP) { oracle.blocked[name]++; return true; } oracle.executed[name]++; return false; } };
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
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: HK.arm, envMode: HK.envMode, creditMode: HK.creditMode, pin: HK.pin, tickUnit: 'step', ticks: IN.ticks, crashAtTick: null, warmStore: false });
const A = rec.artifacts || {};
const ec = A.envCounters || {};
const TR = await T('render/traversalRecord.js');
const traversal = (() => { let a = 0, s = 0, edgesObserved = 0, edgesWithSlip = 0, maxCost = 1; const seen = new Set();
  for (const e of edges) for (const [u, v] of [[Number(e.from), Number(e.to)], [Number(e.to), Number(e.from)]]) { const k = u + '|' + v; if (seen.has(k)) continue; seen.add(k);
    const r = TR.recordFor(u, v); if (r.a > 0) { edgesObserved++; a += r.a; s += r.s; if (r.s < r.a) edgesWithSlip++; maxCost = Math.max(maxCost, (r.a + 1) / (r.s + 1)); } }
  return { attempts: a, successes: s, edgesObserved, edgesWithSlip, maxCostEstimate: maxCost }; })();

if (!IN.instrument) {
  const [bq, bm, be] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js')]);
  const bareEnd = serializeBrain({ transitions: bm.transitions, rewards: bm.rewards, penalties: bm.penalties, signals: bm.signals, curiosity: bm.curiosityMap, Q: bq.Q, confidence: bm.confidenceMap, episodes: be.exportEpisodes() });
  process.stdout.write('\n@@RESULT@@' + JSON.stringify({ schema: `${SCHEMA}.session`, bare: true, role: IN.role, label: IN.label,
    outcome: { crashed: rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, loopsExecuted: rec.outcome.loopsExecuted },
    artifacts: A, traversal, cond: IN.cond, fingerprint: rec.fingerprint, endHash: brainHash(bareEnd), endHashes: componentHashes(bareEnd), tree: { name: path.basename(IN.tree), mainSha256: mainSha } }) + '@@END@@\n');
  process.exit(rec.outcome.crashed ? 1 : 0);
}

// ---- outcomes (instrumented) ----
const legalReaches = goalResets.filter(r => r[2] === 1), nonEdgeReaches = goalResets.filter(r => r[2] === 0);
const HALF = TICKS[IN.role] / 2;
const endBrain = serializeBrain(globalThis.__stores());
if (typeof IN.exportPath === 'string') fs.writeFileSync(IN.exportPath, JSON.stringify(endBrain));
const writes = (A.writes || []).filter(w => typeof w === 'string');
const moveClass = { legal: 0, nonGraph: 0, self: 0, none: (A.writes || []).filter(w => typeof w !== 'string').length };   // DECISIONS (lastReasoning writes)
for (const w of writes) { const m = /^(\d+)->(\d+)$/.exec(w); if (!m) continue; if (m[1] === m[2]) moveClass.self++; else if (isEdge(Number(m[1]), Number(m[2]))) moveClass.legal++; else moveClass.nonGraph++; }

// move direction (agent-blind): an EXECUTION is an arrival whose reasoning is not a self-decision and whose target differs from the position
// S3 uses the LEGAL far moves only (the chance rate is defined over the current node's graph neighbours); all far moves are kept descriptively
const moves = { far: 0, farDownhill: 0, farUphill: 0, farFlat: 0, farChance: 0, farIllegal: 0, farLegal: 0, farLegalDownhill: 0, farLegalChance: 0, adjacent: 0, adjacentEnter: 0, adjacentChance: 0, unknownDistance: 0 };
for (const x of arrivals) {
  if (x.a === null || x.to === null || x.a === x.to || x.rFrom === x.rTo) continue;
  const da = DIST.get(x.a), db = DIST.get(x.to);
  if (da === undefined || db === undefined) { moves.unknownDistance++; continue; }
  const nb = [...(ADJ.get(x.a) || [])];
  if (da >= 2) {
    const downRate = nb.length ? nb.filter(v => DIST.get(v) < da).length / nb.length : 0;
    moves.far++; if (!x.legal) moves.farIllegal++;
    if (db < da) moves.farDownhill++; else if (db > da) moves.farUphill++; else moves.farFlat++;
    moves.farChance += downRate;
    if (x.legal) { moves.farLegal++; if (db < da) moves.farLegalDownhill++; moves.farLegalChance += downRate; }
  } else if (da === 1) {
    moves.adjacent++; if (x.to === Number(goalId)) moves.adjacentEnter++;
    moves.adjacentChance += nb.length ? 1 / nb.length : 0;
  }
}
const diag = summarizeDiag({ arrivals, resets: resetsDiag, isEdge });
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
// oracle accounting: map off -> nothing executed and EVERY guard reached (each guard evidences itself); map on -> every oracle executed, none blocked
const exec = Object.values(oracle.executed).reduce((s, v) => s + v, 0);
const mapAudit = { setting: IN.map, ...oracle,
  ok: IN.map === 'off' ? (exec === 0 && ORACLES.every(o => oracle.blocked[o] > 0))
                       : (ORACLES.every(o => oracle.executed[o] > 0) && Object.values(oracle.blocked).every(v => v === 0)) };
const guardSnap = globalThis.__GFGUARD_SNAP__();
const out = {
  schema: `${SCHEMA}.session`, role: IN.role, label: IN.label, map: IN.map, bare: false,
  input: { world: IN.world, configSeed: IN.configSeed, configIndex: IN.configIndex, acceptedConfigSeed: gen.provenance.acceptedSeed, goal: goalId, agentSeed: IN.agentSeed, ticks: IN.ticks,
    arm: IN.arm === undefined ? null : IN.arm, keep: IN.role === 'test' ? ARMS[IN.arm].keep : null, brainFile: typeof IN.brainPath === 'string' ? path.basename(IN.brainPath) : null, brainWorld: IN.brainWorld === undefined ? null : IN.brainWorld },
  tree: { name: path.basename(IN.tree), headCommit: treeManifest.gatefloorhead.headCommit, learn0: isLearn0, mainSha256: mainSha, planningSha256: planningSha, manifestSha256: sha256(canonicalJson(treeManifest.files)) },
  outcome: { crashed: rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, loopsExecuted: rec.outcome.loopsExecuted,
    error: rec.outcome.error ? { message: String(rec.outcome.error.message).slice(0, 200), tickAtCrash: rec.outcome.error.tickAtCrash } : null },
  counters: { calls, envDraws: ec.envDraws, attempts: ec.attempts, successes: ec.successes, slips: ec.slips },
  reaches: { goal: goalResets.length, legal: legalReaches.length, nonEdge: nonEdgeReaches.length, legalHalves: [legalReaches.filter(r => r[0] < HALF).length, legalReaches.filter(r => r[0] >= HALF).length],
    goalCalls: goalResets.map(r => r[0]), legalCalls: legalReaches.map(r => r[0]) },
  endpoints: { goalReaches: goalResets.length, legalReaches: legalReaches.length, attemptSuccess: ec.attempts > 0 ? ec.successes / ec.attempts : null },
  brain: { deliveredHash: delivered === null ? 'none' : brainHash(delivered), deliveredHashes: delivered === null ? null : componentHashes(delivered), deliveredSizes: delivered === null ? null : componentSizes(delivered),
    start: startState, endHash: brainHash(endBrain), endHashes: componentHashes(endBrain), endSizes: componentSizes(endBrain), localStorageReads: reads,
    goalKeyedQ: [...(globalThis.__stores().Q.keys())].filter(k => String(k).includes('#' + goalId + '->')).length },
  conditionIntegrity, mapAudit, guard: guardSnap, moveClass, moves,
  diag: { arrivals: diag.arrivals, resets: diag.resets, channels: diag.channels, illegalExecuted: diag.illegalExecuted },
  audit: { goalReaches: goalResets.length, legalReaches: legalReaches.length, nonEdgeReaches: nonEdgeReaches.length, reachesEqualLegalPlusNonEdge: goalResets.length === legalReaches.length + nonEdgeReaches.length,
    drawsTotal: draws.length, arrivalsAtMostCalls: arrivals.length <= calls },
  diagnostics: { replayCalls: replayCalls.length, writes: writes.length },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: ec, qEntries: A.qEntries, qSum: A.qSum, attempts: A.attempts, successes: A.successes, slips: A.slips,
    creditKeys: (A.creditKeys || []).length, fingerprint: rec.fingerprint, writesSha256: sha256(JSON.stringify(A.writes || [])) },
  ...(IN.traceDiag ? { trace: { arrivals, resets: resetsDiag, writes: A.writes } } : {}),
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

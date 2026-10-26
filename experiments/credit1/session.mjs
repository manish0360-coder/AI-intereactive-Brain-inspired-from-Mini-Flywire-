// ==========================================================
// CREDIT-1 — one-session driver (one OS process per session)          *** NOT AUTHORIZED TO RUN: see lock.mjs ***
// ==========================================================
//   node session.mjs '<json>'
//   json: { role: 'train'|'test', label, tree, world, configSeed, configIndex, agentSeed, ticks, cell, brainPath?, brainWorld?, exportPath?,
//           map: 'on'|'off', instrument: true, cond: 'P', ledger: 'full'|'off', procedure? }
//   procedure (development calibration only; lock.mjs PROCEDURES): D2_ALIGNED_FALSE sets __CREDIT1__ = { aligned: false } on an L cell (D-2);
//   MAP_ON_PARITY runs N0L with the map on (D-1c coverage); D2_MAP_ON_PARITY does both.  The lock's scope check refuses any other use.
// A fork of experiments/learn0/session.mjs (frozen cc8a42d).  Changes (DESIGN r2 sections 4-6, blocker BC-2):
//   * the session lock is asserted before the input is read or any runtime module is loaded;
//   * cells instead of arms: the 9 cells of config.CELLS (the A+ module cells refuse while the module is unauthorized);
//   * credit modes: L (no global), A ({ aligned: true }), A+ ({ aligned: true, edgeFiltered: true }) on the CREDIT-1 tree of that arm;
//   * store delivery: none / own (brainWorld === world) / paired (brainWorld === pi(world), the two goal-swap cells only); masks FULL / NO_Q;
//   * instruments: __CREDIT1_TEL__ telemetry (credit begin/end, candidate evaluations, episode starts, goal redirects), I-CRED against the
//     execution probe, I-LEDGER (observational set/delete/clear wrappers on every exported keyed store, transitions' inner maps included,
//     each write attributed to its main.js caller line), per-episode records and the self-target counter;
//   * calibration: the session scope is checked against the lock before any runtime module is loaded; the parent's observational
//     fields (environment-draw log, traversal record, move counters, the full condition-integrity record, counters, endpoints, audit)
//     are recorded under the same names so D-1 compares like with like; per-session event-class counts (events.mjs).
// OBSERVATIONAL like its parent: draws no random number, reads no clock, changes no store.
// ==========================================================
import { assertSessionAuthorized, assertAPlusAuthorized, assertSessionScope, PROCEDURES } from './lock.mjs';
assertSessionAuthorized();

import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { TICKS, HELDOUT_FLOOR, CONFIG_START, seedOk, trainSeed, testSeed, canonicalJson, sha256 } from '../xfer1/config.mjs';
import { serializeBrain, componentHashes, componentSizes, brainHash } from '../xfer1/brain.mjs';
import { HEAD_COMMIT, HOOK_STATES, CONFIRMATORY_STATE, ORACLES } from '../learn0/config.mjs';
import { summarizeDiag } from '../gate-floor-spec/diag.mjs';
import { SCHEMA, MODES, CREDIT1_TREE, LEARN0_TREE } from './config.mjs';
import { cellOf, deliveryFor, maskStore } from './delivery.mjs';
import { createTelemetry, checkCredit, createLedger, evaluateLedger, parseCaller, captureStack } from './instruments.mjs';
import { lineRolesOf, classifyEvents } from './events.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`CREDIT-1 session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');
if (process.env.H1R === 'on') refuse('H1R=on: this driver runs the audited HEAD runtime');
if (process.env.M7_RUN_WARMSTORE !== undefined) refuse('M7_RUN_WARMSTORE is set: every session starts from a cold localStorage');

// ---- argument guards (before anything is loaded) ----
const KEYS = ['role', 'label', 'tree', 'world', 'configSeed', 'configIndex', 'agentSeed', 'ticks', 'cell', 'brainPath', 'brainWorld', 'exportPath', 'map', 'instrument', 'cond', 'ledger', 'procedure'];
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const unknown = Object.keys(IN).filter(k => !KEYS.includes(k)); if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`); }
assertSessionScope({ world: IN.world, cell: IN.cell, procedure: IN.procedure });
const PROC = IN.procedure === undefined ? null : PROCEDURES[IN.procedure];
if (IN.cond !== CONFIRMATORY_STATE) refuse(`cond must be ${CONFIRMATORY_STATE}`);
if (IN.instrument !== true) refuse('every CREDIT-1 session is instrumented');
if (!['full', 'off'].includes(IN.ledger)) refuse(`ledger must be 'full' or 'off'`);
const CELL = cellOf(IN.cell);
if (CELL.credit === 'A+') assertAPlusAuthorized();
if (IN.role !== CELL.role) refuse(`cell ${CELL.name} is a ${CELL.role} cell`);
const MAP = PROC && PROC.mapOn ? 'on' : CELL.map;
if (IN.map !== MAP) refuse(`cell ${CELL.name}${PROC ? ` (procedure ${IN.procedure})` : ''} runs with the map ${MAP}`);
if (!Number.isInteger(IN.world) || IN.world < 0) refuse('world must be a non-negative integer');
if (IN.configIndex !== IN.world) refuse('configIndex must equal the world index');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
if (IN.agentSeed !== (IN.role === 'train' ? trainSeed(IN.world) : testSeed(IN.world))) refuse(`agent seed is not the ${IN.role} seed of world ${IN.world}`);
if (IN.ticks !== TICKS[IN.role]) refuse(`ticks must be ${TICKS[IN.role]} for role ${IN.role}`);
const DELIVERY = deliveryFor(CELL.name, IN.world);
if (DELIVERY.source === 'none') { if (IN.brainPath !== undefined || IN.brainWorld !== undefined) refuse('a cold cell carries no store'); }
else {
  if (typeof IN.brainPath !== 'string') refuse(`cell ${CELL.name} needs a store file`);
  if (IN.brainWorld !== DELIVERY.brainWorld) refuse(`cell ${CELL.name} must receive the store of world ${DELIVERY.brainWorld} (${DELIVERY.source})`);
}
if (IN.role === 'train' && typeof IN.exportPath !== 'string') refuse('a training session exports its store');
if (IN.configSeed < CONFIG_START || IN.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is outside the territory or is held-out/consumed');

// ---- the tree: the CREDIT-1 tree of the cell's arm (L and A cells run on tree A) ----
const TREE_ARM = CELL.credit === 'A+' ? 'A+' : 'A';
if (typeof IN.tree !== 'string' || !fs.existsSync(path.join(IN.tree, 'MANIFEST.json'))) refuse('tree must be a prepared tree directory');
const treeManifest = JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8'));
const TREE_MAIN = path.join(IN.tree, 'main.js');
const mainSha = sha256(fs.readFileSync(TREE_MAIN));
if (!treeManifest.credit1 || treeManifest.credit1.arm !== TREE_ARM) refuse(`the tree is not the CREDIT-1 tree of arm ${TREE_ARM}`);
if (treeManifest.credit1.baseLearn0MainSha256 !== LEARN0_TREE.mainSha256) refuse('the tree is not built on the pinned LEARN-0 tree');
if (mainSha !== CREDIT1_TREE[TREE_ARM].mainSha256 || mainSha !== treeManifest.credit1.mainSha256) refuse(`main.js of the tree (${mainSha.slice(0, 12)}) is not the pinned CREDIT-1 ${TREE_ARM} tree`);
if (treeManifest.gatefloorhead.headCommit !== HEAD_COMMIT) refuse('the tree was not built from the audited commit');
const SITE = treeManifest.credit1.siteClasses;
const siteClassOf = (line) => SITE[String(line)] || null;
const ROLES = lineRolesOf(fs.readFileSync(TREE_MAIN, 'utf8'));
if (ROLES.problems.length) refuse(`event-class line roles: ${ROLES.problems[0]}`);

// the world's edge oracle for MEASUREMENT ONLY (the agent never reads these structures)
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

// ---- the credit switch ----
if (PROC && PROC.alignedFalse) globalThis.__CREDIT1__ = { aligned: false };     // D-2 (L cells only; lock scope)
else if (MODES[CELL.credit] === null) delete globalThis.__CREDIT1__;
else globalThis.__CREDIT1__ = { ...MODES[CELL.credit] };

// ---- observational scaffolding ----
let calls = 0, startState = null, lrAtStart;
const goalResets = [], resetsDiag = [], arrivals = [], draws = [], replayCalls = [];
const num = (v) => (v === null || v === undefined ? null : Number(v));
const oracle = { executed: Object.fromEntries(ORACLES.map(o => [o, 0])), blocked: Object.fromEntries(ORACLES.map(o => [o, 0])) };
const [qmod, mem, epm, trust] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js'), T('render/trustMemory.js')]);
globalThis.__stores = () => ({ transitions: mem.transitions, rewards: mem.rewards, penalties: mem.penalties, signals: mem.signals, curiosity: mem.curiosityMap,
  Q: qmod.Q, confidence: mem.confidenceMap, episodes: epm.exportEpisodes() });
const telemetry = createTelemetry({ callIndex: () => calls - 1 });
globalThis.__CREDIT1_TEL__ = telemetry;
const ledger = IN.ledger === 'full' ? createLedger({ callIndex: () => calls - 1, caller: () => parseCaller(captureStack(), TREE_MAIN),
  pathOf: () => (Array.isArray(globalThis.recentMemory) ? globalThis.recentMemory : []) }) : null;
if (ledger) {
  ledger.wrapMap('Q', qmod.Q);
  for (const [name, m] of [['rewards', mem.rewards], ['penalties', mem.penalties], ['signals', mem.signals], ['curiosity', mem.curiosityMap], ['confidence', mem.confidenceMap]]) ledger.wrapMap(name, m);
  ledger.wrapMap('transitions', mem.transitions, { nested: true });
  ledger.wrapMap('pathAttempts', trust.pathAttempts);
  ledger.wrapMap('pathSuccesses', trust.pathSuccesses);
}
globalThis.__M7_TEL__ = {
  step() { calls++; lrAtStart = globalThis.lastReasoning; if (calls === 1) { const b = serializeBrain(globalThis.__stores()); startState = { hashes: componentHashes(b), sizes: componentSizes(b), brainHash: brainHash(b) }; } },
  replayBranch() { replayCalls.push(calls - 1); },
};
globalThis.__GFB2__ = { goalReset(from, to, goal) {
  goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]);
  resetsDiag.push({ call: calls - 1, from: num(from), to: num(to), goal: num(goal) });
} };
{ const counters = { admittedGraph: 0, admitted: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };
  const legalOf = (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b);
  globalThis.__GFGUARD__ = { get on() { return true; }, counters,
    legalMove(a, b) { const r = globalThis.lastReasoning; arrivals.push({ call: calls - 1, a: num(a), to: num(b), rFrom: r ? num(r.from) : null, rTo: r ? num(r.to) : null, fresh: r !== lrAtStart, legal: legalOf(a, b), blocked: false }); return true; },
    admit(from, k, graph, trained, human) { if (graph) { counters.admittedGraph++; return true; } if (trained && human) counters.nonGraphBoth++; else if (trained) counters.nonGraphTrained++; else if (human) counters.nonGraphHuman++; else return true; counters.admitted++; return true; } };
  globalThis.__GFGUARD_SNAP__ = () => ({ diag: true, mask: false, exec: false, counters: { ...counters } }); }
const NO_MAP = IN.map === 'off';
globalThis.__LEARN0__ = { noMap: NO_MAP, blocks(name) { if (!(name in oracle.executed)) throw new Error(`unknown oracle ${name}`); if (NO_MAP) { oracle.blocked[name]++; return true; } oracle.executed[name]++; return false; } };
{ let _env;   // the parent's environment-draw log (observational; state P installs no environment)
  Object.defineProperty(globalThis, '__M7_ENV__', { configurable: true, enumerable: true, get() { return _env; },
    set(v) { _env = v && typeof v.attempt === 'function' ? { ...v, attempt(from, to) { const ok = v.attempt(from, to); draws.push([calls - 1, Number(from), Number(to), ok ? 1 : 0]); return ok; } } : v; } }); }

// ---- the store this session starts with ----
let delivered = null, deliveredJson = null;
if (DELIVERY.source !== 'none') {
  const full = JSON.parse(fs.readFileSync(IN.brainPath, 'utf8'));
  delivered = maskStore(full, DELIVERY.mask);
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

// ---- outcomes ----
const legalReaches = goalResets.filter(r => r[2] === 1), nonEdgeReaches = goalResets.filter(r => r[2] === 0);
const HALF = TICKS[IN.role] / 2;
const endBrain = serializeBrain(globalThis.__stores());
if (typeof IN.exportPath === 'string') fs.writeFileSync(IN.exportPath, JSON.stringify(endBrain));
// the parent's move accounting (DECISIONS from the lastReasoning writes; agent-blind move direction against the true graph distance)
const writes = (A.writes || []).filter(w => typeof w === 'string');
const moveClass = { legal: 0, nonGraph: 0, self: 0, none: (A.writes || []).filter(w => typeof w !== 'string').length };
for (const w of writes) { const m = /^(\d+)->(\d+)$/.exec(w); if (!m) continue; if (m[1] === m[2]) moveClass.self++; else if (isEdge(Number(m[1]), Number(m[2]))) moveClass.legal++; else moveClass.nonGraph++; }
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
const exec = Object.values(oracle.executed).reduce((s, v) => s + v, 0);
const mapAudit = { setting: IN.map, ...oracle, ok: IN.map === 'off' ? (exec === 0 && ORACLES.every(o => oracle.blocked[o] > 0)) : (ORACLES.every(o => oracle.executed[o] > 0) && Object.values(oracle.blocked).every(v => v === 0)) };

// I-CRED and I-LEDGER (DESIGN r2 section 5); any FAIL voids the block (instruments.blockIntegrity, applied by the analysis)
const icred = checkCredit({ creditEvents: telemetry.credit, arrivals, resets: resetsDiag, arm: CELL.credit });
const ledgerEval = ledger ? evaluateLedger({ events: ledger.events, creditEvents: telemetry.credit, siteClassOf, arm: CELL.credit, isEdge }) : null;
// per-episode records: starts (initial / goal / cap) from the telemetry; a goal start closes the previous episode with the goal-reset probe of that call
const starts = telemetry.episodes.slice().sort((a, b) => a.call - b.call);
const episodes = starts.map((s, i) => {
  const nx = starts[i + 1];
  if (!nx) return { start: s.call, node: s.node, kind: s.kind, outcome: 'open', calls: null };
  let outcome = nx.kind;
  if (nx.kind === 'goal') { const r = resetsDiag.find(x => x.call === nx.call); outcome = r ? (isEdge(r.from, r.to) && r.to === r.goal ? 'legal' : 'nonGraph') : 'goal_unprobed'; }
  return { start: s.call, node: s.node, kind: s.kind, outcome, calls: nx.call - s.call };
});
const episodeSummary = episodes.reduce((m, e) => ((m[e.outcome] = (m[e.outcome] || 0) + 1), m), {});
const eventClasses = classifyEvents({ creditEvents: telemetry.credit, arrivals, resets: resetsDiag, ledgerEvents: ledger ? ledger.events : null, roles: ROLES.roles, isEdge });

const out = {
  schema: `${SCHEMA}.session`, role: IN.role, label: IN.label, cell: CELL.name, credit: CELL.credit, map: IN.map, procedure: IN.procedure === undefined ? null : IN.procedure,
  input: { world: IN.world, configSeed: IN.configSeed, configIndex: IN.configIndex, goal: goalId, agentSeed: IN.agentSeed, ticks: IN.ticks,
    delivery: { source: DELIVERY.source, brainWorld: DELIVERY.brainWorld, training: DELIVERY.training, mask: DELIVERY.mask || null, brainFile: typeof IN.brainPath === 'string' ? path.basename(IN.brainPath) : null } },
  tree: { name: path.basename(IN.tree), arm: TREE_ARM, mainSha256: mainSha, manifestSha256: sha256(canonicalJson(treeManifest.files)) },
  outcome: { crashed: rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, loopsExecuted: rec.outcome.loopsExecuted,
    error: rec.outcome.error ? { message: String(rec.outcome.error.message).slice(0, 200), tickAtCrash: rec.outcome.error.tickAtCrash } : null },
  counters: { calls, envDraws: ec.envDraws, attempts: ec.attempts, successes: ec.successes, slips: ec.slips },
  reaches: { goal: goalResets.length, legal: legalReaches.length, nonEdge: nonEdgeReaches.length, legalHalves: [legalReaches.filter(r => r[0] < HALF).length, legalReaches.filter(r => r[0] >= HALF).length],
    goalCalls: goalResets.map(r => r[0]), legalCalls: legalReaches.map(r => r[0]) },
  endpoints: { goalReaches: goalResets.length, legalReaches: legalReaches.length, attemptSuccess: ec.attempts > 0 ? ec.successes / ec.attempts : null },
  brain: { deliveredHash: delivered === null ? 'none' : brainHash(delivered), deliveredHashes: delivered === null ? null : componentHashes(delivered), deliveredSizes: delivered === null ? null : componentSizes(delivered),
    start: startState, endHash: brainHash(endBrain), endHashes: componentHashes(endBrain), endSizes: componentSizes(endBrain), localStorageReads: reads,
    goalKeyedQ: [...(globalThis.__stores().Q.keys())].filter(k => String(k).includes('#' + goalId + '->')).length },
  conditionIntegrity, mapAudit, guard: globalThis.__GFGUARD_SNAP__(), moveClass, moves,
  diag: { arrivals: diag.arrivals, resets: diag.resets, channels: diag.channels, illegalExecuted: diag.illegalExecuted },
  audit: { goalReaches: goalResets.length, legalReaches: legalReaches.length, nonEdgeReaches: nonEdgeReaches.length, reachesEqualLegalPlusNonEdge: goalResets.length === legalReaches.length + nonEdgeReaches.length,
    drawsTotal: draws.length, arrivalsAtMostCalls: arrivals.length <= calls },
  diagnostics: { replayCalls: replayCalls.length, writes: writes.length },
  credit1: {
    eventClasses,
    telemetry: telemetry.summary(),
    icred: { verdict: icred.verdict, events: icred.events, identityRate: icred.identityRate, informative: icred.informative, fresh: icred.fresh, carried: icred.carried, rFromMismatch: icred.rFromMismatch, crossChecked: icred.crossChecked, failures: icred.failures.slice(0, 20) },
    ledger: ledgerEval ? { verdict: ledgerEval.verdict, writes: ledgerEval.writes, byClass: ledgerEval.byClass, keyClass: ledgerEval.keyClass, held: ledgerEval.held, informativeExec: ledgerEval.informativeExec, legacyNonEdge: ledgerEval.legacyNonEdge, failures: ledgerEval.failures.slice(0, 20), failureCount: ledgerEval.failures.length } : { verdict: 'OFF' },
    episodes: { count: episodes.length, byOutcome: episodeSummary, meanCalls: (() => { const c = episodes.filter(e => e.calls !== null); return c.length ? c.reduce((s, e) => s + e.calls, 0) / c.length : null; })() },
    redirects: telemetry.summary().redirects,
    selfCandidates: telemetry.summary().candidates,
  },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: ec, qEntries: A.qEntries, qSum: A.qSum, attempts: A.attempts, successes: A.successes, slips: A.slips,
    creditKeys: (A.creditKeys || []).length, fingerprint: rec.fingerprint, writesSha256: sha256(JSON.stringify(A.writes || [])) },
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

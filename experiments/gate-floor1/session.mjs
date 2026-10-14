// ==========================================================
// GATE-FLOOR-1 — one-session driver (one OS process per session)
// ==========================================================
//   node session.mjs '<json>'
//   json: { role: 'train'|'test', label, tree, world, configSeed, configIndex, agentSeed, ticks, arm?, brainPath?, brainWorld?,
//           exportPath?, floor }      floor: 'off' | 'on' | 'armedOff'
//
// A fork of experiments/xfer1/session.mjs (same guards, same brain delivery through loadBrain()'s single read, same
// outcomes and the same record shape) with three additions, nothing else:
//   * `floor`: 'off'      the global __GATEFLOOR1__ is NOT installed (the production-off state: the guarded line is a
//                         single read of an undefined global);
//                'armedOff' the global is installed with on=false (the line's guard must still hold it inert);
//                'on'       the global is installed with on=true and tc floor TC_FLOOR.
//   * `floor` records: the floor's own counters and per-edge table (what it evaluated and what it raised);
//   * `audit`: the no-shortcut audit computed from the measurement sink (every environment draw is a graph edge, every
//     goal reach follows a successful goal-entering draw) and the runtime's own illegal-move counter.
//   * `finalHop`: the descriptive final-hop retry diagnostic (finalhop.mjs): the sink's draw records on legal edges into the
//     active goal, as events and as counts (observational, computed after the run).
// The tree must be the derived floor tree for 'on' / 'armedOff'; 'off' also accepts the plain conformed tree (the
// equivalence gate compares them).  Draws no random number.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { ARMS, COMPONENTS, TICKS, EARLY_WINDOW, HELDOUT_FLOOR, CONFIG_START, seedOk, trainSeed, testSeed, canonicalJson, sha256 } from '../xfer1/config.mjs';
import { serializeBrain, maskBrain, componentHashes, componentSizes, brainHash } from '../xfer1/brain.mjs';
import { SCHEMA, TC_FLOOR, TREE } from './config.mjs';
import { createFloor } from './floor_runtime.mjs';
import { finalHopFromAttempts } from './finalhop.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`GATE-FLOOR-1 session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');

// ---- argument guards (before anything is loaded) ----
const KEYS = ['role', 'label', 'tree', 'world', 'configSeed', 'configIndex', 'agentSeed', 'ticks', 'arm', 'brainPath', 'brainWorld', 'exportPath', 'floor'];
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const unknown = Object.keys(IN).filter(k => !KEYS.includes(k)); if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`); }
if (!['off', 'on', 'armedOff'].includes(IN.floor)) refuse(`floor must be 'off', 'on' or 'armedOff', got ${IN.floor}`);
if (!['train', 'test'].includes(IN.role)) refuse(`unknown role ${IN.role}`);
if (IN.role === 'train' && IN.floor !== 'off') refuse('a training session never runs the floor (the real store is the cold runtime\'s own experience)');
if (!Number.isInteger(IN.world) || IN.world < 0) refuse('world must be a non-negative integer');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
if (IN.agentSeed !== (IN.role === 'train' ? trainSeed(IN.world) : testSeed(IN.world))) refuse(`agent seed is not the ${IN.role} seed of world ${IN.world}`);
if (IN.ticks !== TICKS[IN.role]) refuse(`ticks must be ${TICKS[IN.role]} for role ${IN.role}`);
if (IN.role === 'train') {
  if (IN.arm !== undefined || IN.brainPath !== undefined) refuse('a training session is cold and has no arm or brain');
} else {
  if (!ARMS[IN.arm]) refuse(`unknown arm ${IN.arm}`);
  if (IN.arm !== 'COLD' && IN.arm !== 'ONLY_episodes') refuse(`arm ${IN.arm}: GATE-FLOOR-1 delivers episodes only (COLD or ONLY_episodes)`);
  const needsBrain = ARMS[IN.arm].source !== 'none';
  if (needsBrain !== (typeof IN.brainPath === 'string')) refuse(`arm ${IN.arm} ${needsBrain ? 'needs' : 'must not have'} a brain file`);
  if (needsBrain) { if (IN.brainWorld !== IN.world) refuse('the delivered store must be this world\'s own (brainWorld === world)'); }
  else if (IN.brainWorld !== undefined) refuse('a cold arm carries no brainWorld');
}
if (IN.configSeed < CONFIG_START || IN.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is outside the territory or is held-out/consumed');
if (typeof IN.tree !== 'string' || !fs.existsSync(path.join(IN.tree, 'MANIFEST.json'))) refuse('tree must be a prepared tree directory');
const treeManifest = JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8'));
const isFloorTree = !!treeManifest.gatefloor1;
if (IN.floor !== 'off' && !isFloorTree) refuse('floor on/armedOff needs the derived floor tree');
{
  const mainSha = sha256(fs.readFileSync(path.join(IN.tree, 'main.js')));
  const expect = isFloorTree ? TREE.floorMainSha256 : TREE.parentMainSha256;
  if (mainSha !== expect) refuse(`main.js of the tree (${mainSha.slice(0, 12)}) is not the pinned ${isFloorTree ? 'floor' : 'conformed'} main.js (${expect.slice(0, 12)})`);
}

const { installH1R } = await import(URLOF(REPO, 'experiments/h1r/runtime.mjs'));
const { installMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure_install.mjs'));
const { createMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure.mjs'));
const H = await installH1R({ tree: IN.tree, trustMode: 'traversal', envPosition: null });      // M7 §5.1 XOR environment stream
let FLOOR = null;
if (IN.floor !== 'off') { FLOOR = createFloor({ on: IN.floor === 'on', tcFloor: TC_FLOOR, isEdge: H.isEdge }); globalThis.__GATEFLOOR1__ = FLOOR; }
const T = (rel) => import(URLOF(IN.tree, rel));
const [qmod, mem, epm, envmod] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js'), T('experiments/m7/env.js')]);

// the accepted configuration must reproduce the stream element exactly and sit outside held-out/consumed territory
const gen = envmod.generateAccepted(IN.configSeed, IN.configIndex);
if (gen.provenance.acceptedSeed !== IN.configSeed || gen.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) refuse('configSeed is not an accepted seed at this index');
if (typedConfig.isHeldOut(typedConfigSeed(gen.provenance.acceptedSeed)) || typedConfig.isConsumed(typedConfigSeed(gen.provenance.acceptedSeed))) refuse('accepted configuration is held-out or consumed territory');

const stores = () => ({ transitions: mem.transitions, rewards: mem.rewards, penalties: mem.penalties, signals: mem.signals, curiosity: mem.curiosityMap,
  Q: qmod.Q, confidence: mem.confidenceMap, episodes: epm.exportEpisodes() });

// ---- the brain this session starts with ----
let delivered = null, deliveredJson = null;
if (IN.role === 'test' && ARMS[IN.arm].source !== 'none') {
  const full = JSON.parse(fs.readFileSync(IN.brainPath, 'utf8'));
  delivered = maskBrain(full, ARMS[IN.arm].keep);
  deliveredJson = JSON.stringify(delivered);
}

// ---- sink wrapper: observes only (one read of the stores at the first agent call) ----
let startState = null;
const create = () => {
  const base = createMeasure();
  return Object.freeze({ ...base, step() {
    base.step();
    if (base.count() === 1) { const b = serializeBrain(stores()); startState = { hashes: componentHashes(b), sizes: componentSizes(b), brainHash: brainHash(b) }; }
  } });
};
const M = installMeasure(globalThis, create);
await H.attachMeasure(M);

// one-shot brain delivery through loadBrain()'s single read
const reads = []; let served = false, current;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, enumerable: true, get() { return current; },
  set(v) { current = { getItem: (k) => { if (k === 'brain' && deliveredJson !== null && !served) { served = true; reads.push('brain: served'); return deliveredJson; } reads.push(`${k}: passthrough`); return v.getItem(k); },
    setItem: (k, x) => v.setItem(k, x), removeItem: (k) => v.removeItem(k), clear: () => v.clear() }; } });

process.chdir(path.join(IN.tree, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(IN.tree, 'experiments/m7/run.js'));
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks, crashAtTick: null, warmStore: false });

// ---- outcomes ----
const m = M.record();
const A = rec.artifacts || {};
const ec = A.envCounters || {};
const goalCalls = m.resets.filter(r => r[1] === 'goal').map(r => r[0]);
const capCalls = m.resets.filter(r => r[1] === 'cap').map(r => r[0]);
const window500 = (arr) => { const w = []; for (const c of arr) { const k = Math.floor(c / EARLY_WINDOW); w[k] = (w[k] || 0) + 1; } return Array.from(w, v => v || 0); };
const endBrain = serializeBrain(stores());
if (typeof IN.exportPath === 'string') fs.writeFileSync(IN.exportPath, JSON.stringify(endBrain));
const writes = (A.writes || []).filter(w => typeof w === 'string');
const moveCount = {};
for (const w of writes) moveCount[w] = (moveCount[w] || 0) + 1;
const topMoves = Object.entries(moveCount).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 6);
let reversals = 0, maxRun = 0, run = 0;
for (let i = 1; i < writes.length; i++) {
  const [a, b] = writes[i - 1].split('->'), [c, d] = writes[i].split('->');
  if (a === d && b === c && a !== b) { reversals++; run++; if (run > maxRun) maxRun = run; } else run = 0;
}
const diagnostics = {
  replayCalls: m.replays.length, noDecisionCalls: H.r1stats.noDecision, writes: writes.length, distinctMoves: Object.keys(moveCount).length, topMoves,
  reversalShare: writes.length > 1 ? reversals / (writes.length - 1) : null, longestReversalRun: maxRun,
};

// ---- no-shortcut audit (observational; computed from the sink and the runtime's own counters) ----
// attempts: [call, from, to, ok, goalEntering, a, s]
const goalId = gen.cfg.goal;
const att = m.attempts;
let nonEdge = 0, goalEnteringAttempts = 0, goalEnteringSuccesses = 0, goalFlagMismatch = 0, selfDraws = 0;
for (const [, from, to, ok, ge] of att) {
  if (Number(from) === Number(to)) { selfDraws++; continue; }
  if (!H.isEdge(from, to)) nonEdge++;
  const entering = Number(to) === Number(goalId);
  if (entering !== (ge === 1)) goalFlagMismatch++;
  if (entering) { goalEnteringAttempts++; if (ok === 1) goalEnteringSuccesses++; }
}
const audit = {
  attempts: att.length, nonEdgeAttempts: nonEdge, selfDraws, goalEnteringAttempts, goalEnteringSuccesses, goalReaches: goalCalls.length,
  goalReachesEqualEnteringSuccesses: goalEnteringSuccesses === goalCalls.length, goalFlagMismatch, blockedIllegal: H.counters.blockedIllegal,
};

const out = {
  schema: `${SCHEMA}.session`, role: IN.role, label: IN.label, floorMode: IN.floor,
  input: { world: IN.world, configSeed: IN.configSeed, configIndex: IN.configIndex, acceptedConfigSeed: gen.provenance.acceptedSeed, goal: gen.cfg.goal, agentSeed: IN.agentSeed, ticks: IN.ticks,
    arm: IN.arm === undefined ? null : IN.arm, keep: IN.role === 'test' ? ARMS[IN.arm].keep : null, brainFile: typeof IN.brainPath === 'string' ? path.basename(IN.brainPath) : null, brainWorld: IN.brainWorld === undefined ? null : IN.brainWorld },
  tree: { name: path.basename(IN.tree), manifestSha256: sha256(canonicalJson(treeManifest.files)), b2Commit: treeManifest.b2Commit, transformSha256: treeManifest.transformSha256,
    floorTree: isFloorTree, mainSha256: sha256(fs.readFileSync(path.join(IN.tree, 'main.js'))), gatefloor1TransformSha256: isFloorTree ? treeManifest.gatefloor1.transformSha256 : null },
  outcome: { crashed: rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, loopsExecuted: rec.outcome.loopsExecuted,
    error: rec.outcome.error ? { message: String(rec.outcome.error.message).slice(0, 200), tickAtCrash: rec.outcome.error.tickAtCrash } : null },
  counters: { calls: m.calls, envDraws: ec.envDraws, attempts: ec.attempts, successes: ec.successes, slips: ec.slips },
  reaches: { goal: goalCalls.length, cap: capCalls.length, goalCalls, capCalls, goalByWindow: window500(goalCalls) },
  endpoints: {
    goalReaches: goalCalls.length,
    attemptSuccess: ec.attempts > 0 ? ec.successes / ec.attempts : null,
    slipsPerCall: m.calls > 0 ? ec.slips / m.calls : null,
    earlyReaches: goalCalls.filter(c => c < EARLY_WINDOW).length,
  },
  brain: {
    deliveredHash: delivered === null ? 'none' : brainHash(delivered), deliveredHashes: delivered === null ? null : componentHashes(delivered), deliveredSizes: delivered === null ? null : componentSizes(delivered),
    start: startState, endHash: brainHash(endBrain), endHashes: componentHashes(endBrain), endSizes: componentSizes(endBrain), localStorageReads: reads,
  },
  floor: FLOOR === null ? null : FLOOR.snapshot(),
  audit,
  finalHop: finalHopFromAttempts(att, goalId, H.isEdge),      // descriptive diagnostic: attempts on legal edges into the active goal, from the sink's draw records
  diagnostics,
  h1r: { on: H.on === true, blockedIllegal: H.counters.blockedIllegal, drawFaults: H.instrument.drawFaults, envDrawsSeen: H.instrument.envDrawsSeen, edgeAttempts: H.r1stats.edgeAttempts, noDecision: H.r1stats.noDecision, slips: H.r1stats.slips, realised: H.r1stats.realised },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: ec, qEntries: A.qEntries, qSum: A.qSum, fingerprint: rec.fingerprint },
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

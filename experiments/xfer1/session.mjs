// ==========================================================
// XFER-1 — one-session driver (one OS process per session)
// ==========================================================
//   node session.mjs '<json>'
//   json: { role: 'train'|'test', label, tree, world, configSeed, configIndex, agentSeed, ticks,
//           arm?: <ARMS key, test only>, brainPath?: <file>, brainWorld?: <world that produced the file>,
//           exportPath?: <file> }
//
//   train : cold start, runs `ticks` runAgent() calls in the world, then writes the persisted brain (exportPath).
//   test  : a new process in the SAME world with a NEW agent seed.  The arm's brain (a component-masked copy of a
//           training brain) is delivered through the product's own loadBrain() single read; the harness then runs
//           `ticks` calls and records the outcomes.
//
// The agent, the runtime, the transform and the measurement sink are not modified.  The sink wrapper only observes
// (one read of the stores at the first agent call).  The brain is delivered by a one-shot read hook on localStorage,
// so the harness's later cold-store assertion still sees the real, empty store.  Draws no random number.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { SCHEMA, ARMS, COMPONENTS, TICKS, EARLY_WINDOW, HELDOUT_FLOOR, CONFIG_START, seedOk, trainSeed, testSeed, canonicalJson, sha256 } from './config.mjs';
import { serializeBrain, maskBrain, componentHashes, componentSizes, brainHash } from './brain.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`XFER-1 session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');

// ---- argument guards (before anything is loaded) ----
const KEYS = ['role', 'label', 'tree', 'world', 'configSeed', 'configIndex', 'agentSeed', 'ticks', 'arm', 'brainPath', 'brainWorld', 'exportPath'];
if (IN === null || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const unknown = Object.keys(IN).filter(k => !KEYS.includes(k)); if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`); }
if (!['train', 'test'].includes(IN.role)) refuse(`unknown role ${IN.role}`);
if (!Number.isInteger(IN.world) || IN.world < 0) refuse('world must be a non-negative integer');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
// train and test seeds of a world are fixed functions of the world: a test session can never reuse the train stream
if (IN.agentSeed !== (IN.role === 'train' ? trainSeed(IN.world) : testSeed(IN.world))) refuse(`agent seed is not the ${IN.role} seed of world ${IN.world}`);
if (IN.ticks !== TICKS[IN.role]) refuse(`ticks must be ${TICKS[IN.role]} for role ${IN.role}`);
if (IN.role === 'train') {
  if (IN.arm !== undefined || IN.brainPath !== undefined) refuse('a training session is cold and has no arm or brain');
} else {
  if (!ARMS[IN.arm]) refuse(`unknown arm ${IN.arm}`);
  const needsBrain = ARMS[IN.arm].source !== 'none';
  if (needsBrain !== (typeof IN.brainPath === 'string')) refuse(`arm ${IN.arm} ${needsBrain ? 'needs' : 'must not have'} a brain file`);
  if (needsBrain) {
    // provenance of the delivered brain: a world's own brain, or another world's (the donor) - never the wrong one
    if (!Number.isInteger(IN.brainWorld)) refuse('brainWorld is required with a brain file');
    if (ARMS[IN.arm].source === 'own' && IN.brainWorld !== IN.world) refuse(`arm ${IN.arm} needs the own-world brain`);
    if (ARMS[IN.arm].source === 'donor' && IN.brainWorld === IN.world) refuse(`arm ${IN.arm} needs a donor-world brain, not the own one`);
  } else if (IN.brainWorld !== undefined) refuse('a cold arm carries no brainWorld');
}
if (IN.configSeed < CONFIG_START || IN.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is outside the XFER-1 territory or is held-out/consumed');
if (typeof IN.tree !== 'string' || !fs.existsSync(path.join(IN.tree, 'MANIFEST.json'))) refuse('tree must be a prepared conformed tree directory');

const { installH1R } = await import(URLOF(REPO, 'experiments/h1r/runtime.mjs'));
const { installMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure_install.mjs'));
const { createMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure.mjs'));
const H = await installH1R({ tree: IN.tree, trustMode: 'traversal', envPosition: null });      // M7 §5.1 XOR environment stream
const T = (rel) => import(URLOF(IN.tree, rel));
const [qmod, mem, epm, envmod] = await Promise.all([T('render/qlearning.js'), T('render/memory.js'), T('render/episodeManager.js'), T('experiments/m7/env.js')]);
const treeManifest = JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8'));

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
// diagnostics (observational): where the calls went, and how concentrated the executed moves were
const writes = (A.writes || []).filter(w => typeof w === 'string');
const moveCount = {};
for (const w of writes) moveCount[w] = (moveCount[w] || 0) + 1;
const topMoves = Object.entries(moveCount).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 6);
const undirected = {};
for (const [k, n] of Object.entries(moveCount)) { const [a, b] = k.split('->').map(Number); const u = a < b ? `${a}-${b}` : `${b}-${a}`; undirected[u] = (undirected[u] || 0) + n; }
const uTop = Object.values(undirected).sort((a, b) => b - a);
// a reversal is a move that undoes the immediately preceding move (A->B then B->A): the signature of a two-node ping-pong
let reversals = 0, maxRun = 0, run = 0;
for (let i = 1; i < writes.length; i++) {
  const [a, b] = writes[i - 1].split('->'), [c, d] = writes[i].split('->');
  if (a === d && b === c && a !== b) { reversals++; run++; if (run > maxRun) maxRun = run; } else run = 0;
}
const diagnostics = {
  replayCalls: m.replays.length, noDecisionCalls: H.r1stats.noDecision, writes: writes.length, distinctMoves: Object.keys(moveCount).length,
  distinctUndirectedEdges: uTop.length, top3UndirectedShare: writes.length ? uTop.slice(0, 3).reduce((s, x) => s + x, 0) / writes.length : null, topMoves,
  reversalShare: writes.length > 1 ? reversals / (writes.length - 1) : null, longestReversalRun: maxRun,
};
const out = {
  schema: `${SCHEMA}.session`, role: IN.role, label: IN.label,
  input: { world: IN.world, configSeed: IN.configSeed, configIndex: IN.configIndex, acceptedConfigSeed: gen.provenance.acceptedSeed, goal: gen.cfg.goal, agentSeed: IN.agentSeed, ticks: IN.ticks,
    arm: IN.arm === undefined ? null : IN.arm, keep: IN.role === 'test' ? ARMS[IN.arm].keep : null, brainFile: typeof IN.brainPath === 'string' ? path.basename(IN.brainPath) : null, brainWorld: IN.brainWorld === undefined ? null : IN.brainWorld },
  tree: { name: path.basename(IN.tree), manifestSha256: sha256(canonicalJson(treeManifest.files)), b2Commit: treeManifest.b2Commit, transformSha256: treeManifest.transformSha256 },
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
  diagnostics,
  h1r: { on: H.on === true, blockedIllegal: H.counters.blockedIllegal, drawFaults: H.instrument.drawFaults, envDrawsSeen: H.instrument.envDrawsSeen, edgeAttempts: H.r1stats.edgeAttempts, noDecision: H.r1stats.noDecision, slips: H.r1stats.slips, realised: H.r1stats.realised },
  artifacts: { cogDraws: A.cogDraws, visDraws: A.visDraws, envCounters: ec, qEntries: A.qEntries, qSum: A.qSum, fingerprint: rec.fingerprint },
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

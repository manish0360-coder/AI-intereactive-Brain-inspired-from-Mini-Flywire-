// ==========================================================
// AC38 limited feasibility study — one pinned-tree fixture in one disposable process
// ==========================================================
// Derived from ../../fixture.mjs at 3dc0082, which stays unchanged.  Setup and the run are the same;
// the seal window comes from window.mjs, and an adapter maps it onto the pinned application.
// Additions: several variants at once, mutant dispatch, and a deferred mutant that acts at the
// next step.  Modes and options are listed in PROTOCOL.md.  Result line: @@AC38@@<json>@@END@@
// Harness evidence only.  Not an AC38 run.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ORACLES } from '../../../../learn0/config.mjs';
import { MFW_HOOKS, CLOCK, DEV_INDICES } from '../../../../coga/config.mjs';
import { streamSeed, agentStream, canonical } from '../../../../coga/rngid.mjs';
import { describeAcq } from '../../../../coga/acq1/states.mjs';
import { AcqEnv } from '../../../../coga/acq1/env.mjs';
import { MARKER, PRELOAD_SHA256, sha256 as sha256b } from '../../../../credit1/clock.mjs';
import * as M7ENV from '../../../../m7/env.js';
import { canon, digestScope, sha256 } from '../../observe.mjs';
import { safetyChecks, emit, refuse } from './safety.mjs';
import { makeWindow, TERMINAL } from './window.mjs';

const IN = JSON.parse(process.argv[2]);
const PIN = Object.freeze({
  world: { stream: 'study', index: 12, configSeed: 200979 }, worldId: 'acq1:study:12', goal: 8, agent: 'MFW-P', env: 'E1', seed: 3361643952,
  mainSha256: '3d3266fde38c39ea0a38f3920b4a2384ef5998e88c748e0a0a53416ef62bccc3', planningSha256: '34e06c655b4f2b04d77b4db0b8db744568235865788177085510b5dd78cf46dc',
});
const DIRECT = new Set(['context_shift', 'topic_switch', 'manual']);
const ECE = 'render/episodicContextEngine.js';

async function main() {
  const safety = safetyChecks(IN.denyProbe);
  const hooked = IN.mode !== 'B';
  const CTL = globalThis.__AC38_CTL__;
  if (hooked !== !!CTL) refuse('the preload does not match the mode');

  const mk = globalThis[MARKER];
  if (!mk || mk.preloadSha256 !== PRELOAD_SHA256 || Date.now !== mk.now) refuse('the fixed clock is not installed');
  if (canonical(IN.clock) !== canonical(CLOCK)) refuse('the clock is not the COG-A one');

  const tree = IN.tree;
  const sha = (rel) => sha256b(fs.readFileSync(path.join(tree, rel)));
  const mainSha = sha('main.js'), planningSha = sha('render/planning.js');
  if (mainSha !== PIN.mainSha256 || planningSha !== PIN.planningSha256) refuse('source hash mismatch on the pinned tree');
  const tableBytes = fs.readFileSync(IN.tablePath);
  if (sha256b(tableBytes) !== IN.tableSha256) refuse('the rewrite table does not match its pinned hash');
  for (const [rel, want] of Object.entries(JSON.parse(tableBytes.toString('utf8')).sources)) if (sha(rel) !== want) refuse(`source hash mismatch on ${rel}`);

  const scopeBytes = fs.readFileSync(IN.scopePath);
  const scopeJson = JSON.parse(scopeBytes.toString('utf8'));
  let scope = null;
  if (hooked) {
    if (sha256b(scopeBytes) !== CTL.table.scopeSha256) refuse('the digest scope does not match the rewrite table');
    scope = digestScope(scopeJson);
  }

  const W = IN.world ?? PIN.world;
  if (W.stream !== 'study' || !Number.isInteger(W.index) || W.index < DEV_INDICES.lo || W.index > DEV_INDICES.hi) refuse('the world is outside the development indices');
  const gen = M7ENV.generateAccepted(W.configSeed, W.index);
  if (gen.provenance.acceptedSeed !== W.configSeed || gen.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) refuse('the world seed is not accepted');
  const world = describeAcq({ cfg: gen.cfg, acceptedSeed: W.configSeed, configIndex: W.index, stream: W.stream });
  const seed = streamSeed(agentStream(world.id, PIN.agent, PIN.env));
  if (!IN.world && (world.id !== PIN.worldId || world.goal !== PIN.goal || seed !== PIN.seed)) refuse('world identity mismatch');

  const edges = JSON.parse(fs.readFileSync(path.join(tree, 'connections.json'), 'utf8'));
  const ADJ = new Map();
  for (const e of edges) { const a = Number(e.from), b = Number(e.to); if (!ADJ.has(a)) ADJ.set(a, new Set()); if (!ADJ.has(b)) ADJ.set(b, new Set()); ADJ.get(a).add(b); ADJ.get(b).add(a); }
  const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && !!ADJ.get(Number(a)) && ADJ.get(Number(a)).has(Number(b));
  const ids = [...ADJ.keys()].sort((x, y) => x - y);
  let walk = null;
  for (const a of ids) { if (walk) break; if (a === world.goal) continue; for (const b of [...ADJ.get(a)].sort((x, y) => x - y)) { if (walk) break; if (b === world.goal) continue; for (const c of [...ADJ.get(b)].sort((x, y) => x - y)) if (c !== a && c !== world.goal) { walk = [a, b, c]; break; } } }
  const NODES = { empty: [], two: walk.slice(0, 2), three: walk }[IN.fixture];
  if (!NODES) refuse(`unknown fixture ${IN.fixture}`);
  if (IN.mode === 'B' && IN.fixture !== 'empty') refuse('bare mode cannot populate a context');
  const inputs = { world: W, worldId: world.id, goal: world.goal, agent: PIN.agent, env: PIN.env, seed, hooks: MFW_HOOKS, clock: IN.clock, steps: IN.steps, K: IN.K, reason: IN.reason, fixture: IN.fixture, nodes: NODES, variants: IN.variants ?? [] };

  const URLOF = (rel) => pathToFileURL(path.join(tree, rel)).href;
  const rngMod = await import(URLOF('instrumentation/rng.js'));
  let calls = 0, mods = null, attempts = 0, pendingPush = null, deferredFired = 0;
  const env = new AcqEnv(world, PIN.env);
  const direct = DIRECT.has(IN.reason);
  globalThis.__M7_TEL__ = {
    step() {
      calls++;
      if (calls === 1) { if (CTL) CTL.assertComplete(); if (!mods) refuse('the application modules were not ready at the first step'); }
      if (pendingPush) { mods.em.episodicStore.push(pendingPush); pendingPush = null; deferredFired++; }
      if (direct && calls === IN.K) { attempts++; mods.ece.sealCurrentEpisode(IN.reason); }
    },
    replayBranch() {},
  };
  globalThis.__M7_ENV__ = { attempt(from, to) { return env.attempt(from, to, calls - 1); } };
  const goalResets = [];
  globalThis.__GFB2__ = { goalReset(from, to, goal) { goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]); } };
  const gcount = { admittedGraph: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };
  globalThis.__GFGUARD__ = { on: true, counters: gcount, legalMove: (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b),
    admit(from, k, graph, trained, human) { if (graph) { gcount.admittedGraph++; return true; } if (trained && human) gcount.nonGraphBoth++; else if (trained) gcount.nonGraphTrained++; else if (human) gcount.nonGraphHuman++; else return true; gcount.maskedOut++; return false; } };
  const oracle = Object.fromEntries(ORACLES.map((o) => [o, 0]));
  globalThis.__LEARN0__ = { noMap: true, blocks(name) { if (!(name in oracle)) throw new Error(`unknown oracle ${name}`); oracle[name]++; return true; } };

  // ---- the adapter: every handle the shared window needs, read from the loaded modules ----
  const read = (file) => mods.ns[file].__ac38_read__();
  const sitesOutside = {};
  const adapter = {
    isSeeded: () => rngMod.isSeeded(),
    readers: () => Object.fromEntries(Object.keys(scope.byFile).map((f) => [f, mods.ns[f].__ac38_read__])),
    inventoryRows: () => scopeJson.inventory.filter((i) => i.item !== 'neuron embeddings').map((i) => [i.item, read(i.file)[i.binding]]),
    supersetRows(lockContext) {
      const first = new Set(scopeJson.inventory.map((i) => `${i.file}#${i.binding}`));
      const closed = new Set([`${ECE}#episodeVault`, ...(lockContext ? [] : [`${ECE}#currentEpisode`])]);
      const rows = [];
      for (const [file, names] of Object.entries(scope.byFile)) { const values = read(file); for (const n of names) { const key = `${file}#${n}`; if (!closed.has(key)) rows.push([key, values[n]]); } }
      rows.sort(([a], [b]) => (first.has(b) ? 1 : 0) - (first.has(a) ? 1 : 0) || (a < b ? -1 : 1));
      for (const g of scope.globals) if (g in globalThis) rows.push([`window#${g}`, globalThis[g]]);
      return rows;
    },
    neuronMap: () => read('main.js').neuronMap,
    context: () => read(ECE).currentEpisode,
    vault: () => read(ECE).episodeVault,
    store: () => mods.em.episodicStore,
    populate: (n, l) => mods.ece.__ac38_populate__(n, l),
    labelOf: (id) => mods.search.findNeuronById(id)?.userData.label ?? null,
    streams: () => mods.rng.__ac38_streams__(),
    makeRng: rngMod.makeRng,
    get touchLet() { return mods.em.__ac38_touch_let__; },
    plantHandles: () => ({
      Q: read('render/qlearning.js').Q, store: mods.em.episodicStore, bonusCache: read('render/schemaMemory.js')._bonusCache,
      stable: read('render/longTermConsolidation.js').stableMemory, edge: read('render/semanticMemoryLayer.js').semanticEdges.values().next().value,
      neuron: mods.search.findNeuronById(walk[0]), plantLet: mods.em.__ac38_plant_let__, liveRng: rngMod.liveRng,
    }),
    mutant(id, sealed) {
      const ns = mods.ns;
      if (id === 'N-0') return undefined;
      if (id === 'MV-2a') return ns['render/qlearning.js'].__ac38_mut_q__();
      if (id === 'MV-2b') return ns['render/embeddings.js'].__ac38_mut_embedding__();
      if (id === 'MV-2c') return ns['render/schemaMemory.js'].__ac38_mut_bonus__();
      if (id === 'MV-3') return ns['render/longTermConsolidation.js'].reinforcePath(sealed.nodes[0], sealed.nodes[1], sealed.labels[0], sealed.labels[1], 1);
      if (id === 'MV-7a') return mods.em.episodicStore.push(sealed);
      if (id === 'MV-7b') { pendingPush = sealed; return undefined; }
      return refuse(`unknown mutant ${id}`);
    },
    onSiteOutside: (site) => { sitesOutside[site] = (sitesOutside[site] || 0) + 1; },
    logFilter: /EPISODE|PIPELINE|Episode sealed/,
  };

  const naturalSeals = [];
  let target = false, win = null;
  if (hooked) {
    win = makeWindow({ IN, CTL, adapter, scope, base: path.basename(tree), seed, nodes: NODES });
    CTL.handlers.seal = (inner, reason) => {
      naturalSeals.push([calls, reason]);
      if (target || reason !== IN.reason || calls < IN.K) return inner(reason);
      target = true;
      return win.seal(inner, reason, calls);
    };
  }

  // ---- run: the ACQ-1 pattern.  Application modules load only through boot(), then are read here. ----
  process.chdir(path.join(tree, 'experiments', 'm7'));
  const { runOnce } = await import(URLOF('experiments/m7/run.js'));
  const pending = runOnce({ configSeed: W.configSeed, configIndex: W.index, agentSeed: seed, ...MFW_HOOKS, tickUnit: 'step', ticks: IN.steps, crashAtTick: null, warmStore: false });
  for (let i = 0; !(rngMod.isSeeded() && globalThis.__M7_GOAL__ !== undefined); i++) {
    if (i > 100000) refuse('boot did not reach the import of main.js');
    await new Promise((r) => { setImmediate(r); });
  }
  const FILES = ['main.js', 'instrumentation/rng.js', ECE, 'render/episodeManager.js', 'render/search.js', 'render/memory.js', 'render/qlearning.js', 'render/momentumMemory.js', 'render/trustMemory.js', 'render/schemaMemory.js', 'render/behavior.js', 'render/longTermConsolidation.js', 'render/embeddings.js'];
  const list = [...new Set([...FILES, ...(hooked ? Object.keys(scope.byFile) : [])])];
  const loaded = await Promise.all(list.map((f) => import(URLOF(f))));
  const ns = Object.fromEntries(list.map((f, i) => [f, loaded[i]]));
  mods = { ns, rng: ns['instrumentation/rng.js'], ece: ns[ECE], em: ns['render/episodeManager.js'], search: ns['render/search.js'] };

  const rec = await pending;
  const crash = rec.outcome.error;
  if (crash && crash.message !== String(TERMINAL)) {
    if (/AC38 REFUSED/.test(crash.message)) throw new Error(crash.message);
    throw new Error(`the run crashed: ${crash.message}\n${crash.stack}`.slice(0, 800));
  }
  if (hooked && !target) refuse(`the target seal (${IN.reason} at or after call ${IN.K}) was not reached`);
  if (!hooked && direct && attempts !== 1) refuse('the direct seal did not run');

  const terminal = ['T', 'R0', 'R1'].includes(IN.mode) || IN.stopAtReturn === true;
  const out = {
    schema: 'tc2/ac38.feasibility.run/1', label: IN.label, mode: IN.mode, fixture: IN.fixture, reason: IN.reason, steps: IN.steps, K: IN.K,
    inputDigest: sha256(canonical(inputs)), inputs, safety,
    provenance: { mainSha256: mainSha, planningSha256: planningSha, clockPreloadSha256: mk.preloadSha256, preloadSha256: CTL?.preloadSha256 ?? null, tableSha256: IN.tableSha256, transform: CTL ? CTL.status() : null },
    network: { guardAttempts: globalThis.__AC38_NET__.attempts() - 1 },
    naturalSeals, sitesOutsideWindow: sitesOutside, mutantOutside: win ? win.mutantOutside : 0, deferredFired,
    window: win ? win.result : null, oracleBlocks: Object.values(oracle).reduce((a, b) => a + b, 0),
  };
  if (!terminal) {
    const m = mods.ns, mem = m['render/memory.js'];
    const pub = {
      Q: m['render/qlearning.js'].Q, transitions: mem.transitions, rewards: mem.rewards, penalties: mem.penalties, confidenceMap: mem.confidenceMap, signals: mem.signals, thoughtTrail: mem.thoughtTrail, curiosityMap: mem.curiosityMap,
      momentumMemory: m['render/momentumMemory.js'].momentumMemory, pathSuccesses: m['render/trustMemory.js'].pathSuccesses, pathAttempts: m['render/trustMemory.js'].pathAttempts,
      episodicStore: m['render/episodeManager.js'].episodicStore, schemas: m['render/schemaMemory.js'].getSchemas(), userData: ids.map((id) => mods.search.findNeuronById(id)?.userData),
      recentMemory: globalThis.recentMemory, lastReasoning: globalThis.lastReasoning, curiosity: m['render/behavior.js'].curiosityState, energy: m['render/behavior.js'].energyState,
      calls, envLog: env.log, goalResets, cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
    };
    out.fingerprint = { public: sha256(canon(pub)), m7: rec.fingerprint, calls, ticks: rec.outcome.ticksExecuted, completed: rec.outcome.completed };
  }
  emit(out, 0);
}

main().catch((e) => {
  const message = String(e && e.message || e);
  emit({ schema: 'tc2/ac38.feasibility.run/1', label: IN.label, refused: /AC38 REFUSED/.test(message) ? message : null, failed: /AC38 REFUSED/.test(message) ? null : message }, 3);
});

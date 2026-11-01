// ==========================================================
// AC38 harness prototype — one fixture in one disposable process
// ==========================================================
// Runs under --permission with no fs write, child process or worker grant.  The only output is
// stdout, which run_control.mjs captures.  Result line: @@AC38@@<json>@@END@@
//   B   bare: no transformation, no population (empty fixture only)
//   D   transformed source, no spies
//   J   journal, stream spy and canaries armed for the seal window; run continues to the last step
//   T   tripwire: deep freeze at seal entry; terminal at seal return or first frozen write
//       (fieldsOnly leaves arrays writable, so the run reaches the first field write)
//   R0  stream positions at seal entry; terminal
//   R1  stream positions at seal return; terminal
// Not an acceptance test.  AC38 stays non-executable.
// ==========================================================
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ORACLES } from '../../learn0/config.mjs';
import { MFW_HOOKS, CLOCK, DEV_INDICES } from '../../coga/config.mjs';
import { streamSeed, agentStream, canonical } from '../../coga/rngid.mjs';
import { describeAcq } from '../../coga/acq1/states.mjs';
import { AcqEnv } from '../../coga/acq1/env.mjs';
import { MARKER, PRELOAD_SHA256, sha256 as sha256b } from '../../credit1/clock.mjs';
import * as M7ENV from '../../m7/env.js';
import { canon, digestAll, digestScope, makeObserver, positions, sha256, refuse } from './observe.mjs';

const IN = JSON.parse(process.argv[2]);
const PIN = Object.freeze({
  world: { stream: 'study', index: 12, configSeed: 200979 }, worldId: 'acq1:study:12', goal: 8, agent: 'MFW-P', env: 'E1', seed: 3361643952,
  mainSha256: '3d3266fde38c39ea0a38f3920b4a2384ef5998e88c748e0a0a53416ef62bccc3', planningSha256: '34e06c655b4f2b04d77b4db0b8db744568235865788177085510b5dd78cf46dc',
});
const DIRECT = new Set(['context_shift', 'topic_switch', 'manual']);
const TERMINAL = Symbol('ac38-terminal');
let result = null;

function emit(payload, code) {
  process.stdout.write(`\n@@AC38@@${JSON.stringify(payload)}@@END@@\n`, () => process.exit(code));
}

function safetyChecks() {
  const p = process.permission;
  if (!p || p.has('fs.write') || p.has('child') || p.has('worker')) refuse('safety: the process is not running under the required permission set');
  let denied = false;
  try { fs.writeFileSync(IN.denyProbe, 'x'); } catch (e) { denied = e.code === 'ERR_ACCESS_DENIED'; }
  if (!denied) refuse('safety: a file write was not denied');
  let netDenied = false;
  try { new net.Socket().connect(9, '127.0.0.1'); } catch (e) { netDenied = /network guard/.test(e.message); }
  if (!netDenied || !globalThis.__AC38_NET__) refuse('safety: the network guard is not active');
  for (const v of ['H1R_STAGE_AUTHORISED', 'M7_RUN_WARMSTORE', 'M7_RUN_CRASH', 'NODE_OPTIONS']) if (process.env[v] !== undefined) refuse(`safety: ${v} is set`);
  return { fsWriteDenied: true, childDenied: true, workerDenied: true, networkGuard: true, cwdAtStart: path.basename(process.cwd()) };
}

async function main() {
  const safety = safetyChecks();
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
  let scope = null;
  if (hooked) {
    if (sha256b(scopeBytes) !== CTL.table.scopeSha256) refuse('the digest scope does not match the rewrite table');
    scope = digestScope(JSON.parse(scopeBytes.toString('utf8')));
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

  // the fixture nodes: the first legal a-b-c walk, three unique valid ids, none of them the goal
  const ids = [...ADJ.keys()].sort((x, y) => x - y);
  let walk = null;
  for (const a of ids) { if (walk) break; if (a === world.goal) continue; for (const b of [...ADJ.get(a)].sort((x, y) => x - y)) { if (walk) break; if (b === world.goal) continue; for (const c of [...ADJ.get(b)].sort((x, y) => x - y)) if (c !== a && c !== world.goal) { walk = [a, b, c]; break; } } }
  const NODES = { empty: [], two: walk.slice(0, 2), three: walk }[IN.fixture];
  if (!NODES) refuse(`unknown fixture ${IN.fixture}`);
  if (IN.mode === 'B' && IN.fixture !== 'empty') refuse('bare mode cannot populate a context');

  const inputs = { world: W, worldId: world.id, goal: world.goal, agent: PIN.agent, env: PIN.env, seed, hooks: MFW_HOOKS, clock: IN.clock, steps: IN.steps, K: IN.K, reason: IN.reason, fixture: IN.fixture, nodes: NODES };

  // ---- hooks: the ACQ-1 session pattern, unchanged ----
  const URLOF = (rel) => pathToFileURL(path.join(tree, rel)).href;
  const rngMod = await import(URLOF('instrumentation/rng.js'));
  let calls = 0, mods = null, attempts = 0;
  const env = new AcqEnv(world, PIN.env);
  const direct = DIRECT.has(IN.reason);
  globalThis.__M7_TEL__ = {
    step() {
      calls++;
      if (calls === 1) {
        if (CTL) CTL.assertComplete();
        if (!mods) refuse('the application modules were not ready at the first step');
      }
      if (direct && calls === IN.K && !IN.calibrate) { attempts++; mods.ece.sealCurrentEpisode(IN.reason); }
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

  // ---- the seal window ----
  const naturalSeals = [];
  let target = null;
  const probes = {};
  const readers = () => Object.fromEntries(Object.keys(scope.byFile).map((f) => [f, mods.ns[f].__ac38_read__]));
  const windowOf = (inner, reason) => {
    const out = { reason, call: calls, seeded: rngMod.isSeeded(), breakKnob: IN.breakKnob ?? null };
    if (!out.seeded) refuse('the fixture is not seeded');
    if (IN.breakKnob === 'unreadable') Object.defineProperty(globalThis, 'lastClicked', { configurable: true, get() { throw new Error('deliberately unreadable'); } });
    if (IN.breakKnob === 'absentGlobal') delete globalThis.recentMemory;
    const R = readers();
    out.digestBefore = digestAll(scope, R);
    const ece = mods.ece.__ac38_read__();
    out.episodeRestBefore = sha256(canon({ ...ece.currentEpisode, nodes: null, labels: null }));
    const labels = NODES.map((id) => { const n = mods.search.findNeuronById(id); if (!n) refuse(`fixture node ${id} is not a valid neuron`); return n.userData.label; });
    if (new Set(NODES).size !== NODES.length) refuse('fixture nodes are not unique');
    out.nodes = NODES; out.labels = labels;
    if (NODES.length) mods.ece.__ac38_populate__([...NODES], [...labels]);
    out.digestAfterPopulation = digestAll(scope, R);
    out.episodeRestAfter = sha256(canon({ ...mods.ece.__ac38_read__().currentEpisode, nodes: null, labels: null }));
    const vault0 = mods.ece.__ac38_read__().episodeVault.length, store0 = mods.em.episodicStore.length;

    const streams = mods.rng.__ac38_streams__();
    if (IN.mode === 'R0') { result = { ...out, positions: positions(streams, rngMod.makeRng, seed) }; throw TERMINAL; }

    const observing = IN.mode === 'J' || IN.mode === 'T';
    const obs = observing ? makeObserver({ base: path.basename(tree), streams, touchLet: mods.em.__ac38_touch_let__, breakKnob: IN.breakKnob }) : null;
    const logs = [];
    const savedLog = console.log;
    if (observing) {
      const v = mods.ns;
      const inv = JSON.parse(scopeBytes.toString('utf8')).inventory.filter((i) => i.item !== 'neuron embeddings').map((i) => [i.item, v[i.file].__ac38_read__()[i.binding]]);
      out.registered = obs.register(inv, v['main.js'].__ac38_read__().neuronMap);
      CTL.handlers.let = obs.letHook;
      CTL.handlers.probe = (n) => { probes[n] = (probes[n] || 0) + 1; };
      if (IN.mode === 'T') obs.protect(IN.fieldsOnly === true);
      if (IN.mode === 'J') console.log = (...a) => { logs[logs.length] = a.map(String).join(' ').slice(0, 220); };
      obs.arm();
      out.canaryOpen = obs.canaries();
      if (IN.mode === 'T') out.tripCanaryOpen = obs.tripCanaries();
    }
    let ret = null, err = null;
    try { ret = inner(reason); } catch (e) { err = e; }
    if (observing) {
      out.canaryClose = obs.canaries();
      if (IN.mode === 'T') out.tripCanaryClose = obs.tripCanaries();
      obs.disarm();
      console.log = savedLog;
      CTL.handlers.let = null; CTL.handlers.probe = null;
      out.observed = obs.report();
      out.probes = { ...probes };
      out.logs = logs.filter((l) => /EPISODE|PIPELINE|Episode sealed/.test(l));
      const ok = (c) => Object.values(c).every((n) => n === 1);
      if (!ok(out.canaryOpen) || !ok(out.canaryClose)) refuse(`canary did not fire: ${JSON.stringify([out.canaryOpen, out.canaryClose])}`);
      if (IN.mode === 'T' && (!ok(out.tripCanaryOpen) || !ok(out.tripCanaryClose))) refuse(`tripwire canary did not fire: ${JSON.stringify([out.tripCanaryOpen, out.tripCanaryClose])}`);
    }
    out.returned = ret === null ? 'null' : (ret === undefined ? 'undefined' : 'sealed');
    if (IN.mode === 'T') {
      out.tripped = err ? { name: err.name, message: String(err.message).slice(0, 200), site: obs.siteOf(err.stack ?? '') } : null;
      if (err && !(err instanceof TypeError)) throw err;
      result = out; throw TERMINAL;
    }
    if (err) throw err;
    out.vaultDelta = mods.ece.__ac38_read__().episodeVault.length - vault0;
    out.storeDelta = mods.em.episodicStore.length - store0;
    out.digestReturn = digestAll(scope, R);
    if (IN.mode === 'R1') { result = { ...out, positions: positions(streams, rngMod.makeRng, seed) }; throw TERMINAL; }
    result = out;
    return ret;
  };

  if (hooked) {
    CTL.handlers.seal = (inner, reason) => {
      const row = [calls, reason];
      if (IN.calibrate) {
        const v = mods.ns;
        const sizes = {};
        for (const [k, f] of [['Q', 'render/qlearning.js'], ['transitions', 'render/memory.js'], ['rewards', 'render/memory.js'], ['provenanceLog', 'render/semanticProvenance.js'], ['momentumMemory', 'render/momentumMemory.js'], ['semanticStrength', 'render/semanticVitality.js'], ['pathSuccesses', 'render/trustMemory.js'], ['confidenceMap', 'render/memory.js'], ['episodicStore', 'render/episodeManager.js'], ['consolidationRegistry', 'render/longTermConsolidation.js'], ['stableMemory', 'render/longTermConsolidation.js'], ['semanticEdges', 'render/semanticMemoryLayer.js'], ['conceptSchemas', 'render/semanticMemoryLayer.js'], ['schemas', 'render/schemaMemory.js'], ['_bonusCache', 'render/schemaMemory.js'], ['_lastMotifs', 'render/schemaMemory.js']]) {
          const val = v[f].__ac38_read__()[k]; sizes[k] = val.size ?? val.length;
        }
        row.push(sizes);
      }
      naturalSeals.push(row);
      if (target || IN.calibrate || reason !== IN.reason || calls < IN.K) return inner(reason);
      target = true;
      return windowOf(inner, reason);
    };
  }

  // ---- run: the ACQ-1 pattern.  Application modules load only through boot(), then are read here. ----
  process.chdir(path.join(tree, 'experiments', 'm7'));
  const { runOnce } = await import(URLOF('experiments/m7/run.js'));
  const pending = runOnce({ configSeed: W.configSeed, configIndex: W.index, agentSeed: seed, ...MFW_HOOKS, tickUnit: 'step', ticks: IN.steps, crashAtTick: null, warmStore: false });
  // boot() seeds, sets the goal and imports main.js in one synchronous stretch, so main.js stays the
  // evaluation root.  Importing anything earlier would change module evaluation order.
  for (let i = 0; !(rngMod.isSeeded() && globalThis.__M7_GOAL__ !== undefined); i++) {
    if (i > 100000) refuse('boot did not reach the import of main.js');
    await new Promise((r) => { setImmediate(r); });
  }
  const FILES = ['main.js', 'instrumentation/rng.js', 'render/episodicContextEngine.js', 'render/episodeManager.js', 'render/search.js', 'render/memory.js', 'render/qlearning.js', 'render/momentumMemory.js', 'render/trustMemory.js', 'render/schemaMemory.js', 'render/behavior.js'];
  const extra = hooked ? Object.keys(scope.byFile) : [];
  const list = [...new Set([...FILES, ...extra])];
  const loaded = await Promise.all(list.map((f) => import(URLOF(f))));
  const ns = Object.fromEntries(list.map((f, i) => [f, loaded[i]]));
  mods = { ns, rng: ns['instrumentation/rng.js'], ece: ns['render/episodicContextEngine.js'], em: ns['render/episodeManager.js'], search: ns['render/search.js'] };

  const rec = await pending;
  const crash = rec.outcome.error;
  if (crash && crash.message !== String(TERMINAL)) {
    if (/AC38 REFUSED/.test(crash.message)) throw new Error(crash.message);
    throw new Error(`the run crashed: ${crash.message}\n${crash.stack}`.slice(0, 800));
  }
  if (!IN.calibrate && !target && hooked) refuse(`the target seal (${IN.reason} at or after call ${IN.K}) was not reached`);
  if (!IN.calibrate && !hooked && direct && attempts !== 1) refuse('the direct seal did not run');

  const terminal = ['T', 'R0', 'R1'].includes(IN.mode);
  const out = {
    schema: 'tc2/ac38.prototype.run', label: IN.label, mode: IN.mode, fixture: IN.fixture, reason: IN.reason, steps: IN.steps, K: IN.K,
    inputDigest: sha256(canonical(inputs)), inputs, safety,
    provenance: { mainSha256: mainSha, planningSha256: planningSha, clockPreloadSha256: mk.preloadSha256, ac38PreloadSha256: CTL?.preloadSha256 ?? null, tableSha256: IN.tableSha256 ?? null, transform: CTL ? CTL.status() : null },
    network: { guardAttempts: globalThis.__AC38_NET__.attempts() - 1 },
    naturalSeals, window: result, oracleBlocks: Object.values(oracle).reduce((a, b) => a + b, 0),
  };
  if (!terminal) {
    const m = mods.ns;
    const mem = m['render/memory.js'];
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
  emit({ schema: 'tc2/ac38.prototype.run', label: IN.label, refused: /AC38 REFUSED/.test(message) ? message : null, failed: /AC38 REFUSED/.test(message) ? null : message }, 3);
});

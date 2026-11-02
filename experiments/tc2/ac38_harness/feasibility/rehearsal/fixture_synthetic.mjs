// ==========================================================
// AC38 limited feasibility study — one synthetic rehearsal fixture in one disposable process
// ==========================================================
// Drives the test-owned modules in ./synthetic_tree through the study's own preload, window and
// observer, under the same permission set as the pinned fixture.  It never loads the pinned tree.
// A rehearsal result is about the harness only: it is not pinned-tree or feasibility evidence.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { canon, digestScope, sha256 } from '../../observe.mjs';
import { safetyChecks, emit, refuse } from '../harness/safety.mjs';
import { makeWindow, TERMINAL } from '../harness/window.mjs';

const IN = JSON.parse(process.argv[2]);
const SEED = 12345;
const DIRECT = new Set(['manual', 'context_shift', 'topic_switch']);

async function main() {
  const safety = safetyChecks(IN.denyProbe);
  const hooked = IN.mode !== 'B';
  const CTL = globalThis.__AC38_CTL__;
  if (hooked !== !!CTL) refuse('the preload does not match the mode');
  const tree = IN.tree;
  const tableBytes = fs.readFileSync(IN.tablePath);
  if (sha256(tableBytes) !== IN.tableSha256) refuse('the rewrite table does not match its pinned hash');
  for (const [rel, want] of Object.entries(JSON.parse(tableBytes.toString('utf8')).sources)) if (sha256(fs.readFileSync(path.join(tree, rel))) !== want) refuse(`source hash mismatch on ${rel}`);
  const scopeBytes = fs.readFileSync(IN.scopePath);
  const scopeJson = JSON.parse(scopeBytes.toString('utf8'));
  let scope = null;
  if (hooked) { if (sha256(scopeBytes) !== CTL.table.scopeSha256) refuse('the digest scope does not match the rewrite table'); scope = digestScope(scopeJson); }

  const URLOF = (rel) => pathToFileURL(path.join(tree, rel)).href;
  const rng = await import(URLOF('instrumentation/rng.js'));
  rng.initRng(SEED);
  const engine = await import(URLOF('render/engine.js'));
  const stores = await import(URLOF('render/stores.js'));
  if (CTL) CTL.assertComplete();
  stores.seedStores();
  engine.setEpisodeManagerBridge(stores.learnFromEpisode);
  globalThis.recentMemory = [];
  globalThis.lastReasoning = null;
  const NODES = { empty: [], two: [1, 2], three: [1, 2, 3] }[IN.fixture];
  if (!NODES) refuse(`unknown fixture ${IN.fixture}`);
  if (IN.mode === 'B' && IN.fixture !== 'empty') refuse('bare mode cannot populate a context');
  const inputs = { seed: SEED, steps: IN.steps, K: IN.K, reason: IN.reason, fixture: IN.fixture, nodes: NODES, variants: IN.variants ?? [] };

  const MODS = { 'render/stores.js': stores, 'render/engine.js': engine };
  let calls = 0, pendingPush = null, deferredFired = 0;
  const adapter = {
    isSeeded: () => rng.isSeeded(),
    readers: () => Object.fromEntries(Object.keys(scope.byFile).map((f) => [f, MODS[f].__ac38_read__])),
    inventoryRows: () => scopeJson.inventory.filter((i) => i.item !== 'neuron embeddings').map((i) => [i.item, MODS[i.file].__ac38_read__()[i.binding]]),
    supersetRows(lockContext) {
      const first = new Set(scopeJson.inventory.map((i) => `${i.file}#${i.binding}`));
      const closed = new Set(['render/engine.js#episodeVault', ...(lockContext ? [] : ['render/engine.js#currentEpisode'])]);
      const rows = [];
      for (const [file, names] of Object.entries(scope.byFile)) { const values = MODS[file].__ac38_read__(); for (const n of names) { const key = `${file}#${n}`; if (!closed.has(key)) rows.push([key, values[n]]); } }
      rows.sort(([a], [b]) => (first.has(b) ? 1 : 0) - (first.has(a) ? 1 : 0) || (a < b ? -1 : 1));
      for (const g of scope.globals) if (g in globalThis) rows.push([`window#${g}`, globalThis[g]]);
      return rows;
    },
    neuronMap: () => stores.neuronMap,
    context: () => engine.__ac38_read__().currentEpisode,
    vault: () => engine.__ac38_read__().episodeVault,
    store: () => stores.episodicStore,
    populate: (n, l) => engine.__ac38_populate__(n, l),
    labelOf: (id) => stores.neuronMap.get(id)?.userData.label ?? null,
    streams: () => rng.__ac38_streams__(),
    makeRng: rng.makeRng,
    get touchLet() { return stores.__ac38_touch_let__; },
    plantHandles: () => { const s = stores.__ac38_read__(); return { Q: s.Q, store: s.episodicStore, bonusCache: s._bonusCache, stable: s.stableMemory, edge: s.semanticEdges.values().next().value, neuron: s.neuronMap.get(1), plantLet: stores.__ac38_plant_let__, liveRng: rng.liveRng }; },
    mutant(id, sealed) {
      if (id === 'N-0') return undefined;
      if (id === 'MV-2a') return stores.__ac38_mut_q__();
      if (id === 'MV-2b') return stores.__ac38_mut_embedding__();
      if (id === 'MV-2c') return stores.__ac38_mut_bonus__();
      if (id === 'MV-3') return stores.reinforcePath(sealed.nodes[0], sealed.nodes[1]);
      if (id === 'MV-7a') return stores.episodicStore.push(sealed);
      if (id === 'MV-7b') { pendingPush = sealed; return undefined; }
      return refuse(`unknown mutant ${id}`);
    },
    onSiteOutside: () => {},
    logFilter: /sealed/,
  };

  const naturalSeals = [];
  let target = false, win = null;
  if (hooked) {
    win = makeWindow({ IN, CTL, adapter, scope, base: path.basename(tree), seed: SEED, nodes: NODES });
    CTL.handlers.seal = (inner, reason) => {
      naturalSeals.push([calls, reason]);
      if (target || reason !== IN.reason || calls < IN.K) return inner(reason);
      target = true;
      return win.seal(inner, reason, calls);
    };
  }

  let crash = null, attempts = 0;
  try {
    for (calls = 1; calls <= IN.steps; calls++) {
      if (pendingPush) { stores.episodicStore.push(pendingPush); pendingPush = null; deferredFired++; }
      stores.step();
      if (DIRECT.has(IN.reason) && calls === IN.K) { attempts++; engine.sealCurrentEpisode(IN.reason); }
      if (calls % 7 === 0) engine.sealCurrentEpisode('goal_reached');
    }
  } catch (e) { crash = e; }
  if (crash && crash !== TERMINAL) throw crash;
  if (hooked && !target) refuse(`the target seal (${IN.reason} at or after call ${IN.K}) was not reached`);
  if (!hooked && DIRECT.has(IN.reason) && attempts !== 1) refuse('the direct seal did not run');

  const terminal = crash === TERMINAL;
  const out = {
    schema: 'tc2/ac38.rehearsal.run/1', label: IN.label, mode: IN.mode, fixture: IN.fixture, reason: IN.reason, steps: IN.steps, K: IN.K,
    inputDigest: sha256(canon(inputs)), inputs, safety,
    provenance: { preloadSha256: CTL?.preloadSha256 ?? null, tableSha256: IN.tableSha256, transform: CTL ? CTL.status() : null },
    network: { guardAttempts: globalThis.__AC38_NET__.attempts() - 1 },
    naturalSeals, sitesOutsideWindow: {}, mutantOutside: win ? win.mutantOutside : 0, deferredFired,
    window: win ? win.result : null,
  };
  if (!terminal) {
    const pub = { Q: stores.Q, episodicStore: stores.episodicStore, neuronMap: stores.neuronMap, calls };
    out.fingerprint = { public: sha256(canon(pub)), m7: sha256(canon({ calls, next: rng.liveRng() })), calls };
  }
  emit(out, 0);
}

main().catch((e) => {
  const message = String(e && e.message || e);
  emit({ schema: 'tc2/ac38.rehearsal.run/1', label: IN.label, refused: /AC38 REFUSED/.test(message) ? message : null, failed: /AC38 REFUSED/.test(message) ? null : message }, 3);
});

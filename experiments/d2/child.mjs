// One D2 arm per process: main.js is an ES-module singleton with import-time side effects.
// Boots the REAL main.js under the existing Phase 1.0 headless driver, with the D2
// observation hook, and reports what reached futureScore and what it contributed.
//
// Uses the pre-existing Phase 1.0 development agent seed 20260818 (experiments/phase1_0).
// No configuration is generated: experiments/m7/env.js is never imported.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const ROOT = process.env.D2_ROOT;
const U = pathToFileURL(ROOT).href;
register(U + '/experiments/d2/hook.mjs', import.meta.url);

const SEED = 20260818, GOAL = 16, TICKS = Number(process.env.D2_TICKS || 300);
const cap = { calls: [], scores: [], lookup: 0 };
globalThis.__D2__ = null;

const { boot, pressSpace } = await import(U + '/experiments/phase1_0/_driver.js');
const { dom, timer, restore } = await boot({ seed: SEED, goal: GOAL });
const { findNeuronById } = await import(U + '/render/search.js');
const { futureScore, lookAheadScore } = await import(U + '/render/planning.js');

// ---- the controlled unit fixture, on the same booted 20-node graph ------------------------
// Pure functions (no RNG, no state), evaluated BEFORE the run so every arm sees the
// identical boot-time embeddings (the run itself trains embeddings).
const EMPTY = () => [new Map(), new Map(), new Map()];
const REWARDED = () => {                       // audit Probe B fixture
  const r = new Map([['5->6', 8], ['6->8', 8], ['8->9', 8], ['9->11', 8]]);
  return [r, new Map(), new Map([['5->6', 3]])];
};
const unit = { neurons: [], fs: {}, fsIntended: {}, lookups: {}, look: [] };
for (let g = 1; g <= 20; g++) {
  const n = findNeuronById(g);
  unit.neurons.push({ graphId: g, userDataId: n.userData.id, objectId: n.id,
                      objectIdResolvesTo: findNeuronById(n.id) ? findNeuronById(n.id).userData.id : null });
}
const local = { calls: [], scores: [], lookup: 0 };
for (const [name, mk] of [['empty', EMPTY], ['rewarded', REWARDED]]) {
  unit.fs[name] = []; unit.fsIntended[name] = []; unit.lookups[name] = [];
  for (const goal of [8, 12, 16, 19]) for (let g = 1; g <= 20; g++) {
    const n = findNeuronById(g);
    globalThis.__D2__ = local; local.calls = [];
    const v = futureScore(n, goal, ...mk(), 3);
    unit.lookups[name].push(local.calls[0][3]);
    // the intended call: the same neuron with its graph identity in the field the DFS reads
    const vi = futureScore({ ...n, id: n.userData.id, userData: n.userData }, goal, ...mk(), 3);
    globalThis.__D2__ = null;
    unit.fs[name].push(v); unit.fsIntended[name].push(vi);
  }
}
for (const goal of [8, 12, 16, 19]) for (let s = 1; s <= 20; s++) unit.look.push(lookAheadScore(s, goal, 2));

// ---- the live run -------------------------------------------------------------------------
const writes = []; let _lr = globalThis.lastReasoning;
Object.defineProperty(globalThis, 'lastReasoning', { configurable: true,
  get() { return _lr; }, set(v) { _lr = v; writes.push(v ? `${v.from}->${v.to}` : null); } });
globalThis.__D2__ = cap;
pressSpace(dom);
let ticks = 0;
for (let i = 0; i < TICKS; i++) { if (!timer.tick()) break; ticks++; }
globalThis.__D2__ = null;
restore();

process.stdout.write('@@D2@@' + JSON.stringify({ ticks, writes, calls: cap.calls, scores: cap.scores, unit }));

// ==========================================================
// M40-P1 STAGE-1 CHILD — one (fixture, mode, T) per process. OUTCOME-BLIND.
// ==========================================================
// mode 'grid' : an ARMED M7-harness run of exactly T ticks (T in the frozen grid), then at the snapshot:
//                 1. the PE record (projected digests, RNG positions, ON readout closure vector)
//                 2. the frozen M40-R2 purity protocol around the lookahead-only diagnostic (runPurityProtocol)
//                 3. the calibration record: decision-time pool, ON futureBonus values, cap, rankability,
//                    lookahead-only diagnostic values
// mode 'B'    : an ARMED run with input.ticks = 3000, captured at the run.js loop head where
//               ticksExecuted = 1500 (before setTick(1500)); its continuation after capture is not used.
// Only the ON arm exists here. This file constructs no ablated, permuted or oracle arm and reads no
// reliability vector: Stage 1 is outcome-blind by construction.
// Inputs: M40_ROOT, M40_SEED, M40_INDEX, M40_MODE ('grid' | 'B'), M40_T. Output: one line prefixed @@M40@@.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const ROOT = process.env.M40_ROOT;
const U = pathToFileURL(ROOT).href;
const SEED = Number(process.env.M40_SEED), INDEX = Number(process.env.M40_INDEX);
const MODE = process.env.M40_MODE, T = Number(process.env.M40_T);
register(U + '/experiments/m40/hook.mjs', import.meta.url);

const S = await import(U + '/research/preregistrations/m40_spec.js');
const FIXTURES = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
if (!FIXTURES.some(([s, i]) => s === SEED && i === INDEX)) throw new Error(`M40: ${SEED}:${INDEX} is not an approved fixture`);
if (MODE === 'grid' && !S.GRID.includes(T)) throw new Error(`M40: T=${T} is not in the frozen grid`);
if (MODE === 'B' && T !== 3000) throw new Error('M40: the B run is input.ticks = 3000');
if (!['grid', 'B'].includes(MODE)) throw new Error(`M40: unknown mode ${MODE}`);

const env = await import(U + '/experiments/m7/env.js');
const { FROZEN } = await import(U + '/experiments/uqb/protocol.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M9 = await import(U + '/experiments/m9/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const RNG = await import(U + '/instrumentation/rng.js');

if (!env.makeConfig(SEED, INDEX).accepted) throw new Error(`M40: fixture ${SEED}:${INDEX} is not accepted at its own seed`);

// ---- declared decision-relevant snapshot state (m40_spec.js STATE_COMPONENTS) ----------------------------
const canon = (x) => {
  if (x instanceof Map) return ['#Map', [...x.entries()].map(([k, v]) => [String(k), canon(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))];
  if (x instanceof Set) return ['#Set', [...x].map(canon).map(v => JSON.stringify(v)).sort()];
  if (Array.isArray(x)) return x.map(canon);
  if (typeof x === 'number') return Number.isFinite(x) ? x : String(x);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().filter(k => typeof x[k] !== 'function').map(k => [k, canon(x[k])]));
  return x === undefined ? '#undefined' : x;
};
const sha = (v) => crypto.createHash('sha256').update(JSON.stringify(canon(v))).digest('hex');
let mods = null;
async function loadMods() {
  if (mods) return mods;
  mods = {
    mem: await import(U + '/render/memory.js'), q: await import(U + '/render/qlearning.js'),
    bio: await import(U + '/render/behavior.js'), search: await import(U + '/render/search.js'),
    epi: await import(U + '/render/episodeManager.js'), trust: await import(U + '/render/trustMemory.js'),
    planning: await import(U + '/render/planning.js'),
  };
  return mods;
}
function stateValues(m, writes) {
  const ex = globalThis.__M40_EXPOSE__.get();
  const neurons = Array.from({ length: 20 }, (_, i) => m.search.findNeuronById(i + 1));
  return {
    Q: m.q.Q, transitions: m.mem.transitions, rewards: m.mem.rewards, penalties: m.mem.penalties,
    curiosityMap: m.mem.curiosityMap, confidenceMap: m.mem.confidenceMap, signals: m.mem.signals,
    thoughtTrail: [...m.mem.thoughtTrail], recentMemory: globalThis.recentMemory || [],
    biology: ['curiosityState', 'confidenceState', 'stressState', 'fatigueState', 'energyState', 'exhaustionState',
      'restingState', 'loopStressState', 'focusState'].map(k => m.bio[k]),
    embeddings: neurons.map(n => n.userData.embedding), neighbors: neurons.map(n => n.userData.neighbors),
    episodes: m.epi.episodicStore, pathTrust: [m.trust.pathAttempts, m.trust.pathSuccesses],
    envCounters: env.getCounters(), decisionTrace: writes,
    persistence: globalThis.localStorage.getItem('brain'),
    adjacencyMemory: ex.adjacencyMemory, timeMemory: ex.timeMemory, chainMemory: ex.chainMemory,
    attentionMap: ex.attentionMap, lastDecision: ex.lastDecision, agentRunning: ex.agentRunning,
    goalNeuronId: ex.goalNeuronId, agentCurrent: ex.agentCurrent,
  };
}
const DIGEST_IDS = S.STATE_COMPONENTS.filter(c => c.cls === 'direct' || c.cls === 'exposed').map(c => c.id);
function digests(m, writes, project) {
  const v = stateValues(m, writes);
  const missing = DIGEST_IDS.filter(id => !(id in v));
  if (missing.length) throw new Error('M40: declared components not collected: ' + missing.join(','));
  return Object.fromEntries(DIGEST_IDS.map(id => [id, sha(project ? S.projectForPE(id, v[id]) : v[id])]));
}
// RNG stream positions, by the same probe method run.js uses (recoverCount): one draw, matched against a
// reference generator. The probe advances the stream; every readout reseeds all streams anyway.
function rngPosition(stream, seed) {
  const probe = RNG.rng(stream), ref = RNG.makeRng(seed >>> 0);
  for (let i = 0; i < 8_000_000; i++) if (ref() === probe) return i;
  return -1;
}
const SEEDS = { cognitive: FROZEN.agentSeed >>> 0, visual: (FROZEN.agentSeed ^ 0x9e3779b9) >>> 0, environment: (FROZEN.agentSeed ^ 0x5EED) >>> 0 };

// ---- ON readout at one decision state: M39-P1 procedure (freezes, identical reseed) --------------------------
const RSEED = (u) => readoutSeed(SEED, 'ARMED', u);
function readoutON(u) {
  let best = null, pool = null, dec = null;
  const ledger = M9.makeLedger();
  globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
  globalThis.__UQB_PROBE__ = (from, key, step) => { if (step === 0 && best === null) best = key; };
  globalThis.__M39_POOL__ = (from, step, entries) => { if (step === 0 && pool === null) pool = entries; };
  globalThis.__M9__ = ledger;
  globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()], onDecision: (d) => { if (dec === null) dec = d; } });
  RNG.initRng(RSEED(u));
  globalThis.__UQB_EXPOSE__.runPrediction(u);
  globalThis.__UQB__ = null; globalThis.__M9__ = null; globalThis.__M39_POOL__ = null; globalThis.__UQB_PROBE__ = null;
  globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
  return { best, pool, dec };
}
function readoutVector(states) {
  const out = {};
  for (const u of states) {
    const r = readoutON(u);
    out[u] = {
      poolKeys: (r.pool || []).map(([k]) => k), poolWeights: (r.pool || []).map(([, w]) => w),
      futureBonusValues: (r.pool || []).map(([k]) => (r.dec ? r.dec.out.get(k) : null)), bestChoiceON: r.best,
      p0Keys: r.dec ? r.dec.keys : null, p0Values: r.dec ? r.dec.values : null,
    };
  }
  return out;
}
const closureOnly = (v) => Object.fromEntries(Object.entries(v).map(([u, r]) => [u, Object.fromEntries(S.READOUT_FIELDS.map(f => [f, r[f]]))]));

globalThis.__UQB_EXPOSE__ = {};
globalThis.__M40_EXPOSE__ = {};
let captureB = null;
// the B capture runs synchronously at the run.js loop head, inside the callback, when ticksExecuted = T_A
if (MODE === 'B') {
  const m = await loadMods();
  globalThis.__M40_CAPTURE__ = (ticksExecuted, writes) => {
    if (ticksExecuted !== S.T_A || captureB) return;
    const goalNow = globalThis.__M40_EXPOSE__.get().goalNeuronId;
    const states = env.decisionStates(Number(goalNow)).slice().sort((a, b) => a - b);
    const digest = digests(m, [...writes], true), digestRaw = digests(m, [...writes], false);
    const rng = Object.fromEntries(Object.entries(SEEDS).map(([s, sd]) => [s, rngPosition(s, sd)]));
    const readouts = readoutVector(states);
    captureB = { ticksRequested: 3000, capturedAt: ticksExecuted, digest, digestRaw, rng,
                 readouts: closureOnly(readouts), phaseAtCapture: env.getPhase(), states };
  };
}

const run = await runOnce({ configSeed: SEED, configIndex: INDEX, agentSeed: FROZEN.agentSeed, arm: FROZEN.m7Arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: MODE === 'B' ? 3000 : T, crashAtTick: null, warmStore: false });
globalThis.__M40_CAPTURE__ = null;
const runMeta = { fingerprint: run.fingerprint, completed: run.outcome.completed, ticksExecuted: run.outcome.ticksExecuted,
  ticksRequested: MODE === 'B' ? 3000 : T, replayOnce: run.provenance.replayCooldownDeterministic, goal: run.provenance.goal };
const m = await loadMods();
const out = { fixture: [SEED, INDEX], mode: MODE, T: MODE === 'B' ? 3000 : T, run: runMeta };

if (MODE === 'B') {
  out.pe = captureB;
} else {
  const goal = run.provenance.goal;
  const states = env.decisionStates(goal).slice().sort((a, b) => a - b);
  out.phaseAtSnapshot = env.getPhase();
  // 1. PE record, taken BEFORE any readout (readouts reseed and write lastDecision)
  const digest = digests(m, run.artifacts.writes, true), digestRaw = digests(m, run.artifacts.writes, false);
  const rng = { cognitive: run.artifacts.cogDraws, visual: run.artifacts.visDraws, environment: rngPosition('environment', SEEDS.environment) };
  // 2. the frozen M40-R2 purity protocol around the lookahead-only diagnostic
  let firstReadouts = null, diag = null;
  const dp = S.runPurityProtocol({
    readouts: () => { const v = readoutVector(states); if (!firstReadouts) firstReadouts = v; return closureOnly(v); },
    digest: () => digests(m, run.artifacts.writes, false),
    initRng: (seed) => RNG.initRng(seed),
    diagnostic: () => {
      diag = {};
      for (const u of states) {
        diag[u] = firstReadouts[u].poolKeys.map(k => m.planning.futureScore(m.search.findNeuronById(k), goal, new Map(), new Map(), new Map(), 3));
      }
    },
    probe: () => Object.fromEntries(S.RNG_STREAMS.map(s => [s, RNG.rng(s)])),
    makeRng: RNG.makeRng, sentinel: 424242,
  });
  out.pe = { ticksRequested: T, capturedAt: T, digest, digestRaw, rng, readouts: closureOnly(firstReadouts), states };
  out.dp = { pass: dp.pass, mismatches: dp.mismatches, record: dp.record };
  // 3. calibration record — outcome-blind descriptive quantities only
  out.calibration = Object.fromEntries(states.map(u => {
    const r = firstReadouts[u];
    const vals = r.futureBonusValues;
    return [u, { poolKeys: r.poolKeys, poolValues: vals, p0Keys: r.p0Keys, p0Values: r.p0Values,
      distinct: new Set(vals).size, atCap: vals.filter(v => v === 20).length, rankable: new Set(vals).size >= 2,
      lookaheadOnly: diag[u] }];
  }));
}
out.evaluatedSeeds = env.evaluatedSeeds();
process.stdout.write('@@M40@@' + JSON.stringify(out));

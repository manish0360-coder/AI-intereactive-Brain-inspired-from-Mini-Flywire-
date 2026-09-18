// ==========================================================
// M39-P1 CHILD — one development fixture per process
// ==========================================================
// 1. One ARMED M7-harness run (__M7_REPLAY_ONCE__ set by run.js), to the absolute end (3000 ticks).
// 2. Snapshot digest of the decision-relevant state, including thoughtTrail and recentMemory.
// 3. Step-0 bestChoice readouts at every decision state, all learning frozen (UQ-B R2/R3), RNG
//    reseeded identically for every arm at a state:
//      ON · ZERO · PERM_1..19 (restricted to the decision-time pool P) · ORACLE-INJECTED
// 4. The same readouts again with Date.now shifted by 1e8 ms (P4 diagnostic; production clock
//    semantics are not changed — only this process's clock during readouts).
// 5. The snapshot digest again, to prove readouts mutated nothing.
//
// Inputs: M39_ROOT, M39_SEED, M39_INDEX; M39_MUTANT for verification faults only.
// Output: one JSON line prefixed @@M39@@.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const ROOT = process.env.M39_ROOT;
const U = pathToFileURL(ROOT).href;
const SEED = Number(process.env.M39_SEED), INDEX = Number(process.env.M39_INDEX);
const MUTANT = process.env.M39_MUTANT || null;
register(U + '/experiments/m39/hook.mjs', import.meta.url);

const FIXTURES = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
if (!FIXTURES.some(([s, i]) => s === SEED && i === INDEX)) throw new Error(`M39: ${SEED}:${INDEX} is not an approved fixture`);

const env = await import(U + '/experiments/m7/env.js');
const { FROZEN } = await import(U + '/experiments/uqb/protocol.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M9 = await import(U + '/experiments/m9/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng, liveRng } = await import(U + '/instrumentation/rng.js');

// the fixture must be accepted AT ITS OWN SEED, so generateAccepted cannot walk to any other seed
const cfg0 = env.makeConfig(SEED, INDEX);
if (!cfg0.accepted) throw new Error(`M39: fixture ${SEED}:${INDEX} is not accepted at its own seed`);
if (MUTANT === 'newSeed') env.makeConfig(SEED + 1, INDEX);          // fault 11

globalThis.__UQB_EXPOSE__ = {};
const TICKS = MUTANT === 'earlySnapshot' ? 1000 : FROZEN.ticks;     // fault 8
const run = await runOnce({ configSeed: SEED, configIndex: INDEX, agentSeed: FROZEN.agentSeed, arm: FROZEN.m7Arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: TICKS, crashAtTick: null, warmStore: false });
const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
if (typeof runPrediction !== 'function') throw new Error('M39: runPrediction handle did not bind');

// ---- snapshot digest -----------------------------------------------------------------------------
const mem = await import(U + '/render/memory.js');
const { Q } = await import(U + '/render/qlearning.js');
const bio = await import(U + '/render/behavior.js');
const canon = (x) => x instanceof Map ? [...x.entries()].map(([k, v]) => [String(k), canon(v)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
  : Array.isArray(x) ? x.map(canon) : x;
const sha = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
function snapshot() {
  const parts = {
    Q: canon(Q), transitions: canon(mem.transitions), rewards: canon(mem.rewards), penalties: canon(mem.penalties),
    curiosityMap: canon(mem.curiosityMap), confidenceMap: canon(mem.confidenceMap), signals: canon(mem.signals),
    thoughtTrail: [...mem.thoughtTrail], recentMemory: canon(globalThis.recentMemory || []),
    biology: ['curiosityState', 'confidenceState', 'stressState', 'fatigueState', 'energyState', 'exhaustionState',
      'restingState', 'loopStressState', 'focusState'].map(k => bio[k]),
  };
  const digests = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, sha(v)]));
  return { digest: sha(digests), digests, thoughtTrailLength: parts.thoughtTrail.length,
           recentMemoryLength: parts.recentMemory.length };
}
const snap0 = snapshot();
const phaseAtSnapshot = env.getPhase();

if (MUTANT === 'clearHistory') { mem.thoughtTrail.length = 0; globalThis.recentMemory = []; }   // fault 9

// ---- oracle inputs: phase-2 reliability, set-valued R* over graph neighbours ----------------------
const cfg = env.makeConfig(SEED, INDEX);
const goal = cfg.goal;
const states = env.decisionStates(goal).slice().sort((a, b) => a - b);

// ---- one readout -----------------------------------------------------------------------------------
const RSEED = (u) => readoutSeed(SEED, 'ARMED', u);          // identical across arms: the pairing
function readout(u, guard) {
  let best = null, pool = null, dec = null, ledger = M9.makeLedger(), dateReads = 0;
  const realNow = Date.now;
  Date.now = function () { dateReads++; return realNow.call(Date); };
  globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
  globalThis.__UQB_PROBE__ = (from, key, step) => { if (step === 0 && best === null) best = key; };
  globalThis.__M39_POOL__ = (from, step, entries) => { if (step === 0 && pool === null) pool = entries; };
  globalThis.__M9__ = ledger;
  globalThis.__UQB__ = guard ? guard((d) => { if (dec === null) dec = d; }) : null;
  initRng(RSEED(u));
  runPrediction(u);
  globalThis.__UQB__ = null; globalThis.__M9__ = null; globalThis.__M39_POOL__ = null; globalThis.__UQB_PROBE__ = null;
  globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
  Date.now = realNow;
  const r0 = ledger.records[0] || null;
  return {
    best, pool,
    step0: dec && { keys: dec.keys, values: dec.values, delivered: dec.keys.map(k => dec.out.get(k)) },
    ledger: r0 && { size: r0.allCandidatesSize, rejected: r0.rejected, choicesLength: r0.choicesLength },
    dateReads,
  };
}
const identity = (n) => [...Array(n).keys()];
const G = {
  ON:   (onDecision) => P.makeGuard({ arm: 'ARMED', sigmaFor: identity, onDecision }),
  ZERO: (onDecision) => P.makeGuard({ arm: MUTANT === 'zeroIsOn' ? 'ARMED' : 'ABLATED', sigmaFor: identity, onDecision }),   // fault 2
};
// PERM_j: a non-identity permutation of the decision-time pool P's values, P found by the ON readout;
// every candidate outside P keeps its own value. Seeds from the frozen UQ-B generator.
function permSigma(keys, poolKeys, j, u) {
  const idx = keys.map((k, i) => [k, i]).filter(([k]) => poolKeys.includes(String(k))).map(([, i]) => i);
  if (idx.length < 2) return null;
  let perm = null;
  for (let attempt = 0; attempt < 1000; attempt++) {
    const p = P.permutationFor(P.seedFor(SEED, 'ARMED', j, u, attempt), idx.length);
    if (!P.isIdentity(p)) { perm = p; break; }
  }
  const sigma = identity(keys.length);
  if (MUTANT === 'permIdentity') return sigma;                  // fault 3
  idx.forEach((pos, t) => { sigma[pos] = idx[perm[t]]; });
  if (MUTANT === 'permMultiset') {                              // fault 4: pull in a value from outside P, or duplicate one
    const outside = keys.findIndex((k, i) => !idx.includes(i));
    sigma[idx[0]] = outside >= 0 ? outside : sigma[idx[1]];
    if (outside < 0) return { dup: true, sigma };
  }
  return sigma;
}
function permGuard(sigma0) {
  return (onDecision) => {
    let first = true;
    return {
      arm: 'ARMED',
      buildFutureBonus(keys, compute) {
        const values = keys.map(compute);
        const sigma = first && sigma0 ? (sigma0.sigma || sigma0) : identity(keys.length);
        const out = new Map();
        keys.forEach((k, i) => out.set(k, values[sigma[i]]));
        if (first && sigma0 && sigma0.dup) out.set(keys[0], values[1] + 1);
        if (first) onDecision({ keys, values, out, sigma });
        first = false;
        return out;
      },
    };
  };
}
// ORACLE-INJECTED: the cap (20) on every member of R*(u), 0 on every other candidate — diagnostic only
function oracleGuard(oracleKeys) {
  return (onDecision) => {
    let first = true;
    return {
      arm: 'ARMED',
      buildFutureBonus(keys, compute) {
        const values = keys.map(compute);
        const out = new Map();
        keys.forEach((k) => out.set(k, first && oracleKeys.includes(String(k)) ? 20 : 0));
        if (first) onDecision({ keys, values, out });
        first = false;
        return out;
      },
    };
  };
}

const { oracleSet } = await import(U + '/experiments/m39/analyze.js');
function sweep() {
  const perState = {};
  for (const u of states) {
    const on = readout(u, G.ON);
    if (MUTANT === 'poolDiffers') mem.penalties.set(`${u}->${on.pool && on.pool[0] ? on.pool[0][0] : ''}`, 99);   // fault 5
    const zero = readout(u, G.ZERO);
    if (MUTANT === 'poolDiffers') mem.penalties.delete(`${u}->${on.pool && on.pool[0] ? on.pool[0][0] : ''}`);
    const poolKeys = (on.pool || []).map(([k]) => String(k));
    const perm = [];
    for (let j = 1; j <= 19; j++) {
      const s = on.step0 ? permSigma(on.step0.keys, poolKeys, j, u) : null;
      perm.push(s ? readout(u, permGuard(s)) : null);
    }
    const R = oracleSet(u, goal, cfg.pPhase2, env);
    const oracle = readout(u, oracleGuard(R.map(String)));
    // P0: the unguarded production path (in-loop futureScore) must equal ON exactly
    const prod = readout(u, null);
    // X6 wiring control: PERM_1's permutation applied under ZERO must change nothing
    const s1 = on.step0 ? permSigma(on.step0.keys, poolKeys, 1, u) : null;
    const isPerm = (s) => Array.isArray(s) && [...s].sort((a, b) => a - b).every((v, i) => v === i);
    const zeroPerm = isPerm(s1) ? readout(u, (onDecision) => {
      let first = true;
      return P.makeGuard({ arm: 'ABLATED', onDecision,
        sigmaFor: (n) => { const s = first ? s1 : identity(n); first = false; return s; } });
    }) : null;
    perState[u] = { on, zero, perm, oracle, prod, zeroPerm, oracleSet: R };
  }
  return perState;
}
const primary = sweep();
// P4: the identical sweep with this process's clock shifted by 1e8 ms during readouts
const realNow = Date.now, SHIFT = 1e8;
Date.now = () => realNow.call(Date) + SHIFT;
const shifted = sweep();
Date.now = realNow;
const snap1 = snapshot();

process.stdout.write('@@M39@@' + JSON.stringify({
  fixture: [SEED, INDEX], goal, states, mutant: MUTANT,
  run: { fingerprint: run.fingerprint, completed: run.outcome.completed, ticksExecuted: run.outcome.ticksExecuted,
         ticksRequested: TICKS, replayOnce: run.provenance.replayCooldownDeterministic, phaseAtSnapshot },
  tShift: env.T_SHIFT, snapshotBefore: snap0, snapshotAfter: snap1,
  evaluatedSeeds: env.evaluatedSeeds(), clockShiftMs: SHIFT, primary, shifted,
}));

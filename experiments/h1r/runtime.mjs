// ==========================================================
// H1-R — conformance runtime (globalThis.__H1R__)
// ==========================================================
// Consulted only by the guarded edits of conformance_transform.mjs. It owns no learning
// state, draws no random number, and reads the arm semantics from the frozen predicates in
// experiments/m7/arms.js (the same module instance run.js configures).
//
// Programmatic:  await installH1R({ tree, trustMode, envPosition })
// Preload:       NODE_OPTIONS="--import=<file URL of this module>" with
//                H1R=on  H1R_TREE=<conformed tree dir>  [H1R_TRUST_MODE=traversal|attemptGated]
//
// R1: `noteR1` receives the realised transition of each tick from the R1-DRAW-EARLY edit (the draw
// itself is the unchanged `__M7_ENV__.attempt` call; this module only records).
//
// R3: `envPosition` = { agentSeed, blockCode, acceptedConfigIndex } is the run's design position. The
// runtime derives its environment seed (env_seed.mjs) and the R3-ENV-SEED edit registers the
// "environment" stream with it when initRng(agentSeed) runs. Without a position the edit keeps
// B2's agentSeed XOR 0x5EED (the existing gate fixtures, which seed initRng themselves).
//
// MS-1 (Director authorisation MS-1; v1.0 §9 items 2–4 and 7; D-020): `attachMeasure(M)` connects the
// measurement sink (measure.mjs, bound by measure_install.mjs). The runtime then forwards, records only:
//   * one per-attempt record per environment draw (from noteR1): edge, outcome, goal-entering flag, and the
//     raw trust-store attempts and successes of the attempted key just before the attempt;
//   * every episode reset (goal, cap) from episodeBoundary;
//   * the τ = 1499 trust snapshot at the runAgentLoop entry (M-LOOP) where 1,505 calls are complete
//     (D-020 pin 2), and the final snapshot (finalSnapshot(), called by the driver after runOnce);
//     each entry is [key, attempts, successes, raw attempts within the phase].
// `armFork({ call, to })` arms the fork driver's switch (v1.0 §8 link ④): immediately before runAgent() call
// `call` (M-FORK), the frozen arms.configure() is called with arm A2, which switches the E3 and E4
// deliveries (A1 and A2 differ in nothing else). `call: null` arms the hook without a switch (gate control).
// The runtime still draws no random number and owns no learning state.
//
// TRUST MODES (N2)
//   traversal     (H1-R)  frozen §6.1: trust success iff the traversal succeeded; the
//                         episode-level success writer is suppressed. Guarantees s <= a.
//   attemptGated  (diagnostic only) episode credit allowed for keys attempted in the current
//                         episode. Kept to measure the reconciliation conflict; NOT for H1-R.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { envSlot, envSeedForSlot } from './env_seed.mjs';

export async function installH1R({ tree, trustMode = 'traversal', envPosition = null } = {}) {
  if (!tree) throw new Error('installH1R: tree directory required');
  if (!['traversal', 'attemptGated'].includes(trustMode)) throw new Error(`installH1R: unknown trustMode ${trustMode}`);
  const arms = await import(pathToFileURL(path.join(tree, 'experiments', 'm7', 'arms.js')).href);
  const edges = JSON.parse(fs.readFileSync(path.join(tree, 'connections.json'), 'utf8'));
  const ADJ = new Set();
  for (const e of edges) { const a = Number(e.from), b = Number(e.to); ADJ.add(a + '|' + b); ADJ.add(b + '|' + a); }
  const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && ADJ.has(Number(a) + '|' + Number(b));
  const attempts = new Set();
  const counters = { blockedIllegal: 0, resets: { goal: 0, cap: 0 }, uniformDecisions: 0, armsSeen: new Set() };
  // R1 bookkeeping (records only; nothing here alters behaviour or draws a random number)
  const r1stats = { decisions: 0, noDecision: 0, edgeAttempts: 0, slips: 0, realised: 0, selfNoop: 0 };   // realised includes goal entries
  // R3: the design position and its derived environment seed (refuses outside the verified domain)
  const envStream = envPosition ? (() => { const slot = envSlot(envPosition);
    return Object.freeze({ agentSeed: envPosition.agentSeed, blockCode: envPosition.blockCode, acceptedConfigIndex: envPosition.acceptedConfigIndex, slot, envSeed: envSeedForSlot(slot) }); })() : null;
  // MS-1 measurement forwarding state (records only)
  const TAU0 = 5, SHIFT = 1500, SNAP_CALLS = 1505;          // τ = call index − 5; Phase II iff τ ≥ 1500 (v1.0 §6)
  const raw = [new Map(), new Map()];                       // raw attempts per key within Phase I / Phase II
  const inst = { envDrawsSeen: 0, drawFaults: 0, loopEntries: 0, snapshotLoop: null, snapshotPhase: null, snapshotFaults: 0,
                 fork: null, forkApplied: [], trust: null, env: null };
  const numKey = (k) => String(k).split('->').map(Number);
  const snapshotEntries = (phase) => {
    const keys = new Set([...inst.trust.pathAttempts.keys(), ...inst.trust.pathSuccesses.keys(), ...raw[phase].keys()].map(String));
    return [...keys].sort((x, y) => { const a = numKey(x), b = numKey(y); return a[0] - b[0] || a[1] - b[1] || (x < y ? -1 : x > y ? 1 : 0); })
      .map(k => [k, inst.trust.pathAttempts.get(k) || 0, inst.trust.pathSuccesses.get(k) || 0, raw[phase].get(k) || 0]);
  };
  const H = {
    on: true,
    trustMode,
    counters,
    isEdge,
    legalMove: (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b),
    uniform() { counters.armsSeen.add(arms.current().arm); const u = arms.usesUniformActionSelection(); if (u) counters.uniformDecisions++; return u; },
    qFrozen() { return !arms.allowsQUpdate(); },
    trustFrozen() { return !arms.allowsTrustUpdate(); },
    episodeCreditAllowed(key) { return trustMode === 'attemptGated' ? attempts.has(String(key)) : false; },
    noteAttempt(from, to) { if (trustMode === 'attemptGated') attempts.add(from + '->' + to); },
    episodeBoundary(kind) { attempts.clear(); if (kind in counters.resets) counters.resets[kind]++; if (H.measure) H.measure.reset(kind); },
    // ---- MS-1: measurement attachment and forwarding ----
    measure: null,
    instrument: inst,
    async attachMeasure(M) {
      if (H.measure) throw new Error('H1R: measurement already attached');
      inst.trust = await import(pathToFileURL(path.join(tree, 'render', 'trustMemory.js')).href);
      inst.env = await import(pathToFileURL(path.join(tree, 'experiments', 'm7', 'env.js')).href);
      inst.envDrawsSeen = inst.env.getCounters().envDraws;
      H.measure = M;
    },
    // M-LOOP: first statement of runAgentLoop
    loopEntry() {
      if (!H.measure) return;
      inst.loopEntries++;
      if (H.measure.count() !== SNAP_CALLS) return;
      if (inst.snapshotLoop !== null) { inst.snapshotFaults++; return; }
      inst.snapshotLoop = inst.loopEntries - 1; inst.snapshotPhase = inst.env.getPhase();
      H.measure.snapshot('tau1499', snapshotEntries(0));
    },
    // the driver calls this once, immediately after runOnce returns
    finalSnapshot() { if (H.measure) H.measure.snapshot('tau2999', snapshotEntries(1)); },
    // ---- MS-1: fork driver (v1.0 §8 link ④) ----
    armFork({ call, to = 'A2' } = {}) {
      if (!H.measure) throw new Error('H1R fork: the measurement must be attached (it supplies the call index)');
      if (inst.fork) throw new Error('H1R fork: already armed');
      if (!(call === null || (Number.isInteger(call) && call >= 0))) throw new Error(`H1R fork: call must be a non-negative integer or null, got ${call}`);
      if (to !== 'A2') throw new Error(`H1R fork: the pre-registered switch is to A2 only, got ${to}`);
      inst.fork = { call, to };
    },
    // M-FORK: first statement of runAgent
    beforeCall() {
      if (!inst.fork || inst.fork.call === null) return;
      const c = H.measure.count();
      if (c !== inst.fork.call) return;
      const cur = arms.current();
      if (cur.arm !== 'A1') throw new Error(`H1R fork: the run's arm is ${cur.arm}; the fork switches A1 to A2 only`);
      arms.configure({ arm: inst.fork.to, agentSeed: cur.agentSeed, trustOf: null });
      inst.forkApplied.push(c);
      H.measure.fork(c, inst.fork.to);
    },
    // R1: called once per tick at R1-DRAW-EARLY with the decision position, the intended node and
    // the outcome of the single environment draw. `r1` is the realised transition of this tick.
    r1: null,
    r1stats,
    noteR1(from, intended, traversed) {
      const f = from == null ? null : Number(from), v = intended == null ? null : Number(intended);
      const realised = (v === null || !traversed) ? f : v;
      const kind = v === null ? 'none' : (f === v ? 'self' : (!traversed ? 'slip' : 'move'));
      H.r1 = { from: f, intended: v, traversed: !!traversed, realised, kind };
      if (H.measure) {   // MS-1: one per-attempt record per environment draw (the draw happened in this statement)
        const d = inst.env.getCounters().envDraws, drew = d - inst.envDrawsSeen;
        inst.envDrawsSeen = d;
        if (drew > 1 || (drew === 1 && kind === 'none')) inst.drawFaults++;
        if (drew === 1) {
          const key = from + '->' + intended, tau = H.measure.count() - 1 - TAU0;
          const goal = globalThis.__M7_GOAL__ == null ? null : Number(globalThis.__M7_GOAL__);
          H.measure.attempt(f, v, !!traversed, goal !== null && v === goal,
            inst.trust.pathAttempts.get(key) || 0, inst.trust.pathSuccesses.get(key) || 0);
          if (tau >= 0 && tau < 2 * SHIFT) { const m = raw[tau < SHIFT ? 0 : 1]; m.set(key, (m.get(key) || 0) + 1); }
        }
      }
      if (kind === 'none') { r1stats.noDecision++; return; }
      r1stats.decisions++;
      if (kind === 'self') r1stats.selfNoop++;
      else { if (isEdge(f, v)) r1stats.edgeAttempts++; if (kind === 'slip') r1stats.slips++; else r1stats.realised++; }
    },
    // R3: read by the R3-ENV-SEED edit inside initRng. `applyEnvSeed` returns the seed to register and
    // records the application; it refuses an initRng seed other than the position's agent seed.
    envStream,
    envSeed: envStream ? envStream.envSeed : null,
    envSeedLog: [],
    applyEnvSeed(seed) {
      if (seed !== envStream.agentSeed) throw new Error(`H1R R3: initRng(${seed}) does not match the run's agent seed ${envStream.agentSeed}`);
      H.envSeedLog.push({ agentSeed: seed, envSeed: envStream.envSeed });
      return envStream.envSeed >>> 0;
    },
  };
  globalThis.__H1R__ = H;
  return H;
}

if (process.env.H1R === 'on' && process.env.H1R_TREE) {
  await installH1R({ tree: process.env.H1R_TREE, trustMode: process.env.H1R_TRUST_MODE || 'traversal' });
}

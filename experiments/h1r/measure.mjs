// ==========================================================
// H1-R — MEASUREMENT LAYER (v1.0 §8, §9; D-019 as amended by D-022; D-020)
// ==========================================================
// This module is the measurement sink. It references no global, imports only Node built-ins, and returns
// nothing the agent uses. Binding the sink to `globalThis.__H1R_MEASURE__` is done by measure_install.mjs.
//
// N5′ (D-019 §5): `score` is the pinned function, byte-exact `score(f, t) { S.push(f, t); }`, and `S` is
// private to this module and read only by `record()`.
//
// Sink methods, all observational. The call index is `calls - 1` at the time of the call (M-STEP opens a call):
//   step()                         M-STEP      one runAgent() call
//   reward(v)                      M-REWARD    the final rewardSignal of the call
//   score(f, t)                    M-SCORE     pre-clamp finalWeight and the trust term, every scoring call
//   candidate(step, key, returned, w, applied, arb, unc, ew, selfLoop)
//                                  M-CANDIDATE one per candidate-loop entry, every step, in scoring order
//   best(step, key)                M-BEST      bestChoice of that step's weight sort
//   decision(key)                  M-DECISION  the step-0 selection write
//   replay()                       M-REPLAY    the replay (else) branch was taken
//   floor()                        M-FLOOR     the A5 aggregate floor raised confidenceState
//   attempt(from, to, ok, goalEntering, a, s)   from the H1R runtime at each environment draw; a and s are the
//                                  raw trust-store attempts and successes of the key just before the attempt
//   reset(kind)                    from the H1R runtime at an episode boundary ('goal' | 'cap')
//   snapshot(label, entries)       from the H1R runtime: [[key, a, s, rawPhaseAttempts], ...]
//   fork(call, arm)                from the H1R runtime when an armed fork switch is applied
// ==========================================================
import crypto from 'node:crypto';

export const MEASURE_SCHEMA = 'h1r.measure/2';

export function createMeasure() {
  const S = [];                                 // N5′: score sink storage, read only by record()
  let calls = 0;
  const events = [];                            // [call, rewardSignal]
  let multi = 0, orphan = 0, nonFinite = 0, lastReward = -1;
  const candidates = [];                        // [call, step, key, returned, w] + step 0: [applied, arb[5]|null, unc, ew[6]|null, selfLoop]
  const bests = [];                             // [call, step, key, candidate count at the sort]
  const decisions = [];                         // [call, key]
  const replays = [];                           // call
  const floors = [];                            // call
  const attempts = [];                          // [call, from, to, ok, goalEntering, a, s]
  const resets = [];                            // [call, kind]
  const snapshots = [];                         // [label, calls, entries]
  const forks = [];                             // [call, arm]
  const cur = () => calls - 1;
  const arbOf = (a) => a ? [a.rewardScore, a.semanticScore, a.confidenceScore, a.curiosityScore, a.costScore] : null;
  const ewOf = (e) => e ? [e.wReward, e.wSemantic, e.wConfidence, e.wUncertainty, e.wCuriosity, e.wCost] : null;
  const M = {
    step() { calls++; },
    reward(v) {
      const i = cur();
      if (i < 0) { orphan++; return; }
      if (i === lastReward) multi++;
      lastReward = i;
      const x = Number(v);
      if (!Number.isFinite(x)) nonFinite++;
      events.push([i, x]);
    },
    score(f, t) { S.push(f, t); },
    candidate(step, key, returned, w, applied, arb, unc, ew, selfLoop) {
      candidates.push(step === 0
        ? [cur(), step, key, returned, w, applied ? 1 : 0, arbOf(arb), unc, ewOf(ew), selfLoop ? 1 : 0]
        : [cur(), step, key, returned, w]);
    },
    best(step, key) { bests.push([cur(), step, key, candidates.length]); },
    decision(key) { decisions.push([cur(), key]); },
    replay() { replays.push(cur()); },
    floor() { floors.push(cur()); },
    attempt(from, to, ok, goalEntering, a, s) { attempts.push([cur(), from, to, ok ? 1 : 0, goalEntering ? 1 : 0, a, s]); },
    reset(kind) { resets.push([cur(), kind]); },
    snapshot(label, entries) { snapshots.push([label, calls, entries.map(e => e.slice())]); },
    fork(call, arm) { forks.push([call, arm]); },
    count() { return calls; },
    record() {
      return {
        schema: MEASURE_SCHEMA, calls, eventCount: events.length, multi, orphan, nonFinite,
        events: events.map(e => [e[0], e[1]]),
        score: S.slice(),
        candidates: candidates.map(c => c.map(x => Array.isArray(x) ? x.slice() : x)),
        bests: bests.map(b => b.slice()), decisions: decisions.map(d => d.slice()), replays: replays.slice(),
        floors: floors.slice(), attempts: attempts.map(a => a.slice()), resets: resets.map(r => r.slice()),
        snapshots: snapshots.map(s => [s[0], s[1], s[2].map(e => e.slice())]), forks: forks.map(f => f.slice()),
      };
    },
    // reward-record digest (unchanged semantics since R2; M5 compares it across driver and recorder)
    digest() { return crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex'); },
  };
  return Object.freeze(M);
}

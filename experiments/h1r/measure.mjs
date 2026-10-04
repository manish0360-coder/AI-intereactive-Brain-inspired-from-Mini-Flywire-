// ==========================================================
// H1-R — MEASUREMENT LAYER (D-5): the pre-registered primary per-tick reward endpoint
// ==========================================================
// Observational only. The conformed main.js calls into this module from two guarded probes:
//   M-STEP    `__H1R_MEASURE__.step()`        once per runAgent() call, right after the E6 step site
//   M-REWARD  `__H1R_MEASURE__.reward(v)`     with the final rewardSignal of the tick, right before its
//                                             first consumer (updateLocalEmotion)
// Nothing here returns a value the agent uses, assigns agent state, branches the agent, or draws a
// random number. The record is the raw material of frozen M7 §8.5 ("sum of rewardSignal over window"):
// one entry per runAgent() call that computed a rewardSignal, keyed by its 0-based call index. Mapping
// call indices to the tick index tau and to windows is an ANALYSIS definition (pre-registration OPEN
// D-6) and is deliberately not done here.
//
//   import { installMeasure } from './measure.mjs';
//   const M = installMeasure();            // before the agent is imported
//   ... run ...
//   M.record()                             // { calls, events: [[callIndex, rewardSignal], ...], ... }
// ==========================================================
import crypto from 'node:crypto';

export const MEASURE_SCHEMA = 'h1r.measure/1';

export function installMeasure() {
  let calls = 0;                 // runAgent() calls seen (M-STEP)
  const events = [];             // [callIndex, rewardSignal]
  let multi = 0;                 // more than one reward on one call (must stay 0)
  let orphan = 0;                // reward before any step (must stay 0)
  let nonFinite = 0;             // non-finite reward values (must stay 0)
  let lastIndex = -1;
  const M = {
    step() { calls++; },
    reward(v) {
      const i = calls - 1;
      if (i < 0) { orphan++; return; }
      if (i === lastIndex) multi++;
      lastIndex = i;
      const x = Number(v);
      if (!Number.isFinite(x)) nonFinite++;
      events.push([i, x]);
    },
    record() {
      return { schema: MEASURE_SCHEMA, calls, eventCount: events.length, multi, orphan, nonFinite, events: events.map(e => [e[0], e[1]]) };
    },
    // a digest of the event list, for cross-checks that must not expose reward values
    digest() { return crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex'); },
  };
  globalThis.__H1R_MEASURE__ = M;
  return M;
}

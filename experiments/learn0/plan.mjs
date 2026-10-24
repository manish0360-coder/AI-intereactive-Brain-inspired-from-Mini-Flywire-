// ==========================================================
// LEARN-0 — the session plan (pure; no I/O).  Used by orchestrate.mjs and checked by the gate on index-derived world descriptors, so the
// plan's structure is verified WITHOUT generating the confirmatory block's configurations.
// ==========================================================
import * as C from './config.mjs';

export const trainLabel = (w) => `l0-T-w${w}`;
export const testLabel = (cell, w) => `l0-${cell}-w${w}`;
export const goalOfIndex = (i) => C.GOALS[i % C.GOALS.length];          // experiments/m7/env.js:166

/** worlds: [{ world, configSeed, configIndex, goal }] -> every session of the block, explicitly */
export function planSessions(worlds) {
  const s = [];
  for (const w of worlds) s.push({ phase: 'train', label: trainLabel(w.world), world: w.world, map: C.TRAINING.map, arm: null, agentSeed: C.trainSeed(w.world), configSeed: w.configSeed, configIndex: w.configIndex, goal: w.goal });
  for (const w of worlds) for (const c of C.CELLS) s.push({ phase: 'test', label: testLabel(c.name, w.world), world: w.world, cell: c.name, map: c.map, arm: c.arm, store: c.arm === 'COLD' ? null : trainLabel(w.world),
    agentSeed: C.testSeed(w.world), configSeed: w.configSeed, configIndex: w.configIndex, goal: w.goal });
  return s;
}

/** the block's world indices and their goals, derived from the index alone (no stream generation) */
export const blockIndices = () => Array.from({ length: C.WORLDS_N }, (_, k) => C.WORLD_START + k);

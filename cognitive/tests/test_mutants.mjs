// CF-01 tests — anti-vacuity: every named check must catch a mutant built to violate it
import assert from 'node:assert/strict';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, edgeKey } from '../testbed/worlds.mjs';
import { makeStream } from '../testbed/rng.mjs';
import { AGENTS, PRIVILEGED, agentOptions } from '../testbed/runner.mjs';
import {
  checkObservation, checkAgentSource, checkGlobals, checkPermutation, checkCRN, checkPrivilege,
  checkBlocked, checkGoalEntryDynamics, checkDeterminism,
} from '../testbed/checks.mjs';

const W = generateWorld('cf|dev|world|4');
const edge = W.edges.find(([u]) => W.adj[u].length >= 2);
const caught = (problems, name) => assert.ok(problems.length > 0, `mutant ${name} was not caught`);

/** A fake environment with one shared stream for every edge: outcomes depend on the order of other edges. */
function sharedStreamOutcomes(order, edges) {
  const rnd = makeStream('cf|mutant|shared'); const out = {};
  for (const idx of order) { const [u, v] = edges[idx]; (out[`${u}-${v}`] ??= []).push(rnd() < 0.5); }
  return out;
}

/** A fake environment whose goal-entering move skips the dynamics (the audit's leak L7). */
function goalBypassEnv(world) {
  let pos = null, reward = null; const rel = new Map();
  return {
    setRewardNode: (g) => { reward = g; }, setReliability: (u, v, p) => rel.set(edgeKey(u, v), p),
    reset: ({ start }) => { pos = start; return null; }, inspect: () => ({ pos }),
    step: (a) => { const v = world.exitOrder[pos][a]; const p = rel.get(edgeKey(pos, v)) ?? 1; if (v === reward || Math.random() < p) pos = v; return { reward: pos === reward ? 1 : 0 }; },
  };
}

class BlockIgnoringEnv extends GraphEnv { block() {} }

export const tests = [
  ['MUT-OBS-EXTRA: an observation carrying edges is caught by checkObservation', () => caught(checkObservation(Object.freeze({ node: 1, nActions: 2, goal: null, edges: [[1, 2]] })), 'OBS-EXTRA')],
  ['MUT-OBS-UNFROZEN: a mutable observation is caught', () => caught(checkObservation({ node: 1, nActions: 2, goal: null }), 'OBS-UNFROZEN')],
  ['MUT-OBS-DISTANCE: a non-integer goal (e.g. a distance object) is caught', () => caught(checkObservation(Object.freeze({ node: 1, nActions: 2, goal: { dist: 3 } })), 'OBS-DISTANCE')],
  ['MUT-IMPORT-ENV: an agent importing the environment is caught by checkAgentSource', () => caught(checkAgentSource("import { GraphEnv } from '../testbed/env.mjs';\nexport const x = 1;"), 'IMPORT-ENV')],
  ['MUT-IMPORT-WORLDS: an agent importing the worlds module is caught', () => caught(checkAgentSource("import { distancesTo } from '../testbed/worlds.mjs';"), 'IMPORT-WORLDS')],
  ['MUT-MATH-RANDOM: an agent using Math.random is caught', () => caught(checkAgentSource('export const f = () => Math.random();'), 'MATH-RANDOM')],
  ['MUT-CLOCK: an agent reading the clock is caught', () => caught(checkAgentSource('export const f = () => Date.now();'), 'CLOCK')],
  ['MUT-GLOBAL-READ: an agent reaching for globalThis is caught', () => caught(checkAgentSource('export const f = () => globalThis.__env;'), 'GLOBAL-READ')],
  ['MUT-DYNAMIC-IMPORT: an agent using dynamic import is caught', () => caught(checkAgentSource("export const f = async () => import('../testbed/env.mjs');"), 'DYNAMIC-IMPORT')],
  ['MUT-GLOBAL-WRITE: a module writing a global is caught by checkGlobals', () => {
    const before = Object.keys(globalThis); globalThis.__cfLeakMutant = 1;
    try { caught(checkGlobals(before, Object.keys(globalThis)), 'GLOBAL-WRITE'); } finally { delete globalThis.__cfLeakMutant; }
  }],
  ['MUT-IDENTITY-EXITS: identity-ordered exits are caught by checkPermutation', () => {
    caught(checkPermutation({ ...W, exitOrder: W.adj.map((nb) => [...nb]) }), 'IDENTITY-EXITS');
  }],
  ['MUT-IDENTITY-LABELS: labels equal to ids are caught by checkPermutation', () => {
    caught(checkPermutation({ ...W, labelOf: Array.from({ length: W.n }, (_, i) => i + 1) }), 'IDENTITY-LABELS');
  }],
  ['MUT-SHARED-STREAM: one random stream for all edges is caught by checkCRN', () => {
    const edges = W.edges.slice(0, 2);
    caught(checkCRN(sharedStreamOutcomes([0, 0, 1, 0, 1, 1, 0, 1], edges), sharedStreamOutcomes([1, 1, 0, 1, 0, 0, 1, 0], edges)), 'SHARED-STREAM');
  }],
  ['MUT-PRIVILEGE: granting the oracle to a learner is caught by checkPrivilege', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|mutant|priv' });
    caught(checkPrivilege(Object.keys(AGENTS), PRIVILEGED, (k) => ({ ...agentOptions(k, env, 'x'), oracle: { bestAction: () => 0 } })), 'PRIVILEGE');
  }],
  ['MUT-BLOCK-IGNORED: an environment that ignores block() is caught by checkBlocked', () => {
    caught(checkBlocked(new BlockIgnoringEnv(W, { seedLabel: 'cf|mutant|block' }), W, edge[0], edge[1]), 'BLOCK-IGNORED');
  }],
  ['MUT-GOAL-BYPASS: goal entry that skips the dynamics is caught by checkGoalEntryDynamics', () => {
    caught(checkGoalEntryDynamics(goalBypassEnv(W), W, edge[0], edge[1]), 'GOAL-BYPASS');
  }],
  ['MUT-NONDETERMINISM: an unseeded computation is caught by checkDeterminism', () => {
    const run = () => Array.from({ length: 5 }, () => Math.random());
    caught(checkDeterminism(run(), run()), 'NONDETERMINISM');
  }],
];

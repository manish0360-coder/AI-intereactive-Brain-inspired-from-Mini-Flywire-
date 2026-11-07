// ==========================================================
// CF-03 testbed — tasks v1: E1 and E3 (same layouts and phases as CF-01's tasks.mjs, with an injectable agent
// factory) and E1S, latent learning with hidden stochastic edges
// ==========================================================
// E1 / E3: identical to cognitive/testbed/tasks.mjs (parity is asserted by tests/test_v1.mjs for the CF-01 kinds).
// E1S: the E1 layout and phases; every edge's hidden reliability is 0.5 + 0.5 * u, u drawn per edge (in the world's
// sorted edge order) from `${world}|E1S|rel`.  Arm EXPLORED only.  ORACLE ignores reliabilities, so it is not an
// upper bound on E1S.
// Agents that expose inspect().compute / .quality have them copied into the row's secondary record.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { makeStream } from './rng.mjs';
import { layout, TASK_PARAMS } from './tasks.mjs';
import { runEpisode, runSteps } from './runner.mjs';
import { makeAgentForV1 } from './registry_v1.mjs';

export const TASKS_V1 = Object.freeze(['E1', 'E3', 'E1S']);
export const ARMS_V1 = Object.freeze({ E1: ['EXPLORED', 'NAIVE'], E3: ['STD'], E1S: ['EXPLORED'] });
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function reliabilities(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E1S|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

export function runTaskV1({ task, world, worldLabel, kind, arm = 'STD', params = {}, makeAgent = makeAgentForV1 }) {
  const L = layout(task === 'E1S' ? 'E1' : task, world, worldLabel);
  if (!L) return { task, world: worldLabel, kind, arm, excluded: true };
  const P = TASK_PARAMS[task === 'E1S' ? 'E1' : task];
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|${task}|env`, maxSteps: P.cap });
  const agent = makeAgent(kind, env, `${worldLabel}|${task}|agent`, params[kind] ?? {});
  const test = [];
  const secondary = {};
  if (task === 'E1' || task === 'E1S') {
    if (task === 'E1S') for (const [u, v, p] of reliabilities(world, worldLabel)) env.setReliability(u, v, p);
    if (arm === 'EXPLORED') {
      env.setRewardNode(null); env.setCue(null);
      runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
    } else if (arm !== 'NAIVE' || task === 'E1S') throw new Error(`${task} has no arm ${arm}`);
    env.setRewardNode(L.goal); env.setCue(L.goal);
    for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
  } else if (task === 'E3') {
    env.setRewardNode(L.goal1); env.setCue(null);
    for (let e = 0; e < P.trainEpisodes; e++) runEpisode(env, agent, { start: L.start });
    const first = env.inspect().episode + 1;
    env.setRewardNode(L.goal2);
    for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
    secondary.oldGoalArrivals = env.trace().filter(([ep, , s, , s2]) => ep >= first && s2 === L.goal1 && s !== L.goal1).length;
  } else throw new Error(`unknown task ${task}`);
  if (typeof agent.inspect === 'function') {
    const info = agent.inspect();
    if (info.compute) secondary.compute = info.compute;
    if (info.quality) secondary.quality = info.quality;
    if (info.model) secondary.model = info.model;
  }
  return { task, world: worldLabel, kind, arm, layout: L, testSteps: test.map((r) => r.steps), metric: sum(test.map((r) => r.steps)), censored: test.filter((r) => r.truncated).length, secondary };
}

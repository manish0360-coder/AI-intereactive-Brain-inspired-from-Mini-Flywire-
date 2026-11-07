// ==========================================================
// CF-01 testbed — battery v0: E1 latent learning, E2 detour, E3 reward relocation (protocol §3)
// ==========================================================
// layout(task, world, worldLabel) chooses start, goal(s) and the blocked edge from the world's own layout stream;
// it returns null when the world admits no valid layout (the world is then excluded and recorded).
// runTask(...) runs one agent on one task in one world and returns one result row.  Seed labels:
//   environment  `${worldLabel}|${task}|env`    (shared by every agent and arm: common random numbers)
//   agent        `${worldLabel}|${task}|agent`  (same label for every agent kind and arm)
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { makeAgentFor, runEpisode, runSteps } from './runner.mjs';

export const TASK_PARAMS = Object.freeze({
  E1: Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, testEpisodes: 5, cap: 200, minDistance: 3 }),
  E2: Object.freeze({ trainEpisodes: 40, testEpisodes: 3, cap: 200, minDistance: 3 }),
  E3: Object.freeze({ trainEpisodes: 30, testEpisodes: 5, cap: 200, minDistanceG1: 2, minDistanceG2: 3 }),
});
export const TASKS = Object.freeze(Object.keys(TASK_PARAMS));
export const ARMS = Object.freeze({ E1: ['EXPLORED', 'NAIVE'], E2: ['STD'], E3: ['STD'] });

const nodesOf = (world) => Array.from({ length: world.n }, (_, i) => i);

export function layout(task, world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|${task}|layout`);
  const dist = nodesOf(world).map((t) => distancesTo(world, t));
  const P = TASK_PARAMS[task];
  const pairs = shuffled(nodesOf(world).flatMap((s) => nodesOf(world).map((g) => [s, g])), rnd);
  if (task === 'E1') {
    const p = pairs.find(([s, g]) => dist[g][s] >= P.minDistance);
    return p ? { start: p[0], goal: p[1], distance: dist[p[1]][p[0]] } : null;
  }
  if (task === 'E2') {
    for (const [s, g] of pairs) {
      const d = dist[g][s];
      if (d < P.minDistance) continue;
      const onPath = shuffled(world.edges.filter(([u, v]) => (dist[s][u] + 1 + dist[g][v] === d) || (dist[s][v] + 1 + dist[g][u] === d)), rnd);
      for (const [u, v] of onPath) {
        const d2 = distancesTo(world, g, new Set([edgeKey(u, v)]))[s];
        if (d2 > d) return { start: s, goal: g, blocked: [u, v], distance: d, detourDistance: d2 };
      }
    }
    return null;
  }
  if (task === 'E3') {
    for (const [s, g1] of pairs) {
      const d1 = dist[g1][s];
      if (d1 < P.minDistanceG1) continue;
      const g2 = shuffled(nodesOf(world), rnd).find((x) => x !== g1 && x !== s && dist[x][s] >= P.minDistanceG2 && dist[s][x] + dist[g1][x] !== d1);
      if (g2 !== undefined) return { start: s, goal1: g1, goal2: g2, distance1: d1, distance2: dist[g2][s] };
    }
    return null;
  }
  throw new Error(`unknown task ${task}`);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runTask({ task, world, worldLabel, kind, arm = 'STD', params = {} }) {
  const L = layout(task, world, worldLabel);
  if (!L) return { task, world: worldLabel, kind, arm, excluded: true };
  const P = TASK_PARAMS[task];
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|${task}|env`, maxSteps: P.cap });
  const agent = makeAgentFor(kind, env, `${worldLabel}|${task}|agent`, params[kind] ?? {});
  const test = [];
  const secondary = {};
  if (task === 'E1') {
    if (arm === 'EXPLORED') {
      env.setRewardNode(null); env.setCue(null);
      runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
    } else if (arm !== 'NAIVE') throw new Error(`E1 has no arm ${arm}`);
    env.setRewardNode(L.goal); env.setCue(L.goal);
    for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
  } else if (task === 'E2') {
    env.setRewardNode(L.goal); env.setCue(L.goal);
    for (let e = 0; e < P.trainEpisodes; e++) runEpisode(env, agent, { start: L.start });
    const first = env.inspect().episode + 1;
    env.block(...L.blocked);
    for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
    const [u, v] = L.blocked;
    secondary.blockedAttempts = env.trace().filter(([ep, , s, a]) => ep >= first && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  } else {
    env.setRewardNode(L.goal1); env.setCue(null);
    for (let e = 0; e < P.trainEpisodes; e++) runEpisode(env, agent, { start: L.start });
    const first = env.inspect().episode + 1;
    env.setRewardNode(L.goal2);
    for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
    secondary.oldGoalArrivals = env.trace().filter(([ep, , s, , s2]) => ep >= first && s2 === L.goal1 && s !== L.goal1).length;
  }
  return { task, world: worldLabel, kind, arm, layout: L, testSteps: test.map((r) => r.steps), metric: sum(test.map((r) => r.steps)), censored: test.filter((r) => r.truncated).length, secondary };
}

// ==========================================================
// CF-01b — task E2′: detour after pre-exposure (Tolman's question: can a known map be used to build a detour?)
// ==========================================================
// Phases (protocol §3 E2, redesigned under CD-010):
//   A  pre-exposure   600 steps, no reward, no cue, episodes of 50 steps from the start stream
//   B  training       goal G cued and rewarded, 40 episodes from S, d(S,G) >= 3
//   C  test           3 episodes from S after the arm's manipulation
// Arms:
//   PRE      A -> B -> block e (an edge on a shortest S->G path whose removal raises d(S,G)) -> C
//   NOPRE    B -> block e -> C                     (the CF-01 E2 design; within-agent control for pre-exposure)
//   SHAM     A -> B -> block a sham edge (on no shortest S->G path; d(S,G) unchanged) -> C   (disruption control)
//   NOBLOCK  A -> B -> C                           (no manipulation)
// Seeds: environment `${world}|E2P|env`, agent `${world}|E2P|agent`, layout `${world}|E2P|layout` (shared by every
// arm and agent kind: common random numbers).  `makeAgent` is injectable so later milestones can run new agents on
// this unchanged task; it defaults to the CF-01 registry.
// Coverage (arms with phase A): share of detour edges (edges on a shortest S->G path once e is blocked) attempted in
// phase A, in either direction.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { makeAgentFor, runEpisode, runSteps } from './runner.mjs';

export const E2P_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 40, testEpisodes: 3, cap: 200, minDistance: 3 });
export const E2P_ARMS = Object.freeze(['PRE', 'NOPRE', 'SHAM', 'NOBLOCK']);

const onShortest = (dist, s, g, d, [u, v]) => dist[s][u] + 1 + dist[g][v] === d || dist[s][v] + 1 + dist[g][u] === d;

export function layoutE2P(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E2P|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const dist = nodes.map((t) => distancesTo(world, t));
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  for (const [s, g] of pairs) {
    const d = dist[g][s];
    if (d < E2P_PARAMS.minDistance) continue;
    const blocked = shuffled(world.edges.filter((e) => onShortest(dist, s, g, d, e)), rnd)
      .find(([u, v]) => distancesTo(world, g, new Set([edgeKey(u, v)]))[s] > d);
    if (!blocked) continue;
    const sham = shuffled(world.edges.filter((e) => !onShortest(dist, s, g, d, e)), rnd)[0];
    if (!sham) continue;
    const cut = new Set([edgeKey(...blocked)]);
    const dS = distancesTo(world, s, cut), dG = distancesTo(world, g, cut);
    const d2 = dG[s];
    const detourEdges = world.edges.filter(([u, v]) => !cut.has(edgeKey(u, v)) && (dS[u] + 1 + dG[v] === d2 || dS[v] + 1 + dG[u] === d2)).map(([u, v]) => edgeKey(u, v));
    return { start: s, goal: g, blocked, sham, distance: d, detourDistance: d2, detourEdges };
  }
  return null;
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE2P({ world, worldLabel, kind, arm, params = {}, makeAgent = makeAgentFor }) {
  if (!E2P_ARMS.includes(arm)) throw new Error(`E2P has no arm ${arm}`);
  const L = layoutE2P(world, worldLabel);
  if (!L) return { task: 'E2P', world: worldLabel, kind, arm, excluded: true };
  const P = E2P_PARAMS;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E2P|env`, maxSteps: P.cap });
  const agent = makeAgent(kind, env, `${worldLabel}|E2P|agent`, params[kind] ?? {});
  const secondary = {};
  if (arm !== 'NOPRE') {
    env.setRewardNode(null); env.setCue(null);
    runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
    const detour = new Set(L.detourEdges);
    const tried = new Set(env.trace().map(([, , s, a]) => edgeKey(s, world.exitOrder[s][a])).filter((k) => detour.has(k)));
    secondary.coverage = detour.size ? tried.size / detour.size : null;
  }
  env.setRewardNode(L.goal); env.setCue(L.goal);
  for (let e = 0; e < P.trainEpisodes; e++) runEpisode(env, agent, { start: L.start });
  const first = env.inspect().episode + 1;
  if (arm === 'PRE' || arm === 'NOPRE') env.block(...L.blocked);
  if (arm === 'SHAM') env.block(...L.sham);
  const test = [];
  for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
  if (arm === 'PRE' || arm === 'NOPRE') {
    const [u, v] = L.blocked;
    secondary.blockedAttempts = env.trace().filter(([ep, , s, a]) => ep >= first && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  }
  if (typeof agent.inspect === 'function' && agent.inspect().compute) secondary.compute = agent.inspect().compute;
  return { task: 'E2P', world: worldLabel, kind, arm, layout: L, testSteps: test.map((r) => r.steps), metric: sum(test.map((r) => r.steps)), censored: test.filter((r) => r.truncated).length, secondary };
}

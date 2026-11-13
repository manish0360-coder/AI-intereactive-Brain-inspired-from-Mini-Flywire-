// ==========================================================
// CF-04 testbed — task E4: hidden change and its reversal, on stochastic worlds
// ==========================================================
// The agent is never told that anything changed.  Edge reliabilities are hidden and drawn U[0.5, 1] per edge (the
// E1S distribution, stream `${world}|E4|rel`).  Layout: start S, goal G, a blocked edge e on a shortest S->G path
// whose removal lengthens the route, and a sham edge on no shortest path (the E2' layout rule, stream
// `${world}|E4|layout`).
//
// Phases:
//   A  pre-exposure   600 steps, no reward, no cue, 50-step episodes from the start stream
//   B  training       goal G cued and rewarded, TRAIN episodes from S
//   C  change         the arm's manipulation, then POST episodes from S         (regime B)
//   D  reversal       the manipulation is undone, then RETURN episodes from S   (regime A again)
// Arms:
//   CHANGE   block e before C, unblock e before D
//   SHAM     block the sham edge before C, unblock it before D (the shortest route never changes)
// Windows (steps summed over the episodes of the window; a truncated episode counts its cap):
//   post      the first POST_WINDOW episodes of C   — how fast the agent adapts to the block
//   postAll   all episodes of C
//   return    all episodes of D                     — whether the agent recovers the short route once it reopens
//   stable    the last STABLE episodes of B         — performance before anything changes
// Seeds: environment `${world}|E4|env`, agent `${world}|E4|agent` (shared by every arm and agent kind: common random
// numbers).  Agents that expose inspect().control have it copied into the row.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { runEpisode, runSteps } from './runner.mjs';

export const E4_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 30, postEpisodes: 15, returnEpisodes: 15, postWindow: 3, stableEpisodes: 5, cap: 200, minDistance: 3 });
export const E4_ARMS = Object.freeze(['CHANGE', 'SHAM']);

const onShortest = (dist, s, g, d, [u, v]) => dist[s][u] + 1 + dist[g][v] === d || dist[s][v] + 1 + dist[g][u] === d;

export function layoutE4(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E4|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const dist = nodes.map((t) => distancesTo(world, t));
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  for (const [s, g] of pairs) {
    const d = dist[g][s];
    if (d < E4_PARAMS.minDistance) continue;
    const blocked = shuffled(world.edges.filter((e) => onShortest(dist, s, g, d, e)), rnd)
      .find(([u, v]) => { const d2 = distancesTo(world, g, new Set([edgeKey(u, v)]))[s]; return d2 > d; });
    if (!blocked) continue;
    const sham = shuffled(world.edges.filter((e) => !onShortest(dist, s, g, d, e)), rnd)[0];
    if (!sham) continue;
    return { start: s, goal: g, blocked, sham, distance: d, detourDistance: distancesTo(world, g, new Set([edgeKey(...blocked)]))[s] };
  }
  return null;
}

export function reliabilitiesE4(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E4|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE4({ world, worldLabel, kind, arm, params = {}, makeAgent }) {
  if (!E4_ARMS.includes(arm)) throw new Error(`E4 has no arm ${arm}`);
  const L = layoutE4(world, worldLabel);
  if (!L) return { task: 'E4', world: worldLabel, kind, arm, excluded: true };
  const P = E4_PARAMS;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E4|env`, maxSteps: P.cap });
  for (const [u, v, p] of reliabilitiesE4(world, worldLabel)) env.setReliability(u, v, p);
  const agent = makeAgent(kind, env, `${worldLabel}|E4|agent`, params[kind] ?? {});
  const edge = arm === 'CHANGE' ? L.blocked : L.sham;
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: L.start }));
  const train = run(P.trainEpisodes);
  env.block(...edge);
  const post = run(P.postEpisodes);
  const firstReturn = env.inspect().episode + 1;
  env.unblock(...edge);
  const back = run(P.returnEpisodes);
  const [u, v] = edge;
  const usedReopened = env.trace().filter(([ep, , s, a, s2]) => ep >= firstReturn && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const steps = (xs) => sum(xs.map((r) => r.steps));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E4', world: worldLabel, kind, arm, layout: L,
    windows: { stable: steps(train.slice(-P.stableEpisodes)), post: steps(post.slice(0, P.postWindow)), postAll: steps(post), return: steps(back), returnLast: steps(back.slice(-P.stableEpisodes)) },
    metric: steps(post) + steps(back),
    censored: [...train, ...post, ...back].filter((r) => r.truncated).length,
    secondary: { usedReopened, control: info.control ?? null, compute: info.compute ?? null, model: info.model ?? null },
  };
}

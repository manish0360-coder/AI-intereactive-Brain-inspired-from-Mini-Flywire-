// ==========================================================
// CF-06 testbed — task E5: a world whose changes sometimes reverse, at a rate set by the world's family
// ==========================================================
// The question behind it (hypothesis H-VOL): can an agent learn from its own experience how often changes in its
// world reverse, and so re-test an abandoned exit only where that pays?  CF-05b showed that a fixed willingness to
// re-test helps when changes reverse and costs when they do not; E5 makes the reversal rate a property of the world
// that an agent can only learn by living in it.
//
// Hidden per-edge reliabilities U[0.5, 1] (stream `${world}|E5|rel`).  Start S and goal G at distance >= 3 (stream
// `${world}|E5|layout`).  Phases:
//   A  pre-exposure   600 steps, no reward, no cue, 50-step episodes from the start stream
//   B  training       goal G cued and rewarded, 30 episodes from S
//   then EVENTS change events, each:
//      block    an edge on a currently shortest S->G route is blocked without notice (its removal keeps G reachable);
//               BLOCK episodes from S
//      verdict  with probability p (the family's reversal rate) the block is removed without notice; otherwise it
//               stays for the rest of the run
//      after    AFTER episodes from S
// The whole schedule (which edge, whether it reverses) is drawn in advance from `${world}|E5|${family}|events`, from
// the true graph only, so it is identical for every agent in a world and family (common random numbers).  An event
// with no admissible edge is skipped and recorded.
//
// Windows (steps summed over episodes; a capped episode counts its cap): blocked (all BLOCK episodes), after (all
// AFTER episodes), afterReversed / afterPermanent (AFTER episodes of reversed / permanent events), total.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { distancesTo, edgeKey } from './worlds.mjs';
import { makeStream, shuffled } from './rng.mjs';
import { runEpisode, runSteps } from './runner.mjs';

export const E5_PARAMS = Object.freeze({ exploreSteps: 600, exploreEpisodeLength: 50, trainEpisodes: 30, events: 6, blockEpisodes: 10, afterEpisodes: 10, cap: 200, minDistance: 3 });
export const E5_FAMILIES = Object.freeze({ RARE: 0.1, HALF: 0.5, OFTEN: 0.9 });

/** The start, goal and the full change schedule for one world and family, from the true graph only. */
export function planE5(world, worldLabel, family, P = E5_PARAMS) {
  const p = E5_FAMILIES[family];
  if (p === undefined) throw new Error(`unknown E5 family ${family}`);
  const rnd = makeStream(`${worldLabel}|E5|layout`);
  const nodes = Array.from({ length: world.n }, (_, i) => i);
  const pairs = shuffled(nodes.flatMap((s) => nodes.map((g) => [s, g])), rnd);
  const pick = pairs.find(([s, g]) => distancesTo(world, g)[s] >= P.minDistance);
  if (!pick) return null;
  const [start, goal] = pick;
  const ev = makeStream(`${worldLabel}|E5|${family}|events`);
  const permanent = new Set(), events = [];
  for (let k = 0; k < P.events; k++) {
    const dG = distancesTo(world, goal, permanent), dS = distancesTo(world, start, permanent), d = dG[start];
    const onRoute = world.edges.filter(([u, v]) => !permanent.has(edgeKey(u, v)) && (dS[u] + 1 + dG[v] === d || dS[v] + 1 + dG[u] === d));
    const admissible = shuffled(onRoute, ev).filter(([u, v]) => distancesTo(world, goal, new Set([...permanent, edgeKey(u, v)]))[start] >= 0);
    const reverses = ev() < p;                        // drawn whether or not the event is admissible, so draws stay aligned
    if (!admissible.length) { events.push({ skipped: true }); continue; }
    const edge = admissible[0];
    events.push({ edge, reverses });
    if (!reverses) permanent.add(edgeKey(...edge));
  }
  return { start, goal, family, p, events };
}

export function reliabilitiesE5(world, worldLabel) {
  const rnd = makeStream(`${worldLabel}|E5|rel`);
  return world.edges.map(([u, v]) => [u, v, 0.5 + 0.5 * rnd()]);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE5({ world, worldLabel, family, kind, params = {}, makeAgent, P = E5_PARAMS }) {
  const plan = planE5(world, worldLabel, family, P);
  if (!plan) return { task: 'E5', world: worldLabel, family, kind, excluded: true };
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E5|env`, maxSteps: P.cap });
  for (const [u, v, q] of reliabilitiesE5(world, worldLabel)) env.setReliability(u, v, q);
  const agent = makeAgent(kind, env, `${worldLabel}|E5|agent`, params[kind] ?? {});
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(plan.goal); env.setCue(plan.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: plan.start }));
  const train = run(P.trainEpisodes);
  const perEvent = [];
  for (const e of plan.events) {
    if (e.skipped) { perEvent.push({ skipped: true }); continue; }
    env.block(...e.edge);
    const blocked = run(P.blockEpisodes);
    const first = env.inspect().episode + 1;
    if (e.reverses) env.unblock(...e.edge);
    const after = run(P.afterEpisodes);
    const [u, v] = e.edge;
    const crossed = e.reverses ? env.trace().filter(([ep, , s, a, s2]) => ep >= first && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length : 0;
    perEvent.push({ reverses: e.reverses, blocked: sum(blocked.map((r) => r.steps)), after: sum(after.map((r) => r.steps)), crossed, capped: [...blocked, ...after].filter((r) => r.truncated).length });
  }
  const live = perEvent.filter((e) => !e.skipped);
  const pick = (f) => sum(live.filter(f).map((e) => e.after));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E5', world: worldLabel, family, kind, start: plan.start, goal: plan.goal,
    events: perEvent, reversedEvents: live.filter((e) => e.reverses).length, permanentEvents: live.filter((e) => !e.reverses).length, skippedEvents: perEvent.length - live.length,
    windows: { train: sum(train.slice(-5).map((r) => r.steps)), blocked: sum(live.map((e) => e.blocked)), after: sum(live.map((e) => e.after)), afterReversed: pick((e) => e.reverses), afterPermanent: pick((e) => !e.reverses) },
    metric: sum(live.map((e) => e.blocked + e.after)),
    censored: [...train].filter((r) => r.truncated).length + sum(live.map((e) => e.capped)),
    secondary: { compute: info.compute ?? null, model: info.model ?? null, recovery: info.recovery ?? null, volatility: info.volatility ?? null },
  };
}

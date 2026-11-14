// ==========================================================
// CF-05 testbed — task E4B: task E4 with a third arm and a size option (task_e4.mjs is frozen and unedited)
// ==========================================================
// E4B uses E4's layout, reliabilities, phases, windows and seed labels unchanged, so the CHANGE and SHAM arms give
// exactly the rows of E4 (asserted by tests/test_recovery.mjs).  It adds:
//
//   arm PERMANENT   the edge on the route is blocked before phase C and is NEVER reopened.  Phase D then runs with
//                   the block still in place.  Any mechanism that re-tests abandoned exits is pure cost here: this
//                   arm measures what such a mechanism pays when a change is permanent.
//
//   exploreSteps    the length of the unrewarded pre-exposure, so the same task can be run on larger worlds
//                   (the caller generates the world; E4's 600 steps are for 24 nodes).
//
//   context         makeAgent receives a fifth argument { manipulatedPairs }: the (observation label, action index)
//                   pairs of the edge the arm manipulates, in both directions.  This is ground truth.  It exists
//                   only so that DIAGNOSTIC arms can be told which change was real; an agent arm that reads it is
//                   privileged and must be labelled as such.  Learner arms ignore it.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { runEpisode, runSteps } from './runner.mjs';
import { layoutE4, reliabilitiesE4, E4_PARAMS } from './task_e4.mjs';

export const E4B_ARMS = Object.freeze(['CHANGE', 'SHAM', 'PERMANENT']);

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE4B({ world, worldLabel, kind, arm, params = {}, makeAgent, exploreSteps = E4_PARAMS.exploreSteps }) {
  if (!E4B_ARMS.includes(arm)) throw new Error(`E4B has no arm ${arm}`);
  const L = layoutE4(world, worldLabel);
  if (!L) return { task: 'E4B', world: worldLabel, kind, arm, excluded: true };
  const P = E4_PARAMS;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E4|env`, maxSteps: P.cap });
  for (const [u, v, p] of reliabilitiesE4(world, worldLabel)) env.setReliability(u, v, p);
  const edge = arm === 'SHAM' ? L.sham : L.blocked;
  const [u, v] = edge;
  const manipulatedPairs = [`${world.labelOf[u]}|${world.exitOrder[u].indexOf(v)}`, `${world.labelOf[v]}|${world.exitOrder[v].indexOf(u)}`];
  const agent = makeAgent(kind, env, `${worldLabel}|E4|agent`, params[kind] ?? {}, Object.freeze({ manipulatedPairs }));
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: exploreSteps, episodeLength: P.exploreEpisodeLength });
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const run = (n) => Array.from({ length: n }, () => runEpisode(env, agent, { start: L.start }));
  const train = run(P.trainEpisodes);
  env.block(...edge);
  const post = run(P.postEpisodes);
  const firstReturn = env.inspect().episode + 1;
  if (arm !== 'PERMANENT') env.unblock(...edge);
  const back = run(P.returnEpisodes);
  const usedReopened = env.trace().filter(([ep, , s, a, s2]) => ep >= firstReturn && s !== s2 && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const triedManipulated = env.trace().filter(([ep, , s, a]) => ep >= firstReturn && ((s === u && world.exitOrder[s][a] === v) || (s === v && world.exitOrder[s][a] === u))).length;
  const steps = (xs) => sum(xs.map((r) => r.steps));
  const info = typeof agent.inspect === 'function' ? agent.inspect() : {};
  return {
    task: 'E4B', world: worldLabel, kind, arm, layout: L,
    windows: { stable: steps(train.slice(-P.stableEpisodes)), post: steps(post.slice(0, P.postWindow)), postAll: steps(post), return: steps(back), returnLast: steps(back.slice(-P.stableEpisodes)) },
    metric: steps(post) + steps(back),
    censored: [...train, ...post, ...back].filter((r) => r.truncated).length,
    secondary: { usedReopened, triedManipulated, control: info.control ?? null, compute: info.compute ?? null, model: info.model ?? null, recovery: info.recovery ?? null },
  };
}

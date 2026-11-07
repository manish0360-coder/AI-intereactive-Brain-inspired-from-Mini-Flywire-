// ==========================================================
// CF-01 testbed — agent registry, the privileged-channel rule, and episode loops
// ==========================================================
// agentOptions() is the single place that decides what an agent receives: its seeded stream, its parameters, and,
// only for kinds listed in PRIVILEGED, the oracle channel.  Agents never receive the environment or the world.
// Transitions handed to agent.observe are frozen; observations are frozen by the environment.
// ==========================================================
import { makeStream } from './rng.mjs';
import { makeRandom } from '../agents/random.mjs';
import { makeQL } from '../agents/ql.mjs';
import { makeDynaQ } from '../agents/dynaq.mjs';
import { makeOracle } from '../agents/oracle.mjs';

export const AGENTS = Object.freeze({ RANDOM: makeRandom, QL: makeQL, DYNAQ: makeDynaQ, ORACLE: makeOracle });
export const AGENT_FILES = Object.freeze(['random.mjs', 'ql.mjs', 'dynaq.mjs', 'oracle.mjs']);
export const PRIVILEGED = Object.freeze(['ORACLE']);

export function agentOptions(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentFor(kind, env, rngLabel, params = {}) {
  const factory = AGENTS[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptions(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

/** One episode from `start` (null = the environment's start stream), at most maxSteps steps. */
export function runEpisode(env, agent, { start = null, maxSteps = null } = {}) {
  let obs = env.reset({ start, maxSteps });
  let steps = 0;
  for (;;) {
    const action = agent.act(obs);
    const { obs: next, reward, done, truncated } = env.step(action);
    agent.observe(Object.freeze({ obs, action, reward, next, done, truncated }));
    steps++;
    obs = next;
    if (done || truncated) return { steps, done, truncated };
  }
}

/** `total` steps as consecutive episodes of at most `episodeLength` steps from the start stream (exploration phases). */
export function runSteps(env, agent, { total, episodeLength }) {
  let used = 0, episodes = 0;
  while (used < total) {
    const r = runEpisode(env, agent, { start: null, maxSteps: Math.min(episodeLength, total - used) });
    used += r.steps; episodes++;
  }
  return { steps: used, episodes };
}

// ==========================================================
// CF-03c testbed — agent registry v3: the v2 agents plus MBVI3 (world model v3)
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// v1 and v2 kinds are built by their unchanged factories, so their behaviour is identical under any registry.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V2 } from './registry_v2.mjs';
import { makeMBVI3 } from '../mind/v3/agent.mjs';

export const MBVI3_VARIANTS = Object.freeze({
  MBVI3: Object.freeze({}),
  MBVI3_NOCHANGE: Object.freeze({ resets: false }),   // no change detection (transition or reward)
});
export const MIND3_FILES = Object.freeze(['agent.mjs', 'numerics.mjs', 'world_model.mjs']);
export const MIND3_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../../core/planner.mjs', './world_model.mjs', './numerics.mjs']);
export const AGENTS_V3 = Object.freeze({
  ...AGENTS_V2,
  ...Object.fromEntries(Object.entries(MBVI3_VARIANTS).map(([k, v]) => [k, (opts) => makeMBVI3({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
});

export function agentOptionsV3(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV3(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V3[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV3(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

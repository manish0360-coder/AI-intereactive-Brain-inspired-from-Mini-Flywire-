// ==========================================================
// CF-03b testbed — agent registry v2: the v1 agents plus MBVI2 and its pre-declared ablations
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// v1 kinds are built by the unchanged v1 factories, so their behaviour is identical under either registry.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V1 } from './registry_v1.mjs';
import { makeMBVI2 } from '../mind/mbvi2.mjs';

export const MBVI2_VARIANTS = Object.freeze({
  MBVI2: Object.freeze({}),
  MBVI2_NOPOOL: Object.freeze({ pool: false }),                  // fixed prior Beta(1, 1): no learning across pairs
  MBVI2_NOBLOCK: Object.freeze({ piBlock: 0 }),                  // no impassable-exit component
  MBVI2_GLOBALRESET: Object.freeze({ globalRewardReset: true }), // the CF-03 global reward change-point
});
export const MIND_FILES = Object.freeze(['mbvi2.mjs', 'world_model.mjs']);
export const MIND_ALLOWED = Object.freeze(['../testbed/agent_util.mjs', '../core/planner.mjs', './world_model.mjs']);
export const AGENTS_V2 = Object.freeze({
  ...AGENTS_V1,
  ...Object.fromEntries(Object.entries(MBVI2_VARIANTS).map(([k, v]) => [k, (opts) => makeMBVI2({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
});

export function agentOptionsV2(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV2(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V2[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV2(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

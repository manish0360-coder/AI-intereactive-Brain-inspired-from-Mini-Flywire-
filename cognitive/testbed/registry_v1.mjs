// ==========================================================
// CF-03 testbed — agent registry v1: the CF-01 agents plus MBVI and its pre-declared ablations
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// CF-01 kinds are built by the unchanged CF-01 factories, so their behaviour is identical under either registry.
// ==========================================================
import { makeStream } from './rng.mjs';
import { AGENTS as BASE, PRIVILEGED } from './runner.mjs';
import { makeMBVI } from '../core/mbvi.mjs';

export const MBVI_VARIANTS = Object.freeze({
  MBVI: Object.freeze({}),
  MBVI_NOOPT: Object.freeze({ vOpt: 0, epsilon: 0.1 }),          // no optimism; undirected epsilon exploration
  MBVI_NORESET: Object.freeze({ resets: false }),                 // stationary model, no change detection
  MBVI_LOCALRESET: Object.freeze({ globalRewardReset: false }),   // reward change-point local to one state
  MBVI_B1: Object.freeze({ budget: 1 }),                          // one value-iteration sweep per decision
});
export const CORE_FILES = Object.freeze(['mbvi.mjs', 'planner.mjs', 'world_model.mjs']);
export const AGENTS_V1 = Object.freeze({
  ...BASE,
  ...Object.fromEntries(Object.entries(MBVI_VARIANTS).map(([k, v]) => [k, (opts) => makeMBVI({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
});

export function agentOptionsV1(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV1(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V1[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV1(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

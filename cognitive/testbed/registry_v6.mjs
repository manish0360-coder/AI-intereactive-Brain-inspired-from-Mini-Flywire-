// ==========================================================
// CF-06 testbed — agent registry v6: the v5 agents plus VOL (world model v6, learned reversal rate)
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.
//   VOL          rho learned from experience (the mechanism under test)
//   VOL_RHO      rho fixed by the caller (params.rhoFixed); with the family's true reversal rate it is the reference
//                for what learning rho could achieve.  That value is task knowledge, so such an arm is labelled
//                privileged by whoever builds it and is never a learner arm.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V5 } from './registry_v5.mjs';
import { makeVOL } from '../mind/v6/agent.mjs';

export const VOL_VARIANTS = Object.freeze({
  VOL: Object.freeze({ rhoFixed: null }),
  VOL_RHO: Object.freeze({}),
});
export const MIND6_FILES = Object.freeze(['agent.mjs', 'world_model.mjs']);
export const MIND6_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../../core/planner.mjs', './world_model.mjs', '../v3/world_model.mjs']);
export const AGENTS_V6 = Object.freeze({
  ...AGENTS_V5,
  VOL: (opts) => makeVOL({ ...opts, params: { ...opts.params, ...VOL_VARIANTS.VOL }, kind: 'VOL' }),
  VOL_RHO: (opts) => { if (typeof opts.params.rhoFixed !== 'number') throw new Error('VOL_RHO needs params.rhoFixed'); return makeVOL({ ...opts, kind: 'VOL_RHO' }); },
});

export function agentOptionsV6(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV6(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V6[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV6(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

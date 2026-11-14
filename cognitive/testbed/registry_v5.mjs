// ==========================================================
// CF-05 testbed — agent registry v5: the v4 agents plus the Dyna-Q+ baseline and the MBVI4 recovery candidates
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.  Tunable parameters (kappa, hazard, k) come from the
// caller's params for the kind; the variants below fix only what defines the kind.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V4 } from './registry_v4.mjs';
import { makeDynaQPlus } from '../baselines/dynaq_plus.mjs';
import { makeMBVI4 } from '../mind/v4/agent.mjs';

export const DYNAQP_VARIANTS = Object.freeze({
  DYNAQP: Object.freeze({ k: 20 }),                // the planning budget of the existing DYNAQ baseline
  DYNAQP_MATCHED: Object.freeze({ k: 1300 }),      // about the planner's backups per decision (1,320 in CF-04)
});
export const MBVI4_VARIANTS = Object.freeze({
  MBVI4_NONE: Object.freeze({ mode: 'NONE' }),     // must reproduce MBVI3
  MBVI4_BONUS: Object.freeze({ mode: 'BONUS' }),
  MBVI4_DECAY: Object.freeze({ mode: 'DECAY' }),
  MBVI4_RECALL: Object.freeze({ mode: 'RECALL' }),   // drift back only for exits that were declared worse
});
export const BASELINE_FILES = Object.freeze(['dynaq_plus.mjs']);
export const BASELINE_ALLOWED = Object.freeze(['../testbed/agent_util.mjs']);
export const MIND4_FILES = Object.freeze(['agent.mjs', 'planner.mjs']);
export const MIND4_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../v3/world_model.mjs', './planner.mjs']);
export const AGENTS_V5 = Object.freeze({
  ...AGENTS_V4,
  ...Object.fromEntries(Object.entries(DYNAQP_VARIANTS).map(([k, v]) => [k, (opts) => makeDynaQPlus({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
  ...Object.fromEntries(Object.entries(MBVI4_VARIANTS).map(([k, v]) => [k, (opts) => makeMBVI4({ ...opts, params: { ...opts.params, ...v }, kind: k })])),
});

export function agentOptionsV5(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV5(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V5[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV5(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

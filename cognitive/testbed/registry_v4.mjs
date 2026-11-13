// ==========================================================
// CF-04 testbed — agent registry v4: the v3 agents plus the arbitration agent and its random-switch control
// ==========================================================
// The privileged-channel rule is the CF-01 rule (runner.mjs PRIVILEGED, unchanged): only ORACLE receives the oracle.
// Earlier kinds are built by their unchanged factories.
// ==========================================================
import { makeStream } from './rng.mjs';
import { PRIVILEGED } from './runner.mjs';
import { AGENTS_V3 } from './registry_v3.mjs';
import { makeARB } from '../mind/arb/agent.mjs';

export const ARB_VARIANTS = Object.freeze({
  ARB: Object.freeze({ mode: 'RELIABILITY' }),
  ARB_T10: Object.freeze({ mode: 'RELIABILITY', theta: 0.1 }),   // conservative threshold: one maximal surprise is not enough
  RANDSWITCH: Object.freeze({ mode: 'RANDOM' }),   // needs params.mfShare (the matched habit share)
});
export const ARB_FILES = Object.freeze(['agent.mjs']);
export const ARB_ALLOWED = Object.freeze(['../../testbed/agent_util.mjs', '../v3/agent.mjs']);
export const AGENTS_V4 = Object.freeze({
  ...AGENTS_V3,
  ...Object.fromEntries(Object.entries(ARB_VARIANTS).map(([k, v]) => [k, (opts) => makeARB({ ...opts, params: { ...v, ...opts.params }, kind: k })])),
});

export function agentOptionsV4(kind, env, rngLabel, params = {}) {
  const opts = { rng: makeStream(rngLabel), params };
  if (PRIVILEGED.includes(kind)) opts.oracle = Object.freeze({ bestAction: () => env.oracleBestAction() });
  return opts;
}

export function makeAgentForV4(kind, env, rngLabel, params = {}) {
  const factory = AGENTS_V4[kind];
  if (!factory) throw new Error(`unknown agent kind ${kind}`);
  const agent = factory(agentOptionsV4(kind, env, rngLabel, params));
  if (agent.privileged && !PRIVILEGED.includes(kind)) throw new Error(`${kind} claims privilege it is not granted`);
  return agent;
}

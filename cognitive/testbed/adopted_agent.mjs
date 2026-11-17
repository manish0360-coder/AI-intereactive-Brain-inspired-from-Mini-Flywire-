// ==========================================================
// The agent of the cognitive programme, as adopted by AD-13 (2026-11-17, the owner's word "A: adopt")
// ==========================================================
// The value-iteration planner on world model v6, with the reversal rate rho fixed at 1/2 and the hazard h = 0.01.
// This is exactly the BELIEF arm that CF-06 ran on gate6 (freeze 7ce1dc6; experiments/cf06/results/gate6_result.json,
// parameters.arms.BELIEF).
//
// This file adds no behaviour. The registry's VOL_RHO factory builds the agent, and every parameter other than
// rhoFixed keeps its v6 default (so volHazard = 0.01). Later specifications cite ADOPTED_AGENT instead of restating
// parameters.
//
// Why a separate definition: the registry documents VOL_RHO as the privileged true-rate reference when it is given a
// family's real rate. Here rho = 1/2 is the prior mean, not task knowledge, so the adopted agent is an ordinary arm.
//
// The claim that goes with the agent is limited (docs/architecture/ARCHITECTURE_DECISIONS.md, AD-13). MBVI3
// (model v3) stays in the registry, unchanged, as the baseline.
// ==========================================================
import { makeAgentForV6 } from './registry_v6.mjs';

export const ADOPTED_AGENT = Object.freeze({
  name: 'BELIEF',
  kind: 'VOL_RHO',
  params: Object.freeze({ rhoFixed: 0.5 }),
  decision: 'AD-13',
  baseline: 'MBVI3',
});

/** The adopted agent for one environment, built exactly as task E5 built the gate6 primary arm. */
export function makeAdoptedAgent(env, rngLabel) {
  return makeAgentForV6(ADOPTED_AGENT.kind, env, rngLabel, { ...ADOPTED_AGENT.params });
}

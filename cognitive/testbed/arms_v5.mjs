// ==========================================================
// CF-05b testbed — building an experiment arm's agent; the ONLY place task ground truth can reach an agent
// ==========================================================
// An arm is [registry kind, params, options?].
//
//   Ordinary arm (no options.diagnostic)   receives exactly its declared params.  The task's context (which edge the
//                                           task manipulated, and whether it is blocked now) is dropped here and never
//                                           reaches the agent.
//
//   Diagnostic arm (options.diagnostic)    privileged; never a learner arm and never in a pass/fail criterion.  It
//                                           receives ONE predicate derived from the context:
//        realChange(key)  =  key is a direction of the manipulated edge  AND  that edge is blocked at this moment
//        'real'   remember a declared-worse exit only if realChange(key)    (recovery from a change that happened)
//        'false'  remember it only if !realChange(key)                      (repair of the detector's false alarms)
//
// Each declared-worse event is classified once, by the state of the world at the moment it is declared, so the two
// diagnostic arms split the events RECALL acts on exactly.  (Their later behaviour still differs, so their effects
// need not add up to RECALL's; the residual is reported.)  A diagnostic arm built without the context throws: it can
// never silently become an ordinary arm.
// ==========================================================
import { makeAgentForV5 } from './registry_v5.mjs';

export const DIAGNOSTICS = Object.freeze(['real', 'false']);

/** The ground-truth predicate a diagnostic arm uses; context = { manipulatedPairs, isBlocked } from task E4B. */
export function realChangeOf(context) {
  if (!context || !Array.isArray(context.manipulatedPairs) || typeof context.isBlocked !== 'function') throw new Error('realChangeOf needs the E4B task context');
  const pairs = new Set(context.manipulatedPairs);
  return (key) => pairs.has(key) && context.isBlocked();
}

/** arms: { name: [kind, params, options?] } -> (name) -> makeAgent(kind, env, label, params, context) */
export function armAgentFactory(arms) {
  return (name) => (kind, env, label, params, context) => {
    const arm = arms[name];
    if (!arm) throw new Error(`unknown arm ${name}`);
    const [k, p, o] = arm;
    if (!o || !o.diagnostic) return makeAgentForV5(k, env, label, { ...p });
    if (!DIAGNOSTICS.includes(o.diagnostic)) throw new Error(`unknown diagnostic ${o.diagnostic} in arm ${name}`);
    if (!context) throw new Error(`diagnostic arm ${name} needs the task context`);
    const real = realChangeOf(context);
    const recallIf = o.diagnostic === 'real' ? real : (key) => !real(key);
    return makeAgentForV5(k, env, label, { ...p, recallIf });
  };
}

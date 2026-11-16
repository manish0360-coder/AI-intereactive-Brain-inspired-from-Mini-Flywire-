// ==========================================================
// CF-06 testbed — building an arm's agent for task E5; the ONLY place task ground truth can reach a v6 agent
// ==========================================================
// The CF-05b rule (arms_v5.mjs) carried over to model v6.  An arm is [registry kind, params, options?].
//
//   Ordinary arm (no options.diagnostic)   receives exactly its declared params.  The task's context is dropped here
//                                           and never reaches the agent; a caller-supplied archiveIf is ignored.
//
//   Diagnostic arm (options.diagnostic)    privileged; never the primary and never in a pass/fail criterion.  It
//                                           receives ONE predicate derived from the context:
//        realChange(key)  =  the edge behind key is blocked by the task at this moment
//        'real'   archive a declared-worse exit only if realChange(key)    (genuine changes, reversing or permanent)
//        'false'  archive it only if !realChange(key)                      (the change detector's false alarms)
//
// Each declared-worse event is classified once, by the state of the world at the moment it is declared, so the two
// diagnostic arms split the events the belief acts on exactly.  Their later behaviour still differs, so their effects
// need not add up to the primary's; the residual is reported.  A diagnostic arm built without the context throws.
// ==========================================================
import { makeAgentForV6 } from './registry_v6.mjs';

export const DIAGNOSTICS_V6 = Object.freeze(['real', 'false']);

/** The ground-truth predicate a diagnostic arm uses; context = { isBlockedPair } from task E5. */
export function realChangeOfE5(context) {
  if (!context || typeof context.isBlockedPair !== 'function') throw new Error('realChangeOfE5 needs the E5 task context');
  return (key) => context.isBlockedPair(key) === true;
}

/** [kind, params, options?] -> makeAgent(kind, env, label, params, context) for task E5. */
export function armAgentV6([kind, params, options]) {
  return (_kind, env, label, _params, context) => {
    if (!options || !options.diagnostic) return makeAgentForV6(kind, env, label, { ...params });
    if (!DIAGNOSTICS_V6.includes(options.diagnostic)) throw new Error(`unknown diagnostic ${options.diagnostic}`);
    if (!context) throw new Error('a diagnostic arm needs the task context');
    const real = realChangeOfE5(context);
    const archiveIf = options.diagnostic === 'real' ? real : (key) => !real(key);
    return makeAgentForV6(kind, env, label, { ...params, archiveIf });
  };
}

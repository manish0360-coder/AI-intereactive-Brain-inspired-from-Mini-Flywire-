// ==========================================================
// CF-06 mind — VOL: the existing planner on world model v6
// ==========================================================
// The same agent loop as MBVI3 (cognitive/mind/v3/agent.mjs): value iteration with the FROZEN core planner, optimism
// for the unknown, greedy choice, uniform tie-break.  Only the model differs: v6 returns, for an exit that changed,
// a belief that mixes its current and earlier regimes according to how often the agent has seen changes reverse.
// Nothing outside the model knows about regimes; the planner just asks the model.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel6, WM6_DEFAULTS } from './world_model.mjs';

export const VOL_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, ...WM6_DEFAULTS });

export function makeVOL({ rng, params = {}, kind = 'VOL' }) {
  const P = { ...VOL_DEFAULTS, ...params };
  const model = makeWorldModel6(P);
  const V = new Map();
  let cue;
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const trace = [];                                   // rho after each change archived or reversal confirmed
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      const opts = planOpts();
      const r = valueIteration(model, V, { budget: P.budget, theta: P.theta, ...opts });
      compute.decisions++; compute.sweeps += r.sweeps; compute.backups += r.backups; if (!r.converged) compute.budgetHits++;
      return argmaxRandomTie(qValues(model, V, obs.node, opts), rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      const before = model.volatility();
      model.update(obs.node, action, next.node, reward, done);
      const after = model.volatility();
      if (after.opened !== before.opened || after.confirmed !== before.confirmed) trace.push(Number(after.rho.toFixed(4)));
    },
    inspect() {
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        model: { states: model.states().size, ...model.stats() },
        volatility: { ...model.volatility(), rhoTrace: trace },
      };
    },
    _model: model, _V: V,
  };
}

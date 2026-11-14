// ==========================================================
// CF-05 candidate — MBVI4: the MBVI3 planner with a way to re-test what it has stopped trying
// ==========================================================
// The measured gap (CF-04): after a block is removed the planner stays on the detour, because it re-tests an exit
// it believes dead in 0.9 of 15 episodes.  Nothing in MBVI3 ever makes an abandoned exit attractive again.
// MBVI4 is MBVI3 (world model v3, value iteration, optimism for the unknown, greedy choice) plus ONE of two
// candidate mechanisms, selected by params.mode.  It is a candidate under test, used by nothing else.
//
// Both use tau(s, a) = real steps since the pair (s, a) was last tried.  Pairs never tried are left to the model's
// existing optimism and are not affected.
//
//   BONUS  an additive bonus in the planned value, the Dyna-Q+ idea moved into value iteration:
//              Q(s, a) += kappa * sqrt(tau)
//
//   DECAY  no bonus; the planner's BELIEF about a pair fades toward what it believes about an untried pair.  If
//          anything in the world can change at rate `hazard` per step, then after tau steps without looking the
//          pair has changed with probability  w = 1 - (1 - hazard)^tau, and the planning distribution is
//              (1 - w) * model's prediction for the pair  +  w * model's prediction for an untried pair
//          A dead exit therefore regains some probability of moving, to an unknown place valued optimistically,
//          and is re-tested when that beats the route in use.  The model's own counts are not modified.
//
//   NONE   neither (must reproduce MBVI3; asserted by tests).
//
// inspect().recovery reports the mode and the mean tau of the pairs the agent chose (how stale its choices were).
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from '../v3/world_model.mjs';
import { qValues4, valueIteration4 } from './planner.mjs';

export const MBVI4_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, mode: 'NONE', kappa: 0.003, hazard: 0.001, ...WM3_DEFAULTS });
const UNTRIED = '__untried__';   // a key no observation can produce: the model's prediction for a pair never tried

export function makeMBVI4({ rng, params = {}, kind = 'MBVI4' }) {
  const P = { ...MBVI4_DEFAULTS, ...params };
  if (!['NONE', 'BONUS', 'DECAY'].includes(P.mode)) throw new Error(`unknown recovery mode ${P.mode}`);
  const model = makeWorldModel3(P);
  const V = new Map();
  const last = new Map();                    // `${s}|${a}` -> clock value when the pair was last tried
  let cue, clock = 0;
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const recovery = { chosen: 0, tauSum: 0 };
  const tauOf = (s, a) => { const t = last.get(`${s}|${a}`); return t === undefined ? null : clock - t; };
  const bonusOf = P.mode === 'BONUS' ? (s, a) => { const tau = tauOf(s, a); return tau === null ? 0 : P.kappa * Math.sqrt(tau); } : undefined;
  const predictOf = P.mode === 'DECAY' ? (s, a) => {
    const p = model.predict(s, a), tau = tauOf(s, a);
    if (tau === null || tau === 0) return p;
    const w = 1 - (1 - P.hazard) ** tau, q = model.predict(UNTRIED, 0);
    return { self: (1 - w) * p.self + w * q.self, outcomes: p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]), unknown: (1 - w) * p.unknown + w * q.unknown, N: p.N };
  } : undefined;
  const planOpts = () => ({
    gamma: P.gamma, vOpt: P.vOpt, predictOf, bonusOf,
    rewardOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.rewardProb(s2),
    doneOf: cue !== null ? (s2) => (s2 === cue ? 1 : 0) : (s2) => model.doneProb(s2),
  });
  return {
    kind,
    act(obs) {
      model.visit(obs.node, obs.nActions);
      if (obs.goal !== cue) { cue = obs.goal; V.clear(); }
      const opts = planOpts();
      const r = valueIteration4(model, V, { budget: P.budget, theta: P.theta, ...opts });
      compute.decisions++; compute.sweeps += r.sweeps; compute.backups += r.backups; if (!r.converged) compute.budgetHits++;
      const a = argmaxRandomTie(qValues4(model, V, obs.node, opts), rng);
      const tau = tauOf(obs.node, a);
      if (tau !== null) { recovery.chosen++; recovery.tauSum += tau; }
      return a;
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      model.update(obs.node, action, next.node, reward, done);
      clock++;
      last.set(`${obs.node}|${action}`, clock);
    },
    inspect() {
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        recovery: { mode: P.mode, meanTauOfChosen: recovery.chosen ? recovery.tauSum / recovery.chosen : null },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only
  };
}

// ==========================================================
// CF-03 core — MBVI: learned-model planning agent (world model + value iteration + optimism)
// ==========================================================
// act(obs):     register the state, plan for the current cue with budgeted value iteration, act greedily on the
//               planned Q (ties uniform; epsilon only in the no-optimism ablation).
// observe(tr):  log model quality BEFORE learning (predictive log-likelihood of the realised outcome, and a
//               calibration bin for the modal non-self outcome), then update the world model.
// Reward: with a cue, the declared semantics R = D = 1[s' = cue]; without one, the learned arrival model.
// Values are cleared when the cue changes (a new goal is a new planning problem).
// inspect().compute reports decisions, sweeps, backups and the share of decisions that hit the budget.
// ==========================================================
import { argmaxRandomTie } from '../testbed/agent_util.mjs';
import { makeWorldModel, WM_DEFAULTS } from './world_model.mjs';
import { qValues, valueIteration } from './planner.mjs';

export const MBVI_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, epsilon: 0, ...WM_DEFAULTS });

export function makeMBVI({ rng, params = {}, kind = 'MBVI' }) {
  const P = { ...MBVI_DEFAULTS, ...params };
  const model = makeWorldModel(P);
  const V = new Map();
  let cue;                                   // undefined until the first act, so the first cue always (re)plans
  const compute = { decisions: 0, sweeps: 0, backups: 0, budgetHits: 0 };
  const quality = { n: 0, ll: 0, llUniform: 0, bins: Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })) };
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
      if (P.epsilon > 0 && rng() < P.epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(qValues(model, V, obs.node, opts), rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      model.visit(next.node, next.nActions);
      if (model.countOf(obs.node, action) >= 1) {
        quality.n++;
        quality.ll += Math.log(model.probOf(obs.node, action, next.node));
        quality.llUniform += Math.log(1 / (obs.nActions + 1));
        const p = model.predict(obs.node, action);
        if (p.outcomes.length) {
          const [modal, pm] = p.outcomes.reduce((b, x) => (x[1] > b[1] ? x : b));
          const bin = quality.bins[Math.min(9, Math.floor(pm * 10))];
          bin.n++; bin.pred += pm; bin.hit += next.node === modal ? 1 : 0;
        }
      }
      model.update(obs.node, action, next.node, reward, done);
    },
    inspect() {
      const total = quality.bins.reduce((s, b) => s + b.n, 0);
      const ece = total ? quality.bins.reduce((s, b) => s + (b.n ? Math.abs(b.hit / b.n - b.pred / b.n) * b.n : 0), 0) / total : null;
      return {
        compute: { ...compute, backupsPerDecision: compute.decisions ? compute.backups / compute.decisions : 0, sweepsPerDecision: compute.decisions ? compute.sweeps / compute.decisions : 0, budgetHitShare: compute.decisions ? compute.budgetHits / compute.decisions : 0, budget: P.budget },
        quality: { n: quality.n, meanLL: quality.n ? quality.ll / quality.n : null, meanLLUniform: quality.n ? quality.llUniform / quality.n : null, ece, calibrated: total },
        model: { states: model.states().size, ...model.stats() },
      };
    },
    _model: model, _V: V,                     // test access only (tests never pass these to an environment)
  };
}

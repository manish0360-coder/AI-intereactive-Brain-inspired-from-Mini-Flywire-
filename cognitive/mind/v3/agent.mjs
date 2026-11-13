// ==========================================================
// CF-03c mind — MBVI3: the CF-03 planning agent on world model v3
// ==========================================================
// Identical to cognitive/mind/mbvi2.mjs except for the model it learns (v3/world_model.mjs).  The planner, the
// optimism value, the greedy choice, the cue semantics and the quality log are the same, so a difference between
// MBVI2 and MBVI3 on the same world and seeds is a difference between the v2 and v3 models.
// ==========================================================
import { argmaxRandomTie } from '../../testbed/agent_util.mjs';
import { qValues, valueIteration } from '../../core/planner.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from './world_model.mjs';

export const MBVI3_DEFAULTS = Object.freeze({ gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1, ...WM3_DEFAULTS });

export function makeMBVI3({ rng, params = {}, kind = 'MBVI3' }) {
  const P = { ...MBVI3_DEFAULTS, ...params };
  const model = makeWorldModel3(P);
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
        quality: { n: quality.n, meanLL: quality.n ? quality.ll / quality.n : null, meanLLUniform: quality.n ? quality.llUniform / quality.n : null, ece, calibrated: total, bins: quality.bins.map((b) => ({ ...b })) },
        model: { states: model.states().size, ...model.stats(), ...model.hyper() },
      };
    },
    _model: model, _V: V,                     // test access only (tests never pass these to an environment)
  };
}

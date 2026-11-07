// ==========================================================
// QL — goal-conditioned tabular one-step Q-learning (model-free baseline)
// ==========================================================
// State = (node label, cue label or null).  Q starts at 0.  Policy: with probability epsilon a uniform exit, otherwise
// the greedy exit with ties broken uniformly.  Update after every real step:
//   Q(s,g,a) += alpha * (r + gamma * [not done] * max_a' Q(s',g,a') - Q(s,g,a))
// A truncated step bootstraps (truncation is not termination).  Nothing else writes Q.
// ==========================================================
import { argmaxRandomTie, makeTable } from '../testbed/agent_util.mjs';

export const QL_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1 });

export function qTarget(table, tr, gamma) {
  const { reward, next, done } = tr;
  return reward + (done ? 0 : gamma * Math.max(...table.row(next.node, next.goal, next.nActions)));
}

export function makeQL({ rng, params = {} }) {
  const { alpha, gamma, epsilon } = { ...QL_DEFAULTS, ...params };
  const Q = makeTable();
  return {
    kind: 'QL',
    act(obs) {
      const r = Q.row(obs.node, obs.goal, obs.nActions);
      if (rng() < epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(r, rng);
    },
    observe(tr) {
      const r = Q.row(tr.obs.node, tr.obs.goal, tr.obs.nActions);
      r[tr.action] += alpha * (qTarget(Q, tr, gamma) - r[tr.action]);
    },
    inspect: () => ({ q: Q.snapshot() }),
  };
}

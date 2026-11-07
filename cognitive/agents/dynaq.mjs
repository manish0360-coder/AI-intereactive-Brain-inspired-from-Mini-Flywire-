// ==========================================================
// DYNAQ — QL plus classic tabular Dyna-Q planning (model-based positive control; Sutton & Barto 2018 §8.2)
// ==========================================================
// Model: for every experienced (node, action) the last observed (next node, its exit count, reward, done).
// After every real update, k planning updates on (node, action) pairs drawn uniformly from the experienced pairs
// (in first-experience order).  Planning targets the CURRENT cue g:
//   with a cue (g !== null)   r = 1[next == g], done = (next == g)     -- the cue's declared meaning (CD-005)
//   without a cue             r, done = the last observed values for the pair
// and updates Q(node, g, action) exactly as QL does.
// ==========================================================
import { argmaxRandomTie, makeTable } from '../testbed/agent_util.mjs';

export const DYNAQ_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1, k: 20 });

export function makeDynaQ({ rng, params = {} }) {
  const { alpha, gamma, epsilon, k } = { ...DYNAQ_DEFAULTS, ...params };
  const Q = makeTable();
  const model = new Map();
  const pairs = [];
  const update = (node, goal, width, action, reward, next, nextWidth, done) => {
    const r = Q.row(node, goal, width);
    const target = reward + (done ? 0 : gamma * Math.max(...Q.row(next, goal, nextWidth)));
    r[action] += alpha * (target - r[action]);
  };
  return {
    kind: 'DYNAQ',
    act(obs) {
      const r = Q.row(obs.node, obs.goal, obs.nActions);
      if (rng() < epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(r, rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      update(obs.node, obs.goal, obs.nActions, action, reward, next.node, next.nActions, done);
      const key = `${obs.node}|${action}`;
      if (!model.has(key)) pairs.push([obs.node, action, obs.nActions]);
      model.set(key, { next: next.node, nextWidth: next.nActions, reward, done });
      const g = obs.goal;
      for (let i = 0; i < k; i++) {
        const [node, a, width] = pairs[Math.floor(rng() * pairs.length)];
        const m = model.get(`${node}|${a}`);
        const r = g !== null ? (m.next === g ? 1 : 0) : m.reward;
        const d = g !== null ? m.next === g : m.done;
        update(node, g, width, a, r, m.next, m.nextWidth, d);
      }
    },
    inspect: () => ({ q: Q.snapshot(), modelPairs: pairs.length }),
  };
}

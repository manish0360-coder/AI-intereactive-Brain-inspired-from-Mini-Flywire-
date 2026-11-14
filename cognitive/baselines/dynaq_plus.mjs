// ==========================================================
// DYNAQP — Dyna-Q+ with a count model (Sutton & Barto 2018, section 8.3), the textbook baseline for recovery after
// a change
// ==========================================================
// The existing DYNAQ baseline keeps only the LAST outcome of each (node, action) and never re-tests anything.
// Dyna-Q+ adds the two things a fair model-free-with-model baseline needs here:
//
//   1. A count model.  For every experienced (node, action): how often each outcome followed (staying counts as an
//      outcome).  Planning samples the outcome from those counts, so stochastic edges are represented.
//   2. A bonus for actions not tried recently.  A planning update on (s, a) uses the reward
//          r + kappa * sqrt(tau)        tau = real steps since (s, a) was last tried in the real world
//      so an action left alone for long becomes worth re-testing.  As in the book, actions never tried at a visited
//      state may also be drawn in planning: they are modelled as leading back to the same state with reward 0, with
//      tau counted from the state's first visit.
//
// Real updates use the real reward without a bonus.  Reward semantics in planning are DYNAQ's: with a cue g,
// r = 1[next == g] and termination on arrival at g (the cue's declared meaning, CD-005); without a cue, the last
// observed reward and termination for that outcome.  Action choice is epsilon-greedy on Q, as for QL and DYNAQ.
// inspect().compute reports real steps and planning updates, so that work can be compared across agents.
// ==========================================================
import { argmaxRandomTie, makeTable } from '../testbed/agent_util.mjs';

export const DYNAQP_DEFAULTS = Object.freeze({ alpha: 0.5, gamma: 0.95, epsilon: 0.1, k: 20, kappa: 0.003 });

export function makeDynaQPlus({ rng, params = {}, kind = 'DYNAQP' }) {
  const { alpha, gamma, epsilon, k, kappa } = { ...DYNAQP_DEFAULTS, ...params };
  const Q = makeTable();
  const widths = new Map();          // node -> number of actions
  const firstSeen = new Map();       // node -> real step at which it was first observed
  const nodes = [];                  // visited nodes in first-visit order
  const model = new Map();           // `${node}|${a}` -> { n, last, out: Map(next -> { c, reward, done }) }
  const compute = { realSteps: 0, planningUpdates: 0 };
  let t = 0;
  const see = (node, width) => { if (!widths.has(node)) { widths.set(node, width); firstSeen.set(node, t); nodes.push(node); } };
  const update = (node, goal, action, reward, next, done) => {
    const r = Q.row(node, goal, widths.get(node));
    const target = reward + (done ? 0 : gamma * Math.max(...Q.row(next, goal, widths.get(next))));
    r[action] += alpha * (target - r[action]);
  };
  function sampleOutcome(m) {
    let u = rng() * m.n;
    for (const [next, o] of m.out) { u -= o.c; if (u < 0) return [next, o]; }
    const last = [...m.out].at(-1);
    return last;
  }
  return {
    kind,
    act(obs) {
      see(obs.node, obs.nActions);
      const r = Q.row(obs.node, obs.goal, obs.nActions);
      if (rng() < epsilon) return Math.floor(rng() * obs.nActions);
      return argmaxRandomTie(r, rng);
    },
    observe(tr) {
      const { obs, action, reward, next, done } = tr;
      see(obs.node, obs.nActions); see(next.node, next.nActions);
      t++; compute.realSteps++;
      update(obs.node, obs.goal, action, reward, next.node, done);
      const key = `${obs.node}|${action}`;
      const m = model.get(key) ?? { n: 0, last: t, out: new Map() };
      m.n++; m.last = t;
      const o = m.out.get(next.node) ?? { c: 0, reward: 0, done: false };
      o.c++; o.reward = reward; o.done = done;
      m.out.set(next.node, o); model.set(key, m);
      const g = obs.goal;
      for (let i = 0; i < k; i++) {
        const node = nodes[Math.floor(rng() * nodes.length)];
        const a = Math.floor(rng() * widths.get(node));
        const pm = model.get(`${node}|${a}`);
        let nx = node, r = 0, d = false, tau = t - firstSeen.get(node);
        if (pm) {
          const [sampled, out] = sampleOutcome(pm);
          nx = sampled; tau = t - pm.last;
          r = g !== null ? (nx === g && nx !== node ? 1 : 0) : out.reward;
          d = g !== null ? nx === g && nx !== node : out.done;
        }
        update(node, g, a, r + kappa * Math.sqrt(tau), nx, d);
        compute.planningUpdates++;
      }
    },
    inspect: () => ({ compute: { ...compute, updatesPerStep: compute.realSteps ? compute.planningUpdates / compute.realSteps : 0 }, modelPairs: model.size }),
  };
}

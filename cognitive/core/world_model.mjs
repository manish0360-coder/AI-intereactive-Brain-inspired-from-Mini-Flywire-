// ==========================================================
// CF-03 core — learned world model (the agent's only knowledge of dynamics and reward)
// ==========================================================
// Learns from experienced transitions only: observation labels, action indices, observed rewards and done flags.
// It never sees the graph, reliabilities, distances or the rewarded node.
//
// Transitions, per (state s, action a): a Dirichlet over the outcome categories
//     SELF (stayed at s) · each observed non-self outcome s' · UNKNOWN (an outcome never observed for this pair)
// with prior pseudo-count alpha0 on SELF and on UNKNOWN.  Posterior predictive, N = observations of (s, a):
//     p(SELF) = (n_self + alpha0) / (N + 2 alpha0),  p(s') = n(s') / (N + 2 alpha0),  p(UNKNOWN) = alpha0 / (N + 2 alpha0)
// which sums to 1 for every pair, including untried pairs (N = 0: SELF 1/2, UNKNOWN 1/2).
//
// Reward and termination are modelled as functions of the arrival state (declared structural prior, CD-011):
//     P(reward | arrive at s') = (r1 + beta0) / (n + beta0),  P(done | arrive at s') = (d1 + beta0) / (n + beta0)
// an optimistic prior (mean 1 before any arrival).  A failed move (SELF) yields no reward and no termination.
//
// Change handling (surprise resets):
//   transition  if N >= resetMinN and the observed outcome had predictive probability < resetTau, the pair's counts
//               are cleared before the observation is added (a confident deterministic belief was contradicted)
//   reward      if n >= rewardResetMinN at the arrival state and the observed reward had predictive probability
//               < rewardResetTau, reward beliefs are cleared: for every state (globalRewardReset, the default:
//               one change-point for the whole reward function) or for that state only
// ==========================================================

export const WM_DEFAULTS = Object.freeze({
  alpha0: 0.25, resets: true, resetMinN: 20, resetTau: 0.05,
  beta0: 0.1, rewardResetMinN: 5, rewardResetTau: 0.05, globalRewardReset: true,
});

export function makeWorldModel(params = {}) {
  const P = { ...WM_DEFAULTS, ...params };
  const width = new Map();              // state label -> number of actions (observed on arrival)
  const pairs = new Map();              // `${s}|${a}` -> { N, nSelf, out: Map(label -> count) }
  const arrive = new Map();             // label -> { n, r1, d1 }
  const stats = { transitionResets: 0, rewardResets: 0, globalRewardResets: 0, updates: 0 };
  const pair = (s, a) => pairs.get(`${s}|${a}`);

  function predict(s, a) {
    const q = pair(s, a);
    const N = q ? q.N : 0, nSelf = q ? q.nSelf : 0, denom = N + 2 * P.alpha0;
    const outcomes = q ? [...q.out].map(([lab, c]) => [lab, c / denom]) : [];
    return { self: (nSelf + P.alpha0) / denom, outcomes, unknown: P.alpha0 / denom, N };
  }

  /** Predictive probability of the category the outcome s2 falls into (SELF, a known outcome, or UNKNOWN). */
  function probOf(s, a, s2) {
    const p = predict(s, a);
    if (s2 === s) return p.self;
    const hit = p.outcomes.find(([lab]) => lab === s2);
    return hit ? hit[1] : p.unknown;
  }

  const rewardProb = (s2) => { const r = arrive.get(s2); return r ? (r.r1 + P.beta0) / (r.n + P.beta0) : 1; };
  const doneProb = (s2) => { const r = arrive.get(s2); return r ? (r.d1 + P.beta0) / (r.n + P.beta0) : 1; };

  function update(s, a, s2, reward, done) {
    stats.updates++;
    const key = `${s}|${a}`;
    let q = pairs.get(key);
    if (q && P.resets && q.N >= P.resetMinN && probOf(s, a, s2) < P.resetTau) { q = null; stats.transitionResets++; }
    if (!q) { q = { N: 0, nSelf: 0, out: new Map() }; pairs.set(key, q); }
    q.N++;
    if (s2 === s) { q.nSelf++; return; }
    q.out.set(s2, (q.out.get(s2) ?? 0) + 1);
    const r = reward > 0 ? 1 : 0, d = done ? 1 : 0;
    const prev = arrive.get(s2);
    if (prev && P.resets && prev.n >= P.rewardResetMinN) {
      const pr = r ? rewardProb(s2) : 1 - rewardProb(s2);
      if (pr < P.rewardResetTau) {
        if (P.globalRewardReset) { arrive.clear(); stats.globalRewardResets++; } else { arrive.delete(s2); stats.rewardResets++; }
      }
    }
    const cur = arrive.get(s2) ?? { n: 0, r1: 0, d1: 0 };
    cur.n++; cur.r1 += r; cur.d1 += d;
    arrive.set(s2, cur);
  }

  return {
    params: P,
    visit(s, w) { if (!width.has(s)) width.set(s, w); else if (width.get(s) !== w) throw new Error(`state ${s} changed its action count`); },
    states: () => width,
    widthOf: (s) => width.get(s),
    predict, probOf, rewardProb, doneProb, update,
    countOf: (s, a) => pair(s, a)?.N ?? 0,
    stats: () => ({ ...stats }),
  };
}

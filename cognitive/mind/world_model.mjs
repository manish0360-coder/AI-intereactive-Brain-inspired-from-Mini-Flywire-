// ==========================================================
// CF-03b mind — learned world model v2: hierarchical move-success prior, impassable-exit mixture, local reward reset
// ==========================================================
// Learns from experienced transitions only (observation labels, action indices, rewards, done flags), exactly as
// cognitive/core/world_model.mjs does.  It never sees the graph, reliabilities, distances or the rewarded node.
// What changes from v1 (CF-03 failed its calibration criterion; diagnosis in experiments/cf03b/DESIGN.md):
//
// 1. Pooled prior over move success.  Each (state, action) pair has an unknown probability of moving at all.  v1 gave
//    every pair the same fixed weak prior, so each pair relearned from scratch what all the others had already shown.
//    v2 treats the pairs as draws from one population, Beta(S*mu, S*(1 - mu)), and learns mu and S from the agent's
//    own counts (empirical Bayes):
//        mu  pooled move rate over the other pairs (leave-one-out), with a weak hyper-prior (hyperMean0, hyperN0)
//        S   the strength in strengthGrid with the highest Beta-binomial marginal likelihood (ties: the smaller)
//        P(move | pair) = (nMove + S*mu) / (N + S)
//
// 2. Impassable exits.  A Beta population cannot represent "most exits work, a few never do".  A pair that has never
//    moved is therefore a two-component mixture: impassable (prior weight piBlock, never moves) or a population
//    member.  After k failures and no move, with Pk = prod_{j<k} (S*(1-mu) + j) / (S + j):
//        w = piBlock / (piBlock + (1 - piBlock) * Pk)        P(move) = (1 - w) * S*mu / (k + S)
//    One observed move sets w = 0.  Pairs enter the pooled statistics with weight (1 - w).
//
// 3. Where a move leads.  A pair that has never moved puts all of its move mass on UNKNOWN (an outcome never seen
//    for this pair).  Once it has moved, the chance that the next move goes somewhere NEW is u, and each observed
//    outcome s' gets (1 - u) * n(s') / nMove.  v1 fixed u by a per-pair count rule, which keeps leaking probability
//    to UNKNOWN in worlds where every action has one destination.  v2 pools this too: over all pairs,
//        nu = (E + kappa) / (R + 1)     E = moves that revealed a second or later destination, R = repeat moves
//        u  = min(nu, kappa / (nMove + kappa))                    (never above the v1 count rule; pool: false = v1)
//    Every predictive distribution sums to 1.
//
// 4. Reward change-points are local to one arrival state by default (CF-03: the local variant did better than the
//    global one on dev and on gate3).  globalRewardReset: true restores the CF-03 behaviour as an ablation.
//
// Transition resets are as in v1: a pair with N >= resetMinN whose observed outcome had predictive probability
// below resetTau is cleared before the observation is added.
// ==========================================================

export const WM2_DEFAULTS = Object.freeze({
  pool: true, hyperMean0: 0.5, hyperN0: 1, strength0: 2, strengthGrid: Object.freeze([1, 2, 4, 8, 16, 32, 64]),
  piBlock: 0.05, kappa: 0.25,
  resets: true, resetMinN: 20, resetTau: 0.05,
  beta0: 0.1, rewardResetMinN: 5, rewardResetTau: 0.05, globalRewardReset: false,
});

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

/** log Gamma(x) for x > 0 (Lanczos approximation, g = 7). */
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  const y = x - 1;
  let a = LANCZOS[0];
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (y + i);
  const t = y + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a);
}

/** log marginal likelihood of m moves in n attempts (a given order) under Beta(a, b). */
export function logBetaBinomial(m, n, a, b) {
  return lgamma(m + a) + lgamma(n - m + b) - lgamma(n + a + b) - lgamma(a) - lgamma(b) + lgamma(a + b);
}

export function makeWorldModel2(params = {}) {
  const P = { ...WM2_DEFAULTS, ...params };
  const width = new Map();              // state label -> number of actions (observed on arrival)
  const pairs = new Map();              // `${s}|${a}` -> { N, nMove, out: Map(label -> count) }
  const arrive = new Map();             // label -> { n, r1, d1 }
  const cache = new Map();              // `${s}|${a}` -> { version, value }
  const stats = { transitionResets: 0, rewardResets: 0, globalRewardResets: 0, updates: 0 };
  const m0 = P.hyperMean0 * P.hyperN0;
  let hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu: P.kappa };
  let version = 0;

  /** Posterior weight of "impassable" for a pair with k failures and no move, under population (mu, S). */
  function blockWeight(q, mu, S) {
    if (P.piBlock <= 0 || (q && q.nMove > 0)) return 0;
    const k = q ? q.N : 0;
    let pk = 1;
    for (let j = 0; j < k; j++) pk *= (S * (1 - mu) + j) / (S + j);
    return P.piBlock / (P.piBlock + (1 - P.piBlock) * pk);
  }

  /** One empirical-Bayes step: weights under the current population, then the pooled mean, then the strength. */
  function refresh() {
    if (!P.pool) return;
    let M = 0, T = 0, E = 0, R = 0;
    const weighted = [];
    for (const q of pairs.values()) {
      if (!q.N) continue;
      const keep = 1 - blockWeight(q, hyper.mu, hyper.S);
      M += keep * q.nMove; T += keep * q.N;
      if (q.nMove) { E += q.out.size - 1; R += q.nMove - 1; }
      weighted.push([q, keep]);
    }
    const mu = (M + m0) / (T + P.hyperN0);
    let S = P.strengthGrid[0], best = -Infinity;
    for (const g of P.strengthGrid) {
      let ll = 0;
      for (const [q, keep] of weighted) ll += keep * logBetaBinomial(q.nMove, q.N, g * mu, g * (1 - mu));
      if (ll > best + 1e-12) { best = ll; S = g; }
    }
    hyper = { mu, S: weighted.length ? S : P.strength0, M, T, nu: (E + P.kappa) / (R + 1) };
  }

  function compute(s, a) {
    const q = pairs.get(`${s}|${a}`);
    const N = q ? q.N : 0, nMove = q ? q.nMove : 0, S = hyper.S;
    let mu = hyper.mu;
    if (P.pool && q && q.N) {                      // leave-one-out: a pair is not evidence about its own prior
      const keep = 1 - blockWeight(q, hyper.mu, S);
      mu = (hyper.M - keep * nMove + m0) / (hyper.T - keep * N + P.hyperN0);
    }
    const w = blockWeight(q, mu, S);
    const pMove = (1 - w) * (nMove + S * mu) / (N + S);
    const u = nMove ? Math.min(hyper.nu, P.kappa / (nMove + P.kappa)) : 1;
    const outcomes = nMove ? [...q.out].map(([lab, c]) => [lab, pMove * (1 - u) * c / nMove]) : [];
    const unknown = pMove * u;
    return { self: 1 - pMove, outcomes, unknown, N, blocked: w };
  }

  function predict(s, a) {
    const key = `${s}|${a}`;
    const hit = cache.get(key);
    if (hit && hit.version === version) return hit.value;
    const value = compute(s, a);
    cache.set(key, { version, value });
    return value;
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
    if (!q) { q = { N: 0, nMove: 0, out: new Map() }; pairs.set(key, q); }
    q.N++;
    if (s2 !== s) {
      q.nMove++;
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
    refresh();
    version++;
  }

  return {
    params: P,
    visit(s, w) { if (!width.has(s)) width.set(s, w); else if (width.get(s) !== w) throw new Error(`state ${s} changed its action count`); },
    states: () => width,
    widthOf: (s) => width.get(s),
    predict, probOf, rewardProb, doneProb, update,
    countOf: (s, a) => pairs.get(`${s}|${a}`)?.N ?? 0,
    hyper: () => ({ mu: hyper.mu, S: hyper.S, nu: hyper.nu }),
    stats: () => ({ ...stats }),
  };
}

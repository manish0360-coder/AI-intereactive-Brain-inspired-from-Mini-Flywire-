// ==========================================================
// CF-03c mind — learned world model v3: v2 with two defects repaired
// ==========================================================
// v2 (cognitive/mind/world_model.mjs) is frozen as the CF-03b model and is not edited.  The independent review of
// CF-03b reported two defects in it; both are reproduced by cognitive/tests/test_mind_v3.mjs against v2 and fixed
// here.  Everything not listed below is the v2 definition: the pooled Beta population over move success, the
// impassable-exit mixture, the pooled destination-novelty rate, the reward model and its local change-point.
//
// Defect 1 — inconsistent leave-one-out weights.
//   v2 accumulated the pooled totals (M, T) with each pair's weight computed under the PREVIOUS hyper-parameters,
//   and subtracted a pair's own contribution with a weight computed under the NEW ones.  For a pair that has never
//   moved the two weights differ, so the leave-one-out mean could leave [0, 1]; a never-moved pair then received
//   P(stay) > 1 and a negative UNKNOWN mass.
//   v3: the empirical-Bayes step is iterated to a fixed point (at most emIterations passes), and each pair's weight
//   is STORED in the same pass that builds the totals.  The leave-one-out mean subtracts exactly the stored weight,
//   so it is a ratio of sums of non-negative terms and stays in [0, 1].
//
// Defect 2 — a single ordinary failure reset a reliable pair.
//   v2 cleared a pair's counts when N >= resetMinN and one observation had predictive probability < resetTau.  A
//   pair with about 35 successes predicts P(stay) < 0.05, so one legitimate failure of a 0.98 edge wiped it.
//   v3: change detection accumulates evidence.  Each pair keeps two CUSUM statistics, for "this exit got worse" and
//   "this exit got better", against the alternative that the outcome now happens with probability changeAlt:
//       g = max(0, g + log( alt(x) / p_model(x) ))        x = the observed outcome, p_model from BEFORE the update
//   A change is declared when its posterior odds exceed 1 under a prior change rate changeHazard per attempt:
//       g > log( (1 - changeHazard) / changeHazard )
//   One surprising outcome cannot reach the threshold unless the model was almost certain (as after many
//   deterministic successes, where a block is then detected on the first failure).  On a declared change the pair's
//   counts become the observations of the run that raised the statistic (the estimated post-change data), instead
//   of being cleared.  Statistics accumulate only once the pair has changeMinN observations.
//
// Ablation switches (all default on): poolMove (the pooled move-success prior), poolDest (the pooled novelty rate),
// piBlock = 0 (no impassable-exit component), resets (no change detection), globalRewardReset.
// ==========================================================
import { lgammaV3 as lgamma } from './numerics.mjs';

export const WM3_DEFAULTS = Object.freeze({
  poolMove: true, poolDest: true, hyperMean0: 0.5, hyperN0: 1, strength0: 2, strengthGrid: Object.freeze([1, 2, 4, 8, 16, 32, 64]),
  emIterations: 25, piBlock: 0.05, kappa: 0.25,
  resets: true, changeHazard: 0.002, changeAlt: 0.9, changeMinN: 5,
  beta0: 0.1, rewardResetMinN: 5, rewardResetTau: 0.05, globalRewardReset: false,
});

/** log marginal likelihood of m moves in n attempts (a given order) under Beta(a, b). */
export function logBetaBinomial(m, n, a, b) {
  return lgamma(m + a) + lgamma(n - m + b) - lgamma(n + a + b) - lgamma(a) - lgamma(b) + lgamma(a + b);
}

const emptyRun = () => ({ g: 0, N: 0, nMove: 0, out: new Map() });

export function makeWorldModel3(params = {}) {
  const P = { ...WM3_DEFAULTS, ...params };
  const width = new Map();              // state label -> number of actions (observed on arrival)
  const pairs = new Map();              // `${s}|${a}` -> { N, nMove, out, keep, down, up }
  const arrive = new Map();             // label -> { n, r1, d1 }
  const cache = new Map();              // `${s}|${a}` -> { version, value }
  const stats = { changesDown: 0, changesUp: 0, rewardResets: 0, globalRewardResets: 0, updates: 0, emPasses: 0 };
  const m0 = P.hyperMean0 * P.hyperN0;
  const threshold = Math.log((1 - P.changeHazard) / P.changeHazard);
  let hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu: P.kappa };
  let version = 0;

  /** Posterior weight of "impassable" for k failures and no move, under population (mu, S). */
  function blockWeight(nMove, k, mu, S) {
    if (P.piBlock <= 0 || nMove > 0) return 0;
    let pk = 1;
    for (let j = 0; j < k; j++) pk *= (S * (1 - mu) + j) / (S + j);
    return P.piBlock / (P.piBlock + (1 - P.piBlock) * pk);
  }

  /** Empirical Bayes to a fixed point.  Stored q.keep and the totals (M, T) always come from the same pass. */
  function refresh() {
    let E = 0, R = 0;
    for (const q of pairs.values()) if (q.nMove) { E += q.out.size - 1; R += q.nMove - 1; }
    const nu = P.poolDest ? (E + P.kappa) / (R + 1) : P.kappa;
    if (!P.poolMove) {
      for (const q of pairs.values()) q.keep = 1;
      hyper = { mu: P.hyperMean0, S: P.strength0, M: 0, T: 0, nu };
      return;
    }
    const active = [...pairs.values()].filter((q) => q.N > 0);
    let mu = hyper.mu, S = hyper.S, M = 0, T = 0;
    for (let it = 0; it < P.emIterations; it++) {
      stats.emPasses++;
      M = 0; T = 0;
      for (const q of active) { q.keep = 1 - blockWeight(q.nMove, q.N, mu, S); M += q.keep * q.nMove; T += q.keep * q.N; }
      const mu2 = (M + m0) / (T + P.hyperN0);
      let S2 = P.strength0;
      if (active.length) {
        let best = -Infinity;
        for (const g of P.strengthGrid) {
          let ll = 0;
          for (const q of active) ll += q.keep * logBetaBinomial(q.nMove, q.N, g * mu2, g * (1 - mu2));
          if (ll > best + 1e-12) { best = ll; S2 = g; }
        }
      }
      const done = Math.abs(mu2 - mu) < 1e-10 && S2 === S;
      mu = mu2; S = S2;
      if (done) break;
    }
    hyper = { mu, S, M, T, nu };
  }

  function compute(s, a) {
    const q = pairs.get(`${s}|${a}`);
    const N = q ? q.N : 0, nMove = q ? q.nMove : 0, S = hyper.S;
    let mu = hyper.mu;
    if (P.poolMove && q && q.N) mu = (hyper.M - q.keep * nMove + m0) / (hyper.T - q.keep * N + P.hyperN0);   // leave-one-out
    const w = blockWeight(nMove, N, mu, S);
    const pMove = (1 - w) * (nMove + S * mu) / (N + S);
    const u = nMove ? Math.min(hyper.nu, P.kappa / (nMove + P.kappa)) : 1;
    const outcomes = nMove ? [...q.out].map(([lab, c]) => [lab, pMove * (1 - u) * c / nMove]) : [];
    return { self: 1 - pMove, outcomes, unknown: pMove * u, N, blocked: w };
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

  /** Advance one CUSUM statistic with this observation; returns true when a change is declared. */
  function cusum(run, llr, moved, s2) {
    const g = run.g + llr;
    if (g <= 0) { run.g = 0; run.N = 0; run.nMove = 0; run.out.clear(); return false; }
    run.g = g; run.N++;
    if (moved) { run.nMove++; run.out.set(s2, (run.out.get(s2) ?? 0) + 1); }
    return g > threshold;
  }

  function update(s, a, s2, reward, done) {
    stats.updates++;
    const key = `${s}|${a}`;
    let q = pairs.get(key);
    if (!q) { q = { N: 0, nMove: 0, out: new Map(), keep: 1, down: emptyRun(), up: emptyRun() }; pairs.set(key, q); }
    const moved = s2 !== s;
    let replaced = false;
    if (P.resets && q.N >= P.changeMinN) {
      const pSelf = Math.min(1 - 1e-12, Math.max(1e-12, predict(s, a).self));
      const alt = P.changeAlt;
      const worse = cusum(q.down, Math.log((moved ? 1 - alt : alt) / (moved ? 1 - pSelf : pSelf)), moved, s2);
      const better = cusum(q.up, Math.log((moved ? alt : 1 - alt) / (moved ? 1 - pSelf : pSelf)), moved, s2);
      if (worse || better) {
        const run = worse ? q.down : q.up;
        if (worse) stats.changesDown++; else stats.changesUp++;
        q.N = run.N; q.nMove = run.nMove; q.out = new Map(run.out);       // the run already includes this observation
        q.down = emptyRun(); q.up = emptyRun();
        replaced = true;
      }
    }
    if (!replaced) { q.N++; if (moved) { q.nMove++; q.out.set(s2, (q.out.get(s2) ?? 0) + 1); } }
    if (moved) {
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

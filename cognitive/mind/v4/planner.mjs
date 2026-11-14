// ==========================================================
// CF-05 candidate — value iteration with two optional hooks (cognitive/core/planner.mjs is frozen and unedited)
// ==========================================================
// Identical to the core planner when both hooks are absent (asserted by tests/test_recovery.mjs):
//   Q(s,a) = p(SELF) * gamma * V(s)
//          + sum over known outcomes s'  p(s') * [ R(s') + gamma * (1 - D(s')) * V(s') ]
//          + p(UNKNOWN) * vOpt
//          + bonusOf(s, a)                                    (hook 1: an additive bonus, default 0)
// where the predictive distribution comes from predictOf(s, a) (hook 2: default model.predict), so a caller can
// plan with beliefs that differ from the model's raw posterior.
// ==========================================================

export function qValue4(model, V, s, a, { gamma, vOpt, rewardOf, doneOf, predictOf, bonusOf }) {
  const p = predictOf ? predictOf(s, a) : model.predict(s, a);
  let q = p.self * gamma * (V.get(s) ?? vOpt) + p.unknown * vOpt;
  for (const [s2, pr] of p.outcomes) q += pr * (rewardOf(s2) + gamma * (1 - doneOf(s2)) * (V.get(s2) ?? vOpt));
  return bonusOf ? q + bonusOf(s, a) : q;
}

export function qValues4(model, V, s, opts) {
  const w = model.widthOf(s);
  return Array.from({ length: w }, (_, a) => qValue4(model, V, s, a, opts));
}

export function valueIteration4(model, V, { budget, theta, ...opts }) {
  let sweeps = 0, backups = 0, delta = Infinity;
  const states = [...model.states()];
  while (sweeps < budget) {
    delta = 0;
    for (const [s, w] of states) {
      let best = -Infinity;
      for (let a = 0; a < w; a++) { const q = qValue4(model, V, s, a, opts); if (q > best) best = q; }
      backups += w;
      const old = V.get(s);
      delta = Math.max(delta, old === undefined ? Infinity : Math.abs(best - old));
      V.set(s, best);
    }
    sweeps++;
    if (delta < theta) break;
  }
  return { sweeps, backups, converged: delta < theta };
}

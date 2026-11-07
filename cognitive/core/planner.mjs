// ==========================================================
// CF-03 core — budgeted value iteration over the learned world model
// ==========================================================
// Q(s,a) = p(SELF) * gamma * V(s)
//        + sum over known outcomes s'  p(s') * [ R(s') + gamma * (1 - D(s')) * V(s') ]
//        + p(UNKNOWN) * vOpt                                 (optimism: an unseen outcome is worth vOpt)
// V(s) = max_a Q(s,a), over every visited state.  R and D come from the caller: the learned arrival model, or the
// declared cue semantics R = D = 1[s' = cue] (CD-005).  Gauss–Seidel sweeps, warm-started from the caller's V, until
// the largest change is below theta or `budget` sweeps are used.  A backup is one Q(s,a) evaluation.
// ==========================================================

export function qValue(model, V, s, a, { gamma, vOpt, rewardOf, doneOf }) {
  const p = model.predict(s, a);
  let q = p.self * gamma * (V.get(s) ?? vOpt) + p.unknown * vOpt;   // an unswept state starts optimistic
  for (const [s2, pr] of p.outcomes) q += pr * (rewardOf(s2) + gamma * (1 - doneOf(s2)) * (V.get(s2) ?? vOpt));
  return q;
}

export function qValues(model, V, s, opts) {
  const w = model.widthOf(s);
  return Array.from({ length: w }, (_, a) => qValue(model, V, s, a, opts));
}

export function valueIteration(model, V, { budget, theta, ...opts }) {
  let sweeps = 0, backups = 0, delta = Infinity;
  const states = [...model.states()];
  while (sweeps < budget) {
    delta = 0;
    for (const [s, w] of states) {
      let best = -Infinity;
      for (let a = 0; a < w; a++) { const q = qValue(model, V, s, a, opts); if (q > best) best = q; }
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

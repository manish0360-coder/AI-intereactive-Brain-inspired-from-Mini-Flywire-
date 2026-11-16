// ==========================================================
// CF-06 mind — world model v6: v3 plus a belief about whether each changed exit will change back, with the rate at
// which changes reverse LEARNED from the agent's own experience
// ==========================================================
// v3 (cognitive/mind/v3/world_model.mjs) is used unchanged as the "current regime" model.  v6 adds, inside the
// model, what CF-05b's RECALL did beside it, but as inference rather than a fixed rule:
//
// 1. Two regimes per changed exit.  When v3 declares that an exit got WORSE, v6 archives the prediction it held just
//    before (the "old regime").  From then on the exit is either PERMANENT (the old regime never returns) or
//    REVERSING (it returns at a time T after the change, T ~ Geometric(h)).  P(reversing) a priori = rho.
//
// 2. Evidence from re-tests.  Each failed attempt on an archived exit, at tau_i steps after the change, is evidence.
//    With q_new = P(attempt fails | current regime) and q_old = P(attempt fails | old regime) and S(t) = (1 - h)^t:
//        L_perm = q_new^k
//        L_rev  = S(tau_k) q_new^k + sum_{j=1..k} [S(tau_{j-1}) - S(tau_j)] q_new^(j-1) q_old^(k-j+1)     (tau_0 = 0)
//        P(reversing | tests) = rho L_rev / (rho L_rev + (1 - rho) L_perm)
//        P(old regime now)    = P(reversing | tests) * (1 - S(tau_now) q_new^k / L_rev)
//    The first move of an archived exit confirms a reversal: the archive is closed and counted.
//
// 3. The planning belief for an archived exit is the mixture (1 - w) * current + w * old, w = P(old regime now).
//    predict() returns that mixture, so any planner that asks the model gets it; no agent-side rule is needed.
//
// 4. rho is learned and pooled over the agent's changed exits (empirical Bayes, iterated to a fixed point):
//        rho = (a0 + confirmed reversals + sum over open archives P(reversing | tests)) / (a0 + b0 + confirmed + open)
//
// Relation to RECALL (CF-05b): with rho fixed at 1 and before any failed re-test, w = 1 - (1 - h)^tau, exactly RECALL's
// weight.  RECALL then resets on each failed re-test; v6 instead weighs the failure as evidence.  The difference that
// matters: rho is learned, so a world whose changes never reverse teaches the model to stop re-testing.
//
// Known limit, declared: a false alarm of v3's change detector archives an exit that never changed; when it moves
// again it is counted as a confirmed reversal, which pushes rho up.  eventLog() records every archive opened and
// every reversal confirmed, with the model's step count, so that EVALUATION code (task E5, after the run) can measure
// this against ground truth; the model never reads the log.
//
// Two properties, stated so that results are read correctly (both tested):
//   - An exit that is never re-tested gives no evidence (L_rev = L_perm = 1), so with every open archive untested the
//     fixed point is rho = 1/2 whatever the number of changes: rho falls only through failed re-tests, which cost steps.
//   - rho is a plug-in empirical-Bayes estimate that includes each archive's own evidence (no leave-one-out), so even
//     the first change's own failed re-tests lower its prior; that, not learning across changes, is the only way v6
//     differs from rho fixed at 1/2 during the first change.
//
// DIAGNOSTIC switch (the CF-05b pattern, cf. v4 recallIf): params.archiveIf(key) -> bool, supplied only by
// cognitive/testbed/arms_v6.mjs to privileged diagnostic arms, decides which declared-worse exits are archived.  An
// ordinary model has no archiveIf and archives every one; the belief arithmetic is the same either way.
// ==========================================================
import { makeWorldModel3, WM3_DEFAULTS } from '../v3/world_model.mjs';

export const WM6_DEFAULTS = Object.freeze({ ...WM3_DEFAULTS, volHazard: 0.01, rhoA0: 1, rhoB0: 1, rhoFixed: null, rhoIterations: 30 });

/** P(reversing | tests) and P(old regime now) for one archive.  Pure; exported for tests. */
export function regimeBelief({ rho, h, qNew, qOld, taus, tauNow }) {
  const S = (t) => (1 - h) ** t, k = taus.length;
  let Lrev = S(k ? taus[k - 1] : 0) * qNew ** k, prev = 0;
  for (let j = 1; j <= k; j++) { Lrev += (S(prev) - S(taus[j - 1])) * qNew ** (j - 1) * qOld ** (k - j + 1); prev = taus[j - 1]; }
  const Lperm = qNew ** k;
  const denom = rho * Lrev + (1 - rho) * Lperm;
  const pRev = denom > 0 ? (rho * Lrev) / denom : 0;
  const pOldNow = Lrev > 0 ? pRev * (1 - (S(tauNow) * qNew ** k) / Lrev) : 0;
  return { pRev, pOldNow: Math.min(1, Math.max(0, pOldNow)) };
}

export function makeWorldModel6(params = {}) {
  const P = { ...WM6_DEFAULTS, ...params };
  const base = makeWorldModel3(P);
  const archives = new Map();               // `${s}|${a}` -> { s, a, held, since, taus: [] }
  const vol = { confirmed: 0, opened: 0, rho: P.rhoFixed ?? P.rhoA0 / (P.rhoA0 + P.rhoB0) };
  // Event log for EVALUATION ONLY: the model's own record of when it archived a changed exit and when it confirmed a
  // reversal, in its own step count.  It holds nothing the model did not compute from its own observations; the task
  // compares it with ground truth after the run (false-alarm diagnostics).  Nothing reads it back into the model.
  const log = [];
  let clock = 0;
  const clamp = (x) => Math.min(1 - 1e-9, Math.max(1e-9, x));
  const mayArchive = (key) => !P.archiveIf || P.archiveIf(key) === true;

  function beliefOf(arch, rho) {
    const cur = base.predict(arch.s, arch.a);
    return regimeBelief({ rho, h: P.volHazard, qNew: clamp(cur.self), qOld: clamp(arch.held.self), taus: arch.taus, tauNow: clock - arch.since });
  }

  function refreshRho() {
    if (P.rhoFixed !== null) { vol.rho = P.rhoFixed; return; }
    let rho = vol.rho;
    for (let it = 0; it < P.rhoIterations; it++) {
      let open = 0, s = 0;
      for (const arch of archives.values()) { s += beliefOf(arch, rho).pRev; open++; }
      const next = (P.rhoA0 + vol.confirmed + s) / (P.rhoA0 + P.rhoB0 + vol.confirmed + open);
      const done = Math.abs(next - rho) < 1e-10;
      rho = next;
      if (done) break;
    }
    vol.rho = rho;
  }

  function predict(s, a) {
    const p = base.predict(s, a), arch = archives.get(`${s}|${a}`);
    if (!arch) return p;
    const w = beliefOf(arch, vol.rho).pOldNow;
    if (w <= 0) return p;
    const merged = new Map(p.outcomes.map(([lab, x]) => [lab, (1 - w) * x]));
    for (const [lab, x] of arch.held.outcomes) merged.set(lab, (merged.get(lab) ?? 0) + w * x);
    return { self: (1 - w) * p.self + w * arch.held.self, outcomes: [...merged], unknown: (1 - w) * p.unknown + w * arch.held.unknown, N: p.N };
  }

  function probOf(s, a, s2) {
    const p = predict(s, a);
    if (s2 === s) return p.self;
    const hit = p.outcomes.find(([lab]) => lab === s2);
    return hit ? hit[1] : p.unknown;
  }

  function update(s, a, s2, reward, done) {
    const key = `${s}|${a}`, moved = s2 !== s, logged = log.length;
    const arch = archives.get(key);
    if (arch) {
      if (moved) { archives.delete(key); vol.confirmed++; log.push(['confirm', s, a, clock]); }   // the old regime is back
      else arch.taus.push(clock - arch.since);                         // a failed re-test: evidence
    }
    const held = base.predict(s, a), worse = base.stats().changesDown;
    base.update(s, a, s2, reward, done);
    if (!moved && !archives.has(key) && base.stats().changesDown > worse && held.outcomes.length && mayArchive(key)) {
      archives.set(key, { s, a, held, since: clock, taus: [] }); vol.opened++; log.push(['open', s, a, clock]);
    }
    clock++;
    refreshRho();
    if (log.length > logged) log[log.length - 1].push(vol.rho);       // at most one entry per step: [type, s, a, step, rho after]
  }

  return {
    params: P,
    visit: (s, w) => base.visit(s, w), states: () => base.states(), widthOf: (s) => base.widthOf(s),
    predict, probOf, rewardProb: (s2) => base.rewardProb(s2), doneProb: (s2) => base.doneProb(s2), update,
    countOf: (s, a) => base.countOf(s, a),
    hyper: () => base.hyper(),
    stats: () => ({ ...base.stats(), archivesOpened: vol.opened, archivesOpen: archives.size, reversalsConfirmed: vol.confirmed, rho: vol.rho }),
    volatility: () => ({ rho: vol.rho, confirmed: vol.confirmed, opened: vol.opened, open: archives.size }),
    eventLog: () => log.map((e) => [...e]),

  };
}

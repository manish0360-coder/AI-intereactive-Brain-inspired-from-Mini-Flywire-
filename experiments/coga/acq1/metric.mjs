// ==========================================================
// ACQ-1 — the crossover acquisition metric (pure)
// ==========================================================
// Input: the logs of one world's two static sessions (E1, E2) and a step window [lo, hi).
// Decisions counted: EDGE attempts (kind 1) from a SWITCH state in the window; self no-ops and refusals are counted separately.
// Per state s, f_k(A) = share of the attempts from s in session k whose target is in the set A.
//
//   psi_s = 1/2 [ (f_1(A1) - f_2(A1)) + (f_2(A2) - f_1(A2)) ]
//
// the shift of choice toward the action set that is reliability-optimal for the environment actually experienced.  An agent whose
// choices do not depend on the reliabilities it experienced has psi_s = 0 whatever its fixed preferences are, because those are
// the same in both sessions and cancel: this is what separates acquisition from chance alignment.
//   psi_w = mean of psi_s over SWITCH states with at least one attempt in BOTH sessions (each state counts equally; repeated
//           visits within a state are pooled as shares).
//   R_w   = state-conditional reliability gain: mean over the same states of
//           1/2 sum_a (g_1(a) - g_2(a)) (p_1(s,a) - p_2(s,a)), g_k(a) the action share at s in session k (secondary metric).
// The raw single-environment quantities (agreement with the environment's own set; mean p of the chosen edge) are returned for
// description only: they are confounded by fixed preferences and by visitation.
// ==========================================================
import { KIND } from '../envsim.mjs';
import { edgeIndex, NEIGHBOURS } from '../worlds.mjs';

export function stateCounts(log, lo, hi) {
  const c = new Map();
  for (const r of log) {
    if (r[0] < lo || r[0] >= hi || r[3] !== KIND.EDGE) continue;
    if (!c.has(r[1])) c.set(r[1], new Map());
    const m = c.get(r[1]); m.set(r[2], (m.get(r[2]) || 0) + 1);
  }
  return c;
}
const share = (m, set) => { let n = 0, h = 0; for (const [a, k] of m) { n += k; if (set.includes(a)) h += k; } return n ? h / n : null; };
const total = (m) => (m ? [...m.values()].reduce((a, b) => a + b, 0) : 0);

export function worldMetric(world, logE1, logE2, lo, hi) {
  const c1 = stateCounts(logE1, lo, hi), c2 = stateCounts(logE2, lo, hi);
  const states = [];
  for (const d of world.sw) {
    const m1 = c1.get(d.s), m2 = c2.get(d.s);
    if (!total(m1) || !total(m2)) { states.push({ s: d.s, n1: total(m1), n2: total(m2), psi: null, R: null }); continue; }
    const psi = 0.5 * ((share(m1, d.A1) - share(m2, d.A1)) + (share(m2, d.A2) - share(m1, d.A2)));
    let R = 0; const n1 = total(m1), n2 = total(m2);
    for (const a of NEIGHBOURS.get(d.s)) { const e = edgeIndex(d.s, a); R += ((m1.get(a) || 0) / n1 - (m2.get(a) || 0) / n2) * (world.p1[e] - world.p2[e]); }
    states.push({ s: d.s, n1, n2, psi, R: R / 2 });
  }
  const ok = states.filter(x => x.psi !== null);
  const mean = (k) => (ok.length ? ok.reduce((a, x) => a + x[k], 0) / ok.length : null);
  return { world: world.id, goal: world.goal, switchStates: world.sw.length, usable: ok.length, psi: mean('psi'), R: mean('R'), states };
}

/** raw single-environment quantities (description only) */
export function rawMetrics(world, log, env, lo, hi) {
  const p = env === 'E1' ? world.p1 : world.p2;
  let n = 0, pSum = 0, own = 0, ownN = 0;
  const sw = new Map(world.sw.map(d => [d.s, env === 'E1' ? d.A1 : d.A2]));
  for (const r of log) { if (r[0] < lo || r[0] >= hi || r[3] !== KIND.EDGE) continue; n++; pSum += p[edgeIndex(r[1], r[2])]; const A = sw.get(r[1]); if (A) { ownN++; if (A.includes(r[2])) own++; } }
  return { attempts: n, meanP: n ? pSum / n : null, ownAgreement: ownN ? own / ownN : null };
}

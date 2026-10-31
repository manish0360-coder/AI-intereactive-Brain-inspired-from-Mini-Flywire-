// ==========================================================
// ACQ-1 — estimators and decision rules (pure; DESIGN.md section 7, DECISION_TABLE.md)
// ==========================================================
// A row per world: { world, goal, psi: { P, A, H, RW, QB1, DYNA }, R: { ... } }, each entry that world's window statistic.
// Primary: Delta_w = psi_w(MFW-P) - psi_w(RW), mean over worlds, per-goal means averaged equally (goals are balanced by construction;
// the stratified form keeps the estimand fixed if a void world unbalances them).
// Interval: stratified t interval with Welch-Satterthwaite degrees of freedom (the statistic is a plain mean of world values).  The
// percentile bootstrap was rejected at design time: at the planned sizes its two-sided type I was 0.053-0.079 in simulation; it
// stays as a sensitivity analysis.
// ==========================================================
import { bootstrap } from '../analysis.mjs';

export function stratifiedMean(rows, f) {
  const groups = new Map();
  for (const r of rows) { const v = f(r); if (v === null || v === undefined || Number.isNaN(v)) continue; if (!groups.has(r.goal)) groups.set(r.goal, []); groups.get(r.goal).push(v); }
  if (!groups.size) return null;
  const m = [...groups.values()].map(a => a.reduce((x, y) => x + y, 0) / a.length);
  return m.reduce((x, y) => x + y, 0) / m.length;
}
export const contrast = (key, a, b) => (r) => (r[key][a] === null || r[key][a] === undefined || (b && (r[key][b] === null || r[key][b] === undefined)) ? null : r[key][a] - (b ? r[key][b] : 0));

// Acklam's inverse normal CDF (upper tail and central region, enough for p >= 0.5) and the Cornish-Fisher expansion of Student's t
// (Abramowitz & Stegun 26.7.5)
function qnorm(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  if (p > 0.97575) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export function tQuantile(p, nu) {
  const z = qnorm(p), z2 = z * z;
  const g1 = (z2 + 1) * z / 4, g2 = (5 * z2 * z2 + 16 * z2 + 3) * z / 96, g3 = (3 * z2 ** 3 + 19 * z2 * z2 + 17 * z2 - 15) * z / 384, g4 = (79 * z2 ** 4 + 776 * z2 ** 3 + 1482 * z2 * z2 - 1920 * z2 - 945) * z / 92160;
  return z + g1 / nu + g2 / nu ** 2 + g3 / nu ** 3 + g4 / nu ** 4;
}

/** stratified t interval of the equal-goal mean of f over worlds */
export function interval(rows, f, { level }) {
  const groups = new Map();
  for (const r of rows) { const v = f(r); if (v === null || v === undefined || Number.isNaN(v)) continue; if (!groups.has(r.goal)) groups.set(r.goal, []); groups.get(r.goal).push(v); }
  const G = [...groups.values()], k = G.length, worlds = G.reduce((a, x) => a + x.length, 0);
  if (!k || G.some(a => a.length < 2)) return { est: null, lo: null, hi: null, level, worlds, df: null, se: null };
  const parts = G.map(a => { const m = a.reduce((x, y) => x + y, 0) / a.length, v = a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1); return { m, n: a.length, u: v / a.length }; });
  const est = parts.reduce((x, p) => x + p.m, 0) / k, sumU = parts.reduce((x, p) => x + p.u, 0), se2 = sumU / (k * k);
  if (se2 === 0) return { est, lo: est, hi: est, level, worlds, df: null, se: 0 };
  const df = sumU ** 2 / parts.reduce((x, p) => x + p.u ** 2 / (p.n - 1), 0);
  const t = tQuantile(1 - (1 - level) / 2, df), se = Math.sqrt(se2);
  return { est, lo: est - t * se, hi: est + t * se, level, worlds, df, se };
}

/** percentile bootstrap of the same statistic (sensitivity only) */
export function bootstrapInterval(rows, f, { replicates, seed, level }) {
  const b = bootstrap(rows, (ws) => stratifiedMean(ws, f), { replicates, seed, level });
  return { est: b.est, lo: b.lo, hi: b.hi, level, replicates: b.replicates };
}

/** the decision table; delta is the frozen margin */
export function decideAcq({ L, U, delta, voidShare, determinismOk, nullOk, pcOk }) {
  if (voidShare > 0.05 || !determinismOk) return { row: 'A8', rec: 'VOID' };
  if (!nullOk || !pcOk) return { row: 'A7', rec: 'NON-EVALUABLE' };
  if (L > 0 && !(U < delta)) return { row: 'A1', rec: 'SUPPORTED' };
  if (L > 0 && U < delta) return { row: 'A2', rec: 'NOT SUPPORTED (negligible effect)' };
  if (L <= 0 && U >= 0 && L > -delta && U < delta) return { row: 'A3', rec: 'NOT SUPPORTED (no meaningful effect)' };
  if (U < 0) return { row: 'A4', rec: 'NOT SUPPORTED (opposite direction)' };
  return { row: 'A5', rec: 'INCONCLUSIVE' };
}

// ==========================================================
// COG-A — estimators, bootstrap and decision rules (pure; DESIGN.md §6, DECISION_TABLE.md)
// ==========================================================
// Input per agent: worlds = [{ world, goal, distal: [pair], stable: [pair] }], pair = { s, VS, VN, tS, tN, YS, YN, LS, LN }.
// theta-hat = sum over AA pairs (YS - YN) / number of AA pairs (event-weighted ratio; AA: VS = VN = 1).
// Interval: goal-stratified cluster bootstrap over worlds (a world's pairs move together), percentile.
// ==========================================================
import { makeRng } from '../../instrumentation/rng.js';
import { W_TIME, T_SHIFT } from './config.mjs';

const AA = (p) => p.VS === 1 && p.VN === 1;

export function sums(worlds, key = 'distal', y = ['YS', 'YN']) {
  let num = 0, den = 0;
  for (const w of worlds) for (const p of w[key]) if (AA(p)) { if (p[y[0]] === null || p[y[1]] === null) throw new Error('a sealed outcome reached the estimator'); num += p[y[0]] - p[y[1]]; den++; }
  return { num, den, est: den ? num / den : null };
}
export const theta = (worlds) => sums(worlds, 'distal', ['YS', 'YN']).est;
export const lambda = (worlds) => sums(worlds, 'stable', ['LS', 'LN']).est;

/** goal-stratified cluster bootstrap of stat(worlds) -> number; returns { est, lo, hi, redraws } */
export function bootstrap(worlds, stat, { replicates, seed, level = 0.95 }) {
  const rnd = makeRng(seed >>> 0);
  const strata = new Map(); for (const w of worlds) { if (!strata.has(w.goal)) strata.set(w.goal, []); strata.get(w.goal).push(w); }
  const groups = [...strata.keys()].sort((a, b) => a - b).map(g => strata.get(g));
  const est = stat(worlds), out = []; let redraws = 0;
  while (out.length < replicates) {
    const sample = []; for (const g of groups) for (let i = 0; i < g.length; i++) sample.push(g[Math.floor(rnd() * g.length)]);
    const v = stat(sample); if (v === null || Number.isNaN(v)) { redraws++; if (redraws > replicates) throw new Error('bootstrap: too many empty replicates'); continue; }
    out.push(v);
  }
  out.sort((a, b) => a - b);
  const q = (p) => out[Math.min(out.length - 1, Math.max(0, Math.floor(p * out.length)))];
  return { est, lo: q((1 - level) / 2), hi: q(1 - (1 - level) / 2), redraws, replicates };
}

/** paired difference of two agents' theta on the same worlds (positive control): worlds carry both agents' pairs */
export function pairedDifference(worldsA, worldsB) {
  const byId = new Map(worldsB.map(w => [w.world, w]));
  return worldsA.map(w => ({ world: w.world, goal: w.goal, a: w, b: byId.get(w.world) }));
}
export const diffStat = (joined) => { const a = theta(joined.map(x => x.a)), b = theta(joined.map(x => x.b)); return a === null || b === null ? null : a - b; };

// ---- M1-M5 ----
export function strata(worlds) {
  const c = { AA: 0, A0: 0, '0A': 0, '00': 0 };
  for (const w of worlds) for (const p of w.distal) c[`${p.VS ? 'A' : '0'}${p.VN ? 'A' : '0'}`]++;
  const enc = c.AA + c.A0 + c['0A'];
  return { ...c, q: enc ? c.AA / enc : null, encounterS: (c.AA + c.A0) / Math.max(1, c.AA + c.A0 + c['0A'] + c['00']), encounterN: (c.AA + c['0A']) / Math.max(1, c.AA + c.A0 + c['0A'] + c['00']) };
}
export function manski(worlds) {
  let base = 0, lo = 0, hi = 0, E = 0;
  for (const w of worlds) for (const p of w.distal) {
    if (p.VS && p.VN) { base += p.YS - p.YN; E++; }
    else if (p.VS) { lo += p.YS - 1; hi += p.YS; E++; }
    else if (p.VN) { lo += -p.YN; hi += 1 - p.YN; E++; }
  }
  return E ? { lower: (base + lo) / E, upper: (base + hi) / E, E } : null;
}
export function byTime(worlds) {
  const bins = [[T_SHIFT, T_SHIFT + 150], [T_SHIFT + 150, T_SHIFT + 500], [T_SHIFT + 500, Infinity]];
  const sel = (f) => worlds.map(w => ({ ...w, distal: w.distal.filter(p => !AA(p) || f(p)) }));
  return { bins: bins.map(([a, b]) => ({ from: a, to: b, ...sums(sel(p => p.tS >= a && p.tS < b)) })), matched: sums(sel(p => Math.abs(p.tS - p.tN) <= W_TIME)) };
}
export function worldWeighted(worlds) {
  const per = worlds.map(w => sums([w])).filter(x => x.den > 0).map(x => x.est);
  return per.length ? per.reduce((a, b) => a + b, 0) / per.length : null;
}
export function composite(worlds) {
  let s = 0, n = 0;
  for (const w of worlds) for (const p of w.distal) { s += (p.VS ? p.YS : 0) - (p.VN ? p.YN : 0); n++; }
  return n ? s / n : null;
}

// ---- decision table (DECISION_TABLE.md) ----
export function decide({ L, U, delta, specUpper, q, qMin, competenceOk, voidShare, pcPassed, nullOk }) {
  if (voidShare > 0.05) return { row: 'R8', rec: 'VOID' };
  if (!pcPassed || !nullOk) return { row: 'R1', rec: 'NON-EVALUABLE' };
  if (q === null || q < qMin || !competenceOk) return { row: 'R7', rec: 'NON-EVALUABLE' };
  if (L > 0 && !(U < delta)) return specUpper < delta ? { row: 'R2', rec: 'SUPPORTED' } : { row: 'R2b', rec: 'INCONCLUSIVE (non-specific)' };
  if (L > 0 && U < delta) return { row: 'R3', rec: 'NOT SUPPORTED (negligible effect)' };
  if (L <= 0 && U >= 0 && L > -delta && U < delta) return { row: 'R4', rec: 'NOT SUPPORTED (no meaningful effect)' };
  if (U < 0) return { row: 'R5', rec: 'NOT SUPPORTED (opposite direction)' };
  return { row: 'R6', rec: 'INCONCLUSIVE' };
}

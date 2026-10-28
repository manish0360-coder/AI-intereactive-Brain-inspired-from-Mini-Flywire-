// ==========================================================
// COG-A — simulation-based power analysis (POWER_ANALYSIS.md); pure, seeded, reproducible
// ==========================================================
//   node experiments/coga/power.mjs --dev <dev_analysis.json> --out <file.json> [--R 500] [--B 1000]
// World structures (DISTAL pairs with their encounter indicators V_S, V_N) are resampled, goal-stratified, from the development
// MFW sessions.  These are visitation data and are not blinded.  The NO-SWAP outcome rate r_N is the development MFW NO-SWAP rate.
// SWAP outcomes are drawn from assumed effects:
//   Y_S ~ Bernoulli(clip(r_N + theta_w)),  theta_w = theta + N(0, tau^2),
// correlated with Y_N through a Gaussian copula with correlation rho (rho = 0 is the conservative primary scenario).
// Low support: each AA pair is kept with probability f and otherwise demoted to A0 or 0A (equal chance).
// The analysis is the preregistered one: the event-weighted theta-hat and the goal-stratified world bootstrap percentile interval.
// Reported per cell (R replicates):
//   P(L > 0)           power at theta = delta, type I at theta = 0
//   P(equivalence)     -delta < L and U < delta
//   coverage           P(L <= theta <= U)
// ==========================================================
import fs from 'node:fs';
import { makeRng } from '../../instrumentation/rng.js';
import { theta as thetaHat, bootstrap } from './analysis.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

// Acklam's inverse normal CDF (relative error < 1.2e-9)
function qnorm(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
const gauss = (rnd) => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
const clip = (x) => Math.min(1, Math.max(0, x));

/** one simulated study of n accepted worlds (n divisible by 4: equal goal allocation) */
export function simulateStudy(pool, n, { theta, tau, rho, f, rN }, rnd) {
  const goals = [...pool.keys()].sort((a, b) => a - b), per = n / goals.length, worlds = [];
  for (const g of goals) {
    const P = pool.get(g);
    for (let i = 0; i < per; i++) {
      const src = P[Math.floor(rnd() * P.length)], tw = theta + (tau > 0 ? tau * gauss(rnd) : 0), pS = clip(rN + tw);
      const distal = src.distal.map(p => {
        let VS = p.VS, VN = p.VN;
        if (VS && VN && f < 1 && rnd() >= f) { if (rnd() < 0.5) VS = 0; else VN = 0; }
        const z1 = gauss(rnd), z2 = rho * z1 + Math.sqrt(1 - rho * rho) * gauss(rnd);
        return { s: p.s, VS, VN, YN: z1 < qnorm(rN) ? 1 : 0, YS: z2 < qnorm(pS) ? 1 : 0 };
      });
      worlds.push({ world: `${g}-${i}`, goal: g, distal, stable: [] });
    }
  }
  return worlds;
}

export function cell(pool, n, scen, { R, B, seed }) {
  const rnd = makeRng(seed >>> 0);
  let pos = 0, neg = 0, eq = 0, cover = 0, done = 0;
  for (let r = 0; r < R; r++) {
    const ws = simulateStudy(pool, n, scen, rnd);
    if (thetaHat(ws) === null) continue;
    const ci = bootstrap(ws, thetaHat, { replicates: B, seed: (seed + 7919 * (r + 1)) >>> 0 });
    done++; if (ci.lo > 0) pos++; if (ci.hi < 0) neg++; if (scen.delta && ci.lo > -scen.delta && ci.hi < scen.delta) eq++; if (ci.lo <= scen.theta && scen.theta <= ci.hi) cover++;
  }
  return { n, ...scen, R: done, pPos: pos / done, pNeg: neg / done, pEquiv: scen.delta ? eq / done : null, coverage: cover / done };
}

export function poolFrom(dev) {
  const pool = new Map();
  for (const w of dev.mfw.worlds) { if (!pool.has(w.goal)) pool.set(w.goal, []); pool.get(w.goal).push({ distal: w.distal.map(p => ({ s: p.s, VS: p.VS, VN: p.VN })) }); }
  return pool;
}

if (arg('--out')) {
  const dev = JSON.parse(fs.readFileSync(arg('--dev'), 'utf8'));
  const pool = poolFrom(dev), rN = dev.mfw.noswapY.rate;
  const R = Number(arg('--R', '500')), B = Number(arg('--B', '1000'));
  const ns = (arg('--n', '40,80,120,160,240,320,400')).split(',').map(Number), deltas = (arg('--deltas', '0.05,0.10,0.15,0.20')).split(',').map(Number);
  const cells = [];
  let seed = 20261029;
  for (const n of ns) {
    cells.push({ kind: 'null', ...cell(pool, n, { theta: 0, tau: 0, rho: 0, f: 1, rN, delta: null }, { R, B, seed: seed++ }) });
    for (const delta of deltas) {
      cells.push({ kind: 'power', ...cell(pool, n, { theta: delta, tau: 0, rho: 0, f: 1, rN, delta }, { R, B, seed: seed++ }) });
      cells.push({ kind: 'equivalence', ...cell(pool, n, { theta: 0, tau: 0, rho: 0, f: 1, rN, delta }, { R, B, seed: seed++ }) });
    }
  }
  const out = { schema: 'coga/1.power', R, B, rN, poolWorlds: Object.fromEntries([...pool].map(([g, p]) => [g, p.length])), cells };
  fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
  for (const c of cells) console.log(`${c.kind.padEnd(11)} n ${String(c.n).padStart(3)} theta ${c.theta.toFixed(2)} delta ${c.delta ?? '-'}: P(L>0) ${c.pPos.toFixed(3)}  P(equiv) ${c.pEquiv === null ? '-' : c.pEquiv.toFixed(3)}  coverage ${c.coverage.toFixed(3)}`);
}

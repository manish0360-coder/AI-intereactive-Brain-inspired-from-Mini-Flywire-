// ==========================================================
// ACQ-1 — simulation power analysis of the preregistered interval (pure, seeded, reproducible)
// ==========================================================
//   node experiments/coga/acq1/power.mjs --dev <rows.json> --out <file.json> [--R 20000]
// Unit: the world.  Dependence within a world is carried by using the world-level statistic Delta_w itself.
// Delta_w values are resampled, goal-stratified, from the development worlds, recentred on the assumed effect:
//   Delta*_w = (Delta_w - mean Delta) * c + theta + N(0, tau^2)
// c inflates the between-world spread (1 = development SD; 1.25 covers the upper confidence limit of an SD from 30 worlds),
// tau adds heterogeneity of the effect, and each world is lost with probability loss (failed sessions).
// Reported per cell: P(L > 0), P(equivalence within +-delta), coverage of theta.  Type I = P(L > 0) + P(U < 0) at theta = 0.
// ==========================================================
import fs from 'node:fs';
import { makeRng } from '../../../instrumentation/rng.js';
import { interval } from './analysis.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const gauss = (r) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };

export function simulate(pool, n, { theta, c, tau, loss }, rnd) {
  const goals = [...pool.keys()].sort((a, b) => a - b), per = Math.floor(n / goals.length), rows = [];
  for (const g of goals) { const P = pool.get(g); for (let i = 0; i < per; i++) { if (rnd() < loss) continue; rows.push({ goal: g, d: P[Math.floor(rnd() * P.length)] * c + theta + (tau > 0 ? tau * gauss(rnd) : 0) }); } }
  return rows;
}
export function cell(pool, n, scen, { R, seed, delta }) {
  const rnd = makeRng(seed >>> 0); let pos = 0, neg = 0, eq = 0, cov = 0;
  for (let r = 0; r < R; r++) {
    const rows = simulate(pool, n, scen, rnd);
    const ci = interval(rows, x => x.d, { level: 0.95 });
    if (ci.lo > 0) pos++; if (ci.hi < 0) neg++; if (ci.lo > -delta && ci.hi < delta) eq++; if (ci.lo <= scen.theta && scen.theta <= ci.hi) cov++;
  }
  return { n, ...scen, delta, R, pPos: pos / R, pNeg: neg / R, pEquiv: eq / R, coverage: cov / R };
}

if (process.argv[1] && process.argv[1].endsWith('power.mjs')) {
  const dev = JSON.parse(fs.readFileSync(arg('--dev'), 'utf8'));
  const mean = dev.rows.reduce((a, r) => a + r.delta, 0) / dev.rows.length, sd = Math.sqrt(dev.rows.reduce((a, r) => a + (r.delta - mean) ** 2, 0) / (dev.rows.length - 1));
  const pool = new Map(); for (const r of dev.rows) { if (!pool.has(r.goal)) pool.set(r.goal, []); pool.get(r.goal).push(r.delta - mean); }
  const R = Number(arg('--R', '20000')), delta = Number(arg('--delta', '0.10'));
  const ns = arg('--n', '40,60,80,100,120,160').split(',').map(Number);
  const scenarios = [{ name: 'primary', c: 1, tau: 0, loss: 0 }, { name: 'sd x 1.25', c: 1.25, tau: 0, loss: 0 }, { name: 'heterogeneity tau 0.10', c: 1, tau: 0.10, loss: 0 }, { name: 'sd x 1.25, tau 0.10, 5% worlds lost', c: 1.25, tau: 0.10, loss: 0.05 }];
  const cells = []; let seed = 20261031;
  for (const n of ns) for (const s of scenarios) for (const theta of [0, delta]) cells.push({ scenario: s.name, ...cell(pool, n, { theta, c: s.c, tau: s.tau, loss: s.loss }, { R, seed: seed++, delta }) });
  const out = { schema: 'coga/acq1.power', interval: 'stratified t, Welch-Satterthwaite (analysis.mjs interval)', R, delta, devWorlds: dev.rows.length, devSD: sd, poolWorlds: Object.fromEntries([...pool].map(([g, p]) => [g, p.length])), cells };
  fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
  console.log(`dev worlds ${dev.rows.length}, SD(Delta_w) ${sd.toFixed(3)}`);
  for (const n of ns) for (const s of scenarios) { const a = cells.find(c => c.n === n && c.scenario === s.name && c.theta === 0), b = cells.find(c => c.n === n && c.scenario === s.name && c.theta === delta);
    console.log(`n ${String(n).padStart(3)} ${s.name.padEnd(36)} type I ${(a.pPos + a.pNeg).toFixed(3)}  equivalence@0 ${a.pEquiv.toFixed(3)}  power@delta ${b.pPos.toFixed(3)}  coverage ${a.coverage.toFixed(3)}/${b.coverage.toFixed(3)}`); }
}

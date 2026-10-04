// H1-R v1.0 — supporting simulation for the §12 confirmatory test (Appendix B.2).
// Pure statistics: no agent, no seed of the study, no configuration. It draws synthetic C x S arrays
//   d_cs = mu + a_c + b_s + e_cs
// and reports the rejection rate at alpha = 0.01 (two-sided) of:
//   frozen   min F' with nu = min(C-1, S-1)              (the frozen §12 test)
//   satt     min F' with Satterthwaite df               (descriptive variant; NOT frozen)
//   quasi    quasi-F' (components truncated at 0)       (alternative considered; NOT frozen)
//   cfgMeans one-sample t on the C configuration means  (invalid when seed variance > 0)
//   cells    one-sample t on all cells                  (pseudoreplicated; invalid)
// The frozen test's size bound is proven analytically in v1.0 §12; this simulation only illustrates it.
//
//   node research/preregistrations/h1r_v1_checks/min_f_size_simulation.mjs
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = mulberry32(20261004);                                   // simulation seed (not a study seed)
let spare = null;
const norm = () => { if (spare !== null) { const s = spare; spare = null; return s; } let u = 0; while (u === 0) u = R(); const v = R();
  const r = Math.sqrt(-2 * Math.log(u)); spare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v); };
const t3 = () => { const z = norm(); let c = 0; for (let i = 0; i < 3; i++) { const g = norm(); c += g * g; } return z / Math.sqrt(c / 3) / Math.sqrt(3); };
function lgamma(x) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -tmp + Math.log(2.5066282746310005 * s / x); }
function betacf(a, b, x) { const q = a + b, qp = a + 1, qm = a - 1; let c = 1, d = 1 - q * x / qp; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qm + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
    aa = -(a + m) * (q + m) * x / ((a + m2) * (qp + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; }
  return h; }
function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const pT = (t, nu) => (!isFinite(t) || nu <= 0) ? NaN : ibeta(nu / 2, 0.5, nu / (nu + t * t));   // two-sided p of Student t
function tests(d, C, S) {
  let g = 0; const rm = new Array(C).fill(0), cm = new Array(S).fill(0);
  for (let c = 0; c < C; c++) for (let s = 0; s < S; s++) { const x = d[c * S + s]; g += x; rm[c] += x / S; cm[s] += x / C; } g /= C * S;
  let ssC = 0, ssS = 0, ssE = 0; for (const x of rm) ssC += (x - g) ** 2; for (const x of cm) ssS += (x - g) ** 2;
  for (let c = 0; c < C; c++) for (let s = 0; s < S; s++) ssE += (d[c * S + s] - rm[c] - cm[s] + g) ** 2;
  const MSC = S * ssC / (C - 1), MSS = C * ssS / (S - 1), MSE = ssE / ((C - 1) * (S - 1));
  const den = MSC + MSS, t = g / Math.sqrt(den / (C * S));
  const out = { frozen: pT(t, Math.min(C - 1, S - 1)), satt: pT(t, den * den / (MSC * MSC / (C - 1) + MSS * MSS / (S - 1))) };
  { const vc = Math.max(0, (MSC - MSE) / S), vs = Math.max(0, (MSS - MSE) / C); const v = vc / C + vs / S + MSE / (C * S);
    const terms = []; if (vc > 0) terms.push([1 / (C * S), MSC, C - 1]); if (vs > 0) terms.push([1 / (C * S), MSS, S - 1]);
    const ce = 1 / (C * S) - (vc > 0 ? 1 / (C * S) : 0) - (vs > 0 ? 1 / (C * S) : 0); if (ce !== 0) terms.push([ce, MSE, (C - 1) * (S - 1)]);
    out.quasi = pT(g / Math.sqrt(v), v * v / terms.reduce((a, [k, m, df]) => a + (k * m) ** 2 / df, 0)); }
  { let sd = 0; for (const x of rm) sd += (x - g) ** 2; out.cfgMeans = pT(g / (Math.sqrt(sd / (C - 1)) / Math.sqrt(C)), C - 1); }
  { let sd = 0; for (const x of d) sd += (x - g) ** 2; out.cells = pT(g / (Math.sqrt(sd / (C * S - 1)) / Math.sqrt(C * S)), C * S - 1); }
  return out;
}
function run(C, S, sc, ss, se, mu, reps, tail = false) {
  const keys = ['frozen', 'satt', 'quasi', 'cfgMeans', 'cells'], rej = Object.fromEntries(keys.map(k => [k, 0])), d = new Float64Array(C * S), draw = tail ? t3 : norm;
  for (let r = 0; r < reps; r++) {
    const a = Array.from({ length: C }, () => sc * draw()), b = Array.from({ length: S }, () => ss * draw());
    for (let c = 0; c < C; c++) for (let s = 0; s < S; s++) d[c * S + s] = mu + a[c] + b[s] + se * draw();
    const p = tests(d, C, S); for (const k of keys) if (p[k] < 0.01) rej[k]++;
  }
  return keys.map(k => (rej[k] / reps).toFixed(4)).join('  ');
}
const REPS = 20000;
console.log('H1-R v1.0 Appendix B.2 — rejection rate at alpha = 0.01 under mu = 0 (20,000 replications; Monte Carlo SE about 0.0007 at 0.01)');
console.log('columns: frozen (nu = min(C-1,S-1)) | Satterthwaite min F\' | quasi-F\' | configuration-means t | cells t');
for (const [C, S] of [[30, 2], [30, 3], [30, 5], [30, 8], [30, 10], [30, 20], [5, 5], [10, 5]])
  for (const [sc, ss, se] of [[0, 1, 1], [1, 1, 1], [0, 1, 0.3], [1, 0, 1], [0, 0, 1]])
    console.log(`normal  C=${C} S=${String(S).padEnd(2)} sd(config)=${sc} sd(seed)=${ss} sd(cell)=${se}: ${run(C, S, sc, ss, se, 0, REPS)}`);
for (const [C, S] of [[30, 5], [30, 10], [10, 5]]) for (const [sc, ss, se] of [[0, 1, 1], [1, 1, 1]])
  console.log(`t3      C=${C} S=${String(S).padEnd(2)} sd(config)=${sc} sd(seed)=${ss} sd(cell)=${se}: ${run(C, S, sc, ss, se, 0, REPS, true)}`);

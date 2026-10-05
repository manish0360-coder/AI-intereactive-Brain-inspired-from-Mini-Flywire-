// ==========================================================
// H1-R — analyze.js: the pre-registered analysis instrument (H1-R v1.0 §6, §8, §10, §12–§15; D-020; D-023; D-024; D-025)
// ==========================================================
// Authority: H1-R v1.0 (SHA-256 c52e7337…a836), the inherited M7 clauses, D-020 (implementation pins), and the
// Research Director's frozen interpretation rulings, recorded in research/09_decisions.md:
//   D-024  IR-03b, IR-12, IR-34c; PR-1, PR-2, PR-3; PR-5 … PR-12; X-1; C-1, C-2, C-3;
//   D-025  PR-4 (A1, B1, K1, E1, F1) and the closing micro-rulings (C-1 HALT, PR-7.3 / PR-12 bins, PR-12 undirected
//          variant, PR-10.1 array, X-1 scope, link ① arms).
// Each ruling is listed in RULINGS below. Readings adopted where the text and the rulings admit only one reading, or
// where a detail must be fixed to compute at all, are listed in INFERENCES (I-1 …). Nothing is left pending.
//
// Determinism: no clock, no Math.random, no I/O besides the inputs and `git cat-file` of one pinned B2 blob (the pure
// arbitration function the shadow weight requires, v1.0 §8). Random numbers come only from makeRng (mulberry32,
// identical to instrumentation/rng.js) with the analysis seeds of v1.0 §18: 770001 power, 770002 bootstrap (a fresh
// generator for every CI), 770003 permutation null (one generator per records document), 770004 link-④ sample.
//
//   node experiments/h1r/analyze.js <fixtureDir> <output.json>
//     reads every S*.json (schema h1r.d021b.study/1) and M*.json (h1r.d021b.records/1) and writes one document in the
//     output schema h1r.d021b.output/1 (research/preregistrations/h1r_d021b/GEMINI_INSTRUCTIONS.md §10).
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUTPUT_SCHEMA = 'h1r.d021b.output/1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const ARMS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
const WIN = { W1: [0, 299], W2: [300, 1499], W3: [1500, 1799], W4: [1800, 2999] };
const WINDOWS = ['W1', 'W2', 'W3', 'W4'];
const B_BOOT = 10000, B_POWER = 10000, B_PERM = 10000, ALPHA = 0.01, HOLM_FAMILY = 6;

export const RULINGS = Object.freeze({
  'IR-03b': 'D-024 §1: half-life threshold thr = 0.5 · R_W2 literally, no clamp.',
  'IR-12': 'D-024 §1: a Spearman/rank statistic with zero variance (or fewer than 3 keys, v1.0 §8) is null, never 0 or ε.',
  'IR-34c': 'D-024 §1: undefined bootstrap replicates are counted, never converted or discarded; fewer than 10,000 valid → CI null.',
  'PR-1': 'D-024 §2: a non-computable criterion is FAILED/FIRED; F-11 follows C-1.',
  'PR-2': 'D-024 §2: F-1 and F-3 with a defined statistic and a null bootstrap CI are FIRED.',
  'PR-3': 'D-024 §2: outside the §12 crossed test and its CI, every valid cell is used; the §12 row rule is not extended.',
  'PR-4': 'D-025 §1: x = |recorded trust term|/12; bin = min(4, ⌊10x⌋); the recorded step-0 candidate entries; pooled Σflips/Σdecisions per bin, then Spearman ρ of bin index vs rate; empty bin or zero variance → null.',
  'PR-5': 'D-024 §3: both snapshots per A1 run (τ 1499 then 2999), one makeRng(770003) over runs; undefined ρ → no shuffles, p null; 99th percentile = 9,900th raw ρ*; per-run p and percentile only.',
  'PR-6': 'D-024 §4: attempts with τ ∈ [0, 2999]; one global prequential base rate; Brier(trust), Brier(base), their difference; mean of per-run scores; whole run.',
  'PR-7': 'D-024 §5, D-025 §4, §8: n_updates = actual trust-store increments per window and whole run; coverage at τ 1499 and 2999 (raw ≥ 3 over raw ≥ 1 in the phase); entropy of the raw ≥ 1 keys, bin = min(9, ⌊10x⌋); all seven arms.',
  'PR-8': 'D-024 §6: tick lengths with the reset observation lag corrected (cap episode 150, not 151); first episode from τ = 0; KM median = smallest t with S(t) ≤ 0.5; whole run; median of run medians with two-middle averaging (+∞ dominates); all seven arms.',
  'PR-9': 'D-024 §7: realised directed transitions in W (successes incl. goal entries; slips as u → u); no teleports, no unrecorded no-ops; per run per window, mean per arm; W1–W4.',
  'PR-10': 'D-024 §8, D-025 §6: Appendix-B.2 Satterthwaite min F′ on the §12 analysed array (degenerate → null); exact Pratt Wilcoxon (two-sided, sign-flip) on every valid cell, configuration means and seed means, direction sign(T⁺ − T⁻); rank-biserial (T⁺ − T⁻)/(T⁺ + T⁻).',
  'PR-11': 'D-024 §9: A5 ≡ A2 per window = identity of the saved reward-event streams restricted to the window; the fingerprint stays a whole-run diagnostic.',
  'PR-12': 'D-024 §10, D-025 §3, §5: calibration curve (link-② keys, τ 1499, bin = min(9, ⌊10x⌋), mean trust and mean p_e, pooled over A1 runs); first-order partial Spearman controlling for raw per-phase attempts (both snapshots, < 4 keys or zero variance or undefined denominator → null); undirected pooled ρ with raw₁ + raw₂ ≥ 5.',
  'X-1': 'D-024 §11, D-025 §7: descriptive CIs only for already-promised descriptive link statistics and the already-defined contract contrasts, including W2 and W4; no new arm-pair families.',
  'C-1': 'D-024 §12, D-025 §2: a non-computable initial F-11 takes the predetermined extension first; non-computable or firing after it → fires = true, VOID; extension unavailable → fires = false, HALT.',
  'C-2': 'D-024 §13: the §12 bootstrap recomputes on every available valid cell used by the point statistic (R1).',
  'C-3': 'D-024 §14: the bootstrap index universe is the complete C × S grid (G1); empty rows and columns are kept.',
});
export const INFERENCES = Object.freeze({
  'I-1': 'Link ③ counts (decision ticks, replay ticks, flips, monotonicity bins) are over τ ∈ [0, 2999], matching the 3000 of FR\'s denominator; calls 0–4 belong to no window.',
  'I-2': 'MS_CS = Σ(d_cs − d̄_c· − d̄_·s + d̄)²/((C−1)(S−1)), the only definition consistent with σ̂_c² = (MS_C − MS_CS)/S and σ̂_s² = (MS_S − MS_CS)/C.',
  'I-3': 'Each bootstrap CI (one statistic, one window, one arm) is "one analysis" and starts a fresh makeRng(770002).',
  'I-4': 'The two-way bootstrap draws ⌊u·n⌋ with n = the number of configurations, then seeds, of the full index grid (C-3), in that order.',
  'I-5': 'The F-1 statistic is the mean of the defined ρ_run (the undefined ones are counted and reported); it is undefined iff none is defined.',
  'I-6': 'F-3: a kept sample whose fork crashed twice is dropped after the first-m selection, not replaced.',
  'I-7': 'F-7 ("contains 0 or lies below 0") fires iff the CI lower bound ≤ 0; F-3 likewise on its bootstrap CI.',
  'I-8': 'The headline fraction is the ratio of the mean paired differences (A1 − A2)/(A7 − A2); a replicate with a zero denominator is undefined (IR-34c).',
  'I-9': 'The power simulation draws every deviate in the pinned order even when a σ̂ is 0 (the draw order is part of the pin).',
  'I-10': 'Extension configurations enter P̄ and the final pilot array only if the extension was taken.',
  'I-11': 'F-1, F-2, F-3 and every Stage-2 descriptive link statistic use the Stage-2 A1 runs (§13: Stage-1 data serve only the gates, F-11, the variance components and F-10\'s pilot reference).',
  'I-12': 'The F-11 arrays and the power procedure\'s final pilot array are §12 arrays: the row rule applies.',
  'I-13': 'Shadow weight w₀ = applied ? clamp(F − t)·0.60 + arbitrate({…, confidenceScore − t, …})·0.40 : clamp(F − t), with every other recorded input unchanged (v1.0 §8 and the B2 blend).',
  'I-14': 'Sums are taken in ascending index order; TR(τ) is the direct sum over τ′ = τ−99 … τ.',
  'I-15': 'Retired: no criterion is pending any more (D-024, D-025).',
  'I-16': 'The F-2 verdict uses the filtered FR; the M7 §9.3 exclusion-validity status (filtered vs unfiltered) is reported (v1.0 §14 "No other rule … may enter the verdict").',
  'I-17': 'The headline fraction is reported as undefined when the (A7 − A2) §12 CI is not computable: the degenerate-denominator rule cannot establish that the CI excludes 0 (the conservative principle of PR-1 and PR-2).',
  'I-18': 'Permutation null: each of the 10,000 shuffles is a Fisher–Yates permutation (D-020 pin 5) of the key-ordered p vector itself, not of the previous shuffle; ρ* uses the Spearman of ρ_run. The runs of one records document are taken in (configIndex, seed) order.',
  'I-19': 'Brier: the base-rate counts ("so far") run over the same attempts as the score (τ ∈ [0, 2999], record order) and exclude the current attempt.',
  'I-20': 'Link ①: actual trust-store increments follow the arm semantics (B2 arms.js: allowsTrustUpdate is false only in A4; v1.0 §3: every drawn attempt credits a in every other arm). The whole-run n_updates counts every recorded attempt (calls 0–4 included).',
  'I-21': 'Steps-to-goal: a goal reset recorded at call g ends its episode at g (the goal step) and the next starts at g + 1; a cap reset recorded at call c fires before call c\'s step, so its episode ends at c − 1 and the next starts at c (R1_REPORT, cap H7). Resets before τ = 0 are ignored. An episode censored at t is at risk at t.',
  'I-22': 'Per-arm means and medians are over the runs of that arm in the records document; runs whose value is undefined are excluded and counted.',
  'I-23': 'Records-level CIs (X-1): the §12 two-way bootstrap over that arm\'s (configIndex × seed) grid of the runs in the records document (C-3), fresh makeRng(770002), for the ruled aggregates only (mean Brier, median of run KM medians, mean trajectory entropy).',
  'I-24': 'Study-level descriptive link CIs (X-1) cover the link statistics the study input carries: mean ρ_run at τ = 2999, FR filtered and unfiltered, the per-window flip rates (filtered and unfiltered) and the PR-4 monotonicity ρ; W2 and W4 get the §12 CI of each contract contrast.',
  'I-25': '"Disagreement in sign" compares sign(T⁺ − T⁻) of each Wilcoxon variant with the sign of the primary d̄ (Math.sign; zero is its own sign).',
  'I-26': 'PR-11: the study input schema carries no reward-event streams, so the per-window A5 ≡ A2 identity is computed from run records (records.descriptive) and reported as null at study level, with the reason.',
  'I-27': 'Configuration means (Wilcoxon, rank-biserial) are over each configuration\'s valid seeds, seed means over each seed\'s valid configurations (PR-3); a configuration or seed without a valid cell contributes nothing.',
  'I-28': 'Monotonicity: a decision tick\'s x is the maximum of |t|/12 over its recorded step-0 candidate entries; a decision tick without candidate entries, or with a non-finite trust term, refuses the record.',
  'I-29': 'Link ① entropy and coverage, and the trust values of PR-12, use the snapshot\'s store (a, s): trust = (s + 1)/(a + 2) (v1.0 §8); a trust value outside [0, 1] refuses the record.',
});
const enc = (x) => (typeof x === 'number' && !Number.isFinite(x)) ? (Number.isNaN(x) ? 'NaN' : x > 0 ? 'Infinity' : '-Infinity') : x;

// ---------------- random numbers (v1.0 §12, §18; D-020 pins 4–6) ----------------
/** mulberry32, identical to instrumentation/rng.js makeRng. */
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** D-020 pin 4: one deviate per pair, z = √(−2 ln u₁)·cos(2πu₂); u₁ redrawn while 0, then u₂; sine partner discarded. */
export function normal(rng) { let u1 = rng(); while (u1 === 0) u1 = rng(); const u2 = rng(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
/** D-020 pin 5: for i = n−1 down to 1, j = ⌊u·(i+1)⌋, swap a[i] and a[j]. Returns a new array. */
export function fisherYates(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

// ---------------- Student t (two-sided p and upper quantile; integer ν ≥ 1) ----------------
// p = I_x(ν/2, 1/2) with x = ν/(ν + t²), 1 − x = t²/(ν + t²). B(ν/2, 1/2) by exact recurrence from B(1, ½) = 2 or
// B(½, ½) = π, B(a+1, ½) = B(a, ½)·a/(a + ½). The continued fraction is the modified Lentz form.
function betaHalf(a) { let b, s; if (Number.isInteger(a)) { b = 2; s = 1; } else { b = Math.PI; s = 0.5; } for (; s < a; s += 1) b = b * s / (s + 0.5); return b; }
function betacf(a, b, x) {
  const FPMIN = 1e-300, EPS = Number.EPSILON, qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= 100000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del; if (Math.abs(del - 1) <= EPS) return h;
  }
  throw new Error('betacf: no convergence');
}
/** Two-sided p-value of Student's t with integer ν ≥ 1. */
export function tTwoSidedP(t, nu) {
  if (!Number.isInteger(nu) || nu < 1) throw new Error(`tTwoSidedP: ν must be a positive integer, got ${nu}`);
  if (Number.isNaN(t)) return NaN;
  const at = Math.abs(t); if (at === 0) return 1; if (at === Infinity) return 0;
  const a = nu / 2, b = 0.5, t2 = at * at, x = nu / (nu + t2), xc = t2 / (nu + t2);
  const front = Math.exp(a * Math.log(x) + b * Math.log(xc)) / betaHalf(a);
  if (x < (a + 1) / (a + b + 2)) return front * betacf(a, b, x) / a;
  return 1 - front * betacf(b, a, xc) / b;
}
const qCache = new Map();
/** Critical value t_{ν, 1 − α/2}: the t > 0 whose two-sided p equals α, by bisection to adjacent doubles. */
export function tCritical(alpha, nu) {
  const k = `${alpha}|${nu}`; if (qCache.has(k)) return qCache.get(k);
  const target = alpha;
  let lo = 0, hi = 1; while (tTwoSidedP(hi, nu) > target) hi *= 2;
  for (let i = 0; i < 2000; i++) { const mid = lo + (hi - lo) / 2; if (mid === lo || mid === hi) break; if (tTwoSidedP(mid, nu) > target) lo = mid; else hi = mid; }
  const q = (Math.abs(tTwoSidedP(lo, nu) - target) <= Math.abs(tTwoSidedP(hi, nu) - target)) ? lo : hi;
  qCache.set(k, q); return q;
}
/** ln Γ(z), z > 0: recurrence up to z ≥ 15, then the Stirling series with Bernoulli terms B₂ … B₁₀. */
export function lnGamma(z) {
  if (!(z > 0)) throw new Error(`lnGamma: z must be positive, got ${z}`);
  let shift = 0; while (z < 15) { shift += Math.log(z); z += 1; }
  const z2 = z * z;
  const series = 1 / (12 * z) - 1 / (360 * z * z2) + 1 / (1260 * z * z2 * z2) - 1 / (1680 * z * z2 * z2 * z2) + 1 / (1188 * z * z2 * z2 * z2 * z2);
  return (z - 0.5) * Math.log(z) - z + 0.5 * Math.log(2 * Math.PI) + series - shift;
}
/** Two-sided p-value of Student's t with real ν > 0 (the Satterthwaite variant, PR-10.1). (Half-)integer ν/2 uses the exact B. */
export function tTwoSidedPReal(t, nu) {
  if (!(nu > 0) || !Number.isFinite(nu)) throw new Error(`tTwoSidedPReal: ν must be a positive finite number, got ${nu}`);
  if (Number.isNaN(t)) return NaN;
  const at = Math.abs(t); if (at === 0) return 1; if (at === Infinity) return 0;
  const a = nu / 2, b = 0.5, t2 = at * at, x = nu / (nu + t2), xc = t2 / (nu + t2);
  const lnB = Number.isInteger(2 * a) ? Math.log(betaHalf(a)) : lnGamma(a) + lnGamma(0.5) - lnGamma(a + 0.5);
  const front = Math.exp(a * Math.log(x) + b * Math.log(xc) - lnB);
  if (x < (a + 1) / (a + b + 2)) return front * betacf(a, b, x) / a;
  return 1 - front * betacf(b, a, xc) / b;
}

// ---------------- the §12 crossed test and its 99% CI ----------------
const sum = (a) => { let s = 0; for (const x of a) s += x; return s; };
const mean = (a) => sum(a) / a.length;
/** d: C rows × S columns of paired differences (complete). v1.0 §12; MS_CS per I-2. */
export function crossed(d) {
  const C = d.length, S = C ? d[0].length : 0;
  if (C < 2 || S < 2) return { computable: false, C, S, nu: null, dbar: null, se: null, lower: null, upper: null, containsZero: null, MS_C: null, MS_S: null, MS_CS: null, tPrime: null, p: null };
  const all = []; for (const r of d) { if (r.length !== S) throw new Error('crossed: ragged array'); for (const v of r) { if (!Number.isFinite(v)) throw new Error('crossed: non-finite cell'); all.push(v); } }
  const dbar = mean(all), rc = d.map(mean), cs = Array.from({ length: S }, (_, s) => mean(d.map(r => r[s])));
  const MS_C = S * sum(rc.map(v => (v - dbar) ** 2)) / (C - 1);
  const MS_S = C * sum(cs.map(v => (v - dbar) ** 2)) / (S - 1);
  const res = []; for (let c = 0; c < C; c++) for (let s = 0; s < S; s++) res.push((d[c][s] - rc[c] - cs[s] + dbar) ** 2);
  const MS_CS = sum(res) / ((C - 1) * (S - 1));
  const nu = Math.min(C - 1, S - 1), q = tCritical(ALPHA, nu);   // t_{ν,0.995}
  const den = MS_C + MS_S;
  let se, tPrime, p;
  if (den === 0) { se = 0; tPrime = dbar === 0 ? NaN : (dbar > 0 ? Infinity : -Infinity); p = dbar === 0 ? 1 : 0; }   // §12 degenerate case
  else { se = Math.sqrt(den / (C * S)); tPrime = dbar / se; p = tTwoSidedP(tPrime, nu); }
  const lower = dbar - q * se, upper = dbar + q * se;
  return { computable: true, C, S, nu, dbar, se, lower, upper, containsZero: lower <= 0 && 0 <= upper, MS_C, MS_S, MS_CS, tPrime, p };
}
/** σ̂ components of v1.0 §12 (descriptive; also the power procedure's inputs). */
export function components(t) { return t.computable ? { sigma2C: Math.max(0, (t.MS_C - t.MS_CS) / t.S), sigma2S: Math.max(0, (t.MS_S - t.MS_CS) / t.C), sigma2E: t.MS_CS } : null; }
/** Holm over the six family p-values (all present or all absent: the analysed array is shared). p̃₍ⱼ₎ = max_{i≤j} min(1, (7−i)·p₍ᵢ₎). */
export function holm(ps) {
  if (ps.some(p => p === null)) { if (ps.every(p => p === null)) return ps.map(() => null); throw new Error('holm: partially computable family'); }
  const order = ps.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const adj = new Array(ps.length); let run = 0;
  order.forEach(([p, i], j) => { run = Math.max(run, Math.min(1, (HOLM_FAMILY + 1 - (j + 1)) * p)); adj[i] = run; });
  return adj;
}
/** PR-10.1 (D-025 §6): the committed Appendix-B.2 "satt" variant — the frozen t′ referred to Student t with
 *  ν_S = (MS_C + MS_S)² / (MS_C²/(C−1) + MS_S²/(S−1)), on the §12 analysed array t. Degenerate denominator → null. */
export function minFSatterthwaite(t) {
  if (!t.computable) return { computable: false, reason: 'arrayNotComputable', nu: null, tPrime: null, p: null };
  const den = t.MS_C + t.MS_S;
  if (den === 0) return { computable: false, reason: 'degenerateDenominator', nu: null, tPrime: null, p: null };
  const nu = den * den / (t.MS_C * t.MS_C / (t.C - 1) + t.MS_S * t.MS_S / (t.S - 1));
  return { computable: true, reason: null, nu, tPrime: t.tPrime, p: tTwoSidedPReal(t.tPrime, nu) };
}

// ---------------- two-way bootstrap (v1.0 §12; IR-34c; C-2, C-3; I-3, I-4) ----------------
/** C-3 (G1): the bootstrap index universe is the complete configuration × seed grid; a dropped pair is a missing cell. */
export function bootstrapGrid(configs, seeds, dropped) {
  const d = new Set(dropped.map(([c, s]) => `${c}|${s}`));
  return { configs: configs.slice().sort((a, b) => a - b), seeds: seeds.slice().sort((a, b) => a - b), has: (c, s) => !d.has(`${c}|${s}`) };
}
/** configs, seeds: the index grid (ascending); cell(c, s) → value or undefined (missing); statistic(values[]) → number
 *  or null (undefined). Cell values are evaluated once. Returns BootCI plus the undefined-replicate count (IR-34c). */
export function twoWayBootstrap(configs, seeds, cell, statistic) {
  const rng = makeRng(770002), C = configs.length, S = seeds.length, vals = []; let undef = 0;
  const M = configs.map(c => seeds.map(s => cell(c, s)));
  const point = statistic(M.flatMap(row => row.filter(v => v !== undefined)));
  for (let b = 0; b < B_BOOT; b++) {
    const ci = []; for (let i = 0; i < C; i++) ci.push(Math.floor(rng() * C));
    const sj = []; for (let j = 0; j < S; j++) sj.push(Math.floor(rng() * S));
    const cells = []; for (const i of ci) for (const j of sj) { const v = M[i][j]; if (v !== undefined) cells.push(v); }
    const st = cells.length ? statistic(cells) : null;
    if (st === null || !Number.isFinite(st)) undef++; else vals.push(st);
  }
  if (undef > 0) return { statistic: point, lower: null, upper: null, nDefinedIterations: vals.length, nUndefinedIterations: undef };
  vals.sort((x, y) => x - y);
  return { statistic: point, lower: vals[49], upper: vals[9949], nDefinedIterations: vals.length, nUndefinedIterations: 0 };
}

// ---------------- Spearman with average ranks (v1.0 §8; IR-12) ----------------
export function averageRanks(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0] || p[1] - q[1]), r = new Array(xs.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
  return r;
}
export function spearman(xs, ys) {
  if (xs.length < 3) return { rho: null, reason: 'fewerThan3Keys' };
  const rx = averageRanks(xs), ry = averageRanks(ys), mx = mean(rx), my = mean(ry);
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < rx.length; i++) { const a = rx[i] - mx, b = ry[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  if (sxx === 0 || syy === 0) return { rho: null, reason: 'zeroVariance' };
  return { rho: sxy / Math.sqrt(sxx * syy), reason: null };
}
/** PR-12 (D-024 §10): first-order partial Spearman of x and y controlling for z (average ranks). */
export function partialSpearman(xs, ys, zs) {
  if (xs.length < 4) return { r: null, n: xs.length, reason: 'fewerThan4Keys' };
  const xy = spearman(xs, ys), xz = spearman(xs, zs), yz = spearman(ys, zs);
  if (xy.rho === null || xz.rho === null || yz.rho === null) return { r: null, n: xs.length, reason: 'zeroVariance' };
  const den = (1 - xz.rho * xz.rho) * (1 - yz.rho * yz.rho);
  if (!(den > 0)) return { r: null, n: xs.length, reason: 'undefinedDenominator' };
  return { r: (xy.rho - xz.rho * yz.rho) / Math.sqrt(den), n: xs.length, reason: null };
}

// ---------------- exact Pratt Wilcoxon and the matched-pairs rank-biserial (PR-10) ----------------
/** Pratt ranks: |d| ranked with zeros retained (average ranks), zeros excluded from T⁺ and T⁻ (M7 §11.2). */
function prattRanks(ds) {
  const r = averageRanks(ds.map(Math.abs)); let Tplus = 0, Tminus = 0; const nonzero = [];
  for (let i = 0; i < ds.length; i++) { if (ds[i] > 0) { Tplus += r[i]; nonzero.push(r[i]); } else if (ds[i] < 0) { Tminus += r[i]; nonzero.push(r[i]); } }
  return { Tplus, Tminus, nonzero };
}
/** Exact conditional sign-flip distribution of T⁺ given the Pratt ranks; two-sided p = P(|T⁺ − E| ≥ |t⁺ − E|). */
export function wilcoxonPratt(ds) {
  if (!ds.length) return { n: 0, nZero: 0, Tplus: null, Tminus: null, direction: null, p: null };
  const { Tplus, Tminus, nonzero } = prattRanks(ds);
  const w = nonzero.map(r => 2 * r);                              // ranks are multiples of ½: doubled ranks are integers
  if (!w.every(Number.isInteger)) throw new Error('wilcoxonPratt: non-integer doubled rank');
  const M = sum(w), dist = new Float64Array(M + 1); dist[0] = 1; let top = 0;
  for (const wi of w) { top += wi; for (let k = top; k >= 0; k--) dist[k] = 0.5 * (dist[k] + (k >= wi ? dist[k - wi] : 0)); }
  const K0 = 2 * Tplus, obs = Math.abs(2 * K0 - M); let p = 0;
  for (let k = 0; k <= M; k++) if (Math.abs(2 * k - M) >= obs) p += dist[k];
  return { n: ds.length, nZero: ds.length - nonzero.length, Tplus, Tminus, direction: Math.sign(Tplus - Tminus), p: Math.min(1, p) };
}
/** Matched-pairs rank-biserial r = (T⁺ − T⁻)/(T⁺ + T⁻) with Pratt ranking; every difference zero → null. */
export function rankBiserial(ds) {
  if (!ds.length) return { r: null, n: 0 };
  const { Tplus, Tminus } = prattRanks(ds);
  return { r: (Tplus + Tminus) === 0 ? null : (Tplus - Tminus) / (Tplus + Tminus), n: ds.length };
}

// ---------------- power procedure (v1.0 §13; D-020 pin 4; I-9) ----------------
export function powerProcedure(arrays /* { W1: rows, W3: rows } of A1 − A2 differences on the final pilot array */) {
  const out = {};
  for (const W of ['W1', 'W3']) {
    const t = crossed(arrays[W]); if (!t.computable) return null;
    const comp = components(t), sc = Math.sqrt(comp.sigma2C), ss = Math.sqrt(comp.sigma2S), se = Math.sqrt(comp.sigma2E), mu = t.dbar;
    const power = [];
    for (let S = 2; S <= 20; S++) {
      const rng = makeRng(770001); let rej = 0;
      for (let it = 0; it < B_POWER; it++) {
        const a = []; for (let c = 0; c < 30; c++) a.push(sc * normal(rng));
        const b = []; for (let s = 0; s < S; s++) b.push(ss * normal(rng));
        const d = []; for (let c = 0; c < 30; c++) { const row = []; for (let s = 0; s < S; s++) row.push(mu + a[c] + b[s] + se * normal(rng)); d.push(row); }
        if (crossedP(d) < ALPHA / HOLM_FAMILY) rej++;
      }
      power.push(rej / B_POWER);
    }
    out[W] = { muHat: mu, sigma2C: comp.sigma2C, sigma2S: comp.sigma2S, sigma2E: comp.sigma2E, power };
  }
  let Sstar = 20, under = true;
  for (let S = 2; S <= 20; S++) if (out.W1.power[S - 2] >= 0.80 && out.W3.power[S - 2] >= 0.80) { Sstar = S; under = false; break; }
  return { W1: out.W1, W3: out.W3, Sstar, underpowered: under };
}
// the §12 test's p only (complete array), same arithmetic as crossed()
function crossedP(d) {
  const C = d.length, S = d[0].length; const rc = new Array(C).fill(0), cs = new Array(S).fill(0);
  for (let c = 0; c < C; c++) { let r = 0; for (let s = 0; s < S; s++) { r += d[c][s]; } rc[c] = r / S; }
  for (let s = 0; s < S; s++) { let k = 0; for (let c = 0; c < C; c++) k += d[c][s]; cs[s] = k / C; }
  const all = []; for (const r of d) for (const v of r) all.push(v); const dbar = sum(all);
  const m = dbar / all.length;
  let msc = 0; for (const v of rc) msc += (v - m) ** 2; msc = S * msc / (C - 1);
  let mss = 0; for (const v of cs) mss += (v - m) ** 2; mss = C * mss / (S - 1);
  const den = msc + mss; if (den === 0) return m === 0 ? 1 : 0;
  return tTwoSidedP(m / Math.sqrt(den / (C * S)), Math.min(C - 1, S - 1));
}

// ---------------- criterion decisions (v1.0 §13, §14; PR-1, PR-2, C-1) ----------------
/** C-1 (D-024 §12, D-025 §2). initial: {W1, W3} §12 CIs of (A7 − A2) on the 5 × 5 array; final(): the pooled 10 × 5 CIs. */
export function f11Decision(initial, extensionAvailable, final) {
  const computable = (x) => x.W1.computable && x.W3.computable, bothContain = (x) => x.W1.containsZero && x.W3.containsZero;
  if (computable(initial) && !bothContain(initial)) return { extensionTaken: false, extensionUnavailable: false, final: null, fires: false, outcome: 'PROCEED' };
  // the CI contains 0 in both windows, or is not computable: the predetermined extension comes first
  if (!extensionAvailable) return { extensionTaken: false, extensionUnavailable: true, final: null, fires: false, outcome: 'HALT' };
  const fin = final();
  if (!computable(fin) || bothContain(fin)) return { extensionTaken: true, extensionUnavailable: false, final: fin, fires: true, outcome: 'VOID' };
  return { extensionTaken: true, extensionUnavailable: false, final: fin, fires: false, outcome: 'PROCEED' };
}
/** F-1 (v1.0 §14; PR-2): mean ρ < 0.30, or its CI contains 0, or the statistic is undefined, or the CI is null. */
export function f1Fires(m, ci) { return m === null || m < 0.30 || ci.lower === null || (ci.lower <= 0 && 0 <= ci.upper); }
/** F-3 (v1.0 §14; I-7; PR-2): CA undefined, or the CI is null, or lower ≤ 0. */
export function f3Fires(CA, ci) { return CA === null || ci.lower === null || ci.lower <= 0; }
/** F-4, F-5, F-6, F-8, F-9 (v1.0 §14; PR-1): the CI contains 0 in both W1 and W3; a non-computable CI fires. */
export function ciPairFires(pair) { return (!pair.W1.computable || !pair.W3.computable) ? true : (pair.W1.containsZero && pair.W3.containsZero); }
/** F-10 (v1.0 §14; PR-1): P̄ ≤ 0 → not assessable, does not fire; otherwise an undefined P̄ or H̄ fires; else H̄/P̄ < 0.60. */
export function f10Decision(Pbar, Hbar) {
  if (Pbar === null) return { Pbar, Hbar, ratio: null, notAssessable: false, fires: true };
  if (Pbar <= 0) return { Pbar, Hbar, ratio: Hbar === null ? null : Hbar / Pbar, notAssessable: true, fires: false };
  if (Hbar === null) return { Pbar, Hbar, ratio: null, notAssessable: false, fires: true };
  return { Pbar, Hbar, ratio: Hbar / Pbar, notAssessable: false, fires: Hbar / Pbar < 0.60 };
}

// ---------------- PR-4 monotonicity (D-025 §1) ----------------
/** B1: bin = min(4, ⌊10x⌋) on [0, 0.5]. */
export function monoBin(x) { return Math.min(4, Math.floor(10 * x)); }
/** E1, F1: rates Σflips/Σdecisions per bin, Spearman ρ of bin index vs rate; an empty bin or zero variance → null. */
export function monoRho(decisions, flips) {
  if (decisions.some(d => d === 0)) return { rates: decisions.map((d, b) => d === 0 ? null : flips[b] / d), rho: null, reason: 'emptyBin' };
  const rates = decisions.map((d, b) => flips[b] / d), sp = spearman([0, 1, 2, 3, 4], rates);
  return { rates, rho: sp.rho, reason: sp.reason };
}

// ---------------- the study (fixtures S01–S17, schema h1r.d021b.study/1) ----------------
const COL = { valid: 3, W1: 4, W2: 5, W3: 6, W4: 7, R_all: 8, halfLife: 9, halfLifeCensored: 10, fingerprint: 11, floorRaises: 12 };
function indexCells(cells) { const m = new Map(); for (const r of cells) { const k = `${r[0]}|${r[1]}|${r[2]}`; if (m.has(k)) throw new Error(`duplicate cell ${k}`); m.set(k, r); } return m; }
function droppedPairs(cellMap, configs, seeds) {
  const out = [];
  for (const c of configs) for (const s of seeds) {
    const rows = ARMS.map((_, a) => cellMap.get(`${c}|${s}|${a}`));
    if (rows.some(r => !r)) throw new Error(`incomplete pair ${c}/${s}`);
    if (rows.some(r => r[COL.valid] !== 1)) out.push([c, s]);
  }
  return out;
}
const pairKey = (c, s) => `${c}|${s}`;
function rowRule(configs, seeds, dropped) { const d = new Set(dropped.map(([c, s]) => pairKey(c, s))); return configs.filter(c => seeds.every(s => !d.has(pairKey(c, s)))); }
function diffRows(cellMap, configs, seeds, armX, armY, col) { const ax = ARMS.indexOf(armX), ay = ARMS.indexOf(armY); return configs.map(c => seeds.map(s => cellMap.get(`${c}|${s}|${ax}`)[col] - cellMap.get(`${c}|${s}|${ay}`)[col])); }
const ci = (t) => ({ computable: t.computable, C: t.C, S: t.S, nu: t.nu, dbar: t.dbar, se: t.se, lower: t.lower, upper: t.upper, containsZero: t.containsZero });
const testOut = (t, pAdj, confirmed) => ({ ...ci(t), MS_C: t.MS_C, MS_S: t.MS_S, tPrime: t.computable ? enc(t.tPrime) : null, p: t.p, pAdjusted: pAdj, confirmed });
/** PR-3: the valid (configuration, seed) cells of a grid, in (configuration, seed) order. */
function validCells(grid) { return grid.configs.flatMap(c => grid.seeds.filter(s => grid.has(c, s)).map(s => [c, s])); }
const meanDefined = (xs) => { const d = xs.filter(x => x !== null); return d.length ? mean(d) : null; };

export function analyzeStudy(fx) {
  if (fx.schema !== 'h1r.d021b.study/1') throw new Error(`study schema ${fx.schema}`);
  const desc = {};
  // ---- Stage 1: F-11 first, the single extension (v1.0 §13; §12 row rule per I-12; C-1) ----
  const P = indexCells(fx.pilot.cells), pSeeds = fx.pilot.seeds.slice();
  const st1 = fx.pilot.configs.filter(c => c.block === 'stage1').map(c => c.index), ext = fx.pilot.configs.filter(c => c.block === 'extension').map(c => c.index);
  const pDropAll = droppedPairs(P, [...st1, ...ext], pSeeds);
  const pDrop1 = pDropAll.filter(([c]) => st1.includes(c));
  const f11ci = (configs, drops) => { const rows = rowRule(configs, pSeeds, drops); return { W1: crossed(diffRows(P, rows, pSeeds, 'A7', 'A2', COL.W1)), W3: crossed(diffRows(P, rows, pSeeds, 'A7', 'A2', COL.W3)) }; };
  const ini = f11ci(st1, pDrop1);
  const dec = f11Decision(ini, fx.pilot.extensionAvailable === true, () => f11ci([...st1, ...ext], pDropAll));
  const { extensionTaken } = dec, fin = dec.final;
  const stage1 = { droppedPairs: (extensionTaken ? pDropAll : pDrop1).slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]),
    F11: { initial: { W1: ci(ini.W1), W3: ci(ini.W3) }, extensionTaken, extensionUnavailable: dec.extensionUnavailable, final: fin ? { W1: ci(fin.W1), W3: ci(fin.W3) } : null, fires: dec.fires, outcome: dec.outcome }, power: null };
  const result = { stage1, stage2: null, verdict: null, descriptive: desc };
  if (dec.outcome !== 'PROCEED') { result.verdict = dec.outcome; return result; }   // VOID or HALT: no verdict (v1.0 §14; C-1)
  // ---- power procedure on the final pilot array (I-10, I-12) ----
  const pilotConfigs = extensionTaken ? [...st1, ...ext] : st1, pilotDrops = extensionTaken ? pDropAll : pDrop1;
  const pRows = rowRule(pilotConfigs, pSeeds, pilotDrops);
  const power = powerProcedure({ W1: diffRows(P, pRows, pSeeds, 'A1', 'A2', COL.W1), W3: diffRows(P, pRows, pSeeds, 'A1', 'A2', COL.W3) });
  // PROCEED needs a computable F-11 on this same array (same rows, same seeds), so the power array is computable too
  if (!power) throw new Error('power: the final pilot array is not computable although F-11 was (impossible: same rows and seeds)');
  stage1.power = power;
  // ---- Stage 2 (v1.0 §12, §14) ----
  const H = indexCells(fx.heldout.cells), hSeeds = fx.heldout.seeds.slice().sort((a, b) => a - b).slice(0, power.Sstar), hConfigs = fx.heldout.configs.map(c => c.index);
  const hDrop = droppedPairs(H, hConfigs, hSeeds), rows = rowRule(hConfigs, hSeeds, hDrop);
  const T = (x, y, col) => crossed(diffRows(H, rows, hSeeds, x, y, col));
  const fam = [['A1vA2', 'A2'], ['A1vA5', 'A5'], ['A1vA6', 'A6']], famT = {};
  for (const [name, k] of fam) famT[name] = { W1: T('A1', k, COL.W1), W3: T('A1', k, COL.W3) };
  const ps = fam.flatMap(([n]) => ['W1', 'W3'].map(W => famT[n][W].computable ? famT[n][W].p : null)), adj = holm(ps);
  const family = {}; let q = 0;
  for (const [n] of fam) { family[n] = {}; for (const W of ['W1', 'W3']) { const t = famT[n][W], pa = adj[q++]; family[n][W] = testOut(t, pa, t.computable && pa < ALPHA && t.dbar > 0); } }
  const cis = { A1mA2: { W1: ci(famT.A1vA2.W1), W3: ci(famT.A1vA2.W3) }, A1mA5: { W1: ci(famT.A1vA5.W1), W3: ci(famT.A1vA5.W3) }, A1mA6: { W1: ci(famT.A1vA6.W1), W3: ci(famT.A1vA6.W3) } };
  const extra = { A4mA1: ['A4', 'A1'], A3mA1: ['A3', 'A1'], A7mA2: ['A7', 'A2'] }, extraT = {};
  for (const [n, [x, y]] of Object.entries(extra)) { extraT[n] = { W1: T(x, y, COL.W1), W3: T(x, y, COL.W3) }; cis[n] = { W1: ci(extraT[n].W1), W3: ci(extraT[n].W3) }; }
  const hlT = crossed(diffRows(H, rows, hSeeds, 'A2', 'A1', COL.halfLife)); cis.HL_A2mA1 = ci(hlT);
  // ---- A1 link inputs: every valid cell (PR-3); bootstraps on the full grid (C-2, C-3) ----
  const grid = bootstrapGrid(hConfigs, hSeeds, hDrop), valid = validCells(grid);
  const L = new Map(fx.heldout.a1Links.map(r => [pairKey(r[0], r[1]), r])), POP = new Map(fx.heldout.flipPopulations.map(r => [pairKey(r[0], r[1]), r[2]]));
  const MONO = new Map(fx.heldout.monotonicity.map(r => [pairKey(r[0], r[1]), r]));
  const boot = (cellOf, stat) => twoWayBootstrap(grid.configs, grid.seeds, (c, s) => grid.has(c, s) ? cellOf(c, s) : undefined, stat);
  const F = {};
  // F-1 (I-5, I-11; IR-34c; PR-2)
  { const rhos = valid.map(([c, s]) => L.get(pairKey(c, s))[2]), def = rhos.filter(x => x !== null), m = def.length ? mean(def) : null;
    const b = boot((c, s) => L.get(pairKey(c, s))[2], meanDefined);
    F.F1 = { rhoMean: m, nDefinedRuns: def.length, nUndefinedRuns: rhos.length - def.length, ci: b, fires: f1Fires(m, b) }; }
  // F-2 (I-1, I-16; PR-1)
  let FRu;
  { let flips = 0, elig = 0, n = 0; for (const [c, s] of valid) { const r = L.get(pairKey(c, s)); flips += r[6]; elig += 3000 - r[5]; n++; }
    const FR = elig > 0 ? flips / elig : null; FRu = n > 0 ? flips / (3000 * n) : null;
    F.F2 = { FR, FRunfiltered: FRu, flips, eligibleTicks: elig, fires: FR === null ? true : FR < 0.01 }; }
  // F-3 (I-6, I-7, I-11; sample makeRng(770004); IR-34c; PR-2)
  { const rng = makeRng(770004), sample = [], kept = new Map(); let dropped = 0;
    for (const [c, s] of valid) {   // valid is in (configuration, seed) ascending order
      const popu = POP.get(pairKey(c, s)).slice().sort((x, y) => x[0] - y[0]);
      const perm = fisherYates(popu, rng).slice(0, Math.min(10, popu.length)), vals = [];
      for (const [t, diff] of perm) { sample.push([c, s, t]); if (diff === null) dropped++; else vals.push(diff); }
      kept.set(pairKey(c, s), vals);
    }
    const all = [...kept.values()].flat(), CA = all.length ? mean(all) : null;
    const b = boot((c, s) => kept.get(pairKey(c, s)), (lists) => { const xs = lists.flat(); return xs.length ? mean(xs) : null; });
    F.F3 = { CA, sample, nDropped: dropped, ci: b, fires: f3Fires(CA, b) }; }
  F.F4 = { fires: ciPairFires(cis.A1mA2) }; F.F5 = { fires: ciPairFires(cis.A1mA6) }; F.F6 = { fires: ciPairFires(cis.A1mA5) };
  F.F7 = { fires: hlT.computable ? hlT.lower <= 0 : true };
  F.F8 = { fires: ciPairFires(cis.A4mA1) }; F.F9 = { fires: ciPairFires(cis.A3mA1) };
  // F-10 (I-10; configuration means over each configuration's valid cells, PR-3)
  { const pilotValid = validCells(bootstrapGrid(pilotConfigs, pSeeds, pilotDrops));
    const cfgMeanOfMeans = (Mp, cells) => { const byC = new Map(); for (const [c, s] of cells) { const r = Mp.get(`${c}|${s}|0`); if (!byC.has(c)) byC.set(c, []); byC.get(c).push(r[COL.R_all]); } const ms = [...byC.keys()].sort((a, b) => a - b).map(c => mean(byC.get(c))); return ms.length ? mean(ms) : null; };
    F.F10 = f10Decision(cfgMeanOfMeans(P, pilotValid), cfgMeanOfMeans(H, valid)); }
  // headline fraction per primary window (I-8, I-17; degenerate-denominator rule M7 §11.3 via the §12 CI of A7 − A2)
  const headline = {};
  for (const W of ['W1', 'W3']) {
    const col = COL[W];
    const b = boot((c, s) => [H.get(`${c}|${s}|0`)[col] - H.get(`${c}|${s}|1`)[col], H.get(`${c}|${s}|6`)[col] - H.get(`${c}|${s}|1`)[col]],
      (xs) => { const num = mean(xs.map(x => x[0])), den = mean(xs.map(x => x[1])); return den === 0 ? null : num / den; });
    const undef = !extraT.A7mA2[W].computable ? true : extraT.A7mA2[W].containsZero;
    headline[W] = { fraction: undef ? null : b.statistic, ci: b, undefined: undef };
  }
  // ---- verdict (v1.0 §14) ----
  const order = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'], H1list = ['F1', 'F2', 'F3', 'F7', 'F8', 'F9', 'F10'];
  for (const k of order) if (typeof F[k].fires !== 'boolean') throw new Error(`${k}.fires is not a boolean`);
  const sup = (family.A1vA2.W1.confirmed || family.A1vA2.W3.confirmed) && H1list.every(k => !F[k].fires);
  let strictW = null; if (sup && !F.F5.fires && !F.F6.fires) for (const W of ['W1', 'W3']) if (family.A1vA2[W].confirmed && family.A1vA5[W].confirmed && family.A1vA6[W].confirmed) { strictW = W; break; }
  const fired = order.filter(k => F[k].fires).map(k => 'F-' + k.slice(1));
  const verdict = { result: strictW ? 'H1-STRICT' : sup ? 'H1 SUPPORTED' : 'NOT SUPPORTED', strictWindow: strictW, fired, escalation: fired.length >= 3 };
  // ---- descriptive (v1.0 §8, §12, §15; M7 §11.3; D-024; D-025) ----
  const effect = {}; for (const [n] of fam) effect[n] = { W1: components(famT[n].W1), W3: components(famT[n].W3) };
  desc.effectSizes = effect;
  desc.censoringCountsPerArm = Object.fromEntries(ARMS.map((a, ai) => [a, valid.filter(([c, s]) => H.get(`${c}|${s}|${ai}`)[COL.halfLifeCensored] === 1).length]));
  desc.a5EqualsA2FingerprintCells = valid.filter(([c, s]) => H.get(`${c}|${s}|4`)[COL.fingerprint] === H.get(`${c}|${s}|1`)[COL.fingerprint]).length;   // whole-run diagnostic (PR-11)
  desc.a5EqualsA2PerWindow = { counts: null, reason: 'The study input schema h1r.d021b.study/1 carries no reward-event streams; the per-window identity is computed from run records (records.descriptive.a5EqualsA2PerWindow; I-26).' };
  desc.floorRaises = { A1: sum(valid.map(([c, s]) => H.get(`${c}|${s}|0`)[COL.floorRaises])), A5: sum(valid.map(([c, s]) => H.get(`${c}|${s}|4`)[COL.floorRaises])) };
  const winRate = (W, filtered) => { const w = WINDOWS.indexOf(W), len = WIN[W][1] - WIN[W][0] + 1; return (cells) => { let fl = 0, rp = 0; for (const r of cells) { fl += r[7][w]; rp += r[9][w]; } const den = filtered ? len * cells.length - rp : len * cells.length; return den > 0 ? fl / den : null; }; };
  const validLinks = valid.map(([c, s]) => L.get(pairKey(c, s)));
  desc.flipRatesByWindow = Object.fromEntries(WINDOWS.map(W => [W, { flips: sum(validLinks.map(r => r[7][WINDOWS.indexOf(W)])), filtered: winRate(W, true)(validLinks), unfiltered: winRate(W, false)(validLinks) }]));
  { const ff = F.F2.fires, fu = FRu === null ? true : FRu < 0.01; desc.exclusionValidity = { filteredFires: ff, unfilteredFires: fu, validated: ff === fu }; }
  // PR-4 (D-025 §1): pooled bins over the valid Stage-2 A1 cells, ρ, and its §12 bootstrap CI
  { const pool = (rowsM) => { const d = [0, 0, 0, 0, 0], f = [0, 0, 0, 0, 0]; for (const r of rowsM) for (let b = 0; b < 5; b++) { d[b] += r[2][b]; f[b] += r[3][b]; } return { d, f }; };
    const { d, f } = pool(valid.map(([c, s]) => MONO.get(pairKey(c, s)))), mr = monoRho(d, f);
    desc.monotonicity = { decisions: d, flips: f, rates: mr.rates, rho: mr.rho, reason: mr.reason, ci: boot((c, s) => MONO.get(pairKey(c, s)), (rowsM) => { const p = pool(rowsM); return monoRho(p.d, p.f).rho; }) }; }
  // PR-10 (D-024 §8, D-025 §6): sensitivity analyses and the rank-biserial correlation, per primary-family member
  { const sens = {}, rb = {};
    for (const [n, k] of fam) { sens[n] = {}; rb[n] = {};
      for (const W of ['W1', 'W3']) {
        const col = COL[W], ka = ARMS.indexOf(k), dOf = (c, s) => H.get(`${c}|${s}|0`)[col] - H.get(`${c}|${s}|${ka}`)[col];
        const cellsD = valid.map(([c, s]) => dOf(c, s));
        const cfgMeans = grid.configs.filter(c => grid.seeds.some(s => grid.has(c, s))).map(c => mean(grid.seeds.filter(s => grid.has(c, s)).map(s => dOf(c, s))));
        const seedMeans = grid.seeds.filter(s => grid.configs.some(c => grid.has(c, s))).map(s => mean(grid.configs.filter(c => grid.has(c, s)).map(c => dOf(c, s))));
        const t = famT[n][W], primarySign = t.computable ? Math.sign(t.dbar) : null;
        const wx = (ds) => { const w = wilcoxonPratt(ds); return { ...w, signDiffersFromPrimary: (primarySign === null || w.direction === null) ? null : w.direction !== primarySign }; };
        sens[n][W] = { primaryDbar: t.computable ? t.dbar : null, minFSatterthwaite: minFSatterthwaite(t), wilcoxonAllValidCells: wx(cellsD), wilcoxonConfigurationMeans: wx(cfgMeans), wilcoxonSeedMeans: wx(seedMeans) };
        rb[n][W] = rankBiserial(cfgMeans);
      } }
    desc.sensitivity = sens; desc.rankBiserialConfigurationMeans = rb; }
  // X-1 (D-024 §11, D-025 §7; I-24): W2/W4 CIs of the contract contrasts, and bootstrap CIs of the carried link statistics
  { const contrasts = { A1mA2: ['A1', 'A2'], A1mA5: ['A1', 'A5'], A1mA6: ['A1', 'A6'], A4mA1: ['A4', 'A1'], A3mA1: ['A3', 'A1'], A7mA2: ['A7', 'A2'] };
    const windowsCI = {}; for (const W of ['W2', 'W4']) windowsCI[W] = Object.fromEntries(Object.entries(contrasts).map(([n, [x, y]]) => [n, ci(T(x, y, COL[W]))]));
    const rho2999 = valid.map(([c, s]) => L.get(pairKey(c, s))[3]);
    const link = {
      rho2999: { mean: meanDefined(rho2999), nDefinedRuns: rho2999.filter(x => x !== null).length, nUndefinedRuns: rho2999.filter(x => x === null).length, ci: boot((c, s) => L.get(pairKey(c, s))[3], meanDefined) },
      FR: boot((c, s) => L.get(pairKey(c, s)), (rs) => { const e = sum(rs.map(r => 3000 - r[5])); return e > 0 ? sum(rs.map(r => r[6])) / e : null; }),
      FRunfiltered: boot((c, s) => L.get(pairKey(c, s)), (rs) => sum(rs.map(r => r[6])) / (3000 * rs.length)),
      flipRatesByWindow: Object.fromEntries(WINDOWS.map(W => [W, { filtered: boot((c, s) => L.get(pairKey(c, s)), winRate(W, true)), unfiltered: boot((c, s) => L.get(pairKey(c, s)), winRate(W, false)) }])),
    };
    desc.descriptiveCIs = { windows: windowsCI, link, monotonicityRho: 'descriptive.monotonicity.ci' }; }
  result.stage2 = { seedsUsed: power.Sstar, droppedPairs: hDrop.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]), rowsRemoved: hConfigs.filter(c => !rows.includes(c)), family, ci: cis, F, headline, verdict };
  result.verdict = verdict.result;
  return result;
}

// ---------------- run records (fixture M01, schema h1r.d021b.records/1; MS-1 record format) ----------------
const B2 = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e', ARB_BLOB = '121441ce818d96684c7285b3e23d3d7058d01609';
let ARB = null;
/** The pure B2 arbitration function (v1.0 §8: the shadow weight uses arbitrate), from the pinned blob. */
export function loadArbitrate() {
  if (ARB) return ARB;
  const buf = execFileSync('git', ['-C', REPO, 'cat-file', 'blob', ARB_BLOB], { maxBuffer: 1 << 24 });
  const id = crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
  if (id !== ARB_BLOB) throw new Error('arbitrate blob id mismatch');
  const src = buf.toString('utf8');
  if ((src.match(/^export function /gm) || []).length !== 2 || /^import /m.test(src)) throw new Error('unexpected executiveController.js shape');
  ARB = new Function(src.replace(/^export function /gm, 'function ') + '\nreturn arbitrate;')();
  return ARB;
}
const clamp = (x) => Math.max(-400, Math.min(400, x));
const tauOf = (call) => call - 5;
const inW = (tau, W) => tau >= WIN[W][0] && tau <= WIN[W][1];
export function argmaxStable(entries /* [{key, w}] */) { return entries.length ? entries.map(e => ({ key: e.key, weight: e.w })).sort((a, b) => b.weight - a.weight)[0].key : null; }
const keyNums = (key) => key.split('->').map(Number);
const undirectedKey = (u, v) => u < v ? `${u}|${v}` : `${v}|${u}`;
/** I-29: trust = (s + 1)/(a + 2) from the store; outside [0, 1] refuses the record. */
function trustOf(a, s, where) { const x = (s + 1) / (a + 2); if (!(x >= 0 && x <= 1)) throw new Error(`${where}: trust ${x} outside [0, 1]`); return x; }
/** Shannon entropy in bits of a list of counts (in the given order); no observation → null. */
export function entropyBits(counts) { const n = sum(counts); if (n === 0) return null; let h = 0; for (const c of counts) if (c > 0) { const p = c / n; h -= p * Math.log2(p); } return h; }
/** PR-7.3 / PR-12 trust bins (D-024 §5, D-025 §3): bin = min(9, ⌊10x⌋) on [0, 1]. */
export function trustBin(x) { return Math.min(9, Math.floor(10 * x)); }

// PR-8 (D-024 §6; I-21): episodes and the Kaplan–Meier median
/** resets: [[call, 'goal'|'cap'], …] ascending. First episode from τ = 0 (call 5); the last is censored at the run end (call 3004). */
export function episodes(resets, firstCall = 5, lastCall = 3004) {
  const out = []; let start = firstCall, prev = -Infinity;
  for (const [call, kind] of resets) {
    if (call < prev) throw new Error('episodes: resets out of order'); prev = call;
    if (kind !== 'goal' && kind !== 'cap') throw new Error(`episodes: reset kind ${kind}`);
    if (call < firstCall) continue;
    if (kind === 'goal') { if (call < start) throw new Error('episodes: goal reset before the episode start'); out.push({ length: call - start + 1, event: true, end: 'goal' }); start = call + 1; }
    else { if (call > start) out.push({ length: call - start, event: false, end: 'cap' }); start = call; }
  }
  if (start <= lastCall) out.push({ length: lastCall - start + 1, event: false, end: 'runEnd' });
  return out;
}
/** Kaplan–Meier median: the smallest t with S(t) ≤ 0.5; never → +∞. Censored at t means at risk at t. */
export function kmMedian(eps) {
  const times = [...new Set(eps.filter(e => e.event).map(e => e.length))].sort((a, b) => a - b);
  let S = 1;
  for (const t of times) { const atRisk = eps.filter(e => e.length >= t).length, d = eps.filter(e => e.event && e.length === t).length; S *= 1 - d / atRisk; if (S <= 0.5) return t; }
  return Infinity;
}
/** 8.5-a: two-middle averaging; +∞ in a middle position gives +∞. */
export function medianOfMedians(values) {
  if (!values.length) return null;
  const v = values.slice().sort((a, b) => a - b), n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}
/** PR-7 link ① (D-024 §5, D-025 §4, §8; I-20, I-29) for one run of any arm. m: the MS-1 measurement. */
export function link1Metrics(m, arm, where) {
  const frozen = arm === 'A4';
  const out = { nUpdates: Object.fromEntries(WINDOWS.map(W => [W, frozen ? 0 : m.attempts.filter(a => inW(tauOf(a[0]), W)).length])), nUpdatesWholeRun: frozen ? 0 : m.attempts.length, coverage: {}, entropy: {} };
  for (const label of ['tau1499', 'tau2999']) {
    const snap = m.snapshots.filter(s => s[0] === label); if (snap.length !== 1) throw new Error(`${where}: snapshot ${label}`);
    const attempted = snap[0][2].filter(e => e[3] >= 1), num = attempted.filter(e => e[3] >= 3).length;
    out.coverage[label] = { keysWithAtLeast3: num, keysWithAtLeast1: attempted.length, fraction: attempted.length ? num / attempted.length : null };
    const bins = new Array(10).fill(0); for (const [, a, s] of attempted) bins[trustBin(trustOf(a, s, where))]++;
    out.entropy[label] = { nKeys: attempted.length, bins, bits: entropyBits(bins) };
  }
  return out;
}
/** PR-6 Brier (D-024 §4; I-19): attempts with τ ∈ [0, 2999], trust just before the attempt from the record's prior (a, s),
 *  against the global prequential base rate (successes so far + 1)/(attempts so far + 2). */
export function brierScore(attempts, where) {
  let n = 0, succ = 0, bt = 0, bb = 0;
  for (const [i, , , ok, , a, s] of attempts) { const t = tauOf(i); if (t < 0 || t > 2999) continue; const tr = trustOf(a, s, where), base = (succ + 1) / (n + 2); bt += (tr - ok) ** 2; bb += (base - ok) ** 2; n++; succ += ok; }
  return n ? { nAttempts: n, trust: bt / n, base: bb / n, difference: bt / n - bb / n } : { nAttempts: 0, trust: null, base: null, difference: null };
}
/** PR-9 (D-024 §7): realised directed transitions in each window; a slip is u → u. */
export function trajectoryEntropyOf(attempts) {
  const out = {};
  for (const W of WINDOWS) { const cnt = new Map(); for (const [i, from, to, ok] of attempts) { if (!inW(tauOf(i), W)) continue; const k = `${from}->${ok === 1 ? to : from}`; cnt.set(k, (cnt.get(k) || 0) + 1); } out[W] = { nTransitions: sum([...cnt.values()]), nDistinct: cnt.size, bits: entropyBits([...cnt.values()]) }; }
  return out;
}
/** PR-12 undirected pooled variant (D-024 §10, D-025 §5): ρ of (s₁ + s₂ + 1)/(a₁ + a₂ + 2) vs the phase's p_e over edges with raw₁ + raw₂ ≥ 5. */
export function undirectedPooled(entries, edges, ph, where) {
  const byKey = new Map(entries.map(e => [e[0], e])), xs = [], ys = [];
  for (const e of edges) { const e1 = byKey.get(`${e.from}->${e.to}`), e2 = byKey.get(`${e.to}->${e.from}`);
    if ((e1 ? e1[3] : 0) + (e2 ? e2[3] : 0) < 5) continue;
    xs.push(trustOf((e1 ? e1[1] : 0) + (e2 ? e2[1] : 0), (e1 ? e1[2] : 0) + (e2 ? e2[2] : 0), where)); ys.push(ph === 0 ? e.pPhaseI : e.pPhaseII); }
  const sp = spearman(xs, ys); return { rho: sp.rho, nEdges: xs.length, reason: sp.reason };
}
/** PR-12 calibration curve (D-024 §10, D-025 §3): keyLists = per A1 run, its link-② keys at τ = 1499 ({trust, p}); pooled. */
export function calibrationCurve(keyLists) {
  const n = new Array(10).fill(0), st = new Array(10).fill(0), sp = new Array(10).fill(0);
  for (const keys of keyLists) for (const k of keys) { const b = trustBin(k.trust); n[b]++; st[b] += k.trust; sp[b] += k.p; }
  return { nRuns: keyLists.length, bins: n.map((c, b) => ({ bin: b, n: c, meanTrust: c ? st[b] / c : null, meanP: c ? sp[b] / c : null })) };
}
/** PR-11 (D-024 §9): identity of two reward-event streams restricted to each window. */
export function a5a2WindowIdentity(eventsA5, eventsA2) {
  const inWin = (ev, W) => ev.filter(([i]) => inW(tauOf(i), W));
  const same = (a, b) => a.length === b.length && a.every((e, k) => Object.is(e[0], b[k][0]) && Object.is(e[1], b[k][1]));
  return Object.fromEntries(WINDOWS.map(W => [W, same(inWin(eventsA5, W), inWin(eventsA2, W))]));
}

export function runMetrics(run, cfg) {
  const m = run.measurement;
  // rewards by τ (one event per call; checked)
  const rew = new Array(3000).fill(0); const seen = new Set();
  for (const [i, r] of m.events) { if (seen.has(i)) throw new Error(`${run.runId}: two events at call ${i}`); seen.add(i); const t = tauOf(i); if (t >= 0 && t < 3000) rew[t] += r; }
  const R = {}, goalRate = {};
  for (const W of WINDOWS) {
    const [lo, hi] = WIN[W], size = hi - lo + 1; let s = 0, g = 0;
    for (const [i, r] of m.events) { const t = tauOf(i); if (t >= lo && t <= hi) { s += r; if (r === 12) g++; } }
    R[W] = s / (size / 100); goalRate[W] = g / (size / 100);
  }
  let all = 0; for (const [i, r] of m.events) { const t = tauOf(i); if (t >= 0 && t <= 2999) all += r; }
  const R_all = all / 30;
  // half-life (v1.0 §8; IR-03b: thr exactly 0.5·R_W2)
  const thr = 0.5 * R.W2;
  const TR = (tau) => { let s = 0; for (let u = tau - 99; u <= tau; u++) s += rew[u]; return s; };
  let tBelow = null; for (let t = 1500; t <= 2999; t++) if (TR(t) < thr) { tBelow = t; break; }
  let hl, censored = false;
  if (tBelow === null) hl = 0;
  else { let tRec = null; for (let t = tBelow + 1; t <= 2999; t++) if (TR(t) >= thr) { tRec = t; break; } if (tRec === null) { hl = 1500; censored = true; } else hl = tRec - 1500; }
  // link ② ρ_run at both snapshots (IR-12)
  const pOf = new Map(); for (const e of cfg.edges) pOf.set(undirectedKey(e.from, e.to), [e.pPhaseI, e.pPhaseII]);
  const snapOf = (label) => { const snap = m.snapshots.filter(s => s[0] === label); if (snap.length !== 1) throw new Error(`${run.runId}: snapshot ${label}`); return snap[0][2]; };
  const linkKeys = (label, ph) => snapOf(label).filter(e => e[3] >= 5).map(([key, a, s, raw]) => { const [u, v] = keyNums(key), uk = undirectedKey(u, v); if (!pOf.has(uk)) throw new Error(`${run.runId}: key ${key} not a graph edge`); return { key, u, v, trust: trustOf(a, s, run.runId), p: pOf.get(uk)[ph], raw }; });
  const calib = {}, reasons = {};
  for (const [label, ph] of [['tau1499', 0], ['tau2999', 1]]) {
    const keys = linkKeys(label, ph), sp = spearman(keys.map(k => k.trust), keys.map(k => k.p)); calib[label] = { rho: sp.rho, nKeys: keys.length }; reasons[label] = sp.reason;
  }
  // slip rate (descriptive): drawn non-goal-entering attempts in W; goal-entering separately
  const slip = {}; for (const W of WINDOWS) { let n = 0, sl = 0, gn = 0, gs = 0; for (const a of m.attempts) { const t = tauOf(a[0]); if (!inW(t, W)) continue; if (a[4] === 1) { gn++; if (a[3] === 0) gs++; } else { n++; if (a[3] === 0) sl++; } } slip[W] = { nonGoal: n ? sl / n : null, nonGoalAttempts: n, goalEntering: gn ? gs / gn : null, goalEnteringAttempts: gn }; }
  for (let i = 1; i < m.attempts.length; i++) if (m.attempts[i][0] <= m.attempts[i - 1][0]) throw new Error(`${run.runId}: attempt records not in call order`);
  // PR-7 link ①, PR-8 steps-to-goal, PR-9 trajectory entropy: all seven arms
  const eps = episodes(m.resets);
  const stepsToGoal = { nEpisodes: eps.length, nGoal: eps.filter(e => e.end === 'goal').length, nCap: eps.filter(e => e.end === 'cap').length, nRunEnd: eps.filter(e => e.end === 'runEnd').length, median: kmMedian(eps) };
  const out = { R, goalRate, R_all, halfLife: { value: hl, censored }, calibration: calib, link3: null,
    descriptive: { halfLifeThreshold: thr, calibrationUndefinedReason: reasons, slipRate: slip, link1: link1Metrics(m, run.arm, run.runId), stepsToGoal, trajectoryEntropy: trajectoryEntropyOf(m.attempts) } };
  if (run.arm === 'A1') {
    out.link3 = link3(run);
    out.descriptive.monotonicity = monoRho(out.link3.monotonicity.decisions, out.link3.monotonicity.flips);   // PR-4 per run (E1, F1)
    out.descriptive.brier = brierScore(m.attempts, run.runId);                                                // PR-6
    out.descriptive.partialRankCorrelation = {}; out.descriptive.undirectedPooled = {};                       // PR-12
    for (const [label, ph] of [['tau1499', 0], ['tau2999', 1]]) {
      const keys = linkKeys(label, ph);
      out.descriptive.partialRankCorrelation[label] = partialSpearman(keys.map(k => k.trust), keys.map(k => k.p), keys.map(k => k.raw));
      out.descriptive.undirectedPooled[label] = undirectedPooled(snapOf(label), cfg.edges, ph, run.runId);
    }
  }
  return out;
}
function link3(run) {
  const m = run.measurement, arbitrate = loadArbitrate();
  const groups = new Map(); for (const g of m.step0) { if (groups.has(g[0])) throw new Error(`${run.runId}: two step-0 sorts at call ${g[0]}`); groups.set(g[0], g); }
  let dec = 0, rep = 0, flips = 0, recon = 0, bestMismatch = 0; const flipTaus = [], byW = {}, mDec = [0, 0, 0, 0, 0], mFl = [0, 0, 0, 0, 0];
  for (const W of WINDOWS) byW[W] = { decisionTicks: 0, replayTicks: 0, flips: 0 };
  for (let i = 5; i <= 3004; i++) {
    const t = tauOf(i), ch = m.ticks[i], W = Object.keys(WIN).find(w => inW(t, w));
    if (ch === 'R') { rep++; byW[W].replayTicks++; continue; }
    if (ch !== 'D') continue;
    dec++; byW[W].decisionTicks++;
    const g = groups.get(i); if (!g) throw new Error(`${run.runId}: decision tick at call ${i} without a step-0 sort`);
    if (!g[2].length) throw new Error(`${run.runId}: decision tick at call ${i} without candidate entries (I-28)`);
    const cands = g[2].map(([key, F, tt, returned, w, applied, arb, unc, ew, self]) => {
      const blend = (fw, conf) => fw * 0.60 + arbitrate({ rewardScore: arb[0], semanticScore: arb[1], confidenceScore: conf, uncertaintyScore: unc, curiosityScore: arb[3], costScore: arb[4],
        executiveWeights: { wReward: ew[0], wSemantic: ew[1], wConfidence: ew[2], wUncertainty: ew[3], wCuriosity: ew[4], wCost: ew[5] }, drift: 0, isSelfLoop: self === 1 }) * 0.40;
      if (!Object.is(applied ? blend(returned, arb[2]) : returned, w)) recon++;
      return { key, w, w0: applied ? blend(clamp(F - tt), arb[2] - tt) : clamp(F - tt), x: Math.abs(tt) / 12 };
    });
    // PR-4 (D-025 §1): A1 x = |recorded trust term|/12, K1 max over the recorded step-0 candidates, B1 bin
    let x = -Infinity; for (const c of cands) if (c.x > x) x = c.x;
    if (!Number.isFinite(x)) throw new Error(`${run.runId}: non-finite trust term at call ${i} (I-28)`);
    const bin = monoBin(x); mDec[bin]++;
    const a1 = argmaxStable(cands), a0 = argmaxStable(cands.map(c => ({ key: c.key, w: c.w0 })));
    if (!Object.is(a1, g[1])) bestMismatch++;
    if (!Object.is(a1, a0)) { flips++; flipTaus.push(t); byW[W].flips++; mFl[bin]++; }
  }
  // D-020 pin 3: the recomputed argmax₁ must equal the recorded bestChoice (otherwise the record is not measurementClean)
  if (bestMismatch) throw new Error(`${run.runId}: recomputed argmax₁ differs from the recorded bestChoice at ${bestMismatch} decision ticks`);
  return { decisionTicks: dec, replayTicks: rep, flips, FR: (3000 - rep) > 0 ? flips / (3000 - rep) : null, FRunfiltered: flips / 3000,
    flipTaus, population: flipTaus.filter(t => t <= 2980), byWindow: byW, monotonicity: { decisions: mDec, flips: mFl },
    // diagnostic only (not a protocol rule): candidates whose recorded weight differs from the blend of their recorded inputs
    weightReconstructionMismatches: recon };
}
export function forkDifference(base, fork) {
  const call = fork.fork.call, t = call - 5;
  const winSum = (events) => { let s = 0; for (const [i, r] of events) { const tt = tauOf(i); if (tt >= t && tt < t + 20) s += r; } return s; };
  const b = winSum(base.measurement.events), f = winSum(fork.measurement.events);
  return { t, baseSum: b, forkSum: f, difference: b - f };
}
/** PR-5 (D-024 §3; D-020 pins 5, 6; I-18). runs: the A1 runs of one records document, in (configIndex, seed) order;
 *  keysOf(run, label) → [{u, v, trust, p}]. One makeRng(770003) for the whole sequence. */
export function permutationNull(runs, keysOf) {
  const rng = makeRng(770003), out = [];
  for (const run of runs) {
    const r = {};
    for (const label of ['tau1499', 'tau2999']) {
      const keys = keysOf(run, label).slice().sort((x, y) => x.u - y.u || x.v - y.v), xs = keys.map(k => k.trust), ys = keys.map(k => k.p);
      const obs = spearman(xs, ys);
      if (obs.rho === null) { r[label] = { rho: null, p: null, percentile99: null, nShuffles: 0 }; continue; }   // 5.2-a: no shuffles
      const rs = []; let ge = 0;
      for (let k = 0; k < B_PERM; k++) { const rho = spearman(xs, fisherYates(ys, rng)).rho; if (rho === null) throw new Error('permutation: undefined ρ* (impossible: same multiset)'); rs.push(rho); if (Math.abs(rho) >= Math.abs(obs.rho)) ge++; }
      rs.sort((x, y) => x - y);
      r[label] = { rho: obs.rho, p: (1 + ge) / (B_PERM + 1), percentile99: rs[9899], nShuffles: B_PERM };
    }
    out.push(r);
  }
  return out;
}
export function analyzeRecords(fx) {
  if (fx.schema !== 'h1r.d021b.records/1') throw new Error(`records schema ${fx.schema}`);
  const cfgOf = new Map(fx.configurations.map(c => [c.index, c])), runs = {}, forks = {};
  for (const r of fx.runs) runs[r.runId] = runMetrics(r, cfgOf.get(r.configIndex));
  const byId = new Map(fx.runs.map(r => [r.runId, r]));
  for (const f of fx.forkRuns) forks[f.forkId] = forkDifference(byId.get(f.baseRunId), f);
  const ordered = fx.runs.slice().sort((x, y) => x.configIndex - y.configIndex || x.seed - y.seed || (x.runId < y.runId ? -1 : x.runId > y.runId ? 1 : 0));
  const a1 = ordered.filter(r => r.arm === 'A1');
  const keysOf = (run, label) => { const cfg = cfgOf.get(run.configIndex), ph = label === 'tau1499' ? 0 : 1;
    const pOf = new Map(cfg.edges.map(e => [undirectedKey(e.from, e.to), [e.pPhaseI, e.pPhaseII]]));
    return run.measurement.snapshots.find(s => s[0] === label)[2].filter(e => e[3] >= 5).map(([key, a, s]) => { const [u, v] = keyNums(key); return { u, v, trust: trustOf(a, s, run.runId), p: pOf.get(undirectedKey(u, v))[ph] }; }); };
  // PR-5: one makeRng(770003) sequence over the A1 runs
  permutationNull(a1, keysOf).forEach((p, i) => { runs[a1[i].runId].descriptive.permutationNull = p; });
  // per-arm aggregates and their §12 bootstrap CIs over the arm's (configIndex × seed) grid (I-22, I-23)
  const armGrid = (arm, valueOf) => { const rs = ordered.filter(r => r.arm === arm), cfgs = [...new Set(rs.map(r => r.configIndex))].sort((a, b) => a - b), seeds = [...new Set(rs.map(r => r.seed))].sort((a, b) => a - b), cell = new Map();
    for (const r of rs) { const k = pairKey(r.configIndex, r.seed); if (cell.has(k)) throw new Error(`two ${arm} runs for cell ${k}`); cell.set(k, valueOf(r)); }
    return { rs, ci: (stat) => twoWayBootstrap(cfgs, seeds, (c, s) => cell.get(pairKey(c, s)), stat) }; };
  const desc = {};
  { const g = armGrid('A1', (r) => runs[r.runId].descriptive.brier), vals = g.rs.map(r => runs[r.runId].descriptive.brier), def = vals.filter(v => v.nAttempts > 0);
    const field = (f) => (cells) => { const d = cells.filter(v => v.nAttempts > 0); return d.length ? mean(d.map(v => v[f])) : null; };
    desc.brierByArm = { A1: { nRuns: def.length, nUndefined: vals.length - def.length, trust: field('trust')(vals), base: field('base')(vals), difference: field('difference')(vals),
      ci: { trust: g.ci(field('trust')), base: g.ci(field('base')), difference: g.ci(field('difference')) } } }; }
  desc.stepsToGoalByArm = {}; desc.trajectoryEntropyByArm = {};
  for (const arm of ARMS) {
    if (!ordered.some(r => r.arm === arm)) continue;
    const g = armGrid(arm, (r) => runs[r.runId].descriptive.stepsToGoal.median);
    desc.stepsToGoalByArm[arm] = { nRuns: g.rs.length, medianOfRunMedians: medianOfMedians(g.rs.map(r => runs[r.runId].descriptive.stepsToGoal.median)), ci: g.ci(medianOfMedians) };
    desc.trajectoryEntropyByArm[arm] = {};
    for (const W of WINDOWS) { const gw = armGrid(arm, (r) => runs[r.runId].descriptive.trajectoryEntropy[W].bits), vals = gw.rs.map(r => runs[r.runId].descriptive.trajectoryEntropy[W].bits);
      desc.trajectoryEntropyByArm[arm][W] = { nRuns: vals.filter(v => v !== null).length, nUndefined: vals.filter(v => v === null).length, mean: meanDefined(vals), ci: gw.ci(meanDefined) }; }
  }
  // PR-12 calibration curve (D-024 §10, D-025 §3): link-② keys at τ = 1499, pooled across the A1 runs
  desc.calibrationCurve = calibrationCurve(a1.map(run => keysOf(run, 'tau1499')));
  // PR-11 (D-024 §9): identity of the A5 and A2 reward-event streams restricted to each window
  { const pairs = [];
    for (const r5 of ordered.filter(r => r.arm === 'A5')) { const r2 = ordered.find(r => r.arm === 'A2' && r.configIndex === r5.configIndex && r.seed === r5.seed); if (!r2) continue;
      pairs.push({ configIndex: r5.configIndex, seed: r5.seed, ...a5a2WindowIdentity(r5.measurement.events, r2.measurement.events) }); }
    desc.a5EqualsA2PerWindow = { nPairs: pairs.length, counts: Object.fromEntries(WINDOWS.map(W => [W, pairs.filter(p => p[W]).length])), pairs }; }
  return { runs, forks, descriptive: desc };
}

// ---------------- CLI ----------------
export function analyzeDir(dir) {
  const files = fs.readdirSync(dir).filter(f => /^[SM]\d+\.json$/.test(f)).sort();
  const study = {}, records = {};
  for (const f of files) { const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (f.startsWith('S')) study[fx.id] = analyzeStudy(fx); else records[fx.id] = analyzeRecords(fx); }
  return { study, records };
}
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const [dir, outFile] = process.argv.slice(2);
  if (!dir || !outFile) { console.error('usage: node experiments/h1r/analyze.js <fixtureDir> <output.json>'); process.exit(2); }
  const { study, records } = analyzeDir(dir);
  const pkg = path.join(REPO, 'research', 'preregistrations', 'h1r_d021b', 'GEMINI_PACKAGE.md');
  const doc = { schema: OUTPUT_SCHEMA,
    implementation: { name: 'experiments/h1r/analyze.js', author: 'Claude (repository implementation agent)', runtime: `node ${process.version}`,
      sourceSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), packageSha256: fs.existsSync(pkg) ? sha(fs.readFileSync(pkg)) : null,
      rulings: RULINGS, inferences: INFERENCES },
    study, records };
  const text = JSON.stringify(doc, (k, v) => enc(v));
  fs.writeFileSync(outFile, text);
  console.log(`wrote ${outFile}: ${Object.keys(study).length} study fixtures, ${Object.keys(records).length} record fixtures, SHA-256 ${sha(text)}`);
}

// ==========================================================
// H1-R — verification of analyze.js (unit oracles, rulings, fixtures, determinism, purity, mutation anti-vacuity)
// ==========================================================
// Every unit check compares analyze.js against an INDEPENDENT oracle: a closed form, an exact algebraic identity, a
// brute-force enumeration, or a re-implementation written differently in this file. No check uses a remembered
// constant or an expected H1-R result. Rulings: D-024, D-025 and D-026 (research/09_decisions.md).
//
//   node experiments/h1r/verify_analysis.mjs                 full battery (writes experiments/h1r/$H1R_EVIDENCE/)
//   node experiments/h1r/verify_analysis.mjs --unit <file>   unit checks only, against the given analyze.js (mutants)
// ==========================================================
import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FXDIR = path.join(REPO, 'research', 'preregistrations', 'h1r_d021b', 'fixtures');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const mul = (seed) => { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// oracle Spearman: O(n²) mid-ranks, then Pearson; null when n < 3 or a variable is constant
const rk = (xs) => xs.map(x => { let below = 0, eq = 0; for (const y of xs) { if (y < x) below++; else if (y === x) eq++; } return below + (eq + 1) / 2; });
const pear = (a, b) => { const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return (saa === 0 || sbb === 0) ? null : sab / Math.sqrt(saa * sbb); };
const spearO = (xs, ys) => xs.length < 3 ? null : pear(rk(xs), rk(ys));
const entO = (counts) => { const n = counts.reduce((a, b) => a + b, 0); if (!n) return null; let h = 0; for (const c of counts) if (c > 0) h -= (c / n) * Math.log2(c / n); return h; };
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(FXDIR, f), 'utf8'));
const loadArb = () => new Function(execFileSync('git', ['-C', REPO, 'show', '707cb1e:render/executiveController.js']).toString('utf8').replace(/^export function /gm, 'function ') + '\nreturn arbitrate;')();

// ---------------- unit checks (importable against any analyze.js file) ----------------
export async function unitChecks(analyzePath) {
  const A = await import(pathToFileURL(analyzePath).href + `?u=${sha(fs.readFileSync(analyzePath)).slice(0, 12)}`);
  const R = []; const ok = (id, name, cond, ev) => R.push({ id, name, status: cond ? 'PASS' : 'FAIL', evidence: ev });
  const guard = async (id, name, fn) => { try { await fn(); } catch (e) { R.push({ id, name, status: 'FAIL', evidence: `threw: ${String(e && e.message || e).slice(0, 200)}` }); } };

  // U1 makeRng = instrumentation/rng.js makeRng (B2 blob) for the four analysis seeds
  { const src = execFileSync('git', ['-C', REPO, 'show', '707cb1e:instrumentation/rng.js']).toString('utf8');
    const ref = new Function(src.replace(/^export /gm, '') + '\nreturn makeRng;')();
    let bad = 0; for (const s of [770001, 770002, 770003, 770004]) { const x = A.makeRng(s), y = ref(s); for (let i = 0; i < 20000; i++) if (x() !== y()) bad++; }
    ok('U1', 'makeRng is bit-identical to B2 instrumentation/rng.js makeRng (seeds 770001–770004, 20,000 draws each)', bad === 0, `mismatches ${bad}`); }

  // U2 t distribution against closed forms (ν = 1, 2, 4) and an independent A&S 26.7.3/4 finite series (ν = 3 … 30)
  { const ts = [1e-3, 0.05, 0.3, 0.7, 1, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 20, 50]; let w1 = 0, w2 = 0, w4 = 0, wn = 0, sym = 0;
    const p4 = (t) => { const r2 = t * t + 4, s = t / Math.sqrt(r2), c2 = 4 / r2; return 1 - s * (1 + c2 / 2); };
    const asSeries = (t, nu) => { const th = Math.atan(Math.abs(t) / Math.sqrt(nu)), c = Math.cos(th), s = Math.sin(th); let A;
      if (nu % 2 === 1) { let term = c, sumv = nu > 1 ? c : 0; for (let k = 3; k <= nu - 2; k += 2) { term *= c * c * (k - 1) / k; sumv += term; } A = (2 / Math.PI) * (th + (nu > 1 ? s * sumv : 0)); }
      else { let term = 1, sumv = 1; for (let k = 2; k <= nu - 2; k += 2) { term *= c * c * (k - 1) / k; sumv += term; } A = s * sumv; }
      return 1 - A; };
    // ν = 1, 2: cancellation-free closed forms → relative error. ν = 4 and the A&S series compute p = 1 − A and lose
    // ≈ ε/p to cancellation themselves, so they are compared in relative terms only where p ≥ 0.01, and absolutely everywhere.
    let a4 = 0, an = 0;
    for (const t of ts) { w1 = Math.max(w1, rel(A.tTwoSidedP(t, 1), (2 / Math.PI) * Math.atan(1 / t))); const r = Math.sqrt(t * t + 2); w2 = Math.max(w2, rel(A.tTwoSidedP(t, 2), 2 / (r * (r + t))));
      const q4 = p4(t); a4 = Math.max(a4, Math.abs(A.tTwoSidedP(t, 4) - q4)); if (q4 >= 0.01) w4 = Math.max(w4, rel(A.tTwoSidedP(t, 4), q4));
      for (let nu = 3; nu <= 30; nu++) { const e = asSeries(t, nu); an = Math.max(an, Math.abs(A.tTwoSidedP(t, nu) - e)); if (e >= 0.01) wn = Math.max(wn, rel(A.tTwoSidedP(t, nu), e)); }
      if (A.tTwoSidedP(-t, 7) !== A.tTwoSidedP(t, 7)) sym++; }
    // the A&S series sums up to ν/2 trigonometric terms, so its own absolute rounding error is ≈ ν·ε ≲ 3e-15
    ok('U2', 'two-sided t p-value: ν=1, ν=2 cancellation-free closed forms (relative ≤ 1e-13); ν=4 closed form (relative ≤ 1e-12 where p ≥ 0.01, absolute ≤ 1e-15) and the A&S finite series for ν = 3 … 30 (relative ≤ 1e-12 where p ≥ 0.01, absolute ≤ 5e-15, the series\' own rounding); symmetric; p(0) = 1',
      w1 <= 1e-13 && w2 <= 1e-13 && w4 <= 1e-12 && wn <= 1e-12 && a4 <= 1e-15 && an <= 5e-15 && sym === 0 && A.tTwoSidedP(0, 5) === 1,
      `max rel error ν1 ${w1.toExponential(2)}, ν2 ${w2.toExponential(2)}, ν4 ${w4.toExponential(2)}, ν3–30 ${wn.toExponential(2)}; max abs error ν4 ${a4.toExponential(2)}, ν3–30 ${an.toExponential(2)}; asymmetries ${sym}`); }

  // U3 critical values t_{ν,0.995}: closed forms ν = 1, 2, 4; p(t_crit) = 0.01 for ν = 1 … 30
  { const q1 = Math.tan(Math.PI * 0.495), q2 = 0.99 * Math.sqrt(2 / (1 - 0.99 * 0.99));
    const q4 = (() => { const F = 0.995, a = 4 * F * (1 - F), q = Math.cos(Math.acos(Math.sqrt(a)) / 3) / Math.sqrt(a); return 2 * Math.sqrt(q - 1); })();
    let wp = 0; for (let nu = 1; nu <= 30; nu++) wp = Math.max(wp, Math.abs(A.tTwoSidedP(A.tCritical(0.01, nu), nu) - 0.01));
    const e = [rel(A.tCritical(0.01, 1), q1), rel(A.tCritical(0.01, 2), q2), rel(A.tCritical(0.01, 4), q4)];
    ok('U3', 't_{ν,0.995}: closed forms for ν = 1, 2, 4 within 1e-13 relative; two-sided p at the critical value = 0.01 within 1e-15 for ν = 1 … 30',
      e.every(x => x <= 1e-13) && wp <= 1e-15, `relative errors ${e.map(x => x.toExponential(2)).join(', ')}; max |p − 0.01| ${wp.toExponential(2)}`); }

  // U4 crossed test: independent sums of squares (SS_total = SS_C + SS_S + SS_CS), the §12 formulas, degenerate and non-computable cases
  { const r = mul(424242); let bad = 0, idErr = 0;
    for (let k = 0; k < 400; k++) {
      const C = 2 + Math.floor(r() * 9), S = 2 + Math.floor(r() * 9), d = Array.from({ length: C }, () => Array.from({ length: S }, () => Math.round((r() * 20 - 10) * 8) / 8));
      const t = A.crossed(d); let tot = 0, g = 0; for (const row of d) for (const v of row) g += v; g /= C * S;
      for (const row of d) for (const v of row) tot += (v - g) ** 2;
      const ssc = S * d.reduce((x, row) => x + (row.reduce((p, v) => p + v, 0) / S - g) ** 2, 0), sss = C * Array.from({ length: S }, (_, s) => d.reduce((p, row) => p + row[s], 0) / C).reduce((x, v) => x + (v - g) ** 2, 0);
      const msc = ssc / (C - 1), mss = sss / (S - 1), mscs = (tot - ssc - sss) / ((C - 1) * (S - 1));
      if (rel(t.MS_C, msc) > 1e-10 || rel(t.MS_S, mss) > 1e-10 || Math.abs(t.MS_CS - mscs) > 1e-9 * Math.max(1, tot)) bad++;
      const se = Math.sqrt((msc + mss) / (C * S)), nu = Math.min(C - 1, S - 1);
      if (rel(t.dbar, g) > 1e-12 || t.nu !== nu || (msc + mss > 0 && rel(t.p, A.tTwoSidedP(g / se, nu)) > 1e-12)) bad++;
      const q = A.tCritical(0.01, nu);   // the 99% CI: d̄ ± t_{ν,0.995}·se
      if (msc + mss > 0 && (Math.abs(t.lower - (g - q * se)) > 1e-9 * Math.max(1, Math.abs(g) + q * se) || Math.abs(t.upper - (g + q * se)) > 1e-9 * Math.max(1, Math.abs(g) + q * se))) idErr++;
    }
    const z = A.crossed([[0, 0], [0, 0], [0, 0]]), two = A.crossed([[2, 2, 2], [2, 2, 2]]), neg = A.crossed([[-1, -1], [-1, -1]]), nc1 = A.crossed([[1, 2, 3]]), nc2 = A.crossed([[1], [2], [3]]);
    const deg = z.p === 1 && z.lower === 0 && z.upper === 0 && z.containsZero === true && two.p === 0 && two.lower === 2 && two.upper === 2 && two.containsZero === false && two.tPrime === Infinity && neg.p === 0 && neg.tPrime === -Infinity && Number.isNaN(z.tPrime);
    ok('U4', '§12 crossed test: MS_C, MS_S, MS_CS, d̄, ν, p and the 99% CI equal an independent sums-of-squares computation (400 random arrays); degenerate case p = 1 / 0 with CI [d̄, d̄]; fewer than 2 rows or seeds → not computable',
      bad === 0 && idErr === 0 && deg && nc1.computable === false && nc2.computable === false, `mismatching arrays ${bad}; CI mismatches ${idErr}; degenerate cases ${deg}; non-computable (1×3, 3×1) ${!nc1.computable && !nc2.computable}`); }

  // U5 Holm against a direct transcription of p̃₍ⱼ₎ = max_{i≤j} min(1, (7−i)p₍ᵢ₎), with ties and input permutations
  { const r = mul(5150); let bad = 0, perm = 0;
    const ref = (ps) => { const o = ps.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p || a.i - b.i), out = []; for (let j = 0; j < o.length; j++) { let m = 0; for (let i = 0; i <= j; i++) m = Math.max(m, Math.min(1, (7 - (i + 1)) * o[i].p)); out[o[j].i] = m; } return out; };
    for (let k = 0; k < 3000; k++) { const ps = Array.from({ length: 6 }, () => r() < 0.3 ? 0.004 : r() < 0.2 ? 0 : r() * 0.05); if (JSON.stringify(A.holm(ps)) !== JSON.stringify(ref(ps))) bad++;
      const p2 = ps.slice().reverse(); if (JSON.stringify(A.holm(p2).slice().reverse()) !== JSON.stringify(A.holm(ps))) perm++; }
    ok('U5', 'Holm: equals a direct transcription of the §12 formula on 3,000 vectors with ties and zeros; invariant to input order; all-null family stays null',
      bad === 0 && perm === 0 && A.holm([null, null, null, null, null, null]).every(x => x === null), `mismatches ${bad}; order-dependence ${perm}`); }

  // U6 two-way bootstrap: re-simulated independently; constant data; IR-34c (undefined replicates → CI null, counted)
  { // 12 × 6 cells with continuous values: the replicate distribution has distinct order statistics, so the order
    // statistic index and the seed are both observable (a 3 × 2 integer example could not distinguish them)
    const configs = [...Array(12).keys()].map(c => c + 3), seeds = [...Array(6).keys()].map(s => s + 11);
    const val = (c, s) => Math.sin(c * 1.37 + s * 2.11) + c * 0.013, stat = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const b = A.twoWayBootstrap(configs, seeds, val, stat);
    const rng = mul(770002), vs = []; for (let it = 0; it < 10000; it++) { const cc = configs.map(() => configs[Math.floor(rng() * configs.length)]), ss = seeds.map(() => seeds[Math.floor(rng() * seeds.length)]); const xs = []; for (const c of cc) for (const s of ss) xs.push(val(c, s)); vs.push(stat(xs)); }
    vs.sort((x, y) => x - y);
    const sensitive = vs[49] !== vs[50] && vs[9949] !== vs[9950];
    const constB = A.twoWayBootstrap(configs, seeds, () => 7, stat);
    // IR-34c sub-cases on a small 3 × 2 array, where replicates that draw only undefined or missing cells occur often
    const sc = [3, 5, 9], ss2 = [11, 12];
    const undefB = A.twoWayBootstrap(sc, ss2, (c, s) => (c === 3 ? null : 1), (xs) => (xs.every(x => x === null) ? null : 1));
    const missB = A.twoWayBootstrap(sc, ss2, (c) => (c === 3 ? 1 : undefined), (xs) => xs.length ? 1 : null);
    ok('U6', 'two-way bootstrap: identical to an independent re-simulation (fresh makeRng(770002), configurations then seeds, ⌊u·n⌋, 50th/9,950th order statistics); constant data → [v, v]; IR-34c: undefined replicates counted and the CI null, never rescaled',
      sensitive && b.lower === vs[49] && b.upper === vs[9949] && constB.lower === 7 && constB.upper === 7 && undefB.lower === null && undefB.upper === null && undefB.nUndefinedIterations > 0 && undefB.nDefinedIterations + undefB.nUndefinedIterations === 10000 && undefB.statistic === 1 && missB.lower === null && missB.nUndefinedIterations > 0,
      `CI [${b.lower}, ${b.upper}] vs re-simulation [${vs[49]}, ${vs[9949]}]; IR-34c case: undefined ${undefB.nUndefinedIterations}, defined ${undefB.nDefinedIterations}, CI ${undefB.lower}/${undefB.upper}; missing-cell case: undefined ${missB.nUndefinedIterations}`); }

  // U7 Spearman (average ranks) against an O(n²) rank definition; IR-12
  { const r = mul(777); let bad = 0;
    for (let k = 0; k < 2000; k++) { const n = 3 + Math.floor(r() * 30), xs = Array.from({ length: n }, () => Math.floor(r() * 6) / 5), ys = Array.from({ length: n }, () => r() < 0.3 ? 0.5 : r());
      const s = A.spearman(xs, ys), vx = new Set(xs).size > 1, vy = new Set(ys).size > 1;
      if (!vx || !vy) { if (s.rho !== null || s.reason !== 'zeroVariance') bad++; } else if (Math.abs(s.rho - pear(rk(xs), rk(ys))) > 1e-12) bad++; }
    const few = A.spearman([1, 2], [1, 2]), zx = A.spearman([1, 1, 1, 1], [1, 2, 3, 4]), zy = A.spearman([1, 2, 3], [5, 5, 5]), mono = A.spearman([1, 2, 3, 4], [10, 20, 30, 40]), anti = A.spearman([1, 2, 3, 4], [4, 3, 2, 1]);
    ok('U7', 'Spearman with average ranks equals Pearson on independently computed mid-ranks (2,000 tied samples); fewer than 3 keys → null; IR-12: zero variance in either variable → null with the reason recorded, never 0',
      bad === 0 && few.rho === null && few.reason === 'fewerThan3Keys' && zx.rho === null && zx.reason === 'zeroVariance' && zy.rho === null && zy.reason === 'zeroVariance' && mono.rho === 1 && anti.rho === -1,
      `mismatches ${bad}; <3 → ${few.reason}; zero variance x → ${zx.reason}, y → ${zy.reason}`); }

  // U8 half-life (IR-03b) against an independent transcription of v1.0 §8, including R_W2 ≤ 0
  { const r = mul(31337); let bad = 0, negThr = 0;
    const ref = (rew) => { let w2 = 0; for (let t = 300; t <= 1499; t++) w2 += rew[t]; const thr = 0.5 * (w2 / 12);
      const TR = (t) => { let s = 0; for (let u = t - 99; u <= t; u++) s += rew[u]; return s; };
      let tb = -1; for (let t = 1500; t <= 2999; t++) if (TR(t) < thr) { tb = t; break; } if (tb < 0) return { hl: 0, cens: false, thr };
      for (let t = tb + 1; t <= 2999; t++) if (TR(t) >= thr) return { hl: t - 1500, cens: false, thr }; return { hl: 1500, cens: true, thr }; };
    for (let k = 0; k < 120; k++) {
      const mode = k % 4, rew = new Array(3000).fill(0), events = [];
      for (let t = 0; t < 3000; t++) { const p = r(); let v = 0;
        if (mode === 0) v = p < 0.5 ? [2, 0.3, -0.4][Math.floor(r() * 3)] : 0;
        if (mode === 1) v = (t >= 300 && t < 1500) ? (p < 0.6 ? -0.4 : 0) : (p < 0.4 ? -0.4 : 0.3);     // R_W2 < 0
        if (mode === 2) v = t >= 1500 ? (p < 0.6 ? -0.4 : 0) : (p < 0.5 ? 2 : 0);                          // no recovery
        if (mode === 3) v = p < 0.6 ? 2 : 0;                                                                // never below
        if (v !== 0) { rew[t] = v; events.push([t + 5, v]); } }
      const e = ref(rew), run = { runId: 'u', arm: 'A2', measurement: { events, snapshots: [['tau1499', 1505, []], ['tau2999', 3005, []]], attempts: [], resets: [] } };
      const m = A.runMetrics(run, { edges: [] });
      if (m.halfLife.value !== e.hl || m.halfLife.censored !== e.cens || !Object.is(m.descriptive.halfLifeThreshold, e.thr)) bad++;
      if (e.thr < 0) negThr++;
    }
    ok('U8', 'half-life equals an independent transcription of v1.0 §8 on 120 synthetic reward streams (HL = 0, recovery, right-censoring); IR-03b: thr = 0.5·R_W2 exactly, negative when R_W2 < 0, never clamped',
      bad === 0 && negThr >= 20, `mismatches ${bad}; streams with a negative threshold ${negThr}`); }

  // U9 Box–Muller (D-020 pin 4) and Fisher–Yates (D-020 pin 5)
  { const seq = (xs) => { let i = 0; return () => xs[i++]; };
    const z = A.normal(seq([0, 0, 0.25, 0.5])), zRef = Math.sqrt(-2 * Math.log(0.25)) * Math.cos(2 * Math.PI * 0.5);
    const r1 = A.makeRng(770001), r2 = mul(770001); let bm = 0; for (let k = 0; k < 5000; k++) { let u1 = r2(); while (u1 === 0) u1 = r2(); const u2 = r2(); if (A.normal(r1) !== Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)) bm++; }
    let fy = 0; const r3 = mul(99); for (let k = 0; k < 2000; k++) { const n = Math.floor(r3() * 12), arr = Array.from({ length: n }, (_, i) => i * 7);
      const ra = A.makeRng(770004 + k), rb = mul(770004 + k), got = A.fisherYates(arr, ra), exp = arr.slice(); for (let i = exp.length - 1; i >= 1; i--) { const j = Math.floor(rb() * (i + 1)); [exp[i], exp[j]] = [exp[j], exp[i]]; } if (JSON.stringify(got) !== JSON.stringify(exp)) fy++; }
    ok('U9', 'Box–Muller: u₁ = 0 redrawn (twice), cos partner, consumes u₁ then u₂ (5,000 deviates re-derived); Fisher–Yates: i = n−1 … 1, j = ⌊u·(i+1)⌋ (2,000 arrays incl. n = 0, 1)',
      z === zRef && bm === 0 && fy === 0, `u₁=0 case ${z === zRef}; deviate mismatches ${bm}; permutation mismatches ${fy}`); }

  // U10 power procedure: degenerate inputs, and one (W, S) re-simulated independently
  { const zero = A.powerProcedure({ W1: [[3, 3, 3], [3, 3, 3]], W3: [[3, 3, 3], [3, 3, 3]] }), none = A.powerProcedure({ W1: [[0, 0, 0], [0, 0, 0]], W3: [[0, 0, 0], [0, 0, 0]] });
    // an array whose power is strictly between 0 and 1 at S = 3 and 4, so the random stream is observable
    const arr = { W1: [[2.0, 2.3, 1.8], [2.1, 2.6, 1.9], [1.7, 2.2, 2.0]], W3: [[2.0, 2.3, 1.8], [2.1, 2.6, 1.9], [1.7, 2.2, 2.0]] }, pw = A.powerProcedure(arr);
    const t = A.crossed(arr.W1), c = A.components(t);
    const resim = (S) => { const rng = mul(770001); let rej = 0;   // fresh generator for each (W, S)
      for (let it = 0; it < 10000; it++) { const z = () => { let u1 = rng(); while (u1 === 0) u1 = rng(); const u2 = rng(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
        const a = Array.from({ length: 30 }, () => Math.sqrt(c.sigma2C) * z()), b = Array.from({ length: S }, () => Math.sqrt(c.sigma2S) * z());
        const d = a.map(ac => b.map(bs => t.dbar + ac + bs + Math.sqrt(c.sigma2E) * z())); if (A.crossed(d).p < 0.01 / 6) rej++; }
      return rej / 10000; };
    const r3 = resim(3), r4 = resim(4), inter = r3 > 0 && r3 < 1 && r4 > 0 && r4 < 1;
    ok('U10', 'power: all σ̂ = 0 and μ̂ ≠ 0 → power 1 at every S, S* = 2; μ̂ = 0 → power 0, S* = 20 under-powered; power(W1, S = 3) and power(W1, S = 4), both strictly between 0 and 1, equal an independent re-simulation (fresh makeRng(770001) per (W, S); a, then b, then e row-major)',
      zero.Sstar === 2 && zero.W1.power.every(x => x === 1) && none.Sstar === 20 && none.underpowered === true && none.W3.power.every(x => x === 0) && inter && pw.W1.power[1] === r3 && pw.W1.power[2] === r4,
      `S* (σ̂ = 0, μ̂ = 3) ${zero.Sstar}; S* (μ̂ = 0) ${none.Sstar}, under-powered ${none.underpowered}; power(W1, 3) ${pw.W1.power[1]} vs ${r3}; power(W1, 4) ${pw.W1.power[2]} vs ${r4}`); }

  const M01 = fixture('M01.json'), m1 = M01.runs.find(r => r.runId === 'm1'), m6 = M01.runs.find(r => r.runId === 'm6'), cfgOf = (run) => M01.configurations.find(c => c.index === run.configIndex);

  // U11 PR-4 (D-025 §1): B1 bin rule, K1 maximum over the recorded step-0 candidates, E1/F1 pooled rates and ρ
  await guard('U11', 'PR-4 monotonicity', () => {
    const cases = [[0, 0], [0.05, 0], [0.09999999999999998, 0], [0.1, 1], [0.15, 1], [0.2, 2], [0.30000000000000004, 3], [0.3, 3], [0.45, 4], [0.5, 4], [0.6, 4]];
    const binBad = cases.filter(([x, b]) => A.monoBin(x) !== b).map(([x]) => x);
    const out = A.runMetrics(m1, cfgOf(m1)), arb = loadArb(), groups = new Map(m1.measurement.step0.map(g => [g[0], g])), d = [0, 0, 0, 0, 0], f = [0, 0, 0, 0, 0];
    for (let i = 5; i <= 3004; i++) { if (m1.measurement.ticks[i] !== 'D') continue; const g = groups.get(i);
      let xmax = -1; for (const cand of g[2]) xmax = Math.max(xmax, Math.abs(cand[2]) / 12);
      const b = Math.min(4, Math.floor(10 * xmax)); d[b]++;
      let a1 = null, b1 = -Infinity, a0 = null, b0 = -Infinity;
      for (const [k, F, t, , w, ap, a, u, e, sl] of g[2]) { const x0 = ap ? Math.max(-400, Math.min(400, F - t)) * 0.60 + arb({ rewardScore: a[0], semanticScore: a[1], confidenceScore: a[2] - t, uncertaintyScore: u, curiosityScore: a[3], costScore: a[4], executiveWeights: { wReward: e[0], wSemantic: e[1], wConfidence: e[2], wUncertainty: e[3], wCuriosity: e[4], wCost: e[5] }, drift: 0, isSelfLoop: sl === 1 }) * 0.40 : Math.max(-400, Math.min(400, F - t));
        if (w > b1) { b1 = w; a1 = k; } if (x0 > b0) { b0 = x0; a0 = k; } }
      if (a1 !== a0) f[b]++; }
    const binsOk = JSON.stringify(out.link3.monotonicity) === JSON.stringify({ decisions: d, flips: f }) && d.reduce((a, b) => a + b) === out.link3.decisionTicks && f.reduce((a, b) => a + b) === out.link3.flips;
    const r = mul(1404); let rhoBad = 0;
    for (let k = 0; k < 500; k++) { const dd = Array.from({ length: 5 }, () => 1 + Math.floor(r() * 50)), ff = dd.map(x => Math.floor(r() * (x + 1)) * (r() < 0.2 ? 0 : 1));
      const mr = A.monoRho(dd, ff), rates = dd.map((x, b) => ff[b] / x), e = spearO([0, 1, 2, 3, 4], rates);
      if (e === null ? (mr.rho !== null || mr.reason !== 'zeroVariance') : Math.abs(mr.rho - e) > 1e-12) rhoBad++; }
    const empty = A.monoRho([5, 0, 5, 5, 5], [1, 0, 2, 3, 4]), flat = A.monoRho([10, 10, 10, 10, 10], [1, 1, 1, 1, 1]);
    ok('U11', 'PR-4 (D-025 §1): B1 bin = min(4, ⌊10x⌋) on 11 edge values; link ③ monotonicity bins of M01 run m1 equal an independent derivation (x = max over the recorded step-0 candidates of |t|/12; flips from B2 arbitrate shadow weights), and the bins sum to decisionTicks and flips; E1/F1: ρ of bin index vs rate equals an O(n²) mid-rank oracle (500 cases); an empty bin → null (emptyBin); zero variance → null (IR-12)',
      binBad.length === 0 && binsOk && rhoBad === 0 && empty.rho === null && empty.reason === 'emptyBin' && flat.rho === null && flat.reason === 'zeroVariance',
      `bin mismatches ${binBad.join(',') || 'none'}; m1 bins ${JSON.stringify(out.link3.monotonicity)} vs oracle ${JSON.stringify({ decisions: d, flips: f })}; ρ mismatches ${rhoBad}; empty → ${empty.reason}; flat → ${flat.reason}`);
  });

  // U12 criterion decisions: C-1 (D-024 §12, D-025 §2), PR-1, PR-2 truth tables
  await guard('U12', 'C-1, PR-1, PR-2 decisions', () => {
    const C = (computable, containsZero) => ({ computable, containsZero: computable ? containsZero : null }), pair = (w1, w3) => ({ W1: w1, W3: w3 });
    const no = () => { throw new Error('final evaluated without the extension'); };
    const cases = [
      ['initial excludes 0 in W1', pair(C(true, false), C(true, true)), true, no, { extensionTaken: false, extensionUnavailable: false, fires: false, outcome: 'PROCEED' }],
      ['initial contains 0 in both, extension unavailable', pair(C(true, true), C(true, true)), false, no, { extensionTaken: false, extensionUnavailable: true, fires: false, outcome: 'HALT' }],
      ['initial non-computable, extension unavailable', pair(C(false), C(false)), false, no, { extensionTaken: false, extensionUnavailable: true, fires: false, outcome: 'HALT' }],
      ['initial non-computable, final non-computable', pair(C(false), C(false)), true, () => pair(C(false), C(false)), { extensionTaken: true, extensionUnavailable: false, fires: true, outcome: 'VOID' }],
      ['initial non-computable, final excludes 0 in W3', pair(C(false), C(false)), true, () => pair(C(true, true), C(true, false)), { extensionTaken: true, extensionUnavailable: false, fires: false, outcome: 'PROCEED' }],
      ['initial non-computable, final contains 0 in both', pair(C(false), C(false)), true, () => pair(C(true, true), C(true, true)), { extensionTaken: true, extensionUnavailable: false, fires: true, outcome: 'VOID' }],
      ['initial contains 0 in both, final contains 0 in both', pair(C(true, true), C(true, true)), true, () => pair(C(true, true), C(true, true)), { extensionTaken: true, extensionUnavailable: false, fires: true, outcome: 'VOID' }],
      ['initial contains 0 in both, final excludes 0 in W1', pair(C(true, true), C(true, true)), true, () => pair(C(true, false), C(true, true)), { extensionTaken: true, extensionUnavailable: false, fires: false, outcome: 'PROCEED' }],
    ];
    const bad11 = cases.filter(([, ini, av, fin, exp]) => { const d = A.f11Decision(ini, av, fin); return Object.keys(exp).some(k => d[k] !== exp[k]); }).map(c => c[0]);
    const f1 = [[null, { lower: 0.1, upper: 0.2 }, true], [0.2, { lower: 0.1, upper: 0.3 }, true], [0.5, { lower: null, upper: null }, true], [0.5, { lower: -0.1, upper: 0.9 }, true], [0.5, { lower: 0, upper: 0.9 }, true], [0.5, { lower: 0.1, upper: 0.9 }, false]];
    const f3 = [[null, { lower: 1 }, true], [1, { lower: null }, true], [1, { lower: 0 }, true], [1, { lower: -2 }, true], [1, { lower: 0.1 }, false]];
    const cp = [[pair(C(false), C(false)), true], [pair(C(true, true), C(true, true)), true], [pair(C(true, true), C(true, false)), false], [pair(C(true, false), C(true, false)), false]];
    const f10 = [[null, 1, true, false], [-1, null, false, true], [0, 1, false, true], [1, null, true, false], [1, 0.5, true, false], [1, 0.6, false, false], [2, 1.3, false, false]];
    const badF = [...f1.filter(([m, c, e]) => A.f1Fires(m, c) !== e).map(x => `F1:${JSON.stringify(x)}`), ...f3.filter(([m, c, e]) => A.f3Fires(m, c) !== e).map(x => `F3:${JSON.stringify(x)}`),
      ...cp.filter(([p, e]) => A.ciPairFires(p) !== e).map(x => `CI:${JSON.stringify(x[0])}`), ...f10.filter(([P, H, e, na]) => { const d = A.f10Decision(P, H); return d.fires !== e || d.notAssessable !== na; }).map(x => `F10:${JSON.stringify(x)}`)];
    ok('U12', 'C-1: the F-11 decision table (8 cases: the extension runs first when the initial CI is non-computable or contains 0 in both windows; non-computable or both-containing after it → fires = true, VOID; extension unavailable → fires = false, HALT; the final array is never evaluated without the extension); PR-2: F-1 and F-3 fire on a null CI; PR-1: a non-computable CI pair fires F-4…F-9, an undefined P̄ or H̄ fires F-10 (P̄ ≤ 0 stays not assessable)',
      bad11.length === 0 && badF.length === 0, `F-11 mismatches: ${bad11.join('; ') || 'none'}; criterion mismatches: ${badF.join('; ') || 'none'}`);
  });

  // U13 C-3 (G1) full-grid indexing, against an independent re-simulation; IR-34c counting
  await guard('U13', 'C-3 full grid', () => {
    const resim = (configs, seeds, val, stat) => { const rng = mul(770002), vs = []; let und = 0;
      for (let it = 0; it < 10000; it++) { const ci = configs.map(() => Math.floor(rng() * configs.length)), sj = seeds.map(() => Math.floor(rng() * seeds.length)), xs = [];
        for (const i of ci) for (const j of sj) { const v = val(configs[i], seeds[j]); if (v !== undefined) xs.push(v); }
        const s = xs.length ? stat(xs) : null; if (s === null) und++; else vs.push(s); }
      vs.sort((a, b) => a - b); return { lower: und ? null : vs[49], upper: und ? null : vs[9949], und }; };
    const stat = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // (a) an empty configuration row in a 12 × 6 grid (continuous values: a numeric CI)
    const cfgA = [...Array(12).keys()].map(c => c + 3), seedA = [...Array(6).keys()].map(s => s + 11), dropA = seedA.map(s => [7, s]);
    const gA = A.bootstrapGrid(cfgA.slice().reverse(), seedA, dropA), valA = (c, s) => gA.has(c, s) ? Math.sin(c * 1.37 + s * 2.11) + c * 0.013 : undefined;
    const bA = A.twoWayBootstrap(gA.configs, gA.seeds, valA, stat), eA = resim(cfgA, seedA, valA, stat);
    // (b) an empty row and an empty column in a 3 × 2 grid (replicates without any cell occur: IR-34c)
    const gB = A.bootstrapGrid([5, 3, 9], [12, 11], [[3, 11], [3, 12], [5, 12], [9, 12]]), valB = (c, s) => gB.has(c, s) ? c + s / 100 : undefined;
    const bB = A.twoWayBootstrap(gB.configs, gB.seeds, valB, stat), eB = resim([3, 5, 9], [11, 12], valB, stat);
    const gridOk = JSON.stringify(gA.configs) === JSON.stringify(cfgA) && JSON.stringify(gB.configs) === JSON.stringify([3, 5, 9]) && JSON.stringify(gB.seeds) === JSON.stringify([11, 12]) && !gB.has(3, 11) && gB.has(5, 11);
    ok('U13', 'C-3 (G1): the bootstrap index grid keeps an empty configuration row and an empty seed column (sorted, complete); with an empty row (12 × 6) the CI equals an independent full-grid re-simulation; with an empty row and column (3 × 2) the undefined-replicate count equals the re-simulation\'s and the CI is null (IR-34c)',
      gridOk && bA.lower === eA.lower && bA.upper === eA.upper && eA.und === 0 && bB.nUndefinedIterations === eB.und && eB.und > 0 && bB.lower === null && bB.nDefinedIterations + bB.nUndefinedIterations === 10000,
      `grid ${gridOk}; (a) [${bA.lower}, ${bA.upper}] vs [${eA.lower}, ${eA.upper}]; (b) undefined ${bB.nUndefinedIterations} vs ${eB.und}, CI ${bB.lower}`);
  });

  // U14 exact Pratt Wilcoxon and rank-biserial (PR-10) against brute-force enumeration and an exact BigInt recursion
  await guard('U14', 'Pratt Wilcoxon', () => {
    const prattO = (ds) => { const ab = ds.map(Math.abs), rr = rk(ab); let tp = 0, tm = 0; const nz = []; ds.forEach((d, i) => { if (d > 0) { tp += rr[i]; nz.push(rr[i]); } else if (d < 0) { tm += rr[i]; nz.push(rr[i]); } }); return { tp, tm, nz }; };
    const brute = (ds) => { const { tp, nz } = prattO(ds), m = nz.length, tot = nz.reduce((a, b) => a + b, 0); let cnt = 0;
      for (let mask = 0; mask < (1 << m); mask++) { let t = 0; for (let i = 0; i < m; i++) if (mask & (1 << i)) t += nz[i]; if (Math.abs(2 * t - tot) >= Math.abs(2 * tp - tot)) cnt++; }
      return cnt / 2 ** m; };
    const r = mul(2718); let bad = 0, n0 = 0;
    for (let k = 0; k < 300; k++) { const n = 1 + Math.floor(r() * 12), ds = Array.from({ length: n }, () => [-2, -1, 0, 1, 2, 3, -0.5][Math.floor(r() * 7)]);
      const w = A.wilcoxonPratt(ds), o = prattO(ds), rb = A.rankBiserial(ds);
      if (ds.includes(0)) n0++;
      if (w.p !== brute(ds) || w.Tplus !== o.tp || w.Tminus !== o.tm || w.direction !== Math.sign(o.tp - o.tm) || w.nZero !== ds.filter(d => d === 0).length) bad++;
      if ((o.tp + o.tm === 0) ? rb.r !== null : Math.abs(rb.r - (o.tp - o.tm) / (o.tp + o.tm)) > 1e-15) bad++; }
    // larger n with ties: exact counting distribution in BigInt
    let bigBad = 0;
    for (let k = 0; k < 6; k++) { const n = 30 + Math.floor(r() * 30), ds = Array.from({ length: n }, () => Math.round((r() - 0.4) * 8) / 2);
      const { tp, nz } = prattO(ds), w2 = nz.map(x => Math.round(2 * x)), M = w2.reduce((a, b) => a + b, 0); let cnt = new Array(M + 1).fill(0n); cnt[0] = 1n;
      for (const wi of w2) { const nx = cnt.slice(); for (let s = 0; s + wi <= M; s++) if (cnt[s]) nx[s + wi] += cnt[s]; cnt = nx; }
      let num = 0n; const obs = Math.abs(2 * Math.round(2 * tp) - M); for (let s = 0; s <= M; s++) if (Math.abs(2 * s - M) >= obs) num += cnt[s];
      const exact = Number(num * 10n ** 18n / (1n << BigInt(nz.length))) / 1e18, got = A.wilcoxonPratt(ds).p;
      if (Math.abs(got - exact) > 1e-15 + 1e-12 * exact) bigBad++; }
    const allZero = A.wilcoxonPratt([0, 0, 0]), rbZero = A.rankBiserial([0, 0]), emptyW = A.wilcoxonPratt([]);
    ok('U14', 'PR-10: exact Pratt Wilcoxon (zeros ranked, excluded from T⁺/T⁻; two-sided exact sign-flip p) equals brute-force enumeration exactly on 300 vectors with zeros and ties, and an exact BigInt counting recursion on 6 vectors with n = 30…59; rank-biserial (T⁺ − T⁻)/(T⁺ + T⁻); all zero → p = 1, r = null; no data → p = null',
      bad === 0 && bigBad === 0 && n0 > 50 && allZero.p === 1 && allZero.direction === 0 && rbZero.r === null && emptyW.p === null,
      `mismatches ${bad} (vectors with zeros ${n0}); large-n mismatches ${bigBad}; all-zero p ${allZero.p}, r ${rbZero.r}`);
  });

  // U15 PR-8 (D-024 §6; I-21): episodes with the cap lag corrected, Kaplan–Meier median, median of medians
  await guard('U15', 'KM steps-to-goal', () => {
    const ep = A.episodes([[3, 'goal'], [20, 'goal'], [171, 'cap'], [321, 'cap'], [400, 'goal'], [3004, 'goal']]);
    const expEp = [[16, true, 'goal'], [150, false, 'cap'], [150, false, 'cap'], [80, true, 'goal'], [2604, true, 'goal']];
    const epOk = JSON.stringify(ep.map(e => [e.length, e.event, e.end])) === JSON.stringify(expEp);
    const ep2 = A.episodes([[100, 'cap'], [250, 'cap']]), ep2Ok = JSON.stringify(ep2.map(e => [e.length, e.event, e.end])) === JSON.stringify([[95, false, 'cap'], [150, false, 'cap'], [2755, false, 'runEnd']]);
    // KM oracle: walk the episodes in length order with a running risk set
    const kmO = (eps) => { const srt = eps.slice().sort((a, b) => a.length - b.length || (b.event ? 1 : 0) - (a.event ? 1 : 0)); let atRisk = srt.length, S = 1, i = 0;
      while (i < srt.length) { const t = srt[i].length; let d = 0, c = 0; while (i < srt.length && srt[i].length === t) { if (srt[i].event) d++; else c++; i++; } if (d) { S *= 1 - d / atRisk; if (S <= 0.5) return t; } atRisk -= d + c; } return Infinity; };
    const r = mul(16180); let kmBad = 0;
    for (let k = 0; k < 400; k++) { const n = 1 + Math.floor(r() * 25), eps = Array.from({ length: n }, () => ({ length: 1 + Math.floor(r() * 12), event: r() < 0.6 })); if (A.kmMedian(eps) !== kmO(eps)) kmBad++; }
    const half = A.kmMedian([{ length: 3, event: true }, { length: 5, event: true }]), none = A.kmMedian([{ length: 4, event: false }]);
    const mm = [[[3, Infinity], Infinity], [[1, 2, 3, 4], 2.5], [[5], 5], [[], null], [[2, Infinity, Infinity], Infinity], [[1, 2, Infinity], 2]];
    const mmBad = mm.filter(([v, e]) => A.medianOfMedians(v) !== e).length;
    ok('U15', 'PR-8: a goal→cap raw reset gap of 151 calls gives a 150-tick cap episode, cap→cap 150, first episode from τ = 0 (call 5), resets before τ = 0 ignored, run end censored at call 3004; KM median = smallest t with S(t) ≤ 0.5 equals a running-risk-set oracle (400 cases; S = 0.5 exactly → that t; no event → +∞); median of run medians with two-middle averaging and +∞',
      epOk && ep2Ok && kmBad === 0 && half === 3 && none === Infinity && mmBad === 0, `episodes ${JSON.stringify(ep.map(e => e.length))}; cap-first ${JSON.stringify(ep2.map(e => e.length))}; KM mismatches ${kmBad}; S = 0.5 case → ${half}; median-of-medians mismatches ${mmBad}`);
  });

  // U16 PR-5 (D-024 §3; D-020 pins 5, 6; I-18): the makeRng(770003) stream over runs, independently re-simulated
  await guard('U16', 'permutation null', () => {
    const r = mul(4242), mk = (n) => Array.from({ length: n }, () => ({ u: 1 + Math.floor(r() * 40), v: 1 + Math.floor(r() * 40), trust: r(), p: 0.2 + 0.6 * r() }));
    const runs = [{ keys: { tau1499: mk(60), tau2999: mk(9) } }, { keys: { tau1499: mk(2), tau2999: mk(8) } }, { keys: { tau1499: mk(11), tau2999: mk(40) } }];
    const keysOf = (run, label) => run.keys[label];
    const got = A.permutationNull(runs, keysOf);
    const rng = mul(770003), exp = []; let sensitive = false;
    for (const run of runs) { const o = {};
      for (const label of ['tau1499', 'tau2999']) {
        const ks = run.keys[label].slice().sort((x, y) => x.u - y.u || x.v - y.v), xs = ks.map(k => k.trust), ys = ks.map(k => k.p), obs = A.spearman(xs, ys).rho;
        if (obs === null) { o[label] = { rho: null, p: null, percentile99: null, nShuffles: 0 }; continue; }
        const rs = []; let ge = 0;
        for (let k = 0; k < 10000; k++) { const yp = ys.slice(); for (let i = yp.length - 1; i >= 1; i--) { const j = Math.floor(rng() * (i + 1)); [yp[i], yp[j]] = [yp[j], yp[i]]; } const rho = A.spearman(xs, yp).rho; rs.push(rho); if (Math.abs(rho) >= Math.abs(obs)) ge++; }
        rs.sort((a, b) => a - b); if (rs[9899] !== rs[9900]) sensitive = true;
        o[label] = { rho: obs, p: (1 + ge) / 10001, percentile99: rs[9899], nShuffles: 10000 }; }
      exp.push(o); }
    ok('U16', 'PR-5: one makeRng(770003) sequence over the runs in order, τ 1499 then τ 2999 inside each run; keys ordered by (from, to); each shuffle a fresh Fisher–Yates permutation of the key-ordered p vector; an undefined observed ρ runs no shuffles and draws nothing (p null); p = (1 + #{|ρ*| ≥ |ρ|})/10,001; 99th percentile = the 9,900th raw ρ* (independent re-simulation, order statistics distinguishable)',
      JSON.stringify(got) === JSON.stringify(exp) && sensitive && got[1].tau1499.p === null, `results equal ${JSON.stringify(got) === JSON.stringify(exp)}; sensitive ${sensitive}; run 2 τ1499 ${JSON.stringify(got[1].tau1499)}`);
  });

  // U17 PR-10.1 (D-025 §6): Satterthwaite ν, the real-ν t p-value against numerical integration, lnΓ identities
  await guard('U17', 'Satterthwaite min F′', () => {
    // p = ∫_{θ0}^{π/2} cos^{ν−1}θ dθ / ∫_0^{π/2} cos^{ν−1}θ dθ with θ = π/2 − w⁴ (smooth integrand), composite Simpson
    const integ = (nu, upper) => { const N = 20000, h = upper / N, f = (w) => w === 0 ? 0 : Math.pow(Math.sin(w ** 4), nu - 1) * 4 * w ** 3; let s = f(0) + f(upper); for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * f(i * h); return s * h / 3; };
    const pO = (t, nu) => { const th0 = Math.atan(Math.abs(t) / Math.sqrt(nu)); return integ(nu, Math.pow(Math.PI / 2 - th0, 0.25)) / integ(nu, Math.pow(Math.PI / 2, 0.25)); };
    let worst = 0, worstAbs = 0, intBad = 0;
    for (const nu of [1, 1.37, 2.5, 3.2, 5.81, 9.5, 17.3, 31.7, 47.9]) for (const t of [0.1, 0.5, 1, 2, 3, 5, 8]) { const g = A.tTwoSidedPReal(t, nu), e = pO(t, nu); worstAbs = Math.max(worstAbs, Math.abs(g - e)); if (e >= 1e-6) worst = Math.max(worst, rel(g, e)); }
    for (let nu = 1; nu <= 40; nu++) for (const t of [0.3, 1.7, 4.2]) if (rel(A.tTwoSidedPReal(t, nu), A.tTwoSidedP(t, nu)) > 1e-13) intBad++;
    const lg = [Math.abs(A.lnGamma(1)), Math.abs(A.lnGamma(2)), Math.abs(A.lnGamma(0.5) - 0.5 * Math.log(Math.PI)), Math.abs(A.lnGamma(6) - Math.log(120)), Math.abs(A.lnGamma(3.5) - Math.log(15 * Math.sqrt(Math.PI) / 8)), Math.abs(A.lnGamma(20) - Math.log(121645100408832000))];
    const r = mul(8080); let sBad = 0;
    for (let k = 0; k < 200; k++) { const C = 2 + Math.floor(r() * 9), S = 2 + Math.floor(r() * 9), d = Array.from({ length: C }, () => Array.from({ length: S }, () => r() * 10 - 3));
      let g = 0; for (const row of d) for (const v of row) g += v; g /= C * S;
      const msc = S * d.reduce((x, row) => x + (row.reduce((p, v) => p + v, 0) / S - g) ** 2, 0) / (C - 1), mss = C * Array.from({ length: S }, (_, s) => d.reduce((p, row) => p + row[s], 0) / C).reduce((x, v) => x + (v - g) ** 2, 0) / (S - 1);
      const nuS = (msc + mss) ** 2 / (msc * msc / (C - 1) + mss * mss / (S - 1)), res = A.minFSatterthwaite(A.crossed(d));
      if (!res.computable || rel(res.nu, nuS) > 1e-10 || rel(res.p, A.tTwoSidedPReal(g / Math.sqrt((msc + mss) / (C * S)), nuS)) > 1e-9) sBad++; }
    const deg = A.minFSatterthwaite(A.crossed([[4, 4], [4, 4]])), nc = A.minFSatterthwaite(A.crossed([[1, 2]]));
    ok('U17', 'PR-10.1: Satterthwaite ν_S = (MS_C + MS_S)²/(MS_C²/(C−1) + MS_S²/(S−1)) equals an independent sums-of-squares computation (200 arrays); the real-ν t p-value equals numerical integration of cos^(ν−1) (relative ≤ 1e-9 where p ≥ 1e-6, absolute ≤ 1e-12) and the integer-ν p within 1e-13; lnΓ at 1, 2, ½, 6, 3.5, 20 within 1e-13; degenerate denominator → null',
      worst <= 1e-9 && worstAbs <= 1e-12 && intBad === 0 && lg.every(x => x <= 1e-13) && sBad === 0 && deg.computable === false && deg.reason === 'degenerateDenominator' && deg.p === null && nc.computable === false,
      `max rel ${worst.toExponential(2)}, max abs ${worstAbs.toExponential(2)}; integer-ν mismatches ${intBad}; lnΓ errors ${lg.map(x => x.toExponential(1)).join(',')}; ν_S mismatches ${sBad}; degenerate → ${deg.reason}`);
  });

  // U18 PR-6 Brier, PR-7 link ①, PR-8 on M01 runs m1 (A1) and m6 (A4), and a constructed snapshot
  await guard('U18', 'Brier, link ①, steps-to-goal', () => {
    const b = A.brierScore(m1.measurement.attempts, 'm1'); let n = 0, sc = 0, bt = 0, bb = 0;
    for (const at of m1.measurement.attempts) { const tau = at[0] - 5; if (tau < 0 || tau > 2999) continue; const tr = (at[6] + 1) / (at[5] + 2), base = (sc + 1) / (n + 2); bt += (tr - at[3]) ** 2; bb += (base - at[3]) ** 2; n++; sc += at[3]; }
    const brierOk = b.nAttempts === n && Math.abs(b.trust - bt / n) <= 1e-12 && Math.abs(b.base - bb / n) <= 1e-12 && Math.abs(b.difference - (bt / n - bb / n)) <= 1e-12 && n < m1.measurement.attempts.length;
    const win = { W1: [0, 299], W2: [300, 1499], W3: [1500, 1799], W4: [1800, 2999] };
    const l1O = (m, arm) => { const o = { nUpdates: {}, nUpdatesWholeRun: arm === 'A4' ? 0 : m.attempts.length, coverage: {}, entropy: {} };
      for (const [W, [lo, hi]] of Object.entries(win)) o.nUpdates[W] = arm === 'A4' ? 0 : m.attempts.filter(a => a[0] - 5 >= lo && a[0] - 5 <= hi).length;
      for (const lab of ['tau1499', 'tau2999']) { const es = m.snapshots.find(s => s[0] === lab)[2]; let n1 = 0, n3 = 0; const bins = new Array(10).fill(0);
        for (const [, a, s, raw] of es) { if (raw < 1) continue; n1++; if (raw >= 3) n3++; bins[Math.min(9, Math.floor(10 * ((s + 1) / (a + 2))))]++; }
        o.coverage[lab] = { keysWithAtLeast3: n3, keysWithAtLeast1: n1, fraction: n1 ? n3 / n1 : null }; o.entropy[lab] = { nKeys: n1, bins, bits: entO(bins) }; }
      return o; };
    const snapC = [['tau1499', 1505, [['1->2', 3, 2, 0], ['2->1', 4, 4, 3], ['2->3', 1, 0, 1], ['3->2', 10.5, 3.2, 5]]], ['tau2999', 3005, [['1->2', 9, 1, 2], ['2->1', 4, 4, 0]]]];
    const mC = { attempts: [[0, 1, 2, 1, 0, 0, 0], [10, 2, 1, 0, 0, 1, 1], [1600, 2, 3, 1, 0, 0, 0]], snapshots: snapC };
    const l1 = [[m1.measurement, 'A1'], [m6.measurement, 'A4'], [mC, 'A3']].map(([m, arm]) => JSON.stringify(A.link1Metrics(m, arm, 'x')) === JSON.stringify(l1O(m, arm)));
    const cov = A.link1Metrics(mC, 'A3', 'x').coverage.tau1499;
    const s2gO = (resets) => { const eps = []; let st = 5; for (const [c, k] of resets) { if (c < 5) continue; if (k === 'goal') { eps.push({ length: c - st + 1, event: true }); st = c + 1; } else { if (c > st) eps.push({ length: c - st, event: false }); st = c; } } if (st <= 3004) eps.push({ length: 3004 - st + 1, event: false }); return eps; };
    const s2g = A.runMetrics(m1, cfgOf(m1)).descriptive.stepsToGoal, epsO = s2gO(m1.measurement.resets);
    ok('U18', 'PR-6: Brier(trust), Brier(global prequential base) and their difference for M01 m1 equal an independent pass (τ ∈ [0, 2999], prior (a, s), counts before the attempt); PR-7: link ① metrics of m1 (A1), m6 (A4: no store increments) and a constructed snapshot (keys with raw 0 excluded from the denominator) equal an independent computation (bin = min(9, ⌊10x⌋), entropy in bits); PR-8: m1 episode counts and KM median equal an independent episode builder',
      brierOk && l1.every(Boolean) && cov.keysWithAtLeast1 === 3 && cov.keysWithAtLeast3 === 2 && s2g.nEpisodes === epsO.length && s2g.median === A.kmMedian(epsO),
      `Brier ${brierOk} (n ${b.nAttempts} of ${m1.measurement.attempts.length} attempts); link ① m1/m6/constructed ${l1.join('/')}; constructed coverage ${cov.keysWithAtLeast3}/${cov.keysWithAtLeast1}; episodes ${s2g.nEpisodes} vs ${epsO.length}, KM ${s2g.median}`);
  });

  // U19 PR-9 trajectory entropy, PR-12 (partial Spearman, undirected pooled ρ, calibration curve), PR-11 window identity
  await guard('U19', 'trajectory entropy, PR-12, PR-11', () => {
    const te = A.trajectoryEntropyOf(m1.measurement.attempts), win = { W1: [0, 299], W2: [300, 1499], W3: [1500, 1799], W4: [1800, 2999] }; let teBad = 0;
    for (const [W, [lo, hi]] of Object.entries(win)) { const cnt = {}; for (const [i, f, t, ok] of m1.measurement.attempts) { if (i - 5 < lo || i - 5 > hi) continue; const k = `${f}->${ok ? t : f}`; cnt[k] = (cnt[k] || 0) + 1; }
      const keys = Object.keys(cnt).sort(), e = entO(keys.map(k => cnt[k])); if (te[W].nTransitions !== keys.reduce((a, k) => a + cnt[k], 0) || te[W].nDistinct !== keys.length || Math.abs(te[W].bits - e) > 1e-12) teBad++; }
    // partial Spearman: the correlation of the residuals of the rank regressions on z (a different computation)
    const resid = (a, z) => { const ma = a.reduce((x, y) => x + y, 0) / a.length, mz = z.reduce((x, y) => x + y, 0) / z.length; let sz = 0, saz = 0; for (let i = 0; i < a.length; i++) { sz += (z[i] - mz) ** 2; saz += (a[i] - ma) * (z[i] - mz); } const b = saz / sz; return a.map((v, i) => v - ma - b * (z[i] - mz)); };
    const r = mul(5555); let pBad = 0;
    for (let k = 0; k < 300; k++) { const n = 4 + Math.floor(r() * 30), xs = Array.from({ length: n }, () => Math.floor(r() * 9)), ys = Array.from({ length: n }, () => r()), zs = Array.from({ length: n }, () => Math.floor(r() * 12));
      const g = A.partialSpearman(xs, ys, zs), rx = rk(xs), ry = rk(ys), rz = rk(zs), cxz = pear(rx, rz), cyz = pear(ry, rz), cxy = pear(rx, ry);
      if (cxz === null || cyz === null || cxy === null || Math.abs(cxz) === 1 || Math.abs(cyz) === 1) { if (g.r !== null) pBad++; continue; }
      const e = pear(resid(rx, rz), resid(ry, rz)); if (Math.abs(g.r - e) > 1e-10) pBad++; }
    const p3 = A.partialSpearman([1, 2, 3], [3, 1, 2], [1, 1, 2]), pZ = A.partialSpearman([1, 1, 1, 1], [1, 2, 3, 4], [4, 1, 2, 3]), pC = A.partialSpearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5], [10, 20, 30, 40, 50]);
    // undirected pooled: a constructed graph with an edge at raw₁ + raw₂ = 5 exactly, one at 4, one direction only
    const edges = [{ from: 1, to: 2, pPhaseI: 0.9, pPhaseII: 0.3 }, { from: 2, to: 3, pPhaseI: 0.5, pPhaseII: 0.6 }, { from: 3, to: 4, pPhaseI: 0.2, pPhaseII: 0.7 }, { from: 4, to: 5, pPhaseI: 0.4, pPhaseII: 0.1 }, { from: 1, to: 5, pPhaseI: 0.7, pPhaseII: 0.9 }];
    const ent = [['1->2', 3, 3, 3], ['2->1', 2, 1, 2], ['2->3', 2, 2, 2], ['3->2', 2, 0, 2], ['3->4', 7, 1, 7], ['4->5', 3, 2, 3], ['5->4', 3, 3, 3], ['1->5', 5, 5, 5], ['5->1', 4, 0, 4]];
    const up = A.undirectedPooled(ent, edges, 0, 'x'), q = (a, b) => ent.find(e => e[0] === `${a}->${b}`);
    const xsU = [], ysU = []; for (const e of edges) { const e1 = q(e.from, e.to), e2 = q(e.to, e.from), raw = (e1 ? e1[3] : 0) + (e2 ? e2[3] : 0); if (raw >= 5) { xsU.push(((e1 ? e1[2] : 0) + (e2 ? e2[2] : 0) + 1) / ((e1 ? e1[1] : 0) + (e2 ? e2[1] : 0) + 2)); ysU.push(e.pPhaseI); } }
    const upOk = up.nEdges === 4 && xsU.length === 4 && Math.abs(up.rho - spearO(xsU, ysU)) <= 1e-12;
    const mU = A.runMetrics(m1, cfgOf(m1)).descriptive.undirectedPooled.tau1499, snap = m1.measurement.snapshots.find(s => s[0] === 'tau1499')[2], qq = (a, b) => snap.find(e => e[0] === `${a}->${b}`);
    const xm = [], ym = []; for (const e of cfgOf(m1).edges) { const e1 = qq(e.from, e.to), e2 = qq(e.to, e.from); if ((e1 ? e1[3] : 0) + (e2 ? e2[3] : 0) >= 5) { xm.push(((e1 ? e1[2] : 0) + (e2 ? e2[2] : 0) + 1) / ((e1 ? e1[1] : 0) + (e2 ? e2[1] : 0) + 2)); ym.push(e.pPhaseI); } }
    const m1U = mU.nEdges === xm.length && Math.abs(mU.rho - spearO(xm, ym)) <= 1e-12;
    // calibration curve: pooled bins, means
    const kl = [[{ trust: 0.05, p: 0.2 }, { trust: 0.95, p: 0.8 }, { trust: 0.9, p: 0.6 }], [{ trust: 0.5, p: 0.4 }, { trust: 0.55, p: 0.1 }, { trust: 0.999, p: 0.3 }]];
    const cc = A.calibrationCurve(kl), ccO = Array.from({ length: 10 }, (_, b) => { const ks = kl.flat().filter(k => Math.min(9, Math.floor(10 * k.trust)) === b); return { bin: b, n: ks.length, meanTrust: ks.length ? ks.reduce((a, k) => a + k.trust, 0) / ks.length : null, meanP: ks.length ? ks.reduce((a, k) => a + k.p, 0) / ks.length : null }; });
    const ccOk = cc.nRuns === 2 && cc.bins.every((x, b) => x.n === ccO[b].n && (x.n === 0 ? x.meanTrust === null && x.meanP === null : Math.abs(x.meanTrust - ccO[b].meanTrust) <= 1e-15 && Math.abs(x.meanP - ccO[b].meanP) <= 1e-15));
    // PR-11: identity of the reward-event streams restricted to each window
    const evA = [[4, 9], [10, 2], [400, 0.3], [1600, 12], [2000, -0.4]], evB = [[4, 1], [10, 2], [400, 0.3], [1600, 2], [2000, -0.4]], id = A.a5a2WindowIdentity(evA, evB), idSame = A.a5a2WindowIdentity(evA, evA.slice());
    const idOk = id.W1 === true && id.W2 === true && id.W3 === false && id.W4 === true && Object.values(idSame).every(Boolean);
    ok('U19', 'PR-9: trajectory entropy of M01 m1 (slips as u → u) equals an independent count per window; PR-12: partial Spearman equals the correlation of rank-regression residuals (300 cases), fewer than 4 keys → null, zero variance → null, |r| = 1 in the denominator → null; undirected pooled ρ (raw₁ + raw₂ ≥ 5 inclusive) on a constructed graph and on m1 equals an independent computation; calibration-curve bins (min(9, ⌊10x⌋)) and means; PR-11: per-window event-stream identity (a difference before τ = 0 belongs to no window)',
      teBad === 0 && pBad === 0 && p3.r === null && p3.reason === 'fewerThan4Keys' && pZ.r === null && pZ.reason === 'zeroVariance' && pC.r === null && pC.reason === 'undefinedDenominator' && upOk && m1U && ccOk && idOk,
      `trajectory mismatches ${teBad}; partial mismatches ${pBad}; n=3 → ${p3.reason}; zero variance → ${pZ.reason}; collinear → ${pC.reason}; undirected constructed ${upOk} (edges ${up.nEdges}), m1 ${m1U}; calibration ${ccOk}; window identity ${JSON.stringify(id)}`);
  });

  // U20 RNG isolation: every bootstrap starts a fresh makeRng(770002); the permutation stream is separate
  await guard('U20', 'RNG isolation', () => {
    const configs = [...Array(10).keys()], seeds = [...Array(5).keys()], val = (c, s) => Math.cos(c * 0.7 + s * 1.9), stat = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const runs = [{ keys: { tau1499: Array.from({ length: 7 }, (_, i) => ({ u: i, v: i + 1, trust: Math.sin(i), p: Math.cos(i * 2) })), tau2999: [] } }];
    const b1 = A.twoWayBootstrap(configs, seeds, val, stat), p1 = A.permutationNull(runs, (r, l) => r.keys[l]);
    A.twoWayBootstrap(configs, seeds, (c, s) => val(s, c), stat);
    const b2 = A.twoWayBootstrap(configs, seeds, val, stat), p2 = A.permutationNull(runs, (r, l) => r.keys[l]);
    ok('U20', 'RNG isolation: a bootstrap CI is unchanged by another bootstrap and by a permutation null computed before it (fresh makeRng(770002) per CI, I-3); the permutation null is unchanged by bootstraps (its own makeRng(770003))',
      JSON.stringify(b1) === JSON.stringify(b2) && JSON.stringify(p1) === JSON.stringify(p2), `bootstrap repeat equal ${JSON.stringify(b1) === JSON.stringify(b2)}; permutation repeat equal ${JSON.stringify(p1) === JSON.stringify(p2)}`);
  });

  // U21 I-23 option A (D-026 §3): records-level bootstrap on the DECLARED universe, against an independent full-grid oracle
  await guard('U21', 'I-23 declared records universe', () => {
    const mkRun = (c, s) => { const k = c * 7 + s, attempts = []; let call = 5;
      for (let i = 0; i < 20 + k % 7; i++) { attempts.push([call, 1 + (i + k) % 5, 1 + (i * 3 + k) % 7, (i + k) % 3 ? 1 : 0, 0, 0, 0]); call += 7; }
      return { runId: `r${c}_${s}`, arm: 'A3', configIndex: c, seed: s, measurement: { events: [], attempts, resets: [], snapshots: [['tau1499', 1505, []], ['tau2999', 3005, []]] } }; };
    const doc = (configs, seeds, present) => ({ schema: 'h1r.d021b.records/1', id: 'U21', configurations: configs.map(i => ({ index: i, goal: [8, 12, 16, 19][i % 4], edges: [] })), seeds,
      runs: configs.flatMap(c => seeds.filter(s => present(c, s)).map(s => mkRun(c, s))), forkRuns: [] });
    const entOf = (run) => { const cnt = {}; for (const [i, f, t, okk] of run.measurement.attempts) { if (i - 5 < 0 || i - 5 > 299) continue; const key = `${f}->${okk ? t : f}`; cnt[key] = (cnt[key] || 0) + 1; } return entO(Object.keys(cnt).sort().map(key => cnt[key])); };
    const resim = (d, configs, seeds) => { const val = new Map(d.runs.map(r => [`${r.configIndex}|${r.seed}`, entOf(r)])), rng = mul(770002), vs = []; let und = 0;
      for (let it = 0; it < 10000; it++) { const ci = configs.map(() => Math.floor(rng() * configs.length)), sj = seeds.map(() => Math.floor(rng() * seeds.length)), xs = [];
        for (const i of ci) for (const j of sj) { const v = val.get(`${configs[i]}|${seeds[j]}`); if (v !== undefined && v !== null) xs.push(v); }
        if (!xs.length) und++; else vs.push(xs.reduce((a, b) => a + b, 0) / xs.length); }
      vs.sort((a, b) => a - b); return { lower: und ? null : vs[49], upper: und ? null : vs[9949], und }; };
    const close = (a, b) => (a === null && b === null) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-12);
    // (a) 12 × 6 declared universe with an empty configuration row (7): a numeric CI over the FULL grid
    const cA = [...Array(12).keys()], sA = [11, 12, 13, 14, 15, 16], dA = doc(cA, sA, (c) => c !== 7), oA = A.analyzeRecords(dA), gA = oA.descriptive.trajectoryEntropyByArm.A3.W1.ci;
    const eA = resim(dA, cA, sA), eObs = resim(dA, cA.filter(c => c !== 7), sA);
    // (b) 4 × 3 declared universe with an empty row (1) AND an empty seed column (13): replicates without any cell → IR-34c
    const cB = [0, 1, 2, 3], sB = [11, 12, 13], dB = doc(cB, sB, (c, s) => c !== 1 && s !== 13), oB = A.analyzeRecords(dB), gB = oB.descriptive.trajectoryEntropyByArm.A3.W1.ci, eB = resim(dB, cB, sB);
    let refused = false; try { A.analyzeRecords({ ...dB, seeds: [12, 13] }); } catch (e) { refused = /outside the declared universe/.test(e.message); }   // seed 11 has runs but is not declared
    const uni = oB.descriptive.bootstrapUniverse;
    ok('U21', 'I-23 option A (D-026 §3): with a declared 12 × 6 universe and an empty configuration row, the records-level CI equals an independent re-simulation over the COMPLETE grid and differs from the observed-grid one; with an empty row and an empty seed column the undefined-replicate count equals the full-grid oracle\'s and the CI is null (IR-34c); the declared universe (including the empty row and column) is reported; a run outside it refuses the document',
      close(gA.lower, eA.lower) && close(gA.upper, eA.upper) && eA.und === 0 && gA.nUndefinedIterations === 0 && (eObs.lower !== eA.lower || eObs.upper !== eA.upper)
        && gB.lower === null && gB.nUndefinedIterations === eB.und && eB.und > 0 && gB.nDefinedIterations + gB.nUndefinedIterations === 10000
        && JSON.stringify(uni) === JSON.stringify({ configs: cB, seeds: sB, seedsDeclared: true }) && refused,
      `(a) [${gA.lower}, ${gA.upper}] vs full grid [${eA.lower}, ${eA.upper}] (observed grid [${eObs.lower}, ${eObs.upper}]); (b) undefined ${gB.nUndefinedIterations} vs ${eB.und}, CI ${gB.lower}; universe ${JSON.stringify(uni)}; out-of-universe refused ${refused}`);
  });
  return R;
}

// ---------------- synthetic studies (C-1 and C-3 at study level) ----------------
function synthStudy({ id, extensionAvailable = true, pilotDropped = [], heldDropped = [], a7EqualsA2 = false, nHeld = 8 }) {
  const r = mul(4711), noise = () => (r() - 0.5) * 0.2, eff = [30, 20, 15, 18, 21, 22, 40];
  const pd = new Set(pilotDropped.map(([c, s]) => `${c}|${s}`)), hd = new Set(heldDropped.map(([c, s]) => `${c}|${s}`));
  const cellsFor = (configs, seeds, dropSet) => { const out = []; for (const c of configs) for (const s of seeds) { const base = 10 + c * 0.5 + (s % 7) * 0.3, rows = [];
    for (let a = 0; a < 7; a++) { const v = [0, 1, 2, 3, 4].map(() => base + eff[a] + noise()); rows.push([c, s, a, dropSet.has(`${c}|${s}`) && a === 3 ? 0 : 1, ...v, 100 + a, 0, `fp-${c}-${s}-${a === 4 ? 1 : a}`, a]); }
    if (a7EqualsA2) rows[6] = [c, s, 6, rows[6][3], ...rows[1].slice(4, 9), 106, 0, `fp-${c}-${s}-6`, 6];
    out.push(...rows); } return out; };
  const pSeeds = [20260819004, 20260819005, 20260819006, 20260819007, 20260819008], st1 = [0, 1, 2, 3, 4], ext = extensionAvailable ? [5, 6, 7, 8, 9] : [];
  const hSeeds = Array.from({ length: 20 }, (_, i) => 20260819100 + i), hConfigs = Array.from({ length: nHeld }, (_, i) => i);
  const a1Links = [], flipPopulations = [], monotonicity = [];
  for (const c of hConfigs) for (const s of hSeeds) {
    a1Links.push([c, s, 0.2 + 0.6 * r(), 0.1 + 0.6 * r(), 2700, 300, 40, [10, 10, 10, 10], [270, 900, 270, 1260], [30, 100, 30, 140]]);
    flipPopulations.push([c, s, Array.from({ length: 12 }, (_, k) => [50 + k * 200, (r() - 0.3) * 4])]);
    const d = [400, 500, 600, 700, 800].map(x => x + Math.floor(r() * 50)); monotonicity.push([c, s, d, d.map((x, b) => Math.floor(x * (0.005 + 0.004 * b + 0.003 * r())))]);
  }
  return { schema: 'h1r.d021b.study/1', id, arms: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'],
    pilot: { stream: 886000, extensionAvailable, configs: [...st1.map(i => ({ index: i, block: 'stage1' })), ...ext.map(i => ({ index: i, block: 'extension' }))], seeds: pSeeds, cells: cellsFor([...st1, ...ext], pSeeds, pd) },
    heldout: { block: 'heldout', configs: hConfigs.map(i => ({ index: i, goal: [8, 12, 16, 19][i % 4] })), seeds: hSeeds, cells: cellsFor(hConfigs, hSeeds, hd), a1Links, flipPopulations, monotonicity } };
}

// ---------------- full battery ----------------
async function main() {
  const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_analysis');
  fs.mkdirSync(EVID, { recursive: true });
  const AN = path.join(HERE, 'analyze.js'), PKG = path.join(REPO, 'research', 'preregistrations', 'h1r_d021b'), FX = FXDIR;
  const G = []; const ok = (id, name, cond, ev) => G.push({ id, name, status: cond ? 'PASS' : 'FAIL', evidence: ev });
  const t0 = Date.now();   // battery timing only (analyze.js itself reads no clock)
  const A = await import(pathToFileURL(AN).href);
  // the two full fixture runs start now, in separate processes, while the in-process checks run
  const runOnce = (name) => new Promise((resolve, reject) => { const f = path.join(EVID, name), ch = spawn(process.execPath, [AN, FX, f], { stdio: ['ignore', 'ignore', 'pipe'] }); let err = '';
    ch.stderr.on('data', d => { err += d; }); ch.on('close', code => code === 0 ? resolve(fs.readFileSync(f, 'utf8')) : reject(new Error(`analyze.js exited ${code}: ${err.slice(0, 500)}`))); });
  const fixtureRuns = Promise.all([runOnce('analysis_output.json'), runOnce('analysis_output.rerun.json')]);
  // unit checks
  for (const u of await unitChecks(AN)) G.push(u);
  // purity: no hidden randomness, clock, network or child process beyond the pinned git blob read
  { // comments removed (block, then line), then string literals blanked: seed and child-process sites are counted in code only
    const src = fs.readFileSync(AN, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), code = src.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''");
    const banned = ['Math.random', 'Date.now', 'new Date', 'performance.now', 'process.hrtime', 'randomBytes', 'randomUUID', 'getRandomValues', 'randomInt', "from 'node:http'", "from 'node:https'", "from 'node:net'", 'fetch(', 'setTimeout', 'setInterval', 'PENDING:'].filter(b => src.includes(b));
    const seeds = ['makeRng(770001)', 'makeRng(770002)', 'makeRng(770003)', 'makeRng(770004)'].every(s => code.split(s).length === 2);
    const git = (code.match(/execFileSync\(/g) || []).length;
    ok('P1', 'no hidden randomness or clock in analyze.js (no Math.random, Date, performance, hrtime, crypto randomness, timers, network) and no PENDING marker; random numbers only from makeRng, each analysis seed (770001 power, 770002 bootstrap, 770003 permutation, 770004 link-④ sample) created at exactly one site; one child process (git cat-file of the pinned B2 blob)',
      banned.length === 0 && seeds && git === 1, `banned constructs found: ${banned.join(', ') || 'none'}; seeds each at one site ${seeds}; child-process calls ${git}`); }
  // protocol and package unchanged
  { const v1 = sha(fs.readFileSync(path.join(REPO, 'research', 'preregistrations', 'H1R_PREREGISTRATION_v1.0.md')));
    const pk = sha(fs.readFileSync(path.join(PKG, 'GEMINI_PACKAGE.md')));
    const man = JSON.parse(fs.readFileSync(path.join(FX, 'FIXTURES.sha256.json'), 'utf8'));
    const fxOk = Object.entries(man).every(([f, h]) => sha(fs.readFileSync(path.join(FX, f), 'utf8')) === h);
    // tracked modifications may exist (the milestone under verification); none may touch a protected path
    const tracked = execFileSync('git', ['-C', REPO, 'status', '--porcelain', '--untracked-files=no']).toString('utf8').split('\n').filter(Boolean).map(l => l.slice(3));
    const PROTECTED = [/^research\/preregistrations\//, /^research\/cognitive-audit\//, /^experiments\/registry\//, /^experiments\/m7\//, /^render\//, /^instrumentation\//, /^main\.js$/, /^\.gitattributes$/,
      /^experiments\/h1r\/(run_h1r|measure|measure_install|runtime|shadow|env_seed|build_tree|conformance_transform|run_one)\.mjs$/];
    const touched = tracked.filter(p => PROTECTED.some(r => r.test(p)));
    ok('D1', 'no protocol, package, instrument or registry drift: v1.0 c52e7337…a836; GEMINI_PACKAGE.md 65500dde…; all 18 fixtures match FIXTURES.sha256.json; no tracked modification under a protected path (pre-registrations and package, M7 documents, registry, B2 runtime, H1-R instrument)',
      v1 === 'c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836' && pk === '65500ddef1a7f35070854447309b5065021e6e7d0437511a64092b26e6e944c4' && fxOk && touched.length === 0,
      `v1.0 ${v1.slice(0, 12)}…; package ${pk.slice(0, 12)}…; fixtures ${fxOk}; tracked modifications ${tracked.length} (${tracked.join(', ') || 'none'}); protected touched ${touched.length}`); }
  // fixture regeneration (the pre-registered generator reproduces the committed fixtures)
  { const out = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import fs from 'node:fs'; import crypto from 'node:crypto'; const cap = new Map(); const BS = String.fromCharCode(92);
      fs.writeFileSync = (p, d) => cap.set(String(p).split(BS).join('/').split('/').pop(), String(d)); fs.mkdirSync = () => {};
      const log = console.log; console.log = () => {};
      await import(${JSON.stringify(pathToFileURL(path.join(PKG, 'make_fixtures.mjs')).href)});
      const man = JSON.parse(cap.get('FIXTURES.sha256.json'));
      log(JSON.stringify({ n: cap.size, same: Object.entries(man).filter(([f, h]) => crypto.createHash('sha256').update(cap.get(f)).digest('hex') === h && cap.get(f) === fs.readFileSync(${JSON.stringify(FX)} + '/' + f, 'utf8')).length, total: Object.keys(man).length }));`], { maxBuffer: 1 << 28 }).toString('utf8');
    const r = JSON.parse(out.trim().split('\n').pop());
    ok('D2', 'the pre-registered generator regenerates all 18 fixtures byte for byte (fixture count 18)', r.total === 18 && r.same === 18, JSON.stringify(r)); }
  // R7: synthetic studies — C-1 at study level, and C-3 full-grid bootstrap indexing on the held-out array
  { const P0 = 20260819004, sd = (cs) => cs.map(c => [c, P0]);
    const fullGridF1 = (fx, sOut) => { const S = sOut.stage2.seedsUsed, seeds = fx.heldout.seeds.slice().sort((a, b) => a - b).slice(0, S), cfgs = fx.heldout.configs.map(c => c.index).sort((a, b) => a - b);
      const drop = new Set(sOut.stage2.droppedPairs.map(([c, s]) => `${c}|${s}`)), L = new Map(fx.heldout.a1Links.map(r => [`${r[0]}|${r[1]}`, r[2]]));
      const rng = mul(770002), vs = []; let und = 0;
      for (let it = 0; it < 10000; it++) { const ci = cfgs.map(() => Math.floor(rng() * cfgs.length)), sj = seeds.map(() => Math.floor(rng() * seeds.length)), xs = [];
        for (const i of ci) for (const j of sj) { const k = `${cfgs[i]}|${seeds[j]}`; if (!drop.has(k) && L.get(k) !== null) xs.push(L.get(k)); }
        if (!xs.length) und++; else vs.push(xs.reduce((a, b) => a + b, 0) / xs.length); }
      vs.sort((a, b) => a - b); return { lower: und ? null : vs[49], upper: und ? null : vs[9949], und }; };
    const studies = {
      emptyRow: synthStudy({ id: 'X1', pilotDropped: sd([0, 1, 2, 3]), heldDropped: [[3, 20260819100], [3, 20260819101]] }),
      emptyRowAndColumn: synthStudy({ id: 'X2', pilotDropped: sd([0, 1, 2, 3]), heldDropped: [[3, 20260819100], ...Array.from({ length: 8 }, (_, c) => [c, 20260819101])] }),
      voidAfterExtension: synthStudy({ id: 'X3', pilotDropped: sd([0, 1, 2, 3, 5, 6, 7, 8, 9]) }),
      haltNoExtension: synthStudy({ id: 'X4', extensionAvailable: false, pilotDropped: sd([0, 1, 2, 3]) }),
      voidContainsZero: synthStudy({ id: 'X5', a7EqualsA2: true }),
    };
    const out = Object.fromEntries(Object.entries(studies).map(([k, fx]) => [k, A.analyzeStudy(fx)]));
    const o1 = out.emptyRow, o2 = out.emptyRowAndColumn, e1 = fullGridF1(studies.emptyRow, o1), e2 = fullGridF1(studies.emptyRowAndColumn, o2);
    const f = (o) => o.stage1.F11;
    const c1 = f(o1).outcome === 'PROCEED' && f(o1).extensionTaken === true && f(o1).fires === false && f(o1).initial.W1.computable === false && o1.stage1.power.Sstar === 2
      && f(out.voidAfterExtension).outcome === 'VOID' && f(out.voidAfterExtension).fires === true && f(out.voidAfterExtension).extensionTaken === true && out.voidAfterExtension.verdict === 'VOID' && out.voidAfterExtension.stage2 === null
      && f(out.haltNoExtension).outcome === 'HALT' && f(out.haltNoExtension).fires === false && f(out.haltNoExtension).extensionUnavailable === true && out.haltNoExtension.verdict === 'HALT' && out.haltNoExtension.stage2 === null
      && f(out.voidContainsZero).outcome === 'VOID' && f(out.voidContainsZero).fires === true && f(out.voidContainsZero).initial.W1.computable === true && out.voidContainsZero.verdict === 'VOID';
    ok('R7a', 'C-1 at study level (synthetic studies): initial F-11 non-computable → the extension runs → PROCEED with fires = false; non-computable after the extension → fires = true, VOID, no Stage 2; extension unavailable → fires = false, HALT, no Stage 2; CI containing 0 in both windows before and after the extension → fires = true, VOID',
      c1, JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, o]) => [k, { outcome: f(o).outcome, fires: f(o).fires, ext: f(o).extensionTaken, unavailable: f(o).extensionUnavailable, verdict: o.verdict }]))));
    const g1 = o1.stage2.rowsRemoved.includes(3) && o1.stage2.F.F1.ci.lower === e1.lower && o1.stage2.F.F1.ci.upper === e1.upper && e1.und === 0 && e1.lower !== null
      && o2.stage2.F.F1.ci.nUndefinedIterations === e2.und && e2.und > 0 && o2.stage2.F.F1.ci.lower === null && o2.stage2.F.F1.fires === true && o2.stage2.F.F4.fires === true && o2.stage2.family.A1vA2.W1.computable === false;
    ok('R7b', 'C-3 (G1) at study level: with an empty held-out configuration row the F-1 bootstrap CI equals an independent re-simulation over the complete grid (the empty row stays drawable); with an empty row and an empty seed column the undefined-replicate count equals the re-simulation\'s, the CI is null and F-1 fires (PR-2); the §12 family is non-computable and F-4 fires (PR-1)',
      g1, `empty row: [${o1.stage2.F.F1.ci.lower}, ${o1.stage2.F.F1.ci.upper}] vs [${e1.lower}, ${e1.upper}]; row and column: undefined ${o2.stage2.F.F1.ci.nUndefinedIterations} vs ${e2.und}, F-1 ${o2.stage2.F.F1.fires}, F-4 ${o2.stage2.F.F4.fires}`); }
  // the two fixture runs (separate processes): determinism and the output contract
  const [o1, o2] = await fixtureRuns;
  ok('R1', 'deterministic: two independent processes produce byte-identical output on all 18 fixtures', o1 === o2, `SHA-256 ${sha(o1)} / ${sha(o2)}`);
  const doc = JSON.parse(o1);
  const sch = schemaCheck(doc);
  ok('R2', 'output contract h1r.d021b.output/1 (GEMINI_INSTRUCTIONS.md §10): every required key and type present for 17 study and 1 record fixtures; criterion fires and F-11 outcomes are booleans and labels; values are numbers, booleans, null or the encoded non-finite strings',
    sch.length === 0 && Object.keys(doc.study).length === 17 && Object.keys(doc.records).length === 1, sch.slice(0, 10).join(' | ') || 'no violations');
  { const body = JSON.stringify({ study: doc.study, records: doc.records }), n = (body.match(/PENDING/g) || []).length;
    ok('R2b', 'no PENDING marker anywhere in the study or records output (D-024, D-025 close every pending point)', n === 0, `PENDING occurrences ${n}`); }
  // independent re-derivations on the fixture outputs
  { const fx = fixture('S01.json'), s = doc.study.S01, S = s.stage2.seedsUsed;
    const pop = new Map(fx.heldout.flipPopulations.map(r => [`${r[0]}|${r[1]}`, r[2]])), seeds = fx.heldout.seeds.slice(0, S);
    const rng = mul(770004), sample = [];
    for (let c = 0; c < 30; c++) for (const sd of seeds) { const p = pop.get(`${c}|${sd}`).slice(); for (let i = p.length - 1; i >= 1; i--) { const j = Math.floor(rng() * (i + 1)); const x = p[i]; p[i] = p[j]; p[j] = x; } for (const [t] of p.slice(0, 10)) sample.push([c, sd, t]); }
    ok('R3', 'F-3 sample (S01): equals an independent re-derivation (makeRng(770004), Fisher–Yates of each run\'s t-sorted population, runs in (configuration, seed) order, first 10 kept)',
      JSON.stringify(sample) === JSON.stringify(s.stage2.F.F3.sample), `${sample.length} sampled decisions`); }
  { const fx = fixture('M01.json'), m1 = fx.runs.find(r => r.runId === 'm1'), out = doc.records.M01.runs.m1, arb = loadArb();
    const groups = new Map(m1.measurement.step0.map(g => [g[0], g])); const flips = [], d = [0, 0, 0, 0, 0], fl = [0, 0, 0, 0, 0];
    for (let i = 5; i <= 3004; i++) { if (m1.measurement.ticks[i] !== 'D') continue; const g = groups.get(i);
      const w0 = g[2].map(([k, F, t, ret, w, ap, a, u, e, sl]) => ({ k, w, ax: Math.abs(t) / 12, x: ap ? Math.max(-400, Math.min(400, F - t)) * 0.60 + arb({ rewardScore: a[0], semanticScore: a[1], confidenceScore: a[2] - t, uncertaintyScore: u, curiosityScore: a[3], costScore: a[4], executiveWeights: { wReward: e[0], wSemantic: e[1], wConfidence: e[2], wUncertainty: e[3], wCuriosity: e[4], wCost: e[5] }, drift: 0, isSelfLoop: sl === 1 }) * 0.40 : Math.max(-400, Math.min(400, F - t)) }));
      let a1 = null, b1 = -Infinity, a0 = null, b0 = -Infinity, mx = -1; for (const c of w0) { if (c.w > b1) { b1 = c.w; a1 = c.k; } if (c.x > b0) { b0 = c.x; a0 = c.k; } mx = Math.max(mx, c.ax); }
      const bin = Math.min(4, Math.floor(10 * mx)); d[bin]++; if (a1 !== a0) { flips.push(i - 5); fl[bin]++; } }
    ok('R4', 'link ③ (M01 run m1): flips and PR-4 monotonicity bins equal an independent re-derivation (shadow weights from the B2 arbitrate, first-maximum argmax₁ and argmax₀ in insertion order, x = max |t|/12)',
      JSON.stringify(flips) === JSON.stringify(out.link3.flipTaus) && JSON.stringify({ decisions: d, flips: fl }) === JSON.stringify(out.link3.monotonicity), `${flips.length} flips re-derived; analyze.js ${out.link3.flipTaus.length}; bins ${JSON.stringify(out.link3.monotonicity)}`); }
  // R5: PR-4 mandatory fields on every A1 run record
  { const bad = [];
    for (const [rid, m] of Object.entries(doc.records.M01.runs)) { if (!m.link3) continue; const mo = m.link3.monotonicity;
      const okShape = mo && JSON.stringify(Object.keys(mo)) === JSON.stringify(['decisions', 'flips']) && [mo.decisions, mo.flips].every(a => Array.isArray(a) && a.length === 5 && a.every(x => Number.isInteger(x) && x >= 0));
      if (!okShape || mo.decisions.reduce((a, b) => a + b, 0) !== m.link3.decisionTicks || mo.flips.reduce((a, b) => a + b, 0) !== m.link3.flips || mo.flips.some((x, b) => x > mo.decisions[b])) bad.push(rid); }
    const nA1 = Object.values(doc.records.M01.runs).filter(m => m.link3).length;
    ok('R5', 'PR-4 mandatory output: every A1 run record carries link3.monotonicity = { decisions: [int × 5], flips: [int × 5] } (exactly these keys), the bins sum to decisionTicks and flips, and flips ≤ decisions per bin; non-A1 runs carry link3 = null',
      bad.length === 0 && nA1 === 5 && Object.values(doc.records.M01.runs).filter(m => !m.link3).every(m => m.link3 === null), `A1 runs ${nA1}; violations ${bad.join(',') || 'none'}`); }
  // R6: PR-4 at study level (S01): pooled bins, ρ and the full-grid bootstrap CI, re-derived independently
  { const fx = fixture('S01.json'), s = doc.study.S01, S = s.stage2.seedsUsed, seeds = fx.heldout.seeds.slice().sort((a, b) => a - b).slice(0, S), cfgs = fx.heldout.configs.map(c => c.index).sort((a, b) => a - b);
    const drop = new Set(s.stage2.droppedPairs.map(([c, sd]) => `${c}|${sd}`)), MO = new Map(fx.heldout.monotonicity.map(r => [`${r[0]}|${r[1]}`, r]));
    const rhoOf = (rows) => { const d = [0, 0, 0, 0, 0], f = [0, 0, 0, 0, 0]; for (const r of rows) for (let b = 0; b < 5; b++) { d[b] += r[2][b]; f[b] += r[3][b]; } if (d.some(x => x === 0)) return { d, f, rho: null }; return { d, f, rho: spearO([0, 1, 2, 3, 4], d.map((x, b) => f[b] / x)) }; };
    const pt = rhoOf(cfgs.flatMap(c => seeds.filter(sd => !drop.has(`${c}|${sd}`)).map(sd => MO.get(`${c}|${sd}`))));
    const rng = mul(770002), vs = []; let und = 0;
    for (let it = 0; it < 10000; it++) { const ci = cfgs.map(() => Math.floor(rng() * cfgs.length)), sj = seeds.map(() => Math.floor(rng() * seeds.length)), rows = [];
      for (const i of ci) for (const j of sj) { const k = `${cfgs[i]}|${seeds[j]}`; if (!drop.has(k)) rows.push(MO.get(k)); }
      const v = rows.length ? rhoOf(rows).rho : null; if (v === null) und++; else vs.push(v); }
    vs.sort((a, b) => a - b); const m = s.descriptive.monotonicity, lo = und ? null : vs[49], hi = und ? null : vs[9949];
    const close = (a, b) => (a === null && b === null) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-12);
    ok('R6', 'PR-4 at study level (S01): pooled Σdecisions and Σflips per bin over the valid Stage-2 A1 cells, ρ of bin index vs rate, and the §12 bootstrap CI over the complete grid equal an independent re-derivation (mid-rank oracle Spearman; undefined replicates counted)',
      JSON.stringify(m.decisions) === JSON.stringify(pt.d) && JSON.stringify(m.flips) === JSON.stringify(pt.f) && close(m.rho, pt.rho) && close(m.ci.lower, lo) && close(m.ci.upper, hi) && m.ci.nUndefinedIterations === und,
      `ρ ${m.rho} vs ${pt.rho}; CI [${m.ci.lower}, ${m.ci.upper}] vs [${lo}, ${hi}]; undefined ${m.ci.nUndefinedIterations} vs ${und}`); }
  // R8: PR-5 on M01 — the makeRng(770003) stream over the A1 runs, re-derived independently from the raw records
  { const fx = fixture('M01.json'), a1 = fx.runs.filter(r => r.arm === 'A1').sort((x, y) => x.configIndex - y.configIndex || x.seed - y.seed), rng = mul(770003); let bad = 0, n = 0;
    for (const run of a1) { const cfg = fx.configurations.find(c => c.index === run.configIndex);
      for (const [label, ph] of [['tau1499', 0], ['tau2999', 1]]) {
        const ks = run.measurement.snapshots.find(s => s[0] === label)[2].filter(e => e[3] >= 5).map(([key, a, s]) => { const [u, v] = key.split('->').map(Number), e = cfg.edges.find(x => (x.from === u && x.to === v) || (x.from === v && x.to === u)); return { u, v, t: (s + 1) / (a + 2), p: ph ? e.pPhaseII : e.pPhaseI }; }).sort((x, y) => x.u - y.u || x.v - y.v);
        const xs = ks.map(k => k.t), ys = ks.map(k => k.p), out = doc.records.M01.runs[run.runId].descriptive.permutationNull[label], obs = spearO(xs, ys);
        if (obs === null) { if (out.p !== null || out.nShuffles !== 0) bad++; continue; }
        const rs = []; let ge = 0;
        for (let k = 0; k < 10000; k++) { const yp = ys.slice(); for (let i = yp.length - 1; i >= 1; i--) { const j = Math.floor(rng() * (i + 1)); [yp[i], yp[j]] = [yp[j], yp[i]]; } const r = spearO(xs, yp); rs.push(r); if (Math.abs(r) >= Math.abs(obs)) ge++; }
        rs.sort((a, b) => a - b); n++;
        if (Math.abs(out.rho - obs) > 1e-12 || out.p !== (1 + ge) / 10001 || Math.abs(out.percentile99 - rs[9899]) > 1e-12) bad++; } }
    ok('R8', 'PR-5 on M01: per-run permutation p-values and 99th percentiles of the 5 A1 runs equal an independent re-derivation from the raw records (one makeRng(770003) over runs in (configIndex, seed) order, τ 1499 then 2999; keys by (from, to); mid-rank oracle Spearman)',
      bad === 0 && n > 0, `snapshots tested ${n}; mismatches ${bad}`); }
  // fixture coverage (branches actually reached by the pre-registered fixtures)
  const cov = coverage(doc);
  fs.writeFileSync(path.join(EVID, 'fixture_coverage.json'), JSON.stringify(cov, null, 1));
  G.push({ id: 'C1', name: 'fixture coverage: branches reached by the 18 pre-registered fixtures (branches not reached are covered by U4, U6, U7, U8, U10–U15 and R7)', status: 'INFO', evidence: JSON.stringify(cov.reached) + ' | not reached by fixtures: ' + cov.notReached.join(', ') });
  // mutation anti-vacuity: each deliberate defect must be caught by the unit checks (child processes, in parallel)
  const MUT = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r', 'analyze-mutants'); fs.mkdirSync(MUT, { recursive: true });
  const srcA = fs.readFileSync(AN, 'utf8'), REPO_LINE = "const REPO = path.resolve(HERE, '..', '..');";
  if (srcA.split(REPO_LINE).length !== 2) throw new Error('REPO anchor missing in analyze.js');
  const place = (src) => src.replace(REPO_LINE, `const REPO = ${JSON.stringify(REPO)};`);   // copies in the temp directory still read the pinned blob from this repository
  const jobs = [['control (unmutated copy)', null, null], ...MUTANTS];
  const runChild = (file) => new Promise((resolve) => { const ch = spawn(process.execPath, [fileURLToPath(import.meta.url), '--unit', file], { stdio: ['ignore', 'pipe', 'pipe'] }); let out = '';
    ch.stdout.on('data', d => { out += d; }); ch.on('close', () => { const line = out.split('\n').find(l => l.startsWith('@@UNIT@@')); resolve(line ? JSON.parse(line.slice(8)) : null); }); });
  const results = new Array(jobs.length); let next = 0;
  const worker = async () => { while (next < jobs.length) { const k = next++, [id, from, to] = jobs[k];
    if (from !== null && srcA.split(from).length !== 2) { results[k] = [id, 'ANCHOR MISSING']; continue; }
    const f = path.join(MUT, `analyze_${k}.js`); fs.writeFileSync(f, place(from === null ? srcA : srcA.replace(from, to)));
    const r = await runChild(f); results[k] = [id, r === null ? 'THREW' : (r.filter(x => x.status === 'FAIL').map(x => x.id).join('+') || (from === null ? 'ALL PASS' : 'NOT CAUGHT'))]; } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(6, os.cpus().length - 2)) }, worker));
  const control = results[0], mres = results.slice(1);
  ok('M0', 'mutation harness control: an unmutated copy of analyze.js in the mutant directory passes every unit check', control[1] === 'ALL PASS', `${control[0]}: ${control[1]}`);
  ok('M1', `mutation anti-vacuity: each of ${MUTANTS.length} deliberate defects is caught by the unit checks (15 earlier: Holm, ν, CI level, order statistics, bootstrap seed, IR-34c, IR-12, IR-03b, Box–Muller ×2, power RNG reset, Fisher–Yates, degenerate p, MS_CS, Spearman ties; ${MUTANTS.length - 16} for D-024/D-025; 1 for D-026)`,
    mres.every(([, c]) => c !== 'NOT CAUGHT' && c !== 'ANCHOR MISSING' && c !== 'THREW'), mres.map(([i, c]) => `${i}:${c}`).join(' '));
  const summary = { generatedBy: 'experiments/h1r/verify_analysis.mjs', analyzeSha256: sha(fs.readFileSync(AN)), outputSha256: sha(o1), seconds: Math.round((Date.now() - t0) / 1000), gates: G, mutation: results };
  fs.writeFileSync(path.join(EVID, 'analysis_gates.json'), JSON.stringify(summary, null, 1));
  for (const g of G) console.log(`${g.status.padEnd(5)} ${g.id.padEnd(4)} ${g.name}\n      ${g.evidence}`);
  const fails = G.filter(g => g.status === 'FAIL').length;
  console.log(`\n${G.filter(g => g.status === 'PASS').length} PASS, ${fails} FAIL, ${G.filter(g => g.status === 'INFO').length} INFO — ${summary.seconds} s`);
  process.exitCode = fails ? 1 : 0;
}

const MUTANTS = [
  ['holm', 'Math.min(1, (HOLM_FAMILY + 1 - (j + 1)) * p)', 'Math.min(1, (HOLM_FAMILY - (j + 1)) * p)'],
  ['nu', 'const nu = Math.min(C - 1, S - 1), q', 'const nu = Math.max(C - 1, S - 1), q'],
  ['ciLevel', 'q = tCritical(ALPHA, nu);', 'q = tCritical(0.05, nu);'],
  ['orderStat', 'lower: vals[49], upper: vals[9949]', 'lower: vals[50], upper: vals[9950]'],
  ['bootSeed', 'const rng = makeRng(770002)', 'const rng = makeRng(770003)'],
  ['ir34c', 'if (undef > 0) return {', 'if (undef > 9999) return {'],
  ['ir12', "if (sxx === 0 || syy === 0) return { rho: null, reason: 'zeroVariance' };", "if (sxx === 0 || syy === 0) return { rho: 0, reason: null };"],
  ['ir03b', 'const thr = 0.5 * R.W2;', 'const thr = Math.max(0, 0.5 * R.W2);'],
  ['bmSine', '* Math.cos(2 * Math.PI * u2); }', '* Math.sin(2 * Math.PI * u2); }'],
  ['bmRedraw', 'let u1 = rng(); while (u1 === 0) u1 = rng();', 'let u1 = rng();'],
  ['powerReset', 'for (let S = 2; S <= 20; S++) {\n      const rng = makeRng(770001); let rej = 0;', 'const rng = makeRng(770001);\n    for (let S = 2; S <= 20; S++) {\n      let rej = 0;'],
  ['fisherYates', 'const j = Math.floor(rng() * (i + 1));', 'const j = Math.floor(rng() * i);'],
  ['degenerate', 'p = dbar === 0 ? 1 : 0; }', 'p = dbar === 0 ? 0 : 1; }'],
  ['msCS', 'const MS_CS = sum(res) / ((C - 1) * (S - 1));', 'const MS_CS = sum(res) / (C * S);'],
  ['ranks', 'const avg = (i + j) / 2 + 1;', 'const avg = i + 1;'],
  // D-024 / D-025
  ['pr4Bin', 'export function monoBin(x) { return Math.min(4, Math.floor(10 * x)); }', 'export function monoBin(x) { return Math.min(4, Math.round(10 * x)); }'],
  ['pr4Max', 'for (const c of cands) if (c.x > x) x = c.x;', 'for (const c of cands) if (x === -Infinity || c.x < x) x = c.x;'],
  ['pr4Empty', 'if (decisions.some(d => d === 0)) return', 'if (decisions.some(d => d < 0)) return'],
  ['c1Halt', "return { extensionTaken: false, extensionUnavailable: true, final: null, fires: false, outcome: 'HALT' };", "return { extensionTaken: false, extensionUnavailable: true, final: null, fires: true, outcome: 'HALT' };"],
  ['c1ExtFirst', 'if (computable(initial) && !bothContain(initial)) return', "if (!computable(initial)) return { extensionTaken: false, extensionUnavailable: false, final: null, fires: true, outcome: 'VOID' }; if (computable(initial) && !bothContain(initial)) return"],
  ['c1FinalNC', 'if (!computable(fin) || bothContain(fin)) return', 'if (bothContain(fin)) return'],
  ['pr2', 'return m === null || m < 0.30 || ci.lower === null || (ci.lower <= 0 && 0 <= ci.upper);', 'return m === null || m < 0.30 || (ci.lower !== null && ci.lower <= 0 && 0 <= ci.upper);'],
  ['pr1CI', 'return (!pair.W1.computable || !pair.W3.computable) ? true :', 'return (!pair.W1.computable || !pair.W3.computable) ? false :'],
  ['pr1F10', "if (Hbar === null) return { Pbar, Hbar, ratio: null, notAssessable: false, fires: true };", "if (Hbar === null) return { Pbar, Hbar, ratio: null, notAssessable: false, fires: false };"],
  ['g3', 'return { configs: configs.slice().sort((a, b) => a - b), seeds', 'return { configs: configs.filter(c => seeds.some(s => !d.has(`${c}|${s}`))).sort((a, b) => a - b), seeds'],
  ['bootShared', 'const rng = makeRng(770002), C = configs.length', 'const rng = (globalThis.__h1rBootRng ||= makeRng(770002)), C = configs.length'],
  ['prattZeros', 'const r = averageRanks(ds.map(Math.abs)); let Tplus', 'const r = (() => { const nz = ds.map(Math.abs).filter(x => x !== 0), rr = averageRanks(nz); let k = 0; return ds.map(x => x !== 0 ? rr[k++] : 0); })(); let Tplus'],
  ['wilcoxonOneSided', 'if (Math.abs(2 * k - M) >= obs) p += dist[k];', 'if (2 * k - M >= obs) p += dist[k];'],
  ['rbDenominator', 'r: (Tplus + Tminus) === 0 ? null : (Tplus - Tminus) / (Tplus + Tminus)', 'r: (Tplus + Tminus) === 0 ? null : (Tplus - Tminus) / (ds.length * (ds.length + 1) / 2)'],
  ['kmCapLag', "if (call > start) out.push({ length: call - start, event: false, end: 'cap' }); start = call;", "out.push({ length: call - start + 1, event: false, end: 'cap' }); start = call + 1;"],
  ['kmStrict', 'if (S <= 0.5) return t;', 'if (S < 0.5) return t;'],
  ['medianLower', 'return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;', 'return n % 2 ? v[(n - 1) / 2] : v[n / 2 - 1];'],
  ['permSeed', 'const rng = makeRng(770003), out = [];', 'const rng = makeRng(770002), out = [];'],
  ['permUndefinedDraws', "if (obs.rho === null) { r[label] = { rho: null, p: null, percentile99: null, nShuffles: 0 }; continue; }", "if (obs.rho === null) { for (let k = 0; k < B_PERM; k++) fisherYates(ys, rng); r[label] = { rho: null, p: null, percentile99: null, nShuffles: 0 }; continue; }"],
  ['permPercentile', 'percentile99: rs[9899]', 'percentile99: rs[9900]'],
  ['permAbs', 'rs.push(rho);', 'rs.push(Math.abs(rho));'],
  ['permChained', 'const rho = spearman(xs, fisherYates(ys, rng)).rho;', 'const yp = fisherYates(ys, rng); ys.splice(0, ys.length, ...yp); const rho = spearman(xs, yp).rho;'],
  ['sattNu', 'const nu = den * den / (t.MS_C * t.MS_C / (t.C - 1) + t.MS_S * t.MS_S / (t.S - 1));', 'const nu = den * den / (t.MS_C * t.MS_C / t.C + t.MS_S * t.MS_S / t.S);'],
  ['stirling', '- 1 / (360 * z * z2)', '+ 1 / (360 * z * z2)'],
  ['brierBase', 'base = (succ + 1) / (n + 2);', 'base = (succ + ok + 1) / (n + 3);'],
  ['link1A4', "const frozen = arm === 'A4';", 'const frozen = false;'],
  ['trustBin', 'export function trustBin(x) { return Math.min(9, Math.floor(10 * x)); }', 'export function trustBin(x) { return Math.min(9, Math.ceil(10 * x)); }'],
  ['coverageDenominator', 'const attempted = snap[0][2].filter(e => e[3] >= 1)', 'const attempted = snap[0][2].filter(e => e[3] >= 0)'],
  ['trajectorySlip', 'const k = `${from}->${ok === 1 ? to : from}`;', 'const k = `${from}->${to}`;'],
  ['partialMin', "if (xs.length < 4) return { r: null, n: xs.length, reason: 'fewerThan4Keys' };", "if (xs.length < 3) return { r: null, n: xs.length, reason: 'fewerThan4Keys' };"],
  ['undirectedQualify', 'if ((e1 ? e1[3] : 0) + (e2 ? e2[3] : 0) < 5) continue;', 'if ((e1 ? e1[3] : 0) + (e2 ? e2[3] : 0) <= 5) continue;'],
  ['calibrationMeanP', 'st[b] += k.trust; sp[b] += k.p;', 'st[b] += k.trust; sp[b] += k.trust;'],
  ['windowIdentity', 'return Object.fromEntries(WINDOWS.map(W => [W, same(inWin(eventsA5, W), inWin(eventsA2, W))]));', 'return Object.fromEntries(WINDOWS.map(W => [W, same(eventsA5, eventsA2)]));'],
  // D-026 §3 (I-23 option A)
  ['i23ObservedGrid', 'return { configs: configs.sort((a, b) => a - b), seeds: seeds.sort((a, b) => a - b), seedsDeclared: declared };', 'return { configs: [...new Set(fx.runs.map(r => r.configIndex))].sort((a, b) => a - b), seeds: [...new Set(fx.runs.map(r => r.seed))].sort((a, b) => a - b), seedsDeclared: declared };'],
];

function schemaCheck(doc) {
  const v = [], num = (x) => typeof x === 'number' || x === null || ['Infinity', '-Infinity', 'NaN'].includes(x);
  const bool = (x) => typeof x === 'boolean';
  const need = (o, keys, where) => { if (!o || typeof o !== 'object') { v.push(`${where}: missing`); return false; } for (const k of keys) if (!(k in o)) v.push(`${where}.${k}: missing`); return true; };
  if (doc.schema !== 'h1r.d021b.output/1') v.push('schema');
  need(doc, ['schema', 'implementation', 'study', 'records'], 'doc');
  const CIK = ['computable', 'C', 'S', 'nu', 'dbar', 'se', 'lower', 'upper', 'containsZero'];
  const checkCI = (c, w) => { if (need(c, CIK, w)) { for (const k of ['dbar', 'se', 'lower', 'upper']) if (!num(c[k])) v.push(`${w}.${k}: type`); if (typeof c.computable !== 'boolean') v.push(`${w}.computable: type`); } };
  for (const [id, s] of Object.entries(doc.study)) {
    need(s, ['stage1', 'stage2', 'verdict', 'descriptive'], id); need(s.stage1, ['droppedPairs', 'F11', 'power'], `${id}.stage1`);
    need(s.stage1.F11, ['initial', 'extensionTaken', 'extensionUnavailable', 'final', 'fires', 'outcome'], `${id}.F11`);
    if (!bool(s.stage1.F11.fires) || !['PROCEED', 'VOID', 'HALT'].includes(s.stage1.F11.outcome)) v.push(`${id}.F11: fires/outcome`);
    for (const W of ['W1', 'W3']) checkCI(s.stage1.F11.initial[W], `${id}.F11.initial.${W}`);
    if (s.stage1.power && typeof s.stage1.power === 'object') { need(s.stage1.power, ['W1', 'W3', 'Sstar', 'underpowered'], `${id}.power`); for (const W of ['W1', 'W3']) { need(s.stage1.power[W], ['muHat', 'sigma2C', 'sigma2S', 'sigma2E', 'power'], `${id}.power.${W}`); if (s.stage1.power[W].power.length !== 19) v.push(`${id}.power.${W}: length`); } }
    if (s.stage2) {
      const z = s.stage2; need(z, ['seedsUsed', 'droppedPairs', 'rowsRemoved', 'family', 'ci', 'F', 'headline', 'verdict'], `${id}.stage2`);
      for (const n of ['A1vA2', 'A1vA5', 'A1vA6']) for (const W of ['W1', 'W3']) { const t = z.family[n][W]; checkCI(t, `${id}.${n}.${W}`); need(t, ['MS_C', 'MS_S', 'tPrime', 'p', 'pAdjusted', 'confirmed'], `${id}.${n}.${W}`); if (typeof t.confirmed !== 'boolean') v.push(`${id}.${n}.${W}.confirmed: type`); }
      for (const n of ['A1mA2', 'A1mA5', 'A1mA6', 'A4mA1', 'A3mA1', 'A7mA2']) for (const W of ['W1', 'W3']) checkCI(z.ci[n][W], `${id}.ci.${n}.${W}`);
      checkCI(z.ci.HL_A2mA1, `${id}.ci.HL`);
      need(z.F.F1, ['rhoMean', 'nDefinedRuns', 'nUndefinedRuns', 'ci', 'fires'], `${id}.F1`); need(z.F.F2, ['FR', 'FRunfiltered', 'flips', 'eligibleTicks', 'fires'], `${id}.F2`);
      need(z.F.F3, ['CA', 'sample', 'nDropped', 'ci', 'fires'], `${id}.F3`); need(z.F.F10, ['Pbar', 'Hbar', 'ratio', 'notAssessable', 'fires'], `${id}.F10`);
      for (const k of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']) if (!bool(z.F[k].fires)) v.push(`${id}.${k}.fires: type`);
      for (const k of ['F1', 'F3']) need(z.F[k].ci, ['statistic', 'lower', 'upper', 'nDefinedIterations', 'nUndefinedIterations'], `${id}.${k}.ci`);
      for (const W of ['W1', 'W3']) { need(z.headline[W], ['fraction', 'ci', 'undefined'], `${id}.headline.${W}`); if (!bool(z.headline[W].undefined)) v.push(`${id}.headline.${W}.undefined: type`); }
      need(z.verdict, ['result', 'strictWindow', 'fired', 'escalation'], `${id}.verdict`);
      if (!['H1-STRICT', 'H1 SUPPORTED', 'NOT SUPPORTED'].includes(z.verdict.result) || z.verdict.result !== s.verdict) v.push(`${id}.verdict: label`);
      need(s.descriptive, ['monotonicity', 'sensitivity', 'rankBiserialConfigurationMeans', 'descriptiveCIs', 'a5EqualsA2PerWindow', 'a5EqualsA2FingerprintCells', 'effectSizes'], `${id}.descriptive`);
    } else if (!['VOID', 'HALT'].includes(s.verdict) || s.verdict !== s.stage1.F11.outcome) v.push(`${id}: no stage 2 but verdict ${s.verdict}`);
  }
  for (const [id, r] of Object.entries(doc.records)) {
    need(r, ['runs', 'forks'], id);
    for (const [rid, m] of Object.entries(r.runs)) { need(m, ['R', 'goalRate', 'R_all', 'halfLife', 'calibration', 'link3', 'descriptive'], `${id}.${rid}`); need(m.halfLife, ['value', 'censored'], `${id}.${rid}.halfLife`);
      for (const k of ['tau1499', 'tau2999']) need(m.calibration[k], ['rho', 'nKeys'], `${id}.${rid}.calibration.${k}`);
      need(m.descriptive, ['link1', 'stepsToGoal', 'trajectoryEntropy'], `${id}.${rid}.descriptive`);
      if (m.link3) { need(m.link3, ['decisionTicks', 'replayTicks', 'flips', 'FR', 'FRunfiltered', 'flipTaus', 'population', 'byWindow', 'monotonicity'], `${id}.${rid}.link3`); need(m.link3.monotonicity, ['decisions', 'flips'], `${id}.${rid}.link3.monotonicity`);
        need(m.descriptive, ['monotonicity', 'brier', 'permutationNull', 'partialRankCorrelation', 'undirectedPooled'], `${id}.${rid}.descriptive`); } }
    for (const [fid, f] of Object.entries(r.forks)) need(f, ['t', 'baseSum', 'forkSum', 'difference'], `${id}.${fid}`);
  }
  return v;
}

function coverage(doc) {
  const reached = {}, add = (k) => { reached[k] = (reached[k] || 0) + 1; };
  for (const s of Object.values(doc.study)) {
    const f = s.stage1.F11; add(`F11 ${f.outcome}${f.extensionTaken ? ' after extension' : ''}`); if (!f.initial.W1.computable) add('F11 initial non-computable');
    if (s.stage1.power && s.stage1.power.Sstar === 2) add('S* = 2'); if (s.stage1.power && s.stage1.power.underpowered) add('S* = 20 under-powered');
    if (!s.stage2) continue; const z = s.stage2;
    for (const n of ['A1vA2', 'A1vA5', 'A1vA6']) for (const W of ['W1', 'W3']) { const t = z.family[n][W]; if (t.se === 0) add('degenerate §12 test'); if (t.computable && t.dbar < 0 && t.p < 0.01) add('significant reversal (not confirmed)'); if (!t.computable) add('non-computable §12 array'); }
    if (z.rowsRemoved.length) add('row rule removed configurations');
    if (z.F.F1.rhoMean === null) add('F-1 statistic undefined'); if (z.F.F3.CA === null) add('F-3 statistic undefined');
    if (z.F.F2.fires === true) add('F-2 fires'); if (z.F.F10.notAssessable === true) add('F-10 not assessable (P̄ ≤ 0)'); if (z.F.F10.fires === true) add('F-10 fires');
    if (z.F.F3.nDropped > 0) add('F-3 samples dropped (fork crashed twice)');
    for (const k of ['F1', 'F3']) { const c = z.F[k].ci; if (c && c.lower === null && c.nUndefinedIterations > 0) add('IR-34c null CI'); }
    if (s.descriptive.monotonicity.rho === null) add('PR-4 study ρ null'); if (s.descriptive.monotonicity.ci.lower === null) add('PR-4 study CI null');
    add(`verdict ${z.verdict.result}`);
  }
  for (const r of Object.values(doc.records)) for (const m of Object.values(r.runs)) {
    if (m.halfLife.value === 0) add('HL = 0'); if (m.halfLife.censored) add('HL censored'); if (m.descriptive.halfLifeThreshold < 0) add('IR-03b negative threshold');
    for (const k of ['tau1499', 'tau2999']) { if (m.descriptive.calibrationUndefinedReason[k] === 'fewerThan3Keys') add('ρ undefined: fewer than 3 keys'); if (m.descriptive.calibrationUndefinedReason[k] === 'zeroVariance') add('IR-12 zero variance'); }
    if (m.descriptive.stepsToGoal.nCap > 0) add('cap episode'); if (m.descriptive.stepsToGoal.median === 'Infinity') add('KM median +∞');
    if (m.descriptive.monotonicity && m.descriptive.monotonicity.reason === 'emptyBin') add('PR-4 run ρ empty bin');
  }
  const all = ['F11 PROCEED', 'F11 PROCEED after extension', 'F11 VOID after extension', 'F11 HALT', 'F11 initial non-computable', 'S* = 2', 'S* = 20 under-powered', 'degenerate §12 test', 'significant reversal (not confirmed)', 'row rule removed configurations',
    'F-1 statistic undefined', 'F-3 statistic undefined', 'F-2 fires', 'F-10 not assessable (P̄ ≤ 0)', 'F-10 fires', 'F-3 samples dropped (fork crashed twice)', 'IR-34c null CI', 'HL = 0', 'HL censored', 'IR-03b negative threshold', 'ρ undefined: fewer than 3 keys', 'IR-12 zero variance', 'non-computable §12 array',
    'PR-4 study ρ null', 'PR-4 study CI null', 'cap episode', 'KM median +∞', 'PR-4 run ρ empty bin'];
  return { reached, notReached: all.filter(k => !(k in reached)) };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked && process.argv[2] === '--unit') { const r = await unitChecks(path.resolve(process.argv[3])); for (const x of r) console.log(`${x.status} ${x.id} ${x.evidence}`); console.log('@@UNIT@@' + JSON.stringify(r.map(x => ({ id: x.id, status: x.status })))); process.exitCode = r.some(x => x.status === 'FAIL') ? 1 : 0; }
else if (invoked) await main();

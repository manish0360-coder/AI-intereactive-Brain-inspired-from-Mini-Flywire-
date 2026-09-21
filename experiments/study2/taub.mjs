// Study-2 analysis primitives — project-owned, dependency-free, implementing the FROZEN design text:
//   §P  Kendall tau-b, numeric-tie convention, undefined tau-b => 0 (primary), m < 2 => excluded
//   §Q  hierarchical aggregation (event -> within-run median -> across-run median)
//   §W  exact bootstrap percentile interval for the median (all n^n resamples; count-vector form)
// Validated against SciPy (tau-b) and brute-force enumeration (bootstrap) by the readiness gate.
// No RNG anywhere.

export const TIE_EPS = 1e-9;                          // §P: precision convention, not a scientific threshold

// sign of (a - b) under the §P conventions: -Infinity sorts below every finite value, two -Infinity tie,
// finite values within TIE_EPS tie. NaN is a programming error, never a score.
export function cmpScore(a, b) {
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('tau-b: NaN score');
  if (a === b) return 0;
  if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= TIE_EPS) return 0;
  return a < b ? -1 : 1;
}

// tau-b exactly as §P writes it. Returns { status, value, n0, n1, n2, nc, nd }.
//   status 'excluded'  : m < 2 (no ranking exists)          value null
//   status 'undefined' : n0 - n1 = 0 or n0 - n2 = 0          value null (primary scoring maps it to 0)
//   status 'ok'        : (nc - nd) / sqrt((n0 - n1)(n0 - n2))
export function tauB(x, y) {
  if (x.length !== y.length) throw new Error('tau-b: length mismatch');
  const m = x.length;
  if (m < 2) return { status: 'excluded', value: null, n0: 0, n1: 0, n2: 0, nc: 0, nd: 0 };
  let nc = 0, nd = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) {
    const sx = cmpScore(x[i], x[j]), sy = cmpScore(y[i], y[j]);
    if (sx === 0) n1++;                                // a pair tied in both counts in BOTH n1 and n2
    if (sy === 0) n2++;
    if (sx !== 0 && sy !== 0) { if (sx === sy) nc++; else nd++; }
  }
  const n0 = m * (m - 1) / 2;
  if (n0 - n1 === 0 || n0 - n2 === 0) return { status: 'undefined', value: null, n0, n1, n2, nc, nd };
  return { status: 'ok', value: (nc - nd) / Math.sqrt((n0 - n1) * (n0 - n2)), n0, n1, n2, nc, nd };
}

// §P primary scoring: undefined tau-b => 0; excluded => null (the event does not enter Delta).
export function primaryTau(x, y) {
  const r = tauB(x, y);
  if (r.status === 'excluded') return null;
  return r.status === 'undefined' ? 0 : r.value;
}

// §O: Delta(e) = tau_b(FULL, U*) - tau_b(GEO, U*). null when the event is excluded (m < 2).
export function deltaEvent(full, geo, oracle) {
  const a = primaryTau(full, oracle), b = primaryTau(geo, oracle);
  return a === null || b === null ? null : a - b;
}

export function median(values) {
  if (!values.length) throw new Error('median of empty set');
  const s = [...values].sort((p, q) => p - q);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

// §W — exact bootstrap percentile interval of the median, by multiset count-vector enumeration.
// Each count vector c (c_i >= 0, sum = n) over the n SORTED run values is one multiset of resamples,
// occurring n!/prod(c_i!) times among the n^n ordered resamples. Positions use exact BigInt arithmetic:
// lower = position floor(0.025 N), upper = position ceil(0.975 N) - 1, N = n^n (0-based, ascending).
export function exactBootstrapMedianCI(values) {
  const n = values.length;
  if (n < 1) throw new Error('bootstrap of empty set');
  const v = [...values].sort((p, q) => p - q);
  const fact = [1n]; for (let i = 1; i <= n; i++) fact[i] = fact[i - 1] * BigInt(i);
  const loIdx = Math.floor((n - 1) / 2), hiIdx = Math.ceil((n - 1) / 2);
  const mass = new Map();                              // resample median -> number of ordered resamples
  const c = new Array(n).fill(0);
  (function place(i, remaining) {
    if (i === n - 1) {
      c[i] = remaining;
      let w = fact[n]; for (const k of c) w /= fact[k];
      // median of the expanded (already sorted) multiset
      let pos = 0, a = null, b = null;
      for (let j = 0; j < n; j++) { const next = pos + c[j]; if (a === null && loIdx < next) a = v[j]; if (b === null && hiIdx < next) { b = v[j]; break; } pos = next; }
      const med = (a + b) / 2;
      mass.set(med, (mass.get(med) || 0n) + w);
      return;
    }
    for (let k = remaining; k >= 0; k--) { c[i] = k; place(i + 1, remaining - k); }
  })(0, n);
  const N = BigInt(n) ** BigInt(n);
  const lowerPos = (N * 25n) / 1000n;                  // floor(0.025 N)
  const upperPos = (N * 975n + 999n) / 1000n - 1n;     // ceil(0.975 N) - 1
  const sorted = [...mass.entries()].sort((p, q) => p[0] - q[0]);
  let cum = 0n, lower = null, upper = null;
  for (const [med, w] of sorted) {
    const next = cum + w;
    if (lower === null && lowerPos < next) lower = med;
    if (upper === null && upperPos < next) { upper = med; break; }
    cum = next;
  }
  let total = 0n; for (const w of mass.values()) total += w;
  if (total !== N) throw new Error('bootstrap mass does not sum to n^n');
  return { lower, upper, excludesZero: lower > 0 || upper < 0, N: N.toString(), distinctMedians: mass.size };
}

// Brute-force reference: every ordered resample listed explicitly. Validation only (n <= 7).
export function bruteBootstrapMedianCI(values) {
  const n = values.length, N = n ** n, meds = new Array(N);
  for (let code = 0; code < N; code++) {
    let x = code; const s = new Array(n);
    for (let i = 0; i < n; i++) { s[i] = values[x % n]; x = Math.floor(x / n); }
    meds[code] = median(s);
  }
  meds.sort((p, q) => p - q);
  const NB = BigInt(N);
  const lo = Number((NB * 25n) / 1000n), hi = Number((NB * 975n + 999n) / 1000n - 1n);
  return { lower: meds[lo], upper: meds[hi] };
}

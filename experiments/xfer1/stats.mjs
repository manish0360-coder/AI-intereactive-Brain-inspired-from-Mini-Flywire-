// ==========================================================
// XFER-1 — descriptive statistics (pure; no I/O, no wall clock, no Math.random)
// ==========================================================
// Everything here is DESCRIPTIVE.  The worlds are a convenience sample of accepted M7 configurations, not a random
// sample of any population, so the percentile bootstrap interval only describes sensitivity of the mean paired
// difference to which worlds were included.  No p-value is computed and none should be quoted.
// ==========================================================

/** mulberry32: small deterministic PRNG for the bootstrap (seeded; never the runtime's streams) */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
export function median(xs) {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
export function sd(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
}

/** percentile bootstrap interval of the mean of `xs` (resampling worlds with replacement) */
export function bootstrapMeanCi(xs, { replicates, seed, level }) {
  const n = xs.length;
  if (n === 0) return null;
  const r = prng(seed), means = new Array(replicates);
  for (let b = 0; b < replicates; b++) { let s = 0; for (let i = 0; i < n; i++) s += xs[Math.floor(r() * n)]; means[b] = s / n; }
  means.sort((a, b) => a - b);
  const lo = (1 - level) / 2, hi = 1 - lo;
  const at = (q) => means[Math.min(replicates - 1, Math.max(0, Math.floor(q * replicates)))];
  return { lower: at(lo), upper: at(hi) };
}

/** paired summary of per-world differences (treatment - reference) */
export function pairedSummary(diffs, cfg) {
  const pos = diffs.filter(d => d > 0).length, neg = diffs.filter(d => d < 0).length;
  return { n: diffs.length, mean: mean(diffs), median: median(diffs), sd: sd(diffs), positive: pos, negative: neg, zero: diffs.length - pos - neg,
    ci: bootstrapMeanCi(diffs, cfg) };
}

// ==========================================================
// CF-01 testbed — paired world-level contrasts with a seeded percentile bootstrap (metrics §2)
// ==========================================================
import { makeStream } from './rng.mjs';

export function pairedBootstrap(diffs, label, B = 10000) {
  const n = diffs.length;
  if (!n) return { n: 0, mean: null, lo: null, hi: null };
  const mean = diffs.reduce((a, b) => a + b, 0) / n;
  const rnd = makeStream(label);
  const means = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += diffs[Math.floor(rnd() * n)];
    means[b] = s / n;
  }
  means.sort();
  return { n, mean, lo: means[Math.floor(0.025 * B)], hi: means[Math.ceil(0.975 * B) - 1], B };
}

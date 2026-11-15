// ==========================================================
// CF-05b testbed — expected net utility of a mechanism under an unknown probability that changes reverse
// ==========================================================
// A mechanism that re-tests abandoned exits helps when a change reverses (benefit B) and costs when it is permanent
// (cost C).  If a change reverses with probability p, the expected steps saved per change are
//
//     U(p) = p * B  -  (1 - p) * C
//
// U(0) = -C and U(1) = B.  If both are positive the mechanism helps at every p ("always"); if both are negative it
// never helps ("never"); otherwise U crosses zero once, at the break-even p* = C / (B + C): above p* when B + C > 0
// ("above"), below p* when B + C < 0 ("below").
//
// This module computes the curve on a fixed grid of p.  It does NOT choose p: the probability that real changes
// reverse is a property of the environment the agent will live in, and nothing in the testbed measures it.
// Uncertainty: b[i] and c[i] are per-world values measured on the SAME worlds, so the bootstrap resamples worlds
// jointly, which keeps the correlation between benefit and cost.
// ==========================================================
import { makeStream } from './rng.mjs';

export const P_GRID = Object.freeze(Array.from({ length: 21 }, (_, i) => i / 20));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))] : null);

export function breakEven(B, C) {
  if (B > 0 && C < 0) return { kind: 'always', p: 0 };
  if (B < 0 && C > 0) return { kind: 'never', p: null };
  if (B + C === 0) return { kind: B > 0 ? 'always' : 'never', p: B > 0 ? 0 : null };
  return { kind: B + C > 0 ? 'above' : 'below', p: C / (B + C) };
}

export function expectedUtility(b, c, label, resamples = 10000) {
  const n = b.length;
  if (!n || c.length !== n) return null;
  const Bm = mean(b), Cm = mean(c);
  const rnd = makeStream(label), Us = P_GRID.map(() => new Float64Array(resamples)), kinds = { always: 0, never: 0, above: 0, below: 0 }, pAbove = [];
  for (let r = 0; r < resamples; r++) {
    let sb = 0, sc = 0;
    for (let i = 0; i < n; i++) { const j = Math.floor(rnd() * n); sb += b[j]; sc += c[j]; }
    const B = sb / n, C = sc / n;
    P_GRID.forEach((p, k) => { Us[k][r] = p * B - (1 - p) * C; });
    const k = breakEven(B, C); kinds[k.kind]++; if (k.kind === 'above') pAbove.push(k.p);
  }
  pAbove.sort((x, y) => x - y);
  return {
    n, benefitIfReversed: Bm, costIfPermanent: Cm, breakEven: breakEven(Bm, Cm),
    curve: P_GRID.map((p, k) => { const s = Array.from(Us[k]).sort((x, y) => x - y); return { p, U: p * Bm - (1 - p) * Cm, lo: quantile(s, 0.025), hi: quantile(s, 0.975), shareResamplesPositive: s.filter((x) => x > 0).length / resamples }; }),
    breakEvenResamples: { ...Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v / resamples])), pStarMedian: quantile(pAbove, 0.5), pStarLo: quantile(pAbove, 0.025), pStarHi: quantile(pAbove, 0.975) },
    resamples,
  };
}

// ==========================================================
// LEARN-0 — sample-size and operating-characteristic arithmetic, computed independently (pure; no I/O; no randomness)
// ==========================================================
// Everything here is a normal approximation to the percentile bootstrap of a mean of n paired world differences; tools/sizing_learn0.mjs
// checks it by Monte Carlo THROUGH the analysis' own bootstrap code.  Quantiles are computed by bisection on high-precision CDFs (no
// tabulated constants), so the gate can re-derive every number in config.mjs SIZING and evidence/sizing_learn0.json.
// ==========================================================

// ---- normal ----
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 3) { // series for erf, then complement
    let sum = x, term = x; const x2 = x * x;
    for (let n = 1; n < 200; n++) { term *= -x2 / n; const t = term / (2 * n + 1); sum += t; if (Math.abs(t) < 1e-17 * Math.abs(sum)) break; }
    return 1 - (2 / Math.sqrt(Math.PI)) * sum;
  }
  // continued fraction (modified Lentz) for erfc(x) = exp(-x^2)/sqrt(pi) * 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...))))
  const tiny = 1e-300; let f = x, C = x, D = 0;
  for (let n = 1; n < 500; n++) { const a = n / 2; D = x + a * D; D = Math.abs(D) < tiny ? tiny : D; C = x + a / C; C = Math.abs(C) < tiny ? tiny : C; D = 1 / D; const delta = C * D; f *= delta; if (Math.abs(delta - 1) < 1e-16) break; }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
export const Phi = (z) => 0.5 * erfc(-z / Math.SQRT2);
const bisect = (f, lo, hi, target) => { for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(mid) < target) lo = mid; else hi = mid; } return (lo + hi) / 2; };
export const zq = (p) => bisect(Phi, -40, 40, p);

// ---- chi-square ----
function lnGamma(z) {   // Lanczos, g = 7, n = 9
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function gammaP(a, x) {   // regularized lower incomplete gamma
  if (x <= 0) return 0;
  if (x < a + 1) { let sum = 1 / a, del = sum, ap = a; for (let n = 0; n < 1000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; } return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a)); }
  const tiny = 1e-300; let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < tiny) d = tiny; c = b + an / c; if (Math.abs(c) < tiny) c = tiny; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}
export const chi2cdf = (df, x) => gammaP(df / 2, x / 2);
export const chi2q = (df, p) => bisect((x) => chi2cdf(df, x), 0, 10 * df + 1000, p);

// ---- the design's arithmetic ----
/** the programme rule: n >= ((z_{1-alpha/2} + z_{power}) * SD / delta)^2 */
export const nRule = (sd, delta, { level = 0.95, power = 0.80 } = {}) => Math.ceil(((zq(1 - (1 - level) / 2) + zq(power)) * sd / delta) ** 2);
/** two-sided interval for an SD estimated from n values (normal theory) */
export const sdInterval = (s, n, level = 0.95) => ({ lower: s * Math.sqrt((n - 1) / chi2q(n - 1, 1 - (1 - level) / 2)), upper: s * Math.sqrt((n - 1) / chi2q(n - 1, (1 - level) / 2)) });
/** the one-sided confidence level whose upper SD limit equals s * factor */
export const ucLevelOfInflation = (n, factor) => 1 - chi2cdf(n - 1, (n - 1) / (factor * factor));
/** label probabilities of the decision rule for a true mean mu, under a normal sampling distribution with standard error se */
export function labelProbabilities(mu, se, delta, level = 0.95) {
  const z = zq(1 - (1 - level) / 2);
  const learns = 1 - Phi((delta + z * se - mu) / se), harms = Phi((-delta - z * se - mu) / se);
  const none = delta > z * se ? Phi((delta - z * se - mu) / se) - Phi((-delta + z * se - mu) / se) : 0;
  return { LEARNS_WITHOUT_MAP: learns, EXPERIENCE_HARMS_WITHOUT_MAP: harms, NO_PRACTICAL_EFFECT: none, INCONCLUSIVE: Math.max(0, 1 - learns - harms - none) };
}
/** the true effect classified LEARNS with probability `power` (the rule targets effects meaningfully larger than delta) */
export const detectableEffect = (se, delta, { level = 0.95, power = 0.80 } = {}) => delta + (zq(1 - (1 - level) / 2) + zq(power)) * se;
/** n at which a true effect of 0 is classified NO_PRACTICAL_EFFECT with probability `power` */
export const nForNoEffect = (sd, delta, { level = 0.95, power = 0.80 } = {}) => Math.ceil(((zq(1 - (1 - level) / 2) + zq(1 - (1 - power) / 2)) * sd / delta) ** 2);

/** the whole closed-form record (what the gate recomputes) */
export function closedForm({ devSd, devN, inflation, delta, n, mus = [-40, -30, -20, -10, 0, 10, 20, 30, 40] }) {
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const sdI = sdInterval(devSd, devN), inflated = devSd * inflation;
  const scen = { development: devSd, inflated, intervalUpper: sdI.upper };
  const out = { z975: r6(zq(0.975)), z80: r6(zq(0.80)), devSd: r6(devSd), devN, inflation, delta, n,
    sdInterval95: { lower: r6(sdI.lower), upper: r6(sdI.upper) }, inflationOneSidedUcLevel: r6(ucLevelOfInflation(devN, inflation)),
    nRule: Object.fromEntries(Object.entries(scen).map(([k, s]) => [k, nRule(s, delta)])),
    nForNoEffect80: Object.fromEntries(Object.entries(scen).map(([k, s]) => [k, nForNoEffect(s, delta)])),
    scenarios: {} };
  for (const [k, s] of Object.entries(scen)) {
    const se = s / Math.sqrt(n);
    out.scenarios[k] = { sd: r6(s), se: r6(se), ciHalfWidth: r6(zq(0.975) * se), detectableAt80: r6(detectableEffect(se, delta)),
      oc: Object.fromEntries(mus.map(mu => [mu, Object.fromEntries(Object.entries(labelProbabilities(mu, se, delta)).map(([l, p]) => [l, r6(p)]))])) };
  }
  // at mu = +-delta the directional label has probability 1 - Phi(z975) = 0.025 for EVERY n (the rule is built for effects beyond delta)
  out.atMarginForAnyN = Object.fromEntries([180, 360, 720, 1440].map(m => [m, r6(labelProbabilities(delta, devSd * inflation / Math.sqrt(m), delta).LEARNS_WITHOUT_MAP)]));
  return out;
}

// ==========================================================
// CF-03c mind — numerics shared by the v3 model (pure functions; no imports)
// ==========================================================
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

/** log Gamma(x) for x > 0 (Lanczos approximation, g = 7).  Same definition as lgamma in mind/world_model.mjs. */
export function lgammaV3(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgammaV3(1 - x);
  const y = x - 1;
  let a = LANCZOS[0];
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (y + i);
  const t = y + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a);
}

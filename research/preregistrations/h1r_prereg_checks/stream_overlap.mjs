// H1-R preregistration check: exact RNG stream-overlap distance (no agent run).
// instrumentation/rng.js makeRng is mulberry32: the state after k draws is a0 + k*C (mod 2^32), C = 0x6d2b79f5
// (odd, invertible), with a0 = (seed >>> 0) || 1. Two streams coincide at lag k = (b - a) * C^-1 (mod 2^32).
// Streams per agent seed (instrumentation/rng.js initRng; experiments/m7/arms.js makeSigma):
//   cognitive seed, visual seed^0x9e3779b9, environment seed^0x5EED, sigma seed^0xBEEF.
// Seeds: frozen M7 §5.1 pilot 20260819000-004, §15.0 extension 20260819005-009, confirmatory 20260819100-119.
//
//   node research/preregistrations/h1r_prereg_checks/stream_overlap.mjs
const M = 1n << 32n, C = 0x6d2b79f5n;
let inv = 1n; for (let i = 0; i < 6; i++) inv = ((inv * (2n - C * inv)) % M + M) % M;
if ((C * inv) % M !== 1n) throw new Error('modular inverse failed');
const a0 = (raw) => { const s = BigInt(raw >>> 0); return s === 0n ? 1n : s; };
const XOR = { cognitive: 0, visual: 0x9e3779b9, environment: 0x5EED, sigma: 0xBEEF };
const seeds = [];
for (let s = 20260819000; s <= 20260819009; s++) seeds.push(s);
for (let s = 20260819100; s <= 20260819119; s++) seeds.push(s);
const st = [];
for (const s of seeds) for (const [name, x] of Object.entries(XOR)) st.push({ id: `${s}:${name}`, a: a0((s ^ x) >>> 0) });
let best = { lag: M, pair: '' };
for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
  const k = ((((st[j].a - st[i].a) % M + M) % M) * inv) % M, lag = k < M - k ? k : M - k;
  if (lag < best.lag) best = { lag, pair: `${st[i].id} & ${st[j].id}` };
}
console.log(`${st.length} streams, ${st.length * (st.length - 1) / 2} pairs; minimum circular lag ${best.lag} draws (${best.pair})`);

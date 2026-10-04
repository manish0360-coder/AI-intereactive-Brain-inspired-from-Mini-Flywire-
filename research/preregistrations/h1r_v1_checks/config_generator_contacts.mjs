// H1-R v1.0 — reproduction of the configuration-generator contact facts (Appendix B.1).
// Read-only seed arithmetic. No agent is run and no configuration is generated: a candidate configuration
// seed c is only an integer here (its generator starts at state c). Nothing is written.
//
//   node research/preregistrations/h1r_v1_checks/config_generator_contacts.mjs
//
// EXACT parts: counts of (cell, candidate seed) pairs whose environment segment and generator segment share a
// mulberry32 state. MODEL parts: probabilities under a geometric acceptance model (independent Bernoulli
// acceptance per candidate, rate by goal index, sequential walk); they are inferences, labelled as such.
import { envSeedFor } from '../../../experiments/h1r/env_seed.mjs';

const C = 0x6d2b79f5;
let inv = 1; for (let i = 0; i < 6; i++) inv = Math.imul(inv, (2 - Math.imul(C, inv)) | 0);   // C^-1 mod 2^32
if (Math.imul(C, inv) !== 1) throw new Error('modular inverse failed');
const TWO32 = 2 ** 32;
const lag = (from, to) => Math.imul((to - from) | 0, inv) >>> 0;        // draws from state `from` to state `to`
// segment A = draws 1..na from makeRng(a), segment B = draws 1..nb from makeRng(b): shared state?
const touch = (a, na, b, nb) => { const k = lag(a >>> 0, b >>> 0); return k < na || (TWO32 - k) < nb; };

const RESERVE = { env: 4096, gen: 1024 }, ACTUAL = { env: 3000, gen: 756 };   // actual: env <= 3000 (<=1 per tick), makeConfig 756
const PILOT_SEEDS = [4, 5, 6, 7, 8].map(k => 20260819000 + k);
const CONF_SEEDS = [...Array(20)].map((_, k) => 20260819100 + k);
const cells = (seeds, blockCode, nIdx) => seeds.flatMap(s => [...Array(nIdx)].map((_, i) =>
  ({ s, i, e: envSeedFor({ agentSeed: s, blockCode, acceptedConfigIndex: i }) })));
function contacts(cellList, lo, hi, r) {
  const out = []; for (const x of cellList) for (let c = lo; c <= hi; c++) if (touch(x.e, r.env, c, r.gen)) out.push({ ...x, c });
  return out;
}

// acceptance model: rates from the 41 ERR-09 diagnostic samples (470 seeds x 4 goal indices): 7, 11, 14, 9
const K = [7, 11, 14, 9], N = 470;
const P_POINT = K.map(k => k / N);
function cpLower(k, n, a = 0.05) {               // one-sided Clopper-Pearson lower bound: P(X >= k | p) = a
  const tailGE = (p) => { let s = 0, t = Math.pow(1 - p, n); for (let j = 0; j <= n; j++) { if (j >= k) s += t; t = t * (n - j) / (j + 1) * p / (1 - p); } return s; };
  let lo = 0, hi = k / n; for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (tailGE(m) < a) lo = m; else hi = m; } return (lo + hi) / 2;
}
const P_LOWER = K.map(k => cpLower(k, N)), P_HALF = P_POINT.map(p => p / 2);
// forward dynamic program: accept[i][x] = P(the accepted seed of index i is start + x)
function acceptedPmf(start, nIdx, span, P) {
  let cur = new Float64Array(span); cur[0] = 1; const acc = [];
  for (let i = 0; i < nIdx; i++) {
    const p = P[i % 4], a = new Float64Array(span), nx = new Float64Array(span); let carry = 0;
    for (let x = 0; x < span; x++) { const h = cur[x] + carry; a[x] = h * p; carry = h * (1 - p); if (x + 1 < span) nx[x + 1] += a[x]; }
    acc.push(a); cur = nx;
  }
  return acc;
}
// union bound: sum over contacting (cell, candidate) pairs of P(A_i = candidate)
const unionBound = (hits, acc, start) => hits.reduce((t, h) => t + (acc[h.i][h.c - start] || 0), 0);
const fmt = (x) => x.toExponential(2);

console.log('H1-R v1.0 Appendix B.1 — configuration-generator contacts');
console.log(`acceptance rates (goal index 0..3): point ${P_POINT.map(p => p.toFixed(4)).join(', ')}; ` +
  `one-sided 95% lower ${P_LOWER.map(p => p.toFixed(4)).join(', ')}; half ${P_HALF.map(p => p.toFixed(4)).join(', ')}`);

// (1) pilot: 5 seeds x 10 indices x 4,000 candidates = 200,000 pairs
const pc = cells(PILOT_SEEDS, 0, 10);
console.log(`EXACT pilot (5 x 10 cells x 886000-889999 = ${pc.length * 4000} pairs): reserve ${contacts(pc, 886000, 889999, RESERVE).length}, actual ${contacts(pc, 886000, 889999, ACTUAL).length}`);
for (const [name, P] of [['point', P_POINT], ['95% lower', P_LOWER], ['half', P_HALF]]) {
  const acc = acceptedPmf(886000, 10, 4000, P);
  console.log(`MODEL pilot capacity (${name}): P(A_4 <= 889999) = ${acc[4].reduce((a, b) => a + b, 0).toFixed(10)}, P(A_9 <= 889999) = ${acc[9].reduce((a, b) => a + b, 0).toFixed(10)}`);
}
// (2) confirmatory: 20 seeds x 30 indices x 60,000 candidates = 36,000,000 pairs
const cc = cells(CONF_SEEDS, 1, 30);
const cR = contacts(cc, 900500, 960499, RESERVE), cA = contacts(cc, 900500, 960499, ACTUAL);
console.log(`EXACT confirmatory (20 x 30 cells x 900500-960499 = ${cc.length * 60000} pairs): reserve ${cR.length}, actual ${cA.length}`);
for (const [name, P] of [['point', P_POINT], ['95% lower', P_LOWER], ['half', P_HALF]]) {
  const acc = acceptedPmf(900500, 30, 60000, P);
  console.log(`MODEL confirmatory (${name}): union bound P(some cell flagged) reserve ${fmt(unionBound(cR, acc, 900500))}, actual shared state ${fmt(unionBound(cA, acc, 900500))}; ` +
    `model mass of A_29 inside the candidate range ${acc[29].reduce((a, b) => a + b, 0).toFixed(9)}`);
}
// (3) generator self-overlap across the whole pilot + held-out span
let minD = Infinity; for (let k = 1; k <= 960499 - 886000; k++) { const d = Math.imul(k, inv) >>> 0; minD = Math.min(minD, d, TWO32 - d); }
console.log(`EXACT generator starts within 886000..960499: minimum separation ${minD} draws (a shared state needs < ${ACTUAL.gen})`);
// (4) cross-stage environment contacts
const pX = contacts(pc, 900500, 960499, RESERVE), cX = contacts(cc, 886000, 889999, RESERVE);
const accH = acceptedPmf(900500, 30, 60000, P_POINT), accHL = acceptedPmf(900500, 30, 60000, P_LOWER);
const accP = acceptedPmf(886000, 10, 4000, P_POINT), accPL = acceptedPmf(886000, 10, 4000, P_LOWER);
const anyIndex = (hits, acc, start) => [...new Set(hits.map(h => h.c))].reduce((t, c) => t + acc.reduce((u, a) => u + (a[c - start] || 0), 0), 0);
console.log(`EXACT cross-stage: pilot environment segments x held-out candidates ${pX.length}; confirmatory environment segments x pilot candidates ${cX.length}`);
console.log(`MODEL cross-stage P(some touched candidate accepted at any index): pilot->held-out point ${fmt(anyIndex(pX, accH, 900500))}, 95% lower ${fmt(anyIndex(pX, accHL, 900500))}; ` +
  `confirmatory->pilot point ${fmt(anyIndex(cX, accP, 886000))}, 95% lower ${fmt(anyIndex(cX, accPL, 886000))}`);
// (5) the superseded figure
console.log(`SUPERSEDED (uniform start state on 2^32): 5119 / 2^32 = ${(5119 / TWO32).toExponential(4)} — wrong model; not used`);

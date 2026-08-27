// ==========================================================
// M5 GATE S3.2′ — SUPERSEDING VERIFICATION CRITERION
// ==========================================================
// Issued under ERRATUM M7-ERR-01b
//   research/cognitive-audit/M7_PREREGISTRATION_ERRATUM_01.md §4
//
// RELATIONSHIP TO THE ORIGINAL GATE
// ---------------------------------
// verify_S3.js is PRESERVED UNMODIFIED as historical provenance. Its gate
// S3.2 still runs and still reports. This file does not replace, patch or
// silence it; it stands alongside it as an EXPLICIT SUPERSEDING CRITERION
// for the single assertion S3.2, per Director ruling of 2026-08-19.
//
// WHY S3.2 IS SUPERSEDED (erratum §4.2)
// -------------------------------------
// S3.2 thresholds ONE run at ONE seed:
//     stale <= PRE_STALE * 0.3      (67 * 0.3 = 20.1), seed 20260818
// `stale` = steps - decisions = steps on which runPrediction did not run.
// The only mechanism producing it is the replay branch (main.js:3170) —
// i.e. F2b, which is DELIBERATELY UNREPAIRED (Ruling Q3). Replay-branch
// occupancy is POLICY-DEPENDENT, and the approved trust rectification
// changes the policy by design.
//
// Measured across the panel below, the original threshold is exceeded on
// exactly 1 of 6 seeds by BOTH the pre- and post-rectification builds
// (pre: seed 90210 -> 29; post: seed 20260818 -> 26). It discriminates
// between SEEDS, not between BUILDS, and is therefore non-discriminating
// for the property M5 needs verified.
//
// THE SUPERSEDING CRITERION
// -------------------------
//   S3.2′(a)  epsilon-pinned  stale == 0  on EVERY panel seed.
//             The causal F2 invariant. Policy-INVARIANT: forcing
//             exploration forces runPrediction on every step, so this
//             holds regardless of what the policy does. The pre-F2-fix
//             build produced 40.9% under this condition.
//
//   S3.2′(b)  natural epsilon: MEDIAN stale rate across the panel
//             <= 30% of the pre-fix baseline rate (17.6%)  =>  <= 5.28%.
//             Preserves the original's >=70%-reduction intent while
//             replacing a single-seed point estimate with a robust
//             aggregate, so ordinary policy-induced variance in F2b
//             occupancy cannot flip the verdict while a genuine F2
//             regression still would.
//
// PANEL LIMITATION, DECLARED (erratum §4.5): these six seeds were
// exercised during the gate-semantics audit and are therefore not naive.
// Acceptable because S3.2′ is a DETERMINISTIC VERIFICATION GATE, not a
// statistical inference: it asserts a fixed property of a build, feeds no
// hypothesis test, and enters no confirmatory family.
// ==========================================================
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

// ---- pre-declared seed panel (erratum §4.3) — FIXED, do not edit ----
const PANEL = [20260818, 31337, 31338, 777, 4242, 90210];
const TICKS = 80;

// pre-fix baseline rate, from the original S3.2 constants: 67/381 = 17.6%
const PRE_FIX_RATE = 67 / 381;
const RESIDUAL_LIMIT = PRE_FIX_RATE * 0.30;          // 5.28%

function run({ seed, boost }) {
  const out = execFileSync(process.execPath, ['_runonce.js'], {
    cwd: HERE,
    env: { ...process.env, SEED: String(seed), BOOST: String(boost), TICKS: String(TICKS) },
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  return JSON.parse(out.slice(out.indexOf('@@RESULT@@') + 10));
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

console.log('══════════════════════════════════════════════════════════════');
console.log(' S3.2′  SUPERSEDING CRITERION  (erratum M7-ERR-01b)');
console.log(' verify_S3.js and its S3.2 assertion remain PRESERVED, unmodified.');
console.log('══════════════════════════════════════════════════════════════');
console.log(`      panel: ${PANEL.join(', ')}   ticks=${TICKS}`);

// ---------- S3.2′(a) : the causal F2 invariant ----------
console.log('\n── S3.2′(a)  epsilon-pinned: stale == 0 on every panel seed ──');
console.log('      (the property F2 repaired; policy-invariant)');
const pinned = [];
let aViol = 0;
for (const seed of PANEL) {
  const r = run({ seed, boost: 1 });
  pinned.push(r);
  const good = r.stale === 0;
  if (!good) aViol++;
  console.log(`      seed ${String(seed).padEnd(9)} stale ${String(r.stale).padStart(3)} / ${String(r.steps).padStart(3)} steps   ${good ? 'ok' : '<-- VIOLATION'}`);
}
ok("S3.2′(a)  zero stale executions under forced exploration, all panel seeds",
   aViol === 0, `${PANEL.length - aViol}/${PANEL.length} seeds at exactly 0`);

// ---------- S3.2′(b) : robust aggregate residual ----------
console.log('\n── S3.2′(b)  natural epsilon: median residual <= 30% of pre-fix ──');
console.log(`      pre-fix baseline 67/381 = ${(PRE_FIX_RATE * 100).toFixed(1)}%   limit = ${(RESIDUAL_LIMIT * 100).toFixed(2)}%`);
const rates = [], counts = [];
for (const seed of PANEL) {
  const r = run({ seed, boost: 0 });
  const rate = r.stale / r.steps;
  rates.push(rate); counts.push(r.stale);
  console.log(`      seed ${String(seed).padEnd(9)} stale ${String(r.stale).padStart(3)} / ${String(r.steps).padStart(3)} = ${(rate * 100).toFixed(2)}%`);
}
const med = median(rates);
console.log(`      median residual rate = ${(med * 100).toFixed(2)}%   mean stale = ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2)}`);
ok("S3.2′(b)  median stale rate <= 5.28% across the panel",
   med <= RESIDUAL_LIMIT, `${(med * 100).toFixed(2)}% vs limit ${(RESIDUAL_LIMIT * 100).toFixed(2)}%`);

// ---------- provenance note: what the ORIGINAL S3.2 would say ----------
console.log('\n── provenance: original S3.2 single-seed threshold, for the record ──');
const seed0 = counts[PANEL.indexOf(20260818)];
console.log(`      original assertion: stale(seed 20260818) <= 20.1   ->  measured ${seed0}`);
console.log(`      original verdict  : ${seed0 <= 20.1 ? 'would PASS' : 'would FAIL'}  (non-discriminating — see erratum §4.2)`);
console.log('      This line is INFORMATIONAL. It is not an assertion of this gate.');
console.log('      verify_S3.js remains the authoritative record of the original gate.');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

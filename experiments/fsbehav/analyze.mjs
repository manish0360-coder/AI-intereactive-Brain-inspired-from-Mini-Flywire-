// FS-BD-01 Study 1 analysis. Descriptive, paired by seed. No alpha threshold is invented and no
// result is called confirmatory: n = 6 and the runs are deterministic, so the seed is the only
// source of variation. The bootstrap is EXACT (all 6^6 = 46656 resamples enumerated), so the
// analysis itself consumes no RNG and is fully reproducible.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence/RUNS.json'), 'utf8'));
const PANEL = R.panel;
const by = (arm, seed) => R.rows.find((r) => r.arm === arm && r.seed === seed);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (x) => (x * 100).toFixed(2) + '%';

console.log('='.repeat(78));
console.log('  FS-BD-01 STUDY 1 — paired analysis (n = 6 seeds, descriptive)');
console.log('='.repeat(78));

// ---- P1..P4 per arm --------------------------------------------------------------------------
console.log('\n-- P1..P4 by arm ------------------------------------------------------------');
for (const a of R.arms.map((x) => x.arm)) {
  const rows = PANEL.map((s) => by(a, s));
  console.log(`${a.padEnd(6)} P1 median ${pct(median(rows.map((r) => r.staleRate)))}  ` +
    `P2 d/t ${median(rows.map((r) => r.decisionsPerTick)).toFixed(3)}  ` +
    `P3 s/t ${median(rows.map((r) => r.stepsPerTick)).toFixed(3)}  ` +
    `P4 staleTicks ${median(rows.map((r) => r.staleTicks))}  ` +
    `S2 resets ${rows.reduce((x, r) => x + r.goalResets, 0)}  ` +
    `S3 fb median ${median(rows.map((r) => r.futureBonus.median ?? 0))}`);
}

// ---- arm identity checks ----------------------------------------------------------------------
console.log('\n-- arm identity (the predicted null and the ablation) -----------------------');
// Compare the BEHAVIOURAL payload only: outputHash also covers `arm`/`rootLabel`, which differ by
// construction, so hashing the whole record would report a difference that is pure bookkeeping.
const behaviour = (r) => JSON.stringify({
  decisions: r.decisions, steps: r.steps, stale: r.stale, staleTicks: r.staleTicks,
  goalResets: r.goalResets, discontinuities: r.discontinuities,
  futureBonus: r.futureBonus, writes: r.writes,
});
for (const [x, y] of [['A-V23', 'A-GEO'], ['A-V23', 'A-FS0']]) {
  const per = PANEL.map((s) => behaviour(by(x, s)) === behaviour(by(y, s)));
  console.log(`${x} vs ${y}: ${per.every(Boolean) ? 'IDENTICAL on all 6 seeds (decisions, steps, stale, writes, futureBonus)' : `DIFFERS on ${per.filter((b) => !b).length}/6 seeds`}`);
}

// ---- paired contrast: A-V23 minus A-OLD -------------------------------------------------------
console.log('\n-- paired per-seed contrast  A-V23 - A-OLD  (P1 stale rate) ----------------');
const diffs = [];
for (const s of PANEL) {
  const o = by('A-OLD', s), v = by('A-V23', s);
  const d = v.staleRate - o.staleRate;
  diffs.push(d);
  console.log(`  seed ${String(s).padEnd(9)} OLD ${pct(o.staleRate).padStart(7)}  V23 ${pct(v.staleRate).padStart(7)}  diff ${(d * 100 >= 0 ? '+' : '') + (d * 100).toFixed(2)}pp`);
}
const medD = median(diffs);
console.log(`  median paired difference: ${(medD * 100 >= 0 ? '+' : '') + (medD * 100).toFixed(2)}pp`);
console.log(`  arm medians: OLD ${pct(median(PANEL.map((s) => by('A-OLD', s).staleRate)))}  V23 ${pct(median(PANEL.map((s) => by('A-V23', s).staleRate)))}`);

// exact sign test (two-sided), ties excluded
const pos = diffs.filter((d) => d > 0).length, neg = diffs.filter((d) => d < 0).length;
const n = pos + neg;
const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
let tail = 0; const k = Math.min(pos, neg);
for (let i = 0; i <= k; i++) tail += C(n, i);
const p2 = Math.min(1, 2 * tail / Math.pow(2, n));
console.log(`  exact sign test: ${pos} increases, ${neg} decreases, n = ${n}, two-sided p = ${p2.toFixed(4)}`);
console.log(`  (n = 6 => the smallest attainable two-sided p is ${(2 / 64).toFixed(4)}; this is descriptive, not confirmatory)`);

// exact bootstrap over all 6^6 resamples of the paired differences
const N = diffs.length;
const total = Math.pow(N, N);
const meds = new Array(total);
for (let code = 0; code < total; code++) {
  let c = code; const sample = new Array(N);
  for (let i = 0; i < N; i++) { sample[i] = diffs[c % N]; c = Math.floor(c / N); }
  meds[code] = median(sample);
}
meds.sort((a, b) => a - b);
const lo = meds[Math.floor(0.025 * total)], hi = meds[Math.ceil(0.975 * total) - 1];
console.log(`  exact bootstrap (all ${total} resamples) 95% interval for the median difference: ` +
  `[${(lo * 100).toFixed(2)}pp, ${(hi * 100).toFixed(2)}pp]  spans zero: ${lo <= 0 && hi >= 0}`);

// ---- H3 counter decomposition -----------------------------------------------------------------
console.log('\n-- H3 counter decomposition (is the ratio moving via numerator or denominator?) --');
for (const s of PANEL) {
  const o = by('A-OLD', s), v = by('A-V23', s);
  console.log(`  seed ${String(s).padEnd(9)} decisions ${String(o.decisions).padStart(3)} -> ${String(v.decisions).padStart(3)} (${v.decisions - o.decisions >= 0 ? '+' : ''}${v.decisions - o.decisions})   steps ${String(o.steps).padStart(3)} -> ${String(v.steps).padStart(3)} (${v.steps - o.steps >= 0 ? '+' : ''}${v.steps - o.steps})`);
}
const dDec = PANEL.map((s) => by('A-V23', s).decisions - by('A-OLD', s).decisions);
const dSte = PANEL.map((s) => by('A-V23', s).steps - by('A-OLD', s).steps);
console.log(`  median change: decisions ${median(dDec)}   steps ${median(dSte)}`);

// ---- S1 decision divergence --------------------------------------------------------------------
console.log('\n-- S1 decision divergence (A-OLD vs A-V23 write sequences) ------------------');
for (const s of PANEL) {
  const a = by('A-OLD', s).writes, b = by('A-V23', s).writes;
  const m = Math.min(a.length, b.length);
  let first = -1, same = 0;
  for (let i = 0; i < m; i++) { if (a[i] === b[i]) same++; else if (first < 0) first = i; }
  console.log(`  seed ${String(s).padEnd(9)} first divergence at decision ${first < 0 ? 'none' : first}  identical positions ${same}/${m} (${pct(same / m)})`);
}

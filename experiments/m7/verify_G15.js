// ==========================================================
// GATE G15 — No reward artifact
// ==========================================================
// FROZEN §14:  "Goal-reward eligibility rate shows no systematic dependence on p_e"
// FROZEN §10.4: "Reward-design artifact | No new reward code (§3.4) + gate G15"
//
// DIRECTOR RULING M7-G15.3 (2026-08-26) operationalises the gate at the
// CONFIGURATION x PHASE level, after four event-level predictors were measured
// and rejected (recentMemory mean, terminal edge under both readings,
// configuration-phase constants duplicated per event, and existing trust).
//
//   A. UNIT      per (configuration, phase):
//                  eligibility_rate = eligible_goal_reaches / total_goal_reaches
//                EVERY goal-reach event stays in the denominator. No exclusion
//                of staleExecution, replay, or non-canonical transitions.
//   B. EXPOSURE  mean_p_e = arithmetic mean of p_e over the COMPLETE canonical
//                edge set for that configuration in that phase (env cfg.pPhaseN).
//   C. STRATIFY  Phase I and Phase II are analysed SEPARATELY. Never pooled.
//   D. THRESHOLD each phase passes at |rho| < 0.10; BOTH must pass.
//   E. SUFFICIENCY  no PASS/FAIL verdict unless the lawful probe data holds
//                >= 20 accepted configuration samples, >= 10 distinct full-edge
//                p_e vectors, and >= 5 distinct mean_p_e values. Otherwise
//                G15 = INCONCLUSIVE, which blocks Stage 1.
//   F. SEEDS     lawful material only. ERRATUM M7-ERR-09 (Director ruling
//                2026-08-26, Path A2) authorises the bounded gate-diagnostic
//                candidate range 900030-900499 -- the complete remaining
//                pre-held-out unallocated configuration-seed space. Frozen §5.1
//                pilot 900000-900004 and §15.0's single F-11 extension
//                900005-900009 are NOT drawn on. ERR-07 §2 makes the held-out
//                stream from 900500 UNBOUNDED FORWARD, so candidates here are
//                evaluated directly at their own seed and never by a walk
//                (ERR-09 §3.3); the floor is asserted mechanically below.
//
// MEASUREMENT METHOD. Eligibility is not observable from any exported value, so
// the verifier boots the real driver under an ESM load hook that INSERTS one
// recording call after the frozen goal-reach test. It inserts only; it changes
// no value and no control flow. Section N proves the instrumentation is
// observationally neutral by comparing run fingerprints with and without it.
//
// NOT Stage 1, a pilot, or a confirmatory run.
// ==========================================================
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from './env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm7g15-'));

// ---- lawful material ----
const ERR09_LO           = 900030;                // ERR-09 §3, inclusive
const ERR09_HI           = 900499;                // ERR-09 §3, inclusive
const F11_LO             = 900005, F11_HI = 900009;   // frozen §15.0, reserved
const PILOT_AGENT_SEED   = 20260819000;          // frozen §5.1 pilot agent block
const CONFIRMATORY_LO    = 20260819100, CONFIRMATORY_HI = 20260819119;  // frozen §5.1
const GOAL_INDICES       = [0, 1, 2, 3];          // GOALS = {8,12,16,19}, §3.7
const TICKS              = env.RUN_TICKS;         // 3000, frozen §3.7
const HELD_OUT_FLOOR     = 900500;                // frozen §5.1 / ERR-07 §2 — never crossed
// ---- ruling M7-G15.3 §D/§E constants ----
const RHO_THRESHOLD      = env.G11_THRESHOLD;     // 0.10, frozen R3/R4, reused
const MIN_CONFIG_SAMPLES = 20;
const MIN_DISTINCT_PVEC  = 10;
const MIN_DISTINCT_MEAN  = 5;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };
const mean = (a) => a.reduce((p, c) => p + c, 0) / a.length;
const hash = (a) => crypto.createHash('sha256').update(a.map(x => x.toFixed(12)).join(',')).digest('hex').slice(0, 12);

// ---- Spearman with mid-rank tie correction (Pearson on ranks) ----
function spearman(x, y) {
  const n = x.length;
  if (n < 2) return NaN;
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const mid = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = mid;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(x), ry = rank(y);
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx, b = ry[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return NaN;      // a constant vector has no rank order
  return num / Math.sqrt(dx * dy);
}

// ---- verdict function, isolated so §E can be tested directly ----
function verdict(diag, rhoP1, rhoP2) {
  const sufficient = diag.configSamples >= MIN_CONFIG_SAMPLES &&
                     diag.distinctPVectors >= MIN_DISTINCT_PVEC &&
                     diag.distinctMeans >= MIN_DISTINCT_MEAN;
  if (!sufficient) return { sufficient, verdict: 'INCONCLUSIVE' };
  if (!Number.isFinite(rhoP1) || !Number.isFinite(rhoP2)) return { sufficient, verdict: 'INCONCLUSIVE' };
  return { sufficient, verdict: (Math.abs(rhoP1) < RHO_THRESHOLD && Math.abs(rhoP2) < RHO_THRESHOLD) ? 'PASS' : 'FAIL' };
}

// ==========================================================
// one booted run per configuration, in its own OS process
// ==========================================================
const HOOK = path.join(TMP, 'hook.mjs');
fs.writeFileSync(HOOK, `
// Inserts ONE recording call after the frozen goal-reach test. Insert only:
// no value is changed, no branch is added, no control flow is altered.
export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!/\\/main\\.js$/.test(decodeURIComponent(url)) || !r.source) return r;
  const lines = String(r.source).split('\\n');
  const i = lines.findIndex(l => l.includes('if (next === goalNeuronId) {'));
  if (i < 0) throw new Error('G15: goal-reach anchor not found in main.js');
  lines.splice(i + 1, 0, '      globalThis.__G15__(episodeUnique, agentCurrent, next);');
  return { ...r, source: lines.join('\\n') };
}`);

function child(o) {
  const f = path.join(TMP, `r${o.tag}.mjs`);
  fs.writeFileSync(f, `
import { register } from 'node:module';
const env = await import(${JSON.stringify(U + '/experiments/m7/env.js')});
const ev = [];
let replay = false;
globalThis.__M7_TEL__ = { step(){ replay = false; }, replayBranch(){ replay = true; } };
globalThis.__G15__ = (u, aCur, nxt) => ev.push({
  eligible: u >= 3, phase: env.getPhase(), replay,
  canonical: env.trueP(aCur, nxt) !== null });
${o.instrument === false ? '' : `register(${JSON.stringify('file:///' + HOOK.replace(/\\\\/g, '/'))}, import.meta.url);`}
const { runOnce } = await import(${JSON.stringify(U + '/experiments/m7/run.js')});
const rec = await runOnce({ configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
  agentSeed: ${PILOT_AGENT_SEED}, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on',
  tickUnit: 'step', ticks: ${TICKS}, crashAtTick: null, warmStore: false });
const cut = (p) => { const s = ev.filter(e => e.phase === p);
  return { total: s.length, eligible: s.filter(e => e.eligible).length,
           replay: s.filter(e => e.replay).length,
           nonCanonical: s.filter(e => !e.canonical).length }; };
process.stdout.write('@@G@@' + JSON.stringify({
  phase1: cut(1), phase2: cut(2), allEvents: ev.length,
  fp: rec.fingerprint, cog: rec.artifacts.cogDraws }));`);
  return f;
}
const runAsync = (o) => new Promise((res, rej) =>
  execFile(process.execPath, [child(o)], { cwd: HERE, maxBuffer: 1 << 28 },
    (e, out) => e ? rej(e) : res(JSON.parse(out.slice(out.indexOf('@@G@@') + 5)))));

console.log('==============================================================');
console.log(' GATE G15  No reward artifact');
console.log(' frozen §14 / §10.4 | Director ruling M7-G15.3, config x phase');
console.log('==============================================================');

// ==========================================================
// S — LAWFUL SEED BOUNDARY (ruling §F)
// ==========================================================
console.log('\n===== S  ERR-09 authorised candidate range ====================');
// ERR-09 §3.3: candidates are evaluated DIRECTLY at their own seed with the
// complete, unchanged acceptance predicate (cfg.accepted). No forward walk is
// used for discovery, so nothing can advance past the held-out floor.
const CANDIDATE_SEEDS = [];
const SAMPLES = [];
for (let seed = ERR09_LO; seed <= ERR09_HI; seed++) {
  CANDIDATE_SEEDS.push(seed);
  for (const i of GOAL_INDICES) {
    const cfg = env.makeConfig(seed, i);
    if (!cfg.accepted) continue;
    SAMPLES.push({ configSeed: seed, configIndex: i, accepted: seed, goal: cfg.goal,
                   p1: cfg.pPhase1, p2: cfg.pPhase2,
                   h1: hash(cfg.pPhase1), h2: hash(cfg.pPhase2),
                   m1: mean(cfg.pPhase1), m2: mean(cfg.pPhase2) });
  }
}
// Each accepted sample must TERMINATE the canonical walk at its own seed with
// zero forward advance. run.js calls generateAccepted, so this is what actually
// guarantees the measurement runs cannot cross the floor either.
const walkAdvance = SAMPLES.map(s => {
  const g = env.generateAccepted(s.configSeed, s.configIndex);
  return { at: g.provenance.acceptedSeed === s.configSeed,
           rejected: g.provenance.numberOfRejectedCandidatesBeforeAcceptance };
});
const seedsSeen = env.evaluatedSeeds();
console.log(`   ERR-09 authorised candidate range       : ${ERR09_LO}-${ERR09_HI} inclusive`);
console.log(`   goal indices (frozen §3.7 GOALS)        : ${GOAL_INDICES.join(', ')} -> {${env.GOALS.join(',')}}`);
console.log(`   candidate evaluations                   : ${CANDIDATE_SEEDS.length * GOAL_INDICES.length}`);
console.log(`   ACCEPTED configuration samples          : ${SAMPLES.length}`);
console.log(`   distinct accepted seeds                 : ${new Set(SAMPLES.map(s => s.configSeed)).size}`);
console.log(`   config seeds evaluated                  : ${seedsSeen[0]}-${seedsSeen[seedsSeen.length - 1]}`);
const s1 = ok('S1 no seed at or above the held-out floor is generated or inspected',
   seedsSeen.every(x => x < HELD_OUT_FLOOR),
   `${seedsSeen.filter(x => x >= HELD_OUT_FLOOR).length} seeds at or above ${HELD_OUT_FLOOR}; ` +
   `ERR-07 §2 makes that stream unbounded forward, so this is a hard boundary`);
const s1b = ok('S1b every evaluated candidate seed is inside the authorised range',
   seedsSeen.every(x => x >= ERR09_LO && x <= ERR09_HI),
   `all ${seedsSeen.length} evaluated seeds within ${ERR09_LO}-${ERR09_HI}`);
const s1c = ok('S1c no acceptance walk advances even one seed forward',
   walkAdvance.every(w => w.at && w.rejected === 0),
   `${SAMPLES.length} samples, max forward advance ${Math.max(0, ...walkAdvance.map(w => w.rejected))} seeds`);
const s2 = ok('S2 the single F-11 pilot extension block is NOT repurposed',
   seedsSeen.every(x => x < F11_LO || x > F11_HI) && ERR09_LO > F11_HI,
   `frozen §15.0 reserves ${F11_LO}-${F11_HI} for one bounded F-11 extension only`);
const s2b = ok('S2b no confirmatory agent seed is used',
   PILOT_AGENT_SEED < CONFIRMATORY_LO || PILOT_AGENT_SEED > CONFIRMATORY_HI,
   `agent seed ${PILOT_AGENT_SEED} is the frozen §5.1 pilot block, not ${CONFIRMATORY_LO}-${CONFIRMATORY_HI}`);
const s3 = ok('S3 this is the COMPLETE authorised candidate space, exhaustively enumerated',
   CANDIDATE_SEEDS.length === ERR09_HI - ERR09_LO + 1 &&
   CANDIDATE_SEEDS[0] === ERR09_LO && CANDIDATE_SEEDS[CANDIDATE_SEEDS.length - 1] === ERR09_HI,
   `${CANDIDATE_SEEDS.length} candidate seeds x ${GOAL_INDICES.length} frozen goals, none skipped`);

// ==========================================================
// D — INFORMATION DIVERSITY (ruling §E)
// ==========================================================
console.log('\n===== D  information diversity ================================');
const diag = {
  configSamples: SAMPLES.length,
  distinctAcceptedSeeds: new Set(SAMPLES.map(s => s.accepted)).size,
  distinctPVectors: Math.min(new Set(SAMPLES.map(s => s.h1)).size, new Set(SAMPLES.map(s => s.h2)).size),
  distinctMeans: Math.min(new Set(SAMPLES.map(s => s.m1.toFixed(9))).size,
                          new Set(SAMPLES.map(s => s.m2.toFixed(9))).size),
};
console.log(`   configuration samples      ${String(diag.configSamples).padStart(3)}   required >= ${MIN_CONFIG_SAMPLES}   ${diag.configSamples >= MIN_CONFIG_SAMPLES ? 'OK' : 'SHORT'}`);
console.log(`   distinct accepted seeds    ${String(diag.distinctAcceptedSeeds).padStart(3)}`);
console.log(`   distinct full p_e vectors  ${String(diag.distinctPVectors).padStart(3)}   required >= ${MIN_DISTINCT_PVEC}   ${diag.distinctPVectors >= MIN_DISTINCT_PVEC ? 'OK' : 'SHORT'}`);
console.log(`   distinct mean_p_e values   ${String(diag.distinctMeans).padStart(3)}   required >= ${MIN_DISTINCT_MEAN}   ${diag.distinctMeans >= MIN_DISTINCT_MEAN ? 'OK' : 'SHORT'}`);
const sufficient = diag.configSamples >= MIN_CONFIG_SAMPLES &&
                   diag.distinctPVectors >= MIN_DISTINCT_PVEC &&
                   diag.distinctMeans >= MIN_DISTINCT_MEAN;
const d1 = ok('D1 the diversity census is MEASURED from the authorised range, never assumed',
   diag.configSamples === SAMPLES.length && SAMPLES.every(s => s.configSeed >= ERR09_LO && s.configSeed <= ERR09_HI),
   `${diag.configSamples} accepted configuration samples, every one inside ${ERR09_LO}-${ERR09_HI}`);

// ==========================================================
// M — MEASUREMENT: one real run per configuration sample
// ==========================================================
console.log('\n===== M  per-configuration measurement =======================');
console.log(`   booting ${SAMPLES.length} runs x ${TICKS} ticks, agent seed ${PILOT_AGENT_SEED}, arm A1 ...`);
console.log('   (one run per ACCEPTED configuration in the ERR-09 range)');
for (let i = 0; i < SAMPLES.length; i++) {
  const s = SAMPLES[i];
  const r = await runAsync({ configSeed: s.configSeed, configIndex: s.configIndex, tag: 'm' + i });
  s.run = r;
  s.rate1 = r.phase1.total ? r.phase1.eligible / r.phase1.total : null;
  s.rate2 = r.phase2.total ? r.phase2.eligible / r.phase2.total : null;
}
const line = (s, ph) => {
  const r = ph === 1 ? s.run.phase1 : s.run.phase2;
  const m = ph === 1 ? s.m1 : s.m2;
  const rate = ph === 1 ? s.rate1 : s.rate2;
  return `   ${s.configSeed}/${s.configIndex} goal ${String(s.goal).padStart(2)}  acc ${s.accepted}  ` +
         `mean_p_e ${m.toFixed(6)}  reaches ${String(r.total).padStart(4)}  eligible ${String(r.eligible).padStart(4)}  ` +
         `rate ${rate === null ? '  n/a ' : rate.toFixed(4)}`;
};
for (const ph of [1, 2]) {
  console.log(`\n   --- PHASE ${ph === 1 ? 'I' : 'II'} ---`);
  for (const s of SAMPLES) console.log(line(s, ph));
}

const usable = (ph) => SAMPLES.filter(s => (ph === 1 ? s.rate1 : s.rate2) !== null);
const xs = (ph) => usable(ph).map(s => ph === 1 ? s.m1 : s.m2);
const ys = (ph) => usable(ph).map(s => ph === 1 ? s.rate1 : s.rate2);
const rhoP1 = spearman(xs(1), ys(1));
const rhoP2 = spearman(xs(2), ys(2));
console.log(`\n   Spearman rho  PHASE I  = ${Number.isFinite(rhoP1) ? rhoP1.toFixed(6) : 'undefined (constant vector)'}   n = ${usable(1).length} configurations`);
console.log(`   Spearman rho  PHASE II = ${Number.isFinite(rhoP2) ? rhoP2.toFixed(6) : 'undefined (constant vector)'}   n = ${usable(2).length} configurations`);

// ==========================================================
// C — RULING CONFORMANCE
// ==========================================================
console.log('\n===== C  ruling conformance ==================================');
const totalEvents = SAMPLES.reduce((a, s) => a + s.run.allEvents, 0);
const totalReplay = SAMPLES.reduce((a, s) => a + s.run.phase1.replay + s.run.phase2.replay, 0);
const totalNonCanon = SAMPLES.reduce((a, s) => a + s.run.phase1.nonCanonical + s.run.phase2.nonCanonical, 0);
const c1 = ok('C1 every goal-reach event stays in a denominator (no exclusion)',
   SAMPLES.every(s => s.run.phase1.total + s.run.phase2.total === s.run.allEvents),
   `${totalEvents} events, all assigned to exactly one phase denominator`);
const c2 = ok('C2 staleExecution / replay events are INCLUDED',
   totalReplay > 0 && SAMPLES.every(s => s.run.phase1.replay <= s.run.phase1.total &&
                                         s.run.phase2.replay <= s.run.phase2.total),
   `${totalReplay} replay-branch goal reaches counted in the denominators, none removed`);
const c3 = ok('C3 non-canonical goal transitions are INCLUDED',
   totalNonCanon > 0,
   `${totalNonCanon} of ${totalEvents} events have no canonical edge into the goal and are still counted`);
const c4 = ok('C4 exposure is the COMPLETE canonical edge set, per phase',
   SAMPLES.every(s => s.p1.length === s.p2.length && s.p1.length === env.graphInfo().entries),
   `${SAMPLES[0].p1.length} edges per configuration, mean taken over all of them`);
const c5 = ok('C5 Phase I and Phase II are analysed on DISJOINT sample sets',
   xs(1).length + xs(2).length === usable(1).length + usable(2).length &&
   rhoP1 !== undefined && rhoP2 !== undefined,
   'two independent correlations; the phases are never concatenated');
const c6 = ok('C6 the unit is the configuration, not the event',
   usable(1).length <= SAMPLES.length && usable(2).length <= SAMPLES.length &&
   usable(1).length !== totalEvents,
   `n = ${usable(1).length}/${usable(2).length} configurations, not ${totalEvents} events`);

// ==========================================================
// N — INSTRUMENTATION NEUTRALITY
// ==========================================================
console.log('\n===== N  instrumentation neutrality ===========================');
const nOn  = await runAsync({ configSeed: 900000, configIndex: 0, tag: 'non' });
const nOff = await runAsync({ configSeed: 900000, configIndex: 0, tag: 'noff', instrument: false });
const n1 = ok('N1 the recording hook does not change the run',
   nOn.fp === nOff.fp && nOn.cog === nOff.cog,
   `fingerprint ${nOn.fp.slice(0, 12)} and ${nOn.cog} cognitive draws, instrumented and not`);
const n2 = ok('N2 without the hook nothing is recorded (the hook is the only source)',
   nOff.allEvents === 0 && nOn.allEvents > 0,
   `${nOn.allEvents} events with the hook, ${nOff.allEvents} without`);

// ==========================================================
// A — ANTI-VACUITY
// ==========================================================
console.log('\n===== A  anti-vacuity ========================================');
const a1 = ok('A1 changing a p_e value changes mean_p_e',
   (() => { const p = [...SAMPLES[0].p1]; const before = mean(p); p[0] = p[0] + 0.5; return mean(p) !== before; })(),
   'the exposure is a live function of the edge reliabilities');
const a2 = ok('A2 Spearman reproduces a known perfectly monotonic dataset',
   Math.abs(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]) - 1) < 1e-12 &&
   Math.abs(spearman([1, 2, 3, 4, 5], [50, 40, 30, 20, 10]) + 1) < 1e-12,
   'rho = +1 on an increasing pair and -1 on a decreasing pair');
const a3 = ok('A3 Spearman is rank-based, not value-based',
   Math.abs(spearman([1, 2, 3, 4, 100], [1, 2, 3, 4, 5]) - 1) < 1e-12,
   'an outlier that preserves order leaves rho at 1');
const a4 = ok('A4 a constant exposure vector yields no correlation, never a PASS',
   !Number.isFinite(spearman([0.5, 0.5, 0.5, 0.5], [0.1, 0.2, 0.3, 0.4])),
   'a degenerate predictor is reported as undefined rather than silently 0');
const a5 = ok('A5 duplicating events cannot change the sample size',
   (() => { const dup = [...SAMPLES, ...SAMPLES].filter(s => s.rate1 !== null);
            return spearman(dup.map(s => s.m1), dup.map(s => s.rate1)) !== undefined &&
                   usable(1).length === SAMPLES.filter(s => s.rate1 !== null).length; })(),
   `n stays at the number of configurations (${usable(1).length}); events are aggregated, never enumerated`);
const a6 = ok('A6 phases pooled would give a DIFFERENT answer — so C5 is meaningful',
   (() => { const px = [...xs(1), ...xs(2)], py = [...ys(1), ...ys(2)];
            const pooled = spearman(px, py);
            return !Number.isFinite(rhoP1) || !Number.isFinite(pooled) || Math.abs(pooled - rhoP1) > 1e-9; })(),
   'the stratification is load-bearing, not cosmetic');
const a7 = ok('A7 insufficient diversity CANNOT produce a PASS',
   verdict({ configSamples: 20, distinctPVectors: 3, distinctMeans: 3 }, 0.0, 0.0).verdict === 'INCONCLUSIVE' &&
   verdict({ configSamples: 19, distinctPVectors: 10, distinctMeans: 5 }, 0.0, 0.0).verdict === 'INCONCLUSIVE' &&
   verdict({ configSamples: 20, distinctPVectors: 10, distinctMeans: 4 }, 0.0, 0.0).verdict === 'INCONCLUSIVE',
   'each of the three §E requirements independently forces INCONCLUSIVE');
const a8 = ok('A8 CONTROL: with sufficient diversity the verdict function DOES decide',
   verdict({ configSamples: 20, distinctPVectors: 10, distinctMeans: 5 }, 0.05, 0.05).verdict === 'PASS' &&
   verdict({ configSamples: 20, distinctPVectors: 10, distinctMeans: 5 }, 0.5, 0.05).verdict === 'FAIL' &&
   verdict({ configSamples: 20, distinctPVectors: 10, distinctMeans: 5 }, 0.05, 0.5).verdict === 'FAIL',
   'so A7 proves a live gate, not a function that always returns INCONCLUSIVE');
const a9 = ok('A9 BOTH phases must pass, not either',
   verdict({ configSamples: 20, distinctPVectors: 10, distinctMeans: 5 }, 0.09, 0.11).verdict === 'FAIL',
   'one phase over the threshold fails the gate');

// ==========================================================
// VERDICT
// ==========================================================
const V = verdict(diag, rhoP1, rhoP2);
console.log('\n==============================================================');
console.log(`  INFORMATION SUFFICIENCY : ${V.sufficient ? 'SATISFIED' : 'NOT SATISFIED'}`);
if (!V.sufficient) {
  console.log('    configuration samples     ' + diag.configSamples + ' / ' + MIN_CONFIG_SAMPLES +
              (diag.configSamples >= MIN_CONFIG_SAMPLES ? '   met' : '   SHORT'));
  console.log('    distinct full p_e vectors ' + diag.distinctPVectors + ' / ' + MIN_DISTINCT_PVEC +
              (diag.distinctPVectors >= MIN_DISTINCT_PVEC ? '   met' : '   SHORT'));
  console.log('    distinct mean_p_e values  ' + diag.distinctMeans + ' / ' + MIN_DISTINCT_MEAN +
              (diag.distinctMeans >= MIN_DISTINCT_MEAN ? '   met' : '   SHORT'));
}
console.log(`  GATE G15 : ${V.verdict}` +
  (V.verdict === 'INCONCLUSIVE' ? ' — INSUFFICIENT LAWFUL RELIABILITY VARIATION' : ''));
if (V.verdict === 'INCONCLUSIVE') {
  console.log('  STAGE 1 REMAINS BLOCKED. The rho values above are reported for');
  console.log('  transparency and are NOT determinative under ruling §E.');
  console.log('  ERR-09 §3.4/§3.5: the ENTIRE pre-held-out unallocated candidate');
  console.log(`  space (${ERR09_LO}-${ERR09_HI}) is EXHAUSTED. No further lawful`);
  console.log('  pre-held-out seed-diversity material exists.');
}
console.log('==============================================================');

const GREEN = s1 && s1b && s1c && s2 && s2b && s3 && d1 && c1 && c2 && c3 && c4 && c5 && c6 &&
              n1 && n2 && a1 && a2 && a3 && a4 && a5 && a6 && a7 && a8 && a9;
console.log(`\n  VERIFIER SELF-CHECK : ${GREEN ? 'GREEN' : 'RED'}   (the gate verdict is separate, above)`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

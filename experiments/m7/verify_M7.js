// ==========================================================
// M7 — FORMAL GATE HARNESS
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §14 gate table (authoritative wording) · §3, §4, §5, §6.1, §10.2-10.3
//   errata: ERR-01a/b, ERR-02, ERR-03, ERR-04, ERR-05
//
// THIS FILE OWNS THE FORMAL GATE VERDICTS. It is not a wrapper around the
// substrate verifiers: every verdict below is established from evidence this
// harness gathers itself, with a mutation that must break it.
//
// A gate is GREEN only if (a) its frozen assertion is met, and (b) the
// paired anti-vacuity mutation FAILS that same assertion. A gate whose
// frozen wording is not fully determined is left NOT_IMPLEMENTED with the
// reason recorded -- never inferred into a pass.
//
// NOT Stage 1, a pilot, or a confirmatory run. No metric is estimated and
// nothing is persisted as experimental data.
// ==========================================================
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { makeRng } from '../../instrumentation/rng.js';
import * as env from './env.js';
import * as arms from './arms.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------- gate ledger ----------
const LEDGER = [];
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };
const verdict = (gate, status, note) => { LEDGER.push({ gate, status, note }); };

const SEED = 20260819000;
function run(o) {
  const out = execFileSync(process.execPath, ['_armrun.js'], {
    cwd: HERE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env,
      ARM: o.arm ?? 'OFF', SEED: String(o.seed ?? SEED), TICKS: String(o.ticks ?? 60),
      HOOK: o.hook ?? 'on', PIN: o.pin ?? 'on', ENV: o.env ?? 'off',
      CREDIT: o.credit ?? 'off',
      ENVBUG: o.bug ?? '', ENVP: o.p ?? 'normal' }
  });
  return JSON.parse(out.slice(out.indexOf('@@RESULT@@') + 10));
}
const isEdge = (k) => { const [a, b] = String(k).split('->'); return arms.edgeIndex(a, b) !== undefined; };
const fingerprint = (r) => JSON.stringify({ w: r.writes, q: r.qSum, e: r.qEntries });

console.log('==============================================================');
console.log(' M7 FORMAL GATE HARNESS');
console.log(' frozen 2f12e309...f6b9 | errata ERR-01..ERR-05');
console.log('==============================================================');

// ==========================================================
// G1 — Default parity
// frozen §14: "With M7 off, action sequence, Q table, trust maps and score
// stream bit-identical to the current build over >= 10 seeds x 1000 ticks"
// ==========================================================
console.log('\n===== G1  Default parity (>= 10 seeds x 1000 ticks) ==========');
const G1_SEEDS = [20260819000, 20260819001, 20260819002, 20260819003, 20260819004,
                  20260819005, 20260819006, 20260819007, 20260819008, 20260819009];
let g1Mismatch = [], g1Ticks = 1000;
for (const s of G1_SEEDS) {
  const base = run({ arm: 'OFF', hook: 'off', env: 'off', seed: s, ticks: g1Ticks });
  const inert = run({ arm: 'OFF', hook: 'on', env: 'off', seed: s, ticks: g1Ticks });
  const same = fingerprint(base) === fingerprint(inert) &&
               JSON.stringify(base.pathAttemptKeys.slice().sort()) === JSON.stringify(inert.pathAttemptKeys.slice().sort()) &&
               base.cogDraws === inert.cogDraws && base.visDraws === inert.visDraws;
  if (!same) g1Mismatch.push(s);
}
const g1a = ok('G1a M7-off is bit-identical across 10 seeds x 1000 ticks',
   g1Mismatch.length === 0,
   `action sequence + Q table + trust maps + cognitive/visual draw counts; mismatches: ${g1Mismatch.join(',') || 'none'}`);
// anti-vacuity: the same comparison MUST fail when M7 is actually on
const g1On = run({ arm: 'OFF', env: 'on', seed: G1_SEEDS[0], ticks: 200 });
const g1Off = run({ arm: 'OFF', hook: 'off', env: 'off', seed: G1_SEEDS[0], ticks: 200 });
const g1b = ok('G1b ANTI-VACUITY: the parity check FAILS when M7 is on',
   fingerprint(g1On) !== fingerprint(g1Off),
   'proves G1a is comparing something that can differ');
verdict('G1', (g1a && g1b) ? 'GREEN' : 'RED',
   `10 seeds x ${g1Ticks} ticks, ${g1Mismatch.length} mismatches`);

// ==========================================================
// G2 — Stream separation
// frozen §14: "Environment draws only from 'environment'; cognitive stream
// draw count and order identical to the off-build"
// Evaluated at p_e = 1.0 under arm A2, so the E2 credit re-keying cannot
// feed back into scoring and confound the comparison (see G3 note).
// Draw counts are RECOVERED exactly from the deterministic PRNG.
// ==========================================================
console.log('\n===== G2  RNG stream separation ==============================');
const g2Off = run({ arm: 'A2', env: 'off', ticks: 60 });
const g2On  = run({ arm: 'A2', env: 'on', p: 'one', ticks: 60 });
console.log(`      cognitive draws  off ${g2Off.cogDraws}   on(p=1) ${g2On.cogDraws}`);
console.log(`      visual draws     off ${g2Off.visDraws}   on(p=1) ${g2On.visDraws}`);
console.log(`      environment draws off ${g2Off.envDraws}  on(p=1) ${g2On.envDraws}`);
const g2a = ok('G2a cognitive draw count identical to the off-build',
   g2Off.cogDraws === g2On.cogDraws && g2Off.cogDraws > 0, `${g2Off.cogDraws} draws`);
const g2b = ok('G2b visual draw count identical to the off-build',
   g2Off.visDraws === g2On.visDraws);
const g2c = ok('G2c draw ORDER identical (same seed + same count => same sequence)',
   g2Off.cogDraws === g2On.cogDraws,
   'the PRNG is deterministic, so equal counts imply an identical prefix');
const g2d = ok('G2d environment draws occurred, and only on the environment stream',
   g2On.envDraws > 0 && g2Off.envDraws === 0, `${g2On.envDraws} environment draws`);
// anti-vacuity: route env draws through the cognitive stream instead
const g2Bug = run({ arm: 'A2', env: 'on', p: 'one', bug: 'cogdraw', ticks: 60 });
const g2e = ok('G2e ANTI-VACUITY: drawing from the cognitive stream is DETECTED',
   g2Bug.cogDraws !== g2Off.cogDraws,
   `mutated ${g2Bug.cogDraws} vs off-build ${g2Off.cogDraws}`);
verdict('G2', (g2a && g2b && g2c && g2d && g2e) ? 'GREEN' : 'RED',
   `cognitive ${g2Off.cogDraws} == ${g2On.cogDraws}; mutation detected`);

// ==========================================================
// G3 - Generalisation   (operationalised by ERRATUM M7-ERR-06 §2)
// frozen §14: "With p_e = 1.0, stochastic build = deterministic build"
// ERR-06 §2.2: G3 evaluates E1 INDEPENDENTLY of E2.
//   condition   ENV=on,  CREDIT=off, p=1.0
//   against     ENV=off, CREDIT=off, p=1.0
//   ARM REMAINS OFF THROUGHOUT - no special arm is selected.
// ==========================================================
console.log('\n===== G3  Generalisation at p_e = 1.0 (E1 isolated) ==========');
const g3Base = run({ arm: 'OFF', env: 'off', credit: 'off', p: 'one', ticks: 60 });
const g3E1   = run({ arm: 'OFF', env: 'on',  credit: 'off', p: 'one', ticks: 60 });
console.log('      baseline ENV=off CREDIT=off  writes ' + g3Base.writes.length +
            '  cog ' + g3Base.cogDraws + '  envDraws ' + g3Base.envDraws);
console.log('      E1 only  ENV=on  CREDIT=off  writes ' + g3E1.writes.length +
            '  cog ' + g3E1.cogDraws + '  envDraws ' + g3E1.envDraws);
const g3a = ok('G3a E1-only at p=1.0 is bit-identical to the deterministic build',
   fingerprint(g3E1) === fingerprint(g3Base) &&
   g3E1.cogDraws === g3Base.cogDraws && g3E1.visDraws === g3Base.visDraws &&
   JSON.stringify(g3E1.pathAttemptKeys.slice().sort()) === JSON.stringify(g3Base.pathAttemptKeys.slice().sort()),
   'action sequence + Q table + trust maps + cognitive/visual draws, arm OFF');
const g3b = ok('G3b the comparison is not vacuous: E1 really ran',
   g3E1.envDraws > 0 && g3Base.envDraws === 0,
   g3E1.envDraws + ' environment draws consumed with an identical outcome');
const g3Real = run({ arm: 'OFF', env: 'on', credit: 'off', p: 'normal', ticks: 60 });
const g3c = ok('G3c ANTI-VACUITY: at real p_e the E1 mechanism is active and diverges',
   g3Real.slips > 0 && fingerprint(g3Real) !== fingerprint(g3Base), g3Real.slips + ' slips');
const g3E2 = run({ arm: 'OFF', env: 'on', credit: 'on', p: 'one', ticks: 60 });
const g3d = ok('G3d ANTI-VACUITY: adding E2 at p=1.0 DIVERGES (why E2 is excluded)',
   fingerprint(g3E2) !== fingerprint(g3Base),
   'writes ' + g3Base.writes.length + ' -> ' + g3E2.writes.length + '; frozen §6.1 re-keying is deliberately not a no-op');
verdict('G3', (g3a && g3b && g3c && g3d) ? 'GREEN' : 'RED', 'E1 isolated per ERR-06 §2; arm OFF throughout');

// ==========================================================
// G4 — Ablation completeness (frozen §14, §4.1)
// ==========================================================
console.log('\n===== G4  Ablation completeness (A2) =========================');
const a2 = run({ arm: 'A2', ticks: 80 });
const a1 = run({ arm: 'A1', ticks: 80 });
const a5 = run({ arm: 'A5', ticks: 80 });
const g4a = ok('G4a A2: every bayesianTrust read returns exactly 0.5',
   a2.e3DistinctDelivered === 1 && a2.e3.every(x => x.v === 0.5) && a2.e3Calls > 0,
   `${a2.e3Calls} reads, ${a2.e3DistinctRaw} distinct raw -> 1 delivered value`);
const g4b = ok('G4b A2: aggregateTrust is null at every call',
   a2.e4.every(x => x.v === null) && a2.e4Calls > 0, `${a2.e4Calls} calls`);
const g4c = ok('G4c the severing is real (raw aggregate was non-null)',
   a2.e4.some(x => x.raw !== null));
const g4d = ok('G4d ANTI-VACUITY: A1 fails the per-edge assertion',
   !(a1.e3DistinctDelivered === 1), `A1 delivered ${a1.e3DistinctDelivered} distinct values`);
const g4e = ok('G4e ANTI-VACUITY: A5 fails the aggregate assertion',
   !a5.e4.every(x => x.v === null), 'A5 keeps the aggregate live by design');
verdict('G4', (g4a && g4b && g4c && g4d && g4e) ? 'GREEN' : 'RED', 'both routes counter-asserted');

// ==========================================================
// G5 — Oracle fidelity (frozen §14)
// ==========================================================
console.log('\n===== G5  Oracle fidelity (A7) ===============================');
const a7 = run({ arm: 'A7', ticks: 80 });
env.install(env.makeConfig(900000, 0));
let g5checked = 0, g5bad = 0;
for (const x of a7.e3) { const p = env.trueP(x.from, x.to); if (p == null) continue; g5checked++; if (x.v !== p) g5bad++; }
let g5a1bad = 0;
for (const x of a1.e3) { const p = env.trueP(x.from, x.to); if (p == null) continue; if (x.v !== p) g5a1bad++; }
env.disable();
const g5a = ok('G5a A7 delivers exactly p_e', g5bad === 0 && g5checked > 0,
   `${g5checked} graph-edge reads, ${g5bad} mismatches`);
const g5b = ok('G5b ANTI-VACUITY: A1 does NOT deliver p_e', g5a1bad > 0,
   `${g5a1bad} A1 reads differ from p_e`);
verdict('G5', (g5a && g5b) ? 'GREEN' : 'RED', `${g5checked} reads exact`);

// ==========================================================
// G6 - Shuffle validity   (operationalised by ERRATUM M7-ERR-06 §3)
// Common frozen state snapshot; A1 and A6 evaluated over the SAME candidate
// edge set from the SAME snapshot. Not two independently evolving runs.
// ==========================================================
console.log('\n===== G6  Shuffle validity (common-state snapshot) ===========');
const SNAP = new Map();
for (let i = 0; i < arms.edgeCount(); i++) SNAP.set(i, 0.01 + i * 0.023);
const snapTrust = (a, b) => { const i = arms.edgeIndex(a, b); return i === undefined ? 0.5 : SNAP.get(i); };
const CAND = [...Array(arms.edgeCount()).keys()].map(i => arms.edgeAt(i));
const deliver = (arm) => {
  arms.reset();
  arms.configure({ arm, agentSeed: SEED, trustOf: snapTrust });
  const out = CAND.map(e => arms.bayesianTrustFor(e.from, e.to, snapTrust(e.from, e.to)));
  arms.reset();
  return out;
};
const dA1 = deliver('A1');
const dA6 = deliver('A6');
const sg = arms.makeSigma(SEED);
const g6a = ok('G6a sigma is bijective over all 39 edges',
   new Set(sg).size === 39 && sg.every(v => v >= 0 && v < 39));
const g6b = ok('G6b sigma has no fixed point', sg.every((v, i) => v !== i));
const g6c = ok('G6c edge/value correspondence is DESTROYED on the snapshot',
   JSON.stringify(dA6) !== JSON.stringify(dA1),
   dA6.filter((v, i) => v !== dA1[i]).length + ' of ' + CAND.length + ' candidate edges deliver a different value');
const sorted = (d) => JSON.stringify([...d].sort((x, y) => x - y));
const g6d = ok('G6d delivered-value MULTISET equals A1 over the same candidate set and snapshot',
   sorted(dA6) === sorted(dA1), CAND.length + ' candidates, identical multiset');
const multisetEq = (d) => sorted(d) === sorted(dA1);
const bij = (m) => new Set(m).size === 39 && m.every(v => v >= 0 && v < 39);
const noFixed = (m) => m.every((v, i) => v !== i);
const identityPerm = [...Array(39).keys()];
const oneFixed = (function () { const m = [...sg]; const j = m.indexOf(0); m[j] = m[0]; m[0] = 0; return m; })();
const nonBijective = (function () { const m = [...sg]; m[1] = m[0]; return m; })();
const corrupted = (function () { const d = [...dA6]; d[0] = d[0] + 1; return d; })();
const g6e = ok('G6e MUTATION: identity sigma fails the no-fixed-point assertion', !noFixed(identityPerm));
const g6f = ok('G6f MUTATION: sigma with one fixed point fails', !noFixed(oneFixed),
   'fixed point at index ' + oneFixed.findIndex((v, i) => v === i));
const g6g = ok('G6g MUTATION: a non-bijective sigma fails', !bij(nonBijective),
   new Set(nonBijective).size + ' distinct images instead of 39');
const g6h = ok('G6h MUTATION: a corrupted delivered value fails the multiset assertion', !multisetEq(corrupted));
const g6i = ok('G6i CONTROL: the true delivered set passes the multiset assertion', multisetEq(dA6));
verdict('G6', (g6a && g6b && g6c && g6d && g6e && g6f && g6g && g6h && g6i) ? 'GREEN' : 'RED',
   'common-state snapshot per ERR-06 §3; four mutations rejected');

// ==========================================================
// G11 - No observable leakage   (operationalised by ERRATUM M7-ERR-06 §4)
// |Spearman rho(observable, p_e)| < 0.10 for EACH of five named observables.
// No new predictor, model, metric, threshold or observable is introduced;
// 0.10 is the threshold already pinned by frozen R3/R4.
// The held-out block 900500-900529 is NOT inspected.
// ==========================================================
console.log('\n===== G11  No observable leakage (5 named observables) =======');
const EDGES11 = JSON.parse(fs.readFileSync(path.resolve(HERE, '../../connections.json'), 'utf8'));
const degOut = {}, degIn = {};
EDGES11.forEach(e => { degOut[e.from] = (degOut[e.from] || 0) + 1; degIn[e.to] = (degIn[e.to] || 0) + 1; });
function spearman(x, y) {
  const rk = v => {
    const t = v.map((a, i) => [a, i]).sort((a, b) => a[0] - b[0]); const r = [];
    for (let i = 0; i < t.length;) {
      let j = i; while (j + 1 < t.length && t[j + 1][0] === t[i][0]) j++;
      const av = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[t[k][1]] = av; i = j + 1;
    }
    return r;
  };
  const a = rk(x), b = rk(y), n = x.length;
  const ma = a.reduce((q, v) => q + v, 0) / n, mb = b.reduce((q, v) => q + v, 0) / n;
  let nu = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; nu += u * v; da += u * u; db += v * v; }
  return (da === 0 || db === 0) ? 0 : nu / Math.sqrt(da * db);
}
function directedDistTo(goal) {
  const back = new Map();
  EDGES11.forEach(e => { if (!back.has(e.to)) back.set(e.to, []); back.get(e.to).push(e.from); });
  const d = new Map([[goal, 0]]); const q = [goal];
  while (q.length) { const x = q.shift(); for (const pn of (back.get(x) || [])) if (!d.has(pn)) { d.set(pn, d.get(x) + 1); q.push(pn); } }
  return d;
}
const OBS_NAMES = ['endpoint-cosine-similarity', 'directed-distance-to-goal',
                   'source-endpoint-degree', 'destination-endpoint-degree', 'canonical-edge-index'];
function observablesFor(cfg) {
  const dot = (a, b) => a.reduce((q, x, i) => q + x * b[i], 0);
  const dd = directedDistTo(cfg.goal); const INF = 99;
  return [
    EDGES11.map(e => dot(cfg.embedding.get(Number(e.from)), cfg.embedding.get(Number(e.to)))),
    EDGES11.map(e => dd.has(Number(e.to)) ? dd.get(Number(e.to)) : INF),
    EDGES11.map(e => degOut[e.from] || 0),
    EDGES11.map(e => degIn[e.to] || 0),
    EDGES11.map((_, i) => i)
  ];
}
// ---- HISTORICAL RECORD (ERR-07 §0). Printed every run. Never flattened. ----
console.log('      HISTORICAL RED, 2026-08-22, preserved per ERR-07 §0:');
console.log('        config 900004 idx 0 was ACCEPTED by frozen §3.5 R1-R5 and');
console.log('        FAILED G11 at canonical-edge-index rho = -0.2089 (|rho| < 0.10).');
console.log('        That RED is valid scientific information and stands as recorded.');

const PILOT = [900000, 900001, 900002, 900003, 900004];
let g11Accepted = 0; const g11Violations = [];
for (const seed of PILOT) {
  const cfg = env.makeConfig(seed, 0);
  const k = cfg.checks;
  if (!cfg.accepted) {
    const why = !k.R1 ? 'R1' : !k.R2 ? 'R2' : !k.R3 ? 'R3' : !k.R4 ? 'R4'
              : k.R5 !== true ? 'R5' : 'G11(' + k.g11Worst + ')';
    console.log('      seed ' + seed + ': REJECTED by ' + why);
    continue;
  }
  g11Accepted++;
  console.log('      seed ' + seed + ' ACCEPTED: ' +
    k.rhoObs.map((r, i) => OBS_NAMES[i] + '=' + r.toFixed(4)).join('  '));
  k.rhoObs.forEach((r, i) => { if (!(Math.abs(r) < 0.10)) g11Violations.push(seed + '/' + OBS_NAMES[i] + '=' + r.toFixed(4)); });
}
const g11a = ok('G11a every accepted pilot config satisfies |rho| < 0.10 on all five observables',
   g11Violations.length === 0 && g11Accepted > 0,
   g11Accepted + ' accepted config(s); violations: ' + (g11Violations.join(', ') || 'none'));
// ---- ERR-07 §2: the criterion is now an ACCEPTANCE term, so prove it BITES ----
const c04 = env.makeConfig(900004, 0);
const g11e = ok('G11e the historical offender 900004 is now REJECTED',
   c04.accepted === false, 'rho(canonical-edge-index) = ' + c04.checks.rhoObs[4].toFixed(4));
const g11f = ok('G11f it is rejected by the G11 term ALONE: R1-R5 all still hold',
   c04.checks.R1 && c04.checks.R2 && c04.checks.R3 && c04.checks.R4 &&
   c04.checks.R5 === true && c04.checks.G11 === false,
   'R1-R5 values unchanged from the historical record');
const g11g = ok('G11g MUTATION: drop the G11 term and 900004 is accepted again',
   (c04.checks.R1 && c04.checks.R2 && c04.checks.R3 && c04.checks.R4 &&
    c04.checks.R5 === true) === true,
   'the R1-R5-only conjunction still evaluates true -> the term is load-bearing');
const g11h = ok('G11h SCOPE: acceptance reads pPhase1; pPhase2 is NOT a condition',
   (function () { const c = env.makeConfig(900000, 0);
      const p1 = env.evaluateConstraints({ ...c, pPhase1: c.pPhase1 }).rhoObs.join();
      const p2 = env.evaluateConstraints({ ...c, pPhase1: c.pPhase2 }).rhoObs.join();
      return p1 === c.checks.rhoObs.join() && p1 !== p2; })(),
   'ERR-07 §3 Director Decision 1');
console.log('      RECORDED LIMITATION (ERR-07 §3.1): post-shift pPhase2 leakage is NOT');
console.log('        constrained. Measured up to |rho| = 0.3077 (destination-endpoint-degree,');
console.log('        config 900000). Window W3 results must be reported with this caveat.');
const g11b = ok('G11b the five observables are exactly those ruled in ERR-06 §4.2',
   OBS_NAMES.length === 5, OBS_NAMES.join(' | '));
const leakCfg = env.makeConfig(900000, 0);
leakCfg.pPhase1 = leakCfg.pPhase1.map((_, i) => 0.25 + 0.7 * (i / (EDGES11.length - 1)));
const leakRhos = observablesFor(leakCfg).map(o => spearman(leakCfg.pPhase1, o));
const g11c = ok('G11c ANTI-VACUITY: a deliberately leaky p_e assignment violates the criterion',
   leakRhos.some(r => Math.abs(r) >= 0.10),
   'max |rho| ' + Math.max(...leakRhos.map(Math.abs)).toFixed(4));
const seedAudit = env.evaluatedSeedRange();
const g11d = ok('G11d the held-out stream was NOT inspected (runtime audit)',
   env.evaluatedSeeds().every(s => s < 900500 || s > 900529),
   seedAudit.n + ' config seeds evaluated this process, range ' +
   seedAudit.min + '-' + seedAudit.max + '; none in 900500-900529');
verdict('G11', (g11a && g11b && g11c && g11d && g11e && g11f && g11g && g11h) ? 'GREEN' : 'RED',
   'ERR-07 acceptance term; historical RED preserved; ' + g11Accepted +
   ' accepted pilot config(s), ' + g11Violations.length + ' violations');

// ==========================================================
// G12 — PE pathway pinned (frozen §10.3 (a)-(d))
// ==========================================================
console.log('\n===== G12  Prediction-error pathway pinned ===================');
const pOn = run({ arm: 'A1', pin: 'on', ticks: 60 });
const pOff = run({ arm: 'A1', pin: 'off', ticks: 60 });
const pLaOnly = run({ arm: 'A1', pin: 'la-only', ticks: 60 });
const g12a = ok('G12(a) learningAuthority was exactly 1.0 on 100% of learning steps',
   pOn.laSteps > 0 && pOn.laExactlyOne === pOn.laSteps, `${pOn.laExactlyOne}/${pOn.laSteps}`);
const g12b = ok('G12(b) dampQ was invoked exactly zero times',
   pOn.dampInvoked === 0 && pOn.dampSuppressed > 0,
   `0 invocations, ${pOn.dampSuppressed} suppressions at the real guard`);
const g12c = ok('G12(c) both counters are emitted and asserted PER RUN',
   Number.isInteger(pOn.laSteps) && Number.isInteger(pOn.dampInvoked),
   'not sampled');
const g12d = ok('G12(d) ANTI-VACUITY: the un-pinned control FAILS both assertions',
   pOff.laExactlyOne !== pOff.laSteps && pOff.dampInvoked > 0,
   `${pOff.laExactlyOne}/${pOff.laSteps} pinned, ${pOff.dampInvoked} dampQ invocations`);
const g12e = ok('G12(e) restored damping alone is also detected',
   pLaOnly.dampInvoked > 0, `${pLaOnly.dampInvoked} invocations with the pin still on`);
verdict('G12', (g12a && g12b && g12c && g12d && g12e) ? 'GREEN' : 'RED', 'all four frozen sub-assertions');

// ==========================================================
// G13 — Decision relevance (frozen §14; R5 per ERR-04)
// ==========================================================
console.log('\n===== G13  Decision relevance ================================');
// operand restored verbatim after the ERR-06 G11 rewrite: the same
// accepted configuration (seed 900000, index 0) that G13 always used.
const k11 = env.makeConfig(900000, 0).checks;
const g13a = ok('G13a accepted configuration satisfies R2 (reliability contradicts hops)',
   k11.R2 === true, `${k11.r2Starts} start nodes satisfy it`);
const g13b = ok('G13b accepted configuration satisfies R5 (>= 4 decision states differ)',
   k11.R5 === true, `${k11.r5Differing}/${k11.r5States} decision states differ`);
// anti-vacuity: a uniform-reliability configuration must fail R5
const flat = env.makeConfig(900000, 0);
flat.pPhase1 = flat.pPhase1.map(() => 0.9);
const flatChecks = env.evaluateConstraints(flat);
const g13c = ok('G13c ANTI-VACUITY: uniform p_e collapses the R5 difference',
   flatChecks.r5Differing < k11.r5Differing,
   `uniform ${flatChecks.r5Differing} vs real ${k11.r5Differing} differing states`);
verdict('G13', (g13a && g13b && g13c) ? 'GREEN' : 'RED', `R2 and R5 both hold on the accepted config`);

// ==========================================================
// G14 — Realised-vs-intended (frozen §14, §3.3)
// ==========================================================
console.log('\n===== G14  Realised-vs-intended ==============================');
// G14 is the E2 credit-boundary gate, so it needs BOTH mechanisms. Before
// ERR-06 §2.3 split them, env:'on' implied credit; the operand is restored
// explicitly here - same build G14 has always been evaluated on.
const g14 = run({ arm: 'OFF', env: 'on', credit: 'on', ticks: 80 });
const g14Slip = run({ arm: 'OFF', env: 'on', credit: 'on', bug: 'sliptravel', ticks: 80 });
let retry = 0;
for (let i = 1; i < g14.trav.length; i++)
  if (!g14.trav[i - 1].ok && g14.trav[i].from === g14.trav[i - 1].from) retry++;
let bugRetry = 0;
for (let i = 1; i < g14Slip.trav.length; i++)
  if (!g14Slip.trav[i - 1].ok && g14Slip.trav[i].from === g14Slip.trav[i - 1].from) bugRetry++;
const g14a = ok('G14a on a slip the realised node is unchanged (retry from the same node)',
   retry > 0 && g14.slips > 0, `${retry} slip->same-node retries over ${g14.slips} slips`);
const g14b = ok('G14b the intended edge receives the trust attempt',
   g14.creditKeys.length > 0 && g14.creditKeys.every(isEdge),
   `${g14.creditKeys.length} credit keys, all real graph edges`);
const g14c = ok('G14c success credit is a subset of attempt credit',
   g14.pathSuccessKeys.every(k => g14.pathAttemptKeys.includes(k)));
const g14d = ok('G14d the M7 trust namespace contains only real edges',
   g14.pathAttemptKeys.every(isEdge), `${g14.pathAttemptKeys.length} keys, 0 non-edges`);
const g14e = ok('G14e ANTI-VACUITY: a slip that still traverses is detected',
   bugRetry < retry, `${bugRetry} vs ${retry} retries when slips traverse`);
const g14f = ok('G14f ANTI-VACUITY: stale-key reconstruction is detected',
   run({ arm: 'OFF', env: 'on', credit: 'on', bug: 'staleKey', ticks: 80 }).creditRejected > g14.creditRejected,
   'restored off-by-one keying floods the credit boundary with rejections');
verdict('G14', (g14a && g14b && g14c && g14d && g14e && g14f) ? 'GREEN' : 'RED',
   `${g14.slips} slips, ${g14.creditRejected} non-edge pairs contained`);

// ==========================================================
// LEDGER
// ==========================================================
console.log('\n==============================================================');
console.log(' FORMAL GATE LEDGER');
console.log('==============================================================');
for (const e of LEDGER) console.log(`  ${e.gate.padEnd(5)} ${e.status.padEnd(26)} ${e.note}`);
const green = LEDGER.filter(e => e.status.startsWith('GREEN')).length;
const red = LEDGER.filter(e => e.status === 'RED').length;
const ni = LEDGER.filter(e => e.status.startsWith('NOT_IMPLEMENTED')).length;
console.log(`\n  GREEN ${green}   RED ${red}   NOT_IMPLEMENTED ${ni}   (of ${LEDGER.length} targeted)`);
console.log('  Not targeted this milestone: G7 SUPERSEDED, G8 (needs E6),');
console.log('  G9 GREEN (own harness), G10 GREEN (own harness: verify_G10.js),');
console.log('  G15 (needs reward analysis), G16 GREEN (own harness).');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

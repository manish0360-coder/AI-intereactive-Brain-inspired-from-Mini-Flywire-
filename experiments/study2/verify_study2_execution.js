// ==========================================================
// STUDY-2 EXECUTION GATE — the executed block, its analysis, the registry update, and historical flips
// ==========================================================
// Verifies, from committed evidence only:
//   E  execution integrity: registration -> plan (before any run) -> 16 slots once each -> replay -> integrity record
//   A  the frozen analysis, recomputed from the run artifacts with the frozen primitives (reproduction only)
//   I  that the results document states exactly what the frozen §V/§W rules permit, and nothing stronger
//   R  that the seed registry now refuses the consumed block, and nothing else changed at the typed layer
//   H  that every historical gate which changes its verdict does so for a named, expected reason
//   S  scope: production, historical experiments, the driver and the readiness apparatus unchanged
// Anti-vacuity: the E/A checks are pure functions, and in-memory mutants of the evidence must each be rejected by
// the named check. Reproduction regenerates the 16 accepted configurations of the consumed block (a verifier
// reproducing an existing result, which the registry convention permits); it generates no new seed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIR = path.join(HERE, 'execution');
const DRIVER_COMMIT = 'd846fbdbee10332f85ce75bbbce619e3aa5bcddf';
const PROD_BASE = 'a066d47696b1502720f627855c8549f4d2898cd5';
const MANIFEST = '727193a8556493b589cbd50bf15377e25ed3667e21efa64e404b89ce10875687';
const BLOCK = { lo: 890000, hi: 892999 };
const RESULTS_REL = 'research/preregistrations/FUTURESCORE_V2_3_STUDY2_RESULTS.md';
const DOC_REL = 'research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const U = (f) => pathToFileURL(path.join(ROOT, f)).href;

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(6)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
console.log('='.repeat(78)); console.log('  STUDY-2 EXECUTION GATE (reproduces the executed block; generates no seed)'); console.log('='.repeat(78));

const T = await import(U('experiments/study2/taub.mjs'));
const CAP = await import(U('experiments/study2/capture.mjs'));
const MAN = await import(U('experiments/study2/manifest.mjs'));
const typed = await import(U('experiments/registry/typed.js'));
const C1LINK = await import(U('experiments/registry/consumed_after_c1.js'));
const S2LINK = await import(U('experiments/registry/consumed_after_study2.js'));
const env = await import(U('experiments/m7/env.js'));

const regText = read('experiments/study2/STUDY2_REGISTRATION.json');
const REG = JSON.parse(regText);
const planBytes = fs.readFileSync(path.join(DIR, 'PLAN.json'));
const PLAN = JSON.parse(planBytes);
const LEDGER = JSON.parse(fs.readFileSync(path.join(DIR, 'LEDGER.json'), 'utf8'));
const REPLAY = JSON.parse(fs.readFileSync(path.join(DIR, 'REPLAY.json'), 'utf8'));
const AN = JSON.parse(fs.readFileSync(path.join(DIR, 'ANALYSIS.json'), 'utf8'));
const ARTS = LEDGER.map((e) => { const b = fs.readFileSync(path.join(DIR, e.summary.artifact)); return { bytes: b, a: JSON.parse(b) }; });

// ---------------- pure checks (reused by the mutants) ----------------
const GOALS = [8, 12, 16, 19];
export function checkPlan(plan) {
  const req = plan.requested;
  const byIndex = new Map();
  for (const r of req) (byIndex.get(r.configIndex) || byIndex.set(r.configIndex, []).get(r.configIndex)).push(r.seed);
  const slotsOk = plan.slots.length === 16 && plan.slots.every((s, i) => {
    const g = byIndex.get(i) || [];
    return s.slot === i && s.configIndex === i && s.goal === GOALS[i % 4] && g[0] === s.startingSeed && g[g.length - 1] === s.acceptedSeed
      && s.rejectionCount === g.length - 1 && s.rejected.length === g.length - 1 && s.rejected.every((r, j) => r.seed === g[j] && r.failed.length > 0);
  });
  return slotsOk && req.length > 0 && req[0].seed === BLOCK.lo && req.every((r, i) => (i === 0 || r.seed === req[i - 1].seed + 1) && r.seed >= BLOCK.lo && r.seed <= BLOCK.hi)
    && req.every((r, i) => i === 0 || r.configIndex >= req[i - 1].configIndex)
    && GOALS.every((g) => plan.slots.filter((s) => s.goal === g).length === 4)
    && plan.seedCensus.n === req.length && plan.seedCensus.min === BLOCK.lo && plan.seedCensus.max === req[req.length - 1].seed
    && plan.nextUnrequestedSeed === req[req.length - 1].seed + 1;
}
const EVENT_KEYS = ['fullEqLive', 'geoEqNegD', 'liveUnchanged', 'snapUnchanged', 'shadowInInvocation', 'shadowBeforeDecision', 'snapUnboundAfter'];
export function checkRuns(plan, planSha, regSha, ledger, arts) {
  if (ledger.length !== plan.slots.length || arts.length !== ledger.length) return false;
  return ledger.every((e, i) => {
    const s = plan.slots[i], { bytes, a } = arts[i], p = a.provenance;
    const ev = a.events, vec = a.vectors;
    return e.slot === i && e.exitCode === 0 && e.status === 'completed' && !e.reexecution && sha(bytes) === e.summary.artifactSha256
      && p.planSha256 === planSha && p.registrationSha256 === regSha && p.slot === i && p.acceptedSeed === s.acceptedSeed && p.configSeed === s.acceptedSeed
      && p.configIndex === s.configIndex && p.goal === s.goal && p.rejectionCount === s.rejectionCount && p.slotStartingSeed === s.startingSeed
      && JSON.stringify(p.seedsTouched) === JSON.stringify([s.acceptedSeed]) && p.driverManifestSha256 === MANIFEST && p.study2DriverTreeClean === true
      && p.study2DriverCommit === DRIVER_COMMIT && p.productionTreeMatchesBaseline === true && p.productionBaselineCommit === PROD_BASE
      && a.status === 'completed' && a.integrityFailures.length === 0 && a.maxEventsPerStep === 1
      && sha(JSON.stringify({ events: ev, vectors: vec, tickLog: a.tickLog, fingerprint: a.fingerprint })) === p.evidenceIntegritySha256
      && ev.length === p.eventCount && vec.length === ev.length && ev.length > 0
      && ev.every((x) => EVENT_KEYS.every((k) => x[k] === true) && Object.values(x.idCheck).every((v) => v === true) && x.goalCount === 1)
      && vec.every((v, j) => v.tau === ev[j].t - 5 && v.goal === s.goal && CAP.rawHashOfVector(v) === ev[j].rawHash);
  });
}
// the frozen per-run computation, recomputed: Delta(e) with the frozen primitives; windows tau <= 1500 (pPhase1) / > 1500 (pPhase2)
export function recomputeRun(a, C1, C2) {
  const pri = [], post = [], sens = [];
  for (const v of a.vectors) {
    if (v.k.length < 2) continue;
    const full = v.full.map(CAP.decScore), geo = v.geo.map(CAP.decScore);
    const C = v.tau <= 1500 ? C1 : C2, u = v.k.map((k) => -C.get(k));
    const d = T.deltaEvent(full, geo, u);
    if (v.tau <= 1500) { pri.push(d); if (T.tauB(full, u).status === 'ok' && T.tauB(geo, u).status === 'ok') sens.push(d); } else post.push(d);
  }
  return { deltaR: T.median(pri), sensitivity: sens.length ? T.median(sens) : null, postShift: post.length ? T.median(post) : null, nPrimary: pri.length };
}

// ---------------- E: execution integrity ----------------
section('E   execution integrity');
const regSha = sha(regText), planSha = sha(planBytes);
ok('E1', REG.runCount === 16 && REG.seedBlock.lo === BLOCK.lo && REG.seedBlock.hi === BLOCK.hi && REG.driverManifestSha256 === MANIFEST && REG.agentSeed === 20260819000
  && /2026-09-26/.test(REG.authorization) && /HALTS the block/.test(REG.authorization) && PLAN.registrationSha256 === regSha,
  `registration: block ${BLOCK.lo}-${BLOCK.hi}, 16 runs, agentSeed 20260819000, manifest ${MANIFEST.slice(0, 12)}…, halt rule recorded; plan pins it (${regSha.slice(0, 12)}…)`);
ok('E2', checkPlan(PLAN), `plan: ${PLAN.requested.length} seeds requested strictly ascending from ${BLOCK.lo} (to ${PLAN.seedCensus.max}), inside the block; 16 slots, 4 per goal; every rejection recorded`);
ok('E3', ARTS.every(({ a }) => a.provenance.planSha256 === planSha), 'the plan existed before every run: each run artifact carries the PLAN.json hash it was spawned with');
ok('E4', checkRuns(PLAN, planSha, regSha, LEDGER, ARTS), '16/16 slots completed exactly once, in order; every per-event integrity check recomputed true; provenance matches the plan');
const files = fs.readdirSync(DIR).sort();
const runFiles = files.filter((f) => /^run_/.test(f));
ok('E5', JSON.stringify(runFiles) === JSON.stringify([...Array(16)].map((_, i) => `run_${String(i).padStart(3, '0')}_capture_attempt1.json`).concat(['run_000_nocapture_attempt1.json']).sort()),
  'exactly 16 scientific artifacts plus one replay artifact; no re-execution, no extra attempt');
const off = JSON.parse(fs.readFileSync(path.join(DIR, 'run_000_nocapture_attempt1.json'), 'utf8'));
ok('E6', REPLAY.first.slot === 0 && REPLAY.first.differing.length === 0 && REPLAY.first.fields.length === 11 && REPLAY.reexecution === null
  && JSON.stringify(off.fingerprint) === JSON.stringify(ARTS[0].a.fingerprint) && off.provenance.planSha256 === planSha,
  'G-IMPL-2 replay of slot 0 (capture off): identical on all 11 fingerprint fields; verification only, nothing replaced');
const integ = fs.readFileSync(path.join(DIR, 'INTEGRITY.sha256'), 'utf8').trim().split('\n').map((l) => l.split(/\s+/));
ok('E7', integ.length === 20 && integ.every(([h, f]) => sha(fs.readFileSync(path.join(DIR, f))) === h) && !files.includes('HALT.json'),
  'INTEGRITY.sha256 covers the plan, ledger, replay and all 17 run artifacts byte-for-byte; no HALT record');

// ---------------- A: the frozen analysis, recomputed ----------------
section('A   frozen analysis, recomputed from the run artifacts');
ok('A1', AN.analysisScriptSha256 === MAN.computeManifest().analysisSha256 && ARTS.every(({ a }) => a.provenance.analysisScriptSha256 === AN.analysisScriptSha256) && AN.planSha256 === planSha,
  `analysis ran with the registered analysis script (${AN.analysisScriptSha256.slice(0, 12)}…) on this plan`);
const re = PLAN.slots.map((s, i) => {
  const cfg = env.makeConfig(s.acceptedSeed, s.configIndex);
  return { cfgOk: cfg.accepted === true && cfg.goal === s.goal, r5: cfg.checks.r5Differing,
    ...recomputeRun(ARTS[i].a, env.expectedCostToGoal(cfg.pPhase1, cfg.goal), env.expectedCostToGoal(cfg.pPhase2, cfg.goal)) };
});
function runMatches(i, r) {
  return r.cfgOk && r.deltaR === AN.perRun[i].primary.deltaR && r.r5 === AN.perRun[i].r5Differing
    && r.sensitivity === AN.perRun[i].sensitivity.deltaR && r.postShift === AN.perRun[i].postShift.deltaR;
}
ok('A2', re.every((r, i) => runMatches(i, r)),
  'every per-run Delta_r (primary, sensitivity, post-shift) and R5 reproduced exactly from the artifacts');
const prim = re.map((r) => r.deltaR);
const ciP = T.exactBootstrapMedianCI(prim);
ok('A3', AN.primary.n === 16 && T.median(prim) === AN.primary.theta && JSON.stringify(ciP) === JSON.stringify(AN.primary.interval),
  `primary theta = median of 16 Delta_r = ${AN.primary.theta}; exact bootstrap 95% interval [${ciP.lower}, ${ciP.upper}] reproduced (N = 16^16)`);
const ciPost = T.exactBootstrapMedianCI(re.map((r) => r.postShift));
ok('A4', T.median(re.map((r) => r.postShift)) === AN.secondaryPostShift.theta && JSON.stringify(ciPost) === JSON.stringify(AN.secondaryPostShift.interval),
  `secondary post-shift theta ${AN.secondaryPostShift.theta.toFixed(4)}, interval [${ciPost.lower.toFixed(4)}, ${ciPost.upper.toFixed(4)}] reproduced`);
ok('A5', AN.runs.planned === 16 && AN.runs.completed === 16 && AN.runs.crashed.length === 0 && AN.primary.signPattern.length === 16,
  'no run-level exclusion: 16 planned, 16 completed, 0 crashed (§T)');

// ---------------- I: the results document says exactly what the frozen rules permit ----------------
section('I   interpretation stays inside the frozen §V/§W rules');
const RES = read(RESULTS_REL);
const sentences = (t) => t.replace(/\*/g, '').replace(/`/g, '').replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?;])\s+/);
const onlyNegated = (re) => sentences(RES).filter((s) => re.test(s)).every((s) => /\bnot\b|\bno\b|\bnever\b|\bnor\b|\bdoes not\b/i.test(s));
ok('I1', AN.primary.interval.excludesZero === false && /\*\*UNRESOLVED\*\*/.test(RES) && onlyNegated(/adds oracle-concordant ranking information beyond geometric goal distance/),
  'primary interval includes zero => the §W positive claim is made nowhere except in negation; status reported UNRESOLVED');
// a validation CLAIM names what is validated; procedural uses ("registration validated before execution") are not claims
const VALIDATION_CLAIM = /\b(V2\.3|FutureScore|OQ-1a?|learned (traversal )?evidence)\b[^.;]*\bvalidated\b|\bvalidated\b[^.;]*\b(V2\.3|FutureScore|OQ-1a?)\b/;
const claimSelfTest = VALIDATION_CLAIM.test('V2.3 is validated by Study 2.') && VALIDATION_CLAIM.test('This validated FutureScore.')
  && !VALIDATION_CLAIM.test('Registration validated before execution (block, run count).');
ok('I2', claimSelfTest && onlyNegated(/\bfalsified\b/) && onlyNegated(VALIDATION_CLAIM) && onlyNegated(/behavioural (improvement|effect)/),
  'no falsification, validation or behavioural claim is asserted (validation-claim scan self-tested: catches "V2.3 is validated", ignores procedural "registration validated")');
ok('I3', /secondary/i.test(RES) && onlyNegated(/post-shift[^.]*changes? the primary/i) && RES.includes(AN.secondaryPostShift.theta.toFixed(4)),
  'the post-shift result is reported as secondary and never used to change the primary conclusion');
ok('I4', RES.includes(String(AN.primary.theta)) && RES.includes(ciP.upper.toFixed(4)) && RES.includes(AN.primary.signPattern) && /NOT pre-registered/.test(RES),
  'the document quotes the frozen numbers, and labels the event descriptives as not pre-registered');

// ---------------- R: registry ----------------
section('R   seed registry marks the consumed block');
const tc = (s) => typed.config.isConsumed(typed.configSeed(s));
let blockAll = true; for (let s = BLOCK.lo; s <= BLOCK.hi; s++) if (!tc(s)) { blockAll = false; break; }
ok('R1', blockAll && !tc(BLOCK.lo - 1) && !tc(BLOCK.hi + 1), `the typed layer refuses all ${BLOCK.hi - BLOCK.lo + 1} seeds of ${BLOCK.lo}-${BLOCK.hi}, and neither neighbour`);
let diff = 0, diffOutside = 0, heldDiff = 0;
for (let s = 0; s <= 1_000_000; s++) {
  const a = S2LINK.isConsumed(s), b = C1LINK.isConsumed(s);
  if (a !== b) { diff++; if (s < BLOCK.lo || s > BLOCK.hi) diffOutside++; }
  if (S2LINK.isHeldOut(s) !== C1LINK.isHeldOut(s)) heldDiff++;
}
ok('R2', diff === 3000 && diffOutside === 0 && heldDiff === 0, `exhaustive 0..1,000,000: the new link differs from its predecessor on exactly the 3000 block seeds; held-out unchanged (the M34 T-exhaustive property, re-established for the new link)`);
const ev = S2LINK.STUDY2_BLOCK.evaluation;
ok('R3', ev.evaluatedCount === PLAN.seedCensus.n && ev.evaluatedMin === PLAN.seedCensus.min && ev.evaluatedMax === PLAN.seedCensus.max && ev.acceptedConfigurations === PLAN.slots.length
  && JSON.stringify(S2LINK.evaluationFor(895500)) === JSON.stringify(C1LINK.evaluationFor(895500)) && JSON.stringify(S2LINK.evaluationFor(896066)) === JSON.stringify(C1LINK.evaluationFor(896066)),
  `evaluation claim read from the plan (${ev.evaluatedCount} seeds ${ev.evaluatedMin}-${ev.evaluatedMax}, ${ev.acceptedConfigurations} accepted); earlier claims passed through unchanged`);
const importersOfNew = git('ls-files', '-co', '--exclude-standard', '--', '*.js', '*.mjs').trim().split('\n').filter((f) => f && /consumed_after_study2/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')) && f !== 'experiments/registry/consumed_after_study2.js');
ok('R4', JSON.stringify(importersOfNew.sort()) === JSON.stringify(['experiments/registry/typed.js', 'experiments/study2/verify_study2_execution.js'])
  && /^import \{[^}]*\} from '\.\/consumed_after_c1\.js';$/m.test(read('experiments/registry/consumed_after_study2.js')) && git('diff', '--name-only', DRIVER_COMMIT, '--', 'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js').trim() === '',
  'the new link imports only its predecessor; only typed.js (and this gate) import it; consumed.js and consumed_after_c1.js unchanged');

// ---------------- H: historical gates change only for named reasons ----------------
section('H   historical gates: every changed verdict is expected and named');
const runGate = (f) => { try { return execFileSync(process.execPath, [path.join(ROOT, f)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return String(e.stdout || '') + '\n@@STDERR@@' + String(e.stderr || ''); } };
const failsOf = (out) => [...new Set([...out.matchAll(/(?:\[FAIL\]|^\s*FAIL)\s+([A-Za-z0-9._-]+)/gm)].map((m) => m[1]))].sort();
const vr = runGate('experiments/study2/verify_readiness.js');
ok('H1', /RESULT: 63\/63 checks passed — PASS/.test(vr), 'readiness gate (cfadedd9) still 63/63');
const vd = failsOf(runGate('experiments/study2/verify_driver.js'));
const VD_EXPECTED = ['D18.2', 'D2.4', 'S.1', 'Z.1'];
ok('H2', JSON.stringify(vd) === JSON.stringify(VD_EXPECTED),
  `driver gate (d846fbd) flips exactly ${VD_EXPECTED.join(', ')} [D2.4: the proposed block is now consumed; D18.2: registry updated; S.1: files added after d846fbd; Z.1: Z2/Z3/Z9 now registered] — observed ${vd.join(',') || 'none'}`);
const m33 = runGate('experiments/m33/verify.js');
ok('H3', JSON.stringify(failsOf(m33)) === '["I3"]' && /M33 VERIFY: 68\/69/.test(m33),
  'M33 gate: only I3 flips — typed.js now imports the new chain link, which M33\'s frozen protected-module list does not name (R4 enforces the rule for the new link instead)');
const r1 = runGate('experiments/m33/verify_r1.js');
ok('H4', /M33-R1 VERIFY: 114\/114 passed, 0 FAILED/.test(r1), 'M33-R1 gate unchanged (114/114)');
const m34 = runGate('experiments/m34/verify.js');
ok('H5', /ERR_MODULE_NOT_FOUND[\s\S]*consumed_after_study2\.js/.test(m34),
  'M34 gate cannot run: it materialises the installed typed.js with only the two chain files it knew; its subject consumed_after_c1.js is unchanged (R4) and its exhaustive property is re-established by R2 [REPORTED — Director item]');
const m38 = failsOf(runGate('experiments/m38/verify.js'));
ok('H6', JSON.stringify(m38) === '["G1","G2","H1"]',
  `M38 gate fails exactly G1, G2, H1 — G1/G2 already failed at d846fbd (V2.3 production files since 6b67c55); H1 flips because the seed registry (typed.js + the new link) now differs from 6b67c55 by design — observed ${m38.join(',')}`);
const vm33 = runGate('research/preregistrations/verify_m33.js');
ok('H7', /Command failed: [^\n]*experiments[\\/]m33[\\/]verify\.js --json/.test(vm33),
  'verify_m33.js aborts only because it runs experiments/m33/verify.js and treats its non-zero exit (the H3 flip) as fatal — a consequence of H3, not a new failure');
const SWEEP = JSON.parse(read('experiments/study2/historical_gate_sweep.json'));
const NAMED = ['experiments/m33/verify.js', 'experiments/m34/verify.js', 'experiments/m38/verify.js', 'experiments/study2/verify_driver.js', 'research/preregistrations/verify_m33.js'];
const recChanged = Object.keys(SWEEP.gates).filter((f) => JSON.stringify(SWEEP.gates[f].before) !== JSON.stringify(SWEEP.gates[f].after));
ok('H8', Object.keys(SWEEP.gates).length === 35 && JSON.stringify(recChanged.sort()) === JSON.stringify([...NAMED].sort()) && JSON.stringify(SWEEP.changed.sort()) === JSON.stringify([...NAMED].sort()),
  `recorded sweep of ${Object.keys(SWEEP.gates).length} historical gates (before = d846fbd, after = this milestone): exactly the ${NAMED.length} gates named in H2-H7 change verdict; every other verdict is unchanged (pre-existing)`);

// ---------------- S: scope ----------------
section('S   scope');
ok('S1', git('diff', '--name-only', PROD_BASE, '--', 'main.js', 'render', 'index.html', 'instrumentation', 'neurons.json', 'connections.json', 'experiments/m7').trim() === '', 'production tree and the M7 substrate unchanged since a066d47');
ok('S2', git('diff', '--name-only', DRIVER_COMMIT, '--', ...Object.keys(MAN.computeManifest().files), 'experiments/study2/DRIVER_MANIFEST.json', 'experiments/study2/verify_driver.js', 'experiments/study2/verify_readiness.js', 'experiments/study2/readiness_evidence', 'experiments/study2/shakedown_evidence').trim() === ''
  && MAN.manifestSha256(MAN.computeManifest()) === MANIFEST, 'the registered driver and analysis files, and all earlier Study-2 evidence and gates, are byte-unchanged since d846fbd');
const ALLOWED = new Set(['.gitattributes', DOC_REL, RESULTS_REL, 'experiments/registry/typed.js', 'experiments/registry/consumed_after_study2.js', 'experiments/study2/README.md',
  'experiments/study2/STUDY2_REGISTRATION.json', 'experiments/study2/describe_events.mjs', 'experiments/study2/verify_study2_execution.js', 'experiments/study2/historical_gate_sweep.json']);
const changed = [...git('diff', '--name-only', DRIVER_COMMIT).trim().split('\n'), ...git('ls-files', '-o', '--exclude-standard', '--', 'experiments/study2', 'experiments/registry').trim().split('\n')].filter(Boolean);
ok('S3', changed.every((f) => ALLOWED.has(f) || f.startsWith('experiments/study2/execution/')), `every change since d846fbd is a milestone file; outside: ${changed.filter((f) => !ALLOWED.has(f) && !f.startsWith('experiments/study2/execution/')).join(',') || 'none'}`);
ok('S4', /experiments\/study2\/execution\/\* -text/.test(read('.gitattributes')), '.gitattributes keeps the execution evidence byte-exact on checkout (its integrity record hashes bytes)');

// ---------------- M: anti-vacuity mutants ----------------
section('M   anti-vacuity: mutated evidence must be rejected by the named check');
const clone = (x) => JSON.parse(JSON.stringify(x));
const mP = (f) => { const p = clone(PLAN); f(p); return checkPlan(p); };
ok('M1', !mP((p) => { p.slots.pop(); }) && !mP((p) => { [p.slots[0], p.slots[1]] = [p.slots[1], p.slots[0]]; }) && !mP((p) => { p.requested[5].seed = BLOCK.hi + 1; })
  && !mP((p) => { p.requested.splice(3, 1); }) && !mP((p) => { p.slots[2].goal = 8; }),
  'E2 rejects a dropped slot, reordered slots, a seed outside the block, a skipped seed, and a goal swap');
const mR = (f) => { const l = clone(LEDGER); const a = ARTS.map((x) => ({ bytes: x.bytes, a: clone(x.a) })); f(l, a); return checkRuns(PLAN, planSha, regSha, l, a); };
ok('M2', !mR((l, a) => { a[3].a.provenance.planSha256 = '0'.repeat(64); }) && !mR((l, a) => { a[4].a.events[10].idCheck.A_sameIds = false; })
  && !mR((l, a) => { l[7].reexecution = { exitCode: 0 }; }) && !mR((l, a) => { a[9].a.vectors[5].full[0] = 1e6; }) && !mR((l, a) => { l.pop(); a.pop(); }),
  'E4 rejects a run spawned under another plan, a failed K(e) check, a re-execution, a tampered score vector, and a missing run');
const M_SLOT = AN.perRun.findIndex((r) => r.primary.deltaR > 0.1);      // a run whose frozen Delta_r is clearly non-zero
const mut = clone(ARTS[M_SLOT].a); mut.vectors = mut.vectors.map((v) => (v.tau <= 1500 && v.k.length >= 2 ? { ...v, geo: [...v.full] } : v));
const mutPost = clone(ARTS[M_SLOT].a); mutPost.vectors = mutPost.vectors.map((v) => (v.tau > 1500 && v.k.length >= 2 ? { ...v, geo: [...v.full] } : v));
const cM = env.makeConfig(PLAN.slots[M_SLOT].acceptedSeed, M_SLOT);
const CM1 = env.expectedCostToGoal(cM.pPhase1, cM.goal), CM2 = env.expectedCostToGoal(cM.pPhase2, cM.goal);
ok('M3', M_SLOT >= 0 && !runMatches(M_SLOT, { cfgOk: true, r5: cM.checks.r5Differing, ...recomputeRun(mut, CM1, CM2) })
  && recomputeRun(mutPost, CM1, CM2).deltaR === AN.perRun[M_SLOT].primary.deltaR,
  `A2 rejects slot ${M_SLOT} with GEO forced equal to FULL in the primary window; the same change confined to post-shift leaves its primary Delta_r untouched (no pooling)`);

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

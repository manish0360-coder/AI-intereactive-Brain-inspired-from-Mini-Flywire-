// ==========================================================
// GATE G10 — Run hygiene
// ==========================================================
// FROZEN CLAUSE (§14): "One process per run; cold localStorage; crashes fail
// loudly and are recorded."   Restated identically at frozen §5.4.
//
// Every assertion below is paired with a mutation that must BREAK it. A gate
// is GREEN only if the frozen property holds AND its mutation fails it.
//
// NOT Stage 1, a pilot, or a confirmatory run. Every run here uses a short
// explicit tick budget purely to exercise the driver. No metric is estimated,
// nothing is persisted as experimental data, and the ONLY configuration used
// is the authorised pilot seed 900000.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm7g10-'));
const PILOT_SEED = 900000;
const TICKS = 20;                       // deliberately tiny: driver exercise only

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

function runDriver(opts = {}) {
  const out = path.join(TMP, (opts.tag || 'run') + '.json');
  const args = ['run.js', '--out', out];
  if (opts.replay) { args.push('--replay', opts.replay); }
  let stdout = '', stderr = '', status = 0;
  try {
    stdout = execFileSync(process.execPath, args, {
      cwd: HERE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env,
        CONFIG_SEED: String(opts.configSeed ?? PILOT_SEED),
        CONFIG_INDEX: String(opts.configIndex ?? 0),
        AGENT_SEED: String(opts.agentSeed ?? 20260819000),
        ARM: opts.arm ?? 'A1', ENV: opts.env ?? 'on', CREDIT: opts.credit ?? 'on',
        PIN: opts.pin ?? 'on', TICK_UNIT: opts.tickUnit ?? 'step',
        TICKS: String(opts.ticks ?? TICKS),
        ...(opts.crash ? { M7_RUN_CRASH: String(opts.crash) } : {}),
        ...(opts.warm ? { M7_RUN_WARMSTORE: '1' } : {}) }
    });
  } catch (e) {
    status = e.status ?? -1; stdout = e.stdout ?? ''; stderr = e.stderr ?? '';
  }
  const record = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
  return { status, stdout, stderr, record, out };
}

console.log('==============================================================');
console.log(' GATE G10  Run hygiene');
console.log(' frozen §14 / §5.4 | pilot configuration 900000 only');
console.log('==============================================================');

// ==========================================================
// G10.1 — ONE PROCESS PER RUN
// ==========================================================
console.log('\n===== G10.1  One OS process per run ==========================');
const base = runDriver({ tag: 'base' });
const g1a = ok('G10.1a a clean single run completes and exits 0',
   base.status === 0 && base.record && base.record.outcome.completed === true,
   `ticks ${base.record?.outcome.ticksExecuted}, loops ${base.record?.outcome.loopsExecuted}`);
const g1b = ok('G10.1b the record declares one-process-per-run',
   base.record?.hygiene.oneProcessPerRun === true);
// MUTATION: attempt a SECOND run inside the SAME process. Must be refused.
const twice = (() => {
  const script =
    "import { runOnce } from './run.js';\n" +
    "const i = { configSeed: 900000, configIndex: 0, agentSeed: 20260819000, arm: 'A1',\n" +
    "  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: 5, crashAtTick: null };\n" +
    "await runOnce(i);\n" +
    "try { await runOnce(i); console.log('SECOND_RUN_ALLOWED'); }\n" +
    "catch (e) { console.log('SECOND_RUN_REFUSED::' + e.message); }\n";
  const f = path.join(HERE, '_g10_twice.mjs');
  fs.writeFileSync(f, script);
  try {
    return execFileSync(process.execPath, [f], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) { return (e.stdout ?? '') + (e.stderr ?? ''); }
  finally { fs.unlinkSync(f); }
})();
const g1c = ok('G10.1c MUTATION: a second run in the same process is REFUSED',
   twice.includes('SECOND_RUN_REFUSED') && !twice.includes('SECOND_RUN_ALLOWED'),
   'main.js is an ESM singleton; batching would share learned state');
const g1d = ok('G10.1d the refusal names the frozen clause',
   /one OS process per run/.test(twice) && /§5\.4/.test(twice));

// ==========================================================
// G10.2 — COLD localStorage, ASSERTED AT START
// ==========================================================
console.log('\n===== G10.2  Cold localStorage asserted at start =============');
const g2a = ok('G10.2a localStorage was empty at run start',
   base.record?.hygiene.coldLocalStorage.assertedAtStart === true &&
   base.record?.hygiene.coldLocalStorage.keysAtStart.length === 0 &&
   base.record?.hygiene.coldLocalStorage.brainAtStart === null,
   'keys [] and brain null before the agent was started');
// MUTATION: warm the store before the assertion. The run must ABORT.
const warm = runDriver({ tag: 'warm', warm: true });
const g2b = ok('G10.2b MUTATION: a warm localStorage ABORTS the run',
   warm.status !== 0 && /localStorage was not cold/.test(warm.record?.outcome.error?.message ?? ''),
   `exit ${warm.status}`);
const g2c = ok('G10.2c the abort is loud on stderr, not swallowed',
   /M7 RUN ABORTED/.test(warm.stderr));
const g2d = ok('G10.2d the assertion happens BEFORE the agent starts',
   warm.record?.outcome.ticksExecuted === undefined || warm.record?.outcome.ticksExecuted === 0,
   'no tick was executed under a warm store');
const g2e = ok('G10.2e the store is still empty at run end (autosave inert under test)',
   base.record?.hygiene.localStorageKeysAtEnd.length === 0);

// ==========================================================
// G10.3 — CRASHES FAIL LOUDLY AND ARE RECORDED
// ==========================================================
console.log('\n===== G10.3  Crashes fail loudly and are recorded ============');
const crash = runDriver({ tag: 'crash', crash: 10 });
const g3a = ok('G10.3a a crashed run exits NON-ZERO (fails loudly)',
   crash.status !== 0, `exit ${crash.status}`);
const g3b = ok('G10.3b the crash is RECORDED in the artifact, never dropped',
   crash.record?.outcome.crashed === true && crash.record?.outcome.completed === false &&
   typeof crash.record?.outcome.error?.message === 'string' &&
   typeof crash.record?.outcome.error?.stack === 'string');
const g3c = ok('G10.3c the record carries config, seed, arm and error (frozen §9.4)',
   crash.record?.provenance.configSeed === PILOT_SEED &&
   crash.record?.provenance.agentSeed === 20260819000 &&
   crash.record?.provenance.arm === 'A1' &&
   crash.record?.outcome.error.tickAtCrash !== undefined,
   `crashed at tick ${crash.record?.outcome.error.tickAtCrash}`);
const g3d = ok('G10.3d a loud banner reaches stderr',
   /M7 RUN CRASHED/.test(crash.stderr) && /RECORDED, NOT DROPPED/.test(crash.stderr));
// ANTI-VACUITY: without the fault, the same invocation is clean and exits 0.
const g3e = ok('G10.3e ANTI-VACUITY: the identical run without the fault exits 0 and is not crashed',
   base.status === 0 && base.record?.outcome.crashed === false,
   'so G10.3a-d are detecting the crash, not a constant');

// ==========================================================
// G10.4 — DETERMINISTIC REPLAY FROM RECORDED INPUTS ONLY
// ==========================================================
console.log('\n===== G10.4  Deterministic replay (fresh process) ============');
const replay = runDriver({ tag: 'replay', replay: base.out,
  // deliberately wrong ambient env: replay must ignore it entirely
  configSeed: 999999, agentSeed: 111, arm: 'A7', ticks: 999 });
const g4a = ok('G10.4a replay reproduces the fingerprint EXACTLY',
   replay.record?.fingerprint === base.record?.fingerprint,
   base.record?.fingerprint.slice(0, 24) + '…');
const g4b = ok('G10.4b replay reproduces every artifact field, not just the hash',
   JSON.stringify(replay.record?.artifacts) === JSON.stringify(base.record?.artifacts),
   `${base.record?.artifacts.writes.length} actions, Q ${base.record?.artifacts.qEntries} entries, ` +
   `${base.record?.artifacts.attempts} traversal attempts`);
const g4c = ok('G10.4c replay ignored the ambient environment and used the FILE',
   replay.record?.provenance.configSeed === PILOT_SEED &&
   replay.record?.provenance.agentSeed === 20260819000 &&
   replay.record?.provenance.arm === 'A1' &&
   replay.record?.provenance.ticksRequested === TICKS,
   'ambient CONFIG_SEED=999999 AGENT_SEED=111 ARM=A7 TICKS=999 were all overridden');
const g4d = ok('G10.4d NO HIDDEN STATE: the replay ran in a separate OS process',
   replay.record?.hygiene.oneProcessPerRun === true &&
   replay.record?.hygiene.coldLocalStorage.keysAtStart.length === 0,
   'cold store, fresh module graph, inputs read from the file alone');

// ==========================================================
// G10.5 — PROVENANCE COMPLETENESS
// ==========================================================
console.log('\n===== G10.5  Provenance completeness =========================');
const REQUIRED = ['configSeed', 'configIndex', 'acceptedSeed',
  'numberOfRejectedCandidatesBeforeAcceptance', 'goal', 'agentSeed', 'arm',
  'envMode', 'creditMode', 'pin', 'tickUnit', 'ticksRequested', 'rngSeeds',
  'sources', 'frozenDigest'];
const g5a = ok('G10.5a every field required to reproduce the run is recorded',
   REQUIRED.every(f => base.record?.provenance[f] !== undefined),
   REQUIRED.length + ' fields: ' + REQUIRED.join(', '));
// NOTE: the frozen agent seeds (§5.1, 20260819000+) EXCEED 2^32. makeRng does
// `(seed >>> 0) || 1`, so the effective cognitive stream seed is the uint32
// truncation 3080949816, not 20260819000. That is pre-existing rng.js
// behaviour, and it is order-preserving over both frozen seed blocks, so
// pairing is unaffected. The record stores the EFFECTIVE seeds, which is what
// a replay needs; the assertion below checks exactly the derivations used by
// instrumentation/rng.js and arms.js makeSigma.
const SEED0 = 20260819000;
const g5b = ok('G10.5b the four EFFECTIVE RNG stream seeds are recorded (uint32, as used)',
   base.record?.provenance.rngSeeds.cognitive === (SEED0 >>> 0) &&
   base.record?.provenance.rngSeeds.visual === ((SEED0 ^ 0x9e3779b9) >>> 0) &&
   base.record?.provenance.rngSeeds.environment === ((SEED0 ^ 0x5EED) >>> 0) &&
   base.record?.provenance.rngSeeds.sigma === ((SEED0 ^ 0xBEEF) >>> 0),
   `cognitive ${SEED0} -> ${SEED0 >>> 0} (uint32 truncation in makeRng)`);
const g5b2 = ok('G10.5b2 seed truncation is ORDER-PRESERVING across the frozen blocks',
   ((SEED0 + 1) >>> 0) === ((SEED0 >>> 0) + 1) &&
   ((SEED0 + 119) >>> 0) === ((SEED0 >>> 0) + 119),
   'pilot 900000-004 and confirmatory ...100-119 stay distinct and ordered');
const g5c = ok('G10.5c the source files the run depended on are hashed',
   ['main.js', 'render/scoring.js', 'instrumentation/rng.js',
    'experiments/m7/env.js', 'experiments/m7/arms.js', 'experiments/m7/run.js']
     .every(f => /^[0-9a-f]{64}$/.test(base.record?.provenance.sources[f] ?? '')));
const g5d = ok('G10.5d the record binds to the frozen digest',
   base.record?.provenance.frozenDigest ===
   '2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9');
const g5e = ok('G10.5e the ERR-07 acceptance provenance travelled with the run',
   base.record?.provenance.acceptedSeed === PILOT_SEED &&
   base.record?.provenance.numberOfRejectedCandidatesBeforeAcceptance === 0);
// MUTATION: strip one required field. Replay must REFUSE, not guess.
const stripped = path.join(TMP, 'stripped.json');
{
  const r = JSON.parse(fs.readFileSync(base.out, 'utf8'));
  delete r.provenance.agentSeed;
  fs.writeFileSync(stripped, JSON.stringify(r, null, 1));
}
const strippedRun = runDriver({ tag: 'stripped', replay: stripped });
const g5f = ok('G10.5f MUTATION: replay from INCOMPLETE provenance is REFUSED',
   strippedRun.status !== 0 &&
   /provenance is incomplete, replay refused/.test(strippedRun.record?.outcome.error?.message ?? ''),
   'missing agentSeed -> refusal, not a silent default');

// ==========================================================
// G10.6 — ANTI-VACUITY: a mutated input must change the run
// ==========================================================
console.log('\n===== G10.6  Anti-vacuity of the replay comparison ===========');
function mutatedReplay(tag, mutate) {
  const f = path.join(TMP, tag + '-in.json');
  const r = JSON.parse(fs.readFileSync(base.out, 'utf8'));
  mutate(r.provenance);
  fs.writeFileSync(f, JSON.stringify(r, null, 1));
  return runDriver({ tag, replay: f });
}
const mSeed = mutatedReplay('mseed', p => { p.agentSeed = 20260819001; });
const g6a = ok('G10.6a MUTATION: a different agent seed produces a DIFFERENT fingerprint',
   mSeed.status === 0 && mSeed.record.fingerprint !== base.record.fingerprint,
   'so G10.4a is comparing something that can differ');
const mArm = mutatedReplay('marm', p => { p.arm = 'A2'; });
const g6b = ok('G10.6b MUTATION: a different arm produces a DIFFERENT fingerprint',
   mArm.status === 0 && mArm.record.fingerprint !== base.record.fingerprint);
const mEnv = mutatedReplay('menv', p => { p.envMode = 'off'; });
const g6c = ok('G10.6c MUTATION: disabling E1 produces a DIFFERENT fingerprint',
   mEnv.status === 0 && mEnv.record.fingerprint !== base.record.fingerprint,
   `${base.record.artifacts.slips} slips -> ${mEnv.record.artifacts.slips}`);
const mTicks = mutatedReplay('mticks', p => { p.ticksRequested = TICKS + 5; });
const g6d = ok('G10.6d MUTATION: a different tick budget produces a DIFFERENT fingerprint',
   mTicks.status === 0 && mTicks.record.fingerprint !== base.record.fingerprint);
// CONTROL: an untouched copy must still match, or the mutations prove nothing.
const control = mutatedReplay('control', () => {});
const g6e = ok('G10.6e CONTROL: an unmutated copy still reproduces exactly',
   control.record?.fingerprint === base.record.fingerprint);

// ==========================================================
// G10.7 — BOUNDARY: only the authorised pilot configuration
// ==========================================================
console.log('\n===== G10.7  Boundary proof ==================================');
const seedsTouched = base.record?.provenance.configSeed;
const g7a = ok('G10.7a every run above used pilot configuration 900000 only',
   [base, crash, replay, control].every(r => !r.record?.provenance ||
      r.record.provenance.configSeed === PILOT_SEED),
   `configSeed ${seedsTouched}, accepted at ${base.record?.provenance.acceptedSeed}`);
const g7b = ok('G10.7b no held-out seed is referenced anywhere in run.js',
   !/9005[0-2][0-9]/.test(fs.readFileSync(path.join(HERE, 'run.js'), 'utf8')));
const g7c = ok('G10.7c no held-out seed is referenced anywhere in this verifier',
   (fs.readFileSync(path.join(HERE, 'verify_G10.js'), 'utf8')
      .split('\n').filter(l => /9005[0-2][0-9]/.test(l.replace(/\/\/.*$/, ''))).length) === 0);
const g7d = ok('G10.7d the acceptance walk consumed ZERO extra candidates',
   base.record?.provenance.numberOfRejectedCandidatesBeforeAcceptance === 0,
   '900000 is accepted immediately, so no further seed was generated');

// ==========================================================
// G10.8 — recorded, not silently resolved
// ==========================================================
console.log('\n===== G10.8  Undetermined items recorded =====================');
// SUPERSEDED 2026-08-24. This assertion previously required the record to
// DECLARE the 150-tick cap as unimplemented. That was correct while the cap
// did not exist; it became a false requirement when the cap was implemented in
// main.js and armed by run.js. G10.8's PURPOSE is unchanged and is preserved
// below: nothing frozen may be silently resolved or silently omitted. The
// recording mechanism must still exist, the cap must no longer be listed as
// missing, and its armed state must be positively recorded.
const g8a = ok('G10.8a the frozen 150-tick episode cap is recorded as ARMED, not as missing',
   Array.isArray(base.record?.unimplemented) &&
   !base.record.unimplemented.some(u => /episode-cap-150/.test(u)) &&
   base.record?.provenance.episodeCapArmed === true,
   `unimplemented = [${base.record?.unimplemented.join('; ')}]; ` +
   `episodeCapArmed = ${base.record?.provenance.episodeCapArmed} (measured from the ` +
   `live global after the run, so a broken activation bridge reads false here)`);
const g8aa = ok('G10.8a2 the "unimplemented" recording mechanism still exists and is honest',
   Array.isArray(base.record?.unimplemented) && base.record.unimplemented.length === 0,
   'an empty list means nothing frozen is knowingly unimplemented — the field is ' +
   'retained so a future omission has a conspicuous place to be declared');
const g8b = ok('G10.8b the tick unit is an EXPLICIT recorded input, never inferred silently',
   base.record?.provenance.tickUnit === 'step' &&
   base.record?.outcome.ticksExecuted === base.record?.outcome.loopsExecuted * 5,
   `${base.record?.outcome.loopsExecuted} loops x 5 = ${base.record?.outcome.ticksExecuted} ticks`);
const loopUnit = runDriver({ tag: 'loopunit', tickUnit: 'loop', ticks: 4 });
const g8c = ok('G10.8c the alternative tick reading is supported and distinguishable',
   loopUnit.record?.outcome.loopsExecuted === 4 &&
   loopUnit.record?.outcome.ticksExecuted === 4 &&
   loopUnit.record?.provenance.tickUnit === 'loop',
   'neither reading is hard-coded; a Director ruling selects it');

// ==========================================================
// VERDICT
// ==========================================================
const GREEN = g1a && g1b && g1c && g1d && g2a && g2b && g2c && g2d && g2e &&
              g3a && g3b && g3c && g3d && g3e && g4a && g4b && g4c && g4d &&
              g5a && g5b && g5b2 && g5c && g5d && g5e && g5f &&
              g6a && g6b && g6c && g6d && g6e &&
              g7a && g7b && g7c && g7d && g8a && g8aa && g8b && g8c;
console.log('\n==============================================================');
console.log('  G10   ' + (GREEN ? 'GREEN' : 'RED') +
  '   one process per run; cold localStorage asserted at start;');
console.log('         crashes fail loudly and are recorded; replay deterministic');
console.log('==============================================================');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

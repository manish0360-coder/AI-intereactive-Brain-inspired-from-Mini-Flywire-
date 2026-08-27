// ==========================================================
// M7 — SINGLE-RUN DRIVER  (frozen §18.1 `experiments/m7/run.js`)
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §5.4 execution requirements · §9.4 run-level inclusion · §14 gate G10
//   errata ERR-01 … ERR-07
//
// GATE G10 — "Run hygiene | One process per run; cold localStorage; crashes
// fail loudly and are recorded". Frozen §5.4 states the same three things:
//   1. ONE OS PROCESS PER RUN. main.js has top-level side effects and ESM
//      caching returns the cached instance, so a second run in one process
//      would silently inherit learned state.
//   2. COLD localStorage PER RUN, **asserted at start**.
//   3. A crashed run FAILS LOUDLY and IS RECORDED. Silent dropping is
//      forbidden (§10.4); §9.4 requires config, seed, arm and error reported.
//
// This driver adds NO metric, threshold, acceptance criterion or behavioural
// semantics. It wires the EXISTING mechanisms (env.js, arms.js, the E1-E5
// integration sites in main.js) and records what the run produced.
//
// ----------------------------------------------------------
// TWO ITEMS THE FROZEN TEXT DOES NOT UNIQUELY DETERMINE.
// Both are RECORDED, not resolved, and neither affects gate G10.
// ----------------------------------------------------------
// (i) THE TICK UNIT. main.js runs `runAgentLoop`, which calls `runAgent()`
//     exactly 5 times (main.js:4986-4988); the headless timer advances one
//     LOOP at a time. Frozen §3.7 says "3000 ticks", shift at 1500.
//     Frozen §3.3 says a slip leaves the agent at u and consumes "one tick" —
//     a slip happens inside ONE runAgent() call, so a tick reads as one
//     runAgent() STEP, i.e. 3000 ticks = 600 loops. §8.3 (argmax per tick)
//     and §9.2 (staleExecution per tick) read the same way. main.js's own
//     comments, however, call a LOOP a "loop tick".
//     -> `tickUnit` is an EXPLICIT recorded input. It is never inferred
//        silently. 1500 and 3000 are both multiples of 5, so under the
//        step reading the shift and the run end fall on exact loop
//        boundaries and no rounding occurs either way.
//     -> DIRECTOR RULING REQUIRED before any real 3000-tick run.
//
// (ii) [SUPERSEDED 2026-08-24 -- the note below is retained for provenance
//      and is no longer the state of the tree.]
//        "THE 150-TICK EPISODE CAP ... There is NO existing 150-tick cap in
//         main.js ... -> NOT IMPLEMENTED."
//      That was true when this driver was written. The cap has since been
//      implemented in main.js under the Director ruling of 2026-08-23 and
//      verified by verify_cap.js. This driver now ARMS it (see the activation
//      bridge below), so the frozen §3.7 episode rule is in force for a real
//      run. Item (i), the RUN-LENGTH tick unit, is NOT affected and remains
//      open: it still requires a ruling before any real 3000-tick run.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot, pressSpace } from '../phase1_0/_driver.js';
import { makeRng, rng as rawRng } from '../../instrumentation/rng.js';
import { getPathTrust, recordAttempt, recordSuccess, pathAttempts, pathSuccesses }
  from '../../render/trustMemory.js';
import { Q } from '../../render/qlearning.js';
import * as env from './env.js';
import * as arms from './arms.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const fileHash = (rel) => sha(fs.readFileSync(path.join(ROOT, rel)));

// ==========================================================
// G10.1 — ONE PROCESS PER RUN (frozen §5.4)
// Enforced, not merely documented: a second attempt in this process throws
// before anything is booted. The guard is on globalThis, so it survives any
// re-import of this module within the same process.
// ==========================================================
const RUN_GUARD = '__M7_RUN_STARTED__';
function claimProcess() {
  if (globalThis[RUN_GUARD]) {
    throw new Error(
      'G10 VIOLATION: one OS process per run (frozen §5.4). This process has ' +
      'already executed run #' + globalThis[RUN_GUARD] + '. main.js is an ESM ' +
      'singleton with top-level side effects; a second run would inherit learned state.');
  }
  globalThis[RUN_GUARD] = 1;
}
export function processAlreadyUsed() { return !!globalThis[RUN_GUARD]; }

// ==========================================================
// inputs
// ==========================================================
function inputsFromEnv() {
  return {
    configSeed:  Number(process.env.CONFIG_SEED  ?? 900000),
    configIndex: Number(process.env.CONFIG_INDEX ?? 0),
    agentSeed:   Number(process.env.AGENT_SEED   ?? 20260819000),
    arm:         process.env.ARM    ?? 'A1',
    envMode:     process.env.ENV    ?? 'on',
    creditMode:  process.env.CREDIT ?? 'on',
    pin:         process.env.PIN    ?? 'on',
    // tickUnit: 'step' = one runAgent() call; 'loop' = one runAgentLoop (5 steps).
    tickUnit:    process.env.TICK_UNIT ?? 'step',
    ticks:       Number(process.env.TICKS ?? env.RUN_TICKS),
    // fault injection, so G10.3 can be demonstrated rather than asserted.
    crashAtTick: process.env.M7_RUN_CRASH ? Number(process.env.M7_RUN_CRASH) : null,
    warmStore: !!process.env.M7_RUN_WARMSTORE
  };
}

// ==========================================================
// the run
// ==========================================================
export async function runOnce(input) {
  claimProcess();

  const stepsPerLoop = 5;                                  // main.js:4986
  const ticksPerLoop = input.tickUnit === 'loop' ? 1 : stepsPerLoop;
  const loops = Math.ceil(input.ticks / ticksPerLoop);

  // ---- configuration through the CANONICAL path (ERR-07 §4) ----
  // generateAccepted applies the complete acceptance criteria and returns the
  // mandatory ERR-07 §4.1 provenance. No acceptance semantics are re-stated here.
  const gen = env.generateAccepted(input.configSeed, input.configIndex);
  const cfg = gen.cfg;
  env.install(cfg);
  env.setTick(0);                                          // Phase I

  // ---- arm + E1/E2/E5 wiring (existing mechanisms; no logic duplicated) ----
  const trustOf = (a, b) => getPathTrust(a + '->' + b);
  arms.reset();
  arms.configure({ arm: input.arm === 'OFF' ? arms.OFF : input.arm,
                   agentSeed: input.agentSeed, trustOf });

  const rec = { attempts: 0, successes: 0, slips: 0, creditKeys: new Set(),
                creditRejected: 0, laSteps: 0, dampInvoked: 0 };

  globalThis.__M7_ARMS__ = {
    bayesianTrustFor: (from, to, raw) => arms.bayesianTrustFor(from, to, raw),
    aggregateTrustFor: (raw) => arms.aggregateTrustFor(raw)
  };
  if (arms.pinsPredictionErrorPathway() && input.pin === 'on') {
    globalThis.__M7_PE__ = {
      learningAuthorityFor(raw) { rec.laSteps++; return 1.0; },   // frozen §10.2
      dampQAllowed() { rec.dampInvoked++; return false; }         // frozen §10.3
    };
  }
  if (input.envMode === 'on') globalThis.__M7_ENV__ = {
    attempt(from, to) {
      const ok = env.attempt(from, to);
      rec.attempts++; ok ? rec.successes++ : rec.slips++;
      return ok;
    }
  };
  if (input.creditMode === 'on') globalThis.__M7_CREDIT__ = {
    recordTraversal(from, to, succeeded) {
      // M7 credit boundary: only real canonical graph edges enter the M7 trust
      // namespace. The pre-existing lifecycle can present a non-edge pair; that
      // is contained here, exactly as at the E2 site. Baseline NOT repaired.
      if (arms.edgeIndex(from, to) === undefined) { rec.creditRejected++; return; }
      const key = from + '->' + to;
      rec.creditKeys.add(key);
      recordAttempt(key);
      if (succeeded) recordSuccess(key);
    }
  };

  // ======================================================
  // FROZEN §3.7 EPISODE CAP -- ACTIVATION BRIDGE
  // ======================================================
  // Frozen §3.7: "Episode end | goal reached (existing reset) **or** 150 ticks
  // elapsed". The mechanism lives in main.js (guarded, default-off) and is
  // verified by verify_cap.js; this line is what puts it IN FORCE for a real
  // M7 run. Without it the runtime silently ignores the frozen episode rule --
  // measured: uncapped episodes of 603 and 829 agent steps occur.
  //
  // UNCONDITIONAL, and deliberately so. Frozen §3.7 admits no "off" state for
  // the episode rule, so exposing a switch here would invent a configuration
  // knob the pre-registration does not have. There is no env var, no default,
  // and no arm dependence.
  //
  // NO SCIENTIFIC PARAMETER CROSSES THIS LINE. 150 is not written here; the
  // constant has exactly one home, main.js's M7_EPISODE_TICK_CAP, whose hash is
  // already recorded in provenance.sources['main.js']. This is a boolean that
  // activates an already-frozen, already-verified rule.
  //
  // Set BEFORE boot(), alongside the other M7 hooks above, so the flag is
  // already true on the very first runAgent() call. It consumes no RNG: the
  // guard is one global read per tick and the counter is integer arithmetic.
  //
  // Scope: same limitation as __M7_GOAL__ (decision D-001 §4) -- a one-purpose
  // bootstrap transport for this frozen experiment, not a configuration bus.
  globalThis.__M7_EPISODE_CAP__ = true;

  // ======================================================
  // REPLAY-COOLDOWN DETERMINISM -- ACTIVATION (Branch B)
  // ======================================================
  // Director ruling 2026-08-26. The wall-clock replay cooldown in
  // render/episodeManager.js was the sole proven cause of non-reproducible
  // 3000-tick runs, which violates frozen 5.2 ("identical seeds and identical
  // stream initialisation"), 5.3 (desynchronisation "would destroy pairing")
  // and 14 G1 ("bit-identical").
  //
  // UNCONDITIONAL for the same reason the episode cap is: reproducibility is
  // not an option of the frozen design, so exposing a switch here would invent
  // a configuration knob the pre-registration does not have.
  //
  // NO PARAMETER CROSSES THIS LINE. Branch B has no threshold, no rate and no
  // epoch; this is a boolean that selects an already-ruled deterministic rule.
  // The guard is a global read on a path that consumes no RNG.
  globalThis.__M7_REPLAY_ONCE__ = true;

  // ---- boot ONE agent in THIS process ----
  // cfg.goal is the SOLE experiment-level source of the goal (frozen §3.7).
  // It is forwarded, never derived or defaulted, here.
  const { dom, timer, restore } = await boot({ seed: input.agentSeed, goal: cfg.goal });

  // ======================================================
  // G10.2 — COLD localStorage, ASSERTED AT START (frozen §5.4)
  // Asserted BEFORE the agent is started, so a warm store cannot have been
  // produced by this run. §5.4: "setInterval(saveBrain, 5000) writes; startup
  // reads back" — so a warm store would silently restore a previous brain.
  // ======================================================
  // fault injection, so G10.2 can be DEMONSTRATED to fire rather than
  // merely asserted. Writes through the same store main.js would read back.
  if (process.env.M7_RUN_WARMSTORE) globalThis.localStorage.setItem('brain', '{}');
  const keysAtStart = [...dom.localStorageMap.keys()];
  const brainAtStart = globalThis.localStorage.getItem('brain');
  const coldOk = keysAtStart.length === 0 && brainAtStart === null;
  if (!coldOk) {
    restore();
    throw new Error('G10 VIOLATION: localStorage was not cold at run start ' +
      '(frozen §5.4). keys=' + JSON.stringify(keysAtStart) +
      ' brain=' + (brainAtStart === null ? 'null' : 'PRESENT'));
  }

  // ---- record the executed action sequence ----
  const writes = [];
  let _lr = globalThis.lastReasoning;
  Object.defineProperty(globalThis, 'lastReasoning', {
    configurable: true,
    get() { return _lr; },
    set(v) { _lr = v; writes.push(v ? `${v.from}->${v.to}` : null); }
  });

  // ======================================================
  // G10.3 — the tick loop. A crash is CAUGHT, RECORDED and RE-REPORTED
  // loudly; it is never swallowed and never silently dropped (§9.4, §10.4).
  // ======================================================
  let loopsExecuted = 0, ticksExecuted = 0, crash = null;
  try {
    pressSpace(dom);
    for (let l = 0; l < loops; l++) {
      // frozen §3.6: at tick 1500 of 3000 the reliable/unreliable sets swap.
      env.setTick(ticksExecuted);
      if (input.crashAtTick !== null && ticksExecuted >= input.crashAtTick) {
        throw new Error('M7_RUN_CRASH fault injection at tick ' + ticksExecuted);
      }
      if (!timer.tick()) break;                  // agent loop stopped
      loopsExecuted++; ticksExecuted += ticksPerLoop;
    }
  } catch (e) {
    crash = { message: String(e && e.message || e), stack: String(e && e.stack || ''),
              tickAtCrash: ticksExecuted, loopAtCrash: loopsExecuted };
  } finally {
    restore();
  }

  // ---- exact stream-consumption recovery (as used by gate G2) ----
  function recoverCount(streamName, seedForStream, limit = 8_000_000) {
    let probe; try { probe = rawRng(streamName); } catch { return null; }
    const ref = makeRng(seedForStream >>> 0);
    for (let i = 0; i < limit; i++) if (ref() === probe) return i;
    return -1;
  }
  const cogDraws = recoverCount('cognitive', input.agentSeed);
  const visDraws = recoverCount('visual', (input.agentSeed ^ 0x9e3779b9) >>> 0);

  let qEntries = 0, qSum = 0;
  Q.forEach((v) => { qEntries++; qSum += v; });

  const artifacts = {
    writes,
    qEntries, qSum: Number(qSum.toFixed(9)),
    pathAttemptKeys: [...pathAttempts.keys()].sort(),
    pathSuccessKeys: [...pathSuccesses.keys()].sort(),
    creditKeys: [...rec.creditKeys].sort(),
    creditRejected: rec.creditRejected,
    envCounters: env.getCounters(),
    attempts: rec.attempts, successes: rec.successes, slips: rec.slips,
    laSteps: rec.laSteps, dampInvoked: rec.dampInvoked,
    cogDraws, visDraws
  };

  const record = {
    schema: 'm7.run/1',
    // ---- everything needed to reproduce this run, and nothing derived ----
    provenance: {
      configSeed: input.configSeed,
      configIndex: input.configIndex,
      acceptedSeed: gen.provenance.acceptedSeed,
      numberOfRejectedCandidatesBeforeAcceptance:
        gen.provenance.numberOfRejectedCandidatesBeforeAcceptance,
      goal: cfg.goal,
      agentSeed: input.agentSeed,
      arm: input.arm,
      // MEASURED after the run from the live global, not asserted: this is the
      // state the runtime actually operated under. `false` here would mean the
      // frozen §3.7 episode rule did not apply and the record must not be used.
      episodeCapArmed: globalThis.__M7_EPISODE_CAP__ === true,
      // MEASURED after the run, not asserted. `false` here would mean the run
      // executed under the wall-clock cooldown and is NOT reproducible, so the
      // record must not be used for a paired comparison.
      replayCooldownDeterministic: globalThis.__M7_REPLAY_ONCE__ === true,
      envMode: input.envMode,
      creditMode: input.creditMode,
      pin: input.pin,
      tickUnit: input.tickUnit,
      ticksRequested: input.ticks,
      crashAtTick: input.crashAtTick,
      rngSeeds: {
        cognitive: input.agentSeed >>> 0,
        visual: (input.agentSeed ^ 0x9e3779b9) >>> 0,
        environment: (input.agentSeed ^ 0x5EED) >>> 0,
        sigma: (input.agentSeed ^ 0xBEEF) >>> 0
      },
      sources: {
        'main.js': fileHash('main.js'),
        'render/scoring.js': fileHash('render/scoring.js'),
        'instrumentation/rng.js': fileHash('instrumentation/rng.js'),
        'experiments/m7/env.js': fileHash('experiments/m7/env.js'),
        'experiments/m7/arms.js': fileHash('experiments/m7/arms.js'),
        'experiments/m7/run.js': fileHash('experiments/m7/run.js')
      },
      frozenDigest: '2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9'
    },
    hygiene: {
      oneProcessPerRun: true,
      coldLocalStorage: { assertedAtStart: true, keysAtStart, brainAtStart },
      localStorageKeysAtEnd: [...dom.localStorageMap.keys()]
    },
    outcome: {
      crashed: crash !== null,
      completed: crash === null && ticksExecuted >= input.ticks,
      ticksExecuted, loopsExecuted,
      error: crash
    },
    // Frozen requirements this driver does NOT put into force. The 150-tick
    // episode cap was listed here until 2026-08-24; it is now implemented in
    // main.js and armed above, so the list is empty. Kept so that a future
    // omission has an existing, conspicuous place to be recorded rather than
    // being silent.
    unimplemented: [],
    artifacts
  };
  record.fingerprint = sha(JSON.stringify(artifacts));
  return record;
}

// ==========================================================
// CLI
//   node run.js [--out FILE]
//   node run.js --replay ARTIFACT [--out FILE]
// Replay reads its inputs from the artifact's `provenance` ONLY, in a fresh
// process, so nothing can leak through memory (G10 "no hidden state").
// ==========================================================
function inputsFromProvenance(p) {
  const need = ['configSeed', 'configIndex', 'agentSeed', 'arm', 'envMode',
                'creditMode', 'pin', 'tickUnit', 'ticksRequested'];
  const missing = need.filter(k => p[k] === undefined || p[k] === null);
  if (missing.length) {
    throw new Error('G10 VIOLATION: provenance is incomplete, replay refused. ' +
      'missing: ' + missing.join(', '));
  }
  return { configSeed: p.configSeed, configIndex: p.configIndex, agentSeed: p.agentSeed,
           arm: p.arm, envMode: p.envMode, creditMode: p.creditMode, pin: p.pin,
           tickUnit: p.tickUnit, ticks: p.ticksRequested,
           crashAtTick: p.crashAtTick ?? null };
}

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const replayFrom = flag('--replay');
  const out = flag('--out');

  let record, exitCode = 0;
  try {
    const input = replayFrom
      ? inputsFromProvenance(JSON.parse(fs.readFileSync(replayFrom, 'utf8')).provenance)
      : inputsFromEnv();
    record = await runOnce(input);
    if (record.outcome.crashed) {
      // FAIL LOUDLY (frozen §5.4, §9.4, §10.4). Never silently dropped.
      exitCode = 1;
      process.stderr.write(
        '\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
        '!! M7 RUN CRASHED - RECORDED, NOT DROPPED (frozen §9.4)  !!\n' +
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
        '   config seed : ' + record.provenance.configSeed + '\n' +
        '   agent seed  : ' + record.provenance.agentSeed + '\n' +
        '   arm         : ' + record.provenance.arm + '\n' +
        '   tick        : ' + record.outcome.error.tickAtCrash + '\n' +
        '   error       : ' + record.outcome.error.message + '\n\n');
    }
  } catch (e) {
    // A failure OUTSIDE the tick loop (guard, cold-store assertion, bad
    // provenance) is equally loud and equally recorded.
    exitCode = 2;
    record = { schema: 'm7.run/1', outcome: { crashed: true, completed: false,
               error: { message: String(e && e.message || e), stack: String(e && e.stack || '') } } };
    process.stderr.write('\n!! M7 RUN ABORTED: ' + record.outcome.error.message + '\n\n');
  }

  if (out) fs.writeFileSync(out, JSON.stringify(record, null, 1));
  process.stdout.write('@@RUN@@' + JSON.stringify(record));
  process.exit(exitCode);
}

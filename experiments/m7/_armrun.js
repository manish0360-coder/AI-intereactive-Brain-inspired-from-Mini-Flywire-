// ==========================================================
// M7 — one booted agent run per process, with an arm attached
// ==========================================================
// TEST INFRASTRUCTURE. Boots the REAL main.js under the headless shim with
// globalThis.__M7_ARMS__ installed, and records every value that actually
// crosses the E3 and E4 integration sites.
//
// This is NOT Stage 1, a pilot, or a confirmatory run. It executes a short
// deterministic tick budget purely to prove that arm values reach the real
// consumption sites in main.js. No metric is estimated and nothing is
// persisted as experimental data.
//
// One process per run: main.js is an ESM singleton with top-level side
// effects, so a second import would return the cached instance.
//
// env: ARM, SEED, TICKS, HOOK ("on" | "off" | "ignore")
//   PIN=on|off|la-only|damp-only -> E5 prediction-error pathway pinning.
//        on         both: learningAuthority pinned to 1.0 AND dampQ disabled
//        off        neither -- the frozen G12(d) UN-PINNED CONTROL, which
//                   must FAIL the G12 assertions
//        la-only    authority pinned, dampQ left ACTIVE  (isolates dampQ)
//        damp-only  authority raw, dampQ disabled        (isolates the pin)
//   HOOK=off     -> no hook installed at all (pre-M7 baseline path)
//   HOOK=ignore  -> anti-vacuity: hook installed but arms deliberately
//                   bypassed, so the recorded delivery must equal the raw
//                   value. Used to prove the verifier can detect a main.js
//                   site that ignores the arm layer.
// ==========================================================
import { boot, pressSpace } from '../phase1_0/_driver.js';
import { makeRng, rng as rawRng, liveRng as rawLiveRng } from '../../instrumentation/rng.js';
import { getPathTrust, recordAttempt, recordSuccess, pathAttempts, pathSuccesses } from '../../render/trustMemory.js';
import { Q } from '../../render/qlearning.js';
import * as env from './env.js';
import * as arms from './arms.js';

const ARM   = process.env.ARM   ?? 'OFF';
const SEED  = Number(process.env.SEED  ?? 20260819000);
const TICKS = Number(process.env.TICKS ?? 40);
const HOOK  = process.env.HOOK ?? 'on';
const PIN   = process.env.PIN  ?? 'on';
// ENV=off|on   -> E1/E2 environment-controlled traversal (default off, so
//                 every pre-existing verifier keeps its original behaviour).
// ENVBUG=      -> anti-vacuity mutations of the E1/E2 integration:
//   bypass       env.attempt never consulted (always succeed)
//   sliptravel   a FAILED attempt still moves the agent
//   staleKey     credit keyed from the stale agentLast (the old defect)
//   doubledraw   two environment draws per decision
//   noedgecheck  the M7 credit boundary stops validating that (u,v) is a
//                real graph edge -- must reintroduce non-edge keys
// ENV and CREDIT are INDEPENDENT and BOTH EXPLICIT (ERRATUM M7-ERR-06 §2.3).
// CREDIT does NOT default to ENV. Both default to 'off', so the default
// invocation is the pre-M7 path. A caller wanting a mechanism must name it.
//   ENV=off CREDIT=off  baseline / pre-M7
//   ENV=on  CREDIT=off  E1 only  <- the G3 condition
//   ENV=off CREDIT=on   E2 only
//   ENV=on  CREDIT=on   full M7
const ENVMODE = process.env.ENV    ?? 'off';
const CREDIT  = process.env.CREDIT ?? 'off';
const ENVBUG  = process.env.ENVBUG ?? '';
// ENVP=one -> force p_e = 1.0 on every edge, both phases (frozen G3 condition).
const ENVP    = process.env.ENVP   ?? 'normal';

const rec = { e3Calls: 0, e4Calls: 0, e3: [], e4: [], envDrawsAtEnd: 0,
  // full-population counters: the e3/e4 arrays are capped samples, so any
  // claim about how often a value CHANGED must be counted over every call.
  e3Differ: 0, e4Differ: 0, e3RawSeen: new Set(), e3DeliveredSeen: new Set(),
  // ---- E5 / G12 counters (frozen §10.3): per run, never sampled ----
  laSteps: 0,          // G12(a) learning steps observed
  laExactlyOne: 0,     // G12(a) steps where the delivered authority was exactly 1.0
  laRawBelowOne: 0,    // proves the RAW authority really did drop (pin is not vacuous)
  laRawSeen: new Set(),
  dampInvoked: 0,      // G12(b) times dampQ was actually invoked
  dampSuppressed: 0,
  // ---- E1/E2 traversal provenance ----
  attempts: 0, successes: 0, slips: 0,
  trav: [],            // capped sample of {from,to,ok}
  creditKeys: new Set(),
  creditRejected: 0, rejectedSamples: [],
  slipSamples: [] };

// A7 ORACLE needs a live configuration to read p_e from.
const cfg = env.makeConfig(900000, 0);
if (ARM === 'A7') env.install(cfg);

const trustOf = (a, b) => getPathTrust(a + '->' + b);

if (HOOK !== 'off') {
  arms.reset();
  arms.configure({ arm: ARM === 'OFF' ? arms.OFF : ARM, agentSeed: SEED, trustOf });

  globalThis.__M7_ARMS__ = {
    bayesianTrustFor(from, to, raw) {
      // HOOK=ignore simulates a main.js site that consults nothing.
      const v = (HOOK === 'ignore') ? raw : arms.bayesianTrustFor(from, to, raw);
      rec.e3Calls++;
      if (v !== raw) rec.e3Differ++;
      rec.e3RawSeen.add(raw); rec.e3DeliveredSeen.add(v);
      if (rec.e3.length < 400) rec.e3.push({ from: String(from), to: String(to), raw, v });
      return v;
    },
    aggregateTrustFor(raw) {
      const v = (HOOK === 'ignore') ? raw : arms.aggregateTrustFor(raw);
      rec.e4Calls++;
      if (v !== raw) rec.e4Differ++;
      if (rec.e4.length < 400) rec.e4.push({ raw, v });
      return v;
    }
  };
}

// ---- E5 hook: prediction-error pathway pinning (frozen §10.2) ----
// Installed only when an arm is on, mirroring arms.pinsPredictionErrorPathway().
if (HOOK !== 'off' && arms.pinsPredictionErrorPathway()) {
  globalThis.__M7_PE__ = {
    learningAuthorityFor(raw) {
      rec.laSteps++;
      rec.laRawSeen.add(Number(raw.toFixed(6)));
      if (raw < 1) rec.laRawBelowOne++;
      const pinLA = (PIN === 'on' || PIN === 'la-only');
      const v = pinLA ? 1.0 : raw;                // PIN=off => G12(d) control
      if (v === 1.0) rec.laExactlyOne++;
      return v;
    },
    dampQAllowed() {
      const allowed = (PIN === 'off' || PIN === 'la-only');   // disabled when pinned
      if (allowed) rec.dampInvoked++; else rec.dampSuppressed++;
      return allowed;
    }
  };
}

// ---- E1/E2 hook: environment-controlled traversal (frozen §3.3, §6.1) ----
let ENV_ON = false, CREDIT_ON = false;
if (HOOK !== 'off' && (ENVMODE === 'on' || CREDIT === 'on')) {
  ENV_ON = (ENVMODE === 'on');
  CREDIT_ON = (CREDIT === 'on');
  if (ENVP === 'one') {                       // G3: p_e = 1.0 everywhere
    cfg.pPhase1 = cfg.pPhase1.map(() => 1.0);
    cfg.pPhase2 = cfg.pPhase2.map(() => 1.0);
  }
  env.install(cfg);
  if (ENV_ON) globalThis.__M7_ENV__ = {
    attempt(from, to) {
      if (ENVBUG === 'bypass') return true;                 // never consults env
      // ENVBUG=cogdraw: draw from the COGNITIVE stream instead of the
      // environment stream. Must be detectable by the G2 draw-count check.
      if (ENVBUG === 'cogdraw') { rawLiveRng('cognitive'); }
      let ok = env.attempt(from, to);
      if (ENVBUG === 'doubledraw') env.attempt(from, to);    // second draw = bug
      rec.attempts++;
      if (ok) rec.successes++; else {
        rec.slips++;
        if (rec.slipSamples.length < 40) rec.slipSamples.push({ from: String(from), to: String(to) });
      }
      if (rec.trav.length < 400) rec.trav.push({ from: String(from), to: String(to), ok });
      if (ENVBUG === 'sliptravel') return true;              // slip still traverses
      return ok;
    }
  };

  if (CREDIT_ON) globalThis.__M7_CREDIT__ = {
    recordTraversal(from, to, succeeded) {
      // frozen §6.1: attempt on every traversal attempt OF AN EDGE e,
      // success iff that attempt succeeded.
      // ENVBUG=staleKey faithfully reproduces the historical off-by-one:
      // the key becomes from(previous decision) -> to(current decision),
      // i.e. the temporally stale `agentLast` the legacy site uses.
      const f = (ENVBUG === 'staleKey' && STALE_FROM !== null) ? STALE_FROM : from;
      STALE_FROM = from;                      // remember for the next call

      // ---- M7 CREDIT BOUNDARY (Director ruling, Option 1) ----
      // Only real canonical graph edges may enter the M7 credit namespace.
      // The pre-existing lifecycle can present a non-edge pair (u,u after a
      // goal-reset teleport, or a non-adjacent pair); a non-edge is not a
      // traversal attempt of any edge, so it is CONTAINED here. The baseline
      // state machine is deliberately NOT repaired -- containment only.
      const isRealEdge = arms.edgeIndex(f, to) !== undefined;
      if (!isRealEdge) {
        rec.creditRejected++;
        if (rec.rejectedSamples.length < 40) rec.rejectedSamples.push(String(f) + '->' + String(to));
        if (ENVBUG !== 'noedgecheck') return;      // contained
      }

      const key = f + '->' + to;
      rec.creditKeys.add(key);
      recordAttempt(key);
      if (succeeded) recordSuccess(key);
    }
  };
}
// previous decision's `from`, so ENVBUG=staleKey can reproduce the
// historical temporally-stale mis-key faithfully.
let STALE_FROM = null;

const { dom, timer, restore } = await boot({ seed: SEED });

// record the executed action sequence, exactly as _runonce.js does
const writes = [];
let _lr = globalThis.lastReasoning;
Object.defineProperty(globalThis, 'lastReasoning', {
  configurable: true,
  get() { return _lr; },
  set(v) { _lr = v; writes.push(v ? `${v.from}->${v.to}` : null); }
});

pressSpace(dom);
for (let i = 0; i < TICKS; i++) if (!timer.tick()) break;
restore();

rec.envDrawsAtEnd = env.getCounters().envDraws;

// ---- exact stream-consumption recovery (frozen G2) --------------------
// No draw counter exists in instrumentation/rng.js, and adding one is out of
// scope. Instead the count is RECOVERED: the PRNG is deterministic, so the
// next draw after the run identifies its own index in makeRng(seed). The
// index is unique (verified), so this is an exact measurement, not an
// estimate. Probes run AFTER restore(), so they cannot affect the run.
function recoverCount(streamName, seedForStream, limit = 4_000_000) {
  let probe;
  try { probe = rawRng(streamName); } catch { return null; }
  const ref = makeRng(seedForStream >>> 0);
  for (let i = 0; i < limit; i++) if (ref() === probe) return i;
  return -1;
}
const cogDraws = recoverCount('cognitive', SEED);
const visDraws = recoverCount('visual', (SEED ^ 0x9e3779b9) >>> 0);

// Q-table summary: independent evidence that Q-learning ran, and a
// behavioural fingerprint for isolating the dampQ pathway.
let qEntries = 0, qSum = 0;
Q.forEach((v) => { qEntries++; qSum += v; });

process.stdout.write('@@RESULT@@' + JSON.stringify({
  arm: ARM, seed: SEED, ticks: TICKS, hook: HOOK,
  e3Calls: rec.e3Calls, e4Calls: rec.e4Calls,
  e3Differ: rec.e3Differ, e4Differ: rec.e4Differ,
  e3DistinctRaw: rec.e3RawSeen.size, e3DistinctDelivered: rec.e3DeliveredSeen.size,
  pin: PIN, peHookInstalled: !!globalThis.__M7_PE__,
  laSteps: rec.laSteps, laExactlyOne: rec.laExactlyOne,
  laRawBelowOne: rec.laRawBelowOne, laDistinctRaw: rec.laRawSeen.size,
  dampInvoked: rec.dampInvoked, dampSuppressed: rec.dampSuppressed,
  qEntries, qSum: Number(qSum.toFixed(9)),
  envMode: ENVMODE, creditMode: CREDIT, envBug: ENVBUG,
  envOn: ENV_ON, creditOn: CREDIT_ON, envP: ENVP,
  cogDraws, visDraws,
  attempts: rec.attempts, successes: rec.successes, slips: rec.slips,
  trav: rec.trav, slipSamples: rec.slipSamples,
  creditKeys: [...rec.creditKeys],
  creditRejected: rec.creditRejected, rejectedSamples: rec.rejectedSamples,
  pathAttemptKeys: [...pathAttempts.keys()],
  pathSuccessKeys: [...pathSuccesses.keys()],
  thoughtTrailLen: (globalThis.thoughtTrail ? globalThis.thoughtTrail.length : null),
  e3: rec.e3, e4: rec.e4,
  envDraws: rec.envDrawsAtEnd,
  writes
}));

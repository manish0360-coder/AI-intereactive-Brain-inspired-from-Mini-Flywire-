// ==========================================================
// H1-R — EXPERIMENT RUN DRIVER (one run per OS process, frozen M7 §5.4)
// ==========================================================
// Builds (or reuses) the conformed tree, attaches the H1R runtime (trustMode 'traversal', with the run's
// design position for the R3 environment stream) and the measurement layer (measure.mjs, bound and checked by
// measure_install.mjs per D-019 §5 N5′), and executes the UNCHANGED experiments/m7/run.js of that tree with the
// frozen run settings. Writes one record: run.js's own record fields, H1-R build provenance, the 11 validity
// conditions (v1.0 §10; measurementClean per D-020 pin 3), and the measurement record (v1.0 §9 items 1–7).
//
//   node experiments/h1r/run_h1r.mjs '{"configSeed":...,"configIndex":...,"agentSeed":...,"arm":"A1","block":"pilot"}'
//     "block" ('pilot' | 'heldout') is the configuration's block: with the agent seed and the accepted
//     configuration index (= configIndex, the ERR-07 acceptedConfigIndex) it fixes the run's
//     configuration-scoped environment stream (R3, env_seed.mjs).
//     optional:
//       "ticks"      default 3000
//       "out"        file path; default stdout
//       "digestOnly" true: the measurement block carries counts and SHA-256 digests instead of the records
//                    (used by verification, which must not expose outcomes)
//       "fork"       { "call": <runAgent() call index> | null, "to": "A2" } — fork mode (v1.0 §8 link ④): the run
//                    must be arm A1; immediately before that call the E3 and E4 deliveries switch to A2's
//                    (runtime.mjs armFork). `call: null` arms the hook without switching (gate control). For a
//                    sampled decision tick t the pre-registered fork uses call t + 5.
//       "prefixAt"   [c, ...]: also report the digest of every measurement record of the calls before c
//                    (fork gate: a fork equals the original for τ < t)
//
// This driver performs no analysis: it never aggregates rewards into returns, windows or comparisons, and it
// computes no flip, calibration or advantage statistic. It checks the integrity of what it records.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from './build_tree.mjs';
import { installH1R } from './runtime.mjs';
import { MEASURE_SCHEMA } from './measure.mjs';
import { installMeasure, verifySinkBinding } from './measure_install.mjs';
import { analyzeShadow, step0Groups } from './shadow.mjs';
import { ENV_STREAM, blockCodeOf, segmentsOverlap } from './env_seed.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const shaText = (s) => crypto.createHash('sha256').update(s).digest('hex');
const IN = JSON.parse(process.argv[2] || '{}');
for (const k of ['configSeed', 'configIndex', 'agentSeed', 'arm', 'block']) if (IN[k] === undefined) throw new Error(`run_h1r: ${k} required`);
if (IN.fork !== undefined && IN.arm !== 'A1') throw new Error('run_h1r: fork mode replays an A1 run (v1.0 §8 link ④)');
const OUT = IN.out ? path.resolve(IN.out) : null;
const RUN_CALLS = 3005, SNAP_CALLS = 1505;          // v1.0 §6; D-020 pin 2

const tree = IN.tree ? { dir: IN.tree, manifest: JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8')) } : buildTree();
const transformSha256 = sha(path.join(HERE, 'conformance_transform.mjs'));
const envPosition = { agentSeed: IN.agentSeed, blockCode: blockCodeOf(IN.block), acceptedConfigIndex: IN.configIndex };
const H = await installH1R({ tree: tree.dir, trustMode: 'traversal', envPosition });
const M = installMeasure();                         // N5′: refuses to return unless the binding verifies
const pinnedScore = M.score;
await H.attachMeasure(M);
if (IN.fork !== undefined) H.armFork(IN.fork);

process.chdir(path.join(tree.dir, 'experiments', 'm7'));   // the working directory the verified harness uses
const { runOnce } = await import(pathToFileURL(path.join(tree.dir, 'experiments', 'm7', 'run.js')).href);
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: IN.arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks ?? 3000, crashAtTick: null, warmStore: false });
H.finalSnapshot();

const m = M.record();
const A = rec.artifacts, R = ENV_STREAM.reserve, I = H.instrument;
const { arbitrate } = await import(pathToFileURL(path.join(tree.dir, 'render', 'executiveController.js')).href);
const sh = analyzeShadow(m, arbitrate);
const sinkAtEnd = verifySinkBinding(globalThis, pinnedScore);

// per-tick records (v1.0 §9 item 1): one flag per call — D decision, R replay, N neither (no-commit); X both
const nDec = new Array(m.calls).fill(0), nRep = new Array(m.calls).fill(0);
let tickFaults = 0;
for (const [c] of m.decisions) if (c >= 0 && c < m.calls) nDec[c]++; else tickFaults++;
for (const c of m.replays) if (c >= 0 && c < m.calls) nRep[c]++; else tickFaults++;
const ticks = nDec.map((d, i) => (d > 1 || nRep[i] > 1) ? 'X' : d && nRep[i] ? 'X' : d ? 'D' : nRep[i] ? 'R' : 'N').join('');
const finite = (xs) => xs.every(x => Number.isFinite(x));
const snap = (label, calls) => { const s = m.snapshots.filter(x => x[0] === label); return s.length === 1 && s[0][1] === calls && s[0][2].every(e => finite(e.slice(1))); };
const resetCount = (k) => m.resets.filter(r => r[1] === k).length;
const forkOk = IN.fork === undefined || IN.fork.call === null
  ? m.forks.length === 0 && I.forkApplied.length === 0
  : m.forks.length === 1 && m.forks[0][0] === IN.fork.call && m.forks[0][1] === 'A2' && I.forkApplied.length === 1 && I.forkApplied[0] === IN.fork.call;
// D-020 pin 3: measurementClean is true iff every measurement record is clean (scope: the v1.0 §9 layer)
const clean = {
  reward: m.multi === 0 && m.orphan === 0 && m.nonFinite === 0,
  perTick: ticks.length === m.calls && !ticks.includes('X') && tickFaults === 0,
  perAttempt: m.attempts.length === A.envCounters?.envDraws && m.attempts.every(a => finite([a[0], a[1], a[2], a[5], a[6]])) && I.drawFaults === 0,
  resets: resetCount('goal') === H.counters.resets.goal && resetCount('cap') === H.counters.resets.cap && m.resets.length === H.counters.resets.goal + H.counters.resets.cap,
  scoreShadow: sh.pairingOk && sh.groupFaults === 0 && sh.nonFiniteStep0 === 0 && sh.step0ArgmaxMismatch === 0,
  snapshots: snap('tau1499', SNAP_CALLS) && snap('tau2999', RUN_CALLS) && m.snapshots.length === 2 && I.snapshotFaults === 0,
  floor: Number.isFinite(m.floors.length) && m.floors.length >= 0,
  fork: forkOk,
};
const within = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const validity = {
  completed: rec.outcome.completed === true && rec.outcome.crashed === false,
  episodeCapArmed: rec.provenance?.episodeCapArmed === true,
  replayCooldownDeterministic: rec.provenance?.replayCooldownDeterministic === true,
  runtimeAttached: globalThis.__H1R__ === H && H.on === true && H.trustMode === 'traversal',
  transformMatches: tree.manifest.transformSha256 === transformSha256,
  measurementClean: Object.values(clean).every(Boolean),
  // R3: initRng registered the derived environment seed exactly once, for this run's agent seed
  envStreamScoped: H.envSeedLog.length === 1 && H.envSeedLog[0].agentSeed === IN.agentSeed && H.envSeedLog[0].envSeed === H.envStream.envSeed,
  // R3: every stream stayed inside the reserve the overlap proof assumes
  envDrawsWithinReserve: within(A.envCounters?.envDraws, ENV_STREAM.L),
  cognitiveDrawsWithinReserve: within(A.cogDraws, R.cognitive),
  visualDrawsWithinReserve: within(A.visDraws, R.visual),
  // R3: the run's environment segment shares no state with its own configuration's generator
  envSegmentDisjointFromConfig: Number.isInteger(rec.provenance?.acceptedSeed) && !segmentsOverlap(H.envStream.envSeed, ENV_STREAM.L, rec.provenance.acceptedSeed, R.config),
};
// integrity of the instrument beyond the validity flag (reported; the verification gates require them)
const integrity = {
  sinkBindingAtEnd: sinkAtEnd.ok, sinkProblems: sinkAtEnd.problems,
  n6bClampMismatch: sh.n6bClampMismatch, argmaxMismatchAllSteps: sh.argmaxMismatch, reconstructionMismatch: sh.reconstructionMismatch,
  scoreCalls: sh.scoreCalls, step0Groups: sh.step0Groups, step0Candidates: sh.step0Candidates, step0GroupsPerCallMax: sh.step0GroupsPerCallMax,
  nonFiniteFinalWeight: sh.nonFiniteF, nonFiniteTrustTerm: sh.nonFiniteT, clampBinding: sh.clampBinding, clampBindingHigh: sh.clampBindingHigh, clampBindingLow: sh.clampBindingLow,
  snapshotLoopIndex: I.snapshotLoop, snapshotPhase: I.snapshotPhase, loopEntries: I.loopEntries, drawFaults: I.drawFaults, floorCount: m.floors.length,
  clean,
};

// measurement payload, restricted to the calls before `cut` (snapshots: those taken before call `cut` starts).
// The fork record itself is excluded, so a fork and its original are comparable.
const joined = m.candidates.map((c, k) => [...c, m.score[2 * k], m.score[2 * k + 1]]);
function payload(cut) {
  const lt = (c) => c < cut;
  return { events: m.events.filter(e => lt(e[0])), ticks: ticks.slice(0, Math.min(cut, ticks.length)), candidates: joined.filter(c => lt(c[0])),
    bests: m.bests.filter(b => lt(b[0])), decisions: m.decisions.filter(d => lt(d[0])), replays: m.replays.filter(lt), floors: m.floors.filter(lt),
    attempts: m.attempts.filter(a => lt(a[0])), resets: m.resets.filter(r => lt(r[0])), snapshots: m.snapshots.filter(s => s[1] <= cut) };
}
const digests = { reward: M.digest(), full: shaText(JSON.stringify(payload(Infinity))),
  prefix: Object.fromEntries((IN.prefixAt || []).map(c => [c, shaText(JSON.stringify(payload(c)))])) };

// run.js asserts the B2 environment seed (agentSeed XOR 0x5EED) in its record; under R3 the stream was
// registered with the derived seed, so the record carries the seed actually used, and run.js's value apart.
const rngSeeds = { ...rec.provenance.rngSeeds, environment: H.envStream.envSeed };
const counts = { calls: m.calls, eventCount: m.eventCount, multi: m.multi, orphan: m.orphan, nonFinite: m.nonFinite,
  decisions: m.decisions.length, replays: m.replays.length, attempts: m.attempts.length, resets: m.resets.length, floors: m.floors.length,
  candidates: m.candidates.length, snapshots: m.snapshots.map(s => [s[0], s[1], s[2].length]), forks: m.forks };
const out = {
  schema: 'h1r.run/2',
  provenance: { ...rec.provenance, rngSeeds,
    h1r: { b2Commit: tree.manifest.b2Commit, transformSha256: tree.manifest.transformSha256,
           runtimeSha256: sha(path.join(HERE, 'runtime.mjs')), measureSha256: sha(path.join(HERE, 'measure.mjs')),
           measureInstallSha256: sha(path.join(HERE, 'measure_install.mjs')), shadowSha256: sha(path.join(HERE, 'shadow.mjs')),
           envSeedSha256: sha(path.join(HERE, 'env_seed.mjs')),
           driverSha256: sha(fileURLToPath(import.meta.url)), trustMode: H.trustMode,
           envStream: { rule: ENV_STREAM.rule, block: IN.block, ...H.envStream, runJsAssertedEnvironmentSeed: rec.provenance.rngSeeds.environment },
           fork: IN.fork === undefined ? null : { call: IN.fork.call, to: IN.fork.to ?? 'A2' } } },
  outcome: rec.outcome,
  fingerprint: rec.fingerprint,
  validity: { ...validity, valid: Object.values(validity).every(Boolean) },
  integrity,
  measurement: IN.digestOnly
    ? { schema: MEASURE_SCHEMA, ...counts, digest: digests.reward, digests }
    : { schema: MEASURE_SCHEMA, ...counts, digests,
        events: m.events, ticks, attempts: m.attempts, resets: m.resets, snapshots: m.snapshots, floorCalls: m.floors,
        decisions: m.decisions,
        // step-0 candidate records, one group per step-0 weight sort: [call, bestChoice key,
        //   [[key, F (pre-clamp), t = trustBonus·1.5, returned, w, applied, arb[5], uncertainty, ew[6], selfLoop], ...]]
        step0: step0Groups(m).map(g => [g.call, g.best, g.cands.map(c => [c.key, c.F, c.t, c.returned, c.w, c.applied, c.arb, c.unc, c.ew, c.self])]) },
};
const text = JSON.stringify(out);
if (OUT) fs.writeFileSync(OUT, text); else process.stdout.write('@@H1RRUN@@' + text);

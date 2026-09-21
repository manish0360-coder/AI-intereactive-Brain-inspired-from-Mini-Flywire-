// ==========================================================
// STUDY-2 RUN CHILD — one V2.3 + M7 run with the S-SHADOW capture, in its own process
// ==========================================================
// Spawned by drive_study2.mjs (mode 'study') or by shakedown.mjs (mode 'shakedown', development fixture only).
// Input: env RUN_SPEC (JSON). Output: one artifact file in spec.out, and one '@@S2RUN@@' summary line on stdout.
//
// This process never computes, imports or reads the oracle, p, tau-b or Delta. The artifact holds the step-0
// vectors (k, FS_FULL, FS_GEO) per decision event; scoring against U* happens only in analyze_study2.mjs.
//
// Exit codes: 0 completed · 3 run crashed (recorded, §T) · 4 apparatus-integrity failure (driver halts) · 1 refused
// ==========================================================
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DESIGN, DEV_FIXTURES, assertSeedAllowed, goalOf } from './governance.mjs';
import { computeManifest, manifestSha256, shaLF } from './manifest.mjs';
import { installCapture, rawHashOfVector } from './capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const U = pathToFileURL(ROOT).href;
const spec = JSON.parse(process.env.RUN_SPEC || 'null');
const fail = (msg) => { process.stderr.write(`S2 run child refused: ${msg}\n`); process.exit(1); };
if (!spec || typeof spec !== 'object') fail('RUN_SPEC missing');
const { mode, capture, configSeed, configIndex, out } = spec;
if (typeof capture !== 'boolean' || !Number.isSafeInteger(configSeed) || !Number.isSafeInteger(configIndex) || typeof out !== 'string') fail('RUN_SPEC malformed');

// ---- seed guard: BEFORE any module that can generate a configuration is imported ----
if (mode === 'shakedown') {
  if (!DEV_FIXTURES.some(([s, i]) => s === configSeed && i === configIndex)) fail(`shakedown accepts development fixtures only, got ${configSeed}:${configIndex}`);
} else if (mode === 'study') {
  if (process.env.STUDY2_EXECUTION_AUTHORISED !== '1') fail('study mode requires STUDY2_EXECUTION_AUTHORISED=1');
  assertSeedAllowed(configSeed, spec.block);                     // registered block, not a fixture, not consumed/held out
  if (configSeed !== spec.acceptedSeed) fail('study mode runs the accepted seed of its plan slot only');
} else fail(`unknown mode ${mode}`);

if (capture) register(pathToFileURL(path.join(HERE, 'hook_capture.mjs')).href, import.meta.url);
const env = await import(U + '/experiments/m7/env.js');
const TR = await import(U + '/render/traversalRecord.js');
const search = await import(U + '/render/search.js');
const FULL = capture ? await import(U + '/render/planning.js?s2=FULL') : null;
const GEO = capture ? await import(U + '/render/planning.js?s2=GEO') : null;
const { runOnce } = await import(U + '/experiments/m7/run.js');

const readLF = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const conns = JSON.parse(readLF('connections.json'));
const DIRECTED = conns.flatMap((c) => [[c.from, c.to], [c.to, c.from]]);
const adj = new Map();
for (const c of conns) { (adj.get(c.from) || adj.set(c.from, []).get(c.from)).push(c.to); (adj.get(c.to) || adj.set(c.to, []).get(c.to)).push(c.from); }
// independent BFS (not render/planning.js) — the GEO expectation FS = -d(k, g)
const distCache = new Map();
const distFrom = (g) => { if (distCache.has(g)) return distCache.get(g); const d = new Map([[g, 0]]), q = [g]; while (q.length) { const x = q.shift(); for (const y of adj.get(x) || []) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } distCache.set(g, d); return d; };

const cap = capture ? installCapture({ FULL, GEO, search, TR, DIRECTED, distFrom }) : null;
const run = await runOnce({
  configSeed, configIndex, agentSeed: DESIGN.agentSeed, arm: DESIGN.arm,
  envMode: DESIGN.envMode, creditMode: DESIGN.creditMode, pin: DESIGN.pin, tickUnit: DESIGN.tickUnit, ticks: DESIGN.ticks,
  crashAtTick: null, warmStore: false,
});
if (cap) cap.uninstall();

// ---- provenance (N): every identity recorded under its own name; there is no generic "commit" field ----
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } };
const PRODUCTION = ['main.js', 'render', 'index.html', 'instrumentation', 'neurons.json', 'connections.json', 'experiments/m7'];
const manifest = computeManifest();
const prov = run.provenance;
const touched = env.evaluatedSeeds();
const a = run.artifacts;
const finalSnap = DIRECTED.map(([u, v]) => { const r = TR.recordFor(u, v); return [u, v, r.a, r.s]; });
const fingerprint = {
  writesHash: crypto.createHash('sha256').update(JSON.stringify(a.writes)).digest('hex'),
  nWrites: a.writes.length, cogDraws: a.cogDraws, visDraws: a.visDraws, qEntries: a.qEntries, qSum: a.qSum,
  envCounters: a.envCounters, attempts: a.attempts, successes: a.successes, slips: a.slips,
  finalRecordHash: crypto.createHash('sha256').update(JSON.stringify(finalSnap)).digest('hex'),
};
const events = cap ? cap.events : null;
const vectors = cap ? cap.vectors : null;
const evidence = { events, vectors, tickLog: cap ? cap.tickLog : null, fingerprint };
const provenance = {
  schema: 'study2-run/1', mode, slot: spec.slot ?? null, capture,
  productionBaselineCommit: DESIGN.productionBaselineCommit,
  productionTreeMatchesBaseline: git('diff', '--name-only', DESIGN.productionBaselineCommit, '--', ...PRODUCTION) === '',
  study2DriverCommit: git('rev-parse', 'HEAD'),
  study2DriverTreeClean: git('status', '--porcelain', '--', ...Object.keys(manifest.files)) === '',
  driverManifestSha256: manifestSha256(manifest),
  analysisScriptSha256: manifest.analysisSha256,
  registrationSha256: spec.registrationSha256 ?? null, planSha256: spec.planSha256 ?? null,
  graphSha256: shaLF(readLF('connections.json')), neuronsSha256: shaLF(readLF('neurons.json')),
  environmentSha256: shaLF(['experiments/m7/env.js', 'experiments/m7/run.js', 'instrumentation/rng.js'].map((f) => `${shaLF(readLF(f))}  ${f}`).join('\n')),
  environmentIdentity: { node: process.version, v8: process.versions.v8, platform: process.platform, arch: process.arch },
  agentSeed: DESIGN.agentSeed, rngStreamSeeds: prov.rngSeeds, m7Sources: prov.sources,
  configSeed, configIndex, goal: prov.goal,
  slotStartingSeed: spec.startingSeed ?? configSeed,
  acceptedSeed: prov.acceptedSeed,
  rejectionCount: spec.rejectionCount ?? prov.numberOfRejectedCandidatesBeforeAcceptance,
  runOnceRejectionCount: prov.numberOfRejectedCandidatesBeforeAcceptance,
  primaryWindow: { tauMax: DESIGN.primaryWindowMaxTau, tauDefinition: 'tau = 0-based runAgent index - 5 (G-IMPL-3)', phaseII: 'tau >= 1500' },
  rngFingerprint: { cogDraws: a.cogDraws, visDraws: a.visDraws, envCounters: a.envCounters },
  seedsTouched: touched,
  eventCount: events ? events.length : null,
  runAgentCalls: capture ? globalThis.__S2_STEP__ + 1 : null,
  evidenceIntegritySha256: crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
};

// ---- apparatus integrity (the readiness gate's checks, per run) ----
const failures = [];
const need = (name, cond) => { if (!cond) failures.push(name); };
need('acceptedAtOwnSeed', prov.acceptedSeed === configSeed && prov.numberOfRejectedCandidatesBeforeAcceptance === 0);
need('goalMatchesIndex', prov.goal === goalOf(configIndex));
need('episodeCapArmed', prov.episodeCapArmed === true);
need('replayCooldownDeterministic', prov.replayCooldownDeterministic === true);
need('onlyOwnSeedEvaluated', touched.length === 1 && touched[0] === configSeed);
if (capture && !run.crash) {
  const all = (f) => events.length > 0 && events.every(f);
  for (const k of ['A_sameIds', 'B_sameCardinality', 'C_noMissing', 'D_noExtra', 'E_noDuplicates', 'F_orderDeterministic', 'G_targetEqualsCandidate']) need(`K(e).${k}`, all((e) => e.idCheck[k]));
  for (const k of ['fullEqLive', 'geoEqNegD', 'liveUnchanged', 'snapUnchanged', 'shadowInInvocation', 'shadowBeforeDecision', 'snapUnboundAfter']) need(k, all((e) => e[k] === true));
  need('oneGoalPerEvent', all((e) => e.goalCount === 1));
  need('eventGoalIsRunGoal', vectors.every((v) => v.goal === prov.goal));
  need('oneEventPerRunAgent', Math.max(0, ...cap.eventsPerStep.values()) === 1);
  const T = cap.tickLog;
  need('tickConvention', JSON.stringify(T[0]) === '[0,-1]' && T.slice(1).every(([t, s]) => s === t + 4)
    && events.every((e) => (e.t < 5 ? e.lastTick === 0 : e.lastTick === 5 * Math.floor((e.t - 5) / 5))));
  need('phaseMatchesTau', events.every((e) => (e.lastTick >= 1500) === (e.t - 5 >= 1500)));
  need('vectorsReproduceRawHash', vectors.length === events.length && vectors.every((v, i) => rawHashOfVector(v) === events[i].rawHash));
}
const status = run.crash ? 'crashed' : failures.length ? 'integrity-failure' : 'completed';

const name = `${mode === 'shakedown' ? `shakedown_${configSeed}_${configIndex}` : `run_${String(spec.slot).padStart(3, '0')}`}_${capture ? 'capture' : 'nocapture'}${spec.attempt ? '_attempt' + spec.attempt : ''}.json`;
const artifact = { provenance, status, integrityFailures: failures, crash: run.crash ? String(run.crash.message || run.crash) : null,
  fingerprint, events, vectors, tickLog: evidence.tickLog, maxEventsPerStep: cap ? Math.max(0, ...cap.eventsPerStep.values()) : null };
fs.mkdirSync(out, { recursive: true });
const body = JSON.stringify(artifact);
fs.writeFileSync(path.join(out, name), body);
process.stdout.write('@@S2RUN@@' + JSON.stringify({ status, capture, slot: spec.slot ?? null, eventCount: provenance.eventCount,
  fingerprint, integrityFailures: failures, artifact: name, artifactSha256: crypto.createHash('sha256').update(body).digest('hex') }));
process.exit(status === 'completed' ? 0 : status === 'crashed' ? 3 : 4);

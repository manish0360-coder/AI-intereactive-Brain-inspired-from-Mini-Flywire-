// ==========================================================
// H1-R — EXPERIMENT RUN DRIVER (one run per OS process, frozen M7 §5.4)
// ==========================================================
// Builds (or reuses) the conformed tree, attaches the H1R runtime (trustMode 'traversal', with the run's
// design position for the R3 environment stream) and the measurement layer (measure.mjs), and executes
// the UNCHANGED experiments/m7/run.js of that tree with the frozen run settings. Writes one record:
// run.js's own record fields, H1-R build provenance, validity conditions, and the per-call reward record.
//
//   node experiments/h1r/run_h1r.mjs '{"configSeed":...,"configIndex":...,"agentSeed":...,"arm":"A1","block":"pilot"}'
//     "block" ('pilot' | 'heldout') is the configuration's block: with the agent seed and the accepted
//     configuration index (= configIndex, the ERR-07 acceptedConfigIndex) it fixes the run's
//     configuration-scoped environment stream (R3, env_seed.mjs).
//     optional: "ticks" (default 3000), "out" (file path; default stdout), "digestOnly" (true: the
//     measurement block carries counts and a SHA-256 of the events instead of the reward values —
//     used by verification, which must not expose outcomes).
//
// This driver performs no analysis: it never aggregates rewards into returns, windows or comparisons.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from './build_tree.mjs';
import { installH1R } from './runtime.mjs';
import { installMeasure, MEASURE_SCHEMA } from './measure.mjs';
import { ENV_STREAM, blockCodeOf, segmentsOverlap } from './env_seed.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const IN = JSON.parse(process.argv[2] || '{}');
for (const k of ['configSeed', 'configIndex', 'agentSeed', 'arm', 'block']) if (IN[k] === undefined) throw new Error(`run_h1r: ${k} required`);
const OUT = IN.out ? path.resolve(IN.out) : null;

const tree = IN.tree ? { dir: IN.tree, manifest: JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8')) } : buildTree();
const transformSha256 = sha(path.join(HERE, 'conformance_transform.mjs'));
const envPosition = { agentSeed: IN.agentSeed, blockCode: blockCodeOf(IN.block), acceptedConfigIndex: IN.configIndex };
const H = await installH1R({ tree: tree.dir, trustMode: 'traversal', envPosition });
const M = installMeasure();

process.chdir(path.join(tree.dir, 'experiments', 'm7'));   // the working directory the verified harness uses
const { runOnce } = await import(pathToFileURL(path.join(tree.dir, 'experiments', 'm7', 'run.js')).href);
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: IN.arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks ?? 3000, crashAtTick: null, warmStore: false });

const m = M.record();
const A = rec.artifacts, R = ENV_STREAM.reserve;
const within = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const validity = {
  completed: rec.outcome.completed === true && rec.outcome.crashed === false,
  episodeCapArmed: rec.provenance?.episodeCapArmed === true,
  replayCooldownDeterministic: rec.provenance?.replayCooldownDeterministic === true,
  runtimeAttached: globalThis.__H1R__ === H && H.on === true && H.trustMode === 'traversal',
  transformMatches: tree.manifest.transformSha256 === transformSha256,
  measurementClean: m.multi === 0 && m.orphan === 0 && m.nonFinite === 0,
  // R3: initRng registered the derived environment seed exactly once, for this run's agent seed
  envStreamScoped: H.envSeedLog.length === 1 && H.envSeedLog[0].agentSeed === IN.agentSeed && H.envSeedLog[0].envSeed === H.envStream.envSeed,
  // R3: every stream stayed inside the reserve the overlap proof assumes
  envDrawsWithinReserve: within(A.envCounters?.envDraws, ENV_STREAM.L),
  cognitiveDrawsWithinReserve: within(A.cogDraws, R.cognitive),
  visualDrawsWithinReserve: within(A.visDraws, R.visual),
  // R3: the run's environment segment shares no state with its own configuration's generator
  envSegmentDisjointFromConfig: Number.isInteger(rec.provenance?.acceptedSeed) && !segmentsOverlap(H.envStream.envSeed, ENV_STREAM.L, rec.provenance.acceptedSeed, R.config),
};
// run.js asserts the B2 environment seed (agentSeed XOR 0x5EED) in its record; under R3 the stream was
// registered with the derived seed, so the record carries the seed actually used, and run.js's value apart.
const rngSeeds = { ...rec.provenance.rngSeeds, environment: H.envStream.envSeed };
const out = {
  schema: 'h1r.run/1',
  provenance: { ...rec.provenance, rngSeeds,
    h1r: { b2Commit: tree.manifest.b2Commit, transformSha256: tree.manifest.transformSha256,
           runtimeSha256: sha(path.join(HERE, 'runtime.mjs')), measureSha256: sha(path.join(HERE, 'measure.mjs')),
           envSeedSha256: sha(path.join(HERE, 'env_seed.mjs')),
           driverSha256: sha(fileURLToPath(import.meta.url)), trustMode: H.trustMode,
           envStream: { rule: ENV_STREAM.rule, block: IN.block, ...H.envStream, runJsAssertedEnvironmentSeed: rec.provenance.rngSeeds.environment } } },
  outcome: rec.outcome,
  fingerprint: rec.fingerprint,
  validity: { ...validity, valid: Object.values(validity).every(Boolean) },
  measurement: IN.digestOnly
    ? { schema: MEASURE_SCHEMA, calls: m.calls, eventCount: m.eventCount, multi: m.multi, orphan: m.orphan, nonFinite: m.nonFinite, digest: M.digest() }
    : m,
};
const text = JSON.stringify(out);
if (OUT) fs.writeFileSync(OUT, text); else process.stdout.write('@@H1RRUN@@' + text);

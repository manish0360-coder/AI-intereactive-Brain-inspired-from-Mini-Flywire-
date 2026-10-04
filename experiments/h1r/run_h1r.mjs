// ==========================================================
// H1-R — EXPERIMENT RUN DRIVER (one run per OS process, frozen M7 §5.4)
// ==========================================================
// Builds (or reuses) the conformed tree, attaches the H1R runtime (trustMode 'traversal') and the
// measurement layer (measure.mjs), and executes the UNCHANGED experiments/m7/run.js of that tree with
// the frozen run settings. Writes one record: run.js's own record fields, H1-R build provenance,
// validity conditions, and the per-call reward record.
//
//   node experiments/h1r/run_h1r.mjs '{"configSeed":...,"configIndex":...,"agentSeed":...,"arm":"A1"}'
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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const IN = JSON.parse(process.argv[2] || '{}');
for (const k of ['configSeed', 'configIndex', 'agentSeed', 'arm']) if (IN[k] === undefined) throw new Error(`run_h1r: ${k} required`);
const OUT = IN.out ? path.resolve(IN.out) : null;

const tree = IN.tree ? { dir: IN.tree, manifest: JSON.parse(fs.readFileSync(path.join(IN.tree, 'MANIFEST.json'), 'utf8')) } : buildTree();
const transformSha256 = sha(path.join(HERE, 'conformance_transform.mjs'));
const H = await installH1R({ tree: tree.dir, trustMode: 'traversal' });
const M = installMeasure();

process.chdir(path.join(tree.dir, 'experiments', 'm7'));   // the working directory the verified harness uses
const { runOnce } = await import(pathToFileURL(path.join(tree.dir, 'experiments', 'm7', 'run.js')).href);
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: IN.arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks ?? 3000, crashAtTick: null, warmStore: false });

const m = M.record();
const validity = {
  completed: rec.outcome.completed === true && rec.outcome.crashed === false,
  episodeCapArmed: rec.provenance?.episodeCapArmed === true,
  replayCooldownDeterministic: rec.provenance?.replayCooldownDeterministic === true,
  runtimeAttached: globalThis.__H1R__ === H && H.on === true && H.trustMode === 'traversal',
  transformMatches: tree.manifest.transformSha256 === transformSha256,
  measurementClean: m.multi === 0 && m.orphan === 0 && m.nonFinite === 0,
};
const out = {
  schema: 'h1r.run/1',
  provenance: { ...rec.provenance,
    h1r: { b2Commit: tree.manifest.b2Commit, transformSha256: tree.manifest.transformSha256,
           runtimeSha256: sha(path.join(HERE, 'runtime.mjs')), measureSha256: sha(path.join(HERE, 'measure.mjs')),
           driverSha256: sha(fileURLToPath(import.meta.url)), trustMode: H.trustMode } },
  outcome: rec.outcome,
  fingerprint: rec.fingerprint,
  validity: { ...validity, valid: Object.values(validity).every(Boolean) },
  measurement: IN.digestOnly
    ? { schema: MEASURE_SCHEMA, calls: m.calls, eventCount: m.eventCount, multi: m.multi, orphan: m.orphan, nonFinite: m.nonFinite, digest: M.digest() }
    : m,
};
const text = JSON.stringify(out);
if (OUT) fs.writeFileSync(OUT, text); else process.stdout.write('@@H1RRUN@@' + text);

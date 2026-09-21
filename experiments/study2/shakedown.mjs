// Study-2 run-child SHAKEDOWN on the permitted DEVELOPMENT fixture 896066:0 — capture ON and OFF.
// Not Study 2: no registered seed, no driver, no oracle, no tau-b, no Delta. It exists to prove that the Study-2
// run child reproduces, event for event, the capture evidence already gated at the readiness closure (cfadedd9),
// and that it does not perturb the run. The full artifacts go to a temporary directory; only digests, counts and
// the provenance record are committed (shakedown_evidence/SHAKEDOWN.json).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'shakedown_evidence');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 's2-shakedown-'));
const RUNS = Object.freeze([true, false]);                       // capture on, capture off — a literal list
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

const res = {};
for (const capture of RUNS) {
  const spec = { mode: 'shakedown', capture, configSeed: 896066, configIndex: 0, out: TMP };
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, 'run_child.mjs')], { cwd: HERE, encoding: 'utf8',
    env: { ...process.env, RUN_SPEC: JSON.stringify(spec) }, maxBuffer: 256 * 1024 * 1024 });
  const ms = Date.now() - t0;
  if (r.status !== 0) { console.error(`shakedown capture=${capture} exit ${r.status}\n${(r.stderr || '').slice(-3000)}\n${(r.stdout || '').slice(-500)}`); process.exit(1); }
  const s = JSON.parse(r.stdout.slice(r.stdout.lastIndexOf('@@S2RUN@@') + 9));
  const art = JSON.parse(fs.readFileSync(path.join(TMP, s.artifact), 'utf8'));
  res[capture ? 'on' : 'off'] = { s, art, ms, bytes: fs.statSync(path.join(TMP, s.artifact)).size };
  console.log(`capture=${capture} status=${s.status} events=${s.eventCount} ${ms} ms`);
}
const on = res.on.art, off = res.off.art;
const fields = Object.keys(on.fingerprint);
const differing = fields.filter((k) => JSON.stringify(on.fingerprint[k]) !== JSON.stringify(off.fingerprint[k]));
const E = on.events;
const count = (f) => E.filter(f).length;
const summary = {
  schema: 'study2-shakedown/1', fixture: '896066:0', note: 'development fixture only; no oracle, tau-b or Delta computed',
  statusOn: on.status, statusOff: off.status, integrityFailuresOn: on.integrityFailures, integrityFailuresOff: off.integrityFailures,
  eventCount: E.length, runAgentCalls: on.provenance.runAgentCalls, maxEventsPerStep: on.maxEventsPerStep,
  primaryWindowEvents: on.vectors.filter((v) => v.tau <= 1500).length,
  eventsDigest: sha(JSON.stringify(E)), tickLogDigest: sha(JSON.stringify(on.tickLog)),
  vectorsDigest: sha(JSON.stringify(on.vectors)), vectorCount: on.vectors.length,
  vectorTauMatchesEventT: on.vectors.every((v, i) => v.tau === E[i].t - 5),
  vectorCandidateCounts: on.vectors.every((v, i) => v.k.length === E[i].nCand && v.full.length === v.k.length && v.geo.length === v.k.length),
  checkCounts: Object.fromEntries(['fullEqLive', 'geoEqNegD', 'liveUnchanged', 'snapUnchanged', 'shadowInInvocation', 'shadowBeforeDecision', 'snapUnboundAfter']
    .map((k) => [k, count((e) => e[k] === true)]).concat(Object.keys(E[0].idCheck).map((k) => [k, count((e) => e.idCheck[k])]))),
  diagnostics: { executedInK: count((e) => e.executedInK), executedAugmented: count((e) => e.executedAugmented), eventsWithAugmentation: count((e) => e.nAugmented > 0) },
  nonInterference: { fields, differing, on: on.fingerprint, off: off.fingerprint },
  provenanceOn: on.provenance, provenanceOff: off.provenance,
  timingMs: { captureOn: res.on.ms, captureOff: res.off.ms, informational: 'wall clock on the development machine; not part of any check' },
  artifactBytes: { captureOn: res.on.bytes, captureOff: res.off.bytes, informational: 'size of one run artifact; not part of any check' },
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'SHAKEDOWN.json'), JSON.stringify(summary, null, 1) + '\n');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`non-interference: ${differing.length ? 'DIFFERS on ' + differing.join(',') : `identical on all ${fields.length} fields`}`);
if (differing.length || on.status !== 'completed' || off.status !== 'completed') process.exit(2);

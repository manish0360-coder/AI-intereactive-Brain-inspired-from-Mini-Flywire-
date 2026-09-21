// ==========================================================
// STUDY-2 DRIVER — executes the Director-registered run block, and nothing else
// ==========================================================
// NOT EXECUTED AT THE COMMIT THAT INTRODUCES IT. It refuses to request a single configuration seed unless ALL of:
//   1. the command line says --execute and names a registration file;
//   2. the process was started with STUDY2_EXECUTION_AUTHORISED=1;
//   3. the registration validates against the frozen design (governance.validateRegistration), including a
//      fresh seed block, a run count that is a positive multiple of 4, and the agentSeed trajectory use;
//   4. the driver/analysis files on disk reproduce the manifest the registration pins (D20), are committed and
//      unmodified, and the production tree equals the production baseline;
//   5. the output directory does not exist yet (no resumption, no cherry-picking of partial blocks).
//
// Order of work, fixed:
//   plan    — the acceptance walk over the registered block (governance.planAcceptanceWalk); PLAN.json is
//             written and hashed BEFORE any agent run. Seeds are requested strictly ascending from the block start.
//   execute — every plan slot, in slot order, one child process each (run_child.mjs, capture ON). No slot is
//             skipped, added, repeated or reordered. A crashed run is recorded and not replaced (§T). An
//             apparatus-integrity failure HALTS the block for a Director ruling; nothing is substituted.
//   replay  — the pre-registered G-IMPL-2 replay: slot 0 re-run with the capture OFF, fingerprints compared (§S);
//             on a mismatch slot 0 is re-executed once, and the failure is reported (§U).
//
// The driver never imports or spawns the analysis, never reads the oracle, and never parses a run artifact: from
// each child it reads only the whitelisted summary (status, fingerprint, event count, integrity names, artifact
// hash). The outcome Delta does not exist until analyze_study2.mjs runs, separately, after the block is complete.
//
//   STUDY2_EXECUTION_AUTHORISED=1 node experiments/study2/drive_study2.mjs --execute --registration <file> --out <dir>
// ==========================================================
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DESIGN, validateRegistration, planAcceptanceWalk } from './governance.mjs';
import { computeManifest, manifestSha256, canonical, DRIVER_FILES, ANALYSIS_FILES } from './manifest.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PRODUCTION = ['main.js', 'render', 'index.html', 'instrumentation', 'neurons.json', 'connections.json', 'experiments/m7'];
export const SUMMARY_FIELDS = Object.freeze(['status', 'capture', 'slot', 'eventCount', 'fingerprint', 'integrityFailures', 'artifact', 'artifactSha256']);

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const refuse = (msg) => { process.stderr.write(`STUDY-2 DRIVER REFUSED: ${msg}\n`); process.exit(1); };

// Only the whitelisted summary fields cross from a child into the driver.
export function readSummary(stdout) {
  const i = stdout.lastIndexOf('@@S2RUN@@');
  if (i < 0) return null;
  const s = JSON.parse(stdout.slice(i + 9));
  return Object.freeze(Object.fromEntries(SUMMARY_FIELDS.map((k) => [k, s[k]])));
}

// Preconditions 1-5. Returns the validated registration and its hash; exits on any failure.
export function preflight(argv, environment) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  if (!argv.includes('--execute')) refuse('no --execute flag; this driver runs only a registered Study-2 block');
  if (environment.STUDY2_EXECUTION_AUTHORISED !== '1') refuse('STUDY2_EXECUTION_AUTHORISED=1 is not set');
  const regPath = arg('--registration'), out = arg('--out');
  if (!regPath || !out) refuse('--registration <file> and --out <dir> are required');
  const regText = fs.readFileSync(regPath, 'utf8').replace(/\r\n/g, '\n');
  const reg = validateRegistration(JSON.parse(regText));
  const manifest = computeManifest();
  const committed = fs.readFileSync(path.join(HERE, 'DRIVER_MANIFEST.json'), 'utf8').replace(/\r\n/g, '\n');
  if (committed !== canonical(manifest)) refuse('driver/analysis files differ from DRIVER_MANIFEST.json');
  if (manifestSha256(manifest) !== reg.driverManifestSha256) refuse('the registration pins a different driver manifest');
  if (git('status', '--porcelain', '--', ...DRIVER_FILES, ...ANALYSIS_FILES, 'experiments/study2/DRIVER_MANIFEST.json') !== '') refuse('driver files are uncommitted or modified');
  if (git('diff', '--name-only', DESIGN.productionBaselineCommit, '--', ...PRODUCTION) !== '') refuse('production tree differs from the production baseline');
  if (fs.existsSync(out)) refuse(`output directory ${out} already exists`);
  return { reg, regSha256: sha(regText), out: path.resolve(out) };
}

async function main() {
  const { reg, regSha256, out } = preflight(process.argv.slice(2), process.env);
  const study2DriverCommit = git('rev-parse', 'HEAD');
  fs.mkdirSync(out, { recursive: true });

  // ---- plan: the acceptance walk, before any agent run ----
  const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
  const plan = planAcceptanceWalk(env.makeConfig, reg);
  const census = env.evaluatedSeeds();
  if (census.some((s) => s < reg.seedBlock.lo || s > reg.seedBlock.hi)) refuse(`seed census left the registered block: ${census}`);
  const planDoc = { schema: 'study2-plan/1', registrationSha256: regSha256, study2DriverCommit,
    productionBaselineCommit: DESIGN.productionBaselineCommit, seedBlock: reg.seedBlock, runCount: reg.runCount,
    trajectoryDecision: reg.trajectoryDecision, slots: plan.slots, requested: plan.requested,
    nextUnrequestedSeed: plan.nextUnrequestedSeed, seedCensus: { n: census.length, min: census[0], max: census[census.length - 1] } };
  const planText = JSON.stringify(planDoc, null, 1) + '\n';
  fs.writeFileSync(path.join(out, 'PLAN.json'), planText);
  const planSha256 = sha(planText);

  // ---- execute: every slot, in order ----
  const spawnRun = (slot, capture, attempt = 1) => {
    const spec = { mode: 'study', capture, slot: slot.slot, configSeed: slot.acceptedSeed, configIndex: slot.configIndex,
      acceptedSeed: slot.acceptedSeed, startingSeed: slot.startingSeed, rejectionCount: slot.rejectionCount,
      block: reg.seedBlock, registrationSha256: regSha256, planSha256, out, attempt };
    const r = spawnSync(process.execPath, [path.join(HERE, 'run_child.mjs')], { cwd: HERE, encoding: 'utf8',
      env: { ...process.env, RUN_SPEC: JSON.stringify(spec) }, maxBuffer: 256 * 1024 * 1024 });
    return { exitCode: r.status, summary: readSummary(r.stdout || '') };
  };
  const ledger = [];
  for (const slot of plan.slots) {
    const { exitCode, summary } = spawnRun(slot, true);
    const entry = { slot: slot.slot, acceptedSeed: slot.acceptedSeed, goal: slot.goal, exitCode,
      status: summary ? summary.status : 'no-summary', summary };
    ledger.push(entry);
    fs.writeFileSync(path.join(out, 'LEDGER.json'), JSON.stringify(ledger, null, 1) + '\n');
    if (exitCode === 4 || exitCode === 1 || !summary) {
      fs.writeFileSync(path.join(out, 'HALT.json'), JSON.stringify({ reason: 'apparatus integrity or refusal', entry }, null, 1) + '\n');
      refuse(`slot ${slot.slot}: apparatus integrity failure or refusal (exit ${exitCode}); block HALTED for a Director ruling`);
    }
  }

  // ---- replay: pre-registered G-IMPL-2 check on slot 0 ----
  const replayOnce = (attempt, on) => {
    const off = spawnRun(plan.slots[0], false, attempt);
    const fields = Object.keys(on.fingerprint);
    const differing = off.summary ? fields.filter((k) => JSON.stringify(on.fingerprint[k]) !== JSON.stringify(off.summary.fingerprint[k])) : ['no-summary'];
    return { slot: 0, fields, differing, offExitCode: off.exitCode };
  };
  const replay = { first: replayOnce(1, ledger[0].summary), reexecution: null };
  if (replay.first.differing.length) {
    const again = spawnRun(plan.slots[0], true, 2);
    ledger[0].reexecution = { exitCode: again.exitCode, summary: again.summary };
    replay.reexecution = again.summary ? replayOnce(2, again.summary) : { differing: ['no-summary'] };
  }
  fs.writeFileSync(path.join(out, 'REPLAY.json'), JSON.stringify(replay, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'LEDGER.json'), JSON.stringify(ledger, null, 1) + '\n');

  const names = fs.readdirSync(out).filter((f) => f !== 'INTEGRITY.sha256').sort();
  fs.writeFileSync(path.join(out, 'INTEGRITY.sha256'),
    names.map((f) => `${sha(fs.readFileSync(path.join(out, f)))}  ${f}`).join('\n') + '\n');
  process.stdout.write(`STUDY-2 BLOCK EXECUTED: ${ledger.length} slots; completed ${ledger.filter((e) => e.status === 'completed').length}, ` +
    `crashed ${ledger.filter((e) => e.status === 'crashed').length}; replay differing: ${replay.first.differing.join(',') || 'none'}\n` +
    'Analysis is a separate step: node experiments/study2/analyze_study2.mjs <out>\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

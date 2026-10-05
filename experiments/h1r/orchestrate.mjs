// ==========================================================
// H1-R — ORCHESTRATOR (v1.0 §7, §9 item 9, §10, §13; D-020, D-023 … D-026)
// ==========================================================
// PLAN → registry pre-check → SCHEDULE → EXECUTE → RECORD / NO-RECORD → structural validation → identity/provenance
// validation → validity classification → pair construction → study-input construction → frozen analyze.js.
//
// It computes NO metric. Every metric, the Stage-1 decision and the output document come from analyze.js (v1.0 §8:
// "All metrics are computed by analyze.js"). Its only random numbers are analyze.js's own makeRng(770004), used to
// reproduce the pre-registered link-④ fork sample, so the forks can run before the single analysis (v1.0 §8, D-020 pin 5).
//
// Director rulings applied (research/09_decisions.md D-026):
//   §1 no record   a planned base run whose process leaves no record is a crash: completed = false, the run is invalid
//                  and its (configuration, seed) pair is dropped. It is never re-run; retries exist only for forks.
//   §2 fork crash  a fork measurement is valid iff all 11 validity flags are true; otherwise it is crashed. A crashed
//                  fork is re-run once (v1.0 §8); if the re-run is also crashed the sample's difference is null.
//   §4 storage     raw records under experiments/h1r/data/ (git-ignored), identified by the SHA-256 of their
//                  uncompressed bytes; manifests carry repository-relative paths only.
//
// A real stage executes only with BOTH H1R_STAGE_AUTHORISED=<stage> and a registry pre-check that finds H1-R's use
// recorded (v1.0 §7.6). Before Milestone B neither holds: every stage command refuses.
//
// Determinism: no clock, no Math.random, no host path in any derived artifact; outputs depend only on the plan and the
// record bytes, not on file-listing or execution order.
//
//   node experiments/h1r/orchestrate.mjs identity
//   node experiments/h1r/orchestrate.mjs precheck <stage1|extension|stage2>
//   node experiments/h1r/orchestrate.mjs stage1|extension|stage2|forks|analyze     (refuses unless authorised)
// ==========================================================
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as AN from './analyze.js';
import { envSeedFor, blockCodeOf } from './env_seed.mjs';
import { B2_COMMIT } from './conformance_transform.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');
export const SCHEMAS = Object.freeze({
  plan: 'h1r.orchestrator.plan/1', manifest: 'h1r.orchestrator.manifest/1', stage1Decision: 'h1r.orchestrator.stage1-decision/1',
  forkPlan: 'h1r.orchestrator.fork-plan/1', run: 'h1r.run/2', measure: 'h1r.measure/2', study: 'h1r.d021b.study/1', records: 'h1r.d021b.records/1',
});
export const ARMS = Object.freeze(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']);
export const GOALS = Object.freeze([8, 12, 16, 19]);
// v1.0 §10: the 11 validity flags, in the protocol's order
export const VALIDITY_FLAGS = Object.freeze(['completed', 'episodeCapArmed', 'replayCooldownDeterministic', 'runtimeAttached', 'transformMatches',
  'measurementClean', 'envStreamScoped', 'envDrawsWithinReserve', 'cognitiveDrawsWithinReserve', 'visualDrawsWithinReserve', 'envSegmentDisjointFromConfig']);
const seq = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
// v1.0 §7, §13 (frozen material)
export const PROTOCOL = Object.freeze({
  study: 'H1-R',
  pilot: Object.freeze({ streamStart: 886000, hardBound: 889999, stage1: Object.freeze(seq(0, 4)), extension: Object.freeze(seq(5, 9)),
    seeds: Object.freeze(seq(20260819004, 20260819008)), block: 'pilot' }),
  confirmatory: Object.freeze({ streamStart: 900500, count: 30, seeds: Object.freeze(seq(20260819100, 20260819119)), block: 'heldout' }),
  forkSampleMax: 10, forkMaxT: 2980, forkAttempts: 2,
});
export const DATA_ROOT_REL = 'experiments/h1r/data';
export const CELL_COLUMNS = Object.freeze(['configIndex', 'seed', 'armIndex', 'valid', 'R_W1', 'R_W2', 'R_W3', 'R_W4', 'R_all', 'halfLife', 'halfLifeCensored', 'fingerprint', 'floorRaises']);
const A1LINK_COLUMNS = Object.freeze(['configIndex', 'seed', 'rho1499', 'rho2999', 'decisionTicks', 'replayTicks', 'flips', 'flipsByWindow[W1..W4]', 'decisionTicksByWindow[W1..W4]', 'replayTicksByWindow[W1..W4]']);
const POP_COLUMNS = Object.freeze(['configIndex', 'seed', '[[t, forkDifference|null], ...]']);
const MONO_COLUMNS = Object.freeze(['configIndex', 'seed', 'decisionsPerBin[5]', 'flipsPerBin[5]']);
const WINDOWS = ['W1', 'W2', 'W3', 'W4'];

export class OrchestratorHalt extends Error {
  constructor(code, message) { super(`${code}: ${message}`); this.name = 'OrchestratorHalt'; this.code = code; }
}
const halt = (code, message) => { throw new OrchestratorHalt(code, message); };
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const pairKey = (c, s) => `${c}|${s}`;

// ---------------- instrument identity (v1.0 §1.2) ----------------
export const INSTRUMENT_FILES = Object.freeze({ transformSha256: 'conformance_transform.mjs', runtimeSha256: 'runtime.mjs', measureSha256: 'measure.mjs',
  measureInstallSha256: 'measure_install.mjs', shadowSha256: 'shadow.mjs', envSeedSha256: 'env_seed.mjs', driverSha256: 'run_h1r.mjs' });
export function instrumentIdentity() {
  const out = { b2Commit: B2_COMMIT, trustMode: 'traversal' };
  for (const [k, f] of Object.entries(INSTRUMENT_FILES)) out[k] = sha256(fs.readFileSync(path.join(HERE, f)));
  out.analyzeSha256 = sha256(fs.readFileSync(path.join(HERE, 'analyze.js')));
  out.orchestratorSha256 = sha256(fs.readFileSync(fileURLToPath(import.meta.url)));
  return out;
}

// ---------------- configuration streams (v1.0 §7; ERR-07 generateAcceptedStream semantics) ----------------
/** Index i starts at acceptedSeed(i − 1) + 1 (index 0 at the stream start). generate(seed, i) → { acceptedSeed, goal, cfg }. */
export function planStream({ streamStart, count, generate }) {
  const out = []; let seed = streamStart;
  for (let i = 0; i < count; i++) {
    const r = generate(seed, i);
    if (!Number.isSafeInteger(r.acceptedSeed) || r.acceptedSeed < seed) halt('GENERATOR', `index ${i}: accepted seed ${r.acceptedSeed} below the stream position ${seed}`);
    if (r.goal !== GOALS[i % GOALS.length]) halt('GOAL', `index ${i}: goal ${r.goal}, expected ${GOALS[i % GOALS.length]}`);
    out.push({ configIndex: i, configSeed: seed, acceptedSeed: r.acceptedSeed, goal: r.goal, cfg: r.cfg ?? null });
    seed = r.acceptedSeed + 1;
  }
  return out;
}
/** The B2 tree's own generator and graph. The acceptance predicate is env.makeConfig(...).accepted, exactly as
 *  generateAccepted uses it; with a hard bound the scan never evaluates a candidate above the bound (v1.0 §7.1). */
export async function treeEnvironment(treeDir) {
  const env = await import(pathToFileURL(path.join(treeDir, 'experiments', 'm7', 'env.js')).href);
  const connections = JSON.parse(fs.readFileSync(path.join(treeDir, 'connections.json'), 'utf8'));
  const generator = (hardBound = null) => (start, i) => {
    for (let s = start; hardBound === null || s <= hardBound; s++) { const cfg = env.makeConfig(s, i); if (cfg.accepted) return { acceptedSeed: s, goal: cfg.goal, cfg }; }
    halt('PILOT_HARD_BOUND', `no accepted configuration ${i} at or below ${hardBound} (v1.0 §7.1)`);
  };
  return { env, connections, generator, configTable: (acceptedSeed, index) => configTable(env.makeConfig(acceptedSeed, index), index, connections) };
}
/** p_e per undirected edge and phase, in connections.json order (the order env.js indexes pPhase1/pPhase2 by). */
export function configTable(cfg, index, connections) {
  if (cfg.pPhase1.length !== connections.length || cfg.pPhase2.length !== connections.length) halt('CONFIG_TABLE', 'p vector length differs from the graph');
  return { index, goal: cfg.goal, edges: connections.map((e, i) => ({ from: Number(e.from), to: Number(e.to), pPhaseI: cfg.pPhase1[i], pPhaseII: cfg.pPhase2[i] })) };
}

// ---------------- registry pre-check (v1.0 §7.6; read-only, consumes nothing) ----------------
/** registry: { trajectoryDecision(seed, use) → decision | throws refusal; configBlockRecorded({lo, hi, stage}) → boolean }. */
export function registryPrecheck({ stage, seeds, configBlock, registry }) {
  const category = stage === 'stage2' ? 'registered' : 'pilot';
  const items = seeds.map(v => { try { return { seed: v, decision: registry.trajectoryDecision(v, { study: PROTOCOL.study, category }) }; }
    catch (e) { return { seed: v, refusal: e.code || e.name || 'REFUSED' }; } });
  const blockRecorded = registry.configBlockRecorded({ ...configBlock, stage }) === true;
  const refused = items.filter(x => x.refusal), pending = items.filter(x => x.decision && x.decision !== 'REPRODUCTION');
  const reasons = [...refused.map(x => `seed ${x.seed}: ${x.refusal}`), ...pending.map(x => `seed ${x.seed}: ${x.decision} (H1-R's use not recorded)`), ...(blockRecorded ? [] : [`configuration block ${configBlock.lo}-${configBlock.hi} not recorded for H1-R`])];
  return { stage, category, items, configBlock: { ...configBlock, recordedForH1R: blockRecorded }, executable: reasons.length === 0, reasons };
}
/** The committed registry. H1-R's configuration use is recorded by the H1-R registry link (Milestone B); until it exists
 *  no block is recorded for H1-R. */
export async function productionRegistry() {
  const typed = await import(pathToFileURL(path.join(REPO, 'experiments', 'registry', 'typed.js')).href);
  const linkPath = path.join(REPO, 'experiments', 'registry', 'consumed_after_h1r.js');
  const link = fs.existsSync(linkPath) ? await import(pathToFileURL(linkPath).href) : null;
  return {
    trajectoryDecision: (v, use) => typed.trajectory.checkUse(typed.trajectorySeed(v), use).decision,
    // H1R_BLOCKS: [{ study: 'H1-R', use: 'pilot' | 'confirmatory', lo, hi }] (the pilot block covers Stage 1 and the extension)
    configBlockRecorded: ({ lo, hi, stage }) => !!(link && Array.isArray(link.H1R_BLOCKS) && link.H1R_BLOCKS.some(b => b.study === PROTOCOL.study
      && b.use === (stage === 'stage2' ? 'confirmatory' : 'pilot') && b.lo === lo && b.hi === hi)),
  };
}

// ---------------- plan (v1.0 §7, §13) ----------------
const ROLE_ORDER = { base: 0, determinism: 1, fork: 2 };
export function runIdOf(j) {
  const base = `${j.block}-${j.configIndex}-${j.agentSeed}-${j.arm}`;
  if (j.role === 'determinism') return `${base}~det`;
  if (j.role === 'fork') return `${base}@${j.fork.call}${j.attempt > 1 ? `#${j.attempt}` : ''}`;
  return base;
}
const jobOrder = (x, y) => ROLE_ORDER[x.role] - ROLE_ORDER[y.role] || x.configIndex - y.configIndex || x.agentSeed - y.agentSeed || ARMS.indexOf(x.arm) - ARMS.indexOf(y.arm)
  || ((x.fork ? x.fork.call : -1) - (y.fork ? y.fork.call : -1)) || (x.attempt || 1) - (y.attempt || 1);
function finishJob(j, stage) { const job = { ...j, stage }; job.runId = runIdOf(job); job.path = `raw/${stage}/${job.runId}.json`; return job; }
/** One base run per (configuration, seed, arm); determinism re-runs for every configuration index ≡ 0 (mod 5) at the
 *  first seed, all 7 arms (v1.0 §13). configs: rows of planStream (or verification material of the same shape). */
export function planStage({ stage, block, configs, seeds, determinism = true }) {
  const jobs = [];
  for (const c of configs) for (const s of seeds) for (const arm of ARMS)
    jobs.push(finishJob({ role: 'base', block, configSeed: c.configSeed, configIndex: c.configIndex, acceptedSeed: c.acceptedSeed, goal: c.goal, agentSeed: s, arm, fork: null, attempt: 1 }, stage));
  if (determinism) for (const c of configs.filter(x => x.configIndex % 5 === 0)) for (const arm of ARMS)
    jobs.push(finishJob({ role: 'determinism', block, configSeed: c.configSeed, configIndex: c.configIndex, acceptedSeed: c.acceptedSeed, goal: c.goal, agentSeed: seeds[0], arm, fork: null, attempt: 1 }, stage));
  const ids = new Set(); for (const j of jobs) { if (ids.has(j.runId)) halt('DUPLICATE_PLAN', j.runId); ids.add(j.runId); }
  return jobs.sort(jobOrder);
}
export function planDocument({ stage, jobs, ident }) {
  return { schema: SCHEMAS.plan, stage, instrument: ident, jobs: jobs.map(j => ({ runId: j.runId, role: j.role, path: j.path, identity: identityOf(j) })) };
}
const identityOf = (j) => ({ block: j.block, configSeed: j.configSeed, configIndex: j.configIndex, acceptedSeed: j.acceptedSeed, goal: j.goal, agentSeed: j.agentSeed, arm: j.arm, fork: j.fork, attempt: j.attempt });

// ---------------- execution (one OS process per run, frozen M7 §5.4) ----------------
/** The run driver as a child process. It writes to <file>.partial; the orchestrator renames on a clean exit, so a
 *  record exists iff the process completed (D-026 §1). */
export function driverRunner({ treeDir = null } = {}) {
  return (job, absPartial) => new Promise((resolve) => {
    const arg = { configSeed: job.configSeed, configIndex: job.configIndex, agentSeed: job.agentSeed, arm: job.arm, block: job.block, out: absPartial };
    if (treeDir) arg.tree = treeDir;
    if (job.fork) arg.fork = job.fork;
    const ch = spawn(process.execPath, [path.join(HERE, 'run_h1r.mjs'), JSON.stringify(arg)], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; ch.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    ch.on('close', (code) => resolve({ code, stderr: err }));
  });
}
const ledgerPath = (root, stage) => path.join(root, 'raw', stage, 'ATTEMPTS.jsonl');
export function attempted(root, stage) {
  const f = ledgerPath(root, stage); if (!fs.existsSync(f)) return new Set();
  return new Set(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).runId));
}
/** Executes the jobs not yet attempted. An existing record is final; an attempted job without a record is a crash and
 *  is never re-run (D-026 §1). The ledger entry is written before the process starts. */
export async function executeJobs(jobs, { root, runner, concurrency = 2 }) {
  const done = new Map();
  const byStage = new Map(); for (const j of jobs) { if (!byStage.has(j.stage)) byStage.set(j.stage, attempted(root, j.stage)); }
  const todo = jobs.filter(j => !byStage.get(j.stage).has(j.runId) && !fs.existsSync(path.join(root, j.path)));
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const j = todo[next++], abs = path.join(root, j.path), partial = `${abs}.partial`;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.appendFileSync(ledgerPath(root, j.stage), JSON.stringify({ runId: j.runId }) + '\n');
      if (fs.existsSync(partial)) fs.rmSync(partial);
      const r = await runner(j, partial);
      if (r.code === 0 && fs.existsSync(partial)) fs.renameSync(partial, abs);
      done.set(j.runId, r.code);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return done;
}

// ---------------- raw records: structure, identity, validity ----------------
export function readRaw(abs) { const b = fs.readFileSync(abs); return abs.endsWith('.gz') ? zlib.gunzipSync(b) : b; }
export function recordPath(root, job) {
  const a = path.join(root, job.path); if (fs.existsSync(a)) return a;
  const g = `${a}.gz`; return fs.existsSync(g) ? g : null;
}
export function structuralProblems(rec) {
  const p = [];
  if (!rec || typeof rec !== 'object') return ['not an object'];
  if (rec.schema !== SCHEMAS.run) p.push(`schema ${rec.schema}`);
  const m = rec.measurement;
  if (!m || m.schema !== SCHEMAS.measure) p.push('measurement schema');
  else for (const k of ['events', 'ticks', 'attempts', 'resets', 'snapshots', 'floorCalls', 'step0']) if (!(k in m)) p.push(`measurement.${k} missing (digest-only or truncated record)`);
  if (!rec.provenance || !rec.provenance.h1r) p.push('provenance.h1r missing');
  if (typeof rec.fingerprint !== 'string') p.push('fingerprint missing');
  const v = rec.validity;
  if (!v || typeof v !== 'object') p.push('validity missing');
  else {
    const keys = Object.keys(v).filter(k => k !== 'valid');
    if (keys.length !== VALIDITY_FLAGS.length || !VALIDITY_FLAGS.every(k => typeof v[k] === 'boolean')) p.push(`validity flags ${keys.join(',')}`);
    else if (v.valid !== VALIDITY_FLAGS.every(k => v[k] === true)) p.push('validity.valid differs from the conjunction of the 11 flags');
  }
  return p;
}
export function identityProblems(rec, job, ident) {
  const p = [], pv = rec.provenance, h = pv.h1r || {};
  const want = { configSeed: job.configSeed, configIndex: job.configIndex, acceptedSeed: job.acceptedSeed, goal: job.goal, agentSeed: job.agentSeed, arm: job.arm };
  for (const [k, v] of Object.entries(want)) if (pv[k] !== v) p.push(`${k} ${pv[k]} ≠ ${v}`);
  if (job.goal !== GOALS[job.configIndex % GOALS.length]) p.push(`planned goal ${job.goal} ≠ GOALS[${job.configIndex} mod 4]`);
  const es = h.envStream || {};
  if (es.block !== job.block) p.push(`block ${es.block} ≠ ${job.block}`);
  const envSeed = envSeedFor({ agentSeed: job.agentSeed, blockCode: blockCodeOf(job.block), acceptedConfigIndex: job.configIndex });
  if (es.envSeed !== envSeed) p.push(`R3 environment seed ${es.envSeed} ≠ ${envSeed}`);
  const wantFork = job.fork ? { call: job.fork.call, to: job.fork.to || 'A2' } : null;
  if (JSON.stringify(h.fork ?? null) !== JSON.stringify(wantFork)) p.push(`fork ${JSON.stringify(h.fork)} ≠ ${JSON.stringify(wantFork)}`);
  for (const k of ['b2Commit', 'trustMode', ...Object.keys(INSTRUMENT_FILES)]) if (h[k] !== ident[k]) p.push(`instrument ${k} ${String(h[k]).slice(0, 12)} ≠ ${String(ident[k]).slice(0, 12)}`);
  return p;
}
/** Classifies one planned job. A record that is malformed or is not the planned run halts (it is not an exclusion,
 *  v1.0 §10); a missing record is a crash (D-026 §1); otherwise the 11 flags decide. */
export function classifyJob(job, { root, ident, attemptedIds }) {
  const abs = recordPath(root, job);
  if (!abs) {
    if (!attemptedIds.has(job.runId)) halt('NOT_EXECUTED', `${job.runId}: planned but never attempted`);
    return { job, status: 'no-record', sha256: null, bytes: null, valid: false, flags: null, fingerprint: null };
  }
  const bytes = readRaw(abs); let rec;
  try { rec = JSON.parse(bytes.toString('utf8')); } catch { halt('MALFORMED', `${job.runId}: not JSON`); }
  const sp = structuralProblems(rec); if (sp.length) halt('MALFORMED', `${job.runId}: ${sp.join('; ')}`);
  const ip = identityProblems(rec, job, ident); if (ip.length) halt(ip.some(x => x.startsWith('instrument')) ? 'INSTRUMENT' : 'IDENTITY', `${job.runId}: ${ip.join('; ')}`);
  const flags = Object.fromEntries(VALIDITY_FLAGS.map(k => [k, rec.validity[k]]));
  return { job, status: rec.validity.valid ? 'valid' : 'invalid', sha256: sha256(bytes), bytes: bytes.length, valid: rec.validity.valid === true, flags, fingerprint: rec.fingerprint };
}
/** Every file in a stage's raw directory must be a planned record (or the ledger); anything else halts. */
export function unplannedFiles(root, stage, jobs) {
  const dir = path.join(root, 'raw', stage); if (!fs.existsSync(dir)) return [];
  const want = new Set(jobs.filter(j => j.stage === stage).flatMap(j => [path.basename(j.path), `${path.basename(j.path)}.gz`]));
  return fs.readdirSync(dir).filter(f => f !== 'ATTEMPTS.jsonl' && !f.endsWith('.partial') && !want.has(f)).sort();
}
export function classifyStage(jobs, { root, ident }) {
  const stages = [...new Set(jobs.map(j => j.stage))];
  for (const st of stages) { const extra = unplannedFiles(root, st, jobs); if (extra.length) halt('UNPLANNED_RECORD', `${st}: ${extra.join(', ')}`); }
  const att = new Set(stages.flatMap(st => [...attempted(root, st)]));
  return jobs.slice().sort(jobOrder).map(j => classifyJob(j, { root, ident, attemptedIds: att }));
}
/** A record's bytes must still hash to the manifest value whenever it is read again. */
export function loadVerified(root, entry) {
  const abs = path.join(root, entry.path); const b = readRaw(fs.existsSync(abs) ? abs : `${abs}.gz`);
  if (sha256(b) !== entry.sha256) halt('RAW_RECORD_CHANGED', `${entry.runId}: bytes no longer match the manifest`);
  return JSON.parse(b.toString('utf8'));
}

// ---------------- validity → pairs (v1.0 §10) ----------------
/** A (configuration, seed) pair is valid iff all 7 base arms are valid; otherwise it is dropped from all 7 arms. */
export function pairStatus(entries, configs, seeds) {
  const base = new Map(entries.filter(e => e.job.role === 'base').map(e => [`${e.job.configIndex}|${e.job.agentSeed}|${e.job.arm}`, e]));
  const out = [];
  for (const c of configs) for (const s of seeds) {
    const arms = ARMS.map(a => base.get(`${c}|${s}|${a}`)); if (arms.some(x => !x)) halt('MISSING_ARM_PLAN', `pair ${c}/${s} lacks a planned arm`);
    out.push({ configIndex: c, seed: s, valid: arms.every(x => x.valid), statuses: Object.fromEntries(ARMS.map((a, i) => [a, arms[i].status])) });
  }
  return out;
}

// ---------------- study input (schema h1r.d021b.study/1) ----------------
const runObj = (job, rec) => ({ runId: job.runId, arm: job.arm, configIndex: job.configIndex, seed: job.agentSeed, measurement: rec.measurement });
/** Cells for every planned (configuration, seed, arm); metrics from analyze.js runMetrics for valid runs, null otherwise
 *  (analyze.js never reads a dropped pair's values). A1 link rows only for valid pairs. load(entry) → the parsed record. */
export function studyBlock({ entries, configs, seeds, tables, load, links, forkDiff = null }) {
  const base = new Map(entries.filter(e => e.job.role === 'base').map(e => [`${e.job.configIndex}|${e.job.agentSeed}|${e.job.arm}`, e]));
  const pairs = pairStatus(entries, configs.map(c => c.index), seeds), validPair = new Set(pairs.filter(p => p.valid).map(p => pairKey(p.configIndex, p.seed)));
  const cells = [], a1Links = [], flipPopulations = [], monotonicity = [];
  for (const c of configs.map(x => x.index).sort((a, b) => a - b)) for (const s of seeds.slice().sort((a, b) => a - b)) for (const [ai, arm] of ARMS.entries()) {
    const e = base.get(`${c}|${s}|${arm}`);
    if (!e.valid) { cells.push([c, s, ai, 0, null, null, null, null, null, null, null, e.fingerprint ?? null, null]); continue; }
    const rec = load(e), m = AN.runMetrics(runObj(e.job, rec), tables.get(c));
    cells.push([c, s, ai, 1, m.R.W1, m.R.W2, m.R.W3, m.R.W4, m.R_all, m.halfLife.value, m.halfLife.censored ? 1 : 0, rec.fingerprint, rec.measurement.floorCalls.length]);
    if (links && arm === 'A1' && validPair.has(pairKey(c, s))) {
      const l = m.link3;
      a1Links.push([c, s, m.calibration.tau1499.rho, m.calibration.tau2999.rho, l.decisionTicks, l.replayTicks, l.flips,
        WINDOWS.map(W => l.byWindow[W].flips), WINDOWS.map(W => l.byWindow[W].decisionTicks), WINDOWS.map(W => l.byWindow[W].replayTicks)]);
      flipPopulations.push([c, s, l.population.map(t => [t, forkDiff ? forkDiff(c, s, t) : null])]);
      monotonicity.push([c, s, l.monotonicity.decisions.slice(), l.monotonicity.flips.slice()]);
    }
  }
  return { pairs, cells, a1Links, flipPopulations, monotonicity };
}
export const EMPTY_HELDOUT = Object.freeze({ block: 'heldout', configs: [], seeds: [], cells: [], a1LinkColumns: A1LINK_COLUMNS, a1Links: [], flipPopulationColumns: POP_COLUMNS, flipPopulations: [], monotonicityColumns: MONO_COLUMNS, monotonicity: [] });
/** The study input. pilot.configs: [{index, goal, block: 'stage1'|'extension'}]; heldout.configs: all 30 declared; heldout.seeds: all 20
 *  registered confirmatory seeds (analyze.js takes the first S*, so an S* mismatch fails loudly on missing cells). */
export function studyInput({ pilot, heldout = EMPTY_HELDOUT }) {
  return { schema: SCHEMAS.study, id: 'H1R', arms: ARMS.slice(), cellColumns: CELL_COLUMNS.slice(),
    pilot: { stream: PROTOCOL.pilot.streamStart, extensionAvailable: pilot.extensionAvailable, configs: pilot.configs, seeds: pilot.seeds, cells: pilot.cells },
    heldout: { block: 'heldout', configs: heldout.configs, seeds: heldout.seeds, cells: heldout.cells, a1LinkColumns: A1LINK_COLUMNS, a1Links: heldout.a1Links,
      flipPopulationColumns: POP_COLUMNS, flipPopulations: heldout.flipPopulations, monotonicityColumns: MONO_COLUMNS, monotonicity: heldout.monotonicity } };
}
export const serialize = (x) => JSON.stringify(x);

// ---------------- Stage-1 decision (v1.0 §13; C-1) — analyze.js's own decision, never re-implemented ----------------
/** Probe on the Stage-1 array with the held-out block empty. extensionAvailable = false makes analyze.js report HALT
 *  exactly when the extension would run (C-1), so the result is the extension trigger, not an outcome. */
export function stage1Probe(pilot) {
  const s1 = AN.analyzeStudy(studyInput({ pilot: { ...pilot, extensionAvailable: false } })).stage1;
  return { action: s1.F11.extensionUnavailable ? 'EXTENSION_REQUIRED' : s1.F11.outcome, stage1: s1 };
}
/** The Stage-1 block after the extension (or the final HALT when the extension is unavailable). */
export function stage1Final(pilot) { return AN.analyzeStudy(studyInput({ pilot })).stage1; }
export const stage1Summary = (s1) => ({ F11: s1.F11, power: s1.power, droppedPairs: s1.droppedPairs });
export function stage1DecisionRecord({ input, stage1, ident }) {
  return { schema: SCHEMAS.stage1Decision, stage1InputSha256: sha256(serialize(input)), analyzeSha256: ident.analyzeSha256, orchestratorSha256: ident.orchestratorSha256,
    outcome: stage1.F11.outcome, fires: stage1.F11.fires, extensionTaken: stage1.F11.extensionTaken, extensionUnavailable: stage1.F11.extensionUnavailable,
    Sstar: stage1.power ? stage1.power.Sstar : null, underpowered: stage1.power ? stage1.power.underpowered : null, summary: stage1Summary(stage1) };
}

// ---------------- link-④ forks (v1.0 §8; D-020 pin 5; D-026 §2) ----------------
/** The pre-registered sample, with analyze.js's own generator: valid pairs in (configuration, seed) order, each run's
 *  population sorted by t, one makeRng(770004) Fisher–Yates permutation, first min(10, n) kept. */
export function forkSample({ validPairs, populations }) {
  const rng = AN.makeRng(770004), out = [];
  for (const [c, s] of validPairs.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1])) {
    const popu = populations.get(pairKey(c, s)).slice().sort((a, b) => a - b).map(t => [t, null]);
    for (const [t] of AN.fisherYates(popu, rng).slice(0, Math.min(PROTOCOL.forkSampleMax, popu.length))) out.push([c, s, t]);
  }
  return out;
}
export function forkJobs(sample, baseJobs, attempt = 1) {
  const base = new Map(baseJobs.filter(j => j.role === 'base' && j.arm === 'A1').map(j => [pairKey(j.configIndex, j.agentSeed), j]));
  return sample.map(([c, s, t]) => { const b = base.get(pairKey(c, s)); if (!b) halt('FORK_BASE', `no A1 base run for ${c}/${s}`);
    return finishJob({ ...b, role: 'fork', fork: { call: t + 5, to: 'A2' }, attempt }, 'forks'); }).sort(jobOrder);
}
/** A fork is valid iff all 11 flags are true (D-026 §2); a missing record is crashed (D-026 §1). */
export const forkValid = (entry) => entry.status === 'valid';
/** Resolves each sampled decision: the first valid attempt's difference (analyze.js forkDifference), else null. */
export function forkDifferences({ sample, attempts, baseEntryOf, load }) {
  const out = new Map();
  for (const [c, s, t] of sample) {
    const tries = attempts.filter(e => e.job.configIndex === c && e.job.agentSeed === s && e.job.fork.call === t + 5).sort((x, y) => x.job.attempt - y.job.attempt);
    const ok = tries.find(forkValid);
    if (!ok) { out.set(`${c}|${s}|${t}`, { difference: null, attempts: tries.length }); continue; }
    const be = baseEntryOf(c, s), d = AN.forkDifference(runObj(be.job, load(be)), { fork: { call: t + 5 }, measurement: load(ok).measurement });
    out.set(`${c}|${s}|${t}`, { difference: d.difference, attempts: tries.length });
  }
  return out;
}

// ---------------- records document (schema h1r.d021b.records/1, lazy) ----------------
/** Measurements are loaded (and re-verified against the manifest) only when analyze.js reads them, one at a time. */
export function recordsDocument({ root, runs, forkRuns, configurations, seeds }) {
  const lazy = (o, e) => Object.defineProperty(o, 'measurement', { enumerable: true, get: () => loadVerified(root, e).measurement });
  return { schema: SCHEMAS.records, id: 'H1R', configurations, seeds,
    runs: runs.map(e => lazy({ runId: e.runId, arm: e.arm, configIndex: e.configIndex, seed: e.seed }, e)),
    forkRuns: forkRuns.map(e => lazy({ forkId: e.forkId, baseRunId: e.baseRunId, fork: { call: e.call, to: 'A2' } }, e)) };
}
/** The single analysis (v1.0 §13; D-023 §1(c)): the frozen analyze.js on the study input and the records document;
 *  the Stage-1 block it recomputes must equal the lodged decision. */
export function analyzeFinal({ input, records, lodged }) {
  const study = { H1R: AN.analyzeStudy(input) };
  if (lodged && serialize(stage1Summary(study.H1R.stage1)) !== serialize(lodged.summary)) halt('STAGE1_MISMATCH', 'the analysis recomputed a Stage-1 decision different from the lodged one');
  return AN.serializeOutput(AN.outputDocument(study, { H1R: AN.analyzeRecords(records) }));
}

// ---------------- manifest and determinism re-runs ----------------
export function manifestDocument({ stage, entries, ident, studyInputSha256 = null }) {
  const runs = entries.slice().sort((x, y) => jobOrder(x.job, y.job)).map(e => ({ runId: e.job.runId, role: e.job.role, stage: e.job.stage, identity: identityOf(e.job),
    path: `${DATA_ROOT_REL}/${e.job.path}`, sha256: e.sha256, bytes: e.bytes, status: e.status, valid: e.valid, fingerprint: e.fingerprint, validity: e.flags }));
  const count = (f) => runs.filter(f).length;
  const counts = { planned: runs.length, valid: count(r => r.status === 'valid'), invalid: count(r => r.status === 'invalid'), noRecord: count(r => r.status === 'no-record'),
    byArm: Object.fromEntries(ARMS.map(a => [a, { valid: count(r => r.identity.arm === a && r.status === 'valid'), invalid: count(r => r.identity.arm === a && r.status === 'invalid'), noRecord: count(r => r.identity.arm === a && r.status === 'no-record') }])) };
  return { schema: SCHEMAS.manifest, stage, instrument: ident, studyInputSha256, counts, runs };
}
/** v1.0 §13: every arm of the determinism cell is re-run; any fingerprint mismatch halts. */
export function compareDeterminism(entries) {
  const base = new Map(entries.filter(e => e.job.role === 'base').map(e => [`${e.job.configIndex}|${e.job.agentSeed}|${e.job.arm}`, e]));
  const checked = [];
  for (const d of entries.filter(e => e.job.role === 'determinism')) {
    const b = base.get(`${d.job.configIndex}|${d.job.agentSeed}|${d.job.arm}`);
    if (!b) halt('DETERMINISM', `${d.job.runId}: no base run`);
    if (b.fingerprint === null || d.fingerprint === null || b.fingerprint !== d.fingerprint) halt('DETERMINISM', `${d.job.runId}: fingerprint ${d.fingerprint} ≠ base ${b.fingerprint}`);
    checked.push(d.job.runId);
  }
  return checked;
}

// ---------------- flows (each step above, in the fixed order; dependencies injected so the gates run them on
// verification material with a stub registry and the production code runs them on the frozen material) ----------------
/** registry pre-check → plan → execute → classify → determinism comparison → manifest. */
export async function stageFlow({ stage, block, configs, seeds, root, runner, registry, precheckBlock, concurrency = 2, ident = instrumentIdentity() }) {
  const pre = registryPrecheck({ stage: precheckBlock.stage ?? stage, seeds, configBlock: precheckBlock, registry });
  if (!pre.executable) halt('REGISTRY', pre.reasons.join('; '));
  const jobs = planStage({ stage, block, configs, seeds });
  await executeJobs(jobs, { root, runner, concurrency });
  const entries = classifyStage(jobs, { root, ident });
  const determinismChecked = compareDeterminism(entries);
  return { jobs, entries, determinismChecked, manifest: manifestDocument({ stage, entries, ident }) };
}
/** The Stage-1 block of the study input from classified pilot entries. pilotConfigs: [{index, goal, block}]. */
export function pilotBlock({ entries, pilotConfigs, seeds, tables, root, extensionAvailable }) {
  const b = studyBlock({ entries, configs: pilotConfigs, seeds, tables, load: (e) => loadVerified(root, manifestEntry(e)), links: false });
  return { extensionAvailable, configs: pilotConfigs.map(c => ({ index: c.index, goal: c.goal, block: c.block })), seeds: seeds.slice(), cells: b.cells };
}
const manifestEntry = (e) => ({ runId: e.job.runId, path: e.job.path, sha256: e.sha256 });
/** Forks for the pre-registered sample: attempt 1, then one re-run of every crashed attempt (D-026 §2). */
export async function forkFlow({ heldEntries, heldConfigs, seeds, tables, root, runner, concurrency = 2, ident = instrumentIdentity() }) {
  const base = new Map(heldEntries.filter(e => e.job.role === 'base').map(e => [`${e.job.configIndex}|${e.job.agentSeed}|${e.job.arm}`, e]));
  const pairs = pairStatus(heldEntries, heldConfigs.map(c => c.index), seeds).filter(p => p.valid);
  const populations = new Map(pairs.map(p => { const e = base.get(`${p.configIndex}|${p.seed}|A1`);
    return [pairKey(p.configIndex, p.seed), AN.runMetrics(runObj(e.job, loadVerified(root, manifestEntry(e))), tables.get(p.configIndex)).link3.population]; }));
  const sample = forkSample({ validPairs: pairs.map(p => [p.configIndex, p.seed]), populations });
  const baseJobs = heldEntries.map(e => e.job);
  const first = forkJobs(sample, baseJobs, 1);
  await executeJobs(first, { root, runner, concurrency });
  const e1 = first.map(j => classifyJob(j, { root, ident, attemptedIds: attempted(root, 'forks') }));
  const retry = forkJobs(sample.filter(([c, s, t]) => !forkValid(e1.find(e => e.job.configIndex === c && e.job.agentSeed === s && e.job.fork.call === t + 5))), baseJobs, 2);
  await executeJobs(retry, { root, runner, concurrency });
  const attempts = classifyStage([...first, ...retry], { root, ident });   // every file in the fork directory must be a planned attempt
  const diffs = forkDifferences({ sample, attempts, baseEntryOf: (c, s) => base.get(`${c}|${s}|A1`), load: (e) => loadVerified(root, manifestEntry(e)) });
  const plan = { schema: SCHEMAS.forkPlan, instrument: ident, sample, forks: [...diffs.entries()].map(([k, v]) => ({ key: k, difference: v.difference, attempts: v.attempts })) };
  return { sample, attempts, diffs, plan, manifest: manifestDocument({ stage: 'forks', entries: attempts, ident }) };
}
/** The held-out block, with each sampled decision's fork difference (unsampled entries carry null and are never read:
 *  analyze.js reads only its own sample, which equals forkSample — gate O11). */
export function heldoutBlock({ entries, heldConfigs, seeds, tables, root, diffs }) {
  const b = studyBlock({ entries, configs: heldConfigs, seeds, tables, load: (e) => loadVerified(root, manifestEntry(e)), links: true,
    forkDiff: (c, s, t) => { const d = diffs.get(`${c}|${s}|${t}`); return d ? d.difference : null; } });
  return { configs: heldConfigs.map(c => ({ index: c.index, goal: c.goal })), seeds: PROTOCOL.confirmatory.seeds.slice(), cells: b.cells, a1Links: b.a1Links, flipPopulations: b.flipPopulations, monotonicity: b.monotonicity, pairs: b.pairs };
}
/** The records document of the single analysis: the base runs of every valid Stage-2 pair (all 7 arms) and the valid
 *  fork attempts used, over the declared universe (all configurations × the S* seeds; D-026 §3). */
export function finalRecords({ root, heldEntries, pairs, forkAttempts, diffs, tables, heldConfigs, seedsUsed }) {
  const valid = new Set(pairs.filter(p => p.valid).map(p => pairKey(p.configIndex, p.seed)));
  const runs = heldEntries.filter(e => e.job.role === 'base' && valid.has(pairKey(e.job.configIndex, e.job.agentSeed)))
    .map(e => ({ ...manifestEntry(e), arm: e.job.arm, configIndex: e.job.configIndex, seed: e.job.agentSeed }))
    .sort((x, y) => x.configIndex - y.configIndex || x.seed - y.seed || ARMS.indexOf(x.arm) - ARMS.indexOf(y.arm));   // canonical order: the output follows it
  const used = new Set([...diffs.entries()].filter(([, v]) => v.difference !== null).map(([k]) => k));
  const forkRuns = forkAttempts.filter(e => forkValid(e) && used.has(`${e.job.configIndex}|${e.job.agentSeed}|${e.job.fork.call - 5}`))
    .filter((e, i, arr) => arr.findIndex(x => x.job.configIndex === e.job.configIndex && x.job.agentSeed === e.job.agentSeed && x.job.fork.call === e.job.fork.call) === i)
    .map(e => ({ ...manifestEntry(e), forkId: e.job.runId, baseRunId: runIdOf({ ...e.job, role: 'base' }), call: e.job.fork.call, configIndex: e.job.configIndex, seed: e.job.agentSeed }))
    .sort((x, y) => x.configIndex - y.configIndex || x.seed - y.seed || x.call - y.call);
  return recordsDocument({ root, runs, forkRuns, configurations: heldConfigs.map(c => tables.get(c.index)), seeds: seedsUsed.slice() });
}

// ---------------- CLI ----------------
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const [cmd, arg] = process.argv.slice(2);
  const stageSeeds = (st) => st === 'stage2' ? PROTOCOL.confirmatory.seeds : PROTOCOL.pilot.seeds;
  const stageBlock = (st) => st === 'stage2' ? { lo: PROTOCOL.confirmatory.streamStart, hi: null } : { lo: PROTOCOL.pilot.streamStart, hi: PROTOCOL.pilot.hardBound };
  if (cmd === 'identity') console.log(JSON.stringify(instrumentIdentity(), null, 1));
  else if (cmd === 'precheck') {
    if (!['stage1', 'extension', 'stage2'].includes(arg)) { console.error('usage: precheck <stage1|extension|stage2>'); process.exit(2); }
    const pre = registryPrecheck({ stage: arg, seeds: stageSeeds(arg), configBlock: stageBlock(arg), registry: await productionRegistry() });
    console.log(JSON.stringify(pre, null, 1)); process.exitCode = pre.executable ? 0 : 3;
  } else if (['stage1', 'extension', 'stage2', 'forks', 'analyze'].includes(cmd)) {
    // a stage runs only when the Director has authorised it AND the registry records H1-R's use (v1.0 §7.6)
    if (process.env.H1R_STAGE_AUTHORISED !== cmd) { console.error(`REFUSED: ${cmd} requires H1R_STAGE_AUTHORISED=${cmd} (Director authorisation).`); process.exit(3); }
    // every command re-derives Stage 1, so the pilot use must be recorded before any generation; Stage 2's seeds are
    // pre-checked inside runCommand once S* is read from the lodged decision, again before any generation
    const st = cmd === 'extension' ? 'extension' : 'stage1';
    const registry = await productionRegistry();
    const pre = registryPrecheck({ stage: st, seeds: stageSeeds(st), configBlock: stageBlock(st), registry });
    if (!pre.executable) { console.error(`REFUSED: registry pre-check: ${pre.reasons.join('; ')}`); process.exit(3); }
    await runCommand(cmd, registry);
  } else { console.error('usage: node experiments/h1r/orchestrate.mjs identity | precheck <stage> | stage1|extension|stage2|forks|analyze'); process.exit(2); }
}

/** The production pipeline. Each command re-derives the earlier stages from the raw records (execution skips every
 *  attempted job), so the commands are idempotent; derived artifacts go to experiments/h1r/stage_records/. */
async function runCommand(cmd, registry) {
  const OUT = path.join(REPO, 'experiments', 'h1r', 'stage_records'), root = path.join(REPO, DATA_ROOT_REL);
  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, obj) => { const t = typeof obj === 'string' ? obj : serialize(obj); fs.writeFileSync(path.join(OUT, name), t); fs.writeFileSync(path.join(OUT, `${name}.sha256`), `${sha256(t)}  ${name}\n`); };
  const { buildTree } = await import('./build_tree.mjs');
  const tree = buildTree(), envT = await treeEnvironment(tree.dir), runner = driverRunner({ treeDir: tree.dir }), ident = instrumentIdentity();
  const P = PROTOCOL.pilot, C = PROTOCOL.confirmatory, concurrency = Math.max(1, Math.min(8, os.cpus().length - 1));
  const pilotBlockOf = { stage: 'stage1', lo: P.streamStart, hi: P.hardBound };
  const tablesOf = (rows) => new Map(rows.map(c => [c.configIndex, configTable(c.cfg, c.configIndex, envT.connections)]));
  const pilotStream = (count) => planStream({ streamStart: P.streamStart, count, generate: envT.generator(P.hardBound) });
  const stage1Rows = pilotStream(P.stage1.length);
  const s1 = await stageFlow({ stage: 'stage1', block: P.block, configs: stage1Rows, seeds: P.seeds, root, runner, registry, precheckBlock: pilotBlockOf, concurrency, ident });
  const s1Configs = stage1Rows.map(c => ({ index: c.configIndex, goal: c.goal, block: 'stage1' }));
  if (cmd === 'stage1') {
    write('stage1_manifest.json', s1.manifest);
    const pb = pilotBlock({ entries: s1.entries, pilotConfigs: s1Configs, seeds: P.seeds, tables: tablesOf(stage1Rows), root, extensionAvailable: false });
    const probe = stage1Probe(pb);
    if (probe.action === 'EXTENSION_REQUIRED') { write('stage1_probe.json', { action: probe.action, summary: stage1Summary(probe.stage1) }); console.log('Stage 1 complete: the extension is required (authorise `extension`).'); return; }
    write('stage1_input.json', studyInput({ pilot: pb })); write('stage1_decision.json', stage1DecisionRecord({ input: studyInput({ pilot: pb }), stage1: probe.stage1, ident }));
    console.log(`Stage 1 decision written: ${probe.action}. Commit stage1_decision.json before any Stage-2 run.`); return;
  }
  // the extension, or the final HALT when its configurations are not accepted within the bound
  let pilotRows = stage1Rows, pilotEntries = s1.entries, pilotConfigs = s1Configs, extensionAvailable = false;
  const decisionPath = path.join(OUT, 'stage1_decision.json');
  if (cmd === 'extension') {
    try { pilotRows = pilotStream(P.stage1.length + P.extension.length); extensionAvailable = true; } catch (e) { if (!(e instanceof OrchestratorHalt) || e.code !== 'PILOT_HARD_BOUND') throw e; }
    if (extensionAvailable) {
      const ext = await stageFlow({ stage: 'extension', block: P.block, configs: pilotRows.filter(c => P.extension.includes(c.configIndex)), seeds: P.seeds, root, runner, registry, precheckBlock: { ...pilotBlockOf, stage: 'extension' }, concurrency, ident });
      write('extension_manifest.json', ext.manifest);
      pilotEntries = [...s1.entries, ...ext.entries]; pilotConfigs = pilotRows.map(c => ({ index: c.configIndex, goal: c.goal, block: P.extension.includes(c.configIndex) ? 'extension' : 'stage1' }));
    }
    const pb = pilotBlock({ entries: pilotEntries, pilotConfigs, seeds: P.seeds, tables: tablesOf(pilotRows), root, extensionAvailable });
    const fin = stage1Final(pb); write('stage1_input.json', studyInput({ pilot: pb })); write('stage1_decision.json', stage1DecisionRecord({ input: studyInput({ pilot: pb }), stage1: fin, ident }));
    console.log(`Stage 1 decision after the extension step written: ${fin.F11.outcome}. Commit stage1_decision.json before any Stage-2 run.`); return;
  }
  // Stage 2 needs the lodged decision: committed, unmodified, PROCEED (v1.0 §13 "fixed before any Stage-2 run")
  const relDecision = path.relative(REPO, decisionPath).split(path.sep).join('/');
  const { execFileSync } = await import('node:child_process');
  try { execFileSync('git', ['-C', REPO, 'ls-files', '--error-unmatch', relDecision], { stdio: 'ignore' }); execFileSync('git', ['-C', REPO, 'diff', '--quiet', 'HEAD', '--', relDecision], { stdio: 'ignore' }); }
  catch { halt('STAGE1_NOT_LODGED', `${relDecision} must be committed and unmodified before Stage 2`); }
  const decision = JSON.parse(fs.readFileSync(decisionPath, 'utf8'));
  if (decision.outcome !== 'PROCEED') halt('NO_STAGE2', `the lodged Stage-1 outcome is ${decision.outcome}`);
  if (decision.extensionTaken) { pilotRows = pilotStream(P.stage1.length + P.extension.length);
    const ext = await stageFlow({ stage: 'extension', block: P.block, configs: pilotRows.filter(c => P.extension.includes(c.configIndex)), seeds: P.seeds, root, runner, registry, precheckBlock: { ...pilotBlockOf, stage: 'extension' }, concurrency, ident });
    pilotEntries = [...s1.entries, ...ext.entries]; pilotConfigs = pilotRows.map(c => ({ index: c.configIndex, goal: c.goal, block: P.extension.includes(c.configIndex) ? 'extension' : 'stage1' })); }
  const seedsUsed = C.seeds.slice(0, decision.Sstar);
  const pre2 = registryPrecheck({ stage: 'stage2', seeds: seedsUsed, configBlock: { lo: C.streamStart, hi: null }, registry });
  if (!pre2.executable) halt('REGISTRY', pre2.reasons.join('; '));
  const heldRows = planStream({ streamStart: C.streamStart, count: C.count, generate: envT.generator(null) });
  const held = await stageFlow({ stage: 'stage2', block: C.block, configs: heldRows, seeds: seedsUsed, root, runner, registry, precheckBlock: { stage: 'stage2', lo: C.streamStart, hi: null }, concurrency, ident });
  const heldConfigs = heldRows.map(c => ({ index: c.configIndex, goal: c.goal })), heldTables = tablesOf(heldRows);
  if (cmd === 'stage2') { write('stage2_manifest.json', held.manifest); console.log('Stage 2 runs complete; next: `forks`.'); return; }
  const fk = await forkFlow({ heldEntries: held.entries, heldConfigs, seeds: seedsUsed, tables: heldTables, root, runner, concurrency, ident });
  if (cmd === 'forks') { write('fork_plan.json', fk.plan); write('forks_manifest.json', fk.manifest); console.log('Forks complete; next: `analyze`.'); return; }
  // the single analysis (cmd === 'analyze')
  const pb = pilotBlock({ entries: pilotEntries, pilotConfigs, seeds: P.seeds, tables: tablesOf(pilotRows), root, extensionAvailable: decision.extensionTaken });
  const hb = heldoutBlock({ entries: held.entries, heldConfigs, seeds: seedsUsed, tables: heldTables, root, diffs: fk.diffs });
  const input = studyInput({ pilot: pb, heldout: hb });
  const records = finalRecords({ root, heldEntries: held.entries, pairs: hb.pairs, forkAttempts: fk.attempts, diffs: fk.diffs, tables: heldTables, heldConfigs, seedsUsed });
  write('study_input.json', input);
  write('analysis_output.json', analyzeFinal({ input, records, lodged: decision }));
  console.log('Analysis output written with its SHA-256; lodge it before any report (D-023 §1(c)).');
}

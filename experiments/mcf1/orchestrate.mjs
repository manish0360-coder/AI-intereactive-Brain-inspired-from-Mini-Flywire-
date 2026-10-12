// ==========================================================
// MCF-1 — stage orchestrator
// ==========================================================
//   node orchestrate.mjs <stage> --mode development|official --out <dir> [--start N --length N] [--seeds a,b,c]
//        [--freeze <file>] [--v-sha <hex>] [--stop attempt-hook|call2] [--concurrency N]
//   stages: inventory | admit | qualify | validate | outcome | analyze
//
// Order and gating (Option C, census of the frozen complete-cluster frame):
//   inventory  -> reserved-span inventory + hash
//   admit      -> ascending admission scan + hash
//   qualify    -> Stage Q: one cold decision-stop run per admitted seed (no outcome)
//   validate   -> Stage V: 6 decision-stop runs per qualified seed, validity manifest + hash (no outcome exists)
//   outcome    -> Stage O: refuses unless the Stage-V manifest hash is supplied and intact; first attempt only
//   analyze    -> builds the ONE complete-cluster frame, then validity-first descriptive census; no inference
//
// Policy kept separate on purpose:
//   seed exclusion  a seed-scope hard rule failed in any of the six runs: the whole seed leaves the frame
//   stage halt      V1, V9, V12, a persistent run error (RUN), or (Stage O) the first seed-scope instrument fault
//   run error       one deterministic retry with identical inputs in a fresh isolated process; then halt
//
// Official mode: refused unless a freeze record is authorised (config.assertFreezeAuthorised, run BEFORE any
// inventory build or scan) and its hashes match.  The stage functions themselves refuse an official context that
// did not come from makeContext's gate, and an official Stage Q refuses unless every admitted seed is already
// recorded (MCF-1, registered).  Nothing here uses a clock or Math.random.  No authorised record exists in R1.
// ==========================================================
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { trajectory, trajectorySeed } from '../registry/typed.js';
import { STUDY, FRAME, DESIGN, BUDGETS, APPROVALS, DEV_BLOCK, EXPOSURE, DEV_BASE_CONFIG, canonicalJson, sha256, hashTextNormalised, configSnapshot, seedPolicy, assertFreezeAuthorised, assertOfficialAllowed } from './config.mjs';
import { buildInventory } from './inventory.mjs';
import { admitScan } from './admission.mjs';
import { RUN_KEYS, validateSeedV, validateSeedO, checkRuntimeIdentity, buildManifest, manifestIntact } from './validity.mjs';
import { analyzeFrame, verifyAnalysis } from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, 'driver.mjs');
const AUTHORISED = new WeakSet();                 // contexts that passed the official gate inside makeContext

// ---------------- context ----------------
export function makeContext({ policy = 'development', freeze = null, actual = null, concurrency = null, registry = trajectory, authorization = {} } = {}) {
  if (policy === 'official') assertOfficialAllowed(freeze, actual || {}, authorization);
  else if (policy !== 'development') throw new Error(`MCF-1: unknown policy ${policy}`);
  const tree = buildTree();                                           // reuses (and re-verifies) the conformed tree under os.tmpdir()
  const expectedIdentity = { manifestSha256: sha256(canonicalJson(tree.manifest.files)), b2Commit: tree.manifest.b2Commit };
  const sources = {};
  for (const f of fs.readdirSync(HERE).filter(n => n.endsWith('.mjs')).sort()) sources[f] = hashTextNormalised(fs.readFileSync(path.join(HERE, f), 'utf8'));
  const ctx = { policy, freezeSha256: freeze ? sha256(canonicalJson(freeze)) : null, tree, treeDir: tree.dir, expectedIdentity, sources, registry,
    concurrency: concurrency || Math.max(2, Math.min(10, os.cpus().length - 2)) };
  if (policy === 'official') AUTHORISED.add(ctx);
  return ctx;
}
/** every stage function calls this first: an official context must have passed makeContext's gate */
export function assertStageAllowed(ctx) {
  if (!ctx || (ctx.policy !== 'development' && ctx.policy !== 'official')) throw new Error('MCF-1 stage refused: no valid context');
  if (ctx.policy === 'official' && !AUTHORISED.has(ctx)) throw new Error('MCF-1 stage refused: an official context must be created by makeContext after the freeze-record gate');
}

// ---------------- registry preflight (official Stage Q only) ----------------
/**
 * Before an authorised Stage Q every admitted raw seed must already be recorded (MCF-1, registered), i.e. the
 * registry decision is REPRODUCTION.  AVAILABLE means "not yet recorded": refused.  Creates nothing.
 */
export function registryPreflight({ admitted, registry = trajectory, category = 'registered' }) {
  const counts = {}, offenders = [];
  for (const raw of admitted) {
    let d;
    try { d = registry.checkUse(trajectorySeed(raw), { study: STUDY, category }).decision; } catch (e) { d = 'REFUSED:' + (e.code || e.name); }
    counts[d] = (counts[d] || 0) + 1;
    if (d !== 'REPRODUCTION' && offenders.length < 10) offenders.push({ raw, decision: d });
  }
  return { ok: admitted.length > 0 && (counts.REPRODUCTION || 0) === admitted.length, admitted: admitted.length, counts, offenders };
}
export function assertRegistryPreflight(args) {
  const p = registryPreflight(args);
  if (!p.ok) throw new Error(`MCF-1 Stage Q refused: registry preflight failed (${JSON.stringify(p.counts)}; first offenders ${JSON.stringify(p.offenders.slice(0, 3))})`);
  return p;
}

// ---------------- driver pool with a resumable cache ----------------
function loadCache(file) {
  const m = new Map();
  if (file && fs.existsSync(file)) for (const l of fs.readFileSync(file, 'utf8').split('\n')) if (l.trim()) { const o = JSON.parse(l); m.set(o.label, o); }
  return m;
}
export function execDriver(input) {
  return new Promise((resolve) => {
    execFile(process.execPath, [DRIVER, JSON.stringify(input)], { maxBuffer: 1 << 27, encoding: 'utf8', timeout: 180000 }, (err, stdout, stderr) => {
      const m = (stdout || '').match(/@@RESULT@@([\s\S]*)@@END@@/);
      if (m) { try { return resolve(JSON.parse(m[1])); } catch (e) { /* fall through */ } }
      resolve({ label: input.label, error: String(err ? err.message : 'no result').slice(0, 240), stderrTail: String(stderr || '').slice(-240) });
    });
  });
}
/**
 * Run inputs through bounded concurrency; results in input order.  A run error gets exactly ONE retry with identical
 * inputs (each call of `exec` is a fresh isolated process); a second failure is returned as an error record and the
 * stage's assemble function turns it into a halt (never into a silent seed exclusion).
 */
export async function runPool(inputs, ctx, cacheFile = null, exec = execDriver) {
  if (cacheFile) fs.mkdirSync(path.dirname(cacheFile), { recursive: true });     // the output directory may not exist yet (found by the R1 CLI smoke)
  const cache = loadCache(cacheFile), out = new Array(inputs.length); let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++; if (i >= inputs.length) return;
      const input = inputs[i], inputSha = sha256(canonicalJson(input)), hit = cache.get(input.label);
      if (hit && hit.inputSha256 === inputSha && !hit.rec.error) { out[i] = hit.rec; continue; }
      let rec = await exec(input);
      if (rec.error) rec = await exec(input);                          // the one deterministic retry, identical inputs
      rec.label = input.label;
      out[i] = rec;
      if (cacheFile) fs.appendFileSync(cacheFile, JSON.stringify({ label: input.label, inputSha256: inputSha, rec }) + '\n');
    }
  };
  await Promise.all(Array.from({ length: Math.min(ctx.concurrency, Math.max(1, inputs.length)) }, worker));
  return out;
}
const baseInput = (ctx, extra) => ({ policy: ctx.policy, freezeSha256: ctx.freezeSha256, tree: ctx.treeDir, configSeed: DEV_BASE_CONFIG.configSeed, configIndex: DEV_BASE_CONFIG.configIndex, ...extra });
/** group aligned (inputs, records) into Map(raw -> {'C|T9': rec, ...}) */
export function groupBySeed(inputs, recs) {
  const by = new Map();
  recs.forEach((r, i) => { const raw = inputs[i].agentSeed, k = `${inputs[i].content}|${inputs[i].twin}`; if (!by.has(raw)) by.set(raw, {}); by.get(raw)[k] = r; });
  return by;
}

// ---------------- artifacts ----------------
export function writeArtifact(dir, name, obj) {
  fs.mkdirSync(dir, { recursive: true });
  const body = canonicalJson(obj) + '\n', file = path.join(dir, name);
  fs.writeFileSync(file, body);
  fs.writeFileSync(file + '.sha256', sha256(body) + '\n');
  return { file: name, sha256: sha256(body) };
}

/**
 * What the CLI prints for an artifact: the FILE hash and the object's OWN embedded hash.  The two differ, and Stage O's
 * --v-sha must carry the manifest's own hash (found by the R1 CLI smoke: the file hash was printed and then refused).
 */
export function artifactReport(art, obj) {
  return { ...art, manifestSha256: obj && typeof obj.sha256 === 'string' ? obj.sha256 : null };
}

// ---------------- stages ----------------
/** inventory (+ development variant) */
export function stageInventory({ policy }) {
  const exclude = policy === 'development' ? [DEV_BLOCK.id, ...EXPOSURE.map(e => e.id)] : [];
  return buildInventory({ exclude });
}
/** admission: development scans stay inside the exploratory domain; the candidate block is refused before anything is scanned */
export function stageAdmit({ policy, start, length, inventory }) {
  if (policy === 'development') {
    for (const raw of [start, start + length - 1]) { const p = seedPolicy('development', raw); if (!p.ok) throw new Error(`MCF-1 admission refused: ${p.why}`); }
  }
  return admitScan({ start, length, inventory, category: policy === 'official' ? 'registered' : 'development' });
}

/** Stage Q classification (pure) */
export function assembleQ({ seeds, recs, expectedIdentity }) {
  const qualified = [], rejected = [], byReason = {}, runFaults = [];
  recs.forEach((r, i) => {
    const raw = seeds[i]; let why = null;
    if (r.error || !r.outcome || !r.outcome.abortedBySentinel) why = 'RUN';
    else if (r.replays.length) why = 'REPLAY_AT_CALL0';
    else if (r.startNode !== FRAME.startNode) why = 'START_NODE';
    else if (r.decisions.length !== 1 || r.calls !== 1) why = 'DECISION';
    else if (r.step0.map(c => c.key).slice().sort((a, b) => a - b).join() !== FRAME.candidates.join() || r.step0.some(c => c.selfLoop) || !r.legality.candidatesAreEdges.every(Boolean)) why = 'CANDIDATES';
    if (why === 'RUN') runFaults.push(raw);
    if (why) { rejected.push({ raw, why, startNode: r.startNode === undefined ? null : r.startNode }); byReason[why] = (byReason[why] || 0) + 1; } else qualified.push(raw);
  });
  const identity = checkRuntimeIdentity(recs, expectedIdentity);
  const halts = [];
  if (!identity.ok) halts.push({ rule: 'V1', detail: identity });
  for (const raw of runFaults) halts.push({ rule: 'RUN', raw });
  const summary = { schema: 'mcf1.qualification/1', scanned: seeds.length, qualified: qualified.length, rejectedByReason: byReason, runtimeIdentity: identity, qualifiedSha256: sha256(qualified.join(',')) };
  return { qualified, rejected, summary, records: recs, halted: halts.length > 0, halts, sha256: sha256(canonicalJson({ summary, qualified })) };
}

/** Stage Q */
export async function stageQ({ seeds, ctx, cacheFile, exec = execDriver }) {
  assertStageAllowed(ctx);
  if (ctx.policy === 'official') assertRegistryPreflight({ admitted: seeds, registry: ctx.registry });     // R1 registry-scope preflight
  const inputs = seeds.map(raw => baseInput(ctx, { mode: 'Q', stopAt: 'decision', label: `Q|${raw}`, agentSeed: raw, content: 'C', twin: 'T9' }));
  const recs = await runPool(inputs, ctx, cacheFile, exec);
  return assembleQ({ seeds, recs, expectedIdentity: ctx.expectedIdentity });
}

/** Stage V assembly (pure; no environment attempt is possible: the driver's sink throws on any attempt) */
export function assembleV({ qualified, runsBySeed, allRecs, expectedIdentity, sources = {}, admittedSet = null, registryOf = null, policy = 'development' }) {
  const entries = [];
  for (const raw of qualified) {
    const runs = runsBySeed.get(raw) || {};
    const admitted = admittedSet ? admittedSet.has(raw) : true;
    const reg = registryOf ? registryOf(raw) : decideRegistry(raw, policy);
    entries.push(validateSeedV({ raw, runs, admitted, registryDecision: reg }));
  }
  const identity = checkRuntimeIdentity(allRecs, expectedIdentity);
  const halts = [];
  if (!identity.ok) halts.push({ rule: 'V1', detail: identity });
  for (const e of entries) if (e.failures && e.failures.RUN) halts.push({ rule: 'RUN', raw: e.raw, runs: e.failures.RUN.slice() });
  const manifest = buildManifest({ stage: 'V', inputs: { study: STUDY, qualifiedSha256: sha256(qualified.join(',')), tree: expectedIdentity, configSha256: sha256(canonicalJson(configSnapshot())), sources,
    budgets: { cognitive: BUDGETS.cognitive, visual: BUDGETS.visual, environment: BUDGETS.environment } }, entries, halts });
  return { manifest, halted: halts.length > 0 };
}
export async function stageV({ qualified, ctx, cacheFile, admittedSet = null, registryOf = null, exec = execDriver }) {
  assertStageAllowed(ctx);
  const inputs = [];
  for (const raw of qualified) for (const k of RUN_KEYS) { const [content, twin] = k.split('|'); inputs.push(baseInput(ctx, { mode: 'V', stopAt: 'decision', label: `V|${raw}|${k}`, agentSeed: raw, content, twin })); }
  const recs = await runPool(inputs, ctx, cacheFile, exec);
  const out = assembleV({ qualified, runsBySeed: groupBySeed(inputs, recs), allRecs: recs, expectedIdentity: ctx.expectedIdentity, sources: ctx.sources, admittedSet, registryOf, policy: ctx.policy });
  return { ...out, records: recs };
}
function decideRegistry(raw, policy) {
  try { return trajectory.checkUse(trajectorySeed(raw), { study: STUDY, category: policy === 'official' ? 'registered' : 'development' }).decision; }
  catch (e) { return 'REFUSED:' + (e.code || e.name); }
}

/**
 * Stage O assembly (pure).  Halts: V1, V9, V12 (integrity), RUN (persistent run error), and the first seed-scope
 * instrument fault (V4b, V11) once `haltCount` of them exist (ledger value 1: the first one).
 */
export function assembleO({ vManifest, runsBySeed, allRecs, expectedIdentity, sources = {}, stopAt = 'attempt-hook', haltCount = APPROVALS.instrumentHaltCount.value }) {
  const valid = vManifest.entries.filter(e => e.valid);
  const entries = valid.map(e => validateSeedO({ raw: e.raw, vEntry: e, runs: runsBySeed.get(e.raw) || {} }));
  const identity = checkRuntimeIdentity(allRecs, expectedIdentity);
  const halts = [];
  if (!identity.ok) halts.push({ rule: 'V1', detail: identity });
  for (const x of entries) for (const id of x.haltStage || []) halts.push({ rule: id, raw: x.raw, runs: ((x.haltDetail || {})[id] || []).slice() });
  for (const x of entries) if (x.failures && x.failures.RUN) halts.push({ rule: 'RUN', raw: x.raw, runs: x.failures.RUN.slice() });
  const faults = entries.filter(x => (x.hardSeed || []).some(id => id !== 'RUN') && !(x.haltStage || []).length);
  if (haltCount !== null && faults.length >= haltCount) halts.push({ rule: 'SEED_FAULT_AT_O', count: faults.length, threshold: haltCount, seeds: faults.slice(0, 10).map(x => ({ raw: x.raw, rules: x.hardSeed.slice(), runs: x.failures })) });
  const manifest = buildManifest({ stage: 'O', inputs: { study: STUDY, validityManifestSha256: vManifest.sha256, stopAt, tree: expectedIdentity, sources }, entries, halts });
  return { manifest, halted: halts.length > 0 };
}
/** Stage O — refuses without an intact Stage-V manifest whose hash the caller supplies independently */
export async function stageO({ vManifest, expectedVSha256, ctx, cacheFile, stopAt = 'attempt-hook', haltCount = APPROVALS.instrumentHaltCount.value, exec = execDriver }) {
  assertStageAllowed(ctx);
  if (!vManifest || !manifestIntact(vManifest)) throw new Error('MCF-1 Stage O refused: the validity manifest is missing or its hash does not match its body');
  if (typeof expectedVSha256 !== 'string' || expectedVSha256 !== vManifest.sha256) throw new Error('MCF-1 Stage O refused: the supplied validity-manifest hash does not match');
  if (vManifest.halts && vManifest.halts.length) throw new Error('MCF-1 Stage O refused: the validity stage halted');
  const inputs = [];
  for (const e of vManifest.entries.filter(x => x.valid)) for (const k of RUN_KEYS) { const [content, twin] = k.split('|'); inputs.push(baseInput(ctx, { mode: 'O', stopAt, label: `O|${stopAt}|${e.raw}|${k}`, agentSeed: e.raw, content, twin })); }
  const recs = await runPool(inputs, ctx, cacheFile, exec);
  const out = assembleO({ vManifest, runsBySeed: groupBySeed(inputs, recs), allRecs: recs, expectedIdentity: ctx.expectedIdentity, sources: ctx.sources, stopAt, haltCount });
  return { ...out, records: recs };
}

// ---------------- CLI ----------------
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) { const t = argv[i]; if (t.startsWith('--')) { a[t.slice(2)] = argv[i + 1]; i++; } else a._.push(t); }
  return a;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = args._[0], mode = args.mode || 'development';
  if (!stage) { console.error('usage: orchestrate.mjs <inventory|admit|qualify|validate|outcome|analyze> --mode development|official --out <dir> ...'); process.exit(2); }
  if (!args.out) { console.error('--out <dir> is required'); process.exit(2); }
  const out = path.resolve(args.out);
  const start = Number(args.start), length = Number(args.length);
  let ctx, inv, adm = null;
  if (mode === 'official') {
    // step 1, BEFORE any inventory build or scan: a freeze record must exist and be the authorised one (pinned in config)
    const freeze = args.freeze && fs.existsSync(args.freeze) ? JSON.parse(fs.readFileSync(args.freeze, 'utf8')) : null;
    assertFreezeAuthorised(freeze);
    // step 2: recompute every actual hash and compare with the record; no such record exists in R1
    const tree = buildTree();
    inv = stageInventory({ policy: 'official' });
    adm = stageAdmit({ policy: 'official', start, length, inventory: inv });
    const prereg = args.prereg && fs.existsSync(args.prereg) ? hashTextNormalised(fs.readFileSync(args.prereg, 'utf8')) : undefined;
    const actual = { preregistrationSha256: prereg, configSha256: sha256(canonicalJson(configSnapshot())), inventorySha256: inv.sha256, admittedSha256: adm.summary.admittedSha256, treeDigest: sha256(canonicalJson(tree.manifest.files)) };
    ctx = makeContext({ policy: 'official', freeze, actual, concurrency: args.concurrency ? Number(args.concurrency) : null });
  } else {
    ctx = makeContext({ policy: mode, concurrency: args.concurrency ? Number(args.concurrency) : null });
    inv = stageInventory({ policy: mode });
  }
  if (stage === 'inventory') { console.log(JSON.stringify(writeArtifact(out, 'inventory.json', inv.descriptor))); return; }
  if (!adm) adm = stageAdmit({ policy: mode, start, length, inventory: inv });
  if (stage === 'admit') { writeArtifact(out, 'inventory.json', inv.descriptor); console.log(JSON.stringify(writeArtifact(out, 'admitted.json', { summary: adm.summary, admitted: adm.admitted, rejected: adm.rejected }))); return; }
  const q = await stageQ({ seeds: adm.admitted, ctx, cacheFile: path.join(out, 'cache_Q.jsonl') });
  if (stage === 'qualify') { console.log(JSON.stringify(writeArtifact(out, 'qualified.json', { summary: q.summary, qualified: q.qualified, rejected: q.rejected, halts: q.halts }))); if (q.halted) process.exit(3); return; }
  if (q.halted) throw new Error(`MCF-1: qualification halted (${JSON.stringify(q.halts.slice(0, 3))})`);
  const v = await stageV({ qualified: q.qualified, ctx, cacheFile: path.join(out, 'cache_V.jsonl'), admittedSet: new Set(adm.admitted) });
  const vArt = writeArtifact(out, 'validity_manifest.json', v.manifest);
  if (v.halted) throw new Error(`MCF-1: Stage V halted (${JSON.stringify(v.manifest.halts.slice(0, 3))})`);
  if (stage === 'validate') { console.log(JSON.stringify(artifactReport(vArt, v.manifest))); return; }
  if (!args['v-sha']) throw new Error('MCF-1: --v-sha (the independently recorded validity-manifest hash, printed as manifestSha256 by the validate stage) is required for Stage O');
  const o = await stageO({ vManifest: v.manifest, expectedVSha256: args['v-sha'], ctx, cacheFile: path.join(out, 'cache_O.jsonl'), stopAt: args.stop || 'attempt-hook' });
  const oArt = writeArtifact(out, 'outcome_manifest.json', o.manifest);
  if (o.halted) throw new Error(`MCF-1: Stage O halted (${JSON.stringify(o.manifest.halts.slice(0, 3))})`);
  if (stage === 'outcome') { console.log(JSON.stringify(artifactReport(oArt, o.manifest))); return; }
  const an = analyzeFrame({ vManifest: v.manifest, oManifest: o.manifest, qualificationSummary: q.summary, admissionSummary: adm.summary, admittedList: adm.admitted });
  verifyAnalysis(an);
  console.log(JSON.stringify(artifactReport(writeArtifact(out, 'analysis.json', an), an)));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => { console.error(String(e && e.message ? e.message : e)); process.exit(1); });
}

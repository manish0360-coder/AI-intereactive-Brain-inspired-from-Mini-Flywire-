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
// Official mode takes NO path, range, record or option from the caller: `--mode official` accepts only
// `--concurrency`, `--v-sha` and `--stop`.  Authorization is lock.officialAuthorisation() (committed pin, committed
// record, declared sources, registry, preregistration); the window, output directory and tree are derived from it.
// The stage functions refuse an official context that did not come from makeContext, an official Stage Q refuses
// unless the registered MCF-1 block equals the admitted list, and Q -> V -> O is enforced by the receipt chain that
// the DRIVER checks in every process (lock.mjs), so direct driver invocation cannot skip an upstream stage.
// Nothing here uses a clock or Math.random.  No authorised record exists in this milestone.
// ==========================================================
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { trajectory, trajectorySeed, memberListOf } from '../registry/typed_v2.js';
import { STUDY, FRAME, DESIGN, BUDGETS, APPROVALS, DEV_BASE_CONFIG, STUDY_CONFIGURATION, canonicalJson, sha256, configSnapshot } from './config.mjs';
import { officialAuthorisation, verifyTreeReadOnly, treeBindingFromManifest, liveBindings, sourcesDigest, verifierDigest, readChain, commitReceipt, evaluateEnvironment, environmentMismatch } from './lock.mjs';
import { buildInventory } from './inventory.mjs';
import { stageInventory, stageAdmit } from './scan.mjs';     // admission lives in a module that cannot execute anything
import { RUN_KEYS, validateSeedV, validateSeedO, checkRuntimeIdentity, buildManifest, manifestIntact } from './validity.mjs';
import { analyzeFrame, verifyAnalysis } from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, 'driver.mjs');
const AUTHORISED = new WeakSet();                 // contexts that passed the official gate inside makeContext

// ---------------- context ----------------
const defaultConcurrency = (n) => n || Math.max(2, Math.min(10, os.cpus().length - 2));
/**
 * The official context.  Authority comes from committed state only (lock.officialAuthorisation) and the conformed
 * tree is VERIFIED with plain reads: this function, like every official path, can neither build, repair nor delete a
 * tree (the verifier proves that statically and under a filesystem trap).  Preparing the tree is a separate,
 * non-official step (experiments/mcf1/prepare_tree.mjs).
 */
function makeOfficialContext(concurrency) {
  const auth = officialAuthorisation();
  const v = verifyTreeReadOnly(auth.treeExpect);
  if (!v.ok) throw new Error(`MCF-1 official stage refused: the conformed tree cannot be used: ${v.why}`);
  const src = sourcesDigest();
  const ctx = { policy: 'official', auth, freezeSha256: auth.recordSha256, tree: { dir: v.dir, manifest: v.manifest }, treeDir: v.dir,
    expectedIdentity: { manifestSha256: auth.treeExpect.digest, b2Commit: v.manifest.b2Commit }, sources: src.files, sourcesSha256: src.sha256,
    study: STUDY_CONFIGURATION, concurrency: defaultConcurrency(concurrency) };
  AUTHORISED.add(ctx);
  return ctx;
}
/** the development context: the tree builder runs here (a single process, before any worker exists) */
function makeDevelopmentContext(concurrency) {
  const tree = buildTree();                                           // reuses (and re-verifies) the conformed tree under os.tmpdir()
  const expectedIdentity = { manifestSha256: sha256(canonicalJson(tree.manifest.files)), b2Commit: tree.manifest.b2Commit };
  const src = sourcesDigest();
  return { policy: 'development', auth: null, freezeSha256: null, tree, treeDir: tree.dir, expectedIdentity, sources: src.files, sourcesSha256: src.sha256,
    study: DEV_BASE_CONFIG, concurrency: defaultConcurrency(concurrency) };
}
/**
 * `policy` and `concurrency` are the only options.  There is no way to pass a freeze record, a pin, a registry, an
 * "actual hash" set or an authorization object: any other key is refused.
 */
export function makeContext(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new Error('MCF-1: makeContext options must be an object');
  const extra = Object.keys(options).filter(k => k !== 'policy' && k !== 'concurrency');
  if (extra.length) throw new Error(`MCF-1: makeContext accepts no option other than policy and concurrency (got ${extra.join(', ')})`);
  const { policy = 'development', concurrency = null } = options;
  if (policy === 'official') return makeOfficialContext(concurrency);
  if (policy === 'development') return makeDevelopmentContext(concurrency);
  throw new Error(`MCF-1: unknown policy ${policy}`);
}
/** every stage function calls this first: an official context must have passed makeContext's gate */
export function assertStageAllowed(ctx) {
  if (!ctx || (ctx.policy !== 'development' && ctx.policy !== 'official')) throw new Error('MCF-1 stage refused: no valid context');
  if (ctx.policy === 'official' && !AUTHORISED.has(ctx)) throw new Error('MCF-1 stage refused: an official context must be created by makeContext after the freeze-record gate');
}
/** official stages run only the committed driver and take no override of the registry, admitted set or halt rule */
function assertOfficialStageOptions(ctx, o) {
  if (ctx.policy !== 'official') return;
  if (o.exec !== undefined && o.exec !== execDriver) throw new Error('MCF-1 stage refused: an official stage runs only the committed driver (no executor override)');
  if (o.registryOf !== undefined && o.registryOf !== null) throw new Error('MCF-1 stage refused: an official stage takes no registry decision override');
  if (o.admittedSet !== undefined && o.admittedSet !== null) throw new Error('MCF-1 stage refused: an official stage takes no admitted-set override');
  if (o.haltCount !== undefined) throw new Error('MCF-1 stage refused: an official stage takes no halt-count override (the approved value is used)');
}

// ---------------- registry preflight (official Stage Q only) ----------------
/**
 * Before an authorised Stage Q the admitted list must be EXACTLY the registered MCF-1 block (not a subset, not a
 * superset: registering a seed that was never admitted would consume it) and every admitted raw seed must decide
 * REPRODUCTION.  AVAILABLE means "not yet recorded": refused.  Creates nothing.  This pure function takes the
 * registry as an argument so the verifier can exercise it; the stage path below always passes the module registry.
 */
export function evaluateRegistryPreflight(registry, { admitted, category = 'registered' }) {
  const counts = {}, offenders = [];
  for (const raw of admitted) {
    let d;
    try { d = registry.checkUse(trajectorySeed(raw), { study: STUDY, category }).decision; } catch (e) { d = 'REFUSED:' + (e.code || e.name); }
    counts[d] = (counts[d] || 0) + 1;
    if (d !== 'REPRODUCTION' && offenders.length < 10) offenders.push({ raw, decision: d });
  }
  const blocks = (registry.blocks || []).filter(b => b.study === STUDY), block = { ok: false, why: null };
  if (blocks.length !== 1) block.why = `expected exactly one registered ${STUDY} block, found ${blocks.length}`;
  else {
    const b = blocks[0], list = memberListOf(b);
    const ascending = admitted.every((v, i) => i === 0 || v > admitted[i - 1]);
    if (b.status !== 'registered') block.why = `the block status is ${b.status}`;
    else if (b.executed !== false) block.why = 'the block is already marked executed';
    else if (!ascending) block.why = 'the admitted list is not strictly ascending';
    else if (list.length !== admitted.length || list.some((v, i) => v !== admitted[i])) block.why = 'the registered block members are not exactly the admitted list';
    else if (b.listSha256 !== sha256(admitted.join(','))) block.why = 'the block list hash is not the admitted list hash';
    else block.ok = true;
  }
  return { ok: admitted.length > 0 && (counts.REPRODUCTION || 0) === admitted.length && block.ok, admitted: admitted.length, counts, offenders, block };
}
export function registryPreflight({ admitted, category = 'registered' }) { return evaluateRegistryPreflight(trajectory, { admitted, category }); }
export function assertRegistryPreflight(args) {
  const p = registryPreflight(args);
  if (!p.ok) throw new Error(`MCF-1 Stage Q refused: registry preflight failed (${JSON.stringify(p.counts)}; block ${p.block.ok ? 'ok' : p.block.why}; first offenders ${JSON.stringify(p.offenders.slice(0, 3))})`);
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
  // an input that names the official policy is executed only for an authorised official context, and only by the
  // committed driver (the pool is exported, so this cannot rely on the stage functions having run first)
  if (inputs.some(i => i && i.policy === 'official')) {
    assertStageAllowed(ctx);
    if (ctx.policy !== 'official') throw new Error('MCF-1 stage refused: official inputs need an official context');
    if (exec !== execDriver) throw new Error('MCF-1 stage refused: an official stage runs only the committed driver (no executor override)');
  } else if (ctx && ctx.policy === 'official') throw new Error('MCF-1 stage refused: an official context runs only official inputs');
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
const baseInput = (ctx, extra) => ({ policy: ctx.policy, freezeSha256: ctx.freezeSha256, tree: ctx.treeDir,
  configSeed: ctx.policy === 'official' ? STUDY_CONFIGURATION.seed : DEV_BASE_CONFIG.configSeed,
  configIndex: ctx.policy === 'official' ? STUDY_CONFIGURATION.index : DEV_BASE_CONFIG.configIndex, ...extra });
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
// stageInventory and stageAdmit are the NON-EXECUTING admission stage (scan.mjs): re-exported here so existing callers
// keep working, but defined in a module that has no path to runPool, execDriver or a driver process.
export { stageInventory, stageAdmit };

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

/**
 * Stage Q, split so that everything but the spawn is a pure, separately testable step:
 *   prepareQ   guards and inputs (official: no override, and the registered block must equal the admitted list)
 *   runPool    the only step that spawns
 *   finalizeQ  classification and, officially, the receipt (clears any V and O receipt of an older Q)
 */
export function prepareQ({ seeds, ctx, exec }) {
  assertStageAllowed(ctx);
  if (ctx.policy === 'official') { assertOfficialStageOptions(ctx, { exec }); assertRegistryPreflight({ admitted: seeds }); }     // the registered block must equal the admitted list
  return seeds.map(raw => baseInput(ctx, { mode: 'Q', stopAt: 'decision', label: `Q|${raw}`, agentSeed: raw, content: 'C', twin: 'T9' }));
}
export function finalizeQ({ seeds, recs, ctx }) {
  assertStageAllowed(ctx);
  const out = assembleQ({ seeds, recs, expectedIdentity: ctx.expectedIdentity });
  if (ctx.policy === 'official' && !out.halted) commitReceipt(ctx.auth, 'Q', { qualified: out.qualified.slice(), qualifiedSha256: sha256(out.qualified.join(',')), summarySha256: out.sha256, scanned: seeds.length });
  return out;
}
export async function stageQ({ seeds, ctx, cacheFile, exec = execDriver }) {
  const inputs = prepareQ({ seeds, ctx, exec });
  const recs = await runPool(inputs, ctx, cacheFile, exec);
  return finalizeQ({ seeds, recs, ctx });
}

/** the identity every manifest carries; a development manifest has a null record and policy "development" */
const manifestBindings = (ctx) => ({ policy: ctx.policy, freezeRecordSha256: ctx.freezeSha256, sourcesSha256: ctx.sourcesSha256, registryDigestSha256: trajectory.digest() });

/** Stage V assembly (pure; no environment attempt is possible: the driver's sink throws on any attempt) */
export function assembleV({ qualified, runsBySeed, allRecs, expectedIdentity, sources = {}, admittedSet = null, registryOf = null, policy = 'development', bindings = {} }) {
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
    budgets: { cognitive: BUDGETS.cognitive, visual: BUDGETS.visual, environment: BUDGETS.environment }, ...bindings }, entries, halts });
  return { manifest, halted: halts.length > 0 };
}
export function prepareV({ qualified, ctx, admittedSet = null, registryOf = null, exec }) {
  assertStageAllowed(ctx);
  const bindings = manifestBindings(ctx);
  if (ctx.policy === 'official') {
    assertOfficialStageOptions(ctx, { exec, admittedSet, registryOf });
    const ch = readChain(ctx.auth);
    if (ch.Q === null) throw new Error('MCF-1 Stage V refused: no Stage-Q receipt (Stage Q has not completed for this frozen identity)');
    const q = ch.Q.payload.qualified;
    if (q.length !== qualified.length || qualified.some((v, i) => v !== q[i])) throw new Error('MCF-1 Stage V refused: the qualified list is not the list in the Stage-Q receipt');
    admittedSet = new Set(memberListOf(ctx.auth.block));
    registryOf = (raw) => decideRegistry(raw, 'official');
    bindings.qualifiedReceiptSha256 = ch.Q.sha256;
  }
  const inputs = [];
  for (const raw of qualified) for (const k of RUN_KEYS) { const [content, twin] = k.split('|'); inputs.push(baseInput(ctx, { mode: 'V', stopAt: 'decision', label: `V|${raw}|${k}`, agentSeed: raw, content, twin })); }
  return { inputs, admittedSet, registryOf, bindings };
}
export function finalizeV({ qualified, inputs, recs, ctx, admittedSet, registryOf, bindings }) {
  assertStageAllowed(ctx);
  const out = assembleV({ qualified, runsBySeed: groupBySeed(inputs, recs), allRecs: recs, expectedIdentity: ctx.expectedIdentity, sources: ctx.sources, admittedSet, registryOf, policy: ctx.policy, bindings });
  if (ctx.policy === 'official' && !out.halted) {
    const valid = out.manifest.entries.filter(e => e.valid).map(e => e.raw);
    commitReceipt(ctx.auth, 'V', { valid, validSha256: sha256(valid.join(',')), manifestSha256: out.manifest.sha256, qualifiedSha256: sha256(qualified.join(',')) });
  }
  return { ...out, records: recs };
}
export async function stageV({ qualified, ctx, cacheFile, admittedSet = null, registryOf = null, exec = execDriver }) {
  const p = prepareV({ qualified, ctx, admittedSet, registryOf, exec });
  const recs = await runPool(p.inputs, ctx, cacheFile, exec);
  return finalizeV({ qualified, inputs: p.inputs, recs, ctx, admittedSet: p.admittedSet, registryOf: p.registryOf, bindings: p.bindings });
}
function decideRegistry(raw, policy) {
  try { return trajectory.checkUse(trajectorySeed(raw), { study: STUDY, category: policy === 'official' ? 'registered' : 'development' }).decision; }
  catch (e) { return 'REFUSED:' + (e.code || e.name); }
}

/**
 * Stage O assembly (pure).  Halts: V1, V9, V12 (integrity), RUN (persistent run error), and the first seed-scope
 * instrument fault (V4b, V11) once `haltCount` of them exist (ledger value 1: the first one).
 */
export function assembleO({ vManifest, runsBySeed, allRecs, expectedIdentity, sources = {}, stopAt = 'attempt-hook', haltCount = APPROVALS.instrumentHaltCount.value, bindings = {} }) {
  const valid = vManifest.entries.filter(e => e.valid);
  const entries = valid.map(e => validateSeedO({ raw: e.raw, vEntry: e, runs: runsBySeed.get(e.raw) || {} }));
  const identity = checkRuntimeIdentity(allRecs, expectedIdentity);
  const halts = [];
  if (!identity.ok) halts.push({ rule: 'V1', detail: identity });
  for (const x of entries) for (const id of x.haltStage || []) halts.push({ rule: id, raw: x.raw, runs: ((x.haltDetail || {})[id] || []).slice() });
  for (const x of entries) if (x.failures && x.failures.RUN) halts.push({ rule: 'RUN', raw: x.raw, runs: x.failures.RUN.slice() });
  const faults = entries.filter(x => (x.hardSeed || []).some(id => id !== 'RUN') && !(x.haltStage || []).length);
  if (haltCount !== null && faults.length >= haltCount) halts.push({ rule: 'SEED_FAULT_AT_O', count: faults.length, threshold: haltCount, seeds: faults.slice(0, 10).map(x => ({ raw: x.raw, rules: x.hardSeed.slice(), runs: x.failures })) });
  const manifest = buildManifest({ stage: 'O', inputs: { study: STUDY, validityManifestSha256: vManifest.sha256, stopAt, tree: expectedIdentity, sources, ...bindings }, entries, halts });
  return { manifest, halted: halts.length > 0 };
}
/**
 * Stage O — refuses without an intact Stage-V manifest whose hash the caller supplies independently.  Officially it
 * also needs the Stage-V receipt (itself linked to the current Stage-Q receipt) to record exactly this manifest, and
 * it always uses the approved halt count.
 */
export function prepareO({ vManifest, expectedVSha256, ctx, stopAt = 'attempt-hook', haltCount, exec }) {
  assertStageAllowed(ctx);
  if (!vManifest || !manifestIntact(vManifest)) throw new Error('MCF-1 Stage O refused: the validity manifest is missing or its hash does not match its body');
  if (typeof expectedVSha256 !== 'string' || expectedVSha256 !== vManifest.sha256) throw new Error('MCF-1 Stage O refused: the supplied validity-manifest hash does not match');
  if (vManifest.halts && vManifest.halts.length) throw new Error('MCF-1 Stage O refused: the validity stage halted');
  const bindings = manifestBindings(ctx);
  let halt = haltCount === undefined ? APPROVALS.instrumentHaltCount.value : haltCount;
  if (ctx.policy === 'official') {
    assertOfficialStageOptions(ctx, { exec, haltCount });
    const ch = readChain(ctx.auth);
    if (ch.V === null) throw new Error('MCF-1 Stage O refused: no Stage-V receipt (Stage V has not completed against the current Stage-Q receipt)');
    if (ch.V.payload.manifestSha256 !== vManifest.sha256) throw new Error('MCF-1 Stage O refused: the validity manifest is not the one recorded in the Stage-V receipt');
    halt = ctx.auth.haltCount;
    bindings.validityReceiptSha256 = ch.V.sha256;
  }
  const inputs = [];
  for (const e of vManifest.entries.filter(x => x.valid)) for (const k of RUN_KEYS) { const [content, twin] = k.split('|'); inputs.push(baseInput(ctx, { mode: 'O', stopAt, label: `O|${stopAt}|${e.raw}|${k}`, agentSeed: e.raw, content, twin })); }
  return { inputs, halt, bindings };
}
export function finalizeO({ vManifest, inputs, recs, ctx, stopAt = 'attempt-hook', halt, bindings }) {
  assertStageAllowed(ctx);
  const out = assembleO({ vManifest, runsBySeed: groupBySeed(inputs, recs), allRecs: recs, expectedIdentity: ctx.expectedIdentity, sources: ctx.sources, stopAt, haltCount: halt, bindings });
  if (ctx.policy === 'official' && !out.halted) commitReceipt(ctx.auth, 'O', { manifestSha256: out.manifest.sha256, validityManifestSha256: vManifest.sha256, stopAt, entries: out.manifest.entries.length });
  return { ...out, records: recs };
}
/**
 * Stage O — refuses without an intact Stage-V manifest whose hash the caller supplies independently.  Officially it
 * also needs the Stage-V receipt (itself linked to the current Stage-Q receipt) to record exactly this manifest, and
 * it always uses the approved halt count.
 */
export async function stageO({ vManifest, expectedVSha256, ctx, cacheFile, stopAt = 'attempt-hook', haltCount, exec = execDriver }) {
  const p = prepareO({ vManifest, expectedVSha256, ctx, stopAt, haltCount, exec });
  const recs = await runPool(p.inputs, ctx, cacheFile, exec);
  return finalizeO({ vManifest, inputs: p.inputs, recs, ctx, stopAt, halt: p.halt, bindings: p.bindings });
}

/**
 * The bindings a freeze record must carry, computed from the working tree by the same functions the checks use.
 * `treeDir` is the conformed tree directory (read-only).  admittedSha256 is the registered block's list hash:
 * this function runs no admission scan.  It writes nothing; the record itself is a deliberate, reviewed commit.
 */
export function computeFreezeBindings({ treeDir }) {
  const mine = trajectory.blocks.filter(b => b.study === STUDY);
  if (mine.length !== 1) throw new Error(`MCF-1: a freeze record needs exactly one registered ${STUDY} block (found ${mine.length})`);
  const live = liveBindings();
  return { preregistrationSha256: live.preregistrationSha256, configSha256: live.configSha256, sourcesSha256: live.sourcesSha256,
    verifierSha256: verifierDigest().sha256, registryDigestSha256: live.registryDigestSha256, inventorySha256: buildInventory({ exclude: [] }).sha256,
    admittedSha256: mine[0].listSha256, tree: treeBindingFromManifest(treeDir) };
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
  if (!stage) { console.error('usage: orchestrate.mjs <inventory|admit|qualify|validate|outcome|analyze> --mode development --out <dir> [--start N --length N] ... | --mode official [--concurrency N] [--v-sha H] [--stop S]'); process.exit(2); }
  let ctx, inv, adm = null, out, start, length;
  if (mode === 'official') {
    // the record, the preregistration, the window and the output directory are derived from committed state; none of
    // them is an argument (a flag that names one is refused before anything is read)
    const named = ['freeze', 'prereg', 'out', 'start', 'length', 'seeds'].filter(k => args[k] !== undefined);
    if (named.length) { console.error(`MCF-1 official stage refused: official mode accepts no --${named.join(', --')} (the record, preregistration, window and output directory come from committed state)`); process.exit(2); }
    // step 1, BEFORE any inventory build or scan: committed authorization, committed record, read-only tree check
    ctx = makeContext({ policy: 'official', concurrency: args.concurrency ? Number(args.concurrency) : null });
    const A = ctx.auth;
    // the FULL environment (rejected-candidate accounting included) once per run; every driver process re-checks the accepted configuration
    const envWhy = environmentMismatch(await evaluateEnvironment(ctx.treeDir));
    if (envWhy !== null) throw new Error(`MCF-1 official stage refused: the study environment differs from the approved configuration: ${envWhy}`);
    // step 2: the bindings that need the inventory build and the admission scan (once per run)
    inv = stageInventory({ policy: 'official' });
    if (inv.sha256 !== A.bindings.inventorySha256) throw new Error('MCF-1 official stage refused: inventorySha256 does not match the freeze record');
    adm = stageAdmit({ policy: 'official', start: A.seedBlock, length: A.scanLength, inventory: inv });
    if (adm.summary.admittedSha256 !== A.bindings.admittedSha256) throw new Error('MCF-1 official stage refused: the admitted list hash does not match the freeze record');
    if (verifierDigest().sha256 !== A.bindings.verifierSha256) throw new Error('MCF-1 official stage refused: the verifier files differ from the freeze record');
    out = A.dir;
  } else {
    if (!args.out) { console.error('--out <dir> is required'); process.exit(2); }
    out = path.resolve(args.out);
    start = Number(args.start); length = Number(args.length);
    ctx = makeContext({ policy: mode, concurrency: args.concurrency ? Number(args.concurrency) : null });
    inv = stageInventory({ policy: mode });
  }
  if (stage === 'inventory') { console.log(JSON.stringify(writeArtifact(out, 'inventory.json', inv.descriptor))); return; }
  if (!adm) adm = stageAdmit({ policy: mode, start, length, inventory: inv });
  if (stage === 'admit') { writeArtifact(out, 'inventory.json', inv.descriptor); console.log(JSON.stringify(writeArtifact(out, 'admitted.json', { summary: adm.summary, admitted: adm.admitted, rejected: adm.rejected }))); return; }
  const q = await stageQ({ seeds: adm.admitted, ctx, cacheFile: path.join(out, 'cache_Q.jsonl') });
  if (stage === 'qualify') { console.log(JSON.stringify(writeArtifact(out, 'qualified.json', { summary: q.summary, qualified: q.qualified, rejected: q.rejected, halts: q.halts }))); if (q.halted) process.exit(3); return; }
  if (q.halted) throw new Error(`MCF-1: qualification halted (${JSON.stringify(q.halts.slice(0, 3))})`);
  const v = await stageV({ qualified: q.qualified, ctx, cacheFile: path.join(out, 'cache_V.jsonl'), admittedSet: ctx.policy === 'official' ? null : new Set(adm.admitted) });
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

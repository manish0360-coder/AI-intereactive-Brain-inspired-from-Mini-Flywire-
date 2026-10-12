// ==========================================================
// MCF-1 — stage orchestrator
// ==========================================================
//   node orchestrate.mjs <stage> --mode development|official --out <dir> [--start N --length N] [--seeds a,b,c]
//        [--freeze <file>] [--v-sha <hex>] [--stop attempt-hook|call2] [--concurrency N]
//   stages: inventory | admit | qualify | validate | outcome | analyze
//
// Order and gating (Option C, census of the frozen frame):
//   inventory  -> reserved-span inventory + hash
//   admit      -> ascending admission scan + hash
//   qualify    -> Stage Q: one cold decision-stop run per admitted seed (no outcome)
//   validate   -> Stage V: 6 decision-stop runs per qualified seed, validity manifest + hash (no outcome exists)
//   outcome    -> Stage O: refuses unless the Stage-V manifest hash is supplied and intact; first attempt only
//   analyze    -> reads the validity manifest FIRST, then the outcomes; descriptive census only
//
// Nothing here uses a clock or Math.random.  Official mode is refused without a verified freeze record
// (config.assertOfficialAllowed); this milestone creates no such record.
// ==========================================================
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { trajectory, trajectorySeed } from '../registry/typed.js';
import { STUDY, FRAME, DESIGN, BUDGETS, APPROVALS, DEV_BLOCK, EXPOSURE, DEV_BASE_CONFIG, canonicalJson, sha256, hashTextNormalised, configSnapshot, seedPolicy, assertOfficialAllowed } from './config.mjs';
import { buildInventory } from './inventory.mjs';
import { admitScan } from './admission.mjs';
import { RUN_KEYS, validateSeedV, validateSeedO, checkRuntimeIdentity, buildManifest, manifestIntact } from './validity.mjs';
import { analyzeFrame } from './analyze.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, 'driver.mjs');

// ---------------- context ----------------
export function makeContext({ policy = 'development', freezeSha256 = null, concurrency = null } = {}) {
  const tree = buildTree();                                           // reuses (and re-verifies) the conformed tree under os.tmpdir()
  const expectedIdentity = { manifestSha256: sha256(canonicalJson(tree.manifest.files)), b2Commit: tree.manifest.b2Commit };
  const sources = {};
  for (const f of fs.readdirSync(HERE).filter(n => n.endsWith('.mjs')).sort()) sources[f] = hashTextNormalised(fs.readFileSync(path.join(HERE, f), 'utf8'));
  return { policy, freezeSha256, tree, treeDir: tree.dir, expectedIdentity, sources, concurrency: concurrency || Math.max(2, Math.min(10, os.cpus().length - 2)) };
}

// ---------------- driver pool with a resumable cache ----------------
function loadCache(file) {
  const m = new Map();
  if (file && fs.existsSync(file)) for (const l of fs.readFileSync(file, 'utf8').split('\n')) if (l.trim()) { const o = JSON.parse(l); m.set(o.label, o); }
  return m;
}
function execDriver(input) {
  return new Promise((resolve) => {
    execFile(process.execPath, [DRIVER, JSON.stringify(input)], { maxBuffer: 1 << 27, encoding: 'utf8', timeout: 180000 }, (err, stdout, stderr) => {
      const m = (stdout || '').match(/@@RESULT@@([\s\S]*)@@END@@/);
      if (m) { try { return resolve(JSON.parse(m[1])); } catch (e) { /* fall through */ } }
      resolve({ label: input.label, error: String(err ? err.message : 'no result').slice(0, 240), stderrTail: String(stderr || '').slice(-240) });
    });
  });
}
/** run inputs through bounded concurrency; one deterministic retry on a driver failure; results in input order */
export async function runPool(inputs, ctx, cacheFile = null) {
  const cache = loadCache(cacheFile), out = new Array(inputs.length); let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++; if (i >= inputs.length) return;
      const input = inputs[i], inputSha = sha256(canonicalJson(input)), hit = cache.get(input.label);
      if (hit && hit.inputSha256 === inputSha && !hit.rec.error) { out[i] = hit.rec; continue; }
      let rec = await execDriver(input);
      if (rec.error) rec = await execDriver(input);                    // one retry, identical inputs
      rec.label = input.label;
      out[i] = rec;
      if (cacheFile) fs.appendFileSync(cacheFile, JSON.stringify({ label: input.label, inputSha256: inputSha, rec }) + '\n');
    }
  };
  await Promise.all(Array.from({ length: Math.min(ctx.concurrency, Math.max(1, inputs.length)) }, worker));
  return out;
}
const baseInput = (ctx, extra) => ({ policy: ctx.policy, freezeSha256: ctx.freezeSha256, tree: ctx.treeDir, configSeed: DEV_BASE_CONFIG.configSeed, configIndex: DEV_BASE_CONFIG.configIndex, ...extra });

// ---------------- artifacts ----------------
export function writeArtifact(dir, name, obj) {
  fs.mkdirSync(dir, { recursive: true });
  const body = canonicalJson(obj) + '\n', file = path.join(dir, name);
  fs.writeFileSync(file, body);
  fs.writeFileSync(file + '.sha256', sha256(body) + '\n');
  return { file: name, sha256: sha256(body) };
}

// ---------------- stages ----------------
/** inventory (+ development variant) */
export function stageInventory({ policy }) {
  const exclude = policy === 'development' ? [DEV_BLOCK.id, ...EXPOSURE.map(e => e.id)] : [];
  return buildInventory({ exclude });
}
/** admission: development scans stay inside the exploratory domain; the candidate block is refused */
export function stageAdmit({ policy, start, length, inventory }) {
  if (policy === 'development') {
    for (const raw of [start, start + length - 1]) { const p = seedPolicy('development', raw); if (!p.ok) throw new Error(`MCF-1 admission refused: ${p.why}`); }
  }
  return admitScan({ start, length, inventory, category: policy === 'official' ? 'registered' : 'development' });
}

/** Stage Q */
export async function stageQ({ seeds, ctx, cacheFile }) {
  const inputs = seeds.map(raw => baseInput(ctx, { mode: 'Q', stopAt: 'decision', label: `Q|${raw}`, agentSeed: raw, content: 'C', twin: 'T9' }));
  const recs = await runPool(inputs, ctx, cacheFile);
  const qualified = [], rejected = [], byReason = {};
  recs.forEach((r, i) => {
    const raw = seeds[i]; let why = null;
    if (r.error || !r.outcome || !r.outcome.abortedBySentinel) why = 'RUN';
    else if (r.replays.length) why = 'REPLAY_AT_CALL0';
    else if (r.startNode !== FRAME.startNode) why = 'START_NODE';
    else if (r.decisions.length !== 1 || r.calls !== 1) why = 'DECISION';
    else if (r.step0.map(c => c.key).slice().sort((a, b) => a - b).join() !== FRAME.candidates.join() || r.step0.some(c => c.selfLoop) || !r.legality.candidatesAreEdges.every(Boolean)) why = 'CANDIDATES';
    if (why) { rejected.push({ raw, why, startNode: r.startNode === undefined ? null : r.startNode }); byReason[why] = (byReason[why] || 0) + 1; } else qualified.push(raw);
  });
  const identity = checkRuntimeIdentity(recs, ctx.expectedIdentity);
  const summary = { schema: 'mcf1.qualification/1', scanned: seeds.length, qualified: qualified.length, rejectedByReason: byReason, runtimeIdentity: identity, qualifiedSha256: sha256(qualified.join(',')) };
  return { qualified, rejected, summary, records: recs, halted: !identity.ok, sha256: sha256(canonicalJson({ summary, qualified })) };
}

/** Stage V (no environment attempt is possible: the driver's sink throws on any attempt) */
export async function stageV({ qualified, ctx, cacheFile, admittedSet = null, registryOf = null }) {
  const inputs = [];
  for (const raw of qualified) for (const k of RUN_KEYS) { const [content, twin] = k.split('|'); inputs.push(baseInput(ctx, { mode: 'V', stopAt: 'decision', label: `V|${raw}|${k}`, agentSeed: raw, content, twin })); }
  const recs = await runPool(inputs, ctx, cacheFile);
  const entries = [], bySeed = new Map();
  recs.forEach((r, i) => { const raw = inputs[i].agentSeed, k = `${inputs[i].content}|${inputs[i].twin}`; if (!bySeed.has(raw)) bySeed.set(raw, {}); bySeed.get(raw)[k] = r; });
  for (const raw of qualified) {
    const runs = bySeed.get(raw);
    const admitted = admittedSet ? admittedSet.has(raw) : true;
    const reg = registryOf ? registryOf(raw) : decideRegistry(raw, ctx.policy);
    entries.push(validateSeedV({ raw, runs, admitted, registryDecision: reg }));
  }
  const identity = checkRuntimeIdentity(recs, ctx.expectedIdentity);
  const halts = identity.ok ? [] : [{ rule: 'V1', detail: identity }];
  const manifest = buildManifest({ stage: 'V', inputs: { study: STUDY, qualifiedSha256: sha256(qualified.join(',')), tree: ctx.expectedIdentity, configSha256: sha256(canonicalJson(configSnapshot())), sources: ctx.sources, budgets: { cognitive: BUDGETS.cognitive, visual: BUDGETS.visual, environment: BUDGETS.environment } }, entries, halts });
  return { manifest, records: recs, halted: halts.length > 0 };
}
function decideRegistry(raw, policy) {
  try { return trajectory.checkUse(trajectorySeed(raw), { study: STUDY, category: policy === 'official' ? 'registered' : 'development' }).decision; }
  catch (e) { return 'REFUSED:' + (e.code || e.name); }
}

/** Stage O — refuses without an intact Stage-V manifest whose hash the caller supplies independently */
export async function stageO({ vManifest, expectedVSha256, ctx, cacheFile, stopAt = 'attempt-hook', haltCount = APPROVALS.instrumentHaltCount.value }) {
  if (!vManifest || !manifestIntact(vManifest)) throw new Error('MCF-1 Stage O refused: the validity manifest is missing or its hash does not match its body');
  if (typeof expectedVSha256 !== 'string' || expectedVSha256 !== vManifest.sha256) throw new Error('MCF-1 Stage O refused: the supplied validity-manifest hash does not match');
  if (vManifest.halts && vManifest.halts.length) throw new Error('MCF-1 Stage O refused: the validity stage halted');
  const valid = vManifest.entries.filter(e => e.valid);
  const inputs = [];
  for (const e of valid) for (const k of RUN_KEYS) { const [content, twin] = k.split('|'); inputs.push(baseInput(ctx, { mode: 'O', stopAt, label: `O|${stopAt}|${e.raw}|${k}`, agentSeed: e.raw, content, twin })); }
  const recs = await runPool(inputs, ctx, cacheFile);
  const bySeed = new Map();
  recs.forEach((r, i) => { const raw = inputs[i].agentSeed, k = `${inputs[i].content}|${inputs[i].twin}`; if (!bySeed.has(raw)) bySeed.set(raw, {}); bySeed.get(raw)[k] = r; });
  const entries = valid.map(e => validateSeedO({ raw: e.raw, vEntry: e, runs: bySeed.get(e.raw) }));
  const identity = checkRuntimeIdentity(recs, ctx.expectedIdentity);
  const halts = [];
  if (!identity.ok) halts.push({ rule: 'V1', detail: identity });
  for (const x of entries) for (const id of x.haltStage || []) halts.push({ rule: id, raw: x.raw });
  const seedInvalid = entries.filter(x => !x.valid && !(x.haltStage || []).length).length;
  if (haltCount !== null && seedInvalid >= haltCount) halts.push({ rule: 'INSTRUMENT_INVALID_COUNT', count: seedInvalid, threshold: haltCount });
  const manifest = buildManifest({ stage: 'O', inputs: { study: STUDY, validityManifestSha256: vManifest.sha256, stopAt, tree: ctx.expectedIdentity, sources: ctx.sources }, entries, halts });
  return { manifest, records: recs, halted: halts.length > 0 };
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
  let freezeSha = null;
  if (mode === 'official') {
    // every actual hash is recomputed here and compared with the freeze record; no such record exists in this milestone
    const freeze = args.freeze && fs.existsSync(args.freeze) ? JSON.parse(fs.readFileSync(args.freeze, 'utf8')) : null;
    if (!freeze) assertOfficialAllowed(null, {});
    const ictx = makeContext({ policy: 'official' }), iinv = stageInventory({ policy: 'official' });
    const iadm = stageAdmit({ policy: 'official', start: Number(args.start), length: Number(args.length), inventory: iinv });
    const prereg = args.prereg && fs.existsSync(args.prereg) ? hashTextNormalised(fs.readFileSync(args.prereg, 'utf8')) : undefined;
    assertOfficialAllowed(freeze, { preregistrationSha256: prereg, configSha256: sha256(canonicalJson(configSnapshot())), inventorySha256: iinv.sha256, admittedSha256: iadm.summary.admittedSha256, treeDigest: ictx.expectedIdentity.manifestSha256 });
    freezeSha = sha256(canonicalJson(freeze));
  }
  const ctx = makeContext({ policy: mode, freezeSha256: freezeSha, concurrency: args.concurrency ? Number(args.concurrency) : null });
  const inv = stageInventory({ policy: mode });
  if (stage === 'inventory') { console.log(JSON.stringify(writeArtifact(out, 'inventory.json', inv.descriptor))); return; }
  const start = Number(args.start), length = Number(args.length);
  const adm = stageAdmit({ policy: mode, start, length, inventory: inv });
  if (stage === 'admit') { writeArtifact(out, 'inventory.json', inv.descriptor); console.log(JSON.stringify(writeArtifact(out, 'admitted.json', { summary: adm.summary, admitted: adm.admitted, rejected: adm.rejected }))); return; }
  const q = await stageQ({ seeds: adm.admitted, ctx, cacheFile: path.join(out, 'cache_Q.jsonl') });
  if (stage === 'qualify') { console.log(JSON.stringify(writeArtifact(out, 'qualified.json', { summary: q.summary, qualified: q.qualified, rejected: q.rejected }))); return; }
  if (q.halted) throw new Error('MCF-1: qualification halted on runtime identity');
  const v = await stageV({ qualified: q.qualified, ctx, cacheFile: path.join(out, 'cache_V.jsonl'), admittedSet: new Set(adm.admitted) });
  const vArt = writeArtifact(out, 'validity_manifest.json', v.manifest);
  if (stage === 'validate') { console.log(JSON.stringify(vArt)); return; }
  if (!args['v-sha']) throw new Error('MCF-1: --v-sha (the independently recorded validity-manifest hash) is required for Stage O');
  const o = await stageO({ vManifest: v.manifest, expectedVSha256: args['v-sha'], ctx, cacheFile: path.join(out, 'cache_O.jsonl'), stopAt: args.stop || 'attempt-hook' });
  const oArt = writeArtifact(out, 'outcome_manifest.json', o.manifest);
  if (stage === 'outcome') { console.log(JSON.stringify(oArt)); return; }
  const an = analyzeFrame({ vManifest: v.manifest, oManifest: o.manifest, admissionSummary: adm.summary, qualificationSummary: q.summary });
  console.log(JSON.stringify(writeArtifact(out, 'analysis.json', an)));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => { console.error(String(e && e.message ? e.message : e)); process.exit(1); });
}

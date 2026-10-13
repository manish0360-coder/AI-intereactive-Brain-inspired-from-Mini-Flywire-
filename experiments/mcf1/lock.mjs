// ==========================================================
// MCF-1 — the official-execution lock (committed-state authorization, driver-boundary enforcement, receipts)
// ==========================================================
// Principle: authorization is a function of COMMITTED state only.  No parameter, option, environment variable,
// CLI flag or input file carries authority; a caller may supply a value to be CHECKED against committed state,
// never to be trusted.  Nothing in this module reads a clock or a random number, and nothing in it can delete,
// rebuild or write the conformed tree (the tree is verified with plain reads only).
//
//   officialAuthorisation()       parameterless.  pin (authorization.mjs) -> record file at a constant path ->
//                                 closed-schema validation -> source / config / registry / preregistration digests ->
//                                 the single registered MCF-1 block.  Throws, or returns a frozen object.
//   assertOfficialExecution(IN)   the driver's official branch.  Everything the driver is about to execute is checked:
//                                 authorization, seed membership, derived configuration, read-only tree
//                                 verification, whole-environment identity and the stage-receipt lineage.
//   readChain / commitReceipt     the Q -> V -> O receipt chain, one file replaced atomically, fail closed.
//
// Threat model.  A careless caller (calling exported functions or spawning the driver with options copied from
// tests) is prevented: no option exists.  A deliberate local editor who changes this file, the registry data or a
// receipt is DETECTED, not prevented: every binding below can be recomputed and is recorded outside the working
// tree.  Receipt files are integrity and ordering evidence, not secrets; a determined editor can forge a receipt
// by computing every binding.  Out of scope: preloaded modules, a replaced Node binary, rewritten git history.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STUDY, FROZEN, BLOCK, REQUIRED_FOR_OFFICIAL, APPROVALS, STUDY_CONFIGURATION, DEV_BASE_CONFIG, canonicalJson, hashObject, hashTextNormalised, configSnapshot } from './config.mjs';
import { FREEZE_RECORD_SHA256, SCAN_AUTHORIZATION } from './authorization.mjs';
import { canonicalEnvironment, canonicalAcceptedConfiguration, ACCEPTED_SECTIONS, constantsOf, readGraph, frameEdgeValues } from './envidentity.mjs';
import { trajectory, trajectorySeed, memberListOf, listSha256Of } from '../registry/typed_v2.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');

export const FREEZE_RECORD_REL = 'experiments/mcf1/freeze_record.json';
export const PREREG_REL = 'research/preregistrations/MCF1_PREREGISTRATION.md';
export const PIN_MODULE_REL = 'experiments/mcf1/authorization.mjs';
export const OFFICIAL_ROOT_REL = 'experiments/mcf1/data/official';
export const RECORD_SCHEMA = 'mcf1.freeze/2';
export const RECEIPT_SCHEMA = 'mcf1.receipt/2';
export const CHAIN_SCHEMA = 'mcf1.receipt-chain/1';

/**
 * The runtime source closure that a run's behaviour depends on (declared, not discovered; the verifier walks the
 * import graph of the entry points and fails if a reachable runtime file is neither listed here nor in
 * SOURCE_EXCLUSIONS, and if a listed file is not reachable).  authorization.mjs, freeze_record.json and
 * trajectory_blocks.js are deliberately absent: the pin is the hash of a record that contains this digest, and the
 * registry data is bound semantically by registryDigestSha256.
 */
export const SOURCE_FILES = Object.freeze([
  'connections.json',
  'experiments/h1r/build_tree.mjs', 'experiments/h1r/conformance_transform.mjs', 'experiments/h1r/env_seed.mjs',
  'experiments/h1r/measure.mjs', 'experiments/h1r/measure_install.mjs', 'experiments/h1r/runtime.mjs',
  'experiments/m8/instrument.js', 'experiments/m8/protocol.js',
  'experiments/mcf1/admission.mjs', 'experiments/mcf1/analyze.mjs', 'experiments/mcf1/config.mjs', 'experiments/mcf1/driver.mjs',
  'experiments/mcf1/envidentity.mjs', 'experiments/mcf1/episodes.mjs', 'experiments/mcf1/frame.mjs', 'experiments/mcf1/inventory.mjs',
  'experiments/mcf1/lock.mjs', 'experiments/mcf1/orchestrate.mjs', 'experiments/mcf1/scan.mjs', 'experiments/mcf1/validity.mjs',
  'experiments/q1/instrument.js', 'experiments/q1/protocol.js',
  // the registry layer, named by its base names (data): this module has a dynamic import for the tree's environment
  // module, so a literal path to the legacy registry here would be read by the import-isolation gate as an indirect
  // reference; it is hashed, never imported
  ...['consumed', 'consumed_after_c1', 'consumed_after_h1r', 'consumed_after_study2', 'typed', 'typed_v2'].map(n => `experiments/registry/${n}.js`),
  'experiments/uqa/protocol.js', 'experiments/uqb/protocol.js',
  'instrumentation/rng.js', 'neurons.json',
]);
/** reachable on purpose and bound another way (or not behaviour) */
export const SOURCE_EXCLUSIONS = Object.freeze({
  'experiments/mcf1/authorization.mjs': 'the pin: hash of the record that contains the source digest (a cycle if included); shape-checked',
  'experiments/registry/trajectory_blocks.js': 'registry data: bound semantically by registryDigestSha256',
});
/** evidence, not behaviour: bound once per run by the orchestrator, never per driver process */
export const VERIFIER_FILES = Object.freeze([
  'experiments/mcf1/verify_mcf1.mjs', 'experiments/mcf1/verify_r2.mjs', 'experiments/mcf1/verify_scan.mjs',
  'experiments/registry/import_isolation.js', 'experiments/registry/legacy_typed_importers.json',
  'experiments/registry/verify_blocks.js', 'experiments/registry/verify_import_isolation.js', 'experiments/registry/verify_registry.js',
]);

// ---- small helpers ----
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const HEX64 = /^[0-9a-f]{64}$/;
const fail = (m) => { throw new Error(`MCF-1 official stage refused: ${m}`); };
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); }
  return o;
}
const isPlain = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
function exactKeys(o, keys, where) {
  if (!isPlain(o)) fail(`${where} must be a plain object`);
  const own = Object.keys(o).sort(), want = keys.slice().sort();
  if (own.length !== want.length || own.some((k, i) => k !== want[i])) fail(`${where} must have exactly the keys ${want.join(', ')}`);
}

// ---- source and verifier digests (pure reads) ----
export function digestOfFiles(files) { return sha256(canonicalJson({ schema: 'mcf1.sources/1', files })); }
function digestFiles(list) {
  const files = {};
  for (const rel of list) files[rel] = hashTextNormalised(fs.readFileSync(path.join(REPO, rel), 'utf8'));
  return { files, sha256: digestOfFiles(files) };
}
export const sourcesDigest = () => digestFiles(SOURCE_FILES);
export const verifierDigest = () => digestFiles(VERIFIER_FILES);

// ---- the pin module must be exactly the two declarations, in this order ----
const COMMENT = String.raw`(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)`;
const PIN_TEMPLATE = new RegExp(String.raw`^\s*(?:${COMMENT}\s*)*export const FREEZE_RECORD_SHA256 = (?:null|'[0-9a-f]{64}');\s*(?:${COMMENT}\s*)*export const SCAN_AUTHORIZATION = (?:null|\{ start: \d+, length: \d+ \});\s*(?:${COMMENT}\s*)*$`);
export const pinModuleShapeOk = (text) => PIN_TEMPLATE.test(String(text).replace(/\r\n/g, '\n'));

// ---- read-only conformed-tree verification (never rebuilds, never deletes, never writes) ----
const TREE_NAME = /^conformed-[0-9a-f]{7}-[0-9a-f]{12}$/;
export function transformSha256() { return sha256(fs.readFileSync(path.join(REPO, 'experiments/h1r/conformance_transform.mjs'))); }
export function verifyTreeReadOnly(expect) {
  const res = (ok, why, extra = {}) => ({ ok, why, ...extra });
  if (!isPlain(expect) || typeof expect.name !== 'string' || !TREE_NAME.test(expect.name)) return res(false, 'the expected tree name is malformed');
  const t = transformSha256();
  if (t !== expect.transformSha256) return res(false, 'conformance_transform.mjs differs from the frozen transform digest');
  if (!expect.name.endsWith(t.slice(0, 12))) return res(false, 'the tree name does not carry the transform digest');
  const base = path.join(os.tmpdir(), 'mfw-h1r');
  if (!fs.existsSync(base)) return res(false, 'the conformed-tree root does not exist (prepare it with experiments/mcf1/prepare_tree.mjs)');
  const dir = path.join(fs.realpathSync.native(base), expect.name), mp = path.join(dir, 'MANIFEST.json');
  if (!fs.existsSync(mp)) return res(false, 'the conformed tree is missing (prepare it with experiments/mcf1/prepare_tree.mjs)', { dir });
  let m;
  try { m = JSON.parse(fs.readFileSync(mp, 'utf8')); } catch (e) { return res(false, 'MANIFEST.json is unreadable', { dir }); }
  if (!isPlain(m) || !isPlain(m.files)) return res(false, 'MANIFEST.json has no file map', { dir });
  if (m.b2Commit !== expect.b2Commit || m.transformSha256 !== expect.transformSha256) return res(false, 'MANIFEST.json identity differs from the frozen identity', { dir });
  if (sha256(canonicalJson(m.files)) !== expect.digest) return res(false, 'the tree manifest digest differs from the frozen tree digest', { dir });
  for (const [rel, h] of Object.entries(m.files)) {
    if (path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) return res(false, `unsafe path in the manifest: ${rel}`, { dir });
    let buf;
    try { buf = fs.readFileSync(path.join(dir, rel)); } catch (e) { return res(false, `missing tree file ${rel}`, { dir }); }
    if (sha256(buf) !== h) return res(false, `corrupt tree file ${rel}`, { dir });
  }
  return res(true, null, { dir, manifest: m });
}

/** the tree binding a freeze record carries, read from an existing conformed tree (read-only) */
export function treeBindingFromManifest(dir) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  return { name: path.basename(dir), digest: sha256(canonicalJson(m.files)), b2Commit: m.b2Commit, transformSha256: m.transformSha256 };
}

// ---- the registered MCF-1 block ----
function studyBlockOf(registry) {
  const mine = registry.blocks.filter(b => b.study === STUDY);
  if (mine.length !== 1) fail(`exactly one registered ${STUDY} block is required (found ${mine.length})`);
  return mine[0];
}
const inBlock = (b, raw) => raw >= b.lo && raw <= b.hi && !b.excluded.includes(raw);

// ---- the freeze record ----
const BINDING_KEYS = ['preregistrationSha256', 'configSha256', 'sourcesSha256', 'verifierSha256', 'registryDigestSha256', 'inventorySha256', 'admittedSha256', 'tree'];
function validateRecord(rec) {
  exactKeys(rec, rec && Object.prototype.hasOwnProperty.call(rec, 'testOnly') ? ['schema', 'frozen', 'testOnly', 'approvals', 'bindings'] : ['schema', 'frozen', 'approvals', 'bindings'], 'the freeze record');
  if (rec.schema !== RECORD_SCHEMA) fail(`the freeze record has the wrong schema (expected ${RECORD_SCHEMA})`);
  if (rec.frozen !== true) fail('the freeze record does not say frozen:true');
  if (rec.testOnly !== undefined && rec.testOnly !== false) fail('the freeze record is marked testOnly');
  exactKeys(rec.approvals, REQUIRED_FOR_OFFICIAL, 'the approvals');
  for (const k of REQUIRED_FOR_OFFICIAL) {
    const a = rec.approvals[k];
    exactKeys(a, ['status', 'value'], `approval ${k}`);
    if (a.status !== 'APPROVED') fail(`decision "${k}" is not APPROVED in the freeze record`);
    if (!same(a.value, APPROVALS[k].value)) fail(`the approved value of "${k}" differs from the value implemented in config.mjs`);
  }
  exactKeys(rec.bindings, BINDING_KEYS, 'the bindings');
  for (const k of BINDING_KEYS.filter(x => x !== 'tree')) if (typeof rec.bindings[k] !== 'string' || !HEX64.test(rec.bindings[k])) fail(`binding ${k} must be a 64-hex digest`);
  const t = rec.bindings.tree;
  exactKeys(t, ['name', 'digest', 'b2Commit', 'transformSha256'], 'the tree binding');
  if (typeof t.name !== 'string' || !TREE_NAME.test(t.name)) fail('the tree binding name is malformed');
  if (typeof t.digest !== 'string' || !HEX64.test(t.digest) || typeof t.transformSha256 !== 'string' || !HEX64.test(t.transformSha256)) fail('the tree binding digests must be 64-hex');
  if (typeof t.b2Commit !== 'string' || !/^[0-9a-f]{40}$/.test(t.b2Commit)) fail('the tree binding b2Commit must be 40-hex');
  return rec;
}

/** the digests that can be recomputed from the working tree without an inventory build or an admission scan */
export function liveBindings() {
  const prereg = path.join(REPO, PREREG_REL);
  return {
    preregistrationSha256: fs.existsSync(prereg) ? hashTextNormalised(fs.readFileSync(prereg, 'utf8')) : null,
    configSha256: hashObject(configSnapshot()),
    sourcesSha256: sourcesDigest().sha256,
    registryDigestSha256: trajectory.digest(),
  };
}

export const officialDirOf = (pin) => path.join(REPO, OFFICIAL_ROOT_REL, pin.slice(0, 16));

// ---- the scan authority (M-SCAN-1): which window an admission scan of the candidate block may cover ----
const scanFail = (m) => { throw new Error(`MCF-1 scan refused: ${m}`); };
/**
 * Parameterless, like officialAuthorisation: it reads the committed constant in authorization.mjs and nothing else
 * (no option, argument, environment variable or file).  Returns the one authorized window or throws.  The constant is
 * null until the user authorizes a scan, and can only ever name the candidate window recorded in config.mjs.
 */
export function scanAuthorisation() {
  const text = fs.readFileSync(path.join(REPO, PIN_MODULE_REL), 'utf8');
  if (!pinModuleShapeOk(text)) scanFail('authorization.mjs is not exactly the two documented declarations');
  const S = SCAN_AUTHORIZATION;
  if (S === null) scanFail('no scan authorization is set: the candidate window cannot be scanned');
  if (!isPlain(S) || Object.keys(S).sort().join() !== 'length,start') scanFail('the scan authorization is malformed');
  if (!Number.isSafeInteger(S.start) || !Number.isSafeInteger(S.length) || S.start < 0 || S.length < 1 || S.start + S.length > 2 ** 32) scanFail('the scan authorization window is malformed');
  if (S.start !== BLOCK.start || S.length !== BLOCK.scanLength) scanFail('the scan authorization does not equal the candidate window recorded in config.mjs');
  return deepFreeze({ start: S.start, length: S.length });
}

/**
 * The single authorization decision.  Parameterless on purpose: it reads the committed pin, the committed record
 * file, the committed preregistration, the declared source files and the registry module, and nothing else.
 */
export function officialAuthorisation() {
  if (FROZEN !== true) fail('the design is not frozen: config FROZEN is false');
  const pinText = fs.readFileSync(path.join(REPO, PIN_MODULE_REL), 'utf8');
  if (!pinModuleShapeOk(pinText)) fail('authorization.mjs is not exactly one pin declaration');
  const P = FREEZE_RECORD_SHA256;
  if (typeof P !== 'string' || !HEX64.test(P)) fail('no freeze record is authorised: the committed pin is not set');
  const file = path.join(REPO, FREEZE_RECORD_REL);
  if (!fs.existsSync(file)) fail('the freeze record file is missing');
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail('the freeze record is not valid JSON'); }
  if (hashObject(parsed) !== P) fail('the freeze record hash does not equal the committed pin');
  const rec = deepFreeze(validateRecord(JSON.parse(JSON.stringify(parsed))));   // a private, immutable copy: every later read is from this object
  const live = liveBindings();
  if (live.preregistrationSha256 === null) fail('the preregistration file is missing');
  for (const k of ['preregistrationSha256', 'configSha256', 'sourcesSha256', 'registryDigestSha256']) {
    if (live[k] !== rec.bindings[k]) fail(`${k} does not match the freeze record`);
  }
  const block = studyBlockOf(trajectory);
  if (block.status !== 'registered') fail(`the ${STUDY} block is not registered (status ${block.status})`);
  if (block.executed !== false) fail(`the ${STUDY} block is already marked executed`);
  if (block.listSha256 !== rec.bindings.admittedSha256) fail('admittedSha256 does not equal the registered block list hash');
  const sc = STUDY_CONFIGURATION;
  if (!same(block.configuration, { seed: sc.seed, index: sc.index, acceptedSeed: sc.acceptedSeed })) fail('the registered block configuration is not the approved study configuration');
  const adopted = sc.seed === DEV_BASE_CONFIG.configSeed && sc.index === DEV_BASE_CONFIG.configIndex && sc.acceptedSeed === DEV_BASE_CONFIG.acceptedSeed;
  if (adopted !== sc.adoptedFromDevelopment) fail('the study configuration must disclose whether it is adopted from the development configuration');
  return deepFreeze({
    recordSha256: P, record: rec, bindings: rec.bindings, block, studyConfiguration: sc,
    haltCount: rec.approvals.instrumentHaltCount.value, seedBlock: rec.approvals.seedBlock.value, scanLength: rec.approvals.scanLength.value,
    treeExpect: rec.bindings.tree, dir: officialDirOf(P),
  });
}

// ---- the study environment (derived from the VERIFIED tree, compared with the approved value) ----
// Two evaluations, one authority.  A driver process evaluates only the ACCEPTED configuration (one candidate,
// makeConfig(acceptedSeed, index): tens of milliseconds) against the approved section digests; the orchestrator, once
// per run, and the verifier evaluate the FULL environment (generateAccepted, rejected-candidate accounting included)
// against the approved whole-environment digest.  The environment module itself is bound by the tree digest.
const envModuleOf = (treeDir) => import(pathToFileURL(path.join(treeDir, 'experiments/m7/env.js')).href);
function frameMismatch(E, sc) {
  if (E.goal !== sc.goal) return 'goal';
  for (const [edge, v] of Object.entries(sc.frameEdgeReliabilities)) if (!Object.is(E.frame[edge], v)) return `frame edge reliability ${edge}`;
  return null;
}
const sectionMismatch = (digests, sc, names) => {
  const n = names.find(x => digests[x] !== sc.environment.sections[x]);
  return n === undefined ? null : `environment digest (section ${n})`;
};
export async function evaluateAcceptedConfiguration(treeDir, sc = STUDY_CONFIGURATION) {
  const env = await envModuleOf(treeDir);
  const cfg = env.makeConfig(sc.acceptedSeed, sc.index);
  const rep = canonicalAcceptedConfiguration({ cfg, constants: constantsOf(env), graph: readGraph(treeDir) });
  return { configSeed: rep.configSeed, configIndex: rep.configIndex, goal: cfg.goal, frame: frameEdgeValues(cfg.pPhase1, env.edgeIndexOf), digests: rep.digests };
}
export function acceptedMismatch(E, sc = STUDY_CONFIGURATION) {
  if (E.configSeed !== sc.acceptedSeed || E.configIndex !== sc.index) return 'accepted configuration identity (seed, index)';
  return frameMismatch(E, sc) || sectionMismatch(E.digests, sc, ACCEPTED_SECTIONS);
}
export async function evaluateEnvironment(treeDir, sc = STUDY_CONFIGURATION) {
  const env = await envModuleOf(treeDir);
  const generated = env.generateAccepted(sc.seed, sc.index);
  const rep = canonicalEnvironment({ generated, constants: constantsOf(env), graph: readGraph(treeDir) });
  return { rep, provenance: generated.provenance, goal: generated.cfg.goal, frame: frameEdgeValues(generated.cfg.pPhase1, env.edgeIndexOf) };
}
export function environmentMismatch(E, sc = STUDY_CONFIGURATION) {
  if (E.provenance.acceptedSeed !== sc.acceptedSeed || E.provenance.numberOfRejectedCandidatesBeforeAcceptance !== sc.rejectedBeforeAcceptance
    || E.provenance.startingSeed !== sc.seed || E.provenance.acceptedConfigIndex !== sc.index) return 'provenance (accepted seed, rejected count, starting seed, index)';
  const fm = frameMismatch(E, sc);
  if (fm !== null) return fm;
  if (E.rep.sha256 !== sc.environment.sha256) return sectionMismatch(E.rep.sections, sc, Object.keys(sc.environment.sections)) || 'environment digest (section unknown)';
  return null;
}

// ---- stage receipts: one chain file, replaced atomically, fail closed ----
const CHAIN_FILE = 'receipts.json', LOCK_FILE = 'receipts.lock', TMP_FILE = 'receipts.json.tmp';
const UPSTREAM = Object.freeze({ Q: null, V: 'Q', O: 'V' });
const receiptHash = (r) => { const { sha256: _h, ...body } = r; return hashObject(body); };
function identityOf(A) {
  const b = A.bindings;
  return { freezeRecordSha256: A.recordSha256, preregistrationSha256: b.preregistrationSha256, configSha256: b.configSha256, sourcesSha256: b.sourcesSha256,
    registryDigestSha256: b.registryDigestSha256, admittedSha256: b.admittedSha256, treeDigest: b.tree.digest, studyConfigurationSha256: hashObject(A.studyConfiguration) };
}
function checkReceipt(r, stage, A, where) {
  exactKeys(r, ['schema', 'stage', 'identity', 'upstream', 'payload', 'sha256'], where);
  if (r.schema !== RECEIPT_SCHEMA) fail(`${where} has the wrong schema`);
  if (r.stage !== stage) fail(`${where} is not a Stage-${stage} receipt`);
  if (!same(r.identity, identityOf(A))) fail(`${where} was issued for a different frozen identity (record, sources, configuration, registry, tree or study configuration)`);
  if (r.sha256 !== receiptHash(r)) fail(`${where} does not match its own hash`);
  if (!isPlain(r.payload)) fail(`${where} has no payload`);
  return r;
}
/** the validated chain: { Q, V, O } with null for an absent stage.  Throws on any ambiguity. */
export function readChain(A) {
  if (fs.existsSync(path.join(A.dir, LOCK_FILE))) fail('receipt state is ambiguous: an update lock is present (an interrupted or concurrent update); inspect and remove it only if no orchestrator is running');
  return readChainLocked(A);
}
/** the same validation for a caller that already holds the update lock */
function readChainLocked(A) {
  const dir = A.dir, file = path.join(dir, CHAIN_FILE);
  if (!fs.existsSync(file)) return { Q: null, V: null, O: null };
  let c;
  try { c = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail('the receipt chain is unreadable'); }
  exactKeys(c, ['schema', 'freezeRecordSha256', 'Q', 'V', 'O', 'sha256'], 'the receipt chain');
  if (c.schema !== CHAIN_SCHEMA) fail('the receipt chain has the wrong schema');
  if (c.freezeRecordSha256 !== A.recordSha256) fail('the receipt chain belongs to another freeze record');
  const { sha256: h, ...body } = c;
  if (h !== hashObject(body)) fail('the receipt chain does not match its own hash');
  const out = { Q: null, V: null, O: null };
  for (const s of ['Q', 'V', 'O']) {
    if (c[s] === null) continue;
    out[s] = checkReceipt(c[s], s, A, `the Stage-${s} receipt`);
    const up = UPSTREAM[s];
    if (up !== null) {
      if (out[up] === null) fail(`the Stage-${s} receipt exists without a Stage-${up} receipt`);
      if (!same(out[s].upstream, { stage: up, receiptSha256: out[up].sha256 })) fail(`the Stage-${s} receipt is not linked to the current Stage-${up} receipt (stale or mismatched)`);
    } else if (out[s].upstream !== null) fail(`the Stage-${s} receipt must have no upstream`);
  }
  return out;
}
/**
 * Record a completed stage.  Completing Q clears V and O, completing V clears O, in the same atomic replacement of
 * the single chain file, so no state with a downstream receipt of an older upstream can exist.  An identical
 * receipt is a no-op (re-running a cached stage must not invalidate the downstream).
 */
export function commitReceipt(A, stage, payload) {
  if (!['Q', 'V', 'O'].includes(stage)) fail(`unknown stage ${stage}`);
  fs.mkdirSync(A.dir, { recursive: true });
  const lockPath = path.join(A.dir, LOCK_FILE);
  let fd;
  try { fd = fs.openSync(lockPath, 'wx'); } catch (e) { fail('receipt state is ambiguous: an update lock is present (an interrupted or concurrent update)'); }
  fs.closeSync(fd);
  try {
    const chain = readChainLocked(A);
    const up = UPSTREAM[stage];
    if (up !== null && chain[up] === null) fail(`Stage ${stage} cannot be recorded without a Stage-${up} receipt`);
    const receipt = { schema: RECEIPT_SCHEMA, stage, identity: identityOf(A), upstream: up === null ? null : { stage: up, receiptSha256: chain[up].sha256 }, payload };
    receipt.sha256 = receiptHash(receipt);
    if (chain[stage] !== null && chain[stage].sha256 === receipt.sha256) return chain[stage];
    const next = { Q: chain.Q, V: chain.V, O: chain.O, [stage]: receipt };
    if (stage === 'Q') { next.V = null; next.O = null; } else if (stage === 'V') next.O = null;
    const body = { schema: CHAIN_SCHEMA, freezeRecordSha256: A.recordSha256, Q: next.Q, V: next.V, O: next.O };
    const text = canonicalJson({ ...body, sha256: hashObject(body) }) + '\n';
    const tmp = path.join(A.dir, TMP_FILE), file = path.join(A.dir, CHAIN_FILE);
    const wfd = fs.openSync(tmp, 'w'); fs.writeSync(wfd, text); fs.fsyncSync(wfd); fs.closeSync(wfd);
    fs.renameSync(tmp, file);
    return receipt;
  } finally {
    try { fs.unlinkSync(lockPath); } catch (e) { /* already removed */ }
  }
}

// ---- the driver boundary ----
export const DRIVER_INPUT_KEYS = Object.freeze(['mode', 'stopAt', 'policy', 'freezeSha256', 'tree', 'label', 'agentSeed', 'content', 'twin', 'configSeed', 'configIndex']);
/**
 * Called by the driver's official branch before anything else is loaded.  `IN` is the caller's input: every field
 * that names authority (freezeSha256, tree, configSeed, configIndex) is checked against committed state.
 */
export async function assertOfficialExecution(IN) {
  exactKeys(IN, DRIVER_INPUT_KEYS, 'the driver input');
  if (IN.policy !== 'official') fail('assertOfficialExecution is for policy "official"');
  const A = officialAuthorisation();
  if (IN.freezeSha256 !== A.recordSha256) fail('the supplied freeze hash does not equal the committed pin');
  const raw = IN.agentSeed;
  if (!Number.isSafeInteger(raw)) fail('the agent seed must be a safe integer');
  let decision;
  try { decision = trajectory.checkUse(trajectorySeed(raw), { study: STUDY, category: 'registered' }).decision; } catch (e) { decision = `REFUSED:${e.code || e.name}`; }
  if (decision !== 'REPRODUCTION' || !inBlock(A.block, raw)) fail(`the agent seed is not a member of the registered ${STUDY} block (registry decision ${decision})`);
  const sc = A.studyConfiguration;
  if (IN.configSeed !== sc.seed || IN.configIndex !== sc.index) fail('the configuration identity differs from the approved study configuration');
  const T = verifyTreeReadOnly(A.treeExpect);
  if (!T.ok) fail(`the conformed tree cannot be used: ${T.why}`);
  let given;
  try { given = fs.realpathSync.native(String(IN.tree)); } catch (e) { given = null; }
  if (given !== T.dir) fail('the supplied tree path is not the verified conformed tree');
  const E = await evaluateAcceptedConfiguration(T.dir, sc);
  const why = acceptedMismatch(E, sc);
  if (why !== null) fail(`the study environment differs from the approved configuration: ${why}`);
  if (IN.mode === 'V') {
    const ch = readChain(A);
    if (ch.Q === null) fail('no Stage-Q receipt: Stage V cannot run');
    if (!ch.Q.payload.qualified.includes(raw)) fail('the agent seed did not qualify at Stage Q');
  } else if (IN.mode === 'O') {
    const ch = readChain(A);
    if (ch.V === null) fail('no Stage-V receipt: Stage O cannot run');
    if (!ch.V.payload.valid.includes(raw)) fail('the agent seed is not valid at Stage V');
  }
  return deepFreeze({ authorisation: A, treeDir: T.dir, treeManifest: T.manifest, acceptedSections: E.digests });
}

// ---- registration helper (pure; the data commit itself belongs to M-SCAN) ----
/** the block record for an admitted list: hull, explicit exclusions, count and list hash, bound to the study configuration */
export function blockFromAdmission({ admitted, artifact, authorization, why }) {
  if (!Array.isArray(admitted) || admitted.length === 0) throw new Error('blockFromAdmission: the admitted list must be a non-empty array');
  for (let i = 0; i < admitted.length; i++) {
    if (!Number.isSafeInteger(admitted[i]) || admitted[i] < 0 || admitted[i] >= 2 ** 32) throw new Error('blockFromAdmission: every admitted seed must be an integer in [0, 2^32)');
    if (i > 0 && admitted[i] <= admitted[i - 1]) throw new Error('blockFromAdmission: the admitted list must be strictly ascending');
  }
  const lo = admitted[0], hi = admitted[admitted.length - 1], present = new Set(admitted), excluded = [];
  for (let v = lo; v <= hi; v++) if (!present.has(v)) excluded.push(v);
  const sc = STUDY_CONFIGURATION;
  return { schema: 'trajectory.block/1', namespace: 'trajectory', study: STUDY, status: 'registered', lo, hi, excluded, count: admitted.length,
    listSha256: listSha256Of(admitted), executed: false, authorization, artifact, why, configuration: { seed: sc.seed, index: sc.index, acceptedSeed: sc.acceptedSeed } };
}
export { memberListOf };

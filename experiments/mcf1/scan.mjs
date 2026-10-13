// ==========================================================
// MCF-1 — the non-executing admission stage, the scan authority gate and the candidate-block writer (M-SCAN-1)
// ==========================================================
// STRUCTURAL SEPARATION.  Admission is arithmetic over stream positions: it never runs an agent and never reads an
// outcome.  This module is therefore a LEAF with respect to execution: it imports configuration, the reservation
// inventory, the admission predicate, the lock (authority only) and the typed registry, and nothing else.  It does
// not import orchestrate.mjs (runPool, execDriver, child_process), driver.mjs, the H1-R runtime or measurement layer,
// the tree builder, the episode contents, the validity rules, the frame or the analysis.  orchestrate.mjs depends on
// this module (and re-exports stageInventory / stageAdmit), never the other way round; the verifier proves the import
// closure, a `child_process` trap and a filesystem-read recorder.  This is a property of the import graph, not a flag.
//
// AUTHORITY.  Which window may be scanned is decided by lock.scanAuthorisation(), which reads the committed
// SCAN_AUTHORIZATION constant (null until the user authorizes) and nothing else: no option, argument, environment
// variable or file.  Every argument that is not a documented key is refused by name.
//
//   policy "development"   an explicitly supplied window inside the exploratory development domain
//   policy "official"      the window approved in a pinned freeze record (needs officialAuthorisation)
//   policy "candidate"     the ONE window named by SCAN_AUTHORIZATION; takes no window and no inventory argument
//
// WRITER.  writeCandidateBlock validates an admission result completely (hashes, counts, exclusions, ordering,
// deterministic recomputation, registry conflicts) BEFORE any file exists, then writes one artifact atomically to a
// synthetic or development destination.  There is no code path in this milestone that writes the official registry
// module: the destination policy refuses everything outside experiments/mcf1/data and the OS temporary directory.
//
// Nothing here uses a clock or a random number.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STUDY, BLOCK, DEV_BLOCK, EXPOSURE, M32, STUDY_CONFIGURATION, canonicalJson, sha256, hashObject, seedPolicy } from './config.mjs';
import { buildInventory } from './inventory.mjs';
import { admitScan } from './admission.mjs';
import { officialAuthorisation, scanAuthorisation, blockFromAdmission, sourcesDigest } from './lock.mjs';
import { createTrajectoryRegistry, trajectory, trajectorySeed, memberListOf, listSha256Of } from '../registry/typed_v2.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const refuse = (m) => { throw new Error(`MCF-1 scan refused: ${m}`); };
const admitRefuse = (m) => { throw new Error(`MCF-1 admission refused: ${m}`); };

// ---------------- the admission stage ----------------
/** inventory (+ development variant) */
export function stageInventory({ policy }) {
  const exclude = policy === 'development' ? [DEV_BLOCK.id, ...EXPOSURE.map(e => e.id)] : [];
  return buildInventory({ exclude });
}

const ADMIT_KEYS = ['policy', 'start', 'length', 'inventory'];
/**
 * Admission.  `inventory` is an argument only for the development and official policies (the official path takes the
 * inventory the orchestrator already built and compared with the record); a candidate scan builds its own from
 * committed state and refuses one that is supplied.
 */
export function stageAdmit(args) {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) admitRefuse('the arguments must be an object');
  const extra = Object.keys(args).filter(k => !ADMIT_KEYS.includes(k));
  if (extra.length) admitRefuse(`unknown argument(s) ${extra.join(', ')} (no authorization, registry or option can be passed)`);
  const { policy, start, length, inventory } = args;
  if (policy === 'development') {
    for (const raw of [start, start + length - 1]) { const p = seedPolicy('development', raw); if (!p.ok) throw new Error(`MCF-1 admission refused: ${p.why}`); }
    return admitScan({ start, length, inventory, category: 'development' });
  }
  if (policy === 'official') {
    const A = officialAuthorisation();
    if (start !== A.seedBlock || length !== A.scanLength) throw new Error('MCF-1 admission refused: an official scan covers exactly the approved seed block and scan length');
    return admitScan({ start, length, inventory, category: 'registered' });
  }
  if (policy === 'candidate') {
    if (start !== undefined || length !== undefined || inventory !== undefined) refuse('a candidate scan takes no window and no inventory: both come from committed state');
    const S = scanAuthorisation();
    const inv = buildInventory({ exclude: [] });
    const out = admitScan({ start: S.start, length: S.length, inventory: inv, category: 'registered' });
    return { ...out, scan: { policy: 'candidate', start: S.start, length: S.length, inventorySha256: inv.sha256 } };
  }
  throw new Error(`MCF-1 admission refused: unknown policy ${policy}`);
}

// ---------------- destination policy ----------------
const ALLOWED_ROOTS = () => [path.join(REPO, 'experiments', 'mcf1', 'data'), os.tmpdir()];
const realOrSelf = (p) => { try { return fs.realpathSync.native(p); } catch (e) { return path.resolve(p); } };
const inside = (child, root) => { const r = path.relative(root, child); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
/** a synthetic or development directory only; the official registry module and the tracked tree are never a destination */
export function resolveDestination(dest) {
  if (typeof dest !== 'string' || dest.trim() === '') refuse('a destination directory is required');
  const abs = path.resolve(dest);
  // resolve through the nearest existing ancestor so a symlinked or ".."-laden path cannot escape the allowed roots
  let probe = abs, tail = '';
  while (!fs.existsSync(probe)) { const up = path.dirname(probe); if (up === probe) break; tail = path.join(path.basename(probe), tail); probe = up; }
  const resolved = path.join(realOrSelf(probe), tail);
  if (fs.existsSync(abs) && !fs.statSync(abs).isDirectory()) refuse('the destination is not a directory');
  const registryDir = realOrSelf(path.join(REPO, 'experiments', 'registry'));
  if (inside(resolved, registryDir)) refuse('the official registry directory is never a destination in this milestone');
  if (!ALLOWED_ROOTS().some(r => inside(resolved, realOrSelf(r)))) refuse('the destination must be inside experiments/mcf1/data or the temporary directory');
  return resolved;
}

// ---------------- the candidate block artifact ----------------
export const CANDIDATE_SCHEMA = 'mcf1.block-candidate/1';
const FILE_NAME = 'block_candidate.json';
const safeInt = (x) => Number.isSafeInteger(x);
const sameJson = (a, b) => canonicalJson(a) === canonicalJson(b);
const touchesCandidate = (start, length) => start < BLOCK.start + BLOCK.scanLength && start + length > BLOCK.start;

/** admission output shape and arithmetic: nothing is trusted from the object */
function checkAdmission(a) {
  if (a === null || typeof a !== 'object' || !a.summary || !Array.isArray(a.admitted) || !Array.isArray(a.rejected)) refuse('the admission result is malformed (summary, admitted and rejected are required)');
  const s = a.summary;
  if (s.schema !== 'mcf1.admission/1') refuse('the admission summary has the wrong schema');
  if (s.study !== STUDY) refuse(`the admission summary is for study ${s.study}, not ${STUDY}`);
  if (s.category !== 'registered') refuse(`only a "registered" admission can become a block (got ${s.category})`);
  if (!safeInt(s.start) || !safeInt(s.length) || s.length < 1 || s.start < 0 || s.start + s.length > M32) refuse('the admission window is malformed');
  if (s.lastRaw !== s.start + s.length - 1 || s.scanned !== s.length) refuse('the admission window arithmetic is inconsistent');
  const adm = a.admitted;
  if (adm.length === 0) refuse('an empty admitted list cannot become a block');
  for (let i = 0; i < adm.length; i++) {
    if (!safeInt(adm[i])) refuse('an admitted seed is not an integer');
    if (adm[i] < s.start || adm[i] >= s.start + s.length) refuse(`admitted seed ${adm[i]} lies outside the scanned window`);
    if (i > 0 && adm[i] <= adm[i - 1]) refuse('the admitted list must be strictly ascending (no duplicates)');
  }
  if (s.admitted !== adm.length) refuse('the summary admitted count does not equal the list length');
  if (s.rejected !== a.rejected.length) refuse('the summary rejected count does not equal the rejection list length');
  if (s.admitted + s.rejected !== s.scanned) refuse('admitted + rejected must equal the number scanned');
  const seen = new Set(adm);
  let prev = -1;
  for (const r of a.rejected) {
    if (r === null || typeof r !== 'object' || !safeInt(r.raw) || !Array.isArray(r.reasons) || r.reasons.length === 0) refuse('a rejection record is malformed');
    if (r.raw < s.start || r.raw >= s.start + s.length) refuse(`rejected seed ${r.raw} lies outside the scanned window`);
    if (r.raw <= prev) refuse('the rejection list must be strictly ascending');
    if (seen.has(r.raw)) refuse(`seed ${r.raw} is both admitted and rejected`);
    seen.add(r.raw); prev = r.raw;
  }
  if (seen.size !== s.scanned) refuse('every scanned seed must be accounted for exactly once (admitted or rejected)');
  if (s.admittedSha256 !== sha256(adm.join(','))) refuse('the admitted-list hash does not match the admitted list');
  if (a.sha256 !== sha256(canonicalJson(s))) refuse('the admission result hash does not match its summary');
  return s;
}

/**
 * Pure validation and construction.  `registryView` is { records, heldOut, authorizations, blocks } (default: the
 * committed registry).  Nothing is written.  Returns the artifact or throws.
 */
export function candidateArtifactOf({ admission, registryView }) {
  const s = checkAdmission(admission);
  // the candidate window needs the committed scan authorization AND must be exactly the authorized window
  if (touchesCandidate(s.start, s.length)) {
    const S = scanAuthorisation();
    if (s.start !== S.start || s.length !== S.length) refuse('a window overlapping the candidate block must equal the authorized scan window exactly');
  }
  // deterministic recomputation from committed state: the list is a function of (window, inventory, registry)
  const inv = buildInventory({ exclude: [] });
  const again = admitScan({ start: s.start, length: s.length, inventory: inv, category: 'registered' });
  if (again.sha256 !== admission.sha256 || !sameJson(again.admitted, admission.admitted)) refuse('the admission result is not reproduced by the committed predicate, inventory and registry');

  const reg = registryView || { records: trajectory.records, heldOut: trajectory.heldOut, authorizations: trajectory.authorizations, blocks: trajectory.blocks };
  if (reg.blocks.some(b => b.study === STUDY)) refuse(`the registry already holds a ${STUDY} block (one block per study)`);
  const base = { records: [...reg.records], heldOut: [...reg.heldOut], authorizations: [...reg.authorizations] };
  let before, after;
  const block = blockFromAdmission({ admitted: admission.admitted, artifact: `mcf1 admission summary sha256 ${admission.sha256}`,
    authorization: 'M-SCAN-1 synthetic or development candidate; not a registration', why: 'admitted list of a non-executing MCF-1 admission scan' });
  try { before = createTrajectoryRegistry({ ...base, blocks: [...reg.blocks] }); } catch (e) { refuse(`the existing registry is not consistent: ${e.message}`); }
  for (const v of admission.admitted) {
    let d;
    try { d = before.checkUse(trajectorySeed(v), { study: STUDY, category: 'registered' }).decision; } catch (e) { d = `REFUSED:${e.code || e.name}`; }
    if (d !== 'AVAILABLE') refuse(`member ${v} is not available in the registry (${d})`);
  }
  try { after = createTrajectoryRegistry({ ...base, blocks: [...reg.blocks, block] }); } catch (e) { refuse(`the block conflicts with the registry: ${e.message}`); }
  for (const v of admission.admitted) {
    const d = after.checkUse(trajectorySeed(v), { study: STUDY, category: 'registered' }).decision;
    if (d !== 'REPRODUCTION') refuse(`member ${v} does not decide REPRODUCTION once the block is registered (${d})`);
  }
  const body = {
    schema: CANDIDATE_SCHEMA, destinationKind: 'synthetic',
    admission: { sha256: admission.sha256, start: s.start, length: s.length, admitted: s.admitted, rejected: s.rejected, admittedSha256: s.admittedSha256, inventorySha256: s.inventorySha256, registrySha256: s.registrySha256 },
    block,
    registry: { digestBefore: before.digest(), digestAfter: after.digest(), blocksBefore: reg.blocks.length },
    identity: { studyConfigurationSha256: hashObject(STUDY_CONFIGURATION), sourcesSha256: sourcesDigest().sha256 },
  };
  return { ...body, sha256: sha256(canonicalJson(body)) };
}

const ARTIFACT_KEYS = ['schema', 'destinationKind', 'admission', 'block', 'registry', 'identity', 'sha256'];
const BLOCK_KEYS = ['schema', 'namespace', 'study', 'status', 'lo', 'hi', 'excluded', 'count', 'listSha256', 'executed', 'authorization', 'artifact', 'why', 'configuration'];
/**
 * Independent verification of an artifact: closed shape, own hash, and the block record re-derived from its own
 * hull/exclusions (count and list hash).  With `recompute`, also re-runs the committed admission predicate over the
 * recorded window and requires the identical list.
 */
export function verifyCandidateArtifact(a, { recompute = false } = {}) {
  if (a === null || typeof a !== 'object' || Array.isArray(a)) refuse('the artifact must be an object');
  if (Object.keys(a).sort().join() !== [...ARTIFACT_KEYS].sort().join()) refuse('the artifact has unexpected or missing keys');
  if (a.schema !== CANDIDATE_SCHEMA) refuse('the artifact has the wrong schema');
  if (a.destinationKind !== 'synthetic') refuse('only a synthetic or development artifact can be verified in this milestone');
  const { sha256: h, ...body } = a;
  if (h !== sha256(canonicalJson(body))) refuse('the artifact does not match its own hash');
  const b = a.block;
  if (b === null || typeof b !== 'object' || Object.keys(b).sort().join() !== [...BLOCK_KEYS].sort().join()) refuse('the block record has unexpected or missing keys');
  if (b.study !== STUDY || b.status !== 'registered' || b.executed !== false) refuse('the block record must be a registered, unexecuted MCF-1 block');
  const members = memberListOf(b);
  if (members.length !== b.count || members.length === 0) refuse('the block count does not match its hull and exclusions');
  if (b.listSha256 !== listSha256Of(members)) refuse('the block list hash does not match its members');
  if (a.admission.admittedSha256 !== b.listSha256 || a.admission.admitted !== b.count) refuse('the artifact admission and block disagree');
  if (!sameJson(b.configuration, { seed: STUDY_CONFIGURATION.seed, index: STUDY_CONFIGURATION.index, acceptedSeed: STUDY_CONFIGURATION.acceptedSeed })) refuse('the block configuration is not the study configuration');
  if (a.identity.studyConfigurationSha256 !== hashObject(STUDY_CONFIGURATION)) refuse('the artifact was produced for another study configuration');
  if (recompute) {
    const inv = buildInventory({ exclude: [] });
    const r = admitScan({ start: a.admission.start, length: a.admission.length, inventory: inv, category: 'registered' });
    if (r.summary.admittedSha256 !== b.listSha256 || r.sha256 !== a.admission.sha256) refuse('the recorded list is not reproduced by the committed admission predicate');
  }
  return true;
}

/** the module text a later, separately authorized commit would hold in experiments/registry/trajectory_blocks.js */
export function renderBlocksModule(blocks) {
  return `export const TRAJECTORY_BLOCKS = Object.freeze(${JSON.stringify(blocks, null, 2)});\n`;
}

// ---------------- the writer (synthetic or development destination only) ----------------
/**
 * Validate completely, then write one artifact atomically.  A refused or failed write leaves no block file; an
 * interrupted write leaves at most a temporary file and a lock, both of which make a later attempt refuse (fail
 * closed).  An existing artifact is never overwritten.
 */
export function writeCandidateBlock({ admission, destination, registryView }) {
  const dir = resolveDestination(destination);                      // destination policy first: nothing else may touch a refused path
  const artifact = candidateArtifactOf({ admission, registryView });
  verifyCandidateArtifact(artifact);
  const file = path.join(dir, FILE_NAME), tmp = `${file}.tmp`, lock = `${file}.lock`;
  if (fs.existsSync(file)) refuse('a candidate block already exists at this destination (never overwritten)');
  fs.mkdirSync(dir, { recursive: true });
  let fd;
  try { fd = fs.openSync(lock, 'wx'); } catch (e) { refuse('a write is in progress or was interrupted: the destination lock is present'); }
  fs.closeSync(fd);
  try {
    const text = `${canonicalJson(artifact)}\n`;
    const wfd = fs.openSync(tmp, 'w'); fs.writeSync(wfd, text); fs.fsyncSync(wfd); fs.closeSync(wfd);
    verifyCandidateArtifact(JSON.parse(fs.readFileSync(tmp, 'utf8')));        // what would become visible is re-verified byte for byte
    fs.renameSync(tmp, file);
    return { file, sha256: artifact.sha256, count: artifact.block.count };
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch (x) { /* nothing to clean */ }
    throw e;
  } finally {
    try { fs.unlinkSync(lock); } catch (e) { /* already removed */ }
  }
}

// ---------------- CLI ----------------
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) { const t = argv[i]; if (t.startsWith('--')) { a[t.slice(2)] = argv[i + 1]; i++; } else a._.push(t); }
  return a;
}
function writeArtifactFile(dir, name, obj) {
  fs.mkdirSync(dir, { recursive: true });
  const body = `${canonicalJson(obj)}\n`, file = path.join(dir, name);
  fs.writeFileSync(file, body); fs.writeFileSync(`${file}.sha256`, `${sha256(body)}\n`);
  return { file: name, sha256: sha256(body) };
}
function usage() {
  console.error('usage:\n  scan.mjs admit --policy development --start N --length N --out DIR\n  scan.mjs admit --policy candidate            (needs the committed scan authorization; takes no window)\n  scan.mjs write-block --admission FILE --dest DIR   (synthetic or development destination only)');
  process.exit(2);
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (cmd === 'admit') {
    const policy = args.policy;
    if (policy === 'candidate') {
      const named = ['start', 'length', 'out', 'inventory', 'authorization'].filter(k => args[k] !== undefined);
      if (named.length) { console.error(`MCF-1 scan refused: a candidate scan accepts no --${named.join(', --')} (the window comes from the committed authorization)`); process.exit(2); }
      const res = stageAdmit({ policy: 'candidate' });
      const out = resolveDestination(path.join(REPO, 'experiments', 'mcf1', 'data', 'scan', `${res.scan.start}-${res.scan.length}`));
      writeArtifactFile(out, 'admitted.json', { summary: res.summary, admitted: res.admitted, rejected: res.rejected, sha256: res.sha256 });
      console.log(JSON.stringify({ policy: 'candidate', out, admitted: res.admitted.length }));
      return;
    }
    if (policy === 'development') {
      if (!args.out) usage();
      const out = resolveDestination(args.out);
      const start = Number(args.start), length = Number(args.length);
      const res = stageAdmit({ policy: 'development', start, length, inventory: stageInventory({ policy: 'development' }) });
      writeArtifactFile(out, 'admitted.json', { summary: res.summary, admitted: res.admitted, rejected: res.rejected, sha256: res.sha256 });
      console.log(JSON.stringify({ policy: 'development', out, admitted: res.admitted.length }));
      return;
    }
    console.error(`MCF-1 scan refused: policy must be "development" or "candidate" (got ${policy})`);
    process.exit(2);
  }
  if (cmd === 'write-block') {
    if (!args.admission || !args.dest) usage();
    const admission = JSON.parse(fs.readFileSync(path.resolve(args.admission), 'utf8'));
    console.log(JSON.stringify(writeCandidateBlock({ admission, destination: args.dest })));
    return;
  }
  usage();
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((e) => { console.error(String(e && e.message ? e.message : e)); process.exit(1); });
}

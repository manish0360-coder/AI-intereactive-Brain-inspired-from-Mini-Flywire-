// ==========================================================
// MCF-1 R2 verification: the official-execution lock, receipt lineage, tree safety and environment identity
// ==========================================================
//   node experiments/mcf1/verify_r2.mjs
// Exit code 0 iff every gate passed AND every anti-vacuity mutant was caught.
//
// Method.  The real repository is never given an authorization, a record, a block or a pin.  Every authorised
// scenario runs in a WORLD: a temporary copy of the declared runtime closure with
//   * a synthetic one-block registry (seeds in a synthetic range, nothing real),
//   * a synthetic preregistration, a synthetic freeze record and its pin,
//   * the config's FROZEN flag and candidate window edited, and
//   * optionally one more uniquely-anchored source edit (a mutant, or a deliberate violation).
// No production option exists to build such a world; that is the point.  Positive controls stop at
// assertOfficialExecution returning, or at a marker inserted into the COPIED driver after its guards: this
// verifier never runs agent code under the official policy and never scans the candidate range.
// Negative cells assert the specific guard's message, so a removed guard is visible as a different outcome; the
// mutants prove that: each removes one guard and the named cells must then fail.
// ==========================================================
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as CFG from './config.mjs';
import * as LCK from './lock.mjs';
import * as ENVID from './envidentity.mjs';
import * as EPI from './episodes.mjs';
import { buildTree } from '../h1r/build_tree.mjs';
import { listSha256Of, createTrajectoryRegistry, trajectory, TRAJECTORY_RECORDS, TRAJECTORY_HELD_OUT, TRAJECTORY_AUTHORIZATIONS } from '../registry/typed_v2.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
const BASELINE = 'b9b2a988fb8dd8256cd721900054238ee5054e25';          // M-REG-1: the last commit before R2
let failed = 0, passed = 0, caught = 0, missed = 0;
const check = (gate, name, cond, detail = '') => { if (cond) passed++; else failed++; console.log(`${cond ? 'PASS' : 'FAIL'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const mutantResult = (gate, name, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'MUTANT-CAUGHT' : 'MUTANT-MISSED'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const H = (s) => crypto.createHash('sha256').update(s).digest('hex');
const url = (p) => pathToFileURL(p).href;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const refusal = async (fn) => { try { await fn(); return null; } catch (e) { return String(e && e.message ? e.message : e); } };
const TMPREAL = fs.realpathSync.native(os.tmpdir());
const ROOT = fs.mkdtempSync(path.join(TMPREAL, 'mcf1-r2-'));

// ---- the shared conformed tree: prepared ONCE here, in this single process (this verifier is not an official path) ----
const TREE = buildTree();
const TREE_BINDING = LCK.treeBindingFromManifest(TREE.dir);
const treeV = LCK.verifyTreeReadOnly(TREE_BINDING);
if (!treeV.ok) { console.error('verifier cannot proceed: the shared tree does not verify: ' + treeV.why); process.exit(1); }

// ---------------- worlds ----------------
const SYN = 1_650_000_000;                                           // synthetic range: not the candidate block, nothing real
const SYN_MEMBERS = [SYN, SYN + 1, SYN + 3, SYN + 4, SYN + 5];       // SYN + 2 is an excluded interior seed
const COPY_FILES = [...LCK.SOURCE_FILES, 'experiments/mcf1/authorization.mjs', 'experiments/registry/trajectory_blocks.js'];
const PIN_LINE = 'export const FREEZE_RECORD_SHA256 = null;';
let worldN = 0;

function applyEdit(root, [file, find, rep]) {
  const p = path.join(root, file), t = fs.readFileSync(p, 'utf8'), n = t.split(find).length - 1;
  if (n !== 1) throw new Error(`verifier defect: anchor matched ${n} times in ${file}: ${find.slice(0, 70)}`);
  fs.writeFileSync(p, t.replace(find, () => rep));
}
function copyWorldFiles(root, edits) {
  for (const rel of COPY_FILES) { const to = path.join(root, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(REPO, rel), to); }
  for (const e of edits) applyEdit(root, e);
}
const blocksModule = (blocks) => `export const TRAJECTORY_BLOCKS = Object.freeze(${JSON.stringify(blocks)});\n`;
function blockRecord(members, over = {}) {
  const lo = members[0], hi = members[members.length - 1], present = new Set(members), excluded = [];
  for (let v = lo; v <= hi; v++) if (!present.has(v)) excluded.push(v);
  return { schema: 'trajectory.block/1', namespace: 'trajectory', study: 'MCF-1', status: 'registered', lo, hi, excluded, count: members.length, listSha256: listSha256Of(members),
    executed: false, authorization: 'verification world only', artifact: 'none', why: 'synthetic block for the R2 verifier', configuration: { seed: 100000, index: 1, acceptedSeed: 100026 }, ...over };
}
const WORLD_EDITS = (frozen) => [
  ...(frozen ? [['experiments/mcf1/config.mjs', 'export const FROZEN = false;', 'export const FROZEN = true;']] : []),
  ['experiments/mcf1/config.mjs', '  start: 1_500_000_000,\n  scanLength: 4000,', `  start: ${SYN},\n  scanLength: 16,`],
];
let MUT_EDITS = [];                                                   // set by the mutant harness; merged into every world

async function makeWorld(o = {}) {
  const { frozen = true, authorised = true, members = SYN_MEMBERS, blocks = null, recordOver = null, pin = 'auto', prereg = 'MCF-1 synthetic preregistration (verifier world)\n',
    edits = [], after = null } = o;
  const all = [...WORLD_EDITS(frozen), ...edits, ...MUT_EDITS];
  const blockList = blocks === null ? [blockRecord(members)] : blocks;
  const stage = (root) => {
    copyWorldFiles(root, all);
    fs.writeFileSync(path.join(root, 'experiments/registry/trajectory_blocks.js'), blocksModule(authorised ? blockList : []));
    fs.mkdirSync(path.join(root, 'research/preregistrations'), { recursive: true });
    if (prereg !== null) fs.writeFileSync(path.join(root, LCK.PREREG_REL), prereg);
  };
  const root = path.join(ROOT, `w${++worldN}`);
  let record = null, pinValue = null;
  if (authorised) {
    const prep = path.join(ROOT, `p${worldN}`);
    stage(prep);
    const PL = await import(url(path.join(prep, 'experiments/mcf1/lock.mjs'))), PC = await import(url(path.join(prep, 'experiments/mcf1/config.mjs')));
    const live = PL.liveBindings();
    const mine = blockList.find(b => b.study === 'MCF-1');
    record = {
      schema: 'mcf1.freeze/2', frozen: true,
      approvals: Object.fromEntries(PC.REQUIRED_FOR_OFFICIAL.map(k => [k, { status: 'APPROVED', value: JSON.parse(JSON.stringify(PC.APPROVALS[k].value)) }])),
      bindings: { preregistrationSha256: live.preregistrationSha256 || H('no-prereg'), configSha256: live.configSha256, sourcesSha256: live.sourcesSha256, verifierSha256: H('verifier'),
        registryDigestSha256: live.registryDigestSha256, inventorySha256: H('inventory'), admittedSha256: mine ? mine.listSha256 : H('no-block'), tree: { ...TREE_BINDING } },
    };
    if (recordOver) record = recordOver(record) || record;
    pinValue = pin === 'auto' ? PC.hashObject(record) : pin;
  }
  stage(root);
  if (authorised) {
    fs.writeFileSync(path.join(root, LCK.FREEZE_RECORD_REL), JSON.stringify(record, null, 1));
    if (pinValue !== null) applyEdit(root, ['experiments/mcf1/authorization.mjs', PIN_LINE, `export const FREEZE_RECORD_SHA256 = '${pinValue}';`]);
  }
  if (after) await after(root, { pin: pinValue, record });
  const imp = (rel) => import(url(path.join(root, rel)));
  const w = {
    root, pin: pinValue, record, members, blocks: blockList,
    lock: () => imp('experiments/mcf1/lock.mjs'), config: () => imp('experiments/mcf1/config.mjs'), orc: () => imp('experiments/mcf1/orchestrate.mjs'),
    envid: () => imp('experiments/mcf1/envidentity.mjs'), inventory: () => imp('experiments/mcf1/inventory.mjs'), admission: () => imp('experiments/mcf1/admission.mjs'),
    input: (raw, mode = 'Q', over = {}) => ({ mode, stopAt: mode === 'O' ? 'attempt-hook' : 'decision', policy: 'official', freezeSha256: pinValue, tree: TREE.dir, label: `t|${raw}`, agentSeed: raw,
      content: 'C', twin: 'T9', configSeed: 100000, configIndex: 1, ...over }),
    spawn: (script, args, env = {}) => spawnSync(process.execPath, [path.join(root, script), ...args], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120000 }),
    driver: (input, env = {}) => spawnSync(process.execPath, [path.join(root, 'experiments/mcf1/driver.mjs'), JSON.stringify(input)], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120000 }),
    dir: () => path.join(root, LCK.OFFICIAL_ROOT_REL, String(pinValue).slice(0, 16)),
  };
  return w;
}
const mk = (o = {}) => makeWorld(o);

// ---------------- tests ----------------
const TESTS = new Map();
const def = (id, gate, desc, fn) => TESTS.set(id, { id, gate, desc, fn });
const res = (r) => (typeof r === 'boolean' ? { ok: r } : r);
const rx = (re, s) => re.test(s || '');

// ---- S: the shipped state (a copy with no pin, no record, no block) ----
def('s.refuse', 'R2-S', 'shipped state: every official entry refuses at its first guard (not frozen), whatever the input carries', async () => {
  const w = await mk({ authorised: false, frozen: false }), L = await w.lock();
  const a = await refusal(() => L.officialAuthorisation());
  const b = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { freezeSha256: 'f'.repeat(64) })));
  const c = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { freezeSha256: 'f'.repeat(64) , agentSeed: 1_100_000_000 })));
  return rx(/design is not frozen/, a) && rx(/design is not frozen/, b) && rx(/design is not frozen/, c) && L.officialAuthorisation.length === 0;
});
def('s.surface', 'R2-S', 'export surface: no pin, record or registry option exists; the old authority functions are gone; makeContext names every refused option', async () => {
  const w = await mk({ authorised: false, frozen: false }), C = await w.config(), L = await w.lock(), O = await w.orc();
  const removed = ['OFFICIAL_AUTHORIZATION', 'assertFreezeAuthorised', 'assertOfficialAllowed'].every(k => !(k in C));
  const opts = ['freeze', 'actual', 'authorization', 'registry', 'pinnedFreezeSha256', 'freezeSha256', 'exec'];
  const named = await Promise.all(opts.map(async k => rx(/accepts no option other than policy and concurrency/, await refusal(() => O.makeContext({ policy: 'official', [k]: {} })))));
  // a registry passed to the preflight is ignored: a permissive object that would approve everything changes nothing
  const fake = { checkUse: () => ({ decision: 'REPRODUCTION' }), blocks: [blockRecord([SYN])], records: [], heldOut: [], authorizations: [] };
  const pre = O.registryPreflight({ admitted: [SYN], registry: fake });
  const noRegistryParam = pre.ok === false && pre.counts.AVAILABLE === 1;
  return removed && named.every(Boolean) && noRegistryParam;
});
def('s.driver', 'R2-S', 'shipped state, real process: a direct official driver invocation is refused before anything is loaded, for no / short / fake / well-formed freeze hashes (a held-out config seed would catch a missing guard one step later)', async () => {
  const w = await mk({ authorised: false, frozen: false });
  const outs = ['f'.repeat(64), 'abc', null, H('anything')].map(h => w.driver(w.input(SYN, 'Q', { freezeSha256: h, configSeed: 900500 })));
  return outs.every(r => r.status !== 0 && /official stage refused: the design is not frozen/.test(r.stderr) && !/@@RESULT@@/.test(r.stdout) && !/config seed is held-out/.test(r.stderr));
});
def('s.cli', 'R2-S', 'shipped state, real process: the official CLI accepts no --freeze/--prereg/--out/--start/--length and creates nothing; without flags it refuses at the first guard', async () => {
  const w = await mk({ authorised: false, frozen: false });
  const outDir = path.join(w.root, 'cli_out');
  const flagged = w.spawn('experiments/mcf1/orchestrate.mjs', ['qualify', '--mode', 'official', '--freeze', 'x.json', '--prereg', 'p.md', '--out', outDir, '--start', '1', '--length', '2']);
  const bare = w.spawn('experiments/mcf1/orchestrate.mjs', ['qualify', '--mode', 'official']);
  return flagged.status !== 0 && /accepts no --freeze, --prereg, --out, --start, --length/.test(flagged.stderr) && !fs.existsSync(outDir)
    && bare.status !== 0 && /official stage refused: the design is not frozen/.test(bare.stderr);
});
def('s.admit', 'R2-S', 'shipped state: stageAdmit({policy:"official"}) and an unknown policy are refused before the inventory is touched (no mode scans the candidate range)', async () => {
  const w = await mk({ authorised: false, frozen: false }), O = await w.orc(), C = await w.config();
  const trap = { get classes() { throw new Error('TRAP: the inventory was touched'); }, get derived() { throw new Error('TRAP: the inventory was touched'); } };
  const a = await refusal(() => O.stageAdmit({ policy: 'official', start: C.BLOCK.start, length: C.BLOCK.scanLength, inventory: trap }));
  const b = await refusal(() => O.stageAdmit({ policy: 'scan', start: C.BLOCK.start, length: 1, inventory: trap }));
  const c = await refusal(() => O.stageAdmit({ policy: 'development', start: C.BLOCK.start, length: 1, inventory: trap }));
  return rx(/official stage refused/, a) && rx(/unknown policy/, b) && rx(/candidate confirmatory block is not authorised/, c);
});

// ---- R: record, pin, bindings, block ----
def('r.positive', 'R2-R', 'positive control: with a pinned record, matching digests and a registered block the authorization is granted and the driver check passes for a member seed (tree verified read-only, environment identical)', async () => {
  const w = await mk(), L = await w.lock();
  const A = L.officialAuthorisation();
  const out = await L.assertOfficialExecution(w.input(SYN, 'Q'));
  const interior = await L.assertOfficialExecution(w.input(SYN + 3, 'Q'));
  return A.recordSha256 === w.pin && A.block.study === 'MCF-1' && A.studyConfiguration.adoptedFromDevelopment === true && A.dir.endsWith(w.pin.slice(0, 16))
    && out.treeDir === TREE.dir && ENVID.ACCEPTED_SECTIONS.every(n => out.acceptedSections[n] === CFG.STUDY_CONFIGURATION.environment.sections[n]) && interior.treeDir === TREE.dir;
});
const RECORD_CELLS = [
  ['testOnly true', (r) => ({ ...r, testOnly: true }), /marked testOnly/],
  ['wrong schema', (r) => ({ ...r, schema: 'mcf1.freeze/1' }), /wrong schema/],
  ['frozen false', (r) => ({ ...r, frozen: false }), /does not say frozen:true/],
  ['extra top-level key', (r) => ({ ...r, extra: 1 }), /exactly the keys/],
  ['approval missing', (r) => { const a = { ...r.approvals }; delete a.v6Handling; return { ...r, approvals: a }; }, /exactly the keys/],
  ['approval not APPROVED', (r) => ({ ...r, approvals: { ...r.approvals, practicalThreshold: { status: 'UNDECIDED', value: 'none' } } }), /not APPROVED/],
  ['approval value differs from config', (r) => ({ ...r, approvals: { ...r.approvals, practicalThreshold: { status: 'APPROVED', value: 'p < 0.05' } } }), /differs from the value implemented/],
  ['approval value null', (r) => ({ ...r, approvals: { ...r.approvals, samplingDesign: { status: 'APPROVED', value: null } } }), /differs from the value implemented/],
  ['study configuration approval perturbed', (r) => { const v = JSON.parse(JSON.stringify(r.approvals.studyConfiguration.value)); v.frameEdgeReliabilities['9-12'] = 0.97; return { ...r, approvals: { ...r.approvals, studyConfiguration: { status: 'APPROVED', value: v } } }; }, /differs from the value implemented/],
  ['binding missing', (r) => { const b = { ...r.bindings }; delete b.sourcesSha256; return { ...r, bindings: b }; }, /exactly the keys/],
  ['binding not hex', (r) => ({ ...r, bindings: { ...r.bindings, configSha256: 'xyz' } }), /64-hex/],
  ['tree name malformed', (r) => ({ ...r, bindings: { ...r.bindings, tree: { ...r.bindings.tree, name: '../evil' } } }), /tree binding name is malformed/],
  ['tree commit short', (r) => ({ ...r, bindings: { ...r.bindings, tree: { ...r.bindings.tree, b2Commit: '707cb1e' } } }), /40-hex/],
];
def('r.record', 'R2-R', 'closed-schema record validation: every malformed or test-only record is refused by its own message even when pinned (13 cells); an explicit testOnly:false is accepted', async () => {
  const outs = [];
  for (const [name, fn, re] of RECORD_CELLS) { const w = await mk({ recordOver: fn }), L = await w.lock(); const m = await refusal(() => L.officialAuthorisation()); outs.push([name, rx(re, m), m]); }
  const wf = await mk({ recordOver: (r) => ({ ...r, testOnly: false }) }), Lf = await wf.lock();
  const okFalse = (await refusal(() => Lf.officialAuthorisation())) === null;
  const bad = outs.filter(o => !o[1]);
  return { ok: bad.length === 0 && okFalse, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});
def('r.pin', 'R2-R', 'the pin: a record not hashing to it, a missing or unparseable record file, a record edited after pinning and a pin module that is anything but one declaration are all refused', async () => {
  const L = async (w) => w.lock();
  const cells = [];
  const run = async (name, o, re) => { const w = await mk(o), l = await L(w); const m = await refusal(() => l.officialAuthorisation()); cells.push([name, rx(re, m), m]); };
  await run('pin of another record', { pin: 'f'.repeat(64) }, /does not equal the committed pin/);
  await run('pin null with a record present', { pin: null }, /pin is not set/);
  await run('record deleted', { after: (root) => fs.rmSync(path.join(root, LCK.FREEZE_RECORD_REL)) }, /record file is missing/);
  await run('record not JSON', { after: (root) => fs.writeFileSync(path.join(root, LCK.FREEZE_RECORD_REL), '{ not json') }, /not valid JSON/);
  await run('record edited after the pin', { after: (root) => { const p = path.join(root, LCK.FREEZE_RECORD_REL), r = JSON.parse(fs.readFileSync(p, 'utf8')); r.bindings.inventorySha256 = H('other'); fs.writeFileSync(p, JSON.stringify(r)); } }, /does not equal the committed pin/);
  const pinned = (root, extra, replaceDecl) => { const p = path.join(root, 'experiments/mcf1/authorization.mjs'); let t = fs.readFileSync(p, 'utf8'); if (replaceDecl) t = t.replace(/export const FREEZE_RECORD_SHA256 = .*;/, replaceDecl); fs.writeFileSync(p, t + extra); };
  await run('extra export in the pin module', { after: (root) => pinned(root, '\nexport const EXTRA = 1;\n') }, /not exactly one pin declaration/);
  await run('logic in the pin module', { after: (root, s) => pinned(root, '', `export const FREEZE_RECORD_SHA256 = (() => '${s.pin}')();`) }, /not exactly one pin declaration/);
  await run('import in the pin module', { after: (root) => pinned(root, '\nimport fs from "node:fs";\n') }, /not exactly one pin declaration/);
  await run('upper-case hex pin', { after: (root, s) => pinned(root, '', `export const FREEZE_RECORD_SHA256 = '${s.pin.toUpperCase()}';`) }, /not exactly one pin declaration/);
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});
def('r.bindings', 'R2-R', 'digest bindings: a changed preregistration, configuration, runtime source or registry content is refused by its own binding; a comment/whitespace edit of the block data and a CRLF conversion of a source file are not changes', async () => {
  const cells = [];
  const run = async (name, o, re) => { const w = await mk(o), l = await w.lock(); const m = await refusal(() => l.officialAuthorisation()); cells.push([name, re === null ? m === null : rx(re, m), m]); };
  const append = (file, text) => (root) => fs.appendFileSync(path.join(root, file), text);
  await run('preregistration edited', { after: append(LCK.PREREG_REL, 'edited\n') }, /preregistrationSha256 does not match/);
  await run('preregistration missing', { after: (root) => fs.rmSync(path.join(root, LCK.PREREG_REL)) }, /preregistration file is missing/);
  await run('configuration edited', { after: (root) => applyEdit(root, ['experiments/mcf1/config.mjs', 'reliable: 0.95', 'reliable: 0.96']) }, /configSha256 does not match/);
  await run('runtime source edited', { after: append('experiments/mcf1/frame.mjs', '\n// edited after the freeze\n') }, /sourcesSha256 does not match/);
  await run('driver edited', { after: append('experiments/mcf1/driver.mjs', '\n// edited after the freeze\n') }, /sourcesSha256 does not match/);
  await run('registry logic edited', { after: append('experiments/registry/typed_v2.js', '\n// edited after the freeze\n') }, /sourcesSha256 does not match/);
  await run('block data changed (semantic)', { after: (root) => applyEdit(root, ['experiments/registry/trajectory_blocks.js', 'synthetic block for the R2 verifier', 'a different reason']) }, /registryDigestSha256 does not match/);
  await run('block data comment/whitespace only', { after: append('experiments/registry/trajectory_blocks.js', '\n\n// a comment\n') }, null);
  await run('CRLF conversion of a source file', { after: (root) => { const p = path.join(root, 'experiments/mcf1/frame.mjs'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\r?\n/g, '\r\n')); } }, null);
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});
def('r.block', 'R2-R', 'study state: the design must be frozen; exactly one registered, unexecuted MCF-1 block whose list hash and configuration equal the record and the approved study configuration; adoption from development must be disclosed', async () => {
  const cells = [];
  const run = async (name, o, re) => { const w = await mk(o), l = await w.lock(); const m = await refusal(() => l.officialAuthorisation()); cells.push([name, rx(re, m), m]); };
  await run('config FROZEN false', { frozen: false }, /design is not frozen/);
  await run('no block registered', { blocks: [] }, /exactly one registered MCF-1 block is required \(found 0\)/);
  await run('block of another study', { blocks: [blockRecord(SYN_MEMBERS, { study: 'MCF-2' })] }, /exactly one registered MCF-1 block is required \(found 0\)/);
  await run('block status development', { blocks: [blockRecord(SYN_MEMBERS, { status: 'development' })] }, /not registered/);
  await run('block already executed', { blocks: [blockRecord(SYN_MEMBERS, { executed: true })] }, /already marked executed/);
  await run('admitted hash differs from the block', { recordOver: (r) => ({ ...r, bindings: { ...r.bindings, admittedSha256: H('other list') } }) }, /admittedSha256 does not equal the registered block list hash/);
  await run('block configuration differs', { blocks: [blockRecord(SYN_MEMBERS, { configuration: { seed: 100001, index: 1, acceptedSeed: 100027 } })] }, /block configuration is not the approved study configuration/);
  await run('adoption not disclosed', { edits: [['experiments/mcf1/config.mjs', 'adoptedFromDevelopment: true, adoptedFrom:', 'adoptedFromDevelopment: false, adoptedFrom:']] }, /must disclose whether it is adopted/);
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});

// ---- D: the driver boundary (function level, in an authorised world) ----
def('d.input', 'R2-D', 'driver input: exactly the documented keys; the freeze hash must equal the pin; the policy must be official; the seed a safe integer', async () => {
  const w = await mk(), L = await w.lock();
  const cells = [];
  const run = async (name, input, re) => { const m = await refusal(() => L.assertOfficialExecution(input)); cells.push([name, rx(re, m), m]); };
  const base = w.input(SYN);
  await run('unknown key', { ...base, registry: {} }, /exactly the keys/);
  await run('missing key', (() => { const b = { ...base }; delete b.tree; return b; })(), /exactly the keys/);
  await run('not an object', null, /plain object/);
  await run('policy development', { ...base, policy: 'development' }, /policy "official"/);
  await run('freeze hash absent', { ...base, freezeSha256: undefined }, /exactly the keys|does not equal the committed pin/);
  await run('freeze hash null', { ...base, freezeSha256: null }, /does not equal the committed pin/);
  await run('freeze hash short', { ...base, freezeSha256: w.pin.slice(0, 12) }, /does not equal the committed pin/);
  await run('freeze hash other', { ...base, freezeSha256: H('x') }, /does not equal the committed pin/);
  await run('seed a string', { ...base, agentSeed: String(SYN) }, /safe integer/);
  await run('seed fractional', { ...base, agentSeed: SYN + 0.5 }, /safe integer/);
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});
def('d.members', 'R2-D', 'seed membership: the block edges +-1, the excluded interior seed, a candidate-block seed, a development-domain seed, 0 and a held-out value are refused; every member (lo, interior, hi) passes the membership check', async () => {
  const w = await mk(), L = await w.lock();
  const non = [SYN - 1, SYN + 2, SYN + 6, 1_500_000_000, 1_500_000_001, 1_100_000_000, 0, 900500, 2 ** 32 - 1];
  const refused = [];
  for (const raw of non) refused.push(rx(/not a member of the registered MCF-1 block/, await refusal(() => L.assertOfficialExecution(w.input(raw)))));
  const allowed = [];
  for (const raw of [SYN, SYN + 1, SYN + 5]) allowed.push((await refusal(() => L.assertOfficialExecution(w.input(raw)))) === null);
  return { ok: refused.every(Boolean) && allowed.every(Boolean), detail: `refused ${refused.filter(Boolean).length}/${non.length}, allowed ${allowed.filter(Boolean).length}/3` };
});
def('d.config', 'R2-D', 'configuration identity: a different config seed, config index or type is refused; the evaluated environment must equal the approved one (frame edge and section are named)', async () => {
  const w = await mk(), L = await w.lock();
  const a = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { configSeed: 100001 })));
  const b = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { configIndex: 2 })));
  const c = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { configSeed: '100000' })));
  // the approved value says one thing, the verified tree's environment another: a perturbed reliability
  const e = await mk({ edits: [['experiments/mcf1/config.mjs', "'10-11': 0.31437050411477685", "'10-11': 0.3143705041147769"]] }), Le = await e.lock();
  const frame = await refusal(() => Le.assertOfficialExecution(e.input(SYN)));
  // and a perturbed whole-environment digest
  const d = await mk({ edits: [
    ['experiments/mcf1/config.mjs', "sha256: '76c141f8d5d4a1cb7a17ed42b5969e21e124dc90e93684aee5fbc24fd6a56257'", "sha256: '76c141f8d5d4a1cb7a17ed42b5969e21e124dc90e93684aee5fbc24fd6a56258'"],
    ['experiments/mcf1/config.mjs', "embedding: '78612ed05d0f77af2685ef6b5db7d86ba297ce24c1a3167dd6380c994a6a4698'", "embedding: '78612ed05d0f77af2685ef6b5db7d86ba297ce24c1a3167dd6380c994a6a4699'"]] }), Ld = await d.lock();
  const sec = await refusal(() => Ld.assertOfficialExecution(d.input(SYN)));
  const parts = { seed: rx(/configuration identity differs/, a), index: rx(/configuration identity differs/, b), type: rx(/configuration identity differs/, c),
    frame: rx(/study environment differs from the approved configuration: frame edge reliability 10-11/, frame), section: rx(/environment digest \(section embedding\)/, sec) };
  return { ok: Object.values(parts).every(Boolean), detail: JSON.stringify(parts) + ' frame=' + String(frame).slice(0, 170) + ' sec=' + String(sec).slice(0, 170) };
});
def('d.tree', 'R2-D', 'tree: a different directory, even a byte-identical copy, is not the verified tree; a record naming another tree digest is refused', async () => {
  const w = await mk(), L = await w.lock();
  const other = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { tree: TMPREAL })));
  const copyDir = path.join(ROOT, 'treecopy'); fs.cpSync(TREE.dir, copyDir, { recursive: true });
  const copy = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { tree: copyDir })));
  const missing = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'Q', { tree: path.join(ROOT, 'does-not-exist') })));
  const w2 = await mk({ recordOver: (r) => ({ ...r, bindings: { ...r.bindings, tree: { ...r.bindings.tree, digest: H('another tree') } } }) }), L2 = await w2.lock();
  const digest = await refusal(() => L2.assertOfficialExecution(w2.input(SYN)));
  fs.rmSync(copyDir, { recursive: true, force: true });
  return rx(/not the verified conformed tree/, other) && rx(/not the verified conformed tree/, copy) && rx(/not the verified conformed tree/, missing)
    && rx(/tree manifest digest differs from the frozen tree digest/, digest);
});
def('d.probe', 'R2-D', 'real process, copied driver stopped right after its guards: a member seed passes (control); non-members, a wrong hash, an unknown key, an unknown policy and a development input carrying a freeze hash do not', async () => {
  const w = await mk({ edits: [['experiments/mcf1/driver.mjs', 'if (IN.configSeed >= 900500 ||', "console.log('GUARDS_PASSED'); process.exit(0);\nif (IN.configSeed >= 900500 ||"]] });
  const pass = w.driver(w.input(SYN));
  const nonMember = w.driver(w.input(SYN + 2));
  const wrongHash = w.driver(w.input(SYN, 'Q', { freezeSha256: H('x') }));
  const unknownKey = w.driver({ ...w.input(SYN), extra: 1 });
  const badPolicy = w.driver(w.input(SYN, 'Q', { policy: 'Official' }));
  const devHash = w.driver({ ...w.input(1_100_000_000, 'Q', { policy: 'development' }), freezeSha256: w.pin });
  const refused = (r, re) => r.status !== 0 && re.test(r.stderr) && !/GUARDS_PASSED/.test(r.stdout) && !/@@RESULT@@/.test(r.stdout);
  return /GUARDS_PASSED/.test(pass.stdout) && pass.status === 0
    && refused(nonMember, /not a member of the registered MCF-1 block/) && refused(wrongHash, /does not equal the committed pin/) && refused(unknownKey, /unknown input field/)
    && refused(badPolicy, /unknown policy/) && refused(devHash, /development run cannot carry a freeze hash/);
});

// ---- T: tree safety (read-only verification, no rebuild, no race) ----
function withTmpdir(dir, fn) {
  const keys = ['TEMP', 'TMP', 'TMPDIR'], old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) process.env[k] = dir;
  try { return fn(); } finally { for (const k of keys) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } }
}
function sandboxTree(name) {
  const dir = path.join(ROOT, `sandbox_${name}`), base = path.join(dir, 'mfw-h1r'), dest = path.join(base, path.basename(TREE.dir));
  fs.mkdirSync(base, { recursive: true }); fs.cpSync(TREE.dir, dest, { recursive: true });
  return { tmp: dir, tree: dest };
}
const treeHash = (dir) => { const out = {}; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = H(fs.readFileSync(p)); } }; walk(dir); return H(JSON.stringify(out)); };
def('t.verify', 'R2-T', 'read-only tree verification rejects a missing tree, a corrupt file, a missing file entry, a changed identity, an unsafe manifest path and a wrong digest; an intact copy verifies', async () => {
  const w = await mk(), L = await w.lock();
  const exp = L.treeBindingFromManifest(TREE.dir);
  const cell = (name, mutate, re) => { const sb = sandboxTree(name); mutate(sb); const r = withTmpdir(sb.tmp, () => L.verifyTreeReadOnly(re.expect || exp)); return [name, re.ok ? r.ok : (!r.ok && re.re.test(r.why)), r.why]; };
  const rows = [];
  rows.push(cell('intact copy', () => {}, { ok: true }));
  rows.push(cell('missing tree', (sb) => fs.rmSync(sb.tree, { recursive: true }), { re: /tree is missing/ }));
  rows.push(cell('corrupt file', (sb) => { const f = path.join(sb.tree, 'main.js'); fs.appendFileSync(f, '\n// x'); }, { re: /corrupt tree file main\.js/ }));
  rows.push(cell('missing file', (sb) => fs.rmSync(path.join(sb.tree, 'main.js')), { re: /missing tree file main\.js/ }));
  rows.push(cell('manifest identity', (sb) => { const p = path.join(sb.tree, 'MANIFEST.json'), m = JSON.parse(fs.readFileSync(p, 'utf8')); m.b2Commit = 'f'.repeat(40); fs.writeFileSync(p, JSON.stringify(m)); }, { re: /identity differs/ }));
  rows.push(cell('manifest unreadable', (sb) => fs.writeFileSync(path.join(sb.tree, 'MANIFEST.json'), '{ nope'), { re: /unreadable/ }));
  rows.push(cell('manifest entry removed', (sb) => { const p = path.join(sb.tree, 'MANIFEST.json'), m = JSON.parse(fs.readFileSync(p, 'utf8')); delete m.files['main.js']; fs.writeFileSync(p, JSON.stringify(m)); }, { re: /manifest digest differs/ }));
  rows.push(cell('unsafe path with a matching digest', (sb) => {
    const p = path.join(sb.tree, 'MANIFEST.json'), m = JSON.parse(fs.readFileSync(p, 'utf8')); m.files['../evil.js'] = H('x'); fs.writeFileSync(p, JSON.stringify(m));
  }, { re: /unsafe path/, expect: (() => { const m = JSON.parse(fs.readFileSync(path.join(TREE.dir, 'MANIFEST.json'), 'utf8')); m.files['../evil.js'] = H('x'); return { ...exp, digest: H(CFG.canonicalJson(m.files)) }; })() }));
  const bad = rows.filter(r => !r[1]);
  return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});
def('t.never_repairs', 'R2-T', 'the official path never repairs a tree: with a corrupt tree in the temporary root, makeContext and the driver guard refuse AND the corrupt bytes, the directory and the file set are exactly as they were', async () => {
  const w = await mk(), L = await w.lock(), O = await w.orc();
  const sb = sandboxTree('norepair');
  fs.appendFileSync(path.join(sb.tree, 'main.js'), '\n// corrupt');
  const before = treeHash(sb.tree);
  const calls = [];
  const names = ['rmSync', 'rmdirSync', 'rm', 'unlinkSync', 'renameSync', 'writeFileSync', 'appendFileSync', 'mkdirSync', 'copyFileSync', 'cpSync', 'truncateSync', 'symlinkSync'];
  const orig = {}; for (const n of names) { orig[n] = fs[n]; fs[n] = (...a) => { calls.push(`${n}:${String(a[0]).slice(-40)}`); throw new Error(`TRAP: fs.${n} on the official path`); }; }
  let a, b, c;
  try {
    a = withTmpdir(sb.tmp, () => { try { O.makeContext({ policy: 'official' }); return null; } catch (e) { return String(e.message); } });
    b = await withTmpdir(sb.tmp, async () => { try { await L.assertOfficialExecution(w.input(SYN)); return null; } catch (e) { return String(e.message); } });
    c = withTmpdir(sb.tmp, () => L.verifyTreeReadOnly(L.treeBindingFromManifest(TREE.dir)));
  } finally { for (const n of names) fs[n] = orig[n]; }
  // a spawned driver with the same corrupt temporary root: also refused, also nothing changed
  const r = w.driver(w.input(SYN), { TEMP: sb.tmp, TMP: sb.tmp, TMPDIR: sb.tmp });
  const after = treeHash(sb.tree);
  return rx(/conformed tree cannot be used: corrupt tree file main\.js/, a) && rx(/conformed tree cannot be used: corrupt tree file main\.js/, b) && c.ok === false
    && calls.length === 0 && before === after && r.status !== 0 && /corrupt tree file main\.js/.test(r.stderr) && fs.existsSync(sb.tree);
});
def('t.concurrent', 'R2-T', 'concurrency: ten concurrent driver-boundary checks against the real tree and six concurrent real driver processes against a corrupt one perform no filesystem mutation and leave the tree identical', async () => {
  const w = await mk(), L = await w.lock();
  const names = ['rmSync', 'rmdirSync', 'rm', 'unlinkSync', 'renameSync', 'writeFileSync', 'appendFileSync', 'mkdirSync', 'copyFileSync', 'cpSync', 'truncateSync'];
  const before = treeHash(TREE.dir), calls = [], orig = {};
  for (const n of names) { orig[n] = fs[n]; fs[n] = (...a) => { calls.push(n); throw new Error(`TRAP: fs.${n}`); }; }
  let results;
  try { results = await Promise.all(Array.from({ length: 10 }, (_, i) => L.assertOfficialExecution(w.input(SYN + (i % 2 === 0 ? 0 : 1))).then(() => 'ok', (e) => `ERR ${e.message}`))); }
  finally { for (const n of names) fs[n] = orig[n]; }
  const sb = sandboxTree('concurrent'); fs.appendFileSync(path.join(sb.tree, 'main.js'), '\n// corrupt');
  const corruptBefore = treeHash(sb.tree);
  const runOne = () => new Promise((resolve) => {
    const cp = spawn(process.execPath, [path.join(w.root, 'experiments/mcf1/driver.mjs'), JSON.stringify(w.input(SYN))], { env: { ...process.env, TEMP: sb.tmp, TMP: sb.tmp, TMPDIR: sb.tmp } });
    let out = '', err = '';
    cp.stdout.on('data', d => { out += d; }); cp.stderr.on('data', d => { err += d; });
    cp.on('close', (status) => resolve({ status, stdout: out, stderr: err }));
  });
  const procs = await Promise.all(Array.from({ length: 6 }, runOne));
  return results.every(r => r === 'ok') && calls.length === 0 && treeHash(TREE.dir) === before
    && procs.every(p => p.status !== 0 && /corrupt tree file main\.js/.test(p.stderr)) && treeHash(sb.tree) === corruptBefore;
});

// ---- C: receipt chain ----
const hexOf = (s) => H(s);
def('c.lineage', 'R2-C', 'receipt lineage: Q -> V -> O link by hash; Stage V needs a Q receipt that lists the seed, Stage O a V receipt (linked to the current Q) that lists it; missing, unlisted and out-of-order stages are refused by name', async () => {
  const w = await mk(), L = await w.lock(), A = L.officialAuthorisation();
  const noQ = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'V')));
  const noV = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'O')));
  const q = L.commitReceipt(A, 'Q', { qualified: [SYN, SYN + 1], qualifiedSha256: hexOf('q') });
  const vOk = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'V')));
  const vUnlisted = await refusal(() => L.assertOfficialExecution(w.input(SYN + 3, 'V')));
  const oStill = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'O')));
  const v = L.commitReceipt(A, 'V', { valid: [SYN], validSha256: hexOf('v'), manifestSha256: hexOf('m'), qualifiedSha256: hexOf('q') });
  const oOk = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'O')));
  const oUnlisted = await refusal(() => L.assertOfficialExecution(w.input(SYN + 1, 'O')));
  const chain = L.readChain(A);
  return rx(/no Stage-Q receipt/, noQ) && rx(/no Stage-V receipt/, noV) && vOk === null && rx(/did not qualify at Stage Q/, vUnlisted) && rx(/no Stage-V receipt/, oStill)
    && oOk === null && rx(/not valid at Stage V/, oUnlisted) && chain.V.upstream.receiptSha256 === q.sha256 && chain.Q.sha256 === q.sha256 && chain.V.sha256 === v.sha256 && chain.Q.upstream === null;
});
def('c.invalidate', 'R2-C', 'a completed Q clears V and O in the same atomic replacement; a completed V clears O; an identical re-commit changes nothing; an out-of-order commit is refused', async () => {
  const w = await mk(), L = await w.lock(), A = L.officialAuthorisation();
  const Q1 = { qualified: [SYN, SYN + 1], qualifiedSha256: hexOf('q1') }, V1 = { valid: [SYN], validSha256: hexOf('v1'), manifestSha256: hexOf('m1'), qualifiedSha256: hexOf('q1') }, O1 = { manifestSha256: hexOf('o1') };
  const noUp = await refusal(() => L.commitReceipt(A, 'V', V1));
  const q = L.commitReceipt(A, 'Q', Q1); L.commitReceipt(A, 'V', V1); L.commitReceipt(A, 'O', O1);
  const full = L.readChain(A);
  const again = L.commitReceipt(A, 'Q', Q1);                                   // identical content: a no-op
  const kept = L.readChain(A);
  const q2 = L.commitReceipt(A, 'Q', { qualified: [SYN], qualifiedSha256: hexOf('q2') });
  const afterQ = L.readChain(A);
  const oNow = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'O')));
  const vNow = await refusal(() => L.assertOfficialExecution(w.input(SYN, 'V')));
  L.commitReceipt(A, 'V', { ...V1, valid: [SYN] }); L.commitReceipt(A, 'O', O1);
  L.commitReceipt(A, 'V', { ...V1, validSha256: hexOf('v2'), valid: [SYN] });   // a different V receipt clears O
  const afterV = L.readChain(A);
  return rx(/cannot be recorded without a Stage-Q receipt/, noUp) && full.Q && full.V && full.O && again.sha256 === q.sha256 && kept.V !== null && kept.O !== null
    && afterQ.Q.sha256 === q2.sha256 && afterQ.V === null && afterQ.O === null && rx(/no Stage-V receipt/, oNow) && vNow === null && afterV.V !== null && afterV.O === null;
});
def('c.stale', 'R2-C', 'stale and mismatched receipts are refused even though every file exists and every own hash is valid: a V receipt linked to an older Q, a receipt for another registry digest, another freeze record, a tampered or truncated chain', async () => {
  const w = await mk(), L = await w.lock(), A = L.officialAuthorisation(), C = await w.config();
  const file = path.join(w.dir(), 'receipts.json');
  const write = (o) => fs.writeFileSync(file, JSON.stringify(o));
  const rehashChain = (c) => { const { sha256: _s, ...b } = c; return { ...b, sha256: C.hashObject(b) }; };
  const rehashReceipt = (r) => { const { sha256: _s, ...b } = r; return { ...b, sha256: C.hashObject(b) }; };
  L.commitReceipt(A, 'Q', { qualified: [SYN], qualifiedSha256: hexOf('q') });
  L.commitReceipt(A, 'V', { valid: [SYN], validSha256: hexOf('v'), manifestSha256: hexOf('m'), qualifiedSha256: hexOf('q') });
  const good = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cells = [];
  const run = async (name, mutate, re) => { write(rehashChain(mutate(JSON.parse(JSON.stringify(good))))); const m = await refusal(() => L.readChain(A)); cells.push([name, rx(re, m), m]); };
  await run('V linked to an older Q', (c) => { c.Q = rehashReceipt({ ...c.Q, payload: { ...c.Q.payload, qualifiedSha256: hexOf('newer') } }); return c; }, /not linked to the current Stage-Q receipt/);
  await run('receipt of another registry digest', (c) => { c.Q = rehashReceipt({ ...c.Q, identity: { ...c.Q.identity, registryDigestSha256: hexOf('other registry') } }); c.V = rehashReceipt({ ...c.V, upstream: { stage: 'Q', receiptSha256: c.Q.sha256 } }); return c; }, /different frozen identity/);
  await run('receipt of another freeze record', (c) => { c.Q = rehashReceipt({ ...c.Q, identity: { ...c.Q.identity, freezeRecordSha256: hexOf('another pin') } }); return c; }, /different frozen identity/);
  await run('receipt of other sources', (c) => { c.V = rehashReceipt({ ...c.V, identity: { ...c.V.identity, sourcesSha256: hexOf('other sources') } }); return c; }, /different frozen identity/);
  await run('V without Q', (c) => { c.Q = null; return c; }, /exists without a Stage-Q receipt/);
  await run('chain of another freeze record', (c) => { c.freezeRecordSha256 = hexOf('other'); return c; }, /belongs to another freeze record/);
  await run('wrong stage label', (c) => { c.V = rehashReceipt({ ...c.V, stage: 'O' }); return c; }, /not a Stage-V receipt/);
  // each integrity layer on its own: a receipt whose body no longer matches its hash inside a chain that is re-hashed
  // consistently, and a chain whose own hash is wrong around intact receipts
  await run('receipt payload edited, chain re-hashed (stale receipt hash)', (c) => { c.Q = { ...c.Q, payload: { ...c.Q.payload, qualified: [SYN, SYN + 1, SYN + 3] } }; return c; }, /Stage-Q receipt does not match its own hash/);
  { const w1 = JSON.parse(JSON.stringify(good)); w1.sha256 = H('wrong chain hash'); write(w1); const m = await refusal(() => L.readChain(A)); cells.push(['chain hash wrong, receipts intact', rx(/receipt chain does not match its own hash/, m), m]); }
  // edits without re-hashing, truncation, garbage
  const raw = fs.readFileSync(file, 'utf8');
  const edited = JSON.parse(JSON.stringify(good)); edited.Q.payload.qualified = [SYN, SYN + 1, SYN + 3]; fs.writeFileSync(file, JSON.stringify(edited));
  cells.push(['payload edited without any re-hash', rx(/does not match its own hash/, await refusal(() => L.readChain(A)))]);
  fs.writeFileSync(file, JSON.stringify(good).slice(0, 60)); cells.push(['truncated chain', rx(/unreadable/, await refusal(() => L.readChain(A)))]);
  fs.writeFileSync(file, 'garbage'); cells.push(['garbage chain', rx(/unreadable/, await refusal(() => L.readChain(A)))]);
  fs.writeFileSync(file, JSON.stringify({ ...good, extra: 1 })); cells.push(['extra key', rx(/exactly the keys/, await refusal(() => L.readChain(A)))]);
  // a chain copied from another freeze record's directory
  const w2 = await mk({ prereg: 'a second synthetic preregistration\n' }), L2 = await w2.lock(), A2 = L2.officialAuthorisation();
  fs.mkdirSync(w2.dir(), { recursive: true }); fs.writeFileSync(path.join(w2.dir(), 'receipts.json'), raw);
  cells.push(['chain reused from another freeze identity', rx(/belongs to another freeze record|different frozen identity/, await refusal(() => L2.readChain(A2)))]);
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2] || ''}`).join(' | ') };
});
def('c.interrupt', 'R2-C', 'interrupted updates fail closed: a crash before the rename leaves the old chain and a lock (readers refuse until it is removed), a crash after it leaves the new chain and a lock; a held lock refuses a second writer without removing it', async () => {
  const mkCrash = async (find, rep) => mk({ edits: [['experiments/mcf1/lock.mjs', find, rep]] });
  const runChild = (w, stage, payload) => spawnSync(process.execPath, ['--input-type=module', '-e',
    `const L = await import(${JSON.stringify(url(path.join(w.root, 'experiments/mcf1/lock.mjs')))}); const A = L.officialAuthorisation(); L.commitReceipt(A, ${JSON.stringify(stage)}, ${JSON.stringify(payload)});`], { encoding: 'utf8' });
  const cells = [];
  // (1) crash before the rename
  const w1 = await mkCrash('    fs.renameSync(tmp, file);', '    process.exit(97);');
  let L1 = await w1.lock(); let A1 = L1.officialAuthorisation();
  const r0 = runChild(w1, 'Q', { qualified: [SYN], qualifiedSha256: hexOf('q0') });                // crashes: nothing committed yet
  const dir1 = w1.dir();
  const lockPresent = fs.existsSync(path.join(dir1, 'receipts.lock')), tmpPresent = fs.existsSync(path.join(dir1, 'receipts.json.tmp')), noChain = !fs.existsSync(path.join(dir1, 'receipts.json'));
  const readerRefuses = rx(/ambiguous/, await refusal(() => L1.readChain(A1)));
  const driverRefuses = rx(/ambiguous/, await refusal(() => L1.assertOfficialExecution(w1.input(SYN, 'V'))));
  fs.rmSync(path.join(dir1, 'receipts.lock')); fs.rmSync(path.join(dir1, 'receipts.json.tmp'));
  const afterClear = L1.readChain(A1);
  cells.push(['crash before rename', r0.status === 97 && lockPresent && tmpPresent && noChain && readerRefuses && driverRefuses && afterClear.Q === null && afterClear.V === null]);
  // (2) a lock held by someone else: a second writer is refused and does not remove the foreign lock (clean world: no crash edit)
  const wc = await mk(); const Lc = await wc.lock(), Ac = Lc.officialAuthorisation();
  fs.mkdirSync(wc.dir(), { recursive: true }); fs.writeFileSync(path.join(wc.dir(), 'receipts.lock'), 'held by another process');
  const second = rx(/ambiguous/, await refusal(() => Lc.commitReceipt(Ac, 'Q', { qualified: [SYN], qualifiedSha256: hexOf('q') })));
  const foreign = fs.existsSync(path.join(wc.dir(), 'receipts.lock')) && fs.readFileSync(path.join(wc.dir(), 'receipts.lock'), 'utf8') === 'held by another process' && !fs.existsSync(path.join(wc.dir(), 'receipts.json'));
  cells.push(['second writer refused, foreign lock untouched', second && foreign]);
  // (3) crash after the rename
  const w4 = await mkCrash('    return receipt;\n', '    process.exit(98);\n');
  const L4 = await w4.lock(), A4 = L4.officialAuthorisation();
  const r4 = runChild(w4, 'Q', { qualified: [SYN], qualifiedSha256: hexOf('qc') });
  const lock4 = fs.existsSync(path.join(w4.dir(), 'receipts.lock')), chain4 = fs.existsSync(path.join(w4.dir(), 'receipts.json'));
  const refuse4 = rx(/ambiguous/, await refusal(() => L4.readChain(A4)));
  fs.rmSync(path.join(w4.dir(), 'receipts.lock'));
  const q4 = L4.readChain(A4).Q;
  cells.push(['crash after rename', r4.status === 98 && lock4 && chain4 && refuse4 && q4 !== null && q4.payload.qualifiedSha256 === hexOf('qc')]);
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0, detail: bad.map(b => b[0]).join(' | ') };
});

// ---- H: stage functions (prepare / finalize, no spawn) ----
const ident = (ctx) => ctx.expectedIdentity;
function synthRun({ raw, content, twin, stage, ctx }) {
  const x = content === 'C' ? 9 : content === 'M9' ? 9 : 11, isO = stage === 'O', ok = x === (twin === 'T9' ? 9 : 11) ? 1 : 0;
  return {
    label: `${stage}|${isO ? 'attempt-hook|' : ''}${raw}|${content}|${twin}`, mode: stage, stopAt: isO ? 'attempt-hook' : 'decision', outcome: { abortedBySentinel: true, error: null },
    calls: 1, startNode: 10, chosen: x, brainHash: EPI.REGISTERED_BRAIN_HASHES[content], installedP: {},
    step0: [6, 9, 11, 13].map(k => ({ key: k, returned: k === x ? 4.2 : 3, w: 2, applied: 1, arb: [], unc: 0.75, selfLoop: 0, F: k === x ? 4.2 : 3, trustTerm: 0 })),
    decisions: [[0, x]], bests: [[0, 0, x, 4]], replays: [], attempts: isO ? [[0, 10, x, ok]] : [],
    legality: { candidatesAreEdges: [true, true, true, true], executedIsEdge: true, executedLegalMove: true },
    h1r: { on: true, blockedIllegal: 0, drawFaults: 0, envDrawsSeen: isO ? 1 : 0, edgeAttempts: 0, noDecision: 0, slips: 0, realised: 0 },
    artifacts: { cogDraws: 653, visDraws: 3020, envCounters: { attempts: 0, successes: 0, slips: 0, envDraws: isO ? 1 : 0 } },
    executedEdgeP: isO ? (ok ? 1 : 0) : null,
    tree: { name: 'synthetic', manifestSha256: ident(ctx).manifestSha256, b2Commit: ident(ctx).b2Commit, transformSha256: 'x' },
    probes: [{ phase: 'call0-start', calls: 1, episodes: content === 'C' ? [] : [{ id: `syn_${content}`, nodes: CFG.FRAME.routes[content === 'M9' ? 9 : 11].slice(), hasActiveGoal: false }], embeddingSha: 'e'.repeat(64) },
      { phase: 'at-decision', calls: 1, Q: { size: 0, sum: 0 }, transitions: { outer: 0, entries: 0 }, rewards: 0, penalties: 0, confidenceMap: 0, pathAttempts: 0, pathSuccesses: 0 }],
  };
}
const synthRecs = (inputs, stage, ctx) => inputs.map(i => synthRun({ raw: i.agentSeed, content: i.content, twin: i.twin, stage, ctx }));
def('h.context', 'R2-H', 'official context: made only by makeContext from committed state; it carries the verified tree, the pin and the approved configuration; forged, spread and prototype-derived contexts are refused by every stage step', async () => {
  const w = await mk(), O = await w.orc();
  const ctx = O.makeContext({ policy: 'official' });
  const forged = [{ ...ctx }, Object.create(ctx), { policy: 'official' }, JSON.parse(JSON.stringify({ policy: 'official', auth: ctx.auth }))];
  const refused = [];
  for (const f of forged) refused.push(rx(/official context must be created by makeContext|no valid context/, await refusal(() => O.prepareQ({ seeds: w.members, ctx: f, exec: undefined }))));
  for (const f of forged) refused.push(rx(/official context must be created by makeContext|no valid context/, await refusal(() => O.finalizeQ({ seeds: [], recs: [], ctx: f }))));
  return { ok: ctx.policy === 'official' && ctx.treeDir === TREE.dir && ctx.freezeSha256 === w.pin && same(ctx.study, CFG.STUDY_CONFIGURATION) && refused.every(Boolean), detail: `refused ${refused.map(Boolean).join(',')}` };
});
def('h.options', 'R2-H', 'official stages take no override: an executor, a registry decision function, an admitted set (including an empty one) or a halt count (including null and the approved value) is refused before anything is run', async () => {
  const w = await mk(), O = await w.orc();
  const ctx = O.makeContext({ policy: 'official' });
  const cells = [];
  const run = async (name, fn, re) => { const m = await refusal(fn); cells.push([name, rx(re, m), m]); };
  const seeds = w.members, noop = async () => ({});
  await run('Q executor', () => O.prepareQ({ seeds, ctx, exec: noop }), /no executor override/);
  await run('V executor', () => O.prepareV({ qualified: seeds, ctx, exec: noop }), /no executor override/);
  await run('V registryOf', () => O.prepareV({ qualified: seeds, ctx, registryOf: () => 'REPRODUCTION' }), /no registry decision override/);
  await run('V admittedSet', () => O.prepareV({ qualified: seeds, ctx, admittedSet: new Set() }), /no admitted-set override/);
  await run('runPool executor', () => O.runPool([{ policy: 'official', label: 'x' }], ctx, null, noop), /no executor override/);
  await run('runPool official input with a development context', () => O.runPool([{ policy: 'official', label: 'x' }], { policy: 'development', concurrency: 1 }, null, noop), /official inputs need an official context/);
  await run('runPool official input with a bare context', () => O.runPool([{ policy: 'official', label: 'x' }], { concurrency: 1 }, null, noop), /no valid context/);
  await run('runPool development input with an official context', () => O.runPool([{ policy: 'development', label: 'x' }], ctx, null, noop), /official context runs only official inputs/);
  // prepareO needs a V receipt first: build the chain through the real finalize path
  const q = O.finalizeQ({ seeds: seeds, recs: synthRecs(O.prepareQ({ seeds, ctx }), 'Q', ctx).map(r => ({ ...r, label: r.label })), ctx });
  const pv = O.prepareV({ qualified: q.qualified, ctx });
  const v = O.finalizeV({ qualified: q.qualified, inputs: pv.inputs, recs: synthRecs(pv.inputs, 'V', ctx), ctx, admittedSet: pv.admittedSet, registryOf: pv.registryOf, bindings: pv.bindings });
  const base = { vManifest: v.manifest, expectedVSha256: v.manifest.sha256, ctx };
  await run('O executor', () => O.prepareO({ ...base, exec: noop }), /no executor override/);
  await run('O haltCount null', () => O.prepareO({ ...base, haltCount: null }), /no halt-count override/);
  await run('O haltCount approved value', () => O.prepareO({ ...base, haltCount: 1 }), /no halt-count override/);
  await run('O haltCount larger', () => O.prepareO({ ...base, haltCount: 1000 }), /no halt-count override/);
  const ok = O.prepareO({ ...base });
  const bad = cells.filter(c => !c[1]);
  return { ok: bad.length === 0 && ok.halt === 1 && ok.inputs.length === 6 * v.manifest.entries.filter(e => e.valid).length, detail: bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ') };
});
def('h.preflight', 'R2-H', 'official Stage Q preflight: the admitted list must be exactly the registered block; a subset, a superset, a different list, an empty list are refused before any input is produced; a registry passed in the call is ignored', async () => {
  const w = await mk(), O = await w.orc();
  const ctx = O.makeContext({ policy: 'official' }), m = w.members;
  const permissive = { checkUse: () => ({ decision: 'REPRODUCTION' }), blocks: [blockRecord([SYN + 100, SYN + 101])], records: [], heldOut: [], authorizations: [] };
  const run = (seeds, extra = {}) => refusal(() => O.prepareQ({ seeds, ctx, ...extra }));
  const subset = await run(m.slice(0, 3)), superset = await run([...m, SYN + 6]), other = await run([SYN + 100, SYN + 101]), empty = await run([]);
  const withFake = await run([SYN + 100, SYN + 101], { registry: permissive });
  const unsorted = await run([...m].reverse());
  const good = O.prepareQ({ seeds: m, ctx });
  return rx(/registry preflight failed/, subset) && rx(/registry preflight failed/, superset) && rx(/registry preflight failed/, other) && rx(/registry preflight failed/, empty)
    && rx(/registry preflight failed/, withFake) && rx(/registry preflight failed/, unsorted) && good.length === m.length && good.every(i => i.policy === 'official' && i.freezeSha256 === w.pin && i.configSeed === 100000 && i.configIndex === 1 && i.tree === TREE.dir);
});
def('h.pipeline', 'R2-H', 'official Q -> V -> O through prepare/finalize with synthetic records (no run): receipts are written, linked and bound into the manifests; re-finalizing Q with a different result clears V and O and a later V/O is refused until redone', async () => {
  const w = await mk(), O = await w.orc(), L = await w.lock();
  const ctx = O.makeContext({ policy: 'official' }), seeds = w.members;
  const qIn = O.prepareQ({ seeds, ctx });
  const q = O.finalizeQ({ seeds, recs: synthRecs(qIn, 'Q', ctx), ctx });
  const c1 = L.readChain(ctx.auth);
  const vp = O.prepareV({ qualified: q.qualified, ctx });
  const v = O.finalizeV({ qualified: q.qualified, inputs: vp.inputs, recs: synthRecs(vp.inputs, 'V', ctx), ctx, admittedSet: vp.admittedSet, registryOf: vp.registryOf, bindings: vp.bindings });
  const c2 = L.readChain(ctx.auth);
  const op = O.prepareO({ vManifest: v.manifest, expectedVSha256: v.manifest.sha256, ctx });
  const o = O.finalizeO({ vManifest: v.manifest, inputs: op.inputs, recs: synthRecs(op.inputs, 'O', ctx), ctx, halt: op.halt, bindings: op.bindings });
  const c3 = L.readChain(ctx.auth);
  const vin = v.manifest.inputs, oin = o.manifest.inputs;
  const linked = c1.Q && c2.V && c3.O && c2.V.upstream.receiptSha256 === c1.Q.sha256 && c3.O.upstream.receiptSha256 === c2.V.sha256;
  const bound = vin.policy === 'official' && vin.freezeRecordSha256 === w.pin && vin.qualifiedReceiptSha256 === c1.Q.sha256 && oin.validityReceiptSha256 === c2.V.sha256
    && oin.freezeRecordSha256 === w.pin && /^[0-9a-f]{64}$/.test(vin.sourcesSha256) && /^[0-9a-f]{64}$/.test(vin.registryDigestSha256);
  // rerun Q with a different outcome (one seed fails to qualify)
  const recs2 = synthRecs(qIn, 'Q', ctx); recs2[0].startNode = 6;
  const q2 = O.finalizeQ({ seeds, recs: recs2, ctx });
  const c4 = L.readChain(ctx.auth);
  const vOld = await refusal(() => O.prepareV({ qualified: q.qualified, ctx }));             // the old qualified list is no longer the receipt's list
  const oOld = await refusal(() => O.prepareO({ vManifest: v.manifest, expectedVSha256: v.manifest.sha256, ctx }));
  const drvO = await refusal(() => L.assertOfficialExecution(w.input(seeds[1], 'O')));
  return !q.halted && !v.halted && !o.halted && q.qualified.length === seeds.length && linked && bound && q2.qualified.length === seeds.length - 1 && c4.V === null && c4.O === null
    && rx(/not the list in the Stage-Q receipt/, vOld) && rx(/no Stage-V receipt/, oOld) && rx(/no Stage-V receipt/, drvO);
});

// ---- E: environment identity ----
async function genOf() {
  const env = await import(url(path.join(TREE.dir, 'experiments/m7/env.js')));
  const gen = env.generateAccepted(100000, 1);
  return { env, gen, constants: ENVID.constantsOf(env), graph: ENVID.readGraph(TREE.dir) };
}
const cloneGen = (g) => { const cfg = { ...g.cfg, unreliableSet: g.cfg.unreliableSet.slice(), pPhase1: g.cfg.pPhase1.slice(), pPhase2: g.cfg.pPhase2.slice(),
  embedding: new Map([...g.cfg.embedding.entries()].map(([k, v]) => [k, v.slice()])), checks: JSON.parse(JSON.stringify(g.cfg.checks)) };
  return { cfg, discards: g.discards.map(d => ({ seed: d.seed, checks: JSON.parse(JSON.stringify(d.checks)) })), tries: g.tries, provenance: { ...g.provenance } }; };
const nextUp = (x) => { const b = Buffer.alloc(8); b.writeDoubleBE(x); b.writeBigUInt64BE(b.readBigUInt64BE() + 1n); return b.readDoubleBE(); };
def('e.identity', 'R2-E', 'the study environment: the repository and the conformed tree produce the SAME explicit digest; it equals the value pinned in the ledger (digest, every section, provenance, goal, six frame-edge reliabilities)', async () => {
  const a = await import(url(path.join(REPO, 'experiments/m7/env.js'))), { env, gen, constants, graph } = await genOf();
  const repoRep = ENVID.canonicalEnvironment({ generated: a.generateAccepted(100000, 1), constants: ENVID.constantsOf(a), graph: ENVID.readGraph(REPO) });
  const rep = ENVID.canonicalEnvironment({ generated: gen, constants, graph }), sc = CFG.STUDY_CONFIGURATION;
  const frame = ENVID.frameEdgeValues(gen.cfg.pPhase1, env.edgeIndexOf);
  const repeat = ENVID.canonicalEnvironment({ generated: env.generateAccepted(100000, 1), constants, graph }).sha256;
  const L = await import(url(path.join(REPO, 'experiments/mcf1/lock.mjs')));
  const accepted = await L.evaluateAcceptedConfiguration(TREE.dir), acceptedOnly = ENVID.canonicalAcceptedConfiguration({ cfg: env.makeConfig(sc.acceptedSeed, sc.index), constants, graph });
  const levels = L.acceptedMismatch(accepted) === null && L.environmentMismatch(await L.evaluateEnvironment(TREE.dir)) === null
    && ENVID.ACCEPTED_SECTIONS.every(n => acceptedOnly.digests[n] === rep.sections[n] && accepted.digests[n] === rep.sections[n]);
  return levels && repoRep.sha256 === rep.sha256 && rep.sha256 === sc.environment.sha256 && same(rep.sections, sc.environment.sections) && repeat === rep.sha256
    && gen.provenance.acceptedSeed === sc.acceptedSeed && gen.provenance.numberOfRejectedCandidatesBeforeAcceptance === sc.rejectedBeforeAcceptance && gen.cfg.goal === sc.goal
    && Object.entries(sc.frameEdgeReliabilities).every(([k, v]) => Object.is(frame[k], v)) && sc.adoptedFromDevelopment === true
    && sc.seed === CFG.DEV_BASE_CONFIG.configSeed && sc.index === CFG.DEV_BASE_CONFIG.configIndex && sc.acceptedSeed === CFG.DEV_BASE_CONFIG.acceptedSeed;
});
def('e.naive', 'R2-E', 'why an explicit representation: a generic JSON digest of the configuration object does not change when any embedding value changes (the Map serialises as {}), while the explicit digest does', async () => {
  const EW = await (await mk({ authorised: false, frozen: false })).envid();
  const { gen, constants, graph } = await genOf();
  const g2 = cloneGen(gen); const v = g2.cfg.embedding.get(1); v[0] = nextUp(v[0]);
  const naive = (g) => H(JSON.stringify(g.cfg));
  const explicit = (g) => EW.canonicalEnvironment({ generated: g, constants, graph }).sha256;
  return naive(gen) === naive(g2) && explicit(gen) !== explicit(g2) && JSON.stringify(gen.cfg.embedding) === '{}';
});
def('e.every_parameter', 'R2-E', 'every material parameter changes the digest (or is rejected by an invariant): all 39+39 reliabilities, all 20x32 embedding values, the unreliable set, the acceptance record, the provenance, the rejected-candidate accounting, the constants and the graph', async () => {
  const EW = await (await mk({ authorised: false, frozen: false })).envid();
  const { gen, constants, graph } = await genOf();
  const base = EW.canonicalEnvironment({ generated: gen, constants, graph }).sha256;
  const outcome = (g, c = constants, gr = graph) => { try { return EW.canonicalEnvironment({ generated: g, constants: c, graph: gr }).sha256 === base ? 'SAME' : 'CHANGED'; } catch (e) { return e.name === 'EnvironmentCanonicalError' ? 'REJECTED' : 'ERROR'; } };
  const tally = { CHANGED: 0, REJECTED: 0, SAME: 0, ERROR: 0 }, same_ = [];
  const note = (label, r) => { tally[r]++; if (r === 'SAME' || r === 'ERROR') same_.push(label); };
  for (let i = 0; i < gen.cfg.pPhase1.length; i++) { const g = cloneGen(gen); g.cfg.pPhase1[i] = nextUp(g.cfg.pPhase1[i]); note(`pPhase1[${i}]`, outcome(g)); }
  for (let i = 0; i < gen.cfg.pPhase2.length; i++) { const g = cloneGen(gen); g.cfg.pPhase2[i] = nextUp(g.cfg.pPhase2[i]); note(`pPhase2[${i}]`, outcome(g)); }
  for (const [node, vec] of gen.cfg.embedding.entries()) for (let j = 0; j < vec.length; j++) { const g = cloneGen(gen); const v = g.cfg.embedding.get(node); v[j] = nextUp(v[j]); note(`embedding[${node}][${j}]`, outcome(g)); }
  for (let i = 0; i < gen.cfg.unreliableSet.length; i++) { const g = cloneGen(gen); g.cfg.unreliableSet[i] += 1; note(`unreliableSet[${i}]`, outcome(g)); }
  const g0 = cloneGen(gen); g0.cfg.goal = constants.GOALS.find(x => x !== gen.cfg.goal); note('goal', outcome(g0));
  for (const k of Object.keys(gen.cfg.checks)) {
    const v = gen.cfg.checks[k], g = cloneGen(gen);
    if (typeof v === 'boolean') g.cfg.checks[k] = !v; else if (typeof v === 'number') g.cfg.checks[k] = Number.isInteger(v) ? v + 1 : nextUp(v);
    else if (typeof v === 'string') g.cfg.checks[k] = v + 'x'; else if (Array.isArray(v)) g.cfg.checks[k] = v.map((e, i) => (i === 0 ? (Number.isInteger(e) ? e + 1 : nextUp(e)) : e));
    note(`checks.${k}`, outcome(g));
  }
  for (const k of Object.keys(gen.provenance)) { const g = cloneGen(gen); g.provenance[k] += 1; note(`provenance.${k}`, outcome(g)); }
  { const g = cloneGen(gen); g.tries += 1; note('tries', outcome(g)); }
  { const g = cloneGen(gen); g.cfg.configIndex += 4; note('configIndex', outcome(g)); }
  for (let i = 0; i < gen.discards.length; i++) { const g = cloneGen(gen); g.discards[i].checks.startsWith2 += 1; note(`discards[${i}].checks.startsWith2`, outcome(g)); const h = cloneGen(gen); h.discards[i].seed += 1; note(`discards[${i}].seed`, outcome(h)); }
  for (const k of constants ? EW.CONSTANT_KEYS : []) {
    const c = { ...constants }, v = c[k];
    c[k] = Array.isArray(v) ? v.map((e, i) => (i === 0 ? (typeof e === 'number' ? (Number.isInteger(e) ? e + 1 : nextUp(e)) : e + 'x') : e)) : (typeof v === 'number' ? (Number.isInteger(v) ? v + 1 : nextUp(v)) : v + 'x');
    note(`constants.${k}`, outcome(gen, c));
  }
  for (let i = 0; i < graph.edges.length; i++) { const gr = { nodes: graph.nodes, edges: graph.edges.map((e, k) => (k === i ? [e[1], e[0]] : e)) }; note(`graph.edges[${i}]`, outcome(gen, constants, gr)); }
  for (let i = 0; i < graph.nodes.length; i++) { const gr = { nodes: graph.nodes.map((n, k) => (k === i ? n + 1000 : n)), edges: graph.edges }; note(`graph.nodes[${i}]`, outcome(gen, constants, gr)); }
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return { ok: tally.SAME === 0 && tally.ERROR === 0 && tally.CHANGED >= 700 && total >= 850, detail: `${total} perturbations: ${tally.CHANGED} changed the digest, ${tally.REJECTED} rejected by an invariant, ${tally.SAME} unchanged, ${tally.ERROR} unexpected errors ${same_.slice(0, 5).join(',')}` };
});
def('e.order_and_reject', 'R2-E', 'irrelevant key and insertion order never changes the digest; non-canonical values are refused explicitly with their path (function, NaN, infinity, undefined, symbol key, accessor, extra and missing keys, plain-object embedding, wrong dimension, sparse array, class instance, BigInt)', async () => {
  const EW = await (await mk({ authorised: false, frozen: false })).envid();
  const { gen, constants, graph } = await genOf();
  const rep = (g, c = constants, gr = graph) => EW.canonicalEnvironment({ generated: g, constants: c, graph: gr });
  const base = rep(gen).sha256;
  const rev = (o) => Object.fromEntries(Object.keys(o).reverse().map(k => [k, o[k]]));
  const shuffled = { provenance: rev(gen.provenance), tries: gen.tries, discards: gen.discards.map(d => ({ checks: rev(d.checks), seed: d.seed })),
    cfg: rev({ ...gen.cfg, checks: rev(gen.cfg.checks), embedding: new Map([...gen.cfg.embedding.entries()].reverse()) }) };
  const orderOk = rep(shuffled, rev(constants), { edges: graph.edges, nodes: graph.nodes }).sha256 === base;
  const reject = (label, mutate, re = /./) => { const g = cloneGen(gen); const c = { ...constants }; mutate(g, c); try { rep(g, c); return [label, false, 'accepted']; } catch (e) { return [label, e.name === 'EnvironmentCanonicalError' && re.test(e.message), e.message.slice(0, 80)]; } };
  const cells = [
    reject('function value', (g) => { g.cfg.goal = () => 12; }, /a function is not representable/),
    reject('function-valued extra key', (g) => { g.cfg.helper = () => 1; }, /a function is not representable/),
    reject('NaN reliability', (g) => { g.cfg.pPhase1[0] = NaN; }, /finite number/),
    reject('Infinity reliability', (g) => { g.cfg.pPhase2[3] = Infinity; }, /finite number/),
    reject('undefined reliability', (g) => { g.cfg.pPhase1[1] = undefined; }, /finite number/),
    reject('string reliability', (g) => { g.cfg.pPhase1[1] = '0.5'; }, /finite number/),
    reject('symbol key', (g) => { g.cfg[Symbol('x')] = 1; }, /symbol keys/),
    reject('accessor property', (g) => { Object.defineProperty(g.cfg, 'goal', { get() { return 12; }, enumerable: true, configurable: true }); }, /accessor/),
    reject('extra key', (g) => { g.cfg.extra = 1; }, /unexpected key/),
    reject('missing key', (g) => { delete g.cfg.checks; }, /required key is missing/),
    reject('embedding as plain object', (g) => { g.cfg.embedding = {}; }, /expected a Map/),
    reject('embedding wrong dimension', (g) => { g.cfg.embedding.get(1).pop(); }, /32 elements/),
    reject('embedding wrong key set', (g) => { g.cfg.embedding.delete(1); }, /key set must equal the graph node set/),
    reject('sparse array', (g) => { delete g.cfg.pPhase1[2]; }, /sparse|hole/),
    reject('class instance', (g) => { g.cfg = Object.assign(new (class X {})(), g.cfg); }, /plain object/),
    reject('BigInt', (g) => { g.cfg.configSeed = 100000n; }, /safe integer/),
    reject('unaccepted configuration', (g) => { g.cfg.accepted = false; }, /only an accepted configuration/),
    reject('constants: function', (g, c) => { c.EMBED_DIM = () => 32; }, /safe integer|function/),
    reject('discard seeds not consecutive', (g) => { g.discards[3].seed += 5; }, /consecutive ascending/),
  ];
  const bad = cells.filter(c => !c[1]);
  return { ok: orderOk && bad.length === 0, detail: `${orderOk ? '' : 'ORDER-SENSITIVE '}${bad.map(b => `${b[0]} -> ${b[2]}`).join(' | ')}` };
});
def('e.tree_env_edit', 'R2-E', 'an edited environment module in the tree is caught twice: the tree verification refuses the file, and (bypassing it) the evaluated environment differs from the approved one in a named section', async () => {
  const w = await mk(), L = await w.lock();
  const sb = sandboxTree('envedit');
  const envPath = path.join(sb.tree, 'experiments/m7/env.js'), src = fs.readFileSync(envPath, 'utf8');
  if ((src.split('export const P_RELIABLE    = [0.90, 1.00];').length - 1) !== 1) return { ok: false, detail: 'verifier defect: env.js anchor' };
  fs.writeFileSync(envPath, src.replace('export const P_RELIABLE    = [0.90, 1.00];', 'export const P_RELIABLE    = [0.90, 0.99];'));
  const refusedTree = withTmpdir(sb.tmp, () => L.verifyTreeReadOnly(L.treeBindingFromManifest(TREE.dir)));
  const E = await L.evaluateEnvironment(sb.tree);
  const why = L.environmentMismatch(E);
  return refusedTree.ok === false && /corrupt tree file experiments\/m7\/env\.js/.test(refusedTree.why) && /provenance|frame edge reliability|environment digest \(section/.test(why || '');
});

// ---- F: the digest graph ----
def('f.no_cycle', 'R2-F', 'no circular hashing: the configuration digest, the source digest and the registry-independent parts are identical with the pin null and with the pin set; the source digest does not read the pin, the record or the block data', async () => {
  const unpinned = await mk({ pin: null }), pinned = await mk();
  const Cu = await unpinned.config(), Cp = await pinned.config(), Lu = await unpinned.lock(), Lp = await pinned.lock();
  const cfgSame = Cu.hashObject(Cu.configSnapshot()) === Cp.hashObject(Cp.configSnapshot());
  const srcSame = Lu.sourcesDigest().sha256 === Lp.sourcesDigest().sha256;
  const noPinText = !/FREEZE_RECORD_SHA256|authorization\.mjs/.test(JSON.stringify(Cp.configSnapshot()));
  const excluded = !Lp.SOURCE_FILES.includes('experiments/mcf1/authorization.mjs') && !Lp.SOURCE_FILES.includes('experiments/registry/trajectory_blocks.js') && !Lp.SOURCE_FILES.some(f => /freeze_record/.test(f));
  // fixed point: the live bindings recomputed under the pin equal the ones the record carries
  const live = Lp.liveBindings(), rec = pinned.record.bindings;
  const fixed = live.configSha256 === rec.configSha256 && live.sourcesSha256 === rec.sourcesSha256 && live.registryDigestSha256 === rec.registryDigestSha256 && live.preregistrationSha256 === rec.preregistrationSha256;
  return cfgSame && srcSame && noPinText && excluded && fixed;
});
def('f.sources', 'R2-F', 'the source digest covers exactly the declared closure: changing any one declared file changes it; the declared list equals the import closure of the entry points (nothing reachable is missing, nothing declared is unreachable)', async () => {
  const w = await mk(), L = await w.lock();
  const s = L.sourcesDigest(), base = s.sha256;
  let allChange = true;
  for (const f of Object.keys(s.files)) { if (L.digestOfFiles({ ...s.files, [f]: H('changed ' + f) }) === base) allChange = false; }
  // static closure from the entry points
  const seen = new Set(), rxs = [/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g, /import\s*['"]([^'"]+)['"]/g, /import\(\s*['"]([^'"]+)['"]\s*\)/g, /URLOF\(\s*REPO\s*,\s*['"]([^'"]+)['"]\s*\)/g];
  const walk = (rel) => {
    if (seen.has(rel)) return; seen.add(rel);
    const abs = path.join(REPO, rel); if (!/\.m?js$/.test(rel) || !fs.existsSync(abs)) return;
    const t = fs.readFileSync(abs, 'utf8');
    for (const r of rxs) { r.lastIndex = 0; let m; while ((m = r.exec(t))) { const sp = m[1]; if (sp.startsWith('node:')) continue;
      let target = null; if (sp.startsWith('.')) target = path.relative(REPO, path.resolve(path.dirname(abs), sp)).split(path.sep).join('/'); else if (/^(experiments|instrumentation)\//.test(sp)) target = sp;
      if (target && fs.existsSync(path.join(REPO, target))) walk(target); } }
  };
  for (const e of ['experiments/mcf1/orchestrate.mjs', 'experiments/mcf1/driver.mjs', 'experiments/mcf1/lock.mjs', 'experiments/mcf1/analyze.mjs', 'experiments/mcf1/frame.mjs']) walk(e);
  const declared = new Set(L.SOURCE_FILES), excluded = Object.keys(L.SOURCE_EXCLUSIONS);
  const dataFiles = new Set(['neurons.json', 'connections.json']);
  const missing = [...seen].filter(f => !declared.has(f) && !excluded.includes(f));
  const unreachable = [...declared].filter(f => !seen.has(f) && !dataFiles.has(f));
  return { ok: allChange && missing.length === 0 && unreachable.length === 0 && declared.size === 32, detail: `missing ${missing.join(',')} unreachable ${unreachable.join(',')}` };
});
def('f.inventory', 'R2-F', 'reservation is not membership: registering the study\'s own block leaves the inventory hash and the admission summary hash unchanged; another study\'s block changes both and is reserved; an explicit own-study record is refused', async () => {
  const none = await mk({ authorised: false, frozen: false }), own = await mk({ blocks: [blockRecord(SYN_MEMBERS)] });
  const other = await mk({ blocks: [blockRecord(SYN_MEMBERS, { study: 'OTHER-STUDY' })] });
  const hashOf = async (w) => { const I = await w.inventory(); const inv = I.buildInventory(); return { sha: inv.sha256, classes: inv.classes.map(c => c.id), reg: inv.descriptor.registry, inv, I }; };
  const a = await hashOf(none), b = await hashOf(own), c = await hashOf(other);
  const A = await own.admission(), summaryOwn = A.admitScan({ start: 1_700_000_000, length: 24, inventory: b.inv, category: 'registered' }).summary;
  const An = await none.admission(), summaryNone = An.admitScan({ start: 1_700_000_000, length: 24, inventory: a.inv, category: 'registered' }).summary;
  const Ao = await other.admission(), summaryOther = Ao.admitScan({ start: 1_700_000_000, length: 24, inventory: c.inv, category: 'registered' }).summary;
  // the other study's members are reserved: their own seeds are rejected against the inventory
  const reserved = c.inv.derived.has(c.I.derivedSeeds(SYN)['cognitive']) && !b.inv.derived.has(b.I.derivedSeeds(SYN)['cognitive']);
  // an explicit own-study record in the registry module is refused at inventory build
  const rec = { namespace: 'trajectory', value: SYN + 50, study: 'MCF-1', status: 'registered', authorization: 'verification world only', executed: false, artifact: 'none', why: 'explicit own record' };
  const ex = await mk({ authorised: false, frozen: false, edits: [] });
  const typedPath = path.join(ex.root, 'experiments/registry/typed.js');
  const tsrc = fs.readFileSync(typedPath, 'utf8');
  const anchor = 'export const TRAJECTORY_RECORDS = ';
  if (tsrc.split(anchor).length !== 2) return { ok: false, detail: 'verifier defect: typed.js anchor' };
  const idx = tsrc.indexOf(anchor), arrStart = tsrc.indexOf('[', idx);
  fs.writeFileSync(typedPath, tsrc.slice(0, arrStart + 1) + '\n    ' + JSON.stringify(rec) + ',' + tsrc.slice(arrStart + 1));
  const refused = await refusal(async () => { const I = await ex.inventory(); I.buildInventory(); });
  return a.sha === b.sha && JSON.stringify(a.reg) === JSON.stringify(b.reg) && a.sha.startsWith('be6a49e8') && summaryOwn.registrySha256 === summaryNone.registrySha256 && summaryOwn.inventorySha256 === summaryNone.inventorySha256
    && c.sha !== a.sha && summaryOther.registrySha256 !== summaryNone.registrySha256 && c.classes.includes('REGISTERED_BLOCKS_OTHER_STUDIES') && !b.classes.includes('REGISTERED_BLOCKS_OTHER_STUDIES')
    && reserved && rx(/explicit registry record of MCF-1 exists/, refused);
});

// ---- G: static properties ----
def('g.static', 'R2-G', 'static: no typed.js reference in the harness; the pin module is one declaration imported only by lock.mjs; no official-path module can build or delete a tree (build_tree is not in the driver closure, rm calls are absent, rename/unlink appear only in the receipt writer); no clock or RNG', async () => {
  const files = fs.readdirSync(HERE).filter(f => f.endsWith('.mjs'));
  const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');
  const legacyRef = files.filter(f => /(?:from\s*|import\s*\(\s*|URLOF\([^)]*)['"][^'"]*registry\/typed\.js['"]/.test(read(f)));
  const pinOk = LCK.pinModuleShapeOk(read('authorization.mjs'));
  const importers = files.filter(f => /authorization\.mjs/.test(read(f).replace(/\/\/.*$/gm, '')) && !/^verify_/.test(f));
  const lockSrc = read('lock.mjs'), driverSrc = read('driver.mjs'), envSrc = read('envidentity.mjs');
  const noRebuild = [lockSrc.replace(/export const SOURCE_FILES = [\s\S]*?\]\);/, ''), driverSrc, envSrc, read('authorization.mjs')].every(s => !/buildTree|build_tree|\brmSync\b|\brmdirSync\b|fs\.rm\(/.test(s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
  const orc = read('orchestrate.mjs'), a = orc.indexOf('function makeOfficialContext'), b = orc.indexOf('/** the development context');
  const officialCtx = orc.slice(a, b);
  const officialNoBuild = a > 0 && b > a && !/buildTree|rmSync/.test(officialCtx.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  const wr = lockSrc.indexOf('export function commitReceipt'), we = lockSrc.indexOf('// ---- the driver boundary');
  const writerOnly = [...lockSrc.matchAll(/renameSync|unlinkSync/g)].every(m => m.index > wr && m.index < we);
  const clock = [lockSrc, envSrc].some(s => /Date\.now\(|Math\.random\(|new Date\(/.test(s.replace(/\/\/.*$/gm, '')));
  // the driver's import closure does not reach build_tree.mjs
  const seen = new Set(), rxs = [/from\s*['"]([^'"]+)['"]/g, /URLOF\(\s*REPO\s*,\s*['"]([^'"]+)['"]\s*\)/g];
  const walk = (rel) => { if (seen.has(rel)) return; seen.add(rel); const abs = path.join(REPO, rel); if (!/\.m?js$/.test(rel) || !fs.existsSync(abs)) return; const t = fs.readFileSync(abs, 'utf8');
    for (const r of rxs) { r.lastIndex = 0; let m; while ((m = r.exec(t))) { const sp = m[1]; if (sp.startsWith('node:')) continue; let tg = null; if (sp.startsWith('.')) tg = path.relative(REPO, path.resolve(path.dirname(abs), sp)).split(path.sep).join('/'); else if (/^(experiments|instrumentation)\//.test(sp)) tg = sp; if (tg && fs.existsSync(path.join(REPO, tg))) walk(tg); } } };
  walk('experiments/mcf1/driver.mjs');
  const legacyFile = JSON.parse(fs.readFileSync(path.join(REPO, 'experiments/registry/legacy_typed_importers.json'), 'utf8'));
  const entries = legacyFile.entries || legacyFile;
  const noMcf1Legacy = entries.every(e => !/^experiments\/mcf1\//.test(e.path));
  return { ok: legacyRef.length === 0 && pinOk && importers.join() === 'lock.mjs' && noRebuild && officialNoBuild && writerOnly && !clock && !seen.has('experiments/h1r/build_tree.mjs') && !seen.has('experiments/h1r/conformance_transform.mjs') && noMcf1Legacy && entries.length === 17,
    detail: `legacy ${legacyRef} pin ${pinOk} importers ${importers} noRebuild ${noRebuild} officialNoBuild ${officialNoBuild} writerOnly ${writerOnly} clock ${clock} driverClosureBuildTree ${seen.has('experiments/h1r/build_tree.mjs')} entries ${entries.length}` };
});
def('g.parity', 'R2-G', 'migration parity: against the baseline commit, the inventory hash, every class digest, the derived-seed count, and the admitted list and summary hashes of three non-candidate windows are IDENTICAL', async () => {
  const dir = path.join(ROOT, 'baseline');
  const files = ['experiments/mcf1/admission.mjs', 'experiments/mcf1/config.mjs', 'experiments/mcf1/inventory.mjs', 'experiments/h1r/env_seed.mjs', 'experiments/registry/typed.js', 'experiments/registry/typed_v2.js',
    'experiments/registry/trajectory_blocks.js', 'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/consumed_after_study2.js', 'experiments/registry/consumed_after_h1r.js',
    'experiments/m8/instrument.js', 'experiments/m8/protocol.js', 'experiments/q1/instrument.js', 'experiments/q1/protocol.js', 'experiments/uqa/protocol.js', 'experiments/uqb/protocol.js', 'instrumentation/rng.js'];
  for (const f of files) { const to = path.join(dir, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, execFileSync('git', ['-C', REPO, 'show', `${BASELINE}:${f}`], { maxBuffer: 1 << 26 })); }
  const oldInv = await import(url(path.join(dir, 'experiments/mcf1/inventory.mjs'))), oldAdm = await import(url(path.join(dir, 'experiments/mcf1/admission.mjs')));
  const newInv = await import(url(path.join(REPO, 'experiments/mcf1/inventory.mjs'))), newAdm = await import(url(path.join(REPO, 'experiments/mcf1/admission.mjs')));
  const a = oldInv.buildInventory(), b = newInv.buildInventory();
  const classes = (inv) => inv.classes.map(c => [c.id, c.spanCount, c.spansSha256]);
  const windows = [[1_600_000_000, 300], [1_700_000_000, 200], [1_100_000_000, 60]];
  const wins = windows.map(([start, length]) => {
    const o = oldAdm.admitScan({ start, length, inventory: a, category: 'registered' }), n = newAdm.admitScan({ start, length, inventory: b, category: 'registered' });
    return same(o.admitted, n.admitted) && o.sha256 === n.sha256 && o.summary.admittedSha256 === n.summary.admittedSha256 && o.summary.registrySha256 === n.summary.registrySha256;
  });
  return { ok: a.sha256 === b.sha256 && same(classes(a), classes(b)) && a.derived.size === b.derived.size && same(a.descriptor, b.descriptor) && wins.every(Boolean) && a.sha256.startsWith('be6a49e8'), detail: `inventory ${a.sha256.slice(0, 16)} vs ${b.sha256.slice(0, 16)}; windows ${wins.join(',')}` };
});
def('g.registration', 'R2-G', 'registration helper: blockFromAdmission denotes exactly the admitted list (hull, exclusions, count, hash), round-trips through the v2 registry, and refuses an empty, unsorted, duplicated or out-of-domain list', async () => {
  const admitted = [10, 11, 13, 14, 20];
  const b = LCK.blockFromAdmission({ admitted, artifact: 'admitted.json', authorization: 'verification only', why: 'helper test' });
  const reg = createTrajectoryRegistry({ records: [...TRAJECTORY_RECORDS], heldOut: [...TRAJECTORY_HELD_OUT], authorizations: [...TRAJECTORY_AUTHORIZATIONS], blocks: [b] });
  const members = LCK.memberListOf(reg.blocks[0]);
  const bad = [[], [3, 2], [1, 1], [-1, 4], [2 ** 32]].map(l => { try { LCK.blockFromAdmission({ admitted: l, artifact: 'a', authorization: 'a', why: 'a' }); return false; } catch (e) { return true; } });
  return same(members, admitted) && b.excluded.join() === '12,15,16,17,18,19' && b.count === 5 && b.listSha256 === H(admitted.join(',')) && b.executed === false && b.status === 'registered'
    && same(b.configuration, { seed: 100000, index: 1, acceptedSeed: 100026 }) && bad.every(Boolean);
});
def('g.cost', 'R2-G', 'cost of the per-process checks on this machine (informational, with generous ceilings): authorization, source digest, read-only tree verification, environment evaluation', async () => {
  const w = await mk(), L = await w.lock();
  const t = (fn) => { const t0 = process.hrtime.bigint(); const r = fn(); return [Number(process.hrtime.bigint() - t0) / 1e6, r]; };
  const [aMs] = t(() => L.officialAuthorisation()), [sMs] = t(() => L.sourcesDigest()), [tMs, tv] = t(() => L.verifyTreeReadOnly(TREE_BINDING));
  const t0 = process.hrtime.bigint(); await L.evaluateEnvironment(TREE.dir); const eMs = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`     cost: authorization ${aMs.toFixed(0)} ms, sources ${sMs.toFixed(0)} ms, tree ${tMs.toFixed(0)} ms (${Object.keys(tv.manifest.files).length} files), environment ${eMs.toFixed(0)} ms`);
  return aMs < 5000 && sMs < 2000 && tMs < 5000 && eMs < 8000 && tv.ok === true;
});

// ---------------- run ----------------
async function runTest(t) {
  try { return res(await t.fn()); } catch (e) { return { ok: false, detail: 'threw: ' + String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e).slice(0, 300), threw: true, defect: /verifier defect/.test(String(e && e.message)) }; }
}
// ---------------- anti-vacuity mutants ----------------
const L = 'experiments/mcf1/lock.mjs', O = 'experiments/mcf1/orchestrate.mjs', D = 'experiments/mcf1/driver.mjs', V = 'experiments/mcf1/envidentity.mjs', I = 'experiments/mcf1/inventory.mjs', C = 'experiments/mcf1/config.mjs';
const remove = (file, find) => [file, find, ''];
const MUTANTS = [
  { id: 'frozen-flag-ignored', tests: ['r.block', 's.refuse'], edits: [remove(L, "  if (FROZEN !== true) fail('the design is not frozen: config FROZEN is false');\n")] },
  { id: 'pin-shape-unchecked', tests: ['r.pin'], edits: [remove(L, "  if (!pinModuleShapeOk(pinText)) fail('authorization.mjs is not exactly one pin declaration');\n")] },
  { id: 'pin-hash-unchecked', tests: ['r.pin'], edits: [remove(L, "  if (hashObject(parsed) !== P) fail('the freeze record hash does not equal the committed pin');\n")] },
  { id: 'testOnly-ignored', tests: ['r.record'], edits: [remove(L, "  if (rec.testOnly !== undefined && rec.testOnly !== false) fail('the freeze record is marked testOnly');\n")] },
  { id: 'schema-unchecked', tests: ['r.record'], edits: [remove(L, '  if (rec.schema !== RECORD_SCHEMA) fail(`the freeze record has the wrong schema (expected ${RECORD_SCHEMA})`);\n')] },
  { id: 'approval-status-unchecked', tests: ['r.record'], edits: [remove(L, '    if (a.status !== \'APPROVED\') fail(`decision "${k}" is not APPROVED in the freeze record`);\n')] },
  { id: 'approval-value-unchecked', tests: ['r.record'], edits: [remove(L, '    if (!same(a.value, APPROVALS[k].value)) fail(`the approved value of "${k}" differs from the value implemented in config.mjs`);\n')] },
  { id: 'prereg-binding-removed', tests: ['r.bindings'], edits: [[L, "for (const k of ['preregistrationSha256', 'configSha256', 'sourcesSha256', 'registryDigestSha256']) {", "for (const k of ['configSha256', 'sourcesSha256', 'registryDigestSha256']) {"]] },
  { id: 'config-binding-removed', tests: ['r.bindings'], edits: [[L, "for (const k of ['preregistrationSha256', 'configSha256', 'sourcesSha256', 'registryDigestSha256']) {", "for (const k of ['preregistrationSha256', 'sourcesSha256', 'registryDigestSha256']) {"]] },
  { id: 'sources-binding-removed', tests: ['r.bindings'], edits: [[L, "for (const k of ['preregistrationSha256', 'configSha256', 'sourcesSha256', 'registryDigestSha256']) {", "for (const k of ['preregistrationSha256', 'configSha256', 'registryDigestSha256']) {"]] },
  { id: 'registry-binding-removed', tests: ['r.bindings'], edits: [[L, "for (const k of ['preregistrationSha256', 'configSha256', 'sourcesSha256', 'registryDigestSha256']) {", "for (const k of ['preregistrationSha256', 'configSha256', 'sourcesSha256']) {"]] },
  { id: 'block-list-hash-unchecked', tests: ['r.block'], edits: [remove(L, "  if (block.listSha256 !== rec.bindings.admittedSha256) fail('admittedSha256 does not equal the registered block list hash');\n")] },
  { id: 'block-executed-ignored', tests: ['r.block'], edits: [remove(L, "  if (block.executed !== false) fail(`the ${STUDY} block is already marked executed`);\n")] },
  { id: 'block-status-ignored', tests: ['r.block'], edits: [remove(L, "  if (block.status !== 'registered') fail(`the ${STUDY} block is not registered (status ${block.status})`);\n")] },
  { id: 'block-configuration-unchecked', tests: ['r.block'], edits: [remove(L, "  if (!same(block.configuration, { seed: sc.seed, index: sc.index, acceptedSeed: sc.acceptedSeed })) fail('the registered block configuration is not the approved study configuration');\n")] },
  { id: 'adoption-disclosure-unchecked', tests: ['r.block'], edits: [remove(L, "  if (adopted !== sc.adoptedFromDevelopment) fail('the study configuration must disclose whether it is adopted from the development configuration');\n")] },
  { id: 'freeze-echo-unchecked', tests: ['d.input'], edits: [remove(L, "  if (IN.freezeSha256 !== A.recordSha256) fail('the supplied freeze hash does not equal the committed pin');\n")] },
  { id: 'membership-unchecked', tests: ['d.members'], edits: [remove(L, "  if (decision !== 'REPRODUCTION' || !inBlock(A.block, raw)) fail(`the agent seed is not a member of the registered ${STUDY} block (registry decision ${decision})`);\n")] },
  { id: 'config-identity-from-input', tests: ['d.config'], edits: [remove(L, "  if (IN.configSeed !== sc.seed || IN.configIndex !== sc.index) fail('the configuration identity differs from the approved study configuration');\n")] },
  { id: 'tree-path-from-input', tests: ['d.tree'], edits: [remove(L, "  if (given !== T.dir) fail('the supplied tree path is not the verified conformed tree');\n")] },
  { id: 'tree-file-hash-unchecked', tests: ['t.verify', 't.never_repairs'], edits: [remove(L, "    if (sha256(buf) !== h) return res(false, `corrupt tree file ${rel}`, { dir });\n")] },
  { id: 'tree-digest-unchecked', tests: ['t.verify', 'd.tree'], edits: [remove(L, "  if (sha256(canonicalJson(m.files)) !== expect.digest) return res(false, 'the tree manifest digest differs from the frozen tree digest', { dir });\n")] },
  { id: 'tree-identity-unchecked', tests: ['t.verify'], edits: [remove(L, "  if (m.b2Commit !== expect.b2Commit || m.transformSha256 !== expect.transformSha256) return res(false, 'MANIFEST.json identity differs from the frozen identity', { dir });\n")] },
  { id: 'environment-unchecked', tests: ['d.config', 'e.tree_env_edit'], edits: [remove(L, '  if (why !== null) fail(`the study environment differs from the approved configuration: ${why}`);\n')] },
  { id: 'accepted-sections-unchecked', tests: ['d.config'], edits: [[L, '  return frameMismatch(E, sc) || sectionMismatch(E.digests, sc, ACCEPTED_SECTIONS);', '  return frameMismatch(E, sc);']] },
  { id: 'frame-edge-unchecked', tests: ['d.config', 'e.tree_env_edit'], edits: [remove(L, "  for (const [edge, v] of Object.entries(sc.frameEdgeReliabilities)) if (!Object.is(E.frame[edge], v)) return `frame edge reliability ${edge}`;\n")] },
  { id: 'q-receipt-skipped', tests: ['c.lineage'], edits: [remove(L, "    if (ch.Q === null) fail('no Stage-Q receipt: Stage V cannot run');\n")] },
  { id: 'v-receipt-skipped', tests: ['c.lineage'], edits: [remove(L, "    if (ch.V === null) fail('no Stage-V receipt: Stage O cannot run');\n")] },
  { id: 'seed-not-in-receipt', tests: ['c.lineage'], edits: [remove(L, "    if (!ch.Q.payload.qualified.includes(raw)) fail('the agent seed did not qualify at Stage Q');\n")] },
  { id: 'receipt-identity-unchecked', tests: ['c.stale'], edits: [remove(L, '  if (!same(r.identity, identityOf(A))) fail(`${where} was issued for a different frozen identity (record, sources, configuration, registry, tree or study configuration)`);\n')] },
  { id: 'receipt-hash-unchecked', tests: ['c.stale'], edits: [remove(L, '  if (r.sha256 !== receiptHash(r)) fail(`${where} does not match its own hash`);\n')] },
  { id: 'receipt-link-unchecked', tests: ['c.stale'], edits: [remove(L, '      if (!same(out[s].upstream, { stage: up, receiptSha256: out[up].sha256 })) fail(`the Stage-${s} receipt is not linked to the current Stage-${up} receipt (stale or mismatched)`);\n')] },
  { id: 'chain-record-unchecked', tests: ['c.stale'], edits: [remove(L, "  if (c.freezeRecordSha256 !== A.recordSha256) fail('the receipt chain belongs to another freeze record');\n")] },
  { id: 'chain-hash-unchecked', tests: ['c.stale'], edits: [remove(L, "  if (h !== hashObject(body)) fail('the receipt chain does not match its own hash');\n")] },
  { id: 'downstream-not-cleared', tests: ['c.invalidate', 'h.pipeline'], edits: [remove(L, "    if (stage === 'Q') { next.V = null; next.O = null; } else if (stage === 'V') next.O = null;\n")] },
  { id: 'reader-ignores-lock', tests: ['c.interrupt'], edits: [remove(L, "  if (fs.existsSync(path.join(A.dir, LOCK_FILE))) fail('receipt state is ambiguous: an update lock is present (an interrupted or concurrent update); inspect and remove it only if no orchestrator is running');\n")] },
  { id: 'writer-lock-not-exclusive', tests: ['c.interrupt'], edits: [[L, "  try { fd = fs.openSync(lockPath, 'wx'); } catch (e) {", "  try { fd = fs.openSync(lockPath, 'w'); } catch (e) {"]] },
  { id: 'driver-official-branch-removed', tests: ['d.probe'], edits: [[D, "if (IN.policy === 'official') { TREE = (await assertOfficialExecution(IN)).treeDir; }", "if (IN.policy === 'official') { TREE = IN.tree; }"]] },
  { id: 'driver-unknown-keys-allowed', tests: ['d.probe'], edits: [remove(D, "  if (unknown.length) refuse(`unknown input field(s): ${unknown.join(', ')}`);\n")] },
  { id: 'driver-dev-freeze-allowed', tests: ['d.probe'], edits: [remove(D, "  if (IN.freezeSha256 !== undefined && IN.freezeSha256 !== null) refuse('a development run cannot carry a freeze hash');\n")] },
  { id: 'driver-policy-fallthrough', tests: ['d.probe'], edits: [[D, "} else refuse(`unknown policy ${IN.policy}`);", '}']] },
  { id: 'context-option-unchecked', tests: ['s.surface'], edits: [remove(O, "  if (extra.length) throw new Error(`MCF-1: makeContext accepts no option other than policy and concurrency (got ${extra.join(', ')})`);\n")] },
  { id: 'exec-override-allowed', tests: ['h.options'], edits: [remove(O, "  if (o.exec !== undefined && o.exec !== execDriver) throw new Error('MCF-1 stage refused: an official stage runs only the committed driver (no executor override)');\n")] },
  { id: 'registryOf-override-allowed', tests: ['h.options'], edits: [remove(O, "  if (o.registryOf !== undefined && o.registryOf !== null) throw new Error('MCF-1 stage refused: an official stage takes no registry decision override');\n")] },
  { id: 'admittedSet-override-allowed', tests: ['h.options'], edits: [remove(O, "  if (o.admittedSet !== undefined && o.admittedSet !== null) throw new Error('MCF-1 stage refused: an official stage takes no admitted-set override');\n")] },
  { id: 'haltCount-override-allowed', tests: ['h.options'], edits: [remove(O, "  if (o.haltCount !== undefined) throw new Error('MCF-1 stage refused: an official stage takes no halt-count override (the approved value is used)');\n")] },
  { id: 'runpool-guard-removed', tests: ['h.options'], edits: [[O, "  if (inputs.some(i => i && i.policy === 'official')) {", "  if (false) {"]] },
  { id: 'official-admit-unguarded', tests: ['s.admit'], edits: [[O, '    const A = officialAuthorisation();\n    if (start !== A.seedBlock || length !== A.scanLength) throw new Error(', '    const A = { seedBlock: start, scanLength: length };\n    if (start !== A.seedBlock || length !== A.scanLength) throw new Error(']] },
  { id: 'preflight-skipped-at-Q', tests: ['h.preflight'], edits: [[O, "assertOfficialStageOptions(ctx, { exec }); assertRegistryPreflight({ admitted: seeds }); }", "assertOfficialStageOptions(ctx, { exec }); }"]] },
  { id: 'preflight-injected-registry', tests: ['h.preflight', 's.surface'], edits: [[O, 'export function registryPreflight({ admitted, category = \'registered\' }) { return evaluateRegistryPreflight(trajectory, { admitted, category }); }', 'export function registryPreflight({ admitted, category = \'registered\', registry = trajectory }) { return evaluateRegistryPreflight(registry, { admitted, category }); }'],
    [O, 'assertRegistryPreflight({ admitted: seeds }); }', 'assertRegistryPreflight({ admitted: seeds, registry: arguments[0].registry }); }']] },
  { id: 'q-receipt-not-committed', tests: ['h.pipeline'], edits: [remove(O, "  if (ctx.policy === 'official' && !out.halted) commitReceipt(ctx.auth, 'Q', { qualified: out.qualified.slice(), qualifiedSha256: sha256(out.qualified.join(',')), summarySha256: out.sha256, scanned: seeds.length });\n")] },
  { id: 'v-bindings-dropped', tests: ['h.pipeline'], edits: [[O, '    bindings.qualifiedReceiptSha256 = ch.Q.sha256;\n', '']] },
  { id: 'pin-back-in-snapshot', tests: ['f.no_cycle'], edits: [[C, "export const STUDY = 'MCF-1';", "import { FREEZE_RECORD_SHA256 as PIN } from './authorization.mjs';\nexport const STUDY = 'MCF-1';"], [C, 'approvals: APPROVALS, frozen: FROZEN };', 'approvals: APPROVALS, frozen: FROZEN, pin: PIN };']] },
  { id: 'blocks-file-in-sources', tests: ['f.no_cycle', 'r.bindings'], edits: [[L, "  'experiments/h1r/build_tree.mjs',", "  'experiments/registry/trajectory_blocks.js', 'experiments/h1r/build_tree.mjs',"]] },
  { id: 'source-closure-missing-file', tests: ['f.sources'], edits: [[L, " 'experiments/h1r/measure.mjs', 'experiments/h1r/measure_install.mjs',", " 'experiments/h1r/measure_install.mjs',"]] },
  { id: 'crlf-normalisation-removed', tests: ['r.bindings'], edits: [[C, 'export const hashTextNormalised = (text) => sha256(String(text).replace(/\\r\\n/g, \'\\n\'));', 'export const hashTextNormalised = (text) => sha256(String(text));']] },
  { id: 'own-block-in-inventory', tests: ['f.inventory'], edits: [[I, 'return (Array.isArray(registry.blocks) ? registry.blocks : []).filter(b => b.study !== STUDY);', 'return (Array.isArray(registry.blocks) ? registry.blocks : []);']] },
  { id: 'own-explicit-record-allowed', tests: ['f.inventory'], edits: [[I, "  if (TRAJECTORY_RECORDS.some(r => r.study === STUDY)) throw new Error(", "  if (false) throw new Error("]] },
  { id: 'embedding-ignored', tests: ['e.every_parameter', 'e.naive'], edits: [[V, '  const embedding = [...cfg.embedding.entries()].map(', '  const embedding = [...cfg.embedding.entries()].slice(0, 0).map(']] },
  { id: 'acceptance-ignored', tests: ['e.every_parameter'], edits: [[V, '  const acceptance = encodeChecks(cfg.checks, \'cfg.checks\');', '  const acceptance = {};']] },
  { id: 'constants-ignored', tests: ['e.every_parameter'], edits: [[V, '  const sections = { selection: { goal, accepted, unreliableSet }, pPhase1, pPhase2, embedding, acceptance, constants: k, graph: g };', '  const sections = { selection: { goal, accepted, unreliableSet }, pPhase1, pPhase2, embedding, acceptance, constants: {}, graph: g };']] },
  { id: 'phase2-ignored', tests: ['e.every_parameter'], edits: [[V, '  const sections = { selection: { goal, accepted, unreliableSet }, pPhase1, pPhase2, embedding, acceptance, constants: k, graph: g };', '  const sections = { selection: { goal, accepted, unreliableSet }, pPhase1, pPhase2: [], embedding, acceptance, constants: k, graph: g };']] },
  { id: 'map-accepted-as-object', tests: ['e.order_and_reject'], edits: [[V, "  if (!(cfg.embedding instanceof Map)) bad('cfg.embedding', `expected a Map, got ${describe(cfg.embedding)}`);\n", '']] },
  { id: 'function-accepted', tests: ['e.order_and_reject'], edits: [[V, "    if (typeof d.value === 'function') bad(`${where}.${k}`, 'a function is not representable');\n", '']] },
];
// every anchor of every mutant must match exactly once in the real file: a mutant that cannot be built is a verifier defect
{
  const bad = [];
  for (const m of MUTANTS) for (const [file, find] of m.edits) {
    const n = fs.readFileSync(path.join(REPO, file), 'utf8').split(find).length - 1;
    if (n !== 1) bad.push(`${m.id}: ${file} matched ${n}x: ${find.slice(0, 60)}`);
    if (!file.startsWith('experiments/') || !fs.existsSync(path.join(REPO, file))) bad.push(`${m.id}: unknown file ${file}`);
  }
  for (const m of MUTANTS) for (const id of m.tests) if (!TESTS.has(id)) bad.push(`${m.id}: unknown test ${id}`);
  check('R2-A', `every mutant anchor matches exactly once (${MUTANTS.length} mutants)`, bad.length === 0, bad.join(' | '));
  if (process.env.R2_ANCHORS_ONLY) { console.log(`anchors-only: ${bad.length} problems`); process.exit(bad.length ? 1 : 0); }
}
console.log('== R2 lock, receipts, tree safety and environment identity (real implementation) ==');
const ONLY = process.env.R2_ONLY ? new RegExp(process.env.R2_ONLY) : null;      // development convenience: run a subset
for (const t of TESTS.values()) { if (ONLY && !ONLY.test(t.id)) continue; const r = await runTest(t); check(t.gate, `[${t.id}] ${t.desc}`, r.ok === true, r.detail || ''); }

console.log('\n== R2 anti-vacuity mutants (each removes one guard; the named cells must then fail) ==');
for (const m of MUTANTS) {
  if (ONLY && !m.tests.some(id => ONLY.test(id))) continue;
  MUT_EDITS = m.edits;
  const outs = [];
  for (const id of m.tests) outs.push({ id, ...(await runTest(TESTS.get(id))) });
  MUT_EDITS = [];
  const built = !outs.some(o => o.defect);
  const ok = built && outs.some(o => o.ok !== true);
  mutantResult(TESTS.get(m.tests[0]).gate, `${m.id}`, ok, !built ? 'MUTANT COULD NOT BE BUILT (verifier defect): ' + outs.find(o => o.defect).detail : outs.map(o => `${o.id} ${o.ok === true ? 'PASSED (not caught)' : o.threw ? 'threw' : 'failed as required'}`).join('; '));
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${caught}, missed ${missed}`);
fs.rmSync(ROOT, { recursive: true, force: true });
process.exit(failed === 0 && missed === 0 ? 0 : 1);

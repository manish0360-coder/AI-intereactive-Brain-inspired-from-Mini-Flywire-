// ==========================================================
// MCF-1 M-SCAN-1 verification: the scan authority, the non-executing admission stage and the candidate-block writer
// ==========================================================
//   node experiments/mcf1/verify_scan.mjs
// Exit code 0 iff every gate passed AND every anti-vacuity mutant was caught.
//
// Method.  Nothing here scans the candidate window (1,500,000,000 + 4,000), activates the real authorization,
// registers a block or runs an agent.  Scenarios run in WORLDS: temporary copies of the declared runtime closure in
// which the candidate window of config.mjs is replaced by a SYNTHETIC window (1,600,000,000 + 48, the control block
// the other verifiers already use) and, for positive controls, SCAN_AUTHORIZATION names exactly that synthetic
// window.  The verifier refuses to write any authorization literal that mentions the real candidate start.  Each
// negative cell asserts the specific guard's message; the mutants remove one guard at a time in the copied sources
// and the named cells must then fail.
// ==========================================================
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import * as CFG from './config.mjs';
import * as LCK from './lock.mjs';
import { createTrajectoryRegistry, TRAJECTORY_RECORDS, TRAJECTORY_HELD_OUT, TRAJECTORY_AUTHORIZATIONS, listSha256Of } from '../registry/typed_v2.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
let failed = 0, passed = 0, caught = 0, missed = 0;
const check = (gate, name, cond, detail = '') => { if (cond) passed++; else failed++; console.log(`${cond ? 'PASS' : 'FAIL'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const mutantResult = (gate, name, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'MUTANT-CAUGHT' : 'MUTANT-MISSED'} [${gate}] ${name}${detail ? ' :: ' + detail : ''}`); };
const H = (s) => crypto.createHash('sha256').update(s).digest('hex');
const url = (p) => pathToFileURL(p).href;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rx = (re, s) => re.test(s || '');
const refusal = async (fn) => { try { await fn(); return null; } catch (e) { return String(e && e.message ? e.message : e); } };
const TMPREAL = fs.realpathSync.native(os.tmpdir());
const ROOT = fs.mkdtempSync(path.join(TMPREAL, 'mcf1-scan-'));

const REAL_CANDIDATE = { start: 1_500_000_000, length: 4000 };      // never authorized, scanned or written by this verifier
const SCAN = { start: 1_600_000_000, length: 48 };                  // the synthetic scan window of every world
const SCAN_LITERAL = `{ start: ${SCAN.start}, length: ${SCAN.length} }`;
const D0 = 1_100_000_000;
const W_OK = { start: 1_600_000_100, length: 40 };     // 40 of 40 admitted, disjoint from SCAN
const W_REJ = { start: 1_600_000_200, length: 64 };    // 63 of 64 admitted (seed ...254 rejected: H1R_RECORDS_AND_DOMAIN), disjoint from SCAN

// ---------------- worlds ----------------
const COPY_FILES = [...LCK.SOURCE_FILES, 'experiments/mcf1/authorization.mjs', 'experiments/registry/trajectory_blocks.js'];
let worldN = 0, MUT_EDITS = [];
function applyEdit(root, [file, find, rep]) {
  const p = path.join(root, file), t = fs.readFileSync(p, 'utf8'), n = t.split(find).length - 1;
  if (n !== 1) throw new Error(`verifier defect: anchor matched ${n} times in ${file}: ${find.slice(0, 80)}`);
  fs.writeFileSync(p, t.replace(find, () => rep));
}
/** a world: authorization is null (default) or the literal text of the constant; edits are anchored source edits */
function makeWorld(o = {}) {
  const { authorization = null, edits = [] } = o;
  if (authorization !== null && /1_?500_?000_?000/.test(String(authorization))) throw new Error('verifier defect: the real candidate window must never be authorized, even in a copy');
  const root = path.join(ROOT, `w${++worldN}`);
  for (const rel of COPY_FILES) { const to = path.join(root, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(REPO, rel), to); }
  applyEdit(root, ['experiments/mcf1/config.mjs', '  start: 1_500_000_000,\n  scanLength: 4000,', `  start: ${SCAN.start},\n  scanLength: ${SCAN.length},`]);
  if (authorization !== null) applyEdit(root, ['experiments/mcf1/authorization.mjs', 'export const SCAN_AUTHORIZATION = null;', `export const SCAN_AUTHORIZATION = ${authorization};`]);
  for (const e of [...edits, ...MUT_EDITS]) applyEdit(root, e);
  const imp = (rel) => import(url(path.join(root, rel)));
  return {
    root, scan: () => imp('experiments/mcf1/scan.mjs'), lock: () => imp('experiments/mcf1/lock.mjs'), config: () => imp('experiments/mcf1/config.mjs'),
    inventory: () => imp('experiments/mcf1/inventory.mjs'), admission: () => imp('experiments/mcf1/admission.mjs'), orc: () => imp('experiments/mcf1/orchestrate.mjs'),
    run: (script, args, env = {}) => spawnSync(process.execPath, [path.join(root, script), ...args], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 180000 }),
    dest: (name) => path.join(ROOT, `dest_${worldN}_${name}`),
  };
}
const mk = (o = {}) => makeWorld(o);
const empty = (d) => !fs.existsSync(d) || fs.readdirSync(d).length === 0;
const listing = (d) => (fs.existsSync(d) ? fs.readdirSync(d).sort().join(',') : '(absent)');
/** the admission of the synthetic window by the PURE predicate of the world's own modules */
async function admissionOf(w, win = SCAN) {
  const A = await w.admission(), I = await w.inventory();
  return A.admitScan({ start: win.start, length: win.length, inventory: I.buildInventory({ exclude: [] }), category: 'registered' });
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const rehash = (adm) => { adm.summary.admittedSha256 = H(adm.admitted.join(',')); adm.sha256 = H(CFG.canonicalJson(adm.summary)); return adm; };
const rec = (value, study, status = 'registered') => ({ namespace: 'trajectory', value, study, status, authorization: 'fixture', executed: false, artifact: 'none', why: 'registry fixture' });
const blockOf = (members, study) => {
  const lo = members[0], hi = members[members.length - 1], present = new Set(members), excluded = [];
  for (let v = lo; v <= hi; v++) if (!present.has(v)) excluded.push(v);
  return { schema: 'trajectory.block/1', namespace: 'trajectory', study, status: 'registered', lo, hi, excluded, count: members.length, listSha256: listSha256Of(members), executed: false,
    authorization: 'fixture', artifact: 'none', why: 'registry fixture', configuration: { seed: 1, index: 0, acceptedSeed: 1 } };
};
const baseView = () => ({ records: [...TRAJECTORY_RECORDS], heldOut: [...TRAJECTORY_HELD_OUT], authorizations: [...TRAJECTORY_AUTHORIZATIONS], blocks: [] });
function withTmpdir(dir, fn) {
  const keys = ['TEMP', 'TMP', 'TMPDIR'], old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) process.env[k] = dir;
  const restore = () => { for (const k of keys) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } };
  try { const r = fn(); if (r && typeof r.then === 'function') return r.finally(restore); restore(); return r; } catch (e) { restore(); throw e; }
}

// ---------------- tests ----------------
const TESTS = new Map();
const def = (id, gate, desc, fn) => TESTS.set(id, { id, gate, desc, fn });
const cellsResult = (cells) => { const bad = cells.filter(c => !c[1]); return { ok: bad.length === 0, detail: bad.map(b => `${b[0]} -> ${b[2] || ''}`).join(' | ') }; };

// ---- A: authority ----
def('a.refuse', 'SCAN-A', 'inactive by default: the committed constant is null; the scan authority, the candidate policy and every injection attempt are refused by their own guard', async () => {
  const w = await mk(), L = await w.lock(), S = await w.scan();
  const cells = [];
  const run = async (name, fn, re) => { const m = await refusal(fn); cells.push([name, rx(re, m), m]); };
  await run('scanAuthorisation()', () => L.scanAuthorisation(), /MCF-1 scan refused: no scan authorization is set/);
  await run('scanAuthorisation(window) ignores its argument', () => L.scanAuthorisation({ start: SCAN.start, length: SCAN.length }), /no scan authorization is set/);
  await run('candidate policy', () => S.stageAdmit({ policy: 'candidate' }), /no scan authorization is set/);
  await run('candidate + authorization option', () => S.stageAdmit({ policy: 'candidate', authorization: { start: SCAN.start, length: SCAN.length } }), /unknown argument\(s\) authorization/);
  await run('candidate + scanAuthorization option', () => S.stageAdmit({ policy: 'candidate', scanAuthorization: SCAN }), /unknown argument\(s\) scanAuthorization/);
  await run('candidate + registry option', () => S.stageAdmit({ policy: 'candidate', registry: {} }), /unknown argument\(s\) registry/);
  await run('candidate + window', () => S.stageAdmit({ policy: 'candidate', start: SCAN.start, length: SCAN.length }), /takes no window and no inventory/);
  await run('candidate + inventory', () => S.stageAdmit({ policy: 'candidate', inventory: { classes: [], derived: new Set() } }), /takes no window and no inventory/);
  await run('development over the candidate window', () => S.stageAdmit({ policy: 'development', start: SCAN.start, length: SCAN.length, inventory: {} }), /candidate confirmatory block is not authorised/);
  await run('official without a record', () => S.stageAdmit({ policy: 'official', start: SCAN.start, length: SCAN.length, inventory: {} }), /official stage refused/);
  await run('unknown policy', () => S.stageAdmit({ policy: 'scan', start: SCAN.start, length: 1, inventory: {} }), /unknown policy scan/);
  await run('non-object arguments', () => S.stageAdmit(null), /arguments must be an object/);
  // environment and global injection are not authority
  process.env.MCF1_SCAN_AUTHORIZED = '1'; process.env.SCAN_AUTHORIZATION = JSON.stringify(SCAN); globalThis.SCAN_AUTHORIZATION = SCAN;
  try { await run('environment and global injection', () => S.stageAdmit({ policy: 'candidate' }), /no scan authorization is set/); }
  finally { delete process.env.MCF1_SCAN_AUTHORIZED; delete process.env.SCAN_AUTHORIZATION; delete globalThis.SCAN_AUTHORIZATION; }
  return cellsResult(cells);
});
const MALFORMED = [
  ["'1600000000'", /not exactly the two documented declarations/],
  ['[1600000000, 48]', /not exactly the two documented declarations/],
  ['{ start: 1600000000, length: 48, extra: 1 }', /not exactly the two documented declarations/],
  ['{ start: -1, length: 48 }', /not exactly the two documented declarations/],
  ['{ start: 1600000000.5, length: 48 }', /not exactly the two documented declarations/],
  ['{ start: 1600000000, length: 48 };\nglobalThis.__scanHack = 1', /not exactly the two documented declarations/],
  ['null;\nexport const EXTRA = 1', /not exactly the two documented declarations/],
  ['{ start: 1600000000, length: 49 }', /does not equal the candidate window recorded in config\.mjs/],
  ['{ start: 1600000001, length: 48 }', /does not equal the candidate window recorded in config\.mjs/],
  ['{ start: 1600000000, length: 0 }', /scan authorization window is malformed/],
  ['{ start: 4294967295, length: 48 }', /scan authorization window is malformed/],
];
def('a.malformed', 'SCAN-A', 'malformed or active-looking authorization literals are refused: wrong type, extra key, negative, fractional, trailing code, another window, empty or overflowing window', async () => {
  const cells = [];
  for (const [literal, re] of MALFORMED) {
    const w = await mk({ authorization: literal }), L = await w.lock(), S = await w.scan();
    const a = await refusal(() => L.scanAuthorisation()), b = await refusal(() => S.stageAdmit({ policy: 'candidate' }));
    cells.push([literal.replace(/\n/g, ' '), rx(re, a) && rx(re, b), a]);
  }
  return cellsResult(cells);
});
def('a.active', 'SCAN-A', 'positive control in a synthetic world: the authorization naming exactly the synthetic window yields the registered admission of that window, identical to the pure predicate and deterministic; nothing else becomes possible', async () => {
  const w = await mk({ authorization: SCAN_LITERAL }), L = await w.lock(), S = await w.scan();
  const win = L.scanAuthorisation();
  const r1 = S.stageAdmit({ policy: 'candidate' }), r2 = S.stageAdmit({ policy: 'candidate' });
  const direct = await admissionOf(w);
  const dev = await refusal(() => S.stageAdmit({ policy: 'development', start: SCAN.start, length: SCAN.length, inventory: {} }));
  const real = await refusal(() => S.stageAdmit({ policy: 'development', start: REAL_CANDIDATE.start, length: REAL_CANDIDATE.length, inventory: {} }));
  const off = await refusal(() => S.stageAdmit({ policy: 'candidate', start: SCAN.start, length: SCAN.length }));
  const realFile = fs.readFileSync(path.join(REPO, 'experiments/mcf1/authorization.mjs'), 'utf8');
  return win.start === SCAN.start && win.length === SCAN.length && r1.summary.category === 'registered' && r1.summary.start === SCAN.start && r1.summary.length === SCAN.length
    && r1.admitted.length > 40 && same(r1.admitted, direct.admitted) && r1.sha256 === direct.sha256 && r1.sha256 === r2.sha256 && r1.scan.policy === 'candidate'
    && rx(/candidate confirmatory block is not authorised/, dev) && rx(/confined to the exploratory development domain|candidate confirmatory block/, real) && rx(/takes no window/, off)
    && /export const SCAN_AUTHORIZATION = null;/.test(realFile);
});
def('a.cli', 'SCAN-A', 'real process: the CLI cannot start a candidate scan: development over the candidate window, the candidate policy, a window flag, a missing or unknown policy, an environment hint and the orchestrator all refuse and create nothing', async () => {
  const w = await mk();
  const cells = [];
  const run = (name, script, args, re, code, env) => {
    const out = w.dest(name.replace(/\W+/g, '_')), argv = args.map(a => (a === '@OUT' ? out : a)), r = w.run(script, argv, env);
    cells.push([name, r.status !== 0 && (code === undefined || r.status === code) && rx(re, r.stderr) && !fs.existsSync(out), `status ${r.status} ${String(r.stderr).trim().split('\n')[0]}`]);
  };
  const S = 'experiments/mcf1/scan.mjs', O = 'experiments/mcf1/orchestrate.mjs', win = ['--start', String(SCAN.start), '--length', String(SCAN.length)];
  run('development over the candidate window', S, ['admit', '--policy', 'development', ...win, '--out', '@OUT'], /candidate confirmatory block is not authorised/, 1);
  run('candidate policy', S, ['admit', '--policy', 'candidate'], /no scan authorization is set/, 1);
  run('candidate policy + window', S, ['admit', '--policy', 'candidate', ...win], /accepts no --start, --length/, 2);
  run('candidate policy + out', S, ['admit', '--policy', 'candidate', '--out', '@OUT'], /accepts no --out/, 2);
  run('no policy', S, ['admit', ...win, '--out', '@OUT'], /policy must be/, 2);
  run('official policy', S, ['admit', '--policy', 'official', ...win, '--out', '@OUT'], /policy must be/, 2);
  run('environment hint', S, ['admit', '--policy', 'candidate'], /no scan authorization is set/, 1, { MCF1_SCAN_AUTHORIZED: '1', SCAN_AUTHORIZATION: JSON.stringify(SCAN) });
  run('write-block of a missing admission', S, ['write-block', '--admission', path.join(ROOT, 'nope.json'), '--dest', '@OUT'], /ENOENT|no such file/, 1);
  run('orchestrator, candidate mode', O, ['admit', '--mode', 'candidate', '--out', '@OUT', ...win], /unknown policy candidate/, 1);
  run('orchestrator, development over the candidate window', O, ['admit', '--mode', 'development', ...win, '--out', '@OUT'], /candidate confirmatory block is not authorised/, 1);
  return cellsResult(cells);
});

// ---- B: structure ----
const FORBIDDEN_MODULES = ['orchestrate.mjs', 'driver.mjs', 'analyze.mjs', 'frame.mjs', 'validity.mjs', 'episodes.mjs', 'prepare_tree.mjs', 'build_tree.mjs', 'conformance_transform.mjs', 'runtime.mjs', 'measure.mjs', 'measure_install.mjs'];
const FORBIDDEN_NODE = ['node:child_process', 'child_process', 'node:worker_threads', 'node:cluster', 'node:vm', 'node:net', 'node:http', 'node:https', 'node:dgram'];
function closureOf(root, entry) {
  const seen = new Map(), rxs = [/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g, /(?:^|[;\n])\s*import\s*['"]([^'"]+)['"]/g, /import\(\s*['"]([^'"]+)['"]\s*\)/g, /require\(\s*['"]([^'"]+)['"]\s*\)/g];
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const walk = (rel) => {
    if (seen.has(rel)) return;
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { seen.set(rel, { node: [] }); return; }
    const t = strip(fs.readFileSync(abs, 'utf8')), node = [];
    seen.set(rel, { node });
    if (!/\.m?js$/.test(rel)) return;
    for (const r of rxs) { r.lastIndex = 0; let m; while ((m = r.exec(t))) { const sp = m[1];
      if (!sp.startsWith('.') && !/^(experiments|instrumentation)\//.test(sp)) { node.push(sp); continue; }
      const target = sp.startsWith('.') ? path.relative(root, path.resolve(path.dirname(abs), sp)).split(path.sep).join('/') : sp;
      walk(target); } }
  };
  walk(entry);
  return seen;
}
def('b.closure', 'SCAN-B', 'structural separation: the import closure of the admission stage contains no orchestrator, driver, runtime, measurement layer, tree builder, episode contents, validity rules, frame or analysis and imports no process, thread, network or vm module; the orchestrator depends on it, never the reverse', async () => {
  const w = await mk();
  const c = closureOf(w.root, 'experiments/mcf1/scan.mjs');
  const files = [...c.keys()];
  const forbiddenFiles = files.filter(f => FORBIDDEN_MODULES.includes(path.basename(f)));
  const forbiddenNode = files.flatMap(f => c.get(f).node.filter(n => FORBIDDEN_NODE.includes(n)).map(n => `${f}:${n}`));
  const expected = ['experiments/mcf1/config.mjs', 'experiments/mcf1/inventory.mjs', 'experiments/mcf1/admission.mjs', 'experiments/mcf1/lock.mjs', 'experiments/registry/typed_v2.js'].every(f => c.has(f));
  const orcImportsScan = /from\s*'\.\/scan\.mjs'/.test(fs.readFileSync(path.join(w.root, 'experiments/mcf1/orchestrate.mjs'), 'utf8'));
  const scanSrc = fs.readFileSync(path.join(w.root, 'experiments/mcf1/scan.mjs'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const noSpawnTokens = !/\b(spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(|child_process/.test(scanSrc);
  return { ok: forbiddenFiles.length === 0 && forbiddenNode.length === 0 && expected && orcImportsScan && noSpawnTokens, detail: `forbidden ${forbiddenFiles.join(',')} node ${forbiddenNode.join(',')} expected ${expected} orchestratorUsesScan ${orcImportsScan} noSpawn ${noSpawnTokens}` };
});
def('b.isolation', 'SCAN-B', 'the registry import-isolation scanner finds no reference to the legacy registry in any harness file of the world: a file that was untracked when an earlier gate ran would be a violation once committed', async () => {
  const w = await mk(), G = await import(url(path.join(REPO, 'experiments/registry/import_isolation.js')));
  const dir = path.join(w.root, 'experiments/mcf1');
  const findings = fs.readdirSync(dir).filter(n => n.endsWith('.mjs')).map(n => [n, G.scanSource(`experiments/mcf1/${n}`, fs.readFileSync(path.join(dir, n), 'utf8'))]).filter(([, r]) => r.hard.length > 0 || r.mentions.length > 0);
  return { ok: findings.length === 0, detail: findings.map(([n, r]) => `${n}: ${JSON.stringify([...r.hard, ...r.mentions].slice(0, 2))}`).join(' | ') };
});
def('b.trap', 'SCAN-B', 'dynamic isolation: running a development admission, a candidate admission and the writer spawns no process and opens no outcome, cache, manifest or receipt file (decoys are planted where an executor would write them)', async () => {
  const w = await mk({ authorization: SCAN_LITERAL });
  const dataDir = path.join(w.root, 'experiments/mcf1/data');
  const decoys = ['cache_Q.jsonl', 'cache_V.jsonl', 'cache_O.jsonl', 'validity_manifest.json', 'outcome_manifest.json', 'qualified.json', 'analysis.json', 'receipts.json', path.join('official', 'deadbeefdeadbeef', 'receipts.json')];
  for (const d of decoys) { const p = path.join(dataDir, d); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, '{"decoy":true}\n'); }
  const cp = await import('node:child_process');
  const spawned = [], reads = [], origCp = {}, origFs = {};
  for (const n of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) { origCp[n] = cp.default[n]; cp.default[n] = (...a) => { spawned.push(n); throw new Error(`TRAP: child_process.${n}`); }; }
  for (const n of ['readFileSync', 'openSync', 'readdirSync', 'createReadStream', 'readFile']) { origFs[n] = fs[n]; fs[n] = function (...a) { reads.push(String(a[0])); return origFs[n].apply(this, a); }; }
  let err = null, outcome = null;
  try {
    const S = await w.scan(), I = await w.inventory();
    const cand = S.stageAdmit({ policy: 'candidate' });
    S.stageAdmit({ policy: 'development', start: D0, length: 20, inventory: S.stageInventory({ policy: 'development' }) });
    outcome = S.writeCandidateBlock({ admission: cand, destination: w.dest('trap') });
    void I;
  } catch (e) { err = e; }
  finally { for (const n of Object.keys(origCp)) cp.default[n] = origCp[n]; for (const n of Object.keys(origFs)) fs[n] = origFs[n]; }
  const norm = (p) => p.split(path.sep).join('/');
  const touchedDecoy = reads.map(norm).filter(r => /\/experiments\/mcf1\/data\/(cache_|validity_|outcome_|qualified|analysis|receipts|official\/)/.test(r) || /receipts\.json|cache_[QVO]\.jsonl|outcome_manifest|validity_manifest/.test(r));
  return { ok: err === null && spawned.length === 0 && touchedDecoy.length === 0 && outcome !== null && outcome.count > 0, detail: `err ${err && err.message} spawned ${spawned.join(',')} decoyReads ${touchedDecoy.slice(0, 3).join(',')}` };
});
def('b.deterministic', 'SCAN-B', 'determinism and independent verifiability: two scans, a rebuilt inventory and a fresh module instance give one list and one hash; every scanned seed is accounted for once in ascending order with named reasons; the written artifact re-verifies by recomputation', async () => {
  const w = await mk({ authorization: SCAN_LITERAL }), S = await w.scan();
  const a = S.stageAdmit({ policy: 'candidate' }), b = S.stageAdmit({ policy: 'candidate' });
  const w2 = await mk({ authorization: SCAN_LITERAL }), S2 = await w2.scan(), c = S2.stageAdmit({ policy: 'candidate' });
  const seen = new Set(), ascending = (arr) => arr.every((v, i) => i === 0 || v > arr[i - 1]);
  for (const v of a.admitted) seen.add(v);
  for (const r of a.rejected) seen.add(r.raw);
  const accounted = seen.size === SCAN.length && ascending(a.admitted) && ascending(a.rejected.map(r => r.raw)) && a.rejected.every(r => r.reasons.length > 0 && typeof r.reasons[0] === 'string')
    && a.summary.admitted + a.summary.rejected === a.summary.scanned && a.summary.admittedSha256 === H(a.admitted.join(','));
  const dest = w.dest('det'), out = S.writeCandidateBlock({ admission: a, destination: dest });
  const artifact = JSON.parse(fs.readFileSync(out.file, 'utf8'));
  const verified = S.verifyCandidateArtifact(artifact, { recompute: true });
  return a.sha256 === b.sha256 && a.sha256 === c.sha256 && same(a.admitted, c.admitted) && same(a.rejected, c.rejected) && accounted && verified === true
    && artifact.block.count === a.admitted.length && artifact.block.listSha256 === a.summary.admittedSha256 && artifact.block.lo === a.admitted[0] && artifact.block.hi === a.admitted[a.admitted.length - 1];
});

// ---- W: the writer ----
def('w.valid', 'SCAN-W', 'a validated admission is written once, atomically, to a synthetic destination; the artifact re-verifies; the rendered module loads and the registry accepts it, deciding AVAILABLE before and REPRODUCTION after; the destination is never overwritten', async () => {
  const w = await mk(), S = await w.scan(), adm = await admissionOf(w, W_OK);
  const dest = w.dest('valid');
  const out = S.writeCandidateBlock({ admission: adm, destination: dest });
  const art = JSON.parse(fs.readFileSync(out.file, 'utf8'));
  const modFile = path.join(dest, 'trajectory_blocks.rendered.mjs');
  fs.writeFileSync(modFile, S.renderBlocksModule([art.block]));
  const mod = await import(url(modFile));
  const base = baseView();
  const T = await import(url(path.join(w.root, 'experiments/registry/typed_v2.js')));     // the world's own registry module: identities are branded per module instance
  const before = T.createTrajectoryRegistry({ ...base, blocks: [] }), after = T.createTrajectoryRegistry({ ...base, blocks: [...mod.TRAJECTORY_BLOCKS] });
  const ids = adm.admitted.map(v => T.trajectorySeed(v));
  const b = ids.every(id => before.checkUse(id, { study: 'MCF-1', category: 'registered' }).decision === 'AVAILABLE');
  const a = ids.every(id => after.checkUse(id, { study: 'MCF-1', category: 'registered' }).decision === 'REPRODUCTION');
  const again = await refusal(() => S.writeCandidateBlock({ admission: adm, destination: dest }));
  const second = S.writeCandidateBlock({ admission: adm, destination: w.dest('valid2') });
  return S.verifyCandidateArtifact(art, { recompute: true }) === true && art.block.count === adm.admitted.length && art.block.study === 'MCF-1' && art.block.executed === false
    && same(T.memberListOf(mod.TRAJECTORY_BLOCKS[0]), adm.admitted) && b && a && after.digest() === art.registry.digestAfter && before.digest() === art.registry.digestBefore
    && rx(/already exists at this destination/, again) && second.sha256 === out.sha256 && listing(dest).split(',').sort().join() === ['block_candidate.json', 'trajectory_blocks.rendered.mjs'].join();
});
def('w.corrupt', 'SCAN-W', 'corrupted admission input is refused by its own guard and leaves nothing behind: hashes, counts, ordering, duplicates, window bounds, accounting, category, study, schema, a stale result hash, a consistent-but-wrong list', async () => {
  const w = await mk(), S = await w.scan(), adm = await admissionOf(w, W_REJ);
  const cells = [], r0 = adm.rejected.length;
  const cell = async (name, mutate, re) => {
    const dest = w.dest(`c_${cells.length}`), a = clone(adm); mutate(a);
    const m = await refusal(() => S.writeCandidateBlock({ admission: a, destination: dest }));
    cells.push([name, rx(re, m) && empty(dest), `${m} :: ${listing(dest)}`]);
  };
  await cell('admitted hash wrong', (a) => { a.summary.admittedSha256 = H('x'); a.sha256 = H(CFG.canonicalJson(a.summary)); }, /admitted-list hash does not match/);
  await cell('admitted count wrong', (a) => { a.summary.admitted += 1; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /admitted count does not equal the list length/);
  await cell('rejected count wrong', (a) => { a.summary.rejected += 1; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /rejected count does not equal/);
  await cell('scanned count wrong', (a) => { a.summary.scanned += 1; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /window arithmetic is inconsistent/);
  await cell('last raw wrong', (a) => { a.summary.lastRaw += 1; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /window arithmetic is inconsistent/);
  await cell('unsorted list', (a) => { [a.admitted[2], a.admitted[3]] = [a.admitted[3], a.admitted[2]]; rehash(a); }, /strictly ascending/);
  await cell('duplicate seed', (a) => { a.admitted[3] = a.admitted[2]; rehash(a); }, /strictly ascending/);
  await cell('seed outside the window', (a) => { a.admitted[a.admitted.length - 1] = a.summary.start + a.summary.length + 5; rehash(a); }, /outside the scanned window/);
  await cell('empty list', (a) => { a.admitted = []; a.summary.admitted = 0; a.summary.rejected = a.summary.scanned; a.rejected = []; a.summary.admittedSha256 = H(''); a.sha256 = H(CFG.canonicalJson(a.summary)); }, /empty admitted list/);
  await cell('development category', (a) => { a.summary.category = 'development'; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /only a "registered" admission/);
  await cell('another study', (a) => { a.summary.study = 'MCF-2'; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /is for study MCF-2/);
  await cell('wrong schema', (a) => { a.summary.schema = 'mcf1.admission/9'; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /wrong schema/);
  await cell('stale result hash', (a) => { a.summary.lag0Coincidences += 1; }, /result hash does not match its summary/);
  await cell('malformed object', (a) => { delete a.admitted; }, /malformed/);
  if (r0 > 0) {
    await cell('a rejected seed is also admitted', (a) => { a.rejected[0].raw = a.admitted[0]; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /both admitted and rejected/);
    await cell('a rejected seed outside the window', (a) => { a.rejected[0].raw = a.summary.start - 1; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /outside the scanned window/);
  }
  await cell('accounting gap', (a) => { a.rejected = a.rejected.slice(0, a.rejected.length - 1); a.summary.rejected = a.rejected.length; a.sha256 = H(CFG.canonicalJson(a.summary)); }, /must equal the number scanned/);
  // internally consistent but NOT the committed predicate's result: caught only by deterministic recomputation
  await cell('consistent but wrong list', (a) => {
    const drop = a.admitted[5]; a.admitted.splice(5, 1); a.summary.admitted -= 1; a.summary.rejected += 1;
    a.rejected.push({ raw: drop, reasons: ['lag0'] }); a.rejected.sort((x, y) => x.raw - y.raw); rehash(a);
  }, /not reproduced by the committed predicate/);
  return cellsResult(cells);
});
def('w.artifact', 'SCAN-W', 'a written or tampered artifact is re-verified independently: its own hash, the block recomputed from its hull and exclusions (count, list hash), status, execution flag, configuration identity, admission agreement, shape', async () => {
  const w = await mk(), S = await w.scan(), adm = await admissionOf(w, W_OK);
  const dest = w.dest('art'), out = S.writeCandidateBlock({ admission: adm, destination: dest });
  const good = JSON.parse(fs.readFileSync(out.file, 'utf8'));
  const reh = (a) => { const { sha256: _s, ...b } = a; a.sha256 = H(CFG.canonicalJson(b)); return a; };
  const cells = [];
  const cell = (name, mutate, re, recompute = false) => { const a = clone(good); mutate(a); let m = null; try { S.verifyCandidateArtifact(a, { recompute }); } catch (e) { m = e.message; } cells.push([name, rx(re, m), m]); };
  cell('count edited, hash stale', (a) => { a.block.count += 1; }, /own hash/);
  cell('count edited, re-hashed', (a) => { a.block.count += 1; reh(a); }, /count does not match its hull and exclusions/);
  cell('list hash edited, re-hashed', (a) => { a.block.listSha256 = H('x'); reh(a); }, /list hash does not match its members/);
  cell('exclusion added, re-hashed', (a) => { a.block.excluded = [...a.block.excluded, a.block.lo + 1]; reh(a); }, /count does not match its hull and exclusions|list hash does not match/);
  cell('hull extended, re-hashed', (a) => { a.block.hi += 3; reh(a); }, /count does not match its hull and exclusions/);
  cell('status edited', (a) => { a.block.status = 'development'; reh(a); }, /registered, unexecuted MCF-1 block/);
  cell('executed edited', (a) => { a.block.executed = true; reh(a); }, /registered, unexecuted MCF-1 block/);
  cell('study edited', (a) => { a.block.study = 'MCF-2'; reh(a); }, /registered, unexecuted MCF-1 block/);
  cell('configuration edited', (a) => { a.block.configuration.seed = 1; reh(a); }, /not the study configuration/);
  cell('admission hash edited', (a) => { a.admission.admittedSha256 = H('y'); reh(a); }, /admission and block disagree/);
  cell('study configuration hash edited', (a) => { a.identity.studyConfigurationSha256 = H('z'); reh(a); }, /another study configuration/);
  cell('destination kind edited', (a) => { a.destinationKind = 'official'; reh(a); }, /only a synthetic/);
  cell('extra key', (a) => { a.extra = 1; reh(a); }, /unexpected or missing keys/);
  cell('block key removed', (a) => { delete a.block.why; reh(a); }, /block record has unexpected or missing keys/);
  cell('recorded admission hash edited (recompute)', (a) => { a.admission.sha256 = H('w'); reh(a); }, /not reproduced by the committed admission predicate/, true);
  cells.push(['untampered artifact verifies (with recomputation)', S.verifyCandidateArtifact(clone(good), { recompute: true }) === true]);
  return cellsResult(cells);
});
def('w.registry', 'SCAN-W', 'registry fixtures: a member recorded by another study, inside another study\'s block, held out, already recorded for MCF-1 (same or another category), an existing MCF-1 block and an inconsistent registry are all refused; nothing is written', async () => {
  const w = await mk(), S = await w.scan(), adm = await admissionOf(w, W_OK);
  const m = adm.admitted[6], cells = [];
  const cell = async (name, view, re) => {
    const dest = w.dest(`r_${cells.length}`);
    const msg = await refusal(() => S.writeCandidateBlock({ admission: adm, destination: dest, registryView: view }));
    cells.push([name, rx(re, msg) && empty(dest), `${msg} :: ${listing(dest)}`]);
  };
  const v = (extra = {}) => ({ ...baseView(), ...extra });
  await cell('explicit record of another study', v({ records: [...baseView().records, rec(m, 'OTHER-STUDY')] }), /member \d+ is not available in the registry \(REFUSED:CONSUMED_BY_OTHER_STUDY\)/);
  await cell('another study\'s block contains a member', v({ blocks: [blockOf([m], 'OTHER-STUDY')] }), /is not available in the registry \(REFUSED:CONSUMED_BY_OTHER_STUDY\)/);
  await cell('held-out range covers a member', v({ heldOut: [...baseView().heldOut, { lo: m, hi: m, authorization: 'fixture', why: 'fixture' }] }), /is not available in the registry \(REFUSED:HELD_OUT\)/);
  await cell('member recorded for MCF-1 under another category', v({ records: [...baseView().records, rec(m, 'MCF-1', 'development')] }), /is not available in the registry \(REFUSED:CATEGORY_TRANSITION\)/);
  await cell('member already recorded for MCF-1', v({ records: [...baseView().records, rec(m, 'MCF-1')] }), /is not available in the registry \(REPRODUCTION\)/);
  await cell('an MCF-1 block already exists', v({ blocks: [blockOf([adm.admitted[0] - 7000, adm.admitted[0] - 6999], 'MCF-1')] }), /already holds a MCF-1 block/);
  await cell('inconsistent existing registry', v({ records: [...baseView().records, rec(SCAN.start - 5000, 'OTHER-STUDY'), rec(SCAN.start - 5000, 'OTHER-STUDY')] }), /existing registry is not consistent/);
  return cellsResult(cells);
});
def('w.destination', 'SCAN-W', 'destination policy: only experiments/mcf1/data and the temporary directory; the registry directory, the registry module, files, traversal and paths outside the roots are refused before any validation or write', async () => {
  const w = await mk(), S = await w.scan(), adm = await admissionOf(w, W_OK);
  const cells = [];
  const refused = async (name, d, re = /MCF-1 scan refused/) => {
    const msg = await refusal(() => S.writeCandidateBlock({ admission: adm, destination: d }));
    const made = typeof d === 'string' && d !== '' && fs.existsSync(path.join(d, 'block_candidate.json'));
    cells.push([name, rx(re, msg) && !made, msg]);
  };
  await refused('the registry directory', path.join(w.root, 'experiments/registry'), /official registry directory is never a destination/);
  await refused('the registry module path', path.join(w.root, 'experiments/registry/trajectory_blocks.js'), /not a directory|official registry directory/);
  await refused('a path inside the registry directory', path.join(w.root, 'experiments/registry/sub'), /official registry directory is never a destination/);
  await refused('empty', '', /destination directory is required/);
  await refused('not a string', 42, /destination directory is required/);
  // outside both roots: a sandboxed temporary directory so that the "outside" path is harmless when a mutant lets it through
  const sbx = path.join(ROOT, `sbx${worldN}`), sbxTmp = path.join(sbx, 'tmp'), outside = path.join(sbx, 'outside');
  fs.mkdirSync(sbxTmp, { recursive: true });
  await withTmpdir(sbxTmp, async () => {
    await refused('outside the roots', outside, /destination must be inside experiments\/mcf1\/data or the temporary directory/);
    await refused('traversal out of the temporary directory', path.join(sbxTmp, '..', 'outside2'), /destination must be inside/);
    await refused('the world root', w.root, /destination must be inside/);
  });
  const okA = (() => { try { return S.writeCandidateBlock({ admission: adm, destination: w.dest('ok_tmp') }).count > 0; } catch (e) { return false; } })();
  const okB = (() => { try { return S.writeCandidateBlock({ admission: adm, destination: path.join(w.root, 'experiments/mcf1/data/scan_fixture') }).count > 0; } catch (e) { return false; } })();
  cells.push(['allowed: temporary directory', okA], ['allowed: experiments/mcf1/data', okB]);
  return cellsResult(cells);
});
def('w.real_destination', 'SCAN-W', 'the real repository: the registry directory, the registry module, the repository root and the tracked harness directory are refused as destinations', async () => {
  const S = await import(url(path.join(REPO, 'experiments/mcf1/scan.mjs')));
  const dummy = { summary: {}, admitted: [], rejected: [], sha256: '' };
  const cells = [];
  for (const d of ['experiments/registry', 'experiments/registry/trajectory_blocks.js', '.', 'experiments/mcf1', 'experiments/h1r']) {
    const m = await refusal(() => S.writeCandidateBlock({ admission: dummy, destination: path.join(REPO, d) }));
    cells.push([d, rx(/MCF-1 scan refused: (the official registry directory|the destination must be inside|the destination is not a directory)/, m), m]);
  }
  return cellsResult(cells);
});
def('w.candidate_window', 'SCAN-W', 'a block over the candidate window is refused without the committed authorization, refused for any window that merely overlaps it, and accepted only for exactly the authorized window', async () => {
  const wNull = await mk(), Sn = await wNull.scan();
  const admExact = await admissionOf(wNull, SCAN);                   // the pure predicate over the (synthetic) candidate window
  const m1 = await refusal(() => Sn.writeCandidateBlock({ admission: admExact, destination: wNull.dest('cw1') }));
  const wOn = await mk({ authorization: SCAN_LITERAL }), So = await wOn.scan();
  const admOverlap = await admissionOf(wOn, { start: SCAN.start - 8, length: 48 });
  const m2 = await refusal(() => So.writeCandidateBlock({ admission: admOverlap, destination: wOn.dest('cw2') }));
  const ok = So.writeCandidateBlock({ admission: await admissionOf(wOn, SCAN), destination: wOn.dest('cw3') });
  return rx(/no scan authorization is set/, m1) && empty(wNull.dest('cw1')) && rx(/must equal the authorized scan window exactly/, m2) && empty(wOn.dest('cw2')) && ok.count > 40;
});
def('w.interrupt', 'SCAN-W', 'failed and interrupted writes fail closed: a crash before the rename leaves no block, a lock and a temporary file that make a retry refuse; a crash after it leaves the block and a lock; a failing write or a corrupt read-back leaves no block, no temporary file and no lock', async () => {
  const childSrc = (w, dest) => `const S = await import(${JSON.stringify(url(path.join(w.root, 'experiments/mcf1/scan.mjs')))}); const A = await import(${JSON.stringify(url(path.join(w.root, 'experiments/mcf1/admission.mjs')))}); const I = await import(${JSON.stringify(url(path.join(w.root, 'experiments/mcf1/inventory.mjs')))});\n`
    + `const adm = A.admitScan({ start: ${W_OK.start}, length: ${W_OK.length}, inventory: I.buildInventory({ exclude: [] }), category: 'registered' });\n`
    + `try { const r = S.writeCandidateBlock({ admission: adm, destination: ${JSON.stringify(dest)} }); console.log('WROTE ' + r.count); } catch (e) { console.log('REFUSED ' + e.message); process.exit(3); }`;
  const child = (w, dest) => spawnSync(process.execPath, ['--input-type=module', '-e', childSrc(w, dest)], { encoding: 'utf8', timeout: 180000 });
  const cells = [], RENAME = '    fs.renameSync(tmp, file);', RETURN = "    return { file, sha256: artifact.sha256, count: artifact.block.count };";
  // (1) crash before the rename
  const w1 = await mk({ edits: [['experiments/mcf1/scan.mjs', RENAME, '    process.exit(97);']] }), d1 = w1.dest('i1');
  const r1 = child(w1, d1);
  const l1 = listing(d1);
  const clean = await mk(), retry = child(clean, d1);
  const retryRefused = retry.status === 3 && /lock is present/.test(retry.stdout);
  fs.rmSync(path.join(d1, 'block_candidate.json.lock'), { force: true }); fs.rmSync(path.join(d1, 'block_candidate.json.tmp'), { force: true });
  const retryOk = child(clean, d1);
  cells.push(['crash before rename', r1.status === 97 && l1 === 'block_candidate.json.lock,block_candidate.json.tmp' && retryRefused && /WROTE/.test(retryOk.stdout) && listing(d1) === 'block_candidate.json']);
  // (2) crash after the rename: the block is whole, the lock remains, a retry is refused (exists)
  const w2 = await mk({ edits: [['experiments/mcf1/scan.mjs', RETURN, '    process.exit(98);']] }), d2 = w2.dest('i2');
  const r2 = child(w2, d2);
  const art = fs.existsSync(path.join(d2, 'block_candidate.json')) ? JSON.parse(fs.readFileSync(path.join(d2, 'block_candidate.json'), 'utf8')) : null;
  const S2 = await clean.scan();
  cells.push(['crash after rename', r2.status === 98 && art !== null && S2.verifyCandidateArtifact(art) === true && fs.existsSync(path.join(d2, 'block_candidate.json.lock')) && /already exists/.test(child(clean, d2).stdout)]);
  // (3) a failing write: no block, no temporary file, no lock
  const w3 = await mk({ edits: [['experiments/mcf1/scan.mjs', RENAME, "    throw new Error('disk full');"]] }), d3 = w3.dest('i3');
  const r3 = child(w3, d3);
  cells.push(['failing write', r3.status === 3 && /disk full/.test(r3.stdout) && empty(d3)]);
  // (4) a corrupt temporary file is caught by the read-back before it can become visible
  const w4 = await mk({ edits: [['experiments/mcf1/scan.mjs', '    const text = `${canonicalJson(artifact)}\\n`;', '    const text = `${canonicalJson(artifact)}\\n`.replace(\'"count"\', \'"c0unt"\');']] }), d4 = w4.dest('i4');
  const r4 = child(w4, d4);
  cells.push(['corrupt read-back', r4.status === 3 && /unexpected or missing keys|own hash/.test(r4.stdout) && empty(d4)]);
  return cellsResult(cells);
});

// ---------------- run ----------------
const SC = 'experiments/mcf1/scan.mjs', LK = 'experiments/mcf1/lock.mjs';
const rm = (file, find) => [file, find, ''];
const MUTANTS = [
  { id: 'scan-null-unchecked', tests: ['a.refuse'], edits: [rm(LK, "  if (S === null) scanFail('no scan authorization is set: the candidate window cannot be scanned');\n")] },
  { id: 'scan-template-unchecked', tests: ['a.malformed'], edits: [rm(LK, "  if (!pinModuleShapeOk(text)) scanFail('authorization.mjs is not exactly the two documented declarations');\n")] },
  { id: 'scan-window-unchecked', tests: ['a.malformed'], edits: [rm(LK, "  if (S.start !== BLOCK.start || S.length !== BLOCK.scanLength) scanFail('the scan authorization does not equal the candidate window recorded in config.mjs');\n")] },
  { id: 'scan-bounds-unchecked', tests: ['a.malformed'], edits: [rm(LK, "  if (!Number.isSafeInteger(S.start) || !Number.isSafeInteger(S.length) || S.start < 0 || S.length < 1 || S.start + S.length > 2 ** 32) scanFail('the scan authorization window is malformed');\n")] },
  { id: 'candidate-takes-window', tests: ['a.refuse'], edits: [rm(SC, "    if (start !== undefined || length !== undefined || inventory !== undefined) refuse('a candidate scan takes no window and no inventory: both come from committed state');\n")] },
  { id: 'stage-accepts-extra-arguments', tests: ['a.refuse'], edits: [rm(SC, "  if (extra.length) admitRefuse(`unknown argument(s) ${extra.join(', ')} (no authorization, registry or option can be passed)`);\n")] },
  { id: 'development-guard-removed', tests: ['a.refuse', 'a.cli'], edits: [[SC, 'if (!p.ok) throw new Error(`MCF-1 admission refused: ${p.why}`);', '']] },
  { id: 'cli-candidate-flags-accepted', tests: ['a.cli'], edits: [[SC, "      if (named.length) { console.error(`MCF-1 scan refused: a candidate scan accepts no --${named.join(', --')} (the window comes from the committed authorization)`); process.exit(2); }\n", '']] },
  { id: 'scan-imports-orchestrator', tests: ['b.closure'], edits: [[SC, "import fs from 'node:fs';\n", "import fs from 'node:fs';\nimport './orchestrate.mjs';\n"]] },
  { id: 'scan-imports-child-process', tests: ['b.closure'], edits: [[SC, "import fs from 'node:fs';\n", "import fs from 'node:fs';\nimport { spawn as __spawn } from 'node:child_process';\n"]] },
  { id: 'scan-names-legacy-registry', tests: ['b.isolation'], edits: [[SC, "import fs from 'node:fs';\n", "import fs from 'node:fs';\nconst __legacyName = 'experiments/registry/typed.js';\nconst __load = (p) => import(p);\nvoid __legacyName; void __load;\n"]] },
  { id: 'scan-spawns-a-process', tests: ['b.trap'], edits: [[SC, "import fs from 'node:fs';\n", "import fs from 'node:fs';\nimport cpDefault from 'node:child_process';\n"], [SC, 'export function stageInventory({ policy }) {\n', "export function stageInventory({ policy }) {\n  cpDefault.spawnSync(process.execPath, ['-e', '0']);\n"]] },
  { id: 'scan-reads-outcome-data', tests: ['b.trap'], edits: [[SC, 'export function stageInventory({ policy }) {\n', "export function stageInventory({ policy }) {\n  try { fs.readFileSync(path.join(HERE, 'data', 'cache_O.jsonl'), 'utf8'); } catch (e) { /* decoy */ }\n"]] },
  { id: 'recompute-skipped', tests: ['w.corrupt'], edits: [rm(SC, "  if (again.sha256 !== admission.sha256 || !sameJson(again.admitted, admission.admitted)) refuse('the admission result is not reproduced by the committed predicate, inventory and registry');\n")] },
  { id: 'list-hash-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "  if (s.admittedSha256 !== sha256(adm.join(','))) refuse('the admitted-list hash does not match the admitted list');\n")] },
  { id: 'count-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "  if (s.admitted !== adm.length) refuse('the summary admitted count does not equal the list length');\n")] },
  { id: 'order-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "    if (i > 0 && adm[i] <= adm[i - 1]) refuse('the admitted list must be strictly ascending (no duplicates)');\n")] },
  { id: 'window-bounds-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "    if (adm[i] < s.start || adm[i] >= s.start + s.length) refuse(`admitted seed ${adm[i]} lies outside the scanned window`);\n")] },
  { id: 'category-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "  if (s.category !== 'registered') refuse(`only a \"registered\" admission can become a block (got ${s.category})`);\n")] },
  { id: 'summary-hash-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "  if (a.sha256 !== sha256(canonicalJson(s))) refuse('the admission result hash does not match its summary');\n")] },
  { id: 'rejection-overlap-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "    if (seen.has(r.raw)) refuse(`seed ${r.raw} is both admitted and rejected`);\n")] },
  { id: 'accounting-sum-unchecked', tests: ['w.corrupt'], edits: [rm(SC, "  if (s.admitted + s.rejected !== s.scanned) refuse('admitted + rejected must equal the number scanned');\n")] },
  { id: 'artifact-hash-unchecked', tests: ['w.artifact'], edits: [rm(SC, "  if (h !== sha256(canonicalJson(body))) refuse('the artifact does not match its own hash');\n")] },
  { id: 'artifact-members-unchecked', tests: ['w.artifact'], edits: [rm(SC, "  if (members.length !== b.count || members.length === 0) refuse('the block count does not match its hull and exclusions');\n")] },
  { id: 'artifact-list-hash-unchecked', tests: ['w.artifact'], edits: [rm(SC, "  if (b.listSha256 !== listSha256Of(members)) refuse('the block list hash does not match its members');\n")] },
  { id: 'artifact-agreement-unchecked', tests: ['w.artifact'], edits: [rm(SC, "  if (a.admission.admittedSha256 !== b.listSha256 || a.admission.admitted !== b.count) refuse('the artifact admission and block disagree');\n")] },
  { id: 'artifact-recompute-skipped', tests: ['w.artifact'], edits: [[SC, "  if (recompute) {\n", "  if (false) {\n"]] },
  { id: 'existing-block-unchecked', tests: ['w.registry'], edits: [rm(SC, "  if (reg.blocks.some(b => b.study === STUDY)) refuse(`the registry already holds a ${STUDY} block (one block per study)`);\n")] },
  { id: 'availability-unchecked', tests: ['w.registry'], edits: [rm(SC, "    if (d !== 'AVAILABLE') refuse(`member ${v} is not available in the registry (${d})`);\n")] },
  { id: 'registry-consistency-unchecked', tests: ['w.registry'], edits: [[SC, "  try { before = createTrajectoryRegistry({ ...base, blocks: [...reg.blocks] }); } catch (e) { refuse(`the existing registry is not consistent: ${e.message}`); }\n", '  before = { checkUse: () => ({ decision: \'AVAILABLE\' }), digest: () => \'x\' };\n']] },
  { id: 'registry-aliasing-unchecked', tests: ['w.registry'], edits: [[SC, "  try { before = createTrajectoryRegistry({ ...base, blocks: [...reg.blocks] }); } catch (e) { refuse(`the existing registry is not consistent: ${e.message}`); }\n  for (const v of admission.admitted) {", "  before = { checkUse: () => ({ decision: 'AVAILABLE' }), digest: () => 'x' };\n  for (const v of admission.admitted) {"]] },
  { id: 'candidate-window-unchecked', tests: ['w.candidate_window'], edits: [[SC, "  if (touchesCandidate(s.start, s.length)) {\n    const S = scanAuthorisation();\n    if (s.start !== S.start || s.length !== S.length) refuse('a window overlapping the candidate block must equal the authorized scan window exactly');\n  }\n", '']] },
  { id: 'destination-roots-unchecked', tests: ['w.destination'], edits: [rm(SC, "  if (!ALLOWED_ROOTS().some(r => inside(resolved, realOrSelf(r)))) refuse('the destination must be inside experiments/mcf1/data or the temporary directory');\n")] },
  { id: 'registry-directory-unchecked', tests: ['w.destination'], edits: [rm(SC, "  if (inside(resolved, registryDir)) refuse('the official registry directory is never a destination in this milestone');\n")] },
  { id: 'overwrite-allowed', tests: ['w.valid'], edits: [rm(SC, "  if (fs.existsSync(file)) refuse('a candidate block already exists at this destination (never overwritten)');\n")] },
  { id: 'writer-lock-not-exclusive', tests: ['w.interrupt'], edits: [[SC, "fs.openSync(lock, 'wx')", "fs.openSync(lock, 'w')"]] },
  { id: 'readback-skipped', tests: ['w.interrupt'], edits: [rm(SC, "    verifyCandidateArtifact(JSON.parse(fs.readFileSync(tmp, 'utf8')));        // what would become visible is re-verified byte for byte\n")] },
  { id: 'temp-not-cleaned', tests: ['w.interrupt'], edits: [[SC, "    try { fs.rmSync(tmp, { force: true }); } catch (x) { /* nothing to clean */ }\n", '']] },
  { id: 'lock-not-released', tests: ['w.interrupt'], edits: [[SC, "    try { fs.unlinkSync(lock); } catch (e) { /* already removed */ }\n", '']] },
];
for (const m of MUTANTS) for (const [file, find] of m.edits) {
  const n = fs.readFileSync(path.join(REPO, file), 'utf8').split(find).length - 1;
  if (n !== 1) { check('SCAN-A', `mutant ${m.id} anchor matches exactly once`, false, `${file} x${n}: ${find.slice(0, 60)}`); }
}
if (process.env.SCAN_ANCHORS_ONLY) { console.log(`anchors-only: ${failed} problems`); process.exit(failed ? 1 : 0); }

async function runTest(t) {
  try { const r = await t.fn(); return typeof r === 'boolean' ? { ok: r } : r; }
  catch (e) { return { ok: false, detail: 'threw: ' + String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e).slice(0, 300), threw: true, defect: /verifier defect/.test(String(e && e.message)) }; }
}
const ONLY = process.env.SCAN_ONLY ? new RegExp(process.env.SCAN_ONLY) : null;

// the real repository's committed state (not a copy)
{
  const auth = fs.readFileSync(path.join(REPO, 'experiments/mcf1/authorization.mjs'), 'utf8');
  const blocksText = fs.readFileSync(path.join(REPO, 'experiments/registry/trajectory_blocks.js'), 'utf8');
  const state = {
    scanNull: /export const SCAN_AUTHORIZATION = null;/.test(auth), pinNull: /export const FREEZE_RECORD_SHA256 = null;/.test(auth), shape: LCK.pinModuleShapeOk(auth),
    blocksEmpty: /export const TRAJECTORY_BLOCKS = Object.freeze\(\[\]\);/.test(blocksText), noScanDir: !fs.existsSync(path.join(REPO, 'experiments/mcf1/data/scan')),
    refuses: rx(/no scan authorization is set/, await refusal(() => LCK.scanAuthorisation())), candidateIsConfig: CFG.BLOCK.start === REAL_CANDIDATE.start && CFG.BLOCK.scanLength === REAL_CANDIDATE.length,
  };
  check('SCAN-A', 'the committed state: scan authorization null, pin null, template intact, block module empty, no scan output, candidate window unchanged in config', Object.values(state).every(Boolean), JSON.stringify(state));
}

{
  const G = await import(url(path.join(REPO, 'experiments/registry/import_isolation.js')));
  const dir = path.join(REPO, 'experiments/mcf1');
  const files = fs.readdirSync(dir).filter(n => n.endsWith('.mjs'));
  const bad = files.map(n => [n, G.scanSource(`experiments/mcf1/${n}`, fs.readFileSync(path.join(dir, n), 'utf8'))]).filter(([, r]) => r.hard.length > 0 || r.mentions.length > 0);
  check('SCAN-B', `no harness file (${files.length}, tracked or untracked) references the legacy registry by the isolation gate's own scanner`, bad.length === 0, bad.map(([n]) => n).join(','));
}

console.log('\n== M-SCAN-1 authority, structure and writer (real implementation) ==');
for (const t of TESTS.values()) { if (ONLY && !ONLY.test(t.id)) continue; const r = await runTest(t); check(t.gate, `[${t.id}] ${t.desc}`, r.ok === true, r.detail || ''); }

console.log('\n== M-SCAN-1 anti-vacuity mutants (each removes one guard; the named cells must then fail) ==');
for (const m of MUTANTS) {
  if (process.env.SCAN_SKIP_MUTANTS) break;
  if (ONLY && !m.tests.some(id => ONLY.test(id))) continue;
  MUT_EDITS = m.edits;
  const outs = [];
  for (const id of m.tests) outs.push({ id, ...(await runTest(TESTS.get(id))) });
  MUT_EDITS = [];
  const built = !outs.some(o => o.defect);
  const ok = built && outs.some(o => o.ok !== true);
  mutantResult(TESTS.get(m.tests[0]).gate, m.id, ok, !built ? 'MUTANT COULD NOT BE BUILT (verifier defect): ' + outs.find(o => o.defect).detail : outs.map(o => `${o.id} ${o.ok === true ? 'PASSED (not caught)' : o.threw ? 'threw' : 'failed as required'}`).join('; '));
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; mutants caught ${caught}, missed ${missed}`);
fs.rmSync(ROOT, { recursive: true, force: true });
process.exit(failed === 0 && missed === 0 ? 0 : 1);
void spawn;

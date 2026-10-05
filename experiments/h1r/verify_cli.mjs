// ==========================================================
// H1-R — gate on the orchestrator's CLI command path (Milestone B item 4; gates C1–C15)
// ==========================================================
// Exercises `node experiments/h1r/orchestrate.mjs <command>` as a child process, so every check goes through the
// unchanged CLI dispatch and, for stage commands, its runCommand.
// - Read-only commands (identity, precheck, usage errors, unauthorised stage commands) run against the repository.
// - Authorised stage commands run ONLY in throwaway sandboxes under the system temporary directory. Each sandbox
//   holds byte-identical copies of orchestrate.mjs (SHA-256 6162f8c2…), analyze.js, the instrument files and the
//   committed registry, with test doubles for build_tree.mjs, run_h1r.mjs and the tree's env.js
//   (experiments/h1r/cli_gate/). In a sandbox no agent runs, no M7 configuration is generated and every run record
//   is invalid by construction, so no H1-R stage executes.
// The gate refuses to start when H1R_STAGE_AUTHORISED is set, and it never passes the repository an authorisation
// that matches the command. Reports carry codes, counts and hashes only: no host path, no clock.
//
//   node experiments/h1r/verify_cli.mjs     (writes experiments/h1r/$H1R_EVIDENCE/cli_gates.json; default evidence_milestone_b)
// ==========================================================
import { spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const ORCH = path.join(HERE, 'orchestrate.mjs');
const BASE = 'bf0833f466ad7c626c9a719efa3a91d6b6367b16';  // the commit before Milestone B (its registry has no H1-R record)
const PIN = { orchestrator: '6162f8c21dab3b95b826c349a2794a70c51cf5a7f6e285a44d0b52efd398032b', analyze: 'dae6012c1ac48a96ccd9835b24e7aadce9243d95e147a5d8d2b3f833fb0a414d' };
const STAGE_CMDS = ['stage1', 'extension', 'stage2', 'forks', 'analyze'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

if (process.env.H1R_STAGE_AUTHORISED !== undefined) {
  console.error('verify_cli: refusing to start with H1R_STAGE_AUTHORISED set (no authorised stage command may reach the repository)');
  process.exit(2);
}
const BASE_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== 'H1R_STAGE_AUTHORISED' && !k.toUpperCase().startsWith('H1R_CLI_DOUBLE_')));
const GIT_ENV = { ...BASE_ENV, GIT_AUTHOR_NAME: 'verify_cli', GIT_AUTHOR_EMAIL: 'verify_cli@sandbox.invalid', GIT_COMMITTER_NAME: 'verify_cli', GIT_COMMITTER_EMAIL: 'verify_cli@sandbox.invalid' };
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, '-c', 'core.autocrlf=false', ...args], { env: GIT_ENV, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });

// ---------------- sandboxes ----------------
const ROOT = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r-cli-gate');
fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });
const inSandbox = (p) => { const r = path.relative(ROOT, p); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };
// the registry modules and their static-import closure (typed.js → chain links → UQ-B, UQ-A, Q1, M8 protocol modules)
const REG_FILES = ['experiments/registry/typed.js', 'experiments/registry/consumed_after_h1r.js', 'experiments/registry/consumed_after_study2.js',
  'experiments/registry/consumed_after_c1.js', 'experiments/registry/consumed.js', 'experiments/uqb/protocol.js', 'experiments/uqa/protocol.js',
  'experiments/q1/protocol.js', 'experiments/q1/instrument.js', 'experiments/m8/protocol.js', 'experiments/m8/instrument.js'];
const H1R_FILES = ['orchestrate.mjs', 'analyze.js', 'env_seed.mjs', 'conformance_transform.mjs', 'runtime.mjs', 'measure.mjs', 'measure_install.mjs', 'shadow.mjs'];
const DOUBLES = { 'build_tree.mjs': 'cli_gate/build_tree.double.mjs', 'run_h1r.mjs': 'cli_gate/run_h1r.double.mjs', 'env.double.js': 'cli_gate/env.double.js' };
const ORCH_SRC = fs.readFileSync(ORCH);
function sandbox(name, { registry = 'current', orchestrator = ORCH_SRC } = {}) {
  const sb = path.join(ROOT, name);
  const put = (rel, bytes) => { const d = path.join(sb, ...rel.split('/')); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, bytes); };
  for (const f of REG_FILES) {
    if (registry === 'preB') { if (!f.endsWith('consumed_after_h1r.js')) put(f, git(REPO, 'cat-file', 'blob', `${BASE}:${f}`)); }
    else put(f, fs.readFileSync(path.join(REPO, f)));
  }
  for (const f of H1R_FILES) put(`experiments/h1r/${f}`, f === 'orchestrate.mjs' ? orchestrator : fs.readFileSync(path.join(HERE, f)));
  for (const [to, from] of Object.entries(DOUBLES)) put(`experiments/h1r/${to}`, fs.readFileSync(path.join(HERE, ...from.split('/'))));
  put('experiments/h1r/data/.gitignore', fs.readFileSync(path.join(HERE, 'data', '.gitignore')));
  git(sb, 'init', '-q'); git(sb, 'add', '-A'); git(sb, 'commit', '-q', '-m', 'verify_cli sandbox');
  return { dir: sb, orch: path.join(sb, 'experiments', 'h1r', 'orchestrate.mjs') };
}

// ---------------- the CLI, as a child process ----------------
let authorisedCalls = 0;
function cli(orch, args, extra = {}) {
  const auth = extra.H1R_STAGE_AUTHORISED;
  if (!inSandbox(orch) && auth !== undefined && auth !== '') throw new Error('gate defect: an authorisation reached the repository');
  if (inSandbox(orch) && auth !== undefined && auth === args[0]) authorisedCalls++;
  const r = spawnSync(process.execPath, [orch, ...args], { cwd: inSandbox(orch) ? path.resolve(path.dirname(orch), '..', '..') : REPO,
    env: { ...BASE_ENV, ...extra }, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 20 * 60 * 1000 });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
const auth = (cmd, more = {}) => ({ H1R_STAGE_AUTHORISED: cmd, ...more });

// ---------------- filesystem views (paths relative to the sandbox; never printed absolute) ----------------
const P = (sb, ...r) => path.join(sb.dir, ...r);
const exists = (sb, ...r) => fs.existsSync(P(sb, ...r));
const list = (sb, ...r) => exists(sb, ...r) ? fs.readdirSync(P(sb, ...r)).sort() : [];
const read = (sb, ...r) => fs.readFileSync(P(sb, ...r));
const dirHashes = (sb, ...r) => Object.fromEntries(list(sb, ...r).filter(f => fs.statSync(P(sb, ...r, f)).isFile()).map(f => [f, sha(read(sb, ...r, f))]));
const records = (sb) => dirHashes(sb, 'experiments', 'h1r', 'stage_records');
const raw = (sb, stage) => dirHashes(sb, 'experiments', 'h1r', 'data', 'raw', stage);
const configLog = (sb) => exists(sb, 'tree', 'makeConfig.log') ? read(sb, 'tree', 'makeConfig.log').toString('utf8').split('\n').filter(Boolean).map(Number) : [];
const untouched = (sb) => !exists(sb, 'tree') && !exists(sb, 'experiments', 'h1r', 'stage_records') && JSON.stringify(list(sb, 'experiments', 'h1r', 'data')) === '[".gitignore"]';
const json = (sb, name) => JSON.parse(read(sb, 'experiments', 'h1r', 'stage_records', name).toString('utf8'));
const sidecarsOk = (sb) => Object.keys(records(sb)).filter(f => !f.endsWith('.sha256')).every(f =>
  read(sb, 'experiments', 'h1r', 'stage_records', `${f}.sha256`).toString('utf8') === `${sha(read(sb, 'experiments', 'h1r', 'stage_records', f))}  ${f}\n`);
const regBytes = (sb) => Object.fromEntries(REG_FILES.filter(f => exists(sb, ...f.split('/'))).map(f => [f, sha(read(sb, ...f.split('/')))]));
const maxOf = (a) => a.length ? Math.max(...a) : null;

// ---------------- isolation baseline (the repository and the real tree cache) ----------------
function repoSnapshot() {
  const ls = (...a) => execFileSync('git', ['-C', REPO, 'ls-files', '-z', ...a], { maxBuffer: 1 << 28 }).toString('utf8').split('\0').filter(Boolean);
  const files = [...new Set([...ls('-co', '--exclude-standard'), ...ls('-o', '-i', '--exclude-standard')])].sort();
  const h = Object.fromEntries(files.map(f => { const a = path.join(REPO, f); return [f, fs.existsSync(a) && fs.statSync(a).isFile() ? sha(fs.readFileSync(a)) : null]; }));
  return { n: files.length, digest: sha(JSON.stringify(h)) };
}
const TREE_CACHE = path.join(os.tmpdir(), 'mfw-h1r');
const treeCacheView = () => fs.existsSync(TREE_CACHE) ? sha(JSON.stringify(fs.readdirSync(TREE_CACHE).sort().map(d => {
  const m = path.join(TREE_CACHE, d, 'MANIFEST.json'); return [d, fs.existsSync(m) ? sha(fs.readFileSync(m)) : null]; }))) : 'absent';
const REPO_BEFORE = repoSnapshot(), CACHE_BEFORE = treeCacheView();
const REAL_REG_BEFORE = Object.fromEntries(REG_FILES.map(f => [f, sha(fs.readFileSync(path.join(REPO, f)))]));

// ---------------- checks ----------------
const results = [];
const ok = (id, title, pass, detail) => { results.push({ id, title, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${title}\n        ${detail}`); };
const guard = async (id, title, fn) => { try { await fn(); } catch (e) { ok(id, title, false, `THREW ${e && e.message ? e.message.split('\n')[0] : e}`); } };

const O = await import(pathToFileURL(ORCH).href);          // importing runs no command (the CLI block needs argv[1] = orchestrate.mjs)
const S0 = sandbox('s0');

await guard('C1', 'identity', () => {
  const a = cli(ORCH, ['identity']), b = cli(ORCH, ['identity']), inProc = O.instrumentIdentity();
  const s = cli(S0.orch, ['identity']);
  const sid = s.code === 0 ? JSON.parse(s.stdout) : null;
  const expectSandbox = { ...inProc, driverSha256: sha(fs.readFileSync(path.join(HERE, 'cli_gate', 'run_h1r.double.mjs'))) };
  ok('C1', '`identity` prints the in-process instrumentIdentity() (orchestrator 6162f8c2…, analyze.js dae6012c…), byte-identically on repetition; in a sandbox it differs only by the driver double',
    a.code === 0 && a.stdout === b.stdout && JSON.stringify(JSON.parse(a.stdout)) === JSON.stringify(inProc) && inProc.orchestratorSha256 === PIN.orchestrator
      && inProc.analyzeSha256 === PIN.analyze && sha(read(S0, 'experiments', 'h1r', 'orchestrate.mjs')) === PIN.orchestrator && JSON.stringify(sid) === JSON.stringify(expectSandbox),
    `exit ${a.code}/${b.code}/${s.code}; orchestrator ${inProc.orchestratorSha256.slice(0, 12)}; analyze ${inProc.analyzeSha256.slice(0, 12)}; sandbox identity as expected ${JSON.stringify(sid) === JSON.stringify(expectSandbox)}`);
});

await guard('C2', 'usage and argument validation', () => {
  const CASES = [[], ['stage3'], ['Stage1'], ['IDENTITY'], ['precheck'], ['precheck', 'stage3'], ['precheck', 'forks'], ['precheck', 'analyze']];
  const out = [];
  for (const orch of [ORCH, S0.orch]) for (const c of CASES) { const r = cli(orch, c); out.push([c.join(' ') || '(none)', r.code, /usage/.test(r.stderr), r.stdout === '']); }
  const bad = out.filter(([, code, u, quiet]) => code !== 2 || !u || !quiet);
  ok('C2', 'an absent, unknown or mis-cased command, and `precheck` without a valid stage, exit 2 with the usage text and no output, in the repository and in a sandbox; nothing is written',
    bad.length === 0 && untouched(S0), `${out.length} invocations; deviations ${JSON.stringify(bad)}; sandbox untouched ${untouched(S0)}`);
});

await guard('C3', 'registry pre-check (read-only, repository)', async () => {
  const run = (st) => { const r = cli(ORCH, ['precheck', st]); return { code: r.code, text: r.stdout, doc: r.code === 0 || r.code === 3 ? JSON.parse(r.stdout) : null }; };
  const s1 = run('stage1'), ex = run('extension'), s2 = run('stage2'), s1b = run('stage1'), s2b = run('stage2');
  const reg = await O.productionRegistry();
  const inProc = O.registryPrecheck({ stage: 'stage1', seeds: O.PROTOCOL.pilot.seeds, configBlock: { lo: 886000, hi: 889999 }, registry: reg });
  const pilotOk = (d) => d.executable === true && d.items.length === 5 && d.items.every(i => i.decision === 'REPRODUCTION') && d.configBlock.lo === 886000 && d.configBlock.hi === 889999 && d.configBlock.recordedForH1R === true;
  ok('C3', '`precheck stage1` and `precheck extension` exit 0: the 5 pilot seeds 004–008 are recorded for H1-R (REPRODUCTION) and block 886000–889999 is recorded; `precheck stage2` exits 3: the 20 confirmatory seeds are AVAILABLE (not recorded) and block 900500 is not recorded; repeated output is byte-identical and equals the in-process pre-check',
    s1.code === 0 && pilotOk(s1.doc) && ex.code === 0 && pilotOk(ex.doc) && s2.code === 3 && s2.doc.executable === false && s2.doc.items.length === 20
      && s2.doc.items.every(i => i.decision === 'AVAILABLE') && s2.doc.configBlock.lo === 900500 && s2.doc.configBlock.hi === null && s2.doc.configBlock.recordedForH1R === false
      && s1.text === s1b.text && s2.text === s2b.text && JSON.stringify(s1.doc) === JSON.stringify(inProc),
    `stage1 exit ${s1.code} executable ${s1.doc && s1.doc.executable}; extension exit ${ex.code}; stage2 exit ${s2.code}, decisions ${s2.doc && [...new Set(s2.doc.items.map(i => i.decision))]}, block recorded ${s2.doc && s2.doc.configBlock.recordedForH1R}, reasons ${s2.doc && s2.doc.reasons.length}`);
});

await guard('C4', 'Director authorisation', () => {
  const out = [];
  for (const cmd of STAGE_CMDS) {
    for (const [where, orch] of [['repository', ORCH], ['sandbox', S0.orch]]) {
      for (const [label, env] of [['unset', {}], ['empty', { H1R_STAGE_AUTHORISED: '' }], ...(where === 'sandbox' ? [['other', { H1R_STAGE_AUTHORISED: STAGE_CMDS.find(c => c !== cmd) }], ['case', { H1R_STAGE_AUTHORISED: cmd.toUpperCase() }]] : [])]) {
        const r = cli(orch, [cmd], env); out.push([where, cmd, label, r.code, new RegExp(`requires H1R_STAGE_AUTHORISED=${cmd}`).test(r.stderr)]);
      }
    }
  }
  const bad = out.filter(([, , , code, msg]) => code !== 3 || !msg);
  ok('C4', 'every stage command without the matching H1R_STAGE_AUTHORISED (unset, empty, another stage, other case) exits 3 with the refusal before any registry read or generation; nothing is written',
    bad.length === 0 && untouched(S0), `${out.length} invocations (repository: unset/empty only); deviations ${JSON.stringify(bad)}; sandbox untouched ${untouched(S0)}`);
});

await guard('C5', 'registry refusal before generation', () => {
  const PRE = sandbox('pre', { registry: 'preB' }), before = regBytes(PRE), out = [];
  for (const cmd of STAGE_CMDS) { const r = cli(PRE.orch, [cmd], auth(cmd)); out.push([cmd, r.code, /REFUSED: registry pre-check/.test(r.stderr) && /not recorded for H1-R/.test(r.stderr)]); }
  const bad = out.filter(([, code, msg]) => code !== 3 || !msg);
  ok('C5', 'with the pre-Milestone-B registry (bf0833f: no H1-R record), every authorised stage command exits 3 on the registry pre-check; no tree is built, no configuration is generated, nothing is written, the registry bytes are unchanged',
    bad.length === 0 && untouched(PRE) && configLog(PRE).length === 0 && JSON.stringify(regBytes(PRE)) === JSON.stringify(before),
    `${out.length} authorised commands; deviations ${JSON.stringify(bad)}; untouched ${untouched(PRE)}; generator calls ${configLog(PRE).length}`);
});

const A = sandbox('a'), B = sandbox('b-other-path');
const pilotRecords = 5 * 5 * 7 + 7;
let s1A = null;
await guard('C6', 'stage1 dispatch', () => {
  const before = regBytes(A);
  s1A = cli(A.orch, ['stage1'], auth('stage1'));
  const files = Object.keys(records(A)), man = s1A.code === 0 ? json(A, 'stage1_manifest.json') : null, probe = s1A.code === 0 ? json(A, 'stage1_probe.json') : null;
  const ledger = exists(A, 'experiments', 'h1r', 'data', 'raw', 'stage1', 'ATTEMPTS.jsonl') ? read(A, 'experiments', 'h1r', 'data', 'raw', 'stage1', 'ATTEMPTS.jsonl').toString('utf8').split('\n').filter(Boolean) : [];
  const ids = man ? man.runs.map(r => r.identity) : [], log = configLog(A);
  // ERR-07 positions under the double's acceptance rule (seed ≡ 1 mod 3): index i starts at acceptedSeed(i − 1) + 1
  let pos = 886000, chainOk = true;
  for (let i = 0; i < 5; i++) { const acc = pos + ((1 - pos % 3) + 3) % 3; const r = ids.find(x => x.configIndex === i); if (!r || r.configSeed !== pos || r.acceptedSeed !== acc) chainOk = false; pos = acc + 1; }
  ok('C6', 'authorised `stage1` (sandbox, test doubles): exit 0; writes exactly stage1_manifest.json and stage1_probe.json with correct .sha256 sidecars; plans 5 × 5 × 7 base runs + 7 determinism re-runs on stream 886000 (ERR-07 positions); every run attempted once and classified invalid (doubles); the probe asks for the extension; the generator was asked only for positions inside 886000–889999; the registry is unchanged',
    s1A.code === 0 && JSON.stringify(files) === JSON.stringify(['stage1_manifest.json', 'stage1_manifest.json.sha256', 'stage1_probe.json', 'stage1_probe.json.sha256']) && sidecarsOk(A)
      && man.counts.planned === pilotRecords && man.counts.invalid === pilotRecords && man.counts.valid === 0 && man.counts.noRecord === 0 && man.stage === 'stage1'
      && man.runs.every(r => r.path.startsWith('experiments/h1r/data/raw/stage1/')) && ledger.length === pilotRecords && Object.keys(raw(A, 'stage1')).length === pilotRecords + 1
      && chainOk && probe.action === 'EXTENSION_REQUIRED' && log.length > 0 && Math.min(...log) >= 886000 && maxOf(log) <= 889999
      && man.instrument.orchestratorSha256 === PIN.orchestrator && JSON.stringify(regBytes(A)) === JSON.stringify(before),
    `exit ${s1A.code}; files ${files.length}; planned ${man && man.counts.planned}, invalid ${man && man.counts.invalid}; attempts ${ledger.length}; ERR-07 chain ${chainOk}; probe ${probe && probe.action}; generator positions ${log.length} in [${Math.min(...log)}, ${maxOf(log)}]`);
});

await guard('C7', 'determinism across sandboxes', () => {
  const r = cli(B.orch, ['stage1'], auth('stage1'));
  const same = JSON.stringify(records(A)) === JSON.stringify(records(B)) && JSON.stringify(raw(A, 'stage1')) === JSON.stringify(raw(B, 'stage1'));
  const texts = Object.keys(records(A)).map(f => read(A, 'experiments', 'h1r', 'stage_records', f).toString('utf8'));
  const hostFree = texts.every(t => ![A.dir, B.dir, ROOT, os.tmpdir(), REPO].some(p => t.includes(p) || t.includes(p.split(path.sep).join('/')) || t.includes(JSON.stringify(p).slice(1, -1))));
  ok('C7', 'the same command in a second sandbox at a different absolute path writes byte-identical stage records and raw records; no derived artifact contains a host path',
    r.code === 0 && same && hostFree, `exit ${r.code}; stage records identical ${JSON.stringify(records(A)) === JSON.stringify(records(B))}; raw identical ${JSON.stringify(raw(A, 'stage1')) === JSON.stringify(raw(B, 'stage1'))}; host-path free ${hostFree}; manifest ${(records(A)['stage1_manifest.json'] || '').slice(0, 16)}`);
});

await guard('C8', 're-entry', () => {
  const r0 = records(A), w0 = raw(A, 'stage1'), r = cli(A.orch, ['stage1'], auth('stage1'));
  ok('C8', 're-running `stage1` re-derives everything from the raw records without attempting any run again (ledger and raw records byte-unchanged) and rewrites byte-identical stage records',
    r.code === 0 && JSON.stringify(records(A)) === JSON.stringify(r0) && JSON.stringify(raw(A, 'stage1')) === JSON.stringify(w0), `exit ${r.code}; unchanged ${JSON.stringify(raw(A, 'stage1')) === JSON.stringify(w0)}`);
});

let decisionA = null;
await guard('C9', 'extension dispatch', () => {
  const w0 = raw(A, 'stage1'), r = cli(A.orch, ['extension'], auth('extension'));
  const man = r.code === 0 ? json(A, 'extension_manifest.json') : null;
  decisionA = r.code === 0 ? json(A, 'stage1_decision.json') : null;
  const idx = man ? [...new Set(man.runs.map(x => x.identity.configIndex))].sort((a, b) => a - b) : [];
  const log = configLog(A);
  ok('C9', 'authorised `extension`: exit 0; plans indices 5–9 of the same stream × seeds 004–008 (5 × 5 × 7 + 7 runs); writes extension_manifest.json, stage1_input.json and stage1_decision.json with sidecars; Stage 1 is not re-executed; the decision on all-invalid doubles is not PROCEED; generator positions stay inside 886000–889999',
    r.code === 0 && man.counts.planned === pilotRecords && JSON.stringify(idx) === '[5,6,7,8,9]' && sidecarsOk(A) && ['extension_manifest.json', 'stage1_input.json', 'stage1_decision.json'].every(f => f in records(A))
      && JSON.stringify(raw(A, 'stage1')) === JSON.stringify(w0) && decisionA.extensionTaken === true && decisionA.outcome !== 'PROCEED' && maxOf(log) <= 889999,
    `exit ${r.code}; extension planned ${man && man.counts.planned}, indices ${idx}; decision ${decisionA && decisionA.outcome} (extensionTaken ${decisionA && decisionA.extensionTaken}); generator max ${maxOf(log)}`);
});

await guard('C10', 'Stage 2 path: decision not lodged', () => {
  const r0 = records(A), out = [];
  for (const cmd of ['stage2', 'forks', 'analyze']) { const r = cli(A.orch, [cmd], auth(cmd)); out.push([cmd, r.code, /STAGE1_NOT_LODGED/.test(r.stderr)]); }
  const bad = out.filter(([, code, msg]) => code !== 1 || !msg);
  ok('C10', 'authorised `stage2`, `forks` and `analyze` while stage1_decision.json is not committed halt STAGE1_NOT_LODGED with exit 1 (failure propagates): no Stage-2 or fork run, no new stage record, no held-out position requested',
    bad.length === 0 && JSON.stringify(records(A)) === JSON.stringify(r0) && !exists(A, 'experiments', 'h1r', 'data', 'raw', 'stage2') && !exists(A, 'experiments', 'h1r', 'data', 'raw', 'forks') && maxOf(configLog(A)) <= 889999,
    `deviations ${JSON.stringify(bad)}; generator max ${maxOf(configLog(A))}`);
});

await guard('C11', 'Stage 2 path: lodged decision is not PROCEED', () => {
  git(A.dir, 'add', 'experiments/h1r/stage_records/stage1_decision.json'); git(A.dir, 'commit', '-q', '-m', 'lodge (sandbox)');
  const out = [];
  for (const cmd of ['stage2', 'forks', 'analyze']) { const r = cli(A.orch, [cmd], auth(cmd)); out.push([cmd, r.code, new RegExp(`NO_STAGE2: the lodged Stage-1 outcome is ${decisionA && decisionA.outcome}`).test(r.stderr)]); }
  const bad = out.filter(([, code, msg]) => code !== 1 || !msg);
  ok('C11', 'with the decision committed and its outcome not PROCEED, `stage2`, `forks` and `analyze` halt NO_STAGE2 with exit 1; nothing of Stage 2 runs',
    bad.length === 0 && !exists(A, 'experiments', 'h1r', 'data', 'raw', 'stage2') && maxOf(configLog(A)) <= 889999, `deviations ${JSON.stringify(bad)}`);
});

const proceedFixture = { schema: 'h1r.orchestrator.stage1-decision/1', fixture: 'verify_cli test fixture: not a Stage-1 decision', outcome: 'PROCEED', extensionTaken: false, Sstar: 3 };
const lodgeFixture = (sb, commit) => {
  fs.mkdirSync(P(sb, 'experiments', 'h1r', 'stage_records'), { recursive: true });
  fs.writeFileSync(P(sb, 'experiments', 'h1r', 'stage_records', 'stage1_decision.json'), JSON.stringify(proceedFixture));
  if (commit) { git(sb.dir, 'add', 'experiments/h1r/stage_records/stage1_decision.json'); git(sb.dir, 'commit', '-q', '-m', 'fixture (sandbox)'); }
};
await guard('C12', 'Stage 2 path: registry pre-check before held-out generation', () => {
  const PR = sandbox('proceed'); lodgeFixture(PR, true);
  const out = [];
  for (const cmd of ['stage2', 'forks', 'analyze']) { const r = cli(PR.orch, [cmd], auth(cmd)); out.push([cmd, r.code, /REGISTRY: /.test(r.stderr) && /H1-R's use not recorded/.test(r.stderr) && /configuration block 900500-null not recorded for H1-R/.test(r.stderr)]); }
  const bad = out.filter(([, code, msg]) => code !== 1 || !msg), log = configLog(PR);
  ok('C12', 'even with a committed PROCEED decision (a sandbox fixture), `stage2`, `forks` and `analyze` halt on the Stage-2 registry pre-check (confirmatory seeds and block 900500 not recorded) with exit 1, before any held-out position is generated',
    bad.length === 0 && log.every(s => s < 900500) && !exists(PR, 'experiments', 'h1r', 'data', 'raw', 'stage2'), `deviations ${JSON.stringify(bad)}; generator max ${maxOf(log)}`);
});

await guard('C13', 'failure propagation from the run layer', () => {
  const C = sandbox('crash'), crashId = 'pilot-2-20260819006-A3';
  const r1 = cli(C.orch, ['stage1'], auth('stage1', { H1R_CLI_DOUBLE_CRASH: crashId }));
  const man = r1.code === 0 ? json(C, 'stage1_manifest.json') : null, entry = man && man.runs.find(r => r.runId === crashId);
  const w0 = raw(C, 'stage1'), r2 = cli(C.orch, ['stage1'], auth('stage1'));
  const D = sandbox('malformed'), r3 = cli(D.orch, ['stage1'], auth('stage1', { H1R_CLI_DOUBLE_MALFORMED: 'pilot-0-20260819004-A1' }));
  const E = sandbox('bound'), r4 = cli(E.orch, ['stage1'], auth('stage1', { H1R_CLI_DOUBLE_ACCEPT_NONE: '1' })), logE = configLog(E);
  ok('C13', 'a crashed run (no record) is classified no-record and never re-run (D-026 §1); a malformed record halts MALFORMED with exit 1 and no manifest; no configuration accepted within 889999 halts PILOT_HARD_BOUND with exit 1 before any run, never evaluating a position above the bound',
    r1.code === 0 && entry && entry.status === 'no-record' && man.counts.noRecord === 1 && r2.code === 0 && JSON.stringify(raw(C, 'stage1')) === JSON.stringify(w0)
      && r3.code === 1 && /MALFORMED/.test(r3.stderr) && !exists(D, 'experiments', 'h1r', 'stage_records', 'stage1_manifest.json')
      && r4.code === 1 && /PILOT_HARD_BOUND/.test(r4.stderr) && !exists(E, 'experiments', 'h1r', 'data', 'raw') && logE.length === 4000 && Math.min(...logE) === 886000 && maxOf(logE) === 889999,
    `crash: exit ${r1.code}, status ${entry && entry.status}, noRecord ${man && man.counts.noRecord}, re-run attempted ${JSON.stringify(raw(C, 'stage1')) !== JSON.stringify(w0)}; malformed: exit ${r3.code}; bound: exit ${r4.code}, positions ${logE.length} in [${Math.min(...logE)}, ${maxOf(logE)}]`);
});

// ---------------- anti-vacuity: mutated CLI sections, each caught by its named check ----------------
const MUTANTS = [
  ['M1', 'authorisation check removed', 'if (process.env.H1R_STAGE_AUTHORISED !== cmd)', 'if (false)', 'C4',
    (sb) => cli(sb.orch, ['stage1'], { H1R_CLI_DOUBLE_ACCEPT_NONE: '1' }).code === 3],
  ['M2', 'CLI registry pre-check bypassed', "if (!pre.executable) { console.error(`REFUSED: registry pre-check", "if (false) { console.error(`REFUSED: registry pre-check", 'C5',
    (sb) => cli(sb.orch, ['stage1'], auth('stage1', { H1R_CLI_DOUBLE_ACCEPT_NONE: '1' })).code === 3 && untouched(sb), 'preB'],
  ['M3', 'unknown command accepted', "stage1|extension|stage2|forks|analyze'); process.exit(2); }", "stage1|extension|stage2|forks|analyze'); process.exit(0); }", 'C2',
    (sb) => cli(sb.orch, ['stage3']).code === 2],
  ['M4', 'precheck stage not validated', "if (!['stage1', 'extension', 'stage2'].includes(arg))", 'if (false)', 'C2',
    (sb) => cli(sb.orch, ['precheck', 'forks']).code === 2],
  ['M5', 'halt swallowed', 'await runCommand(cmd, registry);', 'await runCommand(cmd, registry).catch(() => {});', 'C13',
    (sb) => { const r = cli(sb.orch, ['stage1'], auth('stage1', { H1R_CLI_DOUBLE_ACCEPT_NONE: '1' })); return r.code === 1 && /PILOT_HARD_BOUND/.test(r.stderr); }],
  ['M6', 'host path written into a stage record', 'fs.writeFileSync(path.join(OUT, name), t);', 'fs.writeFileSync(path.join(OUT, name), t + REPO);', 'C7',
    (sb) => cli(sb.orch, ['stage1'], auth('stage1')).code === 0 && Object.keys(records(sb)).every(f => !read(sb, 'experiments', 'h1r', 'stage_records', f).toString('utf8').includes(sb.dir)) && sidecarsOk(sb)],
  ['M7', 'Stage 2 without a lodged decision', "catch { halt('STAGE1_NOT_LODGED', `${relDecision} must be committed and unmodified before Stage 2`); }", 'catch { }', 'C10',
    (sb) => { lodgeFixture(sb, false); const r = cli(sb.orch, ['stage2'], auth('stage2')); return r.code === 1 && /STAGE1_NOT_LODGED/.test(r.stderr); }],
  ['M8', 'Stage-2 registry pre-check skipped', "if (!pre2.executable) halt('REGISTRY', pre2.reasons.join('; '));", '', 'C12',
    (sb) => { lodgeFixture(sb, true); const r = cli(sb.orch, ['stage2'], auth('stage2')); return r.code === 1 && /REGISTRY: /.test(r.stderr) && configLog(sb).every(s => s < 900500); }],
];
const mutantResults = [];
for (const [id, what, anchor, repl, check, test, registry] of MUTANTS) {
  const src = ORCH_SRC.toString('utf8');
  const n = src.split(anchor).length - 1;
  if (n !== 1) { mutantResults.push([id, what, check, `ANCHOR ${n}`]); continue; }
  const sb = sandbox(`mut-${id}`, { registry: registry || 'current', orchestrator: Buffer.from(src.replace(anchor, () => repl), 'utf8') });
  let passes; try { passes = test(sb); } catch (e) { passes = `THREW ${e.message.split('\n')[0]}`; }
  mutantResults.push([id, what, check, passes === false ? 'CAUGHT' : passes === true ? 'NOT CAUGHT' : passes]);
}
// control: every mutant's test, on a fresh sandbox with the unmutated orchestrator, passes
const controls = MUTANTS.map(([id, , , , , test, registry]) => { try { return [id, test(sandbox(`ctl-${id}`, { registry: registry || 'current' })) === true]; } catch { return [id, false]; } });
const controlPass = controls.every(([, p]) => p);
ok('C15', `anti-vacuity: each of ${MUTANTS.length} deliberate CLI defects is caught by the test of its named check, and the unmutated orchestrator passes every one of those tests`,
  controlPass && mutantResults.every(m => m[3] === 'CAUGHT'), mutantResults.map(m => `${m[0]}(${m[2]}):${m[3]}`).join(' ') + `; control ${controlPass ? 'passes' : `FAILS ${controls.filter(([, p]) => !p).map(([i]) => i)}`}`);

// ---------------- C14: nothing outside the test area changed (evaluated last) ----------------
await guard('C14', 'isolation', () => {
  const after = repoSnapshot();
  const regSame = REG_FILES.every(f => sha(fs.readFileSync(path.join(REPO, f))) === REAL_REG_BEFORE[f]);
  const dataOnly = JSON.stringify(fs.readdirSync(path.join(HERE, 'data')).sort()) === '[".gitignore"]';
  ok('C14', `isolation: the repository (every tracked, untracked and ignored file) and the real tree cache are byte-unchanged; the repository registry is unchanged; experiments/h1r/data holds only its .gitignore and no stage_records exist; all ${authorisedCalls} authorised stage commands ran in sandboxes`,
    after.digest === REPO_BEFORE.digest && after.n === REPO_BEFORE.n && treeCacheView() === CACHE_BEFORE && regSame && dataOnly && !fs.existsSync(path.join(HERE, 'stage_records')) && authorisedCalls > 0,
    `repository files ${after.n} (before ${REPO_BEFORE.n}), digest unchanged ${after.digest === REPO_BEFORE.digest}; tree cache unchanged ${treeCacheView() === CACHE_BEFORE}; registry unchanged ${regSame}; data only .gitignore ${dataOnly}; authorised sandbox commands ${authorisedCalls}`);
});

fs.rmSync(ROOT, { recursive: true, force: true });
results.sort((x, y) => Number(x.id.slice(1)) - Number(y.id.slice(1)));
const pass = results.filter(r => r.pass).length, fail = results.length - pass;
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_milestone_b');
fs.mkdirSync(EVID, { recursive: true });
fs.writeFileSync(path.join(EVID, 'cli_gates.json'), JSON.stringify({
  schema: 'h1r.cli-gates/1', generatedBy: 'experiments/h1r/verify_cli.mjs', orchestratorSha256: sha(ORCH_SRC), analyzeSha256: sha(fs.readFileSync(path.join(HERE, 'analyze.js'))),
  doubles: Object.fromEntries(Object.values(DOUBLES).map(f => [`experiments/h1r/${f}`, sha(fs.readFileSync(path.join(HERE, ...f.split('/'))))])),
  preMilestoneBRegistry: BASE, authorisedSandboxCommands: authorisedCalls, mutants: mutantResults.map(([id, what, check, outcome]) => ({ id, what, check, outcome })),
  pass, fail, results }, null, 1) + '\n');
console.log(`\nH1-R CLI GATE: ${pass}/${results.length} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;

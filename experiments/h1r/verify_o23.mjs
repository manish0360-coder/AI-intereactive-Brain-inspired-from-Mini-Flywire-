// ==========================================================
// H1-R — O23 safety gate (D-029): the orchestrator gate's registry check cannot start Stage 1
// ==========================================================
// Until D-029, verify_orchestrator.mjs O23 ran `orchestrate.mjs stage1` with H1R_STAGE_AUTHORISED=stage1 and relied
// on the registry refusing. After Milestone B recorded H1-R's pilot use, only an unrelated exception (a duplicate
// in-memory record) kept that probe from starting a real Stage 1. D-029 replaces it with o23RegistryIntegrity(O, typed):
// read-only, in process, no process at all. This gate proves the property without relying on any registry behaviour.
//   G  repository facts, read with git before anything runs: the change is confined to O23; the instrument, the
//      registry and the build identity are unchanged since Milestone B (6fc5a9e)
//   S  static: O23's code contains no process, CLI, authorisation, environment or execution path, and the whole gate
//      file starts no orchestrator process
//   T  dynamic, test doubles: every child-process API is trapped and the orchestrator and registry modules are wrapped
//      in guards that refuse every non-registry member. O23 runs on the real registry (where the Stage-1 pre-check
//      SUCCEEDS), on registry doubles that make more pre-checks succeed, and with the duplicate-record exception
//      removed; it starts nothing and reads only the registry members.
//   M  mutants: the old probe restored, and variants of it, are caught; weakened integrity checks are caught
//   X  nothing ran: no stage record, no raw record, no registry byte changed, no authorisation set
// Writes experiments/h1r/$H1R_EVIDENCE/o23_gates.json (default evidence_o23). Hashes are over LF-normalised text.
//
//   node experiments/h1r/verify_o23.mjs
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (process.env.H1R_STAGE_AUTHORISED !== undefined) { console.error('verify_o23: refusing to start with H1R_STAGE_AUTHORISED set'); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const MILESTONE_B = '6fc5a9eb7a3e27696b78b439765fa6fd81d73836';
const VO = 'experiments/h1r/verify_orchestrator.mjs';
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_o23');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const lf = (b) => b.toString('utf8').replace(/\r\n/g, '\n');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const results = [];
const ok = (id, title, pass, detail) => { results.push({ id, title, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${title}\n        ${detail}`); };

// ================= G: repository facts (git, before any trap is installed) =================
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const changed = [...new Set([...git('diff', '--name-only', MILESTONE_B).split('\n'), ...git('diff', '--name-only', '--cached', MILESTONE_B).split('\n'),
  ...git('ls-files', '-o', '--exclude-standard', '--', 'experiments/h1r', 'experiments/registry').split('\n').filter(f => f.startsWith('experiments/h1r/verify_o23') || f.startsWith('experiments/h1r/evidence_o23/'))])].filter(Boolean).sort();
const ALLOWED = new Set([VO, 'experiments/h1r/verify_o23.mjs', 'experiments/h1r/README.md', 'research/09_decisions.md']);
const outside = changed.filter(f => !ALLOWED.has(f) && !f.startsWith('experiments/h1r/evidence_o23/'));
ok('G1', 'scope: since Milestone B (6fc5a9e) only O23, its safety gate and evidence, the README and the decision log change', outside.length === 0 && changed.includes(VO),
  `changed: ${changed.filter(f => !f.startsWith('experiments/h1r/evidence_o23/')).join(', ')}; outside: ${outside.join(', ') || 'none'}`);
const FROZEN = ['experiments/h1r/analyze.js', 'experiments/h1r/orchestrate.mjs', 'experiments/h1r/runtime.mjs', 'experiments/h1r/measure.mjs', 'experiments/h1r/measure_install.mjs',
  'experiments/h1r/shadow.mjs', 'experiments/h1r/env_seed.mjs', 'experiments/h1r/run_h1r.mjs', 'experiments/h1r/conformance_transform.mjs', 'experiments/h1r/build_tree.mjs',
  'experiments/h1r/BUILD_IDENTITY.json', 'experiments/h1r/data', 'experiments/registry', 'research/preregistrations', 'experiments/m7', '.gitattributes',
  'experiments/h1r/evidence_milestone_b', 'experiments/h1r/evidence_milestone_a', 'experiments/h1r/evidence_orchestrator', 'experiments/h1r/evidence_analysis', 'experiments/h1r/evidence_ms1'];
const frozenDiff = git('diff', '--name-only', MILESTONE_B, '--', ...FROZEN).trim();
ok('G2', 'unchanged since Milestone B: analyze.js, orchestrate.mjs, every instrument file, the build-identity record, the data directory, the registry, the pre-registrations, the M7 substrate, .gitattributes and every earlier evidence directory',
  frozenDiff === '', frozenDiff || 'none changed');
const REC = JSON.parse(fs.readFileSync(path.join(HERE, 'BUILD_IDENTITY.json'), 'utf8'));
const entries = Object.values(REC.files).flat();
const differs = entries.filter(e => git('hash-object', '--', e.path).trim() !== e.gitBlob).map(e => e.path);
ok('G3', 'build identity: every file the Milestone-B record lists still has its recorded blob except verify_orchestrator.mjs, the one verifier D-029 changes (the record itself is unchanged; it stays bound to 6fc5a9e)',
  same(differs, [VO]), `differing: ${differs.join(', ') || 'none'}; listed ${entries.length}`);
// the change to verify_orchestrator.mjs: removed = exactly the old import line and the old O23 block; added = no process path
const oldSrc = git('cat-file', 'blob', `${MILESTONE_B}:${VO}`).replace(/\r\n/g, '\n').split('\n');
const oStart = oldSrc.findIndex(l => l.startsWith("  await guard('O23',")), oEnd = oldSrc.findIndex((l, i) => i > oStart && l === '  });');
const OLD_REMOVED = ["import { execFileSync, spawn } from 'node:child_process';", ...oldSrc.slice(oStart, oEnd + 1)].sort();
const diff = git('diff', '-U0', MILESTONE_B, '--', VO).split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const removed = diff.filter(l => l.startsWith('-')).map(l => l.slice(1)).sort(), added = diff.filter(l => l.startsWith('+')).map(l => l.slice(1));
const PROC = /\b(spawn|spawnSync|exec|execSync|execFile|execFileSync|fork|Worker|worker_threads|child_process)\b|H1R_STAGE_AUTHORISED|process\.(env|argv|chdir|exit)|\bORCH\b|orchestrate\.mjs|runCommand|stageFlow|executeJobs|driverRunner|buildTree|treeEnvironment|planStream|forkFlow/;
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/.*$/gm, '$1');
const addedCode = added.filter(l => l !== "import { spawn } from 'node:child_process';").map(stripComments);
const OLD_PROBES = oldSrc.slice(oStart, oEnd + 1).filter(l => l.includes('execFileSync(process.execPath, [ORCH'));
const kept = OLD_REMOVED.filter(l => !removed.includes(l));     // old-block lines git aligns with identical new lines
ok('G4', 'verify_orchestrator.mjs vs Milestone B: every removed line comes from the old O23 block or the old child-process import, and both old CLI probes (one with H1R_STAGE_AUTHORISED=stage1) and that import are among them; no added line (comments aside) holds a process, CLI, authorisation or execution path',
  oStart > 0 && oEnd > oStart && removed.every(l => OLD_REMOVED.includes(l)) && OLD_PROBES.length === 2 && OLD_PROBES.every(l => removed.includes(l))
    && removed.includes("import { execFileSync, spawn } from 'node:child_process';") && kept.every(l => l === '  });') && OLD_PROBES.some(l => l.includes("H1R_STAGE_AUTHORISED: 'stage1'")) && !addedCode.some(l => PROC.test(l)),
  `removed ${removed.length} of the ${OLD_REMOVED.length} old lines (kept as shared context: ${kept.length ? JSON.stringify(kept) : 'none'}); added ${added.length}; old probes removed ${OLD_PROBES.filter(l => removed.includes(l)).length}/2`);

// ================= S: static, on source text (a pure function, so mutants can be checked too) =================
function staticFindings(src) {
  const code = stripComments(src.replace(/\r\n/g, '\n')), f = [];
  const fnStart = code.indexOf('export async function o23RegistryIntegrity(O, typed) {'), fnEnd = code.indexOf('\n}\n', fnStart);
  const gStart = code.indexOf("await guard('O23',"), gEnd = code.indexOf('\n  });', gStart);
  if (fnStart < 0 || fnEnd < 0) f.push('o23RegistryIntegrity not found');
  if (gStart < 0 || gEnd < 0) f.push('O23 guard not found');
  const fn = code.slice(fnStart, fnEnd), blk = code.slice(gStart, gEnd);
  if (PROC.test(fn)) f.push(`O23 function: ${fn.match(PROC)[0]}`);
  if (/\bimport\s*\(/.test(fn)) f.push('O23 function: dynamic import');
  const oUse = [...new Set([...fn.matchAll(/\bO\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]))], tUse = [...new Set([...fn.matchAll(/\btyped\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]))];
  if (oUse.some(k => !['PROTOCOL', 'productionRegistry', 'registryPrecheck'].includes(k))) f.push(`O23 function uses O.${oUse.join(',O.')}`);
  if (tUse.some(k => !['TRAJECTORY_RECORDS', 'createTrajectoryRegistry', 'trajectorySeed'].includes(k))) f.push(`O23 function uses typed.${tUse.join(',typed.')}`);
  if (PROC.test(blk)) f.push(`O23 guard: ${blk.match(PROC)[0]}`);
  const imports = [...blk.matchAll(/\bimport\s*\(([^\n]*)/g)].map(m => m[1]);
  if (imports.length !== 1 || !imports[0].includes("'experiments', 'registry', 'typed.js'")) f.push('O23 guard imports something other than typed.js');
  if (!/o23RegistryIntegrity\(O, /.test(blk)) f.push('O23 guard does not call o23RegistryIntegrity');
  // the whole file: no authorisation, no synchronous process API, and the only spawns are the analyze.js CLI and the --fast self-spawn
  if (/H1R_STAGE_AUTHORISED/.test(code)) f.push('file: H1R_STAGE_AUTHORISED');
  if (/(?<![.\w$])(execFileSync|execSync|spawnSync|execFile|exec|fork)\s*\(|worker_threads|\bWorker\b|\brequire\s*\(|createRequire/.test(code)) f.push('file: another child-process API');
  const imp = [...code.matchAll(/^import \{([^}]*)\} from 'node:child_process';$/gm)].map(m => m[1].trim());
  if (!same(imp, ['spawn'])) f.push(`file: child_process import { ${imp.join(' | ')} }`);
  const spawns = [...code.matchAll(/\bspawn\(([^\n]*)/g)].map(m => m[1]);
  const okSpawn = (a) => a.startsWith('process.execPath, [AN_PATH, FXDIR, cliOut]') || a.startsWith("process.execPath, [fileURLToPath(import.meta.url), '--fast', file, ctxFile]");
  if (spawns.length !== 2 || !spawns.every(okSpawn)) f.push(`file: spawn sites ${spawns.length}: ${spawns.filter(a => !okSpawn(a)).map(a => a.slice(0, 60)).join(' | ')}`);
  return f;
}
const VO_SRC = lf(fs.readFileSync(path.join(REPO, ...VO.split('/'))));
const sf = staticFindings(VO_SRC);
ok('S1', 'static: O23 (o23RegistryIntegrity and its guard) holds no process, CLI, authorisation, environment, dynamic import or execution path and touches only O.PROTOCOL/productionRegistry/registryPrecheck and the typed registry; the whole gate file has no authorisation and no orchestrator process (its two spawns are the analyze.js CLI and the --fast self-spawn)',
  sf.length === 0, sf.join('; ') || 'clean');

// ================= T: dynamic, under a child-process trap and member guards =================
const before = { data: fs.readdirSync(path.join(HERE, 'data')).sort(), stageRecords: fs.existsSync(path.join(HERE, 'stage_records')),
  registry: Object.fromEntries(fs.readdirSync(path.join(REPO, 'experiments', 'registry')).filter(f => f.endsWith('.js')).sort().map(f => [f, sha(lf(fs.readFileSync(path.join(REPO, 'experiments', 'registry', f))))])) };
const attempts = [];
const require = createRequire(import.meta.url), CP = require('node:child_process'), WT = require('node:worker_threads');
for (const k of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) CP[k] = (...a) => { attempts.push(`${k} ${JSON.stringify(a).slice(0, 200)}`); throw new Error(`verify_o23 trap: ${k} blocked`); };
WT.Worker = class { constructor(...a) { attempts.push(`Worker ${JSON.stringify(a).slice(0, 200)}`); throw new Error('verify_o23 trap: Worker blocked'); } };
syncBuiltinESMExports();
const imp = (abs) => import(pathToFileURL(abs).href);
const ORCH_MOD = await imp(path.join(HERE, 'orchestrate.mjs')), TYPED = await imp(path.join(REPO, 'experiments', 'registry', 'typed.js'));
const ALLOW_O = ['PROTOCOL', 'productionRegistry', 'registryPrecheck'], ALLOW_T = ['TRAJECTORY_RECORDS', 'createTrajectoryRegistry', 'trajectorySeed'];
const guardOf = (target, allowed, log) => new Proxy(target, { get(t, k) { if (typeof k === 'symbol' || k === 'then') return Reflect.get(t, k); log.add(k); if (!allowed.includes(k)) throw new Error(`verify_o23 guard: ${k} is not a registry member`); return Reflect.get(t, k); } });
// run one o23RegistryIntegrity under the trap and the guards
async function runO23(fn, { O = ORCH_MOD, typed = TYPED } = {}) {
  const n0 = attempts.length, usedO = new Set(), usedT = new Set(), env0 = process.env.H1R_STAGE_AUTHORISED;
  let r = null, error = null;
  try { r = await fn(guardOf(O, ALLOW_O, usedO), guardOf(typed, ALLOW_T, usedT)); } catch (e) { error = String(e && e.message).slice(0, 160); }
  const envSet = process.env.H1R_STAGE_AUTHORISED !== env0; if (envSet) { if (env0 === undefined) delete process.env.H1R_STAGE_AUTHORISED; else process.env.H1R_STAGE_AUTHORISED = env0; }
  return { pass: r ? r.pass : null, evidence: r ? r.evidence : null, error, attempts: attempts.slice(n0), usedO: [...usedO].sort(), usedT: [...usedT].sort(), envSet };
}
const clean = (x) => x.attempts.length === 0 && !x.envSet && x.usedO.every(k => ALLOW_O.includes(k)) && x.usedT.every(k => ALLOW_T.includes(k));
const VOM = await imp(path.join(REPO, ...VO.split('/')));
ok('T0', 'importing verify_orchestrator.mjs starts nothing (its battery runs only when it is the main script)', attempts.length === 0 && typeof VOM.o23RegistryIntegrity === 'function', `trapped attempts ${attempts.length}`);
const real = await runO23(VOM.o23RegistryIntegrity);
const s1Exec = ORCH_MOD.registryPrecheck({ stage: 'stage1', seeds: ORCH_MOD.PROTOCOL.pilot.seeds, configBlock: { lo: 886000, hi: 889999 }, registry: await ORCH_MOD.productionRegistry() }).executable;
ok('T1', 'on the real registry, where the Stage-1 pre-check SUCCEEDS, O23 passes, starts no process, sets no authorisation and reads only the registry members (orchestrator: PROTOCOL, productionRegistry, registryPrecheck)',
  real.pass === true && s1Exec === true && clean(real) && same(real.usedO, ALLOW_O), `Stage-1 pre-check executable ${s1Exec}; pass ${real.pass}; attempts ${real.attempts.length}; used ${real.usedO.join(',')} | ${real.usedT.join(',')}; ${real.evidence}`);
// registry doubles: wrap the real registry so that more pre-checks succeed than should
const P = ORCH_MOD.PROTOCOL;
const doubleO = (wrap) => ({ PROTOCOL: P, registryPrecheck: ORCH_MOD.registryPrecheck, productionRegistry: async () => wrap(await ORCH_MOD.productionRegistry()) });
const DOUBLES = {
  'confirmatory-recorded': (r) => ({ trajectoryDecision: (v, use) => (use.category === 'registered' ? 'REPRODUCTION' : r.trajectoryDecision(v, use)), configBlockRecorded: (b) => (b.stage === 'stage2' ? true : r.configBlockRecorded(b)) }),
  'pilot-unrecorded': (r) => ({ trajectoryDecision: (v, use) => (P.pilot.seeds.includes(v) ? 'AVAILABLE' : r.trajectoryDecision(v, use)), configBlockRecorded: r.configBlockRecorded }),
  'pilot-block-unrecorded': (r) => ({ trajectoryDecision: r.trajectoryDecision, configBlockRecorded: (b) => (b.lo === P.pilot.streamStart ? false : r.configBlockRecorded(b)) }),
};
const dbl = {};
for (const [k, w] of Object.entries(DOUBLES)) dbl[k] = await runO23(VOM.o23RegistryIntegrity, { O: doubleO(w) });
ok('T2', 'registry doubles: when Stage 2 also becomes executable (all pre-checks succeed), or Stage 1 loses its records or its block, O23 reports FAIL; in every case it starts no process and reads only registry members',
  Object.values(dbl).every(x => x.pass === false && x.error === null && clean(x)), Object.entries(dbl).map(([k, x]) => `${k}: pass ${x.pass}, attempts ${x.attempts.length}`).join('; '));
// the duplicate-record exception removed: a registry factory that silently drops duplicates instead of throwing
const noThrowTyped = { ...TYPED, createTrajectoryRegistry: ({ records, ...rest }) => TYPED.createTrajectoryRegistry({ ...rest, records: records.filter((r, i, a) => a.findIndex(x => x.value === r.value && x.study === r.study) === i) }) };
const noThrow = await runO23(VOM.o23RegistryIntegrity, { typed: noThrowTyped });
ok('T3', 'with the duplicate-record exception removed (the factory silently de-duplicates), O23 still passes and still starts nothing: the safety property does not depend on that exception',
  noThrow.pass === true && clean(noThrow), `pass ${noThrow.pass}; attempts ${noThrow.attempts.length}`);
ok('T4', 'the instrument identity the orchestrator stamps is unchanged: in-process instrumentIdentity() equals the Milestone-B build-identity record', same(ORCH_MOD.instrumentIdentity(), REC.instrumentIdentity),
  `orchestrator ${REC.instrumentIdentity.orchestratorSha256.slice(0, 12)}, analyze ${REC.instrumentIdentity.analyzeSha256.slice(0, 12)}`);

// ================= M: mutants of verify_orchestrator.mjs =================
// Each mutant is checked statically; the executable ones also run under the trap and the guards, from a sandbox copy
// whose orchestrate.mjs is a stub that only writes a marker (so even an untrapped launch could not reach the real CLI).
const FN_HEAD = 'export async function o23RegistryIntegrity(O, typed) {\n  const P = O.PROTOCOL, prod = await O.productionRegistry();';
const IMPORT = "import { spawn } from 'node:child_process';";
const GUARD_HEAD = "    const r = await o23RegistryIntegrity(O, await import(pathToFileURL(path.join(REPO, 'experiments', 'registry', 'typed.js')).href));";
const S2_CLAUSE = "\n    && !s2.executable && s2.items.length === 20 && s2.items.every(i => i.decision === 'AVAILABLE') && s2.configBlock.recordedForH1R === false";
const S1_CLAUSE = "s1.executable && s1.items.length === 5 && s1.items.every(i => i.decision === 'REPRODUCTION') && s1.configBlock.recordedForH1R === true && ext.executable";
const MUTANTS = [
  ['restore-old-probe', 'the Milestone-A O23 probes (verbatim from 6fc5a9e) back in the O23 guard, with their import', [[IMPORT, "import { execFileSync, spawn } from 'node:child_process';"], [GUARD_HEAD, `    const ORCH = path.join(HERE, 'orchestrate.mjs');\n${OLD_PROBES.join('\n')}\n${GUARD_HEAD}`]], false],
  ['probe-in-function', 'an authorised execFileSync stage1 probe inside o23RegistryIntegrity', [[IMPORT, "import { execFileSync, spawn } from 'node:child_process';"],
    [FN_HEAD, `${FN_HEAD}\n  try { execFileSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), 'stage1'], { stdio: 'pipe', env: { ...process.env, H1R_STAGE_AUTHORISED: 'stage1' } }); } catch {}`]], true],
  ['probe-via-spawn', 'an authorised spawn stage1 probe inside o23RegistryIntegrity', [[FN_HEAD, `${FN_HEAD}\n  try { spawn(process.execPath, [path.join(HERE, 'orchestrate.mjs'), 'stage1'], { stdio: 'ignore', env: { ...process.env, H1R_STAGE_AUTHORISED: 'stage1' } }); } catch {}`]], true],
  ['env-authorisation', 'O23 sets H1R_STAGE_AUTHORISED=stage1 in its own environment', [[FN_HEAD, `${FN_HEAD}\n  process.env.H1R_STAGE_AUTHORISED = 'stage1';`]], true],
  ['programmatic-stage', 'O23 calls the orchestrator\'s stage flow in process', [[FN_HEAD, `${FN_HEAD}\n  await O.stageFlow({ stage: 'stage1' });`]], true],
  ['drop-stage2-check', 'O23 no longer requires Stage 2 to be non-executable', [[S2_CLAUSE, '']], true],
  ['drop-stage1-check', 'O23 no longer requires the Stage-1 records and block', [[S1_CLAUSE, 'true']], true],
];
const ROOT = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r-o23');
fs.rmSync(ROOT, { recursive: true, force: true });
const mutantResults = [];
for (const [id, what, edits, executable] of MUTANTS) {
  let src = VO_SRC, bad = null;
  for (const [a, b] of edits) { const n = src.split(a).length - 1; if (n !== 1) { bad = `ANCHOR ${n}`; break; } src = src.replace(a, () => b); }
  if (bad) { mutantResults.push({ id, what, outcome: bad, caughtBy: [] }); continue; }
  const caughtBy = [];
  if (staticFindings(src).length) caughtBy.push('S1');
  if (executable) {
    const dir = path.join(ROOT, id, 'experiments', 'h1r'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'verify_orchestrator.mjs'), src);
    fs.writeFileSync(path.join(dir, 'orchestrate.mjs'), "import fs from 'node:fs'; fs.writeFileSync(new URL('./STUB_INVOKED', import.meta.url), process.argv.slice(2).join(' '));\n");
    const M = await imp(path.join(dir, 'verify_orchestrator.mjs'));
    const runs = { real: await runO23(M.o23RegistryIntegrity), ...Object.fromEntries(await Promise.all(Object.entries(DOUBLES).map(async ([k, w]) => [k, await runO23(M.o23RegistryIntegrity, { O: doubleO(w) })]))) };
    if (fs.existsSync(path.join(dir, 'STUB_INVOKED'))) caughtBy.push('STUB-REACHED');
    if (Object.values(runs).some(x => x.attempts.length)) caughtBy.push('T-trap');
    if (Object.values(runs).some(x => x.envSet)) caughtBy.push('T-env');
    if (Object.values(runs).some(x => !x.usedO.every(k => ALLOW_O.includes(k)) || !x.usedT.every(k => ALLOW_T.includes(k)))) caughtBy.push('T-guard');
    if (runs.real.pass !== true || Object.keys(DOUBLES).some(k => runs[k].pass !== false)) caughtBy.push('T-integrity');
  }
  mutantResults.push({ id, what, outcome: caughtBy.length && !caughtBy.includes('STUB-REACHED') ? 'CAUGHT' : caughtBy.includes('STUB-REACHED') ? 'STUB REACHED' : 'NOT CAUGHT', caughtBy });
}
// control: an unmutated sandbox copy passes every static and dynamic check
{ const dir = path.join(ROOT, 'control', 'experiments', 'h1r'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'verify_orchestrator.mjs'), VO_SRC);
  const M = await imp(path.join(dir, 'verify_orchestrator.mjs'));
  const c = [await runO23(M.o23RegistryIntegrity), ...await Promise.all(Object.values(DOUBLES).map(w => runO23(M.o23RegistryIntegrity, { O: doubleO(w) })))];
  const controlOk = staticFindings(VO_SRC).length === 0 && c[0].pass === true && c.slice(1).every(x => x.pass === false) && c.every(clean);
  ok('M', `anti-vacuity: each of ${MUTANTS.length} mutants of O23 is caught (the old probe restored, an authorised probe by execFileSync or spawn, an authorisation in the environment, an in-process stage call, two weakened integrity checks); the unmutated copy passes everything; no mutant reached its stub`,
    controlOk && mutantResults.every(m => m.outcome === 'CAUGHT'), mutantResults.map(m => `${m.id}:${m.caughtBy.join('+') || m.outcome}`).join(' ') + `; control ${controlOk ? 'passes' : 'FAILS'}`); }
fs.rmSync(ROOT, { recursive: true, force: true });

// ================= X: nothing ran =================
const after = { data: fs.readdirSync(path.join(HERE, 'data')).sort(), stageRecords: fs.existsSync(path.join(HERE, 'stage_records')),
  registry: Object.fromEntries(fs.readdirSync(path.join(REPO, 'experiments', 'registry')).filter(f => f.endsWith('.js')).sort().map(f => [f, sha(lf(fs.readFileSync(path.join(REPO, 'experiments', 'registry', f))))])) };
const realAttempts = [real, ...Object.values(dbl), noThrow].reduce((n, x) => n + x.attempts.length, 0);
ok('X', 'nothing ran: no real O23 run attempted a process; experiments/h1r/data still holds only its .gitignore; no stage_records; every registry module byte-unchanged; no authorisation in the environment',
  realAttempts === 0 && same(after.data, ['.gitignore']) && same(before, after) && !after.stageRecords && process.env.H1R_STAGE_AUTHORISED === undefined,
  `attempts by the real O23 runs ${realAttempts}; data ${after.data.join(',')}; registry modules ${Object.keys(after.registry).length} unchanged ${same(before.registry, after.registry)}`);

const pass = results.filter(r => r.pass).length, fail = results.length - pass;
fs.mkdirSync(EVID, { recursive: true });
fs.writeFileSync(path.join(EVID, 'o23_gates.json'), JSON.stringify({ schema: 'h1r.o23-gates/1', generatedBy: 'experiments/h1r/verify_o23.mjs', milestoneB: MILESTONE_B,
  verifyOrchestratorSha256: sha(VO_SRC), mutants: mutantResults, pass, fail, results }, null, 1) + '\n');
console.log(`\nO23 SAFETY GATE: ${pass}/${results.length} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;

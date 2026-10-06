// ==========================================================
// H1-R — build-identity reconciliation and Stage-1 readiness gate (D-030)
// ==========================================================
// D-029 changed one verifier listed in the Milestone-B build-identity record, so D-030 re-derived the record from the
// current tree and re-bound it to the commit that writes it (parent 1919b04). This gate checks that reconciliation and
// collects the pre-Stage-1 evidence. It runs no stage, no agent and no orchestrator process.
//   I  build identity: the record at HEAD equals a derivation from HEAD; it is bound to the commit that last writes
//      it; it supersedes the Milestone-B record; against that record only the binding, the statement and the verifier
//      entries change; its instrument identity equals the one the orchestrator stamps
//   F  scope and freeze: since 1919b04 only D-030 files change; the scientific set is byte-identical at 6fc5a9e,
//      1919b04, HEAD and in the working tree, at the pinned hashes
//   R  registry: o23RegistryIntegrity on the production registry (read-only, in process; verify_o23.mjs proves it)
//   A  anti-vacuity, in a throwaway clone (no commit is made): the comparison --check runs rejects the old
//      verify_orchestrator.mjs mismatch, the Milestone-B record, one changed instrument byte, one changed analyze.js
//      byte and a changed instrument hash in the record; the unmodified clone passes --check
//   E  the readiness evidence in experiments/h1r/$H1R_EVIDENCE (default evidence_readiness), produced on this code:
//      verify_o23 12/12, verify_orchestrator 30/30, verify_freeze 11/0, the fresh clone under core.autocrlf=true
//   X  nothing ran: no stage record, no raw record, no authorisation
// Writes $H1R_EVIDENCE/readiness.json: no clock, no host path, no commit id of its own commit.
// The git state (clean tree, HEAD == origin/main) is checked after the push, outside this gate.
//
//   node experiments/h1r/verify_readiness.mjs
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BINDING_PARENT, GROUPS, RECORD, RUNTIME_HASHED, SUPERSEDES, checkAt, derive, serializeRecord } from './build_identity.mjs';

if (process.env.H1R_STAGE_AUTHORISED !== undefined) { console.error('verify_readiness: refusing to start with H1R_STAGE_AUTHORISED set'); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const MILESTONE_B = SUPERSEDES.commit, D029 = BINDING_PARENT;
const H = 'experiments/h1r/', VO = `${H}verify_orchestrator.mjs`;
const PIN = { prereg: 'c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836', analyze: 'dae6012c1ac48a96ccd9835b24e7aadce9243d95e147a5d8d2b3f833fb0a414d',
  orchestrator: '6162f8c21dab3b95b826c349a2794a70c51cf5a7f6e285a44d0b52efd398032b' };
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_readiness');
const EVID_REL = path.relative(REPO, EVID).split(path.sep).join('/');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const lf = (b) => b.toString('utf8').replace(/\r\n/g, '\n');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const blob = (spec) => execFileSync('git', ['-C', REPO, 'cat-file', 'blob', spec], { maxBuffer: 1 << 30 });
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const results = [];
const ok = (id, title, pass, detail) => { results.push({ id, title, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(3)} ${title}\n       ${detail}`); };
const section = (t) => console.log(`\n── ${t}`);

// ================= I: build identity =================
section('I   build identity (v1.0 §1.2; D-030)');
const recText = blob(`HEAD:${RECORD}`).toString('utf8'), rec = JSON.parse(recText);
const head = checkAt('HEAD'), wtRecord = fs.readFileSync(path.join(REPO, ...RECORD.split('/')), 'utf8');
const FORBIDDEN = [/[A-Za-z]:[\\/]/, /\\Users\\|\/Users\/|\/home\//, /\r/, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/];
ok('I1', 'the record committed at HEAD equals a fresh derivation from HEAD byte for byte (build_identity.mjs --check), equals the working-tree record, and carries no host path, carriage return or timestamp',
  head.same && wtRecord === recText && FORBIDDEN.every(r => !r.test(recText)), `${sha(recText)}  ${RECORD}; --check ${head.same ? 'equal' : 'DIFFERS'}`);
const writers = git('log', '--format=%H', '--', RECORD).trim().split('\n').filter(Boolean), bind = writers[0];
const parent = bind ? git('rev-parse', `${bind}^`).trim() : null;
const blobsOk = Object.values(rec.files).flat().every(e => git('rev-parse', `${bind}:${e.path}`).trim() === e.gitBlob);
ok('I2', 'binding: exactly two commits have written the record, Milestone B and the binding commit; the binding commit\'s parent is the record\'s baseCommit (1919b04, D-029); every listed file has its recorded blob in the binding commit',
  writers.length === 2 && writers[1] === MILESTONE_B && parent === rec.baseCommit && parent === D029 && blobsOk,
  `writers ${writers.length} (earlier ${writers[1] ? writers[1].slice(0, 7) : '-'}); binding parent ${parent ? parent.slice(0, 7) : '-'} = baseCommit ${rec.baseCommit.slice(0, 7)}; blobs ${blobsOk}`);
const recBText = blob(`${MILESTONE_B}:${RECORD}`).toString('utf8'), recB = JSON.parse(recBText), recBsha = sha(recBText);
const added = git('log', '--diff-filter=A', '--format=%H', '--', RECORD).trim();
const histReproduced = serializeRecord(derive(MILESTONE_B)) === recBText;       // the default ('milestone-b') profile, from 6fc5a9e's blobs
ok('I3', 'supersession and history: the record names the Milestone-B record (6fc5a9e, 9647827a…), which is the commit that added the record, whose bytes still hash to the named value; the unchanged Milestone-B derivation still reproduces that record byte for byte from 6fc5a9e\'s blobs',
  same(rec.supersedes, { ...SUPERSEDES }) && recBsha === SUPERSEDES.sha256 && added === MILESTONE_B && recB.baseCommit === 'bf0833f466ad7c626c9a719efa3a91d6b6367b16' && recB.schema === 'h1r.build-identity/1' && histReproduced,
  `supersedes ${rec.supersedes.commit.slice(0, 7)} ${rec.supersedes.sha256.slice(0, 16)}; Milestone-B record ${recBsha.slice(0, 16)}; added by ${added.slice(0, 7)}; historical derivation reproduces it ${histReproduced}`);
const topDiff = [...new Set([...Object.keys(rec), ...Object.keys(recB)])].filter(k => !same(rec[k], recB[k])).sort();
const groupsSame = same(Object.keys(rec.files), Object.keys(recB.files)) && Object.keys(recB.files).filter(g => g !== 'verifiers').every(g => same(rec.files[g], recB.files[g]));
const bv = new Map(recB.files.verifiers.map(e => [e.path, e])), cv = new Map(rec.files.verifiers.map(e => [e.path, e]));
const changedV = [...bv.keys()].filter(p => cv.has(p) && !same(cv.get(p), bv.get(p))).sort(), addedV = [...cv.keys()].filter(p => !bv.has(p)), removedV = [...bv.keys()].filter(p => !cv.has(p));
const orderKept = same(rec.files.verifiers.slice(0, bv.size).map(e => e.path), [...bv.keys()]);
const voAtD029 = cv.get(VO) && cv.get(VO).gitBlob === git('rev-parse', `${D029}:${VO}`).trim();
ok('I4', 'delta against the Milestone-B record: only schema, statement, baseCommit, supersedes and the verifier group differ; the protocol, analysis, orchestrator, instrument and registry groups, the instrument identity and the pre-registration hash are identical; in the verifier group only verify_orchestrator.mjs (now its D-029 blob) and build_identity.mjs change, and verify_o23.mjs and verify_readiness.mjs are appended',
  same(topDiff, ['baseCommit', 'files', 'schema', 'statement', 'supersedes']) && groupsSame && same(changedV, [`${H}build_identity.mjs`, VO]) && same(addedV, [`${H}verify_o23.mjs`, `${H}verify_readiness.mjs`])
    && removedV.length === 0 && orderKept && voAtD029,
  `fields ${topDiff.join(',')}; scientific groups identical ${groupsSame}; verifiers changed ${changedV.map(p => path.basename(p)).join(',')}; added ${addedV.map(p => path.basename(p)).join(',')}; removed ${removedV.length}`);
const ORCH_MOD = await import(pathToFileURL(path.join(HERE, 'orchestrate.mjs')).href);
const ident = ORCH_MOD.instrumentIdentity();
ok('I5', 'instrument identity: the record\'s instrumentIdentity equals the one the orchestrator stamps (in process) and the Milestone-B record\'s; it pins v1.0 c52e7337…a836, analyze.js dae6012c… and orchestrate.mjs 6162f8c2…',
  same(rec.instrumentIdentity, ident) && same(rec.instrumentIdentity, recB.instrumentIdentity) && rec.preregistrationSha256 === PIN.prereg && ident.analyzeSha256 === PIN.analyze && ident.orchestratorSha256 === PIN.orchestrator,
  `transform ${ident.transformSha256.slice(0, 12)}, runtime ${ident.runtimeSha256.slice(0, 12)}, measure ${ident.measureSha256.slice(0, 12)}, driver ${ident.driverSha256.slice(0, 12)}, analyze ${ident.analyzeSha256.slice(0, 12)}, orchestrator ${ident.orchestratorSha256.slice(0, 12)}`);
const attrOf = (p) => { const o = git('check-attr', 'text', '--', p).trim(); return o.slice(o.lastIndexOf(': ') + 2); };
const entryOf = (p) => Object.values(rec.files).flat().find(e => e.path === p);
const wtBad = RUNTIME_HASHED.filter(p => sha(fs.readFileSync(path.join(REPO, ...p.split('/')))) !== entryOf(p).sha256 || entryOf(p).text !== 'unset' || attrOf(p) !== 'unset');
ok('I6', `the ${RUNTIME_HASHED.length} files hashed at run time are -text and their working-tree bytes equal the record`, wtBad.length === 0, wtBad.join(',') || 'all equal');

// ================= F: scope and freeze =================
section('F   scope since D-029 and the scientific freeze');
const changed = [...new Set([...git('diff', '--name-only', D029).split('\n'), ...git('diff', '--name-only', '--cached', D029).split('\n')])].filter(Boolean).sort();
const ALLOWED = new Set([`${H}build_identity.mjs`, RECORD, `${H}verify_o23.mjs`, `${H}verify_readiness.mjs`, `${H}README.md`, 'research/09_decisions.md']);
const outside = changed.filter(f => !ALLOWED.has(f) && !f.startsWith(`${EVID_REL}/`));
ok('F1', 'scope: since 1919b04 only the build identity (record and derivation), the O23 gate\'s anchoring, this gate and its evidence, the README and the decision log change',
  outside.length === 0 && changed.includes(RECORD), `changed: ${changed.filter(f => !f.startsWith(`${EVID_REL}/`)).join(', ')}; outside: ${outside.join(', ') || 'none'}`);
const SCI = [...GROUPS.protocol, ...GROUPS.analysis, ...GROUPS.orchestrator, ...GROUPS.instrument, ...GROUPS.registry, '.gitattributes', `${H}data/.gitignore`];
const sciBad = SCI.filter(p => { const h = sha(blob(`HEAD:${p}`)); return sha(blob(`${MILESTONE_B}:${p}`)) !== h || sha(blob(`${D029}:${p}`)) !== h; });
const sciWt = git('diff', '--name-only', 'HEAD', '--', ...SCI).trim();
const pinsOk = sha(blob(`HEAD:research/preregistrations/H1R_PREREGISTRATION_v1.0.md`)) === PIN.prereg && sha(blob(`HEAD:${H}analyze.js`)) === PIN.analyze && sha(blob(`HEAD:${H}orchestrate.mjs`)) === PIN.orchestrator;
ok('F2', `scientific immutability: the ${SCI.length} files of the pre-registration, analysis, orchestrator, instrument and registry groups, .gitattributes and data/.gitignore are byte-identical at 6fc5a9e, 1919b04, HEAD and in the working tree; the pre-registration, analyze.js and orchestrate.mjs keep their pinned hashes`,
  sciBad.length === 0 && sciWt === '' && pinsOk, `differing commits: ${sciBad.join(',') || 'none'}; working tree: ${sciWt || 'clean'}; pins ${pinsOk}`);

// ================= R: registry =================
section('R   registry integrity');
const VOM = await import(pathToFileURL(path.join(REPO, ...VO.split('/'))).href), TYPED = await import(pathToFileURL(path.join(REPO, 'experiments', 'registry', 'typed.js')).href);
const reg = await VOM.o23RegistryIntegrity(ORCH_MOD, TYPED);
ok('R1', 'o23RegistryIntegrity on the production registry: Stage 1 and the extension executable as far as the registry is concerned, Stage 2 not, 000–003 refused, 004–008 recorded pilot and unexecuted', reg.pass === true, reg.evidence);

// ================= A: anti-vacuity, in a throwaway clone =================
section('A   anti-vacuity: the identity check rejects the old mismatch and a changed instrument');
const ROOT = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r-readiness');
fs.rmSync(ROOT, { recursive: true, force: true });
const headSha = git('rev-parse', 'HEAD').trim();
const cg = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
execFileSync('git', ['clone', '-q', '--no-checkout', '-c', 'core.autocrlf=false', REPO, ROOT], { stdio: ['ignore', 'pipe', 'pipe'] });
cg('checkout', '-q', '--detach', headSha);
const cli = (() => { try { execFileSync(process.execPath, [path.join(ROOT, ...H.split('/'), 'build_identity.mjs'), '--check'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }); return 0; } catch (e) { return e.status; } })();
const CB = await import(pathToFileURL(path.join(ROOT, ...H.split('/'), 'build_identity.mjs')).href);
const CO = await import(pathToFileURL(path.join(ROOT, ...H.split('/'), 'orchestrate.mjs')).href);
const cpath = (p) => path.join(ROOT, ...p.split('/'));
const editRecord = (f) => { const r = JSON.parse(fs.readFileSync(cpath(RECORD), 'utf8')); f(r); fs.writeFileSync(cpath(RECORD), serializeRecord(r)); };
const appendByte = (p) => fs.appendFileSync(cpath(p), '\n');
const MUTANTS = [
  ['old-mismatch', 'the record\'s verify_orchestrator.mjs entry restored to its Milestone-B value (the exact pre-D-030 mismatch)', () => editRecord(r => { const i = r.files.verifiers.findIndex(e => e.path === VO); r.files.verifiers[i] = recB.files.verifiers.find(e => e.path === VO); })],
  ['milestone-b-record', 'the Milestone-B record restored in place of the current one', () => fs.writeFileSync(cpath(RECORD), blob(`${MILESTONE_B}:${RECORD}`))],
  ['instrument-byte', 'one byte appended to runtime.mjs (an instrument file)', () => appendByte(`${H}runtime.mjs`)],
  ['analyze-byte', 'one byte appended to analyze.js', () => appendByte(`${H}analyze.js`)],
  ['record-instrument-hash', 'the record\'s instrumentIdentity.runtimeSha256 changed by one hex digit', () => editRecord(r => { const h = r.instrumentIdentity.runtimeSha256; r.instrumentIdentity.runtimeSha256 = h.slice(0, -1) + (h.endsWith('0') ? '1' : '0'); })],
];
const control = CB.checkAt('').same && CB.checkAt('HEAD').same && same(CO.instrumentIdentity(), rec.instrumentIdentity) && cli === 0;
const mutantResults = [];
for (const [id, what, apply] of MUTANTS) {
  apply(); cg('add', '-A');
  const caughtBy = [];
  if (!CB.checkAt('').same) caughtBy.push('identity-check');
  const cr = JSON.parse(cg('cat-file', 'blob', `:${RECORD}`));
  if (!same(CO.instrumentIdentity(), cr.instrumentIdentity)) caughtBy.push('stamp≠record');
  mutantResults.push({ id, what, outcome: caughtBy.includes('identity-check') ? 'CAUGHT' : 'NOT CAUGHT', caughtBy });
  cg('reset', '-q', '--hard', headSha);
}
const restored = CB.checkAt('').same;
fs.rmSync(ROOT, { recursive: true, force: true });
const byteStamp = mutantResults.filter(m => /byte|hash/.test(m.id)).every(m => m.caughtBy.includes('stamp≠record'));
ok('A1', `anti-vacuity: each of ${MUTANTS.length} mutants is rejected by the comparison --check runs (record vs. derivation), on the clone's index; the three instrument mutants are also rejected by the orchestrator's stamp; the unmodified clone passes --check (exit 0) and the comparison`,
  control && restored && byteStamp && mutantResults.every(m => m.outcome === 'CAUGHT'), `${mutantResults.map(m => `${m.id}:${m.caughtBy.join('+') || m.outcome}`).join(' ')}; control ${control ? 'passes' : 'FAILS'} (CLI exit ${cli})`);

// ================= E: readiness evidence produced on this code =================
section(`E   readiness evidence (${EVID_REL})`);
const voSha = sha(lf(fs.readFileSync(path.join(REPO, ...VO.split('/')))));
const O23 = readJson(path.join(EVID, 'o23_gates.json'));
ok('E1', 'verify_o23.mjs on this code: 12/12, every mutant caught, on the current verify_orchestrator.mjs',
  O23 && O23.pass === 12 && O23.fail === 0 && O23.mutants.every(m => m.outcome === 'CAUGHT') && O23.verifyOrchestratorSha256 === voSha && O23.d029 === D029,
  O23 ? `${O23.pass} PASS, ${O23.fail} FAIL; mutants ${O23.mutants.filter(m => m.outcome === 'CAUGHT').length}/${O23.mutants.length}` : 'o23_gates.json missing');
const tailOk = (f, t) => { try { const l = fs.readFileSync(path.join(EVID, ...f.split('/')), 'utf8').trimEnd().split('\n'); return l.slice(-2).join('|') === `${t}|exit 0`; } catch { return false; } };
const OG = readJson(path.join(EVID, 'orchestrator', 'orchestrator_gates.json'));
const ogOk = OG && OG.gates.length === 30 && OG.gates.every(g => g.status === 'PASS') && OG.orchestratorSha256 === PIN.orchestrator && OG.analyzeSha256 === PIN.analyze;
const runTail = (() => { try { return fs.readFileSync(path.join(EVID, 'orchestrator', 'orchestrator_run.log'), 'utf8').trimEnd().split('\n').slice(-2); } catch { return []; } })();
ok('E2', 'verify_orchestrator.mjs on this code: 30/30, on orchestrate.mjs 6162f8c2… and analyze.js dae6012c…',
  ogOk && /^30 PASS, 0 FAIL/.test(runTail[0] || '') && runTail[1] === 'exit 0', OG ? `${OG.gates.filter(g => g.status === 'PASS').length}/${OG.gates.length} PASS; ${runTail.join(' | ')}` : 'orchestrator_gates.json missing');
ok('E3', 'verify_freeze.mjs on this code: 11 PASS, 0 FAIL', tailOk('freeze_run.log', '11 PASS, 0 FAIL'), tailOk('freeze_run.log', '11 PASS, 0 FAIL') ? '11 PASS, 0 FAIL, exit 0' : 'freeze_run.log missing or failing');
const FC = readJson(path.join(EVID, 'fresh_clone.json'));
const fcConsistent = FC && FC.protectedFiles.filter(f => !f.path.startsWith(`${EVID_REL}/`)).every(f => sha(blob(`HEAD:${f.path}`)) === f.sha256);
ok('E4', 'fresh clone under core.autocrlf=true: every -text file byte-equal to its committed blob, every -text record entry equal, the clone\'s instrument identity equal to the record; its protected files are HEAD\'s',
  FC && FC.pass === true && FC.autocrlf === 'true' && FC.protectedEqual === FC.protectedCount && FC.buildIdentity.equal === FC.buildIdentity.protectedEntries && FC.buildIdentity.cloneIdentityEqualsRecord && fcConsistent,
  FC ? `${FC.protectedEqual}/${FC.protectedCount} equal; record ${FC.buildIdentity.equal}/${FC.buildIdentity.protectedEntries}; identity ${FC.buildIdentity.cloneIdentityEqualsRecord}; consistent with HEAD ${fcConsistent}` : 'fresh_clone.json missing');

// ================= X: nothing ran =================
section('X   nothing ran');
const data = fs.readdirSync(path.join(HERE, 'data')).sort(), stageDir = fs.existsSync(path.join(HERE, 'stage_records'));
const stageHist = git('log', '--format=%H', '--', `${H}stage_records`, `${H}data`).trim().split('\n').filter(Boolean).filter(c => git('show', '--name-only', '--format=', c).split('\n').some(f => f.startsWith(`${H}stage_records`) || (f.startsWith(`${H}data/`) && f !== `${H}data/.gitignore`)));
const h1r = TYPED.TRAJECTORY_RECORDS.filter(r => r.study === 'H1-R');
ok('X1', 'nothing ran: experiments/h1r/data holds only its .gitignore; no stage_records, now or in history; H1-R records only 004–008, none executed; no authorisation in the environment',
  same(data, ['.gitignore']) && !stageDir && stageHist.length === 0 && h1r.length === 5 && h1r.every(r => r.executed === false) && process.env.H1R_STAGE_AUTHORISED === undefined,
  `data ${data.join(',')}; stage_records ${stageDir ? 'PRESENT' : 'none'}; history ${stageHist.length}; H1-R records ${h1r.map(r => String(r.value).slice(-3)).join(',')} executed ${h1r.filter(r => r.executed).length}`);

const pass = results.filter(r => r.pass).length, fail = results.length - pass;
fs.mkdirSync(EVID, { recursive: true });
fs.writeFileSync(path.join(EVID, 'readiness.json'), JSON.stringify({ schema: 'h1r.readiness/1', generatedBy: 'experiments/h1r/verify_readiness.mjs', record: RECORD, recordSha256: sha(recText),
  baseCommit: rec.baseCommit, supersedes: rec.supersedes, instrumentIdentity: rec.instrumentIdentity, mutants: mutantResults, pass, fail, results }, null, 1) + '\n');
console.log(`\nSTAGE-1 READINESS GATE: ${pass}/${results.length} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;

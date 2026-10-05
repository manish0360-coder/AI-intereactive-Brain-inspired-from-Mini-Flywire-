// ==========================================================
// H1-R — Milestone B gate: registry linkage, build identity, line-ending protection, historical flips, scope
// ==========================================================
// R  the H1-R registry link and the (H1-R, pilot) trajectory records (v1.0 §7.6: the first two registry actions)
// H  historical gates: every verdict that changed because of this milestone is named, with its reason (FACT)
// B  the pre-Stage-1 build identity (v1.0 §1.2)
// A  .gitattributes -text and the fresh-clone check (core.autocrlf=true)
// S  scope: what changed since the base commit, and what did not
// X  no stage ran, no seed was generated, nothing held out was recorded
// M  anti-vacuity: mutated inputs are rejected by the named check
// Run it on the committed milestone (B3 needs the record's commit). It reads evidence written by the sweep, by
// fresh_clone_check.mjs, verify_cli.mjs and verify_orchestrator.mjs (experiments/h1r/$H1R_EVIDENCE, default
// evidence_milestone_b) and re-runs every flipped historical gate. It writes nothing. No stage runs: the gate refuses
// to start when H1R_STAGE_AUTHORISED is set.
//
//   node experiments/h1r/verify_milestone_b.mjs
// ==========================================================
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE_COMMIT, RECORD, RUNTIME_HASHED, derive, serializeRecord } from './build_identity.mjs';

if (process.env.H1R_STAGE_AUTHORISED !== undefined) { console.error('verify_milestone_b: refusing to start with H1R_STAGE_AUTHORISED set'); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_milestone_b');
const EVID_REL = path.relative(REPO, EVID).split(path.sep).join('/');
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== 'H1R_STAGE_AUTHORISED'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, env: ENV });
const blob = (spec) => execFileSync('git', ['-C', REPO, 'cat-file', 'blob', spec], { maxBuffer: 1 << 30, env: ENV });   // raw bytes, any size
const read = (rel) => fs.readFileSync(path.join(REPO, ...rel.split('/')), 'utf8');
const readJson = (abs) => JSON.parse(fs.readFileSync(abs, 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const PIN = { prereg: 'c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836', orchestrator: '6162f8c21dab3b95b826c349a2794a70c51cf5a7f6e285a44d0b52efd398032b',
  analyze: 'dae6012c1ac48a96ccd9835b24e7aadce9243d95e147a5d8d2b3f833fb0a414d' };
const PILOT = { lo: 886000, hi: 889999 }, PILOT_SEEDS = [20260819004, 20260819005, 20260819006, 20260819007, 20260819008];

let checks = 0, fails = 0;
const ok = (id, cond, msg, detail = '') => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(4)} ${msg}${detail ? `\n          ${detail}` : ''}`); return !!cond; };
const section = (t) => console.log(`\n${t}`);

// the base commit's registry, materialised from git blobs (it is imported, never executed as a gate)
const REG_CLOSURE = ['experiments/registry/typed.js', 'experiments/registry/consumed_after_study2.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/consumed.js',
  'experiments/uqb/protocol.js', 'experiments/uqa/protocol.js', 'experiments/q1/protocol.js', 'experiments/q1/instrument.js', 'experiments/m8/protocol.js', 'experiments/m8/instrument.js'];
const TMP = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r-milestone-b-gate');
fs.rmSync(TMP, { recursive: true, force: true });
for (const f of REG_CLOSURE) { const d = path.join(TMP, ...f.split('/')); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, blob(`${BASE_COMMIT}:${f}`)); }
const imp = (abs) => import(pathToFileURL(abs).href);
const OLD_TYPED = await imp(path.join(TMP, 'experiments', 'registry', 'typed.js'));
const PRED = await imp(path.join(REPO, 'experiments', 'registry', 'consumed_after_study2.js'));
const LINK = await imp(path.join(REPO, 'experiments', 'registry', 'consumed_after_h1r.js'));
const TYPED = await imp(path.join(REPO, 'experiments', 'registry', 'typed.js'));
const O = await imp(path.join(HERE, 'orchestrate.mjs'));

// ---------------- pure checks (also the targets of the M mutants) ----------------
const checkLink = (link, pred) => same(link.H1R_BLOCKS, [{ study: 'H1-R', use: 'pilot', lo: PILOT.lo, hi: PILOT.hi }])
  && link.CONSUMED_RANGES.length === pred.CONSUMED_RANGES.length + 1 && link.CONSUMED_RANGES[0].lo === PILOT.lo && link.CONSUMED_RANGES[0].hi === PILOT.hi
  && typeof link.CONSUMED_RANGES[0].why === 'string' && link.CONSUMED_RANGES[0].why.length > 0 && same(link.CONSUMED_RANGES.slice(1), pred.CONSUMED_RANGES)
  && link.HELD_OUT_FLOOR === pred.HELD_OUT_FLOOR && link.H1R_PILOT_BLOCK.evaluation.evaluatedCount === 0 && link.H1R_PILOT_BLOCK.evaluation.runsExecuted === 0
  && link.H1R_PILOT_BLOCK.evaluation.acceptedConfigurations === 0 && same(link.evaluationFor(PILOT.lo), link.H1R_PILOT_BLOCK.evaluation)
  && [885999, 890000, 892999, 895500, 896066, 900500].every(s => same(link.evaluationFor(s), pred.evaluationFor(s)));
function exhaustive(link, pred) {
  let diff = 0, outside = 0, held = 0;
  for (let s = 0; s <= 1_000_000; s++) {
    if (link.isConsumed(s) !== pred.isConsumed(s)) { diff++; if (s < PILOT.lo || s > PILOT.hi) outside++; }
    if (link.isHeldOut(s) !== pred.isHeldOut(s)) held++;
  }
  return { diff, outside, held, ok: diff === PILOT.hi - PILOT.lo + 1 && outside === 0 && held === 0 };
}
const recordKey = (r) => JSON.stringify(r);
function checkRecords(records, oldRecords) {
  const kept = records.slice(0, oldRecords.length), added = records.slice(oldRecords.length);
  return same(kept.map(recordKey), oldRecords.map(recordKey)) && added.length === PILOT_SEEDS.length
    && same(added.map(r => r.value), PILOT_SEEDS) && added.every(r => r.namespace === 'trajectory' && r.study === 'H1-R' && r.status === 'pilot' && r.executed === false
      && ['authorization', 'artifact', 'why'].every(k => typeof r[k] === 'string' && r[k].trim().length > 0) && /H1R_PREREGISTRATION_v1\.0\.md/.test(r.authorization + r.artifact)
      && same(Object.keys(r).sort(), ['artifact', 'authorization', 'executed', 'namespace', 'status', 'study', 'value', 'why']));
}
function decisions(typed) {
  const d = (v, study, category) => { try { return typed.trajectory.checkUse(typed.trajectorySeed(v), { study, category }).decision; } catch (e) { return e.code || e.name; } };
  return { pilot: PILOT_SEEDS.map(v => d(v, 'H1-R', 'pilot')), unused009: d(20260819009, 'H1-R', 'pilot'), m31: [0, 1, 2, 3].map(k => d(20260819000 + k, 'H1-R', 'pilot')),
    confirmatory: [...Array(20)].map((_, k) => d(20260819100 + k, 'H1-R', 'registered')), transition: d(20260819004, 'H1-R', 'registered'), otherStudy: d(20260819004, 'X', 'pilot') };
}
const decisionsOk = (x) => x.pilot.every(v => v === 'REPRODUCTION') && x.unused009 === 'AVAILABLE' && x.m31.every(v => v === 'CONSUMED_BY_OTHER_STUDY')
  && x.confirmatory.every(v => v === 'AVAILABLE') && x.transition === 'CATEGORY_TRANSITION' && x.otherStudy === 'CONSUMED_BY_OTHER_STUDY';
const RECORD_FORBIDDEN = [/[A-Za-z]:[\\/]/, /\\Users\\|\/Users\/|\/home\//, /\r/, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/];
const checkRecordText = (text, fresh) => text === fresh && RECORD_FORBIDDEN.every(r => !r.test(text));
// the named flips: gate → reason (FACT: observed in the sweep, re-observed below)
const FLIPS = {
  'experiments/study2/verify_study2_execution.js': 'R1, R4 and H5 flip (S3 already failed: MN-4). R1: the typed layer now also refuses 889999, the lower neighbour of the Study-2 block, because 889999 is the last seed of the adjacent H1-R pilot block 886000-889999; all 3000 Study-2 seeds are still refused. R4: consumed_after_study2.js is now imported by its successor consumed_after_h1r.js, and typed.js imports the new link (the M34 chain convention, one link on). H5: the M34 gate still cannot run for the reason MN-2 records (it materialises typed.js with only the chain files it knew); its ERR_MODULE_NOT_FOUND now names consumed_after_h1r.js instead of the consumed_after_study2.js that H5 matches.',
  'research/preregistrations/h1r_v1_checks/pilot_registry_status.mjs': 'Its output is the v1.0 Appendix B.3 registry state at freeze. It now reports the state v1.0 §7.6 requires before generation: block 886000-889999 consumed, and 20260819004-008 REPRODUCTION for (H1-R, pilot). Seeds 000-003 refused, 009 AVAILABLE, 885999 free, 890000 consumed, 900500 held out and 100-119 AVAILABLE are unchanged.',
};
const checkSweep = (sw) => {
  const changed = Object.keys(sw.gates).filter(g => !same(sw.gates[g].before, sw.gates[g].after)).sort();
  return { changed, ok: same(changed, Object.keys(FLIPS).sort()) && same([...sw.changed].sort(), changed) && changed.every(g => typeof sw.flips[g] === 'string' && sw.flips[g] === FLIPS[g]) && same(Object.keys(sw.flips).sort(), changed) };
};

// ---------------- R: registry ----------------
section('R   registry: the H1-R link and the (H1-R, pilot) trajectory records (v1.0 §7.6)');
ok('R1', checkLink(LINK, PRED), 'the new link lists exactly the H1-R pilot block 886000–889999 (H1R_BLOCKS, use pilot) ahead of its predecessor\'s ranges, inherited unchanged and in order; held-out floor inherited; the block\'s evaluation claim is "recorded before generation" (0 evaluated, 0 accepted, 0 runs); every earlier evaluation claim passes through unchanged');
const ex = exhaustive(LINK, PRED);
ok('R2', ex.ok, 'exhaustive 0..1,000,000: the new link differs from its predecessor on exactly the 4000 seeds of 886000–889999; isHeldOut is unchanged everywhere (nothing held out is recorded)', `differences ${ex.diff}, outside the block ${ex.outside}, held-out differences ${ex.held}; floor ${LINK.HELD_OUT_FLOOR}; 900500 held out ${LINK.isHeldOut(900500)}, consumed ${LINK.isConsumed(900500)}`);
const typedSrc = read('experiments/registry/typed.js');
const imports = [...typedSrc.matchAll(/^import .*$/gm)].map(m => m[0]);
const fnSame = Object.keys(OLD_TYPED).filter(k => typeof OLD_TYPED[k] === 'function').every(k => typeof TYPED[k] === 'function' && TYPED[k].toString() === OLD_TYPED[k].toString())
  && ['isHeldOut', 'isConsumed'].every(k => TYPED.config[k].toString() === OLD_TYPED.config[k].toString());
const cfg = (s) => TYPED.config.isConsumed(TYPED.configSeed(s));
ok('R3', same(imports, ["import * as CONFIG_REGISTRY from './consumed_after_h1r.js';"]) && same(Object.keys(TYPED).sort(), Object.keys(OLD_TYPED).sort()) && fnSame
  && cfg(886000) && cfg(889999) && cfg(890000) && !cfg(885999) && TYPED.config.isHeldOut(TYPED.configSeed(900500)) && !cfg(900500),
  'typed.js delegates to the new link (its only import); its exports and the source of every exported function are unchanged since the base commit; the typed layer refuses 886000–889999 and still holds 900500 out',
  `import ${imports.join(' | ')}; functions unchanged ${fnSame}`);
ok('R4', checkRecords(TYPED.TRAJECTORY_RECORDS, OLD_TYPED.TRAJECTORY_RECORDS) && same(TYPED.TRAJECTORY_HELD_OUT, OLD_TYPED.TRAJECTORY_HELD_OUT) && same(TYPED.TRAJECTORY_AUTHORIZATIONS, OLD_TYPED.TRAJECTORY_AUTHORIZATIONS),
  'TRAJECTORY_RECORDS = the base commit\'s records unchanged, then exactly five (H1-R, pilot, executed false) records for 20260819004–008 citing v1.0; no held-out trajectory region and no authorization added',
  `records ${OLD_TYPED.TRAJECTORY_RECORDS.length} → ${TYPED.TRAJECTORY_RECORDS.length}`);
const dec = decisions(TYPED);
ok('R5', decisionsOk(dec), 'decisions: 004–008 (H1-R, pilot) REPRODUCTION; 009 AVAILABLE (unused, §7.2); 000–003 refused CONSUMED_BY_OTHER_STUDY; 100–119 (H1-R, registered) AVAILABLE (not recorded); 004 as registered refused CATEGORY_TRANSITION; 004 for another study refused',
  JSON.stringify({ pilot: [...new Set(dec.pilot)], unused009: dec.unused009, m31: [...new Set(dec.m31)], confirmatory: [...new Set(dec.confirmatory)], transition: dec.transition, otherStudy: dec.otherStudy }));
const mentions = git('ls-files', '-co', '--exclude-standard', '--', '*.js', '*.mjs').trim().split('\n').filter(f => f && fs.existsSync(path.join(REPO, f)) && read(f).includes('consumed_after_h1r')).sort();
const importers = mentions.filter(f => /^(?:import|export)\s[^\n]*from\s+['"][^'"]*consumed_after_h1r\.js['"]/m.test(read(f)));
const linkImports = [...read('experiments/registry/consumed_after_h1r.js').matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
const chainUnchanged = git('diff', '--name-only', BASE_COMMIT, '--', 'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/consumed_after_study2.js').trim() === '';
ok('R6', same(importers, ['experiments/registry/typed.js']) && same(linkImports, ['./consumed_after_study2.js']) && chainUnchanged
  && mentions.every(f => ['experiments/registry/typed.js', 'experiments/registry/consumed_after_h1r.js', 'experiments/h1r/orchestrate.mjs', 'experiments/h1r/verify_orchestrator.mjs', 'experiments/h1r/verify_cli.mjs', 'experiments/h1r/verify_milestone_b.mjs', 'experiments/h1r/build_identity.mjs'].includes(f)),
  'only typed.js imports the new link; the link imports only its predecessor; consumed.js, consumed_after_c1.js and consumed_after_study2.js are byte-unchanged; the link is otherwise named only by the orchestrator\'s pre-check (by path, committed at the base) and the H1-R gates',
  `importers ${importers.join(',')}; mentions ${mentions.length}`);
const reg = await O.productionRegistry(), P = O.PROTOCOL;
const pre = (stage, seeds, configBlock) => O.registryPrecheck({ stage, seeds, configBlock, registry: reg });
const p1 = pre('stage1', P.pilot.seeds, { lo: PILOT.lo, hi: PILOT.hi }), pe = pre('extension', P.pilot.seeds, { lo: PILOT.lo, hi: PILOT.hi }), p2 = pre('stage2', P.confirmatory.seeds, { lo: 900500, hi: null });
ok('R7', p1.executable && pe.executable && !p2.executable && p2.items.every(i => i.decision === 'AVAILABLE') && p2.configBlock.recordedForH1R === false,
  'the orchestrator\'s read-only pre-check: Stage 1 and the extension are executable as far as the registry is concerned (Director authorisation still required); Stage 2 is not (confirmatory seeds and block 900500 unrecorded)',
  `stage1 ${p1.executable}, extension ${pe.executable}, stage2 ${p2.executable} (${p2.reasons.length} reasons)`);

// ---------------- H: historical gates ----------------
section('H   historical gates: every changed verdict is named, with its reason (FACT)');
const SWEEP = readJson(path.join(EVID, 'historical_gate_sweep.json'));
const sw = checkSweep(SWEEP);
ok('H1', sw.ok && SWEEP.before === BASE_COMMIT && Object.keys(SWEEP.gates).length === SWEEP.gateCount,
  `recorded sweep of ${Object.keys(SWEEP.gates).length} historical gates (before = the base commit, after = the milestone): exactly the ${Object.keys(FLIPS).length} named gates change verdict; every other verdict is unchanged`,
  `changed ${sw.changed.join(', ') || 'none'}`);
const failsOf = (out) => [...new Set([...out.matchAll(/(?:\[FAIL\]|^\s*FAIL)\s+([A-Za-z0-9._-]+)/gm)].map((m) => m[1]))].sort();
const runGate = (f) => { const r = spawnSync(process.execPath, [path.join(REPO, f)], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: ENV }); const out = String(r.stdout || ''); const fl = failsOf(out);
  return { exit: r.status, crashed: r.status !== 0 && fl.length === 0, fails: fl, output: out.replace(/\r\n/g, '\n').trimEnd().split('\n') }; };
let hi = 2;
for (const g of Object.keys(FLIPS).sort()) {
  const live = runGate(g), rec = SWEEP.gates[g].after, info = SWEEP.info.includes(g);
  const cmp = live.exit === rec.exit && live.crashed === rec.crashed && (info ? same(live.output, rec.output) : same(live.fails, rec.fails));
  ok(`H${hi++}`, cmp, `${g}: re-run now equals the recorded after-state — ${FLIPS[g]}`, info ? `exit ${live.exit}; output ${same(live.output, rec.output) ? 'equal' : 'DIFFERS'}` : `exit ${live.exit}, crashed ${live.crashed}, fails ${live.fails.join(',') || 'none'}`);
}
// the causes named above, observed directly
let s2All = true; for (let s = 890000; s <= 892999; s++) if (!cfg(s)) { s2All = false; break; }
const r889 = LINK.rangeFor(889999);
ok('H-C1', s2All && cfg(889999) && r889 && r889.lo === PILOT.lo && r889.hi === PILOT.hi && !cfg(893000) && !OLD_TYPED.config.isConsumed(OLD_TYPED.configSeed(889999)),
  'cause of the R1 flip: the typed layer still refuses all 3000 Study-2 seeds; 889999 is now refused only because it is the last seed of the H1-R pilot block (it was free at the base commit); 893000 is still free');
const m34 = spawnSync(process.execPath, [path.join(REPO, 'experiments', 'm34', 'verify.js')], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: ENV });
ok('H-C2', m34.status !== 0 && /ERR_MODULE_NOT_FOUND[\s\S]*consumed_after_h1r\.js/.test(String(m34.stderr)) && !/consumed_after_study2\.js' imported from/.test(String(m34.stderr)),
  'cause of the H5 flip: the M34 gate still stops with ERR_MODULE_NOT_FOUND (MN-2), now for consumed_after_h1r.js, the link its materialised typed.js imports', `exit ${m34.status}`);
const OG = readJson(path.join(EVID, 'orchestrator', 'orchestrator_gates.json'));
const ogFail = OG.gates.filter(g => g.status === 'FAIL').map(g => g.id), o23 = OG.gates.find(g => g.id === 'O23');
ok('H-O', same(ogFail, ['O23']) && o23.evidence === 'threw: REGISTRY_INTEGRITY: duplicate record for 20260819004|H1-R' && OG.orchestratorSha256 === PIN.orchestrator && OG.analyzeSha256 === PIN.analyze,
  'verify_orchestrator.mjs (unchanged) after the milestone: every gate passes except O23, which asserts the pre-Milestone-B registry (no H1-R record, no stage executable); its in-memory registry adds 004–008, which are now committed, so it throws a duplicate-record refusal',
  `failing ${ogFail.join(',')}; O23: ${o23 && o23.evidence}`);
// O23 also holds an authorised CLI probe (H1R_STAGE_AUTHORISED=stage1) that relied on the registry refusing. With this
// milestone's registry it would start Stage 1; it is unreachable only because O23 throws first. That is asserted here.
const voSrc = read('experiments/h1r/verify_orchestrator.mjs');
const iMem = voSrc.indexOf('const mem = typed.createTrajectoryRegistry({ records: [...typed.TRAJECTORY_RECORDS, ...recs]'), iProbe = voSrc.indexOf("H1R_STAGE_AUTHORISED: 'stage1'");
let dupThrows = false;
try { TYPED.createTrajectoryRegistry({ records: [...TYPED.TRAJECTORY_RECORDS, ...PILOT_SEEDS.map(v => ({ namespace: 'trajectory', value: v, study: 'H1-R', status: 'pilot', executed: false, authorization: 'x', artifact: 'x', why: 'x' }))], heldOut: [], authorizations: [] }); }
catch (e) { dupThrows = e.message === 'REGISTRY_INTEGRITY: duplicate record for 20260819004|H1-R'; }
ok('H-P', iMem > 0 && iProbe > iMem && dupThrows && voSrc.split("H1R_STAGE_AUTHORISED: 'stage1'").length === 2,
  'O23\'s authorised CLI probe (which, with this registry, would start Stage 1) is unreachable: it is the only authorised call in the gate, it follows the in-memory registry construction, and that construction now throws (duplicate 004–008 records)',
  `construction at ${iMem}, probe at ${iProbe}, throws ${dupThrows}`);

// ---------------- B: build identity ----------------
section('B   pre-Stage-1 build identity (v1.0 §1.2)');
const recText = read(RECORD);
const committed = git('log', '--format=%H', '--diff-filter=A', '--', RECORD).trim().split('\n').filter(Boolean);
const bindCommit = committed.length === 1 ? committed[0] : null;
const fresh = serializeRecord(derive(bindCommit || ''));
ok('B1', checkRecordText(recText, fresh), 'the record equals a fresh derivation from the git blobs of its binding commit, byte for byte; it carries no host path, no carriage return and no timestamp', `${sha(recText)}  ${RECORD}`);
const rec = JSON.parse(recText);
const cliIdentity = JSON.parse(execFileSync(process.execPath, [path.join(HERE, 'orchestrate.mjs'), 'identity'], { cwd: REPO, encoding: 'utf8', env: ENV }));
ok('B2', rec.preregistrationSha256 === PIN.prereg && rec.instrumentIdentity.orchestratorSha256 === PIN.orchestrator && rec.instrumentIdentity.analyzeSha256 === PIN.analyze
  && same(rec.instrumentIdentity, O.instrumentIdentity()) && same(rec.instrumentIdentity, cliIdentity) && read('research/preregistrations/H1R_PREREGISTRATION_v1.0.sha256').includes(PIN.prereg),
  'it pins v1.0 c52e7337…a836, orchestrate.mjs 6162f8c2… and analyze.js dae6012c…, and its instrumentIdentity equals both the in-process instrumentIdentity() and `orchestrate.mjs identity`');
const parent = bindCommit ? git('rev-parse', `${bindCommit}^`).trim() : null;
const blobsOk = bindCommit && Object.values(rec.files).flat().every(e => git('rev-parse', `${bindCommit}:${e.path}`).trim() === e.gitBlob);
ok('B3', bindCommit && parent === rec.baseCommit && blobsOk, 'commit identity: exactly one commit adds the record; its parent is the record\'s baseCommit; every listed file\'s blob in that commit equals the recorded blob id',
  `binding commit ${bindCommit ? bindCommit.slice(0, 12) : 'NOT COMMITTED'}; parent ${parent ? parent.slice(0, 12) : '-'}; blobs ${blobsOk}`);
const wt = RUNTIME_HASHED.map(p => [p, sha(fs.readFileSync(path.join(REPO, ...p.split('/')))) === Object.values(rec.files).flat().find(e => e.path === p).sha256]);
ok('B4', wt.every(([, e]) => e) && RUNTIME_HASHED.every(p => Object.values(rec.files).flat().find(e => e.path === p).text === 'unset'),
  `the ${RUNTIME_HASHED.length} files hashed at run time (analyze.js, orchestrate.mjs, the 7 instrument files) are -text and their working-tree bytes equal the record`, wt.filter(([, e]) => !e).map(([p]) => p).join(',') || 'all equal');

// ---------------- A: line endings ----------------
section('A   .gitattributes -text and the fresh clone under core.autocrlf=true');
const NEW_RULES = ['experiments/h1r/orchestrate.mjs -text', 'experiments/h1r/conformance_transform.mjs -text', 'experiments/h1r/runtime.mjs -text', 'experiments/h1r/measure.mjs -text',
  'experiments/h1r/measure_install.mjs -text', 'experiments/h1r/shadow.mjs -text', 'experiments/h1r/env_seed.mjs -text', 'experiments/h1r/run_h1r.mjs -text',
  'experiments/h1r/BUILD_IDENTITY.json -text', 'experiments/h1r/cli_gate/** -text', 'experiments/h1r/evidence_milestone_b/** -text',
  'experiments/h1r/verify_existing_equivalence.mjs -text'];
const attrDiff = git('diff', BASE_COMMIT, '--', '.gitattributes').split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const removed = attrDiff.filter(l => l.startsWith('-')), addedRules = attrDiff.filter(l => l.startsWith('+') && !l.startsWith('+#') && l.trim() !== '+').map(l => l.slice(1));
ok('A1', removed.length === 0 && same(addedRules, NEW_RULES), '.gitattributes only gains lines: the 12 new rules are orchestrate.mjs, the 7 instrument files, the build-identity record, the CLI-gate doubles, this milestone\'s evidence and (D-028) the N3 implementation, plus comments',
  `removed ${removed.length}; rules ${addedRules.length}`);
const attrOf = (p) => { const o = git('check-attr', 'text', '--', p).trim(); return o.slice(o.lastIndexOf(': ') + 2); };
const prot = [...RUNTIME_HASHED, RECORD, 'experiments/h1r/verify_existing_equivalence.mjs', ...git('ls-files', '--', 'experiments/h1r/cli_gate', EVID_REL).trim().split('\n').filter(Boolean)];
ok('A2', prot.every(p => attrOf(p) === 'unset'), `git check-attr: text is unset for all ${prot.length} protected H1-R files`, prot.filter(p => attrOf(p) !== 'unset').join(',') || 'all unset');
const FC = readJson(path.join(EVID, 'fresh_clone.json'));
const fcConsistent = FC.protectedFiles.filter(f => !f.path.startsWith(`${EVID_REL}/`)).every(f => sha(blob(`HEAD:${f.path}`)) === f.sha256);
ok('A3', FC.pass === true && FC.autocrlf === 'true' && FC.protectedEqual === FC.protectedCount && FC.runtimeHashedAllProtected && FC.buildIdentity.equal === FC.buildIdentity.protectedEntries
  && FC.buildIdentity.cloneIdentityEqualsRecord && fcConsistent && same(FC.baseDemonstration.converted, RUNTIME_HASHED.filter(p => !p.endsWith('analyze.js'))),
  'fresh clone with core.autocrlf=true: every -text file is byte-equal to its committed blob, every -text record entry equals the record, and the clone\'s `identity` equals the record; at the base commit the same checkout converts exactly the 8 run-time-hashed files that lacked -text',
  `${FC.protectedEqual}/${FC.protectedCount} equal; record ${FC.buildIdentity.equal}/${FC.buildIdentity.protectedEntries}; base converted ${FC.baseDemonstration.converted.length}; consistent with HEAD ${fcConsistent}`);

// ---------------- S: scope ----------------
section('S   scope');
const ALLOWED = new Set(['.gitattributes', 'research/09_decisions.md', 'experiments/registry/typed.js', 'experiments/registry/consumed_after_h1r.js', RECORD,
  'experiments/h1r/build_identity.mjs', 'experiments/h1r/fresh_clone_check.mjs', 'experiments/h1r/verify_cli.mjs', 'experiments/h1r/verify_milestone_b.mjs',
  'experiments/h1r/README.md', 'experiments/h1r/verify_existing_equivalence.mjs', 'experiments/h1r/verify_d028.mjs']);   // the last two: D-028
// tracked changes against the base: committed, staged or in the working tree (untracked files are not part of the milestone)
const changedFiles = [...new Set([...git('diff', '--name-only', BASE_COMMIT).trim().split('\n'), ...git('diff', '--name-only', '--cached', BASE_COMMIT).trim().split('\n')])].filter(Boolean).sort();
const outside = changedFiles.filter(f => !ALLOWED.has(f) && !f.startsWith('experiments/h1r/cli_gate/') && !f.startsWith(`${EVID_REL}/`));
ok('S1', outside.length === 0, 'every change since the base commit is a Milestone-B file (registry link and records, build identity, gates, doubles, evidence, README, decision log, .gitattributes, the D-028 N3 change and its gate)', `outside: ${outside.join(', ') || 'none'} (${changedFiles.length} changed)`);
const FROZEN = ['experiments/h1r/analyze.js', 'experiments/h1r/orchestrate.mjs', 'experiments/h1r/conformance_transform.mjs', 'experiments/h1r/runtime.mjs', 'experiments/h1r/measure.mjs',
  'experiments/h1r/measure_install.mjs', 'experiments/h1r/shadow.mjs', 'experiments/h1r/env_seed.mjs', 'experiments/h1r/run_h1r.mjs', 'experiments/h1r/build_tree.mjs', 'experiments/h1r/run_one.mjs',
  'experiments/h1r/verify_orchestrator.mjs', 'experiments/h1r/verify_analysis.mjs', 'experiments/h1r/verify_conformance.mjs', 'experiments/h1r/verify_ms1_unit.mjs',
  'experiments/h1r/run_existing_gates.mjs', 'experiments/h1r/verify_hook.mjs', 'experiments/h1r/data/.gitignore',
  'research/preregistrations', 'research/cognitive-audit', 'experiments/m7', 'main.js', 'render', 'instrumentation', 'connections.json', 'neurons.json',
  'experiments/h1r/evidence_ms1', 'experiments/h1r/evidence_r1', 'experiments/h1r/evidence_r2', 'experiments/h1r/evidence_r3', 'experiments/h1r/evidence_d1d5', 'experiments/h1r/evidence_final',
  'experiments/h1r/evidence_analysis', 'experiments/h1r/evidence_orchestrator', 'experiments/h1r/evidence_milestone_a', 'experiments/study2', 'experiments/registry/consumed.js',
  'experiments/registry/consumed_after_c1.js', 'experiments/registry/consumed_after_study2.js'];
const frozenDiff = git('diff', '--name-only', BASE_COMMIT, '--', ...FROZEN).trim();
ok('S2', frozenDiff === '', 'byte-unchanged since the base commit: analyze.js, orchestrate.mjs, every instrument file, every earlier H1-R gate except verify_existing_equivalence.mjs (D-028, section D), the pre-registrations and the sealed package, the M7 documents and substrate, the production tree, the earlier registry links, Study 2 and every earlier evidence directory', frozenDiff || 'none changed');

// ---------------- D: D-028 (N3: verify_determinism.js C1 compared without its fingerprint count) ----------------
section('D   D-028: the N3 C1-count interpretation, its anti-vacuity gate, and the re-evaluated §11 evidence');
const EQ = 'experiments/h1r/verify_existing_equivalence.mjs';
const eqDiff = git('diff', '-U0', BASE_COMMIT, '--', EQ).split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const REMOVED_EXPECTED = ['stays binding (see the N3 block for why exact text of non-reproducible lines cannot be required)', 'equivalence of two runs of one script (`except`: assertion IDs exempt from comparison, for H1R-S6 only)',
  'function equivalent(s, p, o, except = []) {', 'else if (l !== O[k] && !nondet[s].has(idxP[k])) why.push(', '{ const bad = [], detail = {};', 'const why = equivalent(s, p, o);',
  "gate('N3', 'OFF ≡ pristine", 'differences: ${bad.length'];
const removedEq = eqDiff.filter(l => l.startsWith('-')), addedEq = eqDiff.filter(l => l.startsWith('+')).join('\n');
const removedOk = removedEq.length === REMOVED_EXPECTED.length && REMOVED_EXPECTED.every(t => removedEq.filter(l => l.includes(t)).length === 1);
ok('D1', removedOk && addedEq.includes("const D028 = Object.freeze({ script: 'verify_determinism.js', id: 'C1',") && addedEq.includes('const oneC1 = ') && /D-028/.test(addedEq),
  'verify_existing_equivalence.mjs differs from the base commit only by D-028: exactly the 8 expected lines are replaced (header note, the text comparison, equivalent()\'s signature and comment, the N3 loop and the N3 report), around the named D028 constant',
  `removed ${removedEq.length}, added ${eqDiff.length - removedEq.length}`);
const D28 = readJson(path.join(EVID, 'd028_gates.json'));
const S11 = path.join(EVID, 'section11');
ok('D2', D28.implementationSha256 === sha(fs.readFileSync(path.join(REPO, ...EQ.split('/')))) && D28.fail === 0 && D28.pass === 10 && D28.mutants.length === 11 && D28.mutants.every(m => m.outcome === 'CAUGHT')
  && D28.sourceEvidence.mainSha256 === sha(fs.readFileSync(path.join(S11, 'existing_gates.json'))) && D28.cases.every(c => c.control === c.expected),
  'verify_d028.mjs ran on these exact bytes of the implementation and on this §11 evidence: CTRL and A–H pass and all 11 over-broad exemptions are caught',
  `${D28.pass}/${D28.pass + D28.fail}; mutants ${D28.mutants.map(m => `${m.id}:${m.caughtBy.join('+')}`).join(' ')}`);
const EQV = readJson(path.join(S11, 'existing_equivalence.json')), EQ1 = readJson(path.join(S11, 'existing_equivalence.firsteval.json')), EQ2 = readJson(path.join(S11, 'existing_equivalence.secondeval.json'));
const n3 = EQV.gates.find(g => g.id === 'N3'), failOnlyN3 = (e) => same(e.gates.filter(g => g.status === 'FAIL').map(g => g.id), ['N3']);
ok('D3', EQV.gates.every(g => g.status === 'PASS' || g.status === 'INFO') && /differences: none;/.test(n3.evidence)
  && /D-028 \(C1 count only\): main verify_determinism\.js: #4 C1 \| n3_repeat_o verify_determinism\.js: #4 C1 \| n3_repeat_t verify_determinism\.js: #4 C1;/.test(n3.evidence)
  && failOnlyN3(EQ1) && failOnlyN3(EQ2) && [EQ1, EQ2].every(e => /differences: [^;]*verify_determinism\.js: #4 C1: text/.test(e.gates.find(g => g.id === 'N3').evidence) && !/differences: [^;]*(id\/verdict|exit|assertions )/.test(e.gates.find(g => g.id === 'N3').evidence)),
  'the §11 equivalence re-evaluated under D-028 on the unchanged Milestone-B evidence passes (N3: no difference; D-028 applied to the three C1 lines that differ); the first and second evaluations are kept and failed only on N3, only on C1\'s text',
  `${EQV.gates.map(g => `${g.id}:${g.status}`).join(' ')}`);
const dlog = read('research/09_decisions.md');
ok('D4', dlog.indexOf('## D-028 ') > 0 && dlog.indexOf('## D-028 ') < dlog.indexOf('## D-027 ') && /named interpretation of the frozen relation "OFF ≡ pristine"/.test(dlog),
  'the decision log records D-028 (newest first) as a named interpretation of D-019 §5 N3');
// the reused battery results ran on the instrument this record pins (their own hash fields)
const RI = rec.instrumentIdentity, C11 = readJson(path.join(S11, 'conformance_gates.json')), M11 = readJson(path.join(S11, 'ms1_unit.json')), MCL = readJson(path.join(EVID, 'closure', 'ms1_unit.json'));
const AN11 = readJson(path.join(EVID, 'analysis', 'analysis_gates.json'));
const tailOk = (f, t) => { const l = fs.readFileSync(path.join(EVID, ...f.split('/')), 'utf8').trimEnd().split('\n'); return l.slice(-2).join('|') === `${t}|exit 0`; };
ok('D5', C11.transformSha256 === RI.transformSha256 && M11.transformSha256 === RI.transformSha256 && M11.measureSha256 === RI.measureSha256 && MCL.transformSha256 === RI.transformSha256
  && MCL.measureSha256 === RI.measureSha256 && AN11.analyzeSha256 === RI.analyzeSha256 && OG.orchestratorSha256 === RI.orchestratorSha256 && OG.analyzeSha256 === RI.analyzeSha256
  && same(C11.gates.filter(g => g.status === 'FAIL').map(g => g.id), ['F2', "G15'", 'P1']) && AN11.gates.every(g => g.status !== 'FAIL')
  && tailOk('closure/ms1_unit_run.log', '15 PASS, 0 FAIL') && tailOk('closure/freeze_run.log', '11 PASS, 0 FAIL'),
  '§11 battery bound to this build: conformance (FAIL exactly F2, G15′, P1, the non-blocking set), MS-1 unit, analysis and orchestrator evidence carry the transform, measure, analyze.js and orchestrator hashes of the record; MS-1 unit 15/0 and freeze 11/0 re-run at closure',
  `conformance FAIL ${C11.gates.filter(g => g.status === 'FAIL').map(g => g.id).join(',')}; analysis FAIL ${AN11.gates.filter(g => g.status === 'FAIL').length}`);

// ---------------- X: nothing ran ----------------
section('X   no stage, no new seed, nothing held out');
const dataDir = fs.readdirSync(path.join(HERE, 'data')).sort();
const trackedData = git('ls-files', '--', 'experiments/h1r/data').trim().split('\n').filter(Boolean);
const stageHist = git('log', '--format=%H', `${BASE_COMMIT}~0..HEAD`, '--', 'experiments/h1r/stage_records').trim();
ok('X1', same(dataDir, ['.gitignore']) && same(trackedData, ['experiments/h1r/data/.gitignore']) && !fs.existsSync(path.join(HERE, 'stage_records')) && stageHist === '',
  'no stage ran: experiments/h1r/data holds only its .gitignore (no raw record, tracked or ignored), experiments/h1r/stage_records does not exist and no commit since the base touched it',
  `data ${dataDir.join(',')}; stage_records ${fs.existsSync(path.join(HERE, 'stage_records'))}`);
const CLI = readJson(path.join(EVID, 'cli_gates.json'));
ok('X2', CLI.fail === 0 && CLI.pass === CLI.results.length && CLI.results.length === 15 && CLI.orchestratorSha256 === PIN.orchestrator,
  'the CLI gate (C1–C15) passed: every authorised stage command ran in a sandbox on test doubles; the repository was byte-unchanged; Stage 2 halted on the registry before any held-out position', `${CLI.pass}/${CLI.results.length}; authorised sandbox commands ${CLI.authorisedSandboxCommands}`);
ok('X3', LINK.HELD_OUT_FLOOR === PRED.HELD_OUT_FLOOR && TYPED.TRAJECTORY_HELD_OUT.length === 0 && dec.confirmatory.every(v => v === 'AVAILABLE') && !LINK.H1R_BLOCKS.some(b => b.use !== 'pilot'),
  'no new seed and nothing held out: the only values recorded are v1.0\'s pilot block and pilot seeds (frozen 2026-10-04); no confirmatory seed, no held-out block and no held-out floor change is recorded');

// ---------------- M: anti-vacuity ----------------
section('M   anti-vacuity: mutated inputs must be rejected by the named check');
const linkLike = (over) => ({ ...LINK, ...over });
ok('M1', !checkLink(linkLike({ H1R_BLOCKS: [{ study: 'H1-R', use: 'pilot', lo: 886000, hi: 889998 }] }), PRED) && !checkLink(linkLike({ CONSUMED_RANGES: [...LINK.CONSUMED_RANGES, { lo: 900500, hi: 900529, why: 'x' }] }), PRED)
  && !checkLink(linkLike({ HELD_OUT_FLOOR: LINK.HELD_OUT_FLOOR + 1 }), PRED) && !checkLink(linkLike({ H1R_BLOCKS: [...LINK.H1R_BLOCKS, { study: 'H1-R', use: 'confirmatory', lo: 900500, hi: null }] }), PRED)
  && !checkLink(linkLike({ CONSUMED_RANGES: [LINK.CONSUMED_RANGES[0], ...LINK.CONSUMED_RANGES.slice(2)] }), PRED),
  'R1 rejects a shortened block, an extra consumed range at the confirmatory stream, a changed held-out floor, a confirmatory H1-R block, and a dropped inherited range');
const recs = TYPED.TRAJECTORY_RECORDS.map(r => ({ ...r })), mutR = (f) => { const c = recs.map(r => ({ ...r })); f(c); return checkRecords(c, OLD_TYPED.TRAJECTORY_RECORDS); };
ok('M2', !mutR(c => c.push({ ...c[c.length - 1], value: 20260819009 })) && !mutR(c => { c[c.length - 1].status = 'registered'; }) && !mutR(c => { c[c.length - 1].executed = true; })
  && !mutR(c => { c[0].why = 'changed'; }) && !mutR(c => c.splice(c.length - 1, 1)) && !mutR(c => { c[c.length - 2].study = 'H1R'; }),
  'R4 rejects an extra seed 009, a registered status, executed true, an edited historical record, a missing pilot seed and a misspelt study');
ok('M3', !decisionsOk({ ...dec, confirmatory: ['REPRODUCTION', ...dec.confirmatory.slice(1)] }) && !decisionsOk({ ...dec, pilot: ['AVAILABLE', ...dec.pilot.slice(1)] }) && !decisionsOk({ ...dec, unused009: 'REPRODUCTION' }),
  'R5 rejects a recorded confirmatory seed, an unrecorded pilot seed and a recorded seed 009');
const inj = (s) => [recText.replace('"study": "H1-R"', s), fresh.replace('"study": "H1-R"', s)];
ok('M4', !checkRecordText(recText.replace(PIN.analyze, `e${PIN.analyze.slice(1)}`), fresh) && !checkRecordText(recText.replace(/\n/g, '\r\n'), fresh.replace(/\n/g, '\r\n'))
  && !checkRecordText(...inj('"study": "H1-R", "at": "2026-10-05T12:00:00Z"')) && !checkRecordText(...inj('"study": "H1-R", "dir": "C:/work/mini-flywire"')),
  'B1 rejects a record whose analyze.js hash differs from its blobs, a CRLF record, a timestamped record and a record with a host path');
const swMut = JSON.parse(JSON.stringify(SWEEP)); const anyKept = Object.keys(swMut.gates).find(g => !(g in FLIPS));
if (anyKept) swMut.gates[anyKept].after = { ...swMut.gates[anyKept].after, fails: [...(swMut.gates[anyKept].after.fails || []), 'ZZ'] };
const swMut2 = JSON.parse(JSON.stringify(SWEEP)); const firstFlip = Object.keys(FLIPS)[0]; if (firstFlip) delete swMut2.flips[firstFlip];
ok('M5', !checkSweep(swMut).ok && (!firstFlip || !checkSweep(swMut2).ok), 'H1 rejects a sweep in which an unnamed gate changed and a sweep that drops a named flip\'s reason');

fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n' + '='.repeat(78));
console.log(`  MILESTONE B VERIFY: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
process.exitCode = fails ? 1 : 0;

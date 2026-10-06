// ==========================================================
// H1-R — verification of the orchestrator (gates O1–O26; D-026)
// ==========================================================
// Material: ONLY the historical G15 configuration material already used by verify_conformance.mjs (the first three
// samples of experiments/h1r/evidence_ms1/g15_samples.json, accepted at their own seeds, at the conformance suite's
// driver positions: block 'heldout', index = configIndex) and agent seed 20260819000. No new seed is generated, no
// H1-R configuration is generated, the registry is not changed, and no stage of H1-R runs. The diagnostic records are
// verification material, kept under the system temporary directory, never in experiments/h1r/data/.
// BLINDING: gates report mechanism quantities only (statuses, counts, hashes, equality), never outcome metrics.
//
//   node experiments/h1r/verify_orchestrator.mjs                     full battery (writes experiments/h1r/$H1R_EVIDENCE/)
//   node experiments/h1r/verify_orchestrator.mjs --fast <orch> <ctx>  fast gates against the given orchestrator (mutants)
// ==========================================================
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const FXDIR = path.join(REPO, 'research', 'preregistrations', 'h1r_d021b', 'fixtures');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(FXDIR, f), 'utf8'));
const S0 = 20260819000;
const STUB_REGISTRY = Object.freeze({ trajectoryDecision: () => 'REPRODUCTION', configBlockRecorded: () => true });
const winOf = (tau) => tau >= 0 && tau <= 299 ? 'W1' : tau <= 1499 && tau >= 300 ? 'W2' : tau >= 1500 && tau <= 1799 ? 'W3' : tau >= 1800 && tau <= 2999 ? 'W4' : null;
const expectHalt = (fn, code) => { try { fn(); return `no halt`; } catch (e) { return e && e.code === code ? true : `${e && e.code}: ${String(e && e.message).slice(0, 120)}`; } };
const expectHaltAsync = async (fn, code) => { try { await fn(); return 'no halt'; } catch (e) { return e && e.code === code ? true : `${e && e.code}: ${String(e && e.message).slice(0, 120)}`; } };

/** A working copy of a raw root: record files hard-linked (read-only use), ledgers copied (they are appended). */
function linkTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const d of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, d.name), b = path.join(dst, d.name);
    if (d.isDirectory()) linkTree(a, b); else if (d.name === 'ATTEMPTS.jsonl') fs.copyFileSync(a, b); else fs.linkSync(a, b);
  }
}
const hashTree = (root) => { const out = {}; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(root, p).split(path.sep).join('/')] = sha(fs.readFileSync(p)); } }; if (fs.existsSync(root)) walk(root); return out; };
/** A runner that "executes" a job by linking the already-produced record of the same job (schedule tests). */
const replayRunner = (srcRoot, { fail = new Set(), noFile = new Set(), calls = [] } = {}) => async (job, partial) => {
  calls.push(job.runId);
  if (fail.has(job.runId)) return { code: 1, stderr: 'simulated process death' };
  if (noFile.has(job.runId)) return { code: 0, stderr: '' };
  fs.linkSync(path.join(srcRoot, job.path), partial); return { code: 0, stderr: '' };
};
const ledger = (root, stage, ids) => { fs.mkdirSync(path.join(root, 'raw', stage), { recursive: true }); fs.writeFileSync(path.join(root, 'raw', stage, 'ATTEMPTS.jsonl'), ids.map(id => JSON.stringify({ runId: id }) + '\n').join('')); };

// ---------------- fast gates (importable against any orchestrator file) ----------------
export async function fastChecks(orchPath, ctx) {
  const O = await import(pathToFileURL(orchPath).href + `?v=${sha(fs.readFileSync(orchPath)).slice(0, 12)}`);
  const A = await import(pathToFileURL(path.join(HERE, 'analyze.js')).href);
  const G = []; const ok = (id, name, cond, ev) => G.push({ id, name, status: cond ? 'PASS' : 'FAIL', evidence: ev });
  const guard = async (id, name, fn) => { try { await fn(); } catch (e) { G.push({ id, name, status: 'FAIL', evidence: `threw: ${String(e && e.message).slice(0, 240)}` }); } };
  const work = fs.mkdtempSync(path.join(ctx.scratchBase, 'w-')), diag = path.join(work, 'diag');
  linkTree(ctx.diagRoot, diag);
  const before = hashTree(diag);
  const ident = O.instrumentIdentity();
  const jobs = O.planStage({ stage: 'diagnostic', block: 'heldout', configs: ctx.diagConfigs, seeds: [S0] });
  const baseJob = (cfg, arm) => jobs.find(j => j.role === 'base' && j.configIndex === cfg && j.arm === arm);
  const raw = (j) => JSON.parse(fs.readFileSync(path.join(diag, j.path), 'utf8'));
  let n = 0; const fresh = () => { const r = path.join(work, `r${n++}`); fs.mkdirSync(r, { recursive: true }); return r; };
  /** classify job j with (optionally mutated) record bytes in a fresh root */
  const classifyVariant = (j, mutate, asText = null) => { const r = fresh(), p = path.join(r, j.path); fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, asText ?? JSON.stringify(mutate ? mutate(raw(j)) : raw(j))); ledger(r, j.stage, [j.runId]);
    return () => O.classifyJob(j, { root: r, ident, attemptedIds: new Set([j.runId]) }); };
  const c0 = ctx.diagConfigs[0].configIndex, a2 = baseJob(c0, 'A2');

  await guard('O1', 'schema', () => {
    const variants = { schema: (r) => ({ ...r, schema: 'h1r.run/1' }), step0Missing: (r) => { delete r.measurement.step0; return r; }, digestOnly: (r) => ({ ...r, measurement: { schema: r.measurement.schema, digest: 'x' } }),
      flagMissing: (r) => { delete r.validity.envStreamScoped; return r; }, validInconsistent: (r) => { r.validity.valid = !r.validity.valid; return r; }, measureSchema: (r) => { r.measurement.schema = 'h1r.measure/1'; return r; } };
    const res = Object.fromEntries(Object.entries(variants).map(([k, f]) => [k, expectHalt(classifyVariant(a2, f), 'MALFORMED')]));
    res.notJson = expectHalt(classifyVariant(a2, null, '{not json'), 'MALFORMED');
    const control = classifyVariant(a2, null)().status;
    ok('O1', 'schema: a foreign run schema, a foreign measurement schema, a missing step0, a digest-only record, a missing validity flag, an inconsistent `valid` and non-JSON bytes each halt (MALFORMED); the unmodified record classifies valid',
      Object.values(res).every(v => v === true) && control === 'valid', `${JSON.stringify(res)}; control ${control}`);
  });
  await guard('O2', 'identity', () => {
    const mut = (f) => (r) => { f(r.provenance); return r; };
    const variants = { arm: mut(p => { p.arm = 'A3'; }), configIndex: mut(p => { p.configIndex += 1; }), agentSeed: mut(p => { p.agentSeed += 1; }), goal: mut(p => { p.goal = p.goal === 8 ? 12 : 8; }),
      acceptedSeed: mut(p => { p.acceptedSeed += 1; }), configSeed: mut(p => { p.configSeed -= 1; }), block: mut(p => { p.h1r.envStream.block = 'pilot'; }),
      envSeed: mut(p => { p.h1r.envStream.envSeed = (p.h1r.envStream.envSeed + 1) >>> 0; }), fork: mut(p => { p.h1r.fork = { call: 705, to: 'A2' }; }) };
    const res = Object.fromEntries(Object.entries(variants).map(([k, f]) => [k, expectHalt(classifyVariant(a2, f), 'IDENTITY')]));
    ok('O2', 'identity: a record whose arm, configuration index, agent seed, goal, accepted seed, stream start seed, block, R3 environment seed or fork differs from its planned job halts (IDENTITY)',
      Object.values(res).every(v => v === true), JSON.stringify(res));
  });
  await guard('O3', 'hashes', () => {
    const z = '0'.repeat(64), mut = (k) => (r) => { r.provenance.h1r[k] = k === 'b2Commit' ? z.slice(0, 40) : z; return r; };
    const res = Object.fromEntries(['transformSha256', 'runtimeSha256', 'measureSha256', 'measureInstallSha256', 'shadowSha256', 'envSeedSha256', 'driverSha256', 'b2Commit'].map(k => [k, expectHalt(classifyVariant(a2, mut(k)), 'INSTRUMENT')]));
    ok('O3', 'hashes: a record produced by a different transform, runtime, measurement layer, sink installer, shadow, env-seed module, driver or B2 commit halts (INSTRUMENT: a changed instrument is a protocol deviation, not an exclusion)',
      Object.values(res).every(v => v === true), JSON.stringify(res));
  });
  await guard('O4', 'duplicates', () => {
    const dupPlan = expectHalt(() => O.planStage({ stage: 'x', block: 'heldout', configs: [ctx.diagConfigs[0], ctx.diagConfigs[0]], seeds: [S0] }), 'DUPLICATE_PLAN');
    const r1 = fresh(); linkTree(diag, r1); fs.copyFileSync(path.join(diag, a2.path), path.join(r1, 'raw', 'diagnostic', 'copy-of-A2.json'));
    const unplanned = expectHalt(() => O.classifyStage(jobs, { root: r1, ident }), 'UNPLANNED_RECORD');
    const a3 = baseJob(c0, 'A3'), r2 = fresh(), p3 = path.join(r2, a3.path); fs.mkdirSync(path.dirname(p3), { recursive: true }); fs.copyFileSync(path.join(diag, a2.path), p3); ledger(r2, 'diagnostic', [a3.runId]);
    const misplaced = expectHalt(() => O.classifyJob(a3, { root: r2, ident, attemptedIds: new Set([a3.runId]) }), 'IDENTITY');
    ok('O4', 'duplicates: a plan with a repeated (configuration, seed, arm) halts; a record in a stage directory that no planned job owns halts (UNPLANNED_RECORD); a record duplicated under another job\'s path halts (IDENTITY)',
      dupPlan === true && unplanned === true && misplaced === true, `plan ${dupPlan}; unplanned ${unplanned}; misplaced ${misplaced}`);
  });
  await guard('O5', 'missing record', async () => {
    const victim = baseJob(ctx.diagConfigs[1].configIndex, 'A4'), silent = baseJob(ctx.diagConfigs[2].configIndex, 'A6'), r = fresh(), calls = [];
    await O.executeJobs(jobs, { root: r, runner: replayRunner(diag, { fail: new Set([victim.runId]), noFile: new Set([silent.runId]), calls }), concurrency: 3 });
    const e = O.classifyStage(jobs, { root: r, ident }), st = (j) => e.find(x => x.job.runId === j.runId).status;
    const calls2 = []; await O.executeJobs(jobs, { root: r, runner: replayRunner(diag, { calls: calls2 }), concurrency: 3 });
    const pairs = O.pairStatus(e, ctx.diagConfigs.map(c => c.configIndex), [S0]), dropped = pairs.filter(p => !p.valid).map(p => p.configIndex).sort((a, b) => a - b);
    const want = [ctx.diagConfigs[1].configIndex, ctx.diagConfigs[2].configIndex].sort((a, b) => a - b);
    const lines = fs.readFileSync(path.join(r, 'raw', 'diagnostic', 'ATTEMPTS.jsonl'), 'utf8').split('\n').filter(l => l && !l.includes(victim.runId));
    fs.writeFileSync(path.join(r, 'raw', 'diagnostic', 'ATTEMPTS.jsonl'), lines.join('\n') + '\n');
    const never = expectHalt(() => O.classifyStage(jobs, { root: r, ident }), 'NOT_EXECUTED');
    ok('O5', 'missing record (D-026 §1): a base run whose process dies, and one that exits without writing, are crashes (status no-record, invalid) and drop their (configuration, seed) pairs; a second execution never re-runs them (0 runner calls); a planned run that was never attempted halts (NOT_EXECUTED), it is not a crash',
      st(victim) === 'no-record' && st(silent) === 'no-record' && JSON.stringify(dropped) === JSON.stringify(want) && calls2.length === 0 && calls.length === jobs.length && never === true,
      `statuses ${st(victim)}/${st(silent)}; dropped pairs ${JSON.stringify(dropped)}; re-execution calls ${calls2.length}; first execution calls ${calls.length}/${jobs.length}; never-attempted ${never}`);
  });
  await guard('O6', 'validity mapping', () => {
    const inv = classifyVariant(a2, (r) => { r.validity.measurementClean = false; r.validity.valid = false; return r; })();
    const v1 = fs.readFileSync(path.join(REPO, 'research', 'preregistrations', 'H1R_PREREGISTRATION_v1.0.md'), 'utf8'), sec = v1.slice(v1.indexOf('The 11 flags are:'), v1.indexOf('§12\'s row rule then applies'));
    const named = [...sec.matchAll(/`([A-Za-z]+)`/g)].map(m => m[1]), recKeys = Object.keys(raw(a2).validity).filter(k => k !== 'valid');
    ok('O6', 'validity mapping: a record with one of the 11 flags false (and valid false) classifies invalid with its flags kept; VALIDITY_FLAGS equals v1.0 §10\'s 11 names in order and the driver\'s validity keys',
      inv.status === 'invalid' && inv.valid === false && inv.flags.measurementClean === false && JSON.stringify(O.VALIDITY_FLAGS) === JSON.stringify(named) && JSON.stringify(O.VALIDITY_FLAGS) === JSON.stringify(recKeys),
      `status ${inv.status}; v1.0 names ${named.length}; driver keys ${recKeys.length}; equal ${JSON.stringify(O.VALIDITY_FLAGS) === JSON.stringify(named)}/${JSON.stringify(O.VALIDITY_FLAGS) === JSON.stringify(recKeys)}`);
  });
  await guard('O8', 'complete grid', () => {
    const e = O.classifyStage(jobs, { root: diag, ident }), empty = ctx.diagConfigs[1].configIndex;
    const forced = e.map(x => x.job.configIndex === empty && x.job.role === 'base' ? { ...x, status: 'invalid', valid: false } : x);
    const heldConfigs = ctx.diagConfigs.map(c => ({ index: c.configIndex, goal: c.goal })), tables = new Map(ctx.diagConfigs.map(c => [c.configIndex, ctx.tables[c.configIndex]]));
    const hb = O.heldoutBlock({ entries: forced, heldConfigs, seeds: [S0], tables, root: diag, diffs: new Map() });
    const input = O.studyInput({ pilot: { extensionAvailable: false, configs: [], seeds: [], cells: [] }, heldout: hb });
    const doc = O.finalRecords({ root: diag, heldEntries: forced, pairs: hb.pairs, forkAttempts: [], diffs: new Map(), tables, heldConfigs, seedsUsed: [S0] });
    const U = A.recordsUniverse(doc);
    ok('O8', 'complete grid (C-3/G1, D-026 §3): with every run of one configuration invalid, the study input still declares all configurations and all 20 registered seeds, writes a cell row for every planned run, and the records document\'s declared universe still contains the empty configuration row',
      input.heldout.configs.map(c => c.index).includes(empty) && input.heldout.seeds.length === 20 && hb.cells.length === ctx.diagConfigs.length * 7 && U.configs.includes(empty) && U.seeds.length === 1 && !doc.runs.some(r => r.configIndex === empty),
      `declared configs ${JSON.stringify(input.heldout.configs.map(c => c.index))}; seeds ${input.heldout.seeds.length}; cell rows ${hb.cells.length}; records universe ${JSON.stringify(U.configs)}×${U.seeds.length}`);
  });
  await guard('O10f', 'Stage-1 probe (no power)', () => {
    const res = {};
    for (const id of ['S03', 'S17']) { const fx = fixture(`${id}.json`), full = A.analyzeStudy(fx).stage1;
      const only = (withExt) => ({ extensionAvailable: withExt ? fx.pilot.extensionAvailable : false, configs: fx.pilot.configs.filter(c => withExt || c.block === 'stage1'), seeds: fx.pilot.seeds, cells: fx.pilot.cells.filter(r => withExt || fx.pilot.configs.find(c => c.index === r[0]).block === 'stage1') });
      const p = O.stage1Probe(only(false)); let fin = p.stage1, steps = [p.action];
      if (p.action === 'EXTENSION_REQUIRED' && fx.pilot.extensionAvailable) { fin = O.stage1Final(only(true)); steps.push(fin.F11.outcome); }
      res[id] = { steps, equal: JSON.stringify(O.stage1Summary(fin)) === JSON.stringify(O.stage1Summary(full)) }; }
    ok('O10f', 'Stage-1 probe: for S03 (VOID after the extension) and S17 (HALT, extension unavailable) the probe signals the extension and the final Stage-1 block equals the full analysis\'s exactly',
      res.S03.equal && res.S17.equal && res.S03.steps.join('>') === 'EXTENSION_REQUIRED>VOID' && res.S17.steps.join('>') === 'EXTENSION_REQUIRED', JSON.stringify(res));
  });
  await guard('O11', 'fork sample', () => {
    const fx = fixture('S01.json'), seeds = fx.heldout.seeds.slice().sort((a, b) => a - b).slice(0, ctx.s01Sstar), cfgs = fx.heldout.configs.map(c => c.index);
    const cell = new Map(fx.heldout.cells.map(r => [`${r[0]}|${r[1]}|${r[2]}`, r]));
    const validPairs = cfgs.flatMap(c => seeds.filter(s => [0, 1, 2, 3, 4, 5, 6].every(a => cell.get(`${c}|${s}|${a}`)[3] === 1)).map(s => [c, s]));
    const populations = new Map(fx.heldout.flipPopulations.map(r => [`${r[0]}|${r[1]}`, r[2].map(x => x[0])]));
    const got = O.forkSample({ validPairs: validPairs.slice().reverse(), populations });
    ok('O11', 'fork plan: the orchestrator\'s pre-registered sample (analyze.js makeRng(770004) and Fisher–Yates, valid pairs in (configuration, seed) order however supplied) equals the F-3 sample analyze.js reports for S01',
      JSON.stringify(got) === JSON.stringify(ctx.s01Sample), `${got.length} sampled decisions; equal ${JSON.stringify(got) === JSON.stringify(ctx.s01Sample)}`);
  });
  await guard('O12', 'fork differences and fork validity', () => {
    const { c, s, t } = ctx.forkCase, [fj] = O.forkJobs([[c, s, t]], jobs, 1), [fj2] = O.forkJobs([[c, s, t]], jobs, 2), b = baseJob(c, 'A1');
    const src = JSON.parse(fs.readFileSync(path.join(diag, fj.path), 'utf8')), base = raw(b);
    const sumW = (ev) => ev.reduce((a, [i, r]) => a + ((i - 5 >= t && i - 5 < t + 20) ? r : 0), 0), want = sumW(base.measurement.events) - sumW(src.measurement.events);
    const r = fresh(); const put = (j, rec) => { const p = path.join(r, j.path); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(rec)); };
    const bad = JSON.parse(JSON.stringify(src)); bad.validity.measurementClean = false; bad.validity.valid = false; bad.measurement.events.push([t + 5 + 1, 100]); bad.measurement.events.sort((x, y) => x[0] - y[0]);
    put(fj, bad); put(fj2, src); put(b, base); ledger(r, 'forks', [fj.runId, fj2.runId]); ledger(r, 'diagnostic', [b.runId]);
    const ef = O.classifyStage([fj, fj2], { root: r, ident }), eb = O.classifyJob(b, { root: r, ident, attemptedIds: new Set([b.runId]) });
    const ld = (e) => JSON.parse(fs.readFileSync(path.join(r, e.job.path), 'utf8'));
    const d1 = O.forkDifferences({ sample: [[c, s, t]], attempts: ef, baseEntryOf: () => eb, load: ld }).get(`${c}|${s}|${t}`);
    const d2 = O.forkDifferences({ sample: [[c, s, t]], attempts: [ef[0]], baseEntryOf: () => eb, load: ld }).get(`${c}|${s}|${t}`);
    ok('O12', 'fork differences (D-026 §2): an attempt with any of the 11 flags false is crashed even though its record exists and its outcome is not a crash, so the re-run\'s difference is used (= Σ r over τ ∈ [t, t+20) in the base minus the fork, recomputed from the raw events); with no valid attempt the difference is null',
      ef[0].status === 'invalid' && ef[1].status === 'valid' && d1.difference === want && d1.attempts === 2 && d2.difference === null,
      `attempt statuses ${ef.map(e => e.status).join('/')}; difference ${d1.difference} vs ${want}; no valid attempt → ${d2.difference}`);
  });
  await guard('O14', 'counts', () => {
    const e = O.classifyStage(jobs, { root: diag, ident }), m = O.manifestDocument({ stage: 'diagnostic', entries: e, ident });
    const recount = { planned: e.length, valid: e.filter(x => x.status === 'valid').length, invalid: e.filter(x => x.status === 'invalid').length, noRecord: e.filter(x => x.status === 'no-record').length };
    const fx = fixture('S04.json'), seeds = fx.heldout.seeds.slice().sort((a, b) => a - b).slice(0, ctx.s04Sstar), cfgs = fx.heldout.configs.map(c => c.index);
    const ents = fx.heldout.cells.filter(r => seeds.includes(r[1])).map(r => ({ job: { role: 'base', configIndex: r[0], agentSeed: r[1], arm: O.ARMS[r[2]] }, valid: r[3] === 1, status: r[3] === 1 ? 'valid' : 'invalid' }));
    const dropped = O.pairStatus(ents, cfgs, seeds).filter(p => !p.valid).map(p => [p.configIndex, p.seed]);
    ok('O14', 'counts: the manifest\'s planned/valid/invalid/no-record counts equal a recount of the classified runs; the dropped pairs the orchestrator derives from S04\'s cells equal analyze.js\'s Stage-2 droppedPairs',
      JSON.stringify({ planned: m.counts.planned, valid: m.counts.valid, invalid: m.counts.invalid, noRecord: m.counts.noRecord }) === JSON.stringify(recount) && JSON.stringify(dropped) === JSON.stringify(ctx.s04Dropped),
      `manifest ${JSON.stringify(recount)}; S04 dropped ${dropped.length} vs analyze.js ${ctx.s04Dropped.length}`);
  });
  await guard('O17', 'raw records unmodified', () => {
    const r = fresh(), p = path.join(r, a2.path); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(path.join(diag, a2.path), p);
    const e = O.classifyJob(a2, { root: r, ident, attemptedIds: new Set([a2.runId]) }), entry = { runId: a2.runId, path: a2.path, sha256: e.sha256 };
    const okRead = O.loadVerified(r, entry).fingerprint === raw(a2).fingerprint;
    const b = fs.readFileSync(p); b[b.length - 2] = b[b.length - 2] === 0x31 ? 0x32 : 0x31; fs.writeFileSync(p, b);
    const changed = expectHalt(() => O.loadVerified(r, entry), 'RAW_RECORD_CHANGED');
    ok('O17', 'raw-record integrity: a record is re-verified against its manifest SHA-256 on every lazy read, and a one-byte change halts (RAW_RECORD_CHANGED)', okRead && changed === true, `verified read ${okRead}; modified copy ${changed}`);
  });
  await guard('O18', 'schedule independence', async () => {
    const rA = fresh(), rB = fresh();
    await O.executeJobs(jobs.slice().reverse(), { root: rA, runner: replayRunner(diag), concurrency: 1 });
    await O.executeJobs([...jobs.filter((_, i) => i % 2), ...jobs.filter((_, i) => !(i % 2))], { root: rB, runner: replayRunner(diag), concurrency: 6 });
    const mA = JSON.stringify(O.manifestDocument({ stage: 'diagnostic', entries: O.classifyStage(jobs.slice().reverse(), { root: rA, ident }), ident }));
    const mB = JSON.stringify(O.manifestDocument({ stage: 'diagnostic', entries: O.classifyStage(jobs, { root: rB, ident }), ident }));
    ok('O18', 'schedule independence: executing the plan in reverse order one at a time, or interleaved six at a time, and classifying from differently ordered job lists gives byte-identical manifests',
      mA === mB, `manifest SHA-256 ${sha(mA).slice(0, 16)} / ${sha(mB).slice(0, 16)}`);
  });
  await guard('O24', 'determinism comparator', () => {
    const e = O.classifyStage(jobs, { root: diag, ident }), checked = O.compareDeterminism(e);
    const bad = e.map(x => x.job.role === 'determinism' && x.job.arm === 'A5' ? { ...x, fingerprint: '0000000000000000' } : x);
    const mismatch = expectHalt(() => O.compareDeterminism(bad), 'DETERMINISM');
    ok('O24', 'determinism comparator (v1.0 §13): every arm of the determinism cell (configuration index ≡ 0 mod 5, first seed) is compared with its base run and matches; one changed fingerprint halts (DETERMINISM)',
      checked.length === 7 && mismatch === true, `re-runs compared ${checked.length}; mismatch ${mismatch}`);
  });
  await guard('O25', 'pilot hard bound', async () => {
    const t = fresh(); fs.mkdirSync(path.join(t, 'experiments', 'm7'), { recursive: true });
    fs.writeFileSync(path.join(t, 'experiments', 'm7', 'env.js'), 'export const SEEN = [];\nexport function makeConfig(s, i) { SEEN.push(s); return { accepted: (s - 889990) % 4 === 3, goal: [8, 12, 16, 19][i % 4], pPhase1: [0.5], pPhase2: [0.6] }; }\n');
    fs.writeFileSync(path.join(t, 'connections.json'), JSON.stringify([{ from: 1, to: 2 }]));
    const envT = await O.treeEnvironment(t), gen = envT.generator(889999);
    const two = O.planStream({ streamStart: 889990, count: 2, generate: gen });
    const over = expectHalt(() => O.planStream({ streamStart: 889990, count: 3, generate: gen }), 'PILOT_HARD_BOUND'), maxSeen = Math.max(...envT.env.SEEN);
    ok('O25', 'pilot hard bound (v1.0 §7.1): the stream positions follow ERR-07 (index i starts after acceptedSeed(i−1)); an index not accepted at or below 889999 halts (PILOT_HARD_BOUND), and no candidate above the bound is ever evaluated',
      JSON.stringify(two.map(r => [r.configSeed, r.acceptedSeed])) === JSON.stringify([[889990, 889993], [889994, 889997]]) && over === true && maxSeen === 889999,
      `positions ${JSON.stringify(two.map(r => [r.configSeed, r.acceptedSeed]))}; third index ${over}; highest candidate evaluated ${maxSeen}`);
  });
  const after = hashTree(diag);
  ok('O17b', 'the shared diagnostic records were not modified by any fast gate', JSON.stringify(before) === JSON.stringify(after), `${Object.keys(before).length} files`);
  fs.rmSync(work, { recursive: true, force: true });
  return G;
}

// ---------------- O23: registry integrity (D-029) ----------------
// Read-only and in process. It reads the committed registry through the orchestrator's own pre-check and starts no
// process. History: until D-029, O23 asserted the pre-registration registry (no H1-R record, no stage executable;
// PASS at bf0833f). It also ran the CLI with H1R_STAGE_AUTHORISED=stage1 and relied on the registry refusing. Once
// Milestone B recorded H1-R's pilot use, that probe would have started a real Stage 1. It was unreachable only because
// O23 threw first, on a duplicate in-memory record (FAIL at 6fc5a9e). The CLI's authorisation and registry refusals
// are gated in sandboxes by verify_cli.mjs (C4, C5); verify_o23.mjs proves that this check cannot start a process.
export async function o23RegistryIntegrity(O, typed) {
  const P = O.PROTOCOL, prod = await O.productionRegistry();
  const pilot = { lo: P.pilot.streamStart, hi: P.pilot.hardBound }, held = { lo: P.confirmatory.streamStart, hi: null };
  const pre = (stage, seeds, configBlock, registry) => O.registryPrecheck({ stage, seeds, configBlock, registry });
  const s1 = pre('stage1', P.pilot.seeds, pilot, prod), ext = pre('extension', P.pilot.seeds, pilot, prod), s2 = pre('stage2', P.confirmatory.seeds, held, prod);
  const old = pre('stage1', [20260819000, 20260819001, 20260819002, 20260819003], pilot, prod);
  const h1r = typed.TRAJECTORY_RECORDS.filter(r => r.study === P.study);
  const recordsOk = JSON.stringify(h1r.map(r => r.value)) === JSON.stringify(P.pilot.seeds) && h1r.every(r => r.namespace === 'trajectory' && r.status === 'pilot' && r.executed === false);
  // the pre-check depends on both registry actions: without H1-R's records, or without its block, Stage 1 is not executable
  const regOf = (records, blockOk) => { const mem = typed.createTrajectoryRegistry({ records, heldOut: [], authorizations: [] });
    return { trajectoryDecision: (v, use) => mem.checkUse(typed.trajectorySeed(v), use).decision, configBlockRecorded: () => blockOk }; };
  const yes = pre('stage1', P.pilot.seeds, pilot, regOf([...typed.TRAJECTORY_RECORDS], true));
  const noBlock = pre('stage1', P.pilot.seeds, pilot, regOf([...typed.TRAJECTORY_RECORDS], false));
  const noRecords = pre('stage1', P.pilot.seeds, pilot, regOf(typed.TRAJECTORY_RECORDS.filter(r => r.study !== P.study), true));
  const pass = s1.executable && s1.items.length === 5 && s1.items.every(i => i.decision === 'REPRODUCTION') && s1.configBlock.recordedForH1R === true && ext.executable
    && !s2.executable && s2.items.length === 20 && s2.items.every(i => i.decision === 'AVAILABLE') && s2.configBlock.recordedForH1R === false
    && old.items.length === 4 && old.items.every(i => i.refusal === 'CONSUMED_BY_OTHER_STUDY') && recordsOk
    && yes.executable && !noBlock.executable && !noRecords.executable && noRecords.items.every(i => i.decision === 'AVAILABLE');
  const dec = (x) => [...new Set(x.items.map(i => i.decision || i.refusal))].join('/');
  return { pass, evidence: `stage1 executable ${s1.executable} (${dec(s1)}; block recorded ${s1.configBlock.recordedForH1R}); extension ${ext.executable}; stage2 ${s2.executable} (${dec(s2)}; block 900500 recorded ${s2.configBlock.recordedForH1R}); ` +
    `seeds 000–003 ${dec(old)}; H1-R records ${h1r.map(r => r.value).join(',')}, pilot and unexecuted ${recordsOk}; committed records ${yes.executable}, without the block ${noBlock.executable}, without H1-R's records ${noRecords.executable}` };
}

// ---------------- full battery ----------------
async function main() {
  const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_orchestrator');
  fs.mkdirSync(EVID, { recursive: true });
  const t0 = Date.now();   // battery timing only (the orchestrator reads no clock)
  const ORCH = path.join(HERE, 'orchestrate.mjs'), AN_PATH = path.join(HERE, 'analyze.js');
  const O = await import(pathToFileURL(ORCH).href), A = await import(pathToFileURL(AN_PATH).href), { buildTree } = await import(pathToFileURL(path.join(HERE, 'build_tree.mjs')).href);
  const G = []; const ok = (id, name, cond, ev) => G.push({ id, name, status: cond ? 'PASS' : 'FAIL', evidence: ev });
  const guard = async (id, name, fn) => { try { await fn(); } catch (e) { G.push({ id, name, status: 'FAIL', evidence: `threw: ${String(e && e.message).slice(0, 300)}` }); } };
  const BASE = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r', 'orchestrator-gates'); fs.rmSync(BASE, { recursive: true, force: true }); fs.mkdirSync(BASE, { recursive: true });
  // O20's CLI run starts now in its own process
  const cliOut = path.join(BASE, 'cli_output.json');
  const cli = new Promise((resolve, reject) => { const ch = spawn(process.execPath, [AN_PATH, FXDIR, cliOut], { stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; ch.stderr.on('data', d => { err += d; }); ch.on('close', c => c === 0 ? resolve(fs.readFileSync(cliOut, 'utf8')) : reject(new Error(err.slice(0, 400)))); });
  cli.catch(() => {});
  // ---- the diagnostic end-to-end flow on existing verification material ----
  const SUB = JSON.parse(fs.readFileSync(path.join(HERE, 'evidence_ms1', 'g15_samples.json'), 'utf8')).slice(0, 3);
  const DIAG = SUB.map(s => ({ configIndex: s.configIndex, configSeed: s.configSeed, acceptedSeed: s.configSeed, goal: O.GOALS[s.configIndex % 4] }));
  const tree = buildTree(), envT = await O.treeEnvironment(tree.dir), runner = O.driverRunner({ treeDir: tree.dir }), diagRoot = path.join(BASE, 'diag');
  const tablesObj = Object.fromEntries(DIAG.map(c => [c.configIndex, envT.configTable(c.acceptedSeed, c.configIndex)]));
  const tables = new Map(DIAG.map(c => [c.configIndex, tablesObj[c.configIndex]]));
  const heldConfigs = DIAG.map(c => ({ index: c.configIndex, goal: c.goal }));
  let flow, fk, hb, recDoc, recOut;
  await guard('OE', 'end-to-end diagnostic flow', async () => {
    const pre = await O.registryPrecheck({ stage: 'stage1', seeds: [S0], configBlock: { lo: 900030, hi: 900499 }, registry: STUB_REGISTRY });
    flow = await O.stageFlow({ stage: 'diagnostic', block: 'heldout', configs: DIAG, seeds: [S0], root: diagRoot, runner, registry: STUB_REGISTRY, precheckBlock: { stage: 'stage1', lo: 900030, hi: 900499 }, concurrency: 4 });
    fk = await O.forkFlow({ heldEntries: flow.entries, heldConfigs, seeds: [S0], tables, root: diagRoot, runner, concurrency: 4 });
    hb = O.heldoutBlock({ entries: flow.entries, heldConfigs, seeds: [S0], tables, root: diagRoot, diffs: fk.diffs });
    recDoc = O.finalRecords({ root: diagRoot, heldEntries: flow.entries, pairs: hb.pairs, forkAttempts: fk.attempts, diffs: fk.diffs, tables, heldConfigs, seedsUsed: [S0] });
    recOut = A.analyzeRecords(recDoc);
    const st = flow.manifest.counts;
    ok('OE', 'end-to-end on the diagnostic material (3 G15 configurations × seed 20260819000 × 7 arms, plus the 7 determinism re-runs and the pre-registered forks): plan → execute (one OS process per run) → validate → classify → determinism comparison → fork sample → forks with the one retry → study block → lazy records document → analyze.js, with no halt',
      pre.executable && st.planned === 28 && flow.determinismChecked.length === 7 && fk.sample.length > 0 && Object.keys(recOut.runs).length > 0,
      `planned ${st.planned}, valid ${st.valid}, invalid ${st.invalid}, no-record ${st.noRecord}; determinism re-runs ${flow.determinismChecked.length}; fork sample ${fk.sample.length}, fork attempts ${fk.attempts.length} (valid ${fk.attempts.filter(e => e.status === 'valid').length}); records analysed ${Object.keys(recOut.runs).length} runs, ${Object.keys(recOut.forks).length} forks`);
  });
  if (!flow) { finish(); return; }
  fs.writeFileSync(path.join(EVID, 'diagnostic_manifest.json'), JSON.stringify(flow.manifest));
  fs.writeFileSync(path.join(EVID, 'diagnostic_fork_manifest.json'), JSON.stringify(fk.manifest));
  // ---- context for the fast gates (and for every mutant) ----
  const s01 = A.analyzeStudy(fixture('S01.json')), s04 = A.analyzeStudy(fixture('S04.json'));
  const fc = fk.sample.find(([c, s, t]) => fk.attempts.some(e => e.job.configIndex === c && e.job.fork.call === t + 5 && e.job.attempt === 1 && e.status === 'valid'));
  const ctx = { diagRoot, scratchBase: fs.mkdtempSync(path.join(BASE, 'fast-')), diagConfigs: DIAG, tables: tablesObj, s01Sample: s01.stage2.F.F3.sample, s01Sstar: s01.stage2.seedsUsed,
    s04Dropped: s04.stage2.droppedPairs, s04Sstar: s04.stage2.seedsUsed, forkCase: { c: fc[0], s: fc[1], t: fc[2] } };
  const ctxFile = path.join(BASE, 'ctx.json'); fs.writeFileSync(ctxFile, JSON.stringify(ctx));
  for (const g of await fastChecks(ORCH, ctx)) G.push(g);
  const ident = O.instrumentIdentity();
  // ---- main-only gates ----
  await guard('O7', 'cell construction', () => {
    const rec = (j) => JSON.parse(fs.readFileSync(path.join(diagRoot, j.path), 'utf8')), byKey = new Map(flow.entries.map(e => [e.job.runId, e]));
    const want = [], wantLinks = [], wantMono = [];
    for (const c of DIAG.map(x => x.configIndex).sort((a, b) => a - b)) for (const [ai, arm] of O.ARMS.entries()) {
      const j = flow.jobs.find(x => x.role === 'base' && x.configIndex === c && x.arm === arm), e = byKey.get(j.runId), r = rec(j);
      if (!e.valid) { want.push([c, S0, ai, 0, null, null, null, null, null, null, null, r.fingerprint, null]); continue; }
      const m = A.runMetrics({ runId: j.runId, arm, configIndex: c, seed: S0, measurement: r.measurement }, tablesObj[c]);
      want.push([c, S0, ai, 1, m.R.W1, m.R.W2, m.R.W3, m.R.W4, m.R_all, m.halfLife.value, m.halfLife.censored ? 1 : 0, r.fingerprint, r.measurement.floorCalls.length]);
      if (arm === 'A1' && hb.pairs.find(p => p.configIndex === c).valid) { const l = m.link3;
        wantLinks.push([c, S0, m.calibration.tau1499.rho, m.calibration.tau2999.rho, l.decisionTicks, l.replayTicks, l.flips, ['W1', 'W2', 'W3', 'W4'].map(W => l.byWindow[W].flips), ['W1', 'W2', 'W3', 'W4'].map(W => l.byWindow[W].decisionTicks), ['W1', 'W2', 'W3', 'W4'].map(W => l.byWindow[W].replayTicks)]);
        wantMono.push([c, S0, l.monotonicity.decisions, l.monotonicity.flips]); } }
    ok('O7', 'cell construction: every study-input cell row (configuration, seed, arm, valid, R_W1–W4, R_all, half-life, censored, fingerprint, floor raises), A1 link row and monotonicity row equals a separate mapping of analyze.js runMetrics over the same raw records (the orchestrator computes no metric)',
      JSON.stringify(hb.cells) === JSON.stringify(want) && JSON.stringify(hb.a1Links) === JSON.stringify(wantLinks) && JSON.stringify(hb.monotonicity) === JSON.stringify(wantMono),
      `cells ${hb.cells.length} (${JSON.stringify(hb.cells) === JSON.stringify(want)}); link rows ${hb.a1Links.length} (${JSON.stringify(hb.a1Links) === JSON.stringify(wantLinks)}); monotonicity rows ${hb.monotonicity.length}`);
  });
  await guard('O9', 'dropped-pair isolation', () => {
    const res = {};
    for (const id of ['S04', 'S05']) { const fx = fixture(`${id}.json`), base = A.analyzeStudy(fx), drops = new Set([...base.stage1.droppedPairs, ...base.stage2.droppedPairs].map(([c, s]) => `${c}|${s}`));
      const nul = (cells) => cells.map(r => drops.has(`${r[0]}|${r[1]}`) ? [r[0], r[1], r[2], r[3], null, null, null, null, null, null, null, r[11], null] : r);
      const keep = (rows) => rows.filter(r => !drops.has(`${r[0]}|${r[1]}`));
      const mod = { ...fx, pilot: { ...fx.pilot, cells: nul(fx.pilot.cells) }, heldout: { ...fx.heldout, cells: nul(fx.heldout.cells), a1Links: keep(fx.heldout.a1Links), flipPopulations: keep(fx.heldout.flipPopulations), monotonicity: keep(fx.heldout.monotonicity) } };
      res[id] = { drops: drops.size, equal: JSON.stringify(A.analyzeStudy(mod)) === JSON.stringify(base) }; }
    ok('O9', 'dropped-pair isolation: nulling every metric of every dropped pair and removing their A1 link, population and monotonicity rows leaves analyze.js\'s whole study output byte-identical (S04, S05)', Object.values(res).every(r => r.equal && r.drops > 0), JSON.stringify(res));
  });
  await guard('O10', 'Stage-1 probe (power)', () => {
    const res = {};
    for (const id of ['S01', 'S13']) { const fx = fixture(`${id}.json`), full = A.analyzeStudy(fx).stage1;
      const p = O.stage1Probe({ extensionAvailable: false, configs: fx.pilot.configs.filter(c => c.block === 'stage1'), seeds: fx.pilot.seeds, cells: fx.pilot.cells.filter(r => fx.pilot.configs.find(c => c.index === r[0]).block === 'stage1') });
      res[id] = { action: p.action, Sstar: p.stage1.power && p.stage1.power.Sstar, equal: JSON.stringify(O.stage1Summary(p.stage1)) === JSON.stringify(O.stage1Summary(full)) }; }
    ok('O10', 'Stage-1 probe (v1.0 §13; C-1): on S01 and S13 (PROCEED) the probe on Stage-1 data alone reproduces analyze.js\'s full Stage-1 block (F-11, power, S*, dropped pairs) exactly; together with O10f this covers PROCEED, VOID after the extension and HALT',
      Object.values(res).every(r => r.equal && r.action === 'PROCEED'), JSON.stringify(res));
  });
  await guard('O13', 'per-window A5 ≡ A2', () => {
    const rec = (j) => JSON.parse(fs.readFileSync(path.join(diagRoot, j.path), 'utf8')), out = recOut.descriptive.a5EqualsA2PerWindow; let bad = 0, fpEqual = 0;
    for (const c of DIAG.map(x => x.configIndex)) { const j2 = flow.jobs.find(j => j.role === 'base' && j.configIndex === c && j.arm === 'A2'), j5 = flow.jobs.find(j => j.role === 'base' && j.configIndex === c && j.arm === 'A5');
      if (!hb.pairs.find(p => p.configIndex === c).valid) continue;
      const r2 = rec(j2), r5 = rec(j5), win = (r, W) => JSON.stringify(r.measurement.events.filter(([i]) => winOf(i - 5) === W));
      const indep = Object.fromEntries(['W1', 'W2', 'W3', 'W4'].map(W => [W, win(r5, W) === win(r2, W)])), got = out.pairs.find(p => p.configIndex === c);
      if (!got || ['W1', 'W2', 'W3', 'W4'].some(W => got[W] !== indep[W])) bad++;
      if (r2.fingerprint === r5.fingerprint) { fpEqual++; if (!['W1', 'W2', 'W3', 'W4'].every(W => indep[W])) bad++; } }
    const d2 = flow.jobs.find(j => j.role === 'determinism' && j.arm === 'A2'), b2 = flow.jobs.find(j => j.role === 'base' && j.configIndex === d2.configIndex && j.arm === 'A2');
    const control = A.a5a2WindowIdentity(rec(d2).measurement.events, rec(b2).measurement.events);
    ok('O13', 'per-window A5 ≡ A2 (PR-11): analyze.js\'s per-window identity of the A5 and A2 reward-event streams equals an independent window-by-window comparison of the raw events for every valid diagnostic pair; identical fingerprints imply identity in all 4 windows; positive control: an A2 run and its determinism re-run are identical in all 4 windows',
      bad === 0 && out.nPairs > 0 && Object.values(control).every(Boolean), `pairs ${out.nPairs}; mismatches ${bad}; fingerprint-identical pairs ${fpEqual}; control ${JSON.stringify(control)}`);
  });
  await guard('O15', 'provenance', () => {
    const m = flow.manifest, files = m.runs.filter(r => r.status !== 'no-record');
    const relOk = m.runs.every(r => /^experiments\/h1r\/data\/raw\/[a-z0-9]+\/[^\\:]+\.json$/.test(r.path) && !path.isAbsolute(r.path));
    const shaOk = files.every(r => sha(fs.readFileSync(path.join(diagRoot, r.path.slice(O.DATA_ROOT_REL.length + 1)))) === r.sha256 && fs.statSync(path.join(diagRoot, r.path.slice(O.DATA_ROOT_REL.length + 1))).size === r.bytes);
    const input = O.studyInput({ pilot: { extensionAvailable: false, configs: [], seeds: [], cells: [] }, heldout: hb });
    const dec = O.stage1DecisionRecord({ input, stage1: s01.stage1, ident });
    const keys = ['b2Commit', 'trustMode', 'transformSha256', 'runtimeSha256', 'measureSha256', 'measureInstallSha256', 'shadowSha256', 'envSeedSha256', 'driverSha256', 'analyzeSha256', 'orchestratorSha256'];
    ok('O15', 'provenance: every manifest entry carries identity, role, stage, a repository-relative path (no drive, no backslash, no absolute path), the SHA-256 and size of the raw bytes, status and validity; the manifest carries every instrument hash, analyze.js\'s and the orchestrator\'s SHA-256; a decision record carries its study input\'s SHA-256',
      relOk && shaOk && keys.every(k => typeof m.instrument[k] === 'string') && m.instrument.analyzeSha256 === sha(fs.readFileSync(AN_PATH)) && m.instrument.orchestratorSha256 === sha(fs.readFileSync(ORCH)) && dec.stage1InputSha256 === sha(JSON.stringify(input)) && !JSON.stringify(m).includes(os.tmpdir()) && !/[A-Za-z]:[\\/]/.test(JSON.stringify(m)),
      `entries ${m.runs.length}; relative ${relOk}; hashes and sizes ${shaOk}; instrument keys ${keys.filter(k => typeof m.instrument[k] === 'string').length}/${keys.length}`);
  });
  await guard('O16', 'determinism of derived artifacts', () => {
    const build = (entries) => { const h = O.heldoutBlock({ entries, heldConfigs, seeds: [S0], tables, root: diagRoot, diffs: fk.diffs });
      const doc = O.finalRecords({ root: diagRoot, heldEntries: entries, pairs: h.pairs, forkAttempts: fk.attempts, diffs: fk.diffs, tables, heldConfigs, seedsUsed: [S0] });
      return [JSON.stringify(O.manifestDocument({ stage: 'diagnostic', entries, ident })), JSON.stringify(O.studyInput({ pilot: { extensionAvailable: false, configs: [], seeds: [], cells: [] }, heldout: h })), A.serializeOutput(A.outputDocument({}, { D: A.analyzeRecords(doc) }))]; };
    const a = build(O.classifyStage(flow.jobs, { root: diagRoot, ident })), b = build(O.classifyStage(flow.jobs.slice().reverse(), { root: diagRoot, ident }).reverse());
    ok('O16', 'determinism: re-deriving the manifest, the study input and the records analysis from the same raw records twice, with the job and entry lists in opposite orders, gives byte-identical artifacts',
      a.every((x, i) => x === b[i]), a.map((x, i) => `${sha(x).slice(0, 12)}/${sha(b[i]).slice(0, 12)}`).join(' '));
  });
  await guard('O19', 'purity', () => {
    const src = fs.readFileSync(ORCH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), code = src.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''");
    const banned = ['Math.random', 'Date.now', 'new Date', 'performance.now', 'process.hrtime', 'randomBytes', 'randomUUID', 'getRandomValues', 'randomInt', 'setTimeout', 'setInterval', "from 'node:http'", "from 'node:https'", "from 'node:net'", 'fetch('].filter(b => src.includes(b));
    const rng = (code.match(/makeRng\(/g) || []).length, rngOk = src.includes('AN.makeRng(770004)');
    const abs = /[A-Za-z]:\\\\|\/Users\/|\/home\//.test(fs.readFileSync(ORCH, 'utf8'));
    ok('O19', 'RNG and purity: no clock, Math.random, crypto randomness, timers or network in the orchestrator; its only random numbers are analyze.js\'s makeRng(770004) at one site (the pre-registered fork sample); no host-specific path in its source',
      banned.length === 0 && rng === 1 && rngOk && !abs, `banned ${banned.join(',') || 'none'}; makeRng sites ${rng} (770004 ${rngOk}); host paths ${abs}`);
  });
  await guard('O21', 'lazy/eager', () => {
    const fx = fixture('M01.json'), r = fs.mkdtempSync(path.join(BASE, 'lazy-')), entries = [];
    for (const run of fx.runs) { const p = `raw/m01/${run.runId}.json`, f = path.join(r, p); fs.mkdirSync(path.dirname(f), { recursive: true }); const t = JSON.stringify({ measurement: run.measurement }); fs.writeFileSync(f, t); entries.push({ runId: run.runId, path: p, sha256: sha(t), arm: run.arm, configIndex: run.configIndex, seed: run.seed }); }
    const forks = fx.forkRuns.map(f => { const p = `raw/m01/${f.forkId.replace('@', '_at_')}.json`, fl = path.join(r, p), t = JSON.stringify({ measurement: f.measurement }); fs.writeFileSync(fl, t); return { runId: f.forkId, path: p, sha256: sha(t), forkId: f.forkId, baseRunId: f.baseRunId, call: f.fork.call }; });
    const lazy = O.recordsDocument({ root: r, runs: entries, forkRuns: forks, configurations: fx.configurations, seeds: [...new Set(fx.runs.map(x => x.seed))] });
    const eager = { ...fx, seeds: [...new Set(fx.runs.map(x => x.seed))] };
    const a = JSON.stringify(A.analyzeRecords(lazy)), b = JSON.stringify(A.analyzeRecords(eager));
    ok('O21', 'lazy/eager: analyze.js\'s records analysis of M01 with every measurement loaded lazily from its own raw file (verified against its SHA-256 on each read) equals the analysis of the in-memory document', a === b, `${sha(a).slice(0, 16)} / ${sha(b).slice(0, 16)}`);
  });
  await guard('O22', 'real-record compatibility', () => {
    let refusals = 0, capAfterFirst = 0, cap150 = 0, goalToCapRaw151 = 0, trustBad = 0, binsBad = 0, n = 0;
    const all = [...flow.entries, ...fk.attempts].filter(e => e.status !== 'no-record');
    for (const e of all) { const rec = JSON.parse(fs.readFileSync(path.join(diagRoot, e.job.path), 'utf8')); n++;
      try { const m = A.runMetrics({ runId: e.job.runId, arm: e.job.arm, configIndex: e.job.configIndex, seed: e.job.agentSeed, measurement: rec.measurement }, tablesObj[e.job.configIndex]);
        if (m.link3 && m.link3.monotonicity.decisions.reduce((a, b) => a + b, 0) !== m.link3.decisionTicks) binsBad++; } catch { refusals++; }
      const eps = A.episodes(rec.measurement.resets); eps.forEach((ep, i) => { if (i > 0 && ep.end === 'cap') { capAfterFirst++; if (ep.length === 150) cap150++; } });
      const rs = rec.measurement.resets; for (let i = 1; i < rs.length; i++) if (rs[i][1] === 'cap' && rs[i - 1][1] === 'goal' && rs[i][0] - rs[i - 1][0] === 151) goalToCapRaw151++;
      for (const s of rec.measurement.snapshots) for (const [, a, sc] of s[2]) { const x = (sc + 1) / (a + 2); if (!(x >= 0 && x <= 1)) trustBad++; } }
    ok('O22', 'real-record compatibility: analyze.js processes every real diagnostic record (base, determinism and fork runs) without refusal; every cap episode after the first is exactly 150 ticks after the I-21 lag correction (the raw goal→cap gap is 151 calls), confirming I-21 on the real runtime; every snapshot trust is in [0, 1]; PR-4 bins sum to the decision ticks',
      refusals === 0 && capAfterFirst > 0 && cap150 === capAfterFirst && trustBad === 0 && binsBad === 0,
      `records ${n}; refusals ${refusals}; cap episodes after the first ${capAfterFirst}, of 150 ticks ${cap150}; raw goal→cap gaps of 151 calls ${goalToCapRaw151}; trust outside [0,1] ${trustBad}; bin-sum mismatches ${binsBad}`);
  });
  await guard('O23', 'registry integrity', async () => {
    const r = await o23RegistryIntegrity(O, await import(pathToFileURL(path.join(REPO, 'experiments', 'registry', 'typed.js')).href));
    ok('O23', 'registry integrity after the H1-R registry actions (D-029; read-only, in process, starts no process): Stage 1 and the extension are executable as far as the registry is concerned; Stage 2 is not (confirmatory seeds and block 900500 unrecorded); seeds 000–003 are refused; H1-R records exactly the pilot seeds 004–008, unexecuted; without those records, or without the pilot block, Stage 1 is not executable',
      r.pass, r.evidence);
  });
  await guard('O20', 'CLI/programmatic equivalence', async () => {
    const study = {}; for (const f of fs.readdirSync(FXDIR).filter(f => /^S\d+\.json$/.test(f)).sort()) { const fx = fixture(f); study[fx.id] = A.analyzeStudy(fx); }
    const m01 = fixture('M01.json'), prog = A.serializeOutput(A.outputDocument(study, { [m01.id]: A.analyzeRecords(m01) })), cliText = await cli;
    ok('O20', 'CLI/programmatic equivalence: the output document assembled in-process from analyzeStudy/analyzeRecords on all 18 fixtures is byte-identical to `node analyze.js <fixtures> <out>`', prog === cliText, `${sha(prog).slice(0, 16)} / ${sha(cliText).slice(0, 16)}`);
  });
  // ---- O26: mutation anti-vacuity on the fast gates (child processes, parallel) ----
  const MUT = path.join(BASE, 'mutants'); fs.mkdirSync(MUT, { recursive: true });
  const srcO = fs.readFileSync(ORCH, 'utf8'), REPO_LINE = "export const REPO = path.resolve(HERE, '..', '..');";
  if (srcO.split(REPO_LINE).length !== 2) throw new Error('REPO anchor missing');
  const place = (s) => s.replace(REPO_LINE, `export const REPO = ${JSON.stringify(REPO)};`).replace("from './analyze.js'", `from ${JSON.stringify(pathToFileURL(AN_PATH).href)}`)
    .replace("from './env_seed.mjs'", `from ${JSON.stringify(pathToFileURL(path.join(HERE, 'env_seed.mjs')).href)}`).replace("from './conformance_transform.mjs'", `from ${JSON.stringify(pathToFileURL(path.join(HERE, 'conformance_transform.mjs')).href)}`)
    .replace("path.join(HERE, f)", `path.join(${JSON.stringify(HERE)}, f)`).replace("path.join(HERE, 'analyze.js')", `path.join(${JSON.stringify(HERE)}, 'analyze.js')`);
  const jobs = [['control (unmutated copy)', null, null], ...MUTANTS];
  const runChild = (file) => new Promise((resolve) => { const ch = spawn(process.execPath, [fileURLToPath(import.meta.url), '--fast', file, ctxFile], { stdio: ['ignore', 'pipe', 'pipe'] }); let out = '';
    ch.stdout.on('data', d => { out += d; }); ch.on('close', () => { const line = out.split('\n').find(l => l.startsWith('@@FAST@@')); resolve(line ? JSON.parse(line.slice(8)) : null); }); });
  const results = new Array(jobs.length); let next = 0;
  const worker = async () => { while (next < jobs.length) { const k = next++, [id, from, to] = jobs[k];
    if (from !== null && srcO.split(from).length !== 2) { results[k] = [id, 'ANCHOR MISSING']; continue; }
    const f = path.join(MUT, `orchestrate_${k}.mjs`); fs.writeFileSync(f, place(from === null ? srcO : srcO.replace(from, to)));
    const r = await runChild(f); results[k] = [id, r === null ? 'THREW' : (r.filter(x => x.status === 'FAIL').map(x => x.id).join('+') || (from === null ? 'ALL PASS' : 'NOT CAUGHT'))]; } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(6, os.cpus().length - 2)) }, worker));
  ok('O26a', 'mutation harness control: an unmutated copy of the orchestrator in the mutant directory passes every fast gate', results[0][1] === 'ALL PASS', `${results[0][0]}: ${results[0][1]}`);
  ok('O26', `anti-vacuity: each of ${MUTANTS.length} deliberate orchestrator defects is caught by the fast gates`, results.slice(1).every(([, c]) => !['NOT CAUGHT', 'ANCHOR MISSING', 'THREW'].includes(c)), results.slice(1).map(([i, c]) => `${i}:${c}`).join(' '));
  finish();
  function finish() {
    const summary = { generatedBy: 'experiments/h1r/verify_orchestrator.mjs', orchestratorSha256: sha(fs.readFileSync(ORCH)), analyzeSha256: sha(fs.readFileSync(AN_PATH)), seconds: Math.round((Date.now() - t0) / 1000), gates: G };
    fs.writeFileSync(path.join(EVID, 'orchestrator_gates.json'), JSON.stringify(summary, null, 1));
    for (const g of G) console.log(`${g.status.padEnd(5)} ${g.id.padEnd(5)} ${g.name}\n      ${g.evidence}`);
    const fails = G.filter(g => g.status === 'FAIL').length;
    console.log(`\n${G.filter(g => g.status === 'PASS').length} PASS, ${fails} FAIL — ${summary.seconds} s`);
    process.exitCode = fails ? 1 : 0;
  }
}

const MUTANTS = [
  ['rerunCrashed', 'const todo = jobs.filter(j => !byStage.get(j.stage).has(j.runId) && !fs.existsSync(path.join(root, j.path)));', 'const todo = jobs.filter(j => !fs.existsSync(path.join(root, j.path)));'],
  ['noRecordValid', "return { job, status: 'no-record', sha256: null, bytes: null, valid: false, flags: null, fingerprint: null };", "return { job, status: 'valid', sha256: null, bytes: null, valid: true, flags: null, fingerprint: null };"],
  ['identityArm', 'const want = { configSeed: job.configSeed, configIndex: job.configIndex, acceptedSeed: job.acceptedSeed, goal: job.goal, agentSeed: job.agentSeed, arm: job.arm };', 'const want = { configSeed: job.configSeed, configIndex: job.configIndex, acceptedSeed: job.acceptedSeed, goal: job.goal, agentSeed: job.agentSeed };'],
  ['envSeedSkip', 'if (es.envSeed !== envSeed) p.push(', 'if (false) p.push('],
  ['instrumentSkip', "for (const k of ['b2Commit', 'trustMode', ...Object.keys(INSTRUMENT_FILES)]) if (h[k] !== ident[k])", "for (const k of ['b2Commit', 'trustMode']) if (h[k] !== ident[k])"],
  ['unplannedSkip', "return fs.readdirSync(dir).filter(f => f !== 'ATTEMPTS.jsonl' && !f.endsWith('.partial') && !want.has(f)).sort();", 'return [];'],
  ['validConjunction', "else if (v.valid !== VALIDITY_FLAGS.every(k => v[k] === true)) p.push('validity.valid differs from the conjunction of the 11 flags');", ''],
  ['pairAnyArm', 'valid: arms.every(x => x.valid)', 'valid: arms.some(x => x.valid)'],
  ['dropEmptyConfig', 'return { configs: heldConfigs.map(c => ({ index: c.index, goal: c.goal })), seeds: PROTOCOL.confirmatory.seeds.slice()', 'return { configs: heldConfigs.filter(c => b.pairs.some(p => p.configIndex === c.index && p.valid)).map(c => ({ index: c.index, goal: c.goal })), seeds: PROTOCOL.confirmatory.seeds.slice()'],
  ['recordsUniverseObserved', 'configurations: heldConfigs.map(c => tables.get(c.index)), seeds: seedsUsed.slice() });', 'configurations: heldConfigs.filter(c => runs.some(r => r.configIndex === c.index)).map(c => tables.get(c.index)), seeds: seedsUsed.slice() });'],
  ['forkSeed', 'const rng = AN.makeRng(770004), out = [];', 'const rng = AN.makeRng(770002), out = [];'],
  ['forkPairOrder', 'for (const [c, s] of validPairs.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1])) {', 'for (const [c, s] of validPairs.slice()) {'],
  ['forkCrashOutcomeOnly', "export const forkValid = (entry) => entry.status === 'valid';", "export const forkValid = (entry) => entry.status !== 'no-record';"],
  ['shaUnverified', "if (sha256(b) !== entry.sha256) halt('RAW_RECORD_CHANGED'", "if (false) halt('RAW_RECORD_CHANGED'"],
  ['probeExtensionFlag', 'const s1 = AN.analyzeStudy(studyInput({ pilot: { ...pilot, extensionAvailable: false } })).stage1;', 'const s1 = AN.analyzeStudy(studyInput({ pilot: { ...pilot, extensionAvailable: true } })).stage1;'],
  ['hardBoundIgnored', 'for (let s = start; hardBound === null || s <= hardBound; s++) {', 'for (let s = start; ; s++) {'],
  ['streamRestart', 'seed = r.acceptedSeed + 1;', 'seed = streamStart;'],
  ['determinismSkip', "if (b.fingerprint === null || d.fingerprint === null || b.fingerprint !== d.fingerprint) halt('DETERMINISM'", "if (false) halt('DETERMINISM'"],
  ['noLedger', "fs.appendFileSync(ledgerPath(root, j.stage), JSON.stringify({ runId: j.runId }) + '\\n');", ''],
];

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked && process.argv[2] === '--fast') { const r = await fastChecks(path.resolve(process.argv[3]), JSON.parse(fs.readFileSync(process.argv[4], 'utf8'))); for (const x of r) console.log(`${x.status} ${x.id} ${x.evidence}`); console.log('@@FAST@@' + JSON.stringify(r.map(x => ({ id: x.id, status: x.status })))); process.exitCode = r.some(x => x.status === 'FAIL') ? 1 : 0; }
else if (invoked) await main();

// ==========================================================
// M40-P1 STAGE-1 DRIVER — outcome-blind calibration, exactly as frozen
// ==========================================================
// research/preregistrations/M40_FUTURESCORE_TEMPORAL_FORMULATION.md §12, §12a, §12b, §13, §14 (M40-R2)
// research/preregistrations/m40_spec.js (the gate predicates, imported unchanged)
//
// Runs: 4 fixtures × (12 grid ticks + 1 B run) × 2 independent replicates = 104 processes.
// Gates, in order: seeds · blindness · PE (XC5) · DP (XC6) · lineage at T=3000 (XC2) · reproducibility.
// GO/NO-GO is determined only if every validity gate passes. Stage 2 is never executed here.
// Writes raw evidence to experiments/m40/evidence/.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EV = path.join(ROOT, 'experiments/m40/evidence');
const S = await import(pathToFileURL(path.join(ROOT, 'research/preregistrations/m40_spec.js')).href);
const FIXTURES = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
const REPLICATES = ['a', 'b'];
const CONCURRENCY = 4;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const log = (...a) => console.log(...a);

fs.mkdirSync(EV, { recursive: true });
const jobs = [];
for (const [s, i] of FIXTURES) for (const r of REPLICATES) {
  for (const T of S.GRID) jobs.push({ s, i, r, mode: 'grid', T, file: `${s}_${i}_T${T}_${r}.json` });
  jobs.push({ s, i, r, mode: 'B', T: 3000, file: `${s}_${i}_B_${r}.json` });
}
const runJob = (j) => new Promise((res) => {
  const t0 = Date.now();
  const p = spawn(process.execPath, [path.join(ROOT, 'experiments/m40/child.mjs')], { cwd: ROOT,
    env: { ...process.env, M40_ROOT: ROOT, M40_SEED: String(j.s), M40_INDEX: String(j.i), M40_MODE: j.mode, M40_T: String(j.T) } });
  let out = '', err = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.on('close', (code) => {
    const at = out.indexOf('@@M40@@');
    if (code !== 0 || at < 0) { res({ ...j, ok: false, code, err: err.slice(-2000) }); return; }
    const json = out.slice(at + 7);
    fs.writeFileSync(path.join(EV, j.file), json + '\n');
    res({ ...j, ok: true, ms: Date.now() - t0 });
  });
});
log(`M40-P1 Stage 1: ${jobs.length} processes, concurrency ${CONCURRENCY}`);
const results = [];
{
  let next = 0;
  const worker = async () => { while (next < jobs.length) { const j = jobs[next++]; const r = await runJob(j); results.push(r); if (!r.ok) log('  PROCESS FAILED', j.file, r.code, r.err); } };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}
const failed = results.filter(r => !r.ok);
const summary = { stage: 'M40-P1 stage 1', spec: 'm40_spec.js @ ' + execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  processes: jobs.length, processFailures: failed.map(f => f.file), gates: {}, stop: null };
if (failed.length) {
  summary.stop = 'PROCESS FAILURE — no gate evaluated';
  fs.writeFileSync(path.join(EV, 'STAGE1_SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n');
  log('STOP:', summary.stop); process.exit(1);
}
const load = (f) => JSON.parse(fs.readFileSync(path.join(EV, f), 'utf8'));
const rec = (s, i, T, r) => load(`${s}_${i}_T${T}_${r}.json`);
const recB = (s, i, r) => load(`${s}_${i}_B_${r}.json`);

// ---- seeds ----------------------------------------------------------------------------------------------------
const seedOk = jobs.every(j => { const x = load(j.file); return JSON.stringify(x.evaluatedSeeds) === JSON.stringify([j.s]); });
summary.gates.seeds = { pass: seedOk, rule: 'every process evaluated exactly its own approved fixture seed' };

// ---- blindness (static, over the Stage-1 code) -------------------------------------------------------------------
const code = ['experiments/m40/child.mjs', 'experiments/m40/run_stage1.mjs', 'experiments/m40/hook.mjs'].map(f =>
  fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).join('\n');
// built from fragments so this list cannot match itself
const FORBIDDEN = [['ABL', 'ATED'], ['oracle', 'Set'], ['reliability', 'OptimalPolicy'], ['hop', 'OptimalPolicy'], ['expected', 'CostToGoal'],
  ['p', 'Phase'], ['permutation', 'For'], ['seed', 'For'], ['e2', 'Diagnostics'], ['n', 'Plus'], ['n', 'Minus'], ['ZE', 'RO'], ['PE', 'RM'], ['ORA', 'CLE']].map(p => p.join(''));
const hits = FORBIDDEN.filter(t => code.includes(t));
const guardArms = [...code.matchAll(/makeGuard\(\{\s*arm:\s*'([A-Z]+)'/g)].map(m => m[1]);
summary.gates.blindness = { pass: hits.length === 0 && guardArms.length > 0 && guardArms.every(a => a === 'ARMED'),
  forbiddenTokensFound: hits, guardArms };

// ---- PE per fixture and replicate (XC5) -------------------------------------------------------------------------
summary.gates.pe = [];
for (const [s, i] of FIXTURES) for (const r of REPLICATES) {
  const A = rec(s, i, S.T_A, r).pe, B = recB(s, i, r).pe;
  const res = B ? S.prefixEquivalent(A, B) : { pass: false, mismatches: ['B capture missing'] };
  const rawDiff = B ? Object.keys(A.digestRaw).filter(k => A.digestRaw[k] !== B.digestRaw[k]) : null;
  summary.gates.pe.push({ fixture: `${s}:${i}`, replicate: r, pass: res.pass, mismatches: res.mismatches,
    rawComponentsDifferingBeforeProjection: rawDiff, capturedAt: B && B.capturedAt, phaseAtCapture: B && B.phaseAtCapture });
}

// ---- DP per snapshot (XC6) ------------------------------------------------------------------------------------
summary.gates.dp = [];
for (const [s, i] of FIXTURES) for (const r of REPLICATES) for (const T of S.GRID) {
  const x = rec(s, i, T, r);
  summary.gates.dp.push({ fixture: `${s}:${i}`, replicate: r, T, pass: x.dp.pass, mismatches: x.dp.mismatches });
}

// ---- lineage at T=3000 against the committed M39-P1 evidence (XC2) ----------------------------------------------
summary.gates.lineage = [];
for (const [s, i] of FIXTURES) for (const r of REPLICATES) {
  const x = rec(s, i, 3000, r), m39 = JSON.parse(fs.readFileSync(path.join(ROOT, `experiments/m39/evidence/${s}_${i}_a.json`), 'utf8'));
  const bad = [];
  for (const u of m39.states) {
    const c = x.calibration[u], on = m39.primary[u].on;
    if (!c) { bad.push(`${u}:missing`); continue; }
    if (JSON.stringify(c.p0Keys) !== JSON.stringify(on.step0.keys) || JSON.stringify(c.p0Values) !== JSON.stringify(on.step0.values)) bad.push(`${u}:p0`);
    const pool = c.poolKeys.map((k, n) => [k, x.pe.readouts[u].poolWeights[n]]);
    if (JSON.stringify(pool) !== JSON.stringify(on.pool)) bad.push(`${u}:pool`);
  }
  if (JSON.stringify(x.pe.states) !== JSON.stringify(m39.states)) bad.push('states');
  if (x.run.fingerprint !== m39.run.fingerprint) bad.push('run-fingerprint');
  summary.gates.lineage.push({ fixture: `${s}:${i}`, replicate: r, pass: bad.length === 0, mismatches: bad });
}

// ---- reproducibility: the two replicates of every (fixture, mode, T) ------------------------------------------------
// Compared: run fingerprint, projected digests, RNG positions, readout closure vectors, calibration, DP outcome.
// Raw digests are compared too, and any difference must be confined to the declared clock-valued components.
summary.gates.reproducibility = [];
for (const [s, i] of FIXTURES) for (const key of [...S.GRID.map(T => `T${T}`), 'B']) {
  const a = load(`${s}_${i}_${key}_a.json`), b = load(`${s}_${i}_${key}_b.json`);
  const pick = (x) => JSON.stringify({ fp: x.run.fingerprint, d: x.pe && x.pe.digest, rng: x.pe && x.pe.rng, ro: x.pe && x.pe.readouts,
    cal: x.calibration || null, dp: x.dp ? [x.dp.pass, x.dp.mismatches] : null });
  const rawDiff = a.pe && b.pe ? Object.keys(a.pe.digestRaw).filter(k => a.pe.digestRaw[k] !== b.pe.digestRaw[k]) : [];
  const rawOk = rawDiff.every(k => k === 'episodes' || k === 'timeMemory');
  summary.gates.reproducibility.push({ fixture: `${s}:${i}`, key, pass: pick(a) === pick(b) && rawOk, rawComponentsDiffering: rawDiff });
}

const all = (arr) => arr.every(x => x.pass);
const validity = { seeds: seedOk, blindness: summary.gates.blindness.pass, pe: all(summary.gates.pe), dp: all(summary.gates.dp),
  lineage: all(summary.gates.lineage), reproducibility: all(summary.gates.reproducibility) };
summary.validity = validity;
const stopFor = !validity.seeds ? 'seed accounting' : !validity.blindness ? 'XC1 blindness' : !validity.pe ? 'XC5 prefix equivalence'
  : !validity.dp ? 'XC6 diagnostic purity' : !validity.lineage ? 'XC2 lineage' : !validity.reproducibility ? 'reproducibility' : null;

// ---- descriptive calibration (replicate a) and GO/NO-GO ----------------------------------------------------------
summary.calibration = {};
for (const T of S.GRID) {
  let states = 0, cands = 0, atCap = 0, rankable = 0;
  const distinctHist = {};
  for (const [s, i] of FIXTURES) {
    const x = rec(s, i, T, 'a');
    for (const u of Object.keys(x.calibration)) {
      const c = x.calibration[u];
      states++; cands += c.poolValues.length; atCap += c.atCap; if (c.rankable) rankable++;
      distinctHist[c.distinct] = (distinctHist[c.distinct] || 0) + 1;
    }
  }
  summary.calibration[T] = { regime: S.regimeAt(T), states, candidates: cands, atCap, capFraction: cands ? atCap / cands : null, rankable, distinctHist };
}
if (stopFor) {
  summary.stop = `STOP: ${stopFor} failed — GO/NO-GO not determined`;
} else {
  const atTA = [];
  for (const [s, i] of FIXTURES) { const x = rec(s, i, S.T_A, 'a'); for (const u of Object.keys(x.calibration)) atTA.push({ poolValues: x.calibration[u].poolValues }); }
  summary.goNoGo = S.goNoGo(atTA);
  summary.decision = summary.goNoGo.go ? 'GO' : 'NO-GO';
}
fs.writeFileSync(path.join(EV, 'STAGE1_SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n');
const manifest = fs.readdirSync(EV).filter(f => f.endsWith('.json')).sort().map(f => `${sha(fs.readFileSync(path.join(EV, f), 'utf8'))}  ${f}`);
fs.writeFileSync(path.join(EV, 'INTEGRITY.sha256'), manifest.join('\n') + '\n');

log('validity', JSON.stringify(validity));
log(summary.stop || `decision ${summary.decision} ${JSON.stringify(summary.goNoGo)}`);

// ==========================================================
// ACQ-1 — the confirmatory run (M-COGA-9).  Refuses unless every readiness gate passes.
// ==========================================================
//   node experiments/coga/acq1/run_confirmatory.mjs --out experiments/coga/data/acq1-confirmatory [--workers N]
// One OS process per MFW session.  Every allocated world: variants P, A, H x E1, E2.  Determinism: a prespecified share of worlds
// (the first DETERMINISM_SHARE of the allocation) repeats variant P.  Nothing here reads an outcome: the analysis is analyze.mjs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { buildCredit1Trees } from '../../credit1/transform.mjs';
import { CLOCK } from '../config.mjs';
import { STEPS, MFW_VARIANTS, DETERMINISM_SHARE } from './config.mjs';
import { ACQ_AUTHORIZATION as LOCK } from './lock.mjs';
import { checkReadiness } from './readiness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out'), workers = Number(arg('--workers', String(Math.max(1, os.cpus().length - 2))));
const stop = (m) => { console.error(`ACQ-1 confirmatory run refused: ${m}`); process.exit(2); };
if (!out) stop('--out is required');
const dataRoot = path.resolve(HERE, '..', 'data');
if (!path.resolve(out).startsWith(dataRoot + path.sep)) stop('the output directory must be inside experiments/coga/data (git-ignored)');
if (fs.existsSync(out) && fs.readdirSync(out).length) stop('the output directory is not empty');
const ready = checkReadiness();
if (!ready.ok) stop(`readiness failed: ${ready.gates.filter(g => !g.ok).map(g => g.name).join(' | ')}`);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'readiness.json'), JSON.stringify(ready, null, 1));

const trees = buildCredit1Trees();
const treeOf = (v) => (v === 'A' ? trees.trees.A.dir : trees.learn0.dir);
const preload = pathToFileURL(path.join(ROOT, 'experiments', 'credit1', 'clock_preload.mjs')).href;
const job = (w, variant, env, suffix = '') => { const label = `MFW${variant}-w${w.index}-${env}${suffix}`; return { label, input: { label, tree: treeOf(variant), world: { stream: 'study', index: w.index, configSeed: w.configSeed }, env, clock: { ...CLOCK }, kind: 'confirmatory', variant, steps: STEPS } }; };
const plan = LOCK.allocation.flatMap(w => MFW_VARIANTS.flatMap(v => ['E1', 'E2'].map(e => job(w, v, e))));
const replicas = LOCK.allocation.slice(0, Math.ceil(DETERMINISM_SHARE * LOCK.allocation.length));
plan.push(...replicas.flatMap(w => ['E1', 'E2'].map(e => job(w, 'P', e, '-repeat'))));
const env = { ...process.env }; delete env.NODE_OPTIONS;
const results = []; let next = 0; const t0 = Date.now();
const runOne = (j) => new Promise((resolve) => {
  const started = Date.now();
  const p = spawn(process.execPath, ['--import', preload, path.join(HERE, 'session_mfw.mjs'), JSON.stringify(j.input)], { cwd: ROOT, env });
  let so = '', se = ''; p.stdout.on('data', d => { so += d; }); p.stderr.on('data', d => { se += d; });
  p.on('close', (code) => { const m = /@@RESULT@@(.*)@@END@@/s.exec(so); if (m) fs.writeFileSync(path.join(out, `${j.label}.json`), m[1]); else fs.writeFileSync(path.join(out, `${j.label}.err`), se.slice(-20000)); results.push({ label: j.label, code, ok: !!m && code === 0, ms: Date.now() - started }); if (results.length % 50 === 0) console.log(`${results.length}/${plan.length} sessions, ${((Date.now() - t0) / 60000).toFixed(1)} min`); resolve(); });
});
const worker = async () => { while (next < plan.length) await runOne(plan[next++]); };
await Promise.all(Array.from({ length: Math.min(workers, plan.length) }, worker));
const files = fs.readdirSync(out).filter(f => f.endsWith('.json') && f !== 'manifest.json').sort();
const manifest = { schema: 'coga/acq1.confirmatory-run', head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(), lockFreeze: LOCK.freezeCommit, sessions: plan.length, ok: results.filter(r => r.ok).length, workers, wallMs: Date.now() - t0,
  results: results.sort((a, b) => a.label.localeCompare(b.label)), files: Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex')])) };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`confirmatory sessions ${manifest.ok}/${plan.length} ok, wall ${(manifest.wallMs / 60000).toFixed(1)} min`);
process.exit(0);

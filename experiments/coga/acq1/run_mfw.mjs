// ==========================================================
// ACQ-1 — MFW session orchestrator for DEVELOPMENT sets (one OS process per session, parallel workers)
// ==========================================================
//   node experiments/coga/acq1/run_mfw.mjs --set dev|sim:<from>:<count> --variant P|H|A --steps N --out <dir> [--workers N]
// Writes <out>/<label>.json per session and <out>/manifest.json (sha256 of every file).  Confirmatory runs use run_confirmatory.mjs.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { buildLearn0Tree } from '../../learn0/transform.mjs';
import { buildCredit1Trees } from '../../credit1/transform.mjs';
import * as M7ENV from '../../m7/env.js';
import { STUDY_STREAM_START, SIM_STREAM_START, DEV_INDICES, CLOCK } from '../config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const set = arg('--set'), out = arg('--out'), variant = arg('--variant', 'P'), steps = Number(arg('--steps', '3000')), workers = Number(arg('--workers', String(Math.max(1, os.cpus().length - 2))));
if (!set || !out) { console.error('usage: --set dev|sim:<from>:<count> --variant P|H|A --steps N --out <dir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const worldsOf = () => { if (set === 'dev') return M7ENV.generateAcceptedStream(STUDY_STREAM_START, DEV_INDICES.hi + 1).map(w => ({ stream: 'study', index: w.acceptedConfigIndex, configSeed: w.acceptedSeed }));
  const [, f, n] = set.split(':').map(Number); return M7ENV.generateAcceptedStream(SIM_STREAM_START, f + n).slice(f).map(w => ({ stream: 'sim', index: w.acceptedConfigIndex, configSeed: w.acceptedSeed })); };
const worlds = worldsOf();
// --tree reuses a built tree.  The tree builders delete and rewrite a shared directory, so two runs must never build while either is
// running: a rebuild under a live run failed 30 development sessions (ENOENT on env.js at session end).
const tree = arg('--tree') || (variant === 'A' ? buildCredit1Trees().trees.A.dir : buildLearn0Tree().dir);
const preload = pathToFileURL(path.join(ROOT, 'experiments', 'credit1', 'clock_preload.mjs')).href;
const skipExisting = process.argv.includes('--skip-existing');
const plan = worlds.flatMap(w => ['E1', 'E2'].map(e => { const label = `MFW${variant}-${w.stream}${w.index}-${e}`; return { label, input: { label, tree, world: w, env: e, clock: { ...CLOCK }, kind: 'development', variant, steps } }; })).filter(j => !(skipExisting && fs.existsSync(path.join(out, `${j.label}.json`))));
const env = { ...process.env }; delete env.NODE_OPTIONS;
const results = []; let next = 0; const t0 = Date.now();
const runOne = (job) => new Promise((resolve) => {
  const started = Date.now();
  const p = spawn(process.execPath, ['--import', preload, path.join(HERE, 'session_mfw.mjs'), JSON.stringify(job.input)], { cwd: ROOT, env });
  let so = '', se = ''; p.stdout.on('data', d => { so += d; }); p.stderr.on('data', d => { se += d; });
  p.on('close', (code) => { const m = /@@RESULT@@(.*)@@END@@/s.exec(so); if (m) fs.writeFileSync(path.join(out, `${job.label}.json`), m[1]); else fs.writeFileSync(path.join(out, `${job.label}.err`), se.slice(-20000)); results.push({ label: job.label, code, ok: !!m && code === 0, ms: Date.now() - started }); resolve(); });
});
const worker = async () => { while (next < plan.length) await runOne(plan[next++]); };
await Promise.all(Array.from({ length: Math.min(workers, plan.length) }, worker));
const files = fs.readdirSync(out).filter(f => f.endsWith('.json') && f !== 'manifest.json').sort();
const manifest = { schema: 'coga/acq1.mfw-run', set, variant, steps, workers, tree, sessions: plan.length, ok: results.filter(r => r.ok).length, wallMs: Date.now() - t0, results: results.sort((a, b) => a.label.localeCompare(b.label)),
  files: Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex')])) };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`variant ${variant} steps ${steps}: sessions ${manifest.ok}/${plan.length} ok, wall ${(manifest.wallMs / 1000).toFixed(1)} s`);
process.exit(manifest.ok === plan.length ? 0 : 1);

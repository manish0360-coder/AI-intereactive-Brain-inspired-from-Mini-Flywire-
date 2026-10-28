// ==========================================================
// COG-A — MFW session orchestrator (one OS process per session, parallel workers)
// ==========================================================
//   node experiments/coga/run_mfw.mjs --set dev|sim:<from>:<count> --out <dir> [--workers N] [--t0 B] [--stress K] [--only <i,j>]
// --set dev            accepted development worlds 0-29 (second-stage accepted only)
// --set sim:<f>:<n>    accepted development-simulation worlds f..f+n-1 of the stream from seed 150,000
// --t0 B               development t0-invariance check (A6)
// --stress K           K busy-loop processes during the run (A6 load check)
// Writes <out>/<label>.json per session and <out>/manifest.json (sha256 of every file, plan, tree, timings).
// Confirmatory sessions are not run by this script (run_confirmatory.mjs, after the freeze).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, fork } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { buildLearn0Tree } from '../learn0/transform.mjs';
import { streamWorlds } from './worlds.mjs';
import { STUDY_STREAM_START, SIM_STREAM_START, DEV_INDICES, CLOCK } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const set = arg('--set'), out = arg('--out'), workers = Number(arg('--workers', String(Math.max(1, os.cpus().length - 2))));
const t0 = arg('--t0') === 'B' ? 1798761600000 : CLOCK.t0, stress = Number(arg('--stress', '0'));
const only = arg('--only') ? arg('--only').split(',').map(Number) : null;
const hooks = arg('--hooks', 'P');
if (!set || !out) { console.error('usage: --set dev|sim:<from>:<count> --out <dir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

let worlds;
if (set === 'dev') worlds = streamWorlds(STUDY_STREAM_START, DEV_INDICES.hi + 1, 'study');
else { const [, f, n] = set.split(':').map(Number); worlds = streamWorlds(SIM_STREAM_START, f + n, 'sim').slice(f); }
worlds = worlds.filter(w => w.accepted && (!only || only.includes(w.index)));
const tree = buildLearn0Tree().dir;
const preload = pathToFileURL(path.join(ROOT, 'experiments', 'credit1', 'clock_preload.mjs')).href;
const tag = (t0 === CLOCK.t0 ? '' : '-t0B') + (hooks === 'P' ? '' : '-' + hooks);
const plan = worlds.flatMap(w => ['SWAP', 'NOSWAP'].map(c => ({ label: `MFW-${w.stream}${w.index}-${c}${tag}`, input: { label: `MFW-${w.stream}${w.index}-${c}${tag}`, tree, world: { stream: w.stream, index: w.index, configSeed: w.configSeed }, condition: c, clock: { ...CLOCK, t0 }, kind: 'development', hooks } })));

const stressors = [];
for (let i = 0; i < stress; i++) stressors.push(spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }));
const env = { ...process.env }; delete env.NODE_OPTIONS;
const results = []; let next = 0;
const t0wall = Date.now();
function runOne(job) {
  return new Promise((resolve) => {
    const started = Date.now();
    const p = spawn(process.execPath, ['--import', preload, path.join(HERE, 'session_mfw.mjs'), JSON.stringify(job.input)], { cwd: ROOT, env });
    let so = '', se = '';
    p.stdout.on('data', d => { so += d; }); p.stderr.on('data', d => { se += d; });
    p.on('close', (code) => {
      const m = /@@RESULT@@(.*)@@END@@/s.exec(so);
      const file = path.join(out, `${job.label}.json`);
      if (m) fs.writeFileSync(file, m[1]); else fs.writeFileSync(path.join(out, `${job.label}.err`), se.slice(-20000));
      results.push({ label: job.label, code, ok: !!m && code === 0, ms: Date.now() - started, stderrBytes: se.length });
      resolve();
    });
  });
}
async function worker() { while (next < plan.length) { const j = plan[next++]; await runOne(j); } }
await Promise.all(Array.from({ length: Math.min(workers, plan.length) }, worker));
for (const s of stressors) s.kill();
const files = fs.readdirSync(out).filter(f => f.endsWith('.json') && f !== 'manifest.json').sort();
const manifest = { schema: 'coga/1.mfw-run', set, t0, stress, workers, tree, treeMain: crypto.createHash('sha256').update(fs.readFileSync(path.join(tree, 'main.js'))).digest('hex'),
  sessions: plan.length, ok: results.filter(r => r.ok).length, wallMs: Date.now() - t0wall, results: results.sort((a, b) => a.label.localeCompare(b.label)),
  files: Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex')])) };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`sessions ${manifest.ok}/${plan.length} ok, wall ${(manifest.wallMs / 1000).toFixed(1)} s, workers ${workers}, stress ${stress}`);
process.exit(manifest.ok === plan.length ? 0 : 1);

// ==========================================================
// XFER-1 — orchestrator (development; runs sessions, writes raw records, then the manifest)
// ==========================================================
//   node orchestrate.mjs --block A|B --out <dir> [--workers 6] [--arms COLD,FULL,...]
//   node orchestrate.mjs --worlds 0:7 --out <dir> ...
//
// Phase 1 trains every selected world (one cold session each, brain written to <out>/brains/w<i>.json).
// Phase 2 runs every test arm of every world (a new process each, delivering a component-masked copy of the own or
// donor brain).  A session that exits non-zero or prints no result gets ONE deterministic retry, then the run records
// the failure and ends non-zero.  Raw records stay in <out> (git-ignored); analyze.mjs reads them.
// No wall clock and no random number is used; the only nondeterminism is process scheduling, which cannot change a
// record (one process per session).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { generateAcceptedStream } from '../m7/env.js';
import { CONFIG_START, WORLDS_TOTAL, BLOCKS, ARMS, ARM_ORDER, TICKS, planWorlds, sha256, hashObject } from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const fail = (m) => { console.error(`XFER-1 orchestrate: ${m}`); process.exit(2); };

// ---- selection ----
let lo, hi;
if (flag('--block')) { const b = BLOCKS[flag('--block')]; if (!b) fail('unknown block'); lo = b.lo; hi = b.hi; }
else if (flag('--worlds')) { [lo, hi] = flag('--worlds').split(':').map(Number); }
else fail('--block or --worlds is required');
if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi >= WORLDS_TOTAL || lo > hi) fail('worlds out of range');
const OUT = flag('--out');
if (!OUT) fail('--out is required');
const out = path.resolve(OUT);
const workers = Number(flag('--workers') || 6);
const arms = flag('--arms') ? flag('--arms').split(',') : ARM_ORDER;
for (const a of arms) if (!ARMS[a]) fail(`unknown arm ${a}`);
for (const d of ['sessions', 'brains']) fs.mkdirSync(path.join(out, d), { recursive: true });

// ---- plan (donors are inside a block, so a block is self-contained) ----
const tree = buildTree();
// The accepted stream is a pure function of (CONFIG_START, WORLDS_TOTAL, env.js); generating it costs minutes, so it is
// cached next to the run directories, keyed by the SHA-256 of env.js, and re-derived whenever that file changes.
const envSha = sha256(fs.readFileSync(path.join(HERE, '..', 'm7', 'env.js')));
const cacheFile = path.join(path.dirname(out), `stream_${CONFIG_START}_${WORLDS_TOTAL}_${envSha.slice(0, 12)}.json`);
let stream;
if (fs.existsSync(cacheFile)) stream = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
else {
  stream = generateAcceptedStream(CONFIG_START, WORLDS_TOTAL).map(w => ({ acceptedConfigIndex: w.acceptedConfigIndex, startingSeed: w.startingSeed, acceptedSeed: w.acceptedSeed,
    numberOfRejectedCandidatesBeforeAcceptance: w.numberOfRejectedCandidatesBeforeAcceptance, goal: w.goal }));
  fs.writeFileSync(cacheFile, JSON.stringify(stream));
}
const plan = planWorlds(stream);
const worlds = plan.filter(w => w.world >= lo && w.world <= hi);
for (const w of worlds) {
  if (!arms.some(a => ARMS[a].source === 'donor')) continue;
  if (w.donor === null) fail(`world ${w.world} has no donor`);
  if (w.donor < lo || w.donor > hi) fail(`the donor of world ${w.world} (world ${w.donor}) is outside the selected worlds`);
}
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify({ configStart: CONFIG_START, worldsTotal: WORLDS_TOTAL, selected: [lo, hi], arms, ticks: TICKS, plan: worlds }, null, 1));

// ---- process pool ----
function runSession(input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, 'session.mjs'), JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    child.stdout.on('data', d => { so += d; });
    child.stderr.on('data', d => { se += d; });
    child.on('close', (code) => {
      const m = so.match(/@@RESULT@@(.*)@@END@@/s);
      let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; }
      resolve({ code, rec, stderrTail: se.slice(-300) });
    });
  });
}
async function withRetry(input) {
  let r = await runSession(input);
  if (r.code !== 0 || r.rec === null || r.rec.outcome.crashed) r = { ...(await runSession(input)), retried: true };
  return r;
}
async function pool(tasks, n, onDone) {
  let next = 0;
  const run = async () => { for (;;) { const i = next++; if (i >= tasks.length) return; const r = await withRetry(tasks[i].input); onDone(tasks[i], r); } };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, run));
}

const failures = [];
const record = (t, r) => {
  if (r.code !== 0 || r.rec === null || r.rec.outcome.crashed) { failures.push({ label: t.label, code: r.code, stderrTail: r.stderrTail }); return; }
  fs.writeFileSync(path.join(out, 'sessions', `${t.label}.json`), JSON.stringify(r.rec));
};
const brainPath = (w) => path.join(out, 'brains', `w${w}.json`);

// Phase 1: training sessions (world's own brain)
const trains = worlds.map(w => ({ label: `train-w${w.world}`, input: { role: 'train', label: `train-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.trainSeed, ticks: TICKS.train, exportPath: brainPath(w.world) } }));
await pool(trains, workers, record);
console.log(`phase 1: ${trains.length - failures.length}/${trains.length} training sessions ok`);
if (failures.length) { fs.writeFileSync(path.join(out, 'failures.json'), JSON.stringify(failures, null, 1)); process.exit(1); }

// Phase 2: test arms
const tests = [];
for (const w of worlds) for (const a of arms) {
  const src = ARMS[a].source;
  const input = { role: 'test', label: `test-${a}-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.testSeed, ticks: TICKS.test, arm: a };
  if (src === 'own') { input.brainPath = brainPath(w.world); input.brainWorld = w.world; }
  if (src === 'donor') { input.brainPath = brainPath(w.donor); input.brainWorld = w.donor; }
  tests.push({ label: input.label, input });
}
await pool(tests, workers, record);
console.log(`phase 2: ${tests.length - failures.length}/${tests.length} test sessions ok`);

// ---- manifest (hashes of every record, the tree, the plan) ----
const files = fs.readdirSync(path.join(out, 'sessions')).sort();
const entries = Object.fromEntries(files.map(f => [f, sha256(fs.readFileSync(path.join(out, 'sessions', f)))]));
const brains = fs.readdirSync(path.join(out, 'brains')).sort();
const brainEntries = Object.fromEntries(brains.map(f => [f, sha256(fs.readFileSync(path.join(out, 'brains', f)))]));
const manifest = { schema: 'xfer1.manifest/1', worlds: [lo, hi], arms, sessions: entries, brains: brainEntries,
  tree: { name: path.basename(tree.dir), b2Commit: tree.manifest.b2Commit, transformSha256: tree.manifest.transformSha256 },
  planSha256: hashObject(worlds), failures: failures.length };
manifest.digest = hashObject({ sessions: entries, brains: brainEntries, planSha256: manifest.planSha256, tree: manifest.tree });
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
if (failures.length) { fs.writeFileSync(path.join(out, 'failures.json'), JSON.stringify(failures, null, 1)); console.error(`${failures.length} failed session(s)`); process.exit(1); }
console.log(`manifest digest ${manifest.digest}`);

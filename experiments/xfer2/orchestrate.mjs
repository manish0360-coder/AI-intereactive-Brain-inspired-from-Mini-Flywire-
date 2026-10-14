// ==========================================================
// XFER-2 — orchestrator
// ==========================================================
//   node orchestrate.mjs --block C|D --out <dir> [--workers 6] [--plan-only]
// Phase 1  trains every world of the block (xfer1 session driver, cold, new agent seed).
// Phase 1b builds every control store from the world's own training store and the world-independent COVER store, runs the
//          construct checks, and EXCLUDES a world whose controls fail them (before any test session of that world runs).
// Phase 2  runs every arm of every valid world (xfer1 session driver; the arm's episode store is delivered through
//          loadBrain()).  A session that fails gets one deterministic retry; a world with a still-failing session is
//          excluded and listed.  Nothing is dropped for what its outcomes were.
// --plan-only prints the plan and the design digest and exits without running any session.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';
import { generateAcceptedStream } from '../m7/env.js';
import { componentHashes } from '../xfer1/brain.mjs';
import * as C from './config.mjs';
import { makeGraph, coverStore, noReplay, storeStats, residuals } from './controls.mjs';
import { storeFor, deliveryFor } from './arms.mjs';
import { representationProblems, coverProblems, noReplayProblems, reversedProblems } from './checks.mjs';
import { reversedNoReplay } from './controls.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SESSION = path.join(ROOT, 'experiments', 'xfer1', 'session.mjs');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const fail = (m) => { console.error(`XFER-2 orchestrate: ${m}`); process.exit(2); };

const block = flag('--block');
if (!C.BLOCKS[block]) fail('--block C or D is required');
if (!flag('--out')) fail('--out is required');
const { lo, hi } = C.BLOCKS[block];
const out = path.resolve(flag('--out'));
const workers = Number(flag('--workers') || 6);
const planOnly = argv.includes('--plan-only');

const designDigest = C.designDigest;

// ---- plan ----
const tree = buildTree();
const envSha = C.sha256(fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js')));
const cacheFile = path.join(HERE, 'data', `stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_${envSha.slice(0, 12)}.json`);
let stream;
if (fs.existsSync(cacheFile)) stream = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
else {
  stream = generateAcceptedStream(C.CONFIG_START, C.WORLDS_TOTAL).map(w => ({ acceptedConfigIndex: w.acceptedConfigIndex, startingSeed: w.startingSeed, acceptedSeed: w.acceptedSeed,
    numberOfRejectedCandidatesBeforeAcceptance: w.numberOfRejectedCandidatesBeforeAcceptance, goal: w.goal }));
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(stream));
}
const ids = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
const nextWhere = (w, pred) => { for (let s = 1; s < ids.length; s++) { const c = lo + ((w - lo + s) % ids.length); if (pred(stream[c])) return c; } return null; };
const worlds = ids.map(w => ({ world: w, block, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, goal: stream[w].goal,
  rejectedBeforeAcceptance: stream[w].numberOfRejectedCandidatesBeforeAcceptance, trainSeed: C.trainSeed(w), testSeed: C.testSeed(w),
  donorSG: nextWhere(w, s => s.goal === stream[w].goal), donorXG: nextWhere(w, s => s.goal !== stream[w].goal) }));
for (const w of worlds) if (w.donorSG === null || w.donorXG === null) fail(`world ${w.world} lacks a donor`);
for (const w of worlds) if (w.configSeed >= C.HELDOUT_FLOOR) fail(`world ${w.world} lies in held-out territory`);
console.log(`design digest ${designDigest()}`);
console.log(`block ${block}: worlds ${lo}..${hi}, ${worlds.length} worlds, arms ${C.ARM_ORDER.join(',')}`);
if (planOnly) process.exit(0);

for (const d of ['sessions', 'brains']) fs.mkdirSync(path.join(out, d), { recursive: true });
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];
const cover = coverStore(g, labelOf, { tag: 'cover' });
const coverNR = noReplay(cover);
const coverIssues = coverProblems(cover, g, labelOf);
if (coverIssues.length) fail(`the cover store is invalid: ${coverIssues.join('; ')}`);

// ---- process pool ----
function runSession(input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SESSION, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    child.stdout.on('data', d => { so += d; }); child.stderr.on('data', d => { se += d; });
    child.on('close', (code) => {
      const m = so.match(/@@RESULT@@(.*)@@END@@/s);
      let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; }
      resolve({ code, rec, stderrTail: se.slice(-300) });
    });
  });
}
const bad = (r) => r.code !== 0 || r.rec === null || r.rec.outcome.crashed || !r.rec.outcome.completed || r.rec.h1r.drawFaults !== 0 || r.rec.h1r.blockedIllegal !== 0;
async function withRetry(input) { let r = await runSession(input); if (bad(r)) r = { ...(await runSession(input)), retried: true }; return r; }
async function pool(tasks, n, onDone) {
  let next = 0;
  const run = async () => { for (;;) { const i = next++; if (i >= tasks.length) return; onDone(tasks[i], await withRetry(tasks[i].input)); } };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, run));
}

const exclusions = [];
const failedWorlds = new Set();
const write = (t, r) => {
  if (bad(r)) { failedWorlds.add(t.world); exclusions.push({ world: t.world, label: t.label, reason: 'session failed after one retry', code: r.code, stderrTail: r.stderrTail.replace(/[A-Za-z]:[\\/][^\s'"]*/g, '<path>') }); return; }
  fs.writeFileSync(path.join(out, 'sessions', `${t.label}.json`), JSON.stringify(r.rec));
};
const brainFile = (w) => path.join(out, 'brains', `w${w}.json`);

// Phase 1: training
const trains = worlds.map(w => ({ world: w.world, label: `x2-train-w${w.world}`, input: { role: 'train', label: `x2-train-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.trainSeed, ticks: C.TICKS.train, exportPath: brainFile(w.world) } }));
await pool(trains, workers, write);
console.log(`phase 1: ${trains.length - failedWorlds.size}/${trains.length} training sessions ok`);

// Phase 1b: control stores + construct checks (outcome-free)
const controls = {};
const valid = [];
for (const w of worlds) {
  if (failedWorlds.has(w.world)) continue;
  const own = JSON.parse(fs.readFileSync(brainFile(w.world), 'utf8')).episodes;
  const sg = JSON.parse(fs.readFileSync(brainFile(w.donorSG), 'utf8')).episodes;
  const xg = JSON.parse(fs.readFileSync(brainFile(w.donorXG), 'utf8')).episodes;
  if (failedWorlds.has(w.donorSG) || failedWorlds.has(w.donorXG)) { exclusions.push({ world: w.world, reason: 'a donor world failed training' }); continue; }
  const ctx = { realEpisodes: own, donorSG: sg, donorXG: xg, cover, coverNR, labelOf };
  const issues = [...representationProblems(own, g, labelOf), ...noReplayProblems(noReplay(own), own, g), ...reversedProblems(reversedNoReplay(own, labelOf), own, g), ...coverProblems(cover, g, labelOf, [own])];
  if (issues.length) { exclusions.push({ world: w.world, reason: 'construct check failed', issues: issues.slice(0, 5) }); continue; }
  const sReal = storeStats(own, g, w.goal);
  controls[w.world] = { realEpisodes: own.length, realStats: { ...sReal, edgeCounts: undefined }, arms: {} };
  for (const arm of C.ARM_ORDER) {
    const store = storeFor(arm, ctx);
    if (store === null) { controls[w.world].arms[arm] = { storeHash: null, episodes: 0 }; continue; }
    const s = storeStats(store, g, w.goal);
    controls[w.world].arms[arm] = { storeHash: componentHashes({ episodes: store }).episodes, episodes: store.length, stats: { ...s, edgeCounts: undefined }, residualVsReal: residuals(s, sReal) };
    const d = deliveryFor(arm);
    if (d.source === 'file') fs.writeFileSync(path.join(out, 'brains', `${arm}_w${w.world}.json`), JSON.stringify({ episodes: store }));
  }
  valid.push(w);
}
console.log(`phase 1b: ${valid.length}/${worlds.length} worlds pass the construct checks`);

// Phase 2: test arms
const tests = [];
for (const w of valid) for (const arm of C.ARM_ORDER) {
  const d = deliveryFor(arm);
  const input = { role: 'test', label: `x2-${arm}-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.testSeed, ticks: C.TICKS.test, arm: d.session };
  if (d.source === 'file') { input.brainPath = path.join(out, 'brains', `${arm}_w${w.world}.json`); input.brainWorld = w.world; }
  if (d.source === 'donor') { const dw = arm === 'DONOR_SG' ? w.donorSG : w.donorXG; input.brainPath = brainFile(dw); input.brainWorld = dw; }
  tests.push({ world: w.world, label: input.label, input });
}
await pool(tests, workers, write);
console.log(`phase 2: ${tests.length} test sessions attempted; failed worlds ${[...failedWorlds].filter(x => valid.some(w => w.world === x)).length}`);

// ---- manifest ----
const sessions = {};
for (const f of fs.readdirSync(path.join(out, 'sessions')).sort()) sessions[f] = C.sha256(fs.readFileSync(path.join(out, 'sessions', f)));
const excludedWorlds = new Set(exclusions.map(e => e.world));
const planOut = { schema: C.SCHEMA, block, arms: C.ARM_ORDER, ticks: C.TICKS, worlds, validWorlds: valid.map(w => w.world).filter(w => !excludedWorlds.has(w)), exclusions };
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(planOut, null, 1));
fs.writeFileSync(path.join(out, 'controls.json'), JSON.stringify({ coverSha256: C.hashObject(cover.map(e => ({ ...e, id: undefined, timestamp: undefined }))), controls }, null, 1));
const manifest = { schema: `${C.SCHEMA}.manifest`, block, designDigest: designDigest(), tree: { name: path.basename(tree.dir), b2Commit: tree.manifest.b2Commit, transformSha256: tree.manifest.transformSha256 },
  sessions, planSha256: C.hashObject(planOut), controlsSha256: C.hashObject(controls), exclusions: exclusions.length };
manifest.digest = C.hashObject({ ...manifest });
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest digest ${manifest.digest}; excluded worlds ${excludedWorlds.size}/${worlds.length}`);
if (excludedWorlds.size / worlds.length > C.RULES.maxExcludedFraction) { console.error('block INVALID: excluded fraction exceeds the declared limit'); process.exit(1); }

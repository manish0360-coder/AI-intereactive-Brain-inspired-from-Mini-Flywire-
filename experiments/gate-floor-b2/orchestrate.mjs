// ==========================================================
// GATE-FLOOR-B2 — orchestrator (pristine B2)
// ==========================================================
//   node orchestrate.mjs --out <dir> [--workers 6] [--plan-only] [--selftest]
// Phase 1  trains every world (cold, new agent seed; the world's own real store for REAL / REAL_FLOOR).
// Phase 1b builds each arm's store and runs the construct checks; a world whose control fails them is EXCLUDED (before
//          any test session of that world runs).  The REAL store is the pristine runtime's own export: it is checked
//          for delivery exactness, never for edge legality.
// Phase 2  runs every arm of every valid world on the derived pristine tree (one process per session).  A session that
//          fails gets one deterministic retry; a world with a still-failing session is excluded and listed.  Nothing is
//          dropped for what its outcomes were.
// --plan-only prints the plan and the design digest and exits.  --selftest runs the PLUMBING only (XFER-1 worlds 0..3,
// floor-off arms, a directory under the system temp dir); it generates no floor outcome and analyze.mjs refuses it.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extendStream } from '../gate-floor1/stream.mjs';
import { componentHashes } from '../xfer1/brain.mjs';
import { makeGraph, entryStore } from '../xfer2/controls.mjs';
import { entryProblems } from '../xfer2/checks.mjs';
import { buildDerivedTree } from './transform.mjs';
import * as C from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SESSION = path.join(HERE, 'session.mjs');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const fail = (m) => { console.error(`GATE-FLOOR-B2 orchestrate: ${m}`); process.exit(2); };

if (!flag('--out')) fail('--out is required');
const out = path.resolve(flag('--out'));
const workers = Number(flag('--workers') || 6);
const planOnly = argv.includes('--plan-only');
const selftest = argv.includes('--selftest');
if (selftest && !out.startsWith(fs.realpathSync.native(os.tmpdir()))) fail('--selftest writes only under the system temp directory');
const { lo, hi } = selftest ? { lo: 0, hi: 3 } : C.BLOCKS.G;
const ARMS_RUN = selftest ? C.ARM_ORDER.filter(a => !C.ARMS[a].floor) : C.ARM_ORDER;
const floorModeFor = (arm) => (C.ARMS[arm].floor ? 'on' : 'off');
const deliveryFor = (arm) => (C.ARMS[arm].store === 'none' ? { session: 'COLD', source: 'none' } : { session: 'ONLY_episodes', source: 'file', file: C.ARMS[arm].store });

// ---- plan ----
const tree = buildDerivedTree();
const envSha = C.sha256(fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js')));
const cacheFile = path.join(HERE, 'data', `stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_${envSha.slice(0, 12)}.json`);
let stream;
if (fs.existsSync(cacheFile)) stream = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
else {
  stream = extendStream(C.CONFIG_START, C.WORLDS_TOTAL, path.join(ROOT, 'experiments', 'gate-floor1', 'data'), envSha);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(stream));
}
const worlds = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map(w => ({ world: w, block: selftest ? 'SELFTEST' : 'G', configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex,
  goal: stream[w].goal, rejectedBeforeAcceptance: stream[w].numberOfRejectedCandidatesBeforeAcceptance, trainSeed: C.trainSeed(w), testSeed: C.testSeed(w) }));
for (const w of worlds) if (w.configSeed >= C.HELDOUT_FLOOR) fail(`world ${w.world} lies in held-out territory`);
const perGoal = Object.fromEntries(C.GOALS.map(g => [g, worlds.filter(w => w.goal === g).length]));
if (!selftest && C.GOALS.some(g => perGoal[g] !== C.WORLDS_N / C.GOALS.length)) fail(`goal groups are not balanced: ${JSON.stringify(perGoal)}`);
console.log(`design digest ${C.designDigest()}`);
console.log(`decision digest ${C.decisionDigest()}`);
console.log(`block G: worlds ${lo}..${hi}, ${worlds.length} worlds, goals ${JSON.stringify(perGoal)}, arms ${ARMS_RUN.join(',')}${selftest ? ' [SELFTEST: plumbing only]' : ''}`);
console.log(`tree ${path.basename(tree.dir)} main.js ${tree.manifest.gatefloorb2.mainSha256.slice(0, 12)} (pristine ${tree.manifest.gatefloorb2.parentMainSha256.slice(0, 12)})`);
if (planOnly) process.exit(0);
if (tree.manifest.gatefloorb2.mainSha256 !== C.TREE.derivedMainSha256 || tree.manifest.gatefloorb2.parentMainSha256 !== C.TREE.pristineMainSha256) fail('the derived tree is not the pinned one');

for (const d of ['sessions', 'brains']) fs.mkdirSync(path.join(out, d), { recursive: true });
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];

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
const bad = (r) => r.code !== 0 || r.rec === null || r.rec.outcome.crashed || !r.rec.outcome.completed;
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
const storeFile = (kind, w) => path.join(out, 'brains', `${kind}_w${w}.json`);

// Phase 1: training
const trains = worlds.map(w => ({ world: w.world, label: `gfb2-train-w${w.world}`, input: { role: 'train', label: `gfb2-train-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed,
  configIndex: w.configIndex, agentSeed: w.trainSeed, ticks: C.TICKS.train, exportPath: brainFile(w.world), floor: 'off', instrument: true } }));
await pool(trains, workers, write);
console.log(`phase 1: ${trains.length - failedWorlds.size}/${trains.length} training sessions ok`);

// Phase 1b: stores + construct checks (outcome-free)
const realProblems = (own) => {
  const p = [], ids = new Set();
  if (!Array.isArray(own)) return ['the exported store is not an array'];
  own.forEach((e, i) => { if (typeof e.id !== 'string' || ids.has(e.id)) p.push(`episode ${i}: id missing or duplicated`); ids.add(e.id); if (!Array.isArray(e.nodes) || e.nodes.length < 2) p.push(`episode ${i}: no node sequence`); });
  return p.slice(0, 5);
};
const controls = {};
const valid = [];
for (const w of worlds) {
  if (failedWorlds.has(w.world)) continue;
  const own = JSON.parse(fs.readFileSync(brainFile(w.world), 'utf8')).episodes;
  const entry = entryStore(g, labelOf, w.goal);
  const issues = [...realProblems(own), ...entryProblems(entry, g, labelOf, w.goal)];
  if (issues.length) { exclusions.push({ world: w.world, reason: 'construct check failed', issues }); continue; }
  controls[w.world] = { realEpisodes: own.length, realNonEdgeTransitions: own.reduce((s, e) => s + e.nodes.slice(0, -1).filter((u, k) => !g.directed.has(`${u}->${e.nodes[k + 1]}`)).length, 0),
    realTransitions: own.reduce((s, e) => s + e.nodes.length - 1, 0), arms: {} };
  for (const arm of ARMS_RUN) {
    const store = C.ARMS[arm].store === 'none' ? null : C.ARMS[arm].store === 'own-real' ? own : entry;
    if (store === null) { controls[w.world].arms[arm] = { storeHash: null, episodes: 0 }; continue; }
    controls[w.world].arms[arm] = { storeHash: componentHashes({ episodes: store }).episodes, episodes: store.length };
    const f = storeFile(deliveryFor(arm).file, w.world);
    if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify({ episodes: store }));
  }
  valid.push(w);
}
console.log(`phase 1b: ${valid.length}/${worlds.length} worlds pass the construct checks`);

// Phase 2: test arms
const tests = [];
for (const w of valid) for (const arm of ARMS_RUN) {
  const d = deliveryFor(arm);
  const input = { role: 'test', label: `gfb2-${arm}-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.testSeed, ticks: C.TICKS.test, arm: d.session, floor: floorModeFor(arm), instrument: true };
  if (d.source === 'file') { input.brainPath = storeFile(d.file, w.world); input.brainWorld = w.world; }
  tests.push({ world: w.world, label: input.label, input });
}
await pool(tests, workers, write);
console.log(`phase 2: ${tests.length} test sessions attempted`);

// ---- manifest ----
const sessions = {};
for (const f of fs.readdirSync(path.join(out, 'sessions')).sort()) sessions[f] = C.sha256(fs.readFileSync(path.join(out, 'sessions', f)));
const excludedWorlds = new Set(exclusions.map(e => e.world));
const planOut = { schema: C.SCHEMA, block: selftest ? 'SELFTEST' : 'G', selftest, arms: ARMS_RUN, ticks: C.TICKS, worlds, validWorlds: valid.map(w => w.world).filter(w => !excludedWorlds.has(w)), exclusions };
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(planOut, null, 1));
fs.writeFileSync(path.join(out, 'controls.json'), JSON.stringify({ controls }, null, 1));
const manifest = { schema: `${C.SCHEMA}.manifest`, block: selftest ? 'SELFTEST' : 'G', selftest, designDigest: C.designDigest(), decisionDigest: C.decisionDigest(),
  tree: { name: path.basename(tree.dir), b2Commit: tree.manifest.b2Commit, transformSha256: tree.manifest.gatefloorb2.transformSha256,
    pristineMainSha256: tree.manifest.gatefloorb2.parentMainSha256, derivedMainSha256: tree.manifest.gatefloorb2.mainSha256 },
  sessions, planSha256: C.hashObject(planOut), controlsSha256: C.hashObject(controls), exclusions: exclusions.length };
manifest.digest = C.hashObject({ ...manifest });
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest digest ${manifest.digest}; excluded worlds ${excludedWorlds.size}/${worlds.length}`);
if (excludedWorlds.size / worlds.length > C.RULES.maxExcludedFraction) { console.error('block INVALID: excluded fraction exceeds the declared limit'); process.exit(1); }

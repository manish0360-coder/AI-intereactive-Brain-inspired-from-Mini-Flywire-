// ==========================================================
// GATE-FLOOR-SCOPE (design C') â€” orchestrator (unchanged guard tree; hook state P; 2 training regimes x 4 test cells per world)
// ==========================================================
//   node orchestrate.mjs --out <dir> [--workers 6] [--plan-only] [--plan-json <file>] [--selftest]
// Phase 1  trains every world TWICE from the same configuration and training seed (cold, floor off): U with the guard off, G with the bundle;
//          each exports its own store.
// Phase 1b builds each store (episodes only), runs the construct check and records the store controls (hash, size, store diagnostics, the
//          training session's recording-audit attribution); a world whose U or G store fails is EXCLUDED before any test session.
// Phase 2  runs the four test cells of every valid world (floor ON, the world's test seed).  A session that fails - or violates condition
//          integrity or guard completeness - gets one deterministic retry; a world with a still-failing session is excluded and listed.
//          Nothing is dropped for what its outcomes were.
// --plan-only prints the plan (and writes it with --plan-json) and exits WITHOUT running a session.  --selftest runs the PLUMBING only (XFER-1
// development worlds 0..1, directory under the system temp dir); it is never a study block and analyze.mjs refuses it.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extendStream } from '../gate-floor1/stream.mjs';
import { componentHashes } from '../xfer1/brain.mjs';
import { buildGuardTree } from '../gate-floor-interaction/transform.mjs';
import { adjacency, storeDiagnostics } from './diag.mjs';
import * as C from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SESSION = path.join(HERE, 'session.mjs');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const fail = (m) => { console.error(`GATE-FLOOR-SCOPE orchestrate: ${m}`); process.exit(2); };

const planOnly = argv.includes('--plan-only');
const selftest = argv.includes('--selftest');
if (!flag('--out') && !planOnly) fail('--out is required');
const out = flag('--out') ? path.resolve(flag('--out')) : null;
const workers = Number(flag('--workers') || 6);
if (selftest && !(out && out.startsWith(fs.realpathSync.native(os.tmpdir())))) fail('--selftest writes only under the system temp directory');
const { lo, hi } = selftest ? { lo: 0, hi: 1 } : C.BLOCKS.S;
const BLOCK = selftest ? 'SELFTEST' : 'S';

// ---- the accepted-configuration stream (the longest cached prefix of an earlier study is continued; nothing is invented) ----
const envSha = C.sha256(fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js')));
const cacheFile = path.join(HERE, 'data', `stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_${envSha.slice(0, 12)}.json`);
let stream;
if (fs.existsSync(cacheFile)) stream = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
else {
  const prefixDirs = ['gate-floor-interaction', 'gate-floor-prodsem', 'gate-floor-head', 'gate-floor-b2'].map(d => path.join(ROOT, 'experiments', d, 'data'));
  for (const d of prefixDirs) { try { stream = extendStream(C.CONFIG_START, C.WORLDS_TOTAL, d, envSha); break; } catch (e) { if (d === prefixDirs[prefixDirs.length - 1]) throw e; } }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(stream));
}

// ---- the plan: every session of the block, explicitly ----
const worlds = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map(w => ({ world: w, block: BLOCK, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex,
  goal: stream[w].goal, rejectedBeforeAcceptance: stream[w].numberOfRejectedCandidatesBeforeAcceptance, trainSeed: C.trainSeed(w), testSeed: C.testSeed(w) }));
for (const w of worlds) if (w.configSeed >= C.HELDOUT_FLOOR) fail(`world ${w.world} lies in held-out territory`);
const perGoal = Object.fromEntries(C.GOALS.map(g => [g, worlds.filter(w => w.goal === g).length]));
if (!selftest && C.GOALS.some(g => perGoal[g] !== C.PER_GOAL)) fail(`goal groups are not balanced: ${JSON.stringify(perGoal)}`);
const trainLabel = (t, w) => `gfs-train${t.id}-w${w}`;
const testLabel = (c, w) => `gfs-${c.name}-w${w}`;
function planSessions(ws) {
  const s = [];
  for (const w of ws) for (const t of C.TRAININGS) s.push({ phase: 'train', label: trainLabel(t, w.world), world: w.world, regime: t.id, guard: t.guard, floor: 'off', agentSeed: w.trainSeed, configSeed: w.configSeed });
  for (const w of ws) for (const c of C.CELLS) s.push({ phase: 'test', label: testLabel(c, w.world), world: w.world, cell: c.name, store: c.store, guard: c.guard, floor: 'on', agentSeed: w.testSeed, configSeed: w.configSeed });
  return s;
}
const PLAN = planSessions(worlds);
const counts = { total: PLAN.length, training: PLAN.filter(p => p.phase === 'train').length, test: PLAN.filter(p => p.phase === 'test').length,
  byRegime: Object.fromEntries(C.TRAININGS.map(t => [t.id, PLAN.filter(p => p.regime === t.id).length])), byCell: Object.fromEntries(C.CELL_NAMES.map(c => [c, PLAN.filter(p => p.cell === c).length])) };
const tree = buildGuardTree();
console.log(`design digest ${C.designDigest()}`);
console.log(`decision digest ${C.decisionDigest()}`);
console.log(`block ${BLOCK}: worlds ${lo}..${hi}, ${worlds.length} worlds, goals ${JSON.stringify(perGoal)}, test cells ${C.CELL_NAMES.join(',')}, trainings ${C.TRAININGS.map(t => t.id).join(',')}${selftest ? ' [SELFTEST: plumbing only]' : ''}`);
console.log(`planned sessions ${counts.total} (${counts.training} training + ${counts.test} test); per cell ${JSON.stringify(counts.byCell)}; per regime ${JSON.stringify(counts.byRegime)}`);
console.log(`tree ${path.basename(tree.dir)} main.js ${tree.manifest.gatefloorinteraction.mainSha256.slice(0, 12)} (base derived ${C.TREE.derivedMainSha256.slice(0, 12)}, bare ${C.TREE.headMainSha256.slice(0, 12)}, audited HEAD ${C.HEAD_COMMIT.slice(0, 7)})`);
if (flag('--plan-json')) fs.writeFileSync(path.resolve(flag('--plan-json')), JSON.stringify({ schema: `${C.SCHEMA}.plan`, block: BLOCK, designDigest: C.designDigest(), worlds, sessions: PLAN, counts }, null, 1));
if (planOnly) process.exit(0);
if (tree.manifest.gatefloorinteraction.mainSha256 !== C.GUARD_TREE.guardMainSha256 || tree.manifest.gatefloorhead.headCommit !== C.HEAD_COMMIT
  || tree.manifest.gatefloorinteraction.admitLineSha256 !== C.GUARD_TREE.admitLineSha256 || tree.manifest.gatefloorinteraction.execLineSha256 !== C.GUARD_TREE.execLineSha256) fail('the guard tree is not the pinned one');

for (const d of ['sessions', 'brains']) fs.mkdirSync(path.join(out, d), { recursive: true });

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
// a session is BAD (retried once, then its world is excluded) if it crashed, or if condition integrity or guard completeness is violated
const bad = (r) => r.code !== 0 || r.rec === null || r.rec.outcome.crashed || !r.rec.outcome.completed
  || !(r.rec.conditionIntegrity && r.rec.conditionIntegrity.ok === true && r.rec.conditionIntegrity.cond === C.CONFIRMATORY_STATE)
  || !(r.rec.guardCompleteness && r.rec.guardCompleteness.ok === true);
async function withRetry(input) { let r = await runSession(input); if (bad(r)) r = { ...(await runSession(input)), retried: true }; return r; }
async function pool(tasks, n, onDone) {
  let next = 0;
  const run = async () => { for (;;) { const i = next++; if (i >= tasks.length) return; onDone(tasks[i], await withRetry(tasks[i].input)); } };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, run));
}

const exclusions = [];
const failedWorlds = new Set();
const trainRecs = {};
const write = (t, r) => {
  if (bad(r)) { failedWorlds.add(t.world); exclusions.push({ world: t.world, label: t.label, reason: 'session failed (or violated condition integrity / guard completeness) after one retry', code: r.code, stderrTail: r.stderrTail.replace(/[A-Za-z]:[\\/][^\s'"]*/g, '<path>') }); return; }
  fs.writeFileSync(path.join(out, 'sessions', `${t.label}.json`), JSON.stringify(r.rec));
  if (r.rec.role === 'train') trainRecs[t.label] = r.rec;
};
const brainFile = (k, w) => path.join(out, 'brains', `${k}_w${w}.json`);
const storeFile = (k, w) => path.join(out, 'brains', `store${k}_w${w}.json`);
const byWorld = Object.fromEntries(worlds.map(w => [w.world, w]));
const inputOf = (p) => {
  const w = byWorld[p.world];
  const base = { label: p.label, tree: tree.dir, world: p.world, configSeed: w.configSeed, configIndex: w.configIndex, floor: p.floor, guard: p.guard, instrument: true, diag: true, cond: C.CONFIRMATORY_STATE };
  if (p.phase === 'train') return { ...base, role: 'train', agentSeed: w.trainSeed, ticks: C.TICKS.train, exportPath: brainFile(p.regime, p.world) };
  return { ...base, role: 'test', agentSeed: w.testSeed, ticks: C.TICKS.test, arm: 'ONLY_episodes', brainPath: storeFile(p.store, p.world), brainWorld: p.world };
};

// Phase 1: training (U guard off, G bundle; cold, floor off)
const trains = PLAN.filter(p => p.phase === 'train').map(p => ({ world: p.world, label: p.label, input: inputOf(p) }));
await pool(trains, workers, write);
console.log(`phase 1: ${trains.length - exclusions.length}/${trains.length} training sessions ok`);

// Phase 1b: stores + construct check + store controls (outcome-free)
const GRAPH = adjacency(JSON.parse(fs.readFileSync(path.join(tree.dir, 'connections.json'), 'utf8')));
const storeProblems = (own) => {
  const p = [], ids = new Set();
  if (!Array.isArray(own)) return ['the exported store is not an array'];
  own.forEach((e, i) => { if (typeof e.id !== 'string' || ids.has(e.id)) p.push(`episode ${i}: id missing or duplicated`); ids.add(e.id); if (!Array.isArray(e.nodes) || e.nodes.length < 2) p.push(`episode ${i}: no node sequence`); });
  return p.slice(0, 5);
};
const controls = {};
const valid = [];
for (const w of worlds) {
  if (failedWorlds.has(w.world)) continue;
  const ctl = {}; let issues = [];
  for (const t of C.TRAININGS) {
    const own = JSON.parse(fs.readFileSync(brainFile(t.id, w.world), 'utf8')).episodes;
    const pr = storeProblems(own); if (pr.length) { issues.push(...pr.map(x => `${t.id}: ${x}`)); continue; }
    const tr = trainRecs[trainLabel(t, w.world)];
    const sd = storeDiagnostics(own, GRAPH, w.goal);
    // the driver's in-session store diagnostic must describe the same exported store
    if (!tr || !tr.store || tr.store.episodes !== sd.episodes || tr.store.pairs !== sd.pairs || tr.store.nonGraphPairs !== sd.nonGraphPairs) { issues.push(`${t.id}: the exported store does not match the training record`); continue; }
    ctl[t.id] = { episodes: own.length, storeHash: componentHashes({ episodes: own }).episodes, diagnostics: sd, attribution: tr.store.attribution, trainingGuard: tr.guardSetting, trainingFloor: tr.floorMode,
      trainingSeed: tr.input.agentSeed, trainingConfig: tr.input.acceptedConfigSeed, trainingLegal: tr.reaches.legal, trainingNonGraph: tr.reaches.nonEdge, trainingIllegalExecutions: tr.guardCompleteness.illegalExecutions,
      trainingRecording: tr.diag ? tr.diag.recording : null };
    fs.writeFileSync(storeFile(t.id, w.world), JSON.stringify({ episodes: own }));
  }
  if (issues.length) { exclusions.push({ world: w.world, reason: 'store construct check failed', issues }); continue; }
  controls[w.world] = ctl;
  valid.push(w);
}
console.log(`phase 1b: ${valid.length}/${worlds.length} worlds pass the store construct check`);

// Phase 2: the four test cells
const tests = PLAN.filter(p => p.phase === 'test' && valid.some(w => w.world === p.world)).map(p => ({ world: p.world, label: p.label, input: inputOf(p) }));
await pool(tests, workers, write);
console.log(`phase 2: ${tests.length} test sessions attempted`);

// ---- manifest ----
const sessions = {};
for (const f of fs.readdirSync(path.join(out, 'sessions')).sort()) sessions[f] = C.sha256(fs.readFileSync(path.join(out, 'sessions', f)));
const excludedWorlds = new Set(exclusions.map(e => e.world));
const planOut = { schema: C.SCHEMA, block: BLOCK, selftest, cells: C.CELL_NAMES, trainings: C.TRAININGS.map(t => t.id), ticks: C.TICKS, worlds, counts, validWorlds: valid.map(w => w.world).filter(w => !excludedWorlds.has(w)), exclusions };
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(planOut, null, 1));
fs.writeFileSync(path.join(out, 'controls.json'), JSON.stringify({ controls }, null, 1));
const manifest = { schema: `${C.SCHEMA}.manifest`, block: BLOCK, selftest, designDigest: C.designDigest(), decisionDigest: C.decisionDigest(),
  tree: { name: path.basename(tree.dir), headCommit: tree.manifest.gatefloorhead.headCommit, headMainSha256: C.TREE.headMainSha256, derivedMainSha256: tree.manifest.gatefloorinteraction.baseDerivedMainSha256,
    guardMainSha256: tree.manifest.gatefloorinteraction.mainSha256, admitLineSha256: tree.manifest.gatefloorinteraction.admitLineSha256, execLineSha256: tree.manifest.gatefloorinteraction.execLineSha256 },
  driverSha256: C.sha256(fs.readFileSync(SESSION)), diagSha256: C.sha256(fs.readFileSync(path.join(HERE, 'diag.mjs'))),
  condition: { state: C.CONFIRMATORY_STATE, hooks: C.HOOK_STATES[C.CONFIRMATORY_STATE] }, classification: C.CLASSIFICATION,
  sessions, planSha256: C.hashObject(planOut), controlsSha256: C.hashObject(controls), exclusions: exclusions.length };
manifest.digest = C.hashObject({ ...manifest });
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest digest ${manifest.digest}; excluded worlds ${excludedWorlds.size}/${worlds.length}`);
if (excludedWorlds.size / worlds.length > C.RULES.maxExcludedFraction) { console.error('block INVALID: excluded fraction exceeds the declared limit'); process.exit(1); }

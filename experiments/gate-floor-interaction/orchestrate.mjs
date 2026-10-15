// ==========================================================
// GATE-FLOOR-INTERACTION — orchestrator (guard tree; hook state P; store x floor x guard factorial)
// ==========================================================
//   node orchestrate.mjs --out <dir> [--workers 6] [--plan-only] [--selftest]
// Phase 1  trains every world (cold, unguarded, floor off, new agent seed) and exports its own store.
// Phase 1b builds the world's REAL store and runs the construct check; a world that fails it is EXCLUDED before any test session.
// Phase 2  runs the eight cells of every valid world on the guard tree (one OS process per session).  A session that fails - or whose
//          condition integrity or guard completeness is violated - gets one deterministic retry; a world with a still-failing
//          session is excluded and listed.  Nothing is dropped for what its outcomes were.
// --plan-only prints the plan and the design digest and exits.  --selftest runs the PLUMBING only (XFER-1 development worlds 0..1,
// directory under the system temp dir); it is never a study block and analyze.mjs refuses it.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extendStream } from '../gate-floor1/stream.mjs';
import { componentHashes } from '../xfer1/brain.mjs';
import { buildGuardTree } from './transform.mjs';
import * as C from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SESSION = path.join(HERE, 'session.mjs');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const fail = (m) => { console.error(`GATE-FLOOR-INTERACTION orchestrate: ${m}`); process.exit(2); };

if (!flag('--out')) fail('--out is required');
const out = path.resolve(flag('--out'));
const workers = Number(flag('--workers') || 6);
const planOnly = argv.includes('--plan-only');
const selftest = argv.includes('--selftest');
if (selftest && !out.startsWith(fs.realpathSync.native(os.tmpdir()))) fail('--selftest writes only under the system temp directory');
const { lo, hi } = selftest ? { lo: 0, hi: 1 } : C.BLOCKS.I;
const BLOCK = selftest ? 'SELFTEST' : 'I';

// ---- plan ----
const tree = buildGuardTree();
const envSha = C.sha256(fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js')));
const cacheFile = path.join(HERE, 'data', `stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_${envSha.slice(0, 12)}.json`);
let stream;
if (fs.existsSync(cacheFile)) stream = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
else {
  const prefixDirs = ['gate-floor-prodsem', 'gate-floor-head', 'gate-floor-b2'].map(d => path.join(ROOT, 'experiments', d, 'data'));   // the longest cached prefix is used
  for (const d of prefixDirs) { try { stream = extendStream(C.CONFIG_START, C.WORLDS_TOTAL, d, envSha); break; } catch (e) { if (d === prefixDirs[prefixDirs.length - 1]) throw e; } }
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(stream));
}
const worlds = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map(w => ({ world: w, block: BLOCK, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex,
  goal: stream[w].goal, rejectedBeforeAcceptance: stream[w].numberOfRejectedCandidatesBeforeAcceptance, trainSeed: C.trainSeed(w), testSeed: C.testSeed(w) }));
for (const w of worlds) if (w.configSeed >= C.HELDOUT_FLOOR) fail(`world ${w.world} lies in held-out territory`);
const perGoal = Object.fromEntries(C.GOALS.map(g => [g, worlds.filter(w => w.goal === g).length]));
if (!selftest && C.GOALS.some(g => perGoal[g] !== C.PER_GOAL)) fail(`goal groups are not balanced: ${JSON.stringify(perGoal)}`);
console.log(`design digest ${C.designDigest()}`);
console.log(`decision digest ${C.decisionDigest()}`);
console.log(`block ${BLOCK}: worlds ${lo}..${hi}, ${worlds.length} worlds, goals ${JSON.stringify(perGoal)}, cells ${C.CELL_NAMES.join(',')}${selftest ? ' [SELFTEST: plumbing only]' : ''}`);
console.log(`planned sessions ${worlds.length * C.SESSIONS_PER_WORLD} (${worlds.length} training + ${worlds.length * C.CELLS.length} test)`);
console.log(`tree ${path.basename(tree.dir)} main.js ${tree.manifest.gatefloorinteraction.mainSha256.slice(0, 12)} (base derived ${C.TREE.derivedMainSha256.slice(0, 12)}, bare ${C.TREE.headMainSha256.slice(0, 12)}, audited HEAD ${C.HEAD_COMMIT.slice(0, 7)})`);
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
const write = (t, r) => {
  if (bad(r)) { failedWorlds.add(t.world); exclusions.push({ world: t.world, label: t.label, reason: 'session failed (or violated condition integrity / guard completeness) after one retry', code: r.code, stderrTail: r.stderrTail.replace(/[A-Za-z]:[\\/][^\s'"]*/g, '<path>') }); return; }
  fs.writeFileSync(path.join(out, 'sessions', `${t.label}.json`), JSON.stringify(r.rec));
};
const brainFile = (w) => path.join(out, 'brains', `w${w}.json`);
const storeFile = (w) => path.join(out, 'brains', `own-real_w${w}.json`);

// Phase 1: training (cold, unguarded, floor off)
const trains = worlds.map(w => ({ world: w.world, label: `gfi-train-w${w.world}`, input: { role: 'train', label: `gfi-train-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed,
  configIndex: w.configIndex, agentSeed: w.trainSeed, ticks: C.TICKS.train, exportPath: brainFile(w.world), floor: 'off', guard: 'off', instrument: true, cond: C.CONFIRMATORY_STATE } }));
await pool(trains, workers, write);
console.log(`phase 1: ${trains.length - failedWorlds.size}/${trains.length} training sessions ok`);

// Phase 1b: REAL store + construct check (outcome-free)
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
  const issues = realProblems(own);
  if (issues.length) { exclusions.push({ world: w.world, reason: 'construct check failed', issues }); continue; }
  controls[w.world] = { realEpisodes: own.length, realStoreHash: componentHashes({ episodes: own }).episodes };
  fs.writeFileSync(storeFile(w.world), JSON.stringify({ episodes: own }));
  valid.push(w);
}
console.log(`phase 1b: ${valid.length}/${worlds.length} worlds pass the construct check`);

// Phase 2: the eight cells
const tests = [];
for (const w of valid) for (const c of C.CELLS) {
  const input = { role: 'test', label: `gfi-${c.name}-w${w.world}`, tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, agentSeed: w.testSeed, ticks: C.TICKS.test,
    arm: c.store === 'COLD' ? 'COLD' : 'ONLY_episodes', floor: c.floor ? 'on' : 'off', guard: c.guard ? 'on' : 'off', instrument: true, cond: C.CONFIRMATORY_STATE };
  if (c.store === 'REAL') { input.brainPath = storeFile(w.world); input.brainWorld = w.world; }
  tests.push({ world: w.world, label: input.label, input });
}
await pool(tests, workers, write);
console.log(`phase 2: ${tests.length} test sessions attempted`);

// ---- manifest ----
const sessions = {};
for (const f of fs.readdirSync(path.join(out, 'sessions')).sort()) sessions[f] = C.sha256(fs.readFileSync(path.join(out, 'sessions', f)));
const excludedWorlds = new Set(exclusions.map(e => e.world));
const planOut = { schema: C.SCHEMA, block: BLOCK, selftest, cells: C.CELL_NAMES, ticks: C.TICKS, worlds, validWorlds: valid.map(w => w.world).filter(w => !excludedWorlds.has(w)), exclusions };
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(planOut, null, 1));
fs.writeFileSync(path.join(out, 'controls.json'), JSON.stringify({ controls }, null, 1));
const manifest = { schema: `${C.SCHEMA}.manifest`, block: BLOCK, selftest, designDigest: C.designDigest(), decisionDigest: C.decisionDigest(),
  tree: { name: path.basename(tree.dir), headCommit: tree.manifest.gatefloorhead.headCommit, headMainSha256: C.TREE.headMainSha256, derivedMainSha256: tree.manifest.gatefloorinteraction.baseDerivedMainSha256,
    guardMainSha256: tree.manifest.gatefloorinteraction.mainSha256, admitLineSha256: tree.manifest.gatefloorinteraction.admitLineSha256, execLineSha256: tree.manifest.gatefloorinteraction.execLineSha256 },
  condition: { state: C.CONFIRMATORY_STATE, hooks: C.HOOK_STATES[C.CONFIRMATORY_STATE] }, classification: C.CLASSIFICATION,
  sessions, planSha256: C.hashObject(planOut), controlsSha256: C.hashObject(controls), exclusions: exclusions.length };
manifest.digest = C.hashObject({ ...manifest });
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest digest ${manifest.digest}; excluded worlds ${excludedWorlds.size}/${worlds.length}`);
if (excludedWorlds.size / worlds.length > C.RULES.maxExcludedFraction) { console.error('block INVALID: excluded fraction exceeds the declared limit'); process.exit(1); }

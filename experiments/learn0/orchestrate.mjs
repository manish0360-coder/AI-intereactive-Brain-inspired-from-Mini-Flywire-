// ==========================================================
// LEARN-0 — orchestrator (LEARN-0 tree; hook state P; T + five test cells per world).  NOT AUTHORISED for block L.
// ==========================================================
//   node orchestrate.mjs --out <dir> [--workers 6] [--plan-only] [--plan-json <file>] [--selftest]
// Phase 1  trains every world once, cold and MAP-OFF, and exports its store.
// Phase 1b construct check and provenance check (I7, provenance.mjs) of the store; a world whose store fails is EXCLUDED before any test session.
// Phase 2  runs the five test cells (N0, N1, N1E, N1Q, O0).  A session that fails - or violates condition integrity or the oracle audit - gets
//          one deterministic retry; a world with a still-failing session is excluded and listed.  Nothing is dropped for what its outcomes were.
// --selftest runs the PLUMBING only on XFER-1 development worlds 0..1 (generated on the fly, nothing cached) in the system temp dir; the
// analysis refuses it.  For block L the accepted-configuration stream is extended to WORLDS_TOTAL first (the freeze milestone does that).
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateAcceptedStream } from '../m7/env.js';
import { extendStream } from '../gate-floor1/stream.mjs';
import { componentHashes } from '../xfer1/brain.mjs';
import { buildLearn0Tree } from './transform.mjs';
import { planSessions, trainLabel } from './plan.mjs';
import { provenance } from './provenance.mjs';
import * as C from './config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SESSION = path.join(HERE, 'session.mjs');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const fail = (m) => { console.error(`LEARN-0 orchestrate: ${m}`); process.exit(2); };
const planOnly = argv.includes('--plan-only'), selftest = argv.includes('--selftest');
if (!flag('--out') && !planOnly) fail('--out is required');
const out = flag('--out') ? path.resolve(flag('--out')) : null;
const workers = Number(flag('--workers') || 6);
if (selftest && !(out && out.startsWith(fs.realpathSync.native(os.tmpdir())))) fail('--selftest writes only under the system temp directory');
const BLOCK = selftest ? 'SELFTEST' : 'L';

// ---- worlds ----
let worlds;
if (selftest) {
  const s = generateAcceptedStream(C.CONFIG_START, 2);
  worlds = [0, 1].map(w => ({ world: w, configSeed: s[w].acceptedSeed, configIndex: s[w].acceptedConfigIndex, goal: s[w].goal }));
} else {
  const envSha = C.sha256(fs.readFileSync(path.join(ROOT, 'experiments', 'm7', 'env.js')));
  const cacheFile = path.join(HERE, 'data', `stream_${C.CONFIG_START}_${C.WORLDS_TOTAL}_${envSha.slice(0, 12)}.json`);
  let stream;
  if (fs.existsSync(cacheFile)) stream = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  else {
    const prefixDirs = ['gate-floor-spec', 'gate-floor-interaction', 'gate-floor-prodsem'].map(d => path.join(ROOT, 'experiments', d, 'data'));
    for (const d of prefixDirs) { try { stream = extendStream(C.CONFIG_START, C.WORLDS_TOTAL, d, envSha); break; } catch (e) { if (d === prefixDirs[prefixDirs.length - 1]) throw e; } }
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(stream));
  }
  worlds = Array.from({ length: C.WORLDS_N }, (_, k) => C.WORLD_START + k).map(w => ({ world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, goal: stream[w].goal }));
  for (const w of worlds) if (w.configSeed >= C.HELDOUT_FLOOR) fail(`world ${w.world} lies in held-out territory`);
  const perGoal = Object.fromEntries(C.GOALS.map(g => [g, worlds.filter(w => w.goal === g).length]));
  if (C.GOALS.some(g => perGoal[g] !== C.PER_GOAL)) fail(`goal groups are not balanced: ${JSON.stringify(perGoal)}`);
}
const PLAN = planSessions(worlds);
const counts = { total: PLAN.length, training: PLAN.filter(p => p.phase === 'train').length, test: PLAN.filter(p => p.phase === 'test').length,
  byCell: Object.fromEntries(C.CELL_NAMES.map(c => [c, PLAN.filter(p => p.cell === c).length])) };
console.log(`design digest ${C.designDigest()}`);
console.log(`decision digest ${C.decisionDigest()}`);
console.log(`block ${BLOCK}: ${worlds.length} worlds; planned sessions ${counts.total} (${counts.training} training + ${counts.test} test); per cell ${JSON.stringify(counts.byCell)}`);
if (flag('--plan-json')) fs.writeFileSync(path.resolve(flag('--plan-json')), JSON.stringify({ schema: `${C.SCHEMA}.plan`, block: BLOCK, designDigest: C.designDigest(), worlds, sessions: PLAN, counts }, null, 1));
if (planOnly) process.exit(0);

const tree = buildLearn0Tree();
if (tree.manifest.learn0.mainSha256 !== C.LEARN0_TREE.mainSha256 || tree.manifest.learn0.planningSha256 !== C.LEARN0_TREE.planningSha256 || tree.manifest.gatefloorhead.headCommit !== C.HEAD_COMMIT) fail('the LEARN-0 tree is not the pinned one');
for (const d of ['sessions', 'brains']) fs.mkdirSync(path.join(out, d), { recursive: true });
// the tree's own graph, for the provenance check only (outcome-free; the agent never reads it)
const ADJ = new Map();
for (const e of JSON.parse(fs.readFileSync(path.join(tree.dir, 'connections.json'), 'utf8'))) for (const [a, b] of [[Number(e.from), Number(e.to)], [Number(e.to), Number(e.from)]]) { if (!ADJ.has(a)) ADJ.set(a, new Set()); ADJ.get(a).add(b); }

function runSession(input) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SESSION, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    child.stdout.on('data', d => { so += d; }); child.stderr.on('data', d => { se += d; });
    child.on('close', (code) => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } resolve({ code, rec, stderrTail: se.slice(-300) }); });
  });
}
const bad = (r) => r.code !== 0 || r.rec === null || r.rec.outcome.crashed || !r.rec.outcome.completed
  || !(r.rec.conditionIntegrity && r.rec.conditionIntegrity.ok === true && r.rec.conditionIntegrity.cond === C.CONFIRMATORY_STATE)
  || !(r.rec.mapAudit && r.rec.mapAudit.ok === true);
async function withRetry(input) { let r = await runSession(input); if (bad(r)) r = { ...(await runSession(input)), retried: true }; return r; }
async function pool(tasks, n, onDone) { let next = 0; const run = async () => { for (;;) { const i = next++; if (i >= tasks.length) return; onDone(tasks[i], await withRetry(tasks[i].input)); } }; await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, run)); }

const exclusions = [], failedWorlds = new Set(), trainRecs = {};
const write = (t, r) => {
  if (bad(r)) { failedWorlds.add(t.world); exclusions.push({ world: t.world, label: t.label, reason: 'session failed (or violated condition integrity / the oracle audit) after one retry', code: r.code, stderrTail: r.stderrTail.replace(/[A-Za-z]:[\\/][^\s'"]*/g, '<path>') }); return; }
  fs.writeFileSync(path.join(out, 'sessions', `${t.label}.json`), JSON.stringify(r.rec));
  if (r.rec.role === 'train') trainRecs[t.world] = r.rec;
};
const byWorld = Object.fromEntries(worlds.map(w => [w.world, w]));
const brainFile = (w) => path.join(out, 'brains', `T_w${w}.json`);
const inputOf = (p) => {
  const w = byWorld[p.world];
  const base = { label: p.label, tree: tree.dir, world: p.world, configSeed: w.configSeed, configIndex: w.configIndex, map: p.map, instrument: true, cond: C.CONFIRMATORY_STATE };
  if (p.phase === 'train') return { ...base, role: 'train', agentSeed: C.trainSeed(p.world), ticks: C.TICKS.train, exportPath: brainFile(p.world), traceDiag: true };   // trace: I7 provenance
  return { ...base, role: 'test', agentSeed: C.testSeed(p.world), ticks: C.TICKS.test, arm: p.arm, ...(p.arm === 'COLD' ? {} : { brainPath: brainFile(p.world), brainWorld: p.world }) };
};

await pool(PLAN.filter(p => p.phase === 'train').map(p => ({ world: p.world, label: p.label, input: inputOf(p) })), workers, write);
// Phase 1b: store construct check + controls (outcome-free)
const controls = {}, valid = [];
for (const w of worlds) {
  if (failedWorlds.has(w.world)) continue;
  const brain = JSON.parse(fs.readFileSync(brainFile(w.world), 'utf8'));
  const issues = [];
  if (!Array.isArray(brain.episodes)) issues.push('the exported store has no episode array');
  for (const c of ['transitions', 'rewards', 'penalties', 'signals', 'curiosity', 'Q', 'confidence']) if (brain[c] === undefined) issues.push(`the exported store has no ${c}`);
  const tr = trainRecs[w.world];
  if (!tr || tr.brain.endHash === undefined) issues.push('no training record');
  const prov = tr && tr.trace ? provenance(brain, tr.trace.arrivals, ADJ, { maxLag: C.PROVENANCE.maxLag }) : null;
  if (!prov) issues.push('no training trace for the provenance check');
  else if (!prov.ok) issues.push(`store provenance (I7): ${prov.offCount} relational entr(ies) off T's own trajectory, e.g. ${prov.offTrajectory.slice(0, 3).join(' ')}`);
  if (issues.length) { exclusions.push({ world: w.world, reason: 'store construct or provenance check failed', issues }); continue; }
  controls[w.world] = { trainLabel: trainLabel(w.world), storeHashes: componentHashes(brain), endHash: tr.brain.endHash, sizes: tr.brain.endSizes, trainingMap: tr.map, trainingLegal: tr.reaches.legal, trainingNonGraph: tr.reaches.nonEdge,
    provenance: { ok: prov.ok, offCount: prov.offCount, maxLag: prov.maxLag, byComponent: prov.byComponent, coverage: prov.coverage } };
  valid.push(w);
}
await pool(PLAN.filter(p => p.phase === 'test' && valid.some(v => v.world === p.world)).map(p => ({ world: p.world, label: p.label, input: inputOf(p) })), workers, write);

const sessions = {};
for (const f of fs.readdirSync(path.join(out, 'sessions')).sort()) sessions[f] = C.sha256(fs.readFileSync(path.join(out, 'sessions', f)));
const excludedWorlds = new Set(exclusions.map(e => e.world));
const planOut = { schema: C.SCHEMA, block: BLOCK, selftest, cells: C.CELL_NAMES, worlds, counts, validWorlds: valid.map(w => w.world).filter(w => !excludedWorlds.has(w)), exclusions };
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(planOut, null, 1));
fs.writeFileSync(path.join(out, 'controls.json'), JSON.stringify({ controls }, null, 1));
const manifest = { schema: `${C.SCHEMA}.manifest`, block: BLOCK, selftest, designDigest: C.designDigest(), decisionDigest: C.decisionDigest(),
  tree: { name: path.basename(tree.dir), headCommit: tree.manifest.gatefloorhead.headCommit, ...tree.manifest.learn0 },
  driverSha256: C.sha256(fs.readFileSync(SESSION)), condition: { state: C.CONFIRMATORY_STATE, hooks: C.HOOK_STATES[C.CONFIRMATORY_STATE] },
  sessions, planSha256: C.hashObject(planOut), controlsSha256: C.hashObject(controls), exclusions: exclusions.length };
manifest.digest = C.hashObject({ ...manifest });
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(`manifest digest ${manifest.digest}; excluded worlds ${excludedWorlds.size}/${worlds.length}`);
if (excludedWorlds.size / worlds.length > C.RULES.maxExcludedFraction) { console.error('block INVALID: excluded fraction exceeds the declared limit'); process.exit(1); }

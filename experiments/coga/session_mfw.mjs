// ==========================================================
// COG-A — one MiniFlyWire session (one OS process per session)
// ==========================================================
//   node --import <file URL of experiments/credit1/clock_preload.mjs> experiments/coga/session_mfw.mjs '<json>'
//   json: { label, tree, world: { stream: 'study'|'sim', index, configSeed }, condition: 'SWAP'|'NOSWAP', clock, kind: 'development'|'confirmatory' }
// The agent: the pinned LEARN-0 tree (map off: all four oracles blocked, executed/blocked accounting), the GATE-FLOOR-INTERACTION
// guard ON (graph-only admission + execution guard), hook state P, the COG-A environment installed as __M7_ENV__, the Variant C
// clock (VIRTUAL, verified below).  The cognitive / visual streams are seeded at boot from (world, 'MFW', 'pre') and re-derived at
// the first step >= T_SHIFT from (world, 'MFW', condition) through the tree's own instrumentation/rng.js (shared-instance check:
// the module this driver imports must report isSeeded() === true at the first step, i.e. boot seeded THIS instance).
// Nothing here reads the agent's internal state to make a decision; the outcome is the environment log.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { config as typedConfig, configSeed as typedConfigSeed } from '../registry/typed_v2.js';
import { LEARN0_TREE, ORACLES } from '../learn0/config.mjs';
import { clockConfigProblems, canonical as clockCanonical, sha256 as sha256b, PRELOAD_SHA256, MARKER, PRELOAD_FILE, isNativeDateNow } from '../credit1/clock.mjs';
import { STEPS, T_SHIFT, MFW_HOOKS, CLOCK, DEV_INDICES, CONFIRMATORY_FROM, SIM_STREAM_START, STUDY_STREAM_START, HELDOUT_FLOOR } from './config.mjs';
import { worldAt } from './worlds.mjs';
import { CogaEnv } from './envsim.mjs';
import { streamSeed, agentStream } from './rngid.mjs';
import { CONFIRMATORY_AUTHORIZATION } from './lock.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`COG-A MFW session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
for (const v of ['H1R_STAGE_AUTHORISED', 'M7_RUN_WARMSTORE', 'M7_RUN_CRASH']) if (process.env[v] !== undefined) refuse(`${v} is set`);
if (process.env.H1R === 'on') refuse('H1R=on');

// ---- input ----
const KEYS = ['label', 'tree', 'world', 'condition', 'clock', 'kind', 'hooks'];
if (!IN || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const u = Object.keys(IN).filter(k => !KEYS.includes(k)); if (u.length) refuse(`unknown input field(s): ${u.join(', ')}`); }
if (!['SWAP', 'NOSWAP'].includes(IN.condition)) refuse(`condition must be SWAP or NOSWAP, got ${IN.condition}`);
if (!['development', 'confirmatory'].includes(IN.kind)) refuse('kind must be development or confirmatory');
// hook configuration: 'P' (DESIGN.md: hook state P + the COG-A environment) or, for DEVELOPMENT only, 'H' = M7's hidden-dynamics
// configuration with the COG-A environment in place of M7's (arm A1, E2 credit on, prediction-error pin on; envMode off because the
// driver installs the environment itself).  The confirmatory configuration is fixed at the freeze.
const HOOKS = { P: MFW_HOOKS, H: Object.freeze({ arm: 'A1', envMode: 'off', creditMode: 'on', pin: 'on' }) };
const hookName = IN.hooks ?? 'P';
if (!(hookName in HOOKS)) refuse(`hooks must be P or H, got ${hookName}`);
if (hookName !== 'P' && IN.kind !== 'development') refuse('hook configuration H is development-only until the freeze');
const W = IN.world;
if (!W || !['study', 'sim'].includes(W.stream) || !Number.isInteger(W.index) || W.index < 0 || !Number.isInteger(W.configSeed)) refuse('world must be { stream, index, configSeed }');

// ---- territory (DESIGN.md §9) ----
if (W.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(W.configSeed)) || typedConfig.isConsumed(typedConfigSeed(W.configSeed))) refuse('configuration seed is held-out or registry-consumed');
if (W.stream === 'sim') { if (IN.kind !== 'development' || W.configSeed < SIM_STREAM_START || W.configSeed >= STUDY_STREAM_START) refuse('a simulation world is development-only and lies in [150000, 200000)'); }
else if (IN.kind === 'development') { if (W.index < DEV_INDICES.lo || W.index > DEV_INDICES.hi) refuse(`development study worlds are indices ${DEV_INDICES.lo}-${DEV_INDICES.hi}`); }
else {
  if (W.index < CONFIRMATORY_FROM) refuse(`confirmatory worlds start at index ${CONFIRMATORY_FROM}`);
  if (!CONFIRMATORY_AUTHORIZATION) refuse('confirmatory sessions are not authorized (lock.mjs CONFIRMATORY_AUTHORIZATION is null)');
  if (!CONFIRMATORY_AUTHORIZATION.indices.includes(W.index)) refuse('this world is not in the frozen confirmatory allocation');
}

// ---- clock (Variant C preload; fail closed) ----
{
  const p = [];
  const preloadPath = path.join(HERE, '..', 'credit1', PRELOAD_FILE), preloadUrl = pathToFileURL(preloadPath).href;
  // the COG-A clock; development sessions may also use t0 = T0B (the A6 t0-invariance check)
  const t0b = { ...CLOCK, t0: 1798761600000 };
  if (clockCanonical(IN.clock) !== clockCanonical(CLOCK) && !(IN.kind === 'development' && clockCanonical(IN.clock) === clockCanonical(t0b))) p.push('the clock configuration is not the COG-A one');
  p.push(...clockConfigProblems(IN.clock));
  if (typeof process.env.NODE_OPTIONS === 'string' && /(^|\s)(--import|--require|-r|--loader|--experimental-loader)(=|\s|$)/.test(process.env.NODE_OPTIONS)) p.push('NODE_OPTIONS carries a preload flag');
  const ea = process.execArgv; if (!(ea.length === 2 && ea[0] === '--import' && ea[1] === preloadUrl)) p.push(`node flags must be exactly --import ${preloadUrl}`);
  if (sha256b(fs.readFileSync(preloadPath)) !== PRELOAD_SHA256) p.push('the preload file is not the pinned one');
  const mk = globalThis[MARKER];
  if (!mk || !Object.isFrozen(mk) || mk.installed !== true) p.push('the clock marker is missing or not frozen');
  else { if (clockCanonical(mk.config) !== clockCanonical(IN.clock)) p.push('installed clock differs from the input'); if (mk.preloadSha256 !== PRELOAD_SHA256) p.push('installed preload hash differs'); if (Date.now !== mk.now || isNativeDateNow(Date.now)) p.push('Date.now is not the installed clock'); }
  if (p.length) refuse(`clock: ${p.join('; ')}`);
}

// ---- the tree ----
if (typeof IN.tree !== 'string' || !fs.existsSync(path.join(IN.tree, 'MANIFEST.json'))) refuse('tree must be a prepared tree directory');
const sha256f = (f) => sha256b(fs.readFileSync(f));
const mainSha = sha256f(path.join(IN.tree, 'main.js')), planningSha = sha256f(path.join(IN.tree, 'render', 'planning.js'));
if (mainSha !== LEARN0_TREE.mainSha256 || planningSha !== LEARN0_TREE.planningSha256) refuse('the tree is not the pinned LEARN-0 tree');
const repoEnvSha = sha256f(path.join(HERE, '..', 'm7', 'env.js')), treeEnvSha = sha256f(path.join(IN.tree, 'experiments', 'm7', 'env.js'));
const lf = (f) => sha256b(Buffer.from(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'), 'utf8'));
if (lf(path.join(HERE, '..', 'm7', 'env.js')) !== lf(path.join(IN.tree, 'experiments', 'm7', 'env.js'))) refuse('the tree env.js differs from the repository env.js');

// ---- the world (accepted at this index, second-stage accepted) ----
const world = worldAt(W.configSeed, W.index, W.stream);
if (!world.accepted) refuse('the world fails second-stage acceptance (no DISTAL state)');

const edges = JSON.parse(fs.readFileSync(path.join(IN.tree, 'connections.json'), 'utf8'));
const ADJ = new Map();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); if (!ADJ.has(a)) ADJ.set(a, new Set()); if (!ADJ.has(b)) ADJ.set(b, new Set()); ADJ.get(a).add(b); ADJ.get(b).add(a); }
const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && !!ADJ.get(Number(a)) && ADJ.get(Number(a)).has(Number(b));

// ---- hooks ----
const T = (rel) => import(URLOF(IN.tree, rel));
const rngMod = await T('instrumentation/rng.js');
const seeds = { pre: streamSeed(agentStream(world.id, 'MFW', 'pre')), post: streamSeed(agentStream(world.id, 'MFW', IN.condition)) };
const rngCheck = { seededBeforeBoot: rngMod.isSeeded(), seededAtFirstStep: null, reseededAt: null };
let calls = 0;
const env = new CogaEnv(world, IN.condition);
globalThis.__M7_TEL__ = {
  step() {
    calls++;
    const step = calls - 1;
    if (step === 0) rngCheck.seededAtFirstStep = rngMod.isSeeded();
    if (step === T_SHIFT) { rngMod.initRng(seeds.post); rngCheck.reseededAt = step; }
  },
  replayBranch() {},
};
globalThis.__M7_ENV__ = { attempt(from, to) { return env.attempt(from, to, calls - 1); } };
const goalResets = [];
globalThis.__GFB2__ = { goalReset(from, to, goal) { goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]); } };
const gcount = { admittedGraph: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };
const GUARD = { on: true, counters: gcount, legalMove: (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b),
  admit(from, k, graph, trained, human) { if (graph) { gcount.admittedGraph++; return true; } if (trained && human) gcount.nonGraphBoth++; else if (trained) gcount.nonGraphTrained++; else if (human) gcount.nonGraphHuman++; else return true; gcount.maskedOut++; return false; } };
globalThis.__GFGUARD__ = GUARD;
const oracle = { executed: Object.fromEntries(ORACLES.map(o => [o, 0])), blocked: Object.fromEntries(ORACLES.map(o => [o, 0])) };
globalThis.__LEARN0__ = { noMap: true, blocks(name) { if (!(name in oracle.blocked)) throw new Error(`unknown oracle ${name}`); oracle.blocked[name]++; return true; } };

// ---- run ----
process.chdir(path.join(IN.tree, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(IN.tree, 'experiments/m7/run.js'));
const t0 = process.hrtime.bigint();
const rec = await runOnce({ configSeed: W.configSeed, configIndex: W.index, agentSeed: seeds.pre, ...HOOKS[hookName], tickUnit: 'step', ticks: STEPS, crashAtTick: null, warmStore: false });
const wallMs = Number((process.hrtime.bigint() - t0) / 1000000n);
const mk = globalThis[MARKER];
const out = {
  schema: 'coga/1.session.mfw', label: IN.label, kind: IN.kind, agent: 'MFW', condition: IN.condition, hooks: { name: hookName, ...HOOKS[hookName] },
  world: { id: world.id, stream: world.stream, index: world.index, configSeed: world.configSeed, goal: world.goal, distal: world.distal.map(d => d.s), stable: world.stable.map(d => d.s) },
  rng: { prng: 'mulberry32', preSeed: seeds.pre, postSeed: seeds.post, ...rngCheck },
  provenance: { mainSha256: mainSha, planningSha256: planningSha, envSha256: repoEnvSha, treeEnvSha256: treeEnvSha, preloadSha256: PRELOAD_SHA256, fingerprint: rec.fingerprint ?? null },
  outcome: { crashed: !!rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, calls, error: rec.outcome.error ? String(rec.outcome.error.message).slice(0, 300) : null },
  env: { refused: env.refused, self: env.self, attempts: env.log.length },
  mapAudit: { ...oracle, ok: Object.values(oracle.executed).every(v => v === 0) && ORACLES.every(o => oracle.blocked[o] > 0) },
  guard: { ...gcount },
  clock: { config: mk.config, observed: mk.observed() },
  goalResets, wallMs, log: env.log,
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

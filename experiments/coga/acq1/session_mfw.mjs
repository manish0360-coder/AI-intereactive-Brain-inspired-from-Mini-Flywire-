// ==========================================================
// ACQ-1 — one MiniFlyWire session in a static reliability environment (one OS process per session)
// ==========================================================
//   node --import <file URL of experiments/credit1/clock_preload.mjs> experiments/coga/acq1/session_mfw.mjs '<json>'
//   json: { label, tree, world: { stream, index, configSeed }, env: 'E1'|'E2', clock, kind: 'development'|'confirmatory', variant, steps }
// A fork of ../session_mfw.mjs (the propagation driver, unchanged): the environment is static (ACQ-1 AcqEnv), there is no shift and
// no re-seed: the agent's streams are seeded at boot from (world, agent, env).
// variant 'P'  the study's agent: pinned LEARN-0 tree, map off, guard ON, hook state P (DESIGN.md).
// variant 'H'  development diagnostic: M7 hook state H (arm A1, E2 credit on, prediction-error pin on).
// variant 'A'  development diagnostic: pinned CREDIT-1 tree A with __CREDIT1__ = { aligned: true }, hook state P.
// Only variant 'P' can be confirmatory until lock.mjs says otherwise.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { config as typedConfig, configSeed as typedConfigSeed } from '../../registry/typed_v2.js';
import { LEARN0_TREE, ORACLES } from '../../learn0/config.mjs';
import { clockConfigProblems, canonical as clockCanonical, sha256 as sha256b, PRELOAD_SHA256, MARKER, PRELOAD_FILE, isNativeDateNow } from '../../credit1/clock.mjs';
import { CREDIT1_TREE } from '../../credit1/config.mjs';
import { MFW_HOOKS, CLOCK, SIM_STREAM_START, STUDY_STREAM_START, HELDOUT_FLOOR, DEV_INDICES } from '../config.mjs';
import { streamSeed, agentStream } from '../rngid.mjs';
import { describeAcq } from './states.mjs';
import { AcqEnv } from './env.mjs';
import { ACQ_AUTHORIZATION } from './lock.mjs';
import * as M7ENV from '../../m7/env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`ACQ-1 MFW session refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
for (const v of ['H1R_STAGE_AUTHORISED', 'M7_RUN_WARMSTORE', 'M7_RUN_CRASH']) if (process.env[v] !== undefined) refuse(`${v} is set`);
if (process.env.H1R === 'on') refuse('H1R=on');

const KEYS = ['label', 'tree', 'world', 'env', 'clock', 'kind', 'variant', 'steps'];
if (!IN || typeof IN !== 'object' || Array.isArray(IN)) refuse('the input must be a JSON object');
{ const u = Object.keys(IN).filter(k => !KEYS.includes(k)); if (u.length) refuse(`unknown input field(s): ${u.join(', ')}`); }
if (!['E1', 'E2'].includes(IN.env)) refuse(`env must be E1 or E2, got ${IN.env}`);
if (!['development', 'confirmatory'].includes(IN.kind)) refuse('kind must be development or confirmatory');
if (!Number.isInteger(IN.steps) || IN.steps < 1) refuse('steps must be a positive integer');
const VARIANTS = { P: { hooks: MFW_HOOKS, credit: null }, H: { hooks: Object.freeze({ arm: 'A1', envMode: 'off', creditMode: 'on', pin: 'on' }), credit: null }, A: { hooks: MFW_HOOKS, credit: { aligned: true } } };
if (!(IN.variant in VARIANTS)) refuse(`variant must be P, H or A, got ${IN.variant}`);
const W = IN.world;
if (!W || !['study', 'sim'].includes(W.stream) || !Number.isInteger(W.index) || W.index < 0 || !Number.isInteger(W.configSeed)) refuse('world must be { stream, index, configSeed }');

// ---- territory ----
if (W.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(W.configSeed)) || typedConfig.isConsumed(typedConfigSeed(W.configSeed))) refuse('configuration seed is held-out or registry-consumed');
if (IN.kind === 'development') {
  if (W.stream === 'sim') { if (W.configSeed < SIM_STREAM_START || W.configSeed >= STUDY_STREAM_START) refuse('a simulation world lies in [150000, 200000)'); }
  else if (W.index < DEV_INDICES.lo || W.index > DEV_INDICES.hi) refuse(`development study worlds are indices ${DEV_INDICES.lo}-${DEV_INDICES.hi}`);
} else {
  if (!ACQ_AUTHORIZATION) refuse('confirmatory sessions are not authorized (lock.mjs ACQ_AUTHORIZATION is null)');
  if (W.stream !== 'study' || !ACQ_AUTHORIZATION.allocation.some(a => a.index === W.index && a.configSeed === W.configSeed)) refuse('this world is not in the frozen allocation');
  if (IN.steps !== ACQ_AUTHORIZATION.steps) refuse('steps differ from the frozen protocol');
  if (!ACQ_AUTHORIZATION.variants.includes(IN.variant)) refuse(`variant ${IN.variant} is not in the frozen protocol`);
}

// ---- clock (Variant C preload; fail closed) ----
{
  const p = [];
  const preloadPath = path.join(HERE, '..', '..', 'credit1', PRELOAD_FILE), preloadUrl = pathToFileURL(preloadPath).href;
  if (clockCanonical(IN.clock) !== clockCanonical(CLOCK)) p.push('the clock configuration is not the COG-A one');
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
const expectMain = IN.variant === 'A' ? CREDIT1_TREE.A.mainSha256 : LEARN0_TREE.mainSha256;
if (mainSha !== expectMain || planningSha !== LEARN0_TREE.planningSha256) refuse(`the tree is not the pinned tree of variant ${IN.variant}`);

// ---- the world ----
const gen = M7ENV.generateAccepted(W.configSeed, W.index);
if (gen.provenance.acceptedSeed !== W.configSeed || gen.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) refuse('the seed is not accepted at this index');
const world = describeAcq({ cfg: gen.cfg, acceptedSeed: W.configSeed, configIndex: W.index, stream: W.stream });
if (!world.sw.length) refuse('the world has no SWITCH state');

const edges = JSON.parse(fs.readFileSync(path.join(IN.tree, 'connections.json'), 'utf8'));
const ADJ = new Map();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); if (!ADJ.has(a)) ADJ.set(a, new Set()); if (!ADJ.has(b)) ADJ.set(b, new Set()); ADJ.get(a).add(b); ADJ.get(b).add(a); }
const isEdge = (a, b) => a != null && b != null && Number(a) !== Number(b) && !!ADJ.get(Number(a)) && ADJ.get(Number(a)).has(Number(b));

// ---- hooks ----
const T = (rel) => import(URLOF(IN.tree, rel));
const rngMod = await T('instrumentation/rng.js');
const agentId = `MFW-${IN.variant}`;
const seed = streamSeed(agentStream(world.id, agentId, IN.env));
const rngCheck = { seededBeforeBoot: rngMod.isSeeded(), seededAtFirstStep: null };
let calls = 0;
const env = new AcqEnv(world, IN.env);
globalThis.__M7_TEL__ = { step() { calls++; if (calls === 1) rngCheck.seededAtFirstStep = rngMod.isSeeded(); }, replayBranch() {} };
globalThis.__M7_ENV__ = { attempt(from, to) { return env.attempt(from, to, calls - 1); } };
const goalResets = [];
globalThis.__GFB2__ = { goalReset(from, to, goal) { goalResets.push([calls - 1, Number(from), isEdge(from, to) && Number(to) === Number(goal) ? 1 : 0]); } };
const gcount = { admittedGraph: 0, nonGraphTrained: 0, nonGraphHuman: 0, nonGraphBoth: 0, maskedOut: 0, blockedIllegal: 0 };
const GUARD = { on: true, counters: gcount, legalMove: (a, b) => (a != null && b != null && Number(a) === Number(b)) || isEdge(a, b),
  admit(from, k, graph, trained, human) { if (graph) { gcount.admittedGraph++; return true; } if (trained && human) gcount.nonGraphBoth++; else if (trained) gcount.nonGraphTrained++; else if (human) gcount.nonGraphHuman++; else return true; gcount.maskedOut++; return false; } };
globalThis.__GFGUARD__ = GUARD;
const oracle = { executed: Object.fromEntries(ORACLES.map(o => [o, 0])), blocked: Object.fromEntries(ORACLES.map(o => [o, 0])) };
globalThis.__LEARN0__ = { noMap: true, blocks(name) { if (!(name in oracle.blocked)) throw new Error(`unknown oracle ${name}`); oracle.blocked[name]++; return true; } };
if (VARIANTS[IN.variant].credit) globalThis.__CREDIT1__ = { ...VARIANTS[IN.variant].credit };

// ---- run ----
process.chdir(path.join(IN.tree, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(IN.tree, 'experiments/m7/run.js'));
const t0 = process.hrtime.bigint();
const rec = await runOnce({ configSeed: W.configSeed, configIndex: W.index, agentSeed: seed, ...VARIANTS[IN.variant].hooks, tickUnit: 'step', ticks: IN.steps, crashAtTick: null, warmStore: false });
const wallMs = Number((process.hrtime.bigint() - t0) / 1000000n);
const mk = globalThis[MARKER];
const out = {
  schema: 'coga/acq1.session.mfw', label: IN.label, kind: IN.kind, agent: agentId, variant: IN.variant, env: IN.env, steps: IN.steps,
  world: { id: world.id, stream: world.stream, index: world.index, configSeed: world.configSeed, goal: world.goal, switchStates: world.sw.length },
  rng: { prng: 'mulberry32', seed, identity: agentStream(world.id, agentId, IN.env), ...rngCheck },
  provenance: { mainSha256: mainSha, planningSha256: planningSha, preloadSha256: PRELOAD_SHA256, fingerprint: rec.fingerprint ?? null },
  outcome: { crashed: !!rec.outcome.crashed, completed: rec.outcome.completed, ticksExecuted: rec.outcome.ticksExecuted, calls, error: rec.outcome.error ? String(rec.outcome.error.message).slice(0, 300) : null },
  envCounters: { refused: env.refused, self: env.self, attempts: env.log.length },
  mapAudit: { ...oracle, ok: Object.values(oracle.executed).every(v => v === 0) && ORACLES.every(o => oracle.blocked[o] > 0) },
  guard: { ...gcount },
  clock: { config: mk.config, loopFires: mk.observed().loopFires, violations: mk.observed().violations.length },
  goalResets, wallMs, log: env.log,
};
process.stdout.write('\n@@RESULT@@' + JSON.stringify(out) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

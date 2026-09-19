// ==========================================================
// M40 GATE — FutureScore temporal-snapshot FORMULATION
// ==========================================================
// PASS 2: every source fact, arithmetic claim and M39-P1 number the memo relies on is re-derived here.
// Nothing is implemented, no agent is run and no configuration seed is evaluated.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO_PATH = path.join(ROOT, 'research/preregistrations/M40_FUTURESCORE_TEMPORAL_FORMULATION.md');
const BASE = '6cbd363ed47d33c25e5b2d574bf078bd04480295';          // M39-P1 RED record
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const lineOf = (f, n) => read(f).split('\n')[n - 1] || '';

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
console.log('='.repeat(78)); console.log('  M40 GATE — temporal-snapshot formulation'); console.log('='.repeat(78));

const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);

// ---- T: source facts ---------------------------------------------------------------------------------
section('T  source facts T1–T9');
const RUN = read('experiments/m7/run.js');
const tickUses = RUN.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /input\.ticks\b/.test(l)).map(([n]) => n);
ok('T1', JSON.stringify(tickUses) === '[115,315,340]' && /const loops = Math\.ceil\(input\.ticks \/ ticksPerLoop\);/.test(lineOf('experiments/m7/run.js', 115)) &&
  /ticksRequested: input\.ticks/.test(lineOf('experiments/m7/run.js', 315)) && /completed: .*ticksExecuted >= input\.ticks/.test(lineOf('experiments/m7/run.js', 340)) &&
  /const stepsPerLoop = 5;/.test(RUN) && /const ticksPerLoop = input\.tickUnit === 'loop' \? 1 : stepsPerLoop;/.test(RUN),
  'T1 input.ticks is used only for the loop count (run.js:115) and two records (:315 ticksRequested, :340 completed); 5 ticks per loop');
ok('T2', /env\.setTick\(ticksExecuted\);/.test(lineOf('experiments/m7/run.js', 251)) && env.T_SHIFT === 1500 &&
  /export function setTick\(t\) \{ PHASE = \(t >= T_SHIFT\) \? 2 : 1; return PHASE; \}/.test(read('experiments/m7/env.js')),
  'T2 setTick(ticksExecuted) at each loop start; PHASE = t >= 1500 ? 2 : 1');
const lastSetTick = (T) => (Math.ceil(T / 5) - 1) * 5;
ok('T3', lastSetTick(1500) === 1495 && env.setTick(1495) === 1 && env.setTick(1500) === 2,
  'T3 a 1500-tick run: 300 loops, last setTick(1495) → phase 1 throughout; setTick(1500) would be phase 2');
env.setTick(0);
const RNG = read('instrumentation/rng.js');
const init = RNG.slice(RNG.indexOf('export function initRng('), RNG.indexOf('}', RNG.indexOf('streams.set("environment"')));
ok('T4', ['cognitive', 'visual', 'environment'].every(s => init.includes(`streams.set("${s}"`)),
  'T4 initRng replaces the cognitive, visual and environment streams: a run continued after a readout would diverge');
const MAIN = read('main.js');
const decay = MAIN.split('\n').slice(3231, 3250).join('\n');
ok('T5', /hard cap at 8/.test(lineOf('main.js', 4505)) && /rewards\.set\(key, Math\.min\(\(rewards\.get\(key\) \|\| 0\) \+ scaledReward, 8\)\);/.test(lineOf('main.js', 4658)) &&
  /rewards\.set\(key, Math\.min\(currentReward \* 1\.0002, 8\)\);/.test(lineOf('render/longTermConsolidation.js', 112)) &&
  /if \(liveRng\(\) < 0\.02\)/.test(decay) && /value \* 0\.9995/.test(decay),
  'T5 rewards capped at 8 (main.js:4505, :4658; consolidation:112); decay ×0.9995 only when liveRng() < 0.02');
const PL = read('render/planning.js');
ok('T6', /depth = 3/.test(lineOf('render/planning.js', 182)) && /reward \* 1\.5 -/.test(lineOf('render/planning.js', 298)) &&
  /penalty \* 2 \+/.test(lineOf('render/planning.js', 300)) && /curiosity \* 0\.4 \+/.test(lineOf('render/planning.js', 302)) &&
  /future \* 0\.8;/.test(lineOf('render/planning.js', 304)) && /best = deeper \* 0\.9;/.test(lineOf('render/planning.js', 329)) &&
  /Math\.min\(imaginedFuture \* 4, 20\);/.test(lineOf('main.js', 1874)) && /neuron\.userData\.id,/.test(PL),
  'T6 futureScore = max over depth-3 paths of reward·1.5 − penalty·2 + curiosity·0.4 + lookAhead·0.8 (deeper·0.9); futureBonus = min(4·FS, 20)');
ok('T7', /sys\.trainEmbedding\(pair\.from, pair\.to\);/.test(lineOf('render/episodeManager.js', 1044)),
  'T7 embeddings are trained during the run from episode pairs (episodeManager.js:1044)');
const { gates } = await import(pathToFileURL(path.join(ROOT, 'experiments/m39/analyze.js')).href);
const EVD = path.join(ROOT, 'experiments/m39/evidence');
const pairs = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]].map(([s, i]) =>
  ['a', 'b'].map(r => JSON.parse(fs.readFileSync(path.join(EVD, `${s}_${i}_${r}.json`), 'utf8'))));
const g = gates(pairs);
ok('T8', g.degeneracy.poolCands === 466 && g.degeneracy.atCap === 466 && g.e2.D === 0 && g.e2.nPlus === 0 && g.e2.nMinus === 0 &&
  g.degeneracy.controllable === 23 && g.degeneracy.attainableStates === 74,
  'T8 M39-P1 evidence: 466/466 at cap, D = 0, n± = 0, ORACLE-INJECTED 23/74 — recomputed');
ok('T9', /call 0 and decision 4/.test(read('experiments/d2/D2_EVIDENCE_LINEAGE.md')),
  'T9 D2 recorded the first differing move at decision 4 (Phase 1.0 driver)');

// ---- A: arithmetic and design constants -------------------------------------------------------------------
section('A  arithmetic, grid and regime rule');
const adj = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, []]));
for (const e of JSON.parse(read('connections.json'))) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); }
const ecc = [...adj.keys()].map(s => { const d = new Map([[s, 0]]), q = [s]; while (q.length) { const x = q.shift(); for (const y of adj.get(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } return Math.max(...d.values()); });
ok('A1', 3.34 * 1.5 >= 5 && 3.3 * 1.5 < 5 && Math.max(...ecc) === 4 && 5 * 4 === 20,
  'A1 a reward of about 3.3 contributes 5 (4·5 = 20, the cap); base graph diameter 4');
const G = [250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000];
ok('A2', G.every((t, i) => t === 250 * (i + 1)) && G.includes(1500) && G.includes(3000) && G.reduce((a, b) => a + b, 0) === 19500 &&
  4 * 19500 === 78000 && 78000 / 3000 === 26 && 4 * G.length === 48,
  'A2 G = 12 evenly spaced ticks incl. 1500 and 3000; 4 × 19,500 = 78,000 ticks = 26 M39-length runs; 48 runs per replicate');
const regime = (T) => env.setTick(lastSetTick(T));
ok('A3', G.every(T => regime(T) === (T <= 1500 ? 1 : 2)),
  'A3 regime in force at each grid tick, from the source rule: phase 1 for T ≤ 1500, phase 2 for T > 1500');
env.setTick(0);

// ---- R: M40-R1 gate specification (m40_spec.js), synthetic records only — no run, no seed ------------------------
section('R  M40-R1: prefix equivalence, diagnostic purity, oracle phase');
const SPEC_PATH = path.join(ROOT, 'research/preregistrations/m40_spec.js');
const { oracleSet } = await import(pathToFileURL(path.join(ROOT, 'experiments/m39/analyze.js')).href);
const { makeRng } = await import(pathToFileURL(path.join(ROOT, 'instrumentation/rng.js')).href);

// source-derived facts the spec must match (computed once, independent of the spec)
const MAIN_LINES = MAIN.split('\n');
const depthAt = [];
{
  let dd = 0, inBlock = false;
  for (const line of MAIN_LINES) {
    depthAt.push(dd);
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (inBlock) { if (ch === '*' && line[c + 1] === '/') { inBlock = false; c++; } continue; }
      if (ch === '/' && line[c + 1] === '*') { inBlock = true; c++; continue; }
      if (ch === '/' && line[c + 1] === '/') break;
      if (ch === '"' || ch === "'" || ch === '`') { const q = ch; c++; while (c < line.length && line[c] !== q) { if (line[c] === '\\') c++; c++; } continue; }
      if (ch === '{') dd++; else if (ch === '}') dd--;
    }
  }
}
const topDecl = [];
MAIN_LINES.forEach((l, i) => { const m = l.match(/^\s*(?:const|let|var) ([A-Za-z_$][\w$]*)\s*=/); if (m && depthAt[i] === 0) topDecl.push([m[1], i + 1]); });
const rpStart = MAIN.indexOf('function runPrediction(startKey)');
let rpEnd; { let dd = 0; for (let k = MAIN.indexOf('{', rpStart); k < MAIN.length; k++) { if (MAIN[k] === '{') dd++; else if (MAIN[k] === '}') { dd--; if (!dd) { rpEnd = k; break; } } } }
const rpBody = MAIN.slice(rpStart, rpEnd).replace(/\/\/.*$/gm, '');
const rpLocal = new Set([...rpBody.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
const READ_BY_RP = topDecl.filter(([n]) => !rpLocal.has(n) && new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(rpBody));
const SENTINEL = 424242;
const RNG_SRC = read('instrumentation/rng.js');

// a synthetic topology-level configuration with DIFFERENT phase reliabilities (no seed: a local LCG)
const lcg = (seed) => { let x = BigInt(seed); return () => { x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n); return Number(x >> 11n) / 2 ** 53; }; };
const rr = lcg(4040);
const synthCfg = { pPhase1: Array.from({ length: 39 }, () => 0.25 + 0.75 * rr()), pPhase2: Array.from({ length: 39 }, () => 0.25 + 0.75 * rr()) };
let phaseDiffers = 0;
for (const gl of env.GOALS) for (const u of env.decisionStates(gl)) {
  if (JSON.stringify(oracleSet(u, gl, synthCfg.pPhase1, env)) !== JSON.stringify(oracleSet(u, gl, synthCfg.pPhase2, env))) phaseDiffers++;
}

// synthetic records
const clone = (o) => JSON.parse(JSON.stringify(o));
function synthReadouts() {
  return { 1: { poolKeys: [2, 4], poolWeights: [10.5, 3.25], futureBonusValues: [12, 20], bestChoiceON: 2 },
           3: { poolKeys: [2, 6], poolWeights: [7.5, 8.0], futureBonusValues: [20, 9], bestChoiceON: 6 } };
}
function synthRecord(S, ticksRequested) {
  const digest = {};
  for (const c of S.STATE_COMPONENTS) if (c.cls === 'direct' || c.cls === 'exposed') digest[c.id] = 'h-' + c.id;
  return { ticksRequested, capturedAt: 1500, digest, rng: { cognitive: 1001, visual: 1002, environment: 1003 }, readouts: synthReadouts() };
}
function synthPurity(S) {
  const digest = {};
  for (const c of S.STATE_COMPONENTS) if (c.cls === 'direct' || c.cls === 'exposed') digest[c.id] = 'h-' + c.id;
  const seeds = S.streamSeeds(SENTINEL);
  const first = Object.fromEntries(Object.entries(seeds).map(([k, s]) => [k, makeRng(s)()]));
  return { digestBefore: clone(digest), digestAfter: clone(digest), rngExpected: first, rngAfterDiagnostic: clone(first),
           readoutsBefore: synthReadouts(), readoutsRepeat: synthReadouts(), readoutsAfter: synthReadouts() };
}

function specChecks(S) {
  const rows = [];
  const ok2 = (id, cond, msg) => rows.push({ id, ok: !!cond, msg });
  // locked decisions
  ok2('R1', S.T_A === 1500 && S.T_SHIFT === env.T_SHIFT && JSON.stringify(S.GRID) === JSON.stringify(G) && S.TICKS_PER_LOOP === 5,
    'locked: T_A = 1500, T_SHIFT = env.T_SHIFT, grid G, 5 ticks per loop');
  ok2('R2', S.GRID.every(T => S.regimeAt(T) === env.setTick(S.lastSetTick(T))) && S.regimeAt(S.T_A) === 1 && env.setTick(0) === 1,
    'regime rule equals env.js setTick at every grid tick; regime at T_A = phase 1');
  // Repair 3: the oracle binding at T_A is phase 1, and the phase choice is observable
  ok2('R3', S.oracleReliability(synthCfg, S.T_A) === synthCfg.pPhase1 && S.oracleReliability(synthCfg, 3000) === synthCfg.pPhase2 && phaseDiffers > 0,
    `ORACLE PHASE: T_A binds pPhase1 (and 3000 binds pPhase2); on a synthetic two-phase reliability the oracle set differs between phases at ${phaseDiffers} (state, goal) pairs, so a phase mismatch is observable`);
  // Repair 1 completeness: every required class, every main.js top-level binding runPrediction reads, sources real
  const covers = new Set(S.STATE_COMPONENTS.map(c => c.covers));
  const ids = new Set(S.STATE_COMPONENTS.map(c => c.id));
  const readCovered = READ_BY_RP.every(([n]) => ids.has(n) || (n === 'neuronMap' && ids.has('embeddings') && ids.has('neighbors')));
  const exposedOk = S.STATE_COMPONENTS.filter(c => c.cls === 'exposed').every(c => {
    const m = c.source.match(/^main\.js:(\d+) (?:const|let) (\w+)$/);
    return m && m[2] === c.id && new RegExp(`^(?:const|let) ${c.id}\\s*=`).test(MAIN_LINES[Number(m[1]) - 1]) && depthAt[Number(m[1]) - 1] === 0;
  });
  ok2('R4', S.REQUIRED_CLASSES.every(k => covers.has(k)) && readCovered && exposedOk && S.STATE_COMPONENTS.some(c => c.cls === 'behavioral') &&
    S.STATE_COMPONENTS.some(c => c.id === 'rngPositions' && c.cls === 'probe'),
    `declared state covers all ${S.REQUIRED_CLASSES.length} required classes and all ${READ_BY_RP.length} main.js top-level bindings runPrediction reads ` +
    `(${READ_BY_RP.map(([n]) => n).join(', ')}); every exposed binding is at its stated top-level line`);
  ok2('R5', ['cognitive', 'visual', 'environment'].every(s => RNG_SRC.includes(`streams.set("${s}"`)) && /\(seed \^ 0x9e3779b9\) >>> 0/.test(RNG_SRC) &&
    /\(seed \^ 0x5EED\) >>> 0/.test(RNG_SRC) && JSON.stringify(S.streamSeeds(SENTINEL)) === JSON.stringify({ cognitive: SENTINEL, visual: (SENTINEL ^ 0x9e3779b9) >>> 0, environment: (SENTINEL ^ 0x5EED) >>> 0 }) &&
    S.RNG_STREAMS.length === 3,
    'RNG: initRng reseeds all three streams (readout-irrelevant); the sentinel seeds match rng.js exactly');
  ok2('R6', RUN.split('\n').filter(l => l.replace(/\s+$/, '') === '      env.setTick(ticksExecuted);').length === 1 &&
    /for \(let l = 0; l < loops; l\+\+\) \{/.test(RUN),
    'B capture is feasible: exactly one loop-head anchor "env.setTick(ticksExecuted);" in run.js for an in-memory guarded capture at ticksExecuted = 1500');
  // Repair 1: the prefix gate passes identical records and catches every single declared mismatch
  const A = synthRecord(S, 1500), B = synthRecord(S, 3000);
  B.final = { digest: Object.fromEntries(Object.keys(B.digest).map(k => [k, 'later-' + k])) };   // B's own end state differs: irrelevant
  const pe = S.prefixEquivalent(A, B);
  let caught = 0, trials = 0;
  const tryB = (mut) => { const b = clone(B); mut(b); trials++; if (!S.prefixEquivalent(A, b).pass) caught++; };
  for (const id of Object.keys(A.digest)) tryB(b => { b.digest[id] = 'DIFF'; });
  for (const s of ['cognitive', 'visual', 'environment']) tryB(b => { b.rng[s] += 1; });
  for (const u of Object.keys(A.readouts)) for (const f of ['poolKeys', 'poolWeights', 'futureBonusValues', 'bestChoiceON'])
    tryB(b => { b.readouts[u][f] = f === 'bestChoiceON' ? -1 : [...b.readouts[u][f], 0]; });
  tryB(b => { b.capturedAt = 1495; });
  tryB(b => { b.ticksRequested = 1500; });
  tryB(b => { delete b.readouts[3]; });
  const aBad = clone(A); aBad.ticksRequested = 3000; trials++; if (!S.prefixEquivalent(aBad, B).pass) caught++;
  ok2('R7', pe.pass && caught === trials && Object.keys(A.digest).length >= 20,
    `PREFIX: identical A(1500) / B(3000 captured at 1500) records pass (B's later end state ignored); ${caught}/${trials} single deliberate mismatches caught`);
  // Repair 2: the purity gate passes a clean record and catches every hidden mutation class
  const P0 = synthPurity(S), p0 = S.purityHolds(P0);
  let pc = 0, pt = 0;
  const tryP = (mut) => { const r = clone(P0); mut(r); pt++; if (!S.purityHolds(r).pass) pc++; };
  for (const id of Object.keys(P0.digestBefore)) tryP(r => { r.digestAfter[id] = 'MUTATED'; });
  for (const s of ['cognitive', 'visual', 'environment']) tryP(r => { const g2 = makeRng(S.streamSeeds(SENTINEL)[s]); g2(); r.rngAfterDiagnostic[s] = g2(); });   // the diagnostic consumed one draw
  tryP(r => { r.readoutsAfter[1].poolWeights[0] += 1e-9; });
  tryP(r => { r.readoutsRepeat[3].bestChoiceON = 2; });
  tryP(r => { r.readoutsBefore = {}; r.readoutsRepeat = {}; r.readoutsAfter = {}; });
  ok2('R8', p0.pass && pc === pt,
    `PURITY: a clean record passes; ${pc}/${pt} hidden mutations caught (every digest component, every RNG stream, readout change, failed idempotence control, missing readouts)`);
  // stage-1 go/no-go stays outcome-blind
  const g1 = S.goNoGo([{ poolValues: [20, 20] }, { poolValues: [20, 19] }]), g0 = S.goNoGo([{ poolValues: [20, 20] }, { poolValues: [20] }]);
  const gLeak = S.goNoGo([{ poolValues: [20, 20], oracleAligned: true, zeroBest: 2, nPlus: 5 }]);
  const goSrc = fs.readFileSync(SPEC_PATH_OF(S), 'utf8'); const goBody = goSrc.slice(goSrc.indexOf('export function goNoGo'));
  ok2('R9', g1.go && g1.rankable === 1 && !g0.go && !gLeak.go && !/oracle|zero|nPlus|nMinus|bestChoice|aligned/i.test(goBody),
    'go/no-go: GO iff some T_A pool holds two distinct values; outcome fields cannot change it; its source names no outcome quantity');

  // ---- M40-R2: a synthetic world whose readouts write lastDecision, as runPrediction does (main.js:2410) ----
  const world = (clockBase) => ({
    lastDecision: { current: 0 },
    rewards: new Map([['1->2', 3]]),
    episodes: [{ id: `live_${clockBase + 123}_ab12c`, timestamp: clockBase + 123, nodes: [1, 2, 3], labels: ['a', 'b'], coherence: 0.5 },
               { id: `replay_${clockBase + 900}_k3z9q`, timestamp: clockBase + 900, nodes: [2, 3], labels: ['b', 'c'], coherence: 0.7 }],
    timeMemory: new Map([['1->2', clockBase + 456], ['2->3', clockBase + 789]]),
    streams: new Map(),
  });
  const canonV = (v) => v instanceof Map ? [...v.entries()].map(([k, x]) => [String(k), canonV(x)]).sort((a, b) => a[0] < b[0] ? -1 : 1)
    : Array.isArray(v) ? v.map(canonV) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonV(v[k])])) : v;
  const worldDigest = (w, project) => {
    const d = {};
    for (const c of S.STATE_COMPONENTS) if (c.cls === 'direct' || c.cls === 'exposed') d[c.id] = 'const-' + c.id;
    for (const id of ['lastDecision', 'rewards', 'episodes', 'timeMemory']) {
      const v = project ? S.projectForPE(id, w[id]) : w[id];
      d[id] = JSON.stringify(canonV(v));
    }
    return d;
  };
  const worldReadouts = (w) => { w.lastDecision = { current: 3 };          // the readout's own write
    return { 1: { poolKeys: [2], poolWeights: [w.rewards.get('1->2')], futureBonusValues: [12], bestChoiceON: 2 } }; };
  const ops = (w, diagnostic) => ({
    readouts: () => worldReadouts(w), digest: () => worldDigest(w, false), sentinel: SENTINEL, makeRng,
    initRng: (seed) => { for (const [s, sd] of Object.entries(S.streamSeeds(seed))) w.streams.set(s, makeRng(sd)); },
    diagnostic: () => diagnostic(w), probe: () => Object.fromEntries([...w.streams.entries()].map(([s, g]) => [s, g()])),
  });
  const pure = (w) => { void w.rewards.get('1->2'); };
  const R2_OLD_ORDER = (o) => {                                              // the M40-R1 order, for exposure only
    const digestBefore = o.digest(); const readoutsBefore = o.readouts(); const readoutsRepeat = o.readouts();
    o.initRng(o.sentinel); o.diagnostic(); const rngAfterDiagnostic = o.probe(); const digestAfter = o.digest();
    const readoutsAfter = o.readouts();
    const rngExpected = Object.fromEntries(Object.entries(S.streamSeeds(o.sentinel)).map(([s, sd]) => [s, makeRng(sd)()]));
    return S.purityHolds({ digestBefore, digestAfter, rngExpected, rngAfterDiagnostic, readoutsBefore, readoutsRepeat, readoutsAfter });
  };
  const rPure = S.runPurityProtocol(ops(world(1760000000000), pure));
  const rOld = R2_OLD_ORDER(ops(world(1760000000000), pure));
  ok2('R11', rPure.pass && !rOld.pass && JSON.stringify(rOld.mismatches) === '["digest:lastDecision"]',
    `DP BRACKET: a pure diagnostic passes the corrected order although every readout writes lastDecision; the M40-R1 order fails it on exactly ${JSON.stringify(rOld.mismatches)} — the defect is exposed`);
  const diag = {
    'mutates rewards': (w) => { w.rewards.set('1->2', 4); },
    'consumes one cognitive draw': (w) => { w.streams.get('cognitive')(); },
    'writes lastDecision itself': (w) => { w.lastDecision = { current: 99 }; },
    'rewrites an episode timestamp': (w) => { w.episodes[0].timestamp += 1; },
    'adds a timeMemory entry': (w) => { w.timeMemory.set('9->9', 1); },
  };
  const caughtDiag = Object.entries(diag).filter(([, f]) => !S.runPurityProtocol(ops(world(1760000000000), f)).pass).map(([k]) => k);
  ok2('R12', caughtDiag.length === Object.keys(diag).length,
    `DP still catches genuine diagnostic mutations under the corrected order (${caughtDiag.length}/${Object.keys(diag).length}: ${caughtDiag.join('; ')}); DP digests are not clock-projected`);
  // PE: two processes at different wall times, otherwise identical
  const peRec = (w, ticks) => ({ ticksRequested: ticks, capturedAt: 1500, digest: worldDigest(w, true),
    rng: { cognitive: 1001, visual: 1002, environment: 1003 }, readouts: worldReadouts(w) });
  const peRaw = (w, ticks) => ({ ...peRec(w, ticks), digest: worldDigest(w, false) });
  // every comparison builds FRESH worlds: a readout rewrites lastDecision, so a reused world would differ for that reason alone
  const TA = 1760000000000, TB = 1760000987654;
  ok2('R13', S.prefixEquivalent(peRec(world(TA), 1500), peRec(world(TB), 3000)).pass &&
    JSON.stringify(S.prefixEquivalent(peRaw(world(TA), 1500), peRaw(world(TB), 3000)).mismatches) === '["digest:episodes","digest:timeMemory"]',
    'PE CLOCK: runs identical except for wall time pass with the projection; unprojected digests fail on exactly episodes and timeMemory — the false-failure defect is exposed');
  const still = {
    'timeMemory key set': (w) => { w.timeMemory.set('3->4', w.timeMemory.get('1->2')); },
    'episode nodes': (w) => { w.episodes[1].nodes = [2, 4]; },
    'episode id random suffix': (w) => { w.episodes[0].id = w.episodes[0].id.replace('ab12c', 'ab12d'); },
    'episode id source': (w) => { w.episodes[0].id = w.episodes[0].id.replace('live_', 'click_'); },
    'episode non-clock field': (w) => { w.episodes[0].coherence = 0.51; },
    'id without a 13-digit ms segment': (w) => { w.episodes[1].id = 'loaded_x7y8z9'; },
    'a timestamp field outside episodes': (w) => { w.lastDecision.timestamp = 5; },
    'rewards': (w) => { w.rewards.set('1->2', 3.5); },
  };
  const caughtPE = Object.entries(still).filter(([, f]) => { const b = world(TB); f(b); return !S.prefixEquivalent(peRec(world(TA), 1500), peRec(b, 3000)).pass; }).map(([k]) => k);
  ok2('R14', caughtPE.length === Object.keys(still).length && JSON.stringify(S.CLOCK_PROJECTION) === '{"episodes":["timestamp","id:ms-segment"],"timeMemory":["values"]}',
    `PE projection is narrow: ${caughtPE.length}/${Object.keys(still).length} decision-relevant or non-clock differences are still caught (${caughtPE.join('; ')}); exactly three fields are projected`);
  return rows;
}
const specPathMap = new Map();
const SPEC_PATH_OF = (S) => specPathMap.get(S) || SPEC_PATH;

const SPEC = await import(pathToFileURL(SPEC_PATH).href);
specPathMap.set(SPEC, SPEC_PATH);
for (const r of specChecks(SPEC)) ok(r.id, r.ok, r.msg);
ok('R10', env.evaluatedSeeds().length === 0, 'the R checks evaluated no configuration seed (synthetic reliabilities only)');

// ---- mutation suite over the spec (each mutant must fail at least one R check) ---------------------------------------
section('X  mutation suite (20 mutants of m40_spec.js)');
const SPEC_SRC = fs.readFileSync(SPEC_PATH, 'utf8').replace(/\r\n/g, '\n');
const MUTANTS = [
  ['prefix ignores embeddings', 'for (const id of digestIds()) if (A.digest', "for (const id of digestIds().filter(i => i !== 'embeddings')) if (A.digest"],
  ['prefix ignores the readout closure', 'if (!same(A.readouts[u][f], B.readouts[u] && B.readouts[u][f]))', 'if (false)'],
  ['prefix ignores RNG positions', 'for (const s of RNG_STREAMS) if (A.rng[s] === undefined', 'for (const s of []) if (A.rng[s] === undefined'],
  ['prefix accepts any capture tick', "B.capturedAt !== T_A) mismatches.push('B is not", "false) mismatches.push('B is not"],
  ['prefix compares B\'s final state', '!same(A.digest[id], B.digest[id])', '!same(A.digest[id], (B.final || B).digest[id])'],
  ['purity ignores the digest', 'for (const id of digestIds()) if (R.digestBefore', 'for (const id of []) if (R.digestBefore'],
  ['purity ignores RNG consumption', 'for (const s of RNG_STREAMS) if (R.rngExpected', 'for (const s of []) if (R.rngExpected'],
  ['purity ignores readout change', 'if (!same(R.readoutsBefore, R.readoutsAfter))', 'if (false)'],
  ['purity drops the idempotence control', 'if (!same(R.readoutsBefore, R.readoutsRepeat))', 'if (false)'],
  ['ORACLE PHASE MISMATCH: phase-2 oracle at T_A', 'export const oracleReliability = (cfg, T) => (regimeAt(T) === 1 ? cfg.pPhase1 : cfg.pPhase2);', 'export const oracleReliability = (cfg, T) => cfg.pPhase2;'],
  ['regime boundary off by one tick', '(lastSetTick(T) >= T_SHIFT ? 2 : 1)', '(T >= T_SHIFT ? 2 : 1)'],
  ['declared state drops adjacencyMemory', "  { id: 'adjacencyMemory', cls: 'exposed', covers: 'visit state', source: 'main.js:926 const adjacencyMemory' },\n", ''],
  ['go/no-go reads an outcome', 'const rankable = atTA.filter(r => new Set(r.poolValues).size >= 2).length;', 'const rankable = atTA.filter(r => new Set(r.poolValues).size >= 2 || r.oracleAligned).length;'],
  ['T_A moved to 1250', 'export const T_A = 1500;', 'export const T_A = 1250;'],
  // M40-R2
  ['DP bracket back to the M40-R1 order (digestBefore before the readouts)',
    '  const readoutsBefore = ops.readouts();\n  const readoutsRepeat = ops.readouts();\n  const digestBefore = ops.digest();',
    '  const digestBefore = ops.digest();\n  const readoutsBefore = ops.readouts();\n  const readoutsRepeat = ops.readouts();'],
  ['PE projection removed', "  if (id === 'episodes') {\n    return value.map(ep => {", "  if (false) {\n    return value.map(ep => {"],
  ['PE projection drops the whole episode id', "out[k] = (k === 'id' && typeof v === 'string' && EPISODE_ID.test(v)) ? v.replace(EPISODE_ID, '$1_$3') : v;",
    "if (k === 'id') continue; out[k] = v;"],
  ['PE projection strips timestamp from every component', "    return keys.map(String).sort();\n  }\n  return value;",
    "    return keys.map(String).sort();\n  }\n  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Map)) { const { timestamp, ...rest } = value; return rest; }\n  return value;"],
  ['PE projection drops timeMemory keys too', '    return keys.map(String).sort();', '    return [];'],
  ['DP digests clock-projected (would hide a diagnostic that rewrites clock fields)', 'export function runPurityProtocol(ops) {\n',
    "export function runPurityProtocol(ops0) {\n  const ops = { ...ops0, digest: () => Object.fromEntries(Object.entries(ops0.digest()).map(([k, v]) => [k, /^(episodes|timeMemory)$/.test(k) ? 'projected' : v])) };\n"],
];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm40-'));
let mi = 0;
for (const [name, anchor, repl] of MUTANTS) {
  mi++;
  const n = SPEC_SRC.split(anchor).length - 1;
  if (n !== 1) { ok(`X${mi}`, false, `${name}: anchor occurs ${n} times`); continue; }
  const f = path.join(TMP, `m40_spec_mut${mi}.js`);
  fs.writeFileSync(f, SPEC_SRC.replace(anchor, repl));
  let failed;
  try { const M = await import(pathToFileURL(f).href); specPathMap.set(M, f); failed = specChecks(M).filter(r => !r.ok).map(r => r.id); }
  catch (e) { failed = [`threw: ${String(e.message).slice(0, 60)}`]; }
  ok(`X${mi}`, failed.length > 0, `${name} -> caught by ${JSON.stringify(failed)}`);
}
fs.rmSync(TMP, { recursive: true, force: true });

// ---- I: integrity -----------------------------------------------------------------------------------------
section('I  integrity: formulation only');
const PROTECTED = ['main.js', 'render/planning.js', 'render/scoring.js', 'render/embeddings.js', 'render/episodeManager.js',
  'instrumentation/rng.js', 'experiments/m7/env.js', 'experiments/m7/run.js', 'experiments/m39/analyze.js',
  'experiments/m39/child.mjs', 'experiments/m39/hook.mjs', 'experiments/m39/verify.js', 'experiments/m39/M39_P1_RED_RECORD.md',
  'experiments/m39/evidence/INTEGRITY.sha256', 'research/preregistrations/M39_FUTURESCORE_SHADOW_EVALUATION_FORMULATION.md',
  'experiments/uqb/instrument.js', 'experiments/uqb/results/uqb_results.json', 'experiments/c1/data/candidates.jsonl',
  'experiments/registry/consumed_after_c1.js', 'experiments/registry/typed.js', 'experiments/d2/D2_EVIDENCE_LINEAGE.md',
  'neurons.json', 'connections.json'];
const same = (f) => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim();
ok('I1', PROTECTED.every(same), `${PROTECTED.length} production, M39, M39-P1, UQ-B, C1, registry and D2 files byte-identical to ${BASE.slice(0, 7)}`);
ok('I2', !fs.existsSync(path.join(ROOT, 'experiments/m40')), 'no experiments/m40: formulation only');
ok('I3', env.evaluatedSeeds().length === 0, 'no configuration seed evaluated by this gate');
let m39;
try { m39 = execFileSync(process.execPath, [path.join(ROOT, 'experiments/m39/verify.js')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { m39 = String(e.stdout); }
// The M39-P1 verifier is historical and unchanged. Its own I4 ("since dacdccd only experiments/m39/ changed")
// reports every later milestone by design, so it may fail on exactly that lineage check, and only when every
// file it lists is M39-P1's own or an M40 formulation file. Every other M39-P1 check must still pass.
const m39Fails = [...m39.matchAll(/^\s+\[FAIL\] (\S+)\s+(.*)$/gm)].map(m => [m[1], m[2]]);
const M40_FILES = ['research/preregistrations/M40_FUTURESCORE_TEMPORAL_FORMULATION.md', 'research/preregistrations/m40_spec.js',
  'research/preregistrations/verify_m40.js'];
const lineageOnly = m39Fails.every(([id, msg]) => {
  if (id !== 'I4') return false;
  const listed = JSON.parse(msg.slice(msg.indexOf('[')));
  return listed.every(f => f.startsWith('experiments/m39/') || M40_FILES.includes(f));
});
const m39Total = (m39.match(/M39-P1 RECORD: (\d+)\/(\d+) checks passed/) || []).slice(1).map(Number);
ok('I4', lineageOnly && m39Total.length === 2 && m39Total[1] === 37 && m39Total[0] >= 36 && m39Fails.length <= 1,
  `the M39-P1 RED record verifier passes ${m39Total[0]}/${m39Total[1]}; its only permitted failure is its own since-base lineage check (I4), listing only M39-P1 and M40 formulation files`);

// ---- M: memo binding ---------------------------------------------------------------------------------------
section('M  memo bound to the verified facts');
const MEMO = fs.existsSync(MEMO_PATH) ? fs.readFileSync(MEMO_PATH, 'utf8').replace(/\r\n/g, '\n') : '';
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
const C = {
  anchor: (M) => flat(M).includes('Primary scientific snapshot: design C, T_A = 1500, the last phase-1 state (T3).'),
  grid: (M) => flat(M).includes('G = {250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000}'),
  regime: (M) => flat(M).includes('the regime in force at the snapshot') && M.includes('p₁ = cfg.pPhase1') &&
    flat(M).includes('phase 1 for T ≤ 1500 and phase 2 for T > 1500'),
  // flat() strips '*', so R* reads as R here
  blind: (M) => flat(M).includes('Not computed, by construction: the ZERO arm, PERM, the oracle, R, bestChoice comparisons, D, n₊ and n₋.'),
  goNoGo: (M) => flat(M).includes('GO if, at T = 1500, the saturation half of X5 does not fire on the pooled fixtures') && flat(M).includes('evaluated only in stage 2') && flat(M).includes('no substitute tick without a new formulation and review'),
  rejected: (M) => flat(M).includes('It is listed as ruling RU40-3, not adopted.'),
  oracleWording: (M) => flat(M).includes('It is not an absolute or theoretical channel-capacity ceiling.'),
  repeated: (M) => flat(M).includes('never pooled across ticks') && flat(M).includes('no longitudinal estimand is defined'),
  frozen: (M) => flat(M).includes('the production FutureScore, the ×4 multiplier, the cap of 20 and the 60/40 arbitration blend'),
  openNull: (M) => flat(M).includes('"not measurable by this assay" as a possible answer'),
  claims: (M) => !/(cognition|planning|intelligence|FutureScore) (is )?(validated|useful)|improves (cognition|planning|learning)/i
    .test(flat(M).replace(/No claim[^.]*\./gi, '')),
  prefixGate: (M) => flat(M).includes('12a. Prefix-equivalence gate PE') && flat(M).includes('A: a run with input.ticks = 1500') &&
    flat(M).includes('B: a run with input.ticks = 3000') && flat(M).includes('empirical prefix equivalence under the tested M40 execution conditions'),
  purityGate: (M) => flat(M).includes('12b. Lookahead-diagnostic purity gate DP') && flat(M).includes('digestBefore == digestAfter') &&
    flat(M).includes('Production FutureScore is not modified.'),
  stops: (M) => ['XC5', 'XC6', 'XC7'].every(x => M.includes('| **' + x + '** |')) && flat(M).includes('the oracle phase-mismatch mutation is not caught'),
  declared: (M) => flat(M).includes('7a. Declared decision-relevant snapshot state (M40-R1)') && flat(M).includes('Stated limitation:') &&
    flat(M).includes('Lineage correction (M39-P1, not edited)'),
  language: (M) => !/entire learned history|mathematically guarantee|absolute correct path|FutureScore planning|FutureScore cognition|complete learned and behavioural state/i.test(flat(M)) &&
    !/theoretical channel[- ]capacity/i.test(flat(M).replace('It is not an absolute or theoretical channel-capacity ceiling.', '')),
  erratumR2: (M) => flat(M).includes('Erratum M40-R2 (measurement-instrument correction only)') &&
    flat(M).includes('M40-R2 order') && flat(M).includes('writes the declared component lastDecision (main.js:2410)') &&
    flat(M).includes('Wall-clock canonicalization (M40-R2, for PE only)') && flat(M).includes('DP digests are not projected.') &&
    flat(M).includes('Nothing else is normalized.'),
  status: (M) => (M.match(/^> # M40-(GREEN|YELLOW|RED|HOLD)/gm) || []).length === 2 && !/^> # M40-(YELLOW|RED|HOLD)/m.test(M),
};
if (MEMO) {
  for (const [k, f] of Object.entries(C)) ok(`M-${k}`.slice(0, 14), f(MEMO), `memo ${k} matches the verified facts`);
  const corrupt = {
    anchor: MEMO.replace('design C, `T_A = 1500`', 'design F, `T_A = earliest unsaturated`'),
    grid: MEMO.replace('2750, 3000}', '2750}'),
    regime: MEMO.replace('p₁ = cfg.pPhase1', 'p₂ = cfg.pPhase2'),
    blind: MEMO.replace('the ZERO arm, PERM, the oracle, R*,', 'PERM,'),
    goNoGo: MEMO.replace('no substitute tick without a new formulation and review', 'try the next tick'),
    rejected: MEMO.replace('It is listed as ruling RU40-3, not adopted.', 'It is adopted.'),
    oracleWording: MEMO.replace('It is not an absolute or\ntheoretical channel-capacity ceiling.', 'It is the absolute channel-capacity ceiling.'),
    repeated: MEMO.replace('never pooled across ticks', 'pooled across ticks'),
    frozen: MEMO.replace('the ×4 multiplier, the cap of 20', 'a ×2 multiplier, a cap of 40'),
    openNull: MEMO.replace('"not measurable by this assay" as a possible\nanswer', 'no possible null'),
    claims: MEMO + '\nFutureScore is validated.\n',
    prefixGate: MEMO.replace('empirical prefix equivalence under the tested M40 execution conditions', 'determinism'),
    purityGate: MEMO.replace('`digestBefore == digestAfter`', 'a source argument'),
    stops: MEMO.replace('| **XC7** |', '| XC7? |'),
    declared: MEMO.replace('**Stated limitation:**', 'Note:'),
    language: MEMO + '\nThe snapshot holds the entire learned history.\n',
    erratumR2: MEMO.replace('Nothing else is normalized.', 'Other differing fields may also be normalized.'),
    status: MEMO.replaceAll('# M40-GREEN', '# M40-YELLOW'),
  };
  for (const [k, t] of Object.entries(corrupt)) ok(`X-${k}`.slice(0, 14), t !== MEMO && C[k](t) === false, `corrupting the memo breaks '${k}'`);
} else ok('M0', false, 'memo not found');

console.log('\n' + '='.repeat(78));
console.log(`  M40 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

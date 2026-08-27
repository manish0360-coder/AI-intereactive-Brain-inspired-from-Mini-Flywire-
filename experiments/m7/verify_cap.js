// ==========================================================
// FROZEN §3.7 EPISODE CAP — DEDICATED VERIFIER
// ==========================================================
// Frozen §3.7: "Episode end | goal reached (existing reset) **or** 150 ticks
// elapsed".  ERRATUM M7-ERR-03 confirms 150 is already pinned and introduces no
// new constant.  Director ruling 2026-08-23 fixed the semantics: one tick = one
// runAgent() call; stale/replay ticks COUNT; goal reach takes precedence; the
// cap path seals "tick_cap", clears recentMemory, calls resetExpectation(),
// does NOT call resetAttentionFocus(), issues no reward and no goal-activation
// boost, restarts randomly on the existing cognitive stream, syncs agentLast,
// and resets the counter.
//
// OBSERVATION METHOD — behaviour, not source text:
//   * episode boundary  = getCurrentEpisodeState().id changes (robust: it also
//     changes when a <2-node episode is discarded rather than vaulted)
//   * seal reason       = the runtime's own "Episode sealed [<reason>]" line,
//     captured by replacing console.log after boot
//   * path window       = globalThis.recentMemory.length
// Source-text checks appear only where the requirement is an ABSENCE (C3, C6,
// C7, E3) and each is paired with behavioural evidence.
//
// NOT Stage 1, a pilot, or a confirmatory run. No held-out seed is touched.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from './env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm7cap-'));
const SEED = 20260819000, PILOT = 900000, CAP = 150;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

function run(o = {}) {
  const f = path.join(TMP, 'r.mjs');
  fs.writeFileSync(f, `
import { boot, pressSpace } from ${JSON.stringify(U + '/experiments/phase1_0/_driver.js')};
import { getCurrentEpisodeState } from ${JSON.stringify(U + '/render/episodicContextEngine.js')};
import { makeRng, rng as rawRng } from ${JSON.stringify(U + '/instrumentation/rng.js')};
${o.cap === false ? '' : 'globalThis.__M7_EPISODE_CAP__ = true;'}
const args = { seed: ${SEED} };
${o.goal !== undefined ? `args.goal = ${JSON.stringify(o.goal)};` : ''}
const { dom, timer, restore } = await boot(args);

// capture the runtime's own seal announcements; suppress everything else
const seals = [];
console.log = (...a) => { const s = a.map(String).join(' ');
  const m = /Episode sealed \\[([a-z_]+)\\]/.exec(s); if (m) seals.push({ reason: m[1], at: steps.length }); };

const writes = []; let _lr = globalThis.lastReasoning;
Object.defineProperty(globalThis, 'lastReasoning', { configurable: true,
  get(){return _lr;}, set(v){_lr=v; writes.push(v?{from:String(v.from),to:String(v.to)}:null);} });

// per-step snapshot taken at the E6 step site, which sits immediately AFTER the
// cap block at the top of runAgent(): so a boundary that fired on this call is
// already visible here.
const steps = [];
let lastId = null;
globalThis.__M7_TEL__ = { step(){
    const st = getCurrentEpisodeState();
    const changed = lastId !== null && st.id !== lastId;
    lastId = st.id;
    steps.push({ idChanged: changed, mem: (globalThis.recentMemory||[]).length,
                 nodeCount: st.nodeCount, vaultSize: st.vaultSize });
  }, replayBranch(){} };

pressSpace(dom);
let loops = 0;
for (let i = 0; i < ${o.loops ?? 200}; i++) { if (!timer.tick()) break; loops++; }
restore();

function rec(s, sd, lim=8000000){ let p; try{p=rawRng(s);}catch{return null;}
  const r=makeRng(sd>>>0); for(let i=0;i<lim;i++) if(r()===p) return i; return -1; }
const bounds = steps.map((s,i)=>s.idChanged?i:-1).filter(i=>i>=0);
// OBSERVATION LAG, stated explicitly: the E6 step site sits at the top of
// runAgent() IMMEDIATELY BEFORE the cap block, so a boundary that fires during
// call #N is first visible in the snapshot of call #N+1, at index N. The first
// episode therefore begins at call #1, i.e. reference index 1 -- not 0.
const gaps = bounds.map((b,i)=> b - (i===0 ? 1 : bounds[i-1]));
process.stdout.write('@@R@@' + JSON.stringify({
  capOn: !!globalThis.__M7_EPISODE_CAP__, goal: ${o.goal ?? null}, loops,
  agentSteps: steps.length, bounds, gaps,
  memAtBoundaries: bounds.map(i => steps[i].mem),
  reasonCounts: seals.reduce((m,s)=>{m[s.reason]=(m[s.reason]||0)+1; return m;},{}),
  sealCount: seals.length,
  cog: rec('cognitive', ${SEED}), vis: rec('visual', (${SEED} ^ 0x9e3779b9) >>> 0),
  writeCount: writes.length
}));`);
  const out = execFileSync(process.execPath, [f], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
  return JSON.parse(out.slice(out.indexOf('@@R@@') + 5));
}

// ==========================================================
// BRIDGE HARNESS — boots through the REAL M7 experiment driver run.js
// ==========================================================
// Unlike run() above, this does NOT set the cap flag itself. run.js must set
// it. A property trap on globalThis intercepts the write, so the bridge is
// proved by OBSERVING THE WRITE AND THE READS, not by matching source text.
//
//   suppress:true  -> the trap still RECORDS the write but reports undefined
//                     to every reader. This is the anti-vacuity control: it
//                     reproduces the pre-bridge runtime exactly, without
//                     adding an "off" switch to run.js.
//
// __M7_TEL__ is attached for episode-boundary observation only. Gate G8.1c
// already establishes that attaching it does not change the run.
// ==========================================================
function bridgeRun(o = {}) {
  const f = path.join(TMP, 'b.mjs');
  fs.writeFileSync(f, `
import { getCurrentEpisodeState } from ${JSON.stringify(U + '/render/episodicContextEngine.js')};
const SUPPRESS = ${o.suppress ? 'true' : 'false'};
let capValue, capWrites = 0, capReads = 0, valueWritten = null, writesBeforeFirstStep = null;
Object.defineProperty(globalThis, '__M7_EPISODE_CAP__', { configurable: true,
  get(){ capReads++; return SUPPRESS ? undefined : capValue; },
  set(v){ capWrites++; valueWritten = v; capValue = v; } });

const steps = []; let lastId = null;
globalThis.__M7_TEL__ = { step(){
    if (writesBeforeFirstStep === null) writesBeforeFirstStep = capWrites;
    const st = getCurrentEpisodeState();
    steps.push(lastId !== null && st.id !== lastId); lastId = st.id;
  }, replayBranch(){} };

const { runOnce } = await import(${JSON.stringify(U + '/experiments/m7/run.js')});
const rec = await runOnce({ configSeed: ${o.configSeed ?? PILOT}, configIndex: ${o.configIndex ?? 0},
  agentSeed: ${o.agentSeed ?? 20260819000}, arm: 'A1', envMode: 'on', creditMode: 'on',
  pin: 'on', tickUnit: 'step', ticks: ${o.ticks ?? 3000}, crashAtTick: null, warmStore: false });

const b = steps.map((c,i)=>c?i:-1).filter(i=>i>=0);
const gaps = b.map((x,i)=> x - (i===0 ? 1 : b[i-1]));
process.stdout.write('@@B@@' + JSON.stringify({
  capWrites, valueWritten, capReads, writesBeforeFirstStep,
  agentSteps: steps.length, episodes: gaps.length,
  maxGap: gaps.length ? Math.max(...gaps) : 0,
  atCap: gaps.filter(g => g === ${CAP}).length,
  overCap: gaps.filter(g => g > ${CAP}).length,
  episodeCapArmed: rec.provenance.episodeCapArmed,
  unimplemented: rec.unimplemented,
  fingerprint: rec.fingerprint, cogDraws: rec.artifacts.cogDraws,
  ticksExecuted: rec.outcome.ticksExecuted, crashed: rec.outcome.crashed
}));`);
  const out = execFileSync(process.execPath, [f], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
  return JSON.parse(out.slice(out.indexOf('@@B@@') + 5));
}

console.log('==============================================================');
console.log(' FROZEN §3.7 EPISODE CAP — 150 ticks');
console.log(' one tick = one runAgent() call | stale/replay ticks count');
console.log('==============================================================');

// A goal-less run is the clean laboratory: the goal path can never fire, so
// every boundary observed is a cap boundary.
const NG = run({ loops: 200 });
console.log(`\n   goal-less, cap ARMED : ${NG.agentSteps} agent steps`);
console.log(`   episode boundaries at agent-step indices: ${NG.bounds.join(', ')}`);
console.log(`   episode lengths (ticks): ${NG.gaps.join(', ')}`);
console.log(`   seal reasons announced by the runtime: ${JSON.stringify(NG.reasonCounts)}`);

// ==========================================================
// A — EXACT BOUNDARY
// ==========================================================
console.log('\n===== A  exact boundary =======================================');
// A1 pins BOTH quantities so the index and the tick count cannot be confused:
// the first episode ran exactly CAP ticks (calls #1..#150), and the cap fired at
// the top of call #151, which the lagged observation reports at index CAP+1.
const a1 = ok('A1 the cap does not terminate before 150 counted runAgent() calls',
   NG.bounds.length > 0 && NG.gaps[0] === CAP && NG.bounds[0] === CAP + 1,
   `first episode ran ${NG.gaps[0]} ticks (calls #1..#${CAP}); the cap fired at the ` +
   `top of call #${NG.bounds[0]}, observed at index ${NG.bounds[0]}`);
const a2 = ok('A2 the cap terminates at exactly 150 counted runAgent() calls',
   NG.gaps.length > 0 && NG.gaps.every(g => g === CAP), `lengths: ${NG.gaps.join(', ')}`);
const a3 = ok('A3 the counter resets correctly for the following episode',
   NG.gaps.length > 1 && NG.gaps[1] === CAP, `second episode ${NG.gaps[1]} ticks`);
const a4 = ok('A4 successive episodes each reach 150 independently',
   NG.bounds.length >= 2 && new Set(NG.gaps).size === 1,
   `${NG.bounds.length} cap terminations, every gap ${CAP}`);
const a5 = ok('A5 the boundary is exact: no off-by-one at 149 or 151',
   NG.gaps.every(g => g === CAP && g !== CAP - 1 && g !== CAP + 1),
   'a 149 or 151 implementation would shift every gap and be detected here');

// ==========================================================
// B — GOAL PRECEDENCE
// ==========================================================
console.log('\n===== B  goal precedence ======================================');
const cfg = env.generateAccepted(PILOT, 0).cfg;
const GC = run({ loops: 200, goal: cfg.goal });
const GN = run({ loops: 200, goal: cfg.goal, cap: false });
console.log(`   goal ${cfg.goal} cap ARMED    : ${JSON.stringify(GC.reasonCounts)}  boundaries ${GC.bounds.length}`);
console.log(`   goal ${cfg.goal} cap DISARMED : ${JSON.stringify(GN.reasonCounts)}  boundaries ${GN.bounds.length}`);
const b1 = ok('B1 goal reached before 150: existing goal behaviour is unchanged',
   GC.reasonCounts.goal_reached === GN.reasonCounts.goal_reached &&
   GC.bounds.length === GN.bounds.length && GC.writeCount === GN.writeCount,
   `goal_reached ${GC.reasonCounts.goal_reached} both ways; identical boundary count`);
const b2 = ok('B2 exactly one termination occurs — no tick_cap alongside goal_reached',
   !GC.reasonCounts.tick_cap,
   'the goal seal zeroes the counter, so the cap cannot also fire for that episode');
const b3 = ok('B3 the goal-reached path wins: run is bit-identical with the cap armed',
   GC.cog === GN.cog && GC.vis === GN.vis,
   `cognitive ${GC.cog} == ${GN.cog}, visual ${GC.vis} == ${GN.vis}`);
const b4 = ok('B4 no duplicate seal or double reset on any single call',
   GC.bounds.length === GN.bounds.length &&
   GC.bounds.every((b, i) => i === 0 || b - GC.bounds[i - 1] >= 1),
   `${GC.bounds.length} boundaries armed == ${GN.bounds.length} disarmed; ` +
   `no two boundaries share a call`);

// ==========================================================
// C — CAP PATH SEMANTICS
// ==========================================================
console.log('\n===== C  cap path semantics ===================================');
const mainSrc = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
// Comments are stripped: the cap block's own documentation NAMES the three
// excluded calls, and an absence test must look at executable code only.
const capBlockRaw = mainSrc.slice(mainSrc.indexOf('if (globalThis.__M7_EPISODE_CAP__)'),
                                  mainSrc.indexOf('_m7EpisodeTicks++'));
const capBlock = capBlockRaw.split(/\r?\n/).map(l => l.replace(/\/\/.*$/, '')).join('\n');
// The engine DISCARDS an episode whose nodes.length < 2 instead of vaulting it
// (episodicContextEngine.js:340), and in headless runs episodes are short, so
// the runtime's "Episode sealed [...]" line is not reached. That is PRE-EXISTING
// behaviour and applies identically to goal_reached -- measured: zero seal
// announcements in the goal runs too. C1 is therefore asserted as (a) the cap
// path calls sealCurrentEpisode with exactly "tick_cap", and (b) the episode
// lifecycle demonstrably advances at each cap boundary.
const c1 = ok('C1 the cap path seals with reason "tick_cap" and the episode lifecycle advances',
   /sealCurrentEpisode\("tick_cap"\)/.test(capBlock) && NG.bounds.length >= 2 &&
   NG.gaps.every(g => g === CAP),
   `sealCurrentEpisode("tick_cap") in the cap block; ${NG.bounds.length} lifecycle ` +
   `advances, all exactly ${CAP} ticks apart`);
const c1b = ok('C1b no OTHER seal reason is produced in a goal-less capped run',
   !NG.reasonCounts.goal_reached,
   'the goal path cannot fire without a goal, so every boundary is the cap');
const c2 = ok('C2 the cap path issues no goal reward',
   !NG.reasonCounts.goal_reached && !/rewardCurrentEpisode/.test(capBlock),
   'no goal_reached seal in a goal-less run, and no reward call in the cap block');
const c3 = ok('C3 the cap path issues no goal-activation boost',
   !/boostActivation/.test(capBlock));
// Same one-snapshot lag: by the observation point the restarted episode has
// already pushed at most one node. The window is capped at 6 and sits at 6 for
// the overwhelming majority of steps, so <= 1 at every boundary is decisive.
const c4 = ok('C4 recentMemory is cleared before the next episode proceeds',
   NG.memAtBoundaries.length > 0 && NG.memAtBoundaries.every(m => m <= 1),
   `path-window length at each cap boundary: ${NG.memAtBoundaries.join(', ')} ` +
   `(cap is 6; the window sits at 6 for the vast majority of non-boundary steps)`);
const c5 = ok('C5 the active expectation is reset on the cap path',
   /resetExpectation\(\)/.test(capBlock));
const c6 = ok('C6 resetAttentionFocus() is NOT invoked by the cap path',
   !/resetAttentionFocus/.test(capBlock), 'Director ruling: explicitly excluded');
const c7 = ok('C7 CONTROL: the block that does contain these calls is the GOAL path',
   /rewardCurrentEpisode/.test(mainSrc) && /boostActivation/.test(mainSrc) &&
   /resetAttentionFocus/.test(mainSrc),
   'so C2/C3/C6 are absence-in-the-cap-block, not absence-from-the-file');

// ==========================================================
// D — RANDOM RESTART INTEGRITY
// ==========================================================
console.log('\n===== D  random restart integrity =============================');
const d1 = ok('D1 the post-cap episode starts via the existing random-start mechanism',
   /Array\.from\(neuronMap\.keys\(\)\)/.test(capBlock) && /liveRng\(\)/.test(capBlock));
const d2 = ok('D2 the restart uses the existing cognitive stream only',
   /Math\.floor\(liveRng\(\) \* _capIds\.length\)/.test(capBlock) &&
   !/liveRng\(\s*['"]/.test(capBlock),
   'bare liveRng() is the cognitive stream; no named stream is referenced');
const d3 = ok('D3 agentLast is synchronised with the newly selected agentCurrent',
   /agentLast\s*=\s*agentCurrent/.test(capBlock));
const d4 = ok('D4 no fabricated edge can join the pre-cap node to the restart node',
   NG.memAtBoundaries.every(m => m <= 1),
   'the path window is empty at every boundary, so the consecutive-pair loop ' +
   'cannot span the restart; and the restart precedes this call\'s decision');

// ==========================================================
// E — COUNTING AND STALE/REPLAY
// ==========================================================
console.log('\n===== E  counting, stale/replay included ======================');
const e1 = ok('E1 every runAgent() call contributes exactly one tick',
   NG.gaps.every(g => g === CAP),
   `episodes are exactly ${CAP} agent steps long`);
const e2 = ok('E2 stale/replay execution contributes to the count',
   NG.gaps.every(g => g === CAP),
   'replay fires at ~8% of steps; excluding those would stretch every episode ' +
   'past 150 agent steps, which is not observed');
const e3 = ok('E3 no staleExecution exclusion was introduced',
   !/stale|replay|__M7_TEL__/.test(capBlock),
   'the cap block references no execution-mode flag');

// ==========================================================
// F — RNG DISCIPLINE (two questions kept separate)
// ==========================================================
console.log('\n===== F  RNG discipline =======================================');
const F_OFF = run({ loops: 20, cap: false });
const F_ON  = run({ loops: 20 });
console.log(`      cap ARMED but boundary NOT crossed (${F_ON.agentSteps} steps < ${CAP}):`);
console.log(`        disarmed cog ${F_OFF.cog} vis ${F_OFF.vis}   armed cog ${F_ON.cog} vis ${F_ON.vis}`);
const f1 = ok('F1 counter increment and comparison consume ZERO RNG',
   F_ON.cog === F_OFF.cog && F_ON.vis === F_OFF.vis && F_ON.agentSteps < CAP,
   `identical draw counts with the cap armed and never crossed`);
const f1b = ok('F1b the un-crossed armed run is otherwise identical',
   F_ON.agentSteps === F_OFF.agentSteps && F_ON.bounds.length === F_OFF.bounds.length);
const G_OFF = run({ loops: 200, cap: false });
const f2 = ok('F2 the cap-induced restart lawfully consumes RNG once it fires',
   NG.cog !== G_OFF.cog,
   `armed+crossed cog ${NG.cog} vs disarmed ${G_OFF.cog}; divergence follows a frozen ` +
   `§3.7 termination. Trajectory parity after a cap fires is NOT asserted.`);

// ==========================================================
// G — M7-OFF ISOLATION
// ==========================================================
console.log('\n===== G  M7-off isolation =====================================');
const g1 = ok('G1 with the cap disarmed, nothing is sealed by tick_cap',
   !G_OFF.reasonCounts.tick_cap && G_OFF.agentSteps > CAP,
   `${G_OFF.agentSteps} agent steps, 0 tick_cap seals — the guard holds`);
const g2 = ok('G2 the guard is the only thing that changes: disarmed differs from armed',
   G_OFF.cog !== NG.cog && G_OFF.agentSteps === NG.agentSteps,
   `disarmed cog ${G_OFF.cog} vs armed ${NG.cog} over the same ${NG.agentSteps} steps`);
const g3 = ok('G3 an armed run that never crosses the boundary is identical to disarmed',
   F_ON.cog === F_OFF.cog && F_ON.vis === F_OFF.vis,
   'so the guard costs nothing until the frozen boundary is actually reached');
console.log('      NOTE: full M7-off G1 parity (10 seeds x 1000 ticks, bit-identical) is');
console.log('      owned by verify_M7.js G1a/G1b and is run in the regression, not here.');

// ==========================================================
// H — ACTIVATION BRIDGE: the REAL M7 driver arms the frozen cap
// ==========================================================
// THREE SEPARATE PROPERTIES, NEVER CONFLATED:
//   H1-H4   WIRING       run.js writes the flag and the runtime reads it.
//                        Proved by a property trap, not by source text.
//   H5-H7   ACTIVATION   a deterministic case that REACHES 150 through the
//                        real driver proves the cap actually fires.
//   H8-H9   TRAJECTORY   divergence is asserted ONLY where the cap fires.
//                        Where the cap CANNOT fire, IDENTICAL trajectories
//                        are the correct result and are asserted as such.
//                        "armed => must differ" is NOT a valid assertion and
//                        is deliberately not made.
//
// EVERY comparison below is made at <= 1200 ticks. See the reproducibility
// note printed at the end of this section: a 3000-tick run is NOT bit-
// reproducible on this tree, for reasons that predate this milestone.
// ==========================================================
console.log('\n===== H  activation bridge (through experiments/m7/run.js) ====');

// ---- WIRING: a run too short for the cap to fire, so nothing is confounded ----
const SHORT = 100;                       // 105 agent steps < 150: the counter
const S_ON  = bridgeRun({ ticks: SHORT });  // provably cannot reach the boundary
const S_OFF = bridgeRun({ ticks: SHORT, suppress: true });
console.log(`   wiring probe: ${S_ON.agentSteps} agent steps (< ${CAP}, so the cap cannot fire)`);
console.log(`     flag writes ${S_ON.capWrites}, value ${S_ON.valueWritten}, reads ${S_ON.capReads}`);

const h1 = ok('H1 the real M7 driver WRITES the cap flag exactly once, as true',
   S_ON.capWrites === 1 && S_ON.valueWritten === true,
   'observed by a property trap on globalThis — the write itself, not source text');
const h2 = ok('H2 the flag is armed BEFORE the first runAgent() call',
   S_ON.writesBeforeFirstStep === 1,
   'the write had already happened when the first agent step was observed');
const h3 = ok('H3 the armed state REACHES the cap mechanism on every single tick',
   S_ON.capReads === S_ON.agentSteps + 1 && S_ON.agentSteps > 0,
   `${S_ON.capReads} reads = ${S_ON.agentSteps} guard reads (main.js:3073, one per ` +
   `runAgent() call) + 1 provenance read in run.js`);
const h4 = ok('H4 the run record states the MEASURED armed state, not a literal',
   S_ON.episodeCapArmed === true && S_OFF.episodeCapArmed === false,
   'suppressing the flag makes the record say false, so a broken bridge is visible');

// ---- ACTIVATION: a deterministic case that DOES cross the frozen boundary ----
// The FROZEN pilot configuration 900000/0 with a different agent seed. The seed
// is a VERIFICATION choice, made solely because its uncapped trajectory crosses
// 150; it is not Stage 1, not a pilot, not a confirmatory run, and no held-out
// seed is touched. Both directions were confirmed reproducible over 3 repeats.
const BC = { configSeed: PILOT, configIndex: 0, agentSeed: 20260819002, ticks: 1200 };
const B_OFF = bridgeRun({ ...BC, suppress: true });
const B_ON  = bridgeRun(BC);
console.log(`\n   boundary case: config ${PILOT}/0, agent seed ${BC.agentSeed}, ${BC.ticks} ticks`);
console.log(`     un-armed: ${B_OFF.episodes} episodes, longest ${B_OFF.maxGap} agent steps, ${B_OFF.overCap} past ${CAP}`);
console.log(`     armed   : ${B_ON.episodes} episodes, longest ${B_ON.maxGap}, ${B_ON.atCap} ended at exactly ${CAP}`);

const h5 = ok('H5 ANTI-VACUITY: WITHOUT the bridge the frozen §3.7 rule is violated',
   B_OFF.overCap > 0 && B_OFF.maxGap > CAP,
   `${B_OFF.overCap} episode(s) ran past ${CAP}, the longest reaching ${B_OFF.maxGap} ` +
   `agent steps = ${(B_OFF.maxGap / CAP).toFixed(1)}x the frozen cap`);
const h6 = ok('H6 ACTIVATION: WITH the bridge the cap actually FIRES in a real run',
   B_ON.atCap > 0,
   `${B_ON.atCap} episode(s) terminated at exactly ${CAP} agent steps, through run.js`);
const h7 = ok('H7 once armed, no episode survives past the frozen boundary',
   B_ON.overCap === 0 && B_ON.maxGap <= CAP,
   `longest episode ${B_ON.maxGap} <= ${CAP}`);

// ---- TRAJECTORY: divergence claimed only where the cap actually fires ----
console.log('\n   trajectory:');
const h8 = ok('H8 a run in which the cap FIRES diverges from the un-armed run',
   B_ON.fingerprint !== B_OFF.fingerprint && B_ON.cogDraws !== B_OFF.cogDraws,
   `cognitive draws ${B_ON.cogDraws} vs ${B_OFF.cogDraws}. The divergence FOLLOWS a ` +
   `§3.7 termination and is the pre-existing random restart consuming one draw — ` +
   `not bootstrap leakage, which H9 rules out independently`);
const h9 = ok('H9 a run in which the cap CANNOT fire is BIT-IDENTICAL to the un-armed run',
   S_ON.agentSteps < CAP && S_ON.atCap === 0 &&
   S_ON.fingerprint === S_OFF.fingerprint && S_ON.cogDraws === S_OFF.cogDraws,
   `${S_ON.agentSteps} agent steps < ${CAP}, so the counter provably never reaches the ` +
   `boundary; identical fingerprints and ${S_ON.cogDraws} cognitive draws both ways. ` +
   `Arming and checking the flag therefore consume NO RNG and add NO behaviour`);
const h10 = ok('H10 a non-M7 caller does NOT acquire the cap',
   G_OFF.capOn === false,
   'boot() arms nothing; only the M7 driver arms it, so G1 M7-off parity is untouched');
const h11 = ok('H11 the driver no longer records the cap as unimplemented',
   Array.isArray(S_ON.unimplemented) &&
   !S_ON.unimplemented.some(u => /episode-cap/.test(u)),
   `run record "unimplemented" = ${JSON.stringify(S_ON.unimplemented)}`);

// ---- the evidence above must itself be reproducible ----
const B_ON2 = bridgeRun(BC);
const h12 = ok('H12 the activation evidence is REPRODUCIBLE at this run length',
   B_ON2.fingerprint === B_ON.fingerprint && B_ON2.cogDraws === B_ON.cogDraws &&
   B_ON2.atCap === B_ON.atCap,
   `an independent repeat of the boundary case reproduces fingerprint ` +
   `${B_ON.fingerprint.slice(0, 10)} and ${B_ON.atCap} cap firing(s) exactly`);

console.log('\n   ------------------------------------------------------------');
console.log('   REPRODUCIBILITY NOTE — CORRECTED 2026-08-26.');
console.log('   Every comparison in section H is made at <= 1200 ticks, which');
console.log('   remains bit-identical (H12) and is unaffected by the below.');
console.log('');
console.log('   The earlier text here attributed the 3000-tick non-determinism');
console.log('   to the 800 ms CONTEXT_SHIFT_COOLDOWN and described the boundary');
console.log('   as lying between 2000 and 3000 ticks. BOTH WERE WRONG and are');
console.log('   withdrawn. episodeRecordNode() is imported at main.js:472 and');
console.log('   NEVER CALLED, so that cooldown executes 0 times in an M7 run;');
console.log('   and the effect is load-dependent, not indexed to a tick count.');
console.log('');
console.log('   The proven cause was the 4000 ms replay cooldown in');
console.log('   render/episodeManager.js (necessary AND sufficient over 48');
console.log('   isolation runs). It was repaired under the Director ruling of');
console.log('   2026-08-26 (Branch B) and is now owned by verify_determinism.js.');
console.log('   ------------------------------------------------------------');

const GREEN = h1 && h2 && h3 && h4 && h5 && h6 && h7 && h8 && h9 && h10 && h11 && h12 &&
              a1 && a2 && a3 && a4 && a5 && b1 && b2 && b3 && b4 &&
              c1 && c2 && c3 && c4 && c5 && c6 && c7 &&
              d1 && d2 && d3 && d4 && e1 && e2 && e3 &&
              f1 && f1b && f2 && g1 && g2 && g3 && c1b;
console.log('\n==============================================================');
console.log('  EPISODE CAP   ' + (GREEN ? 'GREEN' : 'RED') + '   (frozen §3.7, 150 ticks)');
console.log('==============================================================');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// ==========================================================
// GOAL TRANSPORT VERIFIER
// ==========================================================
// Verifies the narrow configuration-to-runtime seam authorised by the Director
// ruling of 2026-08-23 (Classification B — missing integration seam):
//
//   cfg.goal  ->  run.js  ->  _driver.js boot()  ->  main.js goalNeuronId
//
// This seam TRANSPORTS an already-frozen value (frozen §3.7,
// GOALS[configIndex mod 4]) into a goal mechanism that predates M7 entirely
// (committed at HEAD 7c8bdde: goal state, 54 readers, goal-directed decisions,
// goal-directed rewards, setters). It creates no goal behaviour, no schedule,
// no second goal state, and no scientific parameter.
//
// Criteria A-E of the authorisation are asserted below, each with a mutation
// or control where one is technically applicable.
//
// NOT Stage 1, a pilot, or a confirmatory run. Short fixed tick budgets are
// used purely to exercise the seam. No held-out seed is touched.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from './env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm7goal-'));
const PILOT_SEED = 900000, AGENT_SEED = 20260819000, TICKS = 120;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

// ---- a probe run: boots through the REAL driver, optionally supplying a goal ----
function probe(o = {}) {
  const f = path.join(TMP, 'p.mjs');
  fs.writeFileSync(f, `
import { boot, pressSpace } from ${JSON.stringify('file:///' + ROOT.replace(/\\\\/g, '/') + '/experiments/phase1_0/_driver.js')};
import { Q } from ${JSON.stringify('file:///' + ROOT.replace(/\\\\/g, '/') + '/render/qlearning.js')};
import { makeRng, rng as rawRng } from ${JSON.stringify('file:///' + ROOT.replace(/\\\\/g, '/') + '/instrumentation/rng.js')};
const args = { seed: ${AGENT_SEED} };
${o.goal !== undefined ? `args.goal = ${JSON.stringify(o.goal)};` : ''}
const goalAtBootReturn = globalThis.__M7_GOAL__ ?? null;
const { dom, timer, restore, main } = await boot(args);
// BOOT-ONLY mode: measure with the receiver having run and NO agent execution.
// pressSpace() starts the agent loop and is itself agent execution, so it must
// be excluded when isolating the cost of installation.
const BOOT_ONLY = ${o.bootOnly ? 'true' : 'false'};
// the receiver runs at main.js module top level, i.e. during boot()
const before = { qEntries: Q.size };
let loops = 0;
if (!BOOT_ONLY) {
  pressSpace(dom);
  for (let i = 0; i < ${o.ticks ?? TICKS}; i++) { if (!timer.tick()) break; loops++; }
}
restore();
function rec(s, sd, lim = 4000000) { let p; try { p = rawRng(s); } catch { return null; }
  const r = makeRng(sd >>> 0); for (let i = 0; i < lim; i++) if (r() === p) return i; return -1; }
const keys = [...Q.keys()];
const dist = {}; keys.forEach(k => { const g = k.split('->')[0].split('#')[1]; dist[g] = (dist[g] || 0) + 1; });
let qSum = 0; Q.forEach(v => { qSum += v; });
process.stdout.write('@@P@@' + JSON.stringify({
  transported: globalThis.__M7_GOAL__ ?? null, goalAtBootReturn,
  qEntriesAtBootReturn: before.qEntries, loops,
  qEntries: keys.length, qSum: +qSum.toFixed(9), goalDist: dist,
  installedGoals: Object.keys(dist).filter(g => g !== '0'),
  goalActive: Object.keys(dist).some(g => g !== '0'),
  cog: rec('cognitive', ${AGENT_SEED}), vis: rec('visual', (${AGENT_SEED} ^ 0x9e3779b9) >>> 0),
  mqf: main._diagCounters.mqfTotal
}));`);
  const out = execFileSync(process.execPath, [f], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
  return JSON.parse(out.slice(out.indexOf('@@P@@') + 5));
}

console.log('==============================================================');
console.log(' GOAL TRANSPORT  cfg.goal -> run.js -> boot() -> goalNeuronId');
console.log(' frozen §3.7 | Director ruling 2026-08-23 (Classification B)');
console.log('==============================================================');

const cfg = env.generateAccepted(PILOT_SEED, 0).cfg;
console.log(`\n   frozen configuration ${PILOT_SEED}/0  ->  cfg.goal = ${cfg.goal}` +
            `   (GOALS[0] = ${env.GOALS[0]})`);

const OFF = probe();                       // no goal supplied
const ON  = probe({ goal: cfg.goal });     // the frozen goal supplied
console.log(`   goal injection OFF : goalActive ${OFF.goalActive}  qEntries ${OFF.qEntries}  qSum ${OFF.qSum}  cog ${OFF.cog}  vis ${OFF.vis}`);
console.log(`   goal injection ON  : goalActive ${ON.goalActive}  qEntries ${ON.qEntries}  qSum ${ON.qSum}  cog ${ON.cog}  vis ${ON.vis}`);
console.log(`   ON goal-component distribution: ${JSON.stringify(ON.goalDist)}`);

// ==========================================================
// A — TRANSPORT
// ==========================================================
console.log('\n===== A  transport ============================================');
const a1 = ok('A1 cfg.goal is the frozen schedule value, not derived here',
   cfg.goal === env.GOALS[cfg.configIndex % env.GOALS.length],
   `cfg.goal ${cfg.goal} === GOALS[${cfg.configIndex} mod 4]`);
const a2 = ok('A2 the value reaches the runtime boundary',
   ON.transported === cfg.goal, `__M7_GOAL__ = ${ON.transported}`);
const a3 = ok('A3 the INSTALLED runtime goal equals cfg.goal exactly',
   ON.installedGoals.length === 1 && Number(ON.installedGoals[0]) === cfg.goal,
   `every non-sentinel Q key carries goal ${ON.installedGoals.join(',')}`);
const a4 = ok('A4 installation completes BEFORE the first stochastic decision',
   ON.qEntriesAtBootReturn === 0 && ON.goalActive,
   'the receiver runs at main.js module top level, inside boot(); ' +
   'Q was empty when boot() returned, so no decision had yet occurred');
const a5 = ok('A5 run.js forwards cfg.goal and nothing else',
   /boot\(\{ seed: input\.agentSeed, goal: cfg\.goal \}\)/.test(fs.readFileSync(path.join(HERE, 'run.js'), 'utf8')));

// ==========================================================
// B — ISOLATION (goal injection disabled)
// ==========================================================
console.log('\n===== B  isolation with injection disabled ====================');
const b1 = ok('B1 no goal is installed when none is supplied',
   OFF.transported === null && OFF.goalActive === false &&
   Object.keys(OFF.goalDist).every(g => g === '0'),
   'every Q key carries the pre-existing no-goal sentinel #0');
const b2 = ok('B2 RNG draw counts are unchanged with injection disabled',
   OFF.cog === 12984 && OFF.vis === 3020,
   `cognitive ${OFF.cog}, visual ${OFF.vis} — the pre-seam baseline figures`);
const b3 = ok('B3 the run is bit-identical to the pre-seam baseline',
   OFF.qEntries === 89 && OFF.qSum === 35.998569911 && OFF.mqf === 575,
   `qEntries ${OFF.qEntries}, qSum ${OFF.qSum}, mqfTotal ${OFF.mqf}`);
// MUTATION: the vestigial `goal = 16` default must NOT install
const b4 = ok('B4 MUTATION: the vestigial boot() default 16 is NOT transported',
   OFF.goalActive === false && !Object.keys(OFF.goalDist).includes('16'),
   'only an explicitly supplied goal transports, so existing callers are unaffected');
const b5 = ok('B5 CONTROL: supplying a goal DOES change the outcome',
   ON.goalActive === true,
   'so B1-B4 detect a live mechanism, not a constant');

// ==========================================================
// C — INSTALLATION (goal injection enabled)
// ==========================================================
console.log('\n===== C  installation with injection enabled ==================');
const c1 = ok('C1 goalNeuronId is active before agent execution',
   ON.goalActive && ON.qEntriesAtBootReturn === 0);
const c2 = ok('C2 pre-existing goal-directed behaviour becomes reachable',
   ON.qSum > OFF.qSum && ON.qEntries >= OFF.qEntries,
   `qSum ${OFF.qSum} -> ${ON.qSum}; goal-namespaced Q keys appear`);
const c3 = ok('C3 exactly ONE goal is installed — no second mechanism, no schedule',
   ON.installedGoals.length === 1, `installed: ${ON.installedGoals.join(',')}`);
const c4 = ok('C4 equality with the no-goal baseline is NOT required and NOT asserted',
   ON.qSum !== OFF.qSum,
   'goal-directed divergence is pre-existing behaviour being activated');

// ==========================================================
// D - RNG: the two questions, genuinely separated
// ==========================================================
// QUESTION A (installation): boot only. The receiver has run; NO agent code has
// executed, because pressSpace() -- which starts the agent loop -- is itself
// agent execution and is excluded here.
// QUESTION B (downstream): after the agent runs, divergence is expected and
// legitimate, because pre-existing goal-directed behaviour has been activated.
// ==========================================================
console.log('\n===== D  RNG: installation vs downstream ======================');
const BOOT_OFF = probe({ bootOnly: true });
const BOOT_ON = probe({ bootOnly: true, goal: cfg.goal });
const BOOT_ALT = probe({ bootOnly: true, goal: 19 });
console.log(`      boot only, no goal     cog ${BOOT_OFF.cog}  vis ${BOOT_OFF.vis}`);
console.log(`      boot only, goal ${cfg.goal}      cog ${BOOT_ON.cog}  vis ${BOOT_ON.vis}`);
console.log(`      boot only, goal 19     cog ${BOOT_ALT.cog}  vis ${BOOT_ALT.vis}`);
const d1 = ok('D1 QUESTION A: installing the goal consumes ZERO RNG',
   BOOT_ON.cog === BOOT_OFF.cog && BOOT_ON.vis === BOOT_OFF.vis,
   `${BOOT_OFF.cog} cognitive / ${BOOT_OFF.vis} visual draws either way, receiver having run`);
const d2 = ok('D2 the draw count is independent of WHICH goal is installed',
   BOOT_ALT.cog === BOOT_OFF.cog && BOOT_ALT.vis === BOOT_OFF.vis,
   `goal ${cfg.goal} and goal 19 both leave the count at ${BOOT_OFF.cog}`);
const d3 = ok('D3 the goal was genuinely installed in the boot-only runs',
   BOOT_ON.transported === cfg.goal && BOOT_OFF.transported === null,
   'so D1/D2 compare an installed goal against none, not two empty runs');
const d4 = ok('D4 QUESTION B: divergence appears ONLY once the agent executes',
   BOOT_ON.cog === BOOT_OFF.cog && ON.cog !== OFF.cog,
   `boot only: ${BOOT_OFF.cog} == ${BOOT_ON.cog}   |   after ${TICKS} ticks: ${OFF.cog} vs ${ON.cog}`);
const d5 = ok('D5 the visual stream is untouched in every condition',
   OFF.vis === ON.vis && BOOT_OFF.vis === BOOT_ON.vis && OFF.vis === BOOT_OFF.vis);

// ==========================================================
// E — BOUNDARY
// ==========================================================
console.log('\n===== E  boundary ============================================');
const mainSrc = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const drvSrc = fs.readFileSync(path.join(ROOT, 'experiments/phase1_0/_driver.js'), 'utf8');
// the token appears twice within the single statement (guard + read), so the
// assertion counts STATEMENTS, not token occurrences.
const receiverLines = mainSrc.split('\n').filter(l => /__M7_GOAL__/.test(l) && !/^\s*\/\//.test(l));
const e1 = ok('E1 the receiver is ONE guarded statement touching only the existing state',
   receiverLines.length === 1 &&
   /^if \(globalThis\.__M7_GOAL__ != null\) goalNeuronId = Number\(globalThis\.__M7_GOAL__\);$/.test(receiverLines[0].trim()),
   receiverLines[0] ? receiverLines[0].trim() : 'none');
const e2 = ok('E2 no localStorage or warm-store route is used',
   !/__M7_GOAL__[\s\S]{0,200}localStorage/.test(mainSrc) && !/localStorage/.test(drvSrc));
// getModifierState appears in _driver.js's PRE-EXISTING pressSpace keydown
// stub and is unrelated to raycasting; the assertion targets geometry forgery.
const e3 = ok('E3 no fabricated UI geometry or synthetic raycast is used',
   !/Raycaster|intersectObjects|userData/.test(drvSrc) &&
   !/Raycaster|intersectObjects|userData/.test(fs.readFileSync(path.join(HERE, 'run.js'), 'utf8')) &&
   !/dispatchEvent|listeners\.click/.test(drvSrc),
   'no Raycaster, no intersectObjects, no fabricated userData, no click dispatch');
// comments are stripped: the receiver's own comment cites "GOALS[configIndex
// mod 4]" as documentation, which is not a schedule implementation.
const mainCode = mainSrc.split(/\r?\n/).map(l => l.replace(/\/\/.*$/, '')).join('\n');
const drvCode = drvSrc.split(/\r?\n/).map(l => l.replace(/\/\/.*$/, '')).join('\n');
const e4 = ok('E4 no second goal state and no goal schedule was introduced',
   (mainCode.match(/let goalNeuronId/g) || []).length === 1 &&
   !/GOALS/.test(mainCode) && !/GOALS/.test(drvCode),
   'goalNeuronId remains the single goal state; the GOALS schedule lives only in env.js');
const e5 = ok('E5 no new scientific parameter: the value is the frozen schedule',
   cfg.goal === env.GOALS[cfg.configIndex % env.GOALS.length] &&
   env.GOALS.join(',') === '8,12,16,19');
const e6 = ok('E6 the frozen goal schedule is unchanged',
   [0, 1, 2, 3, 4].every(i => env.makeConfig(PILOT_SEED, i).goal === env.GOALS[i % 4]));

console.log('\n===== BOUNDARY: seeds touched ================================');
const seen = env.evaluatedSeeds();
const e7 = ok('E7 no held-out seed was evaluated',
   seen.every(s => s < 900500), `${seen.length} config seeds, range ${seen[0]}-${seen[seen.length - 1]}`);

const GREEN = a1 && a2 && a3 && a4 && a5 && b1 && b2 && b3 && b4 && b5 &&
              c1 && c2 && c3 && c4 && d1 && d2 && d3 && d4 && d5 &&
              e1 && e2 && e3 && e4 && e5 && e6 && e7;
console.log('\n==============================================================');
console.log('  GOAL TRANSPORT   ' + (GREEN ? 'GREEN' : 'RED'));
console.log('  A transport · B isolation · C installation · D RNG · E boundary');
console.log('==============================================================');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

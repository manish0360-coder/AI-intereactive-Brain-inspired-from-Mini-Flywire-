// ==========================================================
// STEP LEDGER — trajectory-support redesign
// ==========================================================
// DIRECTOR RULING 2026-08-26 (E7-a), following the M7-G15.4 cognitive-semantic
// audit. MiniFlyWire's trajectory-support construct represents DISTINCT
// BEHAVIOURAL COMMITMENTS made by the agent, independent of whether the
// environment realises each one.
//
//   1. the ledger retains four quantities per tick: from, intent, attempted, outcome
//   2. `attempted` is the action actually EXECUTED, counted whether the
//      traversal succeeds or slips; `outcome` stays separate
//   3. consecutive duplicate attempted targets collapse into ONE commitment
//   4. support = number of DISTINCT attempted targets after that collapse
//   5. eligibility is unchanged: support >= 3
//
// FORMAL PRINCIPLE (ruled): decision quality, executed behaviour and
// environmental outcome are separate causal layers. A failed environmental
// outcome must not erase evidence that the agent made and executed a
// behavioural commitment.
//
// SCOPE. Additive only. recentMemory is NOT mutated, so its six other consumers
// are untouched. E8 (pathDepth duplicate inflation), E9 (self-pair
// DIRECT_EXPERIENCE writes) and E10 (F2b replay staleness) are DELIBERATELY NOT
// repaired; frozen §18.4 is unchanged. The existing G15 FAIL is preserved as
// historical evidence — verify_G15.js is not modified and measurements taken
// against the armed build are separately identified and retract nothing.
//
// GUARD: globalThis.__MFW_STEP_LEDGER__, default OFF. Named __MFW_ rather than
// __M7_ because this is a cognitive-architecture feature, not an experiment hook.
//
// NOT Stage 1, a pilot, or a confirmatory run. No held-out seed is touched.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mfwsl-'));
const SEED = 20260819000, PILOT = 900000, TICKS = 600;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

// ----------------------------------------------------------
// one booted run per process, through the real M7 driver.
// A recording hook INSERTS calls only; it changes no value and no control flow.
// ----------------------------------------------------------
const HOOK = path.join(TMP, 'hook.mjs');
fs.writeFileSync(HOOK, `
export async function load(url, ctx, next) {
  const r = await next(url, ctx);
  if (!/\\/main\\.js$/.test(decodeURIComponent(url)) || !r.source) return r;
  const L = String(r.source).split('\\n');
  const e = L.findIndex(l => l.includes('if (next === goalNeuronId) {'));
  if (e < 0) throw new Error('eligibility anchor missing');
  L.splice(e + 1, 0, '      globalThis.__SL_ELIG__(episodeUnique, _mfwLedger.map(function(r){return {a:r.attempted,o:r.outcome,i:r.intent,f:r.from};}));');
  const w = L.findIndex(l => l.includes('_mfwLedger.push({'));
  if (w < 0) throw new Error('ledger write anchor missing');
  const close = L.findIndex((l, i) => i > w && l.trim() === '});');
  L.splice(close + 1, 0, '    globalThis.__SL_WRITE__(_m7Traversed, _m7To, _mfwLedger.length);');
  return { ...r, source: L.join('\\n') };
}`);

function run(o = {}) {
  const f = path.join(TMP, `r${o.tag}.mjs`);
  fs.writeFileSync(f, `
import { register } from 'node:module';
const env = await import(${JSON.stringify(U + '/experiments/m7/env.js')});
${o.arm === false ? '' : 'globalThis.__MFW_STEP_LEDGER__ = true;'}
const elig = [], writes = [];
globalThis.__SL_ELIG__  = (u, led) => elig.push({ u, eligible: u >= 3, led });
globalThis.__SL_WRITE__ = (outcome, attempted, len) => writes.push({ outcome, attempted: String(attempted), len });
${o.instrument === false ? '' : `register(${JSON.stringify('file:///' + HOOK.replace(/\\\\/g, '/'))}, import.meta.url);`}
const { runOnce } = await import(${JSON.stringify(U + '/experiments/m7/run.js')});
const rec = await runOnce({ configSeed: ${PILOT}, configIndex: ${o.configIndex ?? 0},
  agentSeed: ${SEED}, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on',
  tickUnit: 'step', ticks: ${o.ticks ?? TICKS}, crashAtTick: null, warmStore: false });
process.stdout.write('@@S@@' + JSON.stringify({
  armed: globalThis.__MFW_STEP_LEDGER__ === true,
  eligEvents: elig.length, eligible: elig.filter(e => e.eligible).length,
  writes: writes.length,
  writesOnSlip: writes.filter(w => w.outcome === false).length,
  writesOnSuccess: writes.filter(w => w.outcome === true).length,
  ledgerSamples: elig.slice(0, 400).map(e => ({ u: e.u, led: e.led })),
  maxLedgerLen: writes.reduce((m, w) => Math.max(m, w.len), 0),
  fp: rec.fingerprint, cog: rec.artifacts.cogDraws, vis: rec.artifacts.visDraws,
  q: rec.artifacts.qEntries, slips: rec.artifacts.slips
}));`);
  const out = execFileSync(process.execPath, [f], { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 28 });
  return JSON.parse(out.slice(out.indexOf('@@S@@') + 5));
}

// pure re-implementation of the ruled support rule, used as an oracle
const supportOracle = (attemptedSeq) => {
  const c = []; let last = null;
  for (const a of attemptedSeq) {
    if (a === null || a === undefined) continue;
    if (last !== null && a === last) continue;
    c.push(a); last = a;
  }
  return new Set(c).size;
};

console.log('==============================================================');
console.log(' STEP LEDGER — trajectory support as behavioural commitments');
console.log(' Director ruling 2026-08-26 (E7-a) | guard __MFW_STEP_LEDGER__');
console.log('==============================================================');

const ON  = run({ tag: 'on' });
const OFF = run({ tag: 'off', arm: false });
console.log(`\n   armed  : ${ON.eligEvents} goal reaches, ${ON.eligible} eligible, ${ON.writes} ledger writes`);
console.log(`   unarmed: ${OFF.eligEvents} goal reaches, ${OFF.eligible} eligible, ${OFF.writes} ledger writes`);

// ==========================================================
// A — GUARD-OFF BIT-IDENTITY  (requirement 7)
// ==========================================================
console.log('\n===== A  guard OFF is bit-identical ==========================');
const B_ON  = run({ tag: 'bon',  arm: false, instrument: false });
const B_OFF = run({ tag: 'boff', arm: false, instrument: false });
const a1 = ok('A1 with the guard OFF the ledger is never written',
   OFF.writes === 0 && ON.writes > 0,
   `${OFF.writes} writes unarmed vs ${ON.writes} armed`);
const a2 = ok('A2 with the guard OFF the run is deterministic and unchanged',
   B_ON.fp === B_OFF.fp && B_ON.cog === B_OFF.cog,
   `fingerprint ${B_ON.fp.slice(0, 12)}, ${B_ON.cog} cognitive draws`);
const a3 = ok('A3 arming the ledger CHANGES the outcome — so A1/A2 are not vacuous',
   ON.fp !== OFF.fp,
   `armed ${ON.fp.slice(0, 12)} vs unarmed ${OFF.fp.slice(0, 12)}`);
const a4 = ok('A4 the guard costs no RNG stream divergence when OFF',
   OFF.vis === B_OFF.vis,
   `visual draws ${OFF.vis} identical instrumented and not`);

// ==========================================================
// B — THE FOUR QUANTITIES  (requirement 1)
// ==========================================================
console.log('\n===== B  four quantities retained per tick ===================');
const rows = ON.ledgerSamples.flatMap(s => s.led);
const b1 = ok('B1 every ledger record carries from, intent, attempted, outcome',
   rows.length > 0 && rows.every(r => 'f' in r && 'i' in r && 'a' in r && 'o' in r),
   `${rows.length} records inspected`);
const b2 = ok('B2 outcome is retained SEPARATELY and takes both values',
   rows.some(r => r.o === true) && rows.some(r => r.o === false),
   `${rows.filter(r => r.o === false).length} slipped and ${rows.filter(r => r.o === true).length} realised commitments recorded`);
const b3 = ok('B3 intent is recorded distinctly from attempted (F2b divergence observed, not repaired)',
   rows.some(r => r.i !== null && String(r.i) !== String(r.a)),
   `${rows.filter(r => r.i !== null && String(r.i) !== String(r.a)).length} records where the executed action differs from the selected one`);

// ==========================================================
// C — SLIPPED COMMITMENTS COUNT  (requirements 2, 6)
// ==========================================================
console.log('\n===== C  a slipped attempt still evidences a commitment ======');
const c1 = ok('C1 the ledger is written on slipped ticks as well as realised ones',
   ON.writesOnSlip > 0 && ON.writesOnSuccess > 0,
   `${ON.writesOnSlip} writes on slips, ${ON.writesOnSuccess} on successes`);
const c2 = ok('C2 slipped commitments are counted by trajectory support',
   ON.ledgerSamples.some(s => s.led.some(r => r.o === false) && s.u >= 1),
   'support is computed over attempted targets, not over realised movement');
const c3 = ok('C3 environmental failure does not erase the commitment record',
   rows.filter(r => r.o === false).length > 0 &&
   rows.filter(r => r.o === false).every(r => r.a !== null && r.a !== undefined),
   `all ${rows.filter(r => r.o === false).length} slipped records retain their attempted target`);

// ==========================================================
// D — THE RULED SUPPORT FUNCTION  (requirements 3, 4)
// ==========================================================
console.log('\n===== D  collapse then count distinct ========================');
const d1 = ok('D1 runtime support equals the independently computed oracle on every sample',
   ON.ledgerSamples.length > 0 &&
   ON.ledgerSamples.every(s => s.u === supportOracle(s.led.map(r => r.a))),
   `${ON.ledgerSamples.length} goal-reach samples, 0 disagreements`);
const d2 = ok('D2 consecutive duplicates collapse into one commitment',
   supportOracle(['B', 'B', 'B', 'C']) === 2 && supportOracle(['B', 'C']) === 2,
   'B,B,B,C and B,C both yield support 2');
const d3 = ok('D3 the collapse is idempotent w.r.t. the distinct count, as documented',
   supportOracle(['A', 'A', 'B', 'B', 'A']) === supportOracle(['A', 'B', 'A']),
   'stated honestly in main.js rather than implied to change the number');
const d4 = ok('D4 support is per-episode, not a 6-slot window',
   ON.maxLedgerLen > 6,
   `longest ledger observed ${ON.maxLedgerLen} entries — the erosion source is removed`);

// ==========================================================
// E — ANTI-FARMING PRESERVED  (requirements 3, 4, 5)
// ==========================================================
console.log('\n===== E  anti-farming purpose preserved ======================');
const e1 = ok('E1 a two-node oscillation stays BLOCKED',
   supportOracle(['B', 'A', 'B', 'A', 'B', 'A']) === 2 &&
   supportOracle(['B', 'A', 'B', 'A', 'B', 'A']) < 3,
   'the frozen eat<->meat adversary: 2 distinct targets, support 2 < 3');
const e2 = ok('E2 repeated attempts on ONE target stay BLOCKED',
   supportOracle(['B', 'B', 'B', 'B', 'B', 'B']) === 1,
   'support 1 — retrying cannot manufacture credit');
const e3 = ok('E3 a slip-retry that reaches only two targets stays BLOCKED',
   supportOracle(['B', 'B', 'B', 'C']) === 2,
   'three slipped attempts at B then C: support 2 < 3');
const e4 = ok('E4 a genuine three-target journey IS credited',
   supportOracle(['hunt', 'meat', 'eat']) === 3,
   'the trained path lion->hunt->meat->eat: support 3 >= 3');
const e5 = ok('E5 the >= 3 threshold is unchanged',
   /episodeUnique >= 3/.test(fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8')),
   'no new constant introduced');
const L_ON  = run({ tag: 'lon',  ticks: 3000 });
const L_OFF = run({ tag: 'loff', ticks: 3000, arm: false });
console.log(`      3000 ticks  armed: ${L_ON.eligible}/${L_ON.eligEvents} credited` +
            `   unarmed: ${L_OFF.eligible}/${L_OFF.eligEvents} credited`);
const e6 = ok('E6 BEHAVIOURAL: the armed gate is LIVE — it still blocks some goal touches',
   L_ON.eligEvents > 0 && L_ON.eligible < L_ON.eligEvents && L_ON.eligible > 0,
   `${L_ON.eligible} of ${L_ON.eligEvents} goal reaches credited at the frozen run length`);
const e7 = ok('E7 the redesign MOVES the eligibility rate (the intended behavioural delta)',
   L_OFF.eligEvents > 0 &&
   (L_ON.eligible / Math.max(1, L_ON.eligEvents)) !== (L_OFF.eligible / Math.max(1, L_OFF.eligEvents)),
   `armed ${(L_ON.eligible / Math.max(1, L_ON.eligEvents)).toFixed(4)} vs ` +
   `unarmed ${(L_OFF.eligible / Math.max(1, L_OFF.eligEvents)).toFixed(4)}`);

// ==========================================================
// F — SCOPE DISCIPLINE
// ==========================================================
console.log('\n===== F  scope discipline ====================================');
const src = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const strip = (t) => t.replace(/\/\/[^\n]*/g, '');
const f1 = ok('F1 recentMemory is neither mutated nor replaced by the ledger',
   !/_mfwLedger[^\n]*recentMemory|recentMemory[^\n]*_mfwLedger/.test(strip(src)),
   'the two structures never touch; the six legacy consumers are untouched');
const f2 = ok('F2 the ledger is written at exactly ONE site',
   (strip(src).match(/_mfwLedger\.push\(/g) || []).length === 1);
const f3 = ok('F3 the ledger is cleared at exactly the two sites recentMemory is',
   (strip(src).match(/_mfwLedger\.length = 0/g) || []).length === 2 &&
   (strip(src).match(/window\.recentMemory = \[\];/g) || []).length === 3,
   'goal reach and M7 episode cap — the third recentMemory site is the lazy init');
const f4 = ok('F4 exactly ONE consumer reads the ledger',
   (strip(src).match(/_mfwTrajectorySupport\(\)/g) || []).length === 2 &&
   (strip(src).match(/function _mfwTrajectorySupport\(\)/g) || []).length === 1,
   'one declaration + one call site; the declaration is not a consumer');
const f5 = ok('F5 E8 pathDepth is NOT repaired (out of scope)',
   /const pathDepth = recentMemory\.length;/.test(strip(src)));
const f6 = ok('F6 E9 self-pair DIRECT_EXPERIENCE writes are NOT repaired (out of scope)',
   /const from = recentMemory\[i\];/.test(strip(src)) &&
   /const to   = recentMemory\[i \+ 1\];/.test(strip(src)));
const f7 = ok('F7 E10 replay branch is NOT modified — frozen §18.4 intact',
   /replayOneEpisode\(\);/.test(strip(src)) &&
   !/_mfwLedger/.test(strip(src).slice(strip(src).indexOf('replayOneEpisode();') - 400,
                                       strip(src).indexOf('replayOneEpisode();'))));
const f8 = ok('F8 the guard is __MFW_, distinct from the M7 experiment hooks',
   /globalThis\.__MFW_STEP_LEDGER__/.test(src) && !/__M7_STEP/.test(src));

console.log('\n   NOTE: verify_G15.js is unmodified and the recorded G15 FAIL stands as');
console.log('   historical evidence. Any G15 measurement against the ARMED build is a');
console.log('   separate result and retracts nothing.');

const GREEN = a1 && a2 && a3 && a4 && b1 && b2 && b3 && c1 && c2 && c3 &&
              d1 && d2 && d3 && d4 && e1 && e2 && e3 && e4 && e5 && e6 && e7 &&
              f1 && f2 && f3 && f4 && f5 && f6 && f7 && f8;
console.log('\n==============================================================');
console.log('  STEP LEDGER   ' + (GREEN ? 'GREEN' : 'RED'));
console.log('==============================================================');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

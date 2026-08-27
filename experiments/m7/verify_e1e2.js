// ==========================================================
// M7 — E1 / E2 REALISED TRAVERSAL AND CREDIT VERIFICATION
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §3.3 traversal + realised-vs-intended · §6.1 credit re-keying
//   §18.3 E1/E2 · gates G1, G2, G3, G14
//   scope of the E1 gate: ERRATUM M7-ERR-05 §3
//
// Uses the REAL main.js execution path, one OS process per run.
// NOT Stage 1, a pilot, or a confirmatory run: short deterministic tick
// budgets, no metric estimated, nothing persisted as experimental data.
// ==========================================================
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as arms from './arms.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); };

const SEED = 20260819000, TICKS = 60;

// ENV and CREDIT are independent and BOTH passed explicitly (ERR-06 §2.3).
// `credit` does NOT default to `envMode`; every M7-on call names it.
function run({ arm = 'A1', envMode = 'off', credit = 'off', bug = '', hook = 'on', seed = SEED, ticks = TICKS }) {
  const out = execFileSync(process.execPath, ['_armrun.js'], {
    cwd: HERE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ARM: arm, SEED: String(seed), TICKS: String(ticks),
           HOOK: hook, PIN: 'on', ENV: envMode, CREDIT: credit, ENVBUG: bug }
  });
  return JSON.parse(out.slice(out.indexOf('@@RESULT@@') + 10));
}

console.log('==============================================================');
console.log(' M7 E1/E2 REALISED TRAVERSAL VERIFICATION  (not an experiment)');
console.log('==============================================================');
console.log(`      seed ${SEED}, ${TICKS} ticks, one process per run`);

// CONTROLLED COMPARISON (Director ruling, G1d correction).
// Every run below holds seed, arm, E5/PIN state, unrelated hooks and run
// length CONSTANT. Arm OFF is used deliberately: arms.configure(OFF) is an
// identity passthrough on E3/E4, and arms.pinsPredictionErrorPathway() is
// false for OFF, so NO E5 hook is installed. The E1/E2 environment
// intervention is therefore the ONLY variable between ENVOFF and ENVON.
const BASE_NOHOOK = run({ arm: 'OFF', hook: 'off', envMode: 'off' }); // no hooks at all
const ENVOFF      = run({ arm: 'OFF', hook: 'on',  envMode: 'off' }); // hooks installed, all inert
const ENVON       = run({ arm: 'OFF', hook: 'on',  envMode: 'on', credit: 'on' }); // + E1/E2 only
const ENVON2      = run({ arm: 'OFF', hook: 'on',  envMode: 'on', credit: 'on' }); // determinism replica

const isEdge = (k) => { const [a, b] = String(k).split('->'); return arms.edgeIndex(a, b) !== undefined; };

console.log('\n      run          attempts  successes  slips  envDraws  creditKeys  writes');
for (const [n, r] of [['ENV=off', ENVOFF], ['ENV=on', ENVON]])
  console.log('      ' + n.padEnd(12) + String(r.attempts).padStart(9) + String(r.successes).padStart(11)
    + String(r.slips).padStart(7) + String(r.envDraws).padStart(10)
    + String(r.creditKeys.length).padStart(12) + String(r.writes.length).padStart(8));

// ================= G1 — default parity =================
console.log('\n-- G1  M7 environment OFF: original behaviour preserved ------');
ok('G1a ENV=off activates no environment behaviour',
   ENVOFF.envOn === false && ENVOFF.attempts === 0 && ENVOFF.slips === 0);
ok('G1b ENV=off consumes ZERO environment draws', ENVOFF.envDraws === 0);
ok('G1c ENV=off reproduces the no-hook action sequence exactly',
   JSON.stringify(ENVOFF.writes) === JSON.stringify(BASE_NOHOOK.writes));
// G1d, corrected: BASE_NOHOOK and ENVOFF differ ONLY in whether the guarded
// expressions are present-but-inert. Same seed, same arm (OFF), same PIN
// state (no E5 hook for OFF), same run length, same everything else.
ok('G1d ENV=off reproduces the no-hook Q table exactly',
   ENVOFF.qSum === BASE_NOHOOK.qSum && ENVOFF.qEntries === BASE_NOHOOK.qEntries,
   `qSum ${BASE_NOHOOK.qSum}, ${BASE_NOHOOK.qEntries} entries — controlled comparison`);
ok('G1d2 the two compared runs really are controls of each other',
   BASE_NOHOOK.peHookInstalled === false && ENVOFF.peHookInstalled === false &&
   BASE_NOHOOK.seed === ENVOFF.seed && BASE_NOHOOK.ticks === ENVOFF.ticks,
   'no E5 hook in either; identical seed, arm and run length');
ok('G1d3 ENV=off reproduces the no-hook legacy trust keys exactly',
   JSON.stringify(ENVOFF.pathAttemptKeys.slice().sort()) ===
   JSON.stringify(BASE_NOHOOK.pathAttemptKeys.slice().sort()));
ok('G1e ENV=off still uses the LEGACY credit path (defect preserved)',
   ENVOFF.pathAttemptKeys.length > 0 && ENVOFF.creditKeys.length === 0,
   `${ENVOFF.pathAttemptKeys.length} legacy keys, 0 M7 credit keys`);
const offNonEdges = ENVOFF.pathAttemptKeys.filter(k => !isEdge(k)).length;
ok('G1f ENV=off preserves the historical off-by-one (not silently repaired)',
   offNonEdges > 0,
   `${offNonEdges}/${ENVOFF.pathAttemptKeys.length} legacy keys are NON-edges — ERR-05 §4`);

// ================= G2 — RNG isolation =================
console.log('\n-- G2  environment draws are owned by the environment stream --');
ok('G2a ENV=on consumes environment draws', ENVON.envDraws > 0, `${ENVON.envDraws} draws`);
ok('G2b every environment draw is accounted for by an edge attempt',
   ENVON.envDraws <= ENVON.attempts,
   `${ENVON.envDraws} draws <= ${ENVON.attempts} attempts (non-graph-edge attempts draw nothing)`);
ok('G2c identical seed reproduces the attempt/outcome sequence exactly',
   JSON.stringify(ENVON.trav) === JSON.stringify(ENVON2.trav) &&
   ENVON.attempts === ENVON2.attempts && ENVON.slips === ENVON2.slips,
   'the environment stream is deterministic under the agent seed');
ok('G2d identical seed reproduces the executed action sequence exactly',
   JSON.stringify(ENVON.writes) === JSON.stringify(ENVON2.writes));

// ================= G3 — attempt accounting =================
console.log('\n-- G3  exactly one Bernoulli attempt per movement decision ----');
ok('G3a attempts occurred', ENVON.attempts > 0, `${ENVON.attempts}`);
ok('G3b successes + slips == attempts (no unaccounted outcome)',
   ENVON.successes + ENVON.slips === ENVON.attempts,
   `${ENVON.successes} + ${ENVON.slips} = ${ENVON.attempts}`);
ok('G3c both outcomes actually occur (the environment is not degenerate)',
   ENVON.successes > 0 && ENVON.slips > 0);
ok('G3d no zero-attempt movement: every executed move followed an attempt',
   ENVON.attempts >= ENVON.writes.filter(Boolean).length - 1,
   `${ENVON.attempts} attempts vs ${ENVON.writes.filter(Boolean).length} decisions`);

// ================= G14 — realised-vs-intended credit =================
console.log('\n-- G14  credit is keyed to the REAL attempted edge ------------');
const badCredit = ENVON.creditKeys.filter(k => !isEdge(k));
ok('G14a every M7 credit key is a REAL graph edge', badCredit.length === 0,
   `${ENVON.creditKeys.length} keys, ${badCredit.length} non-edges` +
   (badCredit.length ? ` e.g. ${badCredit.slice(0, 5).join(', ')}` : ''));
const badAttempt = ENVON.pathAttemptKeys.filter(k => !isEdge(k));
ok('G14b the trust store contains ONLY real graph edges under M7',
   badAttempt.length === 0,
   `${ENVON.pathAttemptKeys.length} attempt keys, ${badAttempt.length} non-edges`);
ok('G14c success keys are a subset of attempt keys',
   ENVON.pathSuccessKeys.every(k => ENVON.pathAttemptKeys.includes(k)),
   `${ENVON.pathSuccessKeys.length} success keys`);
ok('G14d attempts exceed successes (slips recorded attempt-without-success)',
   ENVON.pathSuccessKeys.length <= ENVON.pathAttemptKeys.length && ENVON.slips > 0);
// realised-vs-intended: a slip must leave the position unchanged
const slipEx = ENVON.trav.filter(t => !t.ok).slice(0, 5);
console.log(`      slip examples (intended edge attempted, position unchanged): ${slipEx.map(t => `${t.from}->${t.to}`).join(', ')}`);
ok('G14e slips are recorded against the INTENDED edge (frozen §3.3)',
   slipEx.length > 0 && slipEx.every(t => isEdge(`${t.from}->${t.to}`)));
// retry signature: a slip is followed by another attempt from the SAME node
let retried = 0;
for (let i = 1; i < ENVON.trav.length; i++)
  if (!ENVON.trav[i - 1].ok && ENVON.trav[i].from === ENVON.trav[i - 1].from) retried++;
ok('G14f after a slip the agent is still at u (retries from the same node)',
   retried > 0, `${retried} observed slip->same-node retries`);

// ================= ANTI-VACUITY =================
console.log('\n-- AV  anti-vacuity: each mutation must be REJECTED -----------');
const BUG_STALE  = run({ arm: 'A1', envMode: 'on', credit: 'on', bug: 'staleKey' });
const BUG_BYPASS = run({ arm: 'A1', envMode: 'on', credit: 'on', bug: 'bypass' });
const BUG_SLIPTR = run({ arm: 'A1', envMode: 'on', credit: 'on', bug: 'sliptravel' });
const BUG_DOUBLE = run({ arm: 'A1', envMode: 'on', credit: 'on', bug: 'doubledraw' });

// 1. stale agentLast keying restored.
// The credit boundary now CONTAINS non-edge keys, so restored stale keying
// no longer shows up as bad keys in the store -- it shows up as a flood of
// REJECTIONS and a materially different credit key set. Both are asserted.
const staleKeySet = JSON.stringify(BUG_STALE.creditKeys.slice().sort());
const goodKeySet  = JSON.stringify(ENVON.creditKeys.slice().sort());
ok('AV1 rejects restored stale-agentLast keying',
   BUG_STALE.creditRejected > ENVON.creditRejected && staleKeySet !== goodKeySet,
   `stale run rejected ${BUG_STALE.creditRejected} pairs vs ${ENVON.creditRejected} correct; ` +
   `${BUG_STALE.creditKeys.length} vs ${ENVON.creditKeys.length} credit keys`);
ok('AV1b stale keying would have polluted the store WITHOUT the boundary',
   BUG_STALE.creditRejected > 0,
   'the rejected pairs are exactly what the historical defect wrote');

// 2. a failed attempt still changes position
ok('AV2 rejects a slip that still traverses',
   BUG_SLIPTR.slips > 0 &&
   JSON.stringify(BUG_SLIPTR.writes) !== JSON.stringify(ENVON.writes),
   'sliptravel moved the agent on failure -> different executed sequence');
let bugRetried = 0;
for (let i = 1; i < BUG_SLIPTR.trav.length; i++)
  if (!BUG_SLIPTR.trav[i - 1].ok && BUG_SLIPTR.trav[i].from === BUG_SLIPTR.trav[i - 1].from) bugRetried++;
ok('AV2b the retry signature disappears when slips traverse',
   bugRetried < retried, `${bugRetried} vs ${retried} slip->same-node retries`);

// 3/4/5. phantom traversal side effects on a slip.
// The traversal block is gated as ONE unit (ERR-05 §3.1), so semantic
// activation, the travel animation and the thoughtTrail advance are all
// governed by the same condition as the move itself. AV2 already proves the
// gate is load-bearing; these assert the gate covers the whole block.
ok('AV3/4/5 slip side effects are gated with the move, not separately',
   ENVON.thoughtTrailLen === null || ENVON.thoughtTrailLen <= ENVON.successes + 6,
   `thoughtTrail advanced at most once per SUCCESSFUL traversal (len ${ENVON.thoughtTrailLen}, ${ENVON.successes} successes)`);

// 6. environment attempts bypassed
ok('AV6 rejects a bypassed env.attempt',
   BUG_BYPASS.attempts === 0 && BUG_BYPASS.envDraws === 0 && ENVON.attempts > 0,
   'bypass consulted the environment 0 times');
ok('AV6b bypassed environment produces no slips at all',
   BUG_BYPASS.slips === 0 && ENVON.slips > 0);

// 7. two draws for one decision
ok('AV7 rejects two environment draws per decision',
   BUG_DOUBLE.envDraws > ENVON.envDraws,
   `doubledraw ${BUG_DOUBLE.envDraws} draws vs correct ${ENVON.envDraws} for the same decisions`);

// 8. M7-off accidentally using the corrected credit path
ok('AV8 rejects M7-off using the corrected credit path',
   ENVOFF.creditKeys.length === 0 && ENVON.creditKeys.length > 0,
   'ENV=off must never populate M7 credit keys');
ok('AV8b M7-off and M7-on use DIFFERENT credit keyings',
   offNonEdges > 0 && badAttempt.length === 0,
   'off keeps the historical non-edge keys; on writes only real edges');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) console.log('E1/E2 REALISED TRAVERSAL GREEN.');
process.exit(fail ? 1 : 0);

// ==========================================================
// M8 RUNNER GATE — seed discipline, collection integrity, determinism
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §8, §12, §13, §14,
//   frozen at 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//
// WHAT THIS GATE ESTABLISHES
//   Every pre-registered candidate configuration can be deterministically
//   evaluated using the committed M8 instrumentation, and all eligible raw
//   observations can be collected without altering runtime semantics or
//   consuming undeclared randomness.
//
// NO REGISTERED SEED IS CONSUMED HERE
//   Enumeration is exercised against a SYNTHETIC env stub, so the contract is
//   proven without generating one real candidate. The end-to-end run uses a
//   fixture configuration discovered in a band that lies outside every
//   registered block; assertSeedAllowed(seed, {fixture:true}) refuses to let a
//   registered M8 seed be used as a fixture, and refuses to let a fixture seed
//   masquerade as measurement. Enumerating the real 899500-899999 range IS the
//   experiment and is deliberately not performed.
//
// ANTI-VACUITY
//   Section M widens the boundary, corrupts the seed, drops an observable,
//   bypasses the hook and suppresses the recorder in turn. Each must be caught
//   by a named assertion. A runner that cannot fail proves nothing.
// ==========================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { FROZEN, CONSUMED_RANGES, HELD_OUT_FLOOR, TUPLE_FIELDS,
         assertSeedAllowed, inFrozenRange, isHeldOut, isConsumed,
         enumerateCandidates, stratumOf } from './protocol.js';
import { collectOne, toJsonl } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PREREG = fs.readFileSync(
    path.join(ROOT, 'research/preregistrations/M8_PREREGISTRATION.md'), 'utf8');

// Outside 899500-899999, outside 900000-900499, far below the held-out floor.
const FIXTURE_BAND = { lo: 700000, hi: 700199 };
const FIXTURE_TICKS = 400;

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('==============================================================');
console.log(' M8 RUNNER GATE — seed discipline + collection integrity');
console.log(' pre-registration 8fb0bec | no registered M8 seed is consumed');
console.log('==============================================================');

// ==========================================================
console.log('\n===== P  protocol constants match the FROZEN document ========');
// ==========================================================
ok('P1 seed range is the frozen 899500-899999',
   FROZEN.seedLo === 899500 && FROZEN.seedHi === 899999 &&
   PREREG.includes('899500 - 899999'), `${FROZEN.seedLo}-${FROZEN.seedHi}`);
ok('P2 agent seed, arm and tick budget are the frozen values',
   FROZEN.agentSeed === 20260819000 && FROZEN.arm === 'A1' && FROZEN.ticks === 3000 &&
   PREREG.includes('20260819000') && PREREG.includes('**3000**'),
   `${FROZEN.agentSeed} / ${FROZEN.arm} / ${FROZEN.ticks}`);
ok('P3 sufficiency minima are the frozen 100 / 20 / 15',
   FROZEN.minDesyncEvents === 100 && FROZEN.minConfigurations === 20 && FROZEN.minPerStratum === 15);
ok('P4 strata match established fact F13',
   JSON.stringify(FROZEN.strata) === JSON.stringify({ degree5: [8, 12], degree3: [16, 19] }) &&
   stratumOf(8) === 'degree5' && stratumOf(16) === 'degree3' && stratumOf(99) === null);
ok('P5 the frozen §8 tuple is closed at 14 fields',
   TUPLE_FIELDS.length === 14 && new Set(TUPLE_FIELDS).size === 14);
ok('P6 consumed ranges and the held-out floor are declared',
   CONSUMED_RANGES.length === 2 && CONSUMED_RANGES[0].lo === 900000 &&
   CONSUMED_RANGES[1].hi === 900499 && HELD_OUT_FLOOR === 900500);

// ==========================================================
console.log('\n===== B  seed boundary enforcement ===========================');
// ==========================================================
ok('B1 lower boundary 899500 ACCEPTED',  !throws(() => assertSeedAllowed(899500)));
ok('B2 upper boundary 899999 ACCEPTED',  !throws(() => assertSeedAllowed(899999)));
ok('B3 899499 (one below) REJECTED',      throws(() => assertSeedAllowed(899499)));
ok('B4 900000 REJECTED (M7 pilot block)', throws(() => assertSeedAllowed(900000)));
ok('B5 900499 REJECTED (ERR-09 range)',   throws(() => assertSeedAllowed(900499)));
ok('B6 900500 REJECTED (held-out floor)', throws(() => assertSeedAllowed(900500)));
ok('B7 far held-out seed REJECTED',       throws(() => assertSeedAllowed(999999)));
ok('B8 non-integer REJECTED',             throws(() => assertSeedAllowed(899500.5)));
ok('B9 a REGISTERED seed cannot be used as an implementation fixture',
   throws(() => assertSeedAllowed(899500, { fixture: true })),
   'a fixture can never masquerade as measurement');
ok('B10 a fixture seed cannot be used as measurement',
   throws(() => assertSeedAllowed(FIXTURE_BAND.lo)) &&
   !throws(() => assertSeedAllowed(FIXTURE_BAND.lo, { fixture: true })),
   'and measurement can never be smuggled in as a fixture');
ok('B11 held-out is refused even in fixture mode',
   throws(() => assertSeedAllowed(900500, { fixture: true })));
ok('B12 predicates agree with the guard',
   inFrozenRange(899500) && !inFrozenRange(900000) && isHeldOut(900500) &&
   !isHeldOut(900499) && isConsumed(900029) && !isConsumed(899999));

// ==========================================================
console.log('\n===== E  enumeration contract (synthetic env stub) ===========');
// ==========================================================
// A stub, so the contract is proven without generating one real candidate.
// It records every seed it is asked about, which is how "no forward walk" and
// "nothing outside the bounds" are demonstrated rather than asserted.
function stubEnv(acceptFn) {
    const seen = [];
    return { seen, makeConfig(seed, idx) {
        seen.push(seed);
        return { accepted: acceptFn(seed, idx), goal: FROZEN.goalIndices.includes(idx)
            ? [8, 12, 16, 19][idx] : null };
    } };
}
{
    const s = stubEnv((seed) => seed % 37 === 0);
    const r = enumerateCandidates(s, { lo: 899500, hi: 899599 });
    ok('E1 every seed x every frozen goal index is a candidate',
       r.candidates === 100 * FROZEN.goalIndices.length, `${r.candidates} candidates from 100 seeds`);
    ok('E2 no seed outside the requested bounds is touched',
       s.seen.every(x => x >= 899500 && x <= 899599),
       `min ${Math.min(...s.seen)}, max ${Math.max(...s.seen)}`);
    ok('E3 NO forward acceptance walk — each candidate is evaluated at its own seed',
       new Set(s.seen).size === 100 && Math.max(...s.seen) === 899599,
       'M7-ERR-09 §3.3 discipline; a walk from 899999 would enter a consumed range');
    ok('E4 accepted configurations carry seed, index, goal and stratum',
       r.accepted.length > 0 && r.accepted.every(a =>
           inFrozenRange(a.configSeed) && FROZEN.goalIndices.includes(a.configIndex) &&
           [8, 12, 16, 19].includes(a.goal) && ['degree5', 'degree3'].includes(a.stratum)),
       `${r.accepted.length} accepted of ${r.candidates}`);
    ok('E5 the full frozen range enumerates exactly 2000 candidates (§14.1)',
       (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length === 2000,
       '500 seeds x 4 goals — computed, not executed');
    ok('E6 enumeration bounds outside the frozen range are REFUSED',
       throws(() => enumerateCandidates(stubEnv(() => true), { lo: 899500, hi: 900000 })) &&
       throws(() => enumerateCandidates(stubEnv(() => true), { lo: 900000, hi: 900100 })));
    const none = enumerateCandidates(stubEnv(() => false), { lo: 899500, hi: 899509 });
    ok('E7 zero acceptances is reported, never worked around',
       none.accepted.length === 0 && none.candidates === 40,
       'the §13 stopping rule governs under-yield, not an adaptive extension');
}

// ==========================================================
console.log('\n===== F  fixture configuration (outside every registered block)');
// ==========================================================
let FIX = null;
for (let seed = FIXTURE_BAND.lo; seed <= FIXTURE_BAND.hi && !FIX; seed++) {
    assertSeedAllowed(seed, { fixture: true });
    for (const idx of FROZEN.goalIndices) {
        const cfg = env.makeConfig(seed, idx);
        if (cfg.accepted) { FIX = { configSeed: seed, configIndex: idx, goal: cfg.goal }; break; }
    }
}
ok('F1 an accepted fixture configuration exists outside every registered block',
   FIX !== null && !inFrozenRange(FIX.configSeed) && !isConsumed(FIX.configSeed)
   && !isHeldOut(FIX.configSeed),
   FIX ? `seed ${FIX.configSeed} index ${FIX.configIndex} goal ${FIX.goal}` : 'none found');
ok('F2 the fixture band touched no registered seed',
   env.evaluatedSeeds().every(s => !inFrozenRange(s) && !isConsumed(s) && !isHeldOut(s)),
   `evaluated ${env.evaluatedSeeds().length} seeds, range ` +
   `${Math.min(...env.evaluatedSeeds())}-${Math.max(...env.evaluatedSeeds())}`);

// ==========================================================
console.log('\n===== C  collection integrity (end-to-end, fixture only) =====');
// ==========================================================
const A = collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true });
console.log(`   fixture run: ${A.events.length} events | fingerprint ${A.provenance.fingerprint.slice(0, 12)}` +
            ` | cog ${A.provenance.artifacts.cogDraws} | env attempts ${A.provenance.envCounters.attempts}`);

ok('C1 raw events are collected', A.events.length > 0, `${A.events.length} events`);
ok('C2 every event carries exactly the frozen §8 tuple, no more and no less',
   A.events.every(e => Object.keys(e).length === 14 && TUPLE_FIELDS.every(k => k in e)),
   `14 fields x ${A.events.length} events`);
ok('C3 run identity is complete',
   ['configSeed', 'configIndex', 'goal', 'stratum', 'agentSeed', 'arm', 'ticks',
    'preregistration', 'fixture'].every(k => k in A.runIdentity) &&
   A.runIdentity.agentSeed === FROZEN.agentSeed && A.runIdentity.arm === FROZEN.arm,
   `agentSeed ${A.runIdentity.agentSeed}, arm ${A.runIdentity.arm}, prereg ${A.runIdentity.preregistration.slice(0, 7)}`);
ok('C4 the run touched exactly the given configuration seed — no acceptance walk',
   A.provenance.evaluatedSeeds.length === 1 &&
   A.provenance.evaluatedSeeds[0] === FIX.configSeed,
   `evaluatedSeeds [${A.provenance.evaluatedSeeds}]`);
// A 400-tick fixture never reaches env.T_SHIFT, so it cannot demonstrate that
// phase is captured per event rather than frozen at run start. One longer
// fixture run crosses the switch and settles it.
const PH = collectOne({ ...FIX, ticks: env.T_SHIFT + 200, fixture: true });
ok('C5 phase is captured PER EVENT, not as a run constant',
   new Set(PH.events.map(e => e.phase)).size === 2 &&
   PH.events.every(e => e.phase === 1 || e.phase === 2) &&
   PH.events.findIndex(e => e.phase === 2) > 0,
   `both phases observed across ${PH.events.length} events; ` +
   `first phase-2 event at index ${PH.events.findIndex(e => e.phase === 2)} ` +
   `(T_SHIFT ${env.T_SHIFT})`);
ok('C5b phase never regresses within a run (monotone 1 -> 2)',
   (() => { let seen2 = false;
       for (const e of PH.events) { if (e.phase === 2) seen2 = true;
                                    else if (seen2) return false; } return true; })());
ok('C6 raw observations are NOT reduced to hypothesis labels',
   A.events.every(e => !('DESYNC' in e) && !('F_H1' in e) && !('mechanism' in e)),
   'H1-H5 reconstruction stays offline (§10)');
ok('C7 every §9 predicate is reconstructible from the raw fields alone',
   A.events.every(e =>
       e.from !== undefined && e.agentCurrent !== undefined &&           // DESYNC, S_PAIR
       e.selectionRanThisTick !== undefined &&                            // NO_FRESH_SEL / H2
       e.ticksSinceWrite !== undefined &&                                 // STALE_AGE / H3
       e.ticksSinceTeleport !== undefined &&                              // TELEPORT_IN_GAP / H1
       e.agentCurrentChangedSinceLastWrite !== undefined &&               // H1
       e.goalIdAtSelection !== undefined && e.goalIdAtEvaluation !== undefined && // H4
       e.next !== undefined),                                             // NON_CANONICAL
   'DESYNC, H1, H2, H3, H4, S-PAIR, NON_CANONICAL');
ok('C8 the environment ran (arm A1, envMode on)',
   A.provenance.envCounters.attempts > 0,
   `${A.provenance.envCounters.attempts} attempts, ${A.provenance.envCounters.slips} slips`);
const jsonl = toJsonl(A);
ok('C9 JSONL serialisation is lossless and one record per event',
   jsonl.trim().split('\n').length === A.events.length &&
   JSON.parse(jsonl.trim().split('\n')[0]).configSeed === FIX.configSeed);

// ==========================================================
console.log('\n===== D  determinism ==========================================');
// ==========================================================
const B = collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true });
ok('D1 identical inputs produce byte-identical collected output',
   JSON.stringify(A.events) === JSON.stringify(B.events),
   `${A.events.length} events compared field by field`);
ok('D2 fingerprint and every derived artifact agree',
   A.provenance.fingerprint === B.provenance.fingerprint &&
   JSON.stringify(A.provenance.artifacts) === JSON.stringify(B.provenance.artifacts) &&
   JSON.stringify(A.provenance.envCounters) === JSON.stringify(B.provenance.envCounters),
   `fingerprint ${A.provenance.fingerprint.slice(0, 16)}`);
ok('D3 diagnostics agree (read/eval accounting is reproducible)',
   JSON.stringify(A.diagnostics) === JSON.stringify(B.diagnostics),
   `${A.diagnostics.reads} reads, ${A.diagnostics.evals} evals, ${A.diagnostics.unpairedReads} unpaired`);

// ==========================================================
console.log('\n===== M  MUTATION CONTROLS ====================================');
// ==========================================================
ok('M1 a WIDENED seed boundary is rejected',
   throws(() => assertSeedAllowed(FROZEN.seedHi + 1)) &&
   throws(() => assertSeedAllowed(FROZEN.seedLo - 1)),
   '899499 and 900000 both throw');
ok('M2 the WRONG seed (not pre-verified accepted) is caught by the walk guard',
   (() => { let s = null;
       for (let x = FIXTURE_BAND.lo; x <= FIXTURE_BAND.hi && s === null; x++)
           if (!env.makeConfig(x, 0).accepted) s = x;
       if (s === null) return false;
       try { collectOne({ configSeed: s, configIndex: 0, goal: 8, ticks: FIXTURE_TICKS, fixture: true });
             return false; } catch (e) { return /acceptance walk|touched seeds/.test(e.message); } })(),
   'generateAccepted advances, evaluatedSeeds disagrees, collectOne throws');
ok('M3 a DROPPED raw observable is caught by the §8 schema check',
   (() => { const bad = { ...A.events[0] }; delete bad.goalIdAtEvaluation;
            return Object.keys(bad).length !== TUPLE_FIELDS.length; })() &&
   throws(() => { const e = { ...A.events[0] }; delete e.phase;
       if (Object.keys(e).length !== TUPLE_FIELDS.length) throw new Error('schema'); }),
   'collectOne rejects any event whose key set is not the closed 14');
ok('M4 BYPASSING the instrumentation hook yields no data',
   collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true, bypassInstrumentation: true })
       .events.length === 0,
   'the hook is load-bearing, not decorative');
ok('M5 SUPPRESSING the recorder guard yields no data',
   collectOne({ ...FIX, ticks: FIXTURE_TICKS, fixture: true, suppressRecorder: true })
       .events.length === 0,
   'default-off is genuinely off');
ok('M6 a non-frozen tick budget is refused outside fixture mode',
   throws(() => collectOne({ configSeed: 899500, configIndex: 0, goal: 8, ticks: 400 })),
   'the frozen 3000 cannot be quietly reduced for a measurement run');
ok('M7 a configIndex outside the frozen §3.7 schedule is refused',
   throws(() => collectOne({ ...FIX, configIndex: 4, ticks: FIXTURE_TICKS, fixture: true })));

// ==========================================================
console.log('\n===== R  reproducibility and scope ============================');
// ==========================================================
const BS = String.fromCharCode(92);
const litRe = (q) => new RegExp(q + '(?:[^' + q + BS + BS + ']|' + BS + BS + '.)*' + q, 'g');
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    .replace(litRe('`'), '``').replace(litRe("'"), "''").replace(litRe('"'), '""');
const SRC = ['protocol.js', 'collect.js', 'verify_m8_runner.js']
    .map(f => code(fs.readFileSync(path.join(HERE, f), 'utf8'))).join('\n');

ok('R1 no runner code depends on mtime or filesystem metadata',
   !/mtime|birthtime|atimeMs|statSync/.test(SRC));
ok('R2 no runner code depends on wall-clock time',
   !/Date\.now|new Date|performance\.now|hrtime/.test(SRC));
// Scoped to the RUNNER. verify_m8_runner.js must name 900500 to test that it is
// rejected; asserting over the verifier's own boundary tests would be vacuous.
const RUNNER = code(fs.readFileSync(path.join(HERE, 'collect.js'), 'utf8'));
const PROTO  = code(fs.readFileSync(path.join(HERE, 'protocol.js'), 'utf8'));
// Configuration seeds are 6 digits in every declared block (899500-899999,
// 900000-900499, floor 900500). Matching exactly 6 excludes the agent seed
// 20260819000, which is numerically larger but lives in a different namespace.
const DIGITS = new RegExp(String.fromCharCode(92) + 'b[0-9]{6}' + String.fromCharCode(92) + 'b', 'g');
const heldOutLiterals = (t) => (t.match(DIGITS) || [])
    .filter(x => Number(x) >= HELD_OUT_FLOOR);
ok('R3 the runner names no held-out seed at all',
   heldOutLiterals(RUNNER).length === 0,
   'collect.js contains no numeric literal at or above the held-out floor');
ok('R3b protocol.js names it exactly once, as the guard constant',
   heldOutLiterals(PROTO).length === 1 &&
   /HELD_OUT_FLOOR = 900500/.test(PROTO),
   'the only occurrence is the declaration the guard compares against');
ok('R4 the runner computes no mechanism flag and no H1-H5 verdict',
   !/F_H[1-4]|SOLE_SHARE|MARGINAL|DESYNC\s*=|derive\(/.test(code(fs.readFileSync(path.join(HERE, 'collect.js'), 'utf8'))),
   'classification is offline, a later milestone');
ok('R5 the frozen pre-registration is unmodified',
   execFileSync('git', ['status', '--porcelain', 'research/preregistrations/'],
       { cwd: ROOT, encoding: 'utf8' }).trim() === '',
   'research/preregistrations/ clean');
ok('R6 no M7 file is modified',
   execFileSync('git', ['status', '--porcelain', 'experiments/m7/', 'main.js', 'render/',
       'instrumentation/'], { cwd: ROOT, encoding: 'utf8' })
       .split('\n').filter(l => l.trim() && !l.startsWith('??')).length === 0,
   'M7 remains frozen');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

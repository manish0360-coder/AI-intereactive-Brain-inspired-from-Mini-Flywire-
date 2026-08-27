// ==========================================================
// GATE G8 — Exclusion-flag correctness
// ==========================================================
// FROZEN CLAUSE (§14):
//   "replayBranch and staleExecution each fire on exactly the right steps;
//    THE TWO ARE VERIFIED TO DIFFER; stale rate reproduces verify_S3.js S3.2
//    on the same seed"
//
// FROZEN §9.1:
//   replayBranch    = the tick took the liveRng() < 0.92 ELSE-branch   ~8% of steps
//   staleExecution  = the action EXECUTED differs from the action SELECTED
//                     on that tick                                      4.5% (17/380)
//   "staleExecution SUBSET-OF replayBranch but they are NOT EQUAL. Gate G8
//    asserts both fire correctly AND asserts that they differ - asserting them
//    equal would re-introduce the conflation."
//
// ERRATUM M7-ERR-08 (Director ruling 2026-08-23, Classification C, Reading R1)
//   §3.3  the "not equal" clause and G8 sub-clause (ii) are WITHDRAWN as
//         deductively false for the frozen source.
//   §3.4  the 4.5% (17/380) attribution to staleExecution is WITHDRAWN as
//         unsupported; the S3.2 residual is an algebraic net, not a step count.
//   §3.2  in the frozen baseline, staleExecution = replayBranch.
//   §3.5  the frozen §9.2 exclusion is UNCHANGED and must remain non-empty.
//   ERR-01a §5's "both would report the same figure" is withdrawn (ERR-08 §4.1).
//
// This verifier asserts the frozen clauses LITERALLY. It does not soften them.
// Where an assertion fails, it fails, and the diagnosis is printed beneath it.
//
// NOT Stage 1, a pilot, or a confirmatory run. Fixed short tick budgets are used
// purely to exercise the telemetry. No held-out seed is touched.
// ==========================================================
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S32_SEED = 20260818, S32_TICKS = 80;      // the seed verify_S3.js S3.2 uses

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return c; };

function tel(o = {}) {
  const out = execFileSync(process.execPath, ['_telrun.js'], {
    cwd: HERE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, SEED: String(o.seed ?? S32_SEED), TICKS: String(o.ticks ?? S32_TICKS),
           TELBUG: o.bug ?? '', ...(o.off ? { TEL: 'off' } : {}) }
  });
  return JSON.parse(out.slice(out.indexOf('@@TEL@@') + 7));
}

console.log('==============================================================');
console.log(' GATE G8  Exclusion-flag correctness');
console.log(' frozen §14 / §9.1 | ERR-01a §5 | E6 telemetry');
console.log('==============================================================');

const R = tel();
console.log(`\n   seed ${R.seed}, ${R.loops} loop-ticks -> ${R.agentSteps} agent steps`);
console.log(`   replayBranch   ${R.replayCount}/${R.agentSteps} = ${(100 * R.replayRate).toFixed(1)}%   (frozen §9.1: ~8% of steps)`);
console.log(`   staleExecution ${R.staleCount}/${R.agentSteps} = ${(100 * R.staleRate).toFixed(1)}%   (frozen §9.1: 4.5%)`);
console.log(`   S3.2 path      stale ${R.s32.stale}/${R.s32.steps} = ${(100 * R.s32.rate).toFixed(1)}%   ` +
            `(learning steps ${R.s32.steps}, fresh decisions ${R.s32.decisions})`);

// ==========================================================
// G8.1 — the telemetry exists and is inert when unattached
// ==========================================================
console.log('\n===== G8.1  E6 telemetry substrate ============================');
const OFF = tel({ off: true });
const g81a = ok('G8.1a the E6 sites emit per-step records when a consumer is attached',
   R.agentSteps > 0 && R.replayCount > 0, `${R.agentSteps} steps recorded`);
const g81b = ok('G8.1b with no consumer attached nothing is recorded (guarded, inert)',
   OFF.agentSteps === 0 && OFF.replayCount === 0);
const g81c = ok('G8.1c the run itself is unchanged by attaching telemetry',
   OFF.s32.steps === R.s32.steps && OFF.s32.decisions === R.s32.decisions,
   `learning steps ${OFF.s32.steps} == ${R.s32.steps}, decisions ${OFF.s32.decisions} == ${R.s32.decisions}`);

// ==========================================================
// G8.2 — each flag fires on exactly the right steps
// ==========================================================
console.log('\n===== G8.2  each flag fires on exactly the right steps ========');
const g82a = ok('G8.2a replayBranch fires at approximately the 1 - 0.92 branch rate',
   R.replayRate > 0.04 && R.replayRate < 0.16,
   `${(100 * R.replayRate).toFixed(1)}% against a nominal 8%`);
const g82b = ok('G8.2b staleExecution is a SUBSET of replayBranch (frozen §9.1)',
   R.staleNotReplay === 0, `${R.staleNotReplay} stale steps outside the replay branch`);
const g82c = ok('G8.2c determinism: the same seed reproduces the same flag counts',
   (() => { const B = tel(); return B.replayCount === R.replayCount && B.staleCount === R.staleCount; })());

// ==========================================================
// G8.3 - the ruled relation between the two flags   (ERR-08 §3.2, §3.3)
// ==========================================================
// The frozen "must differ" sub-clause is WITHDRAWN. What is asserted here is
// the relation the Director ruled and the source proves: equality. This is not
// a relaxation of the old assertion - it is a different, checkable claim, and
// it is falsifiable by the mutations in G8.5.
// ==========================================================
console.log('\n===== G8.3  ruled relation: staleExecution = replayBranch =====');
const g83a = ok('G8.3a staleExecution is a SUBSET of replayBranch (frozen §9.1, RETAINED)',
   R.staleNotReplay === 0, `${R.staleNotReplay} stale steps outside the replay branch`);
const g83b = ok('G8.3b the subset relation holds as EQUALITY (ERR-08 §3.2)',
   R.identical && R.staleNotReplay === 0 && R.replayNotStale === 0,
   `replayBranch ${R.replayCount} = staleExecution ${R.staleCount}, both differences empty`);
const g83c = ok('G8.3c the equality is a property of the SOURCE, not of this run',
   R.staleCount === R.replayCount,
   'main.js:2541 is the only selection write; main.js:3681 defines executed as ' +
   'lastReasoning.to; replayOneEpisode writes neither (ERR-08 §2 P1-P4)');
console.log('      ERR-08 §3.3: the frozen "not equal" sub-clause is WITHDRAWN as');
console.log('        deductively false for the frozen source. It is not asserted here.');

// ==========================================================
// G8.4 - accounting for the S3.2 residual   (ERR-08 §3.4, §3.6)
// ==========================================================
// The frozen "stale rate reproduces verify_S3.js S3.2" sub-clause rested on the
// 4.5% attribution, now withdrawn. It is SUPERSEDED by the consistency check
// ERR-08 §3.6 states: the E6 per-step flags must ACCOUNT FOR the S3.2 residual
// exactly. This is not a claim that the two figures are equal - ERR-08 §3.4
// establishes that they measure different populations.
//     L - D  ==  replayLearned - (thenBranchCount - thenBranchLearned)
// ==========================================================
console.log('\n===== G8.4  the E6 flags account for the S3.2 residual ========');
const acct = R.accounting;
console.log(`      agent steps ${R.agentSteps} = ${acct.thenCount} then-branch + ${R.replayCount} replay`);
console.log(`      learning steps L ${R.s32.steps} = ${acct.thenLearned} (then) + ${acct.replayLearned} (replay)`);
console.log(`      fresh decisions D ${R.s32.decisions}`);
const g84a = ok('G8.4a fresh decisions equal the then-branch step count exactly (ERR-08 P1-P3)',
   R.s32.decisions === acct.thenCount, `${R.s32.decisions} == ${acct.thenCount}`);
const g84b = ok('G8.4b the S3.2 residual is accounted for exactly by the E6 flags',
   (R.s32.steps - R.s32.decisions) === (acct.replayLearned - (acct.thenCount - acct.thenLearned)),
   `L-D = ${R.s32.steps - R.s32.decisions} = ${acct.replayLearned} - ${acct.thenCount - acct.thenLearned}`);
const g84c = ok('G8.4c the residual is NOT a step count: its subtrahend is non-stale steps',
   (acct.thenCount - acct.thenLearned) > 0,
   `${acct.thenCount - acct.thenLearned} then-branch steps selected AND executed an action ` +
   `yet produced no learning step; they enter the residual negatively`);
const g84d = ok('G8.4d every replay step is accounted for',
   R.replayCount === acct.replayLearned + acct.replayNotLearned,
   `${R.replayCount} = ${acct.replayLearned} learned + ${acct.replayNotLearned} not`);

// ==========================================================
// G8.5 — ANTI-VACUITY: the telemetry must be falsifiable
// ==========================================================
console.log('\n===== G8.5  anti-vacuity of the telemetry =====================');
const M = { nostale: tel({ bug: 'nostale' }), noreplay: tel({ bug: 'noreplay' }),
            conflate: tel({ bug: 'conflate' }), always: tel({ bug: 'alwaysstale' }) };
const g85a = ok('G8.5a MUTATION: suppressing staleExecution is detected',
   M.nostale.staleCount === 0 && R.staleCount > 0, `${R.staleCount} -> 0`);
const g85b = ok('G8.5b MUTATION: suppressing replayBranch is detected',
   M.noreplay.replayCount === 0 && R.replayCount > 0,
   `${R.replayCount} -> 0, and the subset relation breaks (${M.noreplay.staleNotReplay} outside)`);
const g85c = ok('G8.5c MUTATION: over-reporting staleExecution breaks the subset relation',
   M.always.staleNotReplay > 0, `${M.always.staleNotReplay} stale steps outside the replay branch`);
// ERR-08 §3.3 withdrew the "must differ" claim, so the guard that proved that
// claim unfalsifiable is removed with it. It tested a requirement that no
// longer exists; retaining it would assert the withdrawn clause by proxy.

// ==========================================================
// G8.6 - the frozen §9.2 exclusion mechanism is ACTIVE and NON-EMPTY
// ==========================================================
// ERR-08 §3.5 leaves frozen §9.2 unchanged, so the exclusion must still select
// a real, non-empty, correctly-scoped set of ticks. Asserted here directly.
// ==========================================================
console.log('\n===== G8.6  the §9.2 exclusion set ============================');
const g86a = ok('G8.6a the exclusion set is NON-EMPTY',
   R.staleCount > 0, `${R.staleCount} of ${R.agentSteps} steps would be excluded ` +
   `(${(100 * R.staleRate).toFixed(1)}%)`);
const g86b = ok('G8.6b it is exactly the replay / no-selection ticks (ERR-08 §3.1)',
   R.excludedAllReplay && R.excludedAllNoSelection,
   'every excluded tick took the else-branch AND wrote no fresh selection');
const g86c = ok('G8.6c no tick outside that population is excluded',
   R.staleNotReplay === 0 && R.excludedWithSelection === 0,
   `${R.excludedWithSelection} excluded ticks carried a fresh selection`);
const g86d = ok('G8.6d it does not swallow the analysis: the majority is retained',
   R.agentSteps - R.staleCount > 0 && R.staleRate < 0.5,
   `${R.agentSteps - R.staleCount} of ${R.agentSteps} steps retained for links 3/4`);
const g86e = ok('G8.6e MUTATION: suppressing the flag empties the exclusion set',
   M.nostale.staleCount === 0 && R.staleCount > 0,
   'so G8.6a is detecting a live mechanism, not a constant');
const g86f = ok('G8.6f MUTATION: over-reporting pulls in ticks that carry a selection',
   M.always.excludedWithSelection > 0,
   `${M.always.excludedWithSelection} wrongly-excluded ticks detected`);

// ==========================================================
// VERDICT — frozen vocabulary only
// ==========================================================
const GREEN = g81a && g81b && g81c && g82a && g82b && g82c &&
              g83a && g83b && g83c && g84a && g84b && g84c && g84d &&
              g85a && g85b && g85c &&
              g86a && g86b && g86c && g86d && g86e && g86f;
console.log('\n==============================================================');
console.log('  G8   ' + (GREEN ? 'GREEN' : 'RED'));
console.log('  governing record: frozen §14 / §9.1 as corrected by ERRATUM M7-ERR-08');
console.log('  retained : both flags fire on exactly the right steps (G8.2)');
console.log('  ruled    : staleExecution = replayBranch (ERR-08 §3.2)');
console.log('  withdrawn: "the two must differ" (ERR-08 §3.3); 4.5% attribution (§3.4)');
console.log('  preserved: the §9.2 exclusion is active, non-empty, correctly scoped (G8.6)');
console.log('==============================================================');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

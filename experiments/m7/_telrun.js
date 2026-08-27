// ==========================================================
// E6 TELEMETRY RUNNER — one booted agent run per process
// ==========================================================
// Consumes the two guarded E6 emission sites in main.js and derives the two
// frozen §9.1 exclusion flags PER STEP:
//
//   replayBranch    the step took the `liveRng() < 0.92` ELSE-branch
//                   (replayOneEpisode) -- reported directly by the decision site
//   staleExecution  the action EXECUTED differs from the action SELECTED on
//                   that step. `runPrediction` writes `lastReasoning` when it
//                   selects; on a step with no fresh write the previously
//                   selected action is what gets executed, so "no fresh write
//                   during this step" IS the frozen predicate.
//
// The lastReasoning accessor is the SAME external instrumentation technique
// already used by phase1_0/_runonce.js and _probe_stale.js, so the two
// measurement paths observe the same underlying events (ERR-01a §5).
//
// TELBUG= mutations exist so G8 can prove its assertions are not vacuous:
//   nostale     staleExecution is never reported
//   noreplay    replayBranch is never reported
//   conflate    staleExecution is forced equal to replayBranch (the frozen
//               §9.1 conflation G8 exists to rule out)
//   alwaysstale staleExecution is reported on every step
//
// One process per run: main.js is an ESM singleton with top-level side effects.
// NOT Stage 1, a pilot, or a confirmatory run.
// ==========================================================
import { boot, pressSpace } from '../phase1_0/_driver.js';

const SEED   = Number(process.env.SEED  ?? 20260818);
const TICKS  = Number(process.env.TICKS ?? 80);
const TELBUG = process.env.TELBUG ?? '';
const TEL_OFF = process.env.TEL === 'off';

const { dom, timer, restore, main } = await boot({ seed: SEED });
const _diag = main._diagCounters;

// ---- external recorder on lastReasoning: counts fresh SELECTIONS ----
const writes = [];
let _lr = globalThis.lastReasoning;
Object.defineProperty(globalThis, 'lastReasoning', {
  configurable: true,
  get() { return _lr; },
  set(v) { _lr = v; writes.push(v ? `${v.from}->${v.to}` : null); }
});

// ---- E6 consumer ----
const steps = [];                 // one record per runAgent() call
let cur = null;
function closeStep() {
  if (!cur) return;
  const freshSelections = writes.length - cur.writesAtStart;
  const learned = _diag.mqfTotal - cur.mqfAtStart;
  // frozen §9.1: executed differs from selected on this step <=> no fresh
  // selection was written during the step.
  let stale = freshSelections === 0;
  let replay = cur.replay;
  if (TELBUG === 'nostale') stale = false;
  if (TELBUG === 'noreplay') replay = false;
  if (TELBUG === 'conflate') stale = replay;
  if (TELBUG === 'alwaysstale') stale = true;
  steps.push({ replayBranch: replay, staleExecution: stale, learned,
               freshSelections, executed: writes[writes.length - 1] ?? null });
  cur = null;
}
if (!TEL_OFF) {
  globalThis.__M7_TEL__ = {
    step() { closeStep(); cur = { replay: false, writesAtStart: writes.length,
                                  mqfAtStart: _diag.mqfTotal }; },
    replayBranch() { if (cur) cur.replay = true; }
  };
}

const diag = main._diagCounters;
const mqf0 = diag.mqfTotal;

pressSpace(dom);
let loops = 0;
for (let i = 0; i < TICKS; i++) { if (!timer.tick()) break; loops++; }
closeStep();                                    // flush the final step
restore();

// ---- the S3.2 measurement path, computed here on the SAME run ----
// verify_S3.js / _runonce.js compute: steps = delta(mqfTotal), decisions =
// lastReasoning writes, stale = steps - decisions. Reproduced verbatim.
const s32Steps     = diag.mqfTotal - mqf0;
const s32Decisions = writes.length;
const s32Stale     = Math.max(0, s32Steps - s32Decisions);

// ERR-08 §3.6 accounting: the S3.2 residual decomposes over the E6 flags as
//   L - D  ==  replayLearned - (thenCount - thenLearned)
const thenSteps = steps.filter(s => !s.replayBranch);
const replaySteps = steps.filter(s => s.replayBranch);
const accounting = {
  thenCount: thenSteps.length,
  thenLearned: thenSteps.filter(s => s.learned > 0).length,
  replayLearned: replaySteps.filter(s => s.learned > 0).length,
  replayNotLearned: replaySteps.filter(s => s.learned === 0).length
};
// frozen §9.2 exclusion set = the ticks where staleExecution === true
const excluded = steps.filter(s => s.staleExecution);
const excludedAllReplay = excluded.every(s => s.replayBranch);
const excludedAllNoSelection = excluded.every(s => s.freshSelections === 0);
const excludedWithSelection = excluded.filter(s => s.freshSelections > 0).length;

const replayCount = steps.filter(s => s.replayBranch).length;
const staleCount  = steps.filter(s => s.staleExecution).length;
const both        = steps.filter(s => s.replayBranch && s.staleExecution).length;
const staleNotReplay = steps.filter(s => s.staleExecution && !s.replayBranch).length;
const replayNotStale = steps.filter(s => s.replayBranch && !s.staleExecution).length;

process.stdout.write('@@TEL@@' + JSON.stringify({
  seed: SEED, ticksRequested: TICKS, loops, telBug: TELBUG, telOff: TEL_OFF,
  agentSteps: steps.length,
  replayCount, staleCount, both, staleNotReplay, replayNotStale,
  accounting, excludedAllReplay, excludedAllNoSelection, excludedWithSelection,
  identical: replayCount === staleCount && staleNotReplay === 0 && replayNotStale === 0,
  subset: staleNotReplay === 0,
  replayRate: steps.length ? +(replayCount / steps.length).toFixed(4) : null,
  staleRate: steps.length ? +(staleCount / steps.length).toFixed(4) : null,
  s32: { steps: s32Steps, decisions: s32Decisions, stale: s32Stale,
         rate: s32Steps ? +(s32Stale / s32Steps).toFixed(4) : null },
  writes
}));

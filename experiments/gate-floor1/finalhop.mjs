// ==========================================================
// GATE-FLOOR-1 — final-hop retry diagnostic (pure; no I/O, no clock, no ambient randomness)
// ==========================================================
// DESCRIPTIVE, NOT CONFIRMATORY.  Added after the independent review (PASS WITH CLAIM LIMITS) to answer: does the benefit
// come with disproportionate retrying of the LAST hop (an agent camping on the goal edge and re-drawing its
// reliability) rather than with more goal-entering traversals per unit of effort?
//
// Event semantics (the runtime's own, not inferred from positions): the measurement sink records one record per
// ENVIRONMENT DRAW, [call, from, to, ok, goalEntering, a, s], where `ok` is the draw's outcome (the traversal happened
// or the move slipped).  A FINAL-HOP ATTEMPT is a draw on a legal graph edge `from -> goal` into the ACTIVE goal.  A
// failed attempt is such a draw with ok = 0 (a slip: the agent stays at `from`); a successful traversal is one with
// ok = 1 (and is exactly a goal reach).  Nothing is inferred from repeated visits to a node.
//
//   failuresPerSuccess = failures / successes            (null when successes = 0; such a session is REPORTED, not dropped)
//   maxFailureRun      = longest run of failed final-hop attempts with no successful one between them
//
// Aggregation over sessions pools the counts (ratio of sums), so a session with zero successes contributes its failures
// to the numerator and nothing to the denominator instead of disappearing.  Comparisons are paired by world: one common
// bootstrap resample of worlds is applied to every arm.
// ==========================================================
import { prng, pairedSummary } from '../xfer1/stats.mjs';

/** one session: final-hop events from the sink's draw records */
export function finalHopFromAttempts(attempts, goal, isEdge) {
  const events = [];
  for (const a of attempts) {
    const call = a[0], from = a[1], to = a[2], ok = a[3];
    if (Number(to) !== Number(goal)) continue;                       // not entering the active goal
    if (Number(from) === Number(to) || !isEdge(from, to)) continue;  // not a legal graph edge
    events.push([call, Number(from), ok === 1 ? 1 : 0]);
  }
  return { ...summarizeEvents(events), events };
}

/** the single aggregator of one session's events: [[call, from, ok], ...] in draw order */
export function summarizeEvents(events) {
  let failures = 0, successes = 0, run = 0, maxFailureRun = 0;
  for (const e of events) {
    if (e[2] === 1) { successes++; run = 0; } else { failures++; run++; if (run > maxFailureRun) maxFailureRun = run; }
  }
  return { attempts: events.length, failures, successes, failuresPerSuccess: successes > 0 ? failures / successes : null, zeroSuccess: successes === 0, maxFailureRun };
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const median = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** one arm over a set of sessions (summaries as returned by summarizeEvents) */
export function poolArm(summaries) {
  const attempts = summaries.reduce((s, x) => s + x.attempts, 0), failures = summaries.reduce((s, x) => s + x.failures, 0), successes = summaries.reduce((s, x) => s + x.successes, 0);
  const defined = summaries.filter(x => x.failuresPerSuccess !== null).map(x => x.failuresPerSuccess);
  return {
    sessions: summaries.length, zeroSuccessSessions: summaries.filter(x => x.zeroSuccess).length,
    attempts, failures, successes,
    failuresPerSuccess: successes > 0 ? failures / successes : null,           // pooled: zero-success sessions are inside the totals
    attemptsPerSuccess: successes > 0 ? attempts / successes : null,
    meanSessionRatio: mean(defined), medianSessionRatio: median(defined), sessionsWithRatio: defined.length,   // over sessions with >= 1 success only
    maxFailureRun: summaries.reduce((m, x) => Math.max(m, x.maxFailureRun), 0),
    meanFailuresPerSession: mean(summaries.map(x => x.failures)),
  };
}

/**
 * Paired comparison of two arms over the SAME worlds (A[i] and B[i] are the summaries of world i).
 *   pooledRatio: difference of pooled failures/successes, percentile bootstrap over worlds with ONE resample applied to both
 *                arms (replicates where either arm has no success are counted and skipped);
 *   failures:    paired per-world difference in failed attempts (no ratio, defined for every world).
 */
export function pairedRetryComparison(A, B, { replicates, seed, level }) {
  if (A.length !== B.length) throw new Error('paired comparison needs the same worlds in both arms');
  const n = A.length;
  const total = (S, idx, f) => idx.reduce((s, i) => s + S[i][f], 0);
  const ratio = (S, idx) => { const su = total(S, idx, 'successes'); return su > 0 ? total(S, idx, 'failures') / su : null; };
  const all = Array.from({ length: n }, (_, i) => i);
  const ra = ratio(A, all), rb = ratio(B, all);
  const r = prng(seed), diffs = [];
  let undefinedReplicates = 0;
  for (let b = 0; b < replicates; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(r() * n));      // the SAME worlds for both arms
    const x = ratio(A, idx), y = ratio(B, idx);
    if (x === null || y === null) { undefinedReplicates++; continue; }
    diffs.push(x - y);
  }
  diffs.sort((p, q) => p - q);
  const lo = (1 - level) / 2, hi = 1 - lo;
  const at = (q) => diffs[Math.min(diffs.length - 1, Math.max(0, Math.floor(q * diffs.length)))];
  return {
    n, ratioA: ra, ratioB: rb, difference: ra !== null && rb !== null ? ra - rb : null,
    ci: diffs.length ? { lower: at(lo), upper: at(hi) } : null, replicatesUsed: diffs.length, undefinedReplicates,
    failures: pairedSummary(A.map((x, i) => x.failures - B[i].failures), { replicates, seed, level }),
  };
}

/** descriptive direction of an interval relative to zero (a reading, NOT a pass/fail threshold) */
export const intervalDirection = (ci) => (ci === null ? 'UNDEFINED' : ci.lower > 0 ? 'HIGHER' : ci.upper < 0 ? 'LOWER' : 'NOT_DISTINGUISHABLE');

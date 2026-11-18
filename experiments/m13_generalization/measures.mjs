// ==========================================================
// M13 — from belief to behaviour: what an agent did on each reopened edge (EVALUATION ONLY)
// ==========================================================
// Input: the environment's own step log (GraphEnv.trace(), runner-only ground truth: [episode, t, node, action, node
// after, reward], one row per step of the whole run), the world, the task's schedule (planE5) and the E5 row. Nothing
// here reaches an agent; it runs after the agent's last step. It works the same for every arm, so MBVI3's behaviour is
// measured exactly as BELIEF's (the gap M12 left).
//
// Event windows are rebuilt from the row: the change phase starts at trace length - row.metric, and each live event
// takes row.events[k].blocked then row.events[k].after steps (the M12 reconstruction).
// For each reversing event (an edge blocked, then reopened):
//   met            the agent tried the edge (either direction) while it was blocked, in the event's blocked window;
//   crossedOwn     moves across the edge in the event's own after-window (what task E5 counts as `crossed`);
//   crossedLater   moves across it after that window, to the end of the run (what M11 did not count);
//   returned       crossedOwn + crossedLater > 0;
//   delay          steps from the reopening to the first move across it (null if none).
// metAndReturned (the G4 count) = reversing events with met and returned.
// verifyAgainstRow checks, for every live event, that the attempts and crossings in the own after-window equal the
// task's own ownAfterAttempts and crossed; the driver throws on any difference.
// ==========================================================
import { edgeKey } from '../../cognitive/testbed/worlds.mjs';

export function windowsOf(row, traceLength, plan) {
  let t = traceLength - row.metric;
  const spans = [];
  plan.events.forEach((e, k) => {
    if (e.skipped) return;
    const ev = row.events[k];
    const blockAt = t, afterAt = t + ev.blocked, endAt = afterAt + ev.after;
    spans.push({ k, key: edgeKey(...e.edge), reverses: e.reverses, blockAt, afterAt, endAt });
    t = endAt;
  });
  if (t !== traceLength) throw new Error(`event windows end at ${t}, the trace has ${traceLength} steps`);
  return spans;
}

export function returnMeasures(world, trace, row, plan) {
  const keyOf = (r) => edgeKey(r[2], world.exitOrder[r[2]][r[3]]);
  const spans = windowsOf(row, trace.length, plan);
  const keys = trace.map(keyOf), moved = trace.map((r) => r[2] !== r[4]);
  const events = spans.map((sp) => {
    let attemptsOwn = 0, crossedOwn = 0, crossedLater = 0, met = false, first = null;
    for (let i = sp.blockAt; i < trace.length; i++) {
      if (keys[i] !== sp.key) continue;
      if (i < sp.afterAt) { met = true; continue; }
      if (i < sp.endAt) { attemptsOwn++; if (moved[i]) crossedOwn++; } else if (moved[i]) crossedLater++;
      if (moved[i] && first === null) first = i;
    }
    return { k: sp.k, reverses: sp.reverses, met, attemptsOwn, crossedOwn, crossedLater, returned: sp.reverses && crossedOwn + crossedLater > 0, delay: sp.reverses && first !== null ? first - sp.afterAt : null };
  });
  const rev = events.filter((e) => e.reverses);
  return {
    events,
    reversing: rev.length,
    met: rev.filter((e) => e.met).length,
    metAndReturned: rev.filter((e) => e.met && e.returned).length,
    returnedOwn: rev.filter((e) => e.crossedOwn > 0).length,
    returnedOnlyLater: rev.filter((e) => e.crossedOwn === 0 && e.crossedLater > 0).length,
    crossingsOwn: rev.reduce((s, e) => s + e.crossedOwn, 0),
    crossingsLater: rev.reduce((s, e) => s + e.crossedLater, 0),
    delays: rev.filter((e) => e.met && e.delay !== null).map((e) => e.delay),
  };
}

/** Throws unless the own-window counts agree with the task's own diagnostics for every live event. */
export function verifyAgainstRow(measures, row) {
  for (const e of measures.events) {
    const ev = row.events[e.k];
    if (ev.ownAfterAttempts !== e.attemptsOwn) throw new Error(`${row.world} ${row.family} event ${e.k}: ${e.attemptsOwn} own-window attempts, the task counted ${ev.ownAfterAttempts}`);
    if (e.reverses && ev.crossed !== e.crossedOwn) throw new Error(`${row.world} ${row.family} event ${e.k}: ${e.crossedOwn} own-window crossings, the task counted ${ev.crossed}`);
  }
  return true;
}

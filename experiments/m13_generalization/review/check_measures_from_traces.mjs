// Supplementary audit check for the M13 review package, written 2026-11-18 AFTER the result (not part of the
// reading, and not the pre-result independent check). It addresses one auditability gap: G4's inputs (`met` and
// `crossedLater`) are computed by measures.mjs from the environment's own step log (GraphEnv.trace()), which the result
// file does not store. The 18 traced runs do store a second, separate step log: the passive recorder's
// (experiments/m11_routes/trace.mjs, one entry per observe, before the agent updates, with the task's ground truth for
// the exit tried). This script rebuilds every reversing event's measures from that recorder log with its own code and
// compares them with the stored row.m13.events. It also checks that the ground truth the recorder saw agrees with the
// reconstructed event windows (blocked while the event's edge is blocked, open in its own after-window).
// It imports nothing from the repository.
// Usage: node check_measures_from_traces.mjs <path to m13_result.json>
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2]));
const key = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);
let bad = 0, events = 0, compared = 0, groundTruthChecks = 0;
const fail = (msg) => { bad++; console.log(`FAIL  ${msg}`); };
for (const t of j.traces) {
  const row = j.rows.find((r) => r.world === t.world && r.family === t.family && r.arm === t.arm);
  const S = t.steps; // [t, from, to, moved, blocked, pWorks]
  if (!S.every((s, i) => s[0] === i)) fail(`${t.world} ${t.family} ${t.arm}: recorder steps are not consecutive`);
  let at = S.length - row.metric;
  const mine = [];
  t.schedule.forEach((e, k) => {
    if (e.skipped) return;
    const ev = row.events[k], blockAt = at, afterAt = at + ev.blocked, endAt = afterAt + ev.after, K = key(...e.edge);
    at = endAt;
    let met = false, attemptsOwn = 0, crossedOwn = 0, crossedLater = 0, first = null;
    for (let i = blockAt; i < S.length; i++) {
      const s = S[i];
      if (key(s[1], s[2]) !== K) continue;
      if (i < afterAt) { met = true; groundTruthChecks++; if (s[4] !== 1 || s[3] !== 0) fail(`${t.world} ${t.family} ${t.arm} event ${k}: a try at t=${i} in the blocked window is not recorded as blocked and failed`); continue; }
      if (i < endAt) { attemptsOwn++; if (s[3]) crossedOwn++; if (e.reverses) { groundTruthChecks++; if (s[4] !== 0) fail(`${t.world} ${t.family} ${t.arm} event ${k}: a try at t=${i} in the own after-window of a reversing event is recorded as blocked`); } }
      else if (s[3]) crossedLater++;
      if (s[3] && first === null) first = i;
    }
    mine.push({ k, reverses: e.reverses, met, attemptsOwn, crossedOwn, crossedLater, returned: e.reverses && crossedOwn + crossedLater > 0, delay: e.reverses && first !== null ? first - afterAt : null });
  });
  if (at !== S.length) fail(`${t.world} ${t.family} ${t.arm}: event windows end at ${at}, the recorder log has ${S.length} steps`);
  const stored = row.m13.events;
  if (stored.length !== mine.length) fail(`${t.world} ${t.family} ${t.arm}: ${stored.length} stored events, ${mine.length} rebuilt`);
  for (const m of mine) {
    events++;
    const s = stored.find((x) => x.k === m.k);
    compared++;
    if (!s || JSON.stringify(s) !== JSON.stringify(m)) fail(`${t.world} ${t.family} ${t.arm} event ${m.k}: stored ${JSON.stringify(s)} rebuilt ${JSON.stringify(m)}`);
  }
  const rev = mine.filter((e) => e.reverses);
  const g4 = rev.filter((e) => e.met && e.returned).length;
  if (g4 !== row.m13.metAndReturned) fail(`${t.world} ${t.family} ${t.arm}: metAndReturned stored ${row.m13.metAndReturned}, rebuilt ${g4}`);
  console.log(`${t.world} ${t.family} ${t.arm}: ${S.length} recorder steps; ${mine.length} live events (${rev.length} reversing); met ${rev.filter((e) => e.met).length}, met and returned ${g4} (stored ${row.m13.metAndReturned})`);
}
console.log(`\n${j.traces.length} traces, ${events} live events rebuilt from the recorder log, ${compared} compared field by field with row.m13.events, ${groundTruthChecks} ground-truth window checks; ${bad === 0 ? 'all agree' : `${bad} FAILURES`}`);
process.exit(bad === 0 ? 0 : 1);

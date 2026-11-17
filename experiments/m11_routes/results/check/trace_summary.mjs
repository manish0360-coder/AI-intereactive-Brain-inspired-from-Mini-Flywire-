// Descriptive summary of the 18 pre-chosen traces (labels 0-2, all families, both arms), written after the result.
// It is descriptive only: no test, no selection; every trace is listed.
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2]));
const row = (w, f, a) => j.rows.find((r) => r.world === w && r.family === f && r.arm === a);
for (const w of ['mfw|m11|0', 'mfw|m11|1', 'mfw|m11|2']) for (const f of ['RARE', 'HALF', 'OFTEN']) {
  const rb = row(w, f, 'BELIEF'), rm = row(w, f, 'MBVI3');
  const tb = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'BELIEF');
  const tm = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'MBVI3');
  const sameActions = tb.steps.length === tm.steps.length && tb.steps.every((s, i) => s[1] === tm.steps[i][1] && s[2] === tm.steps[i][2]);
  const firstDiff = sameActions ? null : tb.steps.findIndex((s, i) => !tm.steps[i] || s[1] !== tm.steps[i][1] || s[2] !== tm.steps[i][2]);
  const blockedTries = (t) => t.steps.filter((s) => s[4] === 1).length;
  console.log(`${w} ${f}: total B ${rb.metric} M ${rm.metric}; crossings B ${rb.events.map((e) => e.crossed).join('')} M ${rm.events.map((e) => e.crossed).join('')}; reverses ${rb.events.map((e) => (e.reverses ? 'R' : 'P')).join('')}; failed tries on blocked edges B ${blockedTries(tb)} M ${blockedTries(tm)}; same actions ${sameActions}${firstDiff !== null ? ` (first difference at step index ${firstDiff}, t=${tb.steps[firstDiff]?.[0]})` : ''}; B archives ${tb.beliefEvents.filter((e) => e.type === 'open').length} opened, ${tb.beliefEvents.filter((e) => e.type !== 'open').length} other`);
  // for each followed exit, p at the end of each blocked stretch for both arms
  for (const fb of tb.followed) {
    const fm = tm.followed.find((x) => x.from === fb.from && x.to === fb.to);
    const ends = (pts) => pts.filter((p, i) => i > 0 && pts[i - 1][2] === 1 && p[2] === 0).map((p) => `t${p[0]}:${p[1]}`);
    console.log(`    ${fb.fromLabel}->${fb.toLabel}: p at each reopening B [${ends(fb.points).join(' ')}] M [${fm ? ends(fm.points).join(' ') : 'not followed'}]`);
  }
}

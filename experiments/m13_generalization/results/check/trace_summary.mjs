// Descriptive summary of the 18 pre-chosen traces (labels 0-2, all families, BELIEF and MBVI3), written after the
// result. Adapted from experiments/m11_routes/results/check/trace_summary.mjs. Descriptive only: no test, no
// selection; every trace is listed. Returns come from the stored M13 behaviour measures (row.m13.events).
// Usage: node trace_summary.mjs <path to m13_result.json>
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2]));
const row = (w, f, a) => j.rows.find((r) => r.world === w && r.family === f && r.arm === a);
const reopen = { higher: 0, lower: 0, equal: 0 };
let maxB = 0, maxM = 0;
for (const w of ['m13|modular|0', 'm13|modular|1', 'm13|modular|2']) for (const f of ['RARE', 'HALF', 'OFTEN']) {
  const rb = row(w, f, 'BELIEF'), rm = row(w, f, 'MBVI3');
  const tb = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'BELIEF');
  const tm = j.traces.find((t) => t.world === w && t.family === f && t.arm === 'MBVI3');
  const sameActions = tb.steps.length === tm.steps.length && tb.steps.every((s, i) => s[1] === tm.steps[i][1] && s[2] === tm.steps[i][2]);
  const firstDiff = sameActions ? null : tb.steps.findIndex((s, i) => !tm.steps[i] || s[1] !== tm.steps[i][1] || s[2] !== tm.steps[i][2]);
  const blockedTries = (t) => t.steps.filter((s) => s[4] === 1).length;
  const ret = (r) => r.m13.events.filter((e) => e.reverses).map((e) => (e.returned ? (e.crossedOwn > 0 ? 'O' : 'L') : e.met ? 'm' : '.')).join('');
  console.log(`${w} ${f}: total B ${rb.metric} M ${rm.metric}; reverses ${rb.events.map((e) => (e.reverses ? 'R' : 'P')).join('')}; reversing events (O returned in own window, L only later, m met and not returned, . neither) B ${ret(rb) || '-'} M ${ret(rm) || '-'}; failed tries on blocked edges B ${blockedTries(tb)} M ${blockedTries(tm)}; same actions ${sameActions}${firstDiff !== null ? ` (first difference at step index ${firstDiff}, t=${tb.steps[firstDiff]?.[0]})` : ''}; B archives ${tb.beliefEvents.filter((e) => e.type === 'open').length} opened, ${tb.beliefEvents.filter((e) => e.type !== 'open').length} other`);
  // for each followed exit, p at each reopening (first point after a blocked stretch) for both arms
  const ends = (pts) => pts.filter((p, i) => i > 0 && pts[i - 1][2] === 1 && p[2] === 0).map((p) => [p[0], p[1]]);
  for (const fb of tb.followed) {
    const fm = tm.followed.find((x) => x.from === fb.from && x.to === fb.to);
    const eb = ends(fb.points), em = fm ? ends(fm.points) : [];
    // the i-th reopening of the same exit in each trace is the same scheduled event (times differ once the runs diverge)
    eb.forEach(([, p], i) => {
      maxB = Math.max(maxB, p);
      const m = em[i];
      if (m) { reopen[p > m[1] ? 'higher' : p < m[1] ? 'lower' : 'equal']++; }
    });
    for (const [, p] of em) maxM = Math.max(maxM, p);
    console.log(`    ${fb.from}->${fb.to}: p at each reopening B [${eb.map(([t, p]) => `t${t}:${p}`).join(' ')}] M [${fm ? em.map(([t, p]) => `t${t}:${p}`).join(' ') : 'not followed'}]`);
  }
  for (const fm of tm.followed) if (!tb.followed.some((x) => x.from === fm.from && x.to === fm.to)) {
    const em = ends(fm.points);
    for (const [, p] of em) maxM = Math.max(maxM, p);
    console.log(`    ${fm.from}->${fm.to}: followed for M only, p at each reopening M [${em.map(([t, p]) => `t${t}:${p}`).join(' ')}]`);
  }
}
console.log(`\nreopenings followed in both arms' traces: BELIEF's p higher ${reopen.higher}, lower ${reopen.lower}, equal ${reopen.equal}; highest p at a reopening B ${maxB}, M ${maxM}`);

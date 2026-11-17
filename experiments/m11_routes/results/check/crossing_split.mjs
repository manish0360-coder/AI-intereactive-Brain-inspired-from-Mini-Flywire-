// Descriptive split, written after the result: per family, labels grouped by which arm crossed a reopened edge in its
// after-window at least once. For each group: the summed MBVI3 - BELIEF difference in afterReversed and in total steps.
// Descriptive only; not part of the reading.
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2]));
const cr = (r) => r.events.reduce((s, e) => s + (e.reverses ? e.crossed : 0), 0);
for (const f of ['RARE', 'HALF', 'OFTEN']) {
  const B = new Map(), M = new Map();
  for (const r of j.rows) if (r.family === f && !r.excluded) (r.arm === 'BELIEF' ? B : M).set(r.world, r);
  const groups = { neither: [], beliefOnly: [], mbvi3Only: [], both: [] };
  for (const [w, b] of B) {
    const m = M.get(w);
    const g = cr(b) > 0 && cr(m) > 0 ? 'both' : cr(b) > 0 ? 'beliefOnly' : cr(m) > 0 ? 'mbvi3Only' : 'neither';
    groups[g].push({ ar: m.windows.afterReversed - b.windows.afterReversed, tot: m.metric - b.metric, tie: m.metric === b.metric });
  }
  let reversing = 0, crossedB = 0, crossedM = 0;
  for (const [w, b] of B) b.events.forEach((e, i) => { if (e.reverses) { reversing++; if (e.crossed > 0) crossedB++; if (M.get(w).events[i].crossed > 0) crossedM++; } });
  console.log(`${f}: reversing events ${reversing}; crossed at least once BELIEF ${crossedB} (${(100 * crossedB / reversing).toFixed(1)}%), MBVI3 ${crossedM} (${(100 * crossedM / reversing).toFixed(1)}%)`);
  for (const [k, v] of Object.entries(groups)) console.log(`  ${k.padEnd(10)} labels ${String(v.length).padStart(3)}; sum MBVI3-BELIEF afterReversed ${v.reduce((s, x) => s + x.ar, 0)}, total ${v.reduce((s, x) => s + x.tot, 0)}; exact ties in total ${v.filter((x) => x.tie).length}`);
}

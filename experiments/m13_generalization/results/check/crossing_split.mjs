// Descriptive split, written after the result, adapted from experiments/m11_routes/results/check/crossing_split.mjs
// so that M13 can be read beside M11 and M12. Per family, labels are grouped by which core arm crossed a reopened edge
// at least once: first in the edge's own after-window (task E5's `crossed`, M11's definition), then at any time after
// the reopening (M13's `returned`). For each group: the summed MBVI3 - BELIEF difference in afterReversed and in total
// steps. Descriptive only; not part of the reading.
// Usage: node crossing_split.mjs <path to m13_result.json>
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2]));
const own = (r) => r.events.reduce((s, e) => s + (e.reverses ? e.crossed : 0), 0);
const any = (r) => r.m13.events.filter((e) => e.reverses && e.returned).length;
for (const [name, cr, evCrossed] of [
  ['own after-window (M11 definition)', own, (r, i) => r.events[i].crossed > 0],
  ['any time after the reopening (M13 returned)', any, (r, i) => !!r.m13.events.find((e) => e.k === i)?.returned],
]) {
  console.log(`== crossed in the ${name}`);
  for (const f of ['RARE', 'HALF', 'OFTEN']) {
    const B = new Map(), M = new Map();
    for (const r of j.rows) if (r.family === f && (r.arm === 'BELIEF' || r.arm === 'MBVI3')) (r.arm === 'BELIEF' ? B : M).set(r.world, r);
    const groups = { neither: [], beliefOnly: [], mbvi3Only: [], both: [] };
    for (const [w, b] of B) {
      const m = M.get(w);
      const g = cr(b) > 0 && cr(m) > 0 ? 'both' : cr(b) > 0 ? 'beliefOnly' : cr(m) > 0 ? 'mbvi3Only' : 'neither';
      groups[g].push({ ar: m.windows.afterReversed - b.windows.afterReversed, tot: m.metric - b.metric, tie: m.metric === b.metric });
    }
    let reversing = 0, crossedB = 0, crossedM = 0;
    for (const [w, b] of B) b.events.forEach((e, i) => { if (e.reverses) { reversing++; if (evCrossed(b, i)) crossedB++; if (evCrossed(M.get(w), i)) crossedM++; } });
    const sumAr = [...Object.values(groups)].flat().reduce((s, x) => s + x.ar, 0);
    console.log(`${f}: reversing events ${reversing}; crossed at least once BELIEF ${crossedB} (${(100 * crossedB / reversing).toFixed(1)}%), MBVI3 ${crossedM} (${(100 * crossedM / reversing).toFixed(1)}%); summed afterReversed difference ${sumAr}`);
    for (const [k, v] of Object.entries(groups)) { const s = v.reduce((a, x) => a + x.ar, 0); console.log(`  ${k.padEnd(10)} labels ${String(v.length).padStart(3)}; sum MBVI3-BELIEF afterReversed ${s} (${sumAr ? (100 * s / sumAr).toFixed(1) : '-'}%), total ${v.reduce((a, x) => a + x.tot, 0)}; exact ties in total ${v.filter((x) => x.tie).length}`); }
  }
}

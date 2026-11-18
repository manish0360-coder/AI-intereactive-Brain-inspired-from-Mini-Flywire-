// M13 proposal input: per-label spread of the contrasts M13 would use, from the two existing records (CF-06 gate6 on
// generated worlds, M11 on the app graph). Reads stored rows only; runs nothing. Prints mean, SD, n, and the n needed
// for a two-sided 95% interval to exclude 0 with 80% power at several effect sizes.
import fs from 'node:fs';
const ROOT = process.argv[2];
const g = JSON.parse(fs.readFileSync(`${ROOT}/experiments/cf06/results/gate6_result.json`));
const m = JSON.parse(fs.readFileSync(`${ROOT}/experiments/m11_routes/results/m11_result.json`));
const stat = (d) => { const n = d.length, mu = d.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(d.reduce((s, x) => s + (x - mu) ** 2, 0) / (n - 1)); return { n, mean: +mu.toFixed(2), sd: +sd.toFixed(2) }; };
const nFor = (sd, delta) => Math.ceil(((1.96 + 0.8416) * sd / delta) ** 2);
const crossings = (r) => r.events.reduce((s, e) => s + (!e.skipped && e.reverses ? e.crossed : 0), 0);
function contrasts(rows, armB, armM, armKey) {
  const by = (fam, arm) => new Map(rows.filter((r) => r.family === fam && r[armKey] === arm && !r.excluded).map((r) => [r.world, r]));
  const out = {};
  const pair = (fam, f, sign) => { const B = by(fam, armB), M = by(fam, armM); return [...B.keys()].filter((w) => M.has(w)).map((w) => sign * (f(B.get(w)) - f(M.get(w)))); };
  out.OFTEN_afterReversed = pair('OFTEN', (r) => r.windows.afterReversed, -1);
  out.OFTEN_total = pair('OFTEN', (r) => r.metric, -1);
  out.HALF_total = pair('HALF', (r) => r.metric, -1);
  out.RARE_cost = pair('RARE', (r) => r.metric, 1);
  out.RARE_afterPermanent_cost = pair('RARE', (r) => r.windows.afterPermanent, 1);
  out.RARE_futile_cost = pair('RARE', (r) => r.diagnostics.futileRetests, 1);
  out.OFTEN_crossings = pair('OFTEN', crossings, 1);
  // mix: per label, sum over the three families (CF-06 B1 unit)
  const fam = ['RARE', 'HALF', 'OFTEN'].map((f) => [by(f, armB), by(f, armM)]);
  const labels = [...fam[0][0].keys()].filter((w) => fam.every(([B, M]) => B.has(w) && M.has(w)));
  out.MIX_total = labels.map((w) => fam.reduce((s, [B, M]) => s + (M.get(w).metric - B.get(w).metric), 0));
  return out;
}
for (const [name, rows, key, b, mb] of [['CF-06 gate6 (generated worlds)', g.rows.e5, 'name', 'BELIEF', 'MBVI3'], ['M11 (app graph)', m.rows, 'arm', 'BELIEF', 'MBVI3']]) {
  console.log(`== ${name}`);
  for (const [k, d] of Object.entries(contrasts(rows, b, mb, key))) {
    const s = stat(d);
    console.log(`${k.padEnd(26)} n ${s.n}  mean ${String(s.mean).padStart(7)}  sd ${String(s.sd).padStart(7)}  n80% for delta = mean ${nFor(s.sd, Math.abs(s.mean))}, mean/2 ${nFor(s.sd, Math.abs(s.mean) / 2)}`);
  }
}
const w = g.resources.wallClockMsRunA;
console.log('gate6 seconds per E5 run (run A): BELIEF', (w.BELIEF / 1000 / 405).toFixed(2), 'MBVI3', (w.MBVI3 / 1000 / 405).toFixed(2), '; worlds', JSON.stringify(g.worlds).slice(0, 200));

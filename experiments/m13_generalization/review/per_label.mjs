// Per-label extract for the M13 review package, written 2026-11-18 after the result. It changes nothing: it reads
// results/m13_result.json and writes one CSV row per label with the step counts each criterion and attribution contrast
// is built from, and the contrasts themselves. A reviewer can recompute every mean, median and sign count in
// RESULTS.md from this file alone, and every bootstrap interval with cognitive/testbed/stats.mjs (pairedBootstrap,
// seeded by the tags listed in REVIEW_PACKAGE.md). It imports nothing from the repository.
// Usage: node per_label.mjs <path to m13_result.json>  > per_label.csv
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2]));
const F = ['RARE', 'HALF', 'OFTEN'], ARMS = ['BELIEF', 'MBVI3', 'BELIEF_REALONLY', 'BELIEF_FALSEONLY'];
const short = { BELIEF: 'B', MBVI3: 'M', BELIEF_REALONLY: 'R', BELIEF_FALSEONLY: 'F' };
const cell = new Map(j.rows.map((r) => [`${r.world}|${r.family}|${r.arm}`, r]));
const get = (w, f, a) => cell.get(`${w}|${f}|${a}`);
const labels = [...new Set(j.rows.map((r) => r.world))].sort((a, b) => Number(a.split('|')[2]) - Number(b.split('|')[2]));
const cols = ['label'];
for (const f of F) for (const a of ARMS) cols.push(`total_${f}_${short[a]}`);
for (const a of ARMS) cols.push(`afterReversed_OFTEN_${short[a]}`);
for (const a of ['BELIEF', 'MBVI3']) cols.push(`metAndReturned_OFTEN_${short[a]}`);
cols.push('G1_mix_M_minus_B', 'G2_RARE_B_minus_M', 'G3_OFTEN_after_M_minus_B', 'G4_OFTEN_metAndReturned_B_minus_M',
  'A1_OFTEN_M_minus_R', 'A2_OFTEN_after_M_minus_R', 'A3_OFTEN_M_minus_F', 'A4_mix_M_minus_R', 'A5_mix_M_minus_F');
const out = [cols.join(',')];
for (const w of labels) {
  const v = [w];
  for (const f of F) for (const a of ARMS) v.push(get(w, f, a).metric);
  for (const a of ARMS) v.push(get(w, 'OFTEN', a).windows.afterReversed);
  for (const a of ['BELIEF', 'MBVI3']) v.push(get(w, 'OFTEN', a).m13.metAndReturned);
  const tot = (f, a) => get(w, f, a).metric, mix = (a) => F.reduce((s, f) => s + tot(f, 'MBVI3') - tot(f, a), 0);
  const after = (a) => get(w, 'OFTEN', a).windows.afterReversed;
  v.push(mix('BELIEF'), tot('RARE', 'BELIEF') - tot('RARE', 'MBVI3'), after('MBVI3') - after('BELIEF'),
    get(w, 'OFTEN', 'BELIEF').m13.metAndReturned - get(w, 'OFTEN', 'MBVI3').m13.metAndReturned,
    tot('OFTEN', 'MBVI3') - tot('OFTEN', 'BELIEF_REALONLY'), after('MBVI3') - after('BELIEF_REALONLY'),
    tot('OFTEN', 'MBVI3') - tot('OFTEN', 'BELIEF_FALSEONLY'), mix('BELIEF_REALONLY'), mix('BELIEF_FALSEONLY'));
  out.push(v.join(','));
}
process.stdout.write(out.join('\n') + '\n');

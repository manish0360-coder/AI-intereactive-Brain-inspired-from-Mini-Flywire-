// ==========================================================
// ACQ-1 — development diagnostic: the crossover metric per step window, for MFW variants and the baselines (development worlds only)
// ==========================================================
//   node experiments/coga/acq1/dev_diag.mjs --steps N --window W [--mfw <label>=<dir> ...] [--out <file.json>]
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { generateAcceptedStream } from '../../m7/env.js';
import { STUDY_STREAM_START, DEV_INDICES, GAMMA } from '../config.mjs';
import { describeAcq } from './states.mjs';
import { runAcq } from './baselines.mjs';
import { worldMetric, rawMetrics } from './metric.mjs';
import { bootstrap } from '../analysis.mjs';

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const args = (k) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []));
const steps = Number(arg('--steps', '3000')), W = Number(arg('--window', '500'));
const QP = { alpha: 0.5, epsilon: 0.1, gamma: GAMMA };
const worlds = generateAcceptedStream(STUDY_STREAM_START, DEV_INDICES.hi + 1).map(w => describeAcq({ cfg: w.cfg, acceptedSeed: w.acceptedSeed, configIndex: w.acceptedConfigIndex, stream: 'study' }));
console.log(`worlds ${worlds.length}; SWITCH states per world: min ${Math.min(...worlds.map(w => w.sw.length))}, mean ${(worlds.reduce((a, w) => a + w.sw.length, 0) / worlds.length).toFixed(2)}, max ${Math.max(...worlds.map(w => w.sw.length))}`);

const windows = []; for (let lo = 0; lo < steps; lo += W) windows.push([lo, Math.min(steps, lo + W)]);
const series = {};
function addAgent(label, logsOf) {
  const logs = worlds.map(w => logsOf(w));
  const row = windows.map(([lo, hi]) => {
    const per = worlds.map((w, i) => worldMetric(w, logs[i].E1, logs[i].E2, lo, hi)).filter(x => x.psi !== null);
    const mean = (k) => (ws) => ws.reduce((a, x) => a + x[k], 0) / ws.length;
    const b = bootstrap(per, mean('psi'), { replicates: 2000, seed: 11 }), r = bootstrap(per, mean('R'), { replicates: 2000, seed: 12 });
    return { lo, hi, worlds: per.length, psi: b.est, psiLo: b.lo, psiHi: b.hi, R: r.est, RLo: r.lo, RHi: r.hi, sdPsi: Math.sqrt(per.reduce((a, x) => a + (x.psi - b.est) ** 2, 0) / (per.length - 1)), usable: per.reduce((a, x) => a + x.usable, 0) / per.length };
  });
  const [lo, hi] = windows[windows.length - 1];
  const raw = { E1: worlds.map((w, i) => rawMetrics(w, logs[i].E1, 'E1', lo, hi)), E2: worlds.map((w, i) => rawMetrics(w, logs[i].E2, 'E2', lo, hi)) };
  const m = (a, k) => a.reduce((x, y) => x + y[k], 0) / a.length;
  series[label] = { rows: row, rawLastWindow: { meanP_E1: m(raw.E1, 'meanP'), meanP_E2: m(raw.E2, 'meanP'), ownAgreement_E1: m(raw.E1, 'ownAgreement'), ownAgreement_E2: m(raw.E2, 'ownAgreement') } };
  console.log(`\n${label}`);
  for (const r of row) console.log(`  [${String(r.lo).padStart(5)},${String(r.hi).padStart(5)}) worlds ${r.worlds} usable/world ${r.usable.toFixed(1)}  psi ${r.psi.toFixed(3)} [${r.psiLo.toFixed(3)}, ${r.psiHi.toFixed(3)}] sd ${r.sdPsi.toFixed(3)}   R ${r.R.toFixed(3)} [${r.RLo.toFixed(3)}, ${r.RHi.toFixed(3)}]`);
  console.log(`  last window raw: mean p E1 ${series[label].rawLastWindow.meanP_E1.toFixed(3)} E2 ${series[label].rawLastWindow.meanP_E2.toFixed(3)}; own agreement E1 ${series[label].rawLastWindow.ownAgreement_E1.toFixed(3)} E2 ${series[label].rawLastWindow.ownAgreement_E2.toFixed(3)}`);
}
for (const a of ['RW', 'QB1', 'DYNA']) addAgent(a, (w) => ({ E1: runAcq({ world: w, agent: a, env: 'E1', params: QP, steps }).log, E2: runAcq({ world: w, agent: a, env: 'E2', params: QP, steps }).log }));
for (const spec of args('--mfw')) {
  const [label, dir] = spec.split('=');
  const v = label.replace('MFW-', '');
  addAgent(label, (w) => { const f = (e) => JSON.parse(fs.readFileSync(path.join(dir, `MFW${v}-study${w.index}-${e}.json`), 'utf8')).log; return { E1: f('E1'), E2: f('E2') }; });
}
if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify({ schema: 'coga/acq1.dev-diag', steps, window: W, params: QP, series }, null, 1));

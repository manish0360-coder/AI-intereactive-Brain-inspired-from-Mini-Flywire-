// ==========================================================
// XFER-2 — construct-validity report (outcome-free)
// ==========================================================
//   node construct_report.mjs --brains <xfer1 run dir> [--brains <dir> ...] [--out <file.json>]
// Reads the real training brains of existing XFER-1 runs (episode stores only; no session outcome is read), builds every
// XFER-2 control for each world, and reports the residual differences the design must disclose: episode count, lengths,
// directed-edge coverage, decision-time gate retention and trajectory-integrity strength by edge class (goalward / level
// / away relative to the goal), goal-termination, replay-eligible fraction.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeGraph, coverStore, noReplay, reversedNoReplay, storeStats, residuals } from './controls.mjs';
import { hashObject } from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const dirs = argv.flatMap((a, i) => (a === '--brains' ? [argv[i + 1]] : []));
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;
if (!dirs.length) { console.error('--brains <dir> is required'); process.exit(2); }

const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];

const cover = coverStore(g, labelOf, { tag: 'cover' });
const coverNR = noReplay(cover);
const worlds = [];
for (const d of dirs) {
  const plan = JSON.parse(fs.readFileSync(path.join(path.resolve(d), 'plan.json'), 'utf8')).plan;
  for (const w of plan) worlds.push({ ...w, brain: JSON.parse(fs.readFileSync(path.join(path.resolve(d), 'brains', `w${w.world}.json`), 'utf8')) });
}
const rows = [];
for (const w of worlds) {
  const real = w.brain.episodes;
  const sReal = storeStats(real, g, w.goal);
  const arms = { REAL: real, REAL_NR: noReplay(real), REV_NR: reversedNoReplay(real, labelOf), COVER: cover, COVER_NR: coverNR };
  const row = { world: w.world, goal: w.goal, realEpisodes: real.length, real: { ...sReal, edgeCounts: undefined }, arms: {} };
  for (const [name, store] of Object.entries(arms)) {
    const s = storeStats(store, g, w.goal);
    row.arms[name] = { stats: { ...s, edgeCounts: undefined }, residualVsReal: residuals(s, sReal), storeSha256: hashObject(store.map(e => ({ ...e, id: undefined, timestamp: undefined }))) };
  }
  rows.push(row);
}

// ---- aggregates ----
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const pick = (f) => rows.map(f);
const agg = (name, f) => { const v = pick(f); return { name, mean: mean(v), min: Math.min(...v), max: Math.max(...v) }; };
const summary = {
  worlds: rows.length,
  realEpisodes: agg('real episodes per world', r => r.realEpisodes),
  realGateGoalward: agg('REAL gate retention, goalward edges', r => r.real.gateMean.goalward),
  realGateAway: agg('REAL gate retention, away edges', r => r.real.gateMean.away),
  realGoalwardShare: agg('REAL share of transitions on goalward edges', r => r.real.goalwardShareOfTransitions),
  realEdgesAtLeast5: agg('REAL directed edges with count >= 5 (of 78)', r => r.real.directedEdgesAtLeast5),
  coverEdgesAtLeast5: agg('COVER directed edges with count >= 5 (of 78)', r => r.arms.COVER.stats.directedEdgesAtLeast5),
  coverGate: { goalward: cover.length && storeStats(cover, g, 12).gateMean.goalward, away: storeStats(cover, g, 12).gateMean.away },
  revGateGoalward: agg('REV_NR gate retention, goalward edges', r => r.arms.REV_NR.stats.gateMean.goalward),
  revGateAway: agg('REV_NR gate retention, away edges', r => r.arms.REV_NR.stats.gateMean.away),
  realNrResidualTcL1: agg('REAL_NR vs REAL: mean |tc difference|', r => r.arms.REAL_NR.residualVsReal.tcL1Mean),
  realNrEligible: agg('REAL_NR replay-eligible fraction', r => r.arms.REAL_NR.stats.replayEligibleFraction),
  realEligible: agg('REAL replay-eligible fraction', r => r.real.replayEligibleFraction),
  coverEligible: agg('COVER replay-eligible fraction', r => r.arms.COVER.stats.replayEligibleFraction),
  coverEndAtGoal: agg('COVER episodes ending at the goal', r => r.arms.COVER.stats.endAtGoalFraction),
  realEndAtGoal: agg('REAL episodes ending at the goal', r => r.real.endAtGoalFraction),
  coverTcL1VsReal: agg('COVER vs REAL: mean |tc difference|', r => r.arms.COVER.residualVsReal.tcL1Mean),
  coverEpisodeCountResidual: agg('COVER - REAL episode count', r => r.arms.COVER.residualVsReal.episodeCount),
  coverTransitionsResidual: agg('COVER - REAL transitions', r => r.arms.COVER.residualVsReal.transitions),
  coverMeanNodesResidual: agg('COVER - REAL mean nodes per episode', r => r.arms.COVER.residualVsReal.meanNodes),
};
const report = { schema: 'xfer2.construct/1', status: 'OUTCOME_FREE', coverSha256: hashObject(cover.map(e => ({ ...e, id: undefined, timestamp: undefined }))), summary, rows };
if (out) fs.writeFileSync(path.resolve(out), JSON.stringify(report, null, 1));
const f = (x, d = 3) => (typeof x === 'number' ? x.toFixed(d) : String(x));
console.log(`worlds ${rows.length}; COVER store sha ${report.coverSha256.slice(0, 12)}; cover episodes ${cover.length}`);
for (const [k, v] of Object.entries(summary)) if (v && v.name) console.log(`${v.name.padEnd(52)} mean ${f(v.mean).padStart(8)}  min ${f(v.min).padStart(8)}  max ${f(v.max).padStart(8)}`);
console.log('COVER gate retention (any goal): goalward', f(summary.coverGate.goalward), 'away', f(summary.coverGate.away));

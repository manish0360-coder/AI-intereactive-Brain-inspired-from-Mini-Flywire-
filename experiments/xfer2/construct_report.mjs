// ==========================================================
// XFER-2 — construct-validity report (outcome-free)
// ==========================================================
//   node construct_report.mjs --brains <xfer1 run dir> [--brains <dir> ...] [--out <file.json>]
// Reads the real training brains of existing XFER-1 runs (episode stores only; no session outcome is read), builds every
// XFER-2 control store for each world, and reports the residual differences the design must disclose: episode count,
// lengths, loop mix, transitions, directed-edge coverage, gate retention and trajectory-integrity strength by edge class
// (goalward / level / away relative to the goal), goal-entering edge coverage, goal termination, replay eligibility.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeGraph, satStore, noReplay, reversedNoReplay, storeStats, residuals } from './controls.mjs';
import { ARM_ORDER, hashObject } from './config.mjs';
import { storeFor } from './arms.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const dirs = argv.flatMap((a, i) => (a === '--brains' ? [argv[i + 1]] : []));
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;
if (!dirs.length) { console.error('--brains <dir> is required'); process.exit(2); }

const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const labelOf = (n) => LABEL[n];
const sat = satStore(g, labelOf, { quality: 0.49, tag: 'sat' });

const worlds = [];
for (const d of dirs) {
  const plan = JSON.parse(fs.readFileSync(path.join(path.resolve(d), 'plan.json'), 'utf8')).plan;
  for (const w of plan) worlds.push({ ...w, brain: JSON.parse(fs.readFileSync(path.join(path.resolve(d), 'brains', `w${w.world}.json`), 'utf8')) });
}
const rows = [];
for (const w of worlds) {
  const real = w.brain.episodes;
  const sReal = storeStats(real, g, w.goal);
  const row = { world: w.world, goal: w.goal, realEpisodes: real.length, real: { ...sReal, edgeCounts: undefined }, arms: {} };
  for (const arm of ARM_ORDER) {
    const store = storeFor(arm, { world: w.world, goal: w.goal, realEpisodes: real, g, labelOf, sat });
    if (store === null) continue;
    const s = storeStats(store, g, w.goal);
    row.arms[arm] = { stats: { ...s, edgeCounts: undefined }, residualVsReal: residuals(s, sReal), storeSha256: hashObject(store.map(e => ({ ...e, id: undefined, timestamp: undefined }))) };
  }
  rows.push(row);
}

// ---- aggregates ----
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const agg = (name, f, filter = () => true) => { const v = rows.filter(filter).map(f).filter(x => typeof x === 'number'); return { name, n: v.length, mean: v.length ? mean(v) : null, min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null }; };
const big = (r) => r.realEpisodes >= 20;
const A = (arm, f) => (r) => f(r.arms[arm]);
const summary = {
  worlds: rows.length, worldsWithRealStoreAtLeast20: rows.filter(big).length,
  real: {
    episodes: agg('real episodes per world', r => r.realEpisodes),
    transitions: agg('real transitions', r => r.real.transitions),
    edgesAtLeast5: agg('real directed edges with count >= 5 (of 78)', r => r.real.directedEdgesAtLeast5),
    gateGoalward: agg('real non-goal gate retention, goalward edges', r => r.real.gateMean.goalward),
    gateAway: agg('real non-goal gate retention, away edges', r => r.real.gateMean.away),
    goalEntryTc: agg('real goal-entering tc (mean over entering edges)', r => r.real.goalEntry.tcMean),
    goalEntryAtLeast5: agg('real goal-entering edges at count >= 5', r => r.real.goalEntry.atLeast5),
    goalwardShare: agg('real share of transitions on goalward edges', r => r.real.goalwardShareOfTransitions),
    endAtGoal: agg('real episodes ending at the goal', r => r.real.endAtGoalFraction),
    eligible: agg('real replay-eligible fraction', r => r.real.replayEligibleFraction),
  },
  matchedGeneric: {
    episodeCountResidual: agg('GEN_NR - REAL episode count', A('GEN_NR', a => a.residualVsReal.episodeCount)),
    transitionsResidual: agg('GEN_NR - REAL transitions', A('GEN_NR', a => a.residualVsReal.transitions)),
    simpleKindResidual: agg('GEN_NR - REAL simple-path fraction', A('GEN_NR', a => a.residualVsReal.simpleFractionDelta)),
    meanNodesResidual: agg('GEN_NR - REAL mean nodes per episode', A('GEN_NR', a => a.residualVsReal.meanNodes)),
    tcL1: agg('GEN_NR vs REAL: mean |tc difference| per directed edge', A('GEN_NR', a => a.residualVsReal.tcL1Mean), big),
    edgesCoveredResidual: agg('GEN_NR - REAL directed edges covered', A('GEN_NR', a => a.residualVsReal.directedEdgesCoveredDelta), big),
    edgesAtLeast5Residual: agg('GEN_NR - REAL directed edges at count >= 5', A('GEN_NR', a => a.residualVsReal.directedEdgesAtLeast5Delta), big),
    goalEntryTcResidual: agg('GEN_NR - REAL goal-entering tc', A('GEN_NR', a => a.residualVsReal.goalEntryTcMeanDelta), big),
    goalwardShareResidual: agg('GEN_NR - REAL goalward share of transitions', A('GEN_NR', a => a.residualVsReal.goalwardShareDelta), big),
    gateGoalwardResidual: agg('GEN_NR - REAL gate retention, goalward', A('GEN_NR', a => a.residualVsReal.gateMeanDelta.goalward), big),
    gateAwayResidual: agg('GEN_NR - REAL gate retention, away', A('GEN_NR', a => a.residualVsReal.gateMeanDelta.away), big),
    endAtGoalResidual: agg('GEN_NR - REAL episodes ending at goal', A('GEN_NR', a => a.residualVsReal.endAtGoalFractionDelta), big),
  },
  realNoReplay: {
    tcL1: agg('REAL_NR vs REAL: mean |tc difference|', A('REAL_NR', a => a.residualVsReal.tcL1Mean)),
    eligible: agg('REAL_NR replay-eligible fraction', A('REAL_NR', a => a.stats.replayEligibleFraction)),
  },
  saturated: {
    edgesAtLeast5: agg('SAT_NR directed edges at count >= 5', A('SAT_NR', a => a.stats.directedEdgesAtLeast5)),
    gateGoalward: agg('SAT_NR gate retention, goalward', A('SAT_NR', a => a.stats.gateMean.goalward)),
    goalEntryTc: agg('SAT_NR goal-entering tc', A('SAT_NR', a => a.stats.goalEntry.tcMean)),
    noEntryGoalEntryTc: agg('SAT_NOENTRY_NR goal-entering tc', A('SAT_NOENTRY_NR', a => a.stats.goalEntry.tcMean)),
    noEntryGateGoalward: agg('SAT_NOENTRY_NR gate retention, goalward', A('SAT_NOENTRY_NR', a => a.stats.gateMean.goalward)),
    entryOnlyGoalEntryTc: agg('ENTRY_NR goal-entering tc', A('ENTRY_NR', a => a.stats.goalEntry.tcMean)),
    entryOnlyGateGoalward: agg('ENTRY_NR gate retention, goalward (non-goal)', A('ENTRY_NR', a => a.stats.gateMean.goalward)),
    entryOnlyEpisodes: agg('ENTRY_NR episodes', A('ENTRY_NR', a => a.stats.episodes)),
  },
  reversed: {
    gateGoalward: agg('REV_NR gate retention, goalward', A('REV_NR', a => a.stats.gateMean.goalward), big),
    gateAway: agg('REV_NR gate retention, away', A('REV_NR', a => a.stats.gateMean.away), big),
  },
};
const report = { schema: 'xfer2.construct/2', status: 'OUTCOME_FREE', satSha256: hashObject(sat.map(e => ({ ...e, id: undefined, timestamp: undefined }))), summary, rows };
if (out) fs.writeFileSync(path.resolve(out), JSON.stringify(report, null, 1));
const f = (x, d = 3) => (typeof x === 'number' ? x.toFixed(d) : 'n/a');
console.log(`worlds ${rows.length} (${summary.worldsWithRealStoreAtLeast20} with a real store >= 20 episodes); SAT store sha ${report.satSha256.slice(0, 12)}`);
for (const [grp, obj] of Object.entries(summary)) {
  if (typeof obj !== 'object') continue;
  for (const v of Object.values(obj)) if (v && v.name) console.log(`${(grp.slice(0, 5) + ' ' + v.name).padEnd(70)} n ${String(v.n).padStart(3)}  mean ${f(v.mean).padStart(9)}  min ${f(v.min).padStart(9)}  max ${f(v.max).padStart(9)}`);
}

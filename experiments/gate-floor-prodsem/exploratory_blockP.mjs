// ==========================================================
// GATE-FLOOR-PRODSEM — EXPLORATORY follow-up of block P (post-hoc; NOT part of the frozen analysis; no claim uses it)
// ==========================================================
//   node exploratory_blockP.mjs --in <summary_blockP.json> [--blockH <summary_blockH.json>] [--out <json>]
// Reads only committed analysis summaries (per-world numbers), so it is reproducible from the repository.  Questions the
// frozen analysis leaves open, answered only as far as the measurements go:
//   * does the floor displace the runtime's own non-graph resets?  (paired per-world changes, correlation with the legal gain)
//   * is the goal-edge shortcut penalty larger under the floor, and does a larger penalty go with a smaller legal gain?
//     (association only: the design cannot say whether a penalty dampens the floor)
//   * how much of the floor's every-reset gain is legal?
//   * by training-store size; worlds in which the floor changed nothing observable; the realized paired SDs vs the calibration
//   * an UNPAIRED comparison of the floor benefit under state P with block H (different worlds, different hook state)
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { prng, pairedSummary, mean } from '../xfer1/stats.mjs';

function pearson(x, y) {
  const n = x.length, mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
function bootstrapCorr(x, y, { replicates, seed, level }) {
  const n = x.length, r = prng(seed), out = [];
  for (let b = 0; b < replicates; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(r() * n));
    const c = pearson(idx.map(i => x[i]), idx.map(i => y[i]));
    if (c !== null) out.push(c);
  }
  out.sort((a, b) => a - b);
  const lo = (1 - level) / 2, at = (q) => out[Math.min(out.length - 1, Math.max(0, Math.floor(q * out.length)))];
  return { r: pearson(x, y), ci: out.length ? { lower: at(lo), upper: at(1 - lo) } : null };
}
/** difference of two independent means with a percentile bootstrap (different worlds: no pairing exists) */
function unpairedDifference(a, b, { replicates, seed, level }) {
  const r = prng(seed), out = [];
  const draw = (xs) => { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(r() * xs.length)]; return s / xs.length; };
  for (let k = 0; k < replicates; k++) out.push(draw(a) - draw(b));
  out.sort((x, y) => x - y);
  const lo = (1 - level) / 2, at = (q) => out[Math.min(out.length - 1, Math.max(0, Math.floor(q * out.length)))];
  return { mean: mean(a) - mean(b), ci: { lower: at(lo), upper: at(1 - lo) }, nA: a.length, nB: b.length };
}

export function exploratory(S, H = null) {
  const W = S.worlds, A = (w, a) => S.perWorld[w].arms[a];
  const out = { status: 'EXPLORATORY_POST_HOC', basis: 'summary_blockP.json', worlds: W.length, arms: {}, storeSize: {} };
  for (const arm of ['COLD_FLOOR', 'ENTRY_NR', 'REAL', 'REAL_FLOOR']) {
    const dLegal = W.map(w => A(w, arm).legal - A(w, 'COLD').legal), dNon = W.map(w => A(w, arm).nonEdge - A(w, 'COLD').nonEdge), dAll = W.map(w => A(w, arm).all - A(w, 'COLD').all);
    const dPen = W.map(w => (A(w, arm).goalEdgePenalty ?? 0) - (A(w, 'COLD').goalEdgePenalty ?? 0));
    out.arms[arm] = {
      legalGain: pairedSummary(dLegal, C.BOOTSTRAP), nonEdgeChange: pairedSummary(dNon, C.BOOTSTRAP), everyResetGain: pairedSummary(dAll, C.BOOTSTRAP), goalEdgePenaltyChange: pairedSummary(dPen, C.BOOTSTRAP),
      legalShareOfEveryResetGain: mean(dAll) !== 0 ? mean(dLegal) / mean(dAll) : null,
      corr_legalGain_nonEdgeChange: bootstrapCorr(dLegal, dNon, C.BOOTSTRAP), corr_legalGain_penaltyChange: bootstrapCorr(dLegal, dPen, C.BOOTSTRAP),
    };
  }
  out.storeEffect = Object.fromEntries([['REAL_FLOOR_minus_COLD_FLOOR', 'REAL_FLOOR', 'COLD_FLOOR'], ['REAL_minus_COLD', 'REAL', 'COLD'], ['ENTRY_NR_minus_COLD_FLOOR', 'ENTRY_NR', 'COLD_FLOOR'], ['REAL_FLOOR_minus_REAL', 'REAL_FLOOR', 'REAL']].map(([k, x, y]) => [k, {
    legal: pairedSummary(W.map(w => A(w, x).legal - A(w, y).legal), C.BOOTSTRAP), nonEdge: pairedSummary(W.map(w => A(w, x).nonEdge - A(w, y).nonEdge), C.BOOTSTRAP), everyReset: pairedSummary(W.map(w => A(w, x).all - A(w, y).all), C.BOOTSTRAP) }]));
  const sdOf = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
  const L = (x, y) => W.map(w => A(w, x).legal - A(w, y).legal);
  out.realizedPairedSd = { 'REAL-COLD': sdOf(L('REAL', 'COLD')), 'ENTRY_NR-COLD': sdOf(L('ENTRY_NR', 'COLD')), 'ENTRY_NR-REAL': sdOf(L('ENTRY_NR', 'REAL')), 'COLD_FLOOR-COLD': sdOf(L('COLD_FLOOR', 'COLD')), 'ENTRY_NR-COLD_FLOOR': sdOf(L('ENTRY_NR', 'COLD_FLOOR')),
    calibrationMaxLegalSd: C.CALIBRATION.maxLegalPairedSd, requiredNAtDeltaForLargestRealizedSd: null };
  out.realizedPairedSd.requiredNAtDeltaForLargestRealizedSd = Math.ceil((2.8 * Math.max(...['REAL-COLD', 'ENTRY_NR-COLD', 'ENTRY_NR-REAL', 'COLD_FLOOR-COLD', 'ENTRY_NR-COLD_FLOOR'].map(k => out.realizedPairedSd[k])) / C.MARGIN.delta) ** 2);
  const same = (w) => ['legal', 'all', 'nonEdge', 'early'].every(k => A(w, 'COLD_FLOOR')[k] === A(w, 'COLD')[k]);
  const idW = W.filter(same);
  out.floorIdenticalToCold = { worlds: idW.length, ofWorlds: W.length, legalDifferenceZero: W.filter(w => A(w, 'COLD_FLOOR').legal === A(w, 'COLD').legal).length,
    byGoal: Object.fromEntries(C.GOALS.map(g => [g, W.filter(w => S.perWorld[w].goal === g && same(w)).length])),
    floorRaisedAnyScoreInThose: idW.filter(w => (A(w, 'COLD_FLOOR').floor && A(w, 'COLD_FLOOR').floor.raised > 0)).length,
    meanColdLegalInThose: idW.length ? mean(idW.map(w => A(w, 'COLD').legal)) : null, meanColdLegalElsewhere: mean(W.filter(w => !same(w)).map(w => A(w, 'COLD').legal)) };
  for (const [name, pred] of [['empty store (0 episodes)', (n) => n === 0], ['at least 1 episode', (n) => n >= 1], ['at least 20 episodes', (n) => n >= 20]]) {
    const ws = W.filter(w => pred(S.perWorld[w].realEpisodes));
    if (!ws.length) { out.storeSize[name] = { worlds: 0 }; continue; }
    const d = (a, b) => pairedSummary(ws.map(w => A(w, a).legal - A(w, b).legal), C.BOOTSTRAP);
    out.storeSize[name] = { worlds: ws.length, benefitFloor: d('COLD_FLOOR', 'COLD'), benefitReal: d('REAL', 'COLD'), benefitEntry: d('ENTRY_NR', 'COLD'), realMinusFloor: d('REAL', 'COLD_FLOOR'), entryMinusFloor: d('ENTRY_NR', 'COLD_FLOOR') };
  }
  if (H && H.valid) {
    const bh = H.worlds.map(w => H.perWorld[w].arms.COLD_FLOOR.legal - H.perWorld[w].arms.COLD.legal);
    const bp = W.map(w => A(w, 'COLD_FLOOR').legal - A(w, 'COLD').legal);
    const eh = H.worlds.map(w => H.perWorld[w].arms.ENTRY_NR.legal - H.perWorld[w].arms.COLD.legal);
    const ep = W.map(w => A(w, 'ENTRY_NR').legal - A(w, 'COLD').legal);
    out.versusBlockH = { note: 'different worlds and a different hook state: an UNPAIRED description, never a claim about the environment alone',
      floorBenefitPminusH: unpairedDifference(bp, bh, C.BOOTSTRAP), entryBenefitPminusH: unpairedDifference(ep, eh, C.BOOTSTRAP),
      coldLegalPminusH: unpairedDifference(W.map(w => A(w, 'COLD').legal), H.worlds.map(w => H.perWorld[w].arms.COLD.legal), C.BOOTSTRAP),
      nonGraphColdPminusH: unpairedDifference(W.map(w => A(w, 'COLD').nonEdge), H.worlds.map(w => H.perWorld[w].arms.COLD.nonEdge), C.BOOTSTRAP) };
  }
  return out;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in')) { console.error('--in is required'); process.exit(2); }
  const S = JSON.parse(fs.readFileSync(path.resolve(flag('--in')), 'utf8'));
  if (!S.valid) { console.error('the summary is not valid'); process.exit(1); }
  const H = flag('--blockH') ? JSON.parse(fs.readFileSync(path.resolve(flag('--blockH')), 'utf8')) : null;
  const r = exploratory(S, H);
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(r, null, 1));
  const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
  const g = (s) => (s ? `${f(s.mean)} [${f(s.ci.lower)}, ${f(s.ci.upper)}]` : 'n/a');
  console.log('EXPLORATORY (post-hoc): per-world paired changes relative to COLD');
  for (const [a, x] of Object.entries(r.arms)) console.log(`  ${a.padEnd(11)} legal gain ${g(x.legalGain)} | non-graph change ${g(x.nonEdgeChange)} | every-reset gain ${g(x.everyResetGain)} | goal-edge penalty change ${g(x.goalEdgePenaltyChange)} | legal share of every-reset gain ${f(x.legalShareOfEveryResetGain, 2)} | r(legal, non-graph) ${f(x.corr_legalGain_nonEdgeChange.r, 2)} | r(legal, penalty) ${f(x.corr_legalGain_penaltyChange.r, 2)}`);
  console.log(`  realized paired SDs (legal): ${Object.entries(r.realizedPairedSd).map(([k, v]) => `${k} ${f(v, 1)}`).join(' | ')}`);
  console.log(`  floor arm identical to COLD on every endpoint: ${r.floorIdenticalToCold.worlds}/${r.floorIdenticalToCold.ofWorlds} worlds (legal difference exactly 0 in ${r.floorIdenticalToCold.legalDifferenceZero}); by goal ${JSON.stringify(r.floorIdenticalToCold.byGoal)}; floor raised a score in ${r.floorIdenticalToCold.floorRaisedAnyScoreInThose} of them`);
  for (const [k, x] of Object.entries(r.storeEffect)) console.log(`  ${k.padEnd(28)} legal ${g(x.legal)} | non-graph ${g(x.nonEdge)} | every reset ${g(x.everyReset)}`);
  for (const [n, s] of Object.entries(r.storeSize)) console.log(`  store size ${n}: ${s.worlds} worlds` + (s.worlds ? `  floor ${g(s.benefitFloor)} REAL ${g(s.benefitReal)} ENTRY ${g(s.benefitEntry)}  REAL-floor ${g(s.realMinusFloor)}  ENTRY-floor ${g(s.entryMinusFloor)}` : ''));
  if (r.versusBlockH) for (const [k, v] of Object.entries(r.versusBlockH)) if (k !== 'note') console.log(`  P - H (unpaired) ${k.padEnd(22)} ${g(v)}`);
}

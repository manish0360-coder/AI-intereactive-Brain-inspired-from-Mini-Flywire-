// ==========================================================
// GATE-FLOOR-B2 — EXPLORATORY follow-up of block G (post-hoc; NOT part of the frozen analysis; no claim uses it)
// ==========================================================
//   node exploratory_blockG.mjs --in <summary_blockG.json> [--out <json>]
// Reads only the committed analysis summary (per-world numbers), so it is reproducible from the repository.  Questions the
// reviewer left as UNKNOWN, answered only as far as the measurements go:
//   * does the floor displace B2's own non-graph resets?  (paired per-world changes and their correlation with the legal gain)
//   * is the goal-edge shortcut penalty left by B2's 1-hop block larger under the floor, and does a larger penalty go with a
//     smaller legal gain?  (association only: the design cannot say whether a penalty dampens the floor)
//   * how much of the floor's every-reset gain is legal?
//   * by training-store size (REAL == COLD where the training store is empty)
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

export function exploratory(S) {
  const W = S.worlds, A = (w, a) => S.perWorld[w].arms[a];
  const out = { status: 'EXPLORATORY_POST_HOC', basis: 'summary_blockG.json', worlds: W.length, arms: {}, storeSize: {} };
  for (const arm of ['COLD_FLOOR', 'ENTRY_NR', 'REAL', 'REAL_FLOOR']) {
    const dLegal = W.map(w => A(w, arm).legal - A(w, 'COLD').legal), dNon = W.map(w => A(w, arm).nonEdge - A(w, 'COLD').nonEdge), dAll = W.map(w => A(w, arm).all - A(w, 'COLD').all);
    const dPen = W.map(w => (A(w, arm).goalEdgePenalty ?? 0) - (A(w, 'COLD').goalEdgePenalty ?? 0));
    out.arms[arm] = {
      legalGain: pairedSummary(dLegal, C.BOOTSTRAP), nonEdgeChange: pairedSummary(dNon, C.BOOTSTRAP), everyResetGain: pairedSummary(dAll, C.BOOTSTRAP), goalEdgePenaltyChange: pairedSummary(dPen, C.BOOTSTRAP),
      legalShareOfEveryResetGain: mean(dAll) !== 0 ? mean(dLegal) / mean(dAll) : null,
      corr_legalGain_nonEdgeChange: bootstrapCorr(dLegal, dNon, C.BOOTSTRAP), corr_legalGain_penaltyChange: bootstrapCorr(dLegal, dPen, C.BOOTSTRAP),
    };
  }
  // what the real store's own (partly non-graph) experience does on top of the floor, and on its own
  out.storeEffect = Object.fromEntries([['REAL_FLOOR_minus_COLD_FLOOR', 'REAL_FLOOR', 'COLD_FLOOR'], ['REAL_minus_COLD', 'REAL', 'COLD'], ['ENTRY_NR_minus_COLD_FLOOR', 'ENTRY_NR', 'COLD_FLOOR']].map(([k, x, y]) => [k, {
    legal: pairedSummary(W.map(w => A(w, x).legal - A(w, y).legal), C.BOOTSTRAP), nonEdge: pairedSummary(W.map(w => A(w, x).nonEdge - A(w, y).nonEdge), C.BOOTSTRAP), everyReset: pairedSummary(W.map(w => A(w, x).all - A(w, y).all), C.BOOTSTRAP) }]));
  for (const [name, pred] of [['empty store (0 episodes)', (n) => n === 0], ['at least 1 episode', (n) => n >= 1], ['at least 20 episodes', (n) => n >= 20]]) {
    const ws = W.filter(w => pred(S.perWorld[w].realEpisodes));
    if (!ws.length) { out.storeSize[name] = { worlds: 0 }; continue; }
    const d = (a, b) => pairedSummary(ws.map(w => A(w, a).legal - A(w, b).legal), C.BOOTSTRAP);
    out.storeSize[name] = { worlds: ws.length, benefitFloor: d('COLD_FLOOR', 'COLD'), benefitReal: d('REAL', 'COLD'), benefitEntry: d('ENTRY_NR', 'COLD'), realMinusFloor: d('REAL', 'COLD_FLOOR'), entryMinusFloor: d('ENTRY_NR', 'COLD_FLOOR') };
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
  const r = exploratory(S);
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(r, null, 1));
  const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
  const g = (s) => (s ? `${f(s.mean)} [${f(s.ci.lower)}, ${f(s.ci.upper)}]` : 'n/a');
  console.log('EXPLORATORY (post-hoc): per-world paired changes relative to COLD');
  for (const [a, x] of Object.entries(r.arms)) console.log(`  ${a.padEnd(11)} legal gain ${g(x.legalGain)} | non-edge change ${g(x.nonEdgeChange)} | every-reset gain ${g(x.everyResetGain)} | goal-edge penalty change ${g(x.goalEdgePenaltyChange)} | legal share of every-reset gain ${f(x.legalShareOfEveryResetGain, 2)} | r(legal, non-edge) ${f(x.corr_legalGain_nonEdgeChange.r, 2)} | r(legal, penalty) ${f(x.corr_legalGain_penaltyChange.r, 2)}`);
  for (const [k, x] of Object.entries(r.storeEffect)) console.log(`  ${k.padEnd(28)} legal ${g(x.legal)} | non-edge ${g(x.nonEdge)} | every reset ${g(x.everyReset)}`);
  for (const [n, s] of Object.entries(r.storeSize)) console.log(`  store size ${n}: ${s.worlds} worlds` + (s.worlds ? `  floor ${g(s.benefitFloor)} REAL ${g(s.benefitReal)} ENTRY ${g(s.benefitEntry)}  REAL-floor ${g(s.realMinusFloor)}  ENTRY-floor ${g(s.entryMinusFloor)}` : ''));
}

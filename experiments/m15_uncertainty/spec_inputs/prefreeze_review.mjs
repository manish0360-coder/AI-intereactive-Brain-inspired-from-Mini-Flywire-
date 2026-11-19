// M15 pre-freeze review probe (2026-11-19, on the owner's "Review first"), development labels only.
//   node experiments/m15_uncertainty/spec_inputs/prefreeze_review.mjs > experiments/m15_uncertainty/spec_inputs/prefreeze_review.out
// Labels m15unc|dev|0..59, already exposed by the development procedure; window w* = 2. Nothing here is a criterion.
// It shows what the pre-declared calibration criteria measure:
//   (1) UA's exact calibration by no-change condition, against the pooled no-change ECE of BT1 (opposite errors in
//       one bin cancel in a pooled ECE);
//   (2) thin evidence: in SPARSE, NEWEST is exactly right (the relation is exact), so BT5b measures UA's
//       underconfidence, not NEWEST's overconfidence;
//   (3) the change uncertainty P(r_t <= 3), which PROPOSAL section 2.4 says is reported and the first build omitted;
//   (4) the secondary yoked stream and the closed-loop detour shares.
// At the freeze preparation (2026-11-19) the analysis replaced its reported-only profile with the BT-COND line; the
// review's profile function is kept here unchanged (same stream tags), so this file still reproduces its output.
import { runLabel, NO_CHANGE, mergeAcc } from '../m15_lib.mjs';
import { reported, clusterBootstrap, eceOf } from '../m15_analysis.mjs';

const f = (x, d = 4) => (x === null || x === undefined ? 'null' : x.toFixed(d));
const Ls = Array.from({ length: 60 }, (_, i) => runLabel(`m15unc|dev|${i}`, { windows: [2] }));
const R = reported(Ls, { domain: 'review', wStar: 2 });
function calibrationByCondition(mech) {
  const out = {};
  for (const sc of NO_CHANGE) {
    const r = clusterBootstrap(Ls.map((L) => Float64Array.from(mergeAcc([L.passive.route[mech].acc[sc]]).binsE)), `m15unc|stats|review|ECEcond|${sc}${mech === 'UA' ? '' : `|${mech}`}`, (v) => eceOf(v).ece);
    const pooled = mergeAcc(Ls.map((L) => L.passive.route[mech].acc[sc]));
    out[sc] = { points: pooled.n, ece: r.mean, lo: r.lo, hi: r.hi, direction: eceOf(pooled.binsE).direction, meanConfidence: pooled.conf / pooled.n, exactAccuracy: pooled.a / pooled.n };
  }
  const N = NO_CHANGE.reduce((s, sc) => s + out[sc].points, 0);
  out.pointWeightedMean = NO_CHANGE.reduce((s, sc) => s + out[sc].points * out[sc].ece, 0) / N;
  out.pooled = eceOf(mergeAcc(Ls.flatMap((L) => NO_CHANGE.map((sc) => L.passive.route[mech].acc[sc]))).binsE).ece;
  return out;
}
R.calibrationByCondition = { UA: calibrationByCondition('UA'), UA_h05: calibrationByCondition('UA_h05') };

console.log('(1) exact calibration by no-change condition (route stream; cluster-bootstrap 95% intervals)');
for (const m of ['UA', 'UA_h05']) {
  const p = R.calibrationByCondition[m];
  console.log(`  ${m}: pooled no-change ECE (BT1's quantity) ${f(p.pooled)}; point-weighted mean of the four conditions ${f(p.pointWeightedMean)}`);
  for (const sc of NO_CHANGE) console.log(`    ${sc.padEnd(8)} ECE ${f(p[sc].ece)} [${f(p[sc].lo)}, ${f(p[sc].hi)}]  direction ${f(p[sc].direction)} (${p[sc].direction > 0 ? 'underconfident' : 'overconfident'})  mean confidence ${f(p[sc].meanConfidence)}  exact accuracy ${f(p[sc].exactAccuracy)}  points ${p[sc].points}`);
}
console.log('  other mechanisms, exact ECE (direction) by condition:');
for (const m of ['FREQ', 'NEWEST', 'WINDOW_w2', 'ORACLE']) {
  const x = R.passive.route[m];
  console.log(`    ${m.padEnd(10)} pooled ${f(x.NO_CHANGE.eceExact)} | ${NO_CHANGE.map((sc) => `${sc} ${f(x[sc].eceExact)} (${f(x[sc].eceExactDirection)})`).join('  ')}`);
}
console.log('(2) thin evidence, SPARSE evaluation worlds 1-3: overconfidence (mean confidence - mean expected correctness)');
for (const m of ['UA', 'NEWEST', 'FREQ', 'UA_h05']) { const x = R.passive.route[m].SPARSE_E0_2; console.log(`    ${m.padEnd(8)} overconfidence ${f(x.overconfidence)}  mean confidence ${f(x.meanConfidence)}  exact accuracy ${f(x.exactAccuracy)}`); }
console.log('(3) UA change uncertainty, mean P(r_t <= 3) at belief points (route stream):');
for (const g of ['STABLE', 'NOISY', 'SPARSE', 'REV_PRE', 'REV_POST_1_2', 'REV_POST_3_6']) console.log(`    ${g.padEnd(13)} ${f(R.passive.route.UA[g].meanShortRun)}   (h = 0.05: ${f(R.passive.route.UA_h05[g].meanShortRun)})`);
console.log('(4) secondary streams and the closed loop');
console.log(`    UA mean P(true value) in NOISY: route stream ${f(R.passive.route.UA.NOISY.meanPTrue)}, yoked stream (CONCRETE's own observations) ${f(R.passive.yoked.UA.NOISY.meanPTrue)}`);
console.log(`    closed-loop detour share (observations not on the route): ${Object.entries(R.closed).map(([a, x]) => `${a} ${f(x.detourShare, 3)}`).join(', ')}`);

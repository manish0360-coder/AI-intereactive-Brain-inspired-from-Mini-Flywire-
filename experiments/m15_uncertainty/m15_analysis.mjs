// ==========================================================
// M15 — statistics, pre-declared criteria, reported metrics and the reading rule (EVALUATION code)
// ==========================================================
// Input: the in-memory label records of m15_lib.mjs (runLabel), in NUMERIC label order. Two kinds of interval:
//   paired per-label contrasts   pairedBootstrap (cognitive/testbed/stats.mjs), 10,000 resamples, tag
//                                `m15unc|stats|<domain>|<name>`, over the per-label values in numeric label order
//   pooled quantities            cluster bootstrap over labels (ECE, AUROC, rates, overconfidence, reliability):
//                                10,000 resamples; each draws n labels with replacement (stream with the same tag
//                                form, n draws of floor(rnd * n) per resample) and recomputes the pooled quantity
//                                from every belief point (and probe outcome) of the drawn labels; differences between
//                                mechanisms are recomputed within the same resample (paired)
// Both report the 2.5th and 97.5th percentiles as sorted[250] and sorted[9749] (B = 10,000).
// A criterion passes only when its bound satisfies the stated inequality strictly.
// ==========================================================
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { makeStream } from '../../cognitive/testbed/rng.mjs';
import { M15, SENSITIVITY, NO_CHANGE, COND_SCOPES, CONDITIONS, E7, mergeAcc, windowName, assertNumericOrder, closedArms } from './m15_lib.mjs';

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
export const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
export const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// ---- pooled quantities from summed accumulators ----
/** ECE and direction from bins [n, sum conf, sum correctness] x 10 (empty bins omitted). */
export function eceOf(bins) {
  let N = 0; for (let b = 0; b < 10; b++) N += bins[3 * b];
  if (!N) return { ece: null, direction: null };
  let e = 0, d = 0;
  for (let b = 0; b < 10; b++) { const n = bins[3 * b]; if (!n) continue; const gap = bins[3 * b + 2] / n - bins[3 * b + 1] / n; e += (n / N) * Math.abs(gap); d += (n / N) * gap; }
  return { ece: e, direction: d };
}
export function reliabilityTable(bins) {
  return Array.from({ length: 10 }, (_, b) => ({ bin: [b / 10, (b + 1) / 10], n: bins[3 * b], meanConfidence: bins[3 * b] ? bins[3 * b + 1] / bins[3 * b] : null, meanCorrectness: bins[3 * b] ? bins[3 * b + 2] / bins[3 * b] : null }));
}
/** AUROC of confidence for probe correctness; points [conf, a, pCorr, pn]; ties take average ranks. */
export function aurocOf(points) {
  const s = [...points].sort((x, y) => x[0] - y[0]);
  let pos = 0, neg = 0, below = 0, auc = 0;
  for (let i = 0; i < s.length;) {
    let j = i, P = 0, Nn = 0;
    while (j < s.length && s[j][0] === s[i][0]) { P += s[j][2]; Nn += s[j][3] - s[j][2]; j++; }
    auc += P * (below + 0.5 * Nn);
    below += Nn; pos += P; neg += Nn; i = j;
  }
  return pos && neg ? auc / (pos * neg) : null;
}
/** Equal-mass ECE (10 groups of consecutive points by confidence; sensitivity only, no interval). */
export function equalMassEce(points) {
  const s = [...points].sort((x, y) => x[0] - y[0]), N = s.length;
  let e = 0, d = 0;
  for (let g = 0; g < 10; g++) {
    const part = s.slice(Math.floor((g * N) / 10), Math.floor(((g + 1) * N) / 10));
    if (!part.length) continue;
    const gap = mean(part.map((x) => x[1])) - mean(part.map((x) => x[0]));
    e += (part.length / N) * Math.abs(gap); d += (part.length / N) * gap;
  }
  return { ece: e, direction: d };
}

// ---- bootstraps ----
/** Cluster bootstrap: vecs[i] = per-label vector; stat(summed vector) -> number. */
export function clusterBootstrap(vecs, tag, stat, B = M15.bootstrap) {
  const n = vecs.length, d = vecs[0].length;
  const total = new Float64Array(d);
  for (const v of vecs) for (let j = 0; j < d; j++) total[j] += v[j];
  const est = stat(total);
  const rnd = makeStream(tag);
  const vals = new Float64Array(B), acc = new Float64Array(d);
  for (let b = 0; b < B; b++) {
    acc.fill(0);
    for (let i = 0; i < n; i++) { const v = vecs[Math.floor(rnd() * n)]; for (let j = 0; j < d; j++) acc[j] += v[j]; }
    vals[b] = stat(acc);
  }
  const se = sd(Array.from(vals));
  vals.sort();
  // loFamily: the 0.625th percentile (sorted[62] at B = 10,000), the lower bound of a one-sided 2.5% test adjusted
  // for four conditions (Bonferroni); used only by BT-COND's MATERIAL FAIL classification
  return { n, mean: est, lo: vals[Math.floor(0.025 * B)], hi: vals[Math.ceil(0.975 * B) - 1], loFamily: vals[Math.floor(0.00625 * B)], B, se };
}
/** Cluster bootstrap of AUROC (or a difference of two), from per-label point lists, with global confidence ranks. */
export function aurocBootstrap(pointLists, tag, B = M15.bootstrap) {
  // pointLists: per label, an array of { m: index of mechanism (0 or 1), conf, pos, neg }
  const confs = [...new Set(pointLists.flat().map((x) => x.conf))].sort((a, b) => a - b);
  const rank = new Map(confs.map((c, i) => [c, i]));
  const mechs = Math.max(...pointLists.flat().map((x) => x.m)) + 1;
  const R = confs.length;
  const lab = pointLists.map((pts) => pts.map((x) => [x.m * R + rank.get(x.conf), x.pos, x.neg]));
  const P = new Float64Array(mechs * R), Nn = new Float64Array(mechs * R);
  const stat = () => {
    const out = [];
    for (let m = 0; m < mechs; m++) {
      let below = 0, auc = 0, pos = 0, neg = 0;
      for (let r = m * R; r < (m + 1) * R; r++) { auc += P[r] * (below + 0.5 * Nn[r]); below += Nn[r]; pos += P[r]; neg += Nn[r]; }
      out.push(auc / (pos * neg));
    }
    return out.length === 1 ? out[0] : out[0] - out[1];
  };
  const fill = (pick) => { P.fill(0); Nn.fill(0); for (const i of pick) for (const [r, p, q] of lab[i]) { P[r] += p; Nn[r] += q; } };
  const n = pointLists.length;
  fill(Array.from({ length: n }, (_, i) => i));
  const est = stat();
  const rnd = makeStream(tag);
  const vals = new Float64Array(B);
  const pick = new Array(n);
  for (let b = 0; b < B; b++) { for (let i = 0; i < n; i++) pick[i] = Math.floor(rnd() * n); fill(pick); vals[b] = stat(); }
  const se = sd(Array.from(vals));
  vals.sort();
  return { n, mean: est, lo: vals[Math.floor(0.025 * B)], hi: vals[Math.ceil(0.975 * B) - 1], B, se };
}

/** The no-change belief points of a label's record (flat [conf, a, pCorr, pn, ...]) as tuples. */
export function tuples(flat) {
  const out = [];
  for (let i = 0; i < flat.length; i += 4) out.push([flat[i], flat[i + 1], flat[i + 2], flat[i + 3]]);
  return out;
}

// ---- per-label quantities ----
const accOf = (L, stream, mech, scopes) => mergeAcc(scopes.map((s) => L.passive[stream][mech].acc[s]));
const perLabelMean = (L, stream, mech, scopes, f) => { const a = accOf(L, stream, mech, scopes); return a[f] / a.n; };
/** Exact Brier over all evaluation points of every condition, conditions weighted equally (the w* objective and MECH-a). */
const allCondBrier = (L, stream, mech) => mean(CONDITIONS.map((c) => perLabelMean(L, stream, mech, COND_SCOPES[c], 'brier')));
const meanDelay = (L, stream, mech) => mean(L.passive[stream][mech].delay);
export const STEP_WINDOWS = Object.freeze({
  STABLE_1_16: { cond: 'STABLE', pick: (w) => w.e !== null },
  NOISY_1_16: { cond: 'NOISY', pick: (w) => w.e !== null },
  POST_1_6: { cond: 'REVERSED', pick: (w) => w.post !== null && w.post <= 5 },
  SPARSE_1_3: { cond: 'SPARSE', pick: (w) => w.e !== null && w.e <= 2 },
});
export const stepsIn = (L, arm, win) => mean(L.closed[STEP_WINDOWS[win].cond][arm].filter(STEP_WINDOWS[win].pick).map((w) => w.steps));

const vecECE = (L, stream, mech, scopes, B = 'binsE') => Float64Array.from(accOf(L, stream, mech, scopes)[B]);
const vecFA = (L, stream, mech, scopes) => { const a = accOf(L, stream, mech, scopes); return Float64Array.of(a.fa, a.uniq); };
const vecOver = (L, stream, mech, scopes) => { const a = accOf(L, stream, mech, scopes); return Float64Array.of(a.conf, a.a, a.n); };
const vecPTrue = (L, stream, mech, scopes) => { const a = accOf(L, stream, mech, scopes); return Float64Array.of(a.pTrue, a.n); };
const vecDet = (L, stream, mech) => Float64Array.of(L.passive[stream][mech].delay.filter((d) => d <= M15.delayWithin).length, L.passive[stream][mech].delay.length);
const cat = (a, b) => { const v = new Float64Array(a.length + b.length); v.set(a); v.set(b, a.length); return v; };
const ece0 = (v) => eceOf(v.subarray(0, 30)).ece;
const ece1 = (v) => eceOf(v.subarray(30, 60)).ece;

// ---- the criteria ----
/**
 * Every powered part (T, BT, CD, ACT) and MECH, as { name, line, what, kind, dir, threshold, ...interval, pass }.
 * ctx: { domain, wStar, margin }. ua: the mechanism under test (UA; a sensitivity arm for the BT report).
 */
export function criteria(Ls, ctx, { ua = 'UA', blocks = ['T', 'BT', 'CD', 'ACT', 'MECH'] } = {}) {
  assertNumericOrder(Ls.map((L) => L.label));
  const tag = (t) => `m15unc|stats|${ctx.domain}|${t}`;
  const WIN = windowName(ctx.wStar);
  const sfx = ua === 'UA' ? '' : `|${ua}`;
  const out = [];
  const paired = (name, line, what, f, dir, threshold) => {
    const d = Ls.map(f);
    const r = pairedBootstrap(d, tag(name + sfx));
    out.push({ name, line, what, kind: 'paired', dir, threshold, ...r, sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, perLabel: d });
  };
  const cluster = (name, line, what, vec, stat, dir, threshold) => {
    const r = clusterBootstrap(Ls.map(vec), tag(name + sfx), stat);
    out.push({ name, line, what, kind: 'cluster', dir, threshold, ...r });
  };
  const R = 'route';
  if (blocks.includes('T')) paired('T', 'T', 'STABLE steps, evaluation worlds 1-16: CONCRETE - UA (closed loop)', (L) => stepsIn(L, 'CONCRETE', 'STABLE_1_16') - stepsIn(L, ua, 'STABLE_1_16'), 'lo>', 0);
  if (blocks.includes('BT')) {
    cluster('BT1', 'BT', `exact top-1 ECE, no-change phases (${ua})`, (L) => vecECE(L, R, ua, NO_CHANGE), (v) => eceOf(v).ece, 'hi<', 0.10);
    paired('BT2a', 'BT', `exact expected Brier, no-change phases: NEWEST - ${ua}`, (L) => perLabelMean(L, R, 'NEWEST', NO_CHANGE, 'brier') - perLabelMean(L, R, ua, NO_CHANGE, 'brier'), 'lo>', 0);
    cluster('BT2b', 'BT', `exact ECE, no-change phases: NEWEST - ${ua}`, (L) => cat(vecECE(L, R, 'NEWEST', NO_CHANGE), vecECE(L, R, ua, NO_CHANGE)), (v) => ece0(v) - ece1(v), 'lo>', 0);
    cluster('BT3a', 'BT', `|mean P(true value) - 0.75| in NOISY, exact (${ua})`, (L) => vecPTrue(L, R, ua, ['NOISY']), (v) => Math.abs(v[0] / v[1] - 0.75), 'hi<', 0.10);
    paired('BT3b', 'BT', `mean P(true value), STABLE - NOISY, exact (${ua})`, (L) => perLabelMean(L, R, ua, ['STABLE'], 'pTrue') - perLabelMean(L, R, ua, ['NOISY'], 'pTrue'), 'lo>', 0);
    const r = aurocBootstrap(Ls.map((L) => tuples(L.passive[R][ua].points).map((x) => ({ m: 0, conf: x[0], pos: x[2], neg: x[3] - x[2] }))), tag('BT3c' + sfx));
    out.push({ name: 'BT3c', line: 'BT', what: `AUROC of confidence for probe correctness, no-change phases (${ua})`, kind: 'cluster', dir: 'lo>', threshold: 0.5, ...r });
    paired('BT4', 'BT', `exact expected Brier, no-change phases: ${ua} - FREQ (cost of the change layer)`, (L) => perLabelMean(L, R, ua, NO_CHANGE, 'brier') - perLabelMean(L, R, 'FREQ', NO_CHANGE, 'brier'), 'hi<', 0.05);
    cluster('BT5a', 'BT', `overconfidence (mean confidence - mean expected correctness), SPARSE evaluation worlds 1-3 (${ua})`, (L) => vecOver(L, R, ua, ['SPARSE_E0_2']), (v) => (v[0] - v[1]) / v[2], 'hi<', 0.10);
    cluster('BT5b', 'BT', `overconfidence, SPARSE evaluation worlds 1-3: NEWEST - ${ua}`, (L) => cat(vecOver(L, R, 'NEWEST', ['SPARSE_E0_2']), vecOver(L, R, ua, ['SPARSE_E0_2'])), (v) => (v[0] - v[1]) / v[2] - (v[3] - v[4]) / v[5], 'lo>', 0);
  }
  if (blocks.includes('CD')) {
    paired('CD1a', 'CD', 'detection delay (post-switch observations, censored at 7), mean of the four kinds: FREQ - UA', (L) => meanDelay(L, R, 'FREQ') - meanDelay(L, R, 'UA'), 'lo>', 0);
    cluster('CD1b', 'CD', 'UA detection rate (share of kinds detected within 6 post-switch observations)', (L) => vecDet(L, R, 'UA'), (v) => v[0] / v[1], 'lo>', 0.75);
    cluster('CD2a', 'CD', 'UA false-alarm rate, no-change phases', (L) => vecFA(L, R, 'UA', NO_CHANGE), (v) => v[0] / v[1], 'hi<', 0.10);
    cluster('CD2b', 'CD', 'false-alarm rate in NOISY: NEWEST - UA', (L) => cat(vecFA(L, R, 'NEWEST', ['NOISY']), vecFA(L, R, 'UA', ['NOISY'])), (v) => v[0] / v[1] - v[2] / v[3], 'lo>', 0);
    paired('CD3a', 'CD', 'exact expected Brier, post-switch observations 3-6: FREQ - UA', (L) => perLabelMean(L, R, 'FREQ', ['REV_POST_3_6'], 'brier') - perLabelMean(L, R, 'UA', ['REV_POST_3_6'], 'brier'), 'lo>', 0);
    paired('CD3b', 'CD', 'exact expected Brier, post-switch observations 3-6: FROZEN - UA', (L) => perLabelMean(L, R, 'FROZEN', ['REV_POST_3_6'], 'brier') - perLabelMean(L, R, 'UA', ['REV_POST_3_6'], 'brier'), 'lo>', 0);
  }
  if (blocks.includes('ACT')) {
    paired('ACT1a', 'ACT', 'NOISY steps, evaluation worlds 1-16: UA - CONCRETE', (L) => stepsIn(L, 'UA', 'NOISY_1_16') - stepsIn(L, 'CONCRETE', 'NOISY_1_16'), 'hi<', ctx.margin);
    paired('ACT1b', 'ACT', 'NOISY steps, evaluation worlds 1-16: NEWEST - UA', (L) => stepsIn(L, 'NEWEST', 'NOISY_1_16') - stepsIn(L, 'UA', 'NOISY_1_16'), 'lo>', 0);
    paired('ACT2a', 'ACT', 'REVERSED post-switch worlds 1-6 steps: FROZEN - UA', (L) => stepsIn(L, 'FROZEN', 'POST_1_6') - stepsIn(L, 'UA', 'POST_1_6'), 'lo>', 0);
    paired('ACT2b', 'ACT', 'REVERSED post-switch worlds 1-6 steps: FREQ - UA', (L) => stepsIn(L, 'FREQ', 'POST_1_6') - stepsIn(L, 'UA', 'POST_1_6'), 'lo>', 0);
    paired('ACT3', 'ACT', 'SPARSE evaluation worlds 1-3 steps: UA - CONCRETE', (L) => stepsIn(L, 'UA', 'SPARSE_1_3') - stepsIn(L, 'CONCRETE', 'SPARSE_1_3'), 'hi<', ctx.margin);
  }
  if (blocks.includes('MECH')) {
    paired('MECH-a', 'MECH', `exact expected Brier, all evaluation points, conditions weighted equally: ${WIN} - UA`, (L) => allCondBrier(L, R, WIN) - allCondBrier(L, R, 'UA'), 'lo>', 0);
    paired('MECH-b', 'MECH', `detection delay: UA - ${WIN}`, (L) => meanDelay(L, R, 'UA') - meanDelay(L, R, WIN), 'hi<', 1);
    cluster('MECH-c', 'MECH', `false-alarm rate, no-change phases: ${WIN} - UA`, (L) => cat(vecFA(L, R, WIN, NO_CHANGE), vecFA(L, R, 'UA', NO_CHANGE)), (v) => v[0] / v[1] - v[2] / v[3], 'lo>', 0);
  }
  for (const c of out) c.pass = c.n > 0 && c.lo !== null && Number.isFinite(c.lo) && (c.dir === 'lo>' ? c.lo > c.threshold : c.hi < c.threshold);
  return out;
}

// ---- reported metrics (no criterion) ----
const SCOPE_GROUPS = Object.freeze({ NO_CHANGE, STABLE: ['STABLE'], NOISY: ['NOISY'], SPARSE: ['SPARSE'], SPARSE_E0_2: ['SPARSE_E0_2'], REV_PRE: ['REV_PRE'], REV_POST_1_2: ['REV_POST_1_2'], REV_POST_3_6: ['REV_POST_3_6'], REV_POST: ['REV_POST'] });
function pooledSummary(accs) {
  const a = mergeAcc(accs);
  if (!a.n) return null;
  const E = eceOf(a.binsE), P = eceOf(a.binsP), Cw = eceOf(a.binsC);
  return {
    points: a.n, expectedBrier: a.brier / a.n, expectedLog: a.log / a.n, exactAccuracy: a.a / a.n, meanConfidence: a.conf / a.n,
    overconfidence: (a.conf - a.a) / a.n, meanPTrue: a.pTrue / a.n, falseAlarmRate: a.uniq ? a.fa / a.uniq : null, uniqueMap: a.uniq,
    probeBrier: a.pBrier / a.pn, probeLog: a.pLog / a.pn, probeAccuracy: a.pCorr / a.pn,
    eceExact: E.ece, eceExactDirection: E.direction, eceEmpirical: P.ece, eceEmpiricalDirection: P.direction, eceClasswise: Cw.ece,
    meanShortRun: a.srn ? a.sr / a.srn : null,
  };
}

/**
 * BT-COND — calibration in each no-change condition. ADDED AT THE PRE-FREEZE REVIEW (2026-11-19), AFTER DEVELOPMENT
 * RESULTS WERE OBSERVED; NOT PART OF THE ORIGINAL PRE-DECLARATION (SPEC.md, "BT-COND"). BT1 is unchanged.
 * For each condition c in STABLE, NOISY, SPARSE, REVERSED before the switch: UA's exact top-1 ECE over c's belief points
 * (route stream), with a cluster bootstrap over labels (tag m15unc|stats|<domain>|BTCOND|<c>[|<arm>]). Classification:
 *   PASS           the 95% upper bound (sorted[9749]) < 0.10            (false PASS <= 2.5% per condition)
 *   MATERIAL FAIL  the lower bound at the 0.625th percentile (sorted[62]) >= 0.10, i.e. one-sided 2.5% Bonferroni-
 *                  adjusted for four conditions                          (false FAIL anywhere <= 2.5% familywise)
 *   INCONCLUSIVE   otherwise;  MISSING  no belief point in c (a run with a missing condition is INVALID)
 * The line "calibration across conditions" reads SHOWN only if all four are PASS (intersection-union: a false SHOWN
 * <= 2.5%, no correction needed). The four results are mandatory: every statement lists them.
 */
export const BTCOND = Object.freeze({ threshold: 0.10, passUpperQuantile: 0.975, failLowerQuantile: 0.00625, conditions: NO_CHANGE, added: 'pre-freeze review, 2026-11-19, after development results were observed; not part of the original pre-declaration' });
export function classifyCondition(r) {
  if (!r || !(r.points > 0) || !Number.isFinite(r.ece)) return 'MISSING';
  if (r.hi < BTCOND.threshold) return 'PASS';
  if (r.loFamily >= BTCOND.threshold) return 'MATERIAL FAIL';
  return 'INCONCLUSIVE';
}
export function conditionCalibration(Ls, ctx, mech = 'UA') {
  const tag = (t) => `m15unc|stats|${ctx.domain}|BTCOND|${t}${mech === 'UA' ? '' : `|${mech}`}`;
  const conditions = {};
  for (const sc of NO_CHANGE) {
    const pooled = mergeAcc(Ls.map((L) => L.passive.route[mech].acc[sc]));
    if (!pooled.n) { conditions[sc] = { points: 0, classification: 'MISSING' }; continue; }
    const r = clusterBootstrap(Ls.map((L) => vecECE(L, 'route', mech, [sc])), tag(sc), (v) => eceOf(v).ece);
    conditions[sc] = { points: pooled.n, ece: r.mean, lo: r.lo, hi: r.hi, loFamily: r.loFamily, se: r.se, direction: eceOf(pooled.binsE).direction, meanConfidence: pooled.conf / pooled.n, exactAccuracy: pooled.a / pooled.n };
    conditions[sc].classification = classifyCondition(conditions[sc]);
  }
  const present = NO_CHANGE.filter((sc) => conditions[sc].points > 0);
  const N = sum(present.map((sc) => conditions[sc].points));
  const allPass = NO_CHANGE.every((sc) => conditions[sc].classification === 'PASS');
  return {
    mech, threshold: BTCOND.threshold, added: BTCOND.added, conditions,
    complete: NO_CHANGE.every((sc) => conditions[sc].classification !== 'MISSING'),
    allPass,
    line: allPass ? 'SHOWN' : `NOT SHOWN (${NO_CHANGE.filter((sc) => conditions[sc].classification !== 'PASS').map((sc) => `${sc} ${conditions[sc].classification}`).join(', ')})`,
    pointWeightedMean: N ? sum(present.map((sc) => conditions[sc].points * conditions[sc].ece)) / N : null,
    pooled: eceOf(mergeAcc(Ls.flatMap((L) => NO_CHANGE.map((sc) => L.passive.route[mech].acc[sc]))).binsE).ece,
  };
}
export function reported(Ls, ctx) {
  const mechs = Object.keys(Ls[0].passive.route);
  const out = { passive: {}, delays: {}, closed: {}, closedDiagnostics: {} };
  for (const st of ['route', 'yoked']) {
    out.passive[st] = {};
    out.delays[st] = {};
    for (const m of mechs) {
      out.passive[st][m] = Object.fromEntries(Object.entries(SCOPE_GROUPS).map(([g, scopes]) => [g, pooledSummary(Ls.flatMap((L) => scopes.map((s) => L.passive[st][m].acc[s])))]));
      out.passive[st][m].allConditionsBrier = mean(CONDITIONS.map((c) => { const a = mergeAcc(Ls.flatMap((L) => COND_SCOPES[c].map((s) => L.passive[st][m].acc[s]))); return a.brier / a.n; }));
      const del = Ls.map((L) => meanDelay(L, st, m)), s = Ls.map((L) => L.s);
      const mx = mean(s), my = mean(del), sxx = sum(s.map((x) => (x - mx) ** 2));
      out.delays[st][m] = {
        meanDelayObservations: my, meanDelayWorlds: mean(Ls.map((L) => mean(L.passive[st][m].delayWorlds))),
        detectionRate: sum(Ls.map((L) => L.passive[st][m].delay.filter((d) => d <= M15.delayWithin).length)) / (4 * Ls.length),
        censored: sum(Ls.map((L) => L.passive[st][m].delay.filter((d) => d === M15.delayCensor).length)),
        slopeOnS: sxx ? sum(s.map((x, i) => (x - mx) * (del[i] - my))) / sxx : null,
        meanPostSwitchObservations: mean(Ls.flatMap((L) => L.passive[st][m].postObs)),
      };
      if (st === 'route') {
        const pts = Ls.flatMap((L) => tuples(L.passive.route[m].points));
        out.passive.route[m].NO_CHANGE.equalMassEce = equalMassEce(pts);
        out.passive.route[m].NO_CHANGE.auroc = aurocOf(pts);
        const wC = sum(pts.map((x) => x[2])), wI = sum(pts.map((x) => x[3] - x[2]));
        out.passive.route[m].NO_CHANGE.meanConfidenceCorrectProbes = wC ? sum(pts.map((x) => x[0] * x[2])) / wC : null;
        out.passive.route[m].NO_CHANGE.meanConfidenceIncorrectProbes = wI ? sum(pts.map((x) => x[0] * (x[3] - x[2]))) / wI : null;
      }
    }
  }
  out.conditionCalibration = { UA_h05: conditionCalibration(Ls, ctx, 'UA_h05') };   // UA's is the BT-COND line itself (driver: btCond)
  out.reliabilityUA = reliabilityTable(mergeAcc(Ls.flatMap((L) => NO_CHANGE.map((s) => L.passive.route.UA.acc[s]))).binsE);
  out.reliabilityUAEmpirical = reliabilityTable(mergeAcc(Ls.flatMap((L) => NO_CHANGE.map((s) => L.passive.route.UA.acc[s]))).binsP);
  const arms = Object.keys(Ls[0].closed.STABLE);
  for (const arm of arms) {
    out.closed[arm] = {};
    for (const win of Object.keys(STEP_WINDOWS)) out.closed[arm][win] = { meanSteps: mean(Ls.map((L) => stepsIn(L, arm, win))), medianOfLabelMeans: median(Ls.map((L) => stepsIn(L, arm, win))) };
    out.closed[arm].capped = sum(Ls.map((L) => sum(CONDITIONS.map((c) => L.closed[c][arm].filter((w) => !w.done).length))));
    const warm = Ls.map((L) => sum(L.closed.STABLE[arm].filter((w) => w.e === null).map((w) => w.nObs)) / 4);
    out.closed[arm].observationsPerKindAfterWarmup = mean(warm);
    out.closed[arm].observationsPerKindPerPostSwitchWorld = mean(Ls.map((L) => mean(L.closed.REVERSED[arm].filter((w) => w.post !== null && w.post <= 5).map((w) => w.nObs / 4))));
    const all = Ls.flatMap((L) => CONDITIONS.flatMap((c) => L.closed[c][arm]));
    out.closed[arm].detourShare = sum(all.map((w) => w.nObs - w.routeSteps)) / sum(all.map((w) => w.nObs));
    if (Ls[0].closedDiag[arm]) {
      out.closedDiagnostics[arm] = Object.fromEntries(Object.entries(SCOPE_GROUPS).map(([g, scopes]) => [g, pooledSummary(Ls.flatMap((L) => scopes.map((s) => L.closedDiag[arm].acc[s])))]));
      const pq = {};
      for (const L of Ls) for (const [sc, q] of Object.entries(L.closedDiag[arm].preq)) { const t = pq[sc] || (pq[sc] = { n: 0, log: 0, brier: 0, hit: 0 }); for (const f of ['n', 'log', 'brier', 'hit']) t[f] += q[f]; }
      out.closedDiagnostics[arm].onPolicyPrequential = Object.fromEntries(Object.entries(pq).map(([sc, q]) => [sc, { observations: q.n, log: q.log / q.n, brier: q.brier / q.n, accuracy: q.hit / q.n }]));
    }
  }
  out.behaviourWindowVsUA = Object.fromEntries(['NOISY_1_16', 'POST_1_6'].map((win) => [win, pairedBootstrap(Ls.map((L) => stepsIn(L, windowName(ctx.wStar), win) - stepsIn(L, 'UA', win)), `m15unc|stats|${ctx.domain}|WINDOW-UA|${win}`)]));
  return out;
}

// ---- the reading rule ----
const CONDITION_NAME = Object.freeze({ STABLE: 'STABLE', NOISY: 'NOISY', SPARSE: 'SPARSE', REV_PRE: 'REVERSED before the switch' });
const directionWord = (d) => (d > 0 ? 'underconfident' : d < 0 ? 'overconfident' : 'no net direction');
const f3 = (x) => x.toFixed(3);
/** The mandatory clause: all four BT-COND results (ECE, 95% interval, direction, classification) beside BT1's pooled value. */
export function profileClause(btc) {
  return `BT1 pools the no-change conditions (pooled exact ECE ${f3(btc.pooled)}); UA's exact ECE by condition (BT-COND, threshold 0.10): ${NO_CHANGE.map((sc) => { const c = btc.conditions[sc]; return `${CONDITION_NAME[sc]} ${f3(c.ece)} [${f3(c.lo)}, ${f3(c.hi)}] ${directionWord(c.direction)}, ${c.classification}`; }).join('; ')}; point-weighted mean ${f3(btc.pointWeightedMean)}`;
}
/** Why calibration across conditions is not shown: every condition that is not PASS. */
export function acrossConditionsShortfall(btc) {
  return NO_CHANGE.filter((sc) => btc.conditions[sc].classification !== 'PASS').map((sc) => {
    const c = btc.conditions[sc];
    if (c.classification === 'MATERIAL FAIL') return `UA materially ${directionWord(c.direction)} in ${CONDITION_NAME[sc]} (ECE ${f3(c.ece)})`;
    if (c.classification === 'INCONCLUSIVE') return `${CONDITION_NAME[sc]} inconclusive (ECE ${f3(c.ece)} [${f3(c.lo)}, ${f3(c.hi)}])`;
    return `${CONDITION_NAME[sc]} missing`;
  }).join(', ');
}
/**
 * The verdict lines and the statement (SPEC.md, "Verdict"). btc: UA's BT-COND result (conditionCalibration). The four
 * condition results are mandatory: without all four the run reads INVALID (part conditionResults).
 */
export function readingRule(C, sensitivityBT, validity, btc = null) {
  const parts = { determinism: !!validity.determinism, suite: !!validity.suite, vRev: !!validity.vRev, concretePassive: !!validity.concretePassive, noExclusion: !!validity.noExclusion, frozenUnchanged: !!validity.frozenUnchanged, probeIsolation: !!validity.probeIsolation, identity: !!validity.identity, conditionResults: !!btc && btc.complete === true };
  const valid = Object.values(parts).every(Boolean);
  const line = (l) => C.filter((c) => c.line === l);
  const all = (l) => line(l).length > 0 && line(l).every((c) => c.pass);
  const failed = (l) => line(l).filter((c) => !c.pass).map((c) => c.name);
  const T = all('T');
  const lines = {
    validity: valid ? 'VALID' : `INVALID (${Object.entries(parts).filter(([, v]) => !v).map(([k]) => k).join(', ')})`,
    transfer: T ? 'SHOWN' : 'NOT SHOWN',
    calibratedBeliefTracking: all('BT') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('BT').join(', ')})`,
    calibrationAcrossConditions: !btc ? 'NOT SHOWN (not computed)' : btc.line,
    changeDetection: all('CD') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('CD').join(', ')})`,
    activeBehaviour: !T ? 'NOT INTERPRETABLE (transfer not shown)' : all('ACT') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('ACT').join(', ')})`,
    bayesianAdvantageOverTunedWindow: all('MECH') ? 'SHOWN' : `NOT SHOWN (failed: ${failed('MECH').join(', ')}; predicted NOT SHOWN)`,
  };
  const h05 = sensitivityBT.UA_h05;
  const h05Text = h05 ? `originally specified h = 0.05 (sensitivity arm): BT parts passed ${h05.filter((c) => c.pass).length} of ${h05.length}${h05.every((c) => c.pass) ? '' : ` (failed: ${h05.filter((c) => !c.pass).map((c) => c.name).join(', ')})`}` : '';
  let statement;
  if (!valid) statement = 'INVALID — NO CRITERION IS INTERPRETED';
  else {
    const bt = all('BT'), cd = all('CD'), across = btc.allPass === true;
    const closedLoop = lines.activeBehaviour === 'SHOWN' ? ', IN CLOSED-LOOP BEHAVIOUR' : '';
    const parts2 = [];
    if (bt && cd && across) parts2.push(`CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN, with a development-selected hazard (h = 0.01)${closedLoop}`);
    else if (bt && cd) {
      parts2.push(`POOLED CALIBRATION AND CHANGE DETECTION SHOWN (development-selected h = 0.01)${closedLoop}`);
      parts2.push(`CALIBRATION ACROSS CONDITIONS NOT SHOWN: ${acrossConditionsShortfall(btc)}`);
    } else {
      parts2.push(`POOLED CALIBRATED BELIEF TRACKING (BT, development-selected hazard h = 0.01): ${bt ? 'SHOWN' : 'NOT SHOWN'}`);
      parts2.push(`CALIBRATION ACROSS CONDITIONS: ${across ? 'SHOWN' : `NOT SHOWN: ${acrossConditionsShortfall(btc)}`}`);
      parts2.push(`CHANGE DETECTION: ${cd ? 'SHOWN' : 'NOT SHOWN'}`);
      parts2.push(`ACTIVE BEHAVIOUR: ${lines.activeBehaviour}`);
    }
    parts2.push(all('MECH') ? 'Bayesian change-point inference outperforms a tuned window rule' : 'change detection not distinguished from a tuned window rule');
    parts2.push(h05Text);
    parts2.push(profileClause(btc));
    statement = parts2.filter(Boolean).join('; ');
  }
  return { parts, lines, statement, neverClaimed: 'uncertainty-aware decision-making, confidence-aware exploration and metacognition' };
}

/** The sensitivity arms' BT block (reported, never used to choose). */
export function sensitivityBT(Ls, ctx) {
  return Object.fromEntries(Object.keys(SENSITIVITY).map((m) => [m, criteria(Ls, ctx, { ua: m, blocks: ['BT'] })]));
}

export { closedArms, E7 };

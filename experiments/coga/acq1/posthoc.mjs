// ==========================================================
// ACQ-1 — exploratory diagnostics on the confirmatory logs (written AFTER the outcome was known; none of this changes the decision)
// ==========================================================
//   node experiments/coga/acq1/posthoc.mjs --dir experiments/coga/data/acq1-confirmatory --out experiments/coga/acq1/evidence/posthoc.json
// They ask what the primary result could also be, and how it bears on the propagation study:
//   bins        psi in 1,500-step bins, including the propagation study's horizon [0, 1500), on all attempts and on first attempts
//   retries     psi with a retry after a slip dropped: persistence inflates the attempt share of unreliable edges
//   arrival     psi within (state, predecessor) pairs, weights n1 n2 / (n1 + n2): removes the arrival mix, which differs between E1 and E2
//   goalEntry   main.js:5018 skips the environment when next is the goal, so MFW's goal-entering choices are not attempts: never slip,
//               never in the log, not in the primary metric.  `goalResets` holds them.  psi with them restored; psi without goal-adjacent
//               states; psi against the sets of the environment MFW actually met (goal edges p = 1)
//   hop         E1 has 26 reliable edges and E2 13, so a reliability-blind goal gradient that strengthens with arrivals would also give
//               psi > 0 wherever A1 is the shorter route.  It predicts psi <= 0 where A2 is shorter; edge-level acquisition predicts > 0
//   classes     psi by the propagation study's state classes (distal.mjs)
//   placebo     each world's logs scored against the SWITCH sets of the next world with the same goal.  Weak: same goal, and E1 / E2 differ
//               systematically, so it need not be exactly 0
//   goals       goal entries per 1,000 steps by 3,000-step window and environment
//   contrasts   H - P and A - P in the first window, the only place development suggested they differ
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { generateAccepted } from '../../m7/env.js';
import { GRAPH } from '../worlds.mjs';
import { classifyState } from '../distal.mjs';
import { GAMMA, KAPPA } from '../config.mjs';
import { KIND } from '../envsim.mjs';
import { describeAcq, switchStates } from './states.mjs';
import { runAcq } from './baselines.mjs';
import { worldMetric } from './metric.mjs';
import { interval, decideAcq } from './analysis.mjs';
import { ACQ_AUTHORIZATION as LOCK } from './lock.mjs';
import { QB1_PARAMS, STEPS, DELTA } from './config.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = arg('--dir');
const AGENTS = ['P', 'A', 'H', 'RW', 'QB1'], MFW = ['P', 'A', 'H'];
const WINDOW = [9000, 12000];
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const ci = (rows, f) => { const r = interval(rows, f, { level: 0.95 }); return { est: r.est, lo: r.lo, hi: r.hi, worlds: r.worlds }; };
const adjacent = (s, t) => GRAPH.adj.get(s).some(x => x.v === t);

const worlds = LOCK.allocation.map(a => { const g = generateAccepted(a.configSeed, a.index); return describeAcq({ cfg: g.cfg, acceptedSeed: a.configSeed, configIndex: a.index, stream: 'study' }); });
/** a session: log rows, and the log with goal-entering choices restored as successful edge attempts (baselines: already in the log) */
function load(w, a, e) {
  if (!MFW.includes(a)) { const r = runAcq({ world: w, agent: a, env: e, params: QB1_PARAMS, steps: STEPS }); return { log: r.log, full: r.log, entries: r.log.filter(x => x[3] === KIND.EDGE && x[4] === 1 && x[2] === w.goal).map(x => x[0]), illegalEntries: 0 }; }
  const S = JSON.parse(fs.readFileSync(path.join(DIR, `MFW${a}-w${w.index}-${e}.json`), 'utf8'));
  const legal = S.goalResets.filter(r => r[2] === 1), full = [...S.log, ...legal.map(([t, from]) => [t, from, w.goal, KIND.EDGE, 1])].sort((x, y) => x[0] - y[0]);
  return { log: S.log, full, entries: legal.map(r => r[0]), illegalEntries: S.goalResets.length - legal.length };
}

const inWindow = (log, lo, hi) => log.filter(r => r[0] >= lo && r[0] < hi && r[3] === KIND.EDGE);
const share = (rows, set) => rows.filter(r => set.includes(r[2])).length / rows.length;
const psiS = (r1, r2, d) => 0.5 * (share(r1, d.A1) - share(r2, d.A1) + share(r2, d.A2) - share(r1, d.A2));
function worldPsi(sw, r1, r2, keep) { const v = []; for (const d of sw) { if (keep && !keep(d)) continue; const a = r1.filter(r => r[1] === d.s), b = r2.filter(r => r[1] === d.s); if (a.length && b.length) v.push(psiS(a, b, d)); } return mean(v); }

/** edge attempts annotated with `retry` (the last edge attempt failed from this state) and `pred` (the node the agent arrived from; -1 after a reset) */
function annotate(log) {
  const out = []; let prev = null, pred = -1;
  for (const r of log) {
    if (r[3] !== KIND.EDGE) continue;
    const retry = !!prev && prev[4] === 0 && prev[1] === r[1];
    if (prev && prev[4] === 1 && prev[2] === r[1]) pred = prev[1]; else if (!retry) pred = -1;
    out.push({ t: r[0], s: r[1], a: r[2], ok: r[4], retry, pred, same: retry && prev[2] === r[2] }); prev = r;
  }
  return out;
}
const toRow = (x) => [x.t, x.s, x.a, KIND.EDGE, x.ok];
const fShare = (x, set) => x.filter(r => set.includes(r.a)).length / x.length;
function psiArrival(sw, A1, A2) {
  const v = [];
  for (const d of sw) {
    const a = A1.filter(r => r.s === d.s), b = A2.filter(r => r.s === d.s); let num = 0, den = 0;
    for (const u of new Set(a.map(r => r.pred))) {
      const x = a.filter(r => r.pred === u), y = b.filter(r => r.pred === u); if (!x.length || !y.length) continue;
      const h = x.length * y.length / (x.length + y.length);
      num += h * 0.5 * (fShare(x, d.A1) - fShare(y, d.A1) + fShare(y, d.A2) - fShare(x, d.A2)); den += h;
    }
    if (den) v.push(num / den);
  }
  return mean(v);
}
/** hop distance from every node to the goal on G minus s */
function hops(goal, removed) {
  const d = new Map([[goal, 0]]), q = [goal];
  while (q.length) { const u = q.shift(); for (const { v } of GRAPH.adj.get(u)) if (v !== removed && !d.has(v)) { d.set(v, d.get(u) + 1); q.push(v); } }
  return d;
}
function hopStratum(d, goal) { const h = hops(goal, d.s), m = (A) => Math.min(...A.map(a => (h.has(a) ? h.get(a) : Infinity))), a = m(d.A1), b = m(d.A2); return a < b ? 'A1nearer' : a > b ? 'A2nearer' : 'equal'; }

const out = { schema: 'coga/acq1.posthoc', status: 'exploratory, written after the confirmatory outcome; never changes the decision', window: WINDOW };
const count = { goalAdjacentStates: 0, goalInASets: 0, hop: { A1nearer: 0, equal: 0, A2nearer: 0 }, illegalEntries: 0, entriesInWindow: 0, attemptsInWindowAtSwitch: 0, entriesInWindowAtSwitch: 0, effectiveSwitchStates: 0 };
const rows = worlds.map(w => {
  const r = { world: w.id, goal: w.goal, bins: {}, binsFirst: {}, first: {}, arrival: {}, primary: {}, full: {}, nonAdj: {}, adj: {}, eff: {}, side1: {}, side2: {}, pooled: {}, hop: {}, hopNonAdj: {}, cls: {}, placebo: {}, retryAll: {}, retrySame: {}, goals: {} };
  const cls = new Map(w.sw.map(d => [d.s, classifyState(GRAPH, w.p1, w.p2, w.goal, d.s, { gamma: GAMMA, kappa: KAPPA }).cls]));
  r.classes = [...cls.values()];
  const hopOf = new Map(w.sw.map(d => [d.s, hopStratum(d, w.goal)]));
  for (const d of w.sw) { count.hop[hopOf.get(d.s)]++; if (adjacent(d.s, w.goal)) { count.goalAdjacentStates++; if (d.A1.includes(w.goal) || d.A2.includes(w.goal)) count.goalInASets++; } }
  const goalEdges = GRAPH.adj.get(w.goal).map(x => x.e), eff = (p) => p.map((x, e) => (goalEdges.includes(e) ? 1 : x)), swEff = switchStates(eff(w.p1), eff(w.p2), w.goal);
  count.effectiveSwitchStates += swEff.length;
  const same = worlds.filter(x => x.goal === w.goal), next = same[(same.indexOf(w) + 1) % same.length];
  for (const a of AGENTS) {
    const S1 = load(w, a, 'E1'), S2 = load(w, a, 'E2');
    if (MFW.includes(a)) count.illegalEntries += S1.illegalEntries + S2.illegalEntries;
    const an1 = annotate(S1.log), an2 = annotate(S2.log);
    r.bins[a] = []; r.binsFirst[a] = [];
    for (let lo = 0; lo < 12000; lo += 1500) {
      const x = (an) => an.filter(q => q.t >= lo && q.t < lo + 1500);
      r.bins[a].push(worldPsi(w.sw, inWindow(S1.log, lo, lo + 1500), inWindow(S2.log, lo, lo + 1500)));
      r.binsFirst[a].push(worldPsi(w.sw, x(an1).filter(q => !q.retry).map(toRow), x(an2).filter(q => !q.retry).map(toRow)));
    }
    const w1 = inWindow(S1.log, ...WINDOW), w2 = inWindow(S2.log, ...WINDOW), f1 = inWindow(S1.full, ...WINDOW), f2 = inWindow(S2.full, ...WINDOW);
    const a1 = an1.filter(q => q.t >= WINDOW[0] && q.t < WINDOW[1]), a2 = an2.filter(q => q.t >= WINDOW[0] && q.t < WINDOW[1]);
    r.primary[a] = worldPsi(w.sw, w1, w2);
    r.first[a] = r.binsFirst[a][6] === null || r.binsFirst[a][7] === null ? null : worldPsi(w.sw, a1.filter(q => !q.retry).map(toRow), a2.filter(q => !q.retry).map(toRow));
    r.arrival[a] = psiArrival(w.sw, a1, a2);
    r.full[a] = worldPsi(w.sw, f1, f2);
    r.nonAdj[a] = worldPsi(w.sw, f1, f2, d => !adjacent(d.s, w.goal));
    r.adj[a] = worldPsi(w.sw, f1, f2, d => adjacent(d.s, w.goal));
    r.eff[a] = worldPsi(swEff, f1, f2);
    const sides = [], pooled = [];
    for (const d of w.sw) { const x = f1.filter(q => q[1] === d.s), y = f2.filter(q => q[1] === d.s); if (x.length && y.length) { sides.push([share(x, d.A1) - share(y, d.A1), share(y, d.A2) - share(x, d.A2)]); pooled.push((share(x, d.A1) + share(y, d.A1)) / 2 - (share(x, d.A2) + share(y, d.A2)) / 2); } }
    r.side1[a] = mean(sides.map(x => x[0])); r.side2[a] = mean(sides.map(x => x[1])); r.pooled[a] = mean(pooled);
    r.hop[a] = {}; r.hopNonAdj[a] = {};
    for (const h of ['A1nearer', 'equal', 'A2nearer']) { r.hop[a][h] = worldPsi(w.sw, f1, f2, d => hopOf.get(d.s) === h); r.hopNonAdj[a][h] = worldPsi(w.sw, f1, f2, d => hopOf.get(d.s) === h && !adjacent(d.s, w.goal)); }
    r.cls[a] = { LOCAL: worldPsi(w.sw, f1, f2, d => cls.get(d.s) === 'LOCAL'), DISTAL: worldPsi(w.sw, f1, f2, d => cls.get(d.s) === 'DISTAL'), OTHER: worldPsi(w.sw, f1, f2, d => !['LOCAL', 'DISTAL'].includes(cls.get(d.s))) };
    r.placebo[a] = worldMetric({ ...w, sw: next.sw }, S1.full, S2.full, ...WINDOW).psi;
    const all = [...a1, ...a2], tries = all.filter(q => q.retry);
    r.retryAll[a] = tries.length / all.length; r.retrySame[a] = tries.length ? tries.filter(q => q.same).length / tries.length : null;
    r.goals[a] = { E1: [], E2: [] }; for (const [e, S] of [['E1', S1], ['E2', S2]]) for (let lo = 0; lo < 12000; lo += 3000) r.goals[a][e].push(S.entries.filter(t => t >= lo && t < lo + 3000).length / 3);
    if (a === 'P') { const sw = new Set(w.sw.map(d => d.s)); for (const S of [S1, S2]) { const q = inWindow(S.full, ...WINDOW), l = inWindow(S.log, ...WINDOW); count.entriesInWindow += q.length - l.length; count.attemptsInWindowAtSwitch += l.filter(x => sw.has(x[1])).length; count.entriesInWindowAtSwitch += q.filter(x => sw.has(x[1])).length - l.filter(x => sw.has(x[1])).length; } }
  }
  return r;
});

const family = (key) => Object.fromEntries(AGENTS.map(a => [a, ci(rows, r => r[key][a])]));
const minusRW = (key, get = (r, a) => r[key][a]) => ci(rows, r => { const x = get(r, 'P'), y = get(r, 'RW'); return x === null || y === null ? null : x - y; });
const row = (c) => decideAcq({ L: c.lo, U: c.hi, delta: DELTA, voidShare: 0, determinismOk: true, nullOk: true, pcOk: true });
const sens = (c) => ({ ...c, row: row(c).row });

out.counts = count;
out.switchStates = { total: rows.reduce((t, r) => t + r.classes.length, 0), byClass: rows.flatMap(r => r.classes).reduce((m, c) => { m[c] = (m[c] || 0) + 1; return m; }, {}) };
out.bins = Object.fromEntries(AGENTS.map(a => [a, rows[0].bins[a].map((_, k) => ci(rows, r => r.bins[a][k]))]));
out.binsFirstAttempts = Object.fromEntries(AGENTS.map(a => [a, rows[0].bins[a].map((_, k) => ci(rows, r => r.binsFirst[a][k]))]));
out.binsMinusRW = rows[0].bins.P.map((_, k) => ci(rows, r => (r.bins.P[k] === null || r.bins.RW[k] === null ? null : r.bins.P[k] - r.bins.RW[k])));
out.primaryCheck = sens(minusRW('primary'));
out.sensitivityDelta = {
  firstAttemptsOnly: sens(minusRW('first')), arrivalConditioned: sens(minusRW('arrival')), goalEntriesRestored: sens(minusRW('full')),
  goalEntriesRestored_nonAdjacentStates: sens(minusRW('nonAdj')), goalEntriesRestored_adjacentStates: sens(minusRW('adj')), effectiveEnvironmentSets: sens(minusRW('eff')),
};
out.levels = { firstAttemptsOnly: family('first'), arrivalConditioned: family('arrival'), goalEntriesRestored: family('full'), nonAdjacent: family('nonAdj'), effectiveEnvironmentSets: family('eff') };
out.sideA1 = family('side1'); out.sideA2 = family('side2'); out.pooledPreference_A1_minus_A2 = family('pooled');
out.placebo = family('placebo');
out.hopStrata = Object.fromEntries(['A1nearer', 'equal', 'A2nearer'].map(h => [h, { all: Object.fromEntries(AGENTS.map(a => [a, ci(rows, r => r.hop[a][h])])), nonAdjacent: Object.fromEntries(AGENTS.map(a => [a, ci(rows, r => r.hopNonAdj[a][h])])) }]));
out.byClass = Object.fromEntries(['LOCAL', 'DISTAL', 'OTHER'].map(c => [c, Object.fromEntries(AGENTS.map(a => [a, ci(rows, r => r.cls[a][c])]))]));
out.retries = Object.fromEntries(AGENTS.map(a => [a, { shareOfAttempts: mean(rows.map(r => r.retryAll[a])), sameTargetAfterFailure: mean(rows.map(r => r.retrySame[a]).filter(x => x !== null)) }]));
out.goalEntriesPer1000Steps = Object.fromEntries(AGENTS.map(a => [a, Object.fromEntries(['E1', 'E2'].map(e => [e, [0, 1, 2, 3].map(k => mean(rows.map(r => r.goals[a][e][k])))]))]));
out.goalEntriesContrast = { P_E1_minus_E2_lastWindow: ci(rows, r => r.goals.P.E1[3] - r.goals.P.E2[3]), P_E1_last_minus_first: ci(rows, r => r.goals.P.E1[3] - r.goals.P.E1[0]), P_E2_last_minus_first: ci(rows, r => r.goals.P.E2[3] - r.goals.P.E2[0]) };
out.earlyContrasts = { H_minus_P_0_3000: ci(rows, r => (r.bins.H[0] + r.bins.H[1]) / 2 - (r.bins.P[0] + r.bins.P[1]) / 2), A_minus_P_0_3000: ci(rows, r => (r.bins.A[0] + r.bins.A[1]) / 2 - (r.bins.P[0] + r.bins.P[1]) / 2), P_0_3000: ci(rows, r => (r.bins.P[0] + r.bins.P[1]) / 2), P_0_1500: ci(rows, r => r.bins.P[0]), P_first_attempts_0_1500: ci(rows, r => r.binsFirst.P[0]) };
fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
console.log(`posthoc written: ${rows.length} worlds`);

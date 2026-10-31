// ==========================================================
// ACQ-1 — what a shift of size delta is worth: expected steps to the goal under a shifted policy (static; development worlds only)
// ==========================================================
//   node experiments/coga/acq1/consequence.mjs --out <file.json>
// Base policy pi0(a | s): uniform over neighbours (an agent with no reliability knowledge; deliberately not MFW's own empirical policy:
// its memoryless reconstruction traps the chain in cycles, 603 expected steps against real episodes of about 8, so it is no anchor).
// Shifted policy in environment k: at each SWITCH state, P(A_k | s) rises by exactly d (the unit of psi), taken proportionally from
// the other actions and capped at 1.  The expected steps to the goal from a uniform non-goal start are solved exactly
// for the absorbing chain with slip-in-place:
//   T(u) = 1 + sum_a pi(a|u) [ p(u,a) T(a) + (1 - p(u,a)) T(u) ],  T(goal) = 0
// A shift of d in psi is reported as the relative reduction of expected steps.  This turns a shift in choice into its consequence
// for behaviour; it does not by itself say how large a consequence matters.
// ==========================================================
import fs from 'node:fs';
import { generateAcceptedStream } from '../../m7/env.js';
import { STUDY_STREAM_START, DEV_INDICES } from '../config.mjs';
import { GRAPH, NEIGHBOURS, edgeIndex } from '../worlds.mjs';
import { describeAcq } from './states.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };

/** expected steps to the goal from every node under policy pi; Gaussian elimination with partial pivoting */
export function expectedSteps(pi, p, goal) {
  const nodes = GRAPH.nodes.filter(n => n !== goal), idx = new Map(nodes.map((n, i) => [n, i])), N = nodes.length;
  const A = nodes.map(() => new Array(N + 1).fill(0));
  nodes.forEach((u, i) => {
    A[i][i] += 1; A[i][N] = 1;
    for (const a of NEIGHBOURS.get(u)) {
      const w = pi.get(u).get(a) || 0, q = p[edgeIndex(u, a)];
      A[i][i] -= w * (1 - q);
      if (a !== goal) A[i][idx.get(a)] -= w * q;
    }
  });
  for (let c = 0; c < N; c++) {
    let r = c; for (let i = c + 1; i < N; i++) if (Math.abs(A[i][c]) > Math.abs(A[r][c])) r = i;
    [A[c], A[r]] = [A[r], A[c]];
    for (let i = 0; i < N; i++) { if (i === c) continue; const f = A[i][c] / A[c][c]; if (f === 0) continue; for (let j = c; j <= N; j++) A[i][j] -= f * A[c][j]; }
  }
  return new Map(nodes.map((n, i) => [n, A[i][N] / A[i][i]]));
}
const meanStart = (T) => [...T.values()].reduce((a, b) => a + b, 0) / T.size;

const uniform = () => new Map(GRAPH.nodes.map(n => [n, new Map(NEIGHBOURS.get(n).map(a => [a, 1 / NEIGHBOURS.get(n).length]))]));
function shifted(pi0, sw, d, envKey) {
  const pi = new Map([...pi0].map(([s, m]) => [s, new Map(m)]));
  for (const x of sw) {
    const A = x[envKey], m = pi.get(x.s);
    const inA = A.reduce((t, a) => t + m.get(a), 0), up = Math.min(d, 1 - inA), off = 1 - inA;
    for (const [a, v] of m) m.set(a, A.includes(a) ? v * (1 + up / inA) : v * (1 - up / off));
  }
  return pi;
}

const worlds = generateAcceptedStream(STUDY_STREAM_START, DEV_INDICES.hi + 1).map(w => describeAcq({ cfg: w.cfg, acceptedSeed: w.acceptedSeed, configIndex: w.acceptedConfigIndex, stream: 'study' }));
const ds = [0.05, 0.10, 0.15, 0.20, 0.30];
const rows = ds.map(() => []); const base = [];
for (const w of worlds) {
  const pi0 = uniform();
  for (const [p, key] of [[w.p1, 'A1'], [w.p2, 'A2']]) {
    const t0 = meanStart(expectedSteps(pi0, p, w.goal)); base.push(t0);
    ds.forEach((d, i) => { const t = meanStart(expectedSteps(shifted(pi0, w.sw, d, key), p, w.goal)); rows[i].push(1 - t / t0); });
  }
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const out = { schema: 'coga/acq1.consequence', basePolicy: 'uniform', baseMeanSteps: mean(base), rows: ds.map((d, i) => ({ psiShift: d, meanReduction: mean(rows[i]), medianReduction: median(rows[i]), min: Math.min(...rows[i]), max: Math.max(...rows[i]) })) };
if (arg('--out')) fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
console.log(`base expected steps to the goal (uniform policy): ${out.baseMeanSteps.toFixed(1)}`);
for (const r of out.rows) console.log(`P(A_k | s) +${String(r.psiShift).padEnd(4)} at SWITCH states: expected steps down mean ${(100 * r.meanReduction).toFixed(1)}%, median ${(100 * r.medianReduction).toFixed(1)}% (range ${(100 * r.min).toFixed(1)}% to ${(100 * r.max).toFixed(1)}%)`);

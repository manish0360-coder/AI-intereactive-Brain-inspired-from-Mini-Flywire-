// ==========================================================
// GATE-FLOOR-SCOPE — the stale-reasoning diagnostic and the store diagnostics: pure classification functions (no I/O, no randomness)
// ==========================================================
// Source facts these functions rely on (pinned guard tree = HEAD main.js + floor line + goal-reset probe + the two guard lines):
//   * runAgent() starts with __M7_TEL__.step() (one call = one runAgent invocation).
//   * A DECISION is the single write `window.lastReasoning = { from: currentKey, to: nextKey }` inside runPrediction at step 0 (static
//     invariant S5: the only write, an object literal, never cleared).  runPrediction(agentCurrent) is reached on ~92 % of calls; the
//     replay branch and runPrediction's early exits do not write, so a reasoning can be CARRIED into a later call.
//   * The EXEC SITE is the pinned EXEC line, immediately before `let nextStep = reasoning.to;` with reasoning = window.lastReasoning.  Every
//     executed move passes it; the move itself is `next = window.lastReasoning.to` and `agentCurrent = next` (no write in between).
//   * A goal reset is observed by the derived tree's probe goalReset(agentCurrent, current, goal) in the same call as the EXEC arrival
//     that carried `current` (= reasoning.to = goal).
// An ARRIVAL is one evaluation of the EXEC site: { call, a: agentCurrent, to: reasoning.to as passed to the line, rFrom, rTo: the
// reasoning object read at the site, fresh: the reasoning object was (re)written during this call, legal: a === to or {a,to} is a graph
// edge, blocked: the execution guard refused it }.
// ==========================================================

import { prng } from '../xfer1/stats.mjs';

/** percentile bootstrap of a ratio of totals sum(num)/sum(den), resampling worlds with replacement (same convention as xfer1 bootstrapMeanCi) */
export function ratioCi(nums, dens, { replicates, seed, level }) {
  const n = nums.length;
  const tot = (idx) => { let a = 0, b = 0; for (const i of idx) { a += nums[i]; b += dens[i]; } return b > 0 ? a / b : null; };
  const point = tot([...Array(n).keys()]);
  if (n === 0 || point === null) return { share: point, n, ci: null };
  const r = prng(seed), vals = [];
  for (let k = 0; k < replicates; k++) { const idx = new Array(n); for (let i = 0; i < n; i++) idx[i] = Math.floor(r() * n); const v = tot(idx); if (v !== null) vals.push(v); }
  vals.sort((a, b) => a - b);
  const lo = (1 - level) / 2, hi = 1 - lo, m = vals.length;
  const at = (q) => vals[Math.min(m - 1, Math.max(0, Math.floor(q * m)))];
  return { share: point, n, ci: m ? { lower: at(lo), upper: at(hi) } : null };
}

export const ARRIVAL_CLASSES = Object.freeze(['FRESH', 'CARRIED', 'STALE', 'UNCLASSIFIED']);
/** the channel a NON-GRAPH goal reset is attributed to, by the class of the arrival that executed it */
export const CHANNEL_OF = Object.freeze({ FRESH: 'decision', CARRIED: 'decisionCarried', STALE: 'stale', UNCLASSIFIED: 'unclassified' });

const nul = (v) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));

/**
 * FRESH        the reasoning was written in this call and was decided at the agent's position (rFrom == a)
 * CARRIED      the reasoning was written in an earlier call but was decided at the agent's current position (rFrom == a)
 * STALE        the reasoning was written in an earlier call at ANOTHER position (rFrom != a): executing it moves the agent along a pair it never decided
 * UNCLASSIFIED missing data, a target that is not the reasoning's target, or a contradiction (written this call yet decided elsewhere)
 */
export function classifyArrival(x) {
  if (!x || nul(x.a) || nul(x.to) || nul(x.rFrom) || nul(x.rTo) || typeof x.fresh !== 'boolean') return 'UNCLASSIFIED';
  if (Number(x.rTo) !== Number(x.to)) return 'UNCLASSIFIED';
  const aligned = Number(x.rFrom) === Number(x.a);
  if (aligned) return x.fresh ? 'FRESH' : 'CARRIED';
  return x.fresh ? 'UNCLASSIFIED' : 'STALE';
}

/** a goal reset { from, to, goal } is classified by the ONE arrival of its call; none, several, or a position / target mismatch -> UNCLASSIFIED */
export function classifyReset(reset, arrivalsOfCall) {
  if (!Array.isArray(arrivalsOfCall) || arrivalsOfCall.length !== 1) return 'UNCLASSIFIED';
  const x = arrivalsOfCall[0];
  if (nul(reset.from) || nul(reset.to) || Number(x.a) !== Number(reset.from) || Number(x.to) !== Number(reset.to)) return 'UNCLASSIFIED';
  return classifyArrival(x);
}

const zero = () => ({ FRESH: 0, CARRIED: 0, STALE: 0, UNCLASSIFIED: 0 });
/**
 * one session's diagnostic summary.  arrivals: [{ call, a, to, rFrom, rTo, fresh, legal, blocked }]; resets: [{ call, from, to, goal }];
 * isEdge(a, b) the world's graph.  A reset is LEGAL iff {from, goal} is a graph edge and to == goal (the probe's own rule).
 */
export function summarizeDiag({ arrivals, resets, isEdge }) {
  const byCall = new Map();
  for (const x of arrivals) { const l = byCall.get(x.call); if (l) l.push(x); else byCall.set(x.call, [x]); }
  const duplicateCalls = [...byCall.values()].filter(l => l.length > 1).length;
  const arr = { total: arrivals.length, duplicateCalls, byClass: {} };
  for (const k of ARRIVAL_CLASSES) arr.byClass[k] = { n: 0, illegal: 0, blocked: 0, illegalExecuted: 0, toGoalReset: 0 };
  let blocked = 0, illegalExecuted = 0;
  for (const x of arrivals) {
    const k = (byCall.get(x.call).length > 1) ? 'UNCLASSIFIED' : classifyArrival(x);
    const b = arr.byClass[k];
    b.n++;
    if (!x.legal) { b.illegal++; if (x.blocked) b.blocked++; else { b.illegalExecuted++; illegalExecuted++; } }
    if (x.blocked) blocked++;
  }
  const res = { legal: zero(), nonGraph: zero() };
  for (const r of resets) {
    const legal = !nul(r.from) && !nul(r.to) && isEdge(Number(r.from), Number(r.to)) && Number(r.to) === Number(r.goal);
    const k = classifyReset(r, byCall.get(r.call));
    res[legal ? 'legal' : 'nonGraph'][k]++;
    const own = byCall.get(r.call);
    if (own && own.length === 1) arr.byClass[k === 'UNCLASSIFIED' ? 'UNCLASSIFIED' : k].toGoalReset++;
  }
  const sum = (o) => o.FRESH + o.CARRIED + o.STALE + o.UNCLASSIFIED;
  return { arrivals: arr, resets: res, resetTotals: { legal: sum(res.legal), nonGraph: sum(res.nonGraph) }, blocked, illegalExecuted,
    channels: { stale: res.nonGraph.STALE, decision: res.nonGraph.FRESH, decisionCarried: res.nonGraph.CARRIED, unclassified: res.nonGraph.UNCLASSIFIED } };
}

/**
 * the recording audit: which consecutive pair a push into the episode path buffer (window.recentMemory) appended, and whether that pair is
 * the move the agent actually executed.  prev: the buffer seen at the previous arrival (a copy); cur: the buffer seen now; arrivalPrev: the
 * previous arrival.  Returns null when nothing was appended (no change, or the buffer was cleared), or
 * { pair: [p, x], kind: 'EXEC' | 'SKIP' | 'SELF', consistent } where kind = EXEC iff the recorded predecessor p is the position the move was
 * executed from.  A change that is not "prev + one node (window of 6)" is reported as inconsistent.
 */
export const PATH_WINDOW = 6;
export function appendedPair(prev, cur, arrivalPrev) {
  if (!Array.isArray(cur) || cur.length === 0) return null;
  const same = prev.length === cur.length && prev.every((v, i) => Number(v) === Number(cur[i]));
  if (same) return null;
  const x = cur[cur.length - 1];
  const exp = [...prev, x];
  while (exp.length > PATH_WINDOW) exp.shift();
  const consistent = exp.length === cur.length && exp.every((v, i) => Number(v) === Number(cur[i])) && !!arrivalPrev && Number(arrivalPrev.to) === Number(x);
  if (prev.length === 0) return { pair: null, kind: 'FIRST', consistent };
  const p = prev[prev.length - 1];
  if (Number(p) === Number(x)) return { pair: [p, x], kind: 'SELF', consistent };
  return { pair: [p, x], kind: arrivalPrev && Number(p) === Number(arrivalPrev.a) ? 'EXEC' : 'SKIP', consistent };
}

/** adjacency helpers over connections.json edges [{from, to}] (undirected) */
export function adjacency(edges) {
  const adj = new Map();
  const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
  for (const e of edges) { const a = Number(e.from), b = Number(e.to); add(a, b); add(b, a); }
  const isEdge = (a, b) => a !== null && b !== null && a !== undefined && b !== undefined && Number(a) !== Number(b) && !!adj.get(Number(a)) && adj.get(Number(a)).has(Number(b));
  const commonNeighbour = (a, b) => { const A = adj.get(Number(a)), B = adj.get(Number(b)); if (!A || !B) return false; for (const x of A) if (B.has(x)) return true; return false; };
  return { adj, isEdge, commonNeighbour };
}

/**
 * store diagnostics of an exported episode store.  pairClass (optional): Map 'a->b' -> { EXEC, SKIP } from the training session's recording
 * audit; every NON-GRAPH pair occurrence is then attributed EXECUTED (the pair was appended at least once as an executed move), SKIP (only
 * ever appended with a recorded predecessor that was not the executed origin) or UNRECORDED (never appended in that session).
 */
export function storeDiagnostics(episodes, { isEdge, commonNeighbour }, goal, pairClass = null) {
  let pairs = 0, nonGraphPairs = 0, terminalNonGraph = 0, twoHopConsistent = 0;
  const bySource = {}, attribution = pairClass ? { EXECUTED: 0, SKIP: 0, UNRECORDED: 0 } : null;
  for (const ep of episodes) {
    const n = (ep && Array.isArray(ep.nodes)) ? ep.nodes.map(Number) : [];
    bySource[ep && ep.source ? ep.source : 'unknown'] = (bySource[ep && ep.source ? ep.source : 'unknown'] || 0) + 1;
    for (let i = 0; i + 1 < n.length; i++) {
      if (n[i] === n[i + 1]) continue;
      pairs++;
      if (isEdge(n[i], n[i + 1])) continue;
      nonGraphPairs++;
      if (commonNeighbour(n[i], n[i + 1])) twoHopConsistent++;
      if (attribution) { const c = pairClass.get(`${n[i]}->${n[i + 1]}`); attribution[c && c.EXEC > 0 ? 'EXECUTED' : c && c.SKIP > 0 ? 'SKIP' : 'UNRECORDED']++; }
      if (i + 2 === n.length && Number(goal) === n[i + 1]) terminalNonGraph++;
    }
  }
  return { episodes: episodes.length, pairs, nonGraphPairs, nonGraphShare: pairs > 0 ? nonGraphPairs / pairs : 0, terminalNonGraph, twoHopConsistent, bySource, attribution };
}

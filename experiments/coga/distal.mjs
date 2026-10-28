// ==========================================================
// COG-A — distal-state classification (pure; no I/O, no randomness, no clock)
// ==========================================================
// Both objectives are shortest-path problems with slip-in-place geometric retries on every edge, written as COSTS (lower is
// better) so one relative tolerance kappa means the same thing for both:
//   'attempts'    expected attempts to the goal (ERR-04, the M7 reference): edge cost w(p) = 1/p
//   'discounted'  certainty-equivalent steps of the gamma-discounted value of reaching the goal:
//                 edge value g(p) = p*gamma / (1 - (1-p)*gamma) (a slip costs one step and is retried); a path's value is the
//                 product of g over its edges, and its cost is log(value) / log(gamma), i.e. edge cost w(p) = log g(p) / log gamma.
//                 A certain edge costs exactly 1 step; as gamma -> 1, w(p) -> 1/p.
// For a decision state s the cost of leaving s by neighbour a splits into
//   LOCAL        w(p(s,a))                                   (depends only on the edges incident to s)
//   CONTINUATION K(a) = shortest cost from a to the goal on G \ {s}   (depends only on edges not incident to s)
// Recombining the two phases' parts gives four cases:
//   Q11 = local I + cont. I    Q22 = local II + cont. II    QL = local II + cont. I    QC = local I + cont. II
// A state is DISTAL for an objective at tolerance kappa when
//   D2  robust switch:                      A(Q11) and A(Q22) are disjoint
//   D3  local change insufficient:          A(QL)  and A(Q22) are disjoint
//   D4  continuation change sufficient:     best(QC) is in A(Q22), and A(QC), A(Q11) are disjoint
// A(Q) = actions whose cost is within a factor (1 + kappa) of the minimum.  Each condition is monotone in kappa (A grows with
// kappa: D2, D3 and the disjointness in D4 can only fail as kappa grows, "best(QC) in A(Q22)" can only start to hold), so the
// tolerances at which a state is DISTAL form an interval and kappa-stability over [kappa/2, 2*kappa] is decided by its endpoints.
// ==========================================================

export const OBJECTIVES = Object.freeze(['attempts', 'discounted']);

/** the traversal graph in connections.json file order (the order env.js and main.js use) */
export function makeGraph(nodes, edges) {
  const adj = new Map(nodes.map(n => [n, []]));
  edges.forEach((e, i) => { adj.get(e.from).push({ v: e.to, e: i }); adj.get(e.to).push({ v: e.from, e: i }); });
  return { nodes: [...nodes], edges: edges.map((e, i) => ({ i, from: e.from, to: e.to })), adj };
}

export const geomFactor = (p, gamma) => (p * gamma) / (1 - (1 - p) * gamma);

/** the edge cost function of an objective */
export function edgeCost(objective, gamma) {
  if (objective === 'attempts') return (p) => 1 / p;
  if (objective === 'discounted') { if (!(gamma > 0 && gamma < 1)) throw new Error('gamma must lie in (0, 1)'); const lg = Math.log(gamma); return (p) => Math.log(geomFactor(p, gamma)) / lg; }
  throw new Error(`unknown objective ${objective}`);
}

/** continuation costs from every node to the goal on the graph without `removed` (null: nothing removed); Infinity = unreachable */
export function continuation(graph, p, goal, removed, objective, gamma) {
  if (goal === removed) throw new Error('the goal cannot be removed');
  const w = edgeCost(objective, gamma);
  const dist = new Map(graph.nodes.map(n => [n, Infinity]));
  dist.set(goal, 0);
  const done = new Set();
  for (;;) {
    let u = null, bestD = Infinity;
    for (const n of graph.nodes) if (n !== removed && !done.has(n) && dist.get(n) < bestD) { bestD = dist.get(n); u = n; }
    if (u === null) break;
    done.add(u);
    for (const { v, e } of graph.adj.get(u)) {
      if (v === removed || done.has(v)) continue;
      const d = dist.get(u) + w(p[e]);
      if (d < dist.get(v)) dist.set(v, d);
    }
  }
  return dist;
}

/** action costs at s from a local reliability vector and a continuation map; actions with no continuation are excluded */
export function actionValues(graph, s, pLocal, cont, objective, gamma) {
  const w = edgeCost(objective, gamma);
  const out = [];
  for (const { v, e } of graph.adj.get(s)) { const k = cont.get(v); if (k !== Infinity) out.push({ a: v, value: w(pLocal[e]) + k }); }
  return out;
}

export function nearOptimal(vals, kappa) {
  if (!vals.length) return new Set();
  const m = Math.min(...vals.map(x => x.value));
  return new Set(vals.filter(x => x.value <= (1 + kappa) * m).map(x => x.a));
}

/** the single cheapest action; an exact tie returns null (counted by the census; probability zero with continuous p) */
export function best(vals) {
  if (!vals.length) return null;
  const m = Math.min(...vals.map(x => x.value));
  const at = vals.filter(x => x.value === m);
  return at.length === 1 ? at[0].a : null;
}

const disjoint = (A, B) => { for (const x of A) if (B.has(x)) return false; return true; };
const sameSet = (A, B) => A.size === B.size && [...A].every(x => B.has(x));
const union = (A, B) => new Set([...A, ...B]);

/** the four recombined cost tables of state s under one objective */
export function cases(graph, s, p1, p2, goal, objective, gamma) {
  const K1 = continuation(graph, p1, goal, s, objective, gamma), K2 = continuation(graph, p2, goal, s, objective, gamma);
  return { Q11: actionValues(graph, s, p1, K1, objective, gamma), Q22: actionValues(graph, s, p2, K2, objective, gamma),
           QL: actionValues(graph, s, p2, K1, objective, gamma), QC: actionValues(graph, s, p1, K2, objective, gamma) };
}

/** classification of s under one objective at one tolerance */
export function classifyAt(c, kappa) {
  const A11 = nearOptimal(c.Q11, kappa), A22 = nearOptimal(c.Q22, kappa), AL = nearOptimal(c.QL, kappa), AC = nearOptimal(c.QC, kappa);
  const bC = best(c.QC);
  const D2 = A11.size > 0 && A22.size > 0 && disjoint(A11, A22);
  const D3 = disjoint(AL, A22);
  const D4 = bC !== null && A22.has(bC) && disjoint(AC, A11);
  const cls = !D2 ? 'NO_SWITCH' : !D3 ? 'LOCAL' : D4 ? 'DISTAL' : 'INTERACTION';
  return { A11, A22, AL, AC, D2, D3, D4, cls, stable: A11.size > 0 && sameSet(A11, A22) };
}

export const tolerancesOf = (kappa) => [kappa / 2, kappa, 2 * kappa];

/**
 * Full classification of a decision state.
 *   DISTAL: DISTAL under both objectives and disjoint unions A1* / A2*, at kappa/2, kappa and 2*kappa (the endpoints decide the
 *           whole band for the monotone conditions; the union-disjointness is monotone too).
 *   STABLE: identical near-optimal sets in the two phases under both objectives, and identical unions, at the same three
 *           tolerances (a placebo class; checked at the three points only, set equality is not monotone in kappa).
 *   A1star / A2star: the union over objectives of the near-optimal sets at kappa; the outcome Y scores a choice in A2star.
 */
export function classifyState(graph, p1, p2, goal, s, { gamma, kappa }) {
  if (s === goal) return { s, decision: false, cls: 'GOAL' };
  const deg = graph.adj.get(s).length;
  if (deg < 2) return { s, decision: false, cls: 'NOT_A_DECISION_STATE' };
  const per = {}, tol = tolerancesOf(kappa);
  for (const o of OBJECTIVES) { const c = cases(graph, s, p1, p2, goal, o, gamma); per[o] = { c, at: tol.map(k => classifyAt(c, k)) }; }
  const unions = tol.map((_, i) => ({ A1: union(per.attempts.at[i].A11, per.discounted.at[i].A11), A2: union(per.attempts.at[i].A22, per.discounted.at[i].A22) }));
  const distalAt = tol.map((_, i) => OBJECTIVES.every(o => per[o].at[i].cls === 'DISTAL') && disjoint(unions[i].A1, unions[i].A2));
  const stableAt = tol.map((_, i) => OBJECTIVES.every(o => per[o].at[i].stable) && sameSet(unions[i].A1, unions[i].A2));
  const distal = distalAt.every(Boolean), stable = !distal && stableAt.every(Boolean);
  const clsAt = (o) => per[o].at[1].cls;
  const cls = distal ? 'DISTAL' : stable ? 'STABLE'
    : clsAt('attempts') !== clsAt('discounted') ? 'OBJECTIVE_DISAGREES'
    : clsAt('attempts') === 'DISTAL' ? 'DISTAL_UNSTABLE' : clsAt('attempts');
  return {
    s, decision: true, deg, cls, distal, stable, distalAt, stableAt,
    perObjective: Object.fromEntries(OBJECTIVES.map(o => [o, { cls: clsAt(o), D2: per[o].at[1].D2, D3: per[o].at[1].D3, D4: per[o].at[1].D4,
      best1: best(per[o].c.Q11), best2: best(per[o].c.Q22) }])),
    A1star: [...unions[1].A1].sort((a, b) => a - b), A2star: [...unions[1].A2].sort((a, b) => a - b),
  };
}

/** every non-goal state of a world */
export function classifyWorld(graph, p1, p2, goal, opts) {
  return graph.nodes.filter(n => n !== goal).map(s => classifyState(graph, p1, p2, goal, s, opts));
}

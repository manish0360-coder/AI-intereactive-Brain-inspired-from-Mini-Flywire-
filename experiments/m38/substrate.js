// ==========================================================
// M38 — minimal scalable DEVELOPMENT substrate
// ==========================================================
// GOVERNING SOURCES
//   research/preregistrations/M38_P0_DEVELOPMENT_GRAPH_DESIGN.md  (graph + goal rule)
//   research/preregistrations/M37_SCALABLE_ACCEPTANCE_FORMULATION.md (R1', R2', oracle, AV3')
//
// DEVELOPMENT substrate only: not C1, not UQ-B, non-comparable to both. It is not an
// experiment and makes no FutureScore, planning or cognition claim.
//
// Additive. It reads neurons.json and connections.json and imports nothing from the
// repository: no env.js, no rng.js, no registry. It uses no random number generator
// and no seed, and it draws no reliability — p is always supplied by the caller,
// indexed by edge index.
//
// Every predicate takes the graph as an argument, so the verifier can run the same
// code on the frozen 20-node graph (against experiments/m7/env.js) and on the
// 100-node substrate.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// graph = { nodes, edges: [{ i, from, to }], adj, edgeOf }. Adjacency is built in edge
// order, exactly as env.js builds ADJ, so every tie-break inherits edge order.
export function makeGraph(nodes, edges) {
  const adj = new Map(nodes.map(n => [n, []]));
  const edgeOf = new Map();
  for (const e of edges) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); edgeOf.set(KEY(e.from, e.to), e.i); }
  return { nodes, edges, adj, edgeOf };
}

// ---- the frozen 20-node graph, as env.js loads it ----
const BASE_NODES = readJson('neurons.json').map(n => Number(n.id));
const BASE_EDGES = readJson('connections.json').map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));
export const BASE = makeGraph(BASE_NODES, BASE_EDGES);

// ---- M38-P0 §3: five modules, id(m, v) = 20·m + v, ports {8, 19} ----
export const MODULES = 5;
export const PORTS = [8, 19];
const id = (m, v) => 20 * m + v;

function buildSubstrate() {
  const nodes = [];
  for (let m = 0; m < MODULES; m++) for (const v of BASE_NODES) nodes.push(id(m, v));
  const edges = [];
  for (let m = 0; m < MODULES; m++) {
    for (const e of BASE_EDGES) edges.push({ i: edges.length, from: id(m, e.from), to: id(m, e.to) });
  }
  for (let i = 0; i < MODULES; i++) for (let j = i + 1; j < MODULES; j++) {
    for (const v of PORTS) edges.push({ i: edges.length, from: id(i, v), to: id(j, v) });
  }
  return makeGraph(nodes, edges);
}

export const SUBSTRATE = buildSubstrate();
export const NODES = SUBSTRATE.nodes;
export const EDGES = SUBSTRATE.edges;
export const ADJ = SUBSTRATE.adj;

// ---- M38-P0 §4: goals, rotated by configIndex mod 4 as in M7 ----
export const GOALS = Object.freeze([[0, 8], [1, 19], [2, 8], [3, 19]].map(([m, v]) => id(m, v)));
export const goalFor = (configIndex) => GOALS[configIndex % GOALS.length];

// neighbours of u in edge-index order (env.js orderedNeighbours)
function orderedNeighbours(G, u) {
  return G.adj.get(u).map(v => ({ v, edge: G.edgeOf.get(KEY(u, v)) })).sort((a, b) => a.edge - b.edge);
}

// ==========================================================
// R1' (M37): s has >= 2 simple routes to g  <=>  some block on the block-cut-tree route
// from s to g has >= 3 vertices. Returns the set of qualifying starts; the goal is
// excluded and an unreachable start has 0 routes, so it never qualifies.
// ==========================================================
function blocks(G) {
  const disc = new Map(), low = new Map(), stack = [], comps = [];
  let t = 0;
  const visit = (u, parent) => {
    disc.set(u, ++t); low.set(u, t);
    for (const v of G.adj.get(u)) {
      if (!disc.has(v)) {
        stack.push([u, v]);
        visit(v, u);
        low.set(u, Math.min(low.get(u), low.get(v)));
        if (low.get(v) >= disc.get(u)) {
          const verts = new Set();
          let e;
          do { e = stack.pop(); verts.add(e[0]); verts.add(e[1]); } while (!(e[0] === u && e[1] === v));
          comps.push(verts);
        }
      } else if (v !== parent && disc.get(v) < disc.get(u)) {
        stack.push([u, v]);
        low.set(u, Math.min(low.get(u), disc.get(v)));
      }
    }
  };
  for (const n of G.nodes) if (!disc.has(n)) visit(n, null);
  return comps;
}

export function r1PrimeStarts(G, goal) {
  const comps = blocks(G);
  const bc = new Map();
  const link = (a, b) => { if (!bc.has(a)) bc.set(a, []); if (!bc.has(b)) bc.set(b, []); bc.get(a).push(b); bc.get(b).push(a); };
  comps.forEach((vs, i) => { for (const x of vs) link(`v:${x}`, `b:${i}`); });
  const out = [];
  for (const s of G.nodes) {
    if (s === goal) continue;
    const prev = new Map([[`v:${s}`, null]]), q = [`v:${s}`];
    while (q.length) { const u = q.shift(); if (u === `v:${goal}`) break; for (const w of bc.get(u) || []) if (!prev.has(w)) { prev.set(w, u); q.push(w); } }
    if (!prev.has(`v:${goal}`)) continue;                      // unreachable: 0 routes
    for (let u = `v:${goal}`; u !== null; u = prev.get(u)) {
      if (u.startsWith('b:') && comps[Number(u.slice(2))].size >= 3) { out.push(s); break; }
    }
  }
  return out;
}

// No acceptance threshold is applied here: M7's ">= 6 starts" is a 20-node constant and
// its value at N = 100 awaits RULING-1. Callers compare the count.

// ==========================================================
// R2' (M37): R2(s) <=> R*(s) > R_hop(s), strict.
//   R*(s)    best prod p over all simple routes     (Dijkstra on -ln p)
//   R_hop(s) best prod p over hop-shortest routes  (DP over BFS layers)
// Both products are recomputed along the arg-optimal route in start -> goal order, as
// env.js multiplies. Cost model: prod p. Never Σ1/p.
// ==========================================================
export function r2PrimePerStart(G, goal, p) {
  const n = G.nodes;
  const hop = new Map([[goal, 0]]), q = [goal];
  while (q.length) { const x = q.shift(); for (const y of G.adj.get(x)) if (!hop.has(y)) { hop.set(y, hop.get(x) + 1); q.push(y); } }

  const D = new Map(n.map(x => [x, Infinity])), nxt = new Map();
  D.set(goal, 0);
  const done = new Set();
  while (done.size < n.length) {
    let u = null, b = Infinity;
    for (const x of n) if (!done.has(x) && D.get(x) < b) { b = D.get(x); u = x; }
    if (u === null) break;
    done.add(u);
    for (const v of G.adj.get(u)) {
      const w = -Math.log(p[G.edgeOf.get(KEY(u, v))]);
      if (D.get(u) + w < D.get(v)) { D.set(v, D.get(u) + w); nxt.set(v, u); }
    }
  }

  const order = [...hop.keys()].sort((a, b) => hop.get(a) - hop.get(b));
  const H = new Map([[goal, 1]]), hnxt = new Map();
  for (const u of order) {
    if (u === goal) continue;
    let best = -1, arg = null;
    for (const v of G.adj.get(u)) {
      if (hop.get(v) !== hop.get(u) - 1) continue;
      const val = p[G.edgeOf.get(KEY(u, v))] * H.get(v);
      if (val > best) { best = val; arg = v; }
    }
    H.set(u, best); hnxt.set(u, arg);
  }

  const productAlong = (s, next) => {
    const route = [];
    for (let u = s; u !== goal; u = next.get(u)) route.push(G.edgeOf.get(KEY(u, next.get(u))));
    return route.reduce((a, i) => a * p[i], 1);
  };
  const out = new Map();
  for (const s of n) {
    if (s === goal) continue;
    if (!hop.has(s)) { out.set(s, false); continue; }          // unreachable: no route, no R2
    out.set(s, productAlong(s, nxt) > productAlong(s, hnxt));
  }
  return out;
}

export const r2PrimeStarts = (G, goal, p) => [...r2PrimePerStart(G, goal, p)].filter(([, v]) => v).length;

// ==========================================================
// Oracle: expected attempts-to-goal, Σ1/p, Dijkstra from the goal — env.js
// expectedCostToGoal with the graph as a parameter. Unreachable nodes stay Infinity.
// ==========================================================
export function expectedCostToGoal(G, p, goal) {
  const C = new Map(G.nodes.map(n => [n, Infinity]));
  C.set(goal, 0);
  const done = new Set();
  while (done.size < G.nodes.length) {
    let u = null, bestC = Infinity;
    for (const n of G.nodes) if (!done.has(n) && C.get(n) < bestC) { bestC = C.get(n); u = n; }
    if (u === null) break;
    done.add(u);
    for (const { v, edge } of orderedNeighbours(G, u)) {
      const w = 1 / p[edge];
      if (C.get(u) + w < C.get(v)) C.set(v, C.get(u) + w);
    }
  }
  return C;
}

// ==========================================================
// AV3' (M37): Bellman-Ford on Σ1/p — edge relaxation, no label setting, so agreement
// with the Dijkstra oracle is evidence rather than repetition.
// ==========================================================
export function bellmanFordCost(G, p, goal) {
  const C = new Map(G.nodes.map(x => [x, Infinity])); C.set(goal, 0);
  for (let k = 0; k < G.nodes.length - 1; k++) {
    let changed = false;
    for (const e of G.edges) {
      const w = 1 / p[e.i];
      if (C.get(e.from) + w < C.get(e.to)) { C.set(e.to, C.get(e.from) + w); changed = true; }
      if (C.get(e.to) + w < C.get(e.from)) { C.set(e.from, C.get(e.to) + w); changed = true; }
    }
    if (!changed) break;
  }
  return C;
}

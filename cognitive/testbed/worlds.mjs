// ==========================================================
// CF-01 testbed — worlds (ground truth; never imported by agents)
// ==========================================================
// A world is an undirected connected graph over internal node ids 0..n-1, plus two hidden permutations:
//   labelOf[i]      the opaque label an agent observes for node i (a shuffle of 1..n)
//   exitOrder[i]    the neighbours of i in action-index order (a shuffle of the sorted neighbour list)
// so that neither node labels nor action indices carry topology (CD-003).
// generateWorld: random spanning tree over a shuffled node order, then random extra edges, all within maxDegree.
// mfwWorld: the MiniFlyWire graph (connections.json) with the same hidden relabelling, as a reference world.
// ==========================================================
import fs from 'node:fs';
import { makeStream, randInt, shuffled } from './rng.mjs';

export const edgeKey = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

function finish(id, n, edgeList, label) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edgeList) { adj[u].push(v); adj[v].push(u); }
  for (const a of adj) a.sort((x, y) => x - y);
  const rnd = makeStream(`${label}|perm`);
  const labels = shuffled(Array.from({ length: n }, (_, i) => i + 1), rnd);
  const exitOrder = adj.map((nb) => shuffled(nb, rnd));
  const nodeOfLabel = new Map(labels.map((l, i) => [l, i]));
  const edges = edgeList.map(([u, v]) => (u < v ? [u, v] : [v, u])).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const w = { id, n, edges, adj, labelOf: labels, exitOrder, nodeOfLabel };
  if (!isConnected(w)) throw new Error(`world ${id} is not connected`);
  return Object.freeze(w);
}

export function generateWorld(label, { nodes = 24, edges = 30, maxDegree = 4 } = {}) {
  if (edges < nodes - 1) throw new Error('a connected world needs at least nodes - 1 edges');
  const rnd = makeStream(`${label}|graph`);
  const order = shuffled(Array.from({ length: nodes }, (_, i) => i), rnd);
  const deg = new Array(nodes).fill(0);
  const set = new Set();
  const list = [];
  const add = (u, v) => { list.push([u, v]); set.add(edgeKey(u, v)); deg[u]++; deg[v]++; };
  for (let i = 1; i < nodes; i++) {
    const open = order.slice(0, i).filter((x) => deg[x] < maxDegree);
    if (!open.length) throw new Error('spanning tree cannot respect maxDegree');
    add(order[i], open[randInt(open.length, rnd)]);
  }
  let guard = 0;
  while (list.length < edges) {
    if (++guard > 100000) throw new Error('cannot place the requested number of edges');
    const u = randInt(nodes, rnd), v = randInt(nodes, rnd);
    if (u === v || set.has(edgeKey(u, v)) || deg[u] >= maxDegree || deg[v] >= maxDegree) continue;
    add(u, v);
  }
  return finish(label, nodes, list, label);
}

export function mfwWorld(connectionsPath, label = 'cf|ref|mfw-graph') {
  const conn = JSON.parse(fs.readFileSync(connectionsPath, 'utf8'));
  const ids = [...new Set(conn.flatMap((e) => [e.from, e.to]))].sort((a, b) => a - b);
  const idx = new Map(ids.map((x, i) => [x, i]));
  const seen = new Set();
  const list = [];
  for (const e of conn) { const u = idx.get(e.from), v = idx.get(e.to); if (u === v || seen.has(edgeKey(u, v))) continue; seen.add(edgeKey(u, v)); list.push([u, v]); }
  return finish(label, ids.length, list, label);
}

/** BFS hop distances to `target` over the world, skipping edges whose key is in `blocked`; -1 = unreachable. */
export function distancesTo(world, target, blocked = new Set()) {
  const d = new Array(world.n).fill(-1);
  d[target] = 0;
  let frontier = [target];
  while (frontier.length) {
    const next = [];
    for (const u of frontier) for (const v of world.adj[u]) if (d[v] < 0 && !blocked.has(edgeKey(u, v))) { d[v] = d[u] + 1; next.push(v); }
    frontier = next;
  }
  return d;
}

export function isConnected(world) { return distancesTo(world, 0).every((x) => x >= 0); }

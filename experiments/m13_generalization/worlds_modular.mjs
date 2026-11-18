// ==========================================================
// M13 — the held-out modular-ring family (ground truth; never imported by agents)
// ==========================================================
// A modular ring: MODULES modules of MODULE_SIZE nodes. Each module is a random spanning tree over its nodes plus
// random extra edges up to EDGES_PER_MODULE edges inside it. One bridge joins each module to the next, in a ring,
// between random nodes whose degree is below MAX_DEGREE. Every degree stays at or below MAX_DEGREE. Every stream is
// seeded by the label (`${label}|graph`), so the graph is a pure function of the label.
//
// The parameters were fixed in experiments/m13_generalization/PROPOSAL.md, from structure only, before any agent was
// run on this family: the same node count (24) and maximum degree (4) as the development family (generateWorld's
// defaults), so that neither size nor the number of exits per node differs.
//
// buildWorld is an exact copy of the testbed's private finish() in cognitive/testbed/worlds.mjs: the same hidden
// relabelling of nodes and exits, from the same stream (`${label}|perm`). It is copied rather than exported so that no
// testbed file changes. cognitive/tests/test_m13_generalization.mjs proves it gives worlds identical to generateWorld
// and mfwWorld for the same edges.
// ==========================================================
import { makeStream, randInt, shuffled } from '../../cognitive/testbed/rng.mjs';
import { edgeKey, isConnected } from '../../cognitive/testbed/worlds.mjs';

export const MODULAR = Object.freeze({ modules: 4, moduleSize: 6, edgesPerModule: 8, maxDegree: 4 });
export const BANK_LABEL = (i) => `m13|modular|${i}`;

/** The edge list (in generation order) of the modular ring for one label. */
export function modularEdges(label, P = MODULAR) {
  const rnd = makeStream(`${label}|graph`);
  const K = P.modules, S = P.moduleSize, D = P.maxDegree, n = K * S;
  const list = [], set = new Set(), deg = new Array(n).fill(0);
  const add = (u, v) => { list.push([u, v]); set.add(edgeKey(u, v)); deg[u]++; deg[v]++; };
  for (let k = 0; k < K; k++) {
    const nodes = shuffled(Array.from({ length: S }, (_, i) => k * S + i), rnd);
    for (let i = 1; i < S; i++) {
      const open = nodes.slice(0, i).filter((x) => deg[x] < D);
      if (!open.length) throw new Error(`${label}: module ${k} tree cannot respect the maximum degree`);
      add(nodes[i], open[randInt(open.length, rnd)]);
    }
    let inModule = S - 1, guard = 0;
    while (inModule < P.edgesPerModule && ++guard < 10000) {
      const u = nodes[randInt(S, rnd)], v = nodes[randInt(S, rnd)];
      if (u === v || set.has(edgeKey(u, v)) || deg[u] >= D || deg[v] >= D) continue;
      add(u, v); inModule++;
    }
    if (inModule < P.edgesPerModule) throw new Error(`${label}: module ${k} cannot place ${P.edgesPerModule} edges`);
  }
  for (let k = 0; k < K; k++) {
    const a = Array.from({ length: S }, (_, i) => k * S + i).filter((x) => deg[x] < D);
    const b = Array.from({ length: S }, (_, i) => ((k + 1) % K) * S + i).filter((x) => deg[x] < D);
    if (!a.length || !b.length) throw new Error(`${label}: no free node for the bridge after module ${k}`);
    add(a[randInt(a.length, rnd)], b[randInt(b.length, rnd)]);
  }
  return { n, edges: list };
}

/** Exact copy of worlds.mjs finish(label, n, edgeList, label): the world object with its hidden relabelling. */
export function buildWorld(label, n, edgeList) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edgeList) { adj[u].push(v); adj[v].push(u); }
  for (const a of adj) a.sort((x, y) => x - y);
  const rnd = makeStream(`${label}|perm`);
  const labels = shuffled(Array.from({ length: n }, (_, i) => i + 1), rnd);
  const exitOrder = adj.map((nb) => shuffled(nb, rnd));
  const nodeOfLabel = new Map(labels.map((l, i) => [l, i]));
  const edges = edgeList.map(([u, v]) => (u < v ? [u, v] : [v, u])).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const w = { id: label, n, edges, adj, labelOf: labels, exitOrder, nodeOfLabel };
  if (!isConnected(w)) throw new Error(`world ${label} is not connected`);
  return Object.freeze(w);
}

export const modularWorld = (label) => { const { n, edges } = modularEdges(label); return buildWorld(label, n, edges); };

/** The graph bank: every label's edge list, canonical (each edge [min, max], sorted), with the generator's parameters. */
export function makeBank(count) {
  const graphs = Array.from({ length: count }, (_, i) => {
    const label = BANK_LABEL(i), { n, edges } = modularEdges(label);
    return { label, n, edges: edges.map(([u, v]) => (u < v ? [u, v] : [v, u])).sort((a, b) => a[0] - b[0] || a[1] - b[1]) };
  });
  return { family: 'modular ring', generator: { ...MODULAR }, count, graphs };
}

/** Checks that a bank is exactly what the generator gives for its labels. Throws on any difference. */
export function checkBank(bank) {
  const fresh = makeBank(bank.count);
  if (JSON.stringify(fresh) !== JSON.stringify(bank)) throw new Error('the graph bank differs from the generator');
  return true;
}

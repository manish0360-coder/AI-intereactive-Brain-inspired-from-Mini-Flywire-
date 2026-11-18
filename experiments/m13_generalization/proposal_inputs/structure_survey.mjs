// M13 proposal input: STRUCTURE ONLY. No agent is built or run; no environment is stepped.
// For the development generator (generateWorld defaults, the dev labels already used in development), the app graph,
// and two candidate held-out families (prototype generators, scratch only), it computes per label the graph
// descriptors and E5's schedule descriptors from planE5 (which reads the true graph only):
//   n, m, cyclomatic number, diameter, clustering, bridges share, S-G distance, number of shortest S-G routes,
//   detour excess of each scheduled block (shortest S-G distance with the block minus without), skipped events.
// Labels: cf|dev|world|i (dev, structure only) and m13survey|<family>|i (scratch, never to be used as M13 labels).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.argv[2];
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { generateWorld, mfwWorld, distancesTo, edgeKey } = await imp('cognitive/testbed/worlds.mjs');
const { planE5 } = await imp('cognitive/testbed/task_e5.mjs');
const { makeStream, randInt, shuffled } = await imp('cognitive/testbed/rng.mjs');

const plain = (n, list) => { const adj = Array.from({ length: n }, () => []); for (const [u, v] of list) { adj[u].push(v); adj[v].push(u); } adj.forEach((a) => a.sort((x, y) => x - y)); return { n, edges: list.map(([u, v]) => (u < v ? [u, v] : [v, u])), adj }; };
const connected = (w) => distancesTo(w, 0).every((x) => x >= 0);

// candidate A: ring of 4 modules x 6 nodes; each module a random tree plus extra edges to 8 edges; one bridge between
// consecutive modules (a ring); degree <= 4
function modular(label) {
  const rnd = makeStream(`${label}|graph`), K = 4, S = 6, list = [], set = new Set(), deg = new Array(K * S).fill(0);
  const add = (u, v) => { list.push([u, v]); set.add(edgeKey(u, v)); deg[u]++; deg[v]++; };
  for (let k = 0; k < K; k++) {
    const nodes = shuffled(Array.from({ length: S }, (_, i) => k * S + i), rnd);
    for (let i = 1; i < S; i++) { const open = nodes.slice(0, i).filter((x) => deg[x] < 4); add(nodes[i], open[randInt(open.length, rnd)]); }
    let inMod = S - 1, guard = 0;
    while (inMod < 8 && ++guard < 10000) { const u = nodes[randInt(S, rnd)], v = nodes[randInt(S, rnd)]; if (u === v || set.has(edgeKey(u, v)) || deg[u] >= 4 || deg[v] >= 4) continue; add(u, v); inMod++; }
  }
  for (let k = 0; k < K; k++) {
    const a = Array.from({ length: S }, (_, i) => k * S + i).filter((x) => deg[x] < 4), b = Array.from({ length: S }, (_, i) => ((k + 1) % K) * S + i).filter((x) => deg[x] < 4);
    add(a[randInt(a.length, rnd)], b[randInt(b.length, rnd)]);
  }
  return plain(K * S, list);
}
// candidate B: 4 x 6 grid with 6 random edges removed, keeping it connected
function lattice(label) {
  const rnd = makeStream(`${label}|graph`), R = 4, C = 6, id = (r, c) => r * C + c, all = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (c + 1 < C) all.push([id(r, c), id(r, c + 1)]); if (r + 1 < R) all.push([id(r, c), id(r + 1, c)]); }
  let list = [...all], removed = 0, guard = 0;
  while (removed < 6 && ++guard < 10000) { const i = randInt(list.length, rnd), cand = list.filter((_, j) => j !== i); if (connected(plain(R * C, cand))) { list = cand; removed++; } }
  return plain(R * C, list);
}

function describe(w, label) {
  const n = w.n, m = w.edges.length;
  let diam = 0; for (let s = 0; s < n; s++) diam = Math.max(diam, ...distancesTo(w, s));
  let cc = 0, ccN = 0; for (let u = 0; u < n; u++) { const nb = w.adj[u]; if (nb.length < 2) continue; let t = 0; for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) if (w.adj[nb[i]].includes(nb[j])) t++; cc += t / (nb.length * (nb.length - 1) / 2); ccN++; }
  let bridges = 0; for (const [u, v] of w.edges) { const k = edgeKey(u, v); if (distancesTo(w, u, new Set([k]))[v] < 0) bridges++; }
  const plan = planE5(w, label, 'OFTEN');
  const dG = distancesTo(w, plan.goal), dS = distancesTo(w, plan.start), d = dG[plan.start];
  // number of shortest S-G routes (dynamic programming over BFS layers from S)
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => dS[a] - dS[b]); const cnt = new Array(n).fill(0); cnt[plan.start] = 1;
  for (const u of order) for (const v of w.adj[u]) if (dS[v] === dS[u] + 1) cnt[v] += cnt[u];
  // detour excess of each scheduled event, given the permanent blocks before it (OFTEN, RARE schedules)
  const excess = [];
  let skipped = 0;
  for (const fam of ['RARE', 'OFTEN']) {
    const p = planE5(w, label, fam), perm = new Set();
    for (const e of p.events) {
      if (e.skipped) { skipped++; continue; }
      const before = distancesTo(w, p.goal, perm)[p.start], after = distancesTo(w, p.goal, new Set([...perm, edgeKey(...e.edge)]))[p.start];
      excess.push(after - before);
      if (!e.reverses) perm.add(edgeKey(...e.edge));
    }
  }
  return { n, m, cyclomatic: m - n + 1, diam, clustering: cc / ccN, bridgeShare: bridges / m, sg: d, routes: cnt[plan.goal], excess, skipped };
}
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function summarise(name, items) {
  const ex = items.flatMap((x) => x.excess);
  const f = (k) => `${mean(items.map((x) => x[k])).toFixed(2)} [${q(items.map((x) => x[k]), 0.05).toFixed?.(2) ?? q(items.map((x) => x[k]), 0.05)}, ${q(items.map((x) => x[k]), 0.95).toFixed?.(2) ?? ''}]`;
  console.log(`== ${name} (${items.length} labels)`);
  console.log(`   n ${f('n')}  m ${f('m')}  cyclomatic ${f('cyclomatic')}  diameter ${f('diam')}  clustering ${f('clustering')}  bridge share ${f('bridgeShare')}`);
  console.log(`   S-G distance ${f('sg')}  shortest S-G routes ${f('routes')} (share with 1 route ${(items.filter((x) => x.routes === 1).length / items.length).toFixed(2)})`);
  console.log(`   detour excess per scheduled block: mean ${mean(ex).toFixed(2)}, share 0: ${(ex.filter((x) => x === 0).length / ex.length).toFixed(2)}, share >= 4: ${(ex.filter((x) => x >= 4).length / ex.length).toFixed(2)}, 95th pct ${q(ex, 0.95)}; skipped events ${items.reduce((s, x) => s + x.skipped, 0)}`);
}
const N = 60;
summarise('DEV generateWorld defaults (cf|dev|world|i)', Array.from({ length: N }, (_, i) => { const l = `cf|dev|world|${i}`; return describe(generateWorld(l), l); }));
const app = mfwWorld(path.join(ROOT, 'connections.json'), 'm13survey|app|graph');
summarise('APP graph (fixed topology; layouts vary)', Array.from({ length: N }, (_, i) => describe(app, `m13survey|app|${i}`)));
summarise('CANDIDATE modular ring (4 x 6)', Array.from({ length: N }, (_, i) => { const l = `m13survey|modular|${i}`; return describe(modular(l), l); }));
summarise('CANDIDATE perturbed lattice (4 x 6 minus 6)', Array.from({ length: N }, (_, i) => { const l = `m13survey|lattice|${i}`; return describe(lattice(l), l); }));

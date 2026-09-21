// FS-OQ1 feasibility audit (F-1, F-2). STATIC ANALYSIS ONLY.
// No agent is booted, no trajectory is executed, no seed is created: the four DEVELOPMENT
// FIXTURES (896066:0, 896066:1, 896238:2, 896329:3) are regenerated deterministically from their
// already-registered config seeds, exactly as D2/M39/M40 did.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = 'E:/Projects/OpenSourceLab/repos/mini-flywire';
const U = pathToFileURL(ROOT).href;
const env = await import(U + '/experiments/m7/env.js');
const search = await import(U + '/render/search.js');
const TR = await import(U + '/render/traversalRecord.js');
const PLAN = await import(U + '/render/planning.js');

const FIX = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
const conns = JSON.parse(fs.readFileSync(ROOT + '/connections.json', 'utf8'));
const neurons = JSON.parse(fs.readFileSync(ROOT + '/neurons.json', 'utf8'));

// physical adjacency, in connections.json order (identical to render/connections.js:120,125)
const adj = new Map(neurons.map((n) => [n.id, []]));
for (const c of conns) { adj.get(c.from).push(c.to); adj.get(c.to).push(c.from); }
const neuronMap = new Map(neurons.map((n) => [n.id, { userData: { id: n.id, neighbors: adj.get(n.id) } }]));
search.setNeuronMap(neuronMap);

const edgeIdx = (u, v) => env.edgeIndexOf(u, v);
const bfs = (g) => { const d = new Map([[g, 0]]), q = [g]; while (q.length) { const x = q.shift(); for (const y of adj.get(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } return d; };

// ---- admission check: canReachGoal(k, goal, maxDepth = 4) prunes iff d(k,goal) > 4 ----
let maxD = 0;
for (const g of env.GOALS) { const d = bfs(g); for (const v of adj.keys()) maxD = Math.max(maxD, d.get(v) ?? Infinity); }
console.log(`ADMISSION: max hop distance to any goal = ${maxD}; canReachGoal(maxDepth=4) prunes ${maxD > 4 ? 'SOME' : 'NOTHING'}`);

// ---- idealised evidence: make c_hat = (a+1)/(s+1) approximate 1/p on every directed edge ----
const S_BASE = 999;
function seedIdealEvidence(p) {
  TR.clear();
  for (const c of conns) {
    for (const [u, v] of [[c.from, c.to], [c.to, c.from]]) {
      const i = edgeIdx(u, v);
      const target = 1 / p[i];                       // expected attempts, the oracle per-edge cost
      const s = S_BASE, a = Math.round(target * (s + 1) - 1);
      // replay counts directly through the public writer (adjacency-validated, post-outcome shape)
      for (let k = 0; k < a; k++) TR.recordOutcome(u, v, k < s);
    }
  }
}
const kendall = (xs, ys) => {                        // tau-b over small candidate sets
  let c = 0, d = 0, tx = 0, ty = 0;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    const a = Math.sign(xs[i] - xs[j]), b = Math.sign(ys[i] - ys[j]);
    if (a === 0 && b === 0) { tx++; ty++; } else if (a === 0) tx++; else if (b === 0) ty++;
    else if (a === b) c++; else d++;
  }
  const n0 = c + d + tx + ty === 0 ? 1 : Math.sqrt((c + d + tx) * (c + d + ty)) || 1;
  return (c - d) / n0;
};

const summary = [];
for (const [seed, idx] of FIX) {
  const cfg = env.makeConfig(seed, idx);
  const goal = cfg.goal;
  const p = cfg.pPhase1;
  const r5 = env.r5DecisionStateDiff(p, goal);
  const { C } = env.reliabilityOptimalPolicy(p, goal);
  const d = bfs(goal);
  const states = env.decisionStates(goal);

  // ---- F-2: FS rankings at every decision state, FULL (idealised evidence) vs GEO (no evidence) ----
  seedIdealEvidence(p);
  const full = new Map(states.map((u) => [u, adj.get(u).map((v) => PLAN.futureScore(neuronMap.get(u === v ? u : v), goal))]));
  TR.clear();
  const geo = new Map(states.map((u) => [u, adj.get(u).map((v) => PLAN.futureScore(neuronMap.get(v), goal))]));
  seedIdealEvidence(p);
  const fullFixed = new Map(states.map((u) => [u, adj.get(u).map((v) => PLAN.futureScore(neuronMap.get(v), goal))]));

  let rankChanged = 0, tauFull = [], tauGeo = [], distinctFull = 0, distinctGeo = 0;
  for (const u of states) {
    const cands = adj.get(u);
    const oracle = cands.map((v) => -(1 / p[edgeIdx(u, v)] + C.get(v)));   // higher = better
    const F = fullFixed.get(u), G = geo.get(u);
    if (new Set(F.map((x) => x.toFixed(9))).size > 1) distinctFull++;
    if (new Set(G.map((x) => x.toFixed(9))).size > 1) distinctGeo++;
    const argmax = (arr) => arr.indexOf(Math.max(...arr));
    if (argmax(F) !== argmax(G)) rankChanged++;
    tauFull.push(kendall(F, oracle));
    tauGeo.push(kendall(G, oracle));
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const row = {
    fixture: `${seed}:${idx}`, goal, accepted: cfg.accepted,
    r5Differing: r5.count, r5States: r5.nDecisionStates,
    r5Nodes: r5.differing,
    statesWithDistinctFS_full: `${distinctFull}/${states.length}`,
    statesWithDistinctFS_geo: `${distinctGeo}/${states.length}`,
    topChoiceChanged: `${rankChanged}/${states.length}`,
    tauFull: mean(tauFull).toFixed(4), tauGeo: mean(tauGeo).toFixed(4),
    delta: (mean(tauFull) - mean(tauGeo)).toFixed(4),
  };
  summary.push(row);
  console.log(JSON.stringify(row));
}
console.log('\nseeds evaluated by env (audit census):', env.evaluatedSeeds().join(', '));
const m = (k) => (summary.reduce((a, r) => a + Number(r[k]), 0) / summary.length).toFixed(4);
console.log(`MEAN tauFull ${m('tauFull')}  tauGeo ${m('tauGeo')}  delta ${m('delta')}`);

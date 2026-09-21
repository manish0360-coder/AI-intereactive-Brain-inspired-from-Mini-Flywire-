// Study-2 VALIDATION driver. Definition validation only — no Study-2 run, no scientific seed, no Delta
// on any study data. Uses only the registered DEVELOPMENT fixtures for the oracle check.
//   TB  project-owned tau-b vs SciPy kendalltau(variant='b')  (reference_check.py)
//   TC  the §P conventions exactly as written (undefined => 0, m < 2 excluded, 1e-9 numeric ties)
//   BS  exact bootstrap by count vectors == brute-force enumeration; Study-1 interval reproduced
//   OR  production oracle env.expectedCostToGoal vs an independent JS Bellman-Ford and NetworkX Dijkstra
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tauB, primaryTau, deltaEvent, exactBootstrapMedianCI, bruteBootstrapMedianCI, TIE_EPS } from '../taub.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const env = await import(pathToFileURL(ROOT).href + '/experiments/m7/env.js');
const enc = (v) => (v === -Infinity ? '-Infinity' : v);
const NI = -Infinity;

// ---- tau-b cases: every category required by the milestone ---------------------------------------
const TAUB = [
  ['ordinary-identical', [1, 2, 3, 4], [1, 2, 3, 4]],
  ['ordinary-reversed', [1, 2, 3, 4], [4, 3, 2, 1]],
  ['ordinary-mixed', [1, 2, 3, 4, 5], [3, 1, 4, 5, 2]],
  ['ties-in-x', [1, 1, 2, 3], [1, 2, 3, 4]],
  ['ties-in-y', [1, 2, 3, 4], [2, 2, 1, 3]],
  ['both-tied-pairs', [1, 1, 2, 2], [5, 5, 1, 1]],
  ['all-tied-FULL', [7, 7, 7, 7], [1, 2, 3, 4]],
  ['all-tied-GEO-integers', [-2, -2, -2], [-3.1, -2.4, -5.0]],
  ['all-tied-oracle', [1, 2, 3], [4, 4, 4]],
  ['neg-infinity', [NI, 1, 2], [1, 2, 3]],
  ['mixed-finite-neg-infinity-ties', [NI, NI, 0, 1], [0, 1, 2, 3]],
  ['smallest-m2', [1, 2], [2, 1]],
  ['smallest-m2-tied', [1, 1], [1, 2]],
  ['realistic-geo-vs-oracle', [-1, -2, -2, -3, -1, -2, -3, -1], [-2.3, -3.1, -2.9, -4.2, -1.9, -3.3, -4.0, -2.6]],
  ['realistic-full-vs-oracle', [-1.5, -2.2, -2.9, -3.4, -1.1, -2.6, -4.1, -1.8], [-2.3, -3.1, -2.9, -4.2, -1.9, -3.3, -4.0, -2.6]],
];
const SINGLETON = ['excluded-m1', [3], [5]];

// ---- oracle cases: 4 dev fixtures x 2 phases x 4 goals -------------------------------------------
const conns = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const FIX = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
const oracleCases = [];
for (const [s, i] of FIX) {
  const cfg = env.makeConfig(s, i);
  for (const [phase, p] of [['I', cfg.pPhase1], ['II', cfg.pPhase2]])
    for (const goal of env.GOALS)
      oracleCases.push({ id: `${s}:${i}/${phase}/g${goal}`, fixture: `${s}:${i}`, phase, goal, p,
        edges: conns.map((c) => [c.from, c.to, 1 / p[env.edgeIndexOf(c.from, c.to)]]) });
}
const seedsTouched = env.evaluatedSeeds();

fs.writeFileSync(path.join(HERE, 'cases.json'), JSON.stringify({
  taub: [...TAUB, SINGLETON].map(([id, x, y]) => ({ id, x: x.map(enc), y: y.map(enc) })),
  oracle: oracleCases.map(({ id, goal, edges }) => ({ id, goal, edges })),
}));
const py = execFileSync('python', [path.join(HERE, 'reference_check.py')], { encoding: 'utf8' });
const REF = JSON.parse(fs.readFileSync(path.join(HERE, 'reference.json'), 'utf8'));

const results = { tieEps: TIE_EPS, reference: { scipy: REF.scipy, networkx: REF.networkx, python: REF.python }, seedsTouched };

// ---- TB: tau-b against SciPy -------------------------------------------------------------------------
results.TB = [...TAUB, SINGLETON].map(([id, x, y]) => {
  const ours = tauB(x, y), ref = REF.taub.find((r) => r.id === id);
  const agree = ref.nan ? (ours.status === 'undefined' || ours.status === 'excluded')
                        : (ours.status === 'ok' && Math.abs(ours.value - ref.tau) <= 1e-12);
  return { id, ours: ours.status === 'ok' ? ours.value : ours.status, scipy: ref.nan ? 'nan' : ref.tau, agree };
});

// ---- TC: §P conventions exactly as written ---------------------------------------------------------
const TC = [];
TC.push(['undefined => 0 (all-tied FULL)', primaryTau([7, 7, 7, 7], [1, 2, 3, 4]) === 0]);
TC.push(['undefined => 0 (all-tied GEO)', primaryTau([-2, -2, -2], [-3.1, -2.4, -5.0]) === 0]);
TC.push(['m < 2 => excluded (null), not 0', primaryTau([3], [5]) === null && deltaEvent([3], [3], [5]) === null]);
TC.push(['Delta keeps the geometry-tie event: FULL ordered, GEO all-tied', deltaEvent([-1, -2, -3], [-2, -2, -2], [-1, -2, -3]) === 1]);
TC.push(['numeric tie: values 1e-12 apart are tied', tauB([1, 1 + 1e-12, 2], [1, 2, 3]).n1 === 1]);
TC.push(['numeric tie: values 1e-6 apart are NOT tied', tauB([1, 1 + 1e-6, 2], [1, 2, 3]).n1 === 0]);
TC.push(['noisy vector with 1e-12 jitter == SciPy on the clean vector',
  Math.abs(tauB([1, 1 + 1e-12, 2, 3], [1, 2, 4, 3]).value - tauB([1, 1, 2, 3], [1, 2, 4, 3]).value) === 0]);
TC.push(['-Infinity pairs tie with each other', tauB([NI, NI, 0], [1, 2, 3]).n1 === 1]);
TC.push(['-Infinity sorts below finite values', tauB([NI, 0], [0, 1]).value === 1]);
let nanThrows = false; try { tauB([NaN, 1], [1, 2]); } catch { nanThrows = true; }
TC.push(['NaN is rejected, never scored', nanThrows]);
TC.push(['deterministic: repeated evaluation identical', JSON.stringify(tauB(TAUB[2][1], TAUB[2][2])) === JSON.stringify(tauB(TAUB[2][1], TAUB[2][2]))]);
results.TC = TC.map(([name, pass]) => ({ name, pass }));

// ---- BS: exact bootstrap equivalence ----------------------------------------------------------------
const BSDATA = [[0.4], [0.3, -0.1], [0.2, 0.2, -0.5], [0.1, -0.3, 0.3, 0.3], [0.5, -0.2, 0.0, 0.1, -0.4],
  [0.0698, -0.0177, 0.0599, -0.0212, -0.0192, 0.0594], [0.3, 0.3, 0.3, -0.1, 0.2, -0.4, 0.05]];
results.BS = BSDATA.map((vals) => {
  const a = exactBootstrapMedianCI(vals), b = bruteBootstrapMedianCI(vals);
  return { n: vals.length, countVector: [a.lower, a.upper], brute: [b.lower, b.upper], agree: a.lower === b.lower && a.upper === b.upper };
});
// regression: Study 1's committed evidence -> its published interval [-2.02pp, +6.48pp]
const S1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/fsbehav/evidence/RUNS.json'), 'utf8'));
const rate = (arm, seed) => S1.rows.find((r) => r.arm === arm && r.seed === seed).staleRate;
const s1diffs = S1.panel.map((s) => rate('A-V23', s) - rate('A-OLD', s));
const s1 = exactBootstrapMedianCI(s1diffs);
results.S1regression = { lowerPP: +(s1.lower * 100).toFixed(2), upperPP: +(s1.upper * 100).toFixed(2),
  reproduces: (s1.lower * 100).toFixed(2) === '-2.02' && (s1.upper * 100).toFixed(2) === '6.48' };
// feasibility of the count-vector form for larger run counts (timing only; synthetic values)
results.BSfeasibility = [8, 10, 12].map((n) => {
  const vals = Array.from({ length: n }, (_, i) => ((i * 37) % 11) / 10 - 0.5);
  const t0 = Date.now(); const r = exactBootstrapMedianCI(vals);
  return { n, N: r.N, seconds: (Date.now() - t0) / 1000 };
});

// ---- OR: oracle definition cross-check -----------------------------------------------------------
function bellmanFord(edges, goal) {                   // independent of env.js and of NetworkX
  const C = new Map(); for (const [u, v] of edges) { C.set(u, Infinity); C.set(v, Infinity); }
  C.set(goal, 0);
  for (let it = 0; it < C.size; it++) for (const [u, v, w] of edges) {
    if (C.get(v) + w < C.get(u)) C.set(u, C.get(v) + w);
    if (C.get(u) + w < C.get(v)) C.set(v, C.get(u) + w);
  }
  return C;
}
let orMax = 0, orMaxNX = 0, orNodes = 0, goalZero = true, bellmanOptimal = true;
for (const c of oracleCases) {
  const prod = env.expectedCostToGoal(c.p, c.goal);
  const ref = bellmanFord(c.edges, c.goal);
  const nx = REF.oracle.find((r) => r.id === c.id).cost;
  if (prod.get(c.goal) !== 0) goalZero = false;
  for (const [node, cost] of prod) {
    orNodes++;
    orMax = Math.max(orMax, Math.abs(cost - ref.get(node)));
    orMaxNX = Math.max(orMaxNX, Math.abs(cost - nx[String(node)]));
    if (node !== c.goal) {                            // candidate-onward scope: C(k) = min_w [1/p(k,w) + C(w)]
      let best = Infinity;
      for (const [u, v, w] of c.edges) { if (u === node) best = Math.min(best, w + prod.get(v)); if (v === node) best = Math.min(best, w + prod.get(u)); }
      if (Math.abs(best - cost) > 1e-9) bellmanOptimal = false;
    }
  }
}
results.OR = { cases: oracleCases.length, nodeValues: orNodes, maxAbsDiffVsBellmanFord: orMax, maxAbsDiffVsNetworkX: orMaxNX,
  goalCostZero: goalZero, candidateOnwardBellmanConsistent: bellmanOptimal };

fs.writeFileSync(path.join(HERE, 'RESULTS.json'), JSON.stringify(results, null, 2));
const n = (arr, k) => arr.filter((x) => x[k]).length;
console.log(py.trim());
console.log(`TB  tau-b vs SciPy: ${n(results.TB, 'agree')}/${results.TB.length} agree`);
console.log(`TC  §P conventions: ${n(results.TC, 'pass')}/${results.TC.length} pass`);
console.log(`BS  count-vector == brute force: ${n(results.BS, 'agree')}/${results.BS.length}; Study-1 interval reproduced: ${results.S1regression.reproduces} [${results.S1regression.lowerPP}, ${results.S1regression.upperPP}]pp`);
console.log(`BS  feasibility: ${results.BSfeasibility.map((f) => `n=${f.n} ${f.seconds}s`).join(', ')}`);
console.log(`OR  ${results.OR.cases} cases / ${results.OR.nodeValues} node values: max|diff| vs Bellman-Ford ${results.OR.maxAbsDiffVsBellmanFord.toExponential(2)}, vs NetworkX ${results.OR.maxAbsDiffVsNetworkX.toExponential(2)}; C(goal)=0 ${results.OR.goalCostZero}; candidate-onward Bellman-consistent ${results.OR.candidateOnwardBellmanConsistent}`);
console.log(`seeds touched: ${seedsTouched.join(', ')}`);

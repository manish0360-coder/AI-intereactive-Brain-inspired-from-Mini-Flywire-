// ==========================================================
// COG-A — independent mathematical tests of distal.mjs (zero sessions)
// ==========================================================
//   node experiments/coga/test_distal.mjs        exit 0 only if every check passes
// 1. continuation(): compared with EXHAUSTIVE enumeration of simple paths (an optimal policy for these shortest-path problems
//    never revisits a node, so the optimum over simple paths is the exact optimum) on the real 20-node graph with random
//    reliability vectors, for every goal, every removed node and both objectives.
// 2. hand-built graphs whose classification is known: DISTAL, LOCAL, INTERACTION, NO_SWITCH/STABLE, a cut vertex, a goal neighbour.
// 3. an attempts-vs-discounted disagreement case.
// 4. kappa monotonicity: the tolerances at which a state is DISTAL form an interval (fine grid).
// 5. the attempts-optimal action on G \ {s} equals env.js reliabilityOptimalPolicy() on real accepted configurations.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeGraph, continuation, geomFactor, edgeCost, classifyState, cases, classifyAt, best, OBJECTIVES } from './distal.mjs';
import { makeRng } from '../../instrumentation/rng.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };
const close = (a, b) => (a === b) || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)));

// ---- 1. exhaustive enumeration on the real graph ----
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')).map(e => ({ from: Number(e.from), to: Number(e.to) }));
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
const G = makeGraph(NODES, EDGES);
function brute(graph, p, goal, removed, objective, gamma) {
  const w = edgeCost(objective, gamma);
  const out = new Map(graph.nodes.map(n => [n, Infinity]));
  for (const start of graph.nodes) {
    if (start === removed) continue;
    if (start === goal) { out.set(start, 0); continue; }
    const seen = new Set([start]);
    (function dfs(u, acc) {
      for (const { v, e } of graph.adj.get(u)) {
        if (v === removed || seen.has(v)) continue;
        const a2 = acc + w(p[e]);
        if (v === goal) { if (a2 < out.get(start)) out.set(start, a2); continue; }
        seen.add(v); dfs(v, a2); seen.delete(v);
      }
    })(start, 0);
  }
  return out;
}
{
  const rnd = makeRng(20261029);
  let compared = 0, mismatches = 0;
  for (let trial = 0; trial < 3; trial++) {
    const p = EDGES.map(() => (rnd() < 0.35 ? 0.25 + 0.2 * rnd() : 0.9 + 0.1 * rnd()));
    for (const goal of [8, 12, 16, 19]) for (const removed of [null, ...NODES.filter(n => n !== goal)]) for (const o of OBJECTIVES) {
      const a = continuation(G, p, goal, removed, o, 0.95), b = brute(G, p, goal, removed, o, 0.95);
      for (const n of NODES) { if (n === removed) continue; compared++; if (!close(a.get(n), b.get(n))) mismatches++; }
    }
  }
  check('T1 continuation() equals exhaustive simple-path enumeration (real graph, 3 random p vectors, 4 goals, every removed node, both objectives)', mismatches === 0 && compared > 0, `${compared} values compared, ${mismatches} mismatches`);
}

// ---- 2. hand-built graphs: s=1, a=2, b=3, c=4 (reaches the goal only through s), goal=9; edges 0 s-a, 1 s-b, 2 a-goal, 3 b-goal, 4 s-c ----
const toy = makeGraph([1, 2, 3, 4, 9], [{ from: 1, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 9 }, { from: 3, to: 9 }, { from: 1, to: 4 }]);
const opts = { gamma: 0.95, kappa: 0.1 };
const cls = (p1, p2) => classifyState(toy, p1, p2, 9, 1, opts);
{ // DISTAL: the downstream edge a-goal collapses, the local edges are unchanged
  const r = cls([1, 1, 1, 0.5, 1], [1, 1, 0.3, 0.5, 1]);
  check('T2 downstream change only -> DISTAL, A1* = {a}, A2* = {b}', r.cls === 'DISTAL' && r.A1star.join() === '2' && r.A2star.join() === '3', `cls ${r.cls}, A1* ${r.A1star}, A2* ${r.A2star}`);
}
{ // LOCAL: the local edge s-a collapses, the continuation is unchanged
  const r = cls([1, 0.5, 1, 1, 1], [0.3, 0.5, 1, 1, 1]);
  check('T3 local change only -> LOCAL', r.cls === 'LOCAL', `cls ${r.cls}`);
}
{ // INTERACTION.  attempts: via b always 1 + 2 = 3; via a: phase I 1 + 1 = 2, local only 1/0.6 + 1 = 2.67, continuation only
  // 1 + 1/0.6 = 2.67 (a still best, b outside the 10% band), both 1/0.6 + 1/0.6 = 3.33 (b best, a outside the band)
  const r = cls([1, 1, 1, 0.5, 1], [0.6, 1, 0.6, 0.5, 1]);
  check('T4 neither change alone flips the choice, together they do -> INTERACTION (both objectives), not DISTAL', r.perObjective.attempts.cls === 'INTERACTION' && r.perObjective.discounted.cls === 'INTERACTION' && !r.distal,
    `attempts ${r.perObjective.attempts.cls}, discounted ${r.perObjective.discounted.cls}, overall ${r.cls}`);
}
{ // no switch: the best action stays a
  const r = cls([1, 0.5, 1, 0.5, 1], [1, 0.5, 0.9, 0.5, 1]);
  check('T5 the best action does not change -> STABLE (not DISTAL)', r.cls === 'STABLE' && !r.distal, `cls ${r.cls}`);
}
{ // cut vertex: c (node 4) reaches the goal only through s, so it is never an action at s
  const c = cases(toy, 1, [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], 9, 'attempts', 0.95);
  check('T6 a neighbour whose only route to the goal is back through s is excluded at s', !c.Q11.some(x => x.a === 4) && c.Q11.length === 2);
}
{ // the goal as a neighbour: its continuation is 0
  const g2 = makeGraph([1, 2, 9], [{ from: 1, to: 9 }, { from: 1, to: 2 }, { from: 2, to: 9 }]);
  const a = cases(g2, 1, [0.5, 1, 1], [0.5, 1, 1], 9, 'attempts', 0.95).Q11.find(x => x.a === 9);
  check('T7 the goal as a neighbour (attempts): cost = 1/p of the direct edge', a && close(a.value, 2));
  const d = cases(g2, 1, [0.5, 1, 1], [0.5, 1, 1], 9, 'discounted', 0.95).Q11.find(x => x.a === 9);
  check('T8 the goal as a neighbour (discounted): cost = log g(p) / log gamma; a certain edge costs exactly 1 step', d && close(d.value, Math.log(geomFactor(0.5, 0.95)) / Math.log(0.95)) && close(edgeCost('discounted', 0.95)(1), 1));
}

// ---- 3. objective disagreement: one edge p = 0.32 to the goal vs three certain edges ----
{
  const g3 = makeGraph([1, 2, 3, 4, 9], [{ from: 1, to: 9 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 9 }, { from: 1, to: 4 }, { from: 4, to: 9 }]);
  const p = [0.32, 1, 1, 1, 0.01, 0.01];
  const ca = cases(g3, 1, p, p, 9, 'attempts', 0.95), cd = cases(g3, 1, p, p, 9, 'discounted', 0.95);
  check('T9 attempts prefers the certain 3-edge route (3 < 3.125); discounted(0.95) prefers the direct edge (2.968 < 3 certainty-equivalent steps)', best(ca.Q11) === 2 && best(cd.Q11) === 9,
    `attempts best ${best(ca.Q11)}, discounted best ${best(cd.Q11)}`);
}

// ---- 4. kappa monotonicity on random swap worlds ----
{
  const rnd = makeRng(7);
  let pairs = 0, broken = 0;
  for (let t = 0; t < 40; t++) {
    const un = new Set(); while (un.size < 13) un.add(Math.floor(rnd() * EDGES.length));
    const lo = EDGES.map(() => 0.25 + 0.2 * rnd()), hi = EDGES.map(() => 0.9 + 0.1 * rnd());
    const p1 = EDGES.map((_, i) => (un.has(i) ? lo[i] : hi[i])), p2 = EDGES.map((_, i) => (un.has(i) ? hi[i] : lo[i]));
    const goal = [8, 12, 16, 19][t % 4];
    for (const s of NODES) {
      if (s === goal) continue;
      for (const o of OBJECTIVES) {
        const c = cases(G, s, p1, p2, goal, o, 0.95);
        const grid = Array.from({ length: 81 }, (_, i) => i * 0.005).map(k => classifyAt(c, k).cls === 'DISTAL');
        const first = grid.indexOf(true), last = grid.lastIndexOf(true);
        pairs++; if (first >= 0 && grid.slice(first, last + 1).some(x => !x)) broken++;
      }
    }
  }
  check('T10 for every state and objective the tolerances at which it is DISTAL form an interval (grid 0..0.4, step 0.005)', broken === 0 && pairs > 0, `${pairs} state-objective pairs, ${broken} non-intervals`);
}

// ---- 5. agreement with env.js reliabilityOptimalPolicy on real accepted configurations ----
{
  const env = await import('../m7/env.js');
  const stream = env.generateAcceptedStream(200000, 8);
  let compared = 0, disagree = 0, ties = 0;
  for (const w of stream) for (const ph of [w.cfg.pPhase1, w.cfg.pPhase2]) {
    const ref = env.reliabilityOptimalPolicy(ph, w.goal).policy;
    for (const s of NODES) {
      if (s === w.goal) continue;
      const b = best(cases(G, s, ph, ph, w.goal, 'attempts', 0.95).Q11);
      if (b === null) { ties++; continue; }
      compared++; if (b !== ref.get(s)) disagree++;
    }
  }
  check('T11 the attempts-optimal action on G\\{s} equals env.js reliabilityOptimalPolicy for every state, both phases, worlds 0-7', disagree === 0 && compared > 0, `${compared} compared, ${disagree} disagree, ${ties} exact ties`);
}

const failed = results.filter(r => !r.ok).length;
console.log(`\nCOG-A distal tests: ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

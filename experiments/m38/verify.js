// ==========================================================
// M38 GATE — minimal scalable DEVELOPMENT substrate
// ==========================================================
// PASS 1  A  R1'  == frozen M7 R1   (env.evaluateConstraints on the 20-node graph)
//         B  R2'  == frozen M7 R2   (same)
//         C  Dijkstra oracle == frozen env.expectedCostToGoal (and env AV3)
//         D  Bellman-Ford AV3' == Dijkstra
//         F  the 100-node substrate has every M38-P0 property
//         E  deliberate mutations of substrate.js are caught
//         G-J integrity: frozen, seed, configuration and production boundaries
// PASS 2  P  independent checks that share no code with substrate.js, a fresh-process
//            determinism check, and bounded tractability measurements around N = 100.
//
// NO SEED IS CONSUMED. makeConfig is never called. Reliability vectors are synthetic,
// from a local LCG, and exist only to exercise the predicates. This is not an experiment.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUBSTRATE_PATH = path.join(ROOT, 'experiments/m38/substrate.js');
const JSON_MODE = process.argv.includes('--json');
const DIGEST_MODE = process.argv.includes('--digest');
const log = (...a) => { if (!JSON_MODE && !DIGEST_MODE) console.log(...a); };
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const BASE = '6b67c55';                        // M38-P0, the accepted design commit

const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
function lcg(seed) {
  let x = BigInt(seed);
  return () => { x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n); return Number(x >> 11n) / 2 ** 53; };
}
const randomP = (m, r) => Array.from({ length: m }, () => 0.25 + 0.75 * r());   // (0.25, 1)

// ---- a digest of the substrate, for the fresh-process determinism check --------------
async function digest(S) {
  const g = S.SUBSTRATE, r = lcg(4040), p = randomP(g.edges.length, r);
  const body = JSON.stringify({
    nodes: g.nodes, edges: g.edges, adj: [...g.adj], goals: S.GOALS,
    r1: S.GOALS.map(x => S.r1PrimeStarts(g, x)),
    r2: S.GOALS.map(x => [...S.r2PrimePerStart(g, x, p)]),
    c: S.GOALS.map(x => [...S.expectedCostToGoal(g, p, x)]),
  });
  return crypto.createHash('sha256').update(body).digest('hex');
}
if (DIGEST_MODE) {
  const S = await import(pathToFileURL(SUBSTRATE_PATH).href);
  process.stdout.write(await digest(S));
  process.exit(0);
}

const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
const typed = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);
const S0 = await import(pathToFileURL(SUBSTRATE_PATH).href);

// ==========================================================
// REFERENCES — independent of substrate.js
// ==========================================================
function makeRef(nodes, edges) {
  const adj = new Map(nodes.map(n => [n, []])), edgeOf = new Map();
  for (const e of edges) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); edgeOf.set(KEY(e.from, e.to), e.i); }
  return { nodes, edges, adj, edgeOf };
}
// env.js simplePaths DFS, verbatim in behaviour
function allSimplePaths(G, goal) {
  const byStart = new Map();
  for (const s of G.nodes) {
    if (s === goal) continue;
    const out = [], seen = new Set(), cur = [];
    (function dfs(x) {
      if (x === goal) { out.push([...cur]); return; }
      seen.add(x);
      for (const y of G.adj.get(x)) { if (seen.has(y)) continue; cur.push(G.edgeOf.get(KEY(x, y))); dfs(y); cur.pop(); }
      seen.delete(x);
    })(s);
    byStart.set(s, out);
  }
  return byStart;
}
function exhaustiveR2(paths, p) {
  const R = (route) => route.reduce((a, i) => a * p[i], 1);
  const out = new Map();
  for (const [s, ps] of paths) {
    if (!ps.length) { out.set(s, false); continue; }
    const minHops = Math.min(...ps.map(r => r.length));
    const bestShort = Math.max(...ps.filter(r => r.length === minHops).map(R));
    const bestLong = ps.filter(r => r.length > minHops).reduce((m, r) => Math.max(m, R(r)), -1);
    out.set(s, bestLong > bestShort);
  }
  return out;
}
function exhaustiveCost(paths, p, goal) {
  const out = new Map([[goal, 0]]);
  for (const [s, ps] of paths) {
    let best = Infinity;
    for (const route of ps) { let c = 0; for (const i of route) c += 1 / p[i]; if (c < best) best = c; }
    out.set(s, best);
  }
  return out;
}
const bfs = (G, src, skip = null) => {
  const d = new Map([[src, 0]]), q = [src];
  while (q.length) { const x = q.shift(); for (const y of G.adj.get(x)) if (y !== skip && !d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } }
  return d;
};
// synthetic graphs: spanning tree + extras (bridges, trees), optionally a detached triangle
function syntheticGraph(n, extra, seed, detached = false) {
  const r = lcg(seed), nodes = Array.from({ length: n }, (_, i) => i + 1), seen = new Set(), edges = [];
  const add = (a, b) => { if (a !== b && !seen.has(KEY(a, b))) { seen.add(KEY(a, b)); edges.push({ i: edges.length, from: a, to: b }); } };
  for (let i = 1; i < n; i++) add(nodes[i], nodes[Math.floor(r() * i)]);
  for (let k = 0; k < extra; k++) add(1 + Math.floor(r() * n), 1 + Math.floor(r() * n));
  if (detached) { nodes.push(n + 1, n + 2, n + 3); add(n + 1, n + 2); add(n + 2, n + 3); add(n + 3, n + 1); }
  return { nodes, edges };
}
const SYNTH = [];
for (let seed = 1; seed <= 48; seed++) SYNTH.push(syntheticGraph(6 + (seed % 8), seed % 5, 7100 + seed, seed % 4 === 0));

const BASE_NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
const BASE_EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))
  .map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));
const embedding = (r) => new Map(BASE_NODES.map(x => [x, Array.from({ length: env.EMBED_DIM }, () => r() * 2 - 1)]));

// ==========================================================
// THE SUITE — run on the real module and on every mutant
// ==========================================================
async function runSuite(S, record = null) {
  const rows = [];
  const ok = (id, cond, msg) => { rows.push({ id, ok: !!cond, msg }); return cond; };
  const G20 = S.BASE, G = S.SUBSTRATE;

  // ---- A: R1' == frozen R1 --------------------------------------------------------------
  {
    const r = lcg(111);
    let envPairs = 0, envDis = 0, synthPairs = 0, synthDis = 0, qual = 0, nonQual = 0, unreach = 0;
    for (const g of BASE_NODES) {
      const chk = env.evaluateConstraints({ goal: g, pPhase1: randomP(39, r), embedding: embedding(r) });
      const starts = S.r1PrimeStarts(G20, g);
      envPairs++;
      if (chk.startsWith2 !== starts.length || chk.R1 !== (starts.length >= 6)) envDis++;
    }
    for (const sg of SYNTH) {
      const H = makeRef(sg.nodes, sg.edges), Hs = S.makeGraph(sg.nodes, sg.edges);
      for (const g of sg.nodes) {
        const paths = allSimplePaths(H, g), got = new Set(S.r1PrimeStarts(Hs, g));
        for (const [s, ps] of paths) {
          synthPairs++;
          if ((ps.length >= 2) !== got.has(s)) synthDis++;
          ps.length >= 2 ? qual++ : nonQual++;
          if (ps.length === 0) unreach++;
        }
        if (got.has(g)) synthDis++;                                 // goal exclusion
      }
    }
    ok('A1', envDis === 0, `R1' start count and R1 verdict equal frozen env.evaluateConstraints for all ${envPairs} goals of the 20-node graph`);
    ok('A2', synthDis === 0 && qual > 0 && nonQual > 0 && unreach > 0,
      `per-start R1' equals exhaustive enumeration on ${synthPairs} synthetic (start, goal) pairs — ${qual} qualify, ${nonQual} do not, ${unreach} unreachable; the goal is never a start`);
    if (record) record.A = { envPairs, synthPairs, qual, nonQual, unreach };
  }

  // ---- B: R2' == frozen R2 --------------------------------------------------------------
  {
    const r = lcg(222);
    let draws = 0, envDis = 0, t = 0, f = 0;
    for (const g of BASE_NODES) for (let k = 0; k < 6; k++) {
      const p = randomP(39, r);
      const chk = env.evaluateConstraints({ goal: g, pPhase1: p, embedding: embedding(r) });
      const n = S.r2PrimeStarts(G20, g, p);
      draws++; if (chk.r2Starts !== n || chk.R2 !== (n >= 1)) envDis++;
      t += n; f += 19 - n;
    }
    const ones = Array(39).fill(1);
    let tieDis = 0;
    for (const g of env.GOALS) {
      const chk = env.evaluateConstraints({ goal: g, pPhase1: ones, embedding: embedding(r) });
      if (chk.r2Starts !== S.r2PrimeStarts(G20, g, ones)) tieDis++;
    }
    let synthPairs = 0, synthDis = 0, unreach = 0;
    const r2 = lcg(223);
    for (const sg of SYNTH) {
      const H = makeRef(sg.nodes, sg.edges), Hs = S.makeGraph(sg.nodes, sg.edges);
      const p = randomP(sg.edges.length, r2);
      for (const g of sg.nodes.slice(0, 4)) {
        const paths = allSimplePaths(H, g), ex = exhaustiveR2(paths, p), got = S.r2PrimePerStart(Hs, g, p);
        if (got.has(g)) synthDis++;
        for (const [s, v] of ex) { synthPairs++; if (v !== got.get(s)) synthDis++; if (!paths.get(s).length) unreach++; }
      }
    }
    ok('B1', envDis === 0 && t > 0 && f > 0,
      `R2' start count and R2 verdict equal frozen env.evaluateConstraints on ${draws} draws (all 20 goals x 6); ${t} starts satisfy R2, ${f} do not`);
    ok('B2', tieDis === 0, 'on an exact tie (every p = 1) R2\' equals the frozen strict comparison for all 4 M7 goals');
    ok('B3', synthDis === 0 && unreach > 0,
      `per-start R2' equals exhaustive enumeration on ${synthPairs} synthetic pairs, ${unreach} of them unreachable (false)`);
    if (record) record.B = { draws, t, f, synthPairs, unreach };
  }

  // ---- C: Dijkstra == frozen oracle ------------------------------------------------------
  {
    const r = lcg(333);
    let values = 0, exactDis = 0, maxAV3 = 0, synthDis = 0, infSeen = 0;
    for (const g of BASE_NODES) for (let k = 0; k < 4; k++) {
      const p = randomP(39, r);
      const mine = S.expectedCostToGoal(G20, p, g), frozen = env.expectedCostToGoal(p, g), av3 = env.exhaustiveMinCost(p, g);
      for (const s of BASE_NODES) {
        values++;
        if (mine.get(s) !== frozen.get(s)) exactDis++;
        maxAV3 = Math.max(maxAV3, Math.abs(mine.get(s) - av3.get(s)));
      }
    }
    const r2 = lcg(334);
    for (const sg of SYNTH) {
      const H = makeRef(sg.nodes, sg.edges), p = randomP(sg.edges.length, r2), g = sg.nodes[0];
      const ex = exhaustiveCost(allSimplePaths(H, g), p, g), mine = S.expectedCostToGoal(S.makeGraph(sg.nodes, sg.edges), p, g);
      for (const s of sg.nodes) {
        const a = ex.get(s), b = mine.get(s);
        if (a === Infinity || b === Infinity) { if (a !== b) synthDis++; else infSeen++; }
        else if (Math.abs(a - b) > 1e-9) synthDis++;
      }
    }
    ok('C1', exactDis === 0, `the oracle is bit-identical to frozen env.expectedCostToGoal on ${values} (goal, draw, node) values`);
    ok('C2', maxAV3 < 1e-9 && synthDis === 0 && infSeen > 0,
      `it equals the frozen AV3 exhaustive minimum (max |diff| ${maxAV3.toExponential(2)}) and exhaustive Σ1/p on synthetic graphs, keeping ${infSeen} unreachable nodes at Infinity`);
    if (record) record.C = { values, maxAV3 };
  }

  // ---- D: Bellman-Ford == Dijkstra -------------------------------------------------------
  {
    const r = lcg(444);
    let values = 0, maxDiff = 0, infDis = 0;
    for (const [Gx, gs] of [[G20, BASE_NODES], [G, S.GOALS]]) for (const g of gs) for (let k = 0; k < 3; k++) {
      const p = randomP(Gx.edges.length, r);
      const dj = S.expectedCostToGoal(Gx, p, g), bf = S.bellmanFordCost(Gx, p, g);
      for (const s of Gx.nodes) { values++; maxDiff = Math.max(maxDiff, Math.abs(dj.get(s) - bf.get(s))); }
    }
    for (const sg of SYNTH.filter((_, i) => (i + 1) % 4 === 0)) {
      const Hs = S.makeGraph(sg.nodes, sg.edges), p = randomP(sg.edges.length, r), g = sg.nodes[0];
      const dj = S.expectedCostToGoal(Hs, p, g), bf = S.bellmanFordCost(Hs, p, g);
      for (const s of sg.nodes) if ((dj.get(s) === Infinity) !== (bf.get(s) === Infinity)) infDis++;
    }
    ok('D1', maxDiff < 1e-9 && infDis === 0,
      `Bellman-Ford equals Dijkstra on ${values} values across the 20- and 100-node graphs (max |diff| ${maxDiff.toExponential(2)}); unreachable agrees`);
    if (record) record.D = { values, maxDiff };
  }

  // ---- F: the 100-node substrate matches M38-P0 --------------------------------------------
  {
    const ids = [...G.nodes].sort((a, b) => a - b);
    ok('F1', G.nodes.length === 100 && ids.every((x, i) => x === i + 1) && G.edges.length === 215,
      '100 nodes with ids 1..100, and 215 = 5 x 39 + 2 x C(5,2) edges');
    const keys = new Set(G.edges.map(e => KEY(e.from, e.to)));
    ok('F2', keys.size === 215 && G.edges.every(e => e.from !== e.to) && G.edges.every((e, i) => e.i === i),
      'no duplicate pair, no self-loop, edge.i equals its position');
    let intraOk = true;
    for (let m = 0; m < 5; m++) for (let k = 0; k < 39; k++) {
      const e = G.edges[m * 39 + k] || {}, b = BASE_EDGES[k];
      if (e.from !== 20 * m + b.from || e.to !== 20 * m + b.to) intraOk = false;
    }
    const inter = [];
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (const v of [8, 19]) inter.push([20 * i + v, 20 * j + v]);
    const interOk = G.edges.length === 215 && inter.every(([a, b], k) => G.edges[195 + k].from === a && G.edges[195 + k].to === b);
    ok('F3', intraOk && interOk,
      'edge order: modules 0..4 in connections.json order, then (i, j) ascending with port 8 before port 19');
    let adjOk = true;
    for (const n of G.nodes) {
      const want = [];
      for (const e of G.edges) { if (e.from === n) want.push(e.to); else if (e.to === n) want.push(e.from); }
      if (JSON.stringify(want) !== JSON.stringify(G.adj.get(n))) adjOk = false;
    }
    ok('F4', adjOk && S.ADJ === G.adj && S.NODES === G.nodes && S.EDGES === G.edges, 'adjacency lists are in edge-index order');
    const deg = G.nodes.map(n => G.adj.get(n).length);
    const portDeg = [0, 1, 2, 3, 4].map(m => [G.adj.get(20 * m + 8).length, G.adj.get(20 * m + 19).length]);
    ok('F5', Math.min(...deg) === 3 && portDeg.every(([a, b]) => a === 9 && b === 7) &&
      (deg.reduce((a, b) => a + b, 0) / 100).toFixed(2) === '4.30',
      'degrees: minimum 3, ports 9 (base 8) and 7 (base 19), mean 4.30');
    const connected = bfs(G, 1).size === 100;
    const noCut = G.nodes.every(x => bfs(G, x === 1 ? 2 : 1, x).size === 99);
    ok('F6', connected && noCut, 'connected, and no single-node removal disconnects it (checked by brute force)');
    const ecc = new Map(G.nodes.map(n => [n, Math.max(...bfs(G, n).values())]));
    const qualifying = [...new Set(G.nodes.filter(n => ecc.get(n) <= 4).map(n => ((n - 1) % 20) + 1))].sort((a, b) => a - b);
    ok('F7', JSON.stringify(S.GOALS) === '[8,39,48,79]' && S.GOALS.every(g => ecc.get(g) === 4) &&
      JSON.stringify(qualifying) === '[8,17,19]' && S.goalFor(5) === 39,
      'goals [8,39,48,79] rotate by configIndex mod 4, each with eccentricity 4; only base ids {8,17,19} have eccentricity <= 4');
    ok('F8', Math.max(...ecc.values()) === 6, 'diameter 6');
    if (record) record.F = { edges: G.edges.length, meanDegree: (deg.reduce((a, b) => a + b, 0) / 100), qualifying, diameter: Math.max(...ecc.values()) };
  }
  return rows;
}

// ==========================================================
log('='.repeat(78)); log('  M38 GATE — development substrate (PASS 1 + PASS 2)'); log('='.repeat(78));
let checks = 0, fails = 0;
const results = [], REC = {};
const emit = (row) => {
  checks++; if (!row.ok) fails++; results.push(row);
  log(`   [${row.ok ? 'PASS' : 'FAIL'}] ${row.id.padEnd(4)} ${row.msg}`);
};
const section = (t) => log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

section('PASS 1  A-D equivalence, F substrate properties');
for (const row of await runSuite(S0, REC)) emit(row);

// ---- E: mutation testing -------------------------------------------------------------------
section('E  anti-vacuity: mutated substrate.js must fail');
{
  const SRC = fs.readFileSync(SUBSTRATE_PATH, 'utf8');
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm38-'));
  fs.copyFileSync(path.join(ROOT, 'neurons.json'), path.join(TMP, 'neurons.json'));
  fs.copyFileSync(path.join(ROOT, 'connections.json'), path.join(TMP, 'connections.json'));
  fs.mkdirSync(path.join(TMP, 'experiments/m38'), { recursive: true });
  const MUTANTS = [
    ['R1 block size >= 2 instead of >= 3', "comps[Number(u.slice(2))].size >= 3", "comps[Number(u.slice(2))].size >= 2"],
    ['R1 drops the unreachable guard', "if (!prev.has(`v:${goal}`)) continue;", ''],
    ['R2 non-strict >=', 'out.set(s, productAlong(s, nxt) > productAlong(s, hnxt));', 'out.set(s, productAlong(s, nxt) >= productAlong(s, hnxt));'],
    ['R2 unreachable start counts', "if (!hop.has(s)) { out.set(s, true); continue; }".replace('true', 'false'), "if (!hop.has(s)) { out.set(s, true); continue; }"],
    ['R2 unified onto Σ1/p', 'const w = -Math.log(p[G.edgeOf.get(KEY(u, v))]);', 'const w = 1 / p[G.edgeOf.get(KEY(u, v))];'],
    ['oracle weight 1/p^2', '      const w = 1 / p[edge];', '      const w = 1 / (p[edge] * p[edge]);'],
    ['AV3 weight 1/sqrt(p)', '      const w = 1 / p[e.i];', '      const w = 1 / Math.sqrt(p[e.i]);'],
    ['ports {6, 17}', 'export const PORTS = [8, 19];', 'export const PORTS = [6, 17];'],
    ['goal (3, 16)', '[[0, 8], [1, 19], [2, 8], [3, 19]]', '[[0, 8], [1, 19], [2, 8], [3, 16]]'],
    ['port order 19 before 8', 'for (const v of PORTS) edges.push', 'for (const v of [...PORTS].reverse()) edges.push'],
    ['four modules', 'export const MODULES = 5;', 'export const MODULES = 4;'],
  ];
  let i = 0;
  for (const [name, anchor, repl] of MUTANTS) {
    i++;
    const count = SRC.split(anchor).length - 1;
    if (count !== 1) { emit({ id: `E${i}`, ok: false, msg: `${name}: anchor occurs ${count} times` }); continue; }
    const file = path.join(TMP, 'experiments/m38', `substrate_mut${i}.js`);
    fs.writeFileSync(file, SRC.replace(anchor, repl));
    let failed;
    try { failed = (await runSuite(await import(pathToFileURL(file).href))).filter(r => !r.ok).map(r => r.id); }
    catch (e) { failed = [`threw: ${e.message.slice(0, 60)}`]; }
    emit({ id: `E${i}`, ok: failed.length > 0, msg: `${name} -> caught by ${JSON.stringify(failed)}` });
  }
  fs.rmSync(TMP, { recursive: true, force: true });
}

// ---- G-J: integrity -------------------------------------------------------------------------
section('G-J  integrity');
{
  const FROZEN = ['experiments/m7/env.js', 'main.js', 'render/planning.js', 'render/scoring.js', 'instrumentation/rng.js',
    'neurons.json', 'connections.json', 'experiments/c1/protocol.js', 'experiments/uqb/protocol.js',
    'experiments/c1/data/candidates.jsonl', 'experiments/c1/results/c1_results.json',
    'research/cognitive-audit/M7_PREREGISTRATION.md', 'research/preregistrations/C1_PREREGISTRATION.md',
    'research/preregistrations/UQB_PREREGISTRATION.md'];
  const REGISTRY = ['experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/typed.js'];
  const same = (f) => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim();
  emit({ id: 'G1', ok: FROZEN.every(same), msg: `${FROZEN.length} frozen M7, C1, UQ-B and graph files byte-identical to ${BASE}` });
  const trackedDiff = git('diff', '--name-only', BASE, '--', 'main.js', 'render', 'instrumentation', 'experiments/m7',
    'experiments/c1', 'experiments/uqb', 'experiments/registry').split(/\r?\n/).filter(Boolean);
  const untracked = git('ls-files', '-o', '--exclude-standard', '--', 'main.js', 'render', 'instrumentation', 'experiments/c1',
    'experiments/uqb', 'experiments/registry').split(/\r?\n/).filter(Boolean);
  emit({ id: 'G2', ok: trackedDiff.length === 0 && untracked.length === 0,
    msg: `no tracked or new file under production, M7, C1, UQ-B or registry paths: ${JSON.stringify([...trackedDiff, ...untracked])}` });
  emit({ id: 'H1', ok: REGISTRY.every(same) && typed.config.isConsumed(typed.configSeed(895500)) === true,
    msg: 'seed registries byte-identical; 895000-895999 still consumed' });
  const src = fs.readFileSync(SUBSTRATE_PATH, 'utf8');
  const imports = [...src.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const forbidden = ['Math.' + 'random', 'make' + 'Rng', 'live' + 'Rng', 'make' + 'Config', 'generate' + 'Accepted', 'seed' + '('];
  emit({ id: 'H2', ok: imports.every(s => s.startsWith('node:')) && forbidden.every(t => !src.includes(t)),
    msg: `substrate.js imports only ${JSON.stringify(imports)} and contains no RNG, seed or configuration call` });
  emit({ id: 'I1', ok: env.evaluatedSeeds().length === 0,
    msg: 'env.evaluatedSeeds() is empty after the whole run: no configuration was generated' });
  const m38Files = git('ls-files', '-co', '--exclude-standard', '--', 'experiments/m38').split(/\r?\n/).filter(Boolean).sort();
  emit({ id: 'I2', ok: JSON.stringify(m38Files) === JSON.stringify(['experiments/m38/substrate.js', 'experiments/m38/verify.js']),
    msg: `experiments/m38 holds only code, no data or configuration: ${JSON.stringify(m38Files)}` });
  const prod = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8') + fs.readdirSync(path.join(ROOT, 'render'))
    .filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(ROOT, 'render', f), 'utf8')).join('');
  emit({ id: 'J1', ok: !prod.includes('m38/'), msg: 'no production file references the substrate' });
}

// ==========================================================
// PASS 2 — independent verification and bounded tractability
// ==========================================================
section('PASS 2  independent checks (no substrate.js code)');
{
  const G = S0.SUBSTRATE;
  // independent R1 on N = 100: DFS that stops at the second route found
  const twoRoutes = (s, goal) => {
    let found = 0; const seen = new Set();
    (function dfs(x) {
      if (found >= 2) return;
      if (x === goal) { found++; return; }
      seen.add(x);
      for (const y of G.adj.get(x)) if (!seen.has(y)) dfs(y);
      seen.delete(x);
    })(s);
    return found >= 2;
  };
  let r1Dis = 0, r1Starts = [];
  for (const g of S0.GOALS) {
    const mine = new Set(S0.r1PrimeStarts(G, g));
    let n = 0;
    for (const s of G.nodes) if (s !== g) { const t = twoRoutes(s, g); if (t) n++; if (t !== mine.has(s)) r1Dis++; }
    r1Starts.push(n);
  }
  emit({ id: 'P1', ok: r1Dis === 0, msg: `R1' on N = 100 equals an early-exit route search for every (start, goal): starts per goal ${JSON.stringify(r1Starts)}` });

  // independent R2 on N = 100: R* by Bellman-Ford on -ln p, R_hop by enumerating every hop-shortest route
  const r = lcg(555);
  let pairs = 0, r2Dis = 0, r2True = 0, maxShortest = 0;
  for (const g of S0.GOALS) for (let k = 0; k < 3; k++) {
    const p = randomP(G.edges.length, r);
    const w = (a, b) => -Math.log(p[G.edgeOf.get(KEY(a, b))]);
    const D = new Map(G.nodes.map(x => [x, Infinity])), pred = new Map(); D.set(g, 0);
    for (let it = 0; it < G.nodes.length - 1; it++) {
      let ch = false;
      for (const e of G.edges) {
        const c = w(e.from, e.to);
        if (D.get(e.from) + c < D.get(e.to)) { D.set(e.to, D.get(e.from) + c); pred.set(e.to, e.from); ch = true; }
        if (D.get(e.to) + c < D.get(e.from)) { D.set(e.from, D.get(e.to) + c); pred.set(e.from, e.to); ch = true; }
      }
      if (!ch) break;
    }
    const hop = bfs(G, g);
    const mine = S0.r2PrimePerStart(G, g, p);
    for (const s of G.nodes) {
      if (s === g) continue;
      const route = []; for (let u = s; u !== g; u = pred.get(u)) route.push(G.edgeOf.get(KEY(u, pred.get(u))));
      const rStar = route.reduce((a, i) => a * p[i], 1);
      let rHop = -1, count = 0;
      (function walk(u, acc) {
        if (u === g) { count++; if (acc > rHop) rHop = acc; return; }
        for (const v of G.adj.get(u)) if (hop.get(v) === hop.get(u) - 1) walk(v, acc * p[G.edgeOf.get(KEY(u, v))]);
      })(s, 1);
      maxShortest = Math.max(maxShortest, count);
      const indep = rStar > rHop;
      pairs++; if (indep) r2True++; if (indep !== mine.get(s)) r2Dis++;
    }
  }
  emit({ id: 'P2', ok: r2Dis === 0 && r2True > 0 && r2True < pairs,
    msg: `R2' on N = 100 equals Bellman-Ford R* vs enumerated hop-shortest R_hop on ${pairs} pairs (${r2True} true; at most ${maxShortest} hop-shortest routes per pair)` });

  // fresh-process determinism
  const run = () => execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--digest'], { cwd: ROOT, encoding: 'utf8' });
  const d1 = run(), d2 = run(), here = await digest(S0);
  emit({ id: 'P3', ok: d1 === d2 && d1 === here && /^[0-9a-f]{64}$/.test(d1),
    msg: `two fresh processes build an identical substrate and identical predicate outputs (sha256 ${d1.slice(0, 16)}…)` });
  REC.P = { r1Starts, pairs, r2True, maxShortest, digest: d1 };
}

section('PASS 2  bounded tractability (measurement only, N <= 200)');
{
  // the same rule with k modules, built here only to measure growth near N = 100
  const replica = (k) => {
    const nodes = [], edges = [];
    for (let m = 0; m < k; m++) for (const v of BASE_NODES) nodes.push(20 * m + v);
    for (let m = 0; m < k; m++) for (const e of BASE_EDGES) edges.push({ i: edges.length, from: 20 * m + e.from, to: 20 * m + e.to });
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) for (const v of [8, 19]) edges.push({ i: edges.length, from: 20 * i + v, to: 20 * j + v });
    return S0.makeGraph(nodes, edges);
  };
  const time = (fn) => { const ts = []; for (let i = 0; i < 5; i++) { const t0 = performance.now(); fn(); ts.push(performance.now() - t0); } return ts.sort((a, b) => a - b)[2]; };
  const rows = [];
  for (const k of [1, 3, 5, 7, 10]) {
    const Gk = k === 5 ? S0.SUBSTRATE : replica(k), p = randomP(Gk.edges.length, lcg(600 + k)), g = 8;
    rows.push({ N: Gk.nodes.length, E: Gk.edges.length,
      r1: time(() => S0.r1PrimeStarts(Gk, g)), r2: time(() => S0.r2PrimePerStart(Gk, g, p)),
      dijkstra: time(() => S0.expectedCostToGoal(Gk, p, g)), bellmanFord: time(() => S0.bellmanFordCost(Gk, p, g)) });
  }
  for (const x of rows) log(`   N=${String(x.N).padStart(3)} E=${String(x.E).padStart(3)}  R1' ${x.r1.toFixed(2)} ms  R2' ${x.r2.toFixed(2)} ms  Dijkstra ${x.dijkstra.toFixed(2)} ms  BF ${x.bellmanFord.toFixed(2)} ms`);
  // exhaustive enumeration, bounded by a deterministic step cap: does it even finish?
  const G = S0.SUBSTRATE, CAP = 2000000;
  let routes = 0, steps = 0;
  const seen = new Set();
  (function dfs(x) {
    if (++steps > CAP) return;
    if (x === 8) { routes++; return; }
    seen.add(x);
    for (const y of G.adj.get(x)) if (!seen.has(y) && steps <= CAP) dfs(y);
    seen.delete(x);
  })(99);
  const at100 = rows.find(x => x.N === 100);
  emit({ id: 'P4', ok: rows.every(x => Number.isFinite(x.r2)) && at100.r1 + at100.r2 + at100.dijkstra + at100.bellmanFord < 1000,
    msg: `at N = 100 one goal evaluation of R1', R2', Dijkstra and Bellman-Ford takes ${(at100.r1 + at100.r2 + at100.dijkstra + at100.bellmanFord).toFixed(1)} ms in total (median of 5)` });
  emit({ id: 'P5', ok: steps > CAP && routes > 0,
    msg: `EVIDENCE (bounded, one start): enumerating the simple routes from start 99 to goal 8 does not finish within ${CAP} DFS steps (${routes} routes found before the cap)` });
  REC.tractability = rows; REC.exhaustive = { cap: CAP, routesBeforeCap: routes };
}

log('\n' + '='.repeat(78));
log(`  M38 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
log(`  VERDICT: ${fails === 0 ? 'SUBSTRATE VERIFIED' : 'SUBSTRATE NOT VERIFIED'}`);
log('='.repeat(78));
if (JSON_MODE) process.stdout.write(JSON.stringify({ checks, fails, results, R: REC }));
process.exit(fails === 0 ? 0 : 1);

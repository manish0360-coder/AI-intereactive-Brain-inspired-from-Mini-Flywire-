// ==========================================================
// M7 ENVIRONMENT — hidden per-edge traversal reliability
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §3.1-3.8 environment definition · §18.1 this file's role
// DIRECTOR RULINGS 2026-08-20: R1..R9
//
// HARNESS-OWNED. Never imported by render/. The agent reaches this module
// only through main.js E1 (env.attempt), and never observes p_e.
//
// ---------------------------------------------------------------------
// TWO STRUCTURAL FACTS ESTABLISHED BY INSPECTION (see report)
// ---------------------------------------------------------------------
// 1. connections.json has 39 entries, but render/connections.js
//    connectPoints() pushes BOTH directions, so the agent's traversal
//    graph is UNDIRECTED: 78 directed adjacencies.
//    Ruling R6 pins "exactly floor(0.35*39)=13 UNRELIABLE edges", which is
//    only self-consistent if p_e is assigned per connections.json ENTRY
//    (39 of them) and governs BOTH traversal directions. That is what this
//    module does: p is symmetric per undirected entry.
//
// 2. R5 (decision relevance) is implemented per ERRATUM M7-ERR-03. The
//    frozen R5 objective was undefined and its infinite-horizon reading is
//    degenerate under slip-in-place. ERR-03 §3.1 supersedes ONLY that
//    objective with a finite-horizon Bellman recurrence over the horizon
//    EPISODE_CAP = 150 already pinned by frozen §3.7.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng, liveRng } from '../../instrumentation/rng.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

// ---- frozen constants (no value here is chosen by the engineer) ----
export const GOALS         = [8, 12, 16, 19];   // §3.7
export const N_UNRELIABLE  = 13;                // ruling R6 = floor(0.35*39)
export const P_UNRELIABLE  = [0.25, 0.45];      // §3.5
export const P_RELIABLE    = [0.90, 1.00];      // §3.5
export const RUN_TICKS     = 3000;              // §3.7
export const T_SHIFT       = 1500;              // §3.6
export const EPISODE_CAP   = 150;               // §3.7
export const EMBED_DIM     = 32;                // matches render/embeddings.js createEmbedding default

// ---- graph, loaded once (topology is fixed; §3.1 "No topology change") ----
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))
  .map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'))
  .map(n => Number(n.id));

// undirected key -> edge index (the agent traverses both ways)
const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const EDGE_OF = new Map();
for (const e of EDGES) EDGE_OF.set(KEY(e.from, e.to), e.i);

// traversal adjacency, built in connections.json file order — the existing
// deterministic ordering (ruling R5 tie-break source; matches main.js:627)
const ADJ = new Map(NODES.map(n => [n, []]));
for (const e of EDGES) { ADJ.get(e.from).push(e.to); ADJ.get(e.to).push(e.from); }

// directed adjacency, for R4's "shortest DIRECTED graph distance"
const DIR_IN = new Map(NODES.map(n => [n, []]));
for (const e of EDGES) DIR_IN.get(e.to).push(e.from);

// ERRATUM M7-ERR-07 §2: endpoint degrees, for ERR-06 §4.2 observables 3 and 4.
// Fixed properties of the frozen topology - identical for every configuration,
// derived from connections.json alone, consuming no randomness.
const DEG_OUT = new Map(NODES.map(n => [n, 0]));
const DEG_IN  = new Map(NODES.map(n => [n, 0]));
for (const e of EDGES) { DEG_OUT.set(e.from, DEG_OUT.get(e.from) + 1); DEG_IN.set(e.to, DEG_IN.get(e.to) + 1); }

// The five ERR-06 4.2 observables, in ruled order. Exported so a verifier can
// assert the set was neither reordered, extended, nor renamed.
export const G11_OBSERVABLES = Object.freeze([
  'endpoint-cosine-similarity',
  'directed-distance-to-goal',
  'source-endpoint-degree',
  'destination-endpoint-degree',
  'canonical-edge-index'
]);
export const G11_THRESHOLD = 0.10;   // frozen R3/R4 threshold, reused verbatim

// ERR-07 P9 audit: which config seeds this process has ever generated. Pure
// observation - it records, it does not gate, and it cannot alter generation.
const SEEN = new Set();
export function evaluatedSeeds() { return [...SEEN].sort((a, b) => a - b); }
export function evaluatedSeedRange() {
  const a = evaluatedSeeds();
  return { n: a.length, min: a.length ? a[0] : null, max: a.length ? a[a.length - 1] : null };
}

export const graphInfo = () => ({
  nodes: NODES.length, entries: EDGES.length,
  directedAdjacencies: [...ADJ.values()].reduce((a, v) => a + v.length, 0)
});

// ==========================================================
// deterministic helpers
// ==========================================================
function shuffledIndices(n, rnd) {              // Fisher-Yates, config-RNG driven
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const uniform = (rnd, [lo, hi]) => lo + rnd() * (hi - lo);

function spearman(x, y) {
  const rank = (v) => {
    const idx = v.map((val, i) => [val, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(v.length);
    for (let i = 0; i < idx.length;) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(x), ry = rank(y), n = x.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - my; num += a * b; dx += a * a; dy += b * b; }
  return (dx === 0 || dy === 0) ? 0 : num / Math.sqrt(dx * dy);
}

// directed distance from every node to `goal` (R4)
function directedDistToGoal(goal) {
  const d = new Map([[goal, 0]]); const q = [goal];
  while (q.length) { const x = q.shift(); for (const p of DIR_IN.get(x)) if (!d.has(p)) { d.set(p, d.get(x) + 1); q.push(p); } }
  return d;
}

// all simple paths start->goal on the TRAVERSAL graph, as edge-index arrays.
// Topology is fixed, so this is cached per goal and reused across configs.
const PATH_CACHE = new Map();
function simplePaths(goal) {
  if (PATH_CACHE.has(goal)) return PATH_CACHE.get(goal);
  const byStart = new Map();
  for (const s of NODES) {
    if (s === goal) continue;
    const out = []; const seen = new Set(); const cur = [];
    (function dfs(x) {
      if (x === goal) { out.push([...cur]); return; }
      seen.add(x);
      for (const y of ADJ.get(x)) {
        if (seen.has(y)) continue;
        cur.push(EDGE_OF.get(KEY(x, y))); dfs(y); cur.pop();
      }
      seen.delete(x);
    })(s);
    byStart.set(s, out);
  }
  PATH_CACHE.set(goal, byStart);
  return byStart;
}

// ==========================================================
// configuration generation (§3.5, rulings R2/R3/R4/R6/R7/R8)
// ==========================================================
export function makeConfig(configSeed, configIndex) {
  // R8: config generation is driven ONLY by configSeed. The cognitive stream
  // is never touched here, so configurations are independent of agent seeds.
  const rnd = makeRng(configSeed >>> 0);
  const goal = GOALS[configIndex % GOALS.length];             // §3.7

  // R6: exactly 13 of the 39 entries are UNRELIABLE
  const order = shuffledIndices(EDGES.length, rnd);
  const unreliableSet = new Set(order.slice(0, N_UNRELIABLE));

  // R7: membership is fixed; the two phases swap WHICH distribution applies.
  // Both values are drawn now, so nothing is redrawn at runtime.
  const pUn = new Array(EDGES.length), pRel = new Array(EDGES.length);
  for (let i = 0; i < EDGES.length; i++) {
    pUn[i]  = uniform(rnd, P_UNRELIABLE);
    pRel[i] = uniform(rnd, P_RELIABLE);
  }
  const phaseP = (phase) => EDGES.map((_, i) => {
    const isUn = unreliableSet.has(i);
    const lowNow = (phase === 1) ? isUn : !isUn;              // phase II swaps
    return lowNow ? pUn[i] : pRel[i];
  });

  // R8: R3 embeddings are deterministic from the configuration seed only.
  const emb = new Map(NODES.map(n => {
    const v = [...Array(EMBED_DIM)].map(() => rnd() * 2 - 1);
    const m = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
    return [n, v.map(x => x / m)];
  }));

  const cfg = {
    configSeed, configIndex, goal,
    unreliableSet: [...unreliableSet].sort((a, b) => a - b),
    pPhase1: phaseP(1), pPhase2: phaseP(2),
    embedding: emb
  };
  SEEN.add(configSeed >>> 0);            // ERR-07 P9 audit only; no effect on cfg
  cfg.checks = evaluateConstraints(cfg);
  // ERRATUM M7-ERR-07 §2 supersedes frozen §3.5 "all five": acceptance now also
  // requires the ERR-06 §4.2 independence criterion that frozen §14 G11 already
  // demanded of every accepted configuration. R1-R5 are untouched.
  cfg.accepted = cfg.checks.R1 && cfg.checks.R2 && cfg.checks.R3 && cfg.checks.R4
                 && cfg.checks.R5 === true && cfg.checks.G11 === true;
  return cfg;
}

// ---- R1..R5, evaluated on the PHASE-I assignment as generated ----
export function evaluateConstraints(cfg) {
  const p = cfg.pPhase1;
  const paths = simplePaths(cfg.goal);

  // R1: >= 2 distinct simple paths (ruling R2: differing ordered edge
  // sequences; no disjointness required) from >= 6 start nodes
  let startsWith2 = 0;
  for (const [, ps] of paths) if (ps.length >= 2) startsWith2++;
  const R1 = startsWith2 >= 6;

  // R2: hop-shortest route has strictly LOWER reliability R(r)=prod(p_e)
  // (ruling R3) than at least one longer route
  const R = (route) => route.reduce((a, i) => a * p[i], 1);
  let r2Starts = 0;
  for (const [, ps] of paths) {
    if (!ps.length) continue;
    const minHops = Math.min(...ps.map(r => r.length));
    const bestShort = Math.max(...ps.filter(r => r.length === minHops).map(R));
    const bestLong = ps.filter(r => r.length > minHops).reduce((m, r) => Math.max(m, R(r)), -1);
    if (bestLong > bestShort) r2Starts++;
  }
  const R2 = r2Starts >= 1;

  // R3: |rho(p_e, cos(emb[u],emb[v]))| < 0.10   (config-local embeddings, R8)
  const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const sims = EDGES.map(e => cos(cfg.embedding.get(e.from), cfg.embedding.get(e.to)));
  const rho3 = spearman(p, sims);
  const R3 = Math.abs(rho3) < 0.10;

  // R4: |rho(p_e, directed distance from destination v to goal)| < 0.10
  const dist = directedDistToGoal(cfg.goal);
  const INF = NODES.length + 1;
  const dists = EDGES.map(e => (dist.has(e.to) ? dist.get(e.to) : INF));
  const rho4 = spearman(p, dists);
  const R4 = Math.abs(rho4) < 0.10;

  // R5 per ERR-03 §3.1-3.4: finite-horizon reliability-optimal policy vs
  // hop-optimal policy, differing on >= 4 decision states.
  const r5 = r5DecisionStateDiff(p, cfg.goal);
  const R5 = r5.count >= 4;

  // ==========================================================
  // ERRATUM M7-ERR-07 §2 - the ERR-06 §4.2 independence criterion, as an
  // ACCEPTANCE term rather than a post-hoc gate.
  //
  // Ground (ERR-07 §1): frozen §3.5 accepts on two observables (R3, R4) while
  // frozen §14 G11 requires five to be clean. Config 900004 satisfied R1-R5 and
  // still leaked at rho = -0.2089 on canonical edge index. That RED stands.
  //
  // SCOPE (ERR-07 §3, Director Decision 1): evaluated on cfg.pPhase1 ONLY - the
  // same pre-shift assignment R3/R4 use (ERR-03 §4). cfg.pPhase2 is NOT an
  // acceptance condition; post-shift leakage is a recorded W3 limitation.
  //
  // Observables 1 and 2 REUSE rho3 and rho4 rather than recomputing them, so the
  // predicate is a strict superset of R3 AND R4 by construction, not by luck.
  // Observables 3-5 are fixed topology properties. No draw is consumed here.
  // ==========================================================
  const rhoObs = [
    rho3,                                                   // 1 endpoint cosine similarity
    rho4,                                                   // 2 directed distance-to-goal
    spearman(p, EDGES.map(e => DEG_OUT.get(e.from))),       // 3 source endpoint degree
    spearman(p, EDGES.map(e => DEG_IN.get(e.to))),          // 4 destination endpoint degree
    spearman(p, EDGES.map(e => e.i))                        // 5 canonical edge index
  ];
  const G11 = rhoObs.every(r => Math.abs(r) < G11_THRESHOLD);

  return { R1, startsWith2, R2, r2Starts, R3, rho3, R4, rho4,
           R5, r5Differing: r5.count, r5States: r5.nDecisionStates,
           r5DifferingNodes: r5.differing,
           G11, rhoObs, g11Worst: G11_OBSERVABLES[
             rhoObs.map(Math.abs).indexOf(Math.max(...rhoObs.map(Math.abs)))] };
}

// ==========================================================
// R5 — decision relevance.  Governed by ERRATUM M7-ERR-04.
// ==========================================================
// HISTORY, kept so the reasoning is auditable:
//   frozen §3.5 R5 left "expected-reliability-optimal" undefined.
//   ERR-03 §2.2 proved the infinite-horizon reading degenerate (a slip keeps
//     the agent at u, so P(eventually reach goal) is 1 or 0 independent of p_e).
//   ERR-03 §3.1 replaced it with a finite-horizon Bellman recurrence, which
//     SATURATED at the frozen horizon EPISODE_CAP = 150: V == 1.0 exactly for
//     all 20 nodes by H = 20, best-vs-2nd action gap exactly 0 at H = 150, so
//     the argmax was decided by edge order and float rounding, not by p_e.
//   ERR-04 §3.1 supersedes ONLY that objective with the non-saturating form
//     below. EPISODE_CAP is UNCHANGED and was NOT tuned.
//
// R5" OBJECTIVE: minimise EXPECTED ATTEMPTS-TO-GOAL.
//   Under frozen §3.3 a slip keeps the agent at u and consumes one attempt,
//   so traversing e takes a geometric number of attempts with mean 1/p_e.
//
//     C(goal) = 0
//     C(u)    = min over (u,v) in E [ 1/p_uv + C(v) ]
//     pi_rel(u) = argmin over (u,v) in E [ 1/p_uv + C(v) ]
//
//   Weights 1/p_e lie in [1,4] for p_e in [0.25,1], are strictly positive and
//   unbounded as p_e -> 0, so costs never saturate. Solved by Dijkstra from
//   the goal. connections.json order is the FINAL tie-break only (ERR-04 §3.4).
export const R5_STATUS = 'IMPLEMENTED_PER_ERR_04';

// harness accessor: connections.json index of the undirected entry {a,b}.
// Used by gates/probes to address a specific edge. Never used by the agent.
export function edgeIndexOf(a, b) { return EDGE_OF.get(KEY(Number(a), Number(b))); }

// neighbours of u in connections.json file order (ERR-03 §3.2 tie-break source)
function orderedNeighbours(u) {
  return ADJ.get(u).map(v => ({ v, edge: EDGE_OF.get(KEY(u, v)) }))
                   .sort((a, b) => a.edge - b.edge);
}

// ERR-03 §3.4: a decision state is a non-goal node with >= 2 traversal neighbours
export function decisionStates(goal) {
  return NODES.filter(n => n !== goal && ADJ.get(n).length >= 2);
}

// ---- expected attempts-to-goal (ERR-04 §3.1), Dijkstra from the goal ----
export function expectedCostToGoal(p, goal) {
  const C = new Map(NODES.map(n => [n, Infinity]));
  C.set(goal, 0);
  const done = new Set();
  while (done.size < NODES.length) {
    let u = null, bestC = Infinity;
    for (const n of NODES) if (!done.has(n) && C.get(n) < bestC) { bestC = C.get(n); u = n; }
    if (u === null) break;                       // remaining nodes unreachable
    done.add(u);
    for (const { v, edge } of orderedNeighbours(u)) {
      const w = 1 / p[edge];                     // expected retries on this edge
      if (C.get(u) + w < C.get(v)) C.set(v, C.get(u) + w);
    }
  }
  return C;
}

export function reliabilityOptimalPolicy(p, goal) {
  const C = expectedCostToGoal(p, goal);
  const policy = new Map();
  for (const u of NODES) {
    if (u === goal) continue;
    let best = Infinity, bestV = null;
    for (const { v, edge } of orderedNeighbours(u)) {       // file order = FINAL tie-break
      const val = 1 / p[edge] + C.get(v);
      if (val < best) { best = val; bestV = v; }            // strict < keeps the earliest on an exact tie
    }
    policy.set(u, bestV);
  }
  return { policy, C };
}

export function hopOptimalPolicy(goal) {
  // hop distance on the TRAVERSAL graph - the agent's real action set (ERR-03 §3.4)
  const d = new Map([[goal, 0]]); const q = [goal];
  while (q.length) { const x = q.shift(); for (const y of ADJ.get(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } }
  const policy = new Map();
  for (const u of NODES) {
    if (u === goal) continue;
    let best = Infinity, bestV = null;
    for (const { v } of orderedNeighbours(u)) {
      const dv = d.has(v) ? d.get(v) : Infinity;
      if (dv < best) { best = dv; bestV = v; }
    }
    policy.set(u, bestV);
  }
  return { policy, dist: d };
}

// ---- AV3: independent exhaustive oracle over enumerated simple paths ----
// Deliberately a DIFFERENT algorithm from Dijkstra, so agreement is evidence.
export function exhaustiveMinCost(p, goal) {
  const out = new Map([[goal, 0]]);
  for (const [s, paths] of simplePaths(goal)) {
    let best = Infinity;
    for (const route of paths) {
      let c = 0; for (const i of route) c += 1 / p[i];
      if (c < best) best = c;
    }
    out.set(s, best);
  }
  return out;
}

// R5: the two policies must differ on >= 4 decision states
export function r5DecisionStateDiff(p, goal) {
  const rel = reliabilityOptimalPolicy(p, goal).policy;
  const hop = hopOptimalPolicy(goal).policy;
  const states = decisionStates(goal);
  const differing = states.filter(u => rel.get(u) !== hop.get(u));
  return { differing, count: differing.length, nDecisionStates: states.length, rel, hop };
}

export function checkR5(p, goal) {
  if (p === undefined || goal === undefined) return R5_STATUS;
  return r5DecisionStateDiff(p, goal).count >= 4;
}

// ==========================================================
// Rejection sampling - frozen §3.5, semantics per ERRATUM M7-ERR-07 §4/§5.
//
// Director Decision 3: the former `maxTries = 50` was an ENGINEER-CHOSEN default
// with no basis in the frozen document, which specifies redrawing "from the next
// config seed in sequence" with no bound. It is removed and NOT replaced by
// another number. No renamed constant, cap or sampling budget survives here.
//
// Termination is not assumed: acceptance is demonstrably attainable (config
// 900000 satisfies the complete ERR-07 criteria), the body is pure arithmetic on
// a fixed 39-edge graph with no I/O and no unbounded allocation, and the seed
// space is uint32. ERR-07 §5 records that no technical safety limit is required.
// ==========================================================
export function generateAccepted(startSeed, configIndex) {
  const start = startSeed >>> 0;
  const discards = [];
  for (let seed = start; ; seed = (seed + 1) >>> 0) {     // strictly ascending, skipping nothing
    const cfg = makeConfig(seed, configIndex);
    if (cfg.accepted) return {
      cfg, discards, tries: discards.length + 1,
      // ERR-07 §4.1 mandatory provenance
      provenance: {
        acceptedConfigIndex: configIndex,
        startingSeed: start,
        acceptedSeed: seed,
        numberOfRejectedCandidatesBeforeAcceptance: discards.length
      }
    };
    discards.push({ seed, checks: cfg.checks });
  }
}

// ==========================================================
// ERRATUM M7-ERR-07 §4 (Director Decision 2) - the held-out protocol needs
// `count` ACCEPTED configurations, produced by deterministic sequential
// rejection sampling from `startSeed`. The declared block is the START of the
// candidate stream, not a manually selectable pool.
//
// The stream resumes at acceptedSeed + 1, so candidate seeds are consumed in one
// strictly ascending pass with nothing skipped and nothing reordered. Goals cycle
// by acceptedConfigIndex through frozen §3.7 GOALS.
//
// This function is NEVER invoked on the held-out stream during design. Verifier
// coverage uses the already-inspected pilot region only; env.evaluatedSeedRange()
// gives the runtime proof.
// ==========================================================
export function generateAcceptedStream(startSeed, count) {
  const out = [];
  let seed = startSeed >>> 0;
  for (let i = 0; i < count; i++) {
    const r = generateAccepted(seed, i);
    out.push({ ...r.provenance, goal: r.cfg.goal, cfg: r.cfg, discards: r.discards });
    seed = (r.provenance.acceptedSeed + 1) >>> 0;
  }
  return out;
}

// ==========================================================
// runtime environment (§3.3) — the ONLY part the agent can reach
// ==========================================================
let ACTIVE = null, PHASE = 1, ENABLED = false;
const counters = { attempts: 0, successes: 0, slips: 0, envDraws: 0 };

export function install(cfg) { ACTIVE = cfg; PHASE = 1; ENABLED = true; reset(); }
export function disable() { ENABLED = false; ACTIVE = null; }
export function isEnabled() { return ENABLED; }
export function reset() { counters.attempts = counters.successes = counters.slips = counters.envDraws = 0; }
export function setTick(t) { PHASE = (t >= T_SHIFT) ? 2 : 1; return PHASE; }
export function getPhase() { return PHASE; }
export function getCounters() { return { ...counters }; }

function pFor(fromId, toId) {
  const i = EDGE_OF.get(KEY(Number(fromId), Number(toId)));
  if (i === undefined) return null;                       // not a graph edge
  return (PHASE === 1 ? ACTIVE.pPhase1 : ACTIVE.pPhase2)[i];
}

// Harness-only. Used by the A7 ORACLE arm and by gates. NEVER by the agent.
export function trueP(fromId, toId) { return ACTIVE ? pFor(fromId, toId) : null; }

// §3.3 — the Bernoulli traversal draw. Frozen §3.7 / ruling R1: the draw MUST
// come from liveRng("environment"), never a private generator.
export function attempt(fromId, toId) {
  if (!ENABLED || !ACTIVE) return true;                   // M7 off => inert (E1)
  const p = pFor(fromId, toId);
  if (p === null) return true;                            // unknown edge: unchanged behaviour
  const draw = liveRng('environment');
  counters.envDraws++; counters.attempts++;
  const success = draw < p;
  if (success) counters.successes++; else counters.slips++;
  return success;
}

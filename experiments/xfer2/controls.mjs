// ==========================================================
// XFER-2 — control episode stores (pure functions; no I/O, no clock, no ambient randomness)
// ==========================================================
// Every builder returns an array of episodes in the representation the runtime persists (exportEpisodes):
//   { id, source, nodes, labels, transitions:[{from,to,position,terminal}], quality, coherence, unique, diversity,
//     timestamp, consolidationEligible }
// `g` = { directed:Set('a->b'), neighbors:Map(node -> sorted [nodes]), nodes:[...] }, `labelOf` = node -> label.
// ==========================================================
import { SAT, NR_QUALITY, REAL_POOL, ENTRY_COUNT } from './config.mjs';
import { prng } from '../xfer1/stats.mjs';

// ---------- graph helpers ----------
export function makeGraph(connections) {
  const directed = new Set(), nb = new Map();
  for (const e of connections) {
    const a = Number(e.from), b = Number(e.to);
    directed.add(`${a}->${b}`); directed.add(`${b}->${a}`);
    if (!nb.has(a)) nb.set(a, new Set());
    if (!nb.has(b)) nb.set(b, new Set());
    nb.get(a).add(b); nb.get(b).add(a);
  }
  const neighbors = new Map([...nb.entries()].map(([k, v]) => [k, [...v].sort((x, y) => x - y)]));
  return { directed, neighbors, nodes: [...neighbors.keys()].sort((x, y) => x - y) };
}
export const isEdge = (g, a, b) => g.directed.has(`${a}->${b}`);

/** undirected BFS distance of every node to `goal` */
export function distancesTo(g, goal) {
  const d = new Map([[goal, 0]]), q = [goal];
  while (q.length) { const x = q.shift(); for (const y of g.neighbors.get(x) || []) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } }
  return d;
}

// ---------- episode construction ----------
/** the runtime's own relationships: diversity = unique / length; coherence = diversity for the loop episodes observed */
export function makeEpisode({ id, nodes, labelOf, quality, source = 'autonomous_success' }) {
  const n = nodes.map(Number);
  const unique = new Set(n).size, diversity = unique / n.length;
  return {
    id, source, nodes: n, labels: n.map(labelOf),
    transitions: n.slice(0, -1).map((from, i) => ({ from, to: n[i + 1], position: i, terminal: i === n.length - 2 })),
    quality, coherence: diversity, unique, diversity, timestamp: 1, consolidationEligible: true,
  };
}

/** same episodes, quality below the replay threshold: decision-time reads (adjacency, integrity) are unchanged */
export function noReplay(episodes) {
  return episodes.map(e => ({ ...e, id: `${e.id}_nr`, quality: NR_QUALITY }));
}

/** same episodes with every path reversed (direction of travel inverted), replay-ineligible */
export function reversedNoReplay(episodes, labelOf) {
  return episodes.map((e, i) => makeEpisode({ id: `rev_${i}`, nodes: e.nodes.slice().reverse(), labelOf, quality: NR_QUALITY, source: e.source }));
}

// ---------- balanced goal-free walks ----------
/**
 * Build one walk per spec ({L, simple}) over the `allowed` directed edges, balancing directed-edge usage:
 * a walk starts on the least-used allowed edge and extends along the least-used allowed edges (seeded tie-breaks).
 *   simple  : no repeated node;
 *   loop    : a simple core of L-2 nodes with one immediate-reversal excursion (c -> x -> c) inserted, the pattern 91% of
 *             the real loop episodes contain (A-B-A).
 * Pure function of (graph, specs, allowed, seed).  Returns { episodes, use } with `use` the directed-edge usage.
 */
export function buildWalks(g, labelOf, specs, { allowed, seed, tag, quality }) {
  const rnd = prng(seed);
  const allowedList = [...allowed].sort().map(k => k.split('->').map(Number));
  const use = new Map(allowedList.map(([a, b]) => [`${a}->${b}`, 0]));
  const nbrs = (c) => (g.neighbors.get(c) || []).filter(v => allowed.has(`${c}->${v}`));
  const pickMin = (cands) => {
    let best = Infinity, tie = [];
    for (const c of cands) { const u = use.get(`${c[0]}->${c[1]}`); if (u < best) { best = u; tie = [c]; } else if (u === best) tie.push(c); }
    return tie[Math.floor(rnd() * tie.length)];
  };
  const episodes = [];
  specs.forEach(({ L, simple }, i) => {
    for (let attempt = 0; ; attempt++) {
      if (attempt > 1000) throw new Error(`buildWalks: could not build walk ${i} (L=${L}, simple=${simple})`);
      let path;
      if (simple || L >= 4) {
        const coreLen = simple ? L : L - 2;
        // the start edge must allow the walk to proceed (a dead end retries with another tie-break)
        const first = pickMin(allowedList);
        path = [first[0], first[1]];
        let ok = true;
        while (path.length < coreLen) {
          const cur = path[path.length - 1];
          const options = nbrs(cur).filter(v => !path.includes(v)).map(v => [cur, v]);
          if (!options.length) { ok = false; break; }
          path.push(pickMin(options)[1]);
        }
        if (!ok) continue;
        if (!simple) {
          // insert c -> x -> c at a seeded position of the core; both directions must be allowed
          const j = Math.floor(rnd() * path.length), c = path[j];
          const xs = nbrs(c).filter(v => allowed.has(`${v}->${c}`)).map(v => [c, v]);
          if (!xs.length) continue;
          const x = pickMin(xs)[1];
          path = [...path.slice(0, j + 1), x, c, ...path.slice(j + 1)];
        }
      } else {                                                         // a length-3 loop: a -> b -> a
        const cands = allowedList.filter(([a, b]) => allowed.has(`${b}->${a}`));
        if (!cands.length) continue;
        const [a, b] = pickMin(cands);
        path = [a, b, a];
      }
      if (path.length !== L) continue;
      if ((new Set(path).size === path.length) !== simple) continue;
      let valid = true;
      for (let k = 0; k < path.length - 1; k++) if (!allowed.has(`${path[k]}->${path[k + 1]}`)) { valid = false; break; }
      if (!valid) continue;
      for (let k = 0; k < path.length - 1; k++) { const key = `${path[k]}->${path[k + 1]}`; use.set(key, use.get(key) + 1); }
      episodes.push(makeEpisode({ id: `${tag}_${i}`, nodes: path, labelOf, quality: typeof quality === 'function' ? quality(simple) : quality }));
      return;
    }
  });
  return { episodes, use };
}

/** stratified, deterministic list of `count` lengths following a histogram */
function lengthsFrom(hist, count, rnd) {
  const total = Object.values(hist).reduce((s, x) => s + x, 0), out = [];
  for (const [L, c] of Object.entries(hist)) for (let i = 0; i < Math.round(count * c / total); i++) out.push(Number(L));
  const longest = Math.max(...Object.keys(hist).map(Number));
  while (out.length < count) out.push(longest);
  out.length = count;
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const goalEntering = (g, goal) => (g.neighbors.get(goal) || []).map(u => `${u}->${goal}`);

/**
 * SATURATED exposure (an UPPER BOUND, not a matched control): `count` goal-free walks, every allowed directed edge used
 * at least `minDirectedEdgeCount` times.  World-independent when `excludeInto` is null; with `excludeInto = goal` no
 * goal-entering transition is allowed (the non-goal gate alone).  Quality: the pooled real median of the kind, or `quality`.
 */
export function satStore(g, labelOf, { excludeInto = null, count = SAT.count, minCount = SAT.minDirectedEdgeCount, simpleFraction = SAT.simpleFraction, seed = SAT.seed, tag = 'sat', quality = null } = {}) {
  const rnd = prng(seed ^ 0x9e3779b9);
  const nSimple = Math.round(count * simpleFraction), nLoop = count - nSimple;
  const simpleLens = lengthsFrom(REAL_POOL.simpleLengthHistogram, nSimple, rnd), loopLens = lengthsFrom(REAL_POOL.loopLengthHistogram, nLoop, rnd);
  const specs = [...simpleLens.map(L => ({ L, simple: true })), ...loopLens.map(L => ({ L, simple: false }))];
  for (let i = specs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [specs[i], specs[j]] = [specs[j], specs[i]]; }
  const allowed = new Set(g.directed);
  if (excludeInto !== null) for (const k of goalEntering(g, excludeInto)) allowed.delete(k);
  const { episodes, use } = buildWalks(g, labelOf, specs, { allowed, seed, tag,
    quality: quality !== null ? quality : (simple => (simple ? REAL_POOL.simpleQualityMedian : REAL_POOL.loopQualityMedian)) });
  const lowest = Math.min(...use.values());
  if (lowest < minCount) throw new Error(`satStore: lowest allowed directed-edge count ${lowest} < ${minCount}`);
  return episodes;
}

/**
 * MATCHED generic store of a world: the same number of episodes, the same length of every episode, the same
 * simple / loop-containing kind of every episode, hence the same total number of transitions, as the world's real store;
 * edges are placed by balanced least-used selection with no reference to the goal or to any real path.  Quality is the
 * replay-off value.  The manipulated variable relative to REAL_NR is the PLACEMENT of the same exposure budget (edge
 * identity, direction and goal termination together).
 */
export function genStore(g, labelOf, realEpisodes, { seed, tag = 'gen' }) {
  const specs = realEpisodes.map(e => ({ L: e.nodes.length, simple: new Set(e.nodes).size === e.nodes.length }));
  const allowed = new Set(g.directed);
  return buildWalks(g, labelOf, specs, { allowed, seed, tag, quality: NR_QUALITY }).episodes;
}

/** only goal-entering transitions: `ENTRY_COUNT` two-node episodes [u, goal] for every neighbour u of the goal */
export function entryStore(g, labelOf, goal, { count = ENTRY_COUNT, tag = 'entry' } = {}) {
  const out = [];
  let k = 0;
  for (const u of g.neighbors.get(goal) || []) for (let i = 0; i < count; i++) out.push(makeEpisode({ id: `${tag}_${k++}`, nodes: [u, goal], labelOf, quality: NR_QUALITY }));
  return out;
}

// ---------- the runtime's replay eligibility (mirror of render/episodeManager.js replayOneEpisode's filter) ----------
export function replayEligible(ep, g) {
  if (ep.source === 'replay' || ep.source === 'imagination') return false;
  if (ep.quality < 0.5) return false;
  if (ep.nodes.length < 3) return false;
  if (new Set(ep.nodes).size !== ep.nodes.length) return false;
  for (let i = 0; i < ep.nodes.length - 1; i++) if (!isEdge(g, ep.nodes[i], ep.nodes[i + 1])) return false;
  return true;
}

// ---------- store statistics: the residual-difference measurements ----------
/**
 * Decision-time quantities the runtime reads from a store, evaluated on every directed edge:
 *   count(u->v)   adjacency count (rebuildAdjacencyMemory), tc = min(count / 5, 1);
 *                 gate = 0.10 + 0.90 tc for a non-goal candidate, 100 * tc for the goal-entering candidate
 *   integrity(u->v) = min(episodes containing the directed pair / 5, 1)   (a pair-only context match is 1/3 >= 0.33)
 * Edges are classed by BFS distance to the goal: goalward (v closer), level, away.
 */
export function storeStats(episodes, g, goal) {
  const dist = distancesTo(g, goal);
  const count = new Map(), episodesWith = new Map();
  for (const k of g.directed) { count.set(k, 0); episodesWith.set(k, 0); }
  let transitions = 0, endAtGoal = 0, containsGoal = 0, eligible = 0, simple = 0, lenSum = 0, q = 0;
  const startNodes = new Set();
  for (const e of episodes) {
    lenSum += e.nodes.length; q += e.quality; startNodes.add(e.nodes[0]);
    if (e.nodes[e.nodes.length - 1] === goal) endAtGoal++;
    if (e.nodes.includes(goal)) containsGoal++;
    if (new Set(e.nodes).size === e.nodes.length) simple++;
    if (replayEligible(e, g)) eligible++;
    const seen = new Set();
    for (let i = 0; i < e.nodes.length - 1; i++) {
      const k = `${e.nodes[i]}->${e.nodes[i + 1]}`;
      if (!count.has(k)) continue;
      count.set(k, count.get(k) + 1); transitions++;
      if (!seen.has(k)) { seen.add(k); episodesWith.set(k, episodesWith.get(k) + 1); }
    }
  }
  const entering = goalEntering(g, goal);
  const cls = { goalward: [], level: [], away: [] };
  for (const k of g.directed) {
    if (entering.includes(k)) continue;                              // goal-entering edges are reported separately (100 * tc)
    const [u, v] = k.split('->').map(Number);
    const du = dist.get(u), dv = dist.get(v);
    (dv < du ? cls.goalward : dv > du ? cls.away : cls.level).push(k);
  }
  const tc = (k) => Math.min(count.get(k) / 5, 1), integ = (k) => Math.min(episodesWith.get(k) / 5, 1);
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const byClass = (f) => Object.fromEntries(Object.entries(cls).map(([c, ks]) => [c, mean(ks.map(f))]));
  const n = episodes.length;
  const edgesSorted = [...g.directed].sort();
  return {
    episodes: n, meanNodes: n ? lenSum / n : null, transitions,
    directedEdgesCovered: edgesSorted.filter(k => count.get(k) > 0).length, directedEdgesAtLeast5: edgesSorted.filter(k => count.get(k) >= 5).length,
    directedEdgesTotal: g.directed.size, edgeCounts: edgesSorted.map(k => count.get(k)),
    gateMean: byClass(k => 0.10 + 0.90 * tc(k)),                // non-goal goal-gradient retention by edge class
    integrityMean: byClass(integ),
    classSizes: Object.fromEntries(Object.entries(cls).map(([c, ks]) => [c, ks.length])),
    goalEntry: { edges: entering.length, atLeast5: entering.filter(k => count.get(k) >= 5).length, tcMean: mean(entering.map(tc)), integrityMean: mean(entering.map(integ)) },
    goalwardShareOfTransitions: transitions ? cls.goalward.reduce((s, k) => s + count.get(k), 0) / transitions : null,
    endAtGoalFraction: n ? endAtGoal / n : null, containsGoalFraction: n ? containsGoal / n : null,
    simpleFraction: n ? simple / n : null, replayEligibleFraction: n ? eligible / n : null, qualityMean: n ? q / n : null,
    distinctStartNodes: startNodes.size,
  };
}

/** residual differences between a control store and the real store it is compared with */
export function residuals(control, real) {
  const tcOf = (arr) => arr.map(c => Math.min(c / 5, 1));
  const a = tcOf(control.edgeCounts), b = tcOf(real.edgeCounts);
  const d = (x, y) => (x === null || y === null ? null : x - y);
  return {
    episodeCount: control.episodes - real.episodes,
    meanNodes: d(control.meanNodes, real.meanNodes),
    transitions: control.transitions - real.transitions,
    simpleFractionDelta: d(control.simpleFraction, real.simpleFraction),
    directedEdgesCoveredDelta: control.directedEdgesCovered - real.directedEdgesCovered,
    directedEdgesAtLeast5Delta: control.directedEdgesAtLeast5 - real.directedEdgesAtLeast5,
    tcL1Mean: a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / a.length,
    gateMeanDelta: Object.fromEntries(['goalward', 'level', 'away'].map(c => [c, d(control.gateMean[c], real.gateMean[c])])),
    integrityMeanDelta: Object.fromEntries(['goalward', 'level', 'away'].map(c => [c, d(control.integrityMean[c], real.integrityMean[c])])),
    goalEntryTcMeanDelta: d(control.goalEntry.tcMean, real.goalEntry.tcMean),
    goalEntryAtLeast5Delta: control.goalEntry.atLeast5 - real.goalEntry.atLeast5,
    goalwardShareDelta: d(control.goalwardShareOfTransitions, real.goalwardShareOfTransitions),
    endAtGoalFractionDelta: d(control.endAtGoalFraction, real.endAtGoalFraction),
    replayEligibleFractionDelta: d(control.replayEligibleFraction, real.replayEligibleFraction),
  };
}

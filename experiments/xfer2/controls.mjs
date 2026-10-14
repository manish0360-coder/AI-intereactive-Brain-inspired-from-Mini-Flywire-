// ==========================================================
// XFER-2 — control episode stores (pure functions; no I/O, no clock, no ambient randomness)
// ==========================================================
// Every builder returns an array of episodes in exactly the representation the runtime persists (exportEpisodes):
//   { id, source, nodes, labels, transitions:[{from,to,position,terminal}], quality, coherence, unique, diversity,
//     timestamp, consolidationEligible }
// `graph` = { directed:Set('a->b'), neighbors:Map(node -> sorted [nodes]), nodes:[...] }, `labelOf` = node -> label.
// ==========================================================
import { COVER, NR_QUALITY, REAL_POOL } from './config.mjs';
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

/**
 * COVER: a goal-free, world-independent store of graph walks with balanced directed-edge usage.
 *   * `count` episodes; a fraction `simpleFraction` are simple paths (replay-eligible at quality >= .5), the rest are
 *     walks that revisit a node, as 21% of the real episodes do; lengths follow the pooled real histograms of each kind;
 *   * quality is the pooled real median of the kind (simple 0.8545, loop 0.6902);
 *   * each episode starts on the least-used directed edge and extends along least-used edges, so every directed edge
 *     reaches `minDirectedEdgeCount` (verified; the builder throws otherwise).
 * No goal is an input, no real episode is read, and the PRNG is seeded: the store is a pure function of the graph.
 */
export function coverStore(g, labelOf, { count = COVER.count, minCount = COVER.minDirectedEdgeCount, simpleFraction = COVER.simpleFraction, seed = COVER.seed, tag = 'cover', quality = null } = {}) {
  const rnd = prng(seed);
  const nSimple = Math.round(count * simpleFraction), nLoop = count - nSimple;
  const simpleLens = lengthsFrom(REAL_POOL.simpleLengthHistogram, nSimple, rnd), loopLens = lengthsFrom(REAL_POOL.loopLengthHistogram, nLoop, rnd);
  const slots = [...simpleLens.map(L => ({ L, simple: true })), ...loopLens.map(L => ({ L, simple: false }))];
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  const directedList = [...g.directed].sort().map(k => k.split('->').map(Number));
  const use = new Map([...g.directed].map(k => [k, 0]));
  const pickMin = (cands) => {
    let best = Infinity, tie = [];
    for (const c of cands) { const u = use.get(`${c[0]}->${c[1]}`); if (u < best) { best = u; tie = [c]; } else if (u === best) tie.push(c); }
    return tie[Math.floor(rnd() * tie.length)];
  };
  const episodes = [];
  slots.forEach(({ L, simple }, i) => {
    for (let attempt = 0; ; attempt++) {
      if (attempt > 500) throw new Error('coverStore: could not build a walk');
      const first = pickMin(directedList);
      const path = [first[0], first[1]];
      let ok = true;
      while (path.length < L) {
        const cur = path[path.length - 1];
        const last = path.length === L - 1;
        let options = (g.neighbors.get(cur) || []).map(v => [cur, v]);
        if (simple) options = options.filter(([, v]) => !path.includes(v));
        else if (last && new Set(path).size === path.length) options = options.filter(([, v]) => path.includes(v));   // force the revisit
        if (!options.length) { ok = false; break; }
        path.push(pickMin(options)[1]);
      }
      if (!ok || path.length !== L) continue;
      const isSimple = new Set(path).size === path.length;
      if (isSimple !== simple) continue;
      for (let k = 0; k < path.length - 1; k++) { const key = `${path[k]}->${path[k + 1]}`; use.set(key, use.get(key) + 1); }
      episodes.push(makeEpisode({ id: `${tag}_${i}`, nodes: path, labelOf, quality: quality !== null ? quality : (simple ? REAL_POOL.simpleQualityMedian : REAL_POOL.loopQualityMedian) }));
      return;
    }
  });
  const lowest = Math.min(...use.values());
  if (lowest < minCount) throw new Error(`coverStore: lowest directed-edge count ${lowest} < ${minCount}`);
  return episodes;
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
 *   count(u->v)   adjacency count (rebuildAdjacencyMemory), tc = min(count / 5, 1), gate = 0.10 + 0.90 tc
 *   integrity(u->v)  = min(episodes containing the directed pair / 5, 1)   (a pair-only context match is 1/3 >= 0.33, so
 *                      every episode that contains the pair counts once)
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
  const cls = { goalward: [], level: [], away: [] };
  for (const k of g.directed) {
    const [u, v] = k.split('->').map(Number);
    const du = dist.get(u), dv = dist.get(v);
    (dv < du ? cls.goalward : dv > du ? cls.away : cls.level).push(k);
  }
  const tc = (k) => Math.min(count.get(k) / 5, 1), integ = (k) => Math.min(episodesWith.get(k) / 5, 1);
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const byClass = (f) => Object.fromEntries(Object.entries(cls).map(([c, ks]) => [c, mean(ks.map(f))]));
  const n = episodes.length;
  const edgesSorted = [...g.directed].sort();
  const goalwardCount = cls.goalward.reduce((s, k) => s + count.get(k), 0);
  return {
    episodes: n, meanNodes: n ? lenSum / n : null, transitions,
    directedEdgesCovered: edgesSorted.filter(k => count.get(k) > 0).length, directedEdgesAtLeast5: edgesSorted.filter(k => count.get(k) >= 5).length,
    directedEdgesTotal: g.directed.size, edgeCounts: edgesSorted.map(k => count.get(k)),
    gateMean: byClass(k => 0.10 + 0.90 * tc(k)),                // mean goal-gradient retention by edge class
    integrityMean: byClass(integ),                              // mean trajectory-integrity strength by edge class
    classSizes: Object.fromEntries(Object.entries(cls).map(([c, ks]) => [c, ks.length])),
    goalwardShareOfTransitions: transitions ? goalwardCount / transitions : null,
    endAtGoalFraction: n ? endAtGoal / n : null, containsGoalFraction: n ? containsGoal / n : null,
    simpleFraction: n ? simple / n : null, replayEligibleFraction: n ? eligible / n : null, qualityMean: n ? q / n : null,
    distinctStartNodes: startNodes.size,
  };
}

/** residual differences between a control store and the real store it is compared with (scalar summary) */
export function residuals(control, real) {
  const tcOf = (arr) => arr.map(c => Math.min(c / 5, 1));
  const a = tcOf(control.edgeCounts), b = tcOf(real.edgeCounts);
  return {
    episodeCount: control.episodes - real.episodes,
    meanNodes: control.meanNodes - real.meanNodes,
    transitions: control.transitions - real.transitions,
    directedEdgesCoveredDelta: control.directedEdgesCovered - real.directedEdgesCovered,
    tcL1Mean: a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / a.length,
    gateMeanDelta: Object.fromEntries(['goalward', 'level', 'away'].map(c => [c, control.gateMean[c] - real.gateMean[c]])),
    integrityMeanDelta: Object.fromEntries(['goalward', 'level', 'away'].map(c => [c, control.integrityMean[c] - real.integrityMean[c]])),
    endAtGoalFractionDelta: control.endAtGoalFraction - real.endAtGoalFraction,
    replayEligibleFractionDelta: control.replayEligibleFraction - real.replayEligibleFraction,
  };
}

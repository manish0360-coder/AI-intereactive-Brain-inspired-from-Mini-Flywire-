// ==========================================================
// LEARN-0 — store provenance: can the delivered store carry graph knowledge the agent did not experience?  (pure; no I/O)
// ==========================================================
// Every relational entry of a T export (a pair u->w in rewards, penalties, signals, curiosity, confidence, transitions; the (pos, action)
// pair of a goal-keyed Q key "pos#goal->action"; every consecutive pair of a stored episode) must be a pair of T's OWN position sequence at
// lag 1 or 2, or a self pair of a visited node.  Lag 2 is the runtime's own lagged credit (main.js: `prev = agentLast`, `current = next`);
// lag 1 covers executed moves, goal credit over recentMemory and episode replay.  The position sequence is rebuilt from the arrival trace
// (every execution, legal or not; a respawn after a goal reset appears as a jump, which is also the agent's own experience).
// An entry outside that set is OFF_TRAJECTORY: knowledge the agent could not have gathered by moving, i.e. a possible indirect map read.
// The check says nothing about whether experienced structure is "a map": in a 20-node world T may traverse most of the graph (coverage).
// ==========================================================
export const PAIR_COMPONENTS = Object.freeze(['rewards', 'penalties', 'signals', 'curiosity', 'confidence']);
export const MAX_LAG = 2;

/** positions occupied, in order, from the arrival trace (self no-ops dropped; jumps kept) */
export function positionSequence(arrivals) {
  const seq = [];
  for (const x of arrivals) {
    if (x.a === null || x.a === undefined || x.to === null || x.to === undefined) continue;
    if (seq[seq.length - 1] !== x.a) seq.push(x.a);
    if (x.to !== x.a) seq.push(x.to);
  }
  return seq;
}

/** ordered pairs at lag 1..maxLag of a position sequence -> minimal lag */
export function trajectoryPairs(seq, maxLag = MAX_LAG) {
  const m = new Map();
  for (let i = 0; i < seq.length; i++) for (let k = 1; k <= maxLag && i + k < seq.length; k++) {
    if (seq[i] === seq[i + k]) continue;
    const key = `${seq[i]}->${seq[i + k]}`; if (!m.has(key) || m.get(key) > k) m.set(key, k);
  }
  return m;
}

/** every relational entry of an exported store: [{ component, u, w }] (u, w numbers) */
export function storeRelations(brain) {
  const out = [], pair = (k) => { const m = /^(\d+)->(\d+)$/.exec(String(k)); return m ? [Number(m[1]), Number(m[2])] : null; };
  for (const c of PAIR_COMPONENTS) for (const k of Object.keys(brain[c] || {})) { const p = pair(k); out.push(p ? { component: c, u: p[0], w: p[1] } : { component: c, bad: k }); }
  for (const [u, m] of Object.entries(brain.transitions || {})) for (const w of Object.keys(m || {})) out.push({ component: 'transitions', u: Number(u), w: Number(w) });
  for (const k of Object.keys(brain.Q || {})) { const m = /^(\d+)#(\d+)->(\d+)$/.exec(k); out.push(m ? { component: 'Q', u: Number(m[1]), w: Number(m[3]) } : { component: 'Q', bad: k }); }
  for (const ep of brain.episodes || []) { const n = ep.nodes || []; for (let i = 0; i + 1 < n.length; i++) out.push({ component: 'episodes', u: Number(n[i]), w: Number(n[i + 1]) }); }
  return out;
}

/** classify every relational entry; coverage says how much of the graph the experience could describe */
export function provenance(brain, arrivals, adj, { maxLag = MAX_LAG } = {}) {
  const seq = positionSequence(arrivals), lag = trajectoryPairs(seq, maxLag), visited = new Set(seq);
  const byComponent = {}, off = [];
  for (const r of storeRelations(brain)) {
    const cls = r.bad !== undefined ? 'UNPARSED' : r.u === r.w ? (visited.has(r.u) ? 'SELF' : 'OFF_TRAJECTORY') : lag.has(`${r.u}->${r.w}`) ? `LAG${lag.get(`${r.u}->${r.w}`)}` : 'OFF_TRAJECTORY';
    (byComponent[r.component] = byComponent[r.component] || {})[cls] = (byComponent[r.component][cls] || 0) + 1;
    if (cls === 'OFF_TRAJECTORY' || cls === 'UNPARSED') off.push(r.bad !== undefined ? `${r.component}:${r.bad}` : `${r.component}:${r.u}->${r.w}`);
  }
  const nodes = [...adj.keys()], directed = nodes.reduce((s, u) => s + adj.get(u).size, 0), ordered = nodes.length * (nodes.length - 1);
  const executedEdges = new Set(); for (let i = 0; i + 1 < seq.length; i++) if (adj.get(seq[i]) && adj.get(seq[i]).has(seq[i + 1])) executedEdges.add(`${seq[i]}->${seq[i + 1]}`);
  const coverage = { nodes: nodes.length, visited: visited.size, directedEdges: directed, executedDirectedEdges: executedEdges.size, orderedPairs: ordered, trajectoryPairs: lag.size,
    excludedOrderedPairs: ordered - lag.size };
  return { ok: off.length === 0, byComponent, offTrajectory: off.slice(0, 20), offCount: off.length, coverage, maxLag };
}

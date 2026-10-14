// ==========================================================
// XFER-2 — integrity checks (pure; each returns an array of problem strings, empty when sound)
// ==========================================================
import { NR_QUALITY, SAT, ENTRY_COUNT } from './config.mjs';
import { isEdge, replayEligible, storeStats } from './controls.mjs';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const simple = (e) => new Set(e.nodes).size === e.nodes.length;

/** representation: every episode is a valid graph walk in the persisted shape, with labels from the node map */
export function representationProblems(episodes, g, labelOf, { minLen = 3, maxLen = 6 } = {}) {
  const p = [];
  const ids = new Set();
  episodes.forEach((e, i) => {
    const w = `episode ${i}`;
    if (typeof e.id !== 'string' || ids.has(e.id)) p.push(`${w}: id missing or duplicated`);
    ids.add(e.id);
    if (e.source !== 'autonomous_success') p.push(`${w}: source ${e.source}`);
    if (!Array.isArray(e.nodes) || e.nodes.length < minLen || e.nodes.length > maxLen) p.push(`${w}: length ${e.nodes && e.nodes.length} outside ${minLen}..${maxLen}`);
    else {
      for (let k = 0; k < e.nodes.length - 1; k++) if (!isEdge(g, e.nodes[k], e.nodes[k + 1])) { p.push(`${w}: ${e.nodes[k]}->${e.nodes[k + 1]} is not a graph edge`); break; }
      if (!eq(e.labels, e.nodes.map(labelOf))) p.push(`${w}: labels do not follow the node map`);
      const tr = e.nodes.slice(0, -1).map((from, k) => ({ from, to: e.nodes[k + 1], position: k, terminal: k === e.nodes.length - 2 }));
      if (!eq(e.transitions, tr)) p.push(`${w}: transitions inconsistent with nodes`);
      const unique = new Set(e.nodes).size;
      if (e.unique !== unique || Math.abs(e.diversity - unique / e.nodes.length) > 1e-12) p.push(`${w}: unique/diversity inconsistent`);
    }
    if (typeof e.quality !== 'number') p.push(`${w}: quality missing`);
  });
  return p;
}

/** the saturated store: goal-free, every allowed directed edge >= 5, independent of any real store */
export function satProblems(sat, g, labelOf, { excludeInto = null, realStores = [] } = {}) {
  const p = representationProblems(sat, g, labelOf);
  if (sat.length !== SAT.count) p.push(`episode count ${sat.length} != ${SAT.count}`);
  const st = storeStats(sat, g, excludeInto === null ? 12 : excludeInto);
  const entering = excludeInto === null ? [] : (g.neighbors.get(excludeInto) || []).map(u => `${u}->${excludeInto}`);
  const allowedCount = g.directed.size - entering.length;
  if (st.directedEdgesAtLeast5 < allowedCount) p.push(`only ${st.directedEdgesAtLeast5} of ${allowedCount} allowed directed edges reach count >= 5`);
  if (excludeInto !== null) {
    if (sat.some(e => e.nodes.slice(0, -1).some((u, k) => e.nodes[k + 1] === excludeInto))) p.push('a goal-entering transition is present');
  } else {
    for (const goal of g.nodes) {
      const share = sat.filter(e => e.nodes[e.nodes.length - 1] === goal).length / sat.length;
      if (share > 0.15) p.push(`${(share * 100).toFixed(0)}% of episodes end at node ${goal}: not goal-free`);
    }
  }
  const key = (e) => e.nodes.join(',');
  const realKeys = new Set(realStores.flatMap(s => s.map(key)));
  const dup = sat.filter(e => realKeys.has(key(e))).length;
  if (realStores.length && dup / sat.length > 0.10) p.push(`${dup} saturated episodes duplicate a real path`);
  return p;
}

/** GEN_NR: the same count, per-episode lengths and kinds, and total transitions as the real store; goal-free; replay-off */
export function genProblems(gen, real, g, labelOf) {
  const p = representationProblems(gen, g, labelOf);
  if (gen.length !== real.length) return [...p, `count ${gen.length} != ${real.length}`];
  gen.forEach((e, i) => {
    if (e.nodes.length !== real[i].nodes.length) p.push(`episode ${i}: length ${e.nodes.length} != ${real[i].nodes.length}`);
    if (simple(e) !== simple(real[i])) p.push(`episode ${i}: kind (simple / loop-containing) differs from the real episode`);
    if (e.quality !== NR_QUALITY) p.push(`episode ${i}: quality ${e.quality} != ${NR_QUALITY}`);
    if (replayEligible(e, g)) p.push(`episode ${i}: replay-eligible`);
  });
  const sg = storeStats(gen, g, 12), sr = storeStats(real, g, 12);
  if (sg.transitions !== sr.transitions) p.push(`transitions ${sg.transitions} != ${sr.transitions}`);
  // no real path is reproduced wholesale
  const rk = new Set(real.map(e => e.nodes.join(','))), dup = gen.filter(e => rk.has(e.nodes.join(','))).length;
  if (real.length >= 10 && dup / real.length > 0.25) p.push(`${dup} generic episodes duplicate a real path`);
  return p.slice(0, 8);
}

/** ENTRY_NR: only goal-entering transitions, ENTRY_COUNT of each, replay-off */
export function entryProblems(entry, g, labelOf, goal) {
  const p = representationProblems(entry, g, labelOf, { minLen: 2, maxLen: 2 });
  const need = (g.neighbors.get(goal) || []).length * ENTRY_COUNT;
  if (entry.length !== need) p.push(`episode count ${entry.length} != ${need}`);
  for (const e of entry) {
    if (e.nodes.length !== 2 || e.nodes[1] !== goal) p.push(`episode ${e.id}: not a goal-entering pair`);
    if (e.quality !== NR_QUALITY) p.push(`episode ${e.id}: quality ${e.quality}`);
  }
  const st = storeStats(entry, g, goal);
  if (st.goalEntry.atLeast5 !== st.goalEntry.edges) p.push('not every goal-entering edge reaches count 5');
  if (st.directedEdgesCovered !== st.goalEntry.edges) p.push('a non-goal-entering edge is covered');
  return p.slice(0, 8);
}

/** REAL_NR: identical to the real store except quality (and id) */
export function noReplayProblems(nr, real, g) {
  const p = [];
  if (nr.length !== real.length) return [`length ${nr.length} != ${real.length}`];
  nr.forEach((e, i) => {
    if (!eq(e.nodes, real[i].nodes) || !eq(e.labels, real[i].labels) || !eq(e.transitions, real[i].transitions)) p.push(`episode ${i}: structure changed`);
    if (e.quality !== NR_QUALITY) p.push(`episode ${i}: quality ${e.quality} != ${NR_QUALITY}`);
    if (replayEligible(e, g)) p.push(`episode ${i}: still replay-eligible`);
  });
  return p.slice(0, 5);
}

/** REV_NR: every path reversed, nothing else of the structure changed, replay-ineligible */
export function reversedProblems(rev, real, g) {
  const p = [];
  if (rev.length !== real.length) return [`length ${rev.length} != ${real.length}`];
  rev.forEach((e, i) => {
    if (!eq(e.nodes, real[i].nodes.slice().reverse())) p.push(`episode ${i}: not the reversed path`);
    if (replayEligible(e, g)) p.push(`episode ${i}: replay-eligible`);
  });
  const count = (eps) => { const m = new Map(); for (const e of eps) for (let k = 0; k < e.nodes.length - 1; k++) { const key = `${e.nodes[k]}->${e.nodes[k + 1]}`; m.set(key, (m.get(key) || 0) + 1); } return m; };
  const cr = count(real), cv = count(rev);
  for (const [k, c] of cr) { const [u, v] = k.split('->'); if (cv.get(`${v}->${u}`) !== c) { p.push(`count of ${v}->${u} is ${cv.get(`${v}->${u}`)} not ${c}`); break; } }
  return p.slice(0, 5);
}

/** a delivered store must hash to the store the orchestrator expected, and start with every procedural store empty */
export function deliveryProblems(rec, expectedEpisodesHash, expectedCount) {
  const p = [];
  if (rec.brain.deliveredHashes === null && expectedEpisodesHash !== null) return ['no brain delivered'];
  if (expectedEpisodesHash === null) {
    if (rec.brain.deliveredHash !== 'none') p.push('cold arm received a brain');
    for (const [c, n] of Object.entries(rec.brain.start.sizes)) if (n !== 0) p.push(`cold arm started with ${c} = ${n}`);
    return p;
  }
  if (rec.brain.deliveredHashes.episodes !== expectedEpisodesHash) p.push('delivered episodes differ from the expected control store');
  if (rec.brain.start.hashes.episodes !== expectedEpisodesHash) p.push('restored episodes differ from the expected control store at the first agent call');
  if (rec.brain.start.sizes.episodes !== expectedCount) p.push(`episode count at the first call ${rec.brain.start.sizes.episodes} != ${expectedCount}`);
  for (const [c, n] of Object.entries(rec.brain.start.sizes)) if (c !== 'episodes' && n !== 0) p.push(`${c} not empty at the first call (${n})`);
  return p;
}

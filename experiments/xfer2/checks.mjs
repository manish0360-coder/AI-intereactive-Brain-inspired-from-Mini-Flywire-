// ==========================================================
// XFER-2 — integrity checks (pure; each returns an array of problem strings, empty when sound)
// ==========================================================
import { NR_QUALITY, COVER, REAL_POOL } from './config.mjs';
import { isEdge, replayEligible, storeStats } from './controls.mjs';

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** representation: every episode is a valid graph walk in the persisted shape, with labels from the node map */
export function representationProblems(episodes, g, labelOf) {
  const p = [];
  const ids = new Set();
  episodes.forEach((e, i) => {
    const w = `episode ${i}`;
    if (typeof e.id !== 'string' || ids.has(e.id)) p.push(`${w}: id missing or duplicated`);
    ids.add(e.id);
    if (e.source !== 'autonomous_success') p.push(`${w}: source ${e.source}`);
    if (!Array.isArray(e.nodes) || e.nodes.length < 3 || e.nodes.length > 6) p.push(`${w}: length ${e.nodes && e.nodes.length} outside 3..6`);
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

/** the COVER store: goal-free, saturated, matched in kind mix and independent of any real store */
export function coverProblems(cover, g, labelOf, realStores = []) {
  const p = representationProblems(cover, g, labelOf);
  if (cover.length !== COVER.count) p.push(`episode count ${cover.length} != ${COVER.count}`);
  const st = storeStats(cover, g, 12);
  if (st.directedEdgesAtLeast5 !== g.directed.size) p.push(`only ${st.directedEdgesAtLeast5} of ${g.directed.size} directed edges reach count >= 5`);
  const simple = cover.filter(e => new Set(e.nodes).size === e.nodes.length).length;
  if (Math.abs(simple - Math.round(COVER.count * COVER.simpleFraction)) > 1) p.push(`simple-path count ${simple} does not match the pooled real share`);
  if (cover.some(e => e.nodes.length < 3)) p.push('episode shorter than 3');
  // goal-freeness: for every possible goal the share of episodes ending there stays near chance (<= 15%)
  for (const goal of g.nodes) {
    const share = cover.filter(e => e.nodes[e.nodes.length - 1] === goal).length / cover.length;
    if (share > 0.15) p.push(`${(share * 100).toFixed(0)}% of episodes end at node ${goal}: not goal-free`);
  }
  // independence: no real episode is reproduced wholesale
  const key = (e) => e.nodes.join(',');
  const realKeys = new Set(realStores.flatMap(s => s.map(key)));
  const dup = cover.filter(e => realKeys.has(key(e))).length;
  if (realStores.length && dup / cover.length > 0.10) p.push(`${dup} cover episodes duplicate a real path`);
  return p;
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
  // directed counts of the reversal equal the reversed directed counts of the real store
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

export const REAL_POOL_NOTE = REAL_POOL;

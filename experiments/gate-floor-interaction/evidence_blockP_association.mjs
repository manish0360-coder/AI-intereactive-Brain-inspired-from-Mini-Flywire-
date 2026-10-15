// ==========================================================
// GATE-FLOOR-INTERACTION (design only) — what the PRESERVED block-P records say about where non-graph resets come from
// ==========================================================
//   node evidence_blockP_association.mjs --dir <extracted/original blockP directory> [--out <json>]
// OBSERVATIONAL and POST-HOC: it reads only preserved block-P records (no session is run, no outcome regenerated).  It cannot show a
// cause: worlds differ in their stores in many ways at once.  Its job is to separate what was OBSERVED from what is only
// HYPOTHESISED, and to give the design its mechanism-shaped questions:
//   * how many consecutive pairs of each world's REAL training store are non-graph, and how many of them end in the goal
//     (the stored "shortcut" a trained candidate can replay);
//   * of the non-graph goal resets a REAL / REAL_FLOOR session made, how many started from a node that the world's store lists as a
//     stored non-graph shortcut source;  for COLD / COLD_FLOOR (no store) the same overlap is the structural baseline;
//   * the per-world association (Spearman, bootstrap) between stored shortcut sources and the real-store legal-reach deficit.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../gate-floor-prodsem/config.mjs';
import { prng, mean } from '../xfer1/stats.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
if (!flag('--dir')) { console.error('--dir is required'); process.exit(2); }
const dir = path.resolve(flag('--dir'));
const edges = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const ADJ = new Set();
for (const e of edges) { const a = Number(e.from), b = Number(e.to); ADJ.add(a + '|' + b); ADJ.add(b + '|' + a); }
const isEdge = (a, b) => Number(a) !== Number(b) && ADJ.has(Number(a) + '|' + Number(b));
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
const read = (rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));

const rank = (xs) => { const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; } return r; };
const pearson = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null; };
const spearman = (x, y) => pearson(rank(x), rank(y));
function bootSpearman(x, y, { replicates, seed, level }) {
  const n = x.length, r = prng(seed), out = [];
  for (let b = 0; b < replicates; b++) { const idx = Array.from({ length: n }, () => Math.floor(r() * n)); const c = spearman(idx.map(i => x[i]), idx.map(i => y[i])); if (c !== null) out.push(c); }
  out.sort((a, b) => a - b); const lo = (1 - level) / 2, at = (q) => out[Math.min(out.length - 1, Math.max(0, Math.floor(q * out.length)))];
  return { rho: spearman(x, y), ci: { lower: at(lo), upper: at(1 - lo) } };
}

const rows = [];
for (const w of plan.validWorlds) {
  const goal = plan.worlds.find(x => x.world === w).goal;
  const store = read(`brains/own-real_w${w}.json`).episodes;
  let pairs = 0, nonGraphPairs = 0, terminalNonGraph = 0; const shortcutSources = new Set(), nonGraphSources = new Set();
  for (const ep of store) {
    const n = ep.nodes;
    for (let i = 0; i + 1 < n.length; i++) { if (n[i] === n[i + 1]) continue; pairs++; if (!isEdge(n[i], n[i + 1])) { nonGraphPairs++; nonGraphSources.add(Number(n[i])); if (Number(n[i + 1]) === Number(goal)) shortcutSources.add(Number(n[i])); } }
    if (n.length >= 2 && Number(n[n.length - 1]) === Number(goal) && !isEdge(n[n.length - 2], goal) && n[n.length - 2] !== goal) terminalNonGraph++;
  }
  const sess = (arm) => read(`sessions/gfp-${arm}-w${w}.json`);
  const rec = {};
  for (const arm of ['COLD', 'COLD_FLOOR', 'REAL', 'REAL_FLOOR']) {
    const r = sess(arm);
    const from = r.reaches.nonEdgeFrom || [];
    rec[arm] = { legal: r.reaches.legal, nonGraph: r.reaches.nonEdge, all: r.reaches.goal, fromInStoreSources: from.filter(u => shortcutSources.has(Number(u))).length, distinctFrom: new Set(from).size,
      topFromShare: from.length ? Math.max(...Object.values(from.reduce((m, u) => (m[u] = (m[u] || 0) + 1, m), {}))) / from.length : null };
  }
  rows.push({ world: w, goal, episodes: store.length, pairs, nonGraphPairs, terminalNonGraph, shortcutSources: shortcutSources.size, nonGraphSources: nonGraphSources.size, arms: rec });
}
const W = rows;
const sum = (f) => W.reduce((s, r) => s + f(r), 0);
const frac = (num, den) => (den > 0 ? num / den : null);
const out = {
  status: 'OBSERVATIONAL_POST_HOC_DESIGN_EVIDENCE', basis: 'preserved block-P records (plan.json, sessions/, brains/own-real_*)', worlds: W.length,
  store: { episodesPerWorld: mean(W.map(r => r.episodes)), nonGraphPairShare: frac(sum(r => r.nonGraphPairs), sum(r => r.pairs)), worldsWithAnyTerminalNonGraph: W.filter(r => r.terminalNonGraph > 0).length,
    terminalNonGraphEpisodesPerWorld: mean(W.map(r => r.terminalNonGraph)), distinctShortcutSourcesPerWorld: mean(W.map(r => r.shortcutSources)) },
  nonGraphResets: Object.fromEntries(['COLD', 'COLD_FLOOR', 'REAL', 'REAL_FLOOR'].map(a => [a, { perSession: mean(W.map(r => r.arms[a].nonGraph)),
    shareStartingAtAStoredShortcutSource: frac(sum(r => r.arms[a].fromInStoreSources), sum(r => r.arms[a].nonGraph)), distinctStartNodesPerSession: mean(W.map(r => r.arms[a].distinctFrom)),
    topStartNodeShare: mean(W.filter(r => r.arms[a].topFromShare !== null).map(r => r.arms[a].topFromShare)) }])),
  association: {},
};
const D = W.map(r => r.arms.REAL_FLOOR.legal - r.arms.COLD_FLOOR.legal), DN = W.map(r => r.arms.REAL_FLOOR.nonGraph - r.arms.COLD_FLOOR.nonGraph);
const DR = W.map(r => r.arms.REAL.nonGraph - r.arms.COLD.nonGraph), DRL = W.map(r => r.arms.REAL.legal - r.arms.COLD.legal);
for (const [name, x] of [['storedShortcutSources', W.map(r => r.shortcutSources)], ['terminalNonGraphEpisodes', W.map(r => r.terminalNonGraph)], ['nonGraphPairs', W.map(r => r.nonGraphPairs)], ['storeEpisodes', W.map(r => r.episodes)]]) {
  out.association[name] = {
    'legalDeficit(REAL_FLOOR-COLD_FLOOR)': bootSpearman(x, D, C.BOOTSTRAP), 'nonGraphChange(REAL_FLOOR-COLD_FLOOR)': bootSpearman(x, DN, C.BOOTSTRAP),
    'legalChange(REAL-COLD)': bootSpearman(x, DRL, C.BOOTSTRAP), 'nonGraphChange(REAL-COLD)': bootSpearman(x, DR, C.BOOTSTRAP) };
}
// dose-response in terciles of stored shortcut sources (descriptive)
const sorted = W.slice().sort((a, b) => a.shortcutSources - b.shortcutSources);
const tercile = (k) => sorted.slice(Math.floor(k * W.length / 3), Math.floor((k + 1) * W.length / 3));
out.terciles = [0, 1, 2].map(k => { const g = tercile(k); return { range: [g[0].shortcutSources, g[g.length - 1].shortcutSources], worlds: g.length, legalDeficitRealFloorMinusColdFloor: mean(g.map(r => r.arms.REAL_FLOOR.legal - r.arms.COLD_FLOOR.legal)),
  nonGraphChangeRealFloorMinusColdFloor: mean(g.map(r => r.arms.REAL_FLOOR.nonGraph - r.arms.COLD_FLOOR.nonGraph)) }; });
out.perWorld = W;
if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(out, null, 1));
const f = (x, d = 3) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
console.log(`store: ${f(out.store.episodesPerWorld, 1)} episodes/world; non-graph consecutive pairs ${f(100 * out.store.nonGraphPairShare, 1)}% of pairs; worlds with a terminal non-graph (jump-into-goal) episode ${out.store.worldsWithAnyTerminalNonGraph}/${W.length}; stored shortcut sources/world ${f(out.store.distinctShortcutSourcesPerWorld, 1)}`);
for (const [a, x] of Object.entries(out.nonGraphResets)) console.log(`  ${a.padEnd(11)} non-graph resets/session ${f(x.perSession, 1)}; start at a stored shortcut source ${f(100 * (x.shareStartingAtAStoredShortcutSource ?? NaN), 1)}%; distinct start nodes ${f(x.distinctStartNodesPerSession, 1)}; top start-node share ${f(x.topStartNodeShare)}`);
for (const [k, v] of Object.entries(out.association)) console.log(`  ${k.padEnd(26)} ` + Object.entries(v).map(([m, s]) => `${m} rho ${f(s.rho, 2)} [${f(s.ci.lower, 2)}, ${f(s.ci.upper, 2)}]`).join(' | '));
for (const t of out.terciles) console.log(`  tercile of stored shortcut sources ${t.range[0]}-${t.range[1]} (${t.worlds} worlds): legal deficit ${f(t.legalDeficitRealFloorMinusColdFloor, 1)}, non-graph change ${f(t.nonGraphChangeRealFloorMinusColdFloor, 1)}`);

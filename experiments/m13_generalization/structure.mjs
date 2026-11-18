// ==========================================================
// M13 — structural descriptors, the novelty check and each event's detour excess (STRUCTURE ONLY)
// ==========================================================
// Everything here reads the true graph and task E5's schedule (planE5, which also reads only the graph). No agent is
// built and no environment is stepped. It is the survey code of PROPOSAL.md, kept here as the frozen definition.
//
// Novelty check (SPEC.md, G0), against the development family = generateWorld's defaults on the development labels
// cf|dev|world|0 ... cf|dev|world|164 (as many as the bank):
//   (a) the bank's 5th-percentile clustering exceeds the development family's 95th percentile;
//   (b) every bank graph has cyclomatic number 13 and every development graph 7.
// Percentiles use the index floor(p * n) of the sorted values.
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, mfwWorld, distancesTo, edgeKey } from '../../cognitive/testbed/worlds.mjs';
import { planE5 } from '../../cognitive/testbed/task_e5.mjs';
import { buildWorld } from './worlds_modular.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DEV_REFERENCE = Object.freeze({ label: (i) => `cf|dev|world|${i}`, count: 165 });
export const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Detour excess of each scheduled event of one (world, family): shortest S-G distance with the block minus without. */
export function detourExcess(world, label, family) {
  const p = planE5(world, label, family), perm = new Set();
  return p.events.map((e) => {
    if (e.skipped) return null;
    const before = distancesTo(world, p.goal, perm)[p.start], after = distancesTo(world, p.goal, new Set([...perm, edgeKey(...e.edge)]))[p.start];
    if (!e.reverses) perm.add(edgeKey(...e.edge));
    return after - before;
  });
}

export function describe(world, label) {
  const n = world.n, m = world.edges.length;
  let diameter = 0; for (let s = 0; s < n; s++) diameter = Math.max(diameter, ...distancesTo(world, s));
  let cc = 0, ccN = 0;
  for (let u = 0; u < n; u++) {
    const nb = world.adj[u]; if (nb.length < 2) continue;
    let t = 0; for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) if (world.adj[nb[i]].includes(nb[j])) t++;
    cc += t / (nb.length * (nb.length - 1) / 2); ccN++;
  }
  let bridges = 0; for (const [u, v] of world.edges) if (distancesTo(world, u, new Set([edgeKey(u, v)]))[v] < 0) bridges++;
  const plan = planE5(world, label, 'OFTEN');
  const dS = distancesTo(world, plan.start), dG = distancesTo(world, plan.goal);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => dS[a] - dS[b]);
  const routes = new Array(n).fill(0); routes[plan.start] = 1;
  for (const u of order) for (const v of world.adj[u]) if (dS[v] === dS[u] + 1) routes[v] += routes[u];
  const excess = ['RARE', 'HALF', 'OFTEN'].flatMap((f) => detourExcess(world, label, f));
  return {
    n, m, cyclomatic: m - n + 1, diameter, clustering: cc / ccN, bridgeShare: bridges / m, startGoal: dG[plan.start], shortestRoutes: routes[plan.goal],
    excess: excess.filter((x) => x !== null), skipped: excess.filter((x) => x === null).length,
  };
}

export function summarise(items) {
  const ex = items.flatMap((x) => x.excess);
  const q = (k) => { const xs = items.map((x) => x[k]); return { mean: mean(xs), p05: quantile(xs, 0.05), p95: quantile(xs, 0.95) }; };
  return {
    labels: items.length, n: q('n'), m: q('m'), cyclomatic: q('cyclomatic'), diameter: q('diameter'), clustering: q('clustering'), bridgeShare: q('bridgeShare'),
    startGoal: q('startGoal'), shortestRoutes: q('shortestRoutes'), singleRouteShare: items.filter((x) => x.shortestRoutes === 1).length / items.length,
    detourExcess: { mean: mean(ex), zeroShare: ex.filter((x) => x === 0).length / ex.length, fourPlusShare: ex.filter((x) => x >= 4).length / ex.length, p95: quantile(ex, 0.95) },
    skippedEvents: items.reduce((s, x) => s + x.skipped, 0), events: ex.length + items.reduce((s, x) => s + x.skipped, 0),
  };
}

/** The novelty check on a list of [label, world] for the bank. Returns the record and whether it holds. */
export function noveltyCheck(bankWorlds) {
  const bank = bankWorlds.map(([label, w]) => describe(w, label));
  const dev = Array.from({ length: DEV_REFERENCE.count }, (_, i) => { const l = DEV_REFERENCE.label(i); return describe(generateWorld(l), l); });
  const bankP05 = quantile(bank.map((x) => x.clustering), 0.05), devP95 = quantile(dev.map((x) => x.clustering), 0.95);
  const clusteringSeparated = bankP05 > devP95;
  const cyclomaticAsDeclared = bank.every((x) => x.cyclomatic === 13) && dev.every((x) => x.cyclomatic === 7);
  return {
    rule: 'bank 5th-percentile clustering > development 95th percentile; cyclomatic number 13 in every bank graph and 7 in every development graph',
    bankClusteringP05: bankP05, devClusteringP95: devP95, clusteringSeparated, cyclomaticAsDeclared,
    holds: clusteringSeparated && cyclomaticAsDeclared,
    bank: summarise(bank), development: summarise(dev),
  };
}

/** The structural record frozen with the specification: the novelty check, and the app graph's descriptors beside it. */
export function structureRecord(bank) {
  const worlds = bank.graphs.map((g) => [g.label, buildWorld(g.label, g.n, g.edges)]);
  const app = mfwWorld(path.join(ROOT, 'connections.json'), 'm13|structure|app');
  const appItems = Array.from({ length: bank.count }, (_, i) => describe(app, `m13|structure|app|${i}`));
  return { note: 'structure only: graphs and planE5 schedules; no agent was built or run', novelty: noveltyCheck(worlds), appGraph: summarise(appItems) };
}

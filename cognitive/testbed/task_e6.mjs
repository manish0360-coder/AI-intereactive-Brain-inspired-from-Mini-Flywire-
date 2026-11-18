// ==========================================================
// M14 testbed — task E6: signposted worlds (relational abstraction across concrete worlds)
// ==========================================================
// A world from the existing generator (generateWorld, hidden relabelling unchanged) gets one start-goal pair whose
// shortest path is unique, and every node gets a KIND in 0..KINDS-1. The kinds carry a relation along that path:
// walking the route, the kind of each next node is relation[kind of the current node]. At every route node, exactly
// one exit leads to a node of kind relation[current kind]: the route exit (its "signpost"). Elsewhere kinds are
// free. So the relation tells the way, but only to an agent that has learned which kind follows which.
//
// An agent observes, besides { node, nActions, goal }, the kind of its node and the kinds of the nodes behind its
// exits, in action order: obs.kind and obs.exitKinds. Kinds name roles, not nodes: every world reuses the same few
// kinds on different nodes, and labels are relabelled per world, so nothing concrete carries from one world to the
// next. A relation between kinds can.
//
// Kind assignments:
//   signpostKinds  the canonical relation SIGMA (k -> k+1 mod 4), or its inverse, or a conjugate pi.SIGMA.pi^-1
//   randomKinds    no relation (negative control)
// The environment itself (env.mjs) is unchanged: SignpostEnv wraps it and adds the two observation fields. All edges
// keep reliability 1 (deterministic moves), so the only thing to learn about a new world is where things are.
// ==========================================================
import { distancesTo, edgeKey } from './worlds.mjs';
import { GraphEnv } from './env.mjs';
import { runEpisode } from './runner.mjs';
import { makeStream, randInt, shuffled } from './rng.mjs';

export const KINDS = 4;
export const SIGMA = Object.freeze([1, 2, 3, 0]);            // the canonical relation: kind k is followed by k + 1
export const SIGMA_INV = Object.freeze([3, 0, 1, 2]);        // the reversed relation
export const E6_OBS_KEYS = Object.freeze(['node', 'nActions', 'goal', 'kind', 'exitKinds']);

/** Number of shortest paths from every node to `goal`, and the hop distances (unweighted, all edges open). */
function shortestPathCounts(world, goal) {
  const d = distancesTo(world, goal);
  const order = Array.from({ length: world.n }, (_, i) => i).filter((i) => d[i] >= 0).sort((a, b) => d[a] - d[b]);
  const count = new Array(world.n).fill(0);
  count[goal] = 1;
  for (const u of order) if (u !== goal) count[u] = world.adj[u].filter((v) => d[v] === d[u] - 1).reduce((s, v) => s + count[v], 0);
  return { d, count };
}

/** The unique shortest route from start to goal, or null when it is not unique. */
export function uniqueRoute(world, start, goal) {
  const { d, count } = shortestPathCounts(world, goal);
  if (d[start] < 0 || count[start] !== 1) return null;
  const route = [start];
  let u = start;
  while (u !== goal) { u = world.adj[u].find((v) => d[v] === d[u] - 1); route.push(u); }
  return route;
}

/** A start-goal pair at exactly `distance` hops with a unique shortest route, drawn from the label's own stream. */
export function planRoute(world, label, distance) {
  const pairs = [];
  for (let g = 0; g < world.n; g++) {
    const { d, count } = shortestPathCounts(world, g);
    for (let s = 0; s < world.n; s++) if (d[s] === distance && count[s] === 1) pairs.push([s, g]);
  }
  if (!pairs.length) return null;
  const [start, goal] = pairs[randInt(pairs.length, makeStream(`${label}|route`))];
  return { start, goal, route: uniqueRoute(world, start, goal), candidates: pairs.length };
}

/**
 * Kinds that signpost `route` under `relation` (an array k -> next kind), starting from kind `phase`.
 * Route node i has kind relation^i(phase). Every other neighbour of a route node r_i (i < last) avoids the kind
 * relation[kind(r_i)], so the route exit is the only exit with that kind. Other nodes draw uniformly from what is
 * allowed. Because the route is the unique shortest path, an off-route node touches at most two consecutive route
 * nodes, so at least two kinds always remain allowed.
 */
export function signpostKinds(world, route, relation, phase, label) {
  const kinds = new Array(world.n).fill(-1);
  let k = phase;
  route.forEach((u) => { kinds[u] = k; k = relation[k]; });
  const onRoute = new Set(route);
  const forbidden = Array.from({ length: world.n }, () => new Set());
  route.forEach((u, i) => {
    if (i === route.length - 1) return;
    for (const v of world.adj[u]) if (v !== route[i + 1]) forbidden[v].add(relation[kinds[u]]);
  });
  const rnd = makeStream(`${label}|kinds`);
  for (let v = 0; v < world.n; v++) {
    if (onRoute.has(v)) { if (forbidden[v].has(kinds[v])) throw new Error(`route node ${v} would carry a misleading signpost`); continue; }
    const allowed = Array.from({ length: KINDS }, (_, j) => j).filter((j) => !forbidden[v].has(j));
    if (!allowed.length) throw new Error(`no kind is allowed for node ${v}`);
    kinds[v] = allowed[randInt(allowed.length, rnd)];
  }
  return Object.freeze(kinds);
}

/** Kinds with no relation: every node uniform over KINDS (the negative control). */
export function randomKinds(world, label) {
  const rnd = makeStream(`${label}|kinds`);
  return Object.freeze(Array.from({ length: world.n }, () => randInt(KINDS, rnd)));
}

/** Rename kinds by a permutation (kind j becomes perm[j]); a signposted world stays signposted, under pi.R.pi^-1. */
export function permuteKinds(kinds, perm) { return Object.freeze(kinds.map((k) => perm[k])); }
export function randomPermutation(label) { return Object.freeze(shuffled(Array.from({ length: KINDS }, (_, i) => i), makeStream(`${label}|perm`))); }
export function conjugate(relation, perm) {
  const out = new Array(KINDS);
  for (let k = 0; k < KINDS; k++) out[perm[k]] = perm[relation[k]];
  return Object.freeze(out);
}

/** Every route exit is the only exit of its node whose kind follows the node's kind under `relation`. */
export function checkSignposts(world, route, kinds, relation) {
  const problems = [];
  route.forEach((u, i) => {
    if (i === route.length - 1) return;
    if (kinds[route[i + 1]] !== relation[kinds[u]]) problems.push(`route step ${i} does not follow the relation`);
    const matching = world.exitOrder[u].filter((v) => kinds[v] === relation[kinds[u]]);
    if (matching.length !== 1 || matching[0] !== route[i + 1]) problems.push(`route node ${i} has ${matching.length} exits of the next kind`);
  });
  return problems;
}

/** The environment with the two kind fields added to every observation. Nothing else changes. */
export class SignpostEnv {
  #env; #world; #kinds;
  constructor(env, world, kinds) { this.#env = env; this.#world = world; this.#kinds = kinds; }
  #augment(obs) {
    const u = this.#world.nodeOfLabel.get(obs.node);
    return Object.freeze({ ...obs, kind: this.#kinds[u], exitKinds: Object.freeze(this.#world.exitOrder[u].map((v) => this.#kinds[v])) });
  }
  reset(opts) { return this.#augment(this.#env.reset(opts)); }
  step(action) { const r = this.#env.step(action); return { ...r, obs: this.#augment(r.obs) }; }
  trace() { return this.#env.trace(); }
}

/**
 * Run `episodes` cue-guided episodes from plan.start to plan.goal in one world, with the given kinds.
 * Returns per-episode { steps, done } and the node sequence of every episode (world ids; evaluation only).
 */
export function runWorld({ world, plan, kinds, agent, episodes, cap, envLabel }) {
  const env = new GraphEnv(world, { seedLabel: envLabel, maxSteps: cap });
  env.setRewardNode(plan.goal);
  env.setCue(plan.goal);
  const senv = new SignpostEnv(env, world, kinds);
  const out = [];
  for (let e = 0; e < episodes; e++) {
    const before = env.trace().length;
    const r = runEpisode(senv, agent, { start: plan.start, maxSteps: cap });
    const rows = env.trace().slice(before);
    out.push({ steps: r.steps, done: r.done, path: [plan.start, ...rows.filter((x) => x[4] !== x[2]).map((x) => x[4])] });
  }
  return out;
}

export { edgeKey };

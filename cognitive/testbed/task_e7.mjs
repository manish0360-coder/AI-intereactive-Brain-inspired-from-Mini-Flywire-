// ==========================================================
// M15 testbed — task E7: sequences of signposted worlds with stable, noisy, reversed and sparse relations
// ==========================================================
// Built on task E6, which is imported and not changed: the generator, the relabelling, unique routes, signposted kinds,
// SignpostEnv and runWorld. Every world here is a fresh generateWorld(label) with a unique 4-hop route.
//
// A label's sequence is 28 worlds: warm-up worlds 0..11, then evaluation worlds 12..27 (evaluation index e = 0..15).
// All four conditions share the graphs, routes, phases and noise positions; only the kinds differ:
//   STABLE    warm-up and evaluation signposted by SIGMA, exact
//   NOISY     warm-up exact; evaluation: every route step independently, with probability q = 0.25, goes to one of the
//             three kinds other than SIGMA(k), uniformly; the chain continues from the realised kind; where an off-route
//             neighbour can take it, one such neighbour receives SIGMA(k) as a decoy
//   REVERSED  warm-up exact; evaluation worlds e < s exactly STABLE's; from e = s on, SIGMA^-1, exact. s is drawn per
//             label uniformly from {2, ..., 10}
//   SPARSE    warm-up = world 11 only (one world); evaluation as STABLE
// The true next-kind distribution of a kind-k route step (theta*) is therefore exactly:
//   SIGMA phases: one-hot at SIGMA(k); NOISY evaluation: 1 - q at SIGMA(k), q/3 at each other kind; after the switch:
//   one-hot at SIGMA^-1(k). conditionSequence() gives it per world (theta); it is evaluation information and never
//   reaches an agent. The successor of the FIRST kind-k node of a route is an exact draw of theta*_k (the observation
//   unit, relation_belief/belief.mjs); the successor of the last one is not under NOISY.
// ==========================================================
import { generateWorld } from './worlds.mjs';
import { makeStream, randInt } from './rng.mjs';
import { KINDS, SIGMA, SIGMA_INV, planRoute, signpostKinds } from './task_e6.mjs';

export const E7 = Object.freeze({ warmup: 12, sparseWarmup: 1, evaluation: 16, distance: 4, cap: 200, q: 0.25, switchMin: 2, switchMax: 10, postWindow: 6 });
export const CONDITIONS = Object.freeze(['STABLE', 'NOISY', 'REVERSED', 'SPARSE']);

/**
 * Noisy signposting of `route` under `relation` from kind `phase`. Each route step draws twice from its own stream
 * (whether it is corrupted, and which other kind it takes), so positions are a pure function of the label.
 * Off-route neighbours of a route node avoid the kind of that node's actual successor; a corrupted step also gets one
 * decoy neighbour of kind relation[k] where such a neighbour is allowed to take it.
 */
export function noisySignpostKinds(world, route, relation, phase, q, label) {
  const rnd = makeStream(`${label}|noise`);
  const kinds = new Array(world.n).fill(-1);
  const corrupted = [];
  kinds[route[0]] = phase;
  for (let i = 0; i < route.length - 1; i++) {
    const k = kinds[route[i]], u = rnd(), pick = randInt(KINDS - 1, rnd);
    let next = relation[k];
    if (u < q) { next = Array.from({ length: KINDS }, (_, j) => j).filter((j) => j !== relation[k])[pick]; corrupted.push(i); }
    kinds[route[i + 1]] = next;
  }
  const onRoute = new Set(route);
  const forbidden = Array.from({ length: world.n }, () => new Set());
  route.forEach((u, i) => { if (i < route.length - 1) for (const v of world.adj[u]) if (v !== route[i + 1]) forbidden[v].add(kinds[route[i + 1]]); });
  const decoyRnd = makeStream(`${label}|decoy`);
  const decoys = [];
  for (const i of corrupted) {
    const want = relation[kinds[route[i]]];
    const cand = world.adj[route[i]].filter((v) => !onRoute.has(v) && kinds[v] < 0 && !forbidden[v].has(want));
    if (!cand.length) continue;
    const v = cand[randInt(cand.length, decoyRnd)];
    kinds[v] = want;
    decoys.push(v);
  }
  const rest = makeStream(`${label}|kinds`);
  for (let v = 0; v < world.n; v++) {
    if (kinds[v] >= 0) continue;
    const allowed = Array.from({ length: KINDS }, (_, j) => j).filter((j) => !forbidden[v].has(j));
    if (!allowed.length) throw new Error(`no kind is allowed for node ${v}`);
    kinds[v] = allowed[randInt(allowed.length, rest)];
  }
  return Object.freeze({ kinds: Object.freeze(kinds), corrupted: Object.freeze(corrupted), decoys: Object.freeze(decoys) });
}

/** The 28 worlds of a label with every kind assignment, and the switch point s; or { excluded } when a world has no route. */
export function planSequence(label) {
  const worlds = [];
  for (let t = 0; t < E7.warmup + E7.evaluation; t++) {
    const wl = `${label}|w|${t}`;
    const world = generateWorld(wl);
    const plan = planRoute(world, wl, E7.distance);
    if (!plan) return { label, excluded: `world ${t} has no unique ${E7.distance}-hop route` };
    const phase = randInt(KINDS, makeStream(`${wl}|phase`));
    const exact = signpostKinds(world, plan.route, SIGMA, phase, `${wl}|exact`);
    const noisy = noisySignpostKinds(world, plan.route, SIGMA, phase, E7.q, `${wl}|noisy`);
    const reversed = signpostKinds(world, plan.route, SIGMA_INV, phase, `${wl}|reversed`);
    worlds.push(Object.freeze({ t, label: wl, world, plan, phase, exact, noisy, reversed }));
  }
  const s = E7.switchMin + randInt(E7.switchMax - E7.switchMin + 1, makeStream(`${label}|switch`));
  return { label, excluded: null, worlds, s };
}

const onehot = (j) => Array.from({ length: KINDS }, (_, i) => (i === j ? 1 : 0));

/**
 * The worlds a condition runs, in order: { entry, kinds, stage: 'warmup' | 'eval', e, post, theta(k) }.
 * e is the evaluation index (null in warm-up); post is the 0-based post-switch index (REVERSED, e >= s), else null.
 */
export function conditionSequence(seq, cond) {
  if (!CONDITIONS.includes(cond)) throw new Error(`unknown condition ${cond}`);
  const out = [];
  const warm = cond === 'SPARSE' ? seq.worlds.slice(E7.warmup - E7.sparseWarmup, E7.warmup) : seq.worlds.slice(0, E7.warmup);
  for (const entry of warm) out.push({ entry, kinds: entry.exact, stage: 'warmup', e: null, post: null, theta: (k) => onehot(SIGMA[k]) });
  seq.worlds.slice(E7.warmup).forEach((entry, e) => {
    if (cond === 'NOISY') out.push({ entry, kinds: entry.noisy.kinds, stage: 'eval', e, post: null, theta: (k) => Array.from({ length: KINDS }, (_, j) => (j === SIGMA[k] ? 1 - E7.q : E7.q / (KINDS - 1))) });
    else if (cond === 'REVERSED' && e >= seq.s) out.push({ entry, kinds: entry.reversed, stage: 'eval', e, post: e - seq.s, theta: (k) => onehot(SIGMA_INV[k]) });
    else out.push({ entry, kinds: entry.exact, stage: 'eval', e, post: null, theta: (k) => onehot(SIGMA[k]) });
  });
  return out;
}

/** Visits of a world's route (node ids and their kinds), from start to goal: the passive reference process. */
export const routeVisits = (entry, kinds) => entry.plan.route.map((u) => ({ node: u, kind: kinds[u] }));

export { KINDS, SIGMA, SIGMA_INV };

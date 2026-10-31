// ==========================================================
// ACQ-1 — world description for the acquisition study (pure apart from reading the topology through ../worlds.mjs)
// ==========================================================
// A world is one accepted M7 configuration, used as TWO STATIC reliability environments: E1 (pPhase1 for the whole session) and
// E2 (pPhase2 for the whole session).  The swap machinery of the propagation study is not used.
// A SWITCH state is a decision state whose reliability-optimal action sets in E1 and E2 are robustly different:
//   A_k(s; t)  = union over the objectives ('attempts', 'discounted') of the near-optimal set of Q_kk at relative tolerance t
//   SWITCH(s)  iff A_1(s; 2 kappa) and A_2(s; 2 kappa) are disjoint
//   the outcome sets are A_1(s; kappa), A_2(s; kappa).
// Disjointness at 2 kappa implies disjointness at every smaller tolerance (near-optimal sets grow with the tolerance).
// ==========================================================
import { cases, nearOptimal, OBJECTIVES } from '../distal.mjs';
import { GRAPH } from '../worlds.mjs';
import { GAMMA, KAPPA } from '../config.mjs';

const union = (sets) => new Set(sets.flatMap(s => [...s]));
const disjoint = (A, B) => { for (const x of A) if (B.has(x)) return false; return true; };

export function switchStates(p1, p2, goal, { gamma = GAMMA, kappa = KAPPA } = {}) {
  const out = [];
  for (const s of GRAPH.nodes) {
    if (s === goal || GRAPH.adj.get(s).length < 2) continue;
    const c = OBJECTIVES.map(o => cases(GRAPH, s, p1, p2, goal, o, gamma));
    const A = (key, t) => union(c.map(x => nearOptimal(x[key], t)));
    if (!disjoint(A('Q11', 2 * kappa), A('Q22', 2 * kappa))) continue;
    out.push({ s, deg: GRAPH.adj.get(s).length, A1: [...A('Q11', kappa)].sort((a, b) => a - b), A2: [...A('Q22', kappa)].sort((a, b) => a - b) });
  }
  return out;
}

/** the p vector of an environment */
export const pOf = (world, env) => (env === 'E1' ? world.p1 : world.p2);

/** an ACQ-1 world from an accepted configuration */
export function describeAcq({ cfg, acceptedSeed, configIndex, stream }) {
  const sw = switchStates(cfg.pPhase1, cfg.pPhase2, cfg.goal);
  return { id: `acq1:${stream}:${configIndex}`, stream, index: configIndex, configSeed: acceptedSeed, goal: cfg.goal, p1: cfg.pPhase1, p2: cfg.pPhase2, sw };
}

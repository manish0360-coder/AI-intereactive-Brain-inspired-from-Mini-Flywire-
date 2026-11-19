// ==========================================================
// M15 mind — a probabilistic belief about each kind's next kind, with or without a change layer (pure; no imports)
// ==========================================================
// For a kind k, the belief is a predictive distribution p_k over the next kind y in {0, ..., K-1}. Each kind has its
// own belief; kinds are treated independently. Observations arrive one at a time (at most one per kind per world;
// observationsOfEpisode below). The rules (experiments/m15_uncertainty/PROPOSAL.md, revision 3.1, sections 2.3-2.5):
//
//   FREQ     Dirichlet(alpha) counts: p(y = j) = (alpha + n_j) / (K alpha + N)
//   NEWEST   one-hot on the last observation; uniform before any
//   WINDOW w Dirichlet(alpha) counts since the last reset. After each observation (counted first): when the last w
//            observations (of the whole stream) all equal a value u that is not the counts' unique most probable value,
//            the counts are reset to those w observations (u with count w)
//   BOCPD h  Adams & MacKay (2007), Algorithm 1, constant hazard h per observation, Dirichlet(alpha)-categorical model:
//              pi_r = (alpha + n_r[y]) / (A + r), A = K alpha
//              growth  P(r_t = r+1) ∝ P(r_{t-1} = r) pi_r (1 - h);  change  P(r_t = 0) ∝ sum_r P(r_{t-1} = r) pi_r h
//              normalise; run r+1 holds n_r + e_y, run 0 holds none; runs with posterior below 1e-12 are pruned
//              predictive p(y = j) = sum_r P(r_t = r) (alpha + n_r[j]) / (A + r)
//   FIXED    a given distribution per kind (the privileged ORACLE: theta*, set by the evaluator per world)
//
// freeze() ends updating: a frozen belief throws if asked to observe (FROZEN is FREQ frozen after the warm-up).
// The belief never sees anything but the observations passed to observe(); it has no access to the environment.
// ==========================================================

export const PRUNE = 1e-12;

const fill = (K, v) => new Array(K).fill(v);
export function uniqueMode(v) {
  const m = Math.max(...v);
  const at = [];
  for (let i = 0; i < v.length; i++) if (v[i] === m) at.push(i);
  return at.length === 1 ? at[0] : null;
}
const dirichletPredictive = (counts, alpha) => {
  const S = counts.reduce((a, b) => a + b, 0) + counts.length * alpha;
  return counts.map((x) => (x + alpha) / S);
};

/** One kind's belief under a rule. spec: { rule, alpha, h, w } as the rule needs. */
export function makeKindBelief(spec, K) {
  const { rule } = spec;
  let frozen = false, n = 0;
  const guard = () => { if (frozen) throw new Error('a frozen belief cannot observe'); };
  const check = (y) => { if (!Number.isInteger(y) || y < 0 || y >= K) throw new Error(`observation ${y} is not a kind`); };
  if (rule === 'FREQ') {
    const counts = fill(K, 0);
    return {
      rule, observe(y) { guard(); check(y); counts[y]++; n++; },
      predictive: () => dirichletPredictive(counts, spec.alpha),
      freeze() { frozen = true; }, isFrozen: () => frozen,
      snapshot: () => ({ rule, n, counts: [...counts], frozen }),
    };
  }
  if (rule === 'NEWEST') {
    let last = null;
    return {
      rule, observe(y) { guard(); check(y); last = y; n++; },
      predictive: () => (last === null ? fill(K, 1 / K) : Array.from({ length: K }, (_, j) => (j === last ? 1 : 0))),
      freeze() { frozen = true; }, isFrozen: () => frozen,
      snapshot: () => ({ rule, n, last, frozen }),
    };
  }
  if (rule === 'WINDOW') {
    const { w, alpha } = spec;
    if (!Number.isInteger(w) || w < 1) throw new Error('WINDOW needs an integer w >= 1');
    let counts = fill(K, 0), resets = 0;
    const recent = [];
    return {
      rule, observe(y) {
        guard(); check(y); n++;
        counts[y]++;
        recent.push(y); if (recent.length > w) recent.shift();
        if (recent.length === w && recent.every((x) => x === recent[0]) && uniqueMode(counts) !== recent[0]) { counts = fill(K, 0); counts[recent[0]] = w; resets++; }
      },
      predictive: () => dirichletPredictive(counts, alpha),
      freeze() { frozen = true; }, isFrozen: () => frozen,
      snapshot: () => ({ rule, w, n, counts: [...counts], recent: [...recent], resets, frozen }),
    };
  }
  if (rule === 'BOCPD') {
    const { h, alpha } = spec;
    if (!(h > 0 && h < 1)) throw new Error('BOCPD needs 0 < h < 1');
    const A = K * alpha;
    let runs = [{ r: 0, p: 1, counts: fill(K, 0) }];
    return {
      rule, observe(y) {
        guard(); check(y); n++;
        const pi = runs.map((s) => (alpha + s.counts[y]) / (A + s.r));
        const change = runs.reduce((t, s, i) => t + s.p * pi[i] * h, 0);
        const grown = runs.map((s, i) => ({ r: s.r + 1, p: s.p * pi[i] * (1 - h), counts: s.counts.map((v, j) => v + (j === y ? 1 : 0)) }));
        const next = [{ r: 0, p: change, counts: fill(K, 0) }, ...grown];
        const z = next.reduce((t, s) => t + s.p, 0);
        for (const s of next) s.p /= z;
        runs = next.filter((s) => s.p >= PRUNE);
      },
      predictive() {
        const p = fill(K, 0);
        for (const s of runs) for (let j = 0; j < K; j++) p[j] += s.p * (alpha + s.counts[j]) / (A + s.r);
        return p;
      },
      /** P(r_t <= 3): the change uncertainty (reported). */
      shortRun: () => runs.filter((s) => s.r <= 3).reduce((t, s) => t + s.p, 0),
      freeze() { frozen = true; }, isFrozen: () => frozen,
      snapshot: () => ({ rule, h, n, runs: runs.map((s) => ({ r: s.r, p: s.p, counts: [...s.counts] })), frozen }),
    };
  }
  throw new Error(`unknown belief rule ${rule}`);
}

/** A belief for every kind 0..K-1 under one rule. */
export function makeBeliefSet(spec, K) {
  if (spec.rule === 'FIXED') return makeFixedBeliefSet(K);
  const kinds = Array.from({ length: K }, () => makeKindBelief(spec, K));
  return {
    K, rule: spec.rule, spec: { ...spec }, learnable: true,
    predictive: (k) => kinds[k].predictive(),
    observe(k, y) { kinds[k].observe(y); },
    freeze() { for (const b of kinds) b.freeze(); },
    isFrozen: () => kinds.every((b) => b.isFrozen()),
    shortRun: (k) => (kinds[k].shortRun ? kinds[k].shortRun() : null),
    snapshot: () => ({ K, spec: { ...spec }, kinds: kinds.map((b) => b.snapshot()) }),
  };
}

/** The privileged reference: p_k = theta(k), set by the evaluator per world (setTheta). It never learns. */
export function makeFixedBeliefSet(K) {
  let theta = () => fill(K, 1 / K);
  return {
    K, rule: 'FIXED', spec: { rule: 'FIXED' }, learnable: false, privileged: true,
    setTheta(fn) { theta = fn; },
    predictive: (k) => [...theta(k)],
    observe() { throw new Error('a fixed belief cannot observe'); },
    freeze() {}, isFrozen: () => true, shortRun: () => null,
    snapshot: () => ({ K, spec: { rule: 'FIXED' }, table: Array.from({ length: K }, (_, k) => [...theta(k)]) }),
  };
}

/** Chronological loop erasure of a node sequence (the same procedure as M14's kind schema). */
export function loopErase(nodes) {
  const path = [];
  const at = new Map();
  for (const x of nodes) {
    if (at.has(x)) {
      const i = at.get(x);
      for (const y of path.splice(i + 1)) at.delete(y);
    } else { at.set(x, path.length); path.push(x); }
  }
  return path;
}

/**
 * The observation unit: from the places an episode stood on, in order and ending at the goal, erase loops; for each
 * kind k, the observation is the kind of the node after the FIRST kind-k node of the loop-erased path (the goal has no
 * successor). visits: [{ node, kind }]. Returns [[k, y], ...] in increasing k (at most one per kind).
 *
 * FIRST, not LAST as PROPOSAL revision 3.1 (section 2.1) wrote: whether a step is the first kind-k step depends only on
 * the steps before it, so on a route its successor is an exact draw of the transition distribution theta*_k. The last
 * occurrence depends on the steps after it, and under NOISY it under-samples corrupted steps (a corrupted step that
 * leads back to kind k stops being the last one): the stream's reliability would be 0.833, not 0.75. SPEC.md records
 * the deviation and its exact enumeration (spec_inputs/observation_unit.mjs).
 */
export function observationsOfEpisode(visits, K) {
  const kindOf = new Map(visits.map((v) => [v.node, v.kind]));
  const path = loopErase(visits.map((v) => v.node));
  const obs = new Array(K).fill(null);
  for (let i = 0; i + 1 < path.length; i++) { const k = kindOf.get(path[i]); if (obs[k] === null) obs[k] = kindOf.get(path[i + 1]); }
  const out = [];
  for (let k = 0; k < K; k++) if (obs[k] !== null) out.push([k, obs[k]]);
  return out;
}

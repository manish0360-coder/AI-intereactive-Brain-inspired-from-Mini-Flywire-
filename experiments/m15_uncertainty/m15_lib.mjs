// ==========================================================
// M15 — Calibrated Adaptive Belief Tracking and Change Detection: configuration, one label's run (EVALUATION code)
// ==========================================================
// PROPOSAL.md (revision 3.1) is the design; SPEC.md fixes it. One LABEL is a 28-world sequence of task E7
// (cognitive/testbed/task_e7.mjs) under four conditions (STABLE, NOISY, REVERSED, SPARSE). For each label this file
//   1. runs the CLOSED LOOP: every arm acts in every world of every condition, one episode per world, carrying its
//      belief from world to world (a fresh adopted agent per world: world model v6 cannot be carried between worlds,
//      since labels 1..24 recur with different nodes behind them);
//   2. builds the two observation STREAMS: the route stream (the environment's route steps, one observation per kind
//      per world, policy-free) and the yoked stream (CONCRETE's own closed-loop observations);
//   3. runs PASSIVE REPLAY: every inference mechanism absorbs the identical stream, and its belief is recorded at the
//      start of every evaluation world for every kind and scored exactly against theta* and against 64 probe outcomes
//      per kind drawn once from theta* (identical for every mechanism; never shown to any belief);
//   4. checks the validity conditions that can be checked within one label.
// Statistics, criteria and the reading rule are in m15_analysis.mjs.
// ==========================================================
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeStream } from '../../cognitive/testbed/rng.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../../cognitive/testbed/adopted_agent.mjs';
import { runWorld } from '../../cognitive/testbed/task_e6.mjs';
import { E7, CONDITIONS, KINDS, SIGMA_INV, planSequence, conditionSequence, routeVisits } from '../../cognitive/testbed/task_e7.mjs';
import { makeBeliefSet, makeFixedBeliefSet, uniqueMode, loopErase, observationsOfEpisode } from '../../cognitive/mind/relation_belief/belief.mjs';
import { makeBeliefAgent } from '../../cognitive/mind/relation_belief/agent.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const M15 = Object.freeze({
  alpha: 0.5,                 // Jeffreys prior (analytic, revision 2)
  h: 0.01,                    // DEVELOPMENT-SELECTED hazard (PROPOSAL section 2.5); h = 0.05 is the disclosed sensitivity arm
  probes: 64,                 // probe outcomes per kind per evaluation world
  windowGrid: Object.freeze([2, 3, 4]),
  logFloor: 1e-6,
  bins: 10,
  delayCensor: 7,             // detection delay when not detected within 6 post-switch observations
  delayWithin: 6,
  bootstrap: 10000,
});
export const SENSITIVITY = Object.freeze({
  UA_a1: Object.freeze({ rule: 'BOCPD', h: 0.01, alpha: 1 }),
  UA_h02: Object.freeze({ rule: 'BOCPD', h: 0.02, alpha: 0.5 }),
  UA_h05: Object.freeze({ rule: 'BOCPD', h: 0.05, alpha: 0.5 }),
  UA_h15: Object.freeze({ rule: 'BOCPD', h: 0.15, alpha: 0.5 }),
});
export const LABEL_OF = Object.freeze({
  dev: (i) => `m15unc|dev|${i}`,
  smoke: (i) => `m15unc|smoke|${i}`,
  m15: (i) => `m15unc|gate|${i}`,
});
export const BARRED_PREFIXES = Object.freeze(['cf|', 'mfw|', 'm13', 'm14schema|', 'm15unc|dev|', 'm15unc|smoke|', 'm15unc|test|', 'm15unc|unit|']);
export function assertFreshLabels(labels) {
  for (const l of labels) if (!/^m15unc\|gate\|\d+$/.test(l) || BARRED_PREFIXES.some((p) => l.startsWith(p))) throw new Error(`label ${l} is not in the fresh M15 namespace`);
}
/** Labels are always handled in NUMERIC order of their trailing index (M14's lesson). */
export const labelIndex = (l) => Number(l.slice(l.lastIndexOf('|') + 1));
export function assertNumericOrder(labels) {
  for (let i = 1; i < labels.length; i++) if (!(labelIndex(labels[i - 1]) < labelIndex(labels[i]))) throw new Error(`labels out of numeric order at ${labels[i]}`);
}

export const windowName = (w) => `WINDOW_w${w}`;
/** Passive-replay mechanisms, in report order. */
export function mechanisms(windows) {
  const a = M15.alpha;
  return Object.freeze([
    ['FREQ', { rule: 'FREQ', alpha: a }],
    ['FROZEN', { rule: 'FREQ', alpha: a, freezeAfterWarmup: true }],
    ['NEWEST', { rule: 'NEWEST' }],
    ...windows.map((w) => [windowName(w), { rule: 'WINDOW', w, alpha: a }]),
    ['UA', { rule: 'BOCPD', h: M15.h, alpha: a }],
    ...Object.entries(SENSITIVITY),
    ['ORACLE', { rule: 'FIXED' }],
  ]);
}
/** Closed-loop arms (CONCRETE has no belief: the adopted agent, AD-13, unchanged). ORACLE is privileged. */
export function closedArms(windows) {
  const a = M15.alpha;
  return Object.freeze([
    ['CONCRETE', null],
    ['FROZEN', { rule: 'FREQ', alpha: a, freezeAfterWarmup: true }],
    ['FREQ', { rule: 'FREQ', alpha: a }],
    ['NEWEST', { rule: 'NEWEST' }],
    ...windows.map((w) => [windowName(w), { rule: 'WINDOW', w, alpha: a }]),
    ['UA', { rule: 'BOCPD', h: M15.h, alpha: a }],
    ['ORACLE', { rule: 'FIXED' }],
  ]);
}
export const PRIVILEGED = Object.freeze(['ORACLE']);

export const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const newBelief = (spec) => (spec.rule === 'FIXED' ? makeFixedBeliefSet(KINDS) : makeBeliefSet(spec, KINDS));
const predictiveAll = (b) => Array.from({ length: KINDS }, (_, k) => b.predictive(k));

// ---- probes ----
/** 64 outcomes from theta for (label, condition, world t, kind k), stream `${label}|${cond}|probe|${t}|${k}`. */
export function drawProbes(label, cond, t, k, theta, P = M15.probes) {
  const rnd = makeStream(`${label}|${cond}|probe|${t}|${k}`);
  const out = new Array(P);
  for (let i = 0; i < P; i++) {
    let u = rnd(), j = 0;
    while (j < KINDS - 1 && u >= theta[j]) { u -= theta[j]; j++; }
    out[i] = j;
  }
  return out;
}
function probeCache(label, salt = '') {
  const m = new Map();
  return (cond, t, k, theta) => {
    const key = `${cond}|${t}|${k}`;
    if (!m.has(key)) m.set(key, Object.freeze(drawProbes(salt ? `${label}|${salt}` : label, cond, t, k, theta)));
    return m.get(key);
  };
}

// ---- scoring one belief point ----
/** The bin of a confidence c: b with b/10 <= c < (b+1)/10 for b = 0..8, and b = 9 for 0.9 <= c <= 1. */
export function binOf(c) {
  let b = Math.min(M15.bins - 1, Math.max(0, Math.floor(c * M15.bins)));
  if (b < M15.bins - 1 && c >= (b + 1) / M15.bins) b++;
  if (b > 0 && c < b / M15.bins) b--;
  return b;
}
/** Exact (against theta) and probe scores of a predictive p. */
export function scorePoint(p, theta, outcomes) {
  const K = p.length;
  const conf = Math.max(...p);
  const top = [];
  for (let j = 0; j < K; j++) if (p[j] === conf) top.push(j);
  let a = 0; for (const j of top) a += theta[j]; a /= top.length;
  const tv = uniqueMode(theta);
  if (tv === null) throw new Error('theta* has no unique most probable value');
  let brier = 0, log = 0;
  for (let y = 0; y < K; y++) {
    if (theta[y] === 0) continue;
    let s = 0; for (let j = 0; j < K; j++) s += (p[j] - (j === y ? 1 : 0)) ** 2;
    brier += theta[y] * s;
    log += -theta[y] * Math.log(Math.max(p[y], M15.logFloor));
  }
  const map = uniqueMode(p);
  let pBrier = 0, pLog = 0, pCorr = 0;
  for (const o of outcomes) {
    let s = 0; for (let j = 0; j < K; j++) s += (p[j] - (j === o ? 1 : 0)) ** 2;
    pBrier += s; pLog += -Math.log(Math.max(p[o], M15.logFloor));
    if (top.includes(o)) pCorr += 1 / top.length;
  }
  return { conf, a, pTrue: p[tv], brier, log, uniq: map !== null ? 1 : 0, fa: map !== null && map !== tv ? 1 : 0, pn: outcomes.length, pBrier, pLog, pCorr };
}
// sr / srn: the sum and count of P(r_t <= 3), the change uncertainty of a BOCPD belief (reported; PROPOSAL 2.4)
const SCALARS = Object.freeze(['n', 'brier', 'log', 'a', 'conf', 'pTrue', 'uniq', 'fa', 'pn', 'pBrier', 'pLog', 'pCorr', 'sr', 'srn']);
export const newAcc = () => ({ n: 0, brier: 0, log: 0, a: 0, conf: 0, pTrue: 0, uniq: 0, fa: 0, pn: 0, pBrier: 0, pLog: 0, pCorr: 0, sr: 0, srn: 0, binsE: new Array(30).fill(0), binsP: new Array(30).fill(0), binsC: new Array(30).fill(0) });
export function addPoint(acc, s, p, theta) {
  acc.n++;
  for (const f of SCALARS) if (f !== 'n') acc[f] += s[f] ?? 0;
  const b = binOf(s.conf);
  acc.binsE[3 * b] += 1; acc.binsE[3 * b + 1] += s.conf; acc.binsE[3 * b + 2] += s.a;
  acc.binsP[3 * b] += s.pn; acc.binsP[3 * b + 1] += s.pn * s.conf; acc.binsP[3 * b + 2] += s.pCorr;
  for (let j = 0; j < p.length; j++) { const c = binOf(p[j]); acc.binsC[3 * c] += 1; acc.binsC[3 * c + 1] += p[j]; acc.binsC[3 * c + 2] += theta[j]; }
}
export function mergeAcc(accs) {
  const m = newAcc();
  for (const x of accs) {
    if (!x) continue;
    for (const f of SCALARS) m[f] += x[f];
    for (const B of ['binsE', 'binsP', 'binsC']) for (let i = 0; i < 30; i++) m[B][i] += x[B][i];
  }
  return m;
}

/** Scope keys of a belief point (PROPOSAL section 5: per condition, and in REVERSED per phase). */
export function scopesOf(cond, e, post, postObs) {
  if (cond === 'STABLE') return ['STABLE'];
  if (cond === 'NOISY') return ['NOISY'];
  if (cond === 'SPARSE') return e <= 2 ? ['SPARSE', 'SPARSE_E0_2'] : ['SPARSE'];
  if (post === null) return ['REV_PRE'];
  const out = ['REV_POST'];
  if (postObs <= 1) out.push('REV_POST_1_2');
  else if (postObs <= 5) out.push('REV_POST_3_6');
  return out;
}
export const NO_CHANGE = Object.freeze(['STABLE', 'NOISY', 'SPARSE', 'REV_PRE']);
export const COND_SCOPES = Object.freeze({ STABLE: ['STABLE'], NOISY: ['NOISY'], SPARSE: ['SPARSE'], REVERSED: ['REV_PRE', 'REV_POST'] });

// ---- observations from a path (evaluator side, world node ids) ----
/** The observation unit applied to a node path: per kind, the step after the FIRST kind-k node of the loop-erased path. */
export function stepsOfPath(nodes, kinds) {
  const path = loopErase(nodes);
  const at = new Array(KINDS).fill(null);
  for (let i = 0; i + 1 < path.length; i++) if (at[kinds[path[i]]] === null) at[kinds[path[i]]] = [kinds[path[i]], kinds[path[i + 1]], path[i], path[i + 1]];
  return at.filter(Boolean);
}
const onRoute = (route, u, v) => { for (let i = 0; i + 1 < route.length; i++) if (route[i] === u && route[i + 1] === v) return true; return false; };

// ---- passive replay ----
/**
 * One mechanism absorbs one stream (stream[i] = [[k, y], ...] for the i-th world of the condition sequence C).
 * Records the belief at every evaluation-world start, for every kind, and scores it; tracks detection in REVERSED.
 */
export function replay(label, cond, C, spec, stream, probes, { keepPoints = false } = {}) {
  const b = newBelief(spec);
  const acc = {};
  const points = [];
  const startHashes = [];
  const postCount = new Array(KINDS).fill(0);
  const delay = new Array(KINDS).fill(null), delayWorlds = new Array(KINDS).fill(null);
  let frozenAt = null, postWorlds = 0;
  const mapIsNew = (k) => uniqueMode(b.predictive(k)) === SIGMA_INV[k];
  for (let i = 0; i < C.length; i++) {
    const W = C[i];
    if (spec.rule === 'FIXED') b.setTheta(W.theta);
    if (W.stage === 'eval' && spec.freezeAfterWarmup && !b.isFrozen()) { b.freeze(); frozenAt = sha(b.snapshot()); }
    if (W.stage === 'eval') {
      const P = predictiveAll(b);
      startHashes.push(sha(P));
      for (let k = 0; k < KINDS; k++) {
        const theta = W.theta(k);
        const postObs = W.post === null ? null : postCount[k];
        const s = scorePoint(P[k], theta, probes(cond, W.entry.t, k, theta));
        const sr = b.shortRun(k);
        if (sr !== null) { s.sr = sr; s.srn = 1; }
        for (const sc of scopesOf(cond, W.e, W.post, postObs)) addPoint(acc[sc] || (acc[sc] = newAcc()), s, P[k], theta);
        if (keepPoints && NO_CHANGE.includes(scopesOf(cond, W.e, W.post, postObs)[0])) points.push([s.conf, s.a, s.pCorr, s.pn]);
      }
      if (W.post !== null) {
        for (let k = 0; k < KINDS; k++) {
          if (delay[k] === null && postCount[k] === 0 && mapIsNew(k)) delay[k] = 0;
          if (delayWorlds[k] === null && postWorlds <= M15.delayWithin && mapIsNew(k)) delayWorlds[k] = postWorlds;
        }
      }
    }
    for (const [k, y] of stream[i]) {
      if (b.learnable && !b.isFrozen()) b.observe(k, y);
      if (W.post !== null) {
        postCount[k]++;
        if (delay[k] === null && postCount[k] <= M15.delayWithin && mapIsNew(k)) delay[k] = postCount[k];
      }
    }
    if (W.post !== null) postWorlds++;
  }
  if (cond === 'REVERSED') {
    for (let k = 0; k < KINDS; k++) if (delayWorlds[k] === null && postWorlds <= M15.delayWithin && mapIsNew(k)) delayWorlds[k] = postWorlds;
  }
  const out = { acc, startHashes, frozenUnchanged: frozenAt === null ? null : frozenAt === sha(b.snapshot()) };
  if (cond === 'REVERSED') {
    out.delay = delay.map((d) => (d === null ? M15.delayCensor : d));
    out.delayWorlds = delayWorlds.map((d) => (d === null ? M15.delayCensor : d));
    out.postObs = [...postCount];
  }
  if (keepPoints) out.points = points;
  return out;
}

// ---- closed loop ----
export function runClosed(seq, cond, spec) {
  const C = conditionSequence(seq, cond);
  const b = spec ? newBelief(spec) : null;
  let frozenAt = null;
  const worlds = [];
  for (const W of C) {
    if (b && spec.rule === 'FIXED') b.setTheta(W.theta);
    if (b && spec.freezeAfterWarmup && W.stage === 'eval' && !b.isFrozen()) { b.freeze(); frozenAt = sha(b.snapshot()); }
    const rngLabel = `${seq.label}|agent|${W.entry.t}`;
    const startP = b ? predictiveAll(b) : null;
    const learn = !!b && b.learnable && !b.isFrozen();
    const agent = b ? makeBeliefAgent({ rng: makeStream(rngLabel), params: { ...ADOPTED_AGENT.params }, belief: b, learn }) : makeAdoptedAgent(null, rngLabel);
    const [r] = runWorld({ world: W.entry.world, plan: W.entry.plan, kinds: W.kinds, agent, episodes: 1, cap: E7.cap, envLabel: `${W.entry.label}|env` });
    const steps = r.done ? stepsOfPath(r.path, W.kinds) : [];
    const obs = steps.map(([k, y]) => [k, y]);
    if (b) {
      const got = JSON.stringify(agent.absorbed()), want = JSON.stringify(learn ? obs : []);
      if (got !== want) throw new Error(`${seq.label} ${cond} world ${W.entry.t}: the agent absorbed ${got}, the path gives ${want}`);
    }
    worlds.push({ t: W.entry.t, stage: W.stage, e: W.e, post: W.post, steps: r.steps, done: r.done, path: r.path, obs, routeSteps: steps.filter((x) => onRoute(W.entry.plan.route, x[2], x[3])).length, startP, theta: W.theta });
  }
  return { worlds, frozenUnchanged: frozenAt === null ? null : frozenAt === sha(b.snapshot()), C };
}

/** The route stream of a condition: per world, the observation unit applied to the route (policy-free). */
export const routeStream = (C) => C.map((W) => observationsOfEpisode(routeVisits(W.entry, W.kinds), KINDS));

// ---- one label ----
/**
 * Everything for one label. windows: the WINDOW sizes to run (development: the grid; gate: [w*]).
 * Returns the in-memory record (with passive points for AUROC and equal-mass binning) or { excluded }.
 */
export function runLabel(label, { windows }) {
  const seq = planSequence(label);
  if (seq.excluded) return { label, excluded: seq.excluded };
  const mechs = mechanisms(windows), arms = closedArms(windows);
  const probes = probeCache(label);
  const C = Object.fromEntries(CONDITIONS.map((c) => [c, conditionSequence(seq, c)]));

  // 1. closed loop
  const closed = {};
  for (const c of CONDITIONS) { closed[c] = {}; for (const [arm, spec] of arms) closed[c][arm] = runClosed(seq, c, spec); }

  // 2. streams
  const streams = {
    route: Object.fromEntries(CONDITIONS.map((c) => [c, routeStream(C[c])])),
    yoked: Object.fromEntries(CONDITIONS.map((c) => [c, closed[c].CONCRETE.worlds.map((w) => w.obs)])),
  };

  // 3. passive replay
  const passive = {};
  for (const st of ['route', 'yoked']) {
    passive[st] = {};
    for (const [m, spec] of mechs) {
      const per = {};
      for (const c of CONDITIONS) per[c] = replay(label, c, C[c], spec, streams[st][c], probes, { keepPoints: st === 'route' });
      passive[st][m] = {
        acc: Object.assign({}, ...CONDITIONS.map((c) => per[c].acc)),
        points: st === 'route' ? CONDITIONS.flatMap((c) => per[c].points) : undefined,
        delay: per.REVERSED.delay, delayWorlds: per.REVERSED.delayWorlds, postObs: per.REVERSED.postObs,
        startHashes: Object.fromEntries(CONDITIONS.map((c) => [c, per[c].startHashes])),
        frozenUnchanged: CONDITIONS.map((c) => per[c].frozenUnchanged).filter((x) => x !== null),
      };
    }
  }

  // 4. closed-loop diagnostics: world-start beliefs probed as in passive replay; on-policy prequential scores
  const closedDiag = {};
  for (const [arm, spec] of arms) {
    if (!spec) continue;
    const acc = {}, preq = {};
    for (const c of CONDITIONS) {
      const postCount = new Array(KINDS).fill(0);
      for (const w of closed[c][arm].worlds) {
        if (w.stage !== 'eval') continue;
        const counts = [...postCount];
        for (let k = 0; k < KINDS; k++) {
          const theta = w.theta(k);
          const s = scorePoint(w.startP[k], theta, probes(c, w.t, k, theta));
          for (const sc of scopesOf(c, w.e, w.post, w.post === null ? null : counts[k])) addPoint(acc[sc] || (acc[sc] = newAcc()), s, w.startP[k], theta);
        }
        for (const [k, y] of w.obs) {
          const sc = scopesOf(c, w.e, w.post, w.post === null ? null : counts[k])[0];
          const q = preq[sc] || (preq[sc] = { n: 0, log: 0, brier: 0, hit: 0 });
          const p = w.startP[k];
          q.n++; q.log += -Math.log(Math.max(p[y], M15.logFloor));
          let s = 0; for (let j = 0; j < KINDS; j++) s += (p[j] - (j === y ? 1 : 0)) ** 2;
          q.brier += s;
          const top = Math.max(...p), T = p.map((x, j) => (x === top ? j : -1)).filter((j) => j >= 0);
          if (T.includes(y)) q.hit += 1 / T.length;
          if (w.post !== null) postCount[k]++;
        }
      }
    }
    closedDiag[arm] = { acc, preq };
  }

  // 5. validity within the label
  const runKey = (w) => JSON.stringify([w.steps, w.done, w.path, w.obs]);
  const nonOracle = mechs.filter(([m]) => !PRIVILEGED.includes(m)).map(([m]) => m);
  const s = seq.s;
  const sameRoutePre = JSON.stringify(streams.route.STABLE.slice(0, E7.warmup + s)) === JSON.stringify(streams.route.REVERSED.slice(0, E7.warmup + s));
  const sameYokedPre = JSON.stringify(streams.yoked.STABLE.slice(0, E7.warmup + s)) === JSON.stringify(streams.yoked.REVERSED.slice(0, E7.warmup + s));
  const vrevPassive = sameRoutePre && sameYokedPre && ['route', 'yoked'].every((st) => nonOracle.every((m) => JSON.stringify(passive[st][m].startHashes.STABLE.slice(0, s + 1)) === JSON.stringify(passive[st][m].startHashes.REVERSED.slice(0, s + 1))));
  const vrevClosed = arms.every(([arm]) => {
    const a = closed.STABLE[arm].worlds, r = closed.REVERSED[arm].worlds;
    for (let i = 0; i < E7.warmup + s; i++) if (runKey(a[i]) !== runKey(r[i])) return false;
    if (PRIVILEGED.includes(arm) || !a[E7.warmup + s].startP) return true;
    return JSON.stringify(a[E7.warmup + s].startP) === JSON.stringify(r[E7.warmup + s].startP);
  });
  const byT = new Map();
  let concretePassive = true;
  for (const c of CONDITIONS) for (const w of closed[c].CONCRETE.worlds) {
    const k = JSON.stringify([w.steps, w.done, w.path]);
    if (byT.has(w.t) && byT.get(w.t) !== k) concretePassive = false;
    byT.set(w.t, k);
  }
  const identityWorld0 = CONDITIONS.every((c) => arms.every(([arm, spec]) => !spec || PRIVILEGED.includes(arm) || JSON.stringify([closed[c][arm].worlds[0].steps, closed[c][arm].worlds[0].path]) === JSON.stringify([closed[c].CONCRETE.worlds[0].steps, closed[c].CONCRETE.worlds[0].path])));
  const frozenUnchanged = ['route', 'yoked'].every((st) => passive[st].FROZEN.frozenUnchanged.every(Boolean)) && CONDITIONS.every((c) => closed[c].FROZEN.frozenUnchanged === true);
  // probe isolation: the same replay with different probe outcomes gives identical beliefs
  const salted = probeCache(label, 'isolation-check');
  const probeIsolation = CONDITIONS.every((c) => ['UA', 'NEWEST', 'FREQ'].every((m) => {
    const spec = mechs.find(([x]) => x === m)[1];
    return JSON.stringify(replay(label, c, C[c], spec, streams.route[c], salted).startHashes) === JSON.stringify(passive.route[m].startHashes[c]);
  }));

  // compact: the belief hashes served the checks above; points become one flat array [conf, a, pCorr, pn, ...]
  for (const st of ['route', 'yoked']) for (const m of Object.keys(passive[st])) {
    delete passive[st][m].startHashes;
    if (passive[st][m].points) passive[st][m].points = Float64Array.from(passive[st][m].points.flat());
  }
  return {
    label, excluded: null, s,
    closed: Object.fromEntries(CONDITIONS.map((c) => [c, Object.fromEntries(arms.map(([arm]) => [arm, closed[c][arm].worlds.map((w) => ({ t: w.t, e: w.e, post: w.post, steps: w.steps, done: w.done, nObs: w.obs.length, routeSteps: w.routeSteps, obs: w.obs }))]))])),
    streamsHash: sha(streams),
    passive, closedDiag,
    checks: { vrevPassive, vrevClosed, concretePassive, identityWorld0, frozenUnchanged, probeIsolation, absorbedMatches: true },
  };
}

/** The saved form of a label: closed-loop rows and checks (passive data are recomputed by anyone from the label). */
export function savedRow(L) {
  if (L.excluded) return { label: L.label, excluded: L.excluded };
  return { label: L.label, s: L.s, streamsHash: L.streamsHash, checks: L.checks, closed: Object.fromEntries(Object.entries(L.closed).map(([c, arms]) => [c, Object.fromEntries(Object.entries(arms).map(([a, ws]) => [a, { steps: ws.map((w) => w.steps), capped: ws.filter((w) => !w.done).map((w) => w.t), nObs: ws.map((w) => w.nObs), routeSteps: ws.map((w) => w.routeSteps) }]))])) };
}

export { E7, CONDITIONS, KINDS, ADOPTED_AGENT };

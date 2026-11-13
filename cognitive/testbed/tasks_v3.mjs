// ==========================================================
// CF-03c testbed — task E1F: latent learning under a named family of hidden edge reliabilities, with forecasters
// scored side by side on the same events
// ==========================================================
// E1F is E1S (the E1 layout and phases, arm EXPLORED) with the reliability of every edge drawn from a named family
// instead of U[0.5, 1].  One agent acts.  Every forecaster in FORECASTERS is fed exactly the transitions that agent
// experiences and, BEFORE each one, is asked for P(move) for the attempted (state, action) pair.  All forecasters
// are therefore scored on identical events, so a difference between two of them is not a difference in behaviour.
//
// Scored event 1, "move": did the attempt change the node?  Scored on EVERY attempt, including the first attempt of
// a pair (CF-03b scored only pairs that had already moved).
// Scored event 2, "modal": did the attempt arrive at the forecaster's most probable known destination?  Scored only
// when the forecaster has a known destination; this is the CF-03b statistic, kept for continuity.
//
// Scores are accumulated per scope: all | explore | test (phase) | untried | tried (the pair's count before the
// attempt).  Each accumulator holds n, the Brier sum, the log-loss sum and 10 equal-width bins (n, sum of
// predictions, hits).  Predictions outside [0, 1] are counted as invalid and clamped for scoring.
//
// Families (u ~ U[0, 1] per edge, in the world's sorted edge order, stream `${world}|E1F|${family}|rel`):
//   U5       0.5 + 0.5 u            the development family (the E1S distribution)
//   WIDE     0.1 + 0.9 u            much wider; many poor edges
//   BIMODAL  0.95 or 0.55           two populations of edges, equal shares (pairs are not exchangeable draws of one Beta)
//   ARCSINE  0.2 + 0.8 sin^2(pi u / 2)   mass piled at both ends
//   HIGH     0.9 + 0.1 u            nearly reliable
// Seeds: environment `${world}|E1F|${family}|env`, agent `${world}|E1F|${family}|agent`; the layout is E1's.
// ==========================================================
import { GraphEnv } from './env.mjs';
import { makeStream } from './rng.mjs';
import { layout, TASK_PARAMS } from './tasks.mjs';
import { runEpisode, runSteps } from './runner.mjs';
import { makeAgentForV3 } from './registry_v3.mjs';
import { makeWorldModel } from '../core/world_model.mjs';
import { makeWorldModel2 } from '../mind/world_model.mjs';
import { makeWorldModel3 } from '../mind/v3/world_model.mjs';

export const FAMILIES = Object.freeze({
  U5: (u) => 0.5 + 0.5 * u,
  WIDE: (u) => 0.1 + 0.9 * u,
  BIMODAL: (u) => (u < 0.5 ? 0.95 : 0.55),
  ARCSINE: (u) => 0.2 + 0.8 * Math.sin(Math.PI * u / 2) ** 2,
  HIGH: (u) => 0.9 + 0.1 * u,
});
export const DEV_FAMILY = 'U5';
export const UNSEEN_FAMILIES = Object.freeze(['WIDE', 'BIMODAL', 'ARCSINE', 'HIGH']);

export function familyReliabilities(world, worldLabel, family) {
  const f = FAMILIES[family];
  if (!f) throw new Error(`unknown family ${family}`);
  const rnd = makeStream(`${worldLabel}|E1F|${family}|rel`);
  return world.edges.map(([u, v]) => [u, v, f(rnd())]);
}

const modelForecaster = (m) => ({
  pMove: (s, a) => 1 - m.predict(s, a).self,
  modal: (s, a) => { const o = m.predict(s, a).outcomes; return o.length ? o.reduce((b, x) => (x[1] > b[1] ? x : b)) : null; },
  update: (s, a, s2, r, d) => m.update(s, a, s2, r, d),
});
function laplaceForecaster() {                 // per pair, no sharing: (moves + 1) / (attempts + 2)
  const c = new Map();
  return {
    pMove: (s, a) => { const q = c.get(`${s}|${a}`); return q ? (q.m + 1) / (q.n + 2) : 0.5; },
    modal: () => null,
    update: (s, a, s2) => { const k = `${s}|${a}`; const q = c.get(k) ?? { n: 0, m: 0 }; q.n++; if (s2 !== s) q.m++; c.set(k, q); },
  };
}
function constantForecaster() {                // one number for every pair: the running overall move rate
  let n = 0, m = 0;
  return { pMove: () => (m + 0.5) / (n + 1), modal: () => null, update: (s, a, s2) => { n++; if (s2 !== s) m++; } };
}
export const FORECASTERS = Object.freeze({
  V3: () => modelForecaster(makeWorldModel3()),
  V3_NOPOOL_MOVE: () => modelForecaster(makeWorldModel3({ poolMove: false })),
  V3_NOPOOL_DEST: () => modelForecaster(makeWorldModel3({ poolDest: false })),
  V2: () => modelForecaster(makeWorldModel2()),
  V1: () => modelForecaster(makeWorldModel()),
  LAPLACE: laplaceForecaster,
  CONST: constantForecaster,
});

export const newAccumulator = () => ({ n: 0, brier: 0, logLoss: 0, bins: Array.from({ length: 10 }, () => ({ n: 0, pred: 0, hit: 0 })) });
export function score(acc, p, y) {
  const q = Math.min(1 - 1e-6, Math.max(1e-6, p));
  acc.n++; acc.brier += (q - y) ** 2; acc.logLoss -= Math.log(y ? q : 1 - q);
  const b = acc.bins[Math.min(9, Math.floor(q * 10))];
  b.n++; b.pred += q; b.hit += y;
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function runE1F({ world, worldLabel, family, kind = 'MBVI3', params = {}, makeAgent = makeAgentForV3, forecasters = Object.keys(FORECASTERS) }) {
  const L = layout('E1', world, worldLabel);
  if (!L) return { task: 'E1F', family, world: worldLabel, kind, excluded: true };
  const P = TASK_PARAMS.E1;
  const env = new GraphEnv(world, { seedLabel: `${worldLabel}|E1F|${family}|env`, maxSteps: P.cap });
  for (const [u, v, p] of familyReliabilities(world, worldLabel, family)) env.setReliability(u, v, p);
  const inner = makeAgent(kind, env, `${worldLabel}|E1F|${family}|agent`, params[kind] ?? {});
  const F = Object.fromEntries(forecasters.map((name) => [name, { f: FORECASTERS[name](), invalid: 0, scopes: { all: newAccumulator(), explore: newAccumulator(), test: newAccumulator(), untried: newAccumulator(), tried: newAccumulator(), modal: newAccumulator() } }]));
  const tries = new Map();
  let phase = 'explore';
  const agent = {
    act: (obs) => inner.act(obs),
    observe(tr) {
      const s = tr.obs.node, a = tr.action, s2 = tr.next.node, moved = s2 !== s ? 1 : 0, key = `${s}|${a}`;
      const seen = tries.get(key) ?? 0;
      for (const x of Object.values(F)) {
        const p = x.f.pMove(s, a);
        if (!(p >= 0 && p <= 1)) x.invalid++;
        for (const scope of ['all', phase, seen ? 'tried' : 'untried']) score(x.scopes[scope], p, moved);
        const top = x.f.modal(s, a);
        if (top) score(x.scopes.modal, top[1], s2 === top[0] ? 1 : 0);
      }
      for (const x of Object.values(F)) x.f.update(s, a, s2, tr.reward, tr.done);
      tries.set(key, seen + 1);
      inner.observe(tr);
    },
  };
  env.setRewardNode(null); env.setCue(null);
  runSteps(env, agent, { total: P.exploreSteps, episodeLength: P.exploreEpisodeLength });
  phase = 'test';
  env.setRewardNode(L.goal); env.setCue(L.goal);
  const test = [];
  for (let e = 0; e < P.testEpisodes; e++) test.push(runEpisode(env, agent, { start: L.start }));
  const info = typeof inner.inspect === 'function' ? inner.inspect() : {};
  return {
    task: 'E1F', family, world: worldLabel, kind, layout: L, testSteps: test.map((r) => r.steps), metric: sum(test.map((r) => r.steps)), censored: test.filter((r) => r.truncated).length,
    forecasts: Object.fromEntries(Object.entries(F).map(([name, x]) => [name, { invalid: x.invalid, ...x.scopes }])),
    secondary: { model: info.model ?? null, compute: info.compute ?? null },
  };
}

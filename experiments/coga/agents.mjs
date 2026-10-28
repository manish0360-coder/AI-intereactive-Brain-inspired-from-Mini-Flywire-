// ==========================================================
// COG-A — baseline agents and the baseline session runner (pure apart from the seeded streams)
// ==========================================================
// RW     uniform over the current node's neighbours (one draw per decision).
// QB1    tabular one-step Q-learning as M1_AUDIT.md §4: Q = 0 initially; two fresh uniforms per decision
//        (u1 < epsilon -> neighbour floor(u2 * deg) in ascending order, else the greedy set with ties broken uniformly by u2:
//        deterministic lowest-id tie-breaking trapped the zero-initialised agent in loops - development smoke test, world 1);
//        update in the same step: Q(s,a) += alpha (r + gamma * B - Q(s,a)), B = 0 on arrival at the goal, else max Q(s',.)
//        (a slip gives s' = s; reaching the episode cap is truncation and bootstraps).  Nothing else writes Q.
// DYNA   QB1 + classic tabular Dyna-Q (Sutton & Barto 2018, section 8.2): a deterministic model keeping the last observed
//        (r, s', terminal) of each experienced (s, a); after every real update, k planning updates on pairs drawn uniformly from
//        the experienced pairs (in first-experience order).
// The agent's stream is replaced at the first step >= T_SHIFT by the condition's own stream (RNG contract, A6).
// ==========================================================
import { STEPS, T_SHIFT, EPISODE_CAP, GAMMA, DYNA_K } from './config.mjs';
import { NEIGHBOURS } from './worlds.mjs';
import { CogaEnv } from './envsim.mjs';
import { stream, agentStream } from './rngid.mjs';

export const AGENTS = Object.freeze(['RW', 'QB1', 'DYNA']);

function makeTabular({ alpha, epsilon, gamma }) {
  const Q = new Map();
  const q = (s, a) => Q.get(`${s}|${a}`) || 0;
  const maxQ = (s) => { let m = -Infinity; for (const a of NEIGHBOURS.get(s)) m = Math.max(m, q(s, a)); return m; };
  const update = (s, a, r, s2, terminal) => { const k = `${s}|${a}`, old = Q.get(k) || 0; Q.set(k, old + alpha * (r + (terminal ? 0 : gamma * maxQ(s2)) - old)); };
  return {
    Q, q, update, updates: 0,
    act(s, rng) {
      const nb = NEIGHBOURS.get(s), u1 = rng(), u2 = rng();
      if (u1 < epsilon) return nb[Math.floor(u2 * nb.length)];
      let bv = -Infinity; for (const a of nb) bv = Math.max(bv, q(s, a));
      const top = nb.filter(a => q(s, a) === bv);                                     // greedy set, ascending order
      return top[Math.floor(u2 * top.length)];                                        // ties broken uniformly with the same fresh u2
    },
  };
}

export function makeAgent(kind, params = {}) {
  if (kind === 'RW') return { kind, act: (s, rng) => { const nb = NEIGHBOURS.get(s); return nb[Math.floor(rng() * nb.length)]; }, learn() {}, updatesPerStep: 0 };
  const gamma = params.gamma ?? GAMMA;
  const T = makeTabular({ alpha: params.alpha, epsilon: params.epsilon, gamma });
  if (kind === 'QB1') return { kind, Q: T.Q, act: T.act, learn(s, a, r, s2, terminal) { T.update(s, a, r, s2, terminal); }, updatesPerStep: 1 };
  if (kind === 'DYNA') {
    const k = params.k ?? DYNA_K, model = new Map(), pairs = [];
    return { kind, Q: T.Q, act: T.act, updatesPerStep: 1 + k,
      learn(s, a, r, s2, terminal, rng) {
        T.update(s, a, r, s2, terminal);
        const key = `${s}|${a}`; if (!model.has(key)) pairs.push([s, a]); model.set(key, { r, s2, terminal });
        for (let i = 0; i < k; i++) { const [ps, pa] = pairs[Math.floor(rng() * pairs.length)]; const m = model.get(`${ps}|${pa}`); T.update(ps, pa, m.r, m.s2, m.terminal); }
      } };
  }
  throw new Error(`unknown agent ${kind}`);
}

/** one baseline session; returns the environment log and session facts */
export function runBaseline({ world, agent: kind, condition, params = {}, steps = STEPS, onDecision = null, agentFactory = null }) {
  const env = new CogaEnv(world, condition);
  const agent = (agentFactory || makeAgent)(kind, params);
  let rng = stream(agentStream(world.id, kind, 'pre'));
  let s = env.nextStart(), epSteps = 0, episodes = 1;
  const arrivals = [];
  for (let t = 0; t < steps; t++) {
    if (t === T_SHIFT) rng = stream(agentStream(world.id, kind, condition));
    if (onDecision) onDecision(t, s, agent);                                          // test probe only (reads, never writes)
    const a = agent.act(s, rng);
    const ok = env.attempt(s, a, t);
    const s2 = ok ? a : s, terminal = s2 === world.goal;
    agent.learn(s, a, terminal ? 1 : 0, s2, terminal, rng);
    epSteps++;
    if (terminal) arrivals.push(t);
    if (terminal || epSteps >= EPISODE_CAP) { s = env.nextStart(); epSteps = 0; episodes++; } else s = s2;
  }
  return { agent: kind, condition, world: world.id, params, log: env.log, arrivals, episodes, refused: env.refused, self: env.self, updatesPerStep: agent.updatesPerStep,
    streams: { pre: agentStream(world.id, kind, 'pre'), post: agentStream(world.id, kind, condition) } };
}

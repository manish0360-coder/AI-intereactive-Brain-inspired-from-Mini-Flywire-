// CF-03 tests — world model (normalisation, posterior, resets), planner (closed forms, budget), MBVI behaviour
import assert from 'node:assert/strict';
import { makeWorldModel, WM_DEFAULTS } from '../core/world_model.mjs';
import { valueIteration, qValues } from '../core/planner.mjs';
import { makeMBVI } from '../core/mbvi.mjs';
import { makeStream } from '../testbed/rng.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);
const O = (node, nActions, goal = null) => Object.freeze({ node, nActions, goal });
const T = (obs, action, reward, next, done = false, truncated = false) => Object.freeze({ obs, action, reward, next, done, truncated });

export const tests = [
  ['NORMALISATION: every predictive distribution sums to 1 with entries in [0, 1], through random updates and resets', () => {
    const m = makeWorldModel(); const rnd = makeStream('cf|test|core|norm');
    for (let s = 1; s <= 6; s++) m.visit(s, 3);
    for (let i = 0; i < 5000; i++) {
      const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 3);
      const s2 = rnd() < 0.3 ? s : 1 + Math.floor(rnd() * 6);
      m.update(s, a, s2, rnd() < 0.1 ? 1 : 0, rnd() < 0.1);
      if (i % 97 === 0) for (let x = 1; x <= 6; x++) for (let b = 0; b < 3; b++) {
        const p = m.predict(x, b); close(total(p), 1, 1e-12);
        for (const v of [p.self, p.unknown, ...p.outcomes.map(([, y]) => y)]) assert.ok(v >= 0 && v <= 1);
      }
    }
    for (let s = 1; s <= 6; s++) { const r = m.rewardProb(s), d = m.doneProb(s); assert.ok(r >= 0 && r <= 1 && d >= 0 && d <= 1); }
  }],
  ['NORMALISATION: an untried pair predicts SELF 1/2 and UNKNOWN 1/2; k observations of X give k/(k + 2 alpha0)', () => {
    const m = makeWorldModel(); const a0 = WM_DEFAULTS.alpha0;
    const p0 = m.predict(1, 0); close(p0.self, 0.5); close(p0.unknown, 0.5); assert.equal(p0.outcomes.length, 0);
    for (let k = 1; k <= 7; k++) {
      m.update(1, 0, 9, 0, false);
      const p = m.predict(1, 0); close(p.outcomes[0][1], k / (k + 2 * a0)); close(p.self, a0 / (k + 2 * a0)); close(p.unknown, a0 / (k + 2 * a0)); close(total(p), 1, 1e-12);
    }
  }],
  ['DETERMINISTIC RESET: 30 identical outcomes then a contradiction resets the pair exactly once', () => {
    const m = makeWorldModel(); const a0 = WM_DEFAULTS.alpha0;
    for (let i = 0; i < 30; i++) m.update(1, 0, 2, 0, false);
    m.update(1, 0, 1, 0, false);                               // the edge is now blocked: the agent stayed
    assert.equal(m.stats().transitionResets, 1);
    const p = m.predict(1, 0); close(p.self, (1 + a0) / (1 + 2 * a0)); assert.equal(p.outcomes.length, 0);
    for (let i = 0; i < 30; i++) m.update(1, 0, 1, 0, false);
    assert.equal(m.stats().transitionResets, 1, 'consistent observations after the reset do not reset again');
  }],
  ['DETERMINISTIC RESET: below resetMinN observations a contradiction does not reset', () => {
    const m = makeWorldModel();
    for (let i = 0; i < WM_DEFAULTS.resetMinN - 1; i++) m.update(1, 0, 2, 0, false);
    m.update(1, 0, 1, 0, false);
    assert.equal(m.stats().transitionResets, 0);
  }],
  ['STOCHASTIC RESET: p = 0.5 outcomes never reset and the posterior converges to 0.5', () => {
    const m = makeWorldModel(); const rnd = makeStream('cf|test|core|stoch5');
    for (let i = 0; i < 4000; i++) m.update(1, 0, rnd() < 0.5 ? 2 : 1, 0, false);
    assert.equal(m.stats().transitionResets, 0);
    const p = m.predict(1, 0); assert.ok(Math.abs(p.outcomes[0][1] - 0.5) < 0.03, `${p.outcomes[0][1]}`);
  }],
  ['STOCHASTIC RESET: p = 0.7 outcomes reset rarely (only after 20 straight successes) and the posterior stays near 0.7', () => {
    const m = makeWorldModel(); const rnd = makeStream('cf|test|core|stoch7');
    for (let i = 0; i < 4000; i++) m.update(1, 0, rnd() < 0.7 ? 2 : 1, 0, false);
    assert.ok(m.stats().transitionResets <= 3, `${m.stats().transitionResets} resets`);
    const p = m.predict(1, 0); assert.ok(Math.abs(p.outcomes[0][1] - 0.7) < 0.15, `${p.outcomes[0][1]}`);
  }],
  ['REWARD: optimistic prior (1 before any arrival); a failed move (SELF) does not touch the reward model', () => {
    const m = makeWorldModel(); const b0 = WM_DEFAULTS.beta0;
    assert.equal(m.rewardProb(5), 1); assert.equal(m.doneProb(5), 1);
    m.update(5, 0, 5, 0, false); assert.equal(m.rewardProb(5), 1);
    m.update(4, 0, 5, 0, false); close(m.rewardProb(5), b0 / (1 + b0)); close(m.doneProb(5), b0 / (1 + b0));
  }],
  ['REWARD RESET: a contradicted confident reward clears every state (global) or only that state (local)', () => {
    for (const global of [true, false]) {
      const m = makeWorldModel({ globalRewardReset: global }); const b0 = WM_DEFAULTS.beta0;
      for (let i = 0; i < 10; i++) m.update(1, 0, 7, 1, true);       // arrivals at 7 always rewarded
      for (let i = 0; i < 3; i++) m.update(1, 1, 8, 0, false);       // arrivals at 8 never rewarded
      m.update(1, 0, 7, 0, false);                                    // the reward has moved
      if (global) { assert.equal(m.stats().globalRewardResets, 1); assert.equal(m.rewardProb(8), 1); }
      else { assert.equal(m.stats().rewardResets, 1); close(m.rewardProb(8), b0 / (3 + b0)); }
      close(m.rewardProb(7), b0 / (1 + b0));
    }
  }],
  ['NO-RESET ablation: resets: false never resets transitions or rewards', () => {
    const m = makeWorldModel({ resets: false });
    for (let i = 0; i < 30; i++) m.update(1, 0, 2, 1, true);
    m.update(1, 0, 1, 0, false); m.update(3, 0, 2, 0, false);
    const s = m.stats(); assert.equal(s.transitionResets + s.rewardResets + s.globalRewardResets, 0);
  }],
  ['PLANNER CLOSED FORM: deterministic chain 10 -> 11 -> 12 -> 13 (cue 13) gives V = 1, gamma, gamma^2', () => {
    const m = makeWorldModel({ alpha0: 1e-12 }); const g = 0.95; const V = new Map();
    for (const s of [10, 11, 12, 13]) m.visit(s, 1);
    for (let i = 0; i < 50; i++) { m.update(10, 0, 11, 0, false); m.update(11, 0, 12, 0, false); m.update(12, 0, 13, 1, true); }
    const r = valueIteration(m, V, { budget: 1000, theta: 1e-12, gamma: g, vOpt: 1, rewardOf: (s) => (s === 13 ? 1 : 0), doneOf: (s) => (s === 13 ? 1 : 0) });
    assert.ok(r.converged); close(V.get(12), 1, 1e-6); close(V.get(11), g, 1e-6); close(V.get(10), g * g, 1e-6);
  }],
  ['PLANNER CLOSED FORM: stochastic success p gives V = p / (1 - gamma (1 - p))', () => {
    const g = 0.95;
    for (const [succ, fail] of [[3, 7], [5, 5], [9, 1]]) {
      const m = makeWorldModel({ alpha0: 1e-12, resets: false }); const V = new Map(); m.visit(1, 1); m.visit(2, 1);
      for (let i = 0; i < succ * 10; i++) m.update(1, 0, 2, 1, true);
      for (let i = 0; i < fail * 10; i++) m.update(1, 0, 1, 0, false);
      const p = succ / (succ + fail);
      valueIteration(m, V, { budget: 5000, theta: 1e-13, gamma: g, vOpt: 1, rewardOf: (s) => (s === 2 ? 1 : 0), doneOf: (s) => (s === 2 ? 1 : 0) });
      close(V.get(1), p / (1 - g * (1 - p)), 1e-6);
    }
  }],
  ['PLANNER BUDGET: budget 1 uses one sweep with backups = sum of widths; a large budget converges early', () => {
    const m = makeWorldModel(); for (const [s, w] of [[1, 2], [2, 3], [3, 1]]) m.visit(s, w);
    m.update(1, 0, 2, 0, false); m.update(2, 1, 3, 1, true);
    const opts = { gamma: 0.95, vOpt: 1, rewardOf: (s) => (s === 3 ? 1 : 0), doneOf: (s) => (s === 3 ? 1 : 0) };
    const r1 = valueIteration(m, new Map(), { budget: 1, theta: 1e-6, ...opts });
    assert.deepEqual([r1.sweeps, r1.backups, r1.converged], [1, 6, false]);
    const r2 = valueIteration(m, new Map(), { budget: 1000, theta: 1e-6, ...opts });
    assert.ok(r2.converged && r2.sweeps < 1000 && r2.backups === r2.sweeps * 6);
  }],
  ['OPTIMISM: an untried action is worth at least vOpt / 2 and is preferred over a known self-loop', () => {
    const m = makeWorldModel(); m.visit(1, 2);
    for (let i = 0; i < 10; i++) m.update(1, 0, 1, 0, false);                 // action 0 known to go nowhere
    const V = new Map(); const opts = { gamma: 0.95, vOpt: 1, rewardOf: () => 0, doneOf: () => 0 };
    valueIteration(m, V, { budget: 500, theta: 1e-9, ...opts });
    const q = qValues(m, V, 1, opts); assert.ok(q[1] > q[0] && q[1] >= 0.5);
  }],
  ['LATENT USE: transitions learned without a cue are used to plan toward a later cue', () => {
    const a = makeMBVI({ rng: makeStream('cf|test|core|latent') });
    for (let i = 0; i < 30; i++) {
      a.observe(T(O(1, 2), 0, 0, O(2, 1))); a.observe(T(O(1, 2), 1, 0, O(1, 2)));
      a.observe(T(O(2, 1), 0, 0, O(3, 1)));
    }
    assert.equal(a.act(O(1, 2, 3)), 0, 'with cue 3 the agent takes the exit that leads to 3');
  }],
  ['TRUNCATION: a truncated step is not treated as termination', () => {
    const a = makeMBVI({ rng: makeStream('cf|test|core|trunc') }), b = makeMBVI({ rng: makeStream('cf|test|core|trunc') });
    a.observe(T(O(1, 1), 0, 0, O(2, 1), false, true)); b.observe(T(O(1, 1), 0, 0, O(2, 1), false, false));
    assert.equal(a._model.doneProb(2), b._model.doneProb(2)); assert.ok(a._model.doneProb(2) < 0.5);
  }],
  ['COMPUTE: decisions, sweeps, backups and budget hits are reported', () => {
    const a = makeMBVI({ rng: makeStream('cf|test|core|compute'), params: { budget: 3 } });
    for (let i = 0; i < 5; i++) { const act = a.act(O(1, 2, 2)); a.observe(T(O(1, 2, 2), act, 0, O(1, 2, 2))); }
    const c = a.inspect().compute;
    assert.equal(c.decisions, 5); assert.ok(c.backups >= c.sweeps && c.sweeps <= 15 && c.budget === 3);
    assert.ok(c.budgetHitShare >= 0 && c.budgetHitShare <= 1);
  }],
];

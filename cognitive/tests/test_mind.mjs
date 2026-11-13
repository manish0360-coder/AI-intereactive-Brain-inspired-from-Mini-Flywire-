// CF-03b tests — world model v2 (numerics, pooling, impassable exits, novelty, resets), MBVI2 isolation and behaviour
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWorldModel2, WM2_DEFAULTS, lgamma, logBetaBinomial } from '../mind/world_model.mjs';
import { AGENTS_V2, MBVI2_VARIANTS, MIND_FILES, MIND_ALLOWED, agentOptionsV2, makeAgentForV2 } from '../testbed/registry_v2.mjs';
import { AGENTS_V1 } from '../testbed/registry_v1.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation, checkInvariance } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, edgeKey } from '../testbed/worlds.mjs';
import { runTaskV1 } from '../testbed/tasks_v1.mjs';
import { makeStream } from '../testbed/rng.mjs';

const MIND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mind');
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);
const W = generateWorld('cf|dev|world|5');

/** A reliable single-destination population: `pairs` pairs, each moved `each` times to its own destination. */
function reliablePopulation(m, pairs = 12, each = 4) {
  for (let i = 0; i < pairs; i++) for (let j = 0; j < each; j++) m.update(100 + i, 0, 200 + i, 0, false);
}

export const tests = [
  ['mind modules import only agent_util.mjs, the core planner and each other, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(MIND_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND_FILES].sort());
    for (const f of MIND_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND_DIR, f), 'utf8'), MIND_ALLOWED, f), []);
  }],
  ['MUTANT: a mind module importing the environment or the world generator is caught', () => {
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../testbed/env.mjs';", MIND_ALLOWED).length > 0);
    assert.ok(checkSourceIsolation("import { x } from '../testbed/worlds.mjs';", MIND_ALLOWED).length > 0);
    assert.ok(checkSourceIsolation('export const f = () => Math.random();', MIND_ALLOWED).length > 0);
  }],
  ['privilege: only ORACLE receives the oracle channel under the v2 registry; v1 kinds are the v1 factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|mind|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V2), PRIVILEGED, (k) => agentOptionsV2(k, env, 'cf|test|mind|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V1)) assert.equal(AGENTS_V2[k], AGENTS_V1[k]);
    for (const k of Object.keys(MBVI2_VARIANTS)) assert.equal(makeAgentForV2(k, env, 'cf|test|mind|priv|agent').kind, k);
  }],
  ['NUMERICS: lgamma matches closed forms; the Beta-binomial marginal under Beta(1, 1) is 1 / ((n + 1) C(n, m))', () => {
    close(lgamma(1), 0, 1e-12); close(lgamma(2), 0, 1e-12); close(lgamma(5), Math.log(24), 1e-10);
    close(lgamma(0.5), 0.5 * Math.log(Math.PI), 1e-10); close(lgamma(10.5), 13.940625219403763, 1e-9);
    const choose = (n, m) => { let c = 1; for (let i = 0; i < m; i++) c = c * (n - i) / (i + 1); return c; };
    for (const [m, n] of [[0, 1], [1, 1], [2, 5], [7, 7], [3, 12]]) close(Math.exp(logBetaBinomial(m, n, 1, 1)), 1 / ((n + 1) * choose(n, m)), 1e-10);
  }],
  ['NORMALISATION: every predictive distribution sums to 1 with entries in [0, 1], through random updates and resets', () => {
    for (const params of [{}, { pool: false }, { piBlock: 0 }, { globalRewardReset: true }]) {
      const m = makeWorldModel2(params); const rnd = makeStream('cf|test|mind|norm');
      for (let s = 1; s <= 6; s++) m.visit(s, 3);
      for (let i = 0; i < 3000; i++) {
        const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 3);
        const s2 = rnd() < 0.3 ? s : 1 + Math.floor(rnd() * 6);
        m.update(s, a, s2, rnd() < 0.1 ? 1 : 0, rnd() < 0.1);
        if (i % 61 === 0) for (let x = 1; x <= 6; x++) for (let b = 0; b < 3; b++) {
          const p = m.predict(x, b); close(total(p), 1, 1e-12);
          for (const v of [p.self, p.unknown, ...p.outcomes.map(([, y]) => y)]) assert.ok(v >= 0 && v <= 1);
        }
      }
      for (let s = 1; s <= 6; s++) { const r = m.rewardProb(s), d = m.doneProb(s); assert.ok(r >= 0 && r <= 1 && d >= 0 && d <= 1); }
    }
  }],
  ['PRIOR: before any data an untried pair moves with probability (1 - piBlock) * hyperMean0, all of it to UNKNOWN', () => {
    const m = makeWorldModel2(); const p = m.predict(1, 0);
    close(p.unknown, (1 - WM2_DEFAULTS.piBlock) * WM2_DEFAULTS.hyperMean0); close(p.self, 1 - p.unknown); assert.equal(p.outcomes.length, 0);
  }],
  ['NO POOLING: pool false with piBlock 0 is the Laplace rule (m + 1) / (n + 2) with the v1 novelty rule', () => {
    const m = makeWorldModel2({ pool: false, piBlock: 0 }); const k = WM2_DEFAULTS.kappa;
    let moves = 0;
    for (const [i, moved] of [1, 1, 0, 1, 0, 1, 1].entries()) {
      m.update(1, 0, moved ? 9 : 1, 0, false); moves += moved;
      const p = m.predict(1, 0), pMove = (moves + 1) / (i + 1 + 2);
      close(p.self, 1 - pMove); close(p.unknown, pMove * k / (moves + k)); close(total(p), 1, 1e-12);
    }
  }],
  ['LEAVE-ONE-OUT: a lone pair is not evidence about its own prior mean', () => {
    const m = makeWorldModel2({ piBlock: 0 });
    for (let i = 0; i < 3; i++) m.update(1, 0, 9, 0, false);
    const S = m.hyper().S, p = m.predict(1, 0);
    close(1 - p.self, (3 + S * WM2_DEFAULTS.hyperMean0) / (3 + S));
  }],
  ['POOLING: in a reliable population an untried pair is expected to move, and the pooled mean approaches 1', () => {
    const m = makeWorldModel2(); reliablePopulation(m);
    assert.ok(m.hyper().mu > 0.95);
    const p = m.predict(1, 0);
    assert.ok(p.unknown > 0.9 && p.self < 0.1, `untried pair: unknown ${p.unknown}`);
    const naive = makeWorldModel2({ pool: false }); reliablePopulation(naive);
    assert.ok(naive.predict(1, 0).unknown < 0.5, 'without pooling the untried pair keeps its fixed prior');
  }],
  ['POOLING: in a mixed population the pooled prior shrinks a small sample toward the population rate', () => {
    const m = makeWorldModel2({ piBlock: 0 }); const rnd = makeStream('cf|test|mind|mixed');
    for (let i = 0; i < 40; i++) { const p = 0.5 + 0.5 * rnd(); for (let j = 0; j < 8; j++) m.update(100 + i, 0, rnd() < p ? 200 + i : 100 + i, 0, false); }
    assert.ok(m.hyper().mu > 0.65 && m.hyper().mu < 0.85, `pooled mean ${m.hyper().mu}`);
    m.update(1, 0, 1, 0, false); m.update(1, 0, 9, 0, false);                 // one failure, one move
    const pMove = 1 - m.predict(1, 0).self;
    assert.ok(pMove > 0.6 && pMove < 0.8, `1 move in 2 is shrunk toward the pool, got ${pMove}`);
  }],
  ['IMPASSABLE: in a reliable population two failures on a never-moved pair mark it impassable; one move clears it', () => {
    const m = makeWorldModel2(); reliablePopulation(m);
    m.update(1, 0, 1, 0, false); m.update(1, 0, 1, 0, false);
    const p = m.predict(1, 0);
    assert.ok(p.blocked > 0.9 && p.self > 0.9, `blocked ${p.blocked}, self ${p.self}`);
    m.update(1, 0, 9, 0, false);
    assert.equal(m.predict(1, 0).blocked, 0);
    const off = makeWorldModel2({ piBlock: 0 }); reliablePopulation(off);
    off.update(1, 0, 1, 0, false); off.update(1, 0, 1, 0, false);
    assert.equal(off.predict(1, 0).blocked, 0);
  }],
  ['NOVELTY: single-destination evidence shrinks UNKNOWN for moved pairs and never exceeds the v1 count rule', () => {
    const m = makeWorldModel2(); const k = WM2_DEFAULTS.kappa;
    m.update(1, 0, 9, 0, false);
    const first = m.predict(1, 0); close(first.unknown / (1 - first.self), k / (1 + k));     // no pooled evidence yet
    reliablePopulation(m);
    const p = m.predict(1, 0), share = p.unknown / (1 - p.self);
    assert.ok(share < 0.02, `novelty share ${share}`);
    assert.ok(m.hyper().nu <= k);
    const multi = makeWorldModel2();
    for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) multi.update(100 + i, 0, 200 + i * 10 + (j % 3), 0, false);
    assert.ok(multi.hyper().nu > m.hyper().nu, 'pairs with several destinations keep UNKNOWN alive');
  }],
  ['RESET: 30 identical moves then a failure reset the pair once; reward change-points are local unless asked otherwise', () => {
    const m = makeWorldModel2();
    for (let i = 0; i < 30; i++) m.update(1, 0, 2, 0, false);
    m.update(1, 0, 1, 0, false);
    assert.equal(m.stats().transitionResets, 1); assert.equal(m.countOf(1, 0), 1);
    for (const [flag, key] of [[false, 'rewardResets'], [true, 'globalRewardResets']]) {
      const r = makeWorldModel2({ globalRewardReset: flag });
      for (let i = 0; i < 8; i++) { r.update(1, 0, 2, 1, true); r.update(3, 0, 4, 0, false); }
      r.update(1, 0, 2, 0, false);                                              // the reward at 2 has gone
      assert.equal(r.stats()[key], 1);
      assert.equal(r.rewardProb(4) < 0.1, !flag, 'a local reset leaves the belief about state 4 intact');
    }
  }],
  ['DETERMINISM: MBVI2 gives identical rows on repeated runs, and differs from MBVI only through its model', () => {
    const run = (kind) => runTaskV1({ task: 'E1S', world: W, worldLabel: 'cf|dev|world|5', kind, arm: 'EXPLORED', makeAgent: makeAgentForV2 });
    assert.deepEqual(run('MBVI2'), run('MBVI2'));
    const a = run('MBVI2'), b = run('MBVI');
    assert.ok(a.secondary.quality.ece !== null && b.secondary.quality.ece !== null);
    assert.equal(a.censored, 0);
  }],
  ['INVARIANCE (hidden reliability): MBVI2 behaves identically until the edge is first attempted', () => {
    const e = W.edges[7], k = edgeKey(...e), START = 0, GOAL = 11;
    const runSeq = (p) => {
      const env = new GraphEnv(W, { seedLabel: 'cf|test|mind|inv|env', maxSteps: 80 });
      env.setRewardNode(GOAL); env.setCue(GOAL); env.setReliability(e[0], e[1], p);
      const agent = makeAgentForV2('MBVI2', env, 'cf|test|mind|inv|agent');
      let obs = env.reset({ start: START }); const seq = [], edges = [];
      for (let t = 0; t < 600; t++) {
        const s = env.inspect().pos, a = agent.act(obs);
        seq.push([obs.node, a]); edges.push(edgeKey(s, W.exitOrder[s][a]));
        const r = env.step(a);
        agent.observe(Object.freeze({ obs, action: a, reward: r.reward, next: r.obs, done: r.done, truncated: r.truncated }));
        obs = r.done || r.truncated ? env.reset({ start: START }) : r.obs;
      }
      return { seq, edges };
    };
    const A = runSeq(1), B = runSeq(0.05), first = A.edges.indexOf(k);
    assert.ok(first >= 0, 'the probed edge must be attempted within the run');
    assert.deepEqual(checkInvariance(A.seq, B.seq, first + 1), []);
    assert.ok(A.seq.some((x, i) => x[0] !== B.seq[i][0] || x[1] !== B.seq[i][1]), 'the hidden change must eventually matter');
  }],
];

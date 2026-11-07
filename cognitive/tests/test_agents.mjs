// CF-01 tests — agent update rules (hand-built transitions; no environment involved)
import assert from 'node:assert/strict';
import { makeQL } from '../agents/ql.mjs';
import { makeDynaQ } from '../agents/dynaq.mjs';
import { makeRandom } from '../agents/random.mjs';
import { makeOracle } from '../agents/oracle.mjs';
import { argmaxRandomTie } from '../testbed/agent_util.mjs';
import { makeStream } from '../testbed/rng.mjs';

const O = (node, nActions, goal = null) => Object.freeze({ node, nActions, goal });
const T = (obs, action, reward, next, done = false, truncated = false) => Object.freeze({ obs, action, reward, next, done, truncated });
const rng = () => makeStream('cf|test|agents');

export const tests = [
  ['QL: one update follows Q += alpha (r + gamma max Q(s\') - Q)', () => {
    const a = makeQL({ rng: rng(), params: { alpha: 0.5, gamma: 0.9 } });
    a.observe(T(O(2, 2, 9), 0, 1, O(9, 1, 9), true));      // terminal: target = 1
    assert.equal(a.inspect().q['2|9'][0], 0.5);
    a.observe(T(O(1, 3, 9), 2, 0, O(2, 2, 9)));             // target = 0.9 * 0.5
    assert.equal(a.inspect().q['1|9'][2], 0.5 * 0.45);
  }],
  ['QL: truncation bootstraps, termination does not', () => {
    const a = makeQL({ rng: rng(), params: { alpha: 1, gamma: 0.5 } });
    a.observe(T(O(5, 1, null), 0, 0, O(6, 1, null), true)); // seed Q(5)=0
    a.observe(T(O(6, 1, null), 0, 2, O(7, 1, null), true)); // Q(6)=2
    a.observe(T(O(4, 1, null), 0, 0, O(6, 1, null), false, true)); // truncated: 0 + 0.5*2
    assert.equal(a.inspect().q['4|null'][0], 1);
  }],
  ['QL: values are keyed by the cue (goal-conditioned)', () => {
    const a = makeQL({ rng: rng(), params: { alpha: 1 } });
    a.observe(T(O(1, 1, 3), 0, 1, O(3, 1, 3), true));
    assert.equal(a.inspect().q['1|3'][0], 1); assert.equal(a.inspect().q['1|4'], undefined);
  }],
  ['DYNAQ plans: after 1->2 then 2->3(goal), Q(1) becomes positive; QL with the same data keeps Q(1) = 0', () => {
    const steps = [T(O(1, 1, 3), 0, 0, O(2, 1, 3)), T(O(2, 1, 3), 0, 1, O(3, 1, 3), true)];
    const d = makeDynaQ({ rng: rng(), params: { k: 20 } }), q = makeQL({ rng: rng() });
    for (const s of steps) { d.observe(s); q.observe(s); }
    assert.ok(d.inspect().q['1|3'][0] > 0.1); assert.equal(q.inspect().q['1|3'][0], 0);
  }],
  ['DYNAQ with a cue plans toward a NEW cue from transitions learned without one', () => {
    const d = makeDynaQ({ rng: rng(), params: { k: 50 } });
    d.observe(T(O(1, 1, null), 0, 0, O(2, 1, null))); d.observe(T(O(2, 1, null), 0, 0, O(3, 1, null)));
    d.observe(T(O(5, 1, 3), 0, 0, O(5, 1, 3)));            // any real step with cue 3 triggers cue-3 planning
    assert.ok(d.inspect().q['1|3'][0] > 0); assert.ok(d.inspect().q['2|3'][0] > d.inspect().q['1|3'][0]);
  }],
  ['DYNAQ without a cue plans with the last observed reward of each pair', () => {
    const d = makeDynaQ({ rng: rng(), params: { k: 50 } });
    d.observe(T(O(1, 1, null), 0, 1, O(2, 1, null), true));
    assert.ok(d.inspect().q['1|null'][0] > 0.99);
    d.observe(T(O(1, 1, null), 0, 0, O(2, 1, null), false)); // the reward moved away: extinction through planning
    assert.ok(d.inspect().q['1|null'][0] < 0.05);
  }],
  ['RANDOM and QL act inside the action range and are deterministic given their stream', () => {
    for (const make of [makeRandom, makeQL, makeDynaQ]) {
      const a1 = make({ rng: rng() }), a2 = make({ rng: rng() });
      const width = (i) => 1 + ((i % 7) % 4);   // a node's exit count is fixed, as in any environment
      const xs = Array.from({ length: 200 }, (_, i) => a1.act(O(i % 7, width(i)))), ys = Array.from({ length: 200 }, (_, i) => a2.act(O(i % 7, width(i))));
      assert.deepEqual(xs, ys); xs.forEach((x, i) => assert.ok(x >= 0 && x < width(i)));
    }
  }],
  ['ORACLE refuses to start without the privileged channel and uses it when given', () => {
    assert.throws(() => makeOracle({ rng: rng() }));
    const o = makeOracle({ rng: rng(), oracle: { bestAction: () => 2 } });
    assert.equal(o.act(O(1, 3)), 2); assert.equal(o.privileged, true);
  }],
  ['argmaxRandomTie draws only on ties and covers every tied index', () => {
    let draws = 0; const counting = () => { draws++; return 0.99; };
    assert.equal(argmaxRandomTie([0, 3, 1], counting), 1); assert.equal(draws, 0);
    const seen = new Set(); const r = rng();
    for (let i = 0; i < 200; i++) seen.add(argmaxRandomTie([2, 0, 2, 2], r));
    assert.deepEqual([...seen].sort(), [0, 2, 3]);
  }],
];

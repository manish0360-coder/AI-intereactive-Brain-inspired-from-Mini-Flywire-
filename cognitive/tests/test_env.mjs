// CF-01 tests — GraphEnv contract, dynamics, statistics, common random numbers
import assert from 'node:assert/strict';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, distancesTo } from '../testbed/worlds.mjs';
import { checkObservation, checkCRN, checkBlocked, checkGoalEntryDynamics, checkGlobals } from '../testbed/checks.mjs';

const W = generateWorld('cf|dev|world|0');
const env = (label = 'cf|dev|envtest', maxSteps = 200) => new GraphEnv(W, { seedLabel: label, maxSteps });
const anyEdge = W.edges.find(([u, v]) => W.adj[u].length >= 2) ;

export const tests = [
  ['reset and step return frozen observations with exactly node, nActions, goal', () => {
    const e = env(); let obs = e.reset({ start: 0 });
    assert.deepEqual(checkObservation(obs), []);
    for (let i = 0; i < 50; i++) { const r = e.step(0); assert.deepEqual(checkObservation(r.obs), []); if (r.done || r.truncated) obs = e.reset({}); }
  }],
  ['the cue is null unless set, and is the label of the cued node when set', () => {
    const e = env(); assert.equal(e.reset({ start: 0 }).goal, null);
    e.setCue(5); assert.equal(e.reset({ start: 0 }).goal, W.labelOf[5]);
  }],
  ['invalid actions are rejected and stepping after the end throws', () => {
    const e = env('cf|dev|envtest2', 1); e.reset({ start: 0 });
    for (const a of [-1, W.exitOrder[0].length, 0.5, '0', null]) assert.throws(() => e.step(a), RangeError);
    e.step(0); assert.throws(() => e.step(0), /after the episode ended/);
  }],
  ['following shortest exits reaches the rewarded node with reward 1 and done', () => {
    const e = env(); const goal = 7; e.setRewardNode(goal);
    const d = distancesTo(W, goal); let obs = e.reset({ start: 3 }); let steps = 0, last;
    for (;;) { const s = e.inspect().pos; const a = W.exitOrder[s].findIndex((v) => d[v] === d[s] - 1); last = e.step(a); steps++; if (last.done) break; }
    assert.equal(last.reward, 1); assert.equal(steps, d[3]); assert.equal(last.truncated, false);
  }],
  ['truncation at maxSteps is distinct from done', () => {
    const e = env('cf|dev|envtest3', 4); e.setRewardNode(null); e.reset({ start: 0 }); let r;
    for (let i = 0; i < 4; i++) r = e.step(0);
    assert.equal(r.truncated, true); assert.equal(r.done, false); assert.equal(r.reward, 0);
  }],
  ['an episode cannot start at the rewarded node; the start stream excludes it', () => {
    const e = env(); e.setRewardNode(4);
    assert.throws(() => e.reset({ start: 4 }));
    for (let i = 0; i < 300; i++) { e.reset({}); assert.notEqual(e.inspect().pos, 4); }
  }],
  ['blocked edges are never traversed (checkBlocked)', () => {
    assert.deepEqual(checkBlocked(env(), W, anyEdge[0], anyEdge[1]), []);
  }],
  ['goal entry obeys the dynamics: a p = 0 goal edge is never entered (checkGoalEntryDynamics)', () => {
    const [u, v] = anyEdge; assert.deepEqual(checkGoalEntryDynamics(env(), W, u, v), []);
  }],
  ['empirical success rate is inside the binomial 99.9% interval for p = 0.3 and p = 0.7', () => {
    for (const p of [0.3, 0.7]) {
      const e = env(`cf|dev|stat|${p}`); const [u, v] = anyEdge; e.setReliability(u, v, p); e.setRewardNode(null);
      const a = W.exitOrder[u].indexOf(v); const n = 20000; let ok = 0;
      for (let i = 0; i < n; i++) { e.reset({ start: u, maxSteps: 1 }); e.step(a); if (e.inspect().pos === v) ok++; }
      const half = 3.2905 * Math.sqrt(p * (1 - p) / n);
      assert.ok(Math.abs(ok / n - p) <= half, `p=${p} observed ${ok / n}`);
    }
  }],
  ['common random numbers: an edge\'s j-th outcome does not depend on other edges (checkCRN)', () => {
    const edges = W.edges.filter(([u]) => W.adj[u].length >= 2).slice(0, 2);
    const run = (order) => {
      const e = env('cf|dev|crn'); e.setRewardNode(null); const out = {};
      for (const [u, v] of edges) e.setReliability(u, v, 0.5);
      for (const idx of order) {
        const [u, v] = edges[idx]; const a = W.exitOrder[u].indexOf(v);
        e.reset({ start: u, maxSteps: 1 }); e.step(a); (out[`${u}-${v}`] ??= []).push(e.inspect().pos === v);
      }
      return out;
    };
    const A = run([0, 0, 1, 0, 1, 1, 0, 1]), B = run([1, 1, 0, 1, 0, 0, 1, 0]);
    assert.deepEqual(checkCRN(A, B), []);
  }],
  ['the environment creates no global variables', () => {
    const before = Object.keys(globalThis);
    const e = env(); e.setRewardNode(2); e.setCue(2); e.reset({ start: 9 });
    for (let i = 0; i < 100; i++) { const r = e.step(0); if (r.done || r.truncated) e.reset({}); }
    e.oracleBestAction(); e.trace();
    assert.deepEqual(checkGlobals(before, Object.keys(globalThis)), []);
  }],
  ['the oracle action follows a shortest path to the rewarded node', () => {
    const e = env(); const goal = 11; e.setRewardNode(goal); e.reset({ start: 1 });
    const d = distancesTo(W, goal); let steps = 0;
    for (;;) { const r = e.step(e.oracleBestAction()); steps++; if (r.done) break; }
    assert.equal(steps, d[1]);
  }],
];

// M11 tests — the controlled-change environment on the MiniFlyWire graph (experiments/m11_routes).
// They use labels mfw|m11test|*, never the demonstration's mfw|m11|* labels.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GraphEnv } from '../testbed/env.mjs';
import { edgeKey } from '../testbed/worlds.mjs';
import { makeAdoptedAgent } from '../testbed/adopted_agent.mjs';
import { makeAgentForV6 } from '../testbed/registry_v6.mjs';
import {
  ROOT, ARMS, LABEL_OF, appGraph, nodeTable, runOne, readableTrace, readingRule, MARGIN,
} from '../../experiments/m11_routes/m11_lib.mjs';

const TEST_LABEL = 'mfw|m11test|0';
const W = appGraph(), NODES = nodeTable();
const appEdges = () => {
  const conn = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
  return new Set(conn.filter((e) => e.from !== e.to).map((e) => edgeKey(e.from, e.to)));
};
const eventsOf = (row) => row.events.map((e) => (e.skipped ? 'skip' : e.reverses));

// Shared runs (five E5 runs on the app graph; about 2 s each).
let cache = null;
function runs() {
  if (cache) return cache;
  cache = {
    beliefTraced: runOne(W, TEST_LABEL, 'OFTEN', 'BELIEF', true),
    beliefPlain: runOne(W, TEST_LABEL, 'OFTEN', 'BELIEF', false),
    mbviTraced: runOne(W, TEST_LABEL, 'OFTEN', 'MBVI3', true),
    mbviPlain: runOne(W, TEST_LABEL, 'OFTEN', 'MBVI3', false),
    beliefAgain: runOne(W, TEST_LABEL, 'OFTEN', 'BELIEF', true),
  };
  return cache;
}

export const tests = [
  ['M11 GRAPH: the world is the MiniFlyWire graph of connections.json behind hidden labels; the node table maps back to neuron ids and labels', () => {
    assert.ok(!LABEL_OF.m11(0).startsWith('mfw|m11test'), 'test labels are not demonstration labels');
    assert.equal(W.n, 20);
    const app = appEdges();
    assert.equal(W.edges.length, app.size);
    for (const [u, v] of W.edges) assert.ok(app.has(edgeKey(NODES[u].id, NODES[v].id)), `edge ${u}-${v} is an app edge`);
    const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
    for (const x of NODES) assert.equal(x.label, neurons.find((n) => n.id === x.id).label);
    assert.ok(W.labelOf.some((lab, u) => lab !== u), 'node labels are relabelled');
  }],
  ['M11 ENVIRONMENT: a blocked edge fails every attempt and leaves the agent in place; unblocking restores it', () => {
    const [u, v] = W.edges[0];
    const a = W.exitOrder[u].indexOf(v);
    const env = new GraphEnv(W, { seedLabel: 'mfw|m11test|env' });
    env.setRewardNode(null); env.setCue(null); env.setReliability(u, v, 1);
    env.reset({ start: u });
    env.block(u, v);
    for (let i = 0; i < 20; i++) assert.equal(env.step(a).obs.node, W.labelOf[u], 'stays put while blocked');
    env.unblock(u, v);
    assert.equal(env.step(a).obs.node, W.labelOf[v], 'moves once reopened');
  }],
  ['M11 ARMS: BELIEF is the AD-13 adopted agent with its exact parameters; MBVI3 is the registry baseline', () => {
    const env = new GraphEnv(W, { seedLabel: 'mfw|m11test|arms' });
    assert.deepEqual({ ...ARMS.BELIEF.make(env, 'x')._model.params }, { ...makeAdoptedAgent(env, 'x')._model.params });
    assert.equal(ARMS.BELIEF.make(env, 'x')._model.params.rhoFixed, 0.5);
    assert.equal(ARMS.BELIEF.make(env, 'x')._model.params.volHazard, 0.01);
    assert.deepEqual({ ...ARMS.MBVI3.make(env, 'x')._model.params }, { ...makeAgentForV6('MBVI3', env, 'x', {})._model.params });
  }],
  ['M11 RECORDER is passive: traced and untraced runs give identical rows for both arms; both arms face the same schedule', () => {
    const r = runs();
    assert.deepEqual(r.beliefTraced.row, r.beliefPlain.row);
    assert.deepEqual(r.mbviTraced.row, r.mbviPlain.row);
    assert.equal(r.beliefPlain.record, null);
    for (const k of ['start', 'goal']) assert.equal(r.beliefPlain.row[k], r.mbviPlain.row[k]);
    assert.deepEqual(eventsOf(r.beliefPlain.row), eventsOf(r.mbviPlain.row));
    assert.ok(r.beliefPlain.row.reversedEvents > 0, 'the test schedule has a reopening');
  }],
  ['M11 RECORDER content: blocked attempts never move; each blocked exit is followed; probabilities lie in [0, 1]; the belief logs its archives', () => {
    const r = runs();
    for (const rec of [r.beliefTraced.record, r.mbviTraced.record]) {
      assert.ok(rec.steps.length > 0 && rec.steps.every(([t], i) => t === i), 'one step row per step, in order');
      assert.ok(rec.steps.every(([, , , moved, blocked]) => !(blocked && moved)), 'a blocked attempt never moves');
      assert.ok(rec.steps.every(([, , , , , p]) => p >= 0 && p <= 1));
      const blockedKeys = new Set(rec.steps.filter((x) => x[4]).map(([, s, a]) => `${s}|${a}`));
      assert.deepEqual(new Set(rec.followed.map((f) => f.key)), blockedKeys);
      for (const f of rec.followed) assert.ok(f.points.every(([t, p], i) => p >= 0 && p <= 1 && (i === 0 || t >= f.points[i - 1][0])));
    }
    assert.ok(r.beliefTraced.row.secondary.volatility.opened > 0, 'the belief archived a change');
  }],
  ['M11 DETERMINISM: the same run traced again gives identical rows and an identical record', () => {
    const r = runs();
    assert.deepEqual(r.beliefAgain.row, r.beliefTraced.row);
    assert.deepEqual(r.beliefAgain.record, r.beliefTraced.record);
  }],
  ['M11 READABLE TRACE: every step and followed exit is an edge of the app graph; the schedule names app edges; belief events map to app edges', () => {
    const r = runs(), app = appEdges();
    const tr = readableTrace(W, NODES, r.beliefTraced.record, r.beliefTraced.row, TEST_LABEL, 'OFTEN');
    assert.ok(tr.steps.every(([, from, to]) => app.has(edgeKey(from, to))));
    assert.ok(tr.followed.every((f) => app.has(edgeKey(f.from, f.to)) && f.fromLabel && f.toLabel));
    assert.ok(tr.schedule.every((e) => e.skipped || app.has(edgeKey(...e.edge))));
    assert.ok(tr.beliefEvents.length > 0 && tr.beliefEvents.every((e) => app.has(edgeKey(...e.edge))));
    const mt = readableTrace(W, NODES, r.mbviTraced.record, r.mbviTraced.row, TEST_LABEL, 'OFTEN');
    assert.equal(mt.beliefEvents, null, 'MBVI3 keeps no archive log');
  }],
  ['M11 READING RULE: D1 recovery, D2 cost under the margin, D3 mechanism; an empty contrast never passes', () => {
    const c = (mean, lo, hi, n = 135) => ({ n, mean, lo, hi });
    const A = (afterReversed, cost, crossings) => ({ families: { OFTEN: { contrasts: { afterReversed, crossings } }, RARE: { contrasts: { cost } } } });
    assert.equal(readingRule(A(c(10, 2, 18), c(15, 8, 24.9), c(3, 1, 5))).reading, 'DEMONSTRATED ON THE MINIFLYWIRE GRAPH');
    assert.equal(readingRule(A(c(10, 0, 18), c(15, 8, 24.9), c(3, 1, 5))).D1_recovery, false, 'a lower bound of 0 does not pass');
    assert.equal(readingRule(A(c(10, 2, 18), c(15, 8, MARGIN), c(3, 1, 5))).D2_cost, false, 'an upper bound at the margin does not pass');
    assert.equal(readingRule(A(c(10, 2, 18), c(15, 8, 24.9), c(3, -1, 5))).D3_mechanism, false);
    assert.equal(readingRule(A(c(null, null, null, 0), c(null, null, null, 0), c(null, null, null, 0))).reading, 'NOT DEMONSTRATED (D1_recovery, D2_cost, D3_mechanism)');
    assert.equal(readingRule({ families: {} }).reading, 'NOT DEMONSTRATED (D1_recovery, D2_cost, D3_mechanism)');
  }],
];

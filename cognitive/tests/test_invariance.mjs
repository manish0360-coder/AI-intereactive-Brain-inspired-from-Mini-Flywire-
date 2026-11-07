// CF-03 tests — counterfactual invariance: MBVI's behaviour may depend on hidden structure only after it could have
// observed it.  Each case runs MBVI in two environments that differ only in something hidden, and checks identical
// action sequences up to the first step at which the difference was observable.  World-peeking mutants (agents
// handed the true world through a closure, as a leak would) must fail the same check.
import assert from 'node:assert/strict';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { makeAgentForV1 } from '../testbed/registry_v1.mjs';
import { checkInvariance } from '../testbed/checks_v1.mjs';
import { makeStream } from '../testbed/rng.mjs';

const W = generateWorld('cf|dev|world|5');
const STEPS = 600;

/** Run an agent for STEPS steps; record [state label, action] per step and the internal edge / arrival per step. */
function runSeq(world, setup, makeAgent, start) {
  const env = new GraphEnv(world, { seedLabel: 'cf|test|inv|env', maxSteps: 80 });
  setup(env);
  const agent = makeAgent(env);
  let obs = env.reset({ start }); const seq = [], edges = [], arrivals = [];
  for (let t = 0; t < STEPS; t++) {
    const s = env.inspect().pos;
    const a = agent.act(obs); seq.push([obs.node, a]); edges.push(edgeKey(s, world.exitOrder[s][a]));
    const r = env.step(a); arrivals.push(env.inspect().pos);
    agent.observe(Object.freeze({ obs, action: a, reward: r.reward, next: r.obs, done: r.done, truncated: r.truncated }));
    obs = r.done || r.truncated ? env.reset({ start }) : r.obs;
  }
  return { seq, edges, arrivals };
}
const mbvi = (env) => makeAgentForV1('MBVI', env, 'cf|test|inv|agent');
const differs = (a, b) => a.seq.some((x, i) => x[0] !== b.seq[i][0] || x[1] !== b.seq[i][1]);

/** A copy of `world` with one extra edge x-y appended at the END of both exit orders (other actions unchanged). */
function withExtraEdge(world, x, y) {
  const adj = world.adj.map((nb) => [...nb]); adj[x].push(y); adj[y].push(x); adj[x].sort((a, b) => a - b); adj[y].sort((a, b) => a - b);
  const exitOrder = world.exitOrder.map((ex) => [...ex]); exitOrder[x].push(y); exitOrder[y].push(x);
  return Object.freeze({ ...world, adj, exitOrder, edges: [...world.edges, [Math.min(x, y), Math.max(x, y)]] });
}

/** Mutant: MBVI that, given the true reliabilities through a closure, never takes an exit whose true p is below 0.5. */
function peekingReliability(world, relOf) {
  return (env) => {
    const inner = mbvi(env);
    return { act(obs) { const s = world.nodeOfLabel.get(obs.node); let a = inner.act(obs); if (relOf(edgeKey(s, world.exitOrder[s][a])) < 0.5) a = (a + 1) % obs.nActions; return a; }, observe: (t) => inner.observe(t) };
  };
}
/** Mutant: an agent that reads the true graph (closure) and follows true shortest paths to the cue. */
function peekingTopology(world) {
  return () => ({
    act(obs) {
      const s = world.nodeOfLabel.get(obs.node), g = world.nodeOfLabel.get(obs.goal); const d = distancesTo(world, g);
      let best = 0; world.exitOrder[s].forEach((v, i) => { if (d[v] < d[world.exitOrder[s][best]]) best = i; }); return best;
    },
    observe() {},
  });
}

const START = 0, GOAL = 11;   // internal ids; the agent only ever sees their relabelled observations

export const tests = [
  ['INVARIANCE (hidden reliability): identical until the edge is first attempted; the change then matters', () => {
    const e = W.edges[7]; const k = edgeKey(...e);
    const setup = (p) => (env) => { env.setRewardNode(GOAL); env.setCue(GOAL); env.setReliability(e[0], e[1], p); };
    const A = runSeq(W, setup(1), mbvi, START), B = runSeq(W, setup(0.05), mbvi, START);
    const first = A.edges.indexOf(k);
    assert.ok(first >= 0, 'the probed edge must be attempted within the run');
    assert.deepEqual(checkInvariance(A.seq, B.seq, first + 1), []);
    assert.ok(differs(A, B), 'the hidden change must eventually change behaviour (non-vacuous test)');
  }],
  ['INVARIANCE (hidden topology): an extra edge changes nothing until one of its endpoints is visited', () => {
    const dS = distancesTo(W, START);
    const pair = W.edges.length && [...Array(W.n).keys()].flatMap((x) => [...Array(W.n).keys()].map((y) => [x, y]))
      .find(([x, y]) => x < y && x !== START && y !== START && !W.adj[x].includes(y) && dS[x] >= 2 && dS[y] >= 2);
    const W2 = withExtraEdge(W, ...pair);
    const setup = (env) => { env.setRewardNode(GOAL); env.setCue(GOAL); };
    const A = runSeq(W, setup, mbvi, START), B = runSeq(W2, setup, mbvi, START);
    const firstVisit = A.seq.findIndex(([lab]) => lab === W.labelOf[pair[0]] || lab === W.labelOf[pair[1]]);
    assert.ok(firstVisit > 0, 'an endpoint must be visited, and not at the start');
    assert.deepEqual(checkInvariance(A.seq, B.seq, firstVisit), []);
  }],
  ['INVARIANCE (hidden reward location, no cue): identical until either candidate goal is first reached', () => {
    const g1 = 9, g2 = 17;
    const setup = (g) => (env) => { env.setRewardNode(g); env.setCue(null); };
    const A = runSeq(W, setup(g1), mbvi, START), B = runSeq(W, setup(g2), mbvi, START);
    const firstArrival = A.arrivals.findIndex((x) => x === g1 || x === g2);
    assert.ok(firstArrival >= 0);
    assert.deepEqual(checkInvariance(A.seq, B.seq, firstArrival + 1), []);
    assert.ok(differs(A, B));
  }],
  ['MUTANT (peeks reliabilities): caught by checkInvariance before the edge is attempted', () => {
    const e = W.edges[7]; const k = edgeKey(...e);
    const setup = (p) => (env) => { env.setRewardNode(GOAL); env.setCue(GOAL); env.setReliability(e[0], e[1], p); };
    const A = runSeq(W, setup(1), peekingReliability(W, () => 1), START);
    const B = runSeq(W, setup(0.05), peekingReliability(W, (key) => (key === k ? 0.05 : 1)), START);
    const first = A.edges.indexOf(k);
    assert.ok(first >= 0);
    assert.ok(checkInvariance(A.seq, B.seq, first + 1).length > 0, 'a reliability-peeking agent was not caught');
  }],
  ['MUTANT (peeks topology): caught by checkInvariance before an endpoint of the extra edge is visited', () => {
    const dG = distancesTo(W, GOAL);
    const firstStep = (world) => { const d = distancesTo(world, GOAL); let best = 0; world.exitOrder[START].forEach((v, i) => { if (d[v] < d[world.exitOrder[START][best]]) best = i; }); return best; };
    const pair = [...Array(W.n).keys()].flatMap((x) => [...Array(W.n).keys()].map((y) => [x, y]))
      .find(([x, y]) => x < y && x !== START && y !== START && !W.adj[x].includes(y) && dG[x] >= 0 && firstStep(withExtraEdge(W, x, y)) !== firstStep(W));
    assert.ok(pair, 'need an extra edge that changes the shortest first step');
    const W2 = withExtraEdge(W, ...pair);
    const setup = (env) => { env.setRewardNode(GOAL); env.setCue(GOAL); };
    const A = runSeq(W, setup, peekingTopology(W), START), B = runSeq(W2, setup, peekingTopology(W2), START);
    const firstVisit = A.seq.findIndex(([lab]) => lab === W.labelOf[pair[0]] || lab === W.labelOf[pair[1]]);
    assert.ok(checkInvariance(A.seq, B.seq, firstVisit < 0 ? STEPS : firstVisit).length > 0, 'a topology-peeking agent was not caught');
  }],
  ['the invariance helper itself flags any difference before the allowed index', () => {
    assert.ok(checkInvariance([[1, 0], [2, 1]], [[1, 0], [2, 0]], 2).length > 0);
    assert.deepEqual(checkInvariance([[1, 0], [2, 1]], [[1, 0], [2, 0]], 1), []);
    void makeStream;
  }],
];

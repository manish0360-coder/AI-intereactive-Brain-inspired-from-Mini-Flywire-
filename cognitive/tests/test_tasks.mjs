// CF-01 tests — task layouts, task runs, determinism, oracle bounds (dev domain only)
import assert from 'node:assert/strict';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { layout, runTask, TASK_PARAMS } from '../testbed/tasks.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { makeAgentFor, runSteps } from '../testbed/runner.mjs';
import { checkDeterminism } from '../testbed/checks.mjs';

const DEV = Array.from({ length: 8 }, (_, i) => `cf|dev|world|${i}`);

export const tests = [
  ['layouts satisfy their constraints on dev worlds', () => {
    for (const l of DEV) {
      const w = generateWorld(l);
      const e1 = layout('E1', w, l); assert.ok(e1 && distancesTo(w, e1.goal)[e1.start] >= 3);
      const e2 = layout('E2', w, l); assert.ok(e2, `E2 layout missing for ${l}`);
      const d = distancesTo(w, e2.goal)[e2.start], d2 = distancesTo(w, e2.goal, new Set([edgeKey(...e2.blocked)]))[e2.start];
      assert.ok(d >= 3 && d2 > d && d2 > 0, `E2 ${l}: ${d} -> ${d2}`);
      const e3 = layout('E3', w, l); assert.ok(e3, `E3 layout missing for ${l}`);
      const dS = distancesTo(w, e3.start);
      assert.ok(e3.goal1 !== e3.goal2 && dS[e3.goal1] >= 2 && dS[e3.goal2] >= 3);
      assert.notEqual(dS[e3.goal2] + distancesTo(w, e3.goal1)[e3.goal2], dS[e3.goal1]);
    }
  }],
  ['runTask is deterministic for every task, agent and arm', () => {
    const l = DEV[0], w = generateWorld(l);
    for (const kind of ['RANDOM', 'QL', 'DYNAQ', 'ORACLE']) for (const [task, arm] of [['E1', 'EXPLORED'], ['E1', 'NAIVE'], ['E2', 'STD'], ['E3', 'STD']]) {
      assert.deepEqual(checkDeterminism(runTask({ task, world: w, worldLabel: l, kind, arm }), runTask({ task, world: w, worldLabel: l, kind, arm })), []);
    }
  }],
  ['ORACLE test-phase steps equal the true distances (E1: d, E2: detour d, E3: d to the new goal)', () => {
    for (const l of DEV.slice(0, 4)) {
      const w = generateWorld(l);
      const r1 = runTask({ task: 'E1', world: w, worldLabel: l, kind: 'ORACLE', arm: 'NAIVE' });
      assert.equal(r1.metric, TASK_PARAMS.E1.testEpisodes * r1.layout.distance);
      const r2 = runTask({ task: 'E2', world: w, worldLabel: l, kind: 'ORACLE' });
      assert.equal(r2.metric, TASK_PARAMS.E2.testEpisodes * r2.layout.detourDistance);
      const r3 = runTask({ task: 'E3', world: w, worldLabel: l, kind: 'ORACLE' });
      assert.equal(r3.metric, TASK_PARAMS.E3.testEpisodes * r3.layout.distance2);
    }
  }],
  ['E1 negative-control premise: QL learns nothing from unrewarded exploration (every Q stays 0)', () => {
    const l = DEV[1], w = generateWorld(l);
    const env = new GraphEnv(w, { seedLabel: `${l}|E1|env` }); env.setRewardNode(null); env.setCue(null);
    const a = makeAgentFor('QL', env, `${l}|E1|agent`);
    runSteps(env, a, { total: TASK_PARAMS.E1.exploreSteps, episodeLength: TASK_PARAMS.E1.exploreEpisodeLength });
    assert.ok(Object.values(a.inspect().q).every((row) => row.every((x) => x === 0)));
  }],
  ['every task row reports test steps, a metric and its censoring count', () => {
    const l = DEV[2], w = generateWorld(l);
    for (const task of ['E1', 'E2', 'E3']) {
      const r = runTask({ task, world: w, worldLabel: l, kind: 'QL', arm: task === 'E1' ? 'EXPLORED' : 'STD' });
      assert.equal(r.testSteps.length, TASK_PARAMS[task].testEpisodes);
      assert.equal(r.metric, r.testSteps.reduce((a, b) => a + b, 0));
      assert.ok(r.censored >= 0 && r.censored <= r.testSteps.length);
      r.testSteps.forEach((s) => assert.ok(s >= 1 && s <= TASK_PARAMS[task].cap));
    }
  }],
];

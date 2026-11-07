// CF-03 tests — core isolation, privilege rule, parity with the CF-01 tasks, determinism, reporting
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../testbed/worlds.mjs';
import { runTask } from '../testbed/tasks.mjs';
import { runTaskV1, reliabilities } from '../testbed/tasks_v1.mjs';
import { runE2P } from '../testbed/task_e2p.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { AGENTS_V1, CORE_FILES, MBVI_VARIANTS, agentOptionsV1, makeAgentForV1 } from '../testbed/registry_v1.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege, checkDeterminism, checkGlobals } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';

const CORE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'core');
const CORE_ALLOWED = ['../testbed/agent_util.mjs', './world_model.mjs', './planner.mjs'];
const DEV = ['cf|dev|world|0', 'cf|dev|world|1'];

export const tests = [
  ['core modules import only agent_util.mjs and each other, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(CORE_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...CORE_FILES].sort());
    for (const f of CORE_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(CORE_DIR, f), 'utf8'), CORE_ALLOWED, f), []);
  }],
  ['MUTANT: a core module importing the environment, or using Math.random, is caught', () => {
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../testbed/env.mjs';", CORE_ALLOWED).length > 0);
    assert.ok(checkSourceIsolation("import { x } from '../testbed/worlds.mjs';", CORE_ALLOWED).length > 0);
    assert.ok(checkSourceIsolation('export const f = () => Math.random();', CORE_ALLOWED).length > 0);
  }],
  ['privilege: only ORACLE receives the oracle channel under the v1 registry; a granting mutant is caught', () => {
    const env = new GraphEnv(generateWorld(DEV[0]), { seedLabel: 'cf|dev|v1|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V1), PRIVILEGED, (k) => agentOptionsV1(k, env, 'x')), []);
    assert.ok(checkPrivilege(Object.keys(AGENTS_V1), PRIVILEGED, (k) => ({ ...agentOptionsV1(k, env, 'x'), oracle: {} })).length > 0);
  }],
  ['PARITY: tasks_v1 E1 and E3 reproduce CF-01 tasks.mjs rows byte for byte for the CF-01 agents', () => {
    for (const l of DEV) {
      const w = generateWorld(l);
      for (const kind of ['RANDOM', 'QL', 'DYNAQ', 'ORACLE']) for (const [task, arm] of [['E1', 'EXPLORED'], ['E1', 'NAIVE'], ['E3', 'STD']]) {
        assert.equal(JSON.stringify(runTaskV1({ task, world: w, worldLabel: l, kind, arm })), JSON.stringify(runTask({ task, world: w, worldLabel: l, kind, arm })), `${l} ${kind} ${task}`);
      }
    }
  }],
  ['MBVI and every ablation are deterministic on E1, E3, E1S and E2P', () => {
    const l = DEV[0], w = generateWorld(l);
    for (const kind of Object.keys(MBVI_VARIANTS)) {
      for (const [task, arm] of [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED']]) assert.deepEqual(checkDeterminism(runTaskV1({ task, world: w, worldLabel: l, kind, arm }), runTaskV1({ task, world: w, worldLabel: l, kind, arm })), []);
      assert.deepEqual(checkDeterminism(runE2P({ world: w, worldLabel: l, kind, arm: 'PRE', makeAgent: makeAgentForV1 }), runE2P({ world: w, worldLabel: l, kind, arm: 'PRE', makeAgent: makeAgentForV1 })), []);
    }
  }],
  ['MBVI rows report planning compute and model quality', () => {
    const l = DEV[1], w = generateWorld(l);
    const r = runTaskV1({ task: 'E1S', world: w, worldLabel: l, kind: 'MBVI', arm: 'EXPLORED' });
    const c = r.secondary.compute, q = r.secondary.quality;
    assert.ok(c.decisions > 600 && c.backups > c.decisions && c.budget === 100);
    assert.ok(q.n > 0 && Number.isFinite(q.meanLL) && q.ece >= 0 && q.ece <= 1);
    const e = runE2P({ world: w, worldLabel: l, kind: 'MBVI', arm: 'PRE', makeAgent: makeAgentForV1 });
    assert.ok(e.secondary.compute && e.secondary.compute.decisions > 0);
  }],
  ['E1S reliabilities are in [0.5, 1], one per edge, deterministic', () => {
    const w = generateWorld(DEV[0]); const r1 = reliabilities(w, DEV[0]), r2 = reliabilities(w, DEV[0]);
    assert.deepEqual(r1, r2); assert.equal(r1.length, w.edges.length); assert.ok(r1.every(([, , p]) => p >= 0.5 && p <= 1));
  }],
  ['running MBVI tasks creates no global variables', () => {
    const before = Object.keys(globalThis); const l = DEV[0], w = generateWorld(l);
    runTaskV1({ task: 'E3', world: w, worldLabel: l, kind: 'MBVI' });
    assert.deepEqual(checkGlobals(before, Object.keys(globalThis)), []);
  }],
];

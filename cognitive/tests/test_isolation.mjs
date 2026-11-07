// CF-01 tests — isolation of agents from the environment (handbook §13)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS, AGENT_FILES, PRIVILEGED, agentOptions, makeAgentFor, runEpisode } from '../testbed/runner.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld } from '../testbed/worlds.mjs';
import { runTask } from '../testbed/tasks.mjs';
import { checkAgentSource, checkPrivilege, checkObservation, checkGlobals } from '../testbed/checks.mjs';

const AGENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'agents');
const W = generateWorld('cf|dev|world|3');

export const tests = [
  ['every agent file imports only agent_util.mjs and uses no forbidden API', () => {
    const files = fs.readdirSync(AGENT_DIR).filter((f) => f.endsWith('.mjs')).sort();
    assert.deepEqual(files, [...AGENT_FILES].sort(), 'the agent directory holds exactly the registered agents');
    for (const f of files) assert.deepEqual(checkAgentSource(fs.readFileSync(path.join(AGENT_DIR, f), 'utf8'), f), []);
  }],
  ['only privileged kinds receive the oracle channel', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|dev|iso' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS), PRIVILEGED, (k) => agentOptions(k, env, 'cf|dev|iso|agent')), []);
  }],
  ['agent options hold only rng and params (plus oracle for privileged kinds): no environment or world reference', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|dev|iso' });
    for (const k of Object.keys(AGENTS)) {
      const o = agentOptions(k, env, 'cf|dev|iso|agent');
      assert.deepEqual(Object.keys(o).sort(), PRIVILEGED.includes(k) ? ['oracle', 'params', 'rng'] : ['params', 'rng']);
      if (o.oracle) assert.deepEqual(Object.keys(o.oracle), ['bestAction']);
    }
  }],
  ['every observation an agent receives during whole tasks passes the schema check', () => {
    const seen = [];
    const env = new GraphEnv(W, { seedLabel: 'cf|dev|iso|probe' });
    env.setRewardNode(5); env.setCue(5);
    const inner = makeAgentFor('QL', env, 'cf|dev|iso|probe|agent');
    const probe = { act: (o) => { seen.push(o); return inner.act(o); }, observe: (t) => { seen.push(t.obs, t.next); assert.ok(Object.isFrozen(t)); inner.observe(t); } };
    for (let e = 0; e < 20; e++) runEpisode(env, probe, { start: 0 });
    assert.ok(seen.length > 100);
    for (const o of seen) assert.deepEqual(checkObservation(o), []);
  }],
  ['running every task with every agent creates no global variables', () => {
    const before = Object.keys(globalThis);
    for (const kind of Object.keys(AGENTS)) for (const [task, arm] of [['E1', 'EXPLORED'], ['E2', 'STD'], ['E3', 'STD']]) runTask({ task, world: W, worldLabel: 'cf|dev|world|3', kind, arm });
    assert.deepEqual(checkGlobals(before, Object.keys(globalThis)), []);
  }],
];

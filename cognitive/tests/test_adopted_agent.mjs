// AD-13 tests: the adopted agent is exactly the CF-06 gate6 primary arm (BELIEF), built through the unchanged registry.
// Only a development world is run here; gate6 worlds are never run again.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../testbed/adopted_agent.mjs';
import { AGENTS_V6 } from '../testbed/registry_v6.mjs';
import { AGENTS_V5 } from '../testbed/registry_v5.mjs';
import { armAgentV6 } from '../testbed/arms_v6.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld } from '../testbed/worlds.mjs';
import { runE5 } from '../testbed/task_e5.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE6_RESULT = path.resolve(HERE, '..', '..', 'experiments', 'cf06', 'results', 'gate6_result.json');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);

// Every effective parameter of the agent that ran on gate6 (code unchanged since the freeze 7ce1dc6).
const GATE6_EFFECTIVE = Object.freeze({
  poolMove: true, poolDest: true, hyperMean0: 0.5, hyperN0: 1, strength0: 2, strengthGrid: [1, 2, 4, 8, 16, 32, 64],
  emIterations: 25, piBlock: 0.05, kappa: 0.25, resets: true, changeHazard: 0.002, changeAlt: 0.9, changeMinN: 5,
  beta0: 0.1, rewardResetMinN: 5, rewardResetTau: 0.05, globalRewardReset: false,
  volHazard: 0.01, rhoA0: 1, rhoB0: 1, rhoFixed: 0.5, rhoIterations: 30,
  gamma: 0.95, budget: 100, theta: 1e-6, vOpt: 1,
});

export const tests = [
  ['ADOPTED AGENT (AD-13): the definition is the gate6 primary arm as recorded in the frozen result file', () => {
    const rec = JSON.parse(fs.readFileSync(GATE6_RESULT, 'utf8')).parameters;
    assert.equal(rec.primary, ADOPTED_AGENT.name);
    const [kind, params, , options] = rec.arms[rec.primary];
    assert.equal(kind, ADOPTED_AGENT.kind);
    assert.deepEqual(params, { ...ADOPTED_AGENT.params });
    assert.equal(options, undefined, 'an ordinary arm, not a diagnostic one');
    assert.ok(Object.isFrozen(ADOPTED_AGENT) && Object.isFrozen(ADOPTED_AGENT.params));
  }],
  ['ADOPTED AGENT: every effective parameter is the one that ran on gate6 (h = 0.01, rho 1/2); no oracle; the baseline is kept', () => {
    const agent = makeAdoptedAgent(new GraphEnv(W, { seedLabel: 'cf|test|ad13' }), 'cf|test|ad13|agent');
    assert.deepEqual({ ...agent._model.params }, { ...GATE6_EFFECTIVE });
    assert.equal(PRIVILEGED.includes(ADOPTED_AGENT.kind), false);
    assert.equal(agent.privileged, undefined);
    assert.equal(AGENTS_V6[ADOPTED_AGENT.baseline], AGENTS_V5.MBVI3, 'MBVI3 is the earlier factory, unchanged');
  }],
  ['ADOPTED AGENT: on an E5 development world it acts step for step as the gate6 arm path (armAgentV6) does', () => {
    const viaDefinition = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: ADOPTED_AGENT.kind, makeAgent: (_k, env, label) => makeAdoptedAgent(env, label) });
    const viaGateArm = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: 'VOL_RHO', makeAgent: armAgentV6(['VOL_RHO', { rhoFixed: 0.5 }]) });
    assert.ok(viaDefinition.secondary.volatility.opened > 0, 'the belief acted: changes were archived');
    assert.deepEqual(viaDefinition, viaGateArm);
  }],
];

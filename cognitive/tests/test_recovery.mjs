// CF-05 tests — the Dyna-Q+ count-model baseline and the MBVI4 recovery candidates (isolation, parity with the
// frozen planner, the two mechanisms' definitions, determinism)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_V5, BASELINE_FILES, BASELINE_ALLOWED, MIND4_FILES, MIND4_ALLOWED, DYNAQP_VARIANTS, MBVI4_VARIANTS, agentOptionsV5, makeAgentForV5 } from '../testbed/registry_v5.mjs';
import { AGENTS_V4 } from '../testbed/registry_v4.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld } from '../testbed/worlds.mjs';
import { runE4 } from '../testbed/task_e4.mjs';
import { runE4B, E4B_ARMS } from '../testbed/task_e4b.mjs';
import { runTaskV1 } from '../testbed/tasks_v1.mjs';
import { runE2P } from '../testbed/task_e2p.mjs';
import { makeDynaQPlus, DYNAQP_DEFAULTS } from '../baselines/dynaq_plus.mjs';
import { makeMBVI4, MBVI4_DEFAULTS } from '../mind/v4/agent.mjs';
import { qValue4, valueIteration4 } from '../mind/v4/planner.mjs';
import { qValue, valueIteration } from '../core/planner.mjs';
import { makeWorldModel3 } from '../mind/v3/world_model.mjs';
import { makeStream } from '../testbed/rng.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.resolve(HERE, '..', 'baselines'), MIND4_DIR = path.resolve(HERE, '..', 'mind', 'v4');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const O = (node, nActions, goal = null) => Object.freeze({ node, nActions, goal });
const T = (obs, action, reward, next, done = false) => Object.freeze({ obs, action, reward, next, done, truncated: false });

export const tests = [
  ['the baseline and v4 modules import only what they are allowed to, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(BASE_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...BASELINE_FILES].sort());
    for (const f of BASELINE_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(BASE_DIR, f), 'utf8'), BASELINE_ALLOWED, f), []);
    assert.deepEqual(fs.readdirSync(MIND4_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND4_FILES].sort());
    for (const f of MIND4_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND4_DIR, f), 'utf8'), MIND4_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../../testbed/env.mjs';", MIND4_ALLOWED).length > 0, 'mutant must be caught');
    assert.ok(checkSourceIsolation('export const f = () => Math.random();', BASELINE_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v5 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|rec|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V5), PRIVILEGED, (k) => agentOptionsV5(k, env, 'cf|test|rec|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V4)) assert.equal(AGENTS_V5[k], AGENTS_V4[k]);
    for (const k of [...Object.keys(DYNAQP_VARIANTS), ...Object.keys(MBVI4_VARIANTS)]) assert.equal(makeAgentForV5(k, env, 'cf|test|rec|priv|agent').kind, k);
  }],

  // ---- the v4 planner and the NONE mode reproduce the frozen planner exactly ----
  ['PARITY: the v4 planner without hooks equals the frozen core planner, value for value', () => {
    const m = makeWorldModel3(); const rnd = makeStream('cf|test|rec|parity');
    for (let s = 1; s <= 6; s++) m.visit(s, 3);
    for (let i = 0; i < 400; i++) { const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 3); m.update(s, a, rnd() < 0.3 ? s : 1 + Math.floor(rnd() * 6), 0, false); }
    const opts = { gamma: 0.95, vOpt: 1, rewardOf: (x) => (x === 4 ? 1 : 0), doneOf: (x) => (x === 4 ? 1 : 0) };
    const Va = new Map(), Vb = new Map();
    const ra = valueIteration(m, Va, { budget: 100, theta: 1e-6, ...opts }), rb = valueIteration4(m, Vb, { budget: 100, theta: 1e-6, ...opts });
    assert.deepEqual(ra, rb); assert.deepEqual([...Va], [...Vb]);
    for (let s = 1; s <= 6; s++) for (let a = 0; a < 3; a++) assert.equal(qValue(m, Va, s, a, opts), qValue4(m, Vb, s, a, opts));
  }],
  ['PARITY: MBVI4 in mode NONE gives exactly the rows of MBVI3 on E4, E1S and the detour task', () => {
    const strip = (r) => ({ ...r, kind: null, secondary: null });
    for (const arm of ['CHANGE', 'SHAM']) assert.deepEqual(strip(runE4({ world: W, worldLabel: LABEL, kind: 'MBVI4_NONE', arm, makeAgent: makeAgentForV5 })), strip(runE4({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm, makeAgent: makeAgentForV5 })));
    assert.deepEqual(strip(runTaskV1({ task: 'E1S', world: W, worldLabel: LABEL, kind: 'MBVI4_NONE', arm: 'EXPLORED', makeAgent: makeAgentForV5 })), strip(runTaskV1({ task: 'E1S', world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'EXPLORED', makeAgent: makeAgentForV5 })));
    assert.deepEqual(strip(runE2P({ world: W, worldLabel: LABEL, kind: 'MBVI4_NONE', arm: 'PRE', makeAgent: makeAgentForV5 })), strip(runE2P({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'PRE', makeAgent: makeAgentForV5 })));
  }],

  // ---- the two mechanisms ----
  ['BONUS: the planned value of a tried pair rises by kappa * sqrt(tau); an untried pair gets no bonus', () => {
    const m = makeWorldModel3(); m.visit(1, 2); m.visit(2, 1); m.update(1, 0, 2, 0, false);
    const base = { gamma: 0.95, vOpt: 1, rewardOf: () => 0, doneOf: () => 0 }, V = new Map([[1, 0.3], [2, 0.4]]);
    const q0 = qValue4(m, V, 1, 0, base);
    for (const tau of [1, 25, 400]) close(qValue4(m, V, 1, 0, { ...base, bonusOf: () => 0.003 * Math.sqrt(tau) }), q0 + 0.003 * Math.sqrt(tau));
    const agent = makeMBVI4({ rng: makeStream('cf|test|rec|bonus'), params: { mode: 'BONUS', kappa: 0.01 } });
    const a = O(1, 2), b = O(2, 1);
    agent.act(a); agent.observe(T(a, 0, 0, b));
    for (let i = 0; i < 50; i++) { agent.act(b); agent.observe(T(b, 0, 0, b)); }     // 50 steps elsewhere
    assert.ok(agent.inspect().recovery.mode === 'BONUS');
    assert.throws(() => makeMBVI4({ rng: makeStream('x'), params: { mode: 'NOPE' } }));
  }],
  ['DECAY: belief about a pair left alone moves toward the belief about an untried pair, by 1 - (1 - hazard)^tau', () => {
    const hazard = 0.01;
    const agent = makeMBVI4({ rng: makeStream('cf|test|rec|decay'), params: { mode: 'DECAY', hazard } });
    const a = O(1, 1), b = O(2, 1), c = O(3, 1);
    // learn that the exit from 1 is dead (ten failures), then spend tau steps elsewhere
    for (let i = 0; i < 10; i++) { agent.act(a); agent.observe(T(a, 0, 0, a)); }
    const model = agent._model, dead = model.predict(1, 0), fresh = model.predict('__untried__', 0);
    assert.ok(dead.self > 0.9, 'the model believes the exit is dead');
    for (let i = 0; i < 100; i++) { agent.act(b); agent.observe(T(b, 0, 0, c)); agent.act(c); agent.observe(T(c, 0, 0, b)); }
    // waiting does not soften the model's own belief (pooling with the pairs seen meanwhile makes it firmer) ...
    assert.ok(model.predict(1, 0).self >= dead.self - 1e-9, 'the model itself still believes the exit is dead');
    // ... and the planning belief is the stated mixture (tau = 200 steps)
    const w = 1 - (1 - hazard) ** 200;
    assert.ok(w > 0.85);
    const mixedSelf = (1 - w) * model.predict(1, 0).self + w * model.predict('__untried__', 0).self;
    assert.ok(mixedSelf < dead.self - 0.2, 'after 200 steps the exit is no longer treated as certainly dead');
    close(fresh.self + fresh.unknown, 1, 1e-12);
    // behaviour: the agent returns to node 1 and re-tests the exit, which MBVI3 (mode NONE) values at its dead estimate
    const none = makeMBVI4({ rng: makeStream('cf|test|rec|decay'), params: { mode: 'NONE' } });
    for (let i = 0; i < 10; i++) { none.act(a); none.observe(T(a, 0, 0, a)); }
    assert.ok(none._V.get(1) !== undefined && agent._V.get(1) !== undefined);
    agent.act(a); none.act(a);
    assert.ok(agent._V.get(1) > none._V.get(1), 'decay makes the abandoned state worth more than the frozen belief does');
  }],
  ['RECALL: an exit declared worse is remembered; only such exits drift back; the memory is dropped when it moves again', () => {
    const agent = makeMBVI4({ rng: makeStream('cf|test|rec|recall'), params: { mode: 'RECALL', hazard: 0.02 } });
    const a = O(1, 2), b = O(2, 1), c = O(3, 1);
    // exit 0 from node 1 works 30 times (to node 2); exit 1 from node 1 never works
    for (let i = 0; i < 30; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
    for (let i = 0; i < 6; i++) { agent.act(a); agent.observe(T(a, 1, 0, a)); }
    assert.equal(agent.inspect().recovery.remembered, 0, 'an exit that never worked is not remembered');
    // now exit 0 stops working
    let k = 0;
    while (agent.inspect().recovery.remembered === 0 && k < 10) { agent.act(a); agent.observe(T(a, 0, 0, a)); k++; }
    assert.ok(k >= 1 && k <= 4, `declared worse and remembered after ${k} failures`);
    assert.equal(agent.inspect().recovery.remembering, 1);
    const model = agent._model;
    assert.ok(model.predict(1, 0).self > 0.5, 'the model now believes the exit is bad');
    // time passes elsewhere; the planning value of node 1 rises because exit 0 may work again, exit 1 gets nothing
    agent.act(a); const before = agent._V.get(1);
    for (let i = 0; i < 150; i++) { agent.act(b); agent.observe(T(b, 0, 0, c)); agent.act(c); agent.observe(T(c, 0, 0, b)); }
    agent.act(O(1, 2, 2));                                   // goal cue 2: reachable only through exit 0
    const hopeful = agent._V.get(1);
    const none = makeMBVI4({ rng: makeStream('cf|test|rec|recall'), params: { mode: 'NONE' } });
    for (let i = 0; i < 30; i++) { none.act(a); none.observe(T(a, 0, 0, b)); none.act(b); none.observe(T(b, 0, 0, a)); }
    for (let i = 0; i < 6; i++) { none.act(a); none.observe(T(a, 1, 0, a)); }
    for (let i = 0; i < k; i++) { none.act(a); none.observe(T(a, 0, 0, a)); }
    for (let i = 0; i < 150; i++) { none.act(b); none.observe(T(b, 0, 0, c)); none.act(c); none.observe(T(c, 0, 0, b)); }
    none.act(O(1, 2, 2));
    assert.ok(hopeful > none._V.get(1) + 0.2, `recall values the way back to the goal (${hopeful}) above the frozen belief (${none._V.get(1)})`);
    assert.ok(before !== undefined);
    // the exit works again: the memory is dropped
    agent.act(a); agent.observe(T(a, 0, 0, b));
    assert.equal(agent.inspect().recovery.remembering, 0);
  }],
  ['E4B: the CHANGE and SHAM arms give exactly the rows of the frozen E4 task; PERMANENT never reopens the edge', () => {
    const core = (r) => ({ windows: r.windows, metric: r.metric, censored: r.censored, layout: r.layout, usedReopened: r.secondary.usedReopened });
    for (const kind of ['MBVI3', 'QL']) for (const arm of ['CHANGE', 'SHAM']) {
      assert.deepEqual(core(runE4B({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV5 })), core(runE4({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV5 })), `${kind} ${arm}`);
    }
    assert.deepEqual(E4B_ARMS, ['CHANGE', 'SHAM', 'PERMANENT']);
    const run = (kind, arm) => runE4B({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV5 });
    const perm = run('ORACLE', 'PERMANENT'), chg = run('ORACLE', 'CHANGE');
    assert.equal(perm.secondary.usedReopened, 0, 'a permanently blocked edge is never crossed');
    assert.equal(perm.windows.postAll, chg.windows.postAll, 'the arms are the same run until the reversal');
    assert.ok(perm.windows.return >= chg.windows.return, 'the reference pays the detour for ever when the block stays');
    assert.throws(() => run('MBVI3', 'NOPE'));
    const longer = runE4B({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'CHANGE', makeAgent: makeAgentForV5, exploreSteps: 1200 });
    assert.notDeepEqual(longer.windows, run('MBVI3', 'CHANGE').windows, 'exploreSteps is honoured');
  }],
  ['E4B CONTEXT: the manipulated pairs handed to makeAgent are the two directions of the manipulated edge', () => {
    let seen = null;
    const spy = (kind, env, label, params, context) => { seen = context; return makeAgentForV5(kind, env, label, params); };
    const r = runE4B({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'CHANGE', makeAgent: spy });
    assert.ok(Object.isFrozen(seen)); assert.equal(seen.manipulatedPairs.length, 2);
    const [u, v] = r.layout.blocked;
    assert.deepEqual(seen.manipulatedPairs, [`${W.labelOf[u]}|${W.exitOrder[u].indexOf(v)}`, `${W.labelOf[v]}|${W.exitOrder[v].indexOf(u)}`]);
    runE4B({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'SHAM', makeAgent: spy });
    const [a, b] = r.layout.sham;
    assert.deepEqual(seen.manipulatedPairs, [`${W.labelOf[a]}|${W.exitOrder[a].indexOf(b)}`, `${W.labelOf[b]}|${W.exitOrder[b].indexOf(a)}`]);
  }],
  ['RECALL DIAGNOSTICS: recallOnly and recallExcept restrict which declared changes are remembered', () => {
    const drive = (params) => {
      const agent = makeMBVI4({ rng: makeStream('cf|test|rec|diag'), params: { mode: 'RECALL', hazard: 0.02, ...params } });
      const a = O(1, 1), b = O(2, 1);
      for (let i = 0; i < 30; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
      for (let i = 0; i < 6; i++) { agent.act(a); agent.observe(T(a, 0, 0, a)); }
      return agent.inspect().recovery.remembered;
    };
    assert.equal(drive({}), 1, 'without a restriction the change is remembered');
    assert.equal(drive({ recallOnly: ['1|0'] }), 1); assert.equal(drive({ recallOnly: ['9|9'] }), 0);
    assert.equal(drive({ recallExcept: ['1|0'] }), 0); assert.equal(drive({ recallExcept: ['9|9'] }), 1);
    assert.equal(drive({ recallOnly: [] }), 0, 'an empty allow-list remembers nothing');
  }],
  ['DEFAULTS: both candidates default to mode NONE, so nothing changes unless a mode is asked for', () => {
    assert.equal(MBVI4_DEFAULTS.mode, 'NONE');
    assert.equal(makeMBVI4({ rng: makeStream('x') }).inspect().recovery.mode, 'NONE');
  }],

  // ---- Dyna-Q+ ----
  ['DYNAQP: the count model samples outcomes in proportion to their counts, and the bonus grows with time untried', () => {
    const agent = makeDynaQPlus({ rng: makeStream('cf|test|rec|dq'), params: { k: 0, kappa: 0.01 } });
    const a = O(1, 2), b = O(2, 1);
    agent.act(a); agent.observe(T(a, 0, 0, b));
    assert.equal(agent.inspect().compute.planningUpdates, 0, 'k = 0 plans nothing');
    assert.equal(agent.inspect().modelPairs, 1);
    const planner = makeDynaQPlus({ rng: makeStream('cf|test|rec|dq2'), params: { k: 50, kappa: 0.01 } });
    for (let i = 0; i < 40; i++) { planner.act(a); planner.observe(T(a, 0, 0, b)); planner.act(b); planner.observe(T(b, 0, 0, a)); }
    const c = planner.inspect().compute;
    assert.equal(c.realSteps, 80); assert.equal(c.planningUpdates, 80 * 50); close(c.updatesPerStep, 50);
    assert.equal(DYNAQP_DEFAULTS.k, 20);
  }],
  ['DYNAQP: with no reward anywhere, an action never tried accumulates value from the bonus alone (it will be re-tested)', () => {
    const agent = makeDynaQPlus({ rng: makeStream('cf|test|rec|dq3'), params: { k: 30, kappa: 0.05, epsilon: 0 } });
    const a = O(1, 2), b = O(2, 1);
    for (let i = 0; i < 60; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
    // action 1 at node 1 was never taken in the real world; greedy choice must now prefer it or tie-break to it eventually
    let took = false;
    for (let i = 0; i < 200 && !took; i++) { const x = agent.act(a); if (x === 1) took = true; agent.observe(T(a, x, 0, x === 1 ? a : b)); if (x === 0) { agent.act(b); agent.observe(T(b, 0, 0, a)); } }
    assert.ok(took, 'the untried action is eventually chosen without any epsilon');
  }],
  ['DETERMINISM: the baseline and both candidates give identical rows on repeated runs', () => {
    for (const [kind, p] of [['DYNAQP', { kappa: 0.003 }], ['MBVI4_BONUS', { kappa: 0.003 }], ['MBVI4_DECAY', { hazard: 0.001 }]]) {
      const run = () => runE4({ world: W, worldLabel: LABEL, kind, arm: 'CHANGE', makeAgent: makeAgentForV5, params: { [kind]: p } });
      assert.deepEqual(run(), run(), kind);
    }
  }],
];

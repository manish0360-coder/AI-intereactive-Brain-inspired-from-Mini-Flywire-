// M14 tests — task E6 (signposted worlds), the kind schema, the schema agent and the M14 library.
// Agents run here only on worlds labelled m14schema|test|*, a namespace the M14 run refuses. No test starts the
// official run: the driver runs this suite itself before it starts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateWorld } from '../testbed/worlds.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { makeStream } from '../testbed/rng.mjs';
import { runE5 } from '../testbed/task_e5.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../testbed/adopted_agent.mjs';
import { KINDS, SIGMA, SIGMA_INV, E6_OBS_KEYS, uniqueRoute, planRoute, signpostKinds, randomKinds, permuteKinds, randomPermutation, conjugate, checkSignposts, SignpostEnv, runWorld } from '../testbed/task_e6.mjs';
import { loopErase, makeKindSchema, fixedSchema } from '../mind/schema/kind_schema.mjs';
import { makeSchemaAgent } from '../mind/schema/agent.mjs';
import { ROOT, E6, CONDITIONS, MARGIN, planTrial, runArm, assertFreshLabels, readingRule, ORACLE_TABLE, LABEL_OF } from '../../experiments/m14_schema/m14_lib.mjs';

const T = (i) => `m14schema|test|${i}`;
const plans = new Map();
const planOf = (i) => { if (!plans.has(i)) plans.set(i, planTrial(T(i))); return plans.get(i); };
const MIND_SCHEMA_ALLOWED = {
  'kind_schema.mjs': [],
  'agent.mjs': ['../../testbed/agent_util.mjs', '../../core/planner.mjs', '../v6/world_model.mjs', '../v6/agent.mjs'],
};

export const tests = [
  ['M14 E6 ROUTES AND SIGNPOSTS: every trial world has a unique route of the set length, and its kinds signpost it exactly under the relation used', () => {
    for (let i = 0; i < 5; i++) {
      const P = planOf(i);
      assert.equal(P.excluded, null, `${T(i)}: ${P.excluded}`);
      assert.equal(P.train.length, E6.trainWorlds);
      P.train.forEach((t, k) => {
        assert.equal(t.plan.route.length, E6.trainDistance + 1);
        assert.deepEqual(uniqueRoute(t.world, t.plan.start, t.plan.goal), t.plan.route);
        assert.equal(t.kinds[t.plan.route[0]], k % KINDS, 'training phases cycle so that every link of the relation is shown');
        assert.deepEqual(checkSignposts(t.world, t.plan.route, t.kinds, SIGMA), []);
        assert.deepEqual(checkSignposts(t.world, t.plan.route, t.shuffledKinds, conjugate(SIGMA, t.perm)), [], 'a renamed world is signposted under the renamed relation');
      });
      const { world, plan, kinds } = P.test;
      assert.equal(plan.route.length, E6.testDistance + 1);
      assert.deepEqual(checkSignposts(world, plan.route, kinds.COMPOSE, SIGMA), []);
      assert.deepEqual(checkSignposts(world, plan.route, kinds.REVERSED, SIGMA_INV), []);
      assert.ok(kinds.NULL.every((k) => k >= 0 && k < KINDS));
      assert.ok(P.train.every((t) => t.label !== P.test.label));
    }
    // a misleading signpost is caught
    const P = planOf(0), bad = [...P.test.kinds.COMPOSE], r = P.test.plan.route;
    const i = r.findIndex((u, j) => j < r.length - 1 && P.test.world.exitOrder[u].some((x) => x !== r[j + 1] && x !== r[j - 1]));
    const v = P.test.world.exitOrder[r[i]].find((x) => x !== r[i + 1] && x !== r[i - 1]);
    bad[v] = SIGMA[bad[r[i]]];
    assert.ok(checkSignposts(P.test.world, r, bad, SIGMA).length > 0);
    assert.equal(JSON.stringify(planTrial(T(0)).test.kinds), JSON.stringify(P.test.kinds), 'planning is a pure function of the label');
  }],
  ['M14 COMPOSITION IS UNSEEN: no training route shows more than two links in a row, and the test route needs four', () => {
    for (let i = 0; i < 5; i++) {
      const P = planOf(i);
      const seq = (route, kinds) => route.map((u) => kinds[u]).join('');
      const testSeq = seq(P.test.plan.route, P.test.kinds.COMPOSE);
      for (const t of P.train) assert.equal(seq(t.plan.route, t.kinds).length, 3, 'a training route shows two links');
      assert.equal(testSeq.length, 5);
    }
  }],
  ['M14 SIGNPOST ENV: observations add only kind and exitKinds, taken from the kinds of this world, and moves are the plain environment\'s', () => {
    const P = planOf(1), { world, plan } = P.test, kinds = P.test.kinds.COMPOSE;
    const a = new GraphEnv(world, { seedLabel: 'm14schema|test|env', maxSteps: 50 }), b = new GraphEnv(world, { seedLabel: 'm14schema|test|env', maxSteps: 50 });
    const s = new SignpostEnv(b, world, kinds);
    let oa = a.reset({ start: plan.start }), ob = s.reset({ start: plan.start });
    const rnd = makeStream('m14schema|test|actions');
    for (let t = 0; t < 30; t++) {
      assert.deepEqual(Object.keys(ob), [...E6_OBS_KEYS]);
      assert.equal(ob.node, oa.node); assert.equal(ob.nActions, oa.nActions);
      const u = world.nodeOfLabel.get(ob.node);
      assert.equal(ob.kind, kinds[u]); assert.deepEqual([...ob.exitKinds], world.exitOrder[u].map((x) => kinds[x]));
      assert.ok(Object.isFrozen(ob) && Object.isFrozen(ob.exitKinds));
      const act = Math.floor(rnd() * oa.nActions);
      const ra = a.step(act), rb = s.step(act);
      assert.equal(ra.obs.node, rb.obs.node); assert.equal(ra.done, rb.done);
      oa = ra.obs; ob = rb.obs;
      if (ra.done || ra.truncated) break;
    }
    assert.deepEqual(a.trace(), s.trace());
  }],
  ['M14 IDENTITY: with no schema, or a schema that has learned nothing, the schema agent acts exactly as the adopted agent (E6 and E5)', () => {
    const P = planOf(2), { world, plan } = P.test;
    for (const c of CONDITIONS) {
      const run = (agent) => runWorld({ world, plan, kinds: P.test.kinds[c], agent, episodes: 3, cap: E6.cap, envLabel: 'm14schema|test|id' });
      const base = run(makeAdoptedAgent(null, 'm14schema|test|id|agent'));
      assert.deepEqual(run(makeSchemaAgent({ rng: makeStream('m14schema|test|id|agent'), params: { ...ADOPTED_AGENT.params } })), base);
      assert.deepEqual(run(makeSchemaAgent({ rng: makeStream('m14schema|test|id|agent'), params: { ...ADOPTED_AGENT.params }, schema: makeKindSchema(KINDS) })), base);
    }
    const W = generateWorld('m14schema|test|e5');
    // E5 rows carry the agent's own inspect() output (diagnostics, secondary); everything the run did must match
    const e5 = (makeAgent) => { const { diagnostics, secondary, ...rest } = runE5({ world: W, worldLabel: 'm14schema|test|e5', family: 'HALF', kind: ADOPTED_AGENT.kind, makeAgent }); return rest; };
    assert.deepEqual(e5((_k, env, label) => makeSchemaAgent({ rng: makeStream(label), params: { ...ADOPTED_AGENT.params } })), e5((_k, env, label) => makeAdoptedAgent(env, label)));
  }],
  ['M14 CONCRETE IGNORES KINDS: the adopted agent\'s three test conditions are the same run', () => {
    for (let i = 0; i < 3; i++) {
      const row = runArm(planOf(i), 'CONCRETE');
      assert.deepEqual(row.tests.NULL, row.tests.COMPOSE); assert.deepEqual(row.tests.REVERSED, row.tests.COMPOSE);
    }
  }],
  ['M14 ORACLE: with the true relation as its schema, the agent walks the signposted route in its first test episode', () => {
    for (let i = 0; i < 5; i++) {
      const P = planOf(i), row = runArm(P, 'ORACLE_SCHEMA');
      assert.equal(row.tests.COMPOSE[0].steps, E6.testDistance); assert.deepEqual(row.tests.COMPOSE[0].path, P.test.plan.route);
      assert.equal(row.training, null);
    }
  }],
  ['M14 LEARNER: loop erasure, counts, the Beta(1, 1) score, and freezing', () => {
    assert.deepEqual(loopErase([1, 2, 3, 2, 4, 5, 4, 6]), [1, 2, 4, 6]);
    assert.deepEqual(loopErase([1, 2, 1, 3]), [1, 3]);
    assert.deepEqual(loopErase([7]), [7]);
    const s = makeKindSchema(4);
    assert.equal(s.score(0, 1), 0.5);
    // path 10 (kind 0, exits of kinds 1, 2, 2) -> 11 (kind 1, exits 0, 2) -> 12 (kind 2), with a loop through 13
    s.learnEpisode([{ node: 10, kind: 0, exitKinds: [1, 2, 2] }, { node: 13, kind: 3, exitKinds: [0] }, { node: 10, kind: 0, exitKinds: [1, 2, 2] }, { node: 11, kind: 1, exitKinds: [0, 2] }, { node: 12, kind: 2, exitKinds: [1] }]);
    const snap = s.snapshot();
    assert.deepEqual(snap.avail[0], [0, 1, 2, 0]); assert.deepEqual(snap.chosen[0], [0, 1, 0, 0]);
    assert.deepEqual(snap.avail[1], [1, 0, 1, 0]); assert.deepEqual(snap.chosen[1], [0, 0, 1, 0]);
    assert.deepEqual(snap.avail[3], [0, 0, 0, 0], 'the erased loop teaches nothing');
    assert.equal(s.score(0, 1), 2 / 3); assert.equal(s.score(0, 2), 1 / 4);
    s.freeze();
    assert.throws(() => s.learnEpisode([{ node: 1, kind: 0, exitKinds: [1] }, { node: 2, kind: 1, exitKinds: [0] }]), /frozen/);
    const f = fixedSchema(ORACLE_TABLE);
    assert.equal(f.score(0, SIGMA[0]), 1); assert.equal(f.score(0, 0), 0);
    assert.throws(() => f.learnEpisode([]), /cannot learn/);
  }],
  ['M14 LEARNER ON TEST TRIALS: six relation-consistent training worlds teach the relation; the schema is frozen and unchanged through the test worlds', () => {
    for (let i = 0; i < 3; i++) {
      const row = runArm(planOf(i), 'SCHEMA');
      assert.equal(row.schema.relationIsSigma, true, `${T(i)} learned ${row.schema.relation}`);
      assert.equal(row.schema.snapshot.frozen, true);
      assert.ok(row.training.every((t) => t.learned >= 1));
    }
    const P = planOf(0), schema = makeKindSchema(KINDS);
    schema.freeze();
    const agent = makeSchemaAgent({ rng: makeStream('m14schema|test|frozen'), params: { ...ADOPTED_AGENT.params }, schema, learn: true });
    assert.throws(() => runWorld({ world: P.test.world, plan: P.test.plan, kinds: P.test.kinds.COMPOSE, agent, episodes: 1, cap: E6.cap, envLabel: 'm14schema|test|frozen' }), /frozen/);
  }],
  ['M14 ISOLATION: the schema files import only what the adopted agent imports, use no forbidden API, and no agent factory takes an environment or a world', () => {
    const dir = path.join(ROOT, 'cognitive', 'mind', 'schema');
    for (const [f, allowed] of Object.entries(MIND_SCHEMA_ALLOWED)) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(dir, f), 'utf8'), allowed, f), []);
    assert.deepEqual(fs.readdirSync(dir).sort(), Object.keys(MIND_SCHEMA_ALLOWED).sort());
    assert.ok(checkSourceIsolation("import { planTrial } from '../../testbed/task_e6.mjs';", MIND_SCHEMA_ALLOWED['agent.mjs']).length > 0, 'mutant must be caught');
    const src = fs.readFileSync(path.join(dir, 'agent.mjs'), 'utf8');
    assert.match(src, /export function makeSchemaAgent\(\{ rng, params = \{\}, schema = null, learn = false, kind = 'SCHEMA' \}\)/);
  }],
  ['M14 READING RULE: the five lines and the summary follow SPEC.md exactly, with strict inequalities', () => {
    const c = (mean, lo, hi) => ({ n: 165, mean, lo, hi });
    const A = (P1, P2, S, R1 = c(1, -1, 2), reading = 'CONSISTENT') => ({ criteria: { P1, P2, S }, secondary: { R1_reversedHarm: R1 }, gainShapeP1: { reading } });
    const ok = { identical: true, testsPassed: true, noExclusions: true, concretePassive: true, oracleFollows: true };
    let r = readingRule(A(c(30, 25, 35), c(20, 15, 25), c(0, -3, 4)), ok);
    assert.equal(r.summary, 'LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS, WITHIN THE SAFETY MARGIN');
    assert.deepEqual(r.lines, { validity: 'VALID', transfer: 'SHOWN', relationalContent: 'SHOWN', safety: 'SAFE', reversal: 'NOT SHOWN' });
    r = readingRule(A(c(30, 25, 35), c(20, 15, 25), c(0, -3, MARGIN)), ok);
    assert.equal(r.lines.safety, 'NOT SHOWN SAFE', 'the upper bound must be strictly below the margin');
    assert.equal(r.summary, 'LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS; SAFETY NOT SHOWN');
    r = readingRule(A(c(30, 25, 35), c(20, 15, 25), c(0, -3, 4), c(5, 1, 9), 'TAIL-DRIVEN (median not positive)'), ok);
    assert.equal(r.summary, 'LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS, WITHIN THE SAFETY MARGIN — FROM A MINORITY OF LABELS');
    assert.equal(r.lines.reversal, 'MISLED WHEN REVERSED');
    r = readingRule(A(c(30, 25, 35), c(2, -1, 5), c(0, -3, 4)), ok);
    assert.equal(r.summary, 'A BENEFIT IS SHOWN, BUT NOT ATTRIBUTABLE TO THE LEARNED RELATION');
    assert.equal(r.lines.relationalContent, 'NOT SHOWN');
    r = readingRule(A(c(30, 0, 35), c(20, 15, 25), c(0, -3, 4)), ok);
    assert.equal(r.summary, 'TRANSFER NOT SHOWN', 'a lower bound of exactly 0 does not pass');
    r = readingRule(A(c(-9, -12, -6), c(20, 15, 25), c(0, -3, 4)), ok);
    assert.equal(r.summary, 'TRANSFER REVERSED');
    r = readingRule(A(c(30, 25, 35), c(20, 15, 25), c(0, -3, 4)), { ...ok, concretePassive: false });
    assert.equal(r.summary, 'INVALID — NO CRITERION IS INTERPRETED'); assert.equal(r.lines.validity, 'INVALID (concretePassive)');
  }],
  ['M14 REFUSALS: the driver refuses an unknown domain and a smoke run without an outside output file (it is never started on the gate domain here)', () => {
    const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'experiments', 'm14_schema', 'run_m14.mjs'), ...a], { cwd: ROOT, encoding: 'utf8' });
    let r = run('--domain', 'bogus');
    assert.equal(r.status, 2); assert.match(r.stderr, /--domain must be smoke or m14/);
    r = run('--domain', 'smoke', '--labels', '1');
    assert.equal(r.status, 2); assert.match(r.stderr, /outside the repository/);
    r = run('--domain', 'smoke', '--labels', '1', '--out', path.join(ROOT, 'experiments', 'm14_schema', 'smoke.json'));
    assert.equal(r.status, 2); assert.match(r.stderr, /outside the repository/);
  }],
  ['M14 NAMESPACE: the run accepts only m14schema|gate|* labels', () => {
    assert.doesNotThrow(() => assertFreshLabels([LABEL_OF.m14(0), LABEL_OF.m14(164)]));
    for (const bad of [LABEL_OF.dev(0), LABEL_OF.smoke(0), T(0), 'cf|dev|world|0', 'm13|modular|0', 'mfw|m11|0']) assert.throws(() => assertFreshLabels([bad]));
  }],
];

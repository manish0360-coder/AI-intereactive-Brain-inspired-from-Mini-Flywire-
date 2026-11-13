// CF-04 tests — task E4 (layout, phases, windows, determinism) and the arbitration agent (isolation, control log,
// signals, the random-switch control)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_V4, ARB_FILES, ARB_ALLOWED, ARB_VARIANTS, agentOptionsV4, makeAgentForV4 } from '../testbed/registry_v4.mjs';
import { AGENTS_V3 } from '../testbed/registry_v3.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { runE4, layoutE4, reliabilitiesE4, E4_PARAMS, E4_ARMS } from '../testbed/task_e4.mjs';
import { makeARB, ARB_DEFAULTS } from '../mind/arb/agent.mjs';
import { makeStream } from '../testbed/rng.mjs';

const ARB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mind', 'arb');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const O = (node, nActions, goal = null) => Object.freeze({ node, nActions, goal });
const T = (obs, action, reward, next, done = false) => Object.freeze({ obs, action, reward, next, done, truncated: false });

export const tests = [
  ['the arbitration module imports only agent_util.mjs and the v3 agent, and uses no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(ARB_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...ARB_FILES].sort());
    for (const f of ARB_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(ARB_DIR, f), 'utf8'), ARB_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../../testbed/env.mjs';", ARB_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v4 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|arb|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V4), PRIVILEGED, (k) => agentOptionsV4(k, env, 'cf|test|arb|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V3)) assert.equal(AGENTS_V4[k], AGENTS_V3[k]);
    for (const k of Object.keys(ARB_VARIANTS)) assert.equal(makeAgentForV4(k, env, 'cf|test|arb|priv|agent').kind, k);
  }],
  ['E4 LAYOUT: the blocked edge lies on a shortest route and lengthens it; the sham edge lies on none', () => {
    for (let i = 0; i < 12; i++) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), L = layoutE4(w, label);
      assert.ok(L, `world ${i} has a layout`);
      const d = distancesTo(w, L.goal)[L.start];
      assert.equal(d, L.distance); assert.ok(d >= E4_PARAMS.minDistance);
      const cut = distancesTo(w, L.goal, new Set([edgeKey(...L.blocked)]))[L.start];
      assert.equal(cut, L.detourDistance); assert.ok(cut > d, 'blocking lengthens the route');
      assert.equal(distancesTo(w, L.goal, new Set([edgeKey(...L.sham)]))[L.start], d, 'the sham block leaves the shortest route unchanged');
    }
    const rel = reliabilitiesE4(W, LABEL);
    assert.equal(rel.length, W.edges.length); assert.ok(rel.every(([, , p]) => p >= 0.5 && p <= 1));
    assert.deepEqual(E4_ARMS, ['CHANGE', 'SHAM']);
  }],
  ['E4 RUN: rows are deterministic; windows add up; ORACLE uses the reopened edge and beats every window of a learner', () => {
    const run = (kind, arm) => runE4({ world: W, worldLabel: LABEL, kind, arm, makeAgent: makeAgentForV4 });
    const a = run('MBVI3', 'CHANGE'); assert.deepEqual(a, run('MBVI3', 'CHANGE'));
    for (const k of ['stable', 'post', 'postAll', 'return', 'returnLast']) assert.ok(Number.isInteger(a.windows[k]) && a.windows[k] > 0);
    assert.ok(a.windows.post <= a.windows.postAll); assert.equal(a.metric, a.windows.postAll + a.windows.return);
    const o = run('ORACLE', 'CHANGE');
    assert.ok(o.secondary.usedReopened > 0, 'the oracle returns to the short route');
    assert.ok(o.windows.postAll <= run('QL', 'CHANGE').windows.postAll);
    assert.equal(run('ORACLE', 'SHAM').secondary.usedReopened, 0, 'the sham edge is on no shortest route');
    assert.throws(() => run('MBVI3', 'NOPE'));
  }],
  ['E4 CHANGE against SHAM: before the manipulation the two arms are the same run', () => {
    const c = runE4({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'CHANGE', makeAgent: makeAgentForV4 });
    const s = runE4({ world: W, worldLabel: LABEL, kind: 'MBVI3', arm: 'SHAM', makeAgent: makeAgentForV4 });
    assert.equal(c.windows.stable, s.windows.stable, 'common random numbers: identical until the arms diverge');
  }],
  ['ARB CONTROL LOG: counts are consistent, and the agent is deterministic', () => {
    const run = () => runE4({ world: W, worldLabel: LABEL, kind: 'ARB', arm: 'CHANGE', makeAgent: makeAgentForV4 });
    const a = run(); assert.deepEqual(a, run());
    const c = a.secondary.control;
    assert.ok(c.decisions > 600); assert.ok(c.habitDecisions <= c.decisions); assert.ok(c.decisiveHabit <= c.habitDecisions && c.decisiveHabit <= c.disagreements);
    assert.ok(Math.abs(c.habitShare - c.habitDecisions / c.decisions) < 1e-12); assert.ok(c.switches <= c.decisions);
  }],
  ['ARB SIGNAL: a confidently learned exit that stops working raises the planner signal above the threshold', () => {
    const agent = makeARB({ rng: makeStream('cf|test|arb|signal') });
    const a = O(1, 1), b = O(2, 1);
    for (let i = 0; i < 40; i++) { agent.act(a); agent.observe(T(a, 0, 0, b)); agent.act(b); agent.observe(T(b, 0, 0, a)); }
    const quiet = agent.inspect().control.signals;
    assert.ok(Math.abs(quiet.planner) < 0.02, `a world behaving as predicted gives a planner signal near 0 (${quiet.planner})`);
    agent.act(a); agent.observe(T(a, 0, 0, a));                           // the exit from 1 has stopped working
    const loud = agent.inspect().control.signals;
    assert.ok(loud.planner - loud.habit > ARB_DEFAULTS.theta, `one maximal surprise crosses the threshold (${loud.planner})`);
    assert.ok(ARB_DEFAULTS.rate > ARB_DEFAULTS.theta, 'by construction: a single maximal surprise adds `rate` to the signal');
    const before = agent.inspect().control.habitDecisions;
    agent.act(a);
    assert.equal(agent.inspect().control.habitDecisions, before + 1, 'the habit controller now acts');
  }],
  ['ARB SIGNAL: under stationary noise the habit acts in a minority of decisions, and less with a higher threshold', () => {
    const agent = makeARB({ rng: makeStream('cf|test|arb|noise') }); const rnd = makeStream('cf|test|arb|noise|env');
    const a = O(1, 1), b = O(2, 1);
    let at = a;
    for (let i = 0; i < 3000; i++) { agent.act(at); const moved = rnd() < 0.7; const next = moved ? (at === a ? b : a) : at; agent.observe(T(at, 0, 0, next)); at = next; }
    const c = agent.inspect().control;
    assert.ok(c.habitShare < 0.2, `habit share under stationary noise is ${c.habitShare}`);   // measured about 0.105: noise alone does move the smoothed signal past the threshold some of the time
    const t10 = makeARB({ rng: makeStream('cf|test|arb|noise'), params: { theta: 0.1 } }); const rnd2 = makeStream('cf|test|arb|noise|env'); let at2 = a;
    for (let i = 0; i < 3000; i++) { t10.act(at2); const moved = rnd2() < 0.7; const next = moved ? (at2 === a ? b : a) : at2; t10.observe(T(at2, 0, 0, next)); at2 = next; }
    assert.ok(t10.inspect().control.habitShare < c.habitShare, 'a higher threshold switches less');
  }],
  ['RANDSWITCH: the habit acts at the requested rate, independently of any signal; modes are validated', () => {
    const agent = makeARB({ rng: makeStream('cf|test|arb|rand'), params: { mode: 'RANDOM', mfShare: 0.25 }, kind: 'RANDSWITCH' });
    const a = O(1, 2), b = O(2, 2);
    for (let i = 0; i < 4000; i++) { const x = i % 2 ? a : b, y = i % 2 ? b : a; agent.act(x); agent.observe(T(x, 0, 0, y)); }
    const share = agent.inspect().control.habitShare;
    assert.ok(Math.abs(share - 0.25) < 0.03, `habit share ${share}`);
    const never = makeARB({ rng: makeStream('cf|test|arb|rand0'), params: { mode: 'RANDOM', mfShare: 0 } });
    for (let i = 0; i < 200; i++) { never.act(a); never.observe(T(a, 0, 0, b)); }
    assert.equal(never.inspect().control.habitDecisions, 0);
    assert.throws(() => makeARB({ rng: makeStream('x'), params: { mode: 'NOPE' } }));
  }],
];

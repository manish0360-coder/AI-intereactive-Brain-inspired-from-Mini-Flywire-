// CF-03c tests — world model v3: regression tests for the two defects found in v2, change detection, the E1F task
// and its scoring.  The defect tests assert BOTH that v2 still shows the defect (so the test is not vacuous) and
// that v3 does not.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWorldModel2 } from '../mind/world_model.mjs';
import { makeWorldModel3, WM3_DEFAULTS } from '../mind/v3/world_model.mjs';
import { AGENTS_V3, MBVI3_VARIANTS, MIND3_FILES, MIND3_ALLOWED, agentOptionsV3, makeAgentForV3 } from '../testbed/registry_v3.mjs';
import { AGENTS_V2 } from '../testbed/registry_v2.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation, checkInvariance } from '../testbed/checks_v1.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { generateWorld, edgeKey } from '../testbed/worlds.mjs';
import { runTaskV1 } from '../testbed/tasks_v1.mjs';
import { FAMILIES, FORECASTERS, UNSEEN_FAMILIES, DEV_FAMILY, familyReliabilities, newAccumulator, score, runE1F } from '../testbed/tasks_v3.mjs';
import { makeStream } from '../testbed/rng.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIND3_DIR = path.resolve(HERE, '..', 'mind', 'v3');
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);
const valid = (p) => [p.self, p.unknown, p.blocked, ...p.outcomes.map(([, y]) => y)].every((v) => v >= 0 && v <= 1);
const W = generateWorld('cf|dev|world|5');

/** The sequence that exposes defect 1: five pairs that moved three times each, then one pair that only fails. */
function defect1Sequence(m, failures) {
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) m.update(100 + i, 0, 200 + i, 0, false);
  for (let j = 0; j < failures; j++) m.update(1, 0, 1, 0, false);
}
/** A mixed population like E1S: 40 pairs, reliability U[0.5, 1], 8 attempts each (fixed seed). */
function mixedPopulation(m, label = 'cf|test|v3|mixed') {
  const rnd = makeStream(label);
  for (let i = 0; i < 40; i++) { const p = 0.5 + 0.5 * rnd(); for (let j = 0; j < 8; j++) m.update(100 + i, 0, rnd() < p ? 200 + i : 100 + i, 0, false); }
}
function reliablePopulation(m, pairs = 12, each = 4) {
  for (let i = 0; i < pairs; i++) for (let j = 0; j < each; j++) m.update(100 + i, 0, 200 + i, 0, false);
}

export const tests = [
  ['v3 modules import only agent_util.mjs, the core planner and each other, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(MIND3_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND3_FILES].sort());
    for (const f of MIND3_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND3_DIR, f), 'utf8'), MIND3_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { GraphEnv } from '../../testbed/env.mjs';", MIND3_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v3 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|v3|priv' });
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V3), PRIVILEGED, (k) => agentOptionsV3(k, env, 'cf|test|v3|priv|agent')), []);
    for (const k of Object.keys(AGENTS_V2)) assert.equal(AGENTS_V3[k], AGENTS_V2[k]);
    for (const k of Object.keys(MBVI3_VARIANTS)) assert.equal(makeAgentForV3(k, env, 'cf|test|v3|priv|agent').kind, k);
  }],
  ['MBVI3 is MBVI2 with a different model and nothing else (the two agent sources are identical after renaming)', () => {
    const norm = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/makeWorldModel[23]/g, 'MODEL').replace(/WM[23]_DEFAULTS/g, 'WMD').replace(/MBVI[23]_DEFAULTS/g, 'AD').replace(/makeMBVI[23]/g, 'MAKE').replace(/'MBVI[23]'/g, "'K'")
      .replace(/'\.\.\/\.\.\//g, "'../").replace(/\s+/g, ' ').trim();
    const a = norm(fs.readFileSync(path.join(MIND3_DIR, 'agent.mjs'), 'utf8')), b = norm(fs.readFileSync(path.join(MIND3_DIR, '..', 'mbvi2.mjs'), 'utf8'));
    assert.equal(a, b);
  }],

  // ---- defect 1 ----
  ['DEFECT 1 (regression): v2 gives a never-moved pair P(stay) > 1; v3 keeps every probability in [0, 1]', () => {
    const v2 = makeWorldModel2(); defect1Sequence(v2, 13);
    const bad = v2.predict(1, 0);
    assert.ok(bad.self > 1 && bad.unknown < 0, `v2 must still show the defect (self ${bad.self}, unknown ${bad.unknown})`);
    for (let k = 1; k <= 40; k++) {
      const v3 = makeWorldModel3(); defect1Sequence(v3, k);
      const p = v3.predict(1, 0);
      assert.ok(valid(p), `v3 after ${k} failures: ${JSON.stringify(p)}`); close(total(p), 1, 1e-12);
    }
  }],
  ['DEFECT 1 (property): through random sequences with pairs that never move, every v3 prediction is a valid distribution', () => {
    for (const params of [{}, { poolMove: false }, { poolDest: false }, { piBlock: 0 }, { resets: false }]) {
      const m = makeWorldModel3(params); const rnd = makeStream(`cf|test|v3|prop|${JSON.stringify(params)}`);
      for (let i = 0; i < 2500; i++) {
        const s = 1 + Math.floor(rnd() * 8), a = Math.floor(rnd() * 3);
        const dead = (s + a) % 4 === 0;                                   // a quarter of the pairs can never move
        const s2 = dead || rnd() < 0.3 ? s : 1 + Math.floor(rnd() * 8);
        m.update(s, a, s2, rnd() < 0.1 ? 1 : 0, rnd() < 0.1);
        if (i % 37 === 0) for (let x = 1; x <= 8; x++) for (let b = 0; b < 3; b++) { const p = m.predict(x, b); assert.ok(valid(p), JSON.stringify(p)); close(total(p), 1, 1e-12); }
      }
      const h = m.hyper(); assert.ok(h.mu >= 0 && h.mu <= 1 && h.nu >= 0);
    }
  }],
  ['EMPIRICAL BAYES: the same observations give the same model, whatever the order of unrelated pairs', () => {
    const a = makeWorldModel3(), b = makeWorldModel3();
    mixedPopulation(a); mixedPopulation(b);
    for (let i = 0; i < 40; i++) close(a.predict(100 + i, 0).self, b.predict(100 + i, 0).self, 0);
    const c = makeWorldModel3(); reliablePopulation(c);
    assert.ok(c.hyper().mu > 0.95 && c.predict(1, 0).unknown > 0.9, 'pooling still works: an untried pair in a reliable population is expected to move');
  }],

  // ---- defect 2 ----
  ['DEFECT 2 (regression): one failure after 40 successes resets the pair in v2 and not in v3', () => {
    const v2 = makeWorldModel2(); mixedPopulation(v2);
    for (let j = 0; j < 40; j++) v2.update(1, 0, 9, 0, false);
    v2.update(1, 0, 1, 0, false);
    assert.equal(v2.stats().transitionResets, 1, 'v2 must still show the defect'); assert.equal(v2.countOf(1, 0), 1);
    const v3 = makeWorldModel3(); mixedPopulation(v3);
    const before = v3.stats().changesDown;
    for (let j = 0; j < 40; j++) v3.update(1, 0, 9, 0, false);
    v3.update(1, 0, 1, 0, false);
    assert.equal(v3.stats().changesDown, before, 'one ordinary failure is not a change'); assert.equal(v3.countOf(1, 0), 41);
    assert.ok(1 - v3.predict(1, 0).self > 0.85, 'the edge is still believed reliable');
  }],
  ['CHANGE (worse): repeated failures on that pair are declared a change, and the counts become the failing run', () => {
    const m = makeWorldModel3(); mixedPopulation(m);
    for (let j = 0; j < 40; j++) m.update(1, 0, 9, 0, false);
    const before = m.stats().changesDown;
    let k = 0;
    while (m.stats().changesDown === before && k < 20) { m.update(1, 0, 1, 0, false); k++; }
    assert.ok(k >= 2 && k <= 6, `declared after ${k} consecutive failures`);
    assert.equal(m.countOf(1, 0), k, 'the pair now holds exactly the post-change run');
    assert.ok(m.predict(1, 0).self > 0.5);
  }],
  ['CHANGE (worse, deterministic): after 30 certain successes in a reliable world, the first failure is a change', () => {
    const m = makeWorldModel3(); reliablePopulation(m);
    for (let j = 0; j < 30; j++) m.update(1, 0, 9, 0, false);
    m.update(1, 0, 1, 0, false);
    assert.equal(m.stats().changesDown, 1); assert.equal(m.countOf(1, 0), 1);
    m.update(1, 0, 1, 0, false);
    assert.ok(m.predict(1, 0).self > 0.9, 'two failures in a reliable world: the exit is believed impassable');
  }],
  ['CHANGE (better): an exit believed dead that starts working is re-learned within a few moves', () => {
    const m = makeWorldModel3(); mixedPopulation(m);
    for (let j = 0; j < 15; j++) m.update(1, 0, 1, 0, false);
    assert.ok(1 - m.predict(1, 0).self < 0.1);
    let k = 0;
    while (m.stats().changesUp === 0 && k < 20) { m.update(1, 0, 9, 0, false); k++; }
    assert.ok(k >= 1 && k <= 6, `declared after ${k} moves`);
    assert.ok(1 - m.predict(1, 0).self > 0.7);
  }],
  ['CHANGE (false alarms): on 300 stationary pairs with reliability U[0.5, 1] and 60 attempts each, few changes are declared', () => {
    const m = makeWorldModel3(); const rnd = makeStream('cf|test|v3|stationary');
    for (let i = 0; i < 300; i++) { const p = 0.5 + 0.5 * rnd(); for (let j = 0; j < 60; j++) m.update(1000 + i, 0, rnd() < p ? 2000 + i : 1000 + i, 0, false); }
    const s = m.stats(), declared = s.changesDown + s.changesUp;
    assert.ok(declared <= 30, `${declared} changes declared on 300 stationary pairs (18,000 attempts)`);
    const off = makeWorldModel3({ resets: false }); mixedPopulation(off);
    for (let j = 0; j < 40; j++) off.update(1, 0, 9, 0, false);
    for (let j = 0; j < 10; j++) off.update(1, 0, 1, 0, false);
    assert.equal(off.stats().changesDown, 0, 'resets: false disables change detection');
  }],
  ['RESET (reward): reward change-points are local unless asked otherwise', () => {
    for (const [flag, key] of [[false, 'rewardResets'], [true, 'globalRewardResets']]) {
      const r = makeWorldModel3({ globalRewardReset: flag });
      for (let i = 0; i < 8; i++) { r.update(1, 0, 2, 1, true); r.update(3, 0, 4, 0, false); }
      r.update(1, 0, 2, 0, false);
      assert.equal(r.stats()[key], 1);
      assert.equal(r.rewardProb(4) < 0.1, !flag);
    }
  }],
  ['PARAMETERS: the change threshold is the declared posterior-odds rule', () => {
    close(Math.log((1 - WM3_DEFAULTS.changeHazard) / WM3_DEFAULTS.changeHazard), Math.log(499), 1e-12);
    assert.ok(Math.log(WM3_DEFAULTS.changeAlt / 0.05) < Math.log(499), 'one failure at P(stay) = 0.05 is below the threshold');
  }],

  // ---- task E1F and scoring ----
  ['SCORING: the accumulator computes Brier, log-loss and bins exactly', () => {
    const acc = newAccumulator();
    score(acc, 0.8, 1); score(acc, 0.8, 0); score(acc, 0.25, 0);
    assert.equal(acc.n, 3); close(acc.brier, 0.04 + 0.64 + 0.0625); close(acc.logLoss, -Math.log(0.8) - Math.log(0.2) - Math.log(0.75));
    assert.deepEqual(acc.bins[8], { n: 2, pred: 1.6, hit: 1 }); assert.deepEqual(acc.bins[2], { n: 1, pred: 0.25, hit: 0 });
    const edge = newAccumulator(); score(edge, 1.7, 1); score(edge, -0.2, 0);
    assert.equal(edge.bins[9].n, 1); assert.equal(edge.bins[0].n, 1); assert.ok(Number.isFinite(edge.logLoss));
  }],
  ['FAMILIES: each sampler stays in its declared range; the development family is not among the unseen ones', () => {
    const range = { U5: [0.5, 1], WIDE: [0.1, 1], BIMODAL: [0.55, 0.95], ARCSINE: [0.2, 1], HIGH: [0.9, 1] };
    assert.deepEqual(Object.keys(FAMILIES).sort(), Object.keys(range).sort());
    for (const [name, f] of Object.entries(FAMILIES)) for (let i = 0; i <= 1000; i++) { const p = f(i / 1000); assert.ok(p >= range[name][0] - 1e-12 && p <= range[name][1] + 1e-12, `${name}(${i / 1000}) = ${p}`); }
    assert.ok(!UNSEEN_FAMILIES.includes(DEV_FAMILY)); assert.equal(UNSEEN_FAMILIES.length, 4);
    const rel = familyReliabilities(W, 'cf|dev|world|5', 'BIMODAL').map(([, , p]) => p);
    assert.equal(rel.length, W.edges.length); assert.ok(rel.every((p) => p === 0.95 || p === 0.55));
    assert.deepEqual(familyReliabilities(W, 'cf|dev|world|5', 'U5'), familyReliabilities(W, 'cf|dev|world|5', 'U5'));
  }],
  ['E1F (development family only): every forecaster is scored on the same events; rows are deterministic', () => {
    const run = () => runE1F({ world: W, worldLabel: 'cf|dev|world|5', family: DEV_FAMILY });
    const a = run(); assert.deepEqual(a, run());
    const names = Object.keys(FORECASTERS); assert.deepEqual(Object.keys(a.forecasts).sort(), [...names].sort());
    const n = a.forecasts.V3.all.n;
    assert.ok(n >= 600);
    for (const f of names) {
      const x = a.forecasts[f];
      assert.equal(x.all.n, n, `${f} scored on a different number of events`);
      assert.equal(x.explore.n + x.test.n, n); assert.equal(x.untried.n + x.tried.n, n);
      assert.equal(x.all.bins.reduce((s, b) => s + b.hit, 0), a.forecasts.V3.all.bins.reduce((s, b) => s + b.hit, 0), 'same outcomes');
    }
    assert.equal(a.forecasts.V3.invalid, 0); assert.equal(a.forecasts.CONST.modal.n, 0); assert.equal(a.forecasts.LAPLACE.modal.n, 0);
    assert.ok(a.forecasts.V3.untried.n > 0, 'first attempts are scored');
  }],
  ['E1F: the CONST and LAPLACE forecasters follow their closed forms', () => {
    const c = FORECASTERS.CONST(), l = FORECASTERS.LAPLACE();
    close(c.pMove(1, 0), 0.5); close(l.pMove(1, 0), 0.5);
    for (const [s, a, s2] of [[1, 0, 2], [1, 0, 1], [3, 1, 4], [1, 0, 2]]) { c.update(s, a, s2); l.update(s, a, s2); }
    close(c.pMove(9, 9), 3.5 / 5); close(c.pMove(1, 0), 3.5 / 5);
    close(l.pMove(1, 0), 3 / 5); close(l.pMove(3, 1), 2 / 3); close(l.pMove(9, 9), 0.5);
  }],

  // ---- agent ----
  ['DETERMINISM: MBVI3 gives identical rows on repeated runs', () => {
    const run = () => runTaskV1({ task: 'E1S', world: W, worldLabel: 'cf|dev|world|5', kind: 'MBVI3', arm: 'EXPLORED', makeAgent: makeAgentForV3 });
    assert.deepEqual(run(), run()); assert.equal(run().censored, 0);
  }],
  ['INVARIANCE (hidden reliability): MBVI3 behaves identically until the edge is first attempted, on three edges', () => {
    const START = 0, GOAL = 11;
    const runSeq = (e, p) => {
      const env = new GraphEnv(W, { seedLabel: 'cf|test|v3|inv|env', maxSteps: 80 });
      env.setRewardNode(GOAL); env.setCue(GOAL); env.setReliability(e[0], e[1], p);
      const agent = makeAgentForV3('MBVI3', env, 'cf|test|v3|inv|agent');
      let obs = env.reset({ start: START }); const seq = [], edges = [];
      for (let t = 0; t < 600; t++) {
        const s = env.inspect().pos, a = agent.act(obs);
        seq.push([obs.node, a]); edges.push(edgeKey(s, W.exitOrder[s][a]));
        const r = env.step(a);
        agent.observe(Object.freeze({ obs, action: a, reward: r.reward, next: r.obs, done: r.done, truncated: r.truncated }));
        obs = r.done || r.truncated ? env.reset({ start: START }) : r.obs;
      }
      return { seq, edges };
    };
    let probed = 0;
    for (const i of [3, 7, 12, 19, 25]) {
      const e = W.edges[i], A = runSeq(e, 1), B = runSeq(e, 0.05), first = A.edges.indexOf(edgeKey(...e));
      if (first < 0) continue;
      probed++;
      assert.deepEqual(checkInvariance(A.seq, B.seq, first + 1), []);
    }
    assert.ok(probed >= 3, `only ${probed} probed edges were attempted`);
  }],
];

// M13 tests — the held-out modular-ring family and the generalization driver (experiments/m13_generalization).
// No agent is run on a modular world here: every agent run uses development-family worlds with labels m13test|*,
// which the M13 run never uses. The modular bank is checked for structure only.
// None of these tests may start the official run: the driver runs this suite itself before it starts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateWorld, mfwWorld, isConnected } from '../testbed/worlds.mjs';
import { runE5 } from '../testbed/task_e5.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../testbed/adopted_agent.mjs';
import { MODULAR, BANK_LABEL, modularEdges, buildWorld, makeBank, checkBank } from '../../experiments/m13_generalization/worlds_modular.mjs';
import { structureRecord } from '../../experiments/m13_generalization/structure.mjs';
import { returnMeasures, verifyAgainstRow } from '../../experiments/m13_generalization/measures.mjs';
import { pinDifferences } from '../../experiments/m13_generalization/pins.mjs';
import { ROOT, N_LABELS, ARMS, CORE, assertFreshLabels, runOne, readingRule, MARGIN } from '../../experiments/m13_generalization/m13_lib.mjs';

const HERE = path.join(ROOT, 'experiments', 'm13_generalization');
const DEV = 'm13test|dev|0';
let cache = null;
function runs() {           // five E5 runs on one development-family world (about 2 s each)
  if (cache) return cache;
  const W = generateWorld(DEV);
  cache = {
    W,
    belief: runOne(W, DEV, 'OFTEN', 'BELIEF', false),
    beliefTraced: runOne(W, DEV, 'OFTEN', 'BELIEF', true),
    mbvi3: runOne(W, DEV, 'OFTEN', 'MBVI3', false),
    mbvi3Traced: runOne(W, DEV, 'OFTEN', 'MBVI3', true),
    plain: runE5({ world: W, worldLabel: DEV, family: 'OFTEN', kind: ADOPTED_AGENT.kind, makeAgent: (_k, env, label) => makeAdoptedAgent(env, label) }),
  };
  return cache;
}
const strip = (row) => { const { arm, m13, ...rest } = row; return rest; };

export const tests = [
  ['M13 GENERATOR: a modular ring is a pure function of its label, with 4 modules of 6 nodes, 8 edges inside each, one bridge to the next module in a ring, degree at most 4', () => {
    for (let i = 0; i < 20; i++) {
      const l = BANK_LABEL(i), a = modularEdges(l), b = modularEdges(l);
      assert.deepEqual(a, b, 'deterministic');
      assert.equal(a.n, 24); assert.equal(a.edges.length, 36);
      const deg = new Array(24).fill(0), mod = (u) => Math.floor(u / MODULAR.moduleSize), inside = [0, 0, 0, 0], bridges = new Set();
      for (const [u, v] of a.edges) { deg[u]++; deg[v]++; if (mod(u) === mod(v)) inside[mod(u)]++; else bridges.add([mod(u), mod(v)].sort().join('-')); }
      assert.ok(deg.every((d) => d >= 1 && d <= MODULAR.maxDegree), 'degrees in [1, 4]');
      assert.deepEqual(inside, [8, 8, 8, 8], 'eight edges inside every module');
      assert.deepEqual([...bridges].sort(), ['0-1', '0-3', '1-2', '2-3'], 'one bridge between consecutive modules, in a ring');
      assert.ok(isConnected(buildWorld(l, a.n, a.edges)));
    }
  }],
  ['M13 BUILDER: buildWorld gives exactly the testbed world (generateWorld, mfwWorld) for the same edges', () => {
    for (let i = 0; i < 10; i++) {
      const l = `cf|dev|world|${i}`, g = generateWorld(l);
      assert.deepStrictEqual(buildWorld(l, g.n, g.edges), g);
    }
    const app = mfwWorld(path.join(ROOT, 'connections.json'), 'm13test|app');
    assert.deepStrictEqual(buildWorld('m13test|app', app.n, app.edges), app);
  }],
  ['M13 BANK: graph_bank.json is exactly the generator for m13|modular|0..164; structure.json is exactly its record; the novelty check holds', () => {
    const bank = JSON.parse(fs.readFileSync(path.join(HERE, 'graph_bank.json'), 'utf8'));
    assert.equal(bank.count, N_LABELS);
    assert.ok(checkBank(bank));
    assert.equal(JSON.stringify(bank, null, 1) + '\n', fs.readFileSync(path.join(HERE, 'graph_bank.json'), 'utf8'));
    assert.ok(assertFreshLabels(bank.graphs.map((g) => g.label)));
    const record = structureRecord(makeBank(N_LABELS));
    assert.equal(JSON.stringify(record, null, 1) + '\n', fs.readFileSync(path.join(HERE, 'structure.json'), 'utf8'));
    assert.equal(record.novelty.holds, true);
    assert.ok(record.novelty.bankClusteringP05 > record.novelty.devClusteringP95);
  }],
  ['M13 NAMESPACE: only fresh m13|modular|* labels pass; every earlier namespace is refused', () => {
    for (const bad of ['cf|dev|world|1', 'cf|gate6|world|0', 'mfw|m11|0', 'mfw|m11test|0', 'm13survey|modular|0', 'm13smoke|dev|0', 'm13test|dev|0', 'm13|structure|app|0']) assert.throws(() => assertFreshLabels([bad]));
    assert.throws(() => assertFreshLabels([BANK_LABEL(0), BANK_LABEL(0)]), /duplicate/);
    assert.ok(assertFreshLabels([BANK_LABEL(0), BANK_LABEL(164)]));
  }],
  ['M13 ARMS: BELIEF is the adopted agent; the diagnostic arms carry exactly its parameters plus the archive filter; MBVI3 is the registry baseline', () => {
    assert.equal(ARMS.BELIEF.kind, ADOPTED_AGENT.kind); assert.equal(ARMS.MBVI3.kind, 'MBVI3');
    assert.deepEqual(CORE, ['BELIEF', 'MBVI3']);
    const W = generateWorld(DEV), ctx = { isBlockedPair: () => false };
    const p = (arm) => ARMS[arm].make(new GraphEnv(W, { seedLabel: `${DEV}|${arm}` }), `${DEV}|agent`, ctx)._model.params;
    const base = p('BELIEF');
    assert.equal(base.rhoFixed, 0.5); assert.equal(base.volHazard, 0.01); assert.equal(base.archiveIf, undefined);
    for (const arm of ['BELIEF_REALONLY', 'BELIEF_FALSEONLY']) {
      const q = p(arm);
      assert.equal(typeof q.archiveIf, 'function');
      const { archiveIf, ...rest } = q, { archiveIf: _none, ...baseRest } = base;
      assert.deepEqual(rest, baseRest, `${arm} has the adopted parameters`);
    }
  }],
  ['M13 MEASURES: met, own-window and later crossings and the return delay on a hand-made trace', () => {
    const W = buildWorld('m13test|tiny', 4, [[0, 1], [1, 2], [2, 3], [0, 3]]);
    const a = (s, v) => W.exitOrder[s].indexOf(v);
    const step = (s, v, ok) => [0, 0, s, a(s, v), ok ? v : s, 0];
    // two training steps, then event 0 (edge 0-1, reverses): blocked 3 steps, after 3 steps; event 1 (edge 2-3,
    // permanent): blocked 2 steps, after 2 steps
    const trace = [step(0, 3, true), step(3, 0, true),
      step(0, 1, false), step(0, 3, true), step(3, 2, true),          // event 0 blocked: met (a failed try on 0-1)
      step(2, 1, true), step(1, 2, true), step(2, 1, true),           // event 0 after: no crossing of 0-1
      step(1, 2, true), step(2, 3, false),                            // event 1 blocked
      step(2, 1, true), step(1, 0, true)];                            // event 1 after: crosses 0-1 (later)
    const plan = { events: [{ edge: [0, 1], reverses: true }, { edge: [2, 3], reverses: false }] };
    const row = { world: 'tiny', family: 'X', metric: 10, events: [{ blocked: 3, after: 3, crossed: 0, ownAfterAttempts: 0 }, { blocked: 2, after: 2, ownAfterAttempts: 0 }] };
    const m = returnMeasures(W, trace, row, plan);
    assert.equal(m.reversing, 1); assert.equal(m.met, 1); assert.equal(m.metAndReturned, 1);
    assert.equal(m.returnedOwn, 0); assert.equal(m.returnedOnlyLater, 1); assert.equal(m.crossingsLater, 1);
    assert.deepEqual(m.delays, [11 - 5]);
    assert.ok(verifyAgainstRow(m, row));
    assert.throws(() => verifyAgainstRow(m, { ...row, events: [{ ...row.events[0], crossed: 1 }, row.events[1]] }), /crossings/);
  }],
  ['M13 MEASURES on real runs agree with the task\'s own counts, for BELIEF and MBVI3', () => {
    const r = runs();
    for (const x of [r.belief, r.mbvi3]) {
      assert.ok(x.row.m13 && x.row.m13.events.length === x.row.events.filter((e) => !e.skipped).length);
      assert.ok(verifyAgainstRow(x.row.m13, x.row));
    }
  }],
  ['M13 PASSIVE: keeping the environment reference and the recorder change no row', () => {
    const r = runs();
    assert.equal(JSON.stringify(r.belief.row), JSON.stringify(r.beliefTraced.row), 'BELIEF traced = untraced');
    assert.equal(JSON.stringify(r.mbvi3.row), JSON.stringify(r.mbvi3Traced.row), 'MBVI3 traced = untraced');
    assert.equal(JSON.stringify(strip(r.belief.row)), JSON.stringify(r.plain), 'runOne = runE5 with the adopted agent');
  }],
  ['M13 READING RULE: five independent lines and the summary statement of SPEC.md, on synthetic inputs', () => {
    const c = (mean, lo, hi) => ({ n: 165, mean, lo, hi });
    const ok = { identical: true, testsPassed: true, novelty: true, noExclusions: true };
    const A = (g1, g2, g3, g4, fails = []) => ({ criteria: { G1_mix: g1, G2_RARE_cost: g2, G3_OFTEN_afterReversed: g3, G4_OFTEN_metAndReturned: g4 }, gainShape: { G1_mix: { fails }, G3_OFTEN_afterReversed: { fails: [] } } });
    const all = readingRule(A(c(30, 10, 50), c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8)), ok);
    assert.deepEqual(all.lines, { validity: 'VALID', netAdvantage: 'RETAINED', safety: 'SAFE', recovery: 'SHOWN', behaviouralMechanism: 'SHOWN' });
    assert.equal(all.summary, 'NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN');
    // a G3 or G4 failure does not erase a retained net advantage
    const noMech = readingRule(A(c(30, 10, 50), c(5, 1, 9), c(1, -2, 4), c(0.1, -0.1, 0.3)), ok);
    assert.equal(noMech.summary, 'NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN');
    assert.equal(noMech.lines.recovery, 'NOT SHOWN'); assert.equal(noMech.lines.behaviouralMechanism, 'NOT SHOWN');
    // and a G3 or G4 pass does not create one
    const mechOnly = readingRule(A(c(3, -2, 8), c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8)), ok);
    assert.equal(mechOnly.summary, 'NET ADVANTAGE NOT SHOWN ON THE MODULAR FAMILY'); assert.equal(mechOnly.lines.behaviouralMechanism, 'SHOWN');
    assert.equal(readingRule(A(c(30, 10, 50), c(20, 10, MARGIN), c(10, 4, 16), c(0.5, 0.2, 0.8)), ok).summary, 'NET ADVANTAGE RETAINED ON THE MODULAR FAMILY; SAFETY NOT SHOWN');
    assert.equal(readingRule(A(c(30, 10, 50), c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8), ['median 0']), ok).summary, 'NET ADVANTAGE RETAINED ON THE MODULAR FAMILY, WITHIN THE SAFETY MARGIN — FROM A MINORITY OF LABELS');
    assert.equal(readingRule(A(c(-9, -15, -3), c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8)), ok).summary, 'NET ADVANTAGE REVERSED ON THE MODULAR FAMILY');
    const bad = readingRule(A(c(30, 10, 50), c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8)), { ...ok, identical: false, noExclusions: false });
    assert.equal(bad.summary, 'INVALID — NO CRITERION IS INTERPRETED'); assert.equal(bad.lines.validity, 'INVALID (determinism, exclusions)');
    assert.equal(readingRule(A(c(0, 0, 0), c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8)), ok).lines.netAdvantage, 'NOT SHOWN', 'strict');
    assert.equal(readingRule(A({ n: 0, mean: null, lo: null, hi: null }, c(5, 1, 9), c(10, 4, 16), c(0.5, 0.2, 0.8)), ok).lines.netAdvantage, 'NOT SHOWN', 'empty never passes');
  }],
  ['M13 REFUSALS: the driver refuses an unknown domain and a smoke output inside the repository (no test can start the run)', () => {
    const drv = path.join(HERE, 'run_m13.mjs');
    const bad = spawnSync(process.execPath, [drv, '--domain', 'nope'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(bad.status, 2); assert.match(bad.stderr, /--domain must be smoke or m13/);
    const inside = spawnSync(process.execPath, [drv, '--domain', 'smoke', '--labels', '1', '--out', path.join(HERE, 'smoke.json')], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(inside.status, 2); assert.match(inside.stderr, /outside the repository/);
    assert.ok(!fs.existsSync(path.join(HERE, 'smoke.json')));
  }],
  ['M13 PINS: PINS.json names exactly the files the driver imports, with their current hashes', () => {
    assert.deepEqual(pinDifferences(), []);
  }],
];

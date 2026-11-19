// M15 tests — task E7 (sequences of signposted worlds), the relational belief and its agent, and the M15 library.
// Agents run here only on worlds labelled m15unc|test|*, a namespace the M15 run refuses. No test starts the official
// run: the driver runs this suite itself before it starts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeStream } from '../testbed/rng.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../testbed/adopted_agent.mjs';
import { checkSignposts, runWorld, uniqueRoute } from '../testbed/task_e6.mjs';
import { E7, CONDITIONS, KINDS, SIGMA, SIGMA_INV, planSequence, conditionSequence, noisySignpostKinds, routeVisits } from '../testbed/task_e7.mjs';
import { makeKindBelief, makeBeliefSet, makeFixedBeliefSet, loopErase, observationsOfEpisode, uniqueMode } from '../mind/relation_belief/belief.mjs';
import { makeBeliefAgent } from '../mind/relation_belief/agent.mjs';
import { ROOT, M15, LABEL_OF, assertFreshLabels, assertNumericOrder, drawProbes, scorePoint, binOf, stepsOfPath, routeStream, replay, runLabel } from '../../experiments/m15_uncertainty/m15_lib.mjs';
import { eceOf, aurocOf, clusterBootstrap, aurocBootstrap, readingRule, tuples, BTCOND, classifyCondition, conditionCalibration } from '../../experiments/m15_uncertainty/m15_analysis.mjs';
import { discoveredFiles } from './run_discover.mjs';

const T = (i) => `m15unc|test|${i}`;
const seqs = new Map();
const seqOf = (i) => { if (!seqs.has(i)) seqs.set(i, planSequence(T(i))); return seqs.get(i); };
const near = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol;
const params = () => ({ ...ADOPTED_AGENT.params });
let labelRecord = null;
const recordOf = () => { if (!labelRecord) labelRecord = runLabel(T(0), { windows: [3] }); return labelRecord; };

export const tests = [
  ['M15 E7 SEQUENCES: 28 worlds with unique 4-hop routes, exact kinds signposting SIGMA and SIGMA^-1, a switch point in 2..10, a pure function of the label', () => {
    for (let i = 0; i < 4; i++) {
      const S = seqOf(i);
      assert.equal(S.excluded, null, `${T(i)}: ${S.excluded}`);
      assert.equal(S.worlds.length, E7.warmup + E7.evaluation);
      assert.ok(Number.isInteger(S.s) && S.s >= E7.switchMin && S.s <= E7.switchMax);
      for (const w of S.worlds) {
        assert.equal(w.plan.route.length, E7.distance + 1);
        assert.deepEqual(uniqueRoute(w.world, w.plan.start, w.plan.goal), w.plan.route);
        assert.equal(w.exact[w.plan.route[0]], w.phase);
        assert.equal(w.noisy.kinds[w.plan.route[0]], w.phase);
        assert.equal(w.reversed[w.plan.route[0]], w.phase);
        assert.deepEqual(checkSignposts(w.world, w.plan.route, w.exact, SIGMA), []);
        assert.deepEqual(checkSignposts(w.world, w.plan.route, w.reversed, SIGMA_INV), []);
      }
    }
    assert.equal(JSON.stringify(planSequence(T(1)).worlds.map((w) => [w.exact, w.noisy, w.reversed])), JSON.stringify(seqOf(1).worlds.map((w) => [w.exact, w.noisy, w.reversed])));
  }],
  ['M15 E7 NOISE: corrupted steps go to a kind other than SIGMA(k); the chain continues; off-route neighbours avoid the realised successor kind; decoys carry SIGMA(k)', () => {
    let steps = 0, corrupted = 0;
    for (let i = 0; i < 4; i++) for (const w of seqOf(i).worlds) {
      const r = w.plan.route, K = w.noisy.kinds;
      for (let j = 0; j + 1 < r.length; j++) {
        steps++;
        const bad = w.noisy.corrupted.includes(j);
        if (bad) { corrupted++; assert.notEqual(K[r[j + 1]], SIGMA[K[r[j]]]); } else assert.equal(K[r[j + 1]], SIGMA[K[r[j]]]);
        for (const v of w.world.adj[r[j]]) if (v !== r[j + 1] && !r.includes(v)) assert.notEqual(K[v], K[r[j + 1]], 'an off-route exit never shares the successor kind');
      }
      for (const v of w.noisy.decoys) {
        assert.ok(!r.includes(v));
        const j = r.findIndex((u, x) => x + 1 < r.length && w.world.adj[u].includes(v) && w.noisy.corrupted.includes(x) && K[v] === SIGMA[K[u]]);
        assert.ok(j >= 0, 'a decoy is an off-route neighbour of a corrupted step, with that step\'s SIGMA kind');
      }
    }
    assert.ok(corrupted > 0.1 * steps && corrupted < 0.4 * steps, `corrupted share ${corrupted / steps}`);
    const w = seqOf(0).worlds[0];
    assert.equal(JSON.stringify(noisySignpostKinds(w.world, w.plan.route, SIGMA, w.phase, 0, 'x').corrupted), '[]', 'q = 0 corrupts nothing');
  }],
  ['M15 E7 CONDITIONS: shared worlds, routes and phases; REVERSED equals STABLE before the switch; SPARSE warms up on world 11 only; theta* per condition', () => {
    const S = seqOf(2);
    const C = Object.fromEntries(CONDITIONS.map((c) => [c, conditionSequence(S, c)]));
    assert.equal(C.STABLE.length, 28); assert.equal(C.SPARSE.length, 17);
    assert.equal(C.SPARSE[0].entry.t, 11); assert.equal(C.SPARSE[0].stage, 'warmup'); assert.equal(C.SPARSE[1].e, 0);
    for (const c of CONDITIONS) for (const W of C[c]) assert.equal(W.entry, S.worlds[W.entry.t]);
    for (let e = 0; e < 16; e++) {
      const st = C.STABLE[12 + e], rv = C.REVERSED[12 + e], no = C.NOISY[12 + e];
      if (e < S.s) { assert.equal(rv.kinds, st.kinds); assert.equal(rv.post, null); } else { assert.equal(rv.kinds, S.worlds[12 + e].reversed); assert.equal(rv.post, e - S.s); }
      assert.equal(no.kinds, S.worlds[12 + e].noisy.kinds);
      for (let k = 0; k < KINDS; k++) {
        assert.equal(st.theta(k)[SIGMA[k]], 1);
        assert.ok(near(no.theta(k)[SIGMA[k]], 0.75) && near(no.theta(k)[(SIGMA[k] + 1) % 4], 0.25 / 3));
        assert.equal(rv.theta(k)[e < S.s ? SIGMA[k] : SIGMA_INV[k]], 1);
      }
    }
    assert.ok(C.NOISY.slice(0, 12).every((W) => W.kinds === W.entry.exact), 'the warm-up is exact in every condition');
  }],
  ['M15 OBSERVATION UNIT: loop erasure, then the successor of the FIRST kind-k node; one observation per kind and world on an exact route', () => {
    assert.deepEqual(loopErase([1, 2, 3, 2, 4, 5, 4, 6]), [1, 2, 4, 6]);
    const v = (pairs) => pairs.map(([node, kind]) => ({ node, kind }));
    // path a(0) b(1) c(0) d(2): kind 0 occurs at a and c; the first gives 0 -> 1, the last would give 0 -> 2
    assert.deepEqual(observationsOfEpisode(v([[10, 0], [11, 1], [12, 0], [13, 2]]), 4), [[0, 1], [1, 0]]);
    // a loop through x is erased before the unit is applied
    assert.deepEqual(observationsOfEpisode(v([[10, 0], [20, 3], [10, 0], [11, 1], [13, 2]]), 4), [[0, 1], [1, 2]]);
    for (let i = 0; i < 3; i++) {
      const S = seqOf(i);
      for (const c of ['STABLE', 'REVERSED']) {
        const C = conditionSequence(S, c);
        routeStream(C).forEach((obs, j) => {
          assert.equal(obs.length, 4, 'every kind once on an exact 4-hop route');
          const rel = C[j].post === null ? SIGMA : SIGMA_INV;
          for (const [k, y] of obs) assert.equal(y, rel[k]);
        });
      }
      const W = conditionSequence(S, 'NOISY')[20];
      assert.deepEqual(stepsOfPath(W.entry.plan.route, W.kinds).map(([k, y]) => [k, y]), routeStream([W])[0], 'the evaluator and the belief module apply the same unit');
    }
  }],
  ['M15 BELIEF RULES: FREQ, NEWEST and WINDOW follow their definitions; BOCPD normalises, prunes and nests FREQ; a frozen belief throws', () => {
    const f = makeKindBelief({ rule: 'FREQ', alpha: 0.5 }, 4);
    assert.deepEqual(f.predictive(), [0.25, 0.25, 0.25, 0.25]);
    f.observe(1); f.observe(1); f.observe(2);
    assert.deepEqual(f.predictive(), [0.5 / 5, 2.5 / 5, 1.5 / 5, 0.5 / 5]);
    const n = makeKindBelief({ rule: 'NEWEST' }, 4);
    assert.deepEqual(n.predictive(), [0.25, 0.25, 0.25, 0.25]); n.observe(3); assert.deepEqual(n.predictive(), [0, 0, 0, 1]);
    const w = makeKindBelief({ rule: 'WINDOW', w: 2, alpha: 0.5 }, 4);
    for (const y of [0, 0, 0, 1]) w.observe(y);
    assert.equal(uniqueMode(w.predictive()), 0, 'one contradiction does not reset');
    w.observe(1);
    assert.deepEqual(w.snapshot().counts, [0, 2, 0, 0], 'two agreeing contradictions reset the counts to them');
    w.observe(1); assert.deepEqual(w.snapshot().counts, [0, 3, 0, 0], 'agreeing with the mode does not reset');
    const b = makeKindBelief({ rule: 'BOCPD', h: 0.01, alpha: 0.5 }, 4);
    for (const y of [1, 1, 1, 2, 1, 3, 3, 3]) { b.observe(y); assert.ok(near(b.predictive().reduce((s, x) => s + x, 0), 1, 1e-12)); assert.ok(near(b.snapshot().runs.reduce((s, r) => s + r.p, 0), 1, 1e-9)); }
    assert.ok(b.snapshot().runs.every((r) => r.p >= 1e-12));
    const tiny = makeKindBelief({ rule: 'BOCPD', h: 1e-9, alpha: 0.5 }, 4), fr = makeKindBelief({ rule: 'FREQ', alpha: 0.5 }, 4);
    for (const y of [0, 2, 2, 1, 2]) { tiny.observe(y); fr.observe(y); }
    tiny.predictive().forEach((x, j) => assert.ok(near(x, fr.predictive()[j], 1e-7)), 'BOCPD with h -> 0 is FREQ');
    f.freeze(); assert.throws(() => f.observe(0), /frozen/);
    const fx = makeFixedBeliefSet(4); fx.setTheta((k) => [0, 0, 0, 1].map((_, j) => (j === SIGMA[k] ? 1 : 0)));
    assert.deepEqual(fx.predictive(2), [0, 0, 0, 1]); assert.throws(() => fx.observe(0, 1), /cannot observe/);
    assert.throws(() => makeKindBelief({ rule: 'NOPE' }, 4), /unknown/);
    assert.throws(() => f.observe(4));
  }],
  ['M15 DESIGN CALCULATION: the belief module reproduces the proposal\'s alpha = 1/2 detection-delay table exactly', () => {
    const table = { FREQ: [5, 9, 13, 17, 23, 31], NEWEST: [1, 1, 1, 1, 1, 1], W2: [2, 2, 2, 2, 2, 2], W3: [3, 3, 3, 3, 3, 3], H01: [4, 3, 3, 3, 3, 2], H02: [3, 3, 3, 3, 2, 2], H05: [3, 2, 2, 2, 2, 2], H15: [2, 2, 2, 2, 2, 2] };
    const spec = { FREQ: { rule: 'FREQ', alpha: 0.5 }, NEWEST: { rule: 'NEWEST' }, W2: { rule: 'WINDOW', w: 2, alpha: 0.5 }, W3: { rule: 'WINDOW', w: 3, alpha: 0.5 }, H01: { rule: 'BOCPD', h: 0.01, alpha: 0.5 }, H02: { rule: 'BOCPD', h: 0.02, alpha: 0.5 }, H05: { rule: 'BOCPD', h: 0.05, alpha: 0.5 }, H15: { rule: 'BOCPD', h: 0.15, alpha: 0.5 } };
    for (const [name, row] of Object.entries(table)) {
      [4, 8, 12, 16, 22, 30].forEach((n0, i) => {
        const b = makeKindBelief(spec[name], 4);
        for (let j = 0; j < n0; j++) b.observe(0);
        let m = 0;
        do { b.observe(1); m++; } while (uniqueMode(b.predictive()) !== 1 && m < 40);
        assert.equal(m, row[i], `${name} n0 = ${n0}`);
      });
    }
  }],
  ['M15 IDENTITY: with no belief, or a belief that has learned nothing, the belief agent acts exactly as the adopted agent', () => {
    const S = seqOf(1);
    for (const w of S.worlds.slice(0, 5)) {
      const lbl = `${S.label}|agent|${w.t}`;
      const run = (agent) => runWorld({ world: w.world, plan: w.plan, kinds: w.exact, agent, episodes: 2, cap: E7.cap, envLabel: `${w.label}|env` });
      const base = JSON.stringify(run(makeAdoptedAgent(null, lbl)));
      assert.equal(JSON.stringify(run(makeBeliefAgent({ rng: makeStream(lbl), params: params(), belief: null }))), base);
      assert.equal(JSON.stringify(run(makeBeliefAgent({ rng: makeStream(lbl), params: params(), belief: makeBeliefSet({ rule: 'BOCPD', h: 0.01, alpha: 0.5 }, 4), learn: false }))), base);
      assert.equal(JSON.stringify(run(makeBeliefAgent({ rng: makeStream(lbl), params: params(), belief: makeBeliefSet({ rule: 'NEWEST' }, 4), learn: false }))), base);
    }
  }],
  ['M15 TIE-BREAK: with the true relation the agent walks the signposted route; it absorbs exactly the path\'s observations, or none when not learning', () => {
    const S = seqOf(3);
    for (const w of S.worlds.slice(0, 6)) {
      const lbl = `${S.label}|agent|${w.t}`;
      const fx = makeFixedBeliefSet(4); fx.setTheta((k) => Array.from({ length: 4 }, (_, j) => (j === SIGMA[k] ? 1 : 0)));
      const [o] = runWorld({ world: w.world, plan: w.plan, kinds: w.exact, agent: makeBeliefAgent({ rng: makeStream(lbl), params: params(), belief: fx }), episodes: 1, cap: E7.cap, envLabel: `${w.label}|env` });
      assert.deepEqual(o.path, w.plan.route); assert.equal(o.steps, E7.distance);
      const b = makeBeliefSet({ rule: 'FREQ', alpha: 0.5 }, 4);
      const ag = makeBeliefAgent({ rng: makeStream(lbl), params: params(), belief: b, learn: true });
      const [r] = runWorld({ world: w.world, plan: w.plan, kinds: w.noisy.kinds, agent: ag, episodes: 1, cap: E7.cap, envLabel: `${w.label}|env` });
      assert.deepEqual(ag.absorbed(), r.done ? stepsOfPath(r.path, w.noisy.kinds).map(([k, y]) => [k, y]) : []);
      const quiet = makeBeliefAgent({ rng: makeStream(lbl), params: params(), belief: makeBeliefSet({ rule: 'FREQ', alpha: 0.5 }, 4), learn: false });
      runWorld({ world: w.world, plan: w.plan, kinds: w.exact, agent: quiet, episodes: 1, cap: E7.cap, envLabel: `${w.label}|env` });
      assert.deepEqual(quiet.absorbed(), []);
    }
  }],
  ['M15 PROBES: drawn from theta* by the named stream, identical on every call, never seen by a belief', () => {
    const one = Array.from({ length: 4 }, (_, j) => (j === 2 ? 1 : 0));
    assert.deepEqual(drawProbes(T(9), 'STABLE', 14, 1, one), new Array(64).fill(2));
    const noisy = [0.25 / 3, 0.75, 0.25 / 3, 0.25 / 3];
    let hit = 0, n = 0;
    for (let t = 12; t < 28; t++) for (let k = 0; k < 4; k++) { const d = drawProbes(T(9), 'NOISY', t, k, noisy); assert.deepEqual(d, drawProbes(T(9), 'NOISY', t, k, noisy)); hit += d.filter((x) => x === 1).length; n += d.length; }
    assert.ok(Math.abs(hit / n - 0.75) < 0.03, `share ${hit / n}`);
    const S = seqOf(0), C = conditionSequence(S, 'NOISY'), st = routeStream(C);
    const probesA = (c, t, k, th) => drawProbes(T(0), c, t, k, th), probesB = (c, t, k, th) => drawProbes(`${T(0)}|other`, c, t, k, th);
    const spec = { rule: 'BOCPD', h: 0.01, alpha: 0.5 };
    assert.equal(JSON.stringify(replay(T(0), 'NOISY', C, spec, st, probesA).startHashes), JSON.stringify(replay(T(0), 'NOISY', C, spec, st, probesB).startHashes), 'other probe outcomes, same beliefs');
  }],
  ['M15 SCORING: exact Brier, log score, expected correctness with ties, false alarms, bins and ECE follow SPEC.md', () => {
    const s = scorePoint([0.5, 0.5, 0, 0], [0, 1, 0, 0], [1, 1, 0]);
    assert.equal(s.conf, 0.5); assert.equal(s.a, 0.5); assert.equal(s.pTrue, 0.5); assert.equal(s.brier, 0.5);
    assert.ok(near(s.log, -Math.log(0.5))); assert.equal(s.uniq, 0); assert.equal(s.fa, 0);
    assert.equal(s.pCorr, 1.5); assert.equal(s.pBrier, 1.5); assert.equal(s.pn, 3);
    const t = scorePoint([0.1, 0.2, 0.7, 0], [0, 1, 0, 0], []);
    assert.equal(t.fa, 1); assert.equal(t.uniq, 1); assert.equal(t.a, 0);
    assert.ok(near(t.brier, 0.01 + 0.64 + 0.49)); assert.ok(near(t.log, -Math.log(0.2)));
    const u = scorePoint([0, 0, 1, 0], [0.1, 0.1, 0.7, 0.1], []);
    assert.ok(near(u.log, -(0.3 * Math.log(1e-6))), 'the log score floors p at 1e-6');
    assert.deepEqual([0, 0.0999, 0.1, 0.3, 0.6, 0.7, 0.8999, 0.9, 0.95, 1].map(binOf), [0, 0, 1, 3, 6, 7, 8, 9, 9, 9]);
    const bins = new Array(30).fill(0); bins[27] = 2; bins[28] = 1.8; bins[29] = 1; bins[15] = 2; bins[16] = 1.1; bins[17] = 2;
    const e = eceOf(bins);
    assert.ok(near(e.ece, 0.5 * 0.4 + 0.5 * 0.45)); assert.ok(near(e.direction, 0.5 * -0.4 + 0.5 * 0.45));
    assert.equal(aurocOf([[0.9, 1, 1, 1], [0.5, 1, 0, 1]]), 1);
    assert.equal(aurocOf([[0.5, 1, 1, 2], [0.5, 1, 0, 2]]), 0.5, 'equal confidences count one half');
  }],
  ['M15 BOOTSTRAPS: a constant per-label vector gives a degenerate interval; the AUROC bootstrap estimate equals the pooled AUROC', () => {
    const v = Array.from({ length: 30 }, () => Float64Array.of(3, 4));
    const r = clusterBootstrap(v, 'm15unc|test|boot', (x) => x[0] / x[1], 500);
    assert.equal(r.mean, 0.75); assert.equal(r.lo, 0.75); assert.equal(r.hi, 0.75);
    const rnd = makeStream('m15unc|test|auroc');
    const lists = Array.from({ length: 12 }, () => Array.from({ length: 5 }, () => { const c = Math.round(rnd() * 10) / 10, p = rnd() * 4; return { m: 0, conf: c, pos: p, neg: 4 - p }; }));
    const b = aurocBootstrap(lists, 'm15unc|test|auroc2', 200);
    assert.ok(near(b.mean, aurocOf(lists.flat().map((x) => [x.conf, 0, x.pos, x.pos + x.neg])), 1e-12));
    assert.ok(b.lo <= b.mean && b.mean <= b.hi);
    assert.throws(() => assertNumericOrder(['a|10', 'a|9']));
    assertNumericOrder(['a|2', 'a|10']);
  }],
  ['M15 LABEL RECORD: one label runs every arm and mechanism; V-REV, passive CONCRETE, identity, frozen beliefs and probe isolation hold; delays follow the rules', () => {
    const L = recordOf();
    assert.equal(L.excluded, null);
    for (const [k, v] of Object.entries(L.checks)) assert.equal(v, true, k);
    const D = (m) => L.passive.route[m].delay;
    assert.deepEqual(D('FREQ'), [7, 7, 7, 7], 'counting cannot overturn 14 or more observations within 6');
    assert.deepEqual(D('FROZEN'), [7, 7, 7, 7]);
    assert.deepEqual(D('NEWEST'), [1, 1, 1, 1]);
    assert.deepEqual(D('ORACLE'), [0, 0, 0, 0]);
    assert.ok(D('UA').every((d) => d >= 1 && d <= 6));
    assert.ok(L.passive.route.UA.points instanceof Float64Array && L.passive.route.UA.points.length % 4 === 0);
    assert.ok(tuples(L.passive.route.UA.points).every((x) => x[3] === M15.probes));
    const a = L.passive.route.ORACLE.acc.STABLE;
    assert.equal(a.brier, 0); assert.equal(a.fa, 0); assert.equal(a.a, a.n);
    const u = L.passive.route.UA.acc;
    assert.equal(u.STABLE.srn, u.STABLE.n, 'P(r <= 3) is recorded at every UA belief point');
    assert.ok(u.STABLE.sr > 0 && u.STABLE.sr < u.STABLE.n && u.REV_POST_3_6.sr / u.REV_POST_3_6.srn > u.STABLE.sr / u.STABLE.srn, 'change uncertainty rises after the switch');
    assert.equal(L.passive.route.FREQ.acc.STABLE.srn, 0, 'only a change-point belief has a run length');
    assert.equal(L.closed.STABLE.ORACLE.filter((w) => w.e !== null).every((w) => w.steps === E7.distance), true);
  }],
  ['M15 READING RULE: lines, strict inequalities, transfer gating, BT-COND gating of the full claim, and the wording of the hazard, the window comparison and the four condition results', () => {
    const mk = (name, line, pass) => ({ name, line, pass, n: 10, lo: pass ? 1 : -1, hi: 2, dir: 'lo>', threshold: 0 });
    const names = { T: ['T'], BT: ['BT1', 'BT2a', 'BT2b', 'BT3a', 'BT3b', 'BT3c', 'BT4', 'BT5a', 'BT5b'], CD: ['CD1a', 'CD1b', 'CD2a', 'CD2b', 'CD3a', 'CD3b'], ACT: ['ACT1a', 'ACT1b', 'ACT2a', 'ACT2b', 'ACT3'], MECH: ['MECH-a', 'MECH-b', 'MECH-c'] };
    const build = (fail = []) => Object.entries(names).flatMap(([line, ns]) => ns.map((n) => mk(n, line, !fail.includes(n))));
    const ok = { determinism: true, suite: true, vRev: true, concretePassive: true, noExclusion: true, frozenUnchanged: true, probeIsolation: true, identity: true };
    const sens = { UA_h05: names.BT.map((n) => mk(n, 'BT', n !== 'BT1')) };
    const cond = (ece, lo, hi, loFamily, direction) => { const c = { points: 100, ece, lo, hi, loFamily, direction }; c.classification = classifyCondition(c); return c; };
    const btcOf = (sparse) => {
      const conditions = { STABLE: cond(0.0824, 0.0824, 0.0824, 0.0824, 0.08), NOISY: cond(0.0937, 0.0896, 0.0979, 0.088, -0.07), SPARSE: sparse, REV_PRE: cond(0.0978, 0.0966, 0.0991, 0.096, 0.1) };
      const allPass = Object.values(conditions).every((c) => c.classification === 'PASS');
      return { conditions, complete: true, allPass, line: allPass ? 'SHOWN' : 'NOT SHOWN (x)', pointWeightedMean: 0.1206, pooled: 0.0736 };
    };
    const failSparse = btcOf(cond(0.1945, 0.1945, 0.1945, 0.1945, 0.19)), passAll = btcOf(cond(0.05, 0.04, 0.06, 0.035, 0.05)), inconcl = btcOf(cond(0.11, 0.095, 0.125, 0.09, 0.1));
    // all four PASS: the full name
    let r = readingRule(build(['MECH-c']), sens, ok, passAll);
    assert.match(r.statement, /^CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN, with a development-selected hazard \(h = 0.01\), IN CLOSED-LOOP BEHAVIOUR; /);
    assert.equal(r.lines.calibrationAcrossConditions, 'SHOWN');
    assert.match(r.statement, /not distinguished from a tuned window rule/); assert.match(r.statement, /h = 0.05 .*failed: BT1/);
    // a SPARSE failure prevents the unqualified full claim (the development prediction)
    r = readingRule(build(['MECH-c']), sens, ok, failSparse);
    assert.match(r.statement, /^POOLED CALIBRATION AND CHANGE DETECTION SHOWN \(development-selected h = 0.01\), IN CLOSED-LOOP BEHAVIOUR; CALIBRATION ACROSS CONDITIONS NOT SHOWN: UA materially underconfident in SPARSE \(ECE 0\.195\); /);
    assert.doesNotMatch(r.statement, /CALIBRATED ADAPTIVE/);
    assert.match(r.statement, /BT1 pools the no-change conditions \(pooled exact ECE 0\.074\); UA's exact ECE by condition \(BT-COND, threshold 0\.10\): STABLE 0\.082 \[0\.082, 0\.082\] underconfident, PASS; NOISY 0\.094 \[0\.090, 0\.098\] overconfident, PASS; SPARSE 0\.195 \[0\.195, 0\.195\] underconfident, MATERIAL FAIL; REVERSED before the switch 0\.098 \[0\.097, 0\.099\] underconfident, PASS; point-weighted mean 0\.121$/);
    // an inconclusive condition also prevents it, and is named as inconclusive, not as a failure
    r = readingRule(build([]), sens, ok, inconcl);
    assert.match(r.statement, /CALIBRATION ACROSS CONDITIONS NOT SHOWN: SPARSE inconclusive \(ECE 0\.110 \[0\.095, 0\.125\]\)/); assert.doesNotMatch(r.statement, /CALIBRATED ADAPTIVE|materially/);
    r = readingRule(build(['T']), sens, ok, passAll);
    assert.equal(r.lines.activeBehaviour, 'NOT INTERPRETABLE (transfer not shown)'); assert.doesNotMatch(r.statement, /IN CLOSED-LOOP/);
    r = readingRule(build(['CD2a']), sens, ok, failSparse);
    assert.match(r.statement, /^POOLED CALIBRATED BELIEF TRACKING \(BT, development-selected hazard h = 0.01\): SHOWN; CALIBRATION ACROSS CONDITIONS: NOT SHOWN: UA materially underconfident in SPARSE \(ECE 0\.195\); CHANGE DETECTION: NOT SHOWN/);
    assert.doesNotMatch(r.statement, /CALIBRATED ADAPTIVE/);
    r = readingRule(build([]), sens, ok, passAll); assert.match(r.statement, /outperforms a tuned window rule/);
    // the four condition results are mandatory: without them, or with one missing, the run is INVALID
    r = readingRule(build([]), sens, ok, null);
    assert.equal(r.statement, 'INVALID — NO CRITERION IS INTERPRETED'); assert.match(r.lines.validity, /conditionResults/);
    r = readingRule(build([]), sens, ok, { ...failSparse, complete: false });
    assert.match(r.lines.validity, /conditionResults/);
    r = readingRule(build([]), sens, { ...ok, vRev: false }, passAll);
    assert.equal(r.statement, 'INVALID — NO CRITERION IS INTERPRETED'); assert.match(r.lines.validity, /vRev/);
    assert.match(r.neverClaimed, /uncertainty-aware decision-making/);
  }],
  ['M15 BT-COND: PASS needs the 95% upper bound strictly below 0.10; MATERIAL FAIL needs the four-way Bonferroni lower bound at or above 0.10; one label record gives all four conditions', () => {
    assert.equal(BTCOND.threshold, 0.10); assert.equal(BTCOND.failLowerQuantile, 0.00625); assert.deepEqual([...BTCOND.conditions], ['STABLE', 'NOISY', 'SPARSE', 'REV_PRE']);
    const c = (o) => classifyCondition({ points: 10, ece: 0.1, ...o });
    assert.equal(c({ hi: 0.0999, loFamily: 0.05 }), 'PASS');
    assert.equal(c({ hi: 0.10, loFamily: 0.05 }), 'INCONCLUSIVE', 'an upper bound equal to the threshold is not a pass');
    assert.equal(c({ hi: 0.2, loFamily: 0.10 }), 'MATERIAL FAIL', 'a family lower bound at the threshold is a failure');
    assert.equal(c({ hi: 0.2, loFamily: 0.0999 }), 'INCONCLUSIVE');
    assert.equal(classifyCondition({ points: 0, ece: null }), 'MISSING');
    const r = clusterBootstrap(Array.from({ length: 40 }, (_, i) => Float64Array.of(i % 7, 1)), 'm15unc|test|family', (v) => v[0] / v[1], 2000);
    assert.ok(r.loFamily <= r.lo && r.lo <= r.mean && r.mean <= r.hi, 'the family lower bound lies below the 95% lower bound');
    const btc = conditionCalibration([recordOf()], { domain: 'test' }, 'UA');
    assert.equal(btc.complete, true);
    for (const sc of BTCOND.conditions) { const x = btc.conditions[sc]; assert.ok(x.points > 0 && Number.isFinite(x.ece) && Number.isFinite(x.lo) && Number.isFinite(x.hi) && Number.isFinite(x.loFamily) && ['PASS', 'MATERIAL FAIL', 'INCONCLUSIVE'].includes(x.classification), sc); }
    assert.equal(btc.conditions.SPARSE.classification, 'MATERIAL FAIL', 'one exact SPARSE stream: UA is underconfident (no spread)');
    assert.ok(btc.conditions.SPARSE.direction > 0);
  }],
  ['M15 ISOLATION: the belief files import only the belief module and M14\'s agent, use no forbidden API, and the directory holds nothing else', () => {
    const dir = path.join(ROOT, 'cognitive', 'mind', 'relation_belief');
    const ALLOWED = { 'belief.mjs': [], 'agent.mjs': ['../schema/agent.mjs', './belief.mjs'] };
    assert.deepEqual(fs.readdirSync(dir).sort(), Object.keys(ALLOWED).sort());
    for (const [f, allowed] of Object.entries(ALLOWED)) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(dir, f), 'utf8'), allowed, f), []);
    assert.ok(checkSourceIsolation("import { planSequence } from '../../testbed/task_e7.mjs';", ALLOWED['agent.mjs']).length > 0, 'mutant must be caught');
  }],
  ['M15 NAMESPACE AND REFUSALS: the run accepts only m15unc|gate|* labels; the driver refuses an unknown domain and a smoke run without an outside output file', () => {
    assertFreshLabels([LABEL_OF.m15(0), LABEL_OF.m15(599)]);
    for (const bad of [LABEL_OF.dev(0), LABEL_OF.smoke(0), T(0), 'm15unc|unit|0', 'm14schema|gate|0', 'm15unc|gate|x']) assert.throws(() => assertFreshLabels([bad]), /fresh M15 namespace/, bad);
    const drv = path.join(ROOT, 'experiments', 'm15_uncertainty', 'run_m15.mjs');
    const run = (...a) => spawnSync(process.execPath, [drv, ...a], { cwd: ROOT, encoding: 'utf8' });
    let r = run('--domain', 'dev'); assert.equal(r.status, 2); assert.match(r.stderr, /--domain must be smoke or m15/);
    r = run('--domain', 'smoke', '--labels', '1'); assert.equal(r.status, 2); assert.match(r.stderr, /outside the repository/);
    r = run('--domain', 'smoke', '--labels', '1', '--out', path.join(ROOT, 'x.json')); assert.equal(r.status, 2);
  }],
  ['M15 RUNNER: the discovery runner runs every file scripts/test.mjs and scripts/test_all.mjs run, this file, and no file twice', () => {
    const files = discoveredFiles();
    const src = (f) => fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8');
    const later = [...src('test.mjs').match(/const LATER_GATES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const after = [...src('test_all.mjs').match(/const AFTER_M13 = Object\.freeze\(\[([^\]]*)\]\)/)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    for (const f of [...later, ...after, 'test_m15_belief.mjs', 'test_worlds.mjs', 'test_mutants.mjs']) assert.ok(files.includes(f), f);
    assert.equal(new Set(files).size, files.length);
  }],
];

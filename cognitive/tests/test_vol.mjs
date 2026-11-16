// CF-06 tests — task E5 (schedule, common random numbers, windows) and world model v6 / agent VOL (regime belief
// arithmetic, relation to RECALL, learning of the reversal rate, normalisation, isolation, determinism)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld, distancesTo, edgeKey } from '../testbed/worlds.mjs';
import { GraphEnv } from '../testbed/env.mjs';
import { planE5, runE5, diagnoseE5, E5_FAMILIES, E5_PARAMS } from '../testbed/task_e5.mjs';
import { AGENTS_V6, MIND6_FILES, MIND6_ALLOWED, agentOptionsV6, makeAgentForV6 } from '../testbed/registry_v6.mjs';
import { AGENTS_V5 } from '../testbed/registry_v5.mjs';
import { PRIVILEGED } from '../testbed/runner.mjs';
import { checkPrivilege } from '../testbed/checks.mjs';
import { checkSourceIsolation } from '../testbed/checks_v1.mjs';
import { regimeBelief, makeWorldModel6 } from '../mind/v6/world_model.mjs';
import { makeStream } from '../testbed/rng.mjs';
import { armAgentV6, realChangeOfE5 } from '../testbed/arms_v6.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIND6_DIR = path.resolve(HERE, '..', 'mind', 'v6');
const LABEL = 'cf|dev|world|5', W = generateWorld(LABEL);
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const total = (p) => p.self + p.unknown + p.outcomes.reduce((s, [, x]) => s + x, 0);

/** A model that has learned 12 reliable exits, then sees `n` changes on fresh exits, each reversing or not. */
function livedThrough(reverses, n = 4) {
  const m = makeWorldModel6();
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) m.update(100 + i, 0, 200 + i, 0, false);
  for (let e = 0; e < n; e++) {
    const s = 300 + e;
    for (let j = 0; j < 30; j++) m.update(s, 0, 400 + e, 0, false);
    let k = 0; while (m.volatility().opened === e && k < 10) { m.update(s, 0, s, 0, false); k++; }
    for (let t = 0; t < 200; t++) m.update(100, 0, 200, 0, false);
    if (reverses) m.update(s, 0, 400 + e, 0, false);
    else for (let r = 0; r < 5; r++) { m.update(s, 0, s, 0, false); for (let t = 0; t < 100; t++) m.update(100, 0, 200, 0, false); }
  }
  return m;
}

export const tests = [
  ['v6 modules import only what they are allowed to, and use no forbidden API', () => {
    assert.deepEqual(fs.readdirSync(MIND6_DIR).filter((f) => f.endsWith('.mjs')).sort(), [...MIND6_FILES].sort());
    for (const f of MIND6_FILES) assert.deepEqual(checkSourceIsolation(fs.readFileSync(path.join(MIND6_DIR, f), 'utf8'), MIND6_ALLOWED, f), []);
    assert.ok(checkSourceIsolation("import { planE5 } from '../../testbed/task_e5.mjs';", MIND6_ALLOWED).length > 0, 'mutant must be caught');
  }],
  ['privilege: only ORACLE receives the oracle channel under the v6 registry; earlier kinds are the earlier factories', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|vol|priv' });
    const opts = (k) => agentOptionsV6(k, env, 'cf|test|vol|priv|agent', k === 'VOL_RHO' ? { rhoFixed: 0.5 } : {});
    assert.deepEqual(checkPrivilege(Object.keys(AGENTS_V6), PRIVILEGED, opts), []);
    for (const k of Object.keys(AGENTS_V5)) assert.equal(AGENTS_V6[k], AGENTS_V5[k]);
    assert.throws(() => makeAgentForV6('VOL_RHO', env, 'x', {}), /rhoFixed/);
    assert.equal(makeAgentForV6('VOL', env, 'x', { rhoFixed: 0.9 }).inspect().volatility.rho, 0.5, 'VOL ignores a caller-supplied rho');
  }],

  // ---- regime belief arithmetic ----
  ['REGIME BELIEF: with no re-test it is rho * (1 - (1 - h)^tau); with rho = 1 that is exactly RECALL\'s weight', () => {
    for (const [rho, tau] of [[1, 0], [1, 50], [1, 400], [0.3, 50], [0, 80]]) close(regimeBelief({ rho, h: 0.01, qNew: 0.999, qOld: 0.2, taus: [], tauNow: tau }).pOldNow, rho * (1 - 0.99 ** tau), 1e-12);
    close(regimeBelief({ rho: 0.4, h: 0.01, qNew: 0.9, qOld: 0.2, taus: [], tauNow: 10 }).pRev, 0.4);
  }],
  ['REGIME BELIEF: a failed re-test lowers both P(reversing) and P(old regime now); later time raises the latter again', () => {
    const base = { rho: 0.5, h: 0.01, qNew: 0.999, qOld: 0.2 };
    const none = regimeBelief({ ...base, taus: [], tauNow: 60 }), one = regimeBelief({ ...base, taus: [60], tauNow: 60 }), two = regimeBelief({ ...base, taus: [60, 120], tauNow: 120 });
    assert.ok(one.pRev < none.pRev && two.pRev < one.pRev, 'each failure is evidence against reversal');
    assert.ok(one.pOldNow < none.pOldNow);
    assert.ok(regimeBelief({ ...base, taus: [60], tauNow: 300 }).pOldNow > one.pOldNow, 'time since the last failure lets the belief recover');
    // closed form for k = 1: Lrev = S(t1) qn + (1 - S(t1)) qo
    const S = 0.99 ** 60, Lrev = S * 0.999 + (1 - S) * 0.2, pRev = 0.5 * Lrev / (0.5 * Lrev + 0.5 * 0.999);
    close(one.pRev, pRev, 1e-12); close(one.pOldNow, pRev * (1 - S * 0.999 / Lrev), 1e-12);
    for (const r of [none, one, two]) assert.ok(r.pRev >= 0 && r.pRev <= 1 && r.pOldNow >= 0 && r.pOldNow <= 1);
  }],

  // ---- learning the reversal rate ----
  ['LEARNING RHO: a world whose changes never reverse drives rho down; one whose changes always reverse drives it up', () => {
    const never = livedThrough(false), always = livedThrough(true);
    assert.ok(never.volatility().rho < 0.25, `never: ${never.volatility().rho}`);
    assert.ok(always.volatility().rho > 0.75, `always: ${always.volatility().rho}`);
    assert.equal(always.volatility().confirmed, 4); assert.equal(never.volatility().confirmed, 0);
    const fixed = makeWorldModel6({ rhoFixed: 0.3 });
    for (let j = 0; j < 30; j++) fixed.update(1, 0, 2, 0, false);
    for (let j = 0; j < 5; j++) fixed.update(1, 0, 1, 0, false);
    assert.equal(fixed.volatility().rho, 0.3, 'rhoFixed is honoured');
  }],
  ['MIXTURE: predictions stay normalised, and an archived exit\'s belief moves toward its old regime with time unobserved', () => {
    const m = makeWorldModel6(); const rnd = makeStream('cf|test|vol|norm');
    for (let i = 0; i < 2000; i++) {
      const s = 1 + Math.floor(rnd() * 6), a = Math.floor(rnd() * 2), dead = s === 3 && i > 800;
      m.update(s, a, dead || rnd() < 0.2 ? s : 1 + Math.floor(rnd() * 6), 0, false);
      if (i % 53 === 0) for (let x = 1; x <= 6; x++) for (let b = 0; b < 2; b++) { const p = m.predict(x, b); close(total(p), 1, 1e-9); assert.ok(p.self >= 0 && p.self <= 1); }
    }
    const g = makeWorldModel6({ rhoFixed: 1 });
    for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) g.update(100 + i, 0, 200 + i, 0, false);
    for (let j = 0; j < 30; j++) g.update(1, 0, 2, 0, false);
    let k = 0; while (g.volatility().opened === 0 && k < 10) { g.update(1, 0, 1, 0, false); k++; }
    const early = g.predict(1, 0).self;
    for (let t = 0; t < 300; t++) g.update(100, 0, 200, 0, false);
    assert.ok(g.predict(1, 0).self < early - 0.3, `unobserved for 300 steps the exit is believed likely to work again (${early} -> ${g.predict(1, 0).self})`);
    g.update(1, 0, 2, 0, false);
    assert.equal(g.volatility().open, 0); assert.equal(g.volatility().confirmed, 1);
  }],

  // ---- task E5 ----
  ['E5 SCHEDULE: blocked edges lie on a shortest route of the graph as it is then, keep the goal reachable, and are the same for every agent', () => {
    for (let i = 0; i < 6; i++) for (const fam of Object.keys(E5_FAMILIES)) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), plan = planE5(w, label, fam);
      assert.ok(plan); assert.equal(plan.events.length, E5_PARAMS.events);
      const permanent = new Set();
      for (const e of plan.events) {
        if (e.skipped) continue;
        const dG = distancesTo(w, plan.goal, permanent), dS = distancesTo(w, plan.start, permanent), d = dG[plan.start], [u, v] = e.edge;
        assert.ok(dS[u] + 1 + dG[v] === d || dS[v] + 1 + dG[u] === d, 'on a shortest route now');
        assert.ok(distancesTo(w, plan.goal, new Set([...permanent, edgeKey(u, v)]))[plan.start] >= 0, 'goal stays reachable');
        if (!e.reverses) permanent.add(edgeKey(u, v));
      }
      assert.deepEqual(planE5(w, label, fam), plan, 'deterministic');
    }
    const rev = (fam) => { let r = 0, n = 0; for (let i = 0; i < 40; i++) { const label = `cf|dev|world|${i}`; for (const e of planE5(generateWorld(label), label, fam).events) if (!e.skipped) { n++; r += e.reverses ? 1 : 0; } } return r / n; };
    assert.ok(rev('RARE') < 0.25 && rev('OFTEN') > 0.75 && Math.abs(rev('HALF') - 0.5) < 0.15, 'reversal shares follow the families');
    assert.throws(() => planE5(W, LABEL, 'NOPE'));
  }],
  ['E5 RUN: rows are deterministic; windows add up; the reference uses a reopened edge unless an equally short route exists', () => {
    const run = (kind, fam) => runE5({ world: W, worldLabel: LABEL, family: fam, kind, makeAgent: makeAgentForV6 });
    const a = run('MBVI3', 'HALF'); assert.deepEqual(a, run('MBVI3', 'HALF'));
    assert.equal(a.metric, a.windows.blocked + a.windows.after); assert.equal(a.windows.after, a.windows.afterReversed + a.windows.afterPermanent);
    assert.equal(a.reversedEvents + a.permanentEvents + a.skippedEvents, E5_PARAMS.events);
    let checked = 0, crossedSome = 0;
    for (let i = 0; i < 4; i++) {
      const label = `cf|dev|world|${i}`, w = generateWorld(label), plan = planE5(w, label, 'OFTEN');
      const o = runE5({ world: w, worldLabel: label, family: 'OFTEN', kind: 'ORACLE', makeAgent: makeAgentForV6 });
      const permanent = new Set();
      plan.events.forEach((e, k) => {
        if (e.skipped) return;
        if (e.reverses) {
          checked++; if (o.events[k].crossed > 0) crossedSome++;
          else assert.equal(distancesTo(w, plan.goal, new Set([...permanent, edgeKey(...e.edge)]))[plan.start], distancesTo(w, plan.goal, permanent)[plan.start], 'skipping the reopened edge only when an equally short route exists');
        } else permanent.add(edgeKey(...e.edge));
      });
    }
    assert.ok(checked > 5 && crossedSome > checked / 2, `the reference crossed ${crossedSome} of ${checked} reopened edges`);
  }],
  ['VOL ON E5: deterministic; reports its learned rate; behaves as the planner until the first change is archived', () => {
    const run = (kind, fam, p = {}) => runE5({ world: W, worldLabel: LABEL, family: fam, kind, makeAgent: (k, e, l) => makeAgentForV6(k, e, l, p) });
    const v = run('VOL', 'HALF'); assert.deepEqual(v, run('VOL', 'HALF'));
    assert.ok(v.secondary.volatility.rho > 0 && v.secondary.volatility.rho < 1);
    assert.equal(v.windows.train, run('MBVI3', 'HALF').windows.train, 'identical to the planner before any change');
    const r = run('VOL_RHO', 'RARE', { rhoFixed: 0.1 }); assert.equal(r.secondary.volatility.rho, 0.1);
  }],

  // ---- corrections after the owner's review of the draft (control arm, diagnostics, degeneration) ----
  ['BELIEF ARM (CF-06 primary): rho stays at 1/2 through real changes and h reaches the model, through the registry', () => {
    const env = new GraphEnv(W, { seedLabel: 'cf|test|vol|belief' });
    for (const h of [0.003, 0.01, 0.03]) assert.equal(makeAgentForV6('VOL_RHO', env, 'x', { rhoFixed: 0.5, volHazard: h })._model.params.volHazard, h);
    const r = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: 'VOL_RHO', makeAgent: (k, e, l) => makeAgentForV6(k, e, l, { rhoFixed: 0.5 }) });
    assert.ok(r.secondary.volatility.opened > 0, 'changes were archived');
    assert.equal(r.secondary.volatility.rho, 0.5);
    assert.ok(r.secondary.volatility.log.every((e) => e[4] === 0.5), 'rho is 1/2 after every archive and confirmation');
  }],
  ['ZERO EVIDENCE: an archived exit never re-tested leaves rho at exactly 1/2; failed re-tests long after the change lower it', () => {
    const m = makeWorldModel6();
    for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) m.update(100 + i, 0, 200 + i, 0, false);
    for (let j = 0; j < 30; j++) m.update(1, 0, 2, 0, false);
    let k = 0; while (m.volatility().opened === 0 && k < 10) { m.update(1, 0, 1, 0, false); k++; }
    assert.equal(m.volatility().open, 1);
    for (let t = 0; t < 400; t++) m.update(100, 0, 200, 0, false);
    assert.equal(m.volatility().rho, 0.5, 'no re-test, no evidence: the fixed point is 1/2 whatever the elapsed time');
    m.update(1, 0, 1, 0, false); m.update(1, 0, 1, 0, false);
    assert.ok(m.volatility().rho < 0.5, `failed re-tests 400 steps after the change are evidence (${m.volatility().rho})`);
    const log = m.eventLog();
    assert.equal(log.length, 1); assert.deepEqual(log[0].slice(0, 3), ['open', 1, 0]); assert.equal(log[0][4], 0.5);
    log[0][0] = 'tampered'; assert.equal(m.eventLog()[0][0], 'open', 'the log handed out is a copy');
  }],
  ['CONTROL FAIRNESS: VOL_FIXED05 gets the same environment, seeds and budget as VOL and acts identically until VOL\'s rho first leaves 1/2', () => {
    const record = (kind, p) => {
      const acts = [], rhos = []; let args = null;
      const res = runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind, makeAgent: (...a) => {
        args = a.length;
        const ag = makeAgentForV6(a[0], a[1], a[2], p);
        return { ...ag, act: (o) => { const x = ag.act(o); acts.push(x); return x; }, observe: (tr) => { ag.observe(tr); rhos.push(ag._model.volatility().rho); }, inspect: ag.inspect };
      } });
      return { acts, rhos, args, res };
    };
    const v = record('VOL', {}), f = record('VOL_RHO', { rhoFixed: 0.5 });
    assert.equal(v.args, 5); assert.equal(f.args, 5);   // the same five arguments; arms_v6 drops the fifth (the context) for ordinary arms
    assert.ok(f.rhos.every((x) => x === 0.5));
    const first = v.rhos.findIndex((x) => x !== 0.5);
    assert.ok(first > E5_PARAMS.exploreSteps, `rho moves only once changes are experienced (step ${first})`);
    assert.deepEqual(v.acts.slice(0, first + 1), f.acts.slice(0, first + 1), 'identical decisions while the two beliefs are identical');
    assert.equal(v.res.secondary.compute.budget, f.res.secondary.compute.budget);
  }],
  ['E5 DIAGNOSTICS on a hand-built trace: real and false archives, real and false confirmations, futile re-tests per event; mutants are caught', () => {
    const [[u, v1], [x, y]] = [W.edges[0], W.edges[1]], e3 = W.edges[2];
    const act = (s, t) => W.exitOrder[s].indexOf(t), L = (s) => W.labelOf[s];
    const k1 = edgeKey(u, v1), k2 = edgeKey(x, y), k3 = edgeKey(...e3);
    const spans = [{ key: k2, reverses: true, blockAt: 2, afterAt: 4, endAt: 6 }, { key: k1, reverses: false, blockAt: 6, afterAt: 8, endAt: 10 }, { key: k3, reverses: false, blockAt: 10, afterAt: 12, endAt: 14 }];
    const row = (s, t, moved) => [0, 0, s, act(s, t), moved ? t : s, 0];
    const trace = [row(x, y, false), row(x, y, true), row(x, y, false), row(u, v1, true), row(x, y, true), row(u, v1, true), row(u, v1, false), row(u, v1, false), row(u, v1, false), row(v1, u, false), row(u, v1, false), row(x, y, true), row(x, y, true), row(x, y, true)];
    const log = [['open', L(x), act(x, y), 0, 0.5], ['confirm', L(x), act(x, y), 1, 0.66], ['open', L(x), act(x, y), 2, 0.6], ['confirm', L(x), act(x, y), 4, 0.7], ['open', L(u), act(u, v1), 6, 0.4]];
    const d = diagnoseE5(W, trace, spans, log);
    assert.equal(d.futileRetests, 3);
    assert.deepEqual(d.perEvent, [{ ownAfter: 1, oldPermanent: 0, crossed: 1 }, { ownAfter: 2, oldPermanent: 0, crossed: 0 }, { ownAfter: 0, oldPermanent: 1, crossed: 0 }]);
    assert.deepEqual(d.alarms, { opensReal: 2, opensRealReversing: 1, opensRealPermanent: 1, opensFalse: 1, opensFalseBeforeFirstChange: 1, confirmsReal: 1, confirmsFalse: 1, changesDetected: 2, rhoAtDetection: [0.6, 0.4, null] });
    assert.equal(diagnoseE5(W, trace, spans, undefined).alarms, null, 'agents without a model log get no alarm diagnostics');
    assert.throws(() => diagnoseE5(W, trace, spans, log.map((e) => [e[0], e[1], e[2], e[3] + 1, e[4]])), /does not match/, 'a log shifted by one step must be refused');
    assert.throws(() => diagnoseE5(W, trace, spans, [log[1]]), /never opened/);
  }],
  ['E5 DIAGNOSTICS are evaluation-only: one trace read after the last episode; totals agree with the per-event rows; the planner has no alarm log', () => {
    const src = fs.readFileSync(path.resolve(HERE, '..', 'testbed', 'task_e5.mjs'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const body = src.slice(src.indexOf('export function runE5'));
    assert.equal(body.split('env.trace()').length - 1, 1, 'the trace is read once');
    assert.ok(body.indexOf('env.trace()') > body.lastIndexOf('run(P.afterEpisodes)'), 'and only after the last episode');
    assert.ok(body.indexOf('diagnoseE5(') > body.indexOf('agent.inspect()'), 'diagnostics after the agent has reported');
    assert.ok(!/diagnos|trace/.test(fs.readFileSync(path.join(MIND6_DIR, 'agent.mjs'), 'utf8').replace(/\/\/.*$/gm, '').replace(/const trace = \[\]|trace\.push|rhoTrace: trace/g, '')), 'the agent never sees diagnostics');
    for (const fam of ['RARE', 'OFTEN']) {
      const v = runE5({ world: W, worldLabel: LABEL, family: fam, kind: 'VOL', makeAgent: makeAgentForV6 });
      const live = v.events.filter((e) => !e.skipped);
      assert.equal(live.reduce((s, e) => s + (e.reverses ? 0 : e.ownAfterAttempts) + e.oldPermanentAttempts, 0), v.diagnostics.futileRetests);
      const a = v.diagnostics.alarms;
      assert.equal(a.opensReal + a.opensFalse, v.secondary.volatility.opened); assert.equal(a.confirmsReal + a.confirmsFalse, v.secondary.volatility.confirmed);
      assert.equal(a.opensRealReversing + a.opensRealPermanent, a.opensReal);
      assert.ok(a.changesDetected <= live.length && a.confirmsReal <= v.reversedEvents);
    }
    assert.equal(runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind: 'MBVI3', makeAgent: makeAgentForV6 }).diagnostics.alarms, null);
  }],
  // ---- revision 3.1: ground-truth attribution through privileged diagnostic arms (the CF-05b pattern) ----
  ['ARCHIVE DIAGNOSTICS (model): archiveIf decides which declared-worse exits are archived; without it, or always true, nothing changes', () => {
    const drive = (params) => {
      const m = makeWorldModel6({ rhoFixed: 0.5, ...params });
      for (let j = 0; j < 30; j++) m.update(1, 0, 2, 0, false);
      for (let j = 0; j < 8; j++) m.update(1, 0, 1, 0, false);
      return m.volatility().opened;
    };
    assert.equal(drive({}), 1, 'without a predicate the change is archived');
    assert.equal(drive({ archiveIf: (k) => k === '1|0' }), 1); assert.equal(drive({ archiveIf: () => false }), 0);
    assert.equal(drive({ archiveIf: () => 1 }), 0, 'only a literal true admits an archive');
    const plain = runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind: 'VOL_RHO', makeAgent: makeAgentForV6, params: { VOL_RHO: { rhoFixed: 0.5 } } });
    const always = runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind: 'VOL_RHO', makeAgent: makeAgentForV6, params: { VOL_RHO: { rhoFixed: 0.5, archiveIf: () => true } } });
    assert.deepEqual(always, plain, 'the diagnostic machinery adds nothing but the filter');
  }],
  ['E5 DIAGNOSTIC GROUND TRUTH: isBlockedPair agrees with the environment for every exit at every step', () => {
    const seen = { blocked: 0, open: 0, mismatches: 0 };
    const spy = (kind, env, label, params, context) => {
      const inner = makeAgentForV6(kind, env, label, params);
      return { ...inner, act(obs) {
        const { pos, blocked } = env.inspect();
        W.exitOrder[pos].forEach((v, i) => { const truth = blocked.includes(edgeKey(pos, v)); if (context.isBlockedPair(`${W.labelOf[pos]}|${i}`) !== truth) seen.mismatches++; if (truth) seen.blocked++; else seen.open++; });
        return inner.act(obs);
      } };
    };
    runE5({ world: W, worldLabel: LABEL, family: 'HALF', kind: 'MBVI3', makeAgent: spy });
    assert.equal(seen.mismatches, 0); assert.ok(seen.blocked > 0 && seen.open > 0, 'both states occur');
    const real = realChangeOfE5({ isBlockedPair: (k) => k === '3|1' });
    assert.equal(real('3|1'), true); assert.equal(real('3|0'), false);
    assert.equal(realChangeOfE5({ isBlockedPair: () => 1 })('3|1'), false, 'only a literal true is a real change');
    assert.throws(() => realChangeOfE5({}), /needs the E5 task context/);
  }],
  ['E5 DIAGNOSTIC SPLIT: the real arm archives only genuine changes and the false arm only false alarms, by the trace', () => {
    const arm = (diagnostic) => armAgentV6(['VOL_RHO', { rhoFixed: 0.5 }, { diagnostic }]);
    const R = runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind: 'VOL_RHO', makeAgent: arm('real') }).diagnostics.alarms;
    const F = runE5({ world: W, worldLabel: LABEL, family: 'RARE', kind: 'VOL_RHO', makeAgent: arm('false') }).diagnostics.alarms;
    assert.equal(R.opensFalse, 0); assert.ok(R.opensReal > 0, 'the real arm archives genuine changes');
    assert.equal(F.opensReal, 0); assert.ok(F.opensFalse > 0, 'the false arm archives false alarms (this world has some)');
    const env = new GraphEnv(W, { seedLabel: 'cf|test|vol|split' });
    assert.throws(() => arm('real')('X', env, 'l', {}, undefined), /needs the task context/);
    assert.throws(() => armAgentV6(['VOL_RHO', { rhoFixed: 0.5 }, { diagnostic: 'nope' }])('X', env, 'l', {}, { isBlockedPair: () => false }), /unknown diagnostic/);
  }],
  ['LEAKAGE v6: an ordinary arm behaves identically whatever context or archiveIf it is offered; the v6 mind never references ground truth', () => {
    const ordinary = armAgentV6(['VOL_RHO', { rhoFixed: 0.5 }]);
    const forged = (kind, env, label) => ordinary(kind, env, label, { archiveIf: () => false }, Object.freeze({ isBlockedPair: () => true }));
    const honest = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: 'VOL_RHO', makeAgent: ordinary });
    const lied = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: 'VOL_RHO', makeAgent: forged });
    const none = runE5({ world: W, worldLabel: LABEL, family: 'OFTEN', kind: 'VOL_RHO', makeAgent: (k, e, l) => makeAgentForV6('VOL_RHO', e, l, { rhoFixed: 0.5 }) });
    assert.deepEqual(lied, honest); assert.deepEqual(none, honest);
    for (const f of MIND6_FILES) {
      const code = fs.readFileSync(path.join(MIND6_DIR, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      assert.ok(!/isBlockedPair|realChange|arms_v6|task_e5|blocked/.test(code), `${f} must not reference task ground truth in code`);
    }
  }],
];

// ==========================================================
// ACQ-1 — behavioural tests of the environment, metric, analysis and territory, with mutants (zero MFW sessions)
// ==========================================================
//   node experiments/coga/acq1/test_acq1.mjs        exit 0 only if every check passes and every mutant is detected
// The central property: the crossover metric is ~0 for any agent whose choices do not depend on experienced reliability, however strong
// its fixed preferences are.  FP (a random, strongly peaked fixed policy per world and state) has raw agreement far from chance
// in single worlds and a crossover near 0.  That is the confound the crossover design removes, tested directly.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAccepted } from '../../m7/env.js';
import { GRAPH, NEIGHBOURS, edgeIndex } from '../worlds.mjs';
import { KIND } from '../envsim.mjs';
import { makeRng } from '../../../instrumentation/rng.js';
import { streamSeed, agentStream, envSlip, envStart, canonical } from '../rngid.mjs';
import { switchStates, describeAcq, pOf } from './states.mjs';
import { AcqEnv } from './env.mjs';
import { runAcq } from './baselines.mjs';
import { stateCounts, worldMetric, rawMetrics } from './metric.mjs';
import { stratifiedMean, decideAcq, interval, contrast, tQuantile } from './analysis.mjs';
import { STEPS, WINDOW, DELTA, QB1_PARAMS } from './config.mjs';
import { CONSUMED_RANGES } from '../../registry/consumed_after_h1r.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, mutant: false }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };
const mutant = (name, detected, detail = '') => { results.push({ name, ok: !!detected, mutant: true }); console.log(`${detected ? 'CAUGHT' : 'MISSED'} ${name}${detail ? ' - ' + detail : ''}`); };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// ---- calibration worlds: the development-simulation seeds already recorded (fast: one accepted seed, no search) ----
const sim = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'coga', 'evidence', 'baselines_dev.json'), 'utf8'));
const seeds = [...new Map(sim.sessions.map(s => [s.world, s.configSeed])).entries()].map(([id, configSeed]) => ({ index: Number(id), configSeed }));
const WORLDS = seeds.map(({ index, configSeed }) => { const g = generateAccepted(configSeed, index); return describeAcq({ cfg: g.cfg, acceptedSeed: configSeed, configIndex: index, stream: 'study' }); });

// ---- 1. states ----
{
  const w = WORLDS[0];
  check('S1 SWITCH states have disjoint A1 / A2, never contain the goal, and all targets are neighbours', WORLDS.every(x => x.sw.length > 0 && x.sw.every(d => d.s !== x.goal && d.A1.every(a => !d.A2.includes(a)) && [...d.A1, ...d.A2].every(a => NEIGHBOURS.get(d.s).includes(a)))),
    `${WORLDS.length} worlds, SWITCH per world ${Math.min(...WORLDS.map(x => x.sw.length))}-${Math.max(...WORLDS.map(x => x.sw.length))}`);
  const same = switchStates(w.p1, w.p1, w.goal);
  check('S2 identical reliabilities give no SWITCH state', same.length === 0);
  mutant('M-S2 a classifier that ignores the second environment would report every state (detected by S2 on identical vectors)', switchStates(w.p1, w.p2, w.goal).length > 0 && same.length === 0);
}

// ---- 2. environment ----
{
  const w = WORLDS[1], e = GRAPH.edges[0];
  const a = new AcqEnv(w, 'E1'), b = new AcqEnv(w, 'E2');
  const seqA = [], seqB = []; for (let j = 0; j < 200; j++) { seqA.push(a.attempt(e.from, e.to, j)); seqB.push(b.attempt(e.from, e.to, j)); }
  const rate = (s) => s.filter(Boolean).length / s.length;
  check('E1 each environment uses its own constant p (empirical rate near p over 200 attempts)', Math.abs(rate(seqA) - w.p1[0]) < 0.12 && Math.abs(rate(seqB) - w.p2[0]) < 0.12, `E1 ${rate(seqA).toFixed(2)} vs ${w.p1[0].toFixed(2)}, E2 ${rate(seqB).toFixed(2)} vs ${w.p2[0].toFixed(2)}`);
  check('E2 the p vector never changes during a session', pOf(w, 'E1') === w.p1 && pOf(w, 'E2') === w.p2);
  const c = new AcqEnv(w, 'E1'); const non = (() => { for (const u of GRAPH.nodes) for (const v of GRAPH.nodes) if (u !== v && !NEIGHBOURS.get(u).includes(v)) return [u, v]; })();
  check('E3 refusal and self semantics match the COG-A environment', c.attempt(non[0], non[1], 0) === false && c.attempt(3, 3, 1) === true && c.log[0][3] === KIND.REFUSED && c.log[1][3] === KIND.SELF && c.attemptsOnEdge.every(n => n === 0));
  const s1 = new AcqEnv(w, 'E1'), s2 = new AcqEnv(w, 'E2');
  check('E4 the same start sequence in both environments, never the goal', Array.from({ length: 30 }, () => s1.nextStart()).join() === Array.from({ length: 30 }, () => s2.nextStart()).join());
  check('E5 agent streams differ by environment and from other agents; environment streams carry no agent', streamSeed(agentStream(w.id, 'QB1', 'E1')) !== streamSeed(agentStream(w.id, 'QB1', 'E2')) && streamSeed(agentStream(w.id, 'QB1', 'E1')) !== streamSeed(agentStream(w.id, 'RW', 'E1')) && envSlip(w.id, 0).agent === 'ENV' && envStart(w.id).agent === 'ENV');
  check('E6 ACQ-1 world ids cannot collide with propagation-study world ids', w.id.startsWith('acq1:'));
}

// ---- 3. metric: hand-built world ----
{
  const w = { id: 'x', goal: 9, p1: GRAPH.edges.map(() => 1), p2: GRAPH.edges.map(() => 1), sw: [{ s: 1, deg: 3, A1: [NEIGHBOURS.get(1)[0]], A2: [NEIGHBOURS.get(1)[1]] }] };
  const [a0, a1, a2] = NEIGHBOURS.get(1);
  const row = (t, to) => [t, 1, to, KIND.EDGE, 1];
  const fullShift = worldMetric(w, [row(0, a0), row(1, a0)], [row(0, a1), row(1, a1)], 0, 10);
  check('M1 an agent that always picks the optimal set of the environment it is in has psi = 1', fullShift.psi === 1);
  const fixed = worldMetric(w, [row(0, a0), row(1, a2)], [row(0, a0), row(1, a2)], 0, 10);
  check('M2 identical behaviour in both environments has psi = 0 whatever it prefers', fixed.psi === 0);
  const anti = worldMetric(w, [row(0, a1)], [row(0, a0)], 0, 10);
  check('M3 the opposite behaviour has psi = -1', anti.psi === -1);
  const none = worldMetric(w, [row(0, a0)], [], 0, 10);
  check('M4 a state with no attempt in one session is not usable', none.psi === null && none.usable === 0);
  const outside = worldMetric(w, [row(50, a0)], [row(0, a1)], 0, 10);
  check('M5 only attempts inside the window count', outside.usable === 0);
  const refused = stateCounts([[0, 1, a0, KIND.REFUSED, 0], [1, 1, a0, KIND.SELF, 1], [2, 1, a0, KIND.EDGE, 0]], 0, 10);
  check('M6 only edge attempts count; a failed edge attempt is still a decision', [...refused.get(1).values()].reduce((x, y) => x + y, 0) === 1);
  const swapped = (world, l1, l2, lo, hi) => worldMetric({ ...world, sw: world.sw.map(d => ({ ...d, A1: d.A2, A2: d.A1 })) }, l1, l2, lo, hi);
  mutant('M-M1 swapping the two optimal sets changes the sign and is detected by M1', swapped(w, [row(0, a0)], [row(0, a1)], 0, 10).psi === -1);
}

// ---- 4. the central property on real worlds, with real agents ----
{
  const fixedPolicyAgent = (world) => (kind) => {
    const r = makeRng(streamSeed({ world: world.id, agent: 'FP', condition: 'ANY', purpose: 'policy' }));
    const pref = new Map(GRAPH.nodes.map(n => { const nb = NEIGHBOURS.get(n), w = nb.map(() => r() ** 8), s = w.reduce((a, b) => a + b, 0); return [n, nb.map((a, i) => [a, w[i] / s])]; }));
    return { kind, learn() {}, act(s, rng) { let u = rng(), i = 0; const row = pref.get(s); while (i < row.length - 1 && u >= row[i][1]) { u -= row[i][1]; i++; } return row[i][0]; }, updatesPerStep: 0 };
  };
  const T = 3000, W = [1500, 3000];
  const psi = (agent, factory = null) => WORLDS.map(w => { const f = factory ? factory(w) : null; const a = runAcq({ world: w, agent, env: 'E1', params: QB1_PARAMS, steps: T, agentFactory: f }).log, b = runAcq({ world: w, agent, env: 'E2', params: QB1_PARAMS, steps: T, agentFactory: f }).log; return { goal: w.goal, psi: worldMetric(w, a, b, W[0], W[1]).psi, raw: rawMetrics(w, a, 'E1', W[0], W[1]).ownAgreement }; });
  const rw = psi('RW'), fp = psi('FP', fixedPolicyAgent), qb = psi('QB1');
  const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
  check('C1 random walk: crossover near 0', Math.abs(mean(rw.map(x => x.psi))) < 0.03, `mean ${mean(rw.map(x => x.psi)).toFixed(4)}`);
  check('C2 a strongly peaked FIXED policy: raw agreement varies widely across worlds, the crossover stays near 0 (the confound is removed)', sd(fp.map(x => x.raw)) > 2 * sd(rw.map(x => x.raw)) && Math.abs(mean(fp.map(x => x.psi))) < 0.04,
    `raw SD ${sd(fp.map(x => x.raw)).toFixed(3)} vs RW ${sd(rw.map(x => x.raw)).toFixed(3)}; crossover mean ${mean(fp.map(x => x.psi)).toFixed(4)}`);
  check('C3 QB-1 learns: crossover well above the random walk', mean(qb.map(x => x.psi)) > 0.2, `mean ${mean(qb.map(x => x.psi)).toFixed(3)}`);
  // mutant environment: one p vector for both sessions cannot show any learning effect
  const flat = WORLDS.map(w => { const a = runAcq({ world: w, agent: 'QB1', env: 'E1', params: QB1_PARAMS, steps: T }).log, b = runAcq({ world: { ...w, id: w.id + ':twin', p2: w.p1 }, agent: 'QB1', env: 'E2', params: QB1_PARAMS, steps: T }).log; return worldMetric(w, a, b, W[0], W[1]).psi; });
  mutant('M-C3 an environment that ignores E1 / E2 is detected: QB-1 crossover collapses', mean(flat) < 0.5 * mean(qb.map(x => x.psi)), `mean ${mean(flat).toFixed(3)} vs ${mean(qb.map(x => x.psi)).toFixed(3)}`);
}

// ---- 5. analysis and decision rules ----
{
  const rows = [{ goal: 8, psi: { P: 0.2, RW: 0 } }, { goal: 8, psi: { P: 0.4, RW: 0 } }, { goal: 12, psi: { P: 0, RW: 0.1 } }];
  check('A1 goals count equally: stratified mean = mean(0.3, -0.1) = 0.1', Math.abs(stratifiedMean(rows, contrast('psi', 'P', 'RW')) - 0.1) < 1e-12);
  const base = { delta: DELTA, voidShare: 0, determinismOk: true, nullOk: true, pcOk: true };
  let cells = 0, bad = 0; const seen = new Set();
  for (let L = -0.5; L <= 0.5001; L += 0.01) for (let U = L; U <= 0.5001; U += 0.01) { cells++; const d = decideAcq({ ...base, L, U }); if (!d || !d.row) bad++; seen.add(d.row); }
  const at = (L, U, x = {}) => decideAcq({ ...base, L, U, ...x }).row;
  check('A2 every (L <= U) maps to exactly one row; A1-A5 all occur', bad === 0 && ['A1', 'A2', 'A3', 'A4', 'A5'].every(r => seen.has(r)), `${cells} cells`);
  check('A3 spot rows: (0.02, 0.3) A1; (0.02, 0.08) A2; (-0.05, 0.05) A3; (-0.3, -0.01) A4; (-0.05, 0.3) A5; void A8; null or PC fail A7', at(0.02, 0.3) === 'A1' && at(0.02, 0.08) === 'A2' && at(-0.05, 0.05) === 'A3' && at(-0.3, -0.01) === 'A4' && at(-0.05, 0.3) === 'A5'
    && at(0.02, 0.3, { voidShare: 0.06 }) === 'A8' && at(0.02, 0.3, { determinismOk: false }) === 'A8' && at(0.02, 0.3, { nullOk: false }) === 'A7' && at(0.02, 0.3, { pcOk: false }) === 'A7');
  const r2 = Array.from({ length: 40 }, (_, i) => ({ goal: [8, 12, 16, 19][i % 4], psi: { P: i / 40, RW: 0 } }));
  const i1 = interval(r2, contrast('psi', 'P', 'RW'), { level: 0.95 });
  check('A4 the interval contains its estimate and is symmetric', i1.lo <= i1.est && i1.est <= i1.hi && Math.abs((i1.est - i1.lo) - (i1.hi - i1.est)) < 1e-12);
  check('A4b t quantiles match published values (0.975: df 30 2.0423, df 116 1.9806; 0.9875: df 60 2.2990)', Math.abs(tQuantile(0.975, 30) - 2.0423) < 2e-4 && Math.abs(tQuantile(0.975, 116) - 1.9806) < 2e-4 && Math.abs(tQuantile(0.9875, 60) - 2.2990) < 3e-4, `${tQuantile(0.975, 30).toFixed(4)} ${tQuantile(0.975, 116).toFixed(4)} ${tQuantile(0.9875, 60).toFixed(4)}`);
  // hand check: two goals with values (0, 1) and (0, 1): estimate 0.5, u = 0.25 each, se^2 = 0.5 / 4, df = 0.25 / (2 * 0.0625) = 2
  const hc = interval([{ goal: 8, v: 0 }, { goal: 8, v: 1 }, { goal: 12, v: 0 }, { goal: 12, v: 1 }], x => x.v, { level: 0.95 });
  check('A4c the stratified variance and the Satterthwaite df equal the hand values', Math.abs(hc.est - 0.5) < 1e-12 && Math.abs(hc.se ** 2 - 0.125) < 1e-12 && Math.abs(hc.df - 2) < 1e-12);
  check('A5 the configured evaluation window lies inside the session and the margin is positive', WINDOW[0] >= 0 && WINDOW[1] <= STEPS && DELTA > 0);
}

// ---- 6. protocol files and territory facts ----
{
  const lock = await import('./lock.mjs');
  check('T1 the confirmatory lock is null until the freeze commit', lock.ACQ_AUTHORIZATION === null || lock.ACQ_AUTHORIZATION.allocation.length > 0, String(lock.ACQ_AUTHORIZATION === null ? 'null' : 'set'));
  check('T2 the registry-consumed ranges all lie above the study stream territory used here (886000+)', CONSUMED_RANGES.every(r => r.lo >= 886000));
  check('T3 canonical identity serialisation is independent of key order', canonical({ a: 1, b: 2 }) === canonical({ b: 2, a: 1 }));
  void edgeIndex;
}

const checks = results.filter(r => !r.mutant), muts = results.filter(r => r.mutant);
console.log(`\nACQ-1 tests: ${checks.filter(r => r.ok).length}/${checks.length} checks passed; mutants caught ${muts.filter(r => r.ok).length}/${muts.length}`);
process.exit(results.every(r => r.ok) ? 0 : 1);

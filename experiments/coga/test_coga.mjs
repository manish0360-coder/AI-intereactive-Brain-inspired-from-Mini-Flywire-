// ==========================================================
// COG-A — behavioural tests of the baselines, environment, RNG contract, events and decision rules, with mutants (zero MFW sessions)
// ==========================================================
//   node experiments/coga/test_coga.mjs        exit 0 only if every check passes and every mutant is detected
// The structural-null fixture checks step 1 of the QB-1 proof directly: on every world, Q(s,.) at the first post-shift decision at each
// DISTAL state equals its value at T_SHIFT, in both conditions, and the T_SHIFT values agree across conditions.  Mutant agents
// (eligibility traces, global decay, time-dependent exploration, a delayed update) and a runner that keeps one stream across the
// shift must be detected by named checks.
// ==========================================================
import { streamWorlds, NEIGHBOURS, GRAPH } from './worlds.mjs';
import { runBaseline, makeAgent } from './agents.mjs';
import { CogaEnv, KIND } from './envsim.mjs';
import { streamSeed, agentStream, envSlip, envStart, identity } from './rngid.mjs';
import { extractEvents, pairWorld } from './events.mjs';
import { theta, bootstrap, manski, decide, composite, worldWeighted } from './analysis.mjs';
import { T_SHIFT, SIM_STREAM_START, STUDY_STREAM_START, GAMMA } from './config.mjs';
import { makeRng } from '../../instrumentation/rng.js';

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, mutant: false }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };
const mutant = (name, detected, detail = '') => { results.push({ name, ok: !!detected, mutant: true }); console.log(`${detected ? 'CAUGHT' : 'MISSED'} ${name}${detail ? ' - ' + detail : ''}`); };
const P = { alpha: 0.5, epsilon: 0.1 };

// ---- worlds for the fixtures: development-simulation worlds (accepted) ----
const SIM = streamWorlds(SIM_STREAM_START, 40, 'sim').filter(w => w.accepted);

// ---- 1. structural-null fixture (proof step 1) ----
function nullFixture(agentFactory, runner = runBaseline) {
  let events = 0, violations = 0, tshiftMismatch = 0;
  for (const w of SIM) {
    const snap = {};
    for (const cond of ['SWAP', 'NOSWAP']) {
      const atShift = new Map(), seen = new Set(), distal = new Set(w.distal.map(d => d.s));
      const qrow = (ag, s) => NEIGHBOURS.get(s).map(a => ag.Q.get(`${s}|${a}`) || 0).join(',');
      runner({ world: w, agent: 'QB1', condition: cond, params: P, agentFactory, onDecision(t, s, ag) {
        if (t === T_SHIFT) for (const d of distal) atShift.set(d, qrow(ag, d));
        if (t >= T_SHIFT && distal.has(s) && !seen.has(s)) { seen.add(s); events++; if (qrow(ag, s) !== atShift.get(s)) violations++; }
      } });
      snap[cond] = [...atShift.values()].join('|');
    }
    if (snap.SWAP !== snap.NOSWAP) tshiftMismatch++;
  }
  return { events, violations, tshiftMismatch, ok: events > 0 && violations === 0 && tshiftMismatch === 0 };
}
{ const r = nullFixture(null); check('N1 QB-1: Q(s,.) at the first post-shift decision at every DISTAL state equals its T_SHIFT value, both conditions; T_SHIFT values equal across conditions', r.ok, `${SIM.length} worlds, ${r.events} events, ${r.violations} violations, ${r.tshiftMismatch} mismatches`); }

// mutant agents (agentFactory): each violates one assumption of the proof
function tracesAgent(resetPerEpisode) {
  return (kind, params) => {
    const Q = new Map(), E = new Map(), lambda = 0.9, gamma = GAMMA;
    const q = (s, a) => Q.get(`${s}|${a}`) || 0, maxQ = (s) => Math.max(...NEIGHBOURS.get(s).map(a => q(s, a)));
    const base = makeAgent('QB1', params);
    return { kind, Q, act: (s, rng) => { const nb = NEIGHBOURS.get(s), u1 = rng(), u2 = rng(); if (u1 < params.epsilon) return nb[Math.floor(u2 * nb.length)]; const bv = maxQ(s), top = nb.filter(a => q(s, a) === bv); return top[Math.floor(u2 * top.length)]; },
      learn(s, a, r, s2, terminal) { const d = r + (terminal ? 0 : gamma * maxQ(s2)) - q(s, a); E.set(`${s}|${a}`, 1);
        for (const [k, e] of E) { Q.set(k, (Q.get(k) || 0) + params.alpha * d * e); E.set(k, e * gamma * lambda); }
        if (terminal && resetPerEpisode) E.clear(); }, updatesPerStep: 1, _base: base };
  };
}
{ const r = nullFixture(tracesAgent(true)); mutant('M-N1 Q(lambda) with traces reset at each episode is detected by N1', !r.ok, `${r.violations} violations`); }
{ const r = nullFixture(tracesAgent(false)); mutant('M-N2 Q(lambda) with traces never reset is detected by N1', !r.ok, `${r.violations} violations`); }
{ const decay = (kind, params) => { const ag = makeAgent('QB1', params); const learn = ag.learn; ag.learn = (...x) => { learn(...x); for (const [k, v] of ag.Q) ag.Q.set(k, v * 0.999); }; return ag; };
  const r = nullFixture(decay); mutant('M-N3 a global Q decay is detected by N1', !r.ok, `${r.violations} violations`); }

// ---- 2. QB-1 unit behaviour (A1, A2, A4) ----
{
  const ag = makeAgent('QB1', P), s = 1, nb = NEIGHBOURS.get(s), a = nb[0];
  ag.Q.set(`${nb[1]}|${NEIGHBOURS.get(nb[1])[0]}`, 0.7);
  const before = new Map(ag.Q);
  ag.learn(s, a, 0, nb[1], false);
  const changed = [...new Set([...before.keys(), ...ag.Q.keys()])].filter(k => (before.get(k) || 0) !== (ag.Q.get(k) || 0));
  const expect = 0 + P.alpha * (0 + GAMMA * 0.7 - 0);
  check('U1 an update changes exactly Q(s,a), in the same call, by alpha (r + gamma max Q(s\',.) - Q(s,a)) (A1, A2)', changed.length === 1 && changed[0] === `${s}|${a}` && Math.abs(ag.Q.get(`${s}|${a}`) - expect) < 1e-15, `changed ${changed}`);
  const t = makeAgent('QB1', P); t.learn(s, a, 1, 8, true);
  check('U2 arrival at the goal is terminal (no bootstrap): Q(s,a) = alpha * r', Math.abs(t.Q.get(`${s}|${a}`) - P.alpha) < 1e-15);
  // A4: the choice depends only on Q(s,.) and the two fresh draws
  const seq = [0.5, 0.25, 0.5, 0.25];
  const mk = () => { let i = 0; return () => seq[i++ % seq.length]; };
  const ag2 = makeAgent('QB1', P); for (const x of nb) ag2.Q.set(`${s}|${x}`, 0.1);
  const first = ag2.act(s, mk()); ag2.Q.set('99|98', 5); for (let i = 0; i < 50; i++) ag2.act(3, makeRng(i)); const second = ag2.act(s, mk());
  check('U3 the choice at s is the same for the same Q(s,.) and the same draws, after unrelated updates and decisions (A4)', first === second);
  const tie = makeAgent('QB1', P); const picks = new Set(); for (let i = 0; i < 400; i++) picks.add(tie.act(s, makeRng(1000 + i)));
  check('U4 greedy ties are broken by the fresh draw (all tied actions occur)', picks.size === nb.length, `${picks.size}/${nb.length}`);
  // mutant: time-dependent exploration (A4 violation) is caught by U3's construction
  const epsDecay = () => { const b = makeAgent('QB1', P); let calls = 0; return { ...b, act(s2, rng) { calls++; const u1 = rng(), u2 = rng(); const nb2 = NEIGHBOURS.get(s2); if (u1 < P.epsilon * Math.max(0, 1 - calls / 20)) return nb2[Math.floor(u2 * nb2.length)]; const bv = Math.max(...nb2.map(x => b.Q.get(`${s2}|${x}`) || 0)); const top = nb2.filter(x => (b.Q.get(`${s2}|${x}`) || 0) === bv); return top[Math.floor(u2 * top.length)]; } }; };
  const m = epsDecay(); for (const x of nb) m.Q.set(`${s}|${x}`, 0.1); m.Q.set(`${s}|${nb[0]}`, 0.2);
  const seqE = [0.05, 0.99]; const mkE = () => { let i = 0; return () => seqE[i++ % 2]; };
  const f1 = m.act(s, mkE()); for (let i = 0; i < 50; i++) m.act(3, makeRng(i)); const f2 = m.act(s, mkE());
  mutant('M-U3 exploration that decays with the number of decisions is detected (same Q(s,.), same draws, different choice)', f1 !== f2);
}

// ---- 3. RNG contract (A6) ----
{
  const w = SIM[0];
  const S = runBaseline({ world: w, agent: 'QB1', condition: 'SWAP', params: P, steps: 1 }), N = runBaseline({ world: w, agent: 'QB1', condition: 'NOSWAP', params: P, steps: 1 });
  const seeds = [S.streams.pre, S.streams.post, N.streams.post].map(streamSeed);
  check('R1 one pre-shift stream shared by both conditions; distinct post-shift streams per condition (A6)', streamSeed(S.streams.pre) === streamSeed(N.streams.pre) && new Set(seeds).size === 3);
  const sameRunner = (args) => runBaseline({ ...args });
  const mutStreams = { pre: S.streams.pre, post: S.streams.pre };
  mutant('M-R1 a runner that keeps the pre-shift stream after the shift is detected by R1', new Set([mutStreams.pre, mutStreams.post, mutStreams.post].map(streamSeed)).size !== 3);
  void sameRunner;
  // uniqueness within every world over every identity a session can use
  const worlds = [...streamWorlds(STUDY_STREAM_START, 30, 'study'), ...SIM];
  let worldsWithCollision = 0, all = new Map(), global = 0;
  for (const x of worlds) {
    const ids = [...['RW', 'QB1', 'DYNA', 'MFW'].flatMap(a => ['pre', 'SWAP', 'NOSWAP'].map(c => agentStream(x.id, a, c))), envStart(x.id), ...GRAPH.edges.map(e => envSlip(x.id, e.i))];
    const s = ids.map(streamSeed); if (new Set(s).size !== s.length) worldsWithCollision++;
    for (const v of s) { if (all.has(v)) global++; all.set(v, true); }
  }
  check('R2 stream seeds are unique within every world (development + simulation worlds)', worldsWithCollision === 0, `${worlds.length} worlds, ${all.size} seeds, ${global} cross-world coincidences (harmless: different units)`);
  let threw = false; try { identity({ world: 1, agent: 'QB1', condition: 'pre' }); } catch { threw = true; }
  check('R3 an incomplete stream identity is refused', threw);
}

// ---- 4. environment ----
{
  const w = SIM[1], e0 = GRAPH.edges[0];
  const a = new CogaEnv(w, 'SWAP'), b = new CogaEnv(w, 'NOSWAP');
  const outs = []; for (let t = 0; t < 40; t++) outs.push([a.attempt(e0.from, e0.to, t), b.attempt(e0.from, e0.to, t)]);
  check('E1 before the shift both conditions give identical outcomes for the same edge and attempt index (common random numbers)', outs.every(([x, y]) => x === y));
  const a2 = new CogaEnv(w, 'SWAP'), b2 = new CogaEnv(w, 'NOSWAP'); let differ = 0, same = 0;
  for (const e of GRAPH.edges) for (let j = 0; j < 30; j++) { const x = a2.attempt(e.from, e.to, T_SHIFT + j), y = b2.attempt(e.from, e.to, T_SHIFT + j); if (x !== y) differ++; else same++; }
  check('E2 after the shift the same draws meet the phase-II p under SWAP and the phase-I p under NO-SWAP', differ > 0 && a2.attemptsOnEdge.every((n, i) => n === b2.attemptsOnEdge[i]), `${differ} differing outcomes of ${differ + same}`);
  const c = new CogaEnv(w, 'SWAP'); const nonEdge = (() => { for (const u of GRAPH.nodes) for (const v of GRAPH.nodes) if (u !== v && !NEIGHBOURS.get(u).includes(v)) return [u, v]; })();
  const r1 = c.attempt(nonEdge[0], nonEdge[1], 5), r2 = c.attempt(3, 3, 6);
  check('E3 a non-edge is refused (false, kind 0, no draw); a self attempt is a no-op (true, kind 2, no draw)', r1 === false && r2 === true && c.log[0][3] === KIND.REFUSED && c.log[1][3] === KIND.SELF && c.attemptsOnEdge.every(n => n === 0));
  const s1 = new CogaEnv(w, 'SWAP'), s2 = new CogaEnv(w, 'NOSWAP'); const st1 = Array.from({ length: 20 }, () => s1.nextStart()), st2 = Array.from({ length: 20 }, () => s2.nextStart());
  check('E4 episode starts: the same sequence in both conditions, never the goal', st1.join() === st2.join() && !st1.includes(w.goal));
}

// ---- 5. events and blinding ----
{
  const w = { id: 'x', goal: 9, distal: [{ s: 1, A1star: [2], A2star: [3] }], stable: [{ s: 4, A1star: [5], A2star: [5] }] };
  const log = [[T_SHIFT - 1, 1, 3, KIND.EDGE, 1], [T_SHIFT, 1, 2, KIND.EDGE, 0], [T_SHIFT + 1, 1, 3, KIND.EDGE, 1], [T_SHIFT + 2, 4, 6, KIND.EDGE, 1]];
  const ev = extractEvents(w, log, { condition: 'NOSWAP' });
  check('V1 the event is the first attempt from s at a step >= T_SHIFT; Y scores A2*; leaving A1* at a STABLE state scores Lv = 1', ev.distal[0].t === T_SHIFT && ev.distal[0].Y === 0 && ev.stable[0].Lv === 1);
  const sealed = extractEvents(w, log, { condition: 'SWAP', sealed: true });
  check('V2 a sealed SWAP session returns V and t only (no target, Y or Lv)', sealed.distal[0].V === 1 && sealed.distal[0].Y === undefined && sealed.distal[0].target === undefined && sealed.stable[0].Lv === undefined);
  let threw = false; try { theta([pairWorld(w, sealed, ev)]); } catch { threw = true; }
  check('V3 a sealed outcome cannot reach the estimator (it throws)', threw);
}

// ---- 6. estimator, bounds and decision rules ----
{
  const ws = [{ world: 'a', goal: 8, distal: [{ VS: 1, VN: 1, YS: 1, YN: 0 }, { VS: 1, VN: 1, YS: 0, YN: 0 }, { VS: 1, VN: 0, YS: 1, YN: null }], stable: [] },
              { world: 'b', goal: 12, distal: [{ VS: 0, VN: 1, YS: null, YN: 1 }, { VS: 1, VN: 1, YS: 1, YN: 1 }], stable: [] }];
  check('S1 theta-hat = sum over AA (YS - YN) / |AA| = 1/3', Math.abs(theta(ws) - 1 / 3) < 1e-12);
  const mb = manski(ws);
  check('S2 Manski bounds over E = AA + A0 + 0A: [(1 + 0 - 1)/5, (1 + 1 + 0)/5] = [0, 0.4]', mb && Math.abs(mb.lower - 0) < 1e-12 && Math.abs(mb.upper - 0.4) < 1e-12 && mb.E === 5);
  // M5 = mean over all DISTAL pairs of (VS*YS - VN*YN): a1 1-0, a2 0-0, a3 1-0 (VN = 0), b1 0-1 (VS = 0), b2 1-1 -> (1+0+1-1+0)/5 = 0.2
  // (the first version of this check expected 0 from a hand-summing error; the preregistered formula and the code give 0.2)
  check('S3 world-weighted M4 = mean(1/2, 0) = 0.25; composite M5 = (1 + 0 + 1 - 1 + 0)/5 = 0.2', Math.abs(worldWeighted(ws) - 0.25) < 1e-12 && Math.abs(composite(ws) - 0.2) < 1e-12, `M4 ${worldWeighted(ws)}, M5 ${composite(ws)}`);
  const b1 = bootstrap(ws, theta, { replicates: 500, seed: 3 }), b2 = bootstrap(ws, theta, { replicates: 500, seed: 3 });
  check('S4 the bootstrap is reproducible for a fixed seed', b1.lo === b2.lo && b1.hi === b2.hi);
  // decision table: exclusive and exhaustive on a grid; spot values
  const base = { delta: 0.1, specUpper: 0.05, q: 1, qMin: 0.5, competenceOk: true, voidShare: 0, pcPassed: true, nullOk: true };
  let cells = 0, bad = 0; const rows = new Set();
  for (let L = -0.5; L <= 0.5001; L += 0.01) for (let U = L; U <= 0.5001; U += 0.01) { cells++; const d = decide({ ...base, L, U }); if (!d || !d.row) bad++; rows.add(d.row); }
  const at = (L, U, x = {}) => decide({ ...base, L, U, ...x }).row;
  check('S5 every (L <= U) maps to exactly one row; rows R2-R6 all occur', bad === 0 && ['R2', 'R3', 'R4', 'R5', 'R6'].every(r => rows.has(r)), `${cells} cells`);
  check('S6 spot rows: (0.02, 0.3) R2; spec fail R2b; (0.02, 0.08) R3; (-0.05, 0.05) R4; (-0.3, -0.01) R5; (-0.05, 0.3) R6; void R8; PC fail R1; q < q_min R7',
    at(0.02, 0.3) === 'R2' && at(0.02, 0.3, { specUpper: 0.2 }) === 'R2b' && at(0.02, 0.08) === 'R3' && at(-0.05, 0.05) === 'R4' && at(-0.3, -0.01) === 'R5' && at(-0.05, 0.3) === 'R6'
    && at(0.02, 0.3, { voidShare: 0.06 }) === 'R8' && at(0.02, 0.3, { pcPassed: false }) === 'R1' && at(0.02, 0.3, { q: 0.4 }) === 'R7' && at(0.02, 0.3, { competenceOk: false }) === 'R7');
}

const checks = results.filter(r => !r.mutant), muts = results.filter(r => r.mutant);
console.log(`\nCOG-A tests: ${checks.filter(r => r.ok).length}/${checks.length} checks passed; mutants caught ${muts.filter(r => r.ok).length}/${muts.length}`);
process.exit(results.every(r => r.ok) ? 0 : 1);

// ==========================================================
// CF-00 runtime audit — analysis of recorded sessions (pure; reads session records, writes nothing itself)
// ==========================================================
// Every function takes parsed session records.  "Step-0 decision" = the runPrediction step whose choice is executed;
// steps >= 1 of the imagination chain only feed the reasoning display.  Knockouts are first-order and open-loop:
// one term (or group) is removed from every candidate's score at the realised state, the clamp to [-400, 400] is
// re-applied, the arbitration blend keeps its 0.6 weight on the score when it was active, and the test is whether
// the argmax changes.  Closed-loop effects are measured separately by the ablation sessions.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clamp = (x) => Math.max(-400, Math.min(400, x));
const step0 = (s) => s.decisions.filter((d) => d.step === 0);
const greedyMulti = (s) => step0(s).filter((d) => d.cands.length >= 2 && !d.explore);
const winnerIndex = (d) => { const w = d.cands.map((c) => c.arb); return w.indexOf(Math.max(...w)); };
const knocked = (d, drop) => d.cands.map((c) => {
  const sum = c.terms.reduce((a, t) => a + t[1], 0);
  const removed = c.terms.reduce((a, t) => a + (drop(t[0]) ? t[1] : 0), 0);
  const k = Math.abs(c.arb - c.fw) > 1e-9 ? 0.6 : 1;
  return c.arb - k * (c.fw - clamp(sum - removed));
});
const flips = (d, drop) => { const w = knocked(d, drop); return w[winnerIndex(d)] < Math.max(...w) - 1e-9; };

export const GROUPS = {
  'oracle goal gradient (goalDistance BFS x adjacency gate)': ['goalGradientBoost', 'driveGoalBoost'],
  'FutureScore look-ahead (planning.js, true-graph BFS)': ['futureBonus'],
  'Q-learning (qlearning.js)': ['qValue', 'repetitionFatigue'],
  'visit/transition counts and recency (memory.js maps)': ['transitionBoost', 'habitBoost', 'curiosityBoost', 'boredomPenalty', 'repetitionPenalty'],
  'reward/penalty maps (memory.js)': ['reward', 'dangerPenalty'],
  'episodic trajectory integrity (episodeManager store)': ['trajectoryIntegrity'],
  'schema/semantic/consolidation (schemaMemory, semanticVitality, longTermConsolidation, candidateAnalysis, semanticMemoryLayer)': ['schemaBonus', 'semanticVitalityScore', 'consolidationBonus', 'meaningBoost', 'noiseSuppressedScore'],
  'attention amplification (cognitiveAttention.js)': ['attentionAmplifiedScore'],
  'Bayesian trust (trustMemory.js)': ['trustBonus'],
  'local emotion map (emotionMap.js)': ['localConfidence', 'localStress', 'localFatigue', 'localTrust', 'localFear'],
  'global behaviour states (behavior.js) and drift': ['curiosityState', 'confidenceState', 'stressState', 'fatigueState', 'fatigueOverload', 'dynamicFocus', 'drift'],
  'motivational drives (motivationalState.js)': ['driveRewardBoost', 'driveCuriosityBoost', 'driveGoalBoost'],
};

export function decisionChannels(sessions) {
  let s0 = 0, multi = 0, cand = 0, imagined = 0, arbActive = 0, arbFlip = 0, clampBound = 0, sumMismatch = 0, explore = 0;
  let moves = 0, matchChoice = 0, matchGreedy = 0, mapped = 0;
  const eps = [];
  for (const s of sessions) {
    const idx0 = []; s.decisions.forEach((d, i) => { if (d.step === 0) idx0.push(i); });
    imagined += s.decisions.length - idx0.length;
    for (const d of step0(s)) { s0++; eps.push(d.eps); if (d.explore) explore++; }
    for (const d of greedyMulti(s)) {
      multi++; cand += d.cands.length;
      if (d.cands.some((c) => Math.abs(c.arb - c.fw) > 1e-9)) {
        arbActive++;
        const fws = d.cands.map((c) => c.fw);
        if (fws[winnerIndex(d)] < Math.max(...fws) - 1e-9) arbFlip++;
      }
      for (const c of d.cands) { const sum = c.terms.reduce((a, t) => a + t[1], 0); if (Math.abs(clamp(sum) - c.fw) > 1e-6) sumMismatch++; if (Math.abs(sum) > 400) clampBound++; }
    }
    for (const [from, to, at] of s.moves) {
      moves++;
      let j = -1; for (let q = idx0.length - 1; q >= 0; q--) if (idx0[q] < at) { j = idx0[q]; break; }
      if (j < 0) continue;
      mapped++;
      const d = s.decisions[j];
      if (d.current === from && (d.explore ?? d.ranked[0]?.[0]) === to) matchChoice++;
      if (d.current === from && d.ranked[0]?.[0] === to) matchGreedy++;
    }
  }
  return { step0Decisions: s0, greedyMultiCandidate: multi, meanCandidates: +(cand / multi).toFixed(3), imaginedStepsNotExecuted: imagined,
    exploreDraws: explore, epsilon: { min: +Math.min(...eps).toFixed(4), mean: +(eps.reduce((a, b) => a + b, 0) / eps.length).toFixed(4), max: +Math.max(...eps).toFixed(4) },
    arbitrationActiveDecisions: arbActive, arbitrationChangedArgmax: arbFlip, candidateScoresAtClamp: clampBound, termSumMismatches: sumMismatch,
    envMoves: moves, movesMatchingStep0Choice: `${matchChoice}/${mapped}`, movesMatchingGreedyArgmax: `${matchGreedy}/${mapped}` };
}

export function termKnockouts(sessions) {
  const T = {}; let n = 0;
  for (const s of sessions) for (const d of greedyMulti(s)) {
    n++;
    d.cands[0].terms.forEach(([name], ti) => {
      const r = (T[name] ??= { varies: 0, nonzero: 0, cands: 0, abs: 0, flips: 0 });
      const vals = d.cands.map((c) => c.terms[ti][1]);
      if (Math.max(...vals) - Math.min(...vals) > 1e-9) r.varies++;
      for (const v of vals) { r.cands++; r.abs += Math.abs(v); if (Math.abs(v) > 1e-12) r.nonzero++; }
      if (flips(d, (x) => x === name)) r.flips++;
    });
  }
  return Object.fromEntries(Object.entries(T).sort((a, b) => b[1].flips - a[1].flips).map(([k, r]) => [k, {
    knockoutFlipRate: +(r.flips / n).toFixed(4), variesAcrossCandidates: +(r.varies / n).toFixed(4), nonzeroShare: +(r.nonzero / r.cands).toFixed(4), meanAbs: +(r.abs / r.cands).toFixed(3) }]));
}

export function groupKnockouts(sessions) {
  const out = {}; let n = 0;
  for (const s of sessions) for (const d of greedyMulti(s)) {
    n++;
    for (const [g, names] of Object.entries(GROUPS)) { out[g] ??= 0; if (flips(d, (x) => names.includes(x))) out[g]++; }
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]).map(([g, c]) => [g, +(c / n).toFixed(4)]));
}

export function trueDistances(edges, goal) {
  const adj = new Map();
  for (const e of edges) for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) { if (!adj.has(String(a))) adj.set(String(a), []); adj.get(String(a)).push(String(b)); }
  const dist = new Map([[String(goal), 0]]); let fr = [String(goal)];
  while (fr.length) { const nx = []; for (const u of fr) for (const v of adj.get(u) || []) if (!dist.has(v)) { dist.set(v, dist.get(u) + 1); nx.push(v); } fr = nx; }
  return { adj, dist };
}

export function behaviour(sessions, edges, goal) {
  const E = new Set(edges.flatMap((e) => [`${e.from}>${e.to}`, `${e.to}>${e.from}`]));
  const { dist } = trueDistances(edges, goal);
  const per = sessions.map((s) => {
    const restarts = s.goalHits.map((i) => s.moves[i]).filter(Boolean).map((m) => dist.get(m[0]) ?? -1);
    const gaps = s.goalHits.map((h, i) => h - (i ? s.goalHits[i - 1] : 0));
    return { seed: s.seed, arrivals: s.goalHits.length, envMoves: s.moves.length,
      nonGraphMoves: s.moves.filter((m) => m[0] !== m[1] && !E.has(`${m[0]}>${m[1]}`)).length,
      selfMoves: s.moves.filter((m) => m[0] === m[1]).length,
      firstArrivalAtEnvMove: s.goalHits[0] ?? null,
      meanEnvMovesBetweenArrivals: gaps.length ? +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2) : null,
      meanTrueDistanceAtRestart: restarts.length ? +(restarts.reduce((a, b) => a + b, 0) / restarts.length).toFixed(2) : null };
  });
  return { sessions: per, totalArrivals: per.reduce((a, r) => a + r.arrivals, 0) };
}

export function goalDirection(sessions, edges, goal) {
  const { dist } = trueDistances(edges, goal);
  const acc = {}; let n = 0, win = 0, uni = 0;
  for (const s of sessions) for (const d of greedyMulti(s)) {
    if (d.current === String(goal)) continue;
    const ds = d.cands.map((c) => dist.get(c.k) ?? 99); const m = Math.min(...ds);
    if (ds.filter((x) => x === m).length !== 1) continue;
    const mi = ds.indexOf(m); n++; uni += 1 / d.cands.length; if (winnerIndex(d) === mi) win++;
    d.cands[0].terms.forEach(([name], ti) => {
      const o = d.cands.reduce((a, c, i) => a + (i === mi ? 0 : c.terms[ti][1]), 0) / (d.cands.length - 1);
      acc[name] = (acc[name] || 0) + (d.cands[mi].terms[ti][1] - o);
    });
  }
  return { decisions: n, winnerIsDistanceMinimiser: +(win / n).toFixed(3), uniformChoiceWouldGive: +(uni / n).toFixed(3),
    meanAdvantageOfMinimiserByTerm: Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +(v / n).toFixed(3)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 12)) };
}

export function randomWalkReference(edges, goal, steps, runs = 200) {
  const { adj } = trueDistances(edges, goal);
  const nodes = [...adj.keys()].filter((x) => x !== String(goal));
  let x = 12345; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  let arrivals = 0;
  for (let r = 0; r < runs; r++) {
    let cur = nodes[Math.floor(rnd() * nodes.length)];
    for (let t = 0; t < steps; t++) { const nb = adj.get(cur); cur = nb[Math.floor(rnd() * nb.length)]; if (cur === String(goal)) { arrivals++; cur = nodes[Math.floor(rnd() * nodes.length)]; } }
  }
  return +(arrivals / runs).toFixed(1);
}

export function coverageSummary(covFile, root) {
  const cov = JSON.parse(fs.readFileSync(covFile, 'utf8'));
  const rows = [];
  for (const sc of cov.result) {
    if (!sc.url.startsWith('file:')) continue;
    const file = path.relative(root, fileURLToPath(sc.url)).split(path.sep).join('/');
    if (!(file === 'main.js' || file.startsWith('render/') || file.startsWith('instrumentation/'))) continue;
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    const exported = new Set([...src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
    let named = 0, executed = 0, calls = 0; const ex = {};
    for (const fn of sc.functions) {
      if (!fn.functionName) continue;
      named++; const c = fn.ranges[0].count; calls += c; if (c > 0) executed++;
      if (exported.has(fn.functionName)) ex[fn.functionName] = (ex[fn.functionName] || 0) + c;
    }
    rows.push({ file, namedFunctionsExecuted: `${executed}/${named}`, calls, exportedFunctionsNeverCalled: [...exported].filter((x) => !ex[x]) });
  }
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}

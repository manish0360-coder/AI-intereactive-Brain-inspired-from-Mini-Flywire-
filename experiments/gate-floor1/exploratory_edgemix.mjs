// ==========================================================
// GATE-FLOOR-1 — EXPLORATORY follow-up of the final-hop retry diagnostic (post-hoc; NOT part of the frozen analysis)
// ==========================================================
//   node exploratory_edgemix.mjs --in <block run dir> [--out <json>]
// Why is the pooled failures-per-success of the final hop HIGHER with the floor than in COLD?  The environment draw is
// memoryless (each attempt succeeds with the edge's own hidden probability), so a higher ratio can only come from WHICH
// goal-neighbour edges are attempted - not from "retrying" per se.  This reads each session's recorded final-hop events,
// joins the edge's TRUE success probability (harness-only: the agent never sees it), and reports, per arm:
//   observed success share of final-hop attempts vs the share expected from the edges attempted (a consistency check
//   that the draws are Bernoulli(p)), the attempts-weighted mean true p, the share of attempts through the world's most /
//   least reliable goal edge, and the paired-by-world difference in attempts-weighted mean p versus COLD.
// Descriptive; no threshold; changes no claim.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import * as C from './config.mjs';
import { loadBlock } from './analyze.mjs';
import { pairedSummary } from '../xfer1/stats.mjs';

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function edgeMix({ plan, records }) {
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const acc = Object.fromEntries(C.ARM_ORDER.map(a => [a, { attempts: 0, successes: 0, expected: 0, best: 0, worst: 0, distinct: [], perWorldP: {} }]));
  const goalEdges = {};
  for (const w of worlds) {
    const r0 = records.get(`gf1-COLD-w${w}`);
    const { cfg } = env.generateAccepted(r0.input.configSeed, r0.input.configIndex);
    env.install(cfg);
    const goal = cfg.goal;
    const nb = [];
    for (const rec of C.ARM_ORDER.map(a => records.get(`gf1-${a}-w${w}`))) for (const e of rec.finalHop.events) if (!nb.includes(e[1])) nb.push(e[1]);
    const p = Object.fromEntries(nb.map(u => [u, env.trueP(u, goal)]));
    const ps = nb.map(u => p[u]);
    goalEdges[w] = { goal, edges: nb.length, max: Math.max(...ps), min: Math.min(...ps), mean: mean(ps) };
    for (const arm of C.ARM_ORDER) {
      const ev = records.get(`gf1-${arm}-w${w}`).finalHop.events;
      const a = acc[arm];
      let ex = 0, n = 0;
      const used = new Set();
      for (const [, from, ok] of ev) {
        a.attempts++; a.successes += ok; a.expected += p[from]; ex += p[from]; n++; used.add(from);
        if (p[from] === goalEdges[w].max) a.best++;
        if (p[from] === goalEdges[w].min) a.worst++;
      }
      a.distinct.push(used.size);
      a.perWorldP[w] = n > 0 ? ex / n : null;
    }
  }
  const out = { status: 'EXPLORATORY_POST_HOC', arms: {}, pairedVsCOLD: {}, goalEdgesMeanP: mean(Object.values(goalEdges).map(g => g.mean)) };
  for (const arm of C.ARM_ORDER) {
    const a = acc[arm];
    const pbar = a.expected / a.attempts;
    out.arms[arm] = {
      attempts: a.attempts, observedSuccessShare: a.successes / a.attempts, expectedSuccessShareFromEdgesUsed: pbar,
      impliedFailuresPerSuccess: (1 - pbar) / pbar, observedFailuresPerSuccess: (a.attempts - a.successes) / a.successes,
      shareViaMostReliableGoalEdge: a.best / a.attempts, shareViaLeastReliableGoalEdge: a.worst / a.attempts, meanDistinctGoalEdgesUsedPerSession: mean(a.distinct),
      // binomial standard error of the observed share around the edge-implied one (z of the consistency check)
      consistencyZ: (a.successes / a.attempts - pbar) / Math.sqrt(pbar * (1 - pbar) / a.attempts),
    };
  }
  for (const arm of C.ARM_ORDER) {
    if (arm === 'COLD') continue;
    const ws = worlds.filter(w => acc[arm].perWorldP[w] !== null && acc.COLD.perWorldP[w] !== null);
    out.pairedVsCOLD[arm] = { worlds: ws.length, weightedMeanPDifference: pairedSummary(ws.map(w => acc[arm].perWorldP[w] - acc.COLD.perWorldP[w]), C.BOOTSTRAP) };
  }
  return out;
}

/** worlds whose own training session left an EMPTY store make REAL == COLD by construction; report the contrasts by store size */
export function storeSubset({ plan, controls, records }) {
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const E = (a, w) => records.get(`gf1-${a}-w${w}`).endpoints.goalReaches;
  const out = {};
  for (const [name, pred] of [['empty store (0 episodes)', (n) => n === 0], ['at least 1 episode', (n) => n >= 1], ['at least 20 episodes', (n) => n >= 20]]) {
    const ws = worlds.filter(w => pred(controls[w].realEpisodes));
    if (ws.length === 0) { out[name] = { worlds: 0 }; continue; }
    const d = (a, b) => pairedSummary(ws.map(w => E(a, w) - E(b, w)), C.BOOTSTRAP);
    out[name] = { worlds: ws.length, benefitFloor: d('COLD_FLOOR', 'COLD'), benefitReal: d('REAL', 'COLD'), benefitEntry: d('ENTRY_NR', 'COLD'), shortfallRealMinusFloor: d('REAL', 'COLD_FLOOR'), shortfallEntryMinusFloor: d('ENTRY_NR', 'COLD_FLOOR') };
  }
  return out;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in')) { console.error('--in is required'); process.exit(2); }
  const blk = loadBlock(path.resolve(flag('--in')));
  const r = { ...edgeMix(blk), storeSize: storeSubset(blk) };
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(r, null, 1));
  const f = (x, d = 3) => (x === null ? 'n/a' : x.toFixed(d));
  console.log('EXPLORATORY (post-hoc): final-hop edge mix; mean true p over the goal neighbours =', f(r.goalEdgesMeanP));
  for (const [a, x] of Object.entries(r.arms)) console.log(`  ${a.padEnd(11)} attempts ${String(x.attempts).padStart(6)} observed success ${f(x.observedSuccessShare)} expected from edges ${f(x.expectedSuccessShareFromEdgesUsed)} z ${f(x.consistencyZ, 2)}  implied fail/succ ${f(x.impliedFailuresPerSuccess)} observed ${f(x.observedFailuresPerSuccess)}  best-edge share ${f(x.shareViaMostReliableGoalEdge)} worst-edge share ${f(x.shareViaLeastReliableGoalEdge)} distinct edges/session ${f(x.meanDistinctGoalEdgesUsedPerSession, 2)}`);
  for (const [a, x] of Object.entries(r.pairedVsCOLD)) console.log(`  ${a.padEnd(11)} - COLD  attempts-weighted mean p difference ${f(x.weightedMeanPDifference.mean)} [${f(x.weightedMeanPDifference.ci.lower)}, ${f(x.weightedMeanPDifference.ci.upper)}] (${x.worlds} worlds)`);
  const g = (x) => (x ? `${f(x.mean, 1)} [${f(x.ci.lower, 1)}, ${f(x.ci.upper, 1)}]` : 'n/a');
  for (const [name, s] of Object.entries(r.storeSize)) console.log(`  store size ${name}: ${s.worlds} worlds` + (s.worlds ? `  benefit FLOOR ${g(s.benefitFloor)} REAL ${g(s.benefitReal)} ENTRY ${g(s.benefitEntry)}  REAL-FLOOR ${g(s.shortfallRealMinusFloor)}  ENTRY-FLOOR ${g(s.shortfallEntryMinusFloor)}` : ''));
}


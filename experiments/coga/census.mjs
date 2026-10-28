// ==========================================================
// COG-A — zero-session static census of distal states on the DEVELOPMENT worlds (M-COGA-2)
// ==========================================================
//   node experiments/coga/census.mjs [--out <file.json>]
// Reads only configuration structure (topology, p in both phases, goal).  Runs no agent, reads no outcome, touches no
// confirmatory index.  Development worlds = accepted-stream indices 0..29 from configuration seed 200,000 (the XFER-1 development
// worlds, already consumed for development by XFER-1, LEARN-0 and CREDIT-1).
//
// PRE-DECLARED RULES (committed before the census was first run):
//   gamma   = 0.95, fixed a priori (not tuned): effective horizon 1/(1-gamma) = 20 steps.  The census reports whether 20 exceeds the
//             largest expected attempts-to-goal; sensitivity at 0.90 and 0.99 is reported and selects nothing.
//   kappa   = the FIRST of 0.20, 0.10, 0.05 (most conservative first) at which the development worlds carry on average at least
//             1.0 DISTAL state per world (gamma = 0.95, both objectives, kappa-stable).  A larger kappa demands a clearer switch, so
//             the rule takes the most demanding tolerance that still leaves material.  If none qualifies, the census verdict is
//             DISTAL_TOO_RARE and the study stops before any session for a Director decision (no environment change is made here).
//   K_dist  = 1: a world needs at least one DISTAL state to be able to contribute an eligible event (second-stage acceptance).
//   D-f     = the 150-step cap is negligible if the largest expected attempts-to-goal over every state and both phases is <= 50.
//   D-g     = the attempts-optimal action on G \ {s} must equal env.js reliabilityOptimalPolicy for every state and phase.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makeGraph, classifyWorld, continuation, cases, best } from './distal.mjs';
import * as env from '../m7/env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
export const DEV = Object.freeze({ configStart: 200000, worlds: 30 });
export const RULES = Object.freeze({ gamma: 0.95, kappaCandidates: [0.20, 0.10, 0.05], minMeanDistalPerWorld: 1.0, kDist: 1, capBound: 50,
  gammaSensitivity: [0.90, 0.99] });

const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')).map(e => ({ from: Number(e.from), to: Number(e.to) }));
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
export const GRAPH = makeGraph(NODES, EDGES);

export function devStream() { return env.generateAcceptedStream(DEV.configStart, DEV.worlds); }

/** static census of one world at one (gamma, kappa) */
export function censusWorld(w, gamma, kappa) {
  const states = classifyWorld(GRAPH, w.cfg.pPhase1, w.cfg.pPhase2, w.goal, { gamma, kappa });
  const count = {}; for (const r of states) count[r.cls] = (count[r.cls] || 0) + 1;
  const perObj = {}; for (const o of ['attempts', 'discounted']) { perObj[o] = { D2: 0, D3: 0, D4: 0, cls: {} };
    for (const r of states) { if (!r.decision) continue; const x = r.perObjective[o]; if (x.D2) perObj[o].D2++; if (x.D2 && x.D3) perObj[o].D3++; if (x.D2 && x.D3 && x.D4) perObj[o].D4++; perObj[o].cls[x.cls] = (perObj[o].cls[x.cls] || 0) + 1; } }
  return { distal: states.filter(r => r.distal).map(r => ({ s: r.s, deg: r.deg, A1star: r.A1star, A2star: r.A2star })),
    stable: states.filter(r => r.stable).map(r => r.s), count, perObjective: perObj, decisionStates: states.filter(r => r.decision).length };
}

/** D-f and D-g for one world */
export function worldChecks(w) {
  let maxCost = 0, compared = 0, disagree = 0, ties = 0;
  for (const ph of [w.cfg.pPhase1, w.cfg.pPhase2]) {
    const C = continuation(GRAPH, ph, w.goal, null, 'attempts', 0.95);
    for (const n of NODES) if (n !== w.goal) maxCost = Math.max(maxCost, C.get(n));
    const ref = env.reliabilityOptimalPolicy(ph, w.goal).policy;
    for (const s of NODES) { if (s === w.goal) continue; const b = best(cases(GRAPH, s, ph, ph, w.goal, 'attempts', 0.95).Q11); if (b === null) { ties++; continue; } compared++; if (b !== ref.get(s)) disagree++; }
  }
  return { maxExpectedAttempts: maxCost, policyCompared: compared, policyDisagree: disagree, exactTies: ties };
}

export function runCensus() {
  const stream = devStream();
  const worlds = stream.map((w, i) => ({ world: i, configSeed: w.acceptedSeed, goal: w.goal, checks: worldChecks(w), w }));
  const grid = {};
  for (const gamma of [RULES.gamma, ...RULES.gammaSensitivity]) for (const kappa of RULES.kappaCandidates) {
    const per = worlds.map(x => ({ world: x.world, goal: x.goal, ...censusWorld(x.w, gamma, kappa) }));
    const nd = per.map(x => x.distal.length);
    grid[`g${gamma}_k${kappa}`] = { gamma, kappa, meanDistal: nd.reduce((a, b) => a + b, 0) / nd.length, worldsWithDistal: nd.filter(n => n >= RULES.kDist).length,
      totalDistal: nd.reduce((a, b) => a + b, 0), meanStable: per.reduce((a, x) => a + x.stable.length, 0) / per.length,
      classTotals: per.reduce((acc, x) => { for (const [k, v] of Object.entries(x.count)) acc[k] = (acc[k] || 0) + v; return acc; }, {}),
      byGoal: Object.fromEntries([8, 12, 16, 19].map(g => [g, per.filter(x => x.goal === g).reduce((a, x) => a + x.distal.length, 0)])), worlds: per };
  }
  const chosen = RULES.kappaCandidates.find(k => grid[`g${RULES.gamma}_k${k}`].meanDistal >= RULES.minMeanDistalPerWorld) ?? null;
  const capOk = worlds.every(x => x.checks.maxExpectedAttempts <= RULES.capBound);
  const policyOk = worlds.every(x => x.checks.policyDisagree === 0);
  const verdict = chosen === null ? 'DISTAL_TOO_RARE' : (!capOk || !policyOk) ? 'CHECK_FAILED' : 'FEASIBLE';
  return { schema: 'coga.census/1', rules: RULES, dev: DEV, verdict, chosenKappa: chosen,
    worlds: worlds.map(({ w, ...x }) => x), maxExpectedAttempts: Math.max(...worlds.map(x => x.checks.maxExpectedAttempts)), capOk, policyOk, grid,
    distalSha256: crypto.createHash('sha256').update(fileURLToPath(new URL('./distal.mjs', import.meta.url)) && fs.readFileSync(new URL('./distal.mjs', import.meta.url))).digest('hex') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outAt = process.argv.indexOf('--out');
  const res = runCensus();
  if (outAt > 0) fs.writeFileSync(process.argv[outAt + 1], JSON.stringify(res, null, 1));
  console.log(`verdict ${res.verdict}; chosen kappa ${res.chosenKappa}; max expected attempts ${res.maxExpectedAttempts.toFixed(2)} (cap bound ${RULES.capBound}); policy cross-check ${res.policyOk ? 'ok' : 'FAILED'}`);
  for (const [k, g] of Object.entries(res.grid)) console.log(`${k}: mean DISTAL/world ${g.meanDistal.toFixed(2)}, worlds with >= ${RULES.kDist}: ${g.worldsWithDistal}/30, total ${g.totalDistal}, mean STABLE ${g.meanStable.toFixed(2)}, by goal ${JSON.stringify(g.byGoal)}, classes ${JSON.stringify(g.classTotals)}`);
}

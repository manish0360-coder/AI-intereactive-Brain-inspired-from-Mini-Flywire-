// ==========================================================
// COG-A — worlds: M7 accepted configurations described for the study (pure apart from reading the topology)
// ==========================================================
// A world = one accepted M7 configuration (env.js generateAccepted / generateAcceptedStream, acceptance unchanged) plus its static
// COG-A classification at the frozen gamma / kappa: DISTAL and STABLE states with their A1* / A2* sets (distal.mjs), and the
// second-stage acceptance flag (>= K_DIST DISTAL states).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { makeGraph, classifyWorld } from './distal.mjs';
import { GAMMA, KAPPA, K_DIST } from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')).map(e => ({ from: Number(e.from), to: Number(e.to) }));
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
export const GRAPH = makeGraph(NODES, EDGES);
/** neighbours of every node, ascending (the baselines' action order) */
export const NEIGHBOURS = new Map(NODES.map(n => [n, GRAPH.adj.get(n).map(x => x.v).sort((a, b) => a - b)]));
const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const EDGE_OF = new Map(EDGES.map((e, i) => [KEY(e.from, e.to), i]));
export const edgeIndex = (a, b) => EDGE_OF.get(KEY(Number(a), Number(b)));

/** describe an accepted configuration; `id` is the world id used in stream identities ('<index>' or 'sim:<index>') */
export function describe({ cfg, acceptedSeed, configIndex, stream }) {
  const states = classifyWorld(GRAPH, cfg.pPhase1, cfg.pPhase2, cfg.goal, { gamma: GAMMA, kappa: KAPPA });
  const pick = (f) => states.filter(f).map(r => ({ s: r.s, A1star: r.A1star, A2star: r.A2star }));
  const distal = pick(r => r.distal), stable = pick(r => r.stable);
  const pi1 = new Map(states.filter(r => r.decision).map(r => [r.s, r.A1star]));   // phase-I near-optimal sets (P2 competence)
  return {
    id: stream === 'study' ? String(configIndex) : `sim:${configIndex}`, stream, index: configIndex, configSeed: acceptedSeed, goal: cfg.goal,
    p1: cfg.pPhase1, p2: cfg.pPhase2, distal, stable, pi1: Object.fromEntries(pi1),
    classCounts: states.reduce((a, r) => { a[r.cls] = (a[r.cls] || 0) + 1; return a; }, {}),
    accepted: distal.length >= K_DIST,
  };
}

/** the first `count` worlds of an accepted-configuration stream */
export function streamWorlds(start, count, stream) {
  return env.generateAcceptedStream(start, count).map(w => describe({ cfg: w.cfg, acceptedSeed: w.acceptedSeed, configIndex: w.acceptedConfigIndex, stream }));
}

/** a single world re-derived from its accepted seed and index (verifies the seed is accepted there with no rejection) */
export function worldAt(acceptedSeed, configIndex, stream) {
  const g = env.generateAccepted(acceptedSeed, configIndex);
  if (g.provenance.acceptedSeed !== acceptedSeed || g.provenance.numberOfRejectedCandidatesBeforeAcceptance !== 0) throw new Error(`seed ${acceptedSeed} is not accepted at index ${configIndex}`);
  return describe({ cfg: g.cfg, acceptedSeed, configIndex, stream });
}

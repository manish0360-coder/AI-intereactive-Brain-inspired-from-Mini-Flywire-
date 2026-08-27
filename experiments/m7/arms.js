// ==========================================================
// M7 ARMS — the seven experimental switches, all default OFF
// ==========================================================
// GOVERNING SOURCE: frozen M7_PREREGISTRATION.md
//   SHA-256 2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9
//   §4 arm table (verbatim below) · §4.1 both trust routes · §4.3 held-identical
//   §5.1 sigma seed = agentSeed XOR 0xBEEF · §14 G4/G5/G6 · §18.1 this file
//
// HARNESS-OWNED. Never imported by render/. main.js will consult this module
// at the E3 (bayesianTrust read) and E4 (aggregateTrust) sites in a later
// milestone; this file contains NO main.js integration.
//
// FROZEN §4, verbatim:
//   A1 BELIEF          Full: per-edge trust live, aggregate trust live
//   A2 ABLATION        bayesianTrust = 0.5 at main.js:2065 AND aggregateTrust
//                      = null at main.js:3245. Q-learning fully intact.
//   A3 RANDOM          Uniform action selection
//   A4 FROZEN          Q updates and trust updates disabled; scoring
//                      heuristics intact
//   A5 AGGREGATE-ONLY  Aggregate trust live; per-edge severed
//                      (bayesianTrust = 0.5)
//   A6 SHUFFLED        bayesianTrust = trust(sigma(e)), sigma a fixed
//                      derangement over edges, drawn per run seed
//   A7 ORACLE          bayesianTrust = p_e (true hidden value)
//
// DEFAULT STATE IS 'OFF' (frozen §18.1: "all default-off"). In OFF every
// accessor is an identity passthrough, so the agent is observationally
// identical to the current M7-off build.
//
// NOTE ON A1 vs OFF: A1 is also an identity passthrough for both trust
// routes -- that is what "full belief" means. The two differ only in that
// A1 is an M7 run and therefore pins the prediction-error pathway (§4.3),
// while OFF is not an M7 run at all.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from '../../instrumentation/rng.js';
import * as env from './env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

// Edge indexing: connections.json file order, identical to env.js. Loaded
// here rather than imported so arms.js does not require a new env.js export;
// verify_arms.js cross-checks every index against env.edgeIndexOf().
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))
  .map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));

export const OFF  = 'OFF';
export const ARMS = Object.freeze(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']);
export const ARM_NAMES = Object.freeze({
  A1: 'BELIEF', A2: 'ABLATION', A3: 'RANDOM', A4: 'FROZEN',
  A5: 'AGGREGATE-ONLY', A6: 'SHUFFLED', A7: 'ORACLE'
});

// frozen §4.2: these five may not be removed or simplified without Director approval
export const LOCKED_ARMS = Object.freeze(['A1', 'A2', 'A5', 'A6', 'A7']);

// frozen §4.1: severing only the per-edge route leaves A2 holding a real
// statistic of the hidden variable. Both routes must be cut in A2.
const SEVERED_TRUST = 0.5;      // frozen §4: "bayesianTrust = 0.5"

// ==========================================================
// sigma — fixed derangement over edge indices (A6)
// ==========================================================
// frozen §5.1: seed is agentSeed XOR 0xBEEF.
// frozen G6: sigma must be bijective with no fixed point.
// Uniform over derangements by rejection-sampled Fisher-Yates. The sampling
// method is an implementation detail: G6 constrains the ACCEPTANCE criteria
// (bijective, no fixed point) and any derangement satisfies them equally.
// No scientific parameter is introduced.
export function makeSigma(agentSeed) {
  const rnd = makeRng((agentSeed ^ 0xBEEF) >>> 0);
  const n = EDGES.length;
  for (let attempt = 0; attempt < 10000; attempt++) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.every((v, i) => v !== i)) return a;      // reject any fixed point
  }
  throw new Error('makeSigma: no derangement found — impossible for n >= 2');
}

// ==========================================================
// active state
// ==========================================================
let ARM = OFF;
let AGENT_SEED = null;
let SIGMA = null;
let TRUST_OF = null;           // (fromId, toId) -> raw path trust, supplied by main.js

export function reset() { ARM = OFF; AGENT_SEED = null; SIGMA = null; TRUST_OF = null; }

export function configure({ arm = OFF, agentSeed = null, trustOf = null } = {}) {
  if (arm !== OFF && !ARMS.includes(arm))
    throw new Error(`arms.configure: unknown arm "${arm}" — expected one of ${OFF}, ${ARMS.join(', ')}`);
  if (arm === 'A6') {
    if (!Number.isInteger(agentSeed))
      throw new Error('arms.configure: arm A6 (SHUFFLED) requires an integer agentSeed (frozen §5.1: sigma = agentSeed XOR 0xBEEF)');
    if (typeof trustOf !== 'function')
      throw new Error('arms.configure: arm A6 (SHUFFLED) requires a trustOf(from,to) lookup');
  }
  ARM = arm;
  AGENT_SEED = agentSeed;
  TRUST_OF = trustOf;
  SIGMA = (arm === 'A6') ? makeSigma(agentSeed) : null;
  return current();
}

export function current() {
  return { arm: ARM, name: ARM === OFF ? 'OFF' : ARM_NAMES[ARM], agentSeed: AGENT_SEED, hasSigma: SIGMA !== null };
}
export function sigma() { return SIGMA ? [...SIGMA] : null; }
export function isOn() { return ARM !== OFF; }

// ==========================================================
// E3 — the bayesianTrust read (main.js:2065)
// ==========================================================
// rawTrust is what getPathTrust(from->to) returned. Each arm may replace it,
// and ONLY it. Every arm not named here passes the raw value through.
export function bayesianTrustFor(fromId, toId, rawTrust) {
  switch (ARM) {
    case 'A2':                                   // ABLATION: per-edge severed
    case 'A5':                                   // AGGREGATE-ONLY: per-edge severed
      return SEVERED_TRUST;

    case 'A6': {                                 // SHUFFLED: trust(sigma(e))
      const i = edgeIndex(fromId, toId);
      if (i === undefined) return rawTrust;      // not a graph edge: unchanged
      const t = EDGES[SIGMA[i]];
      return TRUST_OF(t.from, t.to);
    }

    case 'A7': {                                 // ORACLE: the true hidden value
      const p = env.trueP(fromId, toId);
      return (p === null || p === undefined) ? rawTrust : p;
    }

    default:                                     // OFF, A1, A3, A4
      return rawTrust;
  }
}

// ==========================================================
// E4 — the aggregateTrust value (main.js:3245)
// ==========================================================
// frozen §4.1: A2 must sever BOTH routes, so the aggregate is null there.
// A5 keeps it live -- that is the whole point of the AGGREGATE-ONLY arm.
export function aggregateTrustFor(rawAggregate) {
  return (ARM === 'A2') ? null : rawAggregate;
}

// ==========================================================
// A4 FROZEN — "Q updates and trust updates disabled; scoring heuristics intact"
// ==========================================================
export function allowsQUpdate()     { return ARM !== 'A4'; }
export function allowsTrustUpdate() { return ARM !== 'A4'; }

// ==========================================================
// A3 RANDOM — "Uniform action selection"
// ==========================================================
export function usesUniformActionSelection() { return ARM === 'A3'; }

// ==========================================================
// frozen §4.3 — held identical across ALL arms
// ==========================================================
// learningAuthority = 1.0 and dampQ disabled are NOT arm switches: they are
// pinned for every M7 arm (frozen §10.2, gate G12). Exposed here so main.js
// E5 reads one authority, and so verify_arms can assert arm-invariance.
export function pinsPredictionErrorPathway() { return isOn(); }

// ---- local edge lookup (cross-checked against env.edgeIndexOf in the gate) ----
const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const INDEX = new Map(EDGES.map(e => [KEY(e.from, e.to), e.i]));
export function edgeIndex(a, b) { return INDEX.get(KEY(Number(a), Number(b))); }
export function edgeCount() { return EDGES.length; }
export function edgeAt(i) { return EDGES[i] ? { from: EDGES[i].from, to: EDGES[i].to } : undefined; }

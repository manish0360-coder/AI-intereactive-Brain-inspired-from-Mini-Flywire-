// ==========================================================
// MCF-1 Phase 1 — constants, approval status and the official-stage gate
// ==========================================================
// MCF-1 asks one narrow question about the frozen B2-conformed agent: at node 10 for goal 12,
// does a restored prior episode on the reliable (rather than the unreliable) of two matched
// two-hop routes steer the first routing choice, and what does that do to first-edge traversal
// success?  Phase 1 only: ONE decision and ONE environment attempt.  The endpoint is first-edge
// traversal success.  It is NOT goal arrival (node 12 is not a neighbour of node 10).
//
// DESIGN BOUNDARY (this file records it, it does not freeze it)
//   * Option C: a census of the whole frozen, qualified, valid finite frame.  There is no
//     sampling-based inference and no generalisation beyond the frame.
//   * Every design choice below carries a status.  Only APPROVED values may reach an official
//     stage, and an official stage additionally needs a freeze record whose hashes match.
//   * This harness registers no seed, consumes no confirmatory seed and runs no official
//     experiment.  `assertOfficialAllowed` refuses while FROZEN is false.
//
// Everything here is read-only with respect to H1-R and the seed registry.
// ==========================================================
import crypto from 'node:crypto';

export const STUDY = 'MCF-1';
export const SCHEMA = 'mcf1.harness/1';
export const M32 = 2 ** 32;

// ---- the registered task (source: MCF-0 / MCF-1 scratch work, graph in connections.json) ----
export const FRAME = Object.freeze({
  goal: 12,
  startNode: 10,
  candidates: Object.freeze([6, 9, 11, 13]),          // the graph neighbours of node 10, exactly
  routes: Object.freeze({ 9: Object.freeze([10, 9, 12]), 11: Object.freeze([10, 11, 12]) }),
  configIndex: 1,                                      // GOALS[configIndex mod 4] = 12
});

export const DESIGN = Object.freeze({
  contents: Object.freeze(['C', 'M9', 'M11']),         // C = no memory; Mb = one episode on route via b
  twins: Object.freeze(['T9', 'T11']),                 // Tb = route via b is the reliable one
  // route-edge reliabilities are DESIGN CONSTANTS set by the experimenter (not discoveries)
  reliability: Object.freeze({ reliable: 0.95, unreliable: 0.35 }),
  // the other 35 edges of the base configuration are copied unchanged; pPhase2 = pPhase1
  runsPerSeedPerStage: 6,
});

// ---- candidate (UNAPPROVED) parameters ----
export const BUDGETS = Object.freeze({
  status: 'CANDIDATE',
  cognitive: 4096, visual: 16384, environment: 64,     // sigma is consumed only by arm A6 (arms.js), unused here
  basis: 'about 5-6x the measured use (cognitive 653-671, visual 3020, environment 1 draw)',
});

export const BLOCK = Object.freeze({
  status: 'CANDIDATE_NOT_AUTHORIZED',
  start: 1_500_000_000,
  scanLength: 4000,
  note: 'passed the position-only feasibility check against every reservation class; NOT registered, NOT authorised for confirmatory use',
});

// development-only base configuration (below the held-out floor, unconsumed; accepted seed 100026)
export const DEV_BASE_CONFIG = Object.freeze({ configSeed: 100000, configIndex: 1, acceptedSeed: 100026, status: 'DEVELOPMENT' });

// ---- exploratory provenance that must stay reserved (immutable disclosure) ----
export const DEV_BLOCK = Object.freeze({
  id: 'EXPLORATORY_DEV_BLOCK', start: 1_100_000_000, count: 2400,
  source: 'scratch cold census and fidelity pass (agent seeds 1100000000+0..2399; decision-stop runs)',
});
// the draws that were actually examined in aggregate (cognitive 1..800 and environment draw 1; visual and sigma were NOT examined)
export const EXPOSURE = Object.freeze([
  Object.freeze({ id: 'EXAMINED_1P2E9', start: 1_200_000_000, count: 20_000, cognitive: 800, environment: 1,
    source: 'aggregate two-sample KS of cognitive draws 1..800 and environment draw 1 (seed-policy diagnostics, 20,000 seeds)' }),
  Object.freeze({ id: 'EXAMINED_OFFLINE_1P1E9', start: 1_100_000_000, count: 200_000, cognitive: 800, environment: 1,
    source: 'offline RNG-structure diagnostic (u1 uniformity and dependence on cognitive draws 1..800, 200,000 seeds)' }),
]);

// the only raw-seed domain development-mode runs may touch (all of it is already exploratory)
export const DEVELOPMENT_DOMAIN = Object.freeze({ lo: 1_100_000_000, hi: 1_100_199_999 });

// ---- approval ledger: nothing here is frozen by the harness ----
export const APPROVALS = Object.freeze({
  samplingDesign:      Object.freeze({ value: 'C', status: 'PROVISIONAL' }),
  primaryDescriptive:  Object.freeze({ value: 'T_frame', status: 'PROVISIONAL', note: 'counterbalanced steering rate; alternatives sigmaBar and netShift are always computed' }),
  practicalThreshold:  Object.freeze({ value: null, status: 'UNDECIDED' }),
  minimumValidFrame:   Object.freeze({ value: null, status: 'UNDECIDED' }),
  seedBlock:           Object.freeze({ value: BLOCK.start, status: 'CANDIDATE_NOT_AUTHORIZED' }),
  scanLength:          Object.freeze({ value: BLOCK.scanLength, status: 'CANDIDATE_NOT_AUTHORIZED' }),
  budgets:             Object.freeze({ value: 'cognitive 4096 / visual 16384 / environment 64', status: 'CANDIDATE' }),
  instrumentHaltCount: Object.freeze({ value: 3, status: 'PLACEHOLDER' }),
  registryRecordScope: Object.freeze({ value: 'all admitted raw seeds', status: 'PROVISIONAL' }),
  claimWording:        Object.freeze({ value: 'context-bound, memory-guided routing under the specified reliability assignment', status: 'PROVISIONAL' }),
});
export const FROZEN = false;
export const REQUIRED_FOR_OFFICIAL = Object.freeze(['samplingDesign', 'primaryDescriptive', 'practicalThreshold', 'minimumValidFrame', 'seedBlock', 'scanLength', 'budgets', 'instrumentHaltCount', 'registryRecordScope', 'claimWording']);

// ---- helpers ----
export function canonicalJson(x) {
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])]));
    return v;
  };
  return JSON.stringify(norm(x));
}
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const hashObject = (o) => sha256(canonicalJson(o));
/** SHA-256 of a text file with CRLF normalised to LF (git may rewrite line endings per checkout). */
export const hashTextNormalised = (text) => sha256(String(text).replace(/\r\n/g, '\n'));

/**
 * Which raw seeds may a run touch?
 *   development : only the already-exploratory development domain (never the candidate block)
 *   official    : only through a verified freeze record; the harness never builds one
 */
export function seedPolicy(mode, raw) {
  if (!Number.isSafeInteger(raw) || raw < 0 || raw >= M32) return { ok: false, why: 'raw seed must be an integer in [0, 2^32)' };
  const inCandidate = raw >= BLOCK.start && raw < BLOCK.start + BLOCK.scanLength;
  if (mode === 'development') {
    if (inCandidate) return { ok: false, why: 'the candidate confirmatory block is not authorised for development use' };
    if (raw < DEVELOPMENT_DOMAIN.lo || raw > DEVELOPMENT_DOMAIN.hi) return { ok: false, why: 'development runs are confined to the exploratory development domain' };
    return { ok: true };
  }
  if (mode === 'official') return { ok: false, why: 'official mode requires a verified freeze record (assertOfficialAllowed)' };
  return { ok: false, why: `unknown mode ${mode}` };
}

/**
 * Official stages are refused unless a freeze record exists, says frozen:true, carries APPROVED status for every
 * required decision, and its hashes equal the actual inputs.  No such record exists in this milestone.
 */
export function assertOfficialAllowed(freeze, actual = {}) {
  const fail = (m) => { throw new Error(`MCF-1 official stage refused: ${m}`); };
  if (FROZEN !== true && !(freeze && freeze.frozen === true)) fail('the design is not frozen (config FROZEN=false and no freeze record)');
  if (!freeze || typeof freeze !== 'object') fail('no freeze record supplied');
  if (freeze.schema !== 'mcf1.freeze/1') fail('freeze record has the wrong schema');
  if (freeze.frozen !== true) fail('freeze record does not say frozen:true');
  for (const k of REQUIRED_FOR_OFFICIAL) {
    const a = freeze.approvals && freeze.approvals[k];
    if (!a || a.status !== 'APPROVED' || a.value === null || a.value === undefined) fail(`decision "${k}" is not APPROVED in the freeze record`);
  }
  for (const k of ['preregistrationSha256', 'configSha256', 'inventorySha256', 'admittedSha256', 'treeDigest']) {
    if (typeof freeze[k] !== 'string' || freeze[k].length < 12) fail(`freeze record lacks ${k}`);
    if (typeof actual[k] !== 'string') fail(`the actual ${k} was not supplied for comparison`);
    if (actual[k] !== freeze[k]) fail(`${k} does not match the freeze record`);
  }
  return true;
}

/** The configuration object whose hash goes into every manifest. */
export function configSnapshot() {
  return { schema: SCHEMA, study: STUDY, frame: FRAME, design: DESIGN, budgets: BUDGETS, block: BLOCK, devBaseConfig: DEV_BASE_CONFIG,
    devBlock: DEV_BLOCK, exposure: EXPOSURE, developmentDomain: DEVELOPMENT_DOMAIN, approvals: APPROVALS, frozen: FROZEN };
}

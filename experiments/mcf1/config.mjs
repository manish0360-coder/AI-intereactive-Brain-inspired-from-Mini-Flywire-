// ==========================================================
// MCF-1 Phase 1 — constants, approval status and the study configuration
// ==========================================================
// MCF-1 asks one narrow question about the frozen B2-conformed agent: at node 10 for goal 12,
// does a restored prior episode on the reliable (rather than the unreliable) of two matched
// two-hop routes steer the first routing choice, and what does that do to first-edge traversal
// success?  Phase 1 only: ONE decision and ONE environment attempt.  The endpoint is first-edge
// traversal success.  It is NOT goal arrival (node 12 is not a neighbour of node 10).
//
// DESIGN BOUNDARY (this file records it, it does not freeze it)
//   * Option C: a census of the whole frozen, qualified, complete-cluster finite frame.  There is
//     no sampling-based inference and no generalisation beyond the frame.
//   * Every design choice below carries a status.  APPROVED_FOR_IMPLEMENTATION means the user
//     approved the value and the harness implements it; it is NOT a freeze.  Only a freeze record
//     (APPROVED statuses, matching hashes, and a record hash pinned in authorization.mjs by a
//     separate authorised commit) can unlock an official stage.
//   * This harness registers no seed, consumes no confirmatory seed and runs no official
//     experiment.  The decision lives in lock.mjs (`officialAuthorisation`), which reads only committed
//     state; this module holds data and helpers and no authority.  While the pin is null a synthetic or
//     test-only record can never authorise anything.
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
  status: 'APPROVED_FOR_IMPLEMENTATION',
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

// The study configuration: the environment an official run executes.  It is the development configuration ADOPTED
// by decision (the census and fidelity passes were run on it), and it is disclosed as such: `adoptedFromDevelopment`.
// Everything that can change the experiment is bound, not only the seed: provenance, the goal, the six registered
// frame-edge reliabilities (exact doubles, disclosed in plain numbers) and the digest of the explicit canonical
// representation of the WHOLE environment (envidentity.mjs: both reliability vectors, 20 x 32 embeddings, acceptance
// record, the environment module's frozen constants and the graph), with one digest per section so that a mismatch
// names what changed.  The verifier recomputes every value from both the repository and the conformed-tree copy of
// env.js and proves they agree.
export const STUDY_CONFIGURATION = Object.freeze({
  seed: 100000, index: 1, acceptedSeed: 100026, rejectedBeforeAcceptance: 26,
  adoptedFromDevelopment: true, adoptedFrom: 'DEV_BASE_CONFIG',
  goal: 12,
  frameEdgeReliabilities: Object.freeze({
    '10-6': 0.9185002863872797, '10-13': 0.9150888603413477, '10-9': 0.9182312041288242,
    '10-11': 0.31437050411477685, '9-12': 0.2715426693670452, '11-12': 0.28061404754407704,
  }),
  environment: Object.freeze({
    schema: 'mcf1.env/1',
    sha256: '76c141f8d5d4a1cb7a17ed42b5969e21e124dc90e93684aee5fbc24fd6a56257',
    sections: Object.freeze({
      identity: '845a913450df028b4defb06f04911b008aac800d39dad85401da8b2f6c6205fe',
      selection: '12fcf25c6ee37e4b19643f338dc6f40c973fc281b543d07609133290247344ae',
      pPhase1: '80856be20b111f42e220eda72b71c016c39e7e6d0b8eb605d6664b3f598b49f2',
      pPhase2: 'a2e247ed6ec12c4cc73ef5fcb94348364641615a6949dd56529fdfa14cf92a7e',
      embedding: '78612ed05d0f77af2685ef6b5db7d86ba297ce24c1a3167dd6380c994a6a4698',
      acceptance: '49153d340e18f25081f3f365564426824c8afbffc074dd1cd9a619fffa3c8066',
      constants: '3b367d94cb24f92a4651a7fc3d5824c84c08f7e7210624fec3bd58a2e9a56f1e',
      graph: '7facf9ca1b89d9c6ac678e389860b0414976da836f7d7c0507d34d27173e7551',
    }),
  }),
});

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

// ---- approval ledger (R1): the user approved these ten decisions for IMPLEMENTATION; nothing is frozen ----
// status vocabulary: APPROVED_FOR_IMPLEMENTATION (implemented here, not a freeze) | CANDIDATE_NOT_AUTHORIZED.
// The word APPROVED is reserved for a freeze record; no status in this file can ever unlock an official stage.
export const APPROVALS = Object.freeze({
  samplingDesign:      Object.freeze({ value: 'C', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'census of the whole frozen, qualified, complete-cluster frame; no sampling inference' }),
  primaryDescriptive:  Object.freeze({ value: 'T_frame', status: 'APPROVED_FOR_IMPLEMENTATION',
    note: 'T_frame = mean over the frame of S_s = 1/2 (1{x9=9} - 1{x9=11} + 1{x11=11} - 1{x11=9}); x9 and x11 are the executed first edges under M9 and M11' }),
  practicalThreshold:  Object.freeze({ value: 'none', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'finite-frame census: no practical or significance threshold, no p-values, no sampling-based intervals' }),
  minimumValidFrame:   Object.freeze({ value: 100, status: 'APPROVED_FOR_IMPLEMENTATION', note: 'sanity floor on complete valid seeds, not a power or significance threshold; scientific interpretation is refused below it' }),
  seedBlock:           Object.freeze({ value: BLOCK.start, status: 'CANDIDATE_NOT_AUTHORIZED', note: 'not authorised for any scan or execution in R1' }),
  scanLength:          Object.freeze({ value: BLOCK.scanLength, status: 'CANDIDATE_NOT_AUTHORIZED' }),
  budgets:             Object.freeze({ value: 'cognitive 4096 / visual 16384 / environment 64', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'sigma unused; runtime budget enforcement (V11) unchanged' }),
  instrumentHaltCount: Object.freeze({ value: 1, status: 'APPROVED_FOR_IMPLEMENTATION',
    note: 'the first non-operational seed-scope fault at Stage O halts the stage; V1, V9, V12 halt; a run error gets one deterministic isolated retry and then halts' }),
  registryRecordScope: Object.freeze({ value: 'all admitted raw seeds, recorded (MCF-1, registered) before Stage Q', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'preflight refuses an official Stage Q otherwise; no entry is created by the harness' }),
  claimWording:        Object.freeze({ value: 'memory-guided first-edge routing within the single specified simulation context and the enumerated frame; no planning, probability understanding, goal-conditioned recall, generalization, general cognition or general performance benefit', status: 'APPROVED_FOR_IMPLEMENTATION' }),
  completeClusterFrame: Object.freeze({ value: 'complete-cluster', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'a seed enters the frame only if all six condition/twin runs are present and valid at Stage V and Stage O; one frame for every metric' }),
  v6Handling:          Object.freeze({ value: 'diagnostic', status: 'APPROVED_FOR_IMPLEMENTATION', note: 'V6 pair-class and signed score are reported; V6 never decides frame membership' }),
  studyConfiguration:  Object.freeze({ value: STUDY_CONFIGURATION, status: 'APPROVED_FOR_IMPLEMENTATION',
    note: 'the development configuration 100000 / 1 / accepted 100026, adopted and disclosed as adopted from development; identity, provenance, goal, frame-edge reliabilities and the whole-environment digest are bound' }),
});
export const FROZEN = false;
export const REQUIRED_FOR_OFFICIAL = Object.freeze(['samplingDesign', 'primaryDescriptive', 'practicalThreshold', 'minimumValidFrame', 'seedBlock', 'scanLength', 'budgets', 'instrumentHaltCount', 'registryRecordScope', 'claimWording', 'completeClusterFrame', 'v6Handling', 'studyConfiguration']);
// The pin that authorises official stages is NOT here: it lives alone in authorization.mjs (a data-only module that
// no digest covers) and is read only by lock.mjs.  Nothing in this module can unlock an official stage.

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
 *   official    : never decided here; official membership is the registered MCF-1 block, checked by lock.mjs
 */
export function seedPolicy(mode, raw) {
  if (!Number.isSafeInteger(raw) || raw < 0 || raw >= M32) return { ok: false, why: 'raw seed must be an integer in [0, 2^32)' };
  const inCandidate = raw >= BLOCK.start && raw < BLOCK.start + BLOCK.scanLength;
  if (mode === 'development') {
    if (inCandidate) return { ok: false, why: 'the candidate confirmatory block is not authorised for development use' };
    if (raw < DEVELOPMENT_DOMAIN.lo || raw > DEVELOPMENT_DOMAIN.hi) return { ok: false, why: 'development runs are confined to the exploratory development domain' };
    return { ok: true };
  }
  if (mode === 'official') return { ok: false, why: 'official mode is decided by lock.mjs (committed authorization and the registered block), never by seed policy' };
  return { ok: false, why: `unknown mode ${mode}` };
}

/**
 * The configuration object whose hash goes into every manifest and into the freeze record.  It deliberately contains
 * no authorization pin: the record that binds this hash is itself pinned, so a pin in here would be a cycle.
 */
export function configSnapshot() {
  return { schema: SCHEMA, study: STUDY, frame: FRAME, design: DESIGN, budgets: BUDGETS, block: BLOCK, devBaseConfig: DEV_BASE_CONFIG,
    studyConfiguration: STUDY_CONFIGURATION, devBlock: DEV_BLOCK, exposure: EXPOSURE, developmentDomain: DEVELOPMENT_DOMAIN,
    approvals: APPROVALS, frozen: FROZEN };
}

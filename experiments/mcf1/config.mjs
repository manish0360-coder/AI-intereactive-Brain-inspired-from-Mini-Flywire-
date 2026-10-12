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
//   * Option C: a census of the whole frozen, qualified, complete-cluster finite frame.  There is
//     no sampling-based inference and no generalisation beyond the frame.
//   * Every design choice below carries a status.  APPROVED_FOR_IMPLEMENTATION means the user
//     approved the value and the harness implements it; it is NOT a freeze.  Only a freeze record
//     (APPROVED statuses, matching hashes, and a record hash pinned in OFFICIAL_AUTHORIZATION by a
//     separate authorised commit) can unlock an official stage.
//   * This harness registers no seed, consumes no confirmatory seed and runs no official
//     experiment.  `assertOfficialAllowed` refuses while FROZEN is false and while the pinned
//     freeze-record hash is null; a synthetic or test-only record can therefore never authorise.
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
});
export const FROZEN = false;
export const REQUIRED_FOR_OFFICIAL = Object.freeze(['samplingDesign', 'primaryDescriptive', 'practicalThreshold', 'minimumValidFrame', 'seedBlock', 'scanLength', 'budgets', 'instrumentHaltCount', 'registryRecordScope', 'claimWording', 'completeClusterFrame', 'v6Handling']);
/**
 * The only way an official stage can ever be unlocked is a commit that pins the SHA-256 of the genuine freeze
 * record here.  While this is null no record, genuine or synthetic, can authorise anything.
 */
export const OFFICIAL_AUTHORIZATION = Object.freeze({
  freezeRecordSha256: null,
  note: 'null: no freeze record is authorised.  A separate, explicitly authorised commit sets this after the design freeze.',
});

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

const officialFail = (m) => { throw new Error(`MCF-1 official stage refused: ${m}`); };

/**
 * Step 1 of the official gate, run BEFORE any inventory build, admission scan or execution: a freeze record must
 * exist, say frozen:true, not be test-only, carry APPROVED status for every required decision, and its own hash must
 * equal OFFICIAL_AUTHORIZATION.freezeRecordSha256.  While that pin is null (this milestone) nothing passes.
 * `pinnedFreezeSha256` exists only so the verifier can prove the structural checks are not vacuous.
 */
export function assertFreezeAuthorised(freeze, { pinnedFreezeSha256 = OFFICIAL_AUTHORIZATION.freezeRecordSha256 } = {}) {
  if (FROZEN !== true && !(freeze && freeze.frozen === true)) officialFail('the design is not frozen (config FROZEN=false and no freeze record)');
  if (!freeze || typeof freeze !== 'object') officialFail('no freeze record supplied');
  if (freeze.schema !== 'mcf1.freeze/1') officialFail('freeze record has the wrong schema');
  if (freeze.frozen !== true) officialFail('freeze record does not say frozen:true');
  if (freeze.testOnly === true) officialFail('freeze record is marked testOnly');
  for (const k of REQUIRED_FOR_OFFICIAL) {
    const a = freeze.approvals && freeze.approvals[k];
    if (!a || a.status !== 'APPROVED' || a.value === null || a.value === undefined) officialFail(`decision "${k}" is not APPROVED in the freeze record`);
  }
  if (typeof pinnedFreezeSha256 !== 'string' || pinnedFreezeSha256.length < 12) officialFail('no freeze record is authorised: OFFICIAL_AUTHORIZATION.freezeRecordSha256 is not set');
  if (hashObject(freeze) !== pinnedFreezeSha256) officialFail('the freeze record hash does not equal OFFICIAL_AUTHORIZATION.freezeRecordSha256');
  return true;
}

/**
 * Step 2: the record's hashes must equal the actual inputs.  Official stages are refused unless BOTH steps pass.
 * No authorised record exists in this milestone.
 */
export function assertOfficialAllowed(freeze, actual = {}, opts = {}) {
  assertFreezeAuthorised(freeze, opts);
  for (const k of ['preregistrationSha256', 'configSha256', 'inventorySha256', 'admittedSha256', 'treeDigest']) {
    if (typeof freeze[k] !== 'string' || freeze[k].length < 12) officialFail(`freeze record lacks ${k}`);
    if (typeof actual[k] !== 'string') officialFail(`the actual ${k} was not supplied for comparison`);
    if (actual[k] !== freeze[k]) officialFail(`${k} does not match the freeze record`);
  }
  return true;
}

/** The configuration object whose hash goes into every manifest. */
export function configSnapshot() {
  return { schema: SCHEMA, study: STUDY, frame: FRAME, design: DESIGN, budgets: BUDGETS, block: BLOCK, devBaseConfig: DEV_BASE_CONFIG,
    devBlock: DEV_BLOCK, exposure: EXPOSURE, developmentDomain: DEVELOPMENT_DOMAIN, approvals: APPROVALS, frozen: FROZEN,
    officialAuthorization: OFFICIAL_AUTHORIZATION };
}

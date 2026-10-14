// ==========================================================
// GATE-FLOOR-B2 — pristine-runtime replication of GATE-FLOOR-1: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Substrate: the exact B2 (707cb1e) blob set, no H1-R conformance edit and no
// H1-R runtime.  Question (unchanged): does a guarded, default-off floor on the goal-entering score term, with no
// stored episode, reproduce the benefit of episodic persistence - now on the runtime the product actually ships?
// Everything shared with GATE-FLOOR-1 (arms, floor value, margins, classification, claims, bootstrap) is IMPORTED,
// not restated.  PRISTINE_RUNTIME.md records the facts this design rests on; the three scientifically necessary
// changes are listed under CHANGES below.
//
// CHANGES FROM GATE-FLOOR-1 (each forced by a measured property of the pristine runtime):
//   (1) PRIMARY OUTCOME = LEGAL goal reaches.  B2 has no N1 guard: a goal reset can follow a move that is not a graph
//       edge (calibration, worlds 0..39, floor off: 38% of COLD's resets, 44% of REAL's, 24% of ENTRY_NR's).  The conformed
//       estimand counted only graph-edge traversals (all of its reaches were legal), so the faithful estimand is the
//       goal resets whose move was a graph edge.  ALL resets (the runtime's own accounting) is a declared sensitivity.
//   (2) The final-hop retry diagnostic is structurally degenerate: B2 takes NO environment draw for a goal-entering
//       move (it always arrives), so failures are 0 by construction.  It is reported as such, with a draw log that
//       would expose any draw into the goal.
//   (3) The audit differs: the floor may EVALUATE non-graph candidates (B2 admits them) but must never RAISE one; and
//       B2's own non-edge resets are reported per arm instead of being forbidden.
// Margins (DELTA 25, MIN_BENEFIT 50, MAX_ATTEMPT_DROP 0.05) and n = 160 are kept: calibration paired SDs are 76-112
// (largest 111.6 -> n >= 156), and the legal benefit scale of the real store (+69) makes DELTA 25 stricter, not looser.
// ==========================================================
import * as G from '../gate-floor1/config.mjs';

export const SCHEMA = 'gatefloorb2/1';
export const STUDY = 'GATE-FLOOR-B2';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

export const { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
  ENTRY_COUNT, NR_QUALITY, classifyShortfall, TC_FLOOR, FLOOR_BASE_VALUE, GOALS, ARMS, ARM_ORDER, PRIMARY_ARMS, CLAIMS, CONTRASTS, MARGIN } = G;

// ---- the substrate, pinned by content ----
export const B2_COMMIT = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e';
export const TREE = Object.freeze({
  pristineMainSha256: '537f37a20144de07e39e2273ee2e78777e4c0f8ec3259b1e033f8a897d522e2b',   // B2 blob 113fa471 (h1r MANIFEST: sha256Before)
  derivedMainSha256: 'ff8c0555fdf748e1e46e5191ed7af1d7c14f80684f6e99531b9caf5b6e649083',    // + the two guarded lines
});

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1 (0..79), XFER-2 (80..231) and GATE-FLOOR-1 (232..391): the same ascending
// stream from CONFIG_START (the seed governance of every earlier study: no configuration and no agent seed is reused).
export const WORLD_START = 392;
export const WORLDS_N = 160;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;
export const BLOCKS = Object.freeze({ G: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const blockOf = (w) => (w >= BLOCKS.G.lo && w <= BLOCKS.G.hi ? 'G' : null);

// ---- outcome ----
// E1 = legal goal reaches (primary).  Sensitivity: every goal reset B2 performs.  Other endpoints as in GATE-FLOOR-1.
export const OUTCOME = Object.freeze({ primary: 'legalReaches', sensitivity: 'goalReaches' });

// ---- predictions (my expectations, declared before any confirmatory outcome; from the floor-OFF calibration and GATE-FLOOR-1) ----
export const PREDICTIONS = Object.freeze([
  Object.freeze({ id: 'B1', claim: 'C1', predicted: true, text: 'C1 holds on legal reaches (calibration: the goal-entry store gave +194 legal reaches over cold)' }),
  Object.freeze({ id: 'B2', claim: 'C2', predicted: true, text: 'C2 holds (calibration: the real store gave +69 legal reaches, far below the goal-entry store)' }),
  Object.freeze({ id: 'B3', claim: 'C3', predicted: true, text: 'C3 holds (as in GATE-FLOOR-1 the floor is not expected to fall short of the goal-entry store)' }),
  Object.freeze({ id: 'B4', claim: 'C4', predicted: true, text: 'no goal group is harmed' }),
  Object.freeze({ id: 'B5', claim: 'C5', predicted: true, text: 'the audit passes: the floor never raises a non-graph candidate' }),
]);

export const RULES = Object.freeze({
  ...G.RULES,
  worldExclusion: 'a control fails its construct check, or any session of the world fails after one retry, or a delivered store does not hash to the control',
  realStoreConstruct: 'the REAL store is the pristine runtime\'s own export and may contain non-graph transitions; it is checked for delivery exactness only (never for edge legality)',
  primaryOutcome: 'legal goal reaches; every goal reset is the declared sensitivity; neither is chosen after outcomes',
});

// ---- descriptive diagnostics (no threshold; they change no claim) ----
export const DIAGNOSTICS = Object.freeze({
  finalHop: Object.freeze({
    status: 'DESCRIPTIVE_NOT_CONFIRMATORY',
    definition: 'final-hop attempt = a legal graph-edge move into the active goal; B2 takes no environment draw for it, so every such attempt succeeds and failures are 0 by construction; a draw log reports any draw into the goal (expected none)',
    comparisons: G.DIAGNOSTICS.finalHop.comparisons,
    thresholds: null,
  }),
  nonEdgeReaches: Object.freeze({
    status: 'DESCRIPTIVE_NOT_CONFIRMATORY',
    definition: 'goal resets whose move was not a graph edge (B2 has no N1 guard), per arm and goal group, with the paired difference to COLD',
    thresholds: null,
  }),
  goalEdgeState: Object.freeze({
    status: 'DESCRIPTIVE_NOT_CONFIRMATORY',
    definition: 'end-of-session penalty, reward and transition memory on each u->goal edge (the 1-hop "shortcut blocked" block of B2 writes the penalty), per arm: the mean over worlds of the summed goal-edge penalty; it shows whether penalties are larger, not whether they dampen',
    thresholds: null,
  }),
  entryEdgeMix: Object.freeze({
    status: 'DESCRIPTIVE_NOT_CONFIRMATORY',
    definition: 'which neighbour of the goal each legal goal entry came from: distinct goal edges used per session and the share through the world\'s least reliable goal edge',
    thresholds: null,
  }),
});

// ---- digests ----
export const decisionDigest = () => hashObject({ schema: SCHEMA, arms: ARMS, contrasts: CONTRASTS, claims: CLAIMS, predictions: PREDICTIONS, rules: RULES, margin: MARGIN,
  tcFloor: TC_FLOOR, floorBase: FLOOR_BASE_VALUE, tree: TREE, b2: B2_COMMIT, entryCount: ENTRY_COUNT, nrQuality: NR_QUALITY, blocks: BLOCKS, ticks: TICKS, bootstrap: BOOTSTRAP,
  outcome: OUTCOME, worlds: { start: WORLD_START, n: WORLDS_N, goals: GOALS }, configStart: CONFIG_START });
export const designDigest = () => hashObject({ decision: decisionDigest(), diagnostics: DIAGNOSTICS });

/**
 * The strongest sentence the declared rules allow (legal-reach claims), then the replication label.
 *   states: { i1, i2, c1, benefitFloorLower, realClass, entryClass, harm, audit, sensitivityAgrees }
 */
export function interpret(s) {
  const base = G.interpret({ i1: s.i1, i2: s.i2, c1: s.c1, benefitFloorLower: s.benefitFloorLower, realClass: s.realClass, entryClass: s.entryClass, harm: s.harm, audit: s.audit });
  return base.replace(/goal reaches over cold/g, 'legal goal reaches over cold')
    + (s.sensitivityAgrees === false ? ' The classes on every goal reset (the runtime\'s own accounting) differ from those on legal reaches: the replication is stated for legal reaches only.' : '');
}

/** replication label: REPLICATED only if every claim holds with both instruments interpretable */
export function replication({ c1, c2, c3, c4, c5, i1, i2 }) {
  if (!c5) return 'AUDIT_FAILED';
  if (!c4) return 'HARM';
  if (!c1) return 'NOT_REPLICATED';
  if (c2 && c3 && i1 === 'OK' && i2 === 'OK') return 'REPLICATED';
  return 'PARTIAL';
}

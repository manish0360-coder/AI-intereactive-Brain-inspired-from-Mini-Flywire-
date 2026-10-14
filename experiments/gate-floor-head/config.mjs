// ==========================================================
// GATE-FLOOR-HEAD — the goal-entry floor on the exact audited HEAD runtime: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Substrate: the runtime file set of commit HEAD_COMMIT (the audited current HEAD,
// FutureScore V2.3 live), materialised from git blobs; production is not modified.  Question (unchanged): does a
// guarded, default-off floor on the goal-entering score term, with no stored episode, raise legal goal reaches - now with the
// goal-directed FutureScore channel live?  Everything shared with GATE-FLOOR-1 / GATE-FLOOR-B2 (arms, floor value, outcome,
// bootstrap, exclusions, seed governance) is IMPORTED.  The ONLY changes, each approved by the independent review
// (LIMITED CORRECTION) and forced by the floor-OFF calibration on HEAD (DESIGN_REVIEW.md):
//   (a) REAL is a DESCRIPTIVE contrast, not an instrument gate (calibration: REAL - COLD = +2.1 [-22.7, 27.4]);
//   (b) DELTA = 15 and MIN_BENEFIT = 30 (a quarter, and twice a quarter, of the calibrated goal-entry benefit +60.5;
//       MIN_BENEFIT is below that calibration's lower bound 34.2);
//   (c) n = 280 worlds, 70 per goal group: (2.8 * 87.3 / 15)^2 = 266 from the largest LEGAL paired SD of the calibration;
//   (d) replication criterion C1 and C3 and C4 and C5 with I2 valid; claim scope = the exact audited HEAD and this
//       intervention only.
// ==========================================================
import * as B from '../gate-floor-b2/config.mjs';

export const SCHEMA = 'gatefloorhead/1';
export const STUDY = 'GATE-FLOOR-HEAD';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

export const { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
  ENTRY_COUNT, NR_QUALITY, TC_FLOOR, FLOOR_BASE_VALUE, GOALS, ARMS, ARM_ORDER, PRIMARY_ARMS, OUTCOME } = B;

// ---- the substrate, pinned by content ----
export const HEAD_COMMIT = '0df804c497e649affb9e7ebacb10fdc81ab6de8d';
export const TREE = Object.freeze({
  headMainBlob: '09c36b5caf24ed1bf447a13fe924d8297a11a301',
  headMainSha256: 'c92c5c6b6d2e32aed9114e2a8dc4075134630bfe6e5547b8052b9e8b839a3de3',     // the audited HEAD main.js (5,699 lines)
  planningBlob: '7ebfec77e3c068a54ae11ced2c1179aa14d0375d',
  traversalRecordBlob: '92555d433ff34bef18fe16750267879e16f1394e',
  derivedMainSha256: '8cf1dc296189286113ac9daa16a28f98bbab131b18b919ec6aeb1fed4d4abc1e',                                                // HEAD main.js + the two guarded lines
});

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1 (0..79), XFER-2 (80..231), GATE-FLOOR-1 (232..391) and GATE-FLOOR-B2
// (392..551): the same ascending stream from CONFIG_START (no configuration and no agent seed is reused).
export const WORLD_START = 552;
export const WORLDS_N = 280;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;
export const BLOCKS = Object.freeze({ H: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const blockOf = (w) => (w >= BLOCKS.H.lo && w <= BLOCKS.H.hi ? 'H' : null);
export const PER_GOAL = WORLDS_N / GOALS.length;                                           // 70

// ---- the floor-OFF calibration on HEAD that fixed the margins and n (design input; no floor session was run) ----
// XFER-1 worlds 0..39, scratch copy of HEAD blobs with an observational probe only.  Uncertainty: 40 worlds; the
// goal-entry benefit interval is +-26 and the SD is a point estimate.  The margins below sit BELOW the lower bound.
export const CALIBRATION = Object.freeze({
  worlds: 40,
  legalBenefit: Object.freeze({ REAL: Object.freeze({ mean: 2.1, lower: -22.7, upper: 27.4 }), ENTRY_NR: Object.freeze({ mean: 60.5, lower: 34.2, upper: 87.2 }) }),
  maxLegalPairedSd: 87.3,
  coldLegal: 303.8,
});

// ---- estimand, margins, classification (E1 = legal goal reaches per 1,500-call test session) ----
//   DELTA = 15  NON_INFERIOR iff the upper bound of the shortfall (reference - arm) < 15; EXCEEDS iff <= -15; FALLS_SHORT iff
//               the lower bound >= 15; otherwise INCONCLUSIVE.  An interval, never a p-value, is classified.
//   MIN_BENEFIT = 30  the lower bound of an arm's benefit over COLD must reach this to be called an improvement (C1) and for the
//               goal-entry-store instrument I2 to be valid (= 2 * DELTA, below the calibration's lower bound 34.2).
//   MAX_ATTEMPT_DROP = 0.05  unchanged.
export const MARGIN = Object.freeze({ delta: 15, minBenefit: 30, maxAttemptDrop: 0.05 });
export const classifyShortfall = (ci) => {
  if (!ci || ci.lower === null || ci.upper === null) return 'UNDEFINED';
  if (ci.upper < MARGIN.delta) return ci.upper <= -MARGIN.delta ? 'EXCEEDS' : 'NON_INFERIOR';
  if (ci.lower >= MARGIN.delta) return 'FALLS_SHORT';
  return 'INCONCLUSIVE';
};

// ---- contrasts reported: [name, treatment, reference] ----
export const CONTRASTS = Object.freeze([
  Object.freeze(['capability: floor with no episodes vs cold', 'COLD_FLOOR', 'COLD']),
  Object.freeze(['mechanism ceiling: goal-entry episodes vs cold', 'ENTRY_NR', 'COLD']),
  Object.freeze(['floor vs goal-entry episodes', 'COLD_FLOOR', 'ENTRY_NR']),
  Object.freeze(['DESCRIPTIVE: real episodes vs cold', 'REAL', 'COLD']),
  Object.freeze(['DESCRIPTIVE: floor vs real episodes', 'COLD_FLOOR', 'REAL']),
  Object.freeze(['compatibility: floor on top of real vs real', 'REAL_FLOOR', 'REAL']),
  Object.freeze(['compatibility: floor on top of real vs cold', 'REAL_FLOOR', 'COLD']),
]);

// ---- declared claims ----
//   C1 capability      benefit(COLD_FLOOR) lower bound >= MIN_BENEFIT                                   [gates the label]
//   C3 approaches      shortfall(ENTRY_NR - COLD_FLOOR) NON_INFERIOR or EXCEEDS, needs I2                [gates the label]
//   C4 no harm         no goal group's unadjusted 95% interval of (COLD_FLOOR - COLD) wholly below 0, and the lower bound of the
//                      attempt-success difference >= -MAX_ATTEMPT_DROP                                   [gates the label]
//   C5 audit           the audit passes in every floor session                                           [gates the label]
//   C2 DESCRIPTIVE     shortfall(REAL - COLD_FLOOR) class and benefit(REAL), always reported, never gating (it is no
//                      instrument: REAL does not beat COLD on HEAD in the calibration)
// Instrument I2: the lower bound of benefit(ENTRY_NR) >= MIN_BENEFIT.  I1 (REAL) is reported, descriptive.
export const CLAIMS = Object.freeze([
  Object.freeze({ id: 'C1', gates: true, text: 'The floor with no stored episodes improves legal goal reaches over cold by at least MIN_BENEFIT', via: 'benefitLower(COLD_FLOOR) >= minBenefit' }),
  Object.freeze({ id: 'C2', gates: false, text: 'DESCRIPTIVE: the REAL contrast (real episodes vs cold; floor vs real) - not an instrument gate', via: 'benefit(REAL); shortfall(REAL - COLD_FLOOR)' }),
  Object.freeze({ id: 'C3', gates: true, text: 'The floor approaches the goal-entry mechanism ceiling: COLD_FLOOR is NON_INFERIOR or EXCEEDS ENTRY_NR (needs I2)', via: 'shortfall(ENTRY_NR - COLD_FLOOR)' }),
  Object.freeze({ id: 'C4', gates: true, text: 'No goal group is harmed and per-attempt success does not fall by more than MAX_ATTEMPT_DROP', via: 'group benefit intervals; attemptSuccess diff' }),
  Object.freeze({ id: 'C5', gates: true, text: 'The no-shortcut audit passes in every session that ran the floor', via: 'per-session audit' }),
]);
export const GATING_CLAIMS = Object.freeze(CLAIMS.filter(c => c.gates).map(c => c.id));   // ['C1', 'C3', 'C4', 'C5']

// predictions declared before any confirmatory outcome (my expectations; not revised after)
export const PREDICTIONS = Object.freeze([
  Object.freeze({ id: 'H1', claim: 'C1', predicted: true, text: 'C1 holds (calibration: the goal-entry store gave +60.5 [34.2, 87.2] legal reaches; the floor equalled it on B2 and on the conformed runtime)' }),
  Object.freeze({ id: 'H2', claim: 'C3', predicted: true, text: 'C3 holds (the floor was indistinguishable from the goal-entry store on both earlier runtimes)' }),
  Object.freeze({ id: 'H3', claim: 'C4', predicted: true, text: 'no goal group is harmed' }),
  Object.freeze({ id: 'H4', claim: 'C5', predicted: true, text: 'the audit passes: the floor never raises a non-graph candidate' }),
]);

export const RULES = Object.freeze({
  worldExclusion: 'a control fails its construct check, or any session of the world fails after one retry, or a delivered store does not hash to its control',
  maxExcludedFraction: 0.10,
  noOptionalStopping: true,
  noOutcomeBasedExclusion: true,
  noRevisionAfterOutcomes: true,
  realStoreConstruct: 'the REAL store is the runtime\'s own export and may contain non-graph transitions; checked for delivery exactness only',
  primaryOutcome: 'legal goal reaches; every goal reset and the non-graph resets are reported separately, never merged',
  lowBaselineBenefit: 'if the lower bound of benefit(ENTRY_NR) (I2) is below MIN_BENEFIT the goal-entry-ceiling claim C3 is NOT_INTERPRETABLE_LOW_BENEFIT (DID_NOT_REPRODUCE when <= 0); REAL (I1) is reported and gates nothing',
  replication: 'REPLICATED iff C1 and C3 and C4 and C5 hold with I2 valid',
});

// ---- descriptive diagnostics (no threshold; they change no claim) ----
export const DIAGNOSTICS = B.DIAGNOSTICS;

// ---- digests ----
export const decisionDigest = () => hashObject({ schema: SCHEMA, head: HEAD_COMMIT, arms: ARMS, contrasts: CONTRASTS, claims: CLAIMS, predictions: PREDICTIONS, rules: RULES, margin: MARGIN,
  tcFloor: TC_FLOOR, floorBase: FLOOR_BASE_VALUE, tree: TREE, entryCount: ENTRY_COUNT, nrQuality: NR_QUALITY, blocks: BLOCKS, ticks: TICKS, bootstrap: BOOTSTRAP,
  outcome: OUTCOME, worlds: { start: WORLD_START, n: WORLDS_N, perGoal: PER_GOAL, goals: GOALS }, calibration: CALIBRATION, configStart: CONFIG_START });
export const designDigest = () => hashObject({ decision: decisionDigest(), diagnostics: DIAGNOSTICS });

/** the strongest sentence the declared rules allow; REAL is described, never used to gate */
export function interpret(s) {
  if (!s.audit) return 'AUDIT FAILED: the floor produced a move or score outside its declared scope; no capability sentence is allowed.';
  if (s.harm) return 'HARM: a goal group or per-attempt success fell below the declared safety rule; the floor is not recommended regardless of its average benefit.';
  const out = [];
  if (!s.c1) {
    if (s.benefitFloorLower > 0) out.push('The floor improves legal goal reaches over cold but not by the declared practical margin (lower bound below MIN_BENEFIT).');
    else out.push('The floor with no stored episodes does not improve legal goal reaches over cold on this HEAD configuration: with FutureScore V2.3 live the goal-entry scoring term is not a bottleneck that the floor removes.');
    if (s.i2 === 'OK') out.push('Because the goal-entry-store instrument reproduced (ENTRY_NR benefits), this is evidence about the term, not an instrument failure.');
  } else {
    out.push('The guarded goal-entry floor with no stored episode improves legal goal reaches over cold by at least the declared margin.');
    if (s.i2 === 'OK') {
      if (s.entryClass === 'NON_INFERIOR' || s.entryClass === 'EXCEEDS') out.push(`It ${s.entryClass === 'EXCEEDS' ? 'exceeds' : 'is non-inferior to'} the goal-entry-episodes ceiling within the margin.`);
      else if (s.entryClass === 'FALLS_SHORT') out.push('It falls short of the goal-entry-episodes ceiling by at least the margin: the goal-entry gradient is not all the stored episodes supply.');
      else out.push('Its comparison with the goal-entry-episodes ceiling is inconclusive at the declared margin.');
    } else out.push(`The goal-entry-ceiling comparison is not interpreted (${s.i2}).`);
  }
  out.push(`Descriptive, not gating: real stored episodes versus cold ${s.realBenefitText}; the floor versus real episodes is ${s.realClass}.`);
  if (s.sensitivityAgrees === false) out.push('The classes on every goal reset (the runtime\'s own accounting) differ from those on legal reaches: the replication is stated for legal reaches only.');
  return out.join(' ');
}

/** replication label: C1, C3, C4, C5 with I2 valid; REAL gates nothing */
export function replication({ c1, c3, c4, c5, i2 }) {
  if (!c5) return 'AUDIT_FAILED';
  if (!c4) return 'HARM';
  if (!c1) return 'NOT_REPLICATED';
  return c3 && i2 === 'OK' ? 'REPLICATED' : 'PARTIAL';
}

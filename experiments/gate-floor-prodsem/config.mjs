// ==========================================================
// GATE-FLOOR-PRODSEM — the goal-entry floor under production-like transition semantics: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Substrate: the SAME pinned derived HEAD tree as GATE-FLOOR-HEAD (runtime file set of
// commit HEAD_COMMIT + two guarded call-only lines); production is not modified.  Question (unchanged): does a guarded,
// default-off floor on the goal-entering score term, with no stored episode, raise legal goal reaches over cold - now with
// the M7 harness's reliability environment, its E2 credit bypass and its prediction-error pin all removed (hook state P)?
//
// What changed from GATE-FLOOR-HEAD, each recorded in DESIGN_REVIEW.md and forced by the Phase 1 investigation
// (PRODSEM_SEMANTICS.md) and the floor-OFF calibration under state P (results/calibration_summary.json):
//   (a) the confirmatory CONDITION is hook state P: arm OFF, envMode off, creditMode off, pin off - every M7 SEMANTIC hook
//       undefined.  The literal "envMode OFF" (state E) is a hybrid (E2 credit and the PE pin remain) and is not run;
//   (b) DELTA = 20 and MIN_BENEFIT = 40 (a quarter, and twice a quarter, of the calibrated goal-entry benefit +82.0, below its
//       lower bound 58.9) - the programme's rule, re-applied; the block-H margins (15, 30) are a declared sensitivity;
//   (c) n = 280 worlds, 70 per goal, UNCHANGED: (2.8 * 98.4 / 20)^2 = 190 from the largest legal paired SD of the calibration;
//   (d) the per-attempt-success clause of C4 is retired (undefined under P: no environment draw exists); C5 gains a
//       condition-integrity audit;
//   (e) the label set is renamed (a semantics-transfer test, not a replication);
//   (f) worlds 832..1111.
// ==========================================================
import * as H from '../gate-floor-head/config.mjs';

export const SCHEMA = 'gatefloorprodsem/1';
export const STUDY = 'GATE-FLOOR-PRODSEM';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

export const { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
  ENTRY_COUNT, NR_QUALITY, TC_FLOOR, FLOOR_BASE_VALUE, GOALS, ARMS, ARM_ORDER, PRIMARY_ARMS, OUTCOME, HEAD_COMMIT, TREE, DIAGNOSTICS } = H;

// ---- the hook states the harness can present to the runtime (FACT: experiments/m7/run.js lines 128-162, main.js 4157/4215/4473/4675/5014) ----
//   H      block H as executed (arm A1, envMode on, creditMode on, pin on)
//   E      the reliability environment removed ONLY (E2 credit and the PE pin remain): a hybrid no product path reaches
//   P      every M7 semantic hook undefined: the product's own hook state (episode cap, replay-once and goal transport remain)
//   Ppass  P plus an installed p = 1 environment: control that "undefined" equals "always succeeds"
export const HOOK_STATES = Object.freeze({
  H: Object.freeze({ arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on', passEnv: false }),
  E: Object.freeze({ arm: 'A1', envMode: 'off', creditMode: 'on', pin: 'on', passEnv: false }),
  P: Object.freeze({ arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off', passEnv: false }),
  Ppass: Object.freeze({ arm: 'OFF', envMode: 'off', creditMode: 'off', pin: 'off', passEnv: true }),
});
export const CONFIRMATORY_STATE = 'P';

// ---- the mandatory classification and claim limits (Director ruling; the final report must carry them verbatim) ----
export const CLASSIFICATION = 'Production-like transition semantics under M7 bounds.';
export const DEVIATIONS = Object.freeze([
  'The 150-tick episode cap (frozen M7 episode rule; production has none).',
  'The deterministic replay cooldown (presence-based; production uses a 4 s wall-clock cooldown).',
  'Legacy stale-keyed credit assignment through agentLast->next (the product\'s own credit site; temporally misaligned by design and not isolated here).',
]);
export const CLAIM_LIMITS = Object.freeze([
  'Condition P installs no environment draw, so traversal-attempt success is identically 1.0; it cannot establish real-world routing capability and is reported as DEGENERATE, never as evidence of success.',
  'FutureScore V2.3 behaves as a pure graph-distance potential under P (learned cost = 1 on every edge).',
  'No claim of production equivalence, production readiness, user-visible quality, safety or general routing capability; nothing outside the frozen goals {8,12,16,19}, the graph, the Phase I 1,500-call budget and the harness semantics.',
]);

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1 (0..79), XFER-2 (80..231), GATE-FLOOR-1 (232..391), GATE-FLOOR-B2 (392..551) and
// GATE-FLOOR-HEAD (552..831): the same ascending stream from CONFIG_START (no configuration and no agent seed is reused).
// Under state P the reliability map is inert, so a world is (goal, agent-seed pair); the structure is kept for pairing,
// per-goal groups and the consumed / held-out checks.
export const WORLD_START = 832;
export const WORLDS_N = 280;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;
export const BLOCKS = Object.freeze({ P: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const blockOf = (w) => (w >= BLOCKS.P.lo && w <= BLOCKS.P.hi ? 'P' : null);
export const PER_GOAL = WORLDS_N / GOALS.length;                                           // 70

// ---- the floor-OFF calibration under state P that fixed the margins (design input; no floor session was run) ----
// XFER-1 worlds 0..39, scratch copy of HEAD blobs with an observational probe only.  Uncertainty: 40 worlds; the goal-entry
// benefit interval is about +-23.5 and the SDs are point estimates.  The margins below sit BELOW the lower bound.
export const CALIBRATION = Object.freeze({
  state: 'P',
  worlds: 40,
  legalBenefit: Object.freeze({ REAL: Object.freeze({ mean: 2.3, lower: -27.8, upper: 31.6 }), ENTRY_NR: Object.freeze({ mean: 82.0, lower: 58.9, upper: 105.8 }) }),
  maxLegalPairedSd: 98.4,
  gatingLegalPairedSd: 77.6,
  coldLegal: 369.15,
});

// ---- estimand, margins, classification (E1 = legal goal reaches per 1,500-call test session) ----
//   DELTA = 20  NON_INFERIOR iff the upper bound of the shortfall (reference - arm) < 20; EXCEEDS iff <= -20; FALLS_SHORT iff
//               the lower bound >= 20; otherwise INCONCLUSIVE.  An interval, never a p-value, is classified.
//   MIN_BENEFIT = 40  the lower bound of an arm's benefit over COLD must reach this to be called an improvement (C1) and for the
//               goal-entry-store instrument I2 to be valid (= 2 * DELTA, below the calibration's lower bound 58.9).
//   The per-attempt-success margin of earlier studies is RETIRED: there is no environment draw under state P.
export const MARGIN = Object.freeze({ delta: 20, minBenefit: 40 });
/** declared, never decisive: every class recomputed at the block-H margins */
export const SENSITIVITY_MARGIN = Object.freeze({ delta: 15, minBenefit: 30 });
export const classifyShortfall = (ci, delta = MARGIN.delta) => {
  if (!ci || ci.lower === null || ci.upper === null) return 'UNDEFINED';
  if (ci.upper < delta) return ci.upper <= -delta ? 'EXCEEDS' : 'NON_INFERIOR';
  if (ci.lower >= delta) return 'FALLS_SHORT';
  return 'INCONCLUSIVE';
};

// ---- contrasts reported: [name, treatment, reference] ----
export const CONTRASTS = Object.freeze([
  Object.freeze(['capability: floor with no episodes vs cold', 'COLD_FLOOR', 'COLD']),
  Object.freeze(['mechanism ceiling: goal-entry episodes vs cold', 'ENTRY_NR', 'COLD']),
  Object.freeze(['floor vs goal-entry episodes', 'COLD_FLOOR', 'ENTRY_NR']),
  Object.freeze(['DESCRIPTIVE: real episodes vs cold', 'REAL', 'COLD']),
  Object.freeze(['DESCRIPTIVE: floor vs real episodes', 'COLD_FLOOR', 'REAL']),
  Object.freeze(['DESCRIPTIVE compatibility: floor on top of real vs real', 'REAL_FLOOR', 'REAL']),
  Object.freeze(['DESCRIPTIVE compatibility: floor on top of real vs cold', 'REAL_FLOOR', 'COLD']),
]);

// ---- declared claims ----
//   C1 capability      benefit(COLD_FLOOR) lower bound >= MIN_BENEFIT                                   [gates the label]
//   C3 approaches      shortfall(ENTRY_NR - COLD_FLOOR) NON_INFERIOR or EXCEEDS, needs I2                [gates the label]
//   C4 no harm         no goal group's unadjusted 95% interval of (COLD_FLOOR - COLD) wholly below 0     [gates the label]
//                      (the per-attempt-success clause is retired: undefined under state P)
//   C5 audit           the floor audit passes in every floor session AND the condition integrity holds in every session
//                      (a violation invalidates the block: the sessions did not run under state P)       [gates the label]
//   C2 DESCRIPTIVE     shortfall(REAL - COLD_FLOOR) class and benefit(REAL), always reported, never gating
// Instrument I2: the lower bound of benefit(ENTRY_NR) >= MIN_BENEFIT.  I1 (REAL) is reported, descriptive.
export const CLAIMS = Object.freeze([
  Object.freeze({ id: 'C1', gates: true, text: 'The floor with no stored episodes improves legal goal reaches over cold by at least MIN_BENEFIT under production-like transition semantics', via: 'benefitLower(COLD_FLOOR) >= minBenefit' }),
  Object.freeze({ id: 'C2', gates: false, text: 'DESCRIPTIVE: the REAL contrast (real episodes vs cold; floor vs real) - not an instrument gate', via: 'benefit(REAL); shortfall(REAL - COLD_FLOOR)' }),
  Object.freeze({ id: 'C3', gates: true, text: 'The floor approaches the goal-entry mechanism ceiling: COLD_FLOOR is NON_INFERIOR or EXCEEDS ENTRY_NR (needs I2)', via: 'shortfall(ENTRY_NR - COLD_FLOOR)' }),
  Object.freeze({ id: 'C4', gates: true, text: 'No goal group is harmed (per-attempt success is undefined under state P and is not a clause)', via: 'group benefit intervals' }),
  Object.freeze({ id: 'C5', gates: true, text: 'The no-shortcut audit passes in every session that ran the floor and the condition integrity holds in every session', via: 'per-session audit + condition integrity' }),
]);
export const GATING_CLAIMS = Object.freeze(CLAIMS.filter(c => c.gates).map(c => c.id));   // ['C1', 'C3', 'C4', 'C5']

// predictions declared before any confirmatory outcome (my expectations; not revised after)
export const PREDICTIONS = Object.freeze([
  Object.freeze({ id: 'H1', claim: 'C1', predicted: true, text: 'C1 holds (calibration under state P: the goal-entry store gave +82.0 [58.9, 105.8] legal reaches; the floor equalled the goal-entry store on every earlier runtime)' }),
  Object.freeze({ id: 'H2', claim: 'C3', predicted: true, text: 'C3 holds (the floor was indistinguishable from the goal-entry store on all three earlier runtimes)' }),
  Object.freeze({ id: 'H3', claim: 'C4', predicted: true, text: 'no goal group is harmed' }),
  Object.freeze({ id: 'H4', claim: 'C5', predicted: true, text: 'the audit and the condition integrity pass: the floor never raises a non-graph candidate and no session installs an environment' }),
]);

export const RULES = Object.freeze({
  worldExclusion: 'a control fails its construct check, or any session of the world fails after one retry (a condition-integrity violation is a failure), or a delivered store does not hash to its control',
  maxExcludedFraction: 0.10,
  noOptionalStopping: true,
  noOutcomeBasedExclusion: true,
  noRevisionAfterOutcomes: true,
  realStoreConstruct: 'the REAL store is the runtime\'s own export and may contain non-graph transitions; checked for delivery exactness only',
  primaryOutcome: 'legal goal reaches; every goal reset and the non-graph resets are reported separately, never merged',
  degenerate: 'per-attempt success, slips per call, final-hop retry, environment counters and E2 credit-key counts are degenerate by construction under state P and are reported as DEGENERATE, never as results',
  lowBaselineBenefit: 'if the lower bound of benefit(ENTRY_NR) (I2) is below MIN_BENEFIT the goal-entry-ceiling claim C3 is NOT_INTERPRETABLE_LOW_BENEFIT (DID_NOT_REPRODUCE when <= 0); REAL (I1) is reported and gates nothing',
  label: 'TRANSFERS iff C1 and C3 and C4 and C5 hold with I2 valid; PARTIAL iff C1 holds but C3 or I2 does not; NO_MEANINGFUL_BENEFIT iff C1 fails; HARM iff C4 fails; AUDIT_FAILED iff C5 fails',
  recommendation: 'C1 fails -> recommend AGAINST a production change on the present evidence; C1 holds -> recommend a SEPARATE production-design review, never an automatic implementation',
});

// ---- descriptive diagnostics (no threshold; they change no claim) ----
export const DEGENERATE_UNDER_P = Object.freeze(['attemptSuccess', 'slipsPerCall', 'finalHopRetry', 'environmentCounters', 'creditKeys']);

// ---- digests ----
export const decisionDigest = () => hashObject({ schema: SCHEMA, head: HEAD_COMMIT, arms: ARMS, contrasts: CONTRASTS, claims: CLAIMS, predictions: PREDICTIONS, rules: RULES, margin: MARGIN,
  sensitivityMargin: SENSITIVITY_MARGIN, tcFloor: TC_FLOOR, floorBase: FLOOR_BASE_VALUE, tree: TREE, entryCount: ENTRY_COUNT, nrQuality: NR_QUALITY, blocks: BLOCKS, ticks: TICKS,
  bootstrap: BOOTSTRAP, outcome: OUTCOME, worlds: { start: WORLD_START, n: WORLDS_N, perGoal: PER_GOAL, goals: GOALS }, calibration: CALIBRATION, configStart: CONFIG_START,
  hookStates: HOOK_STATES, confirmatoryState: CONFIRMATORY_STATE, classification: CLASSIFICATION, deviations: DEVIATIONS, claimLimits: CLAIM_LIMITS });
export const designDigest = () => hashObject({ decision: decisionDigest(), diagnostics: DIAGNOSTICS, degenerate: DEGENERATE_UNDER_P });

/** the strongest sentence the declared rules allow; REAL is described, never used to gate */
export function interpret(s) {
  const tail = ` ${CLASSIFICATION}`;
  if (!s.audit) return 'AUDIT FAILED: the floor produced a move or score outside its declared scope; no capability sentence is allowed.' + tail;
  if (s.harm) return 'HARM: a goal group fell below the declared safety rule; the floor is not recommended regardless of its average benefit.' + tail;
  const out = [];
  if (!s.c1) {
    if (s.benefitFloorLower > 0) out.push('The floor improves legal goal reaches over cold but not by the declared practical margin (lower bound below MIN_BENEFIT).');
    else out.push('The floor with no stored episodes does not improve legal goal reaches over cold under production-like transition semantics.');
    if (s.i2 === 'OK') out.push('Because the goal-entry-store instrument reproduced (ENTRY_NR benefits), this is evidence about the term, not an instrument failure.');
    out.push('On this evidence a production change is not recommended.');
  } else {
    out.push('The guarded goal-entry floor with no stored episode improves legal goal reaches over cold by at least the declared margin under production-like transition semantics.');
    if (s.i2 === 'OK') {
      if (s.entryClass === 'NON_INFERIOR' || s.entryClass === 'EXCEEDS') out.push(`It ${s.entryClass === 'EXCEEDS' ? 'exceeds' : 'is non-inferior to'} the goal-entry-episodes ceiling within the margin.`);
      else if (s.entryClass === 'FALLS_SHORT') out.push('It falls short of the goal-entry-episodes ceiling by at least the margin: the goal-entry gradient is not all the stored episodes supply.');
      else out.push('Its comparison with the goal-entry-episodes ceiling is inconclusive at the declared margin.');
    } else out.push(`The goal-entry-ceiling comparison is not interpreted (${s.i2}).`);
    out.push('A separate production-design review is the supported next step; this result is not an implementation recommendation.');
  }
  out.push(`Descriptive, not gating: real stored episodes versus cold ${s.realBenefitText}; the floor versus real episodes is ${s.realClass}.`);
  if (s.sensitivityAgrees === false) out.push('The classes on every goal reset (the runtime\'s own accounting) differ from those on legal reaches: the result is stated for legal reaches only.');
  if (s.marginSensitivityAgrees === false) out.push('The classes at the block-H margins (15, 30) differ from those at the declared margins (20, 40).');
  return out.join(' ') + tail;
}

/** label: C1, C3, C4, C5 with I2 valid; REAL gates nothing */
export function transferLabel({ c1, c3, c4, c5, i2 }) {
  if (!c5) return 'AUDIT_FAILED';
  if (!c4) return 'HARM';
  if (!c1) return 'NO_MEANINGFUL_BENEFIT';
  return c3 && i2 === 'OK' ? 'TRANSFERS' : 'PARTIAL';
}

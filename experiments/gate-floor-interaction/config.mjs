// ==========================================================
// GATE-FLOOR-INTERACTION — store x floor x legal-edge guard paired factorial: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Substrate: the PRODSEM derived HEAD tree (commit HEAD_COMMIT + the floor line + the goal-reset
// probe) plus TWO more guarded, default-off, call-only lines (the legal-edge guard BUNDLE: an admission mask and an execution
// guard, always switched together).  Production is not modified.  Hook state P for every session (as GATE-FLOOR-PRODSEM).
// The design text is DESIGN.md (reviewed: PASS WITH CLAIM LIMITS, one required correction = the S5 static assertion, added in the
// verifier); this file is the machine-readable form of it.  Nothing here is chosen from a confirmatory outcome.
// ==========================================================
import * as P from '../gate-floor-prodsem/config.mjs';

export const SCHEMA = 'gatefloorinteraction/1';
export const STUDY = 'GATE-FLOOR-INTERACTION';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

export const { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
  TC_FLOOR, FLOOR_BASE_VALUE, GOALS, OUTCOME, HEAD_COMMIT, TREE, HOOK_STATES, CONFIRMATORY_STATE, CLASSIFICATION, DEVIATIONS, CLAIM_LIMITS } = P;

// ---- the guard tree, pinned by content ----
// PRODSEM derived main.js (TREE.derivedMainSha256) + ADMIT_LINE + EXEC_LINE (transform.mjs).
export const GUARD_TREE = Object.freeze({
  guardMainSha256: 'a0eb7b377dcdf4b9304f0c04c2dd7c3b84328d605b5bd22bc00b534b671dec67',
  baseDerivedMainSha256: TREE.derivedMainSha256,
  admitLineSha256: 'cccaefd240e8dab8f3e7530604c468f7cd7fd2598d8f44027f69cefcf1fe3180',     // sha256 of transform.mjs ADMIT_LINE (verified by the gate)
  execLineSha256: '3f63ce0cfa0f7c08dacb7f759ddeb315e171bf35aa070c35765ef871092fd0ad',      // sha256 of transform.mjs EXEC_LINE
});

// ---- factors and cells ----
export const FACTORS = Object.freeze({
  S: Object.freeze({ id: 'S', levels: Object.freeze(['COLD', 'REAL']), text: 'COLD: no stored episodes; REAL: the world\'s own cold training export (trained UNGUARDED under state P), delivered once through loadBrain(), identical across the four REAL cells' }),
  F: Object.freeze({ id: 'F', levels: Object.freeze([0, 1]), text: 'the frozen GATE-FLOOR-PRODSEM goal-entry floor (value 1, legal goal-neighbour edges only)' }),
  G: Object.freeze({ id: 'G', levels: Object.freeze([0, 1]), text: 'the legal-edge guard BUNDLE: admission mask (non-neighbour candidates dropped at the admission test) + execution guard (a non-edge, non-self executed move is blocked), always together' }),
});
export const CELLS = Object.freeze(['COLD', 'REAL'].flatMap(s => [0, 1].flatMap(f => [0, 1].map(g => Object.freeze({ name: `${s}_F${f}_G${g}`, store: s, floor: f, guard: g })))));
export const CELL_NAMES = Object.freeze(CELLS.map(c => c.name));
export const cellName = (s, f, g) => `${s}_F${f}_G${g}`;

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1 (0..79), XFER-2 (80..231), GATE-FLOOR-1 (232..391), GATE-FLOOR-B2 (392..551),
// GATE-FLOOR-HEAD (552..831) and GATE-FLOOR-PRODSEM (832..1111): the same ascending stream from CONFIG_START.
export const WORLD_START = 1112;
export const WORLDS_N = 280;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;
export const BLOCKS = Object.freeze({ I: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const blockOf = (w) => (w >= BLOCKS.I.lo && w <= BLOCKS.I.hi ? 'I' : null);
export const PER_GOAL = WORLDS_N / GOALS.length;                                           // 70
export const SESSIONS_PER_WORLD = 1 + CELLS.length;                                        // 1 training + 8 test = 9

// ---- development calibration that sized the study (design input; XFER-1 worlds 0..39; no study world) ----
export const CALIBRATION = Object.freeze({
  worlds: 40, state: 'P', cells: 8,
  contrasts: Object.freeze({
    PC1_storeXguard_F1: Object.freeze({ mean: 49.5, sd: 67.0 }),
    PC2_guard_REAL_F1: Object.freeze({ mean: 46.8, sd: 50.2 }),
    PC3_floor_REAL_G0: Object.freeze({ mean: 36.7, sd: 54.8 }),
    PC3_floor_REAL_G1: Object.freeze({ mean: 32.1, sd: 53.7 }),
    floor_COLD_G0: Object.freeze({ mean: 82.3, sd: 75.2 }),
    threeWay: Object.freeze({ mean: 24.4, sd: 89.4 }),
  }),
  blockedIllegalPerSession: 29.3,
});

// ---- margin, multiplicity, intervals ----
//   delta = 20 legal reaches (the GATE-FLOOR-PRODSEM DELTA; about 4.4 % of the cold-floor level).
//   The primary family {PC1, PC2, PC3} is DECIDED at the Bonferroni-3 level (98.33 %); instruments and secondary contrasts use the
//   unadjusted 95 % interval; the unadjusted classification of the primary family is a declared, non-decisive sensitivity.
export const MARGIN = Object.freeze({ delta: 20, coldFloorMinBenefit: 40 });            // 40 = PRODSEM MIN_BENEFIT (instrument I6)
export const FAMILY_SIZE = 3;
export const BOOT_FAMILY = Object.freeze({ ...BOOTSTRAP, level: 1 - 0.05 / FAMILY_SIZE });
export const BOOT_95 = BOOTSTRAP;
export const FLAGS = Object.freeze({ blockedShareOfCalls: 0.05, graphPoolChange: 0.05 });

// ---- decision rules (pure) ----
const has = (ci) => ci && Number.isFinite(ci.lower) && Number.isFinite(ci.upper);
/** PC1: store x guard interaction at floor ON. ig, d1 are family-level intervals; i5 = the deficit exists at G0 */
export function classifyPC1({ ig, d1, i5 }) {
  if (!has(ig) || !has(d1)) return 'UNDEFINED';
  if (!i5) return 'NOT_TESTABLE';
  if (ig.lower >= MARGIN.delta) return d1.lower > -MARGIN.delta ? 'RECOVERY_FULL' : 'RECOVERY_PARTIAL';
  if (ig.upper < MARGIN.delta) return 'NO_RECOVERY';
  return 'INCONCLUSIVE';
}
/** PC2: guard effect at REAL, floor ON.  nonGraphRemoved = mean reduction of non-graph resets (a positive number) */
export function classifyPC2({ tau, nonGraphRemoved }) {
  if (!has(tau)) return 'UNDEFINED';
  if (tau.lower >= MARGIN.delta) return 'IMPROVES';
  if (tau.upper <= -MARGIN.delta) return 'HARMS';
  if (tau.lower > -MARGIN.delta && tau.upper < MARGIN.delta) return nonGraphRemoved >= MARGIN.delta ? 'ACCOUNTING_ONLY' : 'NEGLIGIBLE';
  return 'INCONCLUSIVE';
}
/** PC3: floor benefit persists with the real store, at G0 and at G1 */
export function classifyPC3({ g0, g1 }) {
  if (!has(g0) || !has(g1)) return 'UNDEFINED';
  const a = g0.lower >= MARGIN.delta, b = g1.lower >= MARGIN.delta;
  return a && b ? 'PERSISTS' : a ? 'ONLY_WITHOUT_GUARD' : b ? 'ONLY_WITH_GUARD' : 'NOT_PERSISTENT';
}
/** the production-design-specification criterion of DESIGN.md section 5 */
export function specification({ pc2, pc3, harmFlags, instrumentsOk }) {
  if (!instrumentsOk) return { justified: false, reason: 'an instrument that the criterion depends on failed' };
  if (pc3 !== 'PERSISTS') return { justified: false, reason: `PC3 = ${pc3}` };
  if (pc2 === 'HARMS' || harmFlags > 0) return { justified: false, reason: pc2 === 'HARMS' ? 'PC2 = HARMS' : 'a goal group is harmed' };
  return { justified: true, package: pc2 === 'IMPROVES' ? 'floor + guard bundle' : 'floor alone', reason: `PC3 = PERSISTS, PC2 = ${pc2}` };
}

// ---- declared claims, instruments, rules ----
export const CLAIMS = Object.freeze([
  Object.freeze({ id: 'PC1', text: 'Does the legal-edge guard bundle remove the real-store deficit under the floor?', estimand: 'Delta_SG(F=1) = D_1 - D_0, D_g = Y(REAL,1,g) - Y(COLD,1,g)', labels: ['RECOVERY_FULL', 'RECOVERY_PARTIAL', 'NO_RECOVERY', 'INCONCLUSIVE', 'NOT_TESTABLE'] }),
  Object.freeze({ id: 'PC2', text: 'Does the guard bundle improve legal goal reaches or only the reset accounting?', estimand: 'tau_G(REAL, F=1)', labels: ['IMPROVES', 'HARMS', 'ACCOUNTING_ONLY', 'NEGLIGIBLE', 'INCONCLUSIVE'] }),
  Object.freeze({ id: 'PC3', text: 'Does the floor benefit persist with the real store?', estimand: 'tau_F(REAL, G=0) and tau_F(REAL, G=1)', labels: ['PERSISTS', 'ONLY_WITHOUT_GUARD', 'ONLY_WITH_GUARD', 'NOT_PERSISTENT'] }),
]);
export const INSTRUMENTS = Object.freeze([
  Object.freeze({ id: 'I1', text: 'condition integrity (state P, every session)', voids: 'all' }),
  Object.freeze({ id: 'I2', text: 'floor audit in every F1 session', voids: ['PC1', 'PC2', 'PC3'] }),
  Object.freeze({ id: 'I3', text: 'guard completeness: G1 => non-graph resets 0, executed non-graph moves 0, nothing admitted; G0 => masked 0, blocked 0', voids: ['PC1', 'PC2'] }),
  Object.freeze({ id: 'I4', text: 'default-off neutrality of the added lines and candidate-level scope (gate level; tree identity pinned at block level)', voids: ['PC1', 'PC2'] }),
  Object.freeze({ id: 'I5', text: 'the real-store deficit reproduces at G0 (upper bound of D_0, unadjusted 95 %, < 0)', voids: ['PC1'] }),
  Object.freeze({ id: 'I6', text: 'the cold floor effect reproduces (lower bound of tau_F(COLD, G=0), unadjusted 95 %, >= 40)', voids: ['PC3'] }),
  Object.freeze({ id: 'I7', text: 'delivered store identical across a world\'s four REAL cells and equal to its training export; seeds and configuration shared across the eight cells', voids: 'all' }),
]);
export const RULES = Object.freeze({
  worldExclusion: 'any session of the world fails after one retry (a condition-integrity or guard-completeness violation is a failure), or the REAL store fails its construct check, or a delivered store does not hash to its control',
  maxExcludedFraction: 0.10,
  stopping: 'fixed: all worlds x all eight cells; no interim analysis, no extension, no optional stopping, no outcome-based exclusion, one frozen analysis script',
  primaryOutcome: 'legal goal reaches per 1,500-call test session; non-graph resets and total resets are reported separately for every cell and contrast and are never merged',
  decisive: 'Bonferroni-3 intervals for {PC1, PC2, PC3}; unadjusted 95 % classification is a non-decisive sensitivity; secondary contrasts are descriptive',
  scope: 'the guard is the combined admission-mask + execution-guard BUNDLE; no effect is attributed to either component independently',
  recommendation: 'a supported result justifies a separate production-design SPECIFICATION only; it is not a production change and not production readiness',
});

// ---- digests ----
export const decisionDigest = () => hashObject({ schema: SCHEMA, head: HEAD_COMMIT, tree: TREE, guardTree: GUARD_TREE, factors: FACTORS, cells: CELL_NAMES, claims: CLAIMS, instruments: INSTRUMENTS, rules: RULES,
  margin: MARGIN, familySize: FAMILY_SIZE, flags: FLAGS, bootstrap: BOOTSTRAP, outcome: OUTCOME, ticks: TICKS, tcFloor: TC_FLOOR, floorBase: FLOOR_BASE_VALUE,
  worlds: { start: WORLD_START, n: WORLDS_N, perGoal: PER_GOAL, goals: GOALS }, calibration: CALIBRATION, configStart: CONFIG_START, hookStates: HOOK_STATES,
  confirmatoryState: CONFIRMATORY_STATE, classification: CLASSIFICATION, deviations: DEVIATIONS, claimLimits: CLAIM_LIMITS });
export const designDigest = () => hashObject({ decision: decisionDigest(), schema: SCHEMA });

/** the strongest sentence the declared rules allow (bundle wording; no component attribution) */
export function interpret(s) {
  const tail = ` ${CLASSIFICATION} The guard is the combined admission-mask + execution-guard bundle; no effect is attributed to either component.`;
  if (!s.valid) return `INVALID: ${s.reason || 'the block failed an integrity gate'}; no claim is interpreted.` + tail;
  const out = [];
  if (s.pc1 === 'NOT_TESTABLE') out.push('PC1 is NOT_TESTABLE: the real-store deficit did not reproduce at G0 in this block, so there is nothing for the guard to explain.');
  else if (s.pc1 === 'RECOVERY_FULL') out.push('PC1: with the guard bundle the real-store deficit under the floor is recovered by at least the margin and the real store is no longer worse than cold by the margin.');
  else if (s.pc1 === 'RECOVERY_PARTIAL') out.push('PC1: the guard bundle recovers at least the margin of the real-store deficit under the floor but the real store remains worse than cold by the margin.');
  else if (s.pc1 === 'NO_RECOVERY') out.push('PC1: the guard bundle does not recover the margin of the real-store deficit: the deficit does not run through the admission/execution channel the bundle closes.');
  else out.push('PC1 is inconclusive at the declared margin.');
  if (s.pc2 === 'IMPROVES') out.push('PC2: the guard bundle improves legal goal reaches for the real-store agent under the floor (not only the reset accounting).');
  else if (s.pc2 === 'ACCOUNTING_ONLY') out.push('PC2: the guard bundle changes the reset accounting only; legal goal reaches are unchanged within the margin.');
  else if (s.pc2 === 'HARMS') out.push('PC2: the guard bundle reduces legal goal reaches for the real-store agent by at least the margin.');
  else out.push(`PC2 is ${s.pc2}.`);
  if (s.pc3 === 'PERSISTS') out.push('PC3: the floor benefit persists with the real store with and without the guard bundle.');
  else out.push(`PC3: ${s.pc3}.`);
  if (s.harmFlags > 0) out.push(`${s.harmFlags} goal-group harm flag(s) are attached to primary claims.`);
  if (s.sensitivityAgrees === false) out.push('The unadjusted 95 % classification of the primary family differs from the decisive Bonferroni-3 classification.');
  out.push(s.spec.justified ? `A separate production-design specification is justified (${s.spec.package}); it is not a production change.` : `A production-design specification is not justified on this evidence (${s.spec.reason}).`);
  return out.join(' ') + tail;
}

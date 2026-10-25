// ==========================================================
// CREDIT-1 — configuration of record (implementation milestone; design r2; NOT frozen; no session authorized)
// ==========================================================
// Constants the gate checks.  No seed, world index or configuration is generated here.
// ==========================================================
import { LEARN0_TREE } from '../learn0/config.mjs';
import { TREE as HEAD_TREE } from '../gate-floor-head/config.mjs';

export const SCHEMA = 'credit1/1';
export const STATUS = 'IMPLEMENTATION_MILESTONE (design r2, not frozen; calibration and every session NOT authorized)';

// ---- what this milestone builds on ----
export const BASE_COMMIT = 'dd5b3ecdef4e7860ff56218f28fe7a44d8c02985';
export const DESIGN = Object.freeze({ file: 'DESIGN.md', revision: 'r2', sha256: 'c41c98ae7d72526b8bc69ac6d753182ba0c120e185bb302fb8901de5a0ca5719' });
export const PRODUCTION_MAIN_SHA256 = HEAD_TREE.headMainSha256;          // the audited production main.js (unchanged)
export { LEARN0_TREE };                                                   // the pinned LEARN-0 tree (base of every CREDIT-1 tree)

// ---- review records (verbatim copies; see review/REVIEW_RECORD.md) ----
export const REVIEWS = Object.freeze({
  round1: Object.freeze({ file: 'review/GEMINI_ROUND1_REVIEW.txt', sha256: 'ca0c500aff59d652488b6a2e4f3cc955a4d2d2d4be22a4a0d28d50c13e5b47d5' }),
  r1Design: Object.freeze({ file: 'review/DESIGN_r1_as_reviewed.md', sha256: '1eba0e9b196bd96ca73b7194d7d1efd721533d4d3c07177520125e7adabbe68a' }),
  // round 2 was relayed as chat text: this is the hash of the verbatim transcription, not of a file Gemini produced
  round2: Object.freeze({ file: 'review/GEMINI_ROUND2_REVIEW.md', sha256: '461f74f523b9653878b8a10f31bd76b06b70d571bbfa8886665b7a697b9a4e28' }),
  // most likely bytes reviewed in round 2 (byte-identical copies in the owner's Downloads; exact provenance not provable)
  round2Reviewed: Object.freeze({ design: DESIGN.sha256, packageR2: '3d6274739596d50cf63d93829c20ffb04531b4b928f80e2537aeaee621265169' }),
});

// ---- arms (credit modes); the switch is selected per session by a global (DESIGN section 4) ----
export const MODES = Object.freeze({
  L: null,                                                                  // global absent: legacy credit
  A: Object.freeze({ aligned: true }),                                      // primary: re-key the existing writes (28 substitutions)
  'A+': Object.freeze({ aligned: true, edgeFiltered: true }),               // optional module: A + the 4 edge-filtered operands (32)
});
export const TREE_ARMS = Object.freeze(['A', 'A+']);                        // one experimental tree per arm; L cells run on tree A with the global absent
// main.js of the two experiment trees, as built by transform.mjs from the pinned LEARN-0 tree (the gate rebuilds and compares)
export const CREDIT1_TREE = Object.freeze({
  A: Object.freeze({ mainSha256: 'e5c8a8b1063ac5d22aa0db465238a764430d60cecaecebd746f8d29b9e361bc2', inserted: 11 }),
  'A+': Object.freeze({ mainSha256: '5ee142a164c266ca6482a250e17c27323c3294d25d2c6bff0bdcac5273cc2de7', inserted: 12 }),
});
export const SUBSTITUTIONS = Object.freeze({ A: Object.freeze({ total: 28, lines: 26, agentLast: 17, agentCurrent: 5, prev: 6 }),
  'A+': Object.freeze({ total: 32, lines: 30, agentLast: 17, agentCurrent: 5, prev: 10 }) });

// production main.js line numbers of the classified lines (DESIGN r2 section 2.1); the census reconciles against these
export const DESIGN_LINES = Object.freeze({
  GUARD: [3963, 3967, 3969, 4474], DEAD: [3990],
  FROM: [3999, 4098, 4168, 4183, 4220, 4233, 4267, 4270, 4321, 4349, 4364, 4370, 4380, 4387, 4412, 4415, 4476],
  TO: [4171, 4234, 4267, 4270, 4352], PREV: [4506, 4719, 4749, 4908, 4933, 4940],
  HELD_EDGE: [4703, 4710, 4712, 4960], HELD_OTHER: [4483, 4495], POSITION: [4191, 4451], RESET: [4861, 4862],
  LOG: [4338, 4758, 4867, 4945], COMMENT: [4699],
});

// ---- cells: the 9-cell design (owner decision 2026-10-25); A+ module cells are specified, not part of the plan ----
const cell = (name, role, credit, store, map) => Object.freeze({ name, role, credit, store, map });
export const CELLS = Object.freeze([
  cell('T_L', 'train', 'L', 'none', 'off'),
  cell('T_A', 'train', 'A', 'none', 'off'),
  cell('N0L', 'test', 'L', 'none', 'off'),
  cell('N1L', 'test', 'L', 'own:T_L:FULL', 'off'),
  cell('N0A', 'test', 'A', 'none', 'off'),
  cell('N1A', 'test', 'A', 'own:T_A:FULL', 'off'),
  cell('N1AX', 'test', 'A', 'paired:T_A:FULL', 'off'),                    // N1A× (goal-swapped)
  cell('N1LX', 'test', 'L', 'paired:T_L:FULL', 'off'),                    // N1L× (goal-swapped)
  cell('N1A_noQ', 'test', 'A', 'own:T_A:NO_Q', 'off'),
]);
export const MODULE_A_PLUS = Object.freeze({ status: 'OPTIONAL MODULE, NOT AUTHORIZED', cells: Object.freeze([
  cell('T_AP', 'train', 'A+', 'none', 'off'), cell('N0AP', 'test', 'A+', 'none', 'off'), cell('N1AP', 'test', 'A+', 'own:T_AP:FULL', 'off')]) });
export const GOALS = Object.freeze([8, 12, 16, 19]);                        // goal = GOALS[configIndex % 4] (LEARN-0 convention)

// ---- primary family and decision grid (DESIGN r2 section 6.3-6.4) ----
export const PRIMARY = Object.freeze({ claims: Object.freeze(['P1', 'P2']), level: 0.975, margin: 20, sensitivity: Object.freeze([15, 30]),
  bootstrap: Object.freeze({ replicates: 10000, seed: null /* fixed at freeze */ }), zAlpha: 2.2414, zPower: 0.8416, sdInflation: 1.25, nMultipleOf: 4 });
export const P1_LABELS = Object.freeze(['LEARNS', 'NO_PRACTICAL_EFFECT', 'INCONCLUSIVE', 'HARMS']);
export const P2_LABELS = Object.freeze(['RAISES', 'NO_PRACTICAL_DIFFERENCE', 'LOWERS', 'INCONCLUSIVE']);
export const GRID = Object.freeze({
  RAISES: Object.freeze({ LEARNS: 'R1', NO_PRACTICAL_EFFECT: 'R2', INCONCLUSIVE: 'R2', HARMS: 'R3' }),
  NO_PRACTICAL_DIFFERENCE: Object.freeze({ LEARNS: 'R4', NO_PRACTICAL_EFFECT: 'R5', INCONCLUSIVE: 'R6', HARMS: 'R5' }),
  LOWERS: Object.freeze({ LEARNS: 'R7', NO_PRACTICAL_EFFECT: 'R7', INCONCLUSIVE: 'R7', HARMS: 'R7' }),
  INCONCLUSIVE: Object.freeze({ LEARNS: 'R8', NO_PRACTICAL_EFFECT: 'R6', INCONCLUSIVE: 'R6', HARMS: 'R6' }),
});
/** label of one claim from its interval (DESIGN r2 6.3) */
export function labelOf(ci, pos, none, neg, margin = PRIMARY.margin) {
  if (!ci || !Number.isFinite(ci.lower) || !Number.isFinite(ci.upper)) return 'UNDEFINED';
  if (ci.lower >= margin) return pos;
  if (ci.upper <= -margin) return neg;
  if (ci.lower > -margin && ci.upper < margin) return none;
  return 'INCONCLUSIVE';
}
export const rowOf = (p1, p2) => (GRID[p2] && GRID[p2][p1]) || null;
/** n for one claim (DESIGN r2 6.7): ((zAlpha + zPower) * inflation * sd / margin)^2, rounded up to a multiple of 4 */
export function nFor(sd) {
  const x = Math.pow((PRIMARY.zAlpha + PRIMARY.zPower) * PRIMARY.sdInflation * sd / PRIMARY.margin, 2);
  return Math.ceil(x / PRIMARY.nMultipleOf) * PRIMARY.nMultipleOf;
}

// ---- territory (DESIGN r2 6.8); nothing is generated in this milestone ----
export const TERRITORY = Object.freeze({ confirmatoryStart: 2032, reserved: Object.freeze([
  Object.freeze({ study: 'earlier GATE-FLOOR / XFER studies (LEARN-0 RESERVED)', lo: 0, hi: 1391 }),
  Object.freeze({ study: 'GATE-FLOOR-SCOPE C\' (frozen, not run)', lo: 1392, hi: 1671 }),
  Object.freeze({ study: 'LEARN-0 block L', lo: 1672, hi: 2031 })]), generated: false });

// ---- development calibration basis (DESIGN r2 section 8); NOT authorized ----
export const CALIBRATION = Object.freeze({ status: 'NOT AUTHORIZED', basis: 'XFER-1 development worlds 0-29 (LEARN-0 CALIBRATION precedent)', worlds: Object.freeze({ lo: 0, hi: 29 }) });

// ---- instrument event classes (DESIGN r2 section 5); fixtures and the calibration coverage list both use this list ----
export const EVENT_CLASSES = Object.freeze(['ordinary_legal_move', 'goal_entry_reset', 'first_move_after_reset', 'hold', 'reversal_guard_skip',
  'first_call_guard_skip', 'self_target', 'carried_decision', 'nongraph_execution', 'fallback_branch', 'dampq_firing', 'curiosity_signal_write',
  'aplus_filter_pass', 'aplus_filter_fail']);

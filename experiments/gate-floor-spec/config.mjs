// ==========================================================
// GATE-FLOOR-SCOPE (design C') — training scope and execution-guard omission of the floor + guard package: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: PRE-REGISTRATION PACKAGE, NOT FROZEN.  Substrate: the GATE-FLOOR-INTERACTION guard tree, UNCHANGED (PRODSEM derived HEAD tree + the
// two pinned, guarded, default-off guard lines).  Production is not modified.  Hook state P for every session.  The two guard components
// are switched by a DRIVER-level flag pair on the pinned lines (admission mask = GUARD.admit drops non-neighbour candidates; execution
// guard = the EXEC line's legality verdict); no tree line is added.  The design text is DESIGN.md; this file is its machine-readable form.
// Nothing here is chosen from a confirmatory outcome: the only sessions behind these numbers are development worlds (XFER-1 0..29).
// ==========================================================
import * as P from '../gate-floor-prodsem/config.mjs';
import * as GI from '../gate-floor-interaction/config.mjs';

export const SCHEMA = 'gatefloorscope/1';
export const STUDY = 'GATE-FLOOR-SCOPE';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

export const { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
  TC_FLOOR, FLOOR_BASE_VALUE, GOALS, OUTCOME, HEAD_COMMIT, TREE, HOOK_STATES, CONFIRMATORY_STATE, CLASSIFICATION, DEVIATIONS, CLAIM_LIMITS } = P;
export const { GUARD_TREE } = GI;

// ---- guard settings (driver-level flag pair on the two pinned lines) ----
//   off  : mask off, execution guard off            mask : mask on, execution guard off            both : mask on, execution guard on (= Block I's bundle)
// An execution-guard-only setting is NOT part of this design (the development comparator U_exec was pathological, see DESIGN.md section 3).
export const GUARD_SETTINGS = Object.freeze({
  off: Object.freeze({ mask: false, exec: false }),
  mask: Object.freeze({ mask: true, exec: false }),
  both: Object.freeze({ mask: true, exec: true }),
});

// ---- training regimes (one cold 1,500-call training session each, floor OFF, same world / configuration / training seed) ----
export const TRAININGS = Object.freeze([
  Object.freeze({ id: 'U', guard: 'off', text: 'legacy store: trained UNGUARDED under state P (as Block I)' }),
  Object.freeze({ id: 'G', guard: 'both', text: 'guarded store: trained under the full guard bundle (mask + execution guard)' }),
]);

// ---- test cells (floor ON, hook state P, 1,500 calls, the world's test seed; the store is the world's own training export, episodes only) ----
export const CELLS = Object.freeze([
  Object.freeze({ name: 'U_off', store: 'U', guard: 'off', role: 'legacy + floor: the comparator of the package' }),
  Object.freeze({ name: 'U_mask', store: 'U', guard: 'mask', role: 'execution-guard omission candidate (mask only)' }),
  Object.freeze({ name: 'U_both', store: 'U', guard: 'both', role: 'retrofit: Block I\'s REAL_F1_G1; comparator for scope and for the execution guard' }),
  Object.freeze({ name: 'G_both', store: 'G', guard: 'both', role: 'the whole history guarded (guard-trained store + bundle at test)' }),
]);
export const CELL_NAMES = Object.freeze(CELLS.map(c => c.name));
export const EXCLUDED_CELLS = Object.freeze(['U_exec', 'G_off', 'G_mask']);   // declared absent (DESIGN.md section 3); the gate asserts none is planned

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1 (0..79) ... GATE-FLOOR-PRODSEM (832..1111) and GATE-FLOOR-INTERACTION (1112..1391): the same ascending
// accepted-configuration stream from CONFIG_START.
export const WORLD_START = GI.BLOCKS.I.hi + 1;                 // 1392
export const WORLDS_N = 280;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;            // 1672
export const BLOCKS = Object.freeze({ S: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const blockOf = (w) => (w >= BLOCKS.S.lo && w <= BLOCKS.S.hi ? 'S' : null);
export const PER_GOAL = WORLDS_N / GOALS.length;               // 70
export const SESSIONS_PER_WORLD = TRAININGS.length + CELLS.length;   // 2 training + 4 test = 6
export const SESSION_ACCOUNTING = Object.freeze({ training: WORLDS_N * TRAININGS.length, test: WORLDS_N * CELLS.length, total: WORLDS_N * SESSIONS_PER_WORLD });   // 560 + 1,120 = 1,680

// ---- development calibration that sized the study (design input; XFER-1 worlds 0..29; evidence/calibration6_summary.json) ----
export const CALIBRATION = Object.freeze({
  worlds: 30, state: 'P',
  contrasts: Object.freeze({
    PS1_scope: Object.freeze({ mean: -10.7, sd: 57.1 }),
    PS2_package: Object.freeze({ mean: 29.7, sd: 74.7 }),
    PS3_execIncrement: Object.freeze({ mean: -8.1, sd: 28.5 }),
    retrofit: Object.freeze({ mean: 40.4, sd: 50.3 }),
    maskWithoutExec: Object.freeze({ mean: 48.5, sd: 50.4 }),
  }),
  pathologicalComparator: Object.freeze({ cell: 'U_exec', effectVsOff: -94.0, blockedPerSession: 448.8, note: 'execution guard without the mask; NOT an estimate of the execution guard\'s value in a viable configuration' }),
});

// ---- margin, multiplicity, intervals ----
export const MARGIN = Object.freeze({ delta: 20 });
export const FAMILY_SIZE = 3;
export const BOOT_FAMILY = Object.freeze({ ...BOOTSTRAP, level: 1 - 0.05 / FAMILY_SIZE });
export const BOOT_95 = BOOTSTRAP;
export const FLAGS = Object.freeze({ blockedShareOfCalls: 0.05, graphPoolChange: 0.05 });

// ---- the stale-reasoning diagnostic: pre-specified reading thresholds (descriptive; gates no primary claim) ----
export const STALE = Object.freeze({
  supportShare: 0.90,          // X1: share of mask-only non-graph resets classified STALE
  blockedStaleShare: 0.95,     // X3: share of bundle-blocked executions that are STALE arrivals
  maxUnclassifiedShare: 0.05,  // XU: UNCLASSIFIED share of non-graph resets (pooled over the non-bundle cells)
  minMaskResetsPerSession: 1,  // below this mean there is nothing to classify
});

// ---- decision rules (pure) ----
const has = (ci) => ci && Number.isFinite(ci.lower) && Number.isFinite(ci.upper);
const d = () => MARGIN.delta;
/** PS1 scope: Y(G,both) - Y(U,both) */
export function classifyPS1(ci) {
  if (!has(ci)) return 'UNDEFINED';
  if (ci.lower >= d()) return 'SCOPE_BENEFIT';
  if (ci.upper <= -d()) return 'SCOPE_HARM';
  if (ci.lower > -d() && ci.upper < d()) return 'SCOPE_NEUTRAL';
  return 'INCONCLUSIVE';
}
/** PS2 package: Y(G,both) - Y(U,off) */
export function classifyPS2(ci) {
  if (!has(ci)) return 'UNDEFINED';
  if (ci.lower >= d()) return 'PACKAGE_IMPROVES';
  if (ci.upper <= -d()) return 'PACKAGE_HARMS';
  if (ci.lower > -d() && ci.upper < d()) return 'PACKAGE_NEUTRAL';
  return 'INCONCLUSIVE';
}
/** PS3 incremental legal-reach effect of the execution guard given the mask: sigma_M = Y(U,both) - Y(U,mask) */
export function classifyPS3(ci) {
  if (!has(ci)) return 'UNDEFINED';
  if (ci.upper <= -d()) return 'MASK_SUPERIOR';      // the bundle is worse than mask-only by at least delta
  if (ci.lower >= d()) return 'MASK_FALLS_SHORT';    // the execution guard adds at least delta
  if (ci.upper < d()) return 'MASK_SUFFICES';        // mask-only is not worse than the bundle by delta (non-inferiority)
  return 'INCONCLUSIVE';
}
/** stale-channel reading (descriptive): x1 = { share, ci } for mask-only; x3 = blocked stale share; xu = unclassified share; maskResets = mean per session */
export function classifyStale({ x1, x3, xu, maskResets, integrityOk }) {
  if (!integrityOk) return 'VOID';
  if (!(maskResets >= STALE.minMaskResetsPerSession) || !has(x1 && x1.ci) || !(xu <= STALE.maxUnclassifiedShare)) return 'UNRESOLVED';
  if (x1.ci.upper < STALE.supportShare || (Number.isFinite(x3) && x3 < STALE.blockedStaleShare)) return 'WEAKENED';
  if (x1.ci.lower >= STALE.supportShare && Number.isFinite(x3) && x3 >= STALE.blockedStaleShare) return 'SUPPORTED';
  return 'UNRESOLVED';
}
/** the engineering reading of DESIGN.md section 8 (decision table); completeness is never decided here */
export function specification({ ps1, ps2, ps3, stale, harmFlags, instrumentsOk }) {
  if (!instrumentsOk) return { justified: false, reason: 'an instrument that the decision depends on failed', scope: null, execGuard: null };
  const scope = ps1 === 'SCOPE_NEUTRAL' ? 'retrofit suffices within delta: the guard need not predate the store'
    : ps1 === 'SCOPE_BENEFIT' ? 'specify the guard from the first training run'
      : ps1 === 'SCOPE_HARM' ? 'do not train under the bundle: retrofit-only'
        : 'no training-scope claim';
  const execGuard = ps3 === 'MASK_FALLS_SHORT' ? 'keep the execution guard: it adds at least delta legal reaches beyond the mask'
    : (ps3 === 'MASK_SUFFICES' || ps3 === 'MASK_SUPERIOR') ? `performance does not require the execution guard; retaining it is a completeness requirement for the owner (stale channel: ${stale})`
      : 'no performance claim on the execution guard';
  if (ps2 === 'PACKAGE_HARMS' || harmFlags > 0) return { justified: false, reason: ps2 === 'PACKAGE_HARMS' ? 'PS2 = PACKAGE_HARMS' : 'a goal group is harmed', scope, execGuard };
  if (ps2 !== 'PACKAGE_IMPROVES') return { justified: false, reason: `PS2 = ${ps2}`, scope, execGuard };
  return { justified: true, reason: 'PS2 = PACKAGE_IMPROVES with no harm flag', scope, execGuard };
}

// ---- declared claims, diagnostics, instruments, rules ----
export const CLAIMS = Object.freeze([
  Object.freeze({ id: 'PS1', text: 'Training scope: does training the store under the bundle change the bundle\'s legal goal reaches?', estimand: 'PS1 = E_w[ Y_w(G,both) - Y_w(U,both) ]', cells: ['G_both', 'U_both'], labels: ['SCOPE_BENEFIT', 'SCOPE_HARM', 'SCOPE_NEUTRAL', 'INCONCLUSIVE'] }),
  Object.freeze({ id: 'PS2', text: 'Package: is the guard-trained store + bundle better than the legacy store + floor alone?', estimand: 'PS2 = E_w[ Y_w(G,both) - Y_w(U,off) ]', cells: ['G_both', 'U_off'], labels: ['PACKAGE_IMPROVES', 'PACKAGE_HARMS', 'PACKAGE_NEUTRAL', 'INCONCLUSIVE'] }),
  Object.freeze({ id: 'PS3', text: 'Execution-guard increment given the mask (legal reaches only): sigma_M', estimand: 'PS3 = E_w[ Y_w(U,both) - Y_w(U,mask) ]', cells: ['U_both', 'U_mask'], labels: ['MASK_SUFFICES', 'MASK_SUPERIOR', 'MASK_FALLS_SHORT', 'INCONCLUSIVE'] }),
]);
export const SECONDARY = Object.freeze([
  Object.freeze({ id: 'D2', text: 'retrofit replicate of Block I (instrument I6)', estimand: 'E_w[ Y_w(U,both) - Y_w(U,off) ]' }),
  Object.freeze({ id: 'M0', text: 'mask effect when the execution guard is absent', estimand: 'E_w[ Y_w(U,mask) - Y_w(U,off) ]' }),
  Object.freeze({ id: 'GM', text: 'guard-trained package vs mask-only retrofit (descriptive)', estimand: 'E_w[ Y_w(G,both) - Y_w(U,mask) ]' }),
]);
export const INSTRUMENTS = Object.freeze([
  Object.freeze({ id: 'I1', text: 'condition integrity (state P) in every training and test session', voids: 'all' }),
  Object.freeze({ id: 'I2', text: 'floor audit in every test session', voids: ['PS1', 'PS2', 'PS3'] }),
  Object.freeze({ id: 'I3', text: 'guard completeness per setting: both -> 0 non-graph resets, 0 non-graph decisions, 0 admitted non-graph candidates, 0 unblocked illegal executions; mask -> 0 non-graph decisions, 0 admitted, 0 blocked; off -> 0 masked, 0 blocked', voids: ['PS1', 'PS2', 'PS3'] }),
  Object.freeze({ id: 'I4', text: 'default-off neutrality, diagnostic neutrality and component scope (gate level); guard-tree identity pinned at block level', voids: ['PS1', 'PS2', 'PS3'] }),
  Object.freeze({ id: 'I5', text: 'training fidelity: U trained guard off / floor off, G trained bundle on / floor off, same training seed and configuration; G training complete (I3 both) and its store has 0 EXECUTED-class non-graph pairs', voids: ['PS1', 'PS2'] }),
  Object.freeze({ id: 'I6', text: 'retrofit replicate D2: lower bound (unadjusted 95 %) > 0', voids: ['PS2'] }),
  Object.freeze({ id: 'I7', text: 'pairing and store identity: the U store identical across U_off/U_mask/U_both and equal to its training export, the G store delivered only to G_both and equal to its export; one test seed and one configuration per world', voids: 'all' }),
  Object.freeze({ id: 'I8', text: 'store diagnostics: FLAG if the mean non-graph pair share of G stores exceeds that of U stores (the training placement did not act)', voids: [] }),
  Object.freeze({ id: 'I9', text: 'stale-diagnostic accounting: per session the reset classes sum to the reach counts and the blocked arrivals equal the pinned line\'s own counter', voids: ['STALE'] }),
]);
export const RULES = Object.freeze({
  worldExclusion: 'any training or test session of the world fails after one retry (a crash, an incomplete run, a condition-integrity or guard-completeness violation), or a store fails its construct check, or a delivered store does not hash to its control',
  maxExcludedFraction: 0.10,
  stopping: 'fixed: all 280 worlds x (2 trainings + 4 test cells) = 1,680 sessions; no interim analysis, no extension, no optional stopping, no outcome-based exclusion, one frozen analysis script',
  primaryOutcome: 'legal goal reaches per 1,500-call test session; non-graph resets, total resets and the stale/decision split are reported separately for every cell and contrast and are never merged',
  decisive: 'Bonferroni-3 intervals for {PS1, PS2, PS3}; the unadjusted 95 % classification is a non-decisive sensitivity; secondary contrasts and the stale diagnostic are descriptive',
  scope: 'components are switched only through the pinned lines; PS3 is the incremental legal-reach effect of the execution guard WITH the mask present; no claim is made about the execution guard without the mask, about component effects on a component-trained store, or about the cause of the non-graph pairs in guard-trained stores',
  completeness: 'whether a residual illegal execution (the stale channel left by mask-only) is acceptable is an engineering/safety requirement for the owner; no statistical result decides it',
  recommendation: 'a supported result justifies a separate production-design SPECIFICATION only; it is not a production change and not production readiness',
});

// ---- digests ----
export const decisionDigest = () => hashObject({ schema: SCHEMA, head: HEAD_COMMIT, tree: TREE, guardTree: GUARD_TREE, guardSettings: GUARD_SETTINGS, trainings: TRAININGS, cells: CELL_NAMES,
  excludedCells: EXCLUDED_CELLS, claims: CLAIMS, secondary: SECONDARY, instruments: INSTRUMENTS, rules: RULES, margin: MARGIN, familySize: FAMILY_SIZE, flags: FLAGS, stale: STALE, bootstrap: BOOTSTRAP,
  outcome: OUTCOME, ticks: TICKS, tcFloor: TC_FLOOR, floorBase: FLOOR_BASE_VALUE, worlds: { start: WORLD_START, n: WORLDS_N, perGoal: PER_GOAL, goals: GOALS }, accounting: SESSION_ACCOUNTING,
  calibration: CALIBRATION, configStart: CONFIG_START, hookStates: HOOK_STATES, confirmatoryState: CONFIRMATORY_STATE, classification: CLASSIFICATION, deviations: DEVIATIONS, claimLimits: CLAIM_LIMITS });
export const designDigest = () => hashObject({ decision: decisionDigest(), schema: SCHEMA });

/** the strongest sentence the declared rules allow */
export function interpret(s) {
  const tail = ` ${CLASSIFICATION} PS3 is the execution guard's increment with the mask present; nothing is claimed about either component alone on a component-trained store or about the cause of the non-graph pairs in guard-trained stores. Completeness is an owner decision, not a statistical one.`;
  if (!s.valid) return `INVALID: ${s.reason || 'the block failed an integrity gate'}; no claim is interpreted.` + tail;
  const out = [];
  const ps1 = { SCOPE_NEUTRAL: 'PS1: training the store under the bundle changes the bundle\'s legal goal reaches by less than the margin in either direction (total effect of the training regime).',
    SCOPE_BENEFIT: 'PS1: training the store under the bundle increases the bundle\'s legal goal reaches by at least the margin (total effect of the training regime).',
    SCOPE_HARM: 'PS1: training the store under the bundle reduces the bundle\'s legal goal reaches by at least the margin (total effect of the training regime).' }[s.ps1];
  out.push(ps1 || `PS1 is ${s.ps1}.`);
  const ps2 = { PACKAGE_IMPROVES: 'PS2: the guard-trained store with the bundle improves legal goal reaches over the legacy store with the floor alone by at least the margin.',
    PACKAGE_HARMS: 'PS2: the guard-trained package reduces legal goal reaches relative to the legacy store with the floor alone by at least the margin.',
    PACKAGE_NEUTRAL: 'PS2: the guard-trained package and the legacy store with the floor alone differ by less than the margin in legal goal reaches.' }[s.ps2];
  out.push(ps2 || `PS2 is ${s.ps2}.`);
  const ps3 = { MASK_SUFFICES: 'PS3: with the mask present the execution guard adds less than the margin in legal goal reaches (mask-only is non-inferior on legal reaches).',
    MASK_SUPERIOR: 'PS3: with the mask present the execution guard costs at least the margin in legal goal reaches.',
    MASK_FALLS_SHORT: 'PS3: with the mask present the execution guard adds at least the margin in legal goal reaches.' }[s.ps3];
  out.push(ps3 || `PS3 is ${s.ps3}.`);
  out.push(`Stale-channel diagnostic: ${s.stale}.`);
  if (s.harmFlags > 0) out.push(`${s.harmFlags} goal-group harm flag(s) are attached to primary claims.`);
  if (s.sensitivityAgrees === false) out.push('The unadjusted 95 % classification of the primary family differs from the decisive Bonferroni-3 classification.');
  if (s.storeFlag) out.push('I8 FLAG: guard-trained stores carry a larger non-graph pair share than legacy stores.');
  out.push(s.spec.justified ? 'A separate production-design specification of the floor + guard package is justified; it is not a production change.' : `A production-design specification is not justified on this evidence (${s.spec.reason}).`);
  return out.join(' ') + tail;
}

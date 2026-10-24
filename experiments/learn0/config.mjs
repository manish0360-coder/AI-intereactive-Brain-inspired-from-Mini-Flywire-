// ==========================================================
// LEARN-0 — does experience-derived state improve goal-directed behaviour when every map oracle is disabled?  Declarations (data and
// pure helpers; no I/O).  STATUS: DESIGN PACKAGE FOR REVIEW — NOT FROZEN, NOT AUTHORISED, NO CONFIRMATORY SESSION.
// ==========================================================
// Substrate: the audited runtime (blobs of 0df804c == HEAD 8e699af for every runtime path), as the PRODSEM derived tree + the two pinned
// GATE-FLOOR-INTERACTION guard lines (inert here) + the four LEARN-0 oracle lines (transform.mjs).  Hook state P.  Production unchanged.
// Every number below that is not a definition comes from the DEVELOPMENT calibration on XFER-1 worlds 0..29 (evidence/), never from a
// study world.  The design text is DESIGN.md.
// ==========================================================
import * as P from '../gate-floor-prodsem/config.mjs';
import * as GI from '../gate-floor-interaction/config.mjs';

export const SCHEMA = 'learn0/1';
export const STUDY = 'LEARN-0';
export const STATUS = 'DESIGN_FOR_REVIEW';

export const { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
  GOALS, HEAD_COMMIT, TREE, HOOK_STATES, CONFIRMATORY_STATE, CLASSIFICATION, DEVIATIONS } = P;
export const { GUARD_TREE } = GI;

// ---- the experiment tree, pinned by content (verified by the gate against a fresh build) ----
export const LEARN0_TREE = Object.freeze({
  baseGuardMainSha256: GI.GUARD_TREE.guardMainSha256,
  basePlanningSha256: 'd88973bc4f78d6b87d225c35f8e8b154c404b1257a41a3e00cbd074a1ca2fc80',
  mainSha256: '3d3266fde38c39ea0a38f3920b4a2384ef5998e88c748e0a0a53416ef62bccc3',
  planningSha256: '34e06c655b4f2b04d77b4db0b8db744568235865788177085510b5dd78cf46dc',
  lineSha256: Object.freeze({
    goalDistance: '22fde6dca7c00766c1985136b6bcfb6e48ca3ad3f052f0436d35741af526db5e',
    canReachGoal: '8261de283c6628c65bcb2372661eed113790d2fb047edfc2665db84315325fe4',
    graphDiameter: 'ae672351387768dcdd370661f0e32cc444f87f96c2abba8c76f46becb721b1f8',
    futureScore: '1952d3d1d41d8d35807aaa8ff83794dbe1ac8e0ee27915d43b1ba7352cc0afdc',
  }),
});
// the runtime identity the experiment tests (FACT, git): every runtime path is byte-identical at 952c9fc (last runtime change), 0df804c, 8e699af
export const RUNTIME = Object.freeze({ auditedCommit: P.HEAD_COMMIT, lastRuntimeChange: '952c9fcf3123eb6e7ca2deab8247d2a99af541cf', designedOn: '8e699afa56b26b22dca6b5621a57ee378ec33aa7',
  runtimePaths: Object.freeze(['main.js', 'render', 'index.html', 'connections.json', 'neurons.json', 'instrumentation', 'experiments/m7']),
  mainBlob: '09c36b5caf24ed1bf447a13fe924d8297a11a301', renderTree: 'dd0d28902b7d136e719b9cba05bdc04cd549b705', mainSha256: P.TREE.headMainSha256 });

// ---- map settings and stores ----
export const MAPS = Object.freeze({ on: 'all four oracles run (production behaviour)', off: 'all four oracles return their neutral value before reading the graph' });
export const ORACLES = Object.freeze(['goalDistance', 'canReachGoal', 'graphDiameter', 'futureScore']);
export const CONFIRMATORY_ARMS = Object.freeze(['COLD', 'FULL', 'ONLY_episodes', 'ONLY_Q']);   // FULL = everything the product persists (8 components)
export const DEVELOPMENT_ARMS = Object.freeze([]);

// ---- sessions per world ----
export const TRAINING = Object.freeze({ id: 'T', map: 'off', text: 'cold training session WITHOUT the map (train seed, 1,500 calls); its export is the world\'s experience store' });
export const CELLS = Object.freeze([
  Object.freeze({ name: 'N0', map: 'off', arm: 'COLD', role: 'no map, no experience (the reference)' }),
  Object.freeze({ name: 'N1', map: 'off', arm: 'FULL', role: 'no map, the world\'s whole persisted store from T (the PRIMARY treatment)' }),
  Object.freeze({ name: 'N1E', map: 'off', arm: 'ONLY_episodes', role: 'no map, only the episodes of the same store (secondary: component)' }),
  Object.freeze({ name: 'N1Q', map: 'off', arm: 'ONLY_Q', role: 'no map, only the Q table of the same store (secondary: component)' }),
  Object.freeze({ name: 'O0', map: 'on', arm: 'COLD', role: 'map, no experience (descriptive anchor: what the map provides)' }),
]);
export const CELL_NAMES = Object.freeze(CELLS.map(c => c.name));

// ---- worlds: the next fresh block of the accepted-configuration stream, after GATE-FLOOR-SCOPE C' (1392..1671, reserved) ----
export const WORLD_START = 1672;
export const WORLDS_N = 360;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;            // 2032
export const BLOCKS = Object.freeze({ L: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const RESERVED = Object.freeze([Object.freeze({ study: 'GATE-FLOOR-SCOPE C\' (frozen 68e553e)', lo: 1392, hi: 1671 }), Object.freeze({ study: 'all earlier GATE-FLOOR / XFER studies', lo: 0, hi: 1391 })]);
export const blockOf = (w) => (w >= BLOCKS.L.lo && w <= BLOCKS.L.hi ? 'L' : null);
export const PER_GOAL = WORLDS_N / GOALS.length;               // 90 (goal = GOALS[configIndex % 4]; 1672 % 4 = 0)
export const SESSIONS_PER_WORLD = 1 + CELLS.length;            // 6
export const SESSION_ACCOUNTING = Object.freeze({ training: WORLDS_N, test: WORLDS_N * CELLS.length, total: WORLDS_N * SESSIONS_PER_WORLD });   // 360 + 1,800 = 2,160

// ---- development calibration (XFER-1 worlds 0..29, evidence/calib_learn0_summary.json; the gate checks these against the file) ----
export const CALIBRATION = Object.freeze({
  worlds: 30, state: 'P', status: 'RECORDED',
  levels: Object.freeze({ N0: 247.9, N1: 229.3, N1E: 301.4, N1Q: 199.9, O0: 376.5 }),
  contrasts: Object.freeze({
    E1_N1_minus_N0: Object.freeze({ mean: -18.5, sd: 107.5 }),
    N1E_minus_N0: Object.freeze({ mean: 53.5, sd: 67.2 }),
    N1Q_minus_N0: Object.freeze({ mean: -48.0, sd: 95.8 }),
    S5_O0_minus_N0: Object.freeze({ mean: 128.7, sd: 81.6 }),
  }),
});

// ---- margin and sample size (DESIGN.md section 6) ----
//   delta = 20 legal reaches: the programme's practical margin since GATE-FLOOR-PRODSEM (also INTERACTION and C'); a judgment, not a
//   statistical result.  At the development levels it is about 8 % of the cold no-map level (247.9) and about 16 % of what the map adds
//   (128.7).  n = 360: the programme's sizing rule n >= ((z0.975 + z0.80) * SD / delta)^2 with the development SD inflated by 25 %
//   (107.5 * 1.25) gives 355; 360 keeps 90 worlds per goal.  Every number below is re-derived by the gate from sizing.mjs and checked
//   against evidence/sizing_learn0.json (closed form + Monte Carlo through the analysis' own bootstrap).  The rule is built to classify
//   effects MEANINGFULLY LARGER than delta: a true effect of exactly +-delta is INCONCLUSIVE with probability 0.95 for every n.
export const MARGIN = Object.freeze({ delta: 20, rule: 'programme margin (PRODSEM, INTERACTION, C\'); sensitivity reported at 15 and 30', sensitivity: Object.freeze([15, 30]) });
export const SIZING = Object.freeze({ sd: 107.5, inflation: 1.25, z: 1.959964 + 0.841621, nRequired: 355, nChosen: 360,
  sdInterval95: Object.freeze([85.64, 144.57]), sdBootstrapInterval95: Object.freeze([86.34, 123.95]), inflationOneSidedUcLevel: 0.932,
  detectableAt80: Object.freeze({ development: 35.88, inflated: 39.85, intervalUpper: 41.35 }),
  alternativesNotAdopted: Object.freeze({ ruleAtSdIntervalUpper: 411, noEffect80AtInflatedSd: 475 }),
  decision: 'n = 360 is a deliberately limited design: the programme rule fixed before any outcome, unchanged by the development mean; its operating characteristics are disclosed (DESIGN.md section 6)' });
export const PRIMARY_LEVEL = 0.95;                              // a single primary contrast
export const BOOT = Object.freeze({ ...BOOTSTRAP, level: PRIMARY_LEVEL });

// ---- decision rule (pure) ----
const has = (ci) => ci && Number.isFinite(ci.lower) && Number.isFinite(ci.upper);
/** E1 = E_w[ Y_w(N1) - Y_w(N0) ] in legal goal reaches */
export function classifyE1(ci, delta = MARGIN.delta) {
  if (!has(ci) || !Number.isFinite(delta)) return 'UNDEFINED';
  if (ci.lower >= delta) return 'LEARNS_WITHOUT_MAP';
  if (ci.upper <= -delta) return 'EXPERIENCE_HARMS_WITHOUT_MAP';
  if (ci.lower > -delta && ci.upper < delta) return 'NO_PRACTICAL_EFFECT';
  return 'INCONCLUSIVE';
}

export const CLAIMS = Object.freeze([
  Object.freeze({ id: 'E1', text: 'Does the world\'s own experience store (trained without the map) raise legal goal reaches when the map oracles are disabled?',
    estimand: 'E1 = E_w[ Y_w(N1) - Y_w(N0) ], Y = legal goal reaches per 1,500-call test session', labels: ['LEARNS_WITHOUT_MAP', 'NO_PRACTICAL_EFFECT', 'EXPERIENCE_HARMS_WITHOUT_MAP', 'INCONCLUSIVE'],
    scope: 'the TOTAL effect of delivering the tested store (all eight persisted components of the world\'s own map-off training export, together) at the start of a map-off session, '
      + 'versus starting cold, under the same map-off procedure and test seed; it is not the causal contribution of any single component or learning mechanism' }),
]);
// secondaries: exploratory and descriptive; none carries a label, none changes E1's label, none is a confirmatory claim
export const SECONDARY_POLICY = Object.freeze({ intervals: 28, level: 0.95, adjustment: 'none (unadjusted percentile intervals, reported as estimates)',
  status: 'exploratory: no secondary yields a label, a claim or a decision; with 28 unadjusted 95 % intervals about 1.4 are expected to exclude the true value by chance alone',
  counted: 'S1 2 + S2 2 + S3 3 + S4 1 + S5 1 + S6 3 + byGoal 4 goals x 4 = 28' });
export const SECONDARY = Object.freeze([
  Object.freeze({ id: 'S1', text: 'non-graph resets and total resets, N1 - N0 (reported separately, never merged with E1)' }),
  Object.freeze({ id: 'S2', text: 'within-session learning without the map: legal reaches in calls 750..1499 minus calls 0..749, in N0 (and N1)' }),
  Object.freeze({ id: 'S3', text: 'multi-step goal direction (agent-blind measurement): downhill rate of LEGAL executed moves made at true distance >= 2, minus its chance rate (uniform over the current node\'s neighbours; descriptive, not a null), N1 vs N0' }),
  Object.freeze({ id: 'S4', text: 'one-step goal entry: share of executions from a goal-adjacent node that enter the goal, N1 vs N0' }),
  Object.freeze({ id: 'S5', text: 'oracle dependence (descriptive): E_w[ Y_w(O0) - Y_w(N0) ]' }),
  Object.freeze({ id: 'S6', text: 'components without the map: E_w[ Y_w(N1E) - Y_w(N0) ] (episodes only), E_w[ Y_w(N1Q) - Y_w(N0) ] (Q only), E_w[ Y_w(N1E) - Y_w(N1) ]' }),
  Object.freeze({ id: 'S7', text: 'mechanism diagnostics: illegal executions, admitted non-graph candidates, goal-keyed Q entries, delivered store sizes' }),
]);
export const INSTRUMENTS = Object.freeze([
  Object.freeze({ id: 'I1', text: 'condition integrity (state P) in every session', voids: 'all' }),
  Object.freeze({ id: 'I2', text: 'zero oracle leakage: in every map-off session every oracle\'s EXECUTED count is 0 and every oracle\'s BLOCKED count is > 0 (each guard evidences itself); in O0 every executed count is > 0 and every blocked count is 0', voids: 'all' }),
  Object.freeze({ id: 'I3', text: 'store identity: N1 / N1E / N1Q start with exactly the declared components of the world\'s T export (hash-checked per component, all others empty); N0 and O0 start empty', voids: 'all' }),
  Object.freeze({ id: 'I4', text: 'pairing: one test seed and one configuration per world; T uses the world\'s training seed', voids: 'all' }),
  Object.freeze({ id: 'I5', text: 'training fidelity: T ran map-off, floor off, cold, 1,500 calls, and exported a parseable store', voids: 'all' }),
  Object.freeze({ id: 'I6', text: 'default-off neutrality, oracle-scope and call-graph audit (gate level); tree identity pinned at block level', voids: 'all' }),
  Object.freeze({ id: 'I7', text: 'store provenance: every relational entry of the world\'s T export is a lag-1 or lag-2 pair of T\'s own position sequence or a self pair of a visited node (provenance.mjs); checked before any test session', voids: 'world (excluded before its test sessions)' }),
]);
export const PROVENANCE = Object.freeze({ maxLag: 2, components: Object.freeze(['rewards', 'penalties', 'signals', 'curiosity', 'confidence', 'transitions', 'Q (pos, action)', 'episodes (consecutive nodes)']),
  why: 'lag 1 = executed moves, goal credit over recentMemory, episode replay; lag 2 = the runtime\'s lagged credit (main.js prev = agentLast, current = next)' });
export const RULES = Object.freeze({
  worldExclusion: 'any of the world\'s six sessions fails after one retry (crash, incomplete run, condition-integrity violation, oracle leakage, store-delivery mismatch), or its T export fails the store construct or provenance check (I7) before any test session',
  maxExcludedFraction: 0.10,
  stopping: 'fixed: all 360 worlds x 6 sessions = 2,160; no interim analysis, no extension, no optional stopping, no outcome-based exclusion, one frozen analysis',
  primaryOutcome: 'legal goal reaches per 1,500-call test session (a goal reset entered over a graph edge); non-graph and total resets reported separately',
  scope: 'map knowledge = the four oracle functions; local perception (the current node\'s own neighbours, recognising the goal when adjacent) and experience-derived state are retained in every cell',
  claims: 'E1 measures what the persisted experience store does without the map in the SAME world and goal it was trained on; it is not transfer, recall, planning or understanding',
  recommendation: 'a result justifies only the next design decision (LEARN-1 attribution, or retiring the cognition claims); it changes no production code',
  mapOffProcedure: 'map off removes the reachability filter, so more candidates can be admitted and every later liveRng() draw can shift; N0 and N1 run this SAME procedure with the SAME test seed, so the shift is part of the procedure both arms share, and E1 is the store effect under it',
  mapOnContrasts: 'every contrast with O0 (S5) is descriptive: it bundles the oracle terms, the removed filter and the random-stream shift; no causal attribution to any single oracle',
  residualMap: 'the store may describe the part of the graph T itself traversed (in the development worlds T executed 66-76 of 78 directed edges); I7 shows it describes nothing T did not traverse. LEARN-0 does not separate learning a map from experience from any other use of experience',
  learnsLimit: 'A LEARNS_WITHOUT_MAP outcome may reflect experience-derived graph reconstruction and path-keyed Q-values; it does not demonstrate map-free spatial reasoning, abstract route planning, or cognition.',
});

// ---- digests ----
export const decisionDigest = () => hashObject({ schema: SCHEMA, head: HEAD_COMMIT, runtime: RUNTIME, tree: TREE, guardTree: GUARD_TREE, learn0Tree: LEARN0_TREE, maps: MAPS, oracles: ORACLES,
  arms: CONFIRMATORY_ARMS, training: TRAINING, cells: CELLS, claims: CLAIMS, secondary: SECONDARY, secondaryPolicy: SECONDARY_POLICY, instruments: INSTRUMENTS, provenance: PROVENANCE,
  rules: RULES, margin: MARGIN, sizing: SIZING, level: PRIMARY_LEVEL,
  bootstrap: BOOTSTRAP, ticks: TICKS, worlds: { start: WORLD_START, n: WORLDS_N, perGoal: PER_GOAL, goals: GOALS }, accounting: SESSION_ACCOUNTING, calibration: CALIBRATION,
  configStart: CONFIG_START, hookStates: HOOK_STATES, confirmatoryState: CONFIRMATORY_STATE, classification: CLASSIFICATION, deviations: DEVIATIONS });
export const designDigest = () => hashObject({ decision: decisionDigest(), schema: SCHEMA });

/** the strongest sentence the declared rules allow */
export function interpret(s) {
  const tail = ` ${CLASSIFICATION} LEARN-0 tests the persisted store in the SAME world and goal it was trained on, with every map oracle disabled; it is not transfer, recall, planning or understanding, and it changes no production code.`;
  if (!s.valid) return `INVALID: ${s.reason || 'the block failed an integrity gate'}; no claim is interpreted.` + tail;
  const e1 = {
    LEARNS_WITHOUT_MAP: 'E1: with every map oracle disabled, the world\'s own persisted experience raises legal goal reaches by at least the margin.',
    NO_PRACTICAL_EFFECT: 'E1: with every map oracle disabled, the world\'s own persisted experience changes legal goal reaches by less than the margin in either direction.',
    EXPERIENCE_HARMS_WITHOUT_MAP: 'E1: with every map oracle disabled, the world\'s own persisted experience lowers legal goal reaches by at least the margin.',
  }[s.e1] || `E1 is ${s.e1}.`;
  const out = [e1, 'E1 is the total effect of the whole store, not the contribution of any component or mechanism; every secondary estimate (components included) is exploratory and supports no claim.'];
  if (s.e1 === 'LEARNS_WITHOUT_MAP') out.push(RULES.learnsLimit);
  if (s.nonGraphShift) out.push(`Non-graph resets change by ${s.nonGraphShift} (reported separately; never counted as legal reaches).`);
  return out.join(' ') + tail;
}

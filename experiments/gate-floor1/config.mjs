// ==========================================================
// GATE-FLOOR-1 — goal-entry floor test: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Not preregistered in the repository's formal sense; no registered or held-out
// seed; no production file touched.  Builds on experiments/xfer1 (session driver, seed domain, statistics) and
// experiments/xfer2 (control stores, margins, classification).
//
// QUESTION (one sentence).  XFER-2 found that the episode-store benefit is carried by familiarity of transitions INTO
// the goal (ENTRY_NR +130 reaches against COLD, within the margin of a saturated store): the runtime scores the goal-
// entering move 100 * tc with tc = min(count(u -> goal) / 5, 1) read from episodes only, so an agent with an empty
// store gives that move NO pull.  Does a guarded, default-off floor on exactly that term, with no stored episode,
// reproduce the benefit of episodic persistence?
//
// THE INTERVENTION (derived, not tuned).
//   * Scope   the goal-entering candidate only (candidate == active goal), and only when it is a legal graph edge from
//             the current node (structureMap has it AND the world's edge oracle confirms it).  Every other candidate,
//             every other term, the environment's reliability draw, stored experience and replay are untouched.
//   * Value   tc is raised to TC_FLOOR = 1, i.e. goalGradientBoost = 100 for that candidate.  This is not a free
//             parameter: (i) 100 is the value the same block of main.js assigns to "the candidate IS the goal"
//             immediately before FIX 3 overwrites it with 100 * tc ("the final step ... must dominate even a heavily
//             farmed local loop"); FIX 3 was written to deny pull to NON-GRAPH shortcuts (forest -> eat), which the
//             conformed runtime's N1 mask removes by construction; (ii) tc = 1 is exactly the state XFER-2's ENTRY_NR
//             arm created and measured (count 5 on every goal-entering edge), the only goal-entry level for which
//             outcome evidence exists.  Any smaller floor would be a value chosen without evidence; none is tested.
//   * Form    one guarded line inserted after FIX 3's assignment (transform.mjs); off == the conformed runtime.
//
// KNOWN RESIDUAL (declared, not removed).  ENTRY_NR's episodes are also read by two other terms the floor does not
// replicate: trajectoryIntegrity * 40 on the (u, goal) pair (5 matching episodes -> +40) and the schema bonus.  A
// shortfall of COLD_FLOOR against ENTRY_NR is therefore interpretable as "the goal-entry gradient is not all of it",
// not as a failure of the gate hypothesis; see `interpret`.
// ==========================================================
import {
  SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
} from '../xfer1/config.mjs';
import { MARGIN as XFER2_MARGIN, classifyShortfall, ENTRY_COUNT, NR_QUALITY } from '../xfer2/config.mjs';

export { SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR, ENTRY_COUNT, NR_QUALITY, classifyShortfall };

export const SCHEMA = 'gatefloor1/1';
export const STUDY = 'GATE-FLOOR-1';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

// ---- the intervention ----
export const TC_FLOOR = 1;                       // tc raised to 1  <=>  goalGradientBoost = 100 for a legal goal-entering candidate
export const FLOOR_BASE_VALUE = 100;             // the block's own "candidate IS the goal" assignment, overwritten by FIX 3
export const TREE = Object.freeze({              // the derived tree is pinned by content, not by name
  parentMainSha256: '10c6ed9c96f22fb2f0a13339732c79dd6c3bd94280972fd4f476eca458935a01',   // conformed main.js (h1r MANIFEST)
  floorMainSha256: '7e70e0f1b21e00277ae846015432e857db4d52e84ba5fdbc054f4a6610eb215c',
});

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1 (worlds 0..79) and XFER-2 (80..231): the same ascending accepted stream
// from CONFIG_START, so no configuration and no agent seed (SEED_BASE + 2 w, + 1) of an earlier study is reused.
// Goals cycle 8, 12, 16, 19 by index; 160 worlds = 40 per goal.  One block, run once, in full.
//   Size: the largest paired SD among arm pairs in XFER-2 block D (128 worlds; an experiment of the same instrument and
//   task) is 111.1 reaches (median 98); classifying a shortfall against DELTA = 25 with a 95% interval and 80% power
//   needs n >= (2.8 * SD / DELTA)^2 = 155 at SD 111, so 160.  verify_gatefloor1.mjs recomputes this from the XFER-2 records.
export const WORLD_START = 232;
export const WORLDS_N = 160;
export const WORLDS_TOTAL = WORLD_START + WORLDS_N;
export const BLOCKS = Object.freeze({ F: Object.freeze({ lo: WORLD_START, hi: WORLD_START + WORLDS_N - 1 }) });
export const blockOf = (w) => (w >= BLOCKS.F.lo && w <= BLOCKS.F.hi ? 'F' : null);
export const GOALS = Object.freeze([8, 12, 16, 19]);

// ---- arms ----
//   store: which episode store the test session starts with (xfer2 semantics); floor: whether the guarded line is on.
//   Every arm runs on the SAME derived tree; only the global `__GATEFLOOR1__` (and the delivered store) differ.
const arm = (store, floor, role) => Object.freeze({ store, floor, role });
export const ARMS = Object.freeze({
  COLD:        arm('none',     false, 'primary'),     // pristine cold start (global absent)
  COLD_FLOOR:  arm('none',     true,  'primary'),     // no stored episode; goal-entry floor on
  REAL:        arm('own-real', false, 'primary'),     // XFER-1's ONLY_episodes condition (the persistence to be reproduced)
  ENTRY_NR:    arm('entry-nr', false, 'primary'),     // XFER-2's goal-entry-only store: 5 x [u, goal] per goal neighbour (the mechanism ceiling)
  REAL_FLOOR:  arm('own-real', true,  'secondary'),   // compatibility: the floor on top of the real store (descriptive only)
});
export const ARM_ORDER = Object.freeze(Object.keys(ARMS));
export const PRIMARY_ARMS = Object.freeze(ARM_ORDER.filter(a => ARMS[a].role === 'primary'));

// ---- estimand, margins, classification (all on E1 = goal reaches per 1,500-call test session) ----
// Same absolute margins as XFER-2 (derived from XFER-1 only, before any XFER-2 outcome); no ratio decides anything.
//   DELTA        = 25   NON_INFERIOR iff the upper bound of the shortfall (reference - arm) < 25; EXCEEDS iff <= -25;
//                       FALLS_SHORT iff the lower bound >= 25; otherwise INCONCLUSIVE.  (not proof of equivalence from a
//                       non-significant difference: the interval, not the p-value, is classified)
//   MIN_BENEFIT  = 50   the lower bound of an arm's benefit over COLD must reach this to be called an improvement.
//   MAX_ATTEMPT_DROP = 0.05  per-attempt success may not fall by more than this (upper 'harm' tier for reliability).
//                       Basis: the whole spread of attempt success among benefiting arms in XFER-2 block D was 0.056
//                       (REAL .760, SAT .704); a fall larger than that spread is not incidental.
export const MARGIN = Object.freeze({ delta: XFER2_MARGIN.delta, minBenefit: XFER2_MARGIN.minRealBenefit, maxAttemptDrop: 0.05 });

// ---- contrasts reported: [name, treatment, reference]; shortfall contrasts are reference - treatment ----
export const CONTRASTS = Object.freeze([
  Object.freeze(['capability: floor with no episodes vs cold', 'COLD_FLOOR', 'COLD']),
  Object.freeze(['reproduction: real episodes vs cold', 'REAL', 'COLD']),
  Object.freeze(['mechanism ceiling: goal-entry episodes vs cold', 'ENTRY_NR', 'COLD']),
  Object.freeze(['floor vs real episodes', 'COLD_FLOOR', 'REAL']),
  Object.freeze(['floor vs goal-entry episodes', 'COLD_FLOOR', 'ENTRY_NR']),
  Object.freeze(['compatibility: floor on top of real vs real', 'REAL_FLOOR', 'REAL']),
  Object.freeze(['compatibility: floor on top of real vs cold', 'REAL_FLOOR', 'COLD']),
]);

// ---- declared claims (evaluated by analyze.mjs; each is a rule on declared intervals, never on a p-value) ----
//   C1 capability      benefit(COLD_FLOOR) lower bound >= MIN_BENEFIT
//   C2 reproduces      shortfall(REAL - COLD_FLOOR) is NON_INFERIOR or EXCEEDS         (requires instrument I1)
//   C3 approaches      shortfall(ENTRY_NR - COLD_FLOOR) is NON_INFERIOR or EXCEEDS     (requires instrument I2)
//   C4 no harm         NO goal group's 95% interval of (COLD_FLOOR - COLD) lies entirely below 0, and the lower bound of
//                      the attempt-success difference is >= -MAX_ATTEMPT_DROP.  Unadjusted per-group intervals are
//                      used deliberately: a safety claim should be easier to fail, not harder.
//   C5 audit           every COLD_FLOOR and REAL_FLOOR session: no illegal move, every attempt is a graph edge, every
//                      goal reach follows a successful goal-entering draw, the floor was only ever applied to a legal
//                      goal-entering candidate, and the floor never lowered a score
// Instruments:  I1 lower bound of benefit(REAL) >= MIN_BENEFIT (XFER-1/XFER-2 reproduced in these worlds);
//               I2 lower bound of benefit(ENTRY_NR) >= MIN_BENEFIT.  An uninterpretable instrument voids the claim
//               that uses it (reported as NOT_INTERPRETABLE_LOW_BENEFIT), not the other claims.
export const CLAIMS = Object.freeze([
  Object.freeze({ id: 'C1', text: 'The floor with no stored episodes improves goal reaches over cold by at least MIN_BENEFIT', via: 'benefitLower(COLD_FLOOR) >= minBenefit' }),
  Object.freeze({ id: 'C2', text: 'The floor reproduces the benefit of episodic persistence: COLD_FLOOR is NON_INFERIOR or EXCEEDS REAL', via: 'shortfall(REAL - COLD_FLOOR)' }),
  Object.freeze({ id: 'C3', text: 'The floor approaches the goal-entry mechanism ceiling: COLD_FLOOR is NON_INFERIOR or EXCEEDS ENTRY_NR', via: 'shortfall(ENTRY_NR - COLD_FLOOR)' }),
  Object.freeze({ id: 'C4', text: 'No goal group is harmed and per-attempt success does not fall by more than MAX_ATTEMPT_DROP', via: 'group benefit intervals; attemptSuccess diff' }),
  Object.freeze({ id: 'C5', text: 'The no-shortcut audit passes in every session that ran the floor', via: 'per-session audit' }),
]);
// predictions declared before any outcome (the author's expectations; not revised after)
export const PREDICTIONS = Object.freeze([
  Object.freeze({ id: 'F1', claim: 'C1', predicted: true, text: 'C1 holds (XFER-2: the goal-entry term alone gave +130 with episodes)' }),
  Object.freeze({ id: 'F2', claim: 'C2', predicted: true, text: 'C2 holds (REAL +88 is below ENTRY_NR +130; the floor is expected to be at least REAL)' }),
  Object.freeze({ id: 'F3', claim: 'C3', predicted: true, text: 'C3 holds, with the declared residual (trajectoryIntegrity +40 on the pair) making a modest shortfall possible' }),
  Object.freeze({ id: 'F4', claim: 'C4', predicted: true, text: 'no goal group is harmed' }),
  Object.freeze({ id: 'F5', claim: 'C5', predicted: true, text: 'the audit passes (the floor cannot create a move; N1 admits graph neighbours only)' }),
]);

// ---- exclusions, invalid runs and stopping (declared) ----
export const RULES = Object.freeze({
  worldExclusion: 'a control fails its construct check, or any session of the world fails after one retry, or a delivered store does not hash to the expected store',
  maxExcludedFraction: 0.10,           // more than 10% of the worlds excluded => the block is reported INVALID
  noOptionalStopping: true,            // the block is run once, in full
  noOutcomeBasedExclusion: true,
  noRevisionAfterOutcomes: true,
  lowBaselineBenefit: 'if the lower bound of benefit(REAL) (I1) or benefit(ENTRY_NR) (I2) is below MIN_BENEFIT, the claim that uses that arm as reference is NOT_INTERPRETABLE_LOW_BENEFIT (DID_NOT_REPRODUCE when the bound is <= 0)',
});

// ---- descriptive diagnostics (added after the independent review; NOT confirmatory, no threshold, no effect on C1-C5) ----
// FINAL-HOP RETRY DIAGNOSTIC.  The review (PASS WITH CLAIM LIMITS) asked that the audit be secured against a retry-farming
// reading: does the benefit come with disproportionate retrying of the last hop?  Definition (finalhop.mjs; the runtime's
// own event semantics, nothing inferred from repeated node visits):
//   final-hop attempt   an environment draw on a legal graph edge `u -> goal` into the ACTIVE goal
//   failed attempt      such a draw with ok = 0 (a slip: the agent stays at u)
//   successful traversal such a draw with ok = 1 (exactly a goal reach)
//   failures per success  failures / successes, POOLED over sessions (ratio of sums); sessions with zero successes are
//                         reported (count, by arm and goal) and stay in the totals - never dropped
// Reported by arm and by goal group, with a paired-by-world bootstrap interval for the declared comparisons.
export const DIAGNOSTICS = Object.freeze({
  finalHop: Object.freeze({
    status: 'DESCRIPTIVE_NOT_CONFIRMATORY',
    definition: 'final-hop attempt = environment draw on a legal graph edge into the active goal; failed = ok 0 (slip); successful = ok 1 (a goal reach); failuresPerSuccess = pooled failures / pooled successes; zero-success sessions reported, not dropped',
    comparisons: Object.freeze([
      Object.freeze(['COLD_FLOOR', 'COLD']), Object.freeze(['COLD_FLOOR', 'ENTRY_NR']), Object.freeze(['COLD_FLOOR', 'REAL']),
      Object.freeze(['ENTRY_NR', 'COLD']), Object.freeze(['REAL', 'COLD']), Object.freeze(['REAL_FLOOR', 'REAL']),
    ]),
    thresholds: null,                       // none: the interval's direction relative to zero is a reading, not a rule
    wording: 'if COLD_FLOOR shows a HIGHER failures-per-success than COLD, ENTRY_NR or REAL while it benefits, the benefit is not to be described as demonstrated routing capability',
  }),
});

// ---- design digest: binds every result to the declared design ----
// decisionDigest = the digest the independent reviewer was shown (arms, claims, margins, rules, worlds, seeds, tree pins).
// designDigest additionally binds the descriptive diagnostics; the gate asserts that decisionDigest is UNCHANGED by the
// correction, i.e. that no decision criterion moved.
export const REVIEWED_DECISION_DIGEST = 'a2d5adc3cc9d451edcbee83b312e8191137b32cdaf9c7247a4bd5081cb27312a';
export const decisionDigest = () => hashObject({ schema: SCHEMA, arms: ARMS, contrasts: CONTRASTS, claims: CLAIMS, predictions: PREDICTIONS, rules: RULES, margin: MARGIN,
  tcFloor: TC_FLOOR, floorBase: FLOOR_BASE_VALUE, tree: TREE, entryCount: ENTRY_COUNT, nrQuality: NR_QUALITY, blocks: BLOCKS, ticks: TICKS, bootstrap: BOOTSTRAP,
  worlds: { start: WORLD_START, n: WORLDS_N, goals: GOALS }, configStart: CONFIG_START });
export const designDigest = () => hashObject({ decision: decisionDigest(), diagnostics: DIAGNOSTICS });

/**
 * The strongest sentence the declared rules allow.  Inputs are the evaluated claim states:
 *   i1, i2           'OK' | 'NOT_INTERPRETABLE_LOW_BENEFIT' | 'DID_NOT_REPRODUCE'
 *   c1               true | false;  benefitFloorLower: lower bound of benefit(COLD_FLOOR) (number)
 *   realClass, entryClass   classification of the shortfall of REAL / ENTRY_NR against COLD_FLOOR
 *   harm             true when C4 fails;  audit: true when C5 holds
 */
export function interpret({ i1, i2, c1, benefitFloorLower, realClass, entryClass, harm, audit }) {
  if (!audit) return 'AUDIT FAILED: the floor produced a move or score outside its declared scope; no capability sentence is allowed.';
  if (harm) return 'HARM: a goal group or per-attempt success fell below the declared safety rule; the floor is not recommended regardless of its average benefit.';
  const out = [];
  if (!c1) {
    if (benefitFloorLower > 0) out.push('The floor improves goal reaches over cold but not by the declared practical margin (lower bound below MIN_BENEFIT).');
    else out.push('The floor with no stored episodes does not improve goal reaches over cold: the goal-entry scoring term alone is NOT sufficient to reproduce the episode benefit on this runtime; the residual lies in what the stored episodes also supply (trajectory integrity, schema bonus) or in dynamics the floor does not create.');
    if (i2 === 'OK') out.push('Because the instrument reproduced (ENTRY_NR benefits), this is evidence against sufficiency of the scoring term, not an instrument failure.');
    return out.join(' ');
  }
  out.push('The guarded goal-entry floor with no stored episode improves goal reaches over cold by at least the declared margin.');
  if (i1 === 'OK') {
    if (realClass === 'NON_INFERIOR' || realClass === 'EXCEEDS') out.push(`It ${realClass === 'EXCEEDS' ? 'exceeds' : 'is non-inferior to'} restoring the real episode store within the margin.`);
    else if (realClass === 'FALLS_SHORT') out.push('It falls short of restoring the real episode store by at least the margin.');
    else out.push('Its comparison with the real episode store is inconclusive at the declared margin.');
  } else out.push(`The real-store comparison is not interpreted (${i1}).`);
  if (i2 === 'OK') {
    if (entryClass === 'NON_INFERIOR' || entryClass === 'EXCEEDS') out.push(`It ${entryClass === 'EXCEEDS' ? 'exceeds' : 'is non-inferior to'} the goal-entry-episodes ceiling within the margin.`);
    else if (entryClass === 'FALLS_SHORT') out.push('It falls short of the goal-entry-episodes ceiling by at least the margin: the goal-entry gradient is not all the stored episodes supply (declared residual: trajectory integrity, schema bonus).');
    else out.push('Its comparison with the goal-entry-episodes ceiling is inconclusive at the declared margin.');
  } else out.push(`The goal-entry-ceiling comparison is not interpreted (${i2}).`);
  return out.join(' ');
}

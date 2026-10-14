// ==========================================================
// XFER-2 — mechanism-resolution design: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Not preregistered in the repository's formal sense, no registered or held-out
// seed, no production file touched.  Builds on experiments/xfer1 (same harness, session driver, seed domain); only the
// episode store delivered to the test session differs between arms.
//
// PRIMARY QUESTION.  XFER-1 found that restoring the real episode store roughly doubles goal reaches.  Is that benefit
// removal of a cold-start handicap (episodic adjacency gates the goal gradient: non-goal moves are multiplied by
// 0.10 + 0.90*tc and the goal-entering move is 100*tc, so an agent with no familiar edges has its goal pull attenuated),
// and/or replay learning from the stored episodes, or does the real, goal-terminated experience carry information that
// generic exposure of the same size does not?  The answer decides whether to improve episodic memory, correct cold-start
// scoring, or look elsewhere.
//
// Three runtime facts the design rests on (read from the code; behaviourally verified in verify_xfer2.mjs):
//   (F1) decision-time reads of the store (adjacency count, trajectory integrity) never consult `quality`;
//   (F2) `quality` is consumed by ONE decision path: replay eligibility (quality >= 0.5, simple path, graph edges).  A
//        replayed copy has its quality RECOMPUTED by _sealBuffer, so the stored value is a binary switch, not a dose;
//   (F3) a replay tick draws from the cognitive stream only when an eligible episode exists.  Disabling replay of the
//        delivered episodes therefore also shifts the cognitive stream by one draw per replay tick before the session's
//        own first (eligible) episode exists.  This is exchangeable noise, not a systematic effect, and is disclosed.
// ==========================================================
import {
  COMPONENTS, SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP,
  canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
} from '../xfer1/config.mjs';

export { COMPONENTS, SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR };

export const SCHEMA = 'xfer2/2';
export const STUDY = 'XFER-2';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1's worlds 0..79 (the same ascending stream from CONFIG_START), so neither
// XFER-1's configurations nor its agent seeds (SEED_BASE + 2 w) are reused.  Goals cycle 8, 12, 16, 19 by index.
//   block C : instrument check and exploratory look (24 worlds, 6 per goal)
//   block D : replication under predictions frozen BEFORE block C ran (128 worlds, 32 per goal).  Sized by power: in
//             XFER-1 (a different experiment) the paired difference between two store-delivering arms has SD 72..104
//             (median 78, 80th percentile 101), and classifying a shortfall against DELTA = 25 with a 95% interval and 80%
//             power needs n >= (2.8 * SD / DELTA)^2 = 128 worlds at SD 101.  48 worlds would have been underpowered
//             (interval half-width about 28 > DELTA); verify_xfer2.mjs recomputes this requirement from XFER-1 records.
export const WORLDS_TOTAL = 232;
export const BLOCKS = Object.freeze({ C: Object.freeze({ lo: 80, hi: 103 }), D: Object.freeze({ lo: 104, hi: 231 }) });
export const blockOf = (w) => (w >= BLOCKS.C.lo && w <= BLOCKS.C.hi ? 'C' : w >= BLOCKS.D.lo && w <= BLOCKS.D.hi ? 'D' : null);

// ---- pooled real-store constants (measured on the 5,952 real XFER-1 training episodes; outcome-free) ----
export const REAL_POOL = Object.freeze({
  episodes: 5952,
  simplePathEpisodes: 4697,          // replay-eligible: simple path, graph edges, quality >= 0.5
  simpleLengthHistogram: Object.freeze({ 3: 767, 4: 769, 5: 790, 6: 2371 }),
  loopEpisodes: 1255,                // contain a repeated node (91% an immediate A-B-A reversal); replay-ineligible
  loopLengthHistogram: Object.freeze({ 4: 31, 5: 155, 6: 1069 }),
  simpleQualityMedian: 0.8545,
  loopQualityMedian: 0.6902,
  maxEpisodesInOneStore: 182,
});
export const NR_QUALITY = 0.49;      // < 0.5: replay-ineligible (F2); leaves every decision-time read unchanged (F1)

// the saturated, world-independent exposure store (an UPPER BOUND of generic exposure; deliberately not count-matched)
export const SAT = Object.freeze({
  count: REAL_POOL.maxEpisodesInOneStore,
  minDirectedEdgeCount: 5,           // tc = min(count / 5, 1): every allowed directed edge saturates
  simpleFraction: REAL_POOL.simplePathEpisodes / REAL_POOL.episodes,
  seed: 20261015,
});
export const GEN_SEED = 20261016;    // + world index: the matched generic store of a world
export const ENTRY_COUNT = 5;        // episodes per goal-entering directed edge (tc saturates at 5)

// ---- arms ----
//   Every arm delivers ONLY an episode store (identity fields absent, procedural stores empty at the first agent call).
//   `reads` = what the arm lets decision-time scoring see; `replay` = whether the delivered episodes can be replayed.
const arm = (kind, role, extra = {}) => Object.freeze({ kind, role, ...extra });
export const ARMS = Object.freeze({
  COLD:            arm('cold', 'primary'),
  REAL:            arm('own-real', 'primary'),                   // the XFER-1 `ONLY_episodes` condition, re-run
  REAL_NR:         arm('own-real-noreplay', 'primary'),          // same episodes, quality 0.49: reads without replay learning
  GEN_NR:          arm('generic-matched-noreplay', 'primary'),   // SAME count, lengths, loop mix and total transitions as REAL; goal-free balanced edges
  SAT_NR:          arm('saturated-noreplay', 'primary'),         // UPPER BOUND of generic exposure: every directed edge >= 5, world-independent
  SAT_NOENTRY_NR:  arm('saturated-noentry-noreplay', 'secondary'), // SAT without any goal-entering transition (non-goal gate only)
  ENTRY_NR:        arm('entry-only-noreplay', 'secondary'),      // only goal-entering transitions, 5 each (goal-entry term only)
  REV_NR:          arm('own-reversed-noreplay', 'secondary'),    // real paths reversed: same exposure and structure, direction inverted
});
export const ARM_ORDER = Object.freeze(Object.keys(ARMS));
export const PRIMARY_ARMS = Object.freeze(ARM_ORDER.filter(a => ARMS[a].role === 'primary'));

// ---- estimand and classification (all on E1 = goal reaches per test session) ----
// Primary quantity: the per-world paired difference in goal reaches between two arms (absolute, no ratio).
//   benefit(X)   = mean_w (E1[X] - E1[COLD])
//   shortfall    = mean_w (E1[reference] - E1[X])             (reference: REAL or REAL_NR, as declared per contrast)
// Classification of X against a reference uses fixed absolute margins declared here, from XFER-1 (a different
// experiment; XFER-1 benefit(REAL) = +98 reaches, 95% interval [78, 119]) and BEFORE any XFER-2 outcome:
//   DELTA          = 25 reaches (about a quarter of the XFER-1 benefit): X is NON_INFERIOR to the reference if the upper
//                    bound of the shortfall interval is < DELTA; it FALLS_SHORT if the lower bound is >= DELTA; EXCEEDS if
//                    the upper bound is <= -DELTA; otherwise INCONCLUSIVE.
//   MIN_REAL_BENEFIT = 50 reaches (2 * DELTA, and below XFER-1's lower bound 78): the lower bound of benefit(REAL) must be
//                    at least this for any classification to be interpreted, so that COLD itself (benefit 0) is
//                    unambiguously classed FALLS_SHORT against REAL.  Below it the block is NOT_INTERPRETABLE (when the
//                    lower bound is > 0) or DID_NOT_REPRODUCE (when it is <= 0).  No ratio is used for any decision.
export const ESTIMAND = Object.freeze({ endpoint: 'goalReaches', reference: 'COLD', real: 'REAL' });
export const MARGIN = Object.freeze({ delta: 25, minRealBenefit: 50 });
export const classifyShortfall = (ci) => {
  if (!ci || ci.lower === null || ci.upper === null) return 'UNDEFINED';
  if (ci.upper < MARGIN.delta) return ci.upper <= -MARGIN.delta ? 'EXCEEDS' : 'NON_INFERIOR';
  if (ci.lower >= MARGIN.delta) return 'FALLS_SHORT';
  return 'INCONCLUSIVE';
};

// ---- contrasts reported: [name, treatment, reference]; shortfall contrasts are reference - treatment ----
export const CONTRASTS = Object.freeze([
  Object.freeze(['reproduction: real episodes vs cold', 'REAL', 'COLD']),
  Object.freeze(['decision-time reads alone (no replay): real vs cold', 'REAL_NR', 'COLD']),
  Object.freeze(['replay learning of the delivered episodes: real vs real-no-replay', 'REAL', 'REAL_NR']),
  Object.freeze(['matched generic exposure vs cold', 'GEN_NR', 'COLD']),
  Object.freeze(['placement at matched budget: real-no-replay vs matched generic', 'REAL_NR', 'GEN_NR']),
  Object.freeze(['saturated generic exposure (upper bound) vs cold', 'SAT_NR', 'COLD']),
  Object.freeze(['upper bound vs real reads: saturated vs real-no-replay', 'SAT_NR', 'REAL_NR']),
  Object.freeze(['non-goal gate only (no goal-entering edges) vs cold', 'SAT_NOENTRY_NR', 'COLD']),
  Object.freeze(['goal-entry term only vs cold', 'ENTRY_NR', 'COLD']),
  Object.freeze(['goal-entry term only vs saturated', 'ENTRY_NR', 'SAT_NR']),
  Object.freeze(['non-goal gate only vs saturated', 'SAT_NOENTRY_NR', 'SAT_NR']),
  Object.freeze(['direction of travel (reads alone): real vs reversed', 'REAL_NR', 'REV_NR']),
  Object.freeze(['reversed structure vs cold', 'REV_NR', 'COLD']),
]);

// ---- predictions, declared before any XFER-2 outcome exists (not revised after) ----
// Each is evaluated by analyze.mjs on block D (primary) and reported for block C.  `via` names the rule.
export const PREDICTIONS = Object.freeze([
  Object.freeze({ id: 'P1', text: 'REAL reproduces XFER-1: the lower bound of benefit(REAL) is >= 50 reaches', via: 'benefitLower(REAL) >= MIN_REAL_BENEFIT' }),
  Object.freeze({ id: 'P2', text: 'Replay learning of the delivered episodes is not needed: REAL_NR is NON_INFERIOR to REAL', via: 'shortfall(REAL - REAL_NR)' }),
  Object.freeze({ id: 'P3', text: 'Saturated generic exposure (the upper bound) is NON_INFERIOR or EXCEEDS REAL_NR: the cold-start handicap, not real content, is the bottleneck', via: 'shortfall(REAL_NR - SAT_NR)' }),
  Object.freeze({ id: 'P4', text: 'At matched budget the real placement matters: GEN_NR FALLS_SHORT of REAL_NR', via: 'shortfall(REAL_NR - GEN_NR)' }),
  Object.freeze({ id: 'P5', text: 'Reversing the direction of travel destroys the benefit: REV_NR FALLS_SHORT of REAL_NR', via: 'shortfall(REAL_NR - REV_NR)' }),
  Object.freeze({ id: 'P6', text: 'The goal-entry term carries the unlock: ENTRY_NR is NON_INFERIOR to SAT_NR', via: 'shortfall(SAT_NR - ENTRY_NR)' }),
]);

// ---- design digest: binds every result to the declared design ----
export const designDigest = () => hashObject({ schema: SCHEMA, arms: ARMS, contrasts: CONTRASTS, predictions: PREDICTIONS, rules: RULES, margin: MARGIN,
  sat: SAT, genSeed: GEN_SEED, entryCount: ENTRY_COUNT, nrQuality: NR_QUALITY, realPool: REAL_POOL, blocks: BLOCKS, ticks: TICKS, estimand: ESTIMAND, bootstrap: BOOTSTRAP });

// ---- exclusions, invalid runs and stopping (declared) ----
export const RULES = Object.freeze({
  // a world is excluded (whole world, all arms) only if a control fails its construct check or a session fails after one
  // retry; delivery must hash to the control builder's expected store.  Nothing is dropped for what its outcomes were.
  worldExclusion: 'a control fails its construct check, or any session of the world fails after one retry',
  maxExcludedFraction: 0.10,           // more than 10% of a block's worlds excluded => the block is reported INVALID
  noOptionalStopping: true,            // blocks C and D are each run once, in full
  noOutcomeBasedExclusion: true,
  secondarySubset: 'worlds whose real training store has >= 20 episodes (reported, never primary)',
  noRevisionAfterOutcomes: true,
});

/**
 * Decision rules (declared).  `c` = classifications of the shortfall contrasts; `valid` = P1-level reproduction.
 * The returned string is the strongest sentence that may be written.
 */
export function interpret({ status, satVsRealNR, genVsRealNR, realVsRealNR, entryVsSat, noentryVsSat }) {
  if (status !== 'OK') return `${status}: no mechanism sentence is allowed.`;
  const out = [];
  if (realVsRealNR === 'FALLS_SHORT') out.push('Replay learning of the delivered real episodes contributes (REAL exceeds REAL_NR by at least the margin); investigate replay.');
  if (satVsRealNR === 'NON_INFERIOR' || satVsRealNR === 'EXCEEDS') {
    out.push('A goal-free, experience-free saturated exposure reproduces or exceeds the real store\'s decision-time benefit: the benefit is removal of the cold-start goal-gradient attenuation, and correcting cold-start scoring dominates improving episodic memory.');
    if (genVsRealNR === 'FALLS_SHORT') out.push('The real placement is a cheaper way to unlock than generic exposure of the same size, but not necessary.');
    if (genVsRealNR === 'NON_INFERIOR' || genVsRealNR === 'EXCEEDS') out.push('Even generic exposure of the same size reproduces it: real content adds nothing detectable.');
    if (entryVsSat === 'NON_INFERIOR') out.push('The goal-entering term alone carries the unlock (a one-term repair candidate).');
    else if (noentryVsSat === 'NON_INFERIOR') out.push('The non-goal gate carries the unlock without the goal-entering term.');
  } else if (satVsRealNR === 'FALLS_SHORT') {
    out.push('Saturated generic exposure falls short of the real store\'s decision-time benefit: the real content carries information exposure does not; localise it (direction, goal termination, edge profile) before changing scoring.');
  } else out.push('Inconclusive: the upper-bound comparison is not resolved at the declared margin.');
  return out.join(' ');
}

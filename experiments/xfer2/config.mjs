// ==========================================================
// XFER-2 — mechanism-resolution design: declarations (data and pure helpers; no I/O)
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Not preregistered in the repository's formal sense, no registered or held-out
// seed, no production file touched.  Builds on experiments/xfer1 (the same harness, driver, seeds domain and arms
// vocabulary); only the brain contents delivered to the test session differ.
//
// PRIMARY QUESTION (one sentence).  XFER-1 found that restoring the real episode store roughly doubles goal reaches.
// Is that benefit explained by generic directed-edge exposure (episodic adjacency removes the cold-start attenuation
// of the goal gradient, main.js `goalGradientBoost *= 0.10 + 0.90 * tc`) and/or replay-driven learning from the stored
// episodes, or does the content and structure of the real, goal-terminated experience add information beyond that?
//
// Two code-level facts the design rests on (read from the runtime, verified by verify_xfer2.mjs):
//   (F1) decision-time reads of the store (adjacency count -> tc, trajectory integrity) ignore `quality`;
//   (F2) replay eligibility requires quality >= 0.5, a simple path, graph edges and a source other than replay/
//        imagination; a replayed episode runs the full procedural pipeline (Q, transitions, rewards).
// So `quality` is a switch that removes replay learning while leaving every decision-time read of the store unchanged.
// ==========================================================
import {
  ARM_ORDER as X1_ARMS, COMPONENTS, SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP,
  canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR,
} from '../xfer1/config.mjs';

export { COMPONENTS, SEED_BASE, SEED_LIMIT, trainSeed, testSeed, TICKS, ENDPOINTS, BOOTSTRAP, canonicalJson, sha256, hashObject, seedOk, CONFIG_START, HELDOUT_FLOOR };

export const SCHEMA = 'xfer2/1';
export const STUDY = 'XFER-2';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

// ---- worlds ----
// Fresh accepted configurations beyond XFER-1's worlds 0..79 (same ascending stream from CONFIG_START), so neither the
// configurations nor the agent seeds (SEED_BASE + 2 w) used by XFER-1 are reused.  Goals cycle 8, 12, 16, 19 by index.
//   block C : instrument check and exploratory look (24 worlds, 6 per goal)
//   block D : replication under predictions that were frozen BEFORE block C ran (48 worlds, 12 per goal)
export const WORLDS_TOTAL = 152;
export const BLOCKS = Object.freeze({ C: Object.freeze({ lo: 80, hi: 103 }), D: Object.freeze({ lo: 104, hi: 151 }) });
export const blockOf = (w) => (w >= BLOCKS.C.lo && w <= BLOCKS.C.hi ? 'C' : w >= BLOCKS.D.lo && w <= BLOCKS.D.hi ? 'D' : null);

// ---- control-store constants (all measured on the 5,952 real XFER-1 training episodes; outcome-free) ----
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
export const COVER = Object.freeze({
  count: 182,                        // the largest real store observed, so the control is never smaller than a real one
  minDirectedEdgeCount: 5,           // tc = min(count / 5, 1): every directed edge saturates
  simpleFraction: REAL_POOL.simplePathEpisodes / REAL_POOL.episodes,
  seed: 20261015,
});

// ---- arms ----
//   kind says how the delivered episode store is made; every arm delivers ONLY the episodes component
//   (identity fields absent, procedural stores empty at the first agent call), so arms differ in the store alone.
const arm = (kind, role, extra = {}) => Object.freeze({ kind, role, ...extra });
export const ARMS = Object.freeze({
  COLD:      arm('cold', 'primary'),
  REAL:      arm('own-real', 'primary'),                 // the XFER-1 `ONLY_episodes` condition, re-run
  REAL_NR:   arm('own-real-noreplay', 'primary'),        // same episodes, quality 0.49: no replay learning
  COVER:     arm('cover', 'primary', { replay: true }),  // goal-free, world-independent, saturated exposure
  COVER_NR:  arm('cover', 'primary', { replay: false }),
  REV_NR:    arm('own-reversed-noreplay', 'secondary'),  // real structure, direction of travel reversed
  DONOR_SG:  arm('donor-samegoal', 'secondary'),         // real foreign experience, same goal (as XFER-1 SHAM_EPIS)
  DONOR_XG:  arm('donor-othergoal', 'secondary'),        // real foreign experience, a different goal
});
export const ARM_ORDER = Object.freeze(Object.keys(ARMS));
export const PRIMARY_ARMS = Object.freeze(ARM_ORDER.filter(a => ARMS[a].role === 'primary'));

// ---- estimand and classification (all on E1 = goal reaches per test session) ----
//   benefit(X) = mean over worlds of  E1[X] - E1[COLD]          (paired by world)
//   R(X)       = benefit(X) / benefit(REAL)                      (share of the real-episode benefit reproduced by X)
// Validity prerequisite: benefit(REAL) must be > 0 with the bootstrap interval excluding 0; otherwise XFER-2 did not
// reproduce XFER-1 and no R is interpreted.
export const ESTIMAND = Object.freeze({ endpoint: 'goalReaches', reference: 'COLD', real: 'REAL' });
export const BINS = Object.freeze({ reproduces: 0.80, partial: 0.40 });   // R >= .80 reproduces; .40 <= R < .80 partial; R < .40 does not
export const classify = (r, ci) => {
  const bin = (x) => (x >= BINS.reproduces ? 'REPRODUCES' : x >= BINS.partial ? 'PARTIAL' : 'DOES_NOT_REPRODUCE');
  if (r === null || ci === null) return 'UNDEFINED';
  const b = bin(r), lo = bin(ci.lower), hi = bin(ci.upper);
  return b === lo && b === hi ? b : `${b}_AMBIGUOUS`;
};

// ---- contrasts reported (treatment, reference) ----
export const CONTRASTS = Object.freeze([
  Object.freeze(['reproduction: real episodes vs cold', 'REAL', 'COLD']),
  Object.freeze(['replay-learning share: real vs real without replay', 'REAL', 'REAL_NR']),
  Object.freeze(['decision-time reads alone: real without replay vs cold', 'REAL_NR', 'COLD']),
  Object.freeze(['generic exposure, with replay: cover vs cold', 'COVER', 'COLD']),
  Object.freeze(['generic exposure, reads alone: cover without replay vs cold', 'COVER_NR', 'COLD']),
  Object.freeze(['real vs generic exposure (reads alone)', 'REAL_NR', 'COVER_NR']),
  Object.freeze(['real vs generic exposure (with replay)', 'REAL', 'COVER']),
  Object.freeze(['replay of goal-free walks: cover vs cover without replay', 'COVER', 'COVER_NR']),
  Object.freeze(['direction of travel (reads alone): real vs reversed', 'REAL_NR', 'REV_NR']),
  Object.freeze(['reversed structure vs cold', 'REV_NR', 'COLD']),
  Object.freeze(['foreign experience, same goal vs cold', 'DONOR_SG', 'COLD']),
  Object.freeze(['foreign experience, other goal vs cold', 'DONOR_XG', 'COLD']),
  Object.freeze(['goal specificity: same-goal donor vs other-goal donor', 'DONOR_SG', 'DONOR_XG']),
  Object.freeze(['world specificity: own vs same-goal donor', 'REAL', 'DONOR_SG']),
]);

// ---- predictions, declared before any XFER-2 outcome exists ----
// `test` is evaluated by analyze.mjs on block D (primary) and block C (reported); prediction status is PASS/FAIL, with no
// revision.  R(.) is the share defined above.
export const PREDICTIONS = Object.freeze([
  Object.freeze({ id: 'P1', text: 'REAL reproduces XFER-1: benefit(REAL) > 0 with the bootstrap interval excluding 0', test: 'benefit(REAL).lower > 0' }),
  Object.freeze({ id: 'P2', text: 'Replay learning is not needed: R(REAL_NR) >= 0.70', test: 'R(REAL_NR) >= 0.70' }),
  Object.freeze({ id: 'P3', text: 'Generic exposure at decision time suffices: R(COVER_NR) >= 0.70', test: 'R(COVER_NR) >= 0.70' }),
  Object.freeze({ id: 'P4', text: 'Reversing the direction of travel removes the benefit: R(REV_NR) < 0.30', test: 'R(REV_NR) < 0.30' }),
  Object.freeze({ id: 'P5', text: 'Replaying goal-free walks does not help: benefit(COVER) < benefit(COVER_NR)', test: 'mean(COVER - COVER_NR) < 0' }),
  Object.freeze({ id: 'P6', text: 'The goal matters for foreign experience: mean(DONOR_SG - DONOR_XG) > 0', test: 'mean(DONOR_SG - DONOR_XG) > 0' }),
]);

// ---- design digest: binds every result to the declared design (arms, contrasts, predictions, rules, constants) ----
export const designDigest = () => hashObject({ schema: SCHEMA, arms: ARMS, contrasts: CONTRASTS, predictions: PREDICTIONS, rules: RULES, bins: BINS,
  cover: COVER, nrQuality: NR_QUALITY, realPool: REAL_POOL, blocks: BLOCKS, ticks: TICKS, estimand: ESTIMAND, bootstrap: BOOTSTRAP });

// ---- exclusions, invalid runs and stopping (declared) ----
export const RULES = Object.freeze({
  // a world is analysed only if every arm of it completed without crash or instrument fault and every delivered store
  // hashes to the control builder's expected store (exact delivery).  Otherwise the WHOLE world is excluded and listed.
  worldExclusion: 'any arm of the world invalid',
  maxExcludedFraction: 0.10,           // more than 10% of a block's worlds excluded => the block is reported INVALID
  noOptionalStopping: true,            // block C and block D are each run once, in full
  noOutcomeBasedExclusion: true,       // no world is dropped for what its outcomes were
  secondaryAnalysisSubset: 'worlds whose real training store has >= 20 episodes (declared; reported, never primary)',
  noRevisionAfterOutcomes: true,
});

/**
 * Decision rules (declared).  Inputs: classification of R for COVER_NR / COVER / REAL_NR / REV_NR, validity of P1.
 * Returned strings are the sentence that may be written; nothing stronger may be claimed.
 */
export function interpret({ valid, covNR, cov, realNR, revNR }) {
  if (!valid) return 'INVALID: XFER-2 did not reproduce the XFER-1 episode benefit; no mechanism claim is made.';
  const covers = (c) => typeof c === 'string' && c === 'REPRODUCES';
  const lacks = (c) => typeof c === 'string' && c === 'DOES_NOT_REPRODUCE';
  // 1. generic, goal-free edge exposure at decision time is enough
  if (covers(covNR)) return 'Generic edge exposure at decision time reproduces the benefit without any real experience: the benefit is explained by removal of the cold-start goal-gradient attenuation; investigate the cold-start scoring mechanism before claiming learned knowledge.';
  // 2. generic exposure is not enough, but the real store\'s decision-time content is
  if (lacks(covNR) && covers(realNR)) return 'Generic exposure does not reproduce the benefit but the real episodes\' decision-time content does: real structure carries information that exposure does not; localise it (direction, goal-termination, edge profile).';
  // 3. neither decision-time store reproduces it: the benefit needs replay learning from real episodes
  if (lacks(covNR) && lacks(realNR)) return 'Neither generic exposure nor the real store\'s decision-time reads reproduce the benefit: it depends on replay learning from real goal-terminated episodes.';
  return 'Inconclusive or mixed: report the classifications and identify the smallest follow-up that separates the remaining explanations.';
}

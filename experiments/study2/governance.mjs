// ==========================================================
// STUDY-2 SEED AND RUN-COUNT GOVERNANCE — pure, static-auditable
// ==========================================================
// Governing text: research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md §R, §S, §T, §U.
//
// What this module decides, and from what:
//   * whether a Director registration is admissible — from the registration and the typed seed registry only;
//   * which configuration seeds are requested, in what order — a strictly ascending walk from the registered
//     block's start, one configuration index per slot (ERR-07 §4 stream discipline, as env.generateAccepted);
//   * whether a requested configuration is accepted — ONLY the frozen environment predicate `cfg.accepted`
//     (R1–R5, G11; env.js). The rejection record lists which of those booleans failed, nothing else.
//
// What it never reads: p, pPhase1/pPhase2, the expected-cost oracle, any policy, any run output, any Study-2
// result. It imports nothing but the typed registry. The walk cannot leave the registered block: it throws
// RANGE_EXHAUSTED before a seed above `hi` could be requested, and the block is never extended.
// ==========================================================
import { config, configSeed, trajectory, trajectorySeed } from '../registry/typed.js';

// Frozen design constants (§R, §S, §K). A registration must restate them exactly; it cannot change them.
export const DESIGN = Object.freeze({
  agentSeed: 20260819000,                 // §R: existing frozen protocol constant, reused, not generated
  arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: 3000,
  primaryWindowMaxTau: 1500,              // §K: decision events with tau <= 1500
  goals: Object.freeze([8, 12, 16, 19]),  // §R: env.js GOALS, goal = GOALS[configIndex % 4]
  productionBaselineCommit: 'a066d47696b1502720f627855c8549f4d2898cd5',
  designBaselineCommit: 'd1949f91601683ef2e955f8b766c2e656ffc8047',
  readinessClosureCommit: 'cfadedd9a4726142486744f9c11dc735a03fedc0',
});

// §R: development fixtures carry no confirmatory weight and are never a Study-2 seed.
export const DEV_FIXTURES = Object.freeze([[896066, 0], [896066, 1], [896238, 2], [896329, 3]].map(Object.freeze));
const DEV_SEEDS = new Set(DEV_FIXTURES.map(([s]) => s));

// The closed set of booleans that constitute acceptance (env.js makeConfig: cfg.accepted).
export const ACCEPTANCE_CHECKS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5', 'G11']);

export const REGISTRATION_FIELDS = Object.freeze(['schema', 'authorization', 'seedBlock', 'runCount',
  'agentSeed', 'arm', 'envMode', 'creditMode', 'pin', 'tickUnit', 'ticks', 'primaryWindowMaxTau',
  'trajectoryUse', 'productionBaselineCommit', 'driverManifestSha256']);

export class Study2GovernanceError extends Error {
  constructor(code, detail) { super(`${code}: ${detail}`); this.name = 'Study2GovernanceError'; this.code = code; }
}
const refuse = (code, detail) => { throw new Study2GovernanceError(code, detail); };

export const goalOf = (configIndex) => DESIGN.goals[configIndex % DESIGN.goals.length];

// One seed, judged against the registered block and the registry. Throws; never returns false.
export function assertSeedAllowed(seed, block) {
  if (!Number.isSafeInteger(seed)) refuse('NOT_A_SEED', `${seed}`);
  if (seed < block.lo || seed > block.hi) refuse('OUTSIDE_REGISTERED_BLOCK', `${seed} not in ${block.lo}-${block.hi}`);
  if (DEV_SEEDS.has(seed)) refuse('DEVELOPMENT_FIXTURE', `${seed} is a development fixture`);
  const id = configSeed(seed);
  if (config.isHeldOut(id)) refuse('HELD_OUT', `${seed} is at or above the held-out floor`);
  if (config.isConsumed(id)) refuse('CONSUMED', `${seed} lies in a previously used block`);
  return seed;
}

// The whole block must be fresh: every seed in it passes assertSeedAllowed.
export function assertBlock(block) {
  if (!block || typeof block !== 'object') refuse('BAD_BLOCK', 'seedBlock missing');
  const keys = Object.keys(block).sort().join(',');
  if (keys !== 'hi,lo') refuse('BAD_BLOCK', `seedBlock fields ${keys}`);
  const { lo, hi } = block;
  if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || lo < 0 || lo > hi) refuse('BAD_BLOCK', `${lo}-${hi}`);
  for (let s = lo; s <= hi; s++) assertSeedAllowed(s, block);
  return Object.freeze({ lo, hi });
}

// A Director registration, validated field by field. The fixed fields must equal the frozen design.
export function validateRegistration(reg) {
  if (!reg || typeof reg !== 'object') refuse('BAD_REGISTRATION', 'not an object');
  const keys = Object.keys(reg).sort();
  if (keys.join(',') !== [...REGISTRATION_FIELDS].sort().join(',')) refuse('BAD_REGISTRATION', `fields ${keys.join(',')}`);
  if (reg.schema !== 'study2-registration/1') refuse('BAD_REGISTRATION', `schema ${reg.schema}`);
  if (typeof reg.authorization !== 'string' || reg.authorization.trim() === '') refuse('UNAUTHORIZED', 'no Director authorization recorded');
  for (const f of ['agentSeed', 'arm', 'envMode', 'creditMode', 'pin', 'tickUnit', 'ticks', 'primaryWindowMaxTau', 'productionBaselineCommit']) {
    if (reg[f] !== DESIGN[f]) refuse('DESIGN_MISMATCH', `${f} = ${reg[f]}, frozen design says ${DESIGN[f]}`);
  }
  if (!Number.isSafeInteger(reg.runCount) || reg.runCount < DESIGN.goals.length || reg.runCount % DESIGN.goals.length !== 0) {
    refuse('BAD_RUN_COUNT', `${reg.runCount}: must be a positive multiple of ${DESIGN.goals.length} (equal goal coverage, §R)`);
  }
  if (typeof reg.driverManifestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(reg.driverManifestSha256)) refuse('BAD_REGISTRATION', 'driverManifestSha256');
  const block = assertBlock(reg.seedBlock);
  if (block.hi - block.lo + 1 < reg.runCount) refuse('BAD_BLOCK', 'block smaller than the run count');
  const use = reg.trajectoryUse;
  if (!use || typeof use !== 'object' || Object.keys(use).sort().join(',') !== 'category,study') refuse('BAD_REGISTRATION', 'trajectoryUse');
  const decision = trajectory.checkUse(trajectorySeed(reg.agentSeed), { study: use.study, category: use.category });
  return Object.freeze({ ...reg, seedBlock: block, trajectoryUse: Object.freeze({ ...use }), trajectoryDecision: decision.decision });
}

// The acceptance walk (§S: makeConfig + generateAccepted semantics, bounded to the registered block).
// `makeConfig` is env.makeConfig; the walk reads cfg.accepted, cfg.goal and the ACCEPTANCE_CHECKS booleans only.
// Slot i uses configIndex i; the next slot resumes at acceptedSeed + 1 (strictly ascending, nothing skipped,
// nothing reordered). The run count comes from the registration and nothing else.
export function planAcceptanceWalk(makeConfig, reg) {
  const block = reg.seedBlock;
  const requested = [];
  const slots = [];
  let cursor = block.lo;
  for (let i = 0; i < reg.runCount; i++) {
    const startingSeed = cursor;
    const rejected = [];
    for (;;) {
      if (cursor > block.hi) refuse('RANGE_EXHAUSTED', `slot ${i}: no accepted configuration before ${block.hi}; the block is not extended (§U)`);
      assertSeedAllowed(cursor, block);
      const cfg = makeConfig(cursor, i);
      requested.push(Object.freeze({ seed: cursor, configIndex: i }));
      if (cfg.goal !== goalOf(i)) refuse('GOAL_MISMATCH', `seed ${cursor} index ${i}: goal ${cfg.goal}, expected ${goalOf(i)}`);
      if (cfg.accepted === true) {
        slots.push(Object.freeze({ slot: i, configIndex: i, goal: cfg.goal, startingSeed, acceptedSeed: cursor,
          rejectionCount: rejected.length, rejected: Object.freeze(rejected) }));
        cursor += 1;
        break;
      }
      rejected.push(Object.freeze({ seed: cursor, failed: Object.freeze(ACCEPTANCE_CHECKS.filter((k) => cfg.checks[k] !== true)) }));
      cursor += 1;
    }
  }
  assertGoalBalance(slots, reg.runCount);
  return Object.freeze({ slots: Object.freeze(slots), requested: Object.freeze(requested), nextUnrequestedSeed: cursor });
}

export function assertGoalBalance(slots, runCount) {
  if (slots.length !== runCount) refuse('RUN_COUNT', `${slots.length} slots, registered ${runCount}`);
  const per = runCount / DESIGN.goals.length;
  for (const g of DESIGN.goals) {
    const n = slots.filter((s) => s.goal === g).length;
    if (n !== per) refuse('GOAL_BALANCE', `goal ${g}: ${n} runs, expected ${per}`);
  }
  slots.forEach((s, i) => { if (s.configIndex !== i || s.goal !== goalOf(i)) refuse('GOAL_BALANCE', `slot ${i}`); });
  return true;
}

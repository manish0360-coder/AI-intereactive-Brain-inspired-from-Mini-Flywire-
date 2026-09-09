// ==========================================================
// UQ-B INSTRUMENT GENERALIZATION STRESS TEST — block and selection rule
// ==========================================================
// WHAT THIS IS
//   An instrument robustness gate, NOT a UQ-B experiment. It answers exactly
//   one question:
//
//       does the frozen measurement machinery behave correctly on trajectories
//       other than fixture 100026?
//
//   J1 determinism and ARMED-equivalence were demonstrated on ONE trajectory.
//   A previously unseen trajectory could exercise a state-contamination or
//   instrumentation edge case that fixture 100026 did not. That is a real
//   possibility, not a hypothetical, and it is cheap to close BEFORE the
//   registered block is consumed.
//
// WHAT THIS IS NOT
//   It changes nothing scientific. C1, C2, K = 19, alpha = 1/20, the registered
//   seed block, the acceptance criteria and the estimands are untouched. No
//   result computed here may be used to interpret, tune, or reinterpret UQ-B.
//   Its ONLY licensed outputs are the pass/fail gates in run_stress.js.
//
// WHY A SEPARATE ENUMERATOR
//   protocol.enumerateCandidates() is hard-locked to the frozen 897000-897999
//   range and REFUSES any other bounds (§19, no adaptive extension). That lock
//   is correct and is not touched here. This module therefore enumerates the
//   stress block itself, reusing the SAME committed acceptance machinery —
//   env.makeConfig and protocol.failedChecks — so acceptance is decided by the
//   identical predicate, not by a reimplementation.
// ==========================================================
import { assertSeedAllowed, failedChecks, inRegisteredBlock, isConsumed, isHeldOut,
         HELD_OUT_FLOOR, FROZEN, GOAL_DEGREE } from './protocol.js';

// ---------------------------------------------------------------------------
// THE STRESS BLOCK
//
// Verified against the resolved seed registry before adoption:
//   registered UQ-B  897000-897999   above this block
//   UQ-A             898000-898999   consumed at f7cc052
//   Q1               899000-899499   consumed at d16d568
//   M8               899500-899999   consumed at f9d97b9
//   M7 pilot         900000-900029
//   M7-ERR-09        900030-900499
//   held-out floor   900500          never generated, inspected or inferred
//
// 896000-896099 lies below every one of them. It is the largest free gap under
// the registered block and touches nothing.
// ---------------------------------------------------------------------------
export const STRESS = Object.freeze({
    seedLo: 896000,
    seedHi: 896099,
    // inherited unchanged from the frozen substrate so the instrument under
    // test is the instrument that will collect
    agentSeed: FROZEN.agentSeed,
    m7Arm: FROZEN.m7Arm,
    ticks: FROZEN.ticks,
    goalIndices: FROZEN.goalIndices,
    configurations: 2,          // the minimum the ruling calls scientifically sufficient
});

/**
 * Fail-closed in BOTH directions. A seed must clear every protocol prohibition
 * AND lie inside the stress block. A stress harness cannot reach a registered
 * seed, and it cannot silently wander outside its own block either.
 */
export function assertStressSeedAllowed(seed) {
    if (!Number.isInteger(seed)) throw new Error(`UQ-B stress: seed must be an integer, got ${seed}`);
    // The protocol prohibitions first: held-out, consumed, registered-without-authorisation.
    assertSeedAllowed(seed, { collection: false });
    if (seed < STRESS.seedLo || seed > STRESS.seedHi) {
        throw new Error(`UQ-B stress: seed ${seed} is outside the stress block ${STRESS.seedLo}-` +
            `${STRESS.seedHi}. The stress block is not extensible; widening it would make the ` +
            `gate adaptive.`);
    }
    return seed;
}

/** Independent restatement of the three prohibitions, for the audit record. */
export const stressBlockIsClean = () => {
    const bad = [];
    for (let s = STRESS.seedLo; s <= STRESS.seedHi; s++) {
        if (inRegisteredBlock(s)) bad.push({ seed: s, why: 'registered' });
        if (isConsumed(s))        bad.push({ seed: s, why: 'consumed' });
        if (isHeldOut(s))         bad.push({ seed: s, why: 'held-out' });
    }
    return { clean: bad.length === 0, violations: bad, heldOutFloor: HELD_OUT_FLOOR };
};

/**
 * Enumerate the stress block with the committed acceptance predicate.
 * Every seed passes assertStressSeedAllowed before env sees it.
 */
export function enumerateStressCandidates(env) {
    const accepted = [], rejected = [];
    let candidates = 0;
    for (let seed = STRESS.seedLo; seed <= STRESS.seedHi; seed++) {
        assertStressSeedAllowed(seed);
        for (const idx of STRESS.goalIndices) {
            candidates++;
            const cfg = env.makeConfig(seed, idx);
            const row = { configSeed: seed, configIndex: idx, goal: cfg.goal };
            if (cfg.accepted) accepted.push(row);
            else rejected.push({ ...row, failed: failedChecks(cfg.checks) });
        }
    }
    return { candidates, accepted, rejected, lo: STRESS.seedLo, hi: STRESS.seedHi };
}

// ---------------------------------------------------------------------------
// THE SELECTION RULE — frozen here, in source, BEFORE any readout is computed.
//
// The rule must be decidable from the ENVIRONMENT ALONE: topology, goal and
// the two transition-probability regimes. It may not consult a run, a readout,
// an alignment count, a J1 result, or any arm. That is what makes it
// impossible to cherry-pick a configuration for its eventual outcome — the
// quantities the rule reads exist before the agent has taken a single step.
//
// STRUCTURAL KEY, computed from env only:
//     goalDegree      the goal node's degree in the frozen topology
//     disagree1       |{ u : R_phase1(u) != Hop(u) }| over the 19 decision states
//     disagree2       |{ u : R_phase2(u) != Hop(u) }|
//
// These are exactly the §9/§4.2 pre-run oracle disclosures. Two configurations
// with different keys pose materially different problems to the planner: the
// goal sits in a different neighbourhood, and reliability-optimal play departs
// from hop-optimal play by a different amount in each regime.
//
// RULE
//   Order accepted candidates ascending by (configSeed, configIndex).
//   A := the FIRST accepted candidate in that order.
//   B := the FIRST accepted candidate whose structural key differs from A's.
//   If no candidate has a different key, B := the SECOND accepted candidate and
//   the result is reported as SAME-KEY, which weakens the generalization claim
//   and must be disclosed rather than hidden.
//
// Deterministic, total, and outcome-blind.
// ---------------------------------------------------------------------------
export const SELECTION_RULE = Object.freeze({
    id: 'STRESS-SEL-1',
    orderBy: 'ascending (configSeed, configIndex)',
    key: 'goalDegree, disagreePhase1, disagreePhase2 — all env-derived, pre-run',
    pick: 'A = first accepted; B = first accepted with a different structural key',
    fallback: 'if no differing key exists, B = second accepted, reported SAME-KEY',
    blind: 'the rule reads no run, readout, alignment, arm or J1 result',
});

// ---------------------------------------------------------------------------
// OPERATIVE RULE: TOTALITY — SELECTION_RULE is SUPERSEDED, and why.
//
// Enumeration returned only THREE accepted configurations from 400 candidates.
// At that size, selecting a subset buys nothing and costs the strongest
// property available: running the COMPLETE accepted set makes cherry-picking
// impossible by construction rather than by discipline. There is no subset to
// choose, so no outcome can influence the choice.
//
// It is also the scientifically stronger gate here, for a reason discovered
// from the environment alone and recorded BEFORE any readout was computed:
// configSeed determines the reliability landscape and configIndex only moves
// the goal. Verified directly —
//     896066/0 vs 896066/1 : pPhase1 and pPhase2 IDENTICAL
//     896066/1 vs 896084/1 : pPhase1 DIFFERS
// SELECTION_RULE would have chosen 896066/0 and 896066/1, which share ONE
// landscape. For a gate whose entire purpose is trajectory diversity, that is
// materially weaker than the full set, which spans TWO distinct landscapes and
// three distinct oracle profiles.
//
// SELECTION_RULE is retained above, unedited, as the record of what was frozen
// first. It is superseded by totality, not quietly rewritten — and totality is
// a strict superset of whatever it would have picked, so the supersession
// cannot have been outcome-driven.
// ---------------------------------------------------------------------------
export const OPERATIVE_RULE = Object.freeze({
    id: 'STRESS-SEL-2-TOTALITY',
    rule: 'run EVERY accepted configuration in the stress block; select nothing',
    supersedes: 'STRESS-SEL-1',
    why: 'only 3 accepted of 400; totality removes selection as an attack surface ' +
         'and spans 2 reliability landscapes instead of 1',
    minimum: 2,   // the ruling s5 floor; totality must not fall below it
});

/** Structural key for one candidate. env-only; no run, no readout. */
export function structuralKey(env, { configSeed, configIndex }) {
    const cfg = env.makeConfig(configSeed, configIndex);
    const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);
    const R1 = env.reliabilityOptimalPolicy(cfg.pPhase1, cfg.goal).policy;
    const R2 = env.reliabilityOptimalPolicy(cfg.pPhase2, cfg.goal).policy;
    const H  = env.hopOptimalPolicy(cfg.goal).policy;
    return {
        goal: cfg.goal,
        goalDegree: GOAL_DEGREE[cfg.goal],
        disagreePhase1: states.filter(u => R1.get(u) !== H.get(u)).length,
        disagreePhase2: states.filter(u => R2.get(u) !== H.get(u)).length,
        decisionStates: states.length,
    };
}

export const keyString = (k) => `${k.goal}/${k.goalDegree}/${k.disagreePhase1}/${k.disagreePhase2}`;

/** Apply SELECTION_RULE. Returns the two configurations and the audit trail. */
export function selectStressConfigurations(env, accepted) {
    const ordered = accepted.slice().sort((a, b) =>
        a.configSeed - b.configSeed || a.configIndex - b.configIndex);
    if (ordered.length < 2) {
        return { sufficient: false, ordered, chosen: [], reason:
            `only ${ordered.length} accepted configuration(s) in the stress block` };
    }
    const keyed = ordered.map(c => ({ ...c, key: structuralKey(env, c) }));
    const A = keyed[0];
    const kA = keyString(A.key);
    const B = keyed.slice(1).find(c => keyString(c.key) !== kA);
    if (B) return { sufficient: true, sameKey: false, ordered: keyed, chosen: [A, B] };
    return { sufficient: true, sameKey: true, ordered: keyed, chosen: [A, keyed[1]] };
}

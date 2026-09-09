// ==========================================================
// UQ-B ANALYSIS — the §10 statistic, the C1 difference, the §12 verdict
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   UQB_PREREGISTRATION.md v1.0 (3b3d195) §9–§13, as amended by UQB-ERR-01 and
//   UQB-ERR-02. Neither erratum changed any of these definitions.
//
// WHAT THIS COMPUTES, and nothing else
//   §10  A(arrangement, phase) — the oracle-alignment count, integer 0..19
//   §11  C1 — the per-configuration ARMED vs ABLATED difference, per phase
//   §12  C2 — REDISTRIBUTION-REJECTED iff A(0) is strictly greater than all 19
//   §9   the hop-optimal action, recorded per state as a disclosure
//
// WHAT THIS DOES NOT COMPUTE — §13
//   No p-value beyond C2's exact construction, no confidence interval, no
//   additional test, no effect size, no model, and no cross-configuration
//   aggregate of the C1 difference. §13 forbids all of them and forbids adding
//   them after data exists.
//
// PHASES ARE NEVER POOLED — §10
//   One end-of-run policy is scored against BOTH regimes separately, exactly as
//   UQ-A scored one final Q table against pPhase1 and pPhase2.
// ==========================================================
import * as env from '../m7/env.js';
import { FROZEN } from './protocol.js';

export const PHASES = Object.freeze([1, 2]);

/**
 * §9 — the oracles for one configuration, computed from (topology, goal, p)
 * alone, before any readout is seen.
 */
export function oracles({ goal, pPhase1, pPhase2 }) {
    const states = env.decisionStates(goal).slice().sort((a, b) => a - b);
    const R = {
        1: env.reliabilityOptimalPolicy(pPhase1, goal).policy,
        2: env.reliabilityOptimalPolicy(pPhase2, goal).policy,
    };
    const H = env.hopOptimalPolicy(goal).policy;      // topology only; phase-invariant
    // §4.2 disclosure: the R5 guarantee holds for phase 1 only.
    const disagree = {
        1: states.filter(u => R[1].get(u) !== H.get(u)).length,
        2: states.filter(u => R[2].get(u) !== H.get(u)).length,
    };
    return { states, R, H, disagree };
}

/**
 * §10 — A(arrangement, phase). Integer alignment count over the fixed 19-state
 * population. `readout` maps state -> executed bestChoice key.
 */
export function alignment(readout, states, oracleMap) {
    let n = 0;
    for (const u of states) if (Number(readout[u]) === Number(oracleMap.get(u))) n++;
    return n;
}

/**
 * The full per-arm table: A for every arrangement, in both phases.
 * `arm` is one collectOne() result.
 */
export function analyzeArm(arm) {
    const { states } = arm;
    const o = oracles(arm.environment);
    if (states.length !== FROZEN.decisionStates) {
        throw new Error(`UQ-B: population is ${states.length}, frozen at ${FROZEN.decisionStates}.`);
    }
    if (arm.readouts.length !== FROZEN.arrangements) {
        throw new Error(`UQ-B: ${arm.readouts.length} arrangements, frozen at ${FROZEN.arrangements}.`);
    }
    const A = { 1: [], 2: [] };
    const hopA = { 1: [], 2: [] };
    for (const r of arm.readouts) {
        for (const ph of PHASES) {
            A[ph].push(alignment(r.best, states, o.R[ph]));
            hopA[ph].push(alignment(r.best, states, o.H));
        }
    }
    return {
        arm: arm.runIdentity.arm,
        states,
        A,                                   // A[phase][j], j = 0 is the identity
        hopAlignment: hopA,                  // §9 disclosure, never the statistic
        r5Disagreement: o.disagree,          // §4.2 disclosure; guaranteed for phase 1 only
        observed: { 1: A[1][0], 2: A[2][0] },
    };
}

/**
 * §12 — the C2 discriminator. REJECTED iff the observed identity alignment is
 * STRICTLY greater than every one of the 19 shuffled alignments.
 *
 * TIES DO NOT REJECT. No post-hoc tie breaking, no jitter, no secondary
 * criterion, no mid-p adjustment. That is what makes the declared level exact.
 */
export function c2Verdict(Aphase) {
    if (Aphase.length !== FROZEN.arrangements) {
        throw new Error(`UQ-B: C2 needs exactly ${FROZEN.arrangements} arrangements, got ` +
            `${Aphase.length}.`);
    }
    const observed = Aphase[0];
    const shuffles = Aphase.slice(1);
    const rejected = shuffles.every(s => observed > s);
    // §12 disclosure, carrying no declared level and spending no additional alpha.
    const dominates = shuffles.every(s => observed < s);
    return {
        observed, shuffles,
        verdict: rejected ? 'REDISTRIBUTION-REJECTED' : 'NOT-REJECTED',
        redistributionDominates: dominates,
        ties: shuffles.filter(s => s === observed).length,
        alpha: FROZEN.alpha,
    };
}

/**
 * The complete per-configuration result: C1 and C2, kept strictly separate.
 * §2 — C2 is NOT a permutation test of the causal treatment effect.
 */
export function analyzeConfiguration({ armed, ablated }) {
    const a = analyzeArm(armed);
    const b = analyzeArm(ablated);

    const c1 = {};
    for (const ph of PHASES) {
        c1[ph] = {
            armed: a.observed[ph],
            ablated: b.observed[ph],
            // §11/§13 license the difference PER COMPARISON. It is not
            // aggregated across configurations anywhere.
            difference: a.observed[ph] - b.observed[ph],
        };
    }
    const c2 = { ARMED: {}, ABLATED: {} };
    for (const ph of PHASES) {
        c2.ARMED[ph] = c2Verdict(a.A[ph]);
        c2.ABLATED[ph] = c2Verdict(b.A[ph]);
    }
    // §12 mandatory wiring control: under ablation every futureBonus is 0, so a
    // permutation of a constant vector is the identity and all 20 arrangements
    // must be identical, forcing NOT-REJECTED.
    const wiring = {};
    for (const ph of PHASES) {
        const all = b.A[ph];
        wiring[ph] = {
            allIdentical: all.every(x => x === all[0]),
            verdict: c2.ABLATED[ph].verdict,
            pass: all.every(x => x === all[0]) && c2.ABLATED[ph].verdict === 'NOT-REJECTED',
        };
    }
    return {
        configSeed: armed.runIdentity.configSeed,
        configIndex: armed.runIdentity.configIndex,
        goal: armed.runIdentity.goal,
        c1, c2, ablatedWiringControl: wiring,
        alignmentTable: { ARMED: a.A, ABLATED: b.A },
        hopAlignment: { ARMED: a.hopAlignment, ABLATED: b.hopAlignment },
        r5Disagreement: a.r5Disagreement,
    };
}

/**
 * J1 — the same-state control, computed from the readouts the collector took
 * before and after the arrangement sweep. Acceptance is EXACTLY 0 drifted
 * states (UQB-ERR-01 §8). This function reports; it never relaxes.
 */
export function j1Drift(arm) {
    const drifted = arm.states.filter(u =>
        arm.j1.offPre[u].best !== arm.j1.offPost[u].best ||
        arm.j1.offPre[u].canary0 !== arm.j1.offPost[u].canary0 ||
        arm.j1.offPre[u].canary !== arm.j1.offPost[u].canary);
    return { drifted, count: drifted.length, total: arm.states.length, pass: drifted.length === 0 };
}

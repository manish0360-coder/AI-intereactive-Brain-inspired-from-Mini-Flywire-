// ==========================================================
// C1 — E6 AND THE PREREGISTERED DESCRIPTIVE SUMMARIES
// ==========================================================
// Computes ONLY what C1 v2.0 §9 specifies. There is no test, no p-value, no α,
// no confidence interval, no standard error, and no population inference
// anywhere in this file. SD is computed as a census spread and is never used to
// form an interval.
// ==========================================================
import * as env from '../m7/env.js';
import { FROZEN } from './protocol.js';

/** §2 — rank of the oracle-optimal action within a decision-time pool. */
export const rankOf = (pairs, key) => {
    const s = pairs.slice().sort((x, y) => y[1] - x[1]);
    const i = s.findIndex(x => Number(x[0]) === Number(key));
    return i < 0 ? null : i;
};

/**
 * §2 / §6 — ρ = r/(n−1), DEFINED ONLY WHEN n ≥ 2 AND v* ∈ pool.
 * n = 1 yields undefined. No ρ = 0 convention is adopted anywhere.
 */
export function rhoOf(pairs, vStar) {
    const n = pairs.length;
    if (n < FROZEN.minPoolForRho) return { rho: null, r: null, n, why: 'n<2' };
    const r = rankOf(pairs, vStar);
    if (r === null) return { rho: null, r: null, n, why: 'v* absent' };
    return { rho: r / (n - 1), r, n, why: null };
}

/** §5 — the committed oracle, per phase. Nothing is invented. */
export function oraclesFor(cfg) {
    return {
        1: env.reliabilityOptimalPolicy(cfg.pPhase1, cfg.goal).policy,
        2: env.reliabilityOptimalPolicy(cfg.pPhase2, cfg.goal).policy,
    };
}

/**
 * Build every state-level cell for one configuration, both arms, both phases.
 * §7 — pairwise deletion: a state contributes iff ρ is defined in BOTH arms,
 * determined solely by n and v*∈pool, never by any outcome magnitude.
 */
export function cellsFor({ armed, ablated, cfg }) {
    const oracle = oraclesFor(cfg);
    const cells = [];
    armed.states.forEach((u, i) => {
        for (const ph of FROZEN.phases) {
            const vStar = Number(oracle[ph].get(u));
            const a = rhoOf(armed.readouts[i].pool, vStar);
            const b = rhoOf(ablated.readouts[i].pool, vStar);
            const both = a.rho !== null && b.rho !== null;
            cells.push({
                state: u, phase: ph, vStar,
                rA: a.r, nA: a.n, rhoA: a.rho, whyA: a.why,
                rB: b.r, nB: b.n, rhoB: b.rho, whyB: b.why,
                bothDefined: both,
                delta: both ? a.rho - b.rho : null,
                bestA: armed.readouts[i].best, bestB: ablated.readouts[i].best,
                tiesA: armed.readouts[i].pool.length -
                       new Set(armed.readouts[i].pool.map(x => x[1])).size,
                tiesB: ablated.readouts[i].pool.length -
                       new Set(ablated.readouts[i].pool.map(x => x[1])).size,
            });
        }
    });
    return cells;
}

/** §2 — Δ(c,p) = unweighted mean of δ over jointly defined states. */
export function deltaFor(cells, phase) {
    const d = cells.filter(c => c.phase === phase && c.bothDefined).map(c => c.delta);
    return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
}

/** §7 / §9.4 — the mandatory missingness record, per configuration and phase. */
export function missingnessFor(cells, phase) {
    const ph = cells.filter(c => c.phase === phase);
    const armedDef = ph.filter(c => c.rhoA !== null).length;
    const ablatedDef = ph.filter(c => c.rhoB !== null).length;
    const jointlyDefined = ph.filter(c => c.bothDefined).length;
    const missing_A = FROZEN.decisionStates - armedDef;
    const missing_B = FROZEN.decisionStates - ablatedDef;
    return {
        statesTotal: FROZEN.decisionStates, jointlyDefined,
        armedOnlyUndefined: ph.filter(c => c.rhoA === null && c.rhoB !== null).length,
        ablatedOnlyUndefined: ph.filter(c => c.rhoB === null && c.rhoA !== null).length,
        neitherDefined: ph.filter(c => c.rhoA === null && c.rhoB === null).length,
        excluded: FROZEN.decisionStates - jointlyDefined,
        n1Armed: ph.filter(c => c.nA === 1).length,
        n1Ablated: ph.filter(c => c.nB === 1).length,
        missing_A, missing_B, asym: Math.abs(missing_A - missing_B),
    };
}

/** §10 — E1, the wiring/exposure control. Never an outcome. */
export function e1For(armed, ablated) {
    return armed.states.filter((u, i) =>
        Number(armed.readouts[i].best) !== Number(ablated.readouts[i].best)).length;
}

// ---------------------------------------------------------------------------
// §9.2 — distributional summaries. Descriptive only.
// ---------------------------------------------------------------------------
const quantile = (sorted, q) => {
    if (!sorted.length) return null;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

export function describe(values) {
    const v = values.filter(x => x !== null && Number.isFinite(x)).slice().sort((a, b) => a - b);
    const N = v.length;
    if (!N) return { N: 0 };
    const mean = v.reduce((a, b) => a + b, 0) / N;
    // Census standard deviation: the spread of THIS enumerated population.
    // Never a standard error, never used to form an interval (§9.2).
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
    const q = (p) => quantile(v, p);
    return {
        N, mean, median: q(0.50), sd,
        min: v[0], p05: q(0.05), p10: q(0.10), p25: q(0.25), p50: q(0.50),
        p75: q(0.75), p90: q(0.90), p95: q(0.95), max: v[N - 1],
        IQR: q(0.75) - q(0.25), range: v[N - 1] - v[0],
    };
}

/** §9.3 — sign counts. Proportions describe the census and estimate nothing. */
export function signCounts(values) {
    const v = values.filter(x => x !== null && Number.isFinite(x));
    const nNegative = v.filter(x => x < 0).length;
    const nPositive = v.filter(x => x > 0).length;
    const nZero = v.filter(x => x === 0).length;
    const N = v.length || 1;
    return { N: v.length, nNegative, nPositive, nZero,
             pNegative: nNegative / N, pPositive: nPositive / N, pZero: nZero / N };
}

export const histogram = (values) => {
    const h = {};
    for (const x of values) if (x !== null) h[x] = (h[x] || 0) + 1;
    return h;
};

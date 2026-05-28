// ======================================
// 🧠 BAYESIAN TRUST MEMORY SYSTEM
// ======================================
// Separates CAN DO from SHOULD TRUST.
//
// confidenceMap  = visual signal only
// trustMemory    = real earned certainty
//
// Trust ONLY grows from autonomous
// validated success. Manual teaching
// does not write here at all.
//
// Formula: Laplace-smoothed Beta prior
// trust(key) = (successes + 1) / (attempts + 2)
//
// This means:
// 0 attempts           → 0.50  (maximally uncertain)
// 1 success / 1 attempt → 0.67
// 10 success / 10       → 0.92  (very trusted)
// 10 success / 20       → 0.52  (barely trusted)
// 0 success / 10        → 0.09  (actively distrusted)
// ======================================


// ======================================
// STORAGE
// ======================================

// autonomous successes per path key
export const pathSuccesses = new Map();

// autonomous attempts per path key
export const pathAttempts  = new Map();




// ======================================
// RECORD ONE AUTONOMOUS ATTEMPT
// call every time agent moves along a path
// ======================================

export function recordAttempt(key) {

    pathAttempts.set(

        key,

        (pathAttempts.get(key) || 0) + 1

    );

}




// ======================================
// RECORD ONE AUTONOMOUS SUCCESS
// call only when goal is verified reached
// ======================================

export function recordSuccess(key) {

    pathSuccesses.set(

        key,

        (pathSuccesses.get(key) || 0) + 1

    );

}




// ======================================
// GET BAYESIAN TRUST SCORE [0 → 1]
// ──────────────────────────────────────
// Laplace smoothing prevents:
// - 0/0 division
// - premature certainty from 1 success
// - fake certainty from manual teaching
// ======================================

export function getPathTrust(key) {

    const s = pathSuccesses.get(key) || 0;
    const a = pathAttempts.get(key)  || 0;

    // Bayesian Beta distribution mean
    // with alpha=1, beta=1 prior (flat/uncertain)
    return (s + 1) / (a + 2);

}




// ======================================
// GET TRUST UNCERTAINTY
// ──────────────────────────────────────
// How uncertain we are about the trust
// estimate. High when few attempts.
// Used to modulate exploration.
//
// Formula: variance of Beta distribution
// var = (s+1)(a-s+1) / (a+2)^2(a+3)
// ======================================

export function getTrustUncertainty(key) {

    const s = pathSuccesses.get(key) || 0;
    const a = pathAttempts.get(key)  || 0;

    const alpha = s + 1;
    const beta  = (a - s) + 1;
    const n     = a + 2;

    // variance of Beta(alpha, beta)
    return (alpha * beta) / (n * n * (n + 1));

}




// ======================================
// DECAY TRUST SLOWLY
// ──────────────────────────────────────
// Unused paths become uncertain again.
// Prevents stale certainty from old
// episodes that no longer apply.
//
// Does NOT decay successes/attempts to 0.
// Instead scales them toward each other
// (increases apparent uncertainty).
// ======================================

export function decayTrust(rate = 0.999) {

    pathSuccesses.forEach((v, k) => {
        const decayed = v * rate;
        if (decayed < 0.01) {
            pathSuccesses.delete(k);
        } else {
            pathSuccesses.set(k, decayed);
        }
    });

    pathAttempts.forEach((v, k) => {
        const decayed = v * rate;
        if (decayed < 0.01) {
            pathAttempts.delete(k);
        } else {
            pathAttempts.set(k, decayed);
        }
    });

}




// ======================================
// GET TRUST SNAPSHOT (DEBUG / HUD)
// returns top N most trusted paths
// ======================================

export function getTrustSnapshot(topN = 5) {

    const entries = [];

    pathAttempts.forEach((attempts, key) => {

        if (attempts < 2) return; // skip too-new paths

        const trust       = getPathTrust(key);
        const uncertainty = getTrustUncertainty(key);
        const successes   = pathSuccesses.get(key) || 0;

        entries.push({ key, trust, uncertainty, successes, attempts });

    });

    // sort by trust descending
    entries.sort((a, b) => b.trust - a.trust);

    return entries.slice(0, topN);

}
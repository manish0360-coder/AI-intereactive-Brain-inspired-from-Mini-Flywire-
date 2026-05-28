// ======================================
// 🧠 EPISTEMIC UNCERTAINTY LEDGER
// Bayesian Evidence-Mass Confidence
// ======================================
//
// ARCHITECTURE — v2: Beta Distribution
//
// v1 FLAW (EMA):
// Fixed learning rate α=0.08 treats every
// sample identically regardless of evidence
// mass. 1 success and 100 successes converge
// toward similar confidence/uncertainty values.
// The system cannot distinguish:
//   "1/1 trials succeeded" (lucky guess)
//   from
//   "100/100 trials succeeded" (reliable truth)
//
// MATHEMATICAL PROOF OF FAILURE:
// EMA uncertainty after 1 success:
//   u = 0.5 + 0.10×(|1.0-0.5|-0.5) = 0.50
//   → NO CHANGE. Identical to zero evidence.
// EMA uncertainty after 100 successes:
//   u ≈ 0.36 — barely different from 0.50.
// Scoring penalty qValue×u×1.5 at Q=20:
//   0 trials: 14.4  |  100 trials: 10.8
//   Difference: only 3.6 points on Q=20 path.
//   System treats 0 and 100 trials near-identically.
//
// SOLUTION — Beta distribution posterior:
//
// Each entry stores (alpha, beta_) representing
// pseudo-counts of fractional successes/failures.
//
// UPDATE RULE (for outcome ∈ [0,1]):
//   alpha  += outcome        (fractional success)
//   beta_  += (1 - outcome)  (fractional failure)
//
// DERIVED QUANTITIES (computed on demand):
//   confidence  = alpha / (alpha + beta_)
//   variance    = α×β / [(α+β)²×(α+β+1)]
//   uncertainty = min(sqrt(variance) × 2, 1.0)
//   volatility  = 1 / (1 + evidenceMass/10)
//
// PROPERTIES:
// ✓ Low evidence → high uncertainty (correct)
// ✓ High evidence → evidence-resistant belief (correct)
// ✓ Contradictions hurt low-evidence beliefs more
// ✓ 100-success path: single failure drops conf 1%
// ✓ 1-success path: single failure drops conf 17%
// ✓ Ollama pairs start at skeptical prior
// ✓ External API identical to v1 — no callers change
//
// STABILITY PROOF:
// Beta posterior is always proper (alpha,beta>0).
// Mean bounded strictly in (0,1).
// Variance monotonically decreases with evidence.
// No oscillation possible by construction.
// ======================================


// ======================================
// PRIOR DEFINITIONS
// ──────────────────────────────────────
// These represent how much "pre-loaded belief"
// each entry type starts with.
//
// PROCEDURAL PRIOR — Beta(2,2):
//   conf = 2/4 = 0.50  (completely neutral)
//   unc  = 0.40        (significant uncertainty)
//   Requires ~8 consistent outcomes to reach conf>0.75
//
// SEMANTIC PRIOR — Beta(2,4):
//   conf = 2/6 = 0.33  (mildly skeptical)
//   unc  = 0.34        (moderate uncertainty)
//   Requires ~12 consistent outcomes for conf>0.75
//   New concepts assumed somewhat unreliable.
//
// OLLAMA QUARANTINE PRIOR — Beta(1,7):
//   conf = 1/8 = 0.125 (strongly skeptical)
//   unc  = 0.24        (moderate — Beta is narrow here)
//   Requires ~25 consistent outcomes for conf>0.75
//   LLM hallucinations need many validations.
//   After 20 validations: conf=21/28=0.75 (finally trusted)
// ======================================

const PROC_PRIOR_ALPHA   = 2;
const PROC_PRIOR_BETA    = 2;

const SEM_PRIOR_ALPHA    = 2;
const SEM_PRIOR_BETA     = 4;

const OLLAMA_PRIOR_ALPHA = 1;
const OLLAMA_PRIOR_BETA  = 7;


// ======================================
// LEDGER STORAGE
// ──────────────────────────────────────
// Internal: (alpha, beta_) pairs only.
// External API returns computed fields
// identical to v1: {confidence, uncertainty,
// volatility, evidenceMass}
// ======================================

const proceduralLedger = new Map();  // key: "fromId->toId"
const semanticLedger   = new Map();  // key: "fromLabel->toLabel"


// ======================================
// INTERNAL: COMPUTE DERIVED FIELDS
// ──────────────────────────────────────
// Converts raw Beta parameters to the
// external API fields used by scoring.js.
//
// confidence:
//   Bayesian posterior mean = α/(α+β)
//   Always in (0,1), evidence-weighted.
//
// uncertainty (normalized Beta std dev):
//   σ² = αβ/[(α+β)²(α+β+1)]
//   σ  = sqrt(σ²)
//   Max σ at α=β=1: 0.5
//   Multiply × 2 to normalize to [0,1].
//
// volatility (evidence-mass penalty):
//   = 1 / (1 + evidenceMass/10)
//   At n=4  (prior only): 0.71 — very volatile
//   At n=14 (10 outcomes): 0.42 — moderate
//   At n=104 (100 outcomes): 0.088 — stable
//   Naturally falls as evidence accumulates.
//   Does NOT use EMA — emerges from Beta math.
// ======================================

function computeFields(alpha, beta_) {

    const n    = alpha + beta_;
    const mean = alpha / n;

    // Beta distribution variance
    const variance = (alpha * beta_) / (n * n * (n + 1));
    const stddev   = Math.sqrt(variance);

    // Normalize to [0,1]: max stddev of Beta ≈ 0.5
    const uncertainty = Math.min(stddev * 2.0, 1.0);

    // Evidence-mass volatility: shrinks as n grows
    const volatility = 1.0 / (1.0 + n / 10.0);

    return {
        confidence:   mean,
        uncertainty,
        volatility,
        evidenceMass: n
    };

}


// ======================================
// INTERNAL: GET OR CREATE ENTRY
// ======================================

function getOrCreateProc(key) {

    if (!proceduralLedger.has(key)) {
        proceduralLedger.set(key, {
            alpha:  PROC_PRIOR_ALPHA,
            beta_:  PROC_PRIOR_BETA
        });
    }

    return proceduralLedger.get(key);

}


function getOrCreateSem(key) {

    if (!semanticLedger.has(key)) {
        semanticLedger.set(key, {
            alpha:  SEM_PRIOR_ALPHA,
            beta_:  SEM_PRIOR_BETA
        });
    }

    return semanticLedger.get(key);

}


// ======================================
// UPDATE PROCEDURAL UNCERTAINTY
// ──────────────────────────────────────
// Called after every agent step.
//
// outcome ∈ [0,1] — normalized rewardSignal:
//   outcome = min(max((rewardSignal + 2) / 14, 0), 1)
//
// Sequential Beta update:
//   alpha  += outcome
//   beta_  += (1 - outcome)
//
// This is the conjugate posterior update for
// continuous outcomes. Guaranteed stable.
// ======================================

export function updateProceduralUncertainty(fromId, toId, outcome) {

    const key   = String(fromId) + "->" + String(toId);
    const entry = getOrCreateProc(key);

    entry.alpha  += outcome;
    entry.beta_  += (1.0 - outcome);

}


// ======================================
// GET PROCEDURAL UNCERTAINTY
// ──────────────────────────────────────
// Returns {confidence, uncertainty,
//          volatility, evidenceMass}
// — same API as v1, now evidence-aware.
// ======================================

export function getProceduralUncertainty(fromId, toId) {

    const key   = String(fromId) + "->" + String(toId);
    const entry = proceduralLedger.get(key);

    if (!entry) {
        return computeFields(PROC_PRIOR_ALPHA, PROC_PRIOR_BETA);
    }

    return computeFields(entry.alpha, entry.beta_);

}


// ======================================
// UPDATE SEMANTIC UNCERTAINTY
// ──────────────────────────────────────
// Same Beta update. Starts from more
// skeptical SEM prior (2,4) → conf=0.33.
// ======================================

export function updateSemanticUncertainty(fromLabel, toLabel, outcome) {

    const key   = fromLabel + "->" + toLabel;
    const entry = getOrCreateSem(key);

    entry.alpha  += outcome;
    entry.beta_  += (1.0 - outcome);

}


// ======================================
// GET SEMANTIC UNCERTAINTY
// ======================================

export function getSemanticUncertainty(fromLabel, toLabel) {

    const key   = fromLabel + "->" + toLabel;
    const entry = semanticLedger.get(key);

    if (!entry) {
        return computeFields(SEM_PRIOR_ALPHA, SEM_PRIOR_BETA);
    }

    return computeFields(entry.alpha, entry.beta_);

}


// ======================================
// REGISTER OLLAMA SEMANTIC PAIR
// ──────────────────────────────────────
// Called when LLM injects a new semantic
// association. Overwrites with the Ollama
// quarantine prior: Beta(1,7), conf=0.125.
//
// Why β=7: requires 25 real validations
// to reach conf > 0.75. Hallucinations that
// are never validated stay at conf ≈ 0.125
// forever, providing near-zero trust boost.
//
// Evidence mass = 1+7 = 8 pseudo-observations.
// A single validation: Beta(2,7), conf=2/9=0.222.
// Five validations:    Beta(6,7), conf=6/13=0.462.
// Twenty validations:  Beta(21,7), conf=21/28=0.75.
// ======================================

export function registerOllamaPair(fromLabel, toLabel) {

    const key = fromLabel + "->" + toLabel;

    semanticLedger.set(key, {
        alpha:  OLLAMA_PRIOR_ALPHA,   // 1
        beta_:  OLLAMA_PRIOR_BETA     // 7
    });

    const fields = computeFields(OLLAMA_PRIOR_ALPHA, OLLAMA_PRIOR_BETA);

    console.log(
        "🔒 Ollama pair quarantined:",
        fromLabel, "->", toLabel,
        "| conf:", fields.confidence.toFixed(3),
        "| unc:", fields.uncertainty.toFixed(3),
        "| evidence:", fields.evidenceMass
    );

}


// ======================================
// PROPAGATE UNCERTAINTY BACKWARD
// ──────────────────────────────────────
// When B→C is uncertain, A→B inherits
// partial uncertainty from its successor.
//
// IMPLEMENTATION for Beta parameters:
// We pull alpha/(alpha+beta_) of the predecessor
// slightly toward the uncertainty of the successor.
//
// This is done by adding a small "phantom failure"
// proportional to successor uncertainty, only if
// successor uncertainty is HIGHER than predecessor.
// Prevents positive-direction contamination.
//
// phantom_failure = PROPAGATION_F × bcUncertainty
// entry.beta_  += phantom_failure
//
// Effect: predecessor confidence slightly reduced,
// evidence mass slightly increased (stabilizing).
//
// One step backward only — full chain would
// cause recursive uncertainty explosion.
// ======================================

const PROPAGATION_F = 0.15;

export function propagateUncertainty(fromId, toId, neuronMap) {

    const bcKey   = String(fromId) + "->" + String(toId);
    const bcEntry = proceduralLedger.get(bcKey);

    if (!bcEntry) return;

    const bcFields = computeFields(bcEntry.alpha, bcEntry.beta_);
    const bcUnc    = bcFields.uncertainty;

    // Only propagate if successor is genuinely uncertain
    if (bcUnc < 0.35) return;

    neuronMap.forEach((neuron, aId) => {

        if (aId === fromId) return;

        const isNeighbor = neuron.userData.neighbors
            && neuron.userData.neighbors.includes(fromId);

        if (!isNeighbor) return;

        const abKey   = String(aId) + "->" + String(fromId);
        const abEntry = getOrCreateProc(abKey);

        // compute predecessor's current uncertainty
        const abFields = computeFields(abEntry.alpha, abEntry.beta_);

        // only propagate if successor is MORE uncertain
        // prevents already-uncertain predecessors from
        // getting double-penalized by stable successors
        if (bcUnc <= abFields.uncertainty) return;

        // add phantom failure proportional to the gap
        const phantomFailure = PROPAGATION_F * (bcUnc - abFields.uncertainty);
        abEntry.beta_ += phantomFailure;

    });

}


// ======================================
// EVIDENCE-MASS DECAY (Forgetting)
// ──────────────────────────────────────
// Slowly pulls alpha and beta back toward
// the prior, simulating memory forgetting.
//
// RULE: decay excess above prior
//   alpha_decay = priorA + (alpha - priorA) × r
//   beta_decay  = priorB + (beta  - priorB) × r
//
// At r=0.9995 per 500ms loop:
//   Excess halves in ~1385 steps ≈ 11.5 minutes
//   → Long-term memories are stable
//   → Abandoned transitions slowly forget
//
// The prior acts as an attractor:
//   minimum confidence is always prior mean
//   maximum forgetting returns to prior state
//   never loses ALL evidence — prior protects
// ======================================

const DECAY_RATE = 0.9995;

export function decayUncertaintyLedger() {

    proceduralLedger.forEach((entry) => {

        const excessAlpha = entry.alpha - PROC_PRIOR_ALPHA;
        const excessBeta  = entry.beta_ - PROC_PRIOR_BETA;

        if (excessAlpha > 0) {
            entry.alpha = PROC_PRIOR_ALPHA + excessAlpha * DECAY_RATE;
        }

        if (excessBeta > 0) {
            entry.beta_ = PROC_PRIOR_BETA + excessBeta * DECAY_RATE;
        }

    });

    semanticLedger.forEach((entry) => {

        // Semantic memories decay slightly faster
        // Allows outdated Ollama associations to fade
        const semDecay = 0.9990;

        const priorA = entry.alpha < OLLAMA_PRIOR_ALPHA + 0.5
            ? OLLAMA_PRIOR_ALPHA   // ollama-quarantined pair
            : SEM_PRIOR_ALPHA;

        const priorB = entry.beta_ > SEM_PRIOR_BETA + 2
            ? OLLAMA_PRIOR_BETA    // ollama-quarantined pair
            : SEM_PRIOR_BETA;

        const excessAlpha = entry.alpha - priorA;
        const excessBeta  = entry.beta_ - priorB;

        if (excessAlpha > 0) {
            entry.alpha = priorA + excessAlpha * semDecay;
        }

        if (excessBeta > 0) {
            entry.beta_ = priorB + excessBeta * semDecay;
        }

    });

}


// ======================================
// GET COMBINED UNCERTAINTY SCORE
// ──────────────────────────────────────
// Returns a single [0,1] scalar:
//   combined = uncertainty + volatility × 0.4
//
// uncertainty: from Beta variance (evidence-aware)
// volatility:  from evidence mass (shrinks as n grows)
//
// This is consumed by scoring.js for the
// penalty term: qValue × combined × 1.5
// ======================================

export function getCombinedUncertainty(fromId, toId) {

    const f = getProceduralUncertainty(fromId, toId);
    return Math.min(f.uncertainty + f.volatility * 0.40, 1.0);

}


export function getCombinedSemanticUncertainty(fromLabel, toLabel) {

    const f = getSemanticUncertainty(fromLabel, toLabel);
    return Math.min(f.uncertainty + f.volatility * 0.40, 1.0);

}


// ======================================
// LEDGER SUMMARY (HUD / debugging)
// ======================================

export function getLedgerSummary() {

    let totalProcUnc = 0, totalSemUnc = 0;
    let totalProcEv  = 0, totalSemEv  = 0;

    proceduralLedger.forEach((e) => {
        const f = computeFields(e.alpha, e.beta_);
        totalProcUnc += f.uncertainty;
        totalProcEv  += f.evidenceMass;
    });

    semanticLedger.forEach((e) => {
        const f = computeFields(e.alpha, e.beta_);
        totalSemUnc += f.uncertainty;
        totalSemEv  += f.evidenceMass;
    });

    const pn = proceduralLedger.size || 1;
    const sn = semanticLedger.size   || 1;

    return {
        proceduralEntries:  proceduralLedger.size,
        semanticEntries:    semanticLedger.size,
        avgProceduralUnc:   (totalProcUnc / pn).toFixed(3),
        avgSemanticUnc:     (totalSemUnc  / sn).toFixed(3),
        avgProceduralEvid:  (totalProcEv  / pn).toFixed(1),
        avgSemanticEvid:    (totalSemEv   / sn).toFixed(1)
    };

}
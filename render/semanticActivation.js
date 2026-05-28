// ======================================
// 🧠 SEMANTIC REFRACTORY SYSTEM
// ======================================
// Biologically plausible anti-perseveration.
//
// PROBLEM SOLVED:
// After procedural certainty (Q=20) forms a closed
// loop (lion→hunt→meat→eat→lion), semantic bonuses
// fire with constant magnitude every step forever.
// No mechanism existed to weaken dominant attractors.
// Result: semantic perseveration, attractor collapse,
// loss of contextual diversity, console flooding.
//
// SOLUTION — Refractory inhibition:
// When a semantic pair is ACTUALLY TRAVERSED (not
// just evaluated as a candidate), its activation
// strength increases. High strength → reduced bonus
// (refractory). Strength decays over time → recovery.
//
// Biologically: neurons that fire repeatedly enter
// a refractory period. They need recovery time before
// full activation again. This prevents any single
// pattern from monopolizing neural firing.
//
// Mathematical model:
//   activation: strength += INCREMENT on traversal
//   decay:      strength *= DECAY_RATE per loop cycle
//   factor:     1 / (1 + strength * SLOPE)
//
// Steady-state for closed-loop (pair fires every cycle):
//   strength = INCREMENT / (1 - DECAY_RATE) ≈ 5.5
//   factor   = 1 / (1 + 5.5 * 0.4) ≈ 0.31
//
// → Established attractor gets 31% of semantic boost.
// → Novel path (strength=0) gets 100% of semantic boost.
// → Creates automatic novelty pressure without hardcoding.
// ======================================



// ======================================
// ACTIVATION STATE
// ──────────────────────────────────────
// Keys are concept labels NOT neuron IDs.
// "lion->hunt", not "3->10".
// This makes the system concept-level,
// not topology-level → generalizes to
// all future concepts before Ollama.
// ======================================

const activationStrength = new Map();




// ======================================
// PARAMETERS
// ──────────────────────────────────────
// DECAY_RATE: how fast strength heals.
// Called once per runAgentLoop (≈500ms).
//   0.82 → 50% strength remaining after ~3.5s
//   0.82^10 (5s) → 14% → factor ≈ 0.95 (nearly recovered)
//
// ACTIVATION_INCREMENT: strength added per traversal.
// With DECAY=0.82, steady-state for pair used
// every cycle: strength = 1/(1-0.82) = 5.56
//
// MAX_STRENGTH: caps accumulation.
//
// INHIBITION_SLOPE: shapes the factor curve.
//   factor = 1 / (1 + strength × SLOPE)
//   At strength=0:    factor = 1.00 (full novelty)
//   At strength=1:    factor = 0.71
//   At strength=3:    factor = 0.45
//   At steady-state ≈5.5: factor ≈ 0.31
//   → Novel paths 3× stronger than saturated loops.
// ======================================

const DECAY_RATE          = 0.82;
const ACTIVATION_INCREMENT = 1.0;
const MAX_STRENGTH         = 6.0;
const INHIBITION_SLOPE     = 0.40;




// ======================================
// RECORD ACTIVATION
// ──────────────────────────────────────
// Call when the brain ACTUALLY MOVES along
// a path (not during candidate evaluation).
//
// Candidate scoring evaluates dozens of pairs
// per step — recording there would cause
// premature inhibition of valid candidates.
// Only ACTUAL traversal represents real
// semantic pathway activation.
//
// Called from: runAgent, after agentCurrent=next
// ======================================

export function recordSemanticActivation(fromLabel, toLabel, strengthMultiplier = 1.0) {

    const key = fromLabel + "->" + toLabel;

    const current = activationStrength.get(key) || 0;

    // strengthMultiplier > 1.0 when called from prediction error feedback:
    // wrong predictions cause STRONGER refractory inhibition,
    // further reducing the semantic bonus for this pair.
    activationStrength.set(
        key,
        Math.min(
            current + ACTIVATION_INCREMENT * Math.max(0.1, strengthMultiplier),
            MAX_STRENGTH
        )
    );

}




// ======================================
// GET REFRACTORY FACTOR
// ──────────────────────────────────────
// Returns [0, 1] multiplier for meaningBoost.
//
// Called during candidate scoring in candidateAnalysis.
// Reduces semantic bonus for recently traversed pairs.
// Does NOT record activation (read-only query).
// ======================================

export function getSemanticActivationFactor(fromLabel, toLabel) {

    const key = fromLabel + "->" + toLabel;

    const strength = activationStrength.get(key) || 0;

    // refractory formula: smooth inhibition curve
    return 1.0 / (1.0 + strength * INHIBITION_SLOPE);

}




// ======================================
// DECAY ALL ACTIVATIONS
// ──────────────────────────────────────
// Call ONCE per runAgentLoop cycle (≈500ms).
// NOT inside runAgent (would decay 5× per loop).
//
// Allows refractory recovery over time.
// Pairs not traversed for several cycles
// automatically return to full strength.
// This IS the novelty pressure mechanism:
// novel paths maintain factor=1.0, while
// established loops decay toward factor≈0.31.
// ======================================

export function decaySemanticActivations() {

    activationStrength.forEach((strength, key) => {

        const newStrength = strength * DECAY_RATE;

        if (newStrength < 0.005) {

            // fully recovered — remove entry to save memory
            activationStrength.delete(key);

        } else {

            activationStrength.set(key, newStrength);

        }

    });

}




// ======================================
// GET ACTIVATION STRENGTH
// For debugging and HUD display
// ======================================

export function getActivationStrength(fromLabel, toLabel) {

    return activationStrength.get(
        fromLabel + "->" + toLabel
    ) || 0;

}
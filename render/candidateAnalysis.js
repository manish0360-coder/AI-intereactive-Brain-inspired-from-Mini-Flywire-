// ======================================
// 🧠 CANDIDATE ANALYSIS SYSTEM
// ======================================
// analyzes one possible future choice
// before final scoring
// ======================================



// ======================================
// IMPORT SYSTEMS
// ======================================

import {

    similarity

} from "./embeddings.js";



import {

    findNeuronById

} from "./search.js";



import {

    conceptRelations

} from "./knowledge.js";



// ======================================
// SEMANTIC REFRACTORY SYSTEM
// ──────────────────────────────────────
// Prevents attractor-collapse by reducing
// semantic bonus for recently traversed pairs.
// Novel pairs maintain full strength.
// ======================================

import {

    getSemanticActivationFactor

} from "./semanticActivation.js";



// ======================================
// EPISTEMIC UNCERTAINTY LEDGER
// ──────────────────────────────────────
// Semantic uncertainty: separate from procedural.
// A concept pair may be semantically ambiguous
// (high semantic uncertainty) but procedurally
// reliable (low procedural uncertainty).
// Both are tracked independently.
// ======================================

import {

    getCombinedSemanticUncertainty

} from "./uncertaintyLedger.js";




// ======================================
// ANALYZE ONE CANDIDATE
// ======================================

export function analyzeCandidate({

    currentKey,
    candidateKey,

    startNeuron,

    penalties,
    signals,
    timeMemory,

    goalNeuronId,
    canReachGoal

}) {




    // ======================================
    // BLOCK BAD PATHS
    // ======================================

    // heavily punished path
    if (

        penalties.get(

            currentKey + "->" + candidateKey

        ) > 10

    ) {

        return null;

    }


    // ======================================
    // 🚫 BLOCK SELF LOOPS
    // examples:
    // lion -> lion
    // eat -> eat
    // ======================================

    if (

        currentKey === candidateKey

    ) {

        // self-loop rejection is a background filter, not a cognitive event
        // console.log removed to reduce console noise

        return null;

    }




    // cannot reach goal
    if (

        goalNeuronId !== null &&

        !canReachGoal(
            candidateKey,
            goalNeuronId
        )

    ) {

        return null;

    }




    // ======================================
    // FIND TARGET NEURON
    // ======================================

    const targetNeuron =
    findNeuronById(candidateKey);




    // invalid neuron
    if (!targetNeuron) {

        return null;

    }




    // ======================================
    // LABELS
    // ======================================

    const label1 =
    startNeuron.userData.label;



    const label2 =
    targetNeuron.userData.label;




    // ======================================
    // SEMANTIC SIMILARITY
    // ======================================

    const score = similarity(

        startNeuron.userData.embedding,

        targetNeuron.userData.embedding

    );


    // stop semantic domination
    const clampedScore = Math.max(

        -0.3,

        Math.min(score, 0.3)

    );




    // ======================================
    // SEMANTIC MEANING BONUS
    // WITH COMPOSITIONAL REASONING (Flaw 3 fix)
    // ──────────────────────────────────────
    // Level 1 — DIRECT connection:
    //   conceptRelations[A].includes(B) → boost 0.08
    //
    // Level 2 — TRANSITIVE connection:
    //   ∃ mid: A→mid AND mid→B → boost 0.04
    //   (half strength — one step indirect)
    //
    // WHY: "lion→hunt" and "hunt→meat" trained.
    //   Without compositionality: lion→meat gets 0.
    //   With compositionality: lion→meat gets 0.04.
    //   Semantic field becomes a proper closure.
    //
    // Both levels apply refractory + semantic trust
    // factors from the provenance + uncertainty systems.
    // ======================================

    let meaningBoost = 0;
    let connectionLevel = 0; // 1=direct, 2=transitive

    // Level 1: direct
    if (conceptRelations[label1] &&
        conceptRelations[label1].includes(label2)) {
        meaningBoost    = 0.08;
        connectionLevel = 1;
    }

    // Level 2: one-step transitive (only if not already direct)
    if (connectionLevel === 0 && conceptRelations[label1]) {

        for (const mid of conceptRelations[label1]) {

            if (conceptRelations[mid] &&
                conceptRelations[mid].includes(label2)) {

                meaningBoost    = 0.04;  // half strength
                connectionLevel = 2;
                break;

            }
        }
    }

    if (meaningBoost > 0) {

        // get refractory factor [0, 1]
        const refractoryFactor =
            getSemanticActivationFactor(label1, label2);

        // semantic uncertainty gate from ledger
        const semanticUnc = getCombinedSemanticUncertainty(label1, label2);
        const semanticTrustFactor = 1.0 - semanticUnc * 0.80;

        // transitive connections get additional dampening
        const compositionalDamp = (connectionLevel === 2) ? 0.75 : 1.0;

        meaningBoost *= refractoryFactor * semanticTrustFactor * compositionalDamp;

        // semantic bonus logs removed: fire on every candidate with a
        // conceptRelation match — multiple times per agent step.
        // Semantic bonus is visible in the HUD semantic pressure score.

    }




    // ======================================
    // ATTENTION BONUS
    // ======================================

    const attention =

        startNeuron.userData.neighbors
        .includes(candidateKey)

        ? 0.4

        : 0.1;




    // ======================================
    // SIGNAL STRENGTH
    // ======================================

    const signalKey =

        currentKey + "->" + candidateKey;




    const signal =

        signals.get(signalKey)

        || 0;




    // ======================================
    // TIME DECAY
    // ======================================

    const timeKey =

        currentKey + "->" + candidateKey;




    // last usage timestamp
    const lastUsed =

        timeMemory.get(timeKey)

        || 0;




    // time passed
    const age =

        Date.now() - lastUsed;




    // newer memory stronger
    const timeScore =

        Math.exp(-age / 30000);




    // ======================================
    // GOAL GUIDANCE — REMOVED FROM HERE
    // ──────────────────────────────────────
    // The old goalBoost (goalSim*2 + exact
    // bonus +3) was ungated by trajectory
    // confidence. It let semantic similarity
    // alone inflate shortcuts like dog→eat
    // even when those paths were never
    // episodically witnessed.
    //
    // Goal gradient is now computed entirely
    // in main.js using trajectoryConfidence()
    // gating: non-episodic transitions get
    // 0 boost; trained transitions get full
    // gradient. analyzeCandidate no longer
    // participates in goal guidance.
    //
    // goalBoost kept as 0 for return compat.
    // ======================================

    const goalBoost = 0;




    // ======================================
    // RETURN ANALYSIS
    // ======================================

    return {

        targetNeuron,

        label1,
        label2,

        clampedScore,

        meaningBoost,

        attention,

        signal,

        timeScore,

        goalBoost,

        episodeMatch:

            timeMemory.get(
                startNeuron.id + "->" + candidateKey
            )

            ? 1
            : 0,

    };

}
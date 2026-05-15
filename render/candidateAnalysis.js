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

        console.log(

            "🚫 self loop rejected:",

            currentKey

        );

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




    // ======================================
    // SEMANTIC MEANING BONUS
    // ======================================

    let meaningBoost = 0;




    // related concepts
    if (

        conceptRelations[label1]

    ) {

        if (

            conceptRelations[label1]
            .includes(label2)

        ) {

            meaningBoost = 3;

            console.log(

                "🧠 semantic bonus:",

                label1,

                "->",

                label2

            );

        }

    }




    // ======================================
    // ATTENTION BONUS
    // ======================================

    const attention =

        startNeuron.userData.neighbors
        .includes(candidateKey)

        ? 2

        : 1;




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

        Math.exp(-age / 5000);




    // ======================================
    // GOAL GUIDANCE
    // ======================================

    let goalBoost = 0;




    if (goalNeuronId !== null) {

        const goalNeuron =
        findNeuronById(goalNeuronId);




        if (goalNeuron) {

            const goalSim = similarity(

                targetNeuron.userData.embedding,

                goalNeuron.userData.embedding

            );




            // gentle guidance
            goalBoost =

                Math.max(0, goalSim) * 2;




            // exact goal bonus
            if (

                candidateKey === goalNeuronId

            ) {

                goalBoost += 3;

            }

        }

    }




    // ======================================
    // RETURN ANALYSIS
    // ======================================

    return {

        targetNeuron,

        label1,
        label2,

        score,

        meaningBoost,

        attention,

        signal,

        timeScore,

        goalBoost

    };

}
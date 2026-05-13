// ======================================
// 🧠 SEMANTIC EMBEDDING SYSTEM
// ======================================
// compares meaning similarity between
// current neuron and all other neurons
// ======================================



// ======================================
// IMPORT EMBEDDING SIMILARITY
// ======================================

import {

    similarity

} from "./embeddings.js";




// ======================================
// BUILD SEMANTIC RELATIONSHIP MAP
// ======================================

export function buildSemanticMap({

    neuronMap,

    currentKey,

    startNeuron

}) {

    // stores semantic relationship strengths
    const embeddingMap = new Map();




    // ======================================
    // CHECK ALL NEURONS
    // ======================================

    neuronMap.forEach((neuron, id) => {




        // skip current neuron itself
        if (id === currentKey) return;




        // ======================================
        // CALCULATE EMBEDDING SIMILARITY
        // ======================================

        const sim = similarity(

            startNeuron.userData.embedding,

            neuron.userData.embedding

        );




        // ======================================
        // STORE SEMANTIC WEIGHT
        // ======================================

        embeddingMap.set(

            id,

            sim * 2

        );

    });




    // return semantic map
    return embeddingMap;

}
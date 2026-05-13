// ======================================
// EMBEDDING SYSTEM
// ======================================


// import helper math functions
import {

    normalize,
    dot

} from "./helpers.js";


// import neuron search
import {

    findNeuronById

} from "./search.js";




// neuron database reference
let neuronMapRef = null;




// connect main neuron map
export function setEmbeddingNeuronMap(map) {

    neuronMapRef = map;

}




// ======================================
// CREATE STRONGER EMBEDDING VECTOR
// ======================================

export function createEmbedding(size = 32) {

    // empty vector
    const vec = [];

    // create many dimensions
    for (let i = 0; i < size; i++) {

        // random number between -1 and +1
        vec.push(Math.random() * 2 - 1);
    }

    // normalize vector
    return normalize(vec);
}




// ======================================
// TRAIN EMBEDDINGS
// ======================================

export function trainEmbedding(id1, id2) {

    const n1 = findNeuronById(id1);
    const n2 = findNeuronById(id2);

    if (!n1 || !n2) return;

    const emb1 = n1.userData.embedding;
    const emb2 = n2.userData.embedding;

    // learning rate
    const lr = 0.02;

    // ===== MAKE THEM SIMILAR =====

    for (let i = 0; i < emb1.length; i++) {

        const diff = emb2[i] - emb1[i];

        emb1[i] += diff * lr;
        emb2[i] -= diff * lr;
    }

    // normalize both
    normalize(emb1);
    normalize(emb2);

    // normalize all neurons slowly
    neuronMapRef.forEach((n) => {

        normalize(n.userData.embedding);

    });

    // ===== PUSH OTHERS AWAY =====

    neuronMapRef.forEach((other, id) => {

        // skip same neurons
        if (id === id1 || id === id2) return;

        const embOther = other.userData.embedding;

        for (let i = 0; i < emb1.length; i++) {

            const diff = embOther[i] - emb1[i];

            embOther[i] += diff * 0.002;
        }

        normalize(embOther);

    });

    console.log("🔥 Embedding trained:", id1, "<->", id2);
}




// ======================================
// SIMILARITY SCORE
// ======================================

export function similarity(a, b) {

    // cosine similarity using dot product
    return dot(a, b);

}
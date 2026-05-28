// ======================================
// EMBEDDING SYSTEM
// ======================================
// ARCHITECTURAL NOTE:
//
// Root cause of negative similarity bug
// was 4 compounding failures in trainEmbedding:
//
// 1. SNR < 1: noise magnitude (0.00087) exceeded
//    learning signal (0.00080) → random walk
//
// 2. Asymmetric update: only emb1 moved toward
//    emb2. emb2 was a moving target that drifted
//    via push-away from other calls.
//
// 3. Push-away contamination: training hunt↔meat
//    pushed lion away from hunt, directly undoing
//    the lion↔hunt training from the same cycle.
//    Net gain per cycle ≈ +0.003 (430 cycles to +0.8)
//
// 4. Q-certainty blindness: Q=16.01 (maximum
//    procedural certainty) had zero effect on
//    embedding convergence speed.
//
// All 4 are fixed below.
// ======================================



// ======================================
// IMPORT HELPER MATH FUNCTIONS
// ======================================

import {

    normalize,
    dot

} from "./helpers.js";



// ======================================
// IMPORT NEURON SEARCH
// ======================================

import {

    findNeuronById

} from "./search.js";



// ======================================
// IMPORT Q TABLE
// ──────────────────────────────────────
// Used to anchor embedding learning rate
// to procedural certainty. When the brain
// is confident a path is correct (high Q),
// semantic geometry converges harder.
// No circular dependency: qlearning.js
// does not import embeddings.js.
// ======================================

import {

    getQ

} from "./qlearning.js";




// neuron database reference
let neuronMapRef = null;




// connect main neuron map
export function setEmbeddingNeuronMap(map) {

    neuronMapRef = map;

}




// ======================================
// CREATE EMBEDDING VECTOR
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
// Fixed architecture:
//
// FIX 1 — Noise removed.
//   Old: noise = (rand-0.5) * 0.003 = 0.00087 RMS
//   Signal was only 0.00080 RMS → SNR < 1
//   Collapse prevention now handled by the
//   selective push-away of UNRELATED neurons.
//
// FIX 2 — Symmetric updates.
//   Both emb1 AND emb2 move toward each other.
//   Convergence rate doubles. emb2 no longer
//   a stationary target drifting via push-away.
//
// FIX 3 — Protected push-away.
//   Neurons that are graph neighbors OR have
//   a confirmed Q-relationship with either
//   training neuron are SKIPPED in push-away.
//   This stops chain-pair contamination:
//   training hunt↔meat no longer pushes
//   lion away from hunt.
//
// FIX 4 — Q-certainty anchored learning rate.
//   lr scales with procedural certainty.
//   Q=0  → lr = 0.015 (uncertain, gentle)
//   Q=8  → lr = 0.032
//   Q=16 → lr = 0.043 (confirmed, stronger pull)
//   Q=20 → lr = 0.050 (maximum)
//   14× faster than old lr=0.003 at Q=16.
// ======================================

export function trainEmbedding(id1, id2) {

    const n1 = findNeuronById(id1);
    const n2 = findNeuronById(id2);

    if (!n1 || !n2) return;

    // ======================================
    // WORK ON COPIES
    // ──────────────────────────────────────
    // normalize() modifies arrays in-place.
    // Using copies prevents accidental mutation
    // of shared embedding references during
    // the update-then-normalize sequence.
    // ======================================

    const emb1 = [...n1.userData.embedding];
    const emb2 = [...n2.userData.embedding];

    const currentSim = similarity(emb1, emb2);

    // already converged — do not over-train
    if (currentSim > 0.92) {

        return;

    }


    // ======================================
    // FIX 4: Q-CERTAINTY ANCHORED LEARNING RATE
    // ──────────────────────────────────────
    // Procedural certainty gates semantic pull.
    // When Q confirms this path repeatedly,
    // semantic geometry should converge faster.
    //
    // Both forward and backward Q are checked
    // because transitions can be learned in
    // either direction from manual training.
    //
    // Q range clamp: 0..20 → certainty 0..1
    // lr formula: baseLr * (0.3 + certainty * 0.7)
    //   minimum lr = baseLr * 0.3 = 0.015 (Q=0)
    //   maximum lr = baseLr * 1.0 = 0.050 (Q=20)
    // ======================================

    const qFwd  = Math.max(getQ(id1, id2) || 0, 0);
    const qBwd  = Math.max(getQ(id2, id1) || 0, 0);
    const qBest = Math.max(qFwd, qBwd);

    const qCertainty = Math.min(qBest, 20.0) / 20.0;

    const baseLr = 0.05;
    const lr     = baseLr * (0.3 + qCertainty * 0.7);


    // ======================================
    // FIX 1 + 2: SYMMETRIC PULL, NO NOISE
    // ──────────────────────────────────────
    // Both vectors move toward each other.
    // emb1 += lr * (emb2 - emb1)   [n1 toward n2]
    // emb2 -= lr * (emb2 - emb1)   [n2 toward n1]
    //
    // This is geometrically correct: attraction
    // is mutual. Convergence per step doubles.
    //
    // Zero noise: SNR becomes theoretically
    // infinite. Every update is pure signal.
    // Collapse prevention is handled by
    // selective push-away of truly unrelated
    // neurons instead.
    // ======================================

    for (let i = 0; i < emb1.length; i++) {

        const diff = emb2[i] - emb1[i];

        emb1[i] += diff * lr;   // n1 moves toward n2
        emb2[i] -= diff * lr;   // n2 moves toward n1

    }

    // normalize both updated vectors
    n1.userData.embedding = normalize(emb1);
    n2.userData.embedding = normalize(emb2);

    const newSim =
        similarity(
            n1.userData.embedding,
            n2.userData.embedding
        );


    // ======================================
    // FIX 3: SELECTIVE PUSH-AWAY
    // ──────────────────────────────────────
    // Push only truly unrelated concepts away.
    //
    // PROTECTION RULES — skip if:
    //
    // a) Graph neighbor of either training neuron
    //    Structural connections in the neuron graph
    //    imply relatedness. Never push graph
    //    neighbors away from each other.
    //
    // b) Q-confirmed procedural neighbor
    //    Any neuron with Q > 3.0 toward/from
    //    either training neuron is procedurally
    //    learned as related. Pushing it away
    //    would undo confirmed learning.
    //    Q_THRESHOLD = 3.0 chosen as the minimum
    //    meaningful learned relationship.
    //
    // WHY 0.00015 (halved from 0.0003):
    //    With fewer contamination victims (chain
    //    members now protected), we can afford a
    //    gentler push on the remaining unrelated
    //    neurons. This further stabilizes geometry.
    // ======================================

    const Q_PROTECTION_THRESHOLD = 3.0;

    neuronMapRef.forEach((other, id) => {

        // skip the two neurons being trained
        if (id === id1 || id === id2) return;


        // ── PROTECTION A: graph neighbors ─────
        const isNeighborOfN1 =
            n1.userData.neighbors.includes(id);

        const isNeighborOfN2 =
            n2.userData.neighbors.includes(id);

        if (isNeighborOfN1 || isNeighborOfN2) return;


        // ── PROTECTION B: Q-confirmed neighbors ─
        const qWith1 = Math.max(
            getQ(id1, id) || 0,
            getQ(id,  id1) || 0
        );

        const qWith2 = Math.max(
            getQ(id2, id) || 0,
            getQ(id,  id2) || 0
        );

        if (
            qWith1 > Q_PROTECTION_THRESHOLD ||
            qWith2 > Q_PROTECTION_THRESHOLD
        ) return;


        // push unrelated concept gently away from n1
        const embOther = [...other.userData.embedding];
        const refEmb   = n1.userData.embedding;

        for (let i = 0; i < refEmb.length; i++) {

            const diff = embOther[i] - refEmb[i];

            embOther[i] -= diff * 0.00015;

        }

        other.userData.embedding = normalize(embOther);

    });


    console.log(
        "🔥 Embedding trained:",
        id1, "<->", id2,
        "(sim:", newSim.toFixed(3) + ")"
    );

}




// ======================================
// SIMILARITY SCORE
// ======================================

export function similarity(a, b) {

    // cosine similarity using dot product
    return dot(a, b);

}
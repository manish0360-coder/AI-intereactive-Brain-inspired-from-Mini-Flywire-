// ======================================
// 🧠 COGNITIVE ATTENTION SYSTEM
// ======================================
// Biological basis: prefrontal attention
// selectively amplifies task-relevant signals
// and suppresses task-irrelevant ones.
//
// What this does:
//   - Maintains an attention focus vector
//     (weighted blend of recent rewarding nodes)
//   - Scores each candidate by how aligned
//     it is with current attention focus
//   - High attention score → amplified in decision
//   - Low attention score → suppressed
//   - Attention shifts when new goal is set
//     or when large prediction error occurs
//
// Mathematical model:
//   focus = EMA of embeddings of rewarded nodes
//   attention_score[i] = cosine(focus, embedding[i])
//   amplified_score[i] = raw[i] * (1 + attention * weight)
// ======================================

// ── Attention focus vector ─────────────────────────────────
// exponential moving average of rewarding embeddings
let attentionFocus = null;
let focusDimension = 32;

// ── Attention strength ─────────────────────────────────────
// how strongly attention amplifies signals
// [0, 1] — grows with consistent success
let attentionStrength = 0.3;

// ── Focus update rate (EMA alpha) ─────────────────────────
const FOCUS_ALPHA = 0.15;

// ── Goal embedding ────────────────────────────────────────
// set when user defines a goal node
let goalEmbedding = null;


// ======================================
// UPDATE ATTENTION FOCUS
// call when agent reaches a rewarding state
// embedding = the rewarding node's embedding
// reward = how rewarding it was
// ======================================

export function updateAttentionFocus(embedding, reward) {

    if (!embedding || embedding.length === 0) return;

    focusDimension = embedding.length;

    if (attentionFocus === null) {
        attentionFocus = [...embedding];
        return;
    }

    // EMA update — focus shifts toward rewarding nodes
    const alpha = FOCUS_ALPHA * Math.min(reward / 5, 1);

    for (let i = 0; i < focusDimension; i++) {
        attentionFocus[i] =
            (1 - alpha) * attentionFocus[i] +
            alpha       * embedding[i];
    }

    // normalize to maintain unit vector
    let mag = 0;
    for (let i = 0; i < focusDimension; i++) {
        mag += attentionFocus[i] * attentionFocus[i];
    }
    mag = Math.sqrt(mag);
    if (mag > 0) {
        for (let i = 0; i < focusDimension; i++) {
            attentionFocus[i] /= mag;
        }
    }
}


// ======================================
// SET GOAL ATTENTION
// when user SHIFT+CLICKS a goal,
// attention immediately shifts toward it
// ======================================

export function setGoalAttention(goalEmbeddingVec) {

    if (!goalEmbeddingVec) return;

    goalEmbedding = [...goalEmbeddingVec];

    // blend goal into attention focus strongly
    if (attentionFocus === null) {
        attentionFocus = [...goalEmbeddingVec];
    } else {
        for (let i = 0; i < goalEmbeddingVec.length; i++) {
            attentionFocus[i] =
                0.4 * attentionFocus[i] +
                0.6 * goalEmbeddingVec[i];
        }
    }

    console.log("🎯 Attention shifted toward goal");
}


// ======================================
// GET ATTENTION SCORE
// how aligned is this candidate with focus?
// returns [0, 1] where 1 = fully aligned
// ======================================

export function getAttentionScore(candidateEmbedding) {

    if (!attentionFocus || !candidateEmbedding) return 0.5;

    return Math.max(0, cosineSim(attentionFocus, candidateEmbedding));
}


// ======================================
// APPLY ATTENTION AMPLIFICATION
// modifies raw score based on attention
// aligned candidates amplified
// misaligned candidates suppressed
// ======================================

export function applyAttentionAmplification(rawScore, candidateEmbedding) {

    const attnScore = getAttentionScore(candidateEmbedding);

    // amplify aligned candidates
    // suppress misaligned ones
    const factor = 1 + (attnScore - 0.5) * attentionStrength * 2;

    return rawScore * Math.max(0.3, factor);
}


// ======================================
// STRENGTHEN ATTENTION
// when consistent successes occur
// attention becomes more focused
// ======================================

export function strengthenAttention(amount = 0.01) {

    attentionStrength = Math.min(attentionStrength + amount, 1.0);
}


// ======================================
// WEAKEN ATTENTION
// when prediction errors are high
// attention becomes more diffuse (explore)
// ======================================

export function weakenAttention(amount = 0.02) {

    attentionStrength = Math.max(attentionStrength - amount, 0.1);
}


// ======================================
// RESET ATTENTION FOCUS
// call when episode ends or topic shifts
// attention diffuses to explore new space
// ======================================

export function resetAttentionFocus() {

    // don't null it — just weaken and blend toward zero
    if (attentionFocus) {
        for (let i = 0; i < attentionFocus.length; i++) {
            attentionFocus[i] *= 0.5;
        }
    }

    goalEmbedding    = null;
    attentionStrength = Math.max(0.1, attentionStrength * 0.7);

    console.log("🔄 Attention diffused after episode end");
}


// ======================================
// GET SNAPSHOT
// for HUD
// ======================================

export function getAttentionSnapshot() {
    return {
        strength:   attentionStrength,
        hasFocus:   attentionFocus !== null,
        hasGoal:    goalEmbedding  !== null,
    };
}


function cosineSim(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
}
// ======================================
// 🧠 ACTIVATION COMPETITION ENGINE
// ======================================
// Biological basis: cortical columns compete
// via lateral inhibition. The strongest
// activation suppresses weaker ones.
//
// net[i] = raw[i] - sum(activation[j] * inhibWeight[i,j])
// output  = ReLU(net) → feeds into finalWeight
// ======================================

const activationState     = new Map();
const inhibitionWeights   = new Map();
const activationHistory   = new Map();
const HISTORY_WINDOW      = 8;
let   contextMask         = null;

export function setActivation(neuronId, value) {
    const clamped = Math.max(0, Math.min(value, 1));
    activationState.set(neuronId, clamped);
    const hist = activationHistory.get(neuronId) || [];
    hist.push(clamped);
    if (hist.length > HISTORY_WINDOW) hist.shift();
    activationHistory.set(neuronId, hist);
}

export function boostActivation(neuronId, boost) {
    const current = activationState.get(neuronId) || 0;
    setActivation(neuronId, current + boost);
}

export function decayActivations(decayRate = 0.92) {
    activationState.forEach((value, id) => {
        const decayed = value * decayRate;
        if (decayed < 0.001) activationState.delete(id);
        else activationState.set(id, decayed);
    });
}

export function computeLateralInhibition(candidateId, candidateEmbedding, allNeuronMap) {
    let totalInhibition = 0;
    activationState.forEach((activation, competitorId) => {
        if (competitorId === candidateId) return;
        if (activation < 0.05) return;
        const pairKey = Math.min(candidateId, competitorId) + "-" + Math.max(candidateId, competitorId);
        let inhibWeight = inhibitionWeights.get(pairKey);
        if (inhibWeight === undefined) {
            const competitor = allNeuronMap.get(competitorId);
            if (competitor && candidateEmbedding) {
                const sim = cosineSim(candidateEmbedding, competitor.userData.embedding);
                inhibWeight = Math.max(0, (1 - sim) * 0.5);
            } else {
                inhibWeight = 0.3;
            }
            inhibitionWeights.set(pairKey, inhibWeight);
        }
        totalInhibition += activation * inhibWeight;
    });
    return totalInhibition;
}

export function getCompetitionScore(candidateId, candidateEmbedding, rawScore, allNeuronMap) {
    const inhibition = computeLateralInhibition(candidateId, candidateEmbedding, allNeuronMap);
    return Math.max(0, rawScore - (inhibition * 2));
}

export function setContextMask(neuronIdSet) { contextMask = neuronIdSet; }
export function clearContextMask()          { contextMask = null; }
export function isContextEligible(neuronId) {
    return contextMask === null || contextMask.has(neuronId);
}

export function getActivationVolatility(neuronId) {
    const hist = activationHistory.get(neuronId);
    if (!hist || hist.length < 2) return 0;
    const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
    const variance = hist.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / hist.length;
    return Math.sqrt(variance);
}

export function getActivation(neuronId) { return activationState.get(neuronId) || 0; }

export function getTopActiveNeurons(n = 5) {
    const entries = [];
    activationState.forEach((activation, id) => entries.push({ id, activation }));
    return entries.sort((a, b) => b.activation - a.activation).slice(0, n);
}

function cosineSim(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
}
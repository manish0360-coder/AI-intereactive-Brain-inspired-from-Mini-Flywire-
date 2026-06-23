// ======================================
// M1 (The Spine)
// ======================================
// Deterministic, seedable pseudo-random source.
//
// WHY: the repo has 24 Math.random() sites and no seed control, so no
// two runs are comparable. This module gives cognition a reproducible
// random stream. Visual randomness (stars, neuronVisuals) stays on a
// SEPARATE stream so a variable number of render-frame draws can never
// desync the cognitive sequence — that separation is what makes the
// "same seed -> identical decisions" acceptance test robust.
//
// Pure ESM. No DOM. Node- and browser-safe.
// ======================================

// mulberry32: tiny, fast, well-distributed 32-bit PRNG.
export function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function next() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Named-stream registry. Cognition and visuals draw from different
// streams so they cannot perturb each other.
const streams = new Map();

export function initRng(seed) {
    streams.set("cognitive", makeRng(seed));
    streams.set("visual", makeRng((seed ^ 0x9e3779b9) >>> 0));
    return seed >>> 0;
}

export function rng(stream = "cognitive") {
    const s = streams.get(stream);
    if (!s) throw new Error(`rng stream "${stream}" not initialized — call initRng(seed) first`);
    return s();
}

// Convenience bound accessor for dependency injection into pure modules
// (e.g. scoring.calculateDecisionScore({ rng: cognitiveRng })).
export const cognitiveRng = () => rng("cognitive");
export const visualRng = () => rng("visual");
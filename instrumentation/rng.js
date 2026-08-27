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

    // ── M7 environment stream (Director ruling R1, 2026-08-20) ────────
    // Frozen M7_PREREGISTRATION.md §3.7 requires environment draws to come
    // from liveRng("environment"); §5.1 pins its seed as agentSeed XOR 0x5EED.
    // Without registration liveRng() falls through to Math.random(), so
    // environment draws would be silently irreproducible and the paired
    // design would break invisibly.
    //
    // ADDITIVE ONLY: the "cognitive" and "visual" generators above are
    // constructed from identical seeds by identical code, so their draw
    // sequences are unchanged. Registration order does not affect draws.
    streams.set("environment", makeRng((seed ^ 0x5EED) >>> 0));

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

// ======================================
// LIVE-PATH ACCESSOR  (Phase 1.0 / Q3)
// --------------------------------------
// The application (main.js, render/*) draws through this instead of
// Math.random(). It exists because rng() deliberately THROWS when a
// stream is uninitialised - correct for the offline harness, fatal
// for the browser, where nobody calls initRng().
//
// CONTRACT - the whole point of Q3:
//   no seed set  ->  returns exactly Math.random()  (legacy behaviour,
//                    byte-for-byte; the app is unchanged unless seeded)
//   seed set     ->  returns the named deterministic stream
//
// rng() keeps its throwing contract untouched, so the existing
// exec_influence harness and its acceptance tests are unaffected.
//
// STREAM CHOICE. "cognitive" for anything that can influence a
// decision, a memory write, or the agent trajectory. "visual" for
// render-only draws, so a variable number of frame draws can never
// desync the cognitive sequence - the separation rng.js was built
// around in the first place.
// ======================================

export function isSeeded() {
    return streams.size > 0;
}

export function liveRng(stream = "cognitive") {
    const s = streams.get(stream);
    return s ? s() : Math.random();
}
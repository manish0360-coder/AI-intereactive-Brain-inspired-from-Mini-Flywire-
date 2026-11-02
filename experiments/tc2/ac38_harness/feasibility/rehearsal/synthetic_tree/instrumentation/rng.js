// Synthetic, test-owned module for the AC38 harness rehearsal. Not application code.
// Same stream layout as the pinned tree's rng: three named mulberry32 streams, unseeded fallback.
export function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const streams = new Map();

export function initRng(seed) {
    streams.set("cognitive", makeRng(seed));
    streams.set("visual", makeRng((seed ^ 0x9e3779b9) >>> 0));
    streams.set("environment", makeRng((seed ^ 0x5EED) >>> 0));
    return seed >>> 0;
}

export function isSeeded() {
    return streams.size > 0;
}

export function liveRng(stream = "cognitive") {
    const s = streams.get(stream);
    return s ? s() : Math.random();
}

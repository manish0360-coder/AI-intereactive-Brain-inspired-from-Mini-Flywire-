// ======================================
// — M1 (The Spine)
// ======================================
// Append-only, synchronous, flag-gated event sink. Pure observation:
// emit() never feeds back into cognition. When disabled it is a no-op,
// which is what guarantees behavior-neutrality (decisions identical
// with telemetry on vs off under a fixed seed).
// ======================================

import { makeEnvelope, validateEnvelope } from "./traceSchema.js";

let enabled = false;
let strict = false;          // benchmark mode: invalid events throw
let runId = null;
const subscribers = [];

export function configureBus({ enable = false, strictValidation = false, run = null } = {}) {
    enabled = !!enable;
    strict = !!strictValidation;
    runId = run;
}

export function isEnabled() {
    return enabled;
}

export function subscribe(fn) {
    subscribers.push(fn);
    return () => {
        const i = subscribers.indexOf(fn);
        if (i >= 0) subscribers.splice(i, 1);
    };
}

// The single emit point. Cheap and side-effect-free for cognition.
export function emit({ tickId, channel, type, payload, rngDrawCount = null }) {
    if (!enabled) return;        // no-op when off — the behavior-neutrality guarantee
    const ev = makeEnvelope({ runId, tickId, channel, type, payload, rngDrawCount });
    const { ok, errors } = validateEnvelope(ev);
    if (!ok) {
        if (strict) throw new Error(`telemetry schema violation: ${errors.join("; ")}`);
        return;                  // interactive mode: drop rather than crash play
    }
    for (const fn of subscribers) fn(ev);
}

export function resetBus() {
    subscribers.length = 0;
    enabled = false;
    strict = false;
    runId = null;
}
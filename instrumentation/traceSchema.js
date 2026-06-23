// ======================================
// M1 (The Spine)
// ======================================
// Versioned event envelope + validators. Every telemetry event in
// MiniFlyWire shares this shape so traces stay analyzable across code
// changes. No channel may emit without a validator entry.
// ======================================

export const SCHEMA_VERSION = "1.0.0";

// Channels added one-per-milestone. M1 ships only what the decision
// path needs; later milestones extend CHANNELS, never reshape it.
export const CHANNELS = Object.freeze({
    TICK: "tick",
    DECISION: "decision",
});

export const TYPES = Object.freeze({
    TICK_OPEN: "tick.open",
    TICK_CLOSE: "tick.close",
    DECISION_FRAME: "decision.frame",
});

// Build a well-formed envelope. rngDrawCount lets analysis confirm two
// runs consumed randomness identically (a determinism cross-check).
export function makeEnvelope({ runId, tickId, channel, type, payload, rngDrawCount = null }) {
    return {
        schemaVersion: SCHEMA_VERSION,
        runId,
        tickId,
        channel,
        type,
        rngDrawCount,
        ts: Date.now(),
        payload,
    };
}

const REQUIRED = ["schemaVersion", "runId", "tickId", "channel", "type", "payload"];

// Validate an envelope. Returns { ok, errors }. In benchmark mode the
// bus treats !ok as a hard failure (fail loud, never silently drop).
export function validateEnvelope(ev) {
    const errors = [];
    if (ev == null || typeof ev !== "object") {
        return { ok: false, errors: ["envelope is not an object"] };
    }
    for (const k of REQUIRED) {
        if (!(k in ev)) errors.push(`missing field: ${k}`);
    }
    if (ev.schemaVersion !== SCHEMA_VERSION) {
        errors.push(`schemaVersion ${ev.schemaVersion} != ${SCHEMA_VERSION}`);
    }
    if (!Object.values(CHANNELS).includes(ev.channel)) {
        errors.push(`unknown channel: ${ev.channel}`);
    }
    if (!Object.values(TYPES).includes(ev.type)) {
        errors.push(`unknown type: ${ev.type}`);
    }
    return { ok: errors.length === 0, errors };
}
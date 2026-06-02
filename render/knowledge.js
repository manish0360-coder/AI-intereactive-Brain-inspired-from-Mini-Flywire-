// ======================================
// KNOWLEDGE SYSTEM — COGNITIVE AI v2
// ======================================
// 5 semantic clusters × 4 nodes each
// Primary training path:
// percept → signal → encode → schema
//         → infer  → predict → decide
//         → act    → reward  → identity

export const conceptRelations = {

    // ── PERCEPTION cluster ─────────────────
    percept:  ["signal", "context", "salience"],
    signal:   ["percept", "encode", "context"],
    context:  ["signal", "recall", "salience"],
    salience: ["percept", "context", "infer"],

    // ── MEMORY cluster ─────────────────────
    encode:   ["signal", "recall", "schema"],
    recall:   ["encode", "trace", "context"],
    trace:    ["recall", "schema", "reflect"],
    schema:   ["encode", "infer", "reward"],

    // ── REASONING cluster ──────────────────
    infer:    ["schema", "abstract", "predict"],
    abstract: ["infer", "recall", "decide"],
    predict:  ["infer", "abstract", "decide"],
    reflect:  ["trace", "predict", "reward"],

    // ── ACTION cluster ─────────────────────
    decide:   ["predict", "abstract", "act"],
    act:      ["decide", "adapt", "reward"],
    adapt:    ["act", "reflect", "trust"],
    goal:     ["decide", "adapt", "explore"],

    // ── LEARNING cluster ───────────────────
    reward:   ["act", "schema", "trust"],
    explore:  ["goal", "trust", "identity"],
    trust:    ["reward", "adapt", "recall"],
    identity: ["explore", "trust", "percept"],

};
// ======================================
// 🧠 SEMANTIC MEMORY LAYER
// ======================================
// Biological basis: cortical generalization.
// The hippocampus stores episodic specifics.
// The cortex extracts semantic schemas.
//
// What this does:
//   - Extracts generalizations from repeated episodes
//   - Builds concept schemas beyond raw pathways
//   - Suppresses noise (accidental single-occurrence edges)
//   - Strengthens genuine semantic relationships
//   - Provides noise-suppressed semantic score for decisions
//
// Key principle:
//   An edge eat→cat seen once = noise (score ~0)
//   An edge lion→hunt seen 15 times = semantic fact (score ~1)
//   This is the difference between episodic and semantic memory.
// ======================================

// ── Semantic strength per edge ─────────────────────────────
// key: "fromId->toId"
// value: { count, strength, lastSeen, schema }
const semanticEdges = new Map();

// ── Concept schemas ────────────────────────────────────────
// key: neuronLabel
// value: { relatedConcepts: Map<label, strength> }
const conceptSchemas = new Map();

// ── Noise threshold ────────────────────────────────────────
// edges seen fewer than this times are treated as noise
const NOISE_FLOOR = 3;

// ── Consolidation threshold ────────────────────────────────
// edges seen this many times become stable semantic facts
const CONSOLIDATION_THRESHOLD = 8;


// ======================================
// RECORD EDGE TRAVERSAL
// call every time agent or user traverses
// a fromId → toId transition
// ======================================

export function recordSemanticEdge(fromId, toId, fromLabel, toLabel, reward = 0) {

    const key = fromId + "->" + toId;
    const entry = semanticEdges.get(key) || {
        count:    0,
        strength: 0,
        lastSeen: 0,
        fromLabel,
        toLabel
    };

    entry.count++;
    entry.lastSeen = Date.now();

    // strength grows logarithmically with count
    // first few occurrences barely count (noise)
    // later occurrences build real strength
    if (entry.count >= NOISE_FLOOR) {
        const semanticGain = Math.log(entry.count - NOISE_FLOOR + 1) * 0.3;
        entry.strength = Math.min(entry.strength + semanticGain + (reward * 0.1), 10);
    }

    semanticEdges.set(key, entry);

    // update concept schemas if consolidated
    if (entry.count >= CONSOLIDATION_THRESHOLD) {
        updateConceptSchema(fromLabel, toLabel, entry.strength);
    }
}


// ======================================
// UPDATE CONCEPT SCHEMA
// generalizes beyond specific neuron IDs
// builds abstract concept relationships
// ======================================

function updateConceptSchema(fromLabel, toLabel, strength) {

    if (!fromLabel || !toLabel) return;

    const schema = conceptSchemas.get(fromLabel) || {
        relatedConcepts: new Map()
    };

    const existing = schema.relatedConcepts.get(toLabel) || 0;
    schema.relatedConcepts.set(
        toLabel,
        Math.min(existing + strength * 0.1, 10)
    );

    conceptSchemas.set(fromLabel, schema);
}


// ======================================
// GET SEMANTIC EDGE STRENGTH
// returns 0 for noise, >0 for real knowledge
// ======================================

export function getSemanticEdgeStrength(fromId, toId) {

    const key = fromId + "->" + toId;
    const entry = semanticEdges.get(key);

    if (!entry) return 0;
    if (entry.count < NOISE_FLOOR) return 0; // pure noise

    return entry.strength;
}


// ======================================
// IS NOISE EDGE
// true if this edge is probably accidental
// ======================================

export function isNoiseEdge(fromId, toId) {

    const key = fromId + "->" + toId;
    const entry = semanticEdges.get(key);

    if (!entry) return true;
    return entry.count < NOISE_FLOOR;
}


// ======================================
// GET SCHEMA STRENGTH
// concept-level relationship
// works even for novel neuron IDs
// if the labels have been learned before
// ======================================

export function getSchemaStrength(fromLabel, toLabel) {

    const schema = conceptSchemas.get(fromLabel);
    if (!schema) return 0;

    return schema.relatedConcepts.get(toLabel) || 0;
}


// ======================================
// GET NOISE-SUPPRESSED SCORE
// main function called from decision pipeline
//
// Combines:
//   semantic edge strength (count-based)
//   schema strength (label-based generalization)
//   noise penalty (single occurrences penalized)
//
// Returns score in [0, 3] range
// ======================================

export function getNoiseSuppressedScore(fromId, toId, fromLabel, toLabel) {

    const edgeStrength   = getSemanticEdgeStrength(fromId, toId);
    const schemaStrength = getSchemaStrength(fromLabel, toLabel);

    const entry = semanticEdges.get(fromId + "->" + toId);
    const count = entry ? entry.count : 0;

    // noise penalty — single occurrences get penalized
    const noisePenalty = count < NOISE_FLOOR
        ? -(NOISE_FLOOR - count) * 0.3
        : 0;

    return Math.max(0, edgeStrength * 0.6 + schemaStrength * 0.4 + noisePenalty);
}


// ======================================
// DECAY SEMANTIC MEMORY
// slow decay — semantic facts persist
// accidental edges fade faster (low count)
// call once every ~10 agent steps
// ======================================

export function decaySemanticMemory() {

    semanticEdges.forEach((entry, key) => {

        // high-count edges decay extremely slowly
        // low-count noise edges decay faster
        const decayRate = entry.count >= CONSOLIDATION_THRESHOLD
            ? 0.9998   // stable semantic knowledge
            : entry.count >= NOISE_FLOOR
                ? 0.998    // building knowledge
                : 0.97;    // noise — fades quickly

        entry.strength *= decayRate;

        if (entry.strength < 0.001 && entry.count < NOISE_FLOOR) {
            semanticEdges.delete(key);
        } else {
            semanticEdges.set(key, entry);
        }
    });

    // schemas decay very slowly
    conceptSchemas.forEach((schema, label) => {
        schema.relatedConcepts.forEach((strength, related) => {
            const decayed = strength * 0.9999;
            if (decayed < 0.001) {
                schema.relatedConcepts.delete(related);
            } else {
                schema.relatedConcepts.set(related, decayed);
            }
        });
    });
}


// ======================================
// GET SEMANTIC SUMMARY
// for HUD and debugging
// ======================================

export function getSemanticSummary() {

    let total = 0, consolidated = 0, noise = 0;

    semanticEdges.forEach(entry => {
        total++;
        if (entry.count >= CONSOLIDATION_THRESHOLD) consolidated++;
        if (entry.count < NOISE_FLOOR) noise++;
    });

    return {
        totalEdges:    total,
        consolidated,
        noise,
        schemas:       conceptSchemas.size
    };
}
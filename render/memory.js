// ======================================
// AI MEMORY SYSTEM
// ======================================



// transition memory
export const transitions = new Map();



// reward memory
export const rewards = new Map();



// punishment memory
export const penalties = new Map();








// confidence memory
// stores trusted successful paths
export const confidenceMap = new Map();



// signal strength memory
export const signals = new Map();



// thought history
export const thoughtTrail = [];



// curiosity tracking
export const curiosityMap = new Map();


// ======================================
// REMOVED: pathConfidence and episodeRewards
// ──────────────────────────────────────────
// These Maps were superseded by the episodic
// unification (episodeManager.js). Nothing
// writes to them after that refactor.
//
// pathConfidence  → now in confidenceMap
// episodeRewards  → now in episodicStore
//
// Kept here as comments to avoid import
// errors if any old code references them.
// ======================================
// export const pathConfidence = new Map();
// export const episodeRewards = new Map();
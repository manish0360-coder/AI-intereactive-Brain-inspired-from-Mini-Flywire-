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


// confidence memory for each path
export const pathConfidence = new Map();



// successful episode memory
export const episodeRewards = new Map();
// ==========================================================
// M40 NORMATIVE GATE SPECIFICATION (formulation artifact, M40-R1)
// ==========================================================
// The exact predicates M40-P1 must import. Nothing here runs an agent, reads a seed or touches
// production state: every function is pure over records that M40-P1 will produce.
//   research/preregistrations/M40_FUTURESCORE_TEMPORAL_FORMULATION.md  §7a, §12a, §12b, §14
// ==========================================================

// ---- locked decisions ---------------------------------------------------------------------------------
export const T_A = 1500;
export const T_SHIFT = 1500;
export const GRID = Object.freeze([250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000]);
export const TICKS_PER_LOOP = 5;

/** the argument of the last env.setTick call in a run of T ticks (run.js:251) */
export const lastSetTick = (T) => (Math.ceil(T / TICKS_PER_LOOP) - 1) * TICKS_PER_LOOP;
/** the reliability regime in force at a snapshot of T ticks, by env.js's own rule */
export const regimeAt = (T) => (lastSetTick(T) >= T_SHIFT ? 2 : 1);
/** the reliability vector that defines R* at a snapshot of T ticks */
export const oracleReliability = (cfg, T) => (regimeAt(T) === 1 ? cfg.pPhase1 : cfg.pPhase2);

// ---- §7a declared decision-relevant snapshot state under the M40 protocol ----------------------------------
//   direct      read from an exported binding
//   exposed     a module-local binding of main.js, read through one guarded in-memory getter
//   probe       RNG stream positions: continuation-relevant, NOT readout-relevant (each readout reseeds)
//   behavioral  private state no digest can reach; covered by the readout closure vector
export const STATE_COMPONENTS = Object.freeze([
  { id: 'Q', cls: 'direct', covers: 'Q state', source: 'render/qlearning.js export Q' },
  { id: 'transitions', cls: 'direct', covers: 'transition state', source: 'render/memory.js export transitions' },
  { id: 'rewards', cls: 'direct', covers: 'rewards', source: 'render/memory.js export rewards' },
  { id: 'penalties', cls: 'direct', covers: 'penalties', source: 'render/memory.js export penalties' },
  { id: 'curiosityMap', cls: 'direct', covers: 'learned state', source: 'render/memory.js export curiosityMap' },
  { id: 'confidenceMap', cls: 'direct', covers: 'learned state', source: 'render/memory.js export confidenceMap' },
  { id: 'signals', cls: 'direct', covers: 'learned state', source: 'render/memory.js export signals' },
  { id: 'thoughtTrail', cls: 'direct', covers: 'thoughtTrail', source: 'render/memory.js export thoughtTrail' },
  { id: 'recentMemory', cls: 'direct', covers: 'recentMemory', source: 'window.recentMemory' },
  { id: 'biology', cls: 'direct', covers: 'behavior state', source: 'render/behavior.js nine exported states' },
  { id: 'embeddings', cls: 'direct', covers: 'embeddings', source: 'neuron.userData.embedding via render/search.js findNeuronById' },
  { id: 'neighbors', cls: 'direct', covers: 'graph state', source: 'neuron.userData.neighbors' },
  { id: 'episodes', cls: 'direct', covers: 'episodes', source: 'render/episodeManager.js export episodicStore' },
  { id: 'pathTrust', cls: 'direct', covers: 'learned state', source: 'render/trustMemory.js exports pathAttempts, pathSuccesses' },
  { id: 'envCounters', cls: 'direct', covers: 'counters', source: 'experiments/m7/env.js getCounters()' },
  { id: 'decisionTrace', cls: 'direct', covers: 'memory/history', source: 'lastReasoning writes' },
  { id: 'persistence', cls: 'direct', covers: 'persistence', source: 'localStorage stub contents' },
  { id: 'adjacencyMemory', cls: 'exposed', covers: 'visit state', source: 'main.js:926 const adjacencyMemory' },
  { id: 'timeMemory', cls: 'exposed', covers: 'visit state', source: 'main.js:1015 const timeMemory' },
  { id: 'chainMemory', cls: 'exposed', covers: 'memory/history', source: 'main.js:808 const chainMemory' },
  { id: 'attentionMap', cls: 'exposed', covers: 'learned state', source: 'main.js:914 const attentionMap' },
  { id: 'lastDecision', cls: 'exposed', covers: 'memory/history', source: 'main.js:660 let lastDecision' },
  { id: 'agentRunning', cls: 'exposed', covers: 'memory/history', source: 'main.js:3075 let agentRunning' },
  { id: 'goalNeuronId', cls: 'exposed', covers: 'goal state', source: 'main.js:1017 let goalNeuronId' },
  { id: 'agentCurrent', cls: 'exposed', covers: 'current node', source: 'main.js:3081 let agentCurrent' },
  { id: 'rngPositions', cls: 'probe', covers: 'RNG state', source: 'draw index of cognitive, visual, environment streams' },
  { id: 'privateReadoutState', cls: 'behavioral', covers: 'any state that can affect the M40 readout',
    source: 'emotionMap, predictionError maps, schemaMemory, longTermConsolidation, semanticMemoryLayer, ' +
            'semanticVitality, semanticProvenance, executive and motivational state' },
]);
/** the state classes Repair 1 requires the digest to address */
export const REQUIRED_CLASSES = Object.freeze(['learned state', 'Q state', 'penalties', 'transition state', 'rewards',
  'episodes', 'behavior state', 'embeddings', 'memory/history', 'thoughtTrail', 'recentMemory', 'RNG state',
  'current node', 'goal state', 'any state that can affect the M40 readout']);
/** the ON-arm readout closure vector, per decision state; outcome-blind (no oracle, no ZERO) */
export const READOUT_FIELDS = Object.freeze(['poolKeys', 'poolWeights', 'futureBonusValues', 'bestChoiceON']);
export const RNG_STREAMS = Object.freeze(['cognitive', 'visual', 'environment']);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digestIds = () => STATE_COMPONENTS.filter(c => c.cls === 'direct' || c.cls === 'exposed').map(c => c.id);

// ---- §12a prefix equivalence at T_A --------------------------------------------------------------------------
// A: a run with input.ticks = 1500, captured after runOnce returns.
// B: a run with input.ticks = 3000, captured at the loop head where ticksExecuted === 1500, i.e. before
//    setTick(1500) and before any tick-1500 loop executes. B's continuation after capture is not used.
// Record shape: { ticksRequested, capturedAt, digest: {id: sha}, rng: {stream: drawIndex}, readouts: {u: {...}} }
export function prefixEquivalent(A, B) {
  const mismatches = [];
  if (A.ticksRequested !== T_A || A.capturedAt !== T_A) mismatches.push('A is not a truncated T_A run');
  if (B.ticksRequested !== 3000 || B.capturedAt !== T_A) mismatches.push('B is not a 3000-tick run captured at T_A');
  for (const id of digestIds()) if (A.digest[id] === undefined || !same(A.digest[id], B.digest[id])) mismatches.push(`digest:${id}`);
  for (const s of RNG_STREAMS) if (A.rng[s] === undefined || A.rng[s] !== B.rng[s]) mismatches.push(`rng:${s}`);
  const states = Object.keys(A.readouts || {});
  if (!states.length || !same(states, Object.keys(B.readouts || {}))) mismatches.push('readouts:states');
  for (const u of states) for (const f of READOUT_FIELDS) {
    if (!same(A.readouts[u][f], B.readouts[u] && B.readouts[u][f])) mismatches.push(`readout:${u}:${f}`);
  }
  return { pass: mismatches.length === 0, mismatches };
}

// ---- §12b lookahead-diagnostic purity ---------------------------------------------------------------------------
// Record shape, all taken at the snapshot, in this order:
//   digestBefore → readoutsBefore → readoutsRepeat (idempotence control) → initRng(sentinel) →
//   DIAGNOSTIC → rngAfterDiagnostic (one probe per stream) → digestAfter → readoutsAfter
// rngExpected is the first draw of makeRng for each stream seeded exactly as initRng seeds it.
export function purityHolds(R) {
  const mismatches = [];
  for (const id of digestIds()) if (R.digestBefore[id] === undefined || !same(R.digestBefore[id], R.digestAfter[id])) mismatches.push(`digest:${id}`);
  for (const s of RNG_STREAMS) if (R.rngExpected[s] === undefined || R.rngExpected[s] !== R.rngAfterDiagnostic[s]) mismatches.push(`rng:${s}`);
  if (!Object.keys(R.readoutsBefore || {}).length) mismatches.push('readouts:missing');
  if (!same(R.readoutsBefore, R.readoutsRepeat)) mismatches.push('control:readouts-not-idempotent');
  if (!same(R.readoutsBefore, R.readoutsAfter)) mismatches.push('readouts:changed-by-diagnostic');
  return { pass: mismatches.length === 0, mismatches };
}
/** the seeds initRng gives each stream (instrumentation/rng.js:33-46), for the sentinel expectation */
export const streamSeeds = (sentinel) => ({
  cognitive: sentinel >>> 0,
  visual: (sentinel ^ 0x9e3779b9) >>> 0,
  environment: (sentinel ^ 0x5EED) >>> 0,
});

// ---- §12 stage-1 go/no-go: the saturation half of X5 at T_A only, outcome-blind ------------------------------------
// input: [{ state, poolValues: [futureBonus of each candidate in P] }] pooled over the four fixtures at T_A
export function goNoGo(atTA) {
  const rankable = atTA.filter(r => new Set(r.poolValues).size >= 2).length;
  return { go: rankable > 0, rankable };
}

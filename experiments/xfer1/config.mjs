// ==========================================================
// XFER-1 — experience-transfer causal-ablation harness: configuration
// ==========================================================
// STATUS: DEVELOPMENT / EXPLORATORY.  Nothing here is preregistered, frozen or confirmatory, and no registered or
// held-out seed is touched.  The module is data and pure helpers only (no I/O), so a verifier can import it safely.
//
// Question (one sentence): does experience that the live runtime itself acquired in an earlier session of the
// hidden-reliability task, persisted through the product's own saveBrain / loadBrain path, change the outcomes of a
// NEW session in the same world, and which persisted component carries it?
//
// Substrate: the M7-conformed B2 tree that H1-R and MCF-1 measure (experiments/h1r/build_tree.mjs).  No production
// file is read for behaviour and none is modified.  The runtime, the transform and the measurement sink are not
// changed; the harness only delivers a brain (through loadBrain()'s single read) and reads the stores afterwards.
// ==========================================================
import crypto from 'node:crypto';

export const SCHEMA = 'xfer1/1';
export const STUDY = 'XFER-1';
export const STATUS = 'DEVELOPMENT_EXPLORATORY';

// ---- worlds (accepted M7 configurations) ----
// generateAcceptedStream(CONFIG_START, WORLDS_TOTAL) gives the accepted configurations in one ascending pass; goals
// cycle by index.  A session is driven with configSeed = the ACCEPTED seed and configIndex = the stream index, which
// reproduces the stream element exactly (0 rejections).  The start sits below the held-out floor and outside every
// registered block.  Two disjoint blocks of worlds: A (exploratory, where the arms were chosen) and B (replication of
// the contrasts declared in the README before B was run).
export const CONFIG_START = 200_000;
export const HELDOUT_FLOOR = 900_500;
export const BLOCKS = Object.freeze({ A: Object.freeze({ lo: 0, hi: 39 }), B: Object.freeze({ lo: 40, hi: 79 }) });
export const WORLDS_TOTAL = 80;
export const blockOf = (world) => (world >= BLOCKS.A.lo && world <= BLOCKS.A.hi ? 'A' : world >= BLOCKS.B.lo && world <= BLOCKS.B.hi ? 'B' : null);

// ---- agent seeds ----
// Raw seeds stay inside the exploratory development domain that MCF-1 already declares (1_100_000_000..1_100_199_999),
// above the cold census range (1_100_000_000..1_100_002_399), so no census or dev-pipeline seed is reused.
// Sessions of world i: train = SEED_BASE + 2 i, test = SEED_BASE + 2 i + 1.  Every arm of one world shares the test seed
// (same boot, same ordered cognitive stream, same environment stream), so arms are paired by construction.
export const SEED_BASE = 1_100_100_000;
export const SEED_LIMIT = 1_100_199_999;
export const trainSeed = (i) => SEED_BASE + 2 * i;
export const testSeed = (i) => SEED_BASE + 2 * i + 1;

// ---- session length ----
// 'step' tick unit: runAgent() calls.  1500 stays inside Phase I of the M7 protocol (the reliability swap is at
// tick 1500), so every session is stationary: the world a session starts in is the world it ends in.
export const TICKS = Object.freeze({ train: 1500, test: 1500 });
export const EARLY_WINDOW = 500;           // the early-window endpoint covers runAgent() calls [0, 500)

// ---- persisted components (exactly the fields product saveBrain() writes, minus identity) ----
// The identity fields (homeNeuronId, goalNeuronId) are never delivered: the harness sets the goal itself, and a
// donor world's goal must not be able to override it.
export const COMPONENTS = Object.freeze(['transitions', 'rewards', 'penalties', 'signals', 'curiosity', 'Q', 'confidence', 'episodes']);
export const PROCEDURAL = Object.freeze(['transitions', 'rewards', 'penalties', 'signals', 'curiosity']);

// ---- arms ----
// source: 'none' (no brain), 'own' (the same world's training brain), 'donor' (another world, same goal, same block)
const arm = (source, keep) => Object.freeze({ source, keep: Object.freeze([...keep]) });
export const ARMS = Object.freeze({
  COLD: arm('none', []),
  FULL: arm('own', COMPONENTS),
  SHAM: arm('donor', COMPONENTS),
  PROC: arm('own', PROCEDURAL),
  NOPROC: arm('own', COMPONENTS.filter(c => !PROCEDURAL.includes(c))),
  SHAM_PROC: arm('donor', PROCEDURAL),
  SHAM_EPIS: arm('donor', ['episodes']),
  ...Object.fromEntries(COMPONENTS.map(c => [`ONLY_${c}`, arm('own', [c])])),
  ...Object.fromEntries(COMPONENTS.map(c => [`NO_${c}`, arm('own', COMPONENTS.filter(x => x !== c))])),
});
export const ARM_ORDER = Object.freeze(Object.keys(ARMS));

// ---- endpoints (declared before any outcome is read; see README) ----
//   E1 goalReaches     number of episodes ended by reaching the goal in the test session   (primary, higher is better)
//   E2 attemptSuccess  successful environment draws / environment draws                     (higher is better)
//   E3 slipsPerCall    failed environment draws per runAgent() call                         (lower is better)
//   E4 earlyReaches    goal reaches whose call index < EARLY_WINDOW
export const ENDPOINTS = Object.freeze(['goalReaches', 'attemptSuccess', 'slipsPerCall', 'earlyReaches']);

// ---- declared contrasts: [name, treatmentArm, referenceArm]; the effect is E(treatment) - E(reference), per world ----
export const CONTRASTS = Object.freeze([
  Object.freeze(['PRIMARY: persisted brain vs none', 'FULL', 'COLD']),
  Object.freeze(['world-specificity: own brain vs donor brain', 'FULL', 'SHAM']),
  Object.freeze(['donor brain vs none', 'SHAM', 'COLD']),
  Object.freeze(['episodes alone vs none', 'ONLY_episodes', 'COLD']),
  Object.freeze(['procedural stores alone vs none', 'PROC', 'COLD']),
  Object.freeze(['everything but procedural vs none', 'NOPROC', 'COLD']),
  Object.freeze(['donor procedural vs none', 'SHAM_PROC', 'COLD']),
  Object.freeze(['donor episodes vs none', 'SHAM_EPIS', 'COLD']),
  ...COMPONENTS.map(c => Object.freeze([`only ${c} vs none`, `ONLY_${c}`, 'COLD'])),
  ...COMPONENTS.map(c => Object.freeze([`leave out ${c}: brain without it vs full brain`, `NO_${c}`, 'FULL'])),
  // added AFTER block A was analysed (A suggested them); block B is their first test
  Object.freeze(['post-A: episodes, own world vs donor world', 'ONLY_episodes', 'SHAM_EPIS']),
  Object.freeze(['post-A: episodes alone vs the full brain', 'ONLY_episodes', 'FULL']),
  Object.freeze(['post-A: episodes alone vs everything but procedural', 'ONLY_episodes', 'NOPROC']),
]);
export const PRIMARY = Object.freeze({ endpoint: 'goalReaches', contrast: 'PRIMARY: persisted brain vs none' });

// ---- analysis ----
export const BOOTSTRAP = Object.freeze({ replicates: 10_000, seed: 20261014, level: 0.95 });

// ---- helpers ----
export function canonicalJson(x) {
  const norm = (v) => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])]));
    return v;
  };
  return JSON.stringify(norm(x));
}
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const hashObject = (o) => sha256(canonicalJson(o));

/** guard shared by the driver and the verifier: may this raw agent seed be used by XFER-1? */
export function seedOk(raw) {
  if (!Number.isSafeInteger(raw)) return { ok: false, why: 'agent seed must be a safe integer' };
  if (raw < SEED_BASE || raw > SEED_LIMIT) return { ok: false, why: 'agent seed is outside the XFER-1 domain' };
  return { ok: true };
}

/**
 * The declared plan for the worlds of a stream; pure, deterministic, no I/O.
 * donor = the next world with the same goal INSIDE THE SAME BLOCK (cyclic); null when the goal occurs once in the block.
 */
export function planWorlds(stream) {
  const groups = new Map();
  stream.forEach((w, i) => { const k = `${blockOf(i)}|${w.goal}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
  return stream.map((w, i) => {
    const same = groups.get(`${blockOf(i)}|${w.goal}`), pos = same.indexOf(i);
    const donor = same.length > 1 ? same[(pos + 1) % same.length] : null;
    return { world: i, block: blockOf(i), configSeed: w.acceptedSeed, configIndex: w.acceptedConfigIndex, goal: w.goal,
      rejectedBeforeAcceptance: w.numberOfRejectedCandidatesBeforeAcceptance, trainSeed: trainSeed(i), testSeed: testSeed(i), donor };
  });
}

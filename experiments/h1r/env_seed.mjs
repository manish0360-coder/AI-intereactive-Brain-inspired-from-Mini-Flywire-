// ==========================================================
// H1-R — R3 CONFIGURATION-SCOPED ENVIRONMENT STREAM (Director ruling R3, 2026-10-04)
// ==========================================================
// Erratum to frozen M7 §5.1 for H1-R runs: the environment stream seed is no longer
// `agentSeed XOR 0x5EED` (one stream shared by every configuration of an agent seed) but
//
//   envSeed = (B + slot · L · C) mod 2^32
//   C = 0x6d2b79f5   (the mulberry32 increment of instrumentation/rng.js makeRng)
//   L = 4096         (environment draws reserved per run; a run makes at most RUN_TICKS = 3000)
//   B = 0x60800000
//   slot = (agentSeed − 20260819000)·64 + blockCode·32 + acceptedConfigIndex
//   blockCode 0 = pilot block, 1 = held-out block; 0 <= acceptedConfigIndex < 32
//
// A mulberry32 seed is a starting state on one 2^32 cycle that advances by C per draw, so slot s
// starts exactly s·L draws after B: every (agentSeed, block, acceptedConfigIndex) owns its own
// disjoint L-draw segment. There is no arm term: every arm of one (configuration, agent seed)
// receives the same stream. The position uses the block and the accepted index, never the
// accepted configuration seed, so the derivation is known before any held-out configuration is
// generated (ERR-07 acceptance is sequential).
//
// Pure arithmetic: this module draws no random number and imports no generator.
// ==========================================================

export const ENV_STREAM = Object.freeze({
  rule: 'H1R-R3',
  C: 0x6d2b79f5,
  L: 4096,
  B: 0x60800000,
  agentSeedBase: 20260819000,
  slotsPerSeed: 64,
  slotsPerBlock: 32,
  // verified domain: the agent seeds of frozen §5.1 — pilot 20260819000–004, F-11 extension 005–009,
  // confirmatory 100–119 — as offsets from agentSeedBase. The overlap proof covers every slot of these
  // seeds (both blocks, every index < 32); any other agent seed is refused, because its segments are unproven.
  seedOffsets: Object.freeze([[0, 9], [100, 119]]),
  // per-run draw reserves used by the overlap proof; a run exceeding one is invalid (run_h1r.mjs)
  reserve: Object.freeze({ environment: 4096, cognitive: 1_000_000, visual: 65_536, sigma: 4096, config: 1024 }),
});

export const BLOCK_CODES = Object.freeze({ pilot: 0, heldout: 1 });

const M32 = 1n << 32n;
const big = (x) => BigInt(x);

function refuse(msg) { throw new Error(`H1R R3 env seed: ${msg}`); }

export function blockCodeOf(block) {
  if (!Object.prototype.hasOwnProperty.call(BLOCK_CODES, block)) refuse(`block must be 'pilot' or 'heldout', got ${JSON.stringify(block)}`);
  return BLOCK_CODES[block];
}

export function envSlot({ agentSeed, blockCode, acceptedConfigIndex }) {
  if (!Number.isSafeInteger(agentSeed)) refuse(`agentSeed must be an integer, got ${agentSeed}`);
  const off = agentSeed - ENV_STREAM.agentSeedBase;
  if (!ENV_STREAM.seedOffsets.some(([lo, hi]) => off >= lo && off <= hi))
    refuse(`agentSeed ${agentSeed} is outside the verified domain (${ENV_STREAM.seedOffsets.map(([lo, hi]) => `${ENV_STREAM.agentSeedBase + lo}–${ENV_STREAM.agentSeedBase + hi}`).join(', ')})`);
  if (blockCode !== 0 && blockCode !== 1) refuse(`blockCode must be 0 (pilot) or 1 (held-out), got ${blockCode}`);
  if (!Number.isInteger(acceptedConfigIndex) || acceptedConfigIndex < 0 || acceptedConfigIndex >= ENV_STREAM.slotsPerBlock)
    refuse(`acceptedConfigIndex must be an integer in [0, ${ENV_STREAM.slotsPerBlock}), got ${acceptedConfigIndex}`);
  return off * ENV_STREAM.slotsPerSeed + blockCode * ENV_STREAM.slotsPerBlock + acceptedConfigIndex;
}

export function envSeedForSlot(slot) {
  return Number((big(ENV_STREAM.B) + big(slot) * big(ENV_STREAM.L) * big(ENV_STREAM.C)) % M32);
}

export function envSeedFor(position) { return envSeedForSlot(envSlot(position)); }

// ---------------- stream arithmetic (for the overlap proof) ----------------
// makeRng(seed) starts at state (seed >>> 0) || 1; draw k (k = 1, 2, ...) is produced from state start + k·C.
export const startState = (seed) => { const s = big(Number(seed) >>> 0); return s === 0n ? 1n : s; };
let CINV = 1n;
for (let i = 0; i < 6; i++) CINV = ((CINV * (2n - big(ENV_STREAM.C) * CINV)) % M32 + M32) % M32;   // Newton: C^-1 mod 2^32
/** number of draws after which a generator started at state `a` reaches state `b` */
export const lagDraws = (a, b) => ((((b - a) % M32) + M32) % M32 * CINV) % M32;

/** every slot of the verified domain: [{ slot, agentSeed, blockCode, acceptedConfigIndex }] */
export function domainSlots() {
  const out = [];
  for (const [lo, hi] of ENV_STREAM.seedOffsets) for (let off = lo; off <= hi; off++)
    for (let blockCode = 0; blockCode < 2; blockCode++) for (let i = 0; i < ENV_STREAM.slotsPerBlock; i++) {
      const agentSeed = ENV_STREAM.agentSeedBase + off;
      out.push({ slot: envSlot({ agentSeed, blockCode, acceptedConfigIndex: i }), agentSeed, blockCode, acceptedConfigIndex: i });
    }
  return out;
}

/** the domain slots a stream [k, k + budget) draws after B touches (k = its lag from B; wrap handled) */
function slotsTouched(k, b, inDomain) {
  const L = big(ENV_STREAM.L), hit = [];
  const scan = (from, to) => {                        // draw interval [from, to) inside one cycle
    for (let s = from / L; s * L < to; s++) if (inDomain.has(Number(s))) hit.push(Number(s));
  };
  if (k + b <= M32) scan(k, k + b); else { scan(k, M32); scan(0n, k + b - M32); }
  return hit;
}

/**
 * Exact overlap proof over the verified domain.
 *   others: [{ id, seed, budget }]  non-environment streams (each read as `budget` draws from makeRng(seed))
 * env-env: every domain slot's seed must sit exactly slot·L draws after B (so the L-draw segments are
 * pairwise disjoint) and no seed may be 0 (makeRng would remap it). env-other: no other stream may touch
 * the segment of any domain slot. `hits` lists every (stream, slot) contact.
 */
export function overlapProof(others) {
  const L = big(ENV_STREAM.L), B = startState(ENV_STREAM.B);
  const D = domainSlots(), inDomain = new Set(D.map(d => d.slot));
  let identity = 0, zeroSeeds = 0, maxSlot = 0;
  for (const d of D) {
    const seed = envSeedForSlot(d.slot);
    if (seed === 0) zeroSeeds++;
    if (lagDraws(B, startState(seed)) === big(d.slot) * L) identity++;
    maxSlot = Math.max(maxSlot, d.slot);
  }
  if (big(maxSlot + 1) * L >= M32) refuse('lattice span exceeds the generator cycle');
  const hits = []; let worst = null;
  // the domain as maximal runs of consecutive slots, in draws after B: [lo, hi)
  const runs = [];
  for (const s of [...inDomain].sort((a, b) => a - b)) {
    const r = runs[runs.length - 1];
    if (r && r.hiSlot === s) r.hiSlot = s + 1; else runs.push({ loSlot: s, hiSlot: s + 1 });
  }
  for (const o of others) {
    const k = lagDraws(B, startState(o.seed)), b = big(o.budget);
    const touched = slotsTouched(k, b, inDomain);
    for (const s of touched) hits.push({ id: o.id, slot: s });
    // margin: draws between this stream and the nearest domain segment (-1 when touching)
    let margin = touched.length ? -1n : null;
    if (margin === null) for (const r of runs) {
      const lo = big(r.loSlot) * L, hi = big(r.hiSlot) * L;
      const after = ((k - hi) % M32 + M32) % M32;           // domain run end -> stream start
      const before = ((lo - (k + b)) % M32 + M32) % M32;    // stream end -> domain run start
      const m = after < before ? after : before;
      if (margin === null || m < margin) margin = m;
    }
    if (worst === null || margin < worst.margin) worst = { id: o.id, margin };
  }
  return { domainSlots: D.length, segmentDraws: ENV_STREAM.L, envIdentity: identity, zeroSeeds,
    others: others.length, contacts: hits.length, hits: hits.slice(0, 50),
    worstOther: worst ? { id: worst.id, marginDraws: Number(worst.margin) } : null };
}

/** do two draw segments [makeRng(a) draws 1..na] and [makeRng(b) draws 1..nb] share any state? */
export function segmentsOverlap(seedA, na, seedB, nb) {
  const k = lagDraws(startState(seedA), startState(seedB));   // b starts k draws after a
  return k < big(na) || (M32 - k) < big(nb);
}

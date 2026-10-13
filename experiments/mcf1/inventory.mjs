// ==========================================================
// MCF-1 — reserved stream-span inventory
// ==========================================================
// Every mulberry32 stream is a segment of ONE 2^32 cycle (instrumentation/rng.js).  A stream whose start
// state is `a` occupies the draw span [pos(a), pos(a)+R) where pos(a) = lagDraws(0, a) and R is the number
// of draws reserved for it.  Two streams share random numbers iff their spans intersect on the cycle.
//
// RESERVATION is not MEMBERSHIP.  This inventory reserves what was used or exposed by anything OTHER than this study's
// own registered list: explicit records, other studies' registered blocks, the verified domains, the examined
// exposures.  This study's own block (its admitted list, registered as one block record) is never reserved here; if it
// were, every admitted seed would overlap its own reservation and the admission scan would reject all of them.  An
// explicit registry record of this study is refused for the same reason (a study registers its list as a block).
//
// The registry (experiments/registry/typed.js) deliberately does NOT detect non-zero-lag overlap
// (M33-R1 Q-LAG: it "needs a per-run draw budget, a scientific parameter this module does not own").
// This module supplies it, from the sources below, with no new stream construction:
//
//   H1R_RECORDS_AND_DOMAIN  typed.js TRAJECTORY_RECORDS  U  the verified H1-R domain (env_seed.mjs ENV_STREAM),
//                           all four derived streams at the H1-R reserves
//   R3_ENV_SLOTS            env_seed.mjs domainSlots(): the 1,920 environment slot segments
//   EXPLORATORY_DEV_BLOCK   the scratch development block (used streams, Phase-1 budgets)
//   EXAMINED_*              the draws that were actually examined in aggregate (cognitive 1..800, environment #1)
//
// Pure arithmetic: no PRNG draw is evaluated, no agent is run, nothing is registered or consumed.
// ==========================================================
import crypto from 'node:crypto';
import { lagDraws, ENV_STREAM, envSeedForSlot, domainSlots } from '../h1r/env_seed.mjs';
import { trajectory, trajectorySeed, streamSeeds, memberListOf, TRAJECTORY_RECORDS } from '../registry/typed_v2.js';
import { STUDY, M32, DEV_BLOCK, EXPOSURE, BUDGETS, canonicalJson, sha256 } from './config.mjs';

export const STREAMS = Object.freeze(['cognitive', 'visual', 'environment', 'sigma']);
export const USED_STREAMS = Object.freeze(['cognitive', 'visual', 'environment']);

/** draw index of a stream start on the cycle (the registry's `|| 1` rule for a zero derived seed is applied). */
export const position = (derivedSeed) => Number(lagDraws(0n, BigInt((derivedSeed >>> 0) || 1)));
/** do two reserved spans intersect on the cycle? */
export const spansIntersect = (p1, r1, p2, r2) => {
  const f = ((p2 - p1) % M32 + M32) % M32, g = ((p1 - p2) % M32 + M32) % M32;
  return f < r1 || g < r2;
};
export const derivedSeeds = (raw) => streamSeeds(trajectorySeed(raw));

/** a sorted, query-able set of reserved spans */
export class SpanIndex {
  constructor(positions, radii) {
    const n = positions.length, order = Array.from({ length: n }, (_, i) => i).sort((a, b) => positions[a] - positions[b]);
    this.pos = new Float64Array(n); this.R = new Float64Array(n); this.maxR = 0;
    order.forEach((src, i) => { this.pos[i] = positions[src]; this.R[i] = radii[src]; if (radii[src] > this.maxR) this.maxR = radii[src]; });
    this.n = n;
  }
  _lower(x) { let lo = 0, hi = this.n; while (lo < hi) { const m = (lo + hi) >>> 1; if (this.pos[m] < x) lo = m + 1; else hi = m; } return lo; }
  /** does the span [p, p+r) intersect any indexed span? returns the index of one such span or -1 */
  firstOverlap(p, r) {
    if (this.n === 0) return -1;
    const a = (((p - this.maxR) % M32) + M32) % M32, len = this.maxR + r;
    const ranges = a + len <= M32 ? [[a, a + len]] : [[a, M32], [0, a + len - M32]];
    for (const [lo, hi] of ranges) {
      for (let i = this._lower(lo); i < this.n && this.pos[i] < hi; i++) if (spansIntersect(p, r, this.pos[i], this.R[i])) return i;
    }
    return -1;
  }
}

function spanDigest(positions, radii) {
  const b = Buffer.alloc(positions.length * 8);
  for (let i = 0; i < positions.length; i++) { b.writeUInt32LE(positions[i] >>> 0, i * 8); b.writeUInt32LE(radii[i] >>> 0, i * 8 + 4); }
  return crypto.createHash('sha256').update(b).digest('hex');
}

/** the verified H1-R domain, read from env_seed.mjs (never hard-coded here) */
export function h1rDomainSeeds() {
  const out = [];
  for (const [lo, hi] of ENV_STREAM.seedOffsets) for (let o = lo; o <= hi; o++) out.push(ENV_STREAM.agentSeedBase + o);
  return out;
}

export const ALL_CLASS_IDS = Object.freeze(['H1R_RECORDS_AND_DOMAIN', 'R3_ENV_SLOTS', DEV_BLOCK.id, ...EXPOSURE.map(e => e.id)]);

/**
 * Build the inventory.  `exclude` is for development dry runs only (an official inventory must contain every class).
 */
export function buildInventory({ budgets = BUDGETS, exclude = [] } = {}) {
  if (TRAJECTORY_RECORDS.some(r => r.study === STUDY)) throw new Error(`MCF-1 inventory refused: an explicit registry record of ${STUDY} exists; a study's own seeds must be registered as a block, never as records (they would be reserved against themselves)`);
  const classes = [], derived = new Set();
  const add = (id, source, descriptor, positions, radii) => {
    if (exclude.includes(id)) return;
    classes.push({ id, source, descriptor, spanCount: positions.length, spansSha256: spanDigest(positions, radii), index: new SpanIndex(positions, radii) });
  };
  // H1-R / M31 / M7 substrate: recorded values U verified domain, four derived streams at the H1-R reserves
  {
    const recorded = TRAJECTORY_RECORDS.map(r => r.value), domain = h1rDomainSeeds(), seeds = [...new Set([...recorded, ...domain])].sort((a, b) => a - b);
    const P = [], R = [];
    for (const v of seeds) { const s = derivedSeeds(v); for (const n of STREAMS) { P.push(position(s[n])); R.push(ENV_STREAM.reserve[n]); derived.add(s[n]); } }
    add('H1R_RECORDS_AND_DOMAIN', 'typed.js TRAJECTORY_RECORDS union env_seed.mjs verified domain; four derived streams at ENV_STREAM.reserve',
      { recordedValues: recorded.slice().sort((a, b) => a - b), domainSeeds: domain, union: seeds.length, reserve: ENV_STREAM.reserve }, P, R);
  }
  // blocks registered by OTHER studies: every member's four derived streams at the H1-R reserves (none exist today;
  // the class is absent, not empty, so the descriptor keeps its exact bytes until one does)
  {
    const others = otherStudyBlocks(trajectory);
    if (others.length) {
      const members = [...new Set(others.flatMap(b => memberListOf(b)))].sort((a, b) => a - b);
      const P = [], R = [];
      for (const v of members) { const s = derivedSeeds(v); for (const n of STREAMS) { P.push(position(s[n])); R.push(ENV_STREAM.reserve[n]); derived.add(s[n]); } }
      add('REGISTERED_BLOCKS_OTHER_STUDIES', 'registry blocks of studies other than MCF-1; four derived streams at ENV_STREAM.reserve',
        { blocks: others.map(b => ({ study: b.study, lo: b.lo, hi: b.hi, count: b.count, listSha256: b.listSha256 })), members: members.length, reserve: ENV_STREAM.reserve }, P, R);
    }
  }
  // R3 environment slot segments
  {
    const slots = domainSlots(), P = slots.map(sl => position(envSeedForSlot(sl.slot))), R = slots.map(() => ENV_STREAM.L);
    add('R3_ENV_SLOTS', 'env_seed.mjs domainSlots(): one segment of ENV_STREAM.L draws per (agent seed, block, index)', { segments: slots.length, segmentLength: ENV_STREAM.L }, P, R);
  }
  // exploratory development block (used streams at the Phase-1 budgets)
  {
    const P = [], R = [];
    const skip = exclude.includes(DEV_BLOCK.id);
    for (let k = 0; !skip && k < DEV_BLOCK.count; k++) { const s = derivedSeeds(DEV_BLOCK.start + k); for (const n of STREAMS) derived.add(s[n]); for (const n of USED_STREAMS) { P.push(position(s[n])); R.push(budgets[n]); } }
    add(DEV_BLOCK.id, DEV_BLOCK.source, { start: DEV_BLOCK.start, count: DEV_BLOCK.count, streams: USED_STREAMS, budgets: { cognitive: budgets.cognitive, visual: budgets.visual, environment: budgets.environment } }, P, R);
  }
  // examined exposures: only the draws that were actually looked at
  for (const e of EXPOSURE) {
    const P = [], R = [];
    // only the streams whose draws were examined enter the lag-0 identity set (visual and sigma were never evaluated)
    const skip = exclude.includes(e.id);
    for (let k = 0; !skip && k < e.count; k++) { const s = derivedSeeds(e.start + k); derived.add(s.cognitive); derived.add(s.environment); P.push(position(s.cognitive)); R.push(e.cognitive); P.push(position(s.environment)); R.push(e.environment); }
    add(e.id, e.source, { start: e.start, count: e.count, cognitive: e.cognitive, environment: e.environment }, P, R);
  }
  const descriptor = {
    schema: 'mcf1.inventory/1', budgets: { cognitive: budgets.cognitive, visual: budgets.visual, environment: budgets.environment },
    registry: registrySnapshot(),
    classes: classes.map(c => ({ id: c.id, source: c.source, descriptor: c.descriptor, spanCount: c.spanCount, spansSha256: c.spansSha256 })),
    derivedSeedCount: derived.size, excluded: exclude.slice().sort(),
  };
  return { descriptor, sha256: sha256(canonicalJson(descriptor)), classes, derived };
}

/** the registered blocks of every study except this one (a legacy registry object has none) */
export function otherStudyBlocks(registry = trajectory) {
  return (Array.isArray(registry.blocks) ? registry.blocks : []).filter(b => b.study !== STUDY);
}
/**
 * What the registry reserves FOR this study: explicit records, held-out ranges, authorizations and other studies'
 * blocks.  The study's own block is not part of it, so the value is invariant under this study's registration.
 * The `blocks` key is present only when another study has registered one, so the bytes (and every hash derived
 * from them) are unchanged for a registry without blocks.
 */
export function reservationView(registry = trajectory) {
  const blocks = otherStudyBlocks(registry);
  return { records: registry.records, heldOut: registry.heldOut, authorizations: registry.authorizations, ...(blocks.length ? { blocks } : {}) };
}
export function registrySnapshotOf(registry = trajectory) {
  const v = reservationView(registry);
  return { sha256: sha256(canonicalJson(v)), records: v.records.length, heldOutRanges: v.heldOut.length, authorizations: v.authorizations.length, ...(v.blocks ? { blocks: v.blocks.length } : {}) };
}
/** what the registry says right now (hashed so a later change is detectable) */
export function registrySnapshot() { return registrySnapshotOf(trajectory); }

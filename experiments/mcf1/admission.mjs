// ==========================================================
// MCF-1 — deterministic seed admission
// ==========================================================
// A raw agent seed is ADMITTED iff every clause holds (arithmetic only; the clause order below is the order
// in which the FIRST rejection reason is reported):
//   lag0       none of its four derived stream seeds equals a reserved derived seed (the registry's own
//              governance identity: a shared derived seed is a shared stochastic source)
//   registry   trajectory.checkUse(seed, {study: MCF-1, category}) is AVAILABLE or REPRODUCTION
//   intraRun   its cognitive, visual and environment spans are pairwise disjoint
//   <class>    none of those spans intersects a reserved span of any inventory class
//   earlier    none intersects the spans of a seed admitted earlier in the same ascending scan
//
// Properties, kept separate on purpose:
//   deterministic selection      yes: a pure function of (start, length, budgets, inventory, registry snapshot)
//   independence from outcomes   yes: no outcome, decision or draw value is read anywhere in this module
//   PRNG stream non-overlap      yes within the admitted set, by the clauses above
//   statistical independence     NOT claimed or implied (span separation is not statistical independence)
// ==========================================================
import { trajectory, trajectorySeed } from '../registry/typed.js';
import { STUDY, M32, BUDGETS, canonicalJson, sha256 } from './config.mjs';
import { USED_STREAMS, STREAMS, position, spansIntersect, derivedSeeds } from './inventory.mjs';

/** same body and canonical form as inventory.registrySnapshot(), computed from a registry object */
const registryDigest = (registry) => sha256(canonicalJson({ records: registry.records, heldOut: registry.heldOut, authorizations: registry.authorizations }));

/**
 * Ascending scan.  `inventory` comes from buildInventory().  Returns the admitted list, its hash and a full
 * accounting of every rejection (first reason, and every class that overlapped).  `registry` defaults to the
 * live trajectory registry; it is injectable only so the registry clause can be exercised by the verifier.
 */
export function admitScan({ start, length, inventory, budgets = BUDGETS, category = 'registered', registry = trajectory }) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || length < 1) throw new Error('admitScan: start and length must be integers, length >= 1');
  if (start < 0 || start + length > M32) throw new Error('admitScan: the scan must stay inside [0, 2^32) so no raw seed aliases another modulo 2^32');
  const admitted = [], rejected = [], accPos = [], accR = [];
  const firstReason = {}, anyClass = Object.fromEntries(inventory.classes.map(c => [c.id, 0]));
  let lag0Total = 0, registryRefused = 0, intraTotal = 0;
  for (let v = start; v < start + length; v++) {
    const s = derivedSeeds(v), reasons = [];
    if (STREAMS.some(n => inventory.derived.has(s[n]))) { reasons.push('lag0'); lag0Total++; }
    try {
      const r = registry.checkUse(trajectorySeed(v), { study: STUDY, category });
      if (r.decision !== 'AVAILABLE' && r.decision !== 'REPRODUCTION') { reasons.push('registry:' + r.decision); registryRefused++; }
    } catch (e) { reasons.push('registry:' + (e.code || e.name)); registryRefused++; }
    const mine = USED_STREAMS.map(n => ({ n, pos: position(s[n]), R: budgets[n] }));
    let intra = false;
    for (let i = 0; i < mine.length && !intra; i++) for (let j = i + 1; j < mine.length; j++) if (spansIntersect(mine[i].pos, mine[i].R, mine[j].pos, mine[j].R)) { intra = true; break; }
    if (intra) { reasons.push('intraRun'); intraTotal++; }
    for (const cls of inventory.classes) {
      if (mine.some(m => cls.index.firstOverlap(m.pos, m.R) >= 0)) { reasons.push(cls.id); anyClass[cls.id]++; }
    }
    if (reasons.length === 0) {
      let hitEarlier = false;
      for (const m of mine) { for (let k = 0; k < accPos.length; k++) if (spansIntersect(m.pos, m.R, accPos[k], accR[k])) { hitEarlier = true; break; } if (hitEarlier) break; }
      if (hitEarlier) reasons.push('earlierAdmitted');
    }
    if (reasons.length === 0) { admitted.push(v); for (const m of mine) { accPos.push(m.pos); accR.push(m.R); } }
    else { rejected.push({ raw: v, reasons }); firstReason[reasons[0]] = (firstReason[reasons[0]] || 0) + 1; }
  }
  const summary = {
    schema: 'mcf1.admission/1', study: STUDY, category, start, length, lastRaw: start + length - 1, budgets: { cognitive: budgets.cognitive, visual: budgets.visual, environment: budgets.environment },
    inventorySha256: inventory.sha256, registrySha256: registryDigest(registry),
    scanned: length, admitted: admitted.length, rejected: rejected.length, rejectedByFirstReason: firstReason, seedsOverlappingByClass: anyClass,
    lag0Coincidences: lag0Total, registryRefusals: registryRefused, intraRunConflicts: intraTotal,
    admittedSha256: sha256(admitted.join(',')),
  };
  return { summary, admitted, rejected, sha256: sha256(canonicalJson(summary)) };
}

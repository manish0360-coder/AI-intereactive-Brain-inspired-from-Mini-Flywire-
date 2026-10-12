// ==========================================================
// MCF-1 — pre-outcome validity rules (pure functions)
// ==========================================================
// Eligibility is decided from DECISION-STOP records only (Stage V).  Nothing in Stage V carries an outcome,
// a predicted outcome or the first environment draw, so outcomes cannot influence eligibility.  Stage O
// can only (a) invalidate a seed for an instrument reason that does not depend on success/failure, or
// (b) halt the whole stage; it never adds, replaces or re-admits a seed.
//
// Hard rules invalidate (the seed, or the stage); diagnostic rules are reported and never exclude anything.
// ==========================================================
import { FRAME, DESIGN, BUDGETS, canonicalJson, sha256 } from './config.mjs';
import { isGraphEdge, CONTENT_NODES, REGISTERED_BRAIN_HASHES } from './episodes.mjs';
import { makeRng } from '../../instrumentation/rng.js';
import { streamSeeds, trajectorySeed } from '../registry/typed.js';

export const RULES = Object.freeze({
  V1:  { cls: 'hard',       scope: 'stage', stage: 'V,O', title: 'runtime identity: tree manifest digest equals the frozen digest and the H1-R conformance is on' },
  V2:  { cls: 'hard',       scope: 'seed',  stage: 'Q,V', title: 'start node 10; call 0 a prediction tick; exactly one decision; no replay at call 0' },
  V3:  { cls: 'hard',       scope: 'seed',  stage: 'Q,V', title: 'candidate set exactly {6,9,11,13}; every candidate a legal graph neighbour; no self-loop' },
  V4:  { cls: 'hard',       scope: 'seed',  stage: 'V',   title: 'executed first action is a candidate and a legal move (runtime predicate and independent graph check agree)' },
  V4b: { cls: 'hard',       scope: 'seed',  stage: 'O',   title: 'illegal-action counter 0; exactly one environment draw seen; one attempt recorded, from the start node to the executed edge; no draw fault' },
  V5:  { cls: 'hard',       scope: 'seed',  stage: 'V',   title: 'twin invariance: the pre-attempt record is identical under T9 and T11 for every content' },
  V6:  { cls: 'hard',       scope: 'seed',  stage: 'V',   title: 'executed pair (x9,x11) is (9,11) or x9 = x11, so the first-edge contrast has support within {0,1}' },
  V7:  { cls: 'diagnostic', scope: 'seed',  stage: 'V',   title: 'executed triple in the identity class (needed only for the GOOD/BAD vs COLD decomposition)' },
  V8:  { cls: 'hard',       scope: 'seed',  stage: 'V',   title: 'episode state: 0 episodes for C, exactly the registered episode for Mb, brain hash equal, no activeGoal stored, learning stores empty at the decision, embeddings identical across runs' },
  V9:  { cls: 'hard',       scope: 'stage', stage: 'O',   title: 'determinism: the Stage-O pre-attempt fingerprint equals the Stage-V fingerprint (any mismatch halts the stage)' },
  V10: { cls: 'hard',       scope: 'seed',  stage: 'V',   title: 'seed admitted by the frozen predicate and registry-available' },
  V11: { cls: 'hard',       scope: 'seed',  stage: 'V,O', title: 'draw counts within budgets; environment draws 0 at Stage V and exactly 1 at Stage O' },
  V12: { cls: 'hard',       scope: 'stage', stage: 'O',   title: 'instrument mapping: realised ok equals 1{u1 < p(edge)} with u1 recomputed from the derived environment seed (any mismatch halts the stage)' },
});
export const RUN_KEYS = Object.freeze(DESIGN.contents.flatMap(c => DESIGN.twins.map(t => `${c}|${t}`)));

const sorted = (a) => a.slice().sort((x, y) => x - y);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const executedOf = (rec) => (rec.decisions && rec.decisions[0] ? Number(rec.decisions[0][1]) : null);

/** SHA-256 of everything the agent had decided before any environment outcome (step 0 only). */
export function fingerprintPre(rec) {
  const p0 = rec.probes.find(p => p.phase === 'call0-start');
  return sha256(canonicalJson({
    startNode: rec.startNode, chosen: rec.chosen,
    step0: rec.step0.map(c => ({ key: c.key, returned: c.returned, w: c.w, applied: c.applied, arb: c.arb, unc: c.unc, selfLoop: c.selfLoop, F: c.F, trustTerm: c.trustTerm })),
    bests: rec.bests.filter(b => b[1] === 0), decisions: rec.decisions, replays: rec.replays, probe0: p0,
  }));
}

/** executed pair -> class; `supportOK` means D^R is supported on {0,1} (never on a negative value) */
export function classifyPair(x9, x11) {
  if (x9 === 9 && x11 === 11) return { cls: 'follow', supportOK: true };
  if (x9 === x11) return { cls: 'equal', supportOK: true };
  if (x9 === 11 && x11 === 9) return { cls: 'reversed', supportOK: false };
  return { cls: 'mixed', supportOK: false };
}
/** d_G + d_B = 0 for every reliability pair and draw iff all three executed edges are in {9,11} or all three are equal */
export function inIdentityClass(xC, x9, x11) {
  const inC = (e) => e === 9 || e === 11;
  return (inC(xC) && inC(x9) && inC(x11)) || (xC === x9 && x9 === x11);
}

/** Stage-V seed validation.  `runs` is keyed 'C|T9' ... 'M11|T11'. */
export function validateSeedV({ raw, runs, admitted = true, registryDecision = 'AVAILABLE', budgets = BUDGETS }) {
  const hard = [], diagnostics = [];
  const missing = RUN_KEYS.filter(k => !runs[k] || runs[k].error || !runs[k].outcome || !runs[k].outcome.abortedBySentinel);
  if (missing.length) return { raw, valid: false, hard: ['RUN'], diagnostics, missing, pattern: null, steering: null, fingerprints: null };
  const R = RUN_KEYS.map(k => runs[k]);
  const fail = (id) => { if (!hard.includes(id)) hard.push(id); };
  // V2
  for (const r of R) if (!(r.startNode === FRAME.startNode && r.replays.length === 0 && r.decisions.length === 1 && r.calls === 1)) fail('V2');
  // V3
  for (const r of R) {
    const ks = r.step0.map(c => c.key);
    if (!same(sorted(ks), FRAME.candidates) || r.step0.some(c => c.selfLoop) || !r.legality.candidatesAreEdges.every(Boolean) || !ks.every(k => isGraphEdge(FRAME.startNode, k))) fail('V3');
  }
  // V4
  for (const r of R) {
    const x = executedOf(r);
    if (x === null || !r.step0.some(c => c.key === x) || r.legality.executedLegalMove !== true || !isGraphEdge(FRAME.startNode, x)) fail('V4');
  }
  // V5
  const fps = Object.fromEntries(RUN_KEYS.map(k => [k, fingerprintPre(runs[k])]));
  for (const c of DESIGN.contents) if (fps[`${c}|T9`] !== fps[`${c}|T11`]) fail('V5');
  // executed edges (twin-invariant under V5; T9 is used)
  const xC = executedOf(runs['C|T9']), x9 = executedOf(runs['M9|T9']), x11 = executedOf(runs['M11|T9']);
  // V6
  const pair = classifyPair(x9, x11);
  if (!pair.supportOK) fail('V6');
  // V7 (diagnostic)
  const ident = inIdentityClass(xC, x9, x11);
  if (!ident) diagnostics.push('V7');
  // V8
  const emb = new Set();
  for (const k of RUN_KEYS) {
    const r = runs[k], c = k.split('|')[0], p0 = r.probes.find(p => p.phase === 'call0-start'), pd = r.probes.find(p => p.phase === 'at-decision');
    const want = c === 'C' ? 0 : 1;
    if (!p0 || !pd || p0.episodes.length !== want) { fail('V8'); continue; }
    if (c !== 'C') {
      const e = p0.episodes[0];
      if (!same(e.nodes, CONTENT_NODES[c]) || e.hasActiveGoal !== false) fail('V8');
    }
    if (r.brainHash !== REGISTERED_BRAIN_HASHES[c]) fail('V8');
    if (pd.Q.size || pd.transitions.entries || pd.rewards || pd.penalties || pd.pathAttempts || pd.pathSuccesses || pd.confidenceMap) fail('V8');
    emb.add(p0.embeddingSha);
  }
  if (emb.size !== 1) fail('V8');
  // V10
  if (admitted !== true || !(registryDecision === 'AVAILABLE' || registryDecision === 'REPRODUCTION')) fail('V10');
  // V11
  for (const r of R) {
    const a = r.artifacts || {}, env = a.envCounters || {};
    if (!(a.cogDraws <= budgets.cognitive && a.visDraws <= budgets.visual && env.envDraws === 0)) fail('V11');
  }
  return { raw, valid: hard.length === 0, hard, diagnostics, missing: [], pattern: { xC, x9, x11 }, pair: pair.cls, steering: x9 === 9 && x11 === 11, identityClass: ident, fingerprints: fps, executed: Object.fromEntries(RUN_KEYS.map(k => [k, executedOf(runs[k])])) };
}

/** first environment draw of a seed, recomputed from the registry's derived environment seed (the draw the first attempt uses) */
export function firstEnvironmentDraw(raw) { return makeRng(streamSeeds(trajectorySeed(raw)).environment)(); }

/** Stage-O seed validation against the frozen Stage-V entry. */
export function validateSeedO({ raw, vEntry, runs, budgets = BUDGETS }) {
  const hardSeed = [], haltStage = [];
  const missing = RUN_KEYS.filter(k => !runs[k] || runs[k].error || !runs[k].outcome || !runs[k].outcome.abortedBySentinel);
  if (missing.length) return { raw, valid: false, hardSeed: ['RUN'], haltStage, missing, outcomes: null };
  const u1 = firstEnvironmentDraw(raw), outcomes = {};
  for (const k of RUN_KEYS) {
    const r = runs[k], x = executedOf(r), a = r.attempts && r.attempts[0];
    // V9 — determinism against Stage V
    if (fingerprintPre(r) !== vEntry.fingerprints[k]) { if (!haltStage.includes('V9')) haltStage.push('V9'); }
    // V4b
    if (!(r.h1r.blockedIllegal === 0 && r.h1r.drawFaults === 0 && r.h1r.envDrawsSeen === 1 && r.attempts.length === 1 && a && a[1] === r.startNode && a[2] === x && r.legality.executedLegalMove === true)) { if (!hardSeed.includes('V4b')) hardSeed.push('V4b'); }
    // V11
    const ar = r.artifacts || {}, env = ar.envCounters || {};
    if (!(ar.cogDraws <= budgets.cognitive && ar.visDraws <= budgets.visual && env.envDraws === 1)) { if (!hardSeed.includes('V11')) hardSeed.push('V11'); }
    // V12 — instrument mapping (applied identically to success and failure)
    if (a && typeof r.executedEdgeP === 'number') {
      if ((a[3] === 1) !== (u1 < r.executedEdgeP)) { if (!haltStage.includes('V12')) haltStage.push('V12'); }
    } else if (!haltStage.includes('V12')) haltStage.push('V12');
    outcomes[k] = { edge: x, ok: a ? a[3] : null };
  }
  return { raw, valid: hardSeed.length === 0 && haltStage.length === 0, hardSeed, haltStage, missing: [], outcomes };
}

/** V1 across a set of run records: every record must carry the frozen tree identity and conformance on */
export function checkRuntimeIdentity(records, expected) {
  const bad = [];
  for (const r of records) {
    if (!r || r.error) continue;
    if (!(r.h1r && r.h1r.on === true && r.tree && r.tree.manifestSha256 === expected.manifestSha256 && r.tree.b2Commit === expected.b2Commit)) bad.push(r.label);
  }
  return { ok: bad.length === 0, badLabels: bad.slice(0, 10), count: bad.length };
}

/** Deterministic manifest over validated entries (no clock, no path). */
export function buildManifest({ stage, inputs, entries, halts = [] }) {
  const e = entries.slice().sort((a, b) => a.raw - b.raw);
  const byRule = {};
  for (const x of e) for (const id of [...(x.hard || []), ...(x.hardSeed || []), ...(x.haltStage || [])]) byRule[id] = (byRule[id] || 0) + 1;
  const body = { schema: `mcf1.manifest.${stage}/1`, stage, inputs, halts, halted: halts.length > 0, counts: { entries: e.length, valid: e.filter(x => x.valid).length, invalid: e.filter(x => !x.valid).length, byRule }, entries: e };
  return { ...body, sha256: sha256(canonicalJson(body)) };
}
/** a manifest is self-consistent iff its stored hash equals the hash of its body */
export function manifestIntact(m) { const { sha256: h, ...body } = m; return typeof h === 'string' && h === sha256(canonicalJson(body)); }

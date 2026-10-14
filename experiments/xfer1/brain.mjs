// ==========================================================
// XFER-1 — brain serialization and component masking (pure; no I/O)
// ==========================================================
// serializeBrain() mirrors main.js saveBrain() field for field (main.js:709-741): the same eight persisted stores, the
// same nested-Map flattening, the same key spelling.  saveBrain itself is not exported and its autosave timer is inert
// under the headless shim, so the harness cannot call it; fidelity of this mirror is therefore a CHECKED property
// (verify_xfer1.mjs: deliver -> restore -> re-serialize at the first agent call must reproduce the delivered bytes).
// The two identity fields are always null here: the harness owns the goal, and a donor brain must never carry one.
// ==========================================================
import { COMPONENTS, canonicalJson, sha256 } from './config.mjs';

export function mapToObj(map) {
  const obj = {};
  map.forEach((v, k) => { obj[k] = v instanceof Map ? mapToObj(v) : v; });
  return obj;
}

/**
 * stores: { transitions, rewards, penalties, signals, curiosity, Q, confidence } (Maps) and episodes (array,
 * already the output of exportEpisodes()).  Returns the plain JSON-safe brain object.
 */
export function serializeBrain(stores) {
  return {
    transitions: mapToObj(stores.transitions),
    rewards: mapToObj(stores.rewards),
    penalties: mapToObj(stores.penalties),
    signals: mapToObj(stores.signals),
    curiosity: mapToObj(stores.curiosity),
    Q: mapToObj(stores.Q),
    confidence: mapToObj(stores.confidence),
    episodes: stores.episodes,
    homeNeuronId: null,
    goalNeuronId: null,
  };
}

/** a brain restricted to the kept components; omitted components are ABSENT (loadBrain then leaves that store empty) */
export function maskBrain(brain, keep) {
  const bad = keep.filter(c => !COMPONENTS.includes(c));
  if (bad.length) throw new Error(`XFER-1: unknown component(s) ${bad.join(', ')}`);
  const out = {};
  for (const c of COMPONENTS) if (keep.includes(c)) out[c] = brain[c];
  out.homeNeuronId = null;
  out.goalNeuronId = null;
  return out;
}

/**
 * HASH VIEW.  The runtime stamps every episode with wall-clock identifiers (`id`, `timestamp`; Date.now()), so two
 * identical training runs export different bytes.  They are excluded from every hash here.  verify_xfer1.mjs shows
 * (i) they are the only fields that differ between identical runs and (ii) delivering brains that differ only in
 * them produces bit-identical behaviour.  Everything else, including episode node sequences, is hashed.
 */
export const VOLATILE_EPISODE_FIELDS = Object.freeze(['id', 'timestamp']);
export function hashView(component, value) {
  if (component !== 'episodes' || !Array.isArray(value)) return value;
  return value.map(ep => Object.fromEntries(Object.entries(ep).filter(([k]) => !VOLATILE_EPISODE_FIELDS.includes(k))));
}

/** one canonical hash per component (absent component -> 'absent'); the order is COMPONENTS */
export function componentHashes(brain) {
  const h = {};
  for (const c of COMPONENTS) h[c] = brain && brain[c] !== undefined ? sha256(canonicalJson(hashView(c, brain[c]))) : 'absent';
  return h;
}

/** size of every component: number of top-level entries (episodes: array length) */
export function componentSizes(brain) {
  const s = {};
  for (const c of COMPONENTS) {
    const v = brain && brain[c];
    s[c] = v === undefined || v === null ? 0 : Array.isArray(v) ? v.length : Object.keys(v).length;
  }
  return s;
}

export function brainHash(brain) {
  if (brain === null) return 'none';
  const view = {};
  for (const [k, v] of Object.entries(brain)) view[k] = hashView(k, v);
  return sha256(canonicalJson(view));
}

// ==========================================================
// MCF-1 — explicit canonical representation of the study environment
// ==========================================================
// The environment an official run executes is a pure function of (configSeed, configIndex) and of the frozen
// environment module + graph.  Binding it by hash needs a representation that does not depend on how a JavaScript
// object happens to serialise.  Hashing the object returned by generateAccepted() with a generic JSON encoder is
// WRONG here: cfg.embedding is a Map, and JSON.stringify(new Map(...)) is "{}", so a digest of the raw object does
// not change when any embedding value changes (the verifier demonstrates this).  Functions, NaN and undefined are
// likewise dropped or rewritten by generic encoders.
//
// This module defines the representation explicitly:
//
//   * a CLOSED schema: every level lists its exact keys; a missing key, an extra key, an accessor property, a
//     function, a Symbol, a BigInt, undefined, NaN, an infinity, a sparse array or a non-plain object is refused with
//     the path of the offending value (EnvironmentCanonicalError);
//   * integers are safe JSON integers; every other number is encoded as the 16 hex digits of its IEEE-754 binary64
//     big-endian bytes ("f64:<hex>"), so no digest depends on a number-to-text algorithm;
//   * the Map is encoded as an array of {node, v} in ascending node order, and its key set must equal the graph's
//     node set; object key order never matters because the final text is produced by canonicalJson (sorted keys);
//   * every parameter the runtime reads is included: configuration identity and provenance, the rejected candidate
//     accounting, goal, unreliable edge set, both reliability vectors, all 40 x 32 embedding values, the acceptance
//     record, the frozen constants of the environment module and the graph (nodes, directed edge list in index order).
//
// The digest is sha256(canonicalJson(representation)).  Pure arithmetic and string handling: no clock, no RNG.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, sha256 } from './config.mjs';

export const ENV_SCHEMA = 'mcf1.env/1';
/** the six edges of the registered frame: candidates {6,9,11,13} from node 10 and the two second legs */
export const FRAME_EDGES = Object.freeze([[10, 6], [10, 13], [10, 9], [10, 11], [9, 12], [11, 12]]);

export class EnvironmentCanonicalError extends Error {
  constructor(where, message) { super(`MCF-1 environment representation refused at ${where}: ${message}`); this.name = 'EnvironmentCanonicalError'; this.path = where; }
}
const bad = (where, message) => { throw new EnvironmentCanonicalError(where, message); };

// ---- leaf encoders ----
const int = (x, where) => { if (typeof x !== 'number' || !Number.isSafeInteger(x)) bad(where, `expected a safe integer, got ${describe(x)}`); return x; };
const bool = (x, where) => { if (typeof x !== 'boolean') bad(where, `expected a boolean, got ${describe(x)}`); return x; };
const str = (x, where) => { if (typeof x !== 'string') bad(where, `expected a string, got ${describe(x)}`); return x; };
export function f64(x, where = 'value') {
  if (typeof x !== 'number' || !Number.isFinite(x)) bad(where, `expected a finite number, got ${describe(x)}`);
  const b = Buffer.alloc(8); b.writeDoubleBE(x, 0);
  return `f64:${b.toString('hex')}`;
}
function describe(x) {
  if (typeof x === 'function') return 'a function';
  if (typeof x === 'number') return String(x);
  if (x === null) return 'null';
  if (Array.isArray(x)) return 'an array';
  if (x instanceof Map) return 'a Map';
  return typeof x;
}
function arrayOf(x, where, leaf, length) {
  if (!Array.isArray(x)) bad(where, `expected an array, got ${describe(x)}`);
  if (length !== undefined && x.length !== length) bad(where, `expected ${length} elements, got ${x.length}`);
  if (Object.keys(x).length !== x.length) bad(where, 'the array is sparse or carries extra properties');
  for (let i = 0; i < x.length; i++) if (!(i in x)) bad(where, `hole at ${i}`);
  return x.map((v, i) => leaf(v, `${where}[${i}]`));
}
function plain(x, where, keys) {
  if (x === null || typeof x !== 'object' || Array.isArray(x) || x instanceof Map) bad(where, `expected a plain object, got ${describe(x)}`);
  const proto = Object.getPrototypeOf(x);
  if (proto !== Object.prototype && proto !== null) bad(where, 'expected a plain object (unexpected prototype)');
  if (Object.getOwnPropertySymbols(x).length) bad(where, 'symbol keys are not representable');
  const own = Object.getOwnPropertyNames(x).sort(), want = keys.slice().sort();
  for (const k of own) {
    const d = Object.getOwnPropertyDescriptor(x, k);
    if (!('value' in d)) bad(`${where}.${k}`, 'accessor properties are not representable');
    if (typeof d.value === 'function') bad(`${where}.${k}`, 'a function is not representable');
    if (!want.includes(k)) bad(`${where}.${k}`, 'unexpected key (the schema is closed)');
  }
  for (const k of want) if (!own.includes(k)) bad(`${where}.${k}`, 'required key is missing');
  return x;
}

// ---- the acceptance record produced by evaluateConstraints (accepted and rejected candidates share this shape) ----
const CHECK_KEYS = ['R1', 'startsWith2', 'R2', 'r2Starts', 'R3', 'rho3', 'R4', 'rho4', 'R5', 'r5Differing', 'r5States', 'r5DifferingNodes', 'G11', 'rhoObs', 'g11Worst'];
function encodeChecks(c, where) {
  plain(c, where, CHECK_KEYS);
  return {
    R1: bool(c.R1, `${where}.R1`), startsWith2: int(c.startsWith2, `${where}.startsWith2`),
    R2: bool(c.R2, `${where}.R2`), r2Starts: int(c.r2Starts, `${where}.r2Starts`),
    R3: bool(c.R3, `${where}.R3`), rho3: f64(c.rho3, `${where}.rho3`),
    R4: bool(c.R4, `${where}.R4`), rho4: f64(c.rho4, `${where}.rho4`),
    R5: bool(c.R5, `${where}.R5`), r5Differing: int(c.r5Differing, `${where}.r5Differing`), r5States: int(c.r5States, `${where}.r5States`),
    r5DifferingNodes: arrayOf(c.r5DifferingNodes, `${where}.r5DifferingNodes`, int),
    G11: bool(c.G11, `${where}.G11`), rhoObs: arrayOf(c.rhoObs, `${where}.rhoObs`, f64, 5), g11Worst: str(c.g11Worst, `${where}.g11Worst`),
  };
}

export const CONSTANT_KEYS = ['GOALS', 'N_UNRELIABLE', 'P_UNRELIABLE', 'P_RELIABLE', 'RUN_TICKS', 'T_SHIFT', 'EPISODE_CAP', 'EMBED_DIM', 'G11_THRESHOLD', 'G11_OBSERVABLES', 'R5_STATUS'];
function encodeConstants(k, where) {
  plain(k, where, CONSTANT_KEYS);
  return {
    GOALS: arrayOf(k.GOALS, `${where}.GOALS`, int), N_UNRELIABLE: int(k.N_UNRELIABLE, `${where}.N_UNRELIABLE`),
    P_UNRELIABLE: arrayOf(k.P_UNRELIABLE, `${where}.P_UNRELIABLE`, f64, 2), P_RELIABLE: arrayOf(k.P_RELIABLE, `${where}.P_RELIABLE`, f64, 2),
    RUN_TICKS: int(k.RUN_TICKS, `${where}.RUN_TICKS`), T_SHIFT: int(k.T_SHIFT, `${where}.T_SHIFT`), EPISODE_CAP: int(k.EPISODE_CAP, `${where}.EPISODE_CAP`),
    EMBED_DIM: int(k.EMBED_DIM, `${where}.EMBED_DIM`), G11_THRESHOLD: f64(k.G11_THRESHOLD, `${where}.G11_THRESHOLD`),
    G11_OBSERVABLES: arrayOf(k.G11_OBSERVABLES, `${where}.G11_OBSERVABLES`, str), R5_STATUS: str(k.R5_STATUS, `${where}.R5_STATUS`),
  };
}

/** the exported constants of the environment module, in the shape this representation requires */
export function constantsOf(envModule) {
  return Object.fromEntries(CONSTANT_KEYS.map(k => [k, Array.isArray(envModule[k]) ? envModule[k].slice() : envModule[k]]));
}

/** the directed edge list (index order) and the node list, read from the files the environment module itself reads */
export function readGraph(dir) {
  const edges = JSON.parse(fs.readFileSync(path.join(dir, 'connections.json'), 'utf8')).map((e, i) => [Number(e.from), Number(e.to)]);
  const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'neurons.json'), 'utf8')).map(n => Number(n.id));
  return { nodes, edges };
}
function encodeGraph(g, where) {
  plain(g, where, ['nodes', 'edges']);
  const nodes = arrayOf(g.nodes, `${where}.nodes`, int);
  const edges = arrayOf(g.edges, `${where}.edges`, (e, w) => arrayOf(e, w, int, 2));
  if (new Set(nodes).size !== nodes.length) bad(`${where}.nodes`, 'duplicate node id');
  for (const [i, [a, b]] of edges.entries()) if (!nodes.includes(a) || !nodes.includes(b)) bad(`${where}.edges[${i}]`, 'edge endpoint is not a node');
  return { nodes, edges };
}

export const ACCEPTED_SECTIONS = Object.freeze(['selection', 'pPhase1', 'pPhase2', 'embedding', 'acceptance', 'constants', 'graph']);

/**
 * The ACCEPTED configuration only (what a run executes): goal, unreliable set, both reliability vectors, the
 * embeddings, the acceptance record, the environment module's constants and the graph.  A per-process check can
 * evaluate this from ONE candidate (makeConfig(acceptedSeed, index)), without regenerating the rejected
 * candidates that precede it.  Returns the encoded sections and one digest per section.
 */
export function canonicalAcceptedConfiguration({ cfg, constants, graph }) {
  const g = encodeGraph(graph, 'graph'), k = encodeConstants(constants, 'constants');
  plain(cfg, 'cfg', ['configSeed', 'configIndex', 'goal', 'unreliableSet', 'pPhase1', 'pPhase2', 'embedding', 'checks', 'accepted']);
  const nEdges = g.edges.length;
  const configSeed = int(cfg.configSeed, 'cfg.configSeed'), configIndex = int(cfg.configIndex, 'cfg.configIndex'), goal = int(cfg.goal, 'cfg.goal');
  const accepted = bool(cfg.accepted, 'cfg.accepted');
  if (accepted !== true) bad('cfg.accepted', 'only an accepted configuration can be an environment');
  if (!k.GOALS.includes(goal) || k.GOALS[configIndex % k.GOALS.length] !== goal) bad('cfg.goal', 'goal is not GOALS[configIndex mod |GOALS|]');
  const unreliableSet = arrayOf(cfg.unreliableSet, 'cfg.unreliableSet', int);
  if (unreliableSet.length !== k.N_UNRELIABLE) bad('cfg.unreliableSet', `expected ${k.N_UNRELIABLE} unreliable edges`);
  for (let i = 0; i < unreliableSet.length; i++) {
    if (unreliableSet[i] < 0 || unreliableSet[i] >= nEdges) bad(`cfg.unreliableSet[${i}]`, 'edge index out of range');
    if (i > 0 && unreliableSet[i] <= unreliableSet[i - 1]) bad(`cfg.unreliableSet[${i}]`, 'must be strictly ascending');
  }
  const pPhase1 = arrayOf(cfg.pPhase1, 'cfg.pPhase1', f64, nEdges), pPhase2 = arrayOf(cfg.pPhase2, 'cfg.pPhase2', f64, nEdges);

  // the Map: node id -> unit vector of EMBED_DIM numbers
  if (!(cfg.embedding instanceof Map)) bad('cfg.embedding', `expected a Map, got ${describe(cfg.embedding)}`);
  const embedding = [...cfg.embedding.entries()].map(([node, v]) => ({ node: int(node, 'cfg.embedding key'), v: arrayOf(v, `cfg.embedding[${node}]`, f64, k.EMBED_DIM) }))
    .sort((x, y) => x.node - y.node);
  const want = g.nodes.slice().sort((x, y) => x - y);
  if (embedding.length !== want.length || embedding.some((e, i) => e.node !== want[i])) bad('cfg.embedding', 'the key set must equal the graph node set');

  const acceptance = encodeChecks(cfg.checks, 'cfg.checks');
  const sections = { selection: { goal, accepted, unreliableSet }, pPhase1, pPhase2, embedding, acceptance, constants: k, graph: g };
  const digests = Object.fromEntries(ACCEPTED_SECTIONS.map(n => [n, sha256(canonicalJson(sections[n]))]));
  return { configSeed, configIndex, sections, digests };
}

/**
 * The canonical representation of one accepted environment, with its provenance.
 *   generated  the object returned by generateAccepted(startSeed, configIndex): { cfg, discards, tries, provenance }
 *   constants  constantsOf(envModule)
 *   graph      readGraph(dir)
 * Returns { canonical, sha256, sections } where sections maps a section name to the digest of that section, so a
 * mismatch can say what changed.
 */
export function canonicalEnvironment({ generated, constants, graph }) {
  plain(generated, 'generated', ['cfg', 'discards', 'tries', 'provenance']);
  const acc = canonicalAcceptedConfiguration({ cfg: generated.cfg, constants, graph });
  const pv = generated.provenance;
  plain(pv, 'provenance', ['acceptedConfigIndex', 'startingSeed', 'acceptedSeed', 'numberOfRejectedCandidatesBeforeAcceptance']);

  // provenance and the rejected-candidate accounting (sequential ascending rejection sampling, nothing skipped)
  const startingSeed = int(pv.startingSeed, 'provenance.startingSeed'), acceptedSeed = int(pv.acceptedSeed, 'provenance.acceptedSeed');
  const rejectedN = int(pv.numberOfRejectedCandidatesBeforeAcceptance, 'provenance.numberOfRejectedCandidatesBeforeAcceptance');
  const acceptedIndex = int(pv.acceptedConfigIndex, 'provenance.acceptedConfigIndex');
  const discards = arrayOf(generated.discards, 'discards', (d, w) => { plain(d, w, ['seed', 'checks']); return { seed: int(d.seed, `${w}.seed`), checks: encodeChecks(d.checks, `${w}.checks`) }; });
  const tries = int(generated.tries, 'tries');
  if (acceptedSeed !== acc.configSeed || acceptedIndex !== acc.configIndex) bad('provenance', 'accepted seed/index differ from cfg');
  if (rejectedN !== discards.length || tries !== discards.length + 1) bad('provenance', 'rejected count and tries disagree with the discard list');
  discards.forEach((d, i) => { if (d.seed !== ((startingSeed + i) >>> 0)) bad(`discards[${i}].seed`, 'the rejected candidates must be consecutive ascending seeds from the starting seed'); });
  if (acceptedSeed !== ((startingSeed + discards.length) >>> 0)) bad('provenance.acceptedSeed', 'accepted seed is not startingSeed + number rejected');

  const sections = {
    identity: { configSeed: acc.configSeed, configIndex: acc.configIndex, startingSeed, acceptedSeed, acceptedConfigIndex: acceptedIndex, rejectedBeforeAcceptance: rejectedN, tries, rejected: discards },
    ...acc.sections,
  };
  const canonical = { schema: ENV_SCHEMA, ...sections };
  const sectionDigests = Object.fromEntries(Object.keys(sections).map(n => [n, sha256(canonicalJson(sections[n]))]));
  return { canonical, sha256: sha256(canonicalJson(canonical)), sections: sectionDigests };
}

/** the six registered frame edges as plain numbers, for disclosure and a targeted comparison */
export function frameEdgeValues(pPhase1, edgeIndexOf) {
  return Object.fromEntries(FRAME_EDGES.map(([a, b]) => [`${a}-${b}`, pPhase1[edgeIndexOf(a, b)]]));
}

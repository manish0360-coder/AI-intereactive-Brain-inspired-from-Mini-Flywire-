// ==========================================================
// COG-A — RNG contract: every stream is named by an explicit identity and seeded from it (pure)
// ==========================================================
// seed(identity) = first 32 bits (big-endian) of sha256(canonical JSON of the identity); PRNG = mulberry32 (instrumentation/rng.js).
// Identity fields: study, version, world (stream index or 'sim:<i>'), agent, condition, purpose.
//   environment streams: agent 'ENV', condition 'ANY'  (common random numbers for every agent and condition of a world)
//   agent streams:       condition 'pre' before the shift (identical in SWAP and NO-SWAP), 'SWAP' / 'NOSWAP' from the shift on
// Nothing here depends on execution order.
// ==========================================================
import crypto from 'node:crypto';
import { makeRng } from '../../instrumentation/rng.js';

export const STUDY = 'COG-A';
export const VERSION = 1;
export const PRNG = 'mulberry32 (instrumentation/rng.js makeRng)';
const FIELDS = ['study', 'version', 'world', 'agent', 'condition', 'purpose'];

export function canonical(x) {
  const norm = (v) => (Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : v);
  return JSON.stringify(norm(x));
}
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function identity({ world, agent, condition, purpose }) {
  const id = { study: STUDY, version: VERSION, world: String(world), agent, condition, purpose };
  for (const k of FIELDS) if (id[k] === undefined || id[k] === null || id[k] === '') throw new Error(`stream identity: missing ${k}`);
  return id;
}
export function streamSeed(fields) {
  const h = sha256(canonical(identity(fields)));
  return parseInt(h.slice(0, 8), 16) >>> 0;
}
export function stream(fields) { return makeRng(streamSeed(fields)); }

export const envSlip = (world, edge) => ({ world, agent: 'ENV', condition: 'ANY', purpose: `slip:${edge}` });
export const envStart = (world) => ({ world, agent: 'ENV', condition: 'ANY', purpose: 'start' });
export const agentStream = (world, agent, condition) => ({ world, agent, condition, purpose: 'agent' });
export const CONDITIONS = Object.freeze(['SWAP', 'NOSWAP']);

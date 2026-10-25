// ==========================================================
// CREDIT-1 — store delivery for the 9 cells (pure; DESIGN r2 section 6.2; blocker BC-2)
// ==========================================================
//   pi(w)            the goal-swap pairing: 4*floor(w/4) + ((w+1) mod 4); each quartet holds the four goals in cycle order
//   deliveryFor(cell, w)  which training export a cell receives (none / own / paired) and which components are kept
//   checkPairing(worlds)  bijection, g' != g, same quartet, block aligned to quartets
//   maskStore(brain, mask) the delivered store: FULL keeps all eight components; NO_Q keeps every component except Q (the
//                    existing XFER-1 NO_Q mask); omitted components are absent, so loadBrain leaves that store empty
// ==========================================================
import { ARMS, COMPONENTS } from '../xfer1/config.mjs';
import { maskBrain } from '../xfer1/brain.mjs';
import { CELLS, MODULE_A_PLUS, GOALS } from './config.mjs';

export const pi = (w) => 4 * Math.floor(w / 4) + ((w + 1) % 4);
export const goalOfWorld = (w) => GOALS[w % 4];
export const KEEP = Object.freeze({ FULL: Object.freeze([...COMPONENTS]), NO_Q: Object.freeze([...ARMS.NO_Q.keep]) });

const ALL_CELLS = [...CELLS, ...MODULE_A_PLUS.cells];
export function cellOf(name) { const c = ALL_CELLS.find(x => x.name === name); if (!c) throw new Error(`CREDIT-1: unknown cell ${name}`); return c; }

/** { source: 'none'|'own'|'paired', brainWorld, training, keep } */
export function deliveryFor(cellName, w) {
  const c = cellOf(cellName);
  if (c.store === 'none') return { source: 'none', brainWorld: null, training: null, keep: [] };
  const [source, training, mask] = c.store.split(':');
  if (!['own', 'paired'].includes(source) || !KEEP[mask]) throw new Error(`CREDIT-1: malformed store spec ${c.store}`);
  return { source, brainWorld: source === 'own' ? w : pi(w), training, keep: [...KEEP[mask]], mask };
}

export function checkPairing(worlds, pairing = pi) {
  const problems = [];
  const set = new Set(worlds);
  if (worlds.length % 4 !== 0) problems.push('the block is not a whole number of quartets');
  if (worlds.length && worlds[0] % 4 !== 0) problems.push('the block does not start on a quartet boundary');
  const images = new Set();
  for (const w of worlds) {
    const p = pairing(w);
    if (!set.has(p)) problems.push(`pi(${w}) = ${p} is outside the block`);
    if (images.has(p)) problems.push(`pi is not injective at ${p}`);
    images.add(p);
    if (goalOfWorld(p) === goalOfWorld(w)) problems.push(`pi(${w}) has the same goal`);
    if (Math.floor(p / 4) !== Math.floor(w / 4)) problems.push(`pi(${w}) leaves the quartet`);
  }
  return problems;
}

/** the NO_Q mask must keep exactly every component except Q */
export const noQMaskOk = (keep) => JSON.stringify([...keep].sort()) === JSON.stringify(COMPONENTS.filter(c => c !== 'Q').sort());

export function maskStore(brain, mask) {
  if (!KEEP[mask]) throw new Error(`CREDIT-1: unknown mask ${mask}`);
  return maskBrain(brain, KEEP[mask]);
}

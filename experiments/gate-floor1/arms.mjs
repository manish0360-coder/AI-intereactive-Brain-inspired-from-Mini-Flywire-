// ==========================================================
// GATE-FLOOR-1 — which episode store and which floor state each arm runs (pure)
// ==========================================================
import { ARMS } from './config.mjs';
import { entryStore } from '../xfer2/controls.mjs';

/**
 * The episode store an arm delivers to one world's test session.
 *   ctx = { goal, realEpisodes, g, labelOf }
 * null for an arm that starts empty.  REAL is the world's own training store, unmodified (XFER-1 / XFER-2 REAL);
 * ENTRY_NR is XFER-2's goal-entry-only store (5 x [u, goal] per goal neighbour, quality 0.49).
 */
export function storeFor(arm, ctx) {
  const a = ARMS[arm];
  if (!a) throw new Error(`GATE-FLOOR-1: unknown arm ${arm}`);
  switch (a.store) {
    case 'none': return null;
    case 'own-real': return ctx.realEpisodes;
    case 'entry-nr': return entryStore(ctx.g, ctx.labelOf, ctx.goal);
    default: throw new Error(`GATE-FLOOR-1: unhandled store ${a.store}`);
  }
}

/** every arm is delivered as an episodes-only file through the xfer1 ONLY_episodes arm (or COLD) */
export const deliveryFor = (arm) => (ARMS[arm].store === 'none' ? { session: 'COLD', source: 'none' } : { session: 'ONLY_episodes', source: 'file', file: ARMS[arm].store });

export const floorModeFor = (arm) => (ARMS[arm].floor ? 'on' : 'off');

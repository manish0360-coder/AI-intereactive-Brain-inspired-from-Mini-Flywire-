// ==========================================================
// XFER-2 — which episode store each arm delivers (pure)
// ==========================================================
import { ARMS, GEN_SEED } from './config.mjs';
import { noReplay, reversedNoReplay, satStore, genStore, entryStore } from './controls.mjs';

/**
 * The episode store an arm delivers to one world's test session.
 *   ctx = { world, goal, realEpisodes, g, labelOf, sat }   (sat: the shared world-independent saturated store)
 * Returns null for COLD.  Pure and deterministic: a world's stores are functions of (graph, goal, world, real store).
 */
export function storeFor(arm, ctx) {
  const a = ARMS[arm];
  if (!a) throw new Error(`XFER-2: unknown arm ${arm}`);
  const { world, goal, realEpisodes, g, labelOf, sat } = ctx;
  switch (a.kind) {
    case 'cold': return null;
    case 'own-real': return realEpisodes;
    case 'own-real-noreplay': return noReplay(realEpisodes);
    case 'own-reversed-noreplay': return reversedNoReplay(realEpisodes, labelOf);
    case 'generic-matched-noreplay': return genStore(g, labelOf, realEpisodes, { seed: GEN_SEED + world, tag: `gen${world}` });
    case 'saturated-noreplay': return sat;
    case 'saturated-noentry-noreplay': return satStore(g, labelOf, { excludeInto: goal, seed: 20261015 + goal, tag: `satne${goal}`, quality: 0.49 });
    case 'entry-only-noreplay': return entryStore(g, labelOf, goal);
    default: throw new Error(`XFER-2: unhandled kind ${a.kind}`);
  }
}

/** every arm is delivered as an episodes-only file through the xfer1 session driver's ONLY_episodes arm (or COLD) */
export function deliveryFor(arm) {
  return ARMS[arm].kind === 'cold' ? { session: 'COLD', source: 'none' } : { session: 'ONLY_episodes', source: 'file' };
}

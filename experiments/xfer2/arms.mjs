// ==========================================================
// XFER-2 — which episode store each arm delivers (pure)
// ==========================================================
import { ARMS } from './config.mjs';
import { noReplay, reversedNoReplay } from './controls.mjs';

/**
 * The episode store an arm delivers to a world's test session.
 *   realEpisodes : the world's own training store (exportEpisodes output)
 *   donorSG/donorXG : the stores of a same-goal / other-goal donor world (their own training stores)
 *   cover, coverNR : the world-independent control stores
 * Returns null for COLD.
 */
export function storeFor(arm, { realEpisodes, donorSG, donorXG, cover, coverNR, labelOf }) {
  const a = ARMS[arm];
  if (!a) throw new Error(`XFER-2: unknown arm ${arm}`);
  switch (a.kind) {
    case 'cold': return null;
    case 'own-real': return realEpisodes;
    case 'own-real-noreplay': return noReplay(realEpisodes);
    case 'own-reversed-noreplay': return reversedNoReplay(realEpisodes, labelOf);
    case 'cover': return a.replay ? cover : coverNR;
    case 'donor-samegoal': return donorSG;
    case 'donor-othergoal': return donorXG;
    default: throw new Error(`XFER-2: unhandled kind ${a.kind}`);
  }
}

/** the xfer1 session arm used to deliver an XFER-2 arm, and which brain file it reads */
export function deliveryFor(arm) {
  const a = ARMS[arm];
  if (a.kind === 'cold') return { session: 'COLD', source: 'none' };
  if (a.kind === 'donor-samegoal' || a.kind === 'donor-othergoal') return { session: 'SHAM_EPIS', source: 'donor' };
  return { session: 'ONLY_episodes', source: 'file' };      // a prebuilt episodes-only file of this world
}

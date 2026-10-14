// ==========================================================
// GATE-FLOOR-1 — per-world export of an analysed block (data extraction only; no inference)
// ==========================================================
//   node export_perworld.mjs --in <block run dir> --out <json>
// The frozen analysis serialises only the four endpoints per world and arm (the floor counters and the final-hop summary
// are attached to the in-memory arrays and are lost in JSON).  This writes, through the same integrity-checked loader, one
// compact record per world and arm so that every reported number, including the final-hop diagnostic, can be recomputed
// from a committed file.  The raw sessions (with every event) stay in the git-ignored data directory.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { loadBlock } from './analyze.mjs';
import { summarizeEvents } from './finalhop.mjs';

export function perWorldExport({ manifest, plan, controls, records }) {
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const rows = {};
  for (const w of worlds) {
    const row = { goal: plan.worlds.find(x => x.world === w).goal, realEpisodes: controls[w].realEpisodes, configSeed: plan.worlds.find(x => x.world === w).configSeed, arms: {} };
    for (const arm of C.ARM_ORDER) {
      const r = records.get(`gf1-${arm}-w${w}`);
      row.arms[arm] = {
        goalReaches: r.endpoints.goalReaches, attemptSuccess: r.endpoints.attemptSuccess, slipsPerCall: r.endpoints.slipsPerCall, earlyReaches: r.endpoints.earlyReaches,
        finalHop: summarizeEvents(r.finalHop.events),
        floor: r.floor ? { ...r.floor.counters } : null,
        episodesAtStart: r.brain.start.sizes.episodes,
      };
    }
    rows[w] = row;
  }
  return { schema: `${C.SCHEMA}.perworld`, block: plan.block, manifestDigest: manifest.digest, designDigest: manifest.designDigest, arms: C.ARM_ORDER, worlds, perWorld: rows };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in') || !flag('--out')) { console.error('--in and --out are required'); process.exit(2); }
  const out = perWorldExport(loadBlock(path.resolve(flag('--in'))));
  fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(out));
  console.log(`exported ${out.worlds.length} worlds x ${out.arms.length} arms (manifest ${out.manifestDigest.slice(0, 12)})`);
}

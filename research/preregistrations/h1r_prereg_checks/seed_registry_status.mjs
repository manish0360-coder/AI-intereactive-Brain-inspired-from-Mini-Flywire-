// H1-R preregistration check: read-only query of the typed seed registry (experiments/registry/typed.js).
// Changes nothing; records nothing.
//
//   node research/preregistrations/h1r_prereg_checks/seed_registry_status.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const R = await import(pathToFileURL(path.join(ROOT, 'experiments', 'registry', 'typed.js')).href);
for (const s of [893000, 894999, 900000, 900004, 900005, 900009, 900029, 900030, 900499, 900500, 900529])
  console.log(`config ${s}: heldOut=${R.config.isHeldOut(R.configSeed(s))} consumed=${R.config.isConsumed(R.configSeed(s))}`);
const use = (v) => { try { return R.trajectory.checkUse(R.trajectorySeed(v), { study: 'H1-R', category: 'pilot' }).decision; }
                     catch (e) { return `${e.name}: ${e.message}`; } };
for (const v of [20260819000, 20260819001, 20260819002, 20260819003, 20260819004, 20260819005, 20260819009, 20260819100, 20260819119])
  console.log(`trajectory ${v} (H1-R, pilot): ${use(v)}`);

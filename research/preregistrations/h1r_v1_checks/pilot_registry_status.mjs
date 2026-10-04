// H1-R v1.0 — read-only query of the typed seed registry for the frozen pilot and confirmatory material
// (Appendix B.3). Changes nothing, records nothing, generates no configuration.
//
//   node research/preregistrations/h1r_v1_checks/pilot_registry_status.mjs
import * as R from '../../../experiments/registry/typed.js';

const cfg = (c) => `config ${c}: heldOut=${R.config.isHeldOut(R.configSeed(c))} consumed=${R.config.isConsumed(R.configSeed(c))}`;
let freeAll = true;
for (let c = 886000; c <= 889999; c++) if (R.config.isHeldOut(R.configSeed(c)) || R.config.isConsumed(R.configSeed(c))) freeAll = false;
console.log('H1-R v1.0 Appendix B.3 — registry status');
console.log(`pilot configuration block 886000-889999: every seed neither held out nor consumed = ${freeAll}`);
for (const c of [885999, 886000, 889999, 890000, 900500]) console.log(cfg(c));
const use = (v, category) => { try { return R.trajectory.checkUse(R.trajectorySeed(v), { study: 'H1-R', category }).decision; }
                               catch (e) { return e.code || e.name; } };
for (let k = 0; k <= 9; k++) console.log(`trajectory ${20260819000 + k} (H1-R, pilot): ${use(20260819000 + k, 'pilot')}`);
const conf = [...Array(20)].map((_, k) => 20260819100 + k).map(v => use(v, 'registered'));
console.log(`trajectory 20260819100-119 (H1-R, registered): ${[...new Set(conf)].join(', ')} (${conf.length} seeds)`);

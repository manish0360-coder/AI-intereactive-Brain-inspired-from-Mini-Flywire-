// M14 admission gate and plan census (development labels only; written 2026-11-18, before any learner arm has run on
// a development or gate label).
//
// 1. Plan census, structure only, no agent: which of the gate labels m14schema|gate|0..164 and the development labels
//    m14schema|dev|0..29 can be planned (every world has a unique route of the set length). The gate's analysed set
//    is fixed by this census before the freeze.
// 2. Admission, development labels m14schema|dev|0..29, two arms only: CONCRETE (the adopted agent) and
//    ORACLE_SCHEMA (privileged: the true relation as a fixed schema). No learner arm (SCHEMA, SCHEMA_SHUFFLED) runs.
//    Headroom H = mean over labels of CONCRETE - ORACLE_SCHEMA, steps in the first COMPOSE test episode.
//    The task is admitted iff
//      A1  H > 0 with a 95% bootstrap lower bound > 0;
//      A2  H >= 2 x MDE(n), the minimum detectable effect at the gate's n with the development SD;
//      A3  CONCRETE's three test conditions are identical runs on every label (kinds are passive for it).
//    It also fixes, from these two arms only, the safety margin (one quarter of H, rounded up) and the smallest
//    effect of interest (one quarter of H), and reports the power of the gate at that effect.
// Usage: node experiments/m14_schema/admission/admission.mjs   (writes admission.json next to itself)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pairedBootstrap } from '../../../cognitive/testbed/stats.mjs';
import { E6, LABEL_OF, planTrial, runArm, testSteps, mean, sd, median } from '../m14_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const Z975 = 1.959964, Z80 = 0.841621;
const N_GATE = 165, N_DEV = 30;

// 1. census
const census = (labels) => labels.map((l) => { const P = planTrial(l); return { label: l, excluded: P.excluded }; });
const gate = census(Array.from({ length: N_GATE }, (_, i) => LABEL_OF.m14(i)));
const dev = census(Array.from({ length: N_DEV }, (_, i) => LABEL_OF.dev(i)));
const gateExcluded = gate.filter((x) => x.excluded);
console.log(`census: gate ${N_GATE - gateExcluded.length} of ${N_GATE} plannable; development ${dev.filter((x) => !x.excluded).length} of ${N_DEV}`);
for (const x of gateExcluded) console.log(`  gate excluded ${x.label}: ${x.excluded}`);

// 2. admission
const rows = [];
for (const d of dev) {
  if (d.excluded) continue;
  const P = planTrial(d.label);
  const c = runArm(P, 'CONCRETE'), o = runArm(P, 'ORACLE_SCHEMA');
  rows.push({ label: d.label, concrete: c.tests.COMPOSE.map((e) => e.steps), oracle: o.tests.COMPOSE.map((e) => e.steps), concreteDone: c.tests.COMPOSE.map((e) => e.done), passive: JSON.stringify(c.tests.NULL) === JSON.stringify(c.tests.COMPOSE) && JSON.stringify(c.tests.REVERSED) === JSON.stringify(c.tests.COMPOSE) });
}
const diffs = rows.map((r) => r.concrete[0] - r.oracle[0]);
const H = pairedBootstrap(diffs, 'm14schema|admission|H'), S = sd(diffs);
const nGate = N_GATE - gateExcluded.length;
const mde = (Z975 + Z80) * S / Math.sqrt(nGate);
const sesoi = H.mean / 4;
function Phi(x) {             // standard normal CDF, Numerical Recipes erfcc fit; copied from experiments/m13_generalization/power/power_m13.mjs
  const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - r / 2 : r / 2;
}
const power = Phi(sesoi / (S / Math.sqrt(nGate)) - Z975);
const out = {
  note: 'development labels only; arms CONCRETE and ORACLE_SCHEMA; no learner arm ran',
  e6: E6,
  census: { gate: { labels: N_GATE, plannable: nGate, excluded: gateExcluded }, development: { labels: N_DEV, plannable: dev.filter((x) => !x.excluded).length, excluded: dev.filter((x) => x.excluded) } },
  concreteFirstEpisode: { mean: mean(rows.map((r) => r.concrete[0])), median: median(rows.map((r) => r.concrete[0])), sd: sd(rows.map((r) => r.concrete[0])), capped: rows.filter((r) => !r.concreteDone[0]).length },
  oracleFirstEpisode: { mean: mean(rows.map((r) => r.oracle[0])), min: Math.min(...rows.map((r) => r.oracle[0])), max: Math.max(...rows.map((r) => r.oracle[0])) },
  headroom: { ...H, sd: S, median: median(diffs), positive: diffs.filter((x) => x > 0).length, negative: diffs.filter((x) => x < 0).length, zero: diffs.filter((x) => x === 0).length },
  gate: { n: nGate, mde, twiceMde: 2 * mde, sesoi, powerAtSesoi: power, safetyMargin: Math.ceil(H.mean / 4) },
  checks: { A1: H.mean > 0 && H.lo > 0, A2: H.mean >= 2 * mde, A3: rows.every((r) => r.passive) },
  rows,
};
out.admitted = out.checks.A1 && out.checks.A2 && out.checks.A3;
fs.writeFileSync(path.join(HERE, 'admission.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`CONCRETE first COMPOSE episode: mean ${out.concreteFirstEpisode.mean.toFixed(2)} steps (median ${out.concreteFirstEpisode.median}, sd ${out.concreteFirstEpisode.sd.toFixed(2)}, capped ${out.concreteFirstEpisode.capped}); ORACLE_SCHEMA mean ${out.oracleFirstEpisode.mean.toFixed(2)} (min ${out.oracleFirstEpisode.min}, max ${out.oracleFirstEpisode.max})`);
console.log(`headroom H = ${H.mean.toFixed(2)} [${H.lo.toFixed(2)}, ${H.hi.toFixed(2)}], sd ${S.toFixed(2)}, median ${out.headroom.median}, labels +/-/0 ${out.headroom.positive}/${out.headroom.negative}/${out.headroom.zero}`);
console.log(`gate n ${nGate}: MDE ${mde.toFixed(2)}, 2 x MDE ${(2 * mde).toFixed(2)}; smallest effect of interest H/4 = ${sesoi.toFixed(2)}, power ${power.toFixed(3)}; safety margin ceil(H/4) = ${out.gate.safetyMargin}`);
console.log(`A1 ${out.checks.A1}  A2 ${out.checks.A2}  A3 ${out.checks.A3}  -> ${out.admitted ? 'ADMITTED' : 'NOT ADMITTED'}`);

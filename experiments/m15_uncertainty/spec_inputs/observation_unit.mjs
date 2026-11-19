// M15 specification input: which occurrence of a kind on a route gives an exact draw of theta*?
//   node experiments/m15_uncertainty/spec_inputs/observation_unit.mjs > experiments/m15_uncertainty/spec_inputs/observation_unit.out
//
// Found during the build (2026-11-18), before any development or gate label was run, from six smoke labels in which
// UA's mean P(true value) under NOISY sat near 0.84 rather than the calculation's 0.80. PROPOSAL revision 3.1, section
// 2.1, takes the successor of the LAST kind-k node; section 4.1 states that the route stream "is a direct draw of the
// environment's process theta*". Both cannot hold under NOISY. This file settles it in two ways, neither of which runs
// an agent or touches a development or gate label:
//   (1) exact enumeration of E7's noisy route process: phase uniform over the 4 kinds, 4 route steps, each step to
//       SIGMA(c) with probability 1 - q, else to one of the 3 other kinds uniformly; for each kind, the distribution
//       of the successor of its last and of its first occurrence, given that the kind occurs;
//   (2) the same quantity measured on E7's actual generator (planSequence, noisy kinds) over 2,000 sequences with
//       labels m15unc|unit|<i> (structure only: worlds, routes and kinds; no agent, no belief, no outcome).
// Result: the first occurrence gives theta* exactly (it is a stopping time: whether a step is the first kind-k step
// depends only on the steps before it). The last occurrence does not: at q = 0.25 its reliability is 0.833.
import { planSequence, routeVisits, KINDS, SIGMA } from '../../../cognitive/testbed/task_e7.mjs';

const STEPS = 4;
function enumerate(q, which) {
  const dist = Array.from({ length: KINDS }, () => new Array(KINDS).fill(0)), present = new Array(KINDS).fill(0);
  const rec = (chain, p) => {
    if (chain.length === STEPS + 1) {
      const at = new Array(KINDS).fill(-1);
      if (which === 'last') for (let i = 0; i < STEPS; i++) at[chain[i]] = i;
      else for (let i = STEPS - 1; i >= 0; i--) at[chain[i]] = i;
      for (let k = 0; k < KINDS; k++) if (at[k] >= 0) { dist[k][chain[at[k] + 1]] += p; present[k] += p; }
      return;
    }
    const c = chain.at(-1);
    for (let j = 0; j < KINDS; j++) rec([...chain, j], p * (j === SIGMA[c] ? 1 - q : q / (KINDS - 1)));
  };
  for (let c0 = 0; c0 < KINDS; c0++) rec([c0], 1 / KINDS);
  return dist.map((row, k) => row.map((x) => x / present[k]));
}
const fmt = (row) => row.map((x) => x.toFixed(4)).join(' ');
console.log('(1) exact enumeration: successor distribution of kind 0 (SIGMA(0) = 1), given that kind 0 occurs on the route');
for (const q of [0.10, 0.25, 0.40]) {
  for (const which of ['last', 'first']) {
    const th = enumerate(q, which);
    const sym = th.every((row, k) => Math.abs(row[SIGMA[k]] - th[0][SIGMA[0]]) < 1e-12);
    console.log(`  q = ${q.toFixed(2)}  ${which.padEnd(5)}  P(y = 0..3) = ${fmt(th[0])}   P(SIGMA(k)) = ${th[0][SIGMA[0]].toFixed(4)} (theta* ${(1 - q).toFixed(4)})${sym ? '' : '  [kinds differ]'}`);
  }
}

console.log('(2) E7 generator, NOISY route kinds, 2,000 sequences x 16 evaluation worlds (labels m15unc|unit|0..1999)');
const tally = { last: [0, 0], first: [0, 0] };
for (let i = 0; i < 2000; i++) {
  const seq = planSequence(`m15unc|unit|${i}`);
  if (seq.excluded) { console.log(`  excluded ${seq.label}`); continue; }
  for (const w of seq.worlds.slice(12)) {
    const v = routeVisits(w, w.noisy.kinds);
    for (const which of ['last', 'first']) {
      const at = new Array(KINDS).fill(-1);
      if (which === 'last') for (let j = 0; j + 1 < v.length; j++) at[v[j].kind] = j;
      else for (let j = v.length - 2; j >= 0; j--) at[v[j].kind] = j;
      for (let k = 0; k < KINDS; k++) if (at[k] >= 0) { tally[which][0]++; if (v[at[k] + 1].kind === SIGMA[k]) tally[which][1]++; }
    }
  }
}
for (const which of ['last', 'first']) {
  const [n, hit] = tally[which], p = hit / n, se = Math.sqrt((p * (1 - p)) / n);
  console.log(`  ${which.padEnd(5)}  observations ${n}, share following SIGMA ${p.toFixed(4)} (SE ${se.toFixed(4)}; theta* 0.7500, exact ${which === 'last' ? enumerate(0.25, 'last')[0][1].toFixed(4) : '0.7500'})`);
}

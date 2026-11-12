// H1-R preregistration check (configuration arithmetic only; no agent run, no outcome).
// NOTE: describes the PRE-R2 runtime. Since R2 (D-1) goal-entering attempts draw like every other edge,
// so the "effective p = 1" quantities below are historical: they measure the gap R2 closed.
// Goal-entering moves take no environment draw at runtime (main.js `_goalResetJustHappened`), so a
// goal-incident edge is effectively reliable (p = 1). This script compares the frozen acceptance quantities
// on the configured p with the same quantities on the runtime-effective p, over the already-inspected
// M7-ERR-09 gate-diagnostic material (the 41 accepted (seed, index) pairs in 900030-900499).
// It never generates a seed >= 900500 (asserted below).
//
//   node research/preregistrations/h1r_prereg_checks/goal_edge_reliability.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const env = await import(pathToFileURL(path.join(ROOT, 'experiments', 'm7', 'env.js')).href);
const SAMPLES = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'h1r', 'evidence_r1', 'g15_samples.json'), 'utf8'));
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const rows = [];
for (const s of SAMPLES) {
  const cfg = env.makeConfig(s.configSeed, s.configIndex);
  if (!cfg.accepted) throw new Error('not an accepted configuration: ' + JSON.stringify(s));
  const g = cfg.goal;
  const goalEdges = EDGES.map((e, i) => (Number(e.from) === g || Number(e.to) === g) ? i : -1).filter(i => i >= 0);
  for (const phase of [1, 2]) {
    const p = phase === 1 ? cfg.pPhase1 : cfg.pPhase2;
    const pEff = p.map((x, i) => goalEdges.includes(i) ? 1 : x);
    const a = env.evaluateConstraints({ ...cfg, pPhase1: p });
    const b = env.evaluateConstraints({ ...cfg, pPhase1: pEff });
    rows.push({ phase, goalEdges: goalEdges.length, unreliableGoalEdges: goalEdges.filter(i => p[i] < 0.5).length,
      R2: a.R2, R2eff: b.R2, R5: a.R5, R5eff: b.R5, r5: a.r5Differing, r5eff: b.r5Differing, rho4: a.rho4, rho4eff: b.rho4 });
  }
}
for (const phase of [1, 2]) {
  const rs = rows.filter(r => r.phase === phase), n = rs.length, sum = (f) => rs.reduce((x, r) => x + f(r), 0);
  console.log(`Phase ${phase}: configs ${n}; with >=1 unreliable goal-incident edge ${rs.filter(r => r.unreliableGoalEdges > 0).length}; ` +
    `unreliable goal-incident edges ${sum(r => r.unreliableGoalEdges)}/${sum(r => r.goalEdges)}; ` +
    `R2 ${rs.filter(r => r.R2).length}->${rs.filter(r => r.R2eff).length}; R5 ${rs.filter(r => r.R5).length}->${rs.filter(r => r.R5eff).length}; ` +
    `mean R5 differing states ${(sum(r => r.r5) / n).toFixed(2)}->${(sum(r => r.r5eff) / n).toFixed(2)}; ` +
    `max |rho(p, dist-to-goal)| ${Math.max(...rs.map(r => Math.abs(r.rho4))).toFixed(3)}->${Math.max(...rs.map(r => Math.abs(r.rho4eff))).toFixed(3)}; ` +
    `configs with effective |rho| >= 0.10: ${rs.filter(r => Math.abs(r.rho4eff) >= 0.10).length}`);
}
const seen = env.evaluatedSeeds();
if (seen.some(x => x >= 900500)) throw new Error('held-out boundary violated');
console.log(`evaluated seeds ${seen[0]}..${seen[seen.length - 1]} (all < 900500)`);

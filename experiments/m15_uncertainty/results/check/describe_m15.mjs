// Descriptive tables of the M15 result for RESULTS.md (written after the run; no criterion, nothing recomputed
// beyond formatting). Every figure is printed from the stored full-precision value, once, at the stated precision.
//   node experiments/m15_uncertainty/results/check/describe_m15.mjs > experiments/m15_uncertainty/results/check/describe_m15.out
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const j = JSON.parse(fs.readFileSync(path.join(HERE, 'm15_result.json'), 'utf8'));
const adm = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'admission', 'admission.json'), 'utf8'));
const f = (x, d = 4) => (x === null || x === undefined ? 'null' : Number(x).toFixed(d));
const R = j.reported, WIN = `WINDOW_w${j.parameters.wStar}`;
const NC = ['STABLE', 'NOISY', 'SPARSE', 'REV_PRE'];

console.log('1. lines');
for (const [k, v] of Object.entries(j.reading.lines)) console.log(`  ${k}: ${v}`);
console.log(`  statement: ${j.reading.statement}`);

console.log('\n2. criteria (estimate [95%]; paired: labels for / against / zero; outcome)');
for (const c of j.criteria) console.log(`  ${c.name.padEnd(6)} ${c.line.padEnd(4)} ${f(c.mean)} [${f(c.lo)}, ${f(c.hi)}] ${c.dir} ${c.threshold}${c.kind === 'paired' ? `  ${c.positive}/${c.negative}/${c.zero}, sd ${f(c.sd)}` : ''}  ${c.pass ? 'pass' : 'FAIL'}`);

console.log('\n3. BT-COND (UA, exact ECE by no-change condition)');
for (const sc of NC) { const c = j.btCond.conditions[sc]; console.log(`  ${sc.padEnd(8)} ${f(c.ece)} [${f(c.lo)}, ${f(c.hi)}] family lower ${f(c.loFamily)}  direction ${f(c.direction)}  mean confidence ${f(c.meanConfidence)}  exact accuracy ${f(c.exactAccuracy)}  points ${c.points}  ${c.classification}`); }
console.log(`  pooled ${f(j.btCond.pooled)}; point-weighted mean ${f(j.btCond.pointWeightedMean)}; line ${j.btCond.line}`);

console.log('\n4. sensitivity arms (BT block, reported)');
for (const [arm, ps] of Object.entries(j.sensitivityBT)) {
  const b1 = ps.find((c) => c.name === 'BT1');
  console.log(`  ${arm.padEnd(7)} ${ps.filter((c) => c.pass).length} of ${ps.length} pass${ps.every((c) => c.pass) ? '' : ` (failed: ${ps.filter((c) => !c.pass).map((c) => c.name).join(', ')})`}; BT1 ${f(b1.mean)} [${f(b1.lo)}, ${f(b1.hi)}]`);
}
const h5 = R.conditionCalibration.UA_h05;
console.log(`  UA_h05 by condition: ${NC.map((sc) => `${sc} ${f(h5.conditions[sc].ece)} (${h5.conditions[sc].classification})`).join(', ')}; pooled ${f(h5.pooled)}`);

console.log('\n5. passive route stream, per mechanism and scope: expected Brier, exact ECE (direction), mean confidence, exact accuracy, mean P(true), false-alarm rate, P(r <= 3)');
for (const m of ['UA', 'FREQ', 'FROZEN', 'NEWEST', WIN, 'UA_h05', 'ORACLE']) {
  console.log(`  ${m}`);
  for (const g of ['NO_CHANGE', 'STABLE', 'NOISY', 'SPARSE', 'SPARSE_E0_2', 'REV_PRE', 'REV_POST_1_2', 'REV_POST_3_6']) {
    const x = R.passive.route[m][g];
    if (!x) continue;
    console.log(`    ${g.padEnd(13)} Brier ${f(x.expectedBrier)}  ECE ${f(x.eceExact)} (${f(x.eceExactDirection)})  conf ${f(x.meanConfidence)}  acc ${f(x.exactAccuracy)}  P(true) ${f(x.meanPTrue)}  FA ${f(x.falseAlarmRate)}  P(r<=3) ${f(x.meanShortRun)}`);
  }
}
const u = R.passive.route.UA.NO_CHANGE;
console.log(`  UA no-change sensitivity: empirical ECE ${f(u.eceEmpirical)}; class-wise ECE ${f(u.eceClasswise)}; equal-mass ECE ${f(u.equalMassEce.ece)} (${f(u.equalMassEce.direction)}); AUROC ${f(u.auroc)}; mean confidence on correct / incorrect probes ${f(u.meanConfidenceCorrectProbes)} / ${f(u.meanConfidenceIncorrectProbes)}; probe Brier ${f(u.probeBrier)} (exact ${f(u.expectedBrier)})`);
console.log('  UA reliability table (exact): bin, points, mean confidence, mean expected correctness');
for (const b of R.reliabilityUA) if (b.n) console.log(`    [${b.bin[0].toFixed(1)}, ${b.bin[1].toFixed(1)})  ${String(b.n).padStart(5)}  ${f(b.meanConfidence)}  ${f(b.meanCorrectness)}`);

console.log('\n6. detection (route stream): mean delay in observations, in worlds, detection rate, censored kinds, slope on s');
for (const m of ['UA', 'FREQ', 'FROZEN', 'NEWEST', WIN, 'UA_a1', 'UA_h02', 'UA_h05', 'UA_h15']) { const d = R.delays.route[m]; console.log(`  ${m.padEnd(10)} ${f(d.meanDelayObservations, 3)}  ${f(d.meanDelayWorlds, 3)}  ${f(d.detectionRate, 3)}  ${d.censored}  ${f(d.slopeOnS, 3)}`); }

console.log('\n7. yoked stream (secondary; CONCRETE\'s own observations): no-change Brier, ECE, FA; NOISY P(true); mean delay; detection rate');
for (const m of ['UA', 'FREQ', 'NEWEST', WIN]) { const x = R.passive.yoked[m], d = R.delays.yoked[m]; console.log(`  ${m.padEnd(10)} ${f(x.NO_CHANGE.expectedBrier)}  ${f(x.NO_CHANGE.eceExact)}  ${f(x.NO_CHANGE.falseAlarmRate)}  ${f(x.NOISY.meanPTrue)}  ${f(d.meanDelayObservations, 3)}  ${f(d.detectionRate, 3)}`); }

console.log('\n8. closed loop: mean steps (STABLE 1-16, NOISY 1-16, post-switch 1-6, SPARSE 1-3), capped episodes, observations per kind after the warm-up, per kind per post-switch world, detour share');
for (const [a, x] of Object.entries(R.closed)) console.log(`  ${a.padEnd(10)} ${f(x.STABLE_1_16.meanSteps, 2)}  ${f(x.NOISY_1_16.meanSteps, 2)}  ${f(x.POST_1_6.meanSteps, 2)}  ${f(x.SPARSE_1_3.meanSteps, 2)}  capped ${x.capped}  ${f(x.observationsPerKindAfterWarmup, 2)}  ${f(x.observationsPerKindPerPostSwitchWorld, 3)}  ${f(x.detourShare, 3)}`);
for (const [w, c] of Object.entries(R.behaviourWindowVsUA)) console.log(`  ${WIN} - UA steps, ${w}: ${f(c.mean, 2)} [${f(c.lo, 2)}, ${f(c.hi, 2)}]`);

console.log('\n9. gate against development (estimates)');
for (const p of adm.parts) { const c = j.criteria.find((x) => x.name === p.name); console.log(`  ${p.name.padEnd(6)} development ${f(p.devEstimate)}  gate ${f(c.mean)}`); }
for (const p of adm.mechDevelopment) { const c = j.criteria.find((x) => x.name === p.name); console.log(`  ${p.name.padEnd(6)} development ${f(p.devEstimate)}  gate ${f(c.mean)}`); }

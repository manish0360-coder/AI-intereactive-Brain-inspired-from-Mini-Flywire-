// M15 freeze consistency check (2026-11-19, on the owner's "GO: Prepare M15 for freeze").
//   node experiments/m15_uncertainty/spec_inputs/freeze_consistency.mjs > experiments/m15_uncertainty/spec_inputs/freeze_consistency.out
// Checks that SPEC.md, the code, the thresholds, the parameters and the admission evidence agree, and that the
// BT-COND requirements hold: (1) all four condition results are mandatory; (2) calibration across conditions is SHOWN
// only when all four pass; (3) a SPARSE failure prevents the unqualified full claim; (4) the false-PASS and
// false-FAIL treatment is documented and implemented. It runs no development or gate label: the criteria metadata
// come from two test-namespace labels, m15unc|test|0..1, a namespace the run refuses.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { M15, SENSITIVITY, LABEL_OF, NO_CHANGE, assertFreshLabels, runLabel, mechanisms, closedArms } from '../m15_lib.mjs';
import { criteria, conditionCalibration, BTCOND, classifyCondition, readingRule } from '../m15_analysis.mjs';
import { E7, SIGMA, SIGMA_INV } from '../../../cognitive/testbed/task_e7.mjs';
import { ADOPTED_AGENT } from '../../../cognitive/testbed/adopted_agent.mjs';
import { PRUNE } from '../../../cognitive/mind/relation_belief/belief.mjs';
import { pinDifferences, pinsNow } from '../pins.mjs';
import { discoveredFiles } from '../../../cognitive/tests/run_discover.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(HERE, '..', '..');
const SPEC = fs.readFileSync(path.join(HERE, 'SPEC.md'), 'utf8');
const PROPOSAL = fs.readFileSync(path.join(HERE, 'PROPOSAL.md'), 'utf8');
const ADM_RAW = fs.readFileSync(path.join(HERE, 'admission', 'admission.json'));
const ADM = JSON.parse(ADM_RAW);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
let pass = 0; const fails = [];
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (c) pass++; else fails.push(m); };
const has = (s) => SPEC.includes(s);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('A. parameters: code = SPEC "Fixed in advance" = the proposal');
ok(M15.alpha === 0.5 && has('| α | ½ (analytic) |'), 'alpha = 1/2');
ok(M15.h === 0.01 && has('**0.01, development-selected**'), 'h = 0.01, development-selected');
ok(eq(SENSITIVITY, { UA_a1: { rule: 'BOCPD', h: 0.01, alpha: 1 }, UA_h02: { rule: 'BOCPD', h: 0.02, alpha: 0.5 }, UA_h05: { rule: 'BOCPD', h: 0.05, alpha: 0.5 }, UA_h15: { rule: 'BOCPD', h: 0.15, alpha: 0.5 } }) && has('α = 1 (h = 0.01); h = 0.02, 0.05, 0.15 (α = ½)'), 'sensitivity arms');
ok(M15.probes === 64 && has('P = 64 per kind per evaluation world'), 'P = 64 probes');
ok(eq(M15.windowGrid, [2, 3, 4]) && has('w ∈ {2, 3, 4}'), 'window grid {2, 3, 4}');
ok(E7.q === 0.25 && E7.switchMin === 2 && E7.switchMax === 10 && E7.warmup === 12 && E7.sparseWarmup === 1 && E7.evaluation === 16 && E7.distance === 4 && E7.cap === 200 && has('q = 0.25; s uniform on {2, …, 10}; 12 warm-up worlds (1 in SPARSE), 16 evaluation worlds; 4-hop routes; cap 200'), 'task E7 constants');
ok(M15.logFloor === 1e-6 && has('p floored at 1e-6'), 'log floor 1e-6');
ok(M15.bins === 10 && M15.bootstrap === 10000 && has('B = 10,000; percentiles sorted[250] and sorted[9749]') && Math.floor(0.025 * 10000) === 250 && Math.ceil(0.975 * 10000) - 1 === 9749, 'bins 10; B = 10,000; percentile indices 250 and 9749');
ok(M15.delayCensor === 7 && M15.delayWithin === 6 && has('censored at 7 if not detected within 6'), 'detection censoring');
ok(PRUNE === 1e-12 && has('prune below 1e-12'), 'BOCPD pruning 1e-12');
ok(eq([...SIGMA], [1, 2, 3, 0]) && eq([...SIGMA_INV], [3, 0, 1, 2]), 'SIGMA and SIGMA^-1');
ok(ADOPTED_AGENT.kind === 'VOL_RHO' && ADOPTED_AGENT.params.rhoFixed === 0.5 && has('VOL_RHO, rhoFixed 0.5'), 'the adopted agent (AD-13)');
ok(eq(mechanisms([2]).map(([m]) => m), ['FREQ', 'FROZEN', 'NEWEST', 'WINDOW_w2', 'UA', 'UA_a1', 'UA_h02', 'UA_h05', 'UA_h15', 'ORACLE']), 'passive mechanisms at w* = 2');
ok(eq(closedArms([2]).map(([m]) => m), ['CONCRETE', 'FROZEN', 'FREQ', 'NEWEST', 'WINDOW_w2', 'UA', 'ORACLE']), 'closed-loop arms at w* = 2');

console.log('B. admission evidence = SPEC = the code that produced it');
const admSha = sha(ADM_RAW);
ok(admSha.startsWith('32c1882e') && admSha.endsWith('07d4') && has('`32c1882e…07d4`'), `admission.json SHA-256 ${admSha}`);
ok(ADM.admitted === true && Object.values(ADM.checks).every(Boolean) && has('| **Admission** | **ADMITTED** |'), 'admitted; A1-A4 all hold');
ok(ADM.wStar === 2 && has('| **2** (w = 2: 0.1960; w = 3: 0.2121; w = 4: 0.2308) |') && [2, 3, 4].map((w) => ADM.windowObjective[w].toFixed(4)).join(' ') === '0.1960 0.2121 0.2308', 'w* = 2 and the objective values');
ok(ADM.margin === 8 && ADM.margin === Math.ceil(ADM.headroom.mean / 4) && has('| Margin, ceil(H / 4) | **8 steps** |'), 'margin 8 = ceil(H / 4)');
ok(ADM.n === 165 && ADM.largestPartN === 45 && has('| **165**: the floor; the part needing most is BT3a, with 45 |'), 'n = 165 (largest part 45, BT3a)');
const H = ADM.headroom;
ok(has(`${H.mean.toFixed(2)} [${H.lo.toFixed(2)}, ${H.hi.toFixed(2)}] steps, SD ${H.sd.toFixed(2)}`), `headroom quoted from the stored values (${H.mean.toFixed(2)} [${H.lo.toFixed(2)}, ${H.hi.toFixed(2)}])`);
ok(has(`${ADM.mde.toFixed(2)} steps; twice that is ${ADM.twiceMde.toFixed(2)}`), 'MDE quoted from the stored value');
ok(has(`(a) ${ADM.A2a.mean.toFixed(2)} [${ADM.A2a.lo.toFixed(2)}, ${ADM.A2a.hi.toFixed(2)}]; (b) ${ADM.A2b.mean.toFixed(3)} [${ADM.A2b.lo.toFixed(3)}, ${ADM.A2b.hi.toFixed(3)}]`), 'A2 quoted from the stored values');
ok(has(`${ADM.A4.observationsPerKindAfterWarmup.toFixed(2)} (≥ 8); ${ADM.A4.observationsPerKindPerPostSwitchWorld.toFixed(2)} (≥ 0.5)`), 'A4 quoted from the stored values');
ok(eq(ADM.parameters.m15, JSON.parse(JSON.stringify(M15))), 'the admission ran with the current M15 parameters');
ok(ADM.labels.run === 60 && ADM.labels.excluded.length === 0, 'admission: 60 development labels, none excluded');
const devQuoted = { T: 2, BT1: 4, BT2a: 4, BT2b: 4, BT3a: 4, BT3b: 4, BT3c: 4, BT4: 4, BT5a: 4, CD2a: 4, CD2b: 4, CD3a: 4, CD3b: 4, ACT1a: 2, ACT1b: 2, ACT2a: 2, ACT2b: 2, ACT3: 2 };
const devBad = Object.entries(devQuoted).filter(([name, d]) => { const p = ADM.parts.find((x) => x.name === name); const v = p.devEstimate.toFixed(d).replace('-', '−'); return !SPEC.includes(`| ${name} | ${v}`) && !SPEC.includes(`| ${v}`); });
ok(devBad.length === 0, `development estimates quoted from the stored values${devBad.length ? ` (not found: ${devBad.map(([n]) => n).join(', ')})` : ''}`);
const reproduction = fs.readFileSync(path.join(HERE, 'spec_inputs', 'admission_reproduction.out'), 'utf8');
ok((reproduction.match(/identical except seconds: true/g) || []).length >= 2, 'admission reproduced twice (review code and final code): identical except its run time');

console.log('C. criteria table in SPEC = the code (names, lines, interval kinds, directions, thresholds)');
const labels = [0, 1].map((i) => `m15unc|test|${i}`);
const Ls = labels.map((l) => runLabel(l, { windows: [ADM.wStar] }));
const C = criteria(Ls, { domain: 'consistency', wStar: ADM.wStar, margin: ADM.margin });
const rows = [...SPEC.matchAll(/^\| (T|BT\d[abc]?|CD\d[ab]?|ACT\d[ab]?|MECH-[abc]) \| (T|BT|CD|ACT|MECH) \| .+? \| (paired|cluster) \| (lower|upper) ([<>]) (margin|[\d.]+) \|$/gm)];
ok(rows.length === 24 && C.length === 24, `24 criterion rows in SPEC (${rows.length}) and 24 parts in the code (${C.length})`);
const mism = [];
for (const c of C) {
  const r = rows.find((x) => x[1] === c.name);
  if (!r) { mism.push(`${c.name}: no row`); continue; }
  const dir = r[4] === 'lower' && r[5] === '>' ? 'lo>' : r[4] === 'upper' && r[5] === '<' ? 'hi<' : '?';
  const thr = r[6] === 'margin' ? ADM.margin : Number(r[6]);
  if (r[2] !== c.line || r[3] !== c.kind || dir !== c.dir || thr !== c.threshold) mism.push(`${c.name}: SPEC ${r[2]}/${r[3]}/${dir}/${thr} vs code ${c.line}/${c.kind}/${c.dir}/${c.threshold}`);
}
ok(mism.length === 0, `every part matches its row${mism.length ? `: ${mism.join('; ')}` : ''}`);
ok(eq(['T', 'BT', 'CD', 'ACT', 'MECH'].map((l) => C.filter((c) => c.line === l).length), [1, 9, 6, 5, 3]), 'parts per line: T 1, BT 9, CD 6, ACT 5, MECH 3');
ok(has('| BT1 | BT | exact top-1 ECE, no-change phases (UA) | cluster | upper < 0.10 |') && PROPOSAL.includes('| **BT1** | Top-1 ECE (exact) | upper < 0.10 |'), 'BT1 unchanged: the SPEC row and the proposal\'s row (upper < 0.10)');
ok(eq(ADM.parts.map((p) => p.name), C.filter((c) => c.line !== 'MECH').map((c) => c.name)), 'the admission powered exactly the T, BT, CD and ACT parts');

console.log('D. BT-COND (added after development results were observed): definition, mandatory results, statistics');
ok(BTCOND.threshold === 0.10 && eq([...BTCOND.conditions], ['STABLE', 'NOISY', 'SPARSE', 'REV_PRE']) && BTCOND.failLowerQuantile === 0.00625 && Math.floor(0.00625 * 10000) === 62, 'BT-COND: threshold 0.10, four conditions, family lower bound sorted[62]');
ok(has('**Added after development results were observed.**') && has('It is\n> **not** part of the original pre-declaration.') && BTCOND.added === 'pre-freeze review, 2026-11-19, after development results were observed; not part of the original pre-declaration', 'BT-COND is labelled in SPEC and code as added after development results');
ok(['STABLE', 'NOISY', 'SPARSE', 'REV_PRE'].every((sc) => has(`|BTCOND|${sc}\``)) && has('95% upper bound (sorted[9749]) < 0.10') && has('family lower bound (sorted[62], the 0.625th percentile) ≥ 0.10'), 'BT-COND rows: tags and PASS / MATERIAL FAIL rules in SPEC');
ok(has('| A false PASS in a condition') && has('| A false "calibration across conditions SHOWN"') && has('| A false MATERIAL FAIL in a condition') && has('at most 2.5% familywise over the four conditions') && has('intersection-union test'), '(4) false PASS, false SHOWN and false FAIL treatment documented');
const cls = (o) => classifyCondition({ points: 1, ece: 0.1, ...o });
ok(cls({ hi: 0.0999, loFamily: 0 }) === 'PASS' && cls({ hi: 0.1, loFamily: 0 }) === 'INCONCLUSIVE' && cls({ hi: 0.2, loFamily: 0.1 }) === 'MATERIAL FAIL' && cls({ hi: 0.2, loFamily: 0.0999 }) === 'INCONCLUSIVE' && classifyCondition({ points: 0 }) === 'MISSING', 'classification implements the documented rules (strict PASS, FAIL at >= 0.10)');
const btc = conditionCalibration(Ls, { domain: 'consistency' }, 'UA');
ok(btc.complete && NO_CHANGE.every((sc) => btc.conditions[sc].points > 0 && Number.isFinite(btc.conditions[sc].ece) && Number.isFinite(btc.conditions[sc].loFamily)), '(1) the code produces all four condition results, with both bounds');

console.log('E. reading rule: the statement for each case');
const names = { T: ['T'], BT: ['BT1', 'BT2a', 'BT2b', 'BT3a', 'BT3b', 'BT3c', 'BT4', 'BT5a', 'BT5b'], CD: ['CD1a', 'CD1b', 'CD2a', 'CD2b', 'CD3a', 'CD3b'], ACT: ['ACT1a', 'ACT1b', 'ACT2a', 'ACT2b', 'ACT3'], MECH: ['MECH-a', 'MECH-b', 'MECH-c'] };
const parts = (fail = []) => Object.entries(names).flatMap(([line, ns]) => ns.map((n) => ({ name: n, line, pass: !fail.includes(n) })));
const valid = { determinism: true, suite: true, vRev: true, concretePassive: true, noExclusion: true, frozenUnchanged: true, probeIsolation: true, identity: true };
const sens = { UA_h05: names.BT.map((n) => ({ name: n, line: 'BT', pass: true })) };
const mkBtc = (spec) => { const conditions = {}; for (const [sc, [ece, lo, hi, loF, d]] of Object.entries(spec)) { conditions[sc] = { points: 10, ece, lo, hi, loFamily: loF, direction: d }; conditions[sc].classification = classifyCondition(conditions[sc]); } const allPass = NO_CHANGE.every((sc) => conditions[sc].classification === 'PASS'); return { conditions, complete: NO_CHANGE.every((sc) => conditions[sc]), allPass, line: allPass ? 'SHOWN' : 'NOT SHOWN', pointWeightedMean: 0.12, pooled: 0.074 }; };
const devLike = mkBtc({ STABLE: [0.0824, 0.0824, 0.0824, 0.0824, 0.08], NOISY: [0.0937, 0.0896, 0.0979, 0.087, -0.07], SPARSE: [0.1945, 0.1945, 0.1945, 0.1945, 0.19], REV_PRE: [0.0978, 0.0966, 0.0991, 0.096, 0.1] });
const allPassBtc = mkBtc({ STABLE: [0.05, 0.04, 0.06, 0.03, 0.05], NOISY: [0.05, 0.04, 0.06, 0.03, -0.05], SPARSE: [0.05, 0.04, 0.06, 0.03, 0.05], REV_PRE: [0.05, 0.04, 0.06, 0.03, 0.05] });
let r = readingRule(parts(['MECH-a', 'MECH-b']), sens, valid, allPassBtc);
ok(/^CALIBRATED ADAPTIVE BELIEF TRACKING AND CHANGE DETECTION SHOWN, with a development-selected hazard \(h = 0.01\), IN CLOSED-LOOP BEHAVIOUR; /.test(r.statement) && r.lines.calibrationAcrossConditions === 'SHOWN', '(2) all four PASS: the full name is allowed');
r = readingRule(parts(['MECH-a', 'MECH-b']), sens, valid, devLike);
ok(/^POOLED CALIBRATION AND CHANGE DETECTION SHOWN \(development-selected h = 0.01\), IN CLOSED-LOOP BEHAVIOUR; CALIBRATION ACROSS CONDITIONS NOT SHOWN: UA materially underconfident in SPARSE \(ECE 0\.195\); /.test(r.statement) && !/CALIBRATED ADAPTIVE/.test(r.statement), '(3) the development-like case: SPARSE MATERIAL FAIL prevents the full name; the statement distinguishes pooled from across conditions');
console.log(`      statement: ${r.statement}`);
ok(NO_CHANGE.every((sc) => r.statement.includes({ STABLE: 'STABLE 0.082', NOISY: 'NOISY 0.094', SPARSE: 'SPARSE 0.195', REV_PRE: 'REVERSED before the switch 0.098' }[sc])), '(1) the statement lists all four condition results');
const oneInconclusive = mkBtc({ STABLE: [0.05, 0.04, 0.06, 0.03, 0.05], NOISY: [0.099, 0.095, 0.103, 0.093, -0.05], SPARSE: [0.05, 0.04, 0.06, 0.03, 0.05], REV_PRE: [0.05, 0.04, 0.06, 0.03, 0.05] });
r = readingRule(parts([]), sens, valid, oneInconclusive);
ok(/CALIBRATION ACROSS CONDITIONS NOT SHOWN: NOISY inconclusive/.test(r.statement) && !/CALIBRATED ADAPTIVE/.test(r.statement), '(2) one INCONCLUSIVE condition also prevents SHOWN');
r = readingRule(parts(['CD1a']), sens, valid, devLike);
ok(/^POOLED CALIBRATED BELIEF TRACKING \(BT, development-selected hazard h = 0.01\): SHOWN; CALIBRATION ACROSS CONDITIONS: NOT SHOWN: UA materially underconfident in SPARSE/.test(r.statement), '(4) when CD fails, each line is stated, the pooled line named as pooled');
r = readingRule(parts([]), sens, valid, null);
ok(r.statement === 'INVALID — NO CRITERION IS INTERPRETED' && /conditionResults/.test(r.lines.validity), '(1) no condition results: INVALID');
r = readingRule(parts([]), sens, valid, { ...devLike, complete: false });
ok(/conditionResults/.test(r.lines.validity), '(1) a missing condition result: INVALID');
r = readingRule(parts([]), sens, valid, btc);
ok(NO_CHANGE.every((sc) => r.statement.includes(`${sc === 'REV_PRE' ? 'REVERSED before the switch' : sc} ${btc.conditions[sc].ece.toFixed(3)}`)), 'a real BT-COND result (test labels) reaches the statement with all four conditions');

console.log('F. namespaces, driver, pins, tests, untouched studies');
ok(LABEL_OF.m15(0) === 'm15unc|gate|0' && has('`m15unc|gate|0..n−1`'), 'gate labels m15unc|gate|<i>');
let refused = 0;
for (const bad of [LABEL_OF.dev(0), LABEL_OF.smoke(0), 'm15unc|test|0', 'm15unc|unit|0']) { try { assertFreshLabels([bad]); } catch { refused++; } }
ok(refused === 4, 'development, smoke, test and unit labels are refused');
// The driver is launched only while SPEC.md is NOT Frozen (it must refuse at once). Once Frozen, a committed clean
// tree would let it start the official run, so it is never launched here: its refusal code is inspected instead.
if (!/^\*\*Status\.\*\* Frozen/m.test(SPEC)) {
  const drv = spawnSync(process.execPath, [path.join(HERE, 'run_m15.mjs'), '--domain', 'm15'], { cwd: ROOT, encoding: 'utf8' });
  ok(drv.status === 2 && /is not marked Frozen/.test(drv.stderr), `the driver refuses the run while SPEC.md is not Frozen (exit ${drv.status})`);
} else {
  const src = fs.readFileSync(path.join(HERE, 'run_m15.mjs'), 'utf8');
  ok(['is not marked Frozen', 'does not match its frozen SHA-256', 'files differ from PINS.json', 'files are not all committed and clean', 'the M15 labels have already been run', 'the test suite does not pass', 'does not admit the task'].every((m) => src.includes(m)), 'SPEC.md is Frozen: the driver is not launched here; its refusal checks are present in its source');
}
const pd = pinDifferences();
ok(pd.length === 0, `PINS.json matches the files (${Object.keys(pinsNow()).length} pinned)${pd.length ? `: ${pd.join('; ')}` : ''}`);
const pinned = Object.keys(pinsNow());
ok(['cognitive/mind/relation_belief/belief.mjs', 'cognitive/mind/relation_belief/agent.mjs', 'cognitive/mind/schema/agent.mjs', 'cognitive/testbed/task_e7.mjs', 'cognitive/testbed/task_e6.mjs', 'cognitive/testbed/adopted_agent.mjs', 'experiments/m15_uncertainty/m15_lib.mjs', 'experiments/m15_uncertainty/m15_analysis.mjs', 'experiments/m15_uncertainty/admission/admission.json', 'scripts/test_discover.mjs', 'cognitive/tests/run_discover.mjs'].every((f) => pinned.includes(f)), 'the pins cover the belief, the agents, both tasks, the library, the analysis, the admission record and the runner');
const testSrc = fs.readFileSync(path.join(ROOT, 'cognitive', 'tests', 'test_m15_belief.mjs'), 'utf8');
const nTests = (testSrc.match(/^ {2}\['M15 /gm) || []).length;
ok(nTests === 17 && has('`test_m15_belief.mjs` (17 tests)') && discoveredFiles().includes('test_m15_belief.mjs'), `the M15 test file has ${nTests} tests, as SPEC says, and discovery runs it`);
for (const study of ['m13_generalization', 'm14_schema']) {
  const p = spawnSync(process.execPath, [path.join(ROOT, 'experiments', study, 'pins.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  ok(p.status === 0, `${study}: PINS.json still matches (unchanged)`);
}
const gitattr = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
ok(/^experiments\/m15_uncertainty\/\*\* -text$/m.test(gitattr), '.gitattributes keeps experiments/m15_uncertainty/** byte-exact');
if (/^\*\*Status\.\*\* Frozen/m.test(SPEC)) {
  const shaFile = path.join(HERE, 'SPEC.sha256');
  const lines = fs.existsSync(shaFile) ? fs.readFileSync(shaFile, 'utf8').trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/)) : [];
  ok(['SPEC.md', 'PINS.json', 'admission/admission.json'].every((f) => lines.some(([h, n]) => n === f && h === sha(fs.readFileSync(path.join(HERE, n))))), 'SPEC.md is Frozen and every line of SPEC.sha256 matches');
} else ok(/^\*\*Status\.\*\* FREEZE CANDIDATE/m.test(SPEC), 'SPEC.md is a freeze candidate, not frozen');

console.log('\ncandidate hashes (SPEC.md changes when its status line is set to Frozen; SPEC.sha256 is written then):');
console.log(`  SPEC.md (candidate)       ${sha(fs.readFileSync(path.join(HERE, 'SPEC.md')))}`);
console.log(`  PINS.json                 ${sha(fs.readFileSync(path.join(HERE, 'PINS.json')))}`);
console.log(`  admission/admission.json  ${admSha}`);
console.log(`\n${fails.length ? `${fails.length} FAILURE(S)` : 'ALL CHECKS PASS'} (${pass} passed)`);
process.exit(fails.length ? 1 : 0);

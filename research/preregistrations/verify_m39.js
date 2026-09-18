// ==========================================================
// M39 GATE — FutureScore shadow-evaluation FORMULATION
// ==========================================================
// PASS 2: every source claim the memo makes is re-derived here from the current files, not from
// the memo. Nothing is implemented, no agent is run, no configuration is generated and no seed is
// evaluated: env.js is imported only to read topology-level facts (decisionStates) and its seed
// census is checked to stay empty.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO_PATH = path.join(ROOT, 'research/preregistrations/M39_FUTURESCORE_SHADOW_EVALUATION_FORMULATION.md');
const BASE = '8b9355f304b887b1a7bec5e2e13f851f5520bfd6';          // D2
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

const MAIN = read('main.js');
const L = MAIN.split('\n');
const lineOf = (n) => L[n - 1] || '';
// body of a function starting at 1-based line n, by brace matching with strings/comments skipped
function bodyFrom(src, startIdx) {
  let i = src.indexOf('{', startIdx), depth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k], d = src[k + 1];
    if (c === '/' && d === '/') { k = src.indexOf('\n', k); continue; }
    if (c === '/' && d === '*') { k = src.indexOf('*/', k) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; k++; while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; } continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return src.slice(startIdx, k + 1); }
  }
  return null;
}
const offsetOfLine = (n) => L.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0);
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([;{}),])\s*\/\/.*$/gm, '$1');

console.log('='.repeat(78)); console.log('  M39 GATE — FutureScore shadow-evaluation formulation'); console.log('='.repeat(78));

// ---- S: the source trace (§2) -----------------------------------------------------------------------
section('S  source trace at the stated lines, in the stated order');
const ANCHORS = [
  [1403, 'function runPrediction(startKey) {'], [1593, 'const allCandidates = new Map'],
  [1607, 'allCandidates.forEach((value, k) => {'], [1610, 'if (penalties.get(currentKey + "->" + k) > 10)'],
  [1620, 'if (candidateQ < -0.5)'], [1674, 'return; // skip non-graph, non-trained candidates'],
  [1678, 'if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId)) {'], [1710, 'if (!analysis) return;'],
  [1854, 'const imaginedFuture = targetNeuronForFuture'], [1874, 'Math.min(imaginedFuture * 4, 20);'],
  [2068, 'calculateDecisionScore({'], [2266, 'arbitratedScore = finalWeight * 0.60'],
  [2271, 'weight: arbitratedScore'], [2366, 'if (liveRng() < epsilon'], [2378, 'const bestChoice = sorted[0];'],
  [2423, 'structureMap.forEach((value, k) => {'], [2596, 'let nextKey = exploreChoice'], [2835, 'regulateBiology('],
];
const missing = ANCHORS.filter(([n, t]) => !lineOf(n).includes(t)).map(([n]) => n);
ok('S1', missing.length === 0, `all ${ANCHORS.length} cited main.js anchors are at their stated lines${missing.length ? ' — missing ' + missing.join(',') : ''}`);
const lines = ANCHORS.map(([n]) => n);
ok('S2', lines.every((n, i) => i === 0 || n > lines[i - 1]),
  'order: pool → F1..F5 → futureScore → cap → scoring → blend → push → ε draw → bestChoice → augmentation → nextKey → regulateBiology');
const RP = bodyFrom(MAIN, offsetOfLine(1403));
const rpEnd = 1403 + RP.split('\n').length - 1;
const loopBody = bodyFrom(MAIN, offsetOfLine(1607));
const loopLines = MAIN.slice(offsetOfLine(1607), offsetOfLine(1607) + loopBody.length).split('\n');
const retLines = loopLines.map((s, i) => [1607 + i, s]).filter(([, s]) => /\breturn\b/.test(s.replace(/\/\/.*$/, ''))).map(([n]) => n);
ok('S3', JSON.stringify(retLines) === '[1611,1621,1674,1679,1710]' && retLines.every(n => n < 1854),
  `POOL INVARIANCE: the candidate loop's only exclusions are at ${JSON.stringify(retLines)}, all before the futureScore call at 1854`);
const rpCode = stripComments(RP);
const WRITERS = ['replayOneEpisode', 'rebuildSchemas', 'episodeRecordNode', 'updateQ', 'setQ', 'dampQ', 'recordAttempt',
  'recordSuccess', 'recordTraversal', 'reinforcePath', 'weakenPath', 'recordSemanticEdge', 'rewardCurrentEpisode',
  'sealCurrentEpisode', 'runConsolidationPass'];
const called = WRITERS.filter(w => new RegExp(`\\b${w}\\s*\\(`).test(rpCode));
ok('S4', !/Date\.now|performance\.now/.test(rpCode) && called.length === 0,
  `runPrediction (lines 1403–${rpEnd}) has no direct clock read and calls none of the ${WRITERS.length} learning/replay/schema writers`);
const CA = read('render/candidateAnalysis.js');
const caStart = CA.indexOf('export function analyzeCandidate(');
const caBodyStart = CA.indexOf(') {', caStart);
const caBody = bodyFrom(CA, caBodyStart);
ok('S5', /Date\.now\(\)\s*-\s*lastUsed/.test(caBody) && (MAIN.match(/\btimeScore\b/g) || []).length === 1 && lineOf(1731).includes('timeScore'),
  'analyzeCandidate reads Date.now() for timeScore; main.js mentions timeScore exactly once (destructuring at 1731) and never uses it');
const SC = read('render/scoring.js');
ok('S6', /\['futureBonus',\s*futureBonus \* 1\.2\]/.test(SC) && /semanticScore:[\s\S]{0,200}futureBonus \* 1\.2/.test(SC) &&
  /\['goalGradientBoost',\s*goalGradientBoost \* 2\.0\]/.test(SC) && /30 \/ \(dist \+ 0\.5\) \* 0\.75 \+ 5/.test(MAIN),
  'futureBonus enters the learned score (×1.2) and the arbitration semanticScore (×1.2); goalGradientBoost = 30/(d+0.5)·0.75+5, ×2');
const I = await import(pathToFileURL(path.join(ROOT, 'experiments/uqb/instrument.js')).href);
const count = (t) => L.filter(s => s.replace(/\s+$/, '') === t).length;
const blockCount = (b) => { let n = 0; for (let i = 0; i + b.length <= L.length; i++) if (b.every((x, j) => L[i + j].replace(/\s+$/, '') === x)) n++; return n; };
ok('S7', count(I.ANCHOR_BESTCHOICE) === 1 && count(I.ANCHOR_LOOP) === 1 && blockCount(I.ANCHOR_IMAGINED) === 1 && blockCount(I.ANCHOR_FUTUREBONUS) === 1,
  'the frozen UQ-B instrumentation anchors (bestChoice, loop, imaginedFuture, futureBonus) each still resolve exactly once in current main.js');

// ---- E: existing machinery and prior results (§3) -------------------------------------------------------
section('E  existing machinery, UQ-B results, Branch B, registry, oracles');
const U = JSON.parse(read('experiments/uqb/results/uqb_results.json'));
const cells = U.configurations.flatMap(c => ['1', '2'].map(ph => ({ goal: c.goal, a: c.c2.ARMED[ph] })));
const tied = cells.filter(x => x.a.shuffles.length === 19 && x.a.shuffles.every(s => s === x.a.observed));
const untiedGoals = [...new Set(cells.filter(x => !tied.includes(x)).map(x => x.goal))].sort((a, b) => a - b);
const ex = U.configurations.find(c => c.configSeed === 897022 && c.configIndex === 0);
ok('E1', U.configurations.length === 71 && cells.length === 142 && cells.every(x => x.a.verdict === 'NOT-REJECTED') &&
  tied.length === 100 && JSON.stringify(untiedGoals) === '[8,12,19]' && !U.configurations.some(c => c.goal === 16) &&
  ex && ex.c2.ARMED['1'].observed === 2 && ex.c2.ARMED['1'].shuffles.every(s => s === 2),
  `UQ-B (pre-D2): 71 configurations, 0 C2 rejections in 142 cells; ${tied.length}/142 cells fully tied; the rest only at goals ${JSON.stringify(untiedGoals)}; no goal-16 configuration`);
// the inference's premise: for goals 8, 12 and 19 some of nodes 1..4 lie within 3 hops (admissible by F4)
{
  const adj = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, []]));
  for (const e of JSON.parse(read('connections.json'))) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); }
  const dist = (g) => { const d = new Map([[g, 0]]), q = [g]; while (q.length) { const x = q.shift(); for (const y of adj.get(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } } return d; };
  const admissible = (g) => [1, 2, 3, 4].filter(n => dist(g).get(n) <= 3);
  ok('E1b', [8, 12, 19].every(g => admissible(g).length > 0),
    `premise of the inference: nodes 1..4 within 3 hops — goal 8 ${JSON.stringify(admissible(8))}, 12 ${JSON.stringify(admissible(12))}, 19 ${JSON.stringify(admissible(19))}`);
}
const DET = read('experiments/m7/verify_determinism.js'), RUN = read('experiments/m7/run.js');
ok('E2', /SOLE causal source/.test(DET) && /over 48 runs/.test(DET) && /globalThis\.__M7_REPLAY_ONCE__ = true;/.test(RUN),
  'Branch B (2026-08-26): the replay cooldown was the sole causal clock source over 48 runs; run.js sets __M7_REPLAY_ONCE__');
const D2C = read('experiments/d2/child.mjs'), DRV = read('experiments/phase1_0/_driver.js'), SHIM = read('benchmarks/harness/headlessShim.js');
ok('E3', /phase1_0\/_driver\.js/.test(D2C) && !/REPLAY_ONCE/.test(DRV + SHIM + D2C),
  'D2 lineage correction: the D2 arms ran on the Phase 1.0 driver, which never sets __M7_REPLAY_ONCE__');
const REG = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed_after_c1.js')).href);
const dev = REG.TERRITORY.consumed.find(r => r.lo === 896000 && r.hi === 896999);
const M11 = read('experiments/m11/verify_repair.js');
const fixtures = [[896066, 0], [896066, 1], [896238, 2], [896329, 3]];
ok('E4', dev && /development/.test(dev.why) && fixtures.every(([s, i]) => REG.isConsumed(s) &&
  new RegExp(`configSeed: ${s}, configIndex: ${i}`).test(M11)),
  'the four pilot fixtures are M11\'s, already evaluated, inside the consumed development block 896000–896999');
const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
ok('E5', ['reliabilityOptimalPolicy', 'hopOptimalPolicy', 'expectedCostToGoal', 'decisionStates'].every(f => typeof env[f] === 'function') &&
  env.GOALS.every(g => env.decisionStates(g).length === 19),
  'the oracles exist in env.js; decisionStates(g) = 19 for every frozen goal');
const UQ = read('research/preregistrations/UQB_PREREGISTRATION.md');
ok('E6', /\| G2 \| Its fourth term, `lookAheadScore`[^|]*It carries no environmental information/.test(UQ) &&
  /readout\(u\) = bestChoice\.key from runPrediction\(u\), taken at step === 0/.test(UQ),
  'UQ-B G2 (lookAheadScore is information-free) and the §8 bestChoice step-0 readout are as cited');
const J1 = read('research/preregistrations/UQB_J1_STATE_CLOSURE_AUDIT_CORRECTED.md');
ok('E7', /`regulateBiology`\*\*[^\n]*9 states/.test(J1) && /FROZEN by R2/.test(J1) && fs.existsSync(path.join(ROOT, 'experiments/uqb/bio.js')),
  'J1 state closure: regulateBiology writes 9 states; transitionUncertaintyMap frozen by R2; the R3 bio freeze exists');

// ---- I: integrity -----------------------------------------------------------------------------------------
section('I  integrity: formulation only');
const PROTECTED = ['main.js', 'render/planning.js', 'render/scoring.js', 'render/candidateAnalysis.js', 'instrumentation/rng.js',
  'experiments/m7/env.js', 'experiments/m7/run.js', 'experiments/uqb/instrument.js', 'experiments/uqb/bio.js',
  'experiments/uqb/results/uqb_results.json', 'experiments/c1/protocol.js', 'experiments/c1/data/candidates.jsonl',
  'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/typed.js',
  'experiments/d2/verify.js', 'experiments/d2/D2_EVIDENCE_LINEAGE.md', 'research/preregistrations/UQB_PREREGISTRATION.md',
  'research/preregistrations/C1_PREREGISTRATION.md', 'neurons.json', 'connections.json'];
const same = (f) => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim();
ok('I1', PROTECTED.every(same), `${PROTECTED.length} production, UQ-B, C1, registry, D2 and data files byte-identical to D2 ${BASE.slice(0, 7)}`);
ok('I2', !fs.existsSync(path.join(ROOT, 'experiments/m39')), 'no implementation directory: formulation only');
ok('I3', env.evaluatedSeeds().length === 0 && REG.isConsumed(895500), 'no configuration generated (env seed census empty); registry unchanged in effect');

// ---- M: memo binding -------------------------------------------------------------------------------------
section('M  memo bound to the verified facts');
const MEMO = fs.existsSync(MEMO_PATH) ? fs.readFileSync(MEMO_PATH, 'utf8').replace(/\r\n/g, '\n') : '';
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
const C = {
  readout: (M) => flat(M).includes('The readout is bestChoice at step 0') && flat(M).includes('main.js:2378 | const bestChoice = sorted[0]'),
  poolInvariance: (M) => flat(M).includes('Pool invariance (structural): every exclusion F1–F5 precedes the FutureScore call'),
  estimand: (M) => flat(M).includes('| E2 | paired oracle contrast') && flat(M).includes('| PRIMARY |'),
  // matched on the RAW memo: flat() strips '*', which would erase the R* notation itself
  oracle: (M) => M.includes('**Primary:** `R*(u) = argmin over v ∈ N(u) of [1/p(u,v) + C(v)]`') && M.includes('**Disclosure only:** `H*(u)`'),
  controls: (M) => flat(M).includes('| RANDOM (Gemini) | independent random values | — | rejected |') &&
    flat(M).includes('| ORACLE-INJECTED (Gemini) |') && flat(M).includes('pilot diagnostic only'),
  uqbTies: (M) => flat(M).includes('0 C2 rejections in 142 (configuration, phase) cells') &&
    flat(M).includes('In 100 of the 142 cells all 19 shuffles tied the observed alignment') && flat(M).includes('Inference, not proof'),
  lineage: (M) => flat(M).includes('Correction to the D2 record (lineage, not a reopening)') && flat(M).includes('Phase 1.0 driver'),
  noMdp: (M) => flat(M).includes('Gemini\'s "not an MDP" is not adopted.'),
  fixtures: (M) => flat(M).includes('896066:0, 896066:1, 896238:2, 896329:3'),
  rulings: (M) => ['RU-1', 'RU-2', 'RU-3', 'RU-4', 'RU-5', 'RU-6', 'RU-7'].every(r => M.includes(`**${r}**`)),
  claims: (M) => !/FutureScore (improves|is useful|is optimal|works)|demonstrates cognition|validated mechanism/i.test(
    flat(M).replace(/No claim[^.]*\./gi, '').replace(/no FutureScore, planning[^.]*\./gi, '')),
  status: (M) => (M.match(/^> # M39-(GREEN|YELLOW|RED|HOLD)/gm) || []).length === 2 && !/^> # M39-(YELLOW|RED|HOLD)/m.test(M),
};
if (MEMO) {
  for (const [k, f] of Object.entries(C)) ok(`M-${k}`.slice(0, 16), f(MEMO), `memo ${k} matches the verified facts`);
  const corrupt = {
    readout: MEMO.replaceAll('The readout is `bestChoice` at step 0', 'The readout is the executed move'),
    poolInvariance: MEMO.replace('every exclusion F1–F5 precedes', 'some exclusions follow'),
    estimand: MEMO.replace('| **E2** | **paired oracle contrast**', '| **E2** | **trajectory goal-reach**'),
    oracle: MEMO.replace('**Primary:** `R*(u)', '**Primary:** `H*(u)'),
    controls: MEMO.replace('| RANDOM (Gemini) | independent random values | — | **rejected** |', '| RANDOM (Gemini) | independent random values | — | **required** |'),
    uqbTies: MEMO.replace('In **100 of the 142 cells all 19 shuffles tied', 'In **every cell all 19 shuffles tied'),
    lineage: MEMO.replace('Correction to the D2 record (lineage, not a reopening)', 'D2 note'),
    noMdp: MEMO.replace('**Gemini\'s "not an MDP" is not adopted.**', 'The agent is not an MDP.'),
    fixtures: MEMO.replace('`896066:0`, `896066:1`, `896238:2`, `896329:3`', 'new seeds'),
    rulings: MEMO.replace('**RU-7**', 'RU-seven'),
    claims: MEMO + '\nFutureScore improves decisions.\n',
    status: MEMO.replaceAll('# M39-GREEN', '# M39-YELLOW'),
  };
  for (const [k, t] of Object.entries(corrupt)) ok(`X-${k}`.slice(0, 16), t !== MEMO && C[k](t) === false, `corrupting the memo breaks '${k}'`);
} else ok('M0', false, 'memo not found');

console.log('\n' + '='.repeat(78));
console.log(`  M39 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

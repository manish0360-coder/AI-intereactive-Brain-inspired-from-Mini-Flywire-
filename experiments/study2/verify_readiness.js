// ==========================================================
// STUDY-2 IMPLEMENTATION-READINESS GATE (M-STUDY2-IMPLEMENTATION-GATE)
// ==========================================================
// Verifies the readiness evidence already produced on the permitted DEVELOPMENT replay and the validation
// suite, plus the source-level leakage gate. It runs no agent, generates no seed, runs no Study 2, and
// computes no oracle, tau-b or Delta on any study data.
//
// Scanner rules carried from B4.1 / FS-LN-01: comments and strings stripped with line numbers kept;
// scope checks never count this milestone's own files; hashes over LF-normalised content.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { shadowSource, mainSource, REPORT_INJECTIONS, PLANNING_TAIL, SETTICK_TAIL, READER_HREF } from './hook_capture.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BASE = 'd1949f91601683ef2e955f8b766c2e656ffc8047';                  // Study-2 design freeze
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const shaLF = (t) => crypto.createHash('sha256').update(t.replace(/\r\n/g, '\n')).digest('hex');
const shaBytes = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const json = (f) => JSON.parse(read(f));

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(6)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
const codeOf = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/([;{}),])[ \t]*\/\/.*$/gm, '$1')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, (m) => '``' + m.replace(/[^\n]/g, ''));
const ORACLE = /\bexpectedCostToGoal\b|\breliabilityOptimalPolicy\b|\btrueP\b|\bpPhase[12]\b|\bhopOptimalPolicy\b|\br5DecisionStateDiff\b/;

console.log('='.repeat(78)); console.log('  STUDY-2 IMPLEMENTATION-READINESS GATE (no Study-2 run, no seeds)'); console.log('='.repeat(78));
const DOC = read('research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md');
const CAP = json('experiments/study2/readiness_evidence/readiness_capture.json');
const E = CAP.events;
const V = json('experiments/study2/validation/RESULTS.json');
const count = (f) => E.filter(f).length;

// ---- SC: the scanner proves itself ------------------------------------------------------------------
section('SC  scanner self-tests');
ok('SC1', !ORACLE.test(codeOf('// expectedCostToGoal(p, g)\nconst s = "trueP";\n')) && ORACLE.test(codeOf('const c = expectedCostToGoal(p, g);\n')),
  'the oracle scan ignores comments/strings and detects a real call');
ok('SC2', codeOf(read('main.js')).split('\n').length === read('main.js').split('\n').length, 'comment stripping preserves main.js line numbering');

// ---- PR: preregistration repairs ----------------------------------------------------------------------
section('PR  preregistration repairs');
ok('PR1', /θ\s+= median over runs r of Δ_r\s+← PRIMARY estimand/.test(DOC) && /The mean of `Δ_r` across runs is retained\s+as \*\*secondary, descriptive\*\*/.test(DOC),
  '§D: primary estimand is median_r Delta_r; mean secondary');
ok('PR2', /two-sided 95% percentile interval of the exact nonparametric bootstrap distribution/.test(DOC) && /`⌊0\.025·N⌋`/.test(DOC)
  && /`⌈0\.975·N⌉ − 1`/.test(DOC) && /excludes zero\*\* iff `lower > 0` or `upper < 0`, strictly/.test(DOC) && /No effect-size threshold is set/.test(DOC),
  '§W: interval rule frozen (exact bootstrap, 95%, bound positions, strict exclusion), no effect threshold');
ok('PR3', /\*\*`K\(e\)` is the exact step-0 ranking candidate set:\*\*/.test(DOC) && /Imagined successor states produced by steps\s+1…STEPS−1 are excluded from the primary endpoint/.test(DOC.replace(/\*\*/g, '')),
  '§G: K(e) is the step-0 candidate set; imagined successors excluded');
ok('PR4', /Superseded wording, retained for lineage/.test(DOC) && /\*\*This was incorrect\.\*\*/.test(DOC), '§G: superseded wording retained, not erased');
ok('PR5', /must \*\*equal\*\* the step-0 FutureScore candidate set/.test(DOC) && /`targetNeuronForFuture\(k\)` \(`main\.js:1968`\) must resolve to `k` itself/.test(DOC),
  'G-IMPL-1 now includes the candidate-set equivalence requirement');
let dg = ''; try { dg = execFileSync(process.execPath, [path.join(ROOT, 'research/preregistrations/verify_fs_study2_design_final.js')], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { dg = String(e.stdout || ''); }
const dgFails = [...dg.matchAll(/\[FAIL\] (\S+)/g)].map((m) => m[1]);
ok('PR6', dgFails.every((id) => ['G2', 'G3'].includes(id)),
  `design-freeze gate: every content/source/lineage check still passes; only its milestone-scope checks flip (${dgFails.join(',') || 'none'})`);

// ---- G1: same snapshot + candidate set ------------------------------------------------------------------
section('G1  G-IMPL-1 same snapshot and step-0 candidate set');
const planning = read('render/planning.js');
for (const mode of ['FULL', 'GEO']) {
  const a = planning.split('\n'), b = shadowSource(planning, mode).split('\n');
  const diff = a.map((l, i) => (l === b[i] ? null : i + 1)).filter((x) => x !== null);
  ok(`G1.${mode}`, a.length === b.length && diff.length === 1 && b[diff[0] - 1] === `} from "${READER_HREF}?mode=${mode}";`,
    `${mode} shadow differs from render/planning.js in exactly one line (${diff.join(',')}): the recordFor import -> snapshot reader`);
}
const GEOR = await import(READER_HREF + '?mode=GEO'), FULLR = await import(READER_HREF + '?mode=FULL');
let fullThrows = false; globalThis.__S2_SNAPSHOT__ = null; try { FULLR.recordFor(1, 2); } catch { fullThrows = true; }
globalThis.__S2_SNAPSHOT__ = new Map([['1->2', { a: 4, s: 1 }]]);
const fullReads = JSON.stringify(FULLR.recordFor(1, 2)) === '{"a":4,"s":1}' && JSON.stringify(FULLR.recordFor(2, 1)) === '{"a":0,"s":0}';
globalThis.__S2_SNAPSHOT__ = null;
ok('G1.R', JSON.stringify(GEOR.recordFor(1, 2)) === '{"a":0,"s":0}' && fullThrows && fullReads,
  'reader: GEO always {0,0}; FULL reads only the bound snapshot and throws when none is bound');
const idKeys = ['A_sameIds', 'B_sameCardinality', 'C_noMissing', 'D_noExtra', 'E_noDuplicates', 'F_orderDeterministic', 'G_targetEqualsCandidate'];
// step-0-only membership is proven by construction (only chain === 0 calls are recorded) AND by check A:
// every recorded candidate is in the step-0 ranking. No data-derived size bound is used.
ok('G1.1', E.length > 0 && E.every((e) => e.idCheck.A_sameIds && e.nCand >= 2),
  `K(e) holds step-0 ranking candidates only (${E.length} events; observed sizes ${Math.min(...E.map((e) => e.nCand))}-${Math.max(...E.map((e) => e.nCand))}, reported not thresholded)`);
for (const k of idKeys) ok('G1.' + k[0], count((e) => e.idCheck[k]) === E.length, `${k}: ${count((e) => e.idCheck[k])}/${E.length}`);
ok('G1.4', count((e) => e.fullEqLive) === E.length, `FULL shadow == live production FutureScore: ${count((e) => e.fullEqLive)}/${E.length}`);
ok('G1.5', count((e) => e.geoEqNegD) === E.length, `GEO == independent geometry-only -d(k,g): ${count((e) => e.geoEqNegD)}/${E.length}`);
ok('G1.6', count((e) => e.liveUnchanged) === E.length, `live traversal record unchanged during evaluation: ${count((e) => e.liveUnchanged)}/${E.length}`);
ok('G1.7', count((e) => e.snapUnchanged) === E.length, `snapshot unchanged: ${count((e) => e.snapUnchanged)}/${E.length}`);
ok('G1.8', count((e) => e.goalCount === 1) === E.length, 'FULL and GEO evaluated against one goal and one snapshot per event');
const imagined = E.reduce((a, e) => a + e.imaginedCalls, 0);
ok('G1.9', imagined > 0 && !JSON.stringify(E).includes('"imaginedCandidates"'), `imagined-step calls excluded from every event record: ${imagined}`);
ok('G1.X', count((e) => e.executedInK) === E.length && count((e) => e.executedAugmented) === 0,
  `executed action in K(e) ${count((e) => e.executedInK)}/${E.length}; augmented (non-FS) executed ${count((e) => e.executedAugmented)} [monitored, replay-specific]`);

// ---- G2 ------------------------------------------------------------------------------------------------
section('G2  G-IMPL-2 non-interference');
const NI = json('experiments/study2/readiness_evidence/NONINTERFERENCE.json');
ok('G2.1', NI.differing.length === 0 && NI.fields.length === 11, `capture ON vs OFF identical on all ${NI.fields.length} fingerprint fields`);
ok('G2.2', ['writesHash', 'cogDraws', 'visDraws', 'qSum', 'envCounters', 'attempts', 'successes', 'slips', 'finalRecordHash'].every((f) => NI.fields.includes(f)),
  'fingerprint covers action hash, RNG draws, Q, environment counters, attempts/successes/slips, final record');

// ---- G3 ------------------------------------------------------------------------------------------------
section('G3  G-IMPL-3 exact step index');
const T = CAP.tickLog;
ok('G3.1', JSON.stringify(T[0]) === '[0,-1]' && T.slice(1).every(([t, s]) => s === t + 4) && T.length - 1 === CAP.loopsExecuted,
  'pre-boot setTick(0) at run.js:123, then every loop setTick(t) after runAgent index t+4');
ok('G3.2', E.every((e) => (e.t < 5 ? e.lastTick === 0 : e.lastTick === 5 * Math.floor((e.t - 5) / 5))), 'every event consistent with tau = runAgentStep - 5');
ok('G3.3', E.every((e) => ((e.lastTick >= 1500) === (e.t - 5 >= 1500))), 'phase II <=> tau >= 1500 on every event');
ok('G3.4', CAP.maxEventsPerStep === 1 && E.every((x, i) => i === 0 || x.t > E[i - 1].t), 'each event maps to exactly one runAgent decision invocation');
const prim = E.filter((e) => e.t - 5 <= 1500);
ok('G3.5', prim.length > 0 && prim.filter((e) => e.t - 5 === 1500).length <= 1,
  `primary window tau <= 1500: ${prim.length} events; boundary event at tau = 1500 recorded (${prim.filter((e) => e.t - 5 === 1500).length})`);
ok('G3.6', CAP.runAgentCalls - E.length > 0, `stale/replay steps without a decision excluded: ${CAP.runAgentCalls - E.length}`);

// ---- G4: source-level leakage gate ---------------------------------------------------------------
section('G4  G-IMPL-4 oracle / metadata leakage (source-level)');
const pCode = codeOf(planning);
const imports = [...planning.matchAll(/^import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/gm)].map((m) => m[2]).sort();
ok('G4.1', JSON.stringify(imports) === JSON.stringify(['./embeddings.js', './search.js', './traversalRecord.js']) && !ORACLE.test(pCode) && !/\benv\b\s*\.|experiments\/m7/.test(pCode),
  'production FutureScore imports no oracle module and names no p / expectedCostToGoal / oracle symbol');
const rCode = codeOf(read('experiments/study2/snapshot_reader.mjs'));
ok('G4.2', !/^\s*import\s/m.test(rCode) && !ORACLE.test(rCode), 'the snapshot reader imports nothing and names no oracle symbol');
const injected = [...REPORT_INJECTIONS.map(([, r]) => r), PLANNING_TAIL, SETTICK_TAIL, mainSource('function runAgent() {\n    runPrediction(agentCurrent);\n  for (let step = 0; step < STEPS; step++) {\n  const targetNeuronForFuture = findNeuronById(k);\nconst sorted = choices.sort((a, b) => b.weight - a.weight);\nchoices.sort((a, b) => b.prob - a.prob);\n')].join('\n');
ok('G4.3', !ORACLE.test(codeOf(injected)), 'no injected capture code references the oracle');
const cCode = codeOf(read('experiments/study2/child.mjs'));
ok('G4.4', !ORACLE.test(cCode) && !/cfg\s*\.\s*p|\.pPhase/.test(cCode) && !/taub\.mjs|validation\//.test(cCode),
  'the runtime capture never touches p, the oracle, or the analysis/validation code');
const cRaw = read('experiments/study2/child.mjs');
ok('G4.5', cRaw.indexOf('fs.writeFileSync') > cRaw.indexOf('await runOnce(') && (cRaw.match(/readFileSync/g) || []).length === 1,
  'analysis metadata cannot reach scoring: output is written only after the run; the only file read is connections.json at start');
const M = read('main.js').split('\n');
const at = (t) => M.findIndex((l) => l.includes(t)) + 1;
const ord = ['runPrediction(agentCurrent);', '_m7env.attempt(_m7From, _m7To)', 'recordTraversalOutcome(_m7From, _m7To, _m7Traversed);'].map(at);
ok('G4.6', ord.every((n) => n > 0) && ord[0] < ord[1] && ord[1] < ord[2] && count((e) => e.liveUnchanged) === E.length,
  `no post-decision outcome enters scoring: score ${ord[0]} < draw ${ord[1]} < write ${ord[2]}, and the record never changed during scoring`);
const dCode = codeOf(read('experiments/study2/drive_readiness.mjs'));
ok('G4.7', !ORACLE.test(dCode) && /const RUNS = Object\.freeze\(\['', ''\]\)/.test(dCode) && /const SEED = 896066, INDEX = 0;/.test(cRaw),
  'readiness seed selection is literal (development fixture only) and oracle-free; the run list is a frozen literal');
ok('G4.8', /OPEN IMPLEMENTATION GATE G-IMPL-4/.test(DOC),
  'Study-2 scientific seed-selection and stopping code do not exist yet: they remain OPEN until the seed block is authorized');

// ---- G5 / TB / BS --------------------------------------------------------------------------------
section('G5  oracle definition cross-check; tau-b; bootstrap');
ok('G5.1', V.OR.cases === 32 && V.OR.maxAbsDiffVsBellmanFord === 0 && V.OR.maxAbsDiffVsNetworkX === 0 && V.OR.goalCostZero && V.OR.candidateOnwardBellmanConsistent,
  `U*(k) = -expectedCostToGoal: ${V.OR.cases} cases / ${V.OR.nodeValues} values, zero difference vs Bellman-Ford and NetworkX ${V.reference.networkx}`);
ok('TB.1', V.TB.length === 16 && V.TB.every((x) => x.agree), `tau-b vs SciPy ${V.reference.scipy} kendalltau(variant='b'): ${V.TB.filter((x) => x.agree).length}/${V.TB.length}`);
ok('TB.2', V.TC.length === 11 && V.TC.every((x) => x.pass), `§P conventions exactly as written: ${V.TC.filter((x) => x.pass).length}/${V.TC.length}`);
ok('BS.1', V.BS.every((x) => x.agree) && V.S1regression.reproduces, `exact bootstrap == brute force ${V.BS.filter((x) => x.agree).length}/${V.BS.length}; Study-1 interval reproduced [${V.S1regression.lowerPP}, ${V.S1regression.upperPP}]pp`);

// ---- LIN -------------------------------------------------------------------------------------------
section('LIN lineage');
const PINS = {
  'research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN.md': '2eee343ed77afc9da4b25fc096bc9844e406191ad279f26c8a425333a3c65b40',
  'research/preregistrations/FUTURESCORE_V2_3_STUDY2_FEASIBILITY_F1_F2.md': 'b9458dd863f53c2d2ae75e2fc6961b1c3518446f0a6b93702f750f44a09a619a',
  'experiments/fsfeas/FEASIBILITY_RESULTS.md': '1180e243e248e04345c7b4d143cd78fbe39be38013e218bd443ff50affd52125',
  'experiments/fsfeas/evidence/INTEGRITY.sha256': 'fd5fdba61c8578d5d143fd9d22016156c7093b1127fa320bcd130009a047ce72',
};
for (const [f, h] of Object.entries(PINS)) ok('LIN.' + (Object.keys(PINS).indexOf(f) + 1), shaLF(read(f)) === h && DOC.includes(h), `${f} unmodified (pinned ${h.slice(0, 12)}…)`);
const integ = (dir) => read(dir + '/INTEGRITY.sha256').trim().split('\n').every((l) => { const [h, f] = l.split(/\s+/); return shaBytes(`${dir}/${f}`) === h; });
ok('LIN.5', integ('experiments/fsfeas/evidence'), 'FS-OQ1-F2-FEAS evidence files match their integrity record');
ok('LIN.6', shaBytes('experiments/fsfeas/f1f2_static_calculation.mjs') === '0ceb45791434bd69d4302eaf2a1f6cc70b0916f5563d78eabc63760e05b46483',
  'F-1/F-2 static calculation script imported verbatim (sha 0ceb4579…)');
ok('LIN.7', integ('experiments/study2/readiness_evidence') && integ('experiments/study2/validation'), 'readiness and validation evidence match their integrity records');

// ---- SCOPE -----------------------------------------------------------------------------------------
section('SCOPE');
ok('S.1', git('diff', '--name-only', BASE, '--', 'main.js', 'render', 'index.html', 'instrumentation', 'neurons.json', 'connections.json').trim() === '', 'production tree unchanged since the design freeze');
ok('S.2', git('diff', '--name-only', BASE, '--', 'experiments/m7', 'experiments/m39', 'experiments/m40', 'experiments/d2', 'experiments/boundary', 'experiments/phase1_0', 'experiments/fsbehav', 'experiments/futurescore').trim() === '',
  'historical experiments and the Study-1 record unchanged');
ok('S.3', !fs.existsSync(path.join(ROOT, 'package.json')), 'no dependency manifest; SciPy/NetworkX are validation references only');
ok('S.4', [...CAP.seedsTouched, ...V.seedsTouched].every((s) => [896066, 896238, 896329].includes(s)), 'no scientific seed: only development fixtures were evaluated');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

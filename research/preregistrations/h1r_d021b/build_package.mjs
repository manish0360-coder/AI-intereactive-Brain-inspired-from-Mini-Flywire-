// ==========================================================
// H1-R D-021(b) — assemble GEMINI_PACKAGE.md and PACKAGE_MANIFEST.json
// ==========================================================
// GEMINI_PACKAGE.md = GEMINI_INSTRUCTIONS.md + verbatim appendices taken from git blobs (never from the working tree).
// SOURCE COMMIT: every frozen text is read at the pinned source commit SOURCE = 30e7693 (never at HEAD), so the package
// rebuilds byte for byte after it is itself committed. The source commit is the state the package is built FROM; the
// eventual package commit (the commit that adds this directory) is a different commit, recorded outside the package
// and outside PACKAGE_MANIFEST.json (a file cannot contain the commit that contains it).
//   A  research/preregistrations/H1R_PREREGISTRATION_v1.0.md, whole file (SHA-256 must be c52e7337…a836)
//   B  research/cognitive-audit/M7_PREREGISTRATION.md §7–§9, §11–§12, §15–§16 (SHA-256 must be 2f12e309…f6b9)
//   C  research/09_decisions.md entries D-021 and D-020
//   D  B2 (707cb1e) agent facts: instrumentation/rng.js; render/executiveController.js (sigmoid … arbitrate);
//      main.js (E3 delivery, candidate blend and push, sort and bestChoice, step-0 write); render/scoring.js (trust
//      term, confidence score, clamp-return); connections.json
//   E  MS-1 (30e7693) instrument facts: experiments/h1r/measure.mjs; the probe lines of conformance_transform.mjs;
//      the record assembly of run_h1r.mjs; a field table
//   F  fixture schemas and excerpts (fixtures/ must match fixtures/FIXTURES.sha256.json)
// Every "> [source] text" line of the instructions must occur verbatim in that source, or the build refuses.
// No analysis implementation of either implementer is included.
//
//   node research/preregistrations/h1r_d021b/build_package.mjs
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { maxBuffer: 1 << 28 });
const show = (rev, p) => git('show', `${rev}:${p}`).toString('utf8');
const blobId = (rev, p) => git('rev-parse', `${rev}:${p}`).toString('utf8').trim();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const refuse = (m) => { throw new Error('build_package: ' + m); };
const B2 = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e', MS1 = '30e7693236309bbfb82b8117b74240fc8ab5d43a';
const SOURCE = '30e7693236309bbfb82b8117b74240fc8ab5d43a';   // pinned source commit (see header)

// ---------------- sources ----------------
const V1 = show(SOURCE, 'research/preregistrations/H1R_PREREGISTRATION_v1.0.md');
if (sha(V1) !== 'c52e73378ad7759fe4e2829e972d1a97b5297da49b327b3c700c654a218ca836') refuse('v1.0 hash');
const M7 = show(SOURCE, 'research/cognitive-audit/M7_PREREGISTRATION.md');
if (sha(M7) !== '2f12e309d7409e95f3d1bca34135110e518865fd01d96e5eeaee347b6e33f6b9') refuse('M7 hash');
const DEC = show(SOURCE, 'research/09_decisions.md');
const between = (text, from, to, what) => { const a = text.indexOf(from); if (a < 0) refuse(`${what}: start`); const b = to ? text.indexOf(to, a + from.length) : text.length; if (b < 0) refuse(`${what}: end`); return text.slice(a, b); };
const M7parts = [between(M7, '## 7. Analysis windows', '## 10. Confound controls', 'M7 §7–§9'),
  between(M7, '## 11. Statistical analysis', '## 13. The trust rectification', 'M7 §11–§12'),
  between(M7, '## 15. Falsification criteria', '## 17. Claim ceiling', 'M7 §15–§16')];
const D021 = between(DEC, '## D-021 —', '## D-020 —', 'D-021'), D020 = between(DEC, '## D-020 —', '## D-019 —', 'D-020');

// B2 agent facts, excerpted by unique anchors
function excerpt(text, startLine, endPred, what, { includeEnd = true } = {}) {
  const L = text.split('\n'), s = L.findIndex(l => l === startLine);
  if (s < 0 || L.filter(l => l === startLine).length !== 1) refuse(`${what}: anchor`);
  let e = s; while (e < L.length && !endPred(L[e], e - s)) e++;
  if (e >= L.length) refuse(`${what}: end`);
  return { from: s + 1, to: includeEnd ? e + 1 : e, text: L.slice(s, includeEnd ? e + 1 : e).join('\n') };
}
const RNG = show(B2, 'instrumentation/rng.js');
const EC = show(B2, 'render/executiveController.js');
// arbitrate ends at the first line "}" after "export function arbitrate({"
const ECL = EC.split('\n'), ecStart = ECL.findIndex(l => l === '// SIGMOID NORMALIZATION'), arbStart = ECL.findIndex(l => l === 'export function arbitrate({');
let arbEnd = arbStart; while (ECL[arbEnd] !== '}') arbEnd++;
const ecText = { from: ecStart + 1 - 1, to: arbEnd + 1, text: ECL.slice(ecStart - 1, arbEnd + 1).join('\n') };
const MAIN = show(B2, 'main.js'), ML = MAIN.split('\n');
const lineOf = (L, t, what) => { const i = L.findIndex(l => l === t); if (i < 0 || L.filter(l => l === t).length !== 1) refuse(`${what}: anchor "${t}"`); return i; };
const span = (L, a, b) => ({ from: a + 1, to: b + 1, text: L.slice(a, b + 1).join('\n') });
const fwA = lineOf(ML, '  const finalWeight =', 'main finalWeight'), fwB = lineOf(ML, '  calculateDecisionScore({', 'main score call');
const e3 = lineOf(ML, '      bayesianTrust: (globalThis.__M7_ARMS__', 'main E3');
const blendA = lineOf(ML, '  const candidateArb = lastArbitrationBreakdown;', 'main blend');
const pushI = ML.findIndex((l, i) => i > blendA && l === '  choices.push({');
const sortI = lineOf(ML, 'const sorted = choices.sort((a, b) => b.weight - a.weight);', 'main sort');
const bestI = lineOf(ML, 'const bestChoice = sorted[0];', 'main best');
const wI = lineOf(ML, '  window.lastReasoning = {', 'main write');
const mainEx = [span(ML, fwA, fwB), span(ML, e3, e3 + 3), span(ML, blendA, pushI + 3), span(ML, sortI, bestI), span(ML, wI - 1, wI + 4)];
const SC = show(B2, 'render/scoring.js'), SL = SC.split('\n');
const tb = lineOf(SL, '    const trustBonus =', 'scoring trustBonus'), tt = lineOf(SL, "        ['trustBonus',              trustBonus * 1.5],", 'scoring term');
const fw = lineOf(SL, '    let finalWeight = 0;', 'scoring sum'), cs = lineOf(SL, '        confidenceScore:', 'scoring conf'), ret = lineOf(SL, '    return Math.max(-400, Math.min(400, finalWeight));', 'scoring return');
const scEx = [span(SL, tb, tb + 1), span(SL, tt, tt), span(SL, fw, fw + 1), span(SL, cs, cs + 4), span(SL, ret, ret)];
const CONN = show(B2, 'connections.json');

// MS-1 instrument facts
const MEAS = show(MS1, 'experiments/h1r/measure.mjs');
const TR = show(MS1, 'experiments/h1r/conformance_transform.mjs');
const probeLines = [...TR.matchAll(/[`'](\s*if \(globalThis\.__H1R_MEASURE__\)[^`']*\/\/ H1R M-[A-Z]+[^`']*)[`']/g)].map(m => m[1].trim());
if (probeLines.length !== 8) refuse(`expected 8 probe statements, found ${probeLines.length}`);
const RUN = show(MS1, 'experiments/h1r/run_h1r.mjs'), RL = RUN.split('\n');
const tk1 = RL.findIndex(l => l.startsWith('// per-tick records (v1.0 §9 item 1)')), tk2 = RL.findIndex(l => l.startsWith('const ticks = nDec.map('));
const mo1 = RL.findIndex(l => l.startsWith('  measurement: IN.digestOnly')), mo2 = RL.findIndex((l, i) => i > mo1 && l.startsWith('        step0: ')) - 1;
if ([tk1, tk2, mo1, mo2].some(i => i < 0)) refuse('run_h1r anchors');
const runEx = [span(RL, tk1, tk2), span(RL, mo1, mo2)];

// fixtures
const FX = path.join(HERE, 'fixtures');
const fxMan = JSON.parse(fs.readFileSync(path.join(FX, 'FIXTURES.sha256.json'), 'utf8'));
for (const [f, h] of Object.entries(fxMan)) if (sha(fs.readFileSync(path.join(FX, f), 'utf8')) !== h) refuse(`fixture ${f} does not match FIXTURES.sha256.json`);
const S01 = JSON.parse(fs.readFileSync(path.join(FX, 'S01.json'), 'utf8')), M01 = JSON.parse(fs.readFileSync(path.join(FX, 'M01.json'), 'utf8'));

// ---------------- verify verbatim quotes in the instructions ----------------
const INS = fs.readFileSync(path.join(HERE, 'GEMINI_INSTRUCTIONS.md'), 'utf8');
const SRC = { 'v1.0': V1, 'M7': M7, 'D-020': D020, 'D-021': D021 };
const quotes = INS.split('\n').map((l, i) => [i + 1, l.match(/^> \[(v1\.0|M7|D-020|D-021)[^\]]*\] (.*)$/)]).filter(([, m]) => m);
const bad = quotes.filter(([, m]) => !SRC[m[1]].includes(m[2]));
if (bad.length) refuse('quotes not verbatim:\n' + bad.map(([n, m]) => `  line ${n} [${m[1]}] ${m[2].slice(0, 90)}`).join('\n'));

// ---------------- assemble ----------------
// four backticks: the embedded documents contain their own ``` fences
const fence = (lang, t) => '````' + lang + '\n' + t + (t.endsWith('\n') ? '' : '\n') + '````';
const blocks = [];
const add = (id, title, body) => blocks.push({ id, title, body });
add('A', 'Appendix A — H1-R pre-registration v1.0 (whole file, verbatim)',
  `Source: \`research/preregistrations/H1R_PREREGISTRATION_v1.0.md\` at source commit \`${SOURCE}\` (blob \`${blobId(SOURCE, 'research/preregistrations/H1R_PREREGISTRATION_v1.0.md')}\`), SHA-256 \`${sha(V1)}\`. Relative links inside it refer to repository files that are not part of this package and are not needed.\n\n` + fence('markdown', V1));
add('B', 'Appendix B — M7 pre-registration v1.0, inherited clauses (§7–§9, §11–§12, §15–§16, verbatim)',
  `Source: \`research/cognitive-audit/M7_PREREGISTRATION.md\` (blob \`${blobId(SOURCE, 'research/cognitive-audit/M7_PREREGISTRATION.md')}\`), SHA-256 \`${sha(M7)}\`. H1-R v1.0 inherits every M7 clause it does not explicitly supersede (v1.0 header; supersessions in v1.0 Appendix A).\n\n` + M7parts.map(p => fence('markdown', p)).join('\n\n'));
add('C', 'Appendix C — decision-log entries D-021 and D-020 (verbatim)',
  `Source: \`research/09_decisions.md\` at source commit \`${SOURCE}\` (blob \`${blobId(SOURCE, 'research/09_decisions.md')}\`). D-020's line numbers refer to the instrument at R3; the pins bind to the quoted code.\n\n` + fence('markdown', D021) + '\n\n' + fence('markdown', D020));
add('D', 'Appendix D — frozen agent facts the analysis depends on (B2 = 707cb1e, verbatim)',
  [`**D.1 \`instrumentation/rng.js\`** (blob \`${blobId(B2, 'instrumentation/rng.js')}\`): \`makeRng\` is the mulberry32 generator named by v1.0 §12/§13 and D-020.\n\n` + fence('js', RNG),
   `**D.2 \`render/executiveController.js\`, lines ${ecText.from}–${ecText.to}** (blob \`${blobId(B2, 'render/executiveController.js')}\`): the pure arbitration function \`arbitrate\` and its helpers. The module has no imports and no other top-level state.\n\n` + fence('js', ecText.text),
   `**D.3 \`main.js\` excerpts** (blob \`${blobId(B2, 'main.js')}\`; line numbers in the B2 file):\n\n` + mainEx.map(x => `Lines ${x.from}–${x.to}:\n\n` + fence('js', x.text)).join('\n\n'),
   `**D.4 \`render/scoring.js\` excerpts** (blob \`${blobId(B2, 'render/scoring.js')}\`, SHA-256 \`${sha(SC)}\`; \`finalWeight\` is the sum of the TERMS array, one of whose entries is the trust term):\n\n` + scEx.map(x => `Lines ${x.from}–${x.to}:\n\n` + fence('js', x.text)).join('\n\n'),
   `**D.5 \`connections.json\`** (blob \`${blobId(B2, 'connections.json')}\`): the 39 undirected edges of the 20-node graph.\n\n` + fence('json', CONN)].join('\n\n'));
add('E', 'Appendix E — the run-record format (accepted measurement instrument MS-1, commit 30e7693)',
  [`**E.1 \`experiments/h1r/measure.mjs\`** (blob \`${blobId(MS1, 'experiments/h1r/measure.mjs')}\`), the measurement sink, whole file:\n\n` + fence('js', MEAS),
   `**E.2 The probe lines inserted into the agent** (from \`experiments/h1r/conformance_transform.mjs\`, blob \`${blobId(MS1, 'experiments/h1r/conformance_transform.mjs')}\`). Each is one statement placed as named: M-STEP at the start of every \`runAgent()\` call; M-REWARD before the first use of the call's final \`rewardSignal\`; M-SCORE immediately before \`calculateDecisionScore\`'s clamp-return; M-CANDIDATE after each candidate-loop \`choices.push\`; M-BEST after \`const bestChoice = sorted[0];\`; M-DECISION inside the step-0 selection write; M-REPLAY in the replay (else) branch; M-FLOOR where \`updateBehavior\`'s aggregate floor raises \`confidenceState\`.\n\n` + fence('js', probeLines.join('\n')),
   `**E.3 How \`run_h1r.mjs\` writes the record** (blob \`${blobId(MS1, 'experiments/h1r/run_h1r.mjs')}\`; lines ${runEx[0].from}–${runEx[0].to} and ${runEx[1].from}–${runEx[1].to}):\n\n` + runEx.map(x => fence('js', x.text)).join('\n\n'),
   `**E.4 Field table (facts about the instrument).**

| Field | Content |
|---|---|
| \`calls\` | number of \`runAgent()\` calls (3,005 in a full run) |
| \`events\` | \`[callIndex, rewardSignal]\`, one per call that computed a \`rewardSignal\` (realised moves and goal entries) |
| \`ticks\` | string of length \`calls\`; character i is \`D\` if M-DECISION fired in call i, \`R\` if M-REPLAY fired, \`N\` if neither (\`X\` would mean both; it never occurs in a valid record) |
| \`attempts\` | \`[callIndex, from, to, ok, goalEntering, a, s]\`, one per environment draw: the attempted directed edge, the outcome (1 = traversed), whether \`to\` is the goal, and the trust store's raw attempts \`a\` and successes \`s\` of key \`from->to\` immediately before the attempt |
| \`resets\` | \`[callIndex, 'goal' \\| 'cap']\`, every episode reset |
| \`snapshots\` | \`[label, callsCompleted, entries]\`: \`'tau1499'\` taken at the \`runAgentLoop\` entry with 1,505 completed calls; \`'tau2999'\` after the run (3,005). Each entry is \`[key, a, s, raw]\`: the store's attempts and successes of the directed key, and the number of attempts of that key whose τ lies in the snapshot's phase (\`[0, 1499]\` resp. \`[1500, 2999]\`). Keys are the union of the store's keys and the keys attempted in the phase; entries are sorted by (from, to) numerically |
| \`floorCalls\` | call index of every M-FLOOR record |
| \`decisions\` | \`[callIndex, executedKey]\` per step-0 selection write |
| \`step0\` | one entry per step-0 weight sort: \`[callIndex, bestChoiceKey, candidates]\`, candidates in candidate-loop insertion order, each \`[key, F, t, returned, w, applied, arb, unc, ew, selfLoop]\`: F = pre-clamp \`finalWeight\` and t = \`trustBonus * 1.5\` (the M-SCORE pair of that candidate's scoring call); returned = the value \`calculateDecisionScore\` returned; w = the candidate's weight pushed to \`choices\`; applied = 1 iff \`candidateArb && executiveWeights\`; arb = \`[rewardScore, semanticScore, confidenceScore, curiosityScore, costScore]\` of \`lastArbitrationBreakdown\`; unc = \`uncertaintyScoreValue\`; ew = \`[wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost]\`; selfLoop = 1 iff \`k === currentKey\` |
| \`forks\` | \`[call, arm]\` when an armed fork switch was applied (fork runs only); fork mode switches an A1 run's E3 and E4 deliveries to A2's immediately before call \`call\` |

\`step0\` is assembled by the driver from the sink's records: score pair k (M-SCORE) belongs to candidate record k (M-CANDIDATE), because \`calculateDecisionScore\` has a single caller, inside the candidate loop, and nothing between that call and the push returns; the step-0 candidates of a sort are the candidate records between two M-BEST records. The assembling function is not part of this package; this table is the specification of the format. In the synthetic fixture M01 the values are synthetic but have this format.`].join('\n\n'));
const ex = (o) => JSON.stringify(o);
add('F', 'Appendix F — fixture schemas and excerpts',
  `**F.1 Study fixtures \`S01\`–\`S17\` (schema \`h1r.d021b.study/1\`).**
- \`pilot.configs\`: 10 entries \`{index, goal, block}\`, block \`'stage1'\` (indices 0–4) or \`'extension'\` (5–9); \`pilot.seeds\`: the five pilot agent seeds; \`pilot.extensionAvailable\`: false iff the extension's configurations do not exist within the hard bound 889999.
- \`pilot.cells\` and \`heldout.cells\`: one row per (configuration, seed, arm) with the columns of \`cellColumns\`: \`[configIndex, seed, armIndex (0 = A1 … 6 = A7), valid (0/1: 0 = some validity flag of that run was false), R_W1, R_W2, R_W3, R_W4, R_all, halfLife, halfLifeCensored (0/1), fingerprint, floorRaises]\`.
- \`heldout\`: 30 configurations × 20 seeds (ascending) × 7 arms; \`a1Links\` one row per (configuration, seed): \`[configIndex, seed, rho1499|null, rho2999|null, decisionTicks, replayTicks, flips, flipsByWindow[4], decisionTicksByWindow[4], replayTicksByWindow[4]]\` (counts over τ ∈ [0, 2999]); \`flipPopulations\`: \`[configIndex, seed, [[t, difference|null], …]]\`, the A1 run's flipped decision ticks t ≤ 2980 in ascending t, with difference = [Σ r over τ ∈ [t, t+20) in A1] − [the same in the fork switched at call t + 5], or \`null\` when that fork crashed and its re-run crashed; \`monotonicity\`: \`[configIndex, seed, decisionsPerBin[5], flipsPerBin[5]]\`.

Excerpts of S01: pilot cells 0–2 ${ex(S01.pilot.cells.slice(0, 3))}; held-out cells 0–1 ${ex(S01.heldout.cells.slice(0, 2))}; a1Links 0 ${ex(S01.heldout.a1Links[0])}; flipPopulations 0 (first 3) ${ex([S01.heldout.flipPopulations[0][0], S01.heldout.flipPopulations[0][1], S01.heldout.flipPopulations[0][2].slice(0, 3)])}; monotonicity 0 ${ex(S01.heldout.monotonicity[0])}.

**F.2 Record fixture \`M01\` (schema \`h1r.d021b.records/1\`).** \`graph\` {nodes, edges}; \`configurations\`: \`{index, goal, edges: [{from, to, pPhaseI, pPhaseII}]}\` (p_e per undirected edge, symmetric); \`runs\`: \`{runId, arm, configIndex, seed, measurement}\` with the Appendix E record fields; \`forkRuns\`: \`{forkId, baseRunId, fork: {call, to}, measurement: {calls, events, forks}}\`.

Excerpts of run m1: events 0–2 ${ex(M01.runs[0].measurement.events.slice(0, 3))}; attempts 0–1 ${ex(M01.runs[0].measurement.attempts.slice(0, 2))}; step0 group 0 ${ex(M01.runs[0].measurement.step0[0])}; snapshot labels ${ex(M01.runs[0].measurement.snapshots.map(s => [s[0], s[1], s[2].length]))}; configuration 0 edge 0 ${ex(M01.configurations[0].edges[0])}; fork runs ${ex(M01.forkRuns.map(f => [f.forkId, f.fork]))}.

**F.3 Files.** ${Object.entries(fxMan).map(([f, h]) => `\`${f}\` SHA-256 \`${h}\``).join('; ')}.`);

const body = INS.trimEnd() + '\n\n---\n\n' + blocks.map(b => `## ${b.title}\n\n${b.body}\n`).join('\n---\n\n');
fs.writeFileSync(path.join(HERE, 'GEMINI_PACKAGE.md'), body);
const manifest = {
  schema: 'h1r.d021b.manifest/2',
  sourceCommit: SOURCE,
  packageCommit: 'not recorded here: the commit that adds this directory is recorded outside this file',
  b2: B2, ms1: MS1,
  package: { file: 'GEMINI_PACKAGE.md', sha256: sha(body), bytes: Buffer.byteLength(body) },
  instructions: { file: 'GEMINI_INSTRUCTIONS.md', sha256: sha(INS), verbatimQuotesChecked: quotes.length },
  sources: {
    'H1R_PREREGISTRATION_v1.0.md': { blob: blobId(SOURCE, 'research/preregistrations/H1R_PREREGISTRATION_v1.0.md'), sha256: sha(V1) },
    'M7_PREREGISTRATION.md': { blob: blobId(SOURCE, 'research/cognitive-audit/M7_PREREGISTRATION.md'), sha256: sha(M7), sectionsSha256: M7parts.map(sha) },
    '09_decisions.md': { blob: blobId(SOURCE, 'research/09_decisions.md'), D021sha256: sha(D021), D020sha256: sha(D020) },
    'B2 instrumentation/rng.js': { blob: blobId(B2, 'instrumentation/rng.js'), sha256: sha(RNG) },
    'B2 render/executiveController.js': { blob: blobId(B2, 'render/executiveController.js'), excerptLines: [ecText.from, ecText.to], excerptSha256: sha(ecText.text) },
    'B2 main.js': { blob: blobId(B2, 'main.js'), excerpts: mainEx.map(x => [x.from, x.to, sha(x.text)]) },
    'B2 render/scoring.js': { blob: blobId(B2, 'render/scoring.js'), sha256: sha(SC), excerpts: scEx.map(x => [x.from, x.to, sha(x.text)]) },
    'B2 connections.json': { blob: blobId(B2, 'connections.json'), sha256: sha(CONN) },
    'MS-1 measure.mjs': { blob: blobId(MS1, 'experiments/h1r/measure.mjs'), sha256: sha(MEAS) },
    'MS-1 conformance_transform.mjs': { blob: blobId(MS1, 'experiments/h1r/conformance_transform.mjs'), probeLinesSha256: sha(probeLines.join('\n')) },
    'MS-1 run_h1r.mjs': { blob: blobId(MS1, 'experiments/h1r/run_h1r.mjs'), excerpts: runEx.map(x => [x.from, x.to, sha(x.text)]) },
  },
  appendices: Object.fromEntries(blocks.map(b => [b.id, sha(b.body)])),
  fixtures: fxMan,
  tools: Object.fromEntries(['make_fixtures.mjs', 'compare_outputs.mjs', 'build_package.mjs'].map(f => [f, sha(fs.readFileSync(path.join(HERE, f)))])),
  analysisImplementationsIncluded: 'none',
  handoff: ['GEMINI_PACKAGE.md', ...Object.keys(fxMan).filter(f => f !== 'FIXTURES.sha256.json').map(f => 'fixtures/' + f)],
  // permitted, non-deterministic environment metadata of this build (the only part of the manifest that may differ on rebuild)
  environmentMetadata: { generatedAt: new Date().toISOString(), node: process.version, platform: `${os.platform()} ${os.release()}`, arch: os.arch() },
};
fs.writeFileSync(path.join(HERE, 'PACKAGE_MANIFEST.json'), JSON.stringify(manifest, null, 1));
console.log(`GEMINI_PACKAGE.md ${manifest.package.bytes} bytes, SHA-256 ${manifest.package.sha256}; verbatim quotes checked ${quotes.length}; fixtures ${Object.keys(fxMan).length}`);

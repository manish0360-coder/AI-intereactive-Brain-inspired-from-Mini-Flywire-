// ==========================================================
// STUDY-2 FINAL PRE-EXECUTION GATE — D1..D20 (M-STUDY2-DRIVER)
// ==========================================================
// Verifies the Study-2 driver WITHOUT executing it: governance is exercised on a mock configuration generator
// over a synthetic block, the source is scanned, and the run child is judged on the committed development-fixture
// shakedown (896066:0), which is compared against the readiness evidence gated at cfadedd9.
// This gate imports no configuration generator, requests no seed, runs no agent, and computes no oracle value.
//
// Scanner rules carried from B4.1 / FS-LN-01 / L5c: comments and strings stripped with line numbers kept; imports
// captured one statement at a time; scanners self-tested; scope checks never count this milestone's own files as
// violations; hashes over committed blobs or LF-normalised content; no data-derived thresholds.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const READINESS = 'cfadedd9a4726142486744f9c11dc735a03fedc0';
const DESIGN_BASE = 'd1949f91601683ef2e955f8b766c2e656ffc8047';
const LINEAGE_CLOSURE = '5c785de1953adb48740a1254fe2a1b4a5b55c089';
const PROD_BASE = 'a066d47696b1502720f627855c8549f4d2898cd5';
const DOC_REL = 'research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md';
const PROPOSAL_REL = 'research/preregistrations/FUTURESCORE_V2_3_STUDY2_REGISTRATION_PROPOSAL.md';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const shaLF = (t) => crypto.createHash('sha256').update(String(t).replace(/\r\n/g, '\n')).digest('hex');
const json = (f) => JSON.parse(read(f));
const S2 = (f) => pathToFileURL(path.join(HERE, f)).href;

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(6)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
const throwsCode = (fn, code) => { try { fn(); return false; } catch (e) { return code === undefined || e.code === code; } };
const codeOf = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/([;{}),])[ \t]*\/\/.*$/gm, '$1')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, (m) => '``' + m.replace(/[^\n]/g, ''));
const ORACLE = /\bexpectedCostToGoal\b|\breliabilityOptimalPolicy\b|\btrueP\b|\bpPhase[12]\b|\bhopOptimalPolicy\b|\br5DecisionStateDiff\b|\bexhaustiveMinCost\b|\bcheckR5\b/;
// static imports, one statement at a time ([^;] stops at the statement end), plus dynamic import specifiers
const importsOf = (src) => [...src.matchAll(/^import\s[^;]*?from\s*['"]([^'"]+)['"]/gm), ...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
const members = (code, obj) => [...new Set([...code.matchAll(new RegExp(`(?<![\\w.$])${obj}\\s*\\.\\s*([A-Za-z_$][\\w$]*)`, 'g'))].map((m) => m[1]))].sort();
const RAW_GOVERNANCE = ['experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/m8/protocol.js',
  'experiments/q1/protocol.js', 'experiments/uqa/protocol.js', 'experiments/uqb/protocol.js', 'experiments/c1/protocol.js'];

console.log('='.repeat(78)); console.log('  STUDY-2 FINAL PRE-EXECUTION GATE D1-D20 (driver NOT executed; no seed requested)'); console.log('='.repeat(78));

const G = await import(S2('governance.mjs'));
const MAN = await import(S2('manifest.mjs'));
const DRV = await import(S2('drive_study2.mjs'));
const AN = await import(S2('analyze_study2.mjs'));
const CAPM = await import(S2('capture.mjs'));
const T = await import(S2('taub.mjs'));
const HOOK = await import(S2('hook_capture.mjs'));
const typed = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);

const SRC = Object.fromEntries(['governance.mjs', 'drive_study2.mjs', 'run_child.mjs', 'capture.mjs', 'analyze_study2.mjs', 'manifest.mjs', 'shakedown.mjs', 'child.mjs']
  .map((f) => [f, read(`experiments/study2/${f}`)]));
const CODE = Object.fromEntries(Object.entries(SRC).map(([f, s]) => [f, codeOf(s)]));
const DOC = read(DOC_REL);
const SK = json('experiments/study2/shakedown_evidence/SHAKEDOWN.json');
const RC = json('experiments/study2/readiness_evidence/readiness_capture.json');
const NI = json('experiments/study2/readiness_evidence/NONINTERFERENCE.json');
const V = json('experiments/study2/validation/RESULTS.json');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

// ---- mock generator and fixture registration (synthetic block, no real seed) ------------------------
const MOCK_BLOCK = { lo: 100, hi: 199 };
const mockEnv = (acceptWhen) => {
  const calls = [];
  const makeConfig = (seed, idx) => { calls.push([seed, idx]); const acc = acceptWhen(seed, idx);
    return { accepted: acc, goal: G.DESIGN.goals[idx % 4], checks: { R1: true, R2: true, R3: true, R4: true, R5: acc, G11: true } }; };
  return { calls, makeConfig };
};
const fixtureReg = (over = {}) => ({ schema: 'study2-registration/1', authorization: 'VERIFIER FIXTURE — not an authorization',
  seedBlock: { ...MOCK_BLOCK }, runCount: 8, agentSeed: 20260819000, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on',
  tickUnit: 'step', ticks: 3000, primaryWindowMaxTau: 1500, trajectoryUse: { study: 'M7-substrate', category: 'registered' },
  productionBaselineCommit: PROD_BASE, driverManifestSha256: '0'.repeat(64), ...over });

// ---- SC: scanners prove themselves ---------------------------------------------------------------------
section('SC  scanner self-tests');
ok('SC1', !ORACLE.test(codeOf('// expectedCostToGoal(p)\nconst s = "pPhase1";\n')) && ORACLE.test(codeOf('const c = env.expectedCostToGoal(p, g);\n')),
  'oracle scan ignores comments/strings and detects a real reference');
ok('SC2', JSON.stringify(importsOf("import { a,\n b } from './x.mjs';\nimport fs from 'node:fs';\nconst y = await import('./z.mjs');\n")) === JSON.stringify(['./x.mjs', 'node:fs', './z.mjs'])
  && importsOf("import { a } from './x.mjs'; const s = 'from \"./evil.mjs\"';").length === 1,
  'import capture: one statement at a time, multi-line braces, dynamic imports; no cross-statement capture');
ok('SC3', JSON.stringify(members(codeOf('cfg.accepted; cfg . goal; process.env.X; xcfg.p; env.makeConfig(1)'), 'cfg')) === '["accepted","goal"]'
  && JSON.stringify(members('process.env.X; env.makeConfig(); environment.Y', 'env')) === '["makeConfig"]',
  'member-access scan: exact object name, not process.env / prefixed names');
ok('SC4', codeOf(SRC['drive_study2.mjs']).split('\n').length === SRC['drive_study2.mjs'].split('\n').length, 'comment stripping preserves line numbering');
const RC_RE = /(?<!reg\.)\brunCount\b(?!\s*:)/g;
ok('SC5', [...'x = { runCount: reg.runCount };'.matchAll(RC_RE)].length === 0 && [...'let runCount = 3; f(reg.runCount + runCount);'.matchAll(RC_RE)].length === 2,
  'run-count scan: accepts reg.runCount and a key literal, catches a locally computed run count');

// ---- Z: documentation / provenance reconciliation (Task 1) -------------------------------------------
section('Z   design-document status reconciliation');
const row = (id) => (DOC.match(new RegExp(`^\\| ${id} \\|[^\\n]*$`, 'm')) || [''])[0];
const zCur = (id) => (DOC.split('*Historical (design baseline `d1949f9`), retained for lineage:*')[0].match(new RegExp(`^\\| ${id} \\|[^\\n]*$`, 'm')) || [''])[0];
ok('Z.1', /\*\*PASS \/ frozen\*\*/.test(zCur('Z1')) && /\*\*OPEN — Director\*\*/.test(zCur('Z2')) && /\*\*OPEN — Director\*\*/.test(zCur('Z3'))
  && ['Z4', 'Z5', 'Z6', 'Z8'].every((z) => /\| \*\*PASS\*\* \|/.test(zCur(z))) && /\*\*PASS for all currently existing code\*\*/.test(zCur('Z7'))
  && /\*\*OPEN\*\* — until the Director registers the final driver/.test(zCur('Z9')) && /\*\*PASS \/ closed\*\*/.test(zCur('Z10')),
  '§Z current: Z1 frozen, Z4-Z6/Z8 PASS, Z7 PASS for existing code, Z10 closed; Z2/Z3 OPEN-Director, Z9 OPEN');
ok('Z.2', DOC.includes('`d1949f91601683ef2e955f8b766c2e656ffc8047`') && DOC.includes('`cfadedd9a4726142486744f9c11dc735a03fedc0`') && /Design baseline/.test(DOC) && /Readiness closure/.test(DOC),
  'provenance records design baseline d1949f9 and readiness closure cfadedd9');
const PINS = {
  'research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN.md': '2eee343ed77afc9da4b25fc096bc9844e406191ad279f26c8a425333a3c65b40',
  'research/preregistrations/FUTURESCORE_V2_3_STUDY2_FEASIBILITY_F1_F2.md': 'b9458dd863f53c2d2ae75e2fc6961b1c3518446f0a6b93702f750f44a09a619a',
  'experiments/fsfeas/FEASIBILITY_RESULTS.md': '1180e243e248e04345c7b4d143cd78fbe39be38013e218bd443ff50affd52125',
  'experiments/fsfeas/evidence/INTEGRITY.sha256': 'fd5fdba61c8578d5d143fd9d22016156c7093b1127fa320bcd130009a047ce72',
};
ok('Z.3', Object.entries(PINS).every(([f, h]) => git('ls-files', '--', f).trim() === f && shaLF(git('show', `HEAD:${f}`)) === h && DOC.includes(h)
  && git('log', '--diff-filter=A', '--format=%H', '--', f).trim() === LINEAGE_CLOSURE),
  '§B: the four lineage artifacts are version-controlled (added at 5c785de) and their committed content equals the pins');
ok('Z.4', /Current status — CLOSED \(PASS\)\.\*\* The four lineage artifacts below are \*\*now under version control\*\*/.test(DOC)
  && /\*Historical \(design baseline `d1949f9`\):\* \*\*Lineage artifacts not yet under version control\*\*/.test(DOC)
  && /\| Z10 \| untracked lineage artifacts frozen under version control \| \*\*OPEN QUESTION — governance\*\* \|/.test(DOC),
  'historical statements preserved and labelled; current status written beside them');
const removed = git('diff', '-U0', READINESS, '--', DOC_REL).split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
const STATUS_LINE = [/^\| Z\d+ \|/, /^\| # \| Gate \| Status \|$/, /^\|---\|---\|---\|$/, /OPEN IMPLEMENTATION GATE G-IMPL-4\*\* \|/, /^\*\*Lineage artifacts not yet under version control\*\*/,
  /^\*\*OPEN QUESTION \(governance\)\.\*\*/, /^\| code \| `a066d47/, /^12\. \*\*Lineage artifacts not yet under version control\*\* \(§B\)\.$/];
ok('Z.5', removed.length > 0 && removed.every((l) => STATUS_LINE.some((re) => re.test(l))),
  `only status/provenance lines were replaced since cfadedd9 (${removed.length} lines); no scientific text removed`);
const added = git('diff', '-U0', READINESS, '--', DOC_REL).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1)).join('\n');
ok('Z.6', !/Δ\(e\)\s*=|θ\s*=|τb\s*=|U\*\(k\)\s*=|R5\s*[≥>]|t ≤ 1500|H = 3|c_hat\s*=/.test(added),
  'no added line restates or alters an estimand, oracle, window, R5 rule or V2.3 definition');

// ---- D1 seed-range containment ------------------------------------------------------------------------
section('D1-D4 seed governance, run count, goal balance');
const regOk = G.validateRegistration(fixtureReg());
const m1 = mockEnv((s) => s % 7 === 3);
const plan1 = G.planAcceptanceWalk(m1.makeConfig, regOk);
const seeds1 = m1.calls.map(([s]) => s);
ok('D1.1', seeds1[0] === MOCK_BLOCK.lo && seeds1.every((s, i) => i === 0 || s === seeds1[i - 1] + 1) && seeds1.every((s) => s >= MOCK_BLOCK.lo && s <= MOCK_BLOCK.hi)
  && JSON.stringify(plan1.requested.map((r) => [r.seed, r.configIndex])) === JSON.stringify(m1.calls),
  `walk requests seeds strictly ascending from the block start, nothing skipped, all inside the block; every request recorded (${seeds1.length})`);
const m2 = mockEnv(() => false);
ok('D1.2', throwsCode(() => G.planAcceptanceWalk(m2.makeConfig, regOk), 'RANGE_EXHAUSTED') && Math.max(...m2.calls.map(([s]) => s)) === MOCK_BLOCK.hi,
  'an exhausted block stops with RANGE_EXHAUSTED before any seed above hi is requested; the block is never extended');
ok('D1.3', throwsCode(() => G.assertSeedAllowed(MOCK_BLOCK.lo - 1, MOCK_BLOCK), 'OUTSIDE_REGISTERED_BLOCK') && throwsCode(() => G.assertSeedAllowed(MOCK_BLOCK.hi + 1, MOCK_BLOCK), 'OUTSIDE_REGISTERED_BLOCK'),
  'seeds outside the registered block are refused');
const rc = SRC['run_child.mjs'];
ok('D1.4', rc.indexOf('assertSeedAllowed(configSeed, spec.block)') > 0 && rc.indexOf('assertSeedAllowed(configSeed, spec.block)') < rc.indexOf("await import(U + '/experiments/m7/env.js')")
  && /configSeed !== spec\.acceptedSeed/.test(rc), 'run child checks the seed against the block BEFORE the configuration generator is imported, and runs only the plan-accepted seed');
ok('D1.5', plan1.slots.every((s) => s.rejected.every((r) => r.failed.length > 0) && s.startingSeed <= s.acceptedSeed && s.rejectionCount === s.acceptedSeed - s.startingSeed),
  'each slot records its starting seed, every rejected candidate with its failed acceptance checks, and the accepted seed');

// ---- D2 no historical / development overlap ----------------------------------------------------------
const HIST = [[895000, 895999, 'C1'], [896000, 896999, 'development fixtures'], [897000, 897999, 'UQ-B'], [898000, 898999, 'UQ-A'],
  [899000, 899499, 'Q1'], [899500, 899999, 'M8'], [900000, 900029, 'M7 pilot'], [900030, 900499, 'M7 gate-diagnostic'], [900500, 900510, 'held-out']];
ok('D2.1', HIST.every(([lo, hi]) => throwsCode(() => G.validateRegistration(fixtureReg({ seedBlock: { lo, hi } })))
  && throwsCode(() => G.validateRegistration(fixtureReg({ seedBlock: { lo: lo - 5, hi: lo + 5 } })))),
  `every previously used block (${HIST.map((h) => h[2]).join(', ')}) and every block straddling one is refused`);
ok('D2.2', G.DEV_FIXTURES.every(([s]) => throwsCode(() => G.assertSeedAllowed(s, { lo: s, hi: s }), 'DEVELOPMENT_FIXTURE'))
  && /mode === 'shakedown'[\s\S]{0,200}DEV_FIXTURES\.some/.test(rc), 'development fixtures are refused as Study-2 seeds; shakedown mode accepts nothing else');
ok('D2.3', HIST.every(([lo, hi]) => typed.config.isConsumed(typed.configSeed(lo)) || typed.config.isHeldOut(typed.configSeed(lo)))
  && importsOf(SRC['governance.mjs']).join() === '../registry/typed.js',
  'governance decides consumption through the typed registry (experiments/registry/typed.js), which already records every block above');
const PROPOSED = { lo: 890000, hi: 892999 };
let propOk = false; try { G.validateRegistration(fixtureReg({ seedBlock: PROPOSED, runCount: 16 })); propOk = true; } catch { propOk = false; }
ok('D2.4', propOk && HIST.every(([lo, hi]) => PROPOSED.hi < lo || PROPOSED.lo > hi), `the proposed block ${PROPOSED.lo}-${PROPOSED.hi} is disjoint from every used block and passes validation (no seed generated)`);

// ---- D3 fixed run count ----------------------------------------------------------------------------------
ok('D3.1', [0, -4, 6, 7.5, '16', null, 2].every((n) => throwsCode(() => G.validateRegistration(fixtureReg({ runCount: n })), 'BAD_RUN_COUNT'))
  && plan1.slots.length === regOk.runCount, 'run count must be an explicit positive multiple of 4; the plan has exactly that many slots');
const dcode = CODE['drive_study2.mjs'];
ok('D3.2', !/\bbreak\b|\bcontinue\b|\bwhile\b/.test(dcode) && (dcode.match(/for \(const slot of plan\.slots\)/g) || []).length === 1
  && [...dcode.matchAll(/(?<!reg\.)\brunCount\b(?!\s*:)/g)].length === 0 && /runCount: reg\.runCount/.test(dcode),
  'driver: one loop over the fixed plan, no break/continue/while; the run count is read only from the registration');
ok('D3.3', throwsCode(() => G.validateRegistration(fixtureReg({ authorization: '' })), 'UNAUTHORIZED')
  && throwsCode(() => G.validateRegistration({ ...fixtureReg(), extra: 1 }), 'BAD_REGISTRATION')
  && throwsCode(() => G.validateRegistration(json('experiments/study2/registration.template.json'))),
  'no authorization, extra fields, or the unfilled template => refused');

// ---- D4 goal balance ---------------------------------------------------------------------------------------
ok('D4.1', JSON.stringify(plan1.slots.map((s) => s.goal)) === JSON.stringify([8, 12, 16, 19, 8, 12, 16, 19]) && m1.calls.every(([, i], j) => i === plan1.requested[j].configIndex)
  && G.DESIGN.goals.every((g) => plan1.slots.filter((s) => s.goal === g).length === 2), 'slot i uses configIndex i; goals 8/12/16/19 appear equally');
ok('D4.2', throwsCode(() => G.assertGoalBalance(plan1.slots.slice(0, 7), 8), 'RUN_COUNT') && throwsCode(() => G.assertGoalBalance([...plan1.slots.slice(0, 7), plan1.slots[0]], 8), 'GOAL_BALANCE'),
  'an unbalanced or short plan is refused');
const envSrc = read('experiments/m7/env.js');
ok('D4.3', /export const GOALS\s+= \[8, 12, 16, 19\];/.test(envSrc) && envSrc.includes('const goal = GOALS[configIndex % GOALS.length];'),
  'env.js: goal = GOALS[configIndex % 4] with GOALS = [8, 12, 16, 19], matching the governance goal map');
ok('D4.4', throwsCode(() => G.planAcceptanceWalk((s, i) => ({ accepted: true, goal: 8, checks: {} }), { ...regOk, runCount: 4 }), 'GOAL_MISMATCH'), 'goal/index disagreement is refused, not absorbed');

// ---- D5-D7 leakage and stopping ---------------------------------------------------------------------
section('D5-D7 oracle-free seed selection and stopping');
const gcode = CODE['governance.mjs'];
ok('D5.1', !ORACLE.test(gcode) && !ORACLE.test(dcode) && !ORACLE.test(CODE['manifest.mjs']) && !/\bp\s*\[|\.p\b/.test(gcode),
  'governance, driver and manifest code name no oracle / p / policy symbol');
ok('D5.2', JSON.stringify(members(gcode, 'cfg')) === '["accepted","checks","goal"]' && /ACCEPTANCE_CHECKS\.filter\(\(k\) => cfg\.checks\[k\] !== true\)/.test(SRC['governance.mjs'])
  && (gcode.match(/cfg\.checks/g) || []).length === 1,
  'the walk reads only cfg.accepted, cfg.goal and the six acceptance booleans (for the rejection record)');
ok('D5.3', JSON.stringify(members(dcode, 'env')) === '["evaluatedSeeds","makeConfig"]'
  && JSON.stringify(importsOf(SRC['drive_study2.mjs']).filter((s) => !s.startsWith('node:'))) === '["./governance.mjs","./manifest.mjs"]',
  'driver touches the environment only through makeConfig (the walk) and evaluatedSeeds (the census)');
ok('D5.4', ['governance.mjs', 'drive_study2.mjs', 'run_child.mjs', 'capture.mjs', 'manifest.mjs'].every((f) => importsOf(SRC[f]).every((sp) => !/taub|analyze_study2|validation\//.test(sp)) && !/taub|analyze|validation/.test(CODE[f]))
  && !/taub|analyze|validation/.test(codeOf('const m = "analyze_study2.mjs"; // taub')) && /taub/.test(codeOf('taub.tauB(x)')),
  'no seed-selection or runtime file imports or calls the analysis, tau-b or validation code (manifest.mjs only hashes their paths as strings)');
ok('D5.5', /R5/.test(SRC['governance.mjs']) && /ONLY the frozen environment predicate `cfg\.accepted`/.test(SRC['governance.mjs']),
  'DISCLOSED: acceptance is the frozen env predicate (R1-R5, G11; §T); R5 evaluates the configuration\'s own p inside env.js — pre-registered eligibility, not a Study-2 outcome [reported]');
ok('D6.1', JSON.stringify(DRV.SUMMARY_FIELDS) === JSON.stringify(['status', 'capture', 'slot', 'eventCount', 'fingerprint', 'integrityFailures', 'artifact', 'artifactSha256'])
  && JSON.stringify(Object.keys(DRV.readSummary('@@S2RUN@@' + JSON.stringify({ status: 'completed', delta: 0.5, theta: 1, full: [1] })))) === JSON.stringify(DRV.SUMMARY_FIELDS),
  'only whitelisted summary fields cross from a child into the driver; injected delta/theta/scores are dropped');
ok('D6.2', (dcode.match(/JSON\.parse\(/g) || []).length === 2 && /JSON\.parse\(regText\)/.test(dcode) && /JSON\.parse\(stdout\.slice/.test(dcode) && !/spawnSync\([^)]*analyze/.test(SRC['drive_study2.mjs']),
  'driver parses only the registration and the child summary line; it never parses a run artifact and never spawns the analysis');
ok('D6.3', !ORACLE.test(CODE['run_child.mjs']) && !ORACLE.test(CODE['capture.mjs']) && !/cfg\s*\.\s*p|\.pPhase/.test(CODE['run_child.mjs'] + CODE['capture.mjs']),
  'run child and capture name no oracle symbol and never touch p');
ok('D6.4', ORACLE.test(CODE['analyze_study2.mjs']) && Object.entries(SRC).filter(([f]) => f !== 'analyze_study2.mjs').every(([, s]) => !/analyze_study2/.test(codeOf(s))),
  'the oracle appears only in analyze_study2.mjs, which no runtime file imports or spawns');
const loopBody = dcode.slice(dcode.indexOf('for (const slot of plan.slots)'), dcode.indexOf('const replayOnce'));
ok('D7.1', (loopBody.match(/refuse\(/g) || []).length === 1 && /if \(exitCode === 4 \|\| exitCode === 1 \|\| !summary\)/.test(loopBody) && !/eventCount|fingerprint/.test(loopBody.replace(/const \{ exitCode, summary \}[^\n]*/, '')),
  'the only exit inside the run loop is the apparatus-integrity/refusal halt; nothing in the loop reads event counts or results');
ok('D7.2', /if \(fs\.existsSync\(out\)\) refuse/.test(dcode) && /ledger does not equal the plan/.test(SRC['analyze_study2.mjs']) && /HALT\.json'\)\)\) stop/.test(SRC['analyze_study2.mjs']),
  'no resumption into an existing block; the analysis refuses a ledger that differs from the plan or a halted block');
ok('D7.3', /crashed/.test(SRC['analyze_study2.mjs']) && !/replace|substitut/i.test(codeOf(SRC['analyze_study2.mjs']).replace(/\.replace\(/g, '')),
  'crashed runs are recorded and excluded, never substituted (§T)');

// ---- D8-D14: the run child on the development shakedown, against the gated readiness evidence -------
section('D8-D14 event definition, K(e), snapshot, shadows, timing (shakedown 896066:0)');
const E = RC.events, N = E.length;
ok('D8.1', SK.eventsDigest === sha(JSON.stringify(E)) && SK.tickLogDigest === sha(JSON.stringify(RC.tickLog)) && SK.eventCount === N,
  `Study-2 child reproduces the gated readiness event record exactly: ${SK.eventCount} events, identical digest and tick log`);
const MAIN = read('main.js'), MS = HOOK.mainSource(MAIN);
ok('D8.2', MS.split(HOOK.DECISION_REPLACEMENT).length === 2 && MS.includes('runPrediction(clickedId);') && !/__S2_BEGIN__[^\n]*runPrediction\(clickedId\)/.test(MS)
  && git('diff', '--name-only', READINESS, '--', 'experiments/study2/hook_capture.mjs').trim() === '',
  'event = the agent-loop runPrediction(agentCurrent) only; the UI call is not wrapped; hook unchanged since cfadedd9');
ok('D8.3', SK.maxEventsPerStep === 1 && SK.runAgentCalls - SK.eventCount > 0, `one event per runAgent invocation; ${SK.runAgentCalls - SK.eventCount} stale/replay steps without runPrediction excluded`);
const cc = SK.checkCounts;
ok('D9', ['A_sameIds', 'B_sameCardinality', 'C_noMissing', 'D_noExtra', 'E_noDuplicates', 'F_orderDeterministic'].every((k) => cc[k] === N)
  && ['K(e).A_sameIds', 'K(e).F_orderDeterministic'].every((k) => rc.includes("'" + k.split('.')[1] + "'")),
  `K(e) = step-0 set: same ids, cardinality, none missing/extra, no duplicates, deterministic order ${N}/${N}; enforced per event in every Study-2 run`);
ok('D10', cc.G_targetEqualsCandidate === N && HOOK.REPORT_INJECTIONS.some(([, r]) => r.includes('__S2_KEY__(step, k); const targetNeuronForFuture = findNeuronById(k);')),
  `targetNeuronForFuture(k) == k on every event (${cc.G_targetEqualsCandidate}/${N}); key reported at the FutureScore site`);
const RD = await import(pathToFileURL(path.join(HERE, 'snapshot_reader.mjs')).href + '?mode=FULL');
let thrown = false; globalThis.__S2_SNAPSHOT__ = null; try { RD.recordFor(1, 2); } catch { thrown = true; }
const view = Object.freeze({ get: (k) => new Map([['1->2', Object.freeze({ a: 3, s: 1 })]]).get(k) });
globalThis.__S2_SNAPSHOT__ = view; const viaView = JSON.stringify(RD.recordFor(1, 2)); globalThis.__S2_SNAPSHOT__ = null;
ok('D11', thrown && viaView === '{"a":3,"s":1}' && cc.snapUnchanged === N && cc.liveUnchanged === N && cc.snapUnboundAfter === N
  && /snapView = Object\.freeze\(\{ get: \(key\) => bound\.get\(key\) \}\)/.test(SRC['capture.mjs']) && /Object\.freeze\(\{ a: r\.a, s: r\.s \}\)/.test(SRC['capture.mjs']),
  'snapshot taken once per event, entries frozen, FULL sees a frozen get-only view, no live fallback (throws unbound); unchanged/unbound on every event');
const planning = read('render/planning.js');
const oneLine = ['FULL', 'GEO'].every((m) => { const a = planning.split('\n'), b = HOOK.shadowSource(planning, m).split('\n'); return a.length === b.length && a.filter((l, i) => l !== b[i]).length === 1; });
ok('D12', oneLine && cc.fullEqLive === N && cc.geoEqNegD === N && git('diff', '--name-only', READINESS, '--', 'experiments/study2/snapshot_reader.mjs').trim() === '',
  `FULL/GEO are render/planning.js with one line (the reader import) replaced; FULL == live ${cc.fullEqLive}/${N}, GEO == -d ${cc.geoEqNegD}/${N}`);
const block = (src, start, end) => { const s = src.indexOf(start); return s < 0 ? null : src.slice(s, src.indexOf(end, s)).split('\n').map((l) => l.trim()).join('\n'); };
const endR = block(SRC['child.mjs'], 'globalThis.__S2_END__ = () => {', 'eventsPerStep.set(step');
const endS = block(SRC['capture.mjs'], 'globalThis.__S2_END__ = () => {', '// retained for post-run analysis only');
ok('D13', cc.shadowInInvocation === N && cc.shadowBeforeDecision === N && endR !== null && endR === endS
  && /FULL\.futureScore\(n, g\);\s*globalThis\.__S2_SNAPSHOT__ = null;\s*const geo = GEO\.futureScore\(n, g\);/.test(SRC['capture.mjs']),
  `shadows evaluated synchronously in the step-0 futureScore call, before the decision (${cc.shadowInInvocation}/${N}, ${cc.shadowBeforeDecision}/${N}); event-close logic verbatim from the gated readiness child`);
const M = MAIN.split('\n'), at = (t) => M.findIndex((l) => l.includes(t)) + 1;
const ord = ['runPrediction(agentCurrent);', '_m7env.attempt(_m7From, _m7To)', 'recordTraversalOutcome(_m7From, _m7To, _m7Traversed);'].map(at);
ok('D14', ord.every((n) => n > 0) && ord[0] < ord[1] && ord[1] < ord[2] && cc.liveUnchanged === N && /need\('phaseMatchesTau'/.test(rc),
  `no current-tick outcome in scoring: score ${ord[0]} < draw ${ord[1]} < write ${ord[2]}; record unchanged during scoring ${cc.liveUnchanged}/${N}`);

// ---- D15-D17 analysis --------------------------------------------------------------------------------
section('D15-D17 primary window, tau-b and bootstrap in the analysis');
// synthetic runs: the oracle maps and scores are invented; no configuration, no seed
const U1 = (k) => [0, -1, -2, -3][k], U2 = (k) => [-3, -2, -1, 0][k];
const ev = (tau, full, geo) => ({ tau, k: [0, 1, 2, 3], full, geo });
const synth = (post) => [0, 1, 2, 3].map((slot) => ({ slot, goal: G.DESIGN.goals[slot], status: 'completed', r5Differing: 4 + slot, U1, U2,
  events: [ev(1499, [3, 2, 1, 0], [1, 1, 0, 0]), ev(1500, [3, 2, 1, 0], [0, 0, 0, 0]), ev(1501, post, [1, 1, 0, 0]), { tau: 10, k: [2], full: [0], geo: [0] }] }))
  .concat([{ slot: 4, goal: 8, status: 'crashed' }]);
const A1 = AN.analyzeStudy(synth([3, 2, 1, 0])), A2 = AN.analyzeStudy(synth([0, 1, 2, '-Infinity']));
ok('D15.1', AN.PRIMARY_TAU_MAX === 1500 && G.DESIGN.primaryWindowMaxTau === 1500 && A1.perRun.every((r) => r.primary.nEvents === 3 && r.primary.excludedMlt2 === 1 && r.postShift.nEvents === 1),
  'tau <= 1500 is primary (boundary event 1500 included), tau 1501 is post-shift; m < 2 excluded and counted');
ok('D15.2', JSON.stringify(A1.primary) === JSON.stringify(A2.primary) && A1.secondaryPostShift.theta !== A2.secondaryPostShift.theta,
  'post-shift events change only the secondary result; the primary result is identical (never pooled)');
const d1499 = T.deltaEvent([3, 2, 1, 0], [1, 1, 0, 0], [0, 1, 2, 3].map(U1)), d1500 = T.deltaEvent([3, 2, 1, 0], [0, 0, 0, 0], [0, 1, 2, 3].map(U1));
ok('D15.3', A1.perRun[0].primary.deltaR === T.median([d1499, d1500]) && d1500 === 1 && A1.perRun[0].primary.undefinedGEO === 1,
  'primary scores against U1 = -C(pPhase1); undefined GEO tau-b scored 0 and counted (§P)');
ok('D15.4', A1.runs.crashed.join() === '4' && A1.primary.n === 4 && A1.sensitivityUndefinedExcluded.n === 4 && A1.perRun[0].sensitivity.nEvents === 1,
  'crashed run recorded and excluded; sensitivity analysis excludes undefined-tau-b events');
ok('D15.5', /PRIMARY_TAU_MAX = 1500/.test(SRC['analyze_study2.mjs']) && /expectedCostToGoal\(cfg\.pPhase1, cfg\.goal\)/.test(SRC['analyze_study2.mjs']) && /U1: \(k\) => -C1\.get\(k\)/.test(SRC['analyze_study2.mjs']),
  'CLI: U*(k) = -expectedCostToGoal(pPhase1, goal)(k), candidate-onward, computed post-run from the regenerated configuration');
ok('D16', git('diff', '--name-only', READINESS, '--', 'experiments/study2/taub.mjs', 'experiments/study2/validation').trim() === '' && V.TB.length === 16 && V.TB.every((x) => x.agree) && V.TC.every((x) => x.pass)
  && /import \{ tauB, deltaEvent, median, exactBootstrapMedianCI \} from '\.\/taub\.mjs';/.test(SRC['analyze_study2.mjs']) && !/function\s+(tau|kendall)/i.test(CODE['analyze_study2.mjs']),
  `analysis uses the validated taub.mjs unchanged since cfadedd9 (SciPy ${V.reference.scipy}: ${V.TB.filter((x) => x.agree).length}/16; conventions ${V.TC.length}/11); no second tau-b`);
const vals = A1.perRun.map((r) => r.primary.deltaR);
const rk = (n) => T.exactBootstrapMedianCI([...Array(n)].map((_, i) => i + 1));
ok('D17', V.BS.every((x) => x.agree) && V.S1regression.reproduces && JSON.stringify(A1.primary.interval) === JSON.stringify(T.exactBootstrapMedianCI(vals))
  && rk(8).lower === 2 && rk(8).upper === 7 && rk(12).lower === 3.5 && rk(12).upper === 9.5,
  'analysis interval = the frozen exact count-vector bootstrap (brute-force agreement, Study-1 reproduced); data-free rank structure n=8 [2,7], n=12 [3.5,9.5]');

// ---- D18-D20 integrity, metadata, hash freeze -------------------------------------------------------
section('D18-D20 integrity, reproducibility metadata, hash freeze');
const diffSince = (base, ...p) => git('diff', '--name-only', base, '--', ...p).trim();
const run = (f) => { try { return execFileSync(process.execPath, [path.join(ROOT, f)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { return String(e.stdout || ''); } };
const vr = run('experiments/study2/verify_readiness.js'), dg = run('research/preregistrations/verify_fs_study2_design_final.js');
const dgFails = [...dg.matchAll(/\[FAIL\] (\S+)/g)].map((m) => m[1]);
ok('D18.1', diffSince(PROD_BASE, 'main.js', 'render', 'index.html', 'instrumentation', 'neurons.json', 'connections.json', 'experiments/m7') === '', 'production tree (and the M7 substrate) unchanged since a066d47');
ok('D18.2', diffSince(DESIGN_BASE, 'experiments/m39', 'experiments/m40', 'experiments/d2', 'experiments/boundary', 'experiments/phase1_0', 'experiments/fsbehav', 'experiments/futurescore', 'experiments/registry', 'experiments/uqb', 'experiments/c1') === ''
  && diffSince(READINESS, 'experiments/study2/child.mjs', 'experiments/study2/drive_readiness.mjs', 'experiments/study2/readiness_evidence', 'experiments/study2/verify_readiness.js', 'experiments/fsfeas') === '',
  'historical experiments, the registry and the readiness apparatus/evidence unchanged');
ok('D18.3', /RESULT: 63\/63 checks passed — PASS/.test(vr) && dgFails.every((id) => ['G2', 'G3'].includes(id)),
  `readiness gate 63/63; design-freeze gate: only its milestone-scope checks flip (${dgFails.join(',') || 'none'})`);
const NEW = [...Object.keys(SRC).filter((f) => f !== 'child.mjs').map((f) => `experiments/study2/${f}`), 'experiments/study2/verify_driver.js'];
ok('D18.4', !fs.existsSync(path.join(ROOT, 'package.json')) && NEW.every((f) => importsOf(read(f)).every((s) => !RAW_GOVERNANCE.some((g) => path.posix.join(path.posix.dirname(f), s) === g))),
  'no dependency manifest; no new file imports a raw governance module (typed registry only)');
const P = SK.provenanceOn;
const REQUIRED = ['productionBaselineCommit', 'study2DriverCommit', 'analysisScriptSha256', 'driverManifestSha256', 'graphSha256', 'environmentSha256', 'environmentIdentity',
  'agentSeed', 'configSeed', 'configIndex', 'goal', 'acceptedSeed', 'rejectionCount', 'primaryWindow', 'rngFingerprint', 'eventCount', 'evidenceIntegritySha256', 'slotStartingSeed', 'rngStreamSeeds'];
ok('D19.1', REQUIRED.every((k) => P[k] !== undefined && P[k] !== null) && !('commit' in P) && P.productionBaselineCommit === PROD_BASE && /^[0-9a-f]{40}$/.test(P.study2DriverCommit)
  && P.graphSha256.startsWith('52867c4bb1c15392') && P.primaryWindow.tauMax === 1500 && P.productionTreeMatchesBaseline === true,
  `every run artifact records ${REQUIRED.length} named identities; productionBaselineCommit and study2DriverCommit are distinct fields; no generic "commit"`);
ok('D19.2', REQUIRED.every((k) => rc.includes(`${k}:`) || rc.includes(`${k},`)) && /need\('onlyOwnSeedEvaluated'/.test(rc) && JSON.stringify(P.seedsTouched) === '[896066]',
  'the run child writes every required field and asserts that only its own seed was evaluated (shakedown census: 896066)');
ok('D19.3', SK.statusOn === 'completed' && SK.integrityFailuresOn.length === 0 && SK.nonInterference.differing.length === 0
  && JSON.stringify(SK.nonInterference.on) === JSON.stringify(NI.on) && JSON.stringify(SK.nonInterference.off) === JSON.stringify(NI.off),
  'run child ON/OFF identical on all 11 fingerprint fields and equal to the readiness non-interference record');
const man = MAN.computeManifest();
const committedMan = read('experiments/study2/DRIVER_MANIFEST.json');
ok('D20.1', committedMan === MAN.canonical(man) && [...MAN.DRIVER_FILES, ...MAN.ANALYSIS_FILES].every((f) => man.files[f] === shaLF(read(f))) && MAN.ANALYSIS_FILES.includes('experiments/study2/analyze_study2.mjs'),
  `DRIVER_MANIFEST.json reproduces the ${Object.keys(man.files).length} driver/analysis file hashes; analysis hash ${man.analysisSha256.slice(0, 12)}…`);
const pf = SRC['drive_study2.mjs'];
ok('D20.2', pf.indexOf('committed !== canonical(manifest)') < pf.indexOf('async function main') && pf.indexOf('manifestSha256(manifest) !== reg.driverManifestSha256') < pf.indexOf('async function main')
  && pf.indexOf('preflight(process.argv') < pf.indexOf('planAcceptanceWalk(env.makeConfig') && /git\('status', '--porcelain'/.test(pf),
  'the driver refuses before the acceptance walk unless files == manifest == registration pin, all committed and unmodified');
ok('D20.3', P.driverManifestSha256 === MAN.manifestSha256(man) && P.analysisScriptSha256 === man.analysisSha256,
  'the shakedown ran with exactly the manifested driver and analysis files');
ok('D20.4', json('experiments/study2/registration.template.json').driverManifestSha256 === null && DOC.includes('DRIVER_MANIFEST.json') && read(PROPOSAL_REL).includes(MAN.manifestSha256(man)),
  `manifest hash ${MAN.manifestSha256(man).slice(0, 12)}… proposed for registration; the template leaves it unfilled for the Director (Z9 OPEN)`);

// ---- S scope -----------------------------------------------------------------------------------------
section('S   scope (this milestone\'s own files are the allowed set, never counted as violations)');
const ALLOWED = new Set([DOC_REL, PROPOSAL_REL, 'experiments/study2/README.md', 'experiments/study2/DRIVER_MANIFEST.json', 'experiments/study2/registration.template.json',
  'experiments/study2/shakedown_evidence/SHAKEDOWN.json', ...NEW]);
const changed = [...git('diff', '--name-only', READINESS).trim().split('\n'), ...git('ls-files', '-o', '--exclude-standard', '--', 'experiments/study2').trim().split('\n')]
  .filter(Boolean);
ok('S.1', changed.every((f) => ALLOWED.has(f)), `every change since cfadedd9 is a milestone file (${changed.length}); outside: ${changed.filter((f) => !ALLOWED.has(f)).join(',') || 'none'}`);
ok('S.2', !fs.existsSync(path.join(HERE, 'runs')) && ![...fs.readdirSync(HERE)].some((f) => /^PLAN\.json$|^LEDGER\.json$|^ANALYSIS\.json$/.test(f)),
  'no Study-2 block output exists: the driver has not been executed');
ok('S.3', /Scientific seeds generated: \*\*NO\*\*/.test(read(PROPOSAL_REL)) && /Study 2 executed: \*\*NO\*\*/.test(read(PROPOSAL_REL)), 'proposal states no seeds generated and no execution');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

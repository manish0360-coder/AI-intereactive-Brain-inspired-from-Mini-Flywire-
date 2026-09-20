// ==========================================================
// BOUNDARY-RECORD DESIGN GATE — FutureScore production boundary record (design only)
// ==========================================================
// PASS 2: every source claim the design document makes is re-derived here from the files at the
// milestone base, not from the document. Nothing is implemented, no agent is run, no seed is evaluated:
// this verifier imports only node builtins and reads files through git.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC_REL = 'research/preregistrations/FUTURESCORE_BOUNDARY_RECORD_DESIGN.md';
const SELF_REL = 'research/preregistrations/verify_fs_boundary_design.js';
const MILESTONE = [DOC_REL, SELF_REL].sort();
const BASE = '6a727d38e6926d1f0dd476213309c1e1c7158e58';            // V2.3 freeze
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

console.log('='.repeat(78)); console.log('  BOUNDARY-RECORD DESIGN GATE — production boundary record (design only)'); console.log('='.repeat(78));

const atBase = (f) => git('show', `${BASE}:${f}`).replace(/\r\n/g, '\n');
const MAIN_SRC = atBase('main.js'), MAIN = MAIN_SRC.split('\n');
const EPI = atBase('render/episodeManager.js').split('\n');
const ENV = atBase('experiments/m7/env.js').split('\n');
const RUN = atBase('experiments/m7/run.js').split('\n');
const G9 = atBase('experiments/phase1_0/verify_G9.js');
const at = (L, n, t) => (L[n - 1] || '').includes(t);

// ---- A: the execution path the document traces -------------------------------------------------------
section('A  execution path (main.js at base)');
const ANCHORS = [
  ['A1', MAIN, 5067, 'function runAgentLoop()', 'runAgentLoop is the per-frame driver (5067)'],
  ['A2', MAIN, 5178, 'runAgent();', 'runAgentLoop calls runAgent (5178)'],
  ['A3', MAIN, 3132, 'function runAgent()', 'runAgent is the tick function (3132)'],
  ['A4', MAIN, 3832, 'next = window.lastReasoning.to', 'next is the INTENDED destination (3832)'],
  ['A5', MAIN, 4379, 'recentMemory.push(current);', 'recentMemory is pushed pre-outcome (4379)'],
  ['A6', MAIN, 4436, 'current === goalNeuronId', 'goal block keyed on the intended move (4436)'],
  ['A7', MAIN, 4473, 'recordAutonomousSuccess(recentMemory, current', 'goal block calls recordAutonomousSuccess (4473)'],
  ['A8', MAIN, 4558, 'if (!globalThis.__M7_CREDIT__) recordSuccess(pathKey);', 'episode-level success writer (4558)'],
  ['A9', MAIN, 4744, 'agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];', 'goal reset picks a random node (4744)'],
  ['A10', MAIN, 4850, 'agentLast = agentCurrent;', 'agentLast becomes the true origin (4850)'],
  ['A11', MAIN, 4877, 'Number(next) === Number(goalNeuronId)', '_goalResetJustHappened is next === goal (4877)'],
  ['A12', MAIN, 4902, '? _m7env.attempt(_m7From, _m7To)', 'the environment draw (4902)'],
  ['A13', MAIN, 4903, ': true;', 'M7-off yields literal true (4903)'],
  ['A14', MAIN, 4926, '_m7cred.recordTraversal(_m7From, _m7To, _m7Traversed);', 'the only post-outcome writer today (4926)'],
  ['A15', MAIN, 4929, 'if (next !== null && !_goalResetJustHappened && _m7Traversed) {', 'the movement gate follows the outcome (4929)'],
  ['A16', MAIN, 4930, 'agentCurrent = next;', 'agentCurrent changes only inside that gate (4930)'],
  ['A17', MAIN, 684, 'function saveBrain()', 'saveBrain (684)'],
  ['A18', MAIN, 729, 'function loadBrain()', 'loadBrain (729)'],
  ['A19', EPI, 1092, 'sys.recordSuccess(key);', '_updateTrust writes recordSuccess (episodeManager.js:1092)'],
];
for (const [id, L, n, t, m] of ANCHORS) ok(id, at(L, n, t), m);
ok('A20', at(MAIN, 4898, 'const _m7From = agentLast;') && at(MAIN, 4899, 'const _m7To   = next;'),
  'edge identity captured at the decision (4898-4899)');
ok('A21', (MAIN_SRC.match(/_m7Traversed\s*=/g) || []).length === 1 && /const _m7Traversed\s*=/.test(MAIN_SRC),
  'outcome is const and assigned exactly once — no later reinterpretation');
const MAIN_CODE = MAIN_SRC.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
ok('A22', (MAIN_CODE.match(/\.attempt\(/g) || []).length === 1,
  'exactly one environment draw per movement decision (one .attempt call in main.js code; 4880 is a comment)');
const guardWrites = MAIN.slice(4923, 4928).join('\n');
ok('A23', /next !== null && !_goalResetJustHappened && _m7cred/.test(guardWrites),
  'the credit site is guarded by next !== null && !_goalResetJustHappened');
ok('A24', at(MAIN, 4901, '(next !== null && !_goalResetJustHappened && _m7env)'),
  'goal-entering ticks take NO environment draw — the §3.1 evidence gap');

// ---- K: canonical key facts --------------------------------------------------------------------------
section('K  canonical edge identity');
ok('K1', at(ENV, 54, 'const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);'), 'env edge key is UNDIRECTED (env.js:54)');
ok('K2', at(RUN, 156, 'arms.edgeIndex(from, to) === undefined') && at(RUN, 157, "const key = from + '->' + to;"),
  'M7 validates undirected, stores directed (run.js:156-157)');
const neurons = JSON.parse(atBase('neurons.json')), conns = JSON.parse(atBase('connections.json'));
ok('K3', neurons.every(n => Number.isInteger(n.id)) && conns.every(e => Number.isInteger(e.from) && Number.isInteger(e.to)),
  `node ids are integer data-file constants (${neurons.length} neurons, ${conns.length} connections) — keys stable across save/load`);
ok('K4', new Set(neurons.map(n => n.id)).size === neurons.length, 'node ids are unique — the directed key cannot collide');

// ---- G9: the render/ surface constraint ---------------------------------------------------------------
section('G9  render/ surface constraint');
const modules = (G9.match(/^\s+'[\w.]+\.js':/gm) || []).length;
const exportsCount = (G9.match(/'[A-Za-z_$][\w$]*'/g) || []).length;
ok('N1', /37 modules, 215 exports/.test(G9) && modules === 37, `verify_G9 pins the whole render/ surface (${modules} modules)`);
ok('N2', /rejects an ADDED export/.test(G9) && /rejects an ADDED render\/ module/.test(G9),
  'G9 mutation controls reject an added export AND an added module — a lineage transition is required');
ok('N3', /'trustMemory\.js': \['decayTrust','getPathTrust','getTrustSnapshot','getTrustUncertainty','pathAttempts','pathSuccesses','recordAttempt','recordSuccess'\]/.test(G9),
  'trustMemory.js surface is pinned exactly — new exports there would trip G9 too');

// ---- P: persistence facts -----------------------------------------------------------------------------
section('P  persistence');
const saveBody = MAIN.slice(683, 713).join('\n');
ok('P1', /transitions:|rewards:|penalties:|signals:|curiosity:/.test(saveBody) && !/pathAttempts|pathSuccesses/.test(saveBody),
  'saveBrain does not persist any trust-like record');
const loadBody = MAIN.slice(728, 800).join('\n');
ok('P2', !/pathAttempts|pathSuccesses/.test(loadBody), 'loadBrain restores no trust-like record');

// ---- D: document content ------------------------------------------------------------------------------
section('D  design document content');
const DOC = read(DOC_REL);
const SECTIONS = ['## 1. Problem statement', '## 2. Frozen requirements inherited', '## 3. Source-traced execution path',
  '## 4. Authoritative outcome definition', '## 5. M7-off semantics', '## 6. Canonical edge identity', '## 7. Store ownership',
  '## 8. Persistence decision', '## 9. M7 compatibility model', '## 10. Existing-writer contamination audit',
  '## 11. Proposed read interface', '## 12. Data schema', '## 13. Lifecycle', '## 14. Failure modes',
  '## 15. Test / gate plan', '## 16. Minimal implementation plan', '## 17. Non-goals', '## 18. Implementation authorization boundary'];
ok('D1', SECTIONS.every(s => DOC.includes(s)), `all 18 required sections present${SECTIONS.filter(s => !DOC.includes(s)).join(' | ')}`);
ok('D2', ['**FACT', '**INFERENCE', '**DESIGN DECISION', '**OPEN QUESTION'].every(l => DOC.includes(l)), 'all four evidence labels used');
const gates = [...DOC.matchAll(/\*\*B(\d+)\*\*/g)].map(m => +m[1]);
ok('D3', gates.length === 12 && gates.every((n, i) => n === i + 1), 'gates B1..B12 specified in order');
ok('D4', /\*\*DECISION: NOT REQUIRED\.\*\*/.test(DOC) && /persisting or discarding them cannot change a single FutureScore value/.test(DOC),
  'persistence classified NOT REQUIRED, justified from V2.3 semantics');
ok('D5', /\*\*DESIGN DECISION: independent\. The boundary neither mirrors nor replaces M7 storage\.\*\*/.test(DOC),
  'M7 compatibility decided: independent store');
ok('D6', /`render\/traversalRecord\.js`/.test(DOC) && ['Reuse `trustMemory` maps', 'New exports inside `trustMemory.js`', 'Keep counts in `main.js` module scope', 'instrumentation', 'Rework `trustMemory` globally'].every(a => DOC.includes(a)),
  'one recommended ownership model with all alternatives rejected explicitly');
ok('D7', /_updateTrust/.test(DOC) && /main\.js:4361/.test(DOC) && /main\.js:4558/.test(DOC) && /exactly \*\*one\*\* call site/.test(DOC),
  'contaminated writers excluded; single-writer isolation asserted');
ok('D8', /recordFor\(from, to\) -> \{ a, s \}/.test(DOC) && /\*\*and nothing else\*\*/.test(DOC) && /`c_hat` is \*\*not\*\* computed here/.test(DOC),
  'read interface exposes a and s only; the estimator stays with FutureScore');
ok('D9', /IMPLEMENTATION: NO-GO\. EXPERIMENTS: NO-GO\./.test(DOC) && /\*\*Implementation:\s*\n?NO-GO\. Experiments: NO-GO\.\*\*/.test(DOC.replace(/\n/g, '\n')),
  'implementation and experiments recorded NO-GO');
ok('D10', /goal-entering|Goal-entering/.test(DOC) && /OPEN QUESTION \(not fixed here\)/.test(DOC), 'the goal-edge evidence gap is recorded as an open question, not patched');
ok('D11', !/we (will|should) implement|authorizes implementation/i.test(DOC), 'no implementation authorization claimed');

// ---- S: static gates ----------------------------------------------------------------------------------
section('S  static gates');
const SELF = read(SELF_REL);
const imports = [...SELF.matchAll(/^import .* from '([^']+)';/gm)].map(m => m[1]);
ok('S1', imports.every(m => m.startsWith('node:')), `no-agent-run gate: imports only node builtins (${imports.join(', ')})`);
const RUNNERS = ['runOnce', 'makeConfig', 'generateAccepted', 'readoutSeed', 'initRng'];
ok('S2', RUNNERS.every(t => !SELF.slice(0, SELF.indexOf('const RUNNERS')).includes(t)),
  'no-seed gate: no agent runner, configuration generation or seed derivation referenced');

// ---- G: scope and lineage -----------------------------------------------------------------------------
section('G  scope and lineage');
const added = git('log', '--diff-filter=A', '--format=%H', '--', DOC_REL).trim().split('\n').filter(Boolean);
let files, mode;
if (added.length === 1) {
  mode = `commit ${added[0].slice(0, 7)}`;
  files = git('show', '--name-only', '--format=', added[0]).trim().split('\n').filter(Boolean);
  ok('G0', git('rev-parse', `${added[0]}^`).trim() === BASE, 'the design commit is the direct child of base 6a727d3');
} else {
  mode = 'working tree vs HEAD';
  ok('G0', git('rev-parse', 'HEAD').trim() === BASE, 'pre-commit: HEAD is base 6a727d3');
  const tracked = git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  const staged = git('diff', '--cached', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  files = [...new Set([...tracked, ...staged, ...MILESTONE.filter(f => fs.existsSync(path.join(ROOT, f)))])];
}
files.sort();
ok('G1', JSON.stringify(files) === JSON.stringify(MILESTONE), `${mode}: changes exactly the 2 milestone files${JSON.stringify(files) === JSON.stringify(MILESTONE) ? '' : ' — got ' + files.join(', ')}`);
ok('G2', !files.some(f => /^(main\.js|render\/|index\.html|instrumentation\/|experiments\/)/.test(f)), 'no production or experiment file changed');
const treeDiff = git('diff', '--name-only', BASE, '--', 'main.js', 'render', 'index.html', 'instrumentation', 'experiments', 'neurons.json', 'connections.json').trim();
ok('G3', treeDiff === '', 'production, data and experiment trees identical to base 6a727d3');
let prev = '';
try { prev = execFileSync(process.execPath, [path.join(ROOT, 'research/preregistrations/verify_fs_v23.js')], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { prev = String(e.stdout || ''); }
ok('G4', /RESULT: 58\/58 checks passed — PASS/.test(prev), 'lineage: the frozen V2.3 gate still passes 58/58');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

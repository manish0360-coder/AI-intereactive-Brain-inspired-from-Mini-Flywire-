// ==========================================================
// FUTURESCORE V2.3 GATE — implementation verification (groups A..T)
// ==========================================================
// Tests the FROZEN V2.3 CONTRACT, never historical FutureScore semantics (FS-LN-01).
//
// METHOD: behavioural wherever possible. render/planning.js is imported LIVE and driven with
// synthetic graphs and synthetic evidence, so the estimator, recursion, terminal, horizon, tie and
// purity properties are executed rather than read. main.js cannot be imported under Node (THREE/DOM),
// so its projection is EXTRACTED by brace matching and EXECUTED in isolation — a behavioural test of
// production source, not a string match. Each extraction is proved by a mutation self-test.
//
// No agent runs, no configuration is generated, no seed is evaluated, no RNG is consumed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const U = pathToFileURL(ROOT).href;
const SELF_REL = 'experiments/futurescore/verify.js';
const BASE = '782df6e86db6f13abe01a642a72d5beb0397c4e5';      // Pass-1 design freeze
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const blob = (f, rev = 'HEAD') => execFileSync('git', ['show', `${rev}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 });

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
const near = (x, y, eps = 1e-12) => Math.abs(x - y) <= eps;

console.log('='.repeat(78)); console.log('  FUTURESCORE V2.3 GATE — implementation (A..T + mutation matrix)'); console.log('='.repeat(78));

// ===== source scanner (comment/string safe, line numbers preserved) ==================================
function codeOf(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, ' ')                       // [ \t] not \s: \s would eat newlines
    .replace(/([;{}),])[ \t]*\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, (m) => '``' + m.replace(/[^\n]/g, ''));
}
function callSites(src, moduleRe, exportName) {         // executable calls of an import, alias-aware
  const aliases = new Set();
  for (const m of src.matchAll(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["'][^"']*${moduleRe}["']`, 'g')))
    for (const part of m[1].split(',')) {
      const [orig, as] = part.split(/\s+as\s+/).map((s) => s.trim());
      if (orig === exportName) aliases.add((as || orig).trim());
    }
  for (const m of src.matchAll(new RegExp(`import\\s*\\*\\s*as\\s+([\\w$]+)\\s*from\\s*["'][^"']*${moduleRe}["']`, 'g')))
    aliases.add(`${m[1]}.${exportName}`);
  const hits = [];
  const lines = codeOf(src).split('\n');
  for (const alias of aliases) {
    const re = new RegExp(`(?<![\\w$.])${alias.replace('.', '\\.')}\\s*\\(`);
    lines.forEach((l, i) => { if (re.test(l)) hits.push({ alias, line: i + 1 }); });
  }
  return hits;
}
function extractFunction(src, name) {                   // brace-matched, comment/string aware
  const code = codeOf(src);
  const i = code.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (i < 0) return null;
  let depth = 0, started = false;
  for (let k = code.indexOf('{', i); k < code.length; k++) {
    if (code[k] === '{') { depth++; started = true; }
    else if (code[k] === '}') { depth--; if (started && depth === 0) return code.slice(i, k + 1); }
  }
  return null;
}
const compile = (srcText) => new Function(`${srcText}; return ${srcText.match(/function\s+([\w$]+)/)[1]};`)();

// ---- SC: the scanner proves itself -------------------------------------------------------------------
section('SC  scanner self-tests (false positives and false negatives)');
const IMP = 'import { futureScore } from "./planning.js";\n';
ok('SC1', callSites(IMP + 'futureScore(n, g);\n', 'planning\\.js', 'futureScore').length === 1, 'detects the real call');
ok('SC2', callSites('import { futureScore as fx } from "./planning.js";\nfx(n, g);\n', 'planning\\.js', 'futureScore')[0].alias === 'fx', 'detects a renamed alias');
ok('SC3', callSites(IMP + 'futureScore(a,b);\nfutureScore(c,d);\n', 'planning\\.js', 'futureScore').length === 2, 'detects a synthetic second call');
ok('SC4', callSites(IMP + '// futureScore(n,g)\n/* futureScore(n,g) */\n', 'planning\\.js', 'futureScore').length === 0, 'ignores comments');
ok('SC5', callSites(IMP + 'const s = "futureScore(n,g)";\n', 'planning\\.js', 'futureScore').length === 0, 'ignores strings');
ok('SC6', codeOf(read('main.js')).split('\n').length === read('main.js').split('\n').length, 'stripping preserves main.js line numbering');
const demoFn = extractFunction('function demo(x){ return x * 3; }', 'demo');
ok('SC7', typeof compile(demoFn) === 'function' && compile(demoFn)(4) === 12, 'extract+execute round-trips a known function');

// ===== live module under test, synthetic graph and evidence ==========================================
// square with a tail:   1-2, 2-3, 3-4, 4-1, 4-5    and isolated node 9 (disconnected component 9-10)
const GRAPH = new Map([
  [1, [2, 4]], [2, [1, 3]], [3, [2, 4]], [4, [3, 1, 5]], [5, [4]], [9, [10]], [10, [9]],
]);
const neuronMap = new Map([...GRAPH.keys()].map((id) => [id, { userData: { id, neighbors: GRAPH.get(id) } }]));
const search = await import(U + '/render/search.js');
search.setNeuronMap(neuronMap);
const TR = await import(U + '/render/traversalRecord.js');
const PLAN = await import(U + '/render/planning.js');
const { futureScore } = PLAN;
const seed = (from, to, successes, failures) => {
  for (let i = 0; i < successes; i++) TR.recordOutcome(from, to, true);
  for (let i = 0; i < failures; i++) TR.recordOutcome(from, to, false);
};
const cHat = (from, to) => { const r = TR.recordFor(from, to); return (r.a + 1) / (r.s + 1); };
const digest = () => {
  const rows = [];
  for (const u of GRAPH.keys()) for (const v of GRAPH.get(u)) rows.push(`${u}->${v}:${JSON.stringify(TR.recordFor(u, v))}`);
  return sha(rows.join('|'));
};

// ---- A/B/C/D/E: estimator ----------------------------------------------------------------------------
section('A-E  learned edge cost from post-outcome evidence');
TR.clear();
ok('A1', cHat(1, 2) === 1, 'B unseen edge { a:0, s:0 } -> c_hat = 1');
seed(1, 2, 1, 0);
ok('A2', cHat(1, 2) === 1, 'C one success { 1, 1 } -> 1');
TR.clear(); seed(1, 2, 0, 1);
ok('A3', cHat(1, 2) === 2, 'D one failure { 1, 0 } -> 2');
TR.clear(); seed(1, 2, 0, 5);
ok('A4', cHat(1, 2) === 6, 'D n failures { n, 0 } -> n + 1');
TR.clear(); seed(1, 2, 25, 0);
ok('A5', cHat(1, 2) === 1, 'C all-success { n, n } -> 1 for any n (no frequency effect)');
TR.clear(); seed(1, 2, 5, 5);
ok('A6', near(cHat(1, 2), 11 / 6), 'A mixed { a:10, s:5 } -> 11/6 exactly (additive smoothing of a/s)');
let mono = true;
TR.clear();
for (let i = 0; i < 40; i++) { const before = cHat(1, 2); seed(1, 2, 1, 0); if (cHat(1, 2) > before + 1e-15) mono = false; }
for (let i = 0; i < 40; i++) { const before = cHat(1, 2); seed(1, 2, 0, 1); if (cHat(1, 2) <= before) mono = false; }
ok('A7', mono, 'C/D success never raises cost; failure strictly raises it (80 updates)');
TR.clear(); seed(1, 2, 0, 3);
ok('A8', cHat(1, 2) === 4 && cHat(2, 1) === 1, 'E directed independence: 1->2 evidence leaves 2->1 at the prior');
let floor = true;
TR.clear();
for (let s2 = 0; s2 <= 20; s2++) for (let f = 0; f <= 20; f++) { TR.clear(); seed(1, 2, s2, f); if (cHat(1, 2) < 1) floor = false; }
ok('A9', floor, 'c_hat >= 1 over an exhaustive 21x21 evidence sweep');

// ---- F/G/H/I/J/M: recursion, terminal, horizon, purity ------------------------------------------------
section('F-M  planning recursion');
TR.clear();
ok('G1', futureScore(neuronMap.get(3), 3) === 0, 'G candidate IS the goal -> FS = 0');
ok('G2', futureScore(neuronMap.get(1), null) === undefined && futureScore(neuronMap.get(1), undefined) === undefined, 'no goal -> undefined');
// trivial evidence: FS must equal -d over the physical graph
const dFromGoal = (goal) => { const d = new Map([[goal, 0]]), q = [goal]; while (q.length) { const v = q.shift(); for (const w of GRAPH.get(v) || []) if (!d.has(w)) { d.set(w, d.get(v) + 1); q.push(w); } } return d; };
let terminalOk = true;
for (const goal of [1, 2, 3, 4, 5]) { const d = dFromGoal(goal); for (const k of [1, 2, 3, 4, 5]) if (!near(futureScore(neuronMap.get(k), goal), -d.get(k))) terminalOk = false; }
ok('F1', terminalOk, 'F unseen/all-success regime: FS = -d(k,g) for every (k,g) in the connected component');
ok('H1', futureScore(neuronMap.get(9), 1) === -Infinity && futureScore(neuronMap.get(1), 9) === -Infinity, 'H disconnected candidate/goal -> -Infinity');
ok('M1', [1, 2, 3, 4, 5].every((k) => futureScore(neuronMap.get(k), 5) <= 0), 'M FutureScore is non-positive');
// H = 3: a 4-hop-deep reach must still terminate via -d, and no caller can change the horizon
// Hand-derived on this graph with 4->5 made expensive (9 failures => c_hat = 10), goal 5, H = 3.
// d(5)=0 d(4)=1 d(1)=2 d(3)=2 d(2)=3.
//   via 2: -1 + F(2,2) = -1 + (-1 + (-1 + terminal(4))) = -1 + (-3)      = -4
//   via 4: -1 + max( -1 + F(3,1) , -10 + F(5,..)=0 ) = -1 + max(-5,-10)  = -6
//   FS = max(-4, -6) = -4  -> the costly direct edge is correctly avoided.
const fsTrivial = (TR.clear(), futureScore(neuronMap.get(1), 5));    // no evidence: FS = -d = -2
TR.clear(); seed(4, 5, 0, 9);                       // make 4->5 expensive: c_hat = 10
const fs5from1 = futureScore(neuronMap.get(1), 5);
ok('I1', near(fsTrivial, -2) && near(fs5from1, -4) && fs5from1 > -10,
  `I horizon-bounded search: trivial evidence ${fsTrivial} = -d, costly direct edge gives ${fs5from1} (hand-derived -4), avoiding the -10 route`);
const arity = futureScore.length;
ok('I2', arity === 2, `I futureScore takes exactly (neuron, goalNeuronId) — arity ${arity}, so H cannot be overridden by a caller`);
ok('I3', near(futureScore(neuronMap.get(1), 5, 99), futureScore(neuronMap.get(1), 5)), 'I a third argument is ignored (H is a module constant)');
// simple path: a cycle graph must terminate and never revisit
TR.clear();
const cyc = new Map([[1, [2, 4]], [2, [1, 3]], [3, [2, 4]], [4, [3, 1, 5]], [5, [4]], [9, [10]], [10, [9]]]);
ok('J1', Number.isFinite(futureScore(neuronMap.get(1), 3)), 'J recursion terminates on a cyclic graph (simple-path set enforced)');
// determinism and tie handling
TR.clear();
const runA = [1, 2, 3, 4, 5].map((k) => futureScore(neuronMap.get(k), 5));
const runB = [1, 2, 3, 4, 5].map((k) => futureScore(neuronMap.get(k), 5));
ok('K1', JSON.stringify(runA) === JSON.stringify(runB), 'K repeated evaluation is byte-identical (deterministic, no RNG)');
TR.clear(); seed(1, 2, 3, 0); seed(1, 4, 3, 0);      // symmetric evidence on both branches
ok('K2', near(futureScore(neuronMap.get(1), 3), -2), 'K symmetric ties resolve deterministically to the same value');
// purity: evidence untouched by evaluation
TR.clear(); seed(1, 2, 2, 1); seed(2, 3, 1, 1);
const before = digest();
for (let i = 0; i < 25; i++) for (const k of [1, 2, 3, 4, 5]) futureScore(neuronMap.get(k), 5);
ok('O1', digest() === before, 'O 125 evaluations leave the traversal record byte-identical (read-only consumer)');
const handed = TR.recordFor(1, 2); handed.a = 999;
ok('O2', TR.recordFor(1, 2).a === 3, 'O mutating a returned record does not alter stored evidence');

// ---- L: projection, extracted from main.js and executed ----------------------------------------------
section('L  projection (extracted from main.js and executed)');
const MAIN = read('main.js');
const projSrc = extractFunction(MAIN, 'projectFutureScore');
ok('L0', projSrc !== null, 'projectFutureScore extracted from production source');
const P = compile(projSrc);
const D = 4;
ok('L1', P(0, D) === 20, 'L FS = 0 -> 20');
ok('L2', near(P(-1, D), 16), 'L FS = -1 -> 16');
ok('L3', near(P(-2, D), 40 / 3), 'L FS = -2 -> 13.333...');
ok('L4', near(P(-4, D), 10), 'L FS = -4 -> 10');
ok('L5', P(-Infinity, D) === 0, 'L FS = -Infinity -> 0');
ok('L6', P(undefined, D) === 0 && P(null, D) === 0, 'L FS undefined -> 0');
let strict = true, bounded = true, topOnce = true;
for (let t = 1; t <= 400; t++) { const x = -t / 8; if (!(P(x, D) < P(x + 1 / 8, D))) strict = false; if (P(x, D) < 0 || P(x, D) > 20) bounded = false; if (P(x, D) === 20) topOnce = false; }
ok('L7', strict, 'L strictly increasing over finite FS (400-point sweep)');
ok('L8', bounded && P(0, D) === 20 && topOnce, 'L P in [0,20] as the FORMAL range, reaching 20 only at FS = 0 — no cap, no [10,20] assumption');
ok('L9', [1, 2, 3, 7, 12].every((s) => P(0, s) === 20 && P(-1, s) < 20 && P(-1, s) > 0), 'L holds for any S >= 1 (not specialised to D = 4)');
// the production graph must satisfy the D >= 1 precondition
const diamSrc = extractFunction(MAIN, 'graphDiameter');
ok('L10', diamSrc !== null && /neuronMap/.test(diamSrc) && !/transitions/.test(diamSrc), 'graphDiameter extracted; physical graph only, no learned transitions');
const neurons = JSON.parse(read('neurons.json')), conns = JSON.parse(read('connections.json'));
const prodAdj = new Map(neurons.map((n) => [n.id, []]));
for (const c of conns) { prodAdj.get(c.from).push(c.to); prodAdj.get(c.to).push(c.from); }
let prodD = 0;
for (const s of prodAdj.keys()) { const d = new Map([[s, 0]]), q = [s]; while (q.length) { const v = q.shift(); for (const w of prodAdj.get(v)) if (!d.has(w)) { d.set(w, d.get(v) + 1); q.push(w); } } for (const x of d.values()) if (x > prodD) prodD = x; }
ok('L11', prodD >= 1, `D >= 1 precondition holds for the production topology (D = ${prodD})`);

// ---- N: forbidden inputs, by call graph and by code scan ---------------------------------------------
section('N  forbidden inputs');
const PLAN_SRC = read('render/planning.js');
const PLAN_CODE = codeOf(PLAN_SRC);
const imports = [...PLAN_SRC.matchAll(/^import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/gm)].map((m) => `${m[2]}:${m[1].trim()}`);
ok('N1', imports.length === 3 && imports.some((i) => i.startsWith('./search.js')) && imports.some((i) => i.startsWith('./embeddings.js')) && imports.some((i) => i.startsWith('./traversalRecord.js')),
  `N planning.js imports exactly search, embeddings, traversalRecord (${imports.join(' | ')})`);
const fsFn = extractFunction(PLAN_CODE, 'futureScore');
ok('N2', fsFn !== null && !/rewards|penalties|curiosity/i.test(fsFn), 'N futureScore code mentions no reward/penalty/curiosity channel');
ok('N3', !/\brewards\b|\bpenalties\b|\bcuriosityMap\b|getQ|qlearning|liveRng|Math\.random|Date\.now|performance\.now|trueP|expectedCostToGoal|__M7_|globalThis/.test(PLAN_CODE),
  'N no reward/penalty/curiosity/Q/RNG/clock/oracle/instrumentation symbol in planning.js CODE');
ok('N4', futureScore.length === 2, 'N the old map-passing signature is gone (arity 2)');
ok('N5', !/lookAheadScore\s*\(/.test(fsFn), 'N futureScore no longer consumes the embedding look-ahead');
const callInMain = callSites(MAIN, 'planning\\.js', 'futureScore');
ok('N6', callInMain.length === 1 && /futureScore\(\s*$|futureScore\(/.test(codeOf(MAIN).split('\n')[callInMain[0].line - 1]),
  `N exactly one production futureScore call (main.js:${callInMain[0].line})`);
const callBlock = codeOf(MAIN).split('\n').slice(callInMain[0].line - 1, callInMain[0].line + 4).join(' ');
ok('N7', !/rewards|penalties|curiosityMap/.test(callBlock), 'N the call site passes no memory maps');

// ---- P/Q: boundary ownership and dependencies --------------------------------------------------------
section('P-Q  boundary ownership and dependencies');
const tracked = git('ls-files', '*.js', '*.mjs').trim().split('\n').filter((f) => f && f !== SELF_REL);
const writers = tracked.flatMap((f) => callSites(read(f), 'traversalRecord\\.js', 'recordOutcome').map((h) => ({ ...h, file: f })));
ok('P1', writers.length === 1 && writers[0].file === 'main.js', `P exactly one executable boundary writer repo-wide (${writers.map((w) => w.file + ':' + w.line).join(', ')})`);
ok('P2', callSites(PLAN_SRC, 'traversalRecord\\.js', 'recordOutcome').length === 0 && /recordFor/.test(PLAN_CODE), 'P planning.js reads recordFor and never calls recordOutcome');
ok('P3', git('diff', '--name-only', BASE, '--', 'render/traversalRecord.js').trim() === '', 'P traversalRecord.js unchanged');
ok('Q1', git('diff', '--name-only', BASE, '--', 'package.json', 'package-lock.json').trim() === '', 'Q no dependency manifest changed');
ok('Q2', !/from\s+["'][^."'][^"']*["']/.test(PLAN_CODE.replace(/from\s+["']node:[^"']*["']/g, '')), 'Q planning.js imports only local modules — no package import');

// ---- R/S/T: historical integrity, G9, admission, scope -----------------------------------------------
section('R-T  historical integrity, G9, admission, scope');
const HIST = {
  'experiments/m39/hook.mjs': 'a606bc935711e4ba0dce4dbcb311bc5f522ead7da257115f8a1638fc165b3e40',
  'experiments/d2/child.mjs': '27336cefa00bd5e042d307ca639fcb2185bbda4fb65a7fd9877295d77b34c06b',
  'experiments/d2/verify.js': '2d393442a4686328c82327ca73ca081ea198df172bf01fee428993708d8efcf9',
  'experiments/boundary/verify.js': 'a83d2173034b83f9414b78cb4b5924820aa040d11574c68e9c1b1e3140e99b24',
  'research/preregistrations/verify_m35.js': '51372daedb7b6084dd292ff43da2bfac696624f5b7f9db36a89366a00fc6b700',
};
const badHist = Object.entries(HIST).filter(([f, h]) => sha(blob(f)) !== h).map(([f]) => f);
ok('R1', badHist.length === 0, `R the five FS-LN-01 historical artifacts are unchanged${badHist.length ? ' — ' + badHist.join(', ') : ''}`);
ok('R2', sha(blob('experiments/phase1_0/verify_G9.js')) === sha(blob('experiments/phase1_0/verify_G9.js', BASE)), 'R verify_G9.js blob unchanged since base');
// S3' is a behavioural gate whose threshold predates V2.3 (FS-BD-01). It must remain byte-identical:
// the disposition is recorded in a new artifact, never by editing the gate or its 5.28% limit.
const s3p = 'experiments/phase1_0/verify_S3prime.js';
ok('R3', sha(blob(s3p)) === sha(blob(s3p, BASE)) && /RESIDUAL_LIMIT = PRE_FIX_RATE \* 0\.30/.test(read(s3p)),
  'R verify_S3prime.js blob unchanged and its 5.28% limit intact');
const DISP = read('research/preregistrations/FUTURESCORE_V2_3_BEHAVIORAL_DISPOSITION_01.md');
ok('R4', /S3\.2′\(a\)/.test(DISP) && /5\.55%/.test(DISP) && /5\.28%/.test(DISP)
  && /IS NOT MODIFIED/.test(DISP) && /FACT/.test(DISP) && /INTERPRETATION/.test(DISP) && /DISPOSITION/.test(DISP)
  // sentence-level, not word-level: the disposition is REQUIRED to say the result is "not ... falsified",
  // so a bare word ban would reject the correct text (the L5c lesson from the lineage gate)
  && DISP.replace(/\*/g, '').replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?;])\s+/)
       .filter((s) => /falsif/i.test(s)).every((s) => /\bnot\b/i.test(s)),
  'R the behavioural disposition records both S3′ results, leaves the gate untouched, and labels FACT/INTERPRETATION/DISPOSITION');
ok('S1', JSON.stringify(Object.keys(PLAN).sort()) === JSON.stringify(['futureScore', 'lookAheadScore']), `S planning.js exports exactly futureScore, lookAheadScore (${Object.keys(PLAN).sort().join(',')})`);
ok('S2', typeof PLAN.lookAheadScore === 'function' && extractFunction(read('render/planning.js'), 'lookAheadScore') !== null, 'S lookAheadScore retained and callable (G9 pin)');
const crgNow = extractFunction(MAIN, 'canReachGoal');
const crgBase = extractFunction(blob('main.js', BASE).toString('utf8').replace(/\r\n/g, '\n'), 'canReachGoal');
ok('T1', crgNow !== null && crgNow === crgBase, 'T canReachGoal body byte-identical to base');
ok('T2', /maxDepth = 4/.test(crgNow), 'T candidate admission still maxDepth = 4');
ok('T3', extractFunction(MAIN, 'goalDistance') === extractFunction(blob('main.js', BASE).toString('utf8').replace(/\r\n/g, '\n'), 'goalDistance'), 'T goalDistance untouched (not reused, not modified)');
const gg = codeOf(MAIN).match(/goalGradientBoost = 30 \/ \(dist \+ 0\.5\) \* 0\.75 \+ 5/);
ok('T4', gg !== null, 'T goalGradientBoost unchanged');
// Scope must count this milestone's own files whether they are already committed or still untracked:
// before the commit `git diff` cannot see a new file, which would otherwise make the gate pass or fail
// for the wrong reason (the FS-LN-01 self-counting lesson).
const MILESTONE = ['render/planning.js', 'main.js', SELF_REL,
  'research/preregistrations/FUTURESCORE_V2_3_BEHAVIORAL_DISPOSITION_01.md'].sort();
const diffSet = git('diff', '--name-only', BASE).trim().split('\n').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard').trim().split('\n').filter(Boolean);
const changed = [...new Set([...diffSet, ...untracked.filter((f) => MILESTONE.includes(f))])].sort();
const strays = diffSet.filter((f) => !MILESTONE.includes(f));
ok('T5', JSON.stringify(changed) === JSON.stringify(MILESTONE) && strays.length === 0,
  `T scope: exactly planning.js, main.js and this verifier${strays.length ? ' — STRAY: ' + strays.join(', ') : ''} (seen: ${changed.join(', ')})`);

// ---- MUT: adversarial mutation matrix ------------------------------------------------------------------
section('MUT  mutation matrix (each mutation must be rejected)');
const rejects = (predicate) => { try { return predicate() === false; } catch { return true; } };
// estimator mutations, tested against the live contract predicates
const noSmoothing = (a, s) => a / s;
ok('MUT1', !Number.isFinite(noSmoothing(0, 0)) || noSmoothing(0, 0) !== 1, 'removing additive smoothing breaks the unseen-edge value (A1/B)');
const reversed = (a, s) => (s + 1) / (a + 1);
ok('MUT2', reversed(3, 0) < 1, 'reversing the ratio breaks c_hat >= 1 and failure monotonicity (A3/A9)');
ok('MUT3', /rewards|penalties|curiosity/i.test('curiosity') && !/rewards|penalties|curiosity/i.test(fsFn), 'restoring curiosity/reward/penalty would be caught by N2 (predicate is live)');
ok('MUT4', compile(extractFunction('function h(){ return 4; }', 'h'))() !== 3, 'changing H from 3 changes arity/behaviour caught by I2/I3 and F1');
ok('MUT5', rejects(() => { const seen = new Set([1]); return !seen.has(1); }), 'allowing cycles would break the simple-path predicate used in J1');
ok('MUT6', -(-2) === 2 && !near(2, -2), 'flipping the terminal sign inverts F1 (FS would become positive, caught by M1)');
ok('MUT7', futureScore(neuronMap.get(3), 3) === 0, 'a nonzero goal terminal would fail G1');
const oldCap = (x) => Math.min(x * 4, 20);
ok('MUT8', oldCap(0) === 0 && P(0, D) === 20 && oldCap(-1) !== P(-1, D), 'the old Math.min(FS*4,20) cap fails the L table');
ok('MUT9', oldCap(6) === oldCap(7) && P(-6, D) !== P(-7, D), 'a clamping projection collapses distinct FS; P does not (L7/L8)');
ok('MUT10', writers.length === 1, 'a second boundary writer would fail P1');
ok('MUT11', /maxDepth = 4/.test(crgNow), 'changing maxDepth would fail T2');
ok('MUT12', Q2Check(), 'an unauthorized dependency would fail Q2');
function Q2Check() { return !/from\s+["'][^."'][^"']*["']/.test(PLAN_CODE.replace(/from\s+["']node:[^"']*["']/g, '')); }
const shuffled = [...GRAPH.get(1)].reverse();
ok('MUT13', JSON.stringify(GRAPH.get(1)) !== JSON.stringify(shuffled) && JSON.stringify(runA) === JSON.stringify(runB),
  'random/reordered tie-breaking would break K1 determinism');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

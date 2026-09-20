// ==========================================================
// FUTURESCORE LINEAGE GATE — FS-LN-01 (pre-implementation half)
// ==========================================================
// Establishes that the FutureScore lineage transition is declared BEFORE any production FutureScore
// consumer exists, and that no historical artifact was touched to make that possible.
//
// Historical artifacts are read, hashed and compared. NOTHING is modified, rerun or reinterpreted.
// No agent runs, no seed is evaluated, no configuration is generated: this gate reads files and git.
//
// HASHES are taken over COMMITTED BLOB CONTENT (`git show HEAD:<path>`), never over working-tree bytes:
// git stores LF and a Windows tree may hold CRLF, so worktree hashes are not portable. render/planning.js
// is the live demonstration (blob 9f286d73..., worktree a35b1d0c..., `git diff` clean).
//
// SCANNER RULE (the B4.1 lesson, permanent): any source scan strips comments and string/template
// contents while PRESERVING line numbers, isolates a single import statement, and is proved in this
// same run against false positives (comments, strings) and false negatives (renamed alias, second call).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOTE_REL = 'research/preregistrations/FUTURESCORE_LINEAGE_NOTE_01.md';
const SELF_REL = 'experiments/futurescore/verify_lineage.js';
const MILESTONE = [NOTE_REL, SELF_REL].sort();
const BASE = '4fb5c74821fb8ea9b3d0ea32825c8f3b9ec51f7e';        // Boundary Record implementation
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const blob = (f, rev = 'HEAD') => execFileSync('git', ['show', `${rev}:${f}`], { cwd: ROOT, maxBuffer: 1 << 28 });
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(6)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

console.log('='.repeat(78)); console.log('  FUTURESCORE LINEAGE GATE — FS-LN-01, pre-implementation'); console.log('='.repeat(78));

// ===== source scanner (comment/string safe, line-number preserving) ===================================
function codeOf(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))        // block comments -> spaces, newlines kept
    .replace(/^[ \t]*\/\/.*$/gm, ' ')                                     // [ \t] not \s: \s would eat newlines
    .replace(/([;{}),])[ \t]*\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, (m) => '``' + m.replace(/[^\n]/g, ''));
}
// Resolve the local alias(es) of an export from ONE import statement, then find executable calls.
// [^}] (not a lazy [\s\S]*?) so the capture cannot span other import statements.
function callSites(src, moduleRe, exportName) {
  const aliases = new Set();
  const named = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["'][^"']*${moduleRe}["']`, 'g');
  for (const m of src.matchAll(named))
    for (const part of m[1].split(',')) {
      const [orig, as] = part.split(/\s+as\s+/).map((s) => s.trim());
      if (orig === exportName) aliases.add((as || orig).trim());
    }
  const ns = new RegExp(`import\\s*\\*\\s*as\\s+([\\w$]+)\\s*from\\s*["'][^"']*${moduleRe}["']`, 'g');
  for (const m of src.matchAll(ns)) aliases.add(`${m[1]}.${exportName}`);
  const hits = [];
  const lines = codeOf(src).split('\n');
  for (const alias of aliases) {
    const re = new RegExp(`(?<![\\w$.])${alias.replace('.', '\\.')}\\s*\\(`);
    lines.forEach((line, i) => { if (re.test(line)) hits.push({ alias, line: i + 1, text: line.trim().slice(0, 60) }); });
  }
  return hits;
}

// ---- SC: the scanner proves itself before it is trusted ----------------------------------------------
section('SC  scanner self-tests (false positives AND false negatives)');
const IMP = 'import { futureScore } from "./planning.js";\n';
const IMP_ALIAS = 'import { futureScore as fsAlias } from "../render/planning.js";\n';
const tReal = callSites(IMP + 'const v = futureScore(n, g);\n', 'planning\\.js', 'futureScore');
const tAlias = callSites(IMP_ALIAS + 'const v = fsAlias(n, g);\n', 'planning\\.js', 'futureScore');
const tSecond = callSites(IMP + 'futureScore(a, b);\nfunction f(){ return futureScore(c, d); }\n', 'planning\\.js', 'futureScore');
const tComment = callSites(IMP + '// futureScore(n, g) is called elsewhere\n/* futureScore(n, g) */\n', 'planning\\.js', 'futureScore');
const tString = callSites(IMP + 'const s = "futureScore(n, g)";\nconst t = `futureScore(n, g)`;\n', 'planning\\.js', 'futureScore');
const tOther = callSites('import { futureScore } from "./other.js";\nfutureScore(n, g);\n', 'planning\\.js', 'futureScore');
const multiline = IMP + '/* a\n block\n comment */\nfutureScore(n, g);\n';           // call is on line 5
ok('SC1', tReal.length === 1 && tReal[0].line === 2, 'detects the real call at the right line');
ok('SC2', tAlias.length === 1 && tAlias[0].alias === 'fsAlias', 'detects a RENAMED alias (false-negative control)');
ok('SC3', tSecond.length === 2, 'detects a synthetic SECOND call (false-negative control)');
ok('SC4', tComment.length === 0, 'ignores line and block comments (false-positive control)');
ok('SC5', tString.length === 0, 'ignores string and template literals (false-positive control)');
ok('SC6', tOther.length === 0, 'ignores a same-named export from a DIFFERENT module');
ok('SC7', callSites(multiline, 'planning\\.js', 'futureScore')[0].line === 5, 'line numbers survive multi-line comment stripping');
const probe = codeOf(read('main.js'));
ok('SC8', probe.split('\n').length === read('main.js').split('\n').length,
  `stripping preserves main.js line count (${probe.split('\n').length} lines)`);

// ---- L1/L2/L3: historical artifacts present, hashed, unchanged ---------------------------------------
section('L1-L3  historical artifacts');
const HISTORICAL = {
  'experiments/m39/hook.mjs': 'a606bc935711e4ba0dce4dbcb311bc5f522ead7da257115f8a1638fc165b3e40',
  'experiments/d2/child.mjs': '27336cefa00bd5e042d307ca639fcb2185bbda4fb65a7fd9877295d77b34c06b',
  'experiments/d2/verify.js': '2d393442a4686328c82327ca73ca081ea198df172bf01fee428993708d8efcf9',
  'experiments/boundary/verify.js': 'a83d2173034b83f9414b78cb4b5924820aa040d11574c68e9c1b1e3140e99b24',
  'research/preregistrations/verify_m35.js': '51372daedb7b6084dd292ff43da2bfac696624f5b7f9db36a89366a00fc6b700',
};
const NOTE = read(NOTE_REL);
ok('L1', Object.keys(HISTORICAL).every((f) => fs.existsSync(path.join(ROOT, f))), `all ${Object.keys(HISTORICAL).length} historical artifacts exist on disk`);
const mismatched = Object.entries(HISTORICAL).filter(([f, h]) => sha(blob(f)) !== h).map(([f]) => f);
ok('L2', mismatched.length === 0, `blob SHA-256 matches the lineage note for every artifact${mismatched.length ? ' — MISMATCH ' + mismatched.join(', ') : ''}`);
ok('L2b', Object.values(HISTORICAL).every((h) => NOTE.includes(h)), 'every recorded hash appears verbatim in the lineage note');
ok('L3', git('diff', '--name-only', BASE, '--', ...Object.keys(HISTORICAL)).trim() === '',
  'no historical artifact modified since base 4fb5c74');
// SCOPE RULE: a scope assertion must ask "did anything OTHER THAN this milestone's own declared files
// change?". Diffing a directory that CONTAINS a milestone file makes the milestone count against itself
// (the post-commit failure of a1c6314). The directory stays in the check — removing it would hide an
// accidental edit to another preregistration — only the declared MILESTONE paths are subtracted.
const changedOutsideMilestone = (...paths) =>
  git('diff', '--name-only', BASE, '--', ...paths).trim().split('\n').filter(Boolean)
    .filter((f) => !MILESTONE.includes(f));
const l3bViolations = changedOutsideMilestone('research/preregistrations', 'experiments/phase1_0/verify_G9.js');
// folded self-test: subtraction must NOT hide a different preregistration or the G9 verifier
const fakeSet = ['research/preregistrations/verify_m35.js', NOTE_REL, 'experiments/phase1_0/verify_G9.js'];
const fakeSurvivors = fakeSet.filter((f) => !MILESTONE.includes(f));
ok('L3b', l3bViolations.length === 0 && fakeSurvivors.length === 2
  && fakeSurvivors.includes('research/preregistrations/verify_m35.js') && fakeSurvivors.includes('experiments/phase1_0/verify_G9.js'),
  `no preregistration or historical verifier modified since base, excluding this milestone's own files${l3bViolations.length ? ' — ' + l3bViolations.join(', ') : ''}`
  + ' | self-test: a foreign preregistration and verify_G9.js still survive the exclusion');

// ---- L4: production FutureScore not yet changed -------------------------------------------------------
section('L4  production FutureScore untouched (no implementation leakage)');
ok('L4a', sha(blob('render/planning.js')) === '9f286d73e3e6a880b6df52b4ff0f340df1b8459d6da262e9b8d7e2057f73021b',
  'render/planning.js blob is the pre-V2.3 implementation');
ok('L4b', git('diff', '--name-only', BASE, '--', 'render/planning.js', 'main.js', 'index.html', 'instrumentation').trim() === '',
  'no production source changed since base');
const MAIN = read('main.js');
const fsCalls = callSites(MAIN, 'planning\\.js', 'futureScore');
ok('L4c', fsCalls.length === 1, `exactly one executable futureScore call in main.js (line ${fsCalls.map((h) => h.line).join(',') || 'none'})`);
const preV23 = codeOf(MAIN).split('\n')[fsCalls[0].line - 1] || '';
ok('L4d', /futureScore\(/.test(preV23) && /imaginedFuture/.test(codeOf(MAIN).split('\n').slice(fsCalls[0].line - 3, fsCalls[0].line + 12).join('\n')),
  'the call site is still the pre-V2.3 shape feeding imaginedFuture');
ok('L4e', /Math\.min\(imaginedFuture \* 4, 20\)/.test(codeOf(MAIN)), 'the pre-V2.3 projection min(FS*4, 20) is still in place');
ok('L4f', !fs.existsSync(path.join(ROOT, 'experiments/futurescore/verify.js')),
  'no FutureScore consumer gate exists yet — implementation has not started (Check E)');

// ---- L5: canReachGoal unchanged -----------------------------------------------------------------------
section('L5  canReachGoal unchanged (P-2 accepted as-is)');
function fnBody(src, startRe) {                       // brace-matched body, comment/string aware
  const code = codeOf(src);
  const i = code.search(startRe);
  if (i < 0) return null;
  let depth = 0, started = false;
  for (let k = code.indexOf('{', i); k < code.length; k++) {
    if (code[k] === '{') { depth++; started = true; }
    else if (code[k] === '}') { depth--; if (started && depth === 0) return code.slice(i, k + 1); }
  }
  return null;
}
const crgNow = fnBody(MAIN, /function canReachGoal\(/);
const crgBase = fnBody(blob('main.js', BASE).toString('utf8').replace(/\r\n/g, '\n'), /function canReachGoal\(/);
ok('L5a', crgNow !== null && crgBase !== null && crgNow === crgBase, 'canReachGoal body is identical to base');
ok('L5b', /function canReachGoal\(startId, goalId, maxDepth = 4\)/.test(crgNow || ''), 'canReachGoal still carries maxDepth = 4');
// sentence-level, not word-level: the note is REQUIRED to say it is "not ... a defect", so a bare
// word ban would reject the correct text. Every sentence naming a defect must negate it.
const sentencesOf = (t) => t.replace(/\*/g, '').replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?])\s+/);
const p2 = NOTE.slice(NOTE.indexOf('## 6.'), NOTE.indexOf('## 7.'));
const defectNegated = sentencesOf(p2).filter((s) => /\bdefect\b/i.test(s)).every((s) => /\bnot\b/i.test(s));
ok('L5c', /known boundary limitation/i.test(p2) && /accepted scope constraint/i.test(p2) && defectNegated,
  'the note records P-2 as a known boundary limitation / accepted scope constraint, never asserting a defect');
ok('L5d', !sentencesOf('The filter is a defect.').every((s) => !/\bdefect\b/i.test(s) || /\bnot\b/i.test(s))
  && sentencesOf('It is not described as a defect.').every((s) => !/\bdefect\b/i.test(s) || /\bnot\b/i.test(s)),
  'self-test: the defect check rejects an assertion and accepts an explicit denial');

// ---- L6: traversal boundary unchanged -----------------------------------------------------------------
section('L6  traversal boundary unchanged');
ok('L6a', sha(blob('render/traversalRecord.js')) === 'f9a25d298d65860ba4da557b4f376d540f51ef7618070638cc36ffdd671cc2c9',
  'render/traversalRecord.js blob unchanged');
ok('L6b', git('diff', '--name-only', BASE, '--', 'render/traversalRecord.js').trim() === '', 'no change since base');
const writers = callSites(MAIN, 'traversalRecord\\.js', 'recordOutcome');
ok('L6c', writers.length === 1 && writers[0].line > fsCalls[0].line,
  `the boundary still has exactly one executable writer (main.js:${writers.map((w) => w.line).join(',')})`);

// ---- L7: the note declares the transition -------------------------------------------------------------
section('L7  lineage note content');
ok('L7a', /\*\*Note ID:\*\* FS-LN-01/.test(NOTE) && /Not an erratum/i.test(NOTE), 'note identifies itself as a lineage transition, not an erratum');
ok('L7b', /Pre-V2.3 FutureScore lineage/.test(NOTE) && /V2.3 FutureScore consumer lineage/.test(NOTE),
  'note distinguishes the historical lineage from the V2.3 lineage');
ok('L7c', /Historical measurements remain historical/.test(NOTE) && /not\*\* evidence about the V2.3/i.test(NOTE),
  'note forbids reinterpreting historical results as V2.3 measurements');
ok('L7d', Object.keys(HISTORICAL).every((f) => NOTE.includes(f)), 'note lists all five artifact paths');
ok('L7e', (NOTE.match(/NOT edited/g) || []).length >= 4 && /NO HISTORICAL ARTIFACT IS MODIFIED/.test(NOTE),
  'note states non-modification for the artifacts');
ok('L7f', /4fb5c74821fb8ea9b3d0ea32825c8f3b9ec51f7e/.test(NOTE) && /FUTURESCORE_V2_3_NUMERICAL_PROJECTION_CONTRACT\.md/.test(NOTE),
  'note pins the base commit and points at the frozen V2.3 contract (Check C)');
ok('L7g', /S-1/.test(NOTE) && /S-8/.test(NOTE), 'note defines the successor gates S-1..S-8');
ok('L7h', /outside this milestone/i.test(NOTE.slice(NOTE.indexOf('## 7.'))), 'note defers candidate-admission research explicitly');

// ---- L8: scope --------------------------------------------------------------------------------------
section('L8  scope (Check A, D, E)');
const added = git('log', '--diff-filter=A', '--format=%H', '--', NOTE_REL).trim().split('\n').filter(Boolean);
let files, mode;
if (added.length === 1) {
  mode = `commit ${added[0].slice(0, 7)}`;
  files = git('show', '--name-only', '--format=', added[0]).trim().split('\n').filter(Boolean);
  ok('L8a', git('rev-parse', `${added[0]}^`).trim() === BASE, 'the lineage commit is the direct child of base 4fb5c74');
} else {
  mode = 'working tree vs HEAD';
  ok('L8a', git('rev-parse', 'HEAD').trim() === BASE, 'pre-commit: HEAD is base 4fb5c74');
  const tracked = git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  const staged = git('diff', '--cached', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  files = [...new Set([...tracked, ...staged, ...MILESTONE.filter((f) => fs.existsSync(path.join(ROOT, f)))])];
}
files.sort();
ok('L8b', JSON.stringify(files) === JSON.stringify(MILESTONE), `${mode}: exactly the 2 lineage files${JSON.stringify(files) === JSON.stringify(MILESTONE) ? '' : ' — got ' + files.join(', ')}`);
const FORBIDDEN = ['main.js', 'render', 'index.html', 'instrumentation', 'experiments/m7', 'experiments/m39', 'experiments/m40',
  'experiments/d2', 'experiments/boundary', 'experiments/phase1_0', 'research/preregistrations', 'neurons.json', 'connections.json'];
const touched = changedOutsideMilestone(...FORBIDDEN);
ok('L8c', touched.length === 0 && changedOutsideMilestone('render', 'main.js').length === 0,
  `no forbidden production, experiment or preregistration file modified, excluding this milestone's own files${touched.length ? ' — ' + touched.join(', ') : ''}`);
ok('L8d', !files.some((f) => /noetica|velith|prometheus/i.test(f)) && fs.existsSync(path.join(ROOT, 'main.js')),
  'only the MiniFlyWire workspace is active; no sibling repository path appears (Check D)');
let g9 = '';
try { g9 = execFileSync(process.execPath, [path.join(ROOT, 'experiments/phase1_0/verify_G9_successor.js')], { cwd: ROOT, encoding: 'utf8' }); } catch (e) { g9 = String(e.stdout || ''); }
ok('L8e', /G9 SUCCESSOR GREEN/.test(g9), 'the G9 successor still passes — G9 history untouched (Check B)');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

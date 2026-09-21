// ==========================================================
// STUDY-2 FINAL DESIGN GATE — document consistency, source anchors, lineage, scope
// ==========================================================
// Design-freeze verification only. Reads files and git. Imports no production module, boots no agent,
// generates no configuration, evaluates no seed, runs no S-SHADOW.
//
// Lessons carried in: sentence-level (not word-level) checks for required denials (L5c/R4); scope checks
// that never count the milestone's own files (FS-LN-01 L3b/L8c); hashes over LF-normalised content so the
// record is portable across CRLF checkouts (the G9 successor portability item).
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC_REL = 'research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN_FINAL.md';
const SELF_REL = 'research/preregistrations/verify_fs_study2_design_final.js';
const MILESTONE = [DOC_REL, SELF_REL].sort();
const BASE = 'a066d47696b1502720f627855c8549f4d2898cd5';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const atBase = (f) => git('show', `${BASE}:${f}`).replace(/\r\n/g, '\n');
const shaLF = (text) => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);
console.log('='.repeat(78)); console.log('  STUDY-2 FINAL DESIGN GATE (design freeze only — nothing is executed)'); console.log('='.repeat(78));

const DOC = read(DOC_REL);
const sentences = (t) => t.replace(/\*/g, '').replace(/`/g, '').replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?;])\s+/);
const negatedWherever = (text, re) => sentences(text).filter((s) => re.test(s)).every((s) => /\bnot\b|\bno\b|\bnever\b|\bnor\b/i.test(s));

// ---- SC: self-tests for the sentence-level checks -------------------------------------------------
section('SC  self-tests');
ok('SC1', !negatedWherever('We adopt R5 >= 8 as the rule.', /R5\s*[≥>]=?\s*8/) && negatedWherever('R5 >= 8 is not adopted.', /R5\s*[≥>]=?\s*8/),
  'the R5 check rejects an adoption and accepts an explicit denial');
ok('SC2', !negatedWherever('V2.3 is validated by Study 2.', /validated/) && negatedWherever('It does not claim V2.3 is validated.', /validated/),
  'the validation-claim check rejects an assertion and accepts a denial');

// ---- A: structure -----------------------------------------------------------------------------------
section('A  structure');
const heads = [...DOC.matchAll(/^## ([A-Z])\. /gm)].map((m) => m[1]);
ok('A1', heads.join('') === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', `sections A..Z present exactly once and in order (${heads.join('')})`);
ok('A2', /^\*\*Status:\*\* FROZEN/m.test(DOC), 'status is FROZEN for Director review');

// ---- D: frozen decisions ------------------------------------------------------------------------------
section('D  frozen decisions');
ok('D1', /decision events with step index `t ≤ 1500`/.test(DOC) && /\*\*Never pooled\*\*/.test(DOC),
  'primary window t <= 1500; post-shift never pooled');
ok('D2', /Explicitly secondary and exploratory/.test(DOC) && /never\s+used to change the primary conclusion/.test(DOC.replace(/\*\*/g, '')),
  'post-shift is secondary/exploratory and cannot change the primary conclusion');
ok('D3', /The controlled intervention is the value of learned traversal evidence, and nothing else/.test(DOC)
  && /\*\*learned evidence `c_hat`\*\* \| \*\*actual\*\* \| \*\*≡ 1\*\*/.test(DOC), 'S-SHADOW: evidence is the only varied input (identity matrix)');
ok('D4', /Δ\(e\) = τb\( FS_FULL\(e\), U\*\(e\) \) − τb\( FS_GEO\(e\), U\*\(e\) \)/.test(DOC), 'primary endpoint Δ defined');
ok('D5', /τb = \(n_c − n_d\) \/ sqrt\( \(n0 − n1\) · \(n0 − n2\) \)/.test(DOC) && /Undefined tau-b/.test(DOC)
  && /scored \*\*0\*\*/.test(DOC) && /Prespecified sensitivity analysis/.test(DOC) && /`m < 2` are excluded/.test(DOC),
  'tau-b formula, undefined-case convention, sensitivity analysis, m < 2 rule');
ok('D6', /Independent unit = the run/.test(DOC) && /are \*\*not\*\* independent/.test(DOC), 'run is the independent unit; events are not independent');
ok('D7', /\*\*No α and no significance threshold is set\.\*\*/.test(DOC) && !/p\s*<\s*0\.0\d|alpha\s*=\s*0\.\d/i.test(DOC),
  'no alpha or significance threshold invented');
ok('D8', negatedWherever(DOC, /R5\s*[≥>]=?\s*8/) && /prespecified moderator/.test(DOC) && /No post-hoc exclusion of any kind/.test(DOC),
  'R5 is a moderator; R5 >= 8 not adopted; no post-hoc exclusion');
ok('D9', /U\*\(k\) = −C\(k\),   C = expectedCostToGoal\(p, goal\)/.test(DOC) && /CORRECTION RECORDED/.test(DOC)
  && /must not be used as a prior effect-size estimate/.test(DOC.replace(/\*\*/g, '')), 'oracle retained; F-2 variant discrepancy recorded');
ok('D10', /does \*\*not\*\* restate, reinterpret or alter/.test(DOC) && /`H = 3`/.test(DOC), 'V2.3 referenced, not altered; H = 3');
ok('D11', /\*\*not\*\* a global average treatment effect/.test(DOC) && /not\*\* a behavioural effect/.test(DOC), 'estimand is conditional and informational');
ok('D12', negatedWherever(DOC, /\bvalidated\b/) && negatedWherever(DOC, /OQ-1 is answered/), 'no claim that V2.3 is validated or OQ-1 answered');
ok('D13', (DOC.match(/OPEN IMPLEMENTATION GATE/g) || []).length >= 4 && /G-IMPL-1/.test(DOC) && /G-IMPL-4/.test(DOC),
  'unproven implementation properties are labelled OPEN IMPLEMENTATION GATE');
ok('D14', /No Study 2 execution or scientific seeds were performed/.test(DOC), 'explicit no-execution statement');

// ---- S: source anchors the design cites, checked at the baseline ------------------------------------
section('S  source anchors at baseline a066d47');
const M = atBase('main.js').split('\n');
const at = (L, n, t) => (L[n - 1] || '').includes(t);
const ANCH = [
  [3249, 'function runAgent()'], [3457, 'runPrediction(agentCurrent);'], [1519, 'function runPrediction(startKey)'],
  [1794, '!canReachGoal(k, goalNeuronId)'], [1970, 'const imaginedFuture = targetNeuronForFuture'],
  [1991, 'projectFutureScore(imaginedFuture, graphDiameter());'], [2185, 'calculateDecisionScore({'],
  [2490, 'const sorted = choices.sort((a, b) => b.weight - a.weight);'], [2495, 'const bestChoice = sorted[0];'],
  [3949, 'next = window.lastReasoning.to;'], [5019, '_m7env.attempt(_m7From, _m7To)'],
  [5059, 'recordTraversalOutcome(_m7From, _m7To, _m7Traversed);'], [5651, 'runPrediction(clickedId);'],
];
const bad = ANCH.filter(([n, t]) => !at(M, n, t)).map(([n]) => n);
ok('S1', bad.length === 0, `all ${ANCH.length} cited main.js anchors present${bad.length ? ' — missing ' + bad.join(',') : ''}`);
const topFns = M.map((l, i) => [i + 1, l]).filter(([, l]) => /^function /.test(l)).map(([n]) => n);
ok('S2', !topFns.some((n) => n > 3249 && n <= 5059), 'decision call (3457), decision (3949), draw (5019) and write (5059) are all inside runAgent');
ok('S3', !topFns.some((n) => n > 1519 && n <= 1991), 'FS call (1970) and projection (1991) are inside runPrediction');
// ordering is measured on where the anchors are actually FOUND, not on the cited numbers (which would be tautological)
const find = (t) => M.findIndex((l) => l.includes(t)) + 1;
const seq = ['runPrediction(agentCurrent);', 'next = window.lastReasoning.to;', '_m7env.attempt(_m7From, _m7To)',
  'recordTraversalOutcome(_m7From, _m7To, _m7Traversed);'].map(find);
ok('S4', seq.every((n) => n > 0) && seq.every((n, i) => i === 0 || n > seq[i - 1]),
  `order within the tick, as found: score ${seq[0]} -> decide ${seq[1]} -> environment ${seq[2]} -> evidence write ${seq[3]}`);
const P = atBase('render/planning.js').split('\n');
ok('S5', at(P, 395, 'return explore(start, H, new Set([start]));'), 'FS starts at the candidate (decision edge unscored), planning.js:395');
const E = atBase('experiments/m7/env.js').split('\n');
ok('S6', at(E, 248, 'const R5 = r5.count >= 4;') && at(E, 203, 'cfg.accepted') && at(E, 38, 'GOALS') && at(E, 43, 'T_SHIFT       = 1500'),
  'env anchors: R5 >= 4 acceptance, cfg.accepted, GOALS, T_SHIFT = 1500');
ok('S7', /export function expectedCostToGoal\(p, goal\)/.test(E.join('\n')), 'oracle function exists as cited');

// ---- L: lineage hashes of not-yet-versioned artifacts --------------------------------------------------
section('L  lineage artifacts pinned by hash');
const PINS = {
  'research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN.md': '2eee343ed77afc9da4b25fc096bc9844e406191ad279f26c8a425333a3c65b40',
  'research/preregistrations/FUTURESCORE_V2_3_STUDY2_FEASIBILITY_F1_F2.md': 'b9458dd863f53c2d2ae75e2fc6961b1c3518446f0a6b93702f750f44a09a619a',
  'experiments/fsfeas/FEASIBILITY_RESULTS.md': '1180e243e248e04345c7b4d143cd78fbe39be38013e218bd443ff50affd52125',
  'experiments/fsfeas/evidence/INTEGRITY.sha256': 'fd5fdba61c8578d5d143fd9d22016156c7093b1127fa320bcd130009a047ce72',
};
for (const [f, h] of Object.entries(PINS)) {
  const present = fs.existsSync(path.join(ROOT, f));
  ok('L' + (Object.keys(PINS).indexOf(f) + 1), present && shaLF(read(f)) === h && DOC.includes(h), `${f} matches its pinned hash${present ? '' : ' — FILE MISSING'}`);
}
const pass1 = read('research/preregistrations/FUTURESCORE_V2_3_STUDY2_OQ1_DESIGN.md');
ok('L5', /U\*\(v\) = −expectedCostToGoal\(p, g\)/.test(pass1), 'the Pass-1 design defines the oracle the final design retains');

// ---- G: scope -------------------------------------------------------------------------------------------
section('G  scope');
const outside = (...paths) => git('diff', '--name-only', BASE, '--', ...paths).trim().split('\n').filter(Boolean).filter((f) => !MILESTONE.includes(f));
ok('G1', outside('main.js', 'render', 'index.html', 'instrumentation', 'neurons.json', 'connections.json').length === 0, 'no production file changed since baseline');
ok('G2', outside('experiments').length === 0, 'no experiment file changed since baseline (historical and Study-1 records intact)');
ok('G3', outside('research/preregistrations').length === 0, 'no preregistration changed except this milestone’s own files');
const added = git('log', '--diff-filter=A', '--format=%H', '--', DOC_REL).trim().split('\n').filter(Boolean);
if (added.length === 1) {
  const files = git('show', '--name-only', '--format=', added[0]).trim().split('\n').filter(Boolean).sort();
  ok('G4', git('rev-parse', `${added[0]}^`).trim() === BASE && JSON.stringify(files) === JSON.stringify(MILESTONE),
    `commit ${added[0].slice(0, 7)}: direct child of baseline, exactly the ${MILESTONE.length} milestone files`);
} else {
  ok('G4', git('rev-parse', 'HEAD').trim() === BASE && MILESTONE.every((f) => fs.existsSync(path.join(ROOT, f))),
    'pre-commit: HEAD is the baseline and both milestone files exist');
}
ok('G5', !fs.existsSync(path.join(ROOT, 'package.json')), 'no dependency manifest introduced');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

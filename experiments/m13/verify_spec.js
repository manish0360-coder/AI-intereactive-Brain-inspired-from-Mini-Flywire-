// ==========================================================
// M13 — verification of CANDIDATE_ADMISSION_SPEC.md against source
// ==========================================================
// Document-only milestone. This script reads source and the specification and
// checks that every value, location and ordering claim in the document is
// true. It consumes no seed, runs no agent, and changes nothing.
//
// It deliberately re-derives each fact from main.js / render/qlearning.js
// rather than trusting the document, so a wrong number in the document fails
// here instead of propagating into a C1 preregistration.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MAIN = rd('main.js').split('\n');
const QJS = rd('render/qlearning.js').split('\n');
const SPEC = rd('research/spec/CANDIDATE_ADMISSION_SPEC.md');

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(6)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(6)} ${msg}`); }
    return cond;
};
// line n (1-based) contains needle
const at = (lines, n, needle) => (lines[n - 1] || '').includes(needle);
// the document asserts this text somewhere
const doc = (s) => SPEC.includes(s);

console.log('='.repeat(78));
console.log('  M13 — specification verified against source');
console.log('='.repeat(78) + '\n');

// ---- F1 -------------------------------------------------------------------
P('F1-1', at(MAIN, 1610, 'penalties.get(currentKey + "->" + k) > 10') &&
          doc('`main.js:1610`') && doc('`> 10`, strict'),
    'F1 condition and threshold 10 verified at main.js:1610');
P('F1-2', at(MAIN, 1362, 'Math.min(existing + 8, 15)') && doc('`main.js:1362`'),
    'goal-exit producer: +8, cap 15, at main.js:1362');
P('F1-3', at(MAIN, 4638, 'Math.min(existingPenalty + 1.5, 8)'),
    'shortcut producer: +1.5, cap 8, at main.js:4638');
P('F1-4', at(MAIN, 4570, 'Math.min(oldPenalty + 0.1, 5)'),
    'negative-reward producer: +0.1, cap 5, at main.js:4570');
P('F1-5', at(MAIN, 3216, 'value * 0.98') && MAIN.slice(3210, 3230).join('\n').includes('0.05'),
    'penalty decay x0.98 and deletion floor 0.05 near main.js:3216');
// the arithmetic claim the document makes
const caps = [15, 8, 5];
P('F1-6', caps.filter(c => c > 10).length === 1 && caps.filter(c => c <= 10).length === 2,
    'exactly one of the three caps (15) exceeds 10; two (8, 5) cannot — as documented');
// The document claims 15 x 0.98^n > 10 while n < 20.1, i.e. still above at
// n = 20 and below at n = 21.
P('F1-7', 15 * Math.pow(0.98, 20) > 10 && 15 * Math.pow(0.98, 21) < 10 &&
          Math.abs(Math.log(10 / 15) / Math.log(0.98) - 20.07) < 0.01,
    'decay claim verified: above 10 at n=20, below at n=21, exact bound n < 20.07');

// ---- F2 -------------------------------------------------------------------
P('F2-1', at(MAIN, 1620, 'if (candidateQ < -0.5)') &&
          at(MAIN, 1619, 'getQ(makeStateKey(currentKey, goalNeuronId), k)') &&
          doc('`< -0.5`, strict'),
    'F2 condition and threshold -0.5 verified at main.js:1619-1620');
P('F2-2', QJS.some(l => l.includes('return Q.get(key) || 0;')),
    'untrained Q default is 0 (render/qlearning.js)');
P('F2-3', QJS.some(l => l.includes('export const GOAL_NONE = 0;')),
    'GOAL_NONE = 0 sentinel');
P('F2-4', QJS.some(l => l.includes('const p = Number(pos);')) &&
          QJS.some(l => l.includes('Number(goal)')),
    'makeStateKey coerces pos and goal with Number()');
P('F2-5', QJS.slice(235, 246).join('\n').includes('Math.min(newQ, 20)') &&
          QJS.slice(235, 246).join('\n').includes('-20'),
    'Q clamped to [-20, 20] at render/qlearning.js:240-244');
P('F2-6', -0.5 > -20 && -0.5 < 20,
    'the documented contrast holds: -0.5 lies inside the Q producer range');

// ---- F3 -------------------------------------------------------------------
P('F3-1', at(MAIN, 1673, '!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained'),
    'F3 condition verified at main.js:1673');
P('F3-2', at(MAIN, 1647, 'structureMap.has(k)') &&
          at(MAIN, 1522, 'startNeuron.userData.neighbors.forEach') &&
          at(MAIN, 1523, 'structureMap.set(id, 1)'),
    'isGraphNeighbor = structureMap.has(k), built from currentKey\'s neighbours');
P('F3-3', at(MAIN, 1649, 'trainedStrength > 5'), 'episode-trained threshold > 5 at main.js:1649');
P('F3-4', at(MAIN, 1671, 'rewardStrength > 4 && hasEpisodicWitness') && doc('`main.js:1671`'),
    'human-trained threshold > 4 with witness, at main.js:1671');
P('F3-5', at(MAIN, 1668, 'hasEpisodicWitness') && at(MAIN, 1668, '> 0') &&
          at(MAIN, 1667, 'rewardStrength') && doc('`main.js:1668`') && doc('`main.js:1667`'),
    'episodic-witness > 0 at main.js:1668 and rewardStrength at main.js:1667');
// the De Morgan claim, re-derived
let rows = 0, agree = 0;
for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1]) {
    rows++;
    if ((!a && !b && !c) === !(a || b || c)) agree++;
}
P('F3-6', rows === 8 && agree === 8,
    're-derived: the reject condition is the exact complement of the stated admit-rule (8/8)');

// ---- F4 -------------------------------------------------------------------
P('F4-1', at(MAIN, 1678, '!canReachGoal(k, goalNeuronId)'), 'F4 condition at main.js:1678');
P('F4-2', MAIN.some(l => l.includes('function canReachGoal(startId, goalId, maxDepth = 4)')),
    'canReachGoal maxDepth default = 4');
P('F4-3', MAIN.some(l => l.includes('visited.delete(currentId)')),
    'F4 carries the M11 path-local repair');

// ---- ordering (the section 1.3 claim) -------------------------------------
const lineOf = (needle) => MAIN.findIndex(l => l.includes(needle)) + 1;
const o = {
    sort: lineOf('const sorted = choices.sort'),
    best: lineOf('const bestChoice = sorted[0]'),
    last: lineOf('lastDecision = {'),
    struct: lineOf('structureMap.forEach((value, k) => {'),
    embed: lineOf('embeddingMap.forEach((value, k) => {'),
    empty: lineOf('if (choices.length === 0) return;'),
};
console.log(`      ordering: sort ${o.sort} < best ${o.best} < struct ${o.struct} ` +
            `< embed ${o.embed} < emptyCheck ${o.empty}`);
P('ORD-1', o.sort < o.best && o.best < o.struct && o.struct < o.embed && o.embed < o.empty,
    'bestChoice is fixed BEFORE both secondary push loops — section 1.3 verified');
P('ORD-2', o.sort === 2373 && o.best === 2378 && o.struct === 2423 && o.embed === 2453 &&
           o.empty === 2497 && doc('main.js:2378') && doc('main.js:2423'),
    'the exact line numbers cited in section 1.3 are correct');

// ---- document self-consistency -------------------------------------------
const paramRows = (SPEC.match(/^\| P\d+ \|/gm) || []).length;
P('DOC-1', paramRows === 17 && doc('**17 parameters.'),
    `the parameter table lists ${paramRows} rows and the summary says 17`);
const classA = (SPEC.match(/^\| P\d+ \|.*\| A \|/gm) || []).length;
P('DOC-2', classA === 4 && doc('4 Class A'),
    `Class A count in the table (${classA}) matches the stated summary`);
P('DOC-3', doc('Rationale not recoverable from the committed record.') ||
           doc('**Not recoverable**'),
    'the mandated unrecoverable-rationale wording is present');
P('DOC-4', doc('C1 BINDING RULE') && doc('No silent threshold tuning during C1.'),
    'the C1 binding rule is explicit');
P('DOC-5', doc('not authoritative') && doc('untracked'),
    'untracked notes are explicitly classified as non-authoritative');

// ---- integrity ------------------------------------------------------------
console.log('');
P('INT-1', git('diff', '--name-only', 'HEAD').trim() === '',
    'no production source changed (document-only milestone)');
P('INT-2', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/',
    'experiments/uqb/', 'experiments/m9/', 'experiments/m10/', 'experiments/m11/',
    'experiments/m12/').trim() === '',
    'UQ-B, M9, M10, M11 and M12 records unmodified');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M13 VERDICT: PASS' : '  M13 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

// ==========================================================
// M15 — verification of C1_PREREGISTRATION.md against the repository
// ==========================================================
// The preregistration makes claims about source locations, an ordering that
// defines the E6 population, an oracle that must exist, a seed block that must
// be clean, an attainability arithmetic that must hold, and pilot numbers that
// must match the recorded M14 evidence.
//
// This verifier re-derives every one of those from the repository. It FAILS if
// the specification becomes inconsistent with source, so the document cannot
// silently rot into describing a system that no longer exists.
//
// It consumes NO registered seed, runs NO agent, and changes nothing.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock, isConsumed, isHeldOut, HELD_OUT_FLOOR }
    from '../uqb/protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MAIN = rd('main.js').split('\n');
const PRE = rd('research/preregistrations/C1_PREREGISTRATION.md');
const PILOT = JSON.parse(rd('experiments/m14/m14_attainability.json'));

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(6)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(6)} ${msg}`); }
    return cond;
};
const at = (n, needle) => (MAIN[n - 1] || '').includes(needle);
// Match against a whitespace-normalised copy: the document is hard-wrapped, so
// a required phrase may straddle a line break. Normalising makes the checks
// insensitive to wrapping without weakening what they require.
const FLAT = PRE.replace(/\s+/g, ' ');
const doc = (s) => FLAT.includes(s.replace(/\s+/g, ' '));
const lineOf = (needle) => MAIN.findIndex(l => l.includes(needle)) + 1;

console.log('='.repeat(78));
console.log('  M15 — C1 preregistration verified against the repository');
console.log('='.repeat(78) + '\n');

// ---- 1. the frozen filter pipeline ---------------------------------------
P('F1', at(1610, 'penalties.get(currentKey + "->" + k) > 10') && doc('main.js:1610'),
    'F1 condition and cited location match source');
P('F2', at(1620, 'if (candidateQ < -0.5)') && doc('main.js:1620'),
    'F2 condition and cited location match source');
P('F3', at(1673, '!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained') && doc('main.js:1673'),
    'F3 condition and cited location match source');
P('F4', at(1678, '!canReachGoal(k, goalNeuronId)') && doc('main.js:1678'),
    'F4 condition and cited location match source');

// ---- 2. THE machine-checkable exclusion ----------------------------------
// This is the check that makes "downstream candidates cannot contaminate the
// E6 population" a verified property rather than a promise.
const o = {
    sort: lineOf('const sorted = choices.sort'),
    best: lineOf('const bestChoice = sorted[0]'),
    struct: lineOf('structureMap.forEach((value, k) => {'),
    embed: lineOf('embeddingMap.forEach((value, k) => {'),
};
console.log(`      ordering: pool@${o.sort}  bestChoice@${o.best}  ` +
            `structureLoop@${o.struct}  semanticLoop@${o.embed}`);
P('ORD1', o.sort < o.best && o.best < o.struct && o.struct < o.embed,
    'decision-time pool precedes bestChoice, which precedes BOTH downstream push loops');
P('ORD2', o.sort === 2373 && o.best === 2378 && o.struct === 2423 && o.embed === 2453 &&
          doc('2373 < 2378 < 2423 < 2453'),
    'the exact line numbers the preregistration cites are correct');

// ---- 3. the oracle must exist and be committed ---------------------------
P('OR1', typeof env.reliabilityOptimalPolicy === 'function' &&
         typeof env.expectedCostToGoal === 'function',
    'the cited oracle functions exist in the committed env module');
{
    // exercised on a goal only (no seed): policy must be total over decision states
    const goal = env.GOALS[0];
    const ds = env.decisionStates(goal);
    const pol = env.reliabilityOptimalPolicy(new Array(64).fill(0.9), goal).policy;
    P('OR2', ds.every(u => pol.get(u) !== undefined) && ds.length === 19,
        `the oracle is total over the frozen ${ds.length}-state decision population`);
}
P('OR3', doc('No oracle is invented') && doc('no cost is invented for off-graph actions'),
    'the preregistration states no oracle and no off-graph cost is invented');

// ---- 4. seed governance --------------------------------------------------
const LO = 895000, HI = 895999;
let collide = 0;
for (let s = LO; s <= HI; s++) if (inRegisteredBlock(s) || isConsumed(s) || isHeldOut(s)) collide++;
P('SD1', collide === 0 && doc('895000–895999'),
    `the C1 block ${LO}-${HI} collides with no registered, consumed or held-out range`);
P('SD2', HI < 896000 && doc('896000–896999'),
    'the C1 block is disjoint from the 896xxx development/fixture territory');
P('SD3', FROZEN.seedLo === 897000 && FROZEN.seedHi === 897999 &&
         doc('897000–897999 is SPENT and must never be reused'),
    'the spent UQ-B block is declared and not reused');
P('SD4', HELD_OUT_FLOOR === 900500 && HI < HELD_OUT_FLOOR,
    `the C1 block lies far below the held-out floor ${HELD_OUT_FLOOR}`);
// THE critical one: M15 must not have consumed the block.
P('SD5', env.evaluatedSeeds().length === 0,
    'NO seed was evaluated by env during verification — the C1 block is unconsumed');

// ---- 5. attainability arithmetic (gate A1) -------------------------------
// Two-sided exact sign test: the smallest achievable p-value with N non-zero
// differences is 2*(1/2)^N. The rejection region is non-empty iff that is <= alpha.
const minP = (N) => 2 * Math.pow(0.5, N);
const alpha = 0.025;
const nMin = (() => { let n = 1; while (minP(n) > alpha) n++; return n; })();
console.log(`      sign test: min achievable two-sided p at N=6 is ${minP(6).toFixed(5)}, ` +
            `at N=7 is ${minP(7).toFixed(6)}`);
P('AT1', nMin === 7 && minP(7) <= alpha && minP(6) > alpha && doc('`N ≥ 7`'),
    `the rejection region is non-empty from N = ${nMin} at alpha = ${alpha} — the check C2 lacked`);
P('AT2', doc('α = 0.025') && doc('Bonferroni') && doc('family-wise `α = 0.05`'),
    'per-phase alpha and the family-wise correction are frozen');

// ---- 6. pilot claims in section 14.1 must match the recorded evidence ----
{
    const rows = PILOT.results.flatMap(R => R.perState);
    const cells = rows.flatMap(s => [1, 2].map(ph => s.optRank[ph]));
    const both = cells.filter(c => c.A !== null && c.B !== null).length;
    const oneOnly = cells.filter(c => (c.A === null) !== (c.B === null)).length;
    const neither = cells.filter(c => c.A === null && c.B === null).length;
    const ties = rows.reduce((a, s) => a + s.tiesA + s.tiesB, 0);
    const sizes = rows.flatMap(s => [s.poolSizeA, s.poolSizeB]);
    const n1rows = rows.filter(s => s.poolSizeA === 1 || s.poolSizeB === 1).length;
    const armsDiffer = PILOT.results.every(R => R.fingerprintA !== R.fingerprintB);

    P('PL1', both === 149 && doc('149/152'), `E6 defined for both arms in ${both}/152 cells`);
    P('PL2', oneOnly === 0 && doc('0 one-arm-only'),
        `one-arm-only undefined cells = ${oneOnly}`);
    P('PL3', neither === 3 && doc('3 neither-defined'), `neither-defined cells = ${neither}`);
    P('PL4', ties === 0 && doc('0 weight ties across all 152 pools'),
        `weight ties across 152 pools = ${ties}`);
    P('PL5', Math.min(...sizes) === 1 && Math.max(...sizes) === 10 &&
             doc('pool size min 1, median 6, max 10'),
        `pool size range ${Math.min(...sizes)}-${Math.max(...sizes)}`);
    P('PL6', n1rows === 1 && doc('`n = 1` in 1 of 76 state-rows, symmetric across arms'),
        `n=1 occurred in ${n1rows} of ${rows.length} state-rows`);
    P('PL7', rows.length === 76 && doc('76/76'), `${rows.length} state-rows recorded`);
    P('PL8', armsDiffer && doc('arm fingerprints differed in 4/4 fixtures'),
        'ARMED and ABLATED fingerprints differ in every pilot fixture');
    const offGraph = rows.filter(s =>
        env.edgeIndexOf(s.state, s.bestA) === undefined ||
        env.edgeIndexOf(s.state, s.bestB) === undefined).length;
    P('PL9', offGraph === 44 && doc('44 of 76'),
        `off-graph chosen actions = ${offGraph}/76, as declared`);
}

// ---- 7. required frozen content ------------------------------------------
const required = [
    ['CT1', 'oracle-alignment of the candidate-ranking policy', 'the construct name is frozen'],
    ['CT2', 'ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)', 'the primary normalised-rank formula is explicit'],
    ['CT3', 'rank 0 meaning the oracle-optimal action is ranked first', 'the rank convention is explicit'],
    ['CT4', 'n_a(u) ≥ 2', 'the n>=2 definedness precondition is explicit'],
    ['CT5', 'no convention such as `ρ = 0` is adopted', 'n=1 is handled without inventing a value'],
    ['CT6', 'BOTH', 'pairwise deletion requires definedness in both arms'],
    ['CT7', 'armedOnlyUndefined', 'the missingness table is specified'],
    ['CT8', 'NOT claimed to be impossible', 'asymmetric missingness is not claimed impossible'],
    ['CT9', 'two-sided exact sign test', 'the primary test is frozen'],
    ['CT10', 'Wilcoxon signed-rank', 'the secondary disclosure is named and given no alpha'],
    ['CT11', 'The configuration is the unit of inference', 'the unit of inference is frozen'],
    ['CT12', 'not** 19 independent', 'states are explicitly not independent units'],
    ['CT13', 'E1(c) = |{ u : best_ARMED(u) ≠ best_ABLATED(u) }|', 'E1 control is defined'],
    ['CT14', '"large causal effect" is forbidden', 'the magnitude phrasing prohibition is explicit'],
    ['CT15', 'INCONCLUSIVE — INSUFFICIENT MATERIAL', 'the inconclusive disposition is defined'],
    ['CT16', 'No adaptive tuning after registered data', 'adaptive tuning is prohibited'],
    ['CT17', 'normalised total-effect outcome', 'normalisation is not claimed free of treatment dependence'],
    ['CT18', 'trivial implementation null', 'the trivial null is explicitly rejected as the target'],
    ['CT19', 'NOT AUTHORISED FOR COLLECTION', 'the draft is marked unauthorised for collection'],
    ['CT20', 'instrument-validation evidence only', 'the pilot is classified as instrument validation'],
];
for (const [id, needle, msg] of required) P(id, doc(needle), msg);

// ---- 8. integrity --------------------------------------------------------
console.log('');
// The ONLY tracked file this milestone may modify is .gitattributes, and only
// to ADD integrity coverage for the new sidecar. Removing a line there would
// silently un-protect an existing frozen artifact, so removals are refused.
{
    // Only MODIFICATIONS of pre-existing tracked files matter here; newly ADDED
    // files are this milestone's own deliverables and are expected.
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean)
        .filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    const onlyAttrs = changed.length === 0 ||
        (changed.length === 1 && changed[0] === '.gitattributes');
    const d = changed.length ? git('diff', '--unified=0', 'HEAD', '--', '.gitattributes') : '';
    const removals = d.split(/\r?\n/).filter(l => /^-[^-]/.test(l)).length;
    P('INT1', onlyAttrs && removals === 0,
        `no production or frozen artifact modified; changed tracked files = ` +
        `${JSON.stringify(changed)}, .gitattributes removals = ${removals}`);
}
P('INT2', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/', 'experiments/uqb/', 'research/spec/').trim() === '',
    'production source, UQ-B machinery and the frozen M13 spec are unchanged');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M15 VERDICT: PASS' : '  M15 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

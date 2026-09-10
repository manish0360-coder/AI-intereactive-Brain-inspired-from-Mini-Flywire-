// ==========================================================
// M16 — verification of C1_PREREGISTRATION.md v1.1 (final freeze candidate)
// ==========================================================
// Supersedes experiments/m15/verify_prereg.js, which encoded v1.0's
// expectations. This verifier carries forward every M15 check that still
// applies and adds the three mandated repairs.
//
// It FAILS on specification drift. It consumes NO registered seed, runs NO
// agent, and changes nothing.
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

// SUPERSEDED BY experiments/m17/verify_descriptive.js
//   This verifier encodes the expectations of C1_PREREGISTRATION.md **v1.1**,
//   which carried an inferential layer. M17 reformulated the study as purely
//   descriptive under Director authorisation, removing H0_sym, the permutation
//   test, alpha and p-values. Running v1.1's assertions against v2.0 would
//   report a FAIL meaning "the document was legitimately reformulated", not
//   "the document is wrong" — a false alarm for any future reader.
//
//   It therefore guards on the version and exits cleanly when it is not the
//   version it was written for, and is retained unchanged in substance as the
//   record of what M16 verified.
if (!/\*\*Version:\*\* 1\.1/.test(fs.readFileSync(
        path.join(ROOT, 'research/preregistrations/C1_PREREGISTRATION.md'), 'utf8'))) {
    console.log('M16 verifier: SUPERSEDED — the preregistration is no longer v1.1.');
    console.log('Run experiments/m17/verify_descriptive.js, which is authoritative for v2.0.');
    process.exit(0);
}

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};
const at = (n, needle) => (MAIN[n - 1] || '').includes(needle);
const FLAT = PRE.replace(/\s+/g, ' ');
const doc = (s) => FLAT.includes(s.replace(/\s+/g, ' '));
const absent = (s) => !FLAT.includes(s.replace(/\s+/g, ' '));
const lineOf = (needle) => MAIN.findIndex(l => l.includes(needle)) + 1;

console.log('='.repeat(78));
console.log('  M16 — C1 preregistration v1.1 verified against the repository');
console.log('='.repeat(78) + '\n');

P('VER', doc('**Version:** 1.1') && doc('FINAL FREEZE CANDIDATE') &&
         doc('NOT AUTHORISED FOR COLLECTION') && doc('supersedes the M15 v1.0 review draft'),
    'document is v1.1, marked final-freeze-candidate and unauthorised for collection');

// ================= REPAIR 1 — permutation test =============================
console.log('\n-- REPAIR 1: primary statistical test -------------------------------------');
P('R1-1', doc('two-sided paired sign-flip permutation') && doc('(randomization-of-signs) test'),
    'the primary test is the paired sign-flip permutation test');
P('R1-2', absent('Primary test (frozen): two-sided exact sign test'),
    'the sign test is no longer the primary test');
P('R1-3', doc('Sign test** — retained as the assumption-lighter robustness check'),
    'the sign test is retained as a secondary robustness check');
P('R1-4', doc('the **sign** of each configuration') && doc('states are never permuted'),
    'what is permuted is specified: configuration-level signs, never states');
P('R1-5', doc('**configurations**. The configuration is the sampling unit'),
    'the exchangeable units are specified');
P('R1-6', doc('T = Σ_c Δ(c,p)') && doc('p = Pr(|T(s)| ≥ |T_obs|)'),
    'test statistic and two-sided rejection rule are explicit');
P('R1-7', doc('Zeros are retained and `N` is not reduced'),
    'treatment of zero differences is specified');
P('R1-8', doc('excluded **before** the test; `N` is the count entering it'),
    'treatment of missing configurations is specified');

// the honesty requirements — the Director forbade a determinism-based claim
P('R1-9', doc('NOT justified by randomization, and this document does not claim that it is'),
    'the document explicitly REFUSES the randomization justification');
P('R1-10', doc('no randomised treatment assignment anywhere'),
    'the absence of randomised assignment in C1 is stated');
P('R1-11', doc('"exact because the design is deterministic" would be false'),
    'the determinism-based justification is explicitly rejected as false');
P('R1-12', doc('`H0_sym`: over the population of configurations') && doc('symmetric about 0'),
    'the operative null is named as the symmetry null H0_sym');
P('R1-13', doc('is an assumption about the configuration population. It is not derived from the design'),
    'H0_sym is declared an assumption, not a derivation');
P('R1-14', doc('point mass at 0') &&
           doc("The sharp null is therefore not this study's null") &&
           doc('refutes the sharp null by inspection with no test required'),
    'the degenerate sharp null is identified and excluded as the operative null');
P('R1-15', doc('not symmetric about 0') && doc('weaker and different claim than'),
    'the interpretation of rejection is stated precisely');

// enumeration vs Monte Carlo
P('R1-16', doc('`N ≤ 20`') && doc('complete enumeration') && doc('the p-value is exact'),
    'exact enumeration is specified for N <= 20');
P('R1-17', doc('M = 100,000') && doc('Phipson–Smyth') && doc('preregistered generator seed'),
    'the Monte Carlo branch, its M, estimator and seed are specified');
P('R1-18', doc('MUST be reported as a "Monte Carlo permutation test", never as "exact"'),
    'Monte Carlo is explicitly NOT called exact');
{
    // re-derive the attainability arithmetic for the permutation test
    const minP = (N) => 2 * Math.pow(0.5, N);          // 2 / 2^N
    let n = 1; while (minP(n) > 0.025) n++;
    console.log(`      permutation: min two-sided p = 2^(1-N); at N=6 ${minP(6).toFixed(5)}, ` +
                `at N=7 ${minP(7).toFixed(6)}`);
    P('R1-19', n === 7 && doc('2^(1−N)') && doc('`N ≥ 7`'),
        `rejection region non-empty from N = ${n} at alpha 0.025 — arithmetic re-derived`);
    P('R1-20', 1 / (1 + 100000) < 0.025 && doc('1/(1+M) = 1/100001'),
        'the Monte Carlo p-value floor is below alpha');
}

// ================= REPAIR 2 — jointlyDefined threshold =====================
console.log('\n-- REPAIR 2: removal of the arbitrary validity threshold -------------------');
P('R2-2', doc('That threshold is removed') && doc('Majority-rule is a heuristic, not a statistical principle'),
    'the jointlyDefined >= 10 threshold is removed and named as a heuristic');
P('R2-3', doc('`jointlyDefined ≥ 1` is the validity rule**, derived from the estimator'),
    'the replacement minimum is DERIVED from the estimator, not selected');
P('R2-4', doc('is undefined when the jointly-defined set is empty (`0/0`)'),
    'the mathematical necessity of the minimum is shown');
P('R2-5', doc('| `INVALID` | `E1 = 0`, or `jointlyDefined = 0`'),
    'the disposition table uses the derived rule');
P('R2-6', doc('Mandatory sensitivity analysis on jointly-defined count'),
    'the mandatory sensitivity analysis exists');
P('R2-7', doc('plotted against `jointlyDefined(c,p)`') && doc('stability curve'),
    'the sensitivity analysis relates jointlyDefined to Delta and reports a stability curve');
P('R2-8', doc('the primary conclusion is always the `k = 1` analysis'),
    'the stability curve is a disclosure, never a decision rule');
P('R2-9', absent('jointlyDefined ≥ 10`, `E1 ≥ 1`') && absent('or `jointlyDefined < 10`'),
    'no residual >=10 exclusion remains in the dispositions');

// ================= REPAIR 3 — asymmetric missingness ========================
console.log('\n-- REPAIR 3: asymmetric-missingness rule -----------------------------------');
P('R3-1', doc('missing_A = 19') && doc('missing_B = 19') && doc('asym = |missing_A − missing_B|'),
    'missing_A, missing_B and |missing_A - missing_B| are all specified');
P('R3-2', doc('No `asym > k` exclusion threshold is adopted for any k ≥ 1'),
    'no arbitrary numeric threshold is adopted');
P('R3-3', doc('It is not adopted, because **no principled, pre-data basis exists'),
    'the reviewer-suggested >2 is explicitly NOT adopted, with a reason');
P('R3-4', doc('The only non-arbitrary cut on `asym` is 0'),
    'the unique principled cut is identified');
P('R3-5', doc('Concordance analysis') && doc('subset with `asym = 0`'),
    'the concordance analysis on the symmetric subset is specified');
P('R3-6', doc('INCONCLUSIVE — DIFFERENTIAL DEFINEDNESS'),
    'the disagreement outcome is pre-specified');
P('R3-7', doc('computed **only** from definedness counts (never from `ρ`, `δ`, or `Δ`)'),
    'the rule is outcome-independent by construction');
P('R3-8', doc('Equal counts do not guarantee identical missing *sets*'),
    'the residual that equal counts != equal sets is declared');

// ================= carried forward from M15 =================================
console.log('\n-- carried forward: estimand, population, oracle, E1, seeds ----------------');
P('E6-1', doc('ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)') && doc('rank 0 meaning the oracle-optimal action is ranked first'),
    'E6 normalised rank and rank convention unchanged');
P('E6-2', doc('oracle-alignment of the candidate-ranking policy') &&
          doc('never** be described as "planning quality"'),
    'construct terminology frozen and misuse forbidden');
P('E6-3', doc('n_a(u) ≥ 2') && doc('no convention such as `ρ = 0` is adopted'),
    'n=1 handled without inventing a value');
P('E6-4', doc('such states are excluded by §7 and counted in the mandatory missingness table'),
    'n=1 cells enter missingness accounting explicitly');
P('E6-5', doc('raw rank `r_ARMED(u,p)`, `r_ABLATED(u,p)`') &&
          doc('pool size `n_ARMED(u)`, `n_ABLATED(u)`') &&
          doc('none may be promoted to the primary outcome'),
    'raw r and n remain mandatory diagnostics and cannot be promoted');

P('POP-1', at(1610, 'penalties.get(currentKey + "->" + k) > 10') &&
           at(1620, 'if (candidateQ < -0.5)') &&
           at(1673, '!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained') &&
           at(1678, '!canReachGoal(k, goalNeuronId)'),
    'F1-F4 conditions still match source at the cited lines');
const o = {
    sort: lineOf('const sorted = choices.sort'), best: lineOf('const bestChoice = sorted[0]'),
    struct: lineOf('structureMap.forEach((value, k) => {'),
    embed: lineOf('embeddingMap.forEach((value, k) => {'),
};
console.log(`      ordering: pool@${o.sort} best@${o.best} struct@${o.struct} embed@${o.embed}`);
P('POP-2', o.sort < o.best && o.best < o.struct && o.struct < o.embed &&
           o.sort === 2373 && o.best === 2378 && o.struct === 2423 && o.embed === 2453,
    'decision-time pool precedes bestChoice, which precedes both downstream loops');
P('POP-3', doc('MUST NOT** enter the E6 population') && doc('2373 < 2378 < 2423 < 2453'),
    'downstream contamination is excluded and machine-checked');

P('OR-1', typeof env.reliabilityOptimalPolicy === 'function' &&
          typeof env.expectedCostToGoal === 'function' &&
          doc('No oracle is invented') && doc('no cost is invented for off-graph actions'),
    'oracle unchanged and nothing invented');
P('OR-2', doc('44 of 76** chosen actions (58%)'),
    'the off-graph substrate property remains declared, not a cognitive claim');

P('E1-1', doc('E1(c) = |{ u : best_ARMED(u) ≠ best_ABLATED(u) }|') &&
          doc('"large causal effect" is forbidden') &&
          doc('must NOT be interpreted'),
    'E1 remains a wiring control and is not an efficacy endpoint');

P('PH-1', doc('Phase multiplicity — re-examined') && doc('retained as co-primary'),
    'phase multiplicity is re-examined rather than inherited');
P('PH-2', doc('score the **same** end-of-run policy against two different') &&
          doc('positively dependent') &&
          doc('controls the family-wise error rate under **any** dependence structure'),
    'the dependence between phases is stated and Bonferroni justified under it');
P('PH-3', doc('single-primary-phase alternative was considered and rejected'),
    'the single-primary alternative was considered explicitly');

const LO = 895000, HI = 895999;
let collide = 0;
for (let s = LO; s <= HI; s++) if (inRegisteredBlock(s) || isConsumed(s) || isHeldOut(s)) collide++;
P('SD-1', collide === 0 && doc('895000–895999') && HI < 896000 && HI < HELD_OUT_FLOOR,
    `C1 block ${LO}-${HI} clean, disjoint from 896xxx, below the held-out floor`);
P('SD-2', FROZEN.seedLo === 897000 && doc('897000–897999 is SPENT and must never be reused'),
    'the spent UQ-B block is declared and not reused');
P('SD-3', env.evaluatedSeeds().length === 0,
    'NO seed evaluated during verification — 895000-895999 remains unconsumed');
P('SD-4', doc('896000–896999') && doc('Governance recommendation (not part of this study)'),
    'the 896xxx registry gap is documented as a separate administrative issue only');

P('LIM-1', doc('Residual limitations, declared') && doc('`H0_sym` is an assumption') &&
           doc('Rejection means asymmetry, not a non-zero mean'),
    'residual limitations are declared, including the symmetry assumption');
P('EIH-1', doc('Established evidence') && doc('Valid inference') && doc('Untested hypotheses') &&
           doc('instrument-validation evidence only'),
    'evidence / inference / hypothesis boundaries preserved');
P('GATE-1', doc('Attainability gate — MANDATORY, PRE-COLLECTION') &&
            doc('No adaptive tuning after registered data'),
    'the pre-collection attainability gate and the no-tuning rule are retained');

// ---- pilot numbers still match the recorded evidence ----------------------
{
    const rows = PILOT.results.flatMap(R => R.perState);
    const cells = rows.flatMap(s => [1, 2].map(ph => s.optRank[ph]));
    const both = cells.filter(c => c.A !== null && c.B !== null).length;
    const oneOnly = cells.filter(c => (c.A === null) !== (c.B === null)).length;
    const ties = rows.reduce((a, s) => a + s.tiesA + s.tiesB, 0);
    P('PL-1', both === 149 && oneOnly === 0 && ties === 0 &&
              doc('149/152') && doc('0 one-arm-only') && doc('0 weight ties across all 152 pools'),
        'pilot numbers cited in the document still match the recorded M14 evidence');
}

// ---- integrity ------------------------------------------------------------
console.log('');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    const allowed = new Set(['research/preregistrations/C1_PREREGISTRATION.md',
                             'research/preregistrations/C1_PREREGISTRATION.sha256',
                             'experiments/m15/verify_prereg.js']);
    P('INT-1', changed.every(f => allowed.has(f)),
        `only the C1 preregistration, its sidecar and the superseded M15 verifier are modified: ` +
        `${JSON.stringify(changed)}`);
}
P('INT-2', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/', 'experiments/uqb/', 'research/spec/', 'experiments/m14/').trim() === '',
    'production source, UQ-B, the M13 spec and the M14 pilot record are untouched');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M16 VERDICT: PASS' : '  M16 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

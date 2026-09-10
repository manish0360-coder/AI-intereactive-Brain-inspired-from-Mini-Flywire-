// ==========================================================
// M17 — verification of C1_PREREGISTRATION.md v2.0 (descriptive reformulation)
// ==========================================================
// Supersedes experiments/m16/verify_freeze.js, which encoded v1.1's
// inferential expectations.
//
// REMOVAL CHECKS ARE SCOPED, NOT NAIVE.
//   Terms like "p-value", "permutation test" and "H0_sym" legitimately appear
//   in section 0 (what was removed) and section 15.2 (what is forbidden). A
//   bare `absent('p-value')` would therefore fail on a correct document. Every
//   removal check below targets an OPERATIVE phrasing — the wording that would
//   only be present if the machinery were still in force — and is paired with a
//   presence check that the removal is actually declared.
//
// Consumes NO registered seed, runs NO agent, changes nothing.
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
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};
const at = (n, needle) => (MAIN[n - 1] || '').includes(needle);
// Strip markdown blockquote markers BEFORE flattening: a '>' at the start of a
// wrapped quote line would otherwise be spliced into the middle of a required
// phrase and break an otherwise-correct needle.
const FLAT = PRE.replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
const doc = (s) => FLAT.includes(s.replace(/\s+/g, ' '));
const gone = (s) => !FLAT.includes(s.replace(/\s+/g, ' '));
const lineOf = (needle) => MAIN.findIndex(l => l.includes(needle)) + 1;

console.log('='.repeat(78));
console.log('  M17 — C1 preregistration v2.0 (descriptive) verified');
console.log('='.repeat(78) + '\n');

P('VER', doc('**Version:** 2.0') && doc('DESCRIPTIVE REFORMULATION') &&
         doc('NOT AUTHORISED FOR COLLECTION') && doc('Supersedes:** v1.1'),
    'document is v2.0, descriptive, unauthorised for collection, supersedes v1.1');

// ============ REMOVAL: the inferential layer is gone ========================
console.log('\n-- REMOVAL: inferential machinery ------------------------------------------');
P('RM-1', gone('Primary test (frozen)') && gone('two-sided paired sign-flip permutation'),
    'no primary test is specified anywhere');
P('RM-2', gone('`H0_sym`: over the population of configurations') &&
          gone('reject `H0_sym`'),
    'H0_sym is no longer defined or used as an operative null');
P('RM-3', gone('α = 0.025') && gone('family-wise') && gone('Bonferroni across the two phases'),
    'alpha and its allocation are removed');
P('RM-4', gone('p = Pr(|T(s)| ≥ |T_obs|)') && gone('Phipson–Smyth') && gone('M = 100,000'),
    'the p-value machinery, its estimator and its Monte Carlo parameters are removed');
P('RM-5', gone('2^(1−N)') && gone('the rejection region is non-empty') &&
          doc('that check is meaningless and is removed'),
    'the rejection-region arithmetic is removed (its only mention is the removal notice)');
P('RM-6', gone('Study-level outcomes:** `EFFECT DETECTED`') &&
          gone('INCONCLUSIVE — DIFFERENTIAL DEFINEDNESS') &&
          doc('There is no `EFFECT DETECTED`, no `NO EFFECT DETECTED`'),
    'test-derived dispositions are removed and their absence is stated');
P('RM-7', gone('at least **20 valid configurations per phase**') &&
          gone('INCONCLUSIVE — INSUFFICIENT MATERIAL'),
    'the 20-configuration minimum-evidence rule is removed');
P('RM-8', gone('Wilcoxon signed-rank on the same values') &&
          gone('Sign test** — retained as the assumption-lighter'),
    'the secondary tests are removed along with the primary');
P('RM-9', doc('**H0_sym**, the sign-flip permutation test') || doc('`H0_sym`, the sign-flip permutation test'),
    'section 0 declares exactly what was removed');
P('RM-10', doc('No hypothesis is stated, tested, rejected, or failed to be rejected anywhere'),
    'the absence of hypothesis testing is stated explicitly');
P('RM-11', doc('there is **no multiplicity problem and therefore no α to allocate'),
    'multiplicity is explicitly dissolved rather than silently dropped');

// ============ the census frame ==============================================
console.log('\n-- FRAME: census, not sample ------------------------------------------------');
P('FR-1', doc('census**, not a random sample') || doc('is a **census**'),
    'the enumerated block is framed as a census');
P('FR-2', doc('carrying no sampling error, no estimation error, and no standard error'),
    'exactness of unit-level effects is stated');
P('FR-3', doc('deterministic enumeration, not a random sample from a defined superpopulation'),
    'the absence of a sampling frame is stated as the reason inference is removed');
P('FR-4', doc('census mean of `Δ(c,p)` **is** the average treatment effect over that enumerated population'),
    'what the census mean legitimately IS is stated precisely');
P('FR-5', doc('both arms are run on every accepted configuration') &&
          doc('enumerated exhaustively'),
    'the three design facts underwriting exactness are stated');

// ============ the descriptive plan ==========================================
console.log('\n-- PLAN: descriptive analysis ----------------------------------------------');
P('PL-1', doc('THE PREREGISTERED DESCRIPTIVE ANALYSIS PLAN'), 'the descriptive plan section exists');
P('PL-2', doc('complete, per-configuration list of `Δ(c,p)` values, reported in full'),
    'the primary reported object is the full per-configuration list');
P('PL-3', doc('mean') && doc('median') && doc('min, p05, p10, p25, p50, p75, p90, p95, max') &&
          doc('IQR') && doc('range'),
    'mean, median and the full quantile set are specified');
P('PL-4', doc('`nNegative`') && doc('`nPositive`') && doc('`nZero`'),
    'positive / negative / equal counts are specified');
P('PL-5', doc('never as a standard error and never used to form an interval'),
    'SD is fenced to descriptive use only');
P('PL-6', doc('not** an estimate of any probability') && doc('must not** be compared to 0.5'),
    'proportions are fenced against inferential reading');
P('PL-7', doc('Definedness and missingness reporting') && doc('distribution of `asym`'),
    'missingness and undefinedness reporting is specified');
P('PL-8', doc('count of `n = 1` occurrences') && doc('`n1Armed`'),
    'n=1 reporting is specified');
P('PL-9', doc('Distribution of raw rank `r`') && doc('distribution of pool size `n`'),
    'raw rank and pool-size diagnostics are specified');
P('PL-10', doc('separately per phase') && doc('never pooled across phases'),
    'phase-wise reporting is specified and pooling forbidden');
P('PL-11', doc('stability curve') && doc('`asym = 0`** stratum'),
    'stratified and sensitivity reporting is specified');
{
    const vs = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'].every(v => doc('| ' + v + ' |'));
    P('PL-12', vs && doc('Mandatory visualisations'), 'all eight mandatory visualisations are specified');
}
P('PL-13', doc('no fitted lines, no trend estimates, no error bars, no confidence bands, and no significance annotation'),
    'figures are fenced against inferential decoration');

// ============ allowed / forbidden ===========================================
console.log('\n-- CONCLUSIONS: allowed and forbidden --------------------------------------');
P('CF-1', doc('ALLOWED AND FORBIDDEN CONCLUSIONS'), 'the allowed/forbidden section exists');
P('CF-2', doc('unit-level causal statement**, licensed because both arms were run'),
    'unit-level causal statements are explicitly allowed, with the reason');
P('CF-3', doc('Any inferential claim') && doc('Any generalisation beyond the enumerated configurations'),
    'inferential claims and generalisation are explicitly forbidden');
P('CF-4', doc('Any cognitive or representational claim'),
    'cognitive claims are explicitly forbidden');
P('CF-5', doc('Any comparison with UQ-B') && doc('pre-M11-repair'),
    'comparison with UQ-B is forbidden, with the substrate reason');
P('CF-6', doc('absence of a large census mean is not evidence of no effect anywhere'),
    'the absence-of-evidence error is explicitly forbidden');
P('CF-7', doc('performs no statistical inference and licenses no generalisation'),
    'the required verbatim phrasing is present');

// ============ preserved infrastructure ======================================
console.log('\n-- PRESERVED: estimand, population, oracle, diagnostics, E1, seeds ---------');
P('PR-1', doc('ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)') &&
          doc('rank 0 meaning the oracle-optimal action is ranked first'),
    'E6 and its rank convention are unchanged');
P('PR-2', doc('oracle-alignment of the candidate-ranking policy') &&
          doc('never** be called "planning quality"'),
    'construct terminology frozen and misuse forbidden');
P('PR-3', doc('n_a(u) ≥ 2') && doc('no convention such as `ρ = 0` is adopted'),
    'n=1 handled without inventing a value');
P('PR-4', doc('normalised total-effect outcome'),
    'normalisation is still not claimed free of treatment dependence');
P('PR-5', at(1610, 'penalties.get(currentKey + "->" + k) > 10') &&
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
P('PR-6', o.sort === 2373 && o.best === 2378 && o.struct === 2423 && o.embed === 2453 &&
          o.sort < o.best && o.best < o.struct && o.struct < o.embed &&
          doc('2373 < 2378 < 2423 < 2453') && doc('MUST NOT** enter the E6 population'),
    'decision-time population and its machine-checked ordering are preserved');
P('PR-7', typeof env.reliabilityOptimalPolicy === 'function' &&
          typeof env.expectedCostToGoal === 'function' &&
          doc('No oracle is invented') && doc('no cost is invented for off-graph actions'),
    'oracle unchanged and nothing invented');
P('PR-8', doc('E1(c) = |{ u : best_ARMED(u) ≠ best_ABLATED(u) }|') &&
          doc('"large causal effect" is forbidden') && doc('never an outcome'),
    'E1 preserved as a control, never an outcome');
P('PR-9', doc('The configuration is the unit') && doc('not** independent units'),
    'configuration remains the unit; states are not independent units');
P('PR-10', doc('`jointlyDefined ≥ 1`** is the validity rule, derived from the estimator') ||
           doc('`jointlyDefined ≥ 1`** is the validity rule'),
    'the derived validity rule from M16 Repair 2 is preserved');
P('PR-11', doc('No `asym > k` exclusion threshold is adopted for any k ≥ 1'),
    'M16 Repair 3 is preserved: still no arbitrary asym threshold');
P('PR-12', doc('Instrument-adequacy gate — MANDATORY, PRE-COLLECTION') &&
           doc('No adaptive tuning after registered data'),
    'a pre-collection gate and the no-tuning rule are retained');
P('PR-13', doc('that check is meaningless and is removed'),
    'the gate check that depended on a rejection region is explicitly removed');

// ============ seed governance ===============================================
console.log('\n-- SEEDS ---------------------------------------------------------------------');
const LO = 895000, HI = 895999;
let collide = 0;
for (let s = LO; s <= HI; s++) if (inRegisteredBlock(s) || isConsumed(s) || isHeldOut(s)) collide++;
P('SD-1', collide === 0 && doc('895000–895999') && HI < 896000 && HI < HELD_OUT_FLOOR,
    `C1 block ${LO}-${HI} clean, disjoint from 896xxx, below the held-out floor`);
P('SD-2', FROZEN.seedLo === 897000 && doc('897000–897999 is SPENT and must never be reused'),
    'the spent UQ-B block is declared and not reused');
P('SD-3', env.evaluatedSeeds().length === 0,
    'NO seed evaluated during verification — 895000-895999 remains unconsumed');
P('SD-4', doc('Governance recommendation (not part of this study)') && doc('896000–896999'),
    'the 896xxx registry gap remains a separate administrative issue');

// ============ evidence discipline ===========================================
console.log('\n-- EVIDENCE DISCIPLINE -------------------------------------------------------');
P('ED-1', doc('Established evidence') && doc('Valid inference') && doc('Untested hypotheses'),
    'evidence / inference / hypothesis sections are present');
P('ED-2', doc('instrument-validation evidence only'),
    'the M14 pilot is classified as instrument validation only');
P('ED-3', doc('C1 as reformulated does not test it and cannot'),
    'the untested hypothesis is declared untestable by this design');
P('ED-4', doc('Residual limitations, declared') && doc('No generalisation.'),
    'residual limitations lead with the no-generalisation limit');
{
    const rows = PILOT.results.flatMap(R => R.perState);
    const cells = rows.flatMap(s => [1, 2].map(ph => s.optRank[ph]));
    const both = cells.filter(c => c.A !== null && c.B !== null).length;
    const oneOnly = cells.filter(c => (c.A === null) !== (c.B === null)).length;
    const ties = rows.reduce((a, s) => a + s.tiesA + s.tiesB, 0);
    P('ED-5', both === 149 && oneOnly === 0 && ties === 0 &&
              doc('149/152') && doc('0 one-arm-only') && doc('0 weight ties'),
        'pilot numbers cited still match the recorded M14 evidence');
}

// ============ integrity =====================================================
console.log('');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    const allowed = new Set(['research/preregistrations/C1_PREREGISTRATION.md',
                             'research/preregistrations/C1_PREREGISTRATION.sha256',
                             'experiments/m16/verify_freeze.js']);
    P('INT-1', changed.every(f => allowed.has(f)),
        `only the preregistration, its sidecar and the superseded M16 verifier may change: ` +
        `${JSON.stringify(changed)}`);
}
P('INT-2', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/', 'experiments/uqb/', 'research/spec/', 'experiments/m14/').trim() === '',
    'production source, UQ-B, the M13 spec and the M14 pilot record are untouched');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M17 VERDICT: PASS' : '  M17 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

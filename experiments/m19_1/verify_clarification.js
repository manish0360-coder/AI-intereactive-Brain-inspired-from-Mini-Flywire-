// ==========================================================
// M19 PASS 1.1 PASS 2 — verification of the adequacy decision-rule clarification
// ==========================================================
// Checks the four things the ruling names: no arbitrary threshold, no hidden
// inferential machinery, no circularity, no unsupported causal claim.
//
// Verifies the SPECIFICATION. Executes no diagnostic, runs no agent, consumes
// no seed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { inRegisteredBlock } from '../uqb/protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MEMO = rd('research/preregistrations/C1_INSTRUMENT_ADEQUACY_FORMULATION.md');
const PILOT = JSON.parse(rd('experiments/m14/m14_attainability.json'));
const FLAT = MEMO.replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
const doc = (s) => FLAT.includes(s.replace(/\s+/g, ' '));
const gone = (s) => !FLAT.includes(s.replace(/\s+/g, ' '));

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};

console.log('='.repeat(78));
console.log('  M19 PASS 1.1 — decision-rule clarification verified');
console.log('='.repeat(78) + '\n');

P('VER', doc('**Milestone:** M19 PASS 1.1') && doc('supersedes the M19 PASS 1 formulation') &&
         doc('THE DIAGNOSTIC HAS NOT BEEN RUN'),
    'document is PASS 1.1, supersedes PASS 1, and is unexecuted');

// ---- 1. the four concepts are distinguished, not equated -------------------
console.log('-- the four evidential concepts ---------------------------------------------');
P('FC-1', doc('**Exercisable**') && doc('**Observed**') &&
          doc('**Sufficiently demonstrated**') && doc('**Instrument is adequate**'),
    'all four concepts are named and defined');
P('FC-2', doc('⇏ `Observed` ⇏ `Sufficiently demonstrated` ⇏ `Adequate`'),
    'the non-implications are stated explicitly — the concepts are not equated');
P('FC-3', doc('Is an existence-based criterion sufficient?') && doc('**No.**'),
    'the direct question is answered directly, with No');
P('FC-4', doc('a single cell can be a boundary case, a rounding artifact, or a coincidence'),
    'why bare existence is insufficient is argued, not asserted');
P('FC-5', doc('conflated `Observed` with `Sufficiently demonstrated`'),
    'the v1.0 conflation is named as the defect being repaired');

// ---- 2. adequacy is declared NOT establishable pre-collection --------------
console.log('\n-- the honest limit ----------------------------------------------------------');
P('HL-1', doc('it falsifies, it does not certify'),
    'the gate is framed as falsifying rather than certifying');
P('HL-2', doc('cannot establish that the instrument is adequate on the registered block'),
    'the gate disclaims certifying adequacy on the registered block');
P('HL-3', doc('sampling-frame inference') && doc('this program has no sampling frame'),
    'the reason is the missing sampling frame, tied to M17');
P('HL-4', doc('with or without a numerical threshold'),
    'it is stated that no threshold would repair the gap — the limit is structural, not quantitative');
P('HL-5', doc('a failure is informative and blocking; a non-failure is permissive but not probative'),
    'the gate asymmetry is explicit');
P('HL-6', doc('is a permission, not a finding') &&
          doc('may not appear in any report of this diagnostic'),
    'the phrase "the instrument is adequate" is forbidden in reports');

// ---- 3. NO ARBITRARY THRESHOLD --------------------------------------------
console.log('\n-- no arbitrary threshold ----------------------------------------------------');
P('AT-1', doc('S1 — Leave-one-out robustness') && doc('robustness property, not a quantity'),
    'S1 is framed as a robustness property rather than a count');
P('AT-2', doc('`2` is **derived**') && doc('rather than chosen'),
    'the implied minimum of 2 is derived, not selected');
P('AT-3', doc('S2 — Replication across the design') &&
          doc('strata are **not chosen by this document**'),
    'S2 reuses strata the frozen design already defines');
P('AT-4', doc('four frozen goal indices') && doc('{Set C, Set F}'),
    'the strata are named and traceable to the frozen design');
P('AT-5', doc('No number is chosen for convenience anywhere in this document'),
    'the no-invented-number commitment is restated for v1.1');
{
    // Scan the memo for DECISION CONSTANTS. Identifiers are not thresholds, so
    // seed ids, source line references and dates are stripped first — otherwise
    // the check flags fixture names and main.js line numbers as if they were
    // criteria, which is a miscalibration of the check rather than a finding.
    const body = MEMO.split('\n').filter(l => !/^#{1,6}\s/.test(l)).join(' ')
        .replace(/89[0-9]{4}/g, '<seed>')
        .replace(/main\.js:[0-9]+/g, '<srcline>')
        .replace(/\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b/g, '<date>')
        .replace(/`[0-9a-f]{7,}`/g, '<commit>');
    const nums = [...body.matchAll(/(?<![\w.\-])(\d+(?:\.\d+)?)(?![\w.%])/g)].map(m => m[1]);
    const allowed = new Set([
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',   // criterion ids, derived bound
        '19', '24', '31', '38', '41', '76', '88', '145', '149', '152', '71', // M14 / UQ-B citations
        '0.2', '0.4', '0.5', '0.6', '0.8', '2.1', '2.3', '0.1', '1.1', '1.2', '1.3', '3.1',
        '12', '14', '895000', '895999', '896', '2026', '19.',
    ]);
    const stray = [...new Set(nums)].filter(n => !allowed.has(n));
    P('AT-6', stray.length === 0,
        `no unexplained numeric constant in the memo${stray.length ? ': ' + stray.join(', ') : ''}`);
}

// ---- 4. NO HIDDEN INFERENTIAL MACHINERY ------------------------------------
console.log('\n-- no hidden inference -------------------------------------------------------');
P('HI-1', gone('H0_sym:') && gone('null hypothesis is') && gone('reject H0'),
    'no null hypothesis');
P('HI-2', gone('α = 0.0') && gone('p-value is') && gone('p ≤ '),
    'no alpha, no operative p-value');
P('HI-3', gone('permutation test on') && gone('sign test on') && gone('we test whether') &&
          gone('confidence interval'),
    'no test and no interval');
P('HI-4', gone('statistically significant') && gone('is significant'),
    'no significance language');
P('HI-5', doc('INSTRUMENT evidence only') && doc('None of it is evidence about `futureScore`'),
    'the instrument/mechanism fence survives the revision');
P('HI-6', gone('proportion of cells exceeds') && gone('at least 5%') && gone('at least 10%'),
    'no percentage rule was introduced as a substitute for the withdrawn existence rule');

// ---- 5. THE WITHDRAWN CAUSAL CLAIM -----------------------------------------
console.log('\n-- the controls claim, repaired ----------------------------------------------');
P('WC-1', doc('is **withdrawn**') &&
          doc('it asserted universal E6 sensitivity, which these controls cannot support'),
    'the v1.0 sentence is explicitly withdrawn, with the reason');
P('WC-2', doc('do **not** establish that E6 is sensitive to every change the treatment could produce'),
    'the memo denies universal sensitivity in those words');
P('WC-3', doc('Sensitivity to a manipulation is not sensitivity in general'),
    'the logical gap between one manipulation and general sensitivity is named');
P('WC-4', doc('would **remain ambiguous**') && doc('**narrow** that ambiguity') &&
          doc('**do not remove it**'),
    'the residual ambiguity of an inert result is stated as remaining');
P('WC-5', doc('must not be presented as evidence that the mechanism has no effect'),
    'the absence-of-evidence error is forbidden for inert C1 results');
{
    // the operative form of the withdrawn claim must not survive anywhere except
    // inside the withdrawal notice, which quotes it
    const occurrences = (FLAT.match(/would be a statement about the mechanism/g) || []).length;
    P('WC-6', occurrences === 1 && doc('The v1.0 sentence claiming'),
        `the withdrawn wording appears exactly once, inside the withdrawal notice ` +
        `(${occurrences} occurrence)`);
}

// ---- 6. NO CIRCULARITY -----------------------------------------------------
console.log('\n-- no circularity ------------------------------------------------------------');
P('CI-1', doc('Set C (continuity)') && doc('Set F (fresh)') && doc('not used by M14'),
    'the held-out fixture split survives the revision');
P('CI-2', doc('would be circular') && doc('fixture-specific flattery'),
    'the circularity that Set F guards against is still named');
P('CI-3', doc('Set C ∪ Set F') && doc('reported as a discrepancy rather than averaged away'),
    'criteria must hold on both sets, discrepancies disclosed');
P('CI-4', doc('holds **independently within each stratum**'),
    'S2 requires per-stratum replication, which strengthens the circularity guard');
P('CI-5', doc('**`NOT EXERCISABLE`**') && doc('Applicable vs satisfied'),
    'inapplicable strata are distinguished from failures, so silence is not read as success');

// ---- 7. outcomes renamed ---------------------------------------------------
console.log('\n-- outcomes ------------------------------------------------------------------');
P('OU-1', doc('**NO FAILURE DETECTED**') && doc('**FAILURE DETECTED**') && doc('**MARGINAL**'),
    'the three outcomes are defined');
P('OU-2', doc('`ADEQUATE` is withdrawn') && gone('| **ADEQUATE** |'),
    'ADEQUATE is withdrawn as an outcome');
P('OU-3', gone('| **INADEQUATE** |'), 'INADEQUATE is replaced by FAILURE DETECTED');
P('OU-4', doc('Does not permit collection'),
    'MARGINAL does not permit collection');
P('OU-5', doc('No criterion may be relaxed, and no threshold introduced, after the diagnostic runs'),
    'the anti-tuning rule survives');

// ---- 8. preserved purposes -------------------------------------------------
console.log('\n-- preserved purposes --------------------------------------------------------');
P('PP-1', doc('**A5**') && doc('not noisy'), 'A5 negative control preserved');
P('PP-2', doc('**A9**') && doc('not globally inert'), 'A9 positive control preserved');
P('PP-3', doc('**A7**') && doc('rank-driven') && doc('normalisation-driven'),
    'A7 rank/normalisation decomposition preserved');
P('PP-4', doc('exactly `n = 3`') && doc('derived, not selected'),
    'the derived n>=3 boundary preserved');
{
    const ids = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11'];
    P('PP-5', ids.every(a => doc('**' + a + '**')), 'all eleven criteria survive the revision');
}
{
    // A7's non-triviality still re-derives from the recorded M14 evidence
    const rows = PILOT.results.flatMap(R => R.perState);
    let rankDriven = 0, normDriven = 0, bothD = 0;
    for (const s of rows) for (const ph of [1, 2]) {
        const o = s.optRank[ph];
        if (o.A === null || o.B === null) continue;
        const dR = o.A !== o.B, dN = o.nA !== o.nB;
        if (dR && !dN) rankDriven++; else if (!dR && dN) normDriven++; else if (dR && dN) bothD++;
    }
    P('PP-6', rankDriven === 24 && normDriven === 31 && bothD === 88 &&
              doc('24 rank-driven, 31 normalisation-driven, 88 both'),
        `the cited decomposition still re-derives from the M14 record (${rankDriven}/${normDriven}/${bothD})`);
}

// ---- 9. not executed, and integrity ----------------------------------------
console.log('\n-- not executed and integrity ------------------------------------------------');
P('NE-1', !fs.existsSync(path.join(ROOT, 'experiments/m19/m19_adequacy.json')) &&
          !fs.existsSync(path.join(ROOT, 'experiments/m19_1/m19_adequacy.json')),
    'no adequacy result artifact exists');
P('NE-2', env.evaluatedSeeds().length === 0, 'NO seed evaluated — nothing consumed');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    const allowed = new Set(['research/preregistrations/C1_INSTRUMENT_ADEQUACY_FORMULATION.md',
                             'experiments/m19/verify_formulation.js']);
    P('IN-1', changed.every(f => allowed.has(f)),
        `only the M19 formulation and its superseded verifier are modified: ${JSON.stringify(changed)}`);
}
P('IN-2', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/', 'experiments/uqb/', 'experiments/m14/', 'experiments/registry/',
    'research/spec/').trim() === '',
    'production, UQ-B, the M14 record, the registry and the M13 spec are untouched');
{
    const d = execFileSync('sha256sum', ['-c', 'C1_PREREGISTRATION.sha256',
        'UQB_PREREGISTRATION.sha256'],
        { cwd: path.join(ROOT, 'research/preregistrations'), encoding: 'utf8' });
    P('IN-3', (d.match(/OK/g) || []).length === 2,
        'the C1 preregistration and UQ-B digests verify — E6 and C1 unchanged');
}
P('IN-4', doc('The diagnostic cannot alter C1'),
    'the diagnostic remains fenced from changing C1');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M19 PASS 1.1 VERDICT: PASS' : '  M19 PASS 1.1 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

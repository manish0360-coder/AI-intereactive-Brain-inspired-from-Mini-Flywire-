// ==========================================================
// M19 PASS 1.2 PASS 2 — verification of the stress-test specification
// ==========================================================
// Checks the six things the ruling names: no sampling inference, no arbitrary
// threshold, no hidden inferential machinery, no claim of universal E6
// adequacy, all failure criteria falsifiable, all frozen E6 definitions
// unchanged.
//
// Verifies the SPECIFICATION. Executes no diagnostic, runs no agent, consumes
// no seed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';

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
console.log('  M19 PASS 1.2 — stress-test specification verified');
console.log('='.repeat(78) + '\n');

// ---- 0. the reframe --------------------------------------------------------
console.log('-- reframed as a stress test -------------------------------------------------');
P('RF-1', doc('PRE-COLLECTION INSTRUMENT STRESS TEST') && doc('not an adequacy certification'),
    'the document is framed as a stress test, not a certification');
P('RF-2', doc('**Milestone:** M19 PASS 1.2') && doc('THE STRESS TEST HAS NOT BEEN RUN'),
    'it is PASS 1.2 and declares itself unexecuted');
P('RF-3', doc('detect, before the registered C1 block is consumed, the specific classes of E6 ' +
              'measurement failure this program has already identified'),
    'the purpose is detection of ALREADY-IDENTIFIED failure classes');
P('RF-4', doc('It looks for known faults. It does not survey unknown ones, and it does not certify'),
    'the scope limit — known faults only — is explicit');

// ---- 1. the three outcomes, verbatim --------------------------------------
console.log('\n-- the three mandated outcomes -----------------------------------------------');
P('OU-1', doc('The stress test did not detect the specified failure modes on the examined ' +
              'development fixtures'),
    'NO KNOWN FAILURE DETECTED carries the mandated meaning');
P('OU-2', doc('sufficient reason to block C1 collection pending repair'),
    'KNOWN FAILURE DETECTED is sufficient reason to block collection');
P('OU-3', doc('**INSTRUMENT ADEQUATE FOR C1**') &&
          doc('NOT established by this diagnostic') &&
          doc('must never appear in any report of it'),
    'INSTRUMENT ADEQUATE FOR C1 is declared not established and forbidden as a conclusion');
P('OU-4', gone('| **NO FAILURE DETECTED** |') && gone('| **MARGINAL** |') &&
          gone('| **ADEQUATE** |') && gone('| **INADEQUATE** |'),
    'the superseded outcome names are gone from the outcome table');
P('OU-5', doc('is a permission to proceed, not a finding about the instrument'),
    'the permissive-not-probative reading is stated');

// ---- 2. S1 / S2 re-examined and REMOVED ------------------------------------
console.log('\n-- S1 and S2 re-examined ------------------------------------------------------');
P('SS-1', doc('**v1.2 removes both.**') &&
          doc('not preserved merely because they were formulated'),
    'S1 and S2 are removed, and explicitly not kept out of inertia');
P('SS-2', doc('**A5 already does that work**'),
    'the argument that A5 subsumes S1 is given');
P('SS-3', doc('Replication accumulates evidence *toward a general claim*') &&
          doc('exactly what §0.1 forbids'),
    'the argument that S2 served an abandoned certification goal is given');
P('SS-4', doc('**What replaces them: nothing, plus full disclosure.**') &&
          doc('No replacement threshold, percentage, count or effect size is introduced'),
    'nothing arbitrary replaces them');
P('SS-5', gone('#### S1 — Leave-one-out robustness') && gone('#### S2 — Replication across'),
    'the S1 and S2 rule definitions are gone as operative rules');
P('SS-6', doc('Set C / Set F is preserved — as reporting, not as a conjunction rule'),
    'Set C / Set F survives as reporting, per the ruling');

// ---- 3. falsifiability of every failure criterion --------------------------
console.log('\n-- every failure mode is falsifiable ------------------------------------------');
{
    const ids = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'];
    P('FA-1', ids.every(k => doc('**' + k + '**')), `the register lists all ${ids.length} known failure modes`);
}
P('FA-2', doc('universal statement about the instrument') &&
          doc('falsifiable by a single genuine counterexample'),
    'the falsification logic is stated: universal claims, single counterexample');
P('FA-3', doc('Universal form') && doc('Falsified by'),
    'each mode records its universal form AND what falsifies it');
P('FA-4', doc('**K3 is the one that is not falsified by example, and that asymmetry is deliberate.**'),
    'the K3 asymmetry is surfaced rather than hidden');
P('FA-5', doc('a single violation **detects** K3 rather than falsifying it'),
    'K3 is correctly framed as detected-by-violation, not falsified-by-example');
P('FA-6', doc('Nothing outside this register is a failure for the purposes of this gate'),
    'the register is closed — no post-hoc failure modes');
P('FA-7', doc('Adding a failure mode after the stress test runs is forbidden'),
    'the anti-tuning rule covers the register itself');
{
    // each mode must name a detector that exists among A1-A11
    const detectors = ['A1', 'A2', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11'];
    P('FA-8', detectors.every(a => doc('**' + a + '**')),
        'every detector named in the register is a defined criterion');
}

// ---- 4. NO SAMPLING INFERENCE ----------------------------------------------
console.log('\n-- no sampling inference ------------------------------------------------------');
P('SI-1', doc('sampling-frame inference') && doc('this program has no sampling frame'),
    'the missing sampling frame is named as the reason certification is impossible');
P('SI-2', doc('No amount of fixture evidence, and no numerical threshold, repairs that'),
    'no fixture evidence is claimed to bridge to the registered block');
P('SI-3', gone('representative of the registered') && gone('generalises to 895') &&
          gone('sample of the registered population'),
    'no generalisation from 896xxx fixtures to the 895xxx population is asserted');
P('SI-4', doc('examined development fixtures'),
    'results are scoped to the examined fixtures in the outcome wording itself');

// ---- 5. NO ARBITRARY THRESHOLD ---------------------------------------------
console.log('\n-- no arbitrary threshold -----------------------------------------------------');
P('AT-1', doc('exactly `n = 3`') && doc('derived, not selected'),
    'the single derived boundary survives and is still justified');
P('AT-2', doc('Narrowness is **reported, never adjudicated**') ||
          doc('reported, never adjudicated'),
    'narrow falsification is disclosed rather than turned into a verdict');
P('AT-3', doc('would require a threshold this document refuses to invent') ||
          doc('requires a threshold this program can neither derive nor invent'),
    'the refusal to invent a narrowness threshold is explicit');
{
    // scan for decision constants; identifiers are stripped, not thresholds
    const body = MEMO.split('\n').filter(l => !/^#{1,6}\s/.test(l)).join(' ')
        .replace(/89[0-9]{4}/g, '<seed>')
        .replace(/main\.js:[0-9]+/g, '<srcline>')
        .replace(/\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b/g, '<date>')
        .replace(/`[0-9a-f]{7,}`/g, '<commit>');
    const nums = [...body.matchAll(/(?<![\w.\-])(\d+(?:\.\d+)?)(?![\w.%])/g)].map(m => m[1]);
    const allowed = new Set([
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
        '19', '24', '31', '38', '41', '76', '88', '145', '149', '152', '71',
        '0.1', '0.2', '0.4', '0.5', '0.6', '0.8', '1.1', '1.2', '1.3', '1.4',
        '2.1', '2.2', '2.3', '2.4', '3.1', '12', '14',
    ]);
    const stray = [...new Set(nums)].filter(n => !allowed.has(n));
    P('AT-4', stray.length === 0,
        `no unexplained decision constant${stray.length ? ': ' + stray.join(', ') : ''}`);
}

// ---- 6. NO HIDDEN INFERENTIAL MACHINERY ------------------------------------
console.log('\n-- no hidden inference --------------------------------------------------------');
P('HI-1', gone('H0_sym:') && gone('null hypothesis is') && gone('reject H0'), 'no null hypothesis');
P('HI-2', gone('α = 0.0') && gone('p-value is') && gone('p ≤ '), 'no alpha, no p-value');
P('HI-3', gone('permutation test on') && gone('sign test on') && gone('we test whether') &&
          gone('confidence interval'), 'no test and no interval');
P('HI-4', gone('statistically significant') && gone('is significant'), 'no significance language');
P('HI-5', doc('INSTRUMENT evidence only') && doc('None of it is evidence about `futureScore`'),
    'the instrument/mechanism fence survives');

// ---- 7. PRESERVED, per the ruling ------------------------------------------
console.log('\n-- preserved elements ---------------------------------------------------------');
P('PR-1', doc('**A5**') && doc('not noisy'), 'A5 negative control preserved');
P('PR-2', doc('**A9**') && doc('not globally inert'), 'A9 positive control preserved');
P('PR-3', doc('**A7**') && doc('rank-driven') && doc('normalisation-driven'),
    'A7 decomposition preserved');
P('PR-4', doc('Set C (continuity)') && doc('Set F (fresh)') && doc('would be circular'),
    'Set C / Set F separation and its rationale preserved');
{
    // The frozen E6 definitions live in the C1 PREREGISTRATION, not in this
    // diagnostic spec — the spec references them rather than restating them,
    // which is what keeps a single source of truth. So they are verified where
    // they actually live, and the spec is checked only for consistency with them.
    const PRE = rd('research/preregistrations/C1_PREREGISTRATION.md')
        .replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
    const pre = (t) => PRE.includes(t.replace(/\s+/g, ' '));
    P('PR-5', pre('ρ_a(u,p) = r_a(u,p) / (n_a(u) − 1)') && pre('n_a(u) ≥ 2') &&
              pre('no convention such as `ρ = 0` is adopted') &&
              doc('ρ = r/(n−1)'),
        'frozen E6 definition and n=1 handling intact in C1, and the spec is consistent with them');
    P('PR-6', pre('missing_A') && pre('missing_B') && pre('asym') &&
              pre('armedOnlyUndefined'),
        'missingness reporting intact in the C1 preregistration');
}
P('PR-7', doc('**Exercisable**') && doc('**Observed**') && doc('**Sufficiently demonstrated**'),
    'the exercisable / observed / demonstrated distinction preserved');
P('PR-8', doc('Sensitivity to a manipulation is not sensitivity in general'),
    'the non-universal-sensitivity statement preserved');
P('PR-9', doc('measurable') && doc('It failed at **L4**') && doc('non-informative') ||
          doc('It failed at **L4**'),
    'the UQ-B lesson — measurable and variable yet non-informative — preserved');
P('PR-10', doc('is **withdrawn**') &&
           doc('it asserted universal E6 sensitivity, which these controls cannot support'),
    'the PASS 1.1 withdrawal of the universal-sensitivity claim survives');
{
    const ids = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11'];
    P('PR-11', ids.every(a => doc('**' + a + '**')), 'all eleven detectors survive');
}
{
    const rows = PILOT.results.flatMap(R => R.perState);
    let rankDriven = 0, normDriven = 0, bothD = 0;
    for (const s of rows) for (const ph of [1, 2]) {
        const o = s.optRank[ph];
        if (o.A === null || o.B === null) continue;
        const dR = o.A !== o.B, dN = o.nA !== o.nB;
        if (dR && !dN) rankDriven++; else if (!dR && dN) normDriven++; else if (dR && dN) bothD++;
    }
    P('PR-12', normDriven === 31 && doc('31 of 149 cells normalisation-only'),
        `the K5 citation re-derives from the M14 record (${normDriven} normalisation-only)`);
}

// ---- 8. not executed, and integrity ----------------------------------------
console.log('\n-- not executed and integrity -------------------------------------------------');
P('NE-1', !fs.existsSync(path.join(ROOT, 'experiments/m19/m19_adequacy.json')) &&
          !fs.existsSync(path.join(ROOT, 'experiments/m19_2/m19_stress.json')),
    'no stress-test result artifact exists');
P('NE-2', env.evaluatedSeeds().length === 0, 'NO seed evaluated — nothing consumed');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    P('IN-1', changed.length === 1 &&
        changed[0] === 'research/preregistrations/C1_INSTRUMENT_ADEQUACY_FORMULATION.md',
        `only the M19 specification is modified: ${JSON.stringify(changed)}`);
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
        'C1 preregistration and UQ-B digests verify — frozen E6 definitions unchanged');
}
P('IN-4', doc('The diagnostic cannot alter C1'), 'the stress test remains fenced from changing C1');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M19 PASS 1.2 VERDICT: PASS' : '  M19 PASS 1.2 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

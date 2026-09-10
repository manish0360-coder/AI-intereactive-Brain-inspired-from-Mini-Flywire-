// ==========================================================
// M19 PASS 2 — verification of the adequacy FORMULATION
// ==========================================================
// Verifies the SPECIFICATION. It does NOT execute the diagnostic, run any
// agent, or consume any seed. Execution awaits a separate Director ruling.
//
// The load-bearing check is EX-*: every number the memo cites from the M14
// record is re-derived from experiments/m14/m14_attainability.json, so no
// evidence can have been invented or drifted.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { inRegisteredBlock } from '../uqb/protocol.js';
import * as REG from '../registry/consumed.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MEMO = rd('research/preregistrations/C1_INSTRUMENT_ADEQUACY_FORMULATION.md');
const PILOT = JSON.parse(rd('experiments/m14/m14_attainability.json'));
const FLAT = MEMO.replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
const doc = (s) => FLAT.includes(s.replace(/\s+/g, ' '));
const gone = (s) => !FLAT.includes(s.replace(/\s+/g, ' '));

// SUPERSEDED BY experiments/m19_1/verify_clarification.js
//   This verifier encodes the M19 PASS 1 formulation, whose criteria were
//   satisfied by bare existence and whose outcomes were ADEQUATE / MARGINAL /
//   INADEQUATE. PASS 1.1 raised the satisfaction standard and renamed the
//   outcomes under Director authorisation. Running PASS 1's assertions against
//   PASS 1.1 would report a FAIL meaning "the formulation was legitimately
//   revised" — a false alarm for a future reader.
if (!/\*\*Milestone:\*\* M19 PASS 1$/m.test(MEMO)) {
    console.log('M19 PASS 1 verifier: SUPERSEDED — the formulation is no longer PASS 1.');
    console.log('Run experiments/m19_1/verify_clarification.js, authoritative for PASS 1.1.');
    process.exit(0);
}

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};

console.log('='.repeat(78));
console.log('  M19 PASS 2 — adequacy formulation verified (specification only)');
console.log('='.repeat(78) + '\n');

// ---- 1. the four levels are distinguished ---------------------------------
console.log('-- the four properties ------------------------------------------------------');
P('L-1', doc('Mathematical measurability') && doc('Variation') &&
         doc('Informativeness') && doc('Scientific adequacy'),
    'all four properties are named');
P('L-2', doc('L4 ⟹ L3 ⟹ L2 ⟹ L1'),
    'their implication order is stated, so they are not treated as synonyms');
P('L-3', doc('C2 was measurable') && doc('It failed at **L4**'),
    "UQ-B's C2 is diagnosed at the level it actually failed");
P('L-4', doc('target L3 and L4 explicitly'),
    'the criteria are aimed at the levels C2 satisfied but did not clear');

// ---- 2. the derived boundary, re-derived independently --------------------
console.log('\n-- the one derived boundary --------------------------------------------------');
{
    // rho = r/(n-1), r in {0..n-1} => exactly n attainable values
    const attainable = (n) => (n < 2 ? 0 : new Set(
        [...Array(n).keys()].map(r => r / (n - 1))).size);
    const binaryAt = attainable(2) === 2;
    const gradedFrom = (() => { let n = 2; while (attainable(n) < 3) n++; return n; })();
    console.log(`      attainable rho values: n=2 -> ${attainable(2)}, n=3 -> ${attainable(3)}, ` +
                `n=6 -> ${attainable(6)}`);
    P('DB-1', binaryAt && gradedFrom === 3,
        `the binary/graded boundary is re-derived independently as n = ${gradedFrom}`);
    P('DB-2', doc('exactly `n = 3`') && doc('derived, not selected'),
        'the memo states the boundary is derived rather than chosen');
    P('DB-3', doc('a binary E6 would reproduce UQ-B') || doc('reproduce UQ-B'),
        'the boundary is tied to the UQ-B coarseness failure it guards against');
}

// ---- 3. no inferential machinery reintroduced ------------------------------
console.log('\n-- no inference reintroduced -------------------------------------------------');
P('NI-1', gone('H0_sym:') && gone('reject H0') && gone('null hypothesis is'),
    'no null hypothesis is defined');
P('NI-2', gone('α = 0.0') && gone('alpha = 0.0') && gone('p ≤ ') && gone('p-value is'),
    'no alpha and no operative p-value');
P('NI-3', gone('permutation test on') && gone('sign test on') && gone('we test whether'),
    'no statistical test is specified');
P('NI-4', doc('Forbidden throughout') && doc('never by a test on data'),
    'the memo states adequacy is established without testing');
P('NI-5', doc('INSTRUMENT evidence only') &&
          doc('None of it is evidence about `futureScore`'),
    'the instrument/mechanism fence is explicit');

// ---- 4. criteria are existence-based or derived ---------------------------
console.log('\n-- criteria form -------------------------------------------------------------');
{
    const ids = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11'];
    const present = ids.filter(a => doc('**' + a + '**'));
    P('CR-1', present.length === ids.length,
        `all ${ids.length} criteria A1-A11 are present`);
}
P('CR-2', doc('No criterion requires "at least *k*"') || doc('No criterion requires'),
    'the memo declares that no count threshold above one is imposed');
P('CR-3', doc('exactly one** instance') && doc('the unique minimal positive integer'),
    'marginality uses the minimal positive integer, not a chosen bound');
P('CR-4', doc('`MARGINAL`') && doc('does not authorise collection'),
    'MARGINAL escalates rather than permitting collection');
P('CR-5', doc('ADEQUATE') && doc('INADEQUATE'), 'all three outcomes are defined');
P('CR-6', doc('No criterion may be relaxed, and no threshold introduced, after the diagnostic runs'),
    'the anti-tuning rule is explicit');
{
    // scan the criteria tables for numeric constants that are not derived/citations
    // Strip markdown headings first: a subsection number like "3.1" is
    // document structure, not a criterion constant.
    const section = MEMO.slice(MEMO.indexOf('## 3. The adequacy criteria'),
                               MEMO.indexOf('## 4. Fixtures'))
        .split(/\r?\n/).filter(l => !/^#{1,6}\s/.test(l)).join(' ');
    const nums = [...section.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/g)].map(m => m[1]);
    // criterion ids A1-A11; the derived bound n=3; the M14 decomposition
    // citations 24/31/88/149; the cross-reference 2.1; and 71, which is the
    // UQ-B "0/71" citation, not a constant of any criterion.
    const allowed = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
                             '24', '31', '88', '149', '2.1', '71']);
    const stray = [...new Set(nums)].filter(n => !allowed.has(n));
    P('CR-7', stray.length === 0,
        `no unexplained numeric constant appears in the criteria${stray.length ? ': ' + stray.join(', ') : ''}`);
}

// ---- 5. EVERY cited M14 number is re-derived from the record ---------------
console.log('\n-- cited evidence re-derived from the M14 record ------------------------------');
{
    const rows = PILOT.results.flatMap(R => R.perState);
    const cells = rows.flatMap(s => [1, 2].map(ph => s.optRank[ph]));
    const sizes = rows.flatMap(s => [s.poolSizeA, s.poolSizeB]);
    const both = cells.filter(c => c.A !== null && c.B !== null).length;
    const oneOnly = cells.filter(c => (c.A === null) !== (c.B === null)).length;
    const ties = rows.reduce((a, s) => a + s.tiesA + s.tiesB, 0);
    const n3 = sizes.filter(n => n >= 3).length, n2 = sizes.filter(n => n === 2).length,
          n1 = sizes.filter(n => n === 1).length;

    P('EX-1', sizes.length === 152 && doc('152 decision-time pools'), `${sizes.length} pools`);
    P('EX-2', n3 === 145 && n2 === 5 && n1 === 2 &&
              doc('145/152') && doc('5 at `n = 2`') && doc('2 at `n = 1`'),
        `pool sizes re-derived: n>=3 ${n3}, n=2 ${n2}, n=1 ${n1}`);
    P('EX-3', ties === 0 && doc('**0 weight ties**'), `weight ties ${ties}`);
    P('EX-4', both === 149 && oneOnly === 0 && doc('149/152') && doc('**0** one-arm-only'),
        `definedness re-derived: both ${both}, one-arm-only ${oneOnly}`);

    // the rank / normalisation decomposition the memo cites
    let rankDriven = 0, normDriven = 0, bothD = 0, ident = 0;
    for (const s of rows) for (const ph of [1, 2]) {
        const o = s.optRank[ph];
        if (o.A === null || o.B === null) continue;
        const dR = o.A !== o.B, dN = o.nA !== o.nB;
        if (!dR && !dN) ident++; else if (dR && !dN) rankDriven++;
        else if (!dR && dN) normDriven++; else bothD++;
    }
    P('EX-5', rankDriven === 24 && normDriven === 31 && bothD === 88 && ident === 6 &&
              doc('24 rank-driven, 31 normalisation-driven, 88 both, 6 identical'),
        `decomposition re-derived: ${rankDriven}/${normDriven}/${bothD}/${ident}`);

    // the oracle-substitution control's exercisability
    let disagree = 0, exercisable = 0, differed = 0;
    for (const s of rows) {
        if (Number(s.optRank[1].star) === Number(s.optRank[2].star)) continue;
        disagree++;
        if (s.optRank[1].A !== null && s.optRank[2].A !== null) {
            exercisable++;
            if (s.optRank[1].A !== s.optRank[2].A) differed++;
        }
    }
    P('EX-6', disagree === 41 && exercisable === 38 && differed === 38 &&
              doc('41/76') && doc('38/38'),
        `oracle-substitution control re-derived: disagree ${disagree}, differed ${differed}/${exercisable}`);

    const armsDiffer = PILOT.results.every(R => R.fingerprintA !== R.fingerprintB);
    P('EX-7', armsDiffer && doc('4/4'), 'arm separation re-derived');
}

// ---- 6. every criterion is EXERCISABLE (not designed to be unsatisfiable) --
console.log('\n-- criteria are exercisable, and not trivially satisfiable --------------------');
{
    const rows = PILOT.results.flatMap(R => R.perState);
    let anyRankMove = 0, anyNormOnly = 0, distinctR = new Set();
    for (const s of rows) for (const ph of [1, 2]) {
        const o = s.optRank[ph];
        if (o.A === null || o.B === null) continue;
        if (o.A !== o.B) anyRankMove++;
        if (o.A === o.B && o.nA !== o.nB) anyNormOnly++;
        distinctR.add(o.A); distinctR.add(o.B);
    }
    P('EXR-1', anyRankMove > 0, `A6 is exercisable: ${anyRankMove} cells with r_A != r_B`);
    P('EXR-2', anyNormOnly > 0,
        `A7 is non-trivial: ${anyNormOnly} normalisation-only cells exist, so the ` +
        `decomposition could have come out otherwise`);
    P('EXR-3', distinctR.size >= 2, `A10 is exercisable: ${distinctR.size} distinct r values`);
}

// ---- 7. fixtures and seed governance --------------------------------------
console.log('\n-- fixtures and seed governance ----------------------------------------------');
P('FX-1', doc('896066:0`, `896066:1`, `896238:2`, `896329:3'),
    'Set C names exactly the four M14 fixtures');
{
    const m14 = PILOT.fixtures.map(f => `${f.configSeed}:${f.configIndex}`).sort().join(',');
    P('FX-2', m14 === '896066:0,896066:1,896238:2,896329:3',
        `and those are the fixtures the M14 record actually used (${m14})`);
}
P('FX-3', doc('Set F (fresh)') && doc('not used by M14'),
    'a held-out fresh fixture set is specified');
P('FX-4', doc('would be circular') && doc('fixture-specific flattery'),
    'the circularity risk in reusing selection fixtures is stated as the reason for Set F');
P('FX-5', doc('Set C ∪ Set F') && doc('reported as a discrepancy rather than averaged away'),
    'criteria must hold on both sets, with discrepancies disclosed');
P('FX-6', doc('No fixture may lie outside `896xxx`') &&
          doc('`895000–895999` is never touched'),
    'fixtures are confined to 896xxx and the C1 block is excluded');
{
    // the 896xxx territory is consumed-for-studies but permitted for instrument work
    const consumed = REG.isConsumed(896066) && REG.isConsumed(896238);
    const notRegistered = !inRegisteredBlock(896066) && !inRegisteredBlock(896238);
    P('FX-7', consumed && notRegistered && doc('consumed *for studies*'),
        '896xxx is recorded consumed yet is non-registered development territory, as the memo states');
}
P('FX-8', env.evaluatedSeeds().length === 0,
    'NO seed evaluated by this verification — nothing consumed');

// ---- 8. the diagnostic has NOT been run ------------------------------------
console.log('\n-- not executed --------------------------------------------------------------');
P('NE-1', doc('THE DIAGNOSTIC HAS NOT BEEN RUN') && doc('execution awaits'),
    'the memo states the diagnostic has not been run');
P('NE-2', !fs.existsSync(path.join(ROOT, 'experiments/m19/m19_adequacy.json')),
    'no adequacy result artifact exists');
{
    const files = fs.existsSync(path.join(ROOT, 'experiments/m19'))
        ? fs.readdirSync(path.join(ROOT, 'experiments/m19')) : [];
    P('NE-3', files.every(f => /verify_formulation\.js/.test(f)),
        `experiments/m19 contains only the specification verifier: ${JSON.stringify(files)}`);
}

// ---- 9. nothing else changed -----------------------------------------------
console.log('\n-- integrity -----------------------------------------------------------------');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    P('IN-1', changed.length === 0, `no tracked file is modified: ${JSON.stringify(changed)}`);
}
P('IN-2', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/', 'experiments/uqb/', 'experiments/m14/', 'experiments/registry/').trim() === '',
    'production, UQ-B, the M14 record and the registry are untouched');
{
    const d = execFileSync('sha256sum', ['-c', 'C1_PREREGISTRATION.sha256',
        'UQB_PREREGISTRATION.sha256'],
        { cwd: path.join(ROOT, 'research/preregistrations'), encoding: 'utf8' });
    P('IN-3', (d.match(/OK/g) || []).length === 2,
        'the C1 preregistration and UQ-B preregistration digests both verify — E6 unchanged');
}
P('IN-4', doc('The diagnostic cannot alter C1') && doc('can only permit collection, block it, or escalate'),
    'the diagnostic is fenced from changing C1');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M19 PASS 2 VERDICT: PASS' : '  M19 PASS 2 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

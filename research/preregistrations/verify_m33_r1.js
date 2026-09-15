// M33-R1 MEMO GATE — binds M33_R1_GOVERNANCE_RULING.md to an EXECUTED R1 verification run
// and to the EXECUTED behaviour of experiments/registry/typed.js.
//
// Numbers, the mutant table and the status are compared with the output of
// `node experiments/m33/verify_r1.js --json`. The case table in §5 is compared with
// decisions this gate computes itself by calling typed.js, so a memo cannot claim a
// decision the module does not make. Every check is a function of the memo text and is
// run against a deliberately corrupted copy, which it must reject.
//
// MUTATES NOTHING in the repository. Consumes no seed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO = fs.readFileSync(path.join(ROOT, 'research/preregistrations/M33_R1_GOVERNANCE_RULING.md'), 'utf8');

let checks = 0, fails = 0;
const ok = (cond, msg, detail = '') => {
    checks++;
    if (!cond) fails++;
    console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${msg}${detail ? '  — ' + detail : ''}`);
    return cond;
};
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*/g, '').replace(/`/g, '')
                     .replace(/\\\|/g, '|').replace(/\s+/g, ' ');
const fmt = (n) => Number(n).toLocaleString('en-US');

console.log('='.repeat(78));
console.log('  M33-R1 MEMO GATE');
console.log('='.repeat(78));

const R = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'experiments/m33/verify_r1.js'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] }));
const rows = Object.values(R.sections).flat();
const row = (id) => rows.find(r => r.id === id);
const T = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);

// The mutant table row the memo must contain, formatted from the executed report.
export const mutantRow = (m) => {
    const id = m.name.split(' ')[0];
    const label = m.name.slice(m.name.indexOf(' ') + 1).replace(/ -> .*$/, '');
    let outcome;
    if (m.reexpressedAs) outcome = `re-expressed as ${m.reexpressedAs.split(' ')[0]}, caught by ${m.by.join(', ')}`;
    else if (m.control) outcome = 'no-op control survives';
    else if (!m.caught && m.redundantWith) {
        const c = R.mutants.find(x => x.name === m.redundantWith);
        outcome = `survives — second guard; ${m.redundantWith.split(' ')[0]} caught by ${c.by.join(', ')}`;
    } else outcome = `caught by ${m.by.join(', ')}`;
    return `| ${id} ${label} | ${outcome} |`;
};

// Decisions computed here, independently of verify_r1.js.
const decisions = (() => {
    const REC = (value, study, status = 'registered') => ({ namespace: 'trajectory', value, study, status,
        executed: true, authorization: 'gate', artifact: 'gate', why: 'gate' });
    const AUTH = (value, fromStudy, toStudy) => ({ namespace: 'trajectory', value, fromStudy, toStudy,
        authorization: 'gate', why: 'gate' });
    const go = (reg, v, study, category = 'registered', extra = {}) => {
        try { return reg.checkUse(T.trajectorySeed(v), { study, category, ...extra }).decision; }
        catch (e) { return e.code; }
    };
    const A = T.createTrajectoryRegistry({ records: [REC(42, 'S')], heldOut: [] });
    const H = T.createTrajectoryRegistry({ records: [REC(42, 'H')], heldOut: [], authorizations: [AUTH(42, 'H', 'S')] });
    const HS = T.createTrajectoryRegistry({ records: [REC(42, 'H'), REC(42, 'S')], heldOut: [],
                                            authorizations: [AUTH(42, 'H', 'S')] });
    return {
        'same study, same raw value': go(A, 42, 'S'),
        'same study, ARMED and ABLATED': [go(A, 42, 'S', 'registered', { arm: 'ARMED' }),
                                          go(A, 42, 'S', 'registered', { arm: 'ABLATED' })],
        'different study, no authorization': go(A, 42, 'X'),
        'different study, authorized, exact value': go(H, 42, 'S'),
        'after authorized reuse: holder and authorized study rerun': [go(HS, 42, 'H'), go(HS, 42, 'S')],
        'third study': go(H, 42, 'T'),
        'alias of the authorized value': go(H, 42 + 2 ** 32, 'S'),
        'authorized, different category': go(H, 42, 'S', 'development'),
        'same study, raw alias': [go(A, 42 + 2 ** 32, 'S'),
            go(T.createTrajectoryRegistry({ records: [REC(1, 'S')], heldOut: [] }), 0, 'S')],
        'production alias': [go(T.trajectory, 3080949816, 'NEW'), go(T.trajectory, 3080949816, 'M7-substrate')],
    };
})();

const C = {
    headline: (M) => flat(M).includes(`${R.total}/${R.total} passed, 0 failed`),
    mutantTable: (M) => R.mutants.every(m => M.split(/\r?\n/).includes(mutantRow(m))),
    lagNumbers: (M) => {
        const F = flat(M);
        const h1 = row('H1')?.msg.match(/stream starts (\d+) > largest recorded per-run draw count (\d+)/);
        const h2 = row('H2')?.msg.match(/expected overlapping pairs ([\d.]+)/);
        const h3 = row('H3')?.msg.match(/consumes exactly (\d+) draws/);
        return !!(h1 && h2 && h3) && F.includes(fmt(h1[1])) && F.includes(`reach ${fmt(h1[2])}`) &&
            F.includes(`about ${h2[1]} expected`) && F.includes(`exactly ${h3[1]} draws`);
    },
    crossNamespace: (M) => {
        const F = flat(M);
        const hits = row('H4')?.msg.match(/overlap exactly (\[.*\])$/);
        if (!hits) return false;
        const list = JSON.parse(hits[1]);
        return list.length === 2 && list.every(h => {
            const [, v, stream, c] = h.match(/^M31:(\d+)\/(\w+)~(\d+)$/);
            return F.includes(`${v}/${stream}`) && F.includes(`config ${c}`);
        }) && F.includes('overlap none of 5500 historical configuration streams');
    },
    caseTable: (M) => {
        const F = flat(M);
        const cell = (label) => { const m = F.match(new RegExp(`\\| ${label.replace(/[()+]/g, '.')}[^|]* \\| ([^|]+) \\|`));
                                  return m ? m[1].trim() : null; };
        const d = decisions;
        return cell('same study, same raw value') === d['same study, same raw value'] &&
            cell('same study, ARMED and ABLATED') === `${d['same study, ARMED and ABLATED'][0]}` &&
            d['same study, ARMED and ABLATED'].every(x => x === 'REPRODUCTION') &&
            cell('different study, no authorization') === d['different study, no authorization'] &&
            cell('different study, authorized, exact value') === d['different study, authorized, exact value'] &&
            cell('after authorized reuse: holder and authorized study rerun') === 'REPRODUCTION, both' &&
            d['after authorized reuse: holder and authorized study rerun'].every(x => x === 'REPRODUCTION') &&
            cell('third study') === d['third study'] &&
            cell('alias of the authorized value') === d['alias of the authorized value'] &&
            cell('authorized, different category') === d['authorized, different category'] &&
            cell('same study, raw alias') === d['same study, raw alias'][0] &&
            d['same study, raw alias'].every(x => x === 'ALIASED_SOURCE') &&
            cell('production alias') === `${d['production alias'][0]}; ${d['production alias'][1]}`;
    },
    status: (M) => {
        const blocks = M.match(/^> # M33-(GREEN|YELLOW|HOLD|RED)$/gm) || [];
        return blocks.length === 2 && blocks.every(b => b.endsWith('M33-YELLOW')) && R.fails === 0;
    },
    qlag: (M) => {
        const F = flat(M);
        return F.includes('Q-LAG. For a study whose replicate unit is the trajectory seed') &&
            F.includes('Independent scientific review of Q-LAG') && row('K4')?.ok === true;
    },
    authorizations: (M) => flat(M).includes('Committed authorizations: none.') &&
        T.TRAJECTORY_AUTHORIZATIONS.length === 0 && row('R1')?.ok === true,
    integrity: (M) => {
        const F = flat(M);
        return F.includes('Registered seeds consumed: 0') && F.includes('| pushed | NO |') &&
            F.includes('| C1 changed | NO |') && F.includes('| UQ-B changed | NO |') &&
            F.includes('| production changed | NO |') && F.includes('895000–895999 not repaired') &&
            ['P1', 'P2', 'P3', 'P4', 'P5', 'R2'].every(id => row(id)?.ok === true);
    },
    defect: (M) => flat(M).includes('treated a different raw value that shares a source inside the same study as REPRODUCTION') &&
        decisions['same study, raw alias'].every(x => x === 'ALIASED_SOURCE'),
};

console.log('\n-- executed R1 verifier ------------------------------------------------------');
ok(R.verdict === 'VERIFIED' && R.fails === 0, 'experiments/m33/verify_r1.js verdict VERIFIED', `${R.total - R.fails}/${R.total}`);
ok(R.mutants.every(m => !m.harness), 'no mutant hit a harness defect');
ok(R.mutants.filter(m => !m.control && !m.caught).every(m => m.redundantWith &&
    R.mutants.find(x => x.name === m.redundantWith)?.caught),
    'every surviving non-control mutant is backed by a caught combined mutant');

console.log('\n-- memo bound to execution ---------------------------------------------------');
for (const [name, fn] of Object.entries(C)) ok(fn(MEMO), `memo ${name} matches execution`);

console.log('\n-- anti-vacuity ---------------------------------------------------------------');
{
    const firstCaught = R.mutants.find(m => !m.control && m.caught && !m.reexpressedAs);
    const corrupt = {
        headline: MEMO.replaceAll(`${R.total}/${R.total}`, `${R.total - 1}/${R.total - 1}`),
        mutantTable: MEMO.replace(mutantRow(firstCaught), mutantRow({ ...firstCaught, by: firstCaught.by.slice(1) })),
        lagNumbers: MEMO.replaceAll('21.98', '2.198'),
        crossNamespace: MEMO.replaceAll('config `897104`', 'config `897105`'),
        caseTable: MEMO.replace('| different study, authorized, exact value | AUTHORIZED_REUSE |',
                                '| different study, authorized, exact value | AVAILABLE |'),
        status: MEMO.replace('> # M33-YELLOW\n> **Governance rule closed', '> # M33-GREEN\n> **Governance rule closed'),
        qlag: MEMO.replaceAll('Independent scientific review of Q-LAG', 'Proceed to C × R'),
        authorizations: MEMO.replace('Committed authorizations: **none.**', 'Committed authorizations: one.'),
        integrity: MEMO.replace('| pushed | **NO** |', '| pushed | **YES** |'),
        defect: MEMO.replace('inside the same study', 'across studies'),
    };
    for (const [name, text] of Object.entries(corrupt)) {
        ok(text !== MEMO && C[name](text) === false, `corrupting the memo breaks '${name}'`);
    }
    ok(Object.keys(corrupt).length === Object.keys(C).length, 'every memo check has a corruption',
        `${Object.keys(corrupt).length}/${Object.keys(C).length}`);
}

console.log('\n' + '='.repeat(78));
console.log(`  M33-R1 MEMO GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'MEMO VERIFIED' : 'MEMO NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

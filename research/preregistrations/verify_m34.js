// M34 MEMO GATE — binds M34_REGISTRY_ACCOUNTING_REPAIR.md to executed behaviour.
//
// Three independent sources, none of them text matching alone:
//   1. `node experiments/m34/verify.js --json` — the implementation verifier;
//   2. this gate's OWN calls into consumed_after_c1.js and consumed.js, so a memo cannot
//      claim a decision the modules do not make;
//   3. the fast historical registry verifiers the memo tabulates, re-run here.
// Every memo check is a function of the text and must reject a corrupted copy.
//
// MUTATES NOTHING. Consumes no seed, runs no collection.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO = fs.readFileSync(path.join(ROOT, 'research/preregistrations/M34_REGISTRY_ACCOUNTING_REPAIR.md'), 'utf8');

let checks = 0, fails = 0;
const ok = (cond, msg, detail = '') => {
    checks++;
    if (!cond) fails++;
    console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${msg}${detail ? '  — ' + detail : ''}`);
    return cond;
};
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*/g, '').replace(/`/g, '')
                     .replace(/\s+/g, ' ');
const fmt = (n) => Number(n).toLocaleString('en-US');

console.log('='.repeat(78));
console.log('  M34 MEMO GATE');
console.log('='.repeat(78));

const R = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'experiments/m34/verify.js'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] }));
const rows = Object.values(R.sections).flat();
const row = (id) => rows.find(r => r.id === id);

const NEW = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed_after_c1.js')).href);
const OLD = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed.js')).href);
const TYPED = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);
const C1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/c1/results/c1_results.json'), 'utf8'));

const mutantRow = (m) => `| ${m.name.split(' ')[0]} ${m.name.slice(m.name.indexOf(' ') + 1)} | ` +
    `${m.control ? 'no-op control survives' : 'caught by ' + m.by.join(', ')} |`;

// fast historical verifiers the memo tabulates
const runVerifier = (rel) => {
    try {
        const out = execFileSync(process.execPath, [path.join(ROOT, rel)],
            { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
        return { code: 0, out };
    } catch (e) { return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }; }
};
const HIST = Object.fromEntries(['experiments/m18/verify_registry.js', 'research/preregistrations/verify_m21.js',
    'research/preregistrations/verify_m30.js', 'research/preregistrations/verify_m31.js',
    'research/preregistrations/verify_m32.js'].map(f => [f, runVerifier(f)]));

const C = {
    headline: (M) => flat(M).includes(`${R.total}/${R.total} passed, 0 failed`),
    mutantTable: (M) => R.mutants.every(m => M.split(/\r?\n/).includes(mutantRow(m))) &&
        flat(M).includes(`${R.mutants.filter(m => !m.control).length} of ` +
                         `${R.mutants.filter(m => !m.control).length} semantic mutants caught`),
    blockConsumed: (M) => {
        let n = 0;
        for (let s = 895000; s <= 895999; s++) if (NEW.isConsumed(s)) n++;
        return n === 1000 && flat(M).includes('all 1000 seeds consumed') &&
            flat(M).includes('evaluated 1000/1000');
    },
    boundaries: (M) => {
        const F = flat(M);
        return NEW.isConsumed(894999) === false && NEW.isConsumed(895000) === true &&
            NEW.isConsumed(895999) === true && NEW.isConsumed(896000) === true &&
            NEW.rangeFor(896000).lo === 896000 && NEW.isHeldOut(895500) === false &&
            F.includes('894999 not consumed') && F.includes('895000 and 895999 consumed by C1') &&
            F.includes('896000 consumed by the 896xxx range, not by C1');
    },
    evaluation: (M) => {
        const F = flat(M), e = NEW.C1_BLOCK.evaluation;
        return e.evaluatedCount === C1.seedCensus.evaluatedCount &&
            e.acceptedConfigurations === C1.accounting.dispositions.ACCEPTED &&
            e.runsExecuted === C1.accounting.runsExecuted &&
            F.includes(`${fmt(R.evaluated.rows)} candidate rows carry exactly ` +
                       `${fmt(R.evaluated.distinct)} distinct seeds`) &&
            F.includes(`${e.acceptedConfigurations} accepted, ${e.runsExecuted} runs`);
    },
    conservative896: (M) => NEW.DEV_FIXTURE_EVALUATION.evaluatedCount === null &&
        NEW.evaluationFor(896500).evaluatedCount === null &&
        flat(M).includes('evaluation count not asserted'),
    compatibility: (M) => {
        let diff = 0;
        for (let s = 0; s <= 1_000_000; s++) if (OLD.isConsumed(s) !== NEW.isConsumed(s)) diff++;
        return diff === 1000 && OLD.isConsumed(895500) === false &&
            flat(M).includes('the only decisions that change are the 1000 C1 seeds');
    },
    typedGap: (M) => TYPED.config.isConsumed(TYPED.configSeed(895500)) === false &&
        flat(M).includes('still reports 895xxx as available') && row('F1')?.ok === true,
    status: (M) => {
        const blocks = M.match(/^> # M34-(GREEN|YELLOW|HOLD)$/gm) || [];
        return blocks.length === 2 && blocks.every(b => b.endsWith('M34-YELLOW')) && R.fails === 0;
    },
    integrity: (M) => {
        const F = flat(M);
        return F.includes('| registered experimental seeds consumed = 0 | YES') &&
            F.includes('| UQ-B unchanged | YES') && F.includes('| C1 unchanged | YES') &&
            F.includes('| production unchanged | YES') && F.includes('| M33 / M33-R1 unchanged | YES') &&
            F.includes('| pushed | NO |') && ['P1', 'P2', 'P4', 'P5'].every(id => row(id)?.ok === true);
    },
    historical: (M) => {
        const F = flat(M);
        const m21 = HIST['research/preregistrations/verify_m21.js'].out.match(/(\d+)\/(\d+) checks passed/);
        return HIST['experiments/m18/verify_registry.js'].out.includes('M18 VERDICT: PASS') &&
            F.includes('experiments/m18/verify_registry.js | PASS') &&
            [['verify_m30.js', 101], ['verify_m31.js', 96], ['verify_m32.js', 108]].every(([f, n]) =>
                HIST[`research/preregistrations/${f}`].out.includes(`${n}/${n} passed, 0 FAILED`) &&
                F.includes(`${n}/${n}`)) &&
            // Bind BOTH numbers: the total alone would let the memo claim a verifier is green
            // when it is not.
            !!m21 && m21[1] === m21[2] && F.includes(`${m21[1]}/${m21[2]} after the commit`);
    },
};

console.log('\n-- executed M34 verifier -----------------------------------------------------');
ok(R.verdict === 'VERIFIED' && R.fails === 0, 'experiments/m34/verify.js VERIFIED', `${R.total - R.fails}/${R.total}`);
ok(R.mutants.every(m => !m.harness), 'no mutant hit a harness defect');
ok(R.mutants.filter(m => !m.control).every(m => m.caught), 'every semantic mutant is caught');
ok(R.mutants.filter(m => m.control).length === 1 && !R.mutants.find(m => m.control).caught,
    'exactly one no-op control, and it survives');

console.log('\n-- memo bound to execution ---------------------------------------------------');
for (const [name, fn] of Object.entries(C)) ok(fn(MEMO), `memo ${name} matches execution`);

console.log('\n-- anti-vacuity ---------------------------------------------------------------');
{
    const first = R.mutants.find(m => !m.control);
    const corrupt = {
        headline: MEMO.replaceAll(`${R.total}/${R.total}`, `${R.total - 1}/${R.total - 1}`),
        mutantTable: MEMO.replace(mutantRow(first), mutantRow({ ...first, by: first.by.slice(1) })),
        blockConsumed: MEMO.replaceAll('evaluated **1000/1000**', 'evaluated **999/1000**'),
        boundaries: MEMO.replaceAll('894999 not consumed', '894999 consumed'),
        evaluation: MEMO.replaceAll('70 accepted, 140 runs', '70 accepted, 141 runs'),
        conservative896: MEMO.replaceAll('**evaluation count not asserted**', 'evaluation count 1000'),
        compatibility: MEMO.replaceAll('the only decisions that change are the 1000 C1 seeds',
                                       'no decisions change'),
        typedGap: MEMO.replaceAll('still reports 895xxx as available', 'now refuses 895xxx'),
        status: MEMO.replace('> # M34-YELLOW\n> **The accounting repair', '> # M34-GREEN\n> **The accounting repair'),
        integrity: MEMO.replace('| pushed | **NO** |', '| pushed | **YES** |'),
        historical: MEMO.replace('| `research/preregistrations/verify_m30.js` | 101/101 |',
                                 '| `research/preregistrations/verify_m30.js` | 100/100 |'),
    };
    for (const [name, text] of Object.entries(corrupt)) {
        ok(text !== MEMO && C[name](text) === false, `corrupting the memo breaks '${name}'`);
    }
    ok(Object.keys(corrupt).length === Object.keys(C).length, 'every memo check has a corruption',
        `${Object.keys(corrupt).length}/${Object.keys(C).length}`);
}

console.log('\n' + '='.repeat(78));
console.log(`  M34 MEMO GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'MEMO VERIFIED' : 'MEMO NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

// M33 MEMO GATE — binds M33_TYPED_NAMESPACE_REGISTRY.md to an EXECUTED verification run.
//
// The implementation verifier is experiments/m33/verify.js. This gate runs it (--json)
// and requires every number, mutant attribution, record and status the memo states to
// equal what that run produced. Checks are functions of the memo text so the anti-vacuity
// section can run them against deliberately corrupted copies.
//
// This gate MUTATES NOTHING in the repository. The verifier it runs writes only to a
// temp directory and consumes no seed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO_PATH = path.join(ROOT, 'research/preregistrations/M33_TYPED_NAMESPACE_REGISTRY.md');
const MEMO = fs.readFileSync(MEMO_PATH, 'utf8');

let checks = 0, fails = 0;
const ok = (cond, msg, detail = '') => {
    checks++;
    if (!cond) fails++;
    console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${msg}${detail ? '  — ' + detail : ''}`);
    return cond;
};
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '').replace(/`/g, '')
                     .replace(/\s+/g, ' ');

console.log('='.repeat(78));
console.log('  M33 MEMO GATE');
console.log('='.repeat(78));

// ── executed run ───────────────────────────────────────────────────────────────
let R;
{
    const out = execFileSync(process.execPath, [path.join(ROOT, 'experiments/m33/verify.js'), '--json'],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] });
    R = JSON.parse(out);
}
const T = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);
const V = await import(pathToFileURL(path.join(ROOT, 'experiments/m33/verify.js')).href);
const rows = Object.values(R.sections).flat();
const row = (id) => rows.find(r => r.id === id);
const num = (id, re) => { const m = row(id)?.msg.match(re); return m ? m[1] : null; };

// ── checks, each a function of memo text ───────────────────────────────────────────
const C = {
    headline: (M) => {
        const F = flat(M);
        return F.includes(`${R.total}/${R.total} checks`) && F.includes(`${R.total}/${R.total} passed, 0 failed`);
    },
    window: (M) => flat(M).includes(`0..1,000,000`) && num('C1', /exhaustive 0\.\.(\d+)/) === '1000000',
    probes: (M) => flat(M).includes(`${num('C2', /(\d+) probes/)} probes, 0 mismatches`),
    samples: (M) => {
        const n = Number(num('C3', /and (\d+) bounded samples/));
        return flat(M).includes(`${n.toLocaleString('en-US')} bounded samples`);
    },
    allowlist: (M) => {
        const F = flat(M);
        return F.includes(`${R.allowlist.length} files at base import a governance module`) &&
               F.includes(`the ${R.allowlist.length} historical importers`);
    },
    mutantCounts: (M) => {
        const semantic = R.mutants.filter(m => !m.control);
        const caught = semantic.filter(m => m.caught).length;
        const F = flat(M);
        return F.includes(`${R.mutants.length} mutants (${caught} caught by named semantic checks, 1 no-op control`) &&
               F.includes(`${caught} of ${semantic.length} semantic mutants are caught by named checks`);
    },
    mutantTable: (M) => R.mutants.every(m => {
        const id = m.name.split(' ')[0];
        const line = M.split(/\r?\n/).find(l => l.startsWith(`| ${id} `) || l.startsWith(`| **${id} `));
        if (!line) return false;
        if (m.control) return !m.caught && /survives/.test(line);
        return m.caught && line.trim().endsWith(`| ${m.by.join(', ')} |`);
    }),
    records: (M) => {
        const F = flat(M);
        const m7 = T.TRAJECTORY_RECORDS.filter(r => r.study === 'M7-substrate').map(r => r.value);
        const m31 = T.TRAJECTORY_RECORDS.filter(r => r.study === 'M31').map(r => r.value);
        return m7.length === 1 && F.includes(`| ${m7[0]} | M7-substrate | registered | yes |`) &&
               F.includes(`| ${m31.join(', ')} | M31 | development | yes |`) &&
               T.TRAJECTORY_RECORDS.length === m7.length + m31.length;
    },
    oracle: (M) => {
        const F = flat(M);
        return R.oracleChain.length === 7 && R.oracleChain.includes('experiments/registry/consumed.js') &&
               ['uqb', 'uqa', 'q1', 'm8'].every(s => R.oracleChain.includes(`experiments/${s}/protocol.js`)) &&
               ['q1', 'm8'].every(s => R.oracleChain.includes(`experiments/${s}/instrument.js`)) &&
               F.includes('materialised from base 976904b with git show');
    },
    files: (M) => {
        const F = flat(M);
        return V.M33_FILES.every(f => F.includes(`| ${f} | new |`)) &&
               R.changed.every(f => V.M33_FILES.includes(f));
    },
    status: (M) => {
        const found = [...new Set(M.match(/M33-(GREEN|YELLOW|HOLD|RED)/g) || [])];
        const blocks = M.match(/^> # M33-(GREEN|YELLOW|HOLD|RED)$/gm) || [];
        return found.length === 1 && blocks.length === 2 && found[0] === 'M33-YELLOW' && R.fails === 0;
    },
    caseD: (M) => {
        const F = flat(M);
        return F.includes('by no second study') &&
               F.includes('permitted if independently authorized') &&
               F.includes('Needs a Director ruling') &&
               row('T4')?.ok === true && /REFUSED/.test(row('T4').msg);
    },
    governance: (M) => {
        const F = flat(M);
        return F.includes('Registered seeds consumed: 0') && F.includes('895000–895999 not repaired') &&
               F.includes('| pushed | NO |') && F.includes('| C1 changed | NO |') &&
               F.includes('| UQ-B changed | NO |') && row('C7')?.ok && row('P2')?.ok && row('P4')?.ok;
    },
    aliasing: (M) => flat(M).includes('20260819000 and 3080949816') && row('T11')?.ok === true,
    residual: (M) => flat(M).includes('A raw isHeldOut(identity) returns false (N13)') && row('N13')?.ok === true,
};

console.log('\n-- executed verifier --------------------------------------------------------');
ok(R.verdict === 'VERIFIED' && R.fails === 0, 'experiments/m33/verify.js verdict VERIFIED, 0 failures',
    `${R.total - R.fails}/${R.total}`);
ok(R.mutants.filter(m => !m.control).every(m => m.caught && !m.by.some(b => /^threw/.test(b))),
    'every semantic mutant is caught by a named check, not by an escaping exception');
ok(R.mutants.filter(m => m.control).length === 1 && !R.mutants.find(m => m.control).caught,
    'exactly one no-op control, and it survives');

console.log('\n-- memo bound to the executed run -------------------------------------------');
for (const [name, fn] of Object.entries(C)) ok(fn(MEMO), `memo ${name} matches execution`);

console.log('\n-- anti-vacuity: each check must FAIL on a corrupted memo ---------------------');
{
    const firstMutant = R.mutants.find(m => !m.control);
    const corrupt = [
        ['headline', MEMO.replaceAll(`${R.total}/${R.total}`, `${R.total - 1}/${R.total - 1}`)],
        ['window', MEMO.replaceAll('0..1,000,000', '0..900,000')],
        ['probes', MEMO.replace(/(\d+) probes, 0 mismatches/, (m, n) => `${Number(n) + 3} probes, 0 mismatches`)],
        ['samples', MEMO.replaceAll('400,018 bounded samples', '400,000 bounded samples')],
        ['allowlist', MEMO.replaceAll(`${R.allowlist.length} files at base`, `${R.allowlist.length - 1} files at base`)],
        ['mutantCounts', MEMO.replace(/(\d+) of (\d+) semantic mutants/, (m, a, b) => `${a - 1} of ${b} semantic mutants`)],
        ['mutantTable', MEMO.replace(`| ${firstMutant.by.join(', ')} |`, `| ${firstMutant.by.slice(1).join(', ')} |`)],
        ['records', MEMO.replace('`20261819003`, `20262819003` | M31', '`20261819003` | M31')],
        ['oracle', MEMO.replace('materialised from base `976904b` with `git show`', 'read from the working tree')],
        ['files', MEMO.replace('| `research/preregistrations/verify_m33.js` | **new** |', '')],
        ['status', MEMO.replace('> # M33-YELLOW\n> **Implementation', '> # M33-GREEN\n> **Implementation')],
        ['caseD', MEMO.replaceAll('by **no second study**', 'by another study')],
        ['governance', MEMO.replace('| pushed | **NO** |', '| pushed | **YES** |')],
        ['aliasing', MEMO.replaceAll('`3080949816`', '`3080949817`')],
        ['residual', MEMO.replace('A raw `isHeldOut(identity)` returns `false` (N13)', 'Raw predicates refuse identities')],
    ];
    for (const [name, text] of corrupt) {
        ok(text !== MEMO && C[name](text) === false, `corrupting the memo breaks '${name}'`);
    }
    ok(corrupt.length === Object.keys(C).length, 'every memo check has an anti-vacuity mutation',
        `${corrupt.length}/${Object.keys(C).length}`);
}

console.log('\n' + '='.repeat(78));
console.log(`  M33 MEMO GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'MEMO VERIFIED' : 'MEMO NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

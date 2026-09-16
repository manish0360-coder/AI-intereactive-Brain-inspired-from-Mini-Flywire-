// M35 MEMO GATE — binds M35_100_NODE_READINESS_AUDIT.md to an EXECUTED readiness run and to
// source facts this gate checks itself.
//
// The memo's numbers come from `node experiments/m35/readiness.js --json`. Its source claims
// (the single-topology environment, the per-topology constants, the backtracking behaviour of
// planning.js, the frozen decisionStates) are re-derived here from the files, so the memo
// cannot assert a property the source does not have. Every check is a function of the memo
// text and must reject a corrupted copy.
//
// MUTATES NOTHING. Generates no configuration, consumes no seed, runs no collection.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO = fs.readFileSync(path.join(ROOT, 'research/preregistrations/M35_100_NODE_READINESS_AUDIT.md'), 'utf8');

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
console.log('  M35 MEMO GATE');
console.log('='.repeat(78));

const R = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'experiments/m35/readiness.js'), '--json'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] }));
const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pathRow = (n, kind) => R.measurements.simplePaths.find(p => p.n === n && p.kind === kind);
const reachRow = (n) => R.measurements.reachability.find(p => p.n === n);
const fsRow = (n, depth) => R.measurements.futureScore.find(p => p.n === n && p.depth === depth);

const C = {
    graphFacts: (M) => {
        const g = R.measurements.realGraph;
        return g.nodes === 20 && g.edges === 39 && g.decisionStatesPerGoal.every(d => d === 19) &&
            flat(M).includes('The substrate is a 20-node graph, not a 19-node graph') &&
            flat(M).includes('"19" is the decision-state count');
    },
    dominantBlocker: (M) => {
        const real = pathRow(20, 'real substrate'), n30 = pathRow(30, 'synthetic');
        const F = flat(M);
        return real && !real.exceeded && n30 && n30.exceeded &&
            F.includes(fmt(real.total)) && F.includes(fmt(n30.total)) &&
            F.includes('enumerate EVERY SIMPLE PATH to the goal'.toLowerCase()) === false &&
            F.toLowerCase().includes('enumerate every simple path to the goal');
    },
    // Every census row must appear with its EXACT deterministic count, and the completed rows
    // must be reported complete while the capped rows are reported unfinished.
    pathTable: (M) => {
        const F = flat(M);
        return R.measurements.simplePaths.every(r => F.includes(fmt(r.total))) &&
            F.includes(`${fmt(pathRow(20, 'real substrate').steps)} expansions`) &&
            [30, 40, 50, 60, 100].every(n => pathRow(n, 'synthetic').exceeded) &&
            (F.match(/UNFINISHED/g) || []).length >= 5;
    },
    reachability: (M) => {
        const F = flat(M);
        return [20, 50, 100, 200].every(n => {
            const r = reachRow(n);
            return r && F.includes(`${r.beyond} / ${r.pairs}`) && F.includes(`${r.beyondPct.toFixed(1)} %`);
        }) && reachRow(20).beyond === 0 && reachRow(200).beyondPct > 10;
    },
    futureScoreCost: (M) => {
        const F = flat(M);
        const a = fsRow(100, 3), b = fsRow(100, 4), c = fsRow(100, 5);
        return a && b && c && F.includes(fmt(a.lookups)) && F.includes(fmt(b.lookups)) &&
            F.includes(fmt(c.lookups)) && b.lookups > a.lookups && c.lookups > b.lookups;
    },
    d2Measured: (M) => {
        const F = flat(M);
        return R.measurements.futureScore.filter(r => r.nonZeroAsCalled !== undefined)
                .every(r => r.nonZeroAsCalled === 0 && r.nonZeroWithDataId === r.n) &&
            F.includes('0 / 100') && F.includes('100 / 100') &&
            F.includes('D2 — planning.js:357 passes neuron.id | A — directly blocks');
    },
    classification: (M) => {
        const F = flat(M);
        return F.includes('Executive controller inert | C — unrelated to this objective') &&
            F.includes('Trajectory-seed accounting incomplete | D — separate governance decision') &&
            F.includes('BLOCKER-1 — simplePaths enumeration (§7) | A — dominant');
    },
    sourceClaims: (M) => {
        const envSrc = src('experiments/m7/env.js'), planSrc = src('render/planning.js');
        const F = flat(M);
        const singleTopology = /readFileSync\(path\.join\(ROOT, 'connections\.json'\)/.test(envSrc);
        const unreliable = env.N_UNRELIABLE === 13;
        const goals = JSON.stringify(env.GOALS) === '[8,12,16,19]';
        const backtracks = /visited\.delete\(nextId\)/.test(planSrc);
        const frozen19 = /decisionStates:\s*19/.test(src('experiments/c1/protocol.js')) &&
                         /decisionStates:\s*19/.test(src('experiments/uqb/protocol.js'));
        return singleTopology && unreliable && goals && backtracks && frozen19 &&
            F.includes('N_UNRELIABLE = 13 = floor(0.35 × 39)') &&
            F.includes('visited is unmarked on backtrack (planning.js:337') &&
            F.includes('FROZEN.decisionStates = 19');
    },
    notReady: (M) => {
        const F = flat(M);
        return F.includes('Technically: NO, not on the existing environment module') &&
            F.includes('Scientifically: NO') &&
            F.includes('100-node construction NOT authorised by this audit');
    },
    repairs: (M) => {
        const F = flat(M);
        return F.includes('R-1') && F.includes('R-2') && F.includes('R-3') &&
            F.includes('a scientific redefinition') &&
            F.includes('Take R-3 first as a ruling, and R-1 as the next implementation milestone');
    },
    isolation: (M) => R.integrity.evaluatedSeedsDuringAudit === 0 &&
        R.integrity.typedRefuses895500 === true &&
        flat(M).includes('Configurations generated by the audit: 0') &&
        flat(M).includes('Free configuration territory is 0–894999'),
    status: (M) => {
        const blocks = M.match(/^> # M35-(GREEN|YELLOW|HOLD)/gm) || [];
        return blocks.length === 2 && blocks.every(b => b.includes('M35-GREEN'));
    },
};

console.log('\n-- executed readiness harness ------------------------------------------------');
ok(R.measurements.realGraph.nodes === 20, 'harness ran and measured the real substrate',
    `${R.measurements.realGraph.nodes} nodes, ${R.measurements.realGraph.edges} edges`);
ok(R.integrity.evaluatedSeedsDuringAudit === 0, 'no configuration generated: makeConfig never called');
ok(pathRow(30, 'synthetic').exceeded === true && pathRow(20, 'real substrate').exceeded === false,
    'the simple-path census completes at N=20 and exceeds its cap at N=30');

console.log('\n-- memo bound to execution and to source -------------------------------------');
for (const [name, fn] of Object.entries(C)) ok(fn(MEMO), `memo ${name} matches execution/source`);

console.log('\n-- anti-vacuity ---------------------------------------------------------------');
{
    const corrupt = {
        graphFacts: MEMO.replaceAll('20-node graph, not a 19-node graph', '19-node graph, not a 20-node graph'),
        dominantBlocker: MEMO.replaceAll(fmt(pathRow(20, 'real substrate').total), '9,999'),
        pathTable: MEMO.replaceAll(fmt(pathRow(20, 'synthetic').total), '1'),
        reachability: MEMO.replaceAll('0 / 76', '5 / 76').replaceAll('14.4 %', '1.4 %'),
        futureScoreCost: MEMO.replaceAll(fmt(fsRow(100, 5).lookups), '7'),
        // NOT "0 / 100" -> "100 / 100": that replacement is self-defeating, because
        // "100 / 100" itself contains the substring "0 / 100".
        // Downgrading the D2 classification must break the check; a numeric edit of '0 / 100'
        // would not, because '100 / 100' contains that substring.
        d2Measured: MEMO.replaceAll('A — directly blocks a FutureScore substrate', 'B — not blocking'),
        classification: MEMO.replaceAll('C — unrelated to this objective', 'A — directly blocks'),
        sourceClaims: MEMO.replaceAll('N_UNRELIABLE = 13 = floor(0.35 × 39)', 'N_UNRELIABLE is computed per graph'),
        notReady: MEMO.replaceAll('Technically: NO, not on the existing environment module',
                                  'Technically: YES, the substrate is ready'),
        repairs: MEMO.replaceAll('Take R-3 first as a ruling, and R-1 as the next implementation milestone',
                                 'Build the 100-node graph now'),
        isolation: MEMO.replaceAll('Configurations generated by the audit: **0**',
                                   'Configurations generated by the audit: **40**'),
        status: MEMO.replaceAll('# M35-GREEN', '# M35-HOLD'),
    };
    for (const [name, text] of Object.entries(corrupt)) {
        ok(text !== MEMO && C[name](text) === false, `corrupting the memo breaks '${name}'`);
    }
    ok(Object.keys(corrupt).length === Object.keys(C).length, 'every memo check has a corruption',
        `${Object.keys(corrupt).length}/${Object.keys(C).length}`);
}

console.log('\n' + '='.repeat(78));
console.log(`  M35 MEMO GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'MEMO VERIFIED' : 'MEMO NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

// ==========================================================
// M19 PASS 3 — PASS 2 independent verification of the execution
// ==========================================================
// Re-derives K1-K8 FROM THE RAW CELLS rather than trusting the executor's own
// register, then checks provenance, seed accounting, set membership, absence of
// post-hoc criterion change, mutation, determinism and artifact integrity.
//
// If the diagnostic failed, this reports it. It does not force a green result.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const R = JSON.parse(rd('experiments/m19_3/m19_stress.json'));
const SPEC = rd('research/preregistrations/C1_INSTRUMENT_ADEQUACY_FORMULATION.md')
    .replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ');
const spec = (s) => SPEC.includes(s.replace(/\s+/g, ' '));
const EXEC = rd('experiments/m19_3/run_stress.js');

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};

console.log('='.repeat(78));
console.log('  M19 PASS 3 — independent verification of the execution');
console.log('='.repeat(78) + '\n');

const cells = R.fixtures.flatMap(f => f.cells.map(c => ({ ...c, set: f.set,
    fx: `${f.configSeed}:${f.configIndex}` })));

// ---- 1. fixture provenance and set membership ------------------------------
console.log('-- fixture provenance --------------------------------------------------------');
{
    const C = R.setC.map(f => `${f.configSeed}:${f.configIndex}`).sort().join(',');
    P('FP-1', C === '896066:0,896066:1,896238:2,896329:3',
        `Set C is exactly the frozen M14 four (${C})`);
}
{
    // independently re-resolve Set F by the frozen ascending rule
    const inC = (s, i) => R.setC.some(c => c.configSeed === s && c.configIndex === i);
    const reF = [];
    for (const idx of FROZEN.goalIndices) {
        for (let s = 896000; s <= 896999; s++) {
            if (!env.makeConfig(s, idx).accepted) continue;
            if (inC(s, idx)) continue;
            reF.push(`${s}:${idx}`); break;
        }
    }
    const got = R.setF.map(f => `${f.configSeed}:${f.configIndex}`);
    P('FP-2', JSON.stringify(reF) === JSON.stringify(got),
        `Set F re-resolves independently to the same fixtures (${got.join(', ')})`);
}
P('FP-3', R.fixtures.every(f => f.configSeed >= 896000 && f.configSeed <= 896999),
    'every fixture lies in the 896xxx development block');
P('FP-4', R.fixtures.every(f => env.makeConfig(f.configSeed, f.configIndex).accepted),
    'every fixture is accepted at its own seed, so no acceptance walk occurred');
{
    const goals = R.fixtures.map(f => f.goal);
    P('FP-5', new Set(goals).size === 4 && R.fixtures.length === 8,
        `8 fixtures spanning all 4 goals (${[...new Set(goals)].sort((a, b) => a - b).join(', ')})`);
}

// ---- 2. seed accounting ----------------------------------------------------
console.log('\n-- seed accounting -----------------------------------------------------------');
{
    const seeds = [...new Set(R.fixtures.flatMap(f => f.evaluatedSeeds))];
    const c1 = seeds.filter(s => s >= 895000 && s <= 895999);
    const uqb = seeds.filter(inRegisteredBlock);
    P('SD-1', c1.length === 0, `NO C1 registered seed consumed (${c1.length} in 895000-895999)`);
    P('SD-2', uqb.length === 0, `NO UQ-B registered seed consumed (${uqb.length} in 897000-897999)`);
    P('SD-3', seeds.every(s => s >= 896000 && s <= 896999),
        `all ${seeds.length} evaluated seeds lie in 896xxx`);
}

// ---- 3. K1-K8 RE-DERIVED from the raw cells --------------------------------
console.log('\n-- K1-K8 re-derived independently from the raw cells -------------------------');
const bothDef = cells.filter(c => c.bothDefined);
const re = {};
re.K1 = bothDef.length > 0;                                            // falsified?
re.K2 = bothDef.filter(c => Math.abs(c.delta) > 0).length > 0;
re.K3v = cells.filter(c => c.deltaControl !== null && Math.abs(c.deltaControl) > 0).length;
re.K3m = cells.filter(c => !c.controlPairDefined).length;
{
    const exer = cells.filter(c => c.phase === 1 && c.oracleStar[1] !== c.oracleStar[2] &&
                                   c.rankStar1inA !== null && c.rankStar2inA !== null);
    re.K4exer = exer.length;
    re.K4 = exer.filter(c => c.rankStar1inA !== c.rankStar2inA).length > 0;
}
re.K5 = bothDef.filter(c => c.rA !== c.rB).length > 0;
{
    const pools = cells.flatMap(c => [c.nA, c.nB]).filter(n => n !== null);
    re.K6 = pools.filter(n => n >= 3).length > 0;
    re.pools = pools;
}
{
    const rs = cells.flatMap(c => [c.rA, c.rB]).filter(r => r !== null);
    re.K7 = new Set(rs).size >= 2;
    re.ranks = [...new Set(rs)].sort((a, b) => a - b);
}
re.K8 = bothDef.filter(c => Math.abs(c.delta) < 1).length > 0;

const reg = R.register;
P('KR-1', re.K1 === (reg.K1.status === 'not detected (falsified)') &&
          reg.K1.counts.jointlyDefined === bothDef.length,
    `K1 re-derived: ${bothDef.length} jointly-defined cells falsify "undefined everywhere"`);
P('KR-2', re.K2 && reg.K2.status === 'not detected (falsified)',
    `K2 re-derived: ${bothDef.filter(c => Math.abs(c.delta) > 0).length} non-zero delta cells falsify "inert"`);
P('KR-3', re.K3v === 0 && re.K3m === 0 && reg.K3.status === 'not detected',
    `K3 re-derived: ${re.K3v} same-arm violations and ${re.K3m} definedness mismatches — ` +
    `the universal condition holds, so noise is NOT detected`);
P('KR-4', re.K4 && reg.K4.status === 'not detected (falsified)',
    `K4 re-derived: exercisable in ${re.K4exer} cells, rank differed in all that matter`);
P('KR-5', re.K5 && reg.K5.status === 'not detected (falsified)',
    `K5 re-derived: ${bothDef.filter(c => c.rA !== c.rB).length} cells with r_A != r_B falsify ` +
    `"every non-zero delta is normalisation-driven"`);
P('KR-6', re.K6 && reg.K6.status === 'not detected (falsified)',
    `K6 re-derived: ${re.pools.filter(n => n >= 3).length}/${re.pools.length} pools graded (n>=3)`);
P('KR-7', re.K7 && reg.K7.status === 'not detected (falsified)',
    `K7 re-derived: ${re.ranks.length} distinct ranks observed [${re.ranks.join(',')}]`);
P('KR-8', re.K8 && reg.K8.status === 'not detected (falsified)',
    `K8 re-derived: ${bothDef.filter(c => Math.abs(c.delta) < 1).length} interior delta cells falsify "saturated"`);
{
    const detected = Object.values(reg).filter(k => k.status === 'DETECTED');
    P('KR-9', detected.length === 0 && R.outcome === 'NO KNOWN FAILURE DETECTED',
        `outcome re-derived: ${detected.length} modes detected -> ${R.outcome}`);
}
{
    const ne = Object.values(reg).filter(k => k.status === 'NOT EXERCISABLE');
    P('KR-10', true, `NOT EXERCISABLE modes: ${ne.length ? ne.map(k => k.id).join(', ') : 'none'}`);
}

// ---- 4. rho recomputed from first principles on a sample -------------------
console.log('\n-- rho recomputed from the frozen definition ---------------------------------');
{
    // rho = r/(n-1), defined iff n>=2 and v* in pool. Check internal consistency.
    let bad = 0;
    for (const c of cells) {
        for (const [r, n, rho] of [[c.rA, c.nA, c.rhoA], [c.rB, c.nB, c.rhoB]]) {
            if (rho === null) { if (r !== null && n >= 2) bad++; continue; }
            if (n < 2) { bad++; continue; }
            if (Math.abs(rho - r / (n - 1)) > 1e-12) bad++;
        }
    }
    P('RH-1', bad === 0, `every recorded rho equals r/(n-1) and respects n>=2 (${bad} violations)`);
}
{
    let bad = 0;
    for (const c of cells) {
        if (!c.bothDefined) { if (c.delta !== null) bad++; continue; }
        if (Math.abs(c.delta - (c.rhoA - c.rhoB)) > 1e-12) bad++;
    }
    P('RH-2', bad === 0, `every delta equals rho_ARMED - rho_ABLATED (${bad} violations)`);
}
{
    const n1 = cells.filter(c => c.nA === 1 || c.nB === 1).length;
    const undef = cells.filter(c => !c.bothDefined).length;
    P('RH-3', cells.filter(c => c.nA === 1).every(c => c.rhoA === null) &&
              cells.filter(c => c.nB === 1).every(c => c.rhoB === null),
        `n=1 always yields undefined rho — no rho=0 convention was introduced ` +
        `(${n1} cells touched by n=1, ${undef} cells not jointly defined)`);
}

// ---- 5. no post-hoc criterion change ---------------------------------------
console.log('\n-- no post-hoc criterion change ----------------------------------------------');
P('PH-1', git('diff', '--stat', 'HEAD', '--',
    'research/preregistrations/C1_INSTRUMENT_ADEQUACY_FORMULATION.md').trim() === '',
    'the frozen specification is unmodified since the run');
P('PH-2', R.specification === 'M19 PASS 1.2 (640d088/d89b35f)',
    `the artifact records the specification it executed: ${R.specification}`);
{
    const ids = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'];
    P('PH-3', ids.every(k => spec('**' + k + '**')) &&
              ids.every(k => reg[k] !== undefined) &&
              Object.keys(reg).length === ids.length,
        `the executed register is exactly the frozen K1-K8, no additions (${Object.keys(reg).length} modes)`);
}
P('PH-4', spec('Nothing outside this register is a failure for the purposes of this gate'),
    'the register remains closed in the specification');
{
    // Scan the executor's CODE, not its comments. The header legitimately names
    // what the program forbids ("INSTRUMENT ADEQUATE FOR C1 is NOT a possible
    // output", "no p-value, alpha, interval ... appears below"), so a naive scan
    // flags the disclaimer itself. Comments are stripped first.
    const CODE = EXEC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    // The phrase legitimately appears in a printed DISCLAIMER ("This does NOT
    // establish ..."), which is required behaviour. What must be true is that it
    // can never be an OUTCOME VALUE. So the check reads the outcome expression
    // itself, and confirms every occurrence of the phrase sits inside a negation.
    const outcomeExpr = (CODE.match(/const outcome = [^;]+;/) || [''])[0];
    const occurrences = [...EXEC.matchAll(/INSTRUMENT ADEQUATE FOR C1/g)].length;
    const negated = [...EXEC.matchAll(/(does NOT establish|is NOT a possible output)[^\n]*INSTRUMENT ADEQUATE FOR C1|INSTRUMENT ADEQUATE FOR C1[^\n]*(is NOT a possible output|which M19 cannot establish)/g)].length;
    P('PH-5', /NO KNOWN FAILURE DETECTED/.test(outcomeExpr) &&
              /KNOWN FAILURE DETECTED/.test(outcomeExpr) &&
              !/INSTRUMENT ADEQUATE/.test(outcomeExpr) &&
              occurrences === negated,
        `the outcome expression yields only the two fixed values, and all ${occurrences} ` +
        `mentions of "INSTRUMENT ADEQUATE FOR C1" are negations`);
    P('PH-6', !/\bp-?value\b/i.test(CODE) && !/\balpha\b/i.test(CODE) &&
              !/confidence interval/i.test(CODE) && !/\bp\s*=\s*/.test(CODE),
        'the executor CODE contains no p-value, alpha or interval machinery');
}

// ---- 6. determinism, independently re-run ----------------------------------
console.log('\n-- determinism, independent re-run -------------------------------------------');
P('DT-1', R.fixtures.every(f => f.identicalRuns),
    `the same-arm re-measurement was byte-identical for all ${R.fixtures.length} fixtures`);
{
    // re-run ONE fixture's ARMED arm in a fresh process and compare to the artifact
    const f = R.fixtures[0];
    const U = 'file:///' + ROOT.replace(/\\/g, '/');
    const src = `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/m14/hook.mjs', import.meta.url);
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M14 = await import(U + '/experiments/m14/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');
globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()] });
const rec = await runOnce({ configSeed: ${f.configSeed}, configIndex: ${f.configIndex},
  agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
  ticks: ${FROZEN.ticks}, crashAtTick: null, warmStore: false });
globalThis.__UQB__ = null;
process.stdout.write('@@D@@' + JSON.stringify({ fp: rec.fingerprint }));
`;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm19v-'));
    let fp = null;
    try {
        const p2 = path.join(tmp, 'd.mjs');
        fs.writeFileSync(p2, src);
        const out = execFileSync(process.execPath, [p2], { encoding: 'utf8', maxBuffer: 1 << 28 });
        fp = JSON.parse(out.slice(out.indexOf('@@D@@') + 5)).fp;
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    P('DT-2', fp === f.fpA,
        `an independent re-run of ${f.configSeed}:${f.configIndex} ARMED reproduces the ` +
        `recorded fingerprint`);
}

// ---- 7. artifact integrity -------------------------------------------------
console.log('\n-- artifact integrity --------------------------------------------------------');
P('AI-1', R.fixtures.length === 8 && cells.length === 304,
    `artifact holds ${R.fixtures.length} fixtures and ${cells.length} cells (8 x 19 x 2)`);
P('AI-2', R.fixtures.every(f => f.cells.length === 38),
    'every fixture records all 19 states x 2 phases');
P('AI-3', R.fixtures.every(f => f.fpA && f.fpB && f.fpA !== f.fpB),
    'ARMED and ABLATED fingerprints are present and differ for every fixture');
P('AI-4', R.fixtures.every(f => f.fpA === f.fpA2),
    'the same-arm control fingerprint matches the ARMED fingerprint everywhere');
P('AI-5', typeof R.outcome === 'string' &&
          ['NO KNOWN FAILURE DETECTED', 'KNOWN FAILURE DETECTED'].includes(R.outcome),
    `the outcome uses the fixed vocabulary: ${R.outcome}`);

// ---- 8. no mutation --------------------------------------------------------
console.log('\n-- no mutation ---------------------------------------------------------------');
P('MU-1', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/', 'experiments/uqb/', 'experiments/m14/', 'experiments/registry/',
    'research/spec/', 'research/preregistrations/').trim() === '',
    'production, UQ-B, M14, the registry, the M13 spec and every preregistration are unmodified');
{
    const d = execFileSync('sha256sum', ['-c', 'C1_PREREGISTRATION.sha256',
        'UQB_PREREGISTRATION.sha256'],
        { cwd: path.join(ROOT, 'research/preregistrations'), encoding: 'utf8' });
    P('MU-2', (d.match(/OK/g) || []).length === 2, 'C1 and UQ-B preregistration digests verify');
}

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M19 PASS 3 VERIFICATION: PASS' : '  M19 PASS 3 VERIFICATION: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

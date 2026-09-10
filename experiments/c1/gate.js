// ==========================================================
// C1 PASS 1 — COLLECTION GATE
// ==========================================================
// Fail-closed. If any check fails, collection does not begin and NO registered
// seed is consumed. This program itself consumes none: it verifies governance,
// integrity and executor conformance, and nothing else.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, CONSUMED_RANGES, HELD_OUT_FLOOR, inRegisteredBlock, isConsumed, isHeldOut,
         assertSeedAllowed, processAuthorisedForCollection, enumerateCandidates } from './protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(6)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(6)} ${msg}`); }
    return cond;
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('='.repeat(78));
console.log('  C1 PASS 1 — COLLECTION GATE');
console.log('='.repeat(78) + '\n');

// ---- 1. the frozen preregistration ----------------------------------------
console.log('-- frozen preregistration ----------------------------------------------------');
const PRE = rd('research/preregistrations/C1_PREREGISTRATION.md');
P('G1', sha(PRE) === FROZEN.preregistration,
    `C1 preregistration digest matches the frozen value (${FROZEN.preregistration.slice(0, 16)}...)`);
P('G2', /\*\*Version:\*\* 2\.0/.test(PRE) && /DESCRIPTIVE REFORMULATION/.test(PRE),
    'it is v2.0, the descriptive reformulation');
P('G3', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/').trim() === '',
    'no preregistration is modified in the working tree');

// ---- 2. seed authorization and block state --------------------------------
console.log('\n-- seed authorization --------------------------------------------------------');
P('G4', FROZEN.seedLo === 895000 && FROZEN.seedHi === 895999,
    `the registered block is exactly ${FROZEN.seedLo}-${FROZEN.seedHi}`);
{
    let collide = 0;
    for (let s = FROZEN.seedLo; s <= FROZEN.seedHi; s++) {
        if (isConsumed(s) || isHeldOut(s)) collide++;
    }
    P('G5', collide === 0, `no consumed-range or held-out collision (${collide} seeds)`);
}
P('G6', HELD_OUT_FLOOR === 900500 && FROZEN.seedHi < HELD_OUT_FLOOR,
    `the block lies below the held-out floor ${HELD_OUT_FLOOR}`);
{
    // the registry must already record 896xxx and the spent UQ-B block (M18)
    P('G7', isConsumed(896500) && isConsumed(897500),
        'the registry records 896xxx development territory and the spent UQ-B block as consumed');
}
P('G8', processAuthorisedForCollection(),
    'C1_COLLECTION_AUTHORISED=1 is set in this process');
{
    // fail-closed in BOTH directions
    const ok =
        throws(() => assertSeedAllowed(896500, { collection: true })) &&   // consumed
        throws(() => assertSeedAllowed(897500, { collection: true })) &&   // spent UQ-B
        throws(() => assertSeedAllowed(900500, { collection: true })) &&   // held out
        throws(() => assertSeedAllowed(FROZEN.seedLo, { collection: false })) &&
        throws(() => enumerateCandidates(
            { makeConfig: () => { throw new Error('unreachable'); } },
            { lo: 894000, hi: 895999, collection: true }));
    P('G9', ok,
        'the guard is fail-closed: consumed, spent, held-out and unauthorised paths all refuse, ' +
        'and widened enumeration bounds are refused');
}

// ---- 3. the block is untouched --------------------------------------------
console.log('\n-- the block is untouched ----------------------------------------------------');
const DATA = path.join(HERE, 'data'), RES = path.join(HERE, 'results');
const OUTPUTS = [
    path.join(DATA, 'readouts.jsonl'), path.join(DATA, 'candidates.jsonl'),
    path.join(DATA, 'INTEGRITY.sha256'),
    path.join(RES, 'c1_results.json'), path.join(RES, 'c1_results.sha256'),
];
{
    const present = OUTPUTS.filter(p => fs.existsSync(p));
    P('G10', present.length === 0,
        `no prior C1 collection output exists (checked ${OUTPUTS.length} driver output paths)`);
}
P('G11', env.evaluatedSeeds().filter(inRegisteredBlock).length === 0,
    'no registered C1 seed has been evaluated in this process');

// ---- 4. upstream integrity: production, UQ-B, M13-M19 ---------------------
console.log('\n-- upstream integrity --------------------------------------------------------');
P('G12', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/').trim() === '', 'production source is unmodified');
P('G13', git('diff', '--stat', 'HEAD', '--', 'experiments/uqb/').trim() === '',
    'UQ-B machinery and data are unmodified');
P('G14', git('diff', '--stat', 'HEAD', '--', 'research/spec/', 'experiments/m14/',
    'experiments/m19_3/', 'experiments/registry/').trim() === '',
    'the M13 spec, the M14 record, the M19 stress record and the registry are unmodified');
{
    const d = execFileSync('sha256sum', ['-c', 'C1_PREREGISTRATION.sha256',
        'UQB_PREREGISTRATION.sha256', 'UQB_PREREGISTRATION_ERRATUM_01.sha256',
        'UQB_PREREGISTRATION_ERRATUM_02.sha256', 'UQB_PREREGISTRATION_ERRATUM_03.sha256'],
        { cwd: path.join(ROOT, 'research/preregistrations'), encoding: 'utf8' });
    P('G15', (d.match(/OK/g) || []).length === 5, 'all five frozen document digests verify');
}
{
    const d = execFileSync('sha256sum', ['-c', 'INTEGRITY.sha256'],
        { cwd: path.join(ROOT, 'experiments/uqb/data'), encoding: 'utf8' });
    P('G16', (d.match(/OK/g) || []).length >= 1, 'UQ-B collection data digests verify');
}
P('G17', JSON.parse(rd('experiments/m19_3/m19_stress.json')).outcome === 'NO KNOWN FAILURE DETECTED',
    'the M19 stress test recorded NO KNOWN FAILURE DETECTED');

// ---- 5. executor conformance to the frozen measurement definition ---------
console.log('\n-- executor conformance ------------------------------------------------------');
const AN = rd('experiments/c1/analyze.js');
const CO = rd('experiments/c1/collect.js');
P('G18', /rho: r \/ \(n - 1\)/.test(AN) && /n < FROZEN\.minPoolForRho/.test(AN) &&
         FROZEN.minPoolForRho === 2,
    'ρ = r/(n−1) with the n ≥ 2 precondition, exactly as frozen');
P('G19', !/rho: 0/.test(AN) && /No ρ = 0 convention is adopted/.test(AN),
    'no ρ = 0 convention exists for n = 1');
P('G20', /bothDefined: both/.test(AN) && /rho !== null && b\.rho !== null/.test(AN),
    'pairwise deletion requires ρ defined in BOTH arms');
P('G21', /reliabilityOptimalPolicy\(cfg\.pPhase1/.test(AN) &&
         /reliabilityOptimalPolicy\(cfg\.pPhase2/.test(AN),
    'the committed oracle is used per phase, and nothing is invented');
P('G22', /r\.snapshots\[0\]\.pairs/.test(CO) && /m14\/hook\.mjs/.test(CO),
    'the decision-time pool is captured via the M14-validated probe');
P('G23', /unweighted mean/.test(AN) || /reduce\(\(a, b\) => a \+ b, 0\) \/ d\.length/.test(AN),
    'Δ is the unweighted mean of δ over jointly defined states');
{
    const code = AN.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    P('G24', !/\bp-?value\b/i.test(code) && !/\balpha\b/i.test(code) &&
             !/confidence interval/i.test(code) && !/\bttest\b|\bt-test\b/i.test(code),
        'the analysis code contains no p-value, alpha, interval or test machinery');
}
P('G25', /minJointlyDefined: 1/.test(rd('experiments/c1/protocol.js')),
    'the only validity rule is jointlyDefined ≥ 1, derived from the estimator');
P('G26', FROZEN.ticks === 3000 && FROZEN.decisionStates === 19 &&
         FROZEN.goalIndices.length === 4 && FROZEN.arms.length === 2,
    'tick budget, population, goal schedule and arms match the frozen substrate');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0
    ? '  C1 COLLECTION GATE: GREEN — collection may proceed exactly as frozen'
    : '  C1 COLLECTION GATE: RED — collection must NOT begin; no seed consumed');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

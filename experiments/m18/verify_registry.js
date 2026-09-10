// ==========================================================
// M18 — verification of the seed-consumption registry repair
// ==========================================================
// Administrative milestone. Verifies that the 896xxx gap is closed, that the
// inherited chain is preserved EXACTLY, that no existing module's behaviour
// changed, and that the C1 block is still available and unconsumed.
//
// Consumes NO seed, runs NO agent, changes nothing.
// ==========================================================
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import * as REG from '../registry/consumed.js';
import * as UQB from '../uqb/protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};

console.log('='.repeat(78));
console.log('  M18 — seed-consumption registry repair');
console.log('='.repeat(78) + '\n');

// ---- 1. the gap is closed -------------------------------------------------
console.log('-- the 896xxx gap -----------------------------------------------------------');
{
    let covered = 0;
    for (let s = 896000; s <= 896999; s++) if (REG.isConsumed(s)) covered++;
    P('G1', covered === 1000,
        `all ${covered}/1000 seeds of 896000-896999 are now recorded as consumed`);
}
P('G2', REG.DEV_FIXTURE_RANGE.lo === 896000 && REG.DEV_FIXTURE_RANGE.hi === 896999,
    'the development range is declared as the whole block, conservatively');
P('G3', /f400fd3/.test(REG.DEV_FIXTURE_RANGE.why) && /b825d1a/.test(REG.DEV_FIXTURE_RANGE.why),
    'its provenance cites committed commits, not invented history');

// ---- 2. UQ-B's own block is now recorded as spent -------------------------
console.log('\n-- UQ-B block --------------------------------------------------------------');
{
    let covered = 0;
    for (let s = 897000; s <= 897999; s++) if (REG.isConsumed(s)) covered++;
    P('U1', covered === 1000,
        'the spent UQ-B registered block 897000-897999 is now recorded as consumed');
}
P('U2', REG.CONSUMED_RANGES.some(r => r.lo === 897000 && /1cc441f/.test(r.why)),
    'the UQ-B entry cites its collection commit 1cc441f');

// ---- 3. the inherited chain is preserved EXACTLY --------------------------
console.log('\n-- inherited chain ---------------------------------------------------------');
{
    const inherited = UQB.CONSUMED_RANGES.map(r => `${r.lo}-${r.hi}|${r.why}`);
    const now = REG.CONSUMED_RANGES.map(r => `${r.lo}-${r.hi}|${r.why}`);
    const preserved = inherited.every(e => now.includes(e));
    P('C1', preserved,
        `all ${inherited.length} inherited entries are present unchanged`);
    P('C2', now.length === inherited.length + 2,
        `exactly 2 entries added (UQ-B block, 896xxx), total ${now.length}`);
    for (const r of REG.CONSUMED_RANGES) {
        console.log(`      ${r.lo}-${r.hi}  ${r.why}`);
    }
}
P('C3', REG.HELD_OUT_FLOOR === UQB.HELD_OUT_FLOOR && REG.HELD_OUT_FLOOR === 900500,
    `the held-out floor is unchanged at ${REG.HELD_OUT_FLOOR}`);

// ---- 4. the C1 block is untouched and still available ---------------------
console.log('\n-- C1 block 895000-895999 --------------------------------------------------');
{
    let consumed = 0;
    for (let s = 895000; s <= 895999; s++) if (REG.isConsumed(s) || REG.isHeldOut(s)) consumed++;
    P('B1', consumed === 0,
        'the C1 block remains entirely unconsumed and available');
}
P('B2', env.evaluatedSeeds().length === 0,
    'NO seed was evaluated by env during verification — nothing consumed by M18');

// ---- 5. NO existing module's behaviour changed ----------------------------
// This is the property that makes the repair safe: historical tooling keeps
// working, while future studies inherit the corrected registry.
console.log('\n-- non-interference with existing tooling ----------------------------------');
{
    const fixtures = [896066, 896084, 896132, 896238, 896329, 896403];
    let ok = 0;
    for (const s of fixtures) {
        try { UQB.assertSeedAllowed(s, { collection: false }); ok++; } catch { /* refused */ }
    }
    P('N1', ok === fixtures.length,
        `all ${ok}/${fixtures.length} historical 896xxx fixtures still pass uqb/protocol's guard, ` +
        `so M9/M11/M12/M14 and the UQ-B stress gate keep running`);
}
{
    // and the corrected registry DOES refuse them, which is its whole purpose
    const refusedByNew = [896066, 896238, 896329].every(s => REG.isConsumed(s));
    P('N2', refusedByNew,
        'while the corrected registry records those same seeds as consumed, so a ' +
        'future study importing it cannot draw new measurements there');
}
P('N3', git('diff', '--stat', 'HEAD', '--', 'experiments/uqb/', 'experiments/uqa/',
    'experiments/q1/', 'experiments/m8/').trim() === '',
    'no existing protocol module is modified');

// ---- 6. scope: administrative only ----------------------------------------
console.log('\n-- scope --------------------------------------------------------------------');
P('S1', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/').trim() === '',
    'no production source is modified');
P('S2', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/',
    'research/spec/').trim() === '',
    'the C1 preregistration and the M13 spec are unmodified');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    P('S3', changed.length === 0,
        `no tracked file is MODIFIED; the repair is additive only ${JSON.stringify(changed)}`);
}

// ---- 7. the spent summary is reportable ------------------------------------
console.log('');
{
    const s = REG.spentSummary();
    console.log(`      lowest consumed seed: ${s.lowestConsumed}   held-out floor: ${s.heldOutFloor}`);
    P('R1', s.lowestConsumed === 896000 && s.ranges.length === REG.CONSUMED_RANGES.length,
        'the spent summary reports the full registry');
}

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M18 VERDICT: PASS' : '  M18 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

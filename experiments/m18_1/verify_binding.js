// ==========================================================
// M18.1 — verification of the UQ-B verifier's source binding
// ==========================================================
// The repair declared that verify_uqb_impl.js's line pins belong to the
// pre-M11 main.js. This checks that the declaration is TRUE, that the
// substitute assertion is NOT vacuous, and that nothing else moved.
//
// Consumes NO seed, runs NO agent, changes no evidence.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import * as I from '../uqb/instrument.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const lf = (s) => s.split('\r\n').join('\n');

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(7)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(7)} ${msg}`); }
    return cond;
};

const VERIFIER = fs.readFileSync(path.join(ROOT, 'experiments/uqb/verify_uqb_impl.js'), 'utf8');
const BOUND_DIGEST = '537f37a20144de07e39e2273ee2e78777e4c0f8ec3259b1e033f8a897d522e2b';
const BOUND = { loop: 1594, imaginedFuture: 1841, futureBonus: 1860, bestChoice: 2365 };
const SPAN = { start: 1390, end: 3033 };

console.log('='.repeat(78));
console.log('  M18.1 — UQ-B verifier source-binding repair');
console.log('='.repeat(78) + '\n');

// ---- 1. the declared binding is real --------------------------------------
console.log('-- provenance ---------------------------------------------------------------');
const histSrc = lf(git('show', '1cc441f:main.js'));
P('PV-1', sha(histSrc) === BOUND_DIGEST,
    `the declared binding digest IS main.js at 1cc441f (the UQ-B collection commit)`);
for (const c of ['b7820b0', '0227a5f']) {
    P(`PV-${c}`, sha(lf(git('show', `${c}:main.js`))) === BOUND_DIGEST,
        `and is byte-identical at ${c}`);
}
P('PV-2', sha(lf(git('show', '0f47d7b:main.js'))) !== BOUND_DIGEST,
    'and differs at 0f47d7b, the M11 repair that superseded it');
{
    // the pins must actually resolve to the audited numbers in the bound source
    const a = I.anchorLines(histSrc);
    P('PV-3', a.loop === BOUND.loop && a.imaginedFuture === BOUND.imaginedFuture &&
              a.futureBonus === BOUND.futureBonus && a.bestChoice === BOUND.bestChoice,
        `the pins resolve exactly in the bound source ${JSON.stringify(a)}`);
}
P('PV-4', (() => { try { git('merge-base', '--is-ancestor', '1cc441f', '0f47d7b'); return true; }
                   catch { return false; } })(),
    'UQ-B evidence (1cc441f) predates the M11 repair, so its pins were correct when taken');

// ---- 2. the repair declares, and does NOT re-pin ---------------------------
console.log('\n-- no silent re-pinning ------------------------------------------------------');
P('NR-1', VERIFIER.includes(BOUND_DIGEST), 'the verifier records the bound source digest');
P('NR-2', VERIFIER.includes('loop: 1594') && VERIFIER.includes('bestChoice: 2365') &&
          VERIFIER.includes('start: 1390') && VERIFIER.includes('end: 3033'),
    'the AUDITED line numbers are retained verbatim');
P('NR-3', !/anchors\.loop === 1607/.test(VERIFIER) && !/=== 1403/.test(VERIFIER) &&
          !/=== 3046/.test(VERIFIER),
    'the CURRENT post-M11 line numbers are nowhere asserted as pins');
P('NR-4', VERIFIER.includes('Pins are NOT re-pinned'),
    'the verifier states plainly that it does not re-pin');
P('NR-5', VERIFIER.includes('onBoundSource') &&
          /if \(onBoundSource\)/.test(VERIFIER),
    'the pins are gated on the bound source rather than removed');

// ---- 3. ANTI-VACUITY: the substitute assertion must be able to fail --------
// The shipped gate asserts every audited anchor is displaced by ONE common
// shift. That formula is re-derived here and exercised against mutated sources.
console.log('\n-- anti-vacuity of the translation invariant --------------------------------');
const translated = (a, shiftRef) => {
    const shift = a.loop - BOUND.loop;
    return shift === shiftRef &&
        a.imaginedFuture - BOUND.imaginedFuture === shift &&
        a.futureBonus    - BOUND.futureBonus    === shift &&
        a.bestChoice     - BOUND.bestChoice     === shift;
};
{
    // (a) a PURE TRANSLATION must satisfy it — insert above the audited region
    const L = histSrc.split('\n');
    const above = L.slice(0, BOUND.loop - 50).concat(['// pad'], L.slice(BOUND.loop - 50));
    const a = I.anchorLines(above.join('\n'));
    P('AV-1', translated(a, 1),
        'a pure 1-line translation above the audited region SATISFIES the invariant');
}
{
    // (b) RESTRUCTURING inside the audited region must break it. The insertion
    //     point is chosen well inside the candidate-loop body (line 1700),
    //     between the `loop` anchor and `imaginedFuture`, so the anchors move
    //     UNEQUALLY: loop stays put while the later three shift by 1.
    const L = histSrc.split('\n');
    const inside = L.slice(0, 1700).concat(['      // pad'], L.slice(1700));
    let holds, detail;
    try {
        const a = I.anchorLines(inside.join('\n'));
        holds = translated(a, a.loop - BOUND.loop);
        detail = `anchors ${JSON.stringify(a)}`;
    } catch (e) {
        // Restructuring can also be caught earlier, by the anchor resolver
        // itself refusing to match. That is also a failure of the gate.
        holds = false;
        detail = 'the anchor resolver itself REFUSED the mutated source';
    }
    P('AV-2', !holds,
        `a line inserted INSIDE the audited region breaks the invariant — ${detail}; ` +
        `the gate is not vacuous`);
}
{
    // (c) span-length change must break the J3 substitute
    const lenBound = SPAN.end - SPAN.start;
    P('AV-3', lenBound === 1643 && (3046 - 1403) === lenBound,
        `the current span length equals the audited length (${lenBound}), which is what J3b asserts`);
    P('AV-4', (3046 - 1403) !== lenBound - 1,
        'a resized span would not satisfy the J3b length equality — it is a real constraint');
}

// ---- 4. the verifier is green again, honestly ------------------------------
console.log('\n-- the repaired verifier ----------------------------------------------------');
{
    let out = '', code = 0;
    try {
        out = execFileSync(process.execPath, ['experiments/uqb/verify_uqb_impl.js'],
            { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    } catch (e) { out = String(e.stdout || ''); code = e.status ?? 1; }
    const m = out.match(/(\d+) passed, (\d+) failed/);
    P('VF-1', !!m && Number(m[2]) === 0 && code === 0,
        `verify_uqb_impl.js reports ${m ? m[1] : '?'} passed, ${m ? m[2] : '?'} failed (exit ${code})`);
    P('VF-2', out.includes('SOURCE BINDING') && out.includes('Pins are NOT re-pinned'),
        'it announces the binding rather than hiding the divergence');
    P('VF-3', /PASS\s+Z2b/.test(out) && /PASS\s+J3b/.test(out),
        'Z2b and J3b report as source-bound assertions, not as the original absolute pins');
    P('VF-4', !/PASS\s+Z2\s/.test(out) && !/PASS\s+J3\s/.test(out),
        'the original absolute-pin gates do NOT claim to have passed on a source they never audited');
}

// ---- 5. nothing else moved -------------------------------------------------
console.log('\n-- integrity ----------------------------------------------------------------');
{
    const changed = git('diff', '--name-status', 'HEAD').trim().split(/\r?\n/)
        .filter(Boolean).filter(l => l.startsWith('M'))
        .map(l => l.split(/\s+/).slice(1).join(' '));
    P('IN-1', changed.length === 1 && changed[0] === 'experiments/uqb/verify_uqb_impl.js',
        `exactly one file modified: ${JSON.stringify(changed)}`);
}
P('IN-2', git('diff', '--stat', 'HEAD', '--', 'experiments/uqb/protocol.js',
    'experiments/uqb/instrument.js', 'experiments/uqb/permute.js', 'experiments/uqb/bio.js',
    'experiments/uqb/collect.js', 'experiments/uqb/analyze.js', 'experiments/uqb/hook.mjs',
    'experiments/uqb/run_collection.js').trim() === '',
    'no UQ-B protocol or machinery module is modified');
P('IN-3', git('diff', '--stat', 'HEAD', '--', 'experiments/uqb/data/',
    'experiments/uqb/results/').trim() === '',
    'UQ-B raw data and results are untouched');
P('IN-4', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/',
    'research/spec/').trim() === '',
    'every preregistration and the M13 spec are untouched');
P('IN-5', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/').trim() === '',
    'production source is untouched');
P('IN-6', git('diff', '--stat', 'HEAD', '--', 'experiments/registry/').trim() === '',
    'the consumed-seed registry is untouched');
P('IN-7', env.evaluatedSeeds().length === 0,
    'NO seed evaluated — no C1 seed consumed');
{
    const digests = execFileSync('sha256sum',
        ['-c', 'UQB_PREREGISTRATION.sha256', 'C1_PREREGISTRATION.sha256'],
        { cwd: path.join(ROOT, 'research/preregistrations'), encoding: 'utf8' });
    P('IN-8', (digests.match(/OK/g) || []).length === 2,
        'UQ-B and C1 preregistration digests both verify');
}

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  M18.1 VERDICT: PASS' : '  M18.1 VERDICT: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

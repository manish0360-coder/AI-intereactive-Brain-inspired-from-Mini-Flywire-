// ==========================================================
// UQ-B IMPLEMENTATION VERIFIER — mutation controls A..I
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQB_PREREGISTRATION.md, frozen at 3b3d195, digest
//   bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e.
//
// WHAT THIS VERIFIES
//   That the §13 instrumentation changes exactly what the frozen protocol says
//   it changes, and nothing else. It is the gate on committing the machinery.
//
// THE ANTI-VACUITY RULE — the M7-ERR-10 lesson
//   A check that cannot fail proves nothing. Every detecting assertion is paired
//   with a MUTATION that must make it fail, and the mutation binds the
//   MEASUREMENT INPUT — the real source, the real candidate vector, the real
//   readout — never a hand-built object the real code could not produce.
//
// FIXTURES CONSUME NO EVIDENCE
//   Every run uses configuration seed 100026, outside the frozen §17 block
//   897000-897999, outside every consumed block, and far below the held-out
//   floor. No seed in 897000-897999 is generated, evaluated or inspected.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as I from './instrument.js';
import * as P from './permute.js';
import * as BIO from './bio.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.split(path.sep).join('/');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const FIXTURE_SEED = 100026;
const FIXTURE_INDEX = 0;
const FIXTURE_GOAL = 8;
const FIXTURE_TICKS = 300;          // fixture only; the frozen budget is 3000
const BLOCK_LO = 897000, BLOCK_HI = 897999;

let pass = 0, fail = 0;
const P_ = (id, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${detail}`);
};
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('UQ-B IMPLEMENTATION VERIFIER — mutation controls A..I');
console.log('='.repeat(80));

// ==========================================================================
console.log('\n-- 0. the frozen protocol is intact ---------------------------------------');
// ==========================================================================
const PREREG = 'research/preregistrations/UQB_PREREGISTRATION.md';
const PREREG_DIGEST = 'bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e';
const pregBytes = fs.readFileSync(path.join(ROOT, PREREG));
P_('Z1', sha(pregBytes) === PREREG_DIGEST, 'the frozen pre-registration digest matches');
P_('Z1m', sha(Buffer.concat([pregBytes, Buffer.from('x')])) !== PREREG_DIGEST,
   'MUTATION — one appended byte breaks the digest, so Z1 is not vacuous');

// The working tree may be LF or CRLF depending on core.autocrlf, so every
// assertion below is stated against an explicitly normalised pair. Deriving the
// CRLF variant from the raw file was itself a bug: on a CRLF checkout it
// produced bare carriage returns.
const mainRaw = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const mainSrc = mainRaw.split('\r\n').join('\n');
const mainCRLF = mainSrc.split('\n').join('\r\n');
const anchors = I.anchorLines(mainSrc);
P_('Z2', anchors.loop === 1594 && anchors.imaginedFuture === 1841
       && anchors.futureBonus === 1860 && anchors.bestChoice === 2365,
   `anchors resolve to the audited lines ${JSON.stringify(anchors)}`);

// ==========================================================================
console.log('\n-- I. production safety: default-off is bit-identical ----------------------');
// ==========================================================================
const full = I.transform(mainSrc);
P_('I1', I.transform(mainSrc, { probe: false, permute: false, expose: false }) === mainSrc,
   'with every injection disabled the transform is a byte-identical no-op');
{
    const a = mainSrc.split('\n'), b = full.split('\n');
    P_('I2', b.length - a.length === 12,
       `the full transform adds exactly 12 lines (10 pre-pass + 1 probe + 1 handle)`);
    // Every injected line must be guarded, or "default-off" is a claim not a fact.
    const added = [];
    { // line-level diff by anchor positions rather than by a fuzzy matcher
      const t = new Set(a);
      for (const l of b) if (!t.has(l) && l.trim()) added.push(l);
    }
    void added;
    // Every injected STATEMENT must be guarded. A line-by-line test is the wrong
    // shape: a guarded multi-line expression legitimately has continuation lines
    // naming no guard (`      ? 0`, `      : futureScore(`). What must hold is
    // that each injected region BEGINS with a guard test, gating the whole
    // expression.
    const regions = [
        [/const __UQB_FB = globalThis\.__UQB__/, 'pre-pass'],
        [/const imaginedFuture = \(__UQB_FB \|\| !targetNeuronForFuture\)/, 'imaginedFuture'],
        [/__UQB_FB \? __UQB_FB\.get\(k\) :/, 'futureBonus'],
        [/^if \(globalThis\.__UQB_PROBE__\)/m, 'probe'],
        [/^if \(globalThis\.__UQB_EXPOSE__\)/m, 'expose'],
    ];
    const ungated = regions.filter(([re]) => !re.test(full)).map(([, n]) => n);
    P_('I3', ungated.length === 0,
       `all ${regions.length} injected regions begin with a guard test` +
       (ungated.length ? ` — UNGATED: ${ungated.join(', ')}` : ''));
    P_('I3m', regions.some(([re]) => !re.test(full.replace('if (globalThis.__UQB_PROBE__)', 'if (1)'))),
       'MUTATION — removing a guard test makes I3 fail, so it is not vacuous');
    P_('I4', /const __UQB_FB = globalThis\.__UQB__/.test(full)
          && /__UQB_FB \? __UQB_FB\.get\(k\) : Math\.min\(imaginedFuture \* 4, 20\)/.test(full),
       'the committed expression survives verbatim on the guard-off branch');
}
{
    // CRLF: a fresh clone under core.autocrlf=true materialises main.js with CRLF.
    // A transform that could not handle it would be unrunnable from a clone — the
    // defect UQ-A hit and fixed at 96c8da1.
    const crlfSrc = mainCRLF;
    P_('I11', I.transform(crlfSrc, { probe: false, permute: false, expose: false }) === crlfSrc,
       'a CRLF checkout transforms to a byte-identical no-op with the guards disabled');
    P_('I12', I.transform(crlfSrc).split('\r\n').join('\n') === full,
       'and the CRLF transform agrees with the LF transform line for line');
    P_('I13', !I.transform(crlfSrc).split('\r\n').join('').includes('\n'),
       'the CRLF input\'s own terminator is preserved on output — no bare LF survives');
}

// MUTATIONS binding the real source.
P_('I5', throws(() => I.transform(mainSrc.replace('const bestChoice = sorted[0];', '  gone();'))),
   'MUTATION — a removed bestChoice anchor is REFUSED');
P_('I6', throws(() => I.transform(mainSrc + '\n' + I.ANCHOR_BESTCHOICE + '\n')),
   'MUTATION — a duplicated bestChoice anchor is REFUSED');
P_('I7', throws(() => I.transform(mainSrc.replace('  Math.min(imaginedFuture * 4, 20);', '  0;'))),
   'MUTATION — a moved futureBonus anchor is REFUSED');
P_('I8', throws(() => I.transform(mainSrc.replace('  allCandidates.forEach((value, k) => {',
                                                  '  allCandidates.forEach((v2, k) => {'))),
   'MUTATION — a changed candidate-loop head is REFUSED');
P_('I9', throws(() => I.transform(mainSrc.replace('futureBonus,', 'futureBonus, xf: futureBonus,'))),
   'MUTATION — an extra futureBonus occurrence is REFUSED: the reach would exceed §6');
P_('I10', throws(() => I.transform(mainSrc.replace('function runPrediction(startKey) {',
                                                   'function runPredictionX(startKey) {'))),
   'MUTATION — a missing runPrediction declaration is REFUSED: §8 could not bind');

// ==========================================================================
console.log('\n-- F. arrangements: count, distinctness, determinism -----------------------');
// ==========================================================================
{
    const states = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const sizes = new Map(states.map((u, i) => [u, 3 + (i % 4)]));   // 3..6, the real degree range
    const A = P.buildArrangements({ configSeed: FIXTURE_SEED, arm: 'ARMED', states, sizes });

    P_('F1', P.K === 19, 'K is the frozen 19');
    P_('F2', A.shuffles.length === 19, 'exactly 19 shuffled arrangements are produced');
    P_('F3', A.distinct, 'all 20 arrangements (identity + 19) are pairwise distinct');
    P_('F4', states.every(u => P.isIdentity(A.identity[u])),
       'arrangement 0 is the identity at every state');
    P_('F5', A.shuffles.every(s => !states.every(u => P.isIdentity(s[u]))),
       'no shuffled arrangement equals the identity arrangement');
    P_('F6', A.shuffles.every(s => states.every(u =>
            [...s[u]].sort((a, b) => a - b).every((v, i) => v === i))),
       'every per-state sigma is a genuine permutation of 0..n-1');

    const A2 = P.buildArrangements({ configSeed: FIXTURE_SEED, arm: 'ARMED', states, sizes });
    P_('F7', JSON.stringify(A) === JSON.stringify(A2),
       'arrangement generation is deterministic — same inputs, byte-identical output');
    const B = P.buildArrangements({ configSeed: FIXTURE_SEED, arm: 'ABLATED', states, sizes });
    P_('F8', JSON.stringify(A.shuffles) !== JSON.stringify(B.shuffles),
       'the arm enters the seed, so the two arms draw different arrangements');
    const C = P.buildArrangements({ configSeed: FIXTURE_SEED + 1, arm: 'ARMED', states, sizes });
    P_('F9', JSON.stringify(A.shuffles) !== JSON.stringify(C.shuffles),
       'the configuration seed enters the seed too');

    // MUTATION binding the generator's input: a space too small to hold 19
    // distinct non-identity arrangements must be REFUSED, not silently reduced.
    P_('F10', throws(() => P.buildArrangements({
            configSeed: 1, arm: 'ARMED', states: [1], sizes: new Map([[1, 3]]) })),
       'MUTATION — a 3!-sized space cannot hold 19 distinct arrangements and is REFUSED');
    P_('F11', throws(() => P.buildArrangements({
            configSeed: 1, arm: 'SHUFFLED', states, sizes })),
       'an unrecognised arm is REFUSED');
    P_('F12', throws(() => P.buildArrangements({
            configSeed: 1, arm: 'ARMED', states: [], sizes })),
       'an empty state population is REFUSED — §7 requires the full set');
}

// ==========================================================================
console.log('\n-- D/G. the guard permutes the assignment and nothing else -----------------');
// ==========================================================================
{
    const keys = ['a', 'b', 'c', 'd'];
    const vals = { a: 3, b: 7, c: 1, d: 9 };
    const compute = (k) => vals[k];

    const idG = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()] });
    const m0 = idG.buildFutureBonus(keys, compute);
    P_('C1', keys.every(k => m0.get(k) === vals[k]),
       'C — the identity arrangement reproduces the unpermuted assignment exactly');

    const sw = P.makeGuard({ arm: 'ARMED', sigmaFor: () => [1, 0, 3, 2] });
    const m1 = sw.buildFutureBonus(keys, compute);
    P_('D1', m1.get('a') === 7 && m1.get('b') === 3 && m1.get('c') === 9 && m1.get('d') === 1,
       'D — a shuffled arrangement reassigns values across candidates');
    P_('D2', [...m1.values()].sort((x, y) => x - y).join() ===
             [...m0.values()].sort((x, y) => x - y).join(),
       'D — the value MULTISET is preserved element for element');
    P_('D3', [...m1.keys()].join() === keys.join(),
       'D — candidate identity and candidate ORDER are preserved');

    const abl = P.makeGuard({ arm: 'ABLATED', sigmaFor: () => [1, 0, 3, 2] });
    const mA = abl.buildFutureBonus(keys, compute);
    P_('G1', [...mA.values()].every(v => v === 0),
       'G — under ABLATED every candidate receives exactly 0');
    const ablId = P.makeGuard({ arm: 'ABLATED', sigmaFor: (n) => [...Array(n).keys()] });
    P_('G2', JSON.stringify([...mA]) === JSON.stringify([...ablId.buildFutureBonus(keys, compute)]),
       'G — under ABLATED the identity and a shuffle are IDENTICAL: the §12 wiring control ' +
       'holds by construction, not by a special case');

    // MUTATIONS binding the guard's real input.
    P_('D4', throws(() => P.makeGuard({ arm: 'ARMED', sigmaFor: () => [0, 1, 2] })
                            .buildFutureBonus(keys, compute)),
       'MUTATION — a wrong-length sigma is REFUSED');
    P_('D5', throws(() => P.makeGuard({ arm: 'ARMED', sigmaFor: () => [0, 0, 2, 3] })
                            .buildFutureBonus(keys, compute)),
       'MUTATION — a non-bijective sigma is REFUSED: the multiset would not be preserved');
    P_('D6', throws(() => P.makeGuard({ arm: 'NOPE', sigmaFor: () => [0] })),
       'an unrecognised arm is REFUSED at guard construction');
}

// ==========================================================================
console.log('\n-- A/B/C/E/H. end-to-end on a fixture (about 30 seconds) -------------------');
console.log(`     fixture seed ${FIXTURE_SEED}, outside the frozen block ${BLOCK_LO}-${BLOCK_HI}`);
// ==========================================================================
function child(body) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uqbver-'));
    const f = path.join(tmp, 'c.mjs');
    try {
        fs.writeFileSync(f, body);
        const out = execFileSync(process.execPath, [f],
            { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 30 });
        return JSON.parse(out.slice(out.indexOf('@@UQB@@') + 7));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const RUN = (hook) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
${hook ? `register(U + '/experiments/uqb/hook.mjs', import.meta.url);` : ''}
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const rec = await runOnce({
    configSeed: ${FIXTURE_SEED}, configIndex: ${FIXTURE_INDEX},
    agentSeed: 20260819000, arm: 'A1',
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${FIXTURE_TICKS}, crashAtTick: null, warmStore: false,
});
process.stdout.write('@@UQB@@' + JSON.stringify({
    fingerprint: rec.fingerprint, artifacts: rec.artifacts,
    evaluatedSeeds: env.evaluatedSeeds(),
}));`;

const baseline = child(RUN(false));
const hooked   = child(RUN(true));
P_('A1', baseline.fingerprint === hooked.fingerprint,
   'A — with the hook registered and every guard UNSET, the run fingerprint is identical');
P_('A2', JSON.stringify(baseline.artifacts) === JSON.stringify(hooked.artifacts),
   'A — and every recorded artifact is identical, including the RNG draw counts');
P_('A3', baseline.evaluatedSeeds.length === 1 && baseline.evaluatedSeeds[0] === FIXTURE_SEED,
   'A — the fixture run touched exactly its own seed');

// ---- the readout driver, exercised under all 20 arrangements -------------
const READOUT = `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
register(U + '/experiments/uqb/hook.mjs', import.meta.url);
globalThis.__UQB_EXPOSE__ = {};
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const P = await import(U + '/experiments/uqb/permute.js');
const { initRng, liveRng } = await import(U + '/instrumentation/rng.js');

await runOnce({
    configSeed: ${FIXTURE_SEED}, configIndex: ${FIXTURE_INDEX},
    agentSeed: 20260819000, arm: 'A1',
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${FIXTURE_TICKS}, crashAtTick: null, warmStore: false,
});

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
if (typeof runPrediction !== 'function') throw new Error('§8 handle did not bind');

const states = env.decisionStates(${FIXTURE_GOAL});
const sizes = new Map();
const READOUT_SEED = (u) => 700000 + u;

// One readout: reseed, set the probe, call runPrediction, take step-0 bestChoice,
// then draw a CANARY from the same stream. Equal canaries across arrangements
// prove equal draw counts.
// The canary is drawn AT the step-0 probe, not after the whole readout. What
// must be identical across arrangements is the randomness consumed up to and
// including the step-0 decision — the only decision that bears the statistic.
// Beyond step 0 the imagination chain reacts to a different first move, so its
// draw count legitimately diverges; requiring the post-readout canary to match
// would be requiring the arrangement to have no effect at all.
function readout(u) {
    let best = null, calls = 0, canary0 = null;
    // R2 (UQB-ERR-01 §4/§5): suspend read-side persistence for the duration of
    // the readout, so all 20 arrangements are compared from the same state.
    globalThis.__UQB_FREEZE__ = true;
    // R3 (UQB-ERR-02 §8): suspend regulateBiology's persistent writes, so
    // repeated arrangement measurements probe the same pre-readout cognitive
    // state rather than progressively ageing the agent across arrangement order.
    globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB_PROBE__ = (from, key, step) => {
        calls++;
        if (step === 0 && best === null) { best = key; canary0 = liveRng(); }
    };
    initRng(READOUT_SEED(u));
    runPrediction(u);
    const canary = liveRng();
    globalThis.__UQB_PROBE__ = null;
    globalThis.__UQB_FREEZE__ = false;
    globalThis.__UQB_FREEZE_BIO__ = false;
    return { best, calls, canary, canary0 };
}

// DIAGNOSTIC: a guard-OFF readout pass taken FIRST, before any arrangement has
// run. If it matches the identity arrangement while the LATER guard-off pass
// does not, the difference is readout ORDER, not the machinery.
const offPre = {};
for (const u of states) { const x = readout(u); offPre[u] = { c0: x.canary0, c: x.canary, b: x.best }; }

// Sizes are needed before arrangements can be drawn: one guard-off pass records
// the candidate count at each state without permuting anything.
globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()],
    onDecision: ({ keys }) => { if (!sizes.has(CUR)) sizes.set(CUR, keys.length); } });
let CUR = null;
for (const u of states) { CUR = u; readout(u); }
globalThis.__UQB__ = null;

const out = { states, sizes: [...sizes], offPre, arms: {} };
for (const arm of ['ARMED', 'ABLATED']) {
    const A = P.buildArrangements({ configSeed: ${FIXTURE_SEED}, arm, states, sizes });
    const all = [A.identity, ...A.shuffles];
    const rows = [];
    for (let j = 0; j < all.length; j++) {
        const r = { j, best: {}, canary: {}, calls: {} };
        for (const u of states) {
            // Arrangement 0 is the identity at every candidate count; a shuffled
            // arrangement materialises from its per-state seed at whatever n the
            // decision presents, which is what §6.7 requires inside a readout.
            const sigmaFor = j === 0
                ? (n) => [...Array(n).keys()]
                : (n) => P.permutationFor(A.seeds[j - 1][u], n);
            globalThis.__UQB__ = P.makeGuard({ arm, sigmaFor });
            const x = readout(u);
            r.best[u] = x.best; r.canary[u] = x.canary; r.calls[u] = x.calls;
            r.canary0 = r.canary0 || {}; r.canary0[u] = x.canary0;
            globalThis.__UQB__ = null;
        }
        rows.push(r);
    }
    // A guard-OFF readout, for the identity-equivalence control.
    const off = {}, offCanary0 = {}, offCanary = {};
    for (const u of states) {
        const x = readout(u);
        off[u] = x.best; offCanary0[u] = x.canary0; offCanary[u] = x.canary;
    }
    out.arms[arm] = { rows, off, offCanary0, offCanary, distinct: A.distinct };
}
process.stdout.write('@@UQB@@' + JSON.stringify(out));`;

const R1 = child(READOUT);

P_('B1', R1.states.length === 19, `B — the §7 population is 19 decision states`);
P_('B2', R1.states.every(u => R1.arms.ARMED.rows[0].best[u] !== null
                          && R1.arms.ARMED.rows[0].calls[u] > 0),
   'B — the probe fires and exposes a greedy argmax at every state');
P_('C2', R1.states.every(u => R1.arms.ARMED.rows[0].best[u] === R1.arms.ARMED.off[u]),
   'C — arrangement 0 (identity) reproduces the guard-OFF readout at every state');

{
    const rows = R1.arms.ARMED.rows;
    const differs = R1.states.filter(u => rows.some(r => r.best[u] !== rows[0].best[u]));
    P_('D7', differs.length > 0,
       `D — ANTI-VACUITY: shuffling changes the readout at ${differs.length}/19 states, so the ` +
       'permutation reaches the measured object');
    // The whole-readout canary CANNOT be equal across arrangements, and requiring
    // it was wrong. An arrangement that changes the step-0 choice changes
    // `currentKey` at step 1, hence the later candidate sets, hence the number of
    // scoring.js:211 drift draws. That divergence is the imagination chain
    // reacting to a different first move — downstream of the statistic, which
    // §6.7 fixes at step 0 only.
    //
    // What must hold, and does: arrangements producing the SAME step-0 readout
    // consume identical randomness. Any difference there would be the permutation
    // itself drawing from the agent's streams.
    {
        const groups = new Map();
        for (const u of R1.states) {
            for (const r of rows) {
                const key = u + '|' + r.best[u];
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push({ canary: r.canary[u], calls: r.calls[u] });
            }
        }
        void groups;
        // Requiring the step-0 canary to match under ALL arrangements is still
        // the wrong window, and source says why. `epsilon` is computed at
        // main.js:2326 from cognitive state, and the branch `liveRng() < epsilon`
        // at :2353 draws a SECOND value at :2356 only when taken. Both draws sit
        // AFTER the candidate loop and BEFORE the sort at :2360, so they cannot
        // affect `bestChoice` — but an arrangement that changes the winner
        // changes the state epsilon reads, so the branch can flip and the draw
        // count downstream of the statistic legitimately differs.
        //
        // The claim that must hold, and the one that matters: arrangements
        // reaching the SAME step-0 decision consumed the same randomness. Any
        // difference there would be the permutation drawing on its own account.
        // Grouping by the step-0 winner is ALSO insufficient, and source says why:
        // `epsilon` at main.js:2326 is a function of cognitive state that
        // `updateBehavior` refreshes from the loop's SCORES, not merely from its
        // argmax. Two arrangements can therefore agree on the winner, disagree on
        // the score vector, and take different epsilon branches. No grouping over
        // arrangements isolates the machinery's own draws, because the agent's
        // own randomness is downstream-data-dependent by design.
        //
        // The comparison that DOES isolate it needs no grouping at all: the
        // identity arrangement against the guard-OFF build. Those two must be
        // bit-identical, and if the pre-pass consumed even one draw they could
        // not be. This is exact and end-to-end.
        // The comparison must be LIKE FOR LIKE. `offPre` is the guard-off pass taken
        // at the same position in the readout sequence as arrangement 0; the later
        // guard-off pass is not comparable, because §J below establishes that the
        // readout carries state across calls.
        const idRow = rows[0];
        const drawDrift = R1.states.filter(u => idRow.canary0[u] !== R1.offPre[u].c0);
        P_('E1', drawDrift.length === 0,
           'E — at the same sequence position, the identity arrangement consumes randomness ' +
           'identically to the guard-OFF build at every one of the 19 states: the §6 machinery ' +
           'draws nothing of its own');
        P_('E2', R1.states.every(u => typeof idRow.canary0[u] === 'number'
                                   && typeof R1.arms.ARMED.offCanary0[u] === 'number'),
           'E — both canaries were actually captured at every state, so E1 is not passing on ' +
           'absent data');

        // ------------------------------------------------------------------
        // J — READOUT ORDER-DEPENDENCE. Not a property of the UQ-B machinery;
        // a property of the substrate, surfaced by it.
        //
        // `runPrediction` calls `updateMotivationalState` (main.js:1560), and
        // `render/behavior.js` holds curiosityState / confidenceState /
        // stressState / fatigueState as module-level `export let`. `epsilon`
        // (main.js:2326) reads that state. So an identical readout, taken at two
        // different positions in the sequence, need not consume identical
        // randomness — and §6.2 requires arrangements to be compared under "the
        // same state".
        //
        // This assertion is deliberately NOT weakened to make the milestone pass.
        // It fails while the property holds, which is the correct signal.
        const preVsPost = R1.states.filter(u =>
            R1.offPre[u].c0 !== R1.arms.ARMED.offCanary0[u] ||
            R1.offPre[u].b  !== R1.arms.ARMED.off[u]);
        P_('J1', preVsPost.length === 0,
           `J — the SAME guard-off readout taken before and after the arrangement sweep differs ` +
           `at ${preVsPost.length}/19 states. ACCEPTANCE REQUIRES 0/19 (UQB-ERR-01 §8).`);
        P_('J2', R1.states.every(u => R1.offPre[u].b === R1.arms.ARMED.off[u]),
           'J — the DECISIONS themselves were unaffected in this fixture; the drift observed is ' +
           'in randomness consumed. Reported so the scope of J1 is not overstated.');
    }
    {
        // J3/J4 — the SPAN CONTROL. The state-closure audit at e77de21 bounded
        // runPrediction at main.js:2722, which is where the STEPS loop ends, not
        // where the function ends. It actually spans 1390-3033, so 311 lines were
        // never audited. This control pins the true span so that class of error
        // is detected rather than repeated.
        const LINE_COMMENT = new RegExp('//[^' + String.fromCharCode(92) + 'n]*$');
        const L = mainSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n')
            .map(l => l.replace(LINE_COMMENT, ''));
        const start = L.findIndex(l => /^function runPrediction\(startKey\)/.test(l));
        let d = 0, seen = false, end = -1;
        for (let i = start; i < L.length; i++) {
            for (const ch of L[i]) { if (ch === '{') { d++; seen = true; } else if (ch === '}') d--; }
            if (seen && d === 0) { end = i; break; }
        }
        P_('J3', start + 1 === 1390 && end + 1 === 3033,
           `SPAN — runPrediction spans main.js:${start + 1}..${end + 1}; the closure audit must ` +
           'cover all of it, not merely the STEPS loop that ends at 2722');

        // The unfrozen writer the truncated span hid.
        const tail = L.slice(2722, end + 1).join('\n');
        // Controlled by a Director-authorised erratum: regulateBiology by R3
        // (UQB-ERR-02 §8). Any OTHER cognitive-state writer reached from
        // runPrediction is uncontrolled and must fail this gate.
        const CONTROLLED = ['regulateBiology'];
        const writers = ['regulateBiology', 'updateBehavior', 'changeStress', 'changeFatigue',
                         'applyPredictionErrorToBehavior']
            .filter(f => new RegExp('(?<![A-Za-z0-9_$.])' + f + '\\s*\\(').test(tail));
        const uncontrolled = writers.filter(f => !CONTROLLED.includes(f));
        P_('J4', uncontrolled.length === 0,
           `SPAN — cognitive-state writers reached from runPrediction: ` +
           `${writers.join(', ') || 'none'}; uncontrolled: ` +
           `${uncontrolled.join(', ') || 'none'}. regulateBiology (main.js:2822) is controlled by ` +
           'R3 under UQB-ERR-02 §8.');
        P_('J4m', writers.includes('regulateBiology'),
           'MUTATION GUARD — regulateBiology is still reached from runPrediction, so J4 is not ' +
           'passing because the writer vanished');
    }
    {
        // The structural half of E, which does not depend on any run: the
        // permutation machinery physically cannot draw from the agent's streams.
        const planning = fs.readFileSync(path.join(ROOT, 'render/planning.js'), 'utf8');
        P_('E4', !/liveRng|Math\.random|\brng\(/.test(planning),
           'E — render/planning.js is RNG-free, so moving futureScore into the pre-pass cannot ' +
           'add or remove a draw');
        const L = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8').split('\n');
        const eps = L.findIndex(l => /if \(liveRng\(\) < epsilon/.test(l));
        const srt = L.findIndex(l => /const sorted = choices\.sort/.test(l));
        const bc  = L.findIndex(l => /const bestChoice = sorted\[0\];/.test(l));
        P_('E5', eps > 0 && eps < srt && srt < bc,
           `E — the epsilon draws (main.js:${eps + 1}) precede the sort (:${srt + 1}) and the ` +
           `statistic (:${bc + 1}), so they cannot affect bestChoice`);
    }
    {
        // Comments are stripped first: permute.js's header EXPLAINS that it is
        // independent of instrumentation/rng.js, and a scan that matched its own
        // prose would fail for the wrong reason.
        const LINE_COMMENT = new RegExp('//[^' + String.fromCharCode(92) + 'n]*', 'g');
        const pj = fs.readFileSync(path.join(HERE, 'permute.js'), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(LINE_COMMENT, ' ');
        P_('E3', /mulberry32/.test(pj) && !/instrumentation\/rng/.test(pj) && !/import/.test(pj),
           'E — permute.js uses its own generator and imports NOTHING, so it cannot draw from the ' +
           'agent streams (§6.6)');
    }
}
{
    const rows = R1.arms.ABLATED.rows;
    P_('G3', rows.every(r => R1.states.every(u => r.best[u] === rows[0].best[u])),
       'G — under ABLATED all 20 arrangements produce IDENTICAL readouts: the mandatory §12 ' +
       'wiring control holds end to end');
    // The original G4 compared the ABLATED readout to the guard-OFF readout and
    // required them EQUAL. That was backwards: guard-off is the committed
    // behaviour, which IS the ARMED arm, so requiring the ablated arm to match it
    // would be requiring the exposure to do nothing. The correct control is the
    // opposite, and it is the anti-vacuity one.
    const armedRows = R1.arms.ARMED.rows;
    const changed = R1.states.filter(u => rows[0].best[u] !== armedRows[0].best[u]);
    P_('G4', changed.length > 0,
       `G — ANTI-VACUITY: ablating futureBonus changes the readout at ${changed.length}/19 ` +
       'states, so the §5.1 exposure reaches the measured object');
    P_('G5', R1.states.every(u => armedRows[0].best[u] === R1.arms.ARMED.off[u]),
       'G — while the ARMED identity DOES match the guard-off readout, as C2 requires');
}
P_('F13', R1.arms.ARMED.distinct && R1.arms.ABLATED.distinct,
   'F — distinctness holds on the REAL candidate sizes, not only on synthetic ones');

const R2 = child(READOUT);
P_('H1', JSON.stringify(R1) === JSON.stringify(R2),
   'H — an independent PROCESS reproduces every readout byte-identically');

// ==========================================================================
console.log('\n-- seed accounting ---------------------------------------------------------');
// ==========================================================================
{
    // The MACHINERY is scanned. This verifier is excluded by necessity: it must
    // name the block's bounds in order to check that nothing else does, so
    // including it would make the check unsatisfiable rather than strict.
    const srcs = ['instrument.js', 'permute.js', 'hook.mjs', 'bio.js']
        .map(f => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n');
    const inBlock = [...srcs.matchAll(/\b(89[0-9]{4}|90[0-9]{4})\b/g)]
        .map(m => Number(m[1])).filter(n => n >= BLOCK_LO && n <= BLOCK_HI);
    P_('S1', inBlock.length === 0,
       `no literal in ${BLOCK_LO}-${BLOCK_HI} appears anywhere in the UQ-B machinery`);
    // MUTATION binding the scan's own input: feed it a literal from the frozen
    // block and require the scan to catch it.
    const planted = `const s = ${BLOCK_LO + 42};`;
    const caught = [...planted.matchAll(/\b(89[0-9]{4}|90[0-9]{4})\b/g)]
        .map(m => Number(m[1])).filter(n => n >= BLOCK_LO && n <= BLOCK_HI);
    P_('S1m', caught.length === 1 && caught[0] === BLOCK_LO + 42,
       'MUTATION — the scan detects a planted in-block literal, so S1 is not vacuous');
    P_('S2', FIXTURE_SEED < BLOCK_LO,
       `the fixture seed ${FIXTURE_SEED} lies outside the frozen block`);
    P_('S3', baseline.evaluatedSeeds.every(s => s < BLOCK_LO || s > BLOCK_HI),
       'no run in this verification evaluated a seed inside the frozen block');
}

// ==========================================================================
console.log('\n-- R. the R2 repair: return semantics, persistence, default-off ------------');
// ==========================================================================
{
    const peRaw = fs.readFileSync(path.join(ROOT, 'render/predictionError.js'), 'utf8');
    const peLF = peRaw.split('\r\n').join('\n');
    const peT = I.transformPredictionError(peLF);
    const a = peLF.split('\n'), b = peT.split('\n');
    const diff = a.map((l, i) => i).filter(i => a[i] !== b[i]);

    P_('R1', a.length === b.length && diff.length === 2,
       `the R2 transform changes exactly two lines (predictionError.js:${diff.map(i => i + 1).join(', ')})`);
    P_('R2', diff.every(i => /globalThis\.__UQB_FREEZE__/.test(b[i])
                          && /transitionUncertaintyMap\.(delete|set)/.test(b[i])),
       'both changed lines are the persistence statements, now guarded');
    P_('R3', b.filter(l => /transitionUncertaintyMap\.(delete|set)/.test(l)
                        && !/__UQB_FREEZE__/.test(l)).length
          === a.filter(l => /transitionUncertaintyMap\.(delete|set)/.test(l)).length - 2,
       'every OTHER persistence statement is untouched — decayTransitionUncertainties still persists');
    P_('R4', I.transformPredictionError(peLF.split('\n').join('\r\n')).includes('\r\n'),
       'the R2 transform is terminator-agnostic and preserves the input form');
    P_('R5', throws(() => I.transformPredictionError(
            peLF.replace('        transitionUncertaintyMap.delete(key);', '        noop();'))),
       'MUTATION — a missing delete statement is REFUSED');
    P_('R6', throws(() => I.transformPredictionError(
            peLF.replace('    transitionUncertaintyMap.set(key, decayed);', '    noop();'))),
       'MUTATION — a missing set statement is REFUSED');
    P_('R7', throws(() => I.transformPredictionError(
            peLF.replace('export function getTransitionUncertainty(fromId, toId) {',
                         'export function getTransitionUncertaintyX(fromId, toId) {'))),
       'MUTATION — a renamed target function is REFUSED');
}

// Return semantics and persistence, exercised on the REAL module through the
// real hook, walking the stored value down through the < 0.005 threshold.
const SEM = child(`
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
register(U + '/experiments/uqb/hook.mjs', import.meta.url);
const pe = await import(U + '/render/predictionError.js');

const F = 9001, T = 9002;
for (let i = 0; i < 400; i++) pe.updateTransitionUncertainty(F, T, 1);

const rows = [];
let guard = 0;
while (pe.peekTransitionUncertainty(F, T) > 0 && guard++ < 5000) {
    const before = pe.peekTransitionUncertainty(F, T);
    globalThis.__UQB_FREEZE__ = true;
    const rOn = pe.getTransitionUncertainty(F, T);
    const afterOn = pe.peekTransitionUncertainty(F, T);
    globalThis.__UQB_FREEZE__ = false;
    const rOff = pe.getTransitionUncertainty(F, T);
    const afterOff = pe.peekTransitionUncertainty(F, T);
    rows.push({ before, rOn, afterOn, rOff, afterOff });
}
process.stdout.write('@@UQB@@' + JSON.stringify({ rows, guard }));
`);
{
    const rows = SEM.rows;
    P_('R8', rows.length > 100,
       `the sweep walked ${rows.length} distinct stored values down to zero`);
    P_('R9', rows.filter(r => r.rOn !== r.rOff).length === 0,
       'RETURN SEMANTICS — the frozen getter returns EXACTLY the committed value at every one of ' +
       `the ${rows.length} sampled stored values`);
    const crossed = rows.filter(r => r.rOff === 0);
    P_('R10', crossed.length > 0 && crossed.every(r => r.rOn === 0),
       `RETURN SEMANTICS — the < 0.005 threshold branch was exercised (${crossed.length} samples) ` +
       'and the frozen getter returns 0 there too');
    P_('R11', rows.every(r => r.afterOn === r.before),
       'PERSISTENCE — under the freeze guard the stored value is UNCHANGED at every sample, ' +
       'including across the threshold where the committed code deletes the entry');
    P_('R12', rows.every(r => r.afterOff !== r.before || r.before === 0),
       'PERSISTENCE — with the guard OFF the stored value DOES change, so R11 is not vacuous');
}

// ==========================================================================
console.log('\n-- B. the R3 control: regulateBiology persistence suspended -----------------');
// ==========================================================================
{
    const behRaw = fs.readFileSync(path.join(ROOT, 'render/behavior.js'), 'utf8');
    const behLF = behRaw.split('\r\n').join('\n');
    const L = BIO.bioLines(behLF);
    const t = BIO.transformBehavior(behLF);
    const a = behLF.split('\n'), b = t.split('\n');

    P_('BIO1', L.decl === 105 && L.open === 119 && L.close === 339,
       `TARGET — regulateBiology identified at behavior.js:${L.decl}, body ${L.open}..${L.close}`);
    P_('BIO2', b.length - a.length === 5,
       'the transform adds exactly 5 lines: 1 snapshot at body entry, 4 restore at body exit');
    P_('BIO3', BIO.BIO_STATES.length === 9 && BIO.BIO_WRITE_STATEMENTS === 34,
       `SCOPE — nine persistent bindings, ${BIO.BIO_WRITE_STATEMENTS} write statements pinned`);
    {
        const added = [];
        let j = 0;
        for (let i = 0; i < b.length; i++) { if (j < a.length && a[j] === b[i]) j++; else added.push(b[i]); }
        // The restore block's closing brace legitimately names no binding, so
        // requiring every LINE to reference the snapshot was the wrong shape.
        // What must hold: the block is entered only under the guard, and every
        // line inside it that does anything references the snapshot.
        const meaningful = added.filter(l => l.trim() !== '}');
        P_('BIO4', added.length === 5 && meaningful.every(l => /__UQB_BIO/.test(l))
                && /^\s*if \(__UQB_BIO\) \{$/.test(added[1]),
           'the restore block is entered only under the snapshot guard, and every acting line ' +
           'inside it references the snapshot');
        P_('BIO5', BIO.BIO_STATES.every(s => added.some(l => l.includes(s + ' = __UQB_BIO['))),
           'INTENDED WRITES — all nine bindings are restored, none omitted');
        // No unrelated binding may be restored.
        const restored = [...added.join('\n').matchAll(/([A-Za-z_$][A-Za-z0-9_$]*) = __UQB_BIO\[/g)]
            .map(m => m[1]);
        P_('BIO6', restored.length === 9 && restored.every(r => BIO.BIO_STATES.includes(r)),
           `NO UNRELATED WRITES — exactly ${restored.length} bindings restored, all from the ` +
           'authorised set');
        P_('BIO7', added[0].includes(BIO.BIO_GUARD) && /: null;$/.test(added[0].trim()),
           'the snapshot is guarded and is null when the guard is unset');
    }
    P_('BIO8', BIO.transformBehavior(behLF.split('\n').join('\r\n')).includes('\r\n')
          && BIO.transformBehavior(behLF.split('\n').join('\r\n')).split('\r\n').join('\n') === t,
       'terminator-agnostic: CRLF input keeps CRLF and agrees with the LF transform');
    // MUTATIONS binding the real source.
    P_('BIO9', throws(() => BIO.transformBehavior(
            behLF.replace('export function regulateBiology({', 'export function regulateBiologyX({'))),
       'MUTATION — a renamed target function is REFUSED');
    P_('BIO10', throws(() => BIO.transformBehavior(
            behLF.replace('    restingState = true;', '    return;'))),
       'MUTATION — a `return` in the body is REFUSED: a tail restore would be unreachable');
    P_('BIO11', throws(() => BIO.transformBehavior(
            behLF.replace('    restingState = true;', '    void 0;'))),
       'MUTATION — a removed write is REFUSED: the pinned statement count would not match');
}

// The control, exercised on the REAL module through the REAL hook.
const BIOSEM = child(`
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
register(U + '/experiments/uqb/hook.mjs', import.meta.url);
const beh = await import(U + '/render/behavior.js');
const S = ['curiosityState','confidenceState','stressState','fatigueState','focusState',
           'energyState','exhaustionState','restingState','loopStressState'];
const snap = () => S.map(k => beh[k]);
const args = { activity: 1, mentalLoad: 4, repetition: 2, loopDepth: 1, danger: 0, isHome: false };

const before = snap();
globalThis.__UQB_FREEZE_BIO__ = true;
for (let i = 0; i < 50; i++) beh.regulateBiology(args);
const afterOn = snap();
globalThis.__UQB_FREEZE_BIO__ = false;
beh.regulateBiology(args);
const afterOff = snap();
process.stdout.write('@@UQB@@' + JSON.stringify({ S, before, afterOn, afterOff }));
`);
{
    const { S, before, afterOn, afterOff } = BIOSEM;
    P_('BIO12', S.every((k, i) => afterOn[i] === before[i]),
       'GUARD ON — 50 regulateBiology calls left all nine bindings EXACTLY unchanged');
    P_('BIO13', S.some((k, i) => afterOff[i] !== before[i]),
       'GUARD OFF — a single call DOES change them, so B12 is not vacuous');
    const changed = S.filter((k, i) => afterOff[i] !== before[i]);
    // No arbitrary count is asserted. Many of the 34 writes are conditional on
    // state thresholds, so how many bindings move in ONE call is data-dependent
    // and is not a property the control must have. What must hold is that every
    // binding that DID move is one the snapshot covers.
    P_('BIO14', changed.length > 0 && changed.every(c => BIO.BIO_STATES.includes(c)),
       `GUARD OFF — ${changed.length} of 9 bindings moved in one call (${changed.join(', ')}), ` +
       'all of them inside the authorised snapshot set');
}

// Structural ordering: the control cannot alter the current call's bestChoice.
{
    const L = mainSrc.split('\n');
    const bc = L.findIndex(l => /const bestChoice = sorted\[0\];/.test(l));
    const rb = L.findIndex(l => /regulateBiology\(\{/.test(l));
    P_('BIO15', bc > 0 && rb > 0 && bc < rb,
       `ORDERING — bestChoice is determined at main.js:${bc + 1}, regulateBiology runs at ` +
       `:${rb + 1}. The control therefore cannot alter the value measured in its own call ` +
       '(UQB-ERR-02 §4/§5) — structural, not empirical.');
}

console.log('\n' + '='.repeat(80));
console.log(`  ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

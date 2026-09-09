// ==========================================================
// UQ-B INSTRUMENTATION — the two frozen §13 prerequisites, by source transform
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQB_PREREGISTRATION.md, frozen at 3b3d195, digest
//   bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e.
//   §5.1 exposure · §6 permutation · §8 readout · §15 neutrality.
//
// WHAT THIS BUILDS
//   1. §8 — a guarded probe exposing the greedy `bestChoice` AFTER candidate
//      sorting and BEFORE the exploration override is applied.
//   2. §6 — the two-pass candidate-loop restructuring that permutes ONLY the
//      assignment of `futureBonus` values across candidates within a decision.
//
// DEFAULT-OFF IS THE WHOLE SAFETY ARGUMENT (§15)
//   Both interventions are guarded on globals. With `__UQB__` and `__UQB_PROBE__`
//   unset, every injected site is ONE falsy global read and the committed
//   expressions run exactly as written. No production source file is modified:
//   the transform runs in memory through an ESM load hook, the technique proven
//   by M8, Q1 and UQ-A.
//
// WHY THE LOOP MUST BECOME TWO PASSES
//   `futureBonus` is computed at `main.js:1860-1861` and consumed at `:2081`
//   inside ONE iteration of `allCandidates.forEach` (opens `:1594`). A
//   permutation needs every candidate's value before any candidate is scored, so
//   the values must be computed in a pre-pass. `allCandidates` is complete at
//   `:1580-1590`, before the loop, which is what makes this possible (fact G9).
//
// THE PRE-PASS IS NEUTRAL, AND THAT IS PROVEN NOT ASSUMED
//   `futureScore` and `lookAheadScore` are pure — `Map.get`, node lookup and
//   arithmetic only, no writes and no RNG (fact G7). So moving the computation
//   earlier changes no state and consumes no randomness. When the guard is on
//   the in-loop call is REMOVED, so `futureScore` runs exactly once per
//   candidate, as it does unguarded: the computational budget is identical in
//   every arm and every arrangement (§6.2).
//
// THE CAP STAYS IN PRODUCTION CODE
//   `Math.min(imaginedFuture * 4, 20)` (`main.js:1861`) is applied inside the
//   pre-pass's supplied compute function, so the permuted values are the
//   post-cap `futureBonus` the frozen §6.2 names — not a pre-cap surrogate.
//
// FAILS CLOSED
//   A missing, duplicated or structurally moved anchor throws. A silently
//   skipped transform would produce an unpermuted run labelled as an
//   arrangement, which is the worst failure this experiment could have.
// ==========================================================

// ---------------------------------------------------------------------------
// Anchors — the exact committed text, trailing whitespace excluded.
// main.js is LF-only and carries trailing spaces on some lines (main.js:2046 in
// UQ-A was the precedent), so every anchor is matched trailing-trimmed while
// LEADING indentation is preserved: indentation is part of the structural
// identity being asserted, and left-trimming would match the same text in a
// different block.
// ---------------------------------------------------------------------------

/** §8 — the greedy argmax, after sorting and before the override is applied. */
export const ANCHOR_BESTCHOICE = 'const bestChoice = sorted[0];';

/** §6 — the candidate loop head; the pre-pass is injected immediately before it. */
export const ANCHOR_LOOP = '  allCandidates.forEach((value, k) => {';

/** §6 — the in-loop `futureScore` call, replaced by the pre-pass under the guard. */
export const ANCHOR_IMAGINED = [
    '  const imaginedFuture = targetNeuronForFuture',
    '      ? futureScore(',
    '          targetNeuronForFuture,',
    '          goalNeuronId,',
    '          rewards,',
    '          penalties,',
    '          curiosityMap,',
    '          3',
    '        )',
    '      : 0;',
];

/** §6 — the value the permutation assigns. */
export const ANCHOR_FUTUREBONUS = [
    '  const futureBonus =',
    '  Math.min(imaginedFuture * 4, 20);',
];

// The identifiers whose occurrence counts pin the transform's reach. These are
// the COUNTS IN THE COMMITTED FILE, read from source rather than assumed: the
// pin's job is to detect drift from what was audited, so it must be calibrated
// to what is actually there.
//   futureBonus 4    :1860 declaration, :2081 the single behavioural use, and
//                    the property keys at :2664 (HUD mirror) and :5457 (a reset
//                    literal). Only :1860 and :2081 are the local this
//                    transform touches; the other two are unrelated keys and
//                    are counted so that adding one is detected.
//   imaginedFuture 2 :1841 declaration, :1861 the single use inside the cap.
//   bestChoice 11    :2365 declaration, then the schema-reuse log block
//                    (:2379-2391), the `best:` assignment at :2404, and the
//                    unrelated uses at :2665 and :3356.
export const PINNED_IDENTIFIERS = Object.freeze({
    futureBonus: 4,
    imaginedFuture: 2,
    bestChoice: 11,
});

const trimEnd = (s) => s.replace(/\s+$/, '');

/** Locates a contiguous block of lines, trailing-trimmed. Returns its index. */
function findBlock(lines, block, what) {
    const hits = [];
    for (let i = 0; i + block.length <= lines.length; i++) {
        let ok = true;
        for (let j = 0; j < block.length; j++) {
            if (trimEnd(lines[i + j]) !== block[j]) { ok = false; break; }
        }
        if (ok) hits.push(i);
    }
    if (hits.length !== 1) {
        throw new Error(`UQ-B: anchor "${what}" matched ${hits.length} sites, expected exactly 1. ` +
            `The committed source moved; the transform refuses to guess.`);
    }
    return hits[0];
}

function findLine(lines, text, what) {
    const hits = [];
    for (let i = 0; i < lines.length; i++) if (trimEnd(lines[i]) === text) hits.push(i);
    if (hits.length !== 1) {
        throw new Error(`UQ-B: anchor "${what}" matched ${hits.length} lines, expected exactly 1: ` +
            `${JSON.stringify(text)}`);
    }
    return hits[0];
}

// ---------------------------------------------------------------------------
// The injected text. Every line is guarded; with the guard unset each site is
// one falsy global read and the committed expression runs unchanged.
// ---------------------------------------------------------------------------

const PROBE_INJECT =
`if (globalThis.__UQB_PROBE__) globalThis.__UQB_PROBE__(currentKey, bestChoice ? bestChoice.key : null, step);`;

// §8 plumbing. `runPrediction` is a top-level function declaration in main.js
// and is not exported, so a readout driver cannot reach it. Function
// declarations are hoisted to module scope, so a guarded handle appended at the
// end of the module exposes it without touching its definition, its call sites,
// or any production behaviour. With the guard unset this is one falsy read.
// This is plumbing authorised by §29 ("the readout driver"), not a new
// scientific quantity.
const EXPOSE_INJECT =
`if (globalThis.__UQB_EXPOSE__) globalThis.__UQB_EXPOSE__.runPrediction = runPrediction;`;

const PREPASS_INJECT = [
'  // UQ-B §6 — guarded pre-pass, default-off. With globalThis.__UQB__ unset this',
'  // is one falsy read, __UQB_FB stays null, and every futureBonus below is',
'  // computed exactly as the committed code computes it.',
'  const __UQB_FB = globalThis.__UQB__',
'      ? globalThis.__UQB__.buildFutureBonus([...allCandidates.keys()], (kk) => {',
'            const n = findNeuronById(kk);',
'            return Math.min((n ? futureScore(n, goalNeuronId, rewards, penalties,',
'                                             curiosityMap, 3) : 0) * 4, 20);',
'        })',
'      : null;',
];

const IMAGINED_REPLACE = [
'  const imaginedFuture = (__UQB_FB || !targetNeuronForFuture)',
'      ? 0',
'      : futureScore(',
'          targetNeuronForFuture,',
'          goalNeuronId,',
'          rewards,',
'          penalties,',
'          curiosityMap,',
'          3',
'        );',
];

const FUTUREBONUS_REPLACE = [
'  const futureBonus =',
'  __UQB_FB ? __UQB_FB.get(k) : Math.min(imaginedFuture * 4, 20);',
];

/**
 * Pure. Returns the transformed source.
 *
 * @param {string} source  committed main.js
 * @param {object} o
 *   probe    inject the §8 bestChoice probe        (default true)
 *   permute  inject the §6 two-pass restructuring  (default true)
 *   expose   inject the §8 runPrediction handle    (default true)
 *
 * Both injections are guarded, so `transform(src, {probe:true, permute:true})`
 * with no globals set is behaviourally identical to the committed source. The
 * flags exist so the verifier can isolate each intervention.
 */
export function transform(source, o = {}) {
    const probe = o.probe !== false;
    const permute = o.permute !== false;
    const expose = o.expose !== false;

    // TERMINATOR-AGNOSTIC, and it has to be. Under core.autocrlf=true a fresh
    // clone materialises main.js with CRLF, so a transform that demanded LF could
    // not run from a clone at all — the defect UQ-A hit and fixed at 96c8da1.
    // Terminators are semantically void in JavaScript, so anchors are matched
    // against the LF-normalised text and the file's OWN terminator is restored on
    // output. A guard-off transform therefore stays byte-identical on either form.
    const raw = String(source);
    const crlf = raw.includes('\r\n');
    const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
    if (text.includes('\r')) {
        throw new Error('UQ-B: main.js contains a bare carriage return; only LF and CRLF ' +
            'terminators are recognised and anchor identity cannot be asserted.');
    }
    const lines = text.split('\n');

    // Occurrence pins: assert the transform's reach before changing anything.
    for (const [id, expected] of Object.entries(PINNED_IDENTIFIERS)) {
        const re = new RegExp('(?<![A-Za-z0-9_$])' + id + '(?![A-Za-z0-9_$])', 'g');
        const n = (text.match(re) || []).length;
        if (n !== expected) {
            throw new Error(`UQ-B: identifier "${id}" occurs ${n} times, expected ${expected}. ` +
                `The transform's reach is not the reach the frozen protocol describes.`);
        }
    }

    // Resolve every anchor BEFORE mutating, so a partial transform is impossible.
    const atBest = findLine(lines, ANCHOR_BESTCHOICE, 'bestChoice');
    const atLoop = findLine(lines, ANCHOR_LOOP, 'candidate loop head');
    const atImag = findBlock(lines, ANCHOR_IMAGINED, 'imaginedFuture');
    const atFb   = findBlock(lines, ANCHOR_FUTUREBONUS, 'futureBonus');

    // Structural pin: the pre-pass must land before the loop, the loop before
    // the value, and the value before the choice. If the file were reorganised
    // so that order no longer held, the transform would be meaningless.
    if (!(atLoop < atImag && atImag < atFb && atFb < atBest)) {
        throw new Error(`UQ-B: anchors are out of order (loop ${atLoop + 1}, imagined ${atImag + 1}, ` +
            `futureBonus ${atFb + 1}, bestChoice ${atBest + 1}). The committed structure changed.`);
    }

    // A top-level `function runPrediction` must exist for the §8 handle to bind.
    if (expose) {
        const decl = lines.filter(l => /^function runPrediction\(startKey\) \{/.test(trimEnd(l)));
        if (decl.length !== 1) {
            throw new Error(`UQ-B: found ${decl.length} top-level \`function runPrediction(startKey)\` ` +
                `declarations, expected exactly 1. The §8 readout handle cannot be bound.`);
        }
    }

    // Apply from the BOTTOM UP so earlier indices stay valid.
    const out = lines.slice();
    if (expose) out.push(EXPOSE_INJECT);
    if (probe) {
        const indent = out[atBest].match(/^\s*/)[0];
        out.splice(atBest + 1, 0, indent + PROBE_INJECT);
    }
    if (permute) {
        out.splice(atFb, ANCHOR_FUTUREBONUS.length, ...FUTUREBONUS_REPLACE);
        out.splice(atImag, ANCHOR_IMAGINED.length, ...IMAGINED_REPLACE);
        out.splice(atLoop, 0, ...PREPASS_INJECT);
    }
    // Restore the input's own terminator, so a guard-off transform of a CRLF
    // checkout is byte-identical to that checkout.
    return out.join(crlf ? '\r\n' : '\n');
}

/** The anchor line numbers in the committed source, for reporting. */
export function anchorLines(source) {
    const lines = String(source).replace(/\r\n/g, '\n').split('\n');
    return {
        loop: findLine(lines, ANCHOR_LOOP, 'candidate loop head') + 1,
        imaginedFuture: findBlock(lines, ANCHOR_IMAGINED, 'imaginedFuture') + 1,
        futureBonus: findBlock(lines, ANCHOR_FUTUREBONUS, 'futureBonus') + 1,
        bestChoice: findLine(lines, ANCHOR_BESTCHOICE, 'bestChoice') + 1,
    };
}

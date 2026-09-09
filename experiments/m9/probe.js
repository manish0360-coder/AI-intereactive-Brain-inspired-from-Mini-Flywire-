// ==========================================================
// M9 — GOAL16/STATE3 FAILURE DIAGNOSTIC — candidate-ledger probe
// ==========================================================
// THE ONE QUESTION
//   At goal 16 / state 3, is `allCandidates`
//     A) EMPTY at candidate-generation time, or
//     B) non-empty but subsequently filtered to nothing?
//
//   UQ-B recorded 24 FAILED configurations, every one at configIndex 2
//   (goal 16), every one at state 3, with zero failures at any other index.
//   The readout is null exactly when `bestChoice = sorted[0]` is undefined,
//   which happens exactly when `choices` is empty. `choices` is built by
//   filtering `allCandidates`, so the binary question above is the complete
//   decomposition of the failure.
//
// WHAT THIS PROBE DOES
//   Counts. Nothing else. It records
//     - allCandidates.size at loop entry
//     - how many candidates each of the four filter stages rejected
//     - choices.length at the sort
//   and never changes a value, a branch, an order, or an RNG draw.
//
// WHAT IT DOES NOT DO
//   It does not repair goal 16. It does not change the frozen UQ-B protocol,
//   re-run any registered seed, or produce any study result. It answers one
//   binary question and stops.
//
// THE FOUR FILTER STAGES, in source order inside the candidate loop
//   F1  penalties.get(currentKey + "->" + k) > 10
//   F2  candidateQ < -0.5
//   F3  graph-integrity: !isGraphNeighbor && !isEpisodeTrained && !isHumanTrained
//   F4  goal-reachability: goalNeuronId !== null && !canReachGoal(k, goalNeuronId)
//
//   F4 is the only stage that depends on the goal, which makes it an a-priori
//   suspect for a goal-specific failure. The probe deliberately counts ALL
//   FOUR anyway: the milestone requires measuring the cause, not assuming it.
//   If the probe only watched F4 it could not distinguish "F4 rejected them"
//   from "F3 rejected them first and F4 never saw them".
//
// DEFAULT-OFF
//   Every injected site is one falsy read of `globalThis.__M9__`. With it
//   unset, `__M9` is null and the committed code runs unchanged.
// ==========================================================

export const ANCHOR_CHOICES = '  const choices = [];';
export const ANCHOR_LOOP    = '  allCandidates.forEach((value, k) => {';
export const ANCHOR_PUSH    = '  choices.push({';
export const ANCHOR_SORT    = 'const sorted = choices.sort((a, b) => b.weight - a.weight);';

/** Pinned: the candidate loop has exactly four early-exit filter stages. */
export const FILTER_STAGES = 4;

export const STAGE_NAMES = Object.freeze([
    'F1 penalty>10',
    'F2 Q<-0.5',
    'F3 graph-integrity',
    'F4 goal-reachability',
]);

export const GUARD = 'globalThis.__M9__';

const trimEnd = (s) => s.replace(/\s+$/, '');

/**
 * Pure. Injects the guarded candidate ledger into main.js.
 *
 * Terminator-agnostic, like the UQ-B transforms: a CRLF checkout must produce
 * the same result as an LF one, or the diagnostic would not run on a fresh
 * clone. (The defect UQ-A fixed at 96c8da1.)
 */
export function transformCandidates(source) {
    const raw = String(source);
    const crlf = raw.includes('\r\n');
    const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
    if (text.includes('\r')) {
        throw new Error('M9: main.js contains a bare carriage return; only LF and CRLF ' +
            'terminators are recognised.');
    }
    const lines = text.split('\n');

    const findOne = (anchor, label) => {
        const hits = [];
        lines.forEach((l, i) => { if (trimEnd(l) === anchor) hits.push(i); });
        if (hits.length !== 1) {
            throw new Error(`M9: expected exactly one ${label} anchor ${JSON.stringify(anchor)}, ` +
                `found ${hits.length}. main.js moved; the transform refuses to guess.`);
        }
        return hits[0];
    };

    const iChoices = findOne(ANCHOR_CHOICES, 'choices-declaration');
    const iLoop    = findOne(ANCHOR_LOOP, 'candidate-loop');
    const iPush    = findOne(ANCHOR_PUSH, 'choices.push');
    const iSort    = findOne(ANCHOR_SORT, 'sort');

    if (!(iChoices < iLoop && iLoop < iPush && iPush < iSort)) {
        throw new Error('M9: the four anchors are not in the expected order ' +
            `(choices ${iChoices + 1}, loop ${iLoop + 1}, push ${iPush + 1}, sort ${iSort + 1}).`);
    }

    // The filter stages are the bare `return;` statements between the loop head
    // and the push. Located structurally rather than by line number, so the
    // transform survives edits elsewhere in the file and REFUSES if the filter
    // structure itself changes.
    const returns = [];
    for (let i = iLoop + 1; i < iPush; i++) {
        if (/^\s*return;\s*(\/\/.*)?$/.test(lines[i])) returns.push(i);
    }
    if (returns.length !== FILTER_STAGES) {
        throw new Error(`M9: found ${returns.length} filter stages in the candidate loop, ` +
            `expected ${FILTER_STAGES}. The filter structure changed; the stage numbering ` +
            `in STAGE_NAMES would no longer mean what it says.`);
    }

    const out = lines.slice();
    // Inject from the BOTTOM up so earlier indices stay valid.
    out.splice(iSort, 0, `  if (__M9) __M9.end(choices.length);`);
    for (let s = returns.length - 1; s >= 0; s--) {
        const indent = (lines[returns[s]].match(/^\s*/) || [''])[0];
        out.splice(returns[s], 0, `${indent}if (__M9) __M9.reject(${s});`);
    }
    out.splice(iChoices + 1, 0,
        `  const __M9 = ${GUARD} ? ${GUARD}.begin(currentKey, allCandidates.size) : null;`);

    const joined = out.join('\n');
    return crlf ? joined.replace(/\n/g, '\r\n') : joined;
}

/** Lines the transform adds: one begin, one per stage, one end. */
export const INJECTED_LINES = 1 + FILTER_STAGES + 1;

/**
 * The ledger installed at `globalThis.__M9__` during a diagnostic call.
 * Counting only — it holds no reference to any candidate and mutates nothing
 * the agent can observe.
 */
export function makeLedger() {
    const records = [];
    return {
        records,
        // Returns a handle bound to THIS call's record, not a shared cursor.
        // runPrediction can recurse or interleave; a module-level cursor would
        // silently attribute one call's rejections to another.
        begin(currentKey, size) {
            const rec = {
                currentKey, allCandidatesSize: size,
                rejected: new Array(FILTER_STAGES).fill(0),
                choicesLength: null,
            };
            records.push(rec);
            return {
                reject(stage) { rec.rejected[stage]++; },
                end(n) { rec.choicesLength = n; },
            };
        },
    };
}

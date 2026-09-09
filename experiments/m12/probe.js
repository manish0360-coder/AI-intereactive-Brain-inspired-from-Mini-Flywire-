// ==========================================================
// M12 — F1/F2/F3 CANDIDATE-FILTER AUDIT — per-candidate input recorder
// ==========================================================
// M9's ledger counted WHICH stage rejected. That is not enough to characterise
// INTERACTIONS: because the filters are early-`return`s, a candidate rejected by
// F1 is never seen by F2/F3, so the counts alone cannot say whether a candidate
// was removable by one filter only or by several.
//
// This probe records, per candidate, the RAW INPUTS each filter reads — not the
// filters' verdicts. The four predicates are then recomputed offline from those
// inputs, using thresholds read from the source, which makes every filter's
// verdict available for EVERY candidate including ones the real loop
// short-circuited past.
//
// SELF-VERIFYING, so the duplicated read expressions cannot silently diverge:
// the offline predicates must predict the stage the real loop actually took.
// verify_m12.js fails if they ever disagree.
//
// NO ORACLE IS INTRODUCED HERE. This file records inputs and nothing else. It
// asserts nothing about what the filters SHOULD do.
//
// DEFAULT-OFF: every injected site is one falsy read of globalThis.__M12__.
// ==========================================================

export const ANCHOR_LOOP  = '  allCandidates.forEach((value, k) => {';
export const ANCHOR_PUSH  = '  choices.push({';
export const ANCHOR_SORT  = 'const sorted = choices.sort((a, b) => b.weight - a.weight);';
export const FILTER_STAGES = 4;
export const GUARD = 'globalThis.__M12__';

/** Stage names in source order. F4 is included for interaction analysis only. */
export const STAGE_NAMES = Object.freeze([
    'F1 penalty>10', 'F2 Q<-0.5', 'F3 graph-integrity', 'F4 goal-reachability',
]);

/**
 * Thresholds, transcribed from main.js. Recorded as data so the audit reports
 * the numbers it actually used rather than burying them in code.
 */
export const THRESHOLDS = Object.freeze({
    F1_penaltyOver: 10,       // if (penalties.get(currentKey + "->" + k) > 10)
    F2_qUnder: -0.5,          // if (candidateQ < -0.5)
    F3_trainedStrengthOver: 5,// isEpisodeTrained = trainedStrength > 5
    F3_rewardOver: 4,         // isHumanTrained = rewardStrength > 4 && witness > 0
    F3_witnessOver: 0,
    F4_maxDepth: 4,
});

const trimEnd = (s) => s.replace(/\s+$/, '');

// The capture reads exactly the expressions the filters read. `??` is avoided
// so the recorded value distinguishes "absent" (undefined) from a stored 0 —
// that distinction is itself part of F1's semantics.
const CAPTURE =
    '  if (' + GUARD + ') ' + GUARD + '.candidate(currentKey, k, ' +
    'penalties.get(currentKey + "->" + k), ' +
    'getQ(makeStateKey(currentKey, goalNeuronId), k), ' +
    'structureMap.has(k), ' +
    '(transitions.get(currentKey) ? transitions.get(currentKey).get(k) : undefined), ' +
    'rewards.get(currentKey + "->" + k), ' +
    'adjacencyMemory.get(currentKey + "->" + k), ' +
    'goalNeuronId);';

export function transformFilters(source) {
    const raw = String(source);
    const crlf = raw.includes('\r\n');
    const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
    if (text.includes('\r')) throw new Error('M12: bare carriage return in main.js.');
    const lines = text.split('\n');

    const findOne = (anchor, label) => {
        const hits = [];
        lines.forEach((l, i) => { if (trimEnd(l) === anchor) hits.push(i); });
        if (hits.length !== 1) {
            throw new Error(`M12: expected exactly one ${label} anchor, found ${hits.length}.`);
        }
        return hits[0];
    };
    const iLoop = findOne(ANCHOR_LOOP, 'candidate-loop');
    const iPush = findOne(ANCHOR_PUSH, 'choices.push');
    const iSort = findOne(ANCHOR_SORT, 'sort');
    if (!(iLoop < iPush && iPush < iSort)) throw new Error('M12: anchors out of order.');

    const returns = [];
    for (let i = iLoop + 1; i < iPush; i++) {
        if (/^\s*return;\s*(\/\/.*)?$/.test(lines[i])) returns.push(i);
    }
    if (returns.length !== FILTER_STAGES) {
        throw new Error(`M12: found ${returns.length} filter stages, expected ${FILTER_STAGES}. ` +
            `The filter structure changed; STAGE_NAMES would mislabel.`);
    }

    const out = lines.slice();
    out.splice(iSort, 0, `  if (${GUARD}) ${GUARD}.end(choices.length);`);
    for (let s = returns.length - 1; s >= 0; s--) {
        const indent = (lines[returns[s]].match(/^\s*/) || [''])[0];
        out.splice(returns[s], 0, `${indent}if (${GUARD}) ${GUARD}.reject(${s});`);
    }
    out.splice(iLoop + 1, 0, CAPTURE);

    const joined = out.join('\n');
    return crlf ? joined.replace(/\n/g, '\r\n') : joined;
}

export const INJECTED_LINES = 1 + FILTER_STAGES + 1;

/** Records inputs. Holds no reference to any candidate object and mutates nothing. */
export function makeRecorder() {
    const records = [];
    let cur = null;
    return {
        records,
        candidate(currentKey, k, penalty, q, graphNeighbor, trainedStrength,
                  reward, witness, goalNeuronId) {
            cur = {
                currentKey, k, kType: typeof k, currentKeyType: typeof currentKey,
                penalty, q, graphNeighbor, trainedStrength, reward, witness, goalNeuronId,
                rejectedAt: null,        // stage index, or null if it reached choices
            };
            records.push(cur);
        },
        reject(stage) { if (cur) cur.rejectedAt = stage; },
        end(n) { records.choicesLength = n; },
    };
}

/**
 * The four predicates, recomputed from recorded inputs using THRESHOLDS.
 * `canReach` is supplied by the caller (pure graph function) so this module
 * needs no graph of its own.
 */
export function predicates(rec, canReach) {
    const f1 = rec.penalty > THRESHOLDS.F1_penaltyOver;
    const f2 = rec.q < THRESHOLDS.F2_qUnder;
    const isEpisodeTrained = (rec.trainedStrength || 0) > THRESHOLDS.F3_trainedStrengthOver;
    const isHumanTrained = (rec.reward || 0) > THRESHOLDS.F3_rewardOver &&
                           (rec.witness || 0) > THRESHOLDS.F3_witnessOver;
    const f3 = !rec.graphNeighbor && !isEpisodeTrained && !isHumanTrained;
    const f4 = rec.goalNeuronId !== null && !canReach(rec.k, rec.goalNeuronId);
    return { f1, f2, f3, f4, isEpisodeTrained, isHumanTrained,
             rejects: [f1, f2, f3, f4] };
}

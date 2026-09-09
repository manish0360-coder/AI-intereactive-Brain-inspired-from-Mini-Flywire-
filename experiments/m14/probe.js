// ==========================================================
// M14 — decision-time pool recorder (formulation de-risking only)
// ==========================================================
// M13 established that the greedy decision is fixed at `const bestChoice =
// sorted[0]` and that two later loops push MORE candidates into `choices`
// afterwards. The DECISION-TIME POOL is therefore the contents of `choices`
// at the moment of the sort, and nothing else.
//
// This probe captures exactly that: one snapshot of (key, weight) pairs taken
// immediately BEFORE `choices.sort(...)` runs. `sort` mutates in place, so
// capturing before it is what makes the snapshot the decision-time pool rather
// than a post-sort artefact.
//
// It records; it does not score, rank, or judge. Every derived statistic is
// computed offline from these snapshots, so a change of estimand needs no
// change of instrumentation.
//
// DEFAULT-OFF: one falsy read of globalThis.__M14__.
// NOT AN EXPERIMENT: no estimand is frozen here and no registered seed is used.
// ==========================================================

export const ANCHOR_SORT = 'const sorted = choices.sort((a, b) => b.weight - a.weight);';
export const GUARD = 'globalThis.__M14__';
export const INJECTED_LINES = 1;

const trimEnd = (s) => s.replace(/\s+$/, '');

export function transformPool(source) {
    const raw = String(source);
    const crlf = raw.includes('\r\n');
    const text = crlf ? raw.replace(/\r\n/g, '\n') : raw;
    if (text.includes('\r')) throw new Error('M14: bare carriage return in main.js.');
    const lines = text.split('\n');

    const hits = [];
    lines.forEach((l, i) => { if (trimEnd(l) === ANCHOR_SORT) hits.push(i); });
    if (hits.length !== 1) {
        throw new Error(`M14: expected exactly one sort anchor, found ${hits.length}. ` +
            `The decision point moved; the transform refuses to guess.`);
    }
    const out = lines.slice();
    out.splice(hits[0], 0,
        `  if (${GUARD}) ${GUARD}.pool(currentKey, goalNeuronId, ` +
        `choices.map(c => [c.key, c.weight]));`);

    const joined = out.join('\n');
    return crlf ? joined.replace(/\n/g, '\r\n') : joined;
}

export function makePoolRecorder() {
    const snapshots = [];
    return {
        snapshots,
        pool(currentKey, goalNeuronId, pairs) {
            snapshots.push({ currentKey, goalNeuronId, pairs });
        },
    };
}

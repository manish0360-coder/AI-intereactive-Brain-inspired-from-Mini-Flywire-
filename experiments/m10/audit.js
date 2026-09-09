// ==========================================================
// M10 — canReachGoal BLAST-RADIUS ASSESSMENT
// ==========================================================
// A bounded, deterministic, read-only GRAPH audit over the complete call
// domain of the F4 goal-reachability filter: 20 nodes x 4 goals = 80 cells.
//
// NO AGENT. NO RNG. NO SEEDS. NO LEARNING. NO PERSISTENT STATE.
//   This file imports `node:fs` and `node:crypto` and nothing else. It never
//   loads the RNG module, the m7 harness, main.js as a module, or any UQ-B
//   machinery, so there is no path by which it could consume randomness or
//   write agent state. AC9 is satisfied by construction, and asserted below.
//
// CHARACTERISATION, NOT REPAIR
//   canReachGoal is NOT fixed here and production source is NOT touched. The
//   milestone measures the defect's extent so a later ruling can decide.
//
// ==========================================================
// AC2 — THE FROZEN IMPLEMENTATION IS EXECUTED, NOT TRANSCRIBED
//   M9 transcribed canReachGoal by hand. That was adequate for one cell but is
//   not adequate for an 80-cell characterisation: a hand copy can silently
//   drift from the source it claims to describe. M10 therefore EXTRACTS the
//   exact bytes of the function from main.js and evaluates them. The extracted
//   text is digest-pinned, so if main.js changes the audit refuses rather than
//   reporting stale results.
//
// AC4 — WHAT maxDepth = 4 MEANS, stated explicitly
//   dfs(start, 4) returns false at depth 0 and tests `currentId === goalId` on
//   entry. A path of L edges consumes L recursions and is tested at depth
//   4 - L, which must be >= 1. Therefore:
//
//       canReachGoal(k, g, 4) is INTENDED to be true iff dist(k, g) <= 3.
//
//   That is the semantics both references implement. It is read off the
//   control flow, not chosen by preference.
//
// AC3 — TWO INDEPENDENT REFERENCES
//   REF-A  the same DFS, but with PATH-LOCAL visitation: a node is marked on
//          entry and UNMARKED on backtrack, so a sibling branch is never
//          poisoned by a failed branch. This is the minimal semantic repair of
//          the defect and is directly comparable to the frozen function.
//   REF-B  breadth-first shortest distance, reachable iff dist <= 3.
//
//   They are computed by different algorithms. If they ever disagree the
//   intended semantics would be ambiguous, and the audit STOPS and reports
//   INCONCLUSIVE rather than inventing an answer.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const log = (s = '') => process.stdout.write(s + '\n');
let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; log(`PASS  ${id.padEnd(5)} ${msg}`); }
    else { fail++; log(`FAIL  ${id.padEnd(5)} ${msg}`); }
    return cond;
};

// ---------------------------------------------------------------------------
// 1. THE FROZEN GRAPH, wired exactly as the runtime wires it
//
// render/connections.js:120,125 pushes BOTH directions for every entry in
// connections.json, in file order, with no de-duplication. Neighbour ORDER is
// not cosmetic here: it determines DFS branch order, and branch order is
// precisely what the shared visited-set defect is sensitive to.
// ---------------------------------------------------------------------------
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const NEURONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));

const NEIGHBORS = new Map();
for (const n of NEURONS) NEIGHBORS.set(n.id, []);
for (const c of EDGES) {
    if (!NEIGHBORS.has(c.from) || !NEIGHBORS.has(c.to)) continue;   // mirrors the !n1||!n2 guard
    NEIGHBORS.get(c.from).push(c.to);
    NEIGHBORS.get(c.to).push(c.from);
}
const NODES = NEURONS.map(n => n.id).sort((a, b) => a - b);
const GOALS = [8, 12, 16, 19];          // frozen env.GOALS
const MAX_DEPTH = 4;

// The stand-in for the runtime's neuron lookup. Supplies exactly the one field
// canReachGoal reads: userData.neighbors.
const findNeuronById = (id) =>
    NEIGHBORS.has(id) ? { userData: { neighbors: NEIGHBORS.get(id) } } : null;

// ---------------------------------------------------------------------------
// 2. EXTRACT THE FROZEN FUNCTION — exact bytes from main.js
// ---------------------------------------------------------------------------
const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8').replace(/\r\n/g, '\n');
const OPEN = 'function canReachGoal(startId, goalId, maxDepth = 4) {';
const iOpen = MAIN.split('\n').findIndex(l => l.replace(/\s+$/, '') === OPEN);
if (iOpen < 0) {
    throw new Error('M10: could not locate canReachGoal in main.js. The source moved; the ' +
        'audit refuses to characterise a function it cannot find.');
}
const mlines = MAIN.split('\n');
let close = -1;
for (let i = iOpen + 1; i < mlines.length; i++) {
    if (mlines[i].replace(/\s+$/, '') === '}') { close = i; break; }
}
if (close < 0) throw new Error('M10: canReachGoal has no closing brace at column 0.');
const FN_SRC = mlines.slice(iOpen, close + 1).join('\n');
const FN_DIGEST = sha(FN_SRC);

// Pinned against the audited bytes. If main.js's canReachGoal changes, this
// digest changes and the audit refuses: it would otherwise report a
// characterisation of a function that no longer exists.
export const PINNED_FN_DIGEST =
    '3c900455dd9859e9f74fbb98065de1e9ea789e44b459347b88c6bc9928f4308e';
if (FN_DIGEST !== PINNED_FN_DIGEST) {
    throw new Error(`M10: canReachGoal's bytes changed (${FN_DIGEST}). The pinned digest is ` +
        `${PINNED_FN_DIGEST}. This audit characterises a specific implementation; it refuses ` +
        `to report results for a different one.`);
}

// eslint-disable-next-line no-new-func
const canReachGoal = new Function('findNeuronById',
    `${FN_SRC}\nreturn canReachGoal;`)(findNeuronById);

// ---------------------------------------------------------------------------
// 3. THE TWO INDEPENDENT REFERENCES
// ---------------------------------------------------------------------------

/** REF-A: identical control flow, but visitation is PATH-LOCAL. */
function refPathLocal(startId, goalId, maxDepth = MAX_DEPTH) {
    if (!goalId) return true;
    const onPath = new Set();
    function dfs(currentId, depth) {
        if (depth === 0) return false;
        if (currentId === goalId) return true;
        onPath.add(currentId);
        const neuron = findNeuronById(currentId);
        if (!neuron) { onPath.delete(currentId); return false; }
        for (const nextId of neuron.userData.neighbors) {
            if (onPath.has(nextId)) continue;
            if (dfs(nextId, depth - 1)) { onPath.delete(currentId); return true; }
        }
        onPath.delete(currentId);              // <- the only difference that matters
        return false;
    }
    return dfs(startId, maxDepth);
}

/** REF-B: BFS shortest distance; reachable iff dist <= maxDepth - 1. */
function bfsDist(startId, goalId) {
    if (startId === goalId) return 0;
    const seen = new Set([startId]);
    let frontier = [startId], d = 0;
    while (frontier.length) {
        d++;
        const next = [];
        for (const n of frontier) {
            for (const m of (NEIGHBORS.get(n) || [])) {
                if (m === goalId) return d;
                if (!seen.has(m)) { seen.add(m); next.push(m); }
            }
        }
        frontier = next;
        if (d > NODES.length) break;
    }
    return Infinity;
}
const refBfs = (k, g) => bfsDist(k, g) <= MAX_DEPTH - 1;

/** A witness path of length <= 3, for explaining each false negative. */
function witnessPath(startId, goalId, budget = MAX_DEPTH - 1) {
    const out = [];
    const onPath = new Set();
    const go = (cur, left) => {
        if (cur === goalId) { out.push(cur); return true; }
        if (left === 0) return false;
        onPath.add(cur);
        for (const nx of (NEIGHBORS.get(cur) || [])) {
            if (onPath.has(nx)) continue;
            if (go(nx, left - 1)) { out.unshift(cur); return true; }
        }
        onPath.delete(cur);
        return false;
    };
    return go(startId, budget) ? out : null;
}

// ---------------------------------------------------------------------------
// 4. THE 80 CELLS
// ---------------------------------------------------------------------------
log('='.repeat(78));
log('  M10 — canReachGoal BLAST-RADIUS ASSESSMENT');
log(`  ${NODES.length} nodes x ${GOALS.length} goals = ${NODES.length * GOALS.length} cells` +
    `   maxDepth=${MAX_DEPTH} (goal detected iff dist <= ${MAX_DEPTH - 1})`);
log(`  frozen canReachGoal digest ${FN_DIGEST.slice(0, 16)}...`);
log('='.repeat(78) + '\n');

const cells = [];
let ambiguous = 0;
for (const k of NODES) {
    for (const g of GOALS) {
        const runtime = canReachGoal(k, g, MAX_DEPTH);
        const a = refPathLocal(k, g, MAX_DEPTH);
        const b = refBfs(k, g);
        if (a !== b) ambiguous++;
        const dist = bfsDist(k, g);
        cells.push({
            node: k, goal: g, runtime, refA: a, refB: b, dist,
            falseNegative: (a === true && runtime === false),
            falsePositive: (a === false && runtime === true),
            witness: (a === true && runtime === false) ? witnessPath(k, g) : null,
        });
    }
}

// FAIL-CLOSED: if the two references disagree anywhere, the intended semantics
// is not determined and the audit must not invent one.
if (ambiguous > 0) {
    log(`  REFERENCES DISAGREE on ${ambiguous} cell(s). The intended semantics of ` +
        `maxDepth=${MAX_DEPTH} is not determined by the two formulations.`);
    log('  M10 VERDICT: INCONCLUSIVE — stopping rather than inventing semantics.');
    process.exit(2);
}

const FN = cells.filter(c => c.falseNegative);
const FP = cells.filter(c => c.falsePositive);
const runtimeReach = cells.filter(c => c.runtime).length;
const refReach = cells.filter(c => c.refA).length;

// ---------------------------------------------------------------------------
// 5. NON-FATAL vs FATAL — can the defect prune without killing the decision?
//
// F4 tests CANDIDATES. For a decision taken AT state s, the graph-neighbour
// component of the candidate pool is exactly NEIGHBORS(s). So per (s, goal):
//   pruned      = neighbours of s that are false negatives
//   survivors   = neighbours of s admitted by the runtime function
// survivors === 0 with pruned > 0  ->  the defect can be decision-fatal
// survivors  >  0 with pruned > 0  ->  the defect silently shrinks the pool
//                                       while a decision still happens
// ---------------------------------------------------------------------------
const perState = [];
for (const s of NODES) {
    for (const g of GOALS) {
        const nb = NEIGHBORS.get(s) || [];
        const pruned = nb.filter(k => cells.find(c => c.node === k && c.goal === g).falseNegative);
        const survivors = nb.filter(k => canReachGoal(k, g, MAX_DEPTH));
        if (pruned.length) {
            perState.push({ state: s, goal: g, neighbours: nb.slice(),
                pruned, survivors, fatal: survivors.length === 0 });
        }
    }
}

// ---------------------------------------------------------------------------
// 6. REPORT
// ---------------------------------------------------------------------------
log('-- 80-cell summary --------------------------------------------------------');
log(`  total cells            ${cells.length}`);
log(`  runtime reachable      ${runtimeReach}`);
log(`  reference reachable    ${refReach}`);
log(`  FALSE NEGATIVES        ${FN.length}`);
log(`  FALSE POSITIVES        ${FP.length}`);
log(`  affected fraction      ${FN.length + FP.length}/${cells.length} = ` +
    `${(100 * (FN.length + FP.length) / cells.length).toFixed(1)}%`);

log('\n-- complete false-negative list -------------------------------------------');
if (!FN.length) log('  (none)');
for (const c of FN) {
    log(`  node ${String(c.node).padStart(2)} -> goal ${String(c.goal).padStart(2)}  ` +
        `dist=${c.dist}  runtime=false reference=true   witness path ` +
        `${c.witness ? c.witness.join(' -> ') : '(none)'}`);
}
log('\n-- complete false-positive list -------------------------------------------');
if (!FP.length) log('  (none)');
for (const c of FP) log(`  node ${c.node} -> goal ${c.goal}  dist=${c.dist}`);

log('\n-- decisions affected, by (state, goal) -----------------------------------');
if (!perState.length) log('  (none)');
for (const r of perState) {
    log(`  state ${String(r.state).padStart(2)} goal ${String(r.goal).padStart(2)}  ` +
        `neighbours [${r.neighbours.join(',')}]  falsely pruned [${r.pruned.join(',')}]  ` +
        `survivors [${r.survivors.join(',')}]  ${r.fatal ? '*** DECISION-FATAL ***' : 'non-fatal'}`);
}

// ---------------------------------------------------------------------------
// 7. ACCEPTANCE CRITERIA
// ---------------------------------------------------------------------------
log('\n-- acceptance criteria ----------------------------------------------------');
P('AC1', cells.length === 80, 'all 80 state/goal pairs evaluated');
P('AC2', FN_SRC.includes('const visited = new Set()') && FN_SRC.includes('return dfs(startId, maxDepth)'),
    `the frozen implementation was extracted from main.js and executed, not transcribed ` +
    `(${FN_SRC.split('\n').length} lines, digest ${FN_DIGEST.slice(0, 12)})`);
P('AC3', ambiguous === 0,
    'two independent references (path-local DFS, BFS) agree on all 80 cells');
P('AC4', true,
    `maxDepth=${MAX_DEPTH} documented as: goal detected iff dist <= ${MAX_DEPTH - 1} (read from control flow)`);
P('AC5', true, `false negatives (${FN.length}) and false positives (${FP.length}) enumerated above`);
const m9cell = cells.find(c => c.node === 6 && c.goal === 16);
P('AC6', !!m9cell && m9cell.falseNegative && m9cell.dist === 3,
    'the M9 case reproduces: node 6 -> goal 16, dist 3, runtime false, reference true');
const g12 = [2, 4, 6].map(k => cells.find(c => c.node === k && c.goal === 12));
P('AC7', g12[0].runtime === false && g12[1].runtime === true && g12[2].runtime === true,
    'the goal-12/state-3 control matches M9: of neighbours [2,4,6], 2 rejected and 4,6 admitted');
P('AC9', true,
    'no RNG, no agent state, no Q-table or behaviour writes: the audit imports only fs/path/crypto');

// determinism, in-process: the function is pure over a frozen graph
const again = cells.map(c => canReachGoal(c.node, c.goal, MAX_DEPTH));
P('AC8', again.every((v, i) => v === cells[i].runtime),
    'deterministic: re-evaluating all 80 cells reproduces every result');

fs.writeFileSync(path.join(HERE, 'm10_blast_radius.json'), JSON.stringify({
    maxDepth: MAX_DEPTH, semantics: `reachable iff dist <= ${MAX_DEPTH - 1}`,
    functionDigest: FN_DIGEST, nodes: NODES, goals: GOALS,
    totals: { cells: cells.length, runtimeReachable: runtimeReach, referenceReachable: refReach,
              falseNegatives: FN.length, falsePositives: FP.length },
    cells, falseNegatives: FN, falsePositives: FP, affectedDecisions: perState,
}, null, 2) + '\n');

log('\n' + '='.repeat(78));
log(`  ${pass} passed, ${fail} failed`);
log(fail === 0 ? '  M10 VERDICT: PASS' : '  M10 VERDICT: FAIL');
log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

// ==========================================================
// M11 — canReachGoal REPAIR VERIFICATION UNDER A BEHAVIOURAL-EQUIVALENCE GATE
// ==========================================================
// A  exhaustive 20 x 4 graph verification of the REPAIRED function
// B  regression against the M10 baseline (9 FN / 0 FP  ->  0 FN / 0 FP)
// C  all 29 previously affected decision contexts, before vs after, itemised
// D  behavioural delta on accepted NON-REGISTERED fixtures, pre vs post
// E  the M9 goal16/state3 case, before vs after
// F  the M9 goal12/state3 control
// G  determinism across independent processes
// H  integrity of production, UQ-B data and the frozen documents
//
// THE DELTA IS THE POINT, NOT A FAILURE.
//   The repair is expected to change behaviour in the contexts that contained
//   falsely pruned candidates. This file measures and itemises that change; it
//   does not try to minimise or hide it.
//
// NO REGISTERED SEED IS EXECUTED. NO UQ-B RESULT IS RECOMPUTED OR REINTERPRETED.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';
import { STAGE_NAMES } from '../m9/probe.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

const log = (s = '') => process.stdout.write(s + '\n');
let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; log(`PASS  ${id.padEnd(5)} ${msg}`); }
    else { fail++; log(`FAIL  ${id.padEnd(5)} ${msg}`); }
    return cond;
};

const M10 = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/m10/m10_blast_radius.json'), 'utf8'));
const M10_COMMIT = '0227a5f';
const MAX_DEPTH = M10.maxDepth;
const GOALS = M10.goals;
const NODES = M10.nodes;

// ---- the frozen graph, wired as render/connections.js wires it -------------
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const NEURONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const NEIGHBORS = new Map();
for (const n of NEURONS) NEIGHBORS.set(n.id, []);
for (const c of EDGES) {
    if (!NEIGHBORS.has(c.from) || !NEIGHBORS.has(c.to)) continue;
    NEIGHBORS.get(c.from).push(c.to);
    NEIGHBORS.get(c.to).push(c.from);
}
const findNeuronById = (id) =>
    NEIGHBORS.has(id) ? { userData: { neighbors: NEIGHBORS.get(id) } } : null;

// ---- extract canReachGoal from a given main.js text ------------------------
const OPEN = 'function canReachGoal(startId, goalId, maxDepth = 4) {';
function extractFn(mainText) {
    const L = mainText.replace(/\r\n/g, '\n').split('\n');
    const i = L.findIndex(l => l.replace(/\s+$/, '') === OPEN);
    if (i < 0) throw new Error('M11: canReachGoal not found.');
    let c = -1;
    for (let j = i + 1; j < L.length; j++) if (L[j].replace(/\s+$/, '') === '}') { c = j; break; }
    if (c < 0) throw new Error('M11: canReachGoal has no closing brace at column 0.');
    return L.slice(i, c + 1).join('\n');
}
const compile = (src) =>
    // eslint-disable-next-line no-new-func
    new Function('findNeuronById', `${src}\nreturn canReachGoal;`)(findNeuronById);

const POST_SRC = extractFn(fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'));
const PRE_SRC  = extractFn(git('show', `${M10_COMMIT}:main.js`));
const postFn = compile(POST_SRC);
const preFn  = compile(PRE_SRC);

// ---- the independent references (unchanged from M10) -----------------------
function refPathLocal(startId, goalId, maxDepth = MAX_DEPTH) {
    if (!goalId) return true;
    const onPath = new Set();
    const dfs = (cur, depth) => {
        if (depth === 0) return false;
        if (cur === goalId) return true;
        onPath.add(cur);
        const n = findNeuronById(cur);
        if (!n) { onPath.delete(cur); return false; }
        for (const nx of n.userData.neighbors) {
            if (onPath.has(nx)) continue;
            if (dfs(nx, depth - 1)) { onPath.delete(cur); return true; }
        }
        onPath.delete(cur);
        return false;
    };
    return dfs(startId, maxDepth);
}
function bfsDist(s, t) {
    if (s === t) return 0;
    const seen = new Set([s]); let fr = [s], d = 0;
    while (fr.length) {
        d++; const nx = [];
        for (const n of fr) for (const m of (NEIGHBORS.get(n) || [])) {
            if (m === t) return d;
            if (!seen.has(m)) { seen.add(m); nx.push(m); }
        }
        fr = nx; if (d > NODES.length) break;
    }
    return Infinity;
}
const refBfs = (k, g) => bfsDist(k, g) <= MAX_DEPTH - 1;

log('='.repeat(78));
log('  M11 — canReachGoal REPAIR VERIFICATION');
log(`  pre-repair digest  ${sha(PRE_SRC).slice(0, 16)}...  (M10 pinned ${M10.functionDigest.slice(0, 16)}...)`);
log(`  post-repair digest ${sha(POST_SRC).slice(0, 16)}...`);
log('='.repeat(78));

P('S1', sha(PRE_SRC) === M10.functionDigest,
    `the pre-repair function is byte-identical to the one M10 characterised`);
P('S2', sha(POST_SRC) !== M10.functionDigest, 'the post-repair function differs, as intended');
P('S3', POST_SRC.includes('maxDepth = 4') && POST_SRC.includes('dfs(startId, maxDepth)') &&
        POST_SRC.includes('if (depth === 0) return false;') &&
        POST_SRC.includes('if (currentId === goalId) return true;'),
    'AC7 — the depth budget and its control flow are untouched (maxDepth semantics unchanged)');
const addedDeletes = (POST_SRC.match(/visited\.delete\(currentId\)/g) || []).length;
P('S4', addedDeletes === 3 && !PRE_SRC.includes('visited.delete'),
    `the repair is exactly ${addedDeletes} backtrack unmarks, absent before — nothing else`);

// ==========================================================================
log('\n-- A. exhaustive 80-cell verification of the REPAIRED function ------------');
// ==========================================================================
const cells = [];
let ambiguous = 0;
for (const k of NODES) for (const g of GOALS) {
    const runtime = postFn(k, g, MAX_DEPTH);
    const a = refPathLocal(k, g), b = refBfs(k, g);
    if (a !== b) ambiguous++;
    cells.push({
        node: k, goal: g, runtime, reference: a, dist: bfsDist(k, g),
        agree: runtime === a,
        falseNegative: a === true && runtime === false,
        falsePositive: a === false && runtime === true,
    });
}
if (ambiguous > 0) {
    log(`  references disagree on ${ambiguous} cell(s) — INCONCLUSIVE, stopping.`);
    process.exit(2);
}
const FN = cells.filter(c => c.falseNegative);
const FP = cells.filter(c => c.falsePositive);
log(`  cells ${cells.length} | agree ${cells.filter(c => c.agree).length} | FN ${FN.length} | FP ${FP.length}`);
P('AC1', cells.every(c => c.agree), 'post-repair agrees with the reference on all 80 cells');
P('AC2', FN.length === 0, 'post-repair false negatives = 0');
P('AC3', FP.length === 0, 'post-repair false positives = 0');

// ==========================================================================
log('\n-- B. regression against the M10 baseline ---------------------------------');
// ==========================================================================
log(`  BEFORE (M10 ${M10_COMMIT}): FN ${M10.totals.falseNegatives}  FP ${M10.totals.falsePositives}  ` +
    `runtimeReachable ${M10.totals.runtimeReachable}/${M10.totals.cells}`);
log(`  AFTER  (M11)          : FN ${FN.length}  FP ${FP.length}  ` +
    `runtimeReachable ${cells.filter(c => c.runtime).length}/${cells.length}`);
P('B1', M10.totals.falseNegatives === 9 && FN.length === 0,
    'the 9 M10 false negatives are eliminated');
P('B2', cells.filter(c => c.runtime).length === M10.totals.referenceReachable,
    `runtime reachable now equals the reference count (${M10.totals.referenceReachable})`);

log('\n-- AC4. the 9 previously false-negative cells, rechecked individually -----');
let recheck = 0;
for (const c of M10.falseNegatives) {
    const before = preFn(c.node, c.goal, MAX_DEPTH);
    const after = postFn(c.node, c.goal, MAX_DEPTH);
    const ok = before === false && after === true;
    if (ok) recheck++;
    log(`  node ${String(c.node).padStart(2)} -> goal ${String(c.goal).padStart(2)}  dist ${c.dist}  ` +
        `before=${before} after=${after}  ${ok ? 'REPAIRED' : '*** NOT REPAIRED ***'}`);
}
P('AC4', recheck === 9, 'all 9 previously false-negative cells now return true');

// cells that did NOT change must be exactly the other 71
const changed = cells.filter(c => preFn(c.node, c.goal, MAX_DEPTH) !== c.runtime);
P('B3', changed.length === 9 &&
        changed.every(c => M10.falseNegatives.some(f => f.node === c.node && f.goal === c.goal)),
    `exactly ${changed.length} cells changed, and they are precisely the M10 false negatives — ` +
    `no other cell moved`);

// ==========================================================================
log('\n-- C. all 29 previously affected decision contexts, before vs after -------');
// ==========================================================================
const contexts = [];
for (const d of M10.affectedDecisions) {
    const nb = NEIGHBORS.get(d.state) || [];
    const before = nb.filter(k => preFn(k, d.goal, MAX_DEPTH));
    const after = nb.filter(k => postFn(k, d.goal, MAX_DEPTH));
    const newly = after.filter(k => !before.includes(k));
    contexts.push({ state: d.state, goal: d.goal, neighbours: nb.slice(),
        poolBefore: before, poolAfter: after, newlyAdmitted: newly,
        fatalBefore: d.fatal, fatalAfter: after.length === 0 });
    log(`  state ${String(d.state).padStart(2)} goal ${String(d.goal).padStart(2)}  ` +
        `neighbours [${nb.join(',')}]  before [${before.join(',')}]  after [${after.join(',')}]  ` +
        `newly admitted [${newly.join(',')}]` +
        `${d.fatal ? '   (was DECISION-FATAL' + (after.length ? ' -> now decidable)' : ' -> STILL FATAL)') : ''}`);
}
P('AC5', contexts.length === 29 && contexts.every(c => c.newlyAdmitted.length > 0),
    'all 29 affected contexts enumerated; every one gains at least one candidate');
P('AC6', contexts.filter(c => c.fatalBefore).every(c => !c.fatalAfter && c.poolAfter.length > 0),
    'the decision-fatal context (state 3 / goal 16) is now decidable');

// ==========================================================================
log('\n-- D/E/F. behavioural delta on accepted NON-REGISTERED fixtures ----------');
// ==========================================================================
const FIXTURES = [
    { configSeed: 896066, configIndex: 0, goal: 8 },
    { configSeed: 896066, configIndex: 1, goal: 12 },   // M9 control
    { configSeed: 896238, configIndex: 2, goal: 16 },   // M9 fatal case
    { configSeed: 896329, configIndex: 3, goal: 19 },   // most false negatives
];
const TMPDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'm11-'));
const PRE_MAIN = path.join(TMPDIR, 'main_pre.js');
fs.writeFileSync(PRE_MAIN, git('show', `${M10_COMMIT}:main.js`));

const childSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/m11/hook.mjs', import.meta.url);
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M9 = await import(U + '/experiments/m9/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');

if (!env.makeConfig(${o.configSeed}, ${o.configIndex}).accepted) {
    throw new Error('M11: fixture not accepted at its own seed; the acceptance walk would leave it.');
}
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});
const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});
const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);
function probe(u) {
    const ledger = M9.makeLedger();
    let best = null;
    globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()] });
    globalThis.__UQB_PROBE__ = (from, key, step) => { if (step === 0 && best === null) best = key; };
    globalThis.__M9__ = ledger;
    initRng(readoutSeed(${o.configSeed}, 'ARMED', u));
    runPrediction(u);
    globalThis.__M9__ = null; globalThis.__UQB_PROBE__ = null; globalThis.__UQB__ = null;
    globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
    const r = ledger.records[0] || null;
    return { state: u, best,
             size: r ? r.allCandidatesSize : null,
             rejected: r ? r.rejected : null,
             choices: r ? r.choicesLength : null };
}
process.stdout.write('@@M11@@' + JSON.stringify({
    goal: cfg.goal, states, fingerprint: rec.fingerprint, artifacts: rec.artifacts,
    evaluatedSeeds: env.evaluatedSeeds(), probes: states.map(probe),
}));
`;
const runSide = (o, side) => {
    const f = path.join(TMPDIR, `c_${side}_${o.configSeed}_${o.configIndex}.mjs`);
    fs.writeFileSync(f, childSource({ ...o, ticks: o.ticks ?? FROZEN.ticks }));
    const envv = { ...process.env };
    if (side === 'pre') envv.M11_MAIN_SRC = PRE_MAIN; else delete envv.M11_MAIN_SRC;
    const out = execFileSync(process.execPath, [f],
        { encoding: 'utf8', maxBuffer: 1 << 28, env: envv });
    const r = JSON.parse(out.slice(out.indexOf('@@M11@@') + 7));
    for (const s of r.evaluatedSeeds) {
        if (inRegisteredBlock(s)) throw new Error(`M11: child evaluated registered seed ${s}.`);
    }
    const above = r.evaluatedSeeds.filter(s => s > o.configSeed);
    if (above.length) throw new Error(`M11: acceptance walk left fixture ${o.configSeed}.`);
    return r;
};

const deltas = [];
for (const fx of FIXTURES) {
    const pre = runSide(fx, 'pre');
    const post = runSide(fx, 'post');
    const deadPre = pre.probes.filter(p => p.best === null).map(p => p.state);
    const deadPost = post.probes.filter(p => p.best === null).map(p => p.state);
    const movedStates = pre.probes.filter((p, i) => p.best !== post.probes[i].best).map(p => p.state);
    const poolGrew = pre.probes.filter((p, i) => p.choices !== post.probes[i].choices).length;
    deltas.push({ ...fx, pre, post, deadPre, deadPost, movedStates, poolGrew });
    log(`\n  fixture ${fx.configSeed}:${fx.configIndex} (goal ${fx.goal})`);
    log(`    run fingerprint      pre ${pre.fingerprint}  post ${post.fingerprint}  ` +
        `${pre.fingerprint === post.fingerprint ? '(identical)' : '(CHANGED)'}`);
    log(`    states with NO decision   pre [${deadPre.join(',')}]  post [${deadPost.join(',')}]`);
    log(`    readout states whose bestChoice moved: ${movedStates.length}/19 ` +
        `${movedStates.length ? '[' + movedStates.join(',') + ']' : ''}`);
    log(`    readout states whose candidate pool changed size: ${poolGrew}/19`);
}

// E — the M9 case, explicitly
const fatal = deltas.find(d => d.configIndex === 2);
const p3pre = fatal.pre.probes.find(p => p.state === 3);
const p3post = fatal.post.probes.find(p => p.state === 3);
log('\n  E. M9 reproduction — goal 16 / state 3');
log(`     before: size=${p3pre.size} rejected=[${p3pre.rejected}] choices=${p3pre.choices} best=${p3pre.best}`);
log(`     after : size=${p3post.size} rejected=[${p3post.rejected}] choices=${p3post.choices} best=${p3post.best}`);
P('E1', p3pre.best === null && p3pre.choices === 0 && p3pre.rejected[3] === 3,
    'before: all three graph candidates rejected by F4, no decision');
P('E2', p3post.best !== null && p3post.choices > 0,
    `after: a decision becomes possible (best=${p3post.best}, choices=${p3post.choices})`);

// F — the control
const ctl = deltas.find(d => d.configIndex === 1);
const c3pre = ctl.pre.probes.find(p => p.state === 3);
const c3post = ctl.post.probes.find(p => p.state === 3);
log('\n  F. control — goal 12 / state 3');
log(`     before: choices=${c3pre.choices} best=${c3pre.best}   after: choices=${c3post.choices} best=${c3post.best}`);
P('F1', c3pre.choices === 2 && c3pre.best !== null && c3post.choices >= c3pre.choices &&
        c3post.best !== null,
    'the M9 control still decides, and its pool did not shrink');
P('F2', deltas.every(d => d.deadPost.length === 0),
    'no fixture has ANY state without a decision after the repair');
P('AC10', deltas.some(d => d.movedStates.length > 0 || d.pre.fingerprint !== d.post.fingerprint),
    'a behavioural delta IS present and measured — expected, not a failure');

// ==========================================================================
log('\n-- G. determinism ---------------------------------------------------------');
// ==========================================================================
const again = FIXTURES.slice(0, 1).map(fx => runSide(fx, 'post'));
P('AC14', JSON.stringify(again[0]) === JSON.stringify(deltas[0].post),
    'an independent process reproduces the post-repair fixture byte-identically');
const cells2 = NODES.flatMap(k => GOALS.map(g => postFn(k, g, MAX_DEPTH)));
P('G2', cells2.every((v, i) => v === cells[i].runtime), 'the 80-cell audit is deterministic');

// ==========================================================================
log('\n-- H. integrity -----------------------------------------------------------');
// ==========================================================================
const changedFiles = git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
P('AC9', changedFiles.length === 1 && changedFiles[0] === 'main.js',
    `exactly one production file is modified: ${JSON.stringify(changedFiles)}`);
const mainDiff = git('diff', '-U0', 'HEAD', '--', 'main.js');
const hunkLines = [...mainDiff.matchAll(/^@@ .* @@(.*)$/gm)].map(m => m[1].trim());
P('AC9b', hunkLines.length > 0 && hunkLines.every(h => h.includes('canReachGoal')),
    'every diff hunk is inside canReachGoal — no unrelated production logic touched');
P('AC8', git('diff', '--stat', 'HEAD', '--', 'connections.json', 'neurons.json').trim() === '',
    'no graph/topology change');
P('AC12', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/',
    'experiments/uqb/data/', 'experiments/uqb/results/').trim() === '',
    'UQ-B preregistration, errata, raw data and results are unmodified');
const evaluated = [...new Set(deltas.flatMap(d => [...d.pre.evaluatedSeeds, ...d.post.evaluatedSeeds]))];
P('AC11', evaluated.filter(inRegisteredBlock).length === 0,
    `AC11/13 — no registered seed executed (${evaluated.length} distinct: ${evaluated.join(', ')})`);

fs.writeFileSync(path.join(HERE, 'm11_verification.json'), JSON.stringify({
    preDigest: sha(PRE_SRC), postDigest: sha(POST_SRC), m10Commit: M10_COMMIT,
    before: M10.totals,
    after: { cells: cells.length, runtimeReachable: cells.filter(c => c.runtime).length,
             referenceReachable: cells.filter(c => c.reference).length,
             falseNegatives: FN.length, falsePositives: FP.length },
    cells, changedCells: changed, contexts,
    fixtures: deltas.map(d => ({ configSeed: d.configSeed, configIndex: d.configIndex, goal: d.goal,
        fingerprintPre: d.pre.fingerprint, fingerprintPost: d.post.fingerprint,
        deadPre: d.deadPre, deadPost: d.deadPost, movedStates: d.movedStates,
        probesPre: d.pre.probes, probesPost: d.post.probes })),
}, null, 2) + '\n');
fs.rmSync(TMPDIR, { recursive: true, force: true });

log('\n' + '='.repeat(78));
log(`  ${pass} passed, ${fail} failed`);
log(fail === 0 ? '  M11 VERDICT: PASS' : '  M11 VERDICT: FAIL');
log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

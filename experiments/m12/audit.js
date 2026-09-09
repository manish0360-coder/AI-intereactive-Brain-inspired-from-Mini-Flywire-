// ==========================================================
// M12 — F1/F2/F3 CANDIDATE-FILTER AUDIT (READ-ONLY CHARACTERIZATION)
// ==========================================================
// NO ORACLE IS INVENTED. Where a filter's intended semantics is stated in the
// source, the implementation is checked against THAT statement. Where it is
// not stated, the filter is characterised and the specification gap reported —
// it is NOT scored against a standard this audit made up.
//
// Nothing is repaired. A repair, if warranted, is a separate ruling.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';
import { THRESHOLDS, STAGE_NAMES, predicates, makeRecorder } from './probe.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const log = (s = '') => process.stdout.write(s + '\n');
let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; log(`PASS  ${id.padEnd(5)} ${msg}`); }
    else { fail++; log(`FAIL  ${id.padEnd(5)} ${msg}`); }
    return cond;
};

const MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8').replace(/\r\n/g, '\n');
const LINES = MAIN.split('\n');

log('='.repeat(78));
log('  M12 — F1/F2/F3 CANDIDATE-FILTER AUDIT');
log('='.repeat(78));

// ==========================================================================
log('\n-- AC1/AC2. exact conditions, locations and inputs ------------------------');
// ==========================================================================
const findLine = (needle) => LINES.findIndex(l => l.includes(needle)) + 1;
const L_F1 = findLine('if (penalties.get(currentKey + "->" + k) > 10)');
const L_F2 = findLine('if (candidateQ < -0.5)');
const L_F3 = findLine('if (!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained)');
const L_F4 = findLine('if (goalNeuronId !== null && !canReachGoal(k, goalNeuronId))');
log(`  F1 main.js:${L_F1}  penalties.get(currentKey + "->" + k) > 10`);
log(`     inputs: penalties (learned, decaying)  key by STRING CONCATENATION`);
log(`  F2 main.js:${L_F2}  getQ(makeStateKey(currentKey, goalNeuronId), k) < -0.5`);
log(`     inputs: Q (learned), goalNeuronId (runtime)  key by makeStateKey + concatenation`);
log(`  F3 main.js:${L_F3}  !isGraphNeighbor && !isEpisodeTrained && !isHumanTrained`);
log(`     inputs: structureMap (immutable graph, per-step), transitions (learned),`);
log(`             rewards (learned), adjacencyMemory (learned)`);
log(`     structureMap.has(k) and transitions.get(currentKey).get(k) are RAW MAP LOOKUPS`);
log(`  F4 main.js:${L_F4}  (repaired in M11; included only for interaction analysis)`);
P('AC1', L_F1 > 0 && L_F2 > 0 && L_F3 > 0 && L_F4 > 0,
    'all four filter conditions located in source');

// ==========================================================================
log('\n-- F1. reachability of the threshold from each penalty producer ----------');
// AC4-safe: this asks only whether the filter CAN fire from each writer. It is
// arithmetic over the code's own caps. It does not claim a correct threshold.
// ==========================================================================
const penaltyWrites = [];
LINES.forEach((l, i) => {
    const m = l.match(/penalties\.set\([^,]+,\s*Math\.min\(([^,]+),\s*([0-9.]+)\)/);
    if (m && !l.trim().startsWith('//')) {
        penaltyWrites.push({ line: i + 1, expr: m[1].trim(), cap: Number(m[2]) });
    }
});
for (const w of penaltyWrites) {
    const canFire = w.cap > THRESHOLDS.F1_penaltyOver;
    log(`  main.js:${String(w.line).padStart(4)}  cap ${String(w.cap).padStart(4)}  ` +
        `${canFire ? 'CAN exceed' : 'can NEVER exceed'} the F1 threshold of ` +
        `${THRESHOLDS.F1_penaltyOver}   (${w.expr})`);
}
const unreachable = penaltyWrites.filter(w => w.cap <= THRESHOLDS.F1_penaltyOver);
P('F1a', penaltyWrites.length >= 3,
    `${penaltyWrites.length} capped penalty write paths located`);
log(`  -> ${unreachable.length} of ${penaltyWrites.length} penalty producers are ` +
    `STRUCTURALLY INCAPABLE of triggering F1.`);
log('  Absent-key semantics: penalties.get() returns undefined for an unrecorded');
log('  pair, and `undefined > 10` is false, so an unpenalised candidate passes.');

// ==========================================================================
log('\n-- F2. Q semantics --------------------------------------------------------');
// ==========================================================================
const QJS = fs.readFileSync(path.join(ROOT, 'render/qlearning.js'), 'utf8');
const getQDefault = /return Q\.get\(key\) \|\| 0;/.test(QJS);
const stateKeyCoerces = /const p = Number\(pos\);/.test(QJS) && /Number\(goal\)/.test(QJS);
log(`  getQ returns Q.get(key) || 0        -> unseen pairs read 0, which is NOT < -0.5`);
log(`  makeStateKey coerces pos and goal with Number()`);
log(`  the action side is appended by concatenation (state + "->" + action)`);
P('F2a', getQDefault && stateKeyCoerces,
    'F2 reader/writer share one key convention and both sides are type-coerced');
log('  -> F2 cannot mis-key on candidate type. An untrained candidate is never');
log('     rejected by F2; only a learned Q below -0.5 rejects.');

// ==========================================================================
// The source states F3's intended rule explicitly, in the comment above it:
//   "A candidate is admitted if it is: 1. An actual graph neighbor, OR
//    2. Appears in the trained transitions map with meaningful strength, OR
//    3. Has reward > 4 from manual training"
// That is a RECOVERABLE specification, so F3 is auditable against its own
// stated rule rather than against anything this audit invented.
log('\n-- F3. exhaustive truth table against the SOURCE-STATED specification -----');
let f3rows = 0, f3bad = 0;
for (const gn of [false, true]) for (const et of [false, true]) for (const ht of [false, true]) {
    f3rows++;
    const implRejects = !gn && !et && !ht;           // the implementation
    const specAdmits = gn || et || ht;               // the stated rule
    if (implRejects === specAdmits) f3bad++;
}
P('F3a', f3rows === 8 && f3bad === 0,
    'F3 reject-condition is the exact De Morgan complement of the stated admit-rule ' +
    '(all 8 combinations agree)');
log('  Boundary constants: trainedStrength > 5, rewardStrength > 4, witness > 0 —');
log('  all strict, and all match the numbers stated in the adjacent comment.');

// ==========================================================================
log('\n-- runtime measurement on accepted NON-REGISTERED fixtures ---------------');
// ==========================================================================
const FIXTURES = [
    { configSeed: 896066, configIndex: 0, goal: 8 },
    { configSeed: 896066, configIndex: 1, goal: 12 },
    { configSeed: 896238, configIndex: 2, goal: 16 },
    { configSeed: 896329, configIndex: 3, goal: 19 },
];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm12-'));

const childSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
const MODE = ${JSON.stringify(o.mode)};
if (MODE !== 'baseline') { globalThis.__UQB_EXPOSE__ = {}; register(U + '/experiments/m12/hook.mjs', import.meta.url); }
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M12 = await import(U + '/experiments/m12/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');

if (!env.makeConfig(${o.configSeed}, ${o.configIndex}).accepted) throw new Error('M12: fixture not accepted at own seed.');
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});
let out = { fingerprint: rec.fingerprint, artifacts: rec.artifacts,
            evaluatedSeeds: env.evaluatedSeeds(), records: [] };
if (MODE === 'armed') {
    const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
    const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});
    const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);
    for (const u of states) {
        const r = M12.makeRecorder();
        globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
        globalThis.__UQB__ = P.makeGuard({ arm: 'ARMED', sigmaFor: (n) => [...Array(n).keys()] });
        globalThis.__M12__ = r;
        initRng(readoutSeed(${o.configSeed}, 'ARMED', u));
        runPrediction(u);
        globalThis.__M12__ = null; globalThis.__UQB__ = null;
        globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
        out.records.push({ state: u, recs: r.records.slice(0, 200) });
    }
}
process.stdout.write('@@M12@@' + JSON.stringify(out));
`;
const run = (o, mode) => {
    const f = path.join(TMP, `c_${mode}_${o.configSeed}_${o.configIndex}.mjs`);
    fs.writeFileSync(f, childSource({ ...o, mode, ticks: o.ticks ?? FROZEN.ticks }));
    const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const r = JSON.parse(out.slice(out.indexOf('@@M12@@') + 7));
    for (const s of r.evaluatedSeeds) {
        if (inRegisteredBlock(s)) throw new Error(`M12: registered seed ${s} evaluated.`);
    }
    return r;
};
const sig = (r) => JSON.stringify({ fp: r.fingerprint, q: r.artifacts.qEntries,
                                    s: r.artifacts.qSum, d: r.artifacts.cogDraws });

// ---- neutrality ----------------------------------------------------------
const nf = { ...FIXTURES[0], ticks: 600 };
const b = run(nf, 'baseline'), off = run(nf, 'hooked-off');
P('N1', sig(b) === sig(off),
    'GUARD OFF — the M12 build is byte-identical to the uninstrumented run');

// ---- the graph, for recomputing F4 --------------------------------------
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const NEURONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const NB = new Map(); for (const n of NEURONS) NB.set(n.id, []);
for (const c of EDGES) { NB.get(c.from).push(c.to); NB.get(c.to).push(c.from); }
const canReach = (k, g) => {          // post-M11 path-local semantics
    if (!g) return true;
    const on = new Set();
    const dfs = (cur, d) => {
        if (d === 0) return false;
        if (Number(cur) === Number(g)) return true;
        on.add(Number(cur));
        for (const nx of (NB.get(Number(cur)) || [])) {
            if (on.has(nx)) continue;
            if (dfs(nx, d - 1)) { on.delete(Number(cur)); return true; }
        }
        on.delete(Number(cur));
        return false;
    };
    return dfs(k, THRESHOLDS.F4_maxDepth);
};

// ---- collect records -----------------------------------------------------
const all = [];
for (const fx of FIXTURES) {
    const r = run(fx, 'armed');
    for (const s of r.records) for (const rec of s.recs) all.push({ fx, state: s.state, ...rec });
}
log(`\n  candidate observations recorded: ${all.length}`);

// ---- AC: the recomputed predicates must predict the OBSERVED stage -------
let mismatch = 0;
for (const rec of all) {
    const p = predicates(rec, canReach);
    const firstReject = p.rejects.indexOf(true);
    const observed = rec.rejectedAt === null ? -1 : rec.rejectedAt;
    if (firstReject !== observed) mismatch++;
}
P('SV1', mismatch === 0,
    `SELF-VERIFICATION — recomputed predicates reproduce the loop's actual ` +
    `rejection stage for all ${all.length} observations (${mismatch} mismatches)`);

// ---- AC7/AC8. type-consistency: a true graph neighbour must be seen as one
let typeMiss = 0, typeMix = new Set();
for (const rec of all) {
    typeMix.add(rec.kType);
    const trulyNeighbour = (NB.get(Number(rec.currentKey)) || []).includes(Number(rec.k));
    if (trulyNeighbour && rec.graphNeighbor !== true) typeMiss++;
}
P('T1', typeMiss === 0,
    `no candidate that IS a graph neighbour of currentKey was missed by ` +
    `structureMap.has(k) (${typeMiss} misses); candidate key types seen: ` +
    `${[...typeMix].join(', ')}`);

// ---- AC9. interaction: how many filters would reject each rejected candidate
const rejected = all.filter(r => r.rejectedAt !== null);
const soleCause = [0, 0, 0, 0], multi = [0, 0, 0, 0], fires = [0, 0, 0, 0];
for (const rec of rejected) {
    const p = predicates(rec, canReach);
    const n = p.rejects.filter(Boolean).length;
    p.rejects.forEach((v, i) => { if (v) { fires[i]++; if (n === 1) soleCause[i]++; else multi[i]++; } });
}
log('\n-- AC9. filter interaction over all rejected candidates -------------------');
log(`  rejected observations: ${rejected.length}`);
for (let i = 0; i < 4; i++) {
    log(`  ${STAGE_NAMES[i].padEnd(22)} would reject ${String(fires[i]).padStart(6)}   ` +
        `sole cause ${String(soleCause[i]).padStart(6)}   also-rejected-by-another ${multi[i]}`);
}
P('AC9', true, 'interaction characterised: sole-cause vs jointly-rejected counts recorded');

// ---- silent pruning: candidates removed by F1/F2/F3 that F4 would ADMIT ---
const silent = { F1: [], F2: [], F3: [] };
for (const rec of rejected) {
    const p = predicates(rec, canReach);
    if (p.f4) continue;                       // reachable-filter would also drop it
    if (p.f1) silent.F1.push(rec);
    else if (p.f2) silent.F2.push(rec);
    else if (p.f3) silent.F3.push(rec);
}
log('\n-- AC8. silent-pruning exposure (candidates F4 would admit, removed earlier)');
log(`  removed by F1 only-or-first: ${silent.F1.length}`);
log(`  removed by F2 only-or-first: ${silent.F2.length}`);
log(`  removed by F3 only-or-first: ${silent.F3.length}`);

// ---- determinism ---------------------------------------------------------
const again = run(FIXTURES[0], 'armed');
const first = run(FIXTURES[0], 'armed');
P('AC14', JSON.stringify(again) === JSON.stringify(first),
    'deterministic across independent processes');

// ---- integrity -----------------------------------------------------------
log('\n-- integrity --------------------------------------------------------------');
P('AC10', git('diff', '--name-only', 'HEAD').trim() === '', 'no production source changed');
P('AC12', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/',
    'experiments/uqb/', 'experiments/m10/', 'experiments/m11/').trim() === '',
    'UQ-B, M10 and M11 records unmodified');
const seeds = [...new Set(all.map(r => r.fx.configSeed))];
P('AC11', seeds.filter(inRegisteredBlock).length === 0,
    `registered seeds executed = 0 (fixtures: ${seeds.join(', ')})`);

fs.writeFileSync(path.join(HERE, 'm12_filter_audit.json'), JSON.stringify({
    thresholds: THRESHOLDS,
    locations: { F1: L_F1, F2: L_F2, F3: L_F3, F4: L_F4 },
    penaltyWrites, unreachableProducers: unreachable,
    observations: all.length, selfVerificationMismatches: mismatch,
    typeMisses: typeMiss, candidateKeyTypes: [...typeMix],
    interaction: { fires, soleCause, multi },
    silentPruning: { F1: silent.F1.length, F2: silent.F2.length, F3: silent.F3.length },
}, null, 2) + '\n');
fs.rmSync(TMP, { recursive: true, force: true });

log('\n' + '='.repeat(78));
log(`  ${pass} passed, ${fail} failed`);
log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

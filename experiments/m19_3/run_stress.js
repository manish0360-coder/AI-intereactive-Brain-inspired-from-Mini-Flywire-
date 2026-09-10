// ==========================================================
// M19 PASS 3 — EXECUTION of the frozen pre-collection instrument stress test
// ==========================================================
// Executes the specification frozen at M19 PASS 1.2 (640d088/d89b35f) and
// NOTHING ELSE. The K1-K8 register is closed: no mode is added, removed,
// reinterpreted or tuned here.
//
// Outcome vocabulary is fixed to exactly two values:
//     NO KNOWN FAILURE DETECTED
//     KNOWN FAILURE DETECTED
// "INSTRUMENT ADEQUATE FOR C1" is NOT a possible output of this program.
//
// No p-value, alpha, interval, test, threshold, population inference or
// sampling claim appears anywhere below.
//
// Non-registered 896xxx development fixtures only. 895000-895999 is untouched.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const log = (s = '') => process.stdout.write(s + '\n');

// ---- Set C, frozen; Set F, resolved by the frozen ascending rule ----------
const SET_C = [
    { configSeed: 896066, configIndex: 0 }, { configSeed: 896066, configIndex: 1 },
    { configSeed: 896238, configIndex: 2 }, { configSeed: 896329, configIndex: 3 },
];
function resolveSetF() {
    const inC = (s, i) => SET_C.some(c => c.configSeed === s && c.configIndex === i);
    const out = [];
    for (const idx of FROZEN.goalIndices) {
        for (let s = 896000; s <= 896999; s++) {
            if (!env.makeConfig(s, idx).accepted) continue;
            if (inC(s, idx)) continue;
            out.push({ configSeed: s, configIndex: idx });
            break;
        }
    }
    return out;
}
const SET_F = resolveSetF();
const FIXTURES = [...SET_C.map(f => ({ ...f, set: 'C' })),
                  ...SET_F.map(f => ({ ...f, set: 'F' }))];

// ---- the child: one run, all 19 states, decision-time pool + bestChoice ----
const childSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/m14/hook.mjs', import.meta.url);
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M14 = await import(U + '/experiments/m14/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');

const ARM = ${JSON.stringify(o.arm)};
if (!env.makeConfig(${o.configSeed}, ${o.configIndex}).accepted) {
    throw new Error('M19: fixture not accepted at its own seed; the acceptance walk would leave it.');
}
globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${FROZEN.ticks}, crashAtTick: null, warmStore: false,
});
globalThis.__UQB__ = null;

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});
const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);
const out = [];
for (const u of states) {
    const r = M14.makePoolRecorder();
    let best = null;
    globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
    globalThis.__UQB_PROBE__ = (from, key, step) => { if (step === 0 && best === null) best = key; };
    globalThis.__M14__ = r;
    initRng(readoutSeed(${o.configSeed}, ARM, u));
    runPrediction(u);
    globalThis.__M14__ = null; globalThis.__UQB_PROBE__ = null; globalThis.__UQB__ = null;
    globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
    out.push({ state: u, best, pool: r.snapshots.length ? r.snapshots[0].pairs : [] });
}
process.stdout.write('@@M19@@' + JSON.stringify({
    arm: ARM, goal: cfg.goal, states, fingerprint: rec.fingerprint,
    evaluatedSeeds: env.evaluatedSeeds(), readouts: out,
}));
`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm19-'));
const runChild = (o, tag) => {
    const f = path.join(TMP, `c_${tag}_${o.configSeed}_${o.configIndex}.mjs`);
    fs.writeFileSync(f, childSource(o));
    const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const r = JSON.parse(out.slice(out.indexOf('@@M19@@') + 7));
    for (const s of r.evaluatedSeeds) {
        if (inRegisteredBlock(s)) throw new Error(`M19: registered UQ-B seed ${s} evaluated.`);
        if (s >= 895000 && s <= 895999) throw new Error(`M19: C1 registered seed ${s} evaluated.`);
    }
    return r;
};

// ---- E6 quantities, exactly as frozen -------------------------------------
const rankOf = (pairs, key) => {
    const s = pairs.slice().sort((x, y) => y[1] - x[1]);
    const i = s.findIndex(x => Number(x[0]) === Number(key));
    return i < 0 ? null : i;
};
// rho defined iff n >= 2 AND v* in pool
const rhoOf = (pairs, vStar) => {
    const n = pairs.length;
    if (n < 2) return { rho: null, r: null, n, why: 'n<2' };
    const r = rankOf(pairs, vStar);
    if (r === null) return { rho: null, r: null, n, why: 'v* absent' };
    return { rho: r / (n - 1), r, n, why: null };
};

log('='.repeat(78));
log('  M19 PASS 3 — PRE-COLLECTION INSTRUMENT STRESS TEST (EXECUTION)');
log(`  registered C1 block ${895000}-${895999} UNTOUCHED; fixtures are 896xxx only`);
log('='.repeat(78));
log('\n-- fixtures ------------------------------------------------------------------');
for (const f of FIXTURES) {
    const cfg = env.makeConfig(f.configSeed, f.configIndex);
    log(`  Set ${f.set}  ${f.configSeed}:${f.configIndex}  goal ${cfg.goal}`);
}

// ---- collect ---------------------------------------------------------------
const data = [];
for (const f of FIXTURES) {
    const A = runChild({ ...f, arm: 'ARMED' }, 'A');
    const A2 = runChild({ ...f, arm: 'ARMED' }, 'A2');     // K3 negative control
    const B = runChild({ ...f, arm: 'ABLATED' }, 'B');
    const cfg = env.makeConfig(f.configSeed, f.configIndex);
    const oracle = {
        1: env.reliabilityOptimalPolicy(cfg.pPhase1, cfg.goal).policy,
        2: env.reliabilityOptimalPolicy(cfg.pPhase2, cfg.goal).policy,
    };
    const cells = [];
    A.states.forEach((u, i) => {
        for (const ph of [1, 2]) {
            const vStar = Number(oracle[ph].get(u));
            const a = rhoOf(A.readouts[i].pool, vStar);
            const a2 = rhoOf(A2.readouts[i].pool, vStar);
            const b = rhoOf(B.readouts[i].pool, vStar);
            const bothDef = a.rho !== null && b.rho !== null;
            cells.push({
                state: u, phase: ph, vStar,
                rA: a.r, nA: a.n, rhoA: a.rho, whyA: a.why,
                rB: b.r, nB: b.n, rhoB: b.rho, whyB: b.why,
                rA2: a2.r, nA2: a2.n, rhoA2: a2.rho,
                bothDefined: bothDef,
                delta: bothDef ? a.rho - b.rho : null,
                deltaControl: (a.rho !== null && a2.rho !== null) ? a.rho - a2.rho : null,
                controlPairDefined: (a.rho === null) === (a2.rho === null),
                bestA: A.readouts[i].best, bestB: B.readouts[i].best,
                oracleStar: { 1: Number(oracle[1].get(u)), 2: Number(oracle[2].get(u)) },
                rankStar1inA: rankOf(A.readouts[i].pool, Number(oracle[1].get(u))),
                rankStar2inA: rankOf(A.readouts[i].pool, Number(oracle[2].get(u))),
                ties: A.readouts[i].pool.length -
                      new Set(A.readouts[i].pool.map(x => x[1])).size,
                tiesB: B.readouts[i].pool.length -
                       new Set(B.readouts[i].pool.map(x => x[1])).size,
            });
        }
    });
    const e1 = A.states.filter((u, i) =>
        Number(A.readouts[i].best) !== Number(B.readouts[i].best)).length;
    data.push({ ...f, goal: cfg.goal, cells, e1,
        fpA: A.fingerprint, fpA2: A2.fingerprint, fpB: B.fingerprint,
        identicalRuns: JSON.stringify(A.readouts) === JSON.stringify(A2.readouts),
        evaluatedSeeds: [...new Set([...A.evaluatedSeeds, ...A2.evaluatedSeeds,
                                     ...B.evaluatedSeeds])] });
}
fs.rmSync(TMP, { recursive: true, force: true });

// ==========================================================================
// K1-K8, EXACTLY as frozen. Each is a universal statement; each is falsified
// by one counterexample, except K3 which is DETECTED by one violation.
// ==========================================================================
const all = data.flatMap(d => d.cells.map(c => ({ ...c, set: d.set, fx: `${d.configSeed}:${d.configIndex}` })));
const bySet = (s) => all.filter(c => c.set === s);

const K = {};
const evalK = (id, name, applicable, falsifiedBy, counts) => {
    K[id] = { id, name, applicable, falsified: applicable ? falsifiedBy > 0 : null,
              counterexamples: falsifiedBy, counts,
              status: !applicable ? 'NOT EXERCISABLE'
                    : (falsifiedBy > 0 ? 'not detected (falsified)' : 'DETECTED') };
    return K[id];
};

// K1 undefined: rho undefined in every cell. Falsified by one jointly-defined cell.
{
    const def = all.filter(c => c.bothDefined);
    evalK('K1', 'undefined', true, def.length,
        { jointlyDefined: def.length, totalCells: all.length,
          setC: bySet('C').filter(c => c.bothDefined).length,
          setF: bySet('F').filter(c => c.bothDefined).length });
}
// K2 inert: delta = 0 in every cell. Falsified by one non-zero delta.
{
    const nz = all.filter(c => c.bothDefined && Math.abs(c.delta) > 0);
    evalK('K2', 'inert', all.some(c => c.bothDefined), nz.length,
        { nonZeroDelta: nz.length, definedCells: all.filter(c => c.bothDefined).length,
          setC: bySet('C').filter(c => c.bothDefined && Math.abs(c.delta) > 0).length,
          setF: bySet('F').filter(c => c.bothDefined && Math.abs(c.delta) > 0).length });
}
// K3 noisy: DETECTED by any non-zero delta on a same-arm re-measurement.
{
    const viol = all.filter(c => c.deltaControl !== null && Math.abs(c.deltaControl) > 0);
    const mism = all.filter(c => !c.controlPairDefined);
    K.K3 = { id: 'K3', name: 'noisy', applicable: true,
             falsified: null, violations: viol.length,
             counts: { violations: viol.length, definednessMismatches: mism.length,
                       comparedCells: all.filter(c => c.deltaControl !== null).length,
                       identicalRuns: data.filter(d => d.identicalRuns).length,
                       fixtures: data.length },
             status: (viol.length === 0 && mism.length === 0) ? 'not detected' : 'DETECTED' };
}
// K4 stuck: rank identical for v*1 and v*2 wherever they differ.
{
    const exer = all.filter(c => c.phase === 1 && c.oracleStar[1] !== c.oracleStar[2] &&
                                 c.rankStar1inA !== null && c.rankStar2inA !== null);
    const diff = exer.filter(c => c.rankStar1inA !== c.rankStar2inA);
    evalK('K4', 'stuck', exer.length > 0, diff.length,
        { exercisableCells: exer.length, rankDiffered: diff.length,
          setC: exer.filter(c => c.set === 'C' && c.rankStar1inA !== c.rankStar2inA).length,
          setF: exer.filter(c => c.set === 'F' && c.rankStar1inA !== c.rankStar2inA).length });
}
// K5 normalisation artifact: every non-zero delta is normalisation-driven.
// Falsified by one cell with r_A != r_B.
{
    const def = all.filter(c => c.bothDefined);
    const rankMoved = def.filter(c => c.rA !== c.rB);
    const normOnly = def.filter(c => c.rA === c.rB && c.nA !== c.nB);
    const both = def.filter(c => c.rA !== c.rB && c.nA !== c.nB);
    evalK('K5', 'normalisation artifact', def.length > 0, rankMoved.length,
        { rankMoved: rankMoved.length, normalisationOnly: normOnly.length,
          both: both.length, definedCells: def.length,
          setC: def.filter(c => c.set === 'C' && c.rA !== c.rB).length,
          setF: def.filter(c => c.set === 'F' && c.rA !== c.rB).length });
}
// K6 coarse: no defined pool has n >= 3. Falsified by one pool with n >= 3.
{
    const pools = all.flatMap(c => [c.nA, c.nB]).filter(n => n !== null);
    const graded = pools.filter(n => n >= 3);
    evalK('K6', 'coarse', pools.length > 0, graded.length,
        { gradedPools: graded.length, totalPools: pools.length,
          n1: pools.filter(n => n === 1).length, n2: pools.filter(n => n === 2).length,
          setC: bySet('C').flatMap(c => [c.nA, c.nB]).filter(n => n >= 3).length,
          setF: bySet('F').flatMap(c => [c.nA, c.nB]).filter(n => n >= 3).length });
}
// K7 forced: r identical in every defined cell. Falsified by >= 2 distinct r.
{
    const rs = all.flatMap(c => [c.rA, c.rB]).filter(r => r !== null);
    const distinct = new Set(rs);
    evalK('K7', 'forced', rs.length > 0, distinct.size >= 2 ? distinct.size : 0,
        { distinctRanks: distinct.size, observedRanks: [...distinct].sort((a, b) => a - b),
          setC: new Set(bySet('C').flatMap(c => [c.rA, c.rB]).filter(r => r !== null)).size,
          setF: new Set(bySet('F').flatMap(c => [c.rA, c.rB]).filter(r => r !== null)).size });
}
// K8 saturated: |delta| = 1 in every cell. Falsified by one interior delta.
{
    const def = all.filter(c => c.bothDefined);
    const interior = def.filter(c => Math.abs(c.delta) < 1);
    evalK('K8', 'saturated', def.length > 0, interior.length,
        { interiorDelta: interior.length, definedCells: def.length,
          atExtreme: def.filter(c => Math.abs(c.delta) === 1).length,
          setC: def.filter(c => c.set === 'C' && Math.abs(c.delta) < 1).length,
          setF: def.filter(c => c.set === 'F' && Math.abs(c.delta) < 1).length });
}

// ---- report ----------------------------------------------------------------
log('\n-- K1-K8 register ------------------------------------------------------------');
for (const id of ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8']) {
    const k = K[id];
    const verdict = k.status === 'DETECTED' ? '*** DETECTED ***'
                  : k.status === 'NOT EXERCISABLE' ? 'NOT EXERCISABLE' : 'not detected';
    log(`  ${id} ${k.name.padEnd(24)} ${verdict}`);
    log(`     ${JSON.stringify(k.counts)}`);
}

const detected = Object.values(K).filter(k => k.status === 'DETECTED');
const notExercisable = Object.values(K).filter(k => k.status === 'NOT EXERCISABLE');

log('\n-- per-fixture evidence ------------------------------------------------------');
for (const d of data) {
    const def = d.cells.filter(c => c.bothDefined).length;
    const nz = d.cells.filter(c => c.bothDefined && Math.abs(c.delta) > 0).length;
    const rm = d.cells.filter(c => c.bothDefined && c.rA !== c.rB).length;
    log(`  Set ${d.set} ${d.configSeed}:${d.configIndex} goal ${String(d.goal).padStart(2)}  ` +
        `defined ${def}/38  non-zero delta ${nz}  rank-moved ${rm}  E1 ${d.e1}/19  ` +
        `same-arm identical ${d.identicalRuns}`);
}

log('\n-- Set C vs Set F ------------------------------------------------------------');
for (const id of ['K1', 'K2', 'K4', 'K5', 'K6', 'K7', 'K8']) {
    const c = K[id].counts;
    log(`  ${id}  Set C ${String(c.setC).padStart(4)}   Set F ${String(c.setF).padStart(4)}` +
        `${(c.setC > 0) !== (c.setF > 0) ? '   <-- DISCREPANCY' : ''}`);
}

const outcome = detected.length === 0 ? 'NO KNOWN FAILURE DETECTED' : 'KNOWN FAILURE DETECTED';
log('\n' + '='.repeat(78));
log(`  OUTCOME: ${outcome}`);
if (detected.length) log(`  detected: ${detected.map(k => k.id).join(', ')}`);
if (notExercisable.length) log(`  not exercisable: ${notExercisable.map(k => k.id).join(', ')}`);
log('  This does NOT establish "INSTRUMENT ADEQUATE FOR C1", which M19 cannot establish.');
log('='.repeat(78));

fs.writeFileSync(path.join(HERE, 'm19_stress.json'), JSON.stringify({
    specification: 'M19 PASS 1.2 (640d088/d89b35f)',
    setC: SET_C, setF: SET_F, outcome,
    register: K, fixtures: data.map(d => ({
        set: d.set, configSeed: d.configSeed, configIndex: d.configIndex, goal: d.goal,
        e1: d.e1, fpA: d.fpA, fpA2: d.fpA2, fpB: d.fpB, identicalRuns: d.identicalRuns,
        evaluatedSeeds: d.evaluatedSeeds, cells: d.cells,
    })),
}, null, 2) + '\n');
log(`\n  recorded to experiments/m19_3/m19_stress.json`);
process.exit(0);

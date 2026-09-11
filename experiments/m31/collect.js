// ==========================================================
// M31 — TRAJECTORY-MULTIPLICITY ATTAINABILITY DETERMINATION
// ==========================================================
// PURPOSE, stated so it cannot be mistaken:
//   This determines whether the PROPOSED C x R DESIGN is empirically attainable —
//   i.e. whether varying agentSeed actually produces distinct effective trajectories,
//   and whether E6 responds to them at all.
//
//   "The design is/is not attainable" is the only thing this can establish.
//   It is NOT evidence about futureScore, NOT a mechanism claim, and NOT a result
//   about any registered population. Nothing here is comparable to C1.
//
// GOVERNANCE
//   Non-registered DEVELOPMENT fixtures only — the same 896xxx fixtures M9, M11, M12
//   and M14 already used. No registered configuration seed is generated, evaluated or
//   consumed; every child asserts that before returning, exactly as M14 did.
//
//   TRAJECTORY SEEDS are a DIFFERENT NAMESPACE from configuration seeds (M30 section 13:
//   the registry cannot govern them — isHeldOut(20260819000) is true). They are declared
//   here as a development trajectory block and derived deterministically from the frozen
//   production agentSeed so they are reproducible and auditable. This file proposes no
//   registry change.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';
import { oraclesFor, rhoOf } from '../c1/analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const log = (s = '') => process.stdout.write(s + '\n');

// ---- DEVELOPMENT FIXTURES (configuration axis, C) -------------------------
// Already-spent 896xxx development territory. Two goals, so a finding cannot be a
// property of one goal alone. More would cost runs without changing what is asked.
const FIXTURES = [
    { configSeed: 896066, configIndex: 0 },   // goal 8
    { configSeed: 896238, configIndex: 2 },   // goal 16
];

// ---- DEVELOPMENT TRAJECTORY SEEDS (trajectory axis, R) --------------------
// Deterministic, declared, reproducible. The first entry IS the frozen production
// agentSeed, so the observed grid contains the trajectory C1 actually used as an
// anchor; the rest are consecutive offsets. No registry governs this namespace yet
// (M30 section 13) and this file does not create one.
// TWO REGIMES are tested deliberately, because they can fail differently:
//   ADJACENT  base+0..+3 — consecutive integers. This is the HARD case for a PRNG:
//             if mulberry32's avalanche were weak on nearby seeds, collisions would
//             appear here first (M26 raised exactly this).
//   DISTANT   base + large offsets — if adjacency were the only collision regime,
//             these would separate cleanly and the adjacency result would be pessimistic.
// Testing only one regime would leave the other's failure mode undetected.
const TRAJ_BASE = FROZEN.agentSeed;                 // 20260819000
const ADJACENT = [0, 1, 2, 3];
const DISTANT = [1000003, 2000003];
const TRAJ_SEEDS = (process.env.M31_N_TRAJ
    ? [...Array(Number(process.env.M31_N_TRAJ)).keys()]
    : [...ADJACENT, ...DISTANT]).map((i) => TRAJ_BASE + i);
const TRAJ_REGIME = (s) => (s - TRAJ_BASE) >= 1000 ? 'distant' : 'adjacent';

const TICKS = Number(process.env.M31_TICKS ?? FROZEN.ticks);

// ---- child: ONE (configuration, trajectory seed, arm) run ------------------
// Modelled on the committed M14 harness. The ONLY differences are that agentSeed is
// parameterised, and that cogDraws/visDraws are returned — the exact quantity M30
// found C1 had failed to persist.
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
const cfg0 = env.makeConfig(${o.configSeed}, ${o.configIndex});
if (!cfg0.accepted) throw new Error('M31: fixture not accepted at its own seed.');

globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${o.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${TICKS}, crashAtTick: null, warmStore: false,
});
globalThis.__UQB__ = null;

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
if (typeof runPrediction !== 'function') throw new Error('M31: runPrediction did not bind.');
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
process.stdout.write('@@M31@@' + JSON.stringify({
    arm: ARM, goal: cfg.goal, states,
    fingerprint: rec.fingerprint,
    cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
    qEntries: rec.artifacts.qEntries,
    attempts: rec.artifacts.attempts, successes: rec.artifacts.successes,
    evaluatedSeeds: env.evaluatedSeeds(), readouts: out,
}));
`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm31-'));
const run = (o) => {
    const f = path.join(TMP, `c_${o.arm}_${o.configSeed}_${o.configIndex}_${o.agentSeed}.mjs`);
    fs.writeFileSync(f, childSource(o));
    const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const r = JSON.parse(out.slice(out.indexOf('@@M31@@') + 7));
    // GOVERNANCE ASSERTION, per child, exactly as M14 did: no registered seed may be
    // evaluated. This is the guard, not a comment about one.
    for (const s of r.evaluatedSeeds) {
        if (inRegisteredBlock(s)) throw new Error(`M31: registered seed ${s} evaluated.`);
    }
    return r;
};

log('='.repeat(78));
log('  M31 — trajectory-multiplicity attainability, development fixtures only');
log('  attainability of the C x R DESIGN only; not evidence about futureScore');
log('='.repeat(78));
log(`  fixtures       : ${FIXTURES.map(f => f.configSeed + '/' + f.configIndex).join(', ')}`);
log(`  trajectory seeds: ${TRAJ_SEEDS[0]} .. ${TRAJ_SEEDS[TRAJ_SEEDS.length - 1]} (${TRAJ_SEEDS.length})`);
log(`  ticks per run  : ${TICKS}`);
log(`  total runs     : ${FIXTURES.length * TRAJ_SEEDS.length * 2}`);
log('');

const cells = [];
const t0 = Date.now();
for (const fx of FIXTURES) {
    const cfg = env.makeConfig(fx.configSeed, fx.configIndex);
    const oracle = oraclesFor(cfg);
    for (const agentSeed of TRAJ_SEEDS) {
        const A = run({ ...fx, agentSeed, arm: 'ARMED' });
        const B = run({ ...fx, agentSeed, arm: 'ABLATED' });

        // E6 per state per phase, using the FROZEN definitions imported from C1.
        const per = [];
        for (let i = 0; i < A.states.length; i++) {
            const u = A.states[i];
            for (const ph of [1, 2]) {
                const vStar = Number(oracle[ph].get(u));
                const a = rhoOf(A.readouts[i].pool, vStar);
                const b = rhoOf(B.readouts[i].pool, vStar);
                const both = a.rho !== null && b.rho !== null;
                per.push({ state: u, phase: ph, vStar,
                           rA: a.r, nA: a.n, rhoA: a.rho, whyA: a.why,
                           rB: b.r, nB: b.n, rhoB: b.rho, whyB: b.why,
                           bothDefined: both, delta: both ? a.rho - b.rho : null });
            }
        }
        const e1 = A.states.filter((u, i) => A.readouts[i].best !== B.readouts[i].best).length;
        cells.push({
            configSeed: fx.configSeed, configIndex: fx.configIndex, goal: cfg.goal,
            agentSeed, regime: TRAJ_REGIME(agentSeed), e1,
            armed:   { fingerprint: A.fingerprint, cogDraws: A.cogDraws, visDraws: A.visDraws,
                       qEntries: A.qEntries, attempts: A.attempts, successes: A.successes },
            ablated: { fingerprint: B.fingerprint, cogDraws: B.cogDraws, visDraws: B.visDraws,
                       qEntries: B.qEntries, attempts: B.attempts, successes: B.successes },
            cells: per,
        });
        log(`  ${fx.configSeed}/${fx.configIndex} goal ${cfg.goal}  seed ${agentSeed}  ` +
            `E1 ${String(e1).padStart(2)}  cogDraws A ${A.cogDraws} / B ${B.cogDraws}  ` +
            `fp ${A.fingerprint.slice(0, 8)} / ${B.fingerprint.slice(0, 8)}`);
    }
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

fs.mkdirSync(path.join(HERE, 'data'), { recursive: true });
const outPath = path.join(HERE, 'data', 'm31_observations.json');
fs.writeFileSync(outPath, JSON.stringify({
    purpose: 'C x R design attainability on non-registered development fixtures only',
    notEvidenceAbout: 'futureScore, any mechanism, or any registered population',
    fixtures: FIXTURES, trajectorySeeds: TRAJ_SEEDS, ticks: TICKS,
    regimes: { adjacent: ADJACENT.map(i=>TRAJ_BASE+i), distant: DISTANT.map(i=>TRAJ_BASE+i) },
    trajectorySeedNamespace: 'development trajectory seeds; NOT registry-governed (M30 section 13)',
    elapsedSeconds: Number(elapsed),
    observations: cells,
}, null, 2) + '\n');

log('');
log(`  wrote ${path.relative(ROOT, outPath)}  (${elapsed}s, ${cells.length * 2} runs)`);
log('='.repeat(78));

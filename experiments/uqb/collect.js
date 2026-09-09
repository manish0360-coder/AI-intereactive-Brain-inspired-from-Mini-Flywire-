// ==========================================================
// UQ-B COLLECTOR — one configuration, one arm: run then readout
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   UQB_PREREGISTRATION.md v1.0 (3b3d195), as amended by UQB-ERR-01 (84c738e)
//   and UQB-ERR-02 (59c2750).
//
// WHAT THIS DOES
//   Runs ONE accepted configuration under ONE §5.1 arm for the frozen tick
//   budget, then — in the SAME process, because the learned state lives in
//   module singletons — takes the §8 readout at all 19 decision states under
//   all 20 §6 arrangements. Returns the raw readouts plus the run identity,
//   the environment vectors, and the proofs below.
//
// WHAT THIS DOES NOT DO
//   It computes no alignment count, no C1 difference, no C2 verdict. §10 and
//   §12 are computed offline in analyze.js from the raw readouts, so every
//   published number stays recomputable from evidence the analysis never
//   touched.
//
// ONE PROCESS PER RUN (M7 gate G10)
//   run.js claims the process and main.js is a singleton ESM module, so a second
//   run in one process would silently inherit learned state. Each
//   (configuration, arm) therefore gets its own process. That also makes the
//   pairing honest: the two arms share no runtime state whatsoever.
//
// THE THREE CONTROLS ARE ALL ACTIVE DURING THE READOUT
//   §6 permutation   — globalThis.__UQB__        (the arrangement)
//   R2, ERR-01 §4    — globalThis.__UQB_FREEZE__     (uncertainty persistence)
//   R3, ERR-02 §8    — globalThis.__UQB_FREEZE_BIO__ (biology persistence)
//   All three are cleared between readouts, so the guards are never left set.
//
// SEED DISCIPLINE
//   Every seed passes protocol.assertSeedAllowed BEFORE any child is spawned.
//   With `collection` unset — development, preflight, verification — a seed in
//   the registered block is refused there, before it can reach a run path.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, assertSeedAllowed } from './protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.split(path.sep).join('/');

export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** The readout RNG seed, frozen: a pure function of (configuration, arm, state). */
export const readoutSeed = (configSeed, arm, state) =>
    ((configSeed * 1000003) ^ (arm === 'ARMED' ? 0x5bf03635 : 0x27d4eb2f) ^ (state * 2654435761)) >>> 0;

function childSource(o) {
    return `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/uqb/hook.mjs', import.meta.url);

const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng, liveRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');

const ARM = ${JSON.stringify(o.arm)};

// ---- the frozen run ------------------------------------------------------
// §5.1 THE EXPOSURE APPLIES TO THE RUN, not only to the readout. C1 is the
// total causal effect of the term's continuous presence on the final greedy
// policy: it "compares the policies that result from two different experiential
// histories" (UQ-B §2, as clarified). If both arms ran identically there would
// be only ONE history and C1 would measure nothing.
//
// The identity arrangement is used throughout the run, so ARMED delivers the
// committed values unchanged and ABLATED delivers exactly 0 to every candidate
// — the frozen §5.1 exposure. Both arms take the identical code path and the
// identical futureScore budget; they differ only in the delivered value.
//
// The R2/R3 persistence controls are NOT set here: during the run the agent is
// living its history, and that history must be the committed one.
globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
const rec = await runOnce({
    configSeed:  ${o.configSeed},
    configIndex: ${o.configIndex},
    agentSeed:   ${FROZEN.agentSeed},
    arm:         ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});

globalThis.__UQB__ = null;   // the run is over; readouts set their own guard

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
if (typeof runPrediction !== 'function') {
    throw new Error('UQ-B: the §8 readout handle did not bind; main.js was not transformed.');
}

// §7 — the fixed population, computed from topology and goal alone.
const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});
const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);   // frozen order

const RSEED = (u) => ${o.readoutSeedExpr};

// One §8 readout: all three controls on, reseeded, bestChoice at step 0 taken
// BEFORE the epsilon override, then a canary from the same stream.
function readout(u) {
    let best = null, probeCalls = 0, canary0 = null;
    globalThis.__UQB_FREEZE__ = true;
    globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB_PROBE__ = (from, key, step) => {
        probeCalls++;
        if (step === 0 && best === null) { best = key; canary0 = liveRng(); }
    };
    initRng(RSEED(u));
    runPrediction(u);
    const canary = liveRng();
    globalThis.__UQB_PROBE__ = null;
    globalThis.__UQB_FREEZE__ = false;
    globalThis.__UQB_FREEZE_BIO__ = false;
    return { best, probeCalls, canary, canary0 };
}

// ---- candidate sizes, needed before arrangements can be drawn -------------
// One identity pass records n(u) at each state without permuting anything.
const sizes = new Map();
let CUR = null;
globalThis.__UQB__ = P.makeGuard({
    arm: ARM,
    sigmaFor: (n) => [...Array(n).keys()],
    onDecision: ({ keys }) => { if (!sizes.has(CUR)) sizes.set(CUR, keys.length); },
});
for (const u of states) { CUR = u; readout(u); }
globalThis.__UQB__ = null;

// ---- J1 same-state control, taken BEFORE the sweep -----------------------
const offPre = {};
for (const u of states) offPre[u] = readout(u);

// ---- §6 arrangements: identity + 19 distinct ------------------------------
const A = P.buildArrangements({ configSeed: ${o.configSeed}, arm: ARM, states, sizes });

const rows = [];
for (let j = 0; j < 1 + P.K; j++) {
    const r = { j, identity: j === 0, best: {}, canary: {}, canary0: {}, probeCalls: {} };
    for (const u of states) {
        globalThis.__UQB__ = P.makeGuard({
            arm: ARM,
            sigmaFor: j === 0
                ? (n) => [...Array(n).keys()]
                : (n) => P.permutationFor(A.seeds[j - 1][u], n),
        });
        const x = readout(u);
        r.best[u] = x.best; r.canary[u] = x.canary;
        r.canary0[u] = x.canary0; r.probeCalls[u] = x.probeCalls;
        globalThis.__UQB__ = null;
    }
    rows.push(r);
}

// ---- J1 same-state control, taken AFTER the sweep ------------------------
const offPost = {};
for (const u of states) offPost[u] = readout(u);

process.stdout.write('@@UQBDATA@@' + JSON.stringify({
    goal: cfg.goal,
    pPhase1: cfg.pPhase1,
    pPhase2: cfg.pPhase2,
    states,
    sizes: [...sizes],
    arrangements: rows,
    arrangementSeeds: A.seeds,
    arrangementsDistinct: A.distinct,
    arrangementAttempts: A.attempts,
    offPre, offPost,
    fingerprint: rec.fingerprint,
    artifacts: { cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
                 qEntries: rec.artifacts.qEntries, qSum: rec.artifacts.qSum },
    envCounters: env.getCounters(),
    evaluatedSeeds: env.evaluatedSeeds(),
    used: { agentSeed: ${FROZEN.agentSeed}, m7Arm: ${JSON.stringify(FROZEN.m7Arm)},
            ticks: ${o.ticks}, configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
            arm: ARM },
}));`;
}

/**
 * Collect one configuration under one arm.
 *
 * @param {object} o
 *   configSeed, configIndex, goal   pre-verified accepted configuration
 *   arm                             'ARMED' | 'ABLATED'
 *   ticks                           defaults to the frozen 3000
 *   collection                      true ONLY on the authorised collection path
 */
export function collectOne(o) {
    const collection = o.collection === true;

    // SEED PROTECTION, before anything else and before any child exists.
    assertSeedAllowed(o.configSeed, { collection });

    if (!FROZEN.arms.includes(o.arm)) {
        throw new Error(`UQ-B: arm ${JSON.stringify(o.arm)} is not one of the frozen §5.1 arms ` +
            `${FROZEN.arms.join('/')}.`);
    }
    const ticks = o.ticks === undefined ? FROZEN.ticks : o.ticks;
    if (collection && ticks !== FROZEN.ticks) {
        throw new Error(`UQ-B: tick budget ${ticks} is not the frozen ${FROZEN.ticks}. A reduced ` +
            `budget is permitted only off the collection path.`);
    }
    if (!FROZEN.goalIndices.includes(o.configIndex)) {
        throw new Error(`UQ-B: configIndex ${o.configIndex} is outside the frozen goal schedule.`);
    }

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uqbrun-'));
    const f = path.join(tmp, `c_${o.configSeed}_${o.configIndex}_${o.arm}.mjs`);
    try {
        const readoutSeedExpr =
            `((${o.configSeed} * 1000003) ^ (ARM === 'ARMED' ? 0x5bf03635 : 0x27d4eb2f) ` +
            `^ (u * 2654435761)) >>> 0`;
        fs.writeFileSync(f, childSource({ ...o, ticks, readoutSeedExpr }));
        const out = execFileSync(process.execPath, [f],
            { cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 30 });
        const raw = JSON.parse(out.slice(out.indexOf('@@UQBDATA@@') + 11));

        // ---- proof: seed ---------------------------------------------------
        for (const s of raw.evaluatedSeeds) assertSeedAllowed(s, { collection });
        if (raw.evaluatedSeeds.length !== 1 || raw.evaluatedSeeds[0] !== o.configSeed) {
            throw new Error(`UQ-B: the run touched seeds [${raw.evaluatedSeeds}] but was given ` +
                `${o.configSeed}. A forward acceptance walk occurred.`);
        }
        // ---- proof: parameters ---------------------------------------------
        if (raw.used.agentSeed !== FROZEN.agentSeed || raw.used.m7Arm !== FROZEN.m7Arm
            || raw.used.ticks !== ticks || raw.used.arm !== o.arm) {
            throw new Error(`UQ-B: the child reports ${JSON.stringify(raw.used)}, which does not ` +
                `match the requested parameters.`);
        }
        if (raw.goal !== o.goal) {
            throw new Error(`UQ-B: the run's goal is ${raw.goal}, the enumeration recorded ${o.goal}.`);
        }
        // ---- proof: structure ----------------------------------------------
        if (raw.states.length !== FROZEN.decisionStates) {
            throw new Error(`UQ-B: the §7 population is ${raw.states.length} states, frozen at ` +
                `${FROZEN.decisionStates}.`);
        }
        if (raw.arrangements.length !== FROZEN.arrangements) {
            throw new Error(`UQ-B: ${raw.arrangements.length} arrangements, frozen at ` +
                `${FROZEN.arrangements} (identity + K=${FROZEN.K}).`);
        }
        if (!raw.arrangements[0].identity || !raw.arrangementsDistinct) {
            throw new Error('UQ-B: arrangement 0 is not the identity, or the 20 arrangements are ' +
                'not pairwise distinct (§6.5).');
        }
        for (const r of raw.arrangements) {
            for (const u of raw.states) {
                if (r.best[u] === null || r.best[u] === undefined) {
                    throw new Error(`UQ-B: arrangement ${r.j} produced no readout at state ${u}; ` +
                        `§18 requires complete C2 data for all 19 states.`);
                }
            }
        }
        return {
            runIdentity: {
                configSeed: o.configSeed, configIndex: o.configIndex, goal: o.goal,
                arm: o.arm, agentSeed: FROZEN.agentSeed, m7Arm: FROZEN.m7Arm, ticks,
                preregistration: FROZEN.preregistration,
                erratum01: FROZEN.erratum01, erratum02: FROZEN.erratum02,
                collection,
            },
            readouts: raw.arrangements,
            environment: { goal: raw.goal, pPhase1: raw.pPhase1, pPhase2: raw.pPhase2 },
            states: raw.states,
            sizes: raw.sizes,
            j1: { offPre: raw.offPre, offPost: raw.offPost },
            provenance: {
                fingerprint: raw.fingerprint, artifacts: raw.artifacts,
                envCounters: raw.envCounters, evaluatedSeeds: raw.evaluatedSeeds,
                used: raw.used, arrangementSeeds: raw.arrangementSeeds,
                arrangementsDistinct: raw.arrangementsDistinct,
                arrangementAttempts: raw.arrangementAttempts,
            },
        };
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

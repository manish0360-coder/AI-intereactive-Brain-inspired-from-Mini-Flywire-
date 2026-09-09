// ==========================================================
// UQ-A EXPERIMENT RUNNER — one configuration, one arm, raw evidence only
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQA_PREREGISTRATION.md, frozen at 63247bb,
//   digest 03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//
// WHAT THIS DOES
//   Runs ONE accepted configuration through the committed M7 runtime under ONE
//   §5 arm, and returns the RAW end-of-run Q table together with the run
//   identity, the environment's reliability vectors, and the proofs listed
//   below. Nothing is reduced, ranked, correlated, or interpreted here.
//
// WHAT THIS DOES NOT DO
//   It computes no rho, no coverage, no exclusion count, no arm difference and
//   no hypothesis verdict. §6, §9 and §12 are computed offline in analyze.js
//   from the raw table, so every published number remains recomputable from
//   evidence that was never touched by the analysis.
//
// REUSE, NOT DUPLICATION
//   The agent, environment, arms, phase switching and tick budget all come from
//   experiments/m7/run.js unchanged, and the child-process construction from
//   experiments/q1/collect.js. This file adds the §5 arm plumbing and the
//   proofs. No M7, M8 or Q1 logic is restated.
//
// ONE PROCESS PER RUN
//   run.js claims the process and main.js is a singleton ESM module, so a
//   second run in one process would silently inherit learned state (M7 gate
//   G10). Each configuration-arm pair therefore gets its own process. That also
//   makes the pairing honest: the two arms share no runtime state whatsoever.
//
// SEED DISCIPLINE — the M8 hazard, carried forward
//   env.generateAccepted walks FORWARD from a rejected seed. From UQ-A's upper
//   bound 898999 that walk would cross into Q1's consumed 899000. The runner
//   therefore only ever passes a seed already proven accepted by
//   protocol.enumerateCandidates, and asserts afterwards that the run consumed
//   exactly that seed and advanced zero.
//
// THE FOUR PROOFS, all read back from the child rather than assumed
//   1. SEED    — env's own record of every configSeed the process evaluated.
//   2. PARAMS  — agent seed, arm, tick budget, config seed and index.
//   3. ARM     — the SHA-256 of the source the loader thread delivered to the
//                module system, compared with an independently recomputed
//                transform. Digested over line-ending-normalised text so the
//                evidence regenerates from any checkout; see shaSource below.
//                This is what makes "ABLATED" a fact and not a label.
//   4. SCHEMA  — the Q table's key shape, and that the population's own keys are
//                drawn from the namespace the run actually wrote into.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, assertSeedAllowed } from './protocol.js';
import { transform } from './instrument.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.split(path.sep).join('/');

// Digests of SOURCE are taken over the line-ending-normalised text, matching the
// load hook. Under core.autocrlf=true a fresh clone materialises main.js with
// CRLF, so a raw-byte digest would differ between checkouts and the recorded
// evidence would not regenerate. Terminators are semantically void in JavaScript
// and verify_uqa.js D12 proves the transform preserves rather than rewrites
// them, so the proof is unchanged and becomes checkout-independent.
const shaSource = (s) => crypto.createHash('sha256')
    .update(String(s).replace(/\r\n/g, '\n')).digest('hex');

// The committed Q key shape (F6): "pos#goal->action", all three numeric.
const Q_KEY_SHAPE = /^-?\d+#-?\d+->-?\d+$/;

function childSource(o) {
    return `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
const env = await import(U + '/experiments/m7/env.js');

register(U + '/experiments/uqa/hook.mjs', import.meta.url);

const { runOnce } = await import(U + '/experiments/m7/run.js');
const { Q } = await import(U + '/render/qlearning.js');

const rec = await runOnce({
    configSeed:  ${o.configSeed},
    configIndex: ${o.configIndex},
    agentSeed:   ${FROZEN.agentSeed},
    arm:         ${JSON.stringify(FROZEN.arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});

// The environment's reliability vectors for THIS configuration, read back from
// env rather than regenerated in the parent, so the y variable of the primary
// outcome comes from the same object the agent actually ran against.
const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});

process.stdout.write('@@UQADATA@@' + JSON.stringify({
    // §6 x — the FULL end-of-run Q table, verbatim. No filtering, no rounding.
    qEntries: [...Q.entries()],
    // §6 y — the environment ground truth, per connections.json entry index.
    goal: cfg.goal,
    pPhase1: cfg.pPhase1,
    pPhase2: cfg.pPhase2,
    unreliableSet: cfg.unreliableSet,
    fingerprint: rec.fingerprint,
    artifacts: { cogDraws: rec.artifacts.cogDraws, visDraws: rec.artifacts.visDraws,
                 qEntries: rec.artifacts.qEntries, qSum: rec.artifacts.qSum },
    envCounters: env.getCounters(),
    evaluatedSeeds: env.evaluatedSeeds(),
    used: { agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.arm)},
            ticks: ${o.ticks}, configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
            uqaArm: process.env.UQA_ARM },
}));`;
}

/**
 * Collect one configuration under one arm.
 *
 * @param {object} o
 *   configSeed, configIndex, goal   pre-verified accepted configuration
 *   uqaArm                          'ARMED' or 'ABLATED' (§5)
 *   ticks                           defaults to the frozen 3000
 *   fixture                         true only for implementation fixtures, which
 *                                   must lie outside every registered block
 */
export function collectOne(o) {
    const fixture = o.fixture === true;
    assertSeedAllowed(o.configSeed, { fixture });

    if (!FROZEN.arms.includes(o.uqaArm)) {
        throw new Error(`UQ-A: arm ${JSON.stringify(o.uqaArm)} is not one of the frozen §5 arms ` +
            `${FROZEN.arms.join('/')}.`);
    }
    const ticks = o.ticks === undefined ? FROZEN.ticks : o.ticks;
    if (!fixture && ticks !== FROZEN.ticks) {
        throw new Error(`UQ-A: tick budget ${ticks} is not the frozen ${FROZEN.ticks}. A reduced ` +
            `budget is permitted only for an out-of-range implementation fixture.`);
    }
    if (!FROZEN.goalIndices.includes(o.configIndex)) {
        throw new Error(`UQ-A: configIndex ${o.configIndex} is outside the frozen goal schedule.`);
    }

    // Proof 3, parent half: what the loader thread MUST have delivered, derived
    // independently from the committed file.
    const expectedDelivered = shaSource(transform(fs.readFileSync(path.join(ROOT, "main.js"), "utf8"),
                                            o.uqaArm));

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uqarun-'));
    const f = path.join(tmp, `c_${o.configSeed}_${o.configIndex}_${o.uqaArm}.mjs`);
    const marker = path.join(tmp, 'arm.json');
    try {
        fs.writeFileSync(f, childSource({ ...o, ticks }));
        const out = execFileSync(process.execPath, [f], {
            cwd: HERE, encoding: 'utf8', maxBuffer: 1 << 30,
            env: { ...process.env, UQA_ARM: o.uqaArm, UQA_MARKER: marker },
        });
        const raw = JSON.parse(out.slice(out.indexOf('@@UQADATA@@') + 11));

        // ---- proof 1: seed --------------------------------------------------
        for (const s of raw.evaluatedSeeds) assertSeedAllowed(s, { fixture });
        if (raw.evaluatedSeeds.length !== 1 || raw.evaluatedSeeds[0] !== o.configSeed) {
            throw new Error(`UQ-A: the run touched seeds [${raw.evaluatedSeeds}] but was given ` +
                `${o.configSeed}. A forward acceptance walk occurred; the configuration was not ` +
                `pre-verified accepted.`);
        }

        // ---- proof 2: parameters --------------------------------------------
        if (!fixture && (raw.used.agentSeed !== FROZEN.agentSeed || raw.used.arm !== FROZEN.arm
                         || raw.used.ticks !== FROZEN.ticks)) {
            throw new Error(`UQ-A: run used agentSeed ${raw.used.agentSeed}, M7 arm ` +
                `${raw.used.arm}, ticks ${raw.used.ticks}; frozen values are ` +
                `${FROZEN.agentSeed}, ${FROZEN.arm}, ${FROZEN.ticks}.`);
        }
        if (raw.used.uqaArm !== o.uqaArm) {
            throw new Error(`UQ-A: the child reports arm ${raw.used.uqaArm}, expected ${o.uqaArm}.`);
        }
        if (raw.goal !== o.goal) {
            throw new Error(`UQ-A: the run's configuration goal is ${raw.goal}, the enumeration ` +
                `recorded ${o.goal}.`);
        }

        // ---- proof 3: the arm was actually delivered ------------------------
        // Without this, "ABLATED" would be a label the parent wrote on itself.
        if (!fs.existsSync(marker)) {
            throw new Error(`UQ-A: the load hook wrote no attestation. main.js was not intercepted, ` +
                `so the ${o.uqaArm} exposure cannot be shown to have been applied.`);
        }
        const att = JSON.parse(fs.readFileSync(marker, 'utf8'));
        if (att.arm !== o.uqaArm) {
            throw new Error(`UQ-A: the load hook attests arm ${att.arm}, expected ${o.uqaArm}.`);
        }
        if (att.deliveredDigest !== expectedDelivered) {
            throw new Error(`UQ-A: the source delivered to the module system digests to ` +
                `${att.deliveredDigest}; the ${o.uqaArm} transform of committed main.js digests to ` +
                `${expectedDelivered}. The executed code is not the registered exposure.`);
        }

        // ---- proof 4: schema -------------------------------------------------
        for (const [k, v] of raw.qEntries) {
            if (!Q_KEY_SHAPE.test(k)) {
                throw new Error(`UQ-A: Q key ${JSON.stringify(k)} does not match the committed ` +
                    `"pos#goal->action" shape (F6); the value namespace changed.`);
            }
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                throw new Error(`UQ-A: Q value for ${k} is ${v}, not a finite number.`);
            }
        }
        if (raw.qEntries.length !== raw.artifacts.qEntries) {
            throw new Error(`UQ-A: dumped ${raw.qEntries.length} Q entries but the run recorded ` +
                `${raw.artifacts.qEntries}; the table was read at the wrong moment.`);
        }
        if (raw.pPhase1.length !== FROZEN.physicalEdges || raw.pPhase2.length !== FROZEN.physicalEdges) {
            throw new Error(`UQ-A: reliability vectors have lengths ${raw.pPhase1.length}/` +
                `${raw.pPhase2.length}, expected ${FROZEN.physicalEdges}.`);
        }

        return {
            runIdentity: {
                configSeed: o.configSeed, configIndex: o.configIndex, goal: o.goal,
                uqaArm: o.uqaArm,
                agentSeed: FROZEN.agentSeed, arm: FROZEN.arm, ticks,
                exposure: FROZEN.exposure,
                preregistration: FROZEN.preregistration,
                preregistrationCommit: FROZEN.preregistrationCommit,
                fixture,
            },
            qEntries: raw.qEntries,
            environment: { goal: raw.goal, pPhase1: raw.pPhase1, pPhase2: raw.pPhase2,
                           unreliableSet: raw.unreliableSet },
            provenance: {
                fingerprint: raw.fingerprint,
                artifacts: raw.artifacts,
                envCounters: raw.envCounters,
                evaluatedSeeds: raw.evaluatedSeeds,
                used: raw.used,
                armAttestation: { arm: att.arm, deliveredDigest: att.deliveredDigest,
                                  receivedDigest: att.receivedDigest,
                                  expectedDelivered },
            },
        };
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

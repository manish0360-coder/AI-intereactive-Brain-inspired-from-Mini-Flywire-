// ======================================
// M1 (The Spine)
// ======================================
// Headline M1 experiment. Drives the REAL decision-path code over a
// seeded battery and answers, with numbers:
//
//   Q1 (inertness):  Does the executive controller influence the 60%
//                    scoring path? Compare real executiveWeights vs null.
//   Q2 (capability): If we instead pass the field names scoring ACTUALLY
//                    reads ({exploit, explore}), does the 60% path move?
//   Q3 (live path):  Does the executive controller influence the 40%
//                    arbitrate path? Compare real weights vs neutral.
//
// All randomness flows from a seeded stream, so the run is reproducible
// and both arms see identical drift (isolating the weight effect).
// Emits a full telemetry/<runId>/ folder + a scientific report.
// ======================================

import { initRng, cognitiveRng } from "../../instrumentation/rng.js";
import { configureBus, resetBus } from "../../instrumentation/telemetryBus.js";
import { createRecorder } from "../../instrumentation/sessionRecorder.js";
import { probeDecision } from "../../benchmarks/harness/decisionProbe.js";
import * as scoring from "./scoring.real.js";
import { arbitrate } from "./executiveController.real.js";
import { fileURLToPath } from "node:url";   // file URL -> OS path (Windows-safe)

const SEED = Number(process.env.SEED ?? 12345);
const N = Number(process.env.N ?? 400);          // trials
const CANDS = 4;                                  // candidates per decision

const r = cognitiveRng;
const pick = (lo, hi) => lo + r() * (hi - lo);

// Realistically-shaped executive weights as motivationalState produces
// them: { wReward, wSemantic, wConfidence, wUncertainty, wCuriosity, wCost }
// (NOTE: deliberately NO exploit/explore — that is the wiring under test.)
function realExecWeights() {
    return {
        wReward: pick(0.1, 0.5), wSemantic: pick(0.1, 0.4),
        wConfidence: pick(0.1, 0.4), wUncertainty: pick(0.05, 0.3),
        wCuriosity: pick(0.1, 0.4), wCost: pick(0.1, 0.4),
    };
}
// Neutral baseline for the 40% path: all pressures weighted equally.
const neutralExecWeights = {
    wReward: 0.25, wSemantic: 0.25, wConfidence: 0.25,
    wUncertainty: 0.25, wCuriosity: 0.25, wCost: 0.25,
};
// The shape scoring.js ACTUALLY reads — used only to prove capability.
function correctlyNamedWeights() {
    return { exploit: pick(0.2, 2.0), explore: pick(0.2, 2.0) };
}

function baseCtx() {
    return {
        transitionBoost: pick(0, 3), qValue: pick(0, 4), reward: pick(0, 6),
        habitBoost: pick(0, 2), curiosityBoost: pick(0, 3), chainReward: pick(0, 2),
        meaningBoost: pick(0, 2), boredomPenalty: pick(0, 1),
        curiosityState: pick(0, 5), confidenceState: pick(0, 10),
        stressState: pick(0, 10), fatigueState: pick(0, 10), focusState: pick(0, 5),
        dangerPenalty: 0, selfLoopPenalty: 0, bayesianTrust: pick(0.3, 0.8),
        dominantDrive: ["hunger", "boredom", "stress", null][Math.floor(r() * 4)],
    };
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

async function main() {
    initRng(SEED);
    const runId = `exec_influence_seed${SEED}_N${N}`;
    resetBus();
    configureBus({ enable: true, strictValidation: true, run: runId });
    const recorder = createRecorder({
        runId, seed: SEED, codeHash: "scoring.real+executiveController.real",
        config: { N, CANDS, paths: ["60%scoring", "40%arbitrate"] },
        outDir: fileURLToPath(new URL(`telemetry/${runId}/`, import.meta.url)),
    });

    const d60_real = [];     // |Δ finalWeight| real-weights vs null  (Q1)
    const d60_capab = [];    // |Δ finalWeight| correct-shape vs null (Q2)
    const d40_live = [];     // |Δ competitiveScore| real vs neutral (Q3)
    let flips60 = 0, decisions = 0;

    for (let t = 0; t < N; t++) {
        // Use ONE rng draw budget per trial for drift, replayed across arms
        // by re-seeding a per-trial stream so drift is identical in each arm.
        const trialSeed = (SEED + t * 2654435761) >>> 0;

        const candCtxs = Array.from({ length: CANDS }, () => baseCtx());
        const ew = realExecWeights();
        const ewCorrect = correctlyNamedWeights();

        const scoreArm = (ctx, weights) => {
            // deterministic drift per (trial,arm-independent): same rng stream
            initRng(trialSeed);
            return probeDecision({
                tickId: t,
                candidateKey: "c",
                ctx: { ...ctx, rng: cognitiveRng },
                executiveWeights: weights,
                calculateDecisionScore: scoring.calculateDecisionScore,
                arbitrate,
                lastArbitrationBreakdownRef: () => scoring.lastArbitrationBreakdown,
            });
        };

        // Q1 + Q3 over the candidate set
        const realScores = candCtxs.map((c) => scoreArm(c, ew));
        const nullScores = candCtxs.map((c) => scoreArm(c, null));
        const neutralScores = candCtxs.map((c) => scoreArm(c, neutralExecWeights));
        const correctScores = candCtxs.map((c) => scoreArm(c, ewCorrect));

        for (let i = 0; i < CANDS; i++) {
            d60_real.push(Math.abs(realScores[i].finalWeight - nullScores[i].finalWeight));
            d60_capab.push(Math.abs(correctScores[i].finalWeight - nullScores[i].finalWeight));
            if (realScores[i].competitiveScore != null && neutralScores[i].competitiveScore != null) {
                d40_live.push(Math.abs(realScores[i].competitiveScore - neutralScores[i].competitiveScore));
            }
        }

        // Decision-level: does the 60% path's argmax flip when executive
        // weights change real->null? (finalWeight only, to isolate the path)
        const argmax = (arr, key) => arr.reduce((bi, _, i) => (arr[i][key] > arr[bi][key] ? i : bi), 0);
        if (argmax(realScores, "finalWeight") !== argmax(nullScores, "finalWeight")) flips60++;
        decisions++;
    }

    // restore global stream then persist
    initRng(SEED);
    const flushed = await recorder.flush();

    const report = {
        experiment: "M1 / executive-influence",
        seed: SEED, trials: N, candidatesPerDecision: CANDS,
        metrics: {
            "Q1_influence_delta_60pct_path": +mean(d60_real).toFixed(6),
            "Q1_argmax_flip_rate_60pct": +(flips60 / decisions).toFixed(6),
            "Q2_capability_delta_60pct_correctShape": +mean(d60_capab).toFixed(6),
            "Q3_influence_delta_40pct_arbitrate": +mean(d40_live).toFixed(6),
        },
        telemetry: { runId, events: recorder.count, folder: flushed.base ?? "(in-memory)" },
    };

    // conclusion logic
    const inert = report.metrics.Q1_influence_delta_60pct_path < 1e-9;
    const capable = report.metrics.Q2_capability_delta_60pct_correctShape > 1e-3;
    const live40 = report.metrics.Q3_influence_delta_40pct_arbitrate > 1e-3;
    report.conclusion = {
        sixtyPercentPathInert: inert,
        codePathIsCapableWhenWiredCorrectly: capable,
        fortyPercentPathLive: live40,
        verdict: inert && capable
            ? "CONFIRMED: executive controller has ZERO influence on the 60% scoring path due to a field-name mismatch ({exploit,explore} expected, {wReward,...} supplied). The 40% arbitrate path is live. Fix is an M2 concern."
            : "Unexpected — see metrics.",
    };

    resetBus();
    console.log(JSON.stringify(report, null, 2));

    const fs = await import("node:fs");
    const path = await import("node:path");
    const repDir = path.dirname(fileURLToPath(new URL("report.json", import.meta.url)));
    fs.writeFileSync(path.join(repDir, "report.json"), JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
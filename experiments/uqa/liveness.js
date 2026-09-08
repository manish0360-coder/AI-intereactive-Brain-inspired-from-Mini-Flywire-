// ==========================================================
// UQ-A LIVENESS PRE-CHECK — pre-registered protocol component §14b
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQA_PREREGISTRATION.md, frozen at
//   63247bb546d62f15296edbdf3da34206bce3ef87, digest
//   03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//   Nothing here reinterprets it. The protocol was frozen and pushed BEFORE
//   this check was written, so no result can influence any design decision.
//
// WHAT THIS IS
//   The §14b liveness pre-check for the §5 E-BOTH exposure. It answers one
//   pre-registered question: does ablating uncertainty ever change WHICH
//   candidate wins? Only the winner is executed, so a pathway that never flips
//   the winner cannot change the trajectory or the learned representation.
//
// WHAT THIS IS NOT
//   It is NOT the UQ-A collection. It consumes NO configuration seed, runs no
//   agent, writes no Q table, and produces no UQ-A primary outcome. Its numbers
//   are never reported as UQ-A results and may not modify the frozen protocol.
//
// METHOD — inherited from experiments/exec_influence/run.js (M1), not invented
//   Seeded battery over the REAL decision functions. Battery parameters are
//   frozen by §14b: seed 12345, N = 400 trials, 4 candidates per decision.
//   Each arm is scored under an identical per-trial RNG stream, so the
//   cognitive drift at scoring.js:211 is the same in both arms and the ONLY
//   difference is uncertaintyScore.
//
//   DIVERGENCE FROM M1, deliberate and recorded: M1 imported its own frozen
//   copies scoring.real.js / executiveController.real.js. executiveController.
//   real.js is byte-identical to render/executiveController.js, but
//   scoring.real.js DIFFERS from render/scoring.js by 872 lines — it predates
//   the M7 trust rectification. §14b requires "the real calculateDecisionScore
//   and arbitrate", and UQ-A asks about the CURRENT architecture, so this check
//   imports the LIVE render/ modules. Using M1's stale copy would test June's
//   scoring rather than the subject of the frozen protocol.
//
// EXPOSURE — §5 E-BOTH, verbatim
//   ARMED   : uncertaintyScore reaches BOTH read sites unchanged
//   ABLATED : uncertaintyScore delivered as exactly 0 at BOTH read sites
//             (scoring.js:151 via ctx, executiveController.js:145 via arbitrate)
//
// CRITERION — §14b, threshold-free
//   LIVE  iff argmax flip rate  > 0
//   INERT iff argmax flip rate == 0
//   Influence delta is a MANDATORY DIAGNOSTIC, never the criterion.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initRng, cognitiveRng } from '../../instrumentation/rng.js';
import { probeDecision } from '../../benchmarks/harness/decisionProbe.js';
import * as scoring from '../../render/scoring.js';
import { arbitrate } from '../../render/executiveController.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

// ---- frozen battery parameters (§14b) -----------------------------------
const SEED  = 12345;
const N     = 400;
const CANDS = 4;

const PREREG = 'research/preregistrations/UQA_PREREGISTRATION.md';
const PREREG_DIGEST = '03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4';

const sha  = (b) => crypto.createHash('sha256').update(b).digest('hex');
const log  = (m) => process.stderr.write(m + '\n');
const die  = (m) => { log('STOP: ' + m); process.exit(1); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

// ---- the frozen protocol must be intact before anything runs ------------
{
    const got = sha(fs.readFileSync(path.join(ROOT, PREREG)));
    if (got !== PREREG_DIGEST) {
        die(`the frozen UQ-A pre-registration digest does not match: ${got} != ${PREREG_DIGEST}. ` +
            `The protocol changed after freeze. That is a PROTOCOL DEVIATION and this check ` +
            `refuses to run against an altered protocol.`);
    }
}
log('UQ-A LIVENESS PRE-CHECK  §14b');
log(`  protocol digest verified: ${PREREG_DIGEST.slice(0, 16)}`);
log(`  battery: seed ${SEED}, N ${N}, ${CANDS} candidates/decision  (frozen)`);
log('  exposure: E-BOTH  |  ablated value: exactly 0 at both sites');

const r    = cognitiveRng;
const pick = (lo, hi) => lo + r() * (hi - lo);

// Candidate context shape inherited from M1's baseCtx(), with uncertaintyScore
// added because it is UQ-A's exposure. Its range is the one scoring.js
// documents for the parameter: "Range [0..1]".
function baseCtx() {
    return {
        transitionBoost: pick(0, 3), qValue: pick(0, 4), reward: pick(0, 6),
        habitBoost: pick(0, 2), curiosityBoost: pick(0, 3), chainReward: pick(0, 2),
        meaningBoost: pick(0, 2), boredomPenalty: pick(0, 1),
        curiosityState: pick(0, 5), confidenceState: pick(0, 10),
        stressState: pick(0, 10), fatigueState: pick(0, 10), focusState: pick(0, 5),
        dangerPenalty: 0, selfLoopPenalty: 0, bayesianTrust: pick(0.3, 0.8),
        dominantDrive: ['hunger', 'boredom', 'stress', null][Math.floor(r() * 4)],
        uncertaintyScore: pick(0, 1),
    };
}

// Executive weights are NOT the exposure: drawn once per trial and held
// identical across both arms, in M1's realistic shape.
function execWeights() {
    return {
        wReward: pick(0.1, 0.5), wSemantic: pick(0.1, 0.4),
        wConfidence: pick(0.1, 0.4), wUncertainty: pick(0.05, 0.3),
        wCuriosity: pick(0.1, 0.4), wCost: pick(0.1, 0.4),
    };
}

// ---- battery -------------------------------------------------------------
const deltas = [];
let flips = 0, decisions = 0, competitiveNull = 0;

initRng(SEED);
for (let t = 0; t < N; t++) {
    // M1's construction: one per-trial stream replayed identically in each arm,
    // so scoring.js:211's cognitive drift is common to both and cancels.
    const trialSeed = (SEED + t * 2654435761) >>> 0;
    const candCtxs  = Array.from({ length: CANDS }, () => baseCtx());
    const ew        = execWeights();

    // `u` is the exposure: the armed value, or exactly 0 when ablated. It is
    // delivered to BOTH sites — ctx.uncertaintyScore reaches scoring.js:151,
    // uncertaintyScoreValue reaches executiveController.js:145 via arbitrate.
    const scoreArm = (ctx, u) => {
        initRng(trialSeed);
        return probeDecision({
            tickId: t,
            candidateKey: 'c',
            ctx: { ...ctx, uncertaintyScore: u, rng: cognitiveRng },
            executiveWeights: ew,
            calculateDecisionScore: scoring.calculateDecisionScore,
            arbitrate,
            lastArbitrationBreakdownRef: () => scoring.lastArbitrationBreakdown,
            uncertaintyScoreValue: u,
        });
    };

    const armed   = candCtxs.map(c => scoreArm(c, c.uncertaintyScore));
    const ablated = candCtxs.map(c => scoreArm(c, 0));

    for (let i = 0; i < CANDS; i++) {
        if (armed[i].competitiveScore == null || ablated[i].competitiveScore == null) competitiveNull++;
        deltas.push(Math.abs(armed[i].blended - ablated[i].blended));
    }

    // §14b: the criterion is computed on the blended arbitratedScore, which is
    // main.js:2253's 60/40 combination — the quantity that selects the winner.
    const argmax = (a) => a.reduce((bi, _, i) => (a[i].blended > a[bi].blended ? i : bi), 0);
    if (argmax(armed) !== argmax(ablated)) flips++;
    decisions++;
}
initRng(SEED);

// ---- verdict -------------------------------------------------------------
const flipRate      = +(flips / decisions).toFixed(6);
const influenceDelta = +mean(deltas).toFixed(6);

// §14b, threshold-free: LIVE iff the flip rate is strictly greater than zero.
const live = flipRate > 0;
const cosmetic = influenceDelta > 0 && flipRate === 0;

const report = {
    check: 'UQ-A / §14b liveness pre-check',
    preregistration: { path: PREREG, digest: PREREG_DIGEST, commit: '63247bb546d62f15296edbdf3da34206bce3ef87' },
    exposure: 'E-BOTH',
    ablation: 'uncertaintyScore delivered as exactly 0 at both frozen read sites',
    battery: { seed: SEED, trials: N, candidatesPerDecision: CANDS, decisions,
               method: 'inherited from experiments/exec_influence/run.js (M1)',
               modules: 'LIVE render/scoring.js + render/executiveController.js' },
    criterion: 'LIVE iff argmax flip rate > 0; INERT iff argmax flip rate == 0',
    metrics: {
        argmax_flip_rate: flipRate,
        argmax_flips: flips,
        influence_delta_blended: influenceDelta,
        competitive_score_null_count: competitiveNull,
    },
    diagnosticNote: 'influence_delta_blended is a MANDATORY DIAGNOSTIC and is never the criterion.',
    cosmeticCase: cosmetic,
    cosmeticNote: cosmetic
        ? 'PRE-REGISTERED COSMETIC CASE: influence delta > 0 with a zero flip rate. Classified INERT, '
          + 'because the frozen §14b criterion is the argmax flip rate. This is the H2 signature.'
        : null,
    verdict: live ? 'LIVE' : 'INERT',
    consequence: live
        ? 'UQ-A is operationally live. The main collection is authorised as a SEPARATE milestone; '
          + 'it is NOT run here.'
        : 'UQ-A closes under the frozen §14c inertness rule: the main collection must NOT be run, '
          + 'the exposure must not be changed, the implementation must not be repaired and re-run, '
          + 'and no new configuration may be generated.',
    seedsConsumed: { uqaConfigurationSeeds: 0,
                     note: 'This check runs no agent and consumes no configuration seed. '
                         + 'The battery seed 12345 is inherited from M1 and is not a configuration seed.' },
};

fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
const json = JSON.stringify(report, null, 2) + '\n';
fs.writeFileSync(path.join(HERE, 'results', 'uqa_liveness.json'), json);
fs.writeFileSync(path.join(HERE, 'results', 'INTEGRITY.sha256'),
`# UQ-A LIVENESS PRE-CHECK — INTEGRITY RECORD
#
# Artifact  : experiments/uqa/results/uqa_liveness.json
# Protocol  : ${PREREG} ${PREREG_DIGEST}
# Component : frozen §14b liveness pre-check (pre-registered)
# Verdict   : ${report.verdict}
#
# This is NOT a UQ-A result. No configuration seed was consumed and no
# collection was run.
#
# Regenerate with : cd experiments/uqa && node liveness.js
#
${sha(json)}  uqa_liveness.json
`);

log('');
log(`  argmax flips        ${flips} / ${decisions}`);
log(`  argmax flip rate    ${flipRate}`);
log(`  influence delta     ${influenceDelta}   (diagnostic only)`);
if (cosmetic) log('  COSMETIC CASE: delta > 0 with zero flips — classified INERT per §14b');
log('');
log(`  VERDICT: ${report.verdict}`);
log(`  UQ-A configuration seeds consumed: 0`);

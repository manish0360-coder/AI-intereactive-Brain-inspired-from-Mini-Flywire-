// ==========================================================
// UQ-B LIVENESS PRE-CHECK — pre-registered protocol component §14a
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQB_PREREGISTRATION.md, frozen at
//   3b3d195b5b29ea0ada16872b3e1ea08e54d37f20, digest
//   bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e.
//   Nothing here reinterprets it. The protocol was frozen and pushed BEFORE
//   this check was written, so no result can influence any design decision.
//
// WHAT THIS IS
//   The §14a liveness pre-check for the §5.1 exposure. It answers one
//   pre-registered question: does ablating `futureBonus` to exactly 0 ever
//   change WHICH candidate wins? Only the winning candidate is executed, so a
//   term that never changes the winner cannot change the trajectory, the
//   learned representation, or any §8 readout.
//
// WHAT THIS IS NOT
//   It is NOT the UQ-B collection. It consumes NO configuration seed from
//   897000-897999, runs no agent, takes no readout, performs no permutation,
//   and produces no UQ-B primary outcome. Its numbers are never reported as
//   UQ-B results and may not modify the frozen protocol.
//
// METHOD — inherited, not invented
//   The frozen §14a names `benchmarks/harness/decisionProbe.js` over the real
//   `calculateDecisionScore` and `arbitrate`, with an identical per-trial RNG
//   stream in both arms. It does not restate the battery parameters, so they
//   are INHERITED EXACTLY from M1 (`experiments/exec_influence/run.js`) — seed
//   12345, N = 400 trials, 4 candidates per decision — which is what UQ-A's
//   §14b check also used. Inheriting makes this figure directly comparable with
//   both committed predecessors; inventing a battery would make it comparable
//   with neither.
//
//   Live `render/` modules are imported, not M1's frozen copies:
//   `scoring.real.js` differs from `render/scoring.js` by 872 lines and
//   predates the M7 trust rectification. UQ-B asks about the CURRENT
//   architecture, and §14a names the real functions.
//
// THE EXPOSURE IS DUAL-PATH FOR FREE, AND THAT IS THE POINT
//   `futureBonus` is a field of the ctx that `calculateDecisionScore` consumes
//   (`scoring.js:84`), and it enters `breakdown.semanticScore` at
//   `scoring.js:406`. `probeDecision` reads that breakdown and feeds it to
//   `arbitrate`. So setting ctx.futureBonus to 0 reaches BOTH the 60% learned
//   path and the 40% arbitration path through one assignment — exactly the
//   frozen §5.1 exposure and the G5 fact, with no extra plumbing.
//
//   `uncertaintyScoreValue` is held FIXED across arms. It is UQ-A's exposure,
//   not this one, and it is not permitted to vary here.
//
// CRITERION — §14a, threshold-free
//   LIVE  iff argmax flip rate  > 0
//   INERT iff argmax flip rate == 0
//   Influence delta is a MANDATORY DIAGNOSTIC, never the criterion. A non-zero
//   delta with a zero flip rate is the cosmetic signature and is INERT.
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

// ---- frozen battery parameters, inherited from M1 -------------------------
const SEED  = 12345;
const N     = 400;
const CANDS = 4;

// §5.1: the ablated value is exactly 0. main.js:1861 caps the armed value at 20
// (`Math.min(imaginedFuture * 4, 20)`), so [0, 20] is the committed range of the
// quantity — read from source, not chosen.
const ABLATED_VALUE = 0;
const FUTURE_CAP    = 20;

const PREREG = 'research/preregistrations/UQB_PREREGISTRATION.md';
const PREREG_DIGEST = 'bc655022b63e8022ed6427001da6a90eb2f9ec139cf413ab367e9bc7269ba46e';
const PREREG_COMMIT = '3b3d195b5b29ea0ada16872b3e1ea08e54d37f20';

const sha  = (b) => crypto.createHash('sha256').update(b).digest('hex');
const log  = (m) => process.stderr.write(m + '\n');
const die  = (m) => { log('STOP: ' + m); process.exit(1); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

// ---- the frozen protocol must be intact before anything runs --------------
{
    const got = sha(fs.readFileSync(path.join(ROOT, PREREG)));
    if (got !== PREREG_DIGEST) {
        die(`the frozen UQ-B pre-registration digest does not match: ${got} != ${PREREG_DIGEST}. ` +
            `The protocol changed after freeze. That is a PROTOCOL DEVIATION and this check ` +
            `refuses to run against an altered protocol.`);
    }
}
log('UQ-B LIVENESS PRE-CHECK  §14a');
log(`  protocol digest verified: ${PREREG_DIGEST.slice(0, 16)}  @ ${PREREG_COMMIT.slice(0, 7)}`);
log(`  battery: seed ${SEED}, N ${N}, ${CANDS} candidates/decision  (inherited from M1)`);
log(`  exposure: futureBonus armed vs exactly ${ABLATED_VALUE}  |  dual-path via ctx + breakdown`);

const r    = cognitiveRng;
const pick = (lo, hi) => lo + r() * (hi - lo);

// Candidate context shape inherited from M1's baseCtx(), with `futureBonus`
// added because it is UQ-B's exposure. Its range is the committed cap at
// main.js:1861.
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
        futureBonus: pick(0, FUTURE_CAP),
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

/**
 * One battery. `fA` and `fB` map a candidate ctx to that arm's futureBonus, so
 * the same harness expresses the frozen comparison and both controls.
 */
function battery(fA, fB) {
    const deltas = [];
    let flips = 0, decisions = 0, competitiveNull = 0;

    initRng(SEED);
    for (let t = 0; t < N; t++) {
        // M1's construction: one per-trial stream replayed identically for each
        // candidate in each arm, so the cognitive drift at scoring.js:211 is
        // common to both and cancels. The ONLY difference is futureBonus.
        const trialSeed = (SEED + t * 2654435761) >>> 0;
        const candCtxs  = Array.from({ length: CANDS }, () => baseCtx());
        const ew        = execWeights();

        const scoreArm = (ctx, f) => {
            initRng(trialSeed);
            return probeDecision({
                tickId: t,
                candidateKey: 'c',
                ctx: { ...ctx, futureBonus: f, rng: cognitiveRng },
                executiveWeights: ew,
                calculateDecisionScore: scoring.calculateDecisionScore,
                arbitrate,
                lastArbitrationBreakdownRef: () => scoring.lastArbitrationBreakdown,
                // UQ-A's exposure, held FIXED across arms. Not varied here.
                uncertaintyScoreValue: ctx.uncertaintyScore,
            });
        };

        const A = candCtxs.map((c, i) => scoreArm(c, fA(c, i)));
        const B = candCtxs.map((c, i) => scoreArm(c, fB(c, i)));

        for (let i = 0; i < CANDS; i++) {
            if (A[i].competitiveScore == null || B[i].competitiveScore == null) competitiveNull++;
            deltas.push(Math.abs(A[i].blended - B[i].blended));
        }

        // §14a: the criterion is computed on the blended arbitratedScore, which
        // is main.js:2253's 60/40 combination — the quantity that selects the
        // winner, and the same quantity G14 shows `bestChoice` maximises.
        const argmax = (a) => a.reduce((bi, _, i) => (a[i].blended > a[bi].blended ? i : bi), 0);
        if (argmax(A) !== argmax(B)) flips++;
        decisions++;
    }
    initRng(SEED);

    return {
        flips, decisions,
        flipRate: +(flips / decisions).toFixed(6),
        influenceDelta: +mean(deltas).toFixed(6),
        competitiveNull,
    };
}

// ---- the frozen comparison ------------------------------------------------
const frozen = battery(c => c.futureBonus, () => ABLATED_VALUE);

// ---- controls -------------------------------------------------------------
// NULL: armed against armed. Must be exactly 0 flips and exactly 0 delta, or
// the harness is measuring something other than the exposure.
const nullCtl = battery(c => c.futureBonus, c => c.futureBonus);

// POSITIVE: the knob must be connected, so that a zero frozen flip rate would
// mean the TERM is inert and not that the measurement is broken. This is the
// anti-vacuity control.
//
// IT MUST BE DIFFERENTIAL ACROSS CANDIDATES, and the first construction of this
// control was not. Giving EVERY candidate the same futureBonus shifts every
// score by the same amount and therefore cannot move an argmax: it returned 0
// flips with a delta of 14.52, which was correct behaviour and a wrong control.
// Recorded rather than quietly replaced. The corrected control gives the
// committed cap to one candidate and the ablated value to the rest, which is the
// assignment a maximally influential term would produce.
const posCtl = battery((c, i) => (i === 0 ? FUTURE_CAP : ABLATED_VALUE), () => ABLATED_VALUE);

// DETERMINISM: the frozen comparison must reproduce exactly.
const frozen2 = battery(c => c.futureBonus, () => ABLATED_VALUE);
const deterministic = JSON.stringify(frozen) === JSON.stringify(frozen2);

// ---- verdict --------------------------------------------------------------
const live = frozen.flipRate > 0;                                  // §14a, threshold-free
const cosmetic = frozen.influenceDelta > 0 && frozen.flipRate === 0;

// The positive control's criterion is FLIPS, not delta magnitude. Its second
// construction compared mean deltas across the two batteries, which is not a
// meaningful comparison: this control perturbs 1 of 4 candidates by design, so
// three of its four per-candidate deltas are exactly 0 and the mean is diluted
// by construction. Recorded rather than quietly replaced. The connectedness of
// the knob is established by the same quantity the frozen criterion uses.
const controlsPass =
    nullCtl.flips === 0 && nullCtl.influenceDelta === 0 &&
    posCtl.flips > 0 &&
    deterministic && frozen.competitiveNull === 0;

const report = {
    check: 'UQ-B / §14a liveness pre-check',
    preregistration: { path: PREREG, digest: PREREG_DIGEST, commit: PREREG_COMMIT, version: '1.0' },
    exposure: {
        term: 'futureBonus',
        anchor: 'main.js:1860-1861',
        ablatedValue: ABLATED_VALUE,
        paths: 'dual — 60% learned score (scoring.js:350) and 40% arbitration '
             + '(scoring.js:406 semanticScore -> arbitrate), reached from one assignment',
        note: 'uncertaintyScoreValue is held fixed across arms; it is UQ-A\'s exposure, not this one.',
    },
    battery: {
        seed: SEED, trials: N, candidatesPerDecision: CANDS, decisions: frozen.decisions,
        method: 'inherited exactly from experiments/exec_influence/run.js (M1); §14a does not '
              + 'restate battery parameters, so they are inherited rather than invented',
        modules: 'LIVE render/scoring.js + render/executiveController.js',
        armedRange: `[0, ${FUTURE_CAP}] — the committed cap at main.js:1861`,
    },
    criterion: 'LIVE iff argmax flip rate > 0; INERT iff argmax flip rate == 0',
    metrics: {
        argmax_flip_rate: frozen.flipRate,
        argmax_flips: frozen.flips,
        decisions: frozen.decisions,
        influence_delta_blended: frozen.influenceDelta,
        competitive_score_null_count: frozen.competitiveNull,
    },
    diagnosticNote: 'influence_delta_blended is a MANDATORY DIAGNOSTIC and is never the criterion.',
    controls: {
        nullControl: { description: 'armed vs armed — must be exactly 0 flips and 0 delta',
                       ...nullCtl,
                       pass: nullCtl.flips === 0 && nullCtl.influenceDelta === 0 },
        positiveControl: { description: `futureBonus ${FUTURE_CAP} on ONE candidate and `
                                      + `${ABLATED_VALUE} on the rest, vs all-${ABLATED_VALUE} — `
                                      + 'the knob must be connected; anti-vacuity control. It must '
                                      + 'be DIFFERENTIAL: a constant across candidates shifts every '
                                      + 'score equally and cannot move an argmax',
                           ...posCtl,
                           criterion: 'flips > 0. Delta magnitude is NOT compared across batteries: '
                                    + 'this control perturbs 1 of 4 candidates by design, so three '
                                    + 'of its per-candidate deltas are exactly 0 and its mean is '
                                    + 'diluted by construction.',
                           pass: posCtl.flips > 0 },
        determinism: { description: 'the frozen comparison re-run must reproduce exactly',
                       reproduced: deterministic, second: frozen2 },
        arbitrationReached: { description: 'every probe reached the 40% arbitrate path',
                              nullCount: frozen.competitiveNull,
                              pass: frozen.competitiveNull === 0 },
        allPass: controlsPass,
    },
    controlConstructionCorrections: [
        'The positive control was first written as a CONSTANT futureBonus across all candidates '
        + '(cap in one arm, 0 in the other). That returned 0 flips with a delta of 14.521809 — '
        + 'correct behaviour and a wrong control, because a constant shifts every candidate score '
        + 'equally and therefore cannot move an argmax. Corrected to a differential assignment.',
        'Its pass condition then compared mean influence delta against the frozen battery. That is '
        + 'not a meaningful comparison: the control perturbs 1 of 4 candidates by design, so three '
        + 'of its four per-candidate deltas are exactly 0 and its mean is diluted by construction. '
        + 'The criterion is flips > 0 — the same quantity the frozen criterion uses.',
        'Neither correction touched the frozen §14a criterion, the exposure, the battery '
        + 'parameters, or the frozen comparison, whose result was identical (171/400) in every run.',
    ],
    cosmeticCase: cosmetic,
    cosmeticNote: cosmetic
        ? 'PRE-REGISTERED COSMETIC CASE: influence delta > 0 with a zero flip rate. Classified '
          + 'INERT, because the frozen §14a criterion is the argmax flip rate.'
        : null,
    verdict: live ? 'LIVE' : 'INERT',
    consequence: live
        ? 'UQ-B is operationally live. The main collection is authorised as a SEPARATE milestone; '
          + 'it is NOT run here.'
        : 'UQ-B closes under the frozen §14c inertness rule: the main collection must NOT be run, '
          + 'the exposure must not be changed, the implementation must not be repaired and re-run, '
          + 'and no new configuration, range or battery may be generated.',
    seedsConsumed: {
        uqbConfigurationSeeds: 0,
        frozenBlock: '897000-897999',
        note: 'This check runs no agent and consumes no configuration seed. The battery seed 12345 '
            + 'is inherited from M1 and is not a configuration seed. No seed in 897000-897999 was '
            + 'generated, evaluated or inspected.',
    },
};

fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
const json = JSON.stringify(report, null, 2) + '\n';
fs.writeFileSync(path.join(HERE, 'results', 'uqb_liveness.json'), json);
fs.writeFileSync(path.join(HERE, 'results', 'INTEGRITY.sha256'),
`# UQ-B LIVENESS PRE-CHECK — INTEGRITY RECORD
#
# Artifact  : experiments/uqb/results/uqb_liveness.json
# Protocol  : ${PREREG} ${PREREG_DIGEST}
# Freeze    : ${PREREG_COMMIT} (v1.0)
# Component : frozen §14a liveness pre-check (pre-registered)
# Verdict   : ${report.verdict}
# Controls  : ${controlsPass ? 'ALL PASS' : 'FAILED'}
#
# This is NOT a UQ-B result. No configuration seed from 897000-897999 was
# consumed, and no collection was run.
#
# Regenerate with : cd experiments/uqb && node liveness.js
#
${sha(json)}  uqb_liveness.json
`);

log('');
log(`  argmax flips        ${frozen.flips} / ${frozen.decisions}`);
log(`  argmax flip rate    ${frozen.flipRate}`);
log(`  influence delta     ${frozen.influenceDelta}   (diagnostic only)`);
log('');
log(`  NULL control        ${nullCtl.flips} flips, delta ${nullCtl.influenceDelta}  ` +
    `${nullCtl.flips === 0 && nullCtl.influenceDelta === 0 ? 'PASS' : 'FAIL'}`);
log(`  POSITIVE control    ${posCtl.flips} flips, delta ${posCtl.influenceDelta}  ` +
    `${posCtl.flips > 0 ? 'PASS' : 'FAIL'}`);
log(`  determinism         ${deterministic ? 'PASS' : 'FAIL'}`);
log(`  arbitrate reached   ${frozen.competitiveNull === 0 ? 'PASS' : 'FAIL'} ` +
    `(${frozen.competitiveNull} null)`);
if (cosmetic) log('  COSMETIC CASE: delta > 0 with zero flips — classified INERT per §14a');
log('');
log(`  VERDICT: ${report.verdict}`);
log(`  controls: ${controlsPass ? 'ALL PASS' : 'FAILED'}`);
log(`  UQ-B configuration seeds consumed: 0`);
if (!controlsPass) process.exit(1);

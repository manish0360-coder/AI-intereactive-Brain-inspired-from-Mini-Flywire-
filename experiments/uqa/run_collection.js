// ==========================================================
// UQ-A COLLECTION DRIVER — executes the frozen candidate range, both arms
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQA_PREREGISTRATION.md, frozen at
//   63247bb546d62f15296edbdf3da34206bce3ef87, digest
//   03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//   Liveness pre-check (§14b): LIVE, committed at 5d04469.
//
// WHAT THIS DOES
//   Enumerates every candidate in the frozen §17 range 898000-898999 x the four
//   frozen goal indices, evaluates each DIRECTLY at its own seed with the
//   committed acceptance predicate, and runs every accepted configuration under
//   BOTH §5 arms, then computes the §6 primary outcome, the §12 co-primary
//   coverage diagnostic and the §9 exclusion counts from the raw evidence.
//
// THE DESIGN IS PAIRED (§14, §18)
//   Both arms see exactly the same accepted configurations by construction: the
//   acceptance predicate is evaluated once, before either arm runs, and depends
//   only on the configuration seed. A configuration enters the result only if
//   BOTH of its arms completed; a half-collected pair is a FAILED pair, never a
//   one-armed row. §20 requires the study to halt and report rather than repair,
//   so an unpaired configuration is recorded and excluded from the paired table
//   rather than silently patched.
//
// NO ADAPTIVE BEHAVIOUR (§19)
//   The range is not extended. Rejected candidates are not replaced. No seed is
//   retried, substituted, or generated outside the frozen bounds. Collection
//   does not stop early when the §18 minimum is reached: §19 requires the
//   COMPLETE registered range to be processed, and the minimum is a reporting
//   threshold, not a target. No emerging result is inspected to alter execution.
//
// ACCOUNTING CLOSURE
//   Every one of the 4000 candidates ends in exactly one terminal state:
//   REJECTED, COLLECTED, or FAILED with an explicit recorded reason. Nothing is
//   skipped and a crash is recorded rather than swallowed.
//
// WHAT IS COMPUTED, AND WHAT IS DELIBERATELY NOT (§11, §21)
//   Computed: per configuration, per arm — rho(Q_final, pPhase1),
//   rho(Q_final, pPhase2), coverage, non-edge exclusions; per configuration, the
//   paired rho difference, which §11 and §13 license explicitly ("by how much,
//   descriptively"); and counts of the direction of that difference.
//
//   NOT computed, and not addable now that data exists: p-values, confidence
//   intervals, hypothesis tests, significance claims, effect sizes and models
//   (§11). Cross-configuration averages of the paired difference are ALSO not
//   computed: §11 enumerates the descriptive quantities as the rho values,
//   coverage counts and exclusion counts, and licenses the difference per
//   comparison — it does not license an aggregate estimate, which would read as
//   an effect size. Aggregation may enter only through a numbered erratum.
//
//   The phases are reported separately and NEVER pooled (§10). Coverage is
//   reported alongside every rho and is NEVER used as an adjustment (§12).
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { FROZEN, CONSUMED_RANGES, HELD_OUT_FLOOR, assertSeedAllowed, inFrozenRange,
         isConsumed, isHeldOut, enumerateCandidates, evaluateSufficiency } from './protocol.js';
import { collectOne } from './collect.js';
import { assertSpearmanFidelity, buildPopulation, analyzeArm } from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DATA = path.join(HERE, 'data');
const RESULTS = path.join(HERE, 'results');
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(RESULTS, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const log = (m) => process.stderr.write(m + '\n');

// §18 disclosure only. The goal degrees are DERIVED from the frozen topology
// rather than transcribed, and the derivation is asserted against the frozen
// text ("degree 5 = goals 8, 12; degree 3 = goals 16, 19"). They are reported;
// they are never used to include, exclude, weight or stratify anything.
const GOAL_DEGREE = (() => {
    const edges = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
    const deg = {};
    for (const e of edges) {
        for (const n of [Number(e.from), Number(e.to)]) deg[n] = (deg[n] || 0) + 1;
    }
    const out = {};
    for (const g of env.GOALS) out[g] = deg[g];
    const stated = { 8: 5, 12: 5, 16: 3, 19: 3 };
    for (const g of Object.keys(stated)) {
        if (out[g] !== stated[g]) {
            throw new Error(`UQ-A: goal ${g} has traversal degree ${out[g]}; the frozen §18 ` +
                `disclosure states ${stated[g]}. The topology is not the one the protocol describes.`);
        }
    }
    return out;
})();

const PREREG = 'research/preregistrations/UQA_PREREGISTRATION.md';
const F_Q = path.join(DATA, 'qtables.jsonl');
if (fs.existsSync(F_Q)) fs.rmSync(F_Q);

// ---- 0. the frozen protocol and the designated statistic must be intact ----
{
    const got = sha(fs.readFileSync(path.join(ROOT, PREREG)));
    if (got !== FROZEN.preregistration) {
        log(`STOP: the frozen UQ-A pre-registration digest does not match: ${got} != ` +
            `${FROZEN.preregistration}. The protocol changed after freeze; this is a PROTOCOL ` +
            `DEVIATION and collection refuses to run against an altered protocol.`);
        process.exit(1);
    }
}
assertSpearmanFidelity();
const population = buildPopulation();   // §7 — fixed a priori, identical for both arms

log(`UQ-A MAIN COLLECTION — frozen range ${FROZEN.seedLo}-${FROZEN.seedHi}`);
log(`  protocol ${FROZEN.preregistration.slice(0, 16)} @ ${FROZEN.preregistrationCommit.slice(0, 7)}`);
log(`  liveness LIVE @ ${FROZEN.livenessCommit.slice(0, 7)} | exposure ${FROZEN.exposure}`);
log(`  agent seed ${FROZEN.agentSeed} | M7 arm ${FROZEN.arm} | ${FROZEN.ticks} ticks`);
log(`  population ${population.length} directed adjacencies | arms ${FROZEN.arms.join(' + ')}`);

// ---- 1. enumerate every candidate at its own seed --------------------------
const enumeration = enumerateCandidates(env);
log(`  candidates ${enumeration.candidates} | accepted ${enumeration.accepted.length} | ` +
    `rejected ${enumeration.rejected.length}`);

const acceptedAt = new Map(enumeration.accepted.map(a => [`${a.configSeed}:${a.configIndex}`, a]));
const rejectedAt = new Map(enumeration.rejected.map(r => [`${r.configSeed}:${r.configIndex}`, r]));
const candidates = [];
for (let seed = FROZEN.seedLo; seed <= FROZEN.seedHi; seed++) {
    for (const idx of FROZEN.goalIndices) {
        const key = `${seed}:${idx}`;
        const acc = acceptedAt.get(key), rej = rejectedAt.get(key);
        candidates.push({
            configSeed: seed, configIndex: idx, goal: (acc || rej).goal,
            accepted: !!acc,
            disposition: acc ? 'PENDING' : 'REJECTED',
            reason: acc ? null : `acceptance predicate failed: ${rej.failed.join(',')}`,
        });
    }
}

// ---- 2. run every accepted configuration under BOTH arms -------------------
// The COMPLETE range is processed. There is no early exit and no extension.
const paired = [];
const total = candidates.filter(c => c.accepted).length;
let done = 0;
for (const c of candidates) {
    if (!c.accepted) continue;
    assertSeedAllowed(c.configSeed);
    done++;
    const armResults = {};
    try {
        for (const uqaArm of FROZEN.arms) {
            const r = collectOne({ configSeed: c.configSeed, configIndex: c.configIndex,
                                   goal: c.goal, uqaArm });
            if (r.provenance.evaluatedSeeds.length !== 1
                || r.provenance.evaluatedSeeds[0] !== c.configSeed) {
                throw new Error(`${uqaArm} run evaluated [${r.provenance.evaluatedSeeds}], ` +
                    `expected [${c.configSeed}]`);
            }
            armResults[uqaArm] = r;
        }

        // The two arms must have run against the SAME environment. This is what
        // makes the pair a pair; a mismatch would mean the configuration itself
        // differed between arms and the comparison would be meaningless.
        const [A, B] = FROZEN.arms.map(a => armResults[a]);
        const envA = JSON.stringify(A.environment), envB = JSON.stringify(B.environment);
        if (envA !== envB) {
            throw new Error('the two arms ran against different environment vectors; the pair is ' +
                'not paired');
        }
        // Raw evidence, written verbatim before any reduction.
        for (const uqaArm of FROZEN.arms) {
            const r = armResults[uqaArm];
            fs.appendFileSync(F_Q, JSON.stringify({ ...r.runIdentity, qEntries: r.qEntries }) + '\n');
        }

        const analysis = {};
        for (const uqaArm of FROZEN.arms) {
            const r = armResults[uqaArm];
            const a = analyzeArm({ population, qEntries: r.qEntries, goal: r.environment.goal,
                                   pPhase1: r.environment.pPhase1, pPhase2: r.environment.pPhase2 });
            // `rows` is the per-entry audit trail; it stays in the raw layer.
            const { rows, ...summary } = a;
            analysis[uqaArm] = summary;
        }

        c.disposition = 'COLLECTED';
        paired.push({
            configSeed: c.configSeed, configIndex: c.configIndex, goal: c.goal,
            // §18 disclosure, never a threshold and never a filter.
            goalDegree: GOAL_DEGREE[c.goal],
            arms: analysis,
            // §11/§13: the paired difference per comparison. Not an effect size,
            // not aggregated across configurations.
            deltaRhoPhase1: analysis.ARMED.rhoPhase1 - analysis.ABLATED.rhoPhase1,
            deltaRhoPhase2: analysis.ARMED.rhoPhase2 - analysis.ABLATED.rhoPhase2,
            deltaCoverage: analysis.ARMED.coverage - analysis.ABLATED.coverage,
            provenance: Object.fromEntries(FROZEN.arms.map(a => [a, {
                fingerprint: armResults[a].provenance.fingerprint,
                artifacts: armResults[a].provenance.artifacts,
                envCounters: armResults[a].provenance.envCounters,
                armAttestation: armResults[a].provenance.armAttestation,
                used: armResults[a].provenance.used,
            }])),
        });
        log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} goal ${c.goal}` +
            `  rho1 ${fmt(analysis.ARMED.rhoPhase1)}/${fmt(analysis.ABLATED.rhoPhase1)}` +
            `  rho2 ${fmt(analysis.ARMED.rhoPhase2)}/${fmt(analysis.ABLATED.rhoPhase2)}` +
            `  cov ${analysis.ARMED.coverage}/${analysis.ABLATED.coverage}`);
    } catch (e) {
        // Recorded, never swallowed and never silently repaired (§20).
        c.disposition = 'FAILED';
        c.reason = String(e && e.message ? e.message : e);
        log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} FAILED — ${c.reason}`);
    }
}

// ---- 3. accounting closure -------------------------------------------------
const byDisp = {};
for (const c of candidates) byDisp[c.disposition] = (byDisp[c.disposition] || 0) + 1;
const expected = (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length;
const seedsSeen = new Set(candidates.map(c => c.configSeed));
const problems = [];
if (candidates.length !== expected) problems.push(`candidate count ${candidates.length} != ${expected}`);
if (byDisp.PENDING) problems.push(`${byDisp.PENDING} candidates left PENDING`);
if (seedsSeen.size !== FROZEN.seedHi - FROZEN.seedLo + 1)
    problems.push(`seed census ${seedsSeen.size} != ${FROZEN.seedHi - FROZEN.seedLo + 1}`);
for (const s of seedsSeen) {
    if (!inFrozenRange(s) || isConsumed(s) || isHeldOut(s))
        problems.push(`seed ${s} is outside the frozen range or inside a forbidden block`);
}
for (const s of env.evaluatedSeeds()) {
    if (!inFrozenRange(s)) problems.push(`env evaluated out-of-range seed ${s}`);
}
if (byDisp.FAILED) problems.push(`${byDisp.FAILED} configurations FAILED`);
// Pairing, asserted rather than assumed.
for (const p of paired) {
    for (const a of FROZEN.arms) {
        if (!p.arms[a]) problems.push(`${p.configSeed}:${p.configIndex} is missing arm ${a}`);
        if (p.arms[a].n !== FROZEN.directedAdjacencies - p.arms[a].excludedNonEdge)
            problems.push(`${p.configSeed}:${p.configIndex} ${a} population accounting does not close`);
    }
    if (p.provenance.ARMED.armAttestation.deliveredDigest
        === p.provenance.ABLATED.armAttestation.deliveredDigest)
        problems.push(`${p.configSeed}:${p.configIndex} both arms executed identical source`);
}

// ---- 4. §18 minimum evidence, §19 stopping rule ----------------------------
// Evaluated only now, after the ENTIRE range has been processed.
const sufficiency = evaluateSufficiency({ configurations: paired.length });

// §18 disclosure: the goal-degree composition of the accepted configurations.
const degreeComposition = {};
for (const p of paired) {
    const d = GOAL_DEGREE[p.goal];
    degreeComposition[d] = (degreeComposition[d] || 0) + 1;
}

// §11: counts of the direction of the paired difference. Counts only — no mean,
// no median, no aggregate estimate, no test.
const directions = (k) => {
    const o = { armedHigher: 0, ablatedHigher: 0, equal: 0 };
    for (const p of paired) {
        if (p[k] > 0) o.armedHigher++; else if (p[k] < 0) o.ablatedHigher++; else o.equal++;
    }
    return o;
};

// ---- 5. artifacts ----------------------------------------------------------
const candidatesJsonl = candidates.map(c => JSON.stringify(c)).join('\n') + '\n';
fs.writeFileSync(path.join(DATA, 'candidates.jsonl'), candidatesJsonl);

const results = {
    study: 'UQ-A',
    question: 'Does the uncertainty pathway change the alignment of the final learned value ' +
              'structure with environmental reliability?',
    preregistration: { path: PREREG, digest: FROZEN.preregistration,
                       commit: FROZEN.preregistrationCommit },
    liveness: { verdict: 'LIVE', commit: FROZEN.livenessCommit,
                artifact: 'experiments/uqa/results/uqa_liveness.json' },
    frozen: {
        seedLo: FROZEN.seedLo, seedHi: FROZEN.seedHi, agentSeed: FROZEN.agentSeed,
        m7Arm: FROZEN.arm, ticks: FROZEN.ticks, goalIndices: [...FROZEN.goalIndices],
        exposure: FROZEN.exposure, ablatedValue: FROZEN.ablatedValue, arms: [...FROZEN.arms],
        population: FROZEN.directedAdjacencies, physicalEdges: FROZEN.physicalEdges,
        minConfigurations: FROZEN.minConfigurations,
    },
    primaryOutcome: {
        definition: 'Spearman rank correlation rho between the final-run Q value for each of the ' +
                    '78 fixed-population entries (absent => 0) and the environmental edge ' +
                    'reliability p_e for that entry.',
        statistic: 'the committed experiments/m7/env.js implementation (F9), mid-rank tie ' +
                   'averaging, returning 0 when either variable is constant; byte identity ' +
                   'asserted at run time',
        phases: 'rho(Q_final, pPhase1) and rho(Q_final, pPhase2) reported SEPARATELY, never pooled',
        phaseInterpretation: 'Phase 1 correlation = retention/interference of final cumulative ' +
                    'knowledge relative to the first environmental regime. Phase 2 correlation = ' +
                    'adaptation of final cumulative knowledge to the second regime. These are ' +
                    'never "Phase 1 performance" or "Phase 2 performance".',
        unvisited: 'Q = 0, the neutral pre-learning representation. Never excluded, thresholded ' +
                   'or imputed otherwise.',
    },
    statisticsLock: {
        computed: ['rho per arm per phase per configuration', 'coverage per arm per configuration',
                   'non-edge exclusions per arm per configuration',
                   'the paired rho difference per configuration',
                   'counts of the direction of that difference'],
        notComputed: ['p-values', 'confidence intervals', 'hypothesis tests',
                      'significance claims', 'effect sizes', 'models',
                      'cross-configuration aggregates of the paired difference'],
        note: 'Section 11 enumerates the descriptive quantities and forbids post-hoc statistical ' +
              'additions. Sections 11 and 13 license the difference per comparison; they do not ' +
              'license an aggregate estimate, which would read as an effect size. Any addition ' +
              'may enter only through a numbered erratum frozen before it is computed.',
    },
    coverage: {
        definition: 'the number of the fixed-population entries for which an explicit Q entry ' +
                    'exists at end of run, per arm per configuration',
        role: 'mandatory co-primary diagnostic; part of the total causal pathway',
        neverUsedAs: 'an adjustment, a covariate, or a filter',
    },
    accounting: {
        expectedCandidates: expected, candidates: candidates.length,
        seedsEnumerated: seedsSeen.size, perSeedCandidates: FROZEN.goalIndices.length,
        dispositions: byDisp, problems,
        runsExecuted: paired.length * FROZEN.arms.length,
    },
    seedCensus: {
        min: Math.min(...seedsSeen), max: Math.max(...seedsSeen),
        evaluatedByEnv: env.evaluatedSeeds().length,
        evaluatedMin: Math.min(...env.evaluatedSeeds()),
        evaluatedMax: Math.max(...env.evaluatedSeeds()),
        consumed: CONSUMED_RANGES.map(r => ({ lo: r.lo, hi: r.hi, why: r.why })),
        heldOutFloor: HELD_OUT_FLOOR,
    },
    sufficiency,
    goalDegreeComposition: {
        counts: degreeComposition,
        map: GOAL_DEGREE,
        note: 'Section 18 disclosure. This is reported, never applied as a threshold and never ' +
              'used as a filter.',
    },
    directions: {
        rhoPhase1: directions('deltaRhoPhase1'),
        rhoPhase2: directions('deltaRhoPhase2'),
        coverage: directions('deltaCoverage'),
        note: 'Counts of the direction of the paired difference. Counts only: no aggregate ' +
              'magnitude, no test, no significance claim.',
    },
    configurations: paired,
};
const resultsJson = JSON.stringify(results, null, 2) + '\n';
fs.writeFileSync(path.join(RESULTS, 'uqa_results.json'), resultsJson);

const qAll = fs.existsSync(F_Q) ? fs.readFileSync(F_Q) : Buffer.alloc(0);
fs.writeFileSync(path.join(DATA, 'INTEGRITY.sha256'),
`# UQ-A MAIN COLLECTION — INTEGRITY RECORD
#
# Study      : UQ-A does the uncertainty pathway change value-structure alignment
# Protocol   : ${PREREG} ${FROZEN.preregistration}
# Freeze     : ${FROZEN.preregistrationCommit}
# Liveness   : LIVE at ${FROZEN.livenessCommit}
# Range      : ${FROZEN.seedLo}-${FROZEN.seedHi} | agent ${FROZEN.agentSeed} | M7 arm ${FROZEN.arm} | ${FROZEN.ticks} ticks
# Exposure   : ${FROZEN.exposure} | arms ${FROZEN.arms.join(' + ')}
#
# Regenerate with : cd experiments/uqa && node run_collection.js
# Verify with     : cd experiments/uqa && node verify_uqa.js
#
# qtables.jsonl is NOT committed (repository convention: raw measurement data is
# not versioned). Its digest is here, and results/uqa_results.json carries a
# per-configuration per-arm fingerprint and arm attestation so a single run can
# be validated without regenerating the others.
#
${sha(qAll)}  qtables.jsonl
${sha(candidatesJsonl)}  candidates.jsonl
`);
// A DISTINCT filename. results/INTEGRITY.sha256 already exists and belongs to
// the §14b liveness pre-check committed at 5d04469; overwriting it would destroy
// committed evidence for a different, already-closed protocol component.
fs.writeFileSync(path.join(RESULTS, 'uqa_results.sha256'),
`# UQ-A MAIN COLLECTION — RESULTS INTEGRITY RECORD
#
# Artifact  : experiments/uqa/results/uqa_results.json
# Protocol  : ${PREREG} ${FROZEN.preregistration}
# Disposition: ${sufficiency.status}
#
${sha(resultsJson)}  uqa_results.json
`);

log('');
log(`  dispositions        ${JSON.stringify(byDisp)}`);
log(`  paired configs      ${paired.length}   runs ${paired.length * FROZEN.arms.length}`);
log(`  goal-degree         ${JSON.stringify(degreeComposition)}   (disclosure, not a threshold)`);
log(`  rho1 direction      ${JSON.stringify(results.directions.rhoPhase1)}`);
log(`  rho2 direction      ${JSON.stringify(results.directions.rhoPhase2)}`);
log(`  coverage direction  ${JSON.stringify(results.directions.coverage)}`);
log(`  SUFFICIENCY         ${sufficiency.status}`);
if (problems.length) { log('  PROBLEMS: ' + problems.join(' | ')); process.exit(1); }
log('  accounting closed.');

function fmt(v) { return (v >= 0 ? ' ' : '') + v.toFixed(4); }

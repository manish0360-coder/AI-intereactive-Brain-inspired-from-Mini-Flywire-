// ==========================================================
// UQ-B COLLECTION DRIVER — the frozen §17 range, both arms, 20 arrangements
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   UQB_PREREGISTRATION.md v1.0 (3b3d195), UQB-ERR-01 (84c738e),
//   UQB-ERR-02 (59c2750).
//
// THIS FILE IS DISARMED UNTIL EXPLICITLY AUTHORISED.
//   Running it without UQB_COLLECTION_AUTHORISED=1 exits immediately, before a
//   single candidate is enumerated. Collection is a separate Director ruling;
//   the flag exists so that ruling has to be expressed deliberately rather than
//   by anyone happening to execute this file.
//
// WHAT IT DOES, once authorised
//   Enumerates every candidate in 897000-897999 x the four frozen goal indices,
//   evaluates each DIRECTLY at its own seed with the committed acceptance
//   predicate, and for every accepted configuration runs BOTH §5.1 arms — each
//   followed, in its own process, by the §8 readout at all 19 decision states
//   under all 20 §6 arrangements. It then computes §10, §11 and §12 offline
//   from those raw readouts.
//
// NO ADAPTIVE BEHAVIOUR (§19)
//   The range is not extended. Rejected candidates are not replaced. No seed is
//   retried or substituted. Collection does not stop early when the §18 minimum
//   is reached: §19 requires the COMPLETE registered range to be processed, and
//   the minimum is a reporting threshold, not a target. No emerging result is
//   inspected to alter execution.
//
// ACCOUNTING CLOSURE (§19)
//   Every one of the 4000 candidates ends in exactly one terminal state from the
//   frozen set: ACCEPTED, REJECTED, PENDING, FAILED or INVALID, each with an
//   explicit recorded reason. Nothing is skipped and a crash is recorded rather
//   than swallowed.
//
// J1 IS ENFORCED PER CONFIGURATION, NOT ONCE
//   UQB-ERR-01 §8 fixes acceptance at exactly 0/19. Every collected arm carries
//   its own same-state control, and a configuration whose J1 drifts is recorded
//   INVALID rather than silently analysed.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { FROZEN, CONSUMED_RANGES, HELD_OUT_FLOOR, assertSeedAllowed, inRegisteredBlock,
         isConsumed, isHeldOut, enumerateCandidates, evaluateSufficiency, failedChecks,
         processAuthorisedForCollection, GOAL_DEGREE, DISPOSITIONS } from './protocol.js';
import { collectOne } from './collect.js';
import { analyzeConfiguration, j1Drift } from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DATA = path.join(HERE, 'data');
const RESULTS = path.join(HERE, 'results');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const log = (m) => process.stderr.write(m + '\n');

// ---- 0. THE ARM SWITCH ----------------------------------------------------
if (!processAuthorisedForCollection()) {
    log('UQ-B COLLECTION DRIVER — DISARMED');
    log('');
    log('  This process is not authorised to consume the registered seed block');
    log(`  ${FROZEN.seedLo}-${FROZEN.seedHi}. Nothing has been enumerated and no seed has been`);
    log('  generated, evaluated or inspected.');
    log('');
    log('  Collection requires a separate Director ruling. When that ruling exists,');
    log('  set UQB_COLLECTION_AUTHORISED=1 in the environment of this process.');
    log('');
    log('  To exercise the frozen collection path WITHOUT consuming evidence:');
    log('      cd experiments/uqb && node preflight.js');
    process.exit(2);
}

// ---- 1. the frozen documents must be intact before anything runs ---------
for (const [file, digest, name] of [
    ['research/preregistrations/UQB_PREREGISTRATION.md', FROZEN.preregistration, 'v1.0'],
    ['research/preregistrations/UQB_PREREGISTRATION_ERRATUM_01.md', FROZEN.erratum01, 'ERR-01'],
    ['research/preregistrations/UQB_PREREGISTRATION_ERRATUM_02.md', FROZEN.erratum02, 'ERR-02'],
]) {
    const got = sha(fs.readFileSync(path.join(ROOT, file)));
    if (got !== digest) {
        log(`STOP: ${name} digest does not match: ${got} != ${digest}. The protocol changed after ` +
            `freeze. That is a PROTOCOL DEVIATION and collection refuses to run against it.`);
        process.exit(1);
    }
}

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(RESULTS, { recursive: true });
const F_READOUTS = path.join(DATA, 'readouts.jsonl');
if (fs.existsSync(F_READOUTS)) fs.rmSync(F_READOUTS);

log(`UQ-B MAIN COLLECTION — frozen range ${FROZEN.seedLo}-${FROZEN.seedHi}`);
log(`  protocol ${FROZEN.preregistration.slice(0, 16)} @ ${FROZEN.preregistrationCommit.slice(0, 7)}`);
log(`  errata   ERR-01 ${FROZEN.erratum01.slice(0, 12)} | ERR-02 ${FROZEN.erratum02.slice(0, 12)}`);
log(`  agent ${FROZEN.agentSeed} | M7 arm ${FROZEN.m7Arm} | ${FROZEN.ticks} ticks`);
log(`  arms ${FROZEN.arms.join(' + ')} | K=${FROZEN.K} | alpha=${FROZEN.alpha}`);
log(`  ${FROZEN.decisionStates} states x ${FROZEN.arrangements} arrangements per arm`);

// ---- 2. enumerate every candidate at its own seed ------------------------
const enumeration = enumerateCandidates(env, { collection: true });
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

// ---- 3. run every accepted configuration under BOTH arms ------------------
// The COMPLETE range is processed. There is no early exit and no extension.
const collected = [];
const total = candidates.filter(c => c.accepted).length;
let done = 0;
for (const c of candidates) {
    if (!c.accepted) continue;
    assertSeedAllowed(c.configSeed, { collection: true });
    done++;
    try {
        const arms = {};
        for (const arm of FROZEN.arms) {
            const r = collectOne({ configSeed: c.configSeed, configIndex: c.configIndex,
                                   goal: c.goal, arm, collection: true });
            if (r.provenance.evaluatedSeeds.length !== 1
                || r.provenance.evaluatedSeeds[0] !== c.configSeed) {
                throw new Error(`${arm} run evaluated [${r.provenance.evaluatedSeeds}], expected ` +
                    `[${c.configSeed}]`);
            }
            arms[arm] = r;
        }
        // §14 — the pair must share one environment, or it is not a pair.
        if (JSON.stringify(arms.ARMED.environment) !== JSON.stringify(arms.ABLATED.environment)) {
            throw new Error('the two arms ran against different environment vectors');
        }
        // J1 per configuration, per arm. UQB-ERR-01 §8: acceptance is EXACTLY 0/19.
        const j1 = { ARMED: j1Drift(arms.ARMED), ABLATED: j1Drift(arms.ABLATED) };
        if (!j1.ARMED.pass || !j1.ABLATED.pass) {
            c.disposition = 'INVALID';
            c.reason = `J1 same-state control drifted: ARMED ${j1.ARMED.count}/19, ` +
                       `ABLATED ${j1.ABLATED.count}/19. Acceptance requires exactly 0/19.`;
            log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} INVALID — ${c.reason}`);
            continue;
        }

        // Raw evidence, written verbatim before any reduction.
        for (const arm of FROZEN.arms) {
            fs.appendFileSync(F_READOUTS, JSON.stringify({
                ...arms[arm].runIdentity, states: arms[arm].states,
                readouts: arms[arm].readouts, j1: arms[arm].j1,
            }) + '\n');
        }

        const analysis = analyzeConfiguration({ armed: arms.ARMED, ablated: arms.ABLATED });
        c.disposition = 'ACCEPTED';
        collected.push({
            ...analysis,
            goalDegree: GOAL_DEGREE[c.goal],
            j1,
            provenance: Object.fromEntries(FROZEN.arms.map(a => [a, {
                fingerprint: arms[a].provenance.fingerprint,
                artifacts: arms[a].provenance.artifacts,
                envCounters: arms[a].provenance.envCounters,
                arrangementsDistinct: arms[a].provenance.arrangementsDistinct,
                arrangementAttempts: arms[a].provenance.arrangementAttempts,
                used: arms[a].provenance.used,
            }])),
        });
        log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} goal ${c.goal}` +
            `  C1 ph1 ${analysis.c1[1].armed}/${analysis.c1[1].ablated}` +
            `  ph2 ${analysis.c1[2].armed}/${analysis.c1[2].ablated}` +
            `  C2 ${analysis.c2.ARMED[1].verdict === 'REDISTRIBUTION-REJECTED' ? 'REJ' : 'nr'}` +
            `/${analysis.c2.ARMED[2].verdict === 'REDISTRIBUTION-REJECTED' ? 'REJ' : 'nr'}`);
    } catch (e) {
        // Recorded, never swallowed and never silently repaired (§20).
        c.disposition = 'FAILED';
        c.reason = String(e && e.message ? e.message : e);
        log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} FAILED — ${c.reason}`);
    }
}

// ---- 4. accounting closure ------------------------------------------------
const byDisp = {};
for (const c of candidates) byDisp[c.disposition] = (byDisp[c.disposition] || 0) + 1;
const expected = (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length;
const seedsSeen = new Set(candidates.map(c => c.configSeed));
const problems = [];
if (candidates.length !== expected) problems.push(`candidate count ${candidates.length} != ${expected}`);
if (byDisp.PENDING) problems.push(`${byDisp.PENDING} candidates left PENDING`);
if (byDisp.FAILED) problems.push(`${byDisp.FAILED} configurations FAILED`);
if (seedsSeen.size !== FROZEN.seedHi - FROZEN.seedLo + 1)
    problems.push(`seed census ${seedsSeen.size} != ${FROZEN.seedHi - FROZEN.seedLo + 1}`);
for (const s of seedsSeen) {
    if (!inRegisteredBlock(s) || isConsumed(s) || isHeldOut(s))
        problems.push(`seed ${s} is outside the registered range or inside a forbidden block`);
}
for (const s of env.evaluatedSeeds()) {
    if (!inRegisteredBlock(s)) problems.push(`env evaluated out-of-range seed ${s}`);
}
for (const k of Object.keys(byDisp)) {
    if (!DISPOSITIONS.includes(k)) problems.push(`unknown disposition ${k}`);
}
for (const r of collected) {
    for (const ph of [1, 2]) {
        if (!r.ablatedWiringControl[ph].pass)
            problems.push(`${r.configSeed}:${r.configIndex} ABLATED wiring control failed, phase ${ph}`);
    }
}

// ---- 5. §18/§19 disposition, only after the ENTIRE range is processed ----
const sufficiency = evaluateSufficiency({ configurations: collected.length });
const degreeComposition = {};
for (const r of collected) degreeComposition[r.goalDegree] = (degreeComposition[r.goalDegree] || 0) + 1;

// §13 — counts only. No cross-configuration aggregate of the C1 difference.
const c2Counts = { 1: { rejected: 0, notRejected: 0, dominates: 0 },
                   2: { rejected: 0, notRejected: 0, dominates: 0 } };
for (const r of collected) for (const ph of [1, 2]) {
    const v = r.c2.ARMED[ph];
    if (v.verdict === 'REDISTRIBUTION-REJECTED') c2Counts[ph].rejected++; else c2Counts[ph].notRejected++;
    if (v.redistributionDominates) c2Counts[ph].dominates++;
}
const c1Directions = { 1: { armedHigher: 0, ablatedHigher: 0, equal: 0 },
                       2: { armedHigher: 0, ablatedHigher: 0, equal: 0 } };
for (const r of collected) for (const ph of [1, 2]) {
    const d = r.c1[ph].difference;
    if (d > 0) c1Directions[ph].armedHigher++;
    else if (d < 0) c1Directions[ph].ablatedHigher++;
    else c1Directions[ph].equal++;
}

// ---- 6. artifacts ---------------------------------------------------------
const candidatesJsonl = candidates.map(c => JSON.stringify(c)).join('\n') + '\n';
fs.writeFileSync(path.join(DATA, 'candidates.jsonl'), candidatesJsonl);

const results = {
    study: 'UQ-B',
    question: 'Does the assignment of futureBonus values to the candidates that generated them ' +
              'carry information relevant to correct action selection?',
    preregistration: { digest: FROZEN.preregistration, commit: FROZEN.preregistrationCommit,
                       erratum01: FROZEN.erratum01, erratum02: FROZEN.erratum02 },
    frozen: { ...FROZEN, goalIndices: [...FROZEN.goalIndices], arms: [...FROZEN.arms] },
    estimands: {
        C1: 'the total causal effect of the futureScore mechanism\'s continuous presence on the ' +
            'agent\'s final greedy policy. NOT an estimate of its instantaneous contribution at ' +
            'readout. It compares the policies that result from two different experiential ' +
            'histories.',
        C2: 'a WITHIN-ARM exact test of H_redistribution. NOT a permutation test of the causal ' +
            'treatment effect, and must never be described as one.',
    },
    statisticsLock: {
        computed: ['A(arrangement, phase) per arm per configuration',
                   'the C1 difference per configuration per phase',
                   'the C2 verdict per configuration per phase',
                   'counts of C2 verdicts and of C1 difference direction'],
        notComputed: ['p-values beyond C2\'s exact construction', 'confidence intervals',
                      'additional hypothesis tests', 'effect sizes', 'models',
                      'cross-configuration aggregates of the C1 difference'],
        multiplicity: `C2 yields one verdict per (configuration, phase). The rejection COUNT is ` +
            `reported against the exactly known null expectation alpha x N. NO study-level ` +
            `significance claim is made, and the count may not be read as one.`,
    },
    accounting: {
        expectedCandidates: expected, candidates: candidates.length,
        seedsEnumerated: seedsSeen.size, perSeedCandidates: FROZEN.goalIndices.length,
        dispositions: byDisp, problems,
        runsExecuted: collected.length * FROZEN.arms.length,
        readoutsTaken: collected.length * FROZEN.arms.length * FROZEN.arrangements * FROZEN.decisionStates,
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
    goalDegreeComposition: { counts: degreeComposition, map: GOAL_DEGREE,
        note: 'Section 18 disclosure. Reported, never a threshold and never a filter.' },
    c2Counts: { ...c2Counts,
        nullExpectation: { 1: FROZEN.alpha * collected.length, 2: FROZEN.alpha * collected.length },
        note: 'Counts against a known null expectation. NOT a study-level significance claim.' },
    c1Directions: { ...c1Directions,
        note: 'Counts of the direction of the paired difference. Counts only: no aggregate ' +
              'magnitude, no test, no significance claim.' },
    configurations: collected,
};
const resultsJson = JSON.stringify(results, null, 2) + '\n';
fs.writeFileSync(path.join(RESULTS, 'uqb_results.json'), resultsJson);

const readoutBytes = fs.existsSync(F_READOUTS) ? fs.readFileSync(F_READOUTS) : Buffer.alloc(0);
fs.writeFileSync(path.join(DATA, 'INTEGRITY.sha256'),
`# UQ-B MAIN COLLECTION — INTEGRITY RECORD
#
# Protocol  : UQB_PREREGISTRATION.md v1.0 ${FROZEN.preregistration}
# Errata    : ERR-01 ${FROZEN.erratum01}
#             ERR-02 ${FROZEN.erratum02}
# Range     : ${FROZEN.seedLo}-${FROZEN.seedHi} | agent ${FROZEN.agentSeed} | ${FROZEN.ticks} ticks
# Design    : ${FROZEN.arms.join(' + ')} | K=${FROZEN.K} | ${FROZEN.decisionStates} states x ${FROZEN.arrangements} arrangements
#
# Regenerate with : cd experiments/uqb && UQB_COLLECTION_AUTHORISED=1 node run_collection.js
# Preflight with  : cd experiments/uqb && node preflight.js
#
# readouts.jsonl is NOT committed (repository convention: raw measurement data is
# not versioned). Its digest is here, and results/uqb_results.json carries a
# per-arm fingerprint for every configuration.
#
${sha(readoutBytes)}  readouts.jsonl
${sha(candidatesJsonl)}  candidates.jsonl
`);
fs.writeFileSync(path.join(RESULTS, 'uqb_results.sha256'),
`# UQ-B MAIN COLLECTION — RESULTS INTEGRITY RECORD
#
# Artifact   : experiments/uqb/results/uqb_results.json
# Disposition: ${sufficiency.status}
#
${sha(resultsJson)}  uqb_results.json
`);

log('');
log(`  dispositions        ${JSON.stringify(byDisp)}`);
log(`  configurations      ${collected.length}   runs ${collected.length * 2}`);
log(`  goal-degree         ${JSON.stringify(degreeComposition)}   (disclosure, not a threshold)`);
log(`  C2 phase 1          ${JSON.stringify(c2Counts[1])}`);
log(`  C2 phase 2          ${JSON.stringify(c2Counts[2])}`);
log(`  C1 direction ph1    ${JSON.stringify(c1Directions[1])}`);
log(`  C1 direction ph2    ${JSON.stringify(c1Directions[2])}`);
log(`  SUFFICIENCY         ${sufficiency.status}`);
if (problems.length) { log('  PROBLEMS: ' + problems.join(' | ')); process.exit(1); }
log('  accounting closed.');

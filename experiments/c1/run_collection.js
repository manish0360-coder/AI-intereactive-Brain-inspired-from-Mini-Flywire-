// ==========================================================
// C1 — THE DESCRIPTIVE CENSUS DRIVER
// ==========================================================
// DISARMED until explicitly authorised. Without C1_COLLECTION_AUTHORISED=1 this
// exits before enumerating anything.
//
// Executes C1 v2.0 exactly: the COMPLETE registered range, both arms on every
// accepted configuration, no early exit, no adaptive extension, no retry, and
// no stopping based on observed results (§13).
//
// Computes only §9's descriptive quantities. No test, no p-value, no α, no
// interval, no population inference.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, DISPOSITIONS, enumerateCandidates, processAuthorisedForCollection,
         inRegisteredBlock } from './protocol.js';
import { collectOne } from './collect.js';
import { cellsFor, deltaFor, missingnessFor, e1For, describe, signCounts, histogram }
    from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data'), RES = path.join(HERE, 'results');
const log = (s = '') => process.stdout.write(s + '\n');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

if (!processAuthorisedForCollection()) {
    log('C1 COLLECTION DRIVER — DISARMED');
    log('  Nothing has been enumerated and no seed has been evaluated.');
    log('  To run the authorised census, set C1_COLLECTION_AUTHORISED=1.');
    process.exit(2);
}

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(RES, { recursive: true });
const F_READOUTS = path.join(DATA, 'readouts.jsonl');
if (fs.existsSync(F_READOUTS)) fs.rmSync(F_READOUTS);

log(`C1 DESCRIPTIVE CENSUS — registered range ${FROZEN.seedLo}-${FROZEN.seedHi}`);
log(`  preregistration ${FROZEN.preregistration.slice(0, 16)} v${FROZEN.preregistrationVersion} @ ${FROZEN.preregistrationCommit}`);
log(`  agent ${FROZEN.agentSeed} | M7 arm ${FROZEN.m7Arm} | ${FROZEN.ticks} ticks`);
log(`  arms ${FROZEN.arms.join(' + ')} | ${FROZEN.decisionStates} states x 2 phases`);
log(`  stress test: ${FROZEN.stressTest}`);
log('');

// ---- §13: the COMPLETE range, enumerated once -----------------------------
const enumeration = enumerateCandidates(env, { collection: true });
log(`  candidates ${enumeration.candidates} | accepted ${enumeration.accepted.length} | ` +
    `rejected ${enumeration.rejected.length}`);
fs.writeFileSync(path.join(DATA, 'candidates.jsonl'),
    [...enumeration.accepted.map(c => JSON.stringify({ ...c, disposition: 'PENDING' })),
     ...enumeration.rejected.map(c => JSON.stringify({ ...c, disposition: 'REJECTED' }))]
        .join('\n') + '\n');

// ---- collect ---------------------------------------------------------------
const configurations = [];
const problems = [];
let done = 0;
for (const cand of enumeration.accepted) {
    done++;
    const tag = `[${String(done).padStart(3)}/${enumeration.accepted.length}] ` +
                `${cand.configSeed}:${cand.configIndex} goal ${cand.goal}`;
    try {
        const armed = collectOne({ ...cand, arm: 'ARMED', collection: true });
        const ablated = collectOne({ ...cand, arm: 'ABLATED', collection: true });
        const cfg = env.makeConfig(cand.configSeed, cand.configIndex);
        const cells = cellsFor({ armed, ablated, cfg });
        const e1 = e1For(armed, ablated);

        const perPhase = {};
        for (const ph of FROZEN.phases) {
            perPhase[ph] = { delta: deltaFor(cells, ph), missingness: missingnessFor(cells, ph) };
        }
        // §13 — the ONLY validity rule: E1 >= 1 and jointlyDefined >= 1.
        // No other count-based exclusion exists.
        const anyJoint = FROZEN.phases.some(ph => perPhase[ph].missingness.jointlyDefined >= 1);
        const disposition = (e1 === 0 || !anyJoint) ? 'INVALID' : 'ACCEPTED';

        fs.appendFileSync(F_READOUTS, JSON.stringify({
            configSeed: cand.configSeed, configIndex: cand.configIndex, goal: cand.goal,
            states: armed.states, e1, disposition,
            fingerprintArmed: armed.provenance.fingerprint,
            fingerprintAblated: ablated.provenance.fingerprint,
            evaluatedSeeds: [...new Set([...armed.provenance.evaluatedSeeds,
                                         ...ablated.provenance.evaluatedSeeds])],
            cells,
        }) + '\n');

        configurations.push({
            configSeed: cand.configSeed, configIndex: cand.configIndex, goal: cand.goal,
            disposition, e1, perPhase, cells,
            fingerprintArmed: armed.provenance.fingerprint,
            fingerprintAblated: ablated.provenance.fingerprint,
        });
        log(`  ${tag}  E1 ${String(e1).padStart(2)}/19  ` +
            FROZEN.phases.map(ph =>
                `ph${ph} def ${String(perPhase[ph].missingness.jointlyDefined).padStart(2)} ` +
                `Δ ${perPhase[ph].delta === null ? '  n/a  ' : perPhase[ph].delta.toFixed(4)}`).join('  ') +
            `  ${disposition}`);
    } catch (e) {
        problems.push(`${cand.configSeed}:${cand.configIndex} ${e.message}`);
        configurations.push({ configSeed: cand.configSeed, configIndex: cand.configIndex,
            goal: cand.goal, disposition: 'FAILED', error: String(e.message) });
        log(`  ${tag}  FAILED — ${e.message}`);
    }
}

// ==========================================================================
// §9 — the preregistered descriptive summaries. Descriptive only.
// ==========================================================================
const valid = configurations.filter(c => c.disposition === 'ACCEPTED');
const allCells = configurations.filter(c => c.cells).flatMap(c => c.cells);

const summariseStratum = (configs, ph) => {
    const deltas = configs.map(c => c.perPhase?.[ph]?.delta).filter(d => d !== null && d !== undefined);
    return { summary: describe(deltas), signs: signCounts(deltas) };
};

const perPhaseReport = {};
for (const ph of FROZEN.phases) {
    const withDelta = valid.filter(c => c.perPhase[ph].delta !== null);
    const jd = withDelta.map(c => c.perPhase[ph].missingness.jointlyDefined);
    const asymSet = withDelta.filter(c => c.perPhase[ph].missingness.asym === 0);

    // §9.6.3 stability curve — a DISCLOSURE, never a decision rule
    const stability = {};
    for (const k of [1, 5, 10, 15, 19]) {
        stability[k] = summariseStratum(
            withDelta.filter(c => c.perPhase[ph].missingness.jointlyDefined >= k), ph);
    }

    const ph_cells = allCells.filter(c => c.phase === ph);
    perPhaseReport[ph] = {
        // §9.1 the primary object is the full list, carried in `configurations`
        primary: summariseStratum(withDelta, ph),                       // §9.2, §9.3
        strata: {                                                        // §9.6
            asymZero: { n: asymSet.length, ...summariseStratum(asymSet, ph) },
            stabilityCurve: stability,
        },
        definedness: {                                                   // §9.4
            jointlyDefined: describe(jd), histogram: histogram(jd),
            armedOnlyUndefined: withDelta.reduce((a, c) => a + c.perPhase[ph].missingness.armedOnlyUndefined, 0),
            ablatedOnlyUndefined: withDelta.reduce((a, c) => a + c.perPhase[ph].missingness.ablatedOnlyUndefined, 0),
            neitherDefined: withDelta.reduce((a, c) => a + c.perPhase[ph].missingness.neitherDefined, 0),
            n1Armed: withDelta.reduce((a, c) => a + c.perPhase[ph].missingness.n1Armed, 0),
            n1Ablated: withDelta.reduce((a, c) => a + c.perPhase[ph].missingness.n1Ablated, 0),
            asymHistogram: histogram(withDelta.map(c => c.perPhase[ph].missingness.asym)),
            asymZeroCount: asymSet.length,
        },
        diagnostics: {                                                   // §9.5
            rankArmed: histogram(ph_cells.map(c => c.rA)),
            rankAblated: histogram(ph_cells.map(c => c.rB)),
            poolArmed: histogram(ph_cells.map(c => c.nA)),
            poolAblated: histogram(ph_cells.map(c => c.nB)),
            n1Cells: ph_cells.filter(c => c.nA === 1 || c.nB === 1).length,
            weightTies: ph_cells.reduce((a, c) => a + c.tiesA + c.tiesB, 0),
        },
    };
}

const dispositions = {};
for (const d of DISPOSITIONS) dispositions[d] = 0;
dispositions.REJECTED = enumeration.rejected.length;
for (const c of configurations) dispositions[c.disposition] = (dispositions[c.disposition] || 0) + 1;

const evaluatedSeeds = env.evaluatedSeeds();
const results = {
    study: 'C1 — descriptive census of oracle-alignment of the candidate-ranking policy',
    preregistration: { digest: FROZEN.preregistration, version: FROZEN.preregistrationVersion,
                       commit: FROZEN.preregistrationCommit },
    stressTest: FROZEN.stressTest,
    frozen: FROZEN,
    licensedLanguage: 'This is a descriptive census of the accepted configurations of one ' +
        'registered seed block. It reports exactly measured per-configuration causal effects and ' +
        'their distribution. It performs no statistical inference and licenses no generalisation ' +
        'beyond the configurations enumerated.',
    accounting: {
        seedsEnumerated: enumeration.hi - enumeration.lo + 1,
        candidates: enumeration.candidates,
        dispositions, problems,
        runsExecuted: configurations.filter(c => c.cells).length * 2,
    },
    seedCensus: { lo: FROZEN.seedLo, hi: FROZEN.seedHi,
                  evaluatedCount: evaluatedSeeds.length,
                  evaluatedMin: Math.min(...evaluatedSeeds), evaluatedMax: Math.max(...evaluatedSeeds),
                  outsideRegisteredBlock: evaluatedSeeds.filter(s => !inRegisteredBlock(s)) },
    e1: { histogram: histogram(configurations.filter(c => c.cells).map(c => c.e1)),
          zeroCount: configurations.filter(c => c.cells && c.e1 === 0).length },
    perPhase: perPhaseReport,
    configurations,
};

const resultsJson = JSON.stringify(results, null, 2) + '\n';
fs.writeFileSync(path.join(RES, 'c1_results.json'), resultsJson);

const readoutBytes = fs.existsSync(F_READOUTS) ? fs.readFileSync(F_READOUTS) : Buffer.alloc(0);
const candBytes = fs.readFileSync(path.join(DATA, 'candidates.jsonl'));
fs.writeFileSync(path.join(DATA, 'INTEGRITY.sha256'),
`# C1 DESCRIPTIVE CENSUS — INTEGRITY RECORD
#
# Protocol  : C1_PREREGISTRATION.md v${FROZEN.preregistrationVersion} ${FROZEN.preregistration}
# Range     : ${FROZEN.seedLo}-${FROZEN.seedHi} | agent ${FROZEN.agentSeed} | ${FROZEN.ticks} ticks
# Design    : ARMED + ABLATED | ${FROZEN.decisionStates} states x 2 phases | E6 rho = r/(n-1)
# Gate      : ${FROZEN.stressTest}
#
# Regenerate with : cd experiments/c1 && C1_COLLECTION_AUTHORISED=1 node run_collection.js
#
${sha(readoutBytes)}  readouts.jsonl
${sha(candBytes)}  candidates.jsonl
`);
fs.writeFileSync(path.join(RES, 'c1_results.sha256'),
`# C1 RESULTS — INTEGRITY RECORD
#
# Artifact : experiments/c1/results/c1_results.json
# Protocol : C1_PREREGISTRATION.md v${FROZEN.preregistrationVersion} ${FROZEN.preregistration}
#
${sha(Buffer.from(resultsJson))}  c1_results.json
`);

log('');
log(`  dispositions        ${JSON.stringify(dispositions)}`);
log(`  valid configurations ${valid.length}   runs ${results.accounting.runsExecuted}`);
for (const ph of FROZEN.phases) {
    const p = perPhaseReport[ph].primary;
    log(`  phase ${ph}  N ${p.summary.N}  mean ${p.summary.mean?.toFixed(5)}  ` +
        `median ${p.summary.median?.toFixed(5)}  IQR ${p.summary.IQR?.toFixed(5)}  ` +
        `neg/pos/zero ${p.signs.nNegative}/${p.signs.nPositive}/${p.signs.nZero}`);
}
log(`  seeds evaluated     ${evaluatedSeeds.length}  ` +
    `outside block ${results.seedCensus.outsideRegisteredBlock.length}`);
if (problems.length) log(`  PROBLEMS: ${problems.length}`);
log('');
log('  C1 census complete. Descriptive only; no inference performed.');
process.exit(0);

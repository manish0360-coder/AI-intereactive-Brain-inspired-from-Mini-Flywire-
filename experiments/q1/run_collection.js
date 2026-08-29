// ==========================================================
// Q1 COLLECTION DRIVER — executes the frozen candidate range
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md, frozen at 0ad12fe.
//   Collection parameters ratified by D-006, committed at 612c69c.
//
// WHAT THIS DOES
//   Enumerates every candidate in the frozen range 899000-899499 x the four
//   frozen goal indices, evaluates each DIRECTLY at its own seed using the
//   committed acceptance predicate, and runs every accepted configuration
//   under the frozen parameters with the committed Q1 instrumentation.
//
// NO ADAPTIVE BEHAVIOUR
//   The range is not extended. Rejected candidates are not replaced. No seed
//   is retried, substituted, or generated outside the frozen bounds. The
//   frozen range IS the experiment; under-yield is reported under D-006 §5,
//   never worked around. Collection does not stop early when the minimum
//   evidence is reached: D-006 §5 requires the COMPLETE registered range to be
//   processed, and the minimum is a reporting threshold, not a target.
//
// ACCOUNTING CLOSURE
//   Every one of the 2000 candidates ends in exactly one terminal state:
//   REJECTED, COLLECTED, or FAILED with an explicit recorded reason. Nothing
//   is skipped, and a crash is recorded rather than swallowed.
//
// NO SCIENCE
//   No GAP_COMPOSITION, no FIRST_DIVERGING_TRANSITION, no
//   LAST_TRANSITION_BEFORE_EVALUATION, no TRANSITION_COUNT, no ORIGIN, no AGE,
//   no mechanism frequency, no hypothesis verdict, no statistic, no causal
//   label. Raw records are written losslessly so every §7 observable remains
//   reconstructible offline. Interpretation is a later milestone.
//
//   The ONLY figures computed here are the three pre-declared D-006 §1 E
//   sufficiency counts, and they are computed AFTER the entire range has been
//   processed. They are collection/evaluability measures, not results.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { FROZEN, CONSUMED_RANGES, HELD_OUT_FLOOR, assertSeedAllowed, inFrozenRange,
         isHeldOut, isConsumed, enumerateCandidates, stratumOf,
         evaluateSufficiency } from './protocol.js';
import { collectOne, toJsonl } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
fs.mkdirSync(DATA, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const log = (m) => process.stderr.write(m + '\n');

const F_TRANS = path.join(DATA, 'transitions.jsonl');
const F_BOUND = path.join(DATA, 'boundaries.jsonl');
for (const f of [F_TRANS, F_BOUND]) if (fs.existsSync(f)) fs.rmSync(f);

// ---- 1. enumerate every candidate at its own seed ------------------------
log(`Q1 COLLECTION — frozen range ${FROZEN.seedLo}-${FROZEN.seedHi}`);
log(`  agent seed ${FROZEN.agentSeed} | arm ${FROZEN.arm} | ${FROZEN.ticks} ticks`);
const enumeration = enumerateCandidates(env);
log(`  candidates ${enumeration.candidates} | accepted ${enumeration.accepted.length} | ` +
    `rejected ${enumeration.rejected.length}`);

const acceptedKey = new Set(enumeration.accepted.map(a => `${a.configSeed}:${a.configIndex}`));
const rejectedBy  = new Map(enumeration.rejected.map(r => [`${r.configSeed}:${r.configIndex}`, r]));
const candidates = [];
for (let seed = FROZEN.seedLo; seed <= FROZEN.seedHi; seed++) {
    for (const idx of FROZEN.goalIndices) {
        const key = `${seed}:${idx}`;
        const accepted = acceptedKey.has(key);
        const rej = rejectedBy.get(key);
        const goal = accepted ? enumeration.accepted.find(a => `${a.configSeed}:${a.configIndex}` === key).goal
                              : rej.goal;
        candidates.push({
            configSeed: seed, configIndex: idx, goal, stratum: stratumOf(goal),
            accepted,
            disposition: accepted ? 'PENDING' : 'REJECTED',
            // The exact failing acceptance checks, recorded raw.
            reason: accepted ? null : `acceptance predicate failed: ${rej.failed.join(',')}`,
        });
    }
}

// ---- 2. run every accepted configuration --------------------------------
// The COMPLETE range is processed. There is no early exit and no extension.
const runs = [];
let done = 0;
const total = candidates.filter(c => c.accepted).length;
for (const c of candidates) {
    if (!c.accepted) continue;
    assertSeedAllowed(c.configSeed);
    done++;
    try {
        const r = collectOne({ configSeed: c.configSeed, configIndex: c.configIndex, goal: c.goal });
        // Readiness 7/8: each accepted run evaluates ONLY its own seed.
        if (r.provenance.evaluatedSeeds.length !== 1
            || r.provenance.evaluatedSeeds[0] !== c.configSeed) {
            throw new Error(`run evaluated [${r.provenance.evaluatedSeeds}], expected [${c.configSeed}]`);
        }
        const tJson = toJsonl(r, 'transitions');
        const bJson = toJsonl(r, 'boundaries');
        fs.appendFileSync(F_TRANS, tJson);
        fs.appendFileSync(F_BOUND, bJson);
        c.disposition = 'COLLECTED';
        runs.push({
            ...r.runIdentity,
            transitions: r.transitions.length,
            boundaries: r.boundaries.length,
            diagnostics: r.diagnostics,
            fingerprint: r.provenance.fingerprint,
            artifacts: r.provenance.artifacts,
            envCounters: r.provenance.envCounters,
            evaluatedSeeds: r.provenance.evaluatedSeeds,
            used: r.provenance.used,
            transitionsDigest: sha(tJson),
            boundariesDigest: sha(bJson),
        });
        log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} goal ${c.goal} ` +
            `-> ${r.transitions.length} transitions, ${r.boundaries.length} boundaries`);
    } catch (e) {
        // Recorded, never swallowed and never silently repaired.
        c.disposition = 'FAILED';
        c.reason = String(e && e.message ? e.message : e);
        log(`  [${String(done).padStart(3)}/${total}] ${c.configSeed}:${c.configIndex} FAILED — ${c.reason}`);
    }
}

// ---- 3. accounting closure ----------------------------------------------
const byDisp = {};
for (const c of candidates) byDisp[c.disposition] = (byDisp[c.disposition] || 0) + 1;
const expected = (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length;
const seedsSeen = new Set(candidates.map(c => c.configSeed));
const problems = [];
if (candidates.length !== expected)
    problems.push(`candidate count ${candidates.length} != ${expected}`);
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

// ---- 4. the three pre-declared D-006 sufficiency counts ------------------
// Computed only now, after the ENTIRE range has been processed. `desyncEvents`
// is the frozen §2 predicate applied to raw recorded fields at the §3 closing
// edge; it is an evaluability count, not a Q1 result.
let desyncEvents = 0, reads = 0;
for (const line of fs.readFileSync(F_BOUND, 'utf8').split('\n')) {
    if (!line) continue;
    const b = JSON.parse(line);
    if (b.kind !== 'read') continue;
    reads++;
    if (b.from !== b.agentCurrent) desyncEvents++;
}
const perStratum = {};
for (const r of runs) perStratum[r.stratum] = (perStratum[r.stratum] || 0) + 1;
const sufficiency = {
    ...evaluateSufficiency({ desyncEvents, configurations: runs.length, perStratum }),
    desyncEvents, reads, configurations: runs.length, perStratum,
    note: 'Collection/evaluability counts only. DESYNC is the frozen §2 predicate ' +
          'lastReasoning.from !== agentCurrent evaluated at the §3 closing edge (main.js:3819). ' +
          'Q1 has its own denominator (§8); these are not Q1 scientific results.',
};

// ---- 5. artifacts --------------------------------------------------------
const candidatesJsonl = candidates.map(c => JSON.stringify(c)).join('\n') + '\n';
fs.writeFileSync(path.join(DATA, 'candidates.jsonl'), candidatesJsonl);

const manifest = {
    study: 'Q1',
    preregistration: FROZEN.preregistration,
    decision: FROZEN.decision,
    instrumentation: FROZEN.instrumentation,
    frozen: {
        seedLo: FROZEN.seedLo, seedHi: FROZEN.seedHi, agentSeed: FROZEN.agentSeed,
        arm: FROZEN.arm, ticks: FROZEN.ticks, goalIndices: [...FROZEN.goalIndices],
        minDesyncEvents: FROZEN.minDesyncEvents, minConfigurations: FROZEN.minConfigurations,
        minPerStratum: FROZEN.minPerStratum,
    },
    boundaries: {
        consumed: CONSUMED_RANGES.map(r => ({ lo: r.lo, hi: r.hi, why: r.why })),
        heldOutFloor: HELD_OUT_FLOOR,
    },
    accounting: {
        expectedCandidates: expected,
        candidates: candidates.length,
        seedsEnumerated: seedsSeen.size,
        perSeedCandidates: FROZEN.goalIndices.length,
        dispositions: byDisp,
        problems,
    },
    seedCensus: {
        min: Math.min(...seedsSeen), max: Math.max(...seedsSeen),
        evaluatedByEnv: env.evaluatedSeeds().length,
        evaluatedMin: Math.min(...env.evaluatedSeeds()),
        evaluatedMax: Math.max(...env.evaluatedSeeds()),
    },
    totals: {
        transitions: runs.reduce((a, r) => a + r.transitions, 0),
        boundaries: runs.reduce((a, r) => a + r.boundaries, 0),
    },
    sufficiency,
    runs,
};
fs.writeFileSync(path.join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const tAll = fs.readFileSync(F_TRANS);
const bAll = fs.readFileSync(F_BOUND);
const integrity =
`# Q1 COLLECTION — INTEGRITY RECORD
#
# Study      : Q1 ordered transition composition in DESYNC gaps
# Protocol   : research/preregistrations/Q1_PREREGISTRATION.md ${FROZEN.preregistration}
# Parameters : Director decision ${FROZEN.decision}
# Instrument : ${FROZEN.instrumentation}
# Range      : ${FROZEN.seedLo}-${FROZEN.seedHi} | agent ${FROZEN.agentSeed} | arm ${FROZEN.arm} | ${FROZEN.ticks} ticks
#
# Regenerate with : cd experiments/q1 && node run_collection.js
# Verify with     : cd experiments/q1 && node verify_q1_collection.js
#
# transitions.jsonl and boundaries.jsonl are NOT committed (repository
# convention: raw measurement data is not versioned). Their digests are here,
# and manifest.json carries a per-configuration digest so a single run can be
# validated without regenerating the others.
#
${sha(tAll)}  transitions.jsonl
${sha(bAll)}  boundaries.jsonl
${sha(candidatesJsonl)}  candidates.jsonl
${sha(fs.readFileSync(path.join(DATA, 'manifest.json')))}  manifest.json
`;
fs.writeFileSync(path.join(DATA, 'INTEGRITY.sha256'), integrity);

log('');
log(`  dispositions        ${JSON.stringify(byDisp)}`);
log(`  transitions         ${manifest.totals.transitions}`);
log(`  boundaries          ${manifest.totals.boundaries}`);
log(`  DESYNC events       ${desyncEvents} of ${reads} reads`);
log(`  configurations      ${runs.length}  ${JSON.stringify(perStratum)}`);
log(`  SUFFICIENCY         ${sufficiency.status}`);
if (problems.length) { log('  PROBLEMS: ' + problems.join(' | ')); process.exit(1); }
log('  accounting closed.');

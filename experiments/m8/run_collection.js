// ==========================================================
// M8 COLLECTION DRIVER — executes the frozen candidate range
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §8, §12, §13, §14,
//   frozen at 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//
// WHAT THIS DOES
//   Enumerates every candidate in the frozen range 899500-899999 x the four
//   frozen goal indices, evaluates each DIRECTLY at its own seed using the
//   committed acceptance predicate, and runs every accepted configuration
//   under the frozen parameters with the committed M8 instrumentation.
//
// NO ADAPTIVE BEHAVIOUR
//   The range is not extended. Rejected candidates are not replaced. No seed
//   is retried, substituted, or generated outside the frozen bounds. The
//   frozen range IS the experiment; under-yield is reported under §13, never
//   worked around.
//
// ACCOUNTING CLOSURE
//   Every one of the 2000 candidates ends in exactly one terminal state:
//   REJECTED, COLLECTED, or FAILED with an explicit recorded reason. Nothing
//   is skipped, and a crash is recorded rather than swallowed.
//
// NO SCIENCE
//   No derived predicate, no mechanism flag, no frequency, no H1-H5 verdict.
//   Raw observations are written losslessly so every §9 predicate remains
//   reconstructible offline. Interpretation is a later milestone.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { FROZEN, TUPLE_FIELDS, assertSeedAllowed, inFrozenRange, isHeldOut,
         isConsumed, enumerateCandidates, stratumOf } from './protocol.js';
import { collectOne } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
fs.mkdirSync(DATA, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const log = (m) => process.stderr.write(m + '\n');

// ---- 1. enumerate every candidate at its own seed ------------------------
log('M8 COLLECTION — frozen range ' + FROZEN.seedLo + '-' + FROZEN.seedHi);
const enumeration = enumerateCandidates(env);
log(`  candidates ${enumeration.candidates} | accepted ${enumeration.accepted.length}`);

const acceptedKey = new Set(enumeration.accepted.map(a => `${a.configSeed}:${a.configIndex}`));
const candidates = [];
for (let seed = FROZEN.seedLo; seed <= FROZEN.seedHi; seed++) {
    for (const idx of FROZEN.goalIndices) {
        const accepted = acceptedKey.has(`${seed}:${idx}`);
        candidates.push({
            configSeed: seed, configIndex: idx,
            goal: FROZEN.goalIndices.includes(idx) ? [8, 12, 16, 19][idx] : null,
            accepted,
            disposition: accepted ? 'PENDING' : 'REJECTED',
            reason: accepted ? null : 'acceptance predicate (env.makeConfig R1-R5)',
        });
    }
}

// ---- 2. run every accepted configuration --------------------------------
const runs = [];
const eventLines = [];
let done = 0;
for (const c of candidates) {
    if (!c.accepted) continue;
    assertSeedAllowed(c.configSeed);
    done++;
    try {
        const r = collectOne({ configSeed: c.configSeed, configIndex: c.configIndex, goal: c.goal });
        // §7 of the milestone: each accepted run evaluates ONLY its own seed.
        if (r.provenance.evaluatedSeeds.length !== 1
            || r.provenance.evaluatedSeeds[0] !== c.configSeed) {
            throw new Error(`run evaluated [${r.provenance.evaluatedSeeds}], expected [${c.configSeed}]`);
        }
        const lines = r.events.map(e => JSON.stringify({ ...r.runIdentity, ...e }));
        eventLines.push(...lines);
        runs.push({
            configSeed: c.configSeed, configIndex: c.configIndex, goal: c.goal,
            stratum: stratumOf(c.goal), status: 'COLLECTED',
            events: r.events.length,
            fingerprint: r.provenance.fingerprint,
            artifacts: r.provenance.artifacts,
            envCounters: r.provenance.envCounters,
            diagnostics: r.diagnostics,
            evaluatedSeeds: r.provenance.evaluatedSeeds,
            eventsSha256: sha(lines.join('\n')),
        });
        c.disposition = 'COLLECTED';
        log(`  [${done}/${enumeration.accepted.length}] ${c.configSeed}/${c.configIndex} goal ${c.goal} ` +
            `-> ${r.events.length} events, fp ${r.provenance.fingerprint.slice(0, 12)}`);
    } catch (e) {
        // Deterministically recorded, never silently skipped.
        runs.push({
            configSeed: c.configSeed, configIndex: c.configIndex, goal: c.goal,
            stratum: stratumOf(c.goal), status: 'FAILED',
            reason: String(e && e.message ? e.message : e).slice(0, 400),
        });
        c.disposition = 'FAILED';
        c.reason = String(e && e.message ? e.message : e).slice(0, 400);
        log(`  [${done}/${enumeration.accepted.length}] ${c.configSeed}/${c.configIndex} FAILED: ${c.reason}`);
    }
}

// ---- 3. accounting closure ----------------------------------------------
const tally = { REJECTED: 0, COLLECTED: 0, FAILED: 0, PENDING: 0 };
for (const c of candidates) tally[c.disposition]++;
const seedsSeen = env.evaluatedSeeds();
const accounting = {
    preregistration: '8fb0bec13bb2940fa2e7e7f823c632427a28fae3',
    frozenRange: { lo: FROZEN.seedLo, hi: FROZEN.seedHi },
    runParameters: { agentSeed: FROZEN.agentSeed, arm: FROZEN.arm, ticks: FROZEN.ticks },
    candidatesTotal: candidates.length,
    tally,
    closure: tally.REJECTED + tally.COLLECTED + tally.FAILED === candidates.length && tally.PENDING === 0,
    distinctSeeds: new Set(candidates.map(c => c.configSeed)).size,
    seedBoundary: {
        evaluatedSeedCount: seedsSeen.length,
        min: Math.min(...seedsSeen), max: Math.max(...seedsSeen),
        outsideFrozenRange: seedsSeen.filter(s => !inFrozenRange(s)).length,
        heldOutTouched: seedsSeen.filter(isHeldOut).length,
        consumedTouched: seedsSeen.filter(isConsumed).length,
    },
    events: { total: eventLines.length, tupleFields: TUPLE_FIELDS.length },
    strata: {
        degree5: runs.filter(r => r.stratum === 'degree5' && r.status === 'COLLECTED').length,
        degree3: runs.filter(r => r.stratum === 'degree3' && r.status === 'COLLECTED').length,
    },
};

// ---- 4. artifacts --------------------------------------------------------
const candLines = candidates.map(c => JSON.stringify(c)).join('\n') + '\n';
const eventsBody = eventLines.join('\n') + (eventLines.length ? '\n' : '');
fs.writeFileSync(path.join(DATA, 'candidates.jsonl'), candLines);
fs.writeFileSync(path.join(DATA, 'events.jsonl'), eventsBody);
const manifest = { accounting, runs };
const manifestBody = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(DATA, 'manifest.json'), manifestBody);
fs.writeFileSync(path.join(DATA, 'INTEGRITY.sha256'),
    `# M8 COLLECTION — INTEGRITY RECORD\n` +
    `# Pre-registration : 8fb0bec13bb2940fa2e7e7f823c632427a28fae3\n` +
    `# Frozen range     : ${FROZEN.seedLo}-${FROZEN.seedHi}\n` +
    `# Run parameters   : agentSeed ${FROZEN.agentSeed}, arm ${FROZEN.arm}, ${FROZEN.ticks} ticks\n` +
    `# Regenerate with  : cd experiments/m8 && node run_collection.js\n` +
    `# Verify with      : cd experiments/m8 && node verify_m8_collection.js\n` +
    `#\n` +
    `${sha(candLines)}  candidates.jsonl\n` +
    `${sha(manifestBody)}  manifest.json\n` +
    `${sha(eventsBody)}  events.jsonl\n`);

log(`\n  closure ${accounting.closure ? 'OK' : 'BROKEN'} | ` +
    `${tally.REJECTED} rejected, ${tally.COLLECTED} collected, ${tally.FAILED} failed`);
log(`  events ${eventLines.length} | events.jsonl ${(eventsBody.length / 1048576).toFixed(2)} MB`);
log(`  seeds ${seedsSeen.length} in ${accounting.seedBoundary.min}-${accounting.seedBoundary.max}, ` +
    `outside ${accounting.seedBoundary.outsideFrozenRange}, held-out ${accounting.seedBoundary.heldOutTouched}`);
process.exit(accounting.closure && tally.FAILED === 0 ? 0 : 1);

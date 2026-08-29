// ==========================================================
// Q1 FIVE-CLAIM ANALYSIS DRIVER
// ==========================================================
// Reads the frozen Q1 evidence READ-ONLY, verifies every digest before a
// single gap is built, evaluates the five authorised claims, and writes the
// machine-readable result plus an integrity sidecar.
//
// Aborts rather than proceeding if any digest mismatches, if the self-loop
// accounting disagrees with the figures D-009 §8 recorded, or if the E4/E2
// equivalence D-009 Ruling 2 requires does not hold on every gap.
//
// It writes ONLY to experiments/q1/results/. The raw evidence is never
// opened for writing, never filtered on disk, and never repaired.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANALYSIS_VERSION, PREREG, DECISIONS, DISPOSITION, NON_REFUTATION_WORDING,
         CLAIMS, EXEMPLAR_CAP, buildGaps, evaluateClaims, e4EquivalenceCheck,
         selfLoopAccounting, parseJsonl } from './analyze.js';
import { FROZEN } from './protocol.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DATA = path.join(HERE, 'data');
const OUT  = path.join(HERE, 'results');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const log = (m) => process.stderr.write(m + '\n');
const die = (m) => { log('STOP: ' + m); process.exit(1); };

// D-009 §8 — the figures already established by the read-only pre-flight audit.
// Reproduced, not recomputed: the analysis must AGREE with them or stop.
const D009_SELF_LOOPS = Object.freeze({ total: 2686, advance: 2086, goalReset: 600,
                                        records: 37659 });

// ---- 1. integrity, before any scientific computation --------------------
log('Q1 FIVE-CLAIM ANALYSIS');
const integrity = fs.readFileSync(path.join(DATA, 'INTEGRITY.sha256'), 'utf8');
const want = {};
for (const l of integrity.split('\n')) {
    const m = l.match(/^([0-9a-f]{64})\s+(\S+)$/);
    if (m) want[m[2]] = m[1];
}
const dataDigests = {};
for (const f of ['transitions.jsonl', 'boundaries.jsonl', 'candidates.jsonl', 'manifest.json']) {
    const p = path.join(DATA, f);
    if (!fs.existsSync(p)) die(`${f} is missing; this analysis refuses to run on partial evidence.`);
    const got = sha(fs.readFileSync(p));
    if (want[f] !== got) die(`${f} digest mismatch: ${got} != ${want[f]}. The artifact is not ` +
        `overwritten, repaired, or re-collected.`);
    dataDigests[f] = got;
}
const protocolDigests = {};
for (const [name, rel] of [
        ['Q1_PREREGISTRATION.md', 'research/preregistrations/Q1_PREREGISTRATION.md'],
        ['M8_PREREGISTRATION.md', 'research/preregistrations/M8_PREREGISTRATION.md'],
        ['M9_PREREGISTRATION.md', 'research/preregistrations/M9_PREREGISTRATION.md'],
        ['M7_PREREGISTRATION.md', 'research/cognitive-audit/M7_PREREGISTRATION.md'],
        ['09_decisions.md',       'research/09_decisions.md']]) {
    protocolDigests[name] = sha(fs.readFileSync(path.join(ROOT, rel)));
}
{
    // The frozen pre-registration must still match its own sidecar. A drifted
    // protocol invalidates every claim definition below it.
    const side = fs.readFileSync(path.join(ROOT, 'research/preregistrations/Q1_PREREGISTRATION.sha256'), 'utf8');
    const line = side.split('\n').filter(l => l.trim() && !l.startsWith('#')).pop() || '';
    const w = (line.match(/[0-9a-f]{64}/) || [])[0];
    if (w !== protocolDigests['Q1_PREREGISTRATION.md'])
        die('the frozen Q1 pre-registration does not match its sidecar digest.');
}
log('  digests verified: 4 evidence artifacts, 5 protocol artifacts');

// ---- 2. load, read-only --------------------------------------------------
const transitions = parseJsonl(fs.readFileSync(path.join(DATA, 'transitions.jsonl'), 'utf8'));
const boundaries  = parseJsonl(fs.readFileSync(path.join(DATA, 'boundaries.jsonl'), 'utf8'));
log(`  loaded ${transitions.length} transition records, ${boundaries.length} boundary records`);

// ---- 3. self-loop accounting (D-009 §8), before claim evaluation --------
const selfLoops = selfLoopAccounting(transitions);
log(`  self-loop assignment records: ${selfLoops.selfLoops} of ${selfLoops.records} ` +
    `(${(100 * selfLoops.selfLoops / selfLoops.records).toFixed(1)}%) ` +
    `${JSON.stringify(selfLoops.bySite)}`);
if (selfLoops.records !== D009_SELF_LOOPS.records ||
    selfLoops.selfLoops !== D009_SELF_LOOPS.total ||
    (selfLoops.bySite.advance || 0) !== D009_SELF_LOOPS.advance ||
    (selfLoops.bySite.goalReset || 0) !== D009_SELF_LOOPS.goalReset) {
    die(`self-loop accounting disagrees with D-009 §8. Recorded there: ` +
        `${D009_SELF_LOOPS.total} of ${D009_SELF_LOOPS.records} ` +
        `(advance ${D009_SELF_LOOPS.advance}, goalReset ${D009_SELF_LOOPS.goalReset}). ` +
        `Observed here: ${selfLoops.selfLoops} of ${selfLoops.records} ` +
        `${JSON.stringify(selfLoops.bySite)}. The discrepancy is NOT reinterpreted.`);
}
log('  self-loop accounting agrees with D-009 §8');

// ---- 4. gaps -------------------------------------------------------------
const { gaps, accounting } = buildGaps(transitions, boundaries);
log(`  gaps ${accounting.gaps} | desync reads ${accounting.desyncReads} | ` +
    `non-desync ${accounting.nonDesyncReads} | reads without a write ${accounting.readsWithoutWrite}`);
if (accounting.emptyGaps > 0)
    die(`${accounting.emptyGaps} DESYNC gaps contain zero position-changing transitions. ` +
        `D-009 §1 records that this is impossible; the discrepancy is NOT reinterpreted.`);
{
    const brokenChain = gaps.filter(g => !g.chainContinuous).length;
    const notReaching = gaps.filter(g => !g.chainReachesRead).length;
    if (brokenChain > 0 || notReaching > 0)
        die(`${brokenChain} gaps have a broken position chain and ${notReaching} do not reach the ` +
            `read position. A record was lost; the evidence is not silently used.`);
}
const originCensus = {};
for (const g of gaps) originCensus[g.origin] = (originCensus[g.origin] || 0) + 1;

// ---- 5. E4 equivalence (D-009 Ruling 2) ---------------------------------
const e4eq = e4EquivalenceCheck(gaps);
if (!e4eq.equivalent)
    die(`E4 and E2 disagree on ${e4eq.disagree} gaps. D-009 Ruling 2 requires record identity, ` +
        `under which they are logically equivalent. The result is NOT adjusted to force agreement.`);
log(`  E4 == E2 on all ${e4eq.gaps} gaps (D-009 Ruling 2 equivalence established, not assumed)`);

// ---- 6. the five claims --------------------------------------------------
const claims = evaluateClaims(gaps);
for (const c of claims)
    log(`  ${c.id}  ${c.verdict.padEnd(11)} counterexamples ${c.counterexampleCount}`);

// ---- 7. result artifact --------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
const result = {
    study: 'Q1',
    analysisVersion: ANALYSIS_VERSION,
    preregistration: PREREG,
    governingDecisions: [...DECISIONS],
    disposition: DISPOSITION,
    dispositionNote:
        'Q1 failed three of four D-006 minimum-evidence conditions (17 accepted configurations ' +
        'vs 20 required; degree5 9 vs 15; degree3 8 vs 15). This disposition applies to ' +
        'distributional characterisation and travels with every claim verdict below. The claims ' +
        'are evaluated by REFUTATION ONLY under D-007. Absence of a counterexample is not ' +
        'confirmation and is never reported as proof of universal truth.',
    frozenParameters: {
        seedLo: FROZEN.seedLo, seedHi: FROZEN.seedHi, agentSeed: FROZEN.agentSeed,
        arm: FROZEN.arm, ticks: FROZEN.ticks,
    },
    digests: { evidence: dataDigests, protocol: protocolDigests },
    transitionDefinition: {
        rule: 'fromPos !== toPos',
        authority: 'D-009 Ruling 1',
        basis: 'Q1 §6 "executed position-changing transition"; Q1 §15.6 "Q1 measures realised ' +
               'position changes only". The committed instrument recorded every executed ' +
               'assignment, a superset; the frozen protocol governs.',
        excludedRecordsRemainInEvidence: true,
    },
    originLabelling: {
        rule: 'the frozen M9 originOf() rule, imported verbatim from experiments/m9/analyze.js',
        authority: 'D-008',
        appliedTo: "Q1's own gap population",
        statement: 'Q1 gaps were classified using the frozen M9 originOf() rule.',
        notReconstruction:
            "M9's historical event population is NOT reconstructed and is not reconstructible: " +
            'M9 event eligibility required the evaluation probe at main.js:3922, which Q1 does ' +
            'not carry. Q1 has its own denominator and its counts are not comparable ' +
            "like-for-like with M9's published proportions.",
        teleportScanScope:
            'ALL assignment records at cap/pool/goalReset, including self-loops, because D-008 §4 ' +
            "requires the ORIGIN inputs to reproduce M8's recorder exactly and M8's onTeleport " +
            'probe fired on every executed assignment. D-009 Ruling 1 narrows "transition" ' +
            'explicitly and only "for the five claims", which is a different computation.',
        originSensitivity: accounting.originSensitivity,
        originSensitivityNote:
            'Number of gaps whose ORIGIN label would change if the teleport scan were restricted ' +
            'to position-changing records. A specification-sensitivity audit quantity, not a ' +
            'claim, not a verdict, and not a scientific result.',
    },
    selfLoopAccounting: {
        ...selfLoops,
        authority: 'D-009 §8',
        note: 'Measurement accounting, not a Q1 transition statistic. These records remain ' +
              'untouched in the raw evidence and do not participate in E1-E5.',
        agreesWithD009: true,
    },
    gapAccounting: { ...accounting, originCensus },
    e4Equivalence: {
        ...e4eq,
        authority: 'D-009 Ruling 2',
        note: 'E4 "equals" is record identity, so E4 is logically equivalent to E2. Established ' +
              'per gap here, not assumed.',
    },
    retired: {
        'Q1 §9.5': {
            statement: 'Gap composition is independent of AGE',
            status: 'RETIRED',
            authority: 'D-007 §4',
            reason: 'Unevaluable as frozen at any sample size: its refuting condition is either ' +
                    'vacuous or requires a threshold Q1 §9 and §10 forbid. Not implemented.',
        },
    },
    permittedNonRefutationWording: NON_REFUTATION_WORDING,
    exemplarCap: EXEMPLAR_CAP,
    exemplarCapNote: 'Counterexample totals are exact. Stored exemplars are capped; ' +
                     'exemplarsTruncated records how many were not stored. No silent truncation.',
    claims,
};
const resultJson = JSON.stringify(result, null, 2) + '\n';
fs.writeFileSync(path.join(OUT, 'q1_claim_results.json'), resultJson);

const sidecar =
`# Q1 FIVE-CLAIM ANALYSIS — INTEGRITY RECORD
#
# Artifact   : experiments/q1/results/q1_claim_results.json
# Study      : Q1 ordered transition composition in DESYNC gaps
# Protocol   : research/preregistrations/Q1_PREREGISTRATION.md ${PREREG}
# Governed by: ${DECISIONS.join(', ')}
# Analysis   : ${ANALYSIS_VERSION}
# Disposition: ${DISPOSITION}
#
# EVIDENCE THIS RESULT IS BOUND TO (verified before any gap was built)
#   transitions.jsonl  ${dataDigests['transitions.jsonl']}
#   boundaries.jsonl   ${dataDigests['boundaries.jsonl']}
#   candidates.jsonl   ${dataDigests['candidates.jsonl']}
#   manifest.json      ${dataDigests['manifest.json']}
#
# Regenerate with : cd experiments/q1 && node run_analysis.js
# Verify with     : cd experiments/q1 && node verify_q1_analysis.js
#
# A mismatch means the result changed after computation. That is a PROTOCOL
# DEVIATION and must be reported with its direction and likely effect -- never
# silently reconciled.
#
${sha(resultJson)}  q1_claim_results.json
`;
fs.writeFileSync(path.join(OUT, 'INTEGRITY.sha256'), sidecar);

log(`  wrote results/q1_claim_results.json (${sha(resultJson).slice(0, 16)})`);
log(`  DISPOSITION: ${DISPOSITION}`);

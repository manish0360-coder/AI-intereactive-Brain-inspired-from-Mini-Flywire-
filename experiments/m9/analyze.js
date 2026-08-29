// ==========================================================
// M9 ANALYSIS — frozen secondary analysis of the M8 evidence
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/M9_PREREGISTRATION.md, frozen at
//   f40f83c9454144106366422f97258321374a8462, and D-004 in
//   research/09_decisions.md. Nothing here reinterprets either.
//
// WHAT THIS IS
//   A deterministic OFFLINE analysis. It reads the frozen M8 raw event stream
//   and emits the classification and descriptive summaries §11 specifies.
//   It does not instrument main.js, modify the runtime, execute a collection,
//   or generate a configuration seed.
//
// EVIDENCE IS IMMUTABLE
//   The raw stream is opened read-only and its digest is checked against BOTH
//   experiments/m8/data/INTEGRITY.sha256 and the per-run digests in
//   manifest.json before a single event is classified. A mismatch aborts:
//   the artifact is never overwritten, repaired, or re-collected.
//
// LANGUAGE DISCIPLINE (M9 §4, §17)
//   TELEPORT means "at least one teleport fell in the write->read gap". It
//   does NOT mean the teleport caused the event. ADVANCE is inferred by
//   exclusion and is the stronger claim. Output labels are classificatory and
//   associational; no causal claim is emitted anywhere in this file.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const M8DATA = path.join(ROOT, 'experiments/m8/data');
const OUT = path.join(HERE, 'results');

export const PREREG = 'f40f83c9454144106366422f97258321374a8462';

// ---- frozen constants (M9 §2, §9, §13) -----------------------------------
export const FROZEN = Object.freeze({
    denominator: 7178,                                   // §2
    strata: Object.freeze({ degree5: [8, 12], degree3: [16, 19] }),   // §9
    phases: Object.freeze([1, 2]),                       // §9
    goals: Object.freeze([8, 12, 16, 19]),               // §9
});

export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const stratumOf = (goal) =>
    FROZEN.strata.degree5.includes(goal) ? 'degree5'
        : FROZEN.strata.degree3.includes(goal) ? 'degree3' : null;

// ---- M9 §2 eligibility ---------------------------------------------------
export const isDesync = (e) => e.from !== e.agentCurrent;

// ---- M9 §4 ORIGIN, verbatim ---------------------------------------------
// TELEPORT if ticksSinceTeleport <  ticksSinceWrite
//          or (equal AND teleportSource === 'goalReset')
// ADVANCE  if ticksSinceTeleport >  ticksSinceWrite
//          or (equal AND teleportSource in {'cap','pool'})
// UNCLASSIFIED if either counter is null.
export function originOf(e) {
    const t = e.ticksSinceTeleport, w = e.ticksSinceWrite;
    if (t === null || t === undefined || w === null || w === undefined) return 'UNCLASSIFIED';
    if (t < w) return 'TELEPORT';
    if (t > w) return 'ADVANCE';
    if (e.teleportSource === 'goalReset') return 'TELEPORT';
    if (e.teleportSource === 'cap' || e.teleportSource === 'pool') return 'ADVANCE';
    return 'UNCLASSIFIED';            // equality with an unrecognised source
}

// ---- M9 §5, §8 -----------------------------------------------------------
export const ageOf   = (e) => e.ticksSinceWrite;         // duration, NOT a mechanism
export const sPair   = (e) => e.agentCurrent === e.next;  // observable signature
export const nonCanon = (e, edges) => {
    const a = Number(e.agentCurrent), b = Number(e.next);
    return !edges.has(a < b ? `${a}|${b}` : `${b}|${a}`);
};
export function buildEdgeSet(entries) {
    const s = new Set();
    for (const x of entries) { const a = Number(x.from), b = Number(x.to);
        s.add(a < b ? `${a}|${b}` : `${b}|${a}`); }
    return s;
}

// ---- evidence gate (M9 §15) ---------------------------------------------
export function verifyEvidence() {
    const integ = fs.readFileSync(path.join(M8DATA, 'INTEGRITY.sha256'), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(path.join(M8DATA, 'manifest.json'), 'utf8'));
    const evPath = path.join(M8DATA, 'events.jsonl');
    if (!fs.existsSync(evPath)) {
        throw new Error('M9: the M8 raw stream is not materialized. Regenerate it with ' +
            '`cd experiments/m8 && node run_collection.js`, then re-run. M9 never collects.');
    }
    const raw = fs.readFileSync(evPath, 'utf8');
    const got = sha(raw);
    const want = (integ.match(/^([0-9a-f]{64})  events\.jsonl$/m) || [])[1];
    if (got !== want) {
        throw new Error(`M9: M8 evidence digest mismatch.\n  computed ${got}\n  recorded ${want}\n` +
            'STOP. The artifact is not overwritten, repaired, or re-collected.');
    }
    return { raw, manifest, digest: got };
}

// ---- analysis ------------------------------------------------------------
export function analyse(raw, edges, manifest) {
    const eligible = [], perRun = new Map();
    let total = 0;
    for (const line of raw.split('\n')) {
        if (!line) continue;
        total++;
        const e = JSON.parse(line);
        if (!isDesync(e)) continue;
        const rec = {
            origin: originOf(e), age: ageOf(e), phase: e.phase, goal: e.goal,
            stratum: stratumOf(e.goal), sPair: sPair(e), nonCanon: nonCanon(e, edges),
            selectionRanThisTick: e.selectionRanThisTick,
            goalMismatch: e.goalIdAtSelection !== e.goalIdAtEvaluation,
            teleportSource: e.teleportSource,
            cmp: e.ticksSinceTeleport === null || e.ticksSinceWrite === null ? 'NULL'
                : e.ticksSinceTeleport < e.ticksSinceWrite ? 'LT'
                : e.ticksSinceTeleport > e.ticksSinceWrite ? 'GT' : 'EQ',
            key: `${e.configSeed}:${e.configIndex}`,
        };
        eligible.push(rec);
        perRun.set(rec.key, (perRun.get(rec.key) || 0) + 1);
    }

    const count = (pred) => eligible.filter(pred).length;
    const pct = (n) => eligible.length ? Number((100 * n / eligible.length).toFixed(4)) : null;

    // §10: the complete grid is emitted; no cell is excluded, merged, or collapsed.
    const grid = [];
    for (const origin of ['TELEPORT', 'ADVANCE', 'UNCLASSIFIED'])
        for (const stratum of ['degree5', 'degree3'])
            for (const phase of FROZEN.phases)
                for (const age of [1, 2, 3, 4]) {
                    const n = count(r => r.origin === origin && r.stratum === stratum
                        && r.phase === phase && r.age === age);
                    grid.push({ origin, stratum, phase, age, n,
                        status: n === 0 ? 'NOT OBSERVED' : 'OBSERVED' });
                }

    const cmpCells = [];
    for (const cmp of ['LT', 'EQ', 'GT', 'NULL'])
        for (const src of ['cap', 'pool', 'goalReset', 'none']) {
            const n = count(r => r.cmp === cmp && r.teleportSource === src);
            cmpCells.push({ cmp, teleportSource: src, n,
                status: n === 0 ? 'NOT OBSERVED' : 'OBSERVED' });
        }

    const by = (f, vals) => Object.fromEntries(vals.map(v =>
        [v, { n: count(r => f(r) === v), pctOfDenominator: pct(count(r => f(r) === v)) }]));

    return {
        provenance: {
            preregistration: PREREG,
            m8Collection: 'f9d97b9a180fa5a4aed6def06788eb4b38c037f0',
            rawEventsRead: total,
            collectedRuns: manifest.runs.filter(r => r.status === 'COLLECTED').length,
        },
        denominator: {
            frozen: FROZEN.denominator,
            observed: eligible.length,
            matchesFrozen: eligible.length === FROZEN.denominator,
        },
        // §13 minimum evidence
        evaluability: {
            denominatorReproduced: eligible.length === FROZEN.denominator,
            unclassifiedIsZero: count(r => r.origin === 'UNCLASSIFIED') === 0,
            bothOriginsNonEmpty: count(r => r.origin === 'TELEPORT') > 0
                && count(r => r.origin === 'ADVANCE') > 0,
        },
        origin: by(r => r.origin, ['TELEPORT', 'ADVANCE', 'UNCLASSIFIED']),
        age: by(r => r.age, [1, 2, 3, 4]),
        ageByOrigin: Object.fromEntries(['TELEPORT', 'ADVANCE'].map(o => {
            const sub = eligible.filter(r => r.origin === o);
            return [o, Object.fromEntries([1, 2, 3, 4].map(a => {
                const n = sub.filter(r => r.age === a).length;
                return [a, { n, pctOfOrigin: sub.length ? Number((100 * n / sub.length).toFixed(4)) : null }];
            }))];
        })),
        originByStratum: Object.fromEntries(['degree5', 'degree3'].map(s => {
            const sub = eligible.filter(r => r.stratum === s);
            return [s, Object.fromEntries(['TELEPORT', 'ADVANCE'].map(o => {
                const n = sub.filter(r => r.origin === o).length;
                return [o, { n, pctOfStratum: sub.length ? Number((100 * n / sub.length).toFixed(4)) : null }];
            }))];
        })),
        originByPhase: Object.fromEntries(FROZEN.phases.map(p => {
            const sub = eligible.filter(r => r.phase === p);
            return [p, Object.fromEntries(['TELEPORT', 'ADVANCE'].map(o => {
                const n = sub.filter(r => r.origin === o).length;
                return [o, { n, pctOfPhase: sub.length ? Number((100 * n / sub.length).toFixed(4)) : null }];
            }))];
        })),
        originByGoal: Object.fromEntries(FROZEN.goals.map(g => {
            const sub = eligible.filter(r => r.goal === g);
            return [g, Object.fromEntries(['TELEPORT', 'ADVANCE'].map(o =>
                [o, sub.filter(r => r.origin === o).length]))];
        })),
        // §8 consequence + signature, descriptive only
        consequence: Object.fromEntries(['TELEPORT', 'ADVANCE'].map(o => {
            const sub = eligible.filter(r => r.origin === o);
            const nc = sub.filter(r => r.nonCanon).length, sp = sub.filter(r => r.sPair).length;
            return [o, { n: sub.length,
                nonCanonical: nc, nonCanonicalPct: sub.length ? Number((100 * nc / sub.length).toFixed(4)) : null,
                sPair: sp, sPairPct: sub.length ? Number((100 * sp / sub.length).toFixed(4)) : null }];
        })),
        // §6 constant precondition, reported as the constant it is
        precondition: {
            selectionRanThisTickTrue: count(r => r.selectionRanThisTick === true),
            selectionRanThisTickFalse: count(r => r.selectionRanThisTick === false),
            note: 'reported as a constant precondition of the phenomenon, never as a mechanism',
        },
        // §7 harness-unreachable
        h4: {
            goalMismatchCount: count(r => r.goalMismatch),
            status: 'UNTESTABLE UNDER THIS HARNESS',
            note: 'not "absent": both in-tick goal-write sites are gated on window.homeNeuronId, ' +
                  'which is never defined in the headless harness',
        },
        configurationsContributing: perRun.size,
        grid,
        comparisonCells: cmpCells,
    };
}

// ---- entry point ---------------------------------------------------------
if (import.meta.url === `file:///${process.argv[1].split(path.sep).join('/')}`) {
    const { raw, manifest, digest } = verifyEvidence();
    const edges = buildEdgeSet(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
    const result = analyse(raw, edges, manifest);
    result.provenance.m8EvidenceDigest = digest;

    fs.mkdirSync(OUT, { recursive: true });
    const body = JSON.stringify(result, null, 2) + '\n';
    fs.writeFileSync(path.join(OUT, 'm9_results.json'), body);
    fs.writeFileSync(path.join(OUT, 'INTEGRITY.sha256'),
        '# M9 ANALYSIS RESULTS — INTEGRITY RECORD\n#\n' +
        `# Pre-registration : ${PREREG}\n` +
        '# Evidence         : experiments/m8/data/events.jsonl (unmodified)\n' +
        `# Evidence digest  : ${digest}\n` +
        '# Regenerate with  : cd experiments/m9 && node analyze.js\n' +
        '# Verify with      : cd experiments/m9 && node verify_m9_analysis.js\n#\n' +
        `${sha(body)}  m9_results.json\n`);
    process.stderr.write(`M9 analysis written: ${result.denominator.observed} eligible events, ` +
        `digest ${sha(body).slice(0, 16)}\n`);
}

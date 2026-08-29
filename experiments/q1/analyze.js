// ==========================================================
// Q1 FIVE-CLAIM ANALYSIS — frozen existence/refutation evaluation
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/Q1_PREREGISTRATION.md, frozen at
//   0ad12fe2f190645d2126c9e55aef4f270f853009, as adjudicated by
//   D-007 (which claims may be evaluated), D-008 (what "TELEPORT-classified"
//   means) and D-009 (what a transition is, and what E4's "equals" means).
//   Nothing here reinterprets any of them.
//
// WHAT THIS IS
//   A deterministic OFFLINE evaluation of the five authorised Q1 §9
//   existence claims, by REFUTATION ONLY, against the frozen Q1 evidence.
//   It instruments nothing, executes no collection, and generates no seed.
//
// WHAT THIS IS NOT
//   No distributional characterisation. No GAP_COMPOSITION frequency table,
//   no ORIGIN proportion, no AGE distribution, no transition-count
//   distribution. No threshold, p-value, interval, model, significance test
//   or effect size — Q1 §10 forbids them and D-007/D-008/D-009 add none.
//   Q1 §9.5 (AGE independence) is RETIRED by D-007 §4 and is not implemented.
//   No causal language: Q1 §7's ban on "proximate cause" is absolute.
//
// Q1's DISPOSITION TRAVELS WITH EVERY RESULT
//   Q1 is INCONCLUSIVE — INSUFFICIENT MATERIAL. Absence of a counterexample
//   is NEVER confirmation. See DISPOSITION and the D-007 §6 wording rules.
//
// EVIDENCE IS IMMUTABLE
//   The caller verifies every digest before a single gap is built. Nothing
//   here writes to, filters, or repairs the raw streams.
// ==========================================================
import { originOf } from '../m9/analyze.js';

export const ANALYSIS_VERSION = '1.0.0';

export const PREREG   = '0ad12fe2f190645d2126c9e55aef4f270f853009';
export const DECISIONS = Object.freeze(['D-007', 'D-008', 'D-009']);

export const DISPOSITION = 'INCONCLUSIVE — INSUFFICIENT MATERIAL';

// The permitted non-refutation wording, mandated verbatim by D-007 §6.
export const NON_REFUTATION_WORDING =
    'no counterexample observed in 17 accepted configurations drawn from 9 distinct configuration seeds';

// M8 instrumented exactly these three as teleports; `advance` was never a
// teleport in M8's ontology (D-008 §4 property 4).
export const TELEPORT_SITES = Object.freeze(['cap', 'pool', 'goalReset']);

// ---- D-009 Ruling 1 ------------------------------------------------------
// A transition, FOR THE FIVE CLAIMS, is a record that realises a position
// change. Q1 §6 says "one record per executed POSITION-CHANGING transition";
// §15.6 says "Q1 measures realised position changes only". The committed
// instrument recorded every executed assignment, a superset, so the frozen
// protocol governs and the surplus records are excluded HERE — never from the
// evidence, which is untouched and reported separately.
export const isTransition = (r) => r.fromPos !== r.toPos;
export const isSelfLoop   = (r) => r.fromPos === r.toPos;

// ---- the five frozen claims, quoted verbatim from Q1 §9 -----------------
// Statement and refutation condition are the frozen text. `evaluate` is the
// operational encoding of that refutation condition and nothing else.
export const CLAIMS = Object.freeze([
    Object.freeze({
        id: 'E1',
        statement: 'TELEPORT-classified gaps contain only teleports',
        refutedBy: 'any such gap containing an `advance` record',
        needsOrigin: true,
        evaluate: (g) => g.origin === 'TELEPORT' && g.composition.includes('advance'),
    }),
    Object.freeze({
        id: 'E2',
        statement: 'Every gap contains exactly one transition',
        refutedBy: 'any gap with `TRANSITION_COUNT` ≥ 2',
        needsOrigin: false,
        evaluate: (g) => g.transitionCount >= 2,
    }),
    Object.freeze({
        id: 'E3',
        statement: 'The last transition in a TELEPORT-classified gap is always the teleport',
        refutedBy: 'any such gap whose `LAST_TRANSITION_BEFORE_EVALUATION` is `advance`',
        needsOrigin: true,
        evaluate: (g) => g.origin === 'TELEPORT' && g.lastTransition !== null
                         && g.lastTransition.site === 'advance',
    }),
    Object.freeze({
        id: 'E4',
        statement: '`FIRST_DIVERGING_TRANSITION` always equals `LAST_TRANSITION_BEFORE_EVALUATION`',
        refutedBy: 'any gap where they differ',
        needsOrigin: false,
        // D-009 Ruling 2: "equals" is RECORD IDENTITY, never site or type
        // equality. Records are identified by their global `seq`, which is
        // unique within a run by construction.
        evaluate: (g) => g.firstTransition !== null && g.lastTransition !== null
                         && g.firstTransition.seq !== g.lastTransition.seq,
    }),
    Object.freeze({
        id: 'E5',
        statement: 'ADVANCE-classified gaps are single-transition',
        refutedBy: 'any such gap with `TRANSITION_COUNT` ≥ 2',
        needsOrigin: true,
        evaluate: (g) => g.origin === 'ADVANCE' && g.transitionCount >= 2,
    }),
]);

export const runKey = (r) => `${r.configSeed}:${r.configIndex}`;

// ---- self-loop accounting (D-009 §8) ------------------------------------
// A measurement-accounting quantity, not a Q1 transition statistic. Reported
// so the exclusion is transparent rather than silent.
export function selfLoopAccounting(transitions) {
    const bySite = {};
    let total = 0;
    for (const r of transitions) {
        if (!isSelfLoop(r)) continue;
        total++;
        bySite[r.site] = (bySite[r.site] || 0) + 1;
    }
    return { records: transitions.length, selfLoops: total,
             bySite: Object.fromEntries(Object.entries(bySite).sort()) };
}

// ---- gap construction ----------------------------------------------------
// Ordering comes ENTIRELY from the recorded monotonic `seq`. No source-code
// ordering assumption is used anywhere: the whole point of §6's `seq` field is
// that ordering is observed rather than inferred.
//
// A gap is delimited by the frozen §3 boundaries: it opens at a write record
// (main.js:2635) and closes at a read record (main.js:3819) on which DESYNC
// holds. DESYNC is the frozen §2 predicate `lastReasoning.from !== agentCurrent`,
// strict identity, inherited unchanged from M8 §2.
//
// ORIGIN INPUTS — D-008 §4, and the ONE place self-loops still count.
//   D-008 §4 requires the three ORIGIN inputs to reproduce M8's recorder
//   EXACTLY. M8's onTeleport probe fired on every EXECUTED assignment at the
//   three teleport anchors, including ones that realised no position change,
//   so an exact emulation must scan ALL assignment records. D-009 Ruling 1
//   narrows "transition" explicitly and only "for the five claims", which is
//   a different computation. Both decisions are applied in their own stated
//   scope; neither is widened.
//   `originSensitivity` below measures whether that distinction changes any
//   label, so the question is answered by evidence rather than assertion.
export function buildGaps(transitions, boundaries) {
    const runs = new Map();
    const touch = (k) => { if (!runs.has(k)) runs.set(k, []); return runs.get(k); };
    for (const t of transitions) touch(runKey(t)).push({ ...t, _kind: 'transition' });
    for (const b of boundaries)  touch(runKey(b)).push({ ...b, _kind: b.kind });

    const gaps = [];
    const acct = { runs: 0, reads: 0, desyncReads: 0, nonDesyncReads: 0,
                   readsWithoutWrite: 0, gaps: 0, emptyGaps: 0, originSensitivity: 0 };

    for (const key of [...runs.keys()].sort()) {
        acct.runs++;
        const recs = runs.get(key).sort((a, b) => a.seq - b.seq);

        let write = null;              // most recent write boundary
        let sinceWrite = [];           // transition records since that write
        let telAll = null;             // most recent teleport-site record, ANY
        let telPC  = null;             // most recent teleport-site record, position-changing

        for (const r of recs) {
            if (r._kind === 'transition') {
                if (write !== null) sinceWrite.push(r);
                if (TELEPORT_SITES.includes(r.site)) {
                    telAll = r;
                    if (isTransition(r)) telPC = r;
                }
                continue;
            }
            if (r._kind === 'write') { write = r; sinceWrite = []; continue; }
            if (r._kind !== 'read') continue;

            acct.reads++;
            if (write === null) { acct.readsWithoutWrite++; continue; }
            if (r.from === r.agentCurrent) { acct.nonDesyncReads++; continue; }
            acct.desyncReads++;

            // §7 derived observables, over D-009-qualifying transitions only.
            const kept = sinceWrite.filter(isTransition);
            const dropped = sinceWrite.length - kept.length;

            // D-008 §4: emulate M8's recorder exactly.
            const ticksSinceWrite = r.tickIndex - write.tickIndex;
            const ticksSinceTeleport = telAll === null ? null : r.tickIndex - telAll.tickIndex;
            const teleportSource = telAll === null ? 'none' : telAll.site;
            const origin = originOf({ ticksSinceTeleport, ticksSinceWrite, teleportSource });

            // Audit only: would restricting the teleport scan to position-changing
            // records change the label? Not a claim, not a verdict, not reported
            // as science — a specification-sensitivity measurement.
            const altT = telPC === null ? null : r.tickIndex - telPC.tickIndex;
            const altS = telPC === null ? 'none' : telPC.site;
            if (originOf({ ticksSinceTeleport: altT, ticksSinceWrite, teleportSource: altS })
                !== origin) acct.originSensitivity++;

            const gap = {
                runKey: key, configSeed: r.configSeed, configIndex: r.configIndex,
                stratum: r.stratum,
                writeSeq: write.seq, readSeq: r.seq,
                writeTick: write.tickIndex, readTick: r.tickIndex,
                ticksSinceWrite, ticksSinceTeleport, teleportSource, origin,
                recordsInWindow: sinceWrite.length,
                selfLoopsExcluded: dropped,
                transitionCount: kept.length,
                composition: kept.map(t => t.site),
                firstTransition: kept.length ? { seq: kept[0].seq, site: kept[0].site,
                                                 fromPos: kept[0].fromPos, toPos: kept[0].toPos } : null,
                lastTransition: kept.length ? { seq: kept[kept.length - 1].seq,
                                                site: kept[kept.length - 1].site,
                                                fromPos: kept[kept.length - 1].fromPos,
                                                toPos: kept[kept.length - 1].toPos } : null,
                // §6 integrity: the chain must be continuous across the KEPT
                // records plus the write-time position. A break means a record
                // was lost, which §6's fromPos field exists to expose.
                chainContinuous: kept.every((t, i) =>
                    i === 0 ? t.fromPos === write.from : t.fromPos === kept[i - 1].toPos),
                chainReachesRead: kept.length > 0
                    && kept[kept.length - 1].toPos === r.agentCurrent,
            };
            if (gap.transitionCount === 0) acct.emptyGaps++;
            gaps.push(gap);
            acct.gaps++;
        }
    }
    return { gaps, accounting: acct };
}

// ---- claim evaluation ----------------------------------------------------
// REFUTATION ONLY. A counterexample refutes. Its absence is reported as
// NOT REFUTED and is never upgraded to confirmation (D-007 §6).
export const EXEMPLAR_CAP = 5;   // exemplars stored per claim; totals are exact

export function evaluateClaims(gaps) {
    return CLAIMS.map((c) => {
        const hits = gaps.filter(c.evaluate);
        return {
            id: c.id,
            statement: c.statement,
            refutedBy: c.refutedBy,
            usesOriginLabel: c.needsOrigin,
            counterexampleCount: hits.length,
            verdict: hits.length > 0 ? 'REFUTED' : 'NOT REFUTED',
            statement_if_not_refuted: hits.length > 0 ? null : NON_REFUTATION_WORDING,
            disposition: DISPOSITION,
            exemplarCap: EXEMPLAR_CAP,
            exemplarsTruncated: Math.max(0, hits.length - EXEMPLAR_CAP),
            exemplars: hits.slice(0, EXEMPLAR_CAP).map(g => ({
                runKey: g.runKey, writeSeq: g.writeSeq, readSeq: g.readSeq,
                writeTick: g.writeTick, readTick: g.readTick,
                origin: g.origin, teleportSource: g.teleportSource,
                ticksSinceWrite: g.ticksSinceWrite, ticksSinceTeleport: g.ticksSinceTeleport,
                transitionCount: g.transitionCount, composition: g.composition,
                selfLoopsExcluded: g.selfLoopsExcluded,
                firstTransition: g.firstTransition, lastTransition: g.lastTransition,
            })),
        };
    });
}

// ---- D-009 Ruling 2: E4 is logically equivalent to E2 -------------------
// Established per gap rather than asserted. A disagreement is a gate failure,
// never something to reconcile.
export function e4EquivalenceCheck(gaps) {
    let agree = 0;
    const disagreements = [];
    const e2 = CLAIMS.find(c => c.id === 'E2').evaluate;
    const e4 = CLAIMS.find(c => c.id === 'E4').evaluate;
    for (const g of gaps) {
        if (e2(g) === e4(g)) agree++;
        else if (disagreements.length < EXEMPLAR_CAP)
            disagreements.push({ runKey: g.runKey, readSeq: g.readSeq,
                                 transitionCount: g.transitionCount,
                                 firstSeq: g.firstTransition && g.firstTransition.seq,
                                 lastSeq: g.lastTransition && g.lastTransition.seq });
    }
    return { gaps: gaps.length, agree, disagree: gaps.length - agree, disagreements,
             equivalent: agree === gaps.length };
}

// ---- parsing -------------------------------------------------------------
export const parseJsonl = (text) => {
    const out = [];
    for (const line of text.split('\n')) if (line) out.push(JSON.parse(line));
    return out;
};

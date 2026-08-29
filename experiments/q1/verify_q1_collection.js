// ==========================================================
// Q1 COLLECTION GATE — adversarial verification of the raw evidence
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/Q1_PREREGISTRATION.md, frozen at 0ad12fe.
//   Collection parameters ratified by D-006, committed at 612c69c.
//
// WHAT THIS GATE ESTABLISHES
//   The collected evidence is COMPLETE and UNCORRUPTED: candidate accounting
//   closes exactly over the frozen range, every seed and every goal index is
//   present, no seed outside the frozen range was ever touched, every accepted
//   configuration carries a full raw record stream, the frozen instrumentation
//   integrity controls hold on every run, the artifact digests match, and a
//   collected configuration reproduces bit-identically on an independent re-run.
//
// WHAT THIS GATE IS NOT
//   It computes no Q1 scientific result. The only figures it produces are the
//   three pre-declared D-006 §1 E sufficiency counts, recomputed INDEPENDENTLY
//   from the raw streams and required to agree with the manifest. No
//   GAP_COMPOSITION, no FIRST_DIVERGING_TRANSITION, no
//   LAST_TRANSITION_BEFORE_EVALUATION, no TRANSITION_COUNT, no ORIGIN, no AGE,
//   no mechanism frequency, no statistic, no causal label.
//
//   It REFUSES to run without the raw streams rather than passing on partial
//   evidence.
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, TRANSITION_FIELDS, TRANSITION_SITES, BOUNDARY_KINDS,
         inFrozenRange, isConsumed, isHeldOut, stratumOf, ACCEPTANCE_CHECKS,
         evaluateSufficiency } from './protocol.js';
import { collectOne, toJsonl } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DATA = path.join(HERE, 'data');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

for (const f of ['transitions.jsonl', 'boundaries.jsonl', 'candidates.jsonl',
                 'manifest.json', 'INTEGRITY.sha256']) {
    if (!fs.existsSync(path.join(DATA, f))) {
        console.error(`Q1: ${f} is missing. This gate refuses to run on partial evidence.\n` +
                      `Regenerate with: cd experiments/q1 && node run_collection.js`);
        process.exit(2);
    }
}

console.log('==============================================================');
console.log(' Q1 COLLECTION GATE — raw evidence integrity');
console.log(` frozen range ${FROZEN.seedLo}-${FROZEN.seedHi} | agent ${FROZEN.agentSeed} | ` +
            `arm ${FROZEN.arm} | ${FROZEN.ticks} ticks`);
console.log('==============================================================');

const manifest = JSON.parse(fs.readFileSync(path.join(DATA, 'manifest.json'), 'utf8'));
const candRaw  = fs.readFileSync(path.join(DATA, 'candidates.jsonl'), 'utf8');
const candidates = candRaw.split('\n').filter(Boolean).map(l => JSON.parse(l));

// ==========================================================
console.log('\n===== A  candidate accounting closes exactly ==================');
// ==========================================================
const EXPECTED = (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length;
ok('A1 the candidate table holds exactly 500 seeds x 4 goal indices',
   candidates.length === EXPECTED, `${candidates.length} of ${EXPECTED}`);
{
    const bySeed = new Map();
    for (const c of candidates) {
        if (!bySeed.has(c.configSeed)) bySeed.set(c.configSeed, new Set());
        bySeed.get(c.configSeed).add(c.configIndex);
    }
    let missing = 0, wrongArity = 0;
    for (let s = FROZEN.seedLo; s <= FROZEN.seedHi; s++) {
        const idx = bySeed.get(s);
        if (!idx) { missing++; continue; }
        if (idx.size !== FROZEN.goalIndices.length ||
            !FROZEN.goalIndices.every(i => idx.has(i))) wrongArity++;
    }
    ok('A2 EVERY seed in the frozen range appears', missing === 0,
       `${bySeed.size} distinct seeds, 0 missing`);
    ok('A3 EXACTLY four candidates per seed, one per frozen goal index',
       wrongArity === 0 && bySeed.size === FROZEN.seedHi - FROZEN.seedLo + 1);
}
{
    const disp = {};
    for (const c of candidates) disp[c.disposition] = (disp[c.disposition] || 0) + 1;
    const collected = disp.COLLECTED || 0, rejected = disp.REJECTED || 0;
    ok('A4 accepted and rejected counts close against the total',
       collected + rejected + (disp.FAILED || 0) === candidates.length,
       JSON.stringify(disp));
    ok('A5 NO candidate was left PENDING', !disp.PENDING, 'every candidate reached a terminal state');
    ok('A6 NO configuration FAILED', !disp.FAILED,
       disp.FAILED ? candidates.filter(c => c.disposition === 'FAILED')
                       .map(c => `${c.configSeed}:${c.configIndex} ${c.reason}`).join(' | ')
                   : 'no run aborted');
    // The reason must name ONLY real acceptance checks. env.evaluateConstraints
    // also returns numeric diagnostics that are never `true`; listing those would
    // make the reason field actively misleading rather than merely verbose.
    const reasonOK = (c) => {
        const m = /^acceptance predicate failed: (\S+)$/.exec(c.reason || '');
        if (!m) return false;
        const named = m[1].split(',');
        return named.length > 0 && named.every(k => ACCEPTANCE_CHECKS.includes(k));
    };
    ok('A7 every rejection names ONLY real failing acceptance checks',
       candidates.filter(c => c.disposition === 'REJECTED').every(reasonOK),
       `${rejected} rejections, each naming a subset of ${ACCEPTANCE_CHECKS.join('/')}`);
    ok('A8 the manifest accounting agrees with the candidate table',
       manifest.accounting.candidates === candidates.length &&
       manifest.accounting.dispositions.COLLECTED === collected &&
       manifest.accounting.problems.length === 0,
       `manifest reports ${JSON.stringify(manifest.accounting.dispositions)}`);
}

// ==========================================================
console.log('\n===== B  seed boundaries — zero violations ====================');
// ==========================================================
{
    const seeds = [...new Set(candidates.map(c => c.configSeed))];
    ok('B1 ZERO out-of-range seeds appear anywhere in the candidate table',
       seeds.every(inFrozenRange), `${seeds.length} seeds, ${Math.min(...seeds)}-${Math.max(...seeds)}`);
    ok('B2 ZERO consumed M7/M8 seeds were touched', !seeds.some(isConsumed),
       'M8 899500-899999, M7 900000-900029 and 900030-900499 all untouched');
    ok('B3 ZERO seeds at or above the held-out floor 900500', !seeds.some(isHeldOut),
       'the held-out block was never generated, evaluated or inspected');
    const runSeeds = manifest.runs.flatMap(r => r.evaluatedSeeds);
    ok('B4 every RUN evaluated exactly its own seed and advanced zero',
       manifest.runs.every(r => r.evaluatedSeeds.length === 1 &&
                                r.evaluatedSeeds[0] === r.configSeed),
       `${manifest.runs.length} runs, no forward acceptance walk`);
    ok('B5 no run touched a seed outside the frozen range',
       runSeeds.every(inFrozenRange) && !runSeeds.some(isConsumed) && !runSeeds.some(isHeldOut));
    ok('B6 the manifest seed census spans exactly the frozen range',
       manifest.seedCensus.min === FROZEN.seedLo && manifest.seedCensus.max === FROZEN.seedHi &&
       manifest.seedCensus.evaluatedMin >= FROZEN.seedLo &&
       manifest.seedCensus.evaluatedMax <= FROZEN.seedHi,
       `${manifest.seedCensus.min}-${manifest.seedCensus.max}, ` +
       `env evaluated ${manifest.seedCensus.evaluatedByEnv} seeds in ` +
       `${manifest.seedCensus.evaluatedMin}-${manifest.seedCensus.evaluatedMax}`);
}

// ==========================================================
console.log('\n===== P  frozen parameters on every collected run =============');
// ==========================================================
ok('P1 every run used the frozen agent seed, arm and tick budget',
   manifest.runs.every(r => r.used.agentSeed === FROZEN.agentSeed &&
                            r.used.arm === FROZEN.arm && r.used.ticks === FROZEN.ticks &&
                            r.agentSeed === FROZEN.agentSeed && r.arm === FROZEN.arm &&
                            r.ticks === FROZEN.ticks),
   `agent ${FROZEN.agentSeed}, arm ${FROZEN.arm}, ${FROZEN.ticks} ticks, read back from each run`);
ok('P2 no run was marked as an implementation fixture',
   manifest.runs.every(r => r.fixture === false), 'every record is measurement, not fixture');
ok('P3 every run is pinned to the frozen pre-registration and D-006',
   manifest.runs.every(r => r.preregistration === FROZEN.preregistration &&
                            r.decision === FROZEN.decision) &&
   manifest.instrumentation === FROZEN.instrumentation,
   `${FROZEN.preregistration.slice(0, 7)} / ${FROZEN.decision} / ` +
   `${FROZEN.instrumentation.slice(0, 7)}`);
ok('P4 the goal of every run matches the frozen §3.7 schedule and its stratum',
   manifest.runs.every(r => r.goal === [8, 12, 16, 19][r.configIndex] &&
                            r.stratum === stratumOf(r.goal)));

// ==========================================================
console.log('\n===== R  raw evidence: completeness and integrity =============');
// ==========================================================
// Streams are read once and reduced to per-run aggregates; no scientific
// quantity is derived from them.
const runKey = (r) => `${r.configSeed}:${r.configIndex}`;
// A stored line is {...runIdentity, ...record}. The closed-schema check must
// therefore be against the exact UNION, in both directions: counting only known
// keys would let an added field through, which §6 forbids just as firmly as a
// dropped one.
const IDENTITY_FIELDS = ['configSeed', 'configIndex', 'goal', 'stratum', 'agentSeed', 'arm',
                         'ticks', 'preregistration', 'decision', 'fixture'];
const TRANSITION_LINE = new Set([...IDENTITY_FIELDS, ...TRANSITION_FIELDS]);
const agg = new Map();
for (const r of manifest.runs) agg.set(runKey(r), {
    transitions: 0, boundaries: 0, seqs: new Set(), dupSeq: 0, chainBreaks: 0,
    badSchema: 0, badSite: 0, badKind: 0, lastToPos: undefined, first: true,
    sites: {}, reads: 0, desync: 0, maxSeq: -1, monotonic: true, lastSeq: -1,
});

let orphanT = 0, orphanB = 0;
for (const line of fs.readFileSync(path.join(DATA, 'transitions.jsonl'), 'utf8').split('\n')) {
    if (!line) continue;
    const t = JSON.parse(line);
    const a = agg.get(runKey(t));
    if (!a) { orphanT++; continue; }
    a.transitions++;
    const keys = Object.keys(t);
    if (keys.length !== TRANSITION_LINE.size || !keys.every(k => TRANSITION_LINE.has(k))
        || !TRANSITION_FIELDS.every(k => k in t)) a.badSchema++;
    if (!TRANSITION_SITES.includes(t.site)) a.badSite++;
    a.sites[t.site] = (a.sites[t.site] || 0) + 1;
    if (a.seqs.has(t.seq)) a.dupSeq++; else a.seqs.add(t.seq);
    if (t.seq <= a.lastSeq) a.monotonic = false;
    a.lastSeq = t.seq; a.maxSeq = Math.max(a.maxSeq, t.seq);
    if (!a.first && t.fromPos !== a.lastToPos) a.chainBreaks++;
    a.lastToPos = t.toPos; a.first = false;
}
for (const line of fs.readFileSync(path.join(DATA, 'boundaries.jsonl'), 'utf8').split('\n')) {
    if (!line) continue;
    const b = JSON.parse(line);
    const a = agg.get(runKey(b));
    if (!a) { orphanB++; continue; }
    a.boundaries++;
    if (!BOUNDARY_KINDS.includes(b.kind)) a.badKind++;
    if (a.seqs.has(b.seq)) a.dupSeq++; else a.seqs.add(b.seq);
    a.maxSeq = Math.max(a.maxSeq, b.seq);
    if (b.kind === 'read') { a.reads++; if (b.from !== b.agentCurrent) a.desync++; }
}

const A = [...agg.values()];
ok('R1 every record belongs to a manifest run — no orphan record',
   orphanT === 0 && orphanB === 0, `${orphanT} orphan transitions, ${orphanB} orphan boundaries`);
ok('R2 EVERY accepted configuration carries a non-empty record stream',
   A.every(a => a.transitions > 0 && a.boundaries > 0),
   `${A.length} runs, min ${Math.min(...A.map(a => a.transitions))} transitions`);
ok('R3 per-run record counts match the manifest exactly',
   manifest.runs.every(r => { const a = agg.get(runKey(r));
       return a.transitions === r.transitions && a.boundaries === r.boundaries; }),
   'no record lost or added between collection and storage');
ok('R4 every transition line carries EXACTLY the closed schema, no field added or dropped',
   A.every(a => a.badSchema === 0),
   `${TRANSITION_FIELDS.join(', ')} + ${IDENTITY_FIELDS.length} identity fields on ` +
   `${A.reduce((s, a) => s + a.transitions, 0)} records`);
ok('R5 every site is inside the frozen §4 closed taxonomy',
   A.every(a => a.badSite === 0) && A.every(a => a.badKind === 0));
ok('R6 sequence numbers are strictly monotonic within every run',
   A.every(a => a.monotonic), 'append-only ordering preserved');
ok('R7 NO duplicate sequence number in any run', A.every(a => a.dupSeq === 0));
ok('R8 the sequence is contiguous over the union of transitions and boundaries',
   A.every(a => a.seqs.size === a.transitions + a.boundaries && a.maxSeq === a.seqs.size - 1),
   'nothing dropped: no missing record is detectable by the frozen controls');
ok('R9 the position chain is continuous across every consecutive transition',
   A.every(a => a.chainBreaks === 0),
   `${A.reduce((s, a) => s + a.transitions, 0) - A.length} consecutive pairs, 0 breaks`);
ok('R10 recorder diagnostics report zero pairing violations and no open transition',
   manifest.runs.every(r => r.diagnostics.pairingViolations === 0 &&
                            r.diagnostics.openTransition === false));
{
    const census = {};
    for (const a of A) for (const [s, n] of Object.entries(a.sites)) census[s] = (census[s] || 0) + n;
    ok('R11 all four §4 taxonomy sites are present in the collected evidence',
       TRANSITION_SITES.every(s => (census[s] || 0) > 0),
       TRANSITION_SITES.map(s => `${s} ${census[s] || 0}`).join(', '));
}

// ==========================================================
console.log('\n===== S  the pre-declared D-006 sufficiency counts ============');
// ==========================================================
// Recomputed INDEPENDENTLY from the raw streams and required to agree with the
// manifest. These are collection/evaluability measures, not Q1 results.
const desync = A.reduce((s, a) => s + a.desync, 0);
const reads  = A.reduce((s, a) => s + a.reads, 0);
const perStratum = {};
for (const r of manifest.runs) perStratum[r.stratum] = (perStratum[r.stratum] || 0) + 1;
const suf = evaluateSufficiency({ desyncEvents: desync, configurations: manifest.runs.length,
                                  perStratum });
console.log(`   DESYNC ${desync} of ${reads} reads | configurations ${manifest.runs.length} | ` +
            `strata ${JSON.stringify(perStratum)}`);
ok('S1 the independent recomputation agrees with the manifest on every count',
   manifest.sufficiency.desyncEvents === desync &&
   manifest.sufficiency.configurations === manifest.runs.length &&
   JSON.stringify(manifest.sufficiency.perStratum) === JSON.stringify(perStratum),
   'the collector and this gate computed the counts separately');
ok('S2 the frozen stopping rule yields the same disposition here as in the manifest',
   suf.status === manifest.sufficiency.status, suf.status);
// A condition being UNMET is NOT a gate failure. D-006 §5 makes INCONCLUSIVE a
// legitimate terminal outcome of a SOUND collection, so an under-yield must not
// be reported as an integrity defect. These lines report the observed counts and
// feed the disposition; S1, S2 and S4 remain real assertions and would go red if
// the rule were mis-evaluated or if the collector and this gate disagreed.
for (const c of suf.conditions)
    console.log(`${c.met ? 'MET  ' : 'UNMET'} S3 ${c.id}: ${c.observed} vs required ` +
                `${c.required}${c.met ? '' : '   contributes to INCONCLUSIVE (D-006 §5)'}`);
ok('S4 the disposition is exactly one of the two frozen outcomes',
   suf.status === 'SATISFIED' || suf.status === 'INCONCLUSIVE — INSUFFICIENT MATERIAL');
ok('S5 the range was NOT extended and sampling was NOT adapted despite the yield',
   manifest.accounting.candidates === EXPECTED &&
   manifest.seedCensus.min === FROZEN.seedLo && manifest.seedCensus.max === FROZEN.seedHi &&
   manifest.seedCensus.evaluatedByEnv === FROZEN.seedHi - FROZEN.seedLo + 1,
   `exactly ${EXPECTED} candidates over exactly ${FROZEN.seedHi - FROZEN.seedLo + 1} seeds — ` +
   `no substitution, no extension, no retry`);
ok('S6 the COMPLETE range was processed rather than stopping when a minimum was reached',
   manifest.accounting.dispositions.PENDING === undefined &&
   (manifest.accounting.dispositions.COLLECTED || 0) +
   (manifest.accounting.dispositions.REJECTED || 0) === EXPECTED,
   'D-006 §5 requires the whole registered range, not an early exit');

// ==========================================================
console.log('\n===== D  deterministic reproduction ===========================');
// ==========================================================
// Re-runs one already-collected configuration and requires bit-identical
// evidence. The sample is chosen deterministically (the median run by seed), so
// the check cannot be steered toward a favourable configuration.
{
    const sorted = [...manifest.runs].sort((a, b) =>
        a.configSeed - b.configSeed || a.configIndex - b.configIndex);
    const s = sorted[Math.floor(sorted.length / 2)];
    const redo = collectOne({ configSeed: s.configSeed, configIndex: s.configIndex, goal: s.goal });
    const tD = sha(toJsonl(redo, 'transitions')), bD = sha(toJsonl(redo, 'boundaries'));
    console.log(`   re-ran ${s.configSeed}:${s.configIndex} — ${redo.transitions.length} transitions`);
    ok('D1 a collected configuration reproduces bit-identically',
       tD === s.transitionsDigest && bD === s.boundariesDigest,
       `transitions ${tD.slice(0, 16)} == manifest, boundaries ${bD.slice(0, 16)} == manifest`);
    ok('D2 the re-run reproduces the same M7 fingerprint and evaluated exactly its own seed',
       redo.provenance.fingerprint === s.fingerprint &&
       redo.provenance.evaluatedSeeds.length === 1 &&
       redo.provenance.evaluatedSeeds[0] === s.configSeed,
       `fingerprint ${s.fingerprint.slice(0, 16)}`);
}

// ==========================================================
console.log('\n===== I  artifact digests =====================================');
// ==========================================================
{
    const integ = fs.readFileSync(path.join(DATA, 'INTEGRITY.sha256'), 'utf8');
    const want = {};
    for (const l of integ.split('\n')) {
        const m = l.match(/^([0-9a-f]{64})\s+(\S+)$/);
        if (m) want[m[2]] = m[1];
    }
    let bad = [];
    for (const f of ['transitions.jsonl', 'boundaries.jsonl', 'candidates.jsonl', 'manifest.json']) {
        const got = sha(fs.readFileSync(path.join(DATA, f)));
        if (want[f] !== got) bad.push(`${f}: ${got.slice(0, 12)} != ${(want[f] || '?').slice(0, 12)}`);
    }
    ok('I1 every artifact matches its recorded digest', bad.length === 0,
       bad.length ? bad.join(' | ') : `4 artifacts, ${Object.keys(want).length} digests recorded`);
    ok('I2 the per-run digests in the manifest cover every collected configuration',
       manifest.runs.every(r => /^[0-9a-f]{64}$/.test(r.transitionsDigest) &&
                                /^[0-9a-f]{64}$/.test(r.boundariesDigest)),
       'a single run can be validated without regenerating the others');
    ok('I3 the raw streams are NOT committed, per the M7/M8 convention',
       execFileSync('git', ['ls-files', 'experiments/q1/data'], { cwd: ROOT, encoding: 'utf8' })
           .split('\n').filter(Boolean).every(f => !/\.jsonl$/.test(f) || /candidates/.test(f)),
       'transitions.jsonl and boundaries.jsonl are gitignored; digests are committed');
}

// ==========================================================
console.log('\n===== G  frozen-artifact and production-source regression =====');
// ==========================================================
const digestOK = (mdRel, sidecarRel) => {
    const side = fs.readFileSync(path.join(ROOT, sidecarRel), 'utf8');
    const line = side.split('\n').filter(l => l.trim() && !l.startsWith('#')).pop() || '';
    const wantD = (line.match(/[0-9a-f]{64}/) || [])[0];
    return wantD && wantD === sha(fs.readFileSync(path.join(ROOT, mdRel)));
};
ok('G1 M7 pre-registration digest unchanged',
   digestOK('research/cognitive-audit/M7_PREREGISTRATION.md',
            'research/cognitive-audit/M7_PREREGISTRATION.sha256'));
ok('G2 M8 pre-registration digest unchanged',
   digestOK('research/preregistrations/M8_PREREGISTRATION.md',
            'research/preregistrations/M8_PREREGISTRATION.sha256'));
ok('G3 M9 pre-registration digest unchanged',
   digestOK('research/preregistrations/M9_PREREGISTRATION.md',
            'research/preregistrations/M9_PREREGISTRATION.sha256'));
ok('G4 Q1 pre-registration digest unchanged',
   digestOK('research/preregistrations/Q1_PREREGISTRATION.md',
            'research/preregistrations/Q1_PREREGISTRATION.sha256'));
{
    const dirty = (paths) => execFileSync('git', ['status', '--porcelain', '--', ...paths],
        { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(l => l.trim() && !l.startsWith('??'));
    const prod = dirty(['main.js', 'render', 'instrumentation', 'benchmarks', 'index.html']);
    ok('G5 NO production source modification exists', prod.length === 0,
       prod.length ? prod.join(' | ') : 'main.js, render/, instrumentation/ clean');
    const frozen = dirty(['research', 'experiments/m7', 'experiments/m8', 'experiments/m9']);
    ok('G6 D-006 and every M7/M8/M9 artifact are unmodified', frozen.length === 0,
       frozen.length ? frozen.join(' | ') : 'no tracked modification');
    const q1 = dirty(['experiments/q1/instrument.js', 'experiments/q1/hook.mjs',
                      'experiments/q1/verify_q1_instrument.js']);
    ok('G7 the committed Q1 instrumentation is unmodified since 50be4b4', q1.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`Q1 COLLECTION DISPOSITION: ${suf.status}`);
if (suf.unmet.length) console.log(`  unmet minima: ${suf.unmet.join(', ')} — D-006 §5 forbids ` +
    `extension; no additional sampling is permitted under Q1.`);
process.exit(fail ? 1 : 0);

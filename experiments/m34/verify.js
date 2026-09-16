// ==========================================================
// M34 — INDEPENDENT VERIFICATION OF THE 895000-895999 ACCOUNTING REPAIR
// ==========================================================
// Verifies experiments/registry/consumed_after_c1.js:
//   the C1 block is recorded as consumed, with an evaluation claim that is READ BACK
//   from C1's own committed artifacts rather than asserted; every other decision is
//   bit-for-bit the old link's; no historical file changes; and the typed layer's
//   not-yet-wired gap is asserted rather than hidden.
//
// Evidence is EXECUTED: predicates are run over the whole window, the evaluated set is
// recomputed from candidates.jsonl, and artifact digests are recomputed from the files.
// Mutants of the successor must each be caught by a named check; a no-op control must
// survive.
//
// Consumes no seed, boots no agent, runs no collection, writes only to a temp dir.
//   node experiments/m34/verify.js [--json]
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const JSON_MODE = process.argv.includes('--json');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const log = (...a) => { if (!JSON_MODE) console.log(...a); };
let TMP_DIR = null;
const tmp = () => (TMP_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), 'm34-')));

export const M33_R1_COMMIT = '73c12d977500e580f14b33bbb813acd88fc032a3';
const SUCCESSOR = 'experiments/registry/consumed_after_c1.js';
const SELF = 'experiments/m34/verify.js';
export const M34_FILES = [
    'experiments/registry/consumed_after_c1.js',
    'experiments/m34/verify.js',
    'research/preregistrations/M34_REGISTRY_ACCOUNTING_REPAIR.md',
    'research/preregistrations/verify_m34.js',
];
// Files whose content M34 must not touch, checked by blob identity.
export const PROTECTED = [
    'experiments/registry/consumed.js', 'experiments/registry/typed.js',
    'experiments/m33/verify.js', 'experiments/m33/verify_r1.js',
    'experiments/c1/protocol.js', 'experiments/c1/collect.js', 'experiments/c1/run_collection.js',
    'experiments/c1/verify_collection.js', 'experiments/c1/gate.js',
    // readouts.jsonl is deliberately gitignored by the committed experiments/c1/data/.gitignore,
    // so it cannot be blob-compared; its integrity is checked by digest instead (C3, P5).
    'experiments/c1/data/candidates.jsonl', 'experiments/c1/data/.gitignore',
    'experiments/c1/data/INTEGRITY.sha256', 'experiments/c1/results/c1_results.json',
    'experiments/c1/results/c1_results.sha256',
    'experiments/uqb/protocol.js', 'experiments/uqb/collect.js', 'experiments/uqb/run_collection.js',
    'experiments/uqa/protocol.js', 'experiments/q1/protocol.js', 'experiments/m8/protocol.js',
    'experiments/m7/env.js', 'experiments/m7/run.js', 'experiments/m7/arms.js',
    'main.js', 'instrumentation/rng.js', 'render/planning.js', 'render/scoring.js',
];

// Load a module source text with './consumed.js' resolved to the live old link.
async function loadSuccessor(text, tag) {
    const dir = path.join(tmp(), `m34-${tag}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'consumed.js'),
        `export * from ${JSON.stringify(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed.js')).href)};\n`);
    const f = path.join(dir, 'successor.js');
    fs.writeFileSync(f, text);
    return import(pathToFileURL(f).href);
}

// ---- the suite -----------------------------------------------------------------
export async function runSuite(N, ctx) {
    const { OLD, c1Results, evaluatedFromCandidates, digests, declaredDigests } = ctx;
    const results = [];
    const check = (id, cond, msg) => {
        let ok;
        try { ok = typeof cond === 'function' ? !!cond() : !!cond; } catch (e) {
            ok = false; msg = `${msg} [threw ${e.code || e.name}: ${String(e.message).slice(0, 60)}]`;
        }
        results.push({ id, ok, msg });
        return ok;
    };
    const LO = 895000, HI = 895999;

    // ---------- A. the block is represented ----------
    check('A1', () => {
        let n = 0;
        for (let s = LO; s <= HI; s++) if (N.isConsumed(s)) n++;
        ctx.blockConsumed = n;
        return n === 1000;
    }, () => `all ${ctx.blockConsumed}/1000 seeds of ${LO}-${HI} are recorded as consumed`);
    check('A2', () => {
        const r = N.rangeFor(895500);
        return r && r.lo === LO && r.hi === HI && /C1/.test(r.why) && /b23f2c5/.test(r.why);
    }, 'the covering range is exactly 895000-895999 and cites the C1 collection commit');
    check('A3', () => N.CONSUMED_RANGES.filter(r => r.lo === LO && r.hi === HI).length === 1 &&
        N.CONSUMED_RANGES.length === OLD.CONSUMED_RANGES.length + 1,
        'exactly one new range is added; the chain grows by one link');

    // ---------- B. boundaries and interior ----------
    check('B1', () => N.isConsumed(894999) === false && N.rangeFor(894999) === null,
        'boundary 894999: not consumed, no covering range');
    check('B2', () => N.isConsumed(LO) === true && N.rangeFor(LO).lo === LO,
        'boundary 895000: consumed by the C1 range');
    check('B3', () => N.isConsumed(HI) === true && N.rangeFor(HI).hi === HI,
        'boundary 895999: consumed by the C1 range');
    check('B4', () => N.isConsumed(896000) === true && N.rangeFor(896000).lo === 896000,
        'boundary 896000: still consumed, but by the 896xxx development range, not by C1');
    check('B5', () => [895001, 895031, 895250, 895500, 895750, 895998].every(s =>
        N.isConsumed(s) && N.rangeFor(s).lo === LO),
        'representative interior values 895001, 895031, 895250, 895500, 895750, 895998 are C1-consumed');
    check('B6', () => N.isHeldOut(895500) === false && N.isHeldOut(900500) === true &&
        N.isHeldOut(900499) === false && N.HELD_OUT_FLOOR === 900500,
        'the C1 block is consumed, NOT held out; the >= 900500 reservation is unchanged');

    // ---------- C. no false claim of evaluation ----------
    check('C1', () => {
        const c = c1Results.seedCensus;
        const e = N.C1_BLOCK.evaluation;
        return e.evaluatedCount === c.evaluatedCount && e.evaluatedMin === c.evaluatedMin &&
            e.evaluatedMax === c.evaluatedMax && c.lo === LO && c.hi === HI &&
            e.acceptedConfigurations === c1Results.accounting.dispositions.ACCEPTED &&
            e.runsExecuted === c1Results.accounting.runsExecuted;
    }, 'every evaluation number equals C1\'s own committed seedCensus and accounting');
    check('C2', () => {
        const { distinct, min, max, rows } = evaluatedFromCandidates;
        return distinct === 1000 && min === LO && max === HI && rows === 4000 &&
            N.C1_BLOCK.evaluation.evaluatedCount === distinct;
    }, () => `recomputed from candidates.jsonl: ${evaluatedFromCandidates.rows} candidate rows carry ` +
        `${evaluatedFromCandidates.distinct} distinct seeds spanning ` +
        `${evaluatedFromCandidates.min}-${evaluatedFromCandidates.max}`);
    check('C3', () => digests.candidates === declaredDigests.candidates &&
        digests.readouts === declaredDigests.readouts,
        'the C1 artifacts the evaluation claim is read from match their committed INTEGRITY digests');
    check('C4', () => {
        const d = N.DEV_FIXTURE_EVALUATION;
        return d.kind === 'block-declared-conservatively' && d.evaluatedCount === null &&
            d.executedFixtures.length === 6 && d.enumeratedSubrange.hi === 896099 &&
            N.evaluationFor(896500).evaluatedCount === null;
    }, 'the 896xxx claim is carried forward unchanged: block declared conservatively, evaluation ' +
       'count NOT asserted');
    check('C5', () => N.C1_BLOCK.evaluation.kind === 'enumerated-in-full' &&
        N.evaluationFor(895500).kind === 'enumerated-in-full' && N.evaluationFor(894999) === null,
        'evaluation is reported per range and only where it is known');
    check('C6', () => N.C1_BLOCK.category === 'registered' && N.C1_BLOCK.study === 'C1' &&
        N.TERRITORY.proposed.length === 0 && N.TERRITORY.reserved.heldOutFloor === 900500 &&
        N.TERRITORY.consumed === N.CONSUMED_RANGES,
        'territory states are named: consumed, reserved, proposed (empty), with evaluation evidence apart');

    // ---------- D. backward compatibility ----------
    check('D1', () => {
        let diff = 0, inBlock = 0;
        for (let s = 0; s <= 1_000_000; s++) {
            const o = OLD.isConsumed(s), n = N.isConsumed(s);
            if (o !== n) { diff++; if (s >= LO && s <= HI) inBlock++; }
            if (OLD.isHeldOut(s) !== N.isHeldOut(s)) diff += 1000;   // any held-out change is fatal
        }
        ctx.diff = diff; ctx.inBlock = inBlock;
        return diff === 1000 && inBlock === 1000;
    }, () => `exhaustive 0..1,000,000: the ONLY decisions that change are the 1000 seeds of the C1 ` +
        `block (${ctx.inBlock}); held-out decisions identical everywhere`);
    check('D2', () => {
        const inherited = OLD.CONSUMED_RANGES.map(r => `${r.lo}-${r.hi}|${r.why}`);
        const now = N.CONSUMED_RANGES.map(r => `${r.lo}-${r.hi}|${r.why}`);
        return inherited.every((x, i) => now[i + 1] === x) && now.length === inherited.length + 1;
    }, 'the inherited chain is spread unchanged, in order, with the new link first');
    check('D3', () => OLD.isConsumed(895500) === false && OLD.isConsumed(895000) === false &&
        OLD.isConsumed(895999) === false && OLD.HELD_OUT_FLOOR === 900500,
        'the OLD link still answers exactly as the committed M18/M21 evidence records');
    check('D4', () => {
        const s = N.spentSummary();
        return s.heldOutFloor === 900500 && s.lowestConsumed === LO &&
            s.ranges.length === N.CONSUMED_RANGES.length;
    }, 'spentSummary keeps its shape and now reports 895000 as the lowest consumed seed');
    check('D5', () => Object.isFrozen(N.CONSUMED_RANGES) && N.CONSUMED_RANGES.every(Object.isFrozen) &&
        Object.isFrozen(N.C1_BLOCK) && Object.isFrozen(N.TERRITORY),
        'the successor is frozen: a consumer cannot mutate the registry in memory');

    // ---------- E. nothing registered becomes consumed by M34 ----------
    check('E1', () => {
        // Every other study's registered block was already consumed by the old link; M34
        // must not add any seed outside C1's block.
        let added = 0;
        for (let s = 0; s <= 1_000_000; s++) if (!OLD.isConsumed(s) && N.isConsumed(s) && !(s >= LO && s <= HI)) added++;
        return added === 0;
    }, 'no seed outside 895000-895999 becomes consumed');
    check('E2', () => {
        const blocks = { M8: [899500, 899999], Q1: [899000, 899499], UQA: [898000, 898999],
                         UQB: [897000, 897999], M7a: [900000, 900029], M7b: [900030, 900499] };
        return Object.values(blocks).every(([lo, hi]) =>
            [lo, Math.floor((lo + hi) / 2), hi].every(s => OLD.isConsumed(s) && N.isConsumed(s)));
    }, 'the M8, Q1, UQ-A, UQ-B and M7 blocks were already consumed and remain so');

    // ---------- F. the typed layer gap, asserted not hidden ----------
    check('F1', () => ctx.typed.config.isConsumed(ctx.typed.configSeed(895500)) === false,
        'PINNED GAP: typed.js still delegates to the OLD link, so the typed layer reports 895xxx ' +
        'available. M34 may not modify M33/M33-R1; re-pointing it is the next milestone');
    check('F2', () => ctx.typedImportsOldLink && !ctx.typedImportsSuccessor,
        'that gap is a delegation fact: typed.js imports consumed.js and not the successor');

    return results;
}

export const MUTANTS = [
    ['MU1 wrong low boundary', "    lo: 895000, hi: 895999,\n    study: 'C1',", "    lo: 895001, hi: 895999,\n    study: 'C1',"],
    ['MU2 wrong high boundary', "    lo: 895000, hi: 895999,\n    study: 'C1',", "    lo: 895000, hi: 895998,\n    study: 'C1',"],
    ['MU3 block widened below', "    lo: 895000, hi: 895999,\n    study: 'C1',", "    lo: 894999, hi: 895999,\n    study: 'C1',"],
    ['MU4 block widened above', "    lo: 895000, hi: 895999,\n    study: 'C1',", "    lo: 895000, hi: 896000,\n    study: 'C1',"],
    ['MU5 evaluation count falsified upward', "        evaluatedCount: 1000,\n        evaluatedMin: 895000,", "        evaluatedCount: 1001,\n        evaluatedMin: 895000,"],
    ['MU6 evaluation count falsified downward', "        evaluatedCount: 1000,\n        evaluatedMin: 895000,", "        evaluatedCount: 999,\n        evaluatedMin: 895000,"],
    ['MU7 accepted configurations falsified', 'acceptedConfigurations: 70,', 'acceptedConfigurations: 700,'],
    ['MU8 runs executed falsified', 'runsExecuted: 140,', 'runsExecuted: 70,'],
    ['MU9 category mislabelled as development', "category: 'registered',", "category: 'development',"],
    ['MU10 study mislabelled', "study: 'C1',", "study: 'M31',"],
    ['MU11 evaluation kind overclaimed for 896xxx', "kind: 'block-declared-conservatively',",
     "kind: 'enumerated-in-full',"],
    ['MU12 896xxx evaluation count invented', 'evaluatedCount: null,', 'evaluatedCount: 1000,'],
    ['MU13 inherited chain dropped', '...UQB_LINK_CONSUMED,', ''],
    ['MU14 inherited chain reordered', 'Object.freeze({ lo: C1_BLOCK.lo, hi: C1_BLOCK.hi, why: C1_BLOCK.why }),\n    ...UQB_LINK_CONSUMED,',
     '...UQB_LINK_CONSUMED,\n    Object.freeze({ lo: C1_BLOCK.lo, hi: C1_BLOCK.hi, why: C1_BLOCK.why }),'],
    ['MU15 block marked held out instead of consumed',
     'export const isHeldOut  = (s) => Number.isInteger(s) && s >= HELD_OUT_FLOOR;',
     'export const isHeldOut  = (s) => Number.isInteger(s) && (s >= HELD_OUT_FLOOR || (s >= 895000 && s <= 895999));'],
    ['MU16 held-out floor moved', 'export const HELD_OUT_FLOOR = UQB_LINK_FLOOR;',
     'export const HELD_OUT_FLOOR = 900501;'],
    ['MU17 provenance stripped', "why: 'C1 descriptive census, consumed at b23f2c5',",
     "why: 'consumed',"],
    ['MU18 proposed territory invented', 'proposed: Object.freeze([]),',
     'proposed: Object.freeze([{ lo: 894000, hi: 894999 }]),'],
    ['MU19 registry no longer frozen', 'export const CONSUMED_RANGES = Object.freeze([',
     'export const CONSUMED_RANGES = ([' ],
    ['MU20 rangeFor off by one', 'CONSUMED_RANGES.find(r => s >= r.lo && s <= r.hi) ?? null',
     'CONSUMED_RANGES.find(r => s > r.lo && s <= r.hi) ?? null'],
    ['MU21 no-op control (semantics unchanged)', '// The chain: C1', '// The chain (no-op): C1'],
];
export const CONTROL = 'MU21 no-op control (semantics unchanged)';

async function main() {
    const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
    const OLD = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/consumed.js')).href);
    const typed = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);
    const typedSrc = fs.readFileSync(path.join(ROOT, 'experiments/registry/typed.js'), 'utf8');
    const c1Results = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments/c1/results/c1_results.json'), 'utf8'));

    // recompute the evaluated set from the raw candidate rows
    const cand = fs.readFileSync(path.join(ROOT, 'experiments/c1/data/candidates.jsonl'), 'utf8')
        .split(/\r?\n/).filter(Boolean);
    const seeds = new Set(cand.map(l => JSON.parse(l).configSeed));
    const evaluatedFromCandidates = { rows: cand.length, distinct: seeds.size,
        min: Math.min(...seeds), max: Math.max(...seeds) };

    const integrity = fs.readFileSync(path.join(ROOT, 'experiments/c1/data/INTEGRITY.sha256'), 'utf8');
    const declared = (name) => (integrity.match(new RegExp(`([0-9a-f]{64})\\s+${name}`)) || [])[1];
    const ctx = {
        OLD, typed, c1Results, evaluatedFromCandidates,
        digests: { candidates: sha('experiments/c1/data/candidates.jsonl'),
                   readouts: sha('experiments/c1/data/readouts.jsonl') },
        declaredDigests: { candidates: declared('candidates.jsonl'), readouts: declared('readouts.jsonl') },
        typedImportsOldLink: /from\s+'\.\/consumed\.js'/.test(typedSrc),
        typedImportsSuccessor: /consumed_after_c1/.test(typedSrc),
    };

    // Executed, not asserted: ask the M33 gate itself what it says about this repository.
    const m33 = await import(pathToFileURL(path.join(ROOT, 'experiments/m33/verify.js')).href);
    const sets = m33.importerSets();
    ctx.gateOffenders = m33.gateVerdict(sets.current, sets.allowlist);

    const report = { sections: {} };
    let fails = 0;
    const emit = (section, rows) => {
        report.sections[section] = rows.map(r => ({ ...r, msg: typeof r.msg === 'function' ? r.msg() : r.msg }));
        log(`\n-- ${section} ${'-'.repeat(Math.max(0, 70 - section.length))}`);
        for (const r of report.sections[section]) {
            if (!r.ok) fails++;
            log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.msg}`);
        }
    };

    log('='.repeat(78));
    log('  M34 — 895000-895999 configuration-registry accounting repair');
    log('='.repeat(78));

    const src = fs.readFileSync(path.join(ROOT, SUCCESSOR), 'utf8');
    const N = await loadSuccessor(src, 'subject');
    emit('accounting suite', await runSuite(N, ctx));

    // ---- protected paths and seed accounting ----
    const target = git('log', '--diff-filter=A', '--format=%H', '--', SELF).trim().split(/\r?\n/).pop();
    const changed = (target ? git('diff', '--name-only', M33_R1_COMMIT, target)
                            : git('diff', '--name-only', M33_R1_COMMIT)).split(/\r?\n/).filter(Boolean);
    const untracked = target ? [] : git('ls-files', '-o', '--exclude-standard').split(/\r?\n/)
        .filter(f => M34_FILES.includes(f));
    const sameAsM33R1 = (p) => git('rev-parse', `${M33_R1_COMMIT}:${p}`).trim() ===
        (target ? git('rev-parse', `${target}:${p}`).trim() : git('hash-object', path.join(ROOT, p)).trim());
    const unchanged = PROTECTED.filter(p => !sameAsM33R1(p));
    emit('integrity', [
        { id: 'P1', ok: changed.every(f => M34_FILES.includes(f)) && untracked.every(f => M34_FILES.includes(f)),
          msg: `since M33-R1 only M34 files changed: ${JSON.stringify([...changed, ...untracked])}` },
        { id: 'P2', ok: unchanged.length === 0,
          msg: `all ${PROTECTED.length} protected files byte-identical to ${M33_R1_COMMIT.slice(0, 7)} ` +
               `(C1 data and results, UQ-B, typed.js, the M33 verifiers, production): ` +
               `${JSON.stringify(unchanged)}` },
        { id: 'P3', ok: PROTECTED.includes('experiments/registry/consumed.js') &&
                        PROTECTED.includes('experiments/registry/typed.js'),
          msg: 'CONTROL: the old link and the typed layer are inside the protected set' },
        { id: 'P6', ok: ctx.gateOffenders.length === 1 && ctx.gateOffenders[0] === SUCCESSOR &&
                        fs.readFileSync(path.join(ROOT, SUCCESSOR), 'utf8').includes("from './consumed.js'"),
          msg: 'PINNED CONFLICT: the M33 raw-import gate flags exactly this new link ' +
               `(${JSON.stringify(ctx.gateOffenders)}) because a chain link must import the previous ` +
               'link (M18 convention). M34 may not change the M33 gate; the allowlist fix belongs with ' +
               'the same milestone that re-points typed.js' },
        { id: 'P5', ok: git('check-ignore', '-v', 'experiments/c1/data/readouts.jsonl').includes('experiments/c1/data/.gitignore') &&
                        ctx.digests.readouts === ctx.declaredDigests.readouts,
          msg: 'C1 readouts.jsonl is gitignored BY DESIGN (committed experiments/c1/data/.gitignore); ' +
               'its integrity rests on the committed INTEGRITY.sha256 digest, which matches' },
        { id: 'P4', ok: !fs.existsSync(path.join(ROOT, 'experiments/m34/data')) &&
                        !fs.existsSync(path.join(ROOT, 'experiments/m34/results')),
          msg: 'M34 produced no collection data: registered experimental seeds consumed = 0' },
    ]);

    // ---- mutations ----
    const mutRows = [];
    report.mutants = [];
    for (let i = 0; i < MUTANTS.length; i++) {
        const [name, anchor, repl] = MUTANTS[i];
        const id = name.split(' ')[0];
        const label = name.slice(name.indexOf(' ') + 1);
        // The anchor must be UNIQUE. A non-unique anchor would silently mutate the first
        // match — a doc comment, say — and produce an equivalent mutant that "survives".
        const occurrences = src.split(anchor).length - 1;
        if (occurrences !== 1) {
            mutRows.push({ id, ok: false, msg: `${label} -> HARNESS DEFECT: anchor occurs ${occurrences} times` });
            report.mutants.push({ name, harness: `anchor occurs ${occurrences} times` });
            continue;
        }
        let failed;
        try {
            const M = await loadSuccessor(src.replace(anchor, repl), `mut${i}`);
            failed = (await runSuite(M, ctx)).filter(r => !r.ok).map(r => r.id);
        } catch (e) {
            // A mutant that cannot even load is caught by the named load check L0.
            failed = ['L0'];
        }
        const control = name === CONTROL;
        const ok = control ? failed.length === 0 : failed.length > 0;
        report.mutants.push({ name, control, caught: failed.length > 0, by: failed.slice(0, 8) });
        mutRows.push({ id, ok, msg: `${label} -> ${control
            ? (failed.length ? `CONTROL WRONGLY FAILED ${failed}` : 'no-op control survived')
            : (failed.length ? `caught by ${failed.slice(0, 8).join(',')}` : 'SURVIVED')}` });
    }
    emit('mutation testing', mutRows);

    report.fails = fails;
    report.total = Object.values(report.sections).flat().length;
    report.verdict = fails === 0 ? 'VERIFIED' : 'NOT VERIFIED';
    report.evaluated = evaluatedFromCandidates;
    report.target = target || null;
    if (TMP_DIR) fs.rmSync(TMP_DIR, { recursive: true, force: true });
    if (JSON_MODE) process.stdout.write(JSON.stringify(report));
    else {
        log('\n' + '='.repeat(78));
        log(`  M34 VERIFY: ${report.total - fails}/${report.total} passed, ${fails} FAILED`);
        log(`  VERDICT: ${report.verdict}`);
        log('='.repeat(78));
    }
    process.exit(fails === 0 ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}

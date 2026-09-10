// ==========================================================
// C1 PASS 2 — INDEPENDENT INTEGRITY VERIFICATION
// ==========================================================
// Re-derives the principal descriptive quantities FROM THE RAW CELLS in
// data/readouts.jsonl rather than trusting results/c1_results.json, then checks
// seed accounting, definedness handling, same-arm reproducibility and upstream
// integrity.
//
// Performs no inferential statistics and computes no p-value.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock, isConsumed, isHeldOut } from './protocol.js';
import { collectOne } from './collect.js';
import { rhoOf, describe, signCounts, oraclesFor, rankOf } from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

let pass = 0, fail = 0;
const P = (id, cond, msg) => {
    if (cond) { pass++; console.log(`PASS  ${id.padEnd(6)} ${msg}`); }
    else { fail++; console.log(`FAIL  ${id.padEnd(6)} ${msg}`); }
    return cond;
};
const near = (a, b, e = 1e-9) => (a === null && b === null) ||
    (a !== null && b !== null && Math.abs(a - b) <= e);

const RES = JSON.parse(fs.readFileSync(path.join(HERE, 'results/c1_results.json'), 'utf8'));
const RAW = fs.readFileSync(path.join(HERE, 'data/readouts.jsonl'), 'utf8')
    .trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

console.log('='.repeat(78));
console.log('  C1 PASS 2 — INDEPENDENT INTEGRITY VERIFICATION');
console.log('='.repeat(78) + '\n');

// ---- 1. seed accounting ----------------------------------------------------
console.log('-- seed accounting -----------------------------------------------------------');
{
    const seeds = [...new Set(RAW.flatMap(r => r.evaluatedSeeds))];
    const outside = seeds.filter(s => !inRegisteredBlock(s));
    P('S1', outside.length === 0,
        `every seed evaluated by every child lies in ${FROZEN.seedLo}-${FROZEN.seedHi} ` +
        `(${seeds.length} distinct, ${outside.length} outside)`);
    P('S2', seeds.every(s => !isConsumed(s) && !isHeldOut(s)),
        'no consumed-range or held-out seed was evaluated');
    P('S3', RES.seedCensus.evaluatedCount === 1000 &&
            RES.seedCensus.evaluatedMin === FROZEN.seedLo &&
            RES.seedCensus.evaluatedMax === FROZEN.seedHi,
        `the driver enumerated the COMPLETE block: ${RES.seedCensus.evaluatedCount} seeds, ` +
        `${RES.seedCensus.evaluatedMin}-${RES.seedCensus.evaluatedMax}`);
    P('S4', RES.seedCensus.outsideRegisteredBlock.length === 0,
        'the driver recorded zero seeds outside the registered block');
}

// ---- 2. accounting ---------------------------------------------------------
console.log('\n-- accounting ----------------------------------------------------------------');
{
    const a = RES.accounting;
    P('A1', a.candidates === 4000 && a.seedsEnumerated === 1000,
        `${a.candidates} candidates from ${a.seedsEnumerated} seeds x 4 goal indices`);
    const d = a.dispositions;
    const total = (d.ACCEPTED || 0) + (d.REJECTED || 0) + (d.INVALID || 0) + (d.FAILED || 0);
    P('A2', total === a.candidates,
        `dispositions sum to the candidate count: ${JSON.stringify(d)}`);
    P('A3', RAW.length === (d.ACCEPTED || 0) + (d.INVALID || 0),
        `readouts.jsonl holds one record per collected configuration (${RAW.length})`);
    P('A4', a.runsExecuted === RAW.length * 2,
        `two runs per collected configuration (${a.runsExecuted})`);
}

// ---- 3. E6 RE-DERIVED from raw pools ---------------------------------------
console.log('\n-- E6 re-derived from the raw cells ------------------------------------------');
{
    let rhoBad = 0, defBad = 0, deltaBad = 0, n1Bad = 0, oracleBad = 0;
    for (const r of RAW) {
        const cfg = env.makeConfig(r.configSeed, r.configIndex);
        const oracle = oraclesFor(cfg);
        for (const c of r.cells) {
            // the oracle-optimal action must match the committed oracle
            if (Number(oracle[c.phase].get(c.state)) !== Number(c.vStar)) oracleBad++;
            // rho = r/(n-1), defined only when n >= 2
            for (const [rr, nn, rho] of [[c.rA, c.nA, c.rhoA], [c.rB, c.nB, c.rhoB]]) {
                if (rho === null) { if (rr !== null && nn >= 2) rhoBad++; continue; }
                if (nn < 2) { rhoBad++; continue; }
                if (Math.abs(rho - rr / (nn - 1)) > 1e-12) rhoBad++;
            }
            if (c.nA === 1 && c.rhoA !== null) n1Bad++;
            if (c.nB === 1 && c.rhoB !== null) n1Bad++;
            // pairwise deletion: both arms defined
            if (c.bothDefined !== (c.rhoA !== null && c.rhoB !== null)) defBad++;
            if (c.bothDefined) {
                if (Math.abs(c.delta - (c.rhoA - c.rhoB)) > 1e-12) deltaBad++;
            } else if (c.delta !== null) deltaBad++;
        }
    }
    P('E1', oracleBad === 0, `v* matches env.reliabilityOptimalPolicy in every cell (${oracleBad} mismatches)`);
    P('E2', rhoBad === 0, `every ρ equals r/(n−1) and respects n ≥ 2 (${rhoBad} violations)`);
    P('E3', n1Bad === 0, `n = 1 never yields a defined ρ — no ρ = 0 convention (${n1Bad} violations)`);
    P('E4', defBad === 0, `pairwise deletion is exactly "defined in BOTH arms" (${defBad} violations)`);
    P('E5', deltaBad === 0, `δ = ρ_ARMED − ρ_ABLATED wherever defined (${deltaBad} violations)`);
}

// ---- 4. Δ and the summaries RE-DERIVED -------------------------------------
console.log('\n-- Δ and the descriptive summaries re-derived --------------------------------');
{
    const byCfg = new Map(RES.configurations.filter(c => c.cells)
        .map(c => [`${c.configSeed}:${c.configIndex}`, c]));
    let dBad = 0, mBad = 0;
    for (const r of RAW) {
        const rec = byCfg.get(`${r.configSeed}:${r.configIndex}`);
        for (const ph of FROZEN.phases) {
            const d = r.cells.filter(c => c.phase === ph && c.bothDefined).map(c => c.delta);
            const mine = d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;
            if (!near(mine, rec.perPhase[ph].delta)) dBad++;
            const jd = r.cells.filter(c => c.phase === ph && c.bothDefined).length;
            if (jd !== rec.perPhase[ph].missingness.jointlyDefined) mBad++;
        }
    }
    P('D1', dBad === 0, `Δ re-derived as the unweighted mean of δ for every configuration/phase (${dBad} mismatches)`);
    P('D2', mBad === 0, `jointlyDefined re-derived for every configuration/phase (${mBad} mismatches)`);

    for (const ph of FROZEN.phases) {
        const valid = RES.configurations.filter(c => c.disposition === 'ACCEPTED');
        const deltas = valid.map(c => c.perPhase?.[ph]?.delta).filter(d => d !== null && d !== undefined);
        const mine = describe(deltas), theirs = RES.perPhase[ph].primary.summary;
        const ok = mine.N === theirs.N && near(mine.mean, theirs.mean) &&
            near(mine.median, theirs.median) && near(mine.sd, theirs.sd) &&
            near(mine.IQR, theirs.IQR) && near(mine.range, theirs.range) &&
            near(mine.min, theirs.min) && near(mine.max, theirs.max) &&
            near(mine.p25, theirs.p25) && near(mine.p75, theirs.p75);
        P(`D3-${ph}`, ok,
            `phase ${ph} summary re-derived: N ${mine.N}, mean ${mine.mean?.toFixed(6)}, ` +
            `median ${mine.median?.toFixed(6)}, SD ${mine.sd?.toFixed(6)}`);
        const ms = signCounts(deltas), ts = RES.perPhase[ph].primary.signs;
        P(`D4-${ph}`, ms.nNegative === ts.nNegative && ms.nPositive === ts.nPositive &&
                      ms.nZero === ts.nZero,
            `phase ${ph} sign counts re-derived: neg ${ms.nNegative} / pos ${ms.nPositive} / zero ${ms.nZero}`);
    }
}

// ---- 5. same-arm reproducibility -------------------------------------------
console.log('\n-- same-arm reproducibility --------------------------------------------------');
{
    const first = RES.configurations.find(c => c.disposition === 'ACCEPTED');
    const again = collectOne({ configSeed: first.configSeed, configIndex: first.configIndex,
        goal: first.goal, arm: 'ARMED', collection: true });
    const rawFirst = RAW.find(r => r.configSeed === first.configSeed &&
                                   r.configIndex === first.configIndex);
    // re-derive rho for the repeat and compare to the recorded ARMED values
    const cfg = env.makeConfig(first.configSeed, first.configIndex);
    const oracle = oraclesFor(cfg);
    let mismatch = 0;
    again.states.forEach((u, i) => {
        for (const ph of FROZEN.phases) {
            const vStar = Number(oracle[ph].get(u));
            const a = rhoOf(again.readouts[i].pool, vStar);
            const rec = rawFirst.cells.find(c => c.state === u && c.phase === ph);
            if (!near(a.rho, rec.rhoA) || a.r !== rec.rA || a.n !== rec.nA) mismatch++;
        }
    });
    P('R1', again.provenance.fingerprint === first.fingerprintArmed,
        `an independent re-run of ${first.configSeed}:${first.configIndex} ARMED reproduces the ` +
        `recorded fingerprint`);
    P('R2', mismatch === 0,
        `and reproduces every recorded ρ, r and n for that configuration (${mismatch} mismatches)`);
    P('R3', RES.configurations.filter(c => c.cells)
        .every(c => c.fingerprintArmed !== c.fingerprintAblated),
        'ARMED and ABLATED fingerprints differ for every collected configuration');
}

// ---- 6. no inferential machinery in the output -----------------------------
console.log('\n-- no inference ---------------------------------------------------------------');
{
    const j = JSON.stringify(RES);
    P('N1', !/"p_?value"|"pValue"|"alpha"|"confidenceInterval"|"ci95"|"standardError"|"stderr"/i.test(j),
        'the results artifact contains no p-value, alpha, interval or standard-error field');
    P('N2', /performs no statistical inference and licenses no generalisation/.test(RES.licensedLanguage),
        'the artifact carries the §15.3 required phrasing');
    const code = fs.readFileSync(path.join(HERE, 'analyze.js'), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    P('N3', !/\bp-?value\b/i.test(code) && !/\balpha\b/i.test(code) &&
            !/confidence interval/i.test(code),
        'the analysis code contains no inferential machinery');
}

// ---- 7. artifact integrity -------------------------------------------------
console.log('\n-- artifact integrity ---------------------------------------------------------');
{
    const d = execFileSync('sha256sum', ['-c', 'INTEGRITY.sha256'],
        { cwd: path.join(HERE, 'data'), encoding: 'utf8' });
    P('I1', (d.match(/OK/g) || []).length === 2, 'data/ digests verify (readouts, candidates)');
    const d2 = execFileSync('sha256sum', ['-c', 'c1_results.sha256'],
        { cwd: path.join(HERE, 'results'), encoding: 'utf8' });
    P('I2', (d2.match(/OK/g) || []).length === 1, 'results/c1_results.json digest verifies');
    P('I3', RES.preregistration.digest === FROZEN.preregistration &&
            sha(fs.readFileSync(path.join(ROOT, 'research/preregistrations/C1_PREREGISTRATION.md')))
                === FROZEN.preregistration,
        'the artifact binds to the frozen preregistration, whose digest still verifies');
    P('I4', RAW.every(r => r.cells.length === FROZEN.decisionStates * 2),
        `every record holds ${FROZEN.decisionStates} states x 2 phases`);
}

// ---- 8. upstream untouched -------------------------------------------------
console.log('\n-- upstream integrity ---------------------------------------------------------');
P('U1', git('diff', '--stat', 'HEAD', '--', 'main.js', 'render/', 'instrumentation/',
    'experiments/m7/').trim() === '', 'production source is unmodified');
P('U2', git('diff', '--stat', 'HEAD', '--', 'experiments/uqb/').trim() === '',
    'UQ-B machinery and data are unmodified');
P('U3', git('diff', '--stat', 'HEAD', '--', 'research/preregistrations/', 'research/spec/',
    'experiments/registry/', 'experiments/m14/', 'experiments/m19_3/').trim() === '',
    'every preregistration, the M13 spec, the registry and the M14/M19 records are unmodified');

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
console.log(fail === 0 ? '  C1 PASS 2 VERIFICATION: PASS' : '  C1 PASS 2 VERIFICATION: FAIL');
console.log('='.repeat(78));
process.exit(fail === 0 ? 0 : 1);

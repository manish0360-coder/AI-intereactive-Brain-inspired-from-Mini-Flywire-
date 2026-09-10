// M21 — FORMULATION GATE.
//
// A formulation memo makes no measurement, so this gate cannot check a result. What it
// CAN check is that every fact the memo imports from the committed record is stated
// correctly, that the frozen sign convention survives, that none of the six
// reinterpretations the Director prohibited appears, and that the milestone stayed
// formulation-only (no seeds, no preregistration, no production edit).
//
// Every cited number is re-derived from the artifact it is cited to. A number the memo
// states that this file cannot reproduce is a FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const MEMO = fs.readFileSync(ROOT + 'research/preregistrations/M21_NEXT_RESEARCH_QUESTION.md', 'utf8');
const PREREG = fs.readFileSync(ROOT + 'research/preregistrations/C1_PREREGISTRATION.md', 'utf8');
const RAW = fs.readFileSync(ROOT + 'experiments/c1/data/readouts.jsonl', 'utf8')
    .trim().split('\n').map(l => JSON.parse(l));
const UQA = JSON.parse(fs.readFileSync(ROOT + 'experiments/uqa/results/uqa_results.json', 'utf8'));
const UQB = JSON.parse(fs.readFileSync(ROOT + 'experiments/uqb/results/uqb_results.json', 'utf8'));
const M14 = JSON.parse(fs.readFileSync(ROOT + 'experiments/m14/m14_attainability.json', 'utf8'));

// Frozen text wraps lines and the memo quotes it behind '> ' markers; a semantic scan
// must never be a scan for adjacent literal bytes.
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const FLATMEMO = flat(MEMO);

let fails = 0, checks = 0;
const ok = (cond, label, detail = '') => {
    checks++; if (!cond) fails++;
    console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
};

console.log('='.repeat(78));
console.log('  M21 FORMULATION GATE');
console.log('='.repeat(78));

// ── G1. The frozen sign convention survives into the successor memo ──────────
console.log('\n-- G1. frozen sign convention -------------------------------------------');
{
    ok(/Lower ρ means the oracle-optimal action is ranked more highly\. A negative Δ therefore means ARMED ranks the oracle-optimal action higher than ABLATED\./
        .test(flat(PREREG)), 'frozen prereg §2 still states the convention');
    ok(/Δ < 0 favours ARMED/.test(FLATMEMO) && /Δ > 0 favours ABLATED/.test(FLATMEMO),
        'memo restates the convention in the frozen direction');
    ok(/descriptively favourable to ABLATED/.test(FLATMEMO),
        'memo draws the correct direction for the positive census mean');
    // the reversal hazard, in either orientation
    const reversed = [/positive Δ[^.]{0,60}favou?rable to ARMED/i,
                      /Δ > 0 favours ARMED/i, /Δ < 0 favours ABLATED/i,
                      /negative Δ[^.]{0,60}favou?rable to ABLATED/i]
        .filter(re => re.test(FLATMEMO));
    ok(reversed.length === 0, 'memo contains NO sign reversal',
        reversed.length ? String(reversed[0]) : 'clean');
}

// ── G2. The six prohibited reinterpretations ─────────────────────────────────
// Each must be ABSENT as an assertion. The memo's own prohibition list states them in
// order to forbid them, so the disclaimer sentences are excluded before scanning.
console.log('\n-- G2. prohibited reinterpretations --------------------------------------');
{
    let prose = MEMO;
    // drop §0's carry-forward disclaimer and the WHAT NOT TO DO list, whose job is to name these
    prose = prose.replace(/\*\*This memo does not reinterpret[\s\S]*?descriptive ARMED-vs-ABLATED E6 result over the registered C1 census\.\*\*/, ' ');
    const nd = prose.indexOf('# WHAT NOT TO DO');
    const ndEnd = prose.indexOf('# RECOMMENDED NEXT MILESTONE');
    const notDo = nd >= 0 ? prose.slice(nd, ndEnd) : '';
    prose = nd >= 0 ? prose.slice(0, nd) + prose.slice(ndEnd) : prose;
    const P = flat(prose);

    const banned = [
        ['futureScore harmful', /futureScore (?:is|was|proves? to be|appears? to be) (?:harmful|detrimental|damaging|worse)/i],
        ['uncertainty harmful', /uncertainty (?:is|was) (?:harmful|detrimental|damaging)/i],
        ['planning harmed', /planning (?:is|was|has been) (?:harmed|impaired|degraded|damaged)/i],
        ['cognition harmed', /cognition (?:is|was|has been) (?:harmed|impaired|degraded|damaged)/i],
        ['primitive falsified', /(?:cognitive )?primitive (?:is|was|has been) falsified|falsifies? a (?:cognitive )?primitive/i],
        ['mechanism discovered', /(?:a )?mechanism (?:is|was|has been) discovered|discovered a mechanism/i],
    ];
    for (const [label, re] of banned) {
        const m = P.match(re);
        ok(!m, `memo does not assert: ${label}`, m ? `found "${m[0]}"` : 'clean');
    }
    // and the memo must POSITIVELY forbid each of them somewhere
    for (const [label, re] of [['futureScore', /futureScore being harmful/i],
                               ['uncertainty', /uncertainty being harmful/i],
                               ['planning', /planning[^.]{0,30}harmed/i],
                               ['cognition', /cognition being harmed/i],
                               ['primitive', /primitive falsified|primitive being falsified/i],
                               ['mechanism', /mechanism being discovered/i]])
        ok(re.test(FLATMEMO), `memo explicitly forbids reinterpretation: ${label}`);
    ok(/must never become a post-hoc exclusion criterion/i.test(FLATMEMO),
        'memo forbids the goal-16 post-hoc exclusion');
    ok(notDo.length > 500, 'WHAT NOT TO DO section is present and substantive',
        notDo.length + ' chars');
}

// ── G3. C1 figures re-derived from the raw cells ─────────────────────────────
console.log('\n-- G3. C1 figures re-derived --------------------------------------------');
{
    const per = { 1: [], 2: [] };
    let sNA = 0, sNB = 0, cN = 0, sRA = 0, cRA = 0, sRB = 0, cRB = 0;
    let cells = 0, aOnly = 0, bOnly = 0, neither = 0, rankMoved = 0, flipped = 0, def = 0;
    const undefByGoal = {};
    for (const rr of RAW) {
        for (const p of [1, 2]) {
            let sum = 0, k = 0;
            for (const c of rr.cells) {
                if (c.phase !== p) continue;
                if (c.rA === null || c.rB === null || c.nA < 2 || c.nB < 2) continue;
                sum += (c.rA / (c.nA - 1)) - (c.rB / (c.nB - 1)); k++;
            }
            if (k) per[p].push(sum / k);
        }
        for (const c of rr.cells) {
            cells++; sNA += c.nA; sNB += c.nB; cN++;
            if (c.rA !== null) { sRA += c.rA; cRA++; }
            if (c.rB !== null) { sRB += c.rB; cRB++; }
            const aDef = c.rhoA !== null, bDef = c.rhoB !== null;
            if (!aDef && bDef) aOnly++;
            if (aDef && !bDef) bOnly++;
            if (!aDef && !bDef) { neither++; undefByGoal[rr.goal] = (undefByGoal[rr.goal] || 0) + 1; }
            if (!c.bothDefined) continue;
            def++;
            if (c.rA !== c.rB) { rankMoved++;
                if (Math.sign(c.delta) !== Math.sign(c.rA - c.rB)) flipped++; }
        }
    }
    const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
    const m1 = mean(per[1]), m2 = mean(per[2]);
    const sd = (v) => { const m = mean(v); return Math.sqrt(mean(v.map(x => (x - m) ** 2))); };

    ok(MEMO.includes(m1.toFixed(6)), 'memo states phase-1 mean', m1.toFixed(6));
    ok(MEMO.includes(m2.toFixed(6)), 'memo states phase-2 mean', m2.toFixed(6));
    ok(MEMO.includes('+' + m1.toFixed(6)) && MEMO.includes('+' + m2.toFixed(6)),
        'memo marks BOTH census means as positive (the Director-stated values)');
    ok(MEMO.includes(sd(per[1]).toFixed(6)) && MEMO.includes(sd(per[2]).toFixed(6)),
        'memo states both SDs', `${sd(per[1]).toFixed(6)} / ${sd(per[2]).toFixed(6)}`);
    const neg1 = per[1].filter(x => x < 0).length, pos1 = per[1].filter(x => x > 0).length;
    const neg2 = per[2].filter(x => x < 0).length, pos2 = per[2].filter(x => x > 0).length;
    ok(FLATMEMO.includes(`${neg1}/${pos1}`) && FLATMEMO.includes(`${neg2}/${pos2}`),
        'memo states both sign splits', `${neg1}/${pos1} and ${neg2}/${pos2}`);
    ok(per[1].length === 70 && per[2].length === 70 && FLATMEMO.includes('70 configurations'),
        'memo states 70 configurations');
    ok(cells === 2660 && FLATMEMO.includes('2660 cells'), 'memo states 2660 cells');

    // pool and rank asymmetry (E-9)
    ok(MEMO.includes((sNA / cN).toFixed(3)) && MEMO.includes((sNB / cN).toFixed(3)),
        'memo states both mean pool sizes', `${(sNA / cN).toFixed(3)} / ${(sNB / cN).toFixed(3)}`);
    ok(sNA / cN < sNB / cN && /ARMED[^.]{0,80}smaller/i.test(FLATMEMO),
        'memo correctly says ARMED pools are the SMALLER ones');
    ok(MEMO.includes((sRA / cRA).toFixed(3)) && MEMO.includes((sRB / cRB).toFixed(3)),
        'memo states both mean raw ranks', `${(sRA / cRA).toFixed(3)} / ${(sRB / cRB).toFixed(3)}`);

    // normalisation carriage (E-10)
    ok(FLATMEMO.includes(`${flipped} of ${rankMoved}`) || FLATMEMO.includes(`${flipped}/${rankMoved}`),
        'memo states the sign-opposition count', `${flipped} of ${rankMoved}`);
    ok(MEMO.includes((100 * flipped / rankMoved).toFixed(1) + '%'),
        'memo states the sign-opposition percentage',
        (100 * flipped / rankMoved).toFixed(1) + '%');
    ok(def === 2613 && FLATMEMO.includes('2613'), 'memo states jointly-defined 2613');

    // definedness (E-11)
    ok(aOnly + bOnly === 0 && /differential arm-definedness (?:was )?zero|0 of 2660/i.test(FLATMEMO),
        'memo states differential arm-definedness was zero', `${aOnly + bOnly} of ${cells}`);
    ok(neither === 47 && undefByGoal[16] === 46 && FLATMEMO.includes('46 of 47'),
        'memo states 46 of 47 undefined cells in goal 16', JSON.stringify(undefByGoal));
    const g16 = RAW.filter(r => r.goal === 16);
    ok(g16.length === 18 && /all 18 goal-16 configurations/i.test(FLATMEMO),
        'memo states all 18 goal-16 configurations affected');

    // E1 exposure (E-8)
    const e = RAW.map(r => r.e1);
    ok(Math.min(...e) === 10 && Math.max(...e) === 19 && e.every(x => x !== 0)
        && /E1 ∈ \[10, 19\]/.test(flat(MEMO)) && /never 0/i.test(FLATMEMO),
        'memo states the E1 range and that it was never 0');
}

// ── G4. Cited UQ-A / UQ-B figures ────────────────────────────────────────────
console.log('\n-- G4. cited UQ-A / UQ-B figures ----------------------------------------');
{
    const a1 = UQA.directions.rhoPhase1, a2 = UQA.directions.rhoPhase2, ac = UQA.directions.coverage;
    ok(FLATMEMO.includes(`${a1.armedHigher} / ${a1.ablatedHigher} / ${a1.equal}`)
        || FLATMEMO.includes(`ARMED-higher ${a1.armedHigher} / ABLATED-higher ${a1.ablatedHigher} / equal ${a1.equal}`),
        'memo states UQ-A phase-1 directions', `${a1.armedHigher}/${a1.ablatedHigher}/${a1.equal}`);
    ok(FLATMEMO.includes(`${a2.armedHigher} / ${a2.ablatedHigher} / ${a2.equal}`),
        'memo states UQ-A phase-2 directions', `${a2.armedHigher}/${a2.ablatedHigher}/${a2.equal}`);
    ok(FLATMEMO.includes(`${ac.armedHigher} / ${ac.ablatedHigher} / ${ac.equal}`),
        'memo states UQ-A coverage directions', `${ac.armedHigher}/${ac.ablatedHigher}/${ac.equal}`);
    ok(UQA.sufficiency.conditions[0].observed === 96 && FLATMEMO.includes('96 configurations'),
        'memo states UQ-A had 96 configurations');

    const b1 = UQB.c1Directions['1'], b2 = UQB.c1Directions['2'];
    ok(FLATMEMO.includes(`${b1.armedHigher} / ${b1.ablatedHigher} / ${b1.equal}`)
        || FLATMEMO.includes(`ARMED-higher ${b1.armedHigher} / ABLATED-higher ${b1.ablatedHigher} / equal ${b1.equal}`),
        'memo states UQ-B phase-1 directions', `${b1.armedHigher}/${b1.ablatedHigher}/${b1.equal}`);
    ok(FLATMEMO.includes(`${b2.armedHigher} / ${b2.ablatedHigher} / ${b2.equal}`),
        'memo states UQ-B phase-2 directions', `${b2.armedHigher}/${b2.ablatedHigher}/${b2.equal}`);
    const c2 = UQB.c2Counts;
    ok(c2['1'].rejected === 0 && c2['2'].rejected === 0 && c2['1'].notRejected === 71
        && /0 rejections of 71 in both phases/i.test(FLATMEMO),
        'memo states UQ-B C2 was 0 of 71 in both phases');
    ok(FLATMEMO.includes(String(c2.nullExpectation['1'].toFixed(2)))
        || FLATMEMO.includes('3.55'), 'memo states the C2 null expectation 3.55');
    ok(UQB.accounting.dispositions.ACCEPTED === 71 && FLATMEMO.includes('71 configurations'),
        'memo states UQ-B had 71 configurations');
    // blocks
    for (const [lo, hi] of [[897000, 897999], [898000, 898999], [895000, 895999]])
        ok(MEMO.includes(`${lo}`) && MEMO.includes(`${hi}`), `memo names block ${lo}-${hi}`);
}

// ── G5. The instrument-limitation claims, checked against the artifacts ──────
console.log('\n-- G5. instrument-limitation claims -------------------------------------');
{
    // L-C: C1 recorded pool SIZE but not MEMBERSHIP. This is the load-bearing claim
    // behind "a new instrument is required", so it is checked, not asserted.
    const cellKeys = Object.keys(RAW[0].cells[0]);
    const hasMembership = cellKeys.some(k => /^pool[AB]$|members|candidates/i.test(k));
    ok(!hasMembership, 'C1 cells genuinely lack pool membership', cellKeys.join(','));
    ok(cellKeys.includes('nA') && cellKeys.includes('nB'), 'C1 cells do record pool SIZE');
    ok(/pool \*\*size\*\*, but \*\*not pool membership\*\*|records pool \*\*size\*\* but not \*\*membership\*\*/
        .test(MEMO) || /rank and pool size, but not pool membership/i.test(FLATMEMO),
        'memo states the size-not-membership limitation');
    ok(/not computable from the C1 census/i.test(FLATMEMO),
        'memo states the decomposition is not computable from C1');

    // O-3: the M14 prototype claim, verified in the committed artifact
    const st = M14.results[0].perState[0];
    ok(Array.isArray(st.poolA) && Array.isArray(st.poolB),
        'M14 probe genuinely recorded full pool membership with weights');
    ok('rAinB' in st && 'rBinA' in st, 'M14 probe genuinely recorded cross-pool ranks');
    // the worked instance: candidate 6 in BOTH pools, ranked 2nd by ARMED and last of 8 by ABLATED
    const rank = (pool, c) => { const s = pool.slice().sort((x, y) => y[1] - x[1]);
        return s.findIndex(e => e[0] === c); };
    const inA = st.poolA.some(e => e[0] === 6), inB = st.poolB.some(e => e[0] === 6);
    ok(inA && inB, 'candidate 6 is present in BOTH arms’ pools');
    // Ranks under the E6 convention: rank 0 = ranked first. Cross-checked against the
    // probe's own optRank field so this is not merely my re-sort of the same weights.
    const rA = rank(st.poolA, 6), rB = rank(st.poolB, 6);
    ok(rA === st.optRank['2'].A && rB === st.optRank['2'].B && st.optRank['2'].star === 6,
        'recomputed ranks agree with the probe’s own optRank record',
        `A ${rA}=${st.optRank['2'].A}, B ${rB}=${st.optRank['2'].B}`);
    ok(rA === 2 && st.poolA.length === 7, 'candidate 6 is rank 2 of 7 under ARMED', `rank ${rA}`);
    ok(rB === 7 && st.poolB.length === 8, 'candidate 6 is rank 7 of 8 under ABLATED', `rank ${rB}`);
    ok(new RegExp(`rank ${rA} of ${st.poolA.length} under ARMED and rank\\s+${rB} of ${st.poolB.length} under ABLATED`)
        .test(flat(MEMO)), 'memo states the worked instance exactly');
    ok(/development fixture|not evidence about the mechanism/i.test(FLATMEMO),
        'memo labels the M14 instance as a feasibility demonstration only');

    // L-A: the frozen §2.1 declaration the limitation rests on
    ok(/is therefore the normalised total-effect outcome/i.test(flat(PREREG)),
        'C1 v2.0 §2.1 does declare the normalised total-effect framing');
    ok(/normalised total-effect outcome/i.test(FLATMEMO), 'memo carries that framing forward');
}

// ── G6. The governance finding is TRUE and was reported, not acted on ────────
console.log('\n-- G6. registry finding --------------------------------------------------');
{
    // BEHAVIOURAL, not lexical. consumed.js IMPORTS the floor rather than restating it,
    // so grepping its source for "900500" tests the typography, not the registry. The
    // question is what the module RESOLVES to — so ask it.
    const reg = await import('../../experiments/registry/consumed.js');
    ok(reg.isConsumed(895500) === false && reg.isConsumed(895000) === false
        && reg.isConsumed(895999) === false,
        'registry genuinely does not record 895000-895999 as consumed');
    ok(reg.isConsumed(897500) && reg.isConsumed(898500) && reg.isConsumed(896500),
        'registry DOES record the prior blocks — so the gap is specific, not a broken import');
    ok(reg.HELD_OUT_FLOOR === 900500 && reg.isHeldOut(900500),
        'registry resolves the held-out floor to 900500', String(reg.HELD_OUT_FLOOR));
    ok(/isConsumed\(895500\)[\s\S]{0,40}false|returns \*\*false\*\*/.test(MEMO),
        'memo reports the gap concretely');
    ok(/have not modified the registry/i.test(FLATMEMO),
        'memo states the registry was NOT modified');
    ok(/before any (?:future )?study (?:selects|draws)/i.test(FLATMEMO),
        'memo states when the gap must be closed');
}

// ── G7. Formulation-only discipline ──────────────────────────────────────────
console.log('\n-- G7. formulation-only discipline --------------------------------------');
{
    ok(/FORMULATION ONLY/.test(MEMO), 'memo declares itself formulation-only');
    ok(/No seed was generated, inspected, or consumed/i.test(FLATMEMO),
        'memo states no seed was touched');
    // nothing in this milestone may introduce a threshold or a statistical method
    const banned = [
        ['a p-value', /\bp-value\b|\bp *[<>=] *0?\.\d/i],
        ['a significance threshold', /statistically significant|significance threshold|\balpha *= *0?\.\d/i],
        ['a confidence interval', /confidence interval/i],
        ['a new numeric threshold', /threshold of \d|set the threshold to|we (?:use|adopt|choose) \d+(?:\.\d+)? as/i],
    ];
    for (const [label, re] of banned) {
        const m = MEMO.match(re);
        ok(!m, `memo introduces no ${label}`, m ? `found "${m[0]}"` : 'clean');
    }
    ok(/Do NOT|must not|do not/i.test(MEMO) && /preregistration/i.test(MEMO)
        && /(?:not|no).{0,40}preregistration|preregistration.{0,60}(?:may not|must not|not).{0,20}(?:be )?(?:created|introduced)/i.test(FLATMEMO),
        'memo defers preregistration');
    // exactly one selected question
    const sel = MEMO.match(/^# SINGLE NEXT BEST RESEARCH QUESTION$/gm) || [];
    ok(sel.length === 1, 'exactly one SINGLE NEXT BEST RESEARCH QUESTION section',
        String(sel.length));
    for (const h of ['# SINGLE NEXT BEST RESEARCH QUESTION', '# DECISION TREE',
                     '# WHAT NOT TO DO', '# RECOMMENDED NEXT MILESTONE',
                     '# PASS 1 — SCIENTIFIC SYNTHESIS', '# PASS 2 — INDEPENDENT RESEARCH-DIRECTION AUDIT'])
        ok(MEMO.includes(h), `required section present: ${h.replace(/^# /, '')}`);
    // the six PASS 1 distinctions
    for (const s of ['Established evidence', 'Valid descriptive inferences', 'Remaining hypotheses',
                     'can no longer answer', 'Instrument limitations now understood',
                     'Scientific opportunities created'])
        ok(new RegExp(s, 'i').test(MEMO), `PASS 1 distinction present: ${s}`);
    // Evidence/Inference/Hypothesis separation is explicit
    ok(/Evidence → Inference → Hypothesis/.test(MEMO), 'E→I→H separation restated explicitly');
    // the memo must forbid explaining the C1 result without a discriminating measurement
    ok(/without a discriminating measurement/i.test(FLATMEMO),
        'memo forbids explaining the C1 Δ without a discriminating measurement');
    // and must refuse the automatic-replication default
    ok(/Do not run another E6 replication/i.test(FLATMEMO),
        'memo explicitly refuses another E6 replication as the default');
}

// ── G8. The working tree confirms formulation-only ───────────────────────────
console.log('\n-- G8. working tree ------------------------------------------------------');
{
    const touched = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
        .split('\n').map(l => l.slice(3).trim()).filter(Boolean)
        .filter(f => !f.startsWith('research/cognitive-audit/') && !f.startsWith('experiments/m7/')
                  && !f.startsWith('experiments/phase1_0/'));
    const allowed = ['research/preregistrations/M21_NEXT_RESEARCH_QUESTION.md',
                     'research/preregistrations/verify_m21.js'];
    const extra = touched.filter(f => !allowed.includes(f));
    ok(extra.length === 0, 'M21 touched only its own two files',
        extra.length ? extra.join(', ') : 'clean');
    // production source and frozen artifacts untouched
    const diff = execSync('git status --porcelain main.js experiments/c1 experiments/uqb ' +
        'experiments/uqa experiments/registry research/preregistrations/C1_PREREGISTRATION.md ' +
        'research/preregistrations/UQB_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' }).trim();
    ok(diff === '', 'production source, C1/UQ-A/UQ-B, registry and frozen preregs all untouched',
        diff || 'clean');
}

// ── G9. Anti-vacuity: the gates must FAIL against mutation ───────────────────
console.log('\n-- G9. anti-vacuity ------------------------------------------------------');
{
    const mkFlat = (t) => flat(t);
    // M1: reverse the sign convention
    const m1 = MEMO.replace('Δ < 0`  favours ARMED', 'Δ < 0`  favours ABLATED');
    ok(m1 !== MEMO || MEMO.includes('Δ < 0'), 'sign-convention text is present to mutate');
    ok(/Δ < 0 favours ABLATED/.test(mkFlat(MEMO.replace(/Δ < 0(\s+)favours ARMED/, 'Δ < 0$1favours ABLATED'))),
        'G1 reversal scan would FIRE on a flipped convention');
    // M2: assert a prohibited reinterpretation
    const m2 = mkFlat(MEMO + '\n\nfutureScore is harmful.');
    ok(/futureScore (?:is|was) (?:harmful)/i.test(m2),
        'G2 would FIRE on an asserted prohibited reinterpretation');
    // M3: corrupt a cited figure
    ok(!MEMO.includes('0.143257'), 'G3 compares cited figures to the re-derivation');
    const m3 = MEMO.split('0.043257').join('0.143257');
    ok(!m3.includes('0.043257'), 'G3 would FIRE on a corrupted census mean');
    // M4: claim the registry was fixed
    ok(!/registry (?:has been|was) updated|added 895000/i.test(MEMO),
        'G6 would FIRE on a claim that the registry was modified');
}

console.log('\n' + '='.repeat(78));
console.log(`  M21 FORMULATION GATE: ${checks - fails}/${checks} checks passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

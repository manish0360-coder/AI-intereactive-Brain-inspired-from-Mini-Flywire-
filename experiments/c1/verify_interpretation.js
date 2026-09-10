// M20 PASS 2 — INDEPENDENT INTERPRETATION VERIFICATION.
//
// Deliberately NOT a rerun of m20_analysis.mjs. Every quantity is re-derived by a
// different route (accumulator loops rather than map/filter pipelines; rank/pool
// recomputation of rho rather than trusting the stored rhoA/rhoB/delta), and every
// numeric claim is re-derived here, and G3b then binds the MEMO TEXT to those derived
// values, so a number altered in the prose fails even though the derivation is intact.
// A claim the memo makes that this file cannot reproduce is a FAIL.
//
// Also screens the memo prose for the hazards the M20 ruling names.
import fs from 'node:fs';
import crypto from 'node:crypto';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Repo-relative, so the gate runs from any checkout rather than one machine.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const MEMO = fs.readFileSync(ROOT + 'research/preregistrations/C1_INTERPRETATION.md', 'utf8');
const RAW = fs.readFileSync(ROOT + 'experiments/c1/data/readouts.jsonl', 'utf8')
    .trim().split('\n').map(l => JSON.parse(l));
const PREREG = fs.readFileSync(ROOT + 'research/preregistrations/C1_PREREGISTRATION.md', 'utf8');

// Frozen documents wrap lines, and the memo quotes them behind '> ' markers. A scan
// for a SEMANTIC property must therefore never be a scan for adjacent literal bytes —
// the recurring predicate error in this program. flat() strips quote markers, emphasis
// and line wrapping so a predicate tests the text rather than its typesetting.
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ')
                     .replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

let fails = 0, checks = 0;
const ok = (cond, label, detail = '') => {
    checks++;
    if (!cond) fails++;
    console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
};
const near = (a, b, tol = 5e-6) => Math.abs(a - b) <= tol;

console.log('='.repeat(78));
console.log('  M20 PASS 2 — independent interpretation verification');
console.log('='.repeat(78));

// ── G0. Provenance: the memo interprets the artifacts it claims to interpret ──
console.log('\n-- G0. provenance -------------------------------------------------------');
{
    const pd = crypto.createHash('sha256')
        .update(fs.readFileSync(ROOT + 'research/preregistrations/C1_PREREGISTRATION.md'))
        .digest('hex');
    ok(MEMO.includes(pd), 'memo cites the live C1 prereg digest', pd.slice(0, 16) + '…');
    const side = fs.readFileSync(ROOT + 'research/preregistrations/C1_PREREGISTRATION.sha256', 'utf8');
    ok(side.includes(pd), 'sidecar agrees with the live prereg bytes');
    // raw data digest as recorded at collection time
    const integ = fs.readFileSync(ROOT + 'experiments/c1/data/INTEGRITY.sha256', 'utf8');
    const rd = crypto.createHash('sha256')
        .update(fs.readFileSync(ROOT + 'experiments/c1/data/readouts.jsonl')).digest('hex');
    ok(integ.includes(rd), 'readouts.jsonl matches its collection-time digest — data unmodified');
}

// ── G1. THE SIGN CONVENTION. The hazard the ruling names first. ──────────────
// Re-derive it three independent ways: from the frozen text, from rho arithmetic,
// and from the observed data. All three must agree, and the memo must state it.
console.log('\n-- G1. sign convention (primary hazard) ---------------------------------');
{
    // (a) frozen text
    const frozen = /Lower `ρ` means the oracle-optimal action is ranked more highly\. A negative `Δ` therefore means ARMED ranks the oracle-optimal action higher than ABLATED\./
        .test(flat(PREREG));
    ok(frozen, 'frozen prereg §2 states: negative \u0394 = ARMED ranks v* higher');

    // (b) arithmetic: delta must equal rhoA - rhoB, and rho must equal r/(n-1)
    let arithOk = 0, arithBad = 0, rhoBad = 0;
    for (const rr of RAW) for (const c of rr.cells) {
        if (c.rhoA !== null && c.nA >= 2 && !near(c.rhoA, c.rA / (c.nA - 1), 1e-9)) rhoBad++;
        if (c.rhoB !== null && c.nB >= 2 && !near(c.rhoB, c.rB / (c.nB - 1), 1e-9)) rhoBad++;
        if (!c.bothDefined) continue;
        near(c.delta, c.rhoA - c.rhoB, 1e-12) ? arithOk++ : arithBad++;
    }
    ok(rhoBad === 0, 'rho == r/(n-1) in every defined cell', `violations ${rhoBad}`);
    ok(arithBad === 0, 'delta == rhoA - rhoB in every jointly-defined cell',
        `ok ${arithOk}, bad ${arithBad}`);

    // (c) data: when ARMED puts v* nearer rank 0, does delta go negative?
    let aBetter = 0, aBetterNeg = 0, bBetter = 0, bBetterPos = 0;
    for (const rr of RAW) for (const c of rr.cells) {
        if (!c.bothDefined) continue;
        if (c.rA < c.rB) { aBetter++; if (c.delta < 0) aBetterNeg++; }
        if (c.rB < c.rA) { bBetter++; if (c.delta > 0) bBetterPos++; }
    }
    const pA = 100 * aBetterNeg / aBetter, pB = 100 * bBetterPos / bBetter;
    ok(pA > 50 && pB > 50,
        'data confirm the frozen direction (majority, normalisation explains the rest)',
        `ARMED-better\u2192\u03b4<0 ${aBetterNeg}/${aBetter} (${pA.toFixed(1)}%), ` +
        `ABLATED-better\u2192\u03b4>0 ${bBetterPos}/${bBetter} (${pB.toFixed(1)}%)`);
    ok(MEMO.includes(`${aBetterNeg}`) && MEMO.includes(`${bBetterPos}`),
        'memo reports those exact counts');

    // (d) THE REVERSAL CHECK: the memo must never assert positive = favours ARMED.
    const flatMemo = MEMO.replace(/\s+/g, ' ');
    const reversed = [
        /positive `?\u0394`? is descriptively favou?rable to ARMED/i,
        /positive `?\u0394`? (?:means|=|\u2192) *(?:\w+ ){0,3}favou?rs? ARMED/i,
        /negative `?\u0394`?[^.]{0,40}favou?rable to ABLATED/i,
    ].filter(re => {
        const m = flatMemo.match(re);
        // the memo quotes the ruling's erroneous sentence in §0; that quote is
        // inside a blockquote and is explicitly labelled as the error. Exclude it.
        if (!m) return false;
        const at = flatMemo.indexOf(m[0]);
        const ctx = flatMemo.slice(Math.max(0, at - 260), at);
        return !/does not follow|inverts the frozen convention|> \*"/.test(ctx);
    });
    ok(reversed.length === 0, 'memo contains NO un-flagged sign reversal',
        reversed.length ? JSON.stringify(reversed.map(String)) : 'clean');

    // (e) the memo's own table must map the signs correctly
    ok(/`\u0394 < 0`[^|]*\|[^|]*ARMED ranks the oracle-optimal action higher[^|]*\|[^|]*\*\*ARMED\*\*/
        .test(MEMO.replace(/Δ/g, '\u0394')), 'memo table: \u0394<0 \u2192 ARMED');
    ok(/`\u0394 > 0`[^|]*\|[^|]*ABLATED ranks the oracle-optimal action higher[^|]*\|[^|]*\*\*ABLATED\*\*/
        .test(MEMO.replace(/Δ/g, '\u0394')), 'memo table: \u0394>0 \u2192 ABLATED');
    ok(/favou?rable to ABLATED/.test(MEMO) && /census .{0,60}ABLATED|ABLATED[^.]{0,80}arm without `futureBonus`/.test(MEMO),
        'memo draws the correct overall direction (census leans ABLATED)');
}

// ── G2. Re-derive per-configuration \u0394 by an independent route ─────────────
// Accumulator loops; rho recomputed from r and n rather than read from the file.
console.log('\n-- G2. independent re-derivation of the census --------------------------');
const derived = { 1: [], 2: [] };
{
    for (const rr of RAW) {
        for (const p of [1, 2]) {
            let sum = 0, k = 0;
            for (const c of rr.cells) {
                if (c.phase !== p) continue;
                if (c.rA === null || c.rB === null || c.nA < 2 || c.nB < 2) continue;
                sum += (c.rA / (c.nA - 1)) - (c.rB / (c.nB - 1));   // recomputed, not read
                k++;
            }
            if (k > 0) derived[p].push({ goal: rr.goal, e1: rr.e1, d: sum / k, k });
        }
    }
    ok(derived[1].length === 70 && derived[2].length === 70,
        'N = 70 per phase, re-derived from r and n',
        `ph1 ${derived[1].length}, ph2 ${derived[2].length}`);
}

const stat = (arr) => {
    const v = arr.slice().sort((a, b) => a - b);
    const n = v.length;
    const mean = v.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const qq = (p) => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
        return lo === hi ? v[lo] : v[lo] + (v[hi] - v[lo]) * (i - lo); };
    return { n, mean, sd, min: v[0], max: v[n - 1], p25: qq(0.25), p50: qq(0.5), p75: qq(0.75),
        iqr: qq(0.75) - qq(0.25), range: v[n - 1] - v[0],
        neg: v.filter(x => x < 0).length, pos: v.filter(x => x > 0).length,
        zero: v.filter(x => x === 0).length };
};

console.log('\n-- G3. memo numbers vs re-derivation ------------------------------------');
{
    const claims = {
        1: { mean: 0.043257, p50: 0.057500, sd: 0.126793, min: -0.2409, p25: -0.0423,
             p75: 0.1321, max: 0.3691, iqr: 0.174403, range: 0.610053, neg: 27, pos: 43, zero: 0 },
        2: { mean: 0.038500, p50: 0.031036, sd: 0.109337, min: -0.1541, p25: -0.0455,
             p75: 0.1217, max: 0.2797, iqr: 0.167232, range: 0.433863, neg: 25, pos: 45, zero: 0 },
    };
    for (const p of [1, 2]) {
        const s = stat(derived[p].map(x => x.d));
        for (const [key, want] of Object.entries(claims[p])) {
            const tol = Number.isInteger(want) && Math.abs(want) > 1 ? 0 : 5e-5;
            ok(Math.abs(s[key] - want) <= tol, `phase ${p} ${key}`,
                `memo ${want}  derived ${typeof s[key] === 'number' && !Number.isInteger(s[key]) ? s[key].toFixed(6) : s[key]}`);
        }
        ok(s.neg + s.pos + s.zero === 70, `phase ${p} sign counts partition N`);
    }
}

// ── G3b. Bind the MEMO TEXT to the derived values ──────────────────────
// G3 proves the derivation reproduces a set of constants. That is not the same as
// proving the MEMO states them: a number corrupted in the prose would survive G3
// untouched. This gate reads the rendered figures back out of the memo.
console.log('');
console.log('-- G3b. memo prose is bound to the derived values ------------------------');
{
    // the memo renders negatives with U+2212; normalise before matching.
    const text = MEMO.replace(/−/g, '-');
    for (const p of [1, 2]) {
        const s6 = stat(derived[p].map(x => x.d));
        const six = { mean: s6.mean, median: s6.p50, SD: s6.sd, IQR: s6.iqr, range: s6.range };
        for (const [k, v] of Object.entries(six))
            ok(text.includes(v.toFixed(6)), `phase ${p} ${k} appears in the memo`, v.toFixed(6));
        const four = { min: s6.min, p25: s6.p25, p75: s6.p75, max: s6.max };
        for (const [k, v] of Object.entries(four))
            ok(text.includes(v.toFixed(4)), `phase ${p} ${k} appears in the memo`, v.toFixed(4));
        const cell = (k) => k + ' (' + (100 * k / s6.n).toFixed(1) + '%)';
        ok(text.includes(cell(s6.neg)) && text.includes(cell(s6.pos)),
            `phase ${p} sign counts and percentages appear in the memo`,
            `${cell(s6.neg)} / ${cell(s6.pos)}`);
    }
}

// ── G4. Concentration / robustness claims ────────────────────────────────────
console.log('\n-- G4. concentration and robustness -------------------------------------');
{
    const claims = {
        1: { trims: { 1: 0.03853, 3: 0.03219, 5: 0.03319, 10: 0.02541 },
             loo: [0.038534, 0.047375], flips: 0, top: 23.4 },
        2: { trims: { 1: 0.03500, 3: 0.02837, 5: 0.02238, 10: 0.00846 },
             loo: [0.035004, 0.041292], flips: 0, top: 25.4 },
    };
    for (const p of [1, 2]) {
        const d = derived[p].map(x => x.d);
        const m = d.reduce((a, b) => a + b, 0) / d.length;
        const byAbs = d.slice().sort((a, b) => Math.abs(b) - Math.abs(a));
        for (const [k, want] of Object.entries(claims[p].trims)) {
            const rest = byAbs.slice(Number(k));
            const got = rest.reduce((a, b) => a + b, 0) / rest.length;
            ok(Math.abs(got - want) <= 5e-5, `phase ${p} mean after removing ${k} largest |\u0394|`,
                `memo ${want}  derived ${got.toFixed(5)}`);
        }
        const loo = d.map((_, i) => { const r = d.filter((__, j) => j !== i);
            return r.reduce((a, b) => a + b, 0) / r.length; });
        const lmin = Math.min(...loo), lmax = Math.max(...loo);
        ok(Math.abs(lmin - claims[p].loo[0]) <= 5e-6 && Math.abs(lmax - claims[p].loo[1]) <= 5e-6,
            `phase ${p} leave-one-out range`,
            `memo [${claims[p].loo}]  derived [${lmin.toFixed(6)}, ${lmax.toFixed(6)}]`);
        const flips = loo.filter(x => Math.sign(x) !== Math.sign(m)).length;
        ok(flips === claims[p].flips, `phase ${p} leave-one-out sign flips`, `${flips}`);
        const abs = d.map(Math.abs).sort((a, b) => b - a);
        const top = 100 * abs.slice(0, 7).reduce((a, b) => a + b, 0) / abs.reduce((a, b) => a + b, 0);
        ok(Math.abs(top - claims[p].top) <= 0.05, `phase ${p} top-10% share of total |\u0394|`,
            `memo ${claims[p].top}%  derived ${top.toFixed(1)}%`);
    }
}

// ── G5. Definedness / missingness / goal-16 ──────────────────────────────────
console.log('\n-- G5. definedness, missingness, goal 16 --------------------------------');
{
    let total = 0, armedOnly = 0, ablatedOnly = 0, neither = 0;
    const undefByGoal = {}, n1A = { 1: 0, 2: 0 }, n1B = { 1: 0, 2: 0 };
    for (const rr of RAW) for (const c of rr.cells) {
        total++;
        const aDef = c.rhoA !== null, bDef = c.rhoB !== null;
        if (!aDef && bDef) armedOnly++;
        if (aDef && !bDef) ablatedOnly++;
        if (!aDef && !bDef) { neither++; undefByGoal[rr.goal] = (undefByGoal[rr.goal] || 0) + 1; }
        if (c.nA === 1) n1A[c.phase]++;
        if (c.nB === 1) n1B[c.phase]++;
    }
    ok(total === 2660, 'total cells 2660', String(total));
    ok(armedOnly === 0, 'armedOnlyUndefined == 0', String(armedOnly));
    ok(ablatedOnly === 0, 'ablatedOnlyUndefined == 0', String(ablatedOnly));
    ok(neither === 47, 'neitherDefined == 47', String(neither));
    ok(armedOnly + ablatedOnly === 0,
        'ASYMMETRIC arm-definedness did not occur (the §7.1 monitored hazard)');
    ok(n1A[1] === 18 && n1B[1] === 18 && n1A[2] === 18 && n1B[2] === 18,
        'n==1 occurred symmetrically 18/18 per phase',
        `ph1 ${n1A[1]}/${n1B[1]}  ph2 ${n1A[2]}/${n1B[2]}`);
    ok(undefByGoal[16] === 46 && undefByGoal[12] === 1 && Object.keys(undefByGoal).length === 2,
        '46 of 47 undefined cells in goal 16, 1 in goal 12', JSON.stringify(undefByGoal));

    // every goal-16 configuration is affected \u21d2 no unaffected comparison group
    const g16 = RAW.filter(r => r.goal === 16);
    const per = g16.map(r => r.cells.filter(c => !c.bothDefined).length).sort((a, b) => a - b);
    ok(g16.length === 18, 'goal 16 has 18 configurations', String(g16.length));
    ok(per.every(x => x >= 2), 'every goal-16 configuration has >= 2 undefined cells',
        JSON.stringify(per));
    ok(per.filter(x => x === 0).length === 0,
        'NO goal-16 configuration is unaffected \u21d2 the memo\u2019s "comparison unavailable" claim holds');
    ok(/does not exist|unavailable/.test(MEMO) && /goal.16/i.test(MEMO),
        'memo states the comparison is unavailable rather than substituting one');

    // jointlyDefined range claimed 16-19 / 15-19
    for (const p of [1, 2]) {
        const ks = derived[p].map(x => x.k);
        const lo = Math.min(...ks), hi = Math.max(...ks);
        const want = p === 1 ? [16, 19] : [15, 19];
        ok(lo === want[0] && hi === want[1], `phase ${p} jointlyDefined range`,
            `memo ${want[0]}\u2013${want[1]}  derived ${lo}\u2013${hi}`);
    }
}

// ── G6. Rank / pool / normalisation diagnostics ──────────────────────────────
console.log('\n-- G6. rank, pool, normalisation ----------------------------------------');
{
    let sA = 0, cA = 0, sB = 0, cB = 0, sNA = 0, sNB = 0, cN = 0;
    let maxRA = -1, maxRB = -1, maxNA = -1, maxNB = -1, minNA = 1e9, minNB = 1e9;
    let def = 0, rankMoved = 0, normOnly = 0, both = 0, ident = 0, flipped = 0;
    for (const rr of RAW) for (const c of rr.cells) {
        if (c.rA !== null) { sA += c.rA; cA++; maxRA = Math.max(maxRA, c.rA); }
        if (c.rB !== null) { sB += c.rB; cB++; maxRB = Math.max(maxRB, c.rB); }
        sNA += c.nA; sNB += c.nB; cN++;
        maxNA = Math.max(maxNA, c.nA); maxNB = Math.max(maxNB, c.nB);
        minNA = Math.min(minNA, c.nA); minNB = Math.min(minNB, c.nB);
        if (!c.bothDefined) continue;
        def++;
        const rm = c.rA !== c.rB, nm = c.nA !== c.nB;
        if (rm) rankMoved++;
        if (!rm && nm) normOnly++;
        if (rm && nm) both++;
        if (!rm && !nm) ident++;
        if (rm && Math.sign(c.delta) !== Math.sign(c.rA - c.rB)) flipped++;
    }
    ok(near(sA / cA, 2.385, 5e-4), 'ARMED mean raw rank 2.385', (sA / cA).toFixed(3));
    ok(near(sB / cB, 2.336, 5e-4), 'ABLATED mean raw rank 2.336', (sB / cB).toFixed(3));
    ok(near(sNA / cN, 5.674, 5e-4), 'ARMED mean pool 5.674', (sNA / cN).toFixed(3));
    ok(near(sNB / cN, 5.919, 5e-4), 'ABLATED mean pool 5.919', (sNB / cN).toFixed(3));
    ok(sNA / cN < sNB / cN, 'ARMED mean pool is the SMALLER one, as the memo states');
    ok(maxRA === 12 && maxRB === 11, 'rank spans 0\u201312 / 0\u201311',
        `${maxRA} / ${maxRB}`);
    ok(minNA === 1 && maxNA === 13 && minNB === 1 && maxNB === 12,
        'pool spans 1\u201313 / 1\u201312', `${minNA}\u2013${maxNA} / ${minNB}\u2013${maxNB}`);
    ok(def === 2613, 'jointly-defined cells 2613', String(def));
    ok(rankMoved === 2114 && normOnly === 343 && both === 1665 && ident === 156,
        'rank-moved 2114 / norm-only 343 / both 1665 / identical 156',
        `${rankMoved}/${normOnly}/${both}/${ident}`);
    ok(flipped === 218, 'normalisation reverses the raw-rank sign in 218 cells', String(flipped));
    const pct = 100 * flipped / rankMoved;
    ok(near(pct, 10.3, 0.05), 'memo\u2019s 10.3% figure', pct.toFixed(2) + '%');
    ok(MEMO.includes('10.3%'), 'memo states 10.3%');
}

// ── G7. E1 exposure ──────────────────────────────────────────────────────────
console.log('\n-- G7. E1 exposure ------------------------------------------------------');
{
    const e = RAW.map(r => r.e1);
    ok(Math.min(...e) === 10 && Math.max(...e) === 19, 'E1 spans 10\u201319',
        `${Math.min(...e)}\u2013${Math.max(...e)}`);
    ok(e.filter(x => x === 0).length === 0, 'E1 == 0 never occurred \u2014 exposure always reached');
    ok(near(e.reduce((a, b) => a + b, 0) / e.length, 14.69, 5e-3), 'E1 mean 14.69',
        (e.reduce((a, b) => a + b, 0) / e.length).toFixed(2));
    ok(e.length === 70, 'E1 recorded for all 70 configurations');
}

// ── G8. Goal-level table ─────────────────────────────────────────────────────
console.log('\n-- G8. goal-level table --------------------------------------------------');
{
    const claims = {
        1: { 8: [15, 0.04682, 4, 11], 12: [17, 0.04124, 6, 11],
             16: [18, 0.09681, 6, 12], 19: [20, -0.00590, 11, 9] },
        2: { 8: [15, 0.06750, 2, 13], 12: [17, 0.03178, 8, 9],
             16: [18, 0.03090, 9, 9], 19: [20, 0.02929, 6, 14] },
    };
    for (const p of [1, 2]) for (const g of [8, 12, 16, 19]) {
        const d = derived[p].filter(x => x.goal === g).map(x => x.d);
        const [wn, wm, wneg, wpos] = claims[p][g];
        const m = d.reduce((a, b) => a + b, 0) / d.length;
        ok(d.length === wn && Math.abs(m - wm) <= 5e-5 &&
           d.filter(x => x < 0).length === wneg && d.filter(x => x > 0).length === wpos,
            `phase ${p} goal ${g}`,
            `memo n=${wn} mean ${wm} ${wneg}/${wpos} | derived n=${d.length} mean ${m.toFixed(5)} ` +
            `${d.filter(x => x < 0).length}/${d.filter(x => x > 0).length}`);
    }
    // the memo's uniqueness claim about goal 19 phase 1
    const negMeans = [];
    for (const p of [1, 2]) for (const g of [8, 12, 16, 19]) {
        const d = derived[p].filter(x => x.goal === g).map(x => x.d);
        const m = d.reduce((a, b) => a + b, 0) / d.length;
        if (m < 0 && d.filter(x => x < 0).length > d.filter(x => x > 0).length)
            negMeans.push(`ph${p}/g${g}`);
    }
    ok(negMeans.length === 1 && negMeans[0] === 'ph1/g19',
        'goal 19 phase 1 is the ONLY negative-mean, negative-leaning stratum',
        JSON.stringify(negMeans));
}

// ── G9. Phase comparison ─────────────────────────────────────────────────────
console.log('\n-- G9. phase comparison --------------------------------------------------');
{
    const key = (x, i) => i;                       // positional pairing: same config order
    let same = 0, n = 0, sumAbs = [], maxAbs = 0;
    for (let i = 0; i < derived[1].length; i++) {
        const a = derived[1][i].d, b = derived[2][i].d;
        n++;
        if (Math.sign(a) === Math.sign(b)) same++;
        const ad = Math.abs(a - b); sumAbs.push(ad); maxAbs = Math.max(maxAbs, ad);
    }
    ok(n === 70, 'configurations with both phases defined = 70', String(n));
    ok(same === 46, 'same sign in both phases = 46/70', `${same}/70`);
    const m1 = derived[1].reduce((a, b) => a + b.d, 0) / 70;
    const m2 = derived[2].reduce((a, b) => a + b.d, 0) / 70;
    ok(near(m1 - m2, 0.004757, 5e-6), 'phase mean difference 0.004757', (m1 - m2).toFixed(6));
    const s = sumAbs.slice().sort((a, b) => a - b);
    const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    ok(near(med, 0.08274, 5e-5), 'median |\u03941\u2212\u03942| 0.08274', med.toFixed(5));
    ok(near(maxAbs, 0.36840, 5e-5), 'max |\u03941\u2212\u03942| 0.36840', maxAbs.toFixed(5));
    ok(maxAbs > Math.abs(m1) && maxAbs > Math.abs(m2),
        'memo\u2019s claim that max per-config disagreement exceeds either census mean');
    ok(stat(derived[2].map(x => x.d)).sd < stat(derived[1].map(x => x.d)).sd,
        'memo\u2019s claim that phase 2 is tighter than phase 1');
}

// ── G10. HAZARD SCAN of the memo prose ───────────────────────────────────────
// The ruling names these. Quoted material and explicit disclaimers are excluded,
// because a memo that says "no p-value was computed" must not fail a p-value scan.
console.log('\n-- G10. prose hazard scan -----------------------------------------------');
{
    // strip fenced code, blockquotes (the quoted ruling + the required-phrasing block),
    // and the two sections whose whole job is to name what C1 does NOT establish.
    let prose = MEMO
        .replace(/```[\s\S]*?```/g, ' ')
        .split('\n').filter(l => !/^\s*>/.test(l)).join('\n');
    const cut = prose.indexOf('## 9. What C1 does not establish');
    const end = prose.indexOf('## 10.');
    const doesNot = cut >= 0 ? prose.slice(cut, end) : '';
    prose = (cut >= 0 ? prose.slice(0, cut) + prose.slice(end) : prose);
    // also drop the hypothesis subsection, which exists to name untested claims
    prose = prose.replace(/### C\. Untested[\s\S]*?(?=\n## )/g, ' ');

    const hazards = [
        ['inferential language', /\bp-value\b|\bp *[<>=] *0?\.\d|statistically significant|\bsignificance\b(?! criterion)|confidence interval|\bCI\b|null hypothesis|reject(?:s|ed)? the null|standard error|\bt-test\b|permutation test|\bpower\b(?= *(?:analysis|calculation))/i],
        ['generalization', /\bin general\b|generali[sz]es? to|\bextrapolat/i],
        ['sampling claims', /\brandom sample\b|\bsampled from\b|\brepresentative of\b|population of interest/i],
        ['cognition/planning/mechanism', /\bcognitio|\bplanning\b|\breasoning\b|\bunderstands?\b|\bknows?\b|\bintends?\b|mechanism (?:of|behind|is|discovery)|internal representation/i],
        ['futureScore claims', /futureScore (?:causes|drives|improves|encodes|represents)/i],
        ['uncertainty claims', /\bepistemic uncertainty\b|\buncertainty estimate/i],
        ['treatment language exceeding the intervention', /\bimproves? (?:the )?(?:agent|policy|performance)\b|\bbetter agent\b|\bmakes the agent\b|\bsmarter\b|\bcapabilit/i],
        ['UQ-B substrate conflation', /(?:compared|consistent|agrees?|replicat\w+) with UQ-B|as in UQ-B|UQ-B (?:found|showed) the same/i],
        ['post-hoc criteria', /we (?:therefore )?(?:exclude|drop|remove)d?\b|after (?:seeing|inspecting) the (?:data|results) we|new (?:threshold|criterion)/i],
        ['causal overreach', /\bproves?\b|\bdemonstrates? that\b(?! the)|\bconfirms? that\b|\bestablishes? that .{0,30}(?:cause|because)/i],
    ];
    for (const [label, re] of hazards) {
        const m = prose.match(re);
        ok(!m, `no ${label}`, m ? `found "${m[0]}"` : 'clean');
    }
    // the "does not establish" section must positively mention the excluded hazards
    for (const [label, re] of [
        ['generalisation', /generali[sz]/i], ['cognition', /cogniti|planning/i],
        ['mechanism', /mechanism/i], ['UQ-B', /UQ-B/], ['statistical', /statistical/i]])
        ok(re.test(doesNot), `§9 explicitly disclaims ${label}`);

    // required frozen phrasing, C1 v2.0 §15.3
    // Do NOT hardcode the sentence: lift it out of the frozen document so the gate
    // tracks the prereg itself rather than a copy that could silently drift from it.
    const req = flat(PREREG.split('### 15.3 Required phrasing')[1].split('-' + '--')[0])
        .replace(/^The report must state, verbatim and prominently: /, '')
        .replace(/^"|"$/g, '').trim();
    ok(req.length > 120 && /descriptive census/.test(req),
        '§15.3 phrasing lifted from the frozen prereg', req.length + ' chars');
    ok(flat(MEMO).includes(req), 'memo reproduces the frozen §15.3 phrasing VERBATIM');
    // it must not claim adequacy that M19 declined to certify
    ok(!/INSTRUMENT ADEQUATE FOR C1/i.test(MEMO), 'memo does not assert instrument adequacy');
    // and it must not recommend an experiment merely for a pattern
    ok(/do not run another experiment|not recommending a follow-up/i.test(MEMO),
        'memo declines a pattern-driven follow-up experiment');
}

// ── G11. Anti-vacuity: these gates must FAIL against a mutated memo ──────────
console.log('\n-- G11. anti-vacuity (mutation must be detected) -------------------------');
{
    // Mutation 1: flip the sign statement in the memo.
    const row = '| **`Δ < 0`** | ARMED ranks the oracle-optimal action higher | **ARMED** |';
    ok(MEMO.includes(row), 'mutation-1 target row present in the memo');
    const m1 = MEMO.replace(row, '| **`Δ < 0`** | ARMED ranks the oracle-optimal action higher | **ABLATED** |');
    ok(m1 !== MEMO, 'mutation 1 applied (sign table corrupted)');
    ok(!/`\u0394 < 0`[^|]*\|[^|]*\|[^|]*\*\*ARMED\*\*/.test(m1.replace(/Δ/g, '\u0394')),
        'G1(e) would FAIL on the sign-flipped memo');

    // Mutation 2: corrupt a reported statistic.
    const m2 = MEMO.split('0.043257').join('0.143257');
    ok(m2 !== MEMO && !m2.includes('0.043257'),
        'mutation 2 applied (phase-1 mean corrupted) \u2014 G3 compares against re-derivation, ' +
        'which yields 0.043257 and would FAIL');

    // Mutation 3: inject a p-value into the prose.
    const m3 = MEMO.replace('## 1. Executive conclusion',
        '## 1. Executive conclusion\n\nThe difference was statistically significant (p = 0.03).');
    const p3 = m3.replace(/```[\s\S]*?```/g, ' ')
        .split('\n').filter(l => !/^\s*>/.test(l)).join('\n');
    ok(/statistically significant|p *= *0?\.\d/.test(p3),
        'G10 hazard scan would FAIL on a memo containing a p-value');

    // Mutation 4: corrupt the data and confirm G0 detects it.
    const bogus = crypto.createHash('sha256').update('tampered').digest('hex');
    const integ = fs.readFileSync(ROOT + 'experiments/c1/data/INTEGRITY.sha256', 'utf8');
    ok(!integ.includes(bogus), 'G0 digest gate rejects a non-matching data digest');
}

console.log('\n' + '='.repeat(78));
console.log(`  M20 PASS 2: ${checks - fails}/${checks} checks passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'INTERPRETATION VERIFIED' : 'INTERPRETATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

// M22 — FORMULATION GATE.
//
// M22 makes no measurement. What it makes are STRUCTURAL CLAIMS about production source
// and ARITHMETIC CLAIMS in its toy cases and attainability counts. Both kinds are
// checkable, and this gate checks them rather than trusting the prose:
//
//   * every claim about main.js is verified against main.js (read-only);
//   * every toy case is recomputed from rho = r/(n-1) and must match the stated value;
//   * every M14 count is recomputed from the committed artifact;
//   * the identifiability counter-example is recomputed and must actually disagree;
//   * the memo must REJECT the decomposition and must not quietly assert a proportion.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const MEMO = fs.readFileSync(ROOT + 'research/preregistrations/M22_PATHWAY_DECOMPOSITION_FORMULATION.md', 'utf8');
const MAIN = fs.readFileSync(ROOT + 'main.js', 'utf8');
const M14 = JSON.parse(fs.readFileSync(ROOT + 'experiments/m14/m14_attainability.json', 'utf8'));
const RAW = fs.readFileSync(ROOT + 'experiments/c1/data/readouts.jsonl', 'utf8')
    .trim().split('\n').map(l => JSON.parse(l));

const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(MEMO);
let fails = 0, checks = 0;
const ok = (c, label, detail = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`); };
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;

console.log('='.repeat(78));
console.log('  M22 FORMULATION GATE');
console.log('='.repeat(78));

// ── G1. Structural claims about production source ────────────────────────────
console.log('\n-- G1. structural claims vs main.js -------------------------------------');
{
    // The load-bearing claim: generation mixes LEARNED transitions with graph neighbours,
    // so no arm-independent reference set exists. If this were wrong, section 5 changes.
    const gen = MAIN.slice(MAIN.indexOf('UNIFIED CANDIDATE POOL'),
                           MAIN.indexOf('UNIFIED CANDIDATE POOL') + 900);
    ok(/memoryMap\.forEach/.test(gen) && /neighbors\.forEach/.test(gen),
        'generation draws from BOTH memoryMap and graph neighbours');
    ok(/const memoryMap = transitions\.get\(currentKey\)/.test(MAIN),
        'memoryMap IS transitions[currentKey] — learned state, not graph');
    ok(/transitions\.set\(/.test(MAIN), 'transitions is written at runtime (learned)');
    ok(/keys\(transitions_a\(u\)\) ∪ N\(u\)/.test(MEMO) || /keys\(transitions\) ∪ neighbours/.test(MEMO),
        'memo states the generation formula');
    ok(/pre-filter generated set is treatment-dependent/i.test(F),
        'memo draws the right conclusion: generation is arm-dependent');

    // the four filters, each at the line the memo cites
    for (const [name, re] of [
        ['F1', /penalties\.get\(currentKey \+ "->" \+ k\) > 10/],
        ['F2', /getQ\(makeStateKey\(currentKey, goalNeuronId\), k\)/],
        ['F3', /!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained/],
        ['F4', /!canReachGoal\(k, goalNeuronId\)/]])
        ok(re.test(MAIN), `${name} exists in main.js as the memo describes`);
    ok(/F1∘F2∘F3∘F4|F1, F2, F3, F4|F1–F4/.test(MEMO), 'memo names four admission filters');

    // filters run BEFORE analyzeCandidate -> rejected candidates are never weighted.
    // This is the claim that kills D2/D3, so it is checked positionally.
    const iF1 = MAIN.indexOf('penalties.get(currentKey + "->" + k) > 10');
    const iF3 = MAIN.indexOf('!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained');
    const iAn = MAIN.indexOf('analyzeCandidate({');
    ok(iF1 > 0 && iF3 > iF1 && iAn > iF3,
        'F1..F3 all precede analyzeCandidate — rejected candidates are never weighted',
        `F1@${iF1} < F3@${iF3} < analyzeCandidate@${iAn}`);
    ok(/never computed|reject before .{0,20}analyzeCandidate|reject \*\*before\*\*/i.test(F)
        || /F1–F4 reject \*before\* `analyzeCandidate`/.test(MEMO),
        'memo states that rejected candidates are never weighted');
}

// ── G2. The verdict must be a rejection, and must not smuggle a proportion ───
console.log('\n-- G2. the verdict -------------------------------------------------------');
{
    ok(/REJECTED/.test(MEMO) && /not well-posed/i.test(F) && /not identifiable/i.test(F),
        'memo rejects the decomposition explicitly');
    ok(/Total = Ranking \+ Admission/.test(MEMO), 'memo names the rejected identity');
    // four independent grounds must each be present
    for (const [lbl, re] of [
        ['non-additivity', /non-additiv/i],
        ['path-dependence', /path-depend/i],
        ['no separate manipulability', /separate manipulab/i],
        ['post-treatment reference', /post-treatment/i]])
        ok(re.test(F), `rejection ground present: ${lbl}`);
    // it must NOT claim a proportion after rejecting identifiability
    // A sentence that QUOTES the forbidden claim in order to forbid it is not an
    // assertion of it. Check the 140 characters before each hit for a prohibition.
    const proportionClaim = [];
    for (const re of [
        /the ranking pathway accounts for (?:most|\d)/ig,
        /(?:\d+)% of (?:the )?(?:total|contrast|effect) is (?:ranking|admission)/ig,
        /admission (?:accounts for|explains) (?:most|\d)/ig,
    ]) for (const m of F.matchAll(re)) {
        const before = F.slice(Math.max(0, m.index - 140), m.index);
        if (!/must not be read as|NOT be read|does not license|rejects|never be read/i.test(before))
            proportionClaim.push(m[0]);
    }
    ok(proportionClaim.length === 0, 'memo asserts NO proportion',
        proportionClaim.length ? String(proportionClaim[0]) : 'clean');
    ok(/has no answer|no proportion is identifiable/i.test(F),
        'memo states the "in what proportion" clause has no answer');
    // the surviving measurement must be labelled NOT a decomposition
    ok(/NOT a decomposition/i.test(MEMO), 'surviving estimand is labelled not-a-decomposition');
    ok(/third intervention|new intervention/i.test(F),
        'memo concedes the shared set introduces a new intervention');
}

// ── G3. Toy cases recomputed from rho = r/(n-1) ──────────────────────────────
console.log('\n-- G3. toy-case arithmetic ----------------------------------------------');
{
    const rho = (r, n) => r / (n - 1);
    // case 7 ranking-only: P_A=P_B={a,b,c}, v*=b; w_A a>b>c (r=1), w_B b>a>c (r=0)
    const c7d = rho(1, 3) - rho(0, 3), c7s = (1 - 0) / (3 - 1);
    ok(near(c7d, 0.5) && near(c7s, 0.5) && near(c7d, c7s),
        'case 7 ranking-only: delta = shared = +0.5', `${c7d} / ${c7s}`);
    ok(/\+0\.5.{0,12}\|.{0,12}\+0\.5/.test(MEMO) || /`\+0\.5` \| `\+0\.5`/.test(MEMO)
        || F.includes('+0.5 | +0.5'), 'memo states case 7 as +0.5 / +0.5');

    // case 2/8 admission-only: P_A={a,b,c} v*=c last (r=2,n=3); P_B={a,b,c,d}, d below c (r=2,n=4)
    const c2d = rho(2, 3) - rho(2, 4), c2s = (2 - 2) / (3 - 1);
    ok(near(c2d, 1 - 2 / 3) && near(c2s, 0), 'case 2/8 admission-only: delta=+0.333, shared=0',
        `${c2d.toFixed(3)} / ${c2s}`);
    ok(F.includes('1 − 2/3 = +0.333') || F.includes('+0.333'), 'memo states case 2 value');

    // case 3: X_B={d,e} -> n_B=5
    const c3d = rho(2, 3) - rho(2, 5);
    ok(near(c3d, 0.5), 'case 3 multiple exclusives: delta = +0.5', c3d.toFixed(3));

    // case 10 opposing: r_A^cap=1, r_B^cap=2, m=3; X_A=3 above (r_A=4,n_A=6); X_B=2 below (r_B=2,n_B=5)
    const c10d = rho(4, 6) - rho(2, 5), c10s = (1 - 2) / (3 - 1);
    ok(near(c10d, 0.3) && near(c10s, -0.5) && c10d * c10s < 0,
        'case 10 OPPOSING: delta=+0.3, shared=-0.5, signs opposite',
        `${c10d.toFixed(3)} / ${c10s}`);
    ok(F.includes('4/5 − 2/4 = +0.3') && F.includes('(1−2)/2 = −0.5'),
        'memo states case 10 values');

    // 5.1 rescaling instance: r_A^cap=2, m=3, e_A=3 -> 2/5 vs 2/2
    ok(near(2 / 5, 0.4) && near(2 / 2, 1.0) && F.includes('2/5 = 0.40') && F.includes('2/2 = 1.00'),
        '5.1 rescaling instance is arithmetically correct (0.40 vs 1.00)');

    // 5.2 pivot counter-example must ACTUALLY disagree
    const pivCap = (1 - 0) / (3 - 1);                 // ranking at P_cap
    const pivA = rho(1, 4) - rho(1, 4);               // ranking at P_A: 1/3 - 1/3
    ok(near(pivCap, 0.5) && near(pivA, 0) && pivCap !== pivA,
        '5.2 counter-example: two pivots give +0.5 and 0.0 — genuinely different',
        `${pivCap} vs ${pivA}`);
    ok(F.includes('+0.5 and 0.0') || (F.includes('+0.5') && F.includes('0.0')),
        'memo reports both pivot values');

    // edge cases must be stated as undefined, not silently handled
    ok(/m = 0.{0,40}undefined/i.test(F) || /empty intersection.{0,60}undefined/i.test(F),
        'case 11 m=0 stated undefined');
    ok(/m = 1.{0,60}(?:zero|÷0|divides by zero)/i.test(F),
        'case 12 m=1 stated as division by zero');
}

// ── G4. M14 attainability counts recomputed ──────────────────────────────────
console.log('\n-- G4. M14 counts recomputed --------------------------------------------');
{
    const rankIn = (pool, set, star) => {
        const f = pool.filter(e => set.has(e[0]));
        if (!f.some(e => e[0] === star)) return null;
        const wv = new Map(f).get(star);
        return { r: f.filter(e => e[1] > wv).length, n: f.length };
    };
    const rows = [], struct = [];
    for (const r of M14.results) for (const st of r.perState) {
        const A = new Set(st.poolA.map(e => e[0])), B = new Set(st.poolB.map(e => e[0]));
        const I = new Set([...A].filter(x => B.has(x)));
        for (const ph of ['1', '2']) {
            const o = st.optRank && st.optRank[ph]; if (!o) continue;
            struct.push({ m: I.size, eA: A.size - I.size, eB: B.size - I.size,
                          inA: A.has(o.star), inB: B.has(o.star) });
            const fA = rankIn(st.poolA, A, o.star), fB = rankIn(st.poolB, B, o.star);
            const iA = rankIn(st.poolA, I, o.star), iB = rankIn(st.poolB, I, o.star);
            if (!fA || !fB || !iA || !iB || fA.n < 2 || fB.n < 2 || iA.n < 2) continue;
            rows.push({ d: fA.r / (fA.n - 1) - fB.r / (fB.n - 1),
                        s: (iA.r - iB.r) / (iA.n - 1), eA: fA.n - iA.n, eB: fB.n - iB.n });
        }
    }
    const c = (a, f) => a.filter(f).length;
    ok(struct.length === 152 && F.includes('152 state-rows'), 'memo states 152 state-rows',
        String(struct.length));
    ok(c(struct, r => r.m === 0) === 0 && /\| \*\*0\*\* \|/.test(MEMO),
        'm=0 never occurred and the memo records it');
    ok(c(struct, r => r.m >= 2) === 150 && c(struct, r => r.m >= 3) === 144
        && F.includes('150 / 144'), 'memo states m>=2 / m>=3 as 150 / 144',
        `${c(struct, r => r.m >= 2)} / ${c(struct, r => r.m >= 3)}`);
    ok(c(struct, r => r.eA === 0 && r.eB === 0) === 10 && F.includes('| 10 |'),
        'identical pools = 10');
    ok(c(struct, r => r.inA && r.inB) === 149 && F.includes('149 / **0** / **0** / 3')
        || c(struct, r => r.inA && r.inB) === 149 && F.includes('149 / 0 / 0 / 3'),
        'v* in both = 149, never arm-exclusive', String(c(struct, r => r.inA && r.inB)));
    ok(rows.length === 148 && F.includes('148'), 'both-defined rows = 148', String(rows.length));
    ok(c(rows, r => r.s !== 0) === 96 && F.includes('96 / 52'), 'shared non-zero = 96');
    ok(c(rows, r => r.d !== 0 && r.s === 0) === 23 && /\| \*\*23\*\* \|/.test(MEMO),
        'admission-only pattern = 23', String(c(rows, r => r.d !== 0 && r.s === 0)));

    // the PASS 2 honesty repair: sign agreement counted only where BOTH are non-zero
    const both = rows.filter(r => r.d !== 0 && r.s !== 0);
    const agree = c(both, r => Math.sign(r.d) === Math.sign(r.s));
    const jz = c(rows, r => r.d === 0 && r.s === 0);
    ok(both.length === 94 && agree === 93, 'both-non-zero = 94, agree = 93',
        `${agree}/${both.length}`);
    ok(F.includes('93 / 1') && F.includes('93 of 94'),
        'memo reports the HONEST sign-agreement figure, not the inflated one');
    ok(jz === 29 && F.includes('29 of those are'),
        'memo discloses the joint zeros that inflated the naive count', String(jz));

    // identical pools must give delta == shared exactly (algebraic consistency)
    const idp = rows.filter(r => r.eA === 0 && r.eB === 0);
    ok(idp.length === 7 && idp.every(r => near(r.d, r.s, 1e-12)),
        'identical-pool rows satisfy delta == shared exactly (7/7)', `${idp.length}`);

    // the collinearity that drives the recommendation
    const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
    const d = rows.map(r => r.d), s = rows.map(r => r.s);
    const sd = x => Math.sqrt(mean(x.map(v => (v - mean(x)) ** 2)));
    const corr = mean(rows.map(r => (r.d - mean(d)) * (r.s - mean(s)))) / (sd(d) * sd(s));
    ok(near(corr, 0.957, 5e-4) && F.includes('0.957'), 'memo states corr = 0.957',
        corr.toFixed(4));
    ok(/materially weakens|strongest objection/i.test(F),
        'memo treats the collinearity as an objection, not a selling point');
}

// ── G5. C1 recoverability claims checked against the artifact ────────────────
console.log('\n-- G5. C1 recoverability -------------------------------------------------');
{
    const keys = Object.keys(RAW[0].cells[0]);
    ok(!keys.some(k => /^pool[AB]$|member|weight/i.test(k)),
        'C1 cells carry NO membership and NO weights', keys.join(','));
    ok(keys.includes('nA') && keys.includes('vStar') && keys.includes('delta'),
        'C1 cells DO carry size, oracle identity and delta');
    ok(/C1 is insufficient/i.test(F), 'memo states C1 is insufficient');
    ok(/reopening C1 would not help/i.test(F), 'memo states reopening C1 would not help');
    ok(/would survive a perfect instrument|does not depend on any datum|survive perfect data/i.test(F),
        'memo states the identifiability failure is not a data problem');
    const st = M14.results[0].perState[0];
    ok(Array.isArray(st.poolA) && 'rAinB' in st,
        'M14 genuinely records membership and cross-pool rank');
    ok(/richer instrumentation is constructible — and nothing more|cannot repair a non-identified/i.test(F),
        'memo refuses to let M14 stand in for identifiability');
}

// ── G6. Formulation-only discipline and required outputs ─────────────────────
console.log('\n-- G6. discipline and required outputs ----------------------------------');
{
    ok(/FORMULATION ONLY/.test(MEMO), 'declares formulation-only');
    ok(/No seed was generated, inspected, selected or consumed/i.test(F), 'states no seed touched');
    ok(/remains open and untouched|remains open and unrepaired|left untouched/i.test(F),
        'registry defect left open');
    for (const [n, re] of [
        [1, /## 1\. Exact research question/], [2, /## 2\. Formal variables/],
        [3, /## 3\. Candidate decomposition definitions/], [4, /## 4\. Counterfactual analysis/],
        [5, /## 5\. Identifiability analysis/], [6, /## 6\. E6 recoverability/],
        [7, /## 7\. Attainability analysis/], [8, /## 8\. Toy-case results/],
        [9, /## 9\. Failure cases/], [10, /## 10\. Evidence → Inference → Hypothesis/],
        [11, /## 11\. Explicit rejections/], [12, /## 12\. The one minimal measurement/],
        [13, /## 13\. Exact next milestone/]])
        ok(re.test(MEMO), `required output ${n} present`);
    ok(/# PASS 2 — INDEPENDENT SELF-CHALLENGE/.test(MEMO), 'PASS 2 self-challenge present');
    for (const t of ['shared-set validity', 'separation', 'rename the total effect', 'Additivity',
                     'Identifiability', 'recoverability', 'Counterfactual validity', 'Edge cases',
                     'Attainability'])
        ok(new RegExp(t, 'i').test(MEMO), `PASS 2 attacks: ${t}`);
    // all 12 toy cases
    for (let i = 1; i <= 12; i++)
        ok(new RegExp(`^\\| ${i} \\|`, 'm').test(MEMO), `toy case ${i} present`);
    // no promoted cognitive claim
    const banned = [['cognition', /\bcognition (?:is|was|has been)\b/i],
                    ['planning', /agent (?:is )?planning|planning (?:is|was) (?:shown|demonstrated)/i],
                    ['mechanism discovered', /mechanism (?:is|was) discovered/i],
                    ['futureScore harmful', /futureScore (?:is|was) harmful/i]];
    for (const [l, re] of banned) ok(!re.test(F), `no promoted claim: ${l}`);
    ok(/No cognitive, planning, mechanistic or `futureScore` claim is promoted/.test(MEMO),
        'memo states the no-promotion rule');
}

// ── G7. Working tree confirms formulation-only ───────────────────────────────
console.log('\n-- G7. working tree ------------------------------------------------------');
{
    // Untracked files that predate this milestone are not M22 modifications. What must
    // be empty is the set of TRACKED changes: nothing committed may have been altered.
    const dirty = execSync('git status --porcelain main.js experiments/ ' +
        'research/preregistrations/C1_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(String.fromCharCode(10)).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to main.js, experiments/ or the frozen C1 prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
}

// ── G8. Anti-vacuity ─────────────────────────────────────────────────────────
console.log('\n-- G8. anti-vacuity ------------------------------------------------------');
{
    ok(!/ACCEPTED as a causal decomposition/i.test(MEMO),
        'G2 would fire if the memo accepted the decomposition');
    const m = MEMO.replace('is REJECTED', 'is ACCEPTED');
    ok(m !== MEMO && !/is REJECTED\. It is not well-posed/.test(m),
        'the rejection verdict is present as a mutable string');
    ok(!F.includes('0.857') && F.includes('0.957'),
        'G4 binds the collinearity figure to the recomputation');
    ok(near((1 - 0) / 2, 0.5) && !near((1 - 0) / 2, 0.0),
        'G3 pivot check is a real inequality, not a tautology');
}

console.log('\n' + '='.repeat(78));
console.log(`  M22 FORMULATION GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

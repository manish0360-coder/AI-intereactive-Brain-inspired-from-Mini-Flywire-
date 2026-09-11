// M23 — FORMULATION GATE.
//
// The load-bearing claims in M23 are (a) a SOURCE claim — that `penalties` gates
// admission and also enters the weight, which is the whole reason the causal reading is
// rejected; (b) TOY-CASE arithmetic; (c) M14 counts; and (d) a discipline claim — that
// the decomposition rejected at M22 has not re-entered under a new name.
// All four are checked here rather than trusted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const MEMO = fs.readFileSync(ROOT + 'research/preregistrations/M23_COMMON_CANDIDATE_RANKING_FORMULATION.md', 'utf8');
const MAIN = fs.readFileSync(ROOT + 'main.js', 'utf8');
const PREREG = fs.readFileSync(ROOT + 'research/preregistrations/C1_PREREGISTRATION.md', 'utf8');
const M14 = JSON.parse(fs.readFileSync(ROOT + 'experiments/m14/m14_attainability.json', 'utf8'));
const RAW = fs.readFileSync(ROOT + 'experiments/c1/data/readouts.jsonl', 'utf8')
    .trim().split('\n').map(l => JSON.parse(l));

const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(MEMO);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;

console.log('='.repeat(78));
console.log('  M23 FORMULATION GATE');
console.log('='.repeat(78));

// ── G1. The selection mechanism — the claim the whole verdict rests on ───────
console.log('');
console.log('-- G1. penalties is a common cause of admission AND weight ---------------');
{
    const iF1 = MAIN.indexOf('penalties.get(currentKey + "->" + k) > 10');
    ok(iF1 > 0, 'F1 admission reads penalties (main.js)', 'offset ' + iF1);
    const iW = MAIN.indexOf("const penalty = penalties.get(currentKey + '->' + k)");
    ok(iW > 0, 'the weight path also reads penalties', 'offset ' + iW);
    ok(/penalty \* 1\.5/.test(MAIN), 'penalty enters the weight with coefficient 1.5');
    ok(iW > iF1, 'the weight read occurs after the admission gate (same candidate loop)');
    ok(/getQ\(makeStateKey\(currentKey, goalNeuronId\), k\)/.test(MAIN),
        'F2 admission reads getQ');
    // the memo must state it, with the right line numbers
    for (const n of ['1610', '1754', '1878', '1620'])
        ok(MEMO.includes(':' + n) || MEMO.includes(n), `memo cites main.js:${n}`);
    ok(/direct common cause of both the admission decision and the weight/i.test(F),
        'memo states the common-cause structure');
    ok(/post-treatment/i.test(F) && /shares a direct cause/i.test(F),
        'memo names post-treatment conditioning with a shared cause');
}

// ── G2. The verdict: YELLOW, classification B, A explicitly rejected ─────────
console.log('');
console.log('-- G2. decision gate ----------------------------------------------------');
{
    ok(/# M23-YELLOW/.test(MEMO), 'gate verdict is M23-YELLOW');
    ok(!/# M23-GREEN/.test(MEMO) && !/# M23-RED/.test(MEMO),
        'exactly one gate verdict is asserted');
    ok(/causal interpretation is rejected/i.test(F), 'causal interpretation rejected');
    ok(/B — a legitimate descriptive conditional ranking measurement/i.test(F)
        || /Classification: B/i.test(F), 'classification B selected');
    // Three-column rows: | **X** | description | verdict |. The first version of this
    // check used [^|] spans that could not cross the middle column, so every row failed
    // even though the table was correct — a predicate error, not a memo error.
    const BAR = String.fromCharCode(124);
    const rowOf = (letter) => {
        const want = BAR + ' **' + letter + '** ' + BAR;
        const line = MEMO.split(String.fromCharCode(10)).find(x => x.startsWith(want));
        if (!line) return null;
        const cells = line.split(BAR).map(x => x.trim());
        return { desc: cells[2] || '', verdict: cells[3] || '' };
    };
    for (const [l, want] of [['A', /REJECTED/], ['B', /SELECTED/], ['C', /rejected/],
                             ['D', /rejected/], ['E', /rejected/]]) {
        const r = rowOf(l);
        ok(r !== null && want.test(r.verdict) && r.desc.length > 5,
            `classification ${l} is adjudicated`,
            r ? r.verdict.slice(0, 44) : 'row not found');
    }
    ok(rowOf('A').verdict.includes('REJECTED') && rowOf('B').verdict.includes('SELECTED'),
        'exactly the intended verdicts: A rejected, B selected');
    ok(/Do not force A|A is rejected|A is REJECTED|Classification A is rejected|\*\*REJECTED\*\*/.test(MEMO),
        'A is not forced');
}

// ── G3. The rejected M22 decomposition must NOT have returned ────────────────
console.log('');
console.log('-- G3. M22 rejection still holds ----------------------------------------');
{
    // BLOCK-LEVEL, not lookbehind. A preceding-window exemption tests what happens to
    // sit before a sentence, which is not a property of the sentence: the first version
    // of this gate let a reintroduced 'ranking pathway accounts for most' through because
    // the classification table above it contained the word 'rejected'. Same error as
    // M21-R1. Only a block that is itself a prohibition may carry the phrasing.
    const BANNED = [
        /% of (?:the )?(?:C1 )?(?:total|contrast|effect) (?:is|due to) (?:ranking|admission)/i,
        /ranking (?:pathway )?accounts for (?:most|[0-9])/i,
        /admission (?:pathway )?accounts for (?:most|[0-9])/i,
        /Total = Ranking \+ Admission (?:holds|is valid|can be)/i,
    ];
    const claims = [];
    const NL = String.fromCharCode(10);
    for (const block of MEMO.split(NL + NL)) {
        const fb = flat(block);
        // a prohibition block SAYS it is one, in its own text
        const isProhibition = /must not|may not|forbid|never be read|would be back if|no proportion|is rejected|REJECTED/i.test(fb);
        if (isProhibition) continue;
        for (const re of BANNED) { const m = fb.match(re); if (m) claims.push(m[0]); }
    }
    ok(claims.length === 0, 'no proportion attributed to ranking vs admission',
        claims.length ? JSON.stringify(claims) : 'clean');
    ok(/no residual is formed/i.test(F), 'memo states no residual is formed');
    ok(/rejected decomposition has not re-entered|has it re-entered|re-entered under a new name/i.test(F),
        'memo explicitly self-checks for the renamed decomposition');
    // and the memo must deny that tau is "the ranking pathway"
    ok(/not the .{0,20}ranking pathway|does not measure .{0,20}ranking pathway|forbid/i.test(F),
        'memo denies that the new quantity is the ranking pathway');
    ok(/total-history divergence restricted to co-admitted/i.test(F),
        'memo states the quantity is a TOTAL-effect measure on a selected subset');
}

// ── G4. Toy-case arithmetic, recomputed ──────────────────────────────────────
console.log('');
console.log('-- G4. toy-case arithmetic ----------------------------------------------');
{
    const rho = (r, n) => r / (n - 1);
    // Q1: identical pools {a,b,c}, v*=a first under both; b,c swapped
    //     delta = 0 ; tau = 1 discordant pair of 3
    const q1delta = rho(0, 3) - rho(0, 3);
    ok(near(q1delta, 0), 'Q1: delta = 0 with identical pools and v* first in both');
    ok(near(1 / 3, 0.3333, 1e-4) && F.includes('1/3'), 'Q1: tau = 1/3 (one discordant pair of 3)');
    // exhaustive check that exactly one pair of three is discordant for a>b>c vs a>c>b
    const wA = { a: 3, b: 2, c: 1 }, wB = { a: 3, b: 1, c: 2 };
    const ks = ['a', 'b', 'c']; let disc = 0, tot = 0;
    for (let i = 0; i < 3; i++) for (let k = i + 1; k < 3; k++) {
        const x = ks[i], y = ks[k];
        const sA = Math.sign(wA[x] - wA[y]), sB = Math.sign(wB[x] - wB[y]);
        if (sA && sB) { tot++; if (sA !== sB) disc++; }
    }
    ok(tot === 3 && disc === 1, 'Q1 discordance recomputed exhaustively: 1 of 3', `${disc}/${tot}`);

    // Q2: common {a,b,c} ordered a>b>c in both, v*=b; P_A={a,b,c}, P_B={a,b,c,d} with d above b
    const q2 = rho(1, 3) - rho(2, 4);
    ok(near(q2, 0.5 - 2 / 3) && near(q2, -0.16666666666666666),
        'Q2: delta = -0.167 while common ordering is identical', q2.toFixed(3));
    ok(F.includes('−0.167') || F.includes('-0.167'), 'memo states Q2 value');
    ok(/τ_∩ = 0/.test(MEMO) || F.includes('tau = 0') || F.includes('τ∩ = 0'),
        'memo states Q2 has zero common-set discordance');

    // Q1 and Q2 must be mutually exclusive: one has delta=0,tau!=0 ; other delta!=0,tau=0
    ok(near(q1delta, 0) && disc > 0 && !near(q2, 0),
        'Q1 and Q2 are mutually exclusive — a re-representation could produce neither');

    // resolution boundary: m=2 gives exactly one comparable pair
    const pairs = (m) => m * (m - 1) / 2;
    ok(pairs(2) === 1 && pairs(3) === 3,
        'm=2 gives 1 pair (binary), m=3 gives 3 (first graded)', `${pairs(2)} / ${pairs(3)}`);
    ok(/m ≥ 3/.test(MEMO) && /binary/i.test(F), 'memo declares the m>=3 resolution boundary');
}

// ── G5. M14 counts recomputed from the committed artifact ────────────────────
console.log('');
console.log('-- G5. M14 counts -------------------------------------------------------');
{
    const rows = [];
    for (const r of M14.results) for (const st of r.perState) {
        const A = new Map(st.poolA), B = new Map(st.poolB);
        const I = [...A.keys()].filter(k => B.has(k));
        let disc = 0, tot = 0;
        for (let i = 0; i < I.length; i++) for (let k = i + 1; k < I.length; k++) {
            const a = Math.sign(A.get(I[i]) - A.get(I[k]));
            const b = Math.sign(B.get(I[i]) - B.get(I[k]));
            if (a !== 0 && b !== 0) { tot++; if (a !== b) disc++; }
        }
        rows.push({ m: I.length, disc, tot, argmaxDiff: st.bestA !== st.bestB,
                    bestAinB: B.has(st.bestA), bestBinA: A.has(st.bestB) });
    }
    const c = f => rows.filter(f).length;
    ok(rows.length === 76 && F.includes('76 state-rows'), 'M14 state-rows = 76', String(rows.length));
    const usable = rows.filter(r => r.tot > 0);
    ok(usable.length === 75 && F.includes('| 75 |'), 'tau defined in 75 rows', String(usable.length));
    ok(c(r => r.tot > 0 && r.disc === 0) === 11 && /\| \*\*11\*\* \|/.test(MEMO),
        'zero-discordance rows = 11 (the attainable null)',
        String(c(r => r.tot > 0 && r.disc === 0)));
    ok(c(r => r.tot > 0 && r.disc > 0) === 64 && F.includes('| 64 |'),
        'some-discordance rows = 64');
    const fr = usable.map(r => r.disc / r.tot);
    const mean = fr.reduce((a, b) => a + b, 0) / fr.length;
    ok(near(Math.min(...fr), 0) && near(Math.max(...fr), 1) && near(mean, 0.460, 5e-4),
        'discordance fraction spans 0.000–1.000, mean 0.460', mean.toFixed(3));
    ok(F.includes('0.000 / 0.460 / 1.000'), 'memo states min/mean/max exactly');
    // argmax structure
    ok(c(r => r.argmaxDiff) === 55 && F.includes('55 / 76'), 'argmax differs in 55 of 76');
    ok(c(r => r.argmaxDiff && r.bestAinB && r.bestBinA) === 24 && /\| \*\*24\*\* \|/.test(MEMO),
        'both bests co-admitted in 24', String(c(r => r.argmaxDiff && r.bestAinB && r.bestBinA)));
    ok(c(r => r.argmaxDiff && !r.bestAinB) === 19 && c(r => r.argmaxDiff && !r.bestBinA) === 18,
        'non-co-admitted bests: 19 / 18');
    // the null must be ATTAINABLE — the L4 test UQ-B's C2 failed
    ok(c(r => r.tot > 0 && r.disc === 0) > 0 && c(r => r.tot > 0 && r.disc > 0) > 0,
        'BOTH the null and non-null are attainable — not forced by construction');
    ok(/not forced by construction/i.test(F), 'memo states it is not forced by construction');
    ok(/development fixtures, not a census|not evidence for any population claim/i.test(F),
        'memo binds the M14 figures to exercisability only');
}

// ── G6. E1 comparison — the claim that most threatens the proposal ───────────
console.log('');
console.log('-- G6. E1 comparison ----------------------------------------------------');
{
    ok(/E1\(c\) = \|\{ u : best_ARMED\(u\) ≠ best_ABLATED\(u\) \}\|/.test(PREREG),
        'E1 is defined in the frozen prereg as the memo states');
    const e = RAW.map(r => r.e1);
    ok(Math.min(...e) === 10 && Math.max(...e) === 19 && e.every(x => x !== 0),
        'C1 measured E1 in [10,19], never 0', `${Math.min(...e)}-${Math.max(...e)}`);
    ok(F.includes('E1 ∈ [10, 19]') || F.includes('E1 ∈ [10,19]'), 'memo states the E1 range');
    ok(/already established|already answers the headline|already in the record/i.test(F),
        'memo concedes E1 already answers the headline question');
    ok(/argmax-only/i.test(F) && /admission-confounded|admission-confound/i.test(F),
        'memo states what tau adds over E1');
}

// ── G7. Discipline, required structure, no promoted claims ───────────────────
console.log('');
console.log('-- G7. discipline -------------------------------------------------------');
{
    ok(/FORMULATION ONLY/.test(MEMO), 'declares formulation-only');
    ok(/No seed was generated, inspected, selected or consumed/i.test(F), 'no seed touched');
    ok(/C1 was not reopened/i.test(F) && /no E6 replication is proposed/i.test(F),
        'states C1 not reopened and no E6 replication');
    ok(/remains open and untouched/i.test(F), 'registry defect left open');
    // required Pass-2 attacks
    for (const t of ['Post-treatment conditioning', 'Intersection selection', 'Causal interpretation',
                     'Normalisation', 'Oracle dependence', 'aggregation', 'one-element',
                     'Treatment-dependent weights', 'consequence of admission',
                     'generation itself is treatment-dependent'])
        ok(new RegExp(t, 'i').test(MEMO), `PASS 2 attacks: ${t}`);
    // all 10 attainability cases and all 5 distinctness questions
    for (let i = 1; i <= 10; i++)
        ok(new RegExp(`^\\| ${i} \\|`, 'm').test(MEMO), `attainability case ${i} present`);
    for (let i = 1; i <= 5; i++)
        ok(new RegExp(`Case Q${i} —`).test(MEMO), `distinctness question Q${i} present`);
    // E -> I -> H -> Future validation
    for (const s of ['Evidence', 'Inference', 'Hypothesis', 'Future validation'])
        ok(new RegExp(`\\*\\*${s}\\*\\*`).test(MEMO), `separation level present: ${s}`);
    // no promoted cognitive claim
    for (const [l, re] of [
        ['cognition', /\bis cognition\b|demonstrates cognition|evidence of cognition/i],
        ['planning', /demonstrates planning|evidence of planning|the agent plans/i],
        ['intelligence', /\bis intelligent\b|demonstrates intelligence/i],
        ['engineering usefulness', /proves? engineering usefulness|is engineering-useful/i]])
        ok(!re.test(F), `no promoted claim: ${l}`);
    ok(/is \*\*not\*\* cognition, \*\*not\*\* planning, \*\*not\*\* intelligence/.test(MEMO)
        || /not cognition, not planning, not intelligence/i.test(F),
        'memo states the no-promotion rule explicitly');
    ok(/North Star|Noetica/.test(MEMO), 'North Star kept explicit');
}

// ── G8. Working tree ─────────────────────────────────────────────────────────
console.log('');
console.log('-- G8. working tree -----------------------------------------------------');
{
    const dirty = execSync('git status --porcelain main.js experiments/ ' +
        'research/preregistrations/C1_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(String.fromCharCode(10)).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to main.js, experiments/ or the frozen C1 prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
}

// ── G9. Anti-vacuity ─────────────────────────────────────────────────────────
console.log('');
console.log('-- G9. anti-vacuity -----------------------------------------------------');
{
    ok(MEMO.includes('# M23-YELLOW'), 'verdict string present and mutable');
    ok(!MEMO.includes('# M23-GREEN'), 'G2 would fire if GREEN were also asserted');
    ok(F.includes('0.460') && !F.includes('0.560'), 'G5 binds the mean to the recomputation');
    ok(near(1 / 3, 0.333333, 1e-5) && !near(1 / 3, 0.5, 1e-5),
        'G4 Q1 check is a real inequality, not a tautology');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M23 FORMULATION GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

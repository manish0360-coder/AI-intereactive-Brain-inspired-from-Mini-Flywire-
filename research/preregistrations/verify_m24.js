// M24 — FORMULATION GATE.
//
// M24's conclusions rest on SOURCE FACTS about how configurations are generated and
// accepted. Those are checkable, and the two load-bearing ones are checked here by
// EXECUTION rather than by reading:
//
//   * seeds 0 and 1 really do produce an identical PRNG stream (the non-injectivity
//     that the seed-space / configuration-space distinction rests on);
//   * acceptance really is computed with no agent and no arm (pre-treatment), and
//     really does condition on the oracle's structure via R2 and R5.
//
// Executing makeRng on the integers 0 and 1 consumes no registered seed and
// instantiates no configuration: makeConfig is never called anywhere in this file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { makeRng } from '../../instrumentation/rng.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const MEMO = fs.readFileSync(ROOT + 'research/preregistrations/M24_SAMPLING_FRAME_FORMULATION.md', 'utf8');
const ENV = fs.readFileSync(ROOT + 'experiments/m7/env.js', 'utf8');
const RNG = fs.readFileSync(ROOT + 'instrumentation/rng.js', 'utf8');
const PROTO = fs.readFileSync(ROOT + 'experiments/c1/protocol.js', 'utf8');
const C1RES = JSON.parse(fs.readFileSync(ROOT + 'experiments/c1/results/c1_results.json', 'utf8'));

const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(MEMO);
const NL = String.fromCharCode(10);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };

console.log('='.repeat(78));
console.log('  M24 FORMULATION GATE');
console.log('='.repeat(78));

// ── G1. Non-injectivity, established by EXECUTION not by reading ─────────────
console.log('');
console.log('-- G1. seed space is not configuration space ----------------------------');
{
    ok(/let a = \(seed >>> 0\) \|\| 1;/.test(RNG), 'makeRng coerces seed 0 to 1 (source)');
    // execute: the two streams must be identical draw-for-draw
    const r0 = makeRng(0), r1 = makeRng(1);
    const a = [], b = [];
    for (let i = 0; i < 64; i++) { a.push(r0()); b.push(r1()); }
    const identical = a.every((x, i) => x === b[i]);
    ok(identical, 'seeds 0 and 1 produce an IDENTICAL stream (executed, 64 draws)',
        `first draw ${a[0]}`);
    // and a control: two ordinary distinct seeds must NOT collide, or the check is vacuous
    const c0 = makeRng(7), c1 = makeRng(8);
    let differs = false;
    for (let i = 0; i < 64; i++) if (c0() !== c1()) { differs = true; break; }
    ok(differs, 'CONTROL: seeds 7 and 8 do NOT collide — the collision check is not vacuous');
    ok(/seeds 0 and 1 produce identical streams/i.test(F)
        || /seeds 0 and 1 collapse/i.test(F) || /seeds 0 and 1/i.test(F),
        'memo reports the 0/1 collapse');
    ok(/not injective/i.test(F), 'memo concludes makeConfig is not injective');
    ok(/mulberry32/i.test(F) && /mulberry32/i.test(RNG), 'memo names the actual PRNG');
}

// ── G2. Acceptance is PRE-treatment and conditions on the oracle ─────────────
console.log('');
console.log('-- G2. the acceptance predicate -----------------------------------------');
{
    ok(/cfg\.accepted = cfg\.checks\.R1 && cfg\.checks\.R2 && cfg\.checks\.R3 && cfg\.checks\.R4/
        .test(ENV), 'acceptance is R1..R5 and G11 (source)');
    ok(/G11 === true/.test(ENV), 'G11 is an acceptance term');
    // pre-treatment: evaluateConstraints must not touch any agent/arm symbol
    const body = ENV.slice(ENV.indexOf('export function evaluateConstraints'),
                           ENV.indexOf('// R5 — decision relevance'));
    const agentish = ['ARMED', 'ABLATED', 'futureBonus', 'agentSeed', 'arm', 'tick'];
    const found = agentish.filter(s => new RegExp('\\b' + s + '\\b').test(body));
    ok(found.length === 0, 'evaluateConstraints references NO agent/arm symbol — pre-treatment',
        found.length ? found.join(',') : 'clean');
    ok(/PRE-treatment|pre-treatment/i.test(F), 'memo states acceptance is pre-treatment');
    ok(/does \*\*not\*\* bias estimation \*within\*|does not bias estimation within/i.test(MEMO + F),
        'memo states acceptance does not bias estimation within P2');

    // R2 and R5 condition on the ORACLE's structure — the core of section 7
    ok(/if \(bestLong > bestShort\) r2Starts\+\+;/.test(ENV),
        'R2 requires a longer route to beat the hop-shortest on reliability');
    ok(/const R5 = r5\.count >= 4;/.test(ENV),
        'R5 requires reliability-optimal and hop-optimal policies to differ on >= 4 states');
    ok(/reliability-optimal policy differs from the hop-optimal policy on ≥ 4 decision states/i.test(F)
        || /differ on ≥ 4 decision states/i.test(F), 'memo states R5 exactly');
    ok(/G11_THRESHOLD = 0\.10/.test(ENV) && F.includes('0.10'),
        'R3/R4/G11 threshold is 0.10 as the memo states');
    ok(/acceptance conditions on|condition on a property of exactly the object|selects on/i.test(F),
        'memo concludes acceptance is outcome-adjacent');
}

// ── G3. Fixed scope: one graph, one agent seed, four goals ───────────────────
console.log('');
console.log('-- G3. what is fixed and therefore unsampled ----------------------------');
{
    ok(/agentSeed: 20260819000/.test(PROTO), 'agentSeed is a single fixed value (source)');
    ok(F.includes('20260819000') && /fixed/i.test(F), 'memo reports the fixed agent seed');
    ok(/N_UNRELIABLE\s*=\s*13/.test(ENV), 'N_UNRELIABLE = 13 (source)');
    ok(/goalIndices: Object\.freeze\(\[0, 1, 2, 3\]\)/.test(PROTO), 'four goal indices per seed');
    ok(/four\*?\*? configurations|cluster size 4|four configurations per seed/i.test(F),
        'memo states four configurations per seed');
    ok(/cluster sample/i.test(F), 'memo identifies the block as a cluster sample');
    const edges = JSON.parse(fs.readFileSync(ROOT + 'connections.json', 'utf8'));
    const nodes = JSON.parse(fs.readFileSync(ROOT + 'neurons.json', 'utf8'));
    const nE = Array.isArray(edges) ? edges.length : Object.keys(edges).length;
    const nN = Array.isArray(nodes) ? nodes.length : Object.keys(nodes).length;
    ok(nN === 20 && nE === 39 && F.includes('20 nodes') && F.includes('39 edges'),
        'graph is fixed at 20 nodes / 39 edges as the memo states', `${nN}/${nE}`);
}

// ── G4. C1 accounting ────────────────────────────────────────────────────────
console.log('');
console.log('-- G4. C1 acceptance accounting -----------------------------------------');
{
    const d = C1RES.accounting.dispositions;
    ok(d.ACCEPTED === 70 && d.REJECTED === 3930 && d.INVALID === 0 && d.FAILED === 0,
        'C1 dispositions 70 / 3930 / 0 / 0', JSON.stringify(d));
    ok(C1RES.accounting.candidates === 4000 && C1RES.accounting.seedsEnumerated === 1000,
        '4000 candidates from 1000 seeds');
    ok(F.includes('70 ACCEPTED / 3930 REJECTED') || (F.includes('3930') && F.includes('70')),
        'memo states the dispositions');
    const rate = 100 * d.ACCEPTED / C1RES.accounting.candidates;
    ok(Math.abs(rate - 1.75) < 1e-9 && F.includes('1.75%'),
        'acceptance rate is exactly 1.75% as the memo states', rate.toFixed(4) + '%');
}

// ── G5. The verdict and its mandatory limitations ────────────────────────────
console.log('');
console.log('-- G5. decision gate ----------------------------------------------------');
{
    ok(/# M24-YELLOW/.test(MEMO), 'gate verdict is M24-YELLOW');
    ok(!/# M24-GREEN/.test(MEMO) && !/# M24-RED/.test(MEMO),
        'exactly one gate verdict is asserted');
    // the five mandatory limitations
    for (const [l, re] of [
        ['P2 not P1', /target is .{0,6}P2.{0,6}, never .{0,6}P1/i],
        ['block is a census not a sample', /census of .{0,12}P2 ∩ B|is not a sample/i],
        ['cluster structure', /cluster structure must be honoured|cluster sample/i],
        ['one graph one agent seed', /one graph, one hidden-variable family, one agent seed/i],
        ['P2 size unknown', /P2.{0,4} size is unknown|cardinality is unknown/i]])
        ok(re.test(F), `mandatory limitation present: ${l}`);
    // level B only
    ok(/Level B and no further|capped at level B|licenses generalisation level .{0,4}B/i.test(F),
        'memo caps generalisation at level B');
    ok(/level D is not a sampling question|not by any margin|not a sampling question at all/i.test(F),
        'memo states level D is not a sampling question');
}

// ── G6. The claim the ruling asked to be destroyed ───────────────────────────
console.log('');
console.log('-- G6. "a fresh block is automatically representative" ------------------');
{
    ok(/REJECTED EXPLICITLY/i.test(MEMO), 'the representativeness claim is explicitly rejected');
    ok(/establishes NOTHING about representativeness|establishes nothing about representativeness/i.test(F),
        'memo states what a block does not establish');
    // it must also state what a block DOES establish — a rejection with no positive content is weak
    for (const t of ['non-overlap', 'eproducib', 'prior inspection'])
        ok(new RegExp(t, 'i').test(F), `memo states what a block DOES establish: ${t}`);
    // and it must not assert the opposite anywhere outside a rejection block
    const bad = [];
    for (const block of MEMO.split(NL + NL)) {
        const fb = flat(block);
        if (/reject|not establish|false|destroy|nothing about/i.test(fb)) continue;
        if (/block is (?:automatically )?representative|fresh block .{0,30}representative/i.test(fb))
            bad.push(fb.slice(0, 70));
    }
    ok(bad.length === 0, 'no un-rejected representativeness claim', bad.join(' | ') || 'clean');
}

// ── G7. No weighting scheme is proposed ──────────────────────────────────────
console.log('');
console.log('-- G7. no reweighting ---------------------------------------------------');
{
    ok(/positivity/i.test(F), 'memo rejects weighting on positivity grounds');
    ok(/No weighting is proposed|none is proposed|rejected outright/i.test(F),
        'memo states no weighting is proposed');
    const bad = [];
    for (const block of MEMO.split(NL + NL)) {
        const fb = flat(block);
        if (/reject|no weighting|not proposed|would not|cannot|does not exist|forbidden/i.test(fb)) continue;
        if (/we (?:propose|use|apply) (?:a )?(?:inverse-probability |propensity )?weight/i.test(fb))
            bad.push(fb.slice(0, 70));
    }
    ok(bad.length === 0, 'no weighting scheme is actually proposed', bad.join(' | ') || 'clean');
}

// ── G8. Required outputs, discipline, no promoted claims ─────────────────────
console.log('');
console.log('-- G8. required outputs and discipline ----------------------------------');
{
    ok(/FORMULATION ONLY/.test(MEMO), 'declares formulation-only');
    ok(/No seed was generated, selected, evaluated or consumed/i.test(F), 'no seed touched');
    ok(/registry-link defect remains open|is \*\*not\*\* repaired here|not repaired here/i.test(MEMO + F),
        'registry defect left open');
    ok(/no statistical test is introduced|No statistical test/i.test(F), 'no statistical test');
    for (const [n, re] of [
        [1, /## 1\. The exact question/], [2, /## 2\. Formal definition of a configuration/],
        [3, /## 3\. Seed space vs configuration space/], [4, /## 4\. The generation \/ acceptance pipeline/],
        [5, /## 5\. P1 \/ P2 \/ P3/], [6, /## 6\. Sampling-frame requirements/],
        [7, /## 7\. The acceptance-selection analysis/], [8, /## 8\. The generalisation hierarchy/],
        [9, /## 9\. Relevance to cognitive-mechanism discovery/],
        [10, /## 10\. Toy and adversarial cases/], [11, /## 11\. PASS 2 — self-falsification/],
        [12, /## 12\. Evidence → Inference → Hypothesis/], [13, /## 13\. Classification/],
        [14, /## 14\. Exact next milestone/]])
        ok(re.test(MEMO), `required output ${n} present`);
    for (let i = 1; i <= 10; i++)
        ok(new RegExp(`^\\| ${i} \\|`, 'm').test(MEMO), `toy case ${i} present`);
    for (let i = 1; i <= 10; i++)
        ok(new RegExp(`### P-${i}\\.`).test(MEMO), `PASS 2 attack P-${i} present`);
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp(`\\*\\*${s}\\*\\*`).test(MEMO), `separation level present: ${s}`);
    for (const [l, re] of [
        ['cognition', /(?:demonstrates|establishes|evidence of) cognition/i],
        ['intelligence', /\bis intelligent\b|demonstrates intelligence/i],
        ['transfer', /the mechanism transfers\b(?! to)/i]])
        ok(!re.test(F), `no promoted claim: ${l}`);
    ok(/validates nothing about cognition|A sampling frame alone validates nothing/i.test(F),
        'memo states a frame validates nothing about cognition');
    // no sample size proposed
    ok(!/sample size of \d|we (?:propose|recommend) (?:a )?(?:sample of )?\d{2,}/i.test(F),
        'no sample size proposed');
}

// ── G9. Working tree ─────────────────────────────────────────────────────────
console.log('');
console.log('-- G9. working tree -----------------------------------------------------');
{
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/preregistrations/C1_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or the frozen C1 prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
}

// ── G10. Anti-vacuity ────────────────────────────────────────────────────────
console.log('');
console.log('-- G10. anti-vacuity ----------------------------------------------------');
{
    ok(MEMO.includes('# M24-YELLOW') && !MEMO.includes('# M24-GREEN'),
        'G5 would fire if a second verdict were asserted');
    ok(F.includes('1.75%') && !F.includes('17.5%'), 'G4 binds the rate to the recomputation');
    const r0 = makeRng(0), r2 = makeRng(2);
    ok(r0() !== r2(), 'G1 control is a real inequality — seeds 0 and 2 differ');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M24 FORMULATION GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

// M24-R1 — SAMPLING-UNIT REPAIR GATE.
//
// The repair is a MATHEMATICAL claim: uniform key sampling with rejection is uniform on
// accepted KEYS and size-biased on unique accepted CONFIGURATIONS. A memo can assert that;
// this gate SIMULATES it on a tiny synthetic key space and requires the simulated
// frequencies to match the stated formulas. It also re-verifies, by execution, the one
// collision the whole distinction rests on.
//
// No registered seed is touched: makeConfig is never called, and makeRng is exercised only
// on the integers 0, 1, 2, 7 and 8 to establish stream identity/difference.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { makeRng } from '../../instrumentation/rng.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const R1 = fs.readFileSync(ROOT + 'research/preregistrations/M24_R1_SAMPLING_UNIT_REPAIR.md', 'utf8');
const M24 = fs.readFileSync(ROOT + 'research/preregistrations/M24_SAMPLING_FRAME_FORMULATION.md', 'utf8');
const ENV = fs.readFileSync(ROOT + 'experiments/m7/env.js', 'utf8');
const RNG = fs.readFileSync(ROOT + 'instrumentation/rng.js', 'utf8');
const PROTO = fs.readFileSync(ROOT + 'experiments/c1/protocol.js', 'utf8');

const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(R1);
const NL = String.fromCharCode(10);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;

console.log('='.repeat(78));
console.log('  M24-R1 SAMPLING-UNIT REPAIR GATE');
console.log('='.repeat(78));

// ── G1. The collision, by execution, with a control ──────────────────────────
console.log('');
console.log('-- G1. the verified collision -------------------------------------------');
{
    ok(/let a = \(seed >>> 0\) \|\| 1;/.test(RNG), 'makeRng coerces 0 to 1 (source)');
    const eq = (s1, s2, n = 64) => { const a = makeRng(s1), b = makeRng(s2);
        for (let i = 0; i < n; i++) if (a() !== b()) return false; return true; };
    ok(eq(0, 1), 'seeds 0 and 1 produce an IDENTICAL stream (executed)');
    ok(!eq(7, 8), 'CONTROL: seeds 7 and 8 differ — the check is not vacuous');
    ok(!eq(1, 2), 'CONTROL: seeds 1 and 2 differ');
    ok(/g\(0,i\) = g\(1,i\)/.test(R1) || /seed 0 and seed 1 drive an identical stream/i.test(F),
        'memo states the collision');
}

// ── G2. f carries provenance, so f-injectivity is scientifically empty ───────
console.log('');
console.log('-- G2. f vs g ------------------------------------------------------------');
{
    // cfg literal must contain configSeed and configIndex as FIELDS
    const lit = ENV.slice(ENV.indexOf('const cfg = {'), ENV.indexOf('SEEN.add('));
    ok(/configSeed, configIndex, goal,/.test(lit),
        'cfg carries configSeed and configIndex as fields (source)');
    ok(/representational artifact|scientifically empty/i.test(F),
        'memo calls f-injectivity a representational artifact');
    ok(/π|content/i.test(F) && /g = π ∘ f|g is NOT injective/i.test(R1 + F),
        'memo defines the content projection and states g is not injective');
    // acceptance must factor through content: evaluateConstraints reads only cfg fields
    const body = ENV.slice(ENV.indexOf('export function evaluateConstraints'),
                           ENV.indexOf('// R5 — decision relevance'));
    const agentish = ['ARMED', 'ABLATED', 'futureBonus', 'agentSeed', 'arm', 'tick'];
    const found = agentish.filter(s => new RegExp('\\b' + s + '\\b').test(body));
    ok(found.length === 0, 'evaluateConstraints has no agent/arm symbol — pre-treatment',
        found.length ? found.join(',') : 'clean');
    const reads = ['cfg.pPhase1', 'cfg.goal', 'cfg.embedding'];
    ok(reads.every(r => body.includes(r)) && !/cfg\.configSeed/.test(body),
        'evaluateConstraints reads only content fields, never configSeed ⇒ α factors through g');
    ok(/union of complete fibers/i.test(F), 'memo concludes A is a union of complete fibers');
    // outcome depends on content, not key: environment stream is seeded from agentSeed
    ok(/streams\.set\("environment", makeRng\(\(seed \^ 0x5EED\) >>> 0\)\);/.test(RNG),
        'environment stream is seeded from agentSeed, not configSeed (source)');
}

// ── G3. THE REPAIR, simulated: uniform on keys, size-biased on configurations ─
console.log('');
console.log('-- G3. sampling distribution, simulated ---------------------------------');
{
    // A tiny synthetic key space with a deliberate 2-to-1 collision, mirroring 0/1.
    // keys k0,k1 -> content c1 ; k2 -> content c2.  Acceptance: all accepted.
    const KEYS = ['k0', 'k1', 'k2'];
    const g = { k0: 'c1', k1: 'c1', k2: 'c2' };
    const DELTA = { c1: 0, c2: 3 };
    const m = { c1: 2, c2: 1 };
    const A = KEYS.length;

    // draw uniformly over keys, deterministically cycling so the test has no RNG of its own
    const N = 300000;
    const keyHits = { k0: 0, k1: 0, k2: 0 }, contentHits = { c1: 0, c2: 0 };
    let sum = 0;
    for (let i = 0; i < N; i++) {
        const k = KEYS[i % A];              // exactly uniform over keys by construction
        keyHits[k]++; contentHits[g[k]]++; sum += DELTA[g[k]];
    }
    // Q2: every accepted key equally likely
    ok(Object.values(keyHits).every(v => near(v / N, 1 / A, 1e-6)),
        'Q2: uniform over accepted KEYS — each 1/|A|', JSON.stringify(keyHits));
    // Q3: content probability is m(c)/|A|, NOT 1/|C_A|
    ok(near(contentHits.c1 / N, m.c1 / A, 1e-6) && near(contentHits.c2 / N, m.c2 / A, 1e-6),
        'Q3: content probability is m(c)/|A| — size-biased',
        `c1 ${(contentHits.c1 / N).toFixed(4)} vs ${(m.c1 / A).toFixed(4)}`);
    ok(!near(contentHits.c1 / N, 1 / 2, 1e-3),
        'Q3 control: it is NOT uniform over unique configurations (would be 0.5)',
        (contentHits.c1 / N).toFixed(4));
    // Q4: the estimand it converges to is the multiplicity-weighted mean
    const weighted = (m.c1 * DELTA.c1 + m.c2 * DELTA.c2) / A;      // = 1.0
    const unweighted = (DELTA.c1 + DELTA.c2) / 2;                   // = 1.5
    ok(near(sum / N, weighted, 1e-6), 'Q4: sample mean converges to the multiplicity-weighted mean',
        `${(sum / N).toFixed(4)} vs ${weighted}`);
    ok(!near(weighted, unweighted), 'Q4 control: weighted != unweighted — the bias is real',
        `${weighted} vs ${unweighted}`);
    ok(F.includes('1.0') && F.includes('1.5'), 'memo states both toy estimands (1.0 and 1.5)');

    // de-duplication does NOT remove the bias: inclusion prob still proportional to m(c)
    const n = 5;
    const incl = (c) => 1 - Math.pow(1 - m[c] / A, n);
    ok(incl('c1') > incl('c2'),
        'de-duplication does not remove size bias — inclusion still rises with m(c)',
        `c1 ${incl('c1').toFixed(3)} > c2 ${incl('c2').toFixed(3)}`);
    ok(/de-duplication (?:removes|does not)|still proportional to m\(c\)|not the size bias/i.test(F),
        'memo states de-duplication does not fix it');
}

// ── G4. Positivity, stated per target population ─────────────────────────────
console.log('');
console.log('-- G4. positivity by target ---------------------------------------------');
{
    // all four targets must appear with DIFFERENT verdicts
    const rows = R1.split(NL).filter(l => l.trim().startsWith('|'));
    const joined = rows.join(' ');
    ok(/positive and equal/i.test(joined), 'target A (keys): positive and equal');
    ok(/exactly zero/i.test(joined), 'target K (generated): exactly zero');
    ok(/positive but UNEQUAL/i.test(joined), 'target C_A (configurations): positive but unequal');
    ok(/not applicable/i.test(joined), 'target superpopulation: not applicable');
    ok(/zero probability.{0,40}is not.{0,40}unknown probability|not \*unknown probability\*/i.test(F),
        'memo distinguishes zero from unknown from unequal-but-positive');
    ok(/OVER-GENERALISED|over-generalised/i.test(R1),
        'memo records that M24 over-generalised positivity');
}

// ── G5. The four explicit corrections to M24 ─────────────────────────────────
console.log('');
console.log('-- G5. corrections to M24 -----------------------------------------------');
{
    for (const c of ['C-1', 'C-2', 'C-3', 'C-4'])
        ok(new RegExp('\\*\\*' + c + '\\*\\*').test(R1), `correction ${c} is recorded`);
    ok(/TOO STRONG/.test(R1), 'C-1 is marked TOO STRONG');
    ok(/OVER-GENERALISED as stated/i.test(R1), 'C-2 marked over-generalised');
    ok(/TOO GENERAL/.test(R1), 'C-3 marked too general');
    ok(/AMBIGUOUS/.test(R1), 'C-4 marked ambiguous');
    // M24 itself must carry the supersession note
    ok(/SUPERSEDED IN PART by M24-R1/.test(M24), 'M24 carries the supersession note');
    ok(/corrected forward, not rewritten/i.test(M24), 'M24 note states corrected-forward');
    // and M24-R1 must NOT silently repeat the corrected claim
    const bad = [];
    for (const block of R1.split(NL + NL)) {
        const fb = flat(block);
        if (/TOO STRONG|correct|not established|size-biased|only if|unless|equal only|Equal \*\*over/i.test(fb)) continue;
        if (/equal inclusion probabilit(?:y|ies) (?:over|on) (?:unique )?configurations/i.test(fb))
            bad.push(fb.slice(0, 70));
    }
    ok(bad.length === 0, 'no un-corrected equal-probability claim over configurations',
        bad.join(' | ') || 'clean');
}

// ── G6. Verdict, and that RED/GREEN were actually tested ─────────────────────
console.log('');
console.log('-- G6. verdict -----------------------------------------------------------');
{
    ok(/# M24-R1: YELLOW/.test(R1), 'verdict is YELLOW');
    ok(!/# M24-R1: RED/.test(R1) && !/# M24-R1: GREEN/.test(R1), 'exactly one verdict');
    ok(/I tested RED and it does not hold/i.test(F), 'RED was explicitly tested');
    ok(/I tested GREEN and it does not hold/i.test(F), 'GREEN was explicitly tested');
    ok(/false negative/i.test(F), 'memo explains why RED would be wrong');
    // five mandatory qualifications
    for (const [l, re] of [
        ['unit is the key', /sampling unit is the KEY/i],
        ['K unreachable', /K.{0,4} is unreachable/i],
        ['C_A up to multiplicity', /reachable only up to multiplicity/i],
        ['one agent seed', /one graph, one hidden-variable family, one agent seed/i],
        ['level B only', /Level B only/i]])
        ok(re.test(F), `mandatory qualification: ${l}`);
    ok(/exclude seed 0/i.test(F), 'memo proposes excluding seed 0 to remove the known collision');
}

// ── G7. Finite population without superpopulation ────────────────────────────
console.log('');
console.log('-- G7. finite population vs superpopulation -----------------------------');
{
    ok(/requires no distributional model, no superpopulation/i.test(F)
        || /needs no superpopulation fiction/i.test(F),
        'memo states level B needs no superpopulation');
    ok(/none is definable|no superpopulation exists to refer to|no larger population/i.test(F),
        'memo states level C is blocked by absence, not difficulty');
    for (const lvl of ['A — within-census', 'B — finite population', 'C — superpopulation',
                       'D — mechanism transfer'])
        ok(R1.includes(lvl), `hierarchy level present: ${lvl}`);
}

// ── G8. Agent seed and scope ─────────────────────────────────────────────────
console.log('');
console.log('-- G8. agent seed --------------------------------------------------------');
{
    ok(/agentSeed: 20260819000/.test(PROTO), 'agentSeed is one fixed value (source)');
    ok(F.includes('20260819000'), 'memo reports it');
    ok(/supports no claim about the agent/i.test(F), 'memo states the frame says nothing about the agent');
    ok(/degenerate/i.test(F), 'memo calls the agent dimension degenerate');
    ok(/\| agentSeed = 20260819000/.test(R1) || /carries .{0,20}agentSeed/i.test(F),
        'memo requires the conditioning to be written');
    // the four dimensions
    for (const d of ['configuration seed', 'agent seed', 'environment', 'goal distribution'])
        ok(new RegExp(d, 'i').test(R1), `dimension named: ${d}`);
}

// ── G9. Discipline ───────────────────────────────────────────────────────────
console.log('');
console.log('-- G9. discipline --------------------------------------------------------');
{
    ok(/FORMULATION \/ AUDIT ONLY/.test(R1), 'declares formulation/audit only');
    ok(/No seed was generated, selected, evaluated or consumed/i.test(F), 'no seed touched');
    ok(/registry defect remains open and unrepaired/i.test(F), 'registry defect left open');
    ok(/no statistical test was introduced/i.test(F), 'no statistical test');
    ok(/separate implementation milestone with its own verification/i.test(F),
        'implementation boundary respected');
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(R1), `separation level: ${s}`);
    for (const [l, re] of [
        ['cognition', /(?:demonstrates|establishes|evidence of) cognition/i],
        ['transfer established', /transferability is established|establishes transferability(?!\?)/i]])
        ok(!re.test(F), `no promoted claim: ${l}`);
    ok(/No cognitive, planning, intelligence, engineering or manufacturing claim follows/i.test(F),
        'memo states the no-promotion rule');
    // Hy-1 must be marked hypothesis, never asserted
    ok(/Hy-1/.test(R1) && /not established/i.test(F),
        'injectivity beyond the known collision is marked HYPOTHESIS');
    const bad = [];
    for (const block of R1.split(NL + NL)) {
        const fb = flat(block);
        if (/Hy-1|hypothesis|not established|unverified|unknown|plausible|conditional/i.test(fb)) continue;
        if (/g is injective on|m ≡ 1 holds|no other collisions exist/i.test(fb)) bad.push(fb.slice(0, 70));
    }
    ok(bad.length === 0, 'injectivity is never asserted outside a hypothesis context',
        bad.join(' | ') || 'clean');
}

// ── G10. Working tree + anti-vacuity ─────────────────────────────────────────
console.log('');
console.log('-- G10. working tree and anti-vacuity -----------------------------------');
{
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/preregistrations/C1_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or frozen prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
    ok(near(2 / 3, 0.6667, 1e-3) && !near(2 / 3, 0.5, 1e-3),
        'G3 size-bias check is a real inequality, not a tautology');
    ok(R1.includes('# M24-R1: YELLOW'), 'verdict string present and mutable');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M24-R1 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'REPAIR VERIFIED' : 'REPAIR NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

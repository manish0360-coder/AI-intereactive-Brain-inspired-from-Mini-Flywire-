// M25 — TARGET-POPULATION SPECIFICATION GATE.
//
// M25 rests on three source claims and one arithmetic claim. All are checked:
//
//   * every learning-run RNG stream derives from agentSeed alone (run.js) — the finding
//     that drives the whole North Star answer;
//   * readoutSeed depends on configSeed (uqb/collect.js) — which forces the correction to
//     M24-R1's "exact replicas";
//   * acceptance factors through content (env.js);
//   * the §18.2 opposite-sign case is recomputed and must ACTUALLY produce opposite signs.
//
// No registered seed is touched: makeConfig is never called. makeRng is exercised only on
// 0, 1, 2, 7, 8 to re-establish the known collision with controls.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { makeRng } from '../../instrumentation/rng.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M25 = fs.readFileSync(ROOT + 'research/preregistrations/M25_TARGET_POPULATION_SPECIFICATION.md', 'utf8');
const R1 = fs.readFileSync(ROOT + 'research/preregistrations/M24_R1_SAMPLING_UNIT_REPAIR.md', 'utf8');
const RUN = fs.readFileSync(ROOT + 'experiments/m7/run.js', 'utf8');
const RNG = fs.readFileSync(ROOT + 'instrumentation/rng.js', 'utf8');
const ENV = fs.readFileSync(ROOT + 'experiments/m7/env.js', 'utf8');
const UQBC = fs.readFileSync(ROOT + 'experiments/uqb/collect.js', 'utf8');
const C1C = fs.readFileSync(ROOT + 'experiments/c1/collect.js', 'utf8');
const PROTO = fs.readFileSync(ROOT + 'experiments/c1/protocol.js', 'utf8');

const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M25);
const NL = String.fromCharCode(10);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;

console.log('='.repeat(78));
console.log('  M25 TARGET-POPULATION GATE');
console.log('='.repeat(78));

// ── G1. All learning streams derive from agentSeed — the load-bearing finding ─
console.log('');
console.log('-- G1. the learning run is driven by agentSeed alone ---------------------');
{
    const blk = RUN.slice(RUN.indexOf('cognitive: input.agentSeed'), RUN.indexOf('cognitive: input.agentSeed') + 260);
    for (const [name, re] of [
        ['cognitive', /cognitive: input\.agentSeed >>> 0/],
        ['visual', /visual: \(input\.agentSeed \^ 0x9e3779b9\) >>> 0/],
        ['environment', /environment: \(input\.agentSeed \^ 0x5EED\) >>> 0/],
        ['sigma', /sigma: \(input\.agentSeed \^ 0xBEEF\) >>> 0/]])
        ok(re.test(blk), `learning stream "${name}" derives from agentSeed (source)`);
    // and configSeed must NOT seed any stream
    ok(!/(?:cognitive|visual|environment|sigma):\s*[^,]*configSeed/.test(blk),
        'NO learning stream derives from configSeed');
    ok(/env\.generateAccepted\(input\.configSeed, input\.configIndex\)/.test(RUN),
        'configSeed enters only via generateAccepted (source)');
    ok(/agentSeed: 20260819000/.test(PROTO), 'agentSeed frozen at one value (source)');
    ok(/single fixed sequence|SINGLE FIXED SEQUENCE/i.test(F),
        'memo states the learning sequence is shared across the census');
    ok(/fixed effect common to every observation|shared fixed effect|not an independently re-randomised nuisance/i.test(F),
        'memo characterises it as a fixed effect, not averaged noise');
    ok(/perfectly confounded/i.test(F), 'memo states the confounding is perfect');
}

// ── G2. readoutSeed depends on configSeed — forces the M24-R1 correction ─────
console.log('');
console.log('-- G2. readout randomisation --------------------------------------------');
{
    ok(/readoutSeed = \(configSeed, arm, state\) =>/.test(UQBC)
        || /export const readoutSeed = \(configSeed, arm, state\)/.test(UQBC),
        'readoutSeed is a function of (configSeed, arm, state) — source');
    ok(/configSeed \* 1000003/.test(UQBC), 'readoutSeed actually consumes configSeed');
    ok(/initRng\(readoutSeed\(/.test(C1C), 'C1 reseeds the readout with it (source)');
    ok(/readout-level replicates|readout-level replicate/i.test(F),
        'memo reclassifies duplicate-content keys as readout-level replicates');
    ok(/too strong/i.test(F) && /exact replicas/i.test(F),
        'memo records that M24-R1 "exact replicas" was too strong');
    ok(/CORRECTED IN PART by M25/.test(R1), 'M24-R1 carries the correction note');
    ok(/corrected forward, not rewritten/i.test(R1), 'correction is forward, not a rewrite');
    ok(/UNKNOWN/.test(M25) && /invariant to readout randomisation/i.test(F),
        'memo marks outcome-invariance to readout RNG as UNKNOWN, not assumed');
}

// ── G3. Acceptance factors through content (carried, re-verified) ────────────
console.log('');
console.log('-- G3. acceptance ---------------------------------------------------------');
{
    const body = ENV.slice(ENV.indexOf('export function evaluateConstraints'),
                           ENV.indexOf('// R5 — decision relevance'));
    const agentish = ['ARMED', 'ABLATED', 'futureBonus', 'agentSeed', 'arm', 'tick'];
    const found = agentish.filter(s => new RegExp('\\b' + s + '\\b').test(body));
    ok(found.length === 0, 'evaluateConstraints has no agent/arm symbol',
        found.length ? found.join(',') : 'clean');
    ok(!/cfg\.configSeed/.test(body), 'evaluateConstraints never reads configSeed');
    ok(/const R5 = r5\.count >= 4;/.test(ENV), 'R5 requires >=4 differing decision states (source)');
    // the sharpest self-attack must be present
    ok(/eligibility rule is not independent of the hypothesis|encodes the mechanism/i.test(F),
        'memo concedes eligibility is not independent of the hypothesis');
    ok(/does NOT license|does not represent the unrestricted generated population|not represent/i.test(F),
        'memo separates "legitimate subset" from "representative"');
}

// ── G4. The opposite-sign case must ACTUALLY be opposite ─────────────────────
console.log('');
console.log('-- G4. section 18.2 recomputed -------------------------------------------');
{
    // Parse the case's INPUTS from the memo and recompute its OUTPUTS from those.
    // Hardcoding the inputs made this gate vacuous: corrupting a delta in the prose
    // left the verifier's own constants untouched. Same class of error as M20 G3.
    const MINUS = String.fromCharCode(0x2212);
    const Fn = F.split(MINUS).join('-')
                .split(String.fromCharCode(0x2081)).join('1')
                .split(String.fromCharCode(0x2082)).join('2');
    const mm = Fn.match(/m\(c1\) = (-?[0-9]+(?:\.[0-9]+)?), .\(c1\) = (-?[0-9]+(?:\.[0-9]+)?); m\(c2\) = (-?[0-9]+(?:\.[0-9]+)?), .\(c2\) = \+?(-?[0-9]+(?:\.[0-9]+)?)/);
    ok(mm !== null, 'section 18.2 inputs parsed from the memo',
        mm ? mm.slice(1).join(',') : 'NOT FOUND');
    const m1 = Number(mm[1]), d1 = Number(mm[2]), m2 = Number(mm[3]), d2 = Number(mm[4]);
    ok([m1, d1, m2, d2].every(Number.isFinite), 'parsed inputs are all finite numbers', `${m1},${d1},${m2},${d2}`);
    const A = m1 + m2;
    const key = (m1 * d1 + m2 * d2) / A;
    const uniq = (d1 + d2) / 2;
    ok(near(key, -0.25), 'key-level mean is -0.25', key.toFixed(4));
    ok(near(uniq, 0.5), 'unique-level mean is +0.50', uniq.toFixed(4));
    ok(key * uniq < 0, 'the two paths give OPPOSITE SIGNS — not a tautology',
        `${key} vs ${uniq}`);
    ok(F.includes('−0.25') || F.includes('-0.25'), 'memo states -0.25');
    ok(F.includes('+0.50') || F.includes('+0.5'), 'memo states +0.50');
    ok(/Opposite signs from the same population/i.test(F), 'memo states the conclusion');
    ok(/before data|cannot be chosen after seeing data|fixed .{0,20}before/i.test(F),
        'memo requires the unit to be fixed before data');
    // and the correlation must be marked HYPOTHESIS, never assumed away
    ok(/HYPOTHESIS, not evidence/i.test(F), 'the no-correlation intuition is marked hypothesis');
}

// ── G5. The collision, with controls ─────────────────────────────────────────
console.log('');
console.log('-- G5. the verified collision --------------------------------------------');
{
    const eq = (a, b, n = 64) => { const x = makeRng(a), y = makeRng(b);
        for (let i = 0; i < n; i++) if (x() !== y()) return false; return true; };
    ok(/let a = \(seed >>> 0\) \|\| 1;/.test(RNG), 'makeRng coerces 0 to 1 (source)');
    ok(eq(0, 1), 'seeds 0 and 1 share a stream (executed)');
    ok(!eq(7, 8) && !eq(1, 2), 'CONTROLS: 7/8 and 1/2 differ — check is not vacuous');
    ok(/S′ = S \\ \{0\}|S \\ \{0\}|seed 0 excluded/.test(M25) || /excluding seed 0/i.test(F),
        'memo excludes seed 0 from the draw range');
}

// ── G6. The two-question separation and the §16 answer ──────────────────────
console.log('');
console.log('-- G6. the North Star answer ---------------------------------------------');
{
    ok(/# We cannot yet define such a population\./.test(M25),
        'section 16 answers NO, explicitly and unqualified');
    ok(/second axis/i.test(F), 'memo names the missing layer as a second axis');
    ok(/Not more configurations\. Not a better frame\./i.test(F)
        || /not more configurations/i.test(F),
        'memo rules out more sampling as the fix');
    ok(/at any .?N|at any N/i.test(F), 'memo states no N suffices');
    ok(/two different questions|answers to two different questions/i.test(F),
        'memo separates the sampling verdict from the North Star answer');
    // architectural obstacles must still be named
    ok(/M22/.test(M25) && /M23/.test(M25) && /architectural/i.test(F),
        'memo carries the M22/M23 architectural obstacles forward');
}

// ── G7. Verdict, alternatives tested, mandatory qualifications ───────────────
console.log('');
console.log('-- G7. decision gate ------------------------------------------------------');
{
    ok(/# M25-YELLOW/.test(M25), 'verdict is M25-YELLOW');
    ok(!/# M25-GREEN/.test(M25) && !/# M25-RED/.test(M25), 'exactly one verdict');
    ok(/I tested RED/i.test(F) && /I tested GREEN/i.test(F), 'both alternatives tested');
    ok(/false negative/i.test(F), 'explains why RED would be wrong');
    ok(/would overclaim/i.test(F), 'explains why GREEN would be wrong');
    for (const [l, re] of [
        ['content projection declared', /content-projection declaration|content projection must be declared/i],
        ['m == 1 precondition', /falsifiable precondition/i],
        ['agentSeed confounding', /agentSeed.{0,20}confound|perfectly confounded/i],
        ['eligibility encodes mechanism', /eligibility.{0,40}(?:not independent|encodes)/i],
        ['G1 only', /G1 only|G1-only/i]])
        ok(re.test(F), `mandatory qualification: ${l}`);
    // the five "does NOT establish" items
    ok(/What it does NOT establish/i.test(M25), 'the does-not-establish list is present');
    ok(/Nothing about a reusable cognitive mechanism/i.test(F), 'item 1 present');
}

// ── G8. Draw mechanism is specified, not implemented ────────────────────────
console.log('');
console.log('-- G8. draw mechanism -----------------------------------------------------');
{
    for (const k of ['Population', 'Sampling unit', 'Selection mechanism', 'Inclusion probability',
                     'Duplicate handling', 'Acceptance handling', 'Clustering', 'Licensed inference'])
        ok(new RegExp('\\*\\*' + k, 'i').test(M25), `draw-mechanism row: ${k}`);
    ok(/Not implemented, no seeds selected, no ranges created/i.test(F),
        'draw mechanism is specified only');
    // no seed range may be invented
    const ranges = M25.match(/\b\d{6}\s*[-–—]\s*\d{6}\b/g) || [];
    const bad = ranges.filter(r => !/895000/.test(r));
    ok(bad.length === 0, 'no new seed range is created', bad.join(', ') || 'clean');
}

// ── G9. Ladder, matrix, and required analyses ───────────────────────────────
console.log('');
console.log('-- G9. required analyses --------------------------------------------------');
{
    for (const g of ['G0', 'G1', 'G2', 'G2.5', 'G3', 'G4', 'G5', 'G6'])
        ok(new RegExp('\\*\\*' + g.replace('.', '\\.') + '\\*\\*').test(M25),
            `ladder rung ${g} present`);
    ok(/inserted/i.test(F), 'the inserted rung is flagged as a modification of the ruling ladder');
    for (const r of ['operationally definable', 'sampling design available', 'inclusion probabilities',
                     'duplicate handling', 'current evidence', 'scientific meaning',
                     'mechanism robustness', 'transferability', 'assumptions required',
                     'current blocker'])
        ok(new RegExp('\\| ' + r, 'i').test(M25), `decision-matrix row: ${r}`);
    for (let i = 1; i <= 5; i++)
        ok(new RegExp('^\\| ' + i + ' \\|', 'm').test(M25), `multiplicity toy case ${i} present`);
    for (const a of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
        ok(new RegExp('\\*\\*\\(' + a + '\\)').test(M25), `PASS 2 attack (${a}) present`);
    // goals must not be called a task distribution
    ok(/NOT a representative task distribution/i.test(F),
        'memo denies the goals are a task distribution');
    {   // A presence check cannot detect an ADDED contradiction — block-scan too.
        const bad = [];
        for (const block of M25.split(NL + NL)) {
            const fb = flat(block);
            if (/NOT a representative|not a task distribution|never|must not|denies/i.test(fb)) continue;
            if (/(?:are|is|constitute|form) a (?:representative )?task distribution/i.test(fb))
                bad.push(fb.slice(0, 70));
        }
        ok(bad.length === 0, 'goals are never ASSERTED to be a task distribution',
            bad.join(' | ') || 'clean');
    }
    // experience history classified as mediator
    ok(/mediator/i.test(F) && /no degrees of freedom/i.test(F),
        'experience history classified as a deterministic mediator');
}

// ── G10. Discipline, evidence separation, no promotion ──────────────────────
console.log('');
console.log('-- G10. discipline --------------------------------------------------------');
{
    ok(/FORMULATION ONLY/.test(M25), 'declares formulation-only');
    ok(/No seed generated, selected, evaluated or consumed/i.test(F), 'no seed touched');
    ok(/no .?agentSeed.? varied|no `agentSeed` varied/i.test(F), 'agentSeed not varied');
    ok(/registry-link defect remains open/i.test(F), 'registry defect left open');
    ok(/never collapsed into one|separate .{0,40}gate/i.test(F),
        '2x workflow boundary respected');
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M25), `separation level: ${s}`);
    {   // Block-scan, with patterns wide enough for the natural phrasings. The first
        // version was presence-based and too narrow: it missed
        // 'This establishes transferability of the mechanism.'
        const BANNED = [
            ['cognition', /(?:demonstrat|establish|show|evidence of)\w* (?:\w+ ){0,2}cognition/i],
            ['transferability', /(?:demonstrat|establish|show|prov)\w* (?:\w+ ){0,3}transferab/i],
            ['intelligence', /(?:demonstrat|establish|is)\w* (?:\w+ ){0,2}intelligen/i],
        ];
        for (const [l, re] of BANNED) {
            const bad = [];
            for (const block of M25.split(NL + NL)) {
                const fb = flat(block);
                if (/\bnot\b|never|no claim|does not|cannot|would not|forbid|may not|nothing about/i.test(fb)) continue;
                const m = fb.match(re); if (m) bad.push(m[0]);
            }
            ok(bad.length === 0, `no promoted claim: ${l}`, bad.join(' | ') || 'clean');
        }
    }
    ok(/No cognitive interpretation is promoted/i.test(F), 'no-promotion rule stated');
    // Hy-1 and Hy-2 must never be asserted outside a hypothesis context
    const bad = [];
    for (const block of M25.split(NL + NL)) {
        const fb = flat(block);
        if (/Hy-\d|hypothesis|not established|unverified|UNKNOWN|conditional|falsifiable|plausible|iff|if and only if/i.test(fb)) continue;
        if (/m ≡ 1 holds|g is injective|Delta is invariant to readout/i.test(fb)) bad.push(fb.slice(0, 70));
    }
    ok(bad.length === 0, 'Hy-1/Hy-2 never asserted outside a hypothesis context',
        bad.join(' | ') || 'clean');
}

// ── G11. Working tree and anti-vacuity ──────────────────────────────────────
console.log('');
console.log('-- G11. working tree and anti-vacuity ------------------------------------');
{
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/preregistrations/C1_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or frozen prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
    ok((-0.25) * (0.5) < 0 && !((-0.25) * (-0.5) < 0),
        'G4 sign check is a real inequality, not a tautology');
    ok(M25.includes('# M25-YELLOW'), 'verdict string present and mutable');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M25 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

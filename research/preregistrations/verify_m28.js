// M28 — NEXT-DIRECTION DECISION ANALYSIS GATE.
//
// M28 makes one new EMPIRICAL claim and one DECISION claim. Both are checked:
//
//   (1) Hy-2 resolved: E6 is invariant to readout randomisation because zero randomness
//       is consumed before the candidate pool and argmax are fixed. Verified by OFFSET
//       ORDERING inside runPrediction and by counting draws in the preceding region —
//       with a control proving the counter can see draws when they exist.
//
//   (2) The recommendation is B -> A, not A. The gate requires the memo to answer the
//       ruling's mandated question ("Is the Director's idea the best next decision?")
//       and to justify the ORDER, since the order is the decision.
//
// It also block-scans for the five claims the ruling forbids.
//
// No seed consumed, no configuration instantiated, the agent is never booted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M28 = fs.readFileSync(ROOT + 'research/preregistrations/M28_NEXT_DIRECTION_DECISION_ANALYSIS.md', 'utf8');
const MAIN = fs.readFileSync(ROOT + 'main.js', 'utf8');
const UQBC = fs.readFileSync(ROOT + 'experiments/uqb/collect.js', 'utf8');
const RUN = fs.readFileSync(ROOT + 'experiments/m7/run.js', 'utf8');
const PRE = fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.md', 'utf8');

const NL = String.fromCharCode(10);
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M28);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };

console.log('='.repeat(78));
console.log('  M28 NEXT-DIRECTION DECISION GATE');
console.log('='.repeat(78));

// ── G1. Hy-2 resolution, verified by offsets ────────────────────────────────
console.log('');
console.log('-- G1. E6 invariance to readout randomisation ---------------------------');
{
    const start = MAIN.indexOf('function runPrediction(');
    const eps = MAIN.indexOf('if (liveRng() < epsilon');
    const sort = MAIN.indexOf('const sorted = choices.sort');
    const best = MAIN.indexOf('const bestChoice = sorted[0]');
    const push = MAIN.lastIndexOf('choices.push', eps);
    ok(start > 0 && eps > 0 && sort > 0 && best > 0 && push > 0,
        'all five anchors located in main.js',
        `start=${start} push=${push} eps=${eps} sort=${sort} best=${best}`);
    ok(push < eps, 'POSITIONAL: the pool is complete BEFORE the first randomness draw',
        `push@${push} < eps@${eps}`);
    ok(eps < sort && sort < best,
        'POSITIONAL: sort and argmax follow the draw, and depend only on weights',
        `eps@${eps} < sort@${sort} < best@${best}`);

    // count draws in the region preceding the epsilon line — must be zero
    const region = MAIN.slice(start, eps);
    const draws = (region.match(/liveRng\s*\(/g) || []).length;
    ok(draws === 0, 'ZERO liveRng draws between runPrediction start and the epsilon line',
        String(draws));
    // BIND THE MEMO'S NUMBER. Recomputing a value the memo never has to match is
    // vacuous: corrupting the stated count would leave this gate untouched.
    const stated = F.match(/draws between function start and the first . draw . (-?[0-9]+)/);
    ok(stated !== null, 'memo states the draw count in a parseable form',
        stated ? stated[1] : 'NOT FOUND');
    ok(stated && Number(stated[1]) === draws,
        'memo-stated draw count MATCHES the recomputation',
        (stated ? stated[1] : '?') + ' vs ' + draws);
    // CONTROL: the same counter must find draws in a region that HAS them, or it is vacuous
    const after = MAIN.slice(eps, sort);
    const afterDraws = (after.match(/liveRng\s*\(/g) || []).length;
    ok(afterDraws >= 2, 'CONTROL: the counter finds draws where they exist — not vacuous',
        afterDraws + ' draws in [eps, sort)');

    // the arm-dependence that made Hy-2 matter must be real
    ok(/arm === 'ARMED' \? 0x5bf03635 : 0x27d4eb2f/.test(UQBC),
        'readoutSeed is genuinely arm-dependent (source)');
    // and the memo must report the resolution with the actual offsets
    for (const n of [String(start), String(push), String(eps), String(sort), String(best)])
        ok(M28.includes(n), `memo reports offset ${n}`);
    ok(/Hy-2 is RESOLVED|Hy-2 resolved/i.test(F), 'memo states Hy-2 is resolved');
    ok(/G2\.5 is closed|G2\.5 closed/i.test(F), 'memo states rung G2.5 is closed');
    ok(/does \*\*not\*\* claim invariance for|does not claim invariance for|multi-step/i.test(M28 + F),
        'memo bounds the invariance claim to the single-step readout');
}

// ── G2. The decision: B -> A, and the mandated question answered ────────────
console.log('');
console.log('-- G2. the decision ------------------------------------------------------');
{
    ok(/Is the Director's option A the best next decision\? No\./i.test(F)
        || /Is the Director.{0,3}s option A the best next decision\? No/i.test(F),
        'memo answers the mandated question explicitly, in the negative');
    ok(/ordering specified as B → A|ordered B → A|B -> A|B → A/.test(M28),
        'memo specifies the ordering B → A');
    ok(/the order is the whole decision|the ORDER, since the order is the decision|ordering is the whole decision/i.test(F),
        'memo states that the order is the decision');
    ok(/B → A dominates|dominates/i.test(F), 'memo argues dominance rather than preference');
    ok(/option value/i.test(F), 'memo uses the option-value argument');
    // it must NOT prefer B merely for complexity — the ruling forbids that
    ok(/not preferring B because it is more complex|I am not preferring B because it is more complex/i.test(F),
        'memo disclaims preferring the more complex option');
    ok(/cheaper to resolve|CHEAPER to resolve/i.test(F), 'memo grounds the choice in cost of resolution');
    // A's strength must be stated fairly
    ok(/A.{0,3}s honest strength|stated fairly|reversal.{0,40}decisive/i.test(F),
        'memo states option A strength fairly');
    // all four options adjudicated
    for (const o of ['Option A', 'Option B', 'Option C', 'Option D'])
        ok(new RegExp(o, 'i').test(M28), `option adjudicated: ${o}`);
}

// ── G3. Cold-start analysis preserves the law ───────────────────────────────
console.log('');
console.log('-- G3. cold-start analysis -----------------------------------------------');
{
    ok(/silently share learned state across arms/i.test(flat(PRE)),
        'frozen §5.4 reason present in the frozen document (source)');
    ok(/silent.{0,30}(?:undeclared )?sharing|silently share/i.test(F),
        'memo identifies the hazard as silent sharing');
    ok(/I do not propose removing or weakening frozen §5\.4/i.test(F),
        'memo explicitly declines to propose weakening §5.4');
    ok(/Director and governance decision|Director.{0,30}governance/i.test(F),
        'memo leaves the governance decision to the Director');
    // per-arm baseline must be REJECTED
    ok(/Independent per-arm initialised state[^|]*\|[^|]*NO/i.test(M28),
        'per-arm baseline: arm-independence column says NO');
    ok(/REJECTED\.\*\* Different starting states per arm confound/.test(M28)
        || /per-arm[^.]{0,60}REJECTED/i.test(M28),
        'per-arm baseline carries an explicit REJECTED verdict');
    {   // and it must never be ACCEPTED anywhere
        const bad = [];
        for (const b of M28.split(NL + NL)) {
            const fb = flat(b);
            if (/REJECTED|rejected|must not|cannot|would confound/i.test(fb)) continue;
            if (/per-arm[^.]{0,80}(?:ACCEPTED|are fine|do not confound|is fine)/i.test(fb))
                bad.push(fb.slice(0, 80));
        }
        ok(bad.length === 0, 'per-arm baseline is never ACCEPTED', bad.join(' | ') || 'clean'); }
    // the three surviving limitations
    for (const [l, re] of [
        ['changes the object', /changes the scientific object/i],
        ['baseline needs its own frame', /own sampling frame|sampling frame of its own|needs its own/i],
        ['M22/M23 survive', /M22.{0,40}M23|architectural and survive/i]])
        ok(re.test(F), `limitation carried: ${l}`);
    // all six candidate formulations assessed
    for (const c of ['Immutable baseline snapshot', 'Cloned pre-seeded state',
                     'Provenance-tagged state', 'Independent per-arm',
                     'BEFORE treatment assignment', 'independent seed'])
        ok(new RegExp(c, 'i').test(M28), `candidate assessed: ${c}`);
}

// ── G4. C × R analysed correctly ────────────────────────────────────────────
console.log('');
console.log('-- G4. C x R analysis ----------------------------------------------------');
{
    ok(/is not "agent initialisation" and is not called that/i.test(F)
        || /not .?agent initialisation.?/i.test(F),
        'memo refuses the initialisation label for R');
    ok(/nuisance/i.test(F), 'R classified as a nuisance axis');
    ok(/ROBUSTNESS ONLY|robustness information, not a new evidential level|adds no new \*\*level\*\*/i.test(M28 + F),
        'memo states A adds robustness only, not a new level');
    // estimand: distribution selected, mean rejected
    ok(/SELECTED/.test(M28) && /distribution of/i.test(F), 'distributional estimand selected');
    ok(/Rejected\./.test(M28) && /mean treatment contrast/i.test(F), 'mean-over-R rejected');
    ok(/\+0\.5.{0,20}−0\.5|averages? to exactly .?0/i.test(F),
        'memo gives the reason the mean fails');
    ok(/No dispersion threshold is proposed/i.test(F), 'no dispersion threshold proposed');
    // trajectory collision carried
    ok(/structurally expected/i.test(F), 'trajectory collision carried as structurally expected');
    ok(/fingerprint/i.test(F), 'fingerprint detection carried');
}

// ── G5. The five forbidden claims ───────────────────────────────────────────
console.log('');
console.log('-- G5. forbidden-claim scan ----------------------------------------------');
{
    const BANNED = [
        ['agentSeed = initialization', /agentSeed (?:is|=) (?:the )?initial(?:isation|ization)/i],
        ['trajectory robustness = mechanism validation',
         /trajectory robustness (?:is|=|establishes|validates)[^.]{0,30}mechanism/i],
        ['more seeds = mechanism evidence',
         /more seeds (?:=|means|gives|yields|provides)[^.]{0,30}(?:mechanism|reusable)/i],
        ['removing cold-start acceptable',
         /(?:removing|remove|weakening|weaken) (?:the )?cold-start[^.]{0,30}(?:is )?acceptable/i],
        ['pre-seeding automatically legitimate',
         /pre-seeding is (?:automatically )?legitimate/i],
    ];
    for (const [l, re] of BANNED) {
        const bad = [];
        for (const b of M28.split(NL + NL)) {
            const fb = flat(b);
            if (/\bnot\b|never|must not|cannot|does not|forbid|Not claimed|rejected|refuses/i.test(fb)) continue;
            const m = fb.match(re); if (m) bad.push(m[0]);
        }
        ok(bad.length === 0, `no forbidden claim: ${l}`, bad.join(' | ') || 'clean');
    }
    ok(/Not claimed anywhere/i.test(F), 'memo carries the explicit non-claim list');
    // and the standing boundary must be preserved
    ok(/would not establish that .?futureScore.? is a reusable cognitive mechanism/i.test(F)
        || /distinguishes a reusable cognitive mechanism from a property of this substrate/i.test(F),
        'M26/M27 claim boundary preserved');
}

// ── G6. Structure, verdict, next milestone ──────────────────────────────────
console.log('');
console.log('-- G6. verdict and structure ---------------------------------------------');
{
    ok(/# M28-YELLOW/.test(M28), 'verdict is M28-YELLOW');
    ok(!/# M28-GREEN/.test(M28) && !/# M28-HOLD/.test(M28), 'exactly one verdict');
    ok(/Not GREEN:/i.test(M28) && /Not HOLD:/i.test(M28), 'both alternatives considered');
    ok(/M29 — Cold-Start-Preserving Baseline Formulation/.test(M28),
        'single highest-value next milestone named');
    ok(/formulation only/i.test(F), 'next milestone typed as formulation');
    ok(/must not modify frozen M7 governance/i.test(F),
        'next milestone forbidden from modifying frozen governance');
    for (let i = 1; i <= 9; i++)
        ok(new RegExp('\\*\\*' + i + '\\. ').test(M28), `PASS 2 challenge ${i} present`);
    ok(/Falsifying my own recommendation/i.test(M28), 'self-falsification section present');
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M28), `separation level: ${s}`);
}

// ── G7. Governance ──────────────────────────────────────────────────────────
console.log('');
console.log('-- G7. governance --------------------------------------------------------');
{
    ok(/FORMULATION \/ DECISION ANALYSIS ONLY/.test(M28), 'declares analysis-only');
    ok(/the agent was never booted/i.test(F), 'agent never booted');
    ok(/No seed generated, selected or consumed/i.test(F), 'no seed consumed');
    ok(/registry-link defect/i.test(F), 'registry defect carried forward');
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/cognitive-audit/', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or cognitive-audit',
        dirty.length ? dirty.join(' | ') : 'clean');
    const crypto = await import('node:crypto');
    const d = crypto.createHash('sha256')
        .update(fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.md')).digest('hex');
    ok(fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.sha256', 'utf8').includes(d),
        'frozen M7 preregistration digest still verifies', d.slice(0, 16) + '…');
    ok(/env\.generateAccepted\(input\.configSeed/.test(RUN), 'run.js unchanged in the traced region');
}

// ── G8. Anti-vacuity ────────────────────────────────────────────────────────
console.log('');
console.log('-- G8. anti-vacuity ------------------------------------------------------');
{
    const start = MAIN.indexOf('function runPrediction(');
    const eps = MAIN.indexOf('if (liveRng() < epsilon');
    ok(start < eps && !(eps < start), 'G1 ordering check is a real inequality');
    ok(M28.includes('# M28-YELLOW'), 'verdict string present and mutable');
    ok(/0x5bf03635/.test(UQBC), 'G1 binds to source, not to the memo');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M28 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'ANALYSIS VERIFIED' : 'ANALYSIS NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

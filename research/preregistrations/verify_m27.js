// M27 — INITIALISATION-AXIS FEASIBILITY GATE.
//
// M27's HOLD verdict rests on a conjunction of source facts, each checked here:
//
//   (a) warmStore writes the EMPTY object, and does so AFTER boot() — positional;
//   (b) runOnce asserts cold localStorage and THROWS — and the frozen clause it cites
//       really exists in M7_PREREGISTRATION.md;
//   (c) loadBrain runs at module top level, i.e. before the tick loop — positional;
//   (d) __M7_GOAL__ is applied AFTER loadBrain, so the oracle is protected — positional;
//   (e) transitions really does feed candidate generation.
//
// The ordering checks are OFFSET COMPARISONS, not string presence: "after" and "before"
// are the whole argument, and a presence check cannot see them.
//
// No seed consumed, no configuration instantiated, the agent is never booted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M27 = fs.readFileSync(ROOT + 'research/preregistrations/M27_INITIALISATION_AXIS_FEASIBILITY.md', 'utf8');
const RUN = fs.readFileSync(ROOT + 'experiments/m7/run.js', 'utf8');
const MAIN = fs.readFileSync(ROOT + 'main.js', 'utf8');
const PRE = fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.md', 'utf8');

const NL = String.fromCharCode(10);
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M27);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };

console.log('='.repeat(78));
console.log('  M27 INITIALISATION-AXIS FEASIBILITY GATE');
console.log('='.repeat(78));

// ── G1. warmStore: empty content, and written AFTER boot ────────────────────
console.log('');
console.log('-- G1. warmStore is fault injection -------------------------------------');
{
    const iWarm = RUN.indexOf("globalThis.localStorage.setItem('brain', '{}')");
    ok(iWarm > 0, 'warmStore writes the EMPTY object (source)', 'offset ' + iWarm);
    const iBoot = RUN.indexOf('await boot({ seed: input.agentSeed');
    ok(iBoot > 0, 'boot() call located', 'offset ' + iBoot);
    ok(iWarm > iBoot,
        'POSITIONAL: warmStore is written AFTER boot(), i.e. after loadBrain has run',
        `boot@${iBoot} < warm@${iWarm}`);
    // it must write '{}' and nothing richer
    // Enumerate every setItem('brain', ...) and require each to write the empty object.
    // A negative lookahead after \s* is unsound here: \s* backtracks to zero width, the
    // lookahead then inspects the space, and the guard passes on any input.
    const writes = [];
    {   const rxw = /setItem\(\s*'brain'\s*,\s*([^)]*)\)/g;
        let w; while ((w = rxw.exec(RUN)) !== null) writes.push(w[1].trim()); }
    ok(writes.length > 0, 'brain writes located in run.js', JSON.stringify(writes));
    ok(writes.every(v => v === "'{}'"),
        'every brain write in run.js writes the EMPTY object', JSON.stringify(writes));
    ok(/fault injection/i.test(RUN), 'source itself calls it fault injection');
    ok(/fault injection, not a state axis|fault injection/i.test(F),
        'memo classifies warmStore as fault injection');
    ok(/inverts its purpose|exists to prove the cold-start guard/i.test(F),
        'memo states reading it as a pre-seeding lever inverts its purpose');
    {   // A presence check cannot see an ADDED contradiction. Block-scan for the
        // ASSERTION that any of these is a usable initialisation axis.
        const bad = [];
        for (const b of M27.split(NL + NL)) {
            const fb = flat(b);
            if (/NOT|not a|never|prohibited|fault injection|would violate|forbidden|illegitimate|in principle/i.test(fb)) continue;
            if (/(?:warmStore|warm brain|M7 arms?|pre-seeded stores?) (?:is|are) a (?:valid|legitimate|usable)/i.test(fb))
                bad.push(fb.slice(0, 70));
        }
        ok(bad.length === 0, 'no candidate is ASSERTED to be a valid axis',
            bad.join(' | ') || 'clean'); }
}

// ── G2. The cold-start guard, and the frozen clause it cites ────────────────
console.log('');
console.log('-- G2. the frozen cold-start prohibition --------------------------------');
{
    ok(/const coldOk = keysAtStart\.length === 0 && brainAtStart === null;/.test(RUN),
        'cold-start condition present (source)');
    ok(/throw new Error\('G10 VIOLATION: localStorage was not cold at run start/.test(RUN),
        'the guard THROWS on violation (source)');
    // the frozen clause must actually exist, verbatim in substance
    const pf = flat(PRE);
    ok(/Cold localStorage per run, asserted at start/i.test(pf),
        'frozen M7 §5.4 really requires cold localStorage per run');
    ok(/5\.4 Execution requirements/.test(PRE), 'frozen §5.4 section exists');
    // and the memo must cite it rather than paraphrase a prohibition into existence
    ok(/Cold .?localStorage.? per run.{0,40}asserted at start/i.test(F),
        'memo quotes the frozen clause');
    ok(/explicitly prohibited|not merely absent/i.test(F),
        'memo states the axis is prohibited, not merely absent');
    // the substantive reason must be carried, not just the rule
    ok(/silently share learned state across arms/i.test(pf),
        'frozen §5.4 gives the contamination reason (source)');
    ok(/contaminat/i.test(F), 'memo carries the contamination reason');
}

// ── G3. loadBrain runs before the tick loop; goal override runs after it ────
console.log('');
console.log('-- G3. the pre-tick path, and the oracle protection ---------------------');
{
    const iLoadDef = MAIN.indexOf('function loadBrain()');
    const iLoadCall = MAIN.indexOf('loadBrain(); // restores saved memory when page starts');
    const iGoal = MAIN.indexOf('if (globalThis.__M7_GOAL__ != null) goalNeuronId');
    const iRunAgent = MAIN.indexOf('function runAgent(');
    ok(iLoadDef > 0 && iLoadCall > 0, 'loadBrain defined and called (source)',
        `def@${iLoadDef} call@${iLoadCall}`);
    ok(iGoal > 0, '__M7_GOAL__ override located', 'offset ' + iGoal);
    ok(iGoal > iLoadCall,
        'POSITIONAL: the goal override runs AFTER loadBrain — the oracle is protected',
        `loadBrain@${iLoadCall} < goal@${iGoal}`);
    ok(iLoadCall < iRunAgent,
        'POSITIONAL: loadBrain runs before the tick-loop function definition region',
        `loadBrain@${iLoadCall} < runAgent@${iRunAgent}`);
    // loadBrain really does restore the stores the memo names
    const body = MAIN.slice(iLoadDef, iLoadDef + 4000);
    for (const s of ['rewards', 'Q', 'penalties', 'transitions', 'goalNeuronId'])
        ok(new RegExp('\\b' + s + '\\b').test(body), `loadBrain restores ${s}`);
    ok(/genuine initial internal state|genuine pre-tick state path|pre-tick state path/i.test(F),
        'memo acknowledges a genuine pre-tick state path exists');
    ok(/oracle is protected/i.test(F), 'memo states the oracle is protected');
}

// ── G4. A warm brain would change candidate generation ──────────────────────
console.log('');
console.log('-- G4. a warm brain would change the pool -------------------------------');
{
    ok(/memoryMap\.forEach/.test(MAIN) && /const memoryMap = transitions\.get\(currentKey\)/.test(MAIN),
        'candidate generation reads transitions (source)');
    ok(/penalties\.get\(currentKey \+ "->" \+ k\) > 10/.test(MAIN), 'F1 reads penalties');
    ok(/changes candidate generation|Changes candidate generation/i.test(M27),
        'memo states a warm brain would change candidate generation');
    ok(/not be comparable to C1|changes the pool E6 normalises over|pool E6 normalises/i.test(F),
        'memo states the comparability consequence');
}

// ── G5. M7 arms are a treatment, not an initialisation ──────────────────────
console.log('');
console.log('-- G5. M7 arms -----------------------------------------------------------');
{
    ok(/arms\.configure\(\{ arm:/.test(RUN), 'arms.configure present (source)');
    ok(/bayesianTrustFor|aggregateTrustFor/.test(RUN), 'arms wire trust behaviour (source)');
    ok(/treatment manipulation, not an initialisation|a second treatment/i.test(F),
        'memo classifies arms as a treatment, not an initialisation');
}

// ── G6. The axes are kept separate, not collapsed ───────────────────────────
console.log('');
console.log('-- G6. axis separation ---------------------------------------------------');
{
    for (const a of ['A1', 'A2', 'A3', 'A4', 'A5'])
        ok(new RegExp('\\*\\*' + a + '\\b').test(M27), `axis ${a} defined separately`);
    ok(/These are not collapsed into one category|not collapsed/i.test(F),
        'memo states the axes are not collapsed');
    // I R H C T Y controllability table
    for (const v of ['I', 'R', 'H', 'C', 'T', 'Y'])
        ok(new RegExp('\\| \\*\\*' + v + '\\*\\* \\|').test(M27), `variable ${v} in the table`);
    ok(/agentSeed → R.{0,20}not.{0,20}agentSeed → I/i.test(F)
        || /`agentSeed → R`, \*\*not\*\* `agentSeed → I`/.test(M27),
        'memo verifies the mapping rather than assuming it');
}

// ── G7. The four forbidden overclaims ───────────────────────────────────────
console.log('');
console.log('-- G7. overclaim scan ----------------------------------------------------');
{
    const BANNED = [
        ['we need agentSeed variation (for the init question)',
         /we need agentSeed variation/i],
        ['agentSeed solves the confound',
         /agentSeed (?:solves|resolves|removes) the confound/i],
        ['more seeds = mechanism evidence',
         /more seeds (?:=|means|gives|yields)[^.]{0,30}mechanism/i],
        ['no axis exists at all',
         /no (?:current |currently )?axis exists\b/i],
        ['mechanism validated',
         /(?:futureScore|the mechanism) (?:is|has been) (?:a )?(?:reusable|validated)/i],
    ];
    for (const [l, re] of BANNED) {
        const bad = [];
        for (const b of M27.split(NL + NL)) {
            const fb = flat(b);
            if (/\bnot\b|never|must not|cannot|does not|forbid|I am not claiming|would NOT/i.test(fb)) continue;
            const m = fb.match(re); if (m) bad.push(m[0]);
        }
        ok(bad.length === 0, `no overclaim: ${l}`, bad.join(' | ') || 'clean');
    }
    // and the precise disclaimer must be present
    ok(/I am not claiming .?no axis exists.?/i.test(F),
        'memo explicitly disclaims the too-broad negative');
    ok(/would \*\*not\*\* establish that `futureScore` is a reusable cognitive mechanism/.test(M27)
        || /would not establish that futureScore is a reusable cognitive mechanism/i.test(F),
        'M26 claim boundary preserved verbatim in substance');
    ok(/varies the realised stochastic trajectory after a \*\*common deterministic initial state\*\*/.test(M27)
        || /common deterministic initial state/i.test(F),
        'M26 initialisation/trajectory distinction preserved');
}

// ── G8. Verdict and required structure ──────────────────────────────────────
console.log('');
console.log('-- G8. verdict and structure ---------------------------------------------');
{
    ok(/# M27-HOLD/.test(M27), 'verdict is M27-HOLD');
    ok(!/# M27-GREEN/.test(M27) && !/# M27-YELLOW/.test(M27), 'exactly one verdict');
    ok(/Not GREEN:/i.test(M27) && /Not YELLOW:/i.test(M27),
        'both alternatives explicitly considered');
    for (let i = 1; i <= 10; i++)
        ok(new RegExp('^\\| ' + i + ' \\|', 'm').test(M27), `adversarial case ${i} present`);
    for (const c of ['GREEN', 'YELLOW', 'RED'])
        ok(new RegExp('\\*\\*' + c + '\\*\\*').test(M27), `constraint class used: ${c}`);
    for (const o of ['A', 'B', 'C', 'D'])
        ok(new RegExp('\\| \\*\\*' + o + '\\*\\* \\|').test(M27), `next-step option ${o} assessed`);
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M27), `separation level: ${s}`);
    ok(/M28 — Stochastic-Trajectory Robustness Formulation/.test(M27),
        'single highest-value next milestone named');
    ok(/stochastic-trajectory robustness study/i.test(F),
        'L2 named correctly, per the ruling condition');
    ok(/not an initialisation study|never be called one/i.test(F),
        'memo forbids calling L2 an initialisation study');
    ok(/asymmetric/i.test(F), 'memo states the asymmetric value of L2');
}

// ── G9. Governance ──────────────────────────────────────────────────────────
console.log('');
console.log('-- G9. governance --------------------------------------------------------');
{
    ok(/FORMULATION \+ SOURCE-BOUND FEASIBILITY AUDIT ONLY/.test(M27), 'declares audit-only');
    ok(/the agent was never booted/i.test(F), 'agent never booted');
    ok(/no architecture modified|No architecture was modified/i.test(F), 'no architecture modified');
    ok(/registry-link defect/i.test(F), 'registry defect carried forward');
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/cognitive-audit/M7_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or the frozen M7 prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
    // frozen M7 digest must still verify
    const crypto = await import('node:crypto');
    const d = crypto.createHash('sha256')
        .update(fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.md')).digest('hex');
    const side = fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.sha256', 'utf8');
    ok(side.includes(d), 'frozen M7 preregistration digest still verifies', d.slice(0, 16) + '…');
}

// ── G10. Anti-vacuity ───────────────────────────────────────────────────────
console.log('');
console.log('-- G10. anti-vacuity -----------------------------------------------------');
{
    const iWarm = RUN.indexOf("localStorage.setItem('brain', '{}')");
    const iBoot = RUN.indexOf('await boot({ seed: input.agentSeed');
    ok(iWarm > iBoot && !(iBoot > iWarm), 'G1 ordering check is a real inequality');
    ok(M27.includes('# M27-HOLD'), 'verdict string present and mutable');
    ok(/Cold localStorage per run/i.test(flat(PRE)),
        'G2 binds to the frozen document, not to the memo');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M27 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'AUDIT VERIFIED' : 'AUDIT NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

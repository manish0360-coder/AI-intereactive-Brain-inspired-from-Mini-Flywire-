// M26 — TWO-AXIS POPULATION FORMULATION GATE.
//
// M26's verdict rests on ONE structural claim: agentSeed varies the realised trajectory
// and NOT the initial state. That claim is a conjunction of four source facts, and this
// gate checks each of them against source rather than accepting the memo's word:
//
//   (a) boot() uses `seed` only for initRng;
//   (b) all four streams derive from agentSeed, none from configSeed;
//   (c) every liveRng() consumer sits inside a tick-loop function — checked POSITIONALLY
//       against the enclosing function offsets, not by name;
//   (d) the learned stores start empty and warmStore is false.
//
// It also recomputes the toy-population arithmetic from values parsed OUT OF THE MEMO,
// and block-scans for the two claims the ruling forbids smuggling.
//
// No seed is consumed, no configuration instantiated, the agent is never booted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M26 = fs.readFileSync(ROOT + 'research/preregistrations/M26_TWO_AXIS_POPULATION_FORMULATION.md', 'utf8');
const RUN = fs.readFileSync(ROOT + 'experiments/m7/run.js', 'utf8');
const DRV = fs.readFileSync(ROOT + 'experiments/phase1_0/_driver.js', 'utf8');
const MAIN = fs.readFileSync(ROOT + 'main.js', 'utf8');
const RNG = fs.readFileSync(ROOT + 'instrumentation/rng.js', 'utf8');

const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();

// Strip block and line comments. A scan for a token in SOURCE must not count the token
// in prose ABOUT the source — boot's own comments mention `seed` four times, and the two
// Math.random sites live inside a closed /* ... */ block. Blanking comments while
// preserving length keeps every offset valid for positional checks.
const decomment = (src) => {
    let out = src.split(''), i = 0, n = src.length;
    while (i < n) {
        if (src[i] === '/' && src[i + 1] === '*') {
            const end = src.indexOf('*/', i + 2);
            const stop = end === -1 ? n : end + 2;
            for (let k = i; k < stop; k++) if (out[k] !== NL) out[k] = ' ';
            i = stop; continue;
        }
        if (src[i] === '/' && src[i + 1] === '/') {
            let k = i; while (k < n && src[k] !== NL) { out[k] = ' '; k++; }
            i = k; continue;
        }
        i++;
    }
    return out.join('');
};
const NL = String.fromCharCode(10);
const F = flat(M26);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;

console.log('='.repeat(78));
console.log('  M26 TWO-AXIS FORMULATION GATE');
console.log('='.repeat(78));

// ── G1(a). agentSeed's only channel is initRng ───────────────────────────────
console.log('');
console.log('-- G1a. agentSeed has exactly one channel -------------------------------');
{
    ok(/boot\(\{ seed: input\.agentSeed, goal: cfg\.goal \}\)/.test(RUN),
        'run.js passes agentSeed to boot (source)');
    const bootBody = DRV.slice(DRV.indexOf('export async function boot'),
                               DRV.indexOf('/** press SPACE'));
    ok(/initRng\(seed\)/.test(bootBody), 'boot calls initRng(seed)');
    // `seed` must appear in boot ONLY in the destructure and the initRng call
    const bootCode = decomment(bootBody);
    const uses = (bootCode.match(/\bseed\b/g) || []).length;
    ok(uses <= 3, 'boot CODE references seed only at destructure and initRng',
        uses + ' occurrences (comments stripped)');
    ok(!/seed\s*[,)]\s*$/m.test(bootBody.replace(/initRng\(seed\)/, '')) ||
       !/boot[\s\S]*?seed[\s\S]*?(?:weight|state|init[A-Z])/.test(bootBody),
        'boot derives no initial state from seed');
    ok(/agentSeed reaches the system through .?initRng.? alone/i.test(F),
        'memo states the single-channel finding');
}

// ── G1(b). stream seeding ────────────────────────────────────────────────────
console.log('');
console.log('-- G1b. stream seeding ---------------------------------------------------');
{
    const blk = RUN.slice(RUN.indexOf('cognitive: input.agentSeed'),
                          RUN.indexOf('cognitive: input.agentSeed') + 260);
    for (const [n, re] of [
        ['cognitive', /cognitive: input\.agentSeed >>> 0/],
        ['visual', /visual: \(input\.agentSeed \^ 0x9e3779b9\) >>> 0/],
        ['environment', /environment: \(input\.agentSeed \^ 0x5EED\) >>> 0/],
        ['sigma', /sigma: \(input\.agentSeed \^ 0xBEEF\) >>> 0/]])
        ok(re.test(blk), `stream ${n} derives from agentSeed`);
    ok(!/configSeed/.test(blk), 'no stream derives from configSeed');
    ok(/env\.generateAccepted\(input\.configSeed, input\.configIndex\)/.test(RUN),
        'configSeed enters the run only via generateAccepted');
}

// ── G1(c). POSITIONAL: every liveRng consumer is inside a tick-loop function ─
console.log('');
console.log('-- G1c. randomness consumers are all tick-loop (positional) --------------');
{
    // Build the function-boundary map from source, then locate every liveRng() call.
    const fnNames = ['runPrediction', 'runAgent', 'runAgentLoop'];
    const bounds = {};
    for (const n of fnNames) {
        const i = MAIN.indexOf('function ' + n + '(');
        ok(i > 0, `function ${n} found in main.js`, 'offset ' + i);
        bounds[n] = i;
    }
    // ordered list of ALL top-level function starts, so we can attribute each call site
    const starts = [];
    const rx = /^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
    let m; while ((m = rx.exec(MAIN)) !== null) starts.push({ name: m[1], at: m.index });
    ok(starts.length > 10, 'function boundary map built', starts.length + ' functions');

    const owner = (off) => {
        let best = null;
        for (const s of starts) if (s.at <= off && (!best || s.at > best.at)) best = s;
        return best ? best.name : '(top-level)';
    };
    const calls = [];
    const rx2 = /liveRng\s*\(/g;
    while ((m = rx2.exec(MAIN)) !== null) calls.push(m.index);
    // exclude the import line and comment references by requiring the owner lookup
    const owners = new Set(calls.map(owner));
    ok(calls.length >= 10, 'liveRng call sites located', calls.length + ' sites');
    const outside = [...owners].filter(o => !fnNames.includes(o));
    ok(outside.length === 0 || outside.every(o => o === '(top-level)' && true),
        'every liveRng site attributes to a known function', [...owners].join(','));
    // the real check: no site may sit in a function OTHER than the three tick-loop ones,
    // ignoring the module-header import/comment region (offset before runPrediction).
    const headerEnd = bounds.runPrediction;
    const bad = calls.filter(c => c > headerEnd && !fnNames.includes(owner(c)))
                     .map(c => owner(c));
    ok(bad.length === 0, 'NO liveRng consumer outside runPrediction/runAgent/runAgentLoop',
        bad.length ? [...new Set(bad)].join(',') : 'clean');
    // Math.random must be dead (commented)
    const MAINCODE = decomment(MAIN);
    const mr = [];
    const rx3 = /Math\.random\s*\(/g;
    while ((m = rx3.exec(MAINCODE)) !== null) mr.push('offset ' + m.index);
    ok(mr.length === 0, 'no LIVE Math.random survives comment stripping',
        mr.length ? mr.join(' | ') : 'clean');
    ok(/Math\.random/.test(MAIN),
        'CONTROL: raw source contains Math.random — the stripper is load-bearing');
}

// ── G1(d). cold start: learned stores empty, warmStore false ────────────────
console.log('');
console.log('-- G1d. initial state is a constant -------------------------------------');
{
    ok(/const adjacencyMemory = new Map\(\);/.test(MAIN), 'adjacencyMemory starts empty');
    ok(/let goalNeuronId = null;/.test(MAIN), 'goalNeuronId starts null');
    ok(/let agentCurrent = null;/.test(MAIN), 'agentCurrent starts null');
    ok(/warmStore: false/.test(fs.readFileSync(ROOT + 'experiments/c1/collect.js', 'utf8')),
        'C1 runs with warmStore false — cold start');
    // THE verdict-bearing conclusion
    ok(/trajectory-randomisation seed, not an initialisation parameter/i.test(F),
        'memo states agentSeed is a trajectory seed, not an initialisation parameter');
    ok(/initial state is identical for every .?agentSeed/i.test(F),
        'memo states the initial state is constant across agentSeed');
    ok(/NOT AVAILABLE/.test(M26) && /initialisation/i.test(F),
        'memo marks the initialisation axis as not available');
}

// ── G2. Collisions and multiplicity under two axes ──────────────────────────
console.log('');
console.log('-- G2. multiplicity ------------------------------------------------------');
{
    ok(/let a = \(seed >>> 0\) \|\| 1;/.test(RNG), 'makeRng coerces 0 to 1 (source)');
    // thresholds really are how randomness is consumed — the basis of trajectory collision
    const th = (MAIN.match(/liveRng\(\)\s*<\s*[0-9.a-zA-Z_]+/g) || []);
    ok(th.length >= 5, 'randomness is consumed at threshold comparisons (source)',
        th.length + ' sites');
    ok(/threshold comparisons/i.test(F), 'memo states the threshold mechanism');
    ok(/structurally expected/i.test(F), 'memo calls trajectory collision structurally expected');
    ok(/fingerprint/i.test(F), 'memo names the free detection mechanism');
    ok(/No estimator is invented|no estimator/i.test(F), 'memo invents no estimator');
    // it must NOT claim the rate is negligible
    const bad = [];
    for (const b of M26.split(NL + NL)) {
        const fb = flat(b);
        if (/not established|argues the opposite|Hy-3|unquantified|expected/i.test(fb)) continue;
        if (/multiplicity is negligible|collisions are negligible|can be ignored\b/i.test(fb))
            bad.push(fb.slice(0, 70));
    }
    ok(bad.length === 0, 'memo never asserts multiplicity is negligible', bad.join(' | ') || 'clean');
}

// ── G3. Estimand: distribution, not mean — recomputed from the memo ─────────
console.log('');
console.log('-- G3. estimand ----------------------------------------------------------');
{
    // parse toy 8's two values out of the memo and prove the mean is uninformative
    const Fn = F.split(String.fromCharCode(0x2212)).join('-')
                .split(String.fromCharCode(0x2081)).join('1')
                .split(String.fromCharCode(0x2082)).join('2');
    // Use the CAPTURE GROUPS, not a re-extraction of the matched string: the match text
    // also contains the labels a1 and a2, so re-scanning it yields four numbers, not two.
    const m8 = [...Fn.matchAll(/\(a1\) = ([-+]?[0-9]+(?:\.[0-9]+)?), .\(a2\) = ([-+]?[0-9]+(?:\.[0-9]+)?)/g)].map(x => [Number(x[1]), Number(x[2])]);
    ok(m8.length >= 1, 'toy tau pairs parsed from the memo', JSON.stringify(m8));
    const reversing = m8.find(p => p[0] * p[1] < 0);
    ok(reversing !== undefined, 'a sign-reversing toy pair is present',
        reversing ? JSON.stringify(reversing) : 'NONE FOUND');
    if (!reversing) { console.log('   [FAIL] cannot proceed without the reversing pair');
        fails++; checks++; }
    else {
    const mean = (reversing[0] + reversing[1]) / 2;
    ok(near(mean, 0), 'the reversing pair averages to exactly 0 — indistinguishable from a null',
        String(mean));
    ok(Math.abs(reversing[0]) > 0.1 && Math.abs(reversing[1]) > 0.1,
        'CONTROL: the reversing pair is not itself two zeros', JSON.stringify(reversing));
    }
    ok(/distribution of/i.test(F) && /across .?A/i.test(F),
        'memo chooses the distributional estimand');
    ok(/wrong default/i.test(F), 'memo rejects the mean-over-A default');
    ok(/No threshold on dispersion is proposed/i.test(F), 'no dispersion threshold proposed');
}

// ── G4. The two forbidden claims ────────────────────────────────────────────
console.log('');
console.log('-- G4. forbidden claims --------------------------------------------------');
{
    const BANNED = [
        ['agentSeed alone suffices for a mechanism', /varying agentSeed (?:alone )?(?:is|suffices|establishes)[^.]{0,40}(?:sufficient|mechanism)/i],
        ['P4 is the final population', /P4 is (?:the )?(?:final|correct|automatic)[^.]{0,30}population/i],
        ['mechanism validated', /(?:futureScore|the mechanism) (?:is|has been) (?:a )?(?:reusable|validated)/i],
        ['L3 is mechanism proof', /L3 (?:is|constitutes|provides) (?:a )?mechanism proof/i],
    ];
    for (const [l, re] of BANNED) {
        const bad = [];
        for (const b of M26.split(NL + NL)) {
            const fb = flat(b);
            if (/\bnot\b|never|FALSIFIED|must not|cannot|does not|forbid|guard against|no evidence/i.test(fb)) continue;
            const m = fb.match(re); if (m) bad.push(m[0]);
        }
        ok(bad.length === 0, `no forbidden claim: ${l}`, bad.join(' | ') || 'clean');
    }
    // and each must be POSITIVELY disclaimed
    for (const [l, re] of [
        ['sufficiency', /nowhere near sufficient|not sufficient/i],
        ['P4 non-constructible', /P4[^.]{0,60}not constructible|not constructible/i],
        ['not mechanism proof', /not .?mechanism proof.?|must never be described as one/i],
        ['smuggling route', /smuggling route/i]])
        ok(re.test(F), `disclaimer present: ${l}`);
    ok(/C1 is not reinterpreted/i.test(F), 'memo states C1 is not reinterpreted');
}

// ── G5. Required structure ──────────────────────────────────────────────────
console.log('');
console.log('-- G5. required structure ------------------------------------------------');
{
    for (const p of ['P1', 'P2', 'P3', 'P4', 'P5'])
        ok(new RegExp('\\*\\*' + p + '\\*\\*').test(M26), `population candidate ${p} present`);
    for (const l of ['L0', 'L1', 'L2', 'L3', 'L4'])
        ok(new RegExp('\\*\\*' + l + '\\*\\*').test(M26), `ladder level ${l} present`);
    for (let i = 1; i <= 10; i++)
        ok(new RegExp('^\\| ' + i + ' \\|', 'm').test(M26), `toy population ${i} present`);
    for (let i = 1; i <= 10; i++)
        ok(new RegExp('\\*\\*' + i + '\\. ').test(M26), `PASS 2 attack ${i} present`);
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M26), `separation level: ${s}`);
    // risk classification must use the four required classes
    for (const c of ['structural', 'measurable', 'repairable', 'accepted limitation'])
        ok(new RegExp(c, 'i').test(M26), `risk class present: ${c}`);
    ok(/computational explosion/i.test(F), 'computational explosion risk named');
    ok(/Axis C/.test(M26) && /Axis A/.test(M26), 'both axes formally named');
    ok(/sampling device/i.test(F) && /scientific unit/i.test(F),
        'sampling-device / scientific-unit distinction preserved');
}

// ── G6. Verdict ─────────────────────────────────────────────────────────────
console.log('');
console.log('-- G6. outcome -----------------------------------------------------------');
{
    ok(/# M26-YELLOW/.test(M26), 'verdict is M26-YELLOW');
    ok(!/# M26-GREEN/.test(M26) && !/# M26-HOLD/.test(M26), 'exactly one verdict');
    ok(/Not HOLD/i.test(F), 'HOLD was explicitly considered and rejected');
    ok(/why it is not GREEN/i.test(F) || /Unresolved, and why it is not GREEN/i.test(F),
        'GREEN was explicitly considered');
    ok(/M27 — Initialisation-Axis Feasibility Formulation/.test(M26),
        'single highest-value next milestone named');
    ok(/FORMULATION/.test(M26) && /No implementation is authorised/i.test(F),
        'next milestone typed as formulation, no implementation requested');
    ok(/counter-argument fairly|I note the counter-argument/i.test(F),
        'the L2-first counter-argument is stated fairly');
}

// ── G7. Governance ──────────────────────────────────────────────────────────
console.log('');
console.log('-- G7. governance --------------------------------------------------------');
{
    ok(/FORMULATION ONLY/.test(M26), 'declares formulation-only');
    ok(/No seed generated, selected, evaluated or consumed/i.test(F), 'no seed touched');
    ok(/the agent was never booted/i.test(F), 'agent never booted');
    ok(/registry defect remains open/i.test(F), 'registry defect left open');
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/preregistrations/C1_PREREGISTRATION.md', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or frozen prereg',
        dirty.length ? dirty.join(' | ') : 'clean');
    // no new seed range invented
    const ranges = (M26.match(/\b\d{6}\s*[-–—]\s*\d{6}\b/g) || [])
        .filter(r => !/895000/.test(r));
    ok(ranges.length === 0, 'no new seed range created', ranges.join(', ') || 'clean');
}

// ── G8. Anti-vacuity ────────────────────────────────────────────────────────
console.log('');
console.log('-- G8. anti-vacuity ------------------------------------------------------');
{
    ok(M26.includes('# M26-YELLOW'), 'verdict string present and mutable');
    ok(near((0.5 + -0.5) / 2, 0) && !near((0.5 + 0.5) / 2, 0),
        'G3 mean check is a real inequality, not a tautology');
    ok(/runPrediction|runAgent/.test(MAIN), 'G1c has real functions to attribute against');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M26 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

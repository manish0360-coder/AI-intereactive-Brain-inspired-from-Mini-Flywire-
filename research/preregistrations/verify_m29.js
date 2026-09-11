// M29 — BASELINE FORMULATION AUDIT GATE.
//
// M29 REJECTS a proposal this program itself made at M28. Its verdict rests on three
// independent source facts, each checked here against source rather than against the memo:
//
//   (1) makeGuard admits exactly two arms and THROWS otherwise; the guard-off default is
//       ARMED-equivalent  =>  no treatment-neutral baseline can be generated;
//   (2) saveBrain omits timeMemory, which is live learned state feeding analyzeCandidate
//       =>  a round-tripped baseline is a reconstruction, not a copy;
//   (3) frozen 5.4 secures attributability, which the frozen estimand requires
//       =>  M28's "broader than its stated purpose" is retracted.
//
// Each is checked with a CONTROL, so a passing gate cannot be passing vacuously.
//
// No seed consumed, no configuration instantiated, the agent is never booted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M29 = fs.readFileSync(ROOT + 'research/preregistrations/M29_BASELINE_FORMULATION_AUDIT.md', 'utf8');
const M28 = fs.readFileSync(ROOT + 'research/preregistrations/M28_NEXT_DIRECTION_DECISION_ANALYSIS.md', 'utf8');
const MAIN = fs.readFileSync(ROOT + 'main.js', 'utf8');
const PERM = fs.readFileSync(ROOT + 'experiments/uqb/permute.js', 'utf8');
const HOOK = fs.readFileSync(ROOT + 'experiments/uqb/hook.mjs', 'utf8');
const PRE = fs.readFileSync(ROOT + 'research/cognitive-audit/M7_PREREGISTRATION.md', 'utf8');
const UQBR = fs.readFileSync(ROOT + 'experiments/uqb/results/uqb_results.json', 'utf8');

const NL = String.fromCharCode(10);
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M29);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };

console.log('='.repeat(78));
console.log('  M29 BASELINE FORMULATION AUDIT GATE');
console.log('='.repeat(78));

// ── G1. No treatment-neutral arm exists ─────────────────────────────────────
console.log('');
console.log('-- G1. no neutral arm ----------------------------------------------------');
{
    const m = PERM.match(/export const ARMS = Object\.freeze\(\[([^\]]*)\]\)/);
    ok(m !== null, 'ARMS declaration located (source)', m ? m[1] : 'NOT FOUND');
    const arms = m ? m[1].split(',').map(s => s.trim().replace(/'/g, '')) : [];
    ok(arms.length === 2 && arms.includes('ARMED') && arms.includes('ABLATED'),
        'EXACTLY two arms exist — no neutral third', JSON.stringify(arms));
    ok(/if \(!ARMS\.includes\(arm\)\) throw new Error/.test(PERM),
        'makeGuard THROWS on any arm outside that set (source)');
    ok(/const delivered = arm === 'ABLATED' \? values\.map\(\(\) => ABLATED_VALUE\) : values;/.test(PERM),
        'the arm decides delivery: ABLATED zeroes, anything else delivers (source)');
    // Source COMMENT prose wraps across lines and carries '//' markers, so a scan for a
    // phrase must flatten it first — the phrase here spans hook.mjs:20-21.
    const hookProse = HOOK.replace(/^\s*\/\//gm, ' ').replace(/\s+/g, ' ');
    ok(/DEFAULT-OFF/.test(hookProse) && /behaviourally identical to HEAD/.test(hookProse),
        'guard-off default is production behaviour, i.e. ARMED-equivalent (source)');
    ok(/behaviourally identical to HEAD/.test(hookProse) && !/behaviourally identical to HEAD/.test(HOOK),
        'CONTROL: the flattener is load-bearing — the phrase spans a line break');
    // CONTROL: the arm set really is the only gate — a third name must not appear
    ok(!/'NEUTRAL'|"NEUTRAL"|'CONTROL'|'OFF_ARM'/.test(PERM),
        'CONTROL: no neutral/control arm token exists anywhere in permute.js');
    ok(/No treatment-neutral baseline can be generated|no treatment-neutral burn-in exists|not pre-treatment/i.test(F),
        'memo states the no-neutral-baseline finding');
    ok(/researcher degree of freedom|free parameter/i.test(F),
        'memo names the unresolvable burn-in-arm choice');
}

// ── G2. The persistence layer is lossy ──────────────────────────────────────
console.log('');
console.log('-- G2. saveBrain is lossy ------------------------------------------------');
{
    const iSave = MAIN.indexOf('function saveBrain()');
    const save = MAIN.slice(iSave, MAIN.indexOf('function loadBrain()'));
    ok(iSave > 0 && save.length > 200, 'saveBrain body located', save.length + ' chars');
    // the stores the memo says ARE persisted must really be there
    for (const k of ['transitions', 'rewards', 'penalties', 'signals', 'Q', 'episodes'])
        ok(new RegExp('\\b' + k + '\\b').test(save), `saveBrain persists ${k}`);
    // timeMemory must be live state, feed the weight, and be ABSENT from saveBrain
    ok(/const timeMemory = new Map\(\);/.test(MAIN), 'timeMemory is live learned state (source)');
    ok(/timeMemory\.set\(/.test(MAIN), 'timeMemory is written during the run (source)');
    const iAnalyze = MAIN.indexOf('analyzeCandidate({');
    const call = MAIN.slice(iAnalyze, iAnalyze + 400);
    ok(/timeMemory/.test(call), 'timeMemory is passed to analyzeCandidate — it feeds the weight');
    ok(!/\btimeMemory\b/.test(save), 'timeMemory is ABSENT from saveBrain — the loss');
    // CONTROL: the absence test must be capable of finding a name that IS present
    ok(/\bpenalties\b/.test(save) && !/\btimeMemory\b/.test(save),
        'CONTROL: the same test finds penalties present and timeMemory absent');
    ok(/reconstruction, not a copy|reconstruction rather than a copy/i.test(F),
        'memo states the round-trip yields a reconstruction');
    ok(/no continuous run ever occupies|combination .{0,40}no continuous run/i.test(F),
        'memo states the restored combination is unreachable by experience');
}

// ── G3. §5.4 attributability — and the M28 retraction ───────────────────────
console.log('');
console.log('-- G3. attributability and the retraction --------------------------------');
{
    ok(/Cold localStorage per run, asserted at start/i.test(flat(PRE)),
        'frozen §5.4 requires cold localStorage (source)');
    ok(/continuous presence/i.test(UQBR),
        'the committed estimand names "continuous presence" (source artifact)');
    ok(/TOO STRONG/.test(M29) && /retract/i.test(F),
        'memo retracts the M28 claim explicitly');
    ok(/attributab/i.test(F), 'memo names attributability as the second guarantee');
    ok(/I do not propose weakening or modifying §5\.4/i.test(F),
        'memo declines to propose weakening §5.4');
    ok(/none should be proposed|withdrawing M28.{0,60}refinement|no clause/i.test(F),
        'memo withdraws the refinement suggestion');
    // M28 must carry the forward correction
    ok(/CORRECTED IN PART by M29/.test(M28), 'M28 carries the correction note');
    ok(/corrected forward, not rewritten/i.test(M28), 'correction is forward, not a rewrite');
    ok(/B → A ordering recommendation stands/i.test(flat(M28)),
        'M28 note preserves the ordering recommendation it did not retract');
}

// ── G4. The verdict rejects the program's own prior proposal ────────────────
console.log('');
console.log('-- G4. the verdict -------------------------------------------------------');
{
    ok(/# M29-HOLD/.test(M29), 'verdict is M29-HOLD');
    ok(!/# M29-GREEN/.test(M29) && !/# M29-YELLOW/.test(M29), 'exactly one verdict');
    ok(/rejecting my own M28 proposal|I am rejecting my own/i.test(F),
        'memo states plainly that it rejects its own prior proposal');
    ok(/three independent|any one of which is sufficient/i.test(F),
        'memo states the three grounds are independently sufficient');
    ok(/Not GREEN:/i.test(M29) && /Not YELLOW:/i.test(M29),
        'both alternatives explicitly considered');
    // the ruling's mandated question about B->A must be answered
    ok(/ordering was actually the best decision\? YES|B → A ordering.{0,40}YES/i.test(F),
        'memo answers the mandated B→A question');
    ok(/not endorsing B-first because it was cheaper|not endorsing .{0,30}cheaper/i.test(F),
        'memo disclaims endorsing B-first for cheapness');
}

// ── G5. Object change traced, comparability not forced ──────────────────────
console.log('');
console.log('-- G5. scientific object -------------------------------------------------');
{
    // the routes the memo claims must exist in source
    ok(/const memoryMap = transitions\.get\(currentKey\)/.test(MAIN), 'transitions → generation');
    ok(/penalties\.get\(currentKey \+ "->" \+ k\) > 10/.test(MAIN), 'penalties → F1');
    ok(/getQ\(makeStateKey\(currentKey, goalNeuronId\), k\)/.test(MAIN), 'Q → F2');
    ok(/if \(globalThis\.__M7_GOAL__ != null\) goalNeuronId/.test(MAIN), 'goal override exists');
    ok(/interpretation \*\*B\*\*|measures a NEW scientific object/i.test(M29 + F),
        'memo selects interpretation B — a new object');
    ok(/must not be forced|not be forced/i.test(F), 'memo refuses to force comparability');
    ok(/oracle[^|]*\|[^|]*NO/i.test(M29) || /oracle.{0,40}NO/i.test(M29),
        'memo records the oracle as unchanged');
}

// ── G6. Required structure ──────────────────────────────────────────────────
console.log('');
console.log('-- G6. required structure ------------------------------------------------');
{
    for (let i = 1; i <= 10; i++)
        ok(new RegExp('\\*\\*' + i + '\\. ').test(M29), `PASS 2 attack ${i} present`);
    for (const a of ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
        ok(new RegExp('\\| \\*\\*' + a + '\\*\\* \\|').test(M29), `alternative ${a} adjudicated`);
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M29), `separation level: ${s}`);
    for (const f of ['hand-authored synthetic', 'copied real state',
                     'generated by actual experience', 'separate preparatory',
                     'modified after generation'])
        ok(new RegExp(f, 'i').test(M29), `synthetic/generated form assessed: ${f}`);
    ok(/M30 — Stochastic-Trajectory Robustness Formulation/.test(M29),
        'single highest-value next milestone named');
    ok(/Challenging my own HOLD/i.test(M29), 'self-falsification of the verdict present');
}

// ── G7. Preserved non-claims ────────────────────────────────────────────────
console.log('');
console.log('-- G7. preserved non-claims ----------------------------------------------');
{
    const BANNED = [
        ['agentSeed = initialisation', /agentSeed (?:is|=) (?:the )?initial(?:isation|ization)/i],
        ['trajectory robustness = mechanism', /trajectory robustness (?:is|=|establishes)[^.]{0,30}mechanism/i],
        ['more seeds = mechanism evidence', /more seeds (?:=|means|gives)[^.]{0,30}(?:mechanism|reusable)/i],
        ['generated baseline automatically legitimate', /generated baseline is (?:automatically )?legitimate/i],
        ['common baseline sufficient', /common baseline is (?:automatically )?sufficient/i],
        ['§5.4 broader than purpose', /§?5\.4 is broader than its stated purpose/i],
    ];
    for (const [l, re] of BANNED) {
        const bad = [];
        for (const b of M29.split(NL + NL)) {
            const fb = flat(b);
            if (/\bnot\b|never|must not|cannot|does not|forbid|retract|TOO STRONG|Preserved, not claimed/i.test(fb)) continue;
            const m = fb.match(re); if (m) bad.push(m[0]);
        }
        ok(bad.length === 0, `no forbidden claim: ${l}`, bad.join(' | ') || 'clean');
    }
    ok(/Preserved, not claimed/i.test(F), 'memo carries the explicit non-claim list');
    ok(/will not, at any .?N.?, distinguish a reusable cognitive mechanism/i.test(F),
        'standing boundary carried into the next milestone');
}

// ── G8. Governance ──────────────────────────────────────────────────────────
console.log('');
console.log('-- G8. governance --------------------------------------------------------');
{
    ok(/FORMULATION \+ SOURCE-BOUND ARCHITECTURAL \/ CAUSAL AUDIT ONLY/.test(M29),
        'declares audit-only');
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
}

// ── G9. Anti-vacuity ────────────────────────────────────────────────────────
console.log('');
console.log('-- G9. anti-vacuity ------------------------------------------------------');
{
    ok(M29.includes('# M29-HOLD'), 'verdict string present and mutable');
    ok(/ARMS = Object\.freeze/.test(PERM), 'G1 binds to source, not to the memo');
    const iSave = MAIN.indexOf('function saveBrain()');
    const save = MAIN.slice(iSave, MAIN.indexOf('function loadBrain()'));
    ok(save.includes('penalties') !== save.includes('timeMemory'),
        'G2 is a real asymmetry — one name present, the other absent');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M29 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'AUDIT VERIFIED' : 'AUDIT NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

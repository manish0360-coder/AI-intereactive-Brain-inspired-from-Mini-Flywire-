// M30 — TRAJECTORY ROBUSTNESS FORMULATION GATE.
//
// M30 makes four source claims and one decision claim. Each is checked against source or
// by execution, with a CONTROL wherever a passing check could otherwise be vacuous:
//
//   (1) the run fingerprint already contains RNG-consumption counts, so trajectory
//       duplication is detectable with existing instrumentation;
//   (2) C1 did NOT persist those counts — checked by scanning the committed C1 artifacts;
//   (3) the readout seed is independent of agentSeed, so M28's invariance carries;
//   (4) the registry misclassifies agentSeed as held-out — checked by EXECUTING the
//       registry predicates, not by reading them;
//   (5) the decision claim: C x R is justified by variance separation, not by elimination.
//
// No seed consumed, no configuration instantiated, the agent is never booted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M30 = fs.readFileSync(ROOT + 'research/preregistrations/M30_TRAJECTORY_ROBUSTNESS_FORMULATION.md', 'utf8');
const RUN = fs.readFileSync(ROOT + 'experiments/m7/run.js', 'utf8');
const UQBC = fs.readFileSync(ROOT + 'experiments/uqb/collect.js', 'utf8');
const C1RES = fs.readFileSync(ROOT + 'experiments/c1/results/c1_results.json', 'utf8');
const C1RAW = fs.readFileSync(ROOT + 'experiments/c1/data/readouts.jsonl', 'utf8');
const C1CAND = fs.readFileSync(ROOT + 'experiments/c1/data/candidates.jsonl', 'utf8');

const NL = String.fromCharCode(10);
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M30);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };

console.log('='.repeat(78));
console.log('  M30 TRAJECTORY ROBUSTNESS GATE');
console.log('='.repeat(78));

// ── G1. R is defined from source, and not called initialisation ─────────────
console.log('');
console.log('-- G1. R defined from source ---------------------------------------------');
{
    for (const [n, re] of [
        ['cognitive', /cognitive: input\.agentSeed >>> 0/],
        ['visual', /visual: \(input\.agentSeed \^ 0x9e3779b9\) >>> 0/],
        ['environment', /environment: \(input\.agentSeed \^ 0x5EED\) >>> 0/],
        ['sigma', /sigma: \(input\.agentSeed \^ 0xBEEF\) >>> 0/]])
        ok(re.test(RUN), `stream ${n} derives from agentSeed (source)`);
    ok(/env\.generateAccepted\(input\.configSeed, input\.configIndex\)/.test(RUN),
        'configSeed enters only via generateAccepted (source)');
    ok(/It is \*\*not\*\* agent initialisation/.test(M30) || /not agent initialisation/i.test(F),
        'memo refuses the initialisation label');
    // the banned equation must not appear as an assertion
    const bad = [];
    for (const b of M30.split(NL + NL)) {
        const fb = flat(b);
        if (/\bnot\b|never|Not claimed|must not|refuses/i.test(fb)) continue;
        if (/agentSeed (?:is|=) (?:the )?initial(?:isation|ization)/i.test(fb)) bad.push(fb.slice(0, 60));
    }
    ok(bad.length === 0, 'no assertion that agentSeed is initialisation', bad.join(' | ') || 'clean');
}

// ── G2. The fingerprint already carries RNG consumption ─────────────────────
console.log('');
console.log('-- G2. duplication is detectable today -----------------------------------');
{
    const iArt = RUN.indexOf('const artifacts = {');
    const art = RUN.slice(iArt, RUN.indexOf('const record = {'));
    ok(iArt > 0 && art.length > 100, 'artifacts block located', art.length + ' chars');
    ok(/cogDraws, visDraws/.test(art), 'artifacts CONTAINS cogDraws/visDraws (source)');
    ok(/record\.fingerprint = sha\(JSON\.stringify\(artifacts\)\);/.test(RUN),
        'the fingerprint hashes exactly that artifacts object (source)');
    ok(/function recoverCount\(streamName, seedForStream/.test(RUN),
        'recoverCount exists — exact stream-consumption recovery (source)');
    // CONTROL: the artifacts block must NOT contain something the memo does not claim,
    // so the extraction is real rather than matching the whole file
    ok(!/configSeed/.test(art), 'CONTROL: artifacts block is a real slice, not the whole file');
    ok(/no new instrumentation/i.test(F), 'memo states no new instrumentation is required');
    ok(/effective trajectory/i.test(F) && /trajectory fingerprint/i.test(F),
        'memo defines effective trajectory and fingerprint');
}

// ── G3. C1 did NOT persist the draw counts ──────────────────────────────────
console.log('');
console.log('-- G3. C1 persisted no draw counts ---------------------------------------');
{
    const anywhere = /cogDraws|visDraws/.test(C1RES) || /cogDraws|visDraws/.test(C1RAW)
                  || /cogDraws|visDraws/.test(C1CAND);
    ok(!anywhere, 'cogDraws/visDraws appear in NO committed C1 artifact');
    // CONTROL: the same scan must find a field C1 DID persist, or it proves nothing
    ok(/fingerprintArmed/.test(C1RAW),
        'CONTROL: the same scan finds fingerprintArmed, which C1 did persist');
    ok(/C1 persisted (?:neither|no)/i.test(F), 'memo states C1 did not persist them');
    ok(/must persist them per arm|must persist/i.test(F),
        'memo requires a future design to persist them');
    ok(/INFERENCE, not EVIDENCE|inference, not evidence/i.test(F),
        'memo marks arm draw-count divergence as inference, not evidence');
}

// ── G4. Pairing controls environment, not randomness ────────────────────────
console.log('');
console.log('-- G4. the pairing assumption --------------------------------------------');
{
    ok(/pairing controls the ENVIRONMENT, not the randomness/i.test(F),
        'memo states the pairing assumption explicitly');
    ok(/share a \*?\*?sequence\*?\*?, not the \*?\*?draws\*?\*?|same sequence.{0,40}different positions|different positions in the same sequence/i.test(M30 + F),
        'memo distinguishes shared sequence from shared draws');
    // the E1 evidence that grounds the divergence
    ok(/E1 ∈ \[10, ?19\]/.test(F), 'memo cites the E1 evidence');
    const e1 = JSON.parse(C1RAW.trim().split(NL)[0]).e1;
    ok(Number.isInteger(e1) && e1 >= 10, 'C1 E1 is genuinely >= 10 in the data', String(e1));
    ok(/never before stated|no prior milestone stated/i.test(F),
        'memo flags the assumption as previously unstated');
}

// ── G5. Readout independence — M28 carried, not widened ─────────────────────
console.log('');
console.log('-- G5. readout scope -----------------------------------------------------');
{
    ok(/readoutSeed = \(configSeed, arm, state\)/.test(UQBC)
        || /export const readoutSeed = \(configSeed, arm, state\)/.test(UQBC),
        'readoutSeed takes (configSeed, arm, state) — source');
    ok(!/agentSeed/.test(UQBC.slice(UQBC.indexOf('readoutSeed'), UQBC.indexOf('readoutSeed') + 300)),
        'readoutSeed does NOT derive from agentSeed (source)');
    ok(/independent of .?agentSeed/i.test(F), 'memo states the independence');
    ok(/scope is not widened|does \*\*not\*\* extend to multi-step|not extend to multi-step/i.test(M30 + F),
        'memo refuses to widen M28 beyond its established scope');
}

// ── G6. Registry namespace collision — checked by EXECUTION ─────────────────
console.log('');
console.log('-- G6. registry namespace collision --------------------------------------');
{
    const reg = await import('../../experiments/registry/consumed.js');
    const AGENT = 20260819000;
    ok(reg.isConsumed(AGENT) === false, 'isConsumed(agentSeed) === false (executed)');
    ok(reg.isHeldOut(AGENT) === true, 'isHeldOut(agentSeed) === TRUE — the collision (executed)');
    // CONTROL: the predicate is not trivially true for everything
    ok(reg.isHeldOut(895500) === false,
        'CONTROL: isHeldOut is false for a config-seed value — predicate is discriminating');
    // Count-sensitive: a single presence check passes when only one of several
    // occurrences is corrupted. Require the finding in the SECTION and in In-5.
    const nsCount = (M30.match(/namespace collision/gi) || []).length;
    const in5 = M30.split(NL).find(l => l.includes('**In-5.')) || '';
    ok(nsCount >= 3 && /namespace collision/i.test(in5),
        'namespace collision stated in the section AND in In-5',
        nsCount + ' occurrences; In-5 ' + (/namespace collision/i.test(in5) ? 'ok' : 'MISSING'));
    ok(/cannot govern .?R.? selection|cannot govern/i.test(F),
        'memo states the registry cannot govern R selection');
    ok(/have not modified the registry|BOTH remain open/i.test(F),
        'memo leaves the registry untouched and both defects open');
}

// ── G7. The decision claim — variance separation, not elimination ───────────
console.log('');
console.log('-- G7. the decision --------------------------------------------------------');
{
    // M30-R1: the claim is that the design makes apportionment ESTIMABLE, not that it
    // performs separation. Both halves are checked: the new claim present, old absent.
    ok(/yield data structured to permit|permit that apportionment to be estimated|become estimable/i.test(F),
        'memo claims the design ENABLES estimation, not that it separates');
    {   const bad = [];
        for (const b of M30.split(NL + NL)) {
            const fb = flat(b);
            if (/WORDING REPAIR|Too strong|repaired|does not itself perform/i.test(fb)) continue;
            if (/(?:design|C . R) (?:that )?(?:can )?(?:separates?|decomposes)/i.test(fb))
                bad.push(fb.slice(0, 70));
        }
        ok(bad.length === 0, 'no un-retracted claim that the design separates/decomposes',
            bad.join(' | ') || 'clean'); }
    ok(/this program has not adopted and M30 does not propose/i.test(F),
        'memo states the estimation model is neither adopted nor proposed');
    ok(/Design enables data collection; it does not constitute\s*estimation|enables data collection .{0,10}≠|Design enables data collection/i.test(M30),
        'memo states design-enables != model-estimates');
    ok(/M30-R1 — WORDING REPAIR APPLIED/.test(M30), 'M30-R1 forward note present');
    ok(/d16decb/.test(M30), 'note cites the commit holding the superseded wording');
    ok(/conflates between-configuration heterogeneity with within-configuration trajectory noise|conflates/i.test(F),
        'memo states what C1 structurally conflated');
    ok(/rationale of \*?\*?elimination\*?\*?|only axis left/i.test(M30 + F),
        'memo identifies the elimination rationale it is replacing');
    ok(/strengthening the proposal, not merely accepting it/i.test(F),
        'memo states it strengthens rather than accepts the Director rationale');
    // C1's actual numbers must back the conflation argument
    const r = JSON.parse(C1RES);
    ok(r.accounting.dispositions.ACCEPTED === 70, 'C1 had 70 accepted configurations (artifact)');
    ok(/SD 0\.127 ?\/ ?0\.109/.test(F) && /means of 0\.043 ?\/ ?0\.038/.test(F),
        'memo cites C1 spread and means');
    // C1 must NOT be reinterpreted or called invalid
    ok(/C1 is not (?:altered|reinterpreted)/i.test(F) && /was not invalid/i.test(F),
        'memo states C1 is neither reinterpreted nor invalidated');
}

// ── G8. Estimands compared, no inference restored, no threshold ─────────────
console.log('');
console.log('-- G8. estimands -----------------------------------------------------------');
{
    for (const c of ['finite-population', 'distribution', 'median', 'variance', 'Pr(Δ < 0)',
                     'conditional effects'])
        ok(M30.includes(c), `estimand candidate compared: ${c}`);
    ok(/No inferential statistics are restored/i.test(F), 'no inference restored');
    ok(/No p-value, test, interval or significance criterion is proposed/i.test(F),
        'no statistical criterion proposed');
    ok(/No number of seeds is proposed/i.test(F), 'no seed count proposed');
    ok(/needs its own freeze/i.test(F),
        'the new variance quantity is flagged as requiring its own freeze');
    ok(/must never be read as a probability/i.test(F),
        'the proportion candidate carries its M20 restriction');
}

// ── G9. Structure, ladder, verdict ──────────────────────────────────────────
console.log('');
console.log('-- G9. structure and verdict ---------------------------------------------');
{
    ok(/# M30-YELLOW/.test(M30), 'verdict is M30-YELLOW');
    ok(!/# M30-GREEN/.test(M30) && !/# M30-HOLD/.test(M30), 'exactly one verdict');
    ok(/Not GREEN:/i.test(M30) && /Not HOLD:/i.test(M30), 'both alternatives considered');
    for (const l of ['L0', 'L1', 'L2', 'L3'])
        ok(new RegExp('\\*\\*' + l + '\\*\\*').test(M30), `ladder level ${l} present`);
    ok(/L3 is not mechanism validation/i.test(F), 'L3 explicitly not mechanism validation');
    for (let i = 1; i <= 15; i++)
        ok(new RegExp('^\\| ' + i + ' \\|', 'm').test(M30), `adversarial case ${i} present`);
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M30), `separation level: ${s}`);
    ok(/M31 — Trajectory-Multiplicity Attainability Determination/.test(M30),
        'single highest-value next milestone named');
    ok(/attainability/i.test(F), 'attainability gate present');
    ok(/R5/.test(M30) && /carried forward unchanged|not silently removed/i.test(F),
        'R5 carried forward, not removed');
}

// ── G10. Forbidden conversions ──────────────────────────────────────────────
console.log('');
console.log('-- G10. forbidden conversions --------------------------------------------');
{
    const BANNED = [
        ['trajectory robustness -> mechanism', /trajectory robustness (?:is|=|establishes|validates|gives)[^.]{0,30}mechanism/i],
        ['seed variation -> initialisation', /seed variation (?:is|=)[^.]{0,30}initial/i],
        ['more observations -> generalisation', /more (?:observations|seeds|trajectories)[^.]{0,40}(?:stronger )?generali/i],
        ['L3 is mechanism validation', /L3 (?:is|constitutes|provides)[^.]{0,20}mechanism validation/i],
    ];
    for (const [l, re] of BANNED) {
        const bad = [];
        for (const b of M30.split(NL + NL)) {
            const fb = flat(b);
            if (/\bnot\b|never|must not|cannot|does not|forbid|Not claimed|at any N/i.test(fb)) continue;
            const m = fb.match(re); if (m) bad.push(m[0]);
        }
        ok(bad.length === 0, `no forbidden conversion: ${l}`, bad.join(' | ') || 'clean');
    }
    ok(/Not claimed:/i.test(M30), 'explicit non-claim list present');
}

// ── G11. Governance ─────────────────────────────────────────────────────────
console.log('');
console.log('-- G11. governance ---------------------------------------------------------');
{
    ok(/FORMULATION ONLY/.test(M30), 'declares formulation-only');
    ok(/the agent was never booted/i.test(F), 'agent never booted');
    ok(/No seed generated, selected or consumed/i.test(F), 'no seed consumed');
    const dirty = execSync('git status --porcelain main.js experiments/ instrumentation/ ' +
        'research/cognitive-audit/', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to source, experiments or cognitive-audit',
        dirty.length ? dirty.join(' | ') : 'clean');
    const crypto = await import('node:crypto');
    for (const f of ['research/cognitive-audit/M7_PREREGISTRATION',
                     'research/preregistrations/C1_PREREGISTRATION']) {
        const d = crypto.createHash('sha256').update(fs.readFileSync(ROOT + f + '.md')).digest('hex');
        ok(fs.readFileSync(ROOT + f + '.sha256', 'utf8').includes(d),
            `frozen digest verifies: ${path.basename(f)}`);
    }
}

// ── G12. Anti-vacuity ───────────────────────────────────────────────────────
console.log('');
console.log('-- G12. anti-vacuity -------------------------------------------------------');
{
    ok(M30.includes('# M30-YELLOW'), 'verdict string present and mutable');
    ok(/cogDraws, visDraws/.test(RUN) && !/cogDraws/.test(C1RAW),
        'G2/G3 form a real asymmetry: present in source, absent from C1 data');
    const reg = await import('../../experiments/registry/consumed.js');
    ok(reg.isHeldOut(20260819000) !== reg.isHeldOut(895500),
        'G6 is a real discrimination, not a constant');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M30 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

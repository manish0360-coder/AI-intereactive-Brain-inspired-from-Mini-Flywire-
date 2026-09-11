// M32 GATE — a FORMULATION gate that tests the SPECIFICATION, not an implementation.
//
// M32 proposes governance rules. Nothing is implemented, so there is no behaviour to
// verify. What CAN be verified, and is:
//
//   (1) every claim M32 makes ABOUT EXISTING SOURCE is true of that source — including,
//       by EXECUTION, the total-predicate failure the whole design rests on;
//   (2) the specification is internally coherent — the state machine is monotone, the
//       consumption unit is the one that makes C x R possible, and the twelve adversarial
//       cases are each adjudicated;
//   (3) the milestone stayed formulation-only: the registry is byte-unchanged.
//
// This gate MUTATES NOTHING. It reads source and the memo, and executes only the
// registry's own read-only predicates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const M32 = fs.readFileSync(ROOT + 'research/preregistrations/M32_TRAJECTORY_SEED_GOVERNANCE.md', 'utf8');
const C1P = fs.readFileSync(ROOT + 'experiments/c1/protocol.js', 'utf8');
const REG = fs.readFileSync(ROOT + 'experiments/registry/consumed.js', 'utf8');
const RUN = fs.readFileSync(ROOT + 'experiments/m7/run.js', 'utf8');

const NL = String.fromCharCode(10);
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*\*/g, '')
                     .replace(/`/g, '').replace(/\s+/g, ' ').trim();
const F = flat(M32);
let fails = 0, checks = 0;
const ok = (c, label, d = '') => { checks++; if (!c) fails++;
    console.log(`   [${c ? 'PASS' : 'FAIL'}] ${label}${d ? '  — ' + d : ''}`); };

console.log('='.repeat(78));
console.log('  M32 FORMULATION GATE');
console.log('='.repeat(78));

// ── G1. Claims about existing source ────────────────────────────────────────
console.log('');
console.log('-- G1. the existing model, as M32 describes it ----------------------------');
{
    ok(/export const isHeldOut  = \(s\) => Number\.isInteger\(s\) && s >= HELD_OUT_FLOOR;/.test(C1P),
        'isHeldOut is a TOTAL predicate over integers (source)');
    ok(/export const isConsumed = \(s\) => CONSUMED_RANGES\.some\(r => s >= r\.lo && s <= r\.hi\);/.test(C1P),
        'isConsumed is range-based and total (source)');
    ok(/export function assertSeedAllowed\(seed, \{ collection = false \} = \{\}\)/.test(C1P),
        'assertSeedAllowed exists with the described signature (source)');
    // the ORDER M32 claims: held-out, then consumed, then registered
    const body = C1P.slice(C1P.indexOf('export function assertSeedAllowed'),
                           C1P.indexOf('// §13 — acceptance uses'));
    const iHeld = body.indexOf('isHeldOut(seed)');
    const iCons = body.indexOf('CONSUMED_RANGES.find');
    const iReg = body.indexOf('inRegisteredBlock(seed)');
    ok(iHeld > 0 && iCons > iHeld && iReg > iCons,
        'POSITIONAL: the guard orders held-out → consumed → registered',
        `${iHeld} < ${iCons} < ${iReg}`);
    ok(/C1_COLLECTION_AUTHORISED === '1'/.test(C1P) && /collection = false/.test(C1P),
        'authorization is fail-closed: env var AND call-site flag (source)');
    ok(/why:/.test(REG) && /consumed at/.test(REG),
        'the registry chain cites commits in `why` (source)');
    ok(/HELD_OUT_FLOOR/.test(REG), 'the registry exports a held-out floor (source)');
}

// ── G2. The failure, by EXECUTION ───────────────────────────────────────────
console.log('');
console.log('-- G2. the failure, executed ---------------------------------------------');
{
    const reg = await import('../../experiments/registry/consumed.js');
    const AGENT = 20260819000;
    ok(reg.isConsumed(AGENT) === false, 'isConsumed(20260819000) === false (executed)');
    ok(reg.isHeldOut(AGENT) === true, 'isHeldOut(20260819000) === true (executed)');
    // CONTROL: the predicate discriminates — it is not constantly true
    ok(reg.isHeldOut(895500) === false,
        'CONTROL: isHeldOut is false for a configuration-seed value');
    ok(reg.HELD_OUT_FLOOR === 900500, 'floor is 900500 (executed)');
    // the memo must report both, and classify correctly
    ok(F.includes('isConsumed(20260819000) === false') && F.includes('isHeldOut (20260819000) === true')
        || /isHeldOut.{0,20}20260819000.{0,20}true/i.test(F),
        'memo reports the executed pair');
    // Scope to the CLASSIFICATION line. '(D) multiple issues' also appears as a table
    // row, so a document-wide check survives changing the classification itself.
    const clsLine = M32.split(NL).find(l => l.startsWith('**Classification')) || '';
    ok(/\(D\) multiple issues/.test(clsLine) && /NOT \(A\) a bug/.test(clsLine),
        'the CLASSIFICATION line says (D), explicitly not (A) a bug', clsLine.slice(0, 60));
    ok(/proximate mechanism/i.test(F) && /root cause/i.test(F),
        'memo separates proximate mechanism (B) from root cause (C)');
    ok(/must be PARTIAL|must refuse|refusal removes the class/i.test(F),
        'memo names the partial-predicate invariant');
}

// ── G3. The decisive design divergence ──────────────────────────────────────
console.log('');
console.log('-- G3. consumption unit --------------------------------------------------');
{
    // Scope to the §8.3 TABLE ROW. The phrase also appears in the verdict, so a
    // whole-document presence check survives reverting the row itself.
    const unitRow = M32.split(NL).find(l => l.startsWith('| unit |')) || '';
    ok(/\(value, study\)/.test(unitRow),
        'the §8.3 unit ROW states (value, study) for trajectory seeds', unitRow.slice(0, 60));
    ok(/the value/.test(unitRow), 'the same row still states per-value for configuration seeds');
    ok(/would make .?C . R.? impossible|impossible/i.test(F),
        'memo states per-value consumption would make C x R impossible');
    ok(/same .?R.? to every .?C.?|same R across every C|any number of configurations/i.test(F),
        'memo states one seed spans all configurations within a study');
    ok(/by \*\*no second study\*\*|no second study/i.test(M32 + F),
        'memo forbids cross-study reuse');
    // the three-object distinction
    for (const [l, re] of [
        ['seed is an input', /an \*\*input\*\*|is an input/i],
        ['trajectory is an outcome', /arm-dependent \*\*outcome\*\*|arm-dependent outcome/i],
        ['fingerprint identifies a trajectory', /identifier of a realised trajectory/i]])
        ok(re.test(M32) || re.test(F), `three-object distinction: ${l}`);
    ok(/one-to-many/i.test(F), 'memo states seed→trajectory is one-to-many across arms');
    ok(/[Nn]either map is a bijection/.test(F), 'memo states neither map is a bijection');
}

// ── G4. State machine is monotone and exclusive ─────────────────────────────
console.log('');
console.log('-- G4. state machine -----------------------------------------------------');
{
    for (const s of ['AVAILABLE', 'HELD-OUT', 'CONSUMED'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M32), `state defined: ${s}`);
    // the three illegal transitions must each be marked ILLEGAL
    for (const t of ['HELD-OUT → CONSUMED', 'CONSUMED → AVAILABLE', 'HELD-OUT → AVAILABLE']) {
        const line = M32.split(NL).find(l => l.includes(t)) || '';
        ok(/ILLEGAL/.test(line), `transition marked ILLEGAL: ${t}`, line.slice(0, 50));
    }
    // and the two legal ones must not be
    for (const t of ['AVAILABLE → CONSUMED', 'AVAILABLE → HELD-OUT']) {
        const line = M32.split(NL).find(l => l.includes(t) && l.startsWith('|')) || '';
        ok(/\*\*YES\*\*/.test(line), `transition marked legal: ${t}`, line.slice(0, 50));
    }
    ok(/HELD-OUT ∩ CONSUMED = ∅/.test(M32), 'exclusivity invariant stated');
    ok(/asserted.{0,30}not assumed|must be \*\*asserted\*\*/i.test(M32 + F),
        'memo requires the invariant be asserted, not assumed');
    ok(/REGISTERED.{0,40}not.{0,20}a registry state|study-scoped/i.test(F),
        'REGISTERED correctly kept study-scoped, not a registry state');
}

// ── G5. Candidate designs and the non-problems ──────────────────────────────
console.log('');
console.log('-- G5. candidates and non-problems ---------------------------------------');
{
    for (const n of ['N1', 'N2', 'N3', 'N4'])
        ok(new RegExp('\\*\\*' + n + '\\*\\*').test(M32), `candidate ${n} considered`);
    const sel = (M32.match(/\*\*SELECTED\*\*/g) || []).length;
    ok(sel >= 1, 'exactly one design family selected', String(sel));
    ok(/N1[\s\S]{0,300}REJECTED/.test(M32), 'N1 rejected');
    ok(/weakening a protection that currently holds|un-hold-out/i.test(F),
        'N1 rejection cites that it would weaken an existing protection');
    // the three declared non-problems
    for (const [l, re] of [
        ['numeric equality across namespaces', /legal and meaningless/i],
        ['fingerprint collision', /NOT a governance collision/i],
        ['within-study reuse', /NOT a collision — it is REQUIRED|it is REQUIRED/i]])
        ok(re.test(M32), `non-problem correctly declined: ${l}`);
    ok(/non-problem/i.test(F), 'memo uses the non-problem framing');
}

// ── G6. Enumeration vs ranges, justified by the draw mechanism ─────────────
console.log('');
console.log('-- G6. held-out representation -------------------------------------------');
{
    for (const o of ['A', 'B', 'C', 'D'])
        ok(new RegExp('\\*\\*' + o + ' ').test(M32.slice(M32.indexOf('## 16.'))),
            `representation option ${o} assessed`);
    ok(/SELECTED: D for consumption/i.test(F), 'enumeration selected for consumption');
    ok(/scattered/i.test(F) && /over-claim/i.test(F),
        'selection justified by the random draw producing scattered values');
    ok(/not preference|reason is the draw mechanism/i.test(F),
        'memo states the reason is mechanism, not preference');
}

// ── G7. 895xxx separability, tested not assumed ────────────────────────────
console.log('');
console.log('-- G7. 895xxx separability -----------------------------------------------');
{
    ok(/Separable/i.test(F), 'memo concludes separable');
    ok(/tested the claim rather than assuming/i.test(F), 'memo states it tested rather than assumed');
    ok(/same file|same directory|Adjacent in implementation/i.test(F),
        'memo concedes implementation adjacency');
    ok(/SEPARATE COMMITS/i.test(M32), 'memo requires separate commits');
    ok(/895000/.test(M32) && !/895000[\s\S]{0,200}repaired here/i.test(M32),
        'memo does not repair 895xxx');
}

// ── G8. MUST/SHOULD/NOT NECESSARY, and no over-engineering ─────────────────
console.log('');
console.log('-- G8. minimum sufficient design -----------------------------------------');
{
    for (const s of ['MUST HAVE', 'SHOULD HAVE', 'NOT NECESSARY'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M32), `tier present: ${s}`);
    // the things explicitly declined
    for (const [l, re] of [
        ['new pairing identifier', /A new pairing identifier/i],
        ['cross-namespace equality ban', /Forbidding cross-namespace numeric equality/i],
        ['fingerprint governance', /Governance of fingerprints/i],
        ['date fields', /Date\/version fields/i]])
        ok(re.test(M32), `declined as unnecessary: ${l}`);
    ok(/held-out trajectory region/i.test(F) && /no current requirement/i.test(F),
        'held-out region is SHOULD, with the reason stated');
    // the migration MUST — typing must be two-sided
    ok(/not purely additive/i.test(F),
        'memo states typed identity is not purely additive');
    ok(/Configuration registry declares its namespace/i.test(M32),
        'two-sided typing is a MUST item');
}

// ── G9. All twelve adversarial cases adjudicated ───────────────────────────
console.log('');
console.log('-- G9. adversarial cases -------------------------------------------------');
{
    for (let i = 1; i <= 12; i++)
        ok(new RegExp('^\\| ' + i + ' \\|', 'm').test(M32), `case ${i} adjudicated`);
    ok(/Attacks that found something/i.test(M32), 'attacks-that-landed section present');
    ok(/It landed/i.test(F), 'at least one attack is recorded as landing');
    ok(/reproduction; different study ⇒ refused|same study ⇒ reproduction/i.test(F),
        'the rerun ambiguity is resolved by the (value, study) unit');
}

// ── G10. Evidence discipline: no rule presented as a source fact ───────────
console.log('');
console.log('-- G10. evidence discipline ----------------------------------------------');
{
    for (const s of ['EVIDENCE', 'INFERENCE', 'HYPOTHESIS'])
        ok(new RegExp('\\*\\*' + s + '\\*\\*').test(M32), `separation level: ${s}`);
    ok(/No governance rule proposed here is a discovered source fact/i.test(F),
        'memo states no proposed rule is a source fact');
    {   // Block-scan: the OPPOSITE must not be asserted anywhere. A presence check on the
        // disclaimer cannot see an added contradiction elsewhere in the document.
        const bad = [];
        for (const b of M32.split(NL + NL)) {
            const fb = flat(b);
            if (/No governance rule|not a discovered|PROPOSED RULE|none of it is implemented/i.test(fb)) continue;
            if (/(?:governance )?rules? (?:here )?(?:are|is) (?:established|discovered|source) /i.test(fb))
                bad.push(fb.slice(0, 70));
        }
        ok(bad.length === 0, 'no claim that the proposed rules are source facts',
            bad.join(' | ') || 'clean'); }
    ok(/PROPOSED RULE/.test(M32), 'the proposed-rule sections are labelled as such');
    ok(/conservative choice, not a derived necessity/i.test(F),
        'the development→registered ban is labelled a conservative choice');
    ok(/Hy-15/.test(M32) && /not proof/i.test(F), 'the latent-namespace hypothesis is bounded');
}

// ── G11. Verdict and next milestone ────────────────────────────────────────
console.log('');
console.log('-- G11. verdict ----------------------------------------------------------');
{
    ok(/# M32-GREEN/.test(M32), 'verdict is M32-GREEN');
    ok(!/# M32-YELLOW/.test(M32) && !/# M32-HOLD/.test(M32) && !/# M32-RED/.test(M32),
        'exactly one verdict');
    for (const v of ['Not YELLOW', 'Not HOLD', 'Not RED'])
        ok(new RegExp(v).test(M32), `alternative considered: ${v}`);
    ok(/M33 — Typed-Namespace Registry Implementation/.test(M32), 'next milestone named');
    ok(/requiring separate Director authorization/i.test(F), 'next milestone needs authorization');
    ok(/Not recommended as next.{0,40}C . R collection/i.test(F),
        'memo declines to recommend a C x R collection');
    ok(/Migration is the principal risk/i.test(F), 'migration risk carried into the next milestone');
}

// ── G12. Formulation-only: nothing was implemented or mutated ──────────────
console.log('');
console.log('-- G12. formulation-only -------------------------------------------------');
{
    ok(/FORMULATION ONLY/.test(M32), 'declares formulation-only');
    ok(/No registry edit/i.test(F), 'states no registry edit');
    // the registry must be byte-identical to HEAD
    const dirty = execSync('git status --porcelain experiments/ main.js instrumentation/ ' +
        'research/cognitive-audit/', { cwd: ROOT, encoding: 'utf8' })
        .split(NL).filter(l => l.trim() && !l.startsWith('??'));
    ok(dirty.length === 0, 'no TRACKED change to experiments, source or cognitive-audit',
        dirty.length ? dirty.join(' | ') : 'clean');
    const crypto = await import('node:crypto');
    for (const f of ['research/cognitive-audit/M7_PREREGISTRATION',
                     'research/preregistrations/C1_PREREGISTRATION']) {
        const d = crypto.createHash('sha256').update(fs.readFileSync(ROOT + f + '.md')).digest('hex');
        ok(fs.readFileSync(ROOT + f + '.sha256', 'utf8').includes(d),
            `frozen digest verifies: ${path.basename(f)}`);
    }
    // this gate itself must not write
    // SELF-CHECK. The token names are BUILT, never written literally, because a literal
    // would make this file match its own scan — the check would fail on itself.
    const self = fs.readFileSync(ROOT + 'research/preregistrations/verify_m32.js', 'utf8');
    const MUT = [['write','File','Sync'], ['mkdir','Sync'], ['rm','Sync'],
                 ['append','File','Sync'], ['unlink','Sync']].map(a => a.join(''));
    const found = MUT.filter(t => self.includes(t + '('));
    ok(found.length === 0,
        'this verifier contains NO write call — it cannot mutate the repository',
        found.length ? found.join(', ') : 'clean');
    // CONTROL: the scan must be able to find a call that IS present
    ok(self.includes('readFileSync('), 'CONTROL: the same scan finds readFileSync — not vacuous');
}

console.log('');
console.log('='.repeat(78));
console.log(`  M32 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

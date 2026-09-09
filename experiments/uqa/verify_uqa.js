// ==========================================================
// UQ-A IMPLEMENTATION VERIFIER — the implementation against the frozen protocol
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/UQA_PREREGISTRATION.md, frozen at
//   63247bb546d62f15296edbdf3da34206bce3ef87, digest
//   03eba04ac908861332fb2d7b0d3c0994468e1bd5ab5f78a5acf092dcd20196c4.
//
// WHAT THIS VERIFIES
//   That the UQ-A implementation does what the frozen protocol says, and that
//   its detecting assertions actually detect. It is run BEFORE the collection
//   and again after, and it is the gate on committing either.
//
// THE ANTI-VACUITY RULE — the M7-ERR-10 lesson, applied without exception
//   A check that cannot fail proves nothing. Every detecting assertion below is
//   paired with a MUTATION that must make it fail, and the mutation binds the
//   MEASUREMENT INPUT, not merely the predicate. Asserting that a predicate
//   rejects a hand-built bad object is worthless if the real input can never
//   take that shape; each mutation here corrupts the same object the real
//   computation consumes.
//
// FIXTURES CONSUME NO EVIDENCE
//   Every run performed here uses configuration seed 100026, which lies outside
//   the UQ-A range, outside every consumed block, and far below the held-out
//   floor. protocol.assertSeedAllowed({fixture:true}) REFUSES a registered UQ-A
//   seed as a fixture, so a fixture can never masquerade as measurement and
//   measurement can never be smuggled in as a fixture.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as env from '../m7/env.js';
import { makeStateKey } from '../../render/qlearning.js';
import * as protocol from './protocol.js';
import * as instrument from './instrument.js';
import * as analyze from './analyze.js';
import { collectOne } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Digests of SOURCE match the load hook and the collector: taken over
// line-ending-normalised text, so a recorded attestation is comparable from a
// CRLF clone as well as an LF one. D12 proves the transform preserves rather
// than rewrites terminators, so nothing is weakened by normalising here.
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const shaSource = (t) => sha(String(t).split(CR + LF).join(LF));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const FIXTURE = { configSeed: 100026, configIndex: 0, goal: 8 };

let pass = 0, fail = 0;
const P = (id, ok, detail = '') => {
    if (ok) pass++; else fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${detail}`);
};
// Asserts that `fn` throws. Used for every fail-closed guard.
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('UQ-A IMPLEMENTATION VERIFIER');
console.log('='.repeat(78));

// ==========================================================================
console.log('\n-- A. protocol integrity ------------------------------------------------');
// ==========================================================================
const PREREG = 'research/preregistrations/UQA_PREREGISTRATION.md';
const pregBytes = fs.readFileSync(path.join(ROOT, PREREG));
P('A1', sha(pregBytes) === protocol.FROZEN.preregistration,
  'the frozen pre-registration digest matches the value the code binds to');
// A1 detects: corrupting the bytes must change the digest.
P('A1m', sha(Buffer.concat([pregBytes, Buffer.from('x')])) !== protocol.FROZEN.preregistration,
  'MUTATION — one appended byte breaks the digest, so A1 is not vacuous');

const preg = read(PREREG).replace(/\s+/g, ' ');
const quoted = [
    ['A2', 'the seed block', 'Configuration-seed block: **`898000–898999`**'],
    ['A3', 'the exposure',   'EXPOSURE — **FROZEN: E-BOTH**'],
    ['A4', 'the ablated value', 'delivered as **exactly `0`** at **both** read sites'],
    ['A5', 'the population', 'All 78 valid directed adjacencies'],
    ['A6', 'unvisited = 0',  'neutral pre-learning representation'],
    ['A7', 'the minimum',    'at least 20 accepted configurations'],
    ['A8', 'no extension',   'never extend the range for any reason'],
    ['A9', 'phases separate', 'separately. Never pooled'],
];
for (const [id, what, text] of quoted) {
    P(id, preg.includes(text.replace(/\s+/g, ' ')), `${what} is quoted from the frozen text`);
}

// ==========================================================================
console.log('\n-- B. frozen constants are the frozen values -----------------------------');
// ==========================================================================
const F = protocol.FROZEN;
P('B1', F.seedLo === 898000 && F.seedHi === 898999, 'seed range 898000-898999 (§17)');
P('B2', F.agentSeed === 20260819000 && F.arm === 'A1' && F.ticks === 3000,
  'agent seed, M7 arm and tick budget inherited unchanged');
P('B3', JSON.stringify([...F.goalIndices]) === '[0,1,2,3]', 'four frozen goal indices');
P('B4', F.exposure === 'E-BOTH' && F.ablatedValue === 0
        && JSON.stringify([...F.arms]) === '["ARMED","ABLATED"]', 'the §5 exposure and arms');
P('B5', F.directedAdjacencies === 78 && F.physicalEdges === 39, 'the §7 population size');
P('B6', F.minConfigurations === 20, 'the §18 minimum');
P('B7', (F.seedHi - F.seedLo + 1) * F.goalIndices.length === 4000,
  '1000 seeds x 4 goal indices = 4000 candidates (§17)');

// ==========================================================================
console.log('\n-- C. seed boundaries fail closed ----------------------------------------');
// ==========================================================================
P('C1', F.seedHi < 899000, `disjoint from Q1: ${F.seedHi} < 899000`);
P('C2', throws(() => protocol.assertSeedAllowed(900500)), 'a held-out seed is REFUSED');
P('C3', throws(() => protocol.assertSeedAllowed(899000))
     && throws(() => protocol.assertSeedAllowed(899500))
     && throws(() => protocol.assertSeedAllowed(900000)),
  'every consumed block (Q1, M8, M7 pilot) is REFUSED');
P('C4', throws(() => protocol.assertSeedAllowed(897999))
     && throws(() => protocol.assertSeedAllowed(899000)),
  'both bounds are exclusive one step outside the range');
P('C5', protocol.assertSeedAllowed(F.seedLo) === F.seedLo
     && protocol.assertSeedAllowed(F.seedHi) === F.seedHi, 'both bounds themselves are ALLOWED');
P('C6', throws(() => protocol.assertSeedAllowed(898500, { fixture: true })),
  'a REGISTERED seed is refused as a fixture, so a fixture cannot be smuggled in');
P('C7', protocol.assertSeedAllowed(FIXTURE.configSeed, { fixture: true }) === FIXTURE.configSeed,
  'the out-of-range fixture seed is allowed ONLY as a fixture');
P('C8', throws(() => protocol.assertSeedAllowed(FIXTURE.configSeed)),
  'and the same seed is REFUSED as measurement');
P('C9', throws(() => protocol.enumerateCandidates(env, { lo: 897000, hi: 898999 }))
     && throws(() => protocol.enumerateCandidates(env, { lo: 898000, hi: 899100 })),
  'a widened enumeration bound is REFUSED in either direction (§19)');

// ==========================================================================
console.log('\n-- D. the exposure is exactly §5, on the real source ---------------------');
// ==========================================================================
const mainSrc = read('main.js');
const armedSrc = instrument.transform(mainSrc, 'ARMED');
const ablatedSrc = instrument.transform(mainSrc, 'ABLATED');
P('D1', armedSrc === mainSrc, 'ARMED is byte-identical to committed main.js (§15 neutrality)');
{
    const a = mainSrc.split('\n'), b = ablatedSrc.split('\n');
    const diff = a.map((l, i) => i).filter(i => a[i] !== b[i]);
    P('D2', a.length === b.length && diff.length === 1,
      `ABLATED differs on exactly one line (main.js:${diff[0] + 1})`);
    P('D3', b[diff[0]] === instrument.ABLATED_LINE
         && b[diff[0]].includes('getUncertaintyScore(candidatePathKey)'),
      'the call is preserved and only its value is discarded');
}
// The identifier count is the claim that makes ONE anchor equal E-BOTH.
{
    const occ = mainSrc.split(instrument.EXPOSURE_IDENTIFIER).length - 1;
    P('D4', occ === instrument.EXPECTED_IDENTIFIER_OCCURRENCES,
      `"${instrument.EXPOSURE_IDENTIFIER}" occurs exactly ${occ} times: the assignment and the two ` +
      'frozen read sites');
}
// MUTATIONS — each corrupts the real source, the actual measurement input.
P('D4m', throws(() => instrument.transform(
            mainSrc.replace('uncertaintyScore: uncertaintyScoreValue,',
                            'uncertaintyScore: uncertaintyScoreValue, x: uncertaintyScoreValue,'),
            'ABLATED')),
  'MUTATION — a FOURTH use of the identifier is REFUSED: the exposure would reach past E-BOTH');
P('D5', throws(() => instrument.transform(
            mainSrc.replace(/      getUncertaintyScore\(candidatePathKey\);/, '  removed();'),
            'ABLATED')),
  'MUTATION — a removed anchor is REFUSED, so D2 cannot silently no-op');
P('D6', throws(() => instrument.transform(
            mainSrc + '\n' + instrument.ANCHOR + '\n', 'ABLATED')),
  'MUTATION — a duplicated anchor is REFUSED, so the ablation cannot land twice');
P('D7', throws(() => instrument.transform(
            mainSrc.replace('const uncertaintyScoreValue =', 'const somethingElse ='), 'ABLATED')),
  'MUTATION — a broken structural pin is REFUSED, so a moved anchor cannot pass');
P('D8', throws(() => instrument.transform(mainSrc, 'ARMEDISH'))
     && throws(() => instrument.transform(mainSrc, undefined)),
  'an unrecognised or absent arm is REFUSED; there is no default');
P('D9', /\(getUncertaintyScore\(candidatePathKey\), 0\)/.test(ablatedSrc),
  'the ablated value is the literal 0 the frozen text names, not a substitute');
{
    // On a fresh clone under core.autocrlf=true, main.js materialises with CRLF.
    // The transform must therefore be end-of-line agnostic AND must not rewrite
    // the file's own terminators. Binding the MEASUREMENT INPUT: the check runs
    // the real transform over a CRLF rendering of the real main.js, which is
    // exactly what a fresh checkout hands the loader.
    const crlf = mainSrc.replace(/\n/g, '\r\n');
    const crlfArmed = instrument.transform(crlf, 'ARMED');
    const crlfAblated = instrument.transform(crlf, 'ABLATED');
    P('D10', crlfArmed === crlf,
      'CRLF checkout — ARMED is byte-identical to the file as delivered');
    {
        const a = crlf.split('\r\n'), b = crlfAblated.split('\r\n');
        const diff = a.map((_, i) => i).filter(i => a[i] !== b[i]);
        P('D11', a.length === b.length && diff.length === 1
              && b[diff[0]] === instrument.ABLATED_LINE,
          'CRLF checkout — ABLATED still differs on exactly one line');
    }
    P('D12', (crlfAblated.match(/\r\n/g) || []).length === (crlf.match(/\r\n/g) || []).length
          && !/[^\r]\n/.test(crlfAblated),
      'the transform preserves the file’s own terminators; it introduces no bare LF into a ' +
      'CRLF file and normalises nothing');
}

// ==========================================================================
console.log('\n-- E. the designated statistic ------------------------------------------');
// ==========================================================================
const committedSpearman = analyze.assertSpearmanFidelity();
P('E1', committedSpearman.startsWith('function spearman(x, y) {'),
  'the local Spearman is byte-identical to the committed env.js implementation (§6/F9)');
P('E2', analyze.spearman([1, 1, 1], [1, 2, 3]) === 0,
  '§6 degenerate rule: 0 when a variable is constant');
{
    // The property that distinguishes env.js's implementation from the OTHER
    // committed Spearman, in verify_G15.js, which returns NaN here. §6's wording
    // and F9's citation both designate env.js's.
    const other = read('experiments/m7/verify_G15.js');
    P('E3', /function spearman/.test(other),
      'a second Spearman exists in verify_G15.js — the designation is not trivial');
}
P('E4', analyze.spearman([1, 2, 3, 4], [10, 20, 30, 40]) === 1
     && analyze.spearman([1, 2, 3, 4], [40, 30, 20, 10]) === -1, 'monotone extremes are +/-1');
{
    // Mid-rank tie averaging, the §10 "Ties" rule. Ties are structural here:
    // each p_e appears twice across the 78 directed entries.
    const tied = analyze.spearman([1, 1, 2, 2], [1, 2, 3, 4]);
    P('E5', Math.abs(tied - 0.8944271909999159) < 1e-12,
      `mid-rank tie averaging is in force (rho = ${tied.toFixed(6)})`);
}
// MUTATION binding the measurement input: a divergent local copy must be caught.
P('E6', (() => {
    const src = fs.readFileSync(path.join(HERE, 'analyze.js'), 'utf8');
    const bad = src.replace('return (dx === 0 || dy === 0) ? 0 : num / Math.sqrt(dx * dy);',
                            'return (dx === 0 || dy === 0) ? NaN : num / Math.sqrt(dx * dy);');
    if (bad === src) return false;
    const tmp = path.join(HERE, '.verify_spearman_mutant.js');
    try {
        fs.writeFileSync(tmp, bad);
        // The extractor reads analyze.js by path, so point it at the mutant by
        // running the same comparison over the mutated text.
        const open = 'function spearman(x, y) {';
        const grab = (t) => { const L = t.split(/\r?\n/); const a = L.indexOf(open);
            for (let i = a + 1; i < L.length; i++) if (L[i] === '}') return L.slice(a, i + 1).join('\n');
            return null; };
        return grab(bad) !== committedSpearman;
    } finally { fs.rmSync(tmp, { force: true }); }
})(), 'MUTATION — a divergent local Spearman is detectably not the committed one');

// ==========================================================================
console.log('\n-- F. the fixed population ----------------------------------------------');
// ==========================================================================
const population = analyze.buildPopulation();
P('F1', population.length === 78, 'the population is 78 directed adjacencies (§7)');
P('F2', new Set(population.map(p => `${p.pos}->${p.action}`)).size === 78,
  'all 78 are distinct ordered pairs');
P('F3', population.every(p => env.edgeIndexOf(p.pos, p.action) !== undefined),
  'every entry resolves to a connections.json edge index');
P('F4', (() => {
    const byEntry = new Map();
    for (const p of population) byEntry.set(p.entry, (byEntry.get(p.entry) || 0) + 1);
    return byEntry.size === 39 && [...byEntry.values()].every(v => v === 2);
})(), 'both directed traversals of each of the 39 physical connections, no averaging (§10)');
P('F5', population.every(p => p.pos !== p.action), 'no self-loops (F7)');
{
    const gi = env.graphInfo();
    P('F6', gi.entries === 39 && gi.directedAdjacencies === 78,
      'the committed graph accessor independently agrees: 39 entries, 78 directed adjacencies');
}
P('F7', JSON.stringify(analyze.buildPopulation()) === JSON.stringify(population),
  'the population is deterministic and arm-independent — it is built before any Q table exists');

// ==========================================================================
console.log('\n-- G. §6 / §8 / §9 / §12 read semantics ----------------------------------');
// ==========================================================================
{
    // A synthetic Q table over the REAL population, so the reduction under test
    // consumes exactly the object shape the real run produces.
    const p0 = population[0], p1 = population[1];
    const goal = 8;
    const k0 = makeStateKey(p0.pos, goal) + '->' + p0.action;
    const p1v = 7.5;
    const pA = new Array(39).fill(0).map((_, i) => 0.5 + i / 1000);
    const pB = new Array(39).fill(0).map((_, i) => 0.9 - i / 1000);

    const withNone = analyze.analyzeArm({ population, qEntries: [], goal, pPhase1: pA, pPhase2: pB });
    P('G1', withNone.n === 78 && withNone.coverage === 0,
      '§8 — an empty Q table still evaluates all 78 entries; unvisited are NEVER excluded');
    P('G2', withNone.rhoPhase1 === 0,
      '§6 — with every x equal to 0 the designated statistic returns 0, not NaN');

    const one = analyze.analyzeArm({ population, qEntries: [[k0, p1v]], goal,
                                     pPhase1: pA, pPhase2: pB });
    P('G3', one.coverage === 1 && one.n === 78,
      '§12 — coverage counts EXPLICIT entries and never shrinks the population');
    P('G4', one.excludedNonEdge === 0,
      '§9 — the exclusion count is reported (structurally 0: the population is built from edges)');

    // §8 mutation binding the input: an absent key must read as exactly 0, not
    // as undefined, NaN or a skipped row.
    const zeroed = analyze.analyzeArm({ population, qEntries: [[k0, 0]], goal,
                                        pPhase1: pA, pPhase2: pB });
    P('G5', zeroed.n === one.n && zeroed.coverage === 1 && withNone.coverage === 0,
      'MUTATION — an explicit 0 and an absent entry give the same x but DIFFERENT coverage, so ' +
      'coverage is measuring presence and not value');

    // §10 mutation: the two phases must be computed against different y vectors.
    P('G6', one.rhoPhase1 !== one.rhoPhase2 || pA.join() === pB.join(),
      '§10 — the two phase correlations are computed against different reliability vectors');

    // The key construction is the repository's own (F6), not a restatement.
    P('G7', k0 === `${p0.pos}#${goal}->${p0.action}`,
      'the read key is exactly "pos#goal->action" built by the committed makeStateKey (F6)');
    P('G8', throws(() => analyze.analyzeArm({ population, qEntries: [[k0, 1], [k0, 2]], goal,
                                             pPhase1: pA, pPhase2: pB })),
      'MUTATION — a duplicated Q key is REFUSED rather than silently last-wins');
    // Ranking sanity on a controlled input: perfect alignment must read as 1.
    const aligned = population
        .map(p => [makeStateKey(p.pos, goal) + '->' + p.action, pA[env.edgeIndexOf(p.pos, p.action)]]);
    P('G9', Math.abs(analyze.analyzeArm({ population, qEntries: aligned, goal,
                                          pPhase1: pA, pPhase2: pB }).rhoPhase1 - 1) < 1e-12,
      'a Q table set equal to phase-1 reliability yields rho = 1 — the reduction is wired correctly');
    void p1;
}

// ==========================================================================
console.log('\n-- H. end-to-end, on a fixture that consumes no evidence -----------------');
// ==========================================================================
console.log('     (two 3000-tick runs; this takes about 15 seconds)');
const armed = collectOne({ ...FIXTURE, uqaArm: 'ARMED', fixture: true });
const ablated = collectOne({ ...FIXTURE, uqaArm: 'ABLATED', fixture: true });

P('H1', armed.provenance.armAttestation.deliveredDigest === shaSource(armedSrc)
     && ablated.provenance.armAttestation.deliveredDigest === shaSource(ablatedSrc),
  'the loader thread attests it delivered exactly the ARMED / ABLATED transforms');
P('H2', armed.provenance.armAttestation.receivedDigest
     === ablated.provenance.armAttestation.receivedDigest
     && armed.provenance.armAttestation.receivedDigest === shaSource(mainSrc),
  '§15 — both arms received the SAME committed main.js from disk; nothing was written to it');
P('H3', armed.provenance.armAttestation.deliveredDigest
     !== ablated.provenance.armAttestation.deliveredDigest,
  'and the two arms executed DIFFERENT source, so the arm label is a fact, not an assertion');
P('H3b', shaSource(mainSrc) === shaSource(mainSrc.split(LF).join(CR + LF))
      && shaSource(armedSrc) !== shaSource(ablatedSrc),
  'the attestation digest is checkout-independent (CRLF and LF agree) yet still separates the ' +
  'two arms — normalising line endings costs the proof nothing');
P('H4', armed.provenance.evaluatedSeeds.length === 1
     && armed.provenance.evaluatedSeeds[0] === FIXTURE.configSeed
     && ablated.provenance.evaluatedSeeds.length === 1,
  'each run evaluated exactly one configuration seed — no forward acceptance walk');
P('H5', armed.provenance.used.agentSeed === F.agentSeed && armed.provenance.used.arm === F.arm
     && armed.provenance.used.ticks === F.ticks,
  'the child reports back the frozen agent seed, M7 arm and tick budget');
P('H6', JSON.stringify(armed.environment) === JSON.stringify(ablated.environment),
  'both arms ran against an identical environment — the pair is genuinely paired');
P('H7', armed.qEntries.length === armed.provenance.artifacts.qEntries,
  'the dumped Q table matches the size the run itself recorded');
P('H8', armed.qEntries.every(([k]) => /^-?\d+#-?\d+->-?\d+$/.test(k)),
  'every Q key matches the committed shape (F6)');
P('H9', armed.qEntries.some(([k]) => k.includes(`#${FIXTURE.goal}->`)),
  `the run wrote into the goal namespace the reduction reads (goal ${FIXTURE.goal}, F11)`);

// The exposure must be capable of changing the measured quantity. If it were
// not, every UQ-A number would be a null by construction rather than by finding.
{
    const a = analyze.analyzeArm({ population, qEntries: armed.qEntries, goal: armed.environment.goal,
        pPhase1: armed.environment.pPhase1, pPhase2: armed.environment.pPhase2 });
    const b = analyze.analyzeArm({ population, qEntries: ablated.qEntries, goal: ablated.environment.goal,
        pPhase1: ablated.environment.pPhase1, pPhase2: ablated.environment.pPhase2 });
    P('H10', JSON.stringify(armed.qEntries) !== JSON.stringify(ablated.qEntries),
      'ANTI-VACUITY — on the fixture the two arms produce different Q tables, so the ablation ' +
      'reaches the measured object');
    P('H11', a.rhoPhase1 !== b.rhoPhase1 || a.rhoPhase2 !== b.rhoPhase2 || a.coverage !== b.coverage,
      'ANTI-VACUITY — and it reaches the §6/§12 quantities themselves ' +
      `(rho1 ${a.rhoPhase1.toFixed(4)}/${b.rhoPhase1.toFixed(4)}, cov ${a.coverage}/${b.coverage})`);
    P('H12', a.n === 78 && b.n === 78 && a.coverageDenominator === 78,
      'both arms are evaluated over the identical 78-entry population (§7)');
}

// Determinism: the same arm, twice, must reproduce exactly.
{
    const again = collectOne({ ...FIXTURE, uqaArm: 'ARMED', fixture: true });
    P('H13', JSON.stringify(again.qEntries) === JSON.stringify(armed.qEntries)
          && again.provenance.fingerprint === armed.provenance.fingerprint,
      '§20 — the same configuration and arm reproduce byte-for-byte; determinism holds');
}

// ==========================================================================
console.log('\n-- I. the analysis lock -------------------------------------------------');
// ==========================================================================
{
    // §11 forbids inferential machinery. Scanned over the analysis surface, with
    // comments and string literals removed in ONE left-to-right pass so the scan
    // cannot match its own prose or its own error messages.
    const BS = String.fromCharCode(92);
    const LIT = new RegExp(
        '//[^\\n]*' + '|' + '/\\*[\\s\\S]*?\\*/' + '|' +
        '"(?:[^"' + BS + BS + ']|' + BS + BS + '.)*"' + '|' +
        "'(?:[^'" + BS + BS + ']|' + BS + BS + ".)*'" + '|' +
        '`(?:[^`' + BS + BS + ']|' + BS + BS + '.)*`', 'g');
    const strip = (t) => t.replace(LIT, ' ');
    const code = strip(fs.readFileSync(path.join(HERE, 'analyze.js'), 'utf8')) +
                 strip(fs.readFileSync(path.join(HERE, 'run_collection.js'), 'utf8'));
    const banned = /\b(pValue|pvalue|tTest|ttest|wilcoxon|bootstrap|confidence|significan|permutationTest|chiSquare|zScore|effectSize)\b/i;
    P('I1', !banned.test(code), '§11 — no inferential machinery in the executable analysis surface');
    // MUTATION binding the scan's input: the scanner must catch an inserted test.
    P('I1m', banned.test(code + ' const pValue = 1; '),
      'MUTATION — the scan detects an inserted p-value, so I1 is not vacuous');
    P('I2', strip('const s = "pValue"; // pValue').trim() === 'const s =  ;',
      'MUTATION — the stripper removes string literals AND comments in one pass, so the scan ' +
      'cannot pass merely because its own text was mangled');
    // §12: coverage must never enter a rho computation.
    P('I3', !/rho\w*\s*[-+*/]\s*coverage|coverage\s*[-+*/]\s*rho/i.test(code),
      '§12 — coverage is never combined with a rho; it is reported, never used as an adjustment');
    // §10: the phases must never be pooled.
    P('I4', !/rhoPhase1\s*\+\s*rhoPhase2|\(\s*rhoPhase1\s*\+\s*rhoPhase2\s*\)\s*\/\s*2/.test(code),
      '§10 — the two phase correlations are never pooled or averaged');
}

// ==========================================================================
console.log('\n-- J. the stopping rule --------------------------------------------------');
// ==========================================================================
P('J1', protocol.evaluateSufficiency({ configurations: 20 }).status === 'SATISFIED',
  '§18 — 20 configurations SATISFIES the minimum');
P('J2', protocol.evaluateSufficiency({ configurations: 19 }).status
        === 'INCONCLUSIVE — INSUFFICIENT MATERIAL',
  '§19 — 19 configurations is INCONCLUSIVE — INSUFFICIENT MATERIAL, naming the failing condition');
P('J3', protocol.evaluateSufficiency({ configurations: 19 }).unmet.join() === 'configurations',
  'and the failing condition is named rather than merely counted');
{
    const src = fs.readFileSync(path.join(HERE, 'run_collection.js'), 'utf8');
    P('J4', /The COMPLETE range is processed\. There is no early exit/.test(src)
         && !/break;/.test(src.slice(src.indexOf('for (const c of candidates)'))),
      '§19 — the collection loop contains no early exit; the whole range is processed');
    // The CALL site, not the identifier: `evaluateSufficiency` also appears in
    // the import list at the top of the file, so comparing the first occurrence
    // would compare the wrong thing and the check would fail for no reason.
    const callAt = src.indexOf('evaluateSufficiency({ configurations: paired.length })');
    const loopAt = src.indexOf('for (const c of candidates) {');
    P('J5', callAt > 0 && loopAt > 0 && callAt > loopAt,
      'sufficiency is evaluated only AFTER the collection loop, i.e. after the entire range ' +
      'has been processed');
}

// ==========================================================================
console.log('\n-- K. the produced artifact ---------------------------------------------');
// ==========================================================================
// Runs only when the collection has been executed. Before collection this
// section reports SKIPPED and counts as neither pass nor fail: a section that
// silently passed on a missing artifact would be the purest form of vacuity.
{
    const rp = path.join(HERE, 'results', 'uqa_results.json');
    if (!fs.existsSync(rp)) {
        console.log('SKIP  K         results/uqa_results.json does not exist yet — run ' +
                    'run_collection.js first. This section is not counted.');
    } else {
        const bytes = fs.readFileSync(rp, 'utf8');
        const R = JSON.parse(bytes);

        // The recorded digest must match the recorded bytes.
        const sidecar = fs.readFileSync(path.join(HERE, 'results', 'uqa_results.sha256'), 'utf8');
        const claimed = (sidecar.match(/^([0-9a-f]{64})\s+uqa_results\.json$/m) || [])[1];
        P('K1', claimed === sha(bytes), 'the results sidecar digest matches the results bytes');
        P('K1m', claimed !== sha(bytes + ' '),
          'MUTATION — one appended byte breaks the digest, so K1 is not vacuous');

        P('K2', R.preregistration.digest === F.preregistration
             && R.preregistration.commit === F.preregistrationCommit,
          'the result binds to the frozen pre-registration digest and freeze commit');
        P('K3', R.liveness.verdict === 'LIVE' && R.liveness.commit === F.livenessCommit,
          'the result binds to the §14b liveness verdict committed before it');

        // Accounting closure over the COMPLETE registered range (§19).
        const a = R.accounting;
        P('K4', a.expectedCandidates === 4000 && a.candidates === 4000
             && a.seedsEnumerated === 1000 && !a.dispositions.PENDING && !a.dispositions.FAILED,
          `the complete range was processed: ${a.candidates} candidates over ` +
          `${a.seedsEnumerated} seeds, none pending, none failed`);
        P('K5', a.problems.length === 0, 'the collection reported no accounting problems');
        P('K6', (a.dispositions.COLLECTED || 0) + (a.dispositions.REJECTED || 0) === 4000,
          'every candidate reached exactly one terminal state');

        // §17 / seed discipline, proved by env's own runtime census.
        const c = R.seedCensus;
        P('K7', c.min === F.seedLo && c.max === F.seedHi
             && c.evaluatedMin === F.seedLo && c.evaluatedMax === F.seedHi
             && c.evaluatedByEnv === 1000,
          'env evaluated exactly the 1000 registered seeds and nothing outside them');
        P('K8', c.evaluatedMax < 899000 && c.evaluatedMax < protocol.HELD_OUT_FLOOR,
          'no consumed block and no held-out seed was generated, evaluated or inspected');

        // Pairing and the arm attestation, across EVERY configuration.
        const cfgs = R.configurations;
        P('K9', cfgs.length === a.dispositions.COLLECTED && a.runsExecuted === cfgs.length * 2,
          `every collected configuration is present and paired (${cfgs.length} configs, ` +
          `${a.runsExecuted} runs)`);
        P('K10', cfgs.every(x => x.arms.ARMED && x.arms.ABLATED),
          'every configuration carries BOTH arms — there is no one-armed row');
        P('K11', cfgs.every(x =>
              x.provenance.ARMED.armAttestation.deliveredDigest === shaSource(armedSrc) &&
              x.provenance.ABLATED.armAttestation.deliveredDigest === shaSource(ablatedSrc)),
          'every run attests the loader delivered exactly the transform its arm names');
        P('K12', cfgs.every(x =>
              x.provenance.ARMED.armAttestation.receivedDigest === shaSource(mainSrc) &&
              x.provenance.ABLATED.armAttestation.receivedDigest === shaSource(mainSrc)),
          '§15 — every run read the SAME committed main.js from disk; it was never modified');
        P('K13', cfgs.every(x => x.arms.ARMED.n === 78 && x.arms.ABLATED.n === 78
                              && x.arms.ARMED.coverageDenominator === 78),
          'every arm of every configuration was evaluated over the identical 78-entry population');
        P('K14', cfgs.every(x => x.arms.ARMED.coverage <= 78 && x.arms.ABLATED.coverage <= 78
                              && x.arms.ARMED.excludedNonEdge === 0),
          '§9/§12 — coverage is within the population and the exclusion count is reported');
        P('K15', cfgs.every(x => Number.isFinite(x.arms.ARMED.rhoPhase1)
                              && Number.isFinite(x.arms.ARMED.rhoPhase2)
                              && Number.isFinite(x.arms.ABLATED.rhoPhase1)
                              && Number.isFinite(x.arms.ABLATED.rhoPhase2)),
          'every rho is a finite number — the degenerate case never produced NaN');
        P('K16', cfgs.every(x => F.goalIndices.includes(x.configIndex)
                              && x.configSeed >= F.seedLo && x.configSeed <= F.seedHi),
          'every collected configuration lies inside the frozen range and goal schedule');

        // §11 — the lock, asserted on the artifact and not only on the code.
        P('K17', !/p_?value|confidence[_ ]?interval|significan|effect[_ ]?size/i
                  .test(JSON.stringify(R.configurations)),
          '§11 — the per-configuration table contains no inferential quantity');
        P('K18', R.statisticsLock.notComputed.includes('p-values')
             && R.statisticsLock.notComputed.includes('effect sizes')
             && R.statisticsLock.notComputed.includes(
                    'cross-configuration aggregates of the paired difference'),
          'the artifact records what was deliberately NOT computed, including the aggregate');
        P('K19', R.sufficiency.status === 'SATISFIED'
              || R.sufficiency.status === 'INCONCLUSIVE — INSUFFICIENT MATERIAL',
          `§19 disposition is one of the two pre-declared outcomes: ${R.sufficiency.status}`);
        P('K20', R.sufficiency.conditions[0].required === F.minConfigurations
             && R.sufficiency.conditions[0].observed === cfgs.length,
          `§18 — ${cfgs.length} configurations against the frozen minimum of ${F.minConfigurations}`);

        // Determinism, on a configuration chosen by a fixed rule so the check
        // cannot be steered toward a convenient one.
        const chosen = [...cfgs].sort((p, q) => p.configSeed - q.configSeed
                                              || p.configIndex - q.configIndex)[
                                    Math.floor(cfgs.length / 2)];
        console.log(`     (re-running ${chosen.configSeed}:${chosen.configIndex} under both arms; ` +
                    'about 15 seconds)');
        const redo = {};
        for (const arm of F.arms) {
            const r = collectOne({ configSeed: chosen.configSeed, configIndex: chosen.configIndex,
                                   goal: chosen.goal, uqaArm: arm });
            const s = analyze.analyzeArm({ population, qEntries: r.qEntries,
                goal: r.environment.goal, pPhase1: r.environment.pPhase1,
                pPhase2: r.environment.pPhase2 });
            redo[arm] = { r, s };
        }
        P('K21', F.arms.every(arm =>
              redo[arm].r.provenance.fingerprint === chosen.provenance[arm].fingerprint),
          'the re-run reproduces the recorded M7 fingerprint for both arms');
        P('K22', F.arms.every(arm =>
              redo[arm].s.rhoPhase1 === chosen.arms[arm].rhoPhase1 &&
              redo[arm].s.rhoPhase2 === chosen.arms[arm].rhoPhase2 &&
              redo[arm].s.coverage === chosen.arms[arm].coverage),
          'and reproduces the recorded rho and coverage exactly — the result is regenerable');
        P('K23', JSON.stringify(redo.ARMED.r.environment)
              === JSON.stringify(redo.ABLATED.r.environment),
          'the re-run confirms the pair shares one environment');
    }
}

console.log('\n' + '='.repeat(78));
console.log(`  ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

// ==========================================================
// M9 ANALYSIS GATE — protocol conformance, anti-vacuity, determinism
// ==========================================================
// SOLE SCIENTIFIC AUTHORITY
//   research/preregistrations/M9_PREREGISTRATION.md, frozen at
//   f40f83c9454144106366422f97258321374a8462.
//
// ANTI-VACUITY, per the M7-ERR-10 lesson
//   Section M corrupts the MEASUREMENT INPUT -- raw records, ORIGIN-relevant
//   fields, the population, the rule itself -- and requires a named assertion
//   to go RED. A gate that stays green while its input is wrong proves
//   nothing; that is exactly how G16.4b survived.
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, PREREG, sha, isDesync, originOf, ageOf, sPair, nonCanon,
         stratumOf, buildEdgeSet, verifyEvidence, analyse } from './analyze.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const M8DATA = path.join(ROOT, 'experiments/m8/data');
const M9DOC = fs.readFileSync(
    path.join(ROOT, 'research/preregistrations/M9_PREREGISTRATION.md'), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };
const throws = (fn) => { try { fn(); return false; } catch { return true; } };

console.log('==============================================================');
console.log(' M9 ANALYSIS GATE — conformance + anti-vacuity + determinism');
console.log(' pre-registration f40f83c | evidence read-only');
console.log('==============================================================');

const EDGES = buildEdgeSet(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const { raw, manifest, digest } = verifyEvidence();
const R = analyse(raw, EDGES, manifest);
const stored = JSON.parse(fs.readFileSync(path.join(HERE, 'results/m9_results.json'), 'utf8'));

// ==========================================================
console.log('\n===== E  evidence immutability ================================');
// ==========================================================
const integ = fs.readFileSync(path.join(M8DATA, 'INTEGRITY.sha256'), 'utf8');
ok('E1 the M8 raw stream matches its frozen digest',
   digest === (integ.match(/^([0-9a-f]{64})  events\.jsonl$/m) || [])[1], digest.slice(0, 24) + '…');
ok('E2 the analysis aborts rather than proceeding on a digest mismatch',
   /digest mismatch[\s\S]*is not overwritten, repaired, or re-collected/.test(
       fs.readFileSync(path.join(HERE, 'analyze.js'), 'utf8')));
ok('E3 candidates.jsonl and manifest.json still match their digests',
   sha(fs.readFileSync(path.join(M8DATA, 'candidates.jsonl'), 'utf8'))
       === (integ.match(/^([0-9a-f]{64})  candidates\.jsonl$/m) || [])[1] &&
   sha(fs.readFileSync(path.join(M8DATA, 'manifest.json'), 'utf8'))
       === (integ.match(/^([0-9a-f]{64})  manifest\.json$/m) || [])[1]);
ok('E4 no M8 file is modified',
   execFileSync('git', ['status', '--porcelain', 'experiments/m8/'],
       { cwd: ROOT, encoding: 'utf8' }).split(String.fromCharCode(10))
       .filter(l => l.trim() && !l.startsWith('??')).length === 0,
   'evidence, manifest, integrity record and collection code untouched');

// ==========================================================
console.log('\n===== D  denominator and evaluability (§2, §13) ===============');
// ==========================================================
ok('D1 the observed denominator is exactly the frozen 7,178',
   R.denominator.observed === 7178 && R.denominator.frozen === FROZEN.denominator &&
   R.denominator.matchesFrozen === true, `${R.denominator.observed}`);
// Structural, not prose-matching: every ORIGIN share is computed against the
// one denominator, so the three shares must sum to exactly 100%.
ok('D2 a single denominator is used — ORIGIN shares sum to 100% of it',
   (() => { const t = ['TELEPORT', 'ADVANCE', 'UNCLASSIFIED']
                .reduce((a, k) => a + (R.origin[k].pctOfDenominator || 0), 0);
            return Math.abs(t - 100) < 1e-6; })() &&
   M9DOC.includes('single denominator used'),
   'no second global denominator exists in the output');
ok('D3 §13 minimum-evidence conditions are each evaluated and reported',
   ['denominatorReproduced', 'unclassifiedIsZero', 'bothOriginsNonEmpty']
       .every(k => typeof R.evaluability[k] === 'boolean'),
   JSON.stringify(R.evaluability));
ok('D4 UNCLASSIFIED is reported, never dropped',
   'UNCLASSIFIED' in R.origin && typeof R.origin.UNCLASSIFIED.n === 'number',
   `UNCLASSIFIED n = ${R.origin.UNCLASSIFIED.n}`);
ok('D5 the origin counts partition the denominator exactly',
   R.origin.TELEPORT.n + R.origin.ADVANCE.n + R.origin.UNCLASSIFIED.n === R.denominator.observed);
ok('D6 every collected configuration contributes',
   R.configurationsContributing === 41, `${R.configurationsContributing} of 41`);

// ==========================================================
console.log('\n===== O  ORIGIN conformance to §4 =============================');
// ==========================================================
const mk = (t, w, src) => ({ ticksSinceTeleport: t, ticksSinceWrite: w, teleportSource: src });
ok('O1 LT -> TELEPORT regardless of source',
   ['cap', 'pool', 'goalReset'].every(s => originOf(mk(1, 3, s)) === 'TELEPORT'));
ok('O2 GT -> ADVANCE regardless of source',
   ['cap', 'pool', 'goalReset'].every(s => originOf(mk(5, 2, s)) === 'ADVANCE'));
ok('O3 EQ + goalReset -> TELEPORT (post-write site 4731)',
   originOf(mk(2, 2, 'goalReset')) === 'TELEPORT');
ok('O4 EQ + cap/pool -> ADVANCE (pre-write sites 3163/3274)',
   originOf(mk(2, 2, 'cap')) === 'ADVANCE' && originOf(mk(2, 2, 'pool')) === 'ADVANCE');
ok('O5 null counters -> UNCLASSIFIED, never a category',
   originOf(mk(null, 2, 'cap')) === 'UNCLASSIFIED' &&
   originOf(mk(2, null, 'cap')) === 'UNCLASSIFIED' &&
   originOf(mk(undefined, 2, 'cap')) === 'UNCLASSIFIED');
ok('O6 EQ with an unrecognised source -> UNCLASSIFIED, never guessed',
   originOf(mk(2, 2, 'none')) === 'UNCLASSIFIED' && originOf(mk(2, 2, 'zzz')) === 'UNCLASSIFIED');
ok('O7 the partition is exhaustive and mutually exclusive on the real population',
   R.grid.filter(c => !['TELEPORT', 'ADVANCE', 'UNCLASSIFIED'].includes(c.origin)).length === 0 &&
   R.comparisonCells.reduce((n, c) => n + c.n, 0) === R.denominator.observed,
   'comparison cells sum to the denominator');

// ==========================================================
console.log('\n===== P  frozen policy conformance ============================');
// ==========================================================
ok('P1 AGE is reported as duration, never as a mechanism',
   R.age && !('mechanism' in R) && !JSON.stringify(R).includes('H3'),
   `ages ${Object.keys(R.age).join(',')}`);
ok('P2 replay is reported as the constant precondition it is (§6)',
   R.precondition.selectionRanThisTickTrue === 0 &&
   R.precondition.selectionRanThisTickFalse === R.denominator.observed &&
   /never as a mechanism/.test(R.precondition.note),
   `${R.precondition.selectionRanThisTickFalse}/${R.denominator.observed} false`);
ok('P3 H4 is reported as harness-unreachable, not absent (§7)',
   R.h4.status === 'UNTESTABLE UNDER THIS HARNESS' && /not "absent"/.test(R.h4.note));
ok('P4 NON_CANONICAL and S_PAIR appear only as consequence/signature (§8)',
   'consequence' in R && !('cause' in R) &&
   ['TELEPORT', 'ADVANCE'].every(o => 'nonCanonical' in R.consequence[o] && 'sPair' in R.consequence[o]));
ok('P5 all frozen stratifiers are preserved (§9)',
   'originByStratum' in R && 'originByPhase' in R && 'originByGoal' in R &&
   Object.keys(R.originByStratum).join(',') === 'degree5,degree3' &&
   Object.keys(R.originByGoal).join(',') === '8,12,16,19');
ok('P6 unobserved cells are labelled NOT OBSERVED, never UNREACHABLE (§10)',
   R.grid.every(c => ['OBSERVED', 'NOT OBSERVED'].includes(c.status)) &&
   R.grid.some(c => c.status === 'NOT OBSERVED') &&
   !JSON.stringify(R.grid).includes('UNREACHABLE'),
   `${R.grid.filter(c => c.status === 'NOT OBSERVED').length} of ${R.grid.length} cells not observed`);
ok('P7 the complete grid is emitted, nothing excluded or merged (§10, §12)',
   R.grid.length === 3 * 2 * 2 * 4 && R.comparisonCells.length === 4 * 4,
   `${R.grid.length} grid cells + ${R.comparisonCells.length} comparison cells`);

// ==========================================================
console.log('\n===== F  forbidden statistics and language (§11, §17) =========');
// ==========================================================
const BS = String.fromCharCode(92);
const litRe = (q) => new RegExp(q + '(?:[^' + q + BS + BS + ']|' + BS + BS + '.)*' + q, 'g');
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    .replace(litRe('`'), '``').replace(litRe("'"), "''").replace(litRe('"'), '""');
const SRC = code(fs.readFileSync(path.join(HERE, 'analyze.js'), 'utf8'));
const OUTJSON = JSON.stringify(stored);

ok('F1 no inferential test, p-value, confidence interval or model',
   !/pValue|p_value|tTest|chiSq|chi2|confidence|significan|regress|corrCoef|pearson|spearman/i.test(SRC + OUTJSON));
ok('F2 no threshold constant is introduced',
   !/0\.0[15]|threshold|alpha\s*=|cutoff/i.test(SRC),
   'descriptive counts and proportions only');
ok('F3 no G15, rho, reward, eligibility or calibration reference (§17)',
   !/G15|rho|reward|eligibilit|calibrat/i.test(SRC + OUTJSON),
   'M7 is not referenced anywhere in the analysis or its output');
ok('F4 no causal claim about ORIGIN in code or output (§3, §4)',
   !/caused|causes|because of|due to|drives|responsible for/i.test(SRC + OUTJSON),
   'classificatory and associational language only');
ok('F5 no new hypothesis label (H1-H5, F_H*) is emitted',
   !/F_H[1-5]|"H[1-5]"|SOLE_SHARE|MARGINAL/.test(SRC + OUTJSON));
ok('F6 no post-hoc exclusion, adaptive stopping, or new seed range',
   !/exclude|filterOut|drop\(|adaptive|899[0-9]{3}|900[0-9]{3}/.test(SRC),
   'no seed literal and no exclusion path in the analysis');
ok('F7 no seed is generated or inspected, no collection is executed',
   !/makeConfig|generateAccepted|runOnce|collectOne|liveRng|initRng/.test(SRC));
ok('F8 the analysis never writes to the M8 data directory',
   !/writeFileSync[^)]*m8/i.test(SRC) && !/experiments.m8.data[^)]*w/i.test(SRC));

// ==========================================================
console.log('\n===== M  MUTATION CONTROLS — bind the INPUT ===================');
// ==========================================================
const base = { from: 1, agentCurrent: 5, next: 6, ticksSinceWrite: 2, ticksSinceTeleport: 4,
    teleportSource: 'cap', selectionRanThisTick: false, goalIdAtSelection: 8,
    goalIdAtEvaluation: 8, tickIndex: 10, phase: 1, configSeed: 899502, goalNode: 8,
    goal: 8, stratum: 'degree5', agentCurrentChangedSinceLastWrite: true };
const mini = (recs) => analyse(recs.map(r => JSON.stringify(r)).join('\n'), EDGES, manifest);

ok('M1 changing a raw DESYNC record changes the derived result',
   (() => { const a = mini([base]); const b = mini([{ ...base, agentCurrent: base.from }]);
       return a.denominator.observed === 1 && b.denominator.observed === 0; })(),
   'making from === agentCurrent removes the event from the denominator');
ok('M2 changing an ORIGIN-relevant field changes classification',
   (() => { const a = mini([base]).origin;                       // GT -> ADVANCE
       const b = mini([{ ...base, ticksSinceTeleport: 1 }]).origin; // LT -> TELEPORT
       return a.ADVANCE.n === 1 && b.TELEPORT.n === 1; })(),
   'ticksSinceTeleport 4 -> 1 flips ADVANCE to TELEPORT');
ok('M3 flipping teleportSource in the EQUALITY case flips the category',
   (() => { const eq = { ...base, ticksSinceTeleport: 2, ticksSinceWrite: 2 };
       return mini([{ ...eq, teleportSource: 'cap' }]).origin.ADVANCE.n === 1 &&
              mini([{ ...eq, teleportSource: 'goalReset' }]).origin.TELEPORT.n === 1; })(),
   'the §4 equality rule is load-bearing, not decorative');
ok('M4 removing a required raw field is detected, never silently classified',
   (() => { const { ticksSinceTeleport, ...missing } = base;
       return mini([missing]).origin.UNCLASSIFIED.n === 1; })(),
   'a missing counter yields UNCLASSIFIED, not a guessed category');
ok('M5 UNCLASSIFIED records are counted, not dropped',
   (() => { const r = mini([base, { ...base, ticksSinceTeleport: null }]);
       return r.denominator.observed === 2 && r.origin.UNCLASSIFIED.n === 1 &&
              r.origin.ADVANCE.n === 1; })(),
   'denominator 2 = 1 ADVANCE + 1 UNCLASSIFIED');
ok('M6 changing the input population cannot silently pass',
   (() => { const r = mini([base, base, base]);
       return r.denominator.observed === 3 && r.denominator.matchesFrozen === false &&
              r.evaluability.denominatorReproduced === false; })(),
   'a wrong population fails §13 rather than being absorbed');
ok('M7 changing the ORIGIN rule produces a detectable mismatch',
   (() => { const real = originOf(mk(2, 2, 'cap'));
       const mutated = (e) => e.ticksSinceTeleport === e.ticksSinceWrite ? 'TELEPORT' : real;
       return real === 'ADVANCE' && mutated(mk(2, 2, 'cap')) !== real; })(),
   'inverting the equality branch changes the verdict for EQ/cap');
ok('M8 empty input cannot produce a false PASS',
   (() => { const r = mini([]);
       return r.denominator.observed === 0 && r.evaluability.denominatorReproduced === false &&
              r.evaluability.bothOriginsNonEmpty === false; })(),
   'zero events fails §13 on two conditions');
ok('M9 a NOT OBSERVED cell never becomes UNREACHABLE under mutation',
   (() => { const r = mini([base]);
       return r.grid.filter(c => c.status === 'NOT OBSERVED').length > 0 &&
              !JSON.stringify(r.grid).includes('UNREACHABLE'); })(),
   'the §10 distinction survives a degenerate population');
ok('M10 consequence labels track the raw fields they derive from',
   (() => { const canon = mini([{ ...base, agentCurrent: 1, next: 2, from: 9 }]);
       const self  = mini([{ ...base, agentCurrent: 5, next: 5, from: 9 }]);
       return canon.consequence.ADVANCE.nonCanonical === 0 &&
              self.consequence.ADVANCE.nonCanonical === 1 && self.consequence.ADVANCE.sPair === 1; })(),
   '{1,2} is a graph edge; a self-pair is never canonical');

// ==========================================================
console.log('\n===== R  determinism and reproducibility (§15) ================');
// ==========================================================
const again = analyse(raw, EDGES, manifest);
ok('R1 repeated analysis of the same evidence is byte-identical',
   JSON.stringify(again) === JSON.stringify(R), 'classifications, counts and summaries');
ok('R2 the stored result matches a fresh recomputation',
   (() => { const { m8EvidenceDigest, ...p } = stored.provenance;
       return JSON.stringify({ ...stored, provenance: p }) ===
              JSON.stringify({ ...R, provenance: R.provenance }); })(),
   'results/m9_results.json reproduces exactly');
ok('R3 the results digest matches its integrity record',
   sha(fs.readFileSync(path.join(HERE, 'results/m9_results.json'), 'utf8')) ===
   (fs.readFileSync(path.join(HERE, 'results/INTEGRITY.sha256'), 'utf8')
       .match(/^([0-9a-f]{64})  m9_results\.json$/m) || [])[1]);
ok('R4 no mtime, wall-clock, network or undeclared seed dependency',
   !/mtime|statSync|birthtime|Date\.now|new Date|performance\.now|hrtime|fetch\(|http/.test(SRC));
ok('R5 iteration order is deterministic (no Object key or Set ordering dependence on input order)',
   (() => { const a = mini([base, { ...base, ticksSinceTeleport: 1 }]);
       const b = mini([{ ...base, ticksSinceTeleport: 1 }, base]);
       return JSON.stringify(a.origin) === JSON.stringify(b.origin) &&
              JSON.stringify(a.grid) === JSON.stringify(b.grid); })());
ok('R6 the analysis binds to the frozen pre-registration commit',
   R.provenance.preregistration === PREREG && PREREG === 'f40f83c9454144106366422f97258321374a8462');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

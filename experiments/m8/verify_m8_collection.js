// ==========================================================
// M8 COLLECTION GATE — accounting, seed discipline, integrity
// ==========================================================
// GOVERNING SOURCE
//   research/preregistrations/M8_PREREGISTRATION.md §8, §12, §13, §14,
//   frozen at 8fb0bec13bb2940fa2e7e7f823c632427a28fae3.
//
// WHAT THIS GATE ESTABLISHES
//   The collection over the frozen range is complete, every candidate is
//   accounted for, no seed outside the frozen range was ever evaluated, the
//   committed artifacts match their recorded digests, and a re-run of any
//   configuration reproduces its collected output exactly.
//
// WHAT THIS GATE DOES NOT DO
//   It computes no derived predicate, no mechanism flag, no frequency, and no
//   H1-H5 verdict. It reports information sufficiency against the frozen §12
//   minima as an accounting fact, which §13 requires before any interpretation
//   is permitted -- that is a count, not a scientific conclusion.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN, TUPLE_FIELDS, HELD_OUT_FLOOR, CONSUMED_RANGES,
         inFrozenRange, isHeldOut, isConsumed, stratumOf } from './protocol.js';
import { collectOne } from './collect.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DATA = path.join(HERE, 'data');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++;
    console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '   ' + x : ''}`); return !!c; };

console.log('==============================================================');
console.log(' M8 COLLECTION GATE — accounting + seed discipline + integrity');
console.log(' pre-registration 8fb0bec | frozen range 899500-899999');
console.log('==============================================================');

const candRaw = fs.readFileSync(path.join(DATA, 'candidates.jsonl'), 'utf8');
const manRaw  = fs.readFileSync(path.join(DATA, 'manifest.json'), 'utf8');
// The raw stream is not committed (see data/README.md). Refuse to run rather
// than pass on partial evidence: a gate that goes green without the data it
// claims to check is exactly the failure mode M7-ERR-10 retired G16.4b for.
const EVPATH = path.join(DATA, 'events.jsonl');
if (!fs.existsSync(EVPATH)) {
    console.error('RAW DATA NOT PRESENT: ' + EVPATH);
    console.error('Regenerate with:  cd experiments/m8 && node run_collection.js');
    console.error('This gate does not run without it.');
    process.exit(2);
}
const evRaw   = fs.readFileSync(EVPATH, 'utf8');
const integ   = fs.readFileSync(path.join(DATA, 'INTEGRITY.sha256'), 'utf8');
const candidates = candRaw.trim().split('\n').map(JSON.parse);
const manifest = JSON.parse(manRaw);
const events = evRaw.trim() ? evRaw.trim().split('\n').map(JSON.parse) : [];
const A = manifest.accounting;

// ==========================================================
console.log('\n===== I  artifact integrity ==================================');
// ==========================================================
const digestOf = (name) => (integ.match(new RegExp('^([0-9a-f]{64})  ' + name + '$', 'm')) || [])[1];
ok('I1 candidates.jsonl matches its recorded digest', sha(candRaw) === digestOf('candidates.jsonl'));
ok('I2 manifest.json matches its recorded digest',    sha(manRaw)  === digestOf('manifest.json'));
ok('I3 events.jsonl matches its recorded digest',     sha(evRaw)   === digestOf('events.jsonl'));
ok('I4 the integrity record names the regeneration procedure',
   /node run_collection\.js/.test(integ) && /node verify_m8_collection\.js/.test(integ));
ok('I5 every collected run carries a per-run event digest',
   manifest.runs.filter(r => r.status === 'COLLECTED').every(r => /^[0-9a-f]{64}$/.test(r.eventsSha256)),
   `${manifest.runs.filter(r => r.status === 'COLLECTED').length} runs`);

// ==========================================================
console.log('\n===== A  accounting closure ==================================');
// ==========================================================
const expected = (FROZEN.seedHi - FROZEN.seedLo + 1) * FROZEN.goalIndices.length;
ok('A1 every candidate in the frozen range is present exactly once',
   candidates.length === expected &&
   new Set(candidates.map(c => `${c.configSeed}:${c.configIndex}`)).size === expected,
   `${candidates.length} candidates = 500 seeds x 4 goal indices`);
ok('A2 every seed 899500-899999 appears with all four goal indices',
   (() => { const m = new Map();
       for (const c of candidates) { if (!m.has(c.configSeed)) m.set(c.configSeed, new Set());
                                     m.get(c.configSeed).add(c.configIndex); }
       if (m.size !== 500) return false;
       for (let s = FROZEN.seedLo; s <= FROZEN.seedHi; s++)
           if (!m.has(s) || m.get(s).size !== 4) return false;
       return true; })(),
   'no seed disappears');
ok('A3 every candidate has exactly one terminal disposition',
   candidates.every(c => ['REJECTED', 'COLLECTED', 'FAILED'].includes(c.disposition)) &&
   candidates.every(c => c.disposition !== 'PENDING'),
   `REJECTED ${A.tally.REJECTED} | COLLECTED ${A.tally.COLLECTED} | FAILED ${A.tally.FAILED}`);
ok('A4 the dispositions sum to the candidate total',
   A.tally.REJECTED + A.tally.COLLECTED + A.tally.FAILED === candidates.length &&
   A.closure === true, `${candidates.length} accounted for`);
ok('A5 every rejection records the deciding predicate',
   candidates.filter(c => c.disposition === 'REJECTED').every(c => typeof c.reason === 'string' && c.reason),
   'env.makeConfig R1-R5, the committed acceptance predicate');
ok('A6 every failure records an explicit reason',
   candidates.filter(c => c.disposition === 'FAILED').every(c => typeof c.reason === 'string' && c.reason),
   A.tally.FAILED === 0 ? 'no failures' : `${A.tally.FAILED} failures, all with reasons`);
ok('A7 the manifest has one entry per accepted candidate',
   manifest.runs.length === A.tally.COLLECTED + A.tally.FAILED &&
   manifest.runs.length === candidates.filter(c => c.accepted).length,
   `${manifest.runs.length} runs for ${candidates.filter(c => c.accepted).length} accepted candidates`);

// ==========================================================
console.log('\n===== S  seed discipline =====================================');
// ==========================================================
ok('S1 no candidate lies outside the frozen range',
   candidates.every(c => inFrozenRange(c.configSeed)),
   `${A.seedBoundary.min}-${A.seedBoundary.max}`);
ok('S2 no seed at or above the held-out floor was evaluated',
   A.seedBoundary.heldOutTouched === 0 && candidates.every(c => !isHeldOut(c.configSeed)),
   `held-out floor ${HELD_OUT_FLOOR} never approached`);
ok('S3 no consumed range was touched',
   A.seedBoundary.consumedTouched === 0 && candidates.every(c => !isConsumed(c.configSeed)),
   CONSUMED_RANGES.map(r => `${r.lo}-${r.hi}`).join(', ') + ' untouched');
ok('S4 the runtime seed census equals the frozen range exactly',
   A.seedBoundary.evaluatedSeedCount === 500 && A.seedBoundary.outsideFrozenRange === 0 &&
   A.seedBoundary.min === FROZEN.seedLo && A.seedBoundary.max === FROZEN.seedHi,
   `${A.seedBoundary.evaluatedSeedCount} seeds, 0 outside`);
ok('S5 every collected run evaluated ONLY its own configuration seed',
   manifest.runs.filter(r => r.status === 'COLLECTED')
       .every(r => r.evaluatedSeeds.length === 1 && r.evaluatedSeeds[0] === r.configSeed),
   'no forward acceptance walk in any child process');
ok('S6 NO adaptive extension: the range is exactly the frozen one',
   A.frozenRange.lo === 899500 && A.frozenRange.hi === 899999 &&
   A.candidatesTotal === expected,
   'no replacement, retry, or additional seed');
ok('S7 the agent seed is not classified as a configuration seed',
   !candidates.some(c => c.configSeed === FROZEN.agentSeed) &&
   A.runParameters.agentSeed === FROZEN.agentSeed,
   `agent seed ${FROZEN.agentSeed} is a separate namespace`);

// ==========================================================
console.log('\n===== P  frozen run parameters ================================');
// ==========================================================
ok('P1 every collected run used the frozen parameters',
   A.runParameters.agentSeed === 20260819000 && A.runParameters.arm === 'A1' &&
   A.runParameters.ticks === 3000 &&
   events.every(e => e.agentSeed === 20260819000 && e.arm === 'A1' && e.ticks === 3000),
   'agentSeed 20260819000, arm A1, 3000 ticks');
ok('P2 no run was marked as an implementation fixture',
   events.every(e => e.fixture === false),
   'every record is measurement, not fixture');
ok('P3 every record binds to the frozen pre-registration commit',
   events.every(e => e.preregistration === '8fb0bec13bb2940fa2e7e7f823c632427a28fae3'));

// ==========================================================
console.log('\n===== E  raw observation schema ===============================');
// ==========================================================
const UNION = new Set();
const IDENTITY = ['configSeed', 'configIndex', 'goal', 'stratum', 'agentSeed', 'arm',
                  'ticks', 'preregistration', 'fixture'];
[...TUPLE_FIELDS, ...IDENTITY].forEach(f => UNION.add(f));
ok('E1 event count matches the manifest',
   events.length === A.events.total &&
   events.length === manifest.runs.filter(r => r.status === 'COLLECTED')
       .reduce((n, r) => n + r.events, 0),
   `${events.length} events`);
ok('E2 every record carries the closed §8 tuple plus run identity, nothing else',
   events.every(e => {
       const k = Object.keys(e);
       // configSeed appears in BOTH the frozen tuple (§8 field 13) and the run
       // identity, so the record's key set is their UNION, not their sum.
       return k.length === UNION.size && k.every(f => UNION.has(f)) &&
              TUPLE_FIELDS.every(f => f in e) && IDENTITY.every(f => f in e); }),
   `${UNION.size} distinct keys = ${TUPLE_FIELDS.length} observables u ${IDENTITY.length} identity ` +
   `(configSeed is common to both)`);
ok('E3 raw observations are NOT reduced to hypothesis labels',
   events.every(e => !('DESYNC' in e) && !('F_H1' in e) && !('mechanism' in e) &&
                     !('NON_CANONICAL' in e)),
   'every §9 predicate stays reconstructible offline');
ok('E4 every field needed to reconstruct DESYNC, H1-H4, S-PAIR and NON_CANONICAL is present',
   events.every(e => e.from !== undefined && e.agentCurrent !== undefined &&
       e.next !== undefined && e.selectionRanThisTick !== undefined &&
       e.ticksSinceWrite !== undefined && e.ticksSinceTeleport !== undefined &&
       e.agentCurrentChangedSinceLastWrite !== undefined &&
       e.goalIdAtSelection !== undefined && e.goalIdAtEvaluation !== undefined));
ok('E5 both phases are represented (the §14.2 3000-tick budget crosses T_SHIFT)',
   new Set(events.map(e => e.phase)).size === 2,
   `phases ${[...new Set(events.map(e => e.phase))].sort().join(',')}`);
ok('E6 both goal-degree strata are represented',
   A.strata.degree5 > 0 && A.strata.degree3 > 0 &&
   events.every(e => ['degree5', 'degree3'].includes(e.stratum)),
   `degree5 ${A.strata.degree5} configs, degree3 ${A.strata.degree3} configs`);

// ==========================================================
console.log('\n===== D  determinism =========================================');
// ==========================================================
// Re-run one collected configuration and require byte-identical output. The
// per-run digest in the manifest is what makes this checkable without storing
// a second copy of the data.
const sample = manifest.runs.find(r => r.status === 'COLLECTED');
const redo = collectOne({ configSeed: sample.configSeed, configIndex: sample.configIndex,
                          goal: sample.goal });
const redoLines = redo.events.map(e => JSON.stringify({ ...redo.runIdentity, ...e }));
ok('D1 re-running a collected configuration reproduces its events exactly',
   sha(redoLines.join('\n')) === sample.eventsSha256,
   `${sample.configSeed}/${sample.configIndex}: ${redo.events.length} events, digest match`);
ok('D2 fingerprint, artifacts and env counters reproduce',
   redo.provenance.fingerprint === sample.fingerprint &&
   JSON.stringify(redo.provenance.artifacts) === JSON.stringify(sample.artifacts) &&
   JSON.stringify(redo.provenance.envCounters) === JSON.stringify(sample.envCounters),
   `fingerprint ${sample.fingerprint.slice(0, 16)}`);
ok('D3 diagnostics reproduce (read/evaluation accounting is stable)',
   JSON.stringify(redo.diagnostics) === JSON.stringify(sample.diagnostics),
   `${sample.diagnostics.reads} reads, ${sample.diagnostics.evals} evals, ` +
   `${sample.diagnostics.unpairedReads} unpaired`);
ok('D4 the re-run touched only its own seed',
   redo.provenance.evaluatedSeeds.length === 1 &&
   redo.provenance.evaluatedSeeds[0] === sample.configSeed);

// ==========================================================
console.log('\n===== Z  scope: collection, not interpretation ================');
// ==========================================================
const BS = String.fromCharCode(92);
const litRe = (q) => new RegExp(q + '(?:[^' + q + BS + BS + ']|' + BS + BS + '.)*' + q, 'g');
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    .replace(litRe('`'), '``').replace(litRe("'"), "''").replace(litRe('"'), '""');
const DRIVER = code(fs.readFileSync(path.join(HERE, 'run_collection.js'), 'utf8'));
ok('Z1 the collection driver computes no derived predicate',
   !/derive\(|F_H[1-4]|SOLE_SHARE|MARGINAL/.test(DRIVER));
ok('Z2 no H1-H5 verdict is recorded in any artifact',
   !/SOLE_SHARE|MARGINAL|"H5"|verdict/i.test(manRaw) && !/F_H[1-4]/.test(evRaw),
   'interpretation is a later milestone');

// ---- §12 information sufficiency, reported as an ACCOUNTING fact ---------
// §13 requires this to be stated before any interpretation is permitted. It is
// a count against frozen minima, not a scientific conclusion.
const desync = events.filter(e => e.from !== e.agentCurrent);
const byStratum = { degree5: desync.filter(e => e.stratum === 'degree5').length,
                    degree3: desync.filter(e => e.stratum === 'degree3').length };
const configsWithDesync = new Set(desync.map(e => `${e.configSeed}:${e.configIndex}`)).size;
console.log('\n===== §12 INFORMATION SUFFICIENCY (accounting, not interpretation)');
console.log(`   DESYNC events        ${desync.length} / ${FROZEN.minDesyncEvents} required   ` +
            (desync.length >= FROZEN.minDesyncEvents ? 'MET' : 'SHORT'));
console.log(`   configurations       ${A.tally.COLLECTED} / ${FROZEN.minConfigurations} required   ` +
            (A.tally.COLLECTED >= FROZEN.minConfigurations ? 'MET' : 'SHORT'));
console.log(`   degree-5 stratum     ${byStratum.degree5} / ${FROZEN.minPerStratum} required   ` +
            (byStratum.degree5 >= FROZEN.minPerStratum ? 'MET' : 'SHORT'));
console.log(`   degree-3 stratum     ${byStratum.degree3} / ${FROZEN.minPerStratum} required   ` +
            (byStratum.degree3 >= FROZEN.minPerStratum ? 'MET' : 'SHORT'));
console.log(`   configurations contributing at least one DESYNC event: ${configsWithDesync}`);
const sufficient = desync.length >= FROZEN.minDesyncEvents &&
    A.tally.COLLECTED >= FROZEN.minConfigurations &&
    byStratum.degree5 >= FROZEN.minPerStratum && byStratum.degree3 >= FROZEN.minPerStratum;
console.log(`   §12 VERDICT : ${sufficient ? 'SATISFIED' : 'NOT SATISFIED -> §13 INCONCLUSIVE'}`);
console.log('   (no mechanism frequency and no H1-H5 verdict is computed by this gate)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

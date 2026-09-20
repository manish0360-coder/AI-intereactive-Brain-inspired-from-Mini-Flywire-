// ==========================================================
// BOUNDARY RECORD GATE — B1..B12 + proofs A..G
// ==========================================================
// Verifies the production traversal evidence boundary implemented per
// FUTURESCORE_BOUNDARY_RECORD_DESIGN.md. The module under test is imported LIVE from render/;
// its adjacency dependency (render/search.js) is fed a synthetic neuron map, so no agent is run,
// no configuration is generated and no seed is evaluated. main.js is checked by source, never executed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = pathToFileURL(ROOT).href;
const BASE = '38be3141e4a841d393155d73f2177480f765682c';        // boundary design
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

console.log('='.repeat(78)); console.log('  BOUNDARY RECORD GATE — B1..B12, write-only traversal evidence'); console.log('='.repeat(78));

// ---- live module under test, with a synthetic graph ---------------------------------------------------
// graph: 1-2, 2-3, 3-4, 1-4   (5 exists but is isolated)
const EDGES = [[1, 2], [2, 3], [3, 4], [1, 4]];
const nb = new Map([[1, [2, 4]], [2, [1, 3]], [3, [2, 4]], [4, [3, 1]], [5, []]]);
const neuronMap = new Map([...nb.keys()].map(id => [id, { userData: { id, neighbors: nb.get(id) } }]));
const search = await import(U + '/render/search.js');
search.setNeuronMap(neuronMap);
const TR = await import(U + '/render/traversalRecord.js');
const MAIN = read('main.js');
const MOD = read('render/traversalRecord.js');
// forbidden-input checks run on CODE only: the module's header deliberately NAMES the writers and
// inputs it excludes, and a comment cannot reach anything
const MOD_CODE = MOD.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([;{}),])\s*\/\/.*$/gm, '$1');
const digest = () => {                                  // state digest through the public read surface
  const all = [];
  for (const u of nb.keys()) for (const v of nb.keys()) if (u !== v) all.push(`${u}->${v}:${JSON.stringify(TR.recordFor(u, v))}`);
  return crypto.createHash('sha256').update(all.join('|')).digest('hex');
};

// ---- B1 placement -------------------------------------------------------------------------------------
section('B1  post-outcome placement');
const L = MAIN.split('\n');
const iOutcome = L.findIndex(l => l.includes('const _m7Traversed ='));
const iCredit = L.findIndex(l => l.includes('_m7cred.recordTraversal(_m7From, _m7To, _m7Traversed);'));
const iWrite = L.findIndex(l => l.includes('recordTraversalOutcome(_m7From, _m7To, _m7Traversed);'));
const iMove = L.findIndex(l => l.includes('  agentCurrent = next;'));
ok('B1.1', iOutcome > 0 && iCredit > iOutcome && iWrite > iCredit && iMove > iWrite,
  `order: outcome(${iOutcome + 1}) < credit(${iCredit + 1}) < boundary write(${iWrite + 1}) < agentCurrent = next(${iMove + 1})`);
ok('B1.2', L[iWrite - 1].includes('if (next !== null && !_goalResetJustHappened) {'),
  'the write is inside the movement/outcome guard (next !== null && !_goalResetJustHappened)');
ok('B1.3', L[iWrite].includes('_m7Traversed'), 'the write passes the environment verdict, not a reconstruction');
ok('B1.4', !/_goalResetJustHappened\s*=[^=]/.test(MAIN.replace(/const _goalResetJustHappened =[\s\S]*?;/, '')),
  'the goal-entering guard itself is unchanged (single assignment)');

// ---- B2 canonical key ---------------------------------------------------------------------------------
section('B2  canonical edge key');
TR.clear();
ok('B2.1', TR.recordOutcome(1, 2, true) === true && TR.recordFor(1, 2).a === 1, 'a declared edge is accepted');
ok('B2.2', TR.recordOutcome('1', '2', true) === true && TR.recordFor(1, 2).a === 2 && TR.recordFor('1', '2').a === 2,
  'string ids normalise to the same numeric key');
ok('B2.3', TR.recordOutcome(1, 3, true) === false && TR.recordFor(1, 3).a === 0, 'a non-adjacent pair is rejected');
ok('B2.4', TR.recordOutcome(1, 5, true) === false && TR.recordOutcome(5, 1, true) === false, 'an isolated node is rejected in both directions');
ok('B2.5', TR.recordOutcome(1, 1, true) === false, 'a self-pair is rejected');
ok('B2.6', TR.recordOutcome(null, 2, true) === false && TR.recordOutcome(1, undefined, true) === false && TR.recordOutcome(99, 2, true) === false,
  'null, undefined and unknown ids are rejected');
TR.clear();
TR.recordOutcome(1, 2, true);
ok('B2.7', TR.recordFor(2, 1).a === 0, 'the key is DIRECTED: 1->2 does not populate 2->1');

// ---- B3 outcome accounting ----------------------------------------------------------------------------
section('B3  outcome accounting');
TR.clear();
for (const okness of [true, false, false, true, false]) TR.recordOutcome(2, 3, okness);
const e = TR.recordFor(2, 3);
ok('B3.1', e.a === 5 && e.s === 2, `every event increments a, only a true outcome increments s (a=${e.a}, s=${e.s})`);
TR.clear();
TR.recordOutcome(3, 4, 'yes'); TR.recordOutcome(3, 4, 1); TR.recordOutcome(3, 4, {});
const t = TR.recordFor(3, 4);
ok('B3.2', t.a === 3 && t.s === 0, 'a truthy non-boolean cannot manufacture a success');
let inv = true;
TR.clear();
for (let i = 0; i < 200; i++) { TR.recordOutcome(1, 4, i % 3 === 0); const r = TR.recordFor(1, 4); if (!(r.a >= r.s && r.s >= 0 && Number.isInteger(r.a))) inv = false; }
ok('B3.3', inv && TR.recordFor(1, 4).a === 200 && TR.recordFor(1, 4).s === 67, 's <= a holds at every step over 200 events');
ok('B3.4', TR.recordFor(4, 3).a === 0 && TR.recordFor(4, 3).s === 0, 'an unobserved edge reads { a: 0, s: 0 }');

// ---- B4 writer isolation ------------------------------------------------------------------------------
section('B4  writer isolation');
// B4.1 asks the real question: how many EXECUTABLE calls of the traversalRecord writer exist outside
// this verifier? Comments and string literals are removed before matching (a verifier that searches for
// the call text would otherwise count itself), and the local import alias is resolved per file, so a
// second writer under any name is still caught.
const SELF_REL = 'experiments/boundary/verify.js';
function codeOf(src) {                                   // strip comments, then string/template contents
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))   // keep line numbering intact
    .replace(/^[ \t]*\/\/.*$/gm, ' ')            // [ \t] not \s: \s would eat newlines and shift line numbers
    .replace(/([;{}),])[ \t]*\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, (m) => '``' + m.replace(/[^\n]/g, ''));   // keep line numbering intact
}
function writerCallsIn(rel, srcRaw) {                    // -> [{ file, line }] executable writer calls
  const src = codeOf(srcRaw);
  if (!/traversalRecord\.js/.test(srcRaw)) return [];
  const aliases = new Set();
  // [^}] not [\s\S]*?: a lazy cross-statement capture would swallow OTHER imports' names
  // (main.js also imports a recordOutcome from motivationalState.js) and match the wrong call
  for (const m of srcRaw.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*traversalRecord\.js["']/g))
    for (const part of m[1].split(',')) {
      const [orig, as] = part.split(/\s+as\s+/).map(s => s.trim());
      if (orig === 'recordOutcome') aliases.add((as || orig).trim());
    }
  for (const m of srcRaw.matchAll(/import\s*\*\s*as\s+([\w$]+)\s*from\s*["'][^"']*traversalRecord\.js["']/g))
    aliases.add(`${m[1]}.recordOutcome`);
  const hits = [];
  for (const alias of aliases) {
    const re = new RegExp(`(?<![\\w$.])${alias.replace('.', '\\.')}\\s*\\(`, 'g');
    src.split('\n').forEach((line, i) => { if (re.test(line)) hits.push({ file: rel, line: i + 1 }); re.lastIndex = 0; });
  }
  return hits;
}
const tracked = git('ls-files', '*.js', '*.mjs').trim().split('\n').filter(f => f && f !== SELF_REL);
const writeCalls = tracked.flatMap(f => writerCallsIn(f, read(f)));
// self-test: the predicate must count a genuine second writer, and must NOT count prose about one
const SYNTH_IMPORT = 'import { recordOutcome as recordTraversalOutcome } from "./render/traversalRecord.js";\n';
const synthSecond = writerCallsIn('synthetic.js', SYNTH_IMPORT + 'function sneak(){ recordTraversalOutcome(1, 2, true); }\nrecordTraversalOutcome(3, 4, false);\n');
const synthAlias = writerCallsIn('synthetic.js', 'import { recordOutcome as logIt } from "../render/traversalRecord.js";\nlogIt(1, 2, true);\n');
const synthProse = writerCallsIn('synthetic.js', SYNTH_IMPORT + '// recordTraversalOutcome(1, 2, true) is called elsewhere\nconst s = "recordTraversalOutcome(1, 2, true);";\n');
ok('B4.1', writeCalls.length === 1 && writeCalls[0].file === 'main.js'
  && synthSecond.length === 2 && synthAlias.length === 1 && synthProse.length === 0,
  `exactly one executable writer call outside the verifier: ${writeCalls.map(h => h.file + ':' + h.line).join(', ') || 'none'}`
  + ` | self-test: 2 synthetic writers detected (${synthSecond.length}), renamed alias detected (${synthAlias.length}), comment+string prose ignored (${synthProse.length})`);
const importers = [...tracked, SELF_REL].filter(f => /from\s*["'][^"']*traversalRecord\.js["']/.test(read(f)));
ok('B4.2', [...new Set(importers)].every(f => f === 'main.js' || f.startsWith('experiments/')), `production importers: ${[...new Set(importers)].join(', ')}`);
for (const f of ['render/episodeManager.js', 'render/trustMemory.js', 'render/longTermConsolidation.js', 'render/semanticProvenance.js', 'render/qlearning.js'])
  ok('B4.3', !read(f).includes('traversalRecord'), `${f} cannot reach the record`);
ok('B4.4', !/rewards|penalties|curiosityMap|writeReward|growReward|recordSuccess|recordAttempt|_updateTrust/.test(MOD_CODE),
  'the module references no reward, penalty, curiosity or trust writer');

// ---- B5 M7 compatibility ------------------------------------------------------------------------------
section('B5  M7 compatibility');
const diff = git('diff', BASE, '--', 'main.js');
const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const removedLines = diff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
ok('B5.1', removedLines.length === 0, `the main.js change is purely additive (${addedLines.length} added, ${removedLines.length} removed)`);
ok('B5.2', git('diff', '--name-only', BASE, '--', 'render/trustMemory.js', 'experiments/m7', 'render/episodeManager.js').trim() === '',
  'trustMemory, episodeManager and the whole M7 tree are byte-identical to base');
ok('B5.3', addedLines.every(l => !/__M7_|env\.attempt|recordTraversal\(|getPathTrust/.test(l.slice(1)) || /recordTraversalOutcome|boundary/i.test(l)),
  'no added line alters M7 wiring');
ok('B5.4', !/liveRng|rng\(|Math\.random/.test(MOD) && !addedLines.some(l => /liveRng|Math\.random/.test(l)),
  'no RNG is consumed by the module or by the added lines');

// ---- B6 persistence -----------------------------------------------------------------------------------
section('B6  persistence');
ok('B6.1', git('diff', BASE, '--', 'main.js').split('\n').every(l => !/^[+-]\s*(traversal|record)/i.test(l) || !/saveBrain|loadBrain/.test(l)),
  'no change inside saveBrain/loadBrain');
const save = MAIN.slice(MAIN.indexOf('function saveBrain()'), MAIN.indexOf('function loadBrain()'));
ok('B6.2', !/traversalRecord|recordTraversalOutcome|recordFor/.test(save), 'saveBrain does not serialize the record');
const load = MAIN.slice(MAIN.indexOf('function loadBrain()'), MAIN.indexOf('function loadBrain()') + 4000);
ok('B6.3', !/traversalRecord|recordFor/.test(load), 'loadBrain does not restore the record');
ok('B6.4', !/localStorage|JSON\.stringify|JSON\.parse/.test(MOD_CODE), 'the module itself has no persistence path');
TR.clear();
ok('B6.5', TR.recordFor(1, 2).a === 0 && digest() === (TR.clear(), digest()), 'clear() empties the record');

// ---- B7 read-only boundary ----------------------------------------------------------------------------
section('B7  read-only consumer boundary');
TR.clear(); TR.recordOutcome(1, 2, true);
const handed = TR.recordFor(1, 2);
handed.a = 999; handed.s = -5;
ok('B7.1', TR.recordFor(1, 2).a === 1 && TR.recordFor(1, 2).s === 1, 'mutating a returned record does not alter stored state');
ok('B7.2', TR.recordFor(1, 2) !== TR.recordFor(1, 2), 'each read returns a fresh copy');
ok('B7.3', Object.keys(TR).sort().join(',') === 'clear,recordFor,recordOutcome', `the module exports exactly clear, recordFor, recordOutcome (${Object.keys(TR).sort().join(',')})`);
ok('B7.4', !/export (const|let|var) record|export \{[^}]*record[^F]/.test(MOD_CODE), 'the map itself is never exported');

// ---- B8/B9/B10 forbidden inputs -----------------------------------------------------------------------
section('B8-B10  forbidden inputs');
ok('B8.1', !/trueP|expectedCostToGoal|pPhase|\bp\[|oracle/i.test(MOD_CODE), 'no oracle or environment probability reachable');
ok('B9.1', !/curiosity|qlearning|getQ|\bQ\b|recentMemory|thoughtTrail|lastDecision|agentCurrent|agentLast|episod/i.test(MOD_CODE),
  'no curiosity, Q-value, decision-state history or episode data');
ok('B10.1', !/Date\.now|performance\.now|setInterval|setTimeout|tick|__M7_|__MFW_|globalThis/.test(MOD_CODE),
  'no clock, timer, tick counter or instrumentation global');
ok('B10.2', (MOD.match(/^import .*$/gm) || []).join('|') === 'import { findNeuronById } from "./search.js";',
  'the only import is the graph adjacency lookup');

// ---- B11 deterministic aggregation --------------------------------------------------------------------
section('B11  deterministic aggregation');
const seq = [[1, 2, true], [2, 3, false], [1, 2, false], [3, 4, true], [2, 3, true], [1, 4, false]];
const play = (order) => { TR.clear(); for (const i of order) TR.recordOutcome(...seq[i]); return digest(); };
const d1 = play([0, 1, 2, 3, 4, 5]), d2 = play([0, 1, 2, 3, 4, 5]);
ok('B11.1', d1 === d2, 'the same event sequence yields an identical state digest');
ok('B11.2', play([3, 5, 1, 0, 4, 2]) === d1, 'reordering events across independent edges does not change per-key counts');
TR.clear(); TR.recordOutcome(1, 2, true); TR.recordOutcome(1, 2, false);
const ab = TR.recordFor(1, 2);
TR.clear(); TR.recordOutcome(1, 2, false); TR.recordOutcome(1, 2, true);
ok('B11.3', JSON.stringify(ab) === JSON.stringify(TR.recordFor(1, 2)), 'per-edge counts are order-independent (pure counting)');

// ---- B12 no mutation by a consumer --------------------------------------------------------------------
section('B12  no mutation by the consumer');
TR.clear(); for (const s of seq) TR.recordOutcome(...s);
const before = digest();
for (let i = 0; i < 50; i++) for (const u of nb.keys()) for (const v of nb.keys()) if (u !== v) TR.recordFor(u, v);
ok('B12.1', digest() === before, 'exhaustive reading leaves the record byte-identical');
ok('B12.2', !MAIN.includes('recordFor('), 'nothing in production reads the record yet — it is write-only in this milestone');

// ---- A: behaviour identity ----------------------------------------------------------------------------
section('A  behaviour identity (structural)');
const codeAdded = addedLines.map(l => l.slice(1)).filter(l => l.trim() && !/^\s*(\/\/|\*|\/\*)/.test(l));
ok('A1', codeAdded.length === 8, `exactly ${codeAdded.length} added CODE lines in main.js: a 4-line import block, a 3-line guarded call, one clear-hook call`);
ok('A2', codeAdded.every(l => /^import \{$|^\} from "\.\/render\/traversalRecord\.js";$|recordOutcome as recordTraversalOutcome,$|clear as clearTraversalRecord,$|^if \(next !== null && !_goalResetJustHappened\) \{$|^recordTraversalOutcome\(_m7From, _m7To, _m7Traversed\);$|^\}$|^clearTraversalRecord\(\);$/.test(l.trim())),
  'every added code line belongs to the boundary write, the import or the clear hook');
ok('A3', git('diff', '--name-only', BASE, '--', 'render/planning.js').trim() === '' && !/liveFutureBonus|imaginedFuture \* 4/.test(codeAdded.join('\n')),
  'FutureScore and the projection are untouched');
ok('A4', TR.recordOutcome(1, 2, true) === true && typeof TR.recordOutcome(1, 2, true) === 'boolean',
  'the writer returns a discarded boolean and can influence nothing else');

// ---- G: G9 lineage -------------------------------------------------------------------------------------
section('G  G9 lineage');
const g9 = fs.readFileSync(path.join(ROOT, 'experiments/phase1_0/verify_G9.js'));
ok('G1', crypto.createHash('sha256').update(g9).digest('hex') === '41bfdcde7c057a9886a009edbde7ff6f36f0b444acf60b6717fb809239b8b2c1',
  'historical verify_G9.js is byte-identical');
ok('G2', git('diff', '--name-only', BASE, '--', 'experiments/phase1_0/verify_G9.js').trim() === '', 'verify_G9.js not modified in this milestone');
const note = read('experiments/phase1_0/G9_LINEAGE_NOTE_01.md');
ok('G3', /IS NOT MODIFIED/.test(note) && note.includes('traversalRecord.js') && /Not an erratum/i.test(note),
  'the lineage note documents the intentional render-surface expansion');
let succ = '';
try { succ = execFileSync(process.execPath, [path.join(ROOT, 'experiments/phase1_0/verify_G9_successor.js')], { cwd: ROOT, encoding: 'utf8' }); } catch (err) { succ = String(err.stdout || ''); }
ok('G4', /G9 SUCCESSOR GREEN/.test(succ), 'the successor gate passes: surface == G9 + the announced module');
ok('G5', /verify_fs_v23\.js/.test(note) && /verify_fs_boundary_design\.js/.test(note) && /retired as (a )?running assertion/.test(note)
  && git('diff', '--name-only', BASE, '--', 'research/preregistrations').trim() === '',
  'the note records the superseded milestone scope gates; no historical verifier edited');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

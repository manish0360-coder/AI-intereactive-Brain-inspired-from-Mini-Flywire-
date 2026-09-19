// ==========================================================
// FUTURESCORE V2.2 GATE — frozen input / learned-cost contract
// ==========================================================
// Specification-only milestone. Re-derives every source claim of the contract from the current files,
// checks that all 23 frozen decisions and the normative evidence-source wording are recorded, and checks
// that the milestone changes nothing but its own documentation. Nothing is run, no seed is evaluated.
//
// Scope check is lineage-aware: before commit it inspects the working tree against HEAD; after commit it
// inspects the single commit that ADDED the contract, so later milestones do not invalidate it.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC_REL = 'research/preregistrations/FUTURESCORE_V2_2_INPUT_CONTRACT.md';
const NOTE_REL = 'research/cognitive-audit/M7_LINEAGE_NOTE_01.md';
const SELF_REL = 'research/preregistrations/verify_fs_v22.js';
const MILESTONE = [DOC_REL, NOTE_REL, SELF_REL].sort();
const BASE = '523ec38cc3516614ef9791ef3719fb81ec59dd43';          // M40-P1
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

let checks = 0, fails = 0;
const ok = (id, cond, msg) => { checks++; if (!cond) fails++; console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`); return cond; };
const section = (t) => console.log(`\n-- ${t} ${'-'.repeat(Math.max(0, 74 - t.length))}`);

console.log('='.repeat(78)); console.log('  FUTURESCORE V2.2 GATE — frozen input / learned-cost contract'); console.log('='.repeat(78));

// ---- S: source anchors cited by the contract (read at BASE, so later code edits do not rewrite history) ---
section('S  source anchors at base 523ec38');
const atBase = (f) => git('show', `${BASE}:${f}`).replace(/\r\n/g, '\n');
const MAIN = atBase('main.js').split('\n'), EPI = atBase('render/episodeManager.js'), EPIL = EPI.split('\n');
const TRUST = atBase('render/trustMemory.js'), ENV = atBase('experiments/m7/env.js'), RUN = atBase('experiments/m7/run.js');
const at = (L, n, t) => (L[n - 1] || '').includes(t);
const ANCHORS = [
  ['S1', MAIN, 4356, 'if (!globalThis.__M7_CREDIT__ &&', 'legacy attempt writer is M7-guarded (4356)'],
  ['S2', MAIN, 4361, 'recordAttempt(attemptKey);', 'legacy attempt writer at main.js:4361'],
  ['S3', MAIN, 4379, 'recentMemory.push(current);', 'recentMemory is appended with the intended node (4379)'],
  ['S4', MAIN, 4436, 'current === goalNeuronId', 'goal block on the intended move (4436)'],
  ['S5', MAIN, 4473, 'recordAutonomousSuccess(recentMemory, current', 'goal block calls recordAutonomousSuccess (4473)'],
  ['S6', MAIN, 4558, 'if (!globalThis.__M7_CREDIT__) recordSuccess(pathKey);', 'episode-level success writer at main.js:4558'],
  ['S7', MAIN, 4902, '? _m7env.attempt(_m7From, _m7To)', 'the environment decides the outcome (4902)'],
  ['S8', MAIN, 4903, ': true;', 'without the M7 environment every traversal succeeds (4903)'],
  ['S9', MAIN, 4926, '_m7cred.recordTraversal(_m7From, _m7To, _m7Traversed);', 'post-outcome credit site (4926)'],
  ['S10', EPIL, 1092, 'sys.recordSuccess(key);', '_updateTrust writes recordSuccess (episodeManager.js:1092)'],
  ['S11', EPIL, 856, '_updateTrust(episode, auth, quality);', '_runPipeline calls _updateTrust (episodeManager.js:856)'],
];
for (const [id, L, n, t, m] of ANCHORS) ok(id, at(L, n, t), m);
const iAttempt = MAIN.findIndex(l => l.includes('? _m7env.attempt(_m7From, _m7To)'));
ok('S12', [4361, 4379, 4436, 4473, 4558].every(n => n - 1 < iAttempt) && iAttempt < 4925,
  'all legacy/episode writers precede env.attempt; the credit site follows it');
ok('S13', !/__M7_/.test(EPI.replace(/__M7_REPLAY_ONCE__/g, '')), 'episodeManager.js has no M7 credit guard');
ok('S14', /autonomous_success:\s*\{[^}]*trust:\s*1\.00/.test(EPI), 'autonomous_success carries trust authority 1.00');
const save = MAIN.slice(683, 712).join('\n');
ok('S15', MAIN[683].includes('function saveBrain()') && !/pathAttempts|pathSuccesses|trust/i.test(save.replace(/confidence/gi, '')),
  'saveBrain does not persist the trust record');
ok('S16', /if \(!ENABLED \|\| !ACTIVE\) return true;/.test(ENV) && /^import fs from 'node:fs';/m.test(ENV),
  'env.attempt is inert (true) when inactive; env.js is Node-only');
ok('S17', /globalThis\.__M7_CREDIT__ = \{/.test(RUN) && /recordAttempt\(key\);\s*\n\s*if \(succeeded\) recordSuccess\(key\);/.test(RUN)
  && /edgeIndex\(from, to\) === undefined/.test(RUN), '__M7_CREDIT__ is harness-defined, canonical-edge keyed, outcome-conditioned');
ok('S18', /export function recordSuccess\(key\)/.test(TRUST) && /return \(s \+ 1\) \/ \(a \+ 2\);/.test(TRUST),
  'trustMemory is the storage owner; getPathTrust = (s+1)/(a+2)');
const idx = read('index.html');
ok('S19', /<script type="module" src="\.\/main\.js"><\/script>/.test(idx) && !/experiments\/m7/.test(idx), 'the browser app loads main.js and no M7 harness');

// ---- D: the frozen decisions ------------------------------------------------------------------------
section('D  contract content');
const DOC = read(DOC_REL);
const WORDING = 'c_hat is derived solely from a traversal-outcome record written only at the post-outcome decision site, keyed by canonical graph edges, and isolated from every episode-level or pre-outcome writer (including _updateTrust and main.js:4361/4558). In the current production environment every recorded outcome is a success; this is a declared architectural limitation.';
function contentChecks(doc) {
  const row = (n) => (doc.match(new RegExp(`^\\| D${n} \\|(.*)$`, 'm')) || [, ''])[1];
  const R = {
    D1: /learned traversal-cost evidence/.test(row(1)),
    D2: /`rewards`.*`penalties`.*`curiosityMap`.*NOT/.test(row(2)),
    D3: /AFTER the environment decides/.test(row(3)),
    D4: /trustMemory.*production storage owner/.test(row(4)),
    D5: /narrow production-owned evidence boundary/.test(row(5)),
    D6: /post-outcome decision site/.test(row(6)) && /canonical graph edges/.test(row(6)) && /episode-level and pre-outcome/.test(row(6)) && /read-only/.test(row(6)),
    D7: /_updateTrust/.test(row(7)) && /main\.js:4361/.test(row(7)) && /main\.js:4558/.test(row(7)),
    D8: /Goal-specific episode credit is \*\*NOT\*\*/.test(row(8)),
    D9: /Curiosity is \*\*NOT\*\*/.test(row(9)),
    D10: /Frequency alone is \*\*NOT\*\*/.test(row(10)) && /sample size/.test(row(10)),
    D11: /Successful traversal evidence is \*\*admissible\*\*/.test(row(11)),
    D12: /Failed traversal evidence is \*\*admissible\*\*/.test(row(12)),
    D13: /c_hat_M\(e\) >= 0/.test(row(13)),
    D14: /epsilon_M\(e\) = -c_hat_M\(e\) <= 0/.test(row(14)),
    D15: /goal-agnostic/.test(row(15)) && /T_M\(v,g\)/.test(row(15)),
    D16: /forbidden at runtime/.test(row(16)) && /`p`/.test(row(16)) && /expectedCostToGoal/.test(row(16)) && /oracle-derived/.test(row(16)),
    D17: /Curiosity, Q-values, decision-state history and instrumentation/.test(row(17)),
    D18: /read-only, deterministic and mutation-free/.test(row(18)),
    D19: /No goal.*undefined/.test(row(19)),
    D20: /equal to goal.*= 0/.test(row(20)),
    D21: /Disconnected terminal.*-infinity/.test(row(21)),
    D22: /\[-infinity, 0\]/.test(row(22)),
    D23: /always reports traversal success/.test(row(23)) && /only under the M7 experimental environment/.test(row(23)) && /declared architectural limitation/.test(row(23)),
  };
  return { R, wording: doc.includes('> ' + WORDING), frozen: /^\*\*Status:\*\* FROZEN/m.test(doc) };
}
const C = contentChecks(DOC);
ok('D1', Object.values(C.R).every(Boolean), `all 23 frozen decisions recorded${Object.values(C.R).every(Boolean) ? '' : ' — missing ' + Object.keys(C.R).filter(k => !C.R[k]).join(',')}`);
ok('D2', C.wording, 'normative evidence-source wording recorded verbatim');
ok('D3', C.frozen, 'status is FROZEN');
ok('D4', /always reports traversal success/.test(DOC) && /declared architectural limitation/.test(DOC), 'production limitation explicitly documented');
ok('D5', /\*\*Status:\*\* FROZEN/.test(DOC) && /not\*\* begun here/.test(DOC), 'V2.3 numerical design is not begun');
const cited = [...DOC.matchAll(/main\.js:(\d+)/g)].map(m => +m[1]);
ok('D6', cited.every(n => n <= MAIN.length), 'every cited main.js line exists at base');
const NOTE = read(NOTE_REL);
ok('D7', /NOTHING HISTORICAL IS MODIFIED/.test(NOTE) && /Not an erratum/i.test(NOTE) && /episodeManager\.js:1082–1101/.test(NOTE) && DOC.includes('M7_LINEAGE_NOTE_01.md'),
  'lineage note recorded, non-erratum, cross-referenced from the contract');

// ---- M: mutation controls (the content check must reject a weakened contract) ------------------------
section('M  mutation controls');
const reject = (doc) => { const c = contentChecks(doc); return !(Object.values(c.R).every(Boolean) && c.wording && c.frozen); };
ok('M1', reject(DOC.replace(/\*\*`episodeManager\._updateTrust`\*\*, /, '')), 'rejects a boundary that no longer excludes _updateTrust');
ok('M2', reject(DOC.replace(/^\| D23 \|.*$/m, '')), 'rejects a contract without the production limitation');
ok('M3', reject(DOC.replace('main.js:4361/4558', 'main.js:4361')), 'rejects an edited normative wording');
ok('M4', reject(DOC.replace('Failed traversal evidence is **admissible**', 'Failed traversal evidence is **inadmissible**')), 'rejects inverted failure admissibility');
ok('M5', reject(DOC.replace('**Status:** FROZEN', '**Status:** DRAFT')), 'rejects a non-frozen status');
ok('M6', !at(MAIN, 4361, 'recordSuccess(pathKey)'), 'anchor check discriminates (4361 is not the success writer)');

// ---- G: scope — only this milestone's documentation changes -----------------------------------------
section('G  scope');
const added = git('log', '--diff-filter=A', '--format=%H', '--', DOC_REL).trim().split('\n').filter(Boolean);
let files, mode;
if (added.length === 1) {
  mode = `commit ${added[0].slice(0, 7)}`;
  files = git('show', '--name-only', '--format=', added[0]).trim().split('\n').filter(Boolean);
  ok('G0', git('rev-parse', `${added[0]}^`).trim() === BASE, 'the contract commit is the direct child of base 523ec38');
} else {
  mode = 'working tree vs HEAD';
  ok('G0', git('rev-parse', 'HEAD').trim() === BASE, 'pre-commit: HEAD is base 523ec38');
  const tracked = git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  const staged = git('diff', '--cached', '--name-only', 'HEAD').trim().split('\n').filter(Boolean);
  files = [...new Set([...tracked, ...staged, ...MILESTONE.filter(f => fs.existsSync(path.join(ROOT, f)))])];
}
files.sort();
ok('G1', JSON.stringify(files) === JSON.stringify(MILESTONE), `${mode}: changes exactly the 3 milestone files${JSON.stringify(files) === JSON.stringify(MILESTONE) ? '' : ' — got ' + files.join(', ')}`);
ok('G2', !files.some(f => /^(main\.js|render\/|index\.html|instrumentation\/)/.test(f)), 'no production code changed');
ok('G3', !files.some(f => f.startsWith('experiments/')), 'no experiment code or data changed');
ok('G4', !files.some(f => /^research\/cognitive-audit\/M7_PREREGISTRATION/.test(f) || /evidence\//.test(f) || /M3[0-9]_|M40_|m40_spec/.test(f)),
  'no historical M7 / M39 / M40 document or evidence changed');
const touchedHist = git('diff', '--name-only', BASE, '--', 'experiments/m7', 'experiments/m39', 'experiments/m40',
  'research/cognitive-audit/M7_PREREGISTRATION.md', 'research/cognitive-audit/M7_PREREGISTRATION.sha256').trim();
ok('G5', touchedHist === '', 'M7 / M39 / M40 evidence trees identical to base');

console.log('\n' + '='.repeat(78));
console.log(`  RESULT: ${checks - fails}/${checks} checks passed — ${fails ? 'FAIL' : 'PASS'}`);
console.log('='.repeat(78));
process.exit(fails ? 1 : 0);

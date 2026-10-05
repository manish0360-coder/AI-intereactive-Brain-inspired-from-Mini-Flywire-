// ==========================================================
// H1-R — D-028 anti-vacuity: N3's C1-count interpretation is exactly as narrow as ruled (gates CTRL, A–H, MUT)
// ==========================================================
// D-028 (research/09_decisions.md): for N3, verify_determinism.js C1 is compared on ID, position, verdict and exit
// code, but not on its fingerprint count. This gate runs copies of the committed N3 implementation,
// experiments/h1r/verify_existing_equivalence.mjs, on evidence cases derived from the existing Milestone-B §11
// evidence (evidence_milestone_b/section11: the main run and its repetitions). Nothing is re-run: each case copies
// that evidence, changes exactly one thing, and states whether N3 must accept it. The cases run under the committed
// implementation (control) and under deliberately over-broad versions of the exemption; each over-broad version must
// give a wrong outcome on at least one case (a mutant that throws is not counted as caught).
//   A  C1 count-only difference accepted      E  exit-code difference rejected
//   B  C1 ID difference rejected               F  non-C1 detail difference rejected
//   C  C1 verdict difference rejected          G  D4 still governed by the pristine-reproducibility rule only
//   D  C1 order difference rejected            H  no other line is matched: C1's other text, the C1 template in
//                                                 another script, a second C1 line
// Works in a temporary directory, reads the repository, writes only experiments/h1r/$H1R_EVIDENCE/d028_gates.json.
//
//   node experiments/h1r/verify_d028.mjs
// ==========================================================
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_REL = 'evidence_milestone_b/section11';
const SRC = path.join(HERE, ...SRC_REL.split('/'));
const EVID = path.join(HERE, process.env.H1R_EVIDENCE || 'evidence_milestone_b');
const IMPL_SRC = fs.readFileSync(path.join(HERE, 'verify_existing_equivalence.mjs'), 'utf8');
const REF = fs.readFileSync(path.join(HERE, 'evidence_r3', 'existing_gates.json'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ROOT = path.join(fs.realpathSync.native(os.tmpdir()), 'mfw-h1r-d028');
fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true });

// ---------------- the source evidence ----------------
const idOf = (line) => line.replace(/^\[?(PASS|FAIL)\]?\s+/, '').split(/\s+/)[0];
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const MAIN_BYTES = fs.readFileSync(path.join(SRC, 'existing_gates.json'));
const REPEAT_NAMES = fs.readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory() && d.name.startsWith('n3_repeat_')).map(d => d.name).sort();
const REPEAT_BYTES = Object.fromEntries(REPEAT_NAMES.map(n => [n, fs.readFileSync(path.join(SRC, n, 'existing_gates.json'))]));
const DET = 'verify_determinism.js';
const row = (rows, s, c) => rows.find(r => r.script === s && r.config === c);
const at = (r, id) => { const i = r.assertions.findIndex(l => idOf(l) === id); if (i < 0) throw new Error(`case: no ${id} line in ${r.script} ${r.config}`); return i; };
const edit = (r, id, f) => { const i = at(r, id), before = r.assertions[i], after = f(before); if (after === before) throw new Error(`case: the edit did not change ${r.script} ${r.config} ${id}`); r.assertions[i] = after; };
const C1T = (n) => `PASS  C1 ANTI-VACUITY: without the repair the SAME test still fails   ${n} distinct fingerprints from 8 identical runs — so A1/B1 are detecting a real property, not an inert test`;

// ---------------- cases: [id, Director letter, change, N3 must accept?, mutate(main rows, repeats {name: rows})] ----------------
const CASES = [
  ['base', 'A', 'the Milestone-B evidence unchanged (C1 prints 7 in three OFF runs and 8 in every pristine run)', true, () => {}],
  ['c1-count', 'A', 'main OFF C1: only the count changes (to 2)', true,
    (m) => edit(row(m, DET, 'off'), 'C1', l => l.replace(/   \d+ distinct fingerprints from /, '   2 distinct fingerprints from '))],
  ['c1-id', 'B', 'main OFF C1: only the ID changes (C1 to C9)', false,
    (m) => edit(row(m, DET, 'off'), 'C1', l => l.replace('  C1 ANTI-VACUITY', '  C9 ANTI-VACUITY'))],
  ['c1-verdict', 'C', 'main OFF C1: the verdict changes (PASS to FAIL, count 1)', false,
    (m) => edit(row(m, DET, 'off'), 'C1', l => l.replace(/^PASS  C1/, 'FAIL  C1').replace(/   \d+ distinct fingerprints from /, '   1 distinct fingerprints from '))],
  ['c1-order', 'D', 'main OFF: C1 and the next assertion swap positions', false,
    (m) => { const r = row(m, DET, 'off'), i = at(r, 'C1'); [r.assertions[i], r.assertions[i + 1]] = [r.assertions[i + 1], r.assertions[i]]; }],
  ['exit', 'E', 'main OFF verify_determinism.js: only the exit code changes (0 to 1)', false,
    (m) => { const r = row(m, DET, 'off'); if (r.exit !== 0) throw new Error('case: OFF exit is not 0'); r.exit = 1; }],
  ['non-c1-detail', 'F', 'main OFF A1 (reproducible): only its detail count changes (1 to 2 distinct fingerprint)', false,
    (m) => edit(row(m, DET, 'off'), 'A1', l => l.replace('1 distinct fingerprint', '2 distinct fingerprint'))],
  ['d4-reproducible', 'G', 'every pristine D4 line made identical (so D4 is reproducible); OFF D4 lines unchanged', false,
    (m, reps) => { const t = row(m, DET, 'pristine').assertions[at(row(m, DET, 'pristine'), 'D4')];
      let changed = 0; for (const rows of Object.values(reps)) { const p = row(rows, DET, 'pristine'); if (!p) continue; const i = at(p, 'D4'); if (p.assertions[i] !== t) changed++; p.assertions[i] = t; }
      if (!changed) throw new Error('case: no pristine D4 line changed'); }],
  ['c1-other-text', 'H', 'main OFF C1: "from 8 identical runs" becomes "from 9 identical runs" (C1 text outside the count)', false,
    (m) => edit(row(m, DET, 'off'), 'C1', l => l.replace('from 8 identical runs', 'from 9 identical runs'))],
  ['c1-name-text', 'H', 'main OFF C1: "still fails" becomes "still failed" (C1 text outside the count)', false,
    (m) => edit(row(m, DET, 'off'), 'C1', l => l.replace('still fails   ', 'still failed   '))],
  ['other-script-template', 'H', 'verify_cap.js (which has its own C1): its C1 line replaced by verify_determinism\'s C1 template, count 8 in pristine and 7 in OFF', false,
    (m) => { const p = row(m, 'verify_cap.js', 'pristine'), o = row(m, 'verify_cap.js', 'off'); p.assertions[at(p, 'C1')] = C1T(8); o.assertions[at(o, 'C1')] = C1T(7); }],
  ['duplicate-c1', 'H', 'main verify_determinism.js: D1 replaced by a second C1-template line, count 8 in pristine and 5 in OFF', false,
    (m) => { const p = row(m, DET, 'pristine'), o = row(m, DET, 'off'); p.assertions[at(p, 'D1')] = C1T(8); o.assertions[at(o, 'D1')] = C1T(5); }],
];
for (const [id, , , , mutate] of CASES) {
  const main = JSON.parse(MAIN_BYTES.toString('utf8')), reps = Object.fromEntries(REPEAT_NAMES.map(n => [n, JSON.parse(REPEAT_BYTES[n].toString('utf8'))]));
  mutate(main, { main, ...reps });
  const dir = path.join(ROOT, 'cases', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'existing_gates.json'), JSON.stringify(main));
  for (const n of REPEAT_NAMES) { fs.mkdirSync(path.join(dir, n)); fs.writeFileSync(path.join(dir, n, 'existing_gates.json'), JSON.stringify(reps[n])); }
}

// ---------------- implementations: the committed one, and over-broad versions of the D-028 exemption ----------------
const MASK_LINE = String.raw`? line.replace(/   \d+ distinct fingerprints from /, '   <N> distinct fingerprints from ') : null);`;
const EQUAL_LINE = 'const d028Equal = (s, a, b) => { const x = d028Masked(s, a); return x !== null && x === d028Masked(s, b); };';
const IDV_LINE = 'if (idOf(l) !== idOf(O[k]) || isFail(l) !== isFail(O[k])) why.push(';
const ONE_LINE = 'const oneC1 = [P, O].every(a => a.filter(l => idOf(l) === D028.id).length === 1);';
const MUTANTS = [
  ['any-script', 'the exemption applies to every script', [['(s === D028.script && idOf(line) === D028.id', '(idOf(line) === D028.id']]],
  ['whole-detail', 'the whole C1 detail is masked, not only the count', [[String.raw`D028.template.test(line)
  ? line.replace(/   \d+ distinct fingerprints from /, '   <N> distinct fingerprints from ')`, String.raw`true
  ? line.replace(/   .*$/, '   <detail>')`]]],
  ['id-only', 'any two C1 lines are equal', [[EQUAL_LINE, 'const d028Equal = (s, a, b) => s === D028.script && idOf(a) === D028.id;']]],
  ['d4-too', 'D4 is exempted as well', [[EQUAL_LINE, "const d028Equal = (s, a, b) => (s === D028.script && idOf(a) === 'D4') || (() => { const x = d028Masked(s, a); return x !== null && x === d028Masked(s, b); })();"]]],
  ['whole-script', 'every line of verify_determinism.js is exempted', [[EQUAL_LINE, 'const d028Equal = (s, a, b) => s === D028.script;']]],
  ['verdict-free', 'the C1 verdict is masked and not compared', [[MASK_LINE, String.raw`? line.replace(/^(?:PASS|FAIL)/, 'VERDICT').replace(/   \d+ distinct fingerprints from /, '   <N> distinct fingerprints from ') : null);`],
    [IDV_LINE, 'if (idOf(l) !== idOf(O[k]) || (isFail(l) !== isFail(O[k]) && !(s === D028.script && idOf(l) === D028.id))) why.push(']]],
  ['exit-free', 'the exit code of verify_determinism.js is not compared', [['if (except.length === 0 && p.exit !== o.exit) why.push(', 'if (except.length === 0 && p.exit !== o.exit && s !== D028.script) why.push(']]],
  ['order-free', 'the assertions of verify_determinism.js are compared as a set', [['const P = p.assertions.filter(l => !except.includes(idOf(l))), O = o.assertions.filter(l => !except.includes(idOf(l)));',
    'const srt = (a) => (s === D028.script ? a.slice().sort() : a); const P = srt(p.assertions.filter(l => !except.includes(idOf(l)))), O = srt(o.assertions.filter(l => !except.includes(idOf(l))));']]],
  ['id-free', 'the C1 ID is not enforced (the ID token is masked too)', [['(s === D028.script && idOf(line) === D028.id', '(s === D028.script'],
    ['  C1 ANTI-VACUITY', String.raw`  \S+ ANTI-VACUITY`], [ONE_LINE, 'const oneC1 = true;'],
    [MASK_LINE, String.raw`? line.replace(/^((?:PASS|FAIL)  )\S+/, '$1<ID>').replace(/   \d+ distinct fingerprints from /, '   <N> distinct fingerprints from ') : null);`],
    [IDV_LINE, 'if ((idOf(l) !== idOf(O[k]) && !(s === D028.script && d028Equal(s, l, O[k]))) || isFail(l) !== isFail(O[k])) why.push(']]],
  ['non-unique', 'the exemption applies when a run has more than one C1 line', [[ONE_LINE, 'const oneC1 = true;']]],
  ['any-run-count', 'the number of runs (8) is masked as well', [['from 8 identical runs', String.raw`from \d+ identical runs`],
    [MASK_LINE, String.raw`? line.replace(/   \d+ distinct fingerprints from \d+/, '   <N> distinct fingerprints from <M>') : null);`]]],
];
function implDir(name, src) {
  const dir = path.join(ROOT, `impl-${name}`);
  fs.mkdirSync(path.join(dir, 'evidence_r3'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'verify_existing_equivalence.mjs'), src);
  fs.writeFileSync(path.join(dir, 'evidence_r3', 'existing_gates.json'), REF);
  return dir;
}
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.toUpperCase() !== 'H1R_EVIDENCE'));
function runCase(dir, caseId) {
  const out = path.join(ROOT, 'cases', caseId, 'existing_equivalence.json');
  fs.rmSync(out, { force: true });
  const r = spawnSync(process.execPath, [path.join(dir, 'verify_existing_equivalence.mjs')], { cwd: dir, env: { ...ENV, H1R_EVIDENCE: path.join('..', 'cases', caseId) }, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (!fs.existsSync(out)) return { outcome: 'THREW', why: (String(r.stderr).split('\n').find(l => /Error/.test(l)) || `exit ${r.status}`).slice(0, 160) };
  const gates = readJson(out).gates, n3 = gates.find(g => g.id === 'N3');
  return { outcome: n3.status === 'PASS' ? 'ACCEPT' : 'REJECT', n3: n3.evidence, gates };
}

// ---------------- control ----------------
const results = [];
const ok = (id, title, pass, detail) => { results.push({ id, title, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(5)} ${title}\n        ${detail}`); };
const ctlDir = implDir('control', IMPL_SRC);
const CTL = Object.fromEntries(CASES.map(([id]) => [id, runCase(ctlDir, id)]));
const expectOf = (id) => (CASES.find(c => c[0] === id)[3] ? 'ACCEPT' : 'REJECT');
const caseOk = (id) => CTL[id].outcome === expectOf(id);
const why = (id) => { const m = /differences: (.*?); text not reproducible/.exec(CTL[id].n3 || ''); return m ? m[1] : CTL[id].why || ''; };
const rejectedFor = (id, re) => CTL[id].outcome === 'REJECT' && re.test(why(id));

const baseN3 = CTL.base.n3 || '';
const applied = (/D-028 \(C1 count only\): (.*?); G16:/.exec(baseN3) || [])[1] || '';
const expectApplied = [['main', JSON.parse(MAIN_BYTES.toString('utf8'))], ...REPEAT_NAMES.map(n => [n, JSON.parse(REPEAT_BYTES[n].toString('utf8'))])]
  .filter(([, rows]) => { const p = row(rows, DET, 'pristine'), o = row(rows, DET, 'off'); return p && o && p.assertions[at(p, 'C1')] !== o.assertions[at(o, 'C1')]; })
  .map(([n]) => `${n} ${DET}: #4 C1`).join(' | ');
const ndDet = ((/text not reproducible between pristine runs \(verdict and ID still compared\): (.*?); D-028/.exec(baseN3) || [])[1] || '').split('; ').filter(x => x.startsWith(DET));

ok('CTRL', 'control: a byte-identical copy of the committed implementation gives the expected outcome in all 12 cases, and on the unchanged evidence every gate of verify_existing_equivalence passes',
  sha(fs.readFileSync(path.join(ctlDir, 'verify_existing_equivalence.mjs'))) === sha(Buffer.from(IMPL_SRC, 'utf8')) && CASES.every(([id]) => caseOk(id))
    && CTL.base.gates.every(g => g.status === 'PASS' || g.status === 'INFO'),
  CASES.map(([id]) => `${id}:${CTL[id].outcome}`).join(' '));
ok('A', 'a C1 count-only difference is accepted: the real evidence (D-028 applied exactly where the pristine and OFF C1 lines differ) and a synthetic count of 2',
  CTL.base.outcome === 'ACCEPT' && CTL['c1-count'].outcome === 'ACCEPT' && applied === expectApplied && expectApplied.length > 0,
  `applied: ${applied || 'none'}`);
ok('B', 'a C1 ID difference is rejected (id/verdict)', rejectedFor('c1-id', /#4 C1: id\/verdict/), why('c1-id'));
ok('C', 'a C1 verdict difference is rejected (id/verdict)', rejectedFor('c1-verdict', /#4 C1: id\/verdict/), why('c1-verdict'));
ok('D', 'a C1 order difference is rejected (id/verdict at both swapped positions)', rejectedFor('c1-order', /#4 C1: id\/verdict.*#5 C2: id\/verdict/), why('c1-order'));
ok('E', 'an exit-code difference is rejected', rejectedFor('exit', /verify_determinism\.js: exit 0\/1/), why('exit'));
ok('F', 'a non-C1 detail difference (A1, reproducible) is rejected', rejectedFor('non-c1-detail', /#0 A1: text/), why('non-c1-detail'));
ok('G', 'D4 is unchanged: on the real evidence its text is the only non-reproducible verify_determinism.js line (verdict and ID still compared), and once every pristine D4 line is identical an OFF D4 difference is rejected',
  JSON.stringify(ndDet) === JSON.stringify([`${DET} D4`]) && rejectedFor('d4-reproducible', /D4: text/), `non-reproducible: ${ndDet.join('; ')}; d4-reproducible: ${why('d4-reproducible').slice(0, 120)}`);
ok('H', 'the exemption matches no other line: C1 text outside the count, the C1 template in another script, and a second C1 line are all rejected',
  rejectedFor('c1-other-text', /#4 C1: text/) && rejectedFor('c1-name-text', /#4 C1: text/) && rejectedFor('other-script-template', /verify_cap\.js: #\d+ C1: text/) && rejectedFor('duplicate-c1', /#\d+ C1: text/),
  ['c1-other-text', 'c1-name-text', 'other-script-template', 'duplicate-c1'].map(id => `${id}: ${why(id).slice(0, 90)}`).join(' || '));

// ---------------- mutants ----------------
const mutantResults = [];
for (const [id, what, edits] of MUTANTS) {
  let src = IMPL_SRC, bad = null;
  for (const [a, b] of edits) { const n = src.split(a).length - 1; if (n !== 1) { bad = `ANCHOR ${n}`; break; } src = src.replace(a, () => b); }
  if (bad) { mutantResults.push({ id, what, outcome: bad, caughtBy: [] }); continue; }
  const dir = implDir(id, src);
  const outs = Object.fromEntries(CASES.map(([c]) => [c, runCase(dir, c)]));
  const threw = Object.entries(outs).filter(([, o]) => o.outcome === 'THREW').map(([c]) => c);
  const caughtBy = CASES.map(([c]) => c).filter(c => outs[c].outcome !== 'THREW' && outs[c].outcome !== expectOf(c));
  mutantResults.push({ id, what, outcome: threw.length ? `THREW (${threw.join(',')})` : caughtBy.length ? 'CAUGHT' : 'NOT CAUGHT', caughtBy });
}
ok('MUT', `anti-vacuity: each of ${MUTANTS.length} deliberately over-broad versions of the exemption gives a wrong N3 outcome on at least one case`,
  mutantResults.every(m => m.outcome === 'CAUGHT'), mutantResults.map(m => `${m.id}:${m.outcome === 'CAUGHT' ? m.caughtBy.join('+') : m.outcome}`).join(' '));

fs.rmSync(ROOT, { recursive: true, force: true });
const pass = results.filter(r => r.pass).length, fail = results.length - pass;
fs.mkdirSync(EVID, { recursive: true });
fs.writeFileSync(path.join(EVID, 'd028_gates.json'), JSON.stringify({
  schema: 'h1r.d028-gates/1', generatedBy: 'experiments/h1r/verify_d028.mjs', implementation: 'experiments/h1r/verify_existing_equivalence.mjs',
  implementationSha256: sha(Buffer.from(IMPL_SRC, 'utf8')),
  sourceEvidence: { dir: `experiments/h1r/${SRC_REL}`, mainSha256: sha(MAIN_BYTES), repeats: Object.fromEntries(REPEAT_NAMES.map(n => [n, sha(REPEAT_BYTES[n])])) },
  cases: CASES.map(([id, letter, change, accept]) => ({ id, letter, change, expected: accept ? 'ACCEPT' : 'REJECT', control: CTL[id].outcome, differences: why(id) })),
  mutants: mutantResults, pass, fail, results }, null, 1) + '\n');
console.log(`\nD-028 GATE: ${pass}/${results.length} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;

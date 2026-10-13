// ==========================================================
// M-REG-1 — LEGACY-REGISTRY IMPORT ISOLATION GATE (verifier)
// ==========================================================
//   node experiments/registry/verify_import_isolation.js [--strict-untracked]
// Exit 0 iff every check passed and every mutant of the scanner was caught.
//
// 1. Scanner unit tests: static imports, re-exports, dynamic and require literals, import.meta.resolve, every
//    spelling in import_isolation.js, indirect loads, composed literals, and the false-positive controls
//    (comments, look-alike names, other directories, strings).
// 2. Scope tests: path-segment boundary of the H1-R scope, the exact layer file, the exact baseline file+hash.
// 3. Gate over the REAL repository (tracked files binding; untracked reported), plus an injected forbidden import.
// 4. Source mutants of import_isolation.js: one safeguard removed each; the matching test must fail.
//
// No literal path of the legacy registry appears in this file: every fixture is built from LEGACY_REGISTRY, so this
// verifier cannot trip the gate it tests. Nothing here reads or writes a registry record.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as IS from './import_isolation.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..');
const STRICT = process.argv.includes('--strict-untracked');
let passed = 0, failed = 0, caught = 0, missed = 0;
const check = (id, name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' :: ' + detail : ''}`); };
const mutantResult = (id, name, ok, detail = '') => { if (ok) caught++; else missed++; console.log(`${ok ? 'MUTANT-CAUGHT' : 'MUTANT-MISSED'} [${id}] ${name}${detail ? ' :: ' + detail : ''}`); };

// ---- fixtures built from the exported constant --------------------------------------------------------------------
const LEG = IS.LEGACY_REGISTRY, BASE = LEG.slice(LEG.lastIndexOf('/') + 1), REG_DIR = LEG.slice(0, LEG.lastIndexOf('/'));
const REL = '../' + REG_DIR.split('/').slice(1).join('/') + '/' + BASE;            // from experiments/<dir>/x.js
const SP = {
  root: LEG, rel: REL, abs: '/srv/work/' + LEG, url: 'file:///C:/work/' + LEG,
  win: 'C:\\work\\' + LEG.replace(/\//g, '\\'),
  dup: REL.replace(/\//g, '//'), dots: './../' + REG_DIR.split('/').slice(1).join('/') + '/./' + BASE, detour: '../x/' + '../' + REG_DIR.split('/').slice(1).join('/') + '/' + BASE,
  query: REL + '?v=2', hash: REL + '#frag', upper: REL.toUpperCase().replace(/\.JS$/, '.js').replace(/^\.\.\//, '../'),
  uni: REL.replace(BASE, '\\u0074' + BASE.slice(1)), hex: REL.replace(BASE, '\\x74' + BASE.slice(1)),
};
const FROM = 'experiments/newstudy/run.js';                                        // a non-permitted path
const hardKinds = (src, from = FROM) => IS.scanSource(from, src).hard.map(h => h.kind);
const flagged = (src, from = FROM) => IS.scanSource(from, src).hard.length > 0;
const q = (s) => "'" + s.replace(/\\/g, '\\\\') + "'";                              // a JS string literal for the fixture text

// ---- test registry: id -> { desc, fn(IS) -> boolean } -----------------------------------------------------------------
const T = new Map();
const def = (id, desc, fn) => T.set(id, { id, desc, fn });
const pos = (id, desc, src, kindExpect) => def(id, `detects ${desc}`, (M) => { const r = M.scanSource(FROM, src); return r.hard.length > 0 && (!kindExpect || r.hard.some(h => h.kind === kindExpect)); });
const neg = (id, desc, src, from = FROM) => def(id, `does not flag ${desc}`, (M) => M.scanSource(from, src).hard.length === 0);

pos('P01', 'static named import (relative)', `import { trajectory } from ${q(SP.rel)};`, 'static');
pos('P02', 'static namespace import', `import * as R from ${q(SP.rel)};`, 'static');
pos('P03', 'side-effect import', `import ${q(SP.rel)};`, 'static-sideeffect');
pos('P04', 'multi-line named import', `import {\n  trajectory,\n  config as c,\n} from\n  ${q(SP.rel)};`, 'static');
pos('P05', 'export * re-export', `export * from ${q(SP.rel)};`, 'reexport');
pos('P06', 'named re-export', `export { trajectory, config } from ${q(SP.rel)};`, 'reexport');
pos('P07', 'namespaced re-export', `export * as R from ${q(SP.rel)};`, 'reexport');
pos('P08', 'dynamic import with a string literal', `const R = await import(${q(SP.rel)});`, 'dynamic-literal');
pos('P09', 'dynamic import with a template literal without substitutions', 'const R = await import(`' + SP.rel + '`);', 'dynamic-literal');
pos('P10', 'dynamic import with attributes (second argument)', `await import(${q(SP.rel)}, { with: {} });`, 'dynamic-literal');
pos('P11', 'require with a literal', `const R = require(${q(SP.rel)});`, 'require-literal');
pos('P12', 'import.meta.resolve with a literal', `const u = import.meta.resolve(${q(SP.rel)});`, 'meta-resolve');
pos('P13', 'root-relative literal in a dynamic import', `await import(${q(SP.root)});`);
pos('P14', 'absolute POSIX path', `await import(${q(SP.abs)});`);
pos('P15', 'Windows backslash path', `await import(${q(SP.win)});`);
pos('P16', 'file: URL', `await import(${q(SP.url)});`);
pos('P17', 'duplicate separators', `import x from ${q(SP.dup)};`);
pos('P18', 'dot segments', `import x from ${q(SP.dots)};`);
pos('P19', 'a detour through a parent directory', `import x from ${q(SP.detour)};`);
pos('P20', 'a ?query suffix (a separate module instance of the same file)', `import x from ${q(SP.query)};`);
pos('P21', 'a #hash suffix', `import x from ${q(SP.hash)};`);
pos('P22', 'mixed case spelling', `import x from ${q(SP.upper)};`);
pos('P23', 'a \\u escape inside the literal', `import x from ${q(SP.uni).replace(/\\\\u/g, '\\u')};`);
pos('P24', 'a \\x escape inside the literal', `import x from ${q(SP.hex).replace(/\\\\x/g, '\\x')};`);
pos('P25', 'a literal passed through a computed dynamic import (indirect)', `const R = await import(pathToFileURL(path.join(ROOT, ${q(SP.root)})).href);`, 'indirect');
pos('P26', 'a composed path.join argument list (indirect-composed)', `const R = await import(pathToFileURL(path.join(ROOT, 'experiments', 'registry', ${q(BASE)})).href);`, 'indirect-composed');
pos('P27', 'a + concatenation of literals feeding a computed load', `const p = ${q(REG_DIR + '/')} + ${q(BASE)}; const R = await import(pathToFileURL(p).href);`, 'indirect-composed');
pos('P28', 'an import after a comment and a regex literal containing quotes', `/* header */ const re = /['"]/g;\nimport x from ${q(SP.rel)};`);
pos('P29', 'an import inside a template-literal expression', 'const s = `${await import(' + q(SP.rel) + ')}`;');
pos('P30', 'the block-blind legacy alias outside the registry directory', `import { legacyTrajectory } from '../registry/typed_v2.js'; legacyTrajectory.checkUse(a, b);`, 'legacy-alias');
pos('P32', 'a percent-encoded file: URL (%74 for t, %2E for .)', `await import(${q('file:///C:/work/' + REG_DIR + '/%74' + BASE.slice(1).replace('.', '%2E'))});`);
pos('P31', 'a createRequire load with a literal path', `const r = createRequire(import.meta.url); r(${q(SP.rel)});`);
neg('N01', 'an import of the block-aware layer', `import { trajectory } from '../registry/typed_v2.js';`);
neg('N02', 'a look-alike extension (.json)', `import x from '../registry/${BASE.replace(/\.js$/, '.json')}';`);
neg('N03', 'a look-alike filename that merely ends with the base name', `import x from './pro${BASE}';`);
neg('N04', 'a different file with the same base name in another directory', `import x from '../other/${BASE}';`);
neg('N05', 'a directory named like the file', `import x from '../registry/${BASE}/index.js';`);
neg('N06', 'an import inside a line comment', `// import x from ${q(SP.rel)};\nconst a = 1;`);
neg('N07', 'an import inside a block comment', `/* import x from ${q(SP.rel)}; */\nconst a = 1;`);
neg('N08', 'import syntax inside an ordinary string', `const s = "import x from ${SP.rel.replace(/"/g, '')}";`);
neg('N09', 'a .bak suffix', `import x from ${q(SP.rel + '.bak')};`);
neg('N10', 'an unrelated identifier named typed', `const typed = 1; export { typed };`);
neg('N11', 'a mention in a file with no loader construct (reported as a mention)', `const PROTECTED = [${q(SP.root)}, 'main.js'];`);
def('N12', 'does not flag a legacy alias name inside the registry directory (oracle use by tests)', (M) =>
  M.evaluateGate({ files: [{ path: 'experiments/registry/verify_something.js', text: `import { legacyTrajectory } from './typed_v2.js';` }], baseline: { entries: [] } }).ok);
def('A01', 'refuses the block-blind legacy alias outside the registry directory and accepts it inside', (M) => {
  const src = `import { legacyTrajectory } from '../registry/typed_v2.js'; legacyTrajectory.checkUse(a, b);`;
  const outside = M.evaluateGate({ files: [{ path: 'experiments/newstudy/run.js', text: src }], baseline: { entries: [] } });
  const inside = M.evaluateGate({ files: [{ path: 'experiments/registry/verify_something.js', text: src }], baseline: { entries: [] } });
  return !outside.ok && outside.violations[0].findings.some(f => f.kind === 'legacy-alias') && inside.ok;
});
def('N13', 'reports a path literal in a file without loader constructs as a MENTION only', (M) => { const r = M.scanSource(FROM, `const PROTECTED = [${q(SP.root)}];`); return r.hard.length === 0 && r.mentions.length === 1; });
def('N14', 'a template that cannot be resolved is a loader construct, never silently ignored', (M) => M.scanSource(FROM, 'const R = await import(`./${name}.js`);').loaderConstructs === 1);
def('S01', 'permits the H1-R scope (static import)', (M) => { const g = M.evaluateGate({ files: [{ path: 'experiments/h1r/x.mjs', text: `import x from ${q('../registry/' + BASE)};` }], baseline: { entries: [] } }); return g.ok && g.permitted.length === 1; });
def('S02', 'does not permit look-alike scopes (h1rx, h1r_old, docs/experiments/h1r, a file named h1r.mjs)', (M) => ['experiments/h1rx/x.mjs', 'experiments/h1r_old/x.mjs', 'docs/experiments/h1r/x.mjs', 'experiments/h1r.mjs'].every(p => {
  const g = M.evaluateGate({ files: [{ path: p, text: `import x from ${q(SP.root)};` }], baseline: { entries: [] } }); return !g.ok && g.violations.length === 1; }));
def('S03', 'permits ONLY the exact layer file', (M) => {
  const ok = M.evaluateGate({ files: [{ path: M.LAYER_FILE, text: `export * from ${q('./' + BASE)};` }], baseline: { entries: [] } });
  const bad = ['experiments/registry/typed_v2.mjs', 'experiments/registry/other.js', 'experiments/registry/typed_v2.js.bak'].every(p => !M.evaluateGate({ files: [{ path: p, text: `export * from ${q('./' + BASE)};` }], baseline: { entries: [] } }).ok);
  return ok.ok && ok.layer.length === 1 && bad; });
def('S04', 'treats a scope spelled with backslashes or duplicate separators like the scope', (M) => ['experiments\\h1r\\x.mjs', 'experiments//h1r//x.mjs'].every(p => M.evaluateGate({ files: [{ path: p, text: `import x from ${q(SP.root)};` }], baseline: { entries: [] } }).ok));
const SRC_A = `import { trajectory } from ${q(SP.rel)};\nexport const x = 1;\n`;
const entryFor = (p, text) => ({ path: p, sha256: IS.hashText(text), scope: 'test', reason: 'test' });
def('G01', 'accepts an exact path with the exact content hash (an exception)', (M) => { const g = M.evaluateGate({ files: [{ path: FROM, text: SRC_A }], baseline: { entries: [entryFor(FROM, SRC_A)] } }); return g.ok && g.exceptions.length === 1; });
def('G02', 'refuses the same path with changed content (changed-legacy-consumer)', (M) => { const g = M.evaluateGate({ files: [{ path: FROM, text: SRC_A + '// edit\n' }], baseline: { entries: [entryFor(FROM, SRC_A)] } }); return !g.ok && g.violations[0].reason === 'changed-legacy-consumer'; });
def('G03', 'refuses a file that is not in the baseline (new-consumer)', (M) => { const g = M.evaluateGate({ files: [{ path: FROM, text: SRC_A }], baseline: { entries: [] } }); return !g.ok && g.violations[0].reason === 'new-consumer'; });
def('G04', 'refuses a stale baseline entry whose file no longer references the registry', (M) => { const g = M.evaluateGate({ files: [{ path: FROM, text: 'export const x = 1;\n' }], baseline: { entries: [entryFor(FROM, SRC_A)] } }); return !g.ok && g.stale.length === 1; });
def('G05', 'refuses a stale baseline entry whose file is gone', (M) => { const g = M.evaluateGate({ files: [], baseline: { entries: [entryFor(FROM, SRC_A)] } }); return !g.ok && g.stale.length === 1; });
def('G06', 'hashes with CRLF normalised (a checkout that rewrites line endings keeps the exception)', (M) => { const g = M.evaluateGate({ files: [{ path: FROM, text: SRC_A.replace(/\n/g, '\r\n') }], baseline: { entries: [entryFor(FROM, SRC_A)] } }); return g.ok; });
def('G07', 'reports untracked importers as warnings and fails them only in strict mode', (M) => {
  const lax = M.evaluateGate({ files: [], untracked: [{ path: FROM, text: SRC_A }], baseline: { entries: [] } });
  const strict = M.evaluateGate({ files: [], untracked: [{ path: FROM, text: SRC_A }], baseline: { entries: [] }, strictUntracked: true });
  return lax.ok && lax.untrackedFindings.length === 1 && !strict.ok; });
def('G08', 'an entry is bound by SHA-256 of the text (a different file with the same path and length is not an exception)', (M) => { const other = SRC_A.replace('trajectory', 'trajectorz'); const g = M.evaluateGate({ files: [{ path: FROM, text: other }], baseline: { entries: [entryFor(FROM, SRC_A)] } }); return !g.ok; });

// ---- real repository -------------------------------------------------------------------------------------------------------
const lsz = (...a) => execFileSync('git', ['-C', REPO, 'ls-files', '-z', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean);
const isCode = (f) => IS.SCAN_EXTENSIONS.some(e => f.toLowerCase().endsWith(e));
const tracked = lsz('-c').filter(isCode), untrackedAll = lsz('-o', '--exclude-standard').filter(isCode);
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');
const present = (f) => fs.existsSync(path.join(REPO, f));
const trackedFiles = tracked.filter(present).map(f => ({ path: f, text: read(f) }));
const untrackedFiles = untrackedAll.filter(present).map(f => ({ path: f, text: read(f) }));
const baseline = JSON.parse(read(IS.BASELINE_FILE));

console.log('== scanner unit tests (real implementation) ==');
for (const t of T.values()) { let ok = false, detail = ''; try { ok = t.fn(IS) === true; } catch (e) { detail = 'threw: ' + e.message; } check(t.id, t.desc, ok, detail); }

console.log('\n== gate over the real repository ==');
const gate = IS.evaluateGate({ files: trackedFiles, untracked: untrackedFiles, baseline, strictUntracked: STRICT });
check('R01', `no violation among ${gate.scanned} tracked code files (permitted H1-R ${gate.permitted.length}, legacy exceptions ${gate.exceptions.length}, layer ${gate.layer.length})`,
  gate.violations.length === 0, gate.violations.map(v => `${v.path} [${v.reason}]`).join(' | '));
check('R02', 'no stale baseline entry (every entry still exists, still references the registry, and still matches its hash)', gate.stale.length === 0, gate.stale.map(s => s.path).join(' | '));
check('R03', 'the baseline lists exactly the legacy exceptions found, with a scope and reason for each', gate.exceptions.length === baseline.entries.length && baseline.entries.every(e => e.scope && e.reason && /^[0-9a-f]{64}$/.test(e.sha256)));
check('R04', 'no baseline entry is inside the permitted H1-R scope or names the layer (the list holds only real exceptions)', baseline.entries.every(e => !IS.inPermittedScope(e.path) && e.path !== IS.LAYER_FILE));
const layerText = read(IS.LAYER_FILE), layer = IS.scanSource(IS.LAYER_FILE, layerText);
check('R05', 'the layer file references the legacy registry only by static import and re-export (no dynamic, require or indirect load)', layer.hard.length > 0 && layer.hard.every(h => h.kind === 'static' || h.kind === 'reexport' || h.kind === 'legacy-alias') && layer.loaderConstructs === 0);
const regDirFiles = fs.readdirSync(HERE).filter(isCode).map(f => ({ path: REG_DIR + '/' + f, text: read(REG_DIR + '/' + f) }));
const regViol = regDirFiles.filter(f => f.path !== IS.LAYER_FILE && IS.scanSource(f.path, f.text).hard.some(h => h.kind !== 'legacy-alias'));
check('R06', 'no other file in the registry directory (the data module, the scanner, both verifiers) references the legacy registry', regViol.length === 0, regViol.map(f => f.path).join(' | '));
const injected = IS.evaluateGate({ files: [...trackedFiles, { path: 'experiments/new_consumer/run.mjs', text: `import { trajectory } from ${q('../registry/' + BASE)};` }], baseline });
check('R07', 'an injected forbidden import into the real file set is refused', !injected.ok && injected.violations.some(v => v.path === 'experiments/new_consumer/run.mjs' && v.reason === 'new-consumer'));
const touched = trackedFiles.find(f => f.path === baseline.entries[0].path);
const changed = IS.evaluateGate({ files: trackedFiles.map(f => (f === touched ? { ...f, text: f.text + '\n// changed\n' } : f)), baseline });
check('R08', 'a legacy consumer changed by one comment line stops being an exception', !changed.ok && changed.violations.some(v => v.path === touched.path && v.reason === 'changed-legacy-consumer'));
const warnings = gate.untrackedFindings;
console.log(`INFO untracked files referencing the legacy registry (not part of the committed tree): ${warnings.length}${warnings.length ? ' -> ' + warnings.map(w => w.path).join(', ') : ''}`);
if (STRICT) check('R09', 'strict mode: no untracked file references the legacy registry', warnings.length === 0, warnings.map(w => w.path).join(' | '));

// ---- source mutants of the scanner -------------------------------------------------------------------------------------------
console.log('\n== source mutants of import_isolation.js ==');
const MUT_ROOT = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'reg-iso-mut-'));
const SRC = fs.readFileSync(path.join(HERE, 'import_isolation.js'), 'utf8');
async function loadMutant(id, edits) {
  let src = SRC;
  for (const [find, rep] of edits) {
    const n = src.split(find).length - 1;
    if (n !== 1) throw new Error(`mutant ${id}: anchor matched ${n} times (must be exactly 1): ${find.slice(0, 60)}`);
    src = src.replace(find, () => rep);
  }
  const f = path.join(MUT_ROOT, id + '.js');
  fs.writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}
const MUTANTS = [
  ['query-hash-not-stripped', 'a ?query or #hash suffix is not stripped', ['P20', 'P21'], [["s = s.replace(/[?#].*$/, '').replace(/\\\\/g, '/');", "s = s.replace(/\\\\/g, '/');"]]],
  ['backslashes-not-converted', 'Windows backslashes are not converted', ['P15'], [["s = s.replace(/[?#].*$/, '').replace(/\\\\/g, '/');", "s = s.replace(/[?#].*$/, '');"]]],
  ['case-sensitive', 'the comparison is case sensitive', ['P22'], [["const TARGET = LEGACY_REGISTRY.toLowerCase();", "const TARGET = LEGACY_REGISTRY;"], ["const direct = normalizePath(spec).toLowerCase();", "const direct = normalizePath(spec);"], ["const joined = normalizePath((base ? base + '/' : '') + spec).toLowerCase();", "const joined = normalizePath((base ? base + '/' : '') + spec);"]]],
  ['file-url-not-decoded', 'file: URLs are not handled or decoded', ['P16', 'P32'], [["if (/^file:\\/\\//i.test(s)) {", "if (false) {"]]],
  ['reexport-not-detected', 'export-from is not detected', ['P05', 'P06', 'P07'], [["} else if (t.v === 'export' && nx &&", "} else if (false && t.v === 'export' && nx &&"]]],
  ['dynamic-literal-not-detected', 'import() with a literal is not detected', ['P08', 'P09', 'P13'], [["consider('dynamic-literal', args[0].v, t.line, k + 2);", "void 0;"]]],
  ['require-not-detected', 'require() with a literal is not detected', ['P11'], [["consider('require-literal', args[0].v, t.line, k + 2); else loader++;", "void 0; else loader++;"]]],
  ['composed-not-detected', 'composed literals are not detected', ['P26', 'P27'], [["if (referencesLegacyRegistry(composed, path)) report(composed, toks[k].line, true);", "void 0;"]]],
  ['indirect-not-reported', 'a literal in a file with an unresolvable load is only a mention', ['P25'], [["if (loader > 0) hard.push({ kind, spec, line });", "if (false) hard.push({ kind, spec, line });"]]],
  ['unicode-escape-not-decoded', '\\u escapes are not decoded', ['P23'], [["if (u2) return String.fromCharCode(parseInt(u2, 16));", "if (u2) return m;"]]],
  ['scope-boundary-loosened', 'the H1-R scope matches by string prefix, not by path segment', ['S02'], [["export const PERMITTED_SCOPES = Object.freeze(['experiments/h1r/']);", "export const PERMITTED_SCOPES = Object.freeze(['experiments/h1r']);"]]],
  ['layer-by-prefix', 'the layer exemption matches a prefix', ['S03'], [["if (p === LAYER_FILE) { out.layer.push", "if (p.startsWith('experiments/registry/typed_v2')) { out.layer.push"]]],
  ['baseline-hash-ignored', 'a baseline entry exempts by path only', ['G02', 'G08'], [["if (e && e.sha256 === hashText(f.text)) {", "if (e) {"]]],
  ['stale-not-detected', 'stale baseline entries are not detected', ['G04', 'G05'], [["for (const [p, e] of entries) if (!present.has(p) || !referencing.has(p)) out.stale.push", "for (const [p, e] of []) if (!present.has(p) || !referencing.has(p)) out.stale.push"]]],
  ['crlf-not-normalised', 'line endings are not normalised before hashing', ['G06'], [[".update(String(text).replace(/\\r\\n/g, '\\n'))", ".update(String(text))"]]],
  ['comments-scanned-as-code', 'line comments are tokenised as code', ['N06'], [["if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\\n') i++; continue; }", "if (false) { while (i < n && src[i] !== '\\n') i++; continue; }"]]],
  ['alias-not-detected', 'the block-blind alias names are not detected', ['P30', 'A01'], [["else if (LEGACY_ALIASES.includes(t.v)) hard.push", "else if (false) hard.push"]]],
  ['alias-allowed-everywhere', 'the alias names are allowed in every directory', ['A01'], [["export const ALIAS_SCOPES = Object.freeze(['experiments/registry/']);", "export const ALIAS_SCOPES = Object.freeze(['']);"]]],
  ['untracked-not-reported', 'untracked importers are not reported', ['G07'], [["if (!hard.length || p === LAYER_FILE || inPermittedScope(p)) continue;\n        out.untrackedFindings.push", "if (true) continue;\n        out.untrackedFindings.push"]]],
];
for (const [id, desc, tests, edits] of MUTANTS) {
  let M;
  try { M = await loadMutant(id, edits); } catch (e) { mutantResult('SCAN', `${id}: ${desc}`, false, 'MUTANT COULD NOT BE BUILT: ' + e.message); continue; }
  const results = tests.map(tid => { let ok; try { ok = T.get(tid).fn(M) === true; } catch (e) { ok = 'threw'; } return { tid, ok }; });
  const detected = results.some(r => r.ok !== true);
  mutantResult('SCAN', `${id}: ${desc}`, detected, results.map(r => `${r.tid} ${r.ok === true ? 'PASSED (not caught)' : r.ok === 'threw' ? 'threw' : 'failed as required'}`).join('; '));
}

console.log(`\nRESULT: ${passed} checks passed, ${failed} failed; scanner mutants caught ${caught}, missed ${missed}`);
fs.rmSync(MUT_ROOT, { recursive: true, force: true });
process.exit(failed === 0 && missed === 0 ? 0 : 1);

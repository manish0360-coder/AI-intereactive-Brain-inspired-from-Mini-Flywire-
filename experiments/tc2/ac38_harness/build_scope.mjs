// ==========================================================
// AC38 harness prototype — builds digest_scope.json and rewrite_table.json from pinned source text
// ==========================================================
//   node experiments/tc2/ac38_harness/build_scope.mjs <pinned-tree-dir>
// Static only: no application module is imported.  Fails on anything it cannot classify.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, graph, mask } from './scan_scope.mjs';

const TREE = process.argv[2];
if (!TREE) { console.error('usage: build_scope.mjs <pinned-tree-dir>'); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const read = (rel) => fs.readFileSync(path.join(TREE, rel), 'utf8');
const die = (m) => { console.error(`build_scope: ${m}`); process.exit(1); };

const S = scan(TREE);

// ---- classification ----
const PRIMITIVE = /^(-?[\d.]+(e-?\d+)?|0x[\da-f]+|true|false|null|"[^"]*"|'[^']*')\s*;?\s*(\/\/.*)?$/i;
const EXCLUDED_NAMED = {
  'instrumentation/rng.js#streams': ['stream-closure', 'Values are mulberry32 closures, so a digest could only say "function". Stream positions are measured by the stream spy and the terminal recovery run instead.'],
};
const covered = [], excluded = [];
for (const b of S.bindings) {
  if (b.kind === 'function' || b.kind === 'class') continue;
  const key = `${b.file}#${b.name}`;
  if (EXCLUDED_NAMED[key]) { excluded.push({ file: b.file, name: b.name, line: b.line, kind: b.kind, class: EXCLUDED_NAMED[key][0], reason: EXCLUDED_NAMED[key][1] }); continue; }
  if (b.kind === 'const' && PRIMITIVE.test(b.init)) { excluded.push({ file: b.file, name: b.name, line: b.line, kind: b.kind, class: 'immutable-primitive', reason: 'const bound to a primitive literal: neither the binding nor the value can change.' }); continue; }
  if (b.kind === 'const' && /^(\(.*\)|[A-Za-z_$][\w$]*)\s*=>/.test(b.init)) { excluded.push({ file: b.file, name: b.name, line: b.line, kind: b.kind, class: 'function-binding', reason: 'const bound to an arrow function with no state of its own.' }); continue; }
  covered.push({ file: b.file, name: b.name, line: b.line, kind: b.kind, exported: b.exported });
}

// ---- static checks on the boundary ----
const functions = S.bindings.filter((b) => b.kind === 'function' || b.kind === 'class');
const functionWrites = [];
for (const f of S.files) {
  const m = mask(read(f));
  for (const b of functions.filter((x) => x.file === f)) {
    if (new RegExp(`(^|[^\\w$.])${b.name.replace(/\$/g, '\\$')}(\\.[\\w$]+)?\\s*=[^=>]`, 'm').test(m)) functionWrites.push(`${f}#${b.name}`);
  }
}
const iife = S.bindings.filter((b) => /^\(\s*(\(|function)/.test(b.init)).map((b) => `${b.file}#${b.name}`);

// ---- the bridge-path inventory (contract CL-B) mapped to bindings ----
const INVENTORY = [
  ['transitions', 'render/memory.js', 'transitions'], ['Q', 'render/qlearning.js', 'Q'], ['rewards', 'render/memory.js', 'rewards'],
  ['provenanceLog', 'render/semanticProvenance.js', 'provenanceLog'], ['momentumMemory', 'render/momentumMemory.js', 'momentumMemory'],
  ['neuron embeddings', 'main.js', 'neuronMap'], ['semanticStrength', 'render/semanticVitality.js', 'semanticStrength'],
  ['pathSuccesses', 'render/trustMemory.js', 'pathSuccesses'], ['confidenceMap', 'render/memory.js', 'confidenceMap'],
  ['episodicStore', 'render/episodeManager.js', 'episodicStore'], ['_episodesStoredTotal', 'render/episodeManager.js', '_episodesStoredTotal'],
  ['_episodesSinceConsolidation', 'render/episodeManager.js', '_episodesSinceConsolidation'],
  ['consolidationRegistry', 'render/longTermConsolidation.js', 'consolidationRegistry'], ['stableMemory', 'render/longTermConsolidation.js', 'stableMemory'],
  ['semanticEdges', 'render/semanticMemoryLayer.js', 'semanticEdges'], ['conceptSchemas', 'render/semanticMemoryLayer.js', 'conceptSchemas'],
  ['schemas', 'render/schemaMemory.js', 'schemas'], ['_bonusCache', 'render/schemaMemory.js', '_bonusCache'],
  ['_lastMotifs', 'render/schemaMemory.js', '_lastMotifs'], ['_lastRebuild', 'render/schemaMemory.js', '_lastRebuild'],
];
if (INVENTORY.length !== 20) die('the inventory must have 20 items');
for (const [item, file, name] of INVENTORY) if (!covered.some((c) => c.file === file && c.name === name)) die(`inventory item ${item} is not a covered binding`);

// ---- rewrites: every line keeps its number; appended code goes after the last line ----
const rewrites = [];
const line = (file, n) => read(file).split('\n')[n - 1];
const wrapper = 'export function sealCurrentEpisode(reason = "manual") {';
rewrites.push({ file: 'render/episodicContextEngine.js', line: 338, kind: 'wrapper', anchor: wrapper,
  replace: `${wrapper} return globalThis.__AC38_SEAL__(__ac38_seal_inner__, reason); } function __ac38_seal_inner__(reason) {` });
for (const [file, n, name] of [['main.js', 924, 'bridge_callback'], ['render/episodeManager.js', 284, 'recordAutonomousSuccess'], ['render/episodeManager.js', 710, '_sealBuffer'], ['render/episodeManager.js', 820, '_runPipeline'], ['render/episodeManager.js', 1108, '_storeEpisode']]) {
  const a = line(file, n);
  if (!a.trimEnd().endsWith('{')) die(`${file}:${n} is not a block opener`);
  rewrites.push({ file, line: n, kind: 'probe', name, anchor: a, replace: `${a} globalThis.__AC38_PROBE__("${name}");` });
}
const PRIVATE_LETS = { 'render/episodeManager.js': ['_episodesStoredTotal', '_episodesSinceConsolidation'], 'render/schemaMemory.js': ['_lastMotifs', '_lastRebuild'] };
for (const [file, names] of Object.entries(PRIVATE_LETS)) {
  const masked = mask(read(file)).split('\n');
  masked.forEach((text, i) => {
    for (const name of names) {
      if (i + 1 === S.bindings.find((b) => b.file === file && b.name === name).line) continue;
      if (!new RegExp(`(^|[^\\w$.])(\\+\\+|--)?${name}(\\s*(=[^=]|\\+=|-=)|\\+\\+|--)`).test(text) && !new RegExp(`(\\+\\+|--)${name}\\b`).test(text)) continue;
      const a = line(file, i + 1);
      if (!new RegExp(`^\\s*${name}(\\s*=[^=]|\\+\\+)`).test(a)) die(`${file}:${i + 1} writes ${name} but not at statement start`);
      const site = `${file}:${i + 1}`;
      rewrites.push({ file, line: i + 1, kind: 'let', name, anchor: a, replace: a.replace(/^(\s*)/, `$1globalThis.__AC38_LET__(${JSON.stringify(name)},${JSON.stringify(site)}); `) });
    }
  });
}

const appends = {};
for (const file of [...new Set(covered.map((c) => c.file))]) {
  const names = covered.filter((c) => c.file === file).map((c) => c.name);
  appends[file] = `export function __ac38_read__() { return { ${names.join(', ')} }; }`;
}
appends['render/episodicContextEngine.js'] += '\nexport function __ac38_populate__(nodes, labels) { currentEpisode.nodes = nodes; currentEpisode.labels = labels; }';
appends['instrumentation/rng.js'] = 'export function __ac38_streams__() { return streams; }';
appends['render/episodeManager.js'] += '\nlet __ac38_canary_let__ = 0;\nexport function __ac38_touch_let__() { globalThis.__AC38_LET__("__canary__", "appended"); __ac38_canary_let__++; }';

const sources = {};
for (const f of [...new Set([...S.files, ...graph(TREE, 'experiments/m7/run.js')])].sort()) sources[f] = sha256(fs.readFileSync(path.join(TREE, f)));

const scope = {
  schema: 'tc2/ac38.digest_scope/1',
  tree: path.basename(TREE),
  counts: { moduleGraphFiles: S.files.length, topLevelNonFunctionBindings: covered.length + excluded.length, covered: covered.length, excluded: excluded.length, topLevelFunctionsAndClasses: functions.length, windowGlobals: S.globals.length },
  covered: covered.map(({ file, name, line, kind }) => ({ file, name, line, kind })),
  excluded,
  globals: S.globals,
  inventory: INVENTORY.map(([item, file, binding]) => ({ item, file, binding })),
  staticChecks: { functionBindingsOrPropertiesWritten: functionWrites, immediatelyInvokedInitialisers: iife },
};
const scopeText = `${JSON.stringify(scope, null, 1)}\n`;
const table = { schema: 'tc2/ac38.rewrite_table/1', tree: path.basename(TREE), scopeSha256: sha256(scopeText), sources, rewrites, appends };
const tableText = `${JSON.stringify(table, null, 1)}\n`;
fs.writeFileSync(path.join(HERE, 'digest_scope.json'), scopeText);
fs.writeFileSync(path.join(HERE, 'rewrite_table.json'), tableText);
console.log(JSON.stringify({ counts: scope.counts, rewrites: rewrites.length, lets: rewrites.filter((r) => r.kind === 'let').map((r) => `${r.file}:${r.line}`), sources: Object.keys(sources).length, staticChecks: scope.staticChecks, tableSha256: sha256(tableText), scopeSha256: sha256(scopeText) }, null, 1));

// ==========================================================
// AC38 limited feasibility study — static checks of the pinned glue (reads text, loads nothing)
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/harness/static_check.mjs <pinned-tree-dir>
// The rehearsal cannot exercise the pinned adapter, because preparation may not load the pinned
// tree.  This checks by text that every pinned name the adapter and the helpers rely on exists:
// accessor bindings, exported functions, appended helpers' free names, and mutant anchors.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PARENT = path.resolve(HERE, '..', '..');
const TREE = process.argv[2];
if (!TREE) { console.error('usage: static_check.mjs <pinned-tree-dir>'); process.exit(2); }
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const table = JSON.parse(fs.readFileSync(path.join(HERE, 'rewrite_table.json'), 'utf8'));
const scope = JSON.parse(fs.readFileSync(path.join(PARENT, 'digest_scope.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.resolve(HERE, '..', 'expected.json'), 'utf8'));
const covered = new Set(scope.covered.map((c) => `${c.file}#${c.name}`));
const text = (f) => fs.readFileSync(path.join(TREE, f), 'utf8');
const results = [];
const check = (name, ok) => results.push([name, !!ok]);

// accessor reads the adapter performs
for (const k of ['render/qlearning.js#Q', 'render/schemaMemory.js#_bonusCache', 'render/longTermConsolidation.js#stableMemory', 'render/semanticMemoryLayer.js#semanticEdges', 'main.js#neuronMap', 'render/episodicContextEngine.js#currentEpisode', 'render/episodicContextEngine.js#episodeVault', 'render/episodicContextEngine.js#workingMemory', 'render/embeddings.js#neuronMapRef'])
  check(`covered binding ${k}`, covered.has(k));
// parent appends the adapter calls
for (const [f, name] of [['render/episodeManager.js', '__ac38_touch_let__'], ['render/episodeManager.js', '__ac38_plant_let__'], ['render/episodicContextEngine.js', '__ac38_populate__'], ['instrumentation/rng.js', '__ac38_streams__']])
  check(`appended ${f} ${name}`, (table.appends[f] ?? '').includes(`export function ${name}(`));
// exported application functions the adapter calls
for (const [f, re] of [['render/longTermConsolidation.js', /^export function reinforcePath\(/m], ['render/search.js', /^export function findNeuronById\(/m], ['instrumentation/rng.js', /^export function (isSeeded|liveRng|makeRng)\(/m], ['render/episodeManager.js', /^export const episodicStore = \[\]/m], ['render/episodicContextEngine.js', /^export function sealCurrentEpisode\(/m]])
  check(`export in ${f} ${re.source}`, re.test(text(f)));
// every helper's free names resolve to a binding in its module
for (const [v, files] of Object.entries(table.variantAppends)) for (const [f, h] of Object.entries(files)) {
  const names = { 'MV-2a': ['Q'], 'MV-2b': ['neuronMapRef'], 'MV-2c': ['_bonusCache'] }[v];
  for (const n of names) check(`${v} helper name ${n} is covered in ${f}`, covered.has(`${f}#${n}`) && h.code.includes(n));
  check(`${v} helper line is after the base accessor`, h.line === text(f).split('\n').length + table.appends[f].split('\n').length + 1);
}
// mutant and switch anchors match pinned text; no two variant rewrites conflict with base rewrites
for (const r of table.rewrites) check(`anchor ${r.variant ?? r.kind} ${r.file}:${r.line}`, text(r.file).split('\n')[r.line - 1] === r.anchor);
const baseLines = new Set(table.rewrites.filter((r) => !r.variant).map((r) => `${r.file}:${r.line}`));
for (const r of table.rewrites.filter((x) => x.variant && x.variant !== 'site_probes')) check(`variant ${r.variant} avoids base lines`, !baseLines.has(`${r.file}:${r.line}`));
// the mutated identifiers exist where the mutant line uses them
const ece = text('render/episodicContextEngine.js');
for (const n of ['liveRng', 'workingMemory', 'episodeVault', 'currentEpisode']) check(`episodicContextEngine.js has ${n}`, new RegExp(`\\b${n}\\b`).test(ece));
check('episodicContextEngine.js imports liveRng', /import \{[^}]*\bliveRng\b[^}]*\} from/.test(ece));
// sources and expected agree with the table
for (const [f, h] of Object.entries(table.sources)) check(`source ${f}`, sha256(fs.readFileSync(path.join(TREE, f))) === h);
check('expected.json names this table', expected.tableSha256 === sha256(fs.readFileSync(path.join(HERE, 'rewrite_table.json'))));

const failed = results.filter(([, ok]) => !ok);
for (const [n] of failed) console.log(`FAIL ${n}`);
console.log(JSON.stringify({ checks: results.length, failed: failed.length }));
process.exit(failed.length ? 1 : 0);

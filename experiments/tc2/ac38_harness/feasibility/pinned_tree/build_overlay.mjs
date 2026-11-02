// ==========================================================
// AC38 limited feasibility study — P-2 tree overlay and hash manifests
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/pinned_tree/build_overlay.mjs <pinned-tree-dir>
// Reads the pinned tree as files and compares it with git objects.  It loads no module from the
// tree.  It refuses unless the tree is exactly the recorded one and 145 of its 148 files are
// byte-identical to public commit 0df804c.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const TREE = process.argv[2];
if (!TREE) { console.error('usage: build_overlay.mjs <pinned-tree-dir>'); process.exit(2); }
const die = (m) => { console.error(`build_overlay refused: ${m}`); process.exit(1); };

export const NAME = 'learn0-8aa9ee4f39f4';
export const BASE_COMMIT = '0df804c497e649affb9e7ebacb10fdc81ab6de8d';
export const DIGEST = '7ced1c98041281191eba9bd18a876e90f08af0a1ae5a1ffb8c0355cde46df276';
const OVERLAY = ['MANIFEST.json', 'main.js', 'render/planning.js'];
const ADDED = { 'main.js': [1154, 1279, 1320, 1792, 2128, 3646, 4867], 'render/planning.js': [291] };
const CONTRACT = { 'main.js': '3d3266fde38c39ea0a38f3920b4a2384ef5998e88c748e0a0a53416ef62bccc3', 'render/planning.js': '34e06c655b4f2b04d77b4db0b8db744568235865788177085510b5dd78cf46dc' };

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; };
const git = (args) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });

if (path.basename(path.resolve(TREE)) !== NAME) die(`the tree directory must be named ${NAME}`);
const files = walk(TREE).map((p) => path.relative(TREE, p).split(path.sep).join('/')).sort();
const rows = files.map((f) => [f, sha(fs.readFileSync(path.join(TREE, f)))]);
const digest = sha(rows.map(([f, h]) => `${f}  ${h}`).join('\n') + '\n');
if (files.length !== 148) die(`expected 148 files, found ${files.length}`);
if (digest !== DIGEST) die(`tree digest ${digest} differs from ${DIGEST}`);
for (const [f, h] of Object.entries(CONTRACT)) if (rows.find((r) => r[0] === f)[1] !== h) die(`${f} differs from the contract pin`);

// provenance: every file except the overlay must be byte-identical to the public commit
const same = [], differ = [], absent = [];
for (const f of files) {
  let blob = null;
  try { blob = git(['show', `${BASE_COMMIT}:${f}`]); } catch { absent.push(f); continue; }
  if (fs.readFileSync(path.join(TREE, f)).equals(blob)) same.push(f); else differ.push(f);
}
if (same.length !== 145 || JSON.stringify(differ) !== JSON.stringify(['main.js', 'render/planning.js']) || JSON.stringify(absent) !== JSON.stringify(['MANIFEST.json'])) die(`provenance: ${same.length} identical, differ ${differ}, absent ${absent}`);
for (const f of Object.keys(ADDED)) {
  const base = git(['show', `${BASE_COMMIT}:${f}`]).toString('utf8').split('\n');
  const now = fs.readFileSync(path.join(TREE, f), 'utf8').split('\n');
  const pool = new Map(); for (const l of base) pool.set(l, (pool.get(l) || 0) + 1);
  const added = []; now.forEach((l, i) => { const n = pool.get(l) || 0; if (n > 0) pool.set(l, n - 1); else added.push(i + 1); });
  const removed = [...pool.values()].reduce((a, b) => a + b, 0);
  if (JSON.stringify(added) !== JSON.stringify(ADDED[f]) || removed !== 0) die(`${f}: added ${added}, removed ${removed}`);
}

// overlay and manifests
for (const f of OVERLAY) { const to = path.join(HERE, 'overlay', f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(TREE, f), to); }
fs.writeFileSync(path.join(HERE, 'tree_files.sha256'), rows.map(([f, h]) => `${h}  ${f}`).join('\n') + '\n');
const table = JSON.parse(fs.readFileSync(path.join(REPO, 'experiments', 'tc2', 'ac38_harness', 'rewrite_table.json'), 'utf8'));
const sources = Object.entries(table.sources).sort(([a], [b]) => (a < b ? -1 : 1));
for (const [f, h] of sources) if (rows.find((r) => r[0] === f)?.[1] !== h) die(`source ${f} differs from the rewrite table`);
if (sources.length !== 44) die(`expected 44 sources, found ${sources.length}`);
fs.writeFileSync(path.join(HERE, 'tree_sources_44.sha256'), sources.map(([f, h]) => `${h}  ${f}`).join('\n') + '\n');
const identity = {
  schema: 'tc2/ac38.tree_identity/1',
  name: NAME,
  digest: DIGEST,
  digestDefinition: 'SHA-256 of the newline-terminated lines "<path>  <sha256>", one per file, sorted by path, paths relative to the tree root with forward slashes',
  files: files.length,
  bytes: files.reduce((a, f) => a + fs.statSync(path.join(TREE, f)).size, 0),
  baseCommit: BASE_COMMIT,
  identicalToBaseCommit: same.length,
  overlay: OVERLAY.map((f) => ({ path: f, sha256: rows.find((r) => r[0] === f)[1], bytes: fs.statSync(path.join(TREE, f)).size })),
  addedLines: ADDED,
  sources: sources.length,
  contractPins: CONTRACT,
};
fs.writeFileSync(path.join(HERE, 'tree_identity.json'), `${JSON.stringify(identity, null, 1)}\n`);
console.log(JSON.stringify({ digest, files: files.length, identical: same.length, overlay: OVERLAY, sources: sources.length }));

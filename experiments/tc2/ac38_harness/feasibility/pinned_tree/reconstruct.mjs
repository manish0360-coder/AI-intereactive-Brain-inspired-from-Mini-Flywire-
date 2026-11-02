// ==========================================================
// AC38 limited feasibility study — rebuild the pinned tree from public git objects plus the overlay
// ==========================================================
//   node experiments/tc2/ac38_harness/feasibility/pinned_tree/reconstruct.mjs <empty-out-dir> [--repo <clone>]
// Writes <out>/learn0-8aa9ee4f39f4/ and verifies every file and the tree digest.  This assembles
// recorded bytes.  It is not the tree builder, it loads none of the files, and it refuses a
// non-empty output directory.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OUT = args[0];
const repoAt = args.indexOf('--repo');
const REPO = repoAt >= 0 ? args[repoAt + 1] : path.resolve(HERE, '..', '..', '..', '..', '..');
const die = (m) => { console.error(`reconstruct refused: ${m}`); process.exit(1); };
if (!OUT) die('usage: reconstruct.mjs <empty-out-dir> [--repo <clone>]');
if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) die('the output directory is not empty');

const identity = JSON.parse(fs.readFileSync(path.join(HERE, 'tree_identity.json'), 'utf8'));
const rows = fs.readFileSync(path.join(HERE, 'tree_files.sha256'), 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return [l.slice(i + 2), l.slice(0, i)]; });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ROOT = path.join(OUT, identity.name);
const overlay = new Set(identity.overlay.map((o) => o.path));
let fromGit = 0, fromOverlay = 0;
for (const [f, want] of rows) {
  const bytes = overlay.has(f)
    ? fs.readFileSync(path.join(HERE, 'overlay', f))
    : execFileSync('git', ['-C', REPO, 'show', `${identity.baseCommit}:${f}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  if (sha(bytes) !== want) die(`${f} does not match its recorded hash`);
  fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, f), bytes);
  if (overlay.has(f)) fromOverlay++; else fromGit++;
}
const digest = sha(rows.map(([f, h]) => `${f}  ${h}`).join('\n') + '\n');
if (digest !== identity.digest || rows.length !== identity.files) die(`digest ${digest} or file count ${rows.length} differs from the identity record`);
console.log(JSON.stringify({ tree: identity.name, files: rows.length, fromGit, fromOverlay, digest }));

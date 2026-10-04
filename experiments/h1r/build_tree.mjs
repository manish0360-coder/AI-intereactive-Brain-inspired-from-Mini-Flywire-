// ==========================================================
// H1-R — build the M7-conformed agent tree from the B2 blobs
// ==========================================================
// Materialises every blob of B2 (707cb1e) except Portfolio_Assets/ with `git cat-file`
// (raw blob bytes — no checkout, no line-ending conversion), verifies each git blob id,
// applies conformance_transform.mjs to exactly three files, and writes MANIFEST.json.
// The repository working tree is never written. Output lives under os.tmpdir().
//
//   node experiments/h1r/build_tree.mjs              -> conformed tree (prints its path)
//   node experiments/h1r/build_tree.mjs --pristine   -> untransformed B2 tree (parity reference)
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { B2_COMMIT, TRANSFORMS } from './conformance_transform.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlobId = (b) => crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const git = (args, opts = {}) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 30, ...opts });

export function transformDigest() {
  return sha256(fs.readFileSync(path.join(HERE, 'conformance_transform.mjs')));
}

export function buildTree({ pristine = false, outRoot = path.join(os.tmpdir(), 'mfw-h1r') } = {}) {
  const tdig = transformDigest();
  const name = pristine ? `b2-${B2_COMMIT.slice(0, 7)}` : `conformed-${B2_COMMIT.slice(0, 7)}-${tdig.slice(0, 12)}`;
  fs.mkdirSync(outRoot, { recursive: true });
  const dir = path.join(fs.realpathSync.native(outRoot), name);
  const manifestPath = path.join(dir, 'MANIFEST.json');

  // reuse only if every recorded file still hashes to its recorded value
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ok = m.b2Commit === B2_COMMIT && m.transformSha256 === (pristine ? null : tdig) &&
      Object.entries(m.files).every(([p, h]) => fs.existsSync(path.join(dir, p)) && sha256(fs.readFileSync(path.join(dir, p))) === h);
    if (ok) return { dir, manifest: m, reused: true };
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const ls = git(['ls-tree', '-r', B2_COMMIT], { encoding: 'utf8' }).trim().split('\n');
  const files = {}, transformed = {};
  let count = 0;
  for (const line of ls) {
    const m = line.match(/^(\d+) (\w+) ([0-9a-f]{40})\t(.+)$/);
    if (!m || m[2] !== 'blob') continue;
    const [, , , blob, p] = m;
    if (p.startsWith('Portfolio_Assets/')) continue;
    let buf = git(['cat-file', 'blob', blob]);
    if (gitBlobId(buf) !== blob) throw new Error(`blob id mismatch for ${p}`);
    if (!pristine && TRANSFORMS[p]) {
      const before = sha256(buf);
      const out = Buffer.from(TRANSFORMS[p](buf.toString('utf8')), 'utf8');
      transformed[p] = { blob, sha256Before: before, sha256After: sha256(out) };
      buf = out;
    }
    const dest = path.join(dir, ...p.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    files[p] = sha256(buf);
    count++;
  }
  if (!pristine && Object.keys(transformed).length !== Object.keys(TRANSFORMS).length)
    throw new Error('not every transform target was found in B2');
  const manifest = { b2Commit: B2_COMMIT, transformSha256: pristine ? null : tdig, fileCount: count, transformed, files };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  return { dir, manifest, reused: false };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const r = buildTree({ pristine: process.argv.includes('--pristine') });
  console.log(JSON.stringify({ dir: r.dir, reused: r.reused, files: r.manifest.fileCount, transformed: r.manifest.transformed }, null, 1));
}

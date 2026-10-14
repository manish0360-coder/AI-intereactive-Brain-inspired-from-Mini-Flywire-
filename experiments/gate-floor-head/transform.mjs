// ==========================================================
// GATE-FLOOR-HEAD — the exact audited HEAD runtime file set, bare and derived
// ==========================================================
// The substrate is the runtime file set of HEAD_COMMIT (B2's 146 paths plus render/traversalRecord.js), materialised with
// `git cat-file` (raw blob bytes: no checkout, no line-ending conversion), every blob id re-verified and every blob required
// to be IDENTICAL to the one in the audited commit.  Two trees are built:
//   bare     the blobs untouched (the reference the measured OFF runtime must equal);
//   derived  the same blobs with exactly the two guarded call-level lines of GATE-FLOOR-B2 inserted into main.js (the goal-entry
//            floor and the observational goal-reset probe) - the SAME pure transform, applied to HEAD's text.
// The repository working tree is never written; output lives under the system temp dir.
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformMain, FLOOR_LINE, PROBE_LINE, FLOOR_ANCHOR, PROBE_ANCHOR } from '../gate-floor-b2/transform.mjs';
import { HEAD_COMMIT, TREE } from './config.mjs';

export { transformMain, FLOOR_LINE, PROBE_LINE, FLOOR_ANCHOR, PROBE_ANCHOR };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const B2_COMMIT = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e';
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlobId = (b) => crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const git = (args, opts = {}) => execFileSync('git', ['-C', REPO, ...args], { maxBuffer: 1 << 30, ...opts });

/** the runtime paths: every B2 blob path except Portfolio_Assets, plus the new traversal record */
export function runtimePaths() {
  const b2 = git(['ls-tree', '-r', B2_COMMIT], { encoding: 'utf8' }).trim().split('\n')
    .map(l => l.match(/^(\d+) (\w+) ([0-9a-f]{40})\t(.+)$/)).filter(m => m && m[2] === 'blob' && !m[4].startsWith('Portfolio_Assets/')).map(m => m[4]);
  return [...new Set([...b2, 'render/traversalRecord.js'])].sort();
}

export function transformDigest() { return sha256(fs.readFileSync(path.join(HERE, 'transform.mjs'))); }

/**
 * Build (or reuse) a tree.  derived = false -> bare HEAD blobs; true -> + the two guarded lines in main.js.
 * Reuse only if every recorded file still hashes to its recorded value.
 */
export function buildHeadTree({ derived = true, outRoot = path.join(os.tmpdir(), 'mfw-gatefloorhead') } = {}) {
  const tdig = transformDigest();
  const name = `head-${HEAD_COMMIT.slice(0, 7)}-${derived ? `derived-${tdig.slice(0, 12)}` : 'bare'}`;
  fs.mkdirSync(outRoot, { recursive: true });
  const dir = path.join(fs.realpathSync.native(outRoot), name);
  const manifestPath = path.join(dir, 'MANIFEST.json');
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ok = m.gatefloorhead && m.gatefloorhead.headCommit === HEAD_COMMIT && m.gatefloorhead.bare === !derived && m.gatefloorhead.transformSha256 === tdig &&
      Object.entries(m.files).every(([p, h]) => fs.existsSync(path.join(dir, p)) && sha256(fs.readFileSync(path.join(dir, p))) === h);
    if (ok) return { dir, manifest: m, reused: true };
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const files = {}, blobs = {};
  for (const p of runtimePaths()) {
    const ls = git(['ls-tree', HEAD_COMMIT, '--', p], { encoding: 'utf8' }).trim();
    const m = ls.match(/^(\d+) blob ([0-9a-f]{40})\t/);
    if (!m) throw new Error(`GATE-FLOOR-HEAD: ${p} is missing at ${HEAD_COMMIT.slice(0, 7)}`);
    let buf = git(['cat-file', 'blob', m[2]]);
    if (gitBlobId(buf) !== m[2]) throw new Error(`blob id mismatch for ${p}`);
    blobs[p] = m[2];
    if (derived && p === 'main.js') buf = Buffer.from(transformMain(buf.toString('utf8')), 'utf8');
    const dest = path.join(dir, ...p.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    files[p] = sha256(buf);
  }
  if (blobs['main.js'] !== TREE.headMainBlob) throw new Error('main.js at the audited commit is not the pinned blob');
  if (blobs['render/planning.js'] !== TREE.planningBlob || blobs['render/traversalRecord.js'] !== TREE.traversalRecordBlob) throw new Error('planning.js / traversalRecord.js are not the pinned blobs');
  const manifest = { b2Commit: HEAD_COMMIT, headCommit: HEAD_COMMIT, transformSha256: null, fileCount: Object.keys(files).length, transformed: {}, files,
    gatefloorhead: { tag: 'GATEFLOOR-HEAD', bare: !derived, headCommit: HEAD_COMMIT, transformSha256: tdig, blobs, mainSha256: files['main.js'] } };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  return { dir, manifest, reused: false };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  for (const derived of [false, true]) {
    const r = buildHeadTree({ derived });
    console.log(JSON.stringify({ dir: r.dir, derived, reused: r.reused, files: r.manifest.fileCount, mainSha256: r.manifest.gatefloorhead.mainSha256 }));
  }
}

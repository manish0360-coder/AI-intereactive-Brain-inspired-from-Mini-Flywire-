// ==========================================================
// GATE-FLOOR-1 — the guarded transform and the derived tree
// ==========================================================
// The H1-R conformance transform (experiments/h1r/conformance_transform.mjs) is a pinned build identity; it is NOT
// modified.  GATE-FLOOR-1 applies ONE further guarded edit to a copy of the conformed tree's main.js and writes the
// result to its own directory, so every other file of the tree is byte-identical to the conformed tree and no file
// of the repository is touched.
//
// THE EDIT (tag GATEFLOOR1).  In runPrediction's candidate scoring, the goal-entering candidate is scored
//     goalGradientBoost = 100 * tc;          // FIX 3: "ZERO PULL FOR UNWITNESSED TRANSITIONS"
// with tc = min(count(u->goal) / 5, 1), count read from episodes only.  The inserted line, immediately after it:
//     if (globalThis.__GATEFLOOR1__ && globalThis.__GATEFLOOR1__.on) goalGradientBoost = globalThis.__GATEFLOOR1__.entry(...)
// replaces that value by 100 * max(tc, floor) iff the candidate is a legal graph edge into the active goal.  The
// original statement is kept verbatim above it, so removing the inserted line restores the conformed main.js
// byte for byte (checked), and with the global absent the line is a single property read (no behaviour change).
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

export const ANCHOR = '          goalGradientBoost = 100 * tc;';
export const INSERTED = '          if (globalThis.__GATEFLOOR1__ && globalThis.__GATEFLOOR1__.on) goalGradientBoost = globalThis.__GATEFLOOR1__.entry(currentKey, k, goalNeuronId, tc, structureMap.has(k)); // GATEFLOOR1: goal-entry floor (guarded, default off)';
const REQUIRED_CONTEXT = [      // the lines that must surround the anchor (the FIX 3 branch), so the edit cannot land elsewhere
  '          const tc = trajectoryConfidence(currentKey, k);',
];

/** pure: main.js text -> main.js text with the one guarded line; refuses unless the anchor matches exactly once in context */
export function transformMain(text) {
  const L = text.split('\n');
  const idx = [];
  L.forEach((l, i) => { if (l === ANCHOR) idx.push(i); });
  if (idx.length !== 1) throw new Error(`GATE-FLOOR-1 transform [main.js:GATEFLOOR1] anchor matched ${idx.length} times, expected 1`);
  const [i] = idx;
  if (L.some(l => l.includes('GATEFLOOR1'))) throw new Error('GATE-FLOOR-1 transform: tag already present');
  if (L[i - 1] !== REQUIRED_CONTEXT[0]) throw new Error('GATE-FLOOR-1 transform: the FIX 3 branch is not in the expected shape (tc line not found above the anchor)');
  const fix3 = L.slice(Math.max(0, i - 30), i).some(l => l.includes('FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS'));
  if (!fix3) throw new Error('GATE-FLOOR-1 transform: FIX 3 header not found above the anchor');
  if (L[i + 1] !== '      }' || !L.slice(i + 2, i + 6).some(l => l.includes('end: if (goalNeuronId !== null)'))) throw new Error('GATE-FLOOR-1 transform: end of the goal-gradient block not found below the anchor');
  L.splice(i + 1, 0, INSERTED);
  return L.join('\n');
}

export function transformDigest() { return sha256(fs.readFileSync(path.join(HERE, 'transform.mjs'))); }

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

/**
 * Build (or reuse) the derived tree: the conformed tree with the one extra line in main.js.
 * Reuse only if every recorded file still hashes to its recorded value.
 */
export function buildFloorTree({ outRoot = path.join(os.tmpdir(), 'mfw-gatefloor1') } = {}) {
  const parent = buildTree();
  const tdig = transformDigest();
  const name = `floor-${path.basename(parent.dir)}-${tdig.slice(0, 12)}`;
  fs.mkdirSync(outRoot, { recursive: true });
  const dir = path.join(fs.realpathSync.native(outRoot), name);
  const manifestPath = path.join(dir, 'MANIFEST.json');
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ok = m.gatefloor1 && m.gatefloor1.transformSha256 === tdig && m.gatefloor1.parentManifestFilesSha256 === sha256(JSON.stringify(parent.manifest.files)) &&
      Object.entries(m.files).every(([p, h]) => fs.existsSync(path.join(dir, p)) && sha256(fs.readFileSync(path.join(dir, p))) === h);
    if (ok) return { dir, manifest: m, parent, reused: true };
    fs.rmSync(dir, { recursive: true, force: true });
  }
  copyDir(parent.dir, dir);
  const mainPath = path.join(dir, 'main.js');
  const before = fs.readFileSync(mainPath);
  const out = Buffer.from(transformMain(before.toString('utf8')), 'utf8');
  fs.writeFileSync(mainPath, out);
  const files = { ...parent.manifest.files, 'main.js': sha256(out) };
  const manifest = {
    ...parent.manifest, files,
    gatefloor1: { tag: 'GATEFLOOR1', transformSha256: tdig, parentDir: path.basename(parent.dir), parentManifestFilesSha256: sha256(JSON.stringify(parent.manifest.files)),
      parentMainSha256: sha256(before), mainSha256: sha256(out), inserted: INSERTED, anchor: ANCHOR },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  return { dir, manifest, parent, reused: false };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const r = buildFloorTree();
  console.log(JSON.stringify({ dir: r.dir, reused: r.reused, gatefloor1: r.manifest.gatefloor1 }, null, 1));
}

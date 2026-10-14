// ==========================================================
// GATE-FLOOR-B2 — the derived PRISTINE tree
// ==========================================================
// The substrate is the exact B2 (707cb1e) blob set (experiments/h1r/build_tree.mjs --pristine), NOT the conformed tree.
// Two guarded, call-only lines are inserted into a COPY of its main.js; nothing else is touched:
//
//   FLOOR   after the goal-entering candidate's `goalGradientBoost = 100 * tc;` (FIX 3), the same semantic edit as
//           GATE-FLOOR-1: 100 * max(tc, 1) iff the candidate is the active goal AND `structureMap.has(k)` (the
//           product's own neighbour map) AND the world's edge oracle confirms the edge.  It reads an undefined global
//           when off.
//   PROBE   immediately BEFORE the goal reset's `agentCurrent = allIds[...]` (still holding the position the goal-
//           entering move was decided from): one observational call that reports (from, to, goal).  It assigns
//           nothing, draws nothing and branches on nothing.
//
// Both anchors are verified in context, matched exactly once, and checked to be the same statements the conformed
// transform's P4-goal / FIX 3 anchors address in B2.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildTree } from '../h1r/build_tree.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

export const FLOOR_ANCHOR = '          goalGradientBoost = 100 * tc;';
export const FLOOR_LINE = '          if (globalThis.__GATEFLOORB2__ && globalThis.__GATEFLOORB2__.on) goalGradientBoost = globalThis.__GATEFLOORB2__.entry(currentKey, k, goalNeuronId, tc, structureMap.has(k)); // GATEFLOOR-B2: goal-entry floor (guarded, default off)';
export const PROBE_ANCHOR = '    agentCurrent = allIds[Math.floor(liveRng() * allIds.length)];';
export const PROBE_LINE = '    if (globalThis.__GFB2__) globalThis.__GFB2__.goalReset(agentCurrent, current, goalNeuronId); // GATEFLOOR-B2 probe: goal reset (observational, call-only)';

function exactlyOne(L, exact, tag) {
  const idx = []; L.forEach((l, i) => { if (l === exact) idx.push(i); });
  if (idx.length !== 1) throw new Error(`GATE-FLOOR-B2 transform [${tag}] anchor matched ${idx.length} times, expected 1`);
  return idx[0];
}

/** pure: pristine main.js text -> text with the two guarded lines; refuses unless both anchors match once, in context */
export function transformMain(text) {
  const L = text.split('\n');
  if (L.some(l => l.includes('GATEFLOOR-B2'))) throw new Error('GATE-FLOOR-B2 transform: tag already present');
  const f = exactlyOne(L, FLOOR_ANCHOR, 'FLOOR');
  if (L[f - 1] !== '          const tc = trajectoryConfidence(currentKey, k);') throw new Error('GATE-FLOOR-B2 transform [FLOOR]: tc line not found above the anchor');
  if (!L.slice(Math.max(0, f - 30), f).some(l => l.includes('FIX 3: ZERO PULL FOR UNWITNESSED TRANSITIONS'))) throw new Error('GATE-FLOOR-B2 transform [FLOOR]: FIX 3 header not found');
  if (L[f + 1] !== '      }') throw new Error('GATE-FLOOR-B2 transform [FLOOR]: end of the FIX 3 branch not found');
  const p = exactlyOne(L, PROBE_ANCHOR, 'PROBE');
  if (L[p + 1] !== '    agentLast    = agentCurrent;') throw new Error('GATE-FLOOR-B2 transform [PROBE]: reset context not found below the anchor');
  if (!L.slice(Math.max(0, p - 8), p).some(l => l.includes('const allIds = Array.from(neuronMap.keys())'))) throw new Error('GATE-FLOOR-B2 transform [PROBE]: allIds not found above the anchor');
  // insert the later line first so the earlier index stays valid
  const hi = Math.max(f + 1, p), lo = Math.min(f + 1, p);
  const ins = { [f + 1]: FLOOR_LINE, [p]: PROBE_LINE };
  L.splice(hi, 0, ins[hi]);
  L.splice(lo, 0, ins[lo]);
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

/** build (or reuse) the derived pristine tree; reuse only if every recorded file still hashes to its recorded value */
export function buildDerivedTree({ outRoot = path.join(os.tmpdir(), 'mfw-gatefloorb2') } = {}) {
  const parent = buildTree({ pristine: true });
  const tdig = transformDigest();
  const name = `pristine-derived-${path.basename(parent.dir)}-${tdig.slice(0, 12)}`;
  fs.mkdirSync(outRoot, { recursive: true });
  const dir = path.join(fs.realpathSync.native(outRoot), name);
  const manifestPath = path.join(dir, 'MANIFEST.json');
  if (fs.existsSync(manifestPath)) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const ok = m.gatefloorb2 && m.gatefloorb2.transformSha256 === tdig && m.gatefloorb2.parentManifestFilesSha256 === sha256(JSON.stringify(parent.manifest.files)) &&
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
  const manifest = { ...parent.manifest, files,
    gatefloorb2: { tag: 'GATEFLOOR-B2', transformSha256: tdig, parentDir: path.basename(parent.dir), parentManifestFilesSha256: sha256(JSON.stringify(parent.manifest.files)),
      parentMainSha256: sha256(before), mainSha256: sha256(out), floorLine: FLOOR_LINE, probeLine: PROBE_LINE } };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  return { dir, manifest, parent, reused: false };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const r = buildDerivedTree();
  console.log(JSON.stringify({ dir: r.dir, reused: r.reused, parentMainSha256: r.manifest.gatefloorb2.parentMainSha256, mainSha256: r.manifest.gatefloorb2.mainSha256 }, null, 1));
}

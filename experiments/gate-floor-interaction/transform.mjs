// ==========================================================
// GATE-FLOOR-INTERACTION — the guard tree: the PRODSEM derived tree + exactly two guarded, default-off, call-only lines
// ==========================================================
// ADMIT  immediately before the candidate admission test of runPrediction (HEAD main.js:1789).  It COUNTS the candidate's class
//        and, when the guard is ON, DROPS every candidate that is not a graph neighbour (the H1-R N1-MASK semantics).
// EXEC   immediately before `let nextStep = reasoning.to;` (HEAD main.js:3641).  When the guard is ON an executed move that is
//        neither a graph edge nor a self no-op is BLOCKED and counted (the H1-R N1-GUARD semantics).
// Both read `globalThis.__GFGUARD__` first: with the global absent (the default) both are inert, and an armed-but-OFF runtime
// only counts.  N1-MASK-SEM (unreachable with a goal set), N1-SEAL and P4 are NOT part of the bundle.
// The derived PRODSEM tree (HEAD blobs + floor line + goal-reset probe) is built by the GATE-FLOOR-PRODSEM transform, unchanged.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHeadTree } from '../gate-floor-prodsem/transform.mjs';

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const HERE = path.dirname(fileURLToPath(import.meta.url));

export const ADMIT_ANCHOR = '    if (!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained) {';
export const EXEC_ANCHOR = '  let nextStep = reasoning.to;';
export const EXEC_NULLCHECK = '  if (!reasoning) return;';
export const ADMIT_LINE = "    if (globalThis.__GFGUARD__ && globalThis.__GFGUARD__.admit(currentKey, k, isGraphNeighbor, isEpisodeTrained, isHumanTrained) === false) return; // GFGUARD: candidate-class counter + N1-MASK semantics (guarded, default off)";
export const EXEC_LINE = "  if (globalThis.__GFGUARD__ && globalThis.__GFGUARD__.on && !globalThis.__GFGUARD__.legalMove(agentCurrent, reasoning.to)) { globalThis.__GFGUARD__.counters.blockedIllegal++; return; } // GFGUARD: N1-GUARD semantics (guarded, default off)";

function refuse(msg) { throw new Error(`GATE-FLOOR-INTERACTION transform: ${msg}`); }

/** insert the two guard lines into the derived main.js text; refuses anything but the exact expected anchors */
export function transformMain(text) {
  if (text.includes('__GFGUARD__')) refuse('the source already carries the guard lines');
  const L = text.split('\n');
  const find = (pred) => L.map((l, i) => (pred(l) ? i : -1)).filter(i => i >= 0);
  const ia = find(l => l === ADMIT_ANCHOR), ie = find(l => l === EXEC_ANCHOR);
  if (ia.length !== 1) refuse(`ADMIT anchor matched ${ia.length} times`);
  if (ie.length !== 1) refuse(`EXEC anchor matched ${ie.length} times`);
  if (!L.slice(ie[0] - 4, ie[0]).includes(EXEC_NULLCHECK)) refuse('EXEC: the reasoning null-check is not within 4 lines above the anchor');
  if (!(ia[0] < ie[0])) refuse('anchor order');
  L.splice(ie[0], 0, EXEC_LINE);        // the later line first so the earlier index stays valid
  L.splice(ia[0], 0, ADMIT_LINE);
  return L.join('\n');
}

/** materialise the guard tree (PRODSEM derived tree + the two lines) under outRoot; returns { dir, manifest } */
export function buildGuardTree({ outRoot = path.join(os.tmpdir(), 'mfw-gatefloorinteraction') } = {}) {
  const base = buildHeadTree({ derived: true, outRoot: path.join(outRoot, 'base') });
  const baseMain = fs.readFileSync(path.join(base.dir, 'main.js'), 'utf8');
  const guarded = transformMain(baseMain);
  const dir = path.join(outRoot, `guard-${sha256(guarded).slice(0, 12)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(base.dir, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'main.js'), guarded);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  manifest.files['main.js'] = sha256(guarded);
  manifest.gatefloorinteraction = { baseDerivedMainSha256: sha256(baseMain), mainSha256: sha256(guarded), admitLineSha256: sha256(ADMIT_LINE), execLineSha256: sha256(EXEC_LINE), transformSha256: transformDigest() };
  fs.writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
  return { dir, manifest };
}

export function transformDigest() { return sha256(fs.readFileSync(path.join(HERE, 'transform.mjs'))); }

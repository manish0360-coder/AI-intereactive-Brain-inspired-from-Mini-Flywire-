// ==========================================================
// LEARN-0 — the experiment tree: the pinned GATE-FLOOR-INTERACTION guard tree + exactly FOUR guarded, default-off,
// call-only lines, one at the entry of each map oracle (DESIGN.md section 3)
// ==========================================================
// A "map oracle" is a function that reads the graph beyond the agent's current node and feeds a decision:
//   goalDistance   main.js        BFS hop distance to the goal (the goal gradient)               neutral value 0  (no gradient branch fires)
//   canReachGoal   main.js        depth-4 path search to the goal (candidate admission filter)   neutral value true (no candidate filtered)
//   graphDiameter  main.js        all-pairs BFS diameter (FutureScore projection scale)          neutral value 0  (unused when FutureScore is off)
//   futureScore    render/planning.js  BFS-from-goal distances + H=3 path enumeration (look-ahead)  neutral value undefined (projection returns 0)
// Each line calls `__LEARN0__.blocks(name)` FIRST:
//   global absent (the default)  -> one falsy read, the function runs unchanged;
//   map ON  (armed)               -> blocks() counts an EXECUTED oracle call and returns false, the function runs unchanged;
//   map OFF                       -> blocks() counts a BLOCKED oracle call and returns true, the function returns its neutral value
//                                    before reading the graph.
// So in a map-OFF session the executed count of every oracle is 0 by construction, and the gate checks it is 0 by measurement.
// The guard lines of the base tree (ADMIT / EXEC) are untouched and stay inert unless their own global is installed.
// ==========================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGuardTree } from '../gate-floor-interaction/transform.mjs';

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TAG = '// LEARN-0 map-oracle switch (guarded, default off)';

export const ORACLES = Object.freeze(['goalDistance', 'canReachGoal', 'graphDiameter', 'futureScore']);
export const LINES = Object.freeze({
  goalDistance: { file: 'main.js', anchor: 'function goalDistance(startId, goalId, maxDepth = 8) {', where: 'after',
    line: `    if (globalThis.__LEARN0__ && globalThis.__LEARN0__.blocks('goalDistance')) return 0; ${TAG}` },
  canReachGoal: { file: 'main.js', anchor: 'function canReachGoal(startId, goalId, maxDepth = 4) {', where: 'after',
    line: `  if (globalThis.__LEARN0__ && globalThis.__LEARN0__.blocks('canReachGoal')) return true; ${TAG}` },
  graphDiameter: { file: 'main.js', anchor: 'function graphDiameter() {', where: 'after',
    line: `    if (globalThis.__LEARN0__ && globalThis.__LEARN0__.blocks('graphDiameter')) return 0; ${TAG}` },
  futureScore: { file: 'render/planning.js', anchor: '    if (goalNeuronId === null || goalNeuronId === undefined) return undefined;', where: 'before',
    line: `    if (globalThis.__LEARN0__ && globalThis.__LEARN0__.blocks('futureScore')) return undefined; ${TAG}` },
});

function refuse(msg) { throw new Error(`LEARN-0 transform: ${msg}`); }

/** insert the LEARN-0 lines that belong to `file` into its text; refuses anything but exactly-once anchors and an untagged source */
export function transformFile(file, text) {
  if (text.includes('__LEARN0__')) refuse(`${file} already carries LEARN-0 lines`);
  const L = text.split('\n');
  const mine = ORACLES.filter(o => LINES[o].file === file);
  if (!mine.length) refuse(`no LEARN-0 line belongs to ${file}`);
  // locate every anchor first (all indices refer to the untouched text), then insert from the bottom up
  const at = mine.map(o => { const idx = L.map((l, i) => (l === LINES[o].anchor ? i : -1)).filter(i => i >= 0); if (idx.length !== 1) refuse(`${o}: anchor matched ${idx.length} times in ${file}`); return { o, i: idx[0] }; });
  at.sort((a, b) => b.i - a.i);
  for (const { o, i } of at) L.splice(LINES[o].where === 'after' ? i + 1 : i, 0, LINES[o].line);
  return L.join('\n');
}

/** materialise the LEARN-0 tree under outRoot; returns { dir, manifest } */
export function buildLearn0Tree({ outRoot = path.join(os.tmpdir(), 'mfw-learn0') } = {}) {
  const base = buildGuardTree({ outRoot: path.join(outRoot, 'guardbase') });
  const baseMain = fs.readFileSync(path.join(base.dir, 'main.js'), 'utf8');
  const basePlanning = fs.readFileSync(path.join(base.dir, 'render', 'planning.js'), 'utf8');
  const main = transformFile('main.js', baseMain), planning = transformFile('render/planning.js', basePlanning);
  const dir = path.join(outRoot, `learn0-${sha256(main + '\u0000' + planning).slice(0, 12)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(base.dir, dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'main.js'), main);
  fs.writeFileSync(path.join(dir, 'render', 'planning.js'), planning);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  manifest.files['main.js'] = sha256(main);
  manifest.files['render/planning.js'] = sha256(planning);
  manifest.learn0 = { baseGuardMainSha256: sha256(baseMain), basePlanningSha256: sha256(basePlanning), mainSha256: sha256(main), planningSha256: sha256(planning),
    lineSha256: Object.fromEntries(ORACLES.map(o => [o, sha256(LINES[o].line)])), transformSha256: transformDigest() };
  fs.writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify(manifest, null, 1));
  return { dir, manifest };
}

export function transformDigest() { return sha256(fs.readFileSync(path.join(HERE, 'transform.mjs'))); }

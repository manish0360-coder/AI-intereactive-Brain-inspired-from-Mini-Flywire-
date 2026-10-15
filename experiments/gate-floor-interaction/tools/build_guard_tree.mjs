// scratch (NOT in the repository): the PRODSEM derived tree (HEAD + floor line + goal-reset probe) plus TWO more guarded call-only lines:
//   ADMIT: before the admission test of the runPrediction candidate loop (HEAD main.js:1789) - counts the candidate classes and, when
//          the guard is ON, drops every candidate that is not a graph neighbour (the H1-R N1-MASK semantics)
//   EXEC : before `let nextStep = reasoning.to;` (HEAD main.js:3641) - an executed move must be a graph edge or a self no-op
//          (the H1-R N1-GUARD semantics); blocked moves are counted
// N1-MASK-SEM is NOT included: it sits behind `if (goalNeuronId !== null) return;` and is unreachable with a goal set.
// N1-SEAL is NOT included: it concerns what newly sealed episodes teach, a different pathway.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url)));   // repository root
const { buildHeadTree } = await import(`file:///${REPO}/experiments/gate-floor-prodsem/transform.mjs`);
const outRoot = path.dirname(process.argv[1]);
const d = buildHeadTree({ derived: true, outRoot: path.join(outRoot, 'trees') });
const dir = d.dir;
const p = path.join(dir, 'main.js');
let L = fs.readFileSync(p, 'utf8').split('\n');
const only = (pred, what) => { const idx = L.map((l, i) => (pred(l) ? i : -1)).filter(i => i >= 0); if (idx.length !== 1) throw new Error(`${what}: anchor matched ${idx.length} times`); return idx[0]; };
if (L.some(l => l.includes('__GFGUARD__'))) throw new Error('tree already carries the guard lines');
const ADMIT = "    if (globalThis.__GFGUARD__ && globalThis.__GFGUARD__.admit(currentKey, k, isGraphNeighbor, isEpisodeTrained, isHumanTrained) === false) return; // GFGUARD: candidate-class counter + N1-MASK semantics (guarded, default off)";
const EXEC = "  if (globalThis.__GFGUARD__ && globalThis.__GFGUARD__.on && !globalThis.__GFGUARD__.legalMove(agentCurrent, reasoning.to)) { globalThis.__GFGUARD__.counters.blockedIllegal++; return; } // GFGUARD: N1-GUARD semantics (guarded, default off)";
const ia = only(l => l === '    if (!isGraphNeighbor && !isEpisodeTrained && !isHumanTrained) {', 'ADMIT');
const ie = only(l => l === '  let nextStep = reasoning.to;', 'EXEC');
if (!L.slice(ie - 4, ie).includes('  if (!reasoning) return;')) throw new Error('EXEC: null-check not found');
// insert the later line first so indices stay valid
L.splice(ie, 0, EXEC);
L.splice(ia, 0, ADMIT);
fs.writeFileSync(p, L.join('\n'));
console.log(JSON.stringify({ dir, lines: L.length }));

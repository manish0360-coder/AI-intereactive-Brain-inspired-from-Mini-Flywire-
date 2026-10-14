// ==========================================================
// GATE-FLOOR-1 — short whole-runtime probe (scope test; NOT an outcome study)
// ==========================================================
//   node probe.mjs '<json>'   json: { tree, configSeed, configIndex, agentSeed, ticks, brainPath|null, floor: null | { on, tcFloor } }
// Runs the real runtime in a tree for 5..400 calls and reports every candidate record the measurement sink saw
// ([call, step, key, returned, weight]), the executed moves, the goal reaches, the floor's counters and the run
// fingerprint.  verify_gatefloor1.mjs uses it to show, on the whole runtime, that with the floor ON the FIRST candidate
// record that differs from the OFF run is a goal-entering candidate whose score was raised, and that a floor installed
// with tcFloor = 0 is indistinguishable from OFF.  Same seed and territory guards as the session driver.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { seedOk, CONFIG_START, HELDOUT_FLOOR } from '../xfer1/config.mjs';
import { createMeasure } from '../h1r/measure.mjs';
import { createFloor } from './floor_runtime.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`GATE-FLOOR-1 probe refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
if (IN.configSeed < CONFIG_START || IN.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is outside the territory or is held-out/consumed');
if (!Number.isInteger(IN.ticks) || IN.ticks < 5 || IN.ticks > 400) refuse('ticks must be in 5..400 (a probe, not a study)');

const { installH1R } = await import(URLOF(REPO, 'experiments/h1r/runtime.mjs'));
const { installMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure_install.mjs'));
const H = await installH1R({ tree: IN.tree, trustMode: 'traversal', envPosition: null });
let FLOOR = null;
if (IN.floor) { FLOOR = createFloor({ on: IN.floor.on !== false, tcFloor: IN.floor.tcFloor, isEdge: H.isEdge }); globalThis.__GATEFLOOR1__ = FLOOR; }
const T = (rel) => import(URLOF(IN.tree, rel));
const envmod = await T('experiments/m7/env.js');
const gen = envmod.generateAccepted(IN.configSeed, IN.configIndex);
if (gen.provenance.acceptedSeed !== IN.configSeed) refuse('configSeed is not an accepted seed at this index');

const M = installMeasure(globalThis, createMeasure);
await H.attachMeasure(M);
const brainJson = typeof IN.brainPath === 'string' ? fs.readFileSync(IN.brainPath, 'utf8') : null;
let served = false, current;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, enumerable: true, get() { return current; },
  set(v) { current = { getItem: (k) => { if (k === 'brain' && brainJson !== null && !served) { served = true; return brainJson; } return v.getItem(k); },
    setItem: (k, x) => v.setItem(k, x), removeItem: (k) => v.removeItem(k), clear: () => v.clear() }; } });

process.chdir(path.join(IN.tree, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(IN.tree, 'experiments/m7/run.js'));
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks, crashAtTick: null, warmStore: false });
const m = M.record();
process.stdout.write('\n@@PROBE@@' + JSON.stringify({
  crashed: rec.outcome.crashed, calls: m.calls, goal: gen.cfg.goal,
  candidates: m.candidates.map(c => [c[0], c[1], c[2], c[3], c[4]]),
  writes: (rec.artifacts.writes || []).filter(w => typeof w === 'string'),
  goalCalls: m.resets.filter(r => r[1] === 'goal').map(r => r[0]),
  floor: FLOOR ? FLOOR.snapshot() : null, fingerprint: rec.fingerprint, cogDraws: rec.artifacts.cogDraws,
}) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

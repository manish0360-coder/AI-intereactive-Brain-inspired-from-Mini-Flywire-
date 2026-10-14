// ==========================================================
// XFER-2 — short whole-runtime probe (mechanism-isolation test; NOT an outcome study)
// ==========================================================
//   node probe_session.mjs '<json>'   json: { tree, configSeed, configIndex, agentSeed, ticks, brainPath|null }
// Runs the real runtime in the conformed tree for a few calls with a delivered episodes-only brain and reports the
// executed-action sequence, the calls on which the replay branch was taken, the first decision's candidate weights and
// the keys of the procedural stores at the end.  Used only by verify_xfer2.mjs to show, on the whole runtime, that
// (i) a quality-0.49 store and the same store at its real quality yield identical decisions until the first replay,
// and (ii) replay writes procedural keys for eligible stores and none for quality-0.49 stores.
// Same seed and territory guards as the xfer1 session driver; no endpoint of a study is produced here.
// ==========================================================
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { configSeed as typedConfigSeed, config as typedConfig } from '../registry/typed_v2.js';
import { seedOk, CONFIG_START, HELDOUT_FLOOR } from '../xfer1/config.mjs';
import { createMeasure } from '../h1r/measure.mjs';

const IN = JSON.parse(process.argv[2]);
const refuse = (m) => { throw new Error(`XFER-2 probe refused: ${m}`); };
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
if (process.env.H1R_STAGE_AUTHORISED !== undefined) refuse('H1R_STAGE_AUTHORISED is set');
if (!seedOk(IN.agentSeed).ok) refuse(seedOk(IN.agentSeed).why);
if (IN.configSeed < CONFIG_START || IN.configSeed >= HELDOUT_FLOOR || typedConfig.isHeldOut(typedConfigSeed(IN.configSeed)) || typedConfig.isConsumed(typedConfigSeed(IN.configSeed))) refuse('config seed is outside the territory or is held-out/consumed');
if (!Number.isInteger(IN.ticks) || IN.ticks < 5 || IN.ticks > 400) refuse('ticks must be in 5..400 (a probe, not a study)');

const { installH1R } = await import(URLOF(REPO, 'experiments/h1r/runtime.mjs'));
const { installMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure_install.mjs'));
const H = await installH1R({ tree: IN.tree, trustMode: 'traversal', envPosition: null });
const T = (rel) => import(URLOF(IN.tree, rel));
const [mem, envmod] = await Promise.all([T('render/memory.js'), T('experiments/m7/env.js')]);
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
const call0 = m.candidates.filter(c => c[0] === 0 && c[1] === 0).map(c => [c[2], c[4]]);
const nestedKeys = (map) => { const out = []; map.forEach((v, k) => { if (v instanceof Map) v.forEach((_, k2) => out.push(`${k}->${k2}`)); else out.push(String(k)); }); return out.sort(); };
process.stdout.write('\n@@PROBE@@' + JSON.stringify({
  crashed: rec.outcome.crashed, calls: m.calls, replays: m.replays, writes: (rec.artifacts.writes || []).filter(w => typeof w === 'string'),
  call0Weights: call0, rewardsKeys: nestedKeys(mem.rewards), transitionsKeys: nestedKeys(mem.transitions),
}) + '@@END@@\n');
process.exit(rec.outcome.crashed ? 1 : 0);

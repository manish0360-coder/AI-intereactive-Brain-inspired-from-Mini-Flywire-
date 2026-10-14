// ==========================================================
// XFER-1 — reference run (no delivery hook, no export, no sink wrapper)
// ==========================================================
//   node reference_run.mjs '<json>'      json: { tree, configSeed, configIndex, agentSeed, ticks }
// The plain pipeline H1-R and MCF-1 use: conformed runtime + measurement sink + the tree's own m7/run.js.  Its
// fingerprint must equal the one a cold XFER-1 session reports for the same input (verify_xfer1.mjs, cold
// equivalence): the harness adds observation and delivery, never behaviour.
// ==========================================================
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const IN = JSON.parse(process.argv[2]);
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const URLOF = (...p) => pathToFileURL(path.join(...p)).href;
const { installH1R } = await import(URLOF(REPO, 'experiments/h1r/runtime.mjs'));
const { installMeasure } = await import(URLOF(REPO, 'experiments/h1r/measure_install.mjs'));
const H = await installH1R({ tree: IN.tree, trustMode: 'traversal', envPosition: null });
const M = installMeasure();
await H.attachMeasure(M);
process.chdir(path.join(IN.tree, 'experiments', 'm7'));
const { runOnce } = await import(URLOF(IN.tree, 'experiments/m7/run.js'));
const rec = await runOnce({ configSeed: IN.configSeed, configIndex: IN.configIndex, agentSeed: IN.agentSeed, arm: 'A1', envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: IN.ticks, crashAtTick: null, warmStore: false });
const m = M.record();
process.stdout.write('\n@@REF@@' + JSON.stringify({ fingerprint: rec.fingerprint, goalReaches: m.resets.filter(r => r[1] === 'goal').length, calls: m.calls, crashed: rec.outcome.crashed }) + '@@END@@\n');
process.exit(0);

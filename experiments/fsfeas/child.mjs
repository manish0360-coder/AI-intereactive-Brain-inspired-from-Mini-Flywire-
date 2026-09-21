// FS-OQ1-F2-FEAS — one normal V2.3 + M7 run on one DEVELOPMENT fixture. Measurement only.
//
// The run uses the frozen parameters M39/M40 already used with these fixtures
// (experiments/uqb/protocol.js FROZEN: agentSeed 20260819000, arm A1), pin on, tickUnit 'step',
// 3000 ticks, and the frozen M40 checkpoint grid. Nothing about the mechanism is changed.
// The oracle (true p) is read ONLY in post-run analysis, never during the run.
//
// env: SEED, INDEX, HOOK ('1' = snapshot at checkpoints, '0' = no hook), OUT
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const U = pathToFileURL(ROOT).href;
const HOOK = process.env.HOOK === '1';
if (HOOK) register(pathToFileURL(path.join(HERE, 'hook_tick.mjs')).href, import.meta.url);

const SEED = Number(process.env.SEED), INDEX = Number(process.env.INDEX);
const OUT = process.env.OUT;
const ALLOWED = new Set([896066, 896238, 896329]);
const FIXTURES = new Set(['896066:0', '896066:1', '896238:2', '896329:3']);
if (!FIXTURES.has(`${SEED}:${INDEX}`)) throw new Error(`STOP: ${SEED}:${INDEX} is not an authorized development fixture`);

const GRID = [250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000];   // m40_spec.js:12
const { FROZEN } = await import(U + '/experiments/uqb/protocol.js');
const env = await import(U + '/experiments/m7/env.js');
const TR = await import(U + '/render/traversalRecord.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');

const conns = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
const DIRECTED = conns.flatMap((c) => [[c.from, c.to], [c.to, c.from]]);

function snapshot(t) {
  return { t, edges: DIRECTED.map(([u, v]) => { const r = TR.recordFor(u, v); return [u, v, r.a, r.s]; }) };
}
const snapshots = [];
if (HOOK) globalThis.__FEAS_TICK__ = (t) => { if (GRID.includes(t)) snapshots.push(snapshot(t)); };

const run = await runOnce({
  configSeed: SEED, configIndex: INDEX, agentSeed: FROZEN.agentSeed, arm: FROZEN.m7Arm,
  envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step', ticks: 3000,
  crashAtTick: null, warmStore: false,
});
globalThis.__FEAS_TICK__ = null;
snapshots.push(snapshot(3000));                     // setTick is never called with 3000; take the final state

// ---- governance assertions (STOP rather than proceed) ----
const prov = run.provenance;
if (prov.acceptedSeed !== SEED || prov.numberOfRejectedCandidatesBeforeAcceptance !== 0)
  throw new Error(`STOP: fixture did not accept at its own seed (accepted ${prov.acceptedSeed}, rejected ${prov.numberOfRejectedCandidatesBeforeAcceptance})`);
const touched = env.evaluatedSeeds();
if (touched.some((s) => !ALLOWED.has(s))) throw new Error(`STOP: a non-fixture seed was evaluated: ${touched.join(',')}`);
if (run.crash) throw new Error(`run crashed: ${run.crash.message}`);

const a = run.artifacts;
const fingerprint = {
  writesHash: crypto.createHash('sha256').update(JSON.stringify(a.writes)).digest('hex'),
  nWrites: a.writes.length, cogDraws: a.cogDraws, visDraws: a.visDraws, qEntries: a.qEntries, qSum: a.qSum,
  envCounters: a.envCounters, attempts: a.attempts, successes: a.successes, slips: a.slips,
  finalRecordHash: crypto.createHash('sha256').update(JSON.stringify(snapshots.at(-1).edges)).digest('hex'),
};

const result = {
  schema: 'fsfeas/1', fixture: `${SEED}:${INDEX}`, configSeed: SEED, configIndex: INDEX,
  agentSeed: FROZEN.agentSeed, arm: FROZEN.m7Arm, goal: prov.goal, hook: HOOK,
  commit: 'a066d47696b1502720f627855c8549f4d2898cd5', seedsTouched: touched,
  grid: GRID, snapshots, fingerprint, nodeVersion: process.version,
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `${SEED}_${INDEX}_${HOOK ? 'hook' : 'nohook'}.json`), JSON.stringify(result));
process.stdout.write('@@FEAS@@' + JSON.stringify({ fixture: result.fixture, hook: HOOK, goal: prov.goal, snapshots: snapshots.length, fingerprint }));

// ==========================================================
// GATE-FLOOR-B2 — CALIBRATION run (design input; NOT a confirmatory outcome and NOT a floor outcome)
// ==========================================================
//   node calibrate.mjs --out <dir> [--worlds 40] [--workers 6]
// Runs the floor-OFF arms (COLD, REAL, ENTRY_NR) of the first N XFER-1 worlds (0..N-1: analysed on the conformed runtime
// in XFER-1; outside every GATE-FLOOR-B2 world) on the PRISTINE derived tree, to answer, BEFORE the design is frozen:
//   * is the instrument alive here (does the real store / the goal-entry store help on this runtime)?
//   * how large are the paired standard deviations (sample size), and what is the scale of the benefits (margins)?
//   * what share of B2's goal resets are non-graph moves (the outcome definition)?
// No floor session is run; the floor arms are never exercised here.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateAcceptedStream } from '../m7/env.js';
import { trainSeed, testSeed, CONFIG_START, TICKS, BOOTSTRAP } from '../xfer1/config.mjs';
import { pairedSummary, mean, sd } from '../xfer1/stats.mjs';
import { makeGraph, entryStore } from '../xfer2/controls.mjs';
import { buildDerivedTree } from './transform.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
if (!flag('--out')) { console.error('--out is required'); process.exit(2); }
const out = path.resolve(flag('--out'));
if (!out.startsWith(fs.realpathSync.native(os.tmpdir())) && !out.includes(`${path.sep}gate-floor-b2${path.sep}data${path.sep}`)) { console.error('--out must be under the system temp dir or experiments/gate-floor-b2/data'); process.exit(2); }
const N = Number(flag('--worlds', 40)), workers = Number(flag('--workers', 6));
fs.mkdirSync(path.join(out, 'sessions'), { recursive: true }); fs.mkdirSync(path.join(out, 'brains'), { recursive: true });

const tree = buildDerivedTree();
const stream = generateAcceptedStream(CONFIG_START, N);
const g = makeGraph(JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')));
const neurons = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const LABEL = Object.fromEntries((Array.isArray(neurons) ? neurons : neurons.neurons).map(n => [Number(n.id), n.label]));
const SESSION = path.join(HERE, 'session.mjs');
function run(input) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [SESSION, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let so = '', se = '';
    c.stdout.on('data', d => { so += d; }); c.stderr.on('data', d => { se += d; });
    c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } resolve({ code, rec, se: se.slice(-300) }); });
  });
}
async function pool(tasks, n) { let next = 0; const res = new Array(tasks.length); await Promise.all(Array.from({ length: n }, async () => { for (;;) { const i = next++; if (i >= tasks.length) return; res[i] = await tasks[i](); } })); return res; }

const W = stream.map((w, i) => ({ world: i, configSeed: w.acceptedSeed, configIndex: w.acceptedConfigIndex, goal: w.goal }));
const base = (w) => ({ tree: tree.dir, world: w.world, configSeed: w.configSeed, configIndex: w.configIndex, instrument: true, floor: 'off' });
const trains = await pool(W.map(w => () => run({ ...base(w), role: 'train', label: `cal-train-w${w.world}`, agentSeed: trainSeed(w.world), ticks: TICKS.train, exportPath: path.join(out, 'brains', `w${w.world}.json`) })), workers);
const tests = [];
for (const w of W) {
  const tr = trains[w.world];
  if (tr.code !== 0 || !tr.rec) { console.error(`training failed in world ${w.world}`); continue; }
  const own = JSON.parse(fs.readFileSync(path.join(out, 'brains', `w${w.world}.json`), 'utf8')).episodes;
  fs.writeFileSync(path.join(out, 'brains', `real_w${w.world}.json`), JSON.stringify({ episodes: own }));
  fs.writeFileSync(path.join(out, 'brains', `entry_w${w.world}.json`), JSON.stringify({ episodes: entryStore(g, (n) => LABEL[n], w.goal) }));
  for (const [arm, session, file] of [['COLD', 'COLD', null], ['REAL', 'ONLY_episodes', `real_w${w.world}.json`], ['ENTRY_NR', 'ONLY_episodes', `entry_w${w.world}.json`]]) {
    const input = { ...base(w), role: 'test', label: `cal-${arm}-w${w.world}`, agentSeed: testSeed(w.world), ticks: TICKS.test, arm: session };
    if (file) { input.brainPath = path.join(out, 'brains', file); input.brainWorld = w.world; }
    tests.push({ w, arm, input, realEpisodes: own.length, nonEdgeTransitions: own.reduce((s, e) => s + e.nodes.slice(0, -1).filter((u, k) => !g.directed.has(`${u}->${e.nodes[k + 1]}`)).length, 0), transitions: own.reduce((s, e) => s + e.nodes.length - 1, 0) });
  }
}
const res = await pool(tests.map(t => () => run(t.input)), workers);
const rows = {};
res.forEach((r, i) => {
  const t = tests[i];
  if (r.code !== 0 || !r.rec) { console.error(`failed ${t.input.label}: ${r.se}`); return; }
  fs.writeFileSync(path.join(out, 'sessions', `${t.input.label}.json`), JSON.stringify(r.rec));
  (rows[t.w.world] ||= { goal: t.w.goal, realEpisodes: t.realEpisodes, nonEdgeTransitions: t.nonEdgeTransitions, transitions: t.transitions, arms: {} }).arms[t.arm] = {
    all: r.rec.endpoints.goalReaches, legal: r.rec.endpoints.legalReaches, nonEdge: r.rec.reaches.nonEdge, attemptSuccess: r.rec.endpoints.attemptSuccess, early: r.rec.endpoints.earlyReaches, drawsIntoGoal: r.rec.audit.drawsIntoGoal };
});
const worlds = Object.keys(rows).map(Number).sort((a, b) => a - b).filter(w => ['COLD', 'REAL', 'ENTRY_NR'].every(a => rows[w].arms[a]));
const m = (arm, k) => mean(worlds.map(w => rows[w].arms[arm][k]));
const diffs = (a, b, k) => worlds.map(w => rows[w].arms[a][k] - rows[w].arms[b][k]);
const summ = { status: 'CALIBRATION_NOT_CONFIRMATORY', worlds: worlds.length, perWorld: rows, arms: {}, benefit: {}, pairedSd: {} };
for (const a of ['COLD', 'REAL', 'ENTRY_NR']) summ.arms[a] = { all: m(a, 'all'), legal: m(a, 'legal'), nonEdge: m(a, 'nonEdge'), nonEdgeShare: m(a, 'nonEdge') / m(a, 'all'), attemptSuccess: m(a, 'attemptSuccess'), early: m(a, 'early'), drawsIntoGoal: m(a, 'drawsIntoGoal') };
for (const k of ['all', 'legal']) {
  for (const a of ['REAL', 'ENTRY_NR']) summ.benefit[`${a}_${k}`] = pairedSummary(diffs(a, 'COLD', k), BOOTSTRAP);
  for (const [a, b] of [['REAL', 'COLD'], ['ENTRY_NR', 'COLD'], ['ENTRY_NR', 'REAL']]) summ.pairedSd[`${a}-${b}_${k}`] = sd(diffs(a, b, k));
}
summ.storeStats = { meanEpisodes: mean(worlds.map(w => rows[w].realEpisodes)), emptyStores: worlds.filter(w => rows[w].realEpisodes === 0).length,
  nonEdgeTransitionShare: worlds.reduce((s, w) => s + rows[w].nonEdgeTransitions, 0) / Math.max(1, worlds.reduce((s, w) => s + rows[w].transitions, 0)) };
fs.writeFileSync(path.join(out, 'calibration_summary.json'), JSON.stringify(summ, null, 1));
const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
console.log(`CALIBRATION (floor-OFF arms, XFER-1 worlds 0..${N - 1}, pristine derived tree): ${worlds.length} worlds`);
for (const [a, x] of Object.entries(summ.arms)) console.log(`  ${a.padEnd(9)} resets ${f(x.all)}  legal ${f(x.legal)}  non-edge ${f(x.nonEdge)} (${f(100 * x.nonEdgeShare)}%)  attempt success ${f(x.attemptSuccess, 3)}  early ${f(x.early)}  draws into goal ${f(x.drawsIntoGoal)}`);
for (const [k, b] of Object.entries(summ.benefit)) console.log(`  benefit ${k.padEnd(16)} ${f(b.mean)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]`);
for (const [k, s] of Object.entries(summ.pairedSd)) console.log(`  paired SD ${k.padEnd(20)} ${f(s)}`);
console.log(`  real stores: mean ${f(summ.storeStats.meanEpisodes)} episodes, ${summ.storeStats.emptyStores} empty, non-edge transition share ${f(100 * summ.storeStats.nonEdgeTransitionShare)}%`);

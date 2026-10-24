// development tooling (NOT a study run): the LEARN-0 cells on XFER-1 development worlds 0..N-1 with the driver of record.
// Sessions per world: T (train, map off) + N0 (map off, COLD) + N1 (map off, FULL) + O0 (map on, COLD), plus two development-only
// component cells N1E (map off, ONLY_episodes) and N1Q (map off, ONLY_Q) that inform interpretation and are NOT part of the design.
//   node calib_learn0.mjs <outdir> [N=30] [workers=8]
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p, pathToFileURL } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');
const U = (p) => pathToFileURL(`${REPO}/${p}`).href;
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const { buildLearn0Tree } = await import(U('experiments/learn0/transform.mjs'));
const { pairedSummary, mean, sd } = await import(U('experiments/xfer1/stats.mjs'));
const SESS = `${REPO}/experiments/learn0/session.mjs`;
const out = process.argv[2], N = Number(process.argv[3] || 30), WK = Number(process.argv[4] || 8);
if (!out) { console.error('usage: node calib_learn0.mjs <outdir> [N] [workers]'); process.exit(2); }
fs.mkdirSync(path.join(out, 'brains'), { recursive: true });
const TREE = buildLearn0Tree({ outRoot: path.join(os.tmpdir(), 'mfw-learn0-calib') }).dir;
const stream = generateAcceptedStream(X1.CONFIG_START, N);
const run = (input) => new Promise(res => { const c = spawn(process.execPath, [SESS, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = '', se = ''; c.stdout.on('data', d => so += d); c.stderr.on('data', d => se += d);
  c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } res({ code, rec, se: se.slice(-300) }); }); });
async function pool(tasks, n) { let k = 0; const r = new Array(tasks.length); await Promise.all(Array.from({ length: n }, async () => { for (;;) { const i = k++; if (i >= tasks.length) return; r[i] = await tasks[i](); } })); return r; }
const base = (w) => ({ tree: TREE, world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, cond: 'P', instrument: true });
const ws = Array.from({ length: N }, (_, w) => w);
const trains = await pool(ws.map(w => () => run({ ...base(w), role: 'train', label: `dev-T-w${w}`, agentSeed: X1.trainSeed(w), ticks: 1500, map: 'off', exportPath: path.join(out, 'brains', `T_w${w}.json`) })), WK);
const CELLS = [['N0', 'off', 'COLD'], ['N1', 'off', 'FULL'], ['O0', 'on', 'COLD'], ['N1E', 'off', 'ONLY_episodes'], ['N1Q', 'off', 'ONLY_Q']];
const rows = {}, failures = [];
trains.forEach((t, w) => { if (t.code !== 0 || !t.rec) { failures.push(`T w${w}: ${t.se}`); return; }
  rows[w] = { goal: stream[w].goal, T: { legal: t.rec.reaches.legal, nonEdge: t.rec.reaches.nonEdge, mapOk: t.rec.mapAudit.ok, integrity: t.rec.conditionIntegrity.ok, sizes: t.rec.brain.endSizes, goalKeyedQ: t.rec.brain.goalKeyedQ }, cells: {} }; });
const jobs = ws.filter(w => rows[w]).flatMap(w => CELLS.map(([name, map, arm]) => ({ w, name, input: { ...base(w), role: 'test', label: `dev-${name}-w${w}`, agentSeed: X1.testSeed(w), ticks: 1500, arm, map,
  ...(arm === 'COLD' ? {} : { brainPath: path.join(out, 'brains', `T_w${w}.json`), brainWorld: w }) } })));
const res = await pool(jobs.map(j => () => run(j.input)), WK);
res.forEach((r, i) => { const j = jobs[i]; if (r.code !== 0 || !r.rec) { failures.push(`${j.name} w${j.w}: ${r.se}`); return; } const x = r.rec, m = x.moves;
  rows[j.w].cells[j.name] = { legal: x.reaches.legal, nonEdge: x.reaches.nonEdge, all: x.reaches.goal, halves: x.reaches.legalHalves, mapOk: x.mapAudit.ok, executed: x.mapAudit.executed, integrity: x.conditionIntegrity.ok,
    startSizes: x.brain.start.sizes, deliveredEpisodesHash: x.brain.deliveredHashes ? x.brain.deliveredHashes.episodes : null, startEpisodesHash: x.brain.start.hashes.episodes,
    far: m.far, farDownhill: m.farDownhill, farChance: m.farChance, adjacent: m.adjacent, adjacentEnter: m.adjacentEnter, adjacentChance: m.adjacentChance, illegalExecuted: x.diag.illegalExecuted,
    channels: x.diag.channels, admittedNonGraph: x.guard.counters.admitted }; });
fs.writeFileSync(path.join(out, 'calib_learn0_rows.json'), JSON.stringify({ n: N, cells: CELLS.map(c => c[0]), rows, failures }));
const W = ws.filter(w => rows[w] && CELLS.every(([c]) => rows[w].cells[c]));
const v = (c, k) => W.map(w => rows[w].cells[c][k]);
const d = (a, b, k = 'legal') => W.map(w => rows[w].cells[a][k] - rows[w].cells[b][k]);
const B = X1.BOOTSTRAP;
const rate = (c, num, den) => W.map(w => rows[w].cells[c][den] > 0 ? rows[w].cells[c][num] / rows[w].cells[c][den] : 0);
const z = 1.959964 + 0.841621;
const nFor = (s, delta) => Math.ceil((z * s / delta) ** 2);
const cellMeans = Object.fromEntries(CELLS.map(([c]) => [c, { legal: mean(v(c, 'legal')), nonEdge: mean(v(c, 'nonEdge')), all: mean(v(c, 'all')), early: mean(W.map(w => rows[w].cells[c].halves[0])), late: mean(W.map(w => rows[w].cells[c].halves[1])),
  downhillFar: mean(rate(c, 'farDownhill', 'far')), chanceFar: mean(rate(c, 'farChance', 'far')), enterAdjacent: mean(rate(c, 'adjacentEnter', 'adjacent')), chanceAdjacent: mean(rate(c, 'adjacentChance', 'adjacent')),
  illegalExecuted: mean(v(c, 'illegalExecuted')), admittedNonGraph: mean(v(c, 'admittedNonGraph')) }]));
const contrasts = {
  E1_N1_minus_N0: pairedSummary(d('N1', 'N0'), B), S1_nonGraph_N1_minus_N0: pairedSummary(d('N1', 'N0', 'nonEdge'), B), S1_all_N1_minus_N0: pairedSummary(d('N1', 'N0', 'all'), B),
  S2_N0_late_minus_early: pairedSummary(W.map(w => rows[w].cells.N0.halves[1] - rows[w].cells.N0.halves[0]), B),
  S3_downhill_N1_minus_N0: pairedSummary(W.map((w, i) => rate('N1', 'farDownhill', 'far')[i] - rate('N0', 'farDownhill', 'far')[i]), B),
  S4_enter_N1_minus_N0: pairedSummary(W.map((w, i) => rate('N1', 'adjacentEnter', 'adjacent')[i] - rate('N0', 'adjacentEnter', 'adjacent')[i]), B),
  S5_O0_minus_N0: pairedSummary(d('O0', 'N0'), B),
  dev_N1E_minus_N0: pairedSummary(d('N1E', 'N0'), B), dev_N1Q_minus_N0: pairedSummary(d('N1Q', 'N0'), B), dev_N1E_minus_N1: pairedSummary(d('N1E', 'N1'), B),
};
const summary = { status: 'DEVELOPMENT (XFER-1 worlds 0..N-1; not study worlds; design input only)', worlds: W.length, failures: failures.length,
  integrity: { allMapAuditsOk: W.every(w => rows[w].T.mapOk && CELLS.every(([c]) => rows[w].cells[c].mapOk)), allConditionOk: W.every(w => rows[w].T.integrity && CELLS.every(([c]) => rows[w].cells[c].integrity)),
    deliveryExact: W.every(w => ['N1', 'N1E'].every(c => rows[w].cells[c].deliveredEpisodesHash === rows[w].cells[c].startEpisodesHash) && rows[w].cells.N0.startSizes.episodes === 0 && rows[w].cells.O0.startSizes.episodes === 0) },
  cellMeans, contrasts: Object.fromEntries(Object.entries(contrasts).map(([k, s]) => [k, { mean: s.mean, lower: s.ci.lower, upper: s.ci.upper, sd: s.sd, positive: s.positive, negative: s.negative }])),
  sizing: Object.fromEntries([10, 15, 20, 25, 30].map(delta => [`delta${delta}`, { n: nFor(contrasts.E1_N1_minus_N0.sd, delta), nInflated: nFor(contrasts.E1_N1_minus_N0.sd * 1.25, delta) }])),
  training: { legal: mean(W.map(w => rows[w].T.legal)), nonEdge: mean(W.map(w => rows[w].T.nonEdge)), goalKeyedQ: mean(W.map(w => rows[w].T.goalKeyedQ)), episodes: mean(W.map(w => rows[w].T.sizes.episodes)) } };
fs.writeFileSync(path.join(out, 'calib_learn0_summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ worlds: W.length, failures: failures.length, integrity: summary.integrity }));
for (const [c, m] of Object.entries(cellMeans)) console.log(c.padEnd(4), Object.entries(m).map(([k, x]) => `${k} ${Number(x).toFixed(k.match(/downhill|chance|enter/i) ? 3 : 1)}`).join(' | '));
for (const [k, s] of Object.entries(summary.contrasts)) console.log(k.padEnd(28), `${s.mean.toFixed(2)} [${s.lower.toFixed(2)}, ${s.upper.toFixed(2)}] sd ${s.sd.toFixed(2)} +${s.positive}/-${s.negative}`);
console.log('sizing', JSON.stringify(summary.sizing));

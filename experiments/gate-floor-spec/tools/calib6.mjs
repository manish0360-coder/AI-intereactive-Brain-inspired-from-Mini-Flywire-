// scratch: development-world calibration of the candidate six-cell design (XFER-1 worlds 0..N-1; NOT a study world; non-confirmatory)
//   stores: U = trained UNGUARDED (as Block I), G = trained under the guard bundle (floor off); tests always floor ON, hook state P
//   cells: U_off, U_mask, U_exec, U_both, G_off, G_both
//   node calib6.mjs <outdir> <N> <workers>
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const S = path.dirname(process.argv[1]); const U = (p) => `file:///${REPO}/${p}`;
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const { buildGuardTree } = await import(U('experiments/gate-floor-interaction/transform.mjs'));
const TREE = buildGuardTree().dir;
const out = process.argv[2], N = Number(process.argv[3]), WK = Number(process.argv[4] || 8);
fs.mkdirSync(path.join(out, 'brains'), { recursive: true });
const stream = generateAcceptedStream(X1.CONFIG_START, N);
const run = (input) => new Promise(res => { const c = spawn(process.execPath, [`${S}/session_d2.mjs`, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = '', se = ''; c.stdout.on('data', d => so += d); c.stderr.on('data', d => se += d);
  c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } res({ code, rec, se: se.slice(-300) }); }); });
async function pool(tasks, n) { let k = 0; const r = new Array(tasks.length); await Promise.all(Array.from({ length: n }, async () => { for (;;) { const i = k++; if (i >= tasks.length) return; r[i] = await tasks[i](); } })); return r; }
const W = (w) => ({ world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex });
const base = (w) => ({ tree: TREE, ...W(w), cond: 'P', instrument: true });
const trainJobs = []; for (let w = 0; w < N; w++) for (const kind of ['U', 'G']) trainJobs.push({ w, kind });
const trains = await pool(trainJobs.map(j => () => run({ ...base(j.w), role: 'train', label: `d2-train${j.kind}-w${j.w}`, agentSeed: X1.trainSeed(j.w), ticks: 1500, floor: 'off', guard: j.kind === 'G' ? 'on' : 'off',
  exportPath: path.join(out, 'brains', `${j.kind}_w${j.w}.json`) })), WK);
const CELLS = [{ name: 'U_off', store: 'U', guard: 'off' }, { name: 'U_mask', store: 'U', guard: 'mask' }, { name: 'U_exec', store: 'U', guard: 'exec' }, { name: 'U_both', store: 'U', guard: 'on' },
  { name: 'G_off', store: 'G', guard: 'off' }, { name: 'G_both', store: 'G', guard: 'on' }];
const tests = []; const storeStats = {};
const ADJ = new Set(); for (const e of JSON.parse(fs.readFileSync(`${REPO}/connections.json`, 'utf8'))) { ADJ.add(`${Number(e.from)}|${Number(e.to)}`); ADJ.add(`${Number(e.to)}|${Number(e.from)}`); }
for (let w = 0; w < N; w++) {
  storeStats[w] = {};
  for (const kind of ['U', 'G']) {
    const t = trains[trainJobs.findIndex(j => j.w === w && j.kind === kind)];
    if (t.code !== 0 || !t.rec) { console.error('train failed', kind, w, t.se); continue; }
    const own = JSON.parse(fs.readFileSync(path.join(out, 'brains', `${kind}_w${w}.json`), 'utf8')).episodes;
    fs.writeFileSync(path.join(out, 'brains', `real${kind}_w${w}.json`), JSON.stringify({ episodes: own }));
    let pairs = 0, ng = 0, term = 0; for (const ep of own) { const n = ep.nodes; for (let i = 0; i + 1 < n.length; i++) { if (n[i] === n[i + 1]) continue; pairs++; if (!ADJ.has(`${Number(n[i])}|${Number(n[i + 1])}`)) ng++; } if (n.length >= 2 && Number(n[n.length - 1]) === stream[w].goal && !ADJ.has(`${Number(n[n.length - 2])}|${Number(n[n.length - 1])}`) && n[n.length - 2] !== n[n.length - 1]) term++; }
    storeStats[w][kind] = { episodes: own.length, pairs, nonGraphPairs: ng, terminalNonGraph: term, trainLegal: t.rec.reaches.legal, trainNonGraph: t.rec.reaches.nonEdge };
  }
  for (const c of CELLS) {
    if (!storeStats[w][c.store]) continue;
    tests.push({ w, cell: c.name, input: { ...base(w), role: 'test', label: `d2-${c.name}-w${w}`, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'ONLY_episodes', floor: 'on', guard: c.guard,
      brainPath: path.join(out, 'brains', `real${c.store}_w${w}.json`), brainWorld: w } });
  }
}
const res = await pool(tests.map(t => () => run(t.input)), WK);
const rows = {};
res.forEach((r, i) => { const t = tests[i]; if (r.code !== 0 || !r.rec) { console.error('failed', t.input.label, r.se); return; } const rec = r.rec;
  (rows[t.w] ||= { goal: stream[t.w].goal, store: storeStats[t.w], cells: {} }).cells[t.cell] = { all: rec.endpoints.goalReaches, legal: rec.endpoints.legalReaches, nonEdge: rec.reaches.nonEdge, kinds: rec.nonGraphResetKinds,
    moves: rec.moveClass, guard: rec.guard.counters, floor: rec.floor ? { ...rec.floor.counters } : null, integrityOk: rec.conditionIntegrity.ok, consistent: rec.audit.reachesEqualLegalPlusNonEdge, calls: rec.counters.calls }; });
fs.writeFileSync(path.join(out, 'calib6_rows.json'), JSON.stringify({ n: N, cells: CELLS.map(c => c.name), rows }));
console.log('done', Object.keys(rows).length, 'worlds');

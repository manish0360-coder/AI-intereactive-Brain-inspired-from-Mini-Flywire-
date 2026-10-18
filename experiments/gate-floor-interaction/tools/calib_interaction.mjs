// scratch: development-world calibration of the 8-cell store x floor x guard design (XFER-1 worlds 0..N-1; NOT a study world; non-confirmatory)
//   node calib_interaction.mjs <outdir> <N> <workers>
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const S = path.dirname(process.argv[1]); const U = (p) => `file:///${REPO}/${p}`;
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const GUARD_TREE = path.join(S, 'trees', fs.readdirSync(path.join(S, 'trees'))[0]);
const out = process.argv[2], N = Number(process.argv[3]), WK = Number(process.argv[4] || 10);
fs.mkdirSync(path.join(out, 'brains'), { recursive: true });
const stream = generateAcceptedStream(X1.CONFIG_START, N);
const run = (input) => new Promise(res => { const c = spawn(process.execPath, [`${S}/session_guard.mjs`, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = '', se = ''; c.stdout.on('data', d => so += d); c.stderr.on('data', d => se += d);
  c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } res({ code, rec, se: se.slice(-300) }); }); });
async function pool(tasks, n) { let k = 0; const r = new Array(tasks.length); await Promise.all(Array.from({ length: n }, async () => { for (;;) { const i = k++; if (i >= tasks.length) return; r[i] = await tasks[i](); } })); return r; }
const W = (w) => ({ world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex });
const base = (w) => ({ tree: GUARD_TREE, ...W(w), cond: 'P', instrument: true });
const trains = await pool([...Array(N).keys()].map(w => () => run({ ...base(w), role: 'train', label: `ic-train-w${w}`, agentSeed: X1.trainSeed(w), ticks: 1500, floor: 'off', guard: 'off', exportPath: path.join(out, 'brains', `w${w}.json`) })), WK);
const CELLS = []; for (const store of ['COLD', 'REAL']) for (const f of [0, 1]) for (const g of [0, 1]) CELLS.push({ name: `${store}_F${f}_G${g}`, store, f, g });
const tests = [];
for (let w = 0; w < N; w++) {
  if (trains[w].code !== 0 || !trains[w].rec) { console.error('train failed', w, trains[w].se); continue; }
  const own = JSON.parse(fs.readFileSync(path.join(out, 'brains', `w${w}.json`), 'utf8')).episodes;
  const rf = path.join(out, 'brains', `real_w${w}.json`); fs.writeFileSync(rf, JSON.stringify({ episodes: own }));
  for (const c of CELLS) {
    const input = { ...base(w), role: 'test', label: `ic-${c.name}-w${w}`, agentSeed: X1.testSeed(w), ticks: 1500, arm: c.store === 'COLD' ? 'COLD' : 'ONLY_episodes', floor: c.f ? 'on' : 'off', guard: c.g ? 'on' : 'off' };
    if (c.store === 'REAL') { input.brainPath = rf; input.brainWorld = w; }
    tests.push({ w, cell: c.name, input, episodes: own.length });
  }
}
const res = await pool(tests.map(t => () => run(t.input)), WK);
const rows = {};
res.forEach((r, i) => { const t = tests[i]; if (r.code !== 0 || !r.rec) { console.error('failed', t.input.label, r.se); return; }
  const rec = r.rec;
  (rows[t.w] ||= { goal: stream[t.w].goal, episodes: t.episodes, cells: {} }).cells[t.cell] = { all: rec.endpoints.goalReaches, legal: rec.endpoints.legalReaches, nonEdge: rec.reaches.nonEdge, early: rec.endpoints.earlyReaches,
    moveClass: rec.moveClass, guard: rec.guard && rec.guard.counters, floor: rec.floor ? { ...rec.floor.counters } : null, integrityOk: rec.conditionIntegrity.ok, consistent: rec.audit.reachesEqualLegalPlusNonEdge }; });
fs.writeFileSync(path.join(out, 'calibration_interaction_rows.json'), JSON.stringify({ n: N, cells: CELLS.map(c => c.name), rows }));
console.log('done', Object.keys(rows).length, 'worlds');

// scratch: of the non-graph goal resets in UNGUARDED sessions, how many start from a stale reasoning (reasoning.from != position)?
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const S = path.dirname(process.argv[1]); const U = (p) => `file:///${REPO}/${p}`;
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const { buildGuardTree } = await import(U('experiments/gate-floor-interaction/transform.mjs'));
const TREE = buildGuardTree().dir; const stream = generateAcceptedStream(X1.CONFIG_START, 8);
const run = (input) => new Promise(res => { const c = spawn(process.execPath, [`${S}/session_d2.mjs`, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = ''; c.stdout.on('data', d => so += d); c.on('close', () => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); res(m ? JSON.parse(m[1]) : null); }); });
const base = (w) => ({ role: 'test', label: 'c', world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', cond: 'P', floor: 'on', instrument: true, tree: TREE });
const jobs = []; for (let w = 0; w < 8; w++) for (const g of ['off', 'mask']) jobs.push({ w, g });
const res = await Promise.all(jobs.map(j => run({ ...base(j.w), guard: j.g })));
for (const g of ['off', 'mask']) { const R = jobs.map((j, i) => (j.g === g ? res[i] : null)).filter(Boolean); const m = (f) => R.reduce((s, r) => s + f(r), 0) / R.length;
  console.log(`guard ${g.padEnd(4)} (8 dev worlds, floor ON): non-graph resets ${m(r => r.reaches.nonEdge).toFixed(1)} = stale-reasoning ${m(r => r.nonGraphResetKinds.stale).toFixed(1)} + decision non-edge ${m(r => r.nonGraphResetKinds.decisionNonEdge).toFixed(1)}; executed non-graph decisions ${m(r => r.moveClass.nonGraph).toFixed(1)}`); }

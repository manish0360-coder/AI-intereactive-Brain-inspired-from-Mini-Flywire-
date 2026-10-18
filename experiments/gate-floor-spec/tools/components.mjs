// scratch: can the guard's two components be separated with the PINNED guard lines?  Development worlds 1-3, state P, floor ON,
// COLD store, guard in {off, mask, exec, on}.  Structure and cost only; development worlds, not a confirmatory outcome.
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url))).split(String.fromCharCode(92)).join('/');   // repository root (forward slashes)
const S = path.dirname(process.argv[1]); const U = (p) => `file:///${REPO}/${p}`;
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const { buildGuardTree } = await import(U('experiments/gate-floor-interaction/transform.mjs'));
const TREE = buildGuardTree().dir;
const stream = generateAcceptedStream(X1.CONFIG_START, 4);
const run = (input) => new Promise(res => { const c = spawn(process.execPath, [`${S}/session_d2.mjs`, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = '', se = ''; c.stdout.on('data', d => so += d); c.stderr.on('data', d => se += d);
  c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); let rec = null; try { rec = m ? JSON.parse(m[1]) : null; } catch { rec = null; } res({ code, rec, se: se.slice(-300) }); }); });
const base = (w) => ({ role: 'test', label: 'c', world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', cond: 'P', floor: 'on', instrument: true, tree: TREE });
const modes = ['off', 'mask', 'exec', 'on'];
const jobs = []; for (const w of [1, 2, 3]) for (const g of modes) jobs.push({ w, g });
const res = await Promise.all(jobs.map(j => run({ ...base(j.w), guard: j.g })));
const f = (x, d = 0) => Number(x).toFixed(d);
for (const w of [1, 2, 3]) {
  console.log(`world ${w} (goal ${stream[w].goal}):`);
  for (const g of modes) {
    const r = res[jobs.findIndex(j => j.w === w && j.g === g)];
    if (!r.rec) { console.log('  ', g, 'FAILED', r.se); continue; }
    const x = r.rec, c = x.guard.counters;
    console.log(`  guard ${g.padEnd(5)} legal ${f(x.reaches.legal).padStart(4)} nonGraph resets ${f(x.reaches.nonEdge).padStart(3)} total ${f(x.reaches.goal).padStart(4)} | moves legal ${f(x.moveClass.legal).padStart(4)} nonGraph ${f(x.moveClass.nonGraph).padStart(3)} none ${f(x.moveClass.none)} | masked ${f(c.maskedOut).padStart(5)} blocked ${f(c.blockedIllegal).padStart(4)} admittedNonGraph ${f(c.admitted).padStart(5)}`);
  }
}

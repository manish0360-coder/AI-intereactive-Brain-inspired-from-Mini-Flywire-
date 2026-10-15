// scratch: do the two guard lines keep default-off neutrality, and what does guard ON do structurally?  (dev worlds 1-3, state P,
// floor OFF, COLD store).  Integrity / structure only; no study world.
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath as _f2p } from 'node:url';
import { resolve as _resolve } from 'node:path';
const REPO = _resolve(_f2p(new URL('../../../', import.meta.url)));   // repository root
const { generateAcceptedStream } = await import(U('experiments/m7/env.js')); const X1 = await import(U('experiments/xfer1/config.mjs'));
const { buildHeadTree } = await import(U('experiments/gate-floor-prodsem/transform.mjs'));
const REF_TREE = buildHeadTree({ derived: true }).dir;
const GUARD_TREE = path.join(S, 'trees', fs.readdirSync(path.join(S, 'trees'))[0]);
const stream = generateAcceptedStream(X1.CONFIG_START, 4);
const run = (script, input) => new Promise(res => { const c = spawn(process.execPath, [script, JSON.stringify(input)], { stdio: ['ignore', 'pipe', 'pipe'] }); let so = '', se = ''; c.stdout.on('data', d => so += d); c.stderr.on('data', d => se += d);
  c.on('close', code => { const m = so.match(/@@RESULT@@(.*)@@END@@/s); res({ code, rec: m ? JSON.parse(m[1]) : null, se: se.slice(-300) }); }); });
const base = (w) => ({ role: 'test', label: 'gf', world: w, configSeed: stream[w].acceptedSeed, configIndex: stream[w].acceptedConfigIndex, agentSeed: X1.testSeed(w), ticks: 1500, arm: 'COLD', cond: 'P', floor: 'off', instrument: true });
const view = (r) => JSON.stringify({ fp: r.artifacts.fingerprint, end: r.brain.endHash, cog: r.artifacts.cogDraws, vis: r.artifacts.visDraws, reaches: r.reaches, w: r.artifacts.writesSha256 });
const REFSESS = `${REPO}/experiments/gate-floor-prodsem/session.mjs`, GS = `${S}/session_guard.mjs`;
for (const w of [1, 2, 3]) {
  const [ref, off, armed, on] = await Promise.all([run(REFSESS, { ...base(w), tree: REF_TREE }), run(GS, { ...base(w), tree: GUARD_TREE, guard: 'off' }), run(GS, { ...base(w), tree: GUARD_TREE, guard: 'armedOff' }), run(GS, { ...base(w), tree: GUARD_TREE, guard: 'on' })]);
  if (![ref, off, armed, on].every(x => x.rec)) { console.log('world', w, 'FAILED', [ref, off, armed, on].map(x => x.se).join('|')); continue; }
  const r = on.rec;
  console.log(`world ${w} goal ${r.input.goal}: ref==guard-line-present-off ${view(ref.rec) === view(off.rec)}; ref==armed-off ${view(ref.rec) === view(armed.rec)}; armed counters ${JSON.stringify(armed.rec.guard.counters)}`);
  console.log(`   guard ON: reaches goal ${r.reaches.goal} legal ${r.reaches.legal} nonGraph ${r.reaches.nonEdge} | moves ${JSON.stringify(r.moveClass)} | counters ${JSON.stringify(r.guard.counters)} | integrity ok ${r.conditionIntegrity.ok}`);
  console.log(`   guard OFF: reaches goal ${off.rec.reaches.goal} legal ${off.rec.reaches.legal} nonGraph ${off.rec.reaches.nonEdge} | moves ${JSON.stringify(off.rec.moveClass)}`);
}

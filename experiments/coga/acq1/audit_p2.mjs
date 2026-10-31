// Independent re-derivation of the P2 result from the raw development session logs.
// Deliberately does NOT import events.mjs / analysis.mjs / distal.mjs: reliability-optimal sets are recomputed by exhaustive
// simple-path enumeration, agreement is counted from the log rows, and the bootstrap is written afresh.
//   node audit_p2.mjs <repo root>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = process.argv[2];
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const env = await imp('experiments/m7/env.js');
const { makeRng } = await imp('instrumentation/rng.js');
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')).map(e => [Number(e.from), Number(e.to)]);
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
const adj = new Map(NODES.map(n => [n, []]));
EDGES.forEach(([a, b], e) => { adj.get(a).push([b, e]); adj.get(b).push([a, e]); });
const KAPPA = 0.10, GAMMA = 0.95;
const cost = { attempts: (p) => 1 / p, discounted: (p) => Math.log(p * GAMMA / (1 - (1 - p) * GAMMA)) / Math.log(GAMMA) };

// expected cost from a to the goal avoiding s, by exhaustive simple paths
function kAvoiding(a, goal, s, p, w) {
  if (a === goal) return 0;
  let best = Infinity; const seen = new Set([a, s]);
  (function dfs(u, acc) {
    for (const [v, e] of adj.get(u)) {
      if (seen.has(v)) continue;
      const c = acc + w(p[e]);
      if (v === goal) { if (c < best) best = c; continue; }
      seen.add(v); dfs(v, c); seen.delete(v);
    }
  })(a, 0);
  return best;
}
function nearSet(s, goal, p, w, kappa) {
  const vals = adj.get(s).map(([a, e]) => [a, w(p[e]) + kAvoiding(a, goal, s, p, w)]).filter(x => Number.isFinite(x[1]));
  const m = Math.min(...vals.map(x => x[1]));
  return vals.filter(x => x[1] <= (1 + kappa) * m).map(x => x[0]);
}
const stream = env.generateAcceptedStream(200000, 30);
const dir = path.join(ROOT, 'experiments', 'coga', 'data', 'dev-mfw-A');
const ev = JSON.parse(fs.readFileSync(path.join(ROOT, 'experiments', 'coga', 'evidence', 'baselines_dev.json'), 'utf8'));

// manifest integrity of the raw files
{
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  let bad = 0; for (const [f, h] of Object.entries(m.files)) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex') !== h) bad++;
  console.log(`raw manifest: ${Object.keys(m.files).length} files, ${bad} hash mismatches, sessions ok ${m.ok}/${m.sessions}`);
}
const baselineShare = new Map(ev.sessions.filter(s => s.agent === 'RW').map(s => [s.world, s.competence.share]));
const rows = [];
for (const w of stream) {
  const f = path.join(dir, `MFW-study${w.acceptedConfigIndex}-NOSWAP.json`);
  if (!fs.existsSync(f)) continue;
  const S = JSON.parse(fs.readFileSync(f, 'utf8'));
  const p1 = w.cfg.pPhase1, goal = w.goal;
  const A1 = new Map();
  for (const s of NODES) { if (s === goal) continue; const a = new Set([...nearSet(s, goal, p1, cost.attempts, KAPPA), ...nearSet(s, goal, p1, cost.discounted, KAPPA)]); A1.set(s, a); }
  let n = 0, hit = 0, expectedRW = 0;
  for (const [t, from, to, kind] of S.log) { if (t < 1000 || t >= 1500 || kind !== 1 || from === goal) continue; n++; if (A1.get(from).has(to)) hit++; expectedRW += A1.get(from).size / adj.get(from).length; }
  rows.push({ world: w.acceptedConfigIndex, goal, n, mfw: hit / n, rw: baselineShare.get(String(w.acceptedConfigIndex)), chanceAtMfwStates: expectedRW / n });
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`worlds ${rows.length}; MFW ${mean(rows.map(r => r.mfw)).toFixed(4)} RW ${mean(rows.map(r => r.rw)).toFixed(4)} chance-at-MFW's-own-states ${mean(rows.map(r => r.chanceAtMfwStates)).toFixed(4)}`);
for (const r of rows) console.log(`  w${String(r.world).padStart(2)} goal ${String(r.goal).padStart(2)} n ${r.n} MFW ${r.mfw.toFixed(3)} RW ${r.rw.toFixed(3)} chance@MFW-states ${r.chanceAtMfwStates.toFixed(3)} diff ${(r.mfw - r.rw).toFixed(3)}`);
for (const g of [8, 12, 16, 19]) { const x = rows.filter(r => r.goal === g); console.log(`  goal ${g}: worlds ${x.length}, mean MFW ${mean(x.map(r => r.mfw)).toFixed(3)}, RW ${mean(x.map(r => r.rw)).toFixed(3)}, diff ${mean(x.map(r => r.mfw - r.rw)).toFixed(3)}`); }

// fresh goal-stratified world bootstrap
const rnd = makeRng(777), groups = [8, 12, 16, 19].map(g => rows.filter(r => r.goal === g)), out = [];
for (let b = 0; b < 20000; b++) { let s = 0, c = 0; for (const G of groups) for (let i = 0; i < G.length; i++) { const r = G[Math.floor(rnd() * G.length)]; s += r.mfw - r.rw; c++; } out.push(s / c); }
out.sort((a, b) => a - b);
console.log(`independent bootstrap: diff ${mean(rows.map(r => r.mfw - r.rw)).toFixed(4)} [${out[Math.floor(0.025 * out.length)].toFixed(4)}, ${out[Math.floor(0.975 * out.length)].toFixed(4)}]`);
// MFW vs chance at the states MFW itself visited (removes the visitation mix)
{ const rnd2 = makeRng(778), o = []; for (let b = 0; b < 20000; b++) { let s = 0, c = 0; for (const G of groups) for (let i = 0; i < G.length; i++) { const r = G[Math.floor(rnd2() * G.length)]; s += r.mfw - r.chanceAtMfwStates; c++; } o.push(s / c); }
  o.sort((a, b) => a - b); console.log(`MFW minus chance at its own states: ${mean(rows.map(r => r.mfw - r.chanceAtMfwStates)).toFixed(4)} [${o[Math.floor(0.025 * o.length)].toFixed(4)}, ${o[Math.floor(0.975 * o.length)].toFixed(4)}]`); }

// ==========================================================
// ACQ-1 — independent re-derivation of the primary result from the raw session logs (written after the run, changes nothing)
// ==========================================================
//   node experiments/coga/acq1/audit_primary.mjs --dir experiments/coga/data/acq1-confirmatory --results experiments/coga/acq1/evidence/results.json --out <file>
// Deliberately imports none of distal.mjs, states.mjs, metric.mjs or analysis.mjs:
//   - optimal sets by exhaustive simple-path enumeration on G minus s (the frozen code uses Dijkstra);
//   - shares counted from the log rows; the interval written afresh, with the t quantile found by bisection on a numerically
//     integrated density (the frozen code uses a Cornish-Fisher expansion);
//   - a stratified sign-flip test of the primary, which uses no distributional assumption.
// Shared with the frozen run on purpose: the world generator, and the baseline simulator for the random-walk logs (MFW logs are read
// from disk).  Also re-hashes every raw file against the run manifest and checks each session's provenance.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateAccepted } from '../../m7/env.js';
import { runAcq } from './baselines.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = arg('--dir'), FROZEN = JSON.parse(fs.readFileSync(arg('--results'), 'utf8'));
const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const ALLOC = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'evidence', 'allocation.json'), 'utf8')).allocation;
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8')).map(e => [Number(e.from), Number(e.to)]);
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
const adj = new Map(NODES.map(n => [n, []]));
EDGES.forEach(([a, b], e) => { adj.get(a).push([b, e]); adj.get(b).push([a, e]); });
const edgeOf = new Map(); for (const [u, l] of adj) for (const [v, e] of l) edgeOf.set(`${u}-${v}`, e);
const KAPPA = 0.10, GAMMA = 0.95, LO = 9000, HI = 12000;
const COST = [(p) => 1 / p, (p) => Math.log(p * GAMMA / (1 - (1 - p) * GAMMA)) / Math.log(GAMMA)];

function bestAvoiding(a, goal, s, p, w) {
  if (a === goal) return 0;
  let best = Infinity; const seen = new Set([a, s]);
  (function dfs(u, acc) {
    for (const [v, e] of adj.get(u)) {
      if (seen.has(v)) continue;
      const c = acc + w(p[e]);
      if (c >= best) continue;
      if (v === goal) { best = c; continue; }
      seen.add(v); dfs(v, c); seen.delete(v);
    }
  })(a, 0);
  return best;
}
function nearUnion(s, goal, p, tol) {
  const out = new Set();
  for (const w of COST) {
    const vals = adj.get(s).map(([a, e]) => [a, w(p[e]) + bestAvoiding(a, goal, s, p, w)]).filter(x => Number.isFinite(x[1]));
    const m = Math.min(...vals.map(x => x[1]));
    for (const [a, v] of vals) if (v <= (1 + tol) * m) out.add(a);
  }
  return out;
}
function switchSet(p1, p2, goal) {
  const out = [];
  for (const s of NODES) {
    if (s === goal || adj.get(s).length < 2) continue;
    const a = nearUnion(s, goal, p1, 2 * KAPPA), b = nearUnion(s, goal, p2, 2 * KAPPA);
    if ([...a].some(x => b.has(x))) continue;
    out.push({ s, A1: nearUnion(s, goal, p1, KAPPA), A2: nearUnion(s, goal, p2, KAPPA) });
  }
  return out;
}
function psiOf(sw, log1, log2) {
  const count = (log, s, set) => { let n = 0, h = 0; for (const r of log) if (r[0] >= LO && r[0] < HI && r[3] === 1 && r[1] === s) { n++; if (set.has(r[2])) h++; } return [n, h]; };
  const vals = [];
  for (const d of sw) {
    const [n1, h11] = count(log1, d.s, d.A1), [n2, h21] = count(log2, d.s, d.A1), [, h12] = count(log1, d.s, d.A2), [, h22] = count(log2, d.s, d.A2);
    if (!n1 || !n2) continue;
    vals.push(0.5 * (h11 / n1 - h21 / n2 + h22 / n2 - h12 / n1));
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// raw files against the run manifest, and session provenance
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
let badHash = 0; for (const [f, h] of Object.entries(manifest.files)) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f))).digest('hex') !== h) badHash++;
const prov = { sessions: 0, confirmatoryKind: 0, mapOk: 0, oraclesExecuted: 0, refused: 0, clockViolations: 0, rngOk: 0, ticksOk: 0, seedMismatch: 0, trees: {} };
const sessionFiles = Object.keys(manifest.files).filter(f => /^MFW/.test(f));
for (const f of sessionFiles) {
  const s = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  prov.sessions++; if (s.kind === 'confirmatory') prov.confirmatoryKind++; if (s.mapAudit.ok) prov.mapOk++;
  prov.oraclesExecuted += Object.values(s.mapAudit.executed).reduce((a, b) => a + b, 0); prov.refused += s.envCounters.refused; prov.clockViolations += s.clock.violations;
  if (s.rng.seededBeforeBoot === false && s.rng.seededAtFirstStep === true) prov.rngOk++; if (s.outcome.ticksExecuted === 12000) prov.ticksOk++;
  const a = ALLOC.find(x => x.index === s.world.index); if (!a || a.configSeed !== s.world.configSeed) prov.seedMismatch++;
  const t = `${s.variant}:${s.provenance.mainSha256.slice(0, 12)}`; prov.trees[t] = (prov.trees[t] || 0) + 1;
}

// the world values
const rows = [], setsCompared = { worlds: 0, stateSetsDifferent: 0 };
for (const a of ALLOC) {
  const g = generateAccepted(a.configSeed, a.index), p1 = g.cfg.pPhase1, p2 = g.cfg.pPhase2, goal = g.cfg.goal;
  const sw = switchSet(p1, p2, goal);
  const load = (e) => JSON.parse(fs.readFileSync(path.join(DIR, `MFWP-w${a.index}-${e}.json`), 'utf8'));
  const id = `acq1:study:${a.index}`, world = { id, goal, p1, p2, sw: [], index: a.index };
  const S1 = load('E1'), S2 = load('E2');
  if (S1.world.switchStates !== sw.length) setsCompared.stateSetsDifferent++;
  setsCompared.worlds++;
  const psiP = psiOf(sw, S1.log, S2.log);
  const r1 = runAcq({ world, agent: 'RW', env: 'E1', steps: 12000 }).log, r2 = runAcq({ world, agent: 'RW', env: 'E2', steps: 12000 }).log;
  rows.push({ world: id, goal, psiP, psiRW: psiOf(sw, r1, r2) });
}

// agreement with the frozen analysis, world by world
const frozen = new Map(FROZEN.rows.map(r => [r.world, r]));
let maxP = 0, maxRW = 0; for (const r of rows) { const f = frozen.get(r.world); maxP = Math.max(maxP, Math.abs(f.psi.P - r.psiP)); maxRW = Math.max(maxRW, Math.abs(f.psi.RW - r.psiRW)); }

// the interval, afresh
const tDensity = (x, nu) => Math.pow(1 + x * x / nu, -(nu + 1) / 2);
function tUpper(prob, nu) {     // the prob quantile, prob > 0.5
  const cdfTail = (t) => { const hi = 200, n = 400000, h = (hi - t) / n; let s = tDensity(t, nu) + tDensity(hi, nu); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * tDensity(t + i * h, nu); return s * h / 3; };
  const whole = (() => { const hi = 2000, n = 2000000, h = hi / n; let s = tDensity(0, nu) + tDensity(hi, nu); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * tDensity(i * h, nu); return s * h / 3; })();
  let a = 1, b = 4; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (cdfTail(m) / (2 * whole) > 1 - prob) a = m; else b = m; }     // whole is the mass of one half
  return (a + b) / 2;
}
const groups = [8, 12, 16, 19].map(g => rows.filter(r => r.goal === g).map(r => r.psiP - r.psiRW));
const parts = groups.map(v => { const m = v.reduce((a, b) => a + b, 0) / v.length, s2 = v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1); return { m, u: s2 / v.length, n: v.length }; });
const est = parts.reduce((a, p) => a + p.m, 0) / 4, sumU = parts.reduce((a, p) => a + p.u, 0), se = Math.sqrt(sumU / 16), df = sumU ** 2 / parts.reduce((a, p) => a + p.u ** 2 / (p.n - 1), 0);
const t = tUpper(0.975, df);

// stratified sign-flip test: swapping a world's E1 and E2 labels flips the sign of its value
let seed = 20261101 >>> 0;
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const FLIPS = 200000; let extreme = 0;
for (let i = 0; i < FLIPS; i++) { let total = 0; for (const v of groups) { let s = 0; for (const x of v) s += rnd() < 0.5 ? x : -x; total += s / v.length; } if (Math.abs(total / 4) >= Math.abs(est)) extreme++; }

const out = { schema: 'coga/acq1.primary-audit', manifest: { head: manifest.head, lockFreeze: manifest.lockFreeze, files: Object.keys(manifest.files).length, hashMismatches: badHash, sessions: manifest.sessions, ok: manifest.ok }, provenance: prov,
  setsCompared, maxAbsDifferenceFromFrozen: { psiP: maxP, psiRW: maxRW },
  independent: { est, se, df, t, lo: est - t * se, hi: est + t * se }, frozen: { est: FROZEN.primary.est, lo: FROZEN.primary.lo, hi: FROZEN.primary.hi, df: FROZEN.primary.df },
  signFlip: { flips: FLIPS, extreme, p: (extreme + 1) / (FLIPS + 1) } };
fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));

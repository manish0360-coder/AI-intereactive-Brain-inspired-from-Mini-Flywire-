// ==========================================================
// G11 DIAGNOSTIC — why can an R1-R5 accepted configuration leak?
// ==========================================================
// DIAGNOSTIC ONLY. This file measures; it changes nothing. It does not import
// into any production path, does not modify env.js, arms.js, main.js, any
// acceptance rule, threshold, observable, or gate.
//
// SEED DISCIPLINE. No new configuration seed is opened. The only real
// configurations touched are the already-inspected pilot seeds 900000-900029.
// The null distributions are built from SYNTHETIC assignments driven by a
// dedicated diagnostic RNG and evaluated through the REAL
// env.evaluateConstraints, so no config seed is consumed to build them.
// The held-out stream 900500+ is never generated, enumerated or estimated.
//
// NOT Stage 1, a pilot, or a confirmatory run. No experimental data is
// produced or persisted; nothing here selects a configuration for use.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng } from '../../instrumentation/rng.js';
import * as env from './env.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))
  .map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'))
  .map(n => Number(n.id));
const N = EDGES.length;                       // 39
const K = env.N_UNRELIABLE;                   // 13
const THRESH = 0.10;                          // frozen R3/R4, reused by ERR-06/07

const say = (s = '') => console.log(s);
const f4 = (x) => (x >= 0 ? ' ' : '') + x.toFixed(4);

// ---------------- Spearman, independently implemented ----------------
function spearman(x, y) {
  const rk = v => {
    const t = v.map((a, i) => [a, i]).sort((a, b) => a[0] - b[0]); const r = [];
    for (let i = 0; i < t.length;) {
      let j = i; while (j + 1 < t.length && t[j + 1][0] === t[i][0]) j++;
      const av = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[t[k][1]] = av; i = j + 1;
    }
    return r;
  };
  const a = rk(x), b = rk(y), n = x.length;
  const ma = (n + 1) / 2, mb = (n + 1) / 2;
  let nu = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; nu += u * v; da += u * u; db += v * v; }
  return (da === 0 || db === 0) ? 0 : nu / Math.sqrt(da * db);
}

// ---------------- the four FIXED observables ----------------
const DEG_OUT = {}, DEG_IN = {};
EDGES.forEach(e => { DEG_OUT[e.from] = (DEG_OUT[e.from] || 0) + 1; DEG_IN[e.to] = (DEG_IN[e.to] || 0) + 1; });
function distToGoal(goal) {
  const back = new Map();
  EDGES.forEach(e => { if (!back.has(e.to)) back.set(e.to, []); back.get(e.to).push(e.from); });
  const d = new Map([[goal, 0]]); const q = [goal];
  while (q.length) { const x = q.shift(); for (const p of (back.get(x) || [])) if (!d.has(p)) { d.set(p, d.get(x) + 1); q.push(p); } }
  return d;
}
const GOAL = env.GOALS[0];                    // configIndex 0, frozen §3.7
const DD = distToGoal(GOAL);
const OBS_FIXED = {
  'directed-distance-to-goal':   EDGES.map(e => DD.has(e.to) ? DD.get(e.to) : NODES.length + 1),
  'source-endpoint-degree':      EDGES.map(e => DEG_OUT[e.from] || 0),
  'destination-endpoint-degree': EDGES.map(e => DEG_IN[e.to] || 0),
  'canonical-edge-index':        EDGES.map((_, i) => i)
};
const OBS_NAMES = ['endpoint-cosine-similarity', 'directed-distance-to-goal',
                   'source-endpoint-degree', 'destination-endpoint-degree', 'canonical-edge-index'];
const cosVec = (embedding) => EDGES.map(e => {
  const a = embedding.get(e.from), b = embedding.get(e.to);
  return a.reduce((s, x, i) => s + x * b[i], 0);
});
function rhoAll(p, embedding) {
  return [spearman(p, cosVec(embedding)),
          spearman(p, OBS_FIXED['directed-distance-to-goal']),
          spearman(p, OBS_FIXED['source-endpoint-degree']),
          spearman(p, OBS_FIXED['destination-endpoint-degree']),
          spearman(p, OBS_FIXED['canonical-edge-index'])];
}

// ---------------- synthetic assignment, mirroring frozen §3.5 ----------------
// Same construction as env.makeConfig's p-assignment, driven by a DIAGNOSTIC
// RNG so that no configuration seed is consumed.
function synth(rnd, { regime = 'bimodal' } = {}) {
  const a = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const un = new Set(a.slice(0, K));
  const pUn = [], pRel = [];
  for (let i = 0; i < N; i++) {
    pUn[i] = env.P_UNRELIABLE[0] + rnd() * (env.P_UNRELIABLE[1] - env.P_UNRELIABLE[0]);
    pRel[i] = env.P_RELIABLE[0] + rnd() * (env.P_RELIABLE[1] - env.P_RELIABLE[0]);
  }
  let p;
  if (regime === 'bimodal') p = EDGES.map((_, i) => un.has(i) ? pUn[i] : pRel[i]);
  else if (regime === 'beta') {                       // frozen §3.5 secondary regime
    const beta22 = () => { const u = rnd(), v = rnd(), w = rnd();
      return (u + v + w) / 3; };                      // symmetric, unimodal on (0,1)
    p = EDGES.map(() => beta22());
  } else if (regime === 'uniform') p = EDGES.map(() => rnd());
  return { p, unreliableSet: un };
}
function synthEmbedding(rnd) {
  return new Map(NODES.map(n => {
    const v = [...Array(env.EMBED_DIM)].map(() => rnd() * 2 - 1);
    const m = Math.sqrt(v.reduce((q, b) => q + b * b, 0)) || 1;
    return [n, v.map(x => x / m)];
  }));
}
const stats = (xs) => {
  const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1));
  return { n, mean: m, sd, se: sd / Math.sqrt(n), within: xs.filter(v => Math.abs(v) < THRESH).length / n };
};

say('==============================================================');
say(' G11 DIAGNOSTIC — causal audit of observable leakage');
say(' frozen 2f12e309…f6b9 | errata ERR-01…ERR-07 | DIAGNOSTIC ONLY');
say('==============================================================');

// ==========================================================
// SECTION 1 — preserve and reproduce the RED evidence
// ==========================================================
say('\n===== 1  THE PRESERVED RED (config 900004, 2026-08-22) =======');
const c04a = env.makeConfig(900004, 0);
const c04b = env.makeConfig(900004, 0);
const rho04 = rhoAll(c04a.pPhase1, c04a.embedding);
say(`   configSeed 900004  configIndex 0  goal ${c04a.goal}`);
say(`   R1 ${c04a.checks.R1}  R2 ${c04a.checks.R2} (${c04a.checks.r2Starts} starts)  ` +
    `R3 ${c04a.checks.R3}  R4 ${c04a.checks.R4}  R5 ${c04a.checks.R5} (${c04a.checks.r5Differing}/${c04a.checks.r5States})`);
OBS_NAMES.forEach((n, i) => say(`     ${n.padEnd(30)} rho ${f4(rho04[i])}${Math.abs(rho04[i]) < THRESH ? '' : '   <-- VIOLATION'}`));
say(`   independent Spearman reproduces env.js: rho3 ${f4(c04a.checks.rho3)} vs ${f4(rho04[0])}, ` +
    `rho4 ${f4(c04a.checks.rho4)} vs ${f4(rho04[1])}`);
say(`   REPRODUCIBLE: two generations byte-identical = ` +
    (JSON.stringify(c04a.pPhase1) === JSON.stringify(c04b.pPhase1) &&
     JSON.stringify(c04a.checks.rhoObs) === JSON.stringify(c04b.checks.rhoObs)));
say(`   ERR-07 status: accepted = ${c04a.accepted} (rejected by the G11 term; R1-R5 unchanged)`);

// ==========================================================
// SECTION 2 — the null distribution of rho (RAW generator)
// ==========================================================
say('\n===== 2  RAW-GENERATOR NULL DISTRIBUTION OF rho ==============');
say('   Synthetic assignments, diagnostic RNG, NO acceptance filter.');
const NULL_N = 200000;
const rnd2 = makeRng(0xD1A6);
const fixedEmb = synthEmbedding(makeRng(0xE3B0));      // one fixed embedding for obs 1
const cols = [[], [], [], [], []];
for (let t = 0; t < NULL_N; t++) {
  const { p } = synth(rnd2);
  cols[0].push(spearman(p, cosVec(fixedEmb)));
  cols[1].push(spearman(p, OBS_FIXED['directed-distance-to-goal']));
  cols[2].push(spearman(p, OBS_FIXED['source-endpoint-degree']));
  cols[3].push(spearman(p, OBS_FIXED['destination-endpoint-degree']));
  cols[4].push(spearman(p, OBS_FIXED['canonical-edge-index']));
}
const ANALYTIC_SD = 1 / Math.sqrt(N - 1);
say(`   n = ${N} edges  ->  analytic permutation-null SD of Spearman = 1/sqrt(n-1) = ${ANALYTIC_SD.toFixed(4)}`);
say(`   ${NULL_N} synthetic draws:`);
say('   observable                       mean       SE      SD    P(|rho|<0.10)');
const S = cols.map(stats);
OBS_NAMES.forEach((n, i) => say(
  `   ${n.padEnd(30)} ${f4(S[i].mean)}  ${S[i].se.toFixed(4)}  ${S[i].sd.toFixed(4)}     ${(100 * S[i].within).toFixed(1)}%`));
let allWithin = 0;
for (let t = 0; t < NULL_N; t++) if (cols.every(c => Math.abs(c[t]) < THRESH)) allWithin++;
say(`   P(ALL FIVE |rho| < 0.10) = ${(100 * allWithin / NULL_N).toFixed(2)}%   (${allWithin}/${NULL_N})`);
say(`   threshold 0.10 expressed in null SDs: ${(THRESH / ANALYTIC_SD).toFixed(3)} sigma`);

// ==========================================================
// SECTION 3 — is the RAW generator independent of the observables?
// ==========================================================
say('\n===== 3  INDEPENDENCE OF THE RAW GENERATOR ===================');
say('   H0: E[rho] = 0 for every observable. |mean| / SE is a z-score.');
OBS_NAMES.forEach((n, i) => {
  const z = S[i].mean / S[i].se;
  say(`   ${n.padEnd(30)} z = ${f4(z)}   ${Math.abs(z) < 3 ? 'consistent with independence' : 'SYSTEMATIC COUPLING'}`);
});
say(`   measured SD vs analytic ${ANALYTIC_SD.toFixed(4)}: ` +
    S.map(s => s.sd.toFixed(4)).join(', '));

// ==========================================================
// SECTION 4 — controlled interventions on the RAW generator
// ==========================================================
say('\n===== 4  CONTROLLED INTERVENTIONS (raw generator) ============');
const INT_N = 40000;
function sweep(label, fn) {
  const r = makeRng(0x1234);
  const out = [[], [], [], [], []];
  for (let t = 0; t < INT_N; t++) {
    const v = fn(r);
    out[0].push(spearman(v.p, cosVec(v.emb ?? fixedEmb)));
    out[1].push(spearman(v.p, v.obs ? v.obs[0] : OBS_FIXED['directed-distance-to-goal']));
    out[2].push(spearman(v.p, v.obs ? v.obs[1] : OBS_FIXED['source-endpoint-degree']));
    out[3].push(spearman(v.p, v.obs ? v.obs[2] : OBS_FIXED['destination-endpoint-degree']));
    out[4].push(spearman(v.p, v.obs ? v.obs[3] : OBS_FIXED['canonical-edge-index']));
  }
  const st = out.map(stats);
  let all = 0; for (let t = 0; t < INT_N; t++) if (out.every(c => Math.abs(c[t]) < THRESH)) all++;
  say(`   ${label.padEnd(46)} SD ${st.map(s => s.sd.toFixed(3)).join(' ')}  P(all5) ${(100 * all / INT_N).toFixed(2)}%`);
  return st;
}
say('   INT-0 baseline (bimodal, as frozen)');
sweep('     baseline', (r) => synth(r));
say('   INT-1 permute canonical edge INDEX, p_e values preserved');
sweep('     index relabelled', (r) => {
  const { p } = synth(r);
  const perm = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  return { p, obs: [OBS_FIXED['directed-distance-to-goal'], OBS_FIXED['source-endpoint-degree'],
                    OBS_FIXED['destination-endpoint-degree'], perm] };
});
say('   INT-2 shuffle the p_e MULTISET across edges (multiset preserved)');
sweep('     multiset reshuffled', (r) => {
  const { p } = synth(r);
  const q = [...p];
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  return { p: q };
});
say('   INT-3 continuous regime instead of bimodal (frozen §3.5 secondary)');
sweep('     unimodal continuous', (r) => synth(r, { regime: 'beta' }));
say('   INT-4 uniform p_e on (0,1)');
sweep('     uniform', (r) => synth(r, { regime: 'uniform' }));
say('   INT-5 fresh embedding per draw (as the real generator does)');
sweep('     per-draw embedding', (r) => ({ p: synth(r).p, emb: synthEmbedding(r) }));

// ==========================================================
// SECTION 5 — does conditioning on R1-R5 induce coupling?
// ==========================================================
say('\n===== 5  ACCEPTANCE-CONDITIONING ANALYSIS ====================');
say('   Synthetic assignments evaluated through the REAL env.evaluateConstraints.');
const COND_N = Number(process.env.COND_N ?? 4000);
const rnd5 = makeRng(0xC0FFEE);
const rows = [];
for (let t = 0; t < COND_N; t++) {
  const { p } = synth(rnd5);
  const emb = synthEmbedding(rnd5);
  const cfg = { goal: GOAL, configIndex: 0, pPhase1: p, embedding: emb };
  const k = env.evaluateConstraints(cfg);
  rows.push({ k, rho: rhoAll(p, emb) });
}
// VALIDATION: the synthetic path must reproduce the REAL generator's checks
const real00 = env.makeConfig(900000, 0);
const revalidated = env.evaluateConstraints({ goal: real00.goal, configIndex: 0,
  pPhase1: real00.pPhase1, embedding: real00.embedding });
say(`   VALIDATION: synthetic pipeline reproduces makeConfig(900000,0).checks = ` +
    (JSON.stringify(revalidated) === JSON.stringify(real00.checks)));

const FILTERS = {
  'raw (no filter)':        () => true,
  'R1 only':                k => k.R1,
  'R2 only':                k => k.R2,
  'R5 only':                k => k.R5,
  'R2 & R5 (read p_e)':     k => k.R2 && k.R5,
  'R3 & R4 (leakage only)': k => k.R3 && k.R4,
  'R1-R5 (frozen §3.5)':    k => k.R1 && k.R2 && k.R3 && k.R4 && k.R5 === true,
  'R1,R2,R5 (no R3/R4)':    k => k.R1 && k.R2 && k.R5 === true
};
say('\n   filter                     n     mean rho per observable (cos dist degO degI idx)        P(all5)');
for (const [name, f] of Object.entries(FILTERS)) {
  const sub = rows.filter(r => f(r.k));
  if (sub.length < 30) { say(`   ${name.padEnd(24)} ${String(sub.length).padStart(5)}   (too few to summarise)`); continue; }
  const m = [0, 1, 2, 3, 4].map(i => stats(sub.map(r => r.rho[i])));
  const all = sub.filter(r => r.rho.every(v => Math.abs(v) < THRESH)).length;
  say(`   ${name.padEnd(24)} ${String(sub.length).padStart(5)}   ` +
      m.map(s => f4(s.mean)).join(' ') + `    ${(100 * all / sub.length).toFixed(1)}%`);
}
say('\n   same table, SD of rho (is the SPREAD changed by conditioning?)');
for (const [name, f] of Object.entries(FILTERS)) {
  const sub = rows.filter(r => f(r.k));
  if (sub.length < 30) continue;
  const m = [0, 1, 2, 3, 4].map(i => stats(sub.map(r => r.rho[i])));
  say(`   ${name.padEnd(24)} ${String(sub.length).padStart(5)}   ` + m.map(s => ' ' + s.sd.toFixed(4)).join(' '));
}

// ==========================================================
// SECTION 6 — does the ERR-07 G11 filter bias the accepted population?
// ==========================================================
say('\n===== 6  DOES THE G11 FILTER BIAS THE ACCEPTED POPULATION? ===');
const acc15 = rows.filter(r => r.k.R1 && r.k.R2 && r.k.R3 && r.k.R4 && r.k.R5 === true);
const accG11 = acc15.filter(r => r.rho.every(v => Math.abs(v) < THRESH));
say(`   R1-R5 accepted: ${acc15.length}/${COND_N} (${(100 * acc15.length / COND_N).toFixed(1)}%)`);
say(`   also G11-clean : ${accG11.length}/${COND_N} (${(100 * accG11.length / COND_N).toFixed(2)}%)  ` +
    `= ${(100 * accG11.length / Math.max(1, acc15.length)).toFixed(1)}% of R1-R5 accepted`);
if (acc15.length > 30 && accG11.length > 30) {
  const q = (arr, sel) => stats(arr.map(sel));
  const a = q(acc15, r => r.k.r5Differing), b = q(accG11, r => r.k.r5Differing);
  const a2 = q(acc15, r => r.k.r2Starts), b2 = q(accG11, r => r.k.r2Starts);
  say(`   r5Differing  R1-R5 ${a.mean.toFixed(3)} +/- ${a.se.toFixed(3)}   +G11 ${b.mean.toFixed(3)} +/- ${b.se.toFixed(3)}` +
      `   z = ${f4((b.mean - a.mean) / Math.sqrt(a.se ** 2 + b.se ** 2))}`);
  say(`   r2Starts     R1-R5 ${a2.mean.toFixed(3)} +/- ${a2.se.toFixed(3)}   +G11 ${b2.mean.toFixed(3)} +/- ${b2.se.toFixed(3)}` +
      `   z = ${f4((b2.mean - a2.mean) / Math.sqrt(a2.se ** 2 + b2.se ** 2))}`);
  const spread = (arr) => { const s = stats(arr.map(r => Math.max(...r.rho.map(Math.abs)))); return s; };
  say(`   max|rho| per config: R1-R5 ${spread(acc15).mean.toFixed(4)}   +G11 ${spread(accG11).mean.toFixed(4)}`);
}

// ==========================================================
// SECTION 7 — boundary
// ==========================================================
say('\n===== 7  BOUNDARY ============================================');
const seen = env.evaluatedSeeds();
say(`   configuration seeds generated by this diagnostic: ${seen.length}` +
    (seen.length ? ` (range ${seen[0]}-${seen[seen.length - 1]})` : ''));
say(`   any seed in the held-out stream 900500-900529: ` +
    seen.filter(s => s >= 900500 && s <= 900529).length);
say(`   any seed at or above the held-out floor 900500: ` +
    seen.filter(s => s >= 900500).length);
say(`   synthetic draws consumed NO configuration seed (diagnostic RNG only)`);
say('\nDIAGNOSTIC COMPLETE — nothing was modified, selected, or persisted.');

// ==========================================================
// H1-R D-021(b) — pre-registered synthetic fixture set (inputs only; no expected outputs)
// ==========================================================
// Writes fixtures/*.json deterministically. Nothing here runs the agent, generates a configuration, touches the
// registry, or reads any H1-R data. Every value is synthetic, drawn from a local mulberry32 seeded 990001 (study
// fixtures) and 990101 (record fixtures) — never an analysis seed (770001–770004).
//
// Study fixtures (S##) are inputs at the level of per-cell metric values (schema h1r.d021b.study/1).
// Record fixtures (M01) are synthetic run records in the MS-1 schema (h1r.run/2 measurement block) plus a synthetic
// configuration table (schema h1r.d021b.records/1).
//
// Every fixture is generated directly from the parameters below, in one pass. Nothing is checked against, selected
// by, or tuned to any analysis result, and the generator contains no analysis computation.
//
//   node research/preregistrations/h1r_d021b/make_fixtures.mjs
// ==========================================================
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const OUT = path.join(HERE, 'fixtures');
fs.mkdirSync(OUT, { recursive: true });
const B2 = '707cb1e5205a7e9979f81092ee1ebfa0fe28922e';
const blob = (p) => execFileSync('git', ['-C', REPO, 'show', `${B2}:${p}`], { maxBuffer: 1 << 26 }).toString('utf8');

// ---------------- local generator (mulberry32, identical algorithm to instrumentation/rng.js makeRng) ----------------
function mulberry(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const ARMS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
const GOALS = [8, 12, 16, 19];
const PILOT_SEEDS = [20260819004, 20260819005, 20260819006, 20260819007, 20260819008];
const HELD_SEEDS = Array.from({ length: 20 }, (_, i) => 20260819100 + i);
const WIN = ['W1', 'W2', 'W3', 'W4'];

// ---------------- study fixtures ----------------
// cell row: [configIndex, seed, armIndex, valid, R_W1, R_W2, R_W3, R_W4, R_all, HL, HLcensored, fingerprint, floorRaises]
function study(id, p) {
  const r = mulberry(990001 + 1000 * Number(id.slice(1)));
  const g = (sd) => sd * gauss(r);
  const base = { W1: 18, W2: 24, W3: 14, W4: 24 };
  const eff = (arm, W, block) => ((p[block] && p[block].eff && p[block].eff[arm] && p[block].eff[arm][W]) || 0);
  function block(name, configs, seeds) {
    const P = p[name] || {};
    const sd = { c: P.sdC ?? 2, s: P.sdS ?? 1.5, cs: P.sdCS ?? 1, ac: P.sdAC ?? 0.6, as: P.sdAS ?? 0.5, e: P.sdE ?? 1.2 };
    const shared = {}, armC = {}, armS = {};
    for (const W of WIN) { shared[W] = { c: configs.map(() => g(sd.c)), s: seeds.map(() => g(sd.s)), cs: configs.map(() => seeds.map(() => g(sd.cs))) };
      armC[W] = ARMS.map(() => configs.map(() => g(sd.ac))); armS[W] = ARMS.map(() => seeds.map(() => g(sd.as))); }
    const rows = [];
    configs.forEach((cfg, ci) => seeds.forEach((seed, si) => ARMS.forEach((arm, ai) => {
      const exact = P.exact && P.exact(arm, cfg.index, si);
      const Y = WIN.map(W => exact && exact[W] !== undefined ? exact[W]
        : r6(base[W] + eff(arm, W, name) + (P.blockShift && P.blockShift(cfg.index, arm, W) || 0) + shared[W].c[ci] + shared[W].s[si] + shared[W].cs[ci][si] + armC[W][ai][ci] + armS[W][ai][si] + g(sd.e)));
      const all = r6(22 + ((P.effAll && P.effAll[arm]) || 0) + 0.5 * shared.W2.c[ci] + g(0.8));
      let hl = Math.round((P.hlBase ?? 300) + ((P.effHL && P.effHL[arm]) || 0) + g(P.hlSd ?? 120));
      if (P.hlCensorAll && P.hlCensorAll.includes(arm)) hl = 1500;
      hl = Math.max(0, Math.min(1500, hl));
      const valid = P.invalid && P.invalid.some(([c, s, a]) => c === cfg.index && s === si && (a === '*' || a === arm)) ? 0 : 1;
      const fpArm = (arm === 'A5' && P.a5EqA2 && P.a5EqA2.some(([c, s]) => c === cfg.index && s === si)) ? 'A2' : arm;
      const fp = crypto.createHash('sha256').update(`${id}|${name}|${cfg.index}|${seed}|${fpArm}`).digest('hex').slice(0, 16);
      const floors = ['A2', 'A4'].includes(arm) ? 0 : Math.max(0, Math.round(150 + g(60)));
      rows.push([cfg.index, seed, ai, valid, ...Y, all, hl, hl === 1500 ? 1 : 0, fp, floors]);
    })));
    return rows;
  }
  const pilotCfg = Array.from({ length: 10 }, (_, i) => ({ index: i, goal: GOALS[i % 4] }));
  const heldCfg = Array.from({ length: 30 }, (_, i) => ({ index: i, goal: GOALS[i % 4] }));
  const pilotCells = block('pilot', pilotCfg, PILOT_SEEDS);
  const out = { schema: 'h1r.d021b.study/1', id, arms: ARMS, windows: WIN,
    cellColumns: ['configIndex', 'seed', 'armIndex', 'valid', 'R_W1', 'R_W2', 'R_W3', 'R_W4', 'R_all', 'halfLife', 'halfLifeCensored', 'fingerprint', 'floorRaises'],
    pilot: { stream: 'ERR-07 accepted stream from 886000 (synthetic values)', extensionAvailable: p.extensionAvailable !== false,
      configs: pilotCfg.map(c => ({ ...c, block: c.index < 5 ? 'stage1' : 'extension' })), seeds: PILOT_SEEDS, cells: pilotCells },
    heldout: null };
  {
    const H = p.heldout || {};
    const cells = block('heldout', heldCfg, HELD_SEEDS);
    // A1 link inputs per held-out (config, seed): [configIndex, seed, rho1499|null, rho2999|null, decisionTicks, replayTicks, flips,
    //   flipsW[4], decisionW[4], replayW[4]]
    const a1Links = [], flipPop = [], mono = [];
    heldCfg.forEach((cfg, ci) => HELD_SEEDS.forEach((seed, si) => {
      const nul = (q) => r() < q;
      const rho = (mu, sd, q) => nul(q) ? null : r6(Math.max(-1, Math.min(1, mu + g(sd))));
      const replayW = [r6(0), 0, 0, 0].map((_, w) => Math.max(0, Math.round([24, 96, 24, 96][w] + g(6))));
      const decisionW = replayW.map((rp, w) => [300, 1200, 300, 1200][w] - rp - Math.max(0, Math.round(g(H.noCommitSd ?? 0))));
      const lam = (H.flipRate ?? 0.016) * (1 + 0.3 * gauss(r));
      const flipsW = decisionW.map(d => Math.max(0, Math.min(d, Math.round(d * Math.max(0, lam)))));
      const flips = flipsW.reduce((x, y) => x + y, 0), decisions = decisionW.reduce((x, y) => x + y, 0), replays = replayW.reduce((x, y) => x + y, 0);
      a1Links.push([cfg.index, seed, rho(H.rhoMu ?? 0.55, H.rhoSd ?? 0.15, H.rhoNull ?? 0.05), rho(H.rhoMu2 ?? 0.45, H.rhoSd ?? 0.15, H.rhoNull ?? 0.05),
        decisions, replays, flips, flipsW, decisionW, replayW]);
      // flipped decision ticks: windows' flips placed at distinct τ inside each window; population = those with τ ≤ 2980
      const lo = [0, 300, 1500, 1800], len = [300, 1200, 300, 1200], ts = new Set();
      flipsW.forEach((f, w) => { let k = 0; while (k < f) { const t = lo[w] + Math.floor(r() * len[w]); if (!ts.has(t)) { ts.add(t); k++; } } });
      const pop = [...ts].filter(t => t <= 2980).sort((a, b) => a - b)
        .map(t => [t, r() < (H.forkCrash ?? 0.02) ? null : r6((H.caMu ?? 1.5) + g(H.caSd ?? 4))]);
      flipPop.push([cfg.index, seed, pop]);
      // monotonicity bins (descriptive): decisions and flips per bin of max_k |T_k − 0.5| (5 equal-width bins on [0, 0.5])
      const dBins = [0, 0, 0, 0, 0], fBins = [0, 0, 0, 0, 0];
      const pb = [0.35, 0.25, 0.2, 0.12, 0.08], cum = pb.map((_, b) => pb.slice(0, b + 1).reduce((x, y) => x + y, 0));
      for (let k = 0; k < decisions; k++) { const u = r(); dBins[cum.findIndex(c => u < c) === -1 ? 4 : cum.findIndex(c => u < c)]++; }
      for (let k = 0; k < flips; k++) {
        const wts = dBins.map((d, b) => (b + 1) * (d - fBins[b])), tot = wts.reduce((x, y) => x + y, 0);
        let u = r() * tot, b = 0; while (b < 4 && u >= wts[b]) { u -= wts[b]; b++; } fBins[b]++;
      }
      mono.push([cfg.index, seed, dBins, fBins]);
    }));
    out.heldout = { block: 'held-out ERR-07 stream from 900500 (synthetic values)', configs: heldCfg, seeds: HELD_SEEDS, cells,
      a1LinkColumns: ['configIndex', 'seed', 'rho1499', 'rho2999', 'decisionTicks', 'replayTicks', 'flips', 'flipsByWindow[W1..W4]', 'decisionTicksByWindow[W1..W4]', 'replayTicksByWindow[W1..W4]'],
      a1Links, flipPopulationColumns: ['configIndex', 'seed', '[[t, forkDifference|null], ...]'], flipPopulations: flipPop,
      monotonicityColumns: ['configIndex', 'seed', 'decisionsPerBin[5]', 'flipsPerBin[5]'], monotonicity: mono };
  }
  if (p.copyArm && out.heldout) { const [from, to] = p.copyArm.map(a => ARMS.indexOf(a));
    for (const row of out.heldout.cells) if (row[2] === to) { const src = out.heldout.cells.find(x => x[0] === row[0] && x[1] === row[1] && x[2] === from); for (let k = 4; k <= 10; k++) row[k] = src[k]; } }
  return out;
}

const strong = { A1: { W1: 6, W3: 6 }, A2: {}, A3: { W1: 2, W3: 2 }, A4: { W1: 3, W3: 3 }, A5: { W1: 1, W3: 1 }, A6: { W1: 1.5, W3: 1.5 }, A7: { W1: 9, W3: 9 } };
const flat = (v) => Object.fromEntries(ARMS.map(a => [a, v[a] || {}]));
// Input parameters per fixture (effects are added to the arm's mean in the named windows; sd = standard deviation).
const SCEN = {
  // effects `strong` in pilot and held-out; held-out A2 half-life +120
  S01: { pilot: { eff: strong, effAll: {} }, heldout: { eff: strong, effHL: { A2: 120 } } },
  // pilot: A1 +1 and A7 +3.2 (W1, W3); cell sd 1.5, arm×configuration sd 1.5, no arm×seed term; held-out as S01
  S02: { pilot: { eff: flat({ A1: { W1: 1, W3: 1 }, A7: { W1: 3.2, W3: 3.2 } }), sdE: 1.5, sdAC: 1.5, sdAS: 0 },
    heldout: { eff: strong, effHL: { A2: 120 } } },
  // pilot: no arm effects; cell sd 2.5, no arm×seed term; held-out effects `strong`
  S03: { pilot: { eff: flat({}), sdE: 2.5, sdAS: 0 }, heldout: { eff: strong } },
  // invalid cells: one pilot cell; five held-out entries (all arms of one pair, four single arms)
  S04: { pilot: { eff: strong, invalid: [[2, 1, 'A3']] }, heldout: { eff: strong, effHL: { A2: 120 }, invalid: [[0, 0, 'A6'], [7, 3, '*'], [7, 4, 'A1'], [19, 19, 'A2'], [29, 0, 'A7']] } },
  // held-out: one invalid A4 cell in each of configurations 1–29
  S05: { pilot: { eff: strong }, heldout: { eff: strong, invalid: Array.from({ length: 29 }, (_, c) => [c + 1, c % 20, 'A4']) } },
  // held-out A1, A4, A5, A6 values in W1 and W3 on an exact 1/8 grid: A1 − A5 = 0, A1 − A6 = 2, A4 − A1 = 0 in every cell
  S06: { pilot: { eff: strong }, heldout: { eff: strong, exact: (arm, c, si) => {
    const v = 20 + c * 0.25 + si * 0.125; return { A1: { W1: v, W3: v - 3 }, A5: { W1: v, W3: v - 3 }, A6: { W1: v - 2, W3: v - 5 }, A4: { W1: v, W3: v - 3 } }[arm] || null; } } },
  // held-out: A1 −5 (W1), +6 (W3); A6 cells copied from A5
  S07: { pilot: { eff: strong }, heldout: { eff: { ...strong, A1: { W1: -5, W3: 6 } } }, copyArm: ['A5', 'A6'] },
  // held-out: every ρ input null; flip rate 0
  S08: { pilot: { eff: strong }, heldout: { eff: strong, rhoNull: 1, flipRate: 0, caMu: 1 } },
  // held-out: ρ mean 0.2, sd 0.5, 20 % null; fork-crash share 0.3; fork-difference mean −3, sd 2; A1 half-life +400, then set to 1500
  S09: { pilot: { eff: strong }, heldout: { eff: strong, rhoMu: 0.2, rhoSd: 0.5, rhoNull: 0.2, forkCrash: 0.3, caMu: -3, caSd: 2, effHL: { A1: 400 }, hlCensorAll: ['A1'] } },
  // whole-run return R_all: pilot A1 +10; held-out A1 −12
  S10: { pilot: { eff: strong, effAll: { A1: 10 } }, heldout: { eff: strong, effAll: { A1: -12 } } },
  // whole-run return R_all: pilot A1 −40; held-out A1 −10
  S11: { pilot: { eff: strong, effAll: { A1: -40 } }, heldout: { eff: strong, effAll: { A1: -10 } } },
  // held-out: ρ mean 0.1, sd 0.1; flip rate 0.004; fork-difference mean −2, sd 1; A1 half-life +300
  S12: { pilot: { eff: strong }, heldout: { eff: strong, rhoMu: 0.1, rhoSd: 0.1, flipRate: 0.004, caMu: -2, caSd: 1, effHL: { A1: 300 } } },
  // pilot: A1 +0.05 (W1, W3); cell sd 4, arm×configuration sd 3, arm×seed sd 3
  S13: { pilot: { eff: { ...strong, A1: { W1: 0.05, W3: 0.05 } }, sdE: 4, sdAC: 3, sdAS: 3 }, heldout: { eff: strong } },
  // pilot A1 and A2 values in W1 and W3 on an exact grid: A1 − A2 = 4 (W1), 3 (W3) in every cell
  S14: { pilot: { eff: strong, exact: (arm, c, si) => { const v = 10 + c + si * 0.5; return { A1: { W1: v + 4, W3: v + 3 }, A2: { W1: v, W3: v } }[arm] || null; } }, heldout: { eff: strong } },
  // held-out: A5 and A6 +6 (W1), +0.5 (W3)
  S15: { pilot: { eff: strong }, heldout: { eff: { ...strong, A5: { W1: 6, W3: 0.5 }, A6: { W1: 6, W3: 0.5 } } } },
  // held-out: A5 +0.5 (W1), +6 (W3); A6 +6 (W1), +0.5 (W3)
  S16: { pilot: { eff: strong }, heldout: { eff: { ...strong, A5: { W1: 0.5, W3: 6 }, A6: { W1: 6, W3: 0.5 } } } },
  // pilot: no arm effects; cell sd 2.5; extension configurations marked unavailable; held-out effects `strong`
  S17: { pilot: { eff: flat({}), sdE: 2.5 }, heldout: { eff: strong }, extensionAvailable: false },
};

// ---------------- record fixture (MS-1 run-record schema) ----------------
function records() {
  const r = mulberry(990101), g = (sd) => sd * gauss(r);
  const edges = JSON.parse(blob('connections.json')).map(e => [Number(e.from), Number(e.to)]);
  const nodes = [...new Set(edges.flat())].sort((a, b) => a - b);
  const nb = new Map(nodes.map(n => [n, []])); for (const [a, b] of edges) { nb.get(a).push(b); nb.get(b).push(a); }
  const ek = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
  // synthetic configurations: p_e per undirected edge for Phase I and Phase II (13 unreliable / 26 reliable, swapped at the shift)
  const configs = [0, 1].map(ci => {
    const idx = edges.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const unrel = new Set(idx.slice(0, 13)), un = edges.map(() => r6(0.25 + 0.2 * r())), re = edges.map(() => r6(0.9 + 0.1 * r()));
    const p1 = edges.map((e, i) => unrel.has(i) ? un[i] : re[i]);
    // the shift swaps the sets: the 13 unreliable edges take 13 of the reliable values and vice versa
    const unrelList = [...unrel], relList = idx.slice(13), p2 = p1.slice();
    unrelList.forEach((ui, k) => { p2[ui] = re[relList[k]]; }); relList.forEach((ri, k) => { p2[ri] = k < 13 ? un[unrelList[k]] : r6(0.25 + 0.2 * r()); });
    return { index: ci, goal: GOALS[ci % 4], edges: edges.map(([a, b], i) => ({ from: a, to: b, pPhaseI: p1[i], pPhaseII: p2[i] })) };
  });
  const pOf = (cfg, a, b, phase2) => { const e = cfg.edges.find(x => ek(x.from, x.to) === ek(a, b)); return e ? (phase2 ? e.pPhaseII : e.pPhaseI) : null; };
  // the B2 arbitration function (pure), used only to fill each candidate's blended weight consistently
  const ec = blob('render/executiveController.js');
  const arbitrate = new Function(ec.replace(/export function/g, 'function') + '\nreturn arbitrate;')();
  const clamp = (x) => Math.max(-400, Math.min(400, x));
  const runs = [];
  function simulate(runId, arm, cfg, seed, kind) {
    const rr = mulberry(990101 + runs.length * 7919 + 13);
    const gg = (sd) => sd * gauss(rr);
    const store = new Map(), get = (k) => store.get(k) || [0, 0];
    const frozen = arm === 'A4', severed = arm === 'A2' || arm === 'A5';
    const events = [], attempts = [], resets = [], snapshots = [], floors = [], decisions = [], step0 = [];
    const raw = [new Map(), new Map()];
    let ticks = '', cur = nodes[Math.floor(rr() * nodes.length)], sinceReset = 0;
    const snap = (label, calls, phase) => {
      const keys = new Set([...store.keys(), ...raw[phase].keys()]);
      const ent = [...keys].sort((x, y) => { const a = x.split('->').map(Number), b = y.split('->').map(Number); return a[0] - b[0] || a[1] - b[1]; })
        .map(k => [k, get(k)[0], get(k)[1], raw[phase].get(k) || 0]);
      snapshots.push([label, calls, ent]);
    };
    for (let i = 0; i < 3005; i++) {
      if (i === 1505) snap('tau1499', 1505, 0);
      const tau = i - 5, phase2 = tau >= 1500;
      // record-level input variants: reward distribution by τ range, and decision sparsity in Phase I
      let mode = 'normal';
      if (kind === 'richRewards') mode = 'rich';
      if (kind === 'poorRewardsFrom1500' && tau >= 1500) mode = 'poor';
      if (kind === 'poorRewardsW2' && tau >= 300 && tau < 1500) mode = 'poor';
      if (kind === 'sparsePhaseI' && tau < 1500) mode = 'sparse';
      const u = rr();
      if (u < 0.08) { ticks += 'R'; continue; }                           // replay branch: no selection, no draw
      if (u < 0.08 + (kind === 'sparsePhaseI' && tau < 1500 ? 0.9 : 0.55)) { ticks += 'N'; continue; }   // no selection this call
      ticks += 'D';
      const cands = nb.get(cur).slice();
      // step-0 candidate group
      const ewv = [0.3, 0.15, 0.2, 0.1, 0.1, 0.15].map(x => r6(x * (0.7 + 0.6 * rr())));
      const group = cands.map(k => {
        const key = `${cur}->${k}`, [a, s] = get(key), T = severed ? 0.5 : (s + 1) / (a + 2);
        const t = (T - 0.5) * 8 * 1.5;
        const F = r6(gg(60) + (rr() < 0.04 ? 450 + 100 * rr() : 0) + (rr() < 0.01 ? -480 : 0)) + t;
        const applied = rr() < 0.75 ? 1 : 0;
        const arb = [r6(gg(8)), r6(1 + gg(1)), r6(gg(3) + t), r6(rr() * 2), r6(rr() * 4)], unc = r6(rr() * 2);
        const returned = clamp(F);
        const w = applied ? returned * 0.60 + arbitrate({ rewardScore: arb[0], semanticScore: arb[1], confidenceScore: arb[2], uncertaintyScore: unc, curiosityScore: arb[3], costScore: arb[4],
          executiveWeights: { wReward: ewv[0], wSemantic: ewv[1], wConfidence: ewv[2], wUncertainty: ewv[3], wCuriosity: ewv[4], wCost: ewv[5] }, drift: 0, isSelfLoop: false }) * 0.40 : returned;
        return [k, F, t, returned, w, applied, arb, unc, ewv, 0];
      });
      if (rr() < 0.02 && group.length > 1) group[1][4] = group[0][4];   // occasional exact tie in weight
      const best = group.map(c => ({ key: c[0], weight: c[4] })).sort((a, b) => b.weight - a.weight)[0].key;
      step0.push([i, best, group]);
      const next = cands[Math.floor(rr() * cands.length)];
      decisions.push([i, next]);
      // the environment draw for the attempt
      const key = `${cur}->${next}`, p = pOf(cfg, cur, next, phase2);
      const ok = rr() < p, goalEntering = next === cfg.goal;
      const [pa, ps] = get(key);
      attempts.push([i, cur, next, ok ? 1 : 0, goalEntering ? 1 : 0, pa, ps]);
      if (tau >= 0 && tau < 3000) { const m = raw[tau < 1500 ? 0 : 1]; m.set(key, (m.get(key) || 0) + 1); }
      if (!frozen) store.set(key, [pa + 1, ps + (ok ? 1 : 0)]);
      if (!frozen && rr() < 0.02) for (const [k2, [a2, s2]] of [...store]) store.set(k2, [a2 * 0.9997, s2 * 0.9997]);   // occasional decay
      if (arm !== 'A2' && arm !== 'A4' && rr() < 0.3) floors.push(i);
      sinceReset++;
      if (ok) {
        let rew;
        if (goalEntering) rew = 12;
        else if (mode === 'rich') rew = rr() < 0.7 ? 2 : 0.3;
        else if (mode === 'poor') rew = rr() < 0.8 ? -0.4 : 0.3;
        else rew = [2, 0.3, -0.4][Math.floor(rr() * 3)];
        events.push([i, rew]);
        cur = next;
        if (goalEntering) { resets.push([i, 'goal']); cur = nodes[Math.floor(rr() * nodes.length)]; sinceReset = 0; }
      }
      if (sinceReset >= 150) { resets.push([i, 'cap']); cur = nodes[Math.floor(rr() * nodes.length)]; sinceReset = 0; }
    }
    snap('tau2999', 3005, 1);
    return { runId, arm, configIndex: cfg.index, seed, measurement: { schema: 'h1r.measure/2', calls: 3005, events, ticks, attempts, resets, snapshots,
      floorCalls: floors, decisions, step0, forks: [] } };
  }
  const plan = [['m1', 'A1', 0, 20260819100, 'normal'], ['m2', 'A1', 0, 20260819101, 'richRewards'], ['m3', 'A1', 1, 20260819100, 'poorRewardsFrom1500'],
    ['m4', 'A1', 1, 20260819101, 'sparsePhaseI'], ['m5', 'A2', 0, 20260819100, 'normal'], ['m6', 'A4', 0, 20260819100, 'normal'], ['m7', 'A1', 1, 20260819102, 'poorRewardsW2']];
  for (const [id, arm, ci, seed, kind] of plan) runs.push(simulate(id, arm, configs[ci], seed, kind));
  // fork records of run m1: events only differ from the switch call onwards (synthetic)
  const base = runs[0];
  const forks = [705, 1505, 2985].map((call, k) => {
    const rr = mulberry(990201 + k);
    const ev = base.measurement.events.filter(e => e[0] < call).map(e => e.slice());
    for (let i = call; i < 3005; i++) if (rr() < 0.55) ev.push([i, [2, 0.3, -0.4, 12][Math.floor(rr() * 4)]]);
    return { forkId: `m1@${call}`, baseRunId: 'm1', fork: { call, to: 'A2' }, measurement: { schema: 'h1r.measure/2', calls: 3005, events: ev, forks: [[call, 'A2']] } };
  });
  return { schema: 'h1r.d021b.records/1', id: 'M01', graph: { nodes, edges }, configurations: configs, runs, forkRuns: forks };
}

// ---------------- write ----------------
const manifest = {};
const write = (name, obj) => { const text = JSON.stringify(obj); fs.writeFileSync(path.join(OUT, name), text); manifest[name] = crypto.createHash('sha256').update(text).digest('hex'); };
for (const [id, p] of Object.entries(SCEN)) write(`${id}.json`, study(id, p));
write('M01.json', records());
fs.writeFileSync(path.join(OUT, 'FIXTURES.sha256.json'), JSON.stringify(manifest, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, `${v.slice(0, 16)}… ${(fs.statSync(path.join(OUT, k)).size / 1e6).toFixed(2)} MB`])), null, 1));

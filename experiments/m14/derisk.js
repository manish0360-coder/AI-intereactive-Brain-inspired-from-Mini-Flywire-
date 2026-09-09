// ==========================================================
// M14 PASS 2 — attainability / de-risking of candidate C1 estimands
// ==========================================================
// PURPOSE, stated so it cannot be mistaken:
//   This determines whether a proposed MEASUREMENT INSTRUMENT has a
//   non-degenerate, discriminable observable. It is NOT evidence about
//   futureScore, and no conclusion drawn here is a cognitive claim.
//
//   "The instrument is measurable" is the only thing this can establish.
//   "futureScore has a causal effect" is NOT, and is not claimed.
//
// Five materially distinct estimand classes are computed FROM THE SAME
// recorded snapshots, so none is favoured by having better data than another.
//
// Non-registered fixtures only. No frozen artifact is touched.
// ==========================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import * as env from '../m7/env.js';
import { FROZEN, inRegisteredBlock } from '../uqb/protocol.js';

// env.orderedNeighbours is module-private, so adjacency is rebuilt here from
// connections.json in the same file-order convention env itself uses.
const _EDGES = JSON.parse(fs.readFileSync(
    path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
              'connections.json'), 'utf8'));
const NB = new Map();
const _add = (a, b) => { if (!NB.has(a)) NB.set(a, []); if (!NB.get(a).includes(b)) NB.get(a).push(b); };
for (const c of _EDGES) { _add(Number(c.from), Number(c.to)); _add(Number(c.to), Number(c.from)); }
const neighboursOf = (u) => NB.get(Number(u)) || [];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const U = 'file:///' + ROOT.replace(/\\/g, '/');
const log = (s = '') => process.stdout.write(s + '\n');

// One accepted, non-registered fixture per goal.
const FIXTURES = [
    { configSeed: 896066, configIndex: 0 },
    { configSeed: 896066, configIndex: 1 },
    { configSeed: 896238, configIndex: 2 },
    { configSeed: 896329, configIndex: 3 },
];

const childSource = (o) => `
import { register } from 'node:module';
const U = ${JSON.stringify(U)};
globalThis.__UQB_EXPOSE__ = {};
register(U + '/experiments/m14/hook.mjs', import.meta.url);
const env = await import(U + '/experiments/m7/env.js');
const { runOnce } = await import(U + '/experiments/m7/run.js');
const { initRng } = await import(U + '/instrumentation/rng.js');
const P = await import(U + '/experiments/uqb/permute.js');
const M14 = await import(U + '/experiments/m14/probe.js');
const { readoutSeed } = await import(U + '/experiments/uqb/collect.js');

const ARM = ${JSON.stringify(o.arm)};
if (!env.makeConfig(${o.configSeed}, ${o.configIndex}).accepted) throw new Error('M14: fixture not accepted at own seed.');

// The exposure applies to the RUN, exactly as UQ-B section 5.1 requires: the two
// arms must live two different experiential histories, not share one.
globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
const rec = await runOnce({
    configSeed: ${o.configSeed}, configIndex: ${o.configIndex},
    agentSeed: ${FROZEN.agentSeed}, arm: ${JSON.stringify(FROZEN.m7Arm)},
    envMode: 'on', creditMode: 'on', pin: 'on', tickUnit: 'step',
    ticks: ${o.ticks}, crashAtTick: null, warmStore: false,
});
globalThis.__UQB__ = null;

const runPrediction = globalThis.__UQB_EXPOSE__.runPrediction;
const cfg = env.makeConfig(${o.configSeed}, ${o.configIndex});
const states = env.decisionStates(cfg.goal).slice().sort((a, b) => a - b);
const out = [];
for (const u of states) {
    const r = M14.makePoolRecorder();
    let best = null;
    globalThis.__UQB_FREEZE__ = true; globalThis.__UQB_FREEZE_BIO__ = true;
    globalThis.__UQB__ = P.makeGuard({ arm: ARM, sigmaFor: (n) => [...Array(n).keys()] });
    globalThis.__UQB_PROBE__ = (from, key, step) => { if (step === 0 && best === null) best = key; };
    globalThis.__M14__ = r;
    initRng(readoutSeed(${o.configSeed}, ARM, u));
    runPrediction(u);
    globalThis.__M14__ = null; globalThis.__UQB_PROBE__ = null; globalThis.__UQB__ = null;
    globalThis.__UQB_FREEZE__ = false; globalThis.__UQB_FREEZE_BIO__ = false;
    out.push({ state: u, best, pool: r.snapshots.length ? r.snapshots[0].pairs : [] });
}
process.stdout.write('@@M14@@' + JSON.stringify({
    arm: ARM, goal: cfg.goal, states, fingerprint: rec.fingerprint,
    evaluatedSeeds: env.evaluatedSeeds(), readouts: out,
}));
`;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'm14-'));
const run = (o) => {
    const f = path.join(TMP, `c_${o.arm}_${o.configSeed}_${o.configIndex}.mjs`);
    fs.writeFileSync(f, childSource({ ...o, ticks: o.ticks ?? FROZEN.ticks }));
    const out = execFileSync(process.execPath, [f], { encoding: 'utf8', maxBuffer: 1 << 28 });
    const r = JSON.parse(out.slice(out.indexOf('@@M14@@') + 7));
    for (const s of r.evaluatedSeeds) {
        if (inRegisteredBlock(s)) throw new Error(`M14: registered seed ${s} evaluated.`);
    }
    return r;
};

// ---- the continuous oracle: expected attempts-to-goal ---------------------
// cost(u -> v) = 1/p[edge(u,v)] + C(v), with C from env.expectedCostToGoal.
// regret(u, chosen) = cost(u -> chosen) - min_v cost(u -> v)   >= 0
// This uses the EXISTING committed oracle. No new oracle is introduced.
function regretFns(p, goal) {
    const C = env.expectedCostToGoal(p, goal);
    const cost = (u, v) => {
        const e = env.edgeIndexOf(u, v);
        if (e === undefined) return null;             // not a graph edge
        const cv = C.get(Number(v));
        if (cv === undefined || !isFinite(cv)) return null;
        return 1 / p[e] + cv;
    };
    return { C, cost };
}

log('='.repeat(78));
log('  M14 PASS 2 — estimand attainability on non-registered fixtures');
log('  instrument de-risking ONLY; not evidence about futureScore');
log('='.repeat(78));

const results = [];
for (const fx of FIXTURES) {
    const A = run({ ...fx, arm: 'ARMED' });
    const B = run({ ...fx, arm: 'ABLATED' });
    const cfg = env.makeConfig(fx.configSeed, fx.configIndex);
    const states = A.states;

    // per-phase continuous machinery
    const phases = { 1: regretFns(cfg.pPhase1, cfg.goal), 2: regretFns(cfg.pPhase2, cfg.goal) };
    const oracle = {
        1: env.reliabilityOptimalPolicy(cfg.pPhase1, cfg.goal).policy,
        2: env.reliabilityOptimalPolicy(cfg.pPhase2, cfg.goal).policy,
    };

    const perState = [];
    for (let i = 0; i < states.length; i++) {
        const u = states[i];
        const a = A.readouts[i], b = B.readouts[i];
        const poolA = new Map(a.pool), poolB = new Map(b.pool);
        // argmax derived from the captured pool, to cross-check the probe
        const argmax = (pairs) => pairs.length
            ? pairs.reduce((m, x) => (x[1] > m[1] ? x : m))[0] : null;
        const derivedA = argmax(a.pool), derivedB = argmax(b.pool);

        // rank of ARMED's pick inside ABLATED's ordering, and vice versa
        const rankOf = (pairs, key) => {
            const s = pairs.slice().sort((x, y) => y[1] - x[1]);
            const idx = s.findIndex(x => Number(x[0]) === Number(key));
            return idx < 0 ? null : idx;
        };
        const rAinB = rankOf(b.pool, a.best);
        const rBinA = rankOf(a.pool, b.best);

        // margins
        const margin = (pairs) => {
            if (pairs.length < 2) return null;
            const s = pairs.map(x => x[1]).sort((x, y) => y - x);
            return s[0] - s[1];
        };

        const row = {
            state: u,
            bestA: a.best, bestB: b.best,
            derivedA, derivedB,
            poolSizeA: a.pool.length, poolSizeB: b.pool.length,
            changed: Number(a.best) !== Number(b.best),
            rAinB, rBinA,
            marginA: margin(a.pool), marginB: margin(b.pool),
            tiesA: a.pool.length - new Set(a.pool.map(x => x[1])).size,
            tiesB: b.pool.length - new Set(b.pool.map(x => x[1])).size,
            regret: {}, aligned: {},
            poolA: a.pool, poolB: b.pool,
            // E6: rank of the ORACLE-OPTIMAL action inside each arm's
            // decision-time pool. Depends on the oracle and the pool, NOT on
            // what the agent chose, so the outcome is not selected by the
            // treatment through the agent's own decision.
            optRank: {},
        };
        for (const ph of [1, 2]) {
            const { cost } = phases[ph];
            const nb = neighboursOf(u);
            const opts = nb.map(v => cost(u, v)).filter(x => x !== null);
            const opt = opts.length ? Math.min(...opts) : null;
            const cA = cost(u, a.best), cB = cost(u, b.best);
            row.regret[ph] = {
                A: (cA !== null && opt !== null) ? cA - opt : null,
                B: (cB !== null && opt !== null) ? cB - opt : null,
            };
            row.aligned[ph] = {
                A: Number(oracle[ph].get(u)) === Number(a.best),
                B: Number(oracle[ph].get(u)) === Number(b.best),
            };
            const vStar = Number(oracle[ph].get(u));
            row.optRank[ph] = {
                star: vStar,
                A: rankOf(a.pool, vStar), B: rankOf(b.pool, vStar),
                nA: a.pool.length, nB: b.pool.length,
            };
        }
        perState.push(row);
    }
    results.push({ fx, goal: cfg.goal, fingerprintA: A.fingerprint, fingerprintB: B.fingerprint,
                   perState, evaluatedSeeds: [...A.evaluatedSeeds, ...B.evaluatedSeeds] });
}
fs.rmSync(TMP, { recursive: true, force: true });

// ==========================================================================
// estimand-by-estimand attainability
// ==========================================================================
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const fmt = (x, d = 4) => (x === null || x === undefined ? '  n/a ' : x.toFixed(d));

log('\n-- probe cross-check ------------------------------------------------------');
let xcheck = 0, xtot = 0;
for (const r of results) for (const s of r.perState) {
    xtot++;
    if (Number(s.derivedA) === Number(s.bestA) && Number(s.derivedB) === Number(s.bestB)) xcheck++;
}
log(`  argmax derived from the captured pool matches the probe's bestChoice: ${xcheck}/${xtot}`);

log('\n-- decision-time pool structure ------------------------------------------');
const sizes = results.flatMap(r => r.perState.flatMap(s => [s.poolSizeA, s.poolSizeB]));
const tie = results.flatMap(r => r.perState.flatMap(s => [s.tiesA, s.tiesB]));
sizes.sort((a, b) => a - b);
log(`  pool size: min ${sizes[0]}  median ${sizes[Math.floor(sizes.length / 2)]}  max ${sizes[sizes.length - 1]}`);
log(`  weight ties within a pool: ${tie.reduce((a, b) => a + b, 0)} across ${tie.length} pools`);
const nonNb = results.flatMap(r => r.perState.filter(s =>
    env.edgeIndexOf(s.state, s.bestA) === undefined ||
    env.edgeIndexOf(s.state, s.bestB) === undefined)).length;
log(`  readouts whose chosen action is NOT a graph edge: ${nonNb}/${xtot}`);

log('\n-- E1  policy-change Hamming (integer 0..19 per configuration) -----------');
for (const r of results) {
    const h = r.perState.filter(s => s.changed).length;
    log(`  ${r.fx.configSeed}:${r.fx.configIndex} goal ${String(r.goal).padStart(2)}   H = ${h}/19`);
}

log('\n-- E2  continuous regret difference (expected attempts-to-goal) ----------');
for (const r of results) {
    for (const ph of [1, 2]) {
        const ra = r.perState.map(s => s.regret[ph].A).filter(x => x !== null);
        const rb = r.perState.map(s => s.regret[ph].B).filter(x => x !== null);
        const d = mean(ra) - mean(rb);
        const distinct = new Set(r.perState.flatMap(s => [s.regret[ph].A, s.regret[ph].B])
            .filter(x => x !== null).map(x => x.toFixed(6))).size;
        log(`  ${r.fx.configSeed}:${r.fx.configIndex} ph${ph}  Rarmed ${fmt(mean(ra))}  ` +
            `Rablated ${fmt(mean(rb))}  delta ${fmt(d)}   distinct regret values ${distinct}`);
    }
}

log('\n-- E3  rank displacement in the decision-time pool -----------------------');
for (const r of results) {
    const rr = r.perState.map(s => s.rAinB).filter(x => x !== null);
    const disp = rr.filter(x => x > 0).length;
    log(`  ${r.fx.configSeed}:${r.fx.configIndex}  ARMED pick sits at rank>0 under ABLATED in ` +
        `${disp}/${rr.length} states   ranks seen {${[...new Set(rr)].sort((a, b) => a - b).join(',')}}`);
}

log('\n-- E4  oracle-alignment count difference (UQ-B C1 form) ------------------');
for (const r of results) {
    for (const ph of [1, 2]) {
        const aA = r.perState.filter(s => s.aligned[ph].A).length;
        const aB = r.perState.filter(s => s.aligned[ph].B).length;
        log(`  ${r.fx.configSeed}:${r.fx.configIndex} ph${ph}  Aarmed ${aA}/19  Aablated ${aB}/19  ` +
            `diff ${aA - aB}`);
    }
}

log('\n-- E6  rank of the ORACLE-OPTIMAL action in the decision-time pool -------');
{
    let both = 0, one = 0, none = 0, tot = 0;
    for (const r of results) for (const s of r.perState) for (const ph of [1, 2]) {
        tot++;
        const o = s.optRank[ph];
        if (o.A !== null && o.B !== null) both++;
        else if (o.A !== null || o.B !== null) one++;
        else none++;
    }
    log(`  definedness: BOTH arms ${both}/${tot}   one only ${one}   neither ${none}`);
    for (const r of results) for (const ph of [1, 2]) {
        const rows = r.perState.filter(s => s.optRank[ph].A !== null && s.optRank[ph].B !== null);
        if (!rows.length) { log(`  ${r.fx.configSeed}:${r.fx.configIndex} ph${ph}  none defined`); continue; }
        const norm = (o, k) => (o['n' + k] > 1 ? o[k] / (o['n' + k] - 1) : 0);
        const d = rows.map(s => norm(s.optRank[ph], 'A') - norm(s.optRank[ph], 'B'));
        const m = d.reduce((a, b) => a + b, 0) / d.length;
        const nz = d.filter(x => Math.abs(x) > 1e-12).length;
        const ranks = [...new Set(rows.flatMap(s => [s.optRank[ph].A, s.optRank[ph].B]))]
            .sort((a, b) => a - b);
        log(`  ${r.fx.configSeed}:${r.fx.configIndex} ph${ph}  n=${String(rows.length).padStart(2)}/19  ` +
            `mean normalised rank delta ${m.toFixed(4)}  non-zero ${nz}/${d.length}  ` +
            `ranks {${ranks.join(',')}}`);
    }
}

log('\n-- E5  score margin (scale-dependent) ------------------------------------');
for (const r of results) {
    const ma = r.perState.map(s => s.marginA).filter(x => x !== null);
    const mb = r.perState.map(s => s.marginB).filter(x => x !== null);
    log(`  ${r.fx.configSeed}:${r.fx.configIndex}  mean margin ARMED ${fmt(mean(ma))}  ` +
        `ABLATED ${fmt(mean(mb))}`);
}

fs.writeFileSync(path.join(HERE, 'm14_attainability.json'),
    JSON.stringify({ fixtures: FIXTURES, results }, null, 2) + '\n');

log('\n' + '='.repeat(78));
log('  recorded to m14_attainability.json');
log('='.repeat(78));

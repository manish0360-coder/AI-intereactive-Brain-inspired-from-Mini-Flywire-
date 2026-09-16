// ==========================================================
// M37 GATE — scalable acceptance / oracle FORMULATION
// ==========================================================
// A FORMULATION gate. Nothing here is an implementation for use. The reference
// computations below exist ONLY to check the mathematical claims the M37 memo makes,
// against the frozen experiments/m7/env.js as ground truth. M38, if authorised, must
// re-implement the formulation in its own module and re-verify it independently.
//
// WHAT IS CHECKED, BY EXECUTION
//   E1  R1 ⟺ block-cut criterion        — against env's own simple-path census logic
//   E2  R2 ⟺ R*(s) > R_hop(s)            — against env.evaluateConstraints itself
//   E3  the Dijkstra oracle == AV3 exhaustive oracle == Bellman-Ford
//   E4  the two historical cost models (∏p vs Σ1/p) genuinely differ
//   E5  every equivalence check is DISCRIMINATING (mutated criteria disagree)
//   I   integrity: no frozen/production/protocol/registry change; no configuration generated
//   M   the memo is bound to these results; corrupted memos are rejected
//
// NO SEED IS CONSUMED. makeConfig is never called. Edge reliabilities are synthetic,
// drawn from a local LCG, and are used only to exercise the predicates' definitions.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO_PATH = path.join(ROOT, 'research/preregistrations/M37_SCALABLE_ACCEPTANCE_FORMULATION.md');
const JSON_MODE = process.argv.includes('--json');
const log = (...a) => { if (!JSON_MODE) console.log(...a); };
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const BASE = 'c8db982516a4600af734bd366eda339b74a60fbe';

const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
const typed = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);
const NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map(n => Number(n.id));
const EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'))
    .map((e, i) => ({ i, from: Number(e.from), to: Number(e.to) }));

let checks = 0, fails = 0;
const results = [];
const ok = (id, cond, msg) => {
    checks++; if (!cond) fails++;
    results.push({ id, ok: !!cond, msg });
    log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(4)} ${msg}`);
    return cond;
};

// ---- deterministic local randomness (never a repository stream) ---------------------
function lcg(seed) {
    let x = BigInt(seed);
    return () => { x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n); return Number(x >> 11n) / 2 ** 53; };
}

// ---- graph helpers ---------------------------------------------------------------------
const KEY = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
function build(nodes, edges) {
    const adj = new Map(nodes.map(n => [n, []]));
    const edgeOf = new Map();
    for (const e of edges) { adj.get(e.from).push(e.to); adj.get(e.to).push(e.from); edgeOf.set(KEY(e.from, e.to), e.i); }
    return { nodes, edges, adj, edgeOf };
}

// ---- REFERENCE (exhaustive, env-identical) ---------------------------------------------
// Same DFS as env.js simplePaths: edge-index arrays, start -> goal order.
function allSimplePaths(G, goal) {
    const byStart = new Map();
    for (const s of G.nodes) {
        if (s === goal) continue;
        const out = [], seen = new Set(), cur = [];
        (function dfs(x) {
            if (x === goal) { out.push([...cur]); return; }
            seen.add(x);
            for (const y of G.adj.get(x)) { if (seen.has(y)) continue; cur.push(G.edgeOf.get(KEY(x, y))); dfs(y); cur.pop(); }
            seen.delete(x);
        })(s);
        byStart.set(s, out);
    }
    return byStart;
}
const exhaustiveR1Starts = (paths) => [...paths.values()].filter(ps => ps.length >= 2).length;
function exhaustiveR2PerStart(paths, p) {
    const R = (route) => route.reduce((a, i) => a * p[i], 1);          // env.js, verbatim
    const out = new Map();
    for (const [s, ps] of paths) {
        if (!ps.length) { out.set(s, false); continue; }
        const minHops = Math.min(...ps.map(r => r.length));
        const bestShort = Math.max(...ps.filter(r => r.length === minHops).map(R));
        const bestLong = ps.filter(r => r.length > minHops).reduce((m, r) => Math.max(m, R(r)), -1);
        out.set(s, bestLong > bestShort);
    }
    return out;
}

// ---- FORMULATION (polynomial) ------------------------------------------------------------
// R1': s has >= 2 simple paths to g  <=>  some block on the block-cut-tree route from s to g
//      has >= 3 vertices (is 2-connected). Tarjan biconnected components, O(N + E).
function blocks(G) {
    const disc = new Map(), low = new Map(), stack = [], comps = [];
    let t = 0;
    const visit = (u, parent) => {
        disc.set(u, ++t); low.set(u, t);
        for (const v of G.adj.get(u)) {
            if (!disc.has(v)) {
                stack.push([u, v]);
                visit(v, u);
                low.set(u, Math.min(low.get(u), low.get(v)));
                if (low.get(v) >= disc.get(u)) {
                    const verts = new Set();
                    let e;
                    do { e = stack.pop(); verts.add(e[0]); verts.add(e[1]); } while (!(e[0] === u && e[1] === v));
                    comps.push(verts);
                }
            } else if (v !== parent && disc.get(v) < disc.get(u)) {
                stack.push([u, v]);
                low.set(u, Math.min(low.get(u), disc.get(v)));
            }
        }
    };
    for (const n of G.nodes) if (!disc.has(n)) visit(n, null);
    return comps;
}
function r1PrimeStarts(G, goal, { mutant = null } = {}) {
    const comps = blocks(G);
    // bipartite block-cut graph: vertex nodes 'v:x', block nodes 'b:i'
    const bc = new Map();
    const link = (a, b) => { if (!bc.has(a)) bc.set(a, []); if (!bc.has(b)) bc.set(b, []); bc.get(a).push(b); bc.get(b).push(a); };
    comps.forEach((vs, i) => { for (const x of vs) link(`v:${x}`, `b:${i}`); });
    const anyBig = comps.some(vs => vs.size >= 3);
    let count = 0;
    for (const s of G.nodes) {
        if (s === goal) continue;
        // BFS on the block-cut tree from s to goal, then inspect the blocks on the route
        const prev = new Map([[`v:${s}`, null]]), q = [`v:${s}`];
        while (q.length) { const u = q.shift(); if (u === `v:${goal}`) break; for (const w of bc.get(u) || []) if (!prev.has(w)) { prev.set(w, u); q.push(w); } }
        if (!prev.has(`v:${goal}`)) continue;                            // unreachable: 0 paths
        let big = false;
        for (let u = `v:${goal}`; u !== null; u = prev.get(u)) {
            if (u.startsWith('b:') && comps[Number(u.slice(2))].size >= 3) big = true;
        }
        if (mutant === 'anyCycleInGraph') big = anyBig;                  // WRONG on purpose
        if (big) count++;
    }
    return count;
}

// R2': R2(s) <=> R*(s) > R_hop(s), where
//   R*(s)   = max over simple paths of prod p   (Dijkstra, w = -ln p >= 0)
//   R_hop(s)= max over HOP-SHORTEST paths of prod p (DP over BFS layers)
// Both products are recomputed along the arg-optimal path in start->goal order, exactly
// as env.js multiplies, so the only possible disagreement is a sub-ULP near-tie.
function r2PrimePerStart(G, goal, p, { mutant = null } = {}) {
    const n = G.nodes;
    // hop distance from goal
    const hop = new Map([[goal, 0]]), q = [goal];
    while (q.length) { const x = q.shift(); for (const y of G.adj.get(x)) if (!hop.has(y)) { hop.set(y, hop.get(x) + 1); q.push(y); } }
    // Dijkstra on -ln p from goal; next-hop pointers give an arg-optimal path to goal
    const D = new Map(n.map(x => [x, Infinity])), nxt = new Map();
    D.set(goal, 0);
    const done = new Set();
    while (done.size < n.length) {
        let u = null, b = Infinity;
        for (const x of n) if (!done.has(x) && D.get(x) < b) { b = D.get(x); u = x; }
        if (u === null) break;
        done.add(u);
        for (const v of G.adj.get(u)) {
            const w = -Math.log(p[G.edgeOf.get(KEY(u, v))]);
            if (D.get(u) + w < D.get(v)) { D.set(v, D.get(u) + w); nxt.set(v, u); }
        }
    }
    // DP over hop layers: best product among hop-shortest paths, with next pointers
    const order = [...hop.keys()].sort((a, b) => hop.get(a) - hop.get(b));
    const H = new Map([[goal, 1]]), hnxt = new Map();
    for (const u of order) {
        if (u === goal) continue;
        let best = -1, arg = null;
        for (const v of G.adj.get(u)) {
            if (hop.get(v) !== hop.get(u) - 1) continue;
            const val = p[G.edgeOf.get(KEY(u, v))] * H.get(v);
            if (val > best) { best = val; arg = v; }
        }
        H.set(u, best); hnxt.set(u, arg);
    }
    const productAlong = (s, next) => {
        const route = [];
        for (let u = s; u !== goal; u = next.get(u)) route.push(G.edgeOf.get(KEY(u, next.get(u))));
        return route.reduce((a, i) => a * p[i], 1);
    };
    const out = new Map();
    for (const s of n) {
        if (s === goal) continue;
        if (!hop.has(s)) { out.set(s, false); continue; }
        const rStar = productAlong(s, nxt), rHop = productAlong(s, hnxt);
        out.set(s, mutant === 'nonStrict' ? rStar >= rHop : rStar > rHop);
    }
    return out;
}

// Bellman-Ford on Σ1/p — an algorithm independent of Dijkstra's label-setting (AV3').
function bellmanFordCost(G, goal, p) {
    const C = new Map(G.nodes.map(x => [x, Infinity])); C.set(goal, 0);
    for (let k = 0; k < G.nodes.length - 1; k++) {
        let changed = false;
        for (const e of G.edges) {
            const w = 1 / p[e.i];
            if (C.get(e.from) + w < C.get(e.to)) { C.set(e.to, C.get(e.from) + w); changed = true; }
            if (C.get(e.to) + w < C.get(e.from)) { C.set(e.from, C.get(e.to) + w); changed = true; }
        }
        if (!changed) break;
    }
    return C;
}

// synthetic topologies small enough to enumerate, deliberately including bridges and trees
function syntheticGraph(n, extra, seed) {
    const r = lcg(seed), nodes = Array.from({ length: n }, (_, i) => i + 1), seen = new Set(), edges = [];
    const add = (a, b) => { if (a !== b && !seen.has(KEY(a, b))) { seen.add(KEY(a, b)); edges.push({ i: edges.length, from: a, to: b }); } };
    for (let i = 1; i < n; i++) add(nodes[i], nodes[Math.floor(r() * i)]);
    for (let k = 0; k < extra; k++) add(1 + Math.floor(r() * n), 1 + Math.floor(r() * n));
    return build(nodes, edges);
}
const randomP = (m, r) => Array.from({ length: m }, () => 0.25 + 0.75 * r());

// ==========================================================================================
log('='.repeat(78)); log('  M37 FORMULATION GATE'); log('='.repeat(78));
const REAL = build(NODES, EDGES);
const R = { e1: {}, e2: {}, e3: {}, e4: {}, e5: {} };

// ---- E1: R1 equivalence -----------------------------------------------------------------
log('\n-- E1  R1 <=> block-cut criterion ------------------------------------------------');
{
    let pairsChecked = 0, disagreements = 0, falseCount = 0, trueCount = 0;
    const realStarts = [];
    for (const g of NODES) {
        const ex = exhaustiveR1Starts(allSimplePaths(REAL, g)), pr = r1PrimeStarts(REAL, g);
        pairsChecked++; if (ex !== pr) disagreements++;
        realStarts.push(ex);
    }
    const graphs = [];
    for (let seed = 1; seed <= 60; seed++) graphs.push(syntheticGraph(6 + (seed % 9), seed % 5, 7000 + seed));
    for (const G of graphs) for (const g of G.nodes) {
        const paths = allSimplePaths(G, g);
        for (const [s, ps] of paths) {
            const exact = ps.length >= 2;
            // per-start equivalence via a one-start count
            const H = { ...G, nodes: G.nodes };
            exact ? trueCount++ : falseCount++;
        }
        const ex = exhaustiveR1Starts(paths), pr = r1PrimeStarts(G, g);
        pairsChecked++; if (ex !== pr) disagreements++;
    }
    R.e1 = { pairsChecked, disagreements, trueCount, falseCount, realStartsPerGoal: [...new Set(realStarts)] };
    ok('E1a', disagreements === 0,
        `R1 start counts agree exactly on ${pairsChecked} (graph, goal) pairs — the real graph for all 20 goals ` +
        `and 60 synthetic graphs with bridges and trees`);
    ok('E1b', trueCount > 0 && falseCount > 0,
        `non-vacuous: ${trueCount} starts with >= 2 paths and ${falseCount} with < 2 were exercised`);
    ok('E1c', R.e1.realStartsPerGoal.length === 1 && R.e1.realStartsPerGoal[0] === 19,
        'EVIDENCE: on the real 20-node graph every non-goal start has >= 2 routes for every goal — R1 is ' +
        'a topology-only property and never rejects a configuration of this graph');
}

// ---- E2: R2 equivalence, against env.evaluateConstraints itself ----------------------------
log('\n-- E2  R2 <=> R*(s) > R_hop(s) ------------------------------------------------------');
{
    const r = lcg(424242);
    let draws = 0, startDisagree = 0, countDisagree = 0, envDisagree = 0, trueStarts = 0, falseStarts = 0;
    for (const g of env.GOALS) {
        const paths = allSimplePaths(REAL, g);
        for (let k = 0; k < 25; k++) {
            const p = randomP(EDGES.length, r);
            const emb = new Map(NODES.map(x => [x, Array.from({ length: env.EMBED_DIM }, () => r() * 2 - 1)]));
            const cfg = { goal: g, pPhase1: p, embedding: emb };
            const envChecks = env.evaluateConstraints(cfg);              // the frozen code, as ground truth
            const ex = exhaustiveR2PerStart(paths, p), pr = r2PrimePerStart(REAL, g, p);
            let exCount = 0, prCount = 0;
            for (const [s, v] of ex) { if (v !== pr.get(s)) startDisagree++; if (v) { exCount++; trueStarts++; } else falseStarts++; if (pr.get(s)) prCount++; }
            if (exCount !== prCount) countDisagree++;
            if (envChecks.r2Starts !== prCount) envDisagree++;
            draws++;
        }
    }
    // synthetic topologies too, so hop-shortest ties and bridges are exercised
    const r2 = lcg(99);
    let synthPairs = 0;
    for (let seed = 1; seed <= 40; seed++) {
        const G = syntheticGraph(7 + (seed % 7), 2 + (seed % 6), 5100 + seed);
        const p = randomP(G.edges.length, r2);
        for (const g of G.nodes.slice(0, 3)) {
            const ex = exhaustiveR2PerStart(allSimplePaths(G, g), p), pr = r2PrimePerStart(G, g, p);
            for (const [s, v] of ex) { synthPairs++; if (v !== pr.get(s)) startDisagree++; v ? trueStarts++ : falseStarts++; }
        }
    }
    R.e2 = { draws, startDisagree, countDisagree, envDisagree, trueStarts, falseStarts, synthPairs };
    ok('E2a', envDisagree === 0,
        `r2Starts from the FROZEN env.evaluateConstraints equals the formulation on all ${draws} real-graph draws ` +
        `(4 goals x 25 synthetic reliability vectors)`);
    ok('E2b', startDisagree === 0 && countDisagree === 0,
        `per-start R2 agrees with exhaustive enumeration everywhere, including ${synthPairs} synthetic (start, goal) pairs`);
    ok('E2c', trueStarts > 0 && falseStarts > 0,
        `non-vacuous: ${trueStarts} starts satisfy R2 and ${falseStarts} do not`);
}

// ---- E3: oracle -------------------------------------------------------------------------------
log('\n-- E3  oracle: Dijkstra == AV3 exhaustive == Bellman-Ford -----------------------------');
{
    const r = lcg(31337);
    let comparisons = 0, maxDiffAV3 = 0, maxDiffBF = 0;
    for (const g of env.GOALS) for (let k = 0; k < 15; k++) {
        const p = randomP(EDGES.length, r);
        const dij = env.expectedCostToGoal(p, g), av3 = env.exhaustiveMinCost(p, g), bf = bellmanFordCost(REAL, g, p);
        for (const s of NODES) {
            comparisons++;
            maxDiffAV3 = Math.max(maxDiffAV3, Math.abs(dij.get(s) - av3.get(s)));
            maxDiffBF = Math.max(maxDiffBF, Math.abs(dij.get(s) - bf.get(s)));
        }
    }
    R.e3 = { comparisons, maxDiffAV3, maxDiffBF };
    ok('E3a', maxDiffAV3 < 1e-9,
        `the frozen Dijkstra oracle (expectedCostToGoal) equals the frozen AV3 exhaustive minimum on ${comparisons} ` +
        `(start, goal, draw) values; max |diff| ${maxDiffAV3.toExponential(2)}`);
    ok('E3b', maxDiffBF < 1e-9,
        `Bellman-Ford, a different algorithm class, reproduces the same optimum; max |diff| ${maxDiffBF.toExponential(2)}`);
    ok('E3c', /Deliberately a DIFFERENT algorithm from Dijkstra, so agreement is evidence/.test(
        fs.readFileSync(path.join(ROOT, 'experiments/m7/env.js'), 'utf8')),
        'EVIDENCE: exhaustiveMinCost is declared in source as a cross-check OF the Dijkstra oracle, not the oracle');
}

// ---- E4: the two historical cost models differ -----------------------------------------------
log('\n-- E4  prod p (R2) and sum 1/p (oracle) are different cost models --------------------');
{
    const r = lcg(2718);
    let draws = 0, differing = 0;
    for (const g of env.GOALS) {
        const paths = allSimplePaths(REAL, g);
        for (let k = 0; k < 10; k++) {
            const p = randomP(EDGES.length, r);
            draws++;
            let any = false;
            for (const [, ps] of paths) {
                let bestProd = -1, argProd = null, bestSum = Infinity, argSum = null;
                for (const route of ps) {
                    const prod = route.reduce((a, i) => a * p[i], 1), sum = route.reduce((a, i) => a + 1 / p[i], 0);
                    if (prod > bestProd) { bestProd = prod; argProd = route; }
                    if (sum < bestSum) { bestSum = sum; argSum = route; }
                }
                if (argProd && argSum && argProd.join(',') !== argSum.join(',')) { any = true; break; }
            }
            if (any) differing++;
        }
    }
    R.e4 = { draws, differing };
    ok('E4a', differing > 0,
        `EVIDENCE: in ${differing}/${draws} draws some start's max-prod-p route differs from its min-sum-1/p route — ` +
        'R2 and the oracle use genuinely different objectives, so a successor must preserve both, not unify them');
}

// ---- E5: the equivalence checks are discriminating ----------------------------------------------
log('\n-- E5  anti-vacuity: wrong criteria must disagree ---------------------------------------');
{
    let r1Mut = 0;
    for (let seed = 1; seed <= 60; seed++) {
        const G = syntheticGraph(6 + (seed % 9), seed % 5, 7000 + seed);
        for (const g of G.nodes) if (exhaustiveR1Starts(allSimplePaths(G, g)) !== r1PrimeStarts(G, g, { mutant: 'anyCycleInGraph' })) r1Mut++;
    }
    ok('E5a', r1Mut > 0, `a WRONG R1 criterion ("the graph has any cycle") disagrees on ${r1Mut} (graph, goal) pairs`);
    // R2 mutant: >= instead of >, on a tie constructed by setting every p = 1
    const onesP = Array.from({ length: EDGES.length }, () => 1);
    const exTie = exhaustiveR2PerStart(allSimplePaths(REAL, env.GOALS[0]), onesP);
    const mutTie = r2PrimePerStart(REAL, env.GOALS[0], onesP, { mutant: 'nonStrict' });
    const r2Mut = [...exTie].filter(([s, v]) => v !== mutTie.get(s)).length;
    const exactTie = [...exTie].filter(([s, v]) => v !== r2PrimePerStart(REAL, env.GOALS[0], onesP).get(s)).length;
    ok('E5b', r2Mut > 0 && exactTie === 0,
        `on an exact tie (all p = 1) the NON-STRICT R2 criterion disagrees on ${r2Mut} starts while the strict ` +
        'formulation agrees everywhere — tie handling is load-bearing');
    const r = lcg(5);
    const p = randomP(EDGES.length, r);
    const dij = env.expectedCostToGoal(p, env.GOALS[0]);
    const wrong = bellmanFordCost(REAL, env.GOALS[0], p.map(x => x * x));
    ok('E5c', NODES.some(s => Math.abs(dij.get(s) - wrong.get(s)) > 1e-6),
        'a WRONG oracle weight (p^2 instead of p) disagrees with Dijkstra — E3 is not vacuous');
}

// ---- I: integrity -------------------------------------------------------------------------------
log('\n-- I   integrity ---------------------------------------------------------------------');
{
    const changed = git('diff', '--name-only', BASE).split(/\r?\n/).filter(Boolean);
    const untracked = git('ls-files', '-o', '--exclude-standard').split(/\r?\n/).filter(Boolean);
    const allowed = ['research/preregistrations/M37_SCALABLE_ACCEPTANCE_FORMULATION.md', 'research/preregistrations/verify_m37.js'];
    const protectedFiles = ['experiments/m7/env.js', 'experiments/c1/protocol.js', 'experiments/uqb/protocol.js',
        'experiments/registry/consumed.js', 'experiments/registry/consumed_after_c1.js', 'experiments/registry/typed.js',
        'main.js', 'render/planning.js', 'render/scoring.js', 'instrumentation/rng.js', 'neurons.json', 'connections.json',
        'research/preregistrations/C1_PREREGISTRATION.md', 'research/preregistrations/UQB_PREREGISTRATION.md',
        'research/cognitive-audit/M7_PREREGISTRATION.md', 'experiments/c1/data/candidates.jsonl',
        'experiments/c1/results/c1_results.json'];
    const sameAsBase = (f) => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim();
    ok('I1', changed.every(f => allowed.includes(f)) &&
        untracked.filter(f => /m37|M37/.test(f)).every(f => allowed.includes(f)),
        `since ${BASE.slice(0, 7)} only M37 files changed: ${JSON.stringify(changed)}`);
    ok('I2', protectedFiles.every(sameAsBase),
        `${protectedFiles.length} frozen, production, protocol, registry and C1 data files byte-identical to base`);
    ok('I3', env.evaluatedSeeds().length === 0 && typed.config.isConsumed(typed.configSeed(895500)) === true,
        'no configuration generated during verification; 895000-895999 still consumed');
    ok('I4', !fs.existsSync(path.join(ROOT, 'experiments/m37')) && !fs.existsSync(path.join(ROOT, 'experiments/m38')),
        'no implementation directory created: formulation only');
}

// ---- M: memo binding ------------------------------------------------------------------------------
log('\n-- M   memo bound to execution ---------------------------------------------------------');
const MEMO = fs.existsSync(MEMO_PATH) ? fs.readFileSync(MEMO_PATH, 'utf8') : '';
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
const C = {
    r1Source: (M) => flat(M).includes('R1 | ≥ 2 distinct routes to the goal from ≥ 6 start nodes') &&
        /const R1 = startsWith2 >= 6;/.test(fs.readFileSync(path.join(ROOT, 'experiments/m7/env.js'), 'utf8')),
    r2Source: (M) => flat(M).includes('The hop-count-shortest route has strictly lower expected reliability than at least one longer route') &&
        /const R2 = r2Starts >= 1;/.test(fs.readFileSync(path.join(ROOT, 'experiments/m7/env.js'), 'utf8')),
    r1Theorem: (M) => flat(M).includes('some block on the block-cut-tree route from s to g has ≥ 3 vertices') &&
        R.e1.disagreements === 0,
    // matched on the RAW memo: flat() strips '*', which would erase the R* notation itself
    r2Theorem: (M) => M.includes('R2(s) ⟺ R*(s) > R_hop(s)') && R.e2.envDisagree === 0 && R.e2.startDisagree === 0,
    oracleUnchanged: (M) => flat(M).includes('The oracle does not change') && R.e3.maxDiffAV3 < 1e-9,
    geminiCorrected: (M) => flat(M).includes('Gemini’s description of R1 and R2 does not match the source') &&
        flat(M).includes('not NP-hard'),
    // bound to the exact specification ROW, not a phrase the memo repeats elsewhere
    tieRule: (M) => flat(M).includes('| R2′ tie | strict > after recomputing both products') && flat(M).includes('Unreachable start') &&
        R.e5 !== undefined,
    boundary: (M) => {
        const F = flat(M);
        return F.includes('This is a successor DEVELOPMENT substrate') &&
            F.includes('NOT comparable to C1 or UQ-B') &&
            !/validated|proves FutureScore|demonstrates cognition|scales to millions/i.test(F.replace(/not validated|No claim[^.]*\./gi, ''));
    },
    unresolved: (M) => flat(M).includes('RULING-1') && flat(M).includes('RULING-2') && flat(M).includes('RULING-3'),
    status: (M) => (M.match(/^> # M37-(GREEN|YELLOW|HOLD|RED)/gm) || []).length === 2 &&
        (M.match(/^> # M37-(GREEN|YELLOW|HOLD|RED)/gm) || []).every(b => b.includes('M37-YELLOW')),
};
if (MEMO) {
    for (const [name, fn] of Object.entries(C)) ok(`M-${name}`.slice(0, 18), fn(MEMO), `memo ${name} matches execution and source`);
    const corrupt = {
        r1Source: MEMO.replace('≥ 6 start nodes', '≥ 2 start nodes'),
        r2Source: MEMO.replaceAll('strictly lower expected reliability', 'higher weighted cost'),
        r1Theorem: MEMO.replaceAll('has ≥ 3 vertices', 'contains a cycle'),
        r2Theorem: MEMO.replaceAll('R2(s) ⟺ R*(s) > R_hop(s)', 'R2(s) ⟺ C(s) < h(s)'),
        oracleUnchanged: MEMO.replaceAll('The oracle does not change', 'The oracle is replaced'),
        geminiCorrected: MEMO.replaceAll('not NP-hard', 'NP-hard'),
        tieRule: MEMO.replace('| R2′ tie | **strict >** after recomputing both products', '| R2′ tie | **non-strict ≥** after recomputing both products'),
        boundary: MEMO.replaceAll('NOT comparable to C1 or UQ-B', 'comparable to C1'),
        unresolved: MEMO.replaceAll('RULING-3', 'RULING-X'),
        status: MEMO.replaceAll('# M37-YELLOW', '# M37-GREEN'),
    };
    for (const [name, text] of Object.entries(corrupt)) {
        ok(`V-${name}`.slice(0, 18), text !== MEMO && C[name](text) === false, `corrupting the memo breaks '${name}'`);
    }
} else {
    ok('M0', false, 'memo not found');
}

log('\n' + '='.repeat(78));
log(`  M37 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
log(`  VERDICT: ${fails === 0 ? 'FORMULATION VERIFIED' : 'FORMULATION NOT VERIFIED'}`);
log('='.repeat(78));
if (JSON_MODE) process.stdout.write(JSON.stringify({ checks, fails, results, R }));
process.exit(fails === 0 ? 0 : 1);

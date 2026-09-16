// ==========================================================
// M35 — 100-NODE FUTURESCORE READINESS HARNESS  (READ-ONLY)
// ==========================================================
// MEASURES whether the existing planning / admission / oracle substrate is
// STRUCTURALLY DEFINED and COMPUTATIONALLY FEASIBLE at N = 100. It builds its own
// synthetic graphs and calls the repository's own planning functions on them.
//
// WHAT IT DOES NOT DO
//   No 100-node substrate is created. No configuration is generated (makeConfig is
//   never called, so experiments/m7/env.js records no evaluated seed). No seed is
//   consumed, no collection runs, no file outside experiments/m35/ is written, and no
//   production, C1, UQ-B or historical fixture is touched or modified.
//
// WHAT IT MAY CLAIM
//   Structure and cost only: "defined / undefined", "expansions", "elapsed ms",
//   "count exceeded cap". It makes NO scientific claim and sets NO threshold. A
//   measurement that exceeds a cap is reported as exceeded, never as a failure.
//
//   node experiments/m35/readiness.js [--json]
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const JSON_MODE = process.argv.includes('--json');
const log = (...a) => { if (!JSON_MODE) console.log(...a); };

const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
const planning = await import(pathToFileURL(path.join(ROOT, 'render/planning.js')).href);
const search = await import(pathToFileURL(path.join(ROOT, 'render/search.js')).href);
const embeddings = await import(pathToFileURL(path.join(ROOT, 'render/embeddings.js')).href);
const rng = await import(pathToFileURL(path.join(ROOT, 'instrumentation/rng.js')).href);
const typed = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);

const REAL_NODES = JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8'));
const REAL_EDGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));

// ---- graph helpers ---------------------------------------------------------------
const adjacency = (nodes, edges) => {
    const a = new Map(nodes.map(n => [n, []]));
    for (const e of edges) { a.get(e.from).push(e.to); a.get(e.to).push(e.from); }
    return a;
};
const bfs = (adj, src) => {
    const d = new Map([[src, 0]]), q = [src];
    while (q.length) { const u = q.shift(); for (const v of adj.get(u)) if (!d.has(v)) { d.set(v, d.get(u) + 1); q.push(v); } }
    return d;
};

/**
 * A synthetic connected graph of n nodes whose mean degree matches the real substrate.
 * Deterministic: seeded LCG, no repository RNG stream is touched.
 */
function syntheticGraph(n, meanDegree, seed) {
    let x = BigInt(seed);
    const next = () => { x = (x * 6364136223846793005n + 1442695040888963407n) % (2n ** 64n); return Number(x >> 33n) / 2 ** 31; };
    const nodes = Array.from({ length: n }, (_, i) => i + 1);
    const key = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    const seen = new Set(), edges = [];
    const add = (a, b) => { if (a !== b && !seen.has(key(a, b))) { seen.add(key(a, b)); edges.push({ from: a, to: b }); } };
    // spanning tree over indices 0..i-1 so EVERY node, including nodes[0], is connected.
    for (let i = 1; i < n; i++) add(nodes[i], nodes[Math.floor(next() * i)]);
    const target = Math.round(n * meanDegree / 2);
    let guard = 0;
    while (edges.length < target && guard++ < target * 100) {
        add(1 + Math.floor(next() * n), 1 + Math.floor(next() * n));
    }
    return { nodes, edges };
}

/**
 * All simple paths from every start to `goal`, exactly as env.js enumerates them, under a
 * DETERMINISTIC budget: the cap is a count of DFS expansions, not wall-clock time, so the
 * reported numbers are identical on every machine and every run. `ms` is reported for scale
 * but is never a stopping condition.
 */
function simplePathCensus(nodes, edges, goal, { stepCap = 20_000_000 } = {}) {
    const adj = adjacency(nodes, edges);
    const t0 = Date.now();
    let total = 0, steps = 0, exceeded = false;
    const startsWith2 = [];
    for (const s of nodes) {
        if (s === goal) continue;
        let count = 0;
        const seen = new Set();
        const dfs = (u) => {
            if (exceeded) return;
            if (++steps > stepCap) { exceeded = true; return; }
            if (u === goal) { count++; total++; return; }
            seen.add(u);
            for (const v of adj.get(u)) if (!seen.has(v)) dfs(v);
            seen.delete(u);
        };
        dfs(s);
        if (count >= 2) startsWith2.push(s);
        if (exceeded) break;
    }
    return { total, steps, exceeded, stepCap, ms: Date.now() - t0, startsWith2: startsWith2.length };
}

/** Distance profile and the share of (start, goal) pairs beyond a depth budget. */
function reachabilityProfile(nodes, edges, goals, depth) {
    const adj = adjacency(nodes, edges);
    let pairs = 0, beyond = 0, sum = 0, max = 0, unreachable = 0;
    for (const g of goals) {
        const d = bfs(adj, g);
        for (const s of nodes) {
            if (s === g) continue;
            pairs++;
            if (!d.has(s)) { unreachable++; beyond++; continue; }
            const dist = d.get(s);
            sum += dist; max = Math.max(max, dist);
            if (dist > depth) beyond++;
        }
    }
    return { pairs, beyond, beyondPct: 100 * beyond / pairs, meanDist: sum / (pairs - unreachable),
             maxDist: max, unreachable };
}

/** Install a synthetic graph into the repository's own node map, exactly as a probe would. */
function installGraph(nodes, edges, threeIdBase) {
    const adj = adjacency(nodes, edges);
    const map = new Map();
    for (const id of nodes) {
        map.set(id, { id: threeIdBase + id,                       // a THREE.Object3D-style counter id
                      userData: { id, label: `n${id}`, neighbors: adj.get(id).slice(),
                                  embedding: embeddings.createEmbedding() } });
    }
    search.setNeuronMap(map);
    embeddings.setEmbeddingNeuronMap(map);
    return map;
}

/** futureScore cost: count the node lookups its DFS performs, by wrapping the map. */
function futureScoreProbe(map, nodes, edges, goal, depth) {
    const rewards = new Map(), penalties = new Map(), curiosity = new Map();
    for (const e of edges) { rewards.set(`${e.from}->${e.to}`, 8); rewards.set(`${e.to}->${e.from}`, 8); }
    let lookups = 0;
    const counting = new Map();
    for (const [k, v] of map) counting.set(k, v);
    const wrapped = { get: (k) => { lookups++; return counting.get(Number(k)); }, size: counting.size,
                      values: () => counting.values(), entries: () => counting.entries(),
                      [Symbol.iterator]: () => counting[Symbol.iterator]() };
    search.setNeuronMap(wrapped);
    const t0 = Date.now();
    let nonZeroAsCalled = 0, nonZeroWithDataId = 0, sample = null;
    for (const id of nodes) {
        const neuron = counting.get(id);
        const asCalled = planning.futureScore(neuron, goal, rewards, penalties, curiosity, depth);
        const corrected = planning.futureScore({ ...neuron, id: neuron.userData.id }, goal, rewards, penalties, curiosity, depth);
        if (asCalled !== 0) nonZeroAsCalled++;
        if (corrected !== 0) nonZeroWithDataId++;
        if (sample === null) sample = { asCalled, corrected };
    }
    const ms = Date.now() - t0;
    search.setNeuronMap(counting);
    return { nodes: nodes.length, depth, lookups, ms, nonZeroAsCalled, nonZeroWithDataId, sample };
}

// ---- the report ------------------------------------------------------------------
const R = { measurements: {}, scans: {}, integrity: {} };
log('='.repeat(78));
log('  M35 — 100-node FutureScore readiness (READ-ONLY measurements, no claims)');
log('='.repeat(78));

// 1. the real substrate, for reference
{
    const nodes = REAL_NODES.map(n => n.id);
    const adj = adjacency(nodes, REAL_EDGES);
    const deg = nodes.map(n => adj.get(n).length);
    const ecc = nodes.map(n => Math.max(...bfs(adj, n).values()));
    R.measurements.realGraph = {
        nodes: nodes.length, edges: REAL_EDGES.length,
        meanDegree: +(deg.reduce((a, b) => a + b, 0) / deg.length).toFixed(2),
        minDegree: Math.min(...deg), maxDegree: Math.max(...deg), diameter: Math.max(...ecc),
        goals: env.GOALS, decisionStatesPerGoal: env.GOALS.map(g => env.decisionStates(g).length),
    };
    log(`\n-- the substrate as it is ----------------------------------------------------`);
    log(`  ${nodes.length} nodes, ${REAL_EDGES.length} edges, mean degree ` +
        `${R.measurements.realGraph.meanDegree}, diameter ${R.measurements.realGraph.diameter}`);
    log(`  goals ${JSON.stringify(env.GOALS)}; decision states per goal ` +
        `${JSON.stringify(R.measurements.realGraph.decisionStatesPerGoal)} ` +
        `— "19" is the DECISION-STATE count, not the node count`);
}

// 2. simple-path enumeration: the acceptance predicates R1/R2 and exhaustiveMinCost
log(`\n-- simple-path enumeration (env.js R1/R2 and exhaustiveMinCost) ---------------`);
R.measurements.simplePaths = [];
{
    const realCensus = simplePathCensus(REAL_NODES.map(n => n.id), REAL_EDGES, env.GOALS[0]);
    R.measurements.simplePaths.push({ n: 20, kind: 'real substrate', goal: env.GOALS[0], ...realCensus });
    log(`  N=20   real graph, goal ${env.GOALS[0]}: ${realCensus.total} simple paths, ` +
        `${realCensus.steps} expansions, ${realCensus.ms} ms`);
    for (const n of [20, 30, 40, 50, 60, 100]) {
        const g = syntheticGraph(n, R.measurements.realGraph.meanDegree, 12345 + n);
        const c = simplePathCensus(g.nodes, g.edges, g.nodes[0]);
        R.measurements.simplePaths.push({ n, kind: 'synthetic', goal: g.nodes[0], ...c });
        log(`  N=${String(n).padEnd(4)} synthetic: ` +
            (c.exceeded ? `${c.total} paths found before the ${c.stepCap} expansion cap (UNFINISHED, ${c.ms} ms)`
                        : `${c.total} simple paths, ${c.steps} expansions, ${c.ms} ms`));
    }
}

// 3. reachability budget: canReachGoal(maxDepth = 4)
log(`\n-- admission reachability, canReachGoal budget maxDepth = 4 -------------------`);
R.measurements.reachability = [];
{
    const real = reachabilityProfile(REAL_NODES.map(n => n.id), REAL_EDGES, env.GOALS, 4);
    R.measurements.reachability.push({ n: 20, kind: 'real substrate', ...real });
    log(`  N=20   real graph: mean distance ${real.meanDist.toFixed(2)}, max ${real.maxDist}, ` +
        `${real.beyond}/${real.pairs} pairs (${real.beyondPct.toFixed(1)}%) beyond depth 4`);
    for (const n of [50, 100, 200]) {
        const g = syntheticGraph(n, R.measurements.realGraph.meanDegree, 999 + n);
        const goals = g.nodes.slice(0, 4);
        const prof = reachabilityProfile(g.nodes, g.edges, goals, 4);
        R.measurements.reachability.push({ n, kind: 'synthetic', ...prof });
        log(`  N=${String(n).padEnd(4)} synthetic: mean distance ${prof.meanDist.toFixed(2)}, ` +
            `max ${prof.maxDist}, ${prof.beyond}/${prof.pairs} pairs (${prof.beyondPct.toFixed(1)}%) ` +
            `beyond depth 4`);
    }
}

// 4. futureScore itself
log(`\n-- futureScore: structurally defined at N=100? --------------------------------`);
R.measurements.futureScore = [];
for (const n of [20, 50, 100]) {
    const g = syntheticGraph(n, R.measurements.realGraph.meanDegree, 4242 + n);
    const map = installGraph(g.nodes, g.edges, 1000);
    const probe = futureScoreProbe(map, g.nodes, g.edges, g.nodes[0], 3);
    R.measurements.futureScore.push({ n, ...probe });
    log(`  N=${String(n).padEnd(4)} depth 3: ${probe.lookups} node lookups, ${probe.ms} ms; ` +
        `non-zero as main.js calls it ${probe.nonZeroAsCalled}/${n}, ` +
        `with userData.id ${probe.nonZeroWithDataId}/${n}`);
}
{
    const g = syntheticGraph(100, R.measurements.realGraph.meanDegree, 777);
    const map = installGraph(g.nodes, g.edges, 1000);
    for (const d of [3, 4, 5]) {
        const probe = futureScoreProbe(map, g.nodes, g.edges, g.nodes[0], d);
        R.measurements.futureScore.push({ n: 100, ...probe });
        log(`  N=100 depth ${d}: ${probe.lookups} node lookups, ${probe.ms} ms`);
    }
}

// 5. static scan: constants that are sized to the current substrate
log(`\n-- constants sized to the current substrate ------------------------------------`);
{
    const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const envSrc = read('experiments/m7/env.js');
    const findings = [];
    const note = (where, what, why) => { findings.push({ where, what, why }); log(`  ${where}: ${what}`); };
    if (/readFileSync\(path\.join\(ROOT, 'connections\.json'\)/.test(envSrc))
        note('experiments/m7/env.js', 'graph is read from neurons.json + connections.json at import',
             'the module has exactly one graph; a second topology cannot coexist without a change');
    note('experiments/m7/env.js', `N_UNRELIABLE = ${env.N_UNRELIABLE} = floor(0.35 x ${REAL_EDGES.length} edges)`,
         'an absolute count derived from the 39-edge substrate, not a fraction computed per graph');
    note('experiments/m7/env.js', `GOALS = ${JSON.stringify(env.GOALS)} (${env.GOALS.length} node ids)`,
         'fixed node ids; meaningless on another topology');
    for (const f of ['experiments/c1/protocol.js', 'experiments/uqb/protocol.js']) {
        const m = read(f).match(/decisionStates:\s*(\d+)/);
        if (m) note(f, `FROZEN.decisionStates = ${m[1]}`, 'frozen protocol constant of a closed study');
    }
    const gd = read('experiments/uqb/protocol.js').match(/GOAL_DEGREE = Object\.freeze\((\{[^}]*\})\)/);
    if (gd) note('experiments/uqb/protocol.js', `GOAL_DEGREE = ${gd[1]}`, 'per-goal degrees of this topology');
    const cr = read('main.js').match(/function canReachGoal\(startId, goalId, maxDepth = (\d+)\)/);
    if (cr) note('main.js', `canReachGoal maxDepth default = ${cr[1]}`,
                 'a fixed hop budget; its admission meaning changes with graph diameter');
    note('render/planning.js', 'futureScore dfs starts from neuron.id (D2), depth default 3',
         'identity defect independent of N');
    R.scans.constants = findings;
}

// 6. isolation and integrity
log(`\n-- isolation and integrity -----------------------------------------------------`);
{
    const evaluated = env.evaluatedSeeds();
    const free = [];
    for (const [lo, hi] of [[0, 894999], [895000, 895999], [896000, 899999], [900000, 900499], [900500, 900599]]) {
        const consumed = typed.config.isConsumed(typed.configSeed(lo));
        const held = typed.config.isHeldOut(typed.configSeed(lo));
        free.push({ lo, hi, consumed, held });
    }
    R.integrity = {
        evaluatedSeedsDuringAudit: evaluated.length,
        typedRefuses895500: typed.config.isConsumed(typed.configSeed(895500)),
        territory: free,
        rngStreamsTouched: false,
    };
    log(`  configurations generated by this audit: ${evaluated.length} (makeConfig is never called)`);
    log(`  typed layer still refuses 895500: ${R.integrity.typedRefuses895500}`);
    log(`  territory: ${free.map(f => `${f.lo}-${f.hi}${f.consumed ? ' consumed' : f.held ? ' held-out' : ' FREE'}`).join(' | ')}`);
}

if (JSON_MODE) process.stdout.write(JSON.stringify(R));
else {
    log('\n' + '='.repeat(78));
    log('  M35 readiness measurements complete — structure and cost only, no claims made');
    log('='.repeat(78));
}

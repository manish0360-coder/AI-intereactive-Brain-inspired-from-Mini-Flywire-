// ==========================================================
// M38-P0 GATE — minimal development-graph design (FORMULATION ONLY)
// ==========================================================
// Checks the proposed 5-module replica rule ANALYTICALLY. No 100-node graph is
// built: every property is derived from the frozen 20-node base graph
// (neurons.json + connections.json) and the rule's definition. No RNG, no seed,
// no configuration, no change to any file outside the two M38-P0 files.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEMO_PATH = path.join(ROOT, 'research/preregistrations/M38_P0_DEVELOPMENT_GRAPH_DESIGN.md');
const BASE = '9f0746423d8ef6997c5dcc183e69446f65d0ac4f';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let checks = 0, fails = 0;
const ok = (id, cond, msg) => {
    checks++; if (!cond) fails++;
    console.log(`   [${cond ? 'PASS' : 'FAIL'}] ${id.padEnd(5)} ${msg}`);
    return cond;
};

// ---- the frozen base graph --------------------------------------------------------------
const NODES = JSON.parse(read('neurons.json'));
const EDGES = JSON.parse(read('connections.json'));
const ids = NODES.map(n => Number(n.id));
const adj = new Map(ids.map(i => [i, []]));
for (const e of EDGES) { adj.get(Number(e.from)).push(Number(e.to)); adj.get(Number(e.to)).push(Number(e.from)); }
const bfs = (s) => { const d = new Map([[s, 0]]), q = [s]; while (q.length) { const u = q.shift(); for (const v of adj.get(u)) if (!d.has(v)) { d.set(v, d.get(u) + 1); q.push(v); } } return d; };
const D = new Map(ids.map(i => [i, bfs(i)]));
const ecc = (i) => Math.max(...D.get(i).values());

// ---- the rule, as parameters (values stated in the memo) ------------------------------------
const MODULES = 5;
const PORTS = [8, 19];                 // base ids wired between every pair of modules
const GOALS = [[0, 8], [1, 19], [2, 8], [3, 19]];   // (module, base id), GOALS[configIndex mod 4]

/**
 * Exact hop distance in the replica graph, from base distances only.
 * Same module: the base distance (a detour through another module costs >= 2 extra hops
 * and re-enters at a port, so it is never shorter than the base route).
 * Different modules: min over ports P of d(x,P) + 1 + d(P,y) — one inter-module edge
 * suffices, because a second one adds a hop and returns to the same port identity.
 */
function replicaDistance(mx, x, my, y, ports) {
    if (mx === my) {
        let best = D.get(x).get(y);
        for (const P of ports) for (const Q of ports) {
            // leave via P, re-enter via Q through another module: P->P' (1) ... needs P' to Q' inside
            // another module then back (1): d(x,P) + 1 + d(P,Q) + 1 + d(Q,y)
            best = Math.min(best, D.get(x).get(P) + 2 + D.get(P).get(Q) + D.get(Q).get(y));
        }
        return best;
    }
    return Math.min(...ports.map(P => D.get(x).get(P) + 1 + D.get(P).get(y)));
}
const replicaEcc = (m, g, ports) => {
    let worst = 0;
    for (let mx = 0; mx < MODULES; mx++) for (const x of ids) {
        if (mx === m && x === g) continue;
        worst = Math.max(worst, replicaDistance(mx, x, m, g, ports));
    }
    return worst;
};

// articulation points of the base graph (Tarjan)
function articulationPoints() {
    const disc = new Map(), low = new Map(), ap = new Set(); let t = 0;
    const dfs = (u, parent) => {
        disc.set(u, ++t); low.set(u, t); let children = 0;
        for (const v of adj.get(u)) {
            if (!disc.has(v)) { children++; dfs(v, u); low.set(u, Math.min(low.get(u), low.get(v)));
                if (parent !== null && low.get(v) >= disc.get(u)) ap.add(u); }
            else if (v !== parent) low.set(u, Math.min(low.get(u), disc.get(v)));
        }
        if (parent === null && children > 1) ap.add(u);
    };
    dfs(ids[0], null);
    return { ap, connected: disc.size === ids.length };
}

console.log('='.repeat(78)); console.log('  M38-P0 DESIGN GATE (analytic, no graph generated)'); console.log('='.repeat(78));

// ---- S: source facts the design rests on -------------------------------------------------------
console.log('\n-- S   source facts ---------------------------------------------------------------');
const mainSrc = read('main.js');
const cr = mainSrc.match(/function canReachGoal\(startId, goalId, maxDepth = (\d+)\)[\s\S]*?function dfs\(currentId, depth\) \{([\s\S]*?)if \(currentId === goalId\) return true;/);
ok('S1', cr && cr[1] === '4' && /if \(depth === 0\) return false;/.test(cr[2]),
    'main.js canReachGoal: maxDepth 4, and depth 0 returns false BEFORE the goal test — a candidate is admissible iff it is within 3 hops of the goal');
ok('S2', /if \(choices\.length === 0\) return;/.test(mainSrc) && (mainSrc.match(/!canReachGoal\(k, goalNeuronId\)/g) || []).length === 2,
    'both candidate paths apply the guard, and an empty pool returns from runPrediction — a node more than 4 hops from the goal has no admissible move');
const pairs = new Set(EDGES.map(e => Number(e.from) < Number(e.to) ? `${e.from}|${e.to}` : `${e.to}|${e.from}`));
ok('S3', ids.length === 20 && EDGES.length === 39 && pairs.size === 39 && EDGES.every(e => Number(e.from) !== Number(e.to)),
    'base graph: 20 nodes, 39 undirected edges, no duplicate pair, no self-loop');
const { ap, connected } = articulationPoints();
ok('S4', connected && ap.size === 0, 'base graph is connected and 2-connected (no articulation point)');
ok('S5', Math.min(...ids.map(ecc)) === 3 && Math.max(...ids.map(ecc)) === 4 && [8, 12, 16, 19].every(g => ecc(g) <= 4),
    'base radius 3, diameter 4; every historical goal {8,12,16,19} has eccentricity <= 4 (no dead state for the frozen agent)');
ok('S6', ecc(8) === 3 && ecc(19) === 3 && ecc(12) === 4 && ecc(16) === 4,
    'historical goal eccentricities: 8 and 19 are 3; 12 and 16 are 4');

// ---- R: the replica rule ------------------------------------------------------------------------
console.log('\n-- R   the 5-module replica rule ----------------------------------------------------');
const nNodes = MODULES * ids.length;
const nEdges = MODULES * EDGES.length + PORTS.length * (MODULES * (MODULES - 1) / 2);
ok('R1', nNodes === 100 && nEdges === 215, `node count ${nNodes}; edge count 5 x 39 + 2 x C(5,2) = ${nEdges}`);
ok('R2', PORTS.every(P => ids.includes(P)) && new Set(PORTS).size === PORTS.length,
    'ports are two distinct base ids, so inter-module edges never duplicate an intra-module edge or each other');
const goalEcc = GOALS.map(([m, g]) => replicaEcc(m, g, PORTS));
ok('R3', goalEcc.every(e => e <= 4),
    `every goal has eccentricity <= 4 in the replica: ${JSON.stringify(goalEcc)} — no dead state for the frozen agent`);
const qualifying = ids.filter(g => replicaEcc(0, g, PORTS) <= 4);
ok('R4', JSON.stringify(qualifying) === JSON.stringify([8, 17, 19]),
    `under this wiring exactly base ids ${JSON.stringify(qualifying)} qualify as goals (17 is adjacent to both ports); 12 and 16 cannot (${replicaEcc(0, 12, PORTS)}, ${replicaEcc(0, 16, PORTS)})`);
ok('R5', ids.filter(g => ecc(g) === 4).every(g => replicaEcc(0, g, ids) >= 5),
    'NO wiring of base-distance-preserving modules rescues an eccentricity-4 node: even with EVERY node as a port its eccentricity is >= 5');
const degree = (m, i) => adj.get(i).length + (PORTS.includes(i) ? MODULES - 1 : 0);
ok('R6', degree(0, 8) === 9 && degree(0, 19) === 7 && Math.min(...ids.map(i => degree(0, i))) === 3 &&
    (MODULES * ids.reduce((a, i) => a + degree(0, i), 0)) / nNodes === 2 * nEdges / nNodes,
    `goal degrees 9 (base 8) and 7 (base 19); minimum degree stays 3; mean degree ${(2 * nEdges / nNodes).toFixed(2)}`);
ok('R7', (() => { // any node to any node across modules is within 7 hops
    let worst = 0;
    for (const x of ids) for (const y of ids) worst = Math.max(worst, replicaDistance(0, x, 1, y, PORTS));
    return worst === 6;
})(), 'the largest cross-module distance is 6 — only goals, not every node, need eccentricity <= 4');

// ---- V: anti-vacuity -----------------------------------------------------------------------------
console.log('\n-- V   anti-vacuity ----------------------------------------------------------------');
ok('V1', GOALS.map(([m, g]) => replicaEcc(m, g, [6, 17])).some(e => e > 4),
    'with ports {6,17} (the highest-degree centres) the same goals would have dead states — R3 discriminates');
ok('V2', replicaEcc(0, 12, PORTS) > 4, 'keeping historical goal 12 would create dead states — R4 discriminates');

// ---- I: integrity ------------------------------------------------------------------------------------
console.log('\n-- I   integrity -------------------------------------------------------------------');
const env = await import(pathToFileURL(path.join(ROOT, 'experiments/m7/env.js')).href);
const typed = await import(pathToFileURL(path.join(ROOT, 'experiments/registry/typed.js')).href);
const allowed = ['research/preregistrations/M38_P0_DEVELOPMENT_GRAPH_DESIGN.md', 'research/preregistrations/verify_m38_p0.js'];
const changed = git('diff', '--name-only', BASE).split(/\r?\n/).filter(Boolean);
const protectedFiles = ['experiments/m7/env.js', 'experiments/c1/protocol.js', 'experiments/uqb/protocol.js', 'main.js',
    'render/planning.js', 'instrumentation/rng.js', 'neurons.json', 'connections.json',
    'experiments/registry/typed.js', 'experiments/registry/consumed_after_c1.js',
    'research/preregistrations/M37_SCALABLE_ACCEPTANCE_FORMULATION.md'];
ok('I1', changed.every(f => allowed.includes(f)), `since ${BASE.slice(0, 7)} only M38-P0 files changed: ${JSON.stringify(changed)}`);
ok('I2', protectedFiles.every(f => git('rev-parse', `${BASE}:${f}`).trim() === git('hash-object', path.join(ROOT, f)).trim()),
    `${protectedFiles.length} frozen, production, registry and M37 files byte-identical`);
ok('I3', env.evaluatedSeeds().length === 0 && typed.config.isConsumed(typed.configSeed(895500)),
    'no configuration generated; 895000-895999 still consumed');
ok('I4', !fs.existsSync(path.join(ROOT, 'experiments/m38')), 'no implementation directory: formulation only');

// ---- M: memo -------------------------------------------------------------------------------------------
console.log('\n-- M   memo bound to the analysis ----------------------------------------------------');
const MEMO = fs.existsSync(MEMO_PATH) ? read('research/preregistrations/M38_P0_DEVELOPMENT_GRAPH_DESIGN.md') : '';
const flat = (t) => t.replace(/^[ \t]*>[ \t]?/gm, ' ').replace(/\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
const C = {
    rule: (M) => flat(M).includes('id(m, v) = 20·m + v') && flat(M).includes('ports P = {8, 19}') && nEdges === 215 && flat(M).includes('215 edges'),
    goals: (M) => flat(M).includes('GOALS = [(0, 8), (1, 19), (2, 8), (3, 19)]') && goalEcc.every(e => e <= 4),
    deadState: (M) => flat(M).includes('within 3 hops of the goal') && flat(M).includes('dead state'),
    forced: (M) => flat(M).includes('12 and 16 cannot be goals in any base-distance-preserving replica') &&
        flat(M).includes('exactly {8, 17, 19} qualify') && JSON.stringify(qualifying) === '[8,17,19]',
    noRng: (M) => flat(M).includes('uses no random number generator and no seed'),
    devOnly: (M) => flat(M).includes('DEVELOPMENT substrate only') && flat(M).includes('not C1, not UQ-B'),
    ruling: (M) => flat(M).includes('RULING-1') && flat(M).includes('No new ruling is required'),
    claims: (M) => !/validated|scales to (a )?million|proves FutureScore|demonstrates cognition/i.test(flat(M)),
    status: (M) => (M.match(/^> # M38-P0-(GREEN|YELLOW|HOLD)/gm) || []).length === 2 &&
        (M.match(/^> # M38-P0-(GREEN|YELLOW|HOLD)/gm) || []).every(b => b.includes('GREEN')),
};
if (MEMO) {
    for (const [k, fn] of Object.entries(C)) ok(`M-${k}`.slice(0, 12), fn(MEMO), `memo ${k} matches the analysis`);
    const corrupt = {
        rule: MEMO.replaceAll('ports P = {8, 19}', 'ports P = {6, 17}'),
        goals: MEMO.replaceAll('GOALS = [(0, 8), (1, 19), (2, 8), (3, 19)]', 'GOALS = [(0, 8), (1, 12), (2, 16), (3, 19)]'),
        deadState: MEMO.replaceAll('within 3 hops of the goal', 'within 4 hops of the goal'),
        forced: MEMO.replaceAll('12 and 16 cannot be goals', '12 and 16 can be goals'),
        noRng: MEMO.replaceAll('uses no random number generator and no seed', 'uses a seeded generator'),
        devOnly: MEMO.replaceAll('not C1, not UQ-B', 'a C1 extension'),
        ruling: MEMO.replaceAll('No new ruling is required', 'A new ruling is required'),
        claims: MEMO + '\nThis design scales to a million nodes.',
        status: MEMO.replaceAll('# M38-P0-GREEN', '# M38-P0-HOLD'),
    };
    for (const [k, t] of Object.entries(corrupt)) ok(`X-${k}`.slice(0, 12), t !== MEMO && C[k](t) === false, `corrupting the memo breaks '${k}'`);
} else ok('M0', false, 'memo not found');

console.log('\n' + '='.repeat(78));
console.log(`  M38-P0 GATE: ${checks - fails}/${checks} passed, ${fails} FAILED`);
console.log(`  VERDICT: ${fails === 0 ? 'DESIGN VERIFIED' : 'DESIGN NOT VERIFIED'}`);
console.log('='.repeat(78));
process.exit(fails === 0 ? 0 : 1);

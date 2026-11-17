// ==========================================================
// M11 — controlled route changes on the MiniFlyWire graph: configuration, arms, one run, analysis, reading rule
// ==========================================================
// Everything the experiment uses already exists and is used unchanged:
//   - the world is the app's own graph, connections.json, built by cognitive/testbed/worlds.mjs mfwWorld (20 nodes,
//     39 edges, behind the testbed's hidden relabelling);
//   - the environment is GraphEnv, whose runner-only block/unblock make a move fail and leave the agent in place;
//   - the change schedule is task E5 (cognitive/testbed/task_e5.mjs). It blocks an edge on the current shortest route
//     six times a run, and reopens each after 10 episodes with probability 0.1 (RARE), 0.5 (HALF) or 0.9 (OFTEN);
//   - the agents are the AD-13 adopted agent (makeAdoptedAgent) and the registry's MBVI3.
// New here: the passive recorder (trace.mjs), the analysis below and the reading rule fixed in SPEC.md.
// Nothing in the browser application (main.js, render/, index.html) is read, imported or changed.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mfwWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE5, planE5, E5_FAMILIES, E5_PARAMS } from '../../cognitive/testbed/task_e5.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../../cognitive/testbed/adopted_agent.mjs';
import { makeAgentForV6 } from '../../cognitive/testbed/registry_v6.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { traced } from './trace.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GRAPH_LABEL = 'mfw|m11|graph';
export const N_LABELS = 135;
export const LABEL_OF = Object.freeze({ m11: (i) => `mfw|m11|${i}`, dev: (i) => `mfw|m11dev|${i}` });
export const FAMILIES = Object.freeze(['RARE', 'HALF', 'OFTEN']);
export const TRACE_LABELS = Object.freeze([0, 1, 2]);
export const MARGIN = 25;                                    // D2: the same 25-step margin as CF-06 B2

/** The two arms, built exactly as the registry builds them. BELIEF is the AD-13 adopted agent. */
export const ARMS = Object.freeze({
  BELIEF: Object.freeze({ kind: ADOPTED_AGENT.kind, make: (env, label) => makeAdoptedAgent(env, label) }),
  MBVI3: Object.freeze({ kind: 'MBVI3', make: (env, label) => makeAgentForV6('MBVI3', env, label, {}) }),
});

export const appGraph = () => mfwWorld(path.join(ROOT, 'connections.json'), GRAPH_LABEL);

/** Internal node index -> the app's neuron id and label (mfwWorld numbers the sorted endpoint ids 0..n-1). */
export function nodeTable() {
  const conn = JSON.parse(fs.readFileSync(path.join(ROOT, 'connections.json'), 'utf8'));
  const neurons = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'neurons.json'), 'utf8')).map((x) => [x.id, x.label]));
  const ids = [...new Set(conn.flatMap((e) => [e.from, e.to]))].sort((a, b) => a - b);
  return ids.map((id, u) => ({ u, id, label: neurons.get(id) ?? null }));
}

/** One E5 run of one arm. With withTrace, the agent is wrapped by the passive recorder. */
export function runOne(world, worldLabel, family, arm, withTrace) {
  let rec = null;
  const makeAgent = (_kind, env, label, _params, context) => {
    const agent = ARMS[arm].make(env, label);
    if (!withTrace) return agent;
    rec = traced(agent, context);
    return rec.agent;
  };
  const row = runE5({ world, worldLabel, family, kind: ARMS[arm].kind, makeAgent });
  return { row: { arm, ...row }, record: rec ? rec.record() : null };
}

/** A recorder's output with every exit written as an edge of the app graph (neuron ids and labels). */
export function readableTrace(world, nodes, record, row, worldLabel, family) {
  const edgeOf = (label, a) => { const u = world.nodeOfLabel.get(label), v = world.exitOrder[u][a]; return [nodes[u].id, nodes[v].id]; };
  const plan = planE5(world, worldLabel, family);
  const log = row.secondary?.volatility?.log ?? null;
  return {
    world: worldLabel, family, arm: row.arm, start: nodes[plan.start].id, goal: nodes[plan.goal].id,
    schedule: plan.events.map((e) => (e.skipped ? { skipped: true } : { edge: [nodes[e.edge[0]].id, nodes[e.edge[1]].id], reverses: e.reverses })),
    stepColumns: ['t', 'from', 'to', 'moved', 'blocked', 'pWorks'],
    steps: record.steps.map(([t, s, a, m, b, p]) => [t, ...edgeOf(s, a), m, b, p]),
    followedColumns: ['t', 'pWorks', 'blocked', 'tried'],
    followed: record.followed.map((f) => { const [from, to] = edgeOf(f.node, f.action); return { from, to, fromLabel: nodes.find((x) => x.id === from).label, toLabel: nodes.find((x) => x.id === to).label, points: f.points }; }),
    beliefEvents: log ? log.map(([type, label, a, t, rho]) => ({ type, t, edge: edgeOf(label, a), rho })) : null,
  };
}

// ---- analysis ----
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/** Per-run measures, from the E5 row alone. */
export const MEASURES = Object.freeze({
  total: (r) => r.metric,                                                   // steps over the change phase
  blocked: (r) => r.windows.blocked,                                        // steps while a route is blocked
  afterReversed: (r) => r.windows.afterReversed,                            // steps in the 10 episodes after a reopening
  afterPermanent: (r) => r.windows.afterPermanent,                          // steps after a block that stays
  crossings: (r) => r.events.reduce((s, e) => s + (e.skipped ? 0 : (e.crossed ?? 0)), 0),   // crossings of reopened edges
  futileRetests: (r) => r.diagnostics.futileRetests,                        // tries of edges that never reopen
  censored: (r) => r.censored,                                              // capped episodes
});

// Contrast direction: steps as MBVI3 - BELIEF (positive = the belief takes fewer); cost as BELIEF - MBVI3 on the
// total (CF-06 B2); behaviour counts as BELIEF - MBVI3 (positive = the belief does it more).
const CONTRASTS = Object.freeze([
  ['total', 'MBVI3 - BELIEF', 'total', -1], ['cost', 'BELIEF - MBVI3', 'total', 1],
  ['blocked', 'MBVI3 - BELIEF', 'blocked', -1], ['afterReversed', 'MBVI3 - BELIEF', 'afterReversed', -1],
  ['afterPermanent', 'MBVI3 - BELIEF', 'afterPermanent', -1],
  ['crossings', 'BELIEF - MBVI3', 'crossings', 1], ['futileRetests', 'BELIEF - MBVI3', 'futileRetests', 1],
]);

export function analyse(rows, domain) {
  const cell = (family, arm) => new Map(rows.filter((r) => r.family === family && r.arm === arm && !r.excluded).map((r) => [r.world, r]));
  const out = { excludedRuns: rows.filter((r) => r.excluded && r.arm === 'BELIEF').length, families: {} };   // label x family
  for (const family of FAMILIES) {
    const B = cell(family, 'BELIEF'), M = cell(family, 'MBVI3');
    const labels = [...B.keys()].filter((w) => M.has(w)).sort();
    const arms = {};
    for (const [arm, c] of [['BELIEF', B], ['MBVI3', M]]) {
      arms[arm] = Object.fromEntries(Object.entries(MEASURES).map(([k, f]) => [k, mean(labels.map((w) => f(c.get(w))))]));
      arms[arm].skippedEvents = labels.reduce((s, w) => s + c.get(w).skippedEvents, 0);
    }
    const contrasts = {};
    for (const [name, text, measure, sign] of CONTRASTS) {
      const f = MEASURES[measure];
      const d = labels.map((w) => sign * (f(B.get(w)) - f(M.get(w))));
      contrasts[name] = {
        contrast: `${text}, ${measure} (${family})`, sd: sd(d), median: median(d),
        positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length,
        mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null,
        ...pairedBootstrap(d, `mfw|stats|${domain}|m11|${family}|${name}`),
      };
    }
    const alarms = labels.map((w) => B.get(w).diagnostics.alarms);
    const belief = Object.fromEntries(['opensReal', 'opensRealReversing', 'opensRealPermanent', 'opensFalse', 'confirmsReal', 'confirmsFalse']
      .map((k) => [k, mean(alarms.map((a) => (a ? a[k] : 0)))]));
    out.families[family] = { labels: labels.length, arms, contrasts, beliefArchivesPerRun: belief };
  }
  return out;
}

// ---- reading rule (SPEC.md, "Reading rule"); an empty contrast never passes ----
const lbPos = (c) => !!c && c.n > 0 && c.mean > 0 && c.lo > 0;
const ubBelow = (c, x) => !!c && c.n > 0 && c.hi < x;

export function readingRule(analysis) {
  const f = analysis.families;
  const checks = {
    D1_recovery: lbPos(f.OFTEN?.contrasts.afterReversed),          // OFTEN: fewer steps after a reopening than MBVI3
    D2_cost: ubBelow(f.RARE?.contrasts.cost, MARGIN),               // RARE: extra steps stay under the margin
    D3_mechanism: lbPos(f.OFTEN?.contrasts.crossings),              // OFTEN: crosses reopened edges more than MBVI3
  };
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  return { ...checks, reading: failed.length ? `NOT DEMONSTRATED (${failed.join(', ')})` : 'DEMONSTRATED ON THE MINIFLYWIRE GRAPH' };
}

export { E5_FAMILIES, E5_PARAMS };

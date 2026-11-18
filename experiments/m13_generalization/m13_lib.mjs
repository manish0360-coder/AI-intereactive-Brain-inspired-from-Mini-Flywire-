// ==========================================================
// M13 — cognitive generalization: configuration, arms, one run, analysis and reading rule
// ==========================================================
// The question: does the adopted AD-13 belief keep its advantage over MBVI3 in a held-out family of worlds that is
// structurally different from the one it was developed on, with nothing tuned? Everything the agents and the task use
// already exists and is used unchanged:
//   - task E5 (cognitive/testbed/task_e5.mjs) with its frozen parameters;
//   - BELIEF = makeAdoptedAgent (AD-13); MBVI3 = the registry's MBVI3; BELIEF_REALONLY / BELIEF_FALSEONLY = CF-06's
//     privileged diagnostic arms (arms_v6.mjs), secondary and in no criterion.
// New here: the modular-ring worlds (worlds_modular.mjs), the structural record (structure.mjs), the behaviour
// measures for every arm (measures.mjs), and the analysis and reading rule below (SPEC.md).
// Nothing in the browser application (main.js, render/, index.html) is read, imported or changed.
// ==========================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE5, planE5, E5_FAMILIES, E5_PARAMS } from '../../cognitive/testbed/task_e5.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../../cognitive/testbed/adopted_agent.mjs';
import { makeAgentForV6 } from '../../cognitive/testbed/registry_v6.mjs';
import { armAgentV6 } from '../../cognitive/testbed/arms_v6.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { traced } from '../m11_routes/trace.mjs';
import { buildWorld, BANK_LABEL } from './worlds_modular.mjs';
import { returnMeasures, verifyAgainstRow } from './measures.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const N_LABELS = 165;
export const FAMILIES = Object.freeze(['RARE', 'HALF', 'OFTEN']);
export const TRACE_LABELS = Object.freeze([0, 1, 2]);
export const MARGIN = 25;                                      // G2: CF-06's B2 margin, unchanged
export const REFERENCE_EFFECTS = Object.freeze({ CF06_gate6: 0.444, M11_app_graph: 0.498 });   // G1's unit, mean / SD (proposal_inputs/power_inputs.out)
export const LABEL_OF = Object.freeze({ m13: BANK_LABEL, smoke: (i) => `m13smoke|dev|${i}` });
// Label namespaces already used by any earlier stage, test, survey or smoke run; no M13 world label may start with one.
export const BARRED_PREFIXES = Object.freeze(['cf|', 'mfw|', 'm13survey|', 'm13test|', 'm13smoke|', 'm13|structure|']);

export function assertFreshLabels(labels) {
  for (const l of labels) {
    if (!l.startsWith('m13|modular|')) throw new Error(`label ${l} is not in the M13 namespace m13|modular|*`);
    if (BARRED_PREFIXES.some((p) => l.startsWith(p))) throw new Error(`label ${l} is in a namespace already used`);
  }
  if (new Set(labels).size !== labels.length) throw new Error('duplicate labels');
  return true;
}

/** The arms. BELIEF and the two diagnostic arms carry exactly the adopted agent's parameters. */
const beliefDiagnostic = (diagnostic) => (env, label, context) => armAgentV6([ADOPTED_AGENT.kind, { ...ADOPTED_AGENT.params }, { diagnostic }])(ADOPTED_AGENT.kind, env, label, {}, context);
export const ARMS = Object.freeze({
  BELIEF: Object.freeze({ kind: ADOPTED_AGENT.kind, role: 'primary (AD-13)', make: (env, label) => makeAdoptedAgent(env, label) }),
  MBVI3: Object.freeze({ kind: 'MBVI3', role: 'baseline', make: (env, label) => makeAgentForV6('MBVI3', env, label, {}) }),
  BELIEF_REALONLY: Object.freeze({ kind: ADOPTED_AGENT.kind, role: 'secondary, privileged: archives genuine changes only', make: beliefDiagnostic('real') }),
  BELIEF_FALSEONLY: Object.freeze({ kind: ADOPTED_AGENT.kind, role: 'secondary, privileged: archives false alarms only', make: beliefDiagnostic('false') }),
});
export const CORE = Object.freeze(['BELIEF', 'MBVI3']);

/** The worlds of a domain: the frozen bank for m13, the development generator for smoke runs. */
export function worldsOf(domain, bank, count) {
  if (domain === 'm13') return bank.graphs.map((g) => [g.label, buildWorld(g.label, g.n, g.edges)]);
  return Array.from({ length: count }, (_, i) => { const l = LABEL_OF.smoke(i); return [l, generateWorld(l)]; });
}

/** One E5 run of one arm. The environment's own step log gives the behaviour measures; withTrace adds the recorder. */
export function runOne(world, worldLabel, family, arm, withTrace) {
  let env = null, rec = null;
  const makeAgent = (_kind, e, label, _params, context) => {
    env = e;
    const agent = ARMS[arm].make(e, label, context);
    if (!withTrace) return agent;
    rec = traced(agent, context);
    return rec.agent;
  };
  const row = runE5({ world, worldLabel, family, kind: ARMS[arm].kind, makeAgent });
  if (row.excluded) return { row: { arm, ...row }, record: null };
  const measures = returnMeasures(world, env.trace(), row, planE5(world, worldLabel, family));
  verifyAgainstRow(measures, row);
  return { row: { arm, ...row, m13: measures }, record: rec ? rec.record() : null };
}

/** A recorder's output with internal node ids (the modular worlds have no app ids). */
export function readableTrace(world, record, row, worldLabel, family) {
  const edgeOf = (label, a) => { const u = world.nodeOfLabel.get(label); return [u, world.exitOrder[u][a]]; };
  const plan = planE5(world, worldLabel, family);
  const log = row.secondary?.volatility?.log ?? null;
  return {
    world: worldLabel, family, arm: row.arm, start: plan.start, goal: plan.goal,
    schedule: plan.events.map((e) => (e.skipped ? { skipped: true } : { edge: e.edge, reverses: e.reverses })),
    stepColumns: ['t', 'from', 'to', 'moved', 'blocked', 'pWorks'],
    steps: record.steps.map(([t, s, a, m, b, p]) => [t, ...edgeOf(s, a), m, b, p]),
    followedColumns: ['t', 'pWorks', 'blocked', 'tried'],
    followed: record.followed.map((f) => { const [from, to] = edgeOf(f.node, f.action); return { from, to, points: f.points }; }),
    beliefEvents: log ? log.map(([type, label, a, t, rho]) => ({ type, t, edge: edgeOf(label, a), rho })) : null,
  };
}

// ---- analysis ----
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

export const MEASURES = Object.freeze({
  total: (r) => r.metric, blocked: (r) => r.windows.blocked, afterReversed: (r) => r.windows.afterReversed, afterPermanent: (r) => r.windows.afterPermanent,
  futileRetests: (r) => r.diagnostics.futileRetests, censored: (r) => r.censored,
  met: (r) => r.m13.met, metAndReturned: (r) => r.m13.metAndReturned, returnedOwn: (r) => r.m13.returnedOwn, returnedOnlyLater: (r) => r.m13.returnedOnlyLater, crossingsLater: (r) => r.m13.crossingsLater,
});
// [name, text, measure, sign]: steps as MBVI3 - BELIEF (positive = the belief takes fewer); cost and behaviour counts as
// BELIEF - MBVI3.
const CONTRASTS = Object.freeze([
  ['total', 'MBVI3 - BELIEF', 'total', -1], ['cost', 'BELIEF - MBVI3', 'total', 1], ['blocked', 'MBVI3 - BELIEF', 'blocked', -1],
  ['afterReversed', 'MBVI3 - BELIEF', 'afterReversed', -1], ['afterPermanent', 'MBVI3 - BELIEF', 'afterPermanent', -1],
  ['futileRetests', 'BELIEF - MBVI3', 'futileRetests', 1], ['metAndReturned', 'BELIEF - MBVI3', 'metAndReturned', 1],
  ['returnedOwn', 'BELIEF - MBVI3', 'returnedOwn', 1], ['returnedOnlyLater', 'BELIEF - MBVI3', 'returnedOnlyLater', 1],
]);

function contrastOf(d, text, label) {
  return { contrast: text, sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, ...pairedBootstrap(d, label) };
}
/** CF-06's gainShape test for one criterion: more labels in favour than against, a positive median, and a positive mean once the most favourable ceil(0.1 n) labels are removed. */
function shapeOf(d) {
  const s = [...d].sort((a, b) => b - a), top = Math.ceil(0.1 * d.length), rest = s.slice(top);
  const why = [];
  const inFavour = d.filter((x) => x > 0).length, against = d.filter((x) => x < 0).length;
  if (!(inFavour > against)) why.push(`${inFavour} of ${d.length} labels in favour, ${against} against`);
  if (!(median(d) > 0)) why.push(`median ${median(d)}`);
  if (!(mean(rest) > 0)) why.push(`no gain without the top ${top} labels`);
  return { inFavour, against, ties: d.length - inFavour - against, median: median(d), topShare: sum(d) ? sum(s.slice(0, top)) / sum(d) : null, meanWithoutTop: mean(rest), fails: why };
}

/** excess: Map `${label}|${family}` -> per-event detour excess (structure.mjs detourExcess). */
export function analyse(rows, domain, excess) {
  const tag = (name) => `m13|stats|${domain}|${name}`;
  const cell = (family, arm) => new Map(rows.filter((r) => r.family === family && r.arm === arm && !r.excluded).map((r) => [r.world, r]));
  const out = { excludedRuns: rows.filter((r) => r.excluded && r.arm === 'BELIEF').length, families: {}, criteria: {}, secondary: {} };
  const pairs = (family, A, Bn, f, sign = -1) => { const X = cell(family, A), Y = cell(family, Bn); const labels = [...X.keys()].filter((w) => Y.has(w)).sort(); return labels.map((w) => (sign === -1 ? f(Y.get(w)) - f(X.get(w)) : f(X.get(w)) - f(Y.get(w)))); };
  for (const family of FAMILIES) {
    const B = cell(family, 'BELIEF'), M = cell(family, 'MBVI3');
    const labels = [...B.keys()].filter((w) => M.has(w)).sort();
    const arms = {};
    for (const arm of Object.keys(ARMS)) {
      const c = cell(family, arm), ls = labels.filter((w) => c.has(w));
      arms[arm] = Object.fromEntries(Object.entries(MEASURES).map(([k, f]) => [k, mean(ls.map((w) => f(c.get(w))))]));
      arms[arm].skippedEvents = ls.reduce((s, w) => s + c.get(w).skippedEvents, 0);
      arms[arm].firstReturnDelayMedian = median(ls.flatMap((w) => c.get(w).m13.delays));
      arms[arm].detector = { changesDown: mean(ls.map((w) => c.get(w).secondary.model.changesDown)), changesUp: mean(ls.map((w) => c.get(w).secondary.model.changesUp)) };
    }
    const contrasts = {};
    for (const [name, text, measure, sign] of CONTRASTS) {
      const f = MEASURES[measure];
      contrasts[name] = contrastOf(labels.map((w) => sign * (f(B.get(w)) - f(M.get(w)))), `${text}, ${measure} (${family})`, tag(`${family}|${name}`));
    }
    const alarms = labels.map((w) => B.get(w).diagnostics.alarms);
    const belief = Object.fromEntries(['opensReal', 'opensRealReversing', 'opensRealPermanent', 'opensFalse', 'confirmsReal', 'confirmsFalse'].map((k) => [k, mean(alarms.map((a) => (a ? a[k] : 0)))]));
    out.families[family] = { labels: labels.length, arms, contrasts, beliefArchivesPerRun: belief };
  }
  // ---- criteria ----
  const fams = FAMILIES.map((f) => [cell(f, 'BELIEF'), cell(f, 'MBVI3')]);
  const mixLabels = [...fams[0][0].keys()].filter((w) => fams.every(([B, M]) => B.has(w) && M.has(w))).sort();
  const g1 = mixLabels.map((w) => fams.reduce((s, [B, M]) => s + (M.get(w).metric - B.get(w).metric), 0));
  const g3 = pairs('OFTEN', 'BELIEF', 'MBVI3', MEASURES.afterReversed);
  out.criteria = {
    G1_mix: contrastOf(g1, 'per label, sum over RARE + HALF + OFTEN of steps(MBVI3) - steps(BELIEF)', tag('G1|mix')),
    G2_RARE_cost: out.families.RARE.contrasts.cost,
    G3_OFTEN_afterReversed: contrastOf(g3, 'OFTEN, steps after reopenings, MBVI3 - BELIEF', tag('G3|OFTEN|afterReversed')),
    G4_OFTEN_metAndReturned: out.families.OFTEN.contrasts.metAndReturned,
  };
  out.gainShape = { G1_mix: shapeOf(g1), G3_OFTEN_afterReversed: shapeOf(g3) };
  // ---- secondary (never in a criterion) ----
  const g1sd = sd(g1);
  out.secondary.standardizedEffectG1 = { value: g1sd ? mean(g1) / g1sd : null, reference: REFERENCE_EFFECTS, note: 'mean / SD of the per-label G1 differences, beside the same quantity in CF-06 gate6 and M11' };
  const real = (f, m) => pairs(f, 'BELIEF_REALONLY', 'MBVI3', m), fals = (f, m) => pairs(f, 'BELIEF_FALSEONLY', 'MBVI3', m);
  const mixOf = (arm) => mixLabels.map((w) => FAMILIES.reduce((s, f) => s + (cell(f, 'MBVI3').get(w).metric - cell(f, arm).get(w).metric), 0));
  const exact = (name, kind) => mixLabels.every((w) => FAMILIES.every((f) => cell(f, name).get(w).diagnostics.alarms[kind] === 0));
  const AT = {
    splitExact: exact('BELIEF_REALONLY', 'opensFalse') && exact('BELIEF_FALSEONLY', 'opensReal'),
    OFTEN: {
      genuineChanges: contrastOf(real('OFTEN', MEASURES.total), 'MBVI3 - BELIEF_REALONLY (OFTEN)', tag('attr|OFTEN|real')),
      genuineAfterReversed: contrastOf(real('OFTEN', MEASURES.afterReversed), 'MBVI3 - BELIEF_REALONLY, after reopenings (OFTEN)', tag('attr|OFTEN|realAfter')),
      falseAlarms: contrastOf(fals('OFTEN', MEASURES.total), 'MBVI3 - BELIEF_FALSEONLY (OFTEN)', tag('attr|OFTEN|false')),
    },
    mix: { genuineChanges: contrastOf(mixOf('BELIEF_REALONLY'), 'MBVI3 - BELIEF_REALONLY, mix', tag('attr|mix|real')), falseAlarms: contrastOf(mixOf('BELIEF_FALSEONLY'), 'MBVI3 - BELIEF_FALSEONLY, mix', tag('attr|mix|false')) },
  };
  const lb = (c) => !!c && c.n > 0 && c.mean > 0 && c.lo > 0;
  const source = (genuine, falseRepair) => (!AT.splitExact ? 'INVALID (the diagnostic split is not exact)' : genuine && falseRepair ? 'GENUINE REVERSALS AND FALSE-ALARM REPAIR' : genuine ? 'GENUINE REVERSALS' : falseRepair ? 'FALSE-ALARM REPAIR' : 'NOT ATTRIBUTED');
  AT.gainSource = source(lb(AT.OFTEN.genuineChanges) && lb(AT.OFTEN.genuineAfterReversed), lb(AT.OFTEN.falseAlarms));
  AT.gainSourceMix = source(lb(AT.mix.genuineChanges), lb(AT.mix.falseAlarms));
  out.secondary.attribution = AT;
  // moderator: per reversing event, the after-window difference MBVI3 - BELIEF by the event's detour excess
  const mod = {};
  for (const family of FAMILIES) {
    const B = cell(family, 'BELIEF'), M = cell(family, 'MBVI3'), groups = { 'excess 0': [], 'excess 1-3': [], 'excess 4+': [] };
    for (const w of [...B.keys()].filter((x) => M.has(x))) {
      const ex = excess.get(`${w}|${family}`);
      B.get(w).events.forEach((e, k) => {
        if (e.skipped || !e.reverses) return;
        const x = ex[k], g = x === 0 ? 'excess 0' : x >= 4 ? 'excess 4+' : 'excess 1-3';
        groups[g].push(M.get(w).events[k].after - e.after);
      });
    }
    mod[family] = Object.fromEntries(Object.entries(groups).map(([g, d]) => [g, { events: d.length, meanAfterDifference: mean(d) }]));
  }
  out.secondary.moderatorDetourExcess = { note: 'descriptive: per reversing event, steps in its after-window, MBVI3 - BELIEF, by the detour excess of its block', ...mod };
  return out;
}

// ---- reading rule (SPEC.md); strict inequalities; an empty contrast never passes ----
const lbPos = (c) => !!c && c.n > 0 && c.mean > 0 && c.lo > 0;
const ubBelow = (c, x) => !!c && c.n > 0 && c.hi < x;

/**
 * SPEC.md "Verdict": five independent lines (one per criterion) and one summary statement from G0, G1 and G2 only.
 * validity: { identical, testsPassed, novelty, noExclusions } (G0).
 */
export function readingRule(analysis, validity) {
  const C = analysis.criteria;
  const g0parts = { determinism: !!validity.identical, tests: !!validity.testsPassed, novelty: !!validity.novelty, exclusions: !!validity.noExclusions };
  const valid = Object.values(g0parts).every(Boolean);
  const g1 = C.G1_mix;
  const lines = {
    validity: valid ? 'VALID' : `INVALID (${Object.entries(g0parts).filter(([, v]) => !v).map(([k]) => k).join(', ')})`,
    netAdvantage: lbPos(g1) ? 'RETAINED' : !!g1 && g1.n > 0 && g1.hi < 0 ? 'REVERSED' : 'NOT SHOWN',
    safety: ubBelow(C.G2_RARE_cost, MARGIN) ? 'SAFE' : 'NOT SHOWN SAFE',
    recovery: lbPos(C.G3_OFTEN_afterReversed) ? 'SHOWN' : 'NOT SHOWN',
    behaviouralMechanism: lbPos(C.G4_OFTEN_metAndReturned) ? 'SHOWN' : 'NOT SHOWN',
  };
  const shape = (k) => (analysis.gainShape[k].fails.length ? `TAIL-DRIVEN (${analysis.gainShape[k].fails.join(', ')})` : 'CONSISTENT');
  const gainShape = { G1_mix: shape('G1_mix'), G3_OFTEN_afterReversed: shape('G3_OFTEN_afterReversed') };
  let summary;
  if (!valid) summary = 'INVALID — NO CRITERION IS INTERPRETED';
  else if (lines.netAdvantage === 'RETAINED') summary = `NET ADVANTAGE RETAINED ON THE MODULAR FAMILY${lines.safety === 'SAFE' ? ', WITHIN THE SAFETY MARGIN' : '; SAFETY NOT SHOWN'}${gainShape.G1_mix === 'CONSISTENT' ? '' : ' — FROM A MINORITY OF LABELS'}`;
  else summary = `NET ADVANTAGE ${lines.netAdvantage} ON THE MODULAR FAMILY`;
  return {
    G0_validity: valid, G1_net: lines.netAdvantage === 'RETAINED', G2_safety: lines.safety === 'SAFE', G3_recovery: lines.recovery === 'SHOWN', G4_behaviour: lines.behaviouralMechanism === 'SHOWN',
    g0parts, lines, gainShape, summary,
  };
}

export { E5_FAMILIES, E5_PARAMS };

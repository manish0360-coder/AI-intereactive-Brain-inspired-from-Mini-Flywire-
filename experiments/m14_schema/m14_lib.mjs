// ==========================================================
// M14 — schema abstraction and transfer: configuration, arms, one trial, analysis (EVALUATION code)
// ==========================================================
// One TRIAL (one label) is:
//   six training worlds  generateWorld(`${trial}|train|${k}`), a unique 2-hop route each, kinds signposting the
//                        canonical relation SIGMA from phase k mod 4, so the six routes together show every link of
//                        the relation, but each shows only two links in a row;
//   one test world       generateWorld(`${trial}|test`), a unique 4-hop route, run under three kind assignments:
//                          COMPOSE   SIGMA from a label-drawn phase: a 4-link chain never shown whole in training
//                                    (primary);
//                          NULL      random kinds, no relation (negative control);
//                          REVERSED  SIGMA^-1 (an intervention on the relation; secondary).
// Every world is new and relabelled, so no node, label or route recurs between training and test.
//
// Arms (all on the adopted agent's parameters, AD-13):
//   CONCRETE        the adopted agent, fresh in each test world: schema disabled
//   SCHEMA          the schema agent; the schema learns over the six training worlds, is frozen, then guides the
//                   test worlds
//   SCHEMA_SHUFFLED as SCHEMA, but each training world's kinds are renamed by its own random permutation: the same
//                   experience, the relation inconsistent across worlds (negative control)
//   ORACLE_SCHEMA   privileged: the schema agent with the true relation as a fixed table (admission only)
// A carried concrete agent (one adopted agent through all seven worlds) was planned as a memorization control but
// cannot run: world model v3 keys a state by its label and refuses a label whose exit count changes
// (v3/world_model.mjs, visit), and labels 1..24 recur in every world with different nodes behind them. Concrete
// memory therefore cannot even be carried between these worlds; SCHEMA_SHUFFLED is the same-experience control.
// ==========================================================
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { makeStream } from '../../cognitive/testbed/rng.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { ADOPTED_AGENT, makeAdoptedAgent } from '../../cognitive/testbed/adopted_agent.mjs';
import { KINDS, SIGMA, SIGMA_INV, planRoute, signpostKinds, randomKinds, permuteKinds, randomPermutation, checkSignposts, runWorld } from '../../cognitive/testbed/task_e6.mjs';
import { makeKindSchema, fixedSchema } from '../../cognitive/mind/schema/kind_schema.mjs';
import { makeSchemaAgent } from '../../cognitive/mind/schema/agent.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const E6 = Object.freeze({ trainWorlds: 6, trainDistance: 2, trainEpisodes: 5, testDistance: 4, testEpisodes: 3, cap: 200 });
export const CONDITIONS = Object.freeze(['COMPOSE', 'NULL', 'REVERSED']);
export const ARMS = Object.freeze(['CONCRETE', 'SCHEMA', 'SCHEMA_SHUFFLED', 'ORACLE_SCHEMA']);
export const PRIVILEGED_ARMS = Object.freeze(['ORACLE_SCHEMA']);
export const LABEL_OF = Object.freeze({
  dev: (i) => `m14schema|dev|${i}`,
  smoke: (i) => `m14schema|smoke|${i}`,
  m14: (i) => `m14schema|gate|${i}`,
});
export const BARRED_PREFIXES = Object.freeze(['cf|', 'mfw|', 'm13', 'm14schema|dev|', 'm14schema|test|', 'm14schema|smoke|', 'm14schema|survey|']);
export const ORACLE_TABLE = Object.freeze(Array.from({ length: KINDS }, (_, k) => Object.freeze(Array.from({ length: KINDS }, (_, j) => (j === SIGMA[k] ? 1 : 0)))));

const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');

export function assertFreshLabels(labels) {
  for (const l of labels) if (!l.startsWith('m14schema|gate|') || BARRED_PREFIXES.some((p) => l.startsWith(p))) throw new Error(`label ${l} is not in the fresh M14 namespace`);
}

/** Every world of a trial, its route and its kind assignments; null with a reason when a world has no usable route. */
export function planTrial(trial) {
  const train = [];
  for (let k = 0; k < E6.trainWorlds; k++) {
    const label = `${trial}|train|${k}`;
    const world = generateWorld(label);
    const plan = planRoute(world, label, E6.trainDistance);
    if (!plan) return { trial, excluded: `training world ${k} has no unique ${E6.trainDistance}-hop route` };
    const kinds = signpostKinds(world, plan.route, SIGMA, k % KINDS, label);
    const perm = randomPermutation(`${label}|shuffle`);
    train.push({ label, world, plan, kinds, shuffledKinds: permuteKinds(kinds, perm), perm, phase: k % KINDS });
  }
  const label = `${trial}|test`;
  const world = generateWorld(label);
  const plan = planRoute(world, label, E6.testDistance);
  if (!plan) return { trial, excluded: `the test world has no unique ${E6.testDistance}-hop route` };
  const phase = Math.floor(makeStream(`${label}|phase`)() * KINDS);
  const kinds = {
    COMPOSE: signpostKinds(world, plan.route, SIGMA, phase, `${label}|compose`),
    NULL: randomKinds(world, `${label}|null`),
    REVERSED: signpostKinds(world, plan.route, SIGMA_INV, phase, `${label}|reversed`),
  };
  for (const t of train) if (checkSignposts(t.world, t.plan.route, t.kinds, SIGMA).length) throw new Error(`${t.label}: signposts broken`);
  if (checkSignposts(world, plan.route, kinds.COMPOSE, SIGMA).length || checkSignposts(world, plan.route, kinds.REVERSED, SIGMA_INV).length) throw new Error(`${label}: signposts broken`);
  return { trial, excluded: null, train, test: { label, world, plan, phase, kinds } };
}

/** The learned relation: for each kind, the next kind the schema scores highest (null on a tie). */
export function learnedRelation(schema) {
  return Array.from({ length: KINDS }, (_, k) => {
    const sc = Array.from({ length: KINDS }, (_, j) => schema.score(k, j));
    const top = Math.max(...sc);
    const at = sc.map((x, j) => (x === top ? j : -1)).filter((j) => j >= 0);
    return at.length === 1 ? at[0] : null;
  });
}

const testRun = (P, cond, agent) => runWorld({ world: P.test.world, plan: P.test.plan, kinds: P.test.kinds[cond], agent, episodes: E6.testEpisodes, cap: E6.cap, envLabel: `${P.test.label}|env` });
// One agent stream per trial for every test run (common random numbers across arms and conditions). CONCRETE ignores
// kinds, so its three test conditions are identical runs; the validity check asserts this.
const testRng = (P, _cond) => `${P.trial}|agent|test`;
const strip = (episodes) => episodes.map((e) => ({ steps: e.steps, done: e.done, path: e.path }));

function trainSchema(P, arm, schema) {
  return P.train.map((t, k) => {
    const agent = makeSchemaAgent({ rng: makeStream(`${P.trial}|agent|${arm}|train|${k}`), params: { ...ADOPTED_AGENT.params }, schema, learn: true });
    const ep = runWorld({ world: t.world, plan: t.plan, kinds: arm === 'SCHEMA_SHUFFLED' ? t.shuffledKinds : t.kinds, agent, episodes: E6.trainEpisodes, cap: E6.cap, envLabel: `${t.label}|env` });
    return { world: t.label, start: t.plan.start, goal: t.plan.goal, steps: ep.map((e) => e.steps), done: ep.map((e) => e.done), learned: agent.inspect().schemaStats.learnedEpisodes };
  });
}

/** One arm on one planned trial. Returns the raw row. */
export function runArm(P, arm) {
  const row = { trial: P.trial, arm, training: null, schema: null, tests: {}, stats: {} };
  if (arm === 'CONCRETE') {
    for (const c of CONDITIONS) row.tests[c] = strip(testRun(P, c, makeAdoptedAgent(null, testRng(P, c))));
  } else if (arm === 'SCHEMA' || arm === 'SCHEMA_SHUFFLED' || arm === 'ORACLE_SCHEMA') {
    let schema;
    if (arm === 'ORACLE_SCHEMA') schema = fixedSchema(ORACLE_TABLE);
    else { schema = makeKindSchema(KINDS); row.training = trainSchema(P, arm, schema); schema.freeze(); }
    const snap = schema.snapshot(), hashBefore = sha(snap);
    for (const c of CONDITIONS) {
      const agent = makeSchemaAgent({ rng: makeStream(testRng(P, c)), params: { ...ADOPTED_AGENT.params }, schema, learn: false });
      row.tests[c] = strip(testRun(P, c, agent));
      row.stats[c] = agent.inspect().schemaStats;
    }
    const hashAfter = sha(schema.snapshot());
    if (hashAfter !== hashBefore) throw new Error(`${P.trial} ${arm}: the schema changed during the test worlds`);
    row.schema = { snapshot: snap, sha256: hashBefore, relation: learnedRelation(schema), relationIsSigma: JSON.stringify(learnedRelation(schema)) === JSON.stringify(SIGMA) };
  } else throw new Error(`unknown arm ${arm}`);
  return row;
}

// ---- analysis ----
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/** Steps of test episode e (0-based) under condition c; an episode that hit the cap counts as cap steps. */
export const testSteps = (row, c, e = 0) => (row.tests[c] ? row.tests[c][e].steps : null);

export function contrast(rows, X, Y, cond, ep, tag, what) {
  const by = (arm) => new Map(rows.filter((r) => r.arm === arm && r.tests[cond]).map((r) => [r.trial, r]));
  const a = by(X), b = by(Y);
  const labels = [...a.keys()].filter((l) => b.has(l)).sort();
  const d = labels.map((l) => testSteps(a.get(l), cond, ep) - testSteps(b.get(l), cond, ep));
  return { contrast: what, ...pairedBootstrap(d, tag), sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length };
}

export const lbPos = (c) => !!c && c.n > 0 && c.mean > 0 && c.lo > 0;

// ---- fixed from the admission gate (admission/admission.json; development labels, CONCRETE and ORACLE_SCHEMA only) ----
export const N_LABELS = 165;          // every gate label is plannable (census), so none is excluded
export const MARGIN = 9;              // safety margin: ceil(H / 4), H = 32.17 the oracle headroom on development labels

/** CF-06's gainShape rule: more labels for than against, a positive median, a positive mean without the top decile. */
export function gainShape(d) {
  const s = [...d].sort((a, b) => b - a), top = Math.ceil(0.1 * d.length), why = [];
  const inF = d.filter((x) => x > 0).length, ag = d.filter((x) => x < 0).length;
  if (!(inF > ag)) why.push('more labels against than for');
  if (!(median(d) > 0)) why.push('median not positive');
  const rest = s.slice(top);
  if (!(mean(rest) > 0)) why.push('mean not positive without the top decile');
  return { inFavour: inF, against: ag, ties: d.length - inF - ag, median: median(d), topShare: sum(d) ? sum(s.slice(0, top)) / sum(d) : null, meanWithoutTop: mean(rest), reading: why.length ? `TAIL-DRIVEN (${why.join('; ')})` : 'CONSISTENT' };
}

const diffsOf = (rows, X, Y, cond, ep) => {
  const by = (arm) => new Map(rows.filter((r) => r.arm === arm && r.tests[cond]).map((r) => [r.trial, r]));
  const a = by(X), b = by(Y);
  return [...a.keys()].filter((l) => b.has(l)).sort().map((l) => testSteps(a.get(l), cond, ep) - testSteps(b.get(l), cond, ep));
};

/** Every pre-declared criterion and the reported quantities, from the run-A rows. */
export function analyse(rows, domain) {
  const tag = (t) => `m14schema|stats|${domain}|${t}`;
  const C = {
    P1: contrast(rows, 'CONCRETE', 'SCHEMA', 'COMPOSE', 0, tag('P1'), 'CONCRETE - SCHEMA, steps in the first COMPOSE test episode'),
    P2: contrast(rows, 'SCHEMA_SHUFFLED', 'SCHEMA', 'COMPOSE', 0, tag('P2'), 'SCHEMA_SHUFFLED - SCHEMA, steps in the first COMPOSE test episode'),
    S: contrast(rows, 'SCHEMA', 'CONCRETE', 'NULL', 0, tag('S'), 'SCHEMA - CONCRETE, steps in the first NULL test episode (harm when kinds carry no relation)'),
  };
  const R = {
    R1_reversedHarm: contrast(rows, 'SCHEMA', 'CONCRETE', 'REVERSED', 0, tag('R1'), 'SCHEMA - CONCRETE, first REVERSED episode (harm when the relation is reversed)'),
    R2_reversedThird: contrast(rows, 'SCHEMA', 'CONCRETE', 'REVERSED', 2, tag('R2'), 'SCHEMA - CONCRETE, third REVERSED episode'),
    O_shortfall: contrast(rows, 'SCHEMA', 'ORACLE_SCHEMA', 'COMPOSE', 0, tag('O'), 'SCHEMA - ORACLE_SCHEMA, first COMPOSE episode (shortfall from the true relation)'),
    H_oracle: contrast(rows, 'CONCRETE', 'ORACLE_SCHEMA', 'COMPOSE', 0, tag('H'), 'CONCRETE - ORACLE_SCHEMA, first COMPOSE episode (headroom)'),
    SH_shuffledVsConcrete: contrast(rows, 'CONCRETE', 'SCHEMA_SHUFFLED', 'COMPOSE', 0, tag('SH'), 'CONCRETE - SCHEMA_SHUFFLED, first COMPOSE episode'),
    E2_compose: contrast(rows, 'CONCRETE', 'SCHEMA', 'COMPOSE', 1, tag('E2'), 'CONCRETE - SCHEMA, second COMPOSE episode'),
    E3_compose: contrast(rows, 'CONCRETE', 'SCHEMA', 'COMPOSE', 2, tag('E3'), 'CONCRETE - SCHEMA, third COMPOSE episode'),
  };
  const per = {};
  for (const arm of ARMS) {
    const rs = rows.filter((r) => r.arm === arm);
    per[arm] = { labels: rs.length };
    for (const c of CONDITIONS) {
      const xs = rs.filter((r) => r.tests[c]);
      if (!xs.length) continue;
      per[arm][c] = Array.from({ length: E6.testEpisodes }, (_, e) => ({ meanSteps: mean(xs.map((r) => testSteps(r, c, e))), medianSteps: median(xs.map((r) => testSteps(r, c, e))), capped: xs.filter((r) => !r.tests[c][e].done).length }));
    }
    if (rs.some((r) => r.schema)) {
      const sch = rs.filter((r) => r.schema);
      per[arm].relationIsSigma = sch.filter((r) => r.schema.relationIsSigma).length;
      per[arm].relationLinksRight = mean(sch.map((r) => r.schema.relation.filter((j, k) => j === SIGMA[k]).length));
    }
    if (rs.some((r) => r.training)) per[arm].trainingSteps = mean(rs.map((r) => sum(r.training.map((t) => sum(t.steps)))));
  }
  return { criteria: C, secondary: R, gainShapeP1: gainShape(diffsOf(rows, 'CONCRETE', 'SCHEMA', 'COMPOSE', 0)), arms: per };
}

/** The five verdict lines and the summary statement (SPEC.md, "Verdict"). */
export function readingRule(analysis, validity) {
  const C = analysis.criteria;
  const parts = { determinism: !!validity.identical, tests: !!validity.testsPassed, exclusions: !!validity.noExclusions, concretePassive: !!validity.concretePassive, oracleFollows: !!validity.oracleFollows };
  const valid = Object.values(parts).every(Boolean);
  const transfer = lbPos(C.P1) && lbPos(C.P2) ? 'SHOWN' : lbPos(C.P1) ? 'NOT ATTRIBUTABLE TO THE RELATION' : !!C.P1 && C.P1.n > 0 && C.P1.hi < 0 ? 'REVERSED' : 'NOT SHOWN';
  const lines = {
    validity: valid ? 'VALID' : `INVALID (${Object.entries(parts).filter(([, v]) => !v).map(([k]) => k).join(', ')})`,
    transfer,
    relationalContent: lbPos(C.P2) ? 'SHOWN' : 'NOT SHOWN',
    safety: !!C.S && C.S.n > 0 && C.S.hi < MARGIN ? 'SAFE' : 'NOT SHOWN SAFE',
    reversal: lbPos(analysis.secondary.R1_reversedHarm) ? 'MISLED WHEN REVERSED' : 'NOT SHOWN',
  };
  const summary = !valid ? 'INVALID — NO CRITERION IS INTERPRETED'
    : transfer === 'SHOWN' ? `LEARNED RELATIONAL SCHEMA TRANSFERS TO UNSEEN COMBINATIONS${lines.safety === 'SAFE' ? ', WITHIN THE SAFETY MARGIN' : '; SAFETY NOT SHOWN'}${analysis.gainShapeP1.reading === 'CONSISTENT' ? '' : ' — FROM A MINORITY OF LABELS'}`
    : transfer === 'NOT ATTRIBUTABLE TO THE RELATION' ? 'A BENEFIT IS SHOWN, BUT NOT ATTRIBUTABLE TO THE LEARNED RELATION'
    : `TRANSFER ${transfer}`;
  return { parts, lines, summary };
}

export { sha, mean, sd, median };

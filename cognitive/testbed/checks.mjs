// ==========================================================
// CF-01 testbed — named isolation and integrity checks (handbook §13)
// ==========================================================
// Each check returns a list of problems (empty = pass).  Tests apply every check to the real testbed (must pass)
// and to a matching mutant (must fail), so no check can pass vacuously.
// ==========================================================
import { OBS_KEYS } from './env.mjs';

export function checkObservation(obs) {
  const p = [];
  if (!obs || typeof obs !== 'object') return ['observation is not an object'];
  const keys = Object.keys(obs).sort();
  if (keys.join(',') !== [...OBS_KEYS].sort().join(',')) p.push(`observation keys are [${keys}] not [${OBS_KEYS}]`);
  if (!Object.isFrozen(obs)) p.push('observation is not frozen');
  if (!Number.isInteger(obs.node)) p.push('node is not an integer');
  if (!Number.isInteger(obs.nActions) || obs.nActions < 1) p.push('nActions is not a positive integer');
  if (!(obs.goal === null || Number.isInteger(obs.goal))) p.push('goal is neither null nor an integer');
  return p;
}

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
export const AGENT_ALLOWED_IMPORTS = Object.freeze(['../testbed/agent_util.mjs']);
const FORBIDDEN = [
  ['Math.random', /\bMath\.random\b/], ['Date', /\bDate\b/], ['performance', /\bperformance\b/], ['process', /\bprocess\b/],
  ['require', /\brequire\s*\(/], ['dynamic import', /\bimport\s*\(/], ['globalThis', /\bglobalThis\b/], ['window', /\bwindow\b/],
  ['eval', /\beval\s*\(/], ['Function constructor', /\bnew\s+Function\b|\bFunction\s*\(/], ['timers', /\bset(?:Timeout|Interval|Immediate)\b/],
];

export function checkAgentSource(src, name = 'agent') {
  const p = [];
  const code = stripComments(src);
  for (const m of code.matchAll(/^\s*import\b[^;]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)) {
    const spec = m[1] ?? m[2];
    if (!AGENT_ALLOWED_IMPORTS.includes(spec)) p.push(`${name} imports ${spec}`);
  }
  for (const [label, re] of FORBIDDEN) if (re.test(code)) p.push(`${name} uses ${label}`);
  return p;
}

export function checkGlobals(before, after) {
  const b = new Set(before);
  return after.filter((k) => !b.has(k)).map((k) => `new global ${k}`);
}

/** Labels and exit orders must not reveal structure: identity-ordered exits on more than half the nodes fails. */
export function checkPermutation(world) {
  const p = [];
  const multi = world.adj.map((nb, i) => [nb, world.exitOrder[i]]).filter(([nb]) => nb.length >= 2);
  const identity = multi.filter(([nb, ex]) => nb.every((v, j) => ex[j] === v)).length;
  if (identity * 2 > multi.length) p.push(`exit order equals sorted neighbours on ${identity} of ${multi.length} nodes`);
  const labelIdentity = world.labelOf.filter((l, i) => l === i + 1).length;
  if (labelIdentity * 2 > world.n) p.push(`node label equals id + 1 on ${labelIdentity} of ${world.n} nodes`);
  return p;
}

/** Common random numbers: the j-th attempt outcome of an edge must not depend on what happened on other edges. */
export function checkCRN(outcomesA, outcomesB) {
  const p = [];
  for (const key of Object.keys(outcomesA)) {
    const a = outcomesA[key], b = outcomesB[key] ?? [];
    const n = Math.min(a.length, b.length);
    for (let j = 0; j < n; j++) if (a[j] !== b[j]) { p.push(`edge ${key} attempt ${j} differs between orderings`); break; }
  }
  return p;
}

/** Privileged channel: only the listed kinds may receive an oracle in their construction options. */
export function checkPrivilege(kinds, privileged, optionsFor) {
  const p = [];
  for (const k of kinds) {
    const has = !!optionsFor(k).oracle;
    if (has && !privileged.includes(k)) p.push(`${k} receives the oracle channel`);
    if (!has && privileged.includes(k)) p.push(`${k} is privileged but receives no oracle`);
  }
  return p;
}

/** A blocked edge must never be traversed (env exposes reset/step/block/inspect as GraphEnv does). */
export function checkBlocked(env, world, u, v, attempts = 200) {
  env.setRewardNode(null);
  env.block(u, v);
  const a = world.exitOrder[u].indexOf(v);
  let traversed = 0;
  for (let i = 0; i < attempts; i++) { env.reset({ start: u, maxSteps: 1 }); env.step(a); if (env.inspect().pos === v) traversed++; }
  return traversed ? [`blocked edge ${u}-${v} traversed ${traversed} of ${attempts} times`] : [];
}

/** Entering the rewarded node obeys the same dynamics: with p = 0 on the goal edge the goal is never reached. */
export function checkGoalEntryDynamics(env, world, from, goal, attempts = 200) {
  env.setRewardNode(goal);
  env.setReliability(from, goal, 0);
  const a = world.exitOrder[from].indexOf(goal);
  let entered = 0;
  for (let i = 0; i < attempts; i++) { env.reset({ start: from, maxSteps: 1 }); const r = env.step(a); if (r.reward > 0 || env.inspect().pos === goal) entered++; }
  return entered ? [`goal entered through a p = 0 edge ${entered} of ${attempts} times`] : [];
}

/** Determinism: two runs of the same input must give identical serialisations. */
export function checkDeterminism(runA, runB) {
  return JSON.stringify(runA) === JSON.stringify(runB) ? [] : ['two runs with identical inputs differ'];
}

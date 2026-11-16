// ==========================================================
// CF-06 — a belief about whether a changed exit will change back (criteria in experiments/cf06/GATE_SPEC.md)
// ==========================================================
//   node experiments/cf06/run_gate.mjs --domain dev   --out <file outside the repository> [--worlds N]
//   node experiments/cf06/run_gate.mjs --domain gate6
// Every world is run in all three families (RARE 0.1, HALF 0.5, OFTEN 0.9) of task E5, by every arm.
// Primary arm BELIEF: world model v6 with rho fixed at 1/2 (the prior mean; nothing is learned across changes), h = 0.01.
//   B1  equal mix: for every fixed policy X (MBVI3; RECALL 0.003, 0.01, 0.03), per-world sum over the three families
//       of steps(X) - steps(BELIEF), mean > 0 and lower bound > 0
//   B2  RARE (re-testing hurts): steps(BELIEF) - steps(MBVI3), upper bound < MARGIN
//   B3  OFTEN (re-testing helps): steps(MBVI3) - steps(BELIEF), mean > 0 and lower bound > 0
//   B4  the mechanism, both parts: (a) OFTEN, steps after reversed events, MBVI3 - BELIEF, mean > 0 and lower bound > 0
//       (it recovers reopened routes); (b) RARE, futile re-tests, RECALL_01 - BELIEF (the same h), mean > 0 and lower
//       bound > 0 (it gives up on permanent changes from evidence, not on a clock)
//   B5  no regression: steps(BELIEF) - steps(MBVI3) upper bound < BATTERY_MARGIN on E1 EXPLORED, E3, E1S EXPLORED, E2P PRE
//   B6  infrastructure: two in-process runs identical; all tests pass
// Verdict: INVALID (B6) / NOT SUPPORTED (B1 fails) / SUPPORTED WITH EXCEPTIONS (B1 holds; some of B2-B5 fail, listed)
//          / SUPPORTED (B1-B6).  Whenever B1 holds, the verdict carries gainShape: "SUPPORTED — CONSISTENT" or
//          "SUPPORTED — TAIL-DRIVEN (parts)".  A TAIL-DRIVEN result is a lower expected cost from a minority of worlds,
//          never a policy that is better in general.
// Learning the rate (hypothesis H-VOL) is reported with claim rules fixed now; it never changes the verdict:
//   L1 learnedRateAddsValue  BELIEF - VOL: on the mix mean > 0 and lower bound > 0, and in every family lower bound > -MARGIN
//   L2 headroomDetectable    BELIEF - VOL_RHO_TRUE on the mix, lower bound > 0.  If not, the record says that E5 gives
//                            knowing the rate no measurable value: the learning question is not admitted by this task.
//      taskCanTestLearning   L2, and its mean at least twice L1's MDE80 at this n (the registry's headroom rule); only
//                            then may the record say that E5 can test learning the rate
//   L3 rateMovesRightWay     VOL's final rho, OFTEN - RARE, mean > 0 and lower bound > 0 (direction, not estimation)
//   L4 stopsRetesting        RARE worlds whose changes were all permanent (at least Z_MIN of them): VOL's futile
//                            re-tests below BELIEF's in total and in events 4-6 (both upper bounds < 0)
//   hRobustness              ROBUST (B1 holds at h = 0.003, 0.01 and 0.03) / DIRECTION ROBUST (every B1 part has mean > 0
//                            at all three) / SENSITIVE TO h.  The verdict uses h = 0.01 only; no h is chosen from data.
//   gainSource               from the two privileged diagnostic arms (ground truth through arms_v6.mjs only), OFTEN:
//                            GENUINE = MBVI3 - BELIEF_REALONLY holds (mean > 0, lower bound > 0) in total AND after
//                            reversed events; FALSE = MBVI3 - BELIEF_FALSEONLY holds.  GENUINE REVERSALS / GENUINE
//                            REVERSALS AND FALSE-ALARM REPAIR / FALSE-ALARM REPAIR / NOT ATTRIBUTED; INVALID if the split
//                            is not exact (a diagnostic arm archived an event of the other kind, by the trace).
//                            "Recovers reopened routes" may be written only with GENUINE.
//   gainSourceMix            the same rule for B1's gain over the planner on the mix (genuine changes / false alarms);
//                            "beats the planner by recovering reopened routes" only with GENUINE; with FALSE-ALARM
//                            REPAIR alone the record says B1's advantage over the planner comes from repairing the
//                            detector's false alarms
//   gainShape                CONSISTENT if every B1 part and B3 has more worlds in favour than against, a positive
//                            median, and a positive mean once the most favourable 10% of worlds are removed; else
//                            TAIL-DRIVEN (naming the parts).  Part of the verdict line (above).
// Reported, never pass/fail: every arm in every family (mean, median, per-world counts, capped episodes, futile
// re-tests); B1-B4 at h = 0.003 and 0.03; false alarms of the change detector against ground truth; the zero-reversal
// subset; VOL's learned rho without pooling; every weighting of the three families on a 0.1 grid; work per decision;
// the per-world differences of every criterion with their distribution and the contribution of the extreme worlds;
// the gain attributed by category (genuine reversals, permanent changes, false alarms, residual) in every family;
// wall-clock and memory (outside the hashed rows).
// Refusals on the gate domain: missing or unfrozen specification, specification not matching GATE_SPEC.sha256,
// uncommitted or modified files, gate already run.  HEAD is recorded at launch and at the end.
// ==========================================================
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWorld } from '../../cognitive/testbed/worlds.mjs';
import { runE5, E5_FAMILIES, E5_PARAMS } from '../../cognitive/testbed/task_e5.mjs';
import { runTaskV1 } from '../../cognitive/testbed/tasks_v1.mjs';
import { runE2P } from '../../cognitive/testbed/task_e2p.mjs';
import { armAgentV6 } from '../../cognitive/testbed/arms_v6.mjs';
import { pairedBootstrap } from '../../cognitive/testbed/stats.mjs';
import { VOL_DEFAULTS } from '../../cognitive/mind/v6/agent.mjs';
import { runAllTests } from '../../cognitive/tests/run_all.mjs';
import { runTestFiles } from '../../cognitive/tests/run_list.mjs';

export const GATE6_WORLDS = 135;     // fixed before the gate6 run by simulated power (power_sim.mjs); see GATE_SPEC.md
export const MARGIN = 25;            // steps over a run of task E5 (about 2% of the planner's total in RARE)
export const BATTERY_MARGIN = 10;    // steps (the earlier gates' margin, on the earlier tasks)
const FAMILIES = Object.keys(E5_FAMILIES);
// name -> [registry kind, params, label, options?].  VOL_RHO_TRUE is told the family's true rate: a privileged
// reference.  The two diagnostic arms receive ground truth through arms_v6.mjs (the only route); every arm is built there.
const ARMS = Object.freeze({
  ORACLE: ['ORACLE', {}, 'privileged reference'],
  MBVI3: ['MBVI3', {}, 'fixed: keeps no memory of what a changed exit used to do (it still re-tests when its own model resets)'],
  RECALL_003: ['MBVI4_RECALL', { hazard: 0.003 }, 'fixed'],
  RECALL_01: ['MBVI4_RECALL', { hazard: 0.01 }, 'fixed'],
  RECALL_03: ['MBVI4_RECALL', { hazard: 0.03 }, 'fixed'],
  BELIEF: ['VOL_RHO', { rhoFixed: 0.5 }, 'PRIMARY: model v6, two-regime belief per changed exit, rho fixed at 1/2 (the prior mean), h = 0.01'],
  BELIEF_H003: ['VOL_RHO', { rhoFixed: 0.5, volHazard: 0.003 }, 'sensitivity of the primary to h; in no criterion'],
  BELIEF_H03: ['VOL_RHO', { rhoFixed: 0.5, volHazard: 0.03 }, 'sensitivity of the primary to h; in no criterion'],
  VOL: ['VOL', {}, 'reported (H-VOL): the same belief with rho learned across changes'],
  VOL_RHO_TRUE: ['VOL_RHO', null, 'privileged reference: rho told the family rate (the headroom for learning it)'],
  BELIEF_REALONLY: ['VOL_RHO', { rhoFixed: 0.5 }, 'privileged diagnostic: the primary, archiving only genuine changes (ground truth); in no criterion', { diagnostic: 'real' }],
  BELIEF_FALSEONLY: ['VOL_RHO', { rhoFixed: 0.5 }, 'privileged diagnostic: the primary, archiving only false alarms (ground truth); in no criterion', { diagnostic: 'false' }],
});
const PRIMARY = 'BELIEF';
const FIXED = ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03'];
const SENSITIVITY = Object.freeze({ 'h=0.003': 'BELIEF_H003', 'h=0.01': 'BELIEF', 'h=0.03': 'BELIEF_H03' });
const MODEL_ARMS = ['BELIEF', 'BELIEF_H003', 'BELIEF_H03', 'VOL', 'VOL_RHO_TRUE', 'BELIEF_REALONLY', 'BELIEF_FALSEONLY'];   // arms whose model keeps an event log
const GRID = 10;                     // family weights on the simplex in steps of 1/GRID
const Z_MIN = 10;                    // fewest zero-reversal RARE worlds on which the stopsRetesting claim is assessed
const BATTERY = [['E1', 'EXPLORED'], ['E3', 'STD'], ['E1S', 'EXPLORED'], ['E2P', 'PRE']];
const BATTERY_ARMS = ['MBVI3', 'BELIEF', 'VOL'];
const TEST_FILES = ['test_e2p.mjs', 'test_core.mjs', 'test_invariance.mjs', 'test_v1.mjs', 'test_mind.mjs', 'test_mind_v3.mjs', 'test_arb.mjs', 'test_recovery.mjs', 'test_vol.mjs'];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`cf06 run_gate refused: ${m}`); process.exit(2); };
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a]).toString().trim();
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const quantiles = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), q = (p) => { const x = p * (s.length - 1), i = Math.floor(x), j = Math.ceil(x); return s[i] + (s[j] - s[i]) * (x - i); };
  return { n: s.length, min: s[0], q10: q(0.1), q25: q(0.25), median: q(0.5), q75: q(0.75), q90: q(0.9), max: s[s.length - 1] };
};
const pearson = (xs, ys) => {
  if (xs.length < 3) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
};
// A criterion on an empty contrast never passes (a null bound must not compare as 0).
const lbPos = (c) => c.n > 0 && c.mean > 0 && c.lo > 0;
const ubBelow = (c, x) => c.n > 0 && c.hi < x;

const DOMAIN = arg('--domain');
if (!['dev', 'gate6'].includes(DOMAIN)) die('--domain must be dev or gate6');
const isGate = DOMAIN === 'gate6';
const N = isGate ? GATE6_WORLDS : Number(arg('--worlds', '20'));
const SPEC = path.join(HERE, 'GATE_SPEC.md');
const OUT = isGate ? path.join(HERE, 'results', 'gate6_result.json') : path.resolve(arg('--out') ?? '');
const headAtLaunch = git('rev-parse', 'HEAD');
if (!isGate) {
  const rel = path.relative(ROOT, OUT);
  if (!arg('--out') || (!rel.startsWith('..') && !path.isAbsolute(rel))) die('dev runs need --out outside the repository');
} else {
  if (!fs.existsSync(SPEC)) die('GATE_SPEC.md is missing');
  if (!/^\*\*Status\.\*\* Frozen/m.test(fs.readFileSync(SPEC, 'utf8'))) die('GATE_SPEC.md is not marked Frozen (it is still a draft for review)');
  const SHAFILE = path.join(HERE, 'GATE_SPEC.sha256');
  if (!fs.existsSync(SHAFILE)) die('GATE_SPEC.sha256 (the frozen hash of the specification) is missing');
  const frozen = fs.readFileSync(SHAFILE, 'utf8').trim().split(/\s+/)[0];
  if (sha(fs.readFileSync(SPEC)) !== frozen) die(`GATE_SPEC.md does not match its frozen SHA-256 ${frozen}`);
  const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'cognitive', 'experiments/cf06');
  if (dirty) die(`files are not all committed and clean:\n${dirty}`);
  if (fs.existsSync(OUT)) die('the gate6 domain has already been run');
}

const agentFor = (name, family) => {
  const [k, p, , o] = ARMS[name];
  return armAgentV6([k, p === null ? { rhoFixed: E5_FAMILIES[family] } : { ...p }, o]);
};

function matrix(domain, timing) {
  const e5 = [], battery = [];
  for (let i = 0; i < N; i++) {
    const worldLabel = `cf|${domain}|world|${i}`, world = generateWorld(worldLabel);
    for (const family of FAMILIES) for (const name of Object.keys(ARMS)) {
      const t = performance.now();
      const r = runE5({ world, worldLabel, family, kind: ARMS[name][0], makeAgent: agentFor(name, family) });
      timing[name] = (timing[name] ?? 0) + performance.now() - t;
      e5.push({ name, ...r });
    }
    for (const name of BATTERY_ARMS) for (const [task, arm] of BATTERY) {
      const mk = agentFor(name, 'HALF');
      const r = task === 'E2P' ? runE2P({ world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk }) : runTaskV1({ task, world, worldLabel, kind: ARMS[name][0], arm, makeAgent: mk });
      battery.push({ name, cell: `${task}.${arm}`, world: r.world, metric: r.metric, censored: r.censored, excluded: r.excluded ?? false });
    }
  }
  return { e5, battery };
}

function analyse({ e5, battery }, domain) {
  const S = (x) => `cf|stats|${domain}|cf06|${x}`;
  const cell = (family, name) => new Map(e5.filter((r) => r.family === family && r.name === name && !r.excluded).map((r) => [r.world, r]));
  const contrast = (d, label, tag) => ({ contrast: label, sd: sd(d), median: median(d), positive: d.filter((x) => x > 0).length, negative: d.filter((x) => x < 0).length, zero: d.filter((x) => x === 0).length, mde80: d.length > 1 ? 2.8 * sd(d) / Math.sqrt(d.length) : null, ...pairedBootstrap(d, S(tag)) });
  const worldsAll = [...cell('RARE', PRIMARY).keys()].filter((w) => FAMILIES.every((f) => Object.keys(ARMS).every((n) => cell(f, n).has(w)))).sort();
  const mixOf = (name) => worldsAll.map((w) => FAMILIES.reduce((s, f) => s + cell(f, name).get(w).metric, 0));
  const pairFam = (family, a, b, f = (r) => r.metric) => { const A = cell(family, a), B = cell(family, b); return worldsAll.map((w) => f(A.get(w)) - f(B.get(w))); };
  const live = (r) => r.events.filter((e) => !e.skipped);
  const stepsIn = (r, a, b) => live(r).slice(a, b).reduce((s, e) => s + e.blocked + e.after, 0);
  const futileIn = (r, a, b) => live(r).slice(a, b).reduce((s, e) => s + (e.reverses ? 0 : e.ownAfterAttempts) + e.oldPermanentAttempts, 0);
  const fut = (r) => r.diagnostics.futileRetests, afterRev = (r) => r.windows.afterReversed, rhoOf = (r) => r.secondary.volatility.rho;
  const out = { criteria: {}, families: {}, mix: {}, battery: {}, batteryVOL: {}, learning: {}, excludedWorlds: [...new Set(e5.filter((r) => r.excluded).map((r) => r.world))], worldsAnalysed: worldsAll.length };
  const P0 = mixOf(PRIMARY);

  // ---- B1-B4 for a belief arm (the primary; the h-sensitivity arms get their own tags) ----
  const rawCriteria = (name) => {
    const M = mixOf(name), d = {};
    for (const x of FIXED) { const X = mixOf(x); d[`B1_${x}`] = X.map((v, i) => v - M[i]); }
    d.B2_RARE = pairFam('RARE', name, 'MBVI3');
    d.B3_OFTEN = pairFam('OFTEN', 'MBVI3', name);
    d.B4a_OFTEN_afterReversed = pairFam('OFTEN', 'MBVI3', name, afterRev);
    d.B4b_RARE_futile = pairFam('RARE', 'RECALL_01', name, fut);
    return d;
  };
  const LABELS = { B2_RARE: (n) => `${n} - MBVI3 (RARE)`, B3_OFTEN: (n) => `MBVI3 - ${n} (OFTEN)`, B4a_OFTEN_afterReversed: (n) => `steps after reversed events, MBVI3 - ${n} (OFTEN)`, B4b_RARE_futile: (n) => `futile re-tests, RECALL_01 - ${n} (RARE)` };
  const TAGS = { B2_RARE: 'B2', B3_OFTEN: 'B3', B4a_OFTEN_afterReversed: 'B4a', B4b_RARE_futile: 'B4b' };
  const beliefCriteria = (name) => {
    const tag = (x) => (name === PRIMARY ? x : `sens|${name}|${x}`), d = rawCriteria(name), c = {};
    for (const [k, v] of Object.entries(d)) {
      const x = k.startsWith('B1_') ? k.slice(3) : null;
      c[k] = contrast(v, x ? `${x} - ${name}, sum over RARE + HALF + OFTEN` : LABELS[k](name), tag(x ? `B1|${x}` : TAGS[k]));
    }
    return c;
  };
  out.criteria = beliefCriteria(PRIMARY);
  // Every world's difference for every criterion, its distribution, and how much of it the extreme worlds carry.
  const distribution = (d) => {
    const sorted = d.map((v, i) => [worldsAll[i], v]).sort((a, b) => b[1] - a[1]), k = Math.ceil(0.1 * d.length), sum = d.reduce((a, b) => a + b, 0);
    const rest = sorted.slice(k).map(([, v]) => v);
    let erase = 0, left = sum, m = d.length;
    while (m > 0 && left / m > 0) { left -= sorted[erase][1]; erase++; m--; }
    return {
      perWorld: worldsAll.map((w, i) => [w, d[i]]), quantiles: quantiles(d),
      inFavour: d.filter((x) => x > 0).length, against: d.filter((x) => x < 0).length, ties: d.filter((x) => x === 0).length,
      topDecile: { worlds: sorted.slice(0, k).map(([w, v]) => [w, v]), shareOfSum: sum !== 0 ? sorted.slice(0, k).reduce((a, [, v]) => a + v, 0) / sum : null, meanOfTheRest: mean(rest) },
      worldsToEraseTheMean: erase,   // the fewest most favourable worlds whose removal leaves a mean <= 0
    };
  };
  const RAW = rawCriteria(PRIMARY);
  out.criteriaDistribution = Object.fromEntries(Object.entries(RAW).map(([k, d]) => [k, distribution(d)]));
  for (const [task, arm] of BATTERY) {
    const key = `${task}.${arm}`, pick = (n) => new Map(battery.filter((r) => r.name === n && r.cell === key && !r.excluded).map((r) => [r.world, r])), B0 = pick('MBVI3');
    const vs = (n) => { const A = pick(n), d = [...A.keys()].filter((w) => B0.has(w)).sort().map((w) => A.get(w).metric - B0.get(w).metric); return { ...contrast(d, `${n} - MBVI3 (${key})`, `bat|${key}|${n}`), meanArm: mean([...A.values()].map((r) => r.metric)), meanMBVI3: mean([...B0.values()].map((r) => r.metric)) }; };
    out.battery[key] = vs(PRIMARY); out.batteryVOL[key] = vs('VOL');
  }
  for (const name of Object.keys(ARMS)) { const m = mixOf(name); out.mix[name] = { mean: mean(m), median: median(m) }; }
  for (const family of FAMILIES) {
    const F = { p: E5_FAMILIES[family], arms: {}, contrastsVsPrimary: {} };
    for (const name of Object.keys(ARMS)) {
      const xs = [...cell(family, name).values()], vol = xs[0]?.secondary.volatility;
      F.arms[name] = {
        total: mean(xs.map((r) => r.metric)), medianTotal: median(xs.map((r) => r.metric)), blocked: mean(xs.map((r) => r.windows.blocked)), afterReversed: mean(xs.map((r) => r.windows.afterReversed)), afterPermanent: mean(xs.map((r) => r.windows.afterPermanent)),
        cappedEpisodes: xs.reduce((s, r) => s + r.censored, 0), reversedEvents: mean(xs.map((r) => r.reversedEvents)), permanentEvents: mean(xs.map((r) => r.permanentEvents)), skippedEvents: mean(xs.map((r) => r.skippedEvents)),
        workPerDecision: xs[0]?.secondary.compute ? mean(xs.map((r) => r.secondary.compute.backupsPerDecision)) : null,
        rhoEnd: vol ? mean(xs.map(rhoOf)) : null, changesArchived: vol ? mean(xs.map((r) => r.secondary.volatility.opened)) : null, reversalsConfirmed: vol ? mean(xs.map((r) => r.secondary.volatility.confirmed)) : null,
        futileRetests: mean(xs.map(fut)), medianFutileRetests: median(xs.map(fut)),
      };
    }
    for (const name of Object.keys(ARMS).filter((n) => n !== PRIMARY)) F.contrastsVsPrimary[name] = contrast(pairFam(family, name, PRIMARY), `${name} - ${PRIMARY} (${family})`, `fam|${family}|${name}`);
    out.families[family] = F;
  }

  // ---- learning the rate (H-VOL), reported ----
  const V = mixOf('VOL'), T = mixOf('VOL_RHO_TRUE');
  out.learning.L1_mix = contrast(P0.map((v, i) => v - V[i]), `${PRIMARY} - VOL, mix (what learning the rate adds)`, 'L1|mix');
  out.learning.L1_byFamily = Object.fromEntries(FAMILIES.map((f) => [f, contrast(pairFam(f, PRIMARY, 'VOL'), `${PRIMARY} - VOL (${f})`, `L1|${f}`)]));
  out.learning.L2_headroomMix = contrast(P0.map((v, i) => v - T[i]), `${PRIMARY} - VOL_RHO_TRUE, mix (the most any rate learner could add)`, 'L2|mix');
  out.learning.L2_headroomByFamily = Object.fromEntries(FAMILIES.map((f) => [f, contrast(pairFam(f, PRIMARY, 'VOL_RHO_TRUE'), `${PRIMARY} - VOL_RHO_TRUE (${f})`, `L2|${f}`)]));
  out.learning.L3_rho_OFTEN_minus_RARE = contrast(worldsAll.map((w) => rhoOf(cell('OFTEN', 'VOL').get(w)) - rhoOf(cell('RARE', 'VOL').get(w))), 'final rho of VOL, OFTEN - RARE', 'L3');
  out.learning.VOL_minus_VOL_RHO_TRUE_mix = contrast(V.map((v, i) => v - T[i]), 'VOL - VOL_RHO_TRUE, mix (the cost of having to learn the rate)', 'L|ref');
  out.learning.primaryMinusVOLByHalf = Object.fromEntries(FAMILIES.map((f) => {
    const A = cell(f, PRIMARY), B = cell(f, 'VOL');
    return [f, {
      events1to3: contrast(worldsAll.map((w) => stepsIn(A.get(w), 0, 3) - stepsIn(B.get(w), 0, 3)), `${PRIMARY} - VOL, events 1-3 (${f})`, `ev|${f}|early`),
      events4to6: contrast(worldsAll.map((w) => stepsIn(A.get(w), 3, 6) - stepsIn(B.get(w), 3, 6)), `${PRIMARY} - VOL, events 4-6 (${f})`, `ev|${f}|late`),
    }];
  }));
  out.learning.rhoTraces = Object.fromEntries(FAMILIES.map((f) => [f, [...cell(f, 'VOL').values()].slice(0, 10).map((r) => r.secondary.volatility.rhoTrace)]));

  // ---- sensitivity of the primary to the switching hazard h (reported; the verdict uses h = 0.01 only) ----
  out.sensitivity = {};
  for (const [h, name] of Object.entries(SENSITIVITY)) {
    const c = name === PRIMARY ? out.criteria : beliefCriteria(name);
    out.sensitivity[h] = {
      arm: name, contrasts: c, B1holds: FIXED.every((x) => lbPos(c[`B1_${x}`])), B1meansPositive: FIXED.every((x) => c[`B1_${x}`].mean > 0),
      totals: Object.fromEntries(FAMILIES.map((f) => [f, mean([...cell(f, name).values()].map((r) => r.metric))])),
      minusPrimaryMix: name === PRIMARY ? null : contrast(mixOf(name).map((v, i) => v - P0[i]), `${name} - ${PRIMARY}, mix`, `sens|${name}|vsPrimary`),
    };
  }
  { const S3 = Object.values(out.sensitivity); out.hRobustness = S3.every((s) => s.B1holds) ? 'ROBUST' : S3.every((s) => s.B1meansPositive) ? 'DIRECTION ROBUST' : `SENSITIVE TO h (B1 fails at ${Object.entries(out.sensitivity).filter(([, s]) => !s.B1holds).map(([h]) => h).join(', ')})`; }

  // ---- zero-reversal degeneration: RARE worlds whose changes were all permanent ----
  const Z = worldsAll.filter((w) => { const r = cell('RARE', PRIMARY).get(w); return r.reversedEvents === 0 && r.permanentEvents > 0; });
  const zr = (name) => Z.map((w) => cell('RARE', name).get(w));
  const byEvent = (rs, f) => Array.from({ length: E5_PARAMS.events }, (_, k) => { const xs = rs.map((r) => live(r)[k]).filter(Boolean).map(f); return { n: xs.length, mean: mean(xs) }; });
  out.zeroReversal = { worlds: Z.length, shareOfRAREWorlds: worldsAll.length ? Z.length / worldsAll.length : null, arms: {}, contrasts: {} };
  for (const name of ['MBVI3', 'RECALL_003', 'RECALL_01', 'RECALL_03', ...MODEL_ARMS]) {
    const rs = zr(name), isModel = MODEL_ARMS.includes(name);
    out.zeroReversal.arms[name] = {
      steps: mean(rs.map((r) => r.metric)), futileRetests: mean(rs.map(fut)),
      futileEvents1to3: mean(rs.map((r) => futileIn(r, 0, 3))), futileEvents4to6: mean(rs.map((r) => futileIn(r, 3, 6))),
      ownRetestsByEvent: byEvent(rs, (e) => e.ownAfterAttempts), oldRetestsByEvent: byEvent(rs, (e) => e.oldPermanentAttempts),
      rhoAtDetectionByEvent: isModel ? Array.from({ length: E5_PARAMS.events }, (_, k) => { const xs = rs.map((r) => r.diagnostics.alarms.rhoAtDetection[k]).filter((x) => x !== null && x !== undefined); return { n: xs.length, mean: mean(xs) }; }) : null,
      rhoEnd: isModel ? quantiles(rs.map(rhoOf)) : null,
      worldsWithFalseConfirm: isModel ? rs.filter((r) => r.diagnostics.alarms.confirmsFalse > 0).length : null,
    };
  }
  {
    const zd = (a, b, f) => { const A = zr(a), B = zr(b); return A.map((r, i) => f(r) - f(B[i])); };
    const rhoShift = zr('VOL').map((r) => { const d = r.diagnostics.alarms.rhoAtDetection, e = d.slice(0, 3).filter((x) => x !== null), l = d.slice(3).filter((x) => x !== null); return e.length && l.length ? mean(l) - mean(e) : null; }).filter((x) => x !== null);
    out.zeroReversal.contrasts = {
      futile_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, fut), `futile re-tests, VOL - ${PRIMARY} (zero-reversal RARE)`, 'Z|fut'),
      futileEvents1to3_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, (r) => futileIn(r, 0, 3)), `futile re-tests in events 1-3, VOL - ${PRIMARY}`, 'Z|early'),
      futileEvents4to6_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, (r) => futileIn(r, 3, 6)), `futile re-tests in events 4-6, VOL - ${PRIMARY}`, 'Z|late'),
      futile_BELIEF_minus_MBVI3: contrast(zd(PRIMARY, 'MBVI3', fut), `futile re-tests, ${PRIMARY} - MBVI3 (the planner's own floor)`, 'Z|floor'),
      futile_RECALL_01_minus_BELIEF: contrast(zd('RECALL_01', PRIMARY, fut), `futile re-tests, RECALL_01 - ${PRIMARY} (same h)`, 'Z|recall'),
      steps_VOL_minus_BELIEF: contrast(zd('VOL', PRIMARY, (r) => r.metric), `steps, VOL - ${PRIMARY} (zero-reversal RARE)`, 'Z|steps'),
      steps_BELIEF_minus_MBVI3: contrast(zd(PRIMARY, 'MBVI3', (r) => r.metric), `steps, ${PRIMARY} - MBVI3 (zero-reversal RARE)`, 'Z|stepsM'),
      rhoAtDetection_events4to6_minus_1to3_VOL: contrast(rhoShift, 'VOL rho when a change is detected, events 4-6 minus 1-3 (worlds with both)', 'Z|rho'),
    };
  }

  // ---- false alarms of the change detector, against ground truth (evaluation only) ----
  out.alarms = {};
  for (const family of FAMILIES) {
    out.alarms[family] = {};
    for (const name of MODEL_ARMS) {
      const rs = [...cell(family, name).values()], A = rs.map((r) => r.diagnostics.alarms), tot = (k) => A.reduce((s, a) => s + a[k], 0);
      const opens = tot('opensReal') + tot('opensFalse'), confirms = tot('confirmsReal') + tot('confirmsFalse'), changes = rs.reduce((s, r) => s + r.reversedEvents + r.permanentEvents, 0);
      const withFalse = rs.filter((r) => r.diagnostics.alarms.confirmsFalse > 0);
      out.alarms[family][name] = {
        perRun: Object.fromEntries(['opensReal', 'opensFalse', 'opensFalseBeforeFirstChange', 'confirmsReal', 'confirmsFalse', 'changesDetected'].map((k) => [k, rs.length ? tot(k) / rs.length : null])),
        falseOpenShare: opens ? tot('opensFalse') / opens : null, falseConfirmShare: confirms ? tot('confirmsFalse') / confirms : null,
        changesDetectedShare: changes ? tot('changesDetected') / changes : null, worldsWithFalseConfirm: withFalse.length,
        rhoEndWorldsWithFalseConfirm: mean(withFalse.map(rhoOf)), rhoEndWorldsWithout: mean(rs.filter((r) => r.diagnostics.alarms.confirmsFalse === 0).map(rhoOf)),
      };
    }
  }

  // ---- VOL's learned rate, without pooling it away ----
  {
    const share = (r) => r.reversedEvents / Math.max(1, r.reversedEvents + r.permanentEvents), all = FAMILIES.flatMap((f) => [...cell(f, 'VOL').values()]);
    out.rho = {
      byFamily: Object.fromEntries(FAMILIES.map((f) => [f, quantiles([...cell(f, 'VOL').values()].map(rhoOf))])),
      byRealisedReversals: Object.fromEntries(Array.from({ length: E5_PARAMS.events + 1 }, (_, k) => { const xs = all.filter((r) => r.reversedEvents === k).map(rhoOf); return [k, { n: xs.length, mean: mean(xs), sd: sd(xs) }]; })),
      correlationWithRealisedShare: { pooled: pearson(all.map(share), all.map(rhoOf)), ...Object.fromEntries(FAMILIES.map((f) => { const rs = [...cell(f, 'VOL').values()]; return [f, pearson(rs.map(share), rs.map(rhoOf))]; })) },
      perWorldOrdered: worldsAll.filter((w) => rhoOf(cell('RARE', 'VOL').get(w)) < rhoOf(cell('HALF', 'VOL').get(w)) && rhoOf(cell('HALF', 'VOL').get(w)) < rhoOf(cell('OFTEN', 'VOL').get(w))).length,
      // What six changes could teach at best: the Beta(1, 1) posterior if every change's outcome were observed.
      idealObserver: Object.fromEntries(Array.from({ length: E5_PARAMS.events + 1 }, (_, r) => { const a = 1 + r, b = 1 + E5_PARAMS.events - r; return [r, { mean: a / (a + b), sd: Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1))) }]; })),
    };
  }

  // ---- every weighting of the three families (step 1/GRID): where do B1 and L1 hold? ----
  {
    const D = Object.fromEntries(FIXED.map((x) => [x, FAMILIES.map((f) => pairFam(f, x, PRIMARY))])), L = FAMILIES.map((f) => pairFam(f, PRIMARY, 'VOL'));
    const points = [];
    for (let a = 0; a <= GRID; a++) for (let b = 0; a + b <= GRID; b++) {
      const w = [a / GRID, b / GRID, (GRID - a - b) / GRID], parts = {}, weigh = (rows) => worldsAll.map((_, i) => w.reduce((s, wf, j) => s + 3 * wf * rows[j][i], 0));
      for (const x of FIXED) { const bt = pairedBootstrap(weigh(D[x]), S(`grid|${a}|${b}|${x}`)); parts[x] = { mean: bt.mean, lo: bt.lo }; }
      const l = pairedBootstrap(weigh(L), S(`grid|${a}|${b}|L1`));
      points.push({ w, B1: FIXED.every((x) => parts[x].mean > 0 && parts[x].lo > 0), B1means: FIXED.every((x) => parts[x].mean > 0), L1: l.mean > 0 && l.lo > 0, weakestFixed: FIXED.reduce((m, x) => (parts[x].lo < parts[m].lo ? x : m), FIXED[0]), parts, L1part: { mean: l.mean, lo: l.lo } });
    }
    out.weighting = { note: 'weights (RARE, HALF, OFTEN) on the simplex; contrasts scaled by 3 so that equal weights match B1; the equal mix itself is B1', points: points.length, B1holds: points.filter((p) => p.B1).length, B1meansPositive: points.filter((p) => p.B1means).length, L1holds: points.filter((p) => p.L1).length, grid: points };
  }

  // ---- the gain over the planner by category, from the privileged diagnostic arms (ground truth) ----
  //   genuine reversals   MBVI3 - BELIEF_REALONLY over the block and after windows of events that reversed
  //   permanent changes   MBVI3 - BELIEF_REALONLY over the block and after windows of events that did not
  //   false alarms        MBVI3 - BELIEF_FALSEONLY over the whole run
  //   residual            (MBVI3 - BELIEF) - (MBVI3 - BELIEF_REALONLY) - (MBVI3 - BELIEF_FALSEONLY): the interaction
  {
    const evSteps = (rev) => (r) => live(r).filter((e) => e.reverses === rev).reduce((s, e) => s + e.blocked + e.after, 0);
    const exact = (name, kind) => worldsAll.every((w) => FAMILIES.every((f) => cell(f, name).get(w).diagnostics.alarms[kind] === 0));
    const byFamily = (family) => {
      const total = pairFam(family, 'MBVI3', PRIMARY), real = pairFam(family, 'MBVI3', 'BELIEF_REALONLY'), fals = pairFam(family, 'MBVI3', 'BELIEF_FALSEONLY');
      const t = (x) => `${family}|${x}`;
      return {
        total: contrast(total, `MBVI3 - ${PRIMARY} (${family})`, `attr|${t('total')}`),
        genuineChanges: contrast(real, `MBVI3 - BELIEF_REALONLY (${family}): archiving genuine changes only`, `attr|${t('real')}`),
        genuineReversals: contrast(pairFam(family, 'MBVI3', 'BELIEF_REALONLY', evSteps(true)), `MBVI3 - BELIEF_REALONLY, windows of reversed events (${family})`, `attr|${t('realRev')}`),
        genuineAfterReversed: contrast(pairFam(family, 'MBVI3', 'BELIEF_REALONLY', afterRev), `MBVI3 - BELIEF_REALONLY, after reversed events (${family})`, `attr|${t('realAfter')}`),
        permanentChanges: contrast(pairFam(family, 'MBVI3', 'BELIEF_REALONLY', evSteps(false)), `MBVI3 - BELIEF_REALONLY, windows of permanent events (${family})`, `attr|${t('realPerm')}`),
        falseAlarms: contrast(fals, `MBVI3 - BELIEF_FALSEONLY (${family}): archiving false alarms only`, `attr|${t('false')}`),
        residual: contrast(total.map((v, i) => v - real[i] - fals[i]), `interaction residual (${family})`, `attr|${t('resid')}`),
        countsPerRun: Object.fromEntries([PRIMARY, 'BELIEF_REALONLY', 'BELIEF_FALSEONLY'].map((n) => {
          const A = [...cell(family, n).values()].map((r) => r.diagnostics.alarms), avg = (k) => mean(A.map((a) => a[k]));
          return [n, { genuineReversingArchived: avg('opensRealReversing'), genuinePermanentArchived: avg('opensRealPermanent'), falseAlarmsArchived: avg('opensFalse'), genuineReversalsConfirmed: avg('confirmsReal'), falseAlarmsConfirmed: avg('confirmsFalse') }];
        })),
      };
    };
    const mixReal = mixOf('BELIEF_REALONLY'), mixFalse = mixOf('BELIEF_FALSEONLY'), mixM = mixOf('MBVI3');
    out.attribution = {
      note: 'privileged diagnostic arms; every archive classified by the state of the world when it was declared; the agent never sees it',
      splitExact: exact('BELIEF_REALONLY', 'opensFalse') && exact('BELIEF_FALSEONLY', 'opensReal'),
      ...Object.fromEntries(FAMILIES.map((f) => [f, byFamily(f)])),
      mix: {
        total: out.criteria.B1_MBVI3,
        genuineChanges: contrast(mixM.map((v, i) => v - mixReal[i]), 'MBVI3 - BELIEF_REALONLY, mix', 'attr|mix|real'),
        falseAlarms: contrast(mixM.map((v, i) => v - mixFalse[i]), 'MBVI3 - BELIEF_FALSEONLY, mix', 'attr|mix|false'),
        residual: contrast(mixM.map((v, i) => v - P0[i] - (v - mixReal[i]) - (v - mixFalse[i])), 'interaction residual, mix', 'attr|mix|resid'),
      },
    };
  }

  // ---- reported beside it: the same question answered from the primary's own confirmations (weaker: it conditions on
  //      the agent's behaviour, so it is never used as proof of a genuine reversal) ----
  {
    const split = (family) => {
      const P = cell(family, PRIMARY), M = cell(family, 'MBVI3'), fa = (w) => P.get(w).diagnostics.alarms.confirmsFalse;
      const clean = worldsAll.filter((w) => fa(w) === 0), alarmed = worldsAll.filter((w) => fa(w) > 0);
      const g = (ws, f = (r) => r.metric) => ws.map((w) => f(M.get(w)) - f(P.get(w)));
      return {
        worldsWithoutFalseConfirm: clean.length, worldsWithFalseConfirm: alarmed.length,
        worldsWithoutRealConfirm: worldsAll.filter((w) => P.get(w).diagnostics.alarms.confirmsReal === 0).length,
        gainWithoutFalseConfirm: contrast(g(clean), `MBVI3 - ${PRIMARY} (${family}), worlds where ${PRIMARY} confirmed no false alarm`, `src|${family}|clean`),
        gainWithFalseConfirm: contrast(g(alarmed), `MBVI3 - ${PRIMARY} (${family}), worlds where ${PRIMARY} confirmed a false alarm`, `src|${family}|alarmed`),
        afterReversedWithoutFalseConfirm: contrast(g(clean, afterRev), `steps after reversed events, MBVI3 - ${PRIMARY} (${family}), no false confirm`, `src|${family}|cleanAfter`),
        crossingsOfReopenedEdges: contrast(g(worldsAll, (r) => -live(r).reduce((s, e) => s + (e.crossed ?? 0), 0)), `${PRIMARY} - MBVI3 crossings of a reopened edge in its own after-window (${family})`, `src|${family}|cross`),
      };
    };
    out.confirmSplit = { note: 'conditions on the primary\'s own false confirmations; reported only, never proof of a genuine reversal', OFTEN: split('OFTEN'), HALF: split('HALF') };
  }

  const Zc = out.zeroReversal.contrasts, AT = out.attribution;
  const SHAPE_PARTS = [...FIXED.map((x) => `B1_${x}`), 'B3_OFTEN'];
  const shapeFail = (k) => { const D = out.criteriaDistribution[k], why = [];
    if (!(D.inFavour > D.against)) why.push(`${D.inFavour} of ${D.inFavour + D.against + D.ties} worlds in favour`);
    if (!(D.quantiles && D.quantiles.median > 0)) why.push(`median ${D.quantiles ? D.quantiles.median : 'none'}`);
    if (!(D.topDecile.meanOfTheRest > 0)) why.push('no gain without the top 10% of worlds');
    return why; };
  const tail = SHAPE_PARTS.map((k) => [k, shapeFail(k)]).filter(([, w]) => w.length);
  const sourceLabel = (genuine, falseRepair) => (!AT.splitExact ? 'INVALID (the diagnostic split is not exact)'
    : genuine && falseRepair ? 'GENUINE REVERSALS AND FALSE-ALARM REPAIR' : genuine ? 'GENUINE REVERSALS' : falseRepair ? 'FALSE-ALARM REPAIR' : 'NOT ATTRIBUTED');
  out.claims = {
    gainShape: tail.length ? `TAIL-DRIVEN (${tail.map(([k, w]) => `${k}: ${w.join(', ')}`).join('; ')})` : 'CONSISTENT',
    // B3's gain (OFTEN) and B1's gain over the planner (the mix), each read from the diagnostic arms
    gainSource: sourceLabel(lbPos(AT.OFTEN.genuineChanges) && lbPos(AT.OFTEN.genuineAfterReversed), lbPos(AT.OFTEN.falseAlarms)),
    gainSourceMix: sourceLabel(lbPos(AT.mix.genuineChanges), lbPos(AT.mix.falseAlarms)),
    learnedRateAddsValue: lbPos(out.learning.L1_mix) && FAMILIES.every((f) => out.learning.L1_byFamily[f].n > 0 && out.learning.L1_byFamily[f].lo > -MARGIN),
    headroomDetectable: lbPos(out.learning.L2_headroomMix),
    // the registry's headroom rule at this gate's n: knowing the rate must be worth at least twice the effect L1 can detect
    taskCanTestLearning: lbPos(out.learning.L2_headroomMix) && out.learning.L1_mix.mde80 !== null && out.learning.L2_headroomMix.mean >= 2 * out.learning.L1_mix.mde80,
    rateMovesRightWay: lbPos(out.learning.L3_rho_OFTEN_minus_RARE),
    zeroReversalWorlds: Z.length,
    stopsRetesting: Z.length >= Z_MIN && ubBelow(Zc.futile_VOL_minus_BELIEF, 0) && ubBelow(Zc.futileEvents4to6_VOL_minus_BELIEF, 0),
    hRobustness: out.hRobustness,
    weighting: `B1 holds on ${out.weighting.B1holds} of ${out.weighting.points} weightings of the three families`,
  };
  return out;
}

const t1 = await runAllTests(), t2 = await runTestFiles(TEST_FILES);
const tests = { passed: t1.passed + t2.passed, total: t1.total + t2.total, failed: [...t1.failed, ...t2.failed].map((f) => `${f.file} :: ${f.name}`) };
const timingA = {}, timingB = {};
const runA = matrix(DOMAIN, timingA), runB = matrix(DOMAIN, timingB);
const hashA = sha(JSON.stringify(runA)), hashB = sha(JSON.stringify(runB));
const analysis = analyse(runA, DOMAIN);
const C = analysis.criteria;
const criteria = {
  B1_beats_every_fixed_policy_on_the_mix: FIXED.every((x) => lbPos(C[`B1_${x}`])),
  B2_safe_where_retesting_hurts: ubBelow(C.B2_RARE, MARGIN),
  B3_helps_where_changes_reverse: lbPos(C.B3_OFTEN),
  B4_mechanism: lbPos(C.B4a_OFTEN_afterReversed) && lbPos(C.B4b_RARE_futile),
  B5_no_regression: Object.values(analysis.battery).every((c) => ubBelow(c, BATTERY_MARGIN)),
};
const infra = { determinism: hashA === hashB, tests: tests.failed.length === 0 && tests.total > 0 };
const infraOk = Object.values(infra).every(Boolean);
const exceptions = Object.keys(criteria).filter((k) => k !== 'B1_beats_every_fixed_policy_on_the_mix' && !criteria[k]);
const claims = analysis.claims;
const verdict = !infraOk ? 'CF-06 INVALID'
  : !criteria.B1_beats_every_fixed_policy_on_the_mix ? 'CF-06 NOT SUPPORTED (B1)'
  : `${exceptions.length ? `CF-06 SUPPORTED WITH EXCEPTIONS (${exceptions.join(', ')})` : 'CF-06 SUPPORTED'} — ${claims.gainShape}`;
const cappedPrimary = FAMILIES.reduce((s, f) => s + analysis.families[f].arms[PRIMARY].cappedEpisodes, 0);
const result = {
  evidence: 'CF-06 a belief about whether a changed exit will change back (development, not confirmatory)', domain: DOMAIN, worlds: N,
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, headAtLaunch, headAtEnd: git('rev-parse', 'HEAD'), filesClean: isGate },
  resources: { note: 'Not part of the hashed rows', wallClockMsRunA: timingA, wallClockMsRunB: timingB, maxRssKB: process.resourceUsage().maxRSS },
  specSha256: fs.existsSync(SPEC) ? sha(fs.readFileSync(SPEC)) : null,
  parameters: { task: E5_PARAMS, families: E5_FAMILIES, arms: ARMS, primary: PRIMARY, sensitivity: SENSITIVITY, weightGridStep: 1 / GRID, zeroReversalMinimum: Z_MIN, model: VOL_DEFAULTS, margin: MARGIN, batteryMargin: BATTERY_MARGIN, bootstrapResamples: 10000, world: { nodes: 24, edges: 30, maxDegree: 4 } },
  tests, infra, criteria, claims, cappedEpisodesPrimary: cappedPrimary, verdict, analysis, rowsSha256: hashA, rows: runA,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify({ verdict, claims, infra, tests: `${tests.passed}/${tests.total}`, criteria, headAtLaunch, cappedEpisodesPrimary: cappedPrimary }, null, 1));
process.exit(infraOk ? 0 : 1);

// ==========================================================
// GATE-FLOOR-B2 — analysis of the orchestrated block (descriptive; every rule is declared in config.mjs)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, design digest, tree identity, delivery exactness, pairing or recorded events are not
// intact (reports it INVALID and interprets no endpoint).  Primary quantity: per-world paired differences in LEGAL goal
// reaches (E1); every goal reset is the declared sensitivity.  Classification uses the fixed absolute margins in
// config.mjs, never a ratio and never a p-value.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean } from '../xfer1/stats.mjs';
import { deliveryProblems } from '../xfer2/checks.mjs';
import { summarizeEvents, poolArm, pairedRetryComparison, intervalDirection } from '../gate-floor1/finalhop.mjs';

const status = (lower) => (lower >= C.MARGIN.minBenefit ? 'OK' : lower > 0 ? 'NOT_INTERPRETABLE_LOW_BENEFIT' : 'DID_NOT_REPRODUCE');
const okClass = (c) => c === 'NON_INFERIOR' || c === 'EXCEEDS';
const floorModeFor = (arm) => (C.ARMS[arm].floor ? 'on' : 'off');

/** integrity of one record: the audit (floor sessions), the final-hop block against its events and the independent reset record */
export function recordProblems(rec) {
  const p = [];
  const a = rec.audit, f = rec.finalHop;
  if (!a) return ['no audit block'];
  if (!a.reachesEqualLegalPlusNonEdge) p.push('goal resets != legal + non-edge resets');
  if (!a.drawsMatchEnvCounters) p.push('the draw log does not match the environment counters');
  if (rec.reaches.legal !== a.legalReaches || rec.reaches.nonEdge !== a.nonEdgeReaches || rec.reaches.goal !== a.goalReaches) p.push('reach counts disagree between blocks');
  if (!f || !Array.isArray(f.events)) { p.push('no finalHop block'); return p; }
  const s = summarizeEvents(f.events);
  for (const k of ['attempts', 'failures', 'successes', 'failuresPerSuccess', 'zeroSuccess', 'maxFailureRun']) if (s[k] !== f[k]) p.push(`finalHop.${k} ${f[k]} != recomputed from its events ${s[k]}`);
  if (f.drawsIntoGoal !== a.drawsIntoGoal) p.push('finalHop draws-into-goal differs from the audit');
  const succCalls = f.events.filter(e => e[2] === 1).map(e => e[0]);
  if (f.drawsIntoGoal === 0 && JSON.stringify(succCalls) !== JSON.stringify(rec.reaches.legalCalls)) p.push('successful final-hop calls differ from the recorded legal goal-reset calls');
  if (f.drawsIntoGoal === 0 && f.failures !== 0) p.push('final-hop failures without any draw into the goal');
  if (rec.floor) {
    const c = rec.floor.counters;
    if (c.lowered !== 0) p.push(`floor lowered a score ${c.lowered} time(s)`);
    if (c.maxRaise > 100 + 1e-9) p.push(`floor raised a score by ${c.maxRaise} (> 100)`);
    if (c.raised > c.legal || c.legal + c.notLegal !== c.evaluated) p.push('floor counters are inconsistent');
    const goal = rec.input.goal, nb = new Set(f.goalEdges.map(e => e.from));
    for (const k of Object.keys(rec.floor.byEdge)) { const [u, v] = k.split('->').map(Number); if (v !== Number(goal) || !nb.has(u)) p.push(`floor table has a non-goal / non-neighbour edge ${k}`); }
    if (rec.floor.tcFloor !== C.TC_FLOOR) p.push('floor tcFloor differs from the declared value');
  }
  return p;
}

const leastReliableShare = (rec) => {
  const ev = rec.finalHop.events.filter(e => e[2] === 1);
  if (!ev.length) return null;
  const ps = rec.finalHop.goalEdges.map(e => e.p), worst = Math.min(...ps);
  const worstFrom = new Set(rec.finalHop.goalEdges.filter(e => e.p === worst).map(e => e.from));
  return ev.filter(e => worstFrom.has(e[1])).length / ev.length;
};

/** pure core: records = Map label -> session record; plan = plan.json; controls = controls.json.controls */
export function evaluateBlock({ records, plan, controls }) {
  const problems = [], auditFailures = [];
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const perWorld = {};
  for (const w of worlds) {
    const row = {}, seeds = new Set(), cfgs = new Set();
    for (const arm of C.ARM_ORDER) {
      const rec = records.get(`gfb2-${arm}-w${w}`);
      if (!rec) { problems.push(`world ${w}: arm ${arm} has no record`); continue; }
      if (rec.outcome.crashed || !rec.outcome.completed) problems.push(`world ${w}: arm ${arm} did not complete`);
      if (rec.bare === true) problems.push(`world ${w}: arm ${arm} is an uninstrumented record`);
      if (rec.floorMode !== floorModeFor(arm)) problems.push(`world ${w}: arm ${arm} ran floor mode ${rec.floorMode}`);
      if (C.ARMS[arm].floor ? !(rec.floor && rec.floor.on === true) : rec.floor !== null) problems.push(`world ${w}: arm ${arm} floor state does not match the arm`);
      if (!rec.tree.derived || rec.tree.mainSha256 !== C.TREE.derivedMainSha256) problems.push(`world ${w}: arm ${arm} did not run the pinned derived pristine tree`);
      const c = controls[w] && controls[w].arms[arm];
      if (!c) problems.push(`world ${w}: no control record for ${arm}`);
      else problems.push(...deliveryProblems(rec, c.storeHash, c.episodes).map(x => `world ${w} ${arm}: ${x}`));
      const rp = recordProblems(rec);
      if (rp.length) { if (C.ARMS[arm].floor && rp.every(x => /^floor /.test(x))) auditFailures.push({ world: w, arm, problems: rp }); else problems.push(...rp.map(x => `world ${w} ${arm}: ${x}`)); }
      seeds.add(rec.input.agentSeed); cfgs.add(rec.input.acceptedConfigSeed);
      row[arm] = { legal: rec.endpoints.legalReaches, all: rec.endpoints.goalReaches, nonEdge: rec.reaches.nonEdge, attemptSuccess: rec.endpoints.attemptSuccess, slipsPerCall: rec.endpoints.slipsPerCall,
        early: rec.endpoints.earlyReaches, floor: rec.floor ? { ...rec.floor.counters } : null, finalHop: summarizeEvents(rec.finalHop.events), drawsIntoGoal: rec.finalHop.drawsIntoGoal,
        distinctGoalEdges: new Set(rec.finalHop.events.filter(e => e[2] === 1).map(e => e[1])).size, leastReliableShare: leastReliableShare(rec),
        goalEdgePenalty: Array.isArray(rec.goalEdgeState) ? rec.goalEdgeState.reduce((s, e) => s + e.penalty, 0) : null,
        goalEdgeReward: Array.isArray(rec.goalEdgeState) ? rec.goalEdgeState.reduce((s, e) => s + e.reward, 0) : null };
    }
    if (seeds.size !== 1) problems.push(`world ${w}: arms do not share the test seed`);
    if (cfgs.size !== 1) problems.push(`world ${w}: arms do not share the configuration`);
    perWorld[w] = { goal: plan.worlds.find(x => x.world === w).goal, realEpisodes: controls[w] ? controls[w].realEpisodes : null, arms: row };
  }
  const excludedFraction = plan.exclusions ? new Set(plan.exclusions.map(e => e.world)).size / plan.worlds.length : 0;
  const valid = problems.length === 0 && excludedFraction <= C.RULES.maxExcludedFraction && worlds.length > 0;
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), excludedFraction, worlds, designDigest: C.designDigest(),
    decisionDigest: C.decisionDigest(), margin: C.MARGIN, tcFloor: C.TC_FLOOR, outcome: C.OUTCOME };
  if (!valid) { out.verdict = 'INVALID: integrity gate failed; no endpoint is interpreted.'; return out; }

  const val = (arm, k, w) => perWorld[w].arms[arm][k];
  const diffs = (t, r, k = 'legal', subset = worlds) => subset.map(w => val(t, k, w) - val(r, k, w));
  out.perWorld = perWorld;
  out.armMeans = Object.fromEntries(C.ARM_ORDER.map(a => [a, { legal: mean(worlds.map(w => val(a, 'legal', w))), all: mean(worlds.map(w => val(a, 'all', w))), nonEdge: mean(worlds.map(w => val(a, 'nonEdge', w))),
    attemptSuccess: mean(worlds.map(w => val(a, 'attemptSuccess', w))), slipsPerCall: mean(worlds.map(w => val(a, 'slipsPerCall', w))), early: mean(worlds.map(w => val(a, 'early', w))) }]));
  out.benefit = {}; out.benefitAll = {};
  for (const a of C.ARM_ORDER) if (a !== 'COLD') { out.benefit[a] = pairedSummary(diffs(a, 'COLD', 'legal'), C.BOOTSTRAP); out.benefitAll[a] = pairedSummary(diffs(a, 'COLD', 'all'), C.BOOTSTRAP); }
  const i1 = status(out.benefit.REAL.ci.lower), i2 = status(out.benefit.ENTRY_NR.ci.lower);
  out.instrument = { I1_REAL: i1, I2_ENTRY_NR: i2, on: 'legal reaches' };

  const shortfall = (ref, x, k = 'legal', cfg = C.BOOTSTRAP) => { const s = pairedSummary(diffs(ref, x, k), cfg); return { reference: ref, arm: x, shortfall: s, class: C.classifyShortfall(s.ci) }; };
  const cmp = { REAL_vs_COLD_FLOOR: shortfall('REAL', 'COLD_FLOOR'), ENTRY_NR_vs_COLD_FLOOR: shortfall('ENTRY_NR', 'COLD_FLOOR') };
  const cmpAll = { REAL_vs_COLD_FLOOR: shortfall('REAL', 'COLD_FLOOR', 'all'), ENTRY_NR_vs_COLD_FLOOR: shortfall('ENTRY_NR', 'COLD_FLOOR', 'all') };
  out.classifications = cmp; out.classificationsAll = cmpAll;

  const benefitFloorLower = out.benefit.COLD_FLOOR.ci.lower;
  const c1 = benefitFloorLower >= C.MARGIN.minBenefit;
  const c2 = i1 === 'OK' && okClass(cmp.REAL_vs_COLD_FLOOR.class), c3 = i2 === 'OK' && okClass(cmp.ENTRY_NR_vs_COLD_FLOOR.class);
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  out.byGoal = Object.fromEntries(goals.map(gl => {
    const ws = worlds.filter(w => perWorld[w].goal === gl);
    const b = pairedSummary(diffs('COLD_FLOOR', 'COLD', 'legal', ws), C.BOOTSTRAP);
    return [gl, { n: ws.length, COLD: mean(ws.map(w => val('COLD', 'legal', w))),
      benefit: { COLD_FLOOR: b, REAL: pairedSummary(diffs('REAL', 'COLD', 'legal', ws), C.BOOTSTRAP), ENTRY_NR: pairedSummary(diffs('ENTRY_NR', 'COLD', 'legal', ws), C.BOOTSTRAP) },
      benefitAll: pairedSummary(diffs('COLD_FLOOR', 'COLD', 'all', ws), C.BOOTSTRAP), harm: b.ci.upper < 0, floorVsEntry: pairedSummary(diffs('ENTRY_NR', 'COLD_FLOOR', 'legal', ws), C.BOOTSTRAP) }];
  }));
  const harmGroups = goals.filter(gl => out.byGoal[gl].harm);
  const att = pairedSummary(diffs('COLD_FLOOR', 'COLD', 'attemptSuccess'), C.BOOTSTRAP);
  out.attemptSuccess = { COLD_FLOOR_minus_COLD: att, REAL_minus_COLD: pairedSummary(diffs('REAL', 'COLD', 'attemptSuccess'), C.BOOTSTRAP), ENTRY_NR_minus_COLD: pairedSummary(diffs('ENTRY_NR', 'COLD', 'attemptSuccess'), C.BOOTSTRAP) };
  const attemptHarm = att.ci.lower < -C.MARGIN.maxAttemptDrop;
  const c4 = harmGroups.length === 0 && !attemptHarm, c5 = auditFailures.length === 0;
  out.claims = { C1: c1, C2: c2, C3: c3, C4: c4, C5: c5, harmGroups, attemptHarm, auditFailures: auditFailures.slice(0, 10), auditFailureCount: auditFailures.length };

  // declared sensitivity 1: the Bonferroni-3 interval on legal reaches (never decisive)
  const adj = { ...C.BOOTSTRAP, level: 1 - 0.05 / 3 };
  const s1 = pairedSummary(diffs('COLD_FLOOR', 'COLD'), adj), sr = shortfall('REAL', 'COLD_FLOOR', 'legal', adj), se = shortfall('ENTRY_NR', 'COLD_FLOOR', 'legal', adj);
  out.sensitivityBonferroni3 = { level: adj.level, C1_benefitLower: s1.ci.lower, C1_holds: s1.ci.lower >= C.MARGIN.minBenefit, C2_class: sr.class, C2_interval: sr.shortfall.ci, C3_class: se.class, C3_interval: se.shortfall.ci,
    fragile: { C1: c1 !== (s1.ci.lower >= C.MARGIN.minBenefit), C2: cmp.REAL_vs_COLD_FLOOR.class !== sr.class, C3: cmp.ENTRY_NR_vs_COLD_FLOOR.class !== se.class } };
  // declared sensitivity 2: every goal reset (the runtime's own accounting)
  const bAllLower = out.benefitAll.COLD_FLOOR.ci.lower;
  const iAll1 = status(out.benefitAll.REAL.ci.lower), iAll2 = status(out.benefitAll.ENTRY_NR.ci.lower);
  const sensitivityAgrees = (bAllLower >= C.MARGIN.minBenefit) === c1 && cmpAll.REAL_vs_COLD_FLOOR.class === cmp.REAL_vs_COLD_FLOOR.class && cmpAll.ENTRY_NR_vs_COLD_FLOOR.class === cmp.ENTRY_NR_vs_COLD_FLOOR.class;
  out.sensitivityAllResets = { C1_benefitLower: bAllLower, C1_holds: bAllLower >= C.MARGIN.minBenefit, I1: iAll1, I2: iAll2, REAL_vs_COLD_FLOOR: cmpAll.REAL_vs_COLD_FLOOR.class, ENTRY_NR_vs_COLD_FLOOR: cmpAll.ENTRY_NR_vs_COLD_FLOOR.class, agrees: sensitivityAgrees };

  // descriptive diagnostics (no threshold)
  const act = worlds.map(w => val('COLD_FLOOR', 'floor', w));
  out.floorActivation = { sessionsWithRaise: act.filter(f => f.raised > 0).length, sessions: act.length, raisedPerSession: mean(act.map(f => f.raised)), evaluatedPerSession: mean(act.map(f => f.evaluated)),
    nonLegalEvaluatedPerSession: mean(act.map(f => f.notLegal)), legalEvaluatedPerSession: mean(act.map(f => f.legal)) };
  out.worldsFloorBeatsCold = { positive: out.benefit.COLD_FLOOR.positive, negative: out.benefit.COLD_FLOOR.negative, zero: out.benefit.COLD_FLOOR.zero, n: out.benefit.COLD_FLOOR.n };
  const groups = { all: worlds, ...Object.fromEntries(goals.map(gl => [`goal ${gl}`, worlds.filter(w => perWorld[w].goal === gl)])) };
  out.nonEdgeReaches = { byArm: Object.fromEntries(C.ARM_ORDER.map(a => [a, { mean: out.armMeans[a].nonEdge, shareOfResets: out.armMeans[a].nonEdge / out.armMeans[a].all }])),
    vsCOLD: Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD').map(a => [a, pairedSummary(diffs(a, 'COLD', 'nonEdge'), C.BOOTSTRAP)])),
    byGoal: Object.fromEntries(goals.map(gl => { const ws = worlds.filter(w => perWorld[w].goal === gl);
      return [gl, { n: ws.length, byArm: Object.fromEntries(C.ARM_ORDER.map(a => { const nn = mean(ws.map(w => val(a, 'nonEdge', w))), al = mean(ws.map(w => val(a, 'all', w))); return [a, { mean: nn, shareOfResets: al > 0 ? nn / al : null, legal: mean(ws.map(w => val(a, 'legal', w))) }]; })),
        vsCOLD: Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD').map(a => [a, pairedSummary(diffs(a, 'COLD', 'nonEdge', ws), C.BOOTSTRAP)])) }]; })) };
  const fh = { status: C.DIAGNOSTICS.finalHop.status, definition: C.DIAGNOSTICS.finalHop.definition, byArm: {}, comparisons: [], drawsIntoGoal: {} };
  const hop = (arm, ws) => ws.map(w => val(arm, 'finalHop', w));
  for (const [gname, ws] of Object.entries(groups)) fh.byArm[gname] = Object.fromEntries(C.ARM_ORDER.map(a => [a, poolArm(hop(a, ws))]));
  for (const a of C.ARM_ORDER) fh.drawsIntoGoal[a] = worlds.reduce((s, w) => s + val(a, 'drawsIntoGoal', w), 0);
  for (const [a, b] of C.DIAGNOSTICS.finalHop.comparisons) {
    const c = pairedRetryComparison(hop(a, worlds), hop(b, worlds), C.BOOTSTRAP);
    fh.comparisons.push({ arm: a, reference: b, difference: c.difference, ci: c.ci, direction: intervalDirection(c.ci), failures: c.failures });
  }
  out.finalHop = fh;
  const pen = (a) => worlds.map(w => val(a, 'goalEdgePenalty', w)).filter(x => x !== null), rew = (a) => worlds.map(w => val(a, 'goalEdgeReward', w)).filter(x => x !== null);
  out.goalEdgeState = { byArm: Object.fromEntries(C.ARM_ORDER.map(a => [a, { meanSummedPenalty: pen(a).length ? mean(pen(a)) : null, meanSummedReward: rew(a).length ? mean(rew(a)) : null }])),
    penaltyVsCOLD: Object.fromEntries(C.ARM_ORDER.filter(a => a !== 'COLD' && pen(a).length === worlds.length).map(a => [a, pairedSummary(worlds.map(w => val(a, 'goalEdgePenalty', w) - val('COLD', 'goalEdgePenalty', w)), C.BOOTSTRAP)])) };
  out.entryEdgeMix = { byArm: Object.fromEntries(C.ARM_ORDER.map(a => [a, { distinctGoalEdgesPerSession: mean(worlds.map(w => val(a, 'distinctGoalEdges', w))),
    leastReliableShare: mean(worlds.map(w => val(a, 'leastReliableShare', w)).filter(x => x !== null)) }])) };

  const state = { C1: c1, C2: c2, C3: c3, C4: c4, C5: c5 };
  out.predictions = C.PREDICTIONS.map(p => ({ id: p.id, claim: p.claim, text: p.text, predicted: p.predicted, observed: state[p.claim], pass: state[p.claim] === p.predicted }));
  out.verdict = C.interpret({ i1, i2, c1, benefitFloorLower, realClass: cmp.REAL_vs_COLD_FLOOR.class, entryClass: cmp.ENTRY_NR_vs_COLD_FLOOR.class, harm: !c4, audit: c5, sensitivityAgrees });
  out.replication = C.replication({ c1, c2, c3, c4, c5, i1, i2 });
  return out;
}

/** load a block directory; throws on any broken hash */
export function loadBlock(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  const { digest, ...rest } = manifest;
  if (C.hashObject(rest) !== digest) throw new Error('manifest digest does not match its contents');
  if (manifest.selftest) throw new Error('this is a plumbing self-test run; it is not a study block and is not analysed');
  if (manifest.designDigest !== C.designDigest()) throw new Error('the block was run under a different design than the one in config.mjs');
  if (manifest.tree.derivedMainSha256 !== C.TREE.derivedMainSha256 || manifest.tree.pristineMainSha256 !== C.TREE.pristineMainSha256) throw new Error('the block ran a tree other than the pinned one');
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  if (C.hashObject(plan) !== manifest.planSha256) throw new Error('plan.json was altered');
  const ctl = JSON.parse(fs.readFileSync(path.join(dir, 'controls.json'), 'utf8'));
  if (C.hashObject(ctl.controls) !== manifest.controlsSha256) throw new Error('controls.json was altered');
  const records = new Map();
  for (const [file, h] of Object.entries(manifest.sessions)) {
    const text = fs.readFileSync(path.join(dir, 'sessions', file));
    if (C.sha256(text) !== h) throw new Error(`session record altered: ${file}`);
    const rec = JSON.parse(text);
    if (rec.role === 'test') records.set(file.replace(/\.json$/, ''), rec);
  }
  return { manifest, plan, controls: ctl.controls, records };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in')) { console.error('--in is required'); process.exit(2); }
  const { manifest, plan, controls, records } = loadBlock(path.resolve(flag('--in')));
  const s = evaluateBlock({ records, plan, controls });
  s.manifestDigest = manifest.digest; s.tree = manifest.tree;
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(s, null, 1));
  const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
  console.log(`block ${s.block}: valid=${s.valid}; worlds ${s.worlds.length}; excluded fraction ${s.excludedFraction.toFixed(3)}`);
  if (!s.valid) { console.log(s.verdict); console.log(s.problems.join('\n')); process.exit(1); }
  console.log(`instruments (legal reaches): I1(REAL) ${s.instrument.I1_REAL}; I2(ENTRY_NR) ${s.instrument.I2_ENTRY_NR}`);
  console.log('arm            legal   all resets  non-edge  attempt success   benefit (legal) vs COLD [95% CI]');
  for (const a of C.ARM_ORDER) {
    const m = s.armMeans[a], b = s.benefit[a];
    console.log(`${a.padEnd(13)} ${f(m.legal).padStart(7)} ${f(m.all).padStart(10)} ${f(m.nonEdge).padStart(9)} ${f(m.attemptSuccess, 3).padStart(10)}      ${b ? `${f(b.mean).padStart(7)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]` : ''}`);
  }
  console.log(`\nmargins: DELTA ${C.MARGIN.delta}, MIN_BENEFIT ${C.MARGIN.minBenefit}, MAX_ATTEMPT_DROP ${C.MARGIN.maxAttemptDrop}`);
  for (const [k, v] of Object.entries(s.classifications)) console.log(`  ${k.padEnd(24)} shortfall ${f(v.shortfall.mean).padStart(7)} [${f(v.shortfall.ci.lower)}, ${f(v.shortfall.ci.upper)}]  ${v.class}  | all resets: ${s.classificationsAll[k].class} ${f(s.classificationsAll[k].shortfall.mean)}`);
  console.log('\nby goal (legal-reach benefit of COLD_FLOOR over COLD):');
  for (const [g, v] of Object.entries(s.byGoal)) console.log(`  goal ${g} n=${v.n}  ${f(v.benefit.COLD_FLOOR.mean)} [${f(v.benefit.COLD_FLOOR.ci.lower)}, ${f(v.benefit.COLD_FLOOR.ci.upper)}]  harm=${v.harm}`);
  console.log(`attempt success COLD_FLOOR - COLD ${f(s.attemptSuccess.COLD_FLOOR_minus_COLD.mean, 3)} [${f(s.attemptSuccess.COLD_FLOOR_minus_COLD.ci.lower, 3)}, ${f(s.attemptSuccess.COLD_FLOOR_minus_COLD.ci.upper, 3)}]`);
  console.log('\nnon-graph goal resets (B2 has no N1): mean per session and share of all resets, by arm and goal group');
  for (const [gname, row] of [['all', s.nonEdgeReaches.byArm], ...Object.entries(s.nonEdgeReaches.byGoal).map(([g, v]) => [`goal ${g}`, v.byArm])]) console.log(`  ${gname.padEnd(8)} ` + C.ARM_ORDER.map(a => `${a} ${f(row[a].mean)} (${f(100 * (row[a].shareOfResets ?? 0), 0)}%)`).join(' | '));
  console.log(`final-hop: draws into the goal ${JSON.stringify(s.finalHop.drawsIntoGoal)}; failures ${C.ARM_ORDER.map(a => `${a} ${s.finalHop.byArm.all[a].failures}`).join(', ')} (degenerate on B2: a goal entry takes no environment draw)`);
  console.log(`goal-edge shortcut penalty (end state, mean summed over the goal's edges): ${C.ARM_ORDER.map(a => `${a} ${f(s.goalEdgeState.byArm[a].meanSummedPenalty, 2)}`).join(' | ')}`);
  console.log(`sensitivity (all resets): C1 lower ${f(s.sensitivityAllResets.C1_benefitLower)} -> agrees ${s.sensitivityAllResets.agrees}`);
  console.log(`claims: ${Object.entries(s.claims).filter(([k]) => /^C\d$/.test(k)).map(([k, v]) => `${k}=${v}`).join(' ')}  replication: ${s.replication}`);
  console.log('\npredictions:'); for (const p of s.predictions) console.log(`  ${p.id} ${p.pass ? 'HELD' : 'FAILED'}  ${p.text}`);
  console.log('\n' + s.verdict);
}

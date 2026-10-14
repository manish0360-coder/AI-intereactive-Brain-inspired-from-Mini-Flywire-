// ==========================================================
// GATE-FLOOR-1 — analysis of the orchestrated block (descriptive; every rule is declared in config.mjs)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, design digest, tree identity, delivery exactness or pairing is not intact (reports it
// INVALID and interprets no endpoint).  Primary quantity: per-world paired differences in goal reaches (E1).
// Classification uses the fixed absolute margins in config.mjs, never a ratio and never a p-value.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean } from '../xfer1/stats.mjs';
import { deliveryProblems } from '../xfer2/checks.mjs';
import { floorModeFor } from './arms.mjs';
import { summarizeEvents, poolArm, pairedRetryComparison, intervalDirection } from './finalhop.mjs';

const E1 = 0, E2 = 1;                      // goalReaches, attemptSuccess (ENDPOINTS order)
const status = (lower) => (lower >= C.MARGIN.minBenefit ? 'OK' : lower > 0 ? 'NOT_INTERPRETABLE_LOW_BENEFIT' : 'DID_NOT_REPRODUCE');
const okClass = (c) => c === 'NON_INFERIOR' || c === 'EXCEEDS';

/** the no-shortcut audit of one session record (the floor-specific conditions apply when the floor ran) */
export function auditProblems(rec) {
  const p = [];
  const a = rec.audit;
  if (!a) return ['no audit block'];
  if (a.nonEdgeAttempts !== 0) p.push(`${a.nonEdgeAttempts} environment draw(s) were not a graph edge`);
  if (a.goalFlagMismatch !== 0) p.push(`${a.goalFlagMismatch} goal-entering flag mismatch(es)`);
  if (!a.goalReachesEqualEnteringSuccesses) p.push(`goal reaches ${a.goalReaches} != successful goal-entering draws ${a.goalEnteringSuccesses}`);
  if (a.blockedIllegal !== 0) p.push(`${a.blockedIllegal} illegal move(s) blocked by the N1 guard`);
  if (rec.floor) {
    const c = rec.floor.counters;
    if (c.notLegal !== 0) p.push(`floor evaluated ${c.notLegal} non-legal candidate(s)`);
    if (c.lowered !== 0) p.push(`floor lowered a score ${c.lowered} time(s)`);
    if (c.maxRaise > 100 + 1e-9) p.push(`floor raised a score by ${c.maxRaise} (> 100)`);
    const goal = rec.input.goal;
    for (const k of Object.keys(rec.floor.byEdge)) if (Number(k.split('->')[1]) !== Number(goal)) p.push(`floor table has a non-goal edge ${k}`);
    if (rec.floor.tcFloor !== C.TC_FLOOR) p.push('floor tcFloor differs from the declared value');
  }
  return p;
}

/** the final-hop block of one record must be the aggregation of its own recorded events and agree with the independent records */
export function finalHopProblems(rec) {
  const f = rec.finalHop;
  if (!f || !Array.isArray(f.events)) return ['no finalHop block'];
  const p = [];
  const s = summarizeEvents(f.events);
  for (const k of ['attempts', 'failures', 'successes', 'failuresPerSuccess', 'zeroSuccess', 'maxFailureRun']) if (s[k] !== f[k]) p.push(`finalHop.${k} ${f[k]} != recomputed from its events ${s[k]}`);
  if (f.attempts !== (rec.audit && rec.audit.goalEnteringAttempts)) p.push('finalHop attempts differ from the audit goal-entering attempts');
  if (f.successes !== rec.reaches.goal) p.push(`finalHop successes ${f.successes} != goal reaches ${rec.reaches.goal}`);
  const calls = f.events.filter(e => e[2] === 1).map(e => e[0]);
  if (JSON.stringify(calls) !== JSON.stringify(rec.reaches.goalCalls)) p.push('successful final-hop calls differ from the recorded goal-reset calls');
  return p;
}

/** pure core: records = Map label -> session record; plan = plan.json; controls = controls.json.controls */
export function evaluateBlock({ records, plan, controls }) {
  const problems = [];
  const auditFailures = [];
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const perWorld = {};
  for (const w of worlds) {
    const row = {};
    const seeds = new Set(), cfgs = new Set();
    for (const arm of C.ARM_ORDER) {
      const rec = records.get(`gf1-${arm}-w${w}`);
      if (!rec) { problems.push(`world ${w}: arm ${arm} has no record`); continue; }
      if (rec.outcome.crashed || !rec.outcome.completed) problems.push(`world ${w}: arm ${arm} did not complete`);
      if (rec.h1r.drawFaults !== 0 || rec.h1r.blockedIllegal !== 0) problems.push(`world ${w}: arm ${arm} has instrument faults`);
      if (rec.floorMode !== floorModeFor(arm)) problems.push(`world ${w}: arm ${arm} ran floor mode ${rec.floorMode}`);
      if (C.ARMS[arm].floor ? !(rec.floor && rec.floor.on === true) : rec.floor !== null) problems.push(`world ${w}: arm ${arm} floor state does not match the arm`);
      if (!rec.tree.floorTree || rec.tree.mainSha256 !== C.TREE.floorMainSha256) problems.push(`world ${w}: arm ${arm} did not run the pinned floor tree`);
      const c = controls[w] && controls[w].arms[arm];
      if (!c) problems.push(`world ${w}: no control record for ${arm}`);
      else problems.push(...deliveryProblems(rec, c.storeHash, c.episodes).map(x => `world ${w} ${arm}: ${x}`));
      problems.push(...finalHopProblems(rec).map(x => `world ${w} ${arm}: ${x}`));
      const ap = auditProblems(rec);
      if (ap.length) { if (C.ARMS[arm].floor) auditFailures.push({ world: w, arm, problems: ap }); else problems.push(...ap.map(x => `world ${w} ${arm}: ${x}`)); }
      seeds.add(rec.input.agentSeed); cfgs.add(rec.input.acceptedConfigSeed);
      row[arm] = C.ENDPOINTS.map(e => rec.endpoints[e]);
      row[arm].floor = rec.floor ? rec.floor.counters : null;
      row[arm].finalHop = rec.finalHop ? summarizeEvents(rec.finalHop.events || []) : null;
    }
    if (seeds.size !== 1) problems.push(`world ${w}: arms do not share the test seed`);
    if (cfgs.size !== 1) problems.push(`world ${w}: arms do not share the configuration`);
    perWorld[w] = { goal: plan.worlds.find(x => x.world === w).goal, realEpisodes: controls[w] ? controls[w].realEpisodes : null, arms: row };
  }
  const excludedFraction = plan.exclusions ? new Set(plan.exclusions.map(e => e.world)).size / plan.worlds.length : 0;
  const valid = problems.length === 0 && excludedFraction <= C.RULES.maxExcludedFraction && worlds.length > 0;
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), excludedFraction, worlds, designDigest: C.designDigest(), margin: C.MARGIN, tcFloor: C.TC_FLOOR };
  if (!valid) { out.verdict = 'INVALID: integrity gate failed; no endpoint is interpreted.'; return out; }

  const diffs = (t, r, subset = worlds, k = E1) => subset.map(w => perWorld[w].arms[t][k] - perWorld[w].arms[r][k]);
  out.perWorld = perWorld;
  out.armMeans = Object.fromEntries(C.ARM_ORDER.map(a => [a, Object.fromEntries(C.ENDPOINTS.map((e, k) => [e, mean(worlds.map(w => perWorld[w].arms[a][k]))]))]));
  out.contrasts = C.CONTRASTS.map(([name, t, r]) => ({ name, treatment: t, reference: r, endpoints: Object.fromEntries(C.ENDPOINTS.map((e, k) => [e, pairedSummary(diffs(t, r, worlds, k), C.BOOTSTRAP)])) }));
  out.benefit = {};
  for (const a of C.ARM_ORDER) if (a !== 'COLD') out.benefit[a] = pairedSummary(diffs(a, 'COLD'), C.BOOTSTRAP);

  // instruments
  const i1 = status(out.benefit.REAL.ci.lower), i2 = status(out.benefit.ENTRY_NR.ci.lower);
  out.instrument = { I1_REAL: i1, I2_ENTRY_NR: i2 };

  // shortfall classification: reference - arm, per world
  const shortfall = (ref, x, cfg = C.BOOTSTRAP) => { const s = pairedSummary(diffs(ref, x), cfg); return { reference: ref, arm: x, shortfall: s, class: C.classifyShortfall(s.ci) }; };
  const cmp = { REAL_vs_COLD_FLOOR: shortfall('REAL', 'COLD_FLOOR'), ENTRY_NR_vs_COLD_FLOOR: shortfall('ENTRY_NR', 'COLD_FLOOR') };
  out.classifications = cmp;

  // claims
  const benefitFloorLower = out.benefit.COLD_FLOOR.ci.lower;
  const c1 = benefitFloorLower >= C.MARGIN.minBenefit;
  const c2 = i1 === 'OK' && okClass(cmp.REAL_vs_COLD_FLOOR.class);
  const c3 = i2 === 'OK' && okClass(cmp.ENTRY_NR_vs_COLD_FLOOR.class);
  // C4: goal groups (unadjusted 95% intervals, deliberately) and per-attempt success
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  out.byGoal = Object.fromEntries(goals.map(gl => {
    const ws = worlds.filter(w => perWorld[w].goal === gl);
    const b = pairedSummary(diffs('COLD_FLOOR', 'COLD', ws), C.BOOTSTRAP);
    return [gl, { n: ws.length, COLD: mean(ws.map(w => perWorld[w].arms.COLD[E1])),
      benefit: { COLD_FLOOR: b, REAL: pairedSummary(diffs('REAL', 'COLD', ws), C.BOOTSTRAP), ENTRY_NR: pairedSummary(diffs('ENTRY_NR', 'COLD', ws), C.BOOTSTRAP) },
      harm: b.ci.upper < 0, flooredBelowMargin: b.ci.lower <= -C.MARGIN.delta,
      floorVsEntry: pairedSummary(diffs('ENTRY_NR', 'COLD_FLOOR', ws), C.BOOTSTRAP) }];
  }));
  const harmGroups = goals.filter(gl => out.byGoal[gl].harm);
  const attempt = pairedSummary(diffs('COLD_FLOOR', 'COLD', worlds, E2), C.BOOTSTRAP);
  out.attemptSuccess = { COLD_FLOOR_minus_COLD: attempt, REAL_minus_COLD: pairedSummary(diffs('REAL', 'COLD', worlds, E2), C.BOOTSTRAP), ENTRY_NR_minus_COLD: pairedSummary(diffs('ENTRY_NR', 'COLD', worlds, E2), C.BOOTSTRAP) };
  const attemptHarm = attempt.ci.lower < -C.MARGIN.maxAttemptDrop;
  const c4 = harmGroups.length === 0 && !attemptHarm;
  const c5 = auditFailures.length === 0;
  out.claims = { C1: c1, C2: c2, C3: c3, C4: c4, C5: c5, harmGroups, attemptHarm, auditFailures: auditFailures.slice(0, 10), auditFailureCount: auditFailures.length };

  // declared sensitivity (reported, never decides): the three primary comparisons at a Bonferroni level
  const adj = { ...C.BOOTSTRAP, level: 1 - 0.05 / 3 };
  const s1 = pairedSummary(diffs('COLD_FLOOR', 'COLD'), adj);
  const sr = shortfall('REAL', 'COLD_FLOOR', adj), se = shortfall('ENTRY_NR', 'COLD_FLOOR', adj);
  out.sensitivityBonferroni3 = {
    level: adj.level,
    C1_benefitLower: s1.ci.lower, C1_holds: s1.ci.lower >= C.MARGIN.minBenefit,
    C2_class: sr.class, C2_interval: sr.shortfall.ci, C3_class: se.class, C3_interval: se.shortfall.ci,
    fragile: { C1: c1 !== (s1.ci.lower >= C.MARGIN.minBenefit), C2: cmp.REAL_vs_COLD_FLOOR.class !== sr.class, C3: cmp.ENTRY_NR_vs_COLD_FLOOR.class !== se.class },
  };

  // descriptive: how often and where the floor acted (activation, not an outcome)
  const act = worlds.map(w => perWorld[w].arms.COLD_FLOOR.floor);
  out.floorActivation = {
    sessionsWithRaise: act.filter(f => f.raised > 0).length, sessions: act.length,
    raisedPerSession: mean(act.map(f => f.raised)), evaluatedPerSession: mean(act.map(f => f.evaluated)),
    raisedShareOfEvaluations: mean(act.map(f => (f.evaluated ? f.raised / f.evaluated : 0))),
  };
  out.worldsFloorBeatsCold = { positive: out.benefit.COLD_FLOOR.positive, negative: out.benefit.COLD_FLOOR.negative, zero: out.benefit.COLD_FLOOR.zero, n: out.benefit.COLD_FLOOR.n };

  // final-hop retry diagnostic (descriptive; no threshold; independent of C1-C5)
  const hop = (arm, ws) => ws.map(w => perWorld[w].arms[arm].finalHop);
  const groups = { all: worlds, ...Object.fromEntries(goals.map(gl => [`goal ${gl}`, worlds.filter(w => perWorld[w].goal === gl)])) };
  const fh = { status: C.DIAGNOSTICS.finalHop.status, definition: C.DIAGNOSTICS.finalHop.definition, byArm: {}, comparisons: [], zeroSuccess: {} };
  for (const [gname, ws] of Object.entries(groups)) {
    fh.byArm[gname] = Object.fromEntries(C.ARM_ORDER.map(a => [a, poolArm(hop(a, ws))]));
    fh.zeroSuccess[gname] = Object.fromEntries(C.ARM_ORDER.map(a => [a, { sessions: ws.length, zeroSuccessSessions: fh.byArm[gname][a].zeroSuccessSessions, worlds: ws.filter(w => perWorld[w].arms[a].finalHop.zeroSuccess) }]));
  }
  for (const [a, b] of C.DIAGNOSTICS.finalHop.comparisons) {
    const row = { arm: a, reference: b, groups: {} };
    for (const [gname, ws] of Object.entries(groups)) {
      const c = pairedRetryComparison(hop(a, ws), hop(b, ws), C.BOOTSTRAP);
      row.groups[gname] = { ...c, direction: intervalDirection(c.ci) };
    }
    fh.comparisons.push(row);
  }
  const dirOf = (a, b) => fh.comparisons.find(x => x.arm === a && x.reference === b).groups.all.direction;
  fh.floorRetryLoad = { vsCOLD: dirOf('COLD_FLOOR', 'COLD'), vsENTRY_NR: dirOf('COLD_FLOOR', 'ENTRY_NR'), vsREAL: dirOf('COLD_FLOOR', 'REAL') };
  fh.routingCapabilityWordingAllowed = !Object.values(fh.floorRetryLoad).includes('HIGHER');   // wording guard only; changes no claim
  out.finalHop = fh;

  // predictions declared in config.mjs
  const state = { C1: c1, C2: c2, C3: c3, C4: c4, C5: c5 };
  out.predictions = C.PREDICTIONS.map(p => ({ id: p.id, claim: p.claim, text: p.text, predicted: p.predicted, observed: state[p.claim], pass: state[p.claim] === p.predicted }));
  out.verdict = C.interpret({ i1, i2, c1, benefitFloorLower, realClass: cmp.REAL_vs_COLD_FLOOR.class, entryClass: cmp.ENTRY_NR_vs_COLD_FLOOR.class, harm: !c4, audit: c5 });
  return out;
}

/** load a block directory; throws on any broken hash */
export function loadBlock(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  const { digest, ...rest } = manifest;
  if (C.hashObject(rest) !== digest) throw new Error('manifest digest does not match its contents');
  if (manifest.designDigest !== C.designDigest()) throw new Error('the block was run under a different design than the one in config.mjs');
  if (manifest.tree.mainSha256 !== C.TREE.floorMainSha256 || manifest.tree.parentMainSha256 !== C.TREE.parentMainSha256) throw new Error('the block ran a tree other than the pinned one');
  if (manifest.selftest) throw new Error('this is a plumbing self-test run; it is not a study block and is not analysed');
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
  console.log(`instruments: I1(REAL) ${s.instrument.I1_REAL}; I2(ENTRY_NR) ${s.instrument.I2_ENTRY_NR}`);
  console.log('arm              goalReaches   benefit vs COLD [95% CI]');
  for (const a of C.ARM_ORDER) {
    const m = s.armMeans[a].goalReaches;
    if (a === 'COLD') { console.log(`${a.padEnd(16)} ${f(m).padStart(9)}`); continue; }
    const b = s.benefit[a];
    console.log(`${a.padEnd(16)} ${f(m).padStart(9)}   ${f(b.mean).padStart(7)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]`);
  }
  console.log(`\nmargins: DELTA ${C.MARGIN.delta}, MIN_BENEFIT ${C.MARGIN.minBenefit}, MAX_ATTEMPT_DROP ${C.MARGIN.maxAttemptDrop}`);
  for (const [k, v] of Object.entries(s.classifications)) console.log(`  ${k.padEnd(24)} shortfall ${f(v.shortfall.mean).padStart(7)} [${f(v.shortfall.ci.lower)}, ${f(v.shortfall.ci.upper)}]  ${v.class}`);
  console.log('\nby goal (benefit of COLD_FLOOR over COLD):');
  for (const [g, v] of Object.entries(s.byGoal)) console.log(`  goal ${g} n=${v.n}  ${f(v.benefit.COLD_FLOOR.mean)} [${f(v.benefit.COLD_FLOOR.ci.lower)}, ${f(v.benefit.COLD_FLOOR.ci.upper)}]  harm=${v.harm}`);
  console.log(`attempt success COLD_FLOOR - COLD ${f(s.attemptSuccess.COLD_FLOOR_minus_COLD.mean, 3)} [${f(s.attemptSuccess.COLD_FLOOR_minus_COLD.ci.lower, 3)}, ${f(s.attemptSuccess.COLD_FLOOR_minus_COLD.ci.upper, 3)}]`);
  console.log('\nfinal-hop retry diagnostic (descriptive, no threshold): pooled failed attempts per successful goal-entry traversal');
  for (const a of C.ARM_ORDER) { const x = s.finalHop.byArm.all[a]; console.log(`  ${a.padEnd(11)} attempts ${String(x.attempts).padStart(6)} failures ${String(x.failures).padStart(6)} successes ${String(x.successes).padStart(6)}  fail/succ ${f(x.failuresPerSuccess, 3)}  zero-success sessions ${x.zeroSuccessSessions}/${x.sessions}  max failure run ${x.maxFailureRun}`); }
  for (const c of s.finalHop.comparisons) { const g = c.groups.all; console.log(`  ${(c.arm + ' - ' + c.reference).padEnd(24)} fail/succ diff ${f(g.difference, 3)} [${f(g.ci && g.ci.lower, 3)}, ${f(g.ci && g.ci.upper, 3)}] ${g.direction}`); }
  console.log(`  routing-capability wording allowed: ${s.finalHop.routingCapabilityWordingAllowed}`);
  console.log(`claims: ${Object.entries(s.claims).filter(([k]) => /^C\d$/.test(k)).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.log('\npredictions:'); for (const p of s.predictions) console.log(`  ${p.id} ${p.pass ? 'HELD' : 'FAILED'}  ${p.text}`);
  console.log('\n' + s.verdict);
}

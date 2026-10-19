// ==========================================================
// GATE-FLOOR-SCOPE (design C') — analysis of the orchestrated block (every rule is declared in config.mjs; DESIGN.md sections 5-8)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, design digest, tree identity, driver identity, store delivery, pairing, condition integrity, reach accounting
// or recorded numbers are not intact (reports it INVALID and interprets no claim).  Primary outcome: LEGAL goal reaches per 1,500-call test
// session; non-graph resets, total resets and the stale/decision split are carried separately.  {PS1, PS2, PS3} are decided at the Bonferroni-3
// level; instruments, secondary contrasts and the diagnostics use the unadjusted 95 % interval; no p-value decides anything.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean, sd } from '../xfer1/stats.mjs';
import { deliveryProblems } from '../xfer2/checks.mjs';
import { integrityProblems } from '../gate-floor-prodsem/analyze.mjs';
import { ratioCi, ARRIVAL_CLASSES } from './diag.mjs';

const Z = 1.959964 + 0.841621;                       // z(0.975) + z(0.80): the sizing constant of earlier milestones (2.8)
const CELL = Object.fromEntries(C.CELLS.map(c => [c.name, c]));
const sumClasses = (o) => ARRIVAL_CLASSES.reduce((s, k) => s + (o && Number.isFinite(o[k]) ? o[k] : NaN), 0);

/** completeness of a record under its guard setting, recomputed from raw counters (the session's own ok flag is not trusted) */
export function completenessProblems(rec, setting) {
  const p = [], g = rec.guard && rec.guard.counters, mc = rec.moveClass, d = rec.diag;
  if (!g || !mc) return ['no guard / decision record'];
  if (setting === 'both') {
    if (rec.reaches.nonEdge !== 0) p.push(`non-graph resets ${rec.reaches.nonEdge} under the bundle`);
    if (mc.nonGraph !== 0) p.push(`non-graph decisions ${mc.nonGraph} under the bundle`);
    if (g.admitted !== 0) p.push(`${g.admitted} non-graph candidate(s) admitted under the bundle`);
    if (!d || d.illegalExecuted !== 0) p.push(`illegal executions ${d ? d.illegalExecuted : 'unknown'} under the bundle`);
  } else if (setting === 'mask') {
    if (mc.nonGraph !== 0) p.push(`non-graph decisions ${mc.nonGraph} under the mask`);
    if (g.admitted !== 0) p.push(`${g.admitted} non-graph candidate(s) admitted under the mask`);
    if (g.blockedIllegal !== 0) p.push(`blocked ${g.blockedIllegal} execution(s) with the execution guard off`);
  } else {
    if (g.maskedOut !== 0) p.push(`masked ${g.maskedOut} candidate(s) with the guard off`);
    if (g.blockedIllegal !== 0) p.push(`blocked ${g.blockedIllegal} execution(s) with the guard off`);
  }
  return p;
}

/** the diagnostic's accounting identities, recomputed from the record (I9) */
export function diagProblems(rec) {
  const d = rec.diag, p = [];
  if (!d || !d.arrivals || !d.resets) return ['no diagnostic record'];
  if (sumClasses(d.resets.legal) !== rec.reaches.legal) p.push('legal reset classes do not sum to the legal reaches');
  if (sumClasses(d.resets.nonGraph) !== rec.reaches.nonEdge) p.push('non-graph reset classes do not sum to the non-graph resets');
  if (d.blocked !== rec.guard.counters.blockedIllegal) p.push('blocked arrivals differ from the pinned line\'s own counter');
  if (!(d.arrivals.total <= rec.counters.calls)) p.push('more arrivals than calls');
  if (d.arrivals.duplicateCalls !== 0) p.push('a call with more than one arrival');
  if (ARRIVAL_CLASSES.reduce((s, k) => s + d.arrivals.byClass[k].n, 0) !== d.arrivals.total) p.push('arrival classes do not sum to the arrivals');
  if (d.channels.stale !== d.resets.nonGraph.STALE || d.channels.decision !== d.resets.nonGraph.FRESH || d.channels.decisionCarried !== d.resets.nonGraph.CARRIED || d.channels.unclassified !== d.resets.nonGraph.UNCLASSIFIED) p.push('channel record disagrees with the reset classes');
  return p;
}

/** integrity of one TEST session record; returns { invalid, I2, I3, I9 } (I2/I3/I9 void claims or the diagnostic; the rest invalidate the block) */
export function recordProblems(rec, cell) {
  const invalid = [], I2 = [], I3 = [], I9 = [];
  invalid.push(...integrityProblems(rec.conditionIntegrity));
  if (rec.endpoints.attemptSuccess !== null) invalid.push('per-attempt success was recorded: an environment draw exists under state P');
  const a = rec.audit;
  if (!a) { invalid.push('no audit block'); return { invalid, I2, I3, I9 }; }
  if (!a.reachesEqualLegalPlusNonEdge) invalid.push('goal resets != legal + non-graph resets');
  if (rec.reaches.legal !== a.legalReaches || rec.reaches.nonEdge !== a.nonEdgeReaches || rec.reaches.goal !== a.goalReaches) invalid.push('reach counts disagree between blocks');
  if (rec.endpoints.legalReaches !== rec.reaches.legal || rec.endpoints.goalReaches !== rec.reaches.goal) invalid.push('endpoint reach counts disagree with the reach record');
  if (!rec.tree.derived || rec.tree.mainSha256 !== C.GUARD_TREE.guardMainSha256) invalid.push('the session did not run the pinned guard tree');
  const st = C.GUARD_SETTINGS[cell.guard];
  if (!rec.guard || rec.guardSetting !== cell.guard || rec.guard.setting !== cell.guard || rec.guard.mask !== st.mask || rec.guard.exec !== st.exec) invalid.push(`the session ran guard setting ${rec.guardSetting} for cell ${cell.name}`);
  if (!rec.guard || rec.guard.diag !== true || !rec.diag) invalid.push('the session ran without the diagnostic');
  if (invalid.length) return { invalid, I2, I3, I9 };
  const gc = rec.guardCompleteness;
  if (!gc || gc.nonGraphResets !== rec.reaches.nonEdge || gc.nonGraphDecisions !== rec.moveClass.nonGraph || gc.illegalExecutions !== rec.diag.illegalExecuted) invalid.push('guard-completeness record disagrees with the reach / decision / diagnostic records');
  I3.push(...completenessProblems(rec, cell.guard));
  I9.push(...diagProblems(rec));
  if (!(rec.floor && rec.floor.on === true) || rec.floorMode !== 'on') invalid.push('a test cell did not run the floor');
  else {
    const c = rec.floor.counters;
    if (c.lowered !== 0) I2.push(`floor lowered a score ${c.lowered} time(s)`);
    if (c.maxRaise > 100 + 1e-9) I2.push(`floor raised a score by ${c.maxRaise} (> 100)`);
    if (c.raised > c.legal || c.legal + c.notLegal !== c.evaluated) I2.push('floor counters are inconsistent');
    const goal = Number(rec.input.goal), nb = new Set((rec.finalHop.goalEdges || []).map(e => e.from));
    for (const k of Object.keys(rec.floor.byEdge)) { const [u, v] = k.split('->').map(Number); if (v !== goal || !nb.has(u)) I2.push(`floor table has a non-goal / non-neighbour edge ${k}`); }
    if (rec.floor.tcFloor !== C.TC_FLOOR) I2.push('floor tcFloor differs from the declared value');
  }
  return { invalid, I2, I3, I9 };
}

/** integrity and fidelity of one TRAINING record of regime t (I5); returns { invalid, I5, I9 } */
export function trainingProblems(rec, t, world, ctl) {
  const invalid = [], I5 = [], I9 = [];
  if (!rec) return { invalid: [`training ${t.id} has no record`], I5, I9 };
  invalid.push(...integrityProblems(rec.conditionIntegrity));
  if (rec.role !== 'train' || rec.outcome.crashed || !rec.outcome.completed) invalid.push(`training ${t.id} did not complete as a training session`);
  if (!rec.tree.derived || rec.tree.mainSha256 !== C.GUARD_TREE.guardMainSha256) invalid.push(`training ${t.id} did not run the pinned guard tree`);
  if (rec.guardSetting !== t.guard || !rec.guard || rec.guard.setting !== t.guard) I5.push(`training ${t.id} ran guard ${rec.guardSetting}, declared ${t.guard}`);
  if (rec.floorMode !== 'off' || rec.floor !== null) I5.push(`training ${t.id} ran the floor`);
  if (rec.input.agentSeed !== C.trainSeed(world)) I5.push(`training ${t.id} did not use the world's training seed`);
  if (!rec.guard || rec.guard.diag !== true || !rec.diag || !rec.store) { invalid.push(`training ${t.id} ran without the diagnostic`); return { invalid, I5, I9 }; }
  I5.push(...completenessProblems(rec, t.guard).map(x => `training ${t.id}: ${x}`));
  if (t.guard === 'both' && !(rec.store.attribution && rec.store.attribution.EXECUTED === 0)) I5.push(`training ${t.id}: ${rec.store.attribution ? rec.store.attribution.EXECUTED : '?'} EXECUTED-class non-graph pair(s) in the guarded store`);
  if (!ctl || ctl.episodes !== rec.store.episodes || ctl.diagnostics.nonGraphPairs !== rec.store.nonGraphPairs || ctl.trainingGuard !== t.guard) invalid.push(`training ${t.id}: store control disagrees with the training record`);
  I9.push(...diagProblems(rec).map(x => `training ${t.id}: ${x}`));
  return { invalid, I5, I9 };
}

const pearson = (x, y) => { const n = x.length; if (n < 3) return null; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null; };

/** pure core: records = Map label -> TEST record; trainRecords = Map label -> TRAINING record; plan = plan.json; controls = controls.json.controls */
export function evaluateBlock({ records, trainRecords, plan, controls }) {
  const problems = [], I2f = [], I3f = [], I5f = [], I9f = [];
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const perWorld = {};
  for (const k of records.keys()) { const m = /^gfs-(.+)-w(\d+)$/.exec(k); if (!m || !CELL[m[1]]) problems.push(`a test record of an undeclared cell: ${k}`); }
  for (const k of trainRecords.keys()) { const m = /^gfs-train([A-Z]+)-w(\d+)$/.exec(k); if (!m || !C.TRAININGS.some(t => t.id === m[1])) problems.push(`a training record of an undeclared regime: ${k}`); }
  for (const w of worlds) {
    const row = {}, seeds = new Set(), cfgs = new Set(), hashes = { U: new Set(), G: new Set() };
    const c = controls[w];
    if (!c || !c.U || !c.G) { problems.push(`world ${w}: no store control record`); continue; }
    const train = {};
    for (const t of C.TRAININGS) {
      const tr = trainRecords.get(`gfs-train${t.id}-w${w}`);
      const tp = trainingProblems(tr, t, w, c[t.id]);
      problems.push(...tp.invalid.map(x => `world ${w}: ${x}`));
      I5f.push(...tp.I5.map(x => ({ world: w, problem: x })));
      I9f.push(...tp.I9.map(x => ({ world: w, cell: `train${t.id}`, problem: x })));
      if (tr) train[t.id] = { legal: tr.reaches.legal, nonGraph: tr.reaches.nonEdge, seed: tr.input.agentSeed, config: tr.input.acceptedConfigSeed };
    }
    if (train.U && train.G && (train.U.seed !== train.G.seed || train.U.config !== train.G.config)) I5f.push({ world: w, problem: 'U and G were not trained from the same seed and configuration' });
    for (const cell of C.CELLS) {
      const rec = records.get(`gfs-${cell.name}-w${w}`);
      if (!rec) { problems.push(`world ${w}: cell ${cell.name} has no record`); continue; }
      if (rec.outcome.crashed || !rec.outcome.completed) problems.push(`world ${w}: cell ${cell.name} did not complete`);
      if (rec.bare === true || rec.role !== 'test') problems.push(`world ${w}: cell ${cell.name} is not an instrumented test record`);
      const ctl = c[cell.store];
      problems.push(...deliveryProblems(rec, ctl.storeHash, ctl.episodes).map(x => `world ${w} ${cell.name}: ${x}`));
      hashes[cell.store].add(rec.brain.deliveredHashes && rec.brain.deliveredHashes.episodes);
      const rp = recordProblems(rec, cell);
      problems.push(...rp.invalid.map(x => `world ${w} ${cell.name}: ${x}`));
      I2f.push(...rp.I2.map(x => ({ world: w, cell: cell.name, problem: x })));
      I3f.push(...rp.I3.map(x => ({ world: w, cell: cell.name, problem: x })));
      I9f.push(...rp.I9.map(x => ({ world: w, cell: cell.name, problem: x })));
      if (rp.invalid.length) continue;
      seeds.add(rec.input.agentSeed); cfgs.add(rec.input.acceptedConfigSeed);
      const g = rec.guard.counters, d = rec.diag;
      row[cell.name] = { legal: rec.endpoints.legalReaches, all: rec.endpoints.goalReaches, nonEdge: rec.reaches.nonEdge, calls: rec.counters.calls, maskedOut: g.maskedOut, blockedIllegal: g.blockedIllegal,
        admittedGraph: g.admittedGraph, decisionsNonGraph: rec.moveClass.nonGraph, illegalExecuted: d.illegalExecuted, blocked: d.blocked,
        stale: d.channels.stale, decision: d.channels.decision, decisionCarried: d.channels.decisionCarried, unclassified: d.channels.unclassified, legalFromStale: d.resets.legal.STALE,
        staleArrivals: d.arrivals.byClass.STALE.n, staleIllegal: d.arrivals.byClass.STALE.illegal, blockedStale: d.arrivals.byClass.STALE.blocked, freshIllegal: d.arrivals.byClass.FRESH.illegal,
        floor: { ...rec.floor.counters }, distinctGoalEdges: new Set((rec.finalHop.events || []).filter(e => e[2] === 1).map(e => e[1])).size };
    }
    // I7: pairing and store identity
    if (seeds.size !== 1 || [...seeds][0] !== C.testSeed(w)) problems.push(`world ${w}: the four cells do not share the world's test seed`);
    if (cfgs.size !== 1) problems.push(`world ${w}: the four cells do not share the configuration`);
    for (const k of ['U', 'G']) if (hashes[k].size !== 1 || [...hashes[k]][0] !== c[k].storeHash) problems.push(`world ${w}: the delivered ${k} store is not identical across its cells / not its training export`);
    const pw = plan.worlds.find(x => x.world === w);
    perWorld[w] = { goal: pw ? pw.goal : null, store: { U: c.U, G: c.G }, train, cells: row };
  }
  const excludedFraction = plan.exclusions ? new Set(plan.exclusions.map(e => e.world)).size / plan.worlds.length : 0;
  const valid = problems.length === 0 && excludedFraction <= C.RULES.maxExcludedFraction && worlds.length > 0;
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), problemCount: problems.length, excludedFraction, worlds,
    designDigest: C.designDigest(), decisionDigest: C.decisionDigest(), margin: C.MARGIN, familyLevel: C.BOOT_FAMILY.level, state: C.CONFIRMATORY_STATE, classification: C.CLASSIFICATION,
    scope: C.RULES.scope, completeness: C.RULES.completeness, deviations: C.DEVIATIONS, claimLimits: C.CLAIM_LIMITS };
  if (!valid) { out.verdict = C.interpret({ valid: false, reason: problems.length ? 'condition integrity / store / pairing / accounting problems' : 'excluded fraction above the declared limit' }); return out; }

  // ---- paired per-world vectors ----
  const val = (cell, k) => (w) => perWorld[w].cells[cell][k];
  const diff = (a, b, k) => (w) => val(a, k)(w) - val(b, k)(w);
  const vec = (fn, subset = worlds) => subset.map(fn);
  const sum = (fn, cfg, subset = worlds) => pairedSummary(vec(fn, subset), cfg);
  out.cellMeans = Object.fromEntries(C.CELL_NAMES.map(c => [c, Object.fromEntries(['legal', 'nonEdge', 'all', 'maskedOut', 'blockedIllegal', 'decisionsNonGraph', 'illegalExecuted', 'stale', 'decision', 'decisionCarried', 'unclassified', 'legalFromStale', 'staleArrivals', 'staleIllegal']
    .map(k => [k, mean(vec(val(c, k)))]))]));

  // ---- instruments ----
  const d2 = sum(diff('U_both', 'U_off', 'legal'), C.BOOT_95);
  const shareU = mean(worlds.map(w => perWorld[w].store.U.diagnostics.nonGraphShare)), shareG = mean(worlds.map(w => perWorld[w].store.G.diagnostics.nonGraphShare));
  const inst = {
    I1: { status: 'OK', note: 'condition integrity recomputed from raw numbers in every training and test session (invalid blocks are refused)' },
    I2: { status: I2f.length === 0 ? 'OK' : 'FAILED', failures: I2f.slice(0, 10), count: I2f.length },
    I3: { status: I3f.length === 0 ? 'OK' : 'FAILED', failures: I3f.slice(0, 10), count: I3f.length },
    I4: { status: 'OK', note: 'guard-tree identity (main sha256, base derived, the two line hashes) and the driver / diagnostic hashes are pinned in the manifest; default-off, diagnostic neutrality and component scope are gate-level checks' },
    I5: { status: I5f.length === 0 ? 'OK' : 'FAILED', failures: I5f.slice(0, 10), count: I5f.length },
    I6: { status: d2.ci.lower > 0 ? 'OK' : 'FAILED', D2: d2 },
    I7: { status: 'OK', note: 'seeds, configuration and the delivered U / G stores identical across the cells of every world (invalid blocks are refused)' },
    I8: { status: shareG > shareU ? 'FLAG' : 'OK', nonGraphShareU: shareU, nonGraphShareG: shareG },
    I9: { status: I9f.length === 0 ? 'OK' : 'FAILED', failures: I9f.slice(0, 10), count: I9f.length },
  };
  out.instruments = inst;
  const voided = { PS1: [], PS2: [], PS3: [] };
  if (inst.I2.status !== 'OK') for (const k of Object.keys(voided)) voided[k].push('I2');
  if (inst.I3.status !== 'OK') for (const k of Object.keys(voided)) voided[k].push('I3');
  if (inst.I5.status !== 'OK') { voided.PS1.push('I5'); voided.PS2.push('I5'); }
  if (inst.I6.status !== 'OK') voided.PS2.push('I6');
  const lab = (v, l) => (v.length ? 'VOID' : l);

  // ---- primary family (decisive: Bonferroni-3) ----
  const FAM = C.BOOT_FAMILY;
  const contrast = (a, b, cfg) => ({ legal: sum(diff(a, b, 'legal'), cfg), nonGraph: sum(diff(a, b, 'nonEdge'), cfg), allResets: sum(diff(a, b, 'all'), cfg) });
  const ps1 = { estimand: C.CLAIMS[0].estimand, ...contrast('G_both', 'U_both', FAM) }, ps2 = { estimand: C.CLAIMS[1].estimand, ...contrast('G_both', 'U_off', FAM) }, ps3 = { estimand: C.CLAIMS[2].estimand, ...contrast('U_both', 'U_mask', FAM) };
  ps1.label = lab(voided.PS1, C.classifyPS1(ps1.legal.ci)); ps1.voidedBy = voided.PS1;
  ps2.label = lab(voided.PS2, C.classifyPS2(ps2.legal.ci)); ps2.voidedBy = voided.PS2;
  ps3.label = lab(voided.PS3, C.classifyPS3(ps3.legal.ci)); ps3.voidedBy = voided.PS3;
  out.primary = { PS1: ps1, PS2: ps2, PS3: ps3 };
  const s1 = sum(diff('G_both', 'U_both', 'legal'), C.BOOT_95), s2 = sum(diff('G_both', 'U_off', 'legal'), C.BOOT_95), s3 = sum(diff('U_both', 'U_mask', 'legal'), C.BOOT_95);
  const sens = { PS1: lab(voided.PS1, C.classifyPS1(s1.ci)), PS2: lab(voided.PS2, C.classifyPS2(s2.ci)), PS3: lab(voided.PS3, C.classifyPS3(s3.ci)) };
  out.sensitivityUnadjusted95 = { labels: sens, intervals: { PS1: s1, PS2: s2, PS3: s3 }, decisive: false, agrees: sens.PS1 === ps1.label && sens.PS2 === ps2.label && sens.PS3 === ps3.label };

  // ---- goal-specific checks (unadjusted 95 %) ----
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  const harm = { PS1: [], PS2: [] }, fallsShort = [];
  out.byGoal = {};
  for (const gl of goals) {
    const ws = worlds.filter(w => perWorld[w].goal === gl);
    const g = { n: ws.length, PS1: sum(diff('G_both', 'U_both', 'legal'), C.BOOT_95, ws), PS2: sum(diff('G_both', 'U_off', 'legal'), C.BOOT_95, ws), PS3: sum(diff('U_both', 'U_mask', 'legal'), C.BOOT_95, ws),
      cellLegal: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(ws.map(val(c, 'legal')))])), cellNonGraph: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(ws.map(val(c, 'nonEdge')))])) };
    if (g.PS1.ci.upper < 0) harm.PS1.push(gl);
    if (g.PS2.ci.upper < 0) harm.PS2.push(gl);
    if (g.PS3.ci.lower >= C.MARGIN.delta) fallsShort.push(gl);
    out.byGoal[gl] = g;
  }
  out.harmFlags = harm; out.execGuardAddsMarginInGoals = fallsShort;

  // ---- secondary contrasts (descriptive, unadjusted 95 %, with their MDE at this n) ----
  const sec = {};
  const add = (name, a, b) => { const o = {}; for (const k of ['legal', 'nonEdge', 'all']) { const s = sum(diff(a, b, k), C.BOOT_95); o[k] = { mean: s.mean, lower: s.ci.lower, upper: s.ci.upper, sd: sd(vec(diff(a, b, k))) }; }
    o.mdeLegal = Z * o.legal.sd / Math.sqrt(worlds.length); sec[name] = o; };
  add('D2 retrofit (U_both - U_off)', 'U_both', 'U_off');
  add('M0 mask without the execution guard (U_mask - U_off)', 'U_mask', 'U_off');
  add('GM guard-trained package vs mask-only retrofit (G_both - U_mask)', 'G_both', 'U_mask');
  out.secondary = sec;

  // ---- the stale-reasoning diagnostic (descriptive; DESIGN.md section 6) ----
  const B = C.BOOT_95;
  const x1 = ratioCi(vec(val('U_mask', 'stale')), vec(val('U_mask', 'nonEdge')), B);
  const x2 = ratioCi(vec((w) => val('U_mask', 'decision')(w) + val('U_mask', 'decisionCarried')(w)), vec(val('U_mask', 'nonEdge')), B);
  const both = ['U_both', 'G_both'];
  const x3 = ratioCi(vec((w) => both.reduce((s, c) => s + val(c, 'blockedStale')(w), 0)), vec((w) => both.reduce((s, c) => s + val(c, 'blocked')(w), 0)), B);
  const nb = ['U_off', 'U_mask'];
  const xu = ratioCi(vec((w) => nb.reduce((s, c) => s + val(c, 'unclassified')(w), 0)), vec((w) => nb.reduce((s, c) => s + val(c, 'nonEdge')(w), 0)), B);
  const staleReading = C.classifyStale({ x1, x3: x3.share, xu: xu.share, maskResets: mean(vec(val('U_mask', 'nonEdge'))), integrityOk: inst.I9.status === 'OK' });
  out.stale = {
    X1_maskOnlyStaleShare: x1, X2_maskOnlyDecisionShare: x2, X3_bundleBlockedStaleShare: x3, XU_unclassifiedShare: xu, reading: staleReading, thresholds: C.STALE,
    perCell: Object.fromEntries(C.CELL_NAMES.map(c => [c, { stale: sum(val(c, 'stale'), B), decision: sum(val(c, 'decision'), B), decisionCarried: sum(val(c, 'decisionCarried'), B), unclassified: sum(val(c, 'unclassified'), B),
      illegalExecuted: sum(val(c, 'illegalExecuted'), B), blocked: sum(val(c, 'blocked'), B), legalFromStale: sum(val(c, 'legalFromStale'), B) }])),
    residualIllegalExecutionsMaskOnly: sum(val('U_mask', 'illegalExecuted'), B),
  };

  // ---- store diagnostics (descriptive; I8 FLAG) ----
  const st = (k, f) => sum((w) => f(perWorld[w].store[k]), B);
  const storeOf = (k) => ({ episodes: st(k, s => s.episodes), pairs: st(k, s => s.diagnostics.pairs), nonGraphPairs: st(k, s => s.diagnostics.nonGraphPairs), nonGraphShare: st(k, s => s.diagnostics.nonGraphShare),
    terminalNonGraph: st(k, s => s.diagnostics.terminalNonGraph), twoHopConsistent: st(k, s => s.diagnostics.twoHopConsistent),
    attribution: { EXECUTED: st(k, s => s.attribution.EXECUTED), SKIP: st(k, s => s.attribution.SKIP), UNRECORDED: st(k, s => s.attribution.UNRECORDED) },
    worldsWithUnrecordedPair: worlds.filter(w => perWorld[w].store[k].attribution.UNRECORDED > 0).length, trainingLegal: st(k, s => s.trainingLegal), trainingNonGraph: st(k, s => s.trainingNonGraph) });
  const dEp = vec((w) => perWorld[w].store.G.episodes - perWorld[w].store.U.episodes), dNg = vec((w) => perWorld[w].store.G.diagnostics.nonGraphPairs - perWorld[w].store.U.diagnostics.nonGraphPairs), ps1w = vec(diff('G_both', 'U_both', 'legal'));
  out.stores = { U: storeOf('U'), G: storeOf('G'), differenceGminusU: { episodes: pairedSummary(dEp, B), nonGraphPairs: pairedSummary(dNg, B) },
    association: { note: 'observational, descriptive; no mediation claim', pearsonPS1withEpisodeDifference: pearson(ps1w, dEp), pearsonPS1withNonGraphPairDifference: pearson(ps1w, dNg) },
    anomaly: 'non-graph pairs in G stores are attributed by the training session\'s recording audit (EXECUTED / SKIP / UNRECORDED); UNRECORDED pairs remain UNKNOWN' };

  // ---- unintended effects on candidate selection (descriptive; two declared FLAGS) ----
  const bothCells = C.CELLS.filter(c => c.guard === 'both');
  const blockedShare = mean(worlds.flatMap(w => bothCells.map(c => perWorld[w].cells[c.name].blockedIllegal / perWorld[w].cells[c.name].calls)));
  const poolChange = mean(worlds.flatMap(w => ['U_mask', 'U_both'].map(c => Math.abs(perWorld[w].cells[c].admittedGraph - perWorld[w].cells.U_off.admittedGraph) / perWorld[w].cells.U_off.admittedGraph)));
  out.candidateSelection = { blockedShareOfCalls: blockedShare, blockedFlag: blockedShare > C.FLAGS.blockedShareOfCalls, graphPoolRelativeChange: poolChange, graphPoolFlag: poolChange > C.FLAGS.graphPoolChange,
    maskedPerSession: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(vec(val(c, 'maskedOut')))])), distinctGoalEdgesPerSession: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(vec(val(c, 'distinctGoalEdges')))])) };
  out.candidateSelection.flagsRaised = [out.candidateSelection.blockedFlag && 'blockedShareOfCalls', out.candidateSelection.graphPoolFlag && 'graphPoolChange'].filter(Boolean);

  // ---- decision ----
  const instrumentsOk = ['I2', 'I3'].every(k => inst[k].status === 'OK');
  const spec = C.specification({ ps1: ps1.label, ps2: ps2.label, ps3: ps3.label, stale: staleReading, harmFlags: harm.PS2.length, instrumentsOk });
  if (harm.PS1.length) spec.scopeGoalCaveat = `training under the bundle harms goal group(s) ${harm.PS1.join(', ')}`;
  if (fallsShort.length) spec.execGuardGoalCaveat = `the execution guard adds at least delta in goal group(s) ${fallsShort.join(', ')}`;
  out.specification = spec;
  out.labels = { PS1: ps1.label, PS2: ps2.label, PS3: ps3.label, STALE: staleReading };
  out.verdict = C.interpret({ valid: true, ps1: ps1.label, ps2: ps2.label, ps3: ps3.label, stale: staleReading, harmFlags: harm.PS2.length + harm.PS1.length, sensitivityAgrees: out.sensitivityUnadjusted95.agrees, storeFlag: inst.I8.status === 'FLAG', spec });
  return out;
}

/** load a block directory; throws on any broken hash */
export function loadBlock(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  const { digest, ...rest } = manifest;
  if (C.hashObject(rest) !== digest) throw new Error('manifest digest does not match its contents');
  if (manifest.selftest) throw new Error('this is a plumbing self-test run; it is not a study block and is not analysed');
  if (manifest.designDigest !== C.designDigest() || manifest.decisionDigest !== C.decisionDigest()) throw new Error('the block was run under a different design than the one in config.mjs');
  const t = manifest.tree;
  if (t.guardMainSha256 !== C.GUARD_TREE.guardMainSha256 || t.derivedMainSha256 !== C.TREE.derivedMainSha256 || t.headMainSha256 !== C.TREE.headMainSha256 || t.headCommit !== C.HEAD_COMMIT
    || t.admitLineSha256 !== C.GUARD_TREE.admitLineSha256 || t.execLineSha256 !== C.GUARD_TREE.execLineSha256) throw new Error('the block ran a tree other than the pinned guard tree');
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (manifest.driverSha256 !== C.sha256(fs.readFileSync(path.join(here, 'session.mjs'))) || manifest.diagSha256 !== C.sha256(fs.readFileSync(path.join(here, 'diag.mjs')))) throw new Error('the block ran a driver or diagnostic other than the one in this tree');
  if (!manifest.condition || manifest.condition.state !== C.CONFIRMATORY_STATE || JSON.stringify(manifest.condition.hooks) !== JSON.stringify(C.HOOK_STATES[C.CONFIRMATORY_STATE])) throw new Error('the block did not run under the declared confirmatory hook state');
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
  if (C.hashObject(plan) !== manifest.planSha256) throw new Error('plan.json was altered');
  const ctl = JSON.parse(fs.readFileSync(path.join(dir, 'controls.json'), 'utf8'));
  if (C.hashObject(ctl.controls) !== manifest.controlsSha256) throw new Error('controls.json was altered');
  const records = new Map(), trainRecords = new Map();
  for (const [file, h] of Object.entries(manifest.sessions)) {
    const text = fs.readFileSync(path.join(dir, 'sessions', file));
    if (C.sha256(text) !== h) throw new Error(`session record altered: ${file}`);
    const rec = JSON.parse(text);
    (rec.role === 'train' ? trainRecords : records).set(file.replace(/\.json$/, ''), rec);
  }
  return { manifest, plan, controls: ctl.controls, records, trainRecords };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const argv = process.argv.slice(2);
  const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  if (!flag('--in')) { console.error('--in is required'); process.exit(2); }
  const { manifest, plan, controls, records, trainRecords } = loadBlock(path.resolve(flag('--in')));
  const s = evaluateBlock({ records, trainRecords, plan, controls });
  s.manifestDigest = manifest.digest; s.tree = manifest.tree;
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(s, null, 1));
  const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
  const ci = (b) => `${f(b.mean)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]`;
  console.log(`block ${s.block}: valid=${s.valid}; worlds ${s.worlds.length}; excluded fraction ${s.excludedFraction.toFixed(3)}; state ${s.state}`);
  if (!s.valid) { console.log(s.verdict); console.log(s.problems.join('\n')); process.exit(1); }
  console.log('cell     legal   non-graph  all  stale  decision  illegal-exec  blocked');
  for (const [c, m] of Object.entries(s.cellMeans)) console.log(`${c.padEnd(7)} ${f(m.legal).padStart(7)} ${f(m.nonEdge).padStart(9)} ${f(m.all).padStart(6)} ${f(m.stale).padStart(6)} ${f(m.decision).padStart(8)} ${f(m.illegalExecuted).padStart(12)} ${f(m.blockedIllegal).padStart(8)}`);
  console.log(`\ninstruments: ${Object.entries(s.instruments).map(([k, v]) => `${k} ${v.status}`).join(' | ')}`);
  console.log(`\nPRIMARY (family level ${(100 * s.familyLevel).toFixed(2)} %, delta ${s.margin.delta}):`);
  for (const k of ['PS1', 'PS2', 'PS3']) console.log(`  ${k} ${s.primary[k].label}: legal ${ci(s.primary[k].legal)}; non-graph ${ci(s.primary[k].nonGraph)}; all resets ${ci(s.primary[k].allResets)}`);
  console.log(`  unadjusted-95% sensitivity ${JSON.stringify(s.sensitivityUnadjusted95.labels)} (agrees ${s.sensitivityUnadjusted95.agrees}); harm ${JSON.stringify(s.harmFlags)}; exec guard adds delta in goals ${JSON.stringify(s.execGuardAddsMarginInGoals)}`);
  console.log(`\nstale diagnostic ${s.stale.reading}: X1 ${f(s.stale.X1_maskOnlyStaleShare.share, 3)} ${JSON.stringify(s.stale.X1_maskOnlyStaleShare.ci)}; X3 ${f(s.stale.X3_bundleBlockedStaleShare.share, 3)}; XU ${f(s.stale.XU_unclassifiedShare.share, 3)}`);
  console.log(`stores: U non-graph pairs ${ci(s.stores.U.nonGraphPairs)} (EXECUTED ${f(s.stores.U.attribution.EXECUTED.mean)}, SKIP ${f(s.stores.U.attribution.SKIP.mean)}, UNRECORDED ${f(s.stores.U.attribution.UNRECORDED.mean)}); G ${ci(s.stores.G.nonGraphPairs)} (EXECUTED ${f(s.stores.G.attribution.EXECUTED.mean)}, SKIP ${f(s.stores.G.attribution.SKIP.mean)}, UNRECORDED ${f(s.stores.G.attribution.UNRECORDED.mean)})`);
  console.log(`\nspecification: ${JSON.stringify(s.specification)}`);
  console.log('\n' + s.verdict);
}

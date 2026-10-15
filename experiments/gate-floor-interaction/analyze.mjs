// ==========================================================
// GATE-FLOOR-INTERACTION — analysis of the orchestrated block (descriptive; every rule is declared in config.mjs)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, design digest, tree identity, store delivery, pairing, condition integrity or recorded numbers are
// not intact (reports it INVALID and interprets no claim).  Primary outcome: LEGAL goal reaches per 1,500-call session; non-graph
// resets and total resets are carried separately for every cell and contrast.  The primary family {PC1, PC2, PC3} is decided at the
// Bonferroni-3 level; instruments and secondary contrasts use the unadjusted 95 % interval; no p-value decides anything.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean, sd } from '../xfer1/stats.mjs';
import { deliveryProblems } from '../xfer2/checks.mjs';
import { integrityProblems } from '../gate-floor-prodsem/analyze.mjs';

const Z = 1.959964 + 0.841621;                       // z(0.975) + z(0.80): the sizing constant of earlier milestones (2.8)
const cellOf = (s, f, g) => C.cellName(s, f, g);

/** integrity of one session record; returns { invalid: [...], I2: [...], I3: [...] } (I2/I3 void claims, the rest invalidate the block) */
export function recordProblems(rec, cell) {
  const invalid = [], I2 = [], I3 = [];
  invalid.push(...integrityProblems(rec.conditionIntegrity));
  if (rec.endpoints.attemptSuccess !== null) invalid.push('per-attempt success was recorded: an environment draw exists under state P');
  const a = rec.audit;
  if (!a) { invalid.push('no audit block'); return { invalid, I2, I3 }; }
  if (!a.reachesEqualLegalPlusNonEdge) invalid.push('goal resets != legal + non-graph resets');
  if (rec.reaches.legal !== a.legalReaches || rec.reaches.nonEdge !== a.nonEdgeReaches || rec.reaches.goal !== a.goalReaches) invalid.push('reach counts disagree between blocks');
  if (rec.endpoints.legalReaches !== rec.reaches.legal || rec.endpoints.goalReaches !== rec.reaches.goal) invalid.push('endpoint reach counts disagree with the reach record');
  if (!rec.tree.derived || rec.tree.mainSha256 !== C.GUARD_TREE.guardMainSha256) invalid.push('the session did not run the pinned guard tree');
  // I3: guard completeness, recomputed from raw numbers (the session's own ok flag is not trusted)
  const g = rec.guard && rec.guard.counters, gc = rec.guardCompleteness, mc = rec.moveClass;
  if (!g || !gc || !mc) { invalid.push('no guard / completeness / move-class block'); return { invalid, I2, I3 }; }
  if (gc.nonGraphResets !== rec.reaches.nonEdge || gc.executedNonGraphMoves !== mc.nonGraph) invalid.push('guard-completeness record disagrees with the reach / move records');
  if (cell.guard === 1) {
    if (rec.guard.on !== true) invalid.push('a G1 cell ran with the guard off');
    if (rec.reaches.nonEdge !== 0) I3.push(`non-graph resets ${rec.reaches.nonEdge} under the guard`);
    if (mc.nonGraph !== 0) I3.push(`executed non-graph moves ${mc.nonGraph} under the guard`);
    if (g.admitted !== 0) I3.push(`${g.admitted} non-graph candidate(s) admitted under the guard`);
  } else {
    if (rec.guard.on !== false) invalid.push('a G0 cell ran with the guard on');
    if (g.maskedOut !== 0) I3.push(`masked ${g.maskedOut} candidate(s) with the guard off`);
    if (g.blockedIllegal !== 0) I3.push(`blocked ${g.blockedIllegal} move(s) with the guard off`);
  }
  // I2: the floor audit (F1 cells only)
  if (cell.floor === 1) {
    if (!(rec.floor && rec.floor.on === true)) invalid.push('an F1 cell did not run the floor');
    else {
      const c = rec.floor.counters;
      if (c.lowered !== 0) I2.push(`floor lowered a score ${c.lowered} time(s)`);
      if (c.maxRaise > 100 + 1e-9) I2.push(`floor raised a score by ${c.maxRaise} (> 100)`);
      if (c.raised > c.legal || c.legal + c.notLegal !== c.evaluated) I2.push('floor counters are inconsistent');
      const goal = Number(rec.input.goal), nb = new Set((rec.finalHop.goalEdges || []).map(e => e.from));
      for (const k of Object.keys(rec.floor.byEdge)) { const [u, v] = k.split('->').map(Number); if (v !== goal || !nb.has(u)) I2.push(`floor table has a non-goal / non-neighbour edge ${k}`); }
      if (rec.floor.tcFloor !== C.TC_FLOOR) I2.push('floor tcFloor differs from the declared value');
    }
  } else if (rec.floor !== null) invalid.push('an F0 cell carries a floor record');
  return { invalid, I2, I3 };
}

/** pure core: records = Map label -> session record; plan = plan.json; controls = controls.json.controls */
export function evaluateBlock({ records, plan, controls }) {
  const problems = [], I2f = [], I3f = [];
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const perWorld = {};
  for (const w of worlds) {
    const row = {}, seeds = new Set(), cfgs = new Set(), realHashes = new Set();
    const c = controls[w];
    if (!c) { problems.push(`world ${w}: no control record`); continue; }
    for (const cell of C.CELLS) {
      const rec = records.get(`gfi-${cell.name}-w${w}`);
      if (!rec) { problems.push(`world ${w}: cell ${cell.name} has no record`); continue; }
      if (rec.outcome.crashed || !rec.outcome.completed) problems.push(`world ${w}: cell ${cell.name} did not complete`);
      if (rec.bare === true) problems.push(`world ${w}: cell ${cell.name} is an uninstrumented record`);
      if (rec.floorMode !== (cell.floor ? 'on' : 'off')) problems.push(`world ${w}: cell ${cell.name} ran floor mode ${rec.floorMode}`);
      problems.push(...deliveryProblems(rec, cell.store === 'REAL' ? c.realStoreHash : null, cell.store === 'REAL' ? c.realEpisodes : 0).map(x => `world ${w} ${cell.name}: ${x}`));
      if (cell.store === 'REAL') realHashes.add(rec.brain.deliveredHashes && rec.brain.deliveredHashes.episodes);
      const rp = recordProblems(rec, cell);
      problems.push(...rp.invalid.map(x => `world ${w} ${cell.name}: ${x}`));
      I2f.push(...rp.I2.map(x => ({ world: w, cell: cell.name, problem: x })));
      I3f.push(...rp.I3.map(x => ({ world: w, cell: cell.name, problem: x })));
      seeds.add(rec.input.agentSeed); cfgs.add(rec.input.acceptedConfigSeed);
      const gct = rec.guard ? rec.guard.counters : {};
      row[cell.name] = { legal: rec.endpoints.legalReaches, all: rec.endpoints.goalReaches, nonEdge: rec.reaches.nonEdge, early: rec.endpoints.earlyReaches,
        calls: rec.counters ? rec.counters.calls : null, maskedOut: gct.maskedOut, blockedIllegal: gct.blockedIllegal, admittedGraph: gct.admittedGraph,
        nonGraphAtAdmission: (gct.nonGraphTrained || 0) + (gct.nonGraphHuman || 0) + (gct.nonGraphBoth || 0), moves: rec.moveClass,
        floor: rec.floor ? { ...rec.floor.counters } : null, distinctGoalEdges: new Set((rec.finalHop.events || []).filter(e => e[2] === 1).map(e => e[1])).size,
        goalEdgePenalty: Array.isArray(rec.goalEdgeState) ? rec.goalEdgeState.reduce((s, e) => s + e.penalty, 0) : null };
    }
    // I7: pairing and store identity
    if (seeds.size !== 1) problems.push(`world ${w}: the eight cells do not share the test seed`);
    if (cfgs.size !== 1) problems.push(`world ${w}: the eight cells do not share the configuration`);
    if (realHashes.size !== 1 || ![...realHashes][0] || [...realHashes][0] !== c.realStoreHash) problems.push(`world ${w}: the delivered REAL store is not identical across the four REAL cells / not the control`);
    const pw = plan.worlds.find(x => x.world === w);
    perWorld[w] = { goal: pw ? pw.goal : null, realEpisodes: c.realEpisodes, cells: row };
  }
  const excludedFraction = plan.exclusions ? new Set(plan.exclusions.map(e => e.world)).size / plan.worlds.length : 0;
  const valid = problems.length === 0 && excludedFraction <= C.RULES.maxExcludedFraction && worlds.length > 0;
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), problemCount: problems.length, excludedFraction, worlds,
    designDigest: C.designDigest(), decisionDigest: C.decisionDigest(), margin: C.MARGIN, familyLevel: C.BOOT_FAMILY.level, state: C.CONFIRMATORY_STATE, classification: C.CLASSIFICATION,
    scope: C.RULES.scope, deviations: C.DEVIATIONS, claimLimits: C.CLAIM_LIMITS };
  if (!valid) { out.verdict = C.interpret({ valid: false, reason: problems.length ? 'condition integrity / store / pairing problems' : 'excluded fraction above the declared limit' }); return out; }

  // ---- paired per-world vectors ----
  const val = (cell, k) => (w) => perWorld[w].cells[cell][k];
  const sub = (a, b) => (w) => a(w) - b(w);
  const cellV = (s, f, g, k) => val(cellOf(s, f, g), k);
  const tauG = (s, f, k) => sub(cellV(s, f, 1, k), cellV(s, f, 0, k));
  const tauF = (s, g, k) => sub(cellV(s, 1, g, k), cellV(s, 0, g, k));
  const D = (g, k) => sub(cellV('REAL', 1, g, k), cellV('COLD', 1, g, k));
  const delta = (fa, fb) => (w) => fa(w) - fb(w);
  const vec = (fn, subset = worlds) => subset.map(fn);
  const sum = (fn, cfg, subset = worlds) => pairedSummary(vec(fn, subset), cfg);

  out.cellMeans = Object.fromEntries(C.CELL_NAMES.map(c => [c, { legal: mean(vec(val(c, 'legal'))), nonEdge: mean(vec(val(c, 'nonEdge'))), all: mean(vec(val(c, 'all'))),
    maskedOut: mean(vec(val(c, 'maskedOut'))), blockedIllegal: mean(vec(val(c, 'blockedIllegal'))), movesNonGraph: mean(vec((w) => perWorld[w].cells[c].moves.nonGraph)) }]));

  // ---- instruments ----
  const d0 = sum(D(0, 'legal'), C.BOOT_95), floorCold = sum(tauF('COLD', 0, 'legal'), C.BOOT_95);
  const inst = {
    I1: { status: 'OK', note: 'condition integrity recomputed from raw numbers in every session (invalid blocks are refused)' },
    I2: { status: I2f.length === 0 ? 'OK' : 'FAILED', failures: I2f.slice(0, 10), count: I2f.length },
    I3: { status: I3f.length === 0 ? 'OK' : 'FAILED', failures: I3f.slice(0, 10), count: I3f.length },
    I4: { status: 'OK', note: 'tree identity (guard main sha256, base derived, the two line hashes) pinned in the manifest and verified at load; default-off neutrality is a gate-level check' },
    I5: { status: d0.ci.upper < 0 ? 'OK' : 'FAILED', D0: d0 },
    I6: { status: floorCold.ci.lower >= C.MARGIN.coldFloorMinBenefit ? 'OK' : 'FAILED', floorColdG0: floorCold, minBenefit: C.MARGIN.coldFloorMinBenefit },
    I7: { status: 'OK', note: 'seeds, configuration and the delivered REAL store identical across the cells of every world (invalid blocks are refused)' },
  };
  out.instruments = inst;
  const voided = { PC1: [], PC2: [], PC3: [] };
  if (inst.I2.status !== 'OK') for (const k of Object.keys(voided)) voided[k].push('I2');
  if (inst.I3.status !== 'OK') { voided.PC1.push('I3'); voided.PC2.push('I3'); }
  if (inst.I6.status !== 'OK') voided.PC3.push('I6');

  // ---- primary family (decisive: Bonferroni-3) ----
  const FAM = C.BOOT_FAMILY;
  const ig = sum(delta(D(1, 'legal'), D(0, 'legal')), FAM), d1 = sum(D(1, 'legal'), FAM), d0f = sum(D(0, 'legal'), FAM);
  const tauGreal = sum(tauG('REAL', 1, 'legal'), FAM), tauGrealNon = sum(tauG('REAL', 1, 'nonEdge'), FAM), tauGrealAll = sum(tauG('REAL', 1, 'all'), FAM);
  const tf0 = sum(tauF('REAL', 0, 'legal'), FAM), tf1 = sum(tauF('REAL', 1, 'legal'), FAM);
  const lab = (v, l) => (v.length ? 'VOID' : l);
  const pc1 = { estimand: C.CLAIMS[0].estimand, interactionLegal: ig, D1: d1, D0: d0f, label: lab(voided.PC1, C.classifyPC1({ ig: ig.ci, d1: d1.ci, i5: inst.I5.status === 'OK' })), voidedBy: voided.PC1,
    nonGraph: sum(delta(D(1, 'nonEdge'), D(0, 'nonEdge')), FAM), allResets: sum(delta(D(1, 'all'), D(0, 'all')), FAM) };
  const pc2 = { estimand: C.CLAIMS[1].estimand, tauLegal: tauGreal, tauNonGraph: tauGrealNon, tauAllResets: tauGrealAll, nonGraphRemoved: -mean(vec(tauG('REAL', 1, 'nonEdge'))),
    label: lab(voided.PC2, C.classifyPC2({ tau: tauGreal.ci, nonGraphRemoved: -mean(vec(tauG('REAL', 1, 'nonEdge'))) })), voidedBy: voided.PC2 };
  const pc3 = { estimand: C.CLAIMS[2].estimand, tauFloorG0: tf0, tauFloorG1: tf1, nonGraphG0: sum(tauF('REAL', 0, 'nonEdge'), FAM), nonGraphG1: sum(tauF('REAL', 1, 'nonEdge'), FAM),
    label: lab(voided.PC3, C.classifyPC3({ g0: tf0.ci, g1: tf1.ci })), voidedBy: voided.PC3 };
  out.primary = { PC1: pc1, PC2: pc2, PC3: pc3 };

  // ---- the unadjusted 95 % classification (declared, non-decisive sensitivity) ----
  const ig95 = sum(delta(D(1, 'legal'), D(0, 'legal')), C.BOOT_95), d195 = sum(D(1, 'legal'), C.BOOT_95), tau95 = sum(tauG('REAL', 1, 'legal'), C.BOOT_95);
  const tf095 = sum(tauF('REAL', 0, 'legal'), C.BOOT_95), tf195 = sum(tauF('REAL', 1, 'legal'), C.BOOT_95);
  const sens = { PC1: lab(voided.PC1, C.classifyPC1({ ig: ig95.ci, d1: d195.ci, i5: inst.I5.status === 'OK' })), PC2: lab(voided.PC2, C.classifyPC2({ tau: tau95.ci, nonGraphRemoved: pc2.nonGraphRemoved })),
    PC3: lab(voided.PC3, C.classifyPC3({ g0: tf095.ci, g1: tf195.ci })) };
  out.sensitivityUnadjusted95 = { labels: sens, intervals: { interaction: ig95, tauGuardReal: tau95, tauFloorG0: tf095, tauFloorG1: tf195, D1: d195 }, decisive: false, agrees: sens.PC1 === pc1.label && sens.PC2 === pc2.label && sens.PC3 === pc3.label };

  // ---- goal-specific harm (unadjusted 95 %; a goal group wholly below 0 is a HARM flag on that claim) ----
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  const harm = { PC2_guardReal_F1: [], PC3_floorReal_G0: [], PC3_floorReal_G1: [] };
  out.byGoal = {};
  for (const gl of goals) {
    const ws = worlds.filter(w => perWorld[w].goal === gl);
    const g = {
      n: ws.length,
      guardReal_F1: sum(tauG('REAL', 1, 'legal'), C.BOOT_95, ws), floorReal_G0: sum(tauF('REAL', 0, 'legal'), C.BOOT_95, ws), floorReal_G1: sum(tauF('REAL', 1, 'legal'), C.BOOT_95, ws),
      interaction_F1: sum(delta(D(1, 'legal'), D(0, 'legal')), C.BOOT_95, ws), D0: sum(D(0, 'legal'), C.BOOT_95, ws), D1: sum(D(1, 'legal'), C.BOOT_95, ws),
      cellLegal: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(ws.map(val(c, 'legal')))])), cellNonGraph: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(ws.map(val(c, 'nonEdge')))])),
    };
    if (g.guardReal_F1.ci.upper < 0) harm.PC2_guardReal_F1.push(gl);
    if (g.floorReal_G0.ci.upper < 0) harm.PC3_floorReal_G0.push(gl);
    if (g.floorReal_G1.ci.upper < 0) harm.PC3_floorReal_G1.push(gl);
    out.byGoal[gl] = g;
  }
  out.harmFlags = harm;
  const harmFlagCount = harm.PC2_guardReal_F1.length + harm.PC3_floorReal_G0.length + harm.PC3_floorReal_G1.length;

  // ---- secondary contrasts (descriptive, unadjusted 95 %, with their MDE at this n) ----
  const sec = {};
  const add = (name, fn) => {
    const o = {};
    for (const k of ['legal', 'nonEdge', 'all']) { const s = sum(fn(k), C.BOOT_95); o[k] = { mean: s.mean, lower: s.ci.lower, upper: s.ci.upper, sd: sd(vec(fn(k))) }; }
    o.mdeLegal = Z * o.legal.sd / Math.sqrt(worlds.length);
    sec[name] = o;
  };
  for (const s of ['COLD', 'REAL']) for (const g of [0, 1]) add(`floor | ${s}, G${g}`, (k) => tauF(s, g, k));
  for (const s of ['COLD', 'REAL']) for (const f of [0, 1]) add(`guard | ${s}, F${f}`, (k) => tauG(s, f, k));
  for (const f of [0, 1]) for (const g of [0, 1]) add(`store (REAL-COLD) | F${f}, G${g}`, (k) => sub(cellV('REAL', f, g, k), cellV('COLD', f, g, k)));
  for (const f of [0, 1]) add(`INTERACTION store x guard | F${f}`, (k) => delta(sub(cellV('REAL', f, 1, k), cellV('COLD', f, 1, k)), sub(cellV('REAL', f, 0, k), cellV('COLD', f, 0, k))));
  for (const s of ['COLD', 'REAL']) add(`INTERACTION floor x guard | ${s}`, (k) => delta(tauF(s, 1, k), tauF(s, 0, k)));
  for (const g of [0, 1]) add(`INTERACTION store x floor | G${g}`, (k) => delta(sub(cellV('REAL', 1, g, k), cellV('COLD', 1, g, k)), sub(cellV('REAL', 0, g, k), cellV('COLD', 0, g, k))));
  add('3-WAY store x floor x guard', (k) => delta(delta(sub(cellV('REAL', 1, 1, k), cellV('COLD', 1, 1, k)), sub(cellV('REAL', 1, 0, k), cellV('COLD', 1, 0, k))),
    delta(sub(cellV('REAL', 0, 1, k), cellV('COLD', 0, 1, k)), sub(cellV('REAL', 0, 0, k), cellV('COLD', 0, 0, k)))));
  out.secondary = sec;

  // ---- unintended effects on candidate selection (descriptive; two declared FLAGS) ----
  const g1cells = C.CELLS.filter(c => c.guard === 1);
  const blockedShare = mean(worlds.flatMap(w => g1cells.map(c => perWorld[w].cells[c.name].blockedIllegal / perWorld[w].cells[c.name].calls)));
  const poolChange = mean(worlds.flatMap(w => C.CELLS.filter(c => c.guard === 1).map(c => {
    const a = perWorld[w].cells[c.name].admittedGraph, b = perWorld[w].cells[cellOf(c.store, c.floor, 0)].admittedGraph; return Math.abs(a - b) / b; })));
  out.candidateSelection = {
    blockedMovesPerSession: mean(worlds.flatMap(w => g1cells.map(c => perWorld[w].cells[c.name].blockedIllegal))), blockedShareOfCalls: blockedShare, blockedFlag: blockedShare > C.FLAGS.blockedShareOfCalls,
    graphPoolRelativeChange: poolChange, graphPoolFlag: poolChange > C.FLAGS.graphPoolChange,
    nonGraphCandidatesAtAdmissionPerSessionG0: mean(worlds.flatMap(w => C.CELLS.filter(c => c.guard === 0).map(c => perWorld[w].cells[c.name].nonGraphAtAdmission))),
    maskedPerSessionG1: mean(worlds.flatMap(w => g1cells.map(c => perWorld[w].cells[c.name].maskedOut))),
    moves: Object.fromEntries(C.CELL_NAMES.map(c => [c, { legal: mean(vec((w) => perWorld[w].cells[c].moves.legal)), nonGraph: mean(vec((w) => perWorld[w].cells[c].moves.nonGraph)), self: mean(vec((w) => perWorld[w].cells[c].moves.self)), none: mean(vec((w) => perWorld[w].cells[c].moves.none)) }])),
    distinctGoalEdgesPerSession: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(vec(val(c, 'distinctGoalEdges')))])),
    goalEdgePenalty: Object.fromEntries(C.CELL_NAMES.map(c => [c, mean(vec(val(c, 'goalEdgePenalty')).filter(x => x !== null))])),
  };
  const flagsRaised = [out.candidateSelection.blockedFlag && 'blockedShareOfCalls', out.candidateSelection.graphPoolFlag && 'graphPoolChange'].filter(Boolean);
  out.candidateSelection.flagsRaised = flagsRaised;

  // ---- decision ----
  const instrumentsOk = ['I2', 'I3', 'I4', 'I6', 'I7'].every(k => inst[k].status === 'OK');
  const spec = C.specification({ pc2: pc2.label, pc3: pc3.label, harmFlags: harmFlagCount, instrumentsOk });
  out.specification = spec;
  out.labels = { PC1: pc1.label, PC2: pc2.label, PC3: pc3.label };
  out.verdict = C.interpret({ valid: true, pc1: pc1.label, pc2: pc2.label, pc3: pc3.label, harmFlags: harmFlagCount, sensitivityAgrees: out.sensitivityUnadjusted95.agrees, spec });
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
  if (!manifest.condition || manifest.condition.state !== C.CONFIRMATORY_STATE || JSON.stringify(manifest.condition.hooks) !== JSON.stringify(C.HOOK_STATES[C.CONFIRMATORY_STATE])) throw new Error('the block did not run under the declared confirmatory hook state');
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
  const f = (x, d = 1) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
  const ci = (b) => `${f(b.mean)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]`;
  console.log(`block ${s.block}: valid=${s.valid}; worlds ${s.worlds.length}; excluded fraction ${s.excludedFraction.toFixed(3)}; state ${s.state}`);
  if (!s.valid) { console.log(s.verdict); console.log(s.problems.join('\n')); process.exit(1); }
  console.log(`classification: ${s.classification}`);
  console.log('cell           legal   non-graph   all resets   masked   blocked');
  for (const [c, m] of Object.entries(s.cellMeans)) console.log(`${c.padEnd(13)} ${f(m.legal).padStart(7)} ${f(m.nonEdge).padStart(10)} ${f(m.all).padStart(12)} ${f(m.maskedOut, 0).padStart(8)} ${f(m.blockedIllegal).padStart(9)}`);
  console.log(`\ninstruments: ${Object.entries(s.instruments).map(([k, v]) => `${k} ${v.status}`).join(' | ')}`);
  console.log(`\nPRIMARY (family level ${(100 * s.familyLevel).toFixed(2)} %, delta ${s.margin.delta}):`);
  console.log(`  PC1 ${s.primary.PC1.label}: interaction ${ci(s.primary.PC1.interactionLegal)}; D1 ${ci(s.primary.PC1.D1)}; D0 ${ci(s.primary.PC1.D0)}`);
  console.log(`  PC2 ${s.primary.PC2.label}: guard effect (REAL, F1) legal ${ci(s.primary.PC2.tauLegal)}; non-graph ${ci(s.primary.PC2.tauNonGraph)}; all resets ${ci(s.primary.PC2.tauAllResets)}`);
  console.log(`  PC3 ${s.primary.PC3.label}: floor effect (REAL) G0 ${ci(s.primary.PC3.tauFloorG0)}; G1 ${ci(s.primary.PC3.tauFloorG1)}`);
  console.log(`  unadjusted-95% sensitivity ${JSON.stringify(s.sensitivityUnadjusted95.labels)} (agrees ${s.sensitivityUnadjusted95.agrees})`);
  console.log(`  harm flags ${JSON.stringify(s.harmFlags)}; candidate-selection flags ${JSON.stringify(s.candidateSelection.flagsRaised)}`);
  console.log('\nby goal (unadjusted 95 %): guard | REAL,F1 ; floor | REAL,G0 ; floor | REAL,G1 ; interaction | F1');
  for (const [g, v] of Object.entries(s.byGoal)) console.log(`  goal ${g} n=${v.n}: ${ci(v.guardReal_F1)} ; ${ci(v.floorReal_G0)} ; ${ci(v.floorReal_G1)} ; ${ci(v.interaction_F1)}`);
  console.log(`\nspecification: ${JSON.stringify(s.specification)}`);
  console.log('\n' + s.verdict);
}

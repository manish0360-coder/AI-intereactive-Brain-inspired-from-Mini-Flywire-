// ==========================================================
// LEARN-0 — analysis of an orchestrated block (every rule is declared in config.mjs; DESIGN.md sections 5-7)
// ==========================================================
//   node analyze.mjs --in <block run dir> [--out <summary.json>]
// REFUSES a block whose manifest, digests, tree or driver identity, oracle audit, store delivery, pairing, condition integrity or reach
// accounting is not intact.  Primary: E1 = mean over worlds of (legal reaches N1 - legal reaches N0), percentile bootstrap 95 %, labelled
// against delta.  Everything else is descriptive (unadjusted 95 %).  No p-value decides anything.
// ==========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './config.mjs';
import { pairedSummary, mean } from '../xfer1/stats.mjs';
import { ARMS, COMPONENTS } from '../xfer1/config.mjs';
import { integrityProblems } from '../gate-floor-prodsem/analyze.mjs';
import { testLabel, trainLabel } from './plan.mjs';

const CELL = Object.fromEntries(C.CELLS.map(c => [c.name, c]));

/** the oracle audit, recomputed from raw counts (the session's own ok flag is not trusted) */
export function oracleProblems(rec, map) {
  const a = rec.mapAudit; if (!a || !a.executed || !a.blocked) return ['no oracle audit'];
  const ex = C.ORACLES.reduce((s, o) => s + (a.executed[o] || 0), 0), bl = C.ORACLES.reduce((s, o) => s + (a.blocked[o] || 0), 0);
  if (a.setting !== map) return [`ran map ${a.setting}, declared ${map}`];
  if (map === 'off') { const p = []; if (ex !== 0) p.push(`ORACLE LEAK: ${ex} oracle call(s) executed with the map off`); const silent = C.ORACLES.filter(o => !(a.blocked[o] > 0)); if (silent.length) p.push(`guard never reached with the map off: ${silent.join(', ')}`); return p; }
  const p = []; const idle = C.ORACLES.filter(o => !(a.executed[o] > 0)); if (idle.length) p.push(`the map was declared on but these oracles never ran: ${idle.join(', ')}`); if (bl !== 0) p.push(`${bl} oracle call(s) blocked with the map on`); return p;
}

/** store identity: the kept components equal the world's training export, everything else empty at the first call */
export function deliveryProblems(rec, arm, control) {
  const p = [], keep = ARMS[arm].keep, d = rec.brain.deliveredHashes, s = rec.brain.start;
  if (!s || !s.sizes || !s.hashes) return ['no start-state record'];
  if (arm === 'COLD') { if (rec.brain.deliveredHash !== 'none') p.push('a cold cell received a store'); for (const c of COMPONENTS) if (s.sizes[c] !== 0) p.push(`a cold cell started with ${c} = ${s.sizes[c]}`); return p; }
  if (!d) return ['no delivered hashes'];
  for (const c of COMPONENTS) {
    if (keep.includes(c)) { if (d[c] !== control.storeHashes[c]) p.push(`${c} delivered differs from the training export`); if (s.hashes[c] !== d[c]) p.push(`${c} not restored exactly at the first call`); }
    else if (s.sizes[c] !== 0) p.push(`omitted component ${c} not empty at the first call`);
  }
  return p;
}

export function recordProblems(rec, cell, control) {
  const p = [];
  p.push(...integrityProblems(rec.conditionIntegrity));
  if (rec.endpoints.attemptSuccess !== null) p.push('per-attempt success was recorded: an environment draw exists under state P');
  if (rec.bare || rec.role !== 'test') p.push('not an instrumented test record');
  if (rec.outcome.crashed || !rec.outcome.completed) p.push('did not complete');
  if (!rec.tree.learn0 || rec.tree.mainSha256 !== C.LEARN0_TREE.mainSha256 || rec.tree.planningSha256 !== C.LEARN0_TREE.planningSha256) p.push('did not run the pinned LEARN-0 tree');
  if (rec.map !== cell.map || rec.input.arm !== cell.arm) p.push(`ran map ${rec.map} / arm ${rec.input.arm}, declared ${cell.map} / ${cell.arm}`);
  p.push(...oracleProblems(rec, cell.map));
  p.push(...deliveryProblems(rec, cell.arm, control));
  const a = rec.audit;
  if (!a || !a.reachesEqualLegalPlusNonEdge || a.legalReaches !== rec.reaches.legal || rec.endpoints.legalReaches !== rec.reaches.legal || rec.reaches.legalHalves[0] + rec.reaches.legalHalves[1] !== rec.reaches.legal || !a.arrivalsAtMostCalls) p.push('reach accounting is inconsistent');
  return p;
}

export function trainingProblems(rec, w, control) {
  if (!rec) return ['no training record'];
  const p = [];
  p.push(...integrityProblems(rec.conditionIntegrity));
  if (rec.role !== 'train' || rec.outcome.crashed || !rec.outcome.completed) p.push('the training session did not complete');
  if (rec.input.agentSeed !== C.trainSeed(w)) p.push('training did not use the world\'s training seed');
  if (!rec.tree.learn0 || rec.tree.mainSha256 !== C.LEARN0_TREE.mainSha256) p.push('training did not run the pinned LEARN-0 tree');
  p.push(...oracleProblems(rec, C.TRAINING.map).map(x => `training: ${x}`));
  if (!control || control.endHash !== rec.brain.endHash || control.trainingMap !== C.TRAINING.map) p.push('the store control disagrees with the training record');
  if (!control || !control.provenance || control.provenance.ok !== true || control.provenance.offCount !== 0 || control.provenance.maxLag !== C.PROVENANCE.maxLag) p.push('store provenance failed or was not checked (I7)');
  return p;
}

/** pure core */
export function evaluateBlock({ records, trainRecords, plan, controls }) {
  const problems = [];
  for (const k of records.keys()) { const m = /^l0-(\w+)-w(\d+)$/.exec(k); if (!m || !CELL[m[1]]) problems.push(`a test record of an undeclared cell: ${k}`); }
  const worlds = plan.validWorlds.slice().sort((a, b) => a - b);
  const perWorld = {};
  for (const w of worlds) {
    const c = controls[w];
    if (!c) { problems.push(`world ${w}: no store control`); continue; }
    problems.push(...trainingProblems(trainRecords.get(trainLabel(w)), w, c).map(x => `world ${w}: ${x}`));
    const row = {}, seeds = new Set(), cfgs = new Set();
    for (const cell of C.CELLS) {
      const rec = records.get(testLabel(cell.name, w));
      if (!rec) { problems.push(`world ${w}: cell ${cell.name} has no record`); continue; }
      const rp = recordProblems(rec, cell, c);
      problems.push(...rp.map(x => `world ${w} ${cell.name}: ${x}`));
      if (rp.length) continue;
      seeds.add(rec.input.agentSeed); cfgs.add(rec.input.acceptedConfigSeed);
      const m = rec.moves;
      row[cell.name] = { legal: rec.reaches.legal, nonEdge: rec.reaches.nonEdge, all: rec.reaches.goal, early: rec.reaches.legalHalves[0], late: rec.reaches.legalHalves[1],
        downhill: m.farLegal > 0 ? m.farLegalDownhill / m.farLegal : null, chance: m.farLegal > 0 ? m.farLegalChance / m.farLegal : null, enter: m.adjacent > 0 ? m.adjacentEnter / m.adjacent : null, enterChance: m.adjacent > 0 ? m.adjacentChance / m.adjacent : null,
        illegalExecuted: rec.diag.illegalExecuted, admittedNonGraph: rec.guard.counters.admitted, goalKeyedQ: rec.brain.goalKeyedQ };
    }
    if (seeds.size !== 1 || [...seeds][0] !== C.testSeed(w)) problems.push(`world ${w}: the five cells do not share the world's test seed`);
    if (cfgs.size !== 1) problems.push(`world ${w}: the five cells do not share the configuration`);
    const pw = plan.worlds.find(x => x.world === w);
    perWorld[w] = { goal: pw ? pw.goal : null, cells: row };
  }
  const excludedFraction = plan.exclusions ? new Set(plan.exclusions.map(e => e.world)).size / plan.worlds.length : 0;
  const valid = problems.length === 0 && excludedFraction <= C.RULES.maxExcludedFraction && worlds.length > 0;
  const out = { schema: `${C.SCHEMA}.summary`, status: C.STATUS, block: plan.block, valid, problems: problems.slice(0, 20), problemCount: problems.length, excludedFraction, worlds,
    designDigest: C.designDigest(), decisionDigest: C.decisionDigest(), margin: C.MARGIN, level: C.PRIMARY_LEVEL, state: C.CONFIRMATORY_STATE, scope: C.RULES.scope, claims: C.RULES.claims };
  if (!valid) { out.verdict = C.interpret({ valid: false, reason: problems.length ? 'integrity / oracle / store / pairing / accounting problems' : 'excluded fraction above the declared limit' }); return out; }

  const v = (cell, k) => (w) => perWorld[w].cells[cell][k];
  const diff = (a, b, k = 'legal') => (w) => v(a, k)(w) - v(b, k)(w);
  const sum = (fn, subset = worlds) => pairedSummary(subset.map(fn), C.BOOT);
  out.cellMeans = Object.fromEntries(C.CELL_NAMES.map(c => [c, Object.fromEntries(['legal', 'nonEdge', 'all', 'early', 'late', 'downhill', 'chance', 'enter', 'enterChance', 'illegalExecuted', 'admittedNonGraph', 'goalKeyedQ']
    .map(k => [k, mean(worlds.map(v(c, k)).filter(x => x !== null))]))]));
  const e1 = sum(diff('N1', 'N0'));
  out.primary = { E1: { estimand: C.CLAIMS[0].estimand, legal: e1, label: C.classifyE1(e1.ci), sensitivity: Object.fromEntries(C.MARGIN.sensitivity.map(dl => [`delta${dl}`, C.classifyE1(e1.ci, dl)])) } };
  const rateDiff = (a, b, k) => (w) => { const x = v(a, k)(w), y = v(b, k)(w); return x === null || y === null ? 0 : x - y; };
  out.secondary = {
    S1: { nonGraph: sum(diff('N1', 'N0', 'nonEdge')), allResets: sum(diff('N1', 'N0', 'all')) },
    S2: { N0: sum((w) => v('N0', 'late')(w) - v('N0', 'early')(w)), N1: sum((w) => v('N1', 'late')(w) - v('N1', 'early')(w)) },
    S3: { downhill_N1_minus_N0: sum(rateDiff('N1', 'N0', 'downhill')), N0_aboveChance: sum((w) => (v('N0', 'downhill')(w) ?? 0) - (v('N0', 'chance')(w) ?? 0)),
      N1_aboveChance: sum((w) => (v('N1', 'downhill')(w) ?? 0) - (v('N1', 'chance')(w) ?? 0)) },
    S4: { enter_N1_minus_N0: sum(rateDiff('N1', 'N0', 'enter')) },
    S5: { O0_minus_N0: sum(diff('O0', 'N0')) },
    S6: { N1E_minus_N0: sum(diff('N1E', 'N0')), N1Q_minus_N0: sum(diff('N1Q', 'N0')), N1E_minus_N1: sum(diff('N1E', 'N1')), note: 'exploratory component estimates; no label, no claim' },
  };
  const goals = [...new Set(worlds.map(w => perWorld[w].goal))].sort((a, b) => a - b);
  out.byGoal = Object.fromEntries(goals.map(g => { const ws = worlds.filter(w => perWorld[w].goal === g); return [g, { n: ws.length, E1: sum(diff('N1', 'N0'), ws), N1E: sum(diff('N1E', 'N0'), ws), N1Q: sum(diff('N1Q', 'N0'), ws), S5: sum(diff('O0', 'N0'), ws) }]; }));
  // the multiplicity disclosure: count the secondary intervals actually produced (declared: C.SECONDARY_POLICY.intervals)
  const intervals = (o) => (o && typeof o === 'object' ? (o.ci ? 1 : 0) + Object.values(o).reduce((s, v) => s + (v && typeof v === 'object' && v !== o.ci ? intervals(v) : 0), 0) : 0);
  out.secondaryPolicy = { ...C.SECONDARY_POLICY, produced: intervals(out.secondary) + intervals(out.byGoal) };
  out.labels = { E1: out.primary.E1.label };
  out.verdict = C.interpret({ valid: true, e1: out.primary.E1.label, nonGraphShift: `${out.secondary.S1.nonGraph.mean.toFixed(1)} [${out.secondary.S1.nonGraph.ci.lower.toFixed(1)}, ${out.secondary.S1.nonGraph.ci.upper.toFixed(1)}]` });
  return out;
}

/** load a block directory; throws on any broken hash */
export function loadBlock(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8'));
  const { digest, ...rest } = manifest;
  if (C.hashObject(rest) !== digest) throw new Error('manifest digest does not match its contents');
  if (manifest.selftest) throw new Error('this is a plumbing self-test run; it is not a study block and is not analysed');
  if (manifest.designDigest !== C.designDigest() || manifest.decisionDigest !== C.decisionDigest()) throw new Error('the block was run under a different design');
  if (manifest.tree.mainSha256 !== C.LEARN0_TREE.mainSha256 || manifest.tree.planningSha256 !== C.LEARN0_TREE.planningSha256 || manifest.tree.headCommit !== C.HEAD_COMMIT) throw new Error('the block ran a tree other than the pinned LEARN-0 tree');
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (manifest.driverSha256 !== C.sha256(fs.readFileSync(path.join(here, 'session.mjs')))) throw new Error('the block ran a driver other than the one in this tree');
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
  s.manifestDigest = manifest.digest;
  if (flag('--out')) fs.writeFileSync(path.resolve(flag('--out')), JSON.stringify(s, null, 1));
  console.log(`block ${s.block}: valid=${s.valid}; worlds ${s.worlds.length}; excluded fraction ${s.excludedFraction.toFixed(3)}`);
  if (!s.valid) { console.log(s.verdict); console.log(s.problems.join('\n')); process.exit(1); }
  const f = (x) => Number(x).toFixed(1), ci = (b) => `${f(b.mean)} [${f(b.ci.lower)}, ${f(b.ci.upper)}]`;
  console.log(`E1 ${s.primary.E1.label}: N1 - N0 legal ${ci(s.primary.E1.legal)} (delta ${s.margin.delta}; sensitivity ${JSON.stringify(s.primary.E1.sensitivity)})`);
  console.log(`S6 components: episodes ${ci(s.secondary.S6.N1E_minus_N0)}; Q ${ci(s.secondary.S6.N1Q_minus_N0)}; S5 map ${ci(s.secondary.S5.O0_minus_N0)}; S1 non-graph ${ci(s.secondary.S1.nonGraph)}`);
  console.log(s.verdict);
}

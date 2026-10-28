// ==========================================================
// CREDIT-1 — timing diagnostic: the preregistered plan, comparison rules, localization, verdict and report (pure; TIMING_DIAGNOSTIC_PLAN.md)
// ==========================================================
//   planTimingDiagnostic()          the ordered session list: blocks R, R_ESC (conditional), P_FULL, P_SITE, V, V_T0B, TR
//   withDiagnosticConfigs(p, s)     adds the XFER-1 development configuration and the agent seeds of each world (as calibration)
//   validateDiagnosticPlan(p, cal)  counts, scope, stores, clocks, replay sources, order, equality with the calibration plan's sessions
//   diagnosticComparisons(p, ran)   every preregistered comparison and its allowed clock-configuration differences
//   recordDiff / traceDiff / exportDiff / localization / replayOutcome / diagnosticVerdict / diagnosticReport
// Nothing here runs a session, reads a clock or imports the runtime.  The report carries identity verdicts, differing field paths
// and call positions only: never an outcome value, a cell mean or an effect estimate.
// ==========================================================
import { cellOf, deliveryFor } from './delivery.mjs';
import { TIMING_DIAGNOSTIC_SCOPE, timingDiagnosticScopeProblems, CONFIRMATORY_START } from './lock.mjs';
import { CLOCK_PROCEDURE, LOOP_DELAY_MS, T0A, T0B, canonical, recordedClockConfig, viaClass } from './clock.mjs';
import { TICKS, trainSeed, testSeed } from '../xfer1/config.mjs';

export const DIAG = Object.freeze({
  sourceRun: 'calib-20261027-cb7e015',                                         // the stores every test session receives (byte copies)
  swap: Object.freeze([['N1AX', 2], ['N1AX', 6], ['N1AX', 25], ['N1LX', 14], ['N1LX', 21]]),   // the five cross-run divergent sessions
  primaryCells: Object.freeze(['N0A', 'N1A', 'N0L', 'N1L']),
  primaryWorlds: Object.freeze([2, 6, 14, 21, 25]),
  training: Object.freeze([['T_A', 3], ['T_A', 7], ['T_A', 26], ['T_L', 15], ['T_L', 22]]),    // the swap sources, trained again (export identity)
  loads: Object.freeze({ LOW: Object.freeze({ workers: 1, stressors: 0 }), HIGH: Object.freeze({ workers: 12, stressors: 12 }) }),
});
// sha256 of the store files of run calib-20261027-cb7e015 that the test sessions receive (pinned before any diagnostic session)
export const SOURCE_STORES = Object.freeze({
  'T_A-w2': '94520db4120dc3eca544c4fd9dc77aae7173eba0b89399282c79a32cb30dc835',
  'T_A-w3': '0b27988ed857db55343917542408084bc22377d6c42559c37f18c98074f8c306',
  'T_A-w6': '4796a9ef4542618abeeecb0033ef5449960772d9417a159c298700bdea208ce5',
  'T_A-w7': '9b7869659f2fd71d0fcec55cc6280c0e9df2e7bc57b849e7008fe38003b0a5a9',
  'T_A-w14': '15217563badb3bb7d90f0c7b2d5fc3aef2c556b92e1ae2dfac662476119d00ad',
  'T_A-w21': '8622e6c1ee03f257b24efe7f24072fe5533c95a3ac445ca1d300a5dcffc0bbbb',
  'T_A-w25': 'f045f44334492f371e2ce3fc0da1e439da764a76e66e2e38a138ad8ebde58e1d',
  'T_A-w26': 'f4da74a61924492a3f53eda7465c5438897de36826ac11e81e5db9a16e3bd60b',
  'T_L-w2': 'f2f9f8622d595b6b6e3be50ab5b3f3abcb280b186c39e9cf4281c1d0bc8772c2',
  'T_L-w6': '5e07cb08cf66895fc46500fe76b9da53c412bbf7656ec26231a4636411633ae0',
  'T_L-w14': '6455b887f39cfd68b44452b8d6f7635388f0d12297b9469f8bc51497d2f2b5fc',
  'T_L-w15': '0fbf8519fe2b5c593f23a73f0b049aaae43aaba1399a6a2a28b1f8ed3763c609',
  'T_L-w21': 'e6009f8483f630ac5b1716ed1f84c2d2e461228e99c586ad97f9c59baf224303',
  'T_L-w22': 'c93296293e807aff78b40e1b5e53127bcd12688d29e7905586286d2a610bdf70',
  'T_L-w25': 'c8353912434561ec13e9f0d4090c50e881a22b4498d27a0d98af1ad67bf4fd85',
});
export const DIAG_EXPECTED = Object.freeze({ R: 20, R_ESC: 20, P_FULL: 10, P_SITE: 10, V: 50, V_T0B: 25, TR: 10, base: 125, total: 145 });
export const CLOCKS = Object.freeze({
  R: Object.freeze({ mode: 'REAL_RECORD', t0: null, delayMs: LOOP_DELAY_MS }), R_ESC: Object.freeze({ mode: 'REAL_RECORD', t0: null, delayMs: LOOP_DELAY_MS }),
  P_FULL: Object.freeze({ mode: 'REPLAY_FULL', t0: null, delayMs: LOOP_DELAY_MS }), P_SITE: Object.freeze({ mode: 'REPLAY_SITE', t0: T0A, delayMs: LOOP_DELAY_MS }),
  V: Object.freeze({ mode: 'VIRTUAL', t0: T0A, delayMs: LOOP_DELAY_MS }), V_T0B: Object.freeze({ mode: 'VIRTUAL', t0: T0B, delayMs: LOOP_DELAY_MS }),
  TR: Object.freeze({ mode: 'VIRTUAL', t0: T0A, delayMs: LOOP_DELAY_MS }),
});
// the only fields of the record's clock.config that may differ between the two sides of a comparison (everything else: zero exclusions)
export const ALLOWED_CONFIG_DIFFS = Object.freeze({ R: Object.freeze([]), V: Object.freeze([]), TR: Object.freeze([]), V_T0B: Object.freeze(['t0']),
  P_FULL: Object.freeze(['mode', 'replaySha256']), P_SITE: Object.freeze(['mode', 't0', 'replaySha256']) });
export const SOURCE_PREFIX = 'SRC__';

const labelOf = (cell, w) => `${cell}-w${w}`;
const storeOf = (cell, w) => { const d = deliveryFor(cell, w); return d.source === 'none' ? null : labelOf(d.training, d.brainWorld); };
export const SWAP_LABELS = Object.freeze(DIAG.swap.map(([c, w]) => labelOf(c, w)));
export const PRIMARY_LABELS = Object.freeze(DIAG.primaryWorlds.flatMap(w => DIAG.primaryCells.map(c => labelOf(c, w))));
export const TRAINING_LABELS = Object.freeze(DIAG.training.map(([c, w]) => labelOf(c, w)));

// ---------------- plan ----------------
export function planTimingDiagnostic() {
  const out = [];
  const add = (block, cond, load, label, extra = {}) => {
    const [cell, w] = [label.slice(0, label.lastIndexOf('-w')), Number(label.slice(label.lastIndexOf('-w') + 2))];
    const c = cellOf(cell);
    out.push(Object.freeze({ seq: out.length + 1, block, cond, load, label, file: `${cond}__${label}`, world: w, role: c.role, cell, map: 'off',
      brainFrom: storeOf(cell, w), export: c.role === 'train', clock: CLOCKS[block], replayFrom: null, conditional: false, ...extra }));
  };
  for (const [load, rep] of [['LOW', 1], ['LOW', 2], ['HIGH', 1], ['HIGH', 2]]) for (const l of SWAP_LABELS) add('R', `R-${load}-${rep}`, load, l);
  for (const rep of [3, 4, 5, 6]) for (const l of SWAP_LABELS) add('R_ESC', `R-HIGH-${rep}`, 'HIGH', l, { conditional: true });
  for (const [block, tag] of [['P_FULL', 'PF'], ['P_SITE', 'PS']]) {
    for (const l of SWAP_LABELS) add(block, `${tag}-HIGH-from-R-LOW-1`, 'HIGH', l, { replayFrom: `R-LOW-1__${l}` });
    for (const l of SWAP_LABELS) add(block, `${tag}-LOW-from-R-HIGH-1`, 'LOW', l, { replayFrom: `R-HIGH-1__${l}` });
  }
  for (const load of ['LOW', 'HIGH']) for (const l of [...SWAP_LABELS, ...PRIMARY_LABELS]) add('V', `V-${load}`, load, l);
  for (const l of [...SWAP_LABELS, ...PRIMARY_LABELS]) add('V_T0B', 'VB-HIGH', 'HIGH', l);
  for (const load of ['LOW', 'HIGH']) for (const l of TRAINING_LABELS) add('TR', `TR-${load}`, load, l);
  return Object.freeze(out);
}

/** stream: XFER-1 development stream entries [{ acceptedSeed, acceptedConfigIndex, goal }] covering every diagnostic world */
export function withDiagnosticConfigs(plan, stream) {
  return Object.freeze(plan.map(e => {
    const s = stream[e.world];
    if (!s || s.acceptedConfigIndex !== e.world) throw new Error(`CREDIT-1 timing diagnostic: no development configuration for world ${e.world}`);
    const d = deliveryFor(e.cell, e.world);
    return Object.freeze({ ...e, configSeed: s.acceptedSeed, configIndex: s.acceptedConfigIndex, goal: s.goal, agentSeed: e.role === 'train' ? trainSeed(e.world) : testSeed(e.world),
      ticks: TICKS[e.role], brainWorld: d.source === 'none' ? null : d.brainWorld });
  }));
}

/** the exact driver input of one entry; paths: { tree, sessionsDir, tracesDir, brainsDir }; replay: { path, sha256 } for P entries */
export function diagnosticInput(e, paths, replay = null) {
  const clock = { ...e.clock, ...(replay ? { replayPath: replay.path, replaySha256: replay.sha256 } : {}) };
  return { role: e.role, label: e.label, world: e.world, configSeed: e.configSeed, configIndex: e.configIndex, agentSeed: e.agentSeed, ticks: e.ticks, map: e.map,
    instrument: true, cond: 'P', tree: paths.tree, cell: e.cell, ledger: 'full', procedure: CLOCK_PROCEDURE, clock, tracePath: `${paths.tracesDir}/${e.file}.json`,
    ...(e.brainFrom ? { brainPath: `${paths.brainsDir}/${SOURCE_PREFIX}${e.brainFrom}.json`, brainWorld: e.brainWorld } : {}),
    ...(e.export ? { exportPath: `${paths.brainsDir}/${e.file}.json` } : {}) };
}

/** calPlan (optional): the calibration plan with configurations; each diagnostic session must equal its calibration session */
export function validateDiagnosticPlan(plan, calPlan = null) {
  const problems = [], by = new Map(), counts = {};
  const REC = { ...JSON.parse(JSON.stringify(TIMING_DIAGNOSTIC_SCOPE)) };
  plan.forEach((e, i) => { if (e.seq !== i + 1) problems.push(`entry ${i + 1}: sequence number ${e.seq}`); if (by.has(e.file)) problems.push(`duplicate file ${e.file}`); by.set(e.file, e); });
  const cal = calPlan ? new Map(calPlan.map(e => [e.label, e])) : null;
  for (const e of plan) {
    counts[e.block] = (counts[e.block] || 0) + 1;
    if (e.file !== `${e.cond}__${e.label}`) problems.push(`${e.file}: file name`);
    if (!Number.isInteger(e.world) || e.world >= CONFIRMATORY_START) problems.push(`${e.file}: world ${e.world} is confirmatory territory`);
    const sp = timingDiagnosticScopeProblems(REC, { world: e.world, cell: e.cell, procedure: CLOCK_PROCEDURE });
    if (sp.length) problems.push(`${e.file}: ${sp[0]}`);
    let c; try { c = cellOf(e.cell); } catch { problems.push(`${e.file}: unknown cell ${e.cell}`); continue; }
    if (c.role !== e.role || e.map !== 'off' || e.label !== labelOf(e.cell, e.world)) problems.push(`${e.file}: role, map or label`);
    const want = { R: SWAP_LABELS, R_ESC: SWAP_LABELS, P_FULL: SWAP_LABELS, P_SITE: SWAP_LABELS, V: [...SWAP_LABELS, ...PRIMARY_LABELS], V_T0B: [...SWAP_LABELS, ...PRIMARY_LABELS], TR: TRAINING_LABELS }[e.block];
    if (!want || !want.includes(e.label)) problems.push(`${e.file}: ${e.label} is not a ${e.block} session`);
    if (e.brainFrom !== storeOf(e.cell, e.world)) problems.push(`${e.file}: store ${e.brainFrom}, expected ${storeOf(e.cell, e.world)}`);
    if (e.brainFrom && !SOURCE_STORES[e.brainFrom]) problems.push(`${e.file}: store ${e.brainFrom} is not a pinned source store`);
    if (e.export !== (e.block === 'TR')) problems.push(`${e.file}: only the TR training sessions export`);
    if (canonical(e.clock) !== canonical(CLOCKS[e.block])) problems.push(`${e.file}: clock ${canonical(e.clock)} is not the ${e.block} clock`);
    if (e.conditional !== (e.block === 'R_ESC')) problems.push(`${e.file}: only the escalation block is conditional`);
    if (e.block === 'P_FULL' || e.block === 'P_SITE') {
      const src = by.get(e.replayFrom), wantSrc = e.load === 'HIGH' ? `R-LOW-1__${e.label}` : `R-HIGH-1__${e.label}`;
      if (e.replayFrom !== wantSrc || !src || src.seq >= e.seq || src.block !== 'R') problems.push(`${e.file}: replay source ${e.replayFrom}, expected ${wantSrc} run earlier under the other load`);
    } else if (e.replayFrom !== null) problems.push(`${e.file}: a replay source outside the P blocks`);
    if (!DIAG.loads[e.load] || e.cond.split('-')[1] !== e.load) problems.push(`${e.file}: load ${e.load} is not the load of condition ${e.cond}`);
    if (cal) {
      const k = cal.get(e.label);
      if (!k || k.driver !== 'credit1' || k.procedure !== null || k.cell !== e.cell || k.world !== e.world || k.role !== e.role || k.map !== e.map || (k.brainFrom || null) !== e.brainFrom
        || (e.configSeed !== undefined && (k.configSeed !== e.configSeed || k.agentSeed !== e.agentSeed || k.ticks !== e.ticks || k.configIndex !== e.configIndex))) problems.push(`${e.file}: not the calibration plan's session ${e.label}`);
    }
  }
  for (const [k, n] of Object.entries(DIAG_EXPECTED)) if (!['base', 'total'].includes(k) && (counts[k] || 0) !== n) problems.push(`block ${k}: ${counts[k] || 0} sessions, expected ${n}`);
  if (plan.length !== DIAG_EXPECTED.total || plan.filter(e => !e.conditional).length !== DIAG_EXPECTED.base) problems.push(`${plan.length} sessions, expected ${DIAG_EXPECTED.total} (${DIAG_EXPECTED.base} + ${DIAG_EXPECTED.R_ESC} conditional)`);
  return problems;
}

/** the store files of a diagnostic run: the source copies and the TR exports */
export const diagnosticBrainFiles = (plan) => new Set([...new Set(plan.filter(e => e.brainFrom).map(e => `${SOURCE_PREFIX}${e.brainFrom}`)), ...plan.filter(e => e.export).map(e => e.file)]);

/** the escalation rule: R_ESC runs only if no R session varies across its four real-clock runs */
export const escalationNeeded = (rVariation) => rVariation.length === DIAG.swap.length && rVariation.every(s => s.varies === false);

/** every preregistered comparison over the files that ran: { kind, a, b, allowed, exports } */
export function diagnosticComparisons(plan, ran = null) {
  const has = (f) => ran === null || ran.has(f);
  const out = [];
  for (const l of SWAP_LABELS) {
    const runs = plan.filter(e => (e.block === 'R' || e.block === 'R_ESC') && e.label === l && has(e.file)).map(e => e.file);
    for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) out.push({ kind: 'R', label: l, a: runs[i], b: runs[j], allowed: ALLOWED_CONFIG_DIFFS.R, exports: false });
  }
  for (const e of plan.filter(x => (x.block === 'P_FULL' || x.block === 'P_SITE') && has(x.file))) out.push({ kind: e.block, label: e.label, a: e.replayFrom, b: e.file, allowed: ALLOWED_CONFIG_DIFFS[e.block], exports: false });
  for (const l of [...SWAP_LABELS, ...PRIMARY_LABELS]) {
    out.push({ kind: 'V', label: l, a: `V-LOW__${l}`, b: `V-HIGH__${l}`, allowed: ALLOWED_CONFIG_DIFFS.V, exports: false });
    out.push({ kind: 'V_T0B', label: l, a: `V-HIGH__${l}`, b: `VB-HIGH__${l}`, allowed: ALLOWED_CONFIG_DIFFS.V_T0B, exports: false });
  }
  for (const l of TRAINING_LABELS) out.push({ kind: 'TR', label: l, a: `TR-LOW__${l}`, b: `TR-HIGH__${l}`, allowed: ALLOWED_CONFIG_DIFFS.TR, exports: true });
  return out;
}

// ---------------- comparison rules ----------------
function leafDiffs(a, b, prefix = '', out = []) {
  if (out.length >= 20) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) leafDiffs(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
  } else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(prefix || '(root)');
  return out;
}
/**
 * two session records (raw JSON text).  With no allowed fields the raw bytes must be equal; otherwise exactly the listed keys of
 * clock.config are removed from both and the remaining JSON must be equal (records are JSON.stringify output, so this is byte
 * equality everywhere else).  paths: the differing field paths (never values), at most 20.
 */
export function recordDiff(rawA, rawB, allowed = []) {
  if (typeof rawA !== 'string' || typeof rawB !== 'string') return { identical: false, paths: ['missing record'] };
  let A, B;
  try { A = JSON.parse(rawA); B = JSON.parse(rawB); } catch { return { identical: false, paths: ['unparseable record'] }; }
  if (!allowed.length) { const identical = rawA === rawB; return { identical, paths: identical ? [] : leafDiffs(A, B) }; }
  for (const R of [A, B]) for (const k of allowed) if (R && R.clock && R.clock.config) delete R.clock.config[k];
  const identical = JSON.stringify(A) === JSON.stringify(B);
  return { identical, paths: identical ? [] : leafDiffs(A, B) };
}
/** a training export pair: raw bytes, no exclusion (episode ids and timestamps included) */
export const exportDiff = (rawA, rawB) => ({ identical: typeof rawA === 'string' && typeof rawB === 'string' && rawA === rawB });

const pos = (k, phase) => 2 * k + phase;                     // observation order: start of call k (0), its executed move (1)
/**
 * two traces (raw JSON text): the decisions (arrivals [call, from, to]), the schema events [k, phase, digest, n] and the schema
 * reads [k, phase, via] must be equal; recorded clock values are never compared.  Positions: an event at [k, phase] is 2k + phase;
 * the decision of call c is at 2c + 1.
 */
export function traceDiff(rawA, rawB) {
  let A, B;
  try { A = JSON.parse(rawA); B = JSON.parse(rawB); } catch { return { identical: false, firstCall: null, firstSchemaPos: null, firstReadPos: null, unreadable: true }; }
  const first = (x = [], y = []) => { const n = Math.max(x.length, y.length); for (let i = 0; i < n; i++) if (JSON.stringify(x[i]) !== JSON.stringify(y[i])) return i; return null; };
  const ia = first(A.arrivals, B.arrivals), ie = first(A.schemaEvents, B.schemaEvents), ir = first(A.schemaReads, B.schemaReads);
  const at = (arr, i, f) => Math.min(...[A[arr][i], B[arr][i]].filter(Boolean).map(f));
  return { identical: ia === null && ie === null && ir === null,
    firstCall: ia === null ? null : at('arrivals', ia, x => x[0]),
    firstSchemaPos: ie === null ? null : at('schemaEvents', ie, x => pos(x[0], x[1])),
    firstReadPos: ir === null ? null : at('schemaReads', ir, x => pos(x[0], x[1])) };
}
/**
 * localization of a differing real-clock pair: the first schema difference comes at or before the first differing decision (or no
 * decision differs), no schema-caller read differs before it, and at that position one run has a throttled rebuildSchemas read
 * (caller L main.js or K consolidation; the forced caller F is clock-free).
 */
export function localization(rawA, rawB) {
  const d = traceDiff(rawA, rawB);
  let A = null, B = null;
  try { A = JSON.parse(rawA); B = JSON.parse(rawB); } catch { return { ok: false, ...d }; }
  const p = d.firstSchemaPos;
  const throttledAt = (t) => (t.schemaReads || []).some(([k, ph, via]) => pos(k, ph) === p && (viaClass(via) === 'L' || viaClass(via) === 'K'));
  const ok = p !== null && (d.firstCall === null || p <= pos(d.firstCall, 1)) && (d.firstReadPos === null || d.firstReadPos >= p) && (throttledAt(A) || throttledAt(B));
  return { ok, ...d };
}
/** a replay against its source: REPRODUCED, DIVERGED, or REPLAY_TOOLING (a clock violation before any decision differs) */
export function replayOutcome({ srcRecord, srcTrace, repRecord, repTrace, allowed }) {
  const rd = recordDiff(srcRecord, repRecord, allowed), td = traceDiff(srcTrace, repTrace);
  if (rd.identical && td.identical) return { outcome: 'REPRODUCED', paths: [], ...td };
  let R = null, S = null, T = null;
  try { R = JSON.parse(repRecord); S = JSON.parse(srcTrace); T = JSON.parse(repTrace); } catch { /* DIVERGED below */ }
  const viol = R && R.clock && R.clock.observed ? R.clock.observed.violations : [];
  if (viol.length && S && T && T.arrivals.length <= S.arrivals.length && T.arrivals.every((x, i) => JSON.stringify(x) === JSON.stringify(S.arrivals[i]))) return { outcome: 'REPLAY_TOOLING', paths: rd.paths, ...td };
  return { outcome: 'DIVERGED', paths: rd.paths, ...td };
}

// ---------------- validity of one diagnostic session ----------------
/** rec: parsed record; entry: its plan entry; stderr: the session's stderr text */
export function diagnosticSessionProblems(rec, entry, { stderr = '' } = {}) {
  const p = [], who = entry ? entry.file : '?';
  if (!rec) return [`${who}: no record`];
  if (String(stderr).trim()) p.push(`${who}: stderr is not empty`);
  if (rec.procedure !== CLOCK_PROCEDURE || !rec.clock || !rec.clock.config || !rec.clock.observed) return [...p, `${who}: not a timing-diagnostic record`];
  const want = recordedClockConfig(entry.clock);
  for (const k of ['mode', 't0', 'delayMs']) if (rec.clock.config[k] !== want[k]) p.push(`${who}: clock.config.${k} ${rec.clock.config[k]}, expected ${want[k]}`);
  const o = rec.clock.observed, crashed = !rec.outcome || rec.outcome.crashed === true || rec.outcome.completed !== true;
  const replay = entry.block === 'P_FULL' || entry.block === 'P_SITE';
  if (replay && crashed) { if (!o.violations.length) p.push(`${who}: a replay session crashed without a clock violation`); return p; }   // a replay violation is a result, not an invalid session
  if (crashed) p.push(`${who}: incomplete or crashed`);
  if (!rec.conditionIntegrity || rec.conditionIntegrity.ok !== true) p.push(`${who}: condition integrity`);
  if (!rec.mapAudit || rec.mapAudit.ok !== true) p.push(`${who}: map audit`);
  if (o.violations.length && !replay) p.push(`${who}: clock violation ${JSON.stringify(o.violations[0])}`);
  if (!crashed && o.loopFires !== rec.outcome.loopsExecuted) p.push(`${who}: ${o.loopFires} loop fires, ${rec.outcome.loopsExecuted} loops executed`);
  if (canonical(o.delays) !== canonical(o.loopFires ? { [LOOP_DELAY_MS]: o.loopFires } : {})) p.push(`${who}: loop delays ${canonical(o.delays)}`);
  return p;
}

// ---------------- verdict and report ----------------
export const CATEGORIES = Object.freeze(['OTHER_NONDETERMINISM', 'AGAINST_SPECIFIC_HYPOTHESIS', 'INCONCLUSIVE', 'SUPPORTS']);
/**
 * the preregistered interpretation (TIMING_DIAGNOSTIC_PLAN.md section 6).  results:
 *   r:  [{ label, varies, sourcesDiffer, pairs: [{ identical, loc: { ok } }] }]   (every real-clock run of the five sessions)
 *   escalated: whether the R_ESC block ran;  p: [{ label, kind: 'P_FULL'|'P_SITE', outcome }];  v, vb, tr: [{ label, identical }]
 * category: the first of OTHER_NONDETERMINISM, AGAINST_SPECIFIC_HYPOTHESIS, INCONCLUSIVE that has a reason, else SUPPORTS.
 */
export function diagnosticVerdict({ r, escalated, p, v, vb, tr }) {
  const reasons = { OTHER_NONDETERMINISM: [], AGAINST_SPECIFIC_HYPOTHESIS: [], INCONCLUSIVE: [] };
  for (const x of p.filter(x => x.kind === 'P_FULL' && x.outcome === 'DIVERGED')) reasons.OTHER_NONDETERMINISM.push(`${x.label}: a full replay (same clock values, other load) did not reproduce its source`);
  for (const x of v.filter(x => !x.identical)) reasons.OTHER_NONDETERMINISM.push(`${x.label}: the virtual clock differs between loads`);
  for (const x of tr.filter(x => !x.identical)) reasons.OTHER_NONDETERMINISM.push(`${x.label}: training under the virtual clock differs between loads (record, trace or export)`);
  for (const x of p.filter(x => x.kind === 'P_SITE' && x.outcome === 'DIVERGED')) reasons.AGAINST_SPECIFIC_HYPOTHESIS.push(`${x.label}: the schema-site replay did not reproduce its source`);
  for (const s of r) for (const q of s.pairs.filter(q => !q.identical && !(q.loc && q.loc.ok))) reasons.AGAINST_SPECIFIC_HYPOTHESIS.push(`${s.label}: a real-clock divergence not preceded by a throttled schema rebuild`);
  for (const x of vb.filter(x => !x.identical)) reasons.AGAINST_SPECIFIC_HYPOTHESIS.push(`${x.label}: the absolute clock value (t0) changes the record or the trace`);
  const varies = r.some(s => s.varies);
  if (!varies) {
    if (!escalated) throw new Error('timing diagnostic: no real-clock variation, but the preregistered escalation did not run');
    reasons.INCONCLUSIVE.push('no real-clock variation in any of the five sessions, after the escalation: the timing hypothesis is untested');
  } else if (!r.some(s => s.varies && s.sourcesDiffer)) reasons.INCONCLUSIVE.push('in every varying session the two replay sources are identical: the schema-site manipulation is untested');
  for (const x of p.filter(x => x.outcome === 'REPLAY_TOOLING')) reasons.INCONCLUSIVE.push(`${x.label} ${x.kind}: a replay clock violation before any decision differs (recorder defect or read-order nondeterminism)`);
  const category = CATEGORIES.find(c => reasons[c] && reasons[c].length) || 'SUPPORTS';
  return { category, reasons: [...reasons.OTHER_NONDETERMINISM, ...reasons.AGAINST_SPECIFIC_HYPOTHESIS, ...reasons.INCONCLUSIVE] };
}
/** identity-only report: comparison verdicts, differing field paths and call positions; no outcome value of any session */
export function diagnosticReport({ comparisons, verdict }) {
  return { schema: 'credit1/1.timing-diagnostic-report',
    comparisons: comparisons.map(c => ({ kind: c.kind, label: c.label, a: c.a, b: c.b, identical: c.identical === true, differingPaths: (c.paths || []).slice(0, 20),
      firstDivergentCall: Number.isInteger(c.firstCall) ? c.firstCall : null, firstSchemaPosition: Number.isInteger(c.firstSchemaPos) ? c.firstSchemaPos : null,
      localized: c.loc ? c.loc.ok === true : null, replayOutcome: c.outcome || null })),
    verdict: { category: verdict.category, reasons: verdict.reasons.slice() } };
}
